
import { pgTable, check, integer, varchar, type AnyPgColumn, index, uniqueIndex, foreignKey, unique, uuid, boolean, smallint, timestamp, numeric, text, date, serial, time, jsonb, bigserial, bigint } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const regiones = pgTable("regiones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	estado: varchar({ length: 100 }).notNull(),
	pais: varchar({ length: 100 }).default('México').notNull(),
	activa: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_regiones_activa").using("btree", table.activa.asc().nullsLast()).where(sql`(activa = true)`),
	index("idx_regiones_estado").using("btree", table.estado.asc().nullsLast()),
	unique("regiones_nombre_estado_unique").on(table.nombre, table.estado),
]);

export const embajadores = pgTable("embajadores", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull().references((): AnyPgColumn => usuarios.id, { onDelete: 'cascade' }),
	regionId: uuid("region_id").notNull(),
	codigoReferido: varchar("codigo_referido", { length: 50 }).notNull(),
	porcentajePrimerPago: numeric("porcentaje_primer_pago", { precision: 5, scale: 2 }).default('30.00').notNull(),
	porcentajeRecurrente: numeric("porcentaje_recurrente", { precision: 5, scale: 2 }).default('15.00').notNull(),
	negociosRegistrados: integer("negocios_registrados").default(0).notNull(),
	estado: varchar({ length: 20 }).default('activo').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_embajadores_codigo").using("btree", table.codigoReferido.asc().nullsLast()),
	index("idx_embajadores_estado").using("btree", table.estado.asc().nullsLast()).where(sql`((estado)::text = 'activo'::text)`),
	index("idx_embajadores_region").using("btree", table.regionId.asc().nullsLast()),
	uniqueIndex("idx_embajadores_usuario").using("btree", table.usuarioId.asc().nullsLast()),
	foreignKey({
		columns: [table.regionId],
		foreignColumns: [regiones.id],
		name: "fk_embajadores_region"
	}).onDelete("restrict"),
	unique("embajadores_codigo_referido_key").on(table.codigoReferido),
	check("embajadores_estado_check", sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])`),
	check("embajadores_negocios_check", sql`negocios_registrados >= 0`),
	check("embajadores_porcentaje_primer_check", sql`(porcentaje_primer_pago >= (0)::numeric) AND (porcentaje_primer_pago <= (100)::numeric)`),
	check("embajadores_porcentaje_recurrente_check", sql`(porcentaje_recurrente >= (0)::numeric) AND (porcentaje_recurrente <= (100)::numeric)`),
]);

export const usuarios = pgTable("usuarios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	apellidos: varchar({ length: 100 }).notNull(),
	correo: varchar({ length: 255 }).notNull(),
	alias: varchar({ length: 35 }),
	contrasenaHash: varchar("contrasena_hash", { length: 255 }),
	autenticadoPorGoogle: boolean("autenticado_por_google").default(false),
	autenticadoPorFacebook: boolean("autenticado_por_facebook").default(false),
	dobleFactorSecreto: varchar("doble_factor_secreto", { length: 64 }),
	dobleFactorHabilitado: boolean("doble_factor_habilitado").default(false),
	dobleFactorConfirmado: boolean("doble_factor_confirmado").default(false),
	telefono: varchar({ length: 20 }),
	ciudad: varchar({ length: 100 }),
	perfil: varchar({ length: 20 }).default('personal').notNull(),
	membresia: smallint().default(1).notNull(),
	correoVerificado: boolean("correo_verificado").default(false),
	correoVerificadoAt: timestamp("correo_verificado_at", { withTimezone: true, mode: 'string' }),
	telefonoVerificado: boolean("telefono_verificado").default(false),
	codigoVerificacion: varchar("codigo_verificacion", { length: 10 }),
	estado: varchar({ length: 15 }).default('activo').notNull(),
	fechaCambioEstado: timestamp("fecha_cambio_estado", { withTimezone: true, mode: 'string' }).defaultNow(),
	motivoCambioEstado: varchar("motivo_cambio_estado", { length: 500 }),
	fechaReactivacion: timestamp("fecha_reactivacion", { withTimezone: true, mode: 'string' }),
	intentosFallidos: smallint("intentos_fallidos").default(0),
	bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true, mode: 'string' }),
	calificacionPromedio: numeric("calificacion_promedio", { precision: 2, scale: 1 }).default('0'),
	totalCalificaciones: integer("total_calificaciones").default(0),
	avatarUrl: text("avatar_url"),
	avatarPublicId: varchar("avatar_public_id", { length: 100 }),
	avatarThumbPublicId: varchar("avatar_thumb_public_id", { length: 100 }),
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
	uniqueIndex("usuarios_alias_unique").using("btree", table.alias.asc().nullsLast()).where(sql`(alias IS NOT NULL)`),
	unique("usuarios_correo_unique").on(table.correo),
	check("usuarios_estado_check", sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])`),
	check("usuarios_genero_check", sql`(genero)::text = ANY ((ARRAY['masculino'::character varying, 'femenino'::character varying, 'otro'::character varying, 'no_especificado'::character varying])::text[])`),
	check("usuarios_membresia_check", sql`membresia = ANY (ARRAY[1, 2, 3])`),
	check("usuarios_perfil_check", sql`(perfil)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("usuarios_modo_activo_check", sql`(modo_activo)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("usuarios_modo_comercial_logico_check", sql`((modo_activo)::text = 'comercial'::text AND tiene_modo_comercial = true) OR (modo_activo)::text = 'personal'::text`),
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
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	mesesGratisRestantes: integer("meses_gratis_restantes").default(0).notNull(),
	embajadorId: uuid("embajador_id"),
	regionId: uuid("region_id"),
	onboardingCompletado: boolean("onboarding_completado").default(false).notNull(),
	participaPuntos: boolean('participa_puntos').default(true).notNull(),
	fechaPrimerPago: date("fecha_primer_pago"),
}, (table) => [
	index("idx_negocios_activo").using("btree", table.activo.asc().nullsLast()),
	index("idx_negocios_embajador").using("btree", table.embajadorId.asc().nullsLast()).where(sql`(embajador_id IS NOT NULL)`),
	index("idx_negocios_es_borrador").using("btree", table.esBorrador.asc().nullsLast()),
	index("idx_negocios_fecha_primer_pago").using("btree", table.fechaPrimerPago.asc().nullsLast()).where(sql`(fecha_primer_pago IS NOT NULL)`),
	index("idx_negocios_meses_gratis").using("btree", table.mesesGratisRestantes.asc().nullsLast()).where(sql`(meses_gratis_restantes > 0)`),
	index("idx_negocios_onboarding").using("btree", table.onboardingCompletado.asc().nullsLast()).where(sql`(onboarding_completado = false)`),
	index("idx_negocios_region").using("btree", table.regionId.asc().nullsLast()).where(sql`(region_id IS NOT NULL)`),
	index("idx_negocios_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	foreignKey({
		columns: [table.embajadorId],
		foreignColumns: [embajadores.id],
		name: "fk_negocios_embajador"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.regionId],
		foreignColumns: [regiones.id],
		name: "fk_negocios_region"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "negocios_usuario_id_fkey"
	}).onDelete("cascade"),
]);

