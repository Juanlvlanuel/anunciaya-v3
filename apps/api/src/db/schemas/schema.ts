
import { pgTable, check, integer, varchar, type AnyPgColumn, index, uniqueIndex, foreignKey, unique, uuid, boolean, smallint, timestamp, numeric, text, date, serial, time, jsonb, bigserial, bigint, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// `regiones` es un AGRUPADOR de ciudades (no una entidad con ubicación): el estado y
// el país viven en `ciudades`. Solo: id, nombre (único), activa, created_at.
export const regiones = pgTable("regiones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	activa: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_regiones_activa").using("btree", table.activa.asc().nullsLast()).where(sql`(activa = true)`),
	unique("regiones_nombre_unique").on(table.nombre),
]);

// `ciudades` = catálogo real de ciudades (poblado desde `ciudadesPopulares`). Cada
// ciudad pertenece a UNA región (Modelo 1) vía `region_id` (nullable hasta agruparla).
// `slug` único es la salvaguarda anti-duplicados (acentos/mayúsculas). La gestiona el
// módulo Ciudades del Panel; el front la lee (activas) para el selector de ubicación.
// Definida aquí (antes solo vivía en BD; `utils/ciudades.ts` la leía por SQL crudo).
export const ciudades = pgTable("ciudades", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	estado: varchar({ length: 100 }).notNull(),
	pais: varchar({ length: 100 }).default('México').notNull(),
	slug: varchar({ length: 140 }).notNull(),
	lat: numeric({ precision: 9, scale: 6, mode: 'number' }),
	lng: numeric({ precision: 9, scale: 6, mode: 'number' }),
	alias: jsonb().$type<string[]>(),
	importancia: smallint().default(0).notNull(),
	activa: boolean().default(true).notNull(),
	regionId: uuid("region_id").references((): AnyPgColumn => regiones.id, { onDelete: 'set null' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("ciudades_slug_unique").using("btree", table.slug.asc().nullsLast()),
	index("idx_ciudades_region").using("btree", table.regionId.asc().nullsLast()),
	index("idx_ciudades_activa").using("btree", table.activa.asc().nullsLast()).where(sql`(activa = true)`),
]);

export const embajadores = pgTable("embajadores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull().references((): AnyPgColumn => usuarios.id, { onDelete: 'cascade' }),
	codigoReferido: varchar("codigo_referido", { length: 50 }).notNull(),
	estado: varchar({ length: 20 }).default('activo').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_embajadores_codigo").using("btree", table.codigoReferido.asc().nullsLast()),
	index("idx_embajadores_estado").using("btree", table.estado.asc().nullsLast()).where(sql`((estado)::text = 'activo'::text)`),
	uniqueIndex("idx_embajadores_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	unique("embajadores_codigo_referido_key").on(table.codigoReferido),
	check("embajadores_estado_check", sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])`),
]);

// Cobertura de un VENDEDOR sobre 1+ ciudades. PK compuesta. Un trigger en BD
// (`fn_embajador_una_region`) exige que todas las ciudades de un vendedor sean de la
// MISMA región. Por eso el módulo Ciudades bloquea mover una ciudad de región si eso
// dejaría a un vendedor cubriendo dos. ciudad_id es ON DELETE RESTRICT (no se borra
// una ciudad cubierta). La cobertura se gestiona en Equipo/Vendedores, no aquí.
export const embajadorCiudades = pgTable("embajador_ciudades", {
	embajadorId: uuid("embajador_id").notNull().references((): AnyPgColumn => embajadores.id, { onDelete: 'cascade' }),
	ciudadId: uuid("ciudad_id").notNull().references((): AnyPgColumn => ciudades.id, { onDelete: 'restrict' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_embajador_ciudades_ciudad").using("btree", table.ciudadId.asc().nullsLast()),
	primaryKey({ columns: [table.embajadorId, table.ciudadId], name: "embajador_ciudades_pkey" }),
]);

// `territorio_zonas` = particiones del mapa de la red de ventas (módulo Territorios, G.1).
// El gerente/super dibuja zonas (polígonos GeoJSON) sobre una ciudad y se las ASIGNA a un
// vendedor (`embajador_id`, NULL = sin asignar). El vendedor solo verá su pedazo (capa G.2).
// Geometría como GeoJSON en jsonb (sin PostGIS); el no-traslape se valida en la app.
export const territorioZonas = pgTable("territorio_zonas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	ciudadId: uuid("ciudad_id").notNull().references((): AnyPgColumn => ciudades.id, { onDelete: 'cascade' }),
	embajadorId: uuid("embajador_id").references((): AnyPgColumn => embajadores.id, { onDelete: 'set null' }),
	nombre: varchar({ length: 80 }).notNull(),
	poligono: jsonb().$type<{ type: 'Polygon'; coordinates: number[][][] }>().notNull(),
	color: varchar({ length: 9 }),
	creadaPor: uuid("creada_por").references((): AnyPgColumn => usuarios.id, { onDelete: 'set null' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_territorio_zonas_ciudad").using("btree", table.ciudadId.asc().nullsLast()),
	index("idx_territorio_zonas_embajador").using("btree", table.embajadorId.asc().nullsLast()),
]);

// `territorio_marcas` = pines personales del VENDEDOR sobre su pedazo del mapa (módulo Territorios, G.2).
// Cada marca = lugar por donde pasó, con un ESTADO (tipo) y una NOTA. Son suyas (embajador_id).
export const territorioMarcas = pgTable("territorio_marcas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	embajadorId: uuid("embajador_id").notNull().references((): AnyPgColumn => embajadores.id, { onDelete: 'cascade' }),
	lat: numeric({ precision: 9, scale: 6, mode: 'number' }).notNull(),
	lng: numeric({ precision: 9, scale: 6, mode: 'number' }).notNull(),
	tipo: varchar({ length: 20 }).default('visitado').notNull(),
	nota: text(),
	ciudadId: uuid("ciudad_id").references((): AnyPgColumn => ciudades.id, { onDelete: 'set null' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_territorio_marcas_embajador").using("btree", table.embajadorId.asc().nullsLast()),
	check("territorio_marcas_tipo_check", sql`(tipo)::text = ANY ((ARRAY['visitado'::character varying, 'interesado'::character varying, 'cerrado'::character varying, 'sin_interes'::character varying])::text[])`),
]);

export const usuarios = pgTable("usuarios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	apellidos: varchar({ length: 100 }).notNull(),
	correo: varchar({ length: 255 }).notNull(),
	contrasenaHash: varchar("contrasena_hash", { length: 255 }),
	autenticadoPorGoogle: boolean("autenticado_por_google").default(false),
	dobleFactorSecreto: varchar("doble_factor_secreto", { length: 64 }),
	dobleFactorHabilitado: boolean("doble_factor_habilitado").default(false),
	dobleFactorConfirmado: boolean("doble_factor_confirmado").default(false),
	// 2FA del Panel Admin (solo SuperAdmin) — separado de doble_factor_* para que
	// prenderlo NUNCA afecte el login de AnunciaYA. Ver migración 2026-06-04-panel-2fa.sql.
	panel2faHabilitado: boolean("panel_2fa_habilitado").default(false).notNull(),
	panel2faSecreto: varchar("panel_2fa_secreto", { length: 64 }),
	telefono: varchar({ length: 20 }),
	// Ciudad: SOLO `ciudad_id` (FK al catálogo `ciudades`). La columna texto `ciudad` se retiró
	// (fase contract de la migración ciudad↔catálogo; DROP en 2026-06-19-usuarios-ciudad-drop.sql):
	// ya nadie la lee ni la escribe. Se llena cuando el usuario reporta su ubicación (GPS/selector
	// del header) o por backfill. La región se deduce ciudad_id → ciudades.region_id. Las lecturas
	// leen `ciudades.nombre` vía esta FK. La FK la define la migración 2026-06-16-usuarios-ciudad-id.sql.
	ciudadId: uuid("ciudad_id"),
	perfil: varchar({ length: 20 }).default('personal').notNull(),
	membresia: smallint().default(1).notNull(),
	correoVerificado: boolean("correo_verificado").default(false),
	correoVerificadoAt: timestamp("correo_verificado_at", { withTimezone: true, mode: 'string' }),
	estado: varchar({ length: 15 }).default('activo').notNull(),
	fechaCambioEstado: timestamp("fecha_cambio_estado", { withTimezone: true, mode: 'string' }).defaultNow(),
	motivoCambioEstado: varchar("motivo_cambio_estado", { length: 500 }),
	intentosFallidos: smallint("intentos_fallidos").default(0),
	bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true, mode: 'string' }),
	calificacionPromedio: numeric("calificacion_promedio", { precision: 2, scale: 1 }).default('0'),
	totalCalificaciones: integer("total_calificaciones").default(0),
	avatarUrl: text("avatar_url"),
	fechaNacimiento: date("fecha_nacimiento"),
	genero: varchar({ length: 20 }).default('no_especificado'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	tieneModoComercial: boolean("tiene_modo_comercial").default(false).notNull(),
	modoActivo: varchar("modo_activo", { length: 20 }).default('personal').notNull(),
	stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
	stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
	esEmbajador: boolean("es_embajador").default(false).notNull(),
	referidoPor: uuid("referido_por").references((): AnyPgColumn => embajadores.id, { onDelete: 'set null' }),
	negocioId: uuid('negocio_id').references((): AnyPgColumn => negocios.id, { onDelete: 'set null' }),
	sucursalAsignada: uuid('sucursal_asignada').references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'set null' }),
	ultimaConexion: timestamp("ultima_conexion", { withTimezone: true, mode: 'string' }),
	ultimoAccesoPanel: timestamp("ultimo_acceso_panel", { withTimezone: true, mode: 'string' }),
	requiereCambioContrasena: boolean("requiere_cambio_contrasena").default(false).notNull(),
	// Sprint 7.5 — Mediana del tiempo de respuesta del usuario en ChatYA
	// (filtrado por contexto 'servicio_publicacion'). Lo pobla un cron
	// mensual (TODO). Por ahora NULL para todos.
	servicioTiempoRespuestaMinutos: integer("servicio_tiempo_respuesta_minutos"),
	// Rol de equipo del Panel Admin (null = usuario normal). Capa encima de `perfil`.
	rolEquipo: varchar("rol_equipo", { length: 20 }),
	// Región del GERENTE (el vendedor se deduce de embajador_ciudades; superadmin/normal = null).
	regionId: uuid("region_id").references((): AnyPgColumn => regiones.id, { onDelete: 'set null' }),
}, (table) => [
	index("idx_usuarios_correo_verificado").using("btree", table.correoVerificado.asc().nullsLast()),
	index("idx_usuarios_created_at").using("btree", table.createdAt.asc().nullsLast()),
	index("idx_usuarios_es_embajador").using("btree", table.esEmbajador.asc().nullsLast()).where(sql`(es_embajador = true)`),
	index("idx_usuarios_estado").using("btree", table.estado.asc().nullsLast()),
	index("idx_usuarios_perfil_membresia").using("btree", table.perfil.asc().nullsLast(), table.membresia.asc().nullsLast()),
	index("idx_usuarios_referido_por").using("btree", table.referidoPor.asc().nullsLast()).where(sql`(referido_por IS NOT NULL)`),
	index("idx_usuarios_stripe_customer_id").using("btree", table.stripeCustomerId.asc().nullsLast()),
	index("idx_usuarios_stripe_subscription_id").using("btree", table.stripeSubscriptionId.asc().nullsLast()),
	index("idx_usuarios_telefono").using("btree", table.telefono.asc().nullsLast()),
	index("idx_usuarios_modo_activo").using("btree", table.modoActivo.asc().nullsLast()),
	index("idx_usuarios_modo_comercial").using("btree", table.tieneModoComercial.asc().nullsLast(), table.modoActivo.asc().nullsLast()).where(sql`(tiene_modo_comercial = true)`),
	index("idx_usuarios_negocio_id").using("btree", table.negocioId.asc().nullsLast()).where(sql`(negocio_id IS NOT NULL)`),
	index("idx_usuarios_sucursal_asignada").using("btree", table.sucursalAsignada.asc().nullsLast()).where(sql`(sucursal_asignada IS NOT NULL)`),
	index("idx_usuarios_rol_equipo").using("btree", table.rolEquipo.asc().nullsLast()).where(sql`(rol_equipo IS NOT NULL)`),
	index("idx_usuarios_region_id").using("btree", table.regionId.asc().nullsLast()).where(sql`(region_id IS NOT NULL)`),
	// Índice COMPLETO (no parcial): sirve al filtro por ciudad y al GROUP BY de la métrica
	// "usuarios por ciudad" del Panel, contando también los NULL ("Sin ciudad").
	index("idx_usuarios_ciudad_id").using("btree", table.ciudadId.asc().nullsLast()),
	unique("usuarios_correo_unique").on(table.correo),
	check("usuarios_estado_check", sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])`),
	check("usuarios_genero_check", sql`(genero)::text = ANY ((ARRAY['masculino'::character varying, 'femenino'::character varying, 'otro'::character varying, 'no_especificado'::character varying])::text[])`),
	check("usuarios_membresia_check", sql`membresia = ANY (ARRAY[1, 2, 3])`),
	check("usuarios_perfil_check", sql`(perfil)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("usuarios_modo_activo_check", sql`(modo_activo)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("usuarios_modo_comercial_logico_check", sql`((modo_activo)::text = 'comercial'::text AND tiene_modo_comercial = true) OR (modo_activo)::text = 'personal'::text`),
	check("usuarios_rol_equipo_check", sql`(rol_equipo)::text = ANY ((ARRAY['superadmin'::character varying, 'gerente'::character varying, 'vendedor'::character varying])::text[])`),
]);

export const usuarioCodigosRespaldo = pgTable("usuario_codigos_respaldo", {
	id: serial().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	codigoHash: varchar("codigo_hash", { length: 255 }).notNull(),
	usadoAt: timestamp("usado_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_usuario_codigos_respaldo_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "usuario_codigos_respaldo_usuario_id_fkey"
	}).onDelete("cascade"),
]);

export const negocios = pgTable("negocios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	nombre: varchar({ length: 120 }).notNull(),
	descripcion: text(),
	sitioWeb: varchar("sitio_web", { length: 200 }),
	logoUrl: text("logo_url"),
	activo: boolean().default(true),
	esBorrador: boolean("es_borrador").default(false),
	verificado: boolean().default(false),
	promocionado: boolean().default(false),
	promocionExpira: timestamp("promocion_expira", { withTimezone: true, mode: 'string' }),
	// Regalo de Publicidad: si es uno de los primeros negocios de su ciudad, su logo va al carrusel
	// "Fundadores" (no se cobra). Lo marca el admin desde la ficha del negocio (cupo 50 por ciudad).
	esFundador: boolean("es_fundador").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	embajadorId: uuid("embajador_id"),
	onboardingCompletado: boolean("onboarding_completado").default(false).notNull(),
	participaPuntos: boolean('participa_puntos').default(true).notNull(),
	fechaPrimerPago: date("fecha_primer_pago"),
	estadoMembresia: varchar("estado_membresia", { length: 20 }).default('al_corriente').notNull(),
	fechaVencimiento: timestamp("fecha_vencimiento", { withTimezone: true, mode: 'string' }),
	fechaProximoCobro: timestamp("fecha_proximo_cobro", { withTimezone: true, mode: 'string' }),
	fechaInicioGracia: timestamp("fecha_inicio_gracia", { withTimezone: true, mode: 'string' }),
	fechaLimiteGracia: timestamp("fecha_limite_gracia", { withTimezone: true, mode: 'string' }),
	// Hasta qué instante está YA devengada la comisión recurrente del vendedor por este negocio
	// (Pieza 3 · devengo al cobro). Evita re-devengar la cobertura ya pagada. NULL = nunca devengada.
	comisionDevengadaHasta: timestamp("comision_devengada_hasta", { withTimezone: true, mode: 'string' }),
	// Eje administrativo del Panel (separado del eje de pago `estado_membresia`):
	// `metodo_cobro` (tarjeta/manual) lo usa la Parada 2; `estado_admin`
	// (activo/suspendido/archivado) es la RAZÓN — la visibilidad efectiva la da `activo`.
	metodoCobro: varchar("metodo_cobro", { length: 20 }).default('tarjeta').notNull(),
	estadoAdmin: varchar("estado_admin", { length: 20 }).default('activo').notNull(),
}, (table) => [
	index("idx_negocios_activo").using("btree", table.activo.asc().nullsLast()),
	index("idx_negocios_embajador").using("btree", table.embajadorId.asc().nullsLast()).where(sql`(embajador_id IS NOT NULL)`),
	index("idx_negocios_es_borrador").using("btree", table.esBorrador.asc().nullsLast()),
	index("idx_negocios_fecha_primer_pago").using("btree", table.fechaPrimerPago.asc().nullsLast()).where(sql`(fecha_primer_pago IS NOT NULL)`),
	index("idx_negocios_onboarding").using("btree", table.onboardingCompletado.asc().nullsLast()).where(sql`(onboarding_completado = false)`),
	index("idx_negocios_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_negocios_estado_membresia").using("btree", table.estadoMembresia.asc().nullsLast()),
	foreignKey({
		columns: [table.embajadorId],
		foreignColumns: [embajadores.id],
		name: "fk_negocios_embajador"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "negocios_usuario_id_fkey"
	}).onDelete("cascade"),
	check("negocios_estado_membresia_check", sql`(estado_membresia)::text = ANY ((ARRAY['al_corriente'::character varying, 'en_gracia'::character varying, 'suspendido'::character varying, 'cancelado'::character varying])::text[])`),
	check("negocios_metodo_cobro_check", sql`(metodo_cobro)::text = ANY ((ARRAY['tarjeta'::character varying, 'manual'::character varying])::text[])`),
	check("negocios_estado_admin_check", sql`(estado_admin)::text = ANY ((ARRAY['activo'::character varying, 'suspendido'::character varying, 'archivado'::character varying])::text[])`),
	index("idx_negocios_estado_admin").using("btree", table.estadoAdmin.asc().nullsLast()),
]);

