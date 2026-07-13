/**
 * admin/equipo-acciones.service.ts
 * ================================
 * Acciones de ESCRITURA del módulo "Equipo y accesos" (vendedores Y gerentes).
 *
 *   - sugerirCodigoReferido — propone un código único derivado del nombre (autogenerado editable, E3).
 *   - altaVendedor          — crea una cuenta NUEVA (modelo C) o PROMUEVE una existente sin rol de
 *                             equipo (E1), + embajador (código) + ciudades. Si la cuenta ya es del
 *                             equipo → 409. Reactiva a un vendedor dado de baja (su embajador persiste).
 *                             Cuenta nueva → envía el código para crear contraseña (E2, best-effort).
 *   - revocarAcceso         — corta el acceso (vendedor: + embajador inactivo; gerente: solo super). Conserva datos/región.
 *   - reactivarAcceso       — devuelve el acceso a un vendedor o gerente revocado.
 *   - altaGerente           — crea/promueve un gerente (rol + region_id). Solo superadmin.
 *   - editarDatos           — corrige nombre/apellidos/teléfono/correo de un miembro (alcance por rol).
 *   - reasignarRegion       — cambia la región de un gerente. Solo superadmin.
 *   - editarCiudades        — agrega/quita ciudades a un vendedor DENTRO de su región (Caso A).
 *
 * NOTA: cambiar las ciudades de un vendedor dentro de SU región ya vive aquí (editarCiudades). Lo que
 * sigue diferido a "Vendedores y comisiones" es la multi-región (Pieza F): mover un vendedor a OTRA
 * región (= soltar la cartera). Ver Equipo_y_accesos_Pendientes.md §Diferido.
 *
 * ALCANCE (sincronizado con la lectura): el gerente solo crea/revoca/reactiva vendedores de SU región;
 * el superadmin sobre cualquier región. Toda acción → admin_auditoria.
 *
 * Ubicación: apps/api/src/services/admin/equipo-acciones.service.ts
 */

import { and, eq, sql } from 'drizzle-orm';
import { randomInt } from 'crypto';
import { db } from '../../db/index.js';
import { usuarios, embajadores, regiones } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { guardarCodigoRecuperacion } from '../../utils/tokenStore.js';
import { enviarCodigoCrearContrasena, enviarEmailBienvenidaEquipo } from '../../utils/email.js';
import type { AltaVendedorInput, AltaGerenteInput, EditarDatosInput } from '../../validations/admin/equipo.schema.js';

export type ResultadoAccionEquipo =
    | { ok: true }
    | { ok: false; status: number; mensaje: string };

export type ResultadoAlta =
    | { ok: true; usuarioId: string; promovido: boolean; correoEnviado: boolean }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// HELPERS
// =============================================================================

