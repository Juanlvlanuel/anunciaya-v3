import type { Conversacion, ModoChatYA } from '../../../types/chatya';

export interface LadoConversacion {
  soyP1: boolean;
  otroId: string;
  otroModo: ModoChatYA;
  otroSucursalId: string | null;
}

/**
 * Determina de qué lado estoy en una conversación usando la tupla (miId, miSucursalId).
 *
 * Necesario para el caso de chats inter-sucursal del mismo negocio, donde
 * `participante1Id === participante2Id === miId` y el desempate debe hacerse
 * por `sucursalId`.
 *
 * Cae al comportamiento legacy (solo por `miId`) si la tupla no matchea —
 * cubre conversaciones personales y gerentes con distinto usuarioId.
 */
export function determinarMiLado(
  conversacion: Pick<
    Conversacion,
    'participante1Id' | 'participante1Modo' | 'participante1SucursalId' |
    'participante2Id' | 'participante2Modo' | 'participante2SucursalId'
  >,
  miId: string | null,
  miSucursalId: string | null,
): LadoConversacion {
  const p1Match =
    !!miId &&
    conversacion.participante1Id === miId &&
    conversacion.participante1SucursalId === miSucursalId;
  const p2Match =
    !!miId &&
    conversacion.participante2Id === miId &&
    conversacion.participante2SucursalId === miSucursalId;

  let soyP1: boolean;
  if (p1Match) soyP1 = true;
  else if (p2Match) soyP1 = false;
  else soyP1 = conversacion.participante1Id === miId;

  return {
    soyP1,
    otroId: soyP1 ? conversacion.participante2Id : conversacion.participante1Id,
    otroModo: soyP1 ? conversacion.participante2Modo : conversacion.participante1Modo,
    otroSucursalId: soyP1 ? conversacion.participante2SucursalId : conversacion.participante1SucursalId,
  };
}