// Bitácora de acciones sensibles del Panel Admin (suspender, reactivar, reasignar,
// y a futuro marcar pagado / cancelar). Quién/cuándo/qué + snapshots + motivo.
export const adminAuditoria = pgTable("admin_auditoria", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	actorId: uuid("actor_id").references((): AnyPgColumn => usuarios.id, { onDelete: 'set null' }),
	actorRol: varchar("actor_rol", { length: 20 }),
	accion: varchar({ length: 50 }).notNull(),
	entidadTipo: varchar("entidad_tipo", { length: 50 }).notNull(),
	entidadId: uuid("entidad_id"),
	datosPrevios: jsonb("datos_previos"),
	datosNuevos: jsonb("datos_nuevos"),
	motivo: varchar({ length: 500 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_admin_auditoria_entidad").using("btree", table.entidadTipo.asc().nullsLast(), table.entidadId.asc().nullsLast()),
	index("idx_admin_auditoria_actor").using("btree", table.actorId.asc().nullsLast()),
	index("idx_admin_auditoria_created").using("btree", table.createdAt.asc().nullsLast()),
]);

// Bitácora de pagos de membresía (Panel Admin · Parada 2 · Opción A). Registra cada
// "Marcar pagado" manual: efectivo/transferencia (ingreso) o cortesía (sin monto).
// Primer ladrillo de la bitácora de pagos. El empuje del cobro en Stripe (trial_end)
// y el estado del negocio viven en `negocios`; aquí solo el registro contable/histórico.
//   - concepto: efectivo | transferencia | cortesia
//   - monto: NULL en cortesía (CHECK lo exige); meses_cubiertos: NULL en "fecha exacta"
//   - periodo_hasta: vencimiento aplicado (= trial_end empujado en Stripe)
export const pagosMembresia = pgTable("pagos_membresia", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	// Folio secuencial GLOBAL del recibo (00001, 00002…). Lo asigna una secuencia de Postgres
	// (default en BD), compartida entre todos los vendedores/gerentes/superadmin. Ver migración
	// docs/migraciones/2026-06-11-folio-recibo.sql.
	folio: integer('folio'),
	negocioId: uuid("negocio_id").notNull().references((): AnyPgColumn => negocios.id, { onDelete: 'cascade' }),
	monto: numeric({ precision: 10, scale: 2 }),
	concepto: varchar({ length: 20 }).notNull(),
	fechaPago: timestamp("fecha_pago", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	mesesCubiertos: integer("meses_cubiertos"),
	periodoHasta: timestamp("periodo_hasta", { withTimezone: true, mode: 'string' }).notNull(),
	registradoPor: uuid("registrado_por").references((): AnyPgColumn => usuarios.id, { onDelete: 'set null' }),
	nota: varchar({ length: 500 }),
	// Anulación (borrado lógico): el pago no se borra; se marca anulado. Migración
	// docs/migraciones/2026-06-11-anular-pago.sql.
	anulado: boolean().default(false).notNull(),
	anuladoAt: timestamp('anulado_at', { withTimezone: true, mode: 'string' }),
	anuladoPor: uuid('anulado_por').references((): AnyPgColumn => usuarios.id, { onDelete: 'set null' }),
	motivoAnulacion: varchar('motivo_anulacion', { length: 500 }),
	// Fecha de cobro de Stripe JUSTO ANTES de este pago (solo negocios con tarjeta). Permite
	// devolver el trial_end a la fecha original al anular el último pago vigente. Migración
	// docs/migraciones/2026-06-12-cobro-previo.sql.
	cobroPrevio: timestamp('cobro_previo', { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_pagos_membresia_negocio").using("btree", table.negocioId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_pagos_membresia_periodo").using("btree", table.negocioId.asc().nullsLast(), table.periodoHasta.asc().nullsLast()),
	check("pagos_membresia_concepto_check", sql`(concepto)::text = ANY ((ARRAY['efectivo'::character varying, 'transferencia'::character varying, 'cortesia'::character varying, 'tarjeta'::character varying])::text[])`),
	check("pagos_membresia_monto_check", sql`(monto IS NULL) OR (monto >= (0)::numeric)`),
	check("pagos_membresia_cortesia_sin_monto_check", sql`((concepto)::text <> 'cortesia'::text) OR (monto IS NULL)`),
]);

// Cola de verificación de PAGO MANUAL (Mi Perfil – Pagos · Pieza 3). El dueño que paga por
// transferencia/depósito sube un comprobante y crea una SOLICITUD; un admin la aprueba (genera
// el pago real vía registrarPagoManual → pago_membresia_id) o la rechaza con motivo. Esta tabla
// es solo la cola; el registro contable sigue en pagos_membresia. Migración
// docs/migraciones/2026-06-27-pagos-manuales-solicitudes.sql.
export const pagosManualesSolicitudes = pgTable("pagos_manuales_solicitudes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull().references((): AnyPgColumn => negocios.id, { onDelete: 'cascade' }),
	usuarioId: uuid("usuario_id").notNull().references((): AnyPgColumn => usuarios.id, { onDelete: 'cascade' }),
	monto: numeric({ precision: 10, scale: 2 }).notNull(),          // declarado por el dueño
	mesesDeclarados: integer("meses_declarados").notNull(),         // meses que dice pagar
	referencia: varchar({ length: 120 }),                           // folio/referencia de la transferencia
	nota: varchar({ length: 500 }),
	comprobanteUrl: text("comprobante_url").notNull(),              // comprobante en R2
	estado: varchar({ length: 20 }).default('pendiente').notNull(), // pendiente | aprobado | rechazado
	creadoAt: timestamp("creado_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	revisadoPor: uuid("revisado_por").references((): AnyPgColumn => usuarios.id, { onDelete: 'set null' }),
	revisadoAt: timestamp("revisado_at", { withTimezone: true, mode: 'string' }),
	motivoRechazo: varchar("motivo_rechazo", { length: 500 }),
	pagoMembresiaId: uuid("pago_membresia_id").references((): AnyPgColumn => pagosMembresia.id, { onDelete: 'set null' }),
}, (table) => [
	index("idx_pagos_manuales_solicitudes_negocio").using("btree", table.negocioId.asc().nullsLast(), table.creadoAt.desc().nullsFirst()),
	index("idx_pagos_manuales_solicitudes_pendientes").using("btree", table.creadoAt.desc().nullsFirst()).where(sql`(estado = 'pendiente')`),
	check("pagos_manuales_solicitudes_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobado'::character varying, 'rechazado'::character varying])::text[])`),
	check("pagos_manuales_solicitudes_monto_check", sql`monto > (0)::numeric`),
	check("pagos_manuales_solicitudes_meses_check", sql`meses_declarados > 0`),
]);

// Bitácora financiera global (Panel Admin · módulo Suscripciones). El "libro mayor" de la
// membresía: un renglón por cada movimiento de dinero/membresía, de DOS orígenes:
//   - origen='stripe': lo persiste el webhook (cobro_exitoso / cobro_fallido / cancelacion).
//     Antes esos eventos se perdían (solo pasaban por el webhook sin guardarse).
//   - origen='manual': lo persiste "Registrar pago" del Panel (tipo='pago_manual'), gemelo de
//     la fila contable en `pagos_membresia` (referencia_id → pagos_membresia.id).
// stripe_event_id (UNIQUE) = idempotencia: un event.id reentregado por Stripe no duplica fila
// (INSERT ... onConflictDoNothing). NULL en manual (los NULL son distintos → conviven).
// Ver docs/arquitectura/Panel_Admin/Suscripciones_Pendientes.md y Pagos_Suscripciones.md §12.
export const eventosPago = pgTable("eventos_pago", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull().references((): AnyPgColumn => negocios.id, { onDelete: 'cascade' }),
	tipo: varchar({ length: 30 }).notNull(),            // cobro_exitoso | cobro_fallido | cancelacion | pago_manual
	origen: varchar({ length: 10 }).notNull(),          // stripe | manual
	monto: numeric({ precision: 10, scale: 2 }),        // NULL si no aplica (fallido/cancelación/cortesía)
	moneda: varchar({ length: 3 }).default('MXN').notNull(),
	fechaEvento: timestamp("fecha_evento", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	actorId: uuid("actor_id").references((): AnyPgColumn => usuarios.id, { onDelete: 'set null' }), // NULL si automático de Stripe
	stripeEventId: varchar("stripe_event_id", { length: 255 }), // event.id de Stripe (NULL en manual)
	referenciaId: uuid("referencia_id"),                // FK suave → pagos_membresia.id (en pago_manual)
	metadata: jsonb(),                                  // extras: invoice/subscription/customer, concepto, reintento...
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_eventos_pago_fecha").using("btree", table.fechaEvento.desc().nullsFirst()),
	index("idx_eventos_pago_negocio").using("btree", table.negocioId.asc().nullsLast(), table.fechaEvento.desc().nullsFirst()),
	index("idx_eventos_pago_tipo").using("btree", table.tipo.asc().nullsLast()),
	uniqueIndex("idx_eventos_pago_stripe_event").using("btree", table.stripeEventId.asc().nullsLast()),
	check("eventos_pago_tipo_check", sql`(tipo)::text = ANY ((ARRAY['cobro_exitoso'::character varying, 'cobro_fallido'::character varying, 'cancelacion'::character varying, 'pago_manual'::character varying])::text[])`),
	check("eventos_pago_origen_check", sql`(origen)::text = ANY ((ARRAY['stripe'::character varying, 'manual'::character varying])::text[])`),
	check("eventos_pago_monto_check", sql`(monto IS NULL) OR (monto >= (0)::numeric)`),
]);

export const negocioSucursales = pgTable("negocio_sucursales", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid('negocio_id').notNull().references(() => negocios.id, { onDelete: 'cascade' }),
	nombre: varchar({ length: 100 }).notNull(),
	esPrincipal: boolean('es_principal').default(false).notNull(),
	direccion: varchar({ length: 250 }),
	// Ciudad: SOLO `ciudad_id` (FK al catálogo `ciudades`). La columna texto `ciudad` se
	// retiró del ORM (fase "contract" de la migración ciudad↔región): ya nadie la lee ni
	// la escribe. El DROP de la columna en BD lo hace la migración
	// docs/migraciones/2026-06-18-drop-negocio-sucursales-ciudad.sql. La región se deduce
	// ciudad_id → ciudades.region_id.
	ciudadId: uuid("ciudad_id"),
	estado: varchar({ length: 100 }).notNull().default('Por configurar'),
	ubicacion: text("ubicacion"),
	telefono: varchar({ length: 20 }),
	whatsapp: varchar({ length: 20 }),
	activa: boolean().default(true).notNull(),
	correo: varchar({ length: 100 }),
	fotoPerfil: text('foto_perfil'),
	portadaUrl: text("portada_url"),
	redesSociales: jsonb("redes_sociales"),
	tieneEnvioDomicilio: boolean('tiene_envio_domicilio').default(false),
	tieneServicioDomicilio: boolean('tiene_servicio_domicilio').default(false), // ← NUEVO
	calificacionPromedio: numeric('calificacion_promedio', { precision: 2, scale: 1 }).default('0'),
	totalCalificaciones: integer('total_calificaciones').default(0),
	totalLikes: integer('total_likes').default(0),
	totalVisitas: integer('total_visitas').default(0),
	zonaHoraria: varchar('zona_horaria', { length: 50 }).default('America/Mexico_City').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_sucursales_negocio_id").using("btree", table.negocioId.asc().nullsLast()),
	index("idx_sucursales_activa").using("btree", table.activa.asc().nullsLast()),
	// index("idx_sucursales_ubicacion").using("gist", table.ubicacion),
	index("idx_sucursales_calificacion").using("btree", table.calificacionPromedio.asc().nullsLast()),
	index("idx_sucursales_visitas").using("btree", table.totalVisitas.asc().nullsLast()),
	uniqueIndex("negocio_sucursales_principal_unique").using("btree", table.negocioId.asc().nullsLast(), table.esPrincipal.asc().nullsLast()).where(sql`es_principal = true`),
]);

export const asignacionSubcategorias = pgTable('asignacion_subcategorias', {
	id: serial('id').primaryKey(),
	negocioId: uuid('negocio_id').notNull().references(() => negocios.id, { onDelete: 'cascade' }),
	subcategoriaId: integer('subcategoria_id').notNull().references(() => subcategoriasNegocio.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique().on(table.negocioId, table.subcategoriaId),
	index('idx_asignacion_negocio').using('btree', table.negocioId.asc().nullsLast()),
	index('idx_asignacion_subcategoria').using('btree', table.subcategoriaId.asc().nullsLast()),
]);

export const negocioHorarios = pgTable("negocio_horarios", {
	id: serial().primaryKey().notNull(),
	sucursalId: uuid("sucursal_id").notNull(),
	diaSemana: smallint("dia_semana").notNull(),
	abierto: boolean().default(true),
	horaApertura: time("hora_apertura"),
	horaCierre: time("hora_cierre"),
	comidaInicio: time("comida_inicio"),
	comidaFin: time("comida_fin"),
	tieneHorarioComida: boolean("tiene_horario_comida").default(false),
}, (table) => [
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "negocio_horarios_sucursal_id_fkey"
	}).onDelete("cascade"),
	unique("negocio_horarios_unique").on(table.sucursalId, table.diaSemana),
	check("negocio_horarios_dia_check", sql`(dia_semana >= 0) AND (dia_semana <= 6)`),
]);

export const negocioMetodosPago = pgTable("negocio_metodos_pago", {
	id: serial().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	tipo: varchar({ length: 30 }).notNull(),
	activo: boolean().default(true),
	instrucciones: text(),
}, (table) => [
	index("idx_negocio_metodos_pago_sucursal_id").using("btree", table.sucursalId.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "negocio_metodos_pago_negocio_id_fkey"
	}).onDelete("cascade"),
	uniqueIndex("negocio_metodos_pago_global_unique").on(table.negocioId, table.tipo).where(sql`sucursal_id IS NULL`),
	uniqueIndex("negocio_metodos_pago_sucursal_unique").on(table.sucursalId, table.tipo).where(sql`sucursal_id IS NOT NULL`),
	check("negocio_metodos_pago_tipo_check", sql`tipo IN ('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia')`),]);

export const negocioGaleria = pgTable("negocio_galeria", {
	id: serial().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	url: text().notNull(),
	titulo: varchar({ length: 100 }),
	orden: integer().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_negocio_galeria_negocio_id").using("btree", table.negocioId.asc().nullsLast()),
	index("idx_negocio_galeria_sucursal_id").using("btree", table.sucursalId.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "negocio_galeria_negocio_id_fkey"
	}).onDelete("cascade"),
]);

export const articulos = pgTable("articulos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	nombre: varchar({ length: 150 }).notNull(),
	descripcion: text(),
	categoria: varchar({ length: 100 }).default('General'),
	sku: varchar({ length: 50 }),
	precioBase: numeric("precio_base", { precision: 10, scale: 2 }).notNull(),
	precioDesde: boolean("precio_desde").default(false),
	imagenPrincipal: text("imagen_principal"),
	imagenesAdicionales: text("imagenes_adicionales").array().default([""]),
	requiereCita: boolean("requiere_cita").default(false),
	duracionEstimada: integer("duracion_estimada"),
	disponible: boolean().default(true),
	destacado: boolean().default(false),
	orden: integer().default(0),
	totalVentas: integer("total_ventas").default(0),
	totalReservas: integer("total_reservas").default(0),
	totalVistas: integer("total_vistas").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_articulos_categoria").using("btree", table.categoria.asc().nullsLast()),
	index("idx_articulos_disponible").using("btree", table.disponible.asc().nullsLast()),
	index("idx_articulos_negocio_id").using("btree", table.negocioId.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "articulos_negocio_id_fkey"
	}).onDelete("cascade"),
	check("articulos_precio_check", sql`precio_base >= (0)::numeric`),
	check("articulos_tipo_check", sql`(tipo)::text = ANY ((ARRAY['producto'::character varying, 'servicio'::character varying])::text[])`),
]);