/** Quita acentos y deja solo A–Z0–9 en mayúsculas (para derivar el código de referido). */
function soloAlfaNum(s: string): string {
    return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** ¿El código ya está en uso? Comparación CASE-SENSITIVE (coherente con la resolución del ?ref=). */
async function codigoEnUso(codigo: string): Promise<boolean> {
    return (await db.execute(
        sql`SELECT 1 FROM embajadores WHERE codigo_referido = ${codigo} LIMIT 1`,
    )).rows.length > 0;
}

/**
 * Propone un código de referido ÚNICO derivado del nombre (ej. "Juan Pérez" → "JUANP01").
 * Busca el primer sufijo numérico libre; si todos chocan, cae a un sufijo aleatorio.
 */
export async function sugerirCodigoReferido(nombre: string, apellidos: string): Promise<string> {
    const base = (soloAlfaNum(nombre).slice(0, 4) + soloAlfaNum(apellidos).slice(0, 1)) || 'VEND';
    for (let i = 1; i <= 99; i++) {
        const cand = `${base}${String(i).padStart(2, '0')}`;
        if (!(await codigoEnUso(cand))) return cand;
    }
    for (let intento = 0; intento < 20; intento++) {
        const cand = `${base}${randomInt(100, 1000)}`;
        if (!(await codigoEnUso(cand))) return cand;
    }
    // Último recurso: base + timestamp-ish aleatorio largo (prácticamente imposible llegar aquí).
    return `${base}${randomInt(1000, 100000)}`;
}

interface MiembroCargado {
    id: string;
    rolEquipo: string | null;
    embajadorId: string | null;
    regionVendedor: string | null; // región deducida de embajador_ciudades (vendedor)
    regionId: string | null;       // usuarios.region_id (gerente / ex-gerente)
    correo: string;
    nombre: string;
    apellidos: string;
    telefono: string | null;
    tieneContrasena: boolean;
}

/** Carga una cuenta del equipo + sus datos derivados (embajador, región del vendedor y del gerente). */
async function cargarMiembro(usuarioId: string): Promise<MiembroCargado | null> {
    const [u] = await db
        .select({
            id: usuarios.id,
            rolEquipo: usuarios.rolEquipo,
            correo: usuarios.correo,
            nombre: usuarios.nombre,
            apellidos: usuarios.apellidos,
            telefono: usuarios.telefono,
            regionId: usuarios.regionId,
            tieneContrasena: sql<boolean>`(${usuarios.contrasenaHash} IS NOT NULL)`,
            embajadorId: sql<string | null>`(SELECT e.id::text FROM embajadores e WHERE e.usuario_id = usuarios.id LIMIT 1)`,
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

/** Un gerente solo actúa sobre vendedores de SU región (activos o revocados); el super sobre cualquiera.
 *  Se basa en tener embajador + región deducida (no en rol_equipo) para que cubra también a los revocados. */
function vendedorFueraDeAlcance(
    panel: UsuarioPanel,
    target: MiembroCargado,
): { ok: false; status: number; mensaje: string } | null {
    if (panel.rolEquipo !== 'gerente') return null;
    if (!target.embajadorId) {
        return { ok: false, status: 403, mensaje: 'No tienes acceso a esta cuenta.' };
    }
    if (!panel.regionId || target.regionVendedor !== panel.regionId) {
        return { ok: false, status: 403, mensaje: 'Ese vendedor no es de tu región.' };
    }
    return null;
}

/** Valida un conjunto de ciudades: existen, están activas y TODAS son de una misma región.
 *  Devuelve la región común (para validar el alcance del gerente). */
async function validarCiudades(
    ciudadIds: string[],
): Promise<{ ok: true; regionId: string } | { ok: false; status: number; mensaje: string }> {
    const lista = sql.join(ciudadIds.map((id) => sql`${id}::uuid`), sql`, `);
    const filas = (await db.execute(sql`
        SELECT id::text AS id, region_id::text AS region_id, activa
        FROM ciudades WHERE id IN (${lista})
    `)).rows as Array<{ id: string; region_id: string | null; activa: boolean }>;

    if (filas.length !== new Set(ciudadIds).size) {
        return { ok: false, status: 404, mensaje: 'Alguna ciudad seleccionada no existe.' };
    }
    if (filas.some((f) => !f.activa)) {
        return { ok: false, status: 409, mensaje: 'Alguna ciudad seleccionada no está disponible.' };
    }
    const regiones = new Set(filas.map((f) => f.region_id));
    if (regiones.size !== 1 || filas[0].region_id == null) {
        return { ok: false, status: 400, mensaje: 'Todas las ciudades deben pertenecer a la misma región.' };
    }
    return { ok: true, regionId: filas[0].region_id };
}

/** Tipo del objeto de transacción que entrega `db.transaction(async (tx) => …)`. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Reemplaza la cobertura de ciudades de un embajador (dentro de una transacción). */
async function reemplazarCiudades(tx: Tx, embajadorId: string, ciudadIds: string[]): Promise<void> {
    await tx.execute(sql`DELETE FROM embajador_ciudades WHERE embajador_id = ${embajadorId}::uuid`);
    for (const cid of ciudadIds) {
        await tx.execute(sql`
            INSERT INTO embajador_ciudades (embajador_id, ciudad_id)
            VALUES (${embajadorId}::uuid, ${cid}::uuid)
            ON CONFLICT DO NOTHING
        `);
    }
}

/** Da al gerente su figura de VENDEDOR: un embajador ACTIVO (código autogenerado) que cubre todas las
 *  ciudades activas de su región, + esEmbajador=true. Idempotente: si ya tiene embajador, lo reactiva y
 *  re-sincroniza sus ciudades. Así el gerente trae negocios (cartera + comisiones) como un vendedor — la
 *  atribución y las comisiones cuelgan de `embajador_id`, sin mirar el rol. */
async function asegurarEmbajadorGerente(
    tx: Tx,
    usuarioId: string,
    nombre: string,
    apellidos: string,
    regionId: string,
): Promise<void> {
    // Cobertura = todas las ciudades ACTIVAS de su región.
    const ciudades = (await tx.execute(
        sql`SELECT id::text AS id FROM ciudades WHERE region_id = ${regionId}::uuid AND activa = true`,
    )).rows as Array<{ id: string }>;
    const ciudadIds = ciudades.map((c) => c.id);

    // Reactivar su embajador si ya existe, o crear uno nuevo (unique: 1 por usuario).
    const [emb] = (await tx.execute(
        sql`SELECT id::text AS id FROM embajadores WHERE usuario_id = ${usuarioId}::uuid LIMIT 1`,
    )).rows as Array<{ id: string }>;

    let embajadorId: string;
    if (emb) {
        embajadorId = emb.id;
        await tx.update(embajadores).set({ estado: 'activo' }).where(eq(embajadores.id, embajadorId));
    } else {
        const codigo = await sugerirCodigoReferido(nombre, apellidos);
        const [creado] = await tx
            .insert(embajadores)
            .values({ usuarioId, codigoReferido: codigo, estado: 'activo' })
            .returning({ id: embajadores.id });
        embajadorId = creado.id;
    }

    await reemplazarCiudades(tx, embajadorId, ciudadIds);
    await tx.update(usuarios).set({ esEmbajador: true }).where(eq(usuarios.id, usuarioId));
}

/** Envía el código para crear contraseña (modelo C) a una cuenta nueva. Best-effort: no lanza. */
async function enviarCodigoModeloC(correo: string, nombre: string): Promise<boolean> {
    const codigo = String(randomInt(100000, 1000000));
    const guardado = await guardarCodigoRecuperacion(correo, codigo);
    if (!guardado) return false;
    try {
        // 'panel': la cuenta del equipo activa su acceso en el Panel Admin, no en la app pública.
        const env = await enviarCodigoCrearContrasena(correo, nombre, codigo, 'panel');
        return env.success;
    } catch (error) {
        console.error('Error enviando el código de crear contraseña:', error);
        return false;
    }
}

// =============================================================================
// ALTA DE VENDEDOR (crear o promover) — E1, E2, E3
// =============================================================================

export async function altaVendedor(panel: UsuarioPanel, datos: AltaVendedorInput): Promise<ResultadoAlta> {
    // 1) Ciudades válidas + región común.
    const ciudadesOk = await validarCiudades(datos.ciudadIds);
    if (!ciudadesOk.ok) return ciudadesOk;
    const regionDestino = ciudadesOk.regionId;

    // 2) Alcance: el gerente solo da de alta en SU región.
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return { ok: false, status: 403, mensaje: 'No tienes una región asignada.' };
        if (regionDestino !== panel.regionId) {
            return { ok: false, status: 403, mensaje: 'Las ciudades seleccionadas no son de tu región.' };
        }
    }

    // 3) ¿La cuenta ya existe? Decide crear vs promover (E1).
    const filaCorreo = (await db.execute(
        sql`SELECT id::text AS id FROM usuarios WHERE correo = ${datos.correo} LIMIT 1`,
    )).rows[0] as { id: string } | undefined;
    const existente = filaCorreo ? await cargarMiembro(filaCorreo.id) : null;

    if (existente) {
        if (existente.rolEquipo === 'vendedor') {
            return { ok: false, status: 409, mensaje: 'Esa cuenta ya es un vendedor activo.' };
        }
        if (existente.rolEquipo === 'gerente' || existente.rolEquipo === 'superadmin') {
            return { ok: false, status: 409, mensaje: 'Esa cuenta ya pertenece al equipo con otro rol.' };
        }
        // rol_equipo === null → promover (incluye reactivar a un vendedor dado de baja, cuyo embajador persiste).
    }

    // 4) Si vamos a CREAR el embajador (no existe ya uno), el código debe estar libre.
    const reactivando = !!existente?.embajadorId;
    if (!reactivando && (await codigoEnUso(datos.codigoReferido))) {
        return { ok: false, status: 409, mensaje: 'Ese código de referido ya está en uso.' };
    }

    // 5) Transacción: crear/promover usuario + upsert embajador + ciudades.
    const resultado = await db.transaction(async (tx) => {
        let usuarioId: string;
        let esNuevo: boolean;

        if (existente) {
            usuarioId = existente.id;
            esNuevo = false;
            await tx
                .update(usuarios)
                .set({ rolEquipo: 'vendedor', esEmbajador: true, updatedAt: new Date().toISOString() })
                .where(eq(usuarios.id, usuarioId));
        } else {
            // Cuenta NUEVA — modelo C (sin contraseña; correo sin verificar; perfil personal).
            const [creado] = await tx
                .insert(usuarios)
                .values({
                    nombre: datos.nombre,
                    apellidos: datos.apellidos,
                    correo: datos.correo,
                    telefono: datos.telefono ?? null,
                    contrasenaHash: null,
                    correoVerificado: false,
                    perfil: 'personal',
                    estado: 'activo',
                    tieneModoComercial: false,
                    modoActivo: 'personal',
                    esEmbajador: true,
                    rolEquipo: 'vendedor',
                })
                .returning({ id: usuarios.id });
            usuarioId = creado.id;
            esNuevo = true;
        }

        // Embajador: reactivar el existente (conserva su código y atribuciones) o crear uno nuevo.
        let embajadorId: string;
        if (existente?.embajadorId) {
            embajadorId = existente.embajadorId;
            await tx
                .update(embajadores)
                .set({ estado: 'activo' })
                .where(eq(embajadores.id, embajadorId));
        } else {
            const [emb] = await tx
                .insert(embajadores)
                .values({ usuarioId, codigoReferido: datos.codigoReferido, estado: 'activo' })
                .returning({ id: embajadores.id });
            embajadorId = emb.id;
        }

        await reemplazarCiudades(tx, embajadorId, datos.ciudadIds);

        return { usuarioId, esNuevo };
    });

    // 6) Auditoría (best-effort).
    await registrarAuditoria(panel, {
        accion: resultado.esNuevo ? 'equipo_alta_vendedor' : 'equipo_promover_vendedor',
        entidadTipo: 'usuario',
        entidadId: resultado.usuarioId,
        datosPrevios: existente ? { rolEquipo: existente.rolEquipo } : null,
        datosNuevos: {
            rolEquipo: 'vendedor',
            codigoReferido: reactivando ? '(conservado)' : datos.codigoReferido,
            ciudadIds: datos.ciudadIds,
            regionId: regionDestino,
        },
        motivo: null,
    });

    // 7) Aviso por correo (best-effort):
    //    - cuenta nueva → código para crear contraseña (modelo C, E2; verifica el correo al usarlo).
    //    - promoción → aviso de bienvenida al equipo (la persona ya tiene su contraseña).
    let correoEnviado = false;
    if (resultado.esNuevo) {
        correoEnviado = await enviarCodigoModeloC(datos.correo, datos.nombre);
    } else {
        try {
            await enviarEmailBienvenidaEquipo(datos.correo, datos.nombre, 'vendedor');
        } catch (error) {
            console.error('Error enviando el aviso de bienvenida (promoción a vendedor):', error);
        }
    }

    return { ok: true, usuarioId: resultado.usuarioId, promovido: !resultado.esNuevo, correoEnviado };
}

// =============================================================================
// REVOCAR ACCESO (baja del vendedor) — D3
// =============================================================================

export async function revocarAcceso(panel: UsuarioPanel, miembroId: string): Promise<ResultadoAccionEquipo> {
    const v = await cargarMiembro(miembroId);
    if (!v) return { ok: false, status: 404, mensaje: 'Miembro del equipo no encontrado.' };

    // ── Vendedor ──────────────────────────────────────────────────────────────
    if (v.rolEquipo === 'vendedor') {
        const sinAlcance = vendedorFueraDeAlcance(panel, v);
        if (sinAlcance) return sinAlcance;
        // rol_equipo=NULL → corta el Panel al instante (requierePanel revalida en BD). El embajador queda
        // 'inactivo' (no cuenta para comisiones ni puede registrar). La ATRIBUCIÓN de sus negocios NO se toca.
        await db.transaction(async (tx) => {
            await tx.update(usuarios).set({ rolEquipo: null, updatedAt: new Date().toISOString() }).where(eq(usuarios.id, miembroId));
            if (v.embajadorId) {
                await tx.update(embajadores).set({ estado: 'inactivo' }).where(eq(embajadores.id, v.embajadorId));
            }
        });
        await registrarAuditoria(panel, {
            accion: 'equipo_revocar_acceso',
            entidadTipo: 'usuario',
            entidadId: miembroId,
            datosPrevios: { rolEquipo: 'vendedor', embajadorEstado: 'activo' },
            datosNuevos: { rolEquipo: null, embajadorEstado: 'inactivo' },
            motivo: null,
        });
        return { ok: true };
    }

    // ── Gerente (solo superadmin) ───────────────────────────────────────────────
    if (v.rolEquipo === 'gerente') {
        if (panel.rolEquipo !== 'superadmin') {
            return { ok: false, status: 403, mensaje: 'Solo el superadmin puede revocar el acceso de un gerente.' };
        }
        // rol_equipo=NULL corta el acceso al instante; se CONSERVA region_id para poder reactivarlo. Su
        // figura de vendedor (embajador) queda INACTIVA: no aparece en selectores ni recibe atribuciones.
        await db.transaction(async (tx) => {
            await tx.update(usuarios).set({ rolEquipo: null, updatedAt: new Date().toISOString() }).where(eq(usuarios.id, miembroId));
            if (v.embajadorId) {
                await tx.update(embajadores).set({ estado: 'inactivo' }).where(eq(embajadores.id, v.embajadorId));
            }
        });
        await registrarAuditoria(panel, {
            accion: 'equipo_revocar_acceso',
            entidadTipo: 'usuario',
            entidadId: miembroId,
            datosPrevios: { rolEquipo: 'gerente', regionId: v.regionId },
            datosNuevos: { rolEquipo: null },
            motivo: null,
        });
        return { ok: true };
    }

    return { ok: false, status: 409, mensaje: 'Solo se puede revocar el acceso de un vendedor o gerente.' };
}

// =============================================================================
// REACTIVAR ACCESO (vendedor revocado → vuelve a tener acceso)
// =============================================================================

export async function reactivarAcceso(panel: UsuarioPanel, miembroId: string): Promise<ResultadoAccionEquipo> {
    const v = await cargarMiembro(miembroId);
    if (!v) return { ok: false, status: 404, mensaje: 'Miembro del equipo no encontrado.' };
    if (v.rolEquipo) return { ok: false, status: 409, mensaje: 'El miembro ya tiene acceso.' };

    // ── Ex-gerente (conserva su region_id; solo superadmin) ──────────────────────
    // Se chequea ANTES que el ex-vendedor: un gerente ahora TAMBIÉN tiene embajador, así que su
    // `region_id` es lo que lo distingue (un vendedor no tiene region_id en `usuarios`).
    if (v.regionId) {
        if (panel.rolEquipo !== 'superadmin') {
            return { ok: false, status: 403, mensaje: 'Solo el superadmin puede reactivar a un gerente.' };
        }
        await db.transaction(async (tx) => {
            await tx.update(usuarios).set({ rolEquipo: 'gerente', esEmbajador: true, updatedAt: new Date().toISOString() }).where(eq(usuarios.id, miembroId));
            // Reactiva y re-sincroniza su figura de vendedor (embajador + ciudades de su región).
            await asegurarEmbajadorGerente(tx, miembroId, v.nombre, v.apellidos, v.regionId!);
        });
        await registrarAuditoria(panel, {
            accion: 'equipo_reactivar_acceso',
            entidadTipo: 'usuario',
            entidadId: miembroId,
            datosPrevios: { rolEquipo: null },
            datosNuevos: { rolEquipo: 'gerente', regionId: v.regionId },
            motivo: null,
        });
        return { ok: true };
    }

    // ── Ex-vendedor (conserva su embajador) ──────────────────────────────────────
    if (v.embajadorId) {
        const sinAlcance = vendedorFueraDeAlcance(panel, v);
        if (sinAlcance) return sinAlcance;
        const embajadorId = v.embajadorId;
        await db.transaction(async (tx) => {
            await tx.update(usuarios).set({ rolEquipo: 'vendedor', esEmbajador: true, updatedAt: new Date().toISOString() }).where(eq(usuarios.id, miembroId));
            await tx.update(embajadores).set({ estado: 'activo' }).where(eq(embajadores.id, embajadorId));
        });
        await registrarAuditoria(panel, {
            accion: 'equipo_reactivar_acceso',
            entidadTipo: 'usuario',
            entidadId: miembroId,
            datosPrevios: { rolEquipo: null, embajadorEstado: 'inactivo' },
            datosNuevos: { rolEquipo: 'vendedor', embajadorEstado: 'activo' },
            motivo: null,
        });
        return { ok: true };
    }

    return { ok: false, status: 409, mensaje: 'Esta cuenta no es un miembro del equipo reactivable.' };
}

// =============================================================================
// ALTA DE GERENTE (crear o promover) — solo superadmin
// =============================================================================

export async function altaGerente(panel: UsuarioPanel, datos: AltaGerenteInput): Promise<ResultadoAlta> {
    if (panel.rolEquipo !== 'superadmin') {
        return { ok: false, status: 403, mensaje: 'Solo el superadmin puede dar de alta gerentes.' };
    }
    // Región válida y activa.
    const [reg] = await db
        .select({ id: regiones.id })
        .from(regiones)
        .where(and(eq(regiones.id, datos.regionId), eq(regiones.activa, true)))
        .limit(1);
    if (!reg) return { ok: false, status: 404, mensaje: 'La región seleccionada no existe o no está activa.' };

    // ¿La cuenta ya existe? Promover si NO es del equipo; 409 si ya lo es.
    const filaCorreo = (await db.execute(
        sql`SELECT id::text AS id FROM usuarios WHERE correo = ${datos.correo} LIMIT 1`,
    )).rows[0] as { id: string } | undefined;
    const existente = filaCorreo ? await cargarMiembro(filaCorreo.id) : null;
    if (existente?.rolEquipo) {
        return { ok: false, status: 409, mensaje: 'Esa cuenta ya pertenece al equipo.' };
    }

    // Crea/promueve al gerente + le da su figura de VENDEDOR (embajador + ciudades de su región), en una
    // sola transacción, para que pueda traer negocios en su propia cartera (con comisiones) como un vendedor.
    const { usuarioId, esNuevo } = await db.transaction(async (tx) => {
        let uid: string;
        let nuevo: boolean;
        if (existente) {
            uid = existente.id;
            nuevo = false;
            await tx
                .update(usuarios)
                .set({ rolEquipo: 'gerente', regionId: datos.regionId, esEmbajador: true, updatedAt: new Date().toISOString() })
                .where(eq(usuarios.id, uid));
        } else {
            const [creado] = await tx
                .insert(usuarios)
                .values({
                    nombre: datos.nombre,
                    apellidos: datos.apellidos,
                    correo: datos.correo,
                    telefono: datos.telefono ?? null,
                    contrasenaHash: null,
                    correoVerificado: false,
                    perfil: 'personal',
                    estado: 'activo',
                    tieneModoComercial: false,
                    modoActivo: 'personal',
                    rolEquipo: 'gerente',
                    regionId: datos.regionId,
                    esEmbajador: true,
                })
                .returning({ id: usuarios.id });
            uid = creado.id;
            nuevo = true;
        }
        await asegurarEmbajadorGerente(tx, uid, datos.nombre, datos.apellidos, datos.regionId);
        return { usuarioId: uid, esNuevo: nuevo };
    });

    await registrarAuditoria(panel, {
        accion: esNuevo ? 'equipo_alta_gerente' : 'equipo_promover_gerente',
        entidadTipo: 'usuario',
        entidadId: usuarioId,
        datosPrevios: existente ? { rolEquipo: existente.rolEquipo } : null,
        datosNuevos: { rolEquipo: 'gerente', regionId: datos.regionId },
        motivo: null,
    });

    let correoEnviado = false;
    if (esNuevo) {
        correoEnviado = await enviarCodigoModeloC(datos.correo, datos.nombre);
    } else {
        try {
            await enviarEmailBienvenidaEquipo(datos.correo, datos.nombre, 'gerente');
        } catch (error) {
            console.error('Error enviando el aviso de bienvenida (promoción a gerente):', error);
        }
    }
    return { ok: true, usuarioId, promovido: !esNuevo, correoEnviado };
}

// =============================================================================
// EDITAR DATOS (correo / nombre / teléfono) — super (cualquiera) + gerente (sus vendedores)
// =============================================================================

export async function editarDatos(
    panel: UsuarioPanel,
    miembroId: string,
    datos: EditarDatosInput,
): Promise<ResultadoAccionEquipo & { correoEnviado?: boolean }> {
    const v = await cargarMiembro(miembroId);
    if (!v) return { ok: false, status: 404, mensaje: 'Miembro del equipo no encontrado.' };

    // Alcance: super sobre cualquiera; gerente solo sus vendedores (vendedorFueraDeAlcance exige
    // embajador + región, así que bloquea a gerentes/super y a vendedores de otra región).
    const sinAlcance = vendedorFueraDeAlcance(panel, v);
    if (sinAlcance) return sinAlcance;

    const cambios: Partial<typeof usuarios.$inferInsert> = {};
    if (datos.nombre !== undefined) cambios.nombre = datos.nombre;
    if (datos.apellidos !== undefined) cambios.apellidos = datos.apellidos;
    if (datos.telefono !== undefined) cambios.telefono = datos.telefono || null;

    let correoCambiado = false;
    const correoNuevo = datos.correo;
    if (correoNuevo && correoNuevo !== v.correo) {
        // El correo (la llave de acceso) solo se corrige mientras la cuenta NO tiene contraseña
        // (modelo C — para arreglar un typo del alta). Una vez activa, lo cambia la persona desde su
        // perfil, no el admin. Así nunca hay que re-verificar un correo desde el Panel.
        if (v.tieneContrasena) {
            return {
                ok: false,
                status: 409,
                mensaje: 'El correo solo se puede cambiar mientras la cuenta no tiene contraseña. Una vez activa, lo cambia la persona desde su perfil.',
            };
        }
        const enUso = (await db.execute(
            sql`SELECT 1 FROM usuarios WHERE correo = ${correoNuevo} AND id <> ${miembroId} LIMIT 1`,
        )).rows.length > 0;
        if (enUso) return { ok: false, status: 409, mensaje: 'Ya existe una cuenta con ese correo.' };
        cambios.correo = correoNuevo;
        cambios.correoVerificado = false;
        cambios.correoVerificadoAt = null;
        correoCambiado = true;
    }

    if (Object.keys(cambios).length === 0) {
        return { ok: false, status: 400, mensaje: 'No hay cambios para guardar.' };
    }
    cambios.updatedAt = new Date().toISOString();
    await db.update(usuarios).set(cambios).where(eq(usuarios.id, miembroId));

    await registrarAuditoria(panel, {
        accion: 'equipo_editar_datos',
        entidadTipo: 'usuario',
        entidadId: miembroId,
        datosPrevios: { nombre: v.nombre, apellidos: v.apellidos, telefono: v.telefono, correo: v.correo },
        datosNuevos: { nombre: cambios.nombre, apellidos: cambios.apellidos, telefono: cambios.telefono, correo: cambios.correo },
        motivo: null,
    });

    // Si cambió el correo y la cuenta aún NO tiene contraseña (modelo C), reenvía el código al correo nuevo
    // (corrige un correo mal escrito en el alta para que pueda crear su contraseña). Best-effort.
    let correoEnviado: boolean | undefined;
    if (correoCambiado && !v.tieneContrasena && correoNuevo) {
        correoEnviado = await enviarCodigoModeloC(correoNuevo, datos.nombre ?? v.nombre);
    }

    return { ok: true, correoEnviado };
}

// =============================================================================
// REASIGNAR REGIÓN (de un gerente) — solo superadmin
// =============================================================================

export async function reasignarRegion(panel: UsuarioPanel, miembroId: string, regionId: string): Promise<ResultadoAccionEquipo> {
    if (panel.rolEquipo !== 'superadmin') {
        return { ok: false, status: 403, mensaje: 'Solo el superadmin puede reasignar regiones.' };
    }
    const v = await cargarMiembro(miembroId);
    if (!v) return { ok: false, status: 404, mensaje: 'Miembro del equipo no encontrado.' };
    if (v.rolEquipo !== 'gerente') {
        return { ok: false, status: 409, mensaje: 'Solo se puede reasignar la región de un gerente.' };
    }
    const [reg] = await db
        .select({ id: regiones.id })
        .from(regiones)
        .where(and(eq(regiones.id, regionId), eq(regiones.activa, true)))
        .limit(1);
    if (!reg) return { ok: false, status: 404, mensaje: 'La región seleccionada no existe o no está activa.' };

    // Mueve la región del gerente Y re-sincroniza la cobertura de su figura de vendedor a las ciudades
    // de la nueva región (para que su cartera siga las ciudades correctas).
    await db.transaction(async (tx) => {
        await tx.update(usuarios).set({ regionId, updatedAt: new Date().toISOString() }).where(eq(usuarios.id, miembroId));
        await asegurarEmbajadorGerente(tx, miembroId, v.nombre, v.apellidos, regionId);
    });

    await registrarAuditoria(panel, {
        accion: 'equipo_reasignar_region',
        entidadTipo: 'usuario',
        entidadId: miembroId,
        datosPrevios: { regionId: v.regionId },
        datosNuevos: { regionId },
        motivo: null,
    });

    return { ok: true };
}

// =============================================================================
// EDITAR CIUDADES (cobertura del vendedor, DENTRO de su región) — super + gerente (su región)
// =============================================================================

/**
 * Cambia las ciudades que cubre un vendedor (agregar / quitar) SIN sacarlo de su región.
 * Es el "Caso A" de la cobertura: el modelo ya permite varias ciudades por vendedor; aquí solo
 * faltaba poder editarlas después del alta. Mover a OTRA región (multi-región) es la Pieza F, que
 * sigue diferida — por eso este guard exige que la región resultante coincida con la actual.
 */
export async function editarCiudades(
    panel: UsuarioPanel,
    miembroId: string,
    ciudadIds: string[],
): Promise<ResultadoAccionEquipo> {
    const v = await cargarMiembro(miembroId);
    if (!v) return { ok: false, status: 404, mensaje: 'Miembro del equipo no encontrado.' };
    if (v.rolEquipo !== 'vendedor' || !v.embajadorId) {
        return { ok: false, status: 409, mensaje: 'Solo se puede cambiar la cobertura de un vendedor.' };
    }

    // Alcance: el gerente solo edita vendedores de SU región (el super, cualquiera).
    const sinAlcance = vendedorFueraDeAlcance(panel, v);
    if (sinAlcance) return sinAlcance;

    // Ciudades válidas + región común (el trigger de BD exige una sola región).
    const ciudadesOk = await validarCiudades(ciudadIds);
    if (!ciudadesOk.ok) return ciudadesOk;

    // El gerente no puede mover al vendedor fuera de su región.
    if (panel.rolEquipo === 'gerente' && ciudadesOk.regionId !== panel.regionId) {
        return { ok: false, status: 403, mensaje: 'Las ciudades seleccionadas no son de tu región.' };
    }
    // Esta acción NO cambia la región del vendedor (eso es la Pieza F: "mover de región = soltar la
    // cartera"). Si el vendedor ya cubre una región, las ciudades nuevas deben ser de ESA misma región.
    if (v.regionVendedor && ciudadesOk.regionId !== v.regionVendedor) {
        return {
            ok: false,
            status: 409,
            mensaje: 'Las ciudades deben ser de la región actual del vendedor. Cambiarlo de región es otra operación.',
        };
    }

    const embajadorId = v.embajadorId;
    // Cobertura previa, para la bitácora.
    const previas = (await db.execute(
        sql`SELECT ciudad_id::text AS id FROM embajador_ciudades WHERE embajador_id = ${embajadorId}::uuid`,
    )).rows as Array<{ id: string }>;
    const ciudadIdsPrevias = previas.map((p) => p.id);

    await db.transaction(async (tx) => {
        await reemplazarCiudades(tx, embajadorId, ciudadIds);
    });

    await registrarAuditoria(panel, {
        accion: 'equipo_cambiar_ciudades',
        entidadTipo: 'usuario',
        entidadId: miembroId,
        datosPrevios: { ciudadIds: ciudadIdsPrevias },
        datosNuevos: { ciudadIds, regionId: ciudadesOk.regionId },
        motivo: null,
    });

    return { ok: true };
}
