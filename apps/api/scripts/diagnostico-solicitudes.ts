#!/usr/bin/env tsx
/**
 * Diagnóstico: lista todas las publicaciones tipo `solicito` en
 * Puerto Peñasco para identificar por qué el widget Solicitudes
 * muestra 5 cuando antes había 6.
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    console.log('\n=== TODAS las publicaciones que CONTIENEN "solicito" ===\n');

    const todas = await pool.query(`
        SELECT
            id,
            titulo,
            estado,
            categoria,
            urgente,
            modo,
            tipo,
            sucursal_id,
            usuario_id,
            ciudad,
            expira_at,
            created_at
        FROM servicios_publicaciones
        WHERE (tipo = 'solicito' OR modo = 'solicito')
          AND ciudad ILIKE '%peñasco%'
        ORDER BY created_at DESC
    `);

    console.table(
        todas.rows.map((r) => ({
            id: r.id.slice(0, 8),
            titulo: r.titulo.slice(0, 35),
            estado: r.estado,
            tipo: r.tipo,
            modo: r.modo,
            categoria: r.categoria,
            sucursal: r.sucursal_id ? r.sucursal_id.slice(0, 8) : 'NULL',
            creada: r.created_at?.toISOString?.()?.slice(0, 10) ?? r.created_at,
        })),
    );

    console.log(`\nTotal: ${todas.rows.length}\n`);

    // Cuáles pasarían el filtro DEL FRONTEND (tipo === 'solicito')
    console.log('\n=== Filtro frontend `p.tipo === "solicito"` ===\n');
    const tipoSolicito = todas.rows.filter(
        (r) => r.tipo === 'solicito' && r.estado === 'activa'
            && (!r.expira_at || r.expira_at > new Date()),
    );
    console.table(
        tipoSolicito.map((r) => ({
            titulo: r.titulo.slice(0, 40),
            tipo: r.tipo,
            modo: r.modo,
        })),
    );
    console.log(`Pasan filtro frontend: ${tipoSolicito.length}`);

    // Las que tienen modo='solicito' pero tipo distinto
    const modoSolicitoTipoDistinto = todas.rows.filter(
        (r) => r.modo === 'solicito' && r.tipo !== 'solicito',
    );
    if (modoSolicitoTipoDistinto.length > 0) {
        console.log(`\n⚠️  ${modoSolicitoTipoDistinto.length} pub con modo='solicito' pero tipo distinto:`);
        console.table(
            modoSolicitoTipoDistinto.map((r) => ({
                titulo: r.titulo.slice(0, 40),
                tipo: r.tipo,
                modo: r.modo,
                estado: r.estado,
            })),
        );
    }

    // Las que tienen tipo='solicito' pero modo distinto
    const tipoSolicitoModoDistinto = todas.rows.filter(
        (r) => r.tipo === 'solicito' && r.modo !== 'solicito',
    );
    if (tipoSolicitoModoDistinto.length > 0) {
        console.log(`\n⚠️  ${tipoSolicitoModoDistinto.length} pub con tipo='solicito' pero modo distinto:`);
        console.table(
            tipoSolicitoModoDistinto.map((r) => ({
                titulo: r.titulo.slice(0, 40),
                tipo: r.tipo,
                modo: r.modo,
                estado: r.estado,
            })),
        );
    }

    await pool.end();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
