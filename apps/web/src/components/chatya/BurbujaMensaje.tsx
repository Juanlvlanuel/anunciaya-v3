/**
 * BurbujaMensaje.tsx
 * ===================
 * Burbuja individual de un mensaje en el chat.
 *
 * - Propias: gradiente azul vibrante (lado derecho)
 * - Del otro: fondo blanco con borde (lado izquierdo)
 * - Hora + palomitas de estado (enviado/entregado/leído)
 * - Indicador "editado" sutil
 * - Mensajes eliminados: texto gris itálico
 * - Tag de negocio si el emisor es un negocio
 *
 * UBICACIÓN: apps/web/src/components/chatya/BurbujaMensaje.tsx
 */

import { memo, useRef, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCheck, Store, SmilePlus, AlertCircle, ChevronDown, Image as ImageIcon, FileText, Download, Forward } from 'lucide-react';
import type { Mensaje, ContenidoImagen } from '../../types/chatya';
import { SelectorEmojis } from './SelectorEmojis';
import { EmojiNoto } from './EmojiNoto';
import { TextoConEmojis } from './TextoConEmojis';
import { analizarEmojis, tamañoEmojiSolo } from './emojiUtils';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Tiempo en ms para considerar long press en móvil */
const LONG_PRESS_MS = 300;

/** Emojis rápidos para reaccionar */
const EMOJIS_RAPIDOS = ['👍', '❤️', '😂', '😮', '😢'];

// =============================================================================
// TIPOS
// =============================================================================

