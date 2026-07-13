/**
 * reciboPdf.ts
 * ============
 * Genera el RECIBO de pago de membresía en PDF, estampando los datos reales sobre el MOLDE
 * de marca (`assets/recibo/plantilla-recibo.pdf`, diseñado aparte). Defensa del Camino B.
 *
 * Motor: pdf-lib (MIT, sin Chromium) → carga el molde como fondo y dibuja cada dato en su
 * coordenada (COORDS). Las coordenadas se extrajeron UNA vez del diseño con
 * `scripts/extraer-coords-recibo.ts` (a partir de `referencia-recibo.pdf`, el molde CON los
 * {{placeholders}}); aquí van "horneadas" → en producción no se necesita pdfjs ni la referencia.
 *
 * Si cambia el diseño: reexporta el molde + la referencia, corre el extractor y actualiza COORDS.
 *
 * Ubicación: apps/api/src/utils/reciboPdf.ts
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { ZONA_EMPRESA } from './zonaHoraria.js';

// ── Molde (fondo): se lee del disco UNA vez y se cachea. Rutas candidatas dev (src) y prod (dist). ──
const plantillaCache = new Map<string, Uint8Array>();
function leerPlantilla(archivo: string): Uint8Array {
    const cacheado = plantillaCache.get(archivo);
    if (cacheado) return cacheado;
    const candidatas = [
        new URL(`../assets/recibo/${archivo}`, import.meta.url), // dev: src/utils → src/assets
        new URL(`./assets/recibo/${archivo}`, import.meta.url),  // prod: dist/index.js → dist/assets
    ].map((u) => fileURLToPath(u));
    const ruta = candidatas.find((p) => existsSync(p));
    if (!ruta) throw new Error(`No se encontró ${archivo} (assets/recibo/)`);
    const bytes = new Uint8Array(readFileSync(ruta));
    plantillaCache.set(archivo, bytes);
    return bytes;
}

const MOLDE_POR_TIPO: Record<'membresia' | 'publicidad', string> = {
    membresia: 'plantilla-recibo.pdf',
    publicidad: 'plantilla-recibo-publicidad.pdf',
};

/** Molde de fondo del tipo pedido; si el de publicidad aún no existe en assets, cae al de membresía. */
function leerMolde(tipo: 'membresia' | 'publicidad'): Uint8Array {
    try {
        return leerPlantilla(MOLDE_POR_TIPO[tipo]);
    } catch {
        return leerPlantilla(MOLDE_POR_TIPO.membresia);
    }
}

// ── Mapa de coordenadas (origen abajo-izquierda, en pt). Extraído del diseño. ──
type Campo = { x: number; y: number; size: number; align?: 'left' | 'right'; bold?: boolean; white?: boolean; red?: boolean; gray?: boolean };
const COORDS = {
    folio:           { x: 567.0, y: 680.6, size: 9.5,  align: 'right' as const, red: true },
    fecha:           { x: 566.9, y: 667.0, size: 9.5,  align: 'right' as const },
    negocio:         { x: 327.6, y: 594.2, size: 11.2, bold: true },
    sucursal:        { x: 374.8, y: 580.1, size: 9.5 },
    dueno:           { x: 374.8, y: 562.8, size: 9.5 },
    direccion:       { x: 374.8, y: 545.7, size: 9.5 },
    telefono:        { x: 374.8, y: 511.4, size: 9.5 },
    correo:          { x: 374.8, y: 494.1, size: 9.5 },
    periodo:         { x: 279.7, y: 423.3, size: 9.5 },
    formaPago:       { x: 374.7, y: 423.3, size: 9.5 },
    totalTabla:      { x: 555.9, y: 423.3, size: 9.5,  align: 'right' as const, bold: true },
    totalGrande:     { x: 549.0, y: 315.0, size: 19.1, align: 'right' as const, bold: true, white: true },
    // Renglón de DETALLE bajo el concepto (columna izquierda de la tabla). Solo se estampa en
    // recibos de PROMOCIÓN de apertura (= nota del pago); queda vacío en recibos normales.
    conceptoDetalle: { x: 73.7,  y: 412.2, size: 8.0,  gray: true },
    vigencia:        { x: 319.7, y: 250.7, size: 11.0, bold: true },
    atendio:         { x: 128.1, y: 206.4, size: 9.5 },
} satisfies Record<string, Campo>;

