/**
 * ============================================================================
 * TIPOS - Notificaciones (Sistema de Notificaciones en Tiempo Real)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/types/notificaciones.ts
 *
 * ALINEADO CON: apps/api/src/types/notificaciones.types.ts
 */

// =============================================================================
// TIPOS BASE
// =============================================================================

export type ModoNotificacion = 'personal' | 'comercial';

export type TipoNotificacion =
  | 'puntos_ganados'
  | 'voucher_generado'
  | 'voucher_cobrado'
  | 'nueva_oferta'
  | 'nueva_recompensa'
  | 'recompensa_desbloqueada'
  | 'cupon_asignado'
  | 'cupon_revocado'
  | 'nuevo_cliente'
  | 'voucher_pendiente'
  | 'stock_bajo'
  | 'nueva_resena'
  | 'sistema'
  | 'nuevo_marketplace'
  | 'nueva_dinamica'
  | 'nuevo_empleo';

export type ReferenciaTipo =
  | 'transaccion'
  | 'voucher'
  | 'oferta'
  | 'cupon'
  | 'recompensa'
  | 'resena'
  | 'marketplace'
  | 'dinamica'
  | 'empleo';

// =============================================================================
// NOTIFICACIÓN
// =============================================================================

export interface Notificacion {
  id: string;
  modo: ModoNotificacion;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  negocioId: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  referenciaId: string | null;
  referenciaTipo: ReferenciaTipo | null;
  icono: string | null;
  actorImagenUrl: string | null;
  actorNombre: string | null;
  leida: boolean;
  leidaAt: string | null;
  createdAt: string;
}

// =============================================================================
// RESPUESTAS API
// =============================================================================

export interface NotificacionesResponse {
  notificaciones: Notificacion[];
  totalNoLeidas: number;
}