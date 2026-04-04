/**
 * alertas.schema.ts
 * ==================
 * Schemas de validación Zod para el módulo de Alertas.
 *
 * Ubicación: apps/api/src/validations/alertas.schema.ts
 */

import { z } from 'zod';

// Valores válidos
const TIPOS_ALERTA = [
	'monto_inusual', 'cliente_frecuente', 'fuera_horario', 'montos_redondos',
	'empleado_destacado', 'voucher_estancado', 'acumulacion_vouchers',
	'oferta_por_expirar', 'cupones_por_expirar', 'caida_ventas', 'cliente_vip_inactivo',
	'racha_resenas_negativas', 'pico_actividad', 'cupones_sin_canjear', 'puntos_por_expirar',
	'recompensa_popular',
] as const;

const CATEGORIAS = ['seguridad', 'operativa', 'rendimiento', 'engagement'] as const;
const SEVERIDADES = ['baja', 'media', 'alta'] as const;

// --- Filtros para GET /alertas ---

export const filtrosAlertasSchema = z.object({
	tipo: z.enum(TIPOS_ALERTA).optional(),
	categoria: z.enum(CATEGORIAS).optional(),
	severidad: z.enum(SEVERIDADES).optional(),
	leida: z.preprocess(
		(val) => val === 'true' ? true : val === 'false' ? false : val,
		z.boolean().optional()
	),
	resuelta: z.preprocess(
		(val) => val === 'true' ? true : val === 'false' ? false : val,
		z.boolean().optional()
	),
	busqueda: z.string().max(100).optional(),
	pagina: z.coerce.number().int().min(1).default(1),
	porPagina: z.coerce.number().int().min(1).max(50).default(20),
});

export type FiltrosAlertasInput = z.infer<typeof filtrosAlertasSchema>;

// --- Configuración de alertas ---

export const actualizarConfiguracionSchema = z.object({
	activo: z.boolean(),
	umbrales: z.record(z.string(), z.number().min(0)).default({}),
});

export type ActualizarConfiguracionInput = z.infer<typeof actualizarConfiguracionSchema>;

// --- Parámetros con UUID ---

export const alertaIdSchema = z.object({
	id: z.string().uuid('ID de alerta inválido'),
});

export const tipoAlertaParamSchema = z.object({
	tipo: z.enum(TIPOS_ALERTA, { message: 'Tipo de alerta inválido' }),
});

// --- Filtros opcionales para marcar todas leídas ---

export const marcarTodasLeidasSchema = z.object({
	categoria: z.enum(CATEGORIAS).optional(),
	severidad: z.enum(SEVERIDADES).optional(),
});

export type MarcarTodasLeidasInput = z.infer<typeof marcarTodasLeidasSchema>;
