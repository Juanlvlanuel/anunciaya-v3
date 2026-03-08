/**
 * useAudioChat.ts
 * ==================
 * Hook especializado para grabar mensajes de voz en ChatYA.
 *
 * UBICACIÓN: apps/web/src/hooks/useAudioChat.ts
 *
 * QUÉ HACE:
 * 1. Solicita permiso del micrófono (getUserMedia)
 * 2. Graba audio con MediaRecorder (WebM/Opus preferido)
 * 3. Captura waveform en tiempo real con AnalyserNode (Web Audio API)
 * 4. Timer de duración con auto-stop a 5 minutos
 * 5. Al detener: empaqueta blob + duración + waveform resumido (~50 barras)
 *
 * WAVEFORM EN TIEMPO REAL:
 * - AnalyserNode muestrea la amplitud ~60 veces/segundo
 * - `waveformEnVivo` es un array de valores 0-1 que se actualiza cada frame
 * - El componente de UI lo usa para animar las barras durante la grabación
 * - Al finalizar, se resumen los samples en ~50 valores para almacenar en el mensaje
 *
 * NO HACE:
 * - No sube a R2 (eso lo maneja InputMensaje al enviar)
 * - No gestiona el estado del chat (eso es del store)
 *
 * POR QUÉ ES HOOK SEPARADO:
 * Separa la responsabilidad de "grabar audio" de "enviar mensaje".
 * El InputMensaje llama al hook, obtiene el audio listo, pide presigned URL,
 * sube a R2, y envía el mensaje con la URL pública.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Duración máxima de grabación en segundos (5 minutos) */
const MAX_DURACION_SEGUNDOS = 300;

/** Cantidad de barras en el waveform final (almacenado en el mensaje) */
const BARRAS_WAVEFORM = 50;

/** Intervalo en ms para actualizar el timer de duración */
const TIMER_INTERVAL_MS = 100;

/** Intervalo en ms para muestrear waveform en vivo */
const WAVEFORM_SAMPLE_MS = 80;

// =============================================================================
// TIPOS
// =============================================================================

/** Resultado final de una grabación lista para enviar */
export interface AudioListo {
  /** Blob del audio grabado */
  blob: Blob;
  /** Duración en segundos (ej: 12.5) */
  duracion: number;
  /** Tamaño en bytes */
  tamano: number;
  /** MIME type detectado (ej: "audio/webm") */
  contentType: string;
  /** Array de ~50 valores 0-1 para la onda visual en la burbuja */
  waveform: number[];
}

/** Estados posibles de la grabación */
export type EstadoGrabacion = 'inactivo' | 'grabando' | 'procesando';

interface UseAudioChatResult {
  /** Estado actual de la grabación */
  estado: EstadoGrabacion;
  /** true mientras se está grabando */
  grabando: boolean;
  /** Duración actual en segundos (se actualiza en tiempo real) */
  duracion: number;
  /** Waveform en tiempo real — array de valores 0-1 para animar barras */
  waveformEnVivo: number[];
  /** Audio procesado listo para enviar (null si no hay grabación terminada) */
  audioListo: AudioListo | null;
  /** Mensaje de error si algo falló */
  error: string | null;
  /** Iniciar grabación (pide permiso de micrófono) */
  iniciarGrabacion: () => Promise<void>;
  /** Detener grabación y procesar audio */
  detenerGrabacion: () => void;
  /** Cancelar grabación sin guardar */
  cancelarGrabacion: () => void;
  /** Limpiar audio listo después de enviar */
  limpiar: () => void;
}

// =============================================================================
// HELPERS (fuera del hook, no se recrean)
// =============================================================================

/**
 * Detecta el mejor MIME type soportado por el navegador para grabación.
 * Prioriza WebM/Opus (más ligero), luego OGG, luego MP4 (Safari).
 */
function detectarMimeType(): string {
  const candidatos = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];

  for (const tipo of candidatos) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(tipo)) {
      return tipo;
    }
  }

  // Fallback: dejar que el navegador elija
  return '';
}

