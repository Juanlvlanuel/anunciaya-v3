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
import { Search, MoreVertical, Store, StickyNote, X, Reply, Forward, Copy, Pin, PinOff, Pencil, Trash2, ShieldBan, ChevronsDown, UserPlus, UserMinus, ArrowLeft, MessageSquare } from 'lucide-react';
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
import { VisorImagenesChat } from './VisorImagenesChat';
import { TexturaDoodle } from './TexturaDoodle';
import { ModalImagenes } from '../ui/ModalImagenes';
// Virtuoso eliminado — scroll nativo con IntersectionObserver para paginación
import Tooltip from '../ui/Tooltip';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { Mensaje } from '../../types/chatya';
import { obtenerPerfilSucursal } from '../../services/negociosService';
import { getDetalleCliente } from '../../services/clientesService';


// =============================================================================
// TIPOS
// =============================================================================
type ItemChatYA = { tipo: 'separador'; fecha: string } | { tipo: 'mensaje'; mensaje: Mensaje };

// =============================================================================
// HELPER: Formatear fecha para el sticky (misma lógica que SeparadorFecha)
// =============================================================================
function formatearFechaParaSticky(fechaStr: string): string {
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  const hoyStr = hoy.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const ayerStr = ayer.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  if (fechaStr === hoyStr) return 'Hoy';
  if (fechaStr === ayerStr) return 'Ayer';
  return fechaStr;
}

// =============================================================================
// (Snapshots de Virtuoso eliminados — ya no se necesitan con scroll nativo)
// =============================================================================

// =============================================================================
// AreaMensajes — Scroll nativo con IntersectionObserver para paginación
// Renderiza TODOS los mensajes en el DOM (60-200 mensajes es ligero).
// IntersectionObserver detecta un "sentinel" invisible en el tope para cargar más.
// =============================================================================
interface AreaMensajesProps {
  conversacionId: string | null;
  datos: ItemChatYA[];
  scrollRef: RefObject<HTMLDivElement | null>;
  mostrarScrollAbajoRef: MutableRefObject<boolean>;
  scrollBtnRef: RefObject<HTMLButtonElement | null>;
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
  fechaStickyRef: RefObject<HTMLDivElement | null>;
  atBottomRef: MutableRefObject<boolean>;
  hayMasMensajes: boolean;
  onImagenClick: (mensajeId: string) => void;
  onReenviar: (msg: Mensaje) => void;
}

