/**
 * PanelNotificaciones.tsx (v6.0 — handoff design_handoff_notifications)
 * =====================================================================
 * Panel de notificaciones del usuario. Dos variantes responsive que
 * comparten paleta, tokens y patrón visual con `MenuDrawer v3`:
 *
 *   - Desktop: popover 392px anclado al botón de campana del Navbar.
 *   - Móvil:   side sheet desde la derecha (`min(82vw, 360px)`) con
 *              scrim azul-blur. Reemplaza el ModalBottom de versiones
 *              anteriores.
 *
 * Estructura común:
 *   - Tabs Todas / No leídas (count chip en cada uno).
 *   - Indicador deslizable 3 px que cruza entre tabs.
 *   - Header dentro de la card: bell bubble + título + count chip.
 *   - Notificaciones agrupadas por antigüedad (Hoy / Esta semana /
 *     Este mes / Anteriores).
 *   - Footer sticky con CTA "Marcar todas como leídas".
 *
 * El componente lee del `useNotificacionesStore` (API, paginación,
 * socket en tiempo real, marcar como leída) — la lógica no cambió.
 *
 * Ubicación: apps/web/src/components/layout/PanelNotificaciones.tsx
 */

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle, Trash2, X } from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../config/iconos';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useBackNativo } from '../../hooks/useBackNativo';
import type { Notificacion, TipoNotificacion } from '../../types/notificaciones';
import { obtenerIniciales } from '../../utils/obtenerIniciales';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// WRAPPERS DE ÍCONOS (registro centralizado)
// =============================================================================

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const IcoBell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
const IcoSparkle = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
const IcoStar = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
const IcoClock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const IcoCoin = (p: IconoWrapperProps) => <Icon icon={ICONOS.dinero} {...p} />;
const IcoGift = (p: IconoWrapperProps) => <Icon icon={ICONOS.recompensa} {...p} />;
// Utilitarios: van de lucide directo (no son semánticos, no están en ICONOS).
const IcoCheck = Check;
const IcoWarning = AlertTriangle;
const IcoTrash = Trash2;
const IcoX = X;
const IcoCheckCircle = CheckCircle;
const IcoChartUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaSubida} {...p} />;
const IcoChat = (p: IconoWrapperProps) => <Icon icon={ICONOS.chat} {...p} />;

// =============================================================================
// TIPOS Y CONSTANTES
// =============================================================================

type FiltroNotificaciones = 'todas' | 'no-leidas';
type BucketAntiguedad = 'today' | 'week' | 'month' | 'old';
type FamiliaNotificacion =
  | 'compra'
  | 'entregado'
  | 'pendiente'
  | 'resena'
  | 'alerta'
  | 'sistema'
  // ── Sprint 1.D — Home / Coyo ─────────────────────────────────────────
  /** Vecino respondió tu pregunta del Home. Tile azul + glifo de chat. */
  | 'comunidad'
  /** Coyo te puso en sus resultados. Tile violeta + glifo Sparkle. */
  | 'coyo'
  /** Estatus de pago de membresía (rechazado/aprobado/anulado/gracia). Tile índigo + glifo dinero. */
  | 'membresia';

// Acepta tanto los wrappers locales (funciones) como los íconos de lucide
// directos (ForwardRefExoticComponent), que no devuelven ReactElement.
type Glifo = ComponentType<IconoWrapperProps>;

interface FamiliaConfig {
  tile: string;
  badge: { bg: string; Glifo: Glifo } | null;
  /** Glifo del tile cuando el avatar es generado (sin persona). */
  TileGlifo: Glifo;
}

/**
 * Mapeo de los 15 tipos reales a 6 familias visuales (decisión de producto).
 * Cada familia tiene un gradient del tile, un badge superpuesto y un glifo.
 */
const TIPO_A_FAMILIA: Record<TipoNotificacion, FamiliaNotificacion> = {
  puntos_ganados: 'compra',
  voucher_cobrado: 'compra',
  voucher_generado: 'entregado',
  cupon_asignado: 'entregado',
  recompensa_desbloqueada: 'entregado',
  voucher_pendiente: 'pendiente',
  nueva_recompensa: 'pendiente',
  puntos_por_vencer: 'alerta',
  nueva_resena: 'resena',
  stock_bajo: 'alerta',
  cupon_revocado: 'alerta',
  nueva_oferta: 'sistema',
  nuevo_cliente: 'sistema',
  nuevo_marketplace: 'sistema',
  nuevo_servicio: 'sistema',
  sistema: 'sistema',
  // ── Sprint 1.D — Home / Coyo ─────────────────────────────────────────
  pregunta_comunidad_respondida: 'comunidad',
  coyo_recomendacion: 'coyo',
  // ── Sprint 2.B' — A los interesados ───────────────────────────────────
  // Misma familia visual que la notif del autor (mismo color azul +
  // glifo de chat). El TÍTULO ("Respondieron una pregunta que sigues")
  // diferencia el contexto al hacer click. Visualmente son hermanas
  // porque ambas significan lo mismo: "hay actividad nueva en una
  // pregunta donde te importa".
  pregunta_comunidad_seguida_respondida: 'comunidad',
  // ── Estatus de pago de membresía ──────────────────────────────────────
  membresia_en_gracia: 'membresia',
  pago_rechazado: 'membresia',
  pago_aprobado: 'membresia',
  pago_anulado: 'membresia',
  // ── Comentarios (hilos) — misma familia visual que "alguien te
  // respondió" (comunidad): tile azul + glifo de chat. ───────────────────
  marketplace_nuevo_comentario: 'comunidad',
  marketplace_respuesta_comentario: 'comunidad',
  negocio_publicacion_nuevo_comentario: 'comunidad',
  negocio_publicacion_respuesta_comentario: 'comunidad',
  servicios_nuevo_comentario: 'comunidad',
  servicios_respuesta_comentario: 'comunidad',
};

