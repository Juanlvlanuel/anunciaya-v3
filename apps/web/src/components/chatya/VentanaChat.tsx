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

import { useRef, useEffect, useCallback, useState, useMemo, memo, type RefObject, type MutableRefObject } from 'react';
import { Search, MoreVertical, Store, StickyNote, X, Reply, Forward, Copy, Pin, PinOff, Pencil, Trash2, ShieldBan, ChevronDown, UserPlus, UserMinus, ArrowLeft, MessageSquare } from 'lucide-react';
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
import { PanelInfoContacto, cachéNegocio, cachéCliente } from './PanelInfoContacto';
import { ModalReenviar } from './ModalReenviar';
import { ModalImagenes } from '../ui/ModalImagenes';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import Tooltip from '../ui/Tooltip';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { Mensaje } from '../../types/chatya';
import { obtenerPerfilSucursal } from '../../services/negociosService';
import { getDetalleCliente } from '../../services/clientesService';
import { diagMarca, diagSuscribir } from '../../utils/diagnosticoChatYA';

// =============================================================================
// TIPOS
// =============================================================================
type ItemChatYA = { tipo: 'separador'; fecha: string } | { tipo: 'mensaje'; mensaje: Mensaje };

// =============================================================================
// AreaMensajes — Componente aislado con React.memo
// Virtuoso causa 2-3 re-renders internos al montar/posicionar. Sin memo, cada uno
// re-renderiza TODO VentanaChat (~36ms × 3 = ~108ms desperdiciados).
// Con memo, solo AreaMensajes se re-renderiza si sus props cambian.
// =============================================================================
interface AreaMensajesProps {
  datos: ItemChatYA[];
  firstItemIndex: number;
  virtuosoRef: RefObject<VirtuosoHandle | null>;
  virtuosoWrapperRef: RefObject<HTMLDivElement | null>;
  virtuosoListoRef: MutableRefObject<boolean>;
  scrollerRef: MutableRefObject<HTMLElement | null>;
  mostrarScrollAbajoRef: MutableRefObject<boolean>;
  scrollBtnRef: RefObject<HTMLButtonElement | null>;
  diagItemCountRef: MutableRefObject<number>;
  cargandoMensajesAntiguos: boolean;
  estaEscribiendo: boolean;
  esMobile: boolean;
  esMisNotas: boolean;
  miId: string;
  mensajeResaltadoId: string | null;
  menuMensajeId: string | null;
  onStartReached: () => void;
  onMenuContextual: (msg: Mensaje, pos: { x: number; y: number }) => void;
  onReaccionar: (mensajeId: string, emoji: string) => Promise<void>;
}

const AreaMensajes = memo(function AreaMensajes({
  datos, firstItemIndex,
  virtuosoRef, virtuosoWrapperRef, virtuosoListoRef,
  scrollerRef, mostrarScrollAbajoRef, scrollBtnRef, diagItemCountRef,
  cargandoMensajesAntiguos, estaEscribiendo,
  esMobile, esMisNotas, miId, mensajeResaltadoId, menuMensajeId,
  onStartReached, onMenuContextual, onReaccionar,
}: AreaMensajesProps) {
  diagMarca('5b. AreaMensajes render');

  return (
    <div ref={virtuosoWrapperRef} style={{ position: 'absolute', inset: 0, opacity: 0 }}>
      <Virtuoso
        ref={virtuosoRef}
        data={datos}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={datos.length - 1}
        defaultItemHeight={68}
        followOutput="auto"
        alignToBottom
        overscan={400}
        increaseViewportBy={200}
        startReached={onStartReached}
        atBottomStateChange={(atBottom) => {
          mostrarScrollAbajoRef.current = !atBottom;
          if (scrollBtnRef.current) {
            scrollBtnRef.current.style.display = atBottom ? 'none' : 'flex';
          }
        }}
        atBottomThreshold={300}
        scrollerRef={(ref) => {
          if (ref instanceof HTMLElement) {
            ref.setAttribute('data-scroll-container', '');
            scrollerRef.current = ref;
            diagMarca('8. Virtuoso scrollerRef');
          }
        }}
        itemContent={(_index, item) => {
          diagItemCountRef.current++;
          if (diagItemCountRef.current === 1) {
            diagMarca('7. primer itemContent');
            if (!virtuosoListoRef.current) {
              virtuosoListoRef.current = true;
              requestAnimationFrame(() => {
                if (virtuosoWrapperRef.current) {
                  virtuosoWrapperRef.current.style.opacity = '1';
                }
              });
            }
          }
          return (
            <div className="pb-1 px-3 lg:px-12 2xl:px-16">
              {item.tipo === 'separador' ? (
                <SeparadorFecha key={item.fecha} fecha={item.fecha} />
              ) : (
                <BurbujaMensaje
                  key={item.mensaje.id}
                  mensaje={item.mensaje}
                  esMio={item.mensaje.emisorId === miId}
                  esMisNotas={esMisNotas}
                  miId={miId}
                  resaltado={item.mensaje.id === mensajeResaltadoId}
                  onMenuContextual={onMenuContextual}
                  onReaccionar={onReaccionar}
                  menuActivoId={esMobile ? menuMensajeId : null}
                />
              )}
            </div>
          );
        }}
        components={{
          Header: () => cargandoMensajesAntiguos ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : null,
          Footer: () => estaEscribiendo ? <IndicadorEscribiendo /> : null,
        }}
        style={{
          height: '100%',
          scrollbarWidth: esMobile ? 'none' : 'auto',
          scrollbarColor: '#A1B6C9 transparent',
        }}
        className="py-2"
      />
    </div>
  );
});

