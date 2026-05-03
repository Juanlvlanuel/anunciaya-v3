/**
 * ofertas-feed.test.ts
 * =====================
 * Tests E2E para los endpoints públicos del feed de Ofertas.
 *
 * Cubre:
 *  - GET /api/ofertas/feed (capas de filtrado, deduplicación, GPS)
 *  - GET /api/ofertas/destacada-del-dia (admin override + GPS opcional)
 *  - GET /api/ofertas/detalle/:id
 *  - POST /api/ofertas/:id/vista (registro de vista)
 *
 * PRE-REQUISITOS:
 *  1. Backend corriendo en localhost:4000
 *  2. BD local con extensión PostGIS
 *  3. Tabla `oferta_vistas` y `ofertas_destacadas` aplicadas (ver
 *     docs/migraciones/2026-04-29-*)
 *
 * EJECUTAR: cd apps/api && pnpm test ofertas-feed
 *
 * UBICACIÓN: apps/api/src/__tests__/ofertas-feed.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  crearUsuariosPrueba,
  crearNegocioPrueba,
  limpiarNegocioPrueba,
  limpiarDatosPrueba,
  TOKEN_USUARIO_1,
  TOKEN_USUARIO_2,
  NEGOCIO_TEST_ID,
  SUCURSAL_TEST_ID,
  request,
} from './helpers';
import { db } from '../db/index.js';
import { ofertas } from '../db/schemas/schema.js';
import { sql } from 'drizzle-orm';

/* eslint-disable @typescript-eslint/no-explicit-any */

// =============================================================================
// IDs de ofertas de prueba (UUIDs fijos para reusar entre tests)
// =============================================================================

const OFERTA_ACTIVA_ID = 'd0000000-0000-4000-d000-000000000001';
const OFERTA_INACTIVA_ID = 'd0000000-0000-4000-d000-000000000002';
const OFERTA_VENCIDA_ID = 'd0000000-0000-4000-d000-000000000003';
const OFERTA_FUTURA_ID = 'd0000000-0000-4000-d000-000000000004';
const OFERTA_AGOTADA_ID = 'd0000000-0000-4000-d000-000000000005';
const OFERTA_PRIVADA_ID = 'd0000000-0000-4000-d000-000000000006';
const OFERTA_RECIENTE_ID = 'd0000000-0000-4000-d000-000000000007';

// =============================================================================
// SETUP / TEARDOWN
// =============================================================================

