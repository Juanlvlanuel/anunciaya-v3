/**
 * probar-usuarios-lectura.ts — HARNESS (DEV) · Fase 1 VER del módulo Usuarios
 * ===========================================================================
 * Verifica las DOS lecturas del módulo Usuarios contra la BD real. SOLO SELECT — no crea,
 * no modifica, no borra nada. Seguro de correr en cualquier ambiente.
 *
 *   1) listarUsuarios   — paginación, conteos por estado, búsqueda, filtro por tipo
 *   2) obtenerExpediente — expediente-resumen de un usuario real (sombreros, contadores,
 *      diagnóstico de acceso) + que NUNCA se filtren secretos.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-usuarios-lectura.ts
 *
 * Ubicación: apps/api/scripts/probar-usuarios-lectura.ts
 */

import { config } from 'dotenv';
config();

import {
    listarUsuarios,
    obtenerExpediente,
    ESTADOS_USUARIO,
    TIPOS_USUARIO,
    type TipoUsuario,
} from '../src/services/admin/usuarios.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string): void {
    if (!condicion) fallos++;
    console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function main(): Promise<void> {
    console.log('\n[1] listarUsuarios — base, paginación y conteos');
    const lista = await listarUsuarios({ pagina: 1, porPagina: 5 });
    verificar('hay usuarios en la BD', lista.total > 0, `total=${lista.total}`);
    verificar('paginación: items ≤ porPagina', lista.items.length <= 5, `items=${lista.items.length}`);
    verificar('conteos.porEstado no vacío', lista.conteos.porEstado.length > 0, JSON.stringify(lista.conteos.porEstado));
    const sumaConteos = lista.conteos.porEstado.reduce((a, e) => a + e.total, 0);
    verificar('suma de conteos == conteos.total', sumaConteos === lista.conteos.total, `suma=${sumaConteos}, total=${lista.conteos.total}`);
    const estadosValidos = lista.conteos.porEstado.every((e) => (ESTADOS_USUARIO as readonly string[]).includes(e.estado));
    verificar('todos los estados de los chips son válidos', estadosValidos);
    const filaOk = lista.items.every((i) => typeof i.nombre === 'string' && typeof i.correo === 'string');
    verificar('cada fila trae nombre y correo', filaOk);

    const muestra = lista.items[0];

    console.log('\n[2] Filtro por estado — total == conteo del chip');
    const estadoConDatos = lista.conteos.porEstado.find((e) => e.total > 0)?.estado;
    if (estadoConDatos) {
        const filtrada = await listarUsuarios({ pagina: 1, porPagina: 5, estado: estadoConDatos as (typeof ESTADOS_USUARIO)[number] });
        const chip = lista.conteos.porEstado.find((e) => e.estado === estadoConDatos)!.total;
        verificar(`estado='${estadoConDatos}': total == chip`, filtrada.total === chip, `total=${filtrada.total}, chip=${chip}`);
        verificar(`estado='${estadoConDatos}': todas las filas tienen ese estado`, filtrada.items.every((i) => i.estado === estadoConDatos));
    } else {
        verificar('hay al menos un estado con datos', false);
    }

    console.log('\n[3] Búsqueda por correo de un usuario real');
    if (muestra) {
        const term = muestra.correo.slice(0, Math.min(6, muestra.correo.length));
        const busq = await listarUsuarios({ pagina: 1, porPagina: 20, busqueda: term });
        verificar(`búsqueda '${term}' encuentra al usuario`, busq.items.some((i) => i.id === muestra.id), `encontrados=${busq.items.length}`);
    }

    console.log('\n[4] Filtro por tipo — cada fila cumple el predicado de su rol');
    // Predicados espejo de condicionTipo() en usuarios.service.ts (los 5 tipos reales del FE:
    // Usuario · Dueño · Gerente de sucursal · Vendedor · Gerente regional).
    type FilaTipo = { rolEquipo: string | null; esDueno: boolean; esGerenteSucursal: boolean };
    const predicadosTipo: Record<TipoUsuario, (i: FilaTipo) => boolean> = {
        usuario: (i) => i.rolEquipo === null && !i.esDueno,        // cliente puro (sin rol ni negocio)
        comerciante: (i) => i.esDueno && !i.esGerenteSucursal,     // dueño (ligado a negocio, sin sucursal asignada)
        gerente_sucursal: (i) => i.esGerenteSucursal,              // encargado de una sucursal
        vendedor: (i) => i.rolEquipo === 'vendedor',
        gerente: (i) => i.rolEquipo === 'gerente',                 // gerente regional
    };
    for (const tipo of TIPOS_USUARIO) {
        const r = await listarUsuarios({ pagina: 1, porPagina: 50, tipo });
        verificar(`tipo='${tipo}': todas las filas cumplen el rol`, r.items.every(predicadosTipo[tipo]), `n=${r.items.length}`);
    }

    console.log('\n[5] Expediente 360 (resumen) de un usuario real');
    if (muestra) {
        const exp = await obtenerExpediente(muestra.id);
        verificar('expediente existe', exp !== null);
        if (exp) {
            verificar('id coincide', exp.id === muestra.id);
            verificar('trae diagnóstico de acceso', typeof exp.diagnostico.puedeIniciarSesion === 'boolean');
            verificar('trae sombreros', typeof exp.sombreros.esDueno === 'boolean');
            verificar('contadores son números', Number.isInteger(exp.sombreros.saldoPuntos) && Number.isInteger(exp.sombreros.totalResenas));
            // SEGURIDAD: el expediente NUNCA debe filtrar secretos.
            const json = JSON.stringify(exp);
            verificar('NO expone contraseña (hash)', !/contrasena_?hash/i.test(json));
            verificar('NO expone secretos 2FA', !/_secreto|"secret/i.test(json));
            verificar('NO expone codigo_verificacion', !/codigo_?verificacion/i.test(json));
        }
    }

    console.log('\n[6] Expediente de un DUEÑO de negocio (si hay) — trae negocioNombre');
    const pagina = await listarUsuarios({ pagina: 1, porPagina: 100 });
    const conNegocio = pagina.items.find((i) => i.esDueno);
    if (conNegocio) {
        const expDueno = await obtenerExpediente(conNegocio.id);
        verificar('dueño: sombreros.esDueno = true', expDueno?.sombreros.esDueno === true);
        verificar('dueño: trae negocioNombre', !!expDueno?.sombreros.negocioNombre, expDueno?.sombreros.negocioNombre ?? 'null');
    } else {
        console.log('    (sin dueños en la primera página — se omite)');
    }

    console.log('\n[7] Expediente de un id inexistente → null');
    const nulo = await obtenerExpediente('00000000-0000-0000-0000-000000000000');
    verificar('id inexistente → null', nulo === null);

    console.log(`\n${fallos === 0 ? '✅ TODO VERDE' : `❌ ${fallos} fallo(s)`}\n`);
    process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
