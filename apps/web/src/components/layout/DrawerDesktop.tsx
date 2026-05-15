/**
 * DrawerDesktop.tsx
 * ===================
 * Popover de perfil del usuario para vistas desktop/laptop.
 *
 * Reemplaza el dropdown inline que vivía dentro de `Navbar.tsx`. Sigue el
 * handoff `design_handoff_menu_drawer/README.md` (variante Desktop):
 *
 *   - Ancho fijo 332px, anclado al avatar del header.
 *   - Tabs Personal/Comercial encima de la card, con cross-fade de paleta
 *     y un indicador deslizable (3px) que se mueve con `translateX`.
 *   - Identity block (avatar 56×56 + nombre + correo).
 *   - 3 ítems en modo Personal / 2 ítems en modo Comercial.
 *   - Botón Cerrar Sesión transparente con hover discreto.
 *
 * Los íconos provienen del sistema centralizado (`config/iconos.ts` +
 * Iconify) y de `lucide-react`, igualando lo que tenía el dropdown anterior
 * — no se introducen SVG nuevos del handoff. El cambio de modo respeta la
 * lógica del store (`cambiarModo`, redirección a `/inicio` si la ruta
 * actual es exclusiva del modo viejo, notificación).
 *
 * Ubicación: apps/web/src/components/layout/DrawerDesktop.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, type IconProps } from '@iconify/react';
import { Package, User, LogOut } from 'lucide-react';
import { ICONOS } from '../../config/iconos';
import {
  PALETAS_DRAWER,
  paletaACssVars,
  type ModoDrawer,
} from '../../config/menuDrawerTokens';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
import { notificar } from '../../utils/notificaciones';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;

interface ItemDrawer {
  id: string;
  label: string;
  ruta: string;
  icon: React.ElementType;
  /** Color del tile 36×36 (paridad visual con el drawer móvil). */
  tile: string;
}

// Gradients extraídos de los headers de cada página de destino — el tile
// es un mini-espejo cromático del header al que el item lleva.
const TILE = {
  publicaciones: 'linear-gradient(135deg, #22d3ee, #0891b2)',  // cyan
  guardados: 'linear-gradient(135deg, #f43f5e, #e11d48)',      // rose
  perfil: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',         // blue
} as const;

// =============================================================================
// CSS — Inline para mantener los tokens del handoff (animaciones específicas
// que no son parte del sistema global). Se inyecta una sola vez.
// =============================================================================

const DRAWER_DESKTOP_STYLE_ID = 'drawer-desktop-styles';

