/**
 * sembrar-auditoria-muestra.ts — SEED de revisión (SOLO DEV)
 * =========================================================
 * VACÍA `admin_auditoria` y siembra UN registro por cada tipo de acción, apuntando a entidades
 * REALES (un negocio, usuario, ciudad, región, vendedor que existan) para ver cómo se presenta
 * cada escenario en la UI de Auditoría, uno por uno.
 *
 * ⚠️ BORRA TODA la auditoría. Correr SOLO en DEV (con el .env de desarrollo). La corre Juan.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/sembrar-auditoria-muestra.ts
 */
import { config } from 'dotenv';
config();
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { adminAuditoria } from '../src/db/schemas/schema.js';

/** Lee un id real (o null si no hay) para apuntar la muestra a una entidad existente. */
async function unId(consulta: ReturnType<typeof sql>): Promise<string | null> {
  const filas = (await db.execute(consulta)).rows as Array<{ id: string }>;
  return filas[0]?.id ?? null;
}

interface Muestra {
  accion: string;
  entidadTipo: string;
  entidadId: string | null;
  datosPrevios?: Record<string, unknown> | null;
  datosNuevos?: Record<string, unknown> | null;
  motivo?: string | null;
  /** Rol que REALMENTE realiza la acción (default super). */
  rol?: 'superadmin' | 'gerente' | 'vendedor';
}

