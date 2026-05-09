import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePortalTarget } from '../../hooks/usePortalTarget';
import { useBackNativo } from '../../hooks/useBackNativo';

interface ModalImagenesProps {
  /** Array de URLs de imágenes */
  images: string[];
  /** Índice inicial de la imagen a mostrar (0-based) */
  initialIndex?: number;
  /** Controla si el modal está abierto */
  isOpen: boolean;
  /** Función para cerrar el modal */
  onClose: () => void;
}

export const ModalImagenes = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose
}: ModalImagenesProps) => {
  const [indiceActual, setIndiceActual] = useState(initialIndex);
  const scrollYRef = useRef(0);
  const [cerrando, setCerrando] = useState(false);

  // Portal target: document.body (default) o un contenedor del preview/ChatYA
  const portalTarget = usePortalTarget();
  const esContenido = portalTarget !== document.body;

  // Touch/swipe
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const [offsetPx, setOffsetPx] = useState(0);
  const [enTransicion, setEnTransicion] = useState(false);

  /** Cerrar con animación de salida — todos los puntos de cierre pasan por aquí */
  const cerrarConAnimacion = useCallback(() => {
    if (cerrando) return;
    setCerrando(true);
    setTimeout(() => {
      setCerrando(false);
      onClose();
    }, 180);
  }, [cerrando, onClose]);

  // Back nativo del celular / swipe iOS / flecha atrás del navegador.
  // Discriminador `_modalImagenes` para que pueda anidarse sobre otros
  // modales (ej. ModalArticuloDetalle) sin que el back los confunda.
  // `abierto: isOpen && !cerrando` — al iniciar la animación de cierre
  // (cerrando=true) el hook detecta que ya no está abierto y limpia la
  // entrada del history en su cleanup, antes de que el padre desmonte
  // este componente. Esto cubre los 3 caminos de cierre: X, backdrop y
  // back nativo, todos terminan llamando `cerrarConAnimacion`.
  useBackNativo({
    abierto: isOpen && !cerrando,
    onCerrar: cerrarConAnimacion,
    discriminador: '_modalImagenes',
  });

  // Sincronizar índice actual cuando cambia initialIndex
  useEffect(() => {
    if (isOpen) {
      setIndiceActual(initialIndex);
    }
  }, [initialIndex, isOpen]);

  // Bloquear scroll del body solo cuando el modal es fullscreen (portal a body).
  // En modo contenido (preview/ChatYA) no bloqueamos el scroll del documento principal.
  useEffect(() => {
    if (isOpen && !esContenido) {
      const esScanYA = window.location.pathname.startsWith('/scanya');
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      if (!esScanYA) {
        document.documentElement.style.overflow = 'hidden';
      }
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (!esScanYA) {
          document.documentElement.style.overflow = '';
        }
        window.scrollTo(0, scrollYRef.current);
      };
    }
  }, [isOpen, esContenido]);

  const imagenAnterior = useCallback(() => {
    setIndiceActual((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const imagenSiguiente = useCallback(() => {
    setIndiceActual((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // Teclado (ESC, flechas)
  useEffect(() => {
    if (!isOpen) return;
    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarConAnimacion();
      else if (e.key === 'ArrowLeft' && images.length > 1) imagenAnterior();
      else if (e.key === 'ArrowRight' && images.length > 1) imagenSiguiente();
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [isOpen, images.length, cerrarConAnimacion, imagenAnterior, imagenSiguiente]);

  // Swipe táctil
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    touchDeltaX.current = dx;
    if (images.length > 1) {
      // Resistencia en los bordes
      if ((indiceActual === 0 && dx > 0) || (indiceActual === images.length - 1 && dx < 0)) {
        setOffsetPx(dx * 0.2);
      } else {
        setOffsetPx(dx);
      }
    }
  }, [images.length, indiceActual]);

  const handleTouchEnd = useCallback(() => {
    const delta = touchDeltaX.current;
    touchDeltaX.current = 0;

    if (images.length <= 1 || Math.abs(delta) < 60) {
      // Snap back
      setEnTransicion(true);
      setOffsetPx(0);
      setTimeout(() => setEnTransicion(false), 150);
      return;
    }

    if (delta > 60 && indiceActual > 0) {
      setEnTransicion(true);
      setOffsetPx(window.innerWidth);
      setTimeout(() => {
        setEnTransicion(false);
        setOffsetPx(0);
        setIndiceActual((prev) => prev - 1);
      }, 150);
    } else if (delta < -60 && indiceActual < images.length - 1) {
      setEnTransicion(true);
      setOffsetPx(-window.innerWidth);
      setTimeout(() => {
        setEnTransicion(false);
        setOffsetPx(0);
        setIndiceActual((prev) => prev + 1);
      }, 150);
    } else {
      setEnTransicion(true);
      setOffsetPx(0);
      setTimeout(() => setEnTransicion(false), 150);
    }
  }, [indiceActual, images.length]);

  // Descargar imagen
  const [descargando, setDescargando] = useState(false);
  const descargarImagen = useCallback(async () => {
    if (descargando) return;
    setDescargando(true);
    try {
      const url = images[indiceActual];
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
      const nombre = `imagen_${Date.now()}.${extension}`;
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(images[indiceActual], '_blank');
    } finally {
      setDescargando(false);
    }
  }, [images, indiceActual, descargando]);

  if (!isOpen) return null;

  const hayMultiplesImagenes = images.length > 1;

  // En modo contenido (preview/ChatYA), el modal se posiciona `absolute` relativo al
  // contenedor del portal. En modo normal (fullscreen del viewport), usa `fixed`.
  const claseBase = esContenido ? 'absolute' : 'fixed';

  return createPortal(
    <div className={`${claseBase} inset-0 z-9999`}>
      {/* Overlay */}
      <div
        onClick={cerrarConAnimacion}
        className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.75)_100%)] ${cerrando ? 'animate-[fadeOut_0.18s_ease-out_forwards]' : 'animate-[fadeIn_0.2s_ease-in]'}`}
      />

      {/* Contenedor centrado */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={cerrarConAnimacion}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative overflow-hidden rounded-lg shadow-2xl ${cerrando ? 'animate-[scaleOut_0.18s_ease-in_forwards]' : 'animate-[scaleIn_0.2s_ease-out]'}`}
          style={{
            transform: `translateX(${offsetPx}px)`,
            transition: enTransicion ? 'transform 150ms ease-out' : 'none',
          }}
        >
          {/* Imagen principal.
              En modo contenido (preview/ChatYA) usamos max-w/max-h-full respecto al wrapper del modal,
              para que la imagen se ajuste al panel sin desbordar. En modo normal (fullscreen) mantenemos
              los viewport-based vw/vh. */}
          <img
            src={images[indiceActual]}
            alt={`Imagen ${indiceActual + 1} de ${images.length}`}
            className={`${esContenido ? 'max-w-full max-h-full' : 'max-w-[85vw] max-h-[55vh] lg:max-w-[50vw] lg:max-h-[45vh] 2xl:max-w-[60vw] 2xl:max-h-[55vh]'} object-contain select-none`}
            draggable={false}
          />

          {/* Botón X */}
          <button
            onClick={cerrarConAnimacion}
            className="absolute top-2.5 right-2.5 lg:top-2 lg:right-2 2xl:top-2.5 2xl:right-2.5 w-9 h-9 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 bg-black/50 hover:bg-red-500 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-100 hover:scale-105 active:scale-95 cursor-pointer z-10"
            aria-label="Cerrar"
          >
            <svg className="w-4.5 h-4.5 lg:w-3.5 lg:h-3.5 2xl:w-4.5 2xl:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Botón Descargar */}
          <button
            onClick={descargarImagen}
            disabled={descargando}
            className="absolute bottom-3 right-3 lg:bottom-2.5 lg:right-2.5 2xl:bottom-3 2xl:right-3 w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 bg-emerald-600 hover:bg-emerald-700 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-100 hover:scale-105 active:scale-95 cursor-pointer z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Descargar imagen"
          >
            {descargando ? (
              <div className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
              </svg>
            )}
          </button>

          {/* Indicador de posición — mismo estilo que el badge del carousel
              en el detalle del artículo (GaleriaArticulo): pill negro
              translúcido con backdrop-blur. Va en bottom-left para no
              chocar con el botón de descargar (bottom-right). */}
          {hayMultiplesImagenes && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
              {indiceActual + 1}/{images.length}
            </div>
          )}
        </div>
      </div>

      {/* Animaciones */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scaleIn { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes scaleOut { from { transform: scale(1); opacity: 1; } to { transform: scale(0.92); opacity: 0; } }
      `}</style>
    </div>,
    portalTarget
  );
};
