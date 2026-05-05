/**
 * notificaciones.types.ts
 * ========================
 * Tipos para el módulo de Notificaciones.
 *
 * UBICACIÓN: apps/api/src/types/notificaciones.types.ts
 */

export type ModoNotificacion = 'personal' | 'comercial';

// Visión v3 (abril 2026): 'nueva_dinamica' removido del alcance v1 (Dinámicas
// descartadas) y 'nuevo_empleo' renombrado a 'nuevo_servicio' (sección pública
// unificada). CHECK constraint en BD ya sincronizado en Fase D.
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
  | 'nuevo_servicio'
  | 'alerta_seguridad'
  | 'marketplace_nuevo_mensaje'
  | 'marketplace_proxima_expirar'
  | 'marketplace_expirada'
  | 'marketplace_nueva_pregunta'
  | 'marketplace_pregunta_respondida';

// Idem ReferenciaTipo: 'dinamica' removido, 'empleo' → 'servicio' en Fase D.
export type ReferenciaTipo =
  | 'transaccion'
  | 'voucher'
  | 'oferta'
  | 'cupon'
  | 'recompensa'
  | 'resena'
  | 'marketplace'
  | 'servicio'
  | 'alerta';

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
  actorImagenUrl?: string;
  actorNombre?: string;
}

export interface NotificacionResponse {
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

export interface RespuestaServicio<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  code?: number;
}