/** Ancho del área de datos (margen derecho del contenido), para el word-wrap de la dirección. */
const MARGEN_DERECHO = 566;

const NEGRO = rgb(0, 0, 0);                 // datos del recibo
const BLANCO = rgb(1, 1, 1);                // Total Pagado grande (sobre el recuadro azul)
const ROJO = rgb(0.8, 0, 0);                // #CC0000 (folio, estilo recibo)
const GRIS = rgb(0.42, 0.45, 0.50);         // detalle del concepto (subtexto tenue)

export interface DatosReciboPDF {
    /** Folio del recibo = pagos_membresia.id. */
    folio: string;
    nombreNegocio: string;
    sucursal?: string | null;
    nombreDueno?: string | null;
    direccionNegocio?: string | null;
    /** Ciudad y estado, en su propia línea bajo la dirección. */
    ciudadEstado?: string | null;
    telefonoNegocio?: string | null;
    correoNegocio?: string | null;
    /** Cómo se pagó: ingreso real (efectivo/transferencia/tarjeta) o cortesía (sin dinero). */
    concepto: 'efectivo' | 'transferencia' | 'cortesia' | 'tarjeta';
    /** Detalle opcional bajo el concepto (p.ej. "Promoción de apertura 3x1"). Vacío en pagos normales. */
    conceptoDetalle?: string | null;
    /** Monto cobrado en MXN. NULL en cortesía. */
    monto?: number | null;
    /** N meses cubiertos (para el campo "Periodo"). */
    periodoMeses?: number | null;
    /** Vigencia: fecha (ISO) hasta la que queda activa la membresía. */
    hasta: string;
    /** Fecha (ISO) de emisión. Default: ahora. */
    fechaPago?: string;
    /** Quién registró el pago (vendedor/gerente/admin) → "Atendido por". */
    atendio?: string | null;
    /** Molde de fondo: 'membresia' (default) o 'publicidad'. Si el de publicidad no existe en assets, cae al de membresía. */
    tipoRecibo?: 'membresia' | 'publicidad';
}

function formaPagoLegible(c: DatosReciboPDF['concepto']): string {
    if (c === 'transferencia') return 'Transferencia';
    if (c === 'tarjeta') return 'Tarjeta';
    if (c === 'cortesia') return 'Cortesía';
    return 'Efectivo';
}

function formatearMontoMXN(monto: number): string {
    return `${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto)} MXN`;
}

/** Fecha ISO → "12 de Julio de 2026" en la zona operativa de la empresa (Sonora), mes capitalizado.
 *  Los valores son timestamptz (instantes reales); formatear en hora local evita el salto de día
 *  que daba UTC al emitir de tarde (18:30 local = 01:30 UTC del día siguiente). */
function formatearFechaLarga(iso: string): string {
    // formatToParts para capitalizar SOLO el mes ('es-MX' lo da en minúscula).
    const partes = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA_EMPRESA }).formatToParts(new Date(iso));
    return partes.map((p) => (p.type === 'month' ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : p.value)).join('');
}

/** Folio → "#00001" (correlativo a 5 dígitos). Si llega un id no numérico (fallback), lo deja tal cual. */
function formatearFolio(folio: string): string {
    return /^\d+$/.test(folio) ? `#${folio.padStart(5, '0')}` : `#${folio}`;
}

/** Deja solo caracteres que la fuente estándar (WinAnsi) puede dibujar — evita que un emoji
 *  en el nombre del negocio rompa la generación. */
function winAnsi(t: string): string {
    return t.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '').trim();
}

/** Parte un texto en hasta `maxLineas` líneas que quepan en `maxAncho` (word-wrap). Si excede,
 *  el sobrante se junta en la última línea. */
