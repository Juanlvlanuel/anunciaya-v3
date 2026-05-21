/**
 * sucursalOferta.ts
 * ===================
 * Helper para formatear el nombre visible de la sucursal en las cards y
 * modales de Ofertas — Sprint 9.3.
 *
 * Reglas (orden estricto):
 *   1. Sin `sucursalNombre` → `null` (no hay nada que mostrar).
 *   2. Sucursal MATRIZ (sucursalNombre === 'Principal' o coincide con
 *      `negocioNombre`):
 *        · `negocioTotalSucursales > 1` → `"Matriz"` (distingue la matriz
 *          de las demás sucursales del mismo negocio).
 *        · `negocioTotalSucursales <= 1` → `null` (negocio con un solo
 *          local; "Matriz" no aporta info porque no hay con qué
 *          contrastarla, y duplicar el nombre del negocio aburre la UI).
 *   3. Cualquier otra sucursal con nombre propio → el `sucursalNombre`
 *      tal cual ("Sucursal Norte", "Centro", etc.) — SIEMPRE se muestra
 *      independiente de cuántas sucursales tenga el negocio.
 *
 * IMPORTANTE: el tercer parámetro es `negocioTotalSucursales` (cuántas
 * sucursales tiene el negocio TOTAL), NO `totalSucursales` (cuántas
 * sucursales tienen esta oferta específica). Esa distinción es clave:
 * una oferta solo está en 1 sucursal (la matriz), pero si el negocio
 * tiene 3 sucursales en total, el usuario espera ver "Matriz" para
 * distinguirla de las otras 2 que no tienen esa oferta.
 *
 * Por qué detectar "Principal" como matriz: el backend por convención
 * inserta `sucursalNombre = 'Principal'` cuando el comerciante registra
 * su negocio (sucursal default). Al frontend le toca traducir ese label
 * técnico al lenguaje del usuario ("Matriz" suena más natural en MX).
 *
 * Centralizado aquí para que las 4 vistas de oferta (CardOfertaLista,
 * CardOfertaHero, CardOfertaCarrusel, ModalOfertaDetalle) usen la misma
 * regla y no diverjan.
 *
 * Ubicación: apps/web/src/utils/sucursalOferta.ts
 */

export function formatearSucursalLabel(
    sucursalNombre: string | null | undefined,
    negocioNombre: string | null | undefined,
    negocioTotalSucursales: number | null | undefined,
): string | null {
    if (!sucursalNombre) return null;

    const esMatriz =
        sucursalNombre === 'Principal' ||
        (negocioNombre != null && sucursalNombre === negocioNombre);

    if (esMatriz) {
        const total = negocioTotalSucursales ?? 1;
        return total > 1 ? 'Matriz' : null;
    }

    return sucursalNombre;
}