export const negocioSucursales = pgTable("negocio_sucursales", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid('negocio_id').notNull().references(() => negocios.id, { onDelete: 'cascade' }),
	nombre: varchar({ length: 100 }).notNull(),
	esPrincipal: boolean('es_principal').default(false).notNull(),
	direccion: varchar({ length: 250 }),
	ciudad: varchar({ length: 120 }).notNull(),
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

export const negocioModulos = pgTable("negocio_modulos", {
	negocioId: uuid("negocio_id").primaryKey().notNull(),
	catalogoActivo: boolean("catalogo_activo").default(true),
	pedidosOnlineActivo: boolean("pedidos_online_activo").default(false),
	citasActivo: boolean("citas_activo").default(false),
	reservacionesActivo: boolean("reservaciones_activo").default(false),
	apartadosActivo: boolean("apartados_activo").default(false),
	empleadosActivo: boolean("empleados_activo").default(false),
}, (table) => [
	index("idx_negocio_modulos_citas").using("btree", table.citasActivo.asc().nullsLast()),
	index("idx_negocio_modulos_pedidos").using("btree", table.pedidosOnlineActivo.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "negocio_modulos_negocio_id_fkey"
	}).onDelete("cascade"),
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

export const negocioCitasConfig = pgTable("negocio_citas_config", {
	negocioId: uuid("negocio_id").primaryKey().notNull(),
	duracionDefaultMinutos: integer("duracion_default_minutos").default(30),
	diasAnticipacionMaxima: integer("dias_anticipacion_maxima").default(7),
	horasMinimasCancelacion: integer("horas_minimas_cancelacion").default(2),
	confirmarAutomaticamente: boolean("confirmar_automaticamente").default(false),
	diasDisponibles: jsonb("dias_disponibles"),
}, (table) => [
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "negocio_citas_config_negocio_id_fkey"
	}).onDelete("cascade"),
]);

export const negocioCitasFechasEspecificas = pgTable("negocio_citas_fechas_especificas", {
	id: serial().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	fecha: date().notNull(),
	activo: boolean().default(true),
	horaInicio: time("hora_inicio"),
	horaFin: time("hora_fin"),
}, (table) => [
	index("idx_negocio_citas_fechas_fecha").using("btree", table.fecha.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "negocio_citas_fechas_especificas_negocio_id_fkey"
	}).onDelete("cascade"),
	unique("negocio_citas_fechas_unique").on(table.negocioId, table.fecha),
]);

export const negocioGaleria = pgTable("negocio_galeria", {
	id: serial().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	url: text().notNull(),
	cloudinaryPublicId: varchar("cloudinary_public_id", { length: 200 }),
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

export const negocioPreferencias = pgTable("negocio_preferencias", {
	negocioId: uuid("negocio_id").primaryKey().notNull(),
	permiteMensajes: boolean("permite_mensajes").default(true),
	mostrarEnMapa: boolean("mostrar_en_mapa").default(true),
	respuestaAutomaticaActiva: boolean("respuesta_automatica_activa").default(false),
	mensajeRespuestaAutomatica: text("mensaje_respuesta_automatica"),
	notificarPedidos: boolean("notificar_pedidos").default(true),
	notificarMensajes: boolean("notificar_mensajes").default(true),
	notificarCitas: boolean("notificar_citas").default(true),
}, (table) => [
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "negocio_preferencias_negocio_id_fkey"
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

export const articuloInventario = pgTable("articulo_inventario", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	articuloId: uuid("articulo_id").notNull(),
	stock: integer().default(0),
	stockMinimo: integer("stock_minimo").default(0),
	permiteVentaSinStock: boolean("permite_venta_sin_stock").default(false),
	stockBajo: boolean("stock_bajo").default(false),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
		columns: [table.articuloId],
		foreignColumns: [articulos.id],
		name: "articulo_inventario_articulo_id_fkey"
	}).onDelete("cascade"),
	unique("articulo_inventario_articulo_id_key").on(table.articuloId),
	check("articulo_inventario_stock_check", sql`stock >= 0`),
]);

export const articuloVariantes = pgTable("articulo_variantes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	articuloId: uuid("articulo_id").notNull(),
	nombre: varchar({ length: 50 }).notNull(),
	requerido: boolean().default(false),
	seleccionMultiple: boolean("seleccion_multiple").default(false),
	minSelecciones: integer("min_selecciones").default(0),
	maxSelecciones: integer("max_selecciones"),
	orden: integer().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_articulo_variantes_articulo_id").using("btree", table.articuloId.asc().nullsLast()),
	foreignKey({
		columns: [table.articuloId],
		foreignColumns: [articulos.id],
		name: "articulo_variantes_articulo_id_fkey"
	}).onDelete("cascade"),
]);

export const articuloVarianteOpciones = pgTable("articulo_variante_opciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	varianteId: uuid("variante_id").notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	precioAjuste: numeric("precio_ajuste", { precision: 10, scale: 2 }).default('0'),
	disponible: boolean().default(true),
	orden: integer().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_articulo_variante_opciones_variante_id").using("btree", table.varianteId.asc().nullsLast()),
	foreignKey({
		columns: [table.varianteId],
		foreignColumns: [articuloVariantes.id],
		name: "articulo_variante_opciones_variante_id_fkey"
	}).onDelete("cascade"),
]);

export const citas = pgTable("citas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	servicioId: uuid("servicio_id").notNull(),
	clienteId: uuid("cliente_id").notNull(),
	empleadoId: uuid("empleado_id"),
	fecha: date().notNull(),
	horaInicio: time("hora_inicio").notNull(),
	horaFin: time("hora_fin"),
	duracion: integer(),
	horaFinReal: timestamp("hora_fin_real", { withTimezone: true, mode: 'string' }),
	terminadaManualmente: boolean("terminada_manualmente").default(false),
	creadaPor: varchar("creada_por", { length: 20 }).default('cliente'),
	estado: varchar({ length: 20 }).default('pendiente'),
	nombreCliente: varchar("nombre_cliente", { length: 200 }).notNull(),
	telefonoCliente: varchar("telefono_cliente", { length: 20 }).notNull(),
	correoCliente: varchar("correo_cliente", { length: 150 }),
	precioServicio: numeric("precio_servicio", { precision: 10, scale: 2 }).notNull(),
	notasCliente: text("notas_cliente"),
	notasNegocio: text("notas_negocio"),
	recordatorioEnviado: boolean("recordatorio_enviado").default(false),
	recordatorioEnviadoFecha: timestamp("recordatorio_enviado_fecha", { withTimezone: true, mode: 'string' }),
	canceladaPor: varchar("cancelada_por", { length: 20 }),
	motivoCancelacion: text("motivo_cancelacion"),
	fechaCancelacion: timestamp("fecha_cancelacion", { withTimezone: true, mode: 'string' }),
	confirmadaPorNegocio: boolean("confirmada_por_negocio").default(false),
	fechaConfirmacion: timestamp("fecha_confirmacion", { withTimezone: true, mode: 'string' }),
	codigoConfirmacion: varchar("codigo_confirmacion", { length: 10 }),
	origenReserva: varchar("origen_reserva", { length: 20 }).default('app'),
	esBloqueoHorario: boolean("es_bloqueo_horario").default(false),
	calificacion: smallint(),
	resena: text(),
	fechaCalificacion: timestamp("fecha_calificacion", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_citas_cliente_id").using("btree", table.clienteId.asc().nullsLast()),
	index("idx_citas_empleado_id").using("btree", table.empleadoId.asc().nullsLast()),
	index("idx_citas_estado").using("btree", table.estado.asc().nullsLast()),
	index("idx_citas_fecha").using("btree", table.fecha.asc().nullsLast()),
	index("idx_citas_negocio_id").using("btree", table.negocioId.asc().nullsLast()),
	foreignKey({
		columns: [table.clienteId],
		foreignColumns: [usuarios.id],
		name: "citas_cliente_id_fkey"
	}),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "citas_empleado_id_fkey"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "citas_negocio_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.servicioId],
		foreignColumns: [articulos.id],
		name: "citas_servicio_id_fkey"
	}),
	unique("citas_codigo_confirmacion_key").on(table.codigoConfirmacion),
	check("citas_calificacion_check", sql`(calificacion IS NULL) OR ((calificacion >= 1) AND (calificacion <= 5))`),
	check("citas_cancelada_por_check", sql`(cancelada_por IS NULL) OR ((cancelada_por)::text = ANY ((ARRAY['cliente'::character varying, 'negocio'::character varying, 'sistema'::character varying])::text[]))`),
	check("citas_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmada'::character varying, 'en_proceso'::character varying, 'completada'::character varying, 'cancelada'::character varying, 'no_asistio'::character varying])::text[])`),
	check("citas_hora_fin_check", sql`(hora_fin IS NOT NULL) OR ((creada_por)::text = 'negocio'::text)`),
	check("citas_origen_check", sql`(origen_reserva)::text = ANY ((ARRAY['web'::character varying, 'app'::character varying, 'telefono'::character varying, 'presencial'::character varying])::text[])`),
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

export const direccionesUsuario = pgTable("direcciones_usuario", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	etiqueta: varchar({ length: 50 }).notNull(),
	esPredeterminada: boolean("es_predeterminada").default(false),
	calle: varchar({ length: 200 }).notNull(),
	numeroExterior: varchar("numero_exterior", { length: 20 }).notNull(),
	numeroInterior: varchar("numero_interior", { length: 20 }),
	colonia: varchar({ length: 100 }).notNull(),
	ciudad: varchar({ length: 100 }).notNull(),
	estado: varchar({ length: 50 }).notNull(),
	codigoPostal: varchar("codigo_postal", { length: 10 }).notNull(),
	referencias: text(),
	nombreReceptor: varchar("nombre_receptor", { length: 100 }),
	telefonoReceptor: varchar("telefono_receptor", { length: 20 }),
	latitud: numeric({ precision: 10, scale: 8 }),
	longitud: numeric({ precision: 11, scale: 8 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_direcciones_usuario_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "direcciones_usuario_usuario_id_fkey"
	}).onDelete("cascade"),
]);

