/**
 * admin/recibo-pago.service.ts
 * ============================
 * Emisión del recibo de pago de membresía a partir de un `pagos_membresia.id`. Centraliza lo que
 * antes estaba duplicado en `marcarPagado` y `altaManualNegocio`: lee el pago + sus datos asociados
 * (negocio, sucursal matriz, dueño, actor), genera el PDF (`reciboPdf.ts`) y lo sube a R2.
 *
 * Reutilizado por: "Registrar pago" (marcarPagado), alta manual, y **reenviar recibo**. Devuelve la
 * URL del recibo + los datos listos para armar el correo (comprobante o bienvenida).
 *
 * Ubicación: apps/api/src/services/admin/recibo-pago.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { generarReciboPagoPDF } from '../../utils/reciboPdf.js';
import { subirArchivo } from '../r2.service.js';

export interface ReciboPreparado {
    /** URL del recibo PDF en R2 (undefined si la generación/subida falló). */
    reciboUrl?: string;
    /** Correo del dueño (destinatario). */
    correoDueno: string | null;
    /** Nombre de pila del dueño (saludo del correo). */
    nombreDueno: string | null;
    /** Datos para el bloque-recibo del correo. */
    nombreNegocio: string;
    concepto: 'efectivo' | 'transferencia' | 'cortesia';
    monto: number | null;
    /** Vigencia (ISO) = `periodo_hasta` del pago. */
    hasta: string;
}

interface FilaPago {
    folio: number | null;
    monto: string | null;
    concepto: 'efectivo' | 'transferencia' | 'cortesia';
    meses_cubiertos: number | null;
    periodo_hasta: string;
    fecha_pago: string;
    nombre_negocio: string;
    correo_dueno: string | null;
    nombre_dueno: string | null;
    nombre_dueno_completo: string | null;
    sucursal: string | null;
    direccion: string | null;
    telefono: string | null;
    correo_sucursal: string | null;
    atendio: string | null;
}

/**
 * Lee el pago `pagoId` con todo su contexto, genera el recibo PDF y lo sube a R2. Devuelve los datos
 * para el correo + la URL del recibo (o `null` si el pago no existe). No envía correo: eso lo hace el
 * llamador (comprobante vs bienvenida). Si la generación/subida del PDF falla, devuelve los datos
 * **sin** `reciboUrl` (el correo se manda igual, sin botón de descarga).
 */
export async function prepararReciboPago(pagoId: string): Promise<ReciboPreparado | null> {
    const [fila] = (await db.execute(sql`
        SELECT
            p.folio,
            p.monto::text                                              AS monto,
            p.concepto,
            p.meses_cubiertos,
            p.periodo_hasta::text                                      AS periodo_hasta,
            p.fecha_pago::text                                         AS fecha_pago,
            n.nombre                                                   AS nombre_negocio,
            u.correo                                                   AS correo_dueno,
            u.nombre                                                   AS nombre_dueno,
            TRIM(CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')))     AS nombre_dueno_completo,
            s.nombre                                                   AS sucursal,
            s.direccion,
            s.telefono,
            s.correo                                                   AS correo_sucursal,
            TRIM(CONCAT(a.nombre, ' ', COALESCE(a.apellidos, '')))     AS atendio
        FROM pagos_membresia p
        JOIN negocios n  ON n.id = p.negocio_id
        JOIN usuarios u  ON u.id = n.usuario_id
        LEFT JOIN negocio_sucursales s ON s.negocio_id = p.negocio_id AND s.es_principal = true
        LEFT JOIN usuarios a ON a.id = p.registrado_por
        WHERE p.id = ${pagoId}
        LIMIT 1
    `)).rows as unknown as FilaPago[];

    if (!fila) return null;

    const monto = fila.monto != null ? Number(fila.monto) : null;

    // Recibo PDF → R2 (best-effort: si falla, se devuelve sin reciboUrl y el correo va sin botón).
    let reciboUrl: string | undefined;
    try {
        const pdf = await generarReciboPagoPDF({
            folio: fila.folio != null ? String(fila.folio) : pagoId,
            nombreNegocio: fila.nombre_negocio,
            sucursal: fila.sucursal,
            nombreDueno: fila.nombre_dueno_completo,
            direccionNegocio: fila.direccion,
            telefonoNegocio: fila.telefono,
            correoNegocio: fila.correo_sucursal ?? fila.correo_dueno,
            concepto: fila.concepto,
            monto,
            periodoMeses: fila.meses_cubiertos,
            hasta: fila.periodo_hasta,
            fechaPago: fila.fecha_pago,
            atendio: fila.atendio,
        });
        const sub = await subirArchivo(pdf, 'recibos', 'recibo.pdf', 'application/pdf');
        if (sub.success && sub.data?.url) reciboUrl = sub.data.url;
    } catch {
        console.error('Error al generar/subir el recibo PDF (prepararReciboPago)');
    }

    return {
        reciboUrl,
        correoDueno: fila.correo_dueno,
        nombreDueno: fila.nombre_dueno,
        nombreNegocio: fila.nombre_negocio,
        concepto: fila.concepto,
        monto,
        hasta: fila.periodo_hasta,
    };
}