async function main(): Promise<void> {
  const actor = await unId(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo='superadmin' LIMIT 1`);
  if (!actor) { console.error('No hay superadmin; aborta.'); process.exit(1); }
  const gerenteA = await unId(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo='gerente' LIMIT 1`);
  const vendedorA = await unId(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo='vendedor' LIMIT 1`);
  // Resuelve el actor (id + rol) según quién REALMENTE realiza la acción; cae a super si falta el rol.
  const actorDe = (rol?: string): { id: string; rol: string } => {
    if (rol === 'gerente' && gerenteA) return { id: gerenteA, rol: 'gerente' };
    if (rol === 'vendedor' && vendedorA) return { id: vendedorA, rol: 'vendedor' };
    return { id: actor, rol: 'superadmin' };
  };
  const neg = await unId(sql`SELECT id::text AS id FROM negocios WHERE estado_admin='activo' LIMIT 1`);
  const usr = await unId(sql`SELECT id::text AS id FROM usuarios WHERE rol_equipo IS NULL LIMIT 1`);
  const ciu = await unId(sql`SELECT id::text AS id FROM ciudades LIMIT 1`);
  const reg = await unId(sql`SELECT id::text AS id FROM regiones LIMIT 1`);
  const reg2 = await unId(sql`SELECT id::text AS id FROM regiones OFFSET 1 LIMIT 1`);
  const emb = await unId(sql`SELECT id::text AS id FROM embajadores LIMIT 1`);
  const ciudadesArr = ((await db.execute(sql`SELECT id::text AS id FROM ciudades LIMIT 3`)).rows as Array<{ id: string }>).map((r) => r.id);

  const hasta = '2026-07-20T05:59:59.000Z';
  const M: Muestra[] = [
    // Negocios
    { accion: 'negocio_alta_manual', entidadTipo: 'negocio', entidadId: null, rol: 'vendedor', datosNuevos: { nombreNegocio: 'Tacos El Güero', concepto: 'efectivo', monto: 849, mesesCubiertos: 1, hasta } },
    { accion: 'negocio_marcar_pagado', entidadTipo: 'negocio', entidadId: neg, rol: 'vendedor', datosNuevos: { concepto: 'efectivo', monto: 849, mesesCubiertos: 1, hasta } },
    { accion: 'negocio_suspender', entidadTipo: 'negocio', entidadId: neg, rol: 'gerente', datosPrevios: { estadoAdmin: 'activo' }, datosNuevos: { estadoAdmin: 'suspendido', pausarStripe: true }, motivo: 'Falta de pago' },
    { accion: 'negocio_reactivar', entidadTipo: 'negocio', entidadId: neg, rol: 'gerente', datosPrevios: { estadoAdmin: 'suspendido' }, datosNuevos: { estadoAdmin: 'activo' } },
    { accion: 'negocio_cancelar', entidadTipo: 'negocio', entidadId: neg, datosPrevios: { estadoAdmin: 'activo', estadoMembresia: 'al_corriente' }, datosNuevos: { estadoAdmin: 'archivado', estadoMembresia: 'cancelado' }, motivo: 'Cierre del negocio' },
    { accion: 'negocio_editar_pago', entidadTipo: 'negocio', entidadId: neg, datosPrevios: { concepto: 'efectivo', monto: 849, mesesCubiertos: 1 }, datosNuevos: { concepto: 'transferencia', monto: 900, mesesCubiertos: 1 } },
    { accion: 'negocio_anular_pago', entidadTipo: 'negocio', entidadId: neg, datosNuevos: { anulado: true, monto: 849 }, motivo: 'Cobro duplicado' },
    { accion: 'negocio_reasignar_vendedor', entidadTipo: 'negocio', entidadId: neg, datosPrevios: { embajadorId: null }, datosNuevos: { embajadorId: emb } },
    { accion: 'negocio_reenviar_recibo', entidadTipo: 'negocio', entidadId: neg, rol: 'vendedor', datosNuevos: { correo: 'dueno@plomeria.com', correoEnviado: true } },
    { accion: 'negocio_cambiar_correo_dueno', entidadTipo: 'negocio', entidadId: neg, datosPrevios: { correo: 'viejo@correo.com' }, datosNuevos: { correo: 'nuevo@correo.com', correoEnviado: true } },
    // Usuarios
    { accion: 'usuario_suspender', entidadTipo: 'usuario', entidadId: usr, datosPrevios: { estado: 'activo' }, datosNuevos: { estado: 'suspendido' }, motivo: 'Conducta abusiva' },
    { accion: 'usuario_reactivar', entidadTipo: 'usuario', entidadId: usr, datosPrevios: { estado: 'suspendido' }, datosNuevos: { estado: 'activo' } },
    { accion: 'usuario_cambiar_correo', entidadTipo: 'usuario', entidadId: usr, rol: 'gerente', datosPrevios: { correo: 'viejo@correo.com' }, datosNuevos: { correo: 'nuevo@correo.com', correoEnviado: true } },
    { accion: 'usuario_generar_codigo_acceso', entidadTipo: 'usuario', entidadId: usr, datosNuevos: { correoEnviado: true } },
    { accion: 'usuario_desbloquear_intentos', entidadTipo: 'usuario', entidadId: usr, datosPrevios: { bloqueadas: 5 }, datosNuevos: { bloqueadas: 0 } },
    // Ciudades
    { accion: 'ciudad_crear', entidadTipo: 'ciudad', entidadId: null, datosNuevos: { nombre: 'Caborca', estado: 'Sonora', regionId: reg } },
    { accion: 'ciudad_crear_multiple', entidadTipo: 'ciudad', entidadId: null, datosNuevos: { ciudades: ['Altar', 'Sáric'], omitidas: [], regionComun: reg } },
    { accion: 'ciudad_editar', entidadTipo: 'ciudad', entidadId: ciu, datosPrevios: { nombre: 'Penasco' }, datosNuevos: { nombre: 'Puerto Peñasco' } },
    { accion: 'ciudad_activar', entidadTipo: 'ciudad', entidadId: ciu, datosPrevios: { activa: false }, datosNuevos: { activa: true } },
    { accion: 'ciudad_desactivar', entidadTipo: 'ciudad', entidadId: ciu, datosPrevios: { activa: true }, datosNuevos: { activa: false } },
    { accion: 'ciudad_asignar_region', entidadTipo: 'ciudad', entidadId: ciu, datosPrevios: { regionId: null }, datosNuevos: { regionId: reg } },
    { accion: 'ciudad_asignar_region_multiple', entidadTipo: 'ciudad', entidadId: null, datosNuevos: { regionId: reg } },
    { accion: 'region_crear', entidadTipo: 'region', entidadId: null, datosNuevos: { nombre: 'Sonora Sur' } },
    { accion: 'region_editar', entidadTipo: 'region', entidadId: reg, datosPrevios: { nombre: 'Sonora-Norte', activa: true }, datosNuevos: { nombre: 'Sonora Norte', activa: true } },
    // Equipo
    { accion: 'equipo_alta_vendedor', entidadTipo: 'usuario', entidadId: null, rol: 'gerente', datosNuevos: { nombre: 'Ana', apellidos: 'Pérez', codigoReferido: 'ANA01', ciudadIds: ciudadesArr, regionVendedor: reg } },
    { accion: 'equipo_alta_gerente', entidadTipo: 'usuario', entidadId: null, datosNuevos: { nombre: 'Luis', apellidos: 'Gómez', regionId: reg } },
    { accion: 'equipo_promover_gerente', entidadTipo: 'usuario', entidadId: usr, datosNuevos: { regionId: reg } },
    { accion: 'equipo_promover_vendedor', entidadTipo: 'usuario', entidadId: usr, datosNuevos: { codigoReferido: 'VEN01' } },
    { accion: 'equipo_editar_datos', entidadTipo: 'usuario', entidadId: usr, rol: 'gerente', datosPrevios: { nombre: 'Ana' }, datosNuevos: { nombre: 'Ana María' } },
    { accion: 'equipo_reasignar_region', entidadTipo: 'usuario', entidadId: usr, datosPrevios: { regionId: reg }, datosNuevos: { regionId: reg2 ?? reg } },
    { accion: 'equipo_revocar_acceso', entidadTipo: 'usuario', entidadId: usr, datosPrevios: { embajadorEstado: 'activo' }, datosNuevos: { embajadorEstado: 'inactivo' } },
    { accion: 'equipo_reactivar_acceso', entidadTipo: 'usuario', entidadId: usr, datosPrevios: { embajadorEstado: 'inactivo' }, datosNuevos: { embajadorEstado: 'activo' } },
    // Vendedores
    { accion: 'vendedor_registrar_pago', entidadTipo: 'embajador', entidadId: null, datosNuevos: { embajadorId: emb, transferencia: 250, efectivo: 150, compensado: 849, fechaPago: '2026-06-19', comprobante: false } },
    { accion: 'vendedor_datos_cobro', entidadTipo: 'embajador', entidadId: null, rol: 'vendedor', datosNuevos: { embajadorId: emb, tieneClabe: true } },
    { accion: 'vendedor_efectivo_entrega', entidadTipo: 'embajador', entidadId: null, rol: 'gerente', datosNuevos: { embajadorId: emb, monto: 500 } },
    // Membresía / Configuración
    { accion: 'config_actualizar', entidadTipo: 'configuracion', entidadId: null, datosPrevios: { clave: 'trial_duracion_dias', valor: '7' }, datosNuevos: { clave: 'trial_duracion_dias', valor: '14' } },
    { accion: 'precio_mensual_cambiar', entidadTipo: 'configuracion', entidadId: null, datosPrevios: { precioMensual: 849, priceMensualId: 'price_viejo' }, datosNuevos: { precioMensual: 899, priceMensualId: 'price_nuevo', modo: 'test', anualRecalculado: 8990 } },
    { accion: 'plan_anual_activar', entidadTipo: 'configuracion', entidadId: null, datosNuevos: { precioAnual: 8990, priceAnualId: 'price_anual', modo: 'test' } },
    { accion: 'plan_anual_desactivar', entidadTipo: 'configuracion', entidadId: null, datosPrevios: { priceAnualId: 'price_anual' }, datosNuevos: { activo: false } },
    // Recibos
    { accion: 'recibo_reenviar', entidadTipo: 'negocio', entidadId: neg, datosNuevos: { folio: '14', correos: ['dueno@correo.com'], correoEnviado: true } },
  ];

  await db.delete(adminAuditoria);

  const base = Date.parse('2026-06-20T15:00:00.000Z');
  for (let i = 0; i < M.length; i++) {
    const m = M[i];
    const a = actorDe(m.rol);
    await db.insert(adminAuditoria).values({
      actorId: a.id,
      actorRol: a.rol,
      accion: m.accion,
      entidadTipo: m.entidadTipo,
      entidadId: m.entidadId,
      datosPrevios: m.datosPrevios ?? null,
      datosNuevos: m.datosNuevos ?? null,
      motivo: m.motivo ?? null,
      // Fechas escalonadas (más reciente primero) para que se ordene natural en la tabla.
      createdAt: new Date(base - i * 60_000).toISOString(),
    });
  }

  console.log(`✅ Auditoría vaciada y sembrada con ${M.length} muestras (1 por tipo de acción).`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