/**
 * Extrae el MIME base (sin codecs) para enviar al backend.
 * "audio/webm;codecs=opus" → "audio/webm"
 */
function mimeBase(mimeCompleto: string): string {
  return mimeCompleto.split(';')[0] || 'audio/webm';
}

/**
 * Resumen de waveform: reduce un array de N samples a exactamente `barras` valores.
 * Cada barra es el promedio de su segmento, normalizado 0-1.
 */
function resumirWaveform(samples: number[], barras: number): number[] {
  if (samples.length === 0) return new Array(barras).fill(0);
  if (samples.length <= barras) {
    // Menos samples que barras: pad con ceros
    const resultado = [...samples];
    while (resultado.length < barras) resultado.push(0);
    return resultado;
  }

  const resultado: number[] = [];
  const segmento = samples.length / barras;

  for (let i = 0; i < barras; i++) {
    const inicio = Math.floor(i * segmento);
    const fin = Math.floor((i + 1) * segmento);
    let suma = 0;
    let count = 0;

    for (let j = inicio; j < fin && j < samples.length; j++) {
      suma += samples[j];
      count++;
    }

    resultado.push(count > 0 ? suma / count : 0);
  }

  // Normalizar al rango 0-1 basado en el máximo real
  const max = Math.max(...resultado, 0.01);
  return resultado.map((v) => Math.min(v / max, 1));
}

// =============================================================================
// HOOK
// =============================================================================

