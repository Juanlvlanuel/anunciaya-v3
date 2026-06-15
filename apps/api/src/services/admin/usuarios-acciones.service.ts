/**
 * admin/usuarios-acciones.service.ts
 * ==================================
 * Acciones de ESCRITURA de la sección Usuarios del Panel (Fase 2). Dos planos:
 *
 *   SOPORTE (superadmin + gerente · cross-región — los usuarios no tienen región hoy):
 *     - desbloquearIntentos  — limpia el bloqueo por intentos fallidos (deja entrar de nuevo)
 *     - enviarAcceso         — reenvía el código para CREAR la contraseña (cuenta sin contraseña,
 *                              modelo C) o para RESTABLECERLA (cuenta con contraseña). Best-effort:
 *                              devuelve si el correo salió y de qué tipo fue.
 *     - cambiarCorreoUsuario — corrige el correo de la cuenta y reenvía el código (calco de
 *                              `cambiarCorreoDueno` de Negocios). El correo nuevo nace sin verificar.
 *
 *   MODERACIÓN (SOLO superadmin · la ruta lo restringe):
 *     - suspenderUsuario  — bloquea el acceso a TODA la app (estado='suspendido'); el login ya
 *                           corta a las cuentas no-activas. Motivo obligatorio.
 *     - reactivarUsuario  — vuelve a 'activo'. Motivo opcional.
 *
 * Toda acción queda en `admin_auditoria` (actor + antes/después + motivo). Sin alcance regional:
 * el control de quién puede hacer qué lo decide `requierePanel` en la ruta. Las cuentas de EQUIPO
 * (rol_equipo) NO se moderan desde aquí (se gestionan en "Equipo y accesos").
 *
 * Ubicación: apps/api/src/services/admin/usuarios-acciones.service.ts
 */

import { eq, sql } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { db } from '../../db/index.js';
import { usuarios } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { guardarCodigoRecuperacion } from '../../utils/tokenStore.js';
import { enviarCodigoCrearContrasena, enviarCodigoRecuperacion } from '../../utils/email.js';

// =============================================================================
// TIPOS
// =============================================================================

export type ResultadoAccionUsuario =
    | { ok: true }
    | { ok: false; status: number; mensaje: string };

export type ResultadoCodigoAcceso =
    | { ok: true; codigo: string; tipo: 'crear' | 'restablecer'; correoEnviado: boolean }
    | { ok: false; status: number; mensaje: string };

export type ResultadoCambioCorreo =
    | { ok: true; correoEnviado: boolean }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// HELPER: cargar la cuenta (sin alcance regional — super/gerente actúan sobre cualquiera)
// =============================================================================

interface UsuarioCargado {
    id: string;
    estado: string;
    rolEquipo: string | null;
    negocioId: string | null;
    regionNegocio: string | null;  // región deducida si es comerciante (sucursal matriz), null si no
    regionVendedor: string | null; // región deducida si es vendedor (embajador_ciudades), null si no
    correo: string;
    nombre: string;
    contrasenaHash: string | null;
    intentosFallidos: number | null;
    bloqueadoHasta: string | null;
}

async function cargarUsuario(usuarioId: string): Promise<UsuarioCargado | null> {
    const [u] = await db
        .select({
            id: usuarios.id,
            estado: usuarios.estado,
            rolEquipo: usuarios.rolEquipo,
            correo: usuarios.correo,
            nombre: usuarios.nombre,
            contrasenaHash: usuarios.contrasenaHash,
            intentosFallidos: usuarios.intentosFallidos,
            bloqueadoHasta: usuarios.bloqueadoHasta,
            negocioId: usuarios.negocioId,
            // Región del negocio (sucursal matriz, igual que el módulo Negocios); null si no es comerciante.
            // Refs a la tabla externa CALIFICADAS (usuarios.col): en subquery dentro del SELECT, drizzle
            // no prefija ${usuarios.x}, y "id"/"negocio_id" chocarían con las tablas del JOIN (42702).
            regionNegocio: sql<string | null>`(
                SELECT c.region_id::text FROM negocio_sucursales ns
                JOIN ciudades c ON c.id = ns.ciudad_id
                WHERE ns.negocio_id = usuarios.negocio_id AND ns.es_principal = true LIMIT 1
            )`,
            // Región del vendedor (deducida de embajador_ciudades, igual que panel.middleware); null si no es vendedor.
            regionVendedor: sql<string | null>`(
                SELECT c.region_id::text FROM embajadores e
                JOIN embajador_ciudades ec ON ec.embajador_id = e.id
                JOIN ciudades c ON c.id = ec.ciudad_id
                WHERE e.usuario_id = usuarios.id LIMIT 1
            )`,
        })
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);
    return u ?? null;
}

/** Visibilidad por jerarquía: un GERENTE no puede actuar sobre cuentas de superadmin ni de gerente
 *  (incluida la suya). El superadmin actúa sobre cualquiera. Devuelve el error o null si está permitido. */
