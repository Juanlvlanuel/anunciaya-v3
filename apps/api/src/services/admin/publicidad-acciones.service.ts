/**
 * admin/publicidad-acciones.service.ts
 * ====================================
 * Acciones de ESCRITURA de la sección Publicidad del Panel (Fase 2). Solo cambios de estado
 * sobre un anuncio existente; el alta manual / cortesía y el wizard self-service viven en sus
 * propios services. Escriben en NUESTRA BD (fuente de verdad) y dejan rastro en `admin_auditoria`.
 *
 *   - pausarAnuncio     — activa → pausada (deja de mostrarse; reversible)
 *   - reactivarAnuncio  — pausada → activa (si aún no venció)
 *   - cancelarAnuncio   — cualquiera → cancelada (irreversible; solo SuperAdmin por la ruta)
 *
 * ALCANCE (sincronizado con la lectura, `condicionAlcance` en publicidad.service.ts):
 *   superadmin = cualquier anuncio · gerente = anuncios con ≥1 ciudad en su región · vendedor = —.
 * Las mutaciones usan el panel ORIGINAL del actor (NO la lente de región del superadmin).
 *
 * Ubicación: apps/api/src/services/admin/publicidad-acciones.service.ts
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { publicidadCompras } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { obtenerConfigNumero } from '../configuracion.service.js';
import { CARRUSELES_VALIDOS, type CarruselPub } from '../publicidad-precio.service.js';
import { notificarCambioPublicidad } from '../publicidad-realtime.js';

export type ResultadoAccionPub =
    | { ok: true; estado: string }
    | { ok: false; status: number; mensaje: string };

type AnuncioCargado = {
    id: string;
    estado: string;
    expiraAt: string | null;
};

/** Carga el anuncio y valida el alcance del actor (404 si no existe, 403 si está fuera de alcance). */
async function cargarAnuncioConAlcance(
    panel: UsuarioPanel,
    id: string,
): Promise<{ ok: true; anuncio: AnuncioCargado } | { ok: false; status: number; mensaje: string }> {
    const [a] = await db
        .select({ id: publicidadCompras.id, estado: publicidadCompras.estado, expiraAt: publicidadCompras.expiraAt })
        .from(publicidadCompras)
        .where(eq(publicidadCompras.id, id))
        .limit(1);

    if (!a) return { ok: false, status: 404, mensaje: 'Anuncio no encontrado' };

    // El vendedor no entra a Publicidad (las rutas tampoco se lo permiten; defensa en profundidad).
    if (panel.rolEquipo === 'vendedor') {
        return { ok: false, status: 403, mensaje: 'Sin acceso a Publicidad' };
    }

    // Gerente: manda sobre los anuncios con ≥1 ciudad en su región (mismo predicado que la lectura).
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return { ok: false, status: 403, mensaje: 'No tienes una región asignada' };
        const filas = (await db.execute(sql`
            SELECT EXISTS (
                SELECT 1 FROM publicidad_compra_ciudades pcc
                JOIN ciudades c ON c.id = pcc.ciudad_id
                WHERE pcc.compra_id = ${id} AND c.region_id = ${panel.regionId}
            ) AS tiene_mando
        `)).rows as Array<{ tiene_mando: boolean }>;
        if (!filas[0]?.tiene_mando) {
            return { ok: false, status: 403, mensaje: 'El anuncio no está bajo tu mando: no se muestra en tu región' };
        }
    }

    return { ok: true, anuncio: a };
}

/** Pausa un anuncio activo (deja de mostrarse). Reversible. */
export async function pausarAnuncio(panel: UsuarioPanel, id: string): Promise<ResultadoAccionPub> {
    const cargado = await cargarAnuncioConAlcance(panel, id);
    if (!cargado.ok) return cargado;
    const a = cargado.anuncio;

    if (a.estado === 'cancelada') return { ok: false, status: 409, mensaje: 'El anuncio está cancelado' };
    if (a.estado === 'expirada') return { ok: false, status: 409, mensaje: 'El anuncio ya venció' };
    if (a.estado === 'pausada') return { ok: false, status: 409, mensaje: 'El anuncio ya está pausado' };

    const ahora = new Date().toISOString();
    await db.update(publicidadCompras).set({ estado: 'pausada', updatedAt: ahora }).where(eq(publicidadCompras.id, id));

    await registrarAuditoria(panel, {
        accion: 'publicidad_pausar',
        entidadTipo: 'publicidad',
        entidadId: id,
        datosPrevios: { estado: 'activa' },
        datosNuevos: { estado: 'pausada' },
        motivo: null,
    });

    notificarCambioPublicidad('pausar'); // deja de mostrarse al instante en la columna
    return { ok: true, estado: 'pausada' };
}

