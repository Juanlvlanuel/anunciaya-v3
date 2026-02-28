/**
 * VisorImagenesChat.tsx
 * ======================
 * Visor fullscreen de imágenes del chat, estilo WhatsApp.
 *
 * LAYOUT DESKTOP:
 * ┌──────────────────────────────────────────────────────────────┐
 * │  [←] Emisor  Fecha   [😊] [↩] [⬇] [↪] [📌]               │
 * ├──────────────────────────────────────────────────────────────┤
 * │                    ←   IMAGEN   →                           │
 * ├──────────────────────────────────────────────────────────────┤
 * │  Caption · Contador · [thumbnails]                          │
 * └──────────────────────────────────────────────────────────────┘
 *
 * LAYOUT MÓVIL:
 * ┌──────────────────────────────────────────────────────────────┐
 * │  [←] Emisor  Fecha                    [⬇] [↪] [📌]        │
 * ├──────────────────────────────────────────────────────────────┤
 * │                    ←   IMAGEN   →                           │
 * ├──────────────────────────────────────────────────────────────┤
 * │  [😊]                               [↩ Responder]          │
 * │  Caption · Contador · [thumbnails]                          │
 * └──────────────────────────────────────────────────────────────┘
 *
 * UBICACIÓN: apps/web/src/components/chatya/VisorImagenesChat.tsx
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Download, Forward, Reply,
  Pin, PinOff, SmilePlus, X,
} from 'lucide-react';
import { EmojiNoto } from './EmojiNoto';
import type { Mensaje } from '../../types/chatya';

// =============================================================================
// CONSTANTES
// =============================================================================

const EMOJIS_RAPIDOS = ['👍', '❤️', '😂', '😮', '😢'];

// =============================================================================
// TIPOS
// =============================================================================

interface ContenidoImagenParsed {
  url: string;
  ancho: number;
  alto: number;
  miniatura?: string;
  caption?: string;
}

interface DatosParticipante {
  nombre: string;
  avatarUrl: string | null;
  iniciales: string;
}

interface VisorImagenesChatProps {
  imagenesChat: Mensaje[];
  indiceInicial: number;
  miDatos: DatosParticipante;
  otroDatos: DatosParticipante;
  miId: string;
  mensajesFijadosIds: string[];
  esMisNotas: boolean;
  onResponder: (mensaje: Mensaje) => void;
  onReenviar: (mensaje: Mensaje) => void;
  onFijar: (mensajeId: string) => void;
  onDesfijar: (mensajeId: string) => void;
  onDescargar: (url: string, nombre: string) => void;
  onReaccionar: (mensajeId: string, emoji: string) => Promise<void>;
  onCerrar: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function parsearImagen(raw: string): ContenidoImagenParsed | null {
  try {
    const d = JSON.parse(raw);
    if (d?.url && d?.ancho && d?.alto) return d as ContenidoImagenParsed;
    return null;
  } catch {
    return null;
  }
}

function formatearFechaHora(fecha: string | Date): string {
  const d = new Date(fecha);
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function VisorImagenesChat({
  imagenesChat,
  indiceInicial,
  miDatos,
  otroDatos,
  miId,
  mensajesFijadosIds,
  esMisNotas,
  onResponder,
  onReenviar,
  onFijar,
  onDesfijar,
  onDescargar,
  onReaccionar,
  onCerrar,
}: VisorImagenesChatProps) {
  const [indice, setIndice] = useState(indiceInicial);
  const [imagenCargada, setImagenCargada] = useState(false);
  const [emojiPickerAbierto, setEmojiPickerAbierto] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);

  // Touch/swipe para imagen principal (NO thumbnails)
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const swiping = useRef(false);

  // Mensaje e imagen actual
  const mensajeActual = imagenesChat[indice];
  const datosImagen = useMemo(
    () => (mensajeActual ? parsearImagen(mensajeActual.contenido) : null),
    [mensajeActual]
  );
  const estaFijado = mensajesFijadosIds.includes(mensajeActual?.id || '');

  // Datos del emisor de esta imagen específica
  const esMio = mensajeActual?.emisorId === miId;
  const emisor = esMio ? miDatos : otroDatos;

  // Reset al cambiar de imagen
  useEffect(() => {
    setImagenCargada(false);
    setEmojiPickerAbierto(false);
  }, [indice]);

  // Scroll thumbnail activo al centro
  useEffect(() => {
    const container = thumbsRef.current;
    if (!container) return;
    const thumb = container.children[indice] as HTMLElement | undefined;
    if (thumb) {
      thumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [indice]);

  // ── Navegación ──
  const irAnterior = useCallback(() => {
    setIndice((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);
  const irSiguiente = useCallback(() => {
    setIndice((prev) => (prev < imagenesChat.length - 1 ? prev + 1 : prev));
  }, [imagenesChat.length]);

  // ── Teclado ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (emojiPickerAbierto) setEmojiPickerAbierto(false);
        else onCerrar();
      }
      if (e.key === 'ArrowLeft') irAnterior();
      if (e.key === 'ArrowRight') irSiguiente();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCerrar, irAnterior, irSiguiente, emojiPickerAbierto]);

  // ── Bloquear scroll del body ──
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Touch/Swipe (solo zona de imagen, NO thumbnails) ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    swiping.current = true;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (!swiping.current) return;
    swiping.current = false;
    if (touchDeltaX.current > 60) irAnterior();
    else if (touchDeltaX.current < -60) irSiguiente();
    touchDeltaX.current = 0;
  }, [irAnterior, irSiguiente]);

  // ── Handlers ──
  const handleDescargar = useCallback(() => {
    if (!datosImagen) return;
    const ext = datosImagen.url.split('.').pop()?.split('?')[0] || 'jpg';
    onDescargar(datosImagen.url, `imagen_${indice + 1}.${ext}`);
  }, [datosImagen, indice, onDescargar]);

  const handleResponder = useCallback(() => {
    onCerrar();
    setTimeout(() => onResponder(mensajeActual), 100);
  }, [onCerrar, onResponder, mensajeActual]);

  const handleReenviar = useCallback(() => {
    onCerrar();
    setTimeout(() => onReenviar(mensajeActual), 100);
  }, [onCerrar, onReenviar, mensajeActual]);

  const handleFijar = useCallback(() => {
    if (estaFijado) onDesfijar(mensajeActual.id);
    else onFijar(mensajeActual.id);
  }, [estaFijado, onFijar, onDesfijar, mensajeActual]);

  const handleEmojiRapido = useCallback((emoji: string) => {
    onReaccionar(mensajeActual.id, emoji);
    setEmojiPickerAbierto(false);
  }, [onReaccionar, mensajeActual]);

  if (!mensajeActual || !datosImagen) return null;

  return createPortal(
    <div className="fixed inset-0 z-60 flex flex-col bg-black/95">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between px-2 py-2 bg-black/60 shrink-0">
        {/* Izquierda: ← + Avatar + Nombre/Fecha */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onCerrar}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden bg-gray-700 flex items-center justify-center">
            {emisor.avatarUrl ? (
              <img src={emisor.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white/80">{emisor.iniciales}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{emisor.nombre}</p>
            <p className="text-xs text-white/50">{formatearFechaHora(mensajeActual.createdAt)}</p>
          </div>
        </div>

        {/* Derecha: Acciones */}
        <div className="flex items-center gap-0.5">
          {/* Reaccionar + Responder — solo visibles en desktop (en móvil van en el footer) */}
          {!esMisNotas && (
            <div className="relative hidden lg:block">
              <BotonAccion titulo="Reaccionar" onClick={() => setEmojiPickerAbierto((v) => !v)}>
                <SmilePlus className="w-5 h-5" />
              </BotonAccion>
              {/* Popup emojis rápidos */}
              {emojiPickerAbierto && (
                <div className="absolute top-full right-0 mt-1 flex items-center gap-1 bg-gray-900/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-xl z-20">
                  {EMOJIS_RAPIDOS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiRapido(emoji)}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
                    >
                      <EmojiNoto emoji={emoji} tamaño={24} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!esMisNotas && (
            <div className="hidden lg:block">
              <BotonAccion titulo="Responder" onClick={handleResponder}>
                <Reply className="w-5 h-5" />
              </BotonAccion>
            </div>
          )}

          {/* Descargar + Reenviar + Fijar — siempre visibles */}
          <BotonAccion titulo="Descargar" onClick={handleDescargar}>
            <Download className="w-5 h-5" />
          </BotonAccion>
          {!esMisNotas && (
            <BotonAccion titulo="Reenviar" onClick={handleReenviar}>
              <Forward className="w-5 h-5" />
            </BotonAccion>
          )}
          {!esMisNotas && (
            <BotonAccion titulo={estaFijado ? 'Desfijar' : 'Fijar'} onClick={handleFijar}>
              {estaFijado ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5 rotate-45" />}
            </BotonAccion>
          )}

          {/* Cerrar (X) — solo desktop (en móvil se usa la flecha ←) */}
          <div className="hidden lg:block">
            <BotonAccion titulo="Cerrar" onClick={onCerrar}>
              <X className="w-5 h-5" />
            </BotonAccion>
          </div>
        </div>
      </div>

      {/* ═══ IMAGEN CENTRAL + flechas (swipe solo aquí) ═══ */}
      <div
        className="flex-1 relative flex items-center justify-center min-h-0 px-2 lg:px-16"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {indice > 0 && (
          <button
            onClick={irAnterior}
            className="absolute left-2 lg:left-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="relative max-w-full max-h-full flex items-center justify-center">
          {datosImagen.miniatura && !imagenCargada && (
            <img
              src={datosImagen.miniatura}
              alt=""
              className="absolute max-w-[90vw] max-h-[65vh] lg:max-w-[80vw] lg:max-h-[70vh] object-contain"
              style={{ filter: 'blur(20px)', transform: 'scale(1.05)' }}
              draggable={false}
            />
          )}
          <img
            key={datosImagen.url}
            src={datosImagen.url}
            alt={datosImagen.caption || 'Imagen'}
            className="max-w-[90vw] max-h-[65vh] lg:max-w-[80vw] lg:max-h-[70vh] object-contain select-none"
            style={{ opacity: imagenCargada ? 1 : 0 }}
            onLoad={() => setImagenCargada(true)}
            draggable={false}
          />
          {!imagenCargada && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {indice < imagenesChat.length - 1 && (
          <button
            onClick={irSiguiente}
            className="absolute right-2 lg:right-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ═══ FOOTER ═══ */}
      <div className="shrink-0 bg-black/60">
        {/* Reaccionar + Responder — solo en MÓVIL (en desktop están en el header) */}
        {!esMisNotas && (
          <div className="flex items-center justify-between px-4 pt-2 pb-1 lg:hidden">
            {/* Reaccionar */}
            <div className="relative">
              <button
                onClick={() => setEmojiPickerAbierto((v) => !v)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <SmilePlus className="w-6 h-6" />
              </button>
              {/* Popup emojis rápidos (móvil) */}
              {emojiPickerAbierto && (
                <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-gray-900/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-xl z-20">
                  {EMOJIS_RAPIDOS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiRapido(emoji)}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
                    >
                      <EmojiNoto emoji={emoji} tamaño={24} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Responder */}
            <button
              onClick={handleResponder}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <Reply className="w-5 h-5" />
              <span className="text-sm font-medium">Responder</span>
            </button>
          </div>
        )}

        {/* Caption */}
        {datosImagen.caption && (
          <p className="text-sm text-white/90 text-center px-6 pb-1 leading-relaxed">
            {datosImagen.caption}
          </p>
        )}

        {/* Contador */}
        <p className="text-xs text-white/40 text-center pb-2">
          {indice + 1} de {imagenesChat.length}
        </p>

        {/* Thumbnails — touch events aislados (NO cambian imagen principal al deslizar) */}
        {imagenesChat.length > 1 && (
          <div
            ref={thumbsRef}
            className="flex items-center gap-1.5 overflow-x-auto px-4 pb-4 pt-1 scrollbar-none"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {imagenesChat.map((msg, i) => {
              const datos = parsearImagen(msg.contenido);
              if (!datos) return null;
              const esActivo = i === indice;
              return (
                <button
                  key={msg.id}
                  onClick={() => setIndice(i)}
                  className={`shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                    esActivo ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={datos.url}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// =============================================================================
// SUBCOMPONENTE: Botón de acción
// =============================================================================

function BotonAccion({
  titulo,
  onClick,
  children,
}: {
  titulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={titulo}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
    >
      {children}
    </button>
  );
}

export default VisorImagenesChat;