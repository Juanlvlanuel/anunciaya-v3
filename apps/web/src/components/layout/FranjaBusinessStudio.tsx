/**
 * FranjaBusinessStudio.tsx
 * ========================
 * Franja de identidad de Business Studio para escritorio. Se monta DEBAJO del
 * header de AnunciaYA (Navbar) cuando estás en `/business-studio`, igual que
 * las secciones con personalidad (Mis Guardados, Anúnciate) muestran su header
 * propio bajo el navbar. Así se conserva la marca AY arriba y BS gana su
 * personalidad (identidad azul-slate) abajo.
 *
 * Reúne lo que antes vivía dentro del Navbar en modo BS:
 *   - Identidad: ícono + "Business Studio"
 *   - Negocio + selector de sucursal (SelectorSucursalesInline)
 *   - Navegación entre módulos (‹ módulo actual ›)
 *   - Botón Vista previa
 *
 * Ubicación: apps/web/src/components/layout/FranjaBusinessStudio.tsx
 */

import { useLocation } from 'react-router-dom';
import {
  Store, ChevronLeft, ChevronRight, X, ChartNoAxesCombined,
  LayoutDashboard, Receipt, Users, MessageSquare, ShoppingBag, Tag,
  UserCog, BarChart3, User, Coins, Newspaper,
} from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../config/iconos';
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUiStore } from '../../stores/useUiStore';
import Tooltip from '../ui/Tooltip';
import SelectorSucursalesInline from './SelectorSucursalesInline';

// Wrappers Iconify con nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Briefcase = (p: IconoWrapperProps) => <Icon icon={ICONOS.empleos} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;

// =============================================================================
// MÓDULOS BS (mismo orden que Navbar / MobileHeader)
// =============================================================================

type ModuloIcono = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const MODULOS_BS = [
  { nombre: 'Dashboard', ruta: '/business-studio' },
  { nombre: 'Transacciones', ruta: '/business-studio/transacciones' },
  { nombre: 'Clientes', ruta: '/business-studio/clientes' },
  { nombre: 'Opiniones', ruta: '/business-studio/opiniones' },
  { nombre: 'Alertas', ruta: '/business-studio/alertas' },
  { nombre: 'Publicaciones', ruta: '/business-studio/publicaciones' },
  { nombre: 'Catálogo', ruta: '/business-studio/catalogo' },
  { nombre: 'Promociones', ruta: '/business-studio/ofertas' },
  { nombre: 'Puntos y Recompensas', ruta: '/business-studio/puntos' },
  { nombre: 'Empleados', ruta: '/business-studio/empleados' },
  { nombre: 'Vacantes', ruta: '/business-studio/vacantes' },
  { nombre: 'Reportes', ruta: '/business-studio/reportes' },
  { nombre: 'Sucursales', ruta: '/business-studio/sucursales' },
  { nombre: 'Mi Perfil Comercial', ruta: '/business-studio/perfil' },
];

const RUTAS_OCULTAS_GERENTE = [
  '/business-studio/puntos',
  '/business-studio/sucursales',
];

function obtenerIconoModulo(pathname: string): ModuloIcono {
  if (pathname.includes('/transacciones')) return Receipt;
  if (pathname.includes('/clientes')) return Users;
  if (pathname.includes('/opiniones')) return MessageSquare;
  if (pathname.includes('/alertas')) return Bell;
  if (pathname.includes('/publicaciones')) return Newspaper;
  if (pathname.includes('/catalogo')) return ShoppingBag;
  if (pathname.includes('/ofertas')) return Tag;
  if (pathname.includes('/puntos')) return Coins;
  if (pathname.includes('/empleados')) return UserCog;
  if (pathname.includes('/vacantes')) return Briefcase;
  if (pathname.includes('/reportes')) return BarChart3;
  if (pathname.includes('/sucursales')) return MapPin;
  if (pathname.includes('/perfil')) return User;
  return LayoutDashboard;
}