interface BurbujaMensajeProps {
  mensaje: Mensaje;
  esMio: boolean;
  esMisNotas?: boolean;
  /** true cuando este mensaje coincide con la búsqueda activa (highlight amarillo) */
  resaltado?: boolean;
  /** Callback cuando se activa el menú contextual (long press / click derecho) */
  onMenuContextual?: (mensaje: Mensaje, posicion: { x: number; y: number }) => void;
  /** Callback para reaccionar con emoji (desde hover en desktop) */
  onReaccionar?: (mensajeId: string, emoji: string) => void;
  /** ID del mensaje que tiene el menú contextual abierto (para emojis flotantes en móvil) */
  menuActivoId?: string | null;
  /** ID del usuario actual (para resaltar mis reacciones) */
  miId?: string;
  /** Callback al hacer click en imagen para abrir visor fullscreen */
  onImagenClick?: (mensajeId: string) => void;
  /** Callback al hacer click en botón reenviar (imagen/documento) */
  onReenviar?: (mensaje: Mensaje) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/** Formateador reutilizable — se crea UNA sola vez en memoria */
const formateadorHora = new Intl.DateTimeFormat('es-MX', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

/** Formatea hora del mensaje (ej: "10:30 AM") */
function formatearHora(fecha: string): string {
  return formateadorHora.format(new Date(fecha));
}

// =============================================================================
// HELPERS IMAGEN
// =============================================================================

/**
 * Parsea el campo `contenido` de un mensaje tipo 'imagen'.
 * El contenido es un JSON string con: url, ancho, alto, miniatura, caption.
 */
function parsearContenidoImagen(contenidoRaw: string): ContenidoImagen | null {
  try {
    const datos = JSON.parse(contenidoRaw);
    if (datos && datos.url && datos.ancho && datos.alto) {
      return datos as ContenidoImagen;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Componente interno para renderizar imagen con pipeline zero-flicker.
 *
 * TÉCNICA (3 pilares):
 * 1. Contenedor con aspect ratio fijo desde el inicio → sin layout shift
 * 2. Micro-thumbnail LQIP base64 con blur → placeholder instantáneo
 * 3. Imagen real precargada, se muestra con opacity → sin parpadeo
 */
function ImagenBurbuja({
  contenidoRaw,
  esMio,
  onClick,
}: {
  contenidoRaw: string;
  esMio: boolean;
  onClick?: () => void;
}) {
  const datos = parsearContenidoImagen(contenidoRaw);
  const [cargada, setCargada] = useState(false);

  if (!datos) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-60 py-2">
        <ImageIcon className="w-4 h-4" />
        <span>Imagen no disponible</span>
      </div>
    );
  }

  // Calcular dimensiones del contenedor (max 280px ancho en móvil, 320px en desktop)
  const maxAncho = 280;
  const ratio = Math.min(maxAncho / datos.ancho, 1);
  const anchoFinal = Math.round(datos.ancho * ratio);
  const altoFinal = Math.round(datos.alto * ratio);

  return (
    <div
      className="relative overflow-hidden rounded-lg cursor-pointer"
      style={{ width: anchoFinal, height: altoFinal }}
      onClick={onClick}
    >
      {/* Capa 1: LQIP micro-thumbnail con blur (instantáneo, ~400 bytes en base64) */}
      {datos.miniatura && (
        <img
          src={datos.miniatura}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
          draggable={false}
        />
      )}

      {/* Capa 2: Imagen real — opacity 0 hasta que carga, luego 1 sin transición */}
      <img
        src={datos.url}
        alt={datos.caption || 'Imagen'}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: cargada ? 1 : 0 }}
        onLoad={() => setCargada(true)}
        draggable={false}
      />

      {/* Spinner sutil mientras carga (solo si tarda) */}
      {!cargada && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-6 h-6 border-2 rounded-full animate-spin ${esMio ? 'border-white/30 border-t-white/80' : 'border-gray-300 border-t-gray-600'}`} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DOCUMENTO: Parser + Burbuja (Sprint 6)
// =============================================================================

/** Estructura del JSON que viene en mensaje.contenido para tipo 'documento' */
interface ContenidoDocumento {
  url: string;
  nombre: string;
  tamano: number;
  tipoArchivo: string;
  extension: string;
}

/**
 * Parsea el campo `contenido` de un mensaje tipo 'documento'.
 * El contenido es un JSON string con: url, nombre, tamano, tipoArchivo, extension.
 */
function parsearContenidoDocumento(contenidoRaw: string): ContenidoDocumento | null {
  try {
    const datos = JSON.parse(contenidoRaw);
    if (datos && datos.url && datos.nombre) {
      return datos as ContenidoDocumento;
    }
    return null;
  } catch {
    return null;
  }
}

/** Formatea bytes a string legible (ej: "2.4 MB", "340 KB") */
function formatearTamanoDoc(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Color de fondo e ícono según extensión del documento */
function colorDocumento(ext: string): { bg: string; texto: string } {
  switch (ext) {
    case 'pdf': return { bg: 'bg-red-100', texto: 'text-red-600' };
    case 'doc': case 'docx': return { bg: 'bg-blue-100', texto: 'text-blue-600' };
    case 'xls': case 'xlsx': case 'csv': return { bg: 'bg-green-100', texto: 'text-green-600' };
    case 'ppt': case 'pptx': return { bg: 'bg-orange-100', texto: 'text-orange-600' };
    default: return { bg: 'bg-gray-100', texto: 'text-gray-600' };
  }
}

/**
 * Componente interno para renderizar documento adjunto.
 * Muestra: icono según extensión, nombre, tamaño, botón de descarga.
 */
function DocumentoBurbuja({
  contenidoRaw,
  esMio,
}: {
  contenidoRaw: string;
  esMio: boolean;
}) {
  const datos = parsearContenidoDocumento(contenidoRaw);

  if (!datos) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-60 py-2">
        <FileText className="w-4 h-4" />
        <span>Documento no disponible</span>
      </div>
    );
  }

  const color = colorDocumento(datos.extension);

  /** Descargar: fetch blob → enlace temporal (evita abrir en pestaña nueva) */
  const handleDescargar = async () => {
    try {
      const respuesta = await fetch(datos.url);
      const blob = await respuesta.blob();
      const urlBlob = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = urlBlob;
      enlace.download = datos.nombre;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(urlBlob);
    } catch {
      // Fallback: abrir en pestaña nueva
      window.open(datos.url, '_blank');
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer min-w-[200px] max-w-[280px] ${
        esMio ? 'bg-white/10 hover:bg-white/15' : 'bg-gray-50 hover:bg-gray-100'
      }`}
      onClick={handleDescargar}
    >
      {/* Icono según extensión */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color.bg} ${color.texto}`}>
        <FileText className="w-5 h-5" />
      </div>

      {/* Nombre + tamaño */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${esMio ? 'text-white' : 'text-gray-800'}`}>
          {datos.nombre}
        </p>
        <p className={`text-xs ${esMio ? 'text-white/60' : 'text-gray-500'}`}>
          {formatearTamanoDoc(datos.tamano)} · {datos.extension.toUpperCase()}
        </p>
      </div>

      {/* Icono descarga */}
      <Download className={`w-4 h-4 shrink-0 ${esMio ? 'text-white/60' : 'text-gray-400'}`} />
    </div>
  );
}