export function useAudioChat(): UseAudioChatResult {
  const [estado, setEstado] = useState<EstadoGrabacion>('inactivo');
  const [duracion, setDuracion] = useState(0);
  const [waveformEnVivo, setWaveformEnVivo] = useState<number[]>([]);
  const [audioListo, setAudioListo] = useState<AudioListo | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs para recursos que deben sobrevivir re-renders
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('');

  // Timer refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicioRef = useRef<number>(0);

  // Waveform refs
  const waveformIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const samplesRef = useRef<number[]>([]);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // ---------------------------------------------------------------------------
  // Cleanup: liberar todos los recursos (micrófono, AudioContext, timers)
  // ---------------------------------------------------------------------------
  const liberarRecursos = useCallback(() => {
    // Detener timer de duración
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Detener muestreo de waveform
    if (waveformIntervalRef.current) {
      clearInterval(waveformIntervalRef.current);
      waveformIntervalRef.current = null;
    }

    // Cerrar AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {/* ignore */});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataArrayRef.current = null;

    // Liberar micrófono
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Limpiar MediaRecorder
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => liberarRecursos();
  }, [liberarRecursos]);

  // ---------------------------------------------------------------------------
  // Iniciar grabación
  // ---------------------------------------------------------------------------
  const iniciarGrabacion = useCallback(async () => {
    try {
      setError(null);
      setAudioListo(null);
      setDuracion(0);
      setWaveformEnVivo([]);
      samplesRef.current = [];

      // 1. Verificar soporte del navegador
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu navegador no soporta grabación de audio.');
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('Tu navegador no soporta MediaRecorder.');
      }

      // 2. Pedir permiso del micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });
      streamRef.current = stream;

      // 3. Configurar Web Audio API para waveform
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      dataArrayRef.current = dataArray;

      // 4. Configurar MediaRecorder
      const mimeType = detectarMimeType();
      mimeTypeRef.current = mimeType;

      const opciones: MediaRecorderOptions = {
        audioBitsPerSecond: 64000, // 64kbps — buen balance calidad/tamaño
      };
      if (mimeType) {
        opciones.mimeType = mimeType;
      }

      const recorder = new MediaRecorder(stream, opciones);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Acumular chunks de audio
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Cuando se detiene el recorder, procesar el audio final
      recorder.onstop = () => {
        setEstado('procesando');

        const chunks = chunksRef.current;
        if (chunks.length === 0) {
          setEstado('inactivo');
          liberarRecursos();
          return;
        }

        const contentType = mimeBase(mimeTypeRef.current || recorder.mimeType || 'audio/webm');
        const blob = new Blob(chunks, { type: contentType });
        const duracionFinal = (Date.now() - inicioRef.current) / 1000;

        // Resumir waveform a ~50 barras
        const waveform = resumirWaveform(samplesRef.current, BARRAS_WAVEFORM);

        setAudioListo({
          blob,
          duracion: Math.round(duracionFinal * 10) / 10, // 1 decimal
          tamano: blob.size,
          contentType,
          waveform,
        });

        setEstado('inactivo');
        liberarRecursos();
      };

      recorder.onerror = () => {
        setError('Error durante la grabación.');
        setEstado('inactivo');
        liberarRecursos();
      };

      // 5. Iniciar grabación
      recorder.start(250); // Chunks cada 250ms
      inicioRef.current = Date.now();
      setEstado('grabando');

      // 6. Timer de duración (se actualiza cada 100ms para precisión visual)
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - inicioRef.current) / 1000;
        setDuracion(elapsed);

        // Auto-stop al máximo
        if (elapsed >= MAX_DURACION_SEGUNDOS) {
          mediaRecorderRef.current?.stop();
        }
      }, TIMER_INTERVAL_MS);

      // 7. Muestreo de waveform en vivo (~12.5 veces/segundo)
      waveformIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

        // Calcular amplitud promedio del frame actual (0-1)
        let suma = 0;
        const arr = dataArrayRef.current;
        for (let i = 0; i < arr.length; i++) {
          // El valor 128 es silencio. La distancia a 128 es la amplitud.
          suma += Math.abs(arr[i] - 128);
        }
        const amplitud = suma / (arr.length * 128); // Normalizado 0-1

        // Guardar sample para el resumen final
        samplesRef.current.push(amplitud);

        // Actualizar waveform en vivo (últimas ~40 barras para la UI)
        setWaveformEnVivo((prev) => {
          const nuevo = [...prev, amplitud];
          // Mantener solo las últimas 40 barras visibles
          return nuevo.length > 40 ? nuevo.slice(-40) : nuevo;
        });
      }, WAVEFORM_SAMPLE_MS);

    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al iniciar grabación';

      // Mensaje amigable si el usuario denegó el permiso
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Permiso de micrófono denegado. Actívalo en la configuración de tu navegador.');
      } else {
        setError(mensaje);
      }

      setEstado('inactivo');
      liberarRecursos();
    }
  }, [liberarRecursos]);

  // ---------------------------------------------------------------------------
  // Detener grabación (guarda el audio)
  // ---------------------------------------------------------------------------
  const detenerGrabacion = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // Dispara recorder.onstop
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Cancelar grabación (descarta todo)
  // ---------------------------------------------------------------------------
  const cancelarGrabacion = useCallback(() => {
    // Detener sin guardar: limpiar chunks primero
    chunksRef.current = [];
    samplesRef.current = [];

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      // Sobreescribir onstop para que no procese
      mediaRecorderRef.current.onstop = () => {
        setEstado('inactivo');
        liberarRecursos();
      };
      mediaRecorderRef.current.stop();
    } else {
      setEstado('inactivo');
      liberarRecursos();
    }

    setDuracion(0);
    setWaveformEnVivo([]);
    setError(null);
  }, [liberarRecursos]);

  // ---------------------------------------------------------------------------
  // Limpiar audio listo (después de enviar exitosamente)
  // ---------------------------------------------------------------------------
  const limpiar = useCallback(() => {
    setAudioListo(null);
    setDuracion(0);
    setWaveformEnVivo([]);
    setError(null);
    samplesRef.current = [];
  }, []);

  return {
    estado,
    grabando: estado === 'grabando',
    duracion,
    waveformEnVivo,
    audioListo,
    error,
    iniciarGrabacion,
    detenerGrabacion,
    cancelarGrabacion,
    limpiar,
  };
}

export default useAudioChat;