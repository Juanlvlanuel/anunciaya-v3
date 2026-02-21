/**
 * VentanaChat.tsx
 * ================
 * Ventana de chat activo con el otro participante.
 * Header (info contacto) + área de mensajes + input.
 *
 * Se usa tanto en el panel derecho del split (desktop) como en vista completa (móvil).
 *
 * UBICACIÓN: apps/web/src/components/chatya/VentanaChat.tsx
 */

import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { Search, MoreVertical, Store, StickyNote, X, Reply, Copy, Pin, PinOff, Pencil, Trash2, ShieldBan, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUiStore } from '../../stores/useUiStore';
import * as chatyaService from '../../services/chatyaService';
import type { Conversacion } from '../../types/chatya';
import { BurbujaMensaje } from './BurbujaMensaje';
import { InputMensaje } from './InputMensaje';
import { IndicadorEscribiendo } from './IndicadorEscribiendo';
import { SeparadorFecha } from './SeparadorFecha';
import { MenuContextualChat } from './MenuContextualChat';
import { MenuContextualMensaje } from './MenuContextualMensaje';
import { BarraBusquedaChat } from './BarraBusquedaChat';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { Mensaje } from '../../types/chatya';

// =============================================================================
// COMPONENTE
// =============================================================================

export function VentanaChat() {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const chatTemporal = useChatYAStore((s) => s.chatTemporal);
  const conversaciones = useChatYAStore((s) => s.conversaciones);
  const mensajes = useChatYAStore((s) => s.mensajes);
  const cargandoMensajes = useChatYAStore((s) => s.cargandoMensajes);
  const cargandoMensajesAntiguos = useChatYAStore((s) => s.cargandoMensajesAntiguos);
  const hayMasMensajes = useChatYAStore((s) => s.hayMasMensajes);
  const cargarMensajesAntiguos = useChatYAStore((s) => s.cargarMensajesAntiguos);
  const escribiendo = useChatYAStore((s) => s.escribiendo);
  const misNotasId = useChatYAStore((s) => s.misNotasId);
  const bloqueados = useChatYAStore((s) => s.bloqueados);
  const desbloquearUsuario = useChatYAStore((s) => s.desbloquearUsuario);
  const mensajesFijados = useChatYAStore((s) => s.mensajesFijados);
  const desfijarMensaje = useChatYAStore((s) => s.desfijarMensaje);

  const usuario = useAuthStore((s) => s.usuario);
  const cerrarChatYA = useUiStore((s) => s.cerrarChatYA);

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------
  const conversacionEnStore = conversaciones.find((c) => c.id === conversacionActivaId);
  const conversacionesArchivadas = useChatYAStore((s) => s.conversacionesArchivadas);
  const conversacionEnArchivados = conversacionesArchivadas.find((c) => c.id === conversacionActivaId);
  const [conversacionRemota, setConversacionRemota] = useState<Conversacion | null>(null);

  // Si no está en ninguna lista del store y no es temporal, cargar del backend
  const esTemporal = conversacionActivaId?.startsWith('temp_') ?? false;

  useEffect(() => {
    if (!esTemporal && conversacionActivaId && !conversacionEnStore && !conversacionEnArchivados) {
      chatyaService.getConversacion(conversacionActivaId).then((res) => {
        if (res.success && res.data) {
          setConversacionRemota(res.data as Conversacion);
        }
      });
    } else {
      setConversacionRemota(null);
    }
  }, [conversacionActivaId, conversacionEnStore, conversacionEnArchivados, esTemporal]);

  const conversacion = conversacionEnStore || conversacionEnArchivados || conversacionRemota; const esMisNotas = conversacionActivaId === misNotasId;

  // Si es temporal, usar datos del chatTemporal; si no, los de la conversación real
  const otro = esTemporal ? chatTemporal?.otroParticipante : conversacion?.otroParticipante;
  const nombre = esMisNotas
    ? 'Mis Notas'
    : otro?.negocioNombre || (otro ? `${otro.nombre} ${otro.apellidos || ''}`.trim() : 'Chat');
  const avatarUrl = esMisNotas ? null : (otro?.negocioLogo || otro?.avatarUrl || null);
  const iniciales = esMisNotas
    ? ''
    : otro
      ? `${otro.nombre.charAt(0)}${otro.apellidos?.charAt(0) || ''}`.toUpperCase()
      : '?';
  const esNegocio = !esMisNotas && !!otro?.negocioNombre;
  const miId = usuario?.id || '';
  const esBloqueado = !esMisNotas && !esTemporal && bloqueados.some((b) => b.bloqueadoId === otro?.id);

  const estaEscribiendo = !esMisNotas && escribiendo?.conversacionId === conversacionActivaId;

  // ---------------------------------------------------------------------------
  // Estado local: menú contextual del header (tres puntos)
  // ---------------------------------------------------------------------------
  const [menuAbierto, setMenuAbierto] = useState(false);

  // ---------------------------------------------------------------------------
  // Estado local: menú contextual de mensaje (long press / click derecho)
  // ---------------------------------------------------------------------------
  const [menuMensaje, setMenuMensaje] = useState<{
    mensaje: Mensaje;
    posicion: { x: number; y: number };
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Estado local: modo edición (al seleccionar "Editar" del menú contextual)
  // ---------------------------------------------------------------------------
  const [mensajeEditando, setMensajeEditando] = useState<Mensaje | null>(null);

  // ---------------------------------------------------------------------------
  // Estado local: modo respuesta (al seleccionar "Responder" del menú contextual)
  // ---------------------------------------------------------------------------
  const [mensajeRespondiendo, setMensajeRespondiendo] = useState<Mensaje | null>(null);

  // ---------------------------------------------------------------------------
  // Breakpoint para menú contextual (bottom sheet en móvil, popup en desktop)
  // ---------------------------------------------------------------------------
  const { esMobile } = useBreakpoint();

  // ---------------------------------------------------------------------------
  // Estado local: búsqueda dentro del chat
  // ---------------------------------------------------------------------------
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [mensajeResaltadoId, setMensajeResaltadoId] = useState<string | null>(null);
  const fijadosRef = useRef<HTMLDivElement>(null);
  const [flechasFijados, setFlechasFijados] = useState({ izq: false, der: false });

  const checkFlechasFijados = useCallback(() => {
    const el = fijadosRef.current;
    if (!el) return;
    setFlechasFijados({
      izq: el.scrollLeft > 0,
      der: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    checkFlechasFijados();
  }, [mensajesFijados, checkFlechasFijados]);

  /** Callback estable para BarraBusquedaChat */
  const handleMensajeSeleccionado = useCallback((id: string | null) => {
    setMensajeResaltadoId(id);
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers: Menú contextual de mensaje
  // ---------------------------------------------------------------------------
  const handleMenuContextualMensaje = useCallback((msg: Mensaje, pos: { x: number; y: number }) => {
    setMenuMensaje({ mensaje: msg, posicion: pos });
  }, []);

  const handleCerrarMenuMensaje = useCallback(() => {
    setMenuMensaje(null);
  }, []);

  const handleEditarMensaje = useCallback((msg: Mensaje) => {
    setMensajeEditando(msg);
  }, []);

  const handleResponderMensaje = useCallback((msg: Mensaje) => {
    setMensajeRespondiendo(msg);
  }, []);

  const handleCancelarEdicion = useCallback(() => {
    setMensajeEditando(null);
  }, []);

  const handleCancelarRespuesta = useCallback(() => {
    setMensajeRespondiendo(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Refs
  // ---------------------------------------------------------------------------
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMensajesLenRef = useRef(0);
  /** Guarda scrollHeight antes de insertar mensajes antiguos para preservar posición */
  const prevScrollHeightRef = useRef(0);
  /** Flag para distinguir carga de antiguos vs mensaje nuevo */
  const cargandoAntiguosRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Effect: Gestionar scroll según tipo de cambio en mensajes
  // Con flex-col-reverse: scrollTop=0 = fondo (más reciente), scroll arriba = más antiguo
  // ---------------------------------------------------------------------------
  useLayoutEffect(() => {
    if (!scrollRef.current || mensajes.length === 0) {
      prevMensajesLenRef.current = mensajes.length;
      return;
    }

    const el = scrollRef.current;

    if (prevMensajesLenRef.current === 0) {
      // ── Carga inicial → scrollTop=0 ya es el fondo con col-reverse ──
      el.scrollTop = 0;
    } else if (cargandoAntiguosRef.current) {
      // ── Mensajes antiguos cargados → preservar posición visual ──
      const nuevoScrollHeight = el.scrollHeight;
      const diferencia = nuevoScrollHeight - prevScrollHeightRef.current;
      el.scrollTop = el.scrollTop + diferencia;
      cargandoAntiguosRef.current = false;
    } else if (mensajes.length > prevMensajesLenRef.current) {
      // ── Mensaje nuevo recibido/enviado → volver al fondo ──
      el.scrollTop = 0;
    }

    prevMensajesLenRef.current = mensajes.length;
  }, [mensajes.length]);

  // ---------------------------------------------------------------------------
  // Effect: Scroll al mensaje resaltado por búsqueda
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mensajeResaltadoId || !scrollRef.current) return;

    const timer = setTimeout(() => {
      const elemento = document.getElementById(`msg-${mensajeResaltadoId}`);
      if (elemento && scrollRef.current) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [mensajeResaltadoId]);

  // ---------------------------------------------------------------------------
  // Handler: Scroll infinito hacia arriba para cargar más mensajes
  // ---------------------------------------------------------------------------
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || cargandoMensajesAntiguos || !hayMasMensajes) return;

    const el = scrollRef.current;
    const distanciaAlTope = el.scrollHeight - el.clientHeight - el.scrollTop;

    // Con flex-col-reverse: scrollTop=0 es el fondo, máximo scrollTop es el tope (mensajes más antiguos)
    if (distanciaAlTope < 50) {
      prevScrollHeightRef.current = el.scrollHeight;
      cargandoAntiguosRef.current = true;
      cargarMensajesAntiguos();
    }
  }, [cargandoMensajesAntiguos, hayMasMensajes, cargarMensajesAntiguos]);

  /** Flag: mostrar acciones en header (móvil, cuando hay menú contextual activo) */
  const mostrarAccionesEnHeader = esMobile && menuMensaje !== null && !esMisNotas;

  // ---------------------------------------------------------------------------
  // Handler: Reaccionar desde hover (desktop) o burbuja flotante (móvil)
  // ---------------------------------------------------------------------------
  const handleReaccionar = useCallback(async (mensajeId: string, emoji: string) => {
    try {
      await chatyaService.toggleReaccion(mensajeId, emoji);
    } catch {
      void 0; // Silencioso
    }
    // Cerrar menú en móvil después de reaccionar
    if (esMobile) setMenuMensaje(null);
  }, [esMobile]);

  // ---------------------------------------------------------------------------
  // Agrupar mensajes por fecha para separadores
  // ---------------------------------------------------------------------------
  const mensajesConSeparadores = agruparPorFecha(mensajes).reverse();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ═══ Header del chat ═══ */}
      <div className={`px-4 ${mostrarAccionesEnHeader ? 'py-1' : 'py-2.5'} flex items-center gap-3 border-b border-gray-300 shrink-0 bg-white/90`}>

        {/* ── Zona izquierda: Avatar+Info  ó  Input búsqueda  ó  Acciones mensaje (móvil) ── */}
        {mostrarAccionesEnHeader ? (
          /* Acciones de mensaje en el header (móvil long press) */
          <AccionesHeaderMobile
            mensaje={menuMensaje!.mensaje}
            esMio={menuMensaje!.mensaje.emisorId === miId}
            esMisNotas={esMisNotas}
            conversacionActivaId={conversacionActivaId}
            mensajesFijados={mensajesFijados}
            onEditar={handleEditarMensaje}
            onResponder={handleResponderMensaje}
            onCerrar={() => setMenuMensaje(null)}
          />
        ) : busquedaAbierta && conversacionActivaId ? (
          <BarraBusquedaChat
            conversacionId={conversacionActivaId}
            onCerrar={() => {
              setBusquedaAbierta(false);
              setMensajeResaltadoId(null);
            }}
            onMensajeSeleccionado={handleMensajeSeleccionado}
          />
        ) : (
          <>
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full shrink-0">
              {esMisNotas ? (
                <div className="w-full h-full rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <StickyNote className="w-5 h-5 text-white" />
                </div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt={nombre} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{iniciales}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {esNegocio && <Store className="w-4 h-4 text-amber-500 shrink-0" />}
                <p className="text-base font-bold text-gray-800 truncate leading-tight">{nombre}</p>
              </div>
              {esMisNotas ? (
                <p className="text-xs text-gray-400 font-medium">Notas personales</p>
              ) : esBloqueado ? (
                <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                  <ShieldBan className="w-3 h-3" />
                  Bloqueado
                </p>
              ) : estaEscribiendo ? (
                <p className="text-xs text-green-500 font-semibold">Escribiendo...</p>
              ) : (
                <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  En línea
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Zona derecha: Acciones (ocultas cuando el header muestra acciones de mensaje) ── */}
        {!mostrarAccionesEnHeader && (
        <div className="flex gap-1.5 shrink-0">
          {!esMisNotas && (
            <>
              {/* Lupita: abre búsqueda / cuando está abierta se oculta (X está dentro de BarraBusquedaChat) */}
              {!busquedaAbierta && (
                <button
                  onClick={() => setBusquedaAbierta(true)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-100 text-gray-500 hover:text-blue-500"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
              <div className="relative">
                {!esTemporal && (
                  <>
                    <button
                      onClick={() => setMenuAbierto((v) => !v)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${menuAbierto
                        ? 'bg-gray-200 text-blue-500'
                        : 'hover:bg-gray-100 text-gray-500 hover:text-blue-500'
                        }`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {menuAbierto && conversacion && (
                      <MenuContextualChat
                        conversacion={conversacion}
                        onCerrar={() => setMenuAbierto(false)}
                      />
                    )}
                  </>
                )}
              </div>
            </>
          )}
          <button
            onClick={cerrarChatYA}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-400 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        )}
      </div>

      {/* ═══ Banner: Contacto bloqueado ═══ */}
      {esBloqueado && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-50 border-b border-red-200 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldBan className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-600 font-medium">Has bloqueado a este contacto. No puede enviarte mensajes.</p>
          </div>
          <button
            onClick={() => otro?.id && desbloquearUsuario(otro.id)}
            className="text-xs font-semibold text-red-500 hover:text-red-700 whitespace-nowrap cursor-pointer shrink-0"
          >
            Desbloquear
          </button>
        </div>
      )}

      {/* ═══ Banner: Mensajes fijados ═══ */}
      {mensajesFijados.length > 0 && !esMisNotas && (
        <div className="flex items-center gap-0 bg-white/80 border-b border-gray-200 shrink-0">
          <div className="pl-3 py-1.5 shrink-0 flex items-center">
            <Pin className="w-4 h-4 text-blue-500 rotate-45" />
          </div>
          {/* Flecha izquierda */}
          {flechasFijados.izq && (
            <button
              onClick={() => { fijadosRef.current?.scrollBy({ left: -150, behavior: 'smooth' }); }}
              className="w-6 h-full flex items-center justify-center shrink-0 hover:bg-gray-100 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
          {/* Chips scrolleables */}
          <div
            ref={fijadosRef}
            onScroll={checkFlechasFijados}
            className="flex items-center gap-1.5 px-1.5 py-1.5 overflow-x-hidden flex-1 min-w-0"
          >
            {mensajesFijados.map((fijado) => (
              <button
                key={fijado.id}
                onClick={() => {
                  setMensajeResaltadoId(fijado.mensajeId);
                  setTimeout(() => setMensajeResaltadoId(null), 2000);
                }}
                className="group/pin flex items-center gap-1.5 px-2 py-0.5 bg-blue-50/80 hover:bg-blue-100 rounded-full shrink-0 cursor-pointer border border-blue-200/50 max-w-[200px]"
              >
                <span className="text-xs text-gray-700 font-medium truncate">
                  {fijado.mensaje.contenido}
                </span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (conversacionActivaId) desfijarMensaje(conversacionActivaId, fijado.mensajeId);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-200 opacity-0 group-hover/pin:opacity-100 shrink-0"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </span>
              </button>
            ))}
          </div>
          {/* Flecha derecha */}
          {flechasFijados.der && (
            <button
              onClick={() => { fijadosRef.current?.scrollBy({ left: 150, behavior: 'smooth' }); }}
              className="w-6 h-full flex items-center justify-center shrink-0 hover:bg-gray-100 cursor-pointer pr-1"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* ═══ Área de mensajes ═══ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onClick={(e) => {
          // Click fuera de una burbuja → deseleccionar mensaje
          if (menuMensaje && !(e.target as HTMLElement).closest('[id^="msg-"]')) {
            setMenuMensaje(null);
          }
        }}
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col-reverse gap-1 bg-linear-to-br from-blue-100/80 via-indigo-100/60 to-sky-100/70 scrollbar-hide"
      >
        {/* Mensajes agrupados por fecha */}
        {!cargandoMensajes && (
          <>
            {/* Indicador escribiendo */}
            {estaEscribiendo && <IndicadorEscribiendo />}

            {mensajesConSeparadores.map((item) => {
              if (item.tipo === 'separador') {
                return <SeparadorFecha key={item.fecha} fecha={item.fecha} />;
              }
              return (
                <BurbujaMensaje
                  key={item.mensaje.id}
                  mensaje={item.mensaje}
                  esMio={item.mensaje.emisorId === miId}
                  esMisNotas={esMisNotas}
                  resaltado={item.mensaje.id === mensajeResaltadoId}
                  onMenuContextual={handleMenuContextualMensaje}
                  onReaccionar={handleReaccionar}
                  menuActivoId={esMobile ? menuMensaje?.mensaje.id ?? null : null}
                />
              );
            })}

            {/* Spinner de carga de mensajes antiguos — al final del DOM = visual tope */}
            {cargandoMensajesAntiguos && (
              <div className="flex justify-center py-2">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Input de mensaje / Barra de bloqueado ═══ */}
      {esBloqueado ? (
        <div className="border-t border-gray-300 bg-gray-100 shrink-0 px-4 py-3.5 flex items-center justify-center gap-2">
          <ShieldBan className="w-4 h-4 text-gray-400 shrink-0" />
          <p className="text-[13px] text-gray-500">No puedes enviar mensajes a este contacto.</p>
          <button
            onClick={() => otro?.id && desbloquearUsuario(otro.id)}
            className="text-[13px] font-semibold text-blue-500 hover:text-blue-700 cursor-pointer"
          >
            Desbloquear
          </button>
        </div>
      ) : (
        <InputMensaje
          mensajeEditando={mensajeEditando}
          onCancelarEdicion={handleCancelarEdicion}
          mensajeRespondiendo={mensajeRespondiendo}
          onCancelarRespuesta={handleCancelarRespuesta}
        />
      )}

      {/* ═══ Menú contextual de mensaje (solo desktop: click derecho) ═══ */}
      {menuMensaje && !esMobile && (
        <MenuContextualMensaje
          mensaje={menuMensaje.mensaje}
          esMio={menuMensaje.mensaje.emisorId === miId}
          esMisNotas={esMisNotas}
          posicion={menuMensaje.posicion}
          onCerrar={handleCerrarMenuMensaje}
          onEditar={handleEditarMensaje}
          onResponder={handleResponderMensaje}
          esMobile={false}
        />
      )}
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTE: Acciones en el header (móvil long press)
// =============================================================================

function AccionesHeaderMobile({
  mensaje,
  esMio,
  esMisNotas,
  conversacionActivaId,
  mensajesFijados,
  onEditar,
  onResponder,
  onCerrar,
}: {
  mensaje: Mensaje;
  esMio: boolean;
  esMisNotas: boolean;
  conversacionActivaId: string | null;
  mensajesFijados: Array<{ mensajeId: string }>;
  onEditar: (msg: Mensaje) => void;
  onResponder: (msg: Mensaje) => void;
  onCerrar: () => void;
}) {
  const acciones: Array<{ icono: typeof Reply; label: string; onClick: () => void; color?: string }> = [];

  // Responder
  if (!esMisNotas) {
    acciones.push({
      icono: Reply,
      label: 'Responder',
      onClick: () => { onCerrar(); onResponder(mensaje); },
    });
  }

  // Copiar
  acciones.push({
    icono: Copy,
    label: 'Copiar',
    onClick: () => { onCerrar(); if (mensaje.contenido) navigator.clipboard.writeText(mensaje.contenido); },
  });

  // Fijar/Desfijar
  if (!esMisNotas && conversacionActivaId) {
    const estaFijado = mensajesFijados.some((f) => f.mensajeId === mensaje.id);
    acciones.push({
      icono: estaFijado ? PinOff : Pin,
      label: estaFijado ? 'Desfijar' : 'Fijar',
      onClick: async () => {
        onCerrar();
        try {
          if (estaFijado) {
            await chatyaService.desfijarMensaje(conversacionActivaId, mensaje.id);
          } else {
            await chatyaService.fijarMensaje(conversacionActivaId, mensaje.id);
          }
        } catch { void 0; }
      },
    });
  }

  // Editar (solo propios, tipo texto, no eliminados)
  if (esMio && mensaje.tipo === 'texto' && !mensaje.eliminado) {
    acciones.push({
      icono: Pencil,
      label: 'Editar',
      onClick: () => { onCerrar(); onEditar(mensaje); },
    });
  }

  // Eliminar (solo propios, no eliminados)
  if (esMio && !mensaje.eliminado) {
    acciones.push({
      icono: Trash2,
      label: 'Eliminar',
      onClick: async () => { onCerrar(); try { await chatyaService.eliminarMensaje(mensaje.id); } catch { void 0; } },
      color: 'text-red-500',
    });
  }

  return (
    <div className="flex-1 flex items-center justify-around">
      {acciones.map((accion) => (
        <button
          key={accion.label}
          onClick={accion.onClick}
          className="flex flex-col items-center justify-center gap-1 py-1 rounded-lg active:bg-gray-100 cursor-pointer min-w-12"
          title={accion.label}
        >
          <accion.icono className={`w-6 h-6 ${accion.color || 'text-gray-600'}`} />
          <span className={`text-[10px] font-semibold ${accion.color || 'text-gray-500'}`}>{accion.label}</span>
        </button>
      ))}
      <button
        onClick={onCerrar}
        className="flex flex-col items-center justify-center gap-1 py-1 rounded-lg active:bg-gray-100 cursor-pointer min-w-12"
      >
        <X className="w-6 h-6 text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-400">Cerrar</span>
      </button>
    </div>
  );
}

// =============================================================================
// HELPER: Agrupar mensajes por fecha e intercalar separadores
// =============================================================================

function agruparPorFecha(mensajes: Mensaje[]): Array<{ tipo: 'separador'; fecha: string } | { tipo: 'mensaje'; mensaje: Mensaje }> {
  const resultado: Array<{ tipo: 'separador'; fecha: string } | { tipo: 'mensaje'; mensaje: Mensaje }> = [];
  let ultimaFecha = '';
  const ordenados = [...mensajes].reverse();

  for (const msg of ordenados) {
    const fecha = new Date(msg.createdAt).toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    if (fecha !== ultimaFecha) {
      ultimaFecha = fecha;
      resultado.push({ tipo: 'separador', fecha });
    }
    resultado.push({ tipo: 'mensaje', mensaje: msg });
  }
  return resultado;
}

export default VentanaChat;