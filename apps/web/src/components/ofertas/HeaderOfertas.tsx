/**
 * HeaderOfertas.tsx
 * ==================
 * Header de identidad de la sección Ofertas — replica el patrón visual
 * de Negocios / CardYA / Mis Guardados (panel negro `#000` con glow radial
 * y grid pattern), con identidad propia blanco/negro (sin acento de color).
 *
 * Lógica de compresión al scroll (Prompt 5):
 *  - Estado normal (al cargar / scroll arriba): logo + título + subtítulo
 *    decorativo + CTAs + KPI.
 *  - Estado comprimido (scroll > 80px): solo logo + título + KPI; el
 *    subtítulo central, las líneas decorativas y los CTAs desaparecen
 *    (con transición opacity + max-height).
 *
 * IMPORTANTE: este componente NO incluye el wrapper `lg:max-w-7xl` —
 * lo aporta el padre (`PaginaOfertas`) para que el header siga la misma
 * regla de ancho que el resto del feed (consistente con Negocios).
 *
 * Lee `scrollY` del `mainScrollRef` global (en móvil el scroll vive
 * dentro del `<main>`, no en `window`).
 *
 * Ubicación: apps/web/src/components/ofertas/HeaderOfertas.tsx
 */

import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Menu,
  Tag,
  Zap,
  Calendar,
  CalendarDays,
  Locate,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { useMainScrollStore } from '@/stores/useMainScrollStore';
import { useUiStore } from '@/stores/useUiStore';
import {
  useFiltrosOfertasStore,
  type ChipSituacional,
} from '@/stores/useFiltrosOfertasStore';

interface HeaderOfertasProps {
  totalOfertas: number;
  ciudad: string;
  /** Activa el filtro `mas_vistas`. Se dispara desde el CTA "Lo más visto"
   *  (no hay chip visual de "Más vistas" para evitar duplicación). */
  onClickMasVistas: () => void;
}

// Chips situacionales visibles. NOTA: `mas_vistas` se activa SOLO desde
// el CTA primario "Lo más visto" (no aparece como chip para no duplicar).
const CHIPS: { id: ChipSituacional; label: string; icono?: LucideIcon }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'hoy', label: 'Hoy', icono: Calendar },
  { id: 'esta_semana', label: 'Esta semana', icono: CalendarDays },
  { id: 'cerca', label: 'Cerca', icono: Locate },
  { id: 'cardya', label: 'CardYA', icono: CreditCard },
  { id: 'nuevas', label: 'Nuevas', icono: Sparkles },
];

// Histéresis para evitar parpadeo en scrolls oscilantes alrededor del umbral.
// Entrar a comprimido al pasar `ENTRAR`; volver a expandido solo al bajar
// debajo de `SALIR`. En el rango intermedio no cambia el estado.
const SCROLL_ENTRAR_COMPRIMIDO = 100;
const SCROLL_SALIR_COMPRIMIDO = 40;

export default function HeaderOfertas({
  totalOfertas,
  ciudad,
  onClickMasVistas,
}: HeaderOfertasProps) {
  const navigate = useNavigate();
  const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
  const chipActivo = useFiltrosOfertasStore((s) => s.chipActivo);
  const setChipActivo = useFiltrosOfertasStore((s) => s.setChipActivo);
  const vistaExpandida = useFiltrosOfertasStore((s) => s.vistaExpandida);
  const toggleVistaExpandida = useFiltrosOfertasStore((s) => s.toggleVistaExpandida);

  // Lectura del scroll real (compatible con móvil donde scroll vive en <main>)
  const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);
  const { scrollY } = useScrollDirection({
    scrollRef: mainScrollRef ?? undefined,
    threshold: 1,
    topOffset: 0,
  });

  // Estado controlado por histéresis (no por simple comparación con un único
  // threshold — eso causaba parpadeo cuando el usuario oscilaba alrededor).
  const [comprimido, setComprimido] = useState(false);
  useEffect(() => {
    if (!comprimido && scrollY > SCROLL_ENTRAR_COMPRIMIDO) {
      setComprimido(true);
    } else if (comprimido && scrollY < SCROLL_SALIR_COMPRIMIDO) {
      setComprimido(false);
    }
  }, [scrollY, comprimido]);

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
          {/* Fila principal: ChevronLeft + Logo + Título + Menu */}
          <div
            className={[
              'flex items-center justify-between px-3 transition-[padding] duration-300',
              comprimido ? 'pt-2.5 pb-2' : 'pt-4 pb-2.5',
            ].join(' ')}
          >
            <div className="flex items-center gap-1.5 shrink-0 min-w-0">
              <button
                data-testid="btn-volver-ofertas"
                onClick={() => navigate('/inicio')}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <div
                className={[
                  'rounded-lg flex items-center justify-center shrink-0 transition-all duration-300',
                  comprimido ? 'w-7 h-7' : 'w-9 h-9',
                ].join(' ')}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                }}
              >
                <Tag
                  className={[
                    'text-white transition-all duration-300',
                    comprimido ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5',
                  ].join(' ')}
                  strokeWidth={2.5}
                />
              </div>
              <span
                className={[
                  'font-extrabold text-white tracking-tight truncate transition-all duration-300',
                  comprimido ? 'text-base' : 'text-2xl',
                ].join(' ')}
              >
                Ofertas <span className="text-amber-400">Locales</span>
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {comprimido && (
                <span className="text-[10px] tracking-[1px] text-white/55 font-medium uppercase mr-1">
                  {totalOfertas} HOY
                </span>
              )}
              <button
                data-testid="btn-menu-ofertas"
                onClick={abrirMenuDrawer}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              >
                <Menu className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Subtítulo móvil decorativo — desaparece al comprimir */}
          <div
            className={[
              'transition-[opacity,max-height,padding] duration-300 overflow-hidden',
              comprimido
                ? 'opacity-0 max-h-0 pb-0 pointer-events-none'
                : 'opacity-100 max-h-12 pb-2',
            ].join(' ')}
            aria-hidden={comprimido}
          >
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
                    {totalOfertas} hoy
                  </>
                ) : (
                  <>
                    <span className="font-bold text-white">{totalOfertas}</span> ofertas hoy
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
        {/* DESKTOP HEADER                                                 */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="hidden lg:block">
          <div
            className={[
              'flex items-center justify-between gap-6 px-6 2xl:px-8 transition-[padding] duration-300',
              comprimido ? 'py-3' : 'py-4 2xl:py-5',
            ].join(' ')}
          >
            {/* Logo + Título */}
            <div className="flex items-center gap-3 shrink-0">
              <div
                className={[
                  'rounded-lg flex items-center justify-center transition-all duration-300',
                  comprimido ? 'w-10 h-10' : 'w-11 h-11 2xl:w-12 2xl:h-12',
                ].join(' ')}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                }}
              >
                <Tag
                  className={[
                    'text-white transition-all duration-300',
                    comprimido ? 'w-5 h-5' : 'w-6 h-6 2xl:w-6.5 2xl:h-6.5',
                  ].join(' ')}
                  strokeWidth={2.5}
                />
              </div>
              <div className="flex items-baseline">
                <span
                  className={[
                    'font-extrabold text-white tracking-tight transition-all duration-300',
                    comprimido ? 'text-2xl' : 'text-2xl 2xl:text-3xl',
                  ].join(' ')}
                >
                  Ofertas{' '}
                </span>
                <span
                  className={[
                    'font-extrabold text-amber-400 tracking-tight transition-all duration-300',
                    comprimido ? 'text-2xl' : 'text-2xl 2xl:text-3xl',
                  ].join(' ')}
                >
                  Locales
                </span>
              </div>
            </div>

            {/* Centro: subtítulo decorativo (oculto al comprimir) */}
            <div
              className={[
                'flex-1 text-center min-w-0 transition-[opacity,max-height] duration-300 overflow-hidden',
                comprimido
                  ? 'opacity-0 max-h-0 pointer-events-none'
                  : 'opacity-100 max-h-24',
              ].join(' ')}
              aria-hidden={comprimido}
            >
              <h1 className="text-3xl 2xl:text-[34px] font-light text-white/70 leading-tight truncate">
                Las ofertas en{' '}
                <span className="font-bold text-white">
                  {ciudad || 'tu ciudad'}
                </span>
              </h1>
              <div className="flex items-center justify-center gap-3 mt-1.5">
                <div
                  className="h-0.5 w-20 2xl:w-24 rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent, rgba(245,158,11,0.7))',
                  }}
                />
                <span className="text-sm 2xl:text-base font-semibold text-amber-400/80 uppercase tracking-[3px]">
                  descuentos cerca de ti
                </span>
                <div
                  className="h-0.5 w-20 2xl:w-24 rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(245,158,11,0.7), transparent)',
                  }}
                />
              </div>
            </div>

            {/* KPI desktop — solo total. La ciudad se muestra dentro del   */}
            {/* subtítulo central porque tener una columna fija con la      */}
            {/* ciudad truncaba textos largos como "Puerto Peñasco".       */}
            {comprimido ? (
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span
                  data-testid="kpi-total-ofertas"
                  className="text-2xl font-extrabold text-white leading-none tabular-nums"
                >
                  {totalOfertas}
                </span>
                <span className="text-sm font-semibold text-amber-400/80 uppercase tracking-wider">
                  Ofertas
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-end shrink-0">
                <span
                  data-testid="kpi-total-ofertas"
                  className="text-3xl 2xl:text-[40px] font-extrabold text-white leading-none tabular-nums"
                >
                  {totalOfertas}
                </span>
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-amber-400/80 uppercase tracking-wider mt-1">
                  Ofertas hoy
                </span>
              </div>
            )}
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* FILA ÚNICA: CTAs + CHIPS SITUACIONALES                          */}
        {/* Siempre visibles, dentro del header negro. Scroll horizontal   */}
        {/* cuando no caben (igual al patrón de Negocios variante inline). */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="px-3 lg:px-6 2xl:px-8 pb-3 lg:pb-4">
          <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 lg:mx-0 lg:px-0 lg:justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {/* CTA primario: Lo más visto (filtra por popularidad).         */}
            {/* Reemplaza al chip "Más vistas" que se eliminó para no duplicar.*/}
            <button
              data-testid="btn-header-mas-vistas"
              onClick={onClickMasVistas}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full py-2 px-3.5 bg-white text-[#1a1a1a] text-[13px] font-semibold hover:bg-white/90 cursor-pointer transition-colors whitespace-nowrap shadow-md shadow-white/30"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
              Lo más visto
            </button>

            {/* Separador visual sutil entre acción y filtros */}
            <div className="shrink-0 w-px h-6 bg-white/15 mx-1" />

            {/* Chips situacionales — estilo Negocios variante inline.
                CASO ESPECIAL "Todas": no es un filtro normal — su estado
                "activo" depende de `vistaExpandida` (vista catálogo grid).
                Click en "Todas" alterna el modo expandido. Click en cualquier
                otro chip resetea expandido a false (vía store). */}
            {CHIPS.map(({ id, label, icono: Icono }) => {
              const esTodas = id === 'todas';
              const activo = esTodas ? vistaExpandida : chipActivo === id;
              return (
                <button
                  key={id}
                  data-testid={`chip-situacional-${id}`}
                  onClick={() => {
                    if (esTodas) toggleVistaExpandida();
                    else setChipActivo(id);
                  }}
                  className={[
                    'shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all cursor-pointer border whitespace-nowrap',
                    activo
                      ? 'bg-white text-slate-900 border-white shadow-md shadow-white/30'
                      : 'bg-white/10 text-white/70 border-white/15 hover:bg-white/20 hover:text-white hover:border-white/30',
                  ].join(' ')}
                >
                  {Icono && <Icono className="w-3.5 h-3.5" />}
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