/** Reactiva un anuncio pausado (vuelve a mostrarse), si aún no venció. */
export async function reactivarAnuncio(panel: UsuarioPanel, id: string): Promise<ResultadoAccionPub> {
    const cargado = await cargarAnuncioConAlcance(panel, id);
    if (!cargado.ok) return cargado;
    const a = cargado.anuncio;

    if (a.estado === 'cancelada') return { ok: false, status: 409, mensaje: 'El anuncio está cancelado' };
    if (a.estado === 'activa') return { ok: false, status: 409, mensaje: 'El anuncio ya está activo' };
    if (a.expiraAt && new Date(a.expiraAt).getTime() <= Date.now()) {
        return { ok: false, status: 409, mensaje: 'El anuncio ya venció; no se puede reactivar' };
    }

    const ahora = new Date().toISOString();
    await db.update(publicidadCompras).set({ estado: 'activa', updatedAt: ahora }).where(eq(publicidadCompras.id, id));

    await registrarAuditoria(panel, {
        accion: 'publicidad_reactivar',
        entidadTipo: 'publicidad',
        entidadId: id,
        datosPrevios: { estado: 'pausada' },
        datosNuevos: { estado: 'activa' },
        motivo: null,
    });

    notificarCambioPublicidad('reactivar'); // vuelve a mostrarse al instante
    return { ok: true, estado: 'activa' };
}

// =============================================================================
// EDITAR (super + gerente) — cambia ciudades · carruseles · imágenes. NO toca el cobro.
// =============================================================================

export interface EdicionAnuncioInput {
    carruseles: CarruselPub[];                       // 1..3 (los que quedan)
    imagenes: Partial<Record<CarruselPub, string>>;  // carrusel → imagen_url (R2)
    ciudadIds: string[];                             // 1..límite (reemplazo completo)
}

/**
 * Edita un anuncio existente: reconcilia sus carruseles/imágenes (conservando los clics de las piezas
 * que se mantienen) y reemplaza sus ciudades. **No toca** monto/folio/recibo — es un ajuste operativo
 * (el cobro ya hecho se respeta; el cambio queda en auditoría). Imágenes reemplazadas/retiradas quedan
 * sin referencia en R2 y las recoge el recolector (están en el IMAGE_REGISTRY).
 *
 * Alcance: superadmin (cualquiera) · gerente (anuncio bajo su mando + todas las ciudades nuevas en su
 * región, igual que el alta manual). No se puede editar un anuncio cancelado o vencido.
 */
export async function editarAnuncio(panel: UsuarioPanel, id: string, input: EdicionAnuncioInput): Promise<ResultadoAccionPub> {
    const cargado = await cargarAnuncioConAlcance(panel, id);
    if (!cargado.ok) return cargado;
    const a = cargado.anuncio;

    if (a.estado === 'cancelada') return { ok: false, status: 409, mensaje: 'El anuncio está cancelado' };
    if (a.estado === 'expirada') return { ok: false, status: 409, mensaje: 'El anuncio ya venció; no se puede editar' };

    // 1) Carruseles (1..3, válidos, sin duplicados) + imagen por carrusel.
    const carruseles = Array.from(new Set(input.carruseles));
    if (carruseles.length === 0) return { ok: false, status: 400, mensaje: 'Elige al menos un carrusel.' };
    if (carruseles.some((c) => !CARRUSELES_VALIDOS.includes(c))) return { ok: false, status: 400, mensaje: 'Carrusel inválido.' };
    for (const c of carruseles) {
        if (!input.imagenes[c]) return { ok: false, status: 400, mensaje: `Falta la imagen del carrusel "${c}".` };
    }

    // 2) Ciudades: existen + activas, dentro del límite, y (gerente) en su región.
    const ciudadIds = Array.from(new Set(input.ciudadIds));
    if (ciudadIds.length === 0) return { ok: false, status: 400, mensaje: 'Elige al menos una ciudad.' };
    const limite = await obtenerConfigNumero('publicidad_limite_ciudades', 10);
    if (ciudadIds.length > limite) return { ok: false, status: 400, mensaje: `Máximo ${limite} ciudades por anuncio.` };

    const idsSql = sql.join(ciudadIds.map((cid) => sql`${cid}::uuid`), sql`, `);
    const [{ activas }] = (await db.execute(sql`
        SELECT count(*)::int AS activas FROM ciudades WHERE id IN (${idsSql}) AND activa = true
    `)).rows as Array<{ activas: number }>;
    if (activas !== ciudadIds.length) return { ok: false, status: 400, mensaje: 'Alguna ciudad no existe o no está activa.' };

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return { ok: false, status: 403, mensaje: 'No tienes una región asignada.' };
        const [{ enRegion }] = (await db.execute(sql`
            SELECT count(*)::int AS "enRegion" FROM ciudades WHERE id IN (${idsSql}) AND region_id = ${panel.regionId}
        `)).rows as Array<{ enRegion: number }>;
        if (enRegion !== ciudadIds.length) return { ok: false, status: 403, mensaje: 'Todas las ciudades deben estar en tu región.' };
    }

    const esCombo = carruseles.length === 2; // combo = los 2 tamaños (Grande + Chico); fundadores no se vende

    // 3) Reconciliar en una transacción: piezas (conservan clics las que siguen) + ciudades.
    await db.transaction(async (tx) => {
        const actuales = (await tx.execute(sql`SELECT carrusel, imagen_url FROM publicidad_piezas WHERE compra_id = ${id}::uuid`)).rows as Array<{ carrusel: string; imagen_url: string }>;
        const actualesMap = new Map(actuales.map((p) => [p.carrusel, p.imagen_url]));

        // Quitar las piezas de carruseles que ya no están.
        for (const p of actuales) {
            if (!carruseles.includes(p.carrusel as CarruselPub)) {
                await tx.execute(sql`DELETE FROM publicidad_piezas WHERE compra_id = ${id}::uuid AND carrusel = ${p.carrusel}`);
            }
        }
        // Agregar nuevas / actualizar imagen de las que siguen.
        for (const c of carruseles) {
            const nueva = input.imagenes[c]!;
            if (!actualesMap.has(c)) {
                await tx.execute(sql`INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES (${id}::uuid, ${c}, ${nueva})`);
            } else if (actualesMap.get(c) !== nueva) {
                await tx.execute(sql`UPDATE publicidad_piezas SET imagen_url = ${nueva} WHERE compra_id = ${id}::uuid AND carrusel = ${c}`);
            }
        }

        // Ciudades: reemplazo completo (la N:M no guarda métricas).
        await tx.execute(sql`DELETE FROM publicidad_compra_ciudades WHERE compra_id = ${id}::uuid`);
        for (const cid of ciudadIds) {
            await tx.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${id}::uuid, ${cid}::uuid)`);
        }

        // es_combo + updated_at. NO se toca monto/folio/recibo.
        await tx.execute(sql`UPDATE publicidad_compras SET es_combo = ${esCombo}, updated_at = now() WHERE id = ${id}::uuid`);
    });

    await registrarAuditoria(panel, {
        accion: 'publicidad_editar',
        entidadTipo: 'publicidad',
        entidadId: id,
        datosPrevios: { estado: a.estado },
        datosNuevos: { carruseles: carruseles.join(', '), ciudades: ciudadIds.length, esCombo },
        motivo: null,
    });

    notificarCambioPublicidad('editar'); // nuevas imágenes/ciudades se reflejan al instante
    return { ok: true, estado: a.estado };
}

/** Cancela un anuncio (irreversible). Solo SuperAdmin (lo restringe la ruta). */
export async function cancelarAnuncio(panel: UsuarioPanel, id: string, motivo: string | null): Promise<ResultadoAccionPub> {
    const cargado = await cargarAnuncioConAlcance(panel, id);
    if (!cargado.ok) return cargado;
    const a = cargado.anuncio;

    if (a.estado === 'cancelada') return { ok: false, status: 409, mensaje: 'El anuncio ya está cancelado' };

    const ahora = new Date().toISOString();
    await db.update(publicidadCompras).set({ estado: 'cancelada', updatedAt: ahora }).where(eq(publicidadCompras.id, id));

    await registrarAuditoria(panel, {
        accion: 'publicidad_cancelar',
        entidadTipo: 'publicidad',
        entidadId: id,
        datosPrevios: { estado: a.estado },
        datosNuevos: { estado: 'cancelada' },
        motivo: motivo || null,
    });

    notificarCambioPublicidad('cancelar'); // desaparece al instante
    return { ok: true, estado: 'cancelada' };
}
