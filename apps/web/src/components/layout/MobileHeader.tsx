/**
 * MobileHeader.tsx - VERSIÓN v3.1
 * ============================================
 * Header móvil de AnunciaYA (gradiente azul + shine) para las páginas que no
 * traen su propio header (Home / Pregúntale a Peñasco). Incluye el buscador
 * inline por sección.
 *
 * Dentro de `/business-studio` NO se usa este header: se delega a
 * `HeaderBusinessStudioMovil` (header propio de BS con identidad azul-slate),
 * igual que Mis Guardados, Anúnciate o Mi Perfil traen su header en móvil.
 *
 * Ubicación: apps/web/src/components/layout/MobileHeader.tsx
 */

import { useEffect, useRef } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';

// Wrapper Iconify con nombre familiar.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
import { Link, useLocation } from 'react-router-dom';
import { useUiStore } from '../../stores/useUiStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { useSearchStore, detectarSeccion, placeholderSeccion } from '../../stores/useSearchStore';
import { HeaderBusinessStudioMovil } from './HeaderBusinessStudioMovil';

// =============================================================================
// ESTILOS CSS PARA ANIMACIONES
// =============================================================================
const animationStyles = `
  .mobile-header-gradient {
    background: linear-gradient(90deg, #1e3a8a, #2563eb);
  }

  @keyframes mobileShineMove {
    0% { transform: translateX(-100%); opacity: 0; }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { transform: translateX(300%); opacity: 0; }
  }

  .mobile-shine-line {
    position: relative;
    height: 4px;
    background: linear-gradient(90deg, #1e3a8a, #3b82f6, #60a5fa, #3b82f6, #1e3a8a);
    overflow: hidden;
  }

  .mobile-shine-line::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
    animation: mobileShineMove 2.5s ease-in-out infinite;
    will-change: transform;
  }
`;

// =============================================================================
// COMPONENTE
// =============================================================================

export function MobileHeader() {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const abrirMenuDrawer = useUiStore((state) => state.abrirMenuDrawer);

  // Search Store — buscador inline
  const { query, buscadorAbierto, setQuery, cerrarBuscador } = useSearchStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // GPS Store
  const ciudad = useGpsStore((state) => state.ciudad);
  const obtenerUbicacion = useGpsStore((state) => state.obtenerUbicacion);
  const setCiudad = useGpsStore((state) => state.setCiudad);

  // Notificaciones Store
  const cantidadNoLeidas = useNotificacionesStore((state) => state.totalNoLeidas);
  const togglePanel = useNotificacionesStore((state) => state.togglePanel);

  // Location
  const location = useLocation();
  const esBusinessStudio = location.pathname.startsWith('/business-studio');
  const seccionActiva = detectarSeccion(location.pathname);

  // ---------------------------------------------------------------------------
  // Effect: Auto-detectar ubicación al cargar (solo si no hay ciudad)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (ciudad) {
      return;
    }

    const autoDetectar = async () => {
      try {
        const coordenadas = await obtenerUbicacion();

        if (coordenadas) {
          const { buscarCiudadCercana } = await import('../../data/ciudadesPopulares');

          const ciudadCercana = buscarCiudadCercana(
            coordenadas.latitud,
            coordenadas.longitud
          );

          if (ciudadCercana) {
            setCiudad(
              ciudadCercana.nombre,
              ciudadCercana.estado,
              ciudadCercana.coordenadas
            );
          } else {
            console.warn('⚠️ [MOBILE] No se encontró ciudad cercana');
          }
        }
      } catch (error) {
        console.error('❌ [MOBILE] Error en auto-detección:', error);
      }
    };

    autoDetectar();
  }, []); // Solo al montar el componente

  // ---------------------------------------------------------------------------
  // Business Studio: header propio (identidad azul-slate) en lugar del azul AY
  // ---------------------------------------------------------------------------
  if (esBusinessStudio) {
    return <HeaderBusinessStudioMovil />;
  }

  // ---------------------------------------------------------------------------
  // Render — Header AnunciaYA (Home / secciones sin header propio)
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* Inyectar estilos de animación */}
      <style>{animationStyles}</style>

      <div className="sticky top-0 z-40">
        {/* Header principal con gradiente azul */}
        <header className="mobile-header-gradient px-4 py-4 flex items-center justify-between shadow-sm">

          {/* ===== MODO BUSCADOR: Input se expande con animación ===== */}
          {buscadorAbierto ? (
            <div className="flex items-center gap-0.5 w-full">
              <Search className="w-7 h-7 text-white/60 shrink-0" />
              <div
                className="flex-1 overflow-hidden transition-[width] duration-300 ease-out ml-1"
                style={{ width: '100%' }}
              >
                <input
                  ref={inputRef}
                  id="busqueda-movil"
                  name="busquedaMovil"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={() => {
                    if (!query.trim()) {
                      cerrarBuscador();
                    }
                  }}
                  placeholder={placeholderSeccion(seccionActiva)}
                  className="w-full bg-white/15 text-white text-base placeholder-white/40 outline-none rounded-full px-4 py-1.5"
                />
              </div>
              <button
                onClick={cerrarBuscador}
                className="p-0.5 rounded-full text-white/80 hover:bg-white/20 cursor-pointer shrink-0"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
          ) : (
            <>
              {/* ===== MODO NORMAL: Logo + Iconos ===== */}
              {/* === Lado Izquierdo: Logo === */}
              <div className="flex items-center">
                {/* replace cuando NO venimos de /inicio: el logo es atajo
                    al home, no debe acumular historial entre secciones. */}
                <Link to="/inicio" replace={location.pathname !== '/inicio'} className="flex items-center shrink-0">
                  <img
                    src="/logo-anunciaya-azul.webp"
                    alt="AnunciaYA"
                    className="h-11 w-auto object-contain"
                  />
                </Link>
              </div>

              {/* === Lado Derecho: Acciones === */}
              <div className="flex items-center gap-1">
                {/* Botón Notificaciones (movido desde MenuDrawer en visión v3).
                    `blur()` evita el hover sticky en mobile cuando se cierra el panel. */}
                <button
                  onClick={(e) => {
                    e.currentTarget.blur();
                    togglePanel();
                  }}
                  data-notificaciones-boton="true"
                  className="relative p-2 text-white/90 active:bg-white/20 rounded-full transition-colors"
                  title="Notificaciones"
                >
                  <Bell className="w-6 h-6" />
                  {cantidadNoLeidas > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] bg-red-500 text-white text-[13px] rounded-full flex items-center justify-center font-bold ring-2 ring-blue-700 px-1 leading-none">
                      {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                    </span>
                  )}
                </button>

                {/* Botón Menú */}
                <button
                  onClick={abrirMenuDrawer}
                  className="p-2 text-white/90 hover:bg-white/20 hover:text-white rounded-full transition-colors"
                  title="Menú"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </header>

        {/* Línea brillante inferior */}
        <div className="mobile-shine-line" />
      </div>
    </>
  );
}

export default MobileHeader;
