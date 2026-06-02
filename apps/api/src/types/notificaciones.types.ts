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
  | 'marketplace_pregunta_respondida'
  | 'servicios_nueva_pregunta'
  | 'servicios_pregunta_respondida'
  // ── Sprint 1.D — Home / Coyo ────────────────────────────────────────────
  /** Al autor de una pregunta cuando otro vecino responde en el Home. */
  | 'pregunta_comunidad_respondida'
  /** Al gerente de la sucursal (fallback dueño) cuando un item suyo aparece
   *  en los resultados de Coyo. También a usuarios personales con items
   *  en Marketplace o Servicios. */
  | 'coyo_recomendacion'
  // ── Sprint 2.B' — Home: notificación a interesados ──────────────────────
  /** A los vecinos que marcaron "Yo también quiero saber" en una pregunta,
   *  cuando otro vecino responde a esa pregunta. NO al autor (recibe su
   *  propia notif distinta) ni al propio responder (no auto-notif). */
  | 'pregunta_comunidad_seguida_respondida';

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
  | 'alerta'
  // ── Sprint 1.D — apunta a `preguntas_comunidad.id` ────────────────────
  | 'pregunta_comunidad';

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