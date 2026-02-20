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
import { X, Minus, ChevronLeft, StickyNote } from 'lucide-react';
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
  const misNotasId = useChatYAStore((s) => s.misNotasId);
  const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);

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
  // Effect: Limpiar conversación activa al cerrar/minimizar ChatYA
  // SIN ESTO: el store mantiene conversacionActivaId con el último chat abierto,
  // y el listener de chatya:mensaje-nuevo asume que el usuario está viendo esa
  // conversación → marca como leído en vez de incrementar el badge.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto || chatYAMinimizado) {
      if (conversacionActivaId) {
        volverALista();
      }
    }
  }, [chatYAAbierto, chatYAMinimizado, conversacionActivaId, volverALista]);

  // ---------------------------------------------------------------------------
  // Effect: Limpiar conversación activa al cambiar de modo (Personal ↔ Comercial)
  // SIN ESTO: si el usuario cambia de modo con una conversación abierta, los
  // listeners siguen procesando eventos de esa conversación del modo anterior.
  // ---------------------------------------------------------------------------
  const modoAnteriorRef = useRef(modoActivo);
  useEffect(() => {
    if (modoAnteriorRef.current !== modoActivo) {
      modoAnteriorRef.current = modoActivo;
      if (conversacionActivaId) {
        volverALista();
      }
    }
  }, [modoActivo, conversacionActivaId, volverALista]);

  // ---------------------------------------------------------------------------
  // Effect: Cargar badge de no leídos al montar (sin esperar a abrir el chat)
  // Así el badge del Navbar/BottomNav muestra el contador real desde el inicio
  // ---------------------------------------------------------------------------
  const cargarNoLeidos = useChatYAStore((s) => s.cargarNoLeidos);

  useEffect(() => {
    cargarNoLeidos(modoActivo as 'personal' | 'comercial');
  }, [modoActivo, cargarNoLeidos]);

  // ---------------------------------------------------------------------------
  // Effect: Inicializar store completo al abrir ChatYA
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
            ? `right-3 top-[66px] bottom-3 w-[750px] 2xl:w-[900px] rounded-2xl shadow-[0_8px_48px_rgba(15,29,58,0.28),0_0_0_1.5px_rgba(15,29,58,0.12)] flex-row`
            : `bottom-0 left-0 right-0 h-[90vh] rounded-t-[22px] shadow-[0_-10px_50px_rgba(15,29,58,0.25)] flex-col`
          }
        `}
      >
        {/* ═══ MÓVIL: Handle + Header ═══ */}
        {!esDesktop && (
          <>
            {/* Zona oscura unificada: Handle + Header + Modo */}
            <div className="shrink-0 bg-linear-to-br from-[#0a1628] via-[#0f1d3a] to-[#1a3058] rounded-t-[22px]">
              {/* Handle de arrastre */}
              <div
                ref={handleRef}
                className="flex items-center justify-center py-1 cursor-grab active:cursor-grabbing"
              >
                <div className="w-10 h-1 bg-white/25 rounded-full" />
              </div>

              {/* Header móvil */}
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  {/* Botón atrás cuando está en chat */}
                  {enChat && (
                    <button
                      onClick={handleAtras}
                      className="p-1.5 -ml-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5 text-white/70" />
                    </button>
                  )}
                  <div className="flex items-center gap-1.5">
                    <img
                      src="/ChatYA.webp"
                      alt="ChatYA"
                      className="h-10 w-auto object-contain"
                    />
                    {totalNoLeidos > 0 && (
                      <span className="min-w-5 h-5 px-1.5 bg-amber-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {totalNoLeidos > 99 ? '99+' : totalNoLeidos}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={cerrarChatYA}
                  className="p-1.5 hover:bg-white/10 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5 text-white/70" />
                </button>
              </div>

              {/* Indicador de modo + Mis Notas */}
              <div className="flex items-center justify-between px-4 pb-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${modoActivo === 'comercial' ? 'bg-amber-500' : 'bg-blue-400'}`} />
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">
                    Modo {modoActivo === 'comercial' ? 'Comercial' : 'Personal'}
                  </span>
                </div>
                {misNotasId && (
                  <button
                    onClick={() => abrirConversacion(misNotasId)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold cursor-pointer ${conversacionActivaId === misNotasId
                        ? 'bg-white/15 text-white'
                        : 'hover:bg-white/10 text-white/60 hover:text-white'
                      }`}
                  >
                    <StickyNote className="w-5 h-5" />
                    Mis Notas
                  </button>
                )}
              </div>
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
            <div className="w-[270px] 2xl:w-[290px] min-w-[270px] 2xl:min-w-[290px] border-r border-gray-300 flex flex-col bg-linear-to-b from-gray-100/80 to-gray-200/60">
              {/* Header de la lista */}
              <div className="px-3.5 py-3 flex items-center justify-between bg-linear-to-br from-[#0a1628] via-[#0f1d3a] to-[#1a3058] rounded-tl-2xl shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    src="/ChatYA.webp"
                    alt="ChatYA"
                    className="h-9 w-auto object-contain"
                  />
                  {totalNoLeidos > 0 && (
                    <span className="min-w-5 h-5 px-1.5 bg-amber-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-sm">
                      {totalNoLeidos > 99 ? '99+' : totalNoLeidos}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={minimizarChatYA}
                    className="w-7 h-7 rounded-md bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
                    title="Minimizar"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={cerrarChatYA}
                    className="w-7 h-7 rounded-md bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
                    title="Cerrar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Indicador de modo + Mis Notas */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-300 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${modoActivo === 'comercial' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {modoActivo === 'comercial' ? 'Comercial' : 'Personal'}
                  </span>
                </div>
                {misNotasId && (
                  <button
                    onClick={() => abrirConversacion(misNotasId)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${conversacionActivaId === misNotasId
                      ? 'bg-blue-100 text-blue-600'
                      : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <StickyNote className="w-4 h-4" />
                    Mis Notas
                  </button>
                )}
              </div>

              {/* Lista de conversaciones */}
              <div className="flex-1 overflow-hidden">
                <ListaConversaciones />
              </div>
            </div>

            {/* Panel derecho: Ventana de chat */}
            <div className="flex-1 flex flex-col min-w-0 bg-linear-to-b from-gray-100/70 to-gray-200/50">
              {enChat ? (
                <VentanaChat />
              ) : (
                /* Estado vacío: ningún chat seleccionado */
                <div className="flex-1 flex flex-col items-center justify-center px-6">
                  <div className="w-16 h-16 bg-linear-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mb-4">
                    <img
                      src="/logo-ChatYA-blanco.webp"
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