const FAMILIA_CONFIG: Record<FamiliaNotificacion, FamiliaConfig> = {
  compra: {
    tile: 'linear-gradient(135deg, #f59e0b, #d97706)', // amber (igual a CardYA / dinero)
    badge: { bg: '#F58220', Glifo: IcoCoin },
    TileGlifo: IcoCoin,
  },
  entregado: {
    tile: 'linear-gradient(135deg, #10b981, #059669)', // emerald
    badge: { bg: '#2D9C5F', Glifo: IcoCheck },
    TileGlifo: IcoGift,
  },
  pendiente: {
    tile: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', // blue
    badge: { bg: '#F58220', Glifo: IcoClock },
    TileGlifo: IcoClock,
  },
  resena: {
    tile: 'linear-gradient(135deg, #1e3a8a, #2563eb)', // navy
    badge: { bg: '#1F2937', Glifo: IcoStar },
    TileGlifo: IcoStar,
  },
  alerta: {
    tile: 'linear-gradient(135deg, #f43f5e, #e11d48)', // rose
    badge: { bg: '#DC3545', Glifo: IcoWarning },
    TileGlifo: IcoWarning,
  },
  sistema: {
    tile: 'linear-gradient(135deg, #64748b, #475569)', // slate
    badge: null,
    TileGlifo: IcoChartUp,
  },
  comunidad: {
    tile: 'linear-gradient(135deg, #2563eb, #1d4ed8)', // blue — vecino que responde
    badge: { bg: '#1d4ed8', Glifo: IcoChat },
    TileGlifo: IcoChat,
  },
  coyo: {
    tile: 'linear-gradient(135deg, #a855f7, #6366f1)', // violet→indigo — Coyo / IA
    badge: { bg: '#a855f7', Glifo: IcoSparkle },
    TileGlifo: IcoSparkle,
  },
  membresia: {
    tile: 'linear-gradient(135deg, #4f46e5, #4338ca)', // indigo — cuenta / pagos de membresía
    badge: { bg: '#4338ca', Glifo: IcoCoin },
    TileGlifo: IcoCoin,
  },
};

const BUCKET_LABEL: Record<BucketAntiguedad, string> = {
  today: 'HOY',
  week: 'ESTA SEMANA',
  month: 'ESTE MES',
  old: 'ANTERIORES',
};

const COLORES_INICIALES = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #06b6d4, #0891b2)',
  'linear-gradient(135deg, #10b981, #047857)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #ec4899, #be185d)',
  'linear-gradient(135deg, #6366f1, #4338ca)',
  'linear-gradient(135deg, #14b8a6, #0d9488)',
];

// Tipos comerciales relacionados con un usuario/cliente
const TIPOS_USUARIO_COMERCIAL = new Set<TipoNotificacion>([
  'puntos_ganados',
  'voucher_cobrado',
  'voucher_pendiente',
  'nueva_resena',
  'nuevo_cliente',
]);

// =============================================================================
// HELPERS
// =============================================================================

function bucketDeNotificacion(createdAt: string): BucketAntiguedad {
  const ahora = Date.now();
  const fecha = new Date(createdAt).getTime();
  const diffDias = (ahora - fecha) / (1000 * 60 * 60 * 24);
  if (diffDias <= 1) return 'today';
  if (diffDias <= 7) return 'week';
  if (diffDias <= 30) return 'month';
  return 'old';
}

