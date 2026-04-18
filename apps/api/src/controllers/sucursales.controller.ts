/**
 * sucursales.controller.ts
 * =========================
 * Controllers para CRUD de sucursales + gestión de gerentes.
 *
 * Ubicación: apps/api/src/controllers/sucursales.controller.ts
 */

import type { Request, Response, NextFunction } from 'express';
import * as negocioManagement from '../services/negocioManagement.service';
import * as sucursalesService from '../services/sucursales.service';
import { crearSucursalSchema, crearGerenteSchema, toggleActivaSchema } from '../validations/sucursales.schema';
import { enviarEmailGerenteCreado, enviarEmailGerenteAsignado, enviarEmailCredencialesReenviadas, enviarEmailGerenteRevocado } from '../utils/email';

interface RequestConNegocio extends Request {
	negocioId?: string;
}

/**
 * Valida que el usuario sea dueño (no gerente)
 */
function validarEsDueno(req: RequestConNegocio, res: Response): boolean {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if ((req as any).usuario?.sucursalAsignada) {
		res.status(403).json({ success: false, error: 'Solo los dueños pueden gestionar sucursales' });
		return false;
	}
	return true;
}

function obtenerCorreoUsuario(req: RequestConNegocio): string {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (req as any).usuario?.correo ?? '';
}

// ============================================
// CRUD SUCURSALES
// ============================================

/**
 * GET /api/negocios/:negocioId/sucursales/kpis
 */
export async function kpisSucursalesController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });
		if (!validarEsDueno(req, res)) return;

		const kpis = await sucursalesService.obtenerKPIsSucursales(negocioId);
		return res.json({ success: true, data: kpis });
	} catch (error) {
		next(error);
	}
}

/**
 * GET /api/negocios/:negocioId/sucursales/lista
 */
export async function listarSucursalesConGerenteController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });
		if (!validarEsDueno(req, res)) return;

		const busqueda = req.query.busqueda as string | undefined;
		const activaParam = req.query.activa as string | undefined;
		const activa = activaParam === 'true' ? true : activaParam === 'false' ? false : undefined;

		const sucursales = await sucursalesService.obtenerSucursalesConGerente(negocioId, { busqueda, activa });
		return res.json({ success: true, data: sucursales });
	} catch (error) {
		next(error);
	}
}

/**
 * POST /api/negocios/:negocioId/sucursales
 */
export async function crearSucursalController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });
		if (!validarEsDueno(req, res)) return;

		const parsed = crearSucursalSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'Datos inválidos', detalles: parsed.error.flatten() });
		}

		const resultado = await negocioManagement.crearSucursal(negocioId, parsed.data);
		return res.status(201).json({ success: true, data: resultado.sucursal });
	} catch (error) {
		if (error instanceof Error && error.message === 'NOMBRE_DUPLICADO') {
			return res.status(409).json({
				success: false,
				error: 'Ya existe una sucursal con ese nombre en este negocio',
				code: 'NOMBRE_DUPLICADO',
			});
		}
		next(error);
	}
}

/**
 * PATCH /api/negocios/sucursal/:id/toggle-activa
 */
export async function toggleActivaSucursalController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		if (!validarEsDueno(req, res)) return;

		const sucursalId = req.params.id;
		const parsed = toggleActivaSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'Datos inválidos' });
		}

		const resultado = await negocioManagement.toggleActivaSucursal(sucursalId, parsed.data.activa);
		return res.json(resultado);
	} catch (error) {
		if (error instanceof Error && (error.message.includes('principal') || error.message.includes('no encontrada'))) {
			return res.status(400).json({ success: false, error: error.message });
		}
		next(error);
	}
}

/**
 * DELETE /api/negocios/sucursal/:id
 */
export async function eliminarSucursalController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		if (!validarEsDueno(req, res)) return;

		const sucursalId = req.params.id;
		const resultado = await negocioManagement.eliminarSucursal(sucursalId);
		return res.json(resultado);
	} catch (error) {
		if (error instanceof Error && error.message === 'TIENE_HISTORIAL') {
			return res.status(409).json({
				success: false,
				error: 'La sucursal tiene ventas registradas. Para conservar el historial, desactívala en lugar de eliminarla.',
				code: 'TIENE_HISTORIAL',
			});
		}
		if (error instanceof Error && (error.message.includes('principal') || error.message.includes('no encontrada'))) {
			return res.status(400).json({ success: false, error: error.message });
		}
		next(error);
	}
}

// ============================================
// GERENTES
// ============================================

/**
 * GET /api/negocios/sucursal/:id/gerente
 */
export async function obtenerGerenteSucursalController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });
		if (!validarEsDueno(req, res)) return;

		const sucursalId = req.params.id;
		const gerente = await sucursalesService.obtenerGerenteSucursal(sucursalId, negocioId);
		return res.json({ success: true, data: gerente });
	} catch (error) {
		if (error instanceof Error && error.message.includes('no pertenece')) {
			return res.status(403).json({ success: false, error: error.message });
		}
		next(error);
	}
}

