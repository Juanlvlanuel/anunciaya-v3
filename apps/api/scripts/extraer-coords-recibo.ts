/**
 * extraer-coords-recibo.ts — HERRAMIENTA de desarrollo (no corre en producción)
 * =============================================================================
 * Lee `apps/api/src/assets/recibo/referencia-recibo.pdf` (el diseño CON los {{placeholders}})
 * y extrae la posición (x, y), tamaño de fuente y página de CADA placeholder, usando pdfjs-dist.
 *
 * El resultado se "hornea" como constante COORDS en reciboPdf.ts → en producción el motor solo
 * usa pdf-lib sobre el molde limpio, sin pdfjs ni el archivo de referencia.
 *
 * Reejecutar SOLO si cambia el diseño de la referencia.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/extraer-coords-recibo.ts
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const REF = join(dirname(fileURLToPath(import.meta.url)), '../src/assets/recibo/referencia-recibo.pdf');

interface Coord { x: number; xRight: number; y: number; fontSize: number; page: number; }

async function main() {
    // Build legacy de pdfjs (compatible con Node).
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(readFileSync(REF));
    const doc = await pdfjs.getDocument({ data, isEvalSupported: false, useSystemFonts: true }).promise;

    const coords: Record<string, Coord[]> = {};
    const reNombre = /\{\{([A-Z_]+)\}\}/;

    for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const vp = page.getViewport({ scale: 1 });
        if (p === 1) console.log(`📐 Página ${p}: ${vp.width.toFixed(1)} × ${vp.height.toFixed(1)} pt\n`);
        const tc = await page.getTextContent();
        const items = tc.items as Array<{ str: string; transform: number[]; width: number }>;

        for (let i = 0; i < items.length; i++) {
            if (!items[i].str.includes('{{')) continue;
            // Reconstruir el placeholder por si viene partido en varios items + sumar su ancho.
            let texto = items[i].str;
            let w = items[i].width ?? 0;
            let j = i;
            while (!texto.includes('}}') && j + 1 < items.length && j - i < 5) {
                j++;
                texto += items[j].str;
                w += items[j].width ?? 0;
            }
            const m = texto.match(reNombre);
            if (!m) continue;
            const t = items[i].transform; // [a,b,c,d,e,f] → x=e, y=f, fontSize≈d
            (coords[m[1]] ??= []).push({
                x: +t[4].toFixed(1),
                xRight: +(t[4] + w).toFixed(1),
                y: +t[5].toFixed(1),
                fontSize: +Math.abs(t[3]).toFixed(1),
                page: p,
            });
        }
    }

    const filas = Object.entries(coords).flatMap(([k, arr]) =>
        arr.map((c, idx) => ({ nombre: arr.length > 1 ? `${k}#${idx + 1}` : k, ...c })),
    ).sort((a, b) => b.y - a.y);
    console.log('Placeholders encontrados (de arriba hacia abajo):\n');
    for (const c of filas) {
        console.log(`  ${c.nombre.padEnd(18)} x=${String(c.x).padStart(6)}  y=${String(c.y).padStart(6)}  fontSize=${c.fontSize}`);
    }
    console.log(`\nTotal: ${filas.length} instancias (${Object.keys(coords).length} nombres)\n`);
    console.log('─── COORDS (para pegar en reciboPdf.ts) ───');
    console.log(JSON.stringify(coords, null, 2));
}

main().catch((err) => { console.error('Error:', err); process.exit(1); });