export const pedidoArticulos = pgTable("pedido_articulos", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	pedidoId: uuid("pedido_id").notNull(),
	nombre: varchar({ length: 200 }).notNull(),
	descripcion: text(),
	imagenUrl: text("imagen_url"),
	sku: varchar({ length: 50 }),
	precioUnitario: numeric("precio_unitario", { precision: 10, scale: 2 }).notNull(),
	cantidad: integer().default(1).notNull(),
	subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
	modificadores: jsonb().default([]),
	notas: text(),
}, (table) => [
	index("idx_pedido_articulos_pedido_id").using("btree", table.pedidoId.asc().nullsLast()),
	foreignKey({
		columns: [table.pedidoId],
		foreignColumns: [pedidos.id],
		name: "pedido_articulos_pedido_id_fkey"
	}).onDelete("cascade"),
]);

export const carrito = pgTable("carrito", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	tipoSeccion: varchar("tipo_seccion", { length: 20 }).default('marketplace').notNull(),
	tipoVendedor: varchar("tipo_vendedor", { length: 10 }).default('comercial').notNull(),
	vendedorId: uuid("vendedor_id").default(sql`'00000000-0000-0000-0000-000000000000'`).notNull(),
}, (table) => [
	index("idx_carrito_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "carrito_usuario_id_fkey"
	}).onDelete("cascade"),
	unique("carrito_usuario_vendedor_unique").on(table.usuarioId, table.tipoVendedor, table.vendedorId),
	check("carrito_tipo_seccion_check", sql`(tipo_seccion)::text = ANY ((ARRAY['marketplace'::character varying, 'negocios_locales'::character varying, 'promociones'::character varying, 'rifas'::character varying, 'subastas'::character varying, 'turismo'::character varying])::text[])`),
	check("carrito_tipo_vendedor_check", sql`(tipo_vendedor)::text = ANY ((ARRAY['comercial'::character varying, 'personal'::character varying])::text[])`),
]);

export const pedidos = pgTable("pedidos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	numeroPedido: varchar("numero_pedido", { length: 20 }).notNull(),
	sucursalId: uuid("sucursal_id").notNull().references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	negocioId: uuid("negocio_id").notNull().references((): AnyPgColumn => negocios.id, { onDelete: 'cascade' }),
	compradorId: uuid("comprador_id").notNull(),
	estado: varchar({ length: 20 }).default('pendiente'),
	motivoCancelacion: text("motivo_cancelacion"),
	canceladoPor: varchar("cancelado_por", { length: 20 }),
	tipoEntrega: varchar("tipo_entrega", { length: 20 }).notNull(),
	direccionEntrega: jsonb("direccion_entrega"),
	metodoPago: varchar("metodo_pago", { length: 30 }).notNull(),
	estadoPago: varchar("estado_pago", { length: 20 }).default('pendiente'),
	subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
	descuento: numeric({ precision: 10, scale: 2 }).default('0'),
	costoEnvio: numeric("costo_envio", { precision: 10, scale: 2 }).default('0'),
	total: numeric({ precision: 10, scale: 2 }).notNull(),
	cuponId: uuid("cupon_id"),
	codigoCuponUsado: varchar("codigo_cupon_usado", { length: 50 }),
	notasComprador: text("notas_comprador"),
	notasVendedor: text("notas_vendedor"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	confirmadoAt: timestamp("confirmado_at", { withTimezone: true, mode: 'string' }),
	entregadoAt: timestamp("entregado_at", { withTimezone: true, mode: 'string' }),
	referenciaPago: varchar("referencia_pago", { length: 100 }),
}, (table) => [
	index("idx_pedidos_comprador_estado").using("btree", table.compradorId.asc().nullsLast(), table.estado.asc().nullsLast()),
	index("idx_pedidos_sucursal").using("btree", table.sucursalId.asc().nullsLast(), table.estado.asc().nullsLast()),
	index("idx_pedidos_negocio").using("btree", table.negocioId.asc().nullsLast(), table.estado.asc().nullsLast()),
	foreignKey({
		columns: [table.cuponId],
		foreignColumns: [cupones.id],
		name: "fk_pedidos_cupon"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.compradorId],
		foreignColumns: [usuarios.id],
		name: "pedidos_comprador_id_fkey"
	}).onDelete("restrict"),
	unique("pedidos_numero_pedido_key").on(table.numeroPedido),
	check("pedidos_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'en_preparacion'::character varying, 'en_camino'::character varying, 'entregado'::character varying, 'cancelado'::character varying])::text[])`),
	check("pedidos_metodo_pago_check", sql`(metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'tarjeta'::character varying, 'transferencia'::character varying])::text[])`),
	check("pedidos_tipo_entrega_check", sql`(tipo_entrega)::text = ANY ((ARRAY['recoger_tienda'::character varying, 'envio_domicilio'::character varying])::text[])`),
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
]);

