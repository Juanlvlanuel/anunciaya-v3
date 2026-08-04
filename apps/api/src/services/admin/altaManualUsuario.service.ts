/**
 * admin/altaManualUsuario.service.ts
 * ===================================
 * Alta MANUAL de un usuario en Modo Personal (sin negocio) desde el Panel — soporte/mesa de
 * ayuda: crear la cuenta de alguien que no puede/no quiere autoregistrarse (ej. persona mayor,
 * caso de soporte telefónico). SOLO superadmin + gerente (la ruta lo restringe); NO es una venta,
 * así que el vendedor no la tiene.
 *
 * Reusa `listarCatalogoCiudades` y `existeCorreo` de altaManualNegocio.service.ts (mismo catálogo
 * y misma comprobación — CLAUDE.md: no duplicar lógica) y `prepararCodigoAcceso` de
 * usuarios-acciones.service.ts (mismo mecanismo que "generar código de acceso" para una cuenta
 * ya existente).
 *
 * Contraseña OPCIONAL (igual que el alta manual de negocio): si el admin la define, la cuenta
 * nace con acceso y el correo se da por verificado (sin correo); si se omite, se le manda el
 * código para crear su contraseña (modelo C).
 *
 * Ubicación: apps/api/src/services/admin/altaManualUsuario.service.ts
 */

import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { usuarios } from '../../db/schemas/schema.js';
import { registrarAuditoria } from './auditoria.service.js';
import { prepararCodigoAcceso } from './usuarios-acciones.service.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import type { AltaManualUsuarioInput } from '../../validations/admin/altaManualUsuario.schema.js';

export type ResultadoAltaUsuario =
    | { ok: true; usuarioId: string }
    | { ok: false; status: number; mensaje: string };

export async function altaManualUsuario(
    panel: UsuarioPanel,
    datos: AltaManualUsuarioInput,
): Promise<ResultadoAltaUsuario> {
    // -------------------------------------------------------------------------
    // 1) El correo NO debe existir.
    // -------------------------------------------------------------------------
    const correoExiste = (await db.execute(
        sql`SELECT 1 FROM usuarios WHERE correo = ${datos.correo} LIMIT 1`,
    )).rows.length > 0;
    if (correoExiste) {
        return { ok: false, status: 409, mensaje: 'Ya existe una cuenta con ese correo.' };
    }

    // -------------------------------------------------------------------------
    // 2) Ciudad: debe existir, estar activa y (gerente) ser de SU región.
    // -------------------------------------------------------------------------
    const [ciudad] = (await db.execute(sql`
        SELECT id::text AS id, nombre, region_id::text AS region_id, activa
        FROM ciudades WHERE id = ${datos.ciudadId} LIMIT 1
    `)).rows as Array<{ id: string; nombre: string; region_id: string | null; activa: boolean }>;

    if (!ciudad) return { ok: false, status: 404, mensaje: 'La ciudad seleccionada no existe.' };
    if (!ciudad.activa) return { ok: false, status: 409, mensaje: 'La ciudad seleccionada no está disponible.' };

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return { ok: false, status: 403, mensaje: 'No tienes una región asignada.' };
        if (ciudad.region_id !== panel.regionId) {
            return { ok: false, status: 403, mensaje: 'La ciudad seleccionada no pertenece a tu región.' };
        }
    }

    // -------------------------------------------------------------------------
    // 3) Alta: contraseña opcional (modelo C si se omite; ver docstring del archivo).
    // -------------------------------------------------------------------------
    const contrasenaHash = datos.contrasena ? await bcrypt.hash(datos.contrasena, 12) : null;
    const correoVerificado = !!datos.contrasena;
    const ahora = new Date().toISOString();

    const [usuario] = await db
        .insert(usuarios)
        .values({
            nombre: datos.nombre,
            apellidos: datos.apellidos,
            correo: datos.correo,
            contrasenaHash,
            telefono: datos.telefono ?? null,
            ciudadId: ciudad.id,
            correoVerificado,
            correoVerificadoAt: correoVerificado ? ahora : null,
        })
        .returning();

    await registrarAuditoria(panel, {
        accion: 'usuario_alta_manual',
        entidadTipo: 'usuario',
        entidadId: usuario.id,
        datosPrevios: null,
        datosNuevos: { nombre: datos.nombre, apellidos: datos.apellidos, correo: datos.correo, ciudadId: ciudad.id },
        motivo: null,
    });

    // Sin contraseña definida por el admin → enviar el código para crearla (best-effort).
    if (!datos.contrasena) {
        await prepararCodigoAcceso(datos.correo, datos.nombre, 'crear');
    }

    return { ok: true, usuarioId: usuario.id };
}
