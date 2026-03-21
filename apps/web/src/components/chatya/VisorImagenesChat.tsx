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
import { useBreakpoint } from '../../hooks/useBreakpoint';

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
  const { esMobile } = useBreakpoint();
  const [indice, setIndice] = useState(indiceInicial);
  const [imagenCargada, setImagenCargada] = useState(() => {
    const msg = imagenesChat[indiceInicial];
    if (!msg) return false;
    const d = parsearImagen(msg.contenido);
    if (!d?.url) return false;
    const img = new Image();
    img.src = d.url;
    return img.complete && img.naturalHeight > 0;
  });
  const [emojiPickerAbierto, setEmojiPickerAbierto] = useState(false);
  const thumbsRef = useRef<HTMLDivElement>(null);

  // Touch/swipe para imagen principal (NO thumbnails)
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const touchDeltaY = useRef(0);
  const swiping = useRef(false);
  const swipeDireccion = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const animandoRef = useRef(false);
  const containerWidthRef = useRef(0);

  // Estado para animación horizontal (cambiar imagen)
  const [offsetPx, setOffsetPx] = useState(0);
  const [enTransicion, setEnTransicion] = useState(false);

  // Estado para swipe vertical (cerrar visor)
  const [offsetY, setOffsetY] = useState(0);
  const [enTransicionY, setEnTransicionY] = useState(false);

  // Animación de apertura (solo mobile)
  const [abierto, setAbierto] = useState(!esMobile);
  const [entradaCompleta, setEntradaCompleta] = useState(!esMobile);
  useEffect(() => {
    if (!esMobile) { setAbierto(true); setEntradaCompleta(true); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => setAbierto(true)));
    const timer = setTimeout(() => setEntradaCompleta(true), 220);
    return () => clearTimeout(timer);
  }, []);

  // Progreso de transición (0 = centro, 1 = fuera) para efectos de oscurecimiento y zoom
  const w = containerWidthRef.current || window.innerWidth || 1;
  const progreso = Math.min(Math.abs(offsetPx) / w, 1);
  const escalaSalida = 1 - progreso * 0.3; // 1 → 0.7
  const oscuridadSalida = progreso * 0.85;  // 0 → 0.85

  // Progreso vertical para cerrar (opacidad del fondo)
  const progresoY = Math.min(Math.abs(offsetY) / 300, 1);
  const opacidadFondo = 1 - progresoY * 0.7;
  const escalaVertical = 1 - progresoY * 0.15;

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

  // Reset al cambiar de imagen (detectar si ya está en caché del browser)
  useEffect(() => {
    setEmojiPickerAbierto(false);
    if (datosImagen?.url) {
      const img = new Image();
      img.src = datosImagen.url;
      setImagenCargada(img.complete && img.naturalHeight > 0);
    } else {
      setImagenCargada(false);
    }
  }, [indice, datosImagen?.url]);

  // Scroll thumbnail activo al centro
  useEffect(() => {
    const container = thumbsRef.current;
    if (!container) return;
    const thumb = container.children[indice] as HTMLElement | undefined;
    if (thumb) {
      thumb.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' });
    }
  }, [indice]);

  // ── Navegación: desktop instantánea, mobile con slide ──
  const navegarConSlide = useCallback((direccion: 'anterior' | 'siguiente') => {
    if (animandoRef.current) return;
    const nuevo = direccion === 'anterior' ? indice - 1 : indice + 1;
    if (nuevo < 0 || nuevo >= imagenesChat.length) return;

    if (!esMobile) {
      setIndice(nuevo);
      return;
    }

    animandoRef.current = true;
    const w = containerWidthRef.current || window.innerWidth;
    const destino = direccion === 'anterior' ? w : -w;

    setEnTransicion(true);
    setOffsetPx(destino);

    setTimeout(() => {
      setEnTransicion(false);
      setOffsetPx(0);
      setIndice(nuevo);
      animandoRef.current = false;
    }, 120);
  }, [indice, imagenesChat.length, esMobile]);

  const irAnterior = useCallback(() => navegarConSlide('anterior'), [navegarConSlide]);
  const irSiguiente = useCallback(() => navegarConSlide('siguiente'), [navegarConSlide]);

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

  // ── Touch/Swipe con detección de dirección (horizontal=cambiar, vertical=cerrar) ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (animandoRef.current) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    swipeDireccion.current = 'none';
    swiping.current = true;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current || animandoRef.current) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    touchDeltaX.current = dx;
    touchDeltaY.current = dy;

    // Decidir dirección tras 8px de movimiento
    if (swipeDireccion.current === 'none') {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        swipeDireccion.current = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
      } else {
        return;
      }
    }

    if (swipeDireccion.current === 'horizontal') {
      if ((indice === 0 && dx > 0) || (indice === imagenesChat.length - 1 && dx < 0)) {
        setOffsetPx(dx * 0.2);
      } else {
        setOffsetPx(dx);
      }
    } else {
      setOffsetY(dy);
    }
  }, [indice, imagenesChat.length]);
  const handleTouchEnd = useCallback(() => {
    if (!swiping.current || animandoRef.current) return;
    swiping.current = false;
    const dir = swipeDireccion.current;
    swipeDireccion.current = 'none';

    if (dir === 'vertical') {
      const dy = touchDeltaY.current;
      touchDeltaY.current = 0;
      if (Math.abs(dy) > 120) {
        // Cerrar visor con animación
        setEnTransicionY(true);
        setOffsetY(dy > 0 ? window.innerHeight : -window.innerHeight);
        setTimeout(() => onCerrar(), 150);
      } else {
        // Snap back
        setEnTransicionY(true);
        setOffsetY(0);
        setTimeout(() => setEnTransicionY(false), 120);
      }
      return;
    }

    // Horizontal
    const delta = touchDeltaX.current;
    touchDeltaX.current = 0;
    const cw = containerWidthRef.current || window.innerWidth;

    if (delta > 60 && indice > 0) {
      animandoRef.current = true;
      setEnTransicion(true);
      setOffsetPx(cw);
      setTimeout(() => {
        setEnTransicion(false);
        setOffsetPx(0);
        setIndice((prev) => prev - 1);
        animandoRef.current = false;
      }, 120);
    } else if (delta < -60 && indice < imagenesChat.length - 1) {
      animandoRef.current = true;
      setEnTransicion(true);
      setOffsetPx(-cw);
      setTimeout(() => {
        setEnTransicion(false);
        setOffsetPx(0);
        setIndice((prev) => prev + 1);
        animandoRef.current = false;
      }, 120);
    } else {
      setEnTransicion(true);
      setOffsetPx(0);
      setTimeout(() => setEnTransicion(false), 100);
    }
  }, [indice, imagenesChat.length, onCerrar]);

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
    <div
      className="fixed inset-0 z-60 flex flex-col"
      style={esMobile ? {
        backgroundColor: `rgba(0,0,0,${abierto ? opacidadFondo * 0.95 : 0})`,
        transition: !entradaCompleta ? 'background-color 200ms ease-out' : (enTransicionY ? 'background-color 120ms ease-out' : 'none'),
      } : {
        backgroundColor: 'rgba(0,0,0,0.95)',
      }}
    >
      <div
        className="flex-1 flex flex-col min-h-0"
        style={esMobile ? {
          transform: abierto ? 'scale(1)' : 'scale(0.6)',
          opacity: abierto ? 1 : 0,
          transition: !entradaCompleta ? 'transform 200ms ease-out, opacity 200ms ease-out' : 'none',
        } : undefined}
      >
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
          <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden bg-slate-700 flex items-center justify-center">
            {emisor.avatarUrl ? (
              <img src={emisor.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white/80">{emisor.iniciales}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{emisor.nombre}</p>
            <p className="text-sm text-white/50 font-medium">{formatearFechaHora(mensajeActual.createdAt)}</p>
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
                <div className="absolute top-full right-0 mt-1 flex items-center gap-1 bg-slate-900/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-xl z-20">
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

      {/* ═══ ZONA DE IMAGEN ═══ */}
      {esMobile ? (
        /* ── MOBILE: Superposición + swipe + efectos ── */
        <div
          ref={(el) => { if (el) containerWidthRef.current = el.clientWidth; }}
          className={`flex-1 relative min-h-0 ${offsetY !== 0 ? 'overflow-visible' : 'overflow-hidden'}`}
          style={{
            transform: `translateY(${offsetY}px) scale(${escalaVertical})`,
            opacity: 1 - progresoY * 0.5,
            transition: enTransicionY ? 'transform 120ms ease-out, opacity 120ms ease-out' : 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Capa base: imagen actual (se achica y oscurece) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative max-w-full max-h-full flex items-center justify-center"
              style={{
                transform: `scale(${escalaSalida})`,
                transition: enTransicion ? 'transform 120ms ease-out' : 'none',
              }}
            >
              {datosImagen.miniatura && !imagenCargada && (
                <img
                  src={datosImagen.miniatura}
                  alt=""
                  className="absolute max-w-full max-h-full object-contain"
                  style={{ filter: 'blur(20px)', transform: 'scale(1.05)' }}
                  draggable={false}
                />
              )}
              <img
                key={datosImagen.url}
                src={datosImagen.url}
                alt={datosImagen.caption || 'Imagen'}
                className="max-w-full max-h-full object-contain select-none"
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
            {/* Overlay de oscurecimiento */}
            {progreso > 0 && (
              <div
                className="absolute inset-0 bg-black pointer-events-none"
                style={{
                  opacity: oscuridadSalida,
                  transition: enTransicion ? 'opacity 120ms ease-out' : 'none',
                }}
              />
            )}
          </div>

          {/* Capa superior: imagen entrante (se desliza por encima) */}
          {offsetPx < 0 && indice < imagenesChat.length - 1 && (() => {
            const next = parsearImagen(imagenesChat[indice + 1].contenido);
            if (!next) return null;
            const posX = (containerWidthRef.current || window.innerWidth) + offsetPx;
            return (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translateX(${posX}px)`,
                  transition: enTransicion ? 'transform 120ms ease-out' : 'none',
                  willChange: 'transform',
                }}
              >
                <img src={next.url} alt="" className="max-w-full max-h-full object-contain select-none" draggable={false} />
              </div>
            );
          })()}
          {offsetPx > 0 && indice > 0 && (() => {
            const prev = parsearImagen(imagenesChat[indice - 1].contenido);
            if (!prev) return null;
            const posX = -(containerWidthRef.current || window.innerWidth) + offsetPx;
            return (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  transform: `translateX(${posX}px)`,
                  transition: enTransicion ? 'transform 120ms ease-out' : 'none',
                  willChange: 'transform',
                }}
              >
                <img src={prev.url} alt="" className="max-w-full max-h-full object-contain select-none" draggable={false} />
              </div>
            );
          })()}
        </div>
      ) : (
        /* ── DESKTOP: Imagen simple con flechas ── */
        <div className="flex-1 relative flex items-center justify-center min-h-0 lg:px-16">
          {indice > 0 && (
            <button
              onClick={irAnterior}
              className="absolute left-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          <div className="relative max-w-full max-h-full flex items-center justify-center">
            {datosImagen.miniatura && !imagenCargada && (
              <img
                src={datosImagen.miniatura}
                alt=""
                className="absolute max-w-[80vw] max-h-[70vh] object-contain"
                style={{ filter: 'blur(20px)', transform: 'scale(1.05)' }}
                draggable={false}
              />
            )}
            <img
              key={datosImagen.url}
              src={datosImagen.url}
              alt={datosImagen.caption || 'Imagen'}
              className="max-w-[80vw] max-h-[70vh] object-contain select-none"
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
              className="absolute right-4 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}

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
                <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-slate-900/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-xl z-20">
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
        <p className="text-sm text-white/40 text-center pb-2 font-medium">
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
                  onClick={() => {
                    if (animandoRef.current) return;
                    setOffsetPx(0);
                    setEnTransicion(false);
                    setIndice(i);
                  }}
                  className={`shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-lg overflow-hidden cursor-pointer border-2 ${
                    esActivo ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={datos.url}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
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