// =============================================================================
// COMPONENTE
// =============================================================================

export const BurbujaMensaje = memo(function BurbujaMensaje({ mensaje, esMio, esMisNotas = false, resaltado = false, onMenuContextual, onReaccionar, menuActivoId, miId, onImagenClick, onReenviar }: BurbujaMensajeProps) {
  const hora = formatearHora(mensaje.createdAt);
  const esNegocio = !esMisNotas && !!mensaje.emisorSucursalId;
  const esFallido = mensaje.estado === 'fallido';

  // Detectar si el mensaje es solo emojis (para renderizar sin burbuja)
  const infoEmoji = !mensaje.eliminado ? analizarEmojis(mensaje.contenido) : { soloEmojis: false, cantidad: 0 };
  const esSoloEmojis = infoEmoji.soloEmojis && !mensaje.respuestaA;

  /** Emoji con el que ya reaccioné a este mensaje (si existe) */
  const miReaccionActual = mensaje.reacciones?.find((r) =>
    (r.usuarios as string[])?.includes(miId || '')
  )?.emoji;

  /** Picker de emojis abierto (hover en desktop) */
  const [emojiPickerAbierto, setEmojiPickerAbierto] = useState(false);
  /** Animación de salida en curso */
  const [emojiPickerSaliendo, setEmojiPickerSaliendo] = useState(false);
  /** Ref del botón SmilePlus para calcular posición del portal */
  const smileBtnRef = useRef<HTMLButtonElement>(null);
  /** Posición calculada del popup (portal) */
  const [popupPos, setPopupPos] = useState<{ x: number; y: number; abajo?: boolean } | null>(null);
  /** Picker completo de emojis (botón +) */
  const [pickerCompletoAbierto, setPickerCompletoAbierto] = useState(false);
  const [pickerCompletoSaliendo, setPickerCompletoSaliendo] = useState(false);
  const [pickerCompletoPos, setPickerCompletoPos] = useState<{ x: number; y: number } | null>(null);
  /** Dirección del picker completo: arriba o abajo según espacio */
  const [pickerDireccion, setPickerDireccion] = useState<'arriba' | 'abajo'>('arriba');
  const emojiCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickPickerRef = useRef<HTMLDivElement>(null);

  /** Cierra el picker rápido con animación funnel */
  const cerrarEmojiPicker = useCallback(() => {
    if (!emojiPickerAbierto || emojiPickerSaliendo) return;
    setEmojiPickerSaliendo(true);
    setTimeout(() => {
      setEmojiPickerAbierto(false);
      setEmojiPickerSaliendo(false);
    }, 100);
  }, [emojiPickerAbierto, emojiPickerSaliendo]);

  // Click fuera del quick picker para cerrar
  useEffect(() => {
    if (!emojiPickerAbierto) return;
    const handler = (e: MouseEvent) => {
      if (quickPickerRef.current && !quickPickerRef.current.contains(e.target as Node)) {
        cerrarEmojiPicker();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [emojiPickerAbierto, cerrarEmojiPicker]);

  /** Cierra el picker completo con animación funnel */
  const cerrarPickerCompleto = useCallback(() => {
    if (!pickerCompletoAbierto || pickerCompletoSaliendo) return;
    setPickerCompletoSaliendo(true);
    setTimeout(() => {
      setPickerCompletoAbierto(false);
      setPickerCompletoSaliendo(false);
    }, 100);
  }, [pickerCompletoAbierto, pickerCompletoSaliendo]);

  /** Calcula si el picker debe abrir arriba o abajo según espacio disponible */
  const calcularDireccionPicker = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const espacioArriba = rect.top;
    setPickerDireccion(espacioArriba < 420 ? 'abajo' : 'arriba');
  };

  // ---------------------------------------------------------------------------
  // Long press (móvil) y click derecho (desktop)
  // ---------------------------------------------------------------------------
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);
  /** Evita doble disparo: si el long press ya abrió el menú, el contextmenu nativo no debe volver a disparar */
  const longPressFiredRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!onMenuContextual) return;
    touchMovedRef.current = false;
    longPressFiredRef.current = false;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      // Vibración háptica si está disponible
      if (navigator.vibrate) navigator.vibrate(80);
      onMenuContextual(mensaje, { x: touchX, y: touchY });
    }, LONG_PRESS_MS);
  }, [mensaje, onMenuContextual]);

  const handleTouchMove = useCallback(() => {
    touchMovedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!onMenuContextual) return;
    e.preventDefault();
    // Si el long press ya disparó, no volver a llamar (evita toggle que cierra)
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    onMenuContextual(mensaje, { x: e.clientX, y: e.clientY });
  }, [mensaje, onMenuContextual]);

  // Mensaje eliminado — no renderizar nada
  if (mensaje.eliminado) {
    return null;
  }

  return (
    <div
      className={`group flex select-none lg:select-auto ${esMio ? 'justify-end' : 'justify-start'}`}
      onMouseLeave={() => {
        if (emojiPickerAbierto && !emojiPickerSaliendo) {
          emojiCloseTimerRef.current = setTimeout(() => cerrarEmojiPicker(), 400);
        }
      }}
      onMouseEnter={() => {
        if (emojiCloseTimerRef.current) {
          clearTimeout(emojiCloseTimerRef.current);
          emojiCloseTimerRef.current = null;
        }
      }}
    >
      <div className={`relative max-w-[84%] select-none lg:select-text`}>
        {/* Wrapper relativo solo para burbuja + botón emoji (centrado ignora reacciones) */}
        <div className="relative">
          {/* Botón reenviar siempre visible (solo multimedia, desktop, no Mis Notas) */}
          {!mensaje.eliminado && !esMisNotas && onReenviar && (mensaje.tipo === 'imagen' || mensaje.tipo === 'documento') && (
            <div className={`absolute top-1/2 -translate-y-1/2 z-10 flex ${esMio ? '-left-9' : '-right-9'}`}>
              <button
                onClick={(e) => { e.stopPropagation(); onReenviar(mensaje); }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                <Forward className="w-[18px] h-[18px]" />
              </button>
            </div>
          )}

          {/* Botón emoji hover (solo desktop, no eliminados, no Mis Notas) */}
          {!mensaje.eliminado && !esMisNotas && onReaccionar && (() => {
            const tieneReenviarVisible = (mensaje.tipo === 'imagen' || mensaje.tipo === 'documento') && !!onReenviar;
            // Si hay botón reenviar visible, el emoji se posiciona más afuera
            const offset = esMio
              ? (tieneReenviarVisible ? '-left-[68px]' : '-left-9')
              : (tieneReenviarVisible ? '-right-[68px]' : '-right-9');

            return (
              <div className={`absolute top-1/2 -translate-y-1/2 z-10 ${emojiPickerAbierto || pickerCompletoAbierto || pickerCompletoSaliendo ? 'flex' : 'hidden lg:group-hover:flex'} ${offset}`}>
                <div className="relative">
                  <button
                    ref={smileBtnRef}
                    onClick={() => {
                      if (emojiPickerAbierto) {
                        cerrarEmojiPicker();
                      } else {
                        const rect = smileBtnRef.current?.getBoundingClientRect();
                        if (rect) {
                          const scrollContainer = smileBtnRef.current?.closest('[data-scroll-container]') as HTMLElement | null;
                          const containerTop = scrollContainer?.getBoundingClientRect().top ?? 0;
                          const espacioArriba = rect.top - containerTop;
                          const abajo = espacioArriba < 60;
                          setPopupPos({
                            x: rect.left + rect.width / 2,
                            y: abajo ? rect.bottom : rect.top,
                            abajo,
                          });
                        }
                        setEmojiPickerAbierto(true);
                      }
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    <SmilePlus className="w-[18px] h-[18px]" />
                  </button>

                  {/* Picker completo ahora es portal — ver abajo */}
                </div>
              </div>
            );
          })()}

          {/* Portal: Picker completo de emojis (botón +) — centrado en SmilePlus */}
          {(pickerCompletoAbierto || pickerCompletoSaliendo) && onReaccionar && pickerCompletoPos && createPortal(
            <div
              className="fixed z-9999"
              style={{
                left: pickerCompletoPos.x,
                top: pickerCompletoPos.y,
                transform: pickerDireccion === 'abajo'
                  ? `translate(${esMio ? '-105%' : '15px'}, -12px) `
                  : `translate(${esMio ? '-105%' : '15px'}, -100%) translateY(10px)`,
              }}
            >
              <div
                className={`picker-portal-centrado ${pickerCompletoSaliendo ? 'emoji-popup-out' : 'emoji-popup-in-suave'}`}
                style={{ transformOrigin: `${pickerDireccion === 'abajo' ? 'top' : 'bottom'} ${esMio ? 'right' : 'left'}` }}
              >
                <SelectorEmojis
                  onSeleccionar={(emoji) => {
                    onReaccionar(mensaje.id, emoji);
                    setPickerCompletoAbierto(false);
                    setPickerCompletoSaliendo(false);
                  }}
                  onCerrar={cerrarPickerCompleto}
                  posicion={(esMio ? `${pickerDireccion}-der` : `${pickerDireccion}-izq`) as 'arriba-der' | 'arriba-izq' | 'abajo-der' | 'abajo-izq'}
                />
              </div>
            </div>,
            document.body
          )}

          {/* Portal: Picker de emojis rápidos (desktop) — centrado sobre SmilePlus */}
          {emojiPickerAbierto && onReaccionar && popupPos && createPortal(
            <div
              ref={quickPickerRef}
              className="fixed z-9999"
              style={{
                left: popupPos.x,
                top: popupPos.abajo ? popupPos.y + 8 : popupPos.y - 8,
                transform: popupPos.abajo ? 'translate(-50%, 0%)' : 'translate(-50%, -100%)',
              }}
            >
              <div
                className={`flex items-center gap-0.5 px-1.5 py-1 bg-white rounded-full shadow-[0_2px_16px_rgba(0,0,0,0.16)] border border-gray-200 ${emojiPickerSaliendo ? 'emoji-popup-out' : 'emoji-popup-in'}`}
                style={{ transformOrigin: popupPos.abajo ? 'center top' : 'center bottom' }}
              >
                {EMOJIS_RAPIDOS.map((emoji, i) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReaccionar(mensaje.id, emoji);
                      cerrarEmojiPicker();
                    }}
                    className={`w-9 h-9 flex items-center justify-center hover:scale-125 active:scale-140 cursor-pointer ${emojiPickerSaliendo ? '' : 'emoji-item-entrada'} ${miReaccionActual === emoji ? 'bg-blue-100 rounded-full ring-2 ring-blue-400' : ''}`}
                    style={!emojiPickerSaliendo ? { animationDelay: `${(EMOJIS_RAPIDOS.length - i) * 35}ms` } : undefined}
                  >
                    <EmojiNoto emoji={emoji} tamaño={26} />
                  </button>
                ))}
                <button
                  onClick={(e) => {
                    calcularDireccionPicker(e);
                    const rect = smileBtnRef.current?.getBoundingClientRect();
                    if (rect) {
                      const abreAbajo = rect.top < 420;
                      setPickerCompletoPos({
                        x: esMio ? rect.right : rect.left,
                        y: abreAbajo ? rect.bottom : rect.top,
                      });
                    }
                    setPickerCompletoAbierto(true);
                    setEmojiPickerAbierto(false);
                    setEmojiPickerSaliendo(false);
                  }}
                  className={`w-9 h-9 text-2xl flex items-center justify-center hover:scale-110 cursor-pointer text-gray-400 hover:text-gray-600 ${emojiPickerSaliendo ? '' : 'emoji-item-entrada'}`}
                  style={!emojiPickerSaliendo ? { animationDelay: '0ms' } : undefined}
                >
                  +
                </button>
              </div>
            </div>,
            document.body
          )}

          <div
            id={`msg-${mensaje.id}`}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
          ${esSoloEmojis
                ? 'relative'
                : `${mensaje.tipo === 'imagen' ? 'p-1' : 'px-2.5 py-1.5'} rounded-[14px] relative
          ${esMio
                  ? 'bg-linear-to-br from-[#3b82f6] to-[#1d4ed8] text-white rounded-br-[5px] shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
                  : 'bg-white text-gray-800 rounded-bl-[5px] shadow-[0_1px_4px_rgba(15,29,58,0.08)] border border-gray-100'
                }`
              }
          ${resaltado ? 'ring-2 ring-blue-400 animate-[resaltadoPulso_0.8s_ease-in-out_2]' : ''}
          ${menuActivoId === mensaje.id ? 'ring-2 ring-blue-400 scale-[1.02]' : ''}
          ${esFallido ? 'opacity-60' : ''}
        `}
          >
            {/* Flechita menú contextual (hover desktop) */}
            {!mensaje.eliminado && !esMisNotas && onMenuContextual && (
              <button
                data-menu-trigger="true"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  onMenuContextual(mensaje, { x: esMio ? rect.right - 192 : rect.left, y: rect.bottom + 4 });
                }}
                className={`absolute top-0.5 right-0.5 z-10 flex w-6 h-5 items-center justify-center rounded cursor-pointer opacity-0 lg:group-hover:opacity-100 ${esSoloEmojis
                  ? 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                  : esMio ? 'hover:bg-white/20 text-white/70 hover:text-white' : 'hover:bg-gray-100 text-gray-300 hover:text-gray-500'
                  }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}

            {/* Tag de negocio (solo mensajes del otro que es negocio) */}
            {!esMio && esNegocio && (
              <div className="flex items-center gap-1 mb-0.5">
                <Store className="w-3.5 lg:w-3 h-3.5 lg:h-3 text-amber-500" />
                <span className="text-xs lg:text-[10px] font-bold text-amber-500">Negocio</span>
              </div>
            )}

            {/* Quote del mensaje respondido */}
            {mensaje.respuestaA && !mensaje.eliminado && (
              <div
                className={`
            mb-1.5 px-2.5 py-1.5 rounded-lg border-l-[3px] cursor-pointer
            ${esMio
                    ? 'bg-white/15 border-l-white/60'
                    : 'bg-gray-100 border-l-blue-400'
                  }
          `}
                onClick={() => {
                  const el = document.getElementById(`msg-${mensaje.respuestaA!.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                <p className={`text-[13px] font-bold ${esMio ? 'text-white/95' : 'text-blue-500'}`}>
                  {mensaje.respuestaA.emisorId === mensaje.emisorId ? 'Tú' : 'Mensaje'}
                </p>
                <p className={`text-[14px] truncate ${esMio ? 'text-white/85' : 'text-gray-500'}`}>
                  <TextoConEmojis texto={mensaje.respuestaA.contenido} tamañoEmoji={22} />
                </p>
              </div>
            )}

            {/* Contenido de imagen (tipo === 'imagen') */}
            {mensaje.tipo === 'imagen' && !mensaje.eliminado && (
              <>
                <ImagenBurbuja
                  contenidoRaw={mensaje.contenido}
                  esMio={esMio}
                  onClick={() => onImagenClick?.(mensaje.id)}
                />
                {/* Hora flotante sobre imagen (sin caption) o debajo (con caption) */}
                {(() => {
                  const datos = parsearContenidoImagen(mensaje.contenido);
                  const tieneCaption = datos?.caption && datos.caption.trim().length > 0;
                  if (tieneCaption) {
                    return (
                      <p className="text-[15px] lg:text-[14px] leading-relaxed wrap-break-word whitespace-pre-wrap font-medium mt-1">
                        <TextoConEmojis texto={datos!.caption!} tamañoEmoji={26} />
                        <span className={`inline-flex items-center gap-0.5 align-bottom ml-1.5 translate-y-[5px] text-[10px] lg:text-[11px] ${esMio ? 'text-white/70' : 'text-gray-500'}`}>
                          {mensaje.editado && <span className="italic">editado</span>}
                          <span>{hora}</span>
                          {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                        </span>
                      </p>
                    );
                  }
                  return (
                    <div className={`absolute bottom-1.5 right-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] lg:text-[11px] ${esMio ? 'bg-black/40 text-white/90' : 'bg-black/40 text-white/90'}`}>
                      {mensaje.editado && <span className="italic">editado</span>}
                      <span>{hora}</span>
                      {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                    </div>
                  );
                })()}
              </>
            )}

            {/* Contenido de documento (tipo === 'documento') */}
            {mensaje.tipo === 'documento' && !mensaje.eliminado && (
              <>
                <DocumentoBurbuja
                  contenidoRaw={mensaje.contenido}
                  esMio={esMio}
                />
                {/* Hora debajo del documento */}
                <div className={`flex ${esMio ? 'justify-end' : 'justify-start'} mt-0.5`}>
                  <span className={`inline-flex items-center gap-0.5 text-[10px] lg:text-[11px] ${esMio ? 'text-white/70' : 'text-gray-500'}`}>
                    {mensaje.editado && <span className="italic">editado</span>}
                    <span>{hora}</span>
                    {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                  </span>
                </div>
              </>
            )}

            {/* Contenido + hora (texto normal) */}
            {mensaje.tipo !== 'imagen' && mensaje.tipo !== 'documento' && (esSoloEmojis ? (
              <>
                {/* Emojis grandes sin burbuja */}
                <p className={`leading-none ${infoEmoji.cantidad === 1 ? 'py-1' : 'py-0.5'}`}>
                  <TextoConEmojis texto={mensaje.contenido} tamañoEmoji={tamañoEmojiSolo(infoEmoji.cantidad)} />
                </p>
                {/* Hora dentro de burbuja */}
                <div className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                  <span className={`inline-flex items-center gap-0.5 text-[11px] mt-1 px-2 py-0.5 rounded-full ${esMio
                    ? 'bg-linear-to-br from-[#3b82f6] to-[#1d4ed8] text-white/70'
                    : 'bg-white text-gray-500 shadow-[0_1px_4px_rgba(15,29,58,0.08)] border border-gray-100'
                  }`}>
                    {mensaje.editado && <span className="italic">editado</span>}
                    <span>{hora}</span>
                    {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[15px] lg:text-[14px] leading-relaxed wrap-break-word whitespace-pre-wrap font-medium">
                <TextoConEmojis texto={mensaje.contenido} tamañoEmoji={26} />
                {/* Hora inline: spacer + metadata */}
                <span className={`inline-flex items-center gap-0.5 align-bottom ml-1.5 translate-y-[5px] text-[10px] lg:text-[11px] ${esMio ? 'text-white/70' : 'text-gray-500'}`}>
                  {mensaje.editado && <span className="italic">editado</span>}
                  <span>{hora}</span>
                  {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                </span>
              </p>
            ))}
          </div>
          {/* Cierre del wrapper relativo burbuja + botón emoji */}
        </div>

        {/* Indicador de mensaje fallido */}
        {esFallido && esMio && (
          <div className="flex items-center justify-end gap-1 mt-0.5 mr-1">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="text-[11px] text-red-400">No se pudo entregar este mensaje</span>
          </div>
        )}

        {/* Pills de reacciones visibles */}
        {mensaje.reacciones && mensaje.reacciones.length > 0 && (
          <div className={`flex flex-wrap gap-1 -mt-1 relative z-10 ${esMio ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
            {mensaje.reacciones.map((r) => {
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReaccionar?.(mensaje.id, r.emoji)}
                  className={`inline-flex items-center justify-center rounded-full cursor-pointer hover:scale-110 shadow-sm border ${r.cantidad > 1 ? 'gap-0.5 px-1.5 h-7' : 'w-7 h-7'} ${esMio
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <EmojiNoto emoji={r.emoji} tamaño={18} />
                  {r.cantidad > 1 && (
                    <span className="text-[11px] font-bold text-gray-500">
                      {r.cantidad}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Burbuja de emojis flotante (móvil, cuando este mensaje tiene menú activo) */}
        {menuActivoId === mensaje.id && !mensaje.eliminado && !esMisNotas && onReaccionar && (
            <div className={`absolute z-20 ${esMio ? 'right-0' : 'left-0'} -top-14`}>
              <div
                className="bg-white rounded-full shadow-[0_2px_16px_rgba(0,0,0,0.16)] border border-gray-200 flex items-center px-0.5 py-0.5 emoji-popup-in"
                style={{ transformOrigin: esMio ? 'bottom right' : 'bottom left' }}
              >
                {EMOJIS_RAPIDOS.map((emoji, i) => (
                  <button
                    key={emoji}
                    onClick={() => onReaccionar(mensaje.id, emoji)}
                    className={`w-11 h-11 flex items-center justify-center rounded-full active:scale-125 cursor-pointer emoji-item-entrada active:bg-gray-100`}
                    style={{ animationDelay: `${(EMOJIS_RAPIDOS.length - i) * 35}ms` }}
                  >
                    <span className={`w-9 h-9 flex items-center justify-center rounded-full ${miReaccionActual === emoji ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}>
                      <EmojiNoto emoji={emoji} tamaño={32} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
        )}

      </div>
    </div>
  );
}, (prev, next) => {
  // Comparación personalizada: solo re-renderizar si cambia algo visible
  const p = prev.mensaje;
  const n = next.mensaje;
  return (
    p.id === n.id &&
    p.contenido === n.contenido &&
    p.estado === n.estado &&
    p.editado === n.editado &&
    p.eliminado === n.eliminado &&
    p.reacciones === n.reacciones &&
    prev.esMio === next.esMio &&
    prev.esMisNotas === next.esMisNotas &&
    prev.resaltado === next.resaltado &&
    prev.menuActivoId === next.menuActivoId &&
    prev.miId === next.miId
  );
});

// =============================================================================
// SUBCOMPONENTE: Palomitas de estado
// =============================================================================

function Palomitas({ estado, variante = 'burbuja' }: { estado: 'enviado' | 'entregado' | 'leido' | 'fallido'; variante?: 'burbuja' | 'emoji' }) {
  const gris = variante === 'emoji';
  switch (estado) {
    case 'leido':
      return <CheckCheck className={`w-4 h-4 ${gris ? 'text-sky-500' : 'text-sky-300'}`} />;
    case 'entregado':
      return <CheckCheck className={`w-4 h-4 ${gris ? 'text-gray-500' : 'text-white/55'}`} />;
    case 'fallido':
      return <AlertCircle className={`w-3.5 h-3.5 ${gris ? 'text-red-500' : 'text-red-300'}`} />;
    case 'enviado':
    default:
      return <Check className={`w-3.5 h-3.5 ${gris ? 'text-gray-500' : 'text-white/55'}`} />;
  }
}

export default BurbujaMensaje;