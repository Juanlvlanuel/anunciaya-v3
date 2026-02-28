import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

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

  /** Cerrar con animación de salida — todos los puntos de cierre pasan por aquí */
  const cerrarConAnimacion = useCallback(() => {
    if (cerrando) return;
    setCerrando(true);
    setTimeout(() => {
      setCerrando(false);
      onClose();
    }, 180); // Duración de la animación de salida
  }, [cerrando, onClose]);

  // Sincronizar índice actual cuando cambia initialIndex
  useEffect(() => {
    if (isOpen) {
      setIndiceActual(initialIndex);
    }
  }, [initialIndex, isOpen]);

  // Bloquear scroll del body cuando el modal está abierto (solución robusta)
  useEffect(() => {
    if (isOpen) {
      // Detectar si estamos en ScanYA
      const esScanYA = window.location.pathname.startsWith('/scanya');
      
      // Guardar posición actual del scroll en el ref ANTES de aplicar estilos
      scrollYRef.current = window.scrollY;
      
      // Bloquear scroll del body
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      // Solo bloquear overflow del html si NO estamos en ScanYA
      // (en ScanYA ya está bloqueado por el componente padre)
      if (!esScanYA) {
        document.documentElement.style.overflow = 'hidden';
      }
      
      return () => {
        // Restaurar estilos del body
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // Solo restaurar overflow del html si NO estamos en ScanYA
        if (!esScanYA) {
          document.documentElement.style.overflow = '';
        }
        
        // Restaurar scroll a la posición guardada
        window.scrollTo(0, scrollYRef.current);
      };
    }
  }, [isOpen]);

  // Soporte para teclado (ESC para cerrar, flechas para navegar)
  useEffect(() => {
    if (!isOpen) return;

    const manejarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cerrarConAnimacion();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        imagenAnterior();
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        imagenSiguiente();
      }
    };

    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [isOpen, images.length, indiceActual, cerrarConAnimacion]);

  const imagenAnterior = () => {
    setIndiceActual((prev) => (prev - 1 + images.length) % images.length);
  };

  const imagenSiguiente = () => {
    setIndiceActual((prev) => (prev + 1) % images.length);
  };

  // Descargar imagen (fetch + blob para URLs cross-origin como R2/Cloudinary)
  const [descargando, setDescargando] = useState(false);
  const descargarImagen = useCallback(async () => {
    if (descargando) return;
    setDescargando(true);
    try {
      const url = images[indiceActual];
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Extraer extensión del URL o usar .jpg por defecto
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
      // Fallback: abrir en nueva pestaña
      window.open(images[indiceActual], '_blank');
    } finally {
      setDescargando(false);
    }
  }, [images, indiceActual, descargando]);

  if (!isOpen) return null;

  const hayMultiplesImagenes = images.length > 1;

  return createPortal(
    <div className="fixed inset-0 z-9999">
      {/* Overlay — Click fuera cierra */}
      <div
        onClick={cerrarConAnimacion}
        className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.75)_100%)] ${cerrando ? 'animate-[fadeOut_0.18s_ease-out_forwards]' : 'animate-[fadeIn_0.2s_ease-in]'}`}
      />

      {/* Contenedor centrado */}
      <div className="relative w-full h-full flex items-center justify-center p-4 pointer-events-none">
        {/* Contenedor de imagen + controles */}
        <div className={`relative pointer-events-auto overflow-hidden rounded-lg shadow-2xl ${cerrando ? 'animate-[scaleOut_0.18s_ease-in_forwards]' : 'animate-[scaleIn_0.2s_ease-out]'}`}>
          {/* Imagen principal */}
          <img
            src={images[indiceActual]}
            alt={`Imagen ${indiceActual + 1} de ${images.length}`}
            className="max-w-[85vw] max-h-[55vh] lg:max-w-[50vw] lg:max-h-[45vh] 2xl:max-w-[60vw] 2xl:max-h-[55vh] object-contain"
          />

          {/* Botón X (esquina superior derecha, dentro de la imagen) */}
          <button
            onClick={cerrarConAnimacion}
            className="absolute top-2.5 right-2.5 lg:top-2 lg:right-2 2xl:top-2.5 2xl:right-2.5 w-9 h-9 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 bg-black/50 hover:bg-red-500 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-100 hover:scale-105 active:scale-95 cursor-pointer z-10"
            aria-label="Cerrar"
          >
            <svg
              className="w-4.5 h-4.5 lg:w-3.5 lg:h-3.5 2xl:w-4.5 2xl:h-4.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Botón Descargar (esquina inferior derecha, dentro de la imagen) */}
          <button
            onClick={descargarImagen}
            disabled={descargando}
            className="absolute bottom-3 right-3 lg:bottom-2.5 lg:right-2.5 2xl:bottom-3 2xl:right-3 w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 bg-green-500 hover:bg-green-600 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-100 hover:scale-105 active:scale-95 cursor-pointer z-10 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Descargar imagen"
          >
            {descargando ? (
              <div className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4"
                />
              </svg>
            )}
          </button>

          {/* Flecha Izquierda (solo si hay múltiples imágenes) */}
          {hayMultiplesImagenes && (
            <button
              onClick={imagenAnterior}
              className="absolute left-2 lg:left-1 2xl:left-2 top-1/2 -translate-y-1/2 w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 bg-white hover:bg-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:text-gray-900 transition-all duration-100 hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Imagen anterior"
            >
              <svg
                className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Flecha Derecha (solo si hay múltiples imágenes) */}
          {hayMultiplesImagenes && (
            <button
              onClick={imagenSiguiente}
              className="absolute right-2 lg:right-1 2xl:right-2 top-1/2 -translate-y-1/2 w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 bg-white hover:bg-gray-100 rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:text-gray-900 transition-all duration-100 hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Imagen siguiente"
            >
              <svg
                className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Indicador de posición (ej: 3 / 8) - solo si hay múltiples imágenes */}
          {hayMultiplesImagenes && (
            <div className="absolute bottom-4 lg:bottom-3 2xl:bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-full text-sm lg:text-xs 2xl:text-sm font-medium">
              {indiceActual + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Animaciones de entrada y salida */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.92); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.92); opacity: 0; }
        }
      `}</style>
    </div>,
    document.body
  );
};