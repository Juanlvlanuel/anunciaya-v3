/**
 * errores.ts
 * ==========
 * Traducción de errores de Postgres a errores de dominio — módulo PURO
 * (recibe el objeto de error ya capturado, no toca la BD), testeable sin
 * necesidad de una conexión real.
 *
 * Ubicación: apps/api/src/services/dinamicas/errores.ts
 */

/**
 * `dinamica_boletos_dinamica_numero_key` (UNIQUE en `dinamica_id, numero_boleto`)
 * es lo que de verdad evita que dos personas se queden con el mismo número de
 * boleto — a diferencia de `votos`, que solo valida con SELECT antes de
 * INSERT (condición de carrera real). Esta función detecta la violación
 * (código Postgres 23505, mismo patrón que `resenas.service.ts`) para que el
 * caller la traduzca a un mensaje de dominio en vez de un 500 genérico.
 */
export function esErrorBoletoDuplicado(error: unknown): boolean {
    return (error as { code?: string })?.code === '23505';
}
