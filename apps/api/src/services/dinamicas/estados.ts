/**
 * estados.ts
 * ==========
 * Máquina de estados de una Dinámica — módulo PURO, sin dependencia de BD,
 * para que sea testeable directo (mismo criterio que
 * `services/marketplace/filtros.ts`).
 *
 * Ciclo de vida (docs/kit-dinamicas/Contexto_Dinamicas.md):
 *   borrador → activa ⇄ pospuesta → en_sorteo → cerrada
 *   (cancelada posible desde borrador, activa o pospuesta)
 *
 * `en_sorteo`/`cerrada` son de Fase 4 (motor de sorteo) — se declaran aquí
 * para que el guard rechace correctamente "cancelar" una vez que el sorteo
 * ya arrancó, aunque esta fase todavía no expone cómo LLEGAR a esos estados.
 *
 * NOTA de alcance: no existe una transición `pospuesta → activa` explícita
 * (no se pidió una acción "reactivar" separada) — posponer es idempotente
 * desde `activa` o `pospuesta`, siempre aterriza en `pospuesta` con la nueva
 * fecha. Si más adelante se quiere "reactivar" sin posponer, es un cambio
 * de alcance a discutir, no algo que esta fase decidió por su cuenta.
 *
 * Ubicación: apps/api/src/services/dinamicas/estados.ts
 */

export type EstadoDinamica =
    | 'borrador'
    | 'activa'
    | 'pospuesta'
    | 'en_sorteo'
    | 'cerrada'
    | 'cancelada';

export const TRANSICIONES_VALIDAS: Record<EstadoDinamica, EstadoDinamica[]> = {
    borrador: ['activa', 'cancelada'],
    activa: ['pospuesta', 'en_sorteo', 'cancelada'],
    pospuesta: ['pospuesta', 'en_sorteo', 'cancelada'],
    en_sorteo: ['cerrada'],
    cerrada: [],
    cancelada: [],
};

export function puedeTransicionar(actual: EstadoDinamica, nuevo: EstadoDinamica): boolean {
    return TRANSICIONES_VALIDAS[actual]?.includes(nuevo) ?? false;
}