export const articuloSucursales = pgTable("articulo_sucursales", {
	id: serial().primaryKey().notNull(),
	articuloId: uuid("articulo_id").notNull(),
	sucursalId: uuid("sucursal_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_articulo_sucursales_articulo").using("btree", table.articuloId.asc().nullsLast()),
	index("idx_articulo_sucursales_sucursal").using("btree", table.sucursalId.asc().nullsLast()),
	foreignKey({
		columns: [table.articuloId],
		foreignColumns: [articulos.id],
		name: "fk_articulo_sucursales_articulo"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_articulo_sucursales_sucursal"
	}).onDelete("cascade"),
	unique("articulo_sucursales_unique").on(table.articuloId, table.sucursalId),
]);

export const empleadoHorarios = pgTable("empleado_horarios", {
	id: serial().primaryKey().notNull(),
	empleadoId: uuid("empleado_id").notNull(),
	diaSemana: smallint("dia_semana").notNull(),
	horaEntrada: time("hora_entrada").notNull(),
	horaSalida: time("hora_salida").notNull(),
}, (table) => [
	index("idx_empleado_horarios_empleado_id").using("btree", table.empleadoId.asc().nullsLast()),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "empleado_horarios_empleado_id_fkey"
	}).onDelete("cascade"),
	unique("empleado_horarios_unique").on(table.empleadoId, table.diaSemana, table.horaEntrada),
	check("empleado_horarios_dia_check", sql`(dia_semana >= 0) AND (dia_semana <= 6)`),
]);

export const ofertas = pgTable("ofertas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	articuloId: uuid("articulo_id"),
	titulo: varchar({ length: 150 }).notNull(),
	descripcion: text(),
	imagen: varchar('imagen', { length: 500 }),
	tipo: varchar({ length: 20 }).notNull(),
	valor: varchar('valor', { length: 100 }),
	compraMinima: numeric("compra_minima", { precision: 10, scale: 2 }).default('0'),
	fechaInicio: timestamp("fecha_inicio", { withTimezone: true, mode: 'string' }).notNull(),
	fechaFin: timestamp("fecha_fin", { withTimezone: true, mode: 'string' }).notNull(),
	limiteUsos: integer("limite_usos"),
	usosActuales: integer("usos_actuales").default(0),
	activo: boolean().default(true),
	visibilidad: varchar({ length: 15 }).default('publico'),
	limiteUsosPorUsuario: integer("limite_usos_por_usuario"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ofertas_activo").using("btree", table.activo.asc().nullsLast()),
	index("idx_ofertas_fecha_fin").using("btree", table.fechaFin.asc().nullsLast()),
	index("idx_ofertas_fecha_inicio").using("btree", table.fechaInicio.asc().nullsLast()),
	index("idx_ofertas_negocio_id").using("btree", table.negocioId.asc().nullsLast()),
	index("idx_ofertas_sucursal_id").using("btree", table.sucursalId.asc().nullsLast()),
	foreignKey({
		columns: [table.articuloId],
		foreignColumns: [articulos.id],
		name: "ofertas_articulo_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "ofertas_negocio_id_fkey"
	}).onDelete("cascade"),
	check("ofertas_tipo_check", sql`(tipo)::text = ANY ((ARRAY['porcentaje'::character varying, 'monto_fijo'::character varying, '2x1'::character varying, '3x2'::character varying, 'envio_gratis'::character varying, 'otro'::character varying])::text[])`),
	check("ofertas_visibilidad_check", sql`(visibilidad IS NULL) OR ((visibilidad)::text = ANY ((ARRAY['publico'::character varying, 'privado'::character varying])::text[]))`),
]);

export const ofertaUsos = pgTable("oferta_usos", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	ofertaId: uuid("oferta_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	metodoCanje: varchar("metodo_canje", { length: 20 }),
	montoCompra: numeric("monto_compra", { precision: 10, scale: 2 }),
	descuentoAplicado: numeric("descuento_aplicado", { precision: 10, scale: 2 }),
	empleadoId: uuid("empleado_id"),
	sucursalId: uuid("sucursal_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_oferta_usos_oferta_usuario").using("btree", table.ofertaId.asc().nullsLast(), table.usuarioId.asc().nullsLast()),
	index("idx_oferta_usos_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_oferta_usos_created_at").using("btree", table.createdAt.asc().nullsLast()),
	foreignKey({
		columns: [table.ofertaId],
		foreignColumns: [ofertas.id],
		name: "oferta_usos_oferta_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "oferta_usos_usuario_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "fk_oferta_usos_empleado"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_oferta_usos_sucursal"
	}).onDelete("set null"),
	check("oferta_usos_metodo_check", sql`(metodo_canje IS NULL) OR ((metodo_canje)::text = ANY ((ARRAY['qr_presencial'::character varying, 'codigo_online'::character varying])::text[]))`),
]);

export const ofertaUsuarios = pgTable("oferta_usuarios", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	ofertaId: uuid("oferta_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	motivo: varchar({ length: 200 }),
	asignadoAt: timestamp("asignado_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	vista: boolean().default(false),
	codigoPersonal: varchar("codigo_personal", { length: 50 }),
	estado: varchar({ length: 20 }).default('activo'),
	usadoAt: timestamp("usado_at", { withTimezone: true, mode: 'string' }),
	revocadoAt: timestamp("revocado_at", { withTimezone: true, mode: 'string' }),
	revocadoPor: uuid("revocado_por"),
	motivoRevocacion: varchar("motivo_revocacion", { length: 200 }),
}, (table) => [
	index("idx_oferta_usuarios_oferta_id").using("btree", table.ofertaId.asc().nullsLast()),
	index("idx_oferta_usuarios_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_oferta_usuarios_codigo").using("btree", table.codigoPersonal.asc().nullsLast()).where(sql`codigo_personal IS NOT NULL`),
	index("idx_oferta_usuarios_estado").using("btree", table.usuarioId.asc().nullsLast(), table.estado.asc().nullsLast()),
	foreignKey({
		columns: [table.ofertaId],
		foreignColumns: [ofertas.id],
		name: "oferta_usuarios_oferta_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "oferta_usuarios_usuario_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.revocadoPor],
		foreignColumns: [usuarios.id],
		name: "oferta_usuarios_revocado_por_fkey"
	}).onDelete("set null"),
	unique("oferta_usuarios_unique").on(table.ofertaId, table.usuarioId),
	unique("oferta_usuarios_codigo_key").on(table.codigoPersonal),
	check("oferta_usuarios_estado_check", sql`(estado IS NULL) OR ((estado)::text = ANY ((ARRAY['activo'::character varying, 'usado'::character varying, 'expirado'::character varying, 'revocado'::character varying])::text[]))`),
]);

// Tablas de cupones ELIMINADAS — migradas a ofertas con código
// Ver: ofertaUsos, ofertaUsuarios (arriba)

// ============================================================================
// oferta_vistas — Eventos individuales de vista de ofertas (feed público)
// Migración: docs/migraciones/2026-04-29-crear-oferta-vistas.sql
//
// Complementa a `metricas_entidad.total_views` (acumulado histórico).
// Permite calcular popularidad por ventana de tiempo (ej. últimos 7 días).
// ============================================================================
export const ofertaVistas = pgTable("oferta_vistas", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	ofertaId: uuid("oferta_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_oferta_vistas_oferta_fecha").using(
		"btree",
		table.ofertaId.asc().nullsLast(),
		table.createdAt.desc().nullsLast(),
	),
	index("idx_oferta_vistas_usuario_fecha").using(
		"btree",
		table.usuarioId.asc().nullsLast(),
		table.createdAt.desc().nullsLast(),
	),
	foreignKey({
		columns: [table.ofertaId],
		foreignColumns: [ofertas.id],
		name: "oferta_vistas_oferta_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "oferta_vistas_usuario_id_fkey"
	}).onDelete("cascade"),
]);

// ============================================================================
// ofertas_destacadas — Override administrable para "Oferta del día"
// Migración: docs/migraciones/2026-04-29-crear-ofertas-destacadas.sql
// ============================================================================
export const ofertasDestacadas = pgTable("ofertas_destacadas", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	ofertaId: uuid("oferta_id").notNull(),
	fijadaPor: uuid("fijada_por").notNull(),
	fijadaAt: timestamp("fijada_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	vigenteDesde: timestamp("vigente_desde", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	vigenteHasta: timestamp("vigente_hasta", { withTimezone: true, mode: 'string' }).notNull(),
	motivo: varchar({ length: 200 }),
	activa: boolean().default(true).notNull(),
}, (table) => [
	index("idx_ofertas_destacadas_vigencia").using(
		"btree",
		table.activa.asc().nullsLast(),
		table.vigenteDesde.asc().nullsLast(),
		table.vigenteHasta.asc().nullsLast(),
	),
	foreignKey({
		columns: [table.ofertaId],
		foreignColumns: [ofertas.id],
		name: "ofertas_destacadas_oferta_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.fijadaPor],
		foreignColumns: [usuarios.id],
		name: "ofertas_destacadas_fijada_por_fkey"
	}).onDelete("restrict"),
]);


export const votos = pgTable("votos", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	userId: uuid("user_id"),
	entityType: varchar("entity_type", { length: 20 }).notNull(),
	entityId: uuid("entity_id").notNull(),
	tipoAccion: varchar("tipo_accion", { length: 10 }).default('like').notNull(),
	votanteSucursalId: uuid("votante_sucursal_id"),  // ← AGREGAR ESTA LÍNEA
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_votos_entity").using("btree", table.entityType.asc().nullsLast(), table.entityId.asc().nullsLast(), table.tipoAccion.asc().nullsLast()),
	index("idx_votos_user_id").using("btree", table.userId.asc().nullsLast()),
	index("idx_votos_votante_sucursal_id").using("btree", table.votanteSucursalId.asc().nullsLast()),  // ← AGREGAR ÍNDICE
	foreignKey({
		columns: [table.userId],
		foreignColumns: [usuarios.id],
		name: "votos_user_id_fkey"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.votanteSucursalId],
		foreignColumns: [negocioSucursales.id],  // ← AGREGAR FK
		name: "votos_votante_sucursal_id_fkey"
	}).onDelete("set null"),
	check("votos_entity_type_check", sql`(entity_type)::text = ANY ((ARRAY['sucursal'::character varying, 'articulo'::character varying, 'publicacion'::character varying, 'oferta'::character varying, 'servicio'::character varying])::text[])`),
	check("votos_tipo_accion_check", sql`(tipo_accion)::text = ANY ((ARRAY['like'::character varying, 'follow'::character varying])::text[])`),
]);

export const guardados = pgTable("guardados", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
	entityType: varchar("entity_type", { length: 20 }).notNull(),
	entityId: uuid("entity_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_guardados_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_guardados_entity").using("btree", table.entityType.asc().nullsLast(), table.entityId.asc().nullsLast()),
	index("idx_guardados_usuario_entity").using("btree", table.usuarioId.asc().nullsLast(), table.entityType.asc().nullsLast()),
	unique("guardados_unique").on(table.usuarioId, table.entityType, table.entityId),
	check("guardados_entity_type_check", sql`(entity_type)::text = ANY ((ARRAY['oferta'::character varying, 'servicio'::character varying, 'articulo_marketplace'::character varying])::text[])`),
]);

export const resenas = pgTable("resenas", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	autorId: uuid("autor_id"),
	autorTipo: varchar("autor_tipo", { length: 10 }).notNull(),
	destinoTipo: varchar("destino_tipo", { length: 10 }).notNull(),
	destinoId: uuid("destino_id").notNull(),
	rating: smallint(),
	texto: text(),
	interaccionTipo: varchar("interaccion_tipo", { length: 10 }).notNull(),
	interaccionId: uuid("interaccion_id").notNull(),
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	respondidoPorEmpleadoId: uuid("respondido_por_empleado_id").references(() => empleados.id, { onDelete: 'set null' }),
}, (table) => [
	index("idx_resenas_destino").using("btree", table.destinoTipo.asc().nullsLast(), table.destinoId.asc().nullsLast()),
	index("idx_resenas_interaccion").using("btree", table.interaccionTipo.asc().nullsLast(), table.interaccionId.asc().nullsLast()),
	index("idx_resenas_sucursal_id").using("btree", table.sucursalId.asc().nullsLast()),
	index("idx_resenas_respondido_empleado").using("btree", table.respondidoPorEmpleadoId.asc().nullsLast()),
	foreignKey({
		columns: [table.autorId],
		foreignColumns: [usuarios.id],
		name: "resenas_autor_id_fkey"
	}).onDelete("set null"),
	unique("resenas_unique").on(table.autorId, table.destinoTipo, table.destinoId, table.interaccionId),
	check("resenas_autor_tipo_check", sql`(autor_tipo)::text = ANY ((ARRAY['cliente'::character varying, 'negocio'::character varying])::text[])`),
	check("resenas_contenido_check", sql`(rating IS NOT NULL) OR (texto IS NOT NULL)`),
	check("resenas_destino_tipo_check", sql`(destino_tipo)::text = ANY ((ARRAY['negocio'::character varying, 'usuario'::character varying])::text[])`),
	check("resenas_direccion_check", sql`(((autor_tipo)::text = 'cliente'::text) AND ((destino_tipo)::text = 'negocio'::text)) OR (((autor_tipo)::text = 'negocio'::text) AND ((destino_tipo)::text = 'usuario'::text))`),
	check("resenas_interaccion_tipo_check", sql`(interaccion_tipo)::text = ANY ((ARRAY['pedido'::character varying, 'scanya'::character varying])::text[])`),
	check("resenas_rating_check", sql`(rating IS NULL) OR ((rating >= 1) AND (rating <= 5))`),
]);

export const metricasEntidad = pgTable("metricas_entidad", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	entityType: varchar("entity_type", { length: 20 }).notNull(),
	entityId: uuid("entity_id").notNull(),
	totalLikes: integer("total_likes").default(0),
	promedioRating: numeric("promedio_rating", { precision: 2, scale: 1 }).default('0'),
	totalResenas: integer("total_resenas").default(0),
	totalViews: integer("total_views").default(0),
	totalClicks: integer("total_clicks").default(0),
	totalShares: integer("total_shares").default(0),
	totalMessages: integer("total_messages").default(0),
	totalFollows: integer("total_follows").default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_metricas_entidad_entity").using("btree", table.entityType.asc().nullsLast(), table.entityId.asc().nullsLast()),
	unique("metricas_entidad_unique").on(table.entityType, table.entityId),
	// ⚠️ ACTUALIZADO: 'sucursal' en lugar de 'negocio'
	check("metricas_entidad_type_check", sql`(entity_type)::text = ANY ((ARRAY['sucursal'::character varying, 'articulo'::character varying, 'publicacion'::character varying, 'oferta'::character varying, 'servicio'::character varying])::text[])`),
]);


export const metricasUsuario = pgTable("metricas_usuario", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	totalLikes: integer("total_likes").default(0),
	totalRatings: integer("total_ratings").default(0),
	promedioRating: numeric("promedio_rating", { precision: 2, scale: 1 }).default('0'),
	totalResenas: integer("total_resenas").default(0),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_metricas_usuario_user_id").using("btree", table.userId.asc().nullsLast()),
	foreignKey({
		columns: [table.userId],
		foreignColumns: [usuarios.id],
		name: "metricas_usuario_user_id_fkey"
	}).onDelete("cascade"),
	unique("metricas_usuario_user_id_key").on(table.userId),
]);

export const categoriasNegocio = pgTable("categorias_negocio", {
	nombre: varchar({ length: 50 }).notNull(),
	orden: smallint().default(0),
	activa: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	id: serial().primaryKey().notNull(),
}, (table) => [
	unique("categorias_negocio_nombre_key").on(table.nombre),
]);

export const subcategoriasNegocio = pgTable("subcategorias_negocio", {
	id: serial().primaryKey().notNull(),
	categoriaId: integer("categoria_id").notNull(),
	nombre: varchar({ length: 50 }).notNull(),
	orden: smallint().default(0),
	activa: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("subcategorias_negocio_unique").on(table.categoriaId, table.nombre),
]);