function fueraDeAlcance(
    panel: UsuarioPanel,
    target: UsuarioCargado,
): { ok: false; status: number; mensaje: string } | null {
    if (panel.rolEquipo !== 'gerente') return null; // el superadmin actúa sobre cualquiera
    // Nunca sobre superadmin ni gerente (incluida su propia cuenta).
    if (target.rolEquipo === 'superadmin' || target.rolEquipo === 'gerente') {
        return { ok: false, status: 403, mensaje: 'No tienes acceso a esta cuenta.' };
    }
    // Comerciante (cliente con negocio): solo los de MI región. Cliente puro (sin negocio): permitido.
    if (target.rolEquipo == null && target.negocioId != null && (!panel.regionId || target.regionNegocio !== panel.regionId)) {
        return { ok: false, status: 403, mensaje: 'Ese comercio no es de tu región.' };
    }
    // Vendedores: solo los de SU región (misma deducción que la lista).
    if (target.rolEquipo === 'vendedor' && (!panel.regionId || target.regionVendedor !== panel.regionId)) {
        return { ok: false, status: 403, mensaje: 'Ese vendedor no es de tu región.' };
    }
    return null;
}

/**
 * Genera un código de acceso, lo guarda (tokenStore, igual que el self-service de crear/restablecer
 * contraseña) e intenta enviarlo por correo (best-effort). Devuelve el CÓDIGO (para que el agente lo
 * dicte al usuario cuando el correo no llega) y si el envío salió. `codigo=null` si no se pudo guardar.
 * 'crear' = cuenta sin contraseña (modelo C) · 'restablecer' = cuenta con contraseña. No lanza.
 */
async function prepararCodigoAcceso(
    correo: string,
    nombre: string,
    tipo: 'crear' | 'restablecer',
): Promise<{ codigo: string | null; correoEnviado: boolean }> {
    const codigo = String(randomInt(100000, 1000000));
    const guardado = await guardarCodigoRecuperacion(correo, codigo);
    if (!guardado) return { codigo: null, correoEnviado: false };
    let correoEnviado = false;
    try {
        const env =
            tipo === 'crear'
                ? await enviarCodigoCrearContrasena(correo, nombre, codigo)
                : await enviarCodigoRecuperacion(correo, nombre, codigo);
        correoEnviado = env.success;
    } catch (error) {
        console.error('Error enviando el código de acceso por correo:', error);
    }
    return { codigo, correoEnviado };
}

// =============================================================================
// SOPORTE — Desbloquear intentos (super + gerente)
// =============================================================================

export async function desbloquearIntentos(
    panel: UsuarioPanel,
    usuarioId: string,
): Promise<ResultadoAccionUsuario> {
    const u = await cargarUsuario(usuarioId);
    if (!u) return { ok: false, status: 404, mensaje: 'Usuario no encontrado.' };

    const sinAlcance = fueraDeAlcance(panel, u);
    if (sinAlcance) return sinAlcance;

    const bloqueado = !!u.bloqueadoHasta && new Date(u.bloqueadoHasta).getTime() > Date.now();
    if (!bloqueado && (u.intentosFallidos ?? 0) === 0) {
        return { ok: false, status: 409, mensaje: 'La cuenta no está bloqueada por intentos.' };
    }

    const ahora = new Date().toISOString();
    await db
        .update(usuarios)
        .set({ bloqueadoHasta: null, intentosFallidos: 0, updatedAt: ahora })
        .where(eq(usuarios.id, usuarioId));

    await registrarAuditoria(panel, {
        accion: 'usuario_desbloquear_intentos',
        entidadTipo: 'usuario',
        entidadId: usuarioId,
        datosPrevios: { bloqueadoHasta: u.bloqueadoHasta, intentosFallidos: u.intentosFallidos },
        datosNuevos: { bloqueadoHasta: null, intentosFallidos: 0 },
        motivo: null,
    });

    return { ok: true };
}

// =============================================================================
// SOPORTE — Código de acceso (crear / restablecer contraseña) (super + gerente)
// =============================================================================

/**
 * Genera un código de acceso para la cuenta y lo DEVUELVE (para que el agente lo dicte al usuario
 * cuando el correo no llega) — además de enviarlo por correo. Es más robusto que el self-service:
 * no depende de que el correo llegue. El código (un solo uso, expira) NO se guarda en la auditoría.
 */
export async function generarCodigoAcceso(
    panel: UsuarioPanel,
    usuarioId: string,
): Promise<ResultadoCodigoAcceso> {
    const u = await cargarUsuario(usuarioId);
    if (!u) return { ok: false, status: 404, mensaje: 'Usuario no encontrado.' };

    const sinAlcance = fueraDeAlcance(panel, u);
    if (sinAlcance) return sinAlcance;

    // Sin contraseña (modelo C) → crear; con contraseña → restablecer.
    const tipo: 'crear' | 'restablecer' = u.contrasenaHash ? 'restablecer' : 'crear';
    const { codigo, correoEnviado } = await prepararCodigoAcceso(u.correo, u.nombre, tipo);
    if (!codigo) return { ok: false, status: 500, mensaje: 'No se pudo generar el código. Reinténtalo.' };

    await registrarAuditoria(panel, {
        accion: 'usuario_generar_codigo_acceso',
        entidadTipo: 'usuario',
        entidadId: usuarioId,
        datosPrevios: null,
        datosNuevos: { tipo, correoEnviado }, // el código NO se audita (seguridad)
        motivo: null,
    });

    return { ok: true, codigo, tipo, correoEnviado };
}

