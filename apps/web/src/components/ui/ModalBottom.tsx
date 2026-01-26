/**
 * ModalBottom.tsx
 * ================
 * Modal tipo "Bottom Sheet" que aparece desde abajo.
 *
 * ¿Qué hace?
 * - Aparece desde abajo con animación de rebote
 * - Se cierra al hacer clic fuera (opcional)
 * - Se cierra con tecla Escape (opcional)
 * - Se cierra arrastrando hacia abajo (gesto drag)
 * - Bloquea scroll del body cuando está abierto
 * - Altura máxima del 65% de la pantalla
 *
 * Uso:
 *   <ModalBottom
 *     abierto={mostrar}
 *     onCerrar={() => setMostrar(false)}
 *     titulo="Mi Modal"
 *   >
 *     <p>Contenido del modal</p>
 *   </ModalBottom>
 *
 * Ubicación: apps/web/src/components/ui/ModalBottom.tsx
 */

import { ReactNode, useEffect, useCallback, useState, useRef } from 'react';
import { X } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalBottomProps {
  /** ¿Está abierto? */
  abierto: boolean;
  /** Función para cerrar el modal */
  onCerrar: () => void;
  /** Título del modal (opcional) */
  titulo?: string;
  /** Icono junto al título (opcional) */
  iconoTitulo?: ReactNode;
  /** Contenido del modal */
  children: ReactNode;
  /** ¿Cerrar al hacer clic fuera? */
  cerrarAlClickFuera?: boolean;
  /** ¿Cerrar con tecla Escape? */
  cerrarConEscape?: boolean;
  /** ¿Mostrar botón de cerrar (X)? */
  mostrarBotonCerrar?: boolean;
  /** ¿Mostrar header? */
  mostrarHeader?: boolean;
  /** ¿Desactivar scroll interno? (para manejar scroll en el children) */
  sinScrollInterno?: boolean;
  /** Altura máxima del modal: 'sm' (50vh), 'md' (60vh), 'lg' (65vh) */
  alturaMaxima?: 'sm' | 'md' | 'lg';
  /** Clases CSS adicionales para el contenedor */
  className?: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/** Distancia mínima de drag para cerrar el modal (px) */
const UMBRAL_CIERRE = 100;

/** Duración de las animaciones (ms) */
const DURACION_ANIMACION = 300;

/** Mapa de alturas máximas */
const ALTURAS_MAXIMAS = {
  sm: 'max-h-[50vh]',
  md: 'max-h-[60vh]',
  lg: 'max-h-[65vh]',
} as const;

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalBottom({
  abierto,
  onCerrar,
  titulo,
  iconoTitulo,
  children,
  cerrarAlClickFuera = true,
  cerrarConEscape = true,
  mostrarBotonCerrar = true,
  mostrarHeader = true,
  sinScrollInterno = false,
  alturaMaxima = 'lg',
  className = '',
}: ModalBottomProps) {
  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [cerrando, setCerrando] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Referencias
  const modalRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const scrollYRef = useRef(0);

  // ---------------------------------------------------------------------------
  // Handlers de cierre
  // ---------------------------------------------------------------------------

  const handleCerrar = useCallback(() => {
    setCerrando(true);
    setTimeout(() => {
      setCerrando(false);
      setDragY(0);
      onCerrar();
    }, DURACION_ANIMACION);
  }, [onCerrar]);

  // Tecla Escape
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cerrarConEscape && !cerrando) {
        handleCerrar();
      }
    },
    [cerrarConEscape, handleCerrar, cerrando]
  );

  // Click en overlay
  const handleClickOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && cerrarAlClickFuera && !cerrando) {
      handleCerrar();
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers de Drag (Mouse)
  // ---------------------------------------------------------------------------

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaY = e.clientY - startYRef.current;
      // Solo permitir arrastrar hacia abajo (valores positivos)
      if (deltaY > 0) {
        setDragY(deltaY);
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // Si superó el umbral, cerrar
    if (dragY > UMBRAL_CIERRE) {
      handleCerrar();
    } else {
      // Snap back con animación
      setDragY(0);
    }
  }, [isDragging, dragY, handleCerrar]);

  // ---------------------------------------------------------------------------
  // Handlers de Drag (Touch)
  // ---------------------------------------------------------------------------

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging) return;
      
      const deltaY = e.touches[0].clientY - startYRef.current;
      if (deltaY > 0) {
        setDragY(deltaY);
      }
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (dragY > UMBRAL_CIERRE) {
      handleCerrar();
    } else {
      setDragY(0);
    }
  }, [isDragging, dragY, handleCerrar]);

  // ---------------------------------------------------------------------------
  // Efectos
  // ---------------------------------------------------------------------------

  // Bloquear scroll y escuchar eventos
  useEffect(() => {
    if (abierto) {
      // Guardar posición del scroll
      scrollYRef.current = window.scrollY;
      
      // Bloquear scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Event listeners
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        // Restaurar scroll
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollYRef.current);
        
        // Remover listeners
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [abierto, handleEscape, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!abierto) return null;

  const deberiasMostrarHeader = mostrarHeader && (titulo || mostrarBotonCerrar);

  // Calcular opacidad del overlay basada en el drag
  const opacidadOverlay = Math.max(0.5 - (dragY / 400), 0.1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 transition-opacity ${
          cerrando ? 'duration-300' : 'duration-200'
        }`}
        style={{ 
          backgroundColor: `rgba(0, 0, 0, ${cerrando ? 0 : opacidadOverlay})` 
        }}
        onClick={handleClickOverlay}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`
          relative w-full max-w-lg lg:max-w-md 2xl:max-w-lg
          bg-white rounded-t-3xl lg:rounded-t-2xl 2xl:rounded-t-3xl
          shadow-2xl
          ${ALTURAS_MAXIMAS[alturaMaxima]}
          flex flex-col
          ${isDragging ? '' : 'transition-transform duration-300'}
          ${className}
        `}
        style={{
          transform: cerrando 
            ? 'translateY(100%)' 
            : `translateY(${dragY}px)`,
          animation: !cerrando && dragY === 0 && !isDragging
            ? 'slideUpBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle de drag */}
        <div
          className="flex justify-center py-3 lg:py-2 2xl:py-3 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="w-12 lg:w-10 2xl:w-12 h-1.5 lg:h-1 2xl:h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors" />
        </div>

        {/* Header */}
        {deberiasMostrarHeader && (
          <div className="flex items-center justify-between px-4 lg:px-3 2xl:px-4 pb-3 lg:pb-2 2xl:pb-3 border-b border-slate-100">
            {/* Título con icono */}
            {titulo && (
              <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5">
                {iconoTitulo && (
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    {iconoTitulo}
                  </div>
                )}
                <h2 className="text-lg lg:text-base 2xl:text-lg font-semibold text-slate-800">
                  {titulo}
                </h2>
              </div>
            )}

            {!titulo && <div />}

            {/* Botón cerrar */}
            {mostrarBotonCerrar && (
              <button
                onClick={handleCerrar}
                className="p-1.5 lg:p-1 2xl:p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
              </button>
            )}
          </div>
        )}

        {/* Contenido con scroll (opcional) */}
        <div 
          className={`
            flex-1 min-h-0
            ${sinScrollInterno 
              ? 'overflow-hidden flex flex-col' 
              : 'overflow-y-auto p-4 lg:p-3 2xl:p-4'
            }
          `}
        >
          {children}
        </div>
      </div>

      {/* Keyframes para la animación de entrada */}
      <style>{`
        @keyframes slideUpBounce {
          0% {
            transform: translateY(100%);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default ModalBottom;