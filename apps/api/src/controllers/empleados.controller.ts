/**
 * empleados.controller.ts
 * ========================
 * Controlador del módulo de Empleados — Business Studio.
 *
 * Permisos:
 * - Dueño: CRUD total sobre todos los empleados de todas sus sucursales.
 * - Gerente: CRUD solo sobre empleados de SU sucursal asignada.
 *   - Al crear/editar: sucursalId se fuerza a la suya (no puede elegir otra).
 *   - Al operar sobre un empleado existente: se valida que pertenece a su sucursal.
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

function sucursalAsignadaDelUsuario(req: RequestConNegocio): string | null {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return ((req as any).usuario?.sucursalAsignada as string | null | undefined) ?? null;
}

/**
 * Si el usuario es gerente, valida que el empleado pertenezca a su sucursal.
 * Si es dueño (sucursalAsignada=null), no aplica restricción.
 * Retorna true si puede operar, false si debe bloquearse con 403.
 */
async function gerentePuedeOperarSobreEmpleado(req: RequestConNegocio, empleadoId: string): Promise<boolean> {
	const sucursalGerente = sucursalAsignadaDelUsuario(req);
	if (!sucursalGerente) return true; // es dueño
	return empleadosService.empleadoPerteneceASucursal(empleadoId, sucursalGerente);
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

		// Si es gerente, solo puede ver empleados de su sucursal
		if (!(await gerentePuedeOperarSobreEmpleado(req, parsed.data.id))) {
			return res.status(403).json({ success: false, error: 'Este empleado no pertenece a tu sucursal' });
		}

		const detalle = await empleadosService.obtenerDetalle(negocioId, parsed.data.id);
		if (!detalle) return res.status(404).json({ success: false, error: 'Empleado no encontrado' });

		return res.json({ success: true, data: detalle });
	} catch (error) {
		next(error);
	}
}

/**
 * GET /api/business/empleados/verificar-nick?nick=xxx&excluirId=uuid
 *
 * Endpoint usado por el formulario de crear/editar empleado para validación en vivo
 * con debounce. Devuelve disponibilidad + hasta 3 sugerencias libres con sufijo numérico.
 */
export async function verificarNickController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const nick = typeof req.query.nick === 'string' ? req.query.nick : '';
		const excluirId = typeof req.query.excluirId === 'string' ? req.query.excluirId : undefined;

		if (!nick.trim()) {
			return res.json({ success: true, data: { disponible: false, sugerencias: [] } });
		}

		const resultado = await empleadosService.verificarDisponibilidadNick(nick, excluirId);
		return res.json({ success: true, data: resultado });
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

		// Si es gerente, forzar la sucursal asignada (no puede elegir otra)
		const sucursalGerente = sucursalAsignadaDelUsuario(req);
		const body = sucursalGerente
			? { ...req.body, sucursalId: sucursalGerente }
			: req.body;

		const parsed = crearEmpleadoSchema.safeParse(body);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'Datos inválidos', detalles: parsed.error.flatten() });
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

		// Si es gerente: validar que el empleado sea de su sucursal y forzar sucursalId a la suya
		const sucursalGerente = sucursalAsignadaDelUsuario(req);
		if (sucursalGerente && !(await empleadosService.empleadoPerteneceASucursal(paramsParsed.data.id, sucursalGerente))) {
			return res.status(403).json({ success: false, error: 'Este empleado no pertenece a tu sucursal' });
		}

		const body = sucursalGerente && req.body?.sucursalId !== undefined
			? { ...req.body, sucursalId: sucursalGerente }
			: req.body;

		const bodyParsed = actualizarEmpleadoSchema.safeParse(body);
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

		if (!(await gerentePuedeOperarSobreEmpleado(req, paramsParsed.data.id))) {
			return res.status(403).json({ success: false, error: 'Este empleado no pertenece a tu sucursal' });
		}

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

		const parsed = empleadoIdSchema.safeParse(req.params);
		if (!parsed.success) return res.status(400).json({ success: false, error: 'ID inválido' });

		if (!(await gerentePuedeOperarSobreEmpleado(req, parsed.data.id))) {
			return res.status(403).json({ success: false, error: 'Este empleado no pertenece a tu sucursal' });
		}

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

		if (!(await gerentePuedeOperarSobreEmpleado(req, paramsParsed.data.id))) {
			return res.status(403).json({ success: false, error: 'Este empleado no pertenece a tu sucursal' });
		}

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

		const parsed = empleadoIdSchema.safeParse(req.params);
		if (!parsed.success) return res.status(400).json({ success: false, error: 'ID inválido' });

		if (!(await gerentePuedeOperarSobreEmpleado(req, parsed.data.id))) {
			return res.status(403).json({ success: false, error: 'Este empleado no pertenece a tu sucursal' });
		}

		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await empleadosService.revocarSesionEmpleado(negocioId, parsed.data.id, (req as any).usuario!.usuarioId);
		} catch (err) {
			if ((err as Error).message === 'EMPLEADO_NO_ENCONTRADO') {
				return res.status(404).json({ success: false, error: 'Empleado no encontrado' });
			}
			if ((err as Error).message === 'REDIS_REVOCATION_FAILED') {
				return res.status(500).json({
					success: false,
					error: 'El turno se cerró pero no se pudo revocar el token. El empleado podría seguir operando hasta que expire el token. Contacta al soporte.',
				});
			}
			throw err;
		}

		return res.json({ success: true, message: 'Sesiones de ScanYA revocadas' });
	} catch (error) {
		next(error);
	}
}