/**
 * POST /api/negocios/sucursal/:id/crear-gerente
 */
export async function crearGerenteController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });
		if (!validarEsDueno(req, res)) return;

		const parsed = crearGerenteSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({ success: false, error: 'Datos inválidos', detalles: parsed.error.flatten() });
		}

		const sucursalId = req.params.id;
		const correoDueno = obtenerCorreoUsuario(req);

		const resultado = await sucursalesService.asignarGerenteSucursal(negocioId, sucursalId, parsed.data, correoDueno);

		// Email diferenciado según tipo (creado vs promovido)
		try {
			const contexto = await sucursalesService.obtenerContextoSucursal(sucursalId);
			const nombreNegocio = contexto?.nombreNegocio ?? 'AnunciaYA';
			const nombreSucursal = contexto?.nombreSucursal ?? 'tu sucursal';

			if (resultado.tipo === 'creado' && resultado.contrasenaProvisional) {
				await enviarEmailGerenteCreado(
					resultado.gerente.correo,
					resultado.gerente.nombre,
					resultado.contrasenaProvisional,
					nombreNegocio,
					nombreSucursal
				);
			} else if (resultado.tipo === 'promovido') {
				await enviarEmailGerenteAsignado(
					resultado.gerente.correo,
					resultado.gerente.nombre,
					nombreNegocio,
					nombreSucursal
				);
			}
		} catch {
			// El email es best-effort, no bloquea la asignación
			console.error('Error al enviar email de asignación al gerente');
		}

		const mensaje = resultado.tipo === 'creado'
			? 'Cuenta de gerente creada. Se enviaron las credenciales por correo.'
			: 'Cuenta existente promovida a gerente. Se envió notificación por correo.';

		return res.status(201).json({
			success: true,
			data: { ...resultado.gerente, tipoAsignacion: resultado.tipo },
			message: mensaje,
		});
	} catch (error) {
		if (error instanceof Error && (
			error.message.includes('gerente') ||
			error.message.includes('correo') ||
			error.message.includes('asignarte') ||
			error.message.includes('negocio asignado') ||
			error.message.includes('no pertenece') ||
			error.message.includes('no encontrada')
		)) {
			return res.status(400).json({ success: false, error: error.message });
		}
		next(error);
	}
}

/**
 * POST /api/negocios/sucursal/:id/reenviar-credenciales
 */
export async function reenviarCredencialesController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });
		if (!validarEsDueno(req, res)) return;

		const sucursalId = req.params.id;
		const resultado = await sucursalesService.reenviarCredenciales(sucursalId, negocioId);

		// Enviar email
		try {
			const contexto = await sucursalesService.obtenerContextoSucursal(sucursalId);
			await enviarEmailCredencialesReenviadas(
				resultado.gerente.correo,
				resultado.gerente.nombre,
				resultado.contrasenaProvisional,
				contexto?.nombreNegocio ?? 'AnunciaYA',
				contexto?.nombreSucursal ?? 'tu sucursal'
			);
		} catch {
			console.error('Error al enviar email de credenciales reenviadas');
		}

		return res.json({
			success: true,
			message: 'Credenciales reenviadas por correo.',
		});
	} catch (error) {
		if (error instanceof Error && error.message.includes('gerente')) {
			return res.status(400).json({ success: false, error: error.message });
		}
		next(error);
	}
}

/**
 * DELETE /api/negocios/sucursal/:id/revocar-gerente
 */
export async function revocarGerenteController(req: RequestConNegocio, res: Response, next: NextFunction) {
	try {
		const negocioId = req.negocioId;
		if (!negocioId) return res.status(400).json({ success: false, error: 'negocioId requerido' });
		if (!validarEsDueno(req, res)) return;

		const sucursalId = req.params.id;
		// Obtener contexto ANTES de revocar (luego el gerente ya no estará asociado)
		const contexto = await sucursalesService.obtenerContextoSucursal(sucursalId);
		const resultado = await sucursalesService.revocarGerente(sucursalId, negocioId);

		// Enviar email de notificación
		try {
			await enviarEmailGerenteRevocado(
				resultado.gerenteRevocado.correo,
				resultado.gerenteRevocado.nombre,
				contexto?.nombreNegocio ?? 'AnunciaYA',
				contexto?.nombreSucursal ?? 'tu sucursal'
			);
		} catch {
			console.error('Error al enviar email de revocación');
		}

		return res.json({
			success: true,
			message: 'Gerente revocado exitosamente',
		});
	} catch (error) {
		if (error instanceof Error && error.message.includes('gerente')) {
			return res.status(400).json({ success: false, error: error.message });
		}
		next(error);
	}
}
