/**
 * empleados.schema.ts
 * ====================
 * Schemas de validación Zod para el módulo de Empleados.
 *
 * Ubicación: apps/api/src/validations/empleados.schema.ts
 */

import { z } from 'zod';

// --- Crear empleado ---

export const crearEmpleadoSchema = z.object({
	nombre: z.string().min(2, 'Nombre mínimo 2 caracteres').max(200),
	nick: z.string().min(2, 'Nick mínimo 2 caracteres').max(30)
		.regex(/^[a-zA-Z0-9_]+$/, 'Nick solo permite letras, números y guión bajo')
		.transform(v => v.toLowerCase()),
	pinAcceso: z.string().regex(/^\d{4}$/, 'PIN debe ser exactamente 4 dígitos'),
	sucursalId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Sucursal inválida'),
	especialidad: z.string().max(100).optional(),
	telefono: z.string().max(20).optional(),
	correo: z.string().email('Correo inválido').optional(),
	fotoUrl: z.string().url().optional(),
	notasInternas: z.string().max(500).optional(),
	puedeRegistrarVentas: z.boolean().default(true),
	puedeProcesarCanjes: z.boolean().default(true),
	puedeVerHistorial: z.boolean().default(true),
	puedeResponderChat: z.boolean().default(true),
	puedeResponderResenas: z.boolean().default(true),
});

// --- Actualizar empleado ---

export const actualizarEmpleadoSchema = z.object({
	nombre: z.string().min(2).max(200).optional(),
	nick: z.string().min(2).max(30)
		.regex(/^[a-zA-Z0-9_]+$/, 'Nick solo permite letras, números y guión bajo')
		.transform(v => v.toLowerCase())
		.optional(),
	pinAcceso: z.string().regex(/^\d{4}$/, 'PIN debe ser exactamente 4 dígitos').optional(),
	sucursalId: z.string().uuid().optional(),
	especialidad: z.string().max(100).nullable().optional(),
	telefono: z.string().max(20).nullable().optional(),
	correo: z.string().email().nullable().optional(),
	fotoUrl: z.string().url().nullable().optional(),
	notasInternas: z.string().max(500).nullable().optional(),
	puedeRegistrarVentas: z.boolean().optional(),
	puedeProcesarCanjes: z.boolean().optional(),
	puedeVerHistorial: z.boolean().optional(),
	puedeResponderChat: z.boolean().optional(),
	puedeResponderResenas: z.boolean().optional(),
});

// --- Horarios ---

export const horarioItemSchema = z.object({
	diaSemana: z.number().int().min(0).max(6),
	horaEntrada: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
	horaSalida: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
});

export const horariosEmpleadoSchema = z.object({
	horarios: z.array(horarioItemSchema).max(14, 'Máximo 14 horarios'),
});

// --- Toggle activo ---

export const toggleActivoSchema = z.object({
	activo: z.boolean(),
});

// --- Params ---

export const empleadoIdSchema = z.object({
	id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'ID de empleado inválido'),
});

// --- Query filtros ---

export const filtrosEmpleadosSchema = z.object({
	busqueda: z.string().optional(),
	activo: z.preprocess(
		(val) => val === 'true' ? true : val === 'false' ? false : undefined,
		z.boolean().optional()
	),
	limit: z.preprocess(
		(val) => val ? Number(val) : 20,
		z.number().int().min(1).max(50).default(20)
	),
	offset: z.preprocess(
		(val) => val ? Number(val) : 0,
		z.number().int().min(0).default(0)
	),
});
