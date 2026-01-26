/**
 * ModalCanjearVoucher.tsx
 * ========================
 * Modal para canjear un voucher específico.
 * 
 * Métodos de canje:
 * 1. QR: Escanear QR del cliente (token JWT temporal 5 min) - FUNCIONAL
 * 2. Código: Ingresar código manual de 6 dígitos - FUNCIONAL
 * 
 * Ubicación: apps/web/src/components/scanya/ModalCanjearVoucher.tsx
 */

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Gift,
  CheckCircle,
  Loader2,
  AlertCircle,
  QrCode,
  Hash,
  ArrowLeft,
  CameraOff,
} from 'lucide-react';
import axios from 'axios';
import notificar from '@/utils/notificaciones';
import scanyaService from '@/services/scanyaService';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalCanjearVoucherProps {
  abierto: boolean;
  onClose: () => void;
  voucherId: string | null;
  clienteId: string | null;
  clienteNombre: string;
  recompensaNombre: string;
  onVoucherCanjeado: () => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalCanjearVoucher({
  abierto,
  onClose,
  voucherId,
  clienteId,
  clienteNombre,
  recompensaNombre,
  onVoucherCanjeado,
}: ModalCanjearVoucherProps) {
  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [metodo, setMetodo] = useState<'qr' | 'codigo' | null>(null);
  const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
  const [canjeando, setCanjeando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  // Estados para QR Scanner
  const [escaneandoQR, setEscaneandoQR] = useState(false);
  const [camaraDisponible, setCamaraDisponible] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Referencias
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ---------------------------------------------------------------------------
  // Reset al abrir/cerrar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (abierto) {
      setMetodo(null);
      setCodigo(['', '', '', '', '', '']);
      setError(null);
      setExito(false);
      setEscaneandoQR(false);
      setCamaraDisponible(null);
      detenerCamara();
    } else {
      detenerCamara();
    }
  }, [abierto]);

  // Focus en primer input cuando se selecciona método código
  useEffect(() => {
    if (metodo === 'codigo') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [metodo]);

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers: Código Manual
  // ---------------------------------------------------------------------------
  const handleDigitoChange = (index: number, valor: string) => {
    const caracteres = valor.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const nuevosCodigos = [...codigo];
    nuevosCodigos[index] = caracteres;
    setCodigo(nuevosCodigos);
    setError(null);

    if (caracteres && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const texto = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (texto.length === 6) {
      setCodigo(texto.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleCanjear = async () => {
    if (!voucherId || !clienteId) return;

    const codigoCompleto = codigo.join('');
    if (codigoCompleto.length !== 6) {
      setError('Ingresa los 6 caracteres del código');
      return;
    }

    setCanjeando(true);
    setError(null);

    try {
      const respuesta = await scanyaService.canjearVoucher({
        voucherId,
        usuarioId: clienteId,
        codigo: codigoCompleto,
      });

      if (respuesta.success) {
        setExito(true);

        notificar.exito('¡Voucher Canjeado!', 'Entrega la recompensa al cliente');

        onVoucherCanjeado();
        onClose();
      } else {
        setError(respuesta.message || 'Error al canjear voucher');
      }
    } catch (err: unknown) {
      console.error('Error canjeando voucher:', err);

      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Error de conexión. Intenta de nuevo.');
      } else {
        setError('Error de conexión. Intenta de nuevo.');
      }
    }
    finally {
      setCanjeando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: QR Scanner
  // ---------------------------------------------------------------------------
  const iniciarCamara = async () => {
    try {
      setError(null);
      setEscaneandoQR(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      setStream(mediaStream);
      setCamaraDisponible(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      iniciarEscaneoQR();
    } catch (err: unknown) {
      console.error('Error accediendo a la cámara:', err);
      setCamaraDisponible(false);

      let mensaje = 'No se pudo acceder a la cámara.';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          mensaje = 'Permiso de cámara denegado. Permite el acceso en tu navegador.';
        } else if (err.name === 'NotFoundError') {
          mensaje = 'No se encontró ninguna cámara en este dispositivo.';
        } else if (err.name === 'NotReadableError') {
          mensaje = 'La cámara está siendo usada por otra aplicación.';
        }
      }

      setError(mensaje);
      setEscaneandoQR(false);
    }
  };

  const detenerCamara = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    setEscaneandoQR(false);
  };

  const iniciarEscaneoQR = () => {
    scanIntervalRef.current = setInterval(() => {
      escanearFrame();
    }, 500);
  };

  const escanearFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    try {
      // @ts-expect-error - jsQR se carga desde CDN global
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code && code.data) {
        detenerCamara();
        procesarQR(code.data);
      }
    } catch {
      // Sin QR en este frame
    }
  };

  const procesarQR = async (qrData: string) => {
    try {
      setCanjeando(true);
      setError(null);

      // Parsear JWT del QR (formato: header.payload.signature)
      const parts = qrData.split('.');
      if (parts.length !== 3) {
        throw new Error('QR inválido');
      }

      // Decodificar payload (Base64URL → JSON)
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));

      // Validar estructura
      if (!payload.voucherId || !payload.usuarioId || !payload.exp) {
        throw new Error('QR inválido - Datos faltantes');
      }

      // Validar expiración
      const ahora = Date.now();
      if (payload.exp < ahora) {
        throw new Error('El QR ha expirado. Genera uno nuevo en CardYA.');
      }

      // Validar cliente
      if (payload.usuarioId !== clienteId) {
        throw new Error('Este voucher pertenece a otro cliente');
      }

      // Validar voucher
      if (payload.voucherId !== voucherId) {
        throw new Error('Este QR no corresponde al voucher seleccionado');
      }

      // Canjear
      const respuesta = await scanyaService.canjearVoucher({
        voucherId: payload.voucherId,
        usuarioId: payload.usuarioId,
      });

      if (respuesta.success) {
        setExito(true);

        notificar.exito('¡Voucher Canjeado!', 'Entrega la recompensa al cliente');

        onVoucherCanjeado();
        onClose();
      } else {
        setError(respuesta.message || 'Error al canjear voucher');
        setTimeout(() => iniciarCamara(), 2000);
      }
    } catch (error: unknown) {
      console.error('Error procesando QR:', error);

      const mensaje = error instanceof Error
        ? error.message
        : 'QR inválido o expirado';

      setError(mensaje);
      setCanjeando(false);
      setTimeout(() => iniciarCamara(), 2000);
    }
  };

  const handleSeleccionarMetodo = (nuevoMetodo: 'qr' | 'codigo') => {
    setMetodo(nuevoMetodo);
    setError(null);

    if (nuevoMetodo === 'qr') {
      iniciarCamara();
    }
  };

  const handleVolverMetodos = () => {
    detenerCamara();
    setMetodo(null);
    setCodigo(['', '', '', '', '', '']);
    setError(null);
    setCamaraDisponible(null);
  };

  // ---------------------------------------------------------------------------
  // Si no hay datos, no renderizar
  // ---------------------------------------------------------------------------
  if (!voucherId || !clienteId) return null;
  if (!abierto) return null;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={!canjeando && !exito && !escaneandoQR ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className="
          fixed z-50
          top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-[90%] max-w-md
          rounded-2xl
          overflow-hidden
        "
        style={{
          background: 'linear-gradient(180deg, #0A0A0A 0%, #001020 100%)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-white/10"
          style={{ background: 'rgba(0, 0, 0, 0.3)' }}
        >
          {metodo && !exito && (
            <button
              onClick={handleVolverMetodos}
              disabled={canjeando}
              className="p-2 rounded-lg hover:bg-white/10 -ml-2 disabled:opacity-50"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}

          <div className="flex items-center gap-2 flex-1">
            <Gift className="w-5 h-5 text-white" />
            <h2 className="text-white font-semibold">Canjear Voucher</h2>
          </div>

          <button
            onClick={() => {
              detenerCamara();
              onClose();
            }}
            disabled={canjeando}
            className="p-2 rounded-lg hover:bg-white/10 -mr-2 disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4">
          {/* Estado: Éxito */}
          {exito ? (
            <div className="py-6 text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(16, 185, 129, 0.2)' }}
              >
                <CheckCircle className="w-10 h-10 text-[#10B981]" />
              </div>
              <p className="text-lg font-bold text-white mb-1">¡Voucher Canjeado!</p>
              <p className="text-[#94A3B8] text-sm">Entrega la recompensa al cliente</p>
            </div>
          ) : !metodo ? (
            // Pantalla 1: Seleccionar Método
            <>
              <div
                className="p-3 rounded-lg mb-4"
                style={{ background: 'rgba(139, 92, 246, 0.1)' }}
              >
                <p className="font-medium text-white mb-1">{recompensaNombre}</p>
                <p className="text-sm text-[#94A3B8]">Cliente: {clienteNombre}</p>
              </div>

              <p className="text-sm text-[#94A3B8] mb-4 text-center">
                Selecciona el método de validación:
              </p>

              <div className="space-y-3">
                {/* Opción QR */}
                <button
                  onClick={() => handleSeleccionarMetodo('qr')}
                  className="
                    w-full p-4 rounded-xl
                    flex items-center gap-3
                    border-2 border-white/10
                    hover:border-[#3B82F6]/50 hover:bg-white/5
                    transition-all
                  "
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(59, 130, 246, 0.15)' }}
                  >
                    <QrCode className="w-6 h-6 text-[#3B82F6]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">Escanear QR</p>
                    <p className="text-sm text-[#94A3B8]">Cliente muestra su código QR</p>
                  </div>
                </button>

                {/* Opción Código */}
                <button
                  onClick={() => handleSeleccionarMetodo('codigo')}
                  className="
                    w-full p-4 rounded-xl
                    flex items-center gap-3
                    border-2 border-white/10
                    hover:border-[#8B5CF6]/50 hover:bg-white/5
                    transition-all
                  "
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(139, 92, 246, 0.15)' }}
                  >
                    <Hash className="w-6 h-6 text-[#8B5CF6]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-white">Código Manual</p>
                    <p className="text-sm text-[#94A3B8]">Cliente dicta su código de 6 dígitos</p>
                  </div>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2 mt-4 text-[#94A3B8] text-sm hover:text-white"
              >
                Cancelar
              </button>
            </>
          ) : metodo === 'qr' ? (
            // Pantalla 2A: Escanear QR (FUNCIONAL)
            <>
              <div
                className="p-3 rounded-lg mb-4"
                style={{ background: 'rgba(139, 92, 246, 0.1)' }}
              >
                <p className="font-medium text-white mb-1">{recompensaNombre}</p>
                <p className="text-sm text-[#94A3B8]">Cliente: {clienteNombre}</p>
              </div>

              <div className="mb-4">
                {!escaneandoQR && camaraDisponible === null ? (
                  // Iniciando cámara
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-[#3B82F6] animate-spin mx-auto mb-2" />
                    <p className="text-[#94A3B8] text-sm">Iniciando cámara...</p>
                  </div>
                ) : camaraDisponible === false ? (
                  // Error de cámara
                  <div className="text-center py-8">
                    <div
                      className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <CameraOff className="w-8 h-8 text-[#EF4444]" />
                    </div>
                    <p className="text-white font-medium mb-2">Cámara no disponible</p>
                    <p className="text-[#94A3B8] text-sm mb-4 px-4">{error}</p>
                    <button
                      onClick={iniciarCamara}
                      className="px-4 py-2 rounded-lg text-white"
                      style={{ background: 'rgba(59, 130, 246, 0.2)' }}
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  // Visor activo
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full rounded-lg"
                      style={{ maxHeight: '300px', objectFit: 'cover' }}
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {!canjeando && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-4 border-[#3B82F6] rounded-lg animate-pulse" />
                      </div>
                    )}

                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <p
                        className="text-white text-sm font-medium px-4 py-2 rounded-lg mx-auto inline-block"
                        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                      >
                        {canjeando ? 'Procesando...' : 'Escanea el QR del cliente'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && camaraDisponible !== false && (
                <div className="flex items-center justify-center gap-2 text-[#EF4444] text-sm mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleVolverMetodos}
                disabled={canjeando}
                className="
                  w-full py-2 text-[#94A3B8] text-sm
                  hover:text-white
                  disabled:cursor-not-allowed disabled:opacity-50
                "
              >
                Cambiar Método
              </button>
            </>
          ) : (
            // Pantalla 2B: Código Manual
            <>
              <div
                className="p-3 rounded-lg mb-4"
                style={{ background: 'rgba(139, 92, 246, 0.1)' }}
              >
                <p className="font-medium text-white mb-1">{recompensaNombre}</p>
                <p className="text-sm text-[#94A3B8]">Cliente: {clienteNombre}</p>
              </div>

              <div className="text-center mb-4">
                <p className="text-sm text-[#94A3B8] mb-1">
                  Pide al cliente que dicte su código
                </p>
                <p className="text-xs text-[#64748B]">
                  6 caracteres (letras y números)
                </p>
              </div>

              <div className="flex justify-center gap-2 mb-4">
                {codigo.map((digito, index) => (
                  <input
                    key={index}
                    ref={(el) => { if (el) inputRefs.current[index] = el; }}
                    type="text"
                    maxLength={1}
                    value={digito}
                    onChange={(e) => handleDigitoChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={canjeando}
                    className={`
                      w-11 h-14 text-center text-2xl font-bold uppercase
                      rounded-lg border-2 outline-none
                      transition-colors
                      ${error
                        ? 'border-[#EF4444] bg-[#EF4444]/10'
                        : 'border-white/20 focus:border-[#8B5CF6] bg-white/5'
                      }
                      text-white
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-[#EF4444] text-sm mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={handleCanjear}
                  disabled={canjeando || codigo.some(d => !d)}
                  className={`
                    w-full py-3 rounded-xl font-medium
                    flex items-center justify-center gap-2
                    transition-all
                    ${codigo.every(d => d)
                      ? 'text-white'
                      : 'text-[#64748B]'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  style={{
                    background: codigo.every(d => d)
                      ? 'linear-gradient(135deg, #10B981, #059669)'
                      : 'rgba(100, 116, 139, 0.2)',
                  }}
                >
                  {canjeando ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Canjeando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Canjear Voucher
                    </>
                  )}
                </button>

                <button
                  onClick={handleVolverMetodos}
                  disabled={canjeando}
                  className="
                    w-full py-2 text-[#94A3B8] text-sm
                    hover:text-white
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                >
                  Cambiar Método
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default ModalCanjearVoucher;