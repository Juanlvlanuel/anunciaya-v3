/**
 * ChatOverlay.tsx - VERSIÓN REDISEÑADA v2.0
 * ==========================================
 * Overlay que muestra el chat de ChatYA.
 *
 * MEJORAS v2.0:
 * - Responsive correcto: móvil 75vh, laptop compacto (lg:), desktop espacioso (2xl:)
 * - Bloqueo de scroll del body en móvil cuando está abierto
 * - Swipe down con handle visual (barrita gris) para cerrar en móvil
 * - Handle evita confusión entre scroll de contenido y cierre del panel
 * - Botón minimizar funcional (solo muestra header) - SOLO EN DESKTOP
 * - Diseño visual mejorado con gradientes
 * - Comportamiento persistente (NO se cierra al navegar)
 * - Conectado al useUiStore para estado global
 *
 * Por ahora es placeholder. En fases posteriores se integrará
 * con el sistema real de chat (Socket.io + MongoDB).
 *
 * Ubicación: apps/web/src/components/layout/ChatOverlay.tsx
 */

import { useRef, useEffect, useState } from 'react';
import { X, Send, Minus, Maximize2 } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ChatOverlay() {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const chatYAAbierto = useUiStore((state) => state.chatYAAbierto);
  const chatYAMinimizado = useUiStore((state) => state.chatYAMinimizado);
  const cerrarChatYA = useUiStore((state) => state.cerrarChatYA);
  const minimizarChatYA = useUiStore((state) => state.minimizarChatYA);
  const abrirChatYA = useUiStore((state) => state.abrirChatYA);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null); // Ref para el handle de arrastre

  // ---------------------------------------------------------------------------
  // State para swipe/drag
  // ---------------------------------------------------------------------------
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragCurrentY, setDragCurrentY] = useState<number>(0);

  // ---------------------------------------------------------------------------
  // Conversaciones mock (vacío por defecto para mostrar mensaje de bienvenida)
  // Cambia a las conversaciones reales cuando implementes el backend
  // ---------------------------------------------------------------------------
  const conversacionesMock: Array<{
    nombre: string;
    mensaje: string;
    tiempo: string;
    noLeido?: number;
  }> = [
    // Descomenta estas líneas para ver las conversaciones en lugar del mensaje de bienvenida
    // { nombre: "Tacos El Güero", mensaje: "¡Hola! ¿En qué te puedo ayudar?", tiempo: "Hace 5 min", noLeido: 2 },
    // { nombre: "Farmacia San Juan", mensaje: "Tu pedido está listo para recoger", tiempo: "Hace 1 hora" },
    // { nombre: "Estética María", mensaje: "Tu cita ha sido confirmada para mañana", tiempo: "Ayer" },
  ];

  // ---------------------------------------------------------------------------
  // Effect: Bloquear scroll del body en móvil cuando está abierto y NO minimizado
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto || chatYAMinimizado) return;

    // Solo bloquear en móvil (< 1024px)
    if (window.innerWidth >= 1024) return;

    // Guardar posición actual del scroll
    const scrollY = window.scrollY;
    const body = document.body;

    // Guardar estilos originales
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalWidth = body.style.width;
    const originalOverflow = body.style.overflow;

    // Fijar el body en la posición actual
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    // Cleanup: Restaurar al cerrar o minimizar
    return () => {
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.width = originalWidth;
      body.style.overflow = originalOverflow;

      // Restaurar la posición del scroll
      window.scrollTo(0, scrollY);
    };
  }, [chatYAAbierto, chatYAMinimizado]);

  // ---------------------------------------------------------------------------
  // Effect: Swipe down para cerrar (solo móvil, NO minimizado, y solo desde el handle)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto || chatYAMinimizado) return;

    // Solo en móvil
    if (window.innerWidth >= 1024) return;

    const handle = handleRef.current;
    if (!handle) return;

    const handleTouchStart = (e: TouchEvent) => {
      setDragStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (dragStartY === null) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - dragStartY;

      // Solo permitir arrastrar hacia abajo
      if (diff > 0) {
        // IMPORTANTE: Prevenir pull-to-refresh del navegador (solo si es cancelable)
        if (e.cancelable) {
          e.preventDefault();
        }
        setDragCurrentY(diff);
      }
    };

    const handleTouchEnd = () => {
      if (dragStartY === null) return;

      // Si arrastró más de 100px hacia abajo, cerrar
      if (dragCurrentY > 100) {
        cerrarChatYA();
      }

      // Reset
      setDragStartY(null);
      setDragCurrentY(0);
    };

    // IMPORTANTE: Listeners solo en el HANDLE, no en todo el panel
    handle.addEventListener('touchstart', handleTouchStart, { passive: true });
    handle.addEventListener('touchmove', handleTouchMove, { passive: false });
    handle.addEventListener('touchend', handleTouchEnd);

    return () => {
      handle.removeEventListener('touchstart', handleTouchStart);
      handle.removeEventListener('touchmove', handleTouchMove);
      handle.removeEventListener('touchend', handleTouchEnd);
    };
  }, [chatYAAbierto, chatYAMinimizado, dragStartY, dragCurrentY, cerrarChatYA]);

  // ---------------------------------------------------------------------------
  // Effect: Cerrar al hacer click fuera (solo desktop)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto || chatYAMinimizado) return;

    // Solo en desktop
    if (window.innerWidth < 1024) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // No cerrar si el click es en el botón de ChatYA
      const esBotonChatYA = target.closest('[data-chatya-button="true"]') !== null;
      if (esBotonChatYA) {
        return;
      }

      // Cerrar si el click es fuera del panel
      if (panelRef.current && !panelRef.current.contains(target)) {
        cerrarChatYA();
      }
    };

    // Pequeño delay para evitar que se cierre inmediatamente
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [chatYAAbierto, chatYAMinimizado, cerrarChatYA]);

  // ---------------------------------------------------------------------------
  // Effect: Cerrar con ESC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cerrarChatYA();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [chatYAAbierto, cerrarChatYA]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleMaximizar = () => {
    abrirChatYA(); // Abre y maximiza
  };

  // ---------------------------------------------------------------------------
  // Si no está abierto, no renderizar nada
  // ---------------------------------------------------------------------------
  if (!chatYAAbierto) return null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Overlay oscuro solo en móvil y NO minimizado */}
      {!chatYAMinimizado && (
        <div
          className="fixed inset-0 bg-black/50 z-60 lg:hidden"
          onClick={cerrarChatYA}
        />
      )}

      {/* Panel del Chat */}
      <div
        ref={panelRef}
        style={{
          transform: !chatYAMinimizado ? `translateY(${dragCurrentY}px)` : undefined,
          transition: dragStartY !== null ? 'none' : 'all 0.15s',
        }}
        className={`
          fixed z-70
          bg-white shadow-2xl border border-gray-200
          flex flex-col
          overflow-hidden
          transition-all duration-150
          
          ${chatYAMinimizado ? `
            /* Minimizado: Solo header visible en la parte inferior */
            bottom-4 right-4
            w-80 lg:w-72 2xl:w-80
            h-14 lg:h-12 2xl:h-14
            rounded-xl
          ` : `
            /* Maximizado */
            /* Móvil: Desde abajo, altura FIJA 75vh */
            bottom-0 left-0 right-0
            h-[75vh]
            rounded-t-3xl
            
            /* Laptop: Panel lateral derecho compacto */
            lg:top-[70px] lg:right-4 lg:left-auto lg:bottom-auto
            lg:w-80 lg:h-[450px]
            lg:rounded-2xl
            
            /* Desktop: Panel lateral derecho espacioso */
            2xl:w-96 2xl:h-[550px]
          `}
        `}
      >
        {/* === HANDLE DE ARRASTRE (solo móvil y NO minimizado) === */}
        {!chatYAMinimizado && (
          <div
            ref={handleRef}
            className="lg:hidden flex items-center justify-center py-2 shrink-0 cursor-grab active:cursor-grabbing"
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
        )}

        {/* === HEADER === */}
        <div className="flex items-center justify-between px-4 py-2.5 lg:py-2 2xl:py-2.5 bg-linear-to-r from-blue-900 to-blue-600 text-white shrink-0">
          <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
            <img 
              src="/ChatYA.webp" 
              alt="ChatYA" 
              className={`
                w-auto object-contain max-w-[170px]
                ${chatYAMinimizado 
                  ? 'h-10 lg:h-9 2xl:h-10'  // Minimizado: un poco más pequeño (40px)
                  : 'h-12 lg:h-10 2xl:h-12'  // Maximizado: tamaño normal (48px)
                }
              `}
            />
            {/* Badge de mensajes nuevos (mock) */}
            <span className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-red-500 text-white text-xs lg:text-[10px] 2xl:text-xs rounded-full font-bold shadow-md flex items-center justify-center shrink-0">
              2
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Botón Minimizar/Maximizar - SOLO EN DESKTOP/LAPTOP */}
            {chatYAMinimizado ? (
              <button
                onClick={handleMaximizar}
                className="hidden lg:block p-1.5 lg:p-1 2xl:p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Maximizar"
              >
                <Maximize2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
              </button>
            ) : (
              <button
                onClick={minimizarChatYA}
                className="hidden lg:block p-1.5 lg:p-1 2xl:p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Minimizar"
              >
                <Minus className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
              </button>
            )}

            {/* Botón Cerrar - VISIBLE EN TODOS */}
            <button
              onClick={cerrarChatYA}
              className="p-1.5 lg:p-1 2xl:p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Cerrar"
            >
              <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
            </button>
          </div>
        </div>

        {/* === CONTENIDO (solo si NO está minimizado) === */}
        {!chatYAMinimizado && (
          <>
            {/* === Lista de conversaciones (placeholder) === */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4">
              {conversacionesMock.length === 0 ? (
                // Mensaje de bienvenida - SOLO cuando NO hay conversaciones
                // Ocupa todo el espacio disponible para mantener mismo tamaño del chat
                <div className="h-full flex flex-col items-center justify-center">
                  <h3 className="font-bold text-gray-900 mb-3 text-2xl lg:text-xl 2xl:text-2xl">
                    ¡Bienvenido!
                  </h3>
                  <p className="text-sm lg:text-xs 2xl:text-sm text-gray-600 max-w-xs mx-auto leading-relaxed text-center">
                    Aquí podrás chatear con Comerciantes y Resolver tus dudas.
                  </p>
                </div>
              ) : (
                // Lista de conversaciones - SOLO cuando SÍ hay conversaciones
                <div className="space-y-3 lg:space-y-2 2xl:space-y-3">
                  {conversacionesMock.map((conv, index) => (
                    <ConversacionItem
                      key={index}
                      nombre={conv.nombre}
                      mensaje={conv.mensaje}
                      tiempo={conv.tiempo}
                      noLeido={conv.noLeido}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* === Footer: Campo de mensaje === */}
            <div className="p-3 lg:p-2.5 2xl:p-3 border-t border-gray-200 bg-linear-to-b from-transparent to-gray-50 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Escribe un mensaje..."
                  disabled
                  className="flex-1 px-4 py-2.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 bg-gray-100 rounded-full text-sm lg:text-xs 2xl:text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  disabled
                  className="p-2.5 lg:p-2 2xl:p-2.5 bg-linear-to-r from-blue-700 to-blue-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <Send className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                </button>
              </div>
              <p className="text-xs lg:text-[10px] 2xl:text-xs text-gray-400 text-center mt-2">
                Funcionalidad completa próximamente
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

interface ConversacionItemProps {
  nombre: string;
  mensaje: string;
  tiempo: string;
  noLeido?: number;
}

function ConversacionItem({
  nombre,
  mensaje,
  tiempo,
  noLeido,
}: ConversacionItemProps) {
  return (
    <button className="w-full flex items-center gap-3 lg:gap-2.5 2xl:gap-3 p-3 lg:p-2 2xl:p-3 hover:bg-linear-to-r hover:from-blue-100 hover:to-blue-50 rounded-xl transition-all duration-150 text-left group">
      {/* Avatar */}
      <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 bg-linear-to-br from-blue-800 to-blue-500 rounded-full flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
        <span className="text-white font-bold text-base lg:text-sm 2xl:text-base">
          {nombre.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-semibold text-gray-900 truncate text-sm lg:text-xs 2xl:text-sm">
            {nombre}
          </p>
          <span className="text-xs lg:text-[10px] 2xl:text-xs text-gray-400 shrink-0 ml-2">
            {tiempo}
          </span>
        </div>
        <p className="text-sm lg:text-xs 2xl:text-sm text-gray-500 truncate">
          {mensaje}
        </p>
      </div>

      {/* Badge no leído */}
      {noLeido && noLeido > 0 && (
        <span className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-linear-to-br from-blue-500 to-blue-600 text-white text-xs lg:text-[10px] 2xl:text-xs rounded-full flex items-center justify-center font-bold shadow-md shrink-0">
          {noLeido}
        </span>
      )}
    </button>
  );
}

export default ChatOverlay;