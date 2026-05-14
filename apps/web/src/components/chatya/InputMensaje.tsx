/**
 * InputMensaje.tsx
 * =================
 * Campo de entrada para escribir y enviar mensajes.
 * Envía con Enter o botón. Emite eventos de escribiendo/dejar-escribir.
 *
 * Sprint 4: solo texto.
 * Sprints futuros: botón adjuntar (imagen, audio, documento), emojis.
 *
 * UBICACIÓN: apps/web/src/components/chatya/InputMensaje.tsx
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, Pencil, Smile, Paperclip, Camera, Image as ImageIcon, FileText, Mic, Trash2, Reply } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
import { ModalUbicacionChat } from './ModalUbicacionChat';
import { SelectorEmojis } from './SelectorEmojis';
import { TextoConEmojis } from './TextoConEmojis';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { PreviewContextoInput } from './PreviewContextoInput';
import { emitirEvento } from '../../services/socketService';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useImagenChat } from '../../hooks/useImagenChat';
import { useDocumentoChat, ACCEPT_DOCUMENTOS, formatearTamano, esDocumentoPermitido } from '../../hooks/useDocumentoChat';
import { useAudioChat } from '../../hooks/useAudioChat';
import * as chatyaService from '../../services/chatyaService';
import { obtenerMiIdChatYA, obtenerSucursalChatYA } from '../../hooks/useChatYASession';
import type { Mensaje } from '../../types/chatya';

// =============================================================================
// ESTILOS GLOBALES (inyección única en document.head)
// =============================================================================

const AUDIO_STYLES_ID = 'chatya-audio-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(AUDIO_STYLES_ID)) {
  const style = document.createElement('style');
  style.id = AUDIO_STYLES_ID;
  style.textContent = `
    @keyframes ab-fondo { 0%, 75% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes ab-aparece { 0% { opacity: 0; transform: scale(0.4) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes ab-tapa-abre { 0% { transform: rotate(0deg); } 100% { transform: rotate(-35deg); } }
    @keyframes ab-tapa-cierra { 0% { transform: rotate(-35deg); } 70% { transform: rotate(3deg); } 100% { transform: rotate(0deg); } }
    @keyframes ab-mic-cae { 0% { transform: translateX(-50%) translateY(0) rotate(-10deg); opacity: 1; } 60% { transform: translateX(-50%) translateY(30px) rotate(5deg); opacity: 1; } 80% { transform: translateX(-50%) translateY(26px) rotate(-2deg); opacity: 0.8; } 100% { transform: translateX(-50%) translateY(30px) rotate(0deg); opacity: 0; } }
    @keyframes ab-sacude { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 50% { transform: translateX(3px); } 75% { transform: translateX(-2px); } }
    @keyframes ab-sale { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.6) translateY(15px); } }
  `;
  document.head.appendChild(style);
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** Delay para dejar de emitir "escribiendo" después de dejar de teclear */
const ESCRIBIENDO_DELAY_MS = 2000;

/** Umbral en px para activar zona de cancelación al deslizar hacia arriba (hold-to-record móvil) */
const CANCEL_UMBRAL_PX = 80;

// =============================================================================
// TIPOS
// =============================================================================

interface InputMensajeProps {
  /** Mensaje que se está editando (null si no hay edición activa) */
  mensajeEditando?: Mensaje | null;
  /** Callback para cancelar la edición */
  onCancelarEdicion?: () => void;
  /** Mensaje al que se está respondiendo (null si no hay respuesta activa) */
  mensajeRespondiendo?: Mensaje | null;
  /** Callback para cancelar la respuesta */
  onCancelarRespuesta?: () => void;
  /** Si el contacto está bloqueado, deshabilitar el input */
  bloqueado?: boolean;
  /** Nombre del contacto (para mostrar en barra de respuesta/edición) */
  nombreContacto?: string;
  /** ID del usuario actual (para determinar "Tú" vs nombre del contacto) */
  miId?: string;
  /** ID del otro participante (para emitir eventos de escribiendo vía Socket.io) */
  destinatarioId?: string;
  /** Archivos soltados desde drag & drop en VentanaChat (zona amplia) */
  archivosDrop?: File[] | null;
  /** Callback para limpiar archivosDrop después de procesarlos */
  onArchivosDropProcesados?: () => void;
}

// =============================================================================
// ANIMACIÓN: Basura de audio cancelado
// =============================================================================

