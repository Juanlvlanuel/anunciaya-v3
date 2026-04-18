import { z } from 'zod';

// ============================================
// CREAR SUCURSAL
// ============================================

export const crearSucursalSchema = z.object({
	nombre: z
		.string()
		.min(3, 'El nombre debe tener al menos 3 caracteres')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.trim(),
	ciudad: z
		.string()
		.min(2, 'La ciudad debe tener al menos 2 caracteres')
		.max(120, 'La ciudad no puede tener más de 120 caracteres')
		.trim(),
	estado: z
		.string()
		.min(2, 'El estado debe tener al menos 2 caracteres')
		.max(100, 'El estado no puede tener más de 100 caracteres')
		.trim(),
	direccion: z
		.string()
		.max(250, 'La dirección no puede exceder 250 caracteres')
		.trim()
		.optional(),
	// Se guarda el teléfono con lada: formato "+52 6381234567".
	// Se acepta también el string sin lada (10 dígitos) para retrocompatibilidad.
	telefono: z
		.string()
		.max(20)
		.trim()
		.refine(
			(val) => {
				if (!val) return true;
				// Con lada: "+XX 10dígitos" o "+XX10dígitos"
				if (/^\+\d{1,3}\s?\d{10}$/.test(val)) return true;
				// Solo 10 dígitos (legacy)
				if (/^\d{10}$/.test(val)) return true;
				return false;
			},
			'El teléfono debe tener lada + 10 dígitos (ej: +52 6381234567)'
		)
		.optional(),
	whatsapp: z
		.string()
		.max(20)
		.trim()
		.refine(
			(val) => {
				if (!val) return true;
				if (/^\+\d{1,3}\s?\d{10}$/.test(val)) return true;
				if (/^\d{10}$/.test(val)) return true;
				return false;
			},
			'El WhatsApp debe tener lada + 10 dígitos (ej: +52 6381234567)'
		)
		.optional(),
	correo: z
		.string()
		.email('Correo inválido')
		.max(100)
		.trim()
		.toLowerCase()
		.optional(),
	latitud: z
		.number()
		.min(-90, 'Latitud inválida')
		.max(90, 'Latitud inválida'),
	longitud: z
		.number()
		.min(-180, 'Longitud inválida')
		.max(180, 'Longitud inválida'),
});

export type CrearSucursalInput = z.infer<typeof crearSucursalSchema>;

// ============================================
// CREAR GERENTE
// ============================================

export const crearGerenteSchema = z.object({
	nombre: z
		.string()
		.min(2, 'El nombre debe tener al menos 2 caracteres')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.trim(),
	apellidos: z
		.string()
		.min(2, 'Los apellidos deben tener al menos 2 caracteres')
		.max(100, 'Los apellidos no pueden exceder 100 caracteres')
		.trim(),
	correo: z
		.string()
		.email('Correo inválido')
		.max(255, 'El correo no puede exceder 255 caracteres')
		.trim()
		.toLowerCase(),
});

export type CrearGerenteInput = z.infer<typeof crearGerenteSchema>;

// ============================================
// TOGGLE ACTIVA
// ============================================

export const toggleActivaSchema = z.object({
	activa: z.boolean(),
});
