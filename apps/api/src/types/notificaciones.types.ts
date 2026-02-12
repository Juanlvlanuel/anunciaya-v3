/**
 * notificaciones.types.ts
 * ========================
 * Tipos para el módulo de Notificaciones.
 *
 * UBICACIÓN: apps/api/src/types/notificaciones.types.ts
 */

export type ModoNotificacion = 'personal' | 'comercial';

export type TipoNotificacion =
  | 'puntos_ganados'
  | 'voucher_generado'
  | 'voucher_cobrado'
  | 'nueva_oferta'
  | 'nueva_recompensa'
  | 'nuevo_cupon'
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
  | 'recompensa'
  | 'resena'
  | 'cupon'
  | 'marketplace'
  | 'dinamica'
  | 'empleo';

export interface CrearNotificacionInput {
  usuarioId: string;
  modo: ModoNotificacion;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  negocioId?: string;
  sucursalId?: string;
  referenciaId?: string;
  referenciaTipo?: ReferenciaTipo;
  icono?: string;
}

export interface NotificacionResponse {
  id: string;
  modo: ModoNotificacion;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  negocioId: string | null;
  sucursalId: string | null;
  referenciaId: string | null;
  referenciaTipo: ReferenciaTipo | null;
  icono: string | null;
  leida: boolean;
  leidaAt: string | null;
  createdAt: string;
}

export interface RespuestaServicio<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: number;
}