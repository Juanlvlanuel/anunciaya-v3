/**
 * membresia.ts
 * ============
 * Precio de la membresía comercial y su cálculo por periodo, compartido por los diálogos de
 * pago del Panel (Registrar pago / Editar pago).
 *
 * El precio mensual sale de la config del sistema (`precio_membresia_mxn`) vía el hook
 * `usePrecioMembresia`; los diálogos se lo pasan a `precioPorMeses` como `precioBase`. La constante
 * `PRECIO_MEMBRESIA` queda solo como fallback si la config aún no cargó. Promo del plan anual: 12
 * meses se cobran como 10 (2 gratis).
 *
 * Ubicación: apps/admin/src/components/negocios/membresia.ts
 */

/** Precio mensual de la membresía comercial (MXN) — fallback si la config aún no cargó. */
export const PRECIO_MEMBRESIA = 849;

/**
 * Precio sugerido para N meses (el operador puede ajustarlo a mano después).
 * - 12 meses → paga 10 (2 gratis): `precioBase * 10`.
 * - cualquier otro N → `precioBase * N`.
 * `precioBase` sale de la config del sistema (usePrecioMembresia); cae a PRECIO_MEMBRESIA si no se pasa.
 * Devuelve 0 si N no es un entero ≥ 1.
 */
export function precioPorMeses(meses: number, precioBase: number = PRECIO_MEMBRESIA): number {
  if (!Number.isInteger(meses) || meses < 1) return 0;
  if (meses === 12) return precioBase * 10;
  return precioBase * meses;
}
