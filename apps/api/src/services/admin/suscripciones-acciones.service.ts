/**
 * admin/suscripciones-acciones.service.ts
 * =======================================
 * Acciones de ESCRITURA de la sección Suscripciones del Panel Admin. Hoy: borrar un
 * movimiento de la bitácora.
 *
 * Regla de seguridad: SOLO superadmin (lo blinda la ruta) y SOLO sobre pagos manuales
 * ANULADOS. Un pago anulado ya no cuenta para la vigencia (anular ya la revirtió), así
 * que borrar su registro (evento + pago) es seguro y no recalcula nada. Los pagos
 * VIGENTES no se pueden borrar aquí: primero hay que anularlos.
 *
 * Ubicación: apps/api/src/services/admin/suscripciones-acciones.service.ts
 */

import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { eventosPago, pagosMembresia } from '../../db/schemas/schema.js';

export type ResultadoEliminar = { ok: true } | { ok: false; status: number; mensaje: string };

/**
 * Borra físicamente un movimiento de pago manual anulado: el evento de la bitácora
 * (`eventos_pago`) y su pago (`pagos_membresia`), en una transacción. Devuelve un
 * resultado discriminado (mismo estilo que negocios-acciones) para que el controller
 * traduzca el status. Es IRREVERSIBLE.
 */
export async function eliminarEventoPago(eventoId: string): Promise<ResultadoEliminar> {
    const [evento] = await db
        .select({ id: eventosPago.id, tipo: eventosPago.tipo, referenciaId: eventosPago.referenciaId })
        .from(eventosPago)
        .where(eq(eventosPago.id, eventoId))
        .limit(1);
    if (!evento) return { ok: false, status: 404, mensaje: 'Movimiento no encontrado.' };

    // Solo movimientos de pago manual; los eventos automáticos de Stripe no se borran.
    if (evento.tipo !== 'pago_manual' || !evento.referenciaId) {
        return { ok: false, status: 400, mensaje: 'Solo se pueden borrar movimientos de pago manual.' };
    }

    // El pago DEBE estar anulado: los vigentes afectan la vigencia (anúlalos primero).
    const [pago] = await db
        .select({ id: pagosMembresia.id, anulado: pagosMembresia.anulado })
        .from(pagosMembresia)
        .where(eq(pagosMembresia.id, evento.referenciaId))
        .limit(1);
    if (pago && !pago.anulado) {
        return { ok: false, status: 409, mensaje: 'El pago está vigente. Anúlalo primero para poder borrarlo.' };
    }

    await db.transaction(async (tx) => {
        await tx.delete(pagosMembresia).where(eq(pagosMembresia.id, evento.referenciaId!));
        await tx.delete(eventosPago).where(eq(eventosPago.id, eventoId));
    });

    return { ok: true };
}
