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

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { X, StickyNote, Pin, BellOff, Archive, Trash2, ArrowLeft, ShieldBan, ShieldOff, UserPlus, UserMinus } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// Componentes del chat
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

  const vistaActiva = useChatYAStore((s) => s.vistaActiva);
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const volverALista = useChatYAStore((s) => s.volverALista);
  const totalNoLeidos = useChatYAStore((s) => s.totalNoLeidos);
  const inicializar = useChatYAStore((s) => s.inicializar);
  const misNotasId = useChatYAStore((s) => s.misNotasId);
  const abrirConversacion = useChatYAStore((s) => s.abrirConversacion);

  // Cerrar al cambiar de ruta (después de que React Router ya navegó)
  const location = useLocation();
  const rutaInicialRef = useRef(location.pathname);

  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo) || 'personal';
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva) || null;

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

  // Selección múltiple estilo WhatsApp (solo móvil)
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const modoSeleccion = seleccionadas.size > 0;
  const { esMobile } = useBreakpoint();

  // Store actions para acciones en lote
  const toggleFijar = useChatYAStore((s) => s.toggleFijar);
  const toggleSilenciar = useChatYAStore((s) => s.toggleSilenciar);
  const toggleArchivar = useChatYAStore((s) => s.toggleArchivar);
  const eliminarConversacion = useChatYAStore((s) => s.eliminarConversacion);
  const bloquearUsuario = useChatYAStore((s) => s.bloquearUsuario);
  const desbloquearUsuario = useChatYAStore((s) => s.desbloquearUsuario);
  const agregarContactoStore = useChatYAStore((s) => s.agregarContacto);
  const eliminarContactoStore = useChatYAStore((s) => s.eliminarContacto);
  const bloqueados = useChatYAStore((s) => s.bloqueados);
  const contactos = useChatYAStore((s) => s.contactos);
  const conversaciones = useChatYAStore((s) => s.conversaciones);

  const handleLongPressSeleccion = useCallback((conversacionId: string) => {
    setSeleccionadas(new Set([conversacionId]));
  }, []);

  const handleToggleSeleccion = useCallback((conversacionId: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(conversacionId)) next.delete(conversacionId);
      else next.add(conversacionId);
      return next;
    });
  }, []);

  const cancelarSeleccion = useCallback(() => setSeleccionadas(new Set()), []);

  // Estado de la primera seleccionada → determina icono de contacto y bloqueo
  const primeraSeleccionada = useMemo(() => {
    if (seleccionadas.size === 0) return null;
    const primerId = Array.from(seleccionadas)[0];
    return conversaciones.find((c) => c.id === primerId) || null;
  }, [seleccionadas, conversaciones]);

  const primerOtroId = primeraSeleccionada?.otroParticipante?.id;
  const yaEsContacto = !!(primerOtroId && contactos.find((c) => c.contactoId === primerOtroId && c.tipo === modoActivo));
  const yaEstaBloqueado = !!(primerOtroId && bloqueados.some((b) => b.bloqueadoId === primerOtroId));

  // Limpiar selección al cerrar ChatYA o al abrir un chat
  useEffect(() => {
    if (!chatYAAbierto || conversacionActivaId) {
      setSeleccionadas(new Set());
    }
  }, [chatYAAbierto, conversacionActivaId]);

  const accionEnLote = useCallback(async (accion: 'fijar' | 'silenciar' | 'archivar' | 'eliminar' | 'bloquear' | 'contacto') => {
    const ids = Array.from(seleccionadas);
    cancelarSeleccion();
    for (const id of ids) {
      const conv = conversaciones.find((c) => c.id === id);
      const otroId = conv?.otroParticipante?.id;
      switch (accion) {
        case 'fijar': await toggleFijar(id); break;
        case 'silenciar': await toggleSilenciar(id); break;
        case 'archivar': await toggleArchivar(id); break;
        case 'eliminar': await eliminarConversacion(id); break;
        case 'bloquear': {
          if (!otroId) break;
          const estaBloqueado = bloqueados.some((b) => b.bloqueadoId === otroId);
          if (estaBloqueado) await desbloquearUsuario(otroId);
          else await bloquearUsuario({ bloqueadoId: otroId });
          break;
        }
        case 'contacto': {
          if (!otroId) break;
          const contactoExistente = contactos.find((c) => c.contactoId === otroId && c.tipo === modoActivo);
          if (contactoExistente) {
            await eliminarContactoStore(contactoExistente.id);
          } else {
            await agregarContactoStore({ contactoId: otroId, tipo: modoActivo, negocioId: null, sucursalId: null });
          }
          break;
        }
      }
    }
  }, [seleccionadas, cancelarSeleccion, conversaciones, bloqueados, contactos, modoActivo, toggleFijar, toggleSilenciar, toggleArchivar, eliminarConversacion, bloquearUsuario, desbloquearUsuario, agregarContactoStore, eliminarContactoStore]);

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

  const sucursalAnteriorRef = useRef(sucursalActiva);
  const cargarConversaciones = useChatYAStore((s) => s.cargarConversaciones);
  const cargarNoLeidos = useChatYAStore((s) => s.cargarNoLeidos);

  const modoAnteriorRef = useRef(modoActivo);
  useEffect(() => {
    if (modoAnteriorRef.current !== modoActivo) {
      modoAnteriorRef.current = modoActivo;
      if (conversacionActivaId) {
        volverALista();
      }

      if (modoActivo === 'comercial') {
        // NO limpiar la lista aquí — causa parpadeo al dejar el array vacío.
        // El effect de sucursal hará cargarConversaciones(..., true) que reemplaza
        // silenciosamente sin vaciar primero.
      } else {
        // Modo personal: recargar directo (no necesita sucursal)
        if (chatYAAbierto) {
          cargarConversaciones('personal', 0, true);
        }
        cargarNoLeidos('personal');
      }
    }
  }, [modoActivo, conversacionActivaId, volverALista, chatYAAbierto, cargarConversaciones, cargarNoLeidos]);

  // ---------------------------------------------------------------------------
  // Effect: Recargar conversaciones al cambiar de sucursal (solo modo comercial)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (sucursalAnteriorRef.current !== sucursalActiva) {
      sucursalAnteriorRef.current = sucursalActiva;

      // Cerrar solo el chat activo (sin limpiar la lista de conversaciones)
      if (conversacionActivaId) {
        volverALista();
      }

      // Recargar conversaciones silenciosamente (sin loading, reemplaza la lista directo)
      // Badge: siempre actualizar al cambiar sucursal (aunque el chat esté cerrado)
      if (modoActivo === 'comercial') {
        cargarNoLeidos(modoActivo as 'personal' | 'comercial');
      }

      // Conversaciones: solo recargar si el chat está abierto
      if (chatYAAbierto && modoActivo === 'comercial') {
        cargarConversaciones(modoActivo as 'personal' | 'comercial', 0, true);
      }
    }
  }, [sucursalActiva, conversacionActivaId, volverALista, chatYAAbierto, modoActivo, cargarConversaciones, cargarNoLeidos]);

  // ---------------------------------------------------------------------------
  // Effect: Cargar badge de no leídos al montar (sin esperar a abrir el chat)
  // Así el badge del Navbar/BottomNav muestra el contador real desde el inicio
  // ---------------------------------------------------------------------------


  useEffect(() => {
    // Solo personal aquí — comercial lo maneja el effect de sucursal
    if (modoActivo === 'personal') {
      cargarNoLeidos('personal');
    }
  }, [modoActivo, cargarNoLeidos]);

  // ---------------------------------------------------------------------------
  // Effect: Inicializar store completo al abrir ChatYA
  // Carga conversaciones + badge en paralelo
  // ---------------------------------------------------------------------------
  const chatYAAbiertoRef = useRef(false);
  useEffect(() => {
    // Solo inicializar cuando ABRE el chat, no cuando cambia de modo/sucursal
    // (esos cambios ya tienen sus propios effects con recarga silenciosa)
    if (chatYAAbierto && !chatYAAbiertoRef.current) {
      inicializar(modoActivo as 'personal' | 'comercial');
    }
    chatYAAbiertoRef.current = chatYAAbierto;
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
      background: body.style.background,
      htmlBackground: document.documentElement.style.background,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.background = '#ffffff';
    document.documentElement.style.background = '#ffffff';

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      body.style.background = prev.background;
      document.documentElement.style.background = prev.htmlBackground;
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
  // Effect: Cerrar al cambiar de ruta en desktop
  // Se ejecuta DESPUÉS de que React Router ya renderizó la nueva página,
  // evitando el flash del contenido anterior.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!esDesktop) return;
    if (location.pathname !== rutaInicialRef.current) {
      rutaInicialRef.current = location.pathname;
      if (chatYAAbierto) cerrarChatYA();
    }
  }, [location.pathname, chatYAAbierto, cerrarChatYA, esDesktop]);

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
  // Effect: Flecha nativa al abrir ChatOverlay → cerrar desde la lista
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!chatYAAbierto) return;

    window.history.pushState({ chatyaOverlay: true }, '');

    const handlePopStateOverlay = () => {
      // Si hay un chat abierto, el listener del chat lo maneja
      if (useChatYAStore.getState().conversacionActivaId) return;
      cerrarChatYA();
    };

    window.addEventListener('popstate', handlePopStateOverlay);
    return () => {
      window.removeEventListener('popstate', handlePopStateOverlay);
    };
  }, [chatYAAbierto, cerrarChatYA]);

  // ---------------------------------------------------------------------------
  // Effect: Flecha nativa del celular → volver a lista de chats
  // Cuando se abre un chat, se empuja un estado al historial del navegador.
  // Al presionar "atrás" en el celular, se captura el evento popstate y se
  // regresa a la lista sin navegar fuera de la app.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!conversacionActivaId) return;

    // Empujar estado al historial cuando se abre un chat
    window.history.pushState({ chatya: true }, '');

    const handlePopState = () => {
      volverALista();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [conversacionActivaId, volverALista]);

  // ---------------------------------------------------------------------------
  // No renderizar si nunca se ha abierto (optimización: no montar al inicio)
  // Una vez abierto, se mantiene montado con CSS hidden para cache de imágenes
  // ---------------------------------------------------------------------------
  const seAbrioPreviamente = useRef(false);
  if (chatYAAbierto) seAbrioPreviamente.current = true;

  // Montar VentanaChat solo después de haber abierto un chat al menos una vez
  // Después se mantiene montado con CSS hidden para preservar Virtuoso y caché
  const seAbrioChatRef = useRef(false);

  if (!seAbrioPreviamente.current) return null;

  // ---------------------------------------------------------------------------
  // ESTADO EXPANDIDO
  // ---------------------------------------------------------------------------
  const enChat = vistaActiva === 'chat' && conversacionActivaId;

  if (enChat) seAbrioChatRef.current = true;
  const ventanaChatMontada = seAbrioChatRef.current;

  return (
    <div className={!chatYAAbierto ? 'hidden' : ''}>
      {/* Sin overlay oscuro en móvil — el chat es fullscreen */}

      {/* Panel principal */}
      {/* X flotante esquina superior derecha — solo desktop y sin chat activo */}
      {esDesktop && !conversacionActivaId && (
        <button
          onClick={cerrarChatYA}
          className="fixed z-40 right-4 top-[91px] w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div
        ref={panelRef}
        className={`
          fixed bg-white overflow-hidden flex
          ${esDesktop
            ? `z-41 top-[83px] bottom-0 left-0 right-0 shadow-[0_-4px_24px_rgba(15,29,58,0.15)] flex-row`
            : `z-50 inset-0 flex-col`
          }
        `}
      >
        {/* ═══ MÓVIL: Header ═══ */}
        {!esDesktop && (
          <>
            {/* Zona oscura unificada — solo visible en la lista, NO dentro de un chat */}
            {!enChat && (
              <div className="shrink-0 bg-linear-to-br from-[#0a1628] via-[#0f1d3a] to-[#1a3058] select-none"
                style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>

                {modoSeleccion && !enChat ? (
                  /* ── TOOLBAR SELECCIÓN (reemplaza header + modo) ── */
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <button onClick={cancelarSeleccion} className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 cursor-pointer">
                        <ArrowLeft className="w-5 h-5 text-white/80" />
                      </button>
                      <span className="text-base font-bold text-white">{seleccionadas.size}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => accionEnLote('fijar')} className="p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 cursor-pointer">
                        <Pin className="w-5 h-5 text-white/70" />
                      </button>
                      <button onClick={() => accionEnLote('silenciar')} className="p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 cursor-pointer">
                        <BellOff className="w-5 h-5 text-white/70" />
                      </button>
                      <button onClick={() => accionEnLote('archivar')} className="p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 cursor-pointer">
                        <Archive className="w-5 h-5 text-white/70" />
                      </button>
                      <button onClick={() => accionEnLote('contacto')} className="p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 cursor-pointer">
                        {yaEsContacto
                          ? <UserMinus className="w-5 h-5 text-white/70" />
                          : <UserPlus className="w-5 h-5 text-white/70" />
                        }
                      </button>
                      <button onClick={() => accionEnLote('bloquear')} className="p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 cursor-pointer">
                        {yaEstaBloqueado
                          ? <ShieldOff className="w-5 h-5 text-green-400/80" />
                          : <ShieldBan className="w-5 h-5 text-red-400/80" />
                        }
                      </button>
                      <button onClick={() => accionEnLote('eliminar')} className="p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 cursor-pointer">
                        <Trash2 className="w-5 h-5 text-red-400/80" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── HEADER NORMAL (logo + modo + Mis Notas) ── */
                  <>
                    <div className="flex items-center justify-between px-4 py-1">
                      <div className="flex items-center gap-2">
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
                        className="p-2.5 hover:bg-white/10 rounded-lg cursor-pointer"
                      >
                        <X className="w-5 h-5 text-white/70" />
                      </button>
                    </div>

                    {/* Indicador de modo + Mis Notas (solo en lista, no en chat) */}
                    {!enChat && (
                      <div className="flex items-center justify-between px-4 pb-1 pt-1">
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
                    )}
                  </>
                )}
              </div>
            )}

            {/* Contenido móvil: ambas vistas montadas, visibilidad por CSS */}
            <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${enChat ? 'bg-white' : 'bg-linear-to-b from-[#0B358F] to-black'}`}>
              <div className={enChat ? 'hidden' : 'flex flex-col flex-1 min-h-0'}>
                <ListaConversaciones
                  seleccionadas={seleccionadas}
                  modoSeleccion={modoSeleccion}
                  onLongPressSeleccion={esMobile ? handleLongPressSeleccion : undefined}
                  onToggleSeleccion={handleToggleSeleccion}
                />
              </div>
              <div className={enChat ? 'flex flex-col flex-1 min-h-0' : 'hidden'}>
                {ventanaChatMontada && <VentanaChat />}
              </div>
            </div>
          </>
        )}

        {/* ═══ DESKTOP: Split lista + chat ═══ */}
        {esDesktop && (
          <>
            {/* Panel izquierdo: Lista de conversaciones */}
            <div className="w-[320px] 2xl:w-[340px] min-w-[320px] 2xl:min-w-[340px] border-r border-white/10 flex flex-col min-h-0 bg-linear-to-b from-[#0B358F] to-black">
              {/* Header de la lista */}
              <div className="px-3.5 py-3 flex items-center justify-between bg-black/50 backdrop-blur-sm border-b border-white/8 shrink-0">
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
              </div>

              {/* Indicador de modo + Mis Notas */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${modoActivo === 'comercial' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  <span className="text-xs font-bold text-white/45 uppercase tracking-wider">
                    {modoActivo === 'comercial' ? 'Comercial' : 'Personal'}
                  </span>
                </div>
                {misNotasId && (
                  <button
                    onClick={() => abrirConversacion(misNotasId)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${conversacionActivaId === misNotasId
                      ? 'bg-white/15 text-white'
                      : 'hover:bg-white/10 text-white/45 hover:text-white/80'
                      }`}
                  >
                    <StickyNote className="w-4 h-4" />
                    Mis Notas
                  </button>
                )}
              </div>

              {/* Lista de conversaciones */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <ListaConversaciones />
              </div>
            </div>

            {/* Panel derecho: Ventana de chat */}
            <div className="flex-1 flex flex-col min-w-0 bg-linear-to-b from-gray-100/70 to-gray-200/50">
              <div className={enChat ? 'hidden' : 'flex-1 flex flex-col'}>
                {/* Estado vacío: ningún chat seleccionado */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden bg-linear-to-br from-blue-200/80 via-indigo-200/60 to-sky-200/70">
                  {/* Burbujas decorativas animadas */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[15%] left-[12%] w-20 h-20 bg-blue-300/70 rounded-full animate-[float_6s_ease-in-out_infinite]" />
                    <div className="absolute top-[60%] right-[10%] w-14 h-14 bg-indigo-300/65 rounded-full animate-[float_8s_ease-in-out_infinite_1s]" />
                    <div className="absolute bottom-[20%] left-[18%] w-10 h-10 bg-sky-300/70 rounded-full animate-[float_7s_ease-in-out_infinite_2s]" />
                    <div className="absolute top-[30%] right-[22%] w-8 h-8 bg-blue-400/55 rounded-full animate-[float_5s_ease-in-out_infinite_0.5s]" />
                    <div className="absolute bottom-[35%] right-[30%] w-6 h-6 bg-indigo-300/65 rounded-full animate-[float_9s_ease-in-out_infinite_3s]" />
                  </div>

                  {/* Contenido central */}
                  <div className="relative z-10 flex flex-col items-center">
                    <img
                      src="/logo-ChatYA-blanco.webp"
                      alt="ChatYA"
                      className="h-20 w-auto object-contain mb-6"
                    />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">¡Bienvenido a ChatYA!</h3>
                    <p className="text-sm text-gray-500 font-medium text-center max-w-[260px] leading-relaxed">
                      Selecciona una conversación para comenzar a chatear
                    </p>
                  </div>

                  {/* Keyframes para las burbujas */}
                  <style>{`
                    @keyframes float {
                      0%, 100% { transform: translateY(0px) scale(1); opacity: 0.7; }
                      50% { transform: translateY(-18px) scale(1.08); opacity: 1; }
                    }
                  `}</style>
                </div>
              </div>
              <div className={enChat ? 'flex flex-col flex-1 min-h-0' : 'hidden'}>
                {ventanaChatMontada && <VentanaChat />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ChatOverlay;