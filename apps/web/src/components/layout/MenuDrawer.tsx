/**
 * MenuDrawer.tsx — versión v4 (handoff design_handoff_menu_drawer)
 * =================================================================
 * Side sheet de perfil del usuario para vistas móviles. Reemplaza la versión
 * v3.2 con la estética definitiva del handoff:
 *
 *   - Container anclado a la derecha, ancho `min(88vw, 380px)`.
 *   - Scrim azul oscuro con blur(3px), tap cierra.
 *   - Tabs Personal/Comercial cross-fade de paleta + indicador deslizable 3px.
 *   - Identidad CENTRADA (avatar 64×64 con halo + nombre + correo/sucursal).
 *   - Lista con tiles 36×36 coloreados por item (ítems con logo de marca
 *     se renderizan sin tile coloreado para preservar la identidad).
 *   - Sticky bottom con botón Cerrar Sesión rojo (outline + hover fill).
 *   - X flotante en top-right con backdrop-blur.
 *   - Toast "Cambiaste a modo X" (auto-dismiss 2.4s) al alternar tabs.
 *
 * El cambio de modo respeta la lógica del store (`cambiarModo`, redirección
 * a `/inicio` si la ruta actual es exclusiva del modo viejo, validación
 * `tieneModoComercial`). El componente `ToggleModoUsuario` ya no se importa
 * aquí — los tabs internos son el único mecanismo de switch.
 *
 * Ubicación: apps/web/src/components/layout/MenuDrawer.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconProps } from '@/config/iconos';
import { Lock, LogOut, Ticket, User, Download, HelpCircle, Megaphone, ChartNoAxesCombined, ChevronRight, Store, X } from 'lucide-react';
import { ICONOS } from '../../config/iconos';
import {
  PALETAS_DRAWER,
  paletaACssVars,
  type ModoDrawer,
} from '../../config/menuDrawerTokens';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useUiStore } from '../../stores/useUiStore';
import { usePWAInstallStore } from '../../stores/usePWAInstallStore';
import { abrirScanYA } from '../../config/scanya';
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
import { useEsCiudadUnica } from '../../hooks/queries/useCiudades';
import { useBackNativo } from '../../hooks/useBackNativo';
import { notificar } from '../../utils/notificaciones';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Wallet = (p: IconoWrapperProps) => <Icon icon={ICONOS.cartera} {...p} />;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;
const Package = (p: IconoWrapperProps) => <Icon icon={ICONOS.producto} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;

// =============================================================================
// TIPOS
// =============================================================================

interface MenuDrawerProps {
  onClose: () => void;
}

interface ItemMenuDrawer {
  id: string;
  label: string;
  /** Color del tile 36×36. Cuando el item lleva imagen de marca, no se aplica. */
  tile: string;
  /** Ícono vectorial. Mutuamente excluyente con `iconoImagen`. */
  icon?: React.ElementType;
  /** Logo de marca (webp). Mutuamente excluyente con `icon`. */
  iconoImagen?: string;
  /** Renderiza la imagen llenando el tile (object-cover) sobre el fondo `tile`,
   *  en vez del modo transparente/contain. Para logos con fondo propio (ScanYA). */
  iconoFill?: boolean;
  /** Texto alternativo para la imagen / aria-label adicional. */
  alt?: string;
  onClick: () => void;
  /** Indica que el item está bloqueado (renderiza tile gris + candado). */
  bloqueado?: boolean;
  hintBloqueado?: string;
}

// =============================================================================
// CSS — Inline para preservar tokens del handoff. Se inyecta una sola vez.
// =============================================================================

const MENU_DRAWER_STYLE_ID = 'menu-drawer-mobile-styles';

