/**
 * alertas.controller.ts
 * ======================
 * Controlador del módulo de Alertas — Business Studio.
 *
 * Ubicación: apps/api/src/controllers/alertas.controller.ts
 */

import type { Request, Response, NextFunction } from 'express';
import * as alertasService from '../services/alertas.service.js';
import {
	filtrosAlertasSchema,
	actualizarConfiguracionSchema,
	alertaIdSchema,
	tipoAlertaParamSchema,
	marcarTodasLeidasSchema,
} from '../validations/alertas.schema.js';

interface RequestConNegocio extends Request {
	negocioId?: string;
}

/**
 * GET /api/business/alertas
 * Obtener alertas paginadas con filtros
 */
export async function obtenerAlertas(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const filtrosParsed = filtrosAlertasSchema.safeParse(req.query);
		if (!filtrosParsed.success) {
			return res.status(400).json({ success: false, error: 'Filtros inválidos', detalles: filtrosParsed.error.flatten() });
		}

		const sucursalId = req.query.sucursalId as string | undefined;
		const resultado = await alertasService.obtenerAlertasPaginadas(negocioId, sucursalId, filtrosParsed.data);

		return res.json({ success: true, data: resultado });
	} catch (error) {
		next(error);
	}
}

/**
 * GET /api/business/alertas/kpis
 * KPIs aggregados de alertas
 */
export async function obtenerKPIs(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const sucursalId = req.query.sucursalId as string | undefined;
		const kpis = await alertasService.obtenerAlertasKPIs(negocioId, sucursalId);

		return res.json({ success: true, data: kpis });
	} catch (error) {
		next(error);
	}
}

/**
 * GET /api/business/alertas/no-leidas
 * Contar alertas no leídas (para badge)
 */
export async function contarNoLeidas(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const sucursalId = req.query.sucursalId as string | undefined;
		const total = await alertasService.contarNoLeidas(negocioId, sucursalId);

		return res.json({ success: true, data: { total } });
	} catch (error) {
		next(error);
	}
}

/**
 * GET /api/business/alertas/configuracion
 * Obtener configuración de alertas del negocio
 */
export async function obtenerConfiguracion(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const configuracion = await alertasService.obtenerConfiguracion(negocioId);

		return res.json({ success: true, data: configuracion });
	} catch (error) {
		next(error);
	}
}

/**
 * GET /api/business/alertas/:id
 * Detalle de una alerta
 */
export async function obtenerAlerta(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const parsed = alertaIdSchema.safeParse(req.params);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'ID de alerta inválido' });
		}

		const alerta = await alertasService.obtenerAlertaDetalle(parsed.data.id, negocioId);
		if (!alerta) {
			return res.status(404).json({ success: false, error: 'Alerta no encontrada' });
		}

		return res.json({ success: true, data: alerta });
	} catch (error) {
		next(error);
	}
}

/**
 * PUT /api/business/alertas/:id/leida
 * Marcar una alerta como leída
 */
export async function marcarLeida(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const parsed = alertaIdSchema.safeParse(req.params);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'ID de alerta inválido' });
		}

		const marcada = await alertasService.marcarAlertaLeida(parsed.data.id, negocioId);
		if (!marcada) {
			return res.status(404).json({ success: false, error: 'Alerta no encontrada' });
		}

		return res.json({ success: true, message: 'Alerta marcada como leída' });
	} catch (error) {
		next(error);
	}
}

/**
 * PUT /api/business/alertas/:id/resuelta
 * Marcar una alerta como resuelta
 */
export async function marcarResuelta(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const parsed = alertaIdSchema.safeParse(req.params);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'ID de alerta inválido' });
		}

		const marcada = await alertasService.marcarAlertaResuelta(parsed.data.id, negocioId);
		if (!marcada) {
			return res.status(404).json({ success: false, error: 'Alerta no encontrada' });
		}

		return res.json({ success: true, message: 'Alerta marcada como resuelta' });
	} catch (error) {
		next(error);
	}
}

/**
 * PUT /api/business/alertas/marcar-todas-leidas
 * Marcar todas las alertas como leídas
 */
export async function marcarTodasLeidasController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const parsed = marcarTodasLeidasSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'Datos inválidos' });
		}

		const afectadas = await alertasService.marcarTodasLeidas(negocioId, parsed.data.categoria, parsed.data.severidad);

		return res.json({ success: true, data: { afectadas } });
	} catch (error) {
		next(error);
	}
}

/**
 * PUT /api/business/alertas/configuracion/:tipo
 * Actualizar configuración de un tipo de alerta
 */
export async function actualizarConfiguracionController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const tipoParsed = tipoAlertaParamSchema.safeParse(req.params);
		if (!tipoParsed.success) {
			return res.status(400).json({ success: false, error: 'Tipo de alerta inválido' });
		}

		const bodyParsed = actualizarConfiguracionSchema.safeParse(req.body);
		if (!bodyParsed.success) {
			return res.status(400).json({ success: false, error: 'Datos inválidos', detalles: bodyParsed.error.flatten() });
		}

		await alertasService.actualizarConfiguracion(
			negocioId,
			tipoParsed.data.tipo,
			bodyParsed.data.activo,
			bodyParsed.data.umbrales
		);

		return res.json({ success: true, message: 'Configuración actualizada' });
	} catch (error) {
		next(error);
	}
}

/**
 * DELETE /api/business/alertas/:id
 * Eliminar una alerta
 */
export async function eliminarAlertaController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const parsed = alertaIdSchema.safeParse(req.params);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'ID de alerta inválido' });
		}

		const eliminada = await alertasService.eliminarAlerta(parsed.data.id, negocioId);
		if (!eliminada) {
			return res.status(404).json({ success: false, error: 'Alerta no encontrada' });
		}

		return res.json({ success: true, message: 'Alerta eliminada' });
	} catch (error) {
		next(error);
	}
}

/**
 * DELETE /api/business/alertas/resueltas
 * Eliminar todas las alertas resueltas
 */
export async function eliminarResueltasController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const eliminadas = await alertasService.eliminarAlertasResueltas(negocioId);

		return res.json({ success: true, data: { eliminadas } });
	} catch (error) {
		next(error);
	}
}
