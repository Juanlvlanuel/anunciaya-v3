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

import { memo, useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCheck, SmilePlus, AlertCircle, ChevronDown, Image as ImageIcon, FileText, Download, Reply, Play, Pause, Mic, Ticket, ChevronRight, ImageOff } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { Mensaje, ContenidoImagen } from '../../types/chatya';
import { SelectorEmojis } from './SelectorEmojis';
import { EmojiNoto } from './EmojiNoto';
import { TextoConEmojis } from './TextoConEmojis';
import { TextoConEnlaces } from './TextoConEnlaces';
import { PreviewEnlace } from './PreviewEnlace';
import { extraerPrimeraUrl } from './enlacesUtils';
import { analizarEmojis, tamañoEmojiSolo } from './emojiUtils';
import { Howl, Howler } from 'howler';
// =============================================================================
// ESTILOS GLOBALES (inyección única en document.head)
// =============================================================================

const CUPON_STYLES_ID = 'chatya-cupon-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(CUPON_STYLES_ID)) {
  const style = document.createElement('style');
  style.id = CUPON_STYLES_ID;
  style.textContent = `
    @keyframes cupon-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes cupon-shine { 0%{left:-100%} 100%{left:200%} }
    @keyframes cupon-confetti { 0%{opacity:1;transform:translateY(0) rotate(0)} 100%{opacity:0;transform:translateY(-20px) rotate(25deg)} }
    .cupon-regalo { animation: cupon-bounce 2s ease-in-out infinite; }
    .cupon-btn-shine { position:relative; overflow:hidden; }
    .cupon-btn-shine::after { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent); animation:cupon-shine 3s ease-in-out infinite; }
  `;
  document.head.appendChild(style);
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** Tiempo en ms para considerar long press en móvil */
const LONG_PRESS_MS = 300;

/** Emojis rápidos para reaccionar */
const EMOJIS_RAPIDOS = ['👍', '❤️', '😂', '😮', '😢'];

// ── Swipe-to-reply (solo móvil) ──────────────────────────────────────────────
/** Distancia mínima de movimiento para decidir si es swipe o scroll (px) */
const SWIPE_DECISION_PX = 10;
/** Distancia mínima para activar respuesta (px) */
const SWIPE_THRESHOLD = 65;
/** Desplazamiento máximo permitido (px) */
const SWIPE_MAX = 100;

// =============================================================================
// TIPOS
// =============================================================================

/** Estructura del JSON que viene en mensaje.contenido para tipo 'ubicacion' */
interface ContenidoUbicacion {
  latitud: number;
  longitud: number;
  direccion: string;
}

function parsearContenidoUbicacion(raw: string): ContenidoUbicacion | null {
  try {
    const datos = JSON.parse(raw);
    if (typeof datos.latitud === 'number' && typeof datos.longitud === 'number') {
      return datos as ContenidoUbicacion;
    }
    return null;
  } catch {
    return null;
  }
}

// Pin para la burbuja de ubicación
const iconoPinBurbuja = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;
    background:linear-gradient(135deg,#3b82f6,#1d4ed8);
    border-radius:50%;border:2.5px solid white;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(37,99,235,0.5)">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  </div>`,
  iconAnchor: [14, 28],
  iconSize: [28, 28],
});

// =============================================================================
// COMPONENTE: MensajeSistema
// =============================================================================
//
// Render dedicado para `mensaje.tipo === 'sistema'`. Distinto de los demás
// mensajes: NO tiene burbuja propia ni avatar ni reacciones — se renderiza
// CENTRADO en la conversación con look de "evento del sistema" (similar a
// "Mensajes cifrados de extremo a extremo" o "X creó el grupo" de WhatsApp).
//
// El campo `contenido` viene como JSON con un `subtipo` discriminador:
//
//  - `subtipo: 'articulo_marketplace'` → card embebida con foto + título +
//     precio + condicion + botón "Ver publicación →" que navega al detalle.
//     Lo emite el backend al crear conversación desde el detalle de un
//     artículo de MarketPlace.
//
//  - `subtipo: 'contacto_perfil'` → texto centrado "X inició la conversación
//     desde tu perfil". Lo emite el backend al crear conversación desde el
//     perfil del vendedor (sin artículo específico).
//
//  - JSON inválido o subtipo desconocido → fallback texto plano centrado
//     (mantiene compatibilidad con futuros subtipos).

interface MensajeSistemaProps {
  contenidoRaw: string;
  /**
   * Id del usuario actual. Cuando coincide con `iniciadorId` del JSON, la
   * card/pill se alinea a la derecha en desktop (igual que mis propios
   * mensajes). Si no, se alinea a la izquierda (lado del otro). En móvil
   * siempre va centrada — más legible en pantallas pequeñas.
   * Si falta `iniciadorId` (datos de antes del 8 mayo 2026 que no lo
   * incluían), se mantiene centrado en todas las resoluciones.
   */
  miId?: string | null;
}

interface SistemaArticuloMP {
  subtipo: 'articulo_marketplace';
  articuloId: string;
  titulo: string;
  precio: string | number;
  condicion: string;
  fotoUrl: string | null;
  iniciadorId?: string;
}

interface SistemaContactoPerfil {
  subtipo: 'contacto_perfil';
  iniciadorNombre: string;
  iniciadorId?: string;
}

type DatosSistema = SistemaArticuloMP | SistemaContactoPerfil | { subtipo?: string };

function parsearContenidoSistema(raw: string): DatosSistema | null {
  try {
    const datos = JSON.parse(raw);
    if (typeof datos === 'object' && datos !== null) {
      return datos as DatosSistema;
    }
    return null;
  } catch {
    return null;
  }
}

const ETIQUETA_CONDICION_MP: Record<string, string> = {
  nuevo: 'Nuevo',
  seminuevo: 'Seminuevo',
  usado: 'Usado',
  para_reparar: 'Para reparar',
};