const menuDrawerCss = `
  .md4-root {
    position: fixed; inset: 0;
    z-index: 1001;
    font-family: 'Inter', system-ui, sans-serif;
  }

  .md4-scrim {
    position: absolute; inset: 0;
    background: rgba(8,20,55,0.42);
    backdrop-filter: blur(3px) saturate(180%);
    -webkit-backdrop-filter: blur(3px) saturate(180%);
    animation: md4-scrim 320ms ease both;
    cursor: pointer;
    touch-action: none;
  }
  @keyframes md4-scrim { from { opacity: 0; } to { opacity: 1; } }

  .md4-drawer {
    position: absolute; top: 0; right: 0; bottom: 0;
    width: min(76vw, 312px);
    z-index: 40;
    animation: md4-slide 380ms cubic-bezier(.2,.7,.35,1) both;
    display: flex; flex-direction: column;
    padding-top: max(env(safe-area-inset-top, 0px), 10px);
    box-sizing: border-box;
    cursor: default;
  }
  @keyframes md4-slide {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }

  /* X de cerrar: vive DENTRO de la card (esquina superior derecha, sobre el
     área del avatar). Sutil sobre el paper; se adapta al modo con var(--ink). */
  .md4-close {
    all: unset; box-sizing: border-box;
    position: absolute; top: 12px; right: 12px;
    width: 30px; height: 30px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: rgba(15,23,42,0.06);
    color: var(--muted); cursor: pointer;
    transition: transform .18s ease, background .18s ease, color .18s ease;
    z-index: 12;
  }
  .md4-close:hover { transform: scale(1.05); background: rgba(15,23,42,0.11); color: var(--ink); }
  .md4-close:active { transform: scale(0.92); }
  .md4-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .md4-tabs { display: flex; gap: 0; padding: 0 6px; flex-shrink: 0; }
  .md4-tab {
    all: unset; cursor: pointer; flex: 1; box-sizing: border-box;
    padding: 12px 12px 18px; margin-bottom: -12px;
    border-radius: 14px 14px 0 0;
    font-size: 14px; font-weight: 600; letter-spacing: -0.005em;
    text-align: center;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    /* Sin transition de background/color: el cambio de modo es instantáneo
       para evitar el cross-fade visible entre paper y la versión inactiva.
       Solo se anima la escala al presionar. */
    transition: transform .08s ease;
    /* Tokens sólidos en slate: el tab inactivo necesita contraste sobre
       cualquier fondo (el scrim deja ver contenido detrás). */
    background: #E2E8F0;            /* slate-200 */
    color: #475569;                 /* slate-600 */
    border: 1px solid #CBD5E1;      /* slate-300 */
    border-bottom: none;
  }
  .md4-tab.active { z-index: 2; border-color: transparent; }
  .md4-tab:active { transform: scale(0.98); }
  .md4-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .md4-tab[disabled] { cursor: not-allowed; opacity: 0.5; }
  /* Sin cuenta comercial: se oculta el tab Comercial y el tab Personal
     (único) queda a la MITAD, alineado a la derecha, con el indicador en esa
     mitad. Aplica en móvil y en desktop. */
  .md4-tab.md4-tab-oculto { display: none; }
  .md4-tabs.md4-tabs-sin-comercial { justify-content: flex-end; }
  .md4-tabs.md4-tabs-sin-comercial .md4-tab { flex: 0 0 50%; }
  .md4-indicator.md4-indicator-derecha { transform: translateX(100%) !important; }

  .md4-card {
    position: relative; flex: 1; min-height: 0;
    border-radius: 22px 0 0 0;
    overflow: hidden;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
    transition: background-color 280ms ease;
    display: flex; flex-direction: column;
  }

  .md4-indicator {
    position: absolute; top: 0; left: 0;
    width: 50%; height: 3px; z-index: 3;
    transition: transform 340ms cubic-bezier(.4,0,.2,1), background-color 280ms ease;
  }

  .md4-fade {
    flex: 1; min-height: 0; overflow-y: auto;
    animation: md4-fade 240ms ease both;
  }
  @keyframes md4-fade {
    /* Solo translate (sin opacity 0) para que el contenido no se vea
       transparente durante el cross-fade entre modos. */
    from { transform: translateY(4px); }
    to   { transform: translateY(0); }
  }

  .md4-identity {
    display: flex; flex-direction: column; align-items: center;
    padding: 26px 22px 20px;
    text-align: center;
  }
  .md4-avatar-wrap { position: relative; }
  .md4-avatar {
    width: 64px; height: 64px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 30px; font-weight: 700; color: #FFFFFF;
    letter-spacing: -0.02em;
    overflow: hidden;
    transition: background-color 280ms ease, box-shadow 280ms ease;
  }
  .md4-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .md4-online {
    position: absolute; right: -2px; bottom: -2px;
    width: 14px; height: 14px; border-radius: 50%;
    background: #4CC777;
    border: 2.5px solid #fff;
    transition: border-color 280ms ease;
  }
  .md4-name {
    margin-top: 12px;
    font-weight: 700; font-size: 17px; letter-spacing: -0.015em;
    max-width: 260px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    transition: color 280ms ease;
  }
  .md4-email {
    font-size: 15.5px;
    font-weight: 500; letter-spacing: -0.005em;
    transition: color 280ms ease;
    max-width: 260px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .md4-list { padding: 6px 8px 12px; }
  .md4-sep {
    height: 1px;
    background: var(--rule);
    margin: 10px 16px 6px;
  }
  .md4-row {
    all: unset; box-sizing: border-box; width: 100%;
    position: relative;
    display: flex; align-items: center; gap: 14px;
    padding: 11px 14px 11px 18px; margin: 2px 0;
    border-radius: 12px;
    transition: background-color 200ms ease;
    animation: md4-row-in 320ms cubic-bezier(.4,0,.2,1) both;
    cursor: pointer;
  }
  @keyframes md4-row-in {
    /* Solo translate — sin fade de opacity para evitar que las filas
       se vean translúcidas durante el stagger de entrada. */
    from { transform: translateX(-8px); }
    to   { transform: translateX(0); }
  }
  .md4-row:active { background: var(--accent-soft); }
  .md4-row:hover { background: var(--accent-soft); }
  .md4-row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .md4-row[disabled] {
    cursor: not-allowed;
    animation: md4-row-in 320ms cubic-bezier(.4,0,.2,1) both;
  }
  .md4-row[disabled]:hover,
  .md4-row[disabled]:active { background: transparent; }

  .md4-rowbar {
    position: absolute; left: 4px; top: 22%; bottom: 22%;
    width: 3px; background: var(--accent);
    border-radius: 0 2px 2px 0;
    transform: scaleY(0); transform-origin: center;
    transition: transform 240ms cubic-bezier(.4,0,.2,1);
  }
  .md4-row:hover .md4-rowbar { transform: scaleY(1); }
  .md4-row[disabled] .md4-rowbar { display: none; }

  .md4-tile {
    width: 36px; height: 36px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.18);
    overflow: hidden;
    position: relative;
  }
  .md4-tile.is-image { background: transparent !important; box-shadow: none; }
  .md4-tile.is-image img { width: 100%; height: 100%; object-fit: contain; }
  .md4-tile.is-image-fill { overflow: hidden; box-shadow: none; }
  .md4-tile.is-image-fill img { width: 100%; height: 100%; object-fit: cover; }
  .md4-tile.is-locked { background: #94A3B8 !important; }
  .md4-tile.is-locked img { filter: grayscale(1); opacity: 0.7; }
  .md4-tile-lock-badge {
    position: absolute; right: -2px; bottom: -2px;
    width: 14px; height: 14px; border-radius: 50%;
    background: #64748B; color: #fff;
    display: flex; align-items: center; justify-content: center;
    border: 1.5px solid var(--paper);
  }

  .md4-lbl {
    flex: 1; font-size: 15px; font-weight: 600; letter-spacing: -0.005em;
    transition: color 280ms ease;
    text-align: left;
    min-width: 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .md4-lbl-hint {
    display: block;
    font-size: 11px; font-weight: 500;
    color: rgba(0,0,0,0.45);
    margin-top: 1px;
  }
  .md4-chev {
    color: rgba(0,0,0,0.28);
    transition: transform 220ms cubic-bezier(.4,0,.2,1), color 200ms ease;
    display: inline-flex; flex-shrink: 0;
  }
  .md4-row:hover .md4-chev { transform: translateX(3px); color: var(--accent); }
  .md4-row[disabled] .md4-chev { color: rgba(0,0,0,0.15); }

  .md4-bottom {
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 24px));
    border-top: 1px solid var(--rule);
    background: var(--paper);
    transition: background-color 280ms ease, border-color 280ms ease;
    flex-shrink: 0;
  }
  .md4-out {
    all: unset; cursor: pointer; box-sizing: border-box;
    width: 100%; padding: 11px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: inherit; font-size: 14px; font-weight: 700; letter-spacing: -0.005em;
    color: #fff;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    box-shadow: 0 4px 12px rgba(220,38,38,0.28);
    transition: filter 200ms ease, box-shadow 200ms ease, transform .12s ease;
  }
  .md4-out:hover { filter: brightness(1.06); box-shadow: 0 6px 16px rgba(220,38,38,0.36); }
  .md4-out:active { transform: scale(0.97); }
  .md4-out:focus-visible { outline: 2px solid #dc2626; outline-offset: 2px; }

  @media (prefers-reduced-motion: reduce) {
    .md4-scrim,
    .md4-drawer,
    .md4-fade,
    .md4-row,
    .md4-indicator,
    .md4-rowbar,
    .md4-tab,
    .md4-close,
    .md4-card,
    .md4-avatar,
    .md4-online,
    .md4-out,
    .md4-chev {
      animation: none !important;
      transition: none !important;
    }
  }
`;

