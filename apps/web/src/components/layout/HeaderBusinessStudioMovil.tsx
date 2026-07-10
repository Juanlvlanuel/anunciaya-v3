/**
 * HeaderBusinessStudioMovil.tsx
 * =============================
 * Header propio de Business Studio para móvil. Reemplaza al header azul de
 * AnunciaYA (MobileHeader) cuando estás dentro de `/business-studio`, igual
 * que las secciones con personalidad (Mis Guardados, Anúnciate, Mi Perfil)
 * traen su propio header en móvil.
 *
 * Identidad: fondo negro + glow azul + grid sutil + acento azul (BS). Se
 * reagrupa TODO lo de BS que antes vivía en la sub-barra gris:
 *   Fila 1  → ícono + "Business Studio" · Vista previa · Notificaciones · Menú (perfil AY)
 *   Subtít. → negocio activo (+ sucursal) con líneas decorativas
 *   Fila 2  → menú de módulos BS · ‹ módulo actual › · sucursal / guardar
 *
 * Ubicación: apps/web/src/components/layout/HeaderBusinessStudioMovil.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  Menu, Eye, X, ChevronRight, ChevronLeft, Save, Building2, ChartNoAxesCombined,
  LayoutDashboard, Receipt, Users, MessageSquare, ShoppingBag, Tag,
  UserCheck, BarChart3, User, CircleDollarSign,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { IconoMenuMorph } from '../ui/IconoMenuMorph';
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
import { useVolverAtras } from '../../hooks/useVolverAtras';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificacionesStore } from '../../stores/useNotificacionesStore';
import { DrawerBusinessStudio } from './DrawerBusinessStudio';
import { obtenerSucursalesNegocio } from '../../services/negociosService';

// Wrappers Iconify con nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Briefcase = (p: IconoWrapperProps) => <Icon icon={ICONOS.empleos} {...p} />;

// =============================================================================
// MÓDULOS BS (mismo orden que MobileHeader / useSwipeNavegacionBS)
// =============================================================================

type ModuloIcono = React.ComponentType<{ className?: string; strokeWidth?: number }>;

const MODULOS_BS = [
  { nombre: 'Dashboard', ruta: '/business-studio' },
  { nombre: 'Transacciones', ruta: '/business-studio/transacciones' },
  { nombre: 'Clientes', ruta: '/business-studio/clientes' },
  { nombre: 'Opiniones', ruta: '/business-studio/opiniones' },
  { nombre: 'Alertas', ruta: '/business-studio/alertas' },
  { nombre: 'Catálogo', ruta: '/business-studio/catalogo' },
  { nombre: 'Promociones', ruta: '/business-studio/ofertas' },
  { nombre: 'Puntos y Recompensas', ruta: '/business-studio/puntos' },
  { nombre: 'Empleados', ruta: '/business-studio/empleados' },
  { nombre: 'Vacantes', ruta: '/business-studio/vacantes' },
  { nombre: 'Reportes', ruta: '/business-studio/reportes' },
  { nombre: 'Sucursales', ruta: '/business-studio/sucursales' },
  { nombre: 'Mi Perfil', ruta: '/business-studio/perfil' },
];

function obtenerIconoModulo(pathname: string): ModuloIcono {
  if (pathname.includes('/transacciones')) return Receipt;
  if (pathname.includes('/clientes')) return Users;
  if (pathname.includes('/opiniones')) return MessageSquare;
  if (pathname.includes('/alertas')) return Bell;
  if (pathname.includes('/catalogo')) return ShoppingBag;
  if (pathname.includes('/ofertas')) return Tag;
  if (pathname.includes('/puntos')) return CircleDollarSign;
  if (pathname.includes('/empleados')) return UserCheck;
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
  if (pathname.includes('/catalogo')) return 'Catálogo';
  if (pathname.includes('/ofertas')) return 'Promociones';
  if (pathname.includes('/puntos')) return 'Puntos y Rec.';
  if (pathname.includes('/empleados')) return 'Empleados';
  if (pathname.includes('/vacantes')) return 'Vacantes';
  if (pathname.includes('/reportes')) return 'Reportes';
  if (pathname.includes('/sucursales')) return 'Sucursales';
  if (pathname.includes('/perfil')) return 'Mi Perfil';
  return 'Dashboard';
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function HeaderBusinessStudioMovil() {
  const location = useLocation();
  const navegarASeccion = useNavegarASeccion();
  // Flecha ← del header: back nativo (historial real) con fallback a /inicio,
  // mismo patrón que Mis Guardados / Anúnciate. Ver useVolverAtras.
  const handleVolver = useVolverAtras('/inicio');

  // Stores
  const usuario = useAuthStore((s) => s.usuario);
  const { setSucursalActiva, setEsSucursalPrincipal, setTotalSucursales } = useAuthStore();
  const totalSucursales = useAuthStore((s) => s.totalSucursales);
  const esSucursalPrincipal = useAuthStore((s) => s.esSucursalPrincipal);

  const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
  const previewNegocioAbierto = useUiStore((s) => s.previewNegocioAbierto);
  const togglePreviewNegocio = useUiStore((s) => s.togglePreviewNegocio);
  const guardarBsFn = useUiStore((s) => s.guardarBsFn);
  const guardandoBs = useUiStore((s) => s.guardandoBs);
  const bsPuedeGuardar = useUiStore((s) => s.bsPuedeGuardar);

  const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
  const togglePanel = useNotificacionesStore((s) => s.togglePanel);

  // Estado local
  const [drawerBsAbierto, setDrawerBsAbierto] = useState(false);
  const [dropdownSucAbierto, setDropdownSucAbierto] = useState(false);
  const [sucursalesMobile, setSucursalesMobile] = useState<{ id: string; nombre: string; esPrincipal: boolean }[]>([]);
  const btnSucRef = useRef<HTMLButtonElement>(null);
  const [sucPos, setSucPos] = useState<{ top: number; right: number } | null>(null);

  // El header tiene overflow-hidden (para contener el glow/grid), así que el
  // dropdown de sucursales se renderiza en un portal con posición fixed anclada
  // al botón — si no, quedaría atrapado/recortado dentro del header.
  const toggleDropdownSuc = () => {
    if (!dropdownSucAbierto) {
      const r = btnSucRef.current?.getBoundingClientRect();
      if (r) setSucPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setDropdownSucAbierto((p) => !p);
  };

  // Cargar sucursales (para el selector móvil)
  useEffect(() => {
    if (!usuario?.negocioId || usuario?.modoActivo !== 'comercial') {
      setSucursalesMobile([]);
      return;
    }
    obtenerSucursalesNegocio(usuario.negocioId).then((resp) => {
      if (resp.success && resp.data) {
        const ordenadas = [...resp.data].sort((a: { esPrincipal: boolean; nombre: string }, b: { esPrincipal: boolean; nombre: string }) => {
          if (a.esPrincipal) return -1;
          if (b.esPrincipal) return 1;
          return a.nombre.localeCompare(b.nombre);
        });
        setSucursalesMobile(ordenadas);
        setTotalSucursales(ordenadas.length);
      }
    }).catch(() => setSucursalesMobile([]));
  }, [usuario?.negocioId, usuario?.modoActivo, setTotalSucursales]);

  const tieneMuchasSucursales = totalSucursales > 1;

  // Navegación entre módulos (mismo filtrado que MobileHeader)
  const esGerente = !!usuario?.sucursalAsignada;
  const vistaComoGerente = esGerente || (!esSucursalPrincipal && !esGerente);
  const modulosFiltrados = vistaComoGerente
    ? MODULOS_BS.filter((m) => m.ruta !== '/business-studio/sucursales' && m.ruta !== '/business-studio/puntos')
    : MODULOS_BS;

  const obtenerIndiceModuloActual = () => {
    const exacto = modulosFiltrados.findIndex((m) => location.pathname === m.ruta);
    if (exacto !== -1) return exacto;
    return modulosFiltrados.findIndex((m) => m.ruta !== '/business-studio' && location.pathname.startsWith(m.ruta));
  };

  const indiceModuloActual = obtenerIndiceModuloActual();
  const hayModuloAnterior = indiceModuloActual > 0;
  const hayModuloSiguiente = indiceModuloActual >= 0 && indiceModuloActual < modulosFiltrados.length - 1;

  const navegarModuloAnterior = () => {
    if (hayModuloAnterior) navegarASeccion(modulosFiltrados[indiceModuloActual - 1].ruta);
  };
  const navegarModuloSiguiente = () => {
    if (hayModuloSiguiente) navegarASeccion(modulosFiltrados[indiceModuloActual + 1].ruta);
  };

  const IconoModulo = obtenerIconoModulo(location.pathname);
  const nombreModulo = obtenerNombreModulo(location.pathname);

  return (
    <>
      <div className="sticky top-0 z-40">
        <div className="relative overflow-hidden" style={{ background: '#000000' }}>
          {/* Glow azul (identidad BS) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 85% 15%, rgba(37,99,235,0.16) 0%, transparent 55%)' }}
          />
          {/* Grid sutil */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.08,
              backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
            }}
          />
          {/* Línea de acento superior */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, #3b82f6 40%, #60a5fa 60%, transparent)' }}
          />
          {/* Línea de acento inferior (réplica de la superior) */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, #3b82f6 40%, #60a5fa 60%, transparent)' }}
          />

          <div className="relative z-10">
            {/* ══ Fila 1: identidad + acciones globales ══ */}
            <div className="flex items-center justify-between px-3 pt-4 pb-5">
              <div className="flex items-center gap-1.5 min-w-0 shrink">
                <button
                  data-testid="btn-volver-bs-movil"
                  onClick={handleVolver}
                  aria-label="Volver a inicio"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)', boxShadow: '0 6px 16px rgba(37,99,235,0.4)' }}
                >
                  <ChartNoAxesCombined className="w-5 h-5 text-white" strokeWidth={2.2} />
                </div>
                <span className="text-2xl font-extrabold text-white tracking-tight truncate">
                  Business<span className="text-blue-400">Studio</span>
                </span>
              </div>
              <div className="flex items-center gap-0 -mr-1 shrink-0">
                {/* Notificaciones */}
                <button
                  data-testid="btn-notificaciones-bs-movil"
                  onClick={(e) => { e.currentTarget.blur(); togglePanel(); }}
                  data-notificaciones-boton="true"
                  aria-label="Notificaciones"
                  className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <Bell className="w-6 h-6 animate-bell-ring" strokeWidth={2.5} />
                  {cantidadNoLeidas > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                      {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                    </span>
                  )}
                </button>
                {/* Menú (perfil AY) */}
                <button
                  data-testid="btn-menu-bs-movil"
                  onClick={abrirMenuDrawer}
                  aria-label="Menú"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <IconoMenuMorph />
                </button>
              </div>
            </div>


            {/* ══ Fila 2: menú módulos · navegación de módulo · sucursal/guardar ══ */}
            <div className="flex items-center justify-between gap-2 px-2.5 pb-3">
              {/* Menú de módulos BS */}
              <button
                data-testid="btn-modulos-bs-movil"
                onClick={() => setDrawerBsAbierto(true)}
                aria-label="Menú de Business Studio"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-white/10 border border-white/20 hover:bg-white/15 active:scale-95 cursor-pointer shrink-0"
              >
                <Menu className="w-5 h-5" strokeWidth={2.3} />
              </button>

              {/* Navegación de módulo (flechas + nombre) */}
              <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
                <button
                  onClick={navegarModuloAnterior}
                  disabled={!hayModuloAnterior}
                  aria-label="Módulo anterior"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    hayModuloAnterior ? 'text-white hover:bg-white/10 cursor-pointer' : 'text-white/25 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                </button>
                <div className="flex items-center gap-2 min-w-0">
                  <IconoModulo className="w-5 h-5 text-blue-400" strokeWidth={2.2} />
                  <span className="font-bold text-white text-lg truncate">{nombreModulo}</span>
                </div>
                <button
                  onClick={navegarModuloSiguiente}
                  disabled={!hayModuloSiguiente}
                  aria-label="Módulo siguiente"
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    hayModuloSiguiente ? 'text-white hover:bg-white/10 cursor-pointer' : 'text-white/25 cursor-not-allowed'
                  }`}
                >
                  <ChevronRight className="w-6 h-6" strokeWidth={2.5} />
                </button>
              </div>

              {/* Slot derecho: vista previa + (guardar / sucursal) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Vista previa */}
                <button
                  data-testid="btn-preview-bs-movil"
                  onClick={togglePreviewNegocio}
                  aria-label={previewNegocioAbierto ? 'Cerrar vista previa' : 'Vista previa'}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0 ${
                    previewNegocioAbierto ? 'text-red-300 hover:bg-red-500/20' : 'text-emerald-300 hover:bg-emerald-500/15'
                  }`}
                >
                  {previewNegocioAbierto ? <X className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                </button>
                {guardarBsFn ? (
                <button
                  data-testid="btn-guardar-bs-movil"
                  onClick={() => { if (!guardandoBs) useUiStore.getState().guardarBsFn?.(); }}
                  disabled={guardandoBs || !bsPuedeGuardar}
                  aria-label="Guardar cambios"
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer"
                  style={{ background: guardandoBs ? '#64748b' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}
                >
                  {guardandoBs ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                </button>
              ) : tieneMuchasSucursales ? (
                <div className="shrink-0">
                  <button
                    ref={btnSucRef}
                    data-testid="btn-sucursal-bs-movil"
                    onClick={toggleDropdownSuc}
                    aria-label="Cambiar sucursal"
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white bg-white/10 border border-white/20 hover:bg-white/15 active:scale-95 cursor-pointer"
                  >
                    <Building2 className="w-5 h-5" />
                  </button>
                  {dropdownSucAbierto && sucPos && createPortal(
                    <>
                      <div className="fixed inset-0 z-[60]" onClick={() => setDropdownSucAbierto(false)} />
                      <div
                        className="fixed z-[61] bg-white rounded-xl shadow-lg border border-slate-200 min-w-[190px] overflow-hidden"
                        style={{ top: sucPos.top, right: sucPos.right }}
                      >
                        {sucursalesMobile.map((suc) => (
                          <button
                            key={suc.id}
                            onClick={() => {
                              setSucursalActiva(suc.id);
                              setEsSucursalPrincipal(suc.esPrincipal);
                              setDropdownSucAbierto(false);
                            }}
                            className={`w-full px-4 py-3 text-left text-base font-semibold flex items-center gap-2 ${
                              suc.id === usuario?.sucursalActiva ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full shrink-0 ${suc.esPrincipal ? 'bg-blue-500' : 'bg-slate-300'}`} />
                            <span className="truncate">{suc.nombre}</span>
                            {suc.id === usuario?.sucursalActiva && <span className="ml-auto text-blue-500 font-bold">✓</span>}
                          </button>
                        ))}
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer de módulos BS */}
      <DrawerBusinessStudio abierto={drawerBsAbierto} onCerrar={() => setDrawerBsAbierto(false)} />
    </>
  );
}

export default HeaderBusinessStudioMovil;
