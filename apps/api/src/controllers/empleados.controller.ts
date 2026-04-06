/**
 * empleados.controller.ts
 * ========================
 * Controlador del módulo de Empleados — Business Studio.
 *
 * Ubicación: apps/api/src/controllers/empleados.controller.ts
 */

import type { Request, Response, NextFunction } from 'express';
import * as empleadosService from '../services/empleados.service.js';
import type { ActualizarEmpleadoInput } from '../types/empleados.types.js';
import {
	crearEmpleadoSchema,
	actualizarEmpleadoSchema,
	horariosEmpleadoSchema,
	toggleActivoSchema,
	empleadoIdSchema,
	filtrosEmpleadosSchema,
} from '../validations/empleados.schema.js';

interface RequestConNegocio extends Request {
	negocioId?: string;
}

function esGerente(req: RequestConNegocio): boolean {
	return !!(req as any).usuario?.sucursalAsignada;
}

/**
 * GET /api/business/empleados/kpis
 */
export async function obtenerKPIsController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const sucursalId = req.query.sucursalId as string | undefined;
		const kpis = await empleadosService.obtenerKPIs(negocioId, sucursalId);

		return res.json({ success: true, data: kpis });
	} catch (error) {
		next(error);
	}
}

/**
 * GET /api/business/empleados
 */
export async function obtenerEmpleadosController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const parsed = filtrosEmpleadosSchema.safeParse(req.query);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'Filtros inválidos', detalles: parsed.error.flatten() });
		}

		const sucursalId = req.query.sucursalId as string | undefined;
		const resultado = await empleadosService.obtenerEmpleados(negocioId, sucursalId, parsed.data);

		return res.json({ success: true, data: resultado });
	} catch (error) {
		next(error);
	}
}

/**
 * GET /api/business/empleados/:id
 */
export async function obtenerDetalleController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const parsed = empleadoIdSchema.safeParse(req.params);
		if (!parsed.success) return res.status(400).json({ success: false, error: 'ID inválido' });

		const detalle = await empleadosService.obtenerDetalle(negocioId, parsed.data.id);
		if (!detalle) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

		return res.json({ success: true, data: detalle });
	} catch (error) {
		next(error);
	}
}

/**
 * POST /api/business/empleados
 */
export async function crearEmpleadoController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		if (esGerente(req)) {
			return res.status(403).json({ success: false, error: 'Solo el dueño puede crear empleados' });
		}

		const parsed = crearEmpleadoSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'Datos inválidos', detalles: parsed.error.flatten() });
		}

		const empleado = await empleadosService.crearEmpleado(negocioId, (req as any).usuario!.usuarioId, parsed.data);

		return res.status(201).json({ success: true, data: empleado });
	} catch (error) {
		if ((error as Error).message === 'NICK_DUPLICADO') {
			return res.status(409).json({ success: false, error: 'El nick ya está en uso' });
		}
		if ((error as Error).message === 'SUCURSAL_NO_PERTENECE') {
			return res.status(403).json({ success: false, error: 'La sucursal no pertenece a tu negocio' });
		}
		next(error);
	}
}

/**
 * PUT /api/business/empleados/:id
 */
export async function actualizarEmpleadoController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const paramsParsed = empleadoIdSchema.safeParse(req.params);
		if (!paramsParsed.success) return res.status(400).json({ success: false, error: 'ID inválido' });

		const bodyParsed = actualizarEmpleadoSchema.safeParse(req.body);
		if (!bodyParsed.success) {
			return res.status(400).json({ success: false, error: 'Datos inválidos', detalles: bodyParsed.error.flatten() });
		}

		await empleadosService.actualizarEmpleado(negocioId, paramsParsed.data.id, bodyParsed.data as ActualizarEmpleadoInput);

		return res.json({ success: true, message: 'Empleado actualizado' });
	} catch (error) {
		if ((error as Error).message === 'NICK_DUPLICADO') {
			return res.status(409).json({ success: false, error: 'El nick ya está en uso' });
		}
		if ((error as Error).message === 'EMPLEADO_NO_ENCONTRADO') {
			return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
		}
		if ((error as Error).message === 'SUCURSAL_NO_PERTENECE') {
			return res.status(403).json({ success: false, error: 'La sucursal no pertenece a tu negocio' });
		}
		next(error);
	}
}

/**
 * PATCH /api/business/empleados/:id/activo
 */
export async function toggleActivoController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const paramsParsed = empleadoIdSchema.safeParse(req.params);
		if (!paramsParsed.success) return res.status(400).json({ success: false, error: 'ID inválido' });

		const bodyParsed = toggleActivoSchema.safeParse(req.body);
		if (!bodyParsed.success) return res.status(400).json({ success: false, error: 'Datos inválidos' });

		await empleadosService.toggleActivo(negocioId, paramsParsed.data.id, bodyParsed.data.activo);

		return res.json({ success: true, message: bodyParsed.data.activo ? 'Empleado activado' : 'Empleado desactivado' });
	} catch (error) {
		if ((error as Error).message === 'EMPLEADO_NO_ENCONTRADO') {
			return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
		}
		next(error);
	}
}

/**
 * DELETE /api/business/empleados/:id
 */
export async function eliminarEmpleadoController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		if (esGerente(req)) {
			return res.status(403).json({ success: false, error: 'Solo el dueño puede eliminar empleados' });
		}

		const parsed = empleadoIdSchema.safeParse(req.params);
		if (!parsed.success) return res.status(400).json({ success: false, error: 'ID inválido' });

		const eliminado = await empleadosService.eliminarEmpleado(negocioId, parsed.data.id);
		if (!eliminado) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

		return res.json({ success: true, message: 'Empleado eliminado' });
	} catch (error) {
		if ((error as Error).message === 'EMPLEADO_NO_ENCONTRADO') {
			return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
		}
		next(error);
	}
}

/**
 * PUT /api/business/empleados/:id/horarios
 */
export async function actualizarHorariosController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		const paramsParsed = empleadoIdSchema.safeParse(req.params);
		if (!paramsParsed.success) return res.status(400).json({ success: false, error: 'ID inválido' });

		const bodyParsed = horariosEmpleadoSchema.safeParse(req.body);
		if (!bodyParsed.success) {
			return res.status(400).json({ success: false, error: 'Horarios inválidos', detalles: bodyParsed.error.flatten() });
		}

		await empleadosService.actualizarHorarios(negocioId, paramsParsed.data.id, bodyParsed.data.horarios);

		return res.json({ success: true, message: 'Horarios actualizados' });
	} catch (error) {
		if ((error as Error).message === 'EMPLEADO_NO_ENCONTRADO') {
			return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
		}
		next(error);
	}
}

/**
 * POST /api/business/empleados/:id/revocar-sesion
 * Revocar todas las sesiones ScanYA de un empleado
 */
export async function revocarSesionController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });

		if (esGerente(req)) {
			return res.status(403).json({ success: false, error: 'Solo el dueño puede revocar sesiones' });
		}

		const parsed = empleadoIdSchema.safeParse(req.params);
		if (!parsed.success) return res.status(400).json({ success: false, error: 'ID inválido' });

		try {
			await empleadosService.revocarSesionEmpleado(negocioId, parsed.data.id, (req as any).usuario!.usuarioId);
		} catch (err) {
			if ((err as Error).message === 'EMPLEADO_NO_ENCONTRADO') {
				return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
			}
			// Redis falla — continuar igualmente, el turno ya se cerró
		}

		return res.json({ success: true, message: 'Sesiones de ScanYA revocadas' });
	} catch (error) {
		next(error);
	}
}