function AnimacionBasuraAudio({ onCompleta }: { onCompleta: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onCompleta, 1400);
    return () => clearTimeout(timer);
  }, [onCompleta]);

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center pointer-events-none">
      {/* Fondo sutil */}
      <div
        className="absolute inset-0 bg-black/10"
        style={{ animation: 'ab-fondo 1.4s ease-out forwards' }}
      />

      {/* Capa salida */}
      <div style={{ animation: 'ab-sale 0.35s ease-in forwards 1.05s' }}>
        {/* Capa aparición */}
        <div style={{ animation: 'ab-aparece 0.3s ease-out forwards' }}>
          {/* Capa sacudida */}
          <div style={{ animation: 'ab-sacude 0.15s ease-in-out forwards 0.78s' }}>
            <div className="relative" style={{ width: '52px', height: '64px' }}>

              {/* Mic cayendo */}
              <div
                className="absolute left-1/2 z-10"
                style={{
                  transform: 'translateX(-50%)',
                  top: '-20px',
                  animation: 'ab-mic-cae 0.45s cubic-bezier(0.55, 0, 1, 0.45) forwards 0.25s',
                  opacity: 0,
                }}
              >
                <Mic className="w-5 h-5 text-white" />
              </div>

              {/* Tapa (manija + línea) */}
              <div
                className="absolute top-0 left-0 w-full flex flex-col items-center z-20"
                style={{
                  transformOrigin: '4px bottom',
                  animation: 'ab-tapa-abre 0.25s ease-out forwards 0.05s, ab-tapa-cierra 0.15s ease-in forwards 0.72s',
                }}
              >
                <div className="w-4 h-1.5 bg-red-400 rounded-t" />
                <div className="w-12 h-2 bg-red-500 rounded-sm" />
              </div>

              {/* Cuerpo del bote */}
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-b-2xl overflow-hidden"
                style={{ top: '14px', width: '44px', height: '50px', background: 'linear-gradient(to bottom, #ef4444, #dc2626)' }}
              >
                <div className="flex gap-2 justify-center pt-4">
                  <div className="w-0.5 h-8 bg-white/20 rounded-full" />
                  <div className="w-0.5 h-8 bg-white/20 rounded-full" />
                  <div className="w-0.5 h-8 bg-white/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function InputMensaje({
  mensajeEditando = null,
  onCancelarEdicion,
  mensajeRespondiendo = null,
  onCancelarRespuesta,
  bloqueado = false,
  nombreContacto = '',
  miId = '',
  destinatarioId = '',
  archivosDrop = null,
  onArchivosDropProcesados,
}: InputMensajeProps) {
  const enviarMensaje = useChatYAStore((s) => s.enviarMensaje);
  const enviandoMensaje = useChatYAStore((s) => s.enviandoMensaje);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const chatTemporal = useChatYAStore((s) => s.chatTemporal);
  const crearConversacion = useChatYAStore((s) => s.crearConversacion);
  const transicionarAConversacionReal = useChatYAStore((s) => s.transicionarAConversacionReal);
  const borradores = useChatYAStore((s) => s.borradores);
  const guardarBorrador = useChatYAStore((s) => s.guardarBorrador);
  const limpiarBorrador = useChatYAStore((s) => s.limpiarBorrador);
  const contextoPendiente = useChatYAStore((s) => s.contextoPendiente);
  const setContextoPendiente = useChatYAStore((s) => s.setContextoPendiente);

  const [texto, setTexto] = useState('');
  const [errorUpload, setErrorUpload] = useState<string | null>(null);
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [pickerSaliendo, setPickerSaliendo] = useState(false);
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const smileBtnRef = useRef<HTMLButtonElement>(null);
  const escribiendoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const estaEscribiendoRef = useRef(false);

  // Hook de procesamiento de imagen (pipeline zero-flicker) — soporta múltiples
  const {
    imagenesListas,
    procesando: procesandoImagen,
    error: errorImagen,
    procesarImagen,
    procesarImagenes,
    removerImagen,
    setCaption,
    limpiar: limpiarImagen,
    puedeAgregarMas,
    maxImagenes,
  } = useImagenChat();

  // Hook de procesamiento de documento
  const {
    documentoListo,
    error: errorDocumento,
    procesarDocumento,
    limpiar: limpiarDocumento,
  } = useDocumentoChat();

  // Hook de grabación de audio
  const {
    grabando: grabandoAudio,
    duracion: duracionAudio,
    waveformEnVivo,
    audioListo,
    error: errorAudio,
    iniciarGrabacion,
    detenerGrabacion,
    cancelarGrabacion,
    limpiar: limpiarAudio,
  } = useAudioChat();

  // Hold-to-record: estado y refs (solo móvil)
  const [holdGrabando, setHoldGrabando] = useState(false);
  const [cancelZona, setCancelZona] = useState(false);
  const [animacionBasura, setAnimacionBasura] = useState(false);
  const holdStartYRef = useRef(0);
  const holdStartXRef = useRef(0);
  const holdActiveRef = useRef(false);
  const cancelZonaRef = useRef(false);
  const grabandoRef = useRef(false);
  const holdReleasedBeforeStartRef = useRef(false);
  const micBtnRef = useRef<HTMLButtonElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esHoldRef = useRef(false);
  const puedeEnviarRef = useRef(false);

  // Refs para inputs de archivo ocultos
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);
  const inputDocumentoRef = useRef<HTMLInputElement>(null);

  // Menú del clip (adjuntar) y modal de ubicación
  const [menuClipAbierto, setMenuClipAbierto] = useState(false);
  const [menuClipPos, setMenuClipPos] = useState<{ x: number; y: number } | null>(null);
  const [modalUbicacionAbierto, setModalUbicacionAbierto] = useState(false);
  const clipBtnRef = useRef<HTMLButtonElement>(null);
  const menuClipRef = useRef<HTMLDivElement>(null);

  // Cerrar menú clip y limpiar errores al cambiar de conversación o cerrar chat
  useEffect(() => {
    setMenuClipAbierto(false);
    setMenuClipPos(null);
    setErrorUpload(null);
    limpiarImagen();
    limpiarDocumento();
    limpiarAudio();
  }, [conversacionActivaId]);

  // Cerrar menú clip al hacer click fuera (sin backdrop bloqueante)
  useEffect(() => {
    if (!menuClipAbierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuClipRef.current?.contains(target) ||
        clipBtnRef.current?.contains(target)
      ) return;
      setMenuClipAbierto(false);
      setMenuClipPos(null);
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [menuClipAbierto]);

  // Estado drag & drop
  const [dragActivo, setDragActivo] = useState(false);

  // Focus automático al montar (solo en escritorio, en móvil evita abrir el teclado)
  const { esMobile } = useBreakpoint();

  // Effect: al cambiar de conversación → guardar borrador actual y cargar el de la nueva
  const conversacionAnteriorRef = useRef<string | null>(null);
  useEffect(() => {
    const anterior = conversacionAnteriorRef.current;

    // Guardar borrador de la conversación anterior
    if (anterior && anterior !== conversacionActivaId) {
      if (texto.trim()) {
        guardarBorrador(anterior, texto);
      } else {
        limpiarBorrador(anterior);
      }
    }

    // Cargar borrador de la nueva conversación (solo si no hay modo edición)
    if (conversacionActivaId && !mensajeEditando) {
      setTexto(borradores[conversacionActivaId] || '');
    }

    conversacionAnteriorRef.current = conversacionActivaId;
  }, [conversacionActivaId]);

  useEffect(() => {
    if (!esMobile) {
      inputRef.current?.focus();
    }
  }, [conversacionActivaId, esMobile]);

  // ---------------------------------------------------------------------------
  // Effect: Pre-llenar texto cuando se activa modo edición
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mensajeEditando) {
      setTexto(mensajeEditando.contenido || '');
      inputRef.current?.focus();
    }
  }, [mensajeEditando]);

  // ---------------------------------------------------------------------------
  // Effect: Focus al activar modo respuesta
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mensajeRespondiendo) {
      inputRef.current?.focus();
    }
  }, [mensajeRespondiendo]);

  // ---------------------------------------------------------------------------
  // Emitir eventos de escribiendo/dejar-escribir
  // ---------------------------------------------------------------------------

  /** Cierra el picker de emojis con animación funnel */
  const cerrarPicker = useCallback(() => {
    if (!pickerAbierto || pickerSaliendo) return;
    setPickerSaliendo(true);
    setTimeout(() => {
      setPickerAbierto(false);
      setPickerSaliendo(false);
    }, 200);
  }, [pickerAbierto, pickerSaliendo]);
  const manejarEscribiendo = useCallback(() => {
    if (!conversacionActivaId || !destinatarioId) return;

    const emisorSucursalId = obtenerSucursalChatYA();

    // Emitir "escribiendo" solo si no lo habíamos emitido
    if (!estaEscribiendoRef.current) {
      estaEscribiendoRef.current = true;
      emitirEvento('chatya:escribiendo', { conversacionId: conversacionActivaId, destinatarioId, emisorSucursalId });
    }

    // Resetear el timer
    if (escribiendoTimerRef.current) {
      clearTimeout(escribiendoTimerRef.current);
    }

    // Después de X ms sin teclear, emitir "dejar-escribir"
    escribiendoTimerRef.current = setTimeout(() => {
      if (conversacionActivaId) {
        emitirEvento('chatya:dejar-escribir', { conversacionId: conversacionActivaId, destinatarioId, emisorSucursalId });
      }
      estaEscribiendoRef.current = false;
    }, ESCRIBIENDO_DELAY_MS);
  }, [conversacionActivaId, destinatarioId]);

  // Cleanup del timer al desmontar
  useEffect(() => {
    return () => {
      if (escribiendoTimerRef.current) {
        clearTimeout(escribiendoTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Enviar mensaje
  // ---------------------------------------------------------------------------
  const handleEnviar = useCallback(async () => {
    const contenido = texto.trim();
    const tieneTexto = contenido.length > 0;
    const tieneImagenes = imagenesListas.length > 0;
    const tieneDocumento = !!documentoListo;
    const tieneAudio = !!audioListo;

    if ((!tieneTexto && !tieneImagenes && !tieneDocumento && !tieneAudio) || enviandoMensaje) return;

    // Limpiar input y borrador inmediatamente (optimista)
    setTexto('');
    if (conversacionActivaId) limpiarBorrador(conversacionActivaId);

    // Dejar de emitir "escribiendo"
    if (escribiendoTimerRef.current) {
      clearTimeout(escribiendoTimerRef.current);
    }
    if (conversacionActivaId && estaEscribiendoRef.current) {
      emitirEvento('chatya:dejar-escribir', { conversacionId: conversacionActivaId, destinatarioId, emisorSucursalId: obtenerSucursalChatYA() });
      estaEscribiendoRef.current = false;
    }

    // ── MODO EDICIÓN: actualizar mensaje existente (solo texto) ──
    if (mensajeEditando) {
      try {
        await chatyaService.editarMensaje(mensajeEditando.id, { contenido });
      } catch {
        void 0;
      }
      onCancelarEdicion?.();
      inputRef.current?.focus();
      return;
    }

    // ── ENVÍO DE IMÁGENES (una o múltiples) ──
    if (tieneImagenes) {
      // Copiar array y limpiar preview inmediatamente (optimista)
      const loteImagenes = [...imagenesListas];
      limpiarImagen();

      try {
        // 1. Pedir presigned URLs para todas las imágenes en paralelo
        const presignedPromises = loteImagenes.map((img) =>
          chatyaService.obtenerPresignedUrlImagen(img.archivo.name, img.archivo.type, img.archivo.size)
        );
        const presignedResults = await Promise.all(presignedPromises);

        // 2. Subir todas a R2 en paralelo
        const uploadPromises = loteImagenes.map((img, i) =>
          chatyaService.subirArchivoAR2(presignedResults[i].uploadUrl, img.archivo, img.archivo.type)
        );
        await Promise.all(uploadPromises);

        // 3. Enviar un mensaje por cada imagen (secuencial para mantener orden)
        for (let i = 0; i < loteImagenes.length; i++) {
          const img = loteImagenes[i];
          const contenidoImagen = JSON.stringify({
            url: presignedResults[i].publicUrl,
            ancho: img.ancho,
            alto: img.alto,
            peso: img.peso,
            miniatura: img.miniatura,
            caption: i === 0 ? (img.caption || undefined) : undefined, // Caption solo en la primera
          });

          await enviarMensaje({ contenido: contenidoImagen, tipo: 'imagen' });
        }

        // Si también hay texto, enviar como mensaje separado al final
        if (tieneTexto) {
          await enviarMensaje({ contenido, tipo: 'texto' });
        }
      } catch (err) {
        console.error('Error al enviar imágenes:', err);
        setErrorUpload('No se pudo enviar la imagen. Intenta de nuevo.');
      }

      inputRef.current?.focus();
      return;
    }

    // ── ENVÍO DE DOCUMENTO (optimista: aparece inmediato, sube en background) ──
    if (tieneDocumento) {
      const datosDoc = documentoListo;
      limpiarDocumento(); // Limpiar preview inmediatamente

      // 1. Insertar mensaje optimista ANTES de subir a R2
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const miId = obtenerMiIdChatYA() || null;
      const contenidoPlaceholder = JSON.stringify({
        url: 'uploading',
        nombre: datosDoc.nombre,
        tamano: datosDoc.tamano,
        tipoArchivo: datosDoc.tipoArchivo,
        extension: datosDoc.extension,
      });

      useChatYAStore.setState((state) => ({
        mensajes: [{
          id: tempId,
          conversacionId: conversacionActivaId!,
          emisorId: miId,
          emisorModo: null,
          emisorSucursalId: null,
          empleadoId: null,
          tipo: 'documento' as const,
          contenido: contenidoPlaceholder,
          estado: 'enviado' as const,
          editado: false,
          editadoAt: null,
          eliminado: false,
          eliminadoAt: null,
          respuestaAId: null,
          reenviadoDeId: null,
          createdAt: new Date().toISOString(),
          entregadoAt: null,
          leidoAt: null,
        }, ...state.mensajes],
        enviandoMensaje: true,
        // Actualizar preview en la lista
        conversaciones: state.conversaciones.map((c) =>
          c.id === conversacionActivaId
            ? { ...c, ultimoMensajeTexto: '📎 Documento', ultimoMensajeFecha: new Date().toISOString(), ultimoMensajeTipo: 'documento' as const, ultimoMensajeEstado: 'enviado' as const, ultimoMensajeEmisorId: miId }
            : c
        ),
      }));

      try {
        // 2. Subir a R2 (en background, el mensaje ya se ve)
        const { uploadUrl, publicUrl } = await chatyaService.obtenerPresignedUrlDocumento(
          datosDoc.archivo.name,
          datosDoc.tipoArchivo,
          datosDoc.tamano
        );
        await chatyaService.subirArchivoAR2(uploadUrl, datosDoc.archivo, datosDoc.tipoArchivo);

        // 3. Enviar al backend con URL real, reutilizando el temp existente
        const contenidoDocumento = JSON.stringify({
          url: publicUrl,
          nombre: datosDoc.nombre,
          tamano: datosDoc.tamano,
          tipoArchivo: datosDoc.tipoArchivo,
          extension: datosDoc.extension,
        });

        await enviarMensaje({ contenido: contenidoDocumento, tipo: 'documento' }, tempId);

        // Si también hay texto, enviar como mensaje separado
        if (tieneTexto) {
          await enviarMensaje({ contenido, tipo: 'texto' });
        }
      } catch (err) {
        console.error('Error al enviar documento:', err);
        setErrorUpload('No se pudo enviar el documento. Intenta de nuevo.');
        // Marcar como fallido
        useChatYAStore.setState((state) => ({
          mensajes: state.mensajes.map((m) =>
            m.id === tempId ? { ...m, estado: 'fallido' as const } : m
          ),
          enviandoMensaje: false,
        }));
      }

      inputRef.current?.focus();
      return;
    }

    // ── ENVÍO DE AUDIO (grabación de voz) ──
    if (tieneAudio) {
      const datosAudio = audioListo;
      limpiarAudio(); // Limpiar inmediatamente (optimista)

      // 1. Insertar mensaje optimista ANTES de subir a R2
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const miIdLocal = obtenerMiIdChatYA() || null;
      const contenidoPlaceholder = JSON.stringify({
        url: 'uploading',
        duracion: datosAudio.duracion,
        tamano: datosAudio.tamano,
        waveform: datosAudio.waveform,
      });

      useChatYAStore.setState((state) => ({
        mensajes: [{
          id: tempId,
          conversacionId: conversacionActivaId!,
          emisorId: miIdLocal,
          emisorModo: null,
          emisorSucursalId: null,
          empleadoId: null,
          tipo: 'audio' as const,
          contenido: contenidoPlaceholder,
          estado: 'enviado' as const,
          editado: false,
          editadoAt: null,
          eliminado: false,
          eliminadoAt: null,
          respuestaAId: null,
          reenviadoDeId: null,
          createdAt: new Date().toISOString(),
          entregadoAt: null,
          leidoAt: null,
        }, ...state.mensajes],
        enviandoMensaje: true,
        // Actualizar preview en la lista
        conversaciones: state.conversaciones.map((c) =>
          c.id === conversacionActivaId
            ? { ...c, ultimoMensajeTexto: '🎤 Audio', ultimoMensajeFecha: new Date().toISOString(), ultimoMensajeTipo: 'audio' as const, ultimoMensajeEstado: 'enviado' as const, ultimoMensajeEmisorId: miIdLocal }
            : c
        ),
      }));

      try {
        // 2. Generar nombre de archivo
        const extension = datosAudio.contentType.split('/')[1] || 'webm';
        const nombreArchivo = `audio_${Date.now()}.${extension}`;

        // 3. Subir a R2 (en background, el mensaje ya se ve)
        const { uploadUrl, publicUrl } = await chatyaService.obtenerPresignedUrlAudio(
          nombreArchivo,
          datosAudio.contentType,
          datosAudio.tamano
        );
        await chatyaService.subirArchivoAR2(uploadUrl, datosAudio.blob, datosAudio.contentType);

        // 4. Enviar al backend con URL real
        const contenidoAudio = JSON.stringify({
          url: publicUrl,
          duracion: datosAudio.duracion,
          tamano: datosAudio.tamano,
          waveform: datosAudio.waveform,
        });

        await enviarMensaje({ contenido: contenidoAudio, tipo: 'audio' }, tempId);
      } catch (err) {
        console.error('Error al enviar audio:', err);
        setErrorUpload('No se pudo enviar el audio. Intenta de nuevo.');
        // Marcar como fallido
        useChatYAStore.setState((state) => ({
          mensajes: state.mensajes.map((m) =>
            m.id === tempId ? { ...m, estado: 'fallido' as const } : m
          ),
          enviandoMensaje: false,
        }));
      }

      // No hacer focus al input — evita abrir teclado en móvil después de audio
      return;
    }

    // ── CHAT TEMPORAL: crear conversación real primero, luego enviar ──
    if (chatTemporal && conversacionActivaId?.startsWith('temp_')) {
      const datosCreacion = chatTemporal.datosCreacion;
      const conv = await crearConversacion(datosCreacion);
      if (!conv) {
        setTexto(contenido);
        return;
      }
      transicionarAConversacionReal(conv.id);
      // En contextos donde el backend auto-inserta una card de sistema
      // (marketplace, oferta, articulo_negocio), sincronizar mensajes
      // desde el backend para reemplazar el optimista temporal con el
      // mensaje real persistido. Sin esto la card desaparece al refrescar
      // y el receptor nunca la ve.
      const esContextoConCardBackend =
        datosCreacion.contextoTipo === 'marketplace' ||
        datosCreacion.contextoTipo === 'oferta' ||
        datosCreacion.contextoTipo === 'articulo_negocio';
      if (esContextoConCardBackend) {
        await useChatYAStore.getState().cargarMensajes(conv.id);
      }
      // Consumir el preview de contexto pendiente (si lo hay) — la card
      // ya quedó persistida vía la materialización con `datosCreacion`.
      // Sin esto, `enviarMensaje` del store volvería a llamar a
      // `crearConversacion` y duplicaría la card.
      useChatYAStore.getState().setContextoPendiente(null);
      await enviarMensaje({ contenido, tipo: 'texto' });
      inputRef.current?.focus();
      return;
    }

    // ── MODO RESPUESTA: enviar con referencia al mensaje original ──
    if (mensajeRespondiendo) {
      await enviarMensaje({ contenido, tipo: 'texto', respuestaAId: mensajeRespondiendo.id });
      onCancelarRespuesta?.();
      inputRef.current?.focus();
      return;
    }

    // ── ENVÍO NORMAL ──
    await enviarMensaje({ contenido, tipo: 'texto' });
    inputRef.current?.focus();
  }, [texto, enviandoMensaje, enviarMensaje, conversacionActivaId, mensajeEditando, onCancelarEdicion, mensajeRespondiendo, onCancelarRespuesta, imagenesListas, limpiarImagen, documentoListo, limpiarDocumento, audioListo, limpiarAudio]);

  // ---------------------------------------------------------------------------
  // Enter para enviar (Shift+Enter para nueva línea futuro)
  // ---------------------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (pickerAbierto) cerrarPicker();
      handleEnviar();
    }
    if (e.key === 'Escape') {
      if (mensajeEditando) {
        setTexto('');
        onCancelarEdicion?.();
      }
      if (mensajeRespondiendo) {
        onCancelarRespuesta?.();
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Selección de archivo (galería o cámara)
  // ---------------------------------------------------------------------------
  const handleSeleccionArchivo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const archivos = e.target.files;
    if (!archivos || archivos.length === 0) return;

    // Separar imágenes de documentos
    const imagenes: File[] = [];
    const documentos: File[] = [];
    Array.from(archivos).forEach((f) => {
      if (f.type.startsWith('image/')) imagenes.push(f);
      else if (esDocumentoPermitido(f.type)) documentos.push(f);
    });

    // Procesar imágenes (múltiples)
    if (imagenes.length === 1) {
      procesarImagen(imagenes[0]);
    } else if (imagenes.length > 1) {
      procesarImagenes(imagenes);
    }

    // Procesar documento (solo 1 a la vez)
    if (documentos.length > 0) {
      procesarDocumento(documentos[0]);
    }

    // Reset del input para poder seleccionar los mismos archivos
    e.target.value = '';
  }, [procesarImagen, procesarImagenes, procesarDocumento]);

  // ---------------------------------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------------------------------
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bloqueado) return;
    setDragActivo(true);
  }, [bloqueado]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivo(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActivo(false);
    if (bloqueado) return;

    const archivos = Array.from(e.dataTransfer.files);
    const imagenes = archivos.filter((f) => f.type.startsWith('image/'));
    const documentos = archivos.filter((f) => esDocumentoPermitido(f.type));

    if (imagenes.length === 1) {
      procesarImagen(imagenes[0]);
    } else if (imagenes.length > 1) {
      procesarImagenes(imagenes);
    }

    if (documentos.length > 0) {
      procesarDocumento(documentos[0]);
    }
  }, [bloqueado, procesarImagen, procesarImagenes, procesarDocumento]);

  // ---------------------------------------------------------------------------
  // Effect: procesar archivos recibidos via drag & drop desde VentanaChat
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (archivosDrop && archivosDrop.length > 0 && !bloqueado && !mensajeEditando) {
      const imagenes = archivosDrop.filter((f) => f.type.startsWith('image/'));
      const documentos = archivosDrop.filter((f) => esDocumentoPermitido(f.type));

      if (imagenes.length === 1) {
        procesarImagen(imagenes[0]);
      } else if (imagenes.length > 1) {
        procesarImagenes(imagenes);
      }

      if (documentos.length > 0) {
        procesarDocumento(documentos[0]);
      }

      onArchivosDropProcesados?.();
    }
  }, [archivosDrop]);

  // ---------------------------------------------------------------------------
  // Effect: Auto-enviar cuando el audio está listo (después de detener grabación)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (audioListo && !enviandoMensaje) {
      handleEnviar();
    }
  }, [audioListo]);

  // ---------------------------------------------------------------------------
  // Hold-to-record: sincronizar ref con estado de grabación
  // ---------------------------------------------------------------------------
  useEffect(() => {
    grabandoRef.current = grabandoAudio;
  }, [grabandoAudio]);

  // ---------------------------------------------------------------------------
  // Hold-to-record: si la grabación inicia después de que el usuario ya soltó
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (grabandoAudio && holdReleasedBeforeStartRef.current) {
      holdReleasedBeforeStartRef.current = false;
      detenerGrabacion();
      setHoldGrabando(false);
    }
  }, [grabandoAudio, detenerGrabacion]);

  // ---------------------------------------------------------------------------
  // Hold-to-record: pointer down en botón mic (solo móvil)
  // ---------------------------------------------------------------------------
  const handleMicPointerDown = useCallback((e: React.PointerEvent) => {
    if (!esMobile) return;
    e.preventDefault();
    e.stopPropagation();

    // Capturar pointer: todos los move/up/cancel se rutean a este elemento aunque el dedo se mueva fuera
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    holdActiveRef.current = true;
    holdReleasedBeforeStartRef.current = false;
    esHoldRef.current = false;
    holdStartYRef.current = e.clientY;
    holdStartXRef.current = e.clientX;
    cancelZonaRef.current = false;
    setCancelZona(false);
    iniciarGrabacion();

    // Después de 300ms sin soltar → es hold
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      if (holdActiveRef.current) {
        esHoldRef.current = true;
        setHoldGrabando(true);
      }
    }, 300);
  }, [esMobile, iniciarGrabacion]);

  // ---------------------------------------------------------------------------
  // Hold-to-record: listeners en document para move/up (activo desde pointerDown)
  // ---------------------------------------------------------------------------
  const [holdTracking, setHoldTracking] = useState(false);

  // Activar tracking desde pointerDown
  const handleMicPointerDownWrapped = useCallback((e: React.PointerEvent) => {
    handleMicPointerDown(e);
    setHoldTracking(true);
  }, [handleMicPointerDown]);

  useEffect(() => {
    if (!holdTracking || !esMobile) return;

    const handleMove = (e: PointerEvent) => {
      if (!holdActiveRef.current) return;
      const deltaY = holdStartYRef.current - e.clientY;
      const enZona = deltaY > CANCEL_UMBRAL_PX;
      cancelZonaRef.current = enZona;
      setCancelZona(enZona);
    };

    const handleUp = () => {
      if (!holdActiveRef.current) { setHoldTracking(false); return; }
      holdActiveRef.current = false;

      // Limpiar timer de hold
      if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }

      if (esHoldRef.current) {
        // ── Fue HOLD: enviar o cancelar según deslizamiento ──
        if (cancelZonaRef.current) {
          cancelarGrabacion();
          setAnimacionBasura(true);
        } else if (grabandoRef.current) {
          detenerGrabacion();
        } else {
          holdReleasedBeforeStartRef.current = true;
        }
        setHoldGrabando(false);
      }
      // ── Fue TAP (<300ms): no hacer nada, queda en modo botones ──

      setCancelZona(false);
      cancelZonaRef.current = false;
      esHoldRef.current = false;
      setHoldTracking(false);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);

    return () => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
    };
  }, [holdTracking, esMobile, cancelarGrabacion, detenerGrabacion]);

  // ---------------------------------------------------------------------------
  // Hold-to-record: bloquear Google Search / menú contextual en long-press
  // contextmenu en toda la barra, touchstart solo en el mic
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const bar = inputBarRef.current;
    if (!esMobile || !bar) return;

    const bloquearTodo = (e: Event) => { e.preventDefault(); };

    bar.addEventListener('contextmenu', bloquearTodo, true);
    bar.addEventListener('selectstart', bloquearTodo, true);

    return () => {
      bar.removeEventListener('contextmenu', bloquearTodo, true);
      bar.removeEventListener('selectstart', bloquearTodo, true);
    };
  }, [esMobile]);

  // ---------------------------------------------------------------------------
  // Helper: formatear duración de grabación (ej: 72.3 → "1:12")
  // ---------------------------------------------------------------------------
  const formatearDuracionGrabacion = (segundos: number): string => {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const puedeEnviar = (texto.trim().length > 0 || imagenesListas.length > 0 || !!documentoListo || !!audioListo) && !enviandoMensaje && !bloqueado && !procesandoImagen;
  puedeEnviarRef.current = puedeEnviar;

  return (
    <div
      ref={inputBarRef}
      className={`shrink-0 px-0.5 lg:px-3 pb-3 lg:pb-4 pt-1 bg-[#050d1a]/80 lg:bg-transparent relative ${dragActivo ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
      style={esMobile ? {
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      } as React.CSSProperties : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay drag & drop */}
      {dragActivo && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px] rounded-xl pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-blue-600">Suelta archivos aquí</span>
          </div>
        </div>
      )}

      {/* ── Preview de contexto pendiente (oferta / artículo / MP) ──
          Solo se muestra cuando el usuario inició el chat desde un recurso
          y aún no ha enviado el primer mensaje. La X descarta el preview
          sin tocar BD. Al enviar, el flujo persiste card + mensaje en BD. */}
      {contextoPendiente && (
        <PreviewContextoInput
          contexto={contextoPendiente}
          onDescartar={() => setContextoPendiente(null)}
        />
      )}

      {/* ── Error de imagen ── */}
      {errorImagen && (
        <div className="flex items-center gap-2 mx-4 mb-2 px-3 py-1.5 bg-red-100 border-2 border-red-300 rounded-full text-sm text-red-600 font-medium">
          <button type="button" onClick={limpiarImagen} className="shrink-0 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="truncate">{errorImagen}</span>
        </div>
      )}

      {/* ── Error de documento ── */}
      {errorDocumento && (
        <div className="flex items-center gap-2 mx-4 mb-2 px-3 py-1.5 bg-red-100 border-2 border-red-300 rounded-full text-sm text-red-600 font-medium">
          <button type="button" onClick={limpiarDocumento} className="shrink-0 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="truncate">{errorDocumento}</span>
        </div>
      )}

      {/* ── Error de audio ── */}
      {errorAudio && (
        <div className="flex items-center gap-2 mx-4 mb-2 px-3 py-1.5 bg-red-100 border-2 border-red-300 rounded-full text-sm text-red-600 font-medium">
          <button type="button" onClick={limpiarAudio} className="shrink-0 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="truncate">{errorAudio}</span>
        </div>
      )}

      {/* ── Error de upload ── */}
      {errorUpload && (
        <div className="flex items-center gap-2 mx-4 mb-2 px-3 py-1.5 bg-red-100 border-2 border-red-300 rounded-full text-sm text-red-600 font-medium">
          <button type="button" onClick={() => setErrorUpload(null)} className="shrink-0 hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
          <span className="truncate">{errorUpload}</span>
        </div>
      )}

      {/* ── Preview de imágenes seleccionadas (strip horizontal) ── */}
      {imagenesListas.length > 0 && (
        <div className="mx-4 mb-2 px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-slate-300 rounded-2xl shadow-sm">
          {/* Fila: thumbnails + badge + botón limpiar todo */}
          <div className="flex items-center gap-2">
            {/* Strip horizontal con scroll */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0" style={{ scrollbarWidth: 'none' }}>
              {imagenesListas.map((img, i) => (
                <div key={img.blobUrl} className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-200 group">
                  <img
                    src={img.blobUrl}
                    alt={`Preview ${i + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {/* Botón X individual por imagen */}
                  <button
                    onClick={() => removerImagen(i)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}

              {/* Spinner si está procesando más imágenes */}
              {procesandoImagen && (
                <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                </div>
              )}

              {/* Botón "+" para agregar más (si caben) */}
              {puedeAgregarMas && !procesandoImagen && (
                <button
                  onClick={() => inputArchivoRef.current?.click()}
                  className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 hover:border-blue-400 flex items-center justify-center shrink-0 cursor-pointer hover:bg-blue-100/50"
                >
                  <ImageIcon className="w-5 h-5 text-slate-600" />
                </button>
              )}
            </div>

            {/* Badge contador */}
            {imagenesListas.length > 1 && (
              <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 shrink-0">
                {imagenesListas.length}/{maxImagenes}
              </span>
            )}

            {/* Botón limpiar todo */}
            <button
              onClick={limpiarImagen}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-300 hover:bg-slate-400 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5 text-slate-700" />
            </button>
          </div>

          {/* Input caption global (debajo de los thumbnails) */}
          <input
            type="text"
            value={imagenesListas[0]?.caption || ''}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Agregar pie de foto..."
            maxLength={200}
            className="w-full mt-1.5 bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder:text-slate-500"
          />
        </div>
      )}

      {/* ── Preview de documento seleccionado ── */}
      {documentoListo && (
        <div className="flex items-center gap-3 mx-4 mb-2 px-3 py-2 bg-white backdrop-blur-sm border-2 border-slate-300 rounded-2xl shadow-sm">
          {/* Icono según extensión */}
          <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
            documentoListo.extension === 'pdf' ? 'bg-red-100 text-red-600' :
            ['doc', 'docx'].includes(documentoListo.extension) ? 'bg-blue-100 text-blue-600' :
            ['xls', 'xlsx', 'csv'].includes(documentoListo.extension) ? 'bg-green-100 text-green-600' :
            ['ppt', 'pptx'].includes(documentoListo.extension) ? 'bg-orange-100 text-orange-600' :
            'bg-slate-200 text-slate-600'
          }`}>
            <FileText className="w-5 h-5" />
          </div>
          {/* Nombre + tamaño */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{documentoListo.nombre}</p>
            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">{formatearTamano(documentoListo.tamano)} · {documentoListo.extension.toUpperCase()}</p>
          </div>
          {/* Botón cancelar */}
          <button
            onClick={limpiarDocumento}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-300 hover:bg-slate-400 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5 text-slate-700" />
          </button>
        </div>
      )}

      {/* ── Barra de edición ── */}
      {mensajeEditando && (
        <div className="flex items-stretch mx-3 lg:mx-4 mb-1.5 bg-gray-800/90 lg:bg-amber-100 rounded-lg overflow-hidden">
          {/* Borde lateral izquierdo */}
          <div className="w-1 bg-amber-400 shrink-0" />

          {/* Ícono */}
          <div className="flex items-center pl-3">
            <div className="w-7 h-7 rounded-md bg-linear-to-br from-amber-500 to-amber-400 flex items-center justify-center shrink-0">
              <Pencil className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0 px-3 py-2">
            <p className="text-sm font-semibold text-amber-400 lg:text-amber-600 leading-tight">Editando</p>
            <p className="text-sm text-white/50 lg:text-slate-600 truncate mt-0.5">
              <TextoConEmojis texto={mensajeEditando.contenido || ''} tamañoEmoji={18} />
            </p>
          </div>

          {/* Botón cerrar */}
          <button
            onClick={() => { setTexto(''); onCancelarEdicion?.(); }}
            className="px-2.5 flex items-center justify-center hover:bg-white/5 lg:hover:bg-black/5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 text-gray-400 lg:text-slate-600" />
          </button>
        </div>
      )}

      {/* ── Barra de respuesta (estilo WhatsApp) ── */}
      {mensajeRespondiendo && !mensajeEditando && (
        <div className="flex items-stretch mx-3 lg:mx-4 mb-1.5 bg-gray-800/90 lg:bg-slate-100 rounded-lg overflow-hidden">
          {/* Borde lateral izquierdo */}
          <div className="w-1 bg-blue-400 lg:bg-blue-500 shrink-0" />

          {/* Ícono */}
          <div className="flex items-center pl-3">
            <div className="w-7 h-7 rounded-md bg-linear-to-br from-blue-500 to-blue-400 flex items-center justify-center shrink-0">
              <Reply className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Contenido */}
          <div className="flex-1 min-w-0 px-3 py-2">
              <p className="text-sm font-semibold text-blue-400 lg:text-blue-600 leading-tight">
                {mensajeRespondiendo.emisorId === miId ? 'Tú' : nombreContacto || 'Mensaje'}
              </p>
              <p className="text-sm text-gray-400 lg:text-slate-600 truncate mt-0.5">
                {mensajeRespondiendo.tipo === 'imagen' ? (() => {
                  let d: { caption?: string } = {};
                  try { d = JSON.parse(mensajeRespondiendo.contenido); } catch { /* ignore */ }
                  return <>📷 {d.caption || 'Foto'}</>;
                })() : mensajeRespondiendo.tipo === 'audio' ? (
                  '🎤 Audio'
                ) : mensajeRespondiendo.tipo === 'documento' ? (
                  '📄 Documento'
                ) : (
                  <TextoConEmojis texto={mensajeRespondiendo.contenido || ''} tamañoEmoji={18} />
                )}
              </p>
          </div>

          {/* Thumbnail pegado al borde, altura completa (solo imágenes) */}
          {mensajeRespondiendo.tipo === 'imagen' && (() => {
            let d: { url?: string } = {};
            try { d = JSON.parse(mensajeRespondiendo.contenido); } catch { /* ignore */ }
            return d.url ? (
              <img src={d.url} alt="" className="w-16 object-cover shrink-0" />
            ) : null;
          })()}

          {/* Botón cerrar */}
          <button
            onClick={() => onCancelarRespuesta?.()}
            className="px-2.5 flex items-center justify-center hover:bg-white/5 lg:hover:bg-black/5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4 text-gray-400 lg:text-slate-600" />
          </button>
        </div>
      )}

      {/* ── Input + botón enviar ── */}
      <div className="flex items-center gap-1 lg:gap-2.5 px-2 lg:px-4 py-1 pb-0">

        {/* ═══ MODO GRABACIÓN: barra de grabación con waveform en vivo ═══ */}
        {grabandoAudio ? (
          <>
            {/* Botón cancelar / nada en hold (el texto va después de la barra) */}
            {holdGrabando ? null : (
              <button
                onPointerUp={(e) => { e.preventDefault(); cancelarGrabacion(); setAnimacionBasura(true); }}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 text-red-400 hover:text-red-500 hover:bg-red-500/10"
              >
                <X className="w-6 h-6" />
              </button>
            )}

            {/* Barra de grabación: indicador + waveform + timer */}
            <div className={`flex-1 min-w-0 flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full select-none ${
              cancelZona
                ? 'bg-red-500/15 border border-red-500/40 lg:bg-red-100 lg:border-red-300'
                : 'bg-white/10 border-0 lg:border lg:bg-gray-200 lg:border-gray-300'
            }`}>
              {/* Punto rojo pulsante */}
              <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 animate-pulse" />

              {/* Waveform en vivo */}
              <div className="flex-1 flex items-center gap-0.5 h-7 overflow-hidden">
                {waveformEnVivo.length > 0 ? (
                  waveformEnVivo.map((valor, i) => (
                    <div
                      key={i}
                      className="rounded-full bg-red-400 lg:bg-red-500 shrink-0"
                      style={{
                        width: '2.5px',
                        height: `${Math.max(15, valor * 100)}%`,
                        minHeight: '3px',
                      }}
                    />
                  ))
                ) : (
                  /* Barras estáticas iniciales mientras arranca */
                  Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full bg-white/20 lg:bg-gray-400 shrink-0"
                      style={{ width: '2.5px', height: '15%', minHeight: '3px' }}
                    />
                  ))
                )}
              </div>

              {/* Timer */}
              <span className="text-sm font-medium tabular-nums text-white/70 lg:text-gray-600 shrink-0 min-w-10 text-right select-none">
                {formatearDuracionGrabacion(duracionAudio)}
              </span>
            </div>

            {/* Texto deslizar para cancelar (solo hold móvil, después de la barra) */}
            {holdGrabando && (
              <div className="flex flex-col items-center shrink-0 select-none leading-tight">
                <span className={`text-[10px] font-medium ${cancelZona ? 'text-red-400' : 'text-white/40'}`}>
                  {cancelZona ? 'Suelta para' : '↑ Desliza para'}
                </span>
                <span className={`text-[10px] font-medium ${cancelZona ? 'text-red-400' : 'text-white/40'}`}>
                  cancelar
                </span>
              </div>
            )}

            {/* Botón detener y enviar / Basura en zona cancelar */}
            {holdGrabando ? (
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                cancelZona
                  ? 'bg-red-600 text-white scale-110 shadow-[0_3px_14px_rgba(220,38,38,0.5)]'
                  : 'bg-linear-to-br from-red-500 to-red-600 text-white shadow-[0_3px_10px_rgba(239,68,68,0.3)]'
              }`}>
                {cancelZona ? <Trash2 className="w-6 h-6" /> : <Send className="w-6 h-6" />}
              </div>
            ) : (
              <button
                onPointerUp={(e) => { e.preventDefault(); detenerGrabacion(); }}
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 bg-linear-to-br from-red-500 to-red-600 text-white shadow-[0_3px_10px_rgba(239,68,68,0.3)] hover:scale-105"
              >
                <Send className="w-6 h-6" />
              </button>
            )}
          </>
        ) : (
          <>
            {/* ═══ MODO NORMAL: pill + botón enviar/mic ═══ */}

            {/* Pill: emoji(desktop) + input + clip + cámara */}
            <div className="flex-1 flex items-center gap-0.5 pl-2 pr-0 py-2 bg-white/10 border-0 lg:border lg:bg-slate-100 lg:border-slate-300 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.25)] focus-within:shadow-[0_4px_22px_rgba(0,0,0,0.45)]">

              {/* Botón emoji (solo desktop) */}
              <button
                ref={smileBtnRef}
                onClick={() => {
                  if (pickerAbierto) {
                    cerrarPicker();
                  } else {
                    const rect = smileBtnRef.current?.getBoundingClientRect();
                    if (rect) {
                      setPickerPos({
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }
                    setPickerAbierto(true);
                  }
                }}
                disabled={bloqueado}
                className={`shrink-0 hidden lg:flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 text-gray-600 hover:text-gray-900 ${bloqueado ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Smile className="w-6 h-6" />
              </button>

              {/* Input de texto */}
              <input
                data-testid="chat-input"
                ref={inputRef}
                type="text"
                value={texto}
                onChange={(e) => {
                  if (bloqueado) return;
                  setTexto(e.target.value);
                  if (e.target.value.trim()) manejarEscribiendo();
                }}
                onKeyDown={handleKeyDown}
                disabled={bloqueado}
                placeholder={bloqueado ? 'No puedes enviar mensajes a este contacto' : mensajeEditando ? 'Editar mensaje...' : mensajeRespondiendo ? 'Escribir respuesta...' : 'Mensaje'}
                maxLength={5000}
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="sentences"
                spellCheck={false}
                enterKeyHint="send"
                style={{ fontFamily: 'Inter, "Noto Color Emoji", sans-serif' }}
                className="flex-1 px-1 bg-transparent border-none outline-none text-[17px] lg:text-[15px] font-medium text-white/90 lg:text-gray-800 placeholder:text-white/40 lg:placeholder:text-gray-500 disabled:text-white/30 lg:disabled:text-gray-400 disabled:cursor-not-allowed"
              />

              {/* Botón clip — abre menú de adjuntos */}
              <button
                ref={clipBtnRef}
                onClick={() => {
                  if (menuClipAbierto) {
                    setMenuClipAbierto(false);
                    setMenuClipPos(null);
                  } else {
                    const rect = clipBtnRef.current?.getBoundingClientRect();
                    if (rect) setMenuClipPos({ x: rect.right, y: rect.top });
                    setMenuClipAbierto(true);
                  }
                }}
                disabled={bloqueado || !!mensajeEditando}
                className={`shrink-0 flex items-center justify-center w-7 h-7 -ml-6 rounded-full cursor-pointer hover:scale-110 active:scale-95
                  ${menuClipAbierto ? 'text-blue-400 lg:text-blue-600' : ''}
                  ${bloqueado || mensajeEditando ? 'text-white/50 lg:text-gray-500 cursor-not-allowed' : 'text-white/50 hover:text-white/80 lg:text-gray-500 lg:hover:text-gray-700'}
                `}
              >
                {menuClipAbierto
                  ? <X className="w-5 h-5" />
                  : <Paperclip className="w-5.5 h-5.5" />
                }
              </button>

              {/* Botón cámara (acceso rápido) */}
              <button
                onClick={() => inputCamaraRef.current?.click()}
                disabled={bloqueado || !!mensajeEditando}
                className={`shrink-0 flex items-center justify-center w-7 h-7 ml-4 mr-2 rounded-full cursor-pointer hover:scale-110 active:scale-95
                  ${bloqueado || mensajeEditando ? 'text-white/50 lg:text-gray-500 cursor-not-allowed' : 'text-white/50 hover:text-white/80 lg:text-gray-500 lg:hover:text-gray-700'}
                `}
              >
                <Camera className="w-5.5 h-5.5" />
              </button>
            </div>

            {/* Modal de ubicación */}
            <ModalUbicacionChat
              abierto={modalUbicacionAbierto}
              onCerrar={() => setModalUbicacionAbierto(false)}
              onEnviar={async (contenidoJSON) => {
                await enviarMensaje({ contenido: contenidoJSON, tipo: 'ubicacion' });
              }}
            />

            {/* Portal: Menú del clip */}
            {menuClipAbierto && menuClipPos && createPortal(
                <div ref={menuClipRef} className="fixed z-9999" style={{ right: window.innerWidth - menuClipPos.x, top: menuClipPos.y - 16, transform: 'translateY(-100%)' }}>
                  <div className="rounded-2xl overflow-hidden shadow-2xl min-w-48 lg:min-w-40 py-1"
                    style={{ background: window.innerWidth >= 1024 ? '#ffffff' : '#0d1b2e', border: window.innerWidth >= 1024 ? '2px solid #cbd5e1' : '1px solid rgba(255,255,255,0.06)' }}
                  >
                  <button
                    onClick={() => { setMenuClipAbierto(false); setMenuClipPos(null); inputGaleriaRef.current?.click(); }}
                    className="flex items-center gap-3.5 lg:gap-3 px-5 lg:px-4 py-2.5 lg:py-2.5 w-full hover:bg-white/5 lg:hover:bg-slate-200 cursor-pointer"
                  >
                    <ImageIcon className="w-5 h-5 lg:w-4 lg:h-4 text-blue-400 lg:text-blue-500" />
                    <span className="text-base lg:text-sm font-medium text-white/80 lg:text-slate-700">Galería</span>
                  </button>
                  <button
                    onClick={() => { setMenuClipAbierto(false); setMenuClipPos(null); inputCamaraRef.current?.click(); }}
                    className="flex items-center gap-3.5 lg:gap-3 px-5 lg:px-4 py-2.5 lg:py-2.5 w-full hover:bg-white/5 lg:hover:bg-slate-200 cursor-pointer"
                  >
                    <Camera className="w-5 h-5 lg:w-4 lg:h-4 text-purple-400 lg:text-purple-500" />
                    <span className="text-base lg:text-sm font-medium text-white/80 lg:text-slate-700">Cámara</span>
                  </button>
                  <button
                    onClick={() => { setMenuClipAbierto(false); setMenuClipPos(null); inputDocumentoRef.current?.click(); }}
                    className="flex items-center gap-3.5 lg:gap-3 px-5 lg:px-4 py-2.5 lg:py-2.5 w-full hover:bg-white/5 lg:hover:bg-slate-200 cursor-pointer"
                  >
                    <FileText className="w-5 h-5 lg:w-4 lg:h-4 text-orange-400 lg:text-orange-500" />
                    <span className="text-base lg:text-sm font-medium text-white/80 lg:text-slate-700">Documento</span>
                  </button>
                  <button
                    onClick={() => { setMenuClipAbierto(false); setMenuClipPos(null); setModalUbicacionAbierto(true); }}
                    className="flex items-center gap-3.5 lg:gap-3 px-5 lg:px-4 py-2.5 lg:py-2.5 w-full hover:bg-white/5 lg:hover:bg-slate-200 cursor-pointer"
                  >
                    <MapPin className="w-5 h-5 lg:w-4 lg:h-4 text-emerald-400 lg:text-emerald-500" />
                    <span className="text-base lg:text-sm font-medium text-white/80 lg:text-slate-700">Ubicación</span>
                  </button>
                </div>
              </div>,
              document.body
            )}

            {/* Portal: Picker completo de emojis */}
            {(pickerAbierto || pickerSaliendo) && pickerPos && createPortal(
              <div
                className="fixed z-9999"
                style={{
                  left: pickerPos.x,
                  top: pickerPos.y - 8,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <div
                  className={`picker-portal-centrado ${pickerSaliendo ? 'emoji-popup-out' : 'emoji-popup-in'}`}
                  style={{ transformOrigin: 'center bottom' }}
                >
                  <SelectorEmojis
                    onSeleccionar={(emoji) => {
                      setTexto((prev) => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    onCerrar={cerrarPicker}
                    posicion="arriba-izq"
                    ancho={470}
                    alto={430}
                    cerrarAlSeleccionar={false}
                  />
                </div>
              </div>,
              document.body
            )}

            {/* Botón dinámico: Micrófono (vacío) / Enviar (con texto) */}
            <button
              ref={micBtnRef}
              onMouseDown={(e) => e.preventDefault()}
              style={esMobile && !puedeEnviar ? { touchAction: 'none' } : undefined}
              onClick={() => {
                if (puedeEnviar) {
                  handleEnviar();
                } else if (!esMobile) {
                  iniciarGrabacion();
                }
                // En móvil: tap se maneja en pointerDown+pointerUp (timer <300ms)
              }}
              data-testid="chat-enviar"
              onPointerDown={!puedeEnviar && esMobile ? handleMicPointerDownWrapped : undefined}
              disabled={!puedeEnviar && (texto.trim().length > 0 || imagenesListas.length > 0 || !!documentoListo)}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center shrink-0 select-none
                ${puedeEnviar
                  ? mensajeEditando
                    ? 'bg-linear-to-br from-amber-500 to-amber-400 text-white shadow-[0_3px_10px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-linear-to-br from-blue-600 to-blue-500 text-white shadow-[0_3px_10px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_14px_rgba(37,99,235,0.4)] hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-linear-to-br from-blue-600 to-blue-500 text-white shadow-[0_3px_10px_rgba(37,99,235,0.3)] cursor-pointer hover:scale-105 active:scale-95'
                }
              `}
            >
              {puedeEnviar ? (
                <Send className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>
          </>
        )}
      </div>

      {/* ── Inputs ocultos de archivo ── */}
      <input
        ref={inputArchivoRef}
        type="file"
        accept={`image/jpeg,image/png,image/webp,image/gif,${ACCEPT_DOCUMENTOS}`}
        multiple
        onChange={handleSeleccionArchivo}
        className="hidden"
      />
      <input
        ref={inputGaleriaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleSeleccionArchivo}
        className="hidden"
      />
      <input
        ref={inputDocumentoRef}
        type="file"
        accept={ACCEPT_DOCUMENTOS}
        onChange={handleSeleccionArchivo}
        className="hidden"
      />
      <input
        ref={inputCamaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSeleccionArchivo}
        className="hidden"
      />

      {/* Animación de basura al cancelar audio con deslizamiento */}
      {animacionBasura && (
        <AnimacionBasuraAudio onCompleta={() => setAnimacionBasura(false)} />
      )}

    </div>
  );
}

export default InputMensaje;