export const cuponGaleria = pgTable("cupon_galeria", {
	id: serial().primaryKey().notNull(),
	cuponId: uuid("cupon_id").notNull(),
	url: text().notNull(),
	publicId: varchar("public_id", { length: 100 }),
	thumbUrl: text("thumb_url"),
	orden: smallint().default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	esLogo: boolean("es_logo").default(false),
}, (table) => [
	index("idx_cupon_galeria_cupon_id").using("btree", table.cuponId.asc().nullsLast()),
	foreignKey({
		columns: [table.cuponId],
		foreignColumns: [cupones.id],
		name: "cupon_galeria_cupon_id_fkey"
	}).onDelete("cascade"),
]);

export const cuponUsos = pgTable("cupon_usos", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	cuponId: uuid("cupon_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	estado: varchar({ length: 20 }).default('asignado'),
	codigoGenerado: varchar("codigo_generado", { length: 50 }),
	metodoCanje: varchar("metodo_canje", { length: 20 }),
	montoCompra: numeric("monto_compra", { precision: 10, scale: 2 }),
	descuentoAplicado: numeric("descuento_aplicado", { precision: 10, scale: 2 }),
	pedidoId: uuid("pedido_id"),
	notas: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	usadoAt: timestamp("usado_at", { withTimezone: true, mode: 'string' }),
	// Campos nuevos para ScanYA
	empleadoId: uuid("empleado_id"),
	sucursalId: uuid("sucursal_id"),
}, (table) => [
	index("idx_cupon_usos_created_at").using("btree", table.createdAt.asc().nullsLast()),
	index("idx_cupon_usos_cupon_usuario").using("btree", table.cuponId.asc().nullsLast(), table.usuarioId.asc().nullsLast()),
	index("idx_cupon_usos_usado_at").using("btree", table.usadoAt.asc().nullsLast()),
	index("idx_cupon_usos_usuario_estado").using("btree", table.usuarioId.asc().nullsLast(), table.estado.asc().nullsLast()),
	index("idx_cupon_usos_sucursal").using("btree", table.sucursalId.asc().nullsLast()),
	index("idx_cupon_usos_empleado").using("btree", table.empleadoId.asc().nullsLast()),
	foreignKey({
		columns: [table.cuponId],
		foreignColumns: [cupones.id],
		name: "cupon_usos_cupon_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "cupon_usos_usuario_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.empleadoId],
		foreignColumns: [empleados.id],
		name: "fk_cupon_usos_empleado"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.sucursalId],
		foreignColumns: [negocioSucursales.id],
		name: "fk_cupon_usos_sucursal"
	}).onDelete("set null"),
	unique("cupon_usos_codigo_generado_key").on(table.codigoGenerado),
	check("cupon_usos_estado_check", sql`(estado)::text = ANY ((ARRAY['asignado'::character varying, 'usado'::character varying, 'expirado'::character varying])::text[])`),
	check("cupon_usos_metodo_check", sql`(metodo_canje IS NULL) OR ((metodo_canje)::text = ANY ((ARRAY['qr_presencial'::character varying, 'codigo_online'::character varying, 'carrito'::character varying])::text[]))`),
]);

export const cuponUsuarios = pgTable("cupon_usuarios", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	cuponId: uuid("cupon_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	motivo: varchar({ length: 200 }),
	asignadoAt: timestamp("asignado_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_cupon_usuarios_cupon_id").using("btree", table.cuponId.asc().nullsLast()),
	index("idx_cupon_usuarios_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	foreignKey({
		columns: [table.cuponId],
		foreignColumns: [cupones.id],
		name: "cupon_usuarios_cupon_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "cupon_usuarios_usuario_id_fkey"
	}).onDelete("cascade"),
	unique("cupon_usuarios_unique").on(table.cuponId, table.usuarioId),
]);

export const cupones = pgTable("cupones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	codigo: varchar({ length: 50 }).notNull(),
	titulo: varchar({ length: 150 }).notNull(),
	descripcion: varchar({ length: 200 }),
	tipo: varchar({ length: 20 }).notNull(),
	valor: numeric({ precision: 10, scale: 2 }),
	compraMinima: numeric("compra_minima", { precision: 10, scale: 2 }).default('0'),
	fechaInicio: timestamp("fecha_inicio", { withTimezone: true, mode: 'string' }).notNull(),
	fechaExpiracion: timestamp("fecha_expiracion", { withTimezone: true, mode: 'string' }).notNull(),
	limiteUsosTotal: integer("limite_usos_total"),
	limiteUsosPorUsuario: integer("limite_usos_por_usuario").default(1),
	usosActuales: integer("usos_actuales").default(0),
	estado: varchar({ length: 20 }).default('borrador'),
	activo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	visibilidad: varchar({ length: 15 }).default('publico'),
}, (table) => [
	index("idx_cupones_activo").using("btree", table.activo.asc().nullsLast()),
	index("idx_cupones_negocio_id").using("btree", table.negocioId.asc().nullsLast()),
	index("idx_cupones_sucursal_id").using("btree", table.sucursalId.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "cupones_negocio_id_fkey"
	}).onDelete("cascade"),
	unique("cupones_codigo_key").on(table.codigo),
	check("cupones_estado_check", sql`(estado)::text = ANY ((ARRAY['borrador'::character varying, 'publicado'::character varying, 'pausado'::character varying, 'archivado'::character varying])::text[])`),
	check("cupones_tipo_check", sql`(tipo)::text = ANY ((ARRAY['porcentaje'::character varying, 'monto_fijo'::character varying, '2x1'::character varying, '3x2'::character varying, 'envio_gratis'::character varying, 'otro'::character varying])::text[])`),
	check("cupones_visibilidad_check", sql`(visibilidad)::text = ANY ((ARRAY['publico'::character varying, 'privado'::character varying])::text[])`),
]);

export const marketplace = pgTable("marketplace", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	autorId: uuid("autor_id").notNull(),
	negocioId: uuid("negocio_id"),
	categoriaId: uuid("categoria_id").notNull(),
	titulo: varchar({ length: 200 }).notNull(),
	descripcion: text(),
	precio: numeric({ precision: 10, scale: 2 }).notNull(),
	condicion: varchar({ length: 20 }),
	imagenes: jsonb(),
	ciudad: varchar({ length: 100 }),
	estado: varchar({ length: 20 }).default('activo'),
	fechaExpiracion: timestamp("fecha_expiracion", { withTimezone: true, mode: 'string' }),
	calificacionPromedio: numeric("calificacion_promedio", { precision: 2, scale: 1 }).default('0'),
	totalCalificaciones: integer("total_calificaciones").default(0),
	totalLikes: integer("total_likes").default(0),
	totalVisitas: integer("total_visitas").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_marketplace_autor_id").using("btree", table.autorId.asc().nullsLast()),
	index("idx_marketplace_categoria_id").using("btree", table.categoriaId.asc().nullsLast()),
	index("idx_marketplace_ciudad").using("btree", table.ciudad.asc().nullsLast()),
	index("idx_marketplace_estado").using("btree", table.estado.asc().nullsLast()),
	foreignKey({
		columns: [table.autorId],
		foreignColumns: [usuarios.id],
		name: "marketplace_autor_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.categoriaId],
		foreignColumns: [categoriasMarketplace.id],
		name: "marketplace_categoria_id_fkey"
	}),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "marketplace_negocio_id_fkey"
	}).onDelete("cascade"),
	check("marketplace_condicion_check", sql`(condicion IS NULL) OR ((condicion)::text = ANY ((ARRAY['nuevo'::character varying, 'usado'::character varying, 'reacondicionado'::character varying])::text[]))`),
	check("marketplace_estado_check", sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'vendido'::character varying, 'pausado'::character varying, 'expirado'::character varying])::text[])`),
]);

export const categoriasMarketplace = pgTable("categorias_marketplace", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: varchar({ length: 50 }).notNull(),
	icono: varchar({ length: 50 }),
	orden: smallint().default(0),
	activa: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("categorias_marketplace_nombre_key").on(table.nombre),
]);

export const planes = pgTable("planes", {
	id: serial().primaryKey().notNull(),
	perfil: varchar({ length: 20 }).notNull(),
	membresia: smallint().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	descripcion: text(),
	precioMensual: numeric("precio_mensual", { precision: 10, scale: 2 }).default('0'),
	precioAnual: numeric("precio_anual", { precision: 10, scale: 2 }),
	moneda: varchar({ length: 3 }).default('MXN'),
	activo: boolean().default(true),
	ordenDisplay: smallint("orden_display").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_planes_activo").using("btree", table.activo.asc().nullsLast()),
	unique("planes_unique").on(table.perfil, table.membresia),
	check("planes_membresia_check", sql`membresia = ANY (ARRAY[1, 2, 3])`),
	check("planes_perfil_check", sql`(perfil)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
]);