function partirEnLineas(texto: string, font: PDFFont, size: number, maxAncho: number, maxLineas: number): string[] {
    const palabras = texto.split(/\s+/).filter(Boolean);
    const lineas: string[] = [];
    let actual = '';
    for (const p of palabras) {
        const prueba = actual ? `${actual} ${p}` : p;
        if (actual && font.widthOfTextAtSize(prueba, size) > maxAncho) {
            lineas.push(actual);
            actual = p;
        } else {
            actual = prueba;
        }
    }
    if (actual) lineas.push(actual);
    if (lineas.length > maxLineas) {
        return [...lineas.slice(0, maxLineas - 1), lineas.slice(maxLineas - 1).join(' ')];
    }
    return lineas;
}

/**
 * Genera el PDF del recibo (molde + datos estampados) y lo devuelve como Buffer.
 */
export async function generarReciboPagoPDF(datos: DatosReciboPDF): Promise<Buffer> {
    const doc = await PDFDocument.load(leerMolde(datos.tipoRecibo ?? 'membresia'));
    const page = doc.getPages()[0];
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const put = (campo: Campo, texto?: string | null) => {
        if (texto == null || texto === '') return;
        const limpio = winAnsi(String(texto));
        if (!limpio) return;
        const fuente: PDFFont = campo.bold ? helvBold : helv;
        const x = campo.align === 'right'
            ? campo.x - fuente.widthOfTextAtSize(limpio, campo.size)
            : campo.x;
        const color = campo.white ? BLANCO : campo.red ? ROJO : campo.gray ? GRIS : NEGRO;
        page.drawText(limpio, { x, y: campo.y, size: campo.size, font: fuente, color });
    };

    const esCortesia = datos.concepto === 'cortesia';
    const fechaPago = datos.fechaPago ?? new Date().toISOString();
    const totalStr = esCortesia ? 'Cortesía' : formatearMontoMXN(datos.monto ?? 0);
    const periodoStr = datos.periodoMeses
        ? `${datos.periodoMeses} ${datos.periodoMeses === 1 ? 'mes' : 'meses'}`
        : null;

    put(COORDS.folio, formatearFolio(datos.folio));
    put(COORDS.fecha, formatearFechaLarga(fechaPago));
    put(COORDS.negocio, datos.nombreNegocio);
    put(COORDS.sucursal, datos.sucursal);
    put(COORDS.dueno, datos.nombreDueno);
    // Dirección (hasta 2 líneas, word-wrap) y, en la LÍNEA SIGUIENTE, ciudad + estado.
    {
        const c = COORDS.direccion;
        const altoLinea = c.size * 1.25;
        let fila = 0;
        if (datos.direccionNegocio) {
            const lineas = partirEnLineas(winAnsi(datos.direccionNegocio), helv, c.size, MARGEN_DERECHO - c.x, 2);
            for (const linea of lineas) {
                page.drawText(linea, { x: c.x, y: c.y - fila * altoLinea, size: c.size, font: helv, color: NEGRO });
                fila++;
            }
        }
        if (datos.ciudadEstado) {
            const limpio = winAnsi(datos.ciudadEstado);
            if (limpio) page.drawText(limpio, { x: c.x, y: c.y - fila * altoLinea, size: c.size, font: helv, color: NEGRO });
        }
    }
    put(COORDS.telefono, datos.telefonoNegocio);
    put(COORDS.correo, datos.correoNegocio);
    put(COORDS.periodo, periodoStr);
    put(COORDS.formaPago, formaPagoLegible(datos.concepto));
    put(COORDS.conceptoDetalle, datos.conceptoDetalle);
    put(COORDS.totalTabla, totalStr);
    put(COORDS.totalGrande, totalStr);
    put(COORDS.vigencia, formatearFechaLarga(datos.hasta));
    put(COORDS.atendio, datos.atendio);

    const bytes = await doc.save();
    return Buffer.from(bytes);
}