// =============================================================================
// COMPONENTE
// =============================================================================

function VentanaChatInner() {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------
  const conversacionActivaId = useChatYAStore((s) => s.conversacionActivaId);
  const chatTemporal = useChatYAStore((s) => s.chatTemporal);
  const mensajes = useChatYAStore((s) => s.mensajes);
  const cargandoMensajes = useChatYAStore((s) => s.cargandoMensajes);
  const cargandoMensajesAntiguos = useChatYAStore((s) => s.cargandoMensajesAntiguos);
  const escribiendo = useChatYAStore((s) => s.escribiendo);
  const misNotasId = useChatYAStore((s) => s.misNotasId);
  const bloqueados = useChatYAStore((s) => s.bloqueados);
  const desbloquearUsuario = useChatYAStore((s) => s.desbloquearUsuario);
  const mensajesFijados = useChatYAStore((s) => s.mensajesFijados);
  const desfijarMensaje = useChatYAStore((s) => s.desfijarMensaje);
  const contactos = useChatYAStore((s) => s.contactos);
  const agregarContactoStore = useChatYAStore((s) => s.agregarContacto);
  const eliminarContactoStore = useChatYAStore((s) => s.eliminarContacto);
  const volverALista = useChatYAStore((s) => s.volverALista);

  // ── Selectores DERIVADOS: solo re-renderizan si NUESTRA conversación cambia,
  //    NO cuando cambia el badge/preview/typing de OTRA conversación ──
  const conversacionEnStore = useChatYAStore(
    (s) => s.conversaciones.find((c) => c.id === s.conversacionActivaId) ?? null
  );
  const conversacionEnArchivados = useChatYAStore(
    (s) => s.conversacionesArchivadas.find((c) => c.id === s.conversacionActivaId) ?? null
  );

  const usuario = useAuthStore((s) => s.usuario);
  const cerrarChatYA = useUiStore((s) => s.cerrarChatYA);

  // ---------------------------------------------------------------------------
  // Derivados
  // ---------------------------------------------------------------------------
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
  const modoActivo = usuario?.modoActivo || 'personal';
  const esBloqueado = !esMisNotas && !esTemporal && bloqueados.some((b) => b.bloqueadoId === otro?.id);

  // Derivar sucursalId del otro participante
  const otroSucursalId = conversacion
    ? (conversacion.participante1Id === miId ? conversacion.participante2SucursalId : conversacion.participante1SucursalId)
    : chatTemporal?.datosCreacion?.participante2SucursalId || null;

  // Verificar si el otro participante ya es contacto
  const contactoExistente = !esMisNotas && otro
    ? contactos.find((c) =>
        c.contactoId === otro.id &&
        c.tipo === modoActivo &&
        c.sucursalId === otroSucursalId
      )
    : undefined;

  const estaEscribiendo = !esMisNotas && escribiendo?.conversacionId === conversacionActivaId;

  // Alias del contacto tiene prioridad sobre el nombre real
  const nombreMostrar = contactoExistente?.alias?.trim() || nombre;

  // ---------------------------------------------------------------------------
  // Precarga silenciosa del panel info al seleccionar conversación
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (esMisNotas || !otro) return;
    const sucId = otroSucursalId;
    const otherId = otro.id;
    if (esNegocio && sucId && !cachéNegocio.has(sucId)) {
      obtenerPerfilSucursal(sucId)
        .then((res) => { if (res.success && res.data) cachéNegocio.set(sucId, res.data); })
        .catch(() => void 0);
    } else if (!esNegocio && modoActivo === 'comercial' && !cachéCliente.has(otherId)) {
      getDetalleCliente(otherId)
        .then((res) => { if (res.success && res.data) cachéCliente.set(otherId, res.data); })
        .catch(() => void 0);
    }
  }, [otro?.id, otroSucursalId, esNegocio, modoActivo, esMisNotas]);

  // ---------------------------------------------------------------------------
  // Estado local: panel lateral de información del contacto
  // ---------------------------------------------------------------------------
  const [panelAbierto, setPanelAbierto] = useState(false);
  const panelMontado = useRef(false);
  if (panelAbierto) panelMontado.current = true;

  // ---------------------------------------------------------------------------
  // Estado local: modal de imagen del avatar (vive fuera del panel para no desmontarse)
  // ---------------------------------------------------------------------------
  const [modalAvatarUrl, setModalAvatarUrl] = useState<string | null>(null);

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
  // Estado local: modo reenvío (al seleccionar "Reenviar" del menú contextual)
  // ---------------------------------------------------------------------------
  const [mensajeReenviando, setMensajeReenviando] = useState<Mensaje | null>(null);

  // ---------------------------------------------------------------------------
  // Breakpoint para menú contextual (bottom sheet en móvil, popup en desktop)
  // ---------------------------------------------------------------------------
  const { esMobile } = useBreakpoint();

  // ── DIAGNÓSTICO refs (el tracking se hace más abajo, después de todos los useState) ──
  const diagItemCountRef = useRef(0);
  const diagPrevRef = useRef<Record<string, unknown>>({});

  // ---------------------------------------------------------------------------
  // Estado local: búsqueda dentro del chat
  // ---------------------------------------------------------------------------
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [mensajeResaltadoId, setMensajeResaltadoId] = useState<string | null>(null);
  /** Ref: controla visibilidad del botón scroll-abajo SIN causar re-render */
  const mostrarScrollAbajoRef = useRef(false);
  const scrollBtnRef = useRef<HTMLButtonElement>(null);
  const fijadosRef = useRef<HTMLDivElement>(null);
  /** Índice del mensaje fijado visible actualmente en el banner */
  const [fijadoIndice, setFijadoIndice] = useState(0);
  /** Menú contextual del banner de fijados (long press) */
  const [menuFijadoPos, setMenuFijadoPos] = useState<{ x: number; y: number } | null>(null);
  const menuFijadoRef = useRef<HTMLDivElement>(null);

  // ── DIAGNÓSTICO: Detectar QUÉ causa cada re-render ──
  {
    const current: Record<string, unknown> = {
      // --- useChatYAStore ---
      conversacionActivaId, chatTemporal, mensajes, cargandoMensajes,
      cargandoMensajesAntiguos, escribiendo, misNotasId,
      bloqueados, mensajesFijados, contactos,
      conversacionEnStore, conversacionEnArchivados,
      // --- useChatYAStore acciones ---
      desbloquearUsuario, desfijarMensaje, agregarContactoStore,
      eliminarContactoStore, volverALista,
      // --- otros stores ---
      usuario, cerrarChatYA, esMobile,
      // --- useState local ---
      conversacionRemota, panelAbierto, modalAvatarUrl,
      menuAbierto, menuMensaje, mensajeEditando,
      mensajeRespondiendo, mensajeReenviando,
      busquedaAbierta, mensajeResaltadoId, fijadoIndice, menuFijadoPos,
    };
    const prev = diagPrevRef.current;
    const cambios: string[] = [];
    for (const key of Object.keys(current)) {
      if (prev[key] !== current[key]) cambios.push(key);
    }
    diagMarca('5. VentanaChat render' + (cambios.length > 0 ? ' [' + cambios.join(', ') + ']' : ' [¿CONTEXTO?]'));
    diagPrevRef.current = current;
  }
  diagItemCountRef.current = 0;

  // ---------------------------------------------------------------------------
  // Handler: agregar/eliminar contacto desde header
  // ---------------------------------------------------------------------------
  const handleToggleContacto = useCallback(async () => {
    if (!otro) return;
    if (contactoExistente) {
      await eliminarContactoStore(contactoExistente.id);
    } else {
      await agregarContactoStore({
        contactoId: otro.id,
        tipo: modoActivo as 'personal' | 'comercial',
        sucursalId: otroSucursalId || null,
      }, {
        nombre: otro.nombre,
        apellidos: otro.apellidos,
        avatarUrl: otro.avatarUrl,
        negocioNombre: otro.negocioNombre,
        negocioLogo: otro.negocioLogo,
        sucursalNombre: otro.sucursalNombre,
      });
    }
  }, [otro, contactoExistente, eliminarContactoStore, agregarContactoStore, modoActivo, otroSucursalId]);

  // Mantener índice del fijado válido cuando cambian los fijados
  useEffect(() => {
    if (mensajesFijados.length > 0 && fijadoIndice >= mensajesFijados.length) {
      setFijadoIndice(0);
    }
  }, [mensajesFijados, fijadoIndice]);

  /** Callback estable para BarraBusquedaChat */
  const handleMensajeSeleccionado = useCallback((id: string | null) => {
    setMensajeResaltadoId(id);
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers: Menú contextual de mensaje
  // ---------------------------------------------------------------------------
  const handleMenuContextualMensaje = useCallback((msg: Mensaje, pos: { x: number; y: number }) => {
    setMenuMensaje({ mensaje: msg, posicion: pos });

    // Auto-scroll para que el popup de emojis (-top-14 ≈ 56px) sea visible
    requestAnimationFrame(() => {
      const msgEl = document.getElementById(`msg-${msg.id}`);
      const container = scrollerRef.current;
      if (msgEl && container) {
        const msgRect = msgEl.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const espacioArriba = msgRect.top - containerRect.top;
        if (espacioArriba < 80) {
          container.scrollBy({ top: -(80 - espacioArriba), behavior: 'smooth' });
        }
      }
    });
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

  const handleReenviarMensaje = useCallback((msg: Mensaje) => {
    setMensajeReenviando(msg);
  }, []);

  // ---------------------------------------------------------------------------
  // Refs — Virtuoso
  // ---------------------------------------------------------------------------
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  /** Flag para distinguir carga de antiguos vs mensaje nuevo */
  const cargandoAntiguosRef = useRef(false);
  /** Índice virtual inicial (número alto, decrece al cargar mensajes antiguos) */
  const VIRTUAL_START = 100000;
  const firstItemIndexRef = useRef(VIRTUAL_START);
  const prevDataCountRef = useRef(0);
  /** Ocultar Virtuoso hasta que tenga items — ref + DOM directo, sin re-render */
  const virtuosoListoRef = useRef(false);
  const virtuosoWrapperRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Reseteo síncrono: detectar cambio de conversación DURANTE el render
  // Todo via refs — CERO setState = CERO re-renders extras
  // ---------------------------------------------------------------------------
  const prevConvIdRef = useRef(conversacionActivaId);
  if (prevConvIdRef.current !== conversacionActivaId) {
    prevConvIdRef.current = conversacionActivaId;
    firstItemIndexRef.current = VIRTUAL_START;
    prevDataCountRef.current = 0;
    // Ocultar Virtuoso hasta que tenga items (via DOM directo)
    virtuosoListoRef.current = false;
    if (virtuosoWrapperRef.current) {
      virtuosoWrapperRef.current.style.opacity = '0';
    }
  }

  // Datos: mensajes en orden cronológico con separadores de fecha intercalados
  const mensajesConSeparadores = useMemo(() => {
    const resultado = agruparPorFecha(mensajes);
    diagMarca('6. agruparPorFecha (' + resultado.length + ' items)');
    return resultado;
  }, [mensajes]);

  // ---------------------------------------------------------------------------
  // Ajustar firstItemIndex al cargar mensajes antiguos (prepend) — SÍNCRONO
  // Se ejecuta durante el render para que Virtuoso lea el valor correcto
  // ---------------------------------------------------------------------------
  const currentDataCount = mensajesConSeparadores.length;
  if (cargandoAntiguosRef.current && currentDataCount > prevDataCountRef.current && prevDataCountRef.current > 0) {
    const nuevos = currentDataCount - prevDataCountRef.current;
    firstItemIndexRef.current -= nuevos;
    cargandoAntiguosRef.current = false;
  }
  prevDataCountRef.current = currentDataCount;

  // ── DIAGNÓSTICO: Marcar cuándo el navegador termina de pintar ──
  useEffect(() => {
    if (!conversacionActivaId || mensajes.length === 0) return;
    requestAnimationFrame(() => {
      diagMarca('10. DOM commit (rAF1)');
      requestAnimationFrame(() => {
        diagMarca('11. PINTADO en pantalla (rAF2) — ' + diagItemCountRef.current + ' items');
      });
    });
  }, [conversacionActivaId, mensajes.length]);

  // ---------------------------------------------------------------------------
  // Effect: Scroll al mensaje resaltado por búsqueda
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mensajeResaltadoId) return;

    // Buscar el índice en la lista virtualizada
    const index = mensajesConSeparadores.findIndex(
      (item) => item.tipo === 'mensaje' && item.mensaje.id === mensajeResaltadoId
    );

    if (index !== -1 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index, align: 'center', behavior: 'smooth' });
    }
  }, [mensajeResaltadoId, mensajesConSeparadores]);

  // ---------------------------------------------------------------------------
  // Handler: Cargar mensajes antiguos cuando Virtuoso llega al tope
  // ---------------------------------------------------------------------------
  const handleStartReached = useCallback(() => {
    const state = useChatYAStore.getState();
    if (state.cargandoMensajesAntiguos || !state.hayMasMensajes) return;
    cargandoAntiguosRef.current = true;
    state.cargarMensajesAntiguos();
  }, []);

  /** Flag: mostrar acciones en header (móvil, cuando hay menú contextual activo) */
  const mostrarAccionesEnHeader = esMobile && menuMensaje !== null && !esMisNotas;

  // ---------------------------------------------------------------------------
  // Handler: Reaccionar desde hover (desktop) o burbuja flotante (móvil)
  // ---------------------------------------------------------------------------
  const handleReaccionar = useCallback(async (mensajeId: string, emoji: string) => {
    // ── Actualización optimista ──
    const prevMensajes = useChatYAStore.getState().mensajes;
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) => {
        if (m.id !== mensajeId) return m;
        const reacciones = [...(m.reacciones || [])].map((r) => ({ ...r, usuarios: [...(r.usuarios as string[])] }));
        const existente = reacciones.find((r) => r.emoji === emoji);
        const yaReaccione = (existente?.usuarios as string[] | undefined)?.includes(miId);

        if (yaReaccione && existente) {
          // Mismo emoji → toggle off (quitar)
          existente.cantidad -= 1;
          existente.usuarios = (existente.usuarios as string[]).filter((id) => id !== miId);
          if (existente.cantidad <= 0) {
            const idx = reacciones.indexOf(existente);
            reacciones.splice(idx, 1);
          }
        } else {
          // Emoji diferente o ninguno → quitar reacción previa si existe
          for (const r of reacciones) {
            const idx = (r.usuarios as string[]).indexOf(miId);
            if (idx !== -1) {
              r.cantidad -= 1;
              (r.usuarios as string[]).splice(idx, 1);
            }
          }
          // Limpiar emojis que quedaron en 0
          const limpias = reacciones.filter((r) => r.cantidad > 0);

          // Agregar nueva reacción
          const existenteNuevo = limpias.find((r) => r.emoji === emoji);
          if (existenteNuevo) {
            existenteNuevo.cantidad += 1;
            (existenteNuevo.usuarios as string[]).push(miId);
          } else {
            limpias.push({ emoji, cantidad: 1, usuarios: [miId] });
          }
          return { ...m, reacciones: limpias };
        }
        return { ...m, reacciones };
      }),
    }));

    // Cerrar menú en móvil después de reaccionar
    if (esMobile) setMenuMensaje(null);

    // ── Llamada al servidor ──
    try {
      await chatyaService.toggleReaccion(mensajeId, emoji);
    } catch {
      // Revertir si falla
      useChatYAStore.setState({ mensajes: prevMensajes });
    }
  }, [esMobile, miId]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden">
      {/* ── Área principal del chat ── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-linear-to-b from-[#0B358F] to-[#050d1a] lg:bg-linear-to-br lg:from-blue-200/60 lg:via-indigo-200/50 lg:to-sky-200/60">
        {/* ═══ Header del chat ═══ */}
        <div className={`px-4 ${mostrarAccionesEnHeader ? 'py-1' : 'py-2.5'} flex items-center gap-3 shrink-0 border-b border-white/10 bg-[#0a1628] lg:border-slate-200 lg:bg-linear-to-b lg:from-slate-100 lg:to-blue-50`}>

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
              onReenviar={handleReenviarMensaje}
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
              {/* Flecha atrás — solo móvil */}
              {esMobile && (
                <button
                  onClick={volverALista}
                  className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10 lg:hover:bg-slate-200 text-white/70 lg:text-gray-500 shrink-0"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              )}

              {/* Avatar — clickeable para abrir modal si hay foto, o panel */}
              <button
                onClick={() => {
                  if (!esMisNotas && avatarUrl) {
                    setModalAvatarUrl(avatarUrl);
                  } else if (!esMisNotas) {
                    setPanelAbierto((v) => !v);
                  }
                }}
                className={`w-10 h-10 rounded-full shrink-0 ${!esMisNotas ? 'cursor-pointer hover:opacity-80' : ''}`}
              >
                {esMisNotas ? (
                  <div className="w-full h-full rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                    <StickyNote className="w-5 h-5 text-white" />
                  </div>
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt={nombreMostrar} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{iniciales}</span>
                  </div>
                )}
              </button>

              {/* Info — clickeable para abrir panel */}
              <button
                onClick={() => !esMisNotas && setPanelAbierto((v) => !v)}
                className={`flex-1 min-w-0 text-left ${!esMisNotas ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-1.5">
                  {esNegocio && <Store className="w-4 h-4 text-amber-500 shrink-0" />}
                  <p className="text-base font-bold text-white lg:text-gray-800 truncate leading-tight">{nombreMostrar}</p>
                </div>
                {esMisNotas ? (
                  <p className="text-xs text-white/50 lg:text-gray-400 font-medium">Notas personales</p>
                ) : esBloqueado ? (
                  <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                    <ShieldBan className="w-3 h-3" />
                    Bloqueado
                  </p>
                ) : estaEscribiendo ? (
                  <p className="text-xs text-green-500 font-semibold">Escribiendo...</p>
                ) : (
                  <p className="text-xs font-medium flex items-center gap-1 truncate">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0" />
                    <span className="text-green-500">En línea</span>
                    {conversacion?.contextoTipo && conversacion.contextoTipo !== 'directo' && conversacion.contextoTipo !== 'notas' && (
                      <>
                        <span className="text-white/30 lg:text-gray-300">·</span>
                        <span className="text-white/40 lg:text-gray-400 truncate">
                          {conversacion.contextoTipo === 'negocio' && 'Desde: Tu perfil'}
                          {conversacion.contextoTipo === 'oferta' && `Desde oferta: ${conversacion.contextoNombre || 'Ofertas'}`}
                          {conversacion.contextoTipo === 'marketplace' && `Desde publicación: ${conversacion.contextoNombre || 'Marketplace'}`}
                          {conversacion.contextoTipo === 'empleo' && `Desde vacante: ${conversacion.contextoNombre || 'Empleos'}`}
                          {conversacion.contextoTipo === 'dinamica' && `Desde dinámica: ${conversacion.contextoNombre || 'Dinámicas'}`}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </button>
            </>
          )}

          {/* ── Zona derecha: Acciones (ocultas cuando el header muestra acciones de mensaje o búsqueda en móvil) ── */}
          {!mostrarAccionesEnHeader && !(busquedaAbierta && esMobile) && (
            <div className="flex gap-1.5 shrink-0">
              {!esMisNotas && (
                <>
                  {/* Lupita: abre búsqueda — solo desktop (en móvil está en menú contextual) */}
                  {!busquedaAbierta && !esMobile && (
                    <button
                      onClick={() => setBusquedaAbierta(true)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200 text-gray-500 hover:text-blue-500"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  )}
                  {/* Agregar/quitar contacto — solo desktop (en móvil está en menú contextual) */}
                  {!esMobile && (
                  <Tooltip text={contactoExistente ? 'Quitar de contactos' : 'Agregar a contactos'}>
                    <button
                      onClick={handleToggleContacto}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${
                        contactoExistente
                          ? 'hover:bg-red-100 text-green-600 hover:text-red-500'
                          : 'hover:bg-slate-200 text-gray-500 hover:text-blue-500'
                      }`}
                    >
                      {contactoExistente ? (
                        <UserMinus className="w-5 h-5" />
                      ) : (
                        <UserPlus className="w-5 h-5" />
                      )}
                    </button>
                  </Tooltip>
                  )}
                  <div className="relative">
                    {!esTemporal && (
                      <>
                        <button
                          onClick={() => setMenuAbierto((v) => !v)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${menuAbierto
                            ? 'bg-white/20 lg:bg-gray-200 text-white lg:text-blue-500'
                            : 'hover:bg-white/10 lg:hover:bg-slate-200 text-white/70 lg:text-gray-500 hover:text-white lg:hover:text-blue-500'
                            }`}
                        >
                          <MoreVertical className="w-6 h-6 lg:w-5 lg:h-5" />
                        </button>
                        {menuAbierto && conversacion && (
                          <MenuContextualChat
                            conversacion={conversacion}
                            onCerrar={() => setMenuAbierto(false)}
                            onBuscar={esMobile ? () => { setMenuAbierto(false); setBusquedaAbierta(true); } : undefined}
                          />
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
              {/* X cerrar — solo desktop (en móvil la flecha atrás lo reemplaza) */}
              {!esMobile && (
              <button
                onClick={cerrarChatYA}
                className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-gray-500 hover:text-red-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              )}
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

        {/* ═══ Banner: Mensaje fijado (estilo WhatsApp) ═══ */}
        {mensajesFijados.filter((f) => f.mensaje).length > 0 && !esMisNotas && (() => {
          const fijadosValidos = mensajesFijados.filter((f) => f.mensaje);
          const indiceSeguro = fijadoIndice < fijadosValidos.length ? fijadoIndice : 0;
          const fijadoActual = fijadosValidos[indiceSeguro];
          if (!fijadoActual) return null;

          const totalFijados = fijadosValidos.length;
          let bannerTimer: ReturnType<typeof setTimeout> | null = null;
          let bannerLongPressed = false;

          return (
            <>
              <div
                ref={fijadosRef}
                className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/90 lg:bg-white/80 border-b border-gray-200 shrink-0 cursor-pointer active:bg-gray-50 select-none"
                onClick={() => {
                  if (bannerLongPressed) { bannerLongPressed = false; return; }
                  // Navegar al mensaje
                  const el = document.getElementById(`msg-${fijadoActual.mensajeId}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setMensajeResaltadoId(fijadoActual.mensajeId);
                  setTimeout(() => setMensajeResaltadoId(null), 2000);
                  // Rotar al siguiente fijado
                  if (totalFijados > 1) {
                    setFijadoIndice((prev) => (prev + 1) % totalFijados);
                  }
                }}
                onTouchStart={(e) => {
                  bannerLongPressed = false;
                  const touchY = e.touches[0].clientY;
                  bannerTimer = setTimeout(() => {
                    bannerLongPressed = true;
                    if (navigator.vibrate) navigator.vibrate(80);
                    setMenuFijadoPos({ x: window.innerWidth / 2, y: touchY });
                  }, 500);
                }}
                onTouchMove={() => { if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; } }}
                onTouchEnd={() => { if (bannerTimer) { clearTimeout(bannerTimer); bannerTimer = null; } }}
                onContextMenu={(e) => { e.preventDefault(); setMenuFijadoPos({ x: e.clientX, y: e.clientY }); }}
              >
                <Pin className="w-5 h-5 text-blue-500 rotate-45 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium truncate">
                    {fijadoActual.mensaje.contenido}
                  </p>
                </div>
                {totalFijados > 1 && (
                  <span className="text-xs text-gray-400 font-medium shrink-0">
                    {indiceSeguro + 1} de {totalFijados}
                  </span>
                )}
              </div>

              {/* Menú contextual: opciones del fijado (long press / click derecho) */}
              {menuFijadoPos && (
                <>
                  <div className="fixed inset-0 z-80" onClick={() => setMenuFijadoPos(null)} />
                  <div
                    ref={menuFijadoRef}
                    className="fixed z-80 bg-white rounded-xl shadow-[0_4px_24px_rgba(15,29,58,0.18)] border border-gray-200 overflow-hidden min-w-[180px]"
                    style={{
                      left: Math.min(menuFijadoPos.x, window.innerWidth - 200),
                      top: menuFijadoPos.y + 4,
                    }}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setMenuFijadoPos(null);
                          const el = document.getElementById(`msg-${fijadoActual.mensajeId}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setMensajeResaltadoId(fijadoActual.mensajeId);
                          setTimeout(() => setMensajeResaltadoId(null), 2000);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-gray-100 cursor-pointer"
                      >
                        <MessageSquare className="w-4.5 h-4.5 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Ir al mensaje</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuFijadoPos(null);
                          if (conversacionActivaId && fijadoActual.mensajeId) {
                            desfijarMensaje(conversacionActivaId, fijadoActual.mensajeId);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-gray-100 cursor-pointer"
                      >
                        <PinOff className="w-4.5 h-4.5 text-red-500" />
                        <span className="text-sm font-medium text-red-500">Desfijar mensaje</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          );
        })()}

        {/* ═══ Área de mensajes — Virtuoso (solo ~10-15 nodos en DOM) ═══ */}
        <div
          className="flex-1 relative min-h-0"
          onClick={(e) => {
            if (menuMensaje && !(e.target as HTMLElement).closest('[id^="msg-"]')) {
              setMenuMensaje(null);
            }
          }}
        >
          {!cargandoMensajes && mensajesConSeparadores.length > 0 && (
            <AreaMensajes
              datos={mensajesConSeparadores}
              firstItemIndex={firstItemIndexRef.current}
              virtuosoRef={virtuosoRef}
              virtuosoWrapperRef={virtuosoWrapperRef}
              virtuosoListoRef={virtuosoListoRef}
              scrollerRef={scrollerRef}
              mostrarScrollAbajoRef={mostrarScrollAbajoRef}
              scrollBtnRef={scrollBtnRef}
              diagItemCountRef={diagItemCountRef}
              cargandoMensajesAntiguos={cargandoMensajesAntiguos}
              estaEscribiendo={estaEscribiendo}
              esMobile={esMobile}
              esMisNotas={esMisNotas}
              miId={miId}
              mensajeResaltadoId={mensajeResaltadoId}
              menuMensajeId={esMobile ? menuMensaje?.mensaje.id ?? null : null}
              onStartReached={handleStartReached}
              onMenuContextual={handleMenuContextualMensaje}
              onReaccionar={handleReaccionar}
            />
          )}

          {/* Botón scroll al fondo — siempre montado, visibilidad via ref */}
          <button
            ref={scrollBtnRef}
            style={{ display: 'none' }}
            onClick={() => virtuosoRef.current?.scrollToIndex({ index: mensajesConSeparadores.length - 1, behavior: 'smooth' })}
            className="absolute bottom-4 right-1 lg:right-0 2xl:right-5.5 w-11 h-11 rounded-full shadow-lg items-center justify-center cursor-pointer hover:shadow-xl z-10 bg-linear-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          >
            <ChevronDown className="w-6 h-6 text-white" />
          </button>

          {/* ── DIAGNÓSTICO: Overlay temporal ── */}
          <OverlayDiagnostico />
        </div>

        {/* ═══ Input de mensaje / Barra de bloqueado ═══ */}
        {esBloqueado ? (
          <div className="border-t border-blue-300/40 shrink-0 px-4 py-3.5 flex items-center justify-center gap-2">
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
            nombreContacto={nombreMostrar}
            miId={miId}
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
            onReenviar={handleReenviarMensaje}
            esMobile={false}
          />
        )}
      </div>{/* fin área principal */}

      {/* ═══ Panel lateral de información del contacto ═══ */}
      {panelMontado.current && conversacion && !esMisNotas && (
        <div className={`${panelAbierto ? '' : 'hidden'} ${esMobile ? 'fixed inset-0 z-60 bg-white' : ''}`}>
          <PanelInfoContacto
            conversacion={conversacion}
            onCerrar={() => setPanelAbierto(false)}
            onAbrirImagen={(url) => setModalAvatarUrl(url)}
          />
        </div>
      )}

      {/* ═══ Modal imagen avatar — vive fuera del condicional del panel ═══ */}
      <ModalImagenes
        images={modalAvatarUrl ? [modalAvatarUrl] : []}
        isOpen={!!modalAvatarUrl}
        onClose={() => setModalAvatarUrl(null)}
      />

      {/* ═══ Modal reenviar mensaje ═══ */}
      {mensajeReenviando && (
        <ModalReenviar
          mensaje={mensajeReenviando}
          onCerrar={() => setMensajeReenviando(null)}
        />
      )}
    </div>
  );
}

export const VentanaChat = memo(VentanaChatInner);

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
  onReenviar,
  onCerrar,
}: {
  mensaje: Mensaje;
  esMio: boolean;
  esMisNotas: boolean;
  conversacionActivaId: string | null;
  mensajesFijados: Array<{ mensajeId: string }>;
  onEditar: (msg: Mensaje) => void;
  onResponder: (msg: Mensaje) => void;
  onReenviar: (msg: Mensaje) => void;
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
    onClick: () => { onCerrar(); const sel = window.getSelection()?.toString().trim(); navigator.clipboard.writeText(sel || mensaje.contenido || ''); },
  });

  // Reenviar (no en Mis Notas, no si está eliminado)
  if (!esMisNotas && !mensaje.eliminado) {
    acciones.push({
      icono: Forward,
      label: 'Reenviar',
      onClick: () => { onCerrar(); onReenviar(mensaje); },
    });
  }

  // Fijar/Desfijar
  if (!esMisNotas && conversacionActivaId) {
    const estaFijado = mensajesFijados.some((f) => f.mensajeId === mensaje.id);
    acciones.push({
      icono: estaFijado ? PinOff : Pin,
      label: estaFijado ? 'Desfijar' : 'Fijar',
      onClick: async () => {
        onCerrar();
        const store = useChatYAStore.getState();
        if (estaFijado) {
          await store.desfijarMensaje(conversacionActivaId, mensaje.id);
        } else {
          await store.fijarMensaje(conversacionActivaId, mensaje.id);
        }
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
      onClick: async () => {
        onCerrar();
        await useChatYAStore.getState().eliminarMensaje(mensaje.id);
      },
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
// DIAGNÓSTICO: Overlay temporal — ELIMINAR DESPUÉS DE DIAGNOSTICAR
// =============================================================================

function OverlayDiagnostico() {
  const [marcas, setMarcas] = useState<Array<{ nombre: string; tiempo: number }>>([]);

  useEffect(() => {
    return diagSuscribir((nuevasMarcas) => setMarcas(nuevasMarcas));
  }, []);

  if (marcas.length === 0) return null;

  const total = marcas[marcas.length - 1]?.tiempo ?? 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.88)',
        color: '#fff',
        padding: '10px 12px',
        borderRadius: 10,
        fontSize: 11,
        fontFamily: 'monospace',
        lineHeight: 1.6,
        pointerEvents: 'auto',
        maxHeight: '60vh',
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 12, color: '#fbbf24' }}>
        ⏱️ Diagnóstico ChatYA — Total: {total}ms
      </div>
      {marcas.map((m, i) => {
        const delta = i === 0 ? m.tiempo : m.tiempo - marcas[i - 1].tiempo;
        const esLento = delta > 30;
        return (
          <div key={i} style={{ color: esLento ? '#f87171' : '#86efac' }}>
            {m.nombre} → {m.tiempo}ms {delta > 0 ? `(+${delta}ms)` : ''}
            {esLento ? ' ⚠️ LENTO' : ''}
          </div>
        );
      })}
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