export const planReglas = pgTable("plan_reglas", {
	id: serial().primaryKey().notNull(),
	planId: integer("plan_id").notNull(),
	clave: varchar({ length: 50 }).notNull(),
	descripcion: varchar({ length: 200 }),
	tipo: varchar({ length: 20 }).notNull(),
	seccion: varchar({ length: 50 }).notNull(),
	valor: integer().notNull(),
	activo: boolean().default(true),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_plan_reglas_activo").using("btree", table.activo.asc().nullsLast()),
	index("idx_plan_reglas_plan_id").using("btree", table.planId.asc().nullsLast()),
	index("idx_plan_reglas_seccion").using("btree", table.seccion.asc().nullsLast()),
	foreignKey({
		columns: [table.planId],
		foreignColumns: [planes.id],
		name: "plan_reglas_plan_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.updatedBy],
		foreignColumns: [usuarios.id],
		name: "plan_reglas_updated_by_fkey"
	}),
	unique("plan_reglas_unique").on(table.planId, table.clave),
	check("plan_reglas_tipo_check", sql`(tipo)::text = ANY ((ARRAY['configuracion'::character varying, 'limite'::character varying])::text[])`),
]);

export const bitacoraUso = pgTable("bitacora_uso", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	negocioId: uuid("negocio_id"),
	clave: varchar({ length: 50 }).notNull(),
	seccion: varchar({ length: 50 }).notNull(),
	accion: varchar({ length: 20 }).notNull(),
	cantidad: integer().default(1),
	entidadId: uuid("entidad_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	entidadTipo: varchar("entidad_tipo", { length: 50 }),
	notas: text(),
}, (table) => [
	index("idx_bitacora_uso_clave").using("btree", table.clave.asc().nullsLast()),
	index("idx_bitacora_uso_seccion").using("btree", table.seccion.asc().nullsLast()),
	index("idx_bitacora_uso_usuario_clave").using("btree", table.usuarioId.asc().nullsLast(), table.clave.asc().nullsLast()),
	index("idx_bitacora_uso_usuario_created").using("btree", table.usuarioId.asc().nullsLast(), table.createdAt.asc().nullsLast()),
	index("idx_bitacora_uso_usuario_id").using("btree", table.usuarioId.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "bitacora_uso_negocio_id_fkey"
	}),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "bitacora_uso_usuario_id_fkey"
	}),
	check("bitacora_uso_accion_check", sql`(accion)::text = ANY ((ARRAY['incremento'::character varying, 'decremento'::character varying])::text[])`),
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
	check("votos_entity_type_check", sql`(entity_type)::text = ANY ((ARRAY['sucursal'::character varying, 'articulo'::character varying, 'publicacion'::character varying, 'oferta'::character varying, 'rifa'::character varying, 'subasta'::character varying, 'empleo'::character varying])::text[])`),
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
	check("guardados_entity_type_check", sql`(entity_type)::text = ANY ((ARRAY['oferta'::character varying, 'rifa'::character varying, 'empleo'::character varying])::text[])`),
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
	check("metricas_entidad_type_check", sql`(entity_type)::text = ANY ((ARRAY['sucursal'::character varying, 'articulo'::character varying, 'publicacion'::character varying, 'oferta'::character varying, 'rifa'::character varying, 'subasta'::character varying, 'empleo'::character varying])::text[])`),
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

export const carritoArticulos = pgTable("carrito_articulos", {
	id: serial().primaryKey().notNull(),
	carritoId: uuid("carrito_id").notNull(),
	articuloId: uuid("articulo_id").notNull(),
	cantidad: integer().default(1).notNull(),
	modificadores: jsonb().default([]),
	notas: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_carrito_articulos_carrito_id").using("btree", table.carritoId.asc().nullsLast()),
	foreignKey({
		columns: [table.articuloId],
		foreignColumns: [articulos.id],
		name: "carrito_articulos_articulo_id_fkey"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.carritoId],
		foreignColumns: [carrito.id],
		name: "carrito_articulos_carrito_id_fkey"
	}).onDelete("cascade"),
	unique("carrito_articulos_carrito_id_articulo_id_modificadores_key").on(table.carritoId, table.articuloId, table.modificadores),
]);

export const categoriasNegocio = pgTable("categorias_negocio", {
	nombre: varchar({ length: 50 }).notNull(),
	icono: varchar({ length: 50 }),
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
	icono: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	unique("subcategorias_negocio_unique").on(table.categoriaId, table.nombre),
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
	check("configuracion_categoria_check", sql`(categoria)::text = ANY (ARRAY[('transacciones'::character varying)::text, ('notificaciones'::character varying)::text, ('seguridad'::character varying)::text, ('pagos'::character varying)::text, ('promociones'::character varying)::text, ('trials'::character varying)::text, ('general'::character varying)::text])`),
	check("configuracion_tipo_check", sql`(tipo)::text = ANY ((ARRAY['numero'::character varying, 'texto'::character varying, 'booleano'::character varying, 'json'::character varying])::text[])`),
]);

export const planesAnuncios = pgTable("planes_anuncios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	nombre: varchar({ length: 100 }).notNull(),
	duracionDias: integer("duracion_dias").notNull(),
	precio: numeric({ precision: 10, scale: 2 }).notNull(),
	maxSecciones: integer("max_secciones").notNull(),
	prioridadBase: integer("prioridad_base").default(5).notNull(),
	activo: boolean().default(true).notNull(),
	descripcion: text(),
	orden: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_planes_anuncios_activo_orden").using("btree", table.activo.asc().nullsLast(), table.orden.asc().nullsLast()).where(sql`(activo = true)`),
	check("planes_anuncios_duracion_dias_check", sql`duracion_dias > 0`),
	check("planes_anuncios_max_secciones_check", sql`(max_secciones >= 1) AND (max_secciones <= 5)`),
	check("planes_anuncios_precio_check", sql`precio >= (0)::numeric`),
	check("planes_anuncios_prioridad_check", sql`(prioridad_base >= 1) AND (prioridad_base <= 10)`),
]);