function inyectarEstilosMenuDrawer() {
  if (typeof document === 'undefined') return;
  let styleEl = document.getElementById(MENU_DRAWER_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = MENU_DRAWER_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  // Refrescar siempre el contenido — permite que HMR aplique cambios al CSS
  // sin necesidad de recargar la pestaña entera.
  if (styleEl.textContent !== menuDrawerCss) {
    styleEl.textContent = menuDrawerCss;
  }
}

// Inyectar al cargar el módulo (antes del primer render del componente)
// para evitar que la animación de entrada arranque con CSS antiguo.
inyectarEstilosMenuDrawer();

// =============================================================================
// COMPONENTE
// =============================================================================

const RUTAS_EXCLUSIVAS_COMERCIAL = ['/business-studio', '/scanya'];
const RUTAS_EXCLUSIVAS_PERSONAL = ['/cardya', '/cupones', '/mis-publicaciones', '/marketplace'];

// Gradients extraídos de los headers de cada página de destino — el tile
// es un mini-espejo cromático del header al que el item lleva.
const TILE = {
  ubicacion: 'linear-gradient(135deg, #1e3a8a, #2563eb)',      // navy → blue-600 (sin página propia, azul de marca)
  cardya: 'linear-gradient(135deg, #f59e0b, #d97706)',          // amber
  cupones: 'linear-gradient(135deg, #10b981, #059669)',         // emerald
  publicaciones: 'linear-gradient(135deg, #22d3ee, #0891b2)',   // cyan
  anunciate: 'linear-gradient(135deg, #06b6d4, #0891b2)',       // cyan (identidad de /anunciate)
  guardados: 'linear-gradient(135deg, #f43f5e, #e11d48)',       // rose
  perfil: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',          // blue
  scanya: 'linear-gradient(135deg, #001E70, #034AE3)',          // deep blue
  businessStudio: 'linear-gradient(135deg, #2563eb, #3b82f6)',  // blue-600 → blue-500
} as const;

export function MenuDrawer({ onClose }: MenuDrawerProps) {
  // ---------------------------------------------------------------------------
  // Stores y hooks
  // ---------------------------------------------------------------------------
  const usuario = useAuthStore((s) => s.usuario);
  const cambiarModo = useAuthStore((s) => s.cambiarModo);
  const logout = useAuthStore((s) => s.logout);

  const ciudadData = useGpsStore((s) => s.ciudad);

  // Ciudad única → el tile de ubicación queda como indicador (muestra la
  // ciudad, no abre el selector).
  const esCiudadUnica = useEsCiudadUnica();

  const abrirModalUbicacion = useUiStore((s) => s.abrirModalUbicacion);
  const cerrarTodo = useUiStore((s) => s.cerrarTodo);

  // PWA: instalación de la app principal (banner + este ítem del menú).
  const puedeInstalarApp = usePWAInstallStore((s) => s.puedeInstalar);
  const esIOSInstalar = usePWAInstallStore((s) => s.esIOS);
  const appInstalada = usePWAInstallStore((s) => s.instalada);
  const instalarApp = usePWAInstallStore((s) => s.instalar);
  const abrirInstruccionesIOS = usePWAInstallStore((s) => s.abrirInstruccionesIOS);

  const navigate = useNavigate();
  const location = useLocation();
  const navegarASeccion = useNavegarASeccion();

  const [cambiandoModo, setCambiandoModo] = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);
  const tabPersonalRef = useRef<HTMLButtonElement>(null);
  const tabComercialRef = useRef<HTMLButtonElement>(null);

  // ---------------------------------------------------------------------------
  // Back nativo (Android + flecha del navegador)
  // ---------------------------------------------------------------------------
  // El MenuDrawer se monta condicionalmente desde `MainLayout` (cuando
  // `menuDrawerAbierto === true`) — siempre que está montado está abierto.
  // El hook intercepta el back y dispara `onClose` sin tocar la ruta actual,
  // misma semántica que cualquier modal con `useBackNativo`.
  useBackNativo({
    abierto: true,
    onCerrar: onClose,
    discriminador: '_menuDrawer',
  });

  // El CSS se inyecta al cargar el módulo (ver llamada top-level a
  // inyectarEstilosMenuDrawer arriba) para evitar el flash entre el
  // primer render y el momento en que useEffect aplica los estilos.

  // ---------------------------------------------------------------------------
  // Bloquear scroll del body mientras el drawer está abierto
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Esc cierra el drawer (a11y) + focus inicial
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    drawerRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // ---------------------------------------------------------------------------
  // Arrow keys mueven foco entre tabs (a11y)
  // ---------------------------------------------------------------------------
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.currentTarget === tabPersonalRef.current
        ? tabComercialRef.current
        : tabPersonalRef.current;
      next?.focus();
    }
  };

  // ---------------------------------------------------------------------------
  // Datos derivados
  // ---------------------------------------------------------------------------
  if (!usuario) return null;

  const modo: ModoDrawer = usuario.modoActivo === 'comercial' ? 'comercial' : 'personal';
  const tieneModoComercial = !!usuario.tieneModoComercial;
  const paleta = PALETAS_DRAWER[modo];
  const indicadorX = modo === 'personal' ? '0%' : '100%';
  // ScanYA NO exige CardYA: también sirve para validar cupones y sellar tarjetas.
  // Solo requiere el onboarding terminado (igual que el backend).
  const onboardingCompletado = !!usuario.sucursalAsignada || (usuario.onboardingCompletado ?? false);
  const scanyaHabilitado = onboardingCompletado;

  const inicialPersonal = usuario.nombre?.charAt(0).toUpperCase() || 'U';
  const inicialNegocio = (usuario.sucursalAsignada
    ? usuario.nombreSucursalAsignada?.charAt(0).toUpperCase()
    : usuario.nombreNegocio?.charAt(0).toUpperCase()) || 'N';
  const inicial = modo === 'comercial' ? inicialNegocio : inicialPersonal;

  const avatarUrl = modo === 'comercial'
    ? (usuario.sucursalAsignada
      ? usuario.fotoPerfilSucursalAsignada
      : usuario.fotoPerfilNegocio) || null
    : usuario.avatarUrl || null;

  const nombreMostrado = modo === 'comercial'
    ? (usuario.nombreNegocio || '')
    : `${usuario.nombre ?? ''} ${usuario.apellidos ?? ''}`.trim();

  const subtituloMostrado = modo === 'comercial'
    ? (usuario.sucursalAsignada
      ? (usuario.nombreSucursalAsignada || '')
      : (usuario.correoNegocio || ''))
    : (usuario.correo || '');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleNavegar = (ruta: string) => {
    // Cerramos el drawer PRIMERO y navegamos un instante después. El drawer
    // limpia la entrada que empujó al history con un history.back() diferido
    // (useBackNativo, setTimeout 0). Si navegáramos en el mismo gesto —con la
    // entrada del drawer aún en el stack— el `replace` de useNavegarASeccion
    // reemplazaría ESA entrada en vez de la de la página actual, dejando la
    // sección hermana en el historial (el back iría a la hermana en lugar de a
    // /inicio). Con el drawer ya cerrado, la navegación opera sobre el stack
    // limpio y toda sección queda como hija directa de /inicio. Mismo patrón
    // que handleAbrirUbicacion.
    onClose();
    window.setTimeout(() => navegarASeccion(ruta), 130);
  };

  const handleAbrirUbicacion = () => {
    // Ciudad única: la ubicación es fija → el tile no abre el selector.
    if (esCiudadUnica) return;
    // Cerramos el drawer PRIMERO y abrimos el modal un instante después.
    // El drawer limpia su entrada de history con un history.back() diferido
    // (setTimeout 0); si el modal se montara en el mismo gesto, ese back
    // retrocedería la entrada que el modal acaba de empujar y lo cerraría al
    // instante. Este pequeño desfase deja que el drawer termine su limpieza
    // antes de que el modal toque el history.
    onClose();
    window.setTimeout(abrirModalUbicacion, 130);
  };

  const handleCerrarSesion = () => {
    cerrarTodo();
    navigate('/');
    logout();
  };

  const handleInstalarApp = () => {
    onClose();
    if (esIOSInstalar) {
      // iOS/Safari no tiene prompt nativo → abrir instructivo (Compartir → Agregar).
      abrirInstruccionesIOS();
    } else {
      void instalarApp();
    }
  };

  const handleCambiarModo = async (nuevo: ModoDrawer) => {
    if (cambiandoModo) return;
    if (nuevo === modo) return;
    if (nuevo === 'comercial' && !tieneModoComercial) return;

    const rutaActual = location.pathname;
    const enRutaExclusivaComercial = RUTAS_EXCLUSIVAS_COMERCIAL.some((r) => rutaActual.startsWith(r));
    const enRutaExclusivaPersonal = RUTAS_EXCLUSIVAS_PERSONAL.some((r) => rutaActual.startsWith(r));
    const debeRedirigir =
      (modo === 'comercial' && nuevo === 'personal' && enRutaExclusivaComercial) ||
      (modo === 'personal' && nuevo === 'comercial' && enRutaExclusivaPersonal);

    if (debeRedirigir) {
      navegarASeccion('/inicio');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setCambiandoModo(true);
    try {
      await cambiarModo(nuevo);
      notificar.exito(
        nuevo === 'comercial' ? 'Cambiaste a modo Comercial' : 'Cambiaste a modo Personal',
      );
    } catch (error) {
      notificar.error(error instanceof Error ? error.message : 'Error al cambiar modo');
    } finally {
      setCambiandoModo(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Items por modo
  // ---------------------------------------------------------------------------
  const ubicacionItem: ItemMenuDrawer = {
    id: 'loc',
    label: ciudadData?.nombre || 'Tu Ubicación',
    tile: TILE.ubicacion,
    icon: MapPin,
    onClick: handleAbrirUbicacion,
  };

  const guardadosItem: ItemMenuDrawer = {
    id: 'sav',
    label: 'Mis Guardados',
    tile: TILE.guardados,
    icon: Bookmark,
    onClick: () => handleNavegar('/guardados'),
  };

  const perfilItem: ItemMenuDrawer = {
    id: 'prf',
    label: 'Mi Perfil',
    tile: TILE.perfil,
    icon: User,
    onClick: () => handleNavegar('/perfil'),
  };

  const ayudaItem: ItemMenuDrawer = {
    id: 'ayuda',
    label: 'Ayuda y Tutoriales',
    tile: 'linear-gradient(135deg, #0284c7, #0369a1)',
    icon: HelpCircle,
    onClick: () => handleNavegar('/ayuda'),
  };

  const anunciateItem: ItemMenuDrawer = {
    id: 'anunciate',
    label: 'Anúnciate',
    tile: TILE.anunciate,
    icon: Megaphone,
    onClick: () => handleNavegar('/anunciate'),
  };

  // Grupo PRINCIPAL: la ubicación + las secciones más usadas del modo + guardados.
  const itemsPrincipales: ItemMenuDrawer[] = modo === 'personal'
    ? [
        ubicacionItem,
        {
          id: 'card',
          label: 'CardYA',
          tile: TILE.cardya,
          icon: Wallet,
          onClick: () => handleNavegar('/cardya'),
        },
        {
          id: 'cup',
          label: 'Mis Cupones',
          tile: TILE.cupones,
          icon: Ticket,
          onClick: () => handleNavegar('/mis-cupones'),
        },
        {
          id: 'pub',
          label: 'Mis Publicaciones',
          tile: TILE.publicaciones,
          icon: Package,
          onClick: () => handleNavegar('/mis-publicaciones'),
        },
        guardadosItem,
      ]
    : [
        ubicacionItem,
        {
          id: 'scn',
          label: 'ScanYA',
          tile: '#000000',
          iconoImagen: '/IconoScanYA.webp',
          iconoFill: true,
          alt: 'ScanYA',
          onClick: scanyaHabilitado
            // En prod salta al subdominio de ScanYA (otro origen); en dev navega interno.
            ? () => abrirScanYA(() => handleNavegar('/scanya'))
            : () => {},
          bloqueado: !scanyaHabilitado,
          hintBloqueado: !onboardingCompletado ? 'Completa tu registro' : 'Activa CardYA',
        },
        {
          id: 'biz',
          label: 'Business Studio',
          tile: TILE.businessStudio,
          icon: ChartNoAxesCombined,
          onClick: () => handleNavegar('/business-studio'),
        },
        guardadosItem,
      ];

  // Grupo SECUNDARIO (separado, más abajo): accesos secundarios y de cuenta.
  const itemsSecundarios: ItemMenuDrawer[] = [anunciateItem, ayudaItem, perfilItem];

  // Ítem "Instalar app": solo si la instalación está disponible (Android/Chrome
  // con prompt nativo, o iOS con instructivo) y la app no corre ya instalada. Va al grupo secundario.
  if ((puedeInstalarApp || esIOSInstalar) && !appInstalada) {
    itemsSecundarios.push({
      id: 'pwa',
      label: 'Instalar app',
      tile: 'linear-gradient(135deg, #0f172a, #2563eb)',
      icon: Download,
      onClick: handleInstalarApp,
    });
  }

  // Renderiza una fila del menú (reutilizada por ambos grupos). El índice `i`
  // controla el stagger de entrada; se pasa continuo entre grupos.
  const renderFila = (it: ItemMenuDrawer, i: number) => {
    const tileClasses = ['md4-tile'];
    if (it.iconoFill) tileClasses.push('is-image-fill');
    else if (it.iconoImagen) tileClasses.push('is-image');
    if (it.bloqueado) tileClasses.push('is-locked');
    const tileStyle: React.CSSProperties = { background: it.bloqueado ? undefined : it.tile };
    const IconoFila = it.icon;
    return (
      <button
        type="button"
        key={it.id}
        role="menuitem"
        data-testid={`menu-drawer-item-${it.id}`}
        className="md4-row"
        style={{ animationDelay: `${i * 35 + 80}ms` }}
        onClick={it.bloqueado ? undefined : it.onClick}
        disabled={it.bloqueado}
        aria-disabled={it.bloqueado}
      >
        <span className="md4-rowbar" />
        <span className={tileClasses.join(' ')} style={tileStyle} aria-hidden="true">
          {it.iconoImagen ? (
            <img src={it.iconoImagen} alt={it.alt || it.label} />
          ) : IconoFila ? (
            <IconoFila width={21} height={21} strokeWidth={1.85} />
          ) : null}
          {it.bloqueado && (
            <span className="md4-tile-lock-badge" aria-hidden="true">
              <Lock width={8} height={8} strokeWidth={2.5} />
            </span>
          )}
        </span>
        <span className="md4-lbl">
          {it.label}
          {it.bloqueado && it.hintBloqueado && (
            <span className="md4-lbl-hint">{it.hintBloqueado}</span>
          )}
        </span>
        {it.bloqueado ? (
          <Lock width={14} height={14} strokeWidth={2.25} className="md4-chev" />
        ) : (
          <span className="md4-chev">
            <ChevronRight width={16} height={16} />
          </span>
        )}
      </button>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      className="md4-root"
      role="dialog"
      aria-modal="true"
      aria-label="Menú de usuario"
      data-testid="menu-drawer"
      data-bloquear-swipe
    >
      {/* Scrim — tap para cerrar */}
      <div
        className="md4-scrim"
        onClick={onClose}
        data-testid="menu-drawer-scrim"
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        tabIndex={-1}
        className="md4-drawer"
        style={{
          ...paletaACssVars(paleta),
          color: paleta.ink,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div role="tablist" aria-label="Modo de cuenta" className={'md4-tabs' + (!tieneModoComercial ? ' md4-tabs-sin-comercial' : '')}>
          <button
            ref={tabPersonalRef}
            role="tab"
            aria-selected={modo === 'personal'}
            data-testid="menu-drawer-tab-personal"
            className={'md4-tab ' + (modo === 'personal' ? 'active' : '')}
            onClick={() => handleCambiarModo('personal')}
            onKeyDown={onTabKeyDown}
            disabled={cambiandoModo}
            style={
              modo === 'personal'
                ? { background: PALETAS_DRAWER.personal.paper, color: PALETAS_DRAWER.personal.ink }
                : undefined
            }
          >
            <User width={15} height={15} style={{ strokeWidth: 1.9 }} />
            Personal
          </button>
          <button
            ref={tabComercialRef}
            role="tab"
            aria-selected={modo === 'comercial'}
            data-testid="menu-drawer-tab-comercial"
            className={'md4-tab ' + (modo === 'comercial' ? 'active' : '') + (!tieneModoComercial ? ' md4-tab-oculto' : '')}
            onClick={() => handleCambiarModo('comercial')}
            onKeyDown={onTabKeyDown}
            disabled={cambiandoModo || !tieneModoComercial}
            aria-disabled={!tieneModoComercial}
            title={!tieneModoComercial ? 'Aún no tienes cuenta comercial' : undefined}
            style={
              modo === 'comercial'
                ? { background: PALETAS_DRAWER.comercial.paper, color: PALETAS_DRAWER.comercial.ink }
                : undefined
            }
          >
            <Store width={15} height={15} style={{ strokeWidth: 1.9 }} />
            Comercial
          </button>
        </div>

        {/* Card */}
        <div className="md4-card" style={{ background: paleta.paper }}>
          {/* X cerrar — dentro de la card, esquina superior derecha (sobre el avatar) */}
          <button
            type="button"
            className="md4-close"
            onClick={onClose}
            aria-label="Cerrar menú"
            data-testid="menu-drawer-close"
          >
            <X width={16} height={16} style={{ strokeWidth: 2 }} />
          </button>
          <span
            className={'md4-indicator' + (!tieneModoComercial ? ' md4-indicator-derecha' : '')}
            style={{ transform: `translateX(${indicadorX})`, background: paleta.accentBg }}
          />

          <div key={modo} className="md4-fade">
            {/* Identity */}
            <div className="md4-identity">
              <div className="md4-avatar-wrap">
                <div
                  className="md4-avatar"
                  style={{
                    background: paleta.accentBg,
                    boxShadow: `0 0 0 4px ${paleta.paper}, 0 0 0 5px ${paleta.accentSoft}`,
                  }}
                >
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={modo === 'comercial' ? (usuario.nombreNegocio || 'Negocio') : (usuario.nombre || 'Usuario')}
                    />
                  ) : (
                    inicial
                  )}
                </div>
                <span
                  className="md4-online"
                  aria-label="Disponible"
                  style={{ borderColor: paleta.paper }}
                />
              </div>
              <div className="md4-name" data-testid="menu-drawer-nombre">
                {nombreMostrado}
              </div>
              <div
                className="md4-email"
                data-testid="menu-drawer-subtitulo"
                style={{ color: paleta.muted }}
              >
                {subtituloMostrado}
              </div>
            </div>

            {/* Lista — grupo principal + separador + grupo secundario */}
            <div className="md4-list">
              {itemsPrincipales.map((it, i) => renderFila(it, i))}
              <div className="md4-sep" aria-hidden="true" />
              {itemsSecundarios.map((it, i) => renderFila(it, itemsPrincipales.length + i))}
            </div>
          </div>

          {/* Sticky bottom: Cerrar Sesión */}
          <div className="md4-bottom">
            <button
              type="button"
              className="md4-out"
              onClick={handleCerrarSesion}
              data-testid="menu-drawer-logout"
            >
              <LogOut width={16} height={16} strokeWidth={1.7} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MenuDrawer;
