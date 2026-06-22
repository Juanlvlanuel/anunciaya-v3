/**
 * presentacionPublicidad.ts
 * =========================
 * Etiquetas, colores y formateadores COMPARTIDOS entre la sección y la ficha de Publicidad.
 * Mantiene el texto/presentación en un solo lugar (calco de accionesAuditoria.ts).
 *
 * Ubicación: apps/admin/src/components/publicidad/presentacionPublicidad.ts
 */

export const CARRUSEL_LABEL: Record<string, string> = {
  anuncios: 'Anuncios',
  patrocinadores: 'Patrocinadores',
  fundadores: 'Fundadores',
};

export const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente de pago',
  activa: 'Activa',
  pausada: 'Pausada',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
};

/** Punto de color que precede al estado (acento discreto, no chip pastel — Regla 13 de tokens). */
export const ESTADO_DOT: Record<string, string> = {
  pendiente: 'bg-slate-300',
  activa: 'bg-emerald-500',
  pausada: 'bg-amber-500',
  expirada: 'bg-slate-400',
  cancelada: 'bg-rose-500',
};

export const ORIGEN_LABEL: Record<string, string> = {
  self: 'En línea',
  manual: 'Manual',
  cortesia: 'Cortesía',
};

const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** Monto (numeric → string del backend) a "$1,234.00". Cortesía / NULL → "—". */
export function fmtMonto(monto: string | null): string {
  if (monto == null) return '—';
  const n = Number(monto);
  return Number.isFinite(n) ? FMT_MONTO.format(n) : '—';
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** "21 Jun 2026" (sin hora). */
export function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Texto corto de los carruseles comprados (o "Combo · N"). */
export function textoCarruseles(carruseles: string[], esCombo: boolean): string {
  if (esCombo) return `Combo · ${carruseles.length}`;
  return carruseles.map((c) => CARRUSEL_LABEL[c] ?? c).join(' · ') || '—';
}