const drawerDesktopCss = `
  .dd-shell {
    position: relative;
    width: 332px;
    font-family: 'Inter', system-ui, sans-serif;
    transform-origin: top right;
    animation: dd-pop 320ms cubic-bezier(.2,.7,.35,1) both;
  }
  @keyframes dd-pop {
    /* Sin fade de opacity para que los tabs slate y la card se vean sólidos
       desde el primer frame; el "pop" se logra con translate + scale solos. */
    from { transform: translate(6px,-10px) scale(.94); }
    to   { transform: translate(0,0) scale(1); }
  }

  .dd-tabs { display: flex; gap: 0; padding: 0 6px; }
  .dd-tab {
    all: unset; cursor: pointer; flex: 1;
    box-sizing: border-box;
    padding: 11px 12px 16px; margin-bottom: -10px;
    border-radius: 14px 14px 0 0;
    font-size: 14px; font-weight: 600; letter-spacing: -0.005em;
    text-align: center;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    /* Sin transition en background/color: el cambio de modo es instantáneo
       para que no se perciba un fade intermedio entre paper y slate. */
    background: #E2E8F0;            /* slate-200 */
    color: #475569;                 /* slate-600 */
    border: 1px solid #CBD5E1;      /* slate-300 */
    border-bottom: none;
  }
  .dd-tab.active { z-index: 2; border-color: transparent; }
  .dd-tab:hover:not(.active) { background: #CBD5E1; color: #1E293B; }
  .dd-tab:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .dd-tab[disabled] { cursor: not-allowed; opacity: 0.5; }

  .dd-card {
    position: relative; z-index: 1; overflow: hidden;
    border-radius: 18px;
    box-shadow: 0 30px 70px -20px rgba(10,30,90,0.45), 0 6px 16px rgba(10,30,90,0.15);
    transition: background-color 280ms ease;
  }

  .dd-indicator {
    position: absolute; top: 0; left: 0;
    width: 50%; height: 3px;
    transition: transform 340ms cubic-bezier(.4,0,.2,1), background-color 280ms ease;
    z-index: 3;
  }

  .dd-fade { animation: dd-fade 240ms ease both; }
  @keyframes dd-fade {
    /* Solo translate (sin opacity 0) para que el contenido no se vea
       transparente durante el cross-fade entre modos. */
    from { transform: translateY(4px); }
    to   { transform: translateY(0); }
  }

  .dd-identity {
    display: flex; align-items: center; gap: 14px;
    padding: 22px 22px 18px;
  }
  .dd-avatar-wrap { position: relative; flex-shrink: 0; }
  .dd-avatar {
    width: 56px; height: 56px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 26px; font-weight: 700; color: #FFFFFF;
    letter-spacing: -0.02em;
    overflow: hidden;
    transition: background-color 280ms ease, box-shadow 280ms ease;
  }
  .dd-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .dd-online {
    position: absolute; right: -2px; bottom: -2px;
    width: 13px; height: 13px; border-radius: 50%;
    background: #4CC777;
    border: 2.5px solid #fff;
    transition: border-color 280ms ease;
  }
  .dd-name {
    font-weight: 700; font-size: 16px; letter-spacing: -0.015em;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    transition: color 280ms ease;
  }
  .dd-email {
    font-size: 15px;
    font-weight: 500; letter-spacing: -0.005em;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    transition: color 280ms ease;
  }

  .dd-list {
    padding: 6px 8px 12px;
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
    transition: border-color 280ms ease;
  }
  .dd-row {
    all: unset; box-sizing: border-box;
    position: relative; width: 100%;
    display: flex; align-items: center; gap: 14px;
    padding: 11px 14px 11px 18px; margin: 2px 0;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 200ms ease;
    animation: dd-row-in 320ms cubic-bezier(.4,0,.2,1) both;
  }
  @keyframes dd-row-in {
    /* Solo translate — sin fade de opacity para evitar que las filas
       se vean translúcidas durante el stagger de entrada. */
    from { transform: translateX(-6px); }
    to   { transform: translateX(0); }
  }
  .dd-row:hover { background: var(--accent-soft); }
  .dd-row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .dd-rowbar {
    position: absolute; left: 4px; top: 22%; bottom: 22%;
    width: 3px; background: var(--accent);
    border-radius: 0 2px 2px 0;
    transform: scaleY(0); transform-origin: center;
    transition: transform 240ms cubic-bezier(.4,0,.2,1);
  }
  .dd-row:hover .dd-rowbar { transform: scaleY(1); }

  .dd-tile {
    width: 36px; height: 36px; border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; flex-shrink: 0;
    box-shadow: 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.18);
    overflow: hidden;
  }

  .dd-row .dd-lbl {
    flex: 1; font-size: 14.5px; font-weight: 600; letter-spacing: -0.005em;
    transition: color 280ms ease;
    text-align: left;
  }
  .dd-row .dd-chev {
    color: rgba(0,0,0,0.28);
    transition: transform 220ms cubic-bezier(.4,0,.2,1), color 200ms ease;
    display: inline-flex;
  }
  .dd-row:hover .dd-chev { transform: translateX(3px); color: var(--accent); }

  .dd-out {
    all: unset; cursor: pointer; box-sizing: border-box;
    width: 100%; padding: 14px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font-family: inherit; font-size: 14px; font-weight: 700; letter-spacing: -0.005em;
    color: var(--ink);
    transition: background-color 200ms ease, color 280ms ease;
  }
  .dd-out:hover { background: rgba(0,0,0,0.04); }
  .dd-out:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .dd-out .dd-lo { opacity: 0.6; transition: opacity 180ms ease; display: inline-flex; }
  .dd-out:hover .dd-lo { opacity: 1; }

  @media (prefers-reduced-motion: reduce) {
    .dd-shell,
    .dd-fade,
    .dd-row,
    .dd-indicator,
    .dd-rowbar,
    .dd-tab,
    .dd-tile,
    .dd-row .dd-chev,
    .dd-card,
    .dd-avatar,
    .dd-online,
    .dd-list,
    .dd-out,
    .dd-out .dd-lo {
      animation: none !important;
      transition: none !important;
    }
  }
`;

function inyectarEstilosDrawerDesktop() {
  if (typeof document === 'undefined') return;
  let styleEl = document.getElementById(DRAWER_DESKTOP_STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = DRAWER_DESKTOP_STYLE_ID;
    document.head.appendChild(styleEl);
  }
  // Refrescar siempre el contenido — permite que HMR aplique cambios al CSS
  // sin necesidad de recargar la pestaña entera.
  if (styleEl.textContent !== drawerDesktopCss) {
    styleEl.textContent = drawerDesktopCss;
  }
}

// Inyectar al cargar el módulo (antes del primer render del componente).
// Si lo dejáramos solo en useEffect, la animación de entrada arrancaría con
// el CSS antiguo todavía en el <style> tag, causando un flash de transparencia.
inyectarEstilosDrawerDesktop();

// =============================================================================
// COMPONENTE
// =============================================================================

interface DrawerDesktopProps {
  /** Cierra el popover. Llamar también después de navegar a una ruta. */
  onClose: () => void;
}

const RUTAS_EXCLUSIVAS_COMERCIAL = ['/business-studio', '/scanya'];
const RUTAS_EXCLUSIVAS_PERSONAL = ['/cardya', '/cupones', '/mis-publicaciones', '/marketplace'];