export const promocionesPagadas = pgTable("promociones_pagadas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	planAnuncioId: uuid("plan_anuncio_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	tipoEntidad: varchar("tipo_entidad", { length: 20 }).notNull(),
	entidadId: uuid("entidad_id").notNull(),
	seccionesActivas: jsonb("secciones_activas").default([]).notNull(),
	modoVisualizacion: varchar("modo_visualizacion", { length: 20 }).default('carousel').notNull(),
	prioridad: integer().notNull(),
	clicksTotales: integer("clicks_totales").default(0).notNull(),
	impresionesTotales: integer("impresiones_totales").default(0).notNull(),
	stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).notNull(),
	precioPagado: numeric("precio_pagado", { precision: 10, scale: 2 }).notNull(),
	duracionDias: integer("duracion_dias").notNull(),
	iniciaAt: timestamp("inicia_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	expiraAt: timestamp("expira_at", { withTimezone: true, mode: 'string' }).notNull(),
	estado: varchar({ length: 20 }).default('activo').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_promociones_estado_expira").using("btree", table.estado.asc().nullsLast(), table.expiraAt.asc().nullsLast()).where(sql`((estado)::text = 'activo'::text)`),
	index("idx_promociones_secciones").using("gin", table.seccionesActivas.asc().nullsLast()),
	index("idx_promociones_tipo_entidad").using("btree", table.tipoEntidad.asc().nullsLast(), table.entidadId.asc().nullsLast()),
	index("idx_promociones_usuario").using("btree", table.usuarioId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	foreignKey({
		columns: [table.planAnuncioId],
		foreignColumns: [planesAnuncios.id],
		name: "fk_promociones_plan"
	}).onDelete("restrict"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_promociones_usuario"
	}).onDelete("cascade"),
	check("promociones_pagadas_estado_check", sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'pausado'::character varying, 'expirado'::character varying, 'cancelado'::character varying])::text[])`),
	check("promociones_pagadas_fechas_check", sql`expira_at > inicia_at`),
	check("promociones_pagadas_modo_check", sql`(modo_visualizacion)::text = ANY ((ARRAY['carousel'::character varying, 'estatico'::character varying])::text[])`),
	check("promociones_pagadas_precio_check", sql`precio_pagado >= (0)::numeric`),
	check("promociones_pagadas_tipo_entidad_check", sql`(tipo_entidad)::text = ANY ((ARRAY['marketplace'::character varying, 'oferta'::character varying, 'dinamica'::character varying, 'bolsa'::character varying, 'negocio'::character varying])::text[])`),
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

export const embajadorComisiones = pgTable("embajador_comisiones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	embajadorId: uuid("embajador_id").notNull(),
	negocioId: uuid("negocio_id").notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	montoBase: numeric("monto_base", { precision: 10, scale: 2 }).notNull(),
	porcentaje: numeric({ precision: 5, scale: 2 }).notNull(),
	montoComision: numeric("monto_comision", { precision: 10, scale: 2 }).notNull(),
	estado: varchar({ length: 20 }).default('pendiente').notNull(),
	pagadaAt: timestamp("pagada_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_embajador_comisiones_embajador").using("btree", table.embajadorId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_embajador_comisiones_estado").using("btree", table.estado.asc().nullsLast()).where(sql`((estado)::text = 'pendiente'::text)`),
	index("idx_embajador_comisiones_negocio").using("btree", table.negocioId.asc().nullsLast()),
	index("idx_embajador_comisiones_tipo").using("btree", table.tipo.asc().nullsLast()),
	foreignKey({
		columns: [table.embajadorId],
		foreignColumns: [embajadores.id],
		name: "fk_embajador_comisiones_embajador"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_embajador_comisiones_negocio"
	}).onDelete("cascade"),
	check("embajador_comisiones_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'pagada'::character varying, 'cancelada'::character varying])::text[])`),
	check("embajador_comisiones_monto_base_check", sql`monto_base >= (0)::numeric`),
	check("embajador_comisiones_monto_comision_check", sql`monto_comision >= (0)::numeric`),
	check("embajador_comisiones_porcentaje_check", sql`(porcentaje >= (0)::numeric) AND (porcentaje <= (100)::numeric)`),
	check("embajador_comisiones_tipo_check", sql`(tipo)::text = ANY ((ARRAY['primer_pago'::character varying, 'recurrente'::character varying])::text[])`),
]);

export const dinamicaPremios = pgTable("dinamica_premios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dinamicaId: uuid("dinamica_id").notNull(),
	proveedorNegocioId: uuid("proveedor_negocio_id"),
	nombrePremio: varchar("nombre_premio", { length: 200 }).notNull(),
	descripcion: text(),
	imagenUrl: text("imagen_url"),
	valorEstimado: numeric("valor_estimado", { precision: 10, scale: 2 }).notNull(),
	cantidadDisponible: integer("cantidad_disponible").default(1).notNull(),
	orden: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_dinamica_premios_dinamica").using("btree", table.dinamicaId.asc().nullsLast(), table.orden.asc().nullsLast()),
	index("idx_dinamica_premios_proveedor").using("btree", table.proveedorNegocioId.asc().nullsLast()).where(sql`(proveedor_negocio_id IS NOT NULL)`),
	foreignKey({
		columns: [table.dinamicaId],
		foreignColumns: [dinamicas.id],
		name: "fk_dinamica_premios_dinamica"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.proveedorNegocioId],
		foreignColumns: [negocios.id],
		name: "fk_dinamica_premios_negocio"
	}).onDelete("set null"),
	check("dinamica_premios_cantidad_check", sql`cantidad_disponible >= 0`),
	check("dinamica_premios_valor_check", sql`valor_estimado >= (0)::numeric`),
]);

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

export const dinamicas = pgTable("dinamicas", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id"),
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	creadoPor: uuid("creado_por").notNull(),
	titulo: varchar({ length: 200 }).notNull(),
	descripcion: text().notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	imagenUrl: varchar("imagen_url", { length: 500 }),
	fechaInicio: timestamp("fecha_inicio", { withTimezone: true, mode: 'string' }).notNull(),
	fechaFin: timestamp("fecha_fin", { withTimezone: true, mode: 'string' }).notNull(),
	fechaSorteo: timestamp("fecha_sorteo", { withTimezone: true, mode: 'string' }),
	requisitos: jsonb(),
	estado: varchar({ length: 20 }).default('borrador').notNull(),
	esPublica: boolean("es_publica").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_dinamicas_creado_por").using("btree", table.creadoPor.asc().nullsLast()),
	index("idx_dinamicas_es_publica").using("btree", table.esPublica.asc().nullsLast()).where(sql`(es_publica = true)`),
	index("idx_dinamicas_estado").using("btree", table.estado.asc().nullsLast()).where(sql`((estado)::text = 'activa'::text)`),
	index("idx_dinamicas_fecha_sorteo").using("btree", table.fechaSorteo.asc().nullsLast()).where(sql`(fecha_sorteo IS NOT NULL)`),
	index("idx_dinamicas_fechas").using("btree", table.fechaInicio.asc().nullsLast(), table.fechaFin.asc().nullsLast()),
	index("idx_dinamicas_negocio").using("btree", table.negocioId.asc().nullsLast()).where(sql`(negocio_id IS NOT NULL)`),
	index("idx_dinamicas_sucursal").using("btree", table.sucursalId.asc().nullsLast()).where(sql`(sucursal_id IS NOT NULL)`),
	index("idx_dinamicas_tipo").using("btree", table.tipo.asc().nullsLast()),
	foreignKey({
		columns: [table.creadoPor],
		foreignColumns: [usuarios.id],
		name: "fk_dinamicas_creado_por"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_dinamicas_negocio"
	}).onDelete("set null"),
	check("dinamicas_estado_check", sql`(estado)::text = ANY ((ARRAY['borrador'::character varying, 'activa'::character varying, 'finalizada'::character varying, 'cancelada'::character varying])::text[])`),
	check("dinamicas_fecha_sorteo_check", sql`(fecha_sorteo IS NULL) OR (fecha_sorteo >= fecha_inicio)`),
	check("dinamicas_fechas_check", sql`fecha_fin > fecha_inicio`),
	check("dinamicas_tipo_check", sql`(tipo)::text = ANY ((ARRAY['rifa'::character varying, 'sorteo'::character varying, 'promocion'::character varying, 'giveaway'::character varying])::text[])`),
]);