function formatearPrecioMP(valor: string | number): string {
  const num = typeof valor === 'string' ? Number(valor) : valor;
  if (!isFinite(num)) return String(valor);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function MensajeSistema({ contenidoRaw, miId }: MensajeSistemaProps) {
  const datos = parsearContenidoSistema(contenidoRaw);

  // Alineación según iniciador del contexto:
  //  - Móvil: siempre centrado.
  //  - Desktop: derecha si yo inicié (igual que mis mensajes propios),
  //    izquierda si fue el otro (igual que mensajes recibidos), centrado
  //    si el JSON no trae `iniciadorId` (mensajes legacy de antes del
  //    8 mayo 2026).
  const iniciadorId = (datos as { iniciadorId?: string } | null)?.iniciadorId;
  const justify =
    !iniciadorId
      ? 'justify-center'
      : iniciadorId === miId
        ? 'justify-center lg:justify-end'
        : 'justify-center lg:justify-start';

  // ── Subtipo: card de artículo de MarketPlace ─────────────────────────────
  if (datos && (datos as SistemaArticuloMP).subtipo === 'articulo_marketplace') {
    const d = datos as SistemaArticuloMP;
    const irAlArticulo = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!d.articuloId) {
        // eslint-disable-next-line no-console
        console.warn('[MensajeSistema] articulo_marketplace sin articuloId', datos);
        return;
      }
      // Usar evento custom `chatya:navegar-externo` (manejado por
      // ChatOverlay). Cierra el chat sin disparar `history.back()` y
      // luego navega a la ruta destino. Si usáramos `navigate(ruta) +
      // cerrarChatYA()` directamente, el cierre del overlay haría
      // `history.back()` y nos regresaría a la ruta donde se abrió el
      // chat (ej: estabas en /negocios cuando lo abriste → te manda
      // ahí en vez de al detalle del artículo).
      window.dispatchEvent(
        new CustomEvent('chatya:navegar-externo', {
          detail: `/marketplace/articulo/${d.articuloId}`,
        }),
      );
    };
    return (
      <div className={`flex w-full my-1 ${justify}`}>
        <button
          type="button"
          data-testid={`mensaje-sistema-articulo-${d.articuloId}`}
          onClick={irAlArticulo}
          className="group flex w-full max-w-sm cursor-pointer items-stretch overflow-hidden rounded-xl border-2 border-slate-300 bg-white text-left shadow-md lg:hover:border-teal-500"
        >
          {/* Foto cuadrada izquierda */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden bg-slate-200">
            {d.fotoUrl ? (
              <img
                src={d.fotoUrl}
                alt={d.titulo}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <ImageOff className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
            )}
          </div>
          {/* Contenido */}
          <div className="flex min-w-0 flex-1 flex-col justify-between p-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-teal-700">
                MarketPlace
              </p>
              <p className="line-clamp-2 text-sm font-bold leading-tight text-slate-900">
                {d.titulo}
              </p>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="shrink-0 text-base font-extrabold text-slate-900">
                {formatearPrecioMP(d.precio)}
              </span>
              <span className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-teal-700 lg:group-hover:text-teal-900">
                Ver
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </span>
            </div>
          </div>
        </button>
      </div>
    );
  }

  // ── Subtipo: contacto desde el perfil ────────────────────────────────────
  if (datos && (datos as SistemaContactoPerfil).subtipo === 'contacto_perfil') {
    const d = datos as SistemaContactoPerfil;
    return (
      <div className={`flex w-full my-1 ${justify}`}>
        <span className="rounded-full bg-white/85 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
          {d.iniciadorNombre} inició la conversación desde tu perfil
        </span>
      </div>
    );
  }

  // ── Fallback: texto plano centrado ───────────────────────────────────────
  return (
    <div className="flex w-full justify-center my-1">
      <span className="rounded-full bg-white/85 px-3 py-1 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
        {contenidoRaw}
      </span>
    </div>
  );
}

// =============================================================================
// COMPONENTE: UbicacionBurbuja
// =============================================================================

function UbicacionBurbuja({
  contenidoRaw,
}: {
  contenidoRaw: string;
}) {
  const datos = parsearContenidoUbicacion(contenidoRaw);
  if (!datos) return null;

  const { latitud, longitud } = datos;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitud},${longitud}`;
  const posicion: [number, number] = [latitud, longitud];

  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block overflow-hidden rounded-[10px] active:opacity-80 transition-opacity pointer-events-auto"
      style={{ width: 260, height: 160 }}
    >
      <div className="w-full h-full pointer-events-none">
        <MapContainer
          center={posicion}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          touchZoom={false}
          keyboard={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={posicion} icon={iconoPinBurbuja} />
        </MapContainer>
      </div>
    </a>
  );
}

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
  /** Sucursal activa (desempata mis reacciones en chats inter-sucursal) */
  miSucursalId?: string | null;
  /** Callback al hacer click en imagen para abrir visor fullscreen */
  onImagenClick?: (mensajeId: string) => void;
  /** Callback al hacer click en botón reenviar (imagen/documento) */
  onReenviar?: (mensaje: Mensaje) => void;
  /** Callback al hacer click en la cita de respuesta para navegar al mensaje original */
  onCitaClick?: (mensajeId: string) => void;
  /** Callback al hacer swipe-to-reply (solo móvil) */
  onResponder?: (mensaje: Mensaje) => void;
  /** URL del avatar del emisor (para audio estilo WhatsApp) */
  avatarEmisor?: string | null;
  /** Iniciales del emisor (fallback cuando no hay avatar, para audio) */
  inicialesEmisor?: string;
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
  const maxAncho = 240;
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
        esMio ? 'bg-white/10 hover:bg-white/15' : 'hover:bg-white/10'
      }`}
      onClick={handleDescargar}
    >
      {/* Icono según extensión */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color.bg} ${color.texto}`}>
        <FileText className="w-5 h-5" />
      </div>

      {/* Nombre + tamaño */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${esMio ? 'text-white' : 'text-white/90'}`}>
          {datos.nombre}
        </p>
        <p className={`text-xs ${esMio ? 'text-white/60' : 'text-white/55'}`}>
          {formatearTamanoDoc(datos.tamano)} · {datos.extension.toUpperCase()}
        </p>
      </div>

      {/* Icono descarga */}
      <Download className={`w-4 h-4 shrink-0 ${esMio ? 'text-white/60' : 'text-white/50'}`} />
    </div>
  );
}