const AreaMensajes = memo(function AreaMensajes({
  datos,
  scrollRef, mostrarScrollAbajoRef, scrollBtnRef,
  cargandoMensajesAntiguos, estaEscribiendo,
  esMobile, esMisNotas, miId, mensajeResaltadoId, menuMensajeId,
  onStartReached, onMenuContextual, onReaccionar,
  fechaStickyRef, atBottomRef, hayMasMensajes, onImagenClick, onReenviar,
}: AreaMensajesProps) {

  // Ref para el sentinel de paginación (IntersectionObserver)
  const sentinelRef = useRef<HTMLDivElement>(null);
  /** Flag para evitar scroll al fondo durante carga de antiguos */
  const cargandoAntiguosRef = useRef(false);
  /** Guardar scrollHeight antes de insertar mensajes antiguos */
  const prevScrollHeightRef = useRef(0);
  const prevDatosLenRef = useRef(datos.length);
  /** Ref fresco para acceso en scroll listener */
  const datosRef = useRef(datos);
  datosRef.current = datos;

  // ── Scroll inicial al fondo cuando se monta ──
  useEffect(() => {
    if (scrollRef.current && datos.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Solo al montar (key={conversacionActivaId} ya causa remount)
  }, []);

  // ── Preservar posición al cargar mensajes antiguos ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (cargandoAntiguosRef.current && datos.length > prevDatosLenRef.current) {
      // Mensajes antiguos insertados arriba → ajustar scroll para mantener posición
      const nuevoScrollHeight = el.scrollHeight;
      const diferencia = nuevoScrollHeight - prevScrollHeightRef.current;
      el.scrollTop = diferencia;
      cargandoAntiguosRef.current = false;
    } else if (datos.length > prevDatosLenRef.current && prevDatosLenRef.current > 0) {
      // Mensaje nuevo (no antiguos) → scroll al fondo si estábamos abajo
      if (atBottomRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    }

    prevDatosLenRef.current = datos.length;
  }, [datos.length, scrollRef, atBottomRef]);

  // ── IntersectionObserver para cargar mensajes antiguos ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hayMasMensajes && !cargandoAntiguosRef.current) {
          // Guardar scrollHeight ANTES de que se inserten mensajes
          prevScrollHeightRef.current = container.scrollHeight;
          cargandoAntiguosRef.current = true;
          onStartReached();
        }
      },
      { root: container, rootMargin: '200px 0px 0px 0px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollRef, hayMasMensajes, onStartReached]);

  // ── Scroll listener: detectar si está al fondo + actualizar sticky ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let rafId = 0;
    let stickyVisible = false;

    const handleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        if (!el) return;

        // ── Detectar si está al fondo ──
        const distanciaAlFondo = el.scrollHeight - el.scrollTop - el.clientHeight;
        const alFondo = distanciaAlFondo < 60;
        atBottomRef.current = alFondo;
        mostrarScrollAbajoRef.current = !alFondo;
        if (scrollBtnRef.current) {
          scrollBtnRef.current.style.display = !alFondo ? 'flex' : 'none';
        }

        // ── Actualizar fecha sticky ──
        const stickyEl = fechaStickyRef.current;
        if (!stickyEl) return;

        if (distanciaAlFondo < 20) {
          if (stickyVisible) { stickyEl.style.opacity = '0'; stickyVisible = false; }
          return;
        }
        if (distanciaAlFondo < 60 && !stickyVisible) return; // zona muerta

        // Buscar el separador de fecha visible más arriba
        const separadores = el.querySelectorAll('[data-fecha]');
        const containerTop = el.getBoundingClientRect().top;
        let textoFinal = '';

        for (let i = 0; i < separadores.length; i++) {
          const sep = separadores[i];
          const relativo = sep.getBoundingClientRect().top - containerTop;
          const texto = sep.getAttribute('data-fecha') || '';
          if (relativo <= 15) {
            textoFinal = texto;
          } else {
            break;
          }
        }

        // Si ningún separador ha llegado al top, buscar el anterior en el array
        if (!textoFinal && separadores.length > 0) {
          const primerSepTexto = separadores[0].getAttribute('data-fecha') || '';
          const currentDatos = datosRef.current;
          let encontroPrevio = false;
          for (let i = currentDatos.length - 1; i >= 0; i--) {
            const item = currentDatos[i];
            if (item.tipo === 'separador' && formatearFechaParaSticky(item.fecha) === primerSepTexto) {
              for (let k = i - 1; k >= 0; k--) {
                const prevItem = currentDatos[k];
                if (prevItem.tipo === 'separador') {
                  textoFinal = formatearFechaParaSticky(prevItem.fecha);
                  encontroPrevio = true;
                  break;
                }
              }
              break;
            }
          }
          if (!encontroPrevio) textoFinal = primerSepTexto;
        }

        if (textoFinal) {
          if (stickyEl.textContent !== textoFinal) stickyEl.textContent = textoFinal;
          if (!stickyVisible) { stickyEl.style.opacity = '1'; stickyVisible = true; }
        } else if (el.scrollTop > 20 && stickyEl.textContent) {
          if (!stickyVisible) { stickyEl.style.opacity = '1'; stickyVisible = true; }
        } else {
          if (stickyVisible) { stickyEl.style.opacity = '0'; stickyVisible = false; }
        }
      });
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollRef, atBottomRef, mostrarScrollAbajoRef, scrollBtnRef, fechaStickyRef]);

  return (
    <div
      ref={scrollRef}
      className="py-2"
      style={{
        position: 'absolute', inset: 0,
        overflowY: 'auto',
        scrollbarWidth: esMobile ? 'none' : 'auto',
        scrollbarColor: '#A1B6C9 transparent',
      }}
    >
      {/* Sentinel invisible para IntersectionObserver — carga de antiguos */}
      {hayMasMensajes && <div ref={sentinelRef} style={{ height: 1 }} />}

      {/* Spinner de carga de mensajes antiguos */}
      {cargandoMensajesAntiguos && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Todos los mensajes renderizados */}
      {datos.map((item) => {
        const itemKey = item.tipo === 'separador' ? `sep-${item.fecha}` : item.mensaje.id;
        const itemId = item.tipo === 'mensaje' ? `msg-${item.mensaje.id}` : undefined;
        return (
        <div
          key={itemKey}
          id={itemId}
          className={`pb-1 px-3 lg:px-12 2xl:px-16 ${
            item.tipo === 'mensaje' && item.mensaje.id === mensajeResaltadoId
              ? 'bg-blue-300/30'
              : ''
          }`}
        >
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
              onImagenClick={onImagenClick}
              onReenviar={onReenviar}
            />
          )}
        </div>
        );
      })}

      {/* Indicador de escribiendo — al final del scroll */}
      {estaEscribiendo && <IndicadorEscribiendo />}
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
  const hayMasMensajes = useChatYAStore((s) => s.hayMasMensajes);
  const escribiendo = useChatYAStore((s) => s.escribiendo);
  const misNotasId = useChatYAStore((s) => s.misNotasId);
  const bloqueados = useChatYAStore((s) => s.bloqueados);
  const desbloquearUsuario = useChatYAStore((s) => s.desbloquearUsuario);
  const mensajesFijados = useChatYAStore((s) => s.mensajesFijados);
  const desfijarMensaje = useChatYAStore((s) => s.desfijarMensaje);
  const fijarMensaje = useChatYAStore((s) => s.fijarMensaje);
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
  // Estado local: visor fullscreen de imágenes del chat
  // ---------------------------------------------------------------------------
  const [visorImagenMsgId, setVisorImagenMsgId] = useState<string | null>(null);
  const handleImagenChatClick = useCallback((mensajeId: string) => {
    setVisorImagenMsgId(mensajeId);
  }, []);

  // ---------------------------------------------------------------------------
  // Estado local: drag & drop de imagen en toda la ventana
  // ---------------------------------------------------------------------------
  const [archivosDrop, setArchivosDrop] = useState<File[] | null>(null);
  const [dragActivoVentana, setDragActivoVentana] = useState(false);
  const dragContadorRef = useRef(0);

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

  // ---------------------------------------------------------------------------
  // Estado local: búsqueda dentro del chat
  // ---------------------------------------------------------------------------
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);
  const [mensajeResaltadoId, setMensajeResaltadoId] = useState<string | null>(null);
  /** Timer ref: evita que clicks rápidos en fijados se pisen entre sí */
  const resaltadoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Ref: controla visibilidad del botón scroll-abajo SIN causar re-render */
  const mostrarScrollAbajoRef = useRef(false);
  const scrollBtnRef = useRef<HTMLButtonElement>(null);
  const fijadosRef = useRef<HTMLDivElement>(null);
  /** Ref: overlay de fecha sticky — se manipula imperativamente */
  const fechaStickyRef = useRef<HTMLDivElement>(null);
  /** Ref: si el scroll está al fondo — para ocultar sticky */
  const atBottomRef = useRef(true);
  /** Índice del mensaje fijado visible actualmente en el banner */
  const [fijadoIndice, setFijadoIndice] = useState(0);
  /** Menú contextual del banner de fijados (long press) */
  const [menuFijadoPos, setMenuFijadoPos] = useState<{ x: number; y: number } | null>(null);
  const menuFijadoRef = useRef<HTMLDivElement>(null);


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
    // Toggle: si el menú ya está abierto para este mensaje, cerrarlo
    setMenuMensaje((prev) => {
      if (prev && prev.mensaje.id === msg.id) return null;
      return { mensaje: msg, posicion: pos };
    });

    // Auto-scroll para que el popup de emojis (-top-14 ≈ 56px) sea visible (solo móvil)
    if (esMobile) {
      requestAnimationFrame(() => {
        const msgEl = document.getElementById(`msg-${msg.id}`);
        const container = scrollRef.current;
        if (msgEl && container) {
          const msgRect = msgEl.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const espacioArriba = msgRect.top - containerRect.top;
          if (espacioArriba < 80) {
            container.scrollBy({ top: -(80 - espacioArriba), behavior: 'smooth' });
          }
        }
      });
    }
  }, [esMobile]);

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
  // Refs — Scroll nativo
  // ---------------------------------------------------------------------------
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Reseteo síncrono: detectar cambio de conversación DURANTE el render
  // ---------------------------------------------------------------------------
  const prevConvIdRef = useRef(conversacionActivaId);
  if (prevConvIdRef.current !== conversacionActivaId) {
    prevConvIdRef.current = conversacionActivaId;

    // Reset del sticky: limpiar texto y ocultar al cambiar de chat
    if (fechaStickyRef.current) {
      fechaStickyRef.current.textContent = '';
      fechaStickyRef.current.style.opacity = '0';
    }
  }

  // Datos: mensajes en orden cronológico con separadores de fecha intercalados
  const mensajesConSeparadores = useMemo(() => {
    const resultado = agruparPorFecha(mensajes);
    return resultado;
  }, [mensajes]);

  // Visor de imágenes: array filtrado + índice calculado
  const imagenesChat = useMemo(
    () => mensajes.filter((m) => m.tipo === 'imagen' && !m.eliminado),
    [mensajes]
  );
  const visorIndiceInicial = useMemo(() => {
    if (!visorImagenMsgId) return 0;
    const idx = imagenesChat.findIndex((m) => m.id === visorImagenMsgId);
    return idx >= 0 ? idx : 0;
  }, [visorImagenMsgId, imagenesChat]);

  // IDs de mensajes fijados (para el visor)
  const mensajesFijadosIds = useMemo(
    () => mensajesFijados.map((f) => f.mensajeId),
    [mensajesFijados]
  );

  // Handler: descargar imagen desde el visor (fetch → blob → link temporal)
  const handleDescargarImagen = useCallback(async (url: string, nombre: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  // Handler: fijar/desfijar desde el visor
  const handleFijarDesdeVisor = useCallback(async (mensajeId: string) => {
    if (conversacionActivaId) await fijarMensaje(conversacionActivaId, mensajeId);
  }, [conversacionActivaId, fijarMensaje]);

  const handleDesfijarDesdeVisor = useCallback(async (mensajeId: string) => {
    if (conversacionActivaId) await desfijarMensaje(conversacionActivaId, mensajeId);
  }, [conversacionActivaId, desfijarMensaje]);

  // (firstItemIndex eliminado — scroll nativo preserva posición en AreaMensajes)

  // ---------------------------------------------------------------------------
  // Effect: Scroll al mensaje resaltado por búsqueda
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mensajeResaltadoId) return;

    // Buscar el elemento DOM directamente por su id
    const el = document.getElementById(`msg-${mensajeResaltadoId}`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [mensajeResaltadoId]);

  // ---------------------------------------------------------------------------
  // Handler: Cargar mensajes antiguos cuando el scroll llega al tope
  // ---------------------------------------------------------------------------
  const handleStartReached = useCallback(() => {
    const state = useChatYAStore.getState();
    if (state.cargandoMensajesAntiguos || !state.hayMasMensajes) return;
    state.cargarMensajesAntiguos();
  }, []);

  // ---------------------------------------------------------------------------
  // Helper: Scroll a un mensaje — si no está en DOM, cargar antiguos hasta encontrarlo
  // Máximo 10 intentos (10 × 50 = 500 mensajes hacia atrás)
  // ---------------------------------------------------------------------------
  const scrollAMensajeOCargar = useCallback(async (mensajeId: string) => {
    const MAX_INTENTOS = 10;

    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
      // ¿Ya está en el DOM?
      const el = document.getElementById(`msg-${mensajeId}`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return true;
      }

      // No está → cargar más mensajes antiguos
      const state = useChatYAStore.getState();
      if (!state.hayMasMensajes || state.cargandoMensajesAntiguos) {
        // No hay más páginas o ya está cargando — no se puede encontrar
        return false;
      }

      await state.cargarMensajesAntiguos();

      // Esperar a que React renderice los nuevos mensajes
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }

    return false;
  }, []);

  /** Flag: mostrar acciones en header (móvil, cuando hay menú contextual activo) */
  const mostrarAccionesEnHeader = esMobile && menuMensaje !== null && !esMisNotas;

  // ---------------------------------------------------------------------------
  // Handlers: Drag & drop de imagen en toda la ventana del chat
  // ---------------------------------------------------------------------------
  const handleDragEnterVentana = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragContadorRef.current++;
    if (dragContadorRef.current === 1) {
      // Verificar que hay archivos de imagen en el drag
      const tieneImagen = Array.from(e.dataTransfer.items).some(
        (item) => item.kind === 'file' && item.type.startsWith('image/')
      );
      if (tieneImagen) setDragActivoVentana(true);
    }
  }, []);

  const handleDragLeaveVentana = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragContadorRef.current--;
    if (dragContadorRef.current <= 0) {
      dragContadorRef.current = 0;
      setDragActivoVentana(false);
    }
  }, []);

  const handleDragOverVentana = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDropVentana = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragContadorRef.current = 0;
    setDragActivoVentana(false);

    const archivos = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (archivos.length > 0) {
      setArchivosDrop(archivos);
    }
  }, []);

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
    <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden bg-black lg:bg-transparent">
      {/* ── Área principal del chat ── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 relative isolate bg-linear-to-b from-[#0B358F] to-[#050d1a] lg:bg-linear-to-br lg:from-blue-200/60 lg:via-indigo-200/50 lg:to-sky-200/60">
        {/* Textura doodle de fondo */}
        <TexturaDoodle oscuro={esMobile} />
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
                        className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${contactoExistente
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
                className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white/90 lg:bg-white border-b border-gray-200 shrink-0 cursor-pointer active:bg-gray-50 select-none"
                onClick={async () => {
                  if (bannerLongPressed) { bannerLongPressed = false; return; }
                  // Navegar al mensaje — carga antiguos si no está en DOM
                  await scrollAMensajeOCargar(fijadoActual.mensajeId);
                  // Cancelar timer anterior si existe (evita que clicks rápidos se pisen)
                  if (resaltadoTimerRef.current) clearTimeout(resaltadoTimerRef.current);
                  // Activar highlight inmediatamente (estará listo cuando llegue)
                  setMensajeResaltadoId(fijadoActual.mensajeId);
                  // Timer largo: 3.5s para que el scroll termine + el usuario vea el highlight
                  resaltadoTimerRef.current = setTimeout(() => setMensajeResaltadoId(null), 3500);
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
                        onClick={async () => {
                          setMenuFijadoPos(null);
                          await scrollAMensajeOCargar(fijadoActual.mensajeId);
                          if (resaltadoTimerRef.current) clearTimeout(resaltadoTimerRef.current);
                          setMensajeResaltadoId(fijadoActual.mensajeId);
                          resaltadoTimerRef.current = setTimeout(() => setMensajeResaltadoId(null), 3500);
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

        {/* ═══ Área de mensajes — Scroll nativo (todos los nodos en DOM) ═══ */}
        <div
          className="flex-1 relative min-h-0"
          onClick={(e) => {
            if (menuMensaje && !(e.target as HTMLElement).closest('[id^="msg-"]')) {
              setMenuMensaje(null);
            }
          }}
          onDragEnter={handleDragEnterVentana}
          onDragLeave={handleDragLeaveVentana}
          onDragOver={handleDragOverVentana}
          onDrop={handleDropVentana}
        >
          {/* Overlay drag & drop sobre toda el área de mensajes */}
          {dragActivoVentana && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-blue-500/15 backdrop-blur-[2px] pointer-events-none">
              <div className="flex items-center gap-2.5 px-5 py-3 bg-white rounded-2xl shadow-xl border border-blue-200">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-blue-600">Suelta la imagen aquí</span>
              </div>
            </div>
          )}
          {!cargandoMensajes && mensajesConSeparadores.length > 0 && (
            <AreaMensajes
              key={conversacionActivaId}
              conversacionId={conversacionActivaId}
              datos={mensajesConSeparadores}
              scrollRef={scrollRef}
              mostrarScrollAbajoRef={mostrarScrollAbajoRef}
              scrollBtnRef={scrollBtnRef}
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
              fechaStickyRef={fechaStickyRef}
              atBottomRef={atBottomRef}
              hayMasMensajes={hayMasMensajes}
              onImagenClick={handleImagenChatClick}
              onReenviar={handleReenviarMensaje}
            />
          )}

          {/* Fecha sticky — overlay imperativo, cero re-renders */}
          <div
            ref={fechaStickyRef}
            style={{ opacity: 0 }}
            className="absolute top-2.5 left-1/2 -translate-x-1/2 lg:left-[783px] lg:-translate-x-1/2 z-10 text-[11px] font-semibold tracking-wide px-3.5 py-1 rounded-lg pointer-events-none bg-[#0a1628]/80 text-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.2)] lg:bg-white/90 lg:text-gray-500 lg:shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:border lg:border-gray-200"
          />

          {/* Botón scroll al fondo — siempre montado, visibilidad via ref */}
          <button
            ref={scrollBtnRef}
            style={{ display: 'none' }}
            onClick={() => {
              if (scrollRef.current) {
                scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
              }
            }}
            className="absolute bottom-4 right-2 lg:bottom-4 lg:right-0 2xl:right-7.5 w-9 h-9 lg:w-10 lg:h-10 rounded-full shadow-lg items-center justify-center cursor-pointer hover:shadow-xl z-10 bg-linear-to-br from-slate-700 to-slate-900 lg:from-slate-600 lg:to-slate-500 lg:hover:from-slate-800 lg:hover:to-slate-600"
          >
            <ChevronsDown className="w-4.5 h-4.5 lg:w-6 lg:h-6 text-white" />
          </button>

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
            archivosDrop={archivosDrop}
            onArchivosDropProcesados={() => setArchivosDrop(null)}
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

      {/* ═══ Visor fullscreen de imágenes del chat ═══ */}
      {visorImagenMsgId && imagenesChat.length > 0 && (
        <VisorImagenesChat
          imagenesChat={imagenesChat}
          indiceInicial={visorIndiceInicial}
          miDatos={{
            nombre: 'Tú',
            avatarUrl: usuario?.avatarUrl || null,
            iniciales: usuario ? `${usuario.nombre?.charAt(0) || ''}${usuario.apellidos?.charAt(0) || ''}`.toUpperCase() : '?',
          }}
          otroDatos={{
            nombre: nombreMostrar,
            avatarUrl,
            iniciales,
          }}
          miId={miId}
          mensajesFijadosIds={mensajesFijadosIds}
          esMisNotas={esMisNotas}
          onResponder={handleResponderMensaje}
          onReenviar={handleReenviarMensaje}
          onFijar={handleFijarDesdeVisor}
          onDesfijar={handleDesfijarDesdeVisor}
          onDescargar={handleDescargarImagen}
          onReaccionar={handleReaccionar}
          onCerrar={() => setVisorImagenMsgId(null)}
        />
      )}

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

/** Fallback para copiar al portapapeles cuando clipboard API no está disponible */
function copiarFallback(texto: string) {
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}

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
    onClick: () => {
      const sel = window.getSelection()?.toString().trim();
      const texto = sel || mensaje.contenido || '';

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(texto).catch(() => copiarFallback(texto));
      } else {
        copiarFallback(texto);
      }

      onCerrar();
    },
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
        // Toast "Mensaje eliminado" — justo arriba del input
        setTimeout(() => {
          const tooltip = document.createElement('div');
          tooltip.textContent = '🗑 Mensaje eliminado';
          tooltip.style.cssText = `
            position:fixed;left:50%;bottom:72px;
            transform:translateX(-50%) scale(0.85) translateY(4px);
            background:rgba(15,23,42,0.88);color:#fff;
            padding:7px 16px;border-radius:10px;
            font-size:13px;font-weight:600;letter-spacing:0.01em;
            z-index:9999;pointer-events:none;opacity:0;
            transition:opacity 0.15s ease-out,transform 0.15s ease-out;
            backdrop-filter:blur(8px);box-shadow:0 4px 12px rgba(0,0,0,0.25);
          `;
          document.body.appendChild(tooltip);
          requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateX(-50%) scale(1) translateY(0)';
          });
          setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateX(-50%) scale(0.85) translateY(4px)';
            setTimeout(() => tooltip.remove(), 150);
          }, 1800);
        }, 50);
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
// HELPER: Formateador reutilizable — se crea UNA sola vez en memoria
// =============================================================================
const formateadorFecha = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function agruparPorFecha(mensajes: Mensaje[]): Array<{ tipo: 'separador'; fecha: string } | { tipo: 'mensaje'; mensaje: Mensaje }> {
  if (!mensajes.length) return [];

  const resultado: Array<{ tipo: 'separador'; fecha: string } | { tipo: 'mensaje'; mensaje: Mensaje }> = [];
  let ultimaFechaCorta = '';

  // Loop inverso: recorre de atrás hacia adelante sin crear copia con [...].reverse()
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const msg = mensajes[i];
    const fechaObj = new Date(msg.createdAt);

    // Comparación rápida con string simple (ej: "25-1-2026")
    // Solo formatea bonito si el día cambió — evita llamar format() en cada mensaje
    const fechaCorta = `${fechaObj.getDate()}-${fechaObj.getMonth()}-${fechaObj.getFullYear()}`;

    if (fechaCorta !== ultimaFechaCorta) {
      ultimaFechaCorta = fechaCorta;
      resultado.push({ tipo: 'separador', fecha: formateadorFecha.format(fechaObj) });
    }

    resultado.push({ tipo: 'mensaje', mensaje: msg });
  }

  return resultado;
}

export default VentanaChat;