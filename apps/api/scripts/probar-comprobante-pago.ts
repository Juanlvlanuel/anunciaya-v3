/**
 * probar-comprobante-pago.ts — HARNESS de render (sin envío de correo)
 * ====================================================================
 * Verifica, SIN enviar correo ni tocar BD/Stripe:
 *   (A) las plantillas del COMPROBANTE de pago (HTML) en sus 4 variantes, y
 *   (B) la generación del RECIBO PDF (pdfkit) — defensa Camino B ("robo invisible").
 *
 * Genera archivos en apps/api/scripts/.out-comprobante/ para revisión visual:
 *   comprobante-efectivo.html · comprobante-transferencia.html · comprobante-cortesia.html
 *   bienvenida-alta.html · recibo-efectivo.pdf · recibo-cortesia.pdf
 *
 * Aserciones automáticas:
 *   - cortesía SIN "$"/"MXN"; efectivo/transferencia con monto formateado; vigencia presente.
 *   - el correo muestra el botón "Descargar tu recibo (PDF)" SOLO cuando hay reciboUrl.
 *   - el PDF empieza con la firma "%PDF" y pesa > 1 KB (documento real).
 *
 * Nota: generarReciboPagoPDF baja el logo de R2; si no hay red, cae a wordmark de texto
 * (el harness corre igual offline).
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-comprobante-pago.ts
 * Ubicación: apps/api/scripts/probar-comprobante-pago.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
    plantillaComprobantePago,
    plantillaBienvenida,
    type DatosComprobantePago,
} from '../src/utils/email.js';
import { generarReciboPagoPDF } from '../src/utils/reciboPdf.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '.out-comprobante');

// Vigencia de ejemplo (fija, para que el render sea estable): 12 de julio de 2026.
const HASTA = '2026-07-12T05:59:59.000Z';
const URL_RECIBO = 'https://assets.anunciaya.test/recibos/123-abcd1234.pdf';

async function main() {
    mkdirSync(OUT_DIR, { recursive: true });

    let fallos = 0;
    console.log('\n════════ Render · Comprobante + recibo PDF (Camino B) ════════');

    // ── 1) Efectivo (CON botón de descarga) ─────────────────────────────────────────
    const efectivo: DatosComprobantePago = { nombreNegocio: 'Tacos El Güero', concepto: 'efectivo', monto: 449, hasta: HASTA, reciboUrl: URL_RECIBO };
    const htmlEfectivo = plantillaComprobantePago('Juan Pérez', efectivo);
    writeFileSync(join(OUT_DIR, 'comprobante-efectivo.html'), htmlEfectivo);
    const pEfectivo =
        htmlEfectivo.includes('$449.00 MXN') &&
        htmlEfectivo.includes('Efectivo') &&
        htmlEfectivo.includes('de 2026') &&
        htmlEfectivo.includes('Tacos El G') &&
        htmlEfectivo.includes('Descargar tu recibo') &&
        htmlEfectivo.includes(URL_RECIBO);
    if (!pEfectivo) fallos++;
    console.log(`\n[1] Efectivo $449 → monto + vigencia + botón descarga   ${ok(pEfectivo)}`);

    // ── 2) Transferencia ──────────────────────────────────────────────────────────────
    const transferencia: DatosComprobantePago = { nombreNegocio: 'Estética Bella', concepto: 'transferencia', monto: 1347, hasta: HASTA };
    const htmlTransf = plantillaComprobantePago('Ana López', transferencia);
    writeFileSync(join(OUT_DIR, 'comprobante-transferencia.html'), htmlTransf);
    const pTransf =
        htmlTransf.includes('$1,347.00 MXN') &&
        htmlTransf.includes('Transferencia') &&
        htmlTransf.includes('de 2026') &&
        !htmlTransf.includes('Descargar tu recibo');       // SIN url → SIN botón
    if (!pTransf) fallos++;
    console.log(`[2] Transferencia $1,347 → sin url → sin botón          ${ok(pTransf)}`);

    // ── 3) Cortesía (SIN monto, copy distinto) ────────────────────────────────────────
    const cortesia: DatosComprobantePago = { nombreNegocio: 'Café Central', concepto: 'cortesia', monto: null, hasta: HASTA };
    const htmlCortesia = plantillaComprobantePago('Luis Soto', cortesia);
    writeFileSync(join(OUT_DIR, 'comprobante-cortesia.html'), htmlCortesia);
    const pCortesia =
        !htmlCortesia.includes('MXN') &&
        !htmlCortesia.includes('$') &&
        htmlCortesia.includes('cortes') &&
        htmlCortesia.includes('de 2026');
    if (!pCortesia) fallos++;
    console.log(`[3] Cortesía → SIN monto, copy propio, con vigencia     ${ok(pCortesia)}`);

    // ── 4) Bienvenida del alta manual (recibo del 1er pago + botón) ────────────────────
    const htmlBienvenida = plantillaBienvenida('María Ruiz', 'maria@correo.com', 'Ferretería Ruiz', efectivo);
    writeFileSync(join(OUT_DIR, 'bienvenida-alta.html'), htmlBienvenida);
    const pBienvenida =
        htmlBienvenida.includes('$449.00 MXN') &&
        htmlBienvenida.includes('crear') &&
        htmlBienvenida.includes('maria@correo.com') &&
        htmlBienvenida.includes('Descargar tu recibo');
    if (!pBienvenida) fallos++;
    console.log(`[4] Bienvenida alta → recibo + botón + CTA              ${ok(pBienvenida)}`);

    // ── 5) Recibo PDF sobre el MOLDE (efectivo, datos completos) ────────────────────────
    const pdfEfectivo = await generarReciboPagoPDF({
        folio: '1',
        nombreNegocio: 'Tacos El Güero',
        sucursal: 'Matriz',
        nombreDueno: 'Juan Pérez González',
        direccionNegocio: 'Melchor Ocampo entre Rocaportense y De los Ríos, Col. Centro, C.P. 83550',
        telefonoNegocio: '638 100 0000',
        correoNegocio: 'contacto@tacoselguero.com',
        concepto: 'efectivo',
        monto: 449,
        periodoMeses: 6,
        hasta: HASTA,
        atendio: 'Luis Soto',
    });
    writeFileSync(join(OUT_DIR, 'recibo-efectivo.pdf'), pdfEfectivo);
    const pPdfEfectivo = pdfEfectivo.subarray(0, 4).toString('latin1') === '%PDF' && pdfEfectivo.length > 1000;
    if (!pPdfEfectivo) fallos++;
    console.log(`[5] Recibo PDF efectivo (molde + datos) → %PDF válido (${(pdfEfectivo.length / 1024).toFixed(1)} KB)  ${ok(pPdfEfectivo)}`);

    // ── 6) Recibo PDF cortesía (sin monto) ──────────────────────────────────────────────
    const pdfCortesia = await generarReciboPagoPDF({
        folio: '2',
        nombreNegocio: 'Café Central',
        sucursal: 'Matriz',
        nombreDueno: 'Luis Soto',
        concepto: 'cortesia',
        monto: null,
        periodoMeses: 3,
        hasta: HASTA,
        atendio: 'Ana Gerente',
    });
    writeFileSync(join(OUT_DIR, 'recibo-cortesia.pdf'), pdfCortesia);
    const pPdfCortesia = pdfCortesia.subarray(0, 4).toString('latin1') === '%PDF' && pdfCortesia.length > 1000;
    if (!pPdfCortesia) fallos++;
    console.log(`[6] Recibo PDF cortesía (molde + datos) → %PDF válido (${(pdfCortesia.length / 1024).toFixed(1)} KB)   ${ok(pPdfCortesia)}`);

    console.log(`\n📁 Archivos en: ${OUT_DIR}`);
    console.log(`Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
    console.log('══════════════════════════════════════════════════════════════\n');
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-comprobante-pago:', err); process.exit(1); });
