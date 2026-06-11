/**
 * estadoEvento.tsx
 * ================
 * Metadatos + badge del TIPO de evento de la bitácora financiera. Calcado de
 * `negocios/estadoPago.tsx`: ícono/punto de color + etiqueta neutra (Regla 13,
 * sobrio, sin pastel saturado). Compartido por la tabla, las cards y la ficha.
 *
 * Ubicación: apps/admin/src/components/suscripciones/estadoEvento.tsx
 */

import { CheckCircle2, XCircle, Ban, Receipt, type LucideIcon } from 'lucide-react';

export interface MetaTipoEvento {
  etiqueta: string;
  /** Color del ícono/acento. Variables del tema del Panel. */
  color: string;
  icono: LucideIcon;
}

export const TIPO_EVENTO_META: Record<string, MetaTipoEvento> = {
  cobro_exitoso: { etiqueta: 'Cobro exitoso', color: 'var(--panel-ok)', icono: CheckCircle2 },
  cobro_fallido: { etiqueta: 'Cobro fallido', color: 'var(--panel-danger)', icono: XCircle },
  pago_manual: { etiqueta: 'Pago manual', color: 'var(--panel-brand)', icono: Receipt },
  cancelacion: { etiqueta: 'Cancelación', color: 'var(--panel-text-4)', icono: Ban },
};

/** Tipos para el filtro (incluye "Todos" como opción vacía en el componente). */
export const TIPOS_EVENTO_FILTRO = [
  { valor: 'cobro_exitoso', etiqueta: 'Cobro exitoso' },
  { valor: 'cobro_fallido', etiqueta: 'Cobro fallido' },
  { valor: 'pago_manual', etiqueta: 'Pago manual' },
  { valor: 'cancelacion', etiqueta: 'Cancelación' },
] as const;

export function metaTipoEvento(valor: string): MetaTipoEvento {
  return TIPO_EVENTO_META[valor] ?? { etiqueta: valor, color: 'var(--panel-text-4)', icono: Receipt };
}

/** Badge tipo pill: fondo tenue del color del tipo + ícono + etiqueta. */
export function BadgeTipoEvento({ tipo, small }: { tipo: string; small?: boolean }) {
  const meta = metaTipoEvento(tipo);
  const Icono = meta.icono;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'
      }`}
      style={{ background: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color }}
    >
      <Icono size={small ? 12 : 13} className="shrink-0" />
      {meta.etiqueta}
    </span>
  );
}

/** Chip sobrio del origen del evento (Stripe automático / Manual registrado). */
export function ChipOrigen({ origen }: { origen: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2 py-0.5 text-[11px] font-medium text-texto-3 whitespace-nowrap">
      <span
        className="h-[6px] w-[6px] shrink-0 rounded-full"
        style={{ background: origen === 'stripe' ? 'var(--panel-brand)' : 'var(--panel-text-4)' }}
      />
      {origen === 'stripe' ? 'Stripe' : 'Manual'}
    </span>
  );
}