// =============================================================================
// AUDIO: Parser + Burbuja (Sprint 6)
// =============================================================================

/** Estructura del JSON que viene en mensaje.contenido para tipo 'audio' */
interface ContenidoAudio {
  url: string;
  duracion: number;    // Segundos (ej: 12.5)
  tamano: number;      // Bytes
  waveform?: number[]; // ~50 valores 0-1 para la onda visual
}

/**
 * Parsea el campo `contenido` de un mensaje tipo 'audio'.
 */
function parsearContenidoAudio(contenidoRaw: string): ContenidoAudio | null {
  try {
    const datos = JSON.parse(contenidoRaw);
    if (datos && datos.url && typeof datos.duracion === 'number') {
      return datos as ContenidoAudio;
    }
    return null;
  } catch {
    return null;
  }
}

/** Formatea segundos a mm:ss (ej: 72.3 → "1:12") */
function formatearDuracionAudio(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = Math.floor(segundos % 60);
  return `${min}:${seg.toString().padStart(2, '0')}`;
}

/**
 * Componente interno para renderizar audio estilo WhatsApp.
 * Layout según emisor:
 *   - esMio:   Avatar → Play → Waveform+hora
 *   - !esMio:  Play → Waveform+hora → Avatar
 */
function AudioBurbuja({
  contenidoRaw,
  esMio,
  avatarUrl,
  iniciales,
  hora,
  editado,
  estado,
  esMisNotas,
}: {
  contenidoRaw: string;
  esMio: boolean;
  avatarUrl?: string | null;
  iniciales: string;
  hora: string;
  editado: boolean;
  estado: 'enviado' | 'entregado' | 'leido' | 'fallido';
  esMisNotas?: boolean;
}) {
  const datos = parsearContenidoAudio(contenidoRaw);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const arrastrandoRef = useRef(false);
  const estabaReproduciendoRef = useRef(false);
  const audioRef = useRef<Howl | null>(null);
  const rafRef = useRef<number | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  if (!datos) {
    return (
      <div className="flex items-center gap-2 text-sm opacity-60 py-2">
        <Mic className="w-4 h-4" />
        <span>Audio no disponible</span>
      </div>
    );
  }

  const waveform = datos.waveform && datos.waveform.length > 0
    ? datos.waveform
    : new Array(40).fill(0.3);

  const actualizarProgreso = () => {
    const sound = audioRef.current;
    if (!sound) return;
    if (!arrastrandoRef.current) {
      const seekVal = sound.seek();
      const seek = typeof seekVal === 'number' && isFinite(seekVal) ? seekVal : 0;
      const rawDur = sound.duration();
      const dur = (typeof rawDur === 'number' && isFinite(rawDur) && rawDur > 0) ? rawDur : datos.duracion;
      if (dur > 0) {
        setTiempoActual(seek);
        setProgreso(seek / dur);
      }
    }
    // Mantener el loop vivo mientras el sonido exista y esté reproduciéndose
    if (sound.playing()) {
      rafRef.current = requestAnimationFrame(actualizarProgreso);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      // Pre-calentar AudioContext antes de crear el Howl (evita beep inicial)
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
      }

      const sound = new Howl({
        src: [datos.url],
        format: ['webm', 'ogg', 'mp3', 'wav'],
        volume: 0,
        onload: () => {
          // Audio decodificado y AudioContext listo — ahora sí reproducir
          if (tiempoActual > 0) {
            sound.seek(tiempoActual);
          }
          sound.play();
        },
        onplay: () => {
          setReproduciendo(true);
          if (sound.volume() === 0) {
            sound.fade(0, 1, 150);
          }
          rafRef.current = requestAnimationFrame(actualizarProgreso);
        },
        onpause: () => {
          setReproduciendo(false);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
        },
        onend: () => {
          setReproduciendo(false);
          setProgreso(0);
          setTiempoActual(0);
          setVelocidad(1);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          audioRef.current?.unload();
          audioRef.current = null;
        },
        onloaderror: (_id: number, err: unknown) => {
          console.error('[Howler] Error cargando audio:', err);
          setReproduciendo(false);
          audioRef.current = null;
        },
        onplayerror: () => {
          setReproduciendo(false);
          sound.once('unlock', () => sound.play());
        },
      });
      audioRef.current = sound;
      return;
    }

    if (reproduciendo) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Cleanup: detener audio al desmontar (cambio de chat, etc.)
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.unload();
        audioRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const calcularProgresoDesdeEvento = (clientX: number): number => {
    if (!waveformContainerRef.current) return 0;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return x / rect.width;
  };

  const aplicarSeek = (nuevoProgreso: number) => {
    setProgreso(nuevoProgreso);
    if (audioRef.current) {
      const rawDur = audioRef.current.duration();
      const dur = (typeof rawDur === 'number' && isFinite(rawDur) && rawDur > 0) ? rawDur : datos.duracion;
      const nuevoTiempo = nuevoProgreso * dur;
      audioRef.current.seek(nuevoTiempo);
      setTiempoActual(nuevoTiempo);
    } else {
      setTiempoActual(nuevoProgreso * datos.duracion);
    }
  };

  // ── POINTER EVENTS (unificado mouse + touch) ──
  // Pointer Events NO son passive en React 18 → preventDefault() SÍ funciona.
  // setPointerCapture() amarra todos los eventos al elemento aunque el dedo
  // se mueva fuera del waveform → no necesita listeners en document.

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Capturar el pointer: todos los pointermove/pointerup van a ESTE elemento
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    setArrastrando(true);
    arrastrandoRef.current = true;

    if (audioRef.current && audioRef.current.playing()) {
      estabaReproduciendoRef.current = true;
      audioRef.current.pause();
    } else {
      estabaReproduciendoRef.current = false;
    }

    aplicarSeek(calcularProgresoDesdeEvento(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!arrastrandoRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    aplicarSeek(calcularProgresoDesdeEvento(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!arrastrandoRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    setArrastrando(false);
    arrastrandoRef.current = false;
    aplicarSeek(calcularProgresoDesdeEvento(e.clientX));

    // Reanudar reproducción si estaba sonando antes del drag
    if (audioRef.current && estabaReproduciendoRef.current) {
      audioRef.current.volume(0);
      audioRef.current.play();
      audioRef.current.fade(0, 1, 50);
      rafRef.current = requestAnimationFrame(actualizarProgreso);
    }
  };

  const ciclarVelocidad = (e: React.MouseEvent) => {
    e.stopPropagation();
    const siguiente = velocidad === 1 ? 1.5 : velocidad === 1.5 ? 2 : 1;
    setVelocidad(siguiente);
    if (audioRef.current) {
      audioRef.current.rate(siguiente);
    }
  };

  const duracionMostrada = reproduciendo || tiempoActual > 0
    ? formatearDuracionAudio(tiempoActual)
    : formatearDuracionAudio(datos.duracion);

  // Posición del punto de seek clampeada (no se sale del contenedor)
  const thumbLeft = Math.max(0, Math.min(progreso * 100, 97));

  // ── Piezas reutilizables ──

  const velocidadLabel = velocidad === 1 ? '1' : velocidad === 1.5 ? '1.5' : '2';

  const avatarEl = reproduciendo ? (
    <button
      onClick={ciclarVelocidad}
      className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center cursor-pointer active:scale-95 overflow-visible ${
        esMio ? 'bg-white/25 hover:bg-white/35' : 'bg-blue-100 hover:bg-blue-200'
      }`}
    >
      <span className={`font-bold select-none ${
        esMio ? 'text-white' : 'text-blue-600'
      } ${velocidad === 1.5 ? 'text-sm' : 'text-base'}`}>
        {velocidadLabel}
        <span className="text-[10px]">×</span>
      </span>
    </button>
  ) : (
    <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center overflow-hidden ${
      esMio ? 'bg-white/25' : 'bg-blue-100'
    }`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="w-full h-full object-cover" draggable={false} />
      ) : (
        <span className={`text-base font-bold select-none ${esMio ? 'text-white/80' : 'text-blue-500'}`}>
          {iniciales}
        </span>
      )}
    </div>
  );

  const playBtnEl = (
    <button
      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
      data-no-swipe
      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
        esMio ? 'hover:bg-white/20' : 'hover:bg-blue-200'
      }`}
    >
      {reproduciendo ? (
        <Pause className={`w-5 h-5 lg:w-4 lg:h-4 ${esMio ? 'text-white' : 'text-blue-600'}`} fill={esMio ? 'white' : 'currentColor'} />
      ) : (
        <Play className={`w-5 h-5 lg:w-4 lg:h-4 ${esMio ? 'text-white' : 'text-blue-600'}`} fill={esMio ? 'white' : 'currentColor'} />
      )}
    </button>
  );

  const waveformEl = (
    <div className="flex-1 min-w-0">
      {/* Waveform con punto arrastrable */}
      <div
        ref={waveformContainerRef}
        className="relative h-8 cursor-pointer select-none translate-y-1.5"
        style={{ touchAction: 'none' }}
        data-no-swipe
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="flex items-center gap-0.5 h-full overflow-hidden">
          {waveform.map((valor, i) => {
            const barraProgreso = i / waveform.length;
            const activa = barraProgreso <= progreso;
            const altura = Math.max(12, valor * 100);

            return (
              <div
                key={i}
                className={`rounded-full pointer-events-none ${
                  activa
                    ? esMio ? 'bg-white' : 'bg-blue-500'
                    : esMio ? 'bg-white/30' : 'bg-gray-300'
                }`}
                style={{
                  width: '2.5px',
                  height: `${altura}%`,
                  minHeight: '3px',
                }}
              />
            );
          })}
        </div>

        {/* Punto grande arrastrable (seek thumb) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none z-10"
          style={{ left: `${thumbLeft}%` }}
        >
          <div className={`w-3.5 h-3.5 rounded-full shadow-md -ml-1.5 ${
            esMio ? 'bg-white' : 'bg-blue-500'
          } ${arrastrando ? 'scale-125' : ''}`} />
        </div>
      </div>

      {/* Duración (izq) + hora y palomitas (der) */}
      <div className="flex items-center justify-between translate-y-2">
        <span className={`text-[11px] tabular-nums ${
          esMio ? 'text-white/60' : 'text-white/55'
        }`}>
          {duracionMostrada}
        </span>
        <span className={`inline-flex items-center gap-0.5 text-[11px] lg:text-[11px] ${esMio ? 'text-white/60' : 'text-white/55'}`}>
          {editado && <span className="italic">editado</span>}
          <span>{hora}</span>
          {esMio && !esMisNotas && <Palomitas estado={estado} />}
        </span>
      </div>
    </div>
  );

  // ── Layout según emisor ──
  return (
    <div className="flex items-center gap-2 w-full max-w-[280px] lg:max-w-80 py-0" style={{ paddingTop: '2px', paddingBottom: '2px' }}>
      {esMio ? (
        <>
          {avatarEl}
          {playBtnEl}
          {waveformEl}
        </>
      ) : (
        <>
          {playBtnEl}
          {waveformEl}
          {avatarEl}
        </>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE
// =============================================================================

export const BurbujaMensaje = memo(function BurbujaMensaje({ mensaje, esMio, esMisNotas = false, resaltado = false, onMenuContextual, onReaccionar, menuActivoId, miId, miSucursalId = null, onImagenClick, onReenviar, onCitaClick, onResponder, avatarEmisor, inicialesEmisor }: BurbujaMensajeProps) {
  const hora = formatearHora(mensaje.createdAt);
  const esFallido = mensaje.estado === 'fallido';

  // Detectar si el mensaje es solo emojis (para renderizar sin burbuja)
  const infoEmoji = !mensaje.eliminado ? analizarEmojis(mensaje.contenido) : { soloEmojis: false, cantidad: 0 };
  const esSoloEmojis = infoEmoji.soloEmojis && !mensaje.respuestaA;

  // URL para preview OG (solo mensajes de texto no eliminados, no solo emojis)
  const primeraUrl = useMemo(() => {
    if (mensaje.tipo !== 'texto' || mensaje.eliminado || esSoloEmojis) return null;
    return extraerPrimeraUrl(mensaje.contenido);
  }, [mensaje.contenido, mensaje.tipo, mensaje.eliminado, esSoloEmojis]);

  /** Emoji con el que ya reaccioné a este mensaje (si existe).
   *  En inter-sucursal cada sucursal es un reactor independiente, así que
   *  comparamos la tupla completa (miId, miSucursalId). */
  const miReaccionActual = mensaje.reacciones?.find((r) => {
    const usrs = r.usuarios as (string | { id: string; sucursalId?: string | null })[];
    return usrs.some((u) => {
      const uid = typeof u === 'string' ? u : u.id;
      const usuc = typeof u === 'string' ? null : (u.sucursalId ?? null);
      return uid === (miId || '') && usuc === (miSucursalId ?? null);
    });
  })?.emoji;

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

  // ── Swipe-to-reply state (solo móvil) ──
  /** Desplazamiento actual en px durante el swipe */
  const [swipeX, setSwipeX] = useState(0);
  /** true mientras la burbuja regresa a su posición (animación spring-back) */
  const [swipeReturning, setSwipeReturning] = useState(false);
  const swipeStartXRef = useRef(0);
  const swipeStartYRef = useRef(0);
  /** true cuando el gesto fue identificado como swipe horizontal */
  const swipingRef = useRef(false);
  /** true cuando ya se decidió si es swipe o scroll (evita re-evaluar) */
  const swipeDecidedRef = useRef(false);
  /** Valor previo para detectar cruce del umbral (vibración háptica) */
  const swipePrevXRef = useRef(0);
  /** Timer para limpiar swipeReturning */
  const swipeReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeTouchIniciadoRef = useRef(false);

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
    // ── Si el toque viene del waveform de audio, no iniciar swipe-to-reply ──
    const target = e.target as HTMLElement;
    if (target.closest('[data-no-swipe]')) {
      swipeTouchIniciadoRef.current = false;
      return;
    }

    // ── Swipe-to-reply: registrar posición inicial ──
    swipeTouchIniciadoRef.current = true;
    swipeStartXRef.current = e.touches[0].clientX;
    swipeStartYRef.current = e.touches[0].clientY;
    swipingRef.current = false;
    swipeDecidedRef.current = false;
    swipePrevXRef.current = 0;
    if (swipeReturnTimerRef.current) clearTimeout(swipeReturnTimerRef.current);
    setSwipeReturning(false);

    // ── Long press (lógica existente) ──
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

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeTouchIniciadoRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartXRef.current;
    const deltaY = touch.clientY - swipeStartYRef.current;

    // ── Fase de decisión: ¿swipe horizontal o scroll vertical? ──
    if (!swipeDecidedRef.current) {
      const absDx = Math.abs(deltaX);
      const absDy = Math.abs(deltaY);

      if (absDx >= SWIPE_DECISION_PX || absDy >= SWIPE_DECISION_PX) {
        swipeDecidedRef.current = true;

        if (absDx > absDy && deltaX > 0 && onResponder && !mensaje.eliminado && !esMisNotas) {
          // → Swipe horizontal a la derecha detectado
          swipingRef.current = true;
        } else {
          // → Scroll vertical (o swipe izquierdo) — no hacer nada especial
          swipingRef.current = false;
        }

        // En ambos casos: cancelar long press
        touchMovedRef.current = true;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
      return;
    }

    // ── Modo swipe activo: mover la burbuja ──
    if (swipingRef.current) {
      const prevX = swipePrevXRef.current;
      const clampedX = Math.min(Math.max(deltaX, 0), SWIPE_MAX);
      swipePrevXRef.current = clampedX;
      setSwipeX(clampedX);

      // Vibración háptica al cruzar el umbral (solo una vez)
      if (clampedX >= SWIPE_THRESHOLD && prevX < SWIPE_THRESHOLD) {
        if (navigator.vibrate) navigator.vibrate(25);
      }
      return;
    }

    // ── No es swipe: cancelar long press si el dedo se mueve (lógica existente) ──
    touchMovedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [mensaje.eliminado, esMisNotas, onResponder]);

  const handleTouchEnd = useCallback(() => {
    // Limpiar long press timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // ── Swipe-to-reply: evaluar resultado ──
    if (swipingRef.current) {
      if (swipePrevXRef.current >= SWIPE_THRESHOLD && onResponder) {
        onResponder(mensaje);
      }
      // Spring-back: regresar burbuja a su posición
      setSwipeReturning(true);
      setSwipeX(0);
      swipeReturnTimerRef.current = setTimeout(() => setSwipeReturning(false), 220);
    }

    // Reset refs
    swipingRef.current = false;
    swipeDecidedRef.current = false;
    swipePrevXRef.current = 0;
    swipeTouchIniciadoRef.current = false;
  }, [mensaje, onResponder]);

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

  // ── Mensajes del sistema (contexto de MarketPlace, etc.) ──────────────────
  // Render dedicado: sin avatar, sin reacciones, sin menú contextual, sin
  // swipe-to-reply. El `MensajeSistema` parsea el JSON de `contenido` y
  // elige el render según `subtipo`. Se le pasa `miId` para que pueda
  // alinear la card del lado del iniciador del contexto en desktop
  // (derecha si yo, izquierda si el otro).
  if (mensaje.tipo === 'sistema') {
    return (
      <div
        data-testid={`mensaje-${mensaje.id}`}
        className="w-full"
      >
        <MensajeSistema contenidoRaw={mensaje.contenido} miId={miId} />
      </div>
    );
  }

  return (
    <div
      data-testid={`mensaje-${mensaje.id}`}
      className={`group relative flex select-none lg:select-auto ${esMio ? 'justify-end' : 'justify-start'}`}
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
      {/* Ícono Reply — visible solo durante swipe-to-reply (móvil) */}
      {swipeX > 0 && (
        <div
          className="absolute left-3 top-1/2 z-20 pointer-events-none"
          style={{
            opacity: Math.min(swipeX / SWIPE_THRESHOLD, 1),
            transform: `translateY(-50%) scale(${Math.min(swipeX / SWIPE_THRESHOLD, 1)})`,
          }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
            swipeX >= SWIPE_THRESHOLD ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            <Reply className="w-4 h-4 scale-x-[-1]" />
          </div>
        </div>
      )}

      <div
        className={`relative ${primeraUrl ? 'max-w-80 lg:max-w-72 2xl:max-w-80' : 'max-w-[84%]'} select-none lg:select-text`}
        style={{
          transform: swipeX > 0 ? `translateX(${swipeX}px)` : undefined,
          transition: swipeReturning ? 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 'none',
        }}
      >

        {/* Wrapper relativo solo para burbuja + botón emoji (centrado ignora reacciones) */}
        <div className="relative">
          {/* Botón reenviar siempre visible (solo multimedia, desktop, no Mis Notas) */}
          {!mensaje.eliminado && !esMisNotas && onReenviar && (mensaje.tipo === 'imagen' || mensaje.tipo === 'documento' || mensaje.tipo === 'audio' || mensaje.tipo === 'ubicacion') && (
            <div className={`absolute top-1/2 -translate-y-1/2 z-10 flex ${esMio ? '-left-8' : '-right-8'}`}>
              <button
                onClick={(e) => { e.stopPropagation(); onReenviar(mensaje); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-200 cursor-pointer [&:hover_svg]:text-gray-900"
              >
                <span className="w-9 h-9 lg:w-7 lg:h-7 block opacity-50 lg:opacity-100">
                  <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor" className="text-white lg:text-gray-400">
                    <path d="M13 9V5.8L18.2 11 13 16.2V13H11c-3.3 0-5.6 1-7.3 3.2C4.3 13 6.5 9 13 9z"/>
                  </svg>
                </span>
              </button>
            </div>
          )}

          {/* Botón emoji hover (solo desktop, no eliminados, no Mis Notas) */}
          {!mensaje.eliminado && !esMisNotas && onReaccionar && (() => {
            const tieneReenviarVisible = (mensaje.tipo === 'imagen' || mensaje.tipo === 'documento' || mensaje.tipo === 'audio' || mensaje.tipo === 'ubicacion') && !!onReenviar;
            // Si hay botón reenviar visible, el emoji se posiciona más afuera
            const offset = esMio
              ? (tieneReenviarVisible ? '-left-[60px]' : '-left-7')
              : (tieneReenviarVisible ? '-right-[60px]' : '-right-7');

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
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-200 cursor-pointer"
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
                : `${mensaje.tipo === 'imagen' || mensaje.tipo === 'ubicacion' ? 'p-1' : 'px-2.5 py-1.5'} rounded-[14px] relative
          ${esMio
                  ? 'bg-linear-to-br from-[#2563eb] to-[#1d4ed8] text-white rounded-br-[5px] shadow-[0_2px_8px_rgba(37,99,235,0.25)]'
                  : 'bg-[linear-gradient(135deg,#081540,#040d28)] lg:bg-[linear-gradient(135deg,#0f2a6b,#0a1d4e)] text-white rounded-bl-[5px] shadow-[0_2px_8px_rgba(10,25,80,0.4)]'
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
                className={`absolute top-0.5 right-0.5 flex w-6 h-5 items-center justify-center rounded cursor-pointer opacity-0 lg:group-hover:opacity-100 ${mensaje.tipo === 'ubicacion' || mensaje.tipo === 'imagen'
                  ? 'z-1000 bg-black/40 text-white hover:bg-black/60'
                  : esSoloEmojis
                    ? 'z-50 hover:bg-gray-200 text-gray-700 hover:text-gray-700'
                    : `z-50 ${esMio ? 'hover:bg-white/20 text-white/70 hover:text-white' : 'hover:bg-white/20 text-white/70 hover:text-white'}`
                  }`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}


            {/* Quote del mensaje respondido (estilo WhatsApp) */}
            {mensaje.respuestaA && !mensaje.eliminado && (
              <div
                className={`
            mb-1.5 rounded-lg border-l-[3px] cursor-pointer overflow-hidden flex items-stretch
            ${esMio
                    ? 'bg-white/15 border-l-white/60'
                    : 'bg-[rgba(10,29,78,0.6)] border-l-blue-400'
                  }
          `}
                onClick={() => {
                  if (onCitaClick && mensaje.respuestaA!.id) {
                    onCitaClick(mensaje.respuestaA!.id);
                  } else {
                    const el = document.getElementById(`msg-${mensaje.respuestaA!.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              >
                {/* Texto */}
                <div className="flex-1 min-w-0 px-2.5 py-1.5">
                  <p className={`text-[13px] font-bold ${esMio ? 'text-white/95' : 'text-blue-500'}`}>
                    {mensaje.respuestaA.emisorId === mensaje.emisorId && mensaje.respuestaA.emisorSucursalId === mensaje.emisorSucursalId ? 'Tú' : 'Mensaje'}
                  </p>
                  <p className={`text-[13px] truncate mt-0.5 ${esMio ? 'text-white/75' : 'text-white/60'}`}>
                    {mensaje.respuestaA.tipo === 'imagen' ? (() => {
                      let d: { caption?: string } = {};
                      try { d = JSON.parse(mensaje.respuestaA!.contenido); } catch { /* ignore */ }
                      return <>📷 {d.caption || 'Foto'}</>;
                    })() : mensaje.respuestaA.tipo === 'audio' ? (
                      '🎤 Audio'
                    ) : mensaje.respuestaA.tipo === 'documento' ? (
                      '📄 Documento'
                    ) : (
                      <TextoConEmojis texto={mensaje.respuestaA.contenido} tamañoEmoji={18} />
                    )}
                  </p>
                </div>
                {/* Thumbnail a la derecha, sin padding, altura completa */}
                {mensaje.respuestaA.tipo === 'imagen' && (() => {
                  let d: { url?: string } = {};
                  try { d = JSON.parse(mensaje.respuestaA!.contenido); } catch { /* ignore */ }
                  return d.url ? (
                    <img src={d.url} alt="" className="w-12 object-cover shrink-0" loading="lazy" />
                  ) : null;
                })()}
              </div>
            )}

            {/* Contenido de imagen (tipo === 'imagen') */}
            {mensaje.tipo === 'imagen' && !mensaje.eliminado && (
              <>
                {/* Hora flotante dentro de la imagen — siempre, con o sin caption */}
                {(() => {
                  const datos = parsearContenidoImagen(mensaje.contenido);
                  const tieneCaption = datos?.caption && datos.caption.trim().length > 0;
                  return (
                    <>
                      <div className="relative">
                        <ImagenBurbuja
                          contenidoRaw={mensaje.contenido}
                          esMio={esMio}
                          onClick={() => onImagenClick?.(mensaje.id)}
                        />
                        <div className={`absolute bottom-1.5 right-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] lg:text-[11px] ${esMio ? 'bg-black/40 text-white/90' : 'bg-black/40 text-white/90'}`}>
                          {mensaje.editado && <span className="italic">editado</span>}
                          <span>{hora}</span>
                          {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                        </div>
                      </div>
                      {tieneCaption && (
                        <p className="text-[15px] lg:text-[14px] leading-relaxed wrap-break-word whitespace-pre-wrap font-medium mt-1 pb-0.5 text-center">
                          <TextoConEmojis texto={datos!.caption!} tamañoEmoji={26} />
                        </p>
                      )}
                    </>
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
                  <span className={`inline-flex items-center gap-0.5 text-[11px] lg:text-[11px] ${esMio ? 'text-white/70' : 'text-white/55'}`}>
                    {mensaje.editado && <span className="italic">editado</span>}
                    <span>{hora}</span>
                    {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                  </span>
                </div>
              </>
            )}

            {/* Contenido de audio (tipo === 'audio') */}
            {mensaje.tipo === 'audio' && !mensaje.eliminado && (
              <AudioBurbuja
                contenidoRaw={mensaje.contenido}
                esMio={esMio}
                avatarUrl={avatarEmisor}
                iniciales={inicialesEmisor || '?'}
                hora={hora}
                editado={mensaje.editado}
                estado={mensaje.estado}
                esMisNotas={esMisNotas}
              />
            )}

            {/* Contenido de ubicación (tipo === 'ubicacion') */}
            {mensaje.tipo === 'ubicacion' && !mensaje.eliminado && (
              <>
                <UbicacionBurbuja
                  contenidoRaw={mensaje.contenido}
                />
                <div className="flex justify-end mt-0.5 px-0.5">
                  <span className={`inline-flex items-center gap-0.5 text-[11px] lg:text-[11px] ${esMio ? 'text-white/70' : 'text-white/55'}`}>
                    {mensaje.editado && <span className="italic">editado</span>}
                    <span>{hora}</span>
                    {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                  </span>
                </div>
              </>
            )}

            {/* Contenido cupón (burbuja especial — estilo regalo) */}
            {mensaje.tipo === 'cupon' && !mensaje.eliminado && (() => {
              try {
                const datos = JSON.parse(mensaje.contenido);
                return (
                  <>
                    <div className="w-64 lg:w-56 2xl:w-64 rounded-xl overflow-hidden" style={{ border: '2px solid #10b981', boxShadow: '0 4px 20px rgba(16,185,129,0.2)' }}>
                      {/* Imagen */}
                      {datos.imagen && (
                        <img src={datos.imagen} alt={datos.titulo} className="w-full h-32 lg:h-28 2xl:h-32 object-cover" />
                      )}

                      {/* Cinta decorativa */}
                      <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #10b981, #059669, #10b981)' }} />

                      {/* Contenido */}
                      <div className="bg-white p-3 lg:p-2.5 2xl:p-3">
                        {/* Header: emoji izq + texto der */}
                        <div className="flex items-center gap-2.5">
                          <div className="cupon-regalo text-5xl lg:text-4xl 2xl:text-5xl shrink-0">🎁</div>
                          <div>
                            <p className="text-lg lg:text-base 2xl:text-lg font-extrabold text-emerald-700">¡Felicidades!</p>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700">Tienes un cupón exclusivo</p>
                          </div>
                        </div>

                        {/* Datos del cupón — centrado */}
                        <div className="mt-2.5 pt-2.5 border-t-2 border-slate-300 text-center">
                          <p className="text-lg lg:text-base 2xl:text-lg font-extrabold text-slate-800">{datos.titulo}</p>
                          {datos.fechaExpiracion && (
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 mt-0.5">
                              Vence {new Date(datos.fechaExpiracion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botón con brillo */}
                      <button
                        onClick={(e) => { e.stopPropagation(); window.location.href = datos.accionUrl || '/mis-cupones'; }}
                        className="cupon-btn-shine w-full py-2.5 lg:py-2 2xl:py-2.5 flex items-center justify-center gap-1.5 font-bold cursor-pointer"
                        style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', color: '#a7f3d0' }}
                      >
                        <Ticket className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 shrink-0" />
                        <span className="text-base lg:text-sm 2xl:text-base">Reclamar cupón</span>
                      </button>
                    </div>
                    <div className={`flex justify-end mt-1 ${esMio ? 'text-white/70' : 'text-white/55'}`}>
                      <span className="text-[11px]">{hora}</span>
                      {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                    </div>
                  </>
                );
              } catch {
                return <p className="text-sm font-medium text-slate-600">Cupón no disponible</p>;
              }
            })()}

            {/* Contenido + hora (texto normal) */}
            {mensaje.tipo !== 'imagen' && mensaje.tipo !== 'documento' && mensaje.tipo !== 'audio' && mensaje.tipo !== 'ubicacion' && mensaje.tipo !== 'cupon' && (esSoloEmojis ? (
              <>
                {/* Emojis grandes sin burbuja */}
                <p className={`leading-none lg:pr-7 ${esMio ? 'text-right' : 'text-left'} ${infoEmoji.cantidad === 1 ? 'py-1' : 'py-0.5'}`}>
                  <TextoConEmojis texto={mensaje.contenido} tamañoEmoji={tamañoEmojiSolo(infoEmoji.cantidad)} />
                </p>
                {/* Hora dentro de burbuja */}
                <div className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                  <span className={`inline-flex items-center gap-0.5 text-[11px] mt-1 px-2 py-0.5 rounded-full ${esMio
                    ? 'bg-linear-to-br from-[#3b82f6] to-[#1d4ed8] text-white/70'
                    : 'bg-[linear-gradient(135deg,#0f2a6b,#0a1d4e)] text-white/70 shadow-[0_1px_4px_rgba(10,25,80,0.3)]'
                  }`}>
                    {mensaje.editado && <span className="italic">editado</span>}
                    <span>{hora}</span>
                    {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-end justify-between gap-2">
                  <p className="text-[15px] lg:text-[14px] leading-relaxed wrap-break-word whitespace-pre-wrap font-medium">
                    <TextoConEnlaces texto={mensaje.contenido} tamañoEmoji={26} esMio={esMio} />
                    {!mensaje.respuestaA && (
                      <span className={`inline-flex items-center gap-0.5 align-bottom ml-1.5 translate-y-[5px] text-[11px] lg:text-[11px] ${esMio ? 'text-white/70' : 'text-white/55'}`}>
                        {mensaje.editado && <span className="italic">editado</span>}
                        <span>{hora}</span>
                        {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                      </span>
                    )}
                  </p>
                  {mensaje.respuestaA && (
                    <span className={`inline-flex items-center gap-0.5 shrink-0 text-[11px] lg:text-[11px] mb-0.5 ${esMio ? 'text-white/70' : 'text-white/55'}`}>
                      {mensaje.editado && <span className="italic">editado</span>}
                      <span>{hora}</span>
                      {esMio && !esMisNotas && <Palomitas estado={mensaje.estado} />}
                    </span>
                  )}
                </div>
                {primeraUrl && <PreviewEnlace url={primeraUrl} esMio={esMio} />}
              </>
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

        {/* Pills de reacciones visibles.
            Normalización defensiva: contamos reactores únicos por tupla
            `(id, sucursalId)` en vez de confiar en `r.cantidad` que puede
            quedar desactualizado si algo agrega duplicados al state. */}
        {mensaje.reacciones && mensaje.reacciones.length > 0 && (
          <div className={`flex flex-wrap gap-1 -mt-1 relative z-10 ${esMio ? 'justify-end pr-2' : 'justify-start pl-2'}`}>
            {mensaje.reacciones.map((r) => {
              const seen = new Set<string>();
              for (const u of r.usuarios as (string | { id: string; sucursalId?: string | null })[]) {
                const uid = typeof u === 'string' ? u : u.id;
                const usuc = typeof u === 'string' ? '' : (u.sucursalId ?? '');
                seen.add(`${uid}|${usuc}`);
              }
              const cantidadReal = seen.size;
              if (cantidadReal === 0) return null;
              return (
                <button
                  key={r.emoji}
                  onClick={() => onReaccionar?.(mensaje.id, r.emoji)}
                  className={`inline-flex items-center justify-center rounded-full cursor-pointer hover:scale-110 shadow-sm border ${cantidadReal > 1 ? 'gap-0.5 px-1.5 h-7' : 'w-7 h-7'} ${esMio
                    ? 'bg-blue-100 border-blue-300'
                    : 'bg-[linear-gradient(135deg,#0f2a6b,#0a1d4e)] border-blue-900/50'
                  }`}
                >
                  <EmojiNoto emoji={r.emoji} tamaño={18} />
                  {cantidadReal > 1 && (
                    <span className="text-[11px] font-bold text-gray-500">
                      {cantidadReal}
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
    prev.miId === next.miId &&
    prev.onResponder === next.onResponder &&
    prev.avatarEmisor === next.avatarEmisor &&
    prev.inicialesEmisor === next.inicialesEmisor
  );
});

// =============================================================================
// SUBCOMPONENTE: Palomitas de estado
// =============================================================================

function Palomitas({ estado, variante = 'burbuja' }: { estado: 'enviado' | 'entregado' | 'leido' | 'fallido'; variante?: 'burbuja' | 'emoji' }) {
  const gris = variante === 'emoji';
  const escala = 'scale-y-[1.1]';
  switch (estado) {
    case 'leido':
      return <CheckCheck className={`w-4 h-4 ${escala} ${gris ? 'text-sky-500' : 'text-sky-300'}`} />;
    case 'entregado':
      return <CheckCheck className={`w-4 h-4 ${escala} ${gris ? 'text-gray-500' : 'text-white/55'}`} />;
    case 'fallido':
      return <AlertCircle className={`w-4 h-4 ${escala} ${gris ? 'text-red-500' : 'text-red-300'}`} />;
    case 'enviado':
    default:
      return <Check className={`w-4 h-4 ${escala} ${gris ? 'text-gray-500' : 'text-white/55'}`} />;
  }
}

export default BurbujaMensaje;