// Disponibilidad del catálogo POR CIUDAD (capa N:M sobre el catálogo global).
// Regla: si una categoría/subcategoría NO tiene filas aquí → es GLOBAL (todas las
// ciudades); si tiene filas → solo en esas. Las gestiona el módulo Categorías del
// Panel (solo SuperAdmin). categorias/subcategorias.id son serial (integer);
// ciudades.id es uuid.
export const categoriaCiudades = pgTable("categoria_ciudades", {
	categoriaId: integer("categoria_id").notNull().references(() => categoriasNegocio.id, { onDelete: 'cascade' }),
	ciudadId: uuid("ciudad_id").notNull().references((): AnyPgColumn => ciudades.id, { onDelete: 'cascade' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_categoria_ciudades_ciudad").using("btree", table.ciudadId.asc().nullsLast()),
	primaryKey({ columns: [table.categoriaId, table.ciudadId], name: "categoria_ciudades_pkey" }),
]);

export const subcategoriaCiudades = pgTable("subcategoria_ciudades", {
	subcategoriaId: integer("subcategoria_id").notNull().references(() => subcategoriasNegocio.id, { onDelete: 'cascade' }),
	ciudadId: uuid("ciudad_id").notNull().references((): AnyPgColumn => ciudades.id, { onDelete: 'cascade' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_subcategoria_ciudades_ciudad").using("btree", table.ciudadId.asc().nullsLast()),
	primaryKey({ columns: [table.subcategoriaId, table.ciudadId], name: "subcategoria_ciudades_pkey" }),
]);

export const configuracionSistema = pgTable("configuracion_sistema", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	clave: varchar({ length: 100 }).notNull(),
	valor: text().notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	descripcion: text().notNull(),
	categoria: varchar({ length: 50 }).notNull(),
	unidad: varchar({ length: 20 }),
	valorMinimo: numeric("valor_minimo", { precision: 10, scale: 2 }),
	valorMaximo: numeric("valor_maximo", { precision: 10, scale: 2 }),
	actualizadoPor: uuid("actualizado_por"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_configuracion_categoria").using("btree", table.categoria.asc().nullsLast()),
	index("idx_configuracion_clave").using("btree", table.clave.asc().nullsLast()),
	foreignKey({
		columns: [table.actualizadoPor],
		foreignColumns: [usuarios.id],
		name: "fk_configuracion_usuario"
	}).onDelete("set null"),
	unique("configuracion_sistema_clave_key").on(table.clave),
	check("configuracion_categoria_check", sql`(categoria)::text = ANY (ARRAY[('transacciones'::character varying)::text, ('notificaciones'::character varying)::text, ('seguridad'::character varying)::text, ('pagos'::character varying)::text, ('promociones'::character varying)::text, ('trials'::character varying)::text, ('general'::character varying)::text, ('publicidad'::character varying)::text])`),
	check("configuracion_tipo_check", sql`(tipo)::text = ANY ((ARRAY['numero'::character varying, 'texto'::character varying, 'booleano'::character varying, 'json'::character varying, 'tramos_ciudades'::character varying, 'periodos_meses'::character varying])::text[])`),
]);

// =============================================================================
// PUBLICIDAD (Panel Admin · módulo 7) — venta del ESPACIO en los 3 carruseles de
// la columna derecha (Anuncios · Patrocinadores · Fundadores), SOLO desktop,
// acotada por ciudades. El anunciante es CUALQUIER usuario (personal o comercial)
// y sube su propia creatividad (se vende el espacio, no el diseño). Dos vías de
// alta: self-service (wizard + Stripe) o alta manual del Panel (efectivo/cortesía).
// El alcance del gerente es por las CIUDADES del anuncio (≥1 en su región). El
// folio del recibo REUSA la secuencia global `pagos_membresia_folio_seq` (folios
// correlativos con membresías). Reemplaza el schema dormido `planes_anuncios`/
// `promociones_pagadas` (jubilado: docs/migraciones/2026-06-21-drop-publicidad-dormida.sql).
// Detalle: docs/arquitectura/Panel_Admin/Publicidad.md.
//   - publicidad_compras         → la compra/campaña de un anunciante
//   - publicidad_piezas          → 1..3 creatividades (una por carrusel comprado)
//   - publicidad_compra_ciudades → N:M dónde se muestra
// =============================================================================
export const publicidadCompras = pgTable("publicidad_compras", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull().references((): AnyPgColumn => usuarios.id, { onDelete: 'cascade' }),
	// Opcional: si el anunciante es comercial, su negocio (para contexto/métricas).
	negocioId: uuid("negocio_id").references((): AnyPgColumn => negocios.id, { onDelete: 'set null' }),
	esCombo: boolean("es_combo").default(false).notNull(),         // compró los 3 carruseles (con descuento)
	estado: varchar({ length: 20 }).default('activa').notNull(),   // activa | pausada | expirada | cancelada
	origen: varchar({ length: 20 }).notNull(),                     // self | manual | cortesia
	metodoCobro: varchar("metodo_cobro", { length: 20 }),          // tarjeta | efectivo | transferencia | cortesia
	monto: numeric({ precision: 10, scale: 2 }),                   // NULL en cortesía
	// Folio del recibo (correlativo GLOBAL con membresías: reusa pagos_membresia_folio_seq).
	// Solo en compras con cobro; NULL en cortesía (no genera recibo). Lo asigna el service.
	folio: integer('folio'),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }), // solo self-service
	reciboUrl: text("recibo_url"),                                 // PDF en R2 (como membresías)
	duracionDias: integer("duracion_dias").notNull(),
	iniciaAt: timestamp("inicia_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiraAt: timestamp("expira_at", { withTimezone: true, mode: 'string' }).notNull(),
	// Marca anti-repetición del correo "tu publicidad está por vencer" (cron diario, 3 días antes).
	avisoVencimientoEnviado: boolean("aviso_vencimiento_enviado").default(false).notNull(),
	registradoPor: uuid("registrado_por").references((): AnyPgColumn => usuarios.id, { onDelete: 'set null' }), // alta manual; NULL en self
	// Si NO es NULL, esta fila es un PAGO de renovación del anuncio referenciado (extiende su vigencia):
	// no se muestra como anuncio (carrusel/Panel la excluyen). El anuncio "real" tiene renovacion_de = NULL.
	renovacionDe: uuid("renovacion_de").references((): AnyPgColumn => publicidadCompras.id, { onDelete: 'set null' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_publicidad_compras_usuario").using("btree", table.usuarioId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_publicidad_compras_estado_expira").using("btree", table.estado.asc().nullsLast(), table.expiraAt.asc().nullsLast()),
	index("idx_publicidad_compras_renovacion_de").using("btree", table.renovacionDe.asc().nullsLast()),
	uniqueIndex("idx_publicidad_compras_folio").using("btree", table.folio.asc().nullsLast()),
	check("publicidad_compras_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'activa'::character varying, 'pausada'::character varying, 'expirada'::character varying, 'cancelada'::character varying])::text[])`),
	check("publicidad_compras_origen_check", sql`(origen)::text = ANY ((ARRAY['self'::character varying, 'manual'::character varying, 'cortesia'::character varying])::text[])`),
	check("publicidad_compras_monto_check", sql`(monto IS NULL) OR (monto >= (0)::numeric)`),
	check("publicidad_compras_cortesia_sin_monto_check", sql`((origen)::text <> 'cortesia'::text) OR (monto IS NULL)`),
	check("publicidad_compras_fechas_check", sql`expira_at > inicia_at`),
]);

export const publicidadPiezas = pgTable("publicidad_piezas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	compraId: uuid("compra_id").notNull().references((): AnyPgColumn => publicidadCompras.id, { onDelete: 'cascade' }),
	carrusel: varchar({ length: 20 }).notNull(),                   // anuncios | patrocinadores | fundadores
	imagenUrl: text("imagen_url").notNull(),                       // creatividad subida por el anunciante (R2)
	clicks: integer().default(0).notNull(),                        // el "ver grande" (zoom) de la imagen
	impresiones: integer().default(0).notNull(),
	prioridad: integer().default(0).notNull(),                     // orden dentro del carrusel (futuro)
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("idx_publicidad_piezas_compra_carrusel").using("btree", table.compraId.asc().nullsLast(), table.carrusel.asc().nullsLast()),
	check("publicidad_piezas_carrusel_check", sql`(carrusel)::text = ANY ((ARRAY['anuncios'::character varying, 'patrocinadores'::character varying, 'fundadores'::character varying])::text[])`),
]);

export const publicidadCompraCiudades = pgTable("publicidad_compra_ciudades", {
	compraId: uuid("compra_id").notNull().references((): AnyPgColumn => publicidadCompras.id, { onDelete: 'cascade' }),
	ciudadId: uuid("ciudad_id").notNull().references((): AnyPgColumn => ciudades.id, { onDelete: 'cascade' }),
}, (table) => [
	// El carrusel público pregunta "¿qué anuncios vigentes hay en esta ciudad?".
	index("idx_publicidad_compra_ciudades_ciudad").using("btree", table.ciudadId.asc().nullsLast()),
	primaryKey({ columns: [table.compraId, table.ciudadId], name: "publicidad_compra_ciudades_pkey" }),
]);

export const promocionesTemporales = pgTable("promociones_temporales", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	codigo: varchar({ length: 50 }).notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	descripcion: text(),
	tipoDescuento: varchar("tipo_descuento", { length: 20 }).notNull(),
	valorDescuento: numeric("valor_descuento", { precision: 10, scale: 2 }),
	aplicaA: varchar("aplica_a", { length: 20 }).notNull(),
	planesIncluidos: jsonb("planes_incluidos"),
	fechaInicio: timestamp("fecha_inicio", { withTimezone: true, mode: 'string' }).notNull(),
	fechaFin: timestamp("fecha_fin", { withTimezone: true, mode: 'string' }).notNull(),
	maxUsosTotales: integer("max_usos_totales"),
	maxUsosPorUsuario: integer("max_usos_por_usuario").default(1).notNull(),
	usosActuales: integer("usos_actuales").default(0).notNull(),
	activo: boolean().default(true).notNull(),
	visiblePublico: boolean("visible_publico").default(false).notNull(),
	creadoPor: uuid("creado_por"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_promociones_temp_activo_fechas").using("btree", table.activo.asc().nullsLast(), table.fechaInicio.asc().nullsLast(), table.fechaFin.asc().nullsLast()).where(sql`(activo = true)`),
	index("idx_promociones_temp_aplica").using("btree", table.aplicaA.asc().nullsLast()),
	index("idx_promociones_temp_codigo").using("btree", sql`upper((codigo)::text)`),
	index("idx_promociones_temp_visible").using("btree", table.visiblePublico.asc().nullsLast()).where(sql`(visible_publico = true)`),
	foreignKey({
		columns: [table.creadoPor],
		foreignColumns: [usuarios.id],
		name: "fk_promociones_temporales_creador"
	}).onDelete("set null"),
	unique("promociones_temporales_codigo_key").on(table.codigo),
	check("promociones_temporales_aplica_check", sql`(aplica_a)::text = ANY ((ARRAY['planes'::character varying, 'anuncios'::character varying, 'ambos'::character varying])::text[])`),
	check("promociones_temporales_codigo_check", sql`((codigo)::text = upper((codigo)::text)) AND ((codigo)::text !~ '\s'::text)`),
	check("promociones_temporales_fechas_check", sql`fecha_fin > fecha_inicio`),
	check("promociones_temporales_fijo_check", sql`((tipo_descuento)::text <> 'fijo'::text) OR (valor_descuento > (0)::numeric)`),
	check("promociones_temporales_max_usos_check", sql`(max_usos_totales IS NULL) OR (max_usos_totales > 0)`),
	check("promociones_temporales_porcentaje_check", sql`((tipo_descuento)::text <> 'porcentaje'::text) OR ((valor_descuento >= (1)::numeric) AND (valor_descuento <= (100)::numeric))`),
	check("promociones_temporales_tipo_check", sql`(tipo_descuento)::text = ANY ((ARRAY['porcentaje'::character varying, 'fijo'::character varying, '3x2'::character varying, 'meses_gratis'::character varying])::text[])`),
]);

export const promocionesUsadas = pgTable("promociones_usadas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	promocionId: uuid("promocion_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	tipoEntidad: varchar("tipo_entidad", { length: 20 }).notNull(),
	entidadId: uuid("entidad_id").notNull(),
	precioOriginal: numeric("precio_original", { precision: 10, scale: 2 }).notNull(),
	precioFinal: numeric("precio_final", { precision: 10, scale: 2 }).notNull(),
	descuentoAplicado: numeric("descuento_aplicado", { precision: 10, scale: 2 }).notNull(),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_promociones_usadas_promocion_fecha").using("btree", table.promocionId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_promociones_usadas_promocion_usuario").using("btree", table.promocionId.asc().nullsLast(), table.usuarioId.asc().nullsLast()),
	index("idx_promociones_usadas_usuario_fecha").using("btree", table.usuarioId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	foreignKey({
		columns: [table.promocionId],
		foreignColumns: [promocionesTemporales.id],
		name: "fk_promociones_usadas_promocion"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_promociones_usadas_usuario"
	}).onDelete("cascade"),
	check("promociones_usadas_precios_check", sql`(precio_final <= precio_original) AND (descuento_aplicado >= (0)::numeric)`),
	check("promociones_usadas_tipo_check", sql`(tipo_entidad)::text = ANY ((ARRAY['plan'::character varying, 'anuncio'::character varying])::text[])`),
]);

// ── Liquidación de vendedores (Fase 2) ──────────────────────────────────────
// pagos_vendedor = bitácora de EGRESOS (lo que se le paga al vendedor); la gemela
// de eventos_pago/pagos_membresia del lado de los egresos. Ver migración 2026-06-17.
export const pagosVendedor = pgTable("pagos_vendedor", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	embajadorId: uuid("embajador_id").notNull(),
	monto: numeric({ precision: 10, scale: 2 }).notNull(),
	metodo: varchar({ length: 20 }).notNull(),
	fechaPago: date("fecha_pago").notNull(),
	periodo: varchar({ length: 7 }),
	nota: varchar({ length: 500 }),
	comprobanteUrl: text("comprobante_url"),
	registradoPor: uuid("registrado_por"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_pagos_vendedor_embajador").using("btree", table.embajadorId.asc().nullsLast(), table.fechaPago.desc().nullsFirst()),
	foreignKey({
		columns: [table.embajadorId],
		foreignColumns: [embajadores.id],
		name: "pagos_vendedor_embajador_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.registradoPor],
		foreignColumns: [usuarios.id],
		name: "pagos_vendedor_registrado_por_fkey"
	}).onDelete("set null"),
	check("pagos_vendedor_monto_check", sql`monto > (0)::numeric`),
	check("pagos_vendedor_metodo_check", sql`(metodo)::text = ANY ((ARRAY['transferencia'::character varying, 'efectivo'::character varying])::text[])`),
]);

// vendedor_datos_cobro = datos de cobro sensibles, aislados, 1 por vendedor.
export const vendedorDatosCobro = pgTable("vendedor_datos_cobro", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	embajadorId: uuid("embajador_id").notNull(),
	metodo: varchar({ length: 20 }).default('transferencia').notNull(),
	banco: varchar({ length: 80 }),
	clabe: varchar({ length: 18 }),
	titular: varchar({ length: 120 }),
	nota: varchar({ length: 300 }),
	actualizadoPor: uuid("actualizado_por"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("vendedor_datos_cobro_embajador_id_key").using("btree", table.embajadorId.asc().nullsLast()),
	foreignKey({
		columns: [table.embajadorId],
		foreignColumns: [embajadores.id],
		name: "vendedor_datos_cobro_embajador_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.actualizadoPor],
		foreignColumns: [usuarios.id],
		name: "vendedor_datos_cobro_actualizado_por_fkey"
	}).onDelete("set null"),
	check("vendedor_datos_cobro_metodo_check", sql`(metodo)::text = ANY ((ARRAY['transferencia'::character varying, 'efectivo'::character varying])::text[])`),
]);

// embajador_comisiones = una fila = una comisión devengada. MONTO FIJO (no %):
//   alta → por negocio (negocio_id) · recurrente → por vendedor/periodo (negocio_id NULL).
export const embajadorComisiones = pgTable("embajador_comisiones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	embajadorId: uuid("embajador_id").notNull(),
	negocioId: uuid("negocio_id"),
	tipo: varchar({ length: 20 }).notNull(),
	montoComision: numeric("monto_comision", { precision: 10, scale: 2 }).notNull(),
	montoPagado: numeric("monto_pagado", { precision: 10, scale: 2 }).default('0').notNull(), // abonos acumulados (pago + compensación); 'pagada' cuando = monto_comision
	estado: varchar({ length: 20 }).default('pendiente').notNull(),
	periodo: varchar({ length: 7 }),
	detalle: jsonb(),
	pagoId: uuid("pago_id"),
	pagadaAt: timestamp("pagada_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_embajador_comisiones_embajador").using("btree", table.embajadorId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_embajador_comisiones_estado").using("btree", table.estado.asc().nullsLast()).where(sql`((estado)::text = 'pendiente'::text)`),
	index("idx_embajador_comisiones_negocio").using("btree", table.negocioId.asc().nullsLast()),
	index("idx_embajador_comisiones_tipo").using("btree", table.tipo.asc().nullsLast()),
	index("idx_embajador_comisiones_pago").using("btree", table.pagoId.asc().nullsLast()).where(sql`(pago_id IS NOT NULL)`),
	// (Pieza 3) Se retiró el único (embajador_id, periodo) de las recurrentes: ahora son POR NEGOCIO
	// al cobro, así que un vendedor puede tener varias recurrentes en el mismo mes.
	foreignKey({
		columns: [table.embajadorId],
		foreignColumns: [embajadores.id],
		name: "fk_embajador_comisiones_embajador"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.pagoId],
		foreignColumns: [pagosVendedor.id],
		name: "fk_embajador_comisiones_pago"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_embajador_comisiones_negocio"
	}).onDelete("cascade"),
	check("embajador_comisiones_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'pagada'::character varying, 'cancelada'::character varying])::text[])`),
	check("embajador_comisiones_monto_comision_check", sql`monto_comision >= (0)::numeric`),
	check("embajador_comisiones_tipo_check", sql`(tipo)::text = ANY ((ARRAY['alta'::character varying, 'recurrente'::character varying])::text[])`),
]);

// efectivo_movimientos = libro del efectivo que el VENDEDOR te debe entregar (pieza D).
// Saldo = Σ cobros − Σ (entregas + compensaciones).
export const efectivoMovimientos = pgTable("efectivo_movimientos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	embajadorId: uuid("embajador_id").notNull(),
	tipo: varchar({ length: 20 }).notNull(),               // cobro | entrega | compensacion
	monto: numeric({ precision: 10, scale: 2 }).notNull(),
	negocioId: uuid("negocio_id"),                          // en 'cobro'
	pagoId: uuid("pago_id"),                                // en 'compensacion'
	fecha: date().notNull(),
	registradoPor: uuid("registrado_por"),
	nota: varchar({ length: 500 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_efectivo_mov_embajador").using("btree", table.embajadorId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	foreignKey({ columns: [table.embajadorId], foreignColumns: [embajadores.id], name: "efectivo_movimientos_embajador_id_fkey" }).onDelete("cascade"),
	foreignKey({ columns: [table.negocioId], foreignColumns: [negocios.id], name: "efectivo_movimientos_negocio_id_fkey" }).onDelete("set null"),
	foreignKey({ columns: [table.pagoId], foreignColumns: [pagosVendedor.id], name: "efectivo_movimientos_pago_id_fkey" }).onDelete("set null"),
	foreignKey({ columns: [table.registradoPor], foreignColumns: [usuarios.id], name: "efectivo_movimientos_registrado_por_fkey" }).onDelete("set null"),
	check("efectivo_mov_monto_check", sql`monto > (0)::numeric`),
	check("efectivo_mov_tipo_check", sql`(tipo)::text = ANY ((ARRAY['cobro'::character varying, 'entrega'::character varying, 'compensacion'::character varying])::text[])`),
]);

// Tablas dinamicas (dinamica_premios, dinamicas, dinamica_participaciones)
// fueron eliminadas en Fase D del cleanup (visión v3 — abril 2026).
// Dinámicas/Rifas P2P se descartaron permanentemente para v1 por riesgo legal
// SEGOB. Ver: docs/migraciones/2026-04-28-fase-d-vision-v3-cleanup.sql.

export const empleados = pgTable("empleados", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	nombre: varchar({ length: 200 }).notNull(),
	especialidad: varchar({ length: 100 }),
	telefono: varchar({ length: 20 }),
	correo: varchar({ length: 150 }),
	fotoUrl: text("foto_url"),
	totalCitasAtendidas: integer("total_citas_atendidas").default(0),
	calificacionPromedio: numeric("calificacion_promedio", { precision: 2, scale: 1 }).default('0'),
	totalResenas: integer("total_resenas").default(0),
	activo: boolean().default(true),
	orden: integer().default(0),
	notasInternas: text("notas_internas"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	puedeRegistrarVentas: boolean("puede_registrar_ventas").default(true).notNull(),
	puedeProcesarCanjes: boolean("puede_procesar_canjes").default(true).notNull(),
	puedeVerHistorial: boolean("puede_ver_historial").default(true).notNull(),
	pinAcceso: varchar("pin_acceso", { length: 4 }),
	sucursalId: uuid('sucursal_id'),
	nick: varchar({ length: 30 }),
	puedeResponderChat: boolean("puede_responder_chat").default(true),
	puedeResponderResenas: boolean("puede_responder_resenas").default(true),
	eliminadoAt: timestamp("eliminado_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_empleados_activo").using("btree", table.activo.asc().nullsLast()),
	index("idx_empleados_pin_acceso").using("btree", table.pinAcceso.asc().nullsLast()).where(sql`(pin_acceso IS NOT NULL)`),
	index("idx_empleados_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_empleados_sucursal_id").using("btree", table.sucursalId.asc().nullsLast()).where(sql`(sucursal_id IS NOT NULL)`),
	uniqueIndex("idx_empleados_nick_unique").using("btree", table.nick.asc().nullsLast()).where(sql`(nick IS NOT NULL)`),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "empleados_sucursal_id_fkey"
	}).onDelete("cascade"),
	check("empleados_pin_acceso_check", sql`(pin_acceso IS NULL) OR ((pin_acceso)::text ~ '^[0-9]{4}$'::text)`),
]);

export const puntosConfiguracion = pgTable("puntos_configuracion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	puntosPorPeso: numeric("puntos_por_peso", { precision: 10, scale: 4 }).default('1.0').notNull(),
	pesosOriginales: integer("pesos_originales"),
	puntosOriginales: integer("puntos_originales"),
	minimoCompra: numeric("minimo_compra", { precision: 10, scale: 2 }).default('0').notNull(),
	diasExpiracionPuntos: integer("dias_expiracion_puntos").default(90),
	diasExpiracionVoucher: integer("dias_expiracion_voucher").default(30).notNull(),
	validarHorario: boolean("validar_horario").default(true).notNull(),
	horarioInicio: time("horario_inicio").default('09:00:00').notNull(),
	horarioFin: time("horario_fin").default('22:00:00').notNull(),
	activo: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	// Sistema de niveles
	nivelesActivos: boolean("niveles_activos").default(true),
	// Nivel Bronce
	nivelBronceMin: integer("nivel_bronce_min").default(0),
	nivelBronceMax: integer("nivel_bronce_max").default(999),
	nivelBronceMultiplicador: numeric("nivel_bronce_multiplicador", { precision: 3, scale: 2 }).default('1.0'),
	nivelBronceNombre: varchar("nivel_bronce_nombre", { length: 50 }),
	// Nivel Plata
	nivelPlataMin: integer("nivel_plata_min").default(1000),
	nivelPlataMax: integer("nivel_plata_max").default(4999),
	nivelPlataMultiplicador: numeric("nivel_plata_multiplicador", { precision: 3, scale: 2 }).default('1.2'),
	nivelPlataNombre: varchar("nivel_plata_nombre", { length: 50 }),
	// Nivel Oro
	nivelOroMin: integer("nivel_oro_min").default(5000),
	nivelOroMultiplicador: numeric("nivel_oro_multiplicador", { precision: 3, scale: 2 }).default('1.5'),
	nivelOroNombre: varchar("nivel_oro_nombre", { length: 50 }),
}, (table) => [
	index("idx_puntos_configuracion_activo").using("btree", table.activo.asc().nullsLast()).where(sql`(activo = true)`),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_puntos_configuracion_negocio"
	}).onDelete("cascade"),
	unique("puntos_configuracion_negocio_unique").on(table.negocioId),
	check("puntos_configuracion_dias_expiracion_check", sql`(dias_expiracion_puntos IS NULL OR dias_expiracion_puntos > 0) AND (dias_expiracion_voucher > 0)`),
	check("puntos_configuracion_horario_check", sql`horario_fin > horario_inicio`),
	check("puntos_configuracion_minimo_compra_check", sql`minimo_compra >= (0)::numeric`),
	check("puntos_configuracion_puntos_por_peso_check", sql`puntos_por_peso > (0)::numeric`),
]);