export const dinamicaParticipaciones = pgTable("dinamica_participaciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dinamicaId: uuid("dinamica_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	entradas: integer().default(1).notNull(),
	datosExtra: jsonb("datos_extra"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_dinamica_participaciones_dinamica").using("btree", table.dinamicaId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_dinamica_participaciones_entradas").using("btree", table.entradas.asc().nullsLast()).where(sql`(entradas > 1)`),
	index("idx_dinamica_participaciones_usuario").using("btree", table.usuarioId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	foreignKey({
		columns: [table.dinamicaId],
		foreignColumns: [dinamicas.id],
		name: "fk_dinamica_participaciones_dinamica"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_dinamica_participaciones_usuario"
	}).onDelete("cascade"),
	unique("dinamica_participaciones_unique").on(table.dinamicaId, table.usuarioId),
	check("dinamica_participaciones_entradas_check", sql`entradas > 0`),
]);

export const bolsaTrabajo = pgTable("bolsa_trabajo", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	negocioId: uuid("negocio_id"),
	sucursalId: uuid("sucursal_id").references((): AnyPgColumn => negocioSucursales.id, { onDelete: 'cascade' }),
	usuarioId: uuid("usuario_id"),
	titulo: varchar({ length: 200 }).notNull(),
	descripcion: text().notNull(),
	salarioMinimo: numeric("salario_minimo", { precision: 10, scale: 2 }),
	salarioMaximo: numeric("salario_maximo", { precision: 10, scale: 2 }),
	modalidad: varchar({ length: 20 }).notNull(),
	ubicacion: varchar({ length: 200 }).notNull(),
	categoriaServicio: varchar("categoria_servicio", { length: 100 }),
	experienciaAnios: integer("experiencia_anios"),
	portafolioUrl: varchar("portafolio_url", { length: 500 }),
	estado: varchar({ length: 20 }).default('activo').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	requisitos: text(),
	tipoContrato: varchar("tipo_contrato", { length: 20 }),
	contactoEmail: varchar("contacto_email", { length: 100 }),
	contactoTelefono: varchar("contacto_telefono", { length: 20 }),
	fechaExpiracion: date("fecha_expiracion"),
}, (table) => [
	index("idx_bolsa_trabajo_categoria").using("btree", table.categoriaServicio.asc().nullsLast()).where(sql`(categoria_servicio IS NOT NULL)`),
	index("idx_bolsa_trabajo_fecha_expiracion").using("btree", table.fechaExpiracion.asc().nullsLast()).where(sql`(fecha_expiracion IS NOT NULL)`),
	index("idx_bolsa_trabajo_modalidad").using("btree", table.modalidad.asc().nullsLast()),
	index("idx_bolsa_trabajo_negocio").using("btree", table.negocioId.asc().nullsLast()).where(sql`(negocio_id IS NOT NULL)`),
	index("idx_bolsa_trabajo_sucursal").using("btree", table.sucursalId.asc().nullsLast()).where(sql`(sucursal_id IS NOT NULL)`),
	index("idx_bolsa_trabajo_tipo_contrato").using("btree", table.tipoContrato.asc().nullsLast()).where(sql`(tipo_contrato IS NOT NULL)`),
	index("idx_bolsa_trabajo_tipo_estado").using("btree", table.tipo.asc().nullsLast(), table.estado.asc().nullsLast()).where(sql`((estado)::text = 'activo'::text)`),
	index("idx_bolsa_trabajo_ubicacion").using("btree", table.ubicacion.asc().nullsLast()),
	index("idx_bolsa_trabajo_usuario").using("btree", table.usuarioId.asc().nullsLast()).where(sql`(usuario_id IS NOT NULL)`),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_bolsa_trabajo_negocio"
	}).onDelete("cascade"),
	foreignKey({
		columns: [table.usuarioId],
		foreignColumns: [usuarios.id],
		name: "fk_bolsa_trabajo_usuario"
	}).onDelete("cascade"),
	check("bolsa_trabajo_estado_check", sql`(estado)::text = ANY ((ARRAY['activo'::character varying, 'pausado'::character varying, 'cerrado'::character varying, 'expirado'::character varying])::text[])`),
	check("bolsa_trabajo_exclusividad", sql`(((tipo)::text = 'vacante'::text) AND (negocio_id IS NOT NULL) AND (usuario_id IS NULL)) OR (((tipo)::text = 'servicio'::text) AND (usuario_id IS NOT NULL) AND (negocio_id IS NULL))`),
	check("bolsa_trabajo_modalidad_check", sql`(modalidad)::text = ANY ((ARRAY['presencial'::character varying, 'remoto'::character varying, 'hibrido'::character varying])::text[])`),
	check("bolsa_trabajo_salario_check", sql`(salario_minimo IS NULL) OR (salario_maximo IS NULL) OR (salario_maximo >= salario_minimo)`),
	check("bolsa_trabajo_servicio_requiere_usuario", sql`((tipo)::text <> 'servicio'::text) OR (usuario_id IS NOT NULL)`),
	check("bolsa_trabajo_tipo_check", sql`(tipo)::text = ANY ((ARRAY['vacante'::character varying, 'servicio'::character varying])::text[])`),
	check("bolsa_trabajo_tipo_contrato_check", sql`(tipo_contrato IS NULL) OR ((tipo_contrato)::text = ANY ((ARRAY['tiempo_completo'::character varying, 'medio_tiempo'::character varying, 'temporal'::character varying, 'freelance'::character varying])::text[]))`),
	check("bolsa_trabajo_vacante_requiere_negocio", sql`((tipo)::text <> 'vacante'::text) OR (negocio_id IS NOT NULL)`),
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
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_recompensas_negocio_activa").using("btree", table.negocioId.asc().nullsLast(), table.activa.asc().nullsLast()).where(sql`(activa = true)`),
	index("idx_recompensas_orden").using("btree", table.negocioId.asc().nullsLast(), table.orden.asc().nullsLast()),
	foreignKey({
		columns: [table.negocioId],
		foreignColumns: [negocios.id],
		name: "fk_recompensas_negocio"
	}).onDelete("cascade"),
	check("recompensas_puntos_requeridos_check", sql`puntos_requeridos > 0`),
	check("recompensas_stock_check", sql`stock >= '-1'::integer`),
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
	alertaMontoAlto: numeric("alerta_monto_alto", { precision: 10, scale: 2 }).default('5000'),
	alertaTransaccionesHora: integer("alerta_transacciones_hora").default(20),
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
	cuponUsoId: bigint("cupon_uso_id", { mode: 'number' }),
	nota: text("nota"),
	concepto: varchar("concepto", { length: 200 }),
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
		columns: [table.cuponUsoId],
		foreignColumns: [cuponUsos.id],
		name: "fk_puntos_transacciones_cupon_uso"
	}).onDelete("set null"),
	foreignKey({
		columns: [table.revocadoPor],
		foreignColumns: [usuarios.id],
		name: "fk_puntos_transacciones_revocado_por"
	}).onDelete("set null"),
	index("idx_puntos_transacciones_revocadas").using("btree", table.negocioId.asc().nullsLast(), table.revocadoAt.desc().nullsFirst()).where(sql`((estado)::text = 'cancelado'::text)`),
	check("puntos_transacciones_estado_check", sql`(estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'rechazado'::character varying, 'cancelado'::character varying])::text[])`),
	check("puntos_transacciones_monto_check", sql`monto_compra > (0)::numeric`),
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
	check("vouchers_canje_puntos_check", sql`puntos_usados > 0`),
]);