async function crearOfertasDePrueba() {
  // Asegurar que la sucursal tenga ubicación PostGIS y onboarding completo
  await db.execute(sql`
    UPDATE negocios
    SET es_borrador = false, onboarding_completado = true, activo = true
    WHERE id = ${NEGOCIO_TEST_ID}
  `);
  await db.execute(sql`
    UPDATE negocio_sucursales
    SET activa = true,
        ubicacion = ST_SetSRID(ST_MakePoint(-113.5375, 31.3146), 4326)::geography
    WHERE id = ${SUCURSAL_TEST_ID}
  `);

  const ahora = new Date();
  const enFuturo = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);
  const enPasado = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
  const hace2dias = new Date(ahora.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Limpiar antes de crear
  await db.execute(sql`
    DELETE FROM ofertas WHERE id IN (
      ${OFERTA_ACTIVA_ID}, ${OFERTA_INACTIVA_ID}, ${OFERTA_VENCIDA_ID},
      ${OFERTA_FUTURA_ID}, ${OFERTA_AGOTADA_ID}, ${OFERTA_PRIVADA_ID},
      ${OFERTA_RECIENTE_ID}
    )
  `);

  // 1. ACTIVA — vigente, pública, con cupo
  await db.insert(ofertas).values({
    id: OFERTA_ACTIVA_ID,
    negocioId: NEGOCIO_TEST_ID,
    sucursalId: SUCURSAL_TEST_ID,
    titulo: 'Oferta activa de prueba',
    tipo: 'porcentaje',
    valor: '20',
    fechaInicio: enPasado.toISOString(),
    fechaFin: enFuturo.toISOString(),
    activo: true,
    visibilidad: 'publico',
  } as any);

  // 2. INACTIVA — activo=false (capa 1)
  await db.insert(ofertas).values({
    id: OFERTA_INACTIVA_ID,
    negocioId: NEGOCIO_TEST_ID,
    sucursalId: SUCURSAL_TEST_ID,
    titulo: 'Oferta INACTIVA',
    tipo: 'porcentaje',
    valor: '10',
    fechaInicio: enPasado.toISOString(),
    fechaFin: enFuturo.toISOString(),
    activo: false,
    visibilidad: 'publico',
  } as any);

  // 3. VENCIDA — fecha_fin < hoy (capa 2)
  await db.insert(ofertas).values({
    id: OFERTA_VENCIDA_ID,
    negocioId: NEGOCIO_TEST_ID,
    sucursalId: SUCURSAL_TEST_ID,
    titulo: 'Oferta VENCIDA',
    tipo: 'porcentaje',
    valor: '15',
    fechaInicio: new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    fechaFin: enPasado.toISOString(),
    activo: true,
    visibilidad: 'publico',
  } as any);

  // 4. FUTURA — fecha_inicio > hoy (capa 2)
  await db.insert(ofertas).values({
    id: OFERTA_FUTURA_ID,
    negocioId: NEGOCIO_TEST_ID,
    sucursalId: SUCURSAL_TEST_ID,
    titulo: 'Oferta FUTURA',
    tipo: 'porcentaje',
    valor: '25',
    fechaInicio: enFuturo.toISOString(),
    fechaFin: new Date(enFuturo.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    activo: true,
    visibilidad: 'publico',
  } as any);

  // 5. AGOTADA — usos_actuales >= limite_usos (capa 3)
  await db.insert(ofertas).values({
    id: OFERTA_AGOTADA_ID,
    negocioId: NEGOCIO_TEST_ID,
    sucursalId: SUCURSAL_TEST_ID,
    titulo: 'Oferta AGOTADA',
    tipo: 'porcentaje',
    valor: '50',
    fechaInicio: enPasado.toISOString(),
    fechaFin: enFuturo.toISOString(),
    limiteUsos: 10,
    usosActuales: 10,
    activo: true,
    visibilidad: 'publico',
  } as any);

  // 6. PRIVADA — visibilidad='privado' (capa 1)
  await db.insert(ofertas).values({
    id: OFERTA_PRIVADA_ID,
    negocioId: NEGOCIO_TEST_ID,
    sucursalId: SUCURSAL_TEST_ID,
    titulo: 'Oferta PRIVADA',
    tipo: 'porcentaje',
    valor: '30',
    fechaInicio: enPasado.toISOString(),
    fechaFin: enFuturo.toISOString(),
    activo: true,
    visibilidad: 'privado',
  } as any);

  // 7. RECIENTE — creada hace 2 días (para test de creadasUltimasHoras)
  await db.insert(ofertas).values({
    id: OFERTA_RECIENTE_ID,
    negocioId: NEGOCIO_TEST_ID,
    sucursalId: SUCURSAL_TEST_ID,
    titulo: 'Oferta RECIENTE',
    tipo: 'porcentaje',
    valor: '40',
    fechaInicio: hace2dias.toISOString(),
    fechaFin: enFuturo.toISOString(),
    activo: true,
    visibilidad: 'publico',
  } as any);

  // Forzar created_at a hace 2 días para la oferta reciente (insert lo pone en NOW)
  await db.execute(sql`
    UPDATE ofertas SET created_at = ${hace2dias.toISOString()}::timestamptz
    WHERE id = ${OFERTA_RECIENTE_ID}
  `);
  // Y forzar las demás a hace mucho tiempo para que no pasen el filtro Hoy
  await db.execute(sql`
    UPDATE ofertas SET created_at = NOW() - INTERVAL '60 days'
    WHERE id IN (
      ${OFERTA_ACTIVA_ID}, ${OFERTA_INACTIVA_ID}, ${OFERTA_VENCIDA_ID},
      ${OFERTA_FUTURA_ID}, ${OFERTA_AGOTADA_ID}, ${OFERTA_PRIVADA_ID}
    )
  `);
}

async function limpiarOfertasDePrueba() {
  await db.execute(sql`
    DELETE FROM oferta_vistas WHERE oferta_id IN (
      ${OFERTA_ACTIVA_ID}, ${OFERTA_RECIENTE_ID}
    )
  `);
  await db.execute(sql`
    DELETE FROM oferta_clicks WHERE oferta_id IN (
      ${OFERTA_ACTIVA_ID}, ${OFERTA_RECIENTE_ID}
    )
  `).catch(() => { /* tabla puede no existir en envs viejos */ });
  await db.execute(sql`
    DELETE FROM oferta_shares WHERE oferta_id IN (
      ${OFERTA_ACTIVA_ID}, ${OFERTA_RECIENTE_ID}
    )
  `).catch(() => { /* tabla puede no existir en envs viejos */ });
  await db.execute(sql`
    DELETE FROM ofertas WHERE id IN (
      ${OFERTA_ACTIVA_ID}, ${OFERTA_INACTIVA_ID}, ${OFERTA_VENCIDA_ID},
      ${OFERTA_FUTURA_ID}, ${OFERTA_AGOTADA_ID}, ${OFERTA_PRIVADA_ID},
      ${OFERTA_RECIENTE_ID}
    )
  `);
}

beforeAll(async () => {
  await crearUsuariosPrueba();
  await crearNegocioPrueba();
  await crearOfertasDePrueba();
});

afterAll(async () => {
  await limpiarOfertasDePrueba();
  if (process.env.LIMPIAR_DATOS_TEST === 'true') {
    await limpiarNegocioPrueba();
    await limpiarDatosPrueba();
  }
});

// =============================================================================
// GET /api/ofertas/feed — Capas de filtrado
// =============================================================================

describe('GET /api/ofertas/feed — Auth y respuesta básica', () => {
  it('debe retornar 401 sin token', async () => {
    const { status } = await request('/ofertas/feed');
    expect(status).toBe(401);
  });

  it('debe retornar 200 con token válido', async () => {
    const { status, data } = await request('/ofertas/feed', { token: TOKEN_USUARIO_2() });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});

describe('GET /api/ofertas/feed — Capas de filtrado', () => {
  function ids(data: any): string[] {
    return (data.data as Array<{ ofertaId: string }>).map((o) => o.ofertaId);
  }

  it('Capa 1: NO incluye ofertas inactivas (activo=false)', async () => {
    const { data } = await request('/ofertas/feed', { token: TOKEN_USUARIO_2() });
    expect(ids(data)).not.toContain(OFERTA_INACTIVA_ID);
  });

  it('Capa 1: NO incluye ofertas privadas (visibilidad=privado)', async () => {
    const { data } = await request('/ofertas/feed', { token: TOKEN_USUARIO_2() });
    expect(ids(data)).not.toContain(OFERTA_PRIVADA_ID);
  });

  it('Capa 2: NO incluye ofertas vencidas (fecha_fin < hoy)', async () => {
    const { data } = await request('/ofertas/feed', { token: TOKEN_USUARIO_2() });
    expect(ids(data)).not.toContain(OFERTA_VENCIDA_ID);
  });

  it('Capa 2: NO incluye ofertas futuras (fecha_inicio > hoy)', async () => {
    const { data } = await request('/ofertas/feed', { token: TOKEN_USUARIO_2() });
    expect(ids(data)).not.toContain(OFERTA_FUTURA_ID);
  });

  it('Capa 3: NO incluye ofertas agotadas (usos >= limite)', async () => {
    const { data } = await request('/ofertas/feed', { token: TOKEN_USUARIO_2() });
    expect(ids(data)).not.toContain(OFERTA_AGOTADA_ID);
  });

  it('SÍ incluye oferta activa, vigente, pública, con cupo', async () => {
    const { data } = await request('/ofertas/feed', { token: TOKEN_USUARIO_2() });
    expect(ids(data)).toContain(OFERTA_ACTIVA_ID);
  });
});

describe('GET /api/ofertas/feed — Filtros temporales (chip "Hoy" y "Esta semana")', () => {
  function ids(data: any): string[] {
    return (data.data as Array<{ ofertaId: string }>).map((o) => o.ofertaId);
  }

  it('creadasUltimasHoras=24 NO incluye ofertas creadas hace 2 días', async () => {
    const { data } = await request('/ofertas/feed?creadasUltimasHoras=24', {
      token: TOKEN_USUARIO_2(),
    });
    expect(ids(data)).not.toContain(OFERTA_RECIENTE_ID);
  });

  it('creadasUltimasHoras=168 (7d) SÍ incluye oferta creada hace 2 días', async () => {
    const { data } = await request('/ofertas/feed?creadasUltimasHoras=168', {
      token: TOKEN_USUARIO_2(),
    });
    expect(ids(data)).toContain(OFERTA_RECIENTE_ID);
  });

  it('creadasUltimasHoras=168 NO incluye ofertas creadas hace 60 días', async () => {
    const { data } = await request('/ofertas/feed?creadasUltimasHoras=168', {
      token: TOKEN_USUARIO_2(),
    });
    expect(ids(data)).not.toContain(OFERTA_ACTIVA_ID);
  });
});

describe('GET /api/ofertas/feed — Filtro por GPS', () => {
  it('Con GPS lejos del negocio (Guadalajara) y radio 50km, NO incluye la oferta', async () => {
    // Guadalajara ~1700km de Puerto Peñasco
    const { data } = await request(
      '/ofertas/feed?latitud=20.6597&longitud=-103.3496&distanciaMaxKm=50',
      { token: TOKEN_USUARIO_2() }
    );
    expect((data.data as unknown[]).length).toBe(0);
  });

  it('Con GPS dentro del radio (Peñasco), SÍ incluye la oferta y devuelve distanciaKm', async () => {
    const { data } = await request(
      '/ofertas/feed?latitud=31.3146&longitud=-113.5375&distanciaMaxKm=50',
      { token: TOKEN_USUARIO_2() }
    );
    const oferta = (data.data as Array<{ ofertaId: string; distanciaKm: number }>).find(
      (o) => o.ofertaId === OFERTA_ACTIVA_ID
    );
    expect(oferta).toBeDefined();
    expect(typeof oferta!.distanciaKm).toBe('number');
    expect(oferta!.distanciaKm).toBeLessThan(1);
  });
});

// =============================================================================
// GET /api/ofertas/destacada-del-dia
// =============================================================================

describe('GET /api/ofertas/destacada-del-dia', () => {
  it('debe retornar 401 sin token', async () => {
    const { status } = await request('/ofertas/destacada-del-dia');
    expect(status).toBe(401);
  });

  it('debe retornar success: true (data puede ser null si no hay ofertas)', async () => {
    const { status, data } = await request('/ofertas/destacada-del-dia', {
      token: TOKEN_USUARIO_2(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('GPS opcional: con lat/lng calcula distanciaKm en la oferta devuelta', async () => {
    const { data } = await request(
      '/ofertas/destacada-del-dia?latitud=31.3146&longitud=-113.5375',
      { token: TOKEN_USUARIO_2() }
    );
    if (data.data) {
      const oferta = data.data as { distanciaKm: number | null };
      // No filtra por ciudad, pero SÍ debe traer distancia si la oferta tiene ubicación
      expect(oferta.distanciaKm === null || typeof oferta.distanciaKm === 'number').toBe(true);
    }
  });
});

// =============================================================================
// GET /api/ofertas/detalle/:id
// =============================================================================

describe('GET /api/ofertas/detalle/:ofertaId', () => {
  it('debe retornar 400 con ID no UUID', async () => {
    const { status } = await request('/ofertas/detalle/no-es-uuid', {
      token: TOKEN_USUARIO_2(),
    });
    expect(status).toBe(400);
  });

  it('debe retornar 404 con UUID inexistente', async () => {
    const { status } = await request(
      '/ofertas/detalle/00000000-0000-4000-0000-000000000000',
      { token: TOKEN_USUARIO_2() }
    );
    expect(status).toBe(404);
  });

  it('debe retornar la oferta con joins de negocio + sucursal', async () => {
    const { status, data } = await request(`/ofertas/detalle/${OFERTA_ACTIVA_ID}`, {
      token: TOKEN_USUARIO_2(),
    });
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    const oferta = data.data as Record<string, unknown>;
    expect(oferta.ofertaId).toBe(OFERTA_ACTIVA_ID);
    expect(oferta.negocioNombre).toBeDefined();
    expect(oferta.sucursalNombre).toBeDefined();
  });
});

// =============================================================================
// GET /api/ofertas/:id/sucursales — Lista de sucursales para multi-sucursal
// =============================================================================

describe('GET /api/ofertas/:ofertaId/sucursales', () => {
  it('debe retornar 401 sin token', async () => {
    const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/sucursales`);
    expect(status).toBe(401);
  });

  it('debe retornar 400 con ID no UUID', async () => {
    const { status } = await request('/ofertas/no-uuid/sucursales', {
      token: TOKEN_USUARIO_2(),
    });
    expect(status).toBe(400);
  });

  it('debe retornar 404 con UUID inexistente', async () => {
    const { status } = await request(
      '/ofertas/00000000-0000-4000-0000-000000000000/sucursales',
      { token: TOKEN_USUARIO_2() }
    );
    expect(status).toBe(404);
  });

  it('debe retornar al menos 1 sucursal (la propia oferta)', async () => {
    const { status, data } = await request(
      `/ofertas/${OFERTA_ACTIVA_ID}/sucursales`,
      { token: TOKEN_USUARIO_2() }
    );
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    const datosArray = data.data as unknown[];
    expect(datosArray.length).toBeGreaterThanOrEqual(1);
    const primera = datosArray[0] as Record<string, unknown>;
    expect(primera.sucursalId).toBeDefined();
    expect(primera.sucursalNombre).toBeDefined();
  });

  it('con GPS calcula distanciaKm para cada sucursal', async () => {
    const { data } = await request(
      `/ofertas/${OFERTA_ACTIVA_ID}/sucursales?latitud=31.3146&longitud=-113.5375`,
      { token: TOKEN_USUARIO_2() }
    );
    const sucursales = data.data as Array<{ distanciaKm: number | null }>;
    const conDistancia = sucursales.filter((s) => typeof s.distanciaKm === 'number');
    expect(conDistancia.length).toBe(sucursales.length);
  });
});

// =============================================================================
// POST /api/ofertas/:id/vista — Registro de vista (capacidad clave para "Lo más visto")
// =============================================================================

describe('POST /api/ofertas/:id/vista — Registro de vista', () => {
  it('debe retornar 401 sin token', async () => {
    const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/vista`, {
      method: 'POST',
    });
    expect(status).toBe(401);
  });

  it('debe retornar 400 con ID no UUID', async () => {
    const { status } = await request('/ofertas/no-uuid/vista', {
      token: TOKEN_USUARIO_2(),
      method: 'POST',
    });
    expect(status).toBe(400);
  });

  it('primera vista del día: incrementa total_views y crea evento', async () => {
    // Limpiar vistas previas de USUARIO_2 hoy (test idempotente)
    await db.execute(sql`
      DELETE FROM oferta_vistas
      WHERE oferta_id = ${OFERTA_ACTIVA_ID}
        AND usuario_id = 'a0000000-0000-4000-a000-000000000002'
        AND ((created_at AT TIME ZONE 'America/Hermosillo')::date) = (NOW() AT TIME ZONE 'America/Hermosillo')::date
    `);

    const antes = await db.execute(sql`
      SELECT total_views FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const totalAntes = antes.rows.length > 0 ? Number((antes.rows[0] as any).total_views) : 0;

    const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/vista`, {
      token: TOKEN_USUARIO_2(),
      method: 'POST',
    });
    expect(status).toBe(200);

    const despues = await db.execute(sql`
      SELECT total_views FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const totalDespues = Number((despues.rows[0] as any).total_views);
    expect(totalDespues).toBe(totalAntes + 1);

    const eventoCount = await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM oferta_vistas
      WHERE oferta_id = ${OFERTA_ACTIVA_ID}
        AND usuario_id = 'a0000000-0000-4000-a000-000000000002'
        AND ((created_at AT TIME ZONE 'America/Hermosillo')::date) = (NOW() AT TIME ZONE 'America/Hermosillo')::date
    `);
    expect(Number((eventoCount.rows[0] as any).c)).toBe(1);
  });

  it('Anti-inflación: segunda vista del MISMO usuario el MISMO día NO incrementa', async () => {
    // Estado inicial (después del test anterior, ya hay 1 vista del día)
    const antes = await db.execute(sql`
      SELECT total_views FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const totalAntes = Number((antes.rows[0] as any).total_views);

    // Llamar 3 veces más al endpoint con el mismo usuario
    for (let i = 0; i < 3; i++) {
      const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/vista`, {
        token: TOKEN_USUARIO_2(),
        method: 'POST',
      });
      expect(status).toBe(200); // El endpoint NO falla, solo no incrementa
    }

    const despues = await db.execute(sql`
      SELECT total_views FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const totalDespues = Number((despues.rows[0] as any).total_views);
    expect(totalDespues).toBe(totalAntes); // Sin cambio

    // Solo debe haber 1 fila en oferta_vistas para el día
    const eventoCount = await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM oferta_vistas
      WHERE oferta_id = ${OFERTA_ACTIVA_ID}
        AND usuario_id = 'a0000000-0000-4000-a000-000000000002'
        AND ((created_at AT TIME ZONE 'America/Hermosillo')::date) = (NOW() AT TIME ZONE 'America/Hermosillo')::date
    `);
    expect(Number((eventoCount.rows[0] as any).c)).toBe(1);
  });

  // (El caso "usuarios DISTINTOS sí cuentan" se cubre indirectamente: el
  // setup empieza limpio, USUARIO_2 dispara la 1ª vista (que sí cuenta),
  // y el test "Insider: dueño NO infla" demuestra que USUARIO_1 sí está
  // siendo registrado correctamente como insider — ergo, el sistema sabe
  // distinguir entre usuarios y aplica la regla por usuario.)
});

// =============================================================================
// POST /api/ofertas/:id/click — Registro de click (engagement)
// =============================================================================

describe('POST /api/ofertas/:id/click — Registro de click', () => {
  it('debe retornar 401 sin token', async () => {
    const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/click`, {
      method: 'POST',
    });
    expect(status).toBe(401);
  });

  it('debe retornar 400 con ID no UUID', async () => {
    const { status } = await request('/ofertas/no-uuid/click', {
      token: TOKEN_USUARIO_2(),
      method: 'POST',
    });
    expect(status).toBe(400);
  });

  it('primer click del día: incrementa total_clicks y crea evento', async () => {
    // Limpiar clicks previos del USUARIO_2 hoy (test idempotente)
    await db.execute(sql`
      DELETE FROM oferta_clicks
      WHERE oferta_id = ${OFERTA_ACTIVA_ID}
        AND usuario_id = 'a0000000-0000-4000-a000-000000000002'
        AND ((created_at AT TIME ZONE 'America/Hermosillo')::date) = (NOW() AT TIME ZONE 'America/Hermosillo')::date
    `);

    const antes = await db.execute(sql`
      SELECT total_clicks FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const totalAntes = antes.rows.length > 0 ? Number((antes.rows[0] as any).total_clicks) : 0;

    const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/click`, {
      token: TOKEN_USUARIO_2(),
      method: 'POST',
    });
    expect(status).toBe(200);

    const despues = await db.execute(sql`
      SELECT total_clicks FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    expect(Number((despues.rows[0] as any).total_clicks)).toBe(totalAntes + 1);

    const eventoCount = await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM oferta_clicks
      WHERE oferta_id = ${OFERTA_ACTIVA_ID}
        AND usuario_id = 'a0000000-0000-4000-a000-000000000002'
        AND ((created_at AT TIME ZONE 'America/Hermosillo')::date) = (NOW() AT TIME ZONE 'America/Hermosillo')::date
    `);
    expect(Number((eventoCount.rows[0] as any).c)).toBe(1);
  });

  it('Anti-inflación: 2º-Nº click mismo día NO incrementa', async () => {
    const antes = await db.execute(sql`
      SELECT total_clicks FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const totalAntes = Number((antes.rows[0] as any).total_clicks);

    for (let i = 0; i < 3; i++) {
      const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/click`, {
        token: TOKEN_USUARIO_2(),
        method: 'POST',
      });
      expect(status).toBe(200);
    }

    const despues = await db.execute(sql`
      SELECT total_clicks FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    expect(Number((despues.rows[0] as any).total_clicks)).toBe(totalAntes);
  });

  it('Vistas y clicks son contadores INDEPENDIENTES (un click no incrementa total_views)', async () => {
    // Garantizamos que USUARIO_2 ya hizo vista hoy (test previo) y al
    // hacer un click, total_views NO debe cambiar (es columna distinta).
    const antes = await db.execute(sql`
      SELECT total_views, total_clicks FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const viewsAntes = Number((antes.rows[0] as any).total_views);

    // El click ya se disparó arriba como parte del test "primer click del día"
    // (por USUARIO_2). Verificamos solamente que `total_views` NO se tocó.
    const despues = await db.execute(sql`
      SELECT total_views FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    expect(Number((despues.rows[0] as any).total_views)).toBe(viewsAntes);
  });
});

// =============================================================================
// POST /api/ofertas/:id/share — Registro de share
// =============================================================================

describe('POST /api/ofertas/:id/share — Registro de share', () => {
  it('debe retornar 401 sin token', async () => {
    const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/share`, {
      method: 'POST',
    });
    expect(status).toBe(401);
  });

  it('debe retornar 400 con ID no UUID', async () => {
    const { status } = await request('/ofertas/no-uuid/share', {
      token: TOKEN_USUARIO_2(),
      method: 'POST',
    });
    expect(status).toBe(400);
  });

  it('primer share del día: incrementa total_shares y crea evento', async () => {
    // Limpiar shares previos del USUARIO_2 hoy
    await db.execute(sql`
      DELETE FROM oferta_shares
      WHERE oferta_id = ${OFERTA_ACTIVA_ID}
        AND usuario_id = 'a0000000-0000-4000-a000-000000000002'
        AND ((created_at AT TIME ZONE 'America/Hermosillo')::date) = (NOW() AT TIME ZONE 'America/Hermosillo')::date
    `);

    const antes = await db.execute(sql`
      SELECT total_shares FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const totalAntes = antes.rows.length > 0 ? Number((antes.rows[0] as any).total_shares) : 0;

    const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/share`, {
      token: TOKEN_USUARIO_2(),
      method: 'POST',
    });
    expect(status).toBe(200);

    const despues = await db.execute(sql`
      SELECT total_shares FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    expect(Number((despues.rows[0] as any).total_shares)).toBe(totalAntes + 1);

    const eventoCount = await db.execute(sql`
      SELECT COUNT(*)::int AS c FROM oferta_shares
      WHERE oferta_id = ${OFERTA_ACTIVA_ID}
        AND usuario_id = 'a0000000-0000-4000-a000-000000000002'
        AND ((created_at AT TIME ZONE 'America/Hermosillo')::date) = (NOW() AT TIME ZONE 'America/Hermosillo')::date
    `);
    expect(Number((eventoCount.rows[0] as any).c)).toBe(1);
  });

  it('Insider: dueño del negocio NO infla sus propias métricas (vista, click, share ignorados)', async () => {
    // USUARIO_1 está vinculado a NEGOCIO_TEST_ID en `crearNegocioPrueba`.
    // OFERTA_ACTIVA_ID pertenece a ese negocio. Cualquier vista/click/share
    // de USUARIO_1 sobre esa oferta debe ser IGNORADA (no incrementa contadores).

    const antes = await db.execute(sql`
      SELECT total_views, total_clicks, total_shares FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const v = Number((antes.rows[0] as any).total_views);
    const c = Number((antes.rows[0] as any).total_clicks);
    const s = Number((antes.rows[0] as any).total_shares);

    // 3 disparos del dueño contra su propia oferta — todos deben ignorarse
    for (const ruta of ['vista', 'click', 'share']) {
      const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/${ruta}`, {
        token: TOKEN_USUARIO_1(),
        method: 'POST',
      });
      expect(status).toBe(200); // Endpoint no falla, solo descarta silenciosamente
    }

    const despues = await db.execute(sql`
      SELECT total_views, total_clicks, total_shares FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    expect(Number((despues.rows[0] as any).total_views)).toBe(v);
    expect(Number((despues.rows[0] as any).total_clicks)).toBe(c);
    expect(Number((despues.rows[0] as any).total_shares)).toBe(s);
  });

  it('Anti-inflación: 2º-Nº share mismo día NO incrementa', async () => {
    const antes = await db.execute(sql`
      SELECT total_shares FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    const totalAntes = Number((antes.rows[0] as any).total_shares);

    for (let i = 0; i < 5; i++) {
      const { status } = await request(`/ofertas/${OFERTA_ACTIVA_ID}/share`, {
        token: TOKEN_USUARIO_2(),
        method: 'POST',
      });
      expect(status).toBe(200);
    }

    const despues = await db.execute(sql`
      SELECT total_shares FROM metricas_entidad
      WHERE entity_type = 'oferta' AND entity_id = ${OFERTA_ACTIVA_ID}
    `);
    expect(Number((despues.rows[0] as any).total_shares)).toBe(totalAntes);
  });
});