// =============================================================================
// SOPORTE — Corregir el correo de la cuenta (super + gerente)
// =============================================================================

export async function cambiarCorreoUsuario(
    panel: UsuarioPanel,
    usuarioId: string,
    correoNuevo: string,            // ya normalizado (lowercase/trim) por el schema Zod del controller
): Promise<ResultadoCambioCorreo> {
    const u = await cargarUsuario(usuarioId);
    if (!u) return { ok: false, status: 404, mensaje: 'Usuario no encontrado.' };

    const sinAlcance = fueraDeAlcance(panel, u);
    if (sinAlcance) return sinAlcance;

    if (u.correo === correoNuevo) {
        return { ok: false, status: 409, mensaje: 'La cuenta ya tiene ese correo.' };
    }

    // Unicidad: el correo nuevo no debe pertenecer a OTRA cuenta.
    const enUso = (await db.execute(
        sql`SELECT 1 FROM usuarios WHERE correo = ${correoNuevo} AND id <> ${usuarioId} LIMIT 1`,
    )).rows.length > 0;
    if (enUso) return { ok: false, status: 409, mensaje: 'Ya existe una cuenta con ese correo.' };

    const ahora = new Date().toISOString();
    // El correo nuevo nace SIN verificar (se verifica al usar el código de acceso).
    await db
        .update(usuarios)
        .set({ correo: correoNuevo, correoVerificado: false, correoVerificadoAt: null, updatedAt: ahora })
        .where(eq(usuarios.id, usuarioId));

    await registrarAuditoria(panel, {
        accion: 'usuario_cambiar_correo',
        entidadTipo: 'usuario',
        entidadId: usuarioId,
        datosPrevios: { correo: u.correo },
        datosNuevos: { correo: correoNuevo },
        motivo: null,
    });

    // Reenvío del código al correo corregido (best-effort; el cambio ya quedó guardado).
    const tipo: 'crear' | 'restablecer' = u.contrasenaHash ? 'restablecer' : 'crear';
    const { correoEnviado } = await prepararCodigoAcceso(correoNuevo, u.nombre, tipo);

    return { ok: true, correoEnviado };
}

// =============================================================================
// MODERACIÓN — Suspender (SOLO superadmin)
// =============================================================================

export async function suspenderUsuario(
    panel: UsuarioPanel,
    usuarioId: string,
    motivo: string,
): Promise<ResultadoAccionUsuario> {
    const u = await cargarUsuario(usuarioId);
    if (!u) return { ok: false, status: 404, mensaje: 'Usuario no encontrado.' };

    // Auto-protección: nadie se suspende a sí mismo.
    if (panel.usuarioId && panel.usuarioId === usuarioId) {
        return { ok: false, status: 409, mensaje: 'No puedes suspender tu propia cuenta.' };
    }
    // Las cuentas de equipo se gestionan en "Equipo y accesos", no aquí.
    if (u.rolEquipo) {
        return { ok: false, status: 409, mensaje: 'Es una cuenta de equipo; gestiónala en "Equipo y accesos".' };
    }
    if (u.estado === 'suspendido') {
        return { ok: false, status: 409, mensaje: 'La cuenta ya está suspendida.' };
    }

    const ahora = new Date().toISOString();
    await db
        .update(usuarios)
        .set({ estado: 'suspendido', fechaCambioEstado: ahora, motivoCambioEstado: motivo, updatedAt: ahora })
        .where(eq(usuarios.id, usuarioId));

    await registrarAuditoria(panel, {
        accion: 'usuario_suspender',
        entidadTipo: 'usuario',
        entidadId: usuarioId,
        datosPrevios: { estado: u.estado },
        datosNuevos: { estado: 'suspendido' },
        motivo,
    });

    return { ok: true };
}

// =============================================================================
// MODERACIÓN — Reactivar (SOLO superadmin)
// =============================================================================

export async function reactivarUsuario(
    panel: UsuarioPanel,
    usuarioId: string,
    motivo?: string | null,
): Promise<ResultadoAccionUsuario> {
    const u = await cargarUsuario(usuarioId);
    if (!u) return { ok: false, status: 404, mensaje: 'Usuario no encontrado.' };

    if (u.estado === 'activo') {
        return { ok: false, status: 409, mensaje: 'La cuenta ya está activa.' };
    }

    const ahora = new Date().toISOString();
    await db
        .update(usuarios)
        .set({
            estado: 'activo',
            fechaCambioEstado: ahora,
            motivoCambioEstado: motivo ?? null,
            updatedAt: ahora,
        })
        .where(eq(usuarios.id, usuarioId));

    await registrarAuditoria(panel, {
        accion: 'usuario_reactivar',
        entidadTipo: 'usuario',
        entidadId: usuarioId,
        datosPrevios: { estado: u.estado },
        datosNuevos: { estado: 'activo' },
        motivo: motivo ?? null,
    });

    return { ok: true };
}
