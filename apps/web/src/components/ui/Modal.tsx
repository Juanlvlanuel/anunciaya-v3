/**
 * Modal.tsx
 * ==========
 * Modal genérico reutilizable.
 *
 * ¿Qué hace?
 * - Muestra contenido en un overlay oscuro
 * - Se cierra al hacer clic fuera (opcional)
 * - Se cierra con tecla Escape (opcional)
 * - Bloquea scroll del body cuando está abierto
 * - Animación de entrada/salida suave (FADE + SCALE)
 *
 * Uso:
 *   <Modal
 *     abierto={mostrar}
 *     onCerrar={() => setMostrar(false)}
 *     titulo="Mi Modal"
 *   >
 *     <p>Contenido del modal</p>
 *   </Modal>
 *
 * Ubicación: apps/web/src/components/ui/Modal.tsx
 */

import { ReactNode, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalProps {
  /** ¿Está abierto? */
  abierto: boolean;
  /** Función para cerrar el modal */
  onCerrar: () => void;
  /** Título del modal (opcional) - Acepta string o JSX */
  titulo?: ReactNode; // Acepta string o JSX
  /** Icono junto al título (opcional) */
  iconoTitulo?: ReactNode;
  /** Contenido del modal */
  children: ReactNode;
  /** Ancho máximo del modal */
  ancho?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** ¿Cerrar al hacer clic fuera? */
  cerrarAlClickFuera?: boolean;
  /** ¿Cerrar con tecla Escape? */
  cerrarConEscape?: boolean;
  /** ¿Mostrar botón de cerrar (X)? */
  mostrarBotonCerrar?: boolean;
  /** ¿Mostrar header? (se oculta si no hay título ni botón cerrar) */
  mostrarHeader?: boolean;
  /** Padding del contenido */
  paddingContenido?: 'none' | 'sm' | 'md' | 'lg';
  /** Clases CSS adicionales para el contenedor del modal */
  className?: string;
  /** Clase de z-index para el wrapper (default: 'z-50'). Usar z-90 para modales sobre ChatYA */
  zIndice?: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * Anchos del modal (responsive: mobile → lg: → 2xl:)
 */
const anchos = {
  sm: 'max-w-[280px] lg:max-w-sm 2xl:max-w-md',
  md: 'max-w-[320px] lg:max-w-md 2xl:max-w-lg',
  lg: 'max-w-sm lg:max-w-lg 2xl:max-w-xl',
  xl: 'max-w-md lg:max-w-xl 2xl:max-w-2xl',
  full: 'max-w-lg lg:max-w-2xl 2xl:max-w-3xl',
};

/**
 * Padding del contenido (responsive: mobile → lg: → 2xl:)
 */
const paddings = {
  none: 'p-0',
  sm: 'p-3 lg:p-4 2xl:p-5',
  md: 'p-4 lg:p-5 2xl:p-6',
  lg: 'p-5 lg:p-6 2xl:p-7',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function Modal({
  abierto,
  onCerrar,
  titulo,
  iconoTitulo,
  children,
  ancho = 'md',
  cerrarAlClickFuera = true,
  cerrarConEscape = true,
  mostrarBotonCerrar = true,
  mostrarHeader = true,
  paddingContenido = 'md',
  className = '',
  zIndice = 'z-50',
}: ModalProps) {
  // ---------------------------------------------------------------------------
  // Estado para animación de salida
  // ---------------------------------------------------------------------------
  const [cerrando, setCerrando] = useState(false);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  // Función de cierre con animación
  const handleCerrar = useCallback(() => {
    setCerrando(true);
    // Esperar a que termine la animación (200ms) antes de cerrar
    setTimeout(() => {
      setCerrando(false);
      onCerrar();
    }, 200);
  }, [onCerrar]);

  // Manejar tecla Escape
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && cerrarConEscape && !cerrando) {
        handleCerrar();
      }
    },
    [cerrarConEscape, handleCerrar, cerrando]
  );

  // Manejar clic en el overlay
  const handleClickOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && cerrarAlClickFuera && !cerrando) {
      handleCerrar();
    }
  };

  // ---------------------------------------------------------------------------
  // Efectos
  // ---------------------------------------------------------------------------

  // Bloquear scroll y escuchar Escape
  useEffect(() => {
    if (abierto) {
      // Guardar posición actual del scroll
      const scrollY = window.scrollY;

      // Bloquear scroll de forma robusta (funciona en iOS Safari también)
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      // Escuchar Escape
      document.addEventListener('keydown', handleEscape);

      return () => {
        // Restaurar estilos del body
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';

        // Restaurar posición del scroll
        window.scrollTo(0, scrollY);

        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [abierto, handleEscape]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // No renderizar si no está abierto
  if (!abierto) return null;

  // ¿Mostrar header?
  const deberiasMostrarHeader = mostrarHeader && (titulo || mostrarBotonCerrar);

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndice} flex items-center justify-center p-3 lg:p-6 2xl:p-8`}
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay oscuro con animación */}
      <div
        className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0.75)_100%)] duration-200 ${cerrando ? 'animate-out fade-out' : 'animate-in fade-in'
          }`}
        onClick={handleClickOverlay}
      />

      {/* Contenedor del modal con animación FADE + SCALE */}
      <div
        className={`
          relative w-full ${anchos[ancho]}
          bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl shadow-xl
          max-h-[85vh] lg:max-h-[90vh] overflow-hidden
          flex flex-col
          duration-200
          ${cerrando ? 'animate-out fade-out zoom-out-95' : 'animate-in fade-in zoom-in-95'}
          ${className}
        `}
      >
        {/* Header */}
        {deberiasMostrarHeader && (
          <div className="flex items-center justify-between p-3 lg:p-4 2xl:p-5 border-b border-slate-100">
            {/* Título con icono opcional */}
            {titulo && (
              <div className="flex items-center gap-2 lg:gap-2.5 2xl:gap-3">
                {iconoTitulo}
                <h2 className="text-sm lg:text-base 2xl:text-lg font-bold text-slate-900">{titulo}</h2>
              </div>
            )}

            {/* Espaciador si no hay título */}
            {!titulo && <div />}

            {/* Botón cerrar */}
            {mostrarBotonCerrar && (
              <button
                onClick={handleCerrar}
                className="p-1 lg:p-1.5 2xl:p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-5 2xl:h-5" />
              </button>
            )}
          </div>
        )}

        {/* Contenido con scroll */}
        <div className={`${paddings[paddingContenido]} flex-1 min-h-0 overflow-y-auto`}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;