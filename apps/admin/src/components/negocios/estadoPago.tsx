/**
 * estadoPago.tsx
 * ===============
 * Metadatos y badge del "estado de pago" del negocio (= estado_membresia, que
 * gobiernan Stripe y el cron de gracia). Sobrio por Regla 13: un punto de color
 * + etiqueta neutra (sin pastel saturado). Compartido por la tabla y la ficha.
 *
 * Ubicación: apps/admin/src/components/negocios/estadoPago.tsx
 */

export interface MetaEstado {
  etiqueta: string;
  /** Color del punto. Usa variables del tema cuando existen; ámbar fijo para gracia. */
  color: string;
}

export const ESTADO_PAGO_META: Record<string, MetaEstado> = {
  al_corriente: { etiqueta: 'Al corriente', color: 'var(--panel-ok)' },
  en_gracia: { etiqueta: 'En gracia', color: '#d9920a' },
  suspendido: { etiqueta: 'Suspendido', color: 'var(--panel-danger)' },
  cancelado: { etiqueta: 'Cancelado', color: 'var(--panel-text-4)' },
  // Alta anticipada: negocio afiliado a un paquete pero con la membresía sin iniciar (activo=false).
  promo_pendiente: { etiqueta: 'Pendiente de activación', color: '#d9920a' },
};

/** Estados para el filtro (incluye "Todos" como opción vacía en el componente). */
export const ESTADOS_PAGO_FILTRO = [
  { valor: 'al_corriente', etiqueta: 'Al corriente' },
  { valor: 'en_gracia', etiqueta: 'En gracia' },
  { valor: 'suspendido', etiqueta: 'Suspendido' },
  { valor: 'cancelado', etiqueta: 'Cancelado' },
] as const;

export function metaEstado(valor: string): MetaEstado {
  return ESTADO_PAGO_META[valor] ?? { etiqueta: valor, color: 'var(--panel-text-4)' };
}

/**
 * Estado EFECTIVO para chips/badge: el eje administrativo manda sobre el de pago.
 * archivado→'cancelado', suspendido(admin)→'suspendido'; si está activo a nivel
 * admin, vale su estado de pago. (Debe coincidir con ESTADO_EFECTIVO del backend.)
 */
export function estadoEfectivo(estadoAdmin: string, estadoPago: string): string {
  if (estadoAdmin === 'archivado') return 'cancelado';
  if (estadoAdmin === 'suspendido') return 'suspendido';
  return estadoPago;
}

/** Badge tipo pill: fondo tenue del color del estado + punto + etiqueta. */
export function BadgeEstadoPago({ estado, small }: { estado: string; small?: boolean }) {
  const meta = metaEstado(estado);
  return (
    <span
      className={`txt-badge inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'
      }`}
      style={{ background: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color }}
    >
      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: meta.color }} />
      {meta.etiqueta}
    </span>
  );
}
