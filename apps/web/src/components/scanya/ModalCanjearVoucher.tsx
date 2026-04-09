/**
 * ModalCanjearVoucher.tsx
 * ========================
 * Modal para canjear un voucher. Tema dark, consistente con ScanYA.
 * - Móvil: ModalBottom (85vh), slide-up
 * - PC: Drawer lateral derecho
 *
 * Métodos de canje:
 * 1. QR: Escanear QR del cliente (token JWT temporal 5 min)
 * 2. Código: Ingresar código manual de 6 dígitos
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
  onCerrarTodo?: () => void;
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
  onCerrarTodo,
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

  useEffect(() => {
    if (metodo === 'codigo') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [metodo]);

  useEffect(() => {
    return () => { detenerCamara(); };
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
    if (caracteres && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const texto = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (texto.length === 6) { setCodigo(texto.split('')); inputRefs.current[5]?.focus(); }
  };

  const handleCanjear = async () => {
    if (!voucherId || !clienteId) return;
    const codigoCompleto = codigo.join('');
    if (codigoCompleto.length !== 6) { setError('Ingresa los 6 caracteres del código'); return; }

    setCanjeando(true);
    setError(null);
    try {
      const respuesta = await scanyaService.canjearVoucher({ voucherId, usuarioId: clienteId, codigo: codigoCompleto });
      if (respuesta.success) {
        setExito(true);
        notificar.exito('¡Voucher Canjeado!', 'Entrega la recompensa al cliente');
        onVoucherCanjeado();
      } else {
        setError(respuesta.message || 'Error al canjear voucher');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(err.response?.data?.message || 'Error de conexión. Intenta de nuevo.');
      else setError('Error de conexión. Intenta de nuevo.');
    } finally {
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      setCamaraDisponible(true);
      if (videoRef.current) { videoRef.current.srcObject = mediaStream; await videoRef.current.play(); }
      iniciarEscaneoQR();
    } catch (err: unknown) {
      setCamaraDisponible(false);
      let mensaje = 'No se pudo acceder a la cámara.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') mensaje = 'Permiso de cámara denegado. Permite el acceso en tu navegador.';
        else if (err.name === 'NotFoundError') mensaje = 'No se encontró ninguna cámara en este dispositivo.';
        else if (err.name === 'NotReadableError') mensaje = 'La cámara está siendo usada por otra aplicación.';
      }
      setError(mensaje);
      setEscaneandoQR(false);
    }
  };

  const detenerCamara = () => {
    if (stream) { stream.getTracks().forEach(track => track.stop()); setStream(null); }
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    setEscaneandoQR(false);
  };

  const iniciarEscaneoQR = () => {
    scanIntervalRef.current = setInterval(() => escanearFrame(), 500);
  };

  const escanearFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    try {
      // @ts-expect-error - jsQR se carga desde CDN global
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) { detenerCamara(); procesarQR(code.data); }
    } catch { /* Sin QR en este frame */ }
  };

  const procesarQR = async (qrData: string) => {
    try {
      setCanjeando(true);
      setError(null);
      const parts = qrData.split('.');
      if (parts.length !== 3) throw new Error('QR inválido');
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      if (!payload.voucherId || !payload.usuarioId || !payload.exp) throw new Error('QR inválido - Datos faltantes');
      if (payload.exp < Date.now()) throw new Error('El QR ha expirado. Genera uno nuevo en CardYA.');
      if (payload.usuarioId !== clienteId) throw new Error('Este voucher pertenece a otro cliente');
      if (payload.voucherId !== voucherId) throw new Error('Este QR no corresponde al voucher seleccionado');

      const respuesta = await scanyaService.canjearVoucher({ voucherId: payload.voucherId, usuarioId: payload.usuarioId });
      if (respuesta.success) {
        setExito(true);
        notificar.exito('¡Voucher Canjeado!', 'Entrega la recompensa al cliente');
        onVoucherCanjeado();
      } else {
        setError(respuesta.message || 'Error al canjear voucher');
        setTimeout(() => iniciarCamara(), 2000);
      }
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'QR inválido o expirado';
      setError(mensaje);
      setCanjeando(false);
      setTimeout(() => iniciarCamara(), 2000);
    }
  };

  const handleSeleccionarMetodo = (nuevoMetodo: 'qr' | 'codigo') => {
    setMetodo(nuevoMetodo);
    setError(null);
    if (nuevoMetodo === 'qr') iniciarCamara();
  };

  const handleVolverMetodos = () => {
    detenerCamara();
    setMetodo(null);
    setCodigo(['', '', '', '', '', '']);
    setError(null);
    setCamaraDisponible(null);
  };

  const handleCerrar = () => {
    detenerCamara();
    if (onCerrarTodo) {
      onCerrarTodo();
    } else {
      onClose();
    }
  };

  const handleVolver = () => {
    if (exito) { handleCerrar(); return; }
    detenerCamara();
    history.back();
  };

  // History back — ModalCanjearVoucher se abre ENCIMA de ModalVouchers
  // Solo maneja navegación interna (selección de método)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const metodoRef = useRef(metodo);
  metodoRef.current = metodo;

  const nivelCanjearRef = useRef(0);

  useEffect(() => {
    if (!abierto) {
      nivelCanjearRef.current = 0;
      return;
    }

    history.pushState({ modal: 'canjear-voucher' }, '');
    nivelCanjearRef.current = 1;

    const handlePopState = () => {
      if (metodoRef.current) {
        nivelCanjearRef.current = 1;
        setMetodo(null);
        setError(null);
        setCodigo(['', '', '', '', '', '']);
        detenerCamara();
      } else {
        nivelCanjearRef.current = 0;
        onCloseRef.current();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      const niveles = nivelCanjearRef.current;
      nivelCanjearRef.current = 0;
      if (niveles > 0) history.go(-niveles);
    };
  }, [abierto]);

  // Push extra al seleccionar método
  useEffect(() => {
    if (!metodo || !abierto) return;
    history.pushState({ modal: 'canjear-metodo' }, '');
    nivelCanjearRef.current = 2;
  }, [metodo, abierto]);

  // ---------------------------------------------------------------------------
  // Guards
  // ---------------------------------------------------------------------------
  if (!voucherId || !clienteId) return null;
  if (!abierto) return null;

  // ---------------------------------------------------------------------------
  // Título dinámico del header
  // ---------------------------------------------------------------------------
  const tituloHeader = exito ? '¡Canjeado!' : metodo === 'qr' ? 'Escanear QR' : metodo === 'codigo' ? 'Código Manual' : 'Canjear Voucher';

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Overlay — solo móvil */}
      <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={!canjeando && !exito && !escaneandoQR ? handleCerrar : undefined} />

      {/* Contenedor: ModalBottom en móvil, Drawer en PC */}
      <div
        className="fixed z-50 inset-x-0 bottom-0 h-full lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[350px] 2xl:w-[450px] flex flex-col rounded-none overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #001020 100%)', boxShadow: '-4px 0 30px rgba(0,0,0,0.5)' }}
      >
        {/* Header */}
        <header className="flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 border-b border-white/10 shrink-0">
          <button
            onClick={handleVolver}
            disabled={canjeando}
            className="p-1.5 lg:p-1 2xl:p-1.5 rounded-lg hover:bg-white/10 cursor-pointer disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            <h2 className="text-lg lg:text-sm 2xl:text-base font-bold text-white">{tituloHeader}</h2>
          </div>
          <button
            onClick={handleCerrar}
            disabled={canjeando}
            className="p-1.5 lg:p-1 2xl:p-1.5 rounded-lg hover:bg-white/10 cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </button>
        </header>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4">

          {/* ── ÉXITO ── */}
          {exito ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(52,211,153,0.2)' }}>
                <CheckCircle className="w-12 h-12" style={{ color: '#34D399' }} />
              </div>
              <p className="text-xl font-bold text-white mb-1">¡Voucher Canjeado!</p>
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium mb-6" style={{ color: '#94A3B8' }}>Entrega la recompensa al cliente</p>
              <button
                onClick={handleCerrar}
                className="w-full py-3 lg:py-2.5 2xl:py-3 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-base lg:text-sm 2xl:text-base text-white cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
              >
                Volver a Vouchers
              </button>
            </div>
          ) : !metodo ? (
            // ── SELECCIONAR MÉTODO ──
            <>
              {/* Info del voucher */}
              <div className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2.5 2xl:p-3 mb-4 lg:mb-3 2xl:mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: '#F1F5F9' }}>{recompensaNombre}</p>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>Cliente: {clienteNombre}</p>
              </div>

              <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-center mb-4 lg:mb-3 2xl:mb-4" style={{ color: '#94A3B8' }}>
                Selecciona el método de validación:
              </p>

              <div className="space-y-3 lg:space-y-2 2xl:space-y-3">
                {/* Opción QR */}
                <button
                  onClick={() => handleSeleccionarMetodo('qr')}
                  className="w-full p-4 lg:p-3 2xl:p-4 rounded-xl lg:rounded-lg 2xl:rounded-xl flex items-center gap-3 lg:gap-2.5 2xl:gap-3 cursor-pointer hover:bg-white/4"
                  style={{ border: '2px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(96,165,250,0.15)' }}>
                    <QrCode className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" style={{ color: '#60A5FA' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: '#F1F5F9' }}>Escanear QR</p>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>Cliente muestra su código QR</p>
                  </div>
                </button>

                {/* Opción Código */}
                <button
                  onClick={() => handleSeleccionarMetodo('codigo')}
                  className="w-full p-4 lg:p-3 2xl:p-4 rounded-xl lg:rounded-lg 2xl:rounded-xl flex items-center gap-3 lg:gap-2.5 2xl:gap-3 cursor-pointer hover:bg-white/4"
                  style={{ border: '2px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(96,165,250,0.15)' }}>
                    <Hash className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6" style={{ color: '#60A5FA' }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: '#F1F5F9' }}>Código Manual</p>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>Cliente dicta su código de 6 dígitos</p>
                  </div>
                </button>
              </div>
            </>
          ) : metodo === 'qr' ? (
            // ── ESCANEAR QR ──
            <>
              <div className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2.5 2xl:p-3 mb-4 lg:mb-3 2xl:mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: '#F1F5F9' }}>{recompensaNombre}</p>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>Cliente: {clienteNombre}</p>
              </div>

              <div className="mb-4 lg:mb-3 2xl:mb-4">
                {!escaneandoQR && camaraDisponible === null ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: '#60A5FA' }} />
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>Iniciando cámara...</p>
                  </div>
                ) : camaraDisponible === false ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.2)' }}>
                      <CameraOff className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-base font-bold text-white mb-2">Cámara no disponible</p>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium px-4 mb-4" style={{ color: '#94A3B8' }}>{error}</p>
                    <button onClick={iniciarCamara} className="px-4 py-2 rounded-lg text-white font-semibold cursor-pointer" style={{ background: 'rgba(96,165,250,0.2)' }}>
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <video ref={videoRef} className="w-full rounded-xl lg:rounded-lg 2xl:rounded-xl" style={{ maxHeight: '300px', objectFit: 'cover' }} playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    {!canjeando && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-4 rounded-lg animate-pulse" style={{ borderColor: '#60A5FA' }} />
                      </div>
                    )}
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                      <p className="text-white text-sm font-semibold px-4 py-2 rounded-lg mx-auto inline-block" style={{ background: 'rgba(0,0,0,0.7)' }}>
                        {canjeando ? 'Procesando...' : 'Escanea el QR del cliente'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {error && camaraDisponible !== false && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm lg:text-[11px] 2xl:text-sm font-medium mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            // ── CÓDIGO MANUAL ──
            <>
              <div className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2.5 2xl:p-3 mb-4 lg:mb-3 2xl:mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: '#F1F5F9' }}>{recompensaNombre}</p>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>Cliente: {clienteNombre}</p>
              </div>

              <div className="text-center mb-4 lg:mb-3 2xl:mb-4">
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium mb-1" style={{ color: '#94A3B8' }}>Pide al cliente que dicte su código</p>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#64748B' }}>6 caracteres (letras y números)</p>
              </div>

              <div className="flex justify-center gap-2 lg:gap-1.5 2xl:gap-2 mb-4 lg:mb-3 2xl:mb-4">
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
                    className={`w-11 h-14 lg:w-10 lg:h-12 2xl:w-11 2xl:h-14 text-center text-2xl lg:text-xl 2xl:text-2xl font-bold uppercase rounded-lg border-2 outline-none text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                      error ? 'border-red-400 bg-red-400/10' : 'border-white/20 focus:border-slate-400 bg-white/5'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm lg:text-[11px] 2xl:text-sm font-medium mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleCanjear}
                disabled={canjeando || codigo.some(d => !d)}
                className="w-full py-3 lg:py-2.5 2xl:py-3 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-base lg:text-sm 2xl:text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-white"
                style={{ background: codigo.every(d => d) ? 'linear-gradient(135deg, #1e293b, #334155)' : 'rgba(100,116,139,0.2)' }}
              >
                {canjeando ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Canjeando...</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Canjear Voucher</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default ModalCanjearVoucher;