export const puntosBilletera = pgTable("puntos_billetera", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	negocioId: uuid("negocio_id").notNull(),
	puntosDisponibles: integer("puntos_disponibles").default(0).notNull(),
	puntosAcumuladosTotal: integer("puntos_acumulados_total").default(0).notNull(),
	puntosCanjeadosTotal: integer("puntos_canjeados_total").default(0).notNull(),
	puntosExpiradosTotal: integer("puntos_expirados_total").default(0).notNull(),
	ultimaActividad: timestamp("ultima_actividad", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	nivelActual: varchar("nivel_actual", { length: 20 }).default('bronce'),
}, (table) => [
	index("idx_puntos_billetera_negocio").using("btree", table.negocioId.asc().nullsLast()),
	index("idx_puntos_billetera_usuario_negocio").using("btree", table.usuarioId.asc().nullsLast(), table.negocioId.asc().nullsLast()),
	index("idx_puntos_billetera_nivel").using("btree", table.negocioId.asc().nullsLast(), table.nivelActual.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_puntos_billetera_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_puntos_billetera_usuario"
	}).onDelete("cascade"),
	unique("puntos_billetera_unique").on(table.usuarioId, table.negocioId),
	check("puntos_billetera_puntos_disponibles_check", sql`puntos_disponibles >= 0`),
	check("puntos_billetera_totales_check", sql`(puntos_acumulados_total >= 0) AND (puntos_canjeados_total >= 0) AND (puntos_expirados_total >= 0)`),
]);

export const recompensas = pgTable("recompensas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	nombre: varchar({ length: 200 }).notNull(),
	descripcion: text(),
	puntosRequeridos: integer("puntos_requeridos").notNull(),
	imagenUrl: varchar("imagen_url", { length: 500 }),
	stock: integer(), // Nullable por defecto - NULL = ilimitado
	requiereAprobacion: boolean("requiere_aprobacion").default(false).notNull(),
	activa: boolean().default(true).notNull(),
	orden: integer().default(0).notNull(),
	tipo: varchar({ length: 30 }).default('basica'),
	numeroComprasRequeridas: integer("numero_compras_requeridas"),
	requierePuntos: boolean("requiere_puntos").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_recompensas_negocio_activa").using("btree", table.negocioId.asc().nullsLast(), table.activa.asc().nullsLast()).where(sql`(activa = true)`),
	index("idx_recompensas_orden").using("btree", table.negocioId.asc().nullsLast(), table.orden.asc().nullsLast()),
	index("idx_recompensas_tipo").using("btree", table.negocioId.asc().nullsLast(), table.tipo.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_recompensas_negocio"
	}).onDelete("cascade"),
	check("recompensas_puntos_requeridos_check", sql`puntos_requeridos > 0`),
	check("recompensas_stock_check", sql`stock >= '-1'::integer`),
	check("recompensas_tipo_check", sql`(tipo IS NULL) OR ((tipo)::text = ANY ((ARRAY['basica'::character varying, 'compras_frecuentes'::character varying])::text[]))`),
]);

export const recompensaProgreso = pgTable("recompensa_progreso", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	recompensaId: uuid("recompensa_id").notNull(),
	negocioId: uuid("negocio_id").notNull(),
	comprasAcumuladas: integer("compras_acumuladas").default(0),
	desbloqueada: boolean().default(false),
	desbloqueadaAt: timestamp("desbloqueada_at", { withTimezone: true, mode: 'string' }),
	canjeada: boolean().default(false),
	canjeadaAt: timestamp("canjeada_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_recompensa_progreso_usuario_negocio").using("btree", table.usuarioId.asc().nullsLast(), table.negocioId.asc().nullsLast()),
	index("idx_recompensa_progreso_recompensa").using("btree", table.recompensaId.asc().nullsLast()),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "recompensa_progreso_usuario_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.recompensaId],
		foreignColumns: [recompensas.id],
		name: "recompensa_progreso_recompensa_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "recompensa_progreso_negocio_id_fkey"
	}).onDelete("cascade"),
	unique("recompensa_progreso_unique").on(table.usuarioId, table.recompensaId),
]);

export const scanyaTurnos = pgTable("scanya_turnos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	sucursalId: uuid("sucursal_id").notNull(),
	empleadoId: uuid("empleado_id"),  // ← QUITADO .notNull()
	usuarioId: uuid("usuario_id"),     // ← NUEVO CAMPO
	horaInicio: timestamp("hora_inicio", { withTimezone: true, mode: 'string' }).defaultNow(),
	horaFin: timestamp("hora_fin", { withTimezone: true, mode: 'string' }),
	puntosOtorgados: integer("puntos_otorgados").default(0),
	transacciones: integer().default(0),
	cerradoPor: uuid("cerrado_por"),
	notasCierre: text("notas_cierre"),
	avisoVistoAt: timestamp("aviso_visto_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	// ÍNDICE ACTUALIZADO - ahora usa COALESCE para empleado o usuario
	uniqueIndex("idx_scanya_turnos_operador_abierto").using("btree",
		sql`COALESCE(${table.empleadoId}, ${table.usuarioId})`
	).where(sql`(hora_fin IS NULL)`),
	index("idx_scanya_turnos_negocio").using("btree", table.negocioId.asc().nullsLast(), table.horaInicio.desc().nullsFirst()),
	index("idx_scanya_turnos_sucursal").using("btree", table.sucursalId.asc().nullsLast(), table.horaInicio.desc().nullsFirst()),
	index("idx_scanya_turnos_empleado").using("btree", table.empleadoId.asc().nullsLast(), table.horaInicio.desc().nullsFirst()),
	// NUEVO ÍNDICE para usuarios (dueños/gerentes)
	index("idx_scanya_turnos_usuario").using("btree", table.usuarioId.asc().nullsLast(), table.horaInicio.desc().nullsFirst()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_scanya_turnos_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_scanya_turnos_sucursal"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "fk_scanya_turnos_empleado"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.cerradoPor],
		foreignColumns: [usuarios.id],
		name: "fk_scanya_turnos_cerrado_por"
	}).onDelete("set null"),
	// NUEVA FK para usuario_id
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_scanya_turnos_usuario"
	}).onDelete("set null"),
	// CHECK constraint (Drizzle lo maneja en BD, no en schema)
]);

export const scanyaConfiguracion = pgTable("scanya_configuracion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	fotoTicket: varchar("foto_ticket", { length: 20 }).default('opcional'),
	requiereNumeroOrden: boolean("requiere_numero_orden").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_scanya_configuracion_negocio"
	}).onDelete("cascade"),
	unique("scanya_configuracion_negocio_unique").on(table.negocioId),
	check("scanya_configuracion_foto_ticket_check", sql`(foto_ticket)::text = ANY ((ARRAY['nunca'::character varying, 'opcional'::character varying, 'obligatoria'::character varying])::text[])`),
]);

export const scanyaRecordatorios = pgTable("scanya_recordatorios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	sucursalId: uuid("sucursal_id").notNull(),
	empleadoId: uuid('empleado_id'),
	turnoId: uuid('turno_id'), // ⬅️ AGREGADO
	telefonoOAlias: varchar("telefono_o_alias", { length: 50 }),
	monto: numeric({ precision: 10, scale: 2 }).notNull(),
	montoEfectivo: numeric("monto_efectivo", { precision: 10, scale: 2 }).default('0'),
	montoTarjeta: numeric("monto_tarjeta", { precision: 10, scale: 2 }).default('0'),
	montoTransferencia: numeric("monto_transferencia", { precision: 10, scale: 2 }).default('0'),
	nota: text(),
	concepto: varchar("concepto", { length: 200 }),
	estado: varchar({ length: 20 }).default('pendiente'),
	procesadoAt: timestamp("procesado_at", { withTimezone: true, mode: 'string' }),
	procesadoPor: uuid("procesado_por"),
	transaccionId: uuid("transaccion_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_scanya_recordatorios_pendientes").using("btree", table.negocioId.asc().nullsLast(), table.sucursalId.asc().nullsLast(), table.estado.asc().nullsLast()).where(sql`((estado)::text = 'pendiente'::text)`),
	index("idx_scanya_recordatorios_empleado").using("btree", table.empleadoId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_scanya_recordatorios_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_scanya_recordatorios_sucursal"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "fk_scanya_recordatorios_empleado"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.turnoId], // ⬅️ AGREGADO
		foreignColumns: [scanyaTurnos.id],
		name: "fk_scanya_recordatorios_turno"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.procesadoPor],
		foreignColumns: [usuarios.id],
		name: "fk_scanya_recordatorios_procesado_por"
	}).onDelete("set null"),
	check("scanya_recordatorios_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'procesado'::character varying, 'descartado'::character varying])::text[])`),
	check("scanya_recordatorios_monto_check", sql`monto > (0)::numeric`),
]);

