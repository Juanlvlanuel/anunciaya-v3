/**
 * probar-recibos-publicidad.ts — HARNESS (DEV) · Recibos extendido con publicidad
 * ===============================================================================
 * Valida que el módulo Recibos del Panel incluye los recibos de PUBLICIDAD (con folio) junto a los de
 * membresía, y que el alcance funciona (super ve publicidad; gerente sin región y vendedor, no).
 * Solo LECTURA. Requiere el seed `sembrar-publicidad-dev.ts` (deja 2 anuncios manuales con folio).
 *
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/probar-recibos-publicidad.ts
 *
 * Ubicación: apps/api/scripts/probar-recibos-publicidad.ts
 */

import { config } from 'dotenv';
config();

import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { listarRecibos } from '../src/services/admin/recibos.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const panel = (rolEquipo: UsuarioPanel['rolEquipo'], regionId: string | null): UsuarioPanel => ({
  usuarioId: null, rolEquipo, regionId, viaSecret: false, panel2faHabilitado: false, panel2faOk: true,
});

const F = { pagina: 1, porPagina: 200 };

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Recibos extendido con publicidad ════════');

  const lista = await listarRecibos(panel('superadmin', null), F);
  const pub = lista.items.filter((i) => i.origen === 'publicidad');
  const mem = lista.items.filter((i) => i.origen === 'membresia');
  verificar('super ve recibos de publicidad (del seed)', pub.length >= 1, `${pub.length} pub / ${mem.length} mem`);
  verificar('cada recibo de publicidad tiene folio + titular', pub.every((p) => p.folio != null && !!p.negocioNombre));
  verificar('los recibos de publicidad cargan su correo (reenvío)', pub.every((p) => p.correoDueno !== undefined));

  // Búsqueda por folio de un recibo de publicidad.
  if (pub[0]?.folio != null) {
    const porFolio = await listarRecibos(panel('superadmin', null), { ...F, busqueda: String(pub[0].folio) });
    verificar('busca un recibo de publicidad por folio', porFolio.items.some((i) => i.origen === 'publicidad' && i.folio === pub[0].folio));
  }

  // Alcance: gerente sin región y vendedor NO ven publicidad.
  const gerenteSinRegion = await listarRecibos(panel('gerente', null), F);
  verificar('gerente sin región no ve publicidad', gerenteSinRegion.items.every((i) => i.origen !== 'publicidad'));

  const vendedor = await listarRecibos(panel('vendedor', null), F);
  verificar('vendedor no ve publicidad', vendedor.items.every((i) => i.origen !== 'publicidad'));

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-recibos-publicidad:', err);
  process.exit(1);
});
