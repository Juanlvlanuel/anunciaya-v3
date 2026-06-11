/**
 * membresia.ts
 * ============
 * Precio de la membresía comercial y su cálculo por periodo, compartido por los diálogos de
 * pago del Panel (Registrar pago / Editar pago).
 *
 * Hoy el precio es una CONSTANTE ($449/mes, igual que `PRECIO_COMERCIAL` en apps/web). Cuando
 * exista la sección Configuración/Suscripciones del Panel se leerá de ahí (un solo lugar que
 * cambiar). Promo del plan anual: 12 meses se cobran como 10 (2 gratis).
 *
 * Ubicación: apps/admin/src/components/negocios/membresia.ts
 */

/** Precio mensual de la membresía comercial (MXN). */
export const PRECIO_MEMBRESIA = 449;

/**
 * Precio sugerido para N meses (el operador puede ajustarlo a mano después).
 * - 12 meses → paga 10 (2 gratis): `PRECIO_MEMBRESIA * 10`.
 * - cualquier otro N → `PRECIO_MEMBRESIA * N`.
 * Devuelve 0 si N no es un entero ≥ 1.
 */
export function precioPorMeses(meses: number): number {
  if (!Number.isInteger(meses) || meses < 1) return 0;
  if (meses === 12) return PRECIO_MEMBRESIA * 10;
  return PRECIO_MEMBRESIA * meses;
}
