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
  /** Al CLIENTE cuando sus puntos en un negocio están por vencer (aviso previo). */
  | 'puntos_por_vencer'
  | 'stock_bajo'
  | 'nueva_resena'
  | 'sistema'
  | 'nuevo_marketplace'
  | 'nuevo_servicio'
  // ── Sprint 1.D — Home / Coyo ──────────────────────────────────────────
  /** Al autor de una pregunta cuando alguien responde en el Home. */
  | 'pregunta_comunidad_respondida'
  /** Al gerente (fallback dueño) cuando un item suyo aparece en los
   *  resultados de Coyo. También a usuarios personales con items en
   *  Marketplace o Servicios. */
  | 'coyo_recomendacion'
  // ── Sprint 2.B' — A los interesados ("Yo también quiero saber") ────
  /** A los vecinos que marcaron "Yo también quiero saber" en una
   *  pregunta, cuando otro vecino responde a esa pregunta. */
  | 'pregunta_comunidad_seguida_respondida'
  // ── Estatus de pago de membresía (avisos personales al dueño) ──────────
  | 'membresia_en_gracia'
  | 'pago_rechazado'
  | 'pago_aprobado'
  | 'pago_anulado'
  // ── Comentarios (hilos) ─────────────────────────────────────────────────
  /** MarketPlace: al dueño cuando comentan su artículo. */
  | 'marketplace_nuevo_comentario'
  /** MarketPlace: al autor cuando responden su comentario. */
  | 'marketplace_respuesta_comentario'
  /** Negocios (publicaciones libres): al autor cuando comentan su post. */
  | 'negocio_publicacion_nuevo_comentario'
  /** Negocios (publicaciones libres): al autor cuando responden su comentario. */
  | 'negocio_publicacion_respuesta_comentario';

export type ReferenciaTipo =
  | 'transaccion'
  | 'voucher'
  | 'oferta'
  | 'cupon'
  | 'recompensa'
  | 'resena'
  | 'marketplace'
  | 'servicio'
  // Alerta de seguridad (BS) — apunta a `alertas_seguridad.id`. La notif
  // "cliente frecuente"/"fuera de horario" abre su modal en /business-studio/alertas.
  | 'alerta'
  // ── Sprint 1.D — apunta a `preguntas_comunidad.id` ────────────────────
  | 'pregunta_comunidad'
  // ── Comentarios de Negocios (publicaciones libres) ────────────────────
  | 'negocio_publicacion';

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
  comentarioId: string | null;
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