export const alertasSeguridad = pgTable("alertas_seguridad", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	negocioId: uuid("negocio_id").notNull(),
	transaccionId: uuid("transaccion_id"),
	empleadoId: uuid("empleado_id"),
	tipo: varchar({ length: 30 }).notNull(),
	severidad: varchar({ length: 10 }).default('media').notNull(),
	titulo: varchar({ length: 200 }).notNull(),
	descripcion: text().notNull(),
	data: jsonb(),
	leida: boolean().default(false).notNull(),
	leidaAt: timestamp("leida_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_alertas_seguridad_negocio_leida").using("btree", table.negocioId.asc().nullsLast(), table.leida.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("idx_alertas_seguridad_severidad").using("btree", table.severidad.asc().nullsLast()).where(sql`((severidad)::text = 'alta'::text)`),
	index("idx_alertas_seguridad_tipo").using("btree", table.tipo.asc().nullsLast()),
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
		columns: [table.transaccionId],
		foreignColumns: [puntosTransacciones.id],
		name: "fk_alertas_seguridad_transaccion"
	}).onDelete("cascade"),
	check("alertas_seguridad_severidad_check", sql`(severidad)::text = ANY ((ARRAY['baja'::character varying, 'media'::character varying, 'alta'::character varying])::text[])`),
	check("alertas_seguridad_tipo_check", sql`(tipo)::text = ANY ((ARRAY['monto_inusual'::character varying, 'cliente_frecuente'::character varying, 'fuera_horario'::character varying, 'montos_redondos'::character varying, 'empleado_destacado'::character varying, 'cliente_reporte'::character varying])::text[])`),
]);

export const notificaciones = pgTable("notificaciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	modo: varchar({ length: 15 }).notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	titulo: varchar({ length: 200 }).notNull(),
	mensaje: varchar({ length: 500 }).notNull(),
	negocioId: uuid("negocio_id"),
	sucursalId: uuid("sucursal_id"),
	referenciaId: varchar("referencia_id", { length: 100 }),
	referenciaTipo: varchar("referencia_tipo", { length: 30 }),
	icono: varchar({ length: 20 }),
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
	check("notificaciones_tipo_check", sql`(tipo)::text = ANY ((ARRAY['puntos_ganados'::character varying, 'voucher_generado'::character varying, 'voucher_cobrado'::character varying, 'nueva_oferta'::character varying, 'nueva_recompensa'::character varying, 'nuevo_cupon'::character varying, 'nuevo_cliente'::character varying, 'voucher_pendiente'::character varying, 'stock_bajo'::character varying, 'nueva_resena'::character varying, 'sistema'::character varying, 'nuevo_marketplace'::character varying, 'nueva_dinamica'::character varying, 'nuevo_empleo'::character varying])::text[])`),
	check("notificaciones_referencia_tipo_check", sql`(referencia_tipo IS NULL OR (referencia_tipo)::text = ANY ((ARRAY['transaccion'::character varying, 'voucher'::character varying, 'oferta'::character varying, 'recompensa'::character varying, 'resena'::character varying, 'cupon'::character varying, 'marketplace'::character varying, 'dinamica'::character varying, 'empleo'::character varying])::text[]))`),
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

	// Preview del último mensaje
	ultimoMensajeTexto: varchar("ultimo_mensaje_texto", { length: 100 }),
	ultimoMensajeFecha: timestamp("ultimo_mensaje_fecha", { withTimezone: true, mode: 'string' }),
	ultimoMensajeTipo: varchar("ultimo_mensaje_tipo", { length: 20 }),

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

	// Timestamps
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_conv_participante1").using("btree", table.participante1Id.asc().nullsLast()),
	index("idx_chat_conv_participante2").using("btree", table.participante2Id.asc().nullsLast()),
	index("idx_chat_conv_updated").using("btree", table.updatedAt.desc().nullsFirst()),
	index("idx_chat_conv_p1_activas").using("btree", table.participante1Id.asc().nullsLast(), table.updatedAt.desc().nullsFirst()).where(sql`(eliminada_por_p1 = false)`),
	index("idx_chat_conv_p2_activas").using("btree", table.participante2Id.asc().nullsLast(), table.updatedAt.desc().nullsFirst()).where(sql`(eliminada_por_p2 = false)`),
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
	check("chat_conv_contexto_tipo_check", sql`(contexto_tipo)::text = ANY ((ARRAY['negocio'::character varying, 'marketplace'::character varying, 'oferta'::character varying, 'dinamica'::character varying, 'empleo'::character varying, 'directo'::character varying])::text[])`),
	check("chat_conv_no_auto_chat", sql`participante1_id != participante2_id`),
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
	check("chat_msg_tipo_check", sql`(tipo)::text = ANY ((ARRAY['texto'::character varying, 'imagen'::character varying, 'audio'::character varying, 'documento'::character varying, 'ubicacion'::character varying, 'contacto'::character varying, 'sistema'::character varying])::text[])`),
	check("chat_msg_estado_check", sql`(estado)::text = ANY ((ARRAY['enviado'::character varying, 'entregado'::character varying, 'leido'::character varying])::text[])`),
]);

export const chatReacciones = pgTable("chat_reacciones", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	mensajeId: uuid("mensaje_id").notNull(),
	usuarioId: uuid("usuario_id").notNull(),
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
	unique("chat_reacciones_unique").on(table.mensajeId, table.usuarioId, table.emoji),
]);

export const chatMensajesFijados = pgTable("chat_mensajes_fijados", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversacionId: uuid("conversacion_id").notNull(),
	mensajeId: uuid("mensaje_id").notNull(),
	fijadoPor: uuid("fijado_por").notNull(),
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
	unique("chat_msg_fijados_unique").on(table.conversacionId, table.mensajeId),
]);

export const chatContactos = pgTable("chat_contactos", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	contactoId: uuid("contacto_id").notNull(),
	tipo: varchar({ length: 15 }).notNull(),
	negocioId: uuid("negocio_id"),
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
	unique("chat_contactos_unique").on(table.usuarioId, table.contactoId, table.tipo),
	check("chat_contactos_tipo_check", sql`(tipo)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[])`),
	check("chat_contactos_no_auto", sql`usuario_id != contacto_id`),
]);

export const chatBloqueados = pgTable("chat_bloqueados", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	usuarioId: uuid("usuario_id").notNull(),
	bloqueadoId: uuid("bloqueado_id").notNull(),
	motivo: varchar({ length: 200 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_bloqueados_usuario").using("btree", table.usuarioId.asc().nullsLast()),
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
	unique("chat_bloqueados_unique").on(table.usuarioId, table.bloqueadoId),
	check("chat_bloqueados_no_auto", sql`usuario_id != bloqueado_id`),
]);