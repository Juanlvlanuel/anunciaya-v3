/**
 * probar-usuarios-acciones.ts — HARNESS (DEV) · Fase 2 ACTUAR del módulo Usuarios
 * ===============================================================================
 * Verifica las 5 acciones del módulo Usuarios contra la BD real, sobre un usuario de PRUEBA
 * que el script CREA y BORRA al final (no toca datos reales):
 *   Soporte:    desbloquearIntentos · enviarAcceso · cambiarCorreoUsuario
 *   Moderación: suspenderUsuario · reactivarUsuario
 * Más los guards: auto-suspensión, cuenta de equipo, unicidad de correo, y la auditoría.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-usuarios-acciones.ts
 *
 * Ubicación: apps/api/scripts/probar-usuarios-acciones.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import {
    desbloquearIntentos,
    generarCodigoAcceso,
    cambiarCorreoUsuario,
    suspenderUsuario,
    reactivarUsuario,
} from '../src/services/admin/usuarios-acciones.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

interface FilaUsuario {
    estado: string;
    motivo_cambio_estado: string | null;
    fecha_cambio_estado: string | null;
    fecha_reactivacion: string | null;
    bloqueado_hasta: string | null;
    intentos_fallidos: number | null;
    correo: string;
    correo_verificado: boolean | null;
}

async function leer(id: string): Promise<FilaUsuario> {
    const [u] = (await db.execute(sql`
        SELECT estado, motivo_cambio_estado, fecha_cambio_estado, fecha_reactivacion,
               bloqueado_hasta, intentos_fallidos, correo, correo_verificado
        FROM usuarios WHERE id = ${id}
    `)).rows as FilaUsuario[];
    return u;
}

async function main(): Promise<void> {
    // Actor: un superadmin real (para que la FK de auditoría sea válida).
    const [sa] = (await db.execute(sql`SELECT id::text AS id, correo FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`))
        .rows as Array<{ id: string; correo: string }>;
    if (!sa) {
        console.error('No hay superadmin en la BD; aborta.');
        process.exit(1);
    }
    const panelSuper: UsuarioPanel = {
        usuarioId: sa.id, rolEquipo: 'superadmin', regionId: null, viaSecret: false,
        panel2faHabilitado: false, panel2faOk: true,
    };

    // Usuario de prueba: nace activo y SIN contraseña (modelo C).
    const correoPrueba = `prueba-acciones-${Date.now()}@anunciaya-test.local`;
    const [creado] = (await db.execute(sql`
        INSERT INTO usuarios (nombre, apellidos, correo)
        VALUES ('Prueba', 'Acciones', ${correoPrueba})
        RETURNING id::text AS id
    `)).rows as Array<{ id: string }>;
    const id = creado.id;
    console.log(`\nUsuario de prueba creado: ${id} (${correoPrueba})`);

    try {
        console.log('\n[1] generarCodigoAcceso — cuenta sin contraseña → tipo "crear" + código');
        const acc = await generarCodigoAcceso(panelSuper, id);
        verificar('ok', acc.ok === true);
        verificar('tipo = crear', acc.ok && acc.tipo === 'crear', acc.ok ? acc.tipo : '');
        verificar('devuelve código de 6 dígitos', acc.ok && /^\d{6}$/.test(acc.codigo), acc.ok ? acc.codigo : '');

        console.log('\n[2] desbloquearIntentos');
        const sin = await desbloquearIntentos(panelSuper, id);
        verificar('sin bloqueo → 409', !sin.ok && sin.status === 409, sin.ok ? 'ok' : sin.mensaje);
        await db.execute(sql`UPDATE usuarios SET bloqueado_hasta = now() + interval '1 hour', intentos_fallidos = 5 WHERE id = ${id}`);
        const des = await desbloquearIntentos(panelSuper, id);
        verificar('con bloqueo → ok', des.ok === true);
        const u2 = await leer(id);
        verificar('bloqueado_hasta limpiado', u2.bloqueado_hasta === null);
        verificar('intentos_fallidos = 0', (u2.intentos_fallidos ?? 0) === 0);

        console.log('\n[3] suspenderUsuario (super)');
        const sus = await suspenderUsuario(panelSuper, id, 'Prueba de suspensión');
        verificar('ok', sus.ok === true);
        const u3 = await leer(id);
        verificar("estado = 'suspendido'", u3.estado === 'suspendido', u3.estado);
        verificar('motivo guardado', u3.motivo_cambio_estado === 'Prueba de suspensión');
        verificar('fecha_cambio_estado seteada', !!u3.fecha_cambio_estado);
        const susDup = await suspenderUsuario(panelSuper, id, 'otra');
        verificar('suspender de nuevo → 409', !susDup.ok && susDup.status === 409, susDup.ok ? 'ok' : susDup.mensaje);

        console.log('\n[4] reactivarUsuario (super)');
        const rea = await reactivarUsuario(panelSuper, id, 'Resuelto');
        verificar('ok', rea.ok === true);
        const u4 = await leer(id);
        verificar("estado = 'activo'", u4.estado === 'activo', u4.estado);
        verificar('fecha_reactivacion seteada', !!u4.fecha_reactivacion);
        const reaDup = await reactivarUsuario(panelSuper, id, null);
        verificar('reactivar de nuevo → 409', !reaDup.ok && reaDup.status === 409, reaDup.ok ? 'ok' : reaDup.mensaje);

        console.log('\n[5] Guards de suspensión');
        const panelAuto: UsuarioPanel = { ...panelSuper, usuarioId: id };
        const auto = await suspenderUsuario(panelAuto, id, 'yo mismo');
        verificar('auto-suspensión → 409', !auto.ok && auto.status === 409, auto.ok ? 'ok' : auto.mensaje);
        await db.execute(sql`UPDATE usuarios SET rol_equipo = 'gerente' WHERE id = ${id}`);
        const eq = await suspenderUsuario(panelSuper, id, 'equipo');
        verificar('cuenta de equipo → 409', !eq.ok && eq.status === 409, eq.ok ? 'ok' : eq.mensaje);
        await db.execute(sql`UPDATE usuarios SET rol_equipo = NULL WHERE id = ${id}`);

        console.log('\n[6] cambiarCorreoUsuario');
        const correoNuevo = `prueba-nuevo-${Date.now()}@anunciaya-test.local`;
        const cam = await cambiarCorreoUsuario(panelSuper, id, correoNuevo);
        verificar('ok', cam.ok === true);
        const u6 = await leer(id);
        verificar('correo actualizado', u6.correo === correoNuevo, u6.correo);
        verificar('correo_verificado = false', u6.correo_verificado === false);
        const dup = await cambiarCorreoUsuario(panelSuper, id, sa.correo.toLowerCase());
        verificar('correo en uso → 409', !dup.ok && dup.status === 409, dup.ok ? 'ok' : dup.mensaje);

        console.log('\n[7] Auditoría — cada acción dejó su fila');
        const [aud] = (await db.execute(sql`
            SELECT count(*)::int AS n FROM admin_auditoria WHERE entidad_tipo = 'usuario' AND entidad_id = ${id}
        `)).rows as Array<{ n: number }>;
        verificar('≥ 5 filas de auditoría', aud.n >= 5, `n=${aud.n}`);
    } finally {
        // Limpieza: borrar auditoría del usuario de prueba + el usuario.
        await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_tipo = 'usuario' AND entidad_id = ${id}`);
        await db.execute(sql`DELETE FROM usuarios WHERE id = ${id}`);
        console.log(`\nUsuario de prueba ${id} y su auditoría: eliminados.`);
    }

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