export const puntosTransacciones = pgTable("puntos_transacciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	billeteraId: uuid("billetera_id").notNull(),
	negocioId: uuid("negocio_id").notNull(),
	empleadoId: uuid("empleado_id"),
	sucursalId: uuid('sucursal_id').notNull(),
	clienteId: uuid("cliente_id").notNull(),
	montoCompra: numeric("monto_compra", { precision: 10, scale: 2 }).notNull(),
	puntosOtorgados: integer("puntos_otorgados").notNull(),
	numeroOrden: varchar("numero_orden", { length: 50 }),
	tipo: varchar({ length: 20 }).default('presencial').notNull(),
	estado: varchar({ length: 20 }).default('pendiente').notNull(),
	confirmadoPorCliente: boolean("confirmado_por_cliente").default(false).notNull(),
	expiraConfirmacion: timestamp("expira_confirmacion", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	// Campos ScanYA
	montoEfectivo: numeric("monto_efectivo", { precision: 10, scale: 2 }).default('0'),
	montoTarjeta: numeric("monto_tarjeta", { precision: 10, scale: 2 }).default('0'),
	montoTransferencia: numeric("monto_transferencia", { precision: 10, scale: 2 }).default('0'),
	turnoId: uuid("turno_id"),
	fotoTicketUrl: text("foto_ticket_url"),
	multiplicadorAplicado: numeric("multiplicador_aplicado", { precision: 3, scale: 2 }).default('1.0'),
	ofertaUsoId: bigint("cupon_uso_id", { mode: 'number' }),
	nota: text("nota"),
	concepto: varchar("concepto", { length: 200 }),
	recompensaSellosId: uuid("recompensa_sellos_id"),
	motivoRevocacion: text("motivo_revocacion"),
	revocadoPor: uuid("revocado_por"),
	revocadoAt: timestamp("revocado_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_puntos_transacciones_billetera").using("btree", table.billeteraId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_puntos_transacciones_cliente").using("btree", table.clienteId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_puntos_transacciones_estado").using("btree", table.estado.asc().nullsLast(), table.expiraConfirmacion.asc().nullsLast()),
	index("idx_puntos_transacciones_negocio").using("btree", table.negocioId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_puntos_transacciones_sucursal").using("btree", table.sucursalId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_puntos_transacciones_turno").using("btree", table.turnoId.asc().nullsLast()).where(sql`(turno_id IS NOT NULL)`),
	foreignKey({
		columns: [table.billeteraId],
		foreignColumns: [puntosBilletera.id],
		name: "fk_puntos_transacciones_billetera"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.clienteId],
		foreignColumns: [usuarios.id],
		name: "fk_puntos_transacciones_cliente"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "fk_puntos_transacciones_empleado"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_puntos_transacciones_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_puntos_transacciones_sucursal"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.turnoId],
		foreignColumns: [scanyaTurnos.id],
		name: "fk_puntos_transacciones_turno"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.ofertaUsoId],
		foreignColumns: [ofertaUsos.id],
		name: "fk_puntos_transacciones_oferta_uso"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.revocadoPor],
		foreignColumns: [usuarios.id],
		name: "fk_puntos_transacciones_revocado_por"
	}).onDelete("set null"),
	index("idx_puntos_transacciones_revocadas").using("btree", table.negocioId.asc().nullsLast(), table.revocadoAt.desc().nullsFirst()).where(sql`((estado)::text = 'cancelado'::text)`),
	check("puntos_transacciones_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'rechazado'::character varying, 'cancelado'::character varying])::text[])`),
	check("puntos_transacciones_monto_check", sql`monto_compra >= (0)::numeric`),
	check("puntos_transacciones_puntos_check", sql`puntos_otorgados >= 0`),
	check("puntos_transacciones_tipo_check", sql`(tipo)::text = ANY ((ARRAY['presencial'::character varying, 'domicilio'::character varying])::text[])`),
]);

export const transaccionesEvidencia = pgTable("transacciones_evidencia", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transaccionId: uuid("transaccion_id").notNull(),
	urlImagen: varchar("url_imagen", { length: 500 }).notNull(),
	tipo: varchar({ length: 20 }).default('ticket').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_transacciones_evidencia_transaccion").using("btree", table.transaccionId.asc().nullsLast()),
	foreignKey({
		columns: [table.transaccionId],
		foreignColumns: [puntosTransacciones.id],
		name: "fk_transacciones_evidencia_transaccion"
	}).onDelete("cascade"),
	check("transacciones_evidencia_tipo_check", sql`(tipo)::text = ANY ((ARRAY['ticket'::character varying, 'producto'::character varying, 'otro'::character varying])::text[])`),
]);

export const vouchersCanje = pgTable("vouchers_canje", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	billeteraId: uuid("billetera_id").notNull(),
	recompensaId: uuid("recompensa_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	negocioId: uuid("negocio_id").notNull(),
	codigo: varchar({ length: 6 }).notNull(),
	qrData: varchar("qr_data", { length: 500 }),
	puntosUsados: integer("puntos_usados").notNull(),
	estado: varchar({ length: 30 }).default('pendiente').notNull(),
	expiraAt: timestamp("expira_at", { withTimezone: true, mode: 'string' }).notNull(),
	usadoAt: timestamp("usado_at", { withTimezone: true, mode: 'string' }),
	usadoPorEmpleadoId: uuid("usado_por_empleado_id"),
	usadoPorUsuarioId: uuid("usado_por_usuario_id"),
	sucursalId: uuid('sucursal_id'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_vouchers_canje_codigo").using("btree", table.codigo.asc().nullsLast()),
	index("idx_vouchers_canje_estado").using("btree", table.estado.asc().nullsLast(), table.expiraAt.asc().nullsLast()),
	index("idx_vouchers_canje_negocio").using("btree", table.negocioId.asc().nullsLast(), table.estado.asc().nullsLast()),
	index("idx_vouchers_canje_usuario").using("btree", table.usuarioId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_vouchers_canje_sucursal").using("btree", table.sucursalId.asc().nullsLast(), table.estado.asc().nullsLast()),
	foreignKey({
		columns: [table.billeteraId],
		foreignColumns: [puntosBilletera.id],
		name: "fk_vouchers_canje_billetera"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usadoPorEmpleadoId],
		foreignColumns: [empleados.id],
		name: "fk_vouchers_canje_empleado"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.usadoPorUsuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_vouchers_canje_usuario_validador"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_vouchers_canje_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.recompensaId],
		foreignColumns: [recompensas.id],
		name: "fk_vouchers_canje_recompensa"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_vouchers_canje_usuario"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_vouchers_canje_sucursal"
	}).onDelete("cascade"),
	unique("vouchers_canje_codigo_key").on(table.codigo),
	check("vouchers_canje_codigo_check", sql`(codigo)::text ~ '^[A-Z0-9]{6}$'::text`),
	check("vouchers_canje_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobacion_pendiente'::character varying, 'usado'::character varying, 'expirado'::character varying, 'cancelado'::character varying])::text[])`),
	check("vouchers_canje_puntos_check", sql`puntos_usados >= 0`),
]);

export const alertasSeguridad = pgTable("alertas_seguridad", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	sucursalId: uuid("sucursal_id"),
	transaccionId: uuid("transaccion_id"),
	empleadoId: uuid("empleado_id"),
	tipo: varchar({ length: 30 }).notNull(),
	categoria: varchar({ length: 30 }).default('seguridad').notNull(),
	severidad: varchar({ length: 10 }).default('media').notNull(),
	titulo: varchar({ length: 200 }).notNull(),
	descripcion: text().notNull(),
	data: jsonb(),
	accionesSugeridas: jsonb("acciones_sugeridas"),
	leida: boolean().default(false).notNull(),
	leidaAt: timestamp("leida_at", { withTimezone: true, mode: 'string' }),
	resuelta: boolean().default(false).notNull(),
	resueltaAt: timestamp("resuelta_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_alertas_seguridad_negocio_leida").using("btree", table.negocioId.asc().nullsLast(), table.leida.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_alertas_seguridad_severidad").using("btree", table.severidad.asc().nullsLast()).where(sql`((severidad)::text = 'alta'::text)`),
	index("idx_alertas_seguridad_tipo").using("btree", table.tipo.asc().nullsLast()),
	index("idx_alertas_seguridad_categoria").using("btree", table.categoria.asc().nullsLast()),
	index("idx_alertas_seguridad_created_at").using("btree", table.createdAt.desc().nullsFirst()),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "fk_alertas_seguridad_empleado"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_alertas_seguridad_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_alertas_seguridad_sucursal"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.transaccionId],
		foreignColumns: [puntosTransacciones.id],
		name: "fk_alertas_seguridad_transaccion"
	}).onDelete("cascade"),
	check("alertas_seguridad_severidad_check", sql`(severidad)::text = ANY ((ARRAY['baja'::character varying, 'media'::character varying, 'alta'::character varying])::text[])`),
	check("alertas_seguridad_categoria_check", sql`(categoria)::text = ANY ((ARRAY['seguridad'::character varying, 'operativa'::character varying, 'rendimiento'::character varying, 'engagement'::character varying])::text[])`),
	check("alertas_seguridad_tipo_check", sql`(tipo)::text = ANY ((ARRAY['monto_inusual'::character varying, 'cliente_frecuente'::character varying, 'fuera_horario'::character varying, 'montos_redondos'::character varying, 'empleado_destacado'::character varying, 'voucher_estancado'::character varying, 'acumulacion_vouchers'::character varying, 'oferta_por_expirar'::character varying, 'cupones_por_expirar'::character varying, 'caida_ventas'::character varying, 'cliente_vip_inactivo'::character varying, 'racha_resenas_negativas'::character varying, 'pico_actividad'::character varying, 'cupones_sin_canjear'::character varying, 'puntos_por_expirar'::character varying, 'recompensa_popular'::character varying])::text[])`),
]);

export const alertasConfiguracion = pgTable("alertas_configuracion", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	tipoAlerta: varchar("tipo_alerta", { length: 30 }).notNull(),
	activo: boolean().default(true).notNull(),
	umbrales: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_alertas_config_negocio").using("btree", table.negocioId.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_alertas_config_negocio"
	}).onDelete("cascade"),
	unique("alertas_configuracion_negocio_tipo_key").on(table.negocioId, table.tipoAlerta),
]);

export const notificaciones = pgTable("notificaciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	modo: varchar({ length: 15 }).notNull(),
	tipo: varchar({ length: 50 }).notNull(),
	titulo: varchar({ length: 200 }).notNull(),
	mensaje: varchar({ length: 500 }).notNull(),
	negocioId: uuid("negocio_id"),
	sucursalId: uuid("sucursal_id"),
	referenciaId: varchar("referencia_id", { length: 100 }),
	referenciaTipo: varchar("referencia_tipo", { length: 30 }),
	icono: varchar({ length: 20 }),
	actorImagenUrl: text("actor_imagen_url"),
	actorNombre: varchar("actor_nombre", { length: 100 }),
	leida: boolean().default(false).notNull(),
	leidaAt: timestamp("leida_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_notificaciones_usuario_no_leidas").using("btree", table.usuarioId.asc().nullsLast(), table.leida.asc().nullsLast(), table.createdAt.desc().nullsFirst()).where(sql`(leida = false)`),
	index("idx_notificaciones_usuario_historial").using("btree", table.usuarioId.asc().nullsLast(), table.modo.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_notificaciones_negocio").using("btree", table.negocioId.asc().nullsLast(), table.createdAt.desc().nullsFirst()).where(sql`(negocio_id IS NOT NULL)`),
	index("idx_notificaciones_sucursal").using("btree", table.sucursalId.asc().nullsLast(), table.createdAt.desc().nullsFirst()).where(sql`(sucursal_id IS NOT NULL)`),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_notificaciones_usuario"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_notificaciones_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_notificaciones_sucursal"
	}).onDelete("cascade"),
	check("notificaciones_modo_check", sql`(modo)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("notificaciones_tipo_check", sql`(tipo)::text = ANY ((ARRAY['puntos_ganados'::character varying, 'voucher_generado'::character varying, 'voucher_cobrado'::character varying, 'nueva_oferta'::character varying, 'nueva_recompensa'::character varying, 'recompensa_desbloqueada'::character varying, 'cupon_asignado'::character varying, 'cupon_revocado'::character varying, 'nuevo_cliente'::character varying, 'voucher_pendiente'::character varying, 'stock_bajo'::character varying, 'nueva_resena'::character varying, 'sistema'::character varying, 'nuevo_marketplace'::character varying, 'nuevo_servicio'::character varying, 'alerta_seguridad'::character varying, 'marketplace_nuevo_mensaje'::character varying, 'marketplace_proxima_expirar'::character varying, 'marketplace_expirada'::character varying, 'marketplace_nueva_pregunta'::character varying, 'marketplace_pregunta_respondida'::character varying, 'servicios_nueva_pregunta'::character varying, 'servicios_pregunta_respondida'::character varying, 'pregunta_comunidad_respondida'::character varying, 'coyo_recomendacion'::character varying, 'pregunta_comunidad_seguida_respondida'::character varying, 'negocio_fuera_circulacion'::character varying, 'membresia_en_gracia'::character varying, 'marketplace_nuevo_comentario'::character varying, 'marketplace_respuesta_comentario'::character varying, 'servicios_nuevo_comentario'::character varying, 'servicios_respuesta_comentario'::character varying])::text[])`),
	check("notificaciones_referencia_tipo_check", sql`(referencia_tipo IS NULL OR (referencia_tipo)::text = ANY ((ARRAY['transaccion'::character varying, 'voucher'::character varying, 'oferta'::character varying, 'recompensa'::character varying, 'resena'::character varying, 'cupon'::character varying, 'marketplace'::character varying, 'servicio'::character varying, 'alerta'::character varying, 'pregunta_comunidad'::character varying])::text[]))`),
]);


// ============================================================================
// ChatYA - Tablas de Chat (agregar al final de schema.ts)
// Sprint 1 - Febrero 2026
// ============================================================================

export const chatConversaciones = pgTable("chat_conversaciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),

	// Participante 1
	participante1Id: uuid("participante1_id").notNull(),
	participante1Modo: varchar("participante1_modo", { length: 15 }).notNull(),
	participante1SucursalId: uuid("participante1_sucursal_id"),

	// Participante 2
	participante2Id: uuid("participante2_id").notNull(),
	participante2Modo: varchar("participante2_modo", { length: 15 }).notNull(),
	participante2SucursalId: uuid("participante2_sucursal_id"),

	// Contexto de origen
	contextoTipo: varchar("contexto_tipo", { length: 20 }).default('directo').notNull(),
	contextoReferenciaId: uuid("contexto_referencia_id"),

	// Referencia específica al artículo de MarketPlace (si aplica). Se usa
	// referencia perezosa porque `articulosMarketplace` se declara al final
	// del schema (mismo patrón que `usuarios.referidoPor`).
	articuloMarketplaceId: uuid("articulo_marketplace_id").references((): AnyPgColumn => articulosMarketplace.id, { onDelete: 'set null' }),

	// Referencia específica a la publicación de Servicios (si el chat arrancó
	// desde una publicación). Análogo a articuloMarketplaceId. Sprint 1 —
	// Servicios. La card de contexto se inserta en chatya.service en Sprint 3
	// (junto con la BarraContacto del detalle).
	servicioPublicacionId: uuid("servicio_publicacion_id").references((): AnyPgColumn => serviciosPublicaciones.id, { onDelete: 'set null' }),

	// Preview del último mensaje
	ultimoMensajeTexto: varchar("ultimo_mensaje_texto", { length: 100 }),
	ultimoMensajeFecha: timestamp("ultimo_mensaje_fecha", { withTimezone: true, mode: 'string' }),
	ultimoMensajeTipo: varchar("ultimo_mensaje_tipo", { length: 20 }),
	ultimoMensajeEstado: varchar("ultimo_mensaje_estado", { length: 20 }),
	ultimoMensajeEmisorId: uuid("ultimo_mensaje_emisor_id"),

	// Contadores no leídos
	noLeidosP1: integer("no_leidos_p1").default(0).notNull(),
	noLeidosP2: integer("no_leidos_p2").default(0).notNull(),

	// Acciones por participante
	fijadaPorP1: boolean("fijada_por_p1").default(false).notNull(),
	fijadaPorP2: boolean("fijada_por_p2").default(false).notNull(),
	archivadaPorP1: boolean("archivada_por_p1").default(false).notNull(),
	archivadaPorP2: boolean("archivada_por_p2").default(false).notNull(),
	silenciadaPorP1: boolean("silenciada_por_p1").default(false).notNull(),
	silenciadaPorP2: boolean("silenciada_por_p2").default(false).notNull(),
	eliminadaPorP1: boolean("eliminada_por_p1").default(false).notNull(),
	eliminadaPorP2: boolean("eliminada_por_p2").default(false).notNull(),

	// Timestamp de "mensajes visibles desde" (para ocultar mensajes anteriores al eliminar chat)
	mensajesVisiblesDesdeP1: timestamp("mensajes_visibles_desde_p1", { withTimezone: true, mode: 'string' }),
	mensajesVisiblesDesdeP2: timestamp("mensajes_visibles_desde_p2", { withTimezone: true, mode: 'string' }),

	// Timestamps
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_conv_participante1").using("btree", table.participante1Id.asc().nullsLast()),
	index("idx_chat_conv_participante2").using("btree", table.participante2Id.asc().nullsLast()),
	index("idx_chat_conv_updated").using("btree", table.updatedAt.desc().nullsFirst()),
	index("idx_chat_conv_p1_activas").using("btree", table.participante1Id.asc().nullsLast(), table.updatedAt.desc().nullsFirst()).where(sql`(eliminada_por_p1 = false)`),
	index("idx_chat_conv_p2_activas").using("btree", table.participante2Id.asc().nullsLast(), table.updatedAt.desc().nullsFirst()).where(sql`(eliminada_por_p2 = false)`),
	index("idx_chat_conv_articulo_marketplace").using("btree", table.articuloMarketplaceId.asc().nullsLast()).where(sql`(articulo_marketplace_id IS NOT NULL)`),
	index("idx_chat_conv_servicio_publicacion").using("btree", table.servicioPublicacionId.asc().nullsLast()).where(sql`(servicio_publicacion_id IS NOT NULL)`),
	foreignKey({
		columns: [table.participante1Id],
		foreignColumns: [usuarios.id],
		name: "fk_chat_conv_participante1"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.participante2Id],
		foreignColumns: [usuarios.id],
		name: "fk_chat_conv_participante2"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.participante1SucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_chat_conv_sucursal_p1"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.participante2SucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_chat_conv_sucursal_p2"
	}).onDelete("set null"),
	check("chat_conv_modo_p1_check", sql`(participante1_modo)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("chat_conv_modo_p2_check", sql`(participante2_modo)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("chat_conv_contexto_tipo_check", sql`(contexto_tipo)::text = ANY ((ARRAY['negocio'::character varying, 'marketplace'::character varying, 'oferta'::character varying, 'articulo_negocio'::character varying, 'servicio'::character varying, 'directo'::character varying, 'notas'::character varying])::text[])`),
	check("chat_conv_no_auto_chat", sql`participante1_id != participante2_id OR contexto_tipo = 'notas' OR (participante1_sucursal_id IS NOT NULL AND participante2_sucursal_id IS NOT NULL AND participante1_sucursal_id <> participante2_sucursal_id)`),
]);

export const chatMensajes = pgTable("chat_mensajes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversacionId: uuid("conversacion_id").notNull(),
	emisorId: uuid("emisor_id"),
	emisorModo: varchar("emisor_modo", { length: 15 }),
	emisorSucursalId: uuid("emisor_sucursal_id"),

	// Empleado ScanYA que respondió (tracking interno)
	empleadoId: uuid("empleado_id"),

	// Contenido
	tipo: varchar({ length: 20 }).default('texto').notNull(),
	contenido: text().notNull(),
	estado: varchar({ length: 15 }).default('enviado').notNull(),

	// Edición
	editado: boolean().default(false).notNull(),
	editadoAt: timestamp("editado_at", { withTimezone: true, mode: 'string' }),

	// Eliminación soft
	eliminado: boolean().default(false).notNull(),
	eliminadoAt: timestamp("eliminado_at", { withTimezone: true, mode: 'string' }),

	// Referencias a otros mensajes
	respuestaAId: uuid("respuesta_a_id").references((): AnyPgColumn => chatMensajes.id, { onDelete: 'set null' }),
	reenviadoDeId: uuid("reenviado_de_id").references((): AnyPgColumn => chatMensajes.id, { onDelete: 'set null' }),

	// Timestamps
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	entregadoAt: timestamp("entregado_at", { withTimezone: true, mode: 'string' }),
	leidoAt: timestamp("leido_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_chat_msg_conversacion").using("btree", table.conversacionId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_chat_msg_emisor").using("btree", table.emisorId.asc().nullsLast()).where(sql`(emisor_id IS NOT NULL)`),
	index("idx_chat_msg_empleado").using("btree", table.empleadoId.asc().nullsLast()).where(sql`(empleado_id IS NOT NULL)`),
	index("idx_chat_msg_no_eliminados").using("btree", table.conversacionId.asc().nullsLast(), table.createdAt.desc().nullsFirst()).where(sql`(eliminado = false)`),
	foreignKey({
		columns: [table.conversacionId],
		foreignColumns: [chatConversaciones.id],
		name: "fk_chat_msg_conversacion"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.emisorId],
		foreignColumns: [usuarios.id],
		name: "fk_chat_msg_emisor"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.emisorSucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_chat_msg_sucursal"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "fk_chat_msg_empleado"
	}).onDelete("set null"),
	check("chat_msg_modo_check", sql`(emisor_modo IS NULL OR (emisor_modo)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[]))`),
	check("chat_msg_tipo_check", sql`(tipo)::text = ANY ((ARRAY['texto'::character varying, 'imagen'::character varying, 'audio'::character varying, 'documento'::character varying, 'ubicacion'::character varying, 'contacto'::character varying, 'sistema'::character varying, 'cupon'::character varying])::text[])`),
	check("chat_msg_estado_check", sql`(estado)::text = ANY ((ARRAY['enviado'::character varying, 'entregado'::character varying, 'leido'::character varying])::text[])`),
]);

export const chatReacciones = pgTable("chat_reacciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	mensajeId: uuid("mensaje_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	sucursalId: uuid("sucursal_id"),
	emoji: varchar({ length: 10 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_reacciones_mensaje").using("btree", table.mensajeId.asc().nullsLast()),
	foreignKey({
		columns: [table.mensajeId],
		foreignColumns: [chatMensajes.id],
		name: "fk_chat_reacciones_mensaje"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_chat_reacciones_usuario"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_chat_reacciones_sucursal"
	}).onDelete("set null"),
	unique("chat_reacciones_unique").on(table.mensajeId, table.usuarioId, table.sucursalId, table.emoji).nullsNotDistinct(),
]);

export const chatMensajesFijados = pgTable("chat_mensajes_fijados", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversacionId: uuid("conversacion_id").notNull(),
	mensajeId: uuid("mensaje_id").notNull(),
	fijadoPor: uuid("fijado_por").notNull(),
	sucursalId: uuid("sucursal_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_msg_fijados_conv").using("btree", table.conversacionId.asc().nullsLast()),
	foreignKey({
		columns: [table.conversacionId],
		foreignColumns: [chatConversaciones.id],
		name: "fk_chat_msg_fijados_conv"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.mensajeId],
		foreignColumns: [chatMensajes.id],
		name: "fk_chat_msg_fijados_mensaje"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.fijadoPor],
		foreignColumns: [usuarios.id],
		name: "fk_chat_msg_fijados_usuario"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_chat_msg_fijados_sucursal"
	}).onDelete("set null"),
	unique("chat_msg_fijados_unique").on(table.conversacionId, table.mensajeId, table.fijadoPor, table.sucursalId).nullsNotDistinct(),
]);

export const chatContactos = pgTable("chat_contactos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	contactoId: uuid("contacto_id").notNull(),
	tipo: varchar({ length: 15 }).notNull(),
	negocioId: uuid("negocio_id"),
	sucursalId: uuid("sucursal_id"),
	alias: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_contactos_usuario").using("btree", table.usuarioId.asc().nullsLast(), table.tipo.asc().nullsLast()),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_chat_contactos_usuario"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.contactoId],
		foreignColumns: [usuarios.id],
		name: "fk_chat_contactos_contacto"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_chat_contactos_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_chat_contactos_sucursal"
	}).onDelete("cascade"),
	unique("chat_contactos_unique").on(table.usuarioId, table.contactoId, table.tipo, table.sucursalId),
	check("chat_contactos_tipo_check", sql`(tipo)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("chat_contactos_no_auto", sql`usuario_id != contacto_id`),
]);

