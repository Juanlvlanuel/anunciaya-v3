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

import { useRef, useEffect, useLayoutEffect, useCallback, useState, useMemo, memo, type RefObject, type MutableRefObject } from 'react';
import { Search, MoreVertical, StickyNote, X, Reply, Forward, Copy, Pin, PinOff, Pencil, Trash2, ShieldBan, ChevronsDown, UserPlus, UserMinus, ArrowLeft, MessageSquare, ImageIcon } from 'lucide-react';
import { useChatYAStore } from '../../stores/useChatYAStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { diagMarca } from '../../utils/diagnosticoChatYA';
import { useScanYAStore } from '../../stores/useScanYAStore';
import { useChatYASession } from '../../hooks/useChatYASession';
import { useUiStore } from '../../stores/useUiStore';
import * as chatyaService from '../../services/chatyaService';
import { emitirEvento, emitirCuandoConectado } from '@/services/socketService';
import type { Conversacion, Mensaje } from '../../types/chatya';
import { BurbujaMensaje } from './BurbujaMensaje';
import { InputMensaje } from './InputMensaje';
import { SeparadorFecha } from './SeparadorFecha';
import { MenuContextualChat } from './MenuContextualChat';
import { MenuContextualMensaje } from './MenuContextualMensaje';
import { BarraBusquedaChat } from './BarraBusquedaChat';
import { PanelInfoContacto, cachéNegocio, cachéCliente, invalidarCachéArchivos } from './PanelInfoContacto';
import { determinarMiLado } from './utils/lado';
import { ModalReenviar } from './ModalReenviar';
import { VisorImagenesChat } from './VisorImagenesChat';
import { TexturaDoodle } from './TexturaDoodle';
import { ModalImagenes } from '../ui/ModalImagenes';
// Virtuoso eliminado — scroll nativo con IntersectionObserver para paginación
import Tooltip from '../ui/Tooltip';
import { useBreakpoint } from '../../hooks/useBreakpoint';
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
// Helper: Formatear "última vez" relativo
// =============================================================================
// ─── Componente: anima el slide del texto "últ. vez..." dejando solo la hora ──
function UltimaVezAnimada({ prefijo, hora }: { prefijo: string; hora: string }) {
  const prefixRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [listo, setListo] = useState(false);

  useLayoutEffect(() => {
    setListo(false);
    if (prefixRef.current && containerRef.current) {
      const w = prefixRef.current.offsetWidth;
      containerRef.current.style.setProperty('--prefix-w', `${w}px`);
    }
    // Pequeño frame para que el browser aplique la variable antes de la animación
    const raf = requestAnimationFrame(() => setListo(true));
    return () => cancelAnimationFrame(raf);
  }, [prefijo, hora]);

  return (
    <span
      ref={containerRef}
      className={`inline-block font-semibold text-white/70 text-[13px] ${listo ? 'animate-[ultimaVezScroll_2.5s_ease-in-out_forwards]' : ''}`}
    >
      <span ref={prefixRef}>{prefijo}</span>{hora}
    </span>
  );
}

function formatearUltimaVez(timestamp: number): string {
  const ahora = new Date();
  const fecha = new Date(timestamp);
  
  const hora = fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true });

  // Mismo día
  if (fecha.toDateString() === ahora.toDateString()) {
    return `últ. vez hoy a la(s) ${hora}`;
  }

  // Ayer
  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (fecha.toDateString() === ayer.toDateString()) {
    return `últ. vez ayer a la(s) ${hora}`;
  }

  // Misma semana (últimos 7 días)
  const diffDias = Math.floor((ahora.getTime() - fecha.getTime()) / 86400000);
  if (diffDias < 7) {
    const dia = fecha.toLocaleDateString('es-MX', { weekday: 'long' });
    return `últ. vez el ${dia} a la(s) ${hora}`;
  }

  // Más de una semana
  const fechaStr = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: fecha.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined });
  return `últ. vez el ${fechaStr} a la(s) ${hora}`;
}

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
  esMobile: boolean;
  esMisNotas: boolean;
  miId: string;
  miSucursalId: string | null;
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
  onCitaClick: (mensajeId: string) => void;
  onResponder: (msg: Mensaje) => void;
  miAvatarUrl: string | null;
  otroAvatarUrl: string | null;
  misIniciales: string;
  otroIniciales: string;
}

