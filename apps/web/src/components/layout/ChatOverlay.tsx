/**
 * ChatOverlay.tsx - v3.0 ChatYA Real
 * ====================================
 * Overlay persistente del chat 1:1 en tiempo real.
 *
 * 3 ESTADOS:
 * - Cerrado: no se renderiza nada
 * - Minimizado: barra lateral derecha ~56px con avatares + badges (solo desktop)
 * - Expandido: panel lateral derecho ~620px con split lista+chat (desktop)
 *              bottom sheet 90vh una vista a la vez (móvil)
 *
 * COMPORTAMIENTO:
 * - Persistente: montado fuera del <Outlet /> en MainLayout, nunca se desmonta
 * - Modo dual: respeta el modo global (personal/comercial) del useAuthStore
 * - Swipe down para cerrar en móvil (desde handle)
 * - Click outside para minimizar en desktop
 * - ESC para cerrar
 * - Bloqueo de scroll del body en móvil
 *
 * UBICACIÓN: apps/web/src/components/layout/ChatOverlay.tsx
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Minus, ChevronLeft } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';

// Componentes del chat
import { BarraMinimizada } from '../chatya/BarraMinimizada';
import { ListaConversaciones } from '../chatya/ListaConversaciones';
import { VentanaChat } from '../chatya/VentanaChat';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Breakpoint lg de Tailwind (laptop) */
const LG_BREAKPOINT = 1024;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ChatOverlay() {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const chatYAAbierto = useUiStore((s) => s.chatYAAbierto);
  const chatYAMinimizado = useUiStore((s) => s.chatYAMinimizado);
  const cerrarChatYA = useUiStore((s) => s.cerrarChatYA);
  const minimizarChatYA = useUiStore((s) => s.minimizarChatYA);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  const vistaActiva = useChatYAStore((s) => s.vistaActiva);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const volverALista = useChatYAStore((s) => s.volverALista);
  const totalNoLeidos = useChatYAStore((s) => s.totalNoLeidos);
  const inicializar = useChatYAStore((s) => s.inicializar);

  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo) || 'personal';

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const panelRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  const [esDesktop, setEsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= LG_BREAKPOINT : true
  );
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragCurrentY, setDragCurrentY] = useState(0);

  // ---------------------------------------------------------------------------
  // Effect: Detectar si es desktop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleResize = () => setEsDesktop(window.innerWidth >= LG_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------------------------------------------------------------------------
  // Effect: Inicializar store al abrir ChatYA
  // Carga conversaciones + badge en paralelo
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (chatYAAbierto) {
      inicializar(modoActivo as 'personal' | 'comercial');
    }
  }, [chatYAAbierto, modoActivo, inicializar]);

  // ---------------------------------------------------------------------------
  // Effect: Bloquear scroll del body en móvil cuando expandido
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto || chatYAMinimizado || esDesktop) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [chatYAAbierto, chatYAMinimizado, esDesktop]);

  // ---------------------------------------------------------------------------
  // Effect: Swipe down para cerrar en móvil (solo desde el handle)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto || chatYAMinimizado || esDesktop) return;

    const handle = handleRef.current;
    if (!handle) return;

    const onStart = (e: TouchEvent) => setDragStartY(e.touches[0].clientY);

    const onMove = (e: TouchEvent) => {
      if (dragStartY === null) return;
      const diff = e.touches[0].clientY - dragStartY;
      if (diff > 0) {
        if (e.cancelable) e.preventDefault();
        setDragCurrentY(diff);
      }
    };

    const onEnd = () => {
      if (dragStartY === null) return;
      if (dragCurrentY > 100) cerrarChatYA();
      setDragStartY(null);
      setDragCurrentY(0);
    };

    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: false });
    handle.addEventListener('touchend', onEnd);

    return () => {
      handle.removeEventListener('touchstart', onStart);
      handle.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend', onEnd);
    };
  }, [chatYAAbierto, chatYAMinimizado, esDesktop, dragStartY, dragCurrentY, cerrarChatYA]);

  // ---------------------------------------------------------------------------
  // Effect: Click outside para minimizar en desktop
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto || chatYAMinimizado || !esDesktop) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-chatya-button="true"]')) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        minimizarChatYA();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [chatYAAbierto, chatYAMinimizado, esDesktop, minimizarChatYA]);

  // ---------------------------------------------------------------------------
  // Effect: Cerrar con ESC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarChatYA();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [chatYAAbierto, cerrarChatYA]);

  // ---------------------------------------------------------------------------
  // Handler: botón atrás en móvil (de chat → lista)
  // ---------------------------------------------------------------------------
  const handleAtras = useCallback(() => {
    if (vistaActiva === 'chat') {
      volverALista();
    }
  }, [vistaActiva, volverALista]);

  // ---------------------------------------------------------------------------
  // No renderizar si está cerrado
  // ---------------------------------------------------------------------------
  if (!chatYAAbierto) return null;

  // ---------------------------------------------------------------------------
  // ESTADO MINIMIZADO (solo desktop) — barra lateral de avatares
  // ---------------------------------------------------------------------------
  if (chatYAMinimizado && esDesktop) {
    return (
      <BarraMinimizada
        onExpandir={abrirChatYA}
        totalNoLeidos={totalNoLeidos}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // ESTADO EXPANDIDO
  // ---------------------------------------------------------------------------
  const enChat = vistaActiva === 'chat' && conversacionActivaId;

  return (
    <>
      {/* Overlay oscuro — solo móvil */}
      {!esDesktop && (
        <div
          className="fixed inset-0 bg-black/50 z-60 backdrop-blur-[2px]"
          onClick={cerrarChatYA}
        />
      )}

      {/* Panel principal */}
      <div
        ref={panelRef}
        style={{
          transform: !esDesktop ? `translateY(${dragCurrentY}px)` : undefined,
          transition: dragStartY !== null ? 'none' : undefined,
        }}
        className={`
          fixed z-70 bg-white overflow-hidden flex
          ${esDesktop
            ? `right-3 top-[66px] bottom-3 w-[700px] 2xl:w-[850px] rounded-2xl shadow-[0_8px_48px_rgba(15,29,58,0.22),0_0_0_1px_rgba(15,29,58,0.06)] flex-row`
            : `bottom-0 left-0 right-0 h-[90vh] rounded-t-[22px] shadow-[0_-10px_50px_rgba(15,29,58,0.25)] flex-col`
          }
        `}
      >
        {/* ═══ MÓVIL: Handle + Header ═══ */}
        {!esDesktop && (
          <>
            {/* Handle de arrastre */}
            <div
              ref={handleRef}
              className="flex items-center justify-center py-2 shrink-0 cursor-grab active:cursor-grabbing"
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header móvil */}
            <div className="flex items-center justify-between px-4 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                {/* Botón atrás cuando está en chat */}
                {enChat && (
                  <button
                    onClick={handleAtras}
                    className="p-1.5 -ml-1.5 hover:bg-gray-100 rounded-lg"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                )}
                <div className="flex items-center gap-1.5">
                  <img
                    src="/ChatYA.webp"
                    alt="ChatYA"
                    className="h-8 w-auto object-contain"
                  />
                  {totalNoLeidos > 0 && (
                    <span className="min-w-5 h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {totalNoLeidos > 99 ? '99+' : totalNoLeidos}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={cerrarChatYA}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Indicador de modo */}
            <div className="flex items-center gap-1.5 px-4 pb-2 shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full ${modoActivo === 'comercial' ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Modo {modoActivo === 'comercial' ? 'Comercial' : 'Personal'}
              </span>
            </div>

            {/* Contenido móvil: una vista a la vez */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {enChat ? (
                <VentanaChat />
              ) : (
                <ListaConversaciones />
              )}
            </div>
          </>
        )}

        {/* ═══ DESKTOP: Split lista + chat ═══ */}
        {esDesktop && (
          <>
            {/* Panel izquierdo: Lista de conversaciones */}
            <div className="w-[210px] 2xl:w-[230px] min-w-[210px] 2xl:min-w-[230px] border-r border-gray-200 flex flex-col bg-gray-50/80">
              {/* Header de la lista */}
              <div className="px-3 py-2.5 flex items-center justify-between bg-linear-to-b from-[#0f1d3a] to-[#162850] rounded-tl-2xl shrink-0">
                <div className="flex items-center gap-1.5">
                  <img
                    src="/ChatYA.webp"
                    alt="ChatYA"
                    className="h-7 w-auto object-contain brightness-0 invert"
                  />
                  {totalNoLeidos > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                      {totalNoLeidos > 99 ? '99+' : totalNoLeidos}
                    </span>
                  )}
                </div>
                <div className="flex gap-0.5">
                  <button
                    onClick={minimizarChatYA}
                    className="w-6 h-6 rounded-md bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white"
                    title="Minimizar"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={cerrarChatYA}
                    className="w-6 h-6 rounded-md bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white"
                    title="Cerrar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Indicador de modo */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-200 shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full ${modoActivo === 'comercial' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {modoActivo === 'comercial' ? 'Comercial' : 'Personal'}
                </span>
              </div>

              {/* Lista de conversaciones */}
              <div className="flex-1 overflow-hidden">
                <ListaConversaciones />
              </div>
            </div>

            {/* Panel derecho: Ventana de chat */}
            <div className="flex-1 flex flex-col min-w-0 bg-linear-to-b from-gray-50 to-white">
              {enChat ? (
                <VentanaChat />
              ) : (
                /* Estado vacío: ningún chat seleccionado */
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                  <div className="w-16 h-16 bg-linear-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mb-4">
                    <img
                      src="/ChatYA.webp"
                      alt="ChatYA"
                      className="h-10 w-auto object-contain"
                    />
                  </div>
                  <h3 className="text-base font-bold text-gray-800 mb-1">¡Bienvenido a ChatYA!</h3>
                  <p className="text-xs text-gray-400 text-center max-w-[200px] leading-relaxed">
                    Selecciona una conversación para comenzar a chatear
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default ChatOverlay;