function obtenerNombreModulo(pathname: string): string {
  if (pathname === '/business-studio') return 'Dashboard';
  if (pathname.includes('/transacciones')) return 'Transacciones';
  if (pathname.includes('/clientes')) return 'Clientes';
  if (pathname.includes('/opiniones')) return 'Opiniones';
  if (pathname.includes('/alertas')) return 'Alertas';
  if (pathname.includes('/publicaciones')) return 'Publicaciones';
  if (pathname.includes('/catalogo')) return 'Catálogo';
  if (pathname.includes('/ofertas')) return 'Promociones';
  if (pathname.includes('/puntos')) return 'Puntos';
  if (pathname.includes('/empleados')) return 'Empleados';
  if (pathname.includes('/vacantes')) return 'Vacantes';
  if (pathname.includes('/reportes')) return 'Reportes';
  if (pathname.includes('/sucursales')) return 'Sucursales';
  if (pathname.includes('/perfil')) return 'Mi Perfil Comercial';
  return 'Dashboard';
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function FranjaBusinessStudio() {
  const location = useLocation();
  const navegarASeccion = useNavegarASeccion();

  const usuario = useAuthStore((s) => s.usuario);
  const esSucursalPrincipal = useAuthStore((s) => s.esSucursalPrincipal);
  const previewNegocioAbierto = useUiStore((s) => s.previewNegocioAbierto);
  const togglePreviewNegocio = useUiStore((s) => s.togglePreviewNegocio);

  // Navegación entre módulos (mismo filtrado que Navbar)
  const esGerente = !!usuario?.sucursalAsignada;
  const vistaComoGerente = esGerente || (!esSucursalPrincipal && !esGerente);
  // Sin CardYA el módulo solo sirve para tarjetas de sellos → "Recompensas".
  const participaPuntos = usuario?.participaPuntos ?? false;
  const modulosNavegables = (vistaComoGerente
    ? MODULOS_BS.filter((m) => !RUTAS_OCULTAS_GERENTE.includes(m.ruta))
    : MODULOS_BS
  ).map((m) =>
    m.ruta === '/business-studio/puntos' && !participaPuntos ? { ...m, nombre: 'Tarjeta de Sellos' } : m
  );

  const obtenerIndiceModuloActual = () => {
    const exacto = modulosNavegables.findIndex((m) => location.pathname === m.ruta);
    if (exacto !== -1) return exacto;
    return modulosNavegables.findIndex((m) => m.ruta !== '/business-studio' && location.pathname.startsWith(m.ruta));
  };

  const indiceModuloActual = obtenerIndiceModuloActual();
  const hayModuloAnterior = indiceModuloActual > 0;
  const hayModuloSiguiente = indiceModuloActual >= 0 && indiceModuloActual < modulosNavegables.length - 1;

  const navegarModuloAnterior = () => {
    if (hayModuloAnterior) navegarASeccion(modulosNavegables[indiceModuloActual - 1].ruta);
  };
  const navegarModuloSiguiente = () => {
    if (hayModuloSiguiente) navegarASeccion(modulosNavegables[indiceModuloActual + 1].ruta);
  };

  const IconoModulo = obtenerIconoModulo(location.pathname);
  // Sin CardYA, el módulo de puntos se muestra como "Tarjeta de Sellos".
  const nombreModulo = !participaPuntos && location.pathname.startsWith('/business-studio/puntos')
    ? 'Tarjeta de Sellos'
    : obtenerNombreModulo(location.pathname);

  return (
    <div
      className="relative overflow-hidden"
      style={{ background: '#000000' }}
    >
      {/* Glow azul (identidad BS) — sobre el área de contenido (derecha) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 82% 10%, rgba(37,99,235,0.20) 0%, transparent 58%)' }}
      />
      {/* Línea de acento superior */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, #3b82f6 40%, #60a5fa 60%, transparent)' }}
      />

      <div className="relative z-10 flex items-stretch h-14">

        {/* ===== Identidad BS — ancho EXACTO del menú lateral. Cae justo
                 encima del menú para sentirse un solo bloque integrado. ===== */}
        <div className="w-56 2xl:w-72 shrink-0 flex items-center gap-3 lg:gap-2.5 2xl:gap-3 px-4 lg:px-3 2xl:px-4">
          <div
            className="w-9 h-9 2xl:w-10 2xl:h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)', boxShadow: '0 6px 16px rgba(37,99,235,0.4)' }}
          >
            <ChartNoAxesCombined className="w-5 h-5 2xl:w-6 2xl:h-6 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-lg 2xl:text-xl font-extrabold text-white tracking-tight">
            Business<span className="text-blue-400">Studio</span>
          </span>
        </div>

        {/* Separador vertical — marca el fin del menú / inicio del contenido */}
        <div className="self-center w-px h-8 bg-white/15 shrink-0" />

        {/* ===== Contenido (fuera del ancho del menú): negocio + sucursal ·
                 navegación de módulo · vista previa ===== */}
        <div className="flex-1 flex items-center gap-4 2xl:gap-6 px-5 2xl:px-6 min-w-0">
          {/* Negocio + selector de sucursal */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 2xl:w-10 2xl:h-10 rounded-lg bg-linear-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md overflow-hidden shrink-0">
              {usuario?.logoNegocio ? (
                <img src={usuario.logoNegocio} alt={usuario?.nombreNegocio || 'Negocio'} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
              )}
            </div>
            <SelectorSucursalesInline />
          </div>

          {/* Centro: navegación de módulo (sin recuadro) */}
          <div className="flex-1 flex items-center justify-center gap-2 2xl:gap-3 min-w-0">
            {hayModuloAnterior ? (
              <Tooltip text="Módulo anterior" position="bottom">
                <button
                  onClick={navegarModuloAnterior}
                  className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5 2xl:w-6 2xl:h-6" />
                </button>
              </Tooltip>
            ) : (
              <button disabled className="p-1 rounded-lg text-white/25 cursor-not-allowed">
                <ChevronLeft className="w-5 h-5 2xl:w-6 2xl:h-6" />
              </button>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <IconoModulo className="w-4 h-4 2xl:w-5 2xl:h-5 text-blue-400" strokeWidth={2.2} />
              <span className="text-sm lg:text-sm 2xl:text-lg font-bold text-white truncate">{nombreModulo}</span>
            </div>

            {hayModuloSiguiente ? (
              <Tooltip text="Módulo siguiente" position="bottom">
                <button
                  onClick={navegarModuloSiguiente}
                  className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 active:scale-95 cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5 2xl:w-6 2xl:h-6" />
                </button>
              </Tooltip>
            ) : (
              <button disabled className="p-1 rounded-lg text-white/25 cursor-not-allowed">
                <ChevronRight className="w-5 h-5 2xl:w-6 2xl:h-6" />
              </button>
            )}
          </div>

          {/* Vista previa */}
          <button
            data-testid="btn-preview-bs-desktop"
            onClick={togglePreviewNegocio}
            className={`group flex items-center gap-2 px-3.5 2xl:px-4 py-1.5 2xl:py-2 rounded-full text-sm 2xl:text-sm font-semibold text-white border backdrop-blur-md cursor-pointer shrink-0 ${
              previewNegocioAbierto
                ? 'bg-red-500/25 border-red-300/50 hover:bg-red-500/35'
                : 'bg-white/10 border-white/25 hover:bg-white/20'
            }`}
          >
            {previewNegocioAbierto ? (
              <>
                <X className="w-4 h-4" strokeWidth={2.5} />
                <span>Cerrar</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 transition-transform group-hover:scale-110" strokeWidth={2.5} />
                <span>Vista previa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FranjaBusinessStudio;