export function DrawerDesktop({ onClose }: DrawerDesktopProps) {
  // ---------------------------------------------------------------------------
  // Stores y hooks
  // ---------------------------------------------------------------------------
  const usuario = useAuthStore((s) => s.usuario);
  const cambiarModo = useAuthStore((s) => s.cambiarModo);
  const logout = useAuthStore((s) => s.logout);

  const navigate = useNavigate();
  const location = useLocation();
  const navegarASeccion = useNavegarASeccion();

  const [cambiandoModo, setCambiandoModo] = useState(false);

  // El CSS se inyecta al cargar el módulo (ver llamada top-level a
  // inyectarEstilosDrawerDesktop arriba) para evitar el flash entre el
  // primer render y el momento en que useEffect aplica los estilos.

  // ---------------------------------------------------------------------------
  // Esc cierra el popover (a11y)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // ---------------------------------------------------------------------------
  // Arrow keys mueven foco entre tabs (a11y)
  // ---------------------------------------------------------------------------
  const tabPersonalRef = useRef<HTMLButtonElement>(null);
  const tabComercialRef = useRef<HTMLButtonElement>(null);

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

  const items: ItemDrawer[] = useMemo(() => {
    if (modo === 'personal') {
      return [
        { id: 'pub', label: 'Mis Publicaciones', ruta: '/mis-publicaciones', icon: Package, tile: TILE.publicaciones },
        { id: 'sav', label: 'Mis Guardados', ruta: '/guardados', icon: Bookmark, tile: TILE.guardados },
        { id: 'prf', label: 'Mi Perfil', ruta: '/perfil', icon: User, tile: TILE.perfil },
      ];
    }
    return [
      { id: 'sav', label: 'Mis Guardados', ruta: '/guardados', icon: Bookmark, tile: TILE.guardados },
      { id: 'prf', label: 'Mi Perfil', ruta: '/perfil', icon: User, tile: TILE.perfil },
    ];
  }, [modo]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
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

  const handleNavegar = (ruta: string) => {
    navegarASeccion(ruta);
    onClose();
  };

  const handleCerrarSesion = () => {
    onClose();
    navigate('/');
    logout();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      role="menu"
      aria-label="Menú de usuario"
      data-testid="drawer-desktop"
      className="dd-shell"
      style={{
        ...paletaACssVars(paleta),
        color: paleta.ink,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Tabs */}
      <div role="tablist" aria-label="Modo de cuenta" className="dd-tabs">
        <button
          ref={tabPersonalRef}
          role="tab"
          aria-selected={modo === 'personal'}
          data-testid="drawer-desktop-tab-personal"
          className={'dd-tab ' + (modo === 'personal' ? 'active' : '')}
          onClick={() => handleCambiarModo('personal')}
          onKeyDown={onTabKeyDown}
          disabled={cambiandoModo}
          style={
            modo === 'personal'
              ? { background: PALETAS_DRAWER.personal.paper, color: PALETAS_DRAWER.personal.ink }
              : undefined
          }
        >
          <Icon icon="lucide:user" width={14} height={14} style={{ strokeWidth: 1.9 }} />
          Personal
        </button>
        <button
          ref={tabComercialRef}
          role="tab"
          aria-selected={modo === 'comercial'}
          data-testid="drawer-desktop-tab-comercial"
          className={'dd-tab ' + (modo === 'comercial' ? 'active' : '')}
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
          <Icon icon="lucide:store" width={14} height={14} style={{ strokeWidth: 1.9 }} />
          Comercial
        </button>
      </div>

      {/* Card */}
      <div className="dd-card" style={{ background: paleta.paper }}>
        <span
          className="dd-indicator"
          style={{ transform: `translateX(${indicadorX})`, background: paleta.accentBg }}
        />

        <div key={modo} className="dd-fade">
          {/* Identity */}
          <div className="dd-identity">
            <div className="dd-avatar-wrap">
              <div
                className="dd-avatar"
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
                className="dd-online"
                aria-label="Disponible"
                style={{ borderColor: paleta.paper }}
              />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="dd-name" data-testid="drawer-desktop-nombre">{nombreMostrado}</div>
              <div
                className="dd-email"
                data-testid="drawer-desktop-subtitulo"
                style={{ color: paleta.muted }}
              >
                {subtituloMostrado}
              </div>
            </div>
          </div>

          {/* Lista */}
          <div className="dd-list">
            {items.map((it, i) => {
              const IconoFila = it.icon;
              return (
                <button
                  key={it.id}
                  role="menuitem"
                  data-testid={`drawer-desktop-item-${it.id}`}
                  className="dd-row"
                  style={{ animationDelay: `${i * 40 + 60}ms` }}
                  onClick={() => handleNavegar(it.ruta)}
                >
                  <span className="dd-rowbar" />
                  <span className="dd-tile" style={{ background: it.tile }} aria-hidden="true">
                    <IconoFila width={17} height={17} strokeWidth={1.85} />
                  </span>
                  <span className="dd-lbl">{it.label}</span>
                  <span className="dd-chev">
                    <Icon icon="lucide:chevron-right" width={16} height={16} />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Cerrar Sesión */}
          <button
            type="button"
            data-testid="drawer-desktop-logout"
            className="dd-out"
            onClick={handleCerrarSesion}
          >
            <span className="dd-lo">
              <LogOut width={16} height={16} strokeWidth={1.7} />
            </span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export default DrawerDesktop;
