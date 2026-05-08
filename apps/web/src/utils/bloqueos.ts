/**
 * Utilidades para verificación de bloqueos de chat.
 *
 * Reglas:
 *  - Chat persona ↔ persona: aplica bloqueo de tipo 'usuario' en cualquier
 *    dirección (si yo lo bloqueé o él me bloqueó).
 *  - Chat persona ↔ sucursal: aplica bloqueo de tipo 'sucursal' (solo si yo
 *    bloqueé esa sucursal específica). Bloquear a la persona dueña NO afecta
 *    a sus negocios — son entradas independientes en BD.
 *
 * Ubicación: apps/web/src/utils/bloqueos.ts
 */

import type { Conversacion, UsuarioBloqueado } from '../types/chatya';

/**
 * Determina si una conversación está bloqueada para el usuario actual.
 * Solo evalúa bloqueos que YO hice; el bloqueo bidireccional persona-persona
 * se aplica en backend, pero el indicador visual frontend muestra el estado
 * propio. Si quisiéramos diferenciar "me bloquearon", necesitaríamos otro
 * endpoint — en v1 no aplica.
 */
export function conversacionBloqueada(
    conv: Pick<
        Conversacion,
        | 'otroParticipante'
        | 'participante1Id'
        | 'participante2Id'
        | 'participante1Modo'
        | 'participante2Modo'
        | 'participante1SucursalId'
        | 'participante2SucursalId'
    >,
    miId: string | null,
    bloqueados: UsuarioBloqueado[],
): boolean {
    if (!miId) return false;

    const esMiP1 = conv.participante1Id === miId;
    const otroModo = esMiP1 ? conv.participante2Modo : conv.participante1Modo;
    const otroSucursalId = esMiP1
        ? conv.participante2SucursalId
        : conv.participante1SucursalId;
    const otroId = conv.otroParticipante?.id;

    // Chat con sucursal (modo comercial + sucursalId)
    if (otroModo === 'comercial' && otroSucursalId) {
        return bloqueados.some(
            (b) => b.tipo === 'sucursal' && b.sucursalId === otroSucursalId,
        );
    }

    // Chat persona ↔ persona
    if (otroId) {
        return bloqueados.some(
            (b) => b.tipo === 'usuario' && b.bloqueadoId === otroId,
        );
    }

    return false;
}

/**
 * Devuelve true si la conversación es con un negocio (sucursal en modo
 * comercial), false si es persona ↔ persona.
 */
export function esConversacionConNegocio(
    conv: Pick<
        Conversacion,
        | 'otroParticipante'
        | 'participante1Id'
        | 'participante2Id'
        | 'participante1Modo'
        | 'participante2Modo'
        | 'participante1SucursalId'
        | 'participante2SucursalId'
    >,
    miId: string | null,
): boolean {
    if (!miId) return !!conv.otroParticipante?.negocioNombre;
    const esMiP1 = conv.participante1Id === miId;
    const otroModo = esMiP1 ? conv.participante2Modo : conv.participante1Modo;
    const otroSucursalId = esMiP1
        ? conv.participante2SucursalId
        : conv.participante1SucursalId;
    return otroModo === 'comercial' && !!otroSucursalId;
}

/**
 * Devuelve la sucursalId del otro lado (si es chat con negocio), o null.
 */
export function obtenerSucursalIdDelOtro(
    conv: Pick<
        Conversacion,
        | 'participante1Id'
        | 'participante2Id'
        | 'participante1SucursalId'
        | 'participante2SucursalId'
    >,
    miId: string | null,
): string | null {
    if (!miId) return null;
    const esMiP1 = conv.participante1Id === miId;
    return (
        (esMiP1 ? conv.participante2SucursalId : conv.participante1SucursalId) ??
        null
    );
}