export const chatBloqueados = pgTable("chat_bloqueados", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	// Bloqueo de persona: poblado solo cuando es persona ↔ persona.
	bloqueadoId: uuid("bloqueado_id"),
	// Bloqueo de sucursal/negocio: poblado solo cuando se bloquea un negocio.
	// Mutuamente excluyente con bloqueadoId — el constraint
	// `chat_bloqueados_uno_de_dos` exige exactamente uno de los dos.
	bloqueadaSucursalId: uuid("bloqueada_sucursal_id"),
	motivo: varchar({ length: 200 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_bloqueados_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_chat_bloqueados_sucursal").using("btree", table.bloqueadaSucursalId.asc().nullsLast()),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_chat_bloqueados_usuario"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.bloqueadoId],
		foreignColumns: [usuarios.id],
		name: "fk_chat_bloqueados_bloqueado"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.bloqueadaSucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_chat_bloqueados_sucursal"
	}).onDelete("cascade"),
	unique("chat_bloqueados_unique_usuario").on(table.usuarioId, table.bloqueadoId),
	unique("chat_bloqueados_unique_sucursal").on(table.usuarioId, table.bloqueadaSucursalId),
	check("chat_bloqueados_no_auto", sql`usuario_id != bloqueado_id`),
	check("chat_bloqueados_uno_de_dos", sql`(bloqueado_id IS NOT NULL AND bloqueada_sucursal_id IS NULL) OR (bloqueado_id IS NULL AND bloqueada_sucursal_id IS NOT NULL)`),
]);


// ============================================================================
// MarketPlace v1 — Compra-venta P2P de objetos físicos
// Sprint 1 — Mayo 2026
// Doc maestro: docs/arquitectura/MarketPlace.md
// Migración:   docs/migraciones/2026-05-03-marketplace-base.sql
// ============================================================================

/**
 * `ubicacion` y `ubicacion_aproximada` son `GEOGRAPHY(POINT, 4326)` en BD.
 * Drizzle no tiene tipo nativo geography — se declaran como `text()` y los
 * services las manipulan con SQL crudo (`ST_MakePoint`, `ST_Distance`, etc.).
 *
 * Reglas:
 * - `ubicacion` (real) NUNCA se devuelve al frontend.
 * - `ubicacion_aproximada` (aleatorizada dentro de 500m) es la única pública.
 * - `expira_at` se setea SOLO al crear (NOW() + 30 días). El UPDATE general
 *   no la modifica; solo el endpoint futuro de "Reactivar" (Sprint 7) la
 *   puede extender.
 */
export const articulosMarketplace = pgTable("articulos_marketplace", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: 'cascade' }),

	// Contenido
	titulo: varchar({ length: 80 }).notNull(),
	descripcion: text().notNull(),
	precio: numeric({ precision: 10, scale: 2 }).notNull(),
	// Condición y aceptaOfertas son opcionales: no aplican a productos
	// consumibles/comestibles, hechos a mano nuevos, etc. (mig. 2026-05-13).
	condicion: varchar({ length: 20 }),
	aceptaOfertas: boolean("acepta_ofertas").default(true),
	// Unidad de venta opcional (c/u, por kg, por docena, por litro, por
	// metro, por porción, o texto libre). Permite mostrar "$15 c/u" en lugar
	// de solo "$15" para productos vendidos por unidad/peso/etc.
	unidadVenta: varchar("unidad_venta", { length: 30 }),

	// Confirmaciones del checklist legal del wizard de publicar (Paso 3).
	// Snapshot inmutable de lo que aceptó el vendedor al publicar:
	//   { licito, enPoder, honesto, seguro, version, aceptadasAt }
	// Sirve como evidencia ante denuncias (artículo robado, falsificado, etc).
	// Solo se INSERTA al crear; al editar NO se modifica. NULL para artículos
	// legacy creados antes de 2026-05-13.
	confirmaciones: jsonb("confirmaciones"),

	// Fotos (JSONB array de URLs en R2; min 1, max 8 — validado en Zod)
	fotos: jsonb().default(sql`'[]'::jsonb`).notNull(),
	fotoPortadaIndex: smallint("foto_portada_index").default(0).notNull(),

	// Ubicación con privacidad (manejadas con SQL crudo en services)
	ubicacion: text().notNull(),
	ubicacionAproximada: text("ubicacion_aproximada").notNull(),
	// Ciudad: SOLO `ciudad_id` (FK al catálogo `ciudades`, migración 2026-06-19). La columna
	// texto `ciudad` se retiró (fase contract; DROP en 2026-06-19-marketplace-ciudad-drop.sql).
	// C2C sin sucursal: se resuelve del texto con resolverCiudadId. Las lecturas leen
	// `ciudades.nombre` vía esta FK.
	ciudadId: uuid("ciudad_id").references((): AnyPgColumn => ciudades.id, { onDelete: 'set null' }),
	zonaAproximada: varchar("zona_aproximada", { length: 150 }).notNull(),

	// Estado del ciclo de vida
	estado: varchar({ length: 20 }).default('activa').notNull(),

	// Métricas
	totalVistas: integer("total_vistas").default(0).notNull(),
	totalMensajes: integer("total_mensajes").default(0).notNull(),
	totalGuardados: integer("total_guardados").default(0).notNull(),

	// TTL — solo se setea al crear; cron del Sprint 7 lo usa para auto-pausar
	expiraAt: timestamp("expira_at", { withTimezone: true, mode: 'string' }).notNull(),

	// Timestamps
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	vendidaAt: timestamp("vendida_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_marketplace_estado").using("btree", table.estado.asc().nullsLast()),
	index("idx_articulos_mp_ciudad_id").using("btree", table.ciudadId.asc().nullsLast()).where(sql`ciudad_id IS NOT NULL`),
	index("idx_marketplace_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_marketplace_created").using("btree", table.createdAt.desc().nullsFirst()),
	index("idx_marketplace_expira").using("btree", table.expiraAt.asc().nullsLast()),
	// Índices GIST (ubicacion_aproximada) y GIN (FTS) viven solo en SQL —
	// Drizzle no soporta declarar GIST/GIN sobre columnas custom geography ni
	// sobre to_tsvector(). La migración SQL los crea y la BD los mantiene.
	check("articulos_marketplace_condicion_check", sql`condicion IS NULL OR (condicion)::text = ANY ((ARRAY['nuevo'::character varying, 'seminuevo'::character varying, 'usado'::character varying, 'para_reparar'::character varying])::text[])`),
	check("articulos_marketplace_estado_check", sql`(estado)::text = ANY ((ARRAY['activa'::character varying, 'pausada'::character varying, 'vendida'::character varying, 'eliminada'::character varying])::text[])`),
]);


/**
 * Log de búsquedas de MarketPlace (Sprint 6). Sirve para calcular populares
 * por ciudad. `usuario_id` se inserta siempre NULL en v1 por privacidad
 * (la columna queda nullable como opt-in retroactivo si v2 decide
 * personalización).
 */
export const marketplaceBusquedasLog = pgTable("marketplace_busquedas_log", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	ciudad: varchar({ length: 100 }).notNull(),
	termino: varchar({ length: 100 }).notNull(),
	usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: 'set null' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_busquedas_ciudad_fecha").using("btree", table.ciudad.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
]);

// ============================================================================
// MarketPlace — Comentarios con hilos de 1 nivel (reemplaza marketplace_preguntas)
// ============================================================================
// Modelo nuevo: comentarios públicos al instante. 1 fila = 1 mensaje.
// `parent_id` NULL = raíz; con valor = respuesta (1 nivel). Migración de datos:
// docs/migraciones/2026-06-29-marketplace-comentarios.sql.

export const marketplaceComentarios = pgTable("marketplace_comentarios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	articuloId: uuid("articulo_id").notNull().references(() => articulosMarketplace.id, { onDelete: 'cascade' }),
	autorId: uuid("autor_id").notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
	// Auto-FK: una respuesta apunta a su comentario raíz. AnyPgColumn rompe la
	// inferencia circular de tipos que TS no puede resolver solo.
	parentId: uuid("parent_id").references((): AnyPgColumn => marketplaceComentarios.id, { onDelete: 'cascade' }),
	texto: varchar({ length: 500 }).notNull(),
	editadoAt: timestamp("editado_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_mp_comentarios_articulo").using("btree", table.articuloId.asc().nullsLast()).where(sql`deleted_at IS NULL`),
	index("idx_mp_comentarios_parent").using("btree", table.parentId.asc().nullsLast()).where(sql`deleted_at IS NULL`),
]);

// ============================================================================
// SERVICIOS — Tablas base (Sprint 1, Mayo 2026)
// ============================================================================
// Sección pública /servicios. Discriminada por modo+tipo:
//   modo: 'ofrezco' | 'solicito'
//   tipo: 'servicio-persona' | 'vacante-empresa' | 'solicito'
//
// Ver:
//   - docs/migraciones/2026-05-15-servicios-base.sql
//   - docs/VISION_ESTRATEGICA_AnunciaYA.md §3.2
//   - design_handoff_servicios/README.md
//
// Estados: solo `activa | pausada | eliminada` (sin "vendida" — un servicio
// no se agota; si ya no se ofrece, se elimina). Decisión arquitectural.