const AreaMensajes = memo(function AreaMensajes({
  conversacionId, datos,
  scrollRef, mostrarScrollAbajoRef, scrollBtnRef,
  cargandoMensajesAntiguos,
  esMobile, esMisNotas, miId, miSucursalId, mensajeResaltadoId, menuMensajeId,
  onStartReached, onMenuContextual, onReaccionar,
  fechaStickyRef, atBottomRef, hayMasMensajes, onImagenClick, onReenviar, onCitaClick, onResponder, miAvatarUrl, otroAvatarUrl, misIniciales, otroIniciales,
}: AreaMensajesProps) {

  /**
   * Determina si un mensaje es mío. En chat inter-sucursal del mismo negocio,
   * ambos lados comparten `emisorId` (dueño) y solo difieren por sucursal.
   */
  const mensajeEsMio = (m: { emisorId: string | null; emisorSucursalId: string | null }) => {
    if (m.emisorId !== miId) return false;
    if (miSucursalId && m.emisorSucursalId) return m.emisorSucursalId === miSucursalId;
    return true;
  };

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

  // ── Scroll al fondo + reset de refs al cambiar de conversación ──
  const prevConvIdRef = useRef(conversacionId);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (prevConvIdRef.current !== conversacionId) {
      // Cambió la conversación: resetear refs y scroll al fondo
      cargandoAntiguosRef.current = false;
      prevScrollHeightRef.current = 0;
      prevDatosLenRef.current = datos.length;
      atBottomRef.current = true;
      if (scrollBtnRef.current) scrollBtnRef.current.style.display = 'none';
      if (fechaStickyRef.current) fechaStickyRef.current.style.opacity = '0';
      prevConvIdRef.current = conversacionId;
    }

    if (datos.length > 0) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conversacionId]);

  // ── Re-scroll al fondo cuando imágenes cargan y expanden el contenido ──
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !conversacionId) return;

    // Solo actuar durante los primeros 3 segundos tras abrir el chat
    let activo = true;
    const timer = setTimeout(() => { activo = false; }, 3000);

    const ro = new ResizeObserver(() => {
      if (activo && atBottomRef.current && el.scrollHeight > el.clientHeight) {
        el.scrollTop = el.scrollHeight;
      }
    });

    // Observar el contenedor (detecta cambios de altura por imágenes cargando)
    ro.observe(el);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [conversacionId]);

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
      // Mensaje nuevo (no antiguos) → detectar si es mío para decidir auto-scroll
      let ultimoMensajeMio = false;
      for (let i = datos.length - 1; i >= 0; i--) {
        const item = datos[i];
        if (item.tipo === 'mensaje') {
          ultimoMensajeMio = mensajeEsMio(item.mensaje);
          break;
        }
      }
      // Mensaje propio → siempre scroll al fondo. Del otro → solo si estábamos abajo
      if (ultimoMensajeMio || atBottomRef.current) {
        el.scrollTop = el.scrollHeight;
        // Respaldo: burbujas de documento/imagen necesitan más tiempo de layout
        setTimeout(() => { el.scrollTop = el.scrollHeight; }, 50);
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
  }, [scrollRef, hayMasMensajes, onStartReached, conversacionId]);

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
        overflowX: 'hidden',
        willChange: 'scroll-position',
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
      {datos.map((item, idx) => {
        const itemKey = item.tipo === 'separador' ? `sep-${item.fecha}` : item.mensaje.id;
        const itemId = item.tipo === 'mensaje' ? `msg-${item.mensaje.id}` : undefined;
        const prevItem = idx > 0 ? datos[idx - 1] : null;
        const esMio = item.tipo === 'mensaje' && mensajeEsMio(item.mensaje);
        const prevEsMio = prevItem?.tipo === 'mensaje' && mensajeEsMio(prevItem.mensaje);
        const cambioEmisor = item.tipo === 'mensaje' && prevItem?.tipo === 'mensaje' && esMio !== prevEsMio;
        return (
        <div
          key={itemKey}
          id={itemId}
          style={
            item.tipo === 'mensaje' && esMobile && menuMensajeId === item.mensaje.id
              ? undefined
              : { contentVisibility: 'auto', containIntrinsicSize: 'auto 60px' }
          }
          className={`pb-1 px-3 lg:px-12 2xl:px-16 ${cambioEmisor ? 'mt-3 lg:mt-0' : ''} ${
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
              esMio={esMio}
              esMisNotas={esMisNotas}
              miId={miId}
              miSucursalId={miSucursalId}
              resaltado={item.mensaje.id === mensajeResaltadoId}
              onMenuContextual={onMenuContextual}
              onReaccionar={onReaccionar}
              menuActivoId={esMobile ? menuMensajeId : null}
              onImagenClick={onImagenClick}
              onReenviar={onReenviar}
              onCitaClick={onCitaClick}
              onResponder={onResponder}
              avatarEmisor={item.mensaje.emisorId === miId ? miAvatarUrl : otroAvatarUrl}
              inicialesEmisor={item.mensaje.emisorId === miId ? misIniciales : otroIniciales}
            />
          )}
        </div>
        );
      })}

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
  const escribiendoActiva = useChatYAStore((s) => s.conversacionActivaId ? s.escribiendo[s.conversacionActivaId] : undefined);
  const estadoOtroRaw = useChatYAStore((s) => {
    const conv = s.conversaciones.find((c) => c.id === s.conversacionActivaId) ?? s.conversacionesArchivadas.find((c) => c.id === s.conversacionActivaId);
    const otroId = conv?.otroParticipante?.id ?? s.chatTemporal?.otroParticipante?.id;
    return otroId ? s.estadosUsuarios[otroId] : null;
  });
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
  const setVisorAbierto = useChatYAStore((s) => s.setVisorAbierto);
  const setPanelInfoAbiertoStore = useChatYAStore((s) => s.setPanelInfoAbierto);

  // ── Selectores DERIVADOS: solo re-renderizan si NUESTRA conversación cambia,
  //    NO cuando cambia el badge/preview/typing de OTRA conversación ──
  const conversacionEnStore = useChatYAStore(
    (s) => s.conversaciones.find((c) => c.id === s.conversacionActivaId) ?? null
  );
  const conversacionEnArchivados = useChatYAStore(
    (s) => s.conversacionesArchivadas.find((c) => c.id === s.conversacionActivaId) ?? null
  );

  const usuario = useAuthStore((s) => s.usuario);
  const usuarioScanYA = useScanYAStore((s) => s.usuario);
  const { miId, modo: modoActivo, sucursalId: miSucursalId } = useChatYASession();

  /**
   * Determina si un mensaje es mío. En chat inter-sucursal del mismo negocio,
   * ambos lados tienen el mismo `emisorId` (dueño) y solo difieren por sucursal.
   * Desempata con `emisorSucursalId` cuando tengo sucursal activa.
   */
  const mensajeEsMio = useCallback((m: { emisorId: string | null; emisorSucursalId: string | null }) => {
    if (m.emisorId !== miId) return false;
    if (miSucursalId && m.emisorSucursalId) return m.emisorSucursalId === miSucursalId;
    return true;
  }, [miId, miSucursalId]);

  // Avatar e iniciales del usuario actual (AnunciaYA o ScanYA)
  const miAvatarUrlDeriv = usuario?.avatarUrl || usuarioScanYA?.logoNegocio || null;
  const misInicialesDeriv = usuario
    ? `${usuario.nombre?.charAt(0) || ''}${usuario.apellidos?.charAt(0) || ''}`.toUpperCase()
    : usuarioScanYA
      ? (usuarioScanYA.nombreNegocio?.charAt(0) || '?').toUpperCase()
      : '?';
  const cerrarChatYA = useUiStore((s) => s.cerrarChatYA);

  diagMarca('5. VentanaChat: hooks leídos');

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

  // Para chats temporales, construir objeto mínimo que PanelInfoContacto necesita
  const conversacionParaPanel = conversacion ?? (esTemporal && chatTemporal ? {
    id: chatTemporal.id,
    participante1Id: miId,
    participante1Modo: modoActivo as 'personal' | 'comercial',
    participante1SucursalId: null,
    participante2Id: chatTemporal.datosCreacion.participante2Id,
    participante2Modo: (chatTemporal.datosCreacion.participante2Modo || 'personal') as 'personal' | 'comercial',
    participante2SucursalId: chatTemporal.datosCreacion.participante2SucursalId || null,
    contextoTipo: (chatTemporal.datosCreacion.contextoTipo || 'directo') as 'directo' | 'negocio' | 'oferta' | 'marketplace' | 'servicio' | 'notas',
    contextoReferenciaId: null,
    contextoNombre: null,
    ultimoMensajeTexto: null,
    ultimoMensajeFecha: null,
    ultimoMensajeTipo: null,
    ultimoMensajeEstado: null,
    ultimoMensajeEmisorId: null,
    noLeidos: 0,
    fijada: false,
    archivada: false,
    silenciada: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    otroParticipante: chatTemporal.otroParticipante,
  } : null);

  // Si es temporal, usar datos del chatTemporal; si no, los de la conversación real
  const otro = esTemporal ? chatTemporal?.otroParticipante : conversacion?.otroParticipante;
  const nombre = esMisNotas
    ? 'Mis Notas'
    : otro?.negocioNombre || (otro ? `${otro.nombre} ${otro.apellidos || ''}`.trim() : 'Chat');
  // Sufijo con nombre de sucursal — solo se muestra si el backend lo devolvió
  // (negocio con más de una sucursal y NO la matriz). Render como texto más
  // chico y gris junto al nombre principal.
  const sucursalSufijo = !esMisNotas ? otro?.sucursalNombre ?? null : null;
  const avatarUrl = esMisNotas ? null : (otro?.negocioLogo || otro?.avatarUrl || null);
  const iniciales = esMisNotas
    ? ''
    : otro
      ? `${otro.nombre.charAt(0)}${otro.apellidos?.charAt(0) || ''}`.toUpperCase()
      : '?';
  const esNegocio = !esMisNotas && !!otro?.negocioNombre;
  // miId y modoActivo ya derivados de useChatYASession arriba
  const esBloqueado = !esMisNotas && !esTemporal && bloqueados.some((b) => b.bloqueadoId === otro?.id);

  // Derivar sucursalId del otro participante
  // Usa tupla (miId, miSucursalId) para soportar chats inter-sucursal del mismo negocio.
  const otroSucursalId = conversacion
    ? determinarMiLado(conversacion, miId, miSucursalId).otroSucursalId
    : chatTemporal?.datosCreacion?.participante2SucursalId || null;

  // Verificar si el otro participante ya es contacto
  const contactoExistente = !esMisNotas && otro
    ? contactos.find((c) =>
      c.contactoId === otro.id &&
      c.tipo === modoActivo &&
      c.sucursalId === otroSucursalId
    )
    : undefined;

  const estaEscribiendo = !esMisNotas && !!conversacionActivaId && !!escribiendoActiva;
  const estadoOtro = estadoOtroRaw;

  // Consultar estado del otro usuario al abrir conversación
  // Usa emitirCuandoConectado para esperar al socket si aún no está listo
  useEffect(() => {
    if (!otro?.id || esMisNotas) return;
    const cancelar = emitirCuandoConectado('chatya:consultar-estado', otro.id);
    return cancelar;
  }, [otro?.id, esMisNotas]);

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
  // Montar eager: el panel (y su iframe interno) precarga en background desde que
  // abre la conversación, no al primer click — apertura instantánea en mobile y PC.
  if ((conversacion || esTemporal) && !esMisNotas) panelMontado.current = true;
  const panelInfoAbiertoStore = useChatYAStore((s) => s.panelInfoAbierto);

  // Helper: toggle panel + sincronizar store
  const togglePanel = useCallback(() => {
    const nuevo = !panelAbierto;
    setPanelAbierto(nuevo);
    setPanelInfoAbiertoStore(nuevo);
  }, [panelAbierto, setPanelInfoAbiertoStore]);

  const cerrarPanel = useCallback(() => {
    setPanelAbierto(false);
    setPanelInfoAbiertoStore(false);
  }, [setPanelInfoAbiertoStore]);

  // Sincronizar: si ChatOverlay cierra el panel via popstate, cerrar localmente
  useEffect(() => {
    if (!panelInfoAbiertoStore && panelAbierto) {
      setPanelAbierto(false);
    }
  }, [panelInfoAbiertoStore, panelAbierto]);

  // Cerrar panel info y búsqueda al cambiar de conversación (desmontaje completo)
  useEffect(() => {
    diagMarca('8. effect: cambio conversación (cerrar panel/búsqueda)');
    setPanelAbierto((prev) => prev ? false : prev);
    setPanelInfoAbiertoStore(false);
    panelMontado.current = false;
    setBusquedaAbierta((prev) => prev ? false : prev);
  }, [conversacionActivaId]);

  // ---------------------------------------------------------------------------
  // Estado local: modal de imagen del avatar (vive fuera del panel para no desmontarse)
  // ---------------------------------------------------------------------------
  const [modalAvatarUrl, setModalAvatarUrl] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Estado local: visor fullscreen de imágenes del chat
  // ---------------------------------------------------------------------------
  const [visorImagenMsgId, setVisorImagenMsgId] = useState<string | null>(null);
  const visorAbierto = useChatYAStore((s) => s.visorAbierto);
  const handleImagenChatClick = useCallback((mensajeId: string) => {
    setVisorImagenMsgId(mensajeId);
    setVisorAbierto(true);
  }, [setVisorAbierto]);

  // Visor desde archivos compartidos (PanelInfoContacto)
  const [visorArchivos, setVisorArchivos] = useState<{ imagenes: Mensaje[]; indice: number } | null>(null);
  const handleAbrirVisorArchivos = useCallback(async (archivoId: string) => {
    if (!conversacionActivaId) return;
    try {
      // Cargar TODAS las imágenes de la conversación
      const res = await chatyaService.getArchivosCompartidos(conversacionActivaId, 'imagenes', 200, 0);
      if (!res.success || !res.data) return;

      // Convertir ArchivoCompartido[] → Mensaje[] (campos mínimos para el visor)
      const mensajesVisor: Mensaje[] = res.data.items
        .filter((a) => {
          try { JSON.parse(a.contenido); return true; } catch { return false; }
        })
        .map((a) => ({
          id: a.id,
          conversacionId: conversacionActivaId,
          emisorId: a.emisorId,
          emisorModo: null,
          emisorSucursalId: null,
          empleadoId: null,
          tipo: 'imagen' as const,
          contenido: a.contenido,
          estado: 'leido' as const,
          editado: false,
          editadoAt: null,
          eliminado: false,
          eliminadoAt: null,
          respuestaAId: null,
          reenviadoDeId: null,
          createdAt: a.createdAt,
          entregadoAt: null,
          leidoAt: null,
        }));

      if (mensajesVisor.length === 0) return;

      // Encontrar índice de la imagen clickeada
      const indice = mensajesVisor.findIndex((m) => m.id === archivoId);
      setVisorArchivos({ imagenes: mensajesVisor, indice: indice >= 0 ? indice : 0 });
      setVisorAbierto(true);
    } catch {
      // Si falla el fetch, silenciar
    }
  }, [conversacionActivaId]);

  // Sincronizar: si ChatOverlay cierra el visor via popstate, cerrar localmente
  useEffect(() => {
    if (!visorAbierto) {
      if (visorImagenMsgId) setVisorImagenMsgId(null);
      if (visorArchivos) setVisorArchivos(null);
    }
  }, [visorAbierto, visorImagenMsgId, visorArchivos]);

  // ---------------------------------------------------------------------------
  // Invalidar caché de archivos compartidos cuando la lista de archivos relevantes
  // de la conversación cambia. Cubre 3 casos:
  //  1. Nuevo mensaje de imagen/documento/audio/enlace llega o se envía.
  //  2. Optimistic (`temp_*` con `url:"uploading"`) se reemplaza por el real → ID cambia.
  //  3. Mensaje relevante se elimina (queda con `eliminado: true` → sale del filtro).
  // Observamos la lista de IDs no-eliminados relevantes en vez del último mensaje,
  // porque la eliminación no cambia `mensajes[0].id`.
  // ---------------------------------------------------------------------------
  const archivosRelevantesIds = useMemo(() => {
    return mensajes
      .filter((m) => {
        if (m.eliminado) return false;
        if (m.id.startsWith('temp_') && m.contenido.includes('"url":"uploading"')) return false;
        return (
          m.tipo === 'imagen' ||
          m.tipo === 'documento' ||
          (m.tipo === 'texto' && /https?:\/\//.test(m.contenido))
        );
      })
      .map((m) => m.id)
      .join(',');
  }, [mensajes]);
  const convArchivosKeyRef = useRef<string | null>(null);
  const prevArchivosIdsRef = useRef<string>('');
  const [archivosKey, setArchivosKey] = useState(0);
  useEffect(() => {
    if (!conversacionActivaId) return;
    // Primera pasada para esta conv: establecer baseline sin invalidar.
    if (convArchivosKeyRef.current !== conversacionActivaId) {
      convArchivosKeyRef.current = conversacionActivaId;
      prevArchivosIdsRef.current = archivosRelevantesIds;
      return;
    }
    if (prevArchivosIdsRef.current === archivosRelevantesIds) return;
    prevArchivosIdsRef.current = archivosRelevantesIds;
    invalidarCachéArchivos(conversacionActivaId);
    setArchivosKey((n) => n + 1);
  }, [archivosRelevantesIds, conversacionActivaId]);

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
  }, []);

  // Auto-scroll para que la burbuja seleccionada + emojis rápidos (-top-14 ≈ 56px) se vean completos
  useEffect(() => {
    if (!esMobile || !menuMensaje) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const msgEl = document.getElementById(`msg-${menuMensaje.mensaje.id}`);
      const container = scrollRef.current;
      if (!msgEl || !container) return;
      const msgRect = msgEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      // 80px = 56px emojis rápidos + padding
      const espacioNecesario = 80;
      const espacioArriba = msgRect.top - containerRect.top;
      if (espacioArriba < espacioNecesario) {
        container.scrollBy({ top: espacioArriba - espacioNecesario, behavior: 'smooth' });
      }
    }));
  }, [menuMensaje, esMobile]);

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
  /** Ref del contenedor flex-col principal — para ajustar altura con teclado móvil */
  const chatColumnRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Effect: Ajustar altura del chat cuando el teclado móvil abre/cierra
  // visualViewport.height = altura real visible (descuenta el teclado)
  // body.style.position='fixed' (ChatOverlay) impide que h-dvh se actualice.
  // maxHeight restringe el flex item sin conflicto con flex-1.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!esMobile) return;
    const vv = window.visualViewport;
    if (!vv) return;

    let rafId = 0;

    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const col = chatColumnRef.current;
        if (col) {
          col.style.maxHeight = `${vv.height}px`;
        }
        const el = scrollRef.current;
        if (el && atBottomRef.current) {
          el.scrollTop = el.scrollHeight;
        }
      });
    };

    handleResize();

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
      if (rafId) cancelAnimationFrame(rafId);
      const col = chatColumnRef.current;
      if (col) col.style.maxHeight = '';
    };
  }, [esMobile]);

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
    diagMarca('6. useMemo mensajesConSeparadores: inicio (' + mensajes.length + ' msgs)');
    const resultado = agruparPorFecha(mensajes);
    diagMarca('7. useMemo mensajesConSeparadores: fin');
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

  /** Click en cita de respuesta — navegar + resaltar (mismo efecto que fijados) */
  const handleCitaClick = useCallback(async (mensajeId: string) => {
    await scrollAMensajeOCargar(mensajeId);
    if (resaltadoTimerRef.current) clearTimeout(resaltadoTimerRef.current);
    setMensajeResaltadoId(mensajeId);
    resaltadoTimerRef.current = setTimeout(() => setMensajeResaltadoId(null), 3500);
  }, [scrollAMensajeOCargar]);

  /** Flag: mostrar acciones en header (móvil, cuando hay menú contextual activo) */
  const mostrarAccionesEnHeader = esMobile && menuMensaje !== null && !esMisNotas;

  // ---------------------------------------------------------------------------
  // Handlers: Drag & drop de archivos en toda la ventana del chat
  // ---------------------------------------------------------------------------
  const handleDragEnterVentana = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragContadorRef.current++;
    if (dragContadorRef.current === 1) {
      // Verificar que hay archivos válidos (imagen o documento) en el drag
      const tieneArchivo = Array.from(e.dataTransfer.items).some(
        (item) => item.kind === 'file'
      );
      if (tieneArchivo) setDragActivoVentana(true);
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

    const archivos = Array.from(e.dataTransfer.files);
    if (archivos.length > 0) {
      setArchivosDrop(archivos);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Handler: Reaccionar desde hover (desktop) o burbuja flotante (móvil)
  // ---------------------------------------------------------------------------
  const handleReaccionar = useCallback(async (mensajeId: string, emoji: string) => {
    // ── Actualización optimista ──
    // Cada reactor es tupla (id, sucursalId). En inter-sucursal el mismo usuarioId
    // puede aparecer varias veces, una por sucursal. Se compara con la mía para
    // toggle y para saber si "yo ya reaccioné".
    const prevMensajes = useChatYAStore.getState().mensajes;
    type Reactor = { id: string; sucursalId: string | null };
    const miReactor: Reactor = { id: miId, sucursalId: miSucursalId ?? null };
    const coincide = (u: string | Reactor) => {
      const uid = typeof u === 'string' ? u : u.id;
      const usuc = typeof u === 'string' ? null : (u.sucursalId ?? null);
      return uid === miReactor.id && usuc === miReactor.sucursalId;
    };
    useChatYAStore.setState((prev) => ({
      mensajes: prev.mensajes.map((m) => {
        if (m.id !== mensajeId) return m;
        const reacciones = [...(m.reacciones || [])].map((r) => ({ ...r, usuarios: [...(r.usuarios as (string | Reactor)[])] }));
        const existente = reacciones.find((r) => r.emoji === emoji);
        const yaReaccione = (existente?.usuarios as (string | Reactor)[] | undefined)?.some(coincide) ?? false;

        if (yaReaccione && existente) {
          // Mismo emoji → toggle off (quitar)
          existente.cantidad -= 1;
          existente.usuarios = (existente.usuarios as (string | Reactor)[]).filter((u) => !coincide(u)) as typeof existente.usuarios;
          if (existente.cantidad <= 0) {
            const idx = reacciones.indexOf(existente);
            reacciones.splice(idx, 1);
          }
        } else {
          // Emoji diferente o ninguno → quitar reacción previa si existe (misma tupla)
          for (const r of reacciones) {
            const usuariosArr = r.usuarios as (string | Reactor)[];
            const antes = usuariosArr.length;
            r.usuarios = usuariosArr.filter((u) => !coincide(u)) as typeof r.usuarios;
            r.cantidad -= antes - (r.usuarios as (string | Reactor)[]).length;
          }
          // Limpiar emojis que quedaron en 0
          const limpias = reacciones.filter((r) => r.cantidad > 0);

          // Agregar nueva reacción (idempotente: si mi reactor ya está en el
          // emoji destino tras la limpieza anterior, no sumamos de nuevo).
          const existenteNuevo = limpias.find((r) => r.emoji === emoji);
          if (existenteNuevo) {
            const yaEstoy = (existenteNuevo.usuarios as (string | Reactor)[]).some(coincide);
            if (!yaEstoy) {
              existenteNuevo.cantidad += 1;
              (existenteNuevo.usuarios as (string | Reactor)[]).push(miReactor);
            }
          } else {
            limpias.push({ emoji, cantidad: 1, usuarios: [miReactor] });
          }
          // Normalización: cada tupla (id, sucursalId) aparece UNA sola vez y
          // `cantidad` iguala el número real de tuplas únicas. Previene
          // duplicados visuales si algo agrega el mismo reactor más de una vez.
          const normalizadas = limpias
            .map((r) => {
              const seen = new Set<string>();
              const unicos = (r.usuarios as (string | Reactor)[]).filter((u) => {
                const uid = typeof u === 'string' ? u : u.id;
                const usuc = typeof u === 'string' ? null : (u.sucursalId ?? null);
                const key = `${uid}|${usuc ?? ''}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              return { ...r, usuarios: unicos as typeof r.usuarios, cantidad: unicos.length };
            })
            .filter((r) => r.cantidad > 0);
          return { ...m, reacciones: normalizadas };
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
  diagMarca('9. VentanaChat: inicio render JSX');
  return (
    <div className="flex-1 flex flex-row min-h-0 min-w-0 overflow-hidden bg-black lg:bg-transparent">
      {/* ── Área principal del chat ── */}
      <div ref={chatColumnRef} className="flex-1 flex flex-col min-h-0 min-w-0 relative isolate bg-linear-to-b from-[#0B358F] to-[#050d1a] lg:bg-linear-to-br lg:from-blue-200/60 lg:via-indigo-200/50 lg:to-sky-200/60">
        {/* Textura doodle de fondo */}
        <TexturaDoodle oscuro={esMobile} />
        {/* ═══ Header del chat ═══ */}
        <div className={`px-4 ${mostrarAccionesEnHeader ? 'py-1' : 'py-2.5'} flex items-center gap-3 shrink-0 border-b border-white/10 bg-[#0a1628] lg:border-slate-300 lg:bg-slate-100`}>

          {/* ── Zona izquierda: Avatar+Info  ó  Input búsqueda  ó  Acciones mensaje (móvil) ── */}
          {mostrarAccionesEnHeader ? (
            /* Acciones de mensaje en el header (móvil long press) */
            <AccionesHeaderMobile
              mensaje={menuMensaje!.mensaje}
              esMio={mensajeEsMio(menuMensaje!.mensaje)}
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
                  className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10 lg:hover:bg-slate-200 text-white/70 lg:text-slate-600 shrink-0"
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
                    togglePanel();
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
                    <span className="text-white text-sm font-bold">{iniciales}</span>
                  </div>
                )}
              </button>

              {/* Info — clickeable para abrir panel */}
              <button
                onClick={() => !esMisNotas && togglePanel()}
                className={`flex-1 min-w-0 text-left ${!esMisNotas ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <p className="text-base font-bold text-white lg:text-gray-800 truncate leading-tight">{nombreMostrar}</p>
                </div>
                {(() => {
                  const mostrarSucursal = !!sucursalSufijo && !contactoExistente?.alias?.trim() && !esMisNotas && !esBloqueado;
                  const prefijoSucursal = mostrarSucursal ? (
                    <>
                      <span className="text-white/50 lg:text-gray-500 font-medium">{sucursalSufijo}</span>
                      <span className="text-white/30 lg:text-gray-400">·</span>
                    </>
                  ) : null;
                  return esMisNotas ? (
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-white/50 lg:text-slate-600 font-medium">Notas personales</p>
                  ) : esBloqueado ? (
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-semibold flex items-center gap-1">
                      <ShieldBan className="w-3 h-3" />
                      Bloqueado
                    </p>
                  ) : estaEscribiendo ? (
                    <p className="text-[13px] font-medium flex items-center gap-1 truncate">
                      {prefijoSucursal}
                      <span className="text-blue-500 font-semibold">Escribiendo...</span>
                    </p>
                  ) : (
                    <p className="text-[13px] font-medium flex items-center gap-1 truncate">
                      {prefijoSucursal}
                      {estadoOtro?.estado === 'conectado' ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full shrink-0" />
                        <span className="text-green-600 font-semibold">En línea</span>
                      </>
                    ) : estadoOtro?.estado === 'ausente' ? (
                      <>
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                        <span className="text-amber-400 font-semibold">Ausente</span>
                      </>
                    ) : estadoOtro?.estado === 'desconectado' ? (
                      <>
                        {/* Móvil: scroll animado que deja solo la hora visible */}
                        <span className="overflow-hidden whitespace-nowrap block lg:hidden" key={`scroll-${conversacionActivaId}`}>
                          {(() => {
                            const texto = formatearUltimaVez(estadoOtro.timestamp);
                            const match = texto.match(/(\d{1,2}:\d{2}\s[ap]\.m\.)$/);
                            const prefijo = match ? texto.slice(0, texto.length - match[0].length) : '';
                            const hora = match ? match[0] : texto;
                            return (
                              <UltimaVezAnimada prefijo={prefijo} hora={hora} />
                            );
                          })()}
                        </span>
                        {/* Desktop: texto estático completo */}
                        <span className="hidden lg:inline text-slate-600 font-semibold text-sm lg:text-[11px] 2xl:text-sm">{formatearUltimaVez(estadoOtro.timestamp)}</span>
                      </>
                    ) : (
                      <span className="text-white/30 lg:text-slate-600">...</span>
                    )}
                      {conversacion?.contextoTipo && conversacion.contextoTipo !== 'directo' && conversacion.contextoTipo !== 'notas' && conversacion.participante1Id !== miId && (
                        <>
                          <span className="text-white/30 lg:text-gray-300">·</span>
                          <span className="text-white/40 lg:text-slate-600 truncate">
                            {conversacion.contextoTipo === 'negocio' && modoActivo === 'comercial' && 'Desde: Tu perfil'}
                            {conversacion.contextoTipo === 'oferta' && `Desde oferta: ${conversacion.contextoNombre || 'Ofertas'}`}
                            {conversacion.contextoTipo === 'marketplace' && `Desde publicación: ${conversacion.contextoNombre || 'Marketplace'}`}
                            {conversacion.contextoTipo === 'servicio' && `Desde servicio: ${conversacion.contextoNombre || 'Servicios'}`}
                          </span>
                        </>
                      )}
                    </p>
                  );
                })()}
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
                      data-testid="chat-buscar"
                      onClick={() => setBusquedaAbierta(true)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer hover:bg-slate-200 text-slate-600 hover:text-blue-600"
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
                          ? 'hover:bg-red-100 text-green-600 hover:text-red-600'
                          : 'hover:bg-slate-200 text-slate-600 hover:text-blue-600'
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
                          data-menu-trigger="true"
                          onClick={() => setMenuAbierto((v) => !v)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer ${menuAbierto
                            ? 'bg-white/20 lg:bg-slate-200 text-white lg:text-blue-600'
                            : 'hover:bg-white/10 lg:hover:bg-slate-200 text-white/70 lg:text-slate-600 hover:text-white lg:hover:text-blue-600'
                            }`}
                        >
                          <MoreVertical className="w-6 h-6 lg:w-5 lg:h-5" />
                        </button>
                        {menuAbierto && conversacion && (
                          <MenuContextualChat
                            data-testid="chat-menu"
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
                  className="w-9 h-9 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-red-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ═══ Banner: Contacto bloqueado ═══ */}
        {esBloqueado && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-red-100 border-b-2 border-red-300 shrink-0">
            <div className="flex items-center gap-2">
              <ShieldBan className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-700 font-medium">Has bloqueado a este contacto. No puede enviarte mensajes.</p>
            </div>
            <button
              onClick={() => otro?.id && desbloquearUsuario(otro.id)}
              className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-600 hover:text-red-700 whitespace-nowrap cursor-pointer shrink-0"
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
                className="flex items-center gap-2.5 px-3.5 py-2.5 bg-black/40 lg:bg-white border-b border-white/10 lg:border-slate-300 shrink-0 cursor-pointer active:bg-black/50 lg:active:bg-slate-200 select-none overflow-hidden"
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
                  <p className="text-sm text-white lg:text-gray-800 font-medium truncate flex items-center gap-1.5">
                    {(() => {
                      const tipo = fijadoActual.mensaje.tipo;
                      const contenido = fijadoActual.mensaje.contenido || '';
                      if (tipo === 'imagen') {
                        try {
                          const data = JSON.parse(contenido);
                          return data.caption
                            ? <><ImageIcon className="w-4 h-4 text-blue-500 shrink-0" /><span>{data.caption}</span></>
                            : <><ImageIcon className="w-4 h-4 text-blue-500 shrink-0" /><span>Imagen</span></>;
                        } catch { return <><ImageIcon className="w-4 h-4 text-blue-500 shrink-0" /><span>Imagen</span></>; }
                      }
                      if (tipo === 'documento') {
                        try {
                          const data = JSON.parse(contenido);
                          return `📎 ${data.nombre || 'Documento'}`;
                        } catch { return '📎 Documento'; }
                      }
                      if (tipo === 'audio') return '🎤 Audio';
                      if (tipo === 'ubicacion') return '📍 Ubicación';
                      return contenido;
                    })()}
                  </p>
                </div>
                {totalFijados > 1 && (
                  <span className="text-sm lg:text-[11px] 2xl:text-sm text-white/50 lg:text-slate-600 font-medium shrink-0">
                    {indiceSeguro + 1} de {totalFijados}
                  </span>
                )}
                {/* Preview de imagen flush al borde derecho */}
                {fijadoActual.mensaje.tipo === 'imagen' && (() => {
                  try {
                    const data = JSON.parse(fijadoActual.mensaje.contenido || '');
                    const imgSrc = data.url || data.miniatura;
                    if (!imgSrc) return null;
                    return (
                      <img
                        src={imgSrc}
                        alt=""
                        className="w-14 h-14 object-cover shrink-0 rounded-sm -my-2.5 -mr-3.5"
                      />
                    );
                  } catch { return null; }
                })()}
              </div>

              {/* Menú contextual: opciones del fijado (long press / click derecho) */}
              {menuFijadoPos && (
                <>
                  <div className="fixed inset-0 z-80" onClick={() => setMenuFijadoPos(null)} />
                  <div
                    ref={menuFijadoRef}
                    className="fixed z-80 bg-white rounded-xl shadow-[0_4px_24px_rgba(15,29,58,0.18)] border-2 border-slate-300 overflow-hidden min-w-[180px]"
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
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-slate-200 cursor-pointer"
                      >
                        <MessageSquare className="w-4.5 h-4.5 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">Ir al mensaje</span>
                      </button>
                      <button
                        onClick={() => {
                          setMenuFijadoPos(null);
                          if (conversacionActivaId && fijadoActual.mensajeId) {
                            desfijarMensaje(conversacionActivaId, fijadoActual.mensajeId);
                          }
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 active:bg-slate-200 cursor-pointer"
                      >
                        <PinOff className="w-4.5 h-4.5 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Desfijar mensaje</span>
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
            if (menuMensaje) {
              if (esMobile) {
                setMenuMensaje(null);
              } else if (!(e.target as HTMLElement).closest('[id^="msg-"]')) {
                setMenuMensaje(null);
              }
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-semibold text-blue-600">Suelta el archivo aquí</span>
              </div>
            </div>
          )}
          {!cargandoMensajes && mensajesConSeparadores.length > 0 && (
            <AreaMensajes
              conversacionId={conversacionActivaId}
              datos={mensajesConSeparadores}
              scrollRef={scrollRef}
              mostrarScrollAbajoRef={mostrarScrollAbajoRef}
              scrollBtnRef={scrollBtnRef}
              cargandoMensajesAntiguos={cargandoMensajesAntiguos}
              esMobile={esMobile}
              esMisNotas={esMisNotas}
              miId={miId}
              miSucursalId={miSucursalId}
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
              onCitaClick={handleCitaClick}
              onResponder={handleResponderMensaje}
              miAvatarUrl={miAvatarUrlDeriv}
              otroAvatarUrl={avatarUrl}
              misIniciales={misInicialesDeriv}
              otroIniciales={iniciales}
            />
          )}

          {/* Fecha sticky — overlay imperativo, cero re-renders */}
          <div
            ref={fechaStickyRef}
            style={{ opacity: 0 }}
            className="absolute top-2.5 left-1/2 -translate-x-1/2 lg:left-[calc(50%-6px)] z-10 text-[11px] font-semibold tracking-wide px-3.5 py-1 rounded-lg pointer-events-none bg-[#1a2d4a]/70 text-white/75 shadow-[0_1px_3px_rgba(0,0,0,0.15)] backdrop-blur-sm"
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
            <ShieldBan className="w-4 h-4 text-slate-600 shrink-0" />
            <p className="text-sm text-slate-600 font-medium">No puedes enviar mensajes a este contacto.</p>
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
            destinatarioId={otro?.id || ''}
            archivosDrop={archivosDrop}
            onArchivosDropProcesados={() => setArchivosDrop(null)}
          />
        )}

        {/* ═══ Menú contextual de mensaje (solo desktop: click derecho) ═══ */}
        {menuMensaje && !esMobile && (
          <MenuContextualMensaje
            mensaje={menuMensaje.mensaje}
            esMio={mensajeEsMio(menuMensaje.mensaje)}
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
      {panelMontado.current && conversacionParaPanel && !esMisNotas && (
        <div className={`${panelAbierto ? '' : 'hidden'} ${esMobile ? 'fixed inset-0 z-60 bg-white' : ''}`}>
          <PanelInfoContacto
            conversacion={conversacionParaPanel}
            esTemporal={esTemporal}
            onCerrar={cerrarPanel}
            onAbrirImagen={(url) => setModalAvatarUrl(url)}
            onAbrirVisorArchivos={handleAbrirVisorArchivos}
            archivosKey={archivosKey}
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
            avatarUrl: miAvatarUrlDeriv,
            iniciales: misInicialesDeriv,
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
          onCerrar={() => { setVisorImagenMsgId(null); setVisorAbierto(false); }}
        />
      )}

      {/* ═══ Visor fullscreen desde archivos compartidos (PanelInfoContacto) ═══ */}
      {visorArchivos && visorArchivos.imagenes.length > 0 && (
        <VisorImagenesChat
          imagenesChat={visorArchivos.imagenes}
          indiceInicial={visorArchivos.indice}
          miDatos={{
            nombre: 'Tú',
            avatarUrl: miAvatarUrlDeriv,
            iniciales: misInicialesDeriv,
          }}
          otroDatos={{
            nombre: nombreMostrar,
            avatarUrl,
            iniciales,
          }}
          miId={miId}
          mensajesFijadosIds={[]}
          esMisNotas={esMisNotas}
          onResponder={() => {}}
          onReenviar={() => {}}
          onFijar={() => {}}
          onDesfijar={() => {}}
          onDescargar={handleDescargarImagen}
          onReaccionar={async () => {}}
          onCerrar={() => { setVisorArchivos(null); setVisorAbierto(false); }}
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
          className="flex flex-col items-center justify-center gap-1 py-1 rounded-lg active:bg-white/10 cursor-pointer min-w-12"
        >
          <accion.icono className={`w-6 h-6 ${accion.color ? accion.color.replace('text-red-500', 'text-red-400') : 'text-white/70'}`} />
          <span className={`text-[11px] font-semibold ${accion.color ? accion.color.replace('text-red-500', 'text-red-400') : 'text-white/60'}`}>{accion.label}</span>
        </button>
      ))}
      <button
        onClick={onCerrar}
        className="flex flex-col items-center justify-center gap-1 py-1 rounded-lg active:bg-white/10 cursor-pointer min-w-12"
      >
        <X className="w-6 h-6 text-white/70" />
        <span className="text-[11px] font-semibold text-white/60">Cerrar</span>
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