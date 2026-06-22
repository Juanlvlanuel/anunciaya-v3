/**
 * admin/publicidad-alta.service.ts
 * ================================
 * Alta MANUAL de un anuncio desde el Panel (Fase 2): el super o el gerente registran un anuncio
 * cobrado en efectivo/transferencia, o el super otorga una cortesía (gratis). El anunciante es un
 * usuario existente (se resuelve por correo); el anuncio nace 'activa' con su vigencia.
 *
 * ALCANCE:
 *   - superadmin → cualquier ciudad; puede dar cortesía.
 *   - gerente    → solo si TODAS las ciudades elegidas están en su región; NO puede dar cortesía.
 *   - vendedor   → sin acceso.
 *
 * El folio del recibo se toma de la secuencia global `pagos_membresia_folio_seq` (correlativo con
 * membresías) solo cuando hay cobro; la cortesía no consume folio. El recibo PDF + correo se generan
 * en el sub-bloque de Recibos (Fase 2); aquí se crea el anuncio y se sella el folio.
 *
 * Ubicación: apps/api/src/services/admin/publicidad-alta.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { calcularPrecioPublicidad, CARRUSELES_VALIDOS, type CarruselPub } from '../publicidad-precio.service.js';
import { obtenerConfigNumero } from '../configuracion.service.js';

export type MetodoCobroManual = 'efectivo' | 'transferencia' | 'cortesia';

export interface AltaManualInput {
    correoAnunciante: string;
    carruseles: CarruselPub[];           // 1..3
    imagenes: Partial<Record<CarruselPub, string>>; // carrusel → imagen_url (R2)
    ciudadIds: string[];                 // 1..límite
    meses?: number;                      // meses pagados por adelantado (default 1)
    metodoCobro: MetodoCobroManual;
    monto?: number | null;               // si se omite y hay cobro, se usa el precio calculado
}

export type ResultadoAlta =
    | { ok: true; id: string; folio: number | null; monto: number | null }
    | { ok: false; status: number; mensaje: string };

const err = (status: number, mensaje: string): ResultadoAlta => ({ ok: false, status, mensaje });

export async function crearAnuncioManual(panel: UsuarioPanel, input: AltaManualInput): Promise<ResultadoAlta> {
    if (panel.rolEquipo === 'vendedor') return err(403, 'Sin acceso a Publicidad');

    // 1) Carruseles (1..3, válidos, sin duplicados) + una imagen por carrusel.
    const carruseles = Array.from(new Set(input.carruseles));
    if (carruseles.length === 0) return err(400, 'Elige al menos un carrusel.');
    if (carruseles.some((c) => !CARRUSELES_VALIDOS.includes(c))) return err(400, 'Carrusel inválido.');
    for (const c of carruseles) {
        const url = input.imagenes[c];
        if (!url || typeof url !== 'string') return err(400, `Falta la imagen del carrusel "${c}".`);
    }

    // 2) Cortesía = solo super.
    const esCortesia = input.metodoCobro === 'cortesia';
    if (esCortesia && panel.rolEquipo !== 'superadmin') {
        return err(403, 'Solo el superadministrador puede otorgar cortesías.');
    }
    if (!['efectivo', 'transferencia', 'cortesia'].includes(input.metodoCobro)) {
        return err(400, 'Método de cobro inválido.');
    }

    // 3) Ciudades: existen + activas, dentro del límite, y (gerente) en su región.
    const ciudadIds = Array.from(new Set(input.ciudadIds));
    if (ciudadIds.length === 0) return err(400, 'Elige al menos una ciudad.');
    const limite = await obtenerConfigNumero('publicidad_limite_ciudades', 10);
    if (ciudadIds.length > limite) return err(400, `Máximo ${limite} ciudades por anuncio.`);

    // Lista de ids como `($1::uuid, $2::uuid, …)` — el driver no serializa un array JS para ANY(...).
    const idsSql = sql.join(ciudadIds.map((id) => sql`${id}::uuid`), sql`, `);

    const [{ activas }] = (await db.execute(sql`
        SELECT count(*)::int AS activas FROM ciudades WHERE id IN (${idsSql}) AND activa = true
    `)).rows as Array<{ activas: number }>;
    if (activas !== ciudadIds.length) return err(400, 'Alguna ciudad no existe o no está activa.');

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return err(403, 'No tienes una región asignada.');
        const [{ enRegion }] = (await db.execute(sql`
            SELECT count(*)::int AS "enRegion" FROM ciudades WHERE id IN (${idsSql}) AND region_id = ${panel.regionId}
        `)).rows as Array<{ enRegion: number }>;
        if (enRegion !== ciudadIds.length) return err(403, 'Todas las ciudades deben estar en tu región.');
    }

    // 4) Anunciante (usuario existente por correo).
    const correo = input.correoAnunciante.trim().toLowerCase();
    const [usuario] = (await db.execute(sql`
        SELECT id::text AS id, negocio_id::text AS negocio_id FROM usuarios WHERE correo = ${correo} LIMIT 1
    `)).rows as Array<{ id: string; negocio_id: string | null }>;
    if (!usuario) return err(404, 'No existe una cuenta con ese correo.');

    // 5) Precio + vigencia + folio (según los meses pagados por adelantado).
    const meses = Math.max(1, Math.floor(input.meses ?? 1));
    const duracionBase = await obtenerConfigNumero('publicidad_duracion_dias', 30);
    const duracion = meses * duracionBase;
    let monto: number | null = null;
    if (!esCortesia) {
        monto = input.monto != null && Number.isFinite(input.monto) && input.monto >= 0
            ? input.monto
            : (await calcularPrecioPublicidad(carruseles, ciudadIds.length, meses)).total;
    }

    let folio: number | null = null;
    if (!esCortesia) {
        const [{ f }] = (await db.execute(sql`SELECT nextval('pagos_membresia_folio_seq')::int AS f`)).rows as Array<{ f: number }>;
        folio = f;
    }

    const esCombo = carruseles.length === 3;
    const origen = esCortesia ? 'cortesia' : 'manual';

    // 6) Crear (compra + piezas + ciudades) en una transacción.
    let compraId = '';
    await db.transaction(async (tx) => {
        const [compra] = (await tx.execute(sql`
            INSERT INTO publicidad_compras
                (usuario_id, negocio_id, es_combo, estado, origen, metodo_cobro, monto, folio,
                 duracion_dias, inicia_at, expira_at, registrado_por)
            VALUES
                (${usuario.id}, ${usuario.negocio_id}, ${esCombo}, 'activa', ${origen}, ${input.metodoCobro},
                 ${monto}, ${folio}, ${duracion}, now(), now() + (${duracion} || ' days')::interval, ${panel.usuarioId})
            RETURNING id::text AS id
        `)).rows as Array<{ id: string }>;
        compraId = compra.id;

        for (const c of carruseles) {
            await tx.execute(sql`INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES (${compraId}, ${c}, ${input.imagenes[c]})`);
        }
        for (const cid of ciudadIds) {
            await tx.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${compraId}, ${cid})`);
        }
    });

    await registrarAuditoria(panel, {
        accion: 'publicidad_alta_manual',
        entidadTipo: 'publicidad',
        entidadId: compraId,
        datosPrevios: null,
        datosNuevos: {
            carruseles: carruseles.join(', '),
            ciudades: ciudadIds.length,
            concepto: input.metodoCobro,
            monto,
            folio,
        },
        motivo: null,
    });

    // Recibo PDF (solo si hubo cobro) + correo al anunciante (best-effort). Cortesía: correo de
    // "publicidad activa", sin recibo de pago.
    try {
        const { prepararReciboPublicidad } = await import('./recibo-publicidad.service.js');
        const { enviarComprobantePublicidad } = await import('../../utils/email.js');
        const rec = await prepararReciboPublicidad(compraId, !esCortesia);
        if (rec) {
            if (rec.reciboUrl) {
                await db.execute(sql`UPDATE publicidad_compras SET recibo_url = ${rec.reciboUrl} WHERE id = ${compraId}::uuid`);
            }
            if (rec.correo) {
                await enviarComprobantePublicidad(rec.correo, rec.nombre ?? '', {
                    titular: rec.titular, carruseles: rec.carruseles, concepto: rec.concepto,
                    monto: rec.monto, folio: rec.folio, hasta: rec.hasta, reciboUrl: rec.reciboUrl,
                });
            }
        }
    } catch (e) {
        console.error('Error emitiendo el recibo de publicidad (alta manual):', e);
    }

    return { ok: true, id: compraId, folio, monto };
}
