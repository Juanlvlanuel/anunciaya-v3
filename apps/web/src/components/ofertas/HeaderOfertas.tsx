/**
 * HeaderOfertas.tsx
 * ==================
 * Header de identidad de la sección Ofertas — replica el patrón visual
 * de Negocios / CardYA / Mis Guardados (panel negro `#000` con glow radial
 * y grid pattern), con identidad propia blanco/negro + acento ámbar.
 *
 * Layout (alineado al header del MarketPlace):
 *  - Desktop: una sola fila — Logo + título / Chips situacionales (centro,
 *    scroll horizontal si no caben) / KPI compacto.
 *  - Móvil: fila principal con buscador inline + segunda fila de chips
 *    (scroll horizontal).
 *
 * IMPORTANTE: este componente NO incluye el wrapper `lg:max-w-7xl` —
 * lo aporta el padre (`PaginaOfertas`) para que el header siga la misma
 * regla de ancho que el resto del feed (consistente con Negocios).
 *
 * Ubicación: apps/web/src/components/ofertas/HeaderOfertas.tsx
 */

import { useRef, useState } from 'react';
import {
  ChevronLeft,
  Menu,
  Search,
  Tag,
  X,
  CalendarDays,
  Locate,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';
import { useNotificacionesStore } from '@/stores/useNotificacionesStore';
import { IconoMenuMorph } from '@/components/ui/IconoMenuMorph';
// El tipo aceptable abarca tanto LucideIcon como los wrappers de Iconify.
type IconoComponente = React.ComponentType<{ className?: string; strokeWidth?: number; fill?: string }>;

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const Eye = (p: IconoWrapperProps) => <Icon icon={ICONOS.vistas} {...p} />;
const Calendar = (p: IconoWrapperProps) => <Icon icon={ICONOS.fechas} {...p} />;
import { useNavigate } from 'react-router-dom';
import { useVolverAtras } from '../../hooks/useVolverAtras';
import { useSearchStore } from '@/stores/useSearchStore';
import { useUiStore } from '@/stores/useUiStore';
import {
  useFiltrosOfertasStore,
  type ChipSituacional,
} from '@/stores/useFiltrosOfertasStore';

interface HeaderOfertasProps {
  totalOfertas: number;
  ciudad: string;
}

// Chips situacionales visibles (orden alineado a MarketPlace y Negocios).
// Default activo: 'recientes'. El chip 'mas_vistas' antes era un CTA blanco
// destacado; ahora es un chip más en la fila para mantener uniformidad.
const CHIPS: { id: ChipSituacional; label: string; icono?: IconoComponente }[] = [
  { id: 'recientes', label: 'Recientes', icono: Clock },
  { id: 'mas_vistas', label: 'Más vistos', icono: Eye },
  { id: 'cerca', label: 'Cerca de ti', icono: Locate },
  { id: 'hoy', label: 'Hoy', icono: Calendar },
  { id: 'esta_semana', label: 'Esta semana', icono: CalendarDays },
];

export default function HeaderOfertas({
  totalOfertas,
  ciudad,
}: HeaderOfertasProps) {
  const navigate = useNavigate();
  // Botón ← respeta historial (flecha nativa móvil) con fallback a /inicio.
  const handleVolver = useVolverAtras('/inicio');
  const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
  const abrirBuscador = useSearchStore((s) => s.abrirBuscador);
  void abrirBuscador; // reservado: dispara el OverlayBuscadorOfertas cuando exista (ver pendiente #8)

  // Buscador móvil inline (mismo patrón visual que Negocios). El input es
  // local por ahora; cuando exista OverlayBuscadorOfertas se conectará al
  // useSearchStore global.
  const [buscadorMovilAbierto, setBuscadorMovilAbierto] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const inputBusquedaMovilRef = useRef<HTMLInputElement>(null);
  const handleAbrirBuscadorMovil = () => {
    setBuscadorMovilAbierto(true);
    setTimeout(() => inputBusquedaMovilRef.current?.focus(), 100);
  };
  const handleCerrarBuscadorMovil = () => {
    setBusquedaLocal('');
    setBuscadorMovilAbierto(false);
  };
  const chipActivo = useFiltrosOfertasStore((s) => s.chipActivo);
  const setChipActivo = useFiltrosOfertasStore((s) => s.setChipActivo);

  // Notificaciones — botón Bell en el header móvil (entre buscar y menú).
  const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
  const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);

  const ciudadUpper = (ciudad || '').toUpperCase();

  return (
    <div
      data-testid="header-ofertas"
      className="relative overflow-hidden rounded-none"
      style={{ background: '#000000' }}
    >
      {/* Glow ámbar dinámico — identidad de Ofertas (asociación universal */}
      {/* con "rebajas/promo": Black Friday, Cyber Monday, descuentos).     */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 85% 20%, rgba(245,158,11,0.10) 0%, transparent 50%)',
        }}
      />
      {/* Grid pattern sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.08,
          backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                            repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
        }}
      />

      <div className="relative z-10">
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MOBILE HEADER                                                  */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden">
          {!buscadorMovilAbierto ? (
            /* Fila principal: ChevronLeft + Logo + Título + Buscar + Menu */
            <div className="flex items-center justify-between gap-1 px-2 pt-4 pb-2.5">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <button
                  data-testid="btn-volver-ofertas"
                  onClick={handleVolver}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  }}
                >
                  <Tag className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="flex flex-col leading-none min-w-0 ml-1.5">
                  <span className="text-2xl font-extrabold text-white tracking-tight">
                    Ofertas
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                    Locales
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  data-testid="btn-buscar-ofertas"
                  onClick={handleAbrirBuscadorMovil}
                  aria-label="Buscar ofertas"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <Search className="w-6 h-6 animate-pulse" strokeWidth={2.5} />
                </button>
                <button
                  data-testid="btn-notificaciones-ofertas"
                  onClick={(e) => { e.currentTarget.blur(); togglePanelNotificaciones(); }}
                  aria-label="Notificaciones"
                  className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <Bell className="w-6 h-6 animate-bell-ring" strokeWidth={2.5} />
                  {cantidadNoLeidas > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                      {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                    </span>
                  )}
                </button>
                <button
                  data-testid="btn-menu-ofertas"
                  onClick={abrirMenuDrawer}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                >
                  <IconoMenuMorph />
                </button>
              </div>
            </div>
          ) : (
            /* Buscador activo: input expandido + X (mismo patrón que Negocios) */
            <div className="flex items-center gap-2.5 px-3 pt-4 pb-2.5">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-white/40" />
                <input
                  ref={inputBusquedaMovilRef}
                  data-testid="input-buscar-ofertas"
                  type="text"
                  value={busquedaLocal}
                  onChange={(e) => setBusquedaLocal(e.target.value)}
                  placeholder="Buscar ofertas..."
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full rounded-full bg-white/15 py-2 pl-10 pr-10 text-lg text-white placeholder-white/40 outline-none"
                />
                {busquedaLocal.trim() && (
                  <button
                    onClick={() => { setBusquedaLocal(''); inputBusquedaMovilRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/25 transition-colors hover:bg-white/40"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
              <button
                onClick={handleCerrarBuscadorMovil}
                aria-label="Cerrar buscador"
                className="shrink-0 cursor-pointer rounded-full p-0.5 text-white/80 hover:bg-white/20"
              >
                <X className="h-7 w-7" />
              </button>
            </div>
          )}

          {/* Subtítulo móvil decorativo */}
          <div className="pb-2 overflow-hidden">
            <div className="flex items-center justify-center gap-2.5">
              <div
                className="h-0.5 w-14 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(245,158,11,0.7))',
                }}
              />
              <span className="text-base font-light text-white/70 tracking-wide whitespace-nowrap">
                {ciudadUpper ? (
                  <>
                    En <span className="font-bold text-white">{ciudad}</span> ·{' '}
                    {totalOfertas} ofertas
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white">{totalOfertas}</span> ofertas
                  </>
                )}
              </span>
              <div
                className="h-0.5 w-14 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(245,158,11,0.7), transparent)',
                }}
              />
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* DESKTOP HEADER — Una sola fila para igualar alto del de MP.    */}
        {/* Logo + Título a la izq · Chips centro · KPI derecha.           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:block">
          <div className="flex items-center justify-between gap-4 px-6 py-4 2xl:px-8 2xl:py-5">
            {/* Bloque izquierdo: flecha + logo + título (agrupados) */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Flecha ← regresar al inicio (solo desktop) */}
              <button
                data-testid="btn-volver-ofertas-desktop"
                onClick={handleVolver}
                aria-label="Volver al inicio"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              {/* Logo */}
              <div
                className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-lg flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                }}
              >
                <Tag
                  className="w-6 h-6 2xl:w-6.5 2xl:h-6.5 text-white"
                  strokeWidth={2.5}
                />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl 2xl:text-3xl font-extrabold text-white tracking-tight">
                  Ofertas
                </span>
                <span className="text-2xl 2xl:text-3xl font-extrabold text-amber-400 tracking-tight">
                  Locales
                </span>
              </div>
            </div>

            {/* Spacer para empujar chips + KPI a la derecha */}
            <div className="flex-1" />

            {/* Derecha: chips de filtros + KPI dos líneas (alineado a Negocios/MP) */}
            <div className="min-w-0 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {CHIPS.map(({ id, label, icono: Icono }) => {
                  const activo = chipActivo === id;
                  return (
                    <button
                      key={id}
                      data-testid={`chip-situacional-${id}`}
                      onClick={() => setChipActivo(id)}
                      className={[
                        'shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer border-2 whitespace-nowrap',
                        activo
                          ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-white/5 text-slate-200 border-white/15 hover:bg-white/10 hover:text-white hover:border-amber-400/60',
                      ].join(' ')}
                    >
                      {Icono && <Icono className="w-4 h-4" strokeWidth={2.5} />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Derecha: KPI dos líneas — mismo patrón que Negocios.
                Número grande arriba, label en color de marca abajo. */}
            <div className="flex flex-col items-end shrink-0">
              <span
                data-testid="kpi-total-ofertas"
                className="text-3xl 2xl:text-[40px] font-extrabold text-white leading-none tabular-nums"
              >
                {totalOfertas}
              </span>
              <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-amber-400/80 uppercase tracking-wider mt-1">
                Ofertas
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MÓVIL — Fila de CTAs + chips situacionales                     */}
        {/* En desktop estos chips ya viven dentro del header (fila 1).     */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="px-3 pb-3 lg:hidden">
          <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {CHIPS.map(({ id, label, icono: Icono }) => {
              const activo = chipActivo === id;
              return (
                <button
                  key={id}
                  data-testid={`chip-situacional-movil-${id}`}
                  onClick={() => setChipActivo(id)}
                  className={[
                    'shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer border-2 whitespace-nowrap',
                    activo
                      ? 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-white/5 text-slate-200 border-white/15 hover:bg-white/10 hover:text-white hover:border-amber-400/60',
                  ].join(' ')}
                >
                  {Icono && <Icono className="w-4 h-4" strokeWidth={2.5} />}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