export const serviciosPublicaciones = pgTable("servicios_publicaciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: 'cascade' }),

	// Sprint 8 — Sucursal a la que pertenece la vacante (solo aplica cuando
	// tipo='vacante-empresa'). NULL en publicaciones personales (servicio-persona
	// o solicito). ON DELETE SET NULL para que si se elimina la sucursal, la
	// vacante quede "huérfana" pero no se borre.
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'set null' }),

	// Discriminadores
	modo: varchar({ length: 20 }).notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	subtipo: varchar({ length: 30 }),

	// Contenido
	titulo: varchar({ length: 80 }).notNull(),
	descripcion: text().notNull(),
	fotos: jsonb().default(sql`'[]'::jsonb`).notNull(),
	fotoPortadaIndex: smallint("foto_portada_index").default(0).notNull(),

	// Precio (discriminated union JSONB por `kind`):
	//   { kind: 'fijo'|'hora'|'mensual', monto: number, moneda?: 'MXN' }
	//   { kind: 'rango', min: number, max: number, moneda?: 'MXN' }
	//   { kind: 'a-convenir' }
	// La validación profunda vive en Zod; el CHECK SQL solo verifica el kind.
	precio: jsonb().notNull(),

	modalidad: varchar({ length: 20 }).notNull(),

	// Ubicación — declarado como text porque Drizzle no soporta geography
	// nativamente. La BD usa geography(Point,4326); el service convierte con
	// ST_AsText/ST_GeomFromText en SQL crudo (mismo patrón que MarketPlace).
	// `ubicacion` (real) NUNCA se devuelve al frontend; `ubicacionAproximada`
	// es la coordenada con offset random uniforme en disco de 500m, fija al crear.
	ubicacion: text().notNull(),
	ubicacionAproximada: text("ubicacion_aproximada").notNull(),
	// Ciudad: SOLO `ciudad_id` (FK al catálogo `ciudades`, migración 2026-06-19). La columna
	// texto `ciudad` se retiró (fase contract; DROP en 2026-06-19-servicios-ciudad-drop.sql):
	// ya nadie la lee ni la escribe. vacante-empresa hereda el ciudad_id de su sucursal;
	// servicio-persona/solicito lo resuelve del texto del payload. Las lecturas leen
	// `ciudades.nombre` vía esta FK.
	ciudadId: uuid("ciudad_id").references((): AnyPgColumn => ciudades.id, { onDelete: 'set null' }),
	zonasAproximadas: varchar("zonas_aproximadas", { length: 150 }).array().notNull().default(sql`'{}'::varchar[]`),

	// Skills (solo servicio-persona, max 8 — validado por CHECK + Zod)
	skills: text().array().notNull().default(sql`'{}'::text[]`),

	// Campos exclusivos de vacante-empresa (NULL/vacío en otros tipos)
	requisitos: text().array().notNull().default(sql`'{}'::text[]`),
	horario: varchar({ length: 150 }),
	diasSemana: varchar("dias_semana", { length: 3 }).array().notNull().default(sql`'{}'::varchar[]`),

	// Sprint 8 — Tipo de empleo (solo vacantes). 4 valores fijos por CHECK:
	// 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual'.
	// NULL para publicaciones que no son vacantes.
	tipoEmpleo: varchar("tipo_empleo", { length: 20 }),

	// Sprint 8 — Lista de beneficios/prestaciones (Aguinaldo, Vales, Home office,
	// etc.). Max 8 elementos por CHECK; cada string hasta 100 chars (validado
	// por Zod). Solo se renderiza en la UI cuando tipo='vacante-empresa'.
	beneficios: text().array().notNull().default(sql`'{}'::text[]`),

	// Campo exclusivo de tipo='solicito': { min: number, max: number }
	presupuesto: jsonb(),

	// Categoría de clasificado — solo aplica a `modo='solicito'`. NULL en `ofrezco`.
	// Valores permitidos por CHECK: hogar, eventos, empleo, mudanzas, tutorias,
	// mascotas, otros. La UI mapea a labels con tildes ("Tutorías", "Mudanzas").
	categoria: varchar({ length: 20 }),

	// Marca un pedido como urgente — sube al top del widget Clasificados y
	// pinta eyebrow rojo en la fila. Aplica a cualquier modo en BD pero la UI
	// solo lo renderiza en clasificados (modo='solicito').
	urgente: boolean().default(false).notNull(),

	// Snapshot del checklist legal del wizard (Paso 4):
	//   { legal: bool, verdadera: bool, coordinacion: bool, version: string,
	//     aceptadasAt: ISO }
	// Evidencia inmutable ante denuncias. NULL para publicaciones legacy.
	confirmaciones: jsonb(),

	// Estado del ciclo de vida. Sin 'vendida'.
	estado: varchar({ length: 20 }).default('activa').notNull(),

	// Métricas
	totalVistas: integer("total_vistas").default(0).notNull(),
	totalMensajes: integer("total_mensajes").default(0).notNull(),
	totalGuardados: integer("total_guardados").default(0).notNull(),

	// TTL — solo se setea al crear; cron Sprint 7 lo usa para auto-pausar
	expiraAt: timestamp("expira_at", { withTimezone: true, mode: 'string' }).notNull(),

	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_servicios_pub_estado").using("btree", table.estado.asc().nullsLast()),
	index("idx_servicios_pub_ciudad_id").using("btree", table.ciudadId.asc().nullsLast()).where(sql`ciudad_id IS NOT NULL`),
	index("idx_servicios_pub_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_servicios_pub_created").using("btree", table.createdAt.desc().nullsFirst()),
	index("idx_servicios_pub_expira").using("btree", table.expiraAt.asc().nullsLast()),
	index("idx_servicios_pub_modo_tipo").using("btree", table.modo.asc().nullsLast(), table.tipo.asc().nullsLast()),
	// Índices GIST (ubicacion_aproximada) y GIN (FTS sobre titulo+descripcion)
	// viven SOLO en SQL — Drizzle no soporta declarar GIST sobre geography ni
	// GIN sobre to_tsvector(). La migración SQL los crea y la BD los mantiene.
	check("servicios_pub_modo_check", sql`(modo)::text = ANY ((ARRAY['ofrezco'::character varying, 'solicito'::character varying])::text[])`),
	check("servicios_pub_tipo_check", sql`(tipo)::text = ANY ((ARRAY['servicio-persona'::character varying, 'vacante-empresa'::character varying, 'solicito'::character varying])::text[])`),
	check("servicios_pub_subtipo_check", sql`subtipo IS NULL OR (subtipo)::text = ANY ((ARRAY['servicio-personal'::character varying, 'busco-empleo'::character varying, 'servicio-puntual'::character varying, 'vacante-empresa'::character varying])::text[])`),
	check("servicios_pub_modalidad_check", sql`(modalidad)::text = ANY ((ARRAY['presencial'::character varying, 'remoto'::character varying, 'hibrido'::character varying])::text[])`),
	check("servicios_pub_estado_check", sql`(estado)::text = ANY ((ARRAY['activa'::character varying, 'pausada'::character varying, 'cerrada'::character varying, 'eliminada'::character varying])::text[])`),
	check("servicios_pub_precio_kind_check", sql`(precio->>'kind') IN ('fijo', 'hora', 'rango', 'mensual', 'a-convenir')`),
	check("servicios_pub_fotos_array_check", sql`jsonb_typeof(fotos) = 'array'`),
	check("servicios_pub_skills_max_check", sql`array_length(skills, 1) IS NULL OR array_length(skills, 1) <= 8`),
	check("servicios_pub_presupuesto_solo_solicito_check", sql`presupuesto IS NULL OR tipo = 'solicito'`),
	check("servicios_pub_categoria_check", sql`categoria IS NULL OR (categoria)::text = ANY ((ARRAY['hogar'::character varying, 'cuidados'::character varying, 'eventos'::character varying, 'belleza-bienestar'::character varying, 'empleo'::character varying, 'otros'::character varying])::text[])`),
	check("servicios_pub_categoria_solo_solicito_check", sql`categoria IS NULL OR modo = 'solicito'`),
	// Sprint 8 — Vacantes
	check("servicios_pub_tipo_empleo_check", sql`tipo_empleo IS NULL OR (tipo_empleo)::text = ANY ((ARRAY['tiempo-completo'::character varying, 'medio-tiempo'::character varying, 'por-proyecto'::character varying, 'eventual'::character varying])::text[])`),
	check("servicios_pub_tipo_empleo_solo_vacante_check", sql`tipo_empleo IS NULL OR tipo = 'vacante-empresa'`),
	check("servicios_pub_beneficios_max_check", sql`array_length(beneficios, 1) IS NULL OR array_length(beneficios, 1) <= 8`),
	index("idx_servicios_pub_sucursal").using("btree", table.sucursalId.asc().nullsLast()).where(sql`sucursal_id IS NOT NULL`),
]);

// ============================================================================
// Servicios — Comentarios con hilos de 1 nivel (reemplaza servicios_preguntas)
// ============================================================================
// Espejo de marketplace_comentarios. Migración:
// docs/migraciones/2026-06-30-servicios-comentarios.sql.

export const serviciosComentarios = pgTable("servicios_comentarios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	publicacionId: uuid("publicacion_id").notNull().references(() => serviciosPublicaciones.id, { onDelete: 'cascade' }),
	autorId: uuid("autor_id").notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
	parentId: uuid("parent_id").references((): AnyPgColumn => serviciosComentarios.id, { onDelete: 'cascade' }),
	texto: varchar({ length: 500 }).notNull(),
	editadoAt: timestamp("editado_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_servicios_comentarios_publicacion").using("btree", table.publicacionId.asc().nullsLast()).where(sql`deleted_at IS NULL`),
	index("idx_servicios_comentarios_parent").using("btree", table.parentId.asc().nullsLast()).where(sql`deleted_at IS NULL`),
]);

// ============================================================================
// Servicios — Reseñas (rating 1..5 + texto corto) — endpoints en Sprint 5
// ============================================================================

export const serviciosResenas = pgTable("servicios_resenas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	publicacionId: uuid("publicacion_id").notNull().references(() => serviciosPublicaciones.id, { onDelete: 'cascade' }),
	autorId: uuid("autor_id").notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
	destinatarioId: uuid("destinatario_id").notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
	rating: smallint().notNull(),
	texto: varchar({ length: 200 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_servicios_res_destinatario").using("btree", table.destinatarioId.asc().nullsLast()).where(sql`deleted_at IS NULL`),
	index("idx_servicios_res_publicacion").using("btree", table.publicacionId.asc().nullsLast()).where(sql`deleted_at IS NULL`),
	unique("servicios_res_unique_autor_publicacion").on(table.publicacionId, table.autorId),
	check("servicios_res_rating_check", sql`rating BETWEEN 1 AND 5`),
	check("servicios_res_no_self_check", sql`autor_id <> destinatario_id`),
]);

// ============================================================================
// Servicios — Log de búsquedas (para populares en Sprint 6)
// ============================================================================

export const serviciosBusquedasLog = pgTable("servicios_busquedas_log", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	ciudad: varchar({ length: 100 }).notNull(),
	termino: varchar({ length: 100 }).notNull(),
	usuarioId: uuid("usuario_id").references(() => usuarios.id, { onDelete: 'set null' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_servicios_busq_ciudad_fecha").using("btree", table.ciudad.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
]);

// ============================================================================
// Home — "Pregúntale a [ciudad]" — Tabla base del feed conversacional
// Migración: docs/migraciones/2026-05-24-preguntas-comunidad.sql
//
// Cada fila es una pregunta del vecino para su ciudad. El feed se filtra por
// `ciudad` (texto plano del useGpsStore — no hay FK a `regiones`). El campo
// `estado` es el estado geográfico (Sonora, etc.), y `estadoPregunta` es el
// ciclo de vida de la pregunta (activa | cerrada | oculta) — nombres distintos
// para no confundir.
//
// MVP intencionalmente mínimo: solo el texto, autor y ubicación. Keywords,
// categoría y respuesta de IA vienen en sprints posteriores.
// ============================================================================
export const preguntasComunidad = pgTable("preguntas_comunidad", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	texto: varchar({ length: 500 }).notNull(),
	// Ciudad: SOLO `ciudad_id` (FK al catálogo `ciudades`, migración 2026-06-19). La columna
	// texto `ciudad` se retiró (contract; DROP en 2026-06-19-preguntas-comunidad-ciudad-drop.sql).
	// Las preguntas las hacen personas (sin sucursal): ciudad_id se resuelve del texto con
	// resolverCiudadId. Las lecturas leen `ciudades.nombre` vía esta FK.
	ciudadId: uuid("ciudad_id").references(() => ciudades.id, { onDelete: 'set null' }),
	estado: varchar({ length: 100 }).notNull(),
	estadoPregunta: varchar("estado_pregunta", { length: 20 }).default('activa').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	// Respuesta de Coyo (asíncrona, agregadas en 2026-05-24-coyo-respuesta-en-pregunta.sql)
	respuestaCoyo: text("respuesta_coyo"),
	resultadosCoyo: jsonb("resultados_coyo"),
	estadoCoyo: varchar("estado_coyo", { length: 20 }).default('pendiente').notNull(),
	coyoProcesadoAt: timestamp("coyo_procesado_at", { withTimezone: true, mode: 'string' }),
	// Marcada como resuelta por el autor (agregada en 2026-06-01-respuestas-interes-resuelta.sql).
	// `null` = no resuelta. La pregunta sigue siendo `estado_pregunta='activa'` (puede recibir
	// más respuestas), pero el frontend la trata distinto (ícono ✓, ordenada al final, etc.).
	resueltaAt: timestamp("resuelta_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_preguntas_comunidad_ciudad_id_fecha").using("btree", table.ciudadId.asc().nullsLast(), table.createdAt.desc().nullsFirst()).where(sql`ciudad_id IS NOT NULL`),
	index("idx_preguntas_comunidad_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	index("idx_preguntas_comunidad_coyo_pendientes").using("btree", table.estadoCoyo.asc().nullsLast(), table.createdAt.desc().nullsFirst()).where(sql`estado_coyo IN ('pendiente', 'procesando')`),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_preguntas_comunidad_usuario"
	}).onDelete("cascade"),
	check("preguntas_comunidad_estado_pregunta_check", sql`(estado_pregunta)::text = ANY ((ARRAY['activa'::character varying, 'cerrada'::character varying, 'oculta'::character varying])::text[])`),
	check("preguntas_comunidad_estado_coyo_check", sql`(estado_coyo)::text = ANY ((ARRAY['pendiente'::character varying, 'procesando'::character varying, 'listo'::character varying, 'sin_respuesta'::character varying, 'no_aplica'::character varying])::text[])`),
]);

// ============================================================================
// RESPUESTAS DE LA COMUNIDAD A PREGUNTAS DEL HOME (Sprint 1 — 2026-06-01)
// ============================================================================
//
// Cada fila es una respuesta de un vecino a una pregunta del Home. NO hay
// respuestas a respuestas (sin threads) — diseño deliberado para mantener el
// feed ordenado y evitar que se convierta en chat grupal.
//
// Migración: docs/migraciones/2026-06-01-respuestas-interes-resuelta.sql
// ============================================================================
export const respuestasPreguntasComunidad = pgTable("respuestas_preguntas_comunidad", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	preguntaId: uuid("pregunta_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	texto: varchar({ length: 1000 }).notNull(),
	// `activa` por default; `borrada` cuando el autor de la respuesta la elimine
	// (soft-delete para conservar orden cronológico).
	estado: varchar({ length: 20 }).default('activa').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	// Índice del feed por pregunta — más reciente primero, solo activas.
	index("idx_respuestas_pregunta_fecha")
		.using("btree", table.preguntaId.asc().nullsLast(), table.createdAt.desc().nullsFirst())
		.where(sql`estado = 'activa'`),
	// Para "mis respuestas" en el perfil del usuario.
	index("idx_respuestas_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	foreignKey({
		columns: [table.preguntaId],
		foreignColumns: [preguntasComunidad.id],
		name: "fk_respuestas_preguntas_comunidad_pregunta"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_respuestas_preguntas_comunidad_usuario"
	}).onDelete("cascade"),
	check("respuestas_preguntas_comunidad_estado_check",
		sql`(estado)::text = ANY ((ARRAY['activa'::character varying, 'borrada'::character varying])::text[])`),
	check("respuestas_preguntas_comunidad_texto_len",
		sql`length(trim(texto)) > 0 AND length(texto) <= 1000`),
]);

// ============================================================================
// "YO TAMBIÉN QUIERO SABER" — interesados en una pregunta (Sprint 1 — 2026-06-01)
// ============================================================================
//
// Cada fila es un vecino sumándose a una pregunta existente sin republicarla.
// La PRIMARY KEY compuesta `(pregunta_id, usuario_id)` garantiza idempotencia:
// un mismo usuario no puede sumarse dos veces a la misma pregunta. Toggle
// natural: insertar o borrar.
//
// Migración: docs/migraciones/2026-06-01-respuestas-interes-resuelta.sql
// ============================================================================
export const preguntasInteresados = pgTable("preguntas_interesados", {
	preguntaId: uuid("pregunta_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	// Para "qué preguntas me interesan" desde el perfil del usuario.
	index("idx_interesados_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	primaryKey({
		columns: [table.preguntaId, table.usuarioId],
		name: "preguntas_interesados_pk"
	}),
	foreignKey({
		columns: [table.preguntaId],
		foreignColumns: [preguntasComunidad.id],
		name: "fk_preguntas_interesados_pregunta"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_preguntas_interesados_usuario"
	}).onDelete("cascade"),
]);