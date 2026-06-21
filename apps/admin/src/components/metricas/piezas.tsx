/**
 * metricas/piezas.tsx
 * ===================
 * Piezas compartidas de la sección Métricas: formatos, cálculo de variación, paleta (tokens del
 * Panel para recharts), tarjeta KPI (con variación vs. periodo anterior), tarjeta de progreso
 * ("X de Y"), barra de ranking (top vendedores/ciudades), contenedor de gráfica y tooltip sobrio.
 *
 * Estética Tokens_Panel.md (B2B, neutro + 1 acento, sin círculos pastel; jerarquía por peso).
 *
 * Ubicación: apps/admin/src/components/metricas/piezas.tsx
 */

import type { ReactNode, ReactElement } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from 'lucide-react';
import { ResponsiveContainer } from 'recharts';
import type { KpiMetrica } from '../../services/metricasService';

// =============================================================================
// FORMATOS
// =============================================================================

export const FMT_NUM = new Intl.NumberFormat('es-MX');
export const FMT_MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
export const formatoValor = (n: number, tipo: 'numero' | 'moneda' | 'pct'): string =>
  tipo === 'moneda' ? FMT_MONEDA.format(n) : tipo === 'pct' ? `${n}%` : FMT_NUM.format(n);

/** Capitaliza la inicial de cada palabra (meses abreviados es-MX no llevan acento). */
const capMes = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Etiqueta corta del eje: 'YYYY-MM' → 'Jun'; 'YYYY-MM-DD' → '15 Jun'. */
export function etiquetaPunto(s: string): string {
  const p = s.split('-').map(Number);
  if (p.length === 3) {
    const [a, m, d] = p;
    if (!a || !m || !d) return s;
    return capMes(new Date(a, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', ''));
  }
  const [a, m] = p;
  if (!a || !m) return s;
  return capMes(new Date(a, m - 1, 1).toLocaleDateString('es-MX', { month: 'short' }).replace('.', ''));
}
/** Etiqueta larga del tooltip: 'YYYY-MM' → 'Jun 2026'; 'YYYY-MM-DD' → '15 Jun 2026'. */
export function etiquetaPuntoLargo(s: string): string {
  const p = s.split('-').map(Number);
  if (p.length === 3) {
    const [a, m, d] = p;
    if (!a || !m || !d) return s;
    return capMes(new Date(a, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', ''));
  }
  const [a, m] = p;
  if (!a || !m) return s;
  return capMes(new Date(a, m - 1, 1).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }).replace('.', ''));
}

// =============================================================================
// PALETA (tokens del Panel para recharts — acepta CSS vars en fill/stroke)
// =============================================================================

export const COLOR = {
  marca: 'var(--panel-brand)',
  marca2: 'var(--panel-brand-2)',
  ok: 'var(--panel-ok)',
  danger: 'var(--panel-danger)',
  gris: 'var(--panel-text-4)',
  grid: 'var(--panel-border)',
  eje: 'var(--panel-text-4)',
} as const;

export const EJE_PROPS = {
  tick: { fontSize: 12, fill: 'var(--panel-text-4)' },
  axisLine: { stroke: 'var(--panel-border)' },
  tickLine: false,
} as const;

/**
 * Props del eje X según la granularidad inferida de los puntos ('YYYY-MM' = mes · 'YYYY-MM-DD' = día):
 * en vista MENSUAL muestra TODAS las etiquetas (interval 0 → Jun, Jul, Ago…); en vista DIARIA deja que
 * recharts espacie (minTickGap) para no amontonar ~30 días.
 */
export function ejeXDe(puntos: { mes: string }[]) {
  const esMes = (puntos[0]?.mes?.length ?? 0) === 7;
  return esMes ? { ...EJE_PROPS, interval: 0 as const } : { ...EJE_PROPS, minTickGap: 18 };
}

/** Separación entre columnas (0 = barras pegadas, que llenan la banda del periodo). */
export const GAP_BARRAS = 0;

/**
 * Cursor de hover de las gráficas de barras: cubre la banda COMPLETA del periodo. Como las barras
 * llenan la banda (sin ancho fijo + gap 0), el resaltado coincide EXACTO con la barra.
 */
export function CursorBarra(props: { x?: number; y?: number; width?: number; height?: number }) {
  const { x = 0, y = 0, width = 0, height = 0 } = props;
  return <rect x={x} y={y} width={width} height={height} fill="var(--panel-brand-weak)" />;
}

// =============================================================================
// VARIACIÓN vs. periodo anterior
// =============================================================================

interface Variacion {
  pct: number;
  dir: 'up' | 'down' | 'flat';
}
function calcVariacion(kpi: KpiMetrica): Variacion | null {
  // Sin base de comparación (periodo anterior nulo o 0) no hay variación honesta: de 0 a N no es "100%".
  if (kpi.anterior === null || kpi.anterior === 0) return null;
  const delta = kpi.valor - kpi.anterior;
  const dir: Variacion['dir'] = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const pct = kpi.anterior > 0 ? Math.round((delta / kpi.anterior) * 100) : kpi.valor > 0 ? 100 : 0;
  return { pct, dir };
}

/** Color de la variación según el sentido del KPI ("subir es bueno" vs "subir es malo"). */
function colorVariacion(dir: Variacion['dir'], sentido: 'positivo' | 'negativo'): string {
  if (dir === 'flat') return 'var(--panel-text-4)';
  const bueno = sentido === 'positivo' ? dir === 'up' : dir === 'down';
  return bueno ? 'var(--panel-ok)' : 'var(--panel-danger)';
}

function ChipVariacion({ kpi, sentido }: { kpi: KpiMetrica; sentido: 'positivo' | 'negativo' }) {
  const v = calcVariacion(kpi);
  if (!v) return null;
  const Icono = v.dir === 'up' ? ArrowUpRight : v.dir === 'down' ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-0.5 text-[12.5px] font-semibold" style={{ color: colorVariacion(v.dir, sentido) }}>
      <Icono size={13} />
      {Math.abs(v.pct)}%
    </span>
  );
}

// =============================================================================
// TARJETA KPI
// =============================================================================

export function TarjetaKpi({
  icono: Icono,
  etiqueta,
  kpi,
  tipo = 'numero',
  sentido = 'positivo',
  acento,
  testid,
}: {
  icono: LucideIcon;
  etiqueta: string;
  kpi: KpiMetrica;
  tipo?: 'numero' | 'moneda' | 'pct';
  sentido?: 'positivo' | 'negativo';
  acento?: 'ok' | 'danger';
  testid?: string;
}) {
  const color = acento === 'ok' ? 'var(--panel-ok)' : acento === 'danger' ? 'var(--panel-danger)' : 'var(--panel-text)';
  return (
    <div
      data-testid={testid}
      className="flex flex-col gap-2.5 rounded-[14px] border border-borde bg-superficie p-4 shadow-tarjeta-panel lg:flex-row lg:items-start lg:gap-3.5 2xl:p-5"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-marca-suave text-marca">
        <Icono size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-texto-4 lg:truncate">{etiqueta}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-[24px] font-bold leading-none lg:text-[27px] 2xl:text-[30px]" style={{ color }}>
            {formatoValor(kpi.valor, tipo)}
          </span>
          <ChipVariacion kpi={kpi} sentido={sentido} />
        </span>
      </span>
    </div>
  );
}

// =============================================================================
// TARJETA DE PROGRESO ("X de Y" + barra)
// =============================================================================

export function TarjetaProgreso({
  icono: Icono,
  etiqueta,
  valor,
  total,
  testid,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor: number;
  total: number;
  testid?: string;
}) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  // Misma estructura/altura que TarjetaKpi (sin barra de progreso, que generaba aire): el "de N" y el
  // "%" van en línea con el valor.
  return (
    <div
      data-testid={testid}
      className="flex flex-col gap-2.5 rounded-[14px] border border-borde bg-superficie p-4 shadow-tarjeta-panel lg:flex-row lg:items-start lg:gap-3.5 2xl:p-5"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-marca-suave text-marca">
        <Icono size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-texto-4 lg:truncate">{etiqueta}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[24px] font-bold leading-none lg:text-[27px] 2xl:text-[30px]">{FMT_NUM.format(valor)}</span>
          <span className="text-[14px] font-semibold text-texto-3">de {FMT_NUM.format(total)}</span>
          <span className="text-[12.5px] font-semibold text-marca">· {pct}%</span>
        </span>
      </span>
    </div>
  );
}

// =============================================================================
// BARRA DE RANKING (top vendedores / ciudades — divs, más sobrio que un chart)
// =============================================================================

export function Ranking({
  titulo,
  items,
  vacioTexto,
  unidad,
  testid,
}: {
  titulo: string;
  items: { etiqueta: string; valor: number }[];
  vacioTexto: string;
  /** Sufijo del valor (ej. "negocios", "usuarios"). Opcional. */
  unidad?: string;
  testid?: string;
}) {
  const max = items.reduce((m, i) => Math.max(m, i.valor), 0) || 1;
  return (
    <section data-testid={testid} className="flex flex-col gap-3 rounded-[14px] border border-borde bg-superficie p-4 shadow-tarjeta-panel 2xl:p-5">
      <h3 className="text-[14px] font-semibold text-texto">{titulo}</h3>
      {items.length === 0 ? (
        <p className="py-4 text-center text-[12.5px] text-texto-4">{vacioTexto}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((it, i) => (
            <li
              key={it.etiqueta}
              className="relative flex items-center gap-3 overflow-hidden rounded-[10px] border border-borde px-2.5 py-2"
            >
              {/* Barra de fondo proporcional (no una línea suelta) */}
              <div className="absolute inset-y-0 left-0 bg-marca-suave" style={{ width: `${(it.valor / max) * 100}%` }} aria-hidden />
              {/* Posición */}
              <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-superficie text-[11px] font-bold text-texto-3 shadow-tarjeta-panel">
                {i + 1}
              </span>
              <span className="relative min-w-0 flex-1 truncate text-[13px] font-medium text-texto">{it.etiqueta}</span>
              <span className="relative shrink-0 text-[14px] font-bold tabular-nums text-texto">
                {FMT_NUM.format(it.valor)}
                {unidad && <span className="ml-1 text-[12.5px] font-medium text-texto-3">{unidad}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// =============================================================================
// CONTENEDOR DE GRÁFICA + TOOLTIP SOBRIO
// =============================================================================

export function GraficaCard({
  titulo,
  subtitulo,
  alto = 250,
  children,
  testid,
}: {
  titulo: string;
  subtitulo?: string;
  alto?: number;
  children: ReactNode;
  testid?: string;
}) {
  return (
    <section data-testid={testid} className="flex flex-col gap-3 rounded-[14px] border border-borde bg-superficie p-4 shadow-tarjeta-panel 2xl:p-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[14px] font-semibold text-texto">{titulo}</h3>
        {subtitulo && <p className="text-[12.5px] text-texto-3">{subtitulo}</p>}
      </div>
      <div style={{ width: '100%', height: alto }}>
        {/* ResponsiveContainer exige un único hijo (el chart). */}
        <ResponsiveContainer>{children as ReactElement}</ResponsiveContainer>
      </div>
    </section>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
  tipo?: 'numero' | 'moneda';
}

/** Tooltip de recharts con tokens del Panel. `label` viene como 'YYYY-MM' → se muestra legible. */
export function TooltipMetricas({ active, payload, label, tipo = 'numero' }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-[10px] border border-borde-fuerte bg-superficie px-3 py-2 shadow-pop-panel">
      <p className="mb-1 text-[12.5px] font-semibold text-texto">{label ? etiquetaPuntoLargo(label) : ''}</p>
      <ul className="flex flex-col gap-0.5">
        {payload.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-[12px] text-texto-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="flex-1">{p.name}</span>
            {/* Math.abs: en la gráfica divergente de altas/bajas, las bajas viajan en negativo. */}
            <span className="font-semibold tabular-nums text-texto">{formatoValor(Math.abs(Number(p.value ?? 0)), tipo)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
