/**
 * ============================================================================
 * SUCURSALES SERVICE — Gestión de gerentes + KPIs
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/sucursales.service.ts
 *
 * PROPÓSITO:
 * - KPIs de sucursales (total, activas, inactivas)
 * - Lista de sucursales con gerente incluido (LEFT JOIN, evita N+1)
 * - CRUD de gerentes: crear cuenta, revocar, reenviar credenciales
 *
 * CREADO: Abril 2026 — Sprint 12 BS Sucursales
 */

import { eq, and, sql, ilike, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db';
import { negocioSucursales, usuarios, negocios } from '../db/schemas/schema';

const SALT_ROUNDS = 12;

// ============================================
// HELPER: Validar propiedad de sucursal
// ============================================

/**
 * Verifica que una sucursal pertenezca a un negocio específico.
 * Lanza error si no pertenece o no existe.
 */
async function validarPropiedadSucursal(sucursalId: string, negocioId: string): Promise<void> {
	const [sucursal] = await db
		.select({ id: negocioSucursales.id })
		.from(negocioSucursales)
		.where(and(
			eq(negocioSucursales.id, sucursalId),
			eq(negocioSucursales.negocioId, negocioId)
		));

	if (!sucursal) {
		throw new Error('Sucursal no encontrada o no pertenece a tu negocio');
	}
}

/**
 * Obtiene los nombres del negocio y sucursal — útil para incluir en emails.
 * Si la sucursal es la principal, retorna "Matriz" como nombre de sucursal
 * para ser consistente con la UI.
 */
export async function obtenerContextoSucursal(
	sucursalId: string
): Promise<{ nombreNegocio: string; nombreSucursal: string } | null> {
	const [resultado] = await db
		.select({
			nombreSucursal: negocioSucursales.nombre,
			esPrincipal: negocioSucursales.esPrincipal,
			nombreNegocio: negocios.nombre,
		})
		.from(negocioSucursales)
		.innerJoin(negocios, eq(negocios.id, negocioSucursales.negocioId))
		.where(eq(negocioSucursales.id, sucursalId));

	if (!resultado) return null;

	return {
		nombreNegocio: resultado.nombreNegocio,
		nombreSucursal: resultado.esPrincipal ? 'Matriz' : resultado.nombreSucursal,
	};
}

// ============================================
// HELPER: Generar contraseña provisional
// ============================================

/**
 * Genera una contraseña provisional que cumple las reglas:
 * - Mínimo 10 caracteres
 * - Al menos 1 mayúscula
 * - Al menos 1 minúscula
 * - Al menos 1 número
 */
function generarContrasenaProvisional(): string {
	const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
	const minusculas = 'abcdefghjkmnpqrstuvwxyz';
	const numeros = '23456789';
	const todos = mayusculas + minusculas + numeros;

	// Garantizar al menos 1 de cada tipo
	let contrasena = '';
	contrasena += mayusculas[crypto.randomInt(mayusculas.length)];
	contrasena += minusculas[crypto.randomInt(minusculas.length)];
	contrasena += numeros[crypto.randomInt(numeros.length)];

	// Rellenar hasta 10 caracteres
	for (let i = 3; i < 10; i++) {
		contrasena += todos[crypto.randomInt(todos.length)];
	}

	// Fisher-Yates shuffle para mezcla uniforme
	const chars = contrasena.split('');
	for (let i = chars.length - 1; i > 0; i--) {
		const j = crypto.randomInt(i + 1);
		[chars[i], chars[j]] = [chars[j], chars[i]];
	}
	return chars.join('');
}

// ============================================
// KPIs
// ============================================

export const obtenerKPIsSucursales = async (negocioId: string) => {
	try {
		const resultado = await db.execute(sql`
			SELECT
				COUNT(*)::int AS total,
				COUNT(*) FILTER (WHERE activa = true)::int AS activas,
				COUNT(*) FILTER (WHERE activa = false)::int AS inactivas
			FROM negocio_sucursales
			WHERE negocio_id = ${negocioId}
		`);

		const row = resultado.rows[0] as { total: number; activas: number; inactivas: number } | undefined;
		return {
			total: row?.total ?? 0,
			activas: row?.activas ?? 0,
			inactivas: row?.inactivas ?? 0,
		};
	} catch (error) {
		console.error('Error al obtener KPIs de sucursales:', error);
		throw new Error('Error al obtener KPIs de sucursales');
	}
};

// ============================================
// LISTA CON GERENTE (LEFT JOIN, evita N+1)
// ============================================

export const obtenerSucursalesConGerente = async (
	negocioId: string,
	filtros?: { busqueda?: string; activa?: boolean }
) => {
	try {
		const condiciones = [sql`s.negocio_id = ${negocioId}`];

		if (filtros?.activa !== undefined) {
			condiciones.push(sql`s.activa = ${filtros.activa}`);
		}
		if (filtros?.busqueda) {
			condiciones.push(sql`(
				s.nombre ILIKE ${'%' + filtros.busqueda + '%'}
				OR s.ciudad ILIKE ${'%' + filtros.busqueda + '%'}
				OR s.direccion ILIKE ${'%' + filtros.busqueda + '%'}
			)`);
		}

		const where = condiciones.length > 0
			? sql`WHERE ${sql.join(condiciones, sql` AND `)}`
			: sql``;

		const resultado = await db.execute(sql`
			SELECT
				s.id,
				s.nombre,
				s.es_principal AS "esPrincipal",
				s.direccion,
				s.ciudad,
				s.estado,
				s.telefono,
				s.whatsapp,
				s.correo,
				s.activa,
				s.created_at AS "createdAt",
				u.id AS "gerenteId",
				u.nombre AS "gerenteNombre",
				u.apellidos AS "gerenteApellidos",
				u.correo AS "gerenteCorreo"
			FROM negocio_sucursales s
			LEFT JOIN usuarios u ON u.sucursal_asignada = s.id
			${where}
			ORDER BY s.es_principal DESC, s.created_at ASC
		`);

		return resultado.rows.map((row: Record<string, unknown>) => ({
			id: row.id as string,
			nombre: row.nombre as string,
			esPrincipal: row.esPrincipal as boolean,
			direccion: row.direccion as string | null,
			ciudad: row.ciudad as string,
			estado: row.estado as string | null,
			telefono: row.telefono as string | null,
			whatsapp: row.whatsapp as string | null,
			correo: row.correo as string | null,
			activa: row.activa as boolean,
			createdAt: row.createdAt as string,
			gerente: row.gerenteId
				? {
					id: row.gerenteId as string,
					nombre: row.gerenteNombre as string,
					apellidos: row.gerenteApellidos as string,
					correo: row.gerenteCorreo as string,
				}
				: null,
		}));
	} catch (error) {
		console.error('Error al obtener sucursales con gerente:', error);
		throw new Error('Error al obtener sucursales con gerente');
	}
};

// ============================================
// OBTENER GERENTE DE UNA SUCURSAL
// ============================================

export const obtenerGerenteSucursal = async (sucursalId: string, negocioId?: string) => {
	try {
		if (negocioId) await validarPropiedadSucursal(sucursalId, negocioId);
		const [gerente] = await db
			.select({
				id: usuarios.id,
				nombre: usuarios.nombre,
				apellidos: usuarios.apellidos,
				correo: usuarios.correo,
				avatarUrl: usuarios.avatarUrl,
				requiereCambioContrasena: usuarios.requiereCambioContrasena,
			})
			.from(usuarios)
			.where(eq(usuarios.sucursalAsignada, sucursalId));

		return gerente ?? null;
	} catch (error) {
		console.error('Error al obtener gerente:', error);
		throw new Error('Error al obtener gerente de la sucursal');
	}
};

// ============================================
// ASIGNAR GERENTE A SUCURSAL
// (crea cuenta nueva o promueve cuenta personal existente)
// ============================================

export interface ResultadoAsignarGerente {
	success: true;
	tipo: 'creado' | 'promovido';
	gerente: {
		id: string;
		nombre: string;
		apellidos: string;
		correo: string;
	};
	contrasenaProvisional?: string; // solo si tipo === 'creado'
}

export const asignarGerenteSucursal = async (
	negocioId: string,
	sucursalId: string,
	datos: { nombre: string; apellidos: string; correo: string },
	correoDueno: string
): Promise<ResultadoAsignarGerente> => {
	try {
		// 0. Validar que la sucursal pertenece al negocio
		await validarPropiedadSucursal(sucursalId, negocioId);

		// 1. Validar que el correo no sea el del dueño
		if (datos.correo.toLowerCase() === correoDueno.toLowerCase()) {
			throw new Error('No puedes asignarte como gerente de tu propia sucursal');
		}

		// 2. Validar que la sucursal no tenga ya un gerente
		const gerenteExistente = await obtenerGerenteSucursal(sucursalId);
		if (gerenteExistente) {
			throw new Error('Esta sucursal ya tiene un gerente asignado');
		}

		// 3. Buscar si el correo ya existe en tabla usuarios
		const [usuarioExistente] = await db
			.select({
				id: usuarios.id,
				nombre: usuarios.nombre,
				apellidos: usuarios.apellidos,
				correo: usuarios.correo,
				negocioId: usuarios.negocioId,
				sucursalAsignada: usuarios.sucursalAsignada,
			})
			.from(usuarios)
			.where(eq(usuarios.correo, datos.correo.toLowerCase()));

		// ────────────────────────────────────────────
		// CASO A: CORREO NO EXISTE → CREAR CUENTA NUEVA
		// ────────────────────────────────────────────
		if (!usuarioExistente) {
			const contrasenaProvisional = generarContrasenaProvisional();
			const contrasenaHash = await bcrypt.hash(contrasenaProvisional, SALT_ROUNDS);

			const [nuevoGerente] = await db
				.insert(usuarios)
				.values({
					nombre: datos.nombre,
					apellidos: datos.apellidos,
					correo: datos.correo.toLowerCase(),
					contrasenaHash,
					negocioId,
					sucursalAsignada: sucursalId,
					tieneModoComercial: true,
					modoActivo: 'comercial',
					perfil: 'comercial',
					correoVerificado: false,
					requiereCambioContrasena: true,
					estado: 'activo',
				})
				.returning({
					id: usuarios.id,
					nombre: usuarios.nombre,
					apellidos: usuarios.apellidos,
					correo: usuarios.correo,
				});

			return {
				success: true,
				tipo: 'creado',
				gerente: nuevoGerente,
				contrasenaProvisional,
			};
		}

		// ────────────────────────────────────────────
		// CASO B: CORREO EXISTE → VALIDAR ELEGIBILIDAD Y PROMOVER
		// ────────────────────────────────────────────
		// Elegible solo si es cuenta 100% personal:
		// - sin negocio asignado (no es dueño de otro)
		// - sin sucursal asignada (no es gerente de otro)
		if (usuarioExistente.negocioId || usuarioExistente.sucursalAsignada) {
			throw new Error('Este usuario ya tiene un negocio asignado en AnunciaYA');
		}

		// Promover cuenta personal existente → gerente de esta sucursal
		// NO se toca la contrasenaHash (el usuario mantiene la suya).
		// SÍ se fuerza requiereCambioContrasena=false por si venía de un flujo previo
		// (ej: ex-gerente cuya contraseña provisional nunca fue cambiada).
		await db
			.update(usuarios)
			.set({
				negocioId,
				sucursalAsignada: sucursalId,
				tieneModoComercial: true,
				modoActivo: 'comercial',
				perfil: 'comercial',
				requiereCambioContrasena: false,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(usuarios.id, usuarioExistente.id));

		return {
			success: true,
			tipo: 'promovido',
			gerente: {
				id: usuarioExistente.id,
				nombre: usuarioExistente.nombre,
				apellidos: usuarioExistente.apellidos,
				correo: usuarioExistente.correo,
			},
		};
	} catch (error) {
		if (error instanceof Error && (
			error.message.includes('gerente') ||
			error.message.includes('correo') ||
			error.message.includes('asignarte') ||
			error.message.includes('negocio asignado') ||
			error.message.includes('no pertenece')
		)) {
			throw error;
		}
		console.error('Error al asignar gerente:', error);
		throw new Error('Error al asignar gerente');
	}
};

/** @deprecated Usar asignarGerenteSucursal. Mantener export por compatibilidad. */
export const crearCuentaGerente = asignarGerenteSucursal;

// ============================================
// REENVIAR CREDENCIALES
// ============================================

export const reenviarCredenciales = async (sucursalId: string, negocioId?: string) => {
	try {
		if (negocioId) await validarPropiedadSucursal(sucursalId, negocioId);
		const gerente = await obtenerGerenteSucursal(sucursalId);
		if (!gerente) {
			throw new Error('Esta sucursal no tiene gerente asignado');
		}

		// Defensa adicional: si el gerente ya activó su cuenta (cambió su contraseña provisional),
		// reenviar credenciales reemplazaría su contraseña actual sin permiso. Solo permitido
		// cuando la cuenta aún está pendiente de activación.
		if (!gerente.requiereCambioContrasena) {
			throw new Error('El gerente ya activó su cuenta. No es posible reenviar credenciales. Si perdió el acceso, puede usar "Olvidé mi contraseña" desde el login.');
		}

		// Generar nueva contraseña provisional
		const contrasenaProvisional = generarContrasenaProvisional();
		const contrasenaHash = await bcrypt.hash(contrasenaProvisional, SALT_ROUNDS);

		// Actualizar contraseña + forzar cambio
		await db
			.update(usuarios)
			.set({
				contrasenaHash,
				requiereCambioContrasena: true,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(usuarios.id, gerente.id));

		return {
			success: true,
			gerente: { nombre: gerente.nombre, correo: gerente.correo },
			contrasenaProvisional, // Para enviar en el email
		};
	} catch (error) {
		if (error instanceof Error && error.message.includes('gerente')) {
			throw error;
		}
		console.error('Error al reenviar credenciales:', error);
		throw new Error('Error al reenviar credenciales');
	}
};

// ============================================
// REVOCAR GERENTE
// ============================================

export const revocarGerente = async (sucursalId: string, negocioId?: string) => {
	try {
		if (negocioId) await validarPropiedadSucursal(sucursalId, negocioId);
		const gerente = await obtenerGerenteSucursal(sucursalId);
		if (!gerente) {
			throw new Error('Esta sucursal no tiene gerente asignado');
		}

		// Revocar: volver a modo personal
		await db
			.update(usuarios)
			.set({
				sucursalAsignada: null,
				negocioId: null,
				modoActivo: 'personal',
				tieneModoComercial: false,
				perfil: 'personal',
				updatedAt: new Date().toISOString(),
			})
			.where(eq(usuarios.id, gerente.id));

		return {
			success: true,
			gerenteRevocado: { nombre: gerente.nombre, correo: gerente.correo },
		};
	} catch (error) {
		if (error instanceof Error && error.message.includes('gerente')) {
			throw error;
		}
		console.error('Error al revocar gerente:', error);
		throw new Error('Error al revocar gerente');
	}
};