function formatearFechaRelativa(fecha: string): string {
  const ahora = new Date();
  const diferencia = ahora.getTime() - new Date(fecha).getTime();
  const minutos = Math.floor(diferencia / 60000);
  const horas = Math.floor(diferencia / 3600000);
  const dias = Math.floor(diferencia / 86400000);
  if (minutos < 60) return minutos <= 1 ? 'hace 1 min' : `hace ${minutos} min`;
  if (horas < 24) return horas === 1 ? 'hace 1 h' : `hace ${horas} h`;
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

function obtenerColorIniciales(nombre: string): string {
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORES_INICIALES[Math.abs(hash) % COLORES_INICIALES.length];
}

function limpiarMensajeComercial(mensaje: string, actorNombre: string): string {
  return mensaje
    .split('\n')
    .map((linea) => {
      const l = linea.trim();
      if (l === actorNombre) return '';
      if (l.startsWith(`${actorNombre}: `)) return l.slice(actorNombre.length + 2);
      if (l.startsWith(`${actorNombre} `)) {
        const resto = l.slice(actorNombre.length + 1);
        return resto.charAt(0).toUpperCase() + resto.slice(1);
      }
      if (l.endsWith(` a ${actorNombre}`)) return l.slice(0, -(actorNombre.length + 3));
      if (l.startsWith('Canjeó: ')) return l.replace('Canjeó: ', 'Canjeó sus puntos por: ');
      return linea;
    })
    .filter(Boolean)
    .join('\n');
}

function obtenerRutaDestino(n: Notificacion): string | null {
  const { modo, referenciaTipo, referenciaId, tipo } = n;
  // Estatus de pago → Mi Perfil · Membresía y Pagos, resaltando el movimiento (referenciaId).
  if (tipo === 'pago_rechazado' || tipo === 'pago_aprobado' || tipo === 'pago_anulado') {
    return referenciaId ? `/perfil?tab=pagos&movId=${referenciaId}` : '/perfil?tab=pagos';
  }
  // Gracia: no apunta a un movimiento específico del historial.
  if (tipo === 'membresia_en_gracia') {
    return '/perfil?tab=pagos';
  }
  // Comentarios (MarketPlace / Negocios): al feed + auto-abrir el modal de
  // comentarios de esa publicación puntual (NO el detalle dedicado — el
  // `case 'marketplace':` genérico de abajo apunta ahí, así que estos tipos
  // se interceptan ANTES). `comentarioId` deja que el modal haga scroll +
  // highlight al comentario exacto; puede ser null en notificaciones viejas
  // (pre-migración), el modal simplemente abre sin resaltar nada.
  if (tipo === 'marketplace_nuevo_comentario' || tipo === 'marketplace_respuesta_comentario') {
    if (!referenciaId) return null;
    const comId = n.comentarioId ? `&comentarioId=${n.comentarioId}` : '';
    return `/marketplace?articuloId=${referenciaId}${comId}`;
  }
  if (tipo === 'negocio_publicacion_nuevo_comentario' || tipo === 'negocio_publicacion_respuesta_comentario') {
    if (!referenciaId) return null;
    const comId = n.comentarioId ? `&comentarioId=${n.comentarioId}` : '';
    return `/negocios?publicacionId=${referenciaId}${comId}`;
  }
  if (!referenciaTipo) return null;

  // ── Sprint 1.D — Notificaciones del Home / Coyo ────────────────────────
  // Tanto 'pregunta_comunidad_respondida' (modo personal) como
  // 'coyo_recomendacion' (modo personal o comercial) usan
  // referenciaTipo='pregunta_comunidad' apuntando a la pregunta. El Home
  // lee `?preguntaId` y DESTACA esa pregunta arriba del feed: la pide con
  // GET /preguntas-comunidad/:id y la consume una sola vez (captura el id +
  // limpia la URL, así el destacado es efímero). Ver Home_Coyo.md
  // §Pregunta destacada.
  if (referenciaTipo === 'pregunta_comunidad') {
    const qs = referenciaId ? `?preguntaId=${referenciaId}` : '';
    return `/inicio${qs}`;
  }

  if (modo === 'personal') {
    switch (referenciaTipo) {
      case 'transaccion':
        return referenciaId
          ? `/cardya?tab=historial&id=${referenciaId}`
          : '/cardya?tab=historial';
      case 'voucher':
        return referenciaId
          ? `/cardya?tab=vouchers&id=${referenciaId}`
          : '/cardya?tab=vouchers';
      case 'oferta':
        return n.sucursalId && referenciaId
          ? `/negocios/${n.sucursalId}?ofertaId=${referenciaId}`
          : null;
      case 'recompensa':
        return referenciaId ? `/cardya?tab=recompensas&id=${referenciaId}` : '/cardya?tab=recompensas';
      case 'cupon':
        return referenciaId ? `/mis-cupones?id=${referenciaId}` : '/mis-cupones';
      case 'resena':
        return n.sucursalId && referenciaId
          ? `/negocios/${n.sucursalId}?resenaId=${referenciaId}`
          : null;
      case 'marketplace':
        return referenciaId ? `/marketplace/articulo/${referenciaId}` : null;
      case 'servicio':
        // Sprint 9.3: notificaciones de Q&A de Servicios
        // (`servicios_nueva_pregunta` / `servicios_pregunta_respondida`)
        // referencian la publicación. Deep-link al detalle.
        return referenciaId ? `/servicios/${referenciaId}` : null;
      default:
        return null;
    }
  }
  if (modo === 'comercial') {
    switch (referenciaTipo) {
      case 'transaccion': {
        const txId = referenciaId ? `transaccionId=${referenciaId}` : '';
        return `/business-studio/transacciones${txId ? `?${txId}` : ''}`;
      }
      case 'voucher': {
        const canjeId = referenciaId ? `canjeId=${referenciaId}` : '';
        const busqueda = n.actorNombre ? `busqueda=${encodeURIComponent(n.actorNombre)}` : '';
        const params = ['tab=canjes', canjeId, busqueda].filter(Boolean).join('&');
        return `/business-studio/transacciones?${params}`;
      }
      case 'resena': {
        const resenaParam = referenciaId ? `?resenaId=${referenciaId}` : '';
        return `/business-studio/opiniones${resenaParam}`;
      }
      case 'alerta': {
        // Alertas de seguridad (ej. "cliente frecuente"): abrir el módulo
        // Alertas y su modal de detalle vía ?alertaId= (ver PaginaAlertas).
        const alertaParam = referenciaId ? `?alertaId=${referenciaId}` : '';
        return `/business-studio/alertas${alertaParam}`;
      }
      default:
        break;
    }
    switch (tipo) {
      case 'stock_bajo': {
        const recompId = n.referenciaId ? `?recompensaId=${n.referenciaId}` : '';
        return `/business-studio/puntos${recompId}`;
      }
      case 'nuevo_cliente':
        return '/business-studio/clientes';
      default:
        return null;
    }
  }
  return null;
}

// =============================================================================
// CSS — Inyectado a nivel de módulo (no en useEffect) para evitar FOUC.
// =============================================================================

const PANEL_NOTIF_STYLE_ID = 'panel-notificaciones-styles';

const panelNotifCss = `
  .pn-shell {
    position: relative; width: 400px;
    font-family: 'Inter', system-ui, sans-serif;
    transform-origin: top right;
    animation: pn-pop 320ms cubic-bezier(.2,.7,.35,1) both;
  }
  /* Variante laptop (1024–1535px): un poco más chica y con el card
     estirado a casi toda la altura disponible (ver --pn-max-height en JS). */
  .pn-shell.pn-lg { width: 340px; }
  .pn-lg .pn-header { padding: 12px 14px 6px; }
  .pn-lg .pn-bellbubble { width: 26px; height: 26px; }
  .pn-lg .pn-htitle { font-size: 15px; }
  .pn-lg .pn-hcount { min-width: 22px; height: 22px; font-size: 12px; }
  .pn-lg .pn-closebtn { width: 32px; height: 32px; }
  .pn-lg .pn-tab { padding: 8px 10px 13px; font-size: 12.5px; }
  .pn-lg .pn-row { min-height: 76px; padding: 9px 12px 9px 15px; }
  .pn-lg .pn-av-wrap, .pn-lg .pn-av { width: 44px; height: 44px; }
  .pn-lg .pn-person, .pn-lg .pn-title { font-size: 13px; }
  .pn-lg .pn-msg, .pn-lg .pn-msg-quoted { font-size: 12.5px; }
  .pn-lg .pn-age { font-size: 12px; }
  .pn-lg .pn-footer { padding: 8px 12px 12px; }
  .pn-lg .pn-cta { padding: 10px 14px; font-size: 13.5px; }
  @keyframes pn-pop {
    from { transform: translate(6px,-10px) scale(.96); }
    to   { transform: translate(0,0) scale(1); }
  }

  .pn-tabs { display: flex; gap: 0; padding: 0 6px; flex-shrink: 0; }
  .pn-tab {
    all: unset; cursor: pointer; flex: 1;
    box-sizing: border-box;
    padding: 10px 12px 16px; margin-bottom: -10px;
    border-radius: 14px 14px 0 0;
    font-size: 14px; font-weight: 600; letter-spacing: -0.005em;
    text-align: center;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    /* Sin transition de bg/color: cambio de tab instantáneo. */
    background: #E2E8F0;
    color: #475569;
    border: 1px solid #CBD5E1;
    border-bottom: none;
  }
  .pn-tab:hover:not(.active) { background: #CBD5E1; }
  .pn-tab.active {
    z-index: 2;
    background: #F5F7FE;
    color: #0E1F5C;
    border-color: transparent;
  }
  .pn-tab:focus-visible { outline: 2px solid #2244C8; outline-offset: 2px; }
  .pn-tab-count {
    min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    background: rgba(14,31,92,0.10);
    color: #0E1F5C;
  }
  .pn-tab-count.on { background: #2244C8; color: #fff; }

  .pn-card {
    position: relative; overflow: hidden;
    background: #F5F7FE;
    border-radius: 18px;
    box-shadow: 0 30px 70px -20px rgba(10,30,90,0.30), 0 6px 16px rgba(10,30,90,0.10);
    display: flex; flex-direction: column;
    /* Altura fija calculada en JS desde el rect del botón de campana.
       Usamos height (no max-height) para que el panel mantenga el mismo
       tamaño tenga 0, 1 o 50 notificaciones — el .pn-scroll absorbe lo
       sobrante. El override móvil reestablece height: auto. */
    height: var(--pn-max-height, 620px);
  }
  .pn-indicator {
    position: absolute; top: 0; left: 0;
    width: 50%; height: 3px;
    background: #2244C8;
    transition: transform 340ms cubic-bezier(.4,0,.2,1);
    z-index: 5;
  }

  .pn-header { padding: 16px 18px 8px; flex-shrink: 0; }
  .pn-title-row { display: flex; align-items: center; gap: 10px; }
  .pn-bellbubble {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(34,68,200,0.10); color: #2244C8;
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .pn-htitle {
    font-size: 17px; font-weight: 700; letter-spacing: -0.015em;
    color: #0E1F5C;
  }
  .pn-hcount {
    min-width: 26px; height: 26px; padding: 0 9px;
    border-radius: 999px; color: #fff; background: #2244C8;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; letter-spacing: -0.005em;
    box-shadow: 0 2px 6px rgba(34,68,200,0.30);
    flex-shrink: 0;
  }
  .pn-closebtn {
    all: unset; cursor: pointer; box-sizing: border-box;
    margin-left: auto;
    width: 38px; height: 38px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    background: rgba(14,31,92,0.06);
    color: rgba(14,31,92,0.55);
    transition: transform .18s ease, background .18s ease, color .18s ease;
  }
  .pn-closebtn:hover { transform: scale(1.05); background: rgba(14,31,92,0.11); color: #0E1F5C; }
  .pn-closebtn:active { transform: scale(0.92); }
  .pn-closebtn:focus-visible { outline: 2px solid #2244C8; outline-offset: 2px; }

  .pn-fade { animation: pn-fade 220ms ease both; }
  @keyframes pn-fade {
    from { transform: translateY(4px); }
    to   { transform: translateY(0); }
  }
  .pn-scroll {
    flex: 1; min-height: 0; overflow-y: auto;
    padding: 4px 0 8px;
  }
  .pn-scroll::-webkit-scrollbar { width: 6px; }
  .pn-scroll::-webkit-scrollbar-thumb { background: rgba(14,31,92,0.18); border-radius: 999px; }

  .pn-group { padding: 4px 0 6px; }
  .pn-group-label {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 22px 6px;
  }
  .pn-group-text {
    font-size: 12px; font-weight: 700; letter-spacing: 0.10em;
    text-transform: uppercase;
    color: rgba(14,31,92,0.78);
  }
  .pn-group-line { flex: 1; height: 1px; background: rgba(14,31,92,0.14); }
  .pn-group-count {
    font-size: 12px; font-weight: 700;
    color: rgba(14,31,92,0.78);
    padding: 2px 8px; border-radius: 999px;
    background: rgba(14,31,92,0.08);
  }

  .pn-list { padding: 0 8px; }
  .pn-row-wrap { animation: pn-row-in 320ms cubic-bezier(.4,0,.2,1) both; }
  @keyframes pn-row-in {
    from { transform: translateX(-6px); }
    to   { transform: translateX(0); }
  }

  .pn-row {
    all: unset; box-sizing: border-box; width: 100%;
    position: relative;
    display: flex; gap: 12px;
    align-items: center;
    min-height: 92px;
    padding: 11px 14px 11px 18px;
    margin: 2px 0;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color .18s ease;
  }
  .pn-row:hover { background: rgba(34,68,200,0.08); }
  .pn-row:focus-visible { outline: 2px solid #2244C8; outline-offset: -2px; }
  /* Barra lateral azul:
     - En filas no leídas se muestra siempre (indicador persistente).
     - En filas leídas aparece animada al hover (mismo efecto que MenuDrawer). */
  .pn-row.unread::before {
    content: ''; position: absolute;
    left: 4px; top: 22%; bottom: 22%;
    width: 3px; border-radius: 0 2px 2px 0;
    background: #2244C8;
  }
  .pn-row:not(.unread)::after {
    content: ''; position: absolute;
    left: 4px; top: 22%; bottom: 22%;
    width: 3px; border-radius: 0 2px 2px 0;
    background: #2244C8;
    transform: scaleY(0); transform-origin: center;
    transition: transform 240ms cubic-bezier(.4,0,.2,1);
  }
  .pn-row:not(.unread):hover::after { transform: scaleY(1); }

  .pn-av-wrap { position: relative; width: 52px; height: 52px; flex-shrink: 0; }
  .pn-av {
    width: 52px; height: 52px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    overflow: hidden;
  }
  .pn-av img { width: 100%; height: 100%; object-fit: cover; }
  .pn-av-tile {
    border-radius: 16px;
    color: #fff;
  }
  .pn-av-iniciales {
    font-size: 19px; font-weight: 700; letter-spacing: -0.02em;
    color: #fff;
  }
  .pn-badge {
    position: absolute; right: -2px; bottom: -2px;
    width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 2.5px #F5F7FE, 0 1px 3px rgba(0,0,0,0.18);
    color: #fff;
  }

  .pn-body-wrap { flex: 1; min-width: 0; }
  .pn-person {
    font-size: 14px; font-weight: 600; letter-spacing: -0.005em;
    line-height: 1.2;
    color: #2244C8;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .pn-branch { font-weight: 500; opacity: 0.85; }
  .pn-title {
    margin-top: 1px;
    font-size: 15px; font-weight: 600; letter-spacing: -0.005em;
    color: #0E1F5C; line-height: 1.3;
    display: flex; align-items: center;
    gap: 0 6px;
    min-width: 0;
  }
  .pn-title > span:first-child {
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    min-width: 0; flex: 1;
  }
  .pn-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: #2244C8;
    flex-shrink: 0;
  }
  .pn-msg {
    margin-top: 2px;
    font-size: 14.5px; font-weight: 500; letter-spacing: -0.005em;
    color: rgba(14,31,92,0.74);
    line-height: 1.4;
    white-space: pre-line;
  }
  .pn-msg.clamped {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .pn-age {
    margin-top: 6px;
    font-size: 13.5px; font-weight: 500; letter-spacing: -0.005em;
    color: rgba(14,31,92,0.62);
  }
  /* ── Sprint 1.D — Home / Coyo: respuesta en 1 línea con ellipsis ──────
     Las notificaciones de respuesta de comunidad y recomendación de
     Coyo usan layout clásico (nombre arriba) pero sin título visible y
     con el mensaje entre comillas en UNA SOLA línea — si no cabe se
     trunca con "…". El badge del avatar (chat azul / sparkle violeta)
     ya diferencia el tipo de notificación. */
  .pn-msg-quoted {
    margin-top: 2px;
    font-size: 14.5px; font-weight: 500; letter-spacing: -0.005em;
    color: rgba(14,31,92,0.86);
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pn-msg-quoted::before { content: '“'; margin-right: 2px; color: rgba(14,31,92,0.54); }
  .pn-msg-quoted::after  { content: '”'; margin-left: 2px;  color: rgba(14,31,92,0.54); }

  .pn-trash {
    all: unset; cursor: pointer;
    width: 32px; height: 32px; border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    color: rgba(14,31,92,0.55);
    opacity: 0; transform: translateX(4px);
    transition: opacity .18s ease, transform .18s ease, background-color .15s ease, color .15s ease;
    align-self: flex-start; flex-shrink: 0;
  }
  .pn-row:hover .pn-trash,
  .pn-trash:focus-visible { opacity: 1; transform: translateX(0); }
  .pn-trash:hover { background: rgba(220,53,69,0.12); color: #C53D3D; }
  .pn-trash:focus-visible { outline: 2px solid #C53D3D; outline-offset: 2px; }

  .pn-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 24px; text-align: center;
    color: rgba(14,31,92,0.70);
  }
  .pn-empty-icon {
    width: 54px; height: 54px; border-radius: 50%;
    background: rgba(34,68,200,0.10); color: #2244C8;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }
  .pn-empty-title {
    font-size: 18px; font-weight: 700; letter-spacing: -0.015em;
    color: #0E1F5C; margin-bottom: 4px;
  }
  .pn-empty-sub {
    font-size: 14.5px; font-weight: 500; letter-spacing: -0.005em;
  }

  .pn-loadmore {
    margin: 8px 14px 4px;
    padding: 10px 14px;
    border-radius: 12px;
    background: rgba(14,31,92,0.06);
    color: #0E1F5C;
    font-size: 13.5px; font-weight: 600; letter-spacing: -0.005em;
    text-align: center; cursor: pointer;
    border: none; width: calc(100% - 28px);
    transition: background-color .15s ease;
  }
  .pn-loadmore:hover:not(:disabled) { background: rgba(14,31,92,0.10); }
  .pn-loadmore:disabled { opacity: 0.5; cursor: default; }

  .pn-footer {
    padding: 10px 14px 14px;
    border-top: 1px solid rgba(14,31,92,0.08);
    background: #F5F7FE;
    flex-shrink: 0;
  }
  .pn-cta {
    all: unset; cursor: pointer; box-sizing: border-box;
    width: 100%; padding: 12px 16px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: inherit;
    font-size: 15px; font-weight: 700; letter-spacing: -0.005em;
    color: #fff;
    background: linear-gradient(180deg, #475569, #1e293b);
    border-radius: 12px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(51,65,85,0.28);
    transition: transform .12s ease, box-shadow .18s ease, opacity .18s ease;
  }
  .pn-cta:hover:not(:disabled) {
    box-shadow: 0 1px 0 rgba(255,255,255,0.08) inset, 0 6px 16px rgba(51,65,85,0.36);
  }
  .pn-cta:active:not(:disabled) { transform: scale(.985); }
  .pn-cta:focus-visible:not(:disabled) { outline: 2px solid #fff; outline-offset: -3px; }
  .pn-cta:disabled { opacity: 0.45; cursor: default; }

  /* =========================================================
     Variante móvil — side sheet desde la derecha (mismo
     patrón que MenuDrawer móvil).
     ========================================================= */
  .pn-root-mobile {
    position: fixed; inset: 0;
    z-index: 1001;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .pn-scrim {
    position: absolute; inset: 0;
    background: rgba(8,20,55,0.42);
    backdrop-filter: blur(3px) saturate(180%);
    -webkit-backdrop-filter: blur(3px) saturate(180%);
    animation: pn-scrim 320ms ease both;
    cursor: pointer;
    touch-action: none;
  }
  @keyframes pn-scrim { from { opacity: 0; } to { opacity: 1; } }

  .pn-drawer-mobile {
    position: absolute; top: 0; right: 0; bottom: 0;
    /* Full-width en móvil: el panel cubre toda la pantalla. */
    width: 100vw;
    z-index: 40;
    animation: pn-slide 380ms cubic-bezier(.2,.7,.35,1) both;
    display: flex; flex-direction: column;
    padding-top: 20px;
    box-sizing: border-box;
    cursor: default;
  }
  @keyframes pn-slide {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }

  /* En móvil la card sube hasta el top-left con border-radius solo izquierda.
     El shell se convierte en flex column con flex:1 para que la card herede
     altura real — sin esto, .pn-scroll no tiene un padre con altura definida
     y deja de hacer overflow (no se puede deslizar). */
  .pn-drawer-mobile .pn-shell {
    width: 100%;
    animation: none;
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .pn-drawer-mobile .pn-card {
    border-radius: 22px 0 0 0;
    /* Revertir el height fijo del desktop: en móvil queremos que la card
       se estire vía flex:1 dentro del shell flex column. */
    height: auto;
    max-height: none; min-height: 0; flex: 1;
    box-shadow: none;
  }
  /* Trash siempre visible en móvil: no hay hover real en touch. */
  .pn-drawer-mobile .pn-trash {
    opacity: 1;
    transform: translateX(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .pn-shell, .pn-fade, .pn-row-wrap, .pn-indicator,
    .pn-scrim, .pn-drawer-mobile, .pn-trash, .pn-row, .pn-cta,
    .pn-row::after {
      animation: none !important;
      transition: none !important;
    }
    /* Con motion reducido, la barra de hover aparece sin animación */
    .pn-row:not(.unread):hover::after { transform: scaleY(1); }
  }
`;

function inyectarEstilosPanelNotificaciones() {
  if (typeof document === 'undefined') return;
  let styleEl = document.getElementById(PANEL_NOTIF_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = PANEL_NOTIF_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  if (styleEl.textContent !== panelNotifCss) {
    styleEl.textContent = panelNotifCss;
  }
}

// Inyectar al cargar el módulo (antes del primer render) para evitar FOUC.
inyectarEstilosPanelNotificaciones();

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

/**
 * Resuelve la familia visual con fallback a `sistema` cuando el tipo no está
 * en el mapeo (notificaciones legacy o tipos nuevos no contemplados).
 */
function resolverFamilia(tipo: TipoNotificacion): FamiliaNotificacion {
  return TIPO_A_FAMILIA[tipo] ?? 'sistema';
}

function NotifAvatar({ notificacion }: { notificacion: Notificacion }) {
  const [imgRota, setImgRota] = useState(false);

  // Caso 1: foto del actor (negocio o cliente). Si la URL ya no existe (imagen borrada),
  // `onError` degrada a iniciales/tile en vez del ícono de imagen rota del navegador.
  if (notificacion.actorImagenUrl && !imgRota) {
    return (
      <div className="pn-av">
        <img src={notificacion.actorImagenUrl} alt="" onError={() => setImgRota(true)} />
      </div>
    );
  }

  // Caso 2: iniciales del actor con color por hash
  if (notificacion.actorNombre) {
    const iniciales = obtenerIniciales(notificacion.actorNombre);
    const bg = obtenerColorIniciales(notificacion.actorNombre);
    return (
      <div className="pn-av" style={{ background: bg }}>
        <span className="pn-av-iniciales">{iniciales}</span>
      </div>
    );
  }

  // Caso 3: tile gradient de la familia con su glifo
  const familia = resolverFamilia(notificacion.tipo);
  const config = FAMILIA_CONFIG[familia];
  const { TileGlifo } = config;
  return (
    <div className="pn-av pn-av-tile" style={{ background: config.tile }}>
      <TileGlifo width={24} height={24} />
    </div>
  );
}

function NotifBadge({ notificacion }: { notificacion: Notificacion }) {
  const familia = resolverFamilia(notificacion.tipo);
  const badge = FAMILIA_CONFIG[familia]?.badge;
  if (!badge) return null;
  const { bg, Glifo } = badge;
  return (
    <span className="pn-badge" style={{ background: bg }} aria-hidden="true">
      <Glifo width={13} height={13} />
    </span>
  );
}

interface NotifRowProps {
  notificacion: Notificacion;
  onClick: () => void;
  onEliminar: () => void;
}

function NotifRow({ notificacion, onClick, onEliminar }: NotifRowProps) {
  const tiempo = formatearFechaRelativa(notificacion.createdAt);
  const sucursal = notificacion.sucursalNombre;
  const esComercialConUsuario =
    notificacion.modo === 'comercial' &&
    !!notificacion.actorNombre &&
    TIPOS_USUARIO_COMERCIAL.has(notificacion.tipo);
  // Sprint 1.D + 2.B' — los 3 tipos del Home/Coyo usan el layout
  // compacto (nombre arriba, respuesta en 1 línea con ellipsis, tiempo
  // abajo, sin título visible).
  const esTipoHomeCoyo =
    notificacion.tipo === 'pregunta_comunidad_respondida' ||
    notificacion.tipo === 'pregunta_comunidad_seguida_respondida' ||
    notificacion.tipo === 'coyo_recomendacion';

  // ---------------------------------------------------------------------------
  // Construir las líneas del contenido — replica la lógica del panel anterior
  // (notificaciones legacy que vienen con texto duplicado del actor).
  // ---------------------------------------------------------------------------
  let lineaPersona: string | null = null;
  let tituloVisible: string = notificacion.titulo;
  let mensajeVisible: string = '';

  if (esComercialConUsuario) {
    lineaPersona = notificacion.actorNombre!;
    const limpio = limpiarMensajeComercial(notificacion.mensaje, notificacion.actorNombre!);
    mensajeVisible = limpio;
    // Transformaciones legacy del título
    if (tituloVisible.startsWith('Venta con cupón: $')) {
      tituloVisible = tituloVisible.replace('Venta con cupón: $', 'Compró $') + ' con cupón';
    } else if (tituloVisible.startsWith('Venta: $')) {
      tituloVisible = tituloVisible.replace('Venta: $', 'Compró $');
    } else if (tituloVisible === 'Cupón canjeado') {
      tituloVisible = 'Canjeó cupón';
    } else if (tituloVisible === 'Nuevo voucher por entregar') {
      tituloVisible = 'Recompensa por entregar';
    } else if (tituloVisible === 'Voucher entregado') {
      tituloVisible = 'Recompensa entregada';
    }
  } else if (notificacion.modo === 'personal' && notificacion.actorNombre && notificacion.mensaje.includes('\n')) {
    lineaPersona = notificacion.actorNombre;
    let primeraLinea = notificacion.mensaje.split('\n')[0];
    // Transformaciones legacy personales
    const matchPuntos = tituloVisible.match(/^\+(\d+) puntos$/);
    if (matchPuntos) {
      primeraLinea = `+${matchPuntos[1]} puntos ganados`;
      tituloVisible = 'Compra registrada';
    }
    const matchPuntosCupon = tituloVisible.match(/^\+(\d+) puntos con cupón$/);
    if (matchPuntosCupon) {
      primeraLinea = `+${matchPuntosCupon[1]} puntos ganados`;
      tituloVisible = 'Compra con cupón';
    }
    if (tituloVisible === 'Respondieron tu reseña') tituloVisible = 'Respondió tu reseña';
    if (tituloVisible === '¡Oferta exclusiva para ti!') tituloVisible = '¡Recibiste un cupón exclusivo!';
    if (primeraLinea === 'Compraste en') primeraLinea = '';
    if (primeraLinea.startsWith('Canjeaste: '))
      primeraLinea = `${primeraLinea.replace('Canjeaste: ', '')} — muestra el código en el negocio`;
    if (primeraLinea.startsWith('Recibiste: '))
      primeraLinea = primeraLinea.replace('Recibiste: ', '');
    mensajeVisible = primeraLinea;
  } else if (notificacion.actorNombre) {
    lineaPersona = notificacion.actorNombre;
    mensajeVisible = notificacion.mensaje;
  } else {
    mensajeVisible = notificacion.mensaje;
  }

  const arialabel = `${notificacion.leida ? 'Leído' : 'Sin leer'}. ${
    lineaPersona ? `${lineaPersona}. ` : ''
  }${tituloVisible}. ${tiempo}.`;

  return (
    <button
      type="button"
      role="menuitem"
      data-testid={`panel-notif-row-${notificacion.id}`}
      className={'pn-row ' + (notificacion.leida ? '' : 'unread')}
      onClick={onClick}
      aria-label={arialabel}
    >
      <div className="pn-av-wrap">
        <NotifAvatar notificacion={notificacion} />
        <NotifBadge notificacion={notificacion} />
      </div>

      <div className="pn-body-wrap">
        {esTipoHomeCoyo ? (
          // ── Home/Coyo: nombre arriba (con MISMO formato que el título de
          //    notificación legacy — clase .pn-title — para consistencia
          //    visual con el resto del panel) + respuesta en 1 línea con
          //    ellipsis + tiempo. Sin título visible (el badge del avatar
          //    y el contexto "Nombre · 'respuesta'" lo hacen obvio). El
          //    título sigue presente en aria-label para lectores de
          //    pantalla.
          <>
            {lineaPersona && (
              <div className="pn-title">
                <span>{lineaPersona}</span>
                {!notificacion.leida && <span className="pn-dot" aria-hidden="true" />}
              </div>
            )}
            {mensajeVisible && (
              <div className="pn-msg-quoted">{mensajeVisible}</div>
            )}
            <div className="pn-age">{tiempo}</div>
          </>
        ) : (
          // ── Layout legacy (resto de tipos): actor arriba, título, mensaje.
          <>
            {lineaPersona && (
              <div className="pn-person">
                {lineaPersona}
                {sucursal && <span className="pn-branch"> · {sucursal}</span>}
              </div>
            )}
            <div className="pn-title">
              <span>{tituloVisible}</span>
              {!notificacion.leida && <span className="pn-dot" aria-hidden="true" />}
            </div>
            {mensajeVisible && (
              <div className="pn-msg clamped">{mensajeVisible}</div>
            )}
            <div className="pn-age">{tiempo}</div>
          </>
        )}
      </div>

      <span
        role="button"
        tabIndex={0}
        className="pn-trash"
        data-testid={`panel-notif-row-${notificacion.id}-trash`}
        aria-label="Eliminar notificación"
        onClick={(e) => {
          e.stopPropagation();
          onEliminar();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onEliminar();
          }
        }}
      >
        <IcoTrash width={18} height={18} />
      </span>
    </button>
  );
}

// =============================================================================
// PANEL — Contenido común (tabs + lista) reutilizado en desktop y móvil
// =============================================================================

interface PanelContenidoProps {
  onClose: () => void;
  /** Si true, el botón X del header se renderiza dentro del título. */
  conBotonCerrarHeader: boolean;
  /** true en laptop (1024–1535px): aplica la variante reducida `.pn-lg`. */
  esLaptop?: boolean;
}

function PanelContenido({ onClose, conBotonCerrarHeader, esLaptop = false }: PanelContenidoProps) {
  const notificaciones = useNotificacionesStore((s) => s.notificaciones);
  const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
  const marcarLeidaPorId = useNotificacionesStore((s) => s.marcarLeidaPorId);
  const marcarTodasLeidas = useNotificacionesStore((s) => s.marcarTodasLeidas);
  const eliminarPorId = useNotificacionesStore((s) => s.eliminarPorId);
  const hayMas = useNotificacionesStore((s) => s.hayMas);
  const cargandoMas = useNotificacionesStore((s) => s.cargandoMas);
  const cargarMas = useNotificacionesStore((s) => s.cargarMas);
  const cerrarPanel = useNotificacionesStore((s) => s.cerrarPanel);

  const navigate = useNavigate();
  const location = useLocation();
  const [filtro, setFiltro] = useState<FiltroNotificaciones>('todas');

  // ---------------------------------------------------------------------------
  // Filtrado y agrupación por bucket
  // ---------------------------------------------------------------------------
  const visibles = useMemo(() => {
    return filtro === 'todas'
      ? notificaciones
      : notificaciones.filter((n) => !n.leida);
  }, [notificaciones, filtro]);

  const grupos = useMemo(() => {
    const m: Record<BucketAntiguedad, Notificacion[]> = {
      today: [],
      week: [],
      month: [],
      old: [],
    };
    visibles.forEach((n) => m[bucketDeNotificacion(n.createdAt)].push(n));
    const orden: BucketAntiguedad[] = ['today', 'week', 'month', 'old'];
    return orden.filter((b) => m[b].length > 0).map((b) => ({ bucket: b, items: m[b] }));
  }, [visibles]);

  const indicadorX = filtro === 'todas' ? '0%' : '100%';

  // ---------------------------------------------------------------------------
  // Arrow keys mueven foco entre tabs (a11y)
  // ---------------------------------------------------------------------------
  const tabTodasRef = useRef<HTMLButtonElement>(null);
  const tabNoLeidasRef = useRef<HTMLButtonElement>(null);
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next =
        e.currentTarget === tabTodasRef.current ? tabNoLeidasRef.current : tabTodasRef.current;
      next?.focus();
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleClickNotif = (n: Notificacion) => {
    if (!n.leida) marcarLeidaPorId(n.id);
    const ruta = obtenerRutaDestino(n);
    if (!ruta) return;
    // Cerramos el panel PRIMERO y navegamos un instante después. En móvil el
    // PanelMovil empuja una entrada al history (useBackNativo) que se limpia con
    // un history.back() diferido al cerrar; si navegáramos en el mismo gesto esa
    // entrada quedaría enterrada y el back posterior caería en una pantalla
    // "muerta". Con el panel ya cerrado la navegación opera sobre el stack
    // limpio. Mismo patrón que MenuDrawer.handleNavegar.
    cerrarPanel();
    const [rutaBase, query] = ruta.split('?');
    const reemplazarEnMismaRuta = location.pathname === rutaBase && !!query;
    window.setTimeout(() => {
      if (reemplazarEnMismaRuta) {
        navigate(`${rutaBase}?${query}`, { replace: true });
      } else {
        navigate(ruta);
      }
    }, 130);
  };

  const handleMarcarTodas = () => {
    if (cantidadNoLeidas === 0) return;
    marcarTodasLeidas();
    notificar.exito('Notificaciones marcadas como leídas');
  };

  return (
    <div
      className={`pn-shell ${esLaptop ? 'pn-lg' : ''}`}
      role="menu"
      aria-label="Notificaciones"
      data-testid="panel-notif"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Tabs */}
      <div role="tablist" aria-label="Filtro de notificaciones" className="pn-tabs">
        <button
          ref={tabTodasRef}
          role="tab"
          aria-selected={filtro === 'todas'}
          data-testid="panel-notif-tab-todas"
          className={'pn-tab ' + (filtro === 'todas' ? 'active' : '')}
          onClick={() => setFiltro('todas')}
          onKeyDown={onTabKeyDown}
        >
          <IcoBell width={13} height={13} />
          Todas
          <span
            className={'pn-tab-count ' + (filtro === 'todas' ? 'on' : '')}
            data-testid="panel-notif-tab-todas-count"
          >
            {notificaciones.length}
          </span>
        </button>
        <button
          ref={tabNoLeidasRef}
          role="tab"
          aria-selected={filtro === 'no-leidas'}
          data-testid="panel-notif-tab-no-leidas"
          className={'pn-tab ' + (filtro === 'no-leidas' ? 'active' : '')}
          onClick={() => setFiltro('no-leidas')}
          onKeyDown={onTabKeyDown}
        >
          <IcoSparkle width={13} height={13} />
          No leídas
          <span
            className={'pn-tab-count ' + (filtro === 'no-leidas' ? 'on' : '')}
            data-testid="panel-notif-tab-no-leidas-count"
          >
            {cantidadNoLeidas}
          </span>
        </button>
      </div>

      {/* Card */}
      <div className="pn-card">
        <span
          className="pn-indicator"
          style={{ transform: `translateX(${indicadorX})` }}
        />

        {/* Header */}
        <div className="pn-header">
          <div className="pn-title-row">
            <span className="pn-bellbubble" aria-hidden="true">
              <IcoBell width={15} height={15} />
            </span>
            <span className="pn-htitle">Notificaciones</span>
            {cantidadNoLeidas > 0 && (
              <span
                className="pn-hcount"
                data-testid="panel-notif-header-count"
                aria-label={`${cantidadNoLeidas} sin leer`}
              >
                {cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas}
              </span>
            )}
            {conBotonCerrarHeader && (
              <button
                type="button"
                className="pn-closebtn"
                onClick={onClose}
                aria-label="Cerrar panel"
                data-testid="panel-notif-close"
              >
                <IcoX width={20} height={20} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {/* Scroll area — re-keyeada al cambiar filtro */}
        <div key={filtro} className="pn-fade pn-scroll">
          {grupos.length === 0 && (
            <div className="pn-empty" data-testid="panel-notif-empty">
              <span className="pn-empty-icon" aria-hidden="true">
                <IcoCheckCircle width={26} height={26} />
              </span>
              <div className="pn-empty-title">Sin notificaciones</div>
              <div className="pn-empty-sub">Te avisamos cuando algo nuevo pase.</div>
            </div>
          )}

          {grupos.map((g, gi) => (
            <div
              key={g.bucket}
              className="pn-group"
              data-testid={`panel-notif-group-${g.bucket}`}
            >
              <div className="pn-group-label">
                <span className="pn-group-text">{BUCKET_LABEL[g.bucket]}</span>
                <span className="pn-group-line" aria-hidden="true" />
                <span className="pn-group-count">{g.items.length}</span>
              </div>
              <div className="pn-list">
                {g.items.map((n, i) => (
                  <div
                    key={n.id}
                    className="pn-row-wrap"
                    style={{ animationDelay: `${gi * 80 + i * 40 + 80}ms` }}
                  >
                    <NotifRow
                      notificacion={n}
                      onClick={() => handleClickNotif(n)}
                      onEliminar={() => eliminarPorId(n.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Paginación al final del scroll */}
          {hayMas && grupos.length > 0 && (
            <button
              type="button"
              className="pn-loadmore"
              onClick={cargarMas}
              disabled={cargandoMas}
              data-testid="panel-notif-load-more"
            >
              {cargandoMas ? 'Cargando…' : 'Ver notificaciones anteriores'}
            </button>
          )}
        </div>

        {/* Footer CTA */}
        <div className="pn-footer">
          <button
            type="button"
            className="pn-cta"
            onClick={handleMarcarTodas}
            disabled={cantidadNoLeidas === 0}
            aria-disabled={cantidadNoLeidas === 0}
            title={cantidadNoLeidas === 0 ? 'No hay notificaciones sin leer' : undefined}
            data-testid="panel-notif-cta"
          >
            <IcoSparkle width={14} height={14} />
            Marcar todas como leídas
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// VARIANTES RESPONSIVE
// =============================================================================

interface PanelDesktopProps {
  onClose: () => void;
  esLaptop: boolean;
}

// Anclar el panel al botón de campana del Navbar (rect dinámico). El botón
// se marca con `data-notificaciones-boton="true"`. Calculamos también el
// maxHeight para que el panel crezca hasta casi llegar al fondo.
function calcularPosicionPanel(esLaptop: boolean): { top: number; right: number; maxHeight: number } | null {
  const btn = document.querySelector<HTMLElement>('button[data-notificaciones-boton="true"]');
  if (!btn) return null;
  const rect = btn.getBoundingClientRect();
  const top = rect.bottom + 8;
  return {
    top,
    right: Math.max(8, window.innerWidth - rect.right),
    // En laptop (1024–1535px) usamos casi toda la pantalla (solo 16px de
    // margen abajo) para aprovechar el poco alto disponible. En el resto
    // (2xl), 116px de margen — igual que antes.
    maxHeight: esLaptop
      ? Math.max(460, window.innerHeight - top - 16)
      : Math.max(460, window.innerHeight - top - 116),
  };
}

function PanelDesktop({ onClose, esLaptop }: PanelDesktopProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Calculado en el initializer (síncrono, antes del primer paint) para que
  // el panel nazca ya anclado al botón — evita el salto de "aparece arriba
  // y luego brinca debajo de la campana".
  const [posicion, setPosicion] = useState(() => calcularPosicionPanel(esLaptop));

  useEffect(() => {
    const recalcular = () => setPosicion(calcularPosicionPanel(esLaptop));
    window.addEventListener('resize', recalcular);
    return () => window.removeEventListener('resize', recalcular);
  }, [esLaptop]);

  // Click fuera cierra (ignora el propio botón de campana del Navbar)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const esBotonNotificaciones = target.closest('button[data-notificaciones-boton="true"]');
      if (esBotonNotificaciones) return;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Esc cierra
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      className="fixed z-75"
      style={{
        top: posicion?.top ?? 58,
        right: posicion?.right ?? 16,
        // CSS var consumida por `.pn-card max-height` — se actualiza en resize.
        ['--pn-max-height' as string]: posicion ? `${posicion.maxHeight}px` : '620px',
      }}
    >
      <PanelContenido onClose={onClose} conBotonCerrarHeader={false} esLaptop={esLaptop} />
    </div>
  );
}

interface PanelMovilProps {
  onClose: () => void;
}

function PanelMovil({ onClose }: PanelMovilProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Back nativo (Android + flecha del navegador). El PanelMovil se monta
  // condicionalmente desde el componente padre cuando `panelAbierto === true`
  // — siempre que está montado está abierto. El hook intercepta el back y
  // dispara `onClose` sin tocar la ruta actual.
  useBackNativo({
    abierto: true,
    onCerrar: onClose,
    discriminador: '_panelNotificaciones',
  });

  // Bloqueo de scroll del body mientras está abierto
  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const original = {
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
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.width = original.width;
      body.style.overflow = original.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Esc cierra + foco inicial
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    drawerRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="pn-root-mobile"
      role="dialog"
      aria-modal="true"
      aria-label="Panel de notificaciones"
      data-bloquear-swipe
    >
      <div
        className="pn-scrim"
        onClick={onClose}
        aria-hidden="true"
        data-testid="panel-notif-scrim"
      />
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="pn-drawer-mobile"
        onClick={(e) => e.stopPropagation()}
      >
        <PanelContenido onClose={onClose} conBotonCerrarHeader={true} />
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PanelNotificaciones() {
  const panelAbierto = useNotificacionesStore((s) => s.panelAbierto);
  const cerrarPanel = useNotificacionesStore((s) => s.cerrarPanel);
  const { esMobile, esLaptop } = useBreakpoint();

  if (!panelAbierto) return null;
  return esMobile ? (
    <PanelMovil onClose={cerrarPanel} />
  ) : (
    <PanelDesktop onClose={cerrarPanel} esLaptop={esLaptop} />
  );
}

export default PanelNotificaciones;
