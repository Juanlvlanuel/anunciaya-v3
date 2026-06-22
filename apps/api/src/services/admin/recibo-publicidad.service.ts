/**
 * admin/recibo-publicidad.service.ts
 * ==================================
 * Emisión del recibo de un pago de PUBLICIDAD a partir de un `publicidad_compras.id`. Reusa el mismo
 * generador de PDF que los recibos de membresía (`reciboPdf.ts`) y la misma carpeta R2 ('recibos',
 * protegida del recolector), con el folio de la secuencia global → la numeración es continua.
 *
 * El "titular" del recibo es el negocio del anunciante (si es comercial) o su nombre; el concepto del
 * comprobante detalla los carruseles. No envía correo: eso lo hace el llamador.
 *
 * Ubicación: apps/api/src/services/admin/recibo-publicidad.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { generarReciboPagoPDF } from '../../utils/reciboPdf.js';
import { subirArchivo } from '../r2.service.js';

export type ConceptoPublicidad = 'efectivo' | 'transferencia' | 'cortesia' | 'tarjeta';

export interface ReciboPublicidadPreparado {
    reciboUrl?: string;
    correo: string | null;
    nombre: string | null;          // nombre de pila del anunciante (saludo)
    titular: string;                // negocio o nombre completo (encabeza el recibo)
    carruseles: string;             // "Anuncios, Patrocinadores"
    concepto: ConceptoPublicidad;
    monto: number | null;
    folio: number | null;
    hasta: string;                  // vigencia (ISO)
}

interface FilaReciboPub {
    folio: number | null;
    monto: string | null;
    metodo_cobro: ConceptoPublicidad | null;
    hasta: string;
    fecha_pago: string;
    correo: string | null;
    nombre: string | null;
    nombre_completo: string;
    nombre_negocio: string | null;
    carruseles: string | null;
    atendio: string | null;
}

export async function prepararReciboPublicidad(compraId: string, generarPdf = true): Promise<ReciboPublicidadPreparado | null> {
    const [fila] = (await db.execute(sql`
        SELECT
            pc.folio,
            pc.monto::text                                            AS monto,
            pc.metodo_cobro,
            pc.expira_at::text                                        AS hasta,
            pc.created_at::text                                       AS fecha_pago,
            u.correo,
            u.nombre,
            TRIM(CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')))    AS nombre_completo,
            n.nombre                                                  AS nombre_negocio,
            (SELECT string_agg(INITCAP(carrusel), ', ' ORDER BY carrusel) FROM publicidad_piezas WHERE compra_id = pc.id) AS carruseles,
            TRIM(CONCAT(a.nombre, ' ', COALESCE(a.apellidos, '')))    AS atendio
        FROM publicidad_compras pc
        JOIN usuarios u ON u.id = pc.usuario_id
        LEFT JOIN negocios n ON n.id = pc.negocio_id
        LEFT JOIN usuarios a ON a.id = pc.registrado_por
        WHERE pc.id = ${compraId}
        LIMIT 1
    `)).rows as unknown as FilaReciboPub[];

    if (!fila) return null;

    const monto = fila.monto != null ? Number(fila.monto) : null;
    const concepto = (fila.metodo_cobro ?? 'tarjeta') as ConceptoPublicidad;
    const titular = fila.nombre_negocio || fila.nombre_completo || 'Anunciante';
    const carruseles = fila.carruseles ?? 'Publicidad';

    let reciboUrl: string | undefined;
    if (generarPdf) try {
        const pdf = await generarReciboPagoPDF({
            folio: fila.folio != null ? String(fila.folio) : compraId,
            nombreNegocio: titular,
            sucursal: `Publicidad — ${carruseles}`,
            nombreDueno: fila.nombre_completo,
            direccionNegocio: null,
            ciudadEstado: null,
            telefonoNegocio: null,
            correoNegocio: fila.correo,
            concepto,
            monto,
            periodoMeses: null,
            hasta: fila.hasta,
            fechaPago: fila.fecha_pago,
            atendio: fila.atendio,
        });
        const sub = await subirArchivo(pdf, 'recibos', 'recibo-publicidad.pdf', 'application/pdf');
        if (sub.success && sub.data?.url) reciboUrl = sub.data.url;
    } catch {
        console.error('Error al generar/subir el recibo PDF de publicidad');
    }

    return {
        reciboUrl,
        correo: fila.correo,
        nombre: fila.nombre,
        titular,
        carruseles,
        concepto,
        monto,
        folio: fila.folio,
        hasta: fila.hasta,
    };
}
