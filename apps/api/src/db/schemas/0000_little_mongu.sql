-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "spatial_ref_sys" (
	"srid" integer PRIMARY KEY NOT NULL,
	"auth_name" varchar(256),
	"auth_srid" integer,
	"srtext" varchar(2048),
	"proj4text" varchar(2048),
	CONSTRAINT "spatial_ref_sys_srid_check" CHECK ((srid > 0) AND (srid <= 998999))
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"apellidos" varchar(100) NOT NULL,
	"correo" varchar(255) NOT NULL,
	"alias" varchar(35),
	"contrasena_hash" varchar(255),
	"autenticado_por_google" boolean DEFAULT false,
	"autenticado_por_facebook" boolean DEFAULT false,
	"doble_factor_secreto" varchar(64),
	"doble_factor_habilitado" boolean DEFAULT false,
	"doble_factor_confirmado" boolean DEFAULT false,
	"telefono" varchar(20),
	"ciudad" varchar(100),
	"perfil" varchar(20) DEFAULT 'personal' NOT NULL,
	"membresia" smallint DEFAULT 1 NOT NULL,
	"correo_verificado" boolean DEFAULT false,
	"correo_verificado_at" timestamp with time zone,
	"telefono_verificado" boolean DEFAULT false,
	"codigo_verificacion" varchar(10),
	"estado" varchar(15) DEFAULT 'activo' NOT NULL,
	"fecha_cambio_estado" timestamp with time zone DEFAULT now(),
	"motivo_cambio_estado" varchar(500),
	"fecha_reactivacion" timestamp with time zone,
	"intentos_fallidos" smallint DEFAULT 0,
	"bloqueado_hasta" timestamp with time zone,
	"calificacion_promedio" numeric(2, 1) DEFAULT '0',
	"total_calificaciones" integer DEFAULT 0,
	"avatar_url" text,
	"avatar_public_id" varchar(100),
	"avatar_thumb_public_id" varchar(100),
	"fecha_nacimiento" date,
	"genero" varchar(20) DEFAULT 'no_especificado',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"stripe_customer_id" varchar(100),
	"stripe_subscription_id" varchar(100),
	"es_embajador" boolean DEFAULT false NOT NULL,
	"referido_por" uuid,
	CONSTRAINT "usuarios_correo_unique" UNIQUE("correo"),
	CONSTRAINT "usuarios_estado_check" CHECK ((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])),
	CONSTRAINT "usuarios_genero_check" CHECK ((genero)::text = ANY ((ARRAY['masculino'::character varying, 'femenino'::character varying, 'otro'::character varying, 'no_especificado'::character varying])::text[])),
	CONSTRAINT "usuarios_membresia_check" CHECK (membresia = ANY (ARRAY[1, 2, 3])),
	CONSTRAINT "usuarios_perfil_check" CHECK ((perfil)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "usuario_codigos_respaldo" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"codigo_hash" varchar(255) NOT NULL,
	"usado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "negocios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"descripcion" text,
	"categoria_id" integer NOT NULL,
	"subcategoria_id" integer,
	"ubicacion" "geography",
	"ciudad" varchar(120) NOT NULL,
	"direccion" varchar(250),
	"whatsapp" varchar(20),
	"telefono" varchar(20),
	"correo" varchar(100),
	"sitio_web" varchar(200),
	"logo_url" text,
	"portada_url" text,
	"tiene_envio_domicilio" boolean DEFAULT false,
	"requiere_direccion" boolean DEFAULT true,
	"calificacion_promedio" numeric(2, 1) DEFAULT '0',
	"total_calificaciones" integer DEFAULT 0,
	"total_likes" integer DEFAULT 0,
	"total_visitas" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"es_borrador" boolean DEFAULT false,
	"verificado" boolean DEFAULT false,
	"promocionado" boolean DEFAULT false,
	"promocion_expira" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"meses_gratis_restantes" integer DEFAULT 0 NOT NULL,
	"embajador_id" uuid,
	"region_id" uuid,
	"onboarding_completado" boolean DEFAULT false NOT NULL,
	"fecha_primer_pago" date
);
--> statement-breakpoint
CREATE TABLE "negocio_horarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"negocio_id" uuid NOT NULL,
	"dia_semana" smallint NOT NULL,
	"abierto" boolean DEFAULT true,
	"hora_apertura" time,
	"hora_cierre" time,
	"comida_inicio" time,
	"comida_fin" time,
	"tiene_horario_comida" boolean DEFAULT false,
	CONSTRAINT "negocio_horarios_unique" UNIQUE("negocio_id","dia_semana"),
	CONSTRAINT "negocio_horarios_dia_check" CHECK ((dia_semana >= 0) AND (dia_semana <= 6))
);
--> statement-breakpoint
CREATE TABLE "negocio_modulos" (
	"negocio_id" uuid PRIMARY KEY NOT NULL,
	"catalogo_activo" boolean DEFAULT true,
	"pedidos_online_activo" boolean DEFAULT false,
	"citas_activo" boolean DEFAULT false,
	"reservaciones_activo" boolean DEFAULT false,
	"apartados_activo" boolean DEFAULT false,
	"empleados_activo" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "negocio_metodos_pago" (
	"id" serial PRIMARY KEY NOT NULL,
	"negocio_id" uuid NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"activo" boolean DEFAULT true,
	"stripe_cuenta_id" varchar(100),
	"banco_nombre" varchar(100),
	"banco_titular" varchar(200),
	"banco_clabe" varchar(18),
	"instrucciones" text,
	CONSTRAINT "negocio_metodos_pago_unique" UNIQUE("negocio_id","tipo"),
	CONSTRAINT "negocio_metodos_pago_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['efectivo_en_local'::character varying, 'efectivo_en_entrega'::character varying, 'transferencia'::character varying, 'stripe'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "negocio_citas_config" (
	"negocio_id" uuid PRIMARY KEY NOT NULL,
	"duracion_default_minutos" integer DEFAULT 30,
	"dias_anticipacion_maxima" integer DEFAULT 7,
	"horas_minimas_cancelacion" integer DEFAULT 2,
	"confirmar_automaticamente" boolean DEFAULT false,
	"dias_disponibles" jsonb
);
--> statement-breakpoint
CREATE TABLE "negocio_citas_fechas_especificas" (
	"id" serial PRIMARY KEY NOT NULL,
	"negocio_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"activo" boolean DEFAULT true,
	"hora_inicio" time,
	"hora_fin" time,
	CONSTRAINT "negocio_citas_fechas_unique" UNIQUE("negocio_id","fecha")
);
--> statement-breakpoint
CREATE TABLE "negocio_galeria" (
	"id" serial PRIMARY KEY NOT NULL,
	"negocio_id" uuid NOT NULL,
	"url" text NOT NULL,
	"cloudinary_public_id" varchar(200),
	"titulo" varchar(100),
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "negocio_preferencias" (
	"negocio_id" uuid PRIMARY KEY NOT NULL,
	"permite_mensajes" boolean DEFAULT true,
	"mostrar_en_mapa" boolean DEFAULT true,
	"respuesta_automatica_activa" boolean DEFAULT false,
	"mensaje_respuesta_automatica" text,
	"notificar_pedidos" boolean DEFAULT true,
	"notificar_mensajes" boolean DEFAULT true,
	"notificar_citas" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "articulos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"nombre" varchar(150) NOT NULL,
	"descripcion" text,
	"categoria" varchar(100) DEFAULT 'General',
	"sku" varchar(50),
	"precio_base" numeric(10, 2) NOT NULL,
	"precio_desde" boolean DEFAULT false,
	"imagen_principal" text,
	"imagenes_adicionales" text[] DEFAULT '{""}',
	"requiere_cita" boolean DEFAULT false,
	"duracion_estimada" integer,
	"disponible" boolean DEFAULT true,
	"destacado" boolean DEFAULT false,
	"orden" integer DEFAULT 0,
	"total_ventas" integer DEFAULT 0,
	"total_reservas" integer DEFAULT 0,
	"total_vistas" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "articulos_precio_check" CHECK (precio_base >= (0)::numeric),
	CONSTRAINT "articulos_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['producto'::character varying, 'servicio'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "articulo_inventario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"articulo_id" uuid NOT NULL,
	"stock" integer DEFAULT 0,
	"stock_minimo" integer DEFAULT 0,
	"permite_venta_sin_stock" boolean DEFAULT false,
	"stock_bajo" boolean DEFAULT false,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "articulo_inventario_articulo_id_key" UNIQUE("articulo_id"),
	CONSTRAINT "articulo_inventario_stock_check" CHECK (stock >= 0)
);
--> statement-breakpoint
CREATE TABLE "articulo_variantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"articulo_id" uuid NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"requerido" boolean DEFAULT false,
	"seleccion_multiple" boolean DEFAULT false,
	"min_selecciones" integer DEFAULT 0,
	"max_selecciones" integer,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "articulo_variante_opciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variante_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"precio_ajuste" numeric(10, 2) DEFAULT '0',
	"disponible" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "citas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"servicio_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"empleado_id" uuid,
	"fecha" date NOT NULL,
	"hora_inicio" time NOT NULL,
	"hora_fin" time,
	"duracion" integer,
	"hora_fin_real" timestamp with time zone,
	"terminada_manualmente" boolean DEFAULT false,
	"creada_por" varchar(20) DEFAULT 'cliente',
	"estado" varchar(20) DEFAULT 'pendiente',
	"nombre_cliente" varchar(200) NOT NULL,
	"telefono_cliente" varchar(20) NOT NULL,
	"correo_cliente" varchar(150),
	"precio_servicio" numeric(10, 2) NOT NULL,
	"notas_cliente" text,
	"notas_negocio" text,
	"recordatorio_enviado" boolean DEFAULT false,
	"recordatorio_enviado_fecha" timestamp with time zone,
	"cancelada_por" varchar(20),
	"motivo_cancelacion" text,
	"fecha_cancelacion" timestamp with time zone,
	"confirmada_por_negocio" boolean DEFAULT false,
	"fecha_confirmacion" timestamp with time zone,
	"codigo_confirmacion" varchar(10),
	"origen_reserva" varchar(20) DEFAULT 'app',
	"es_bloqueo_horario" boolean DEFAULT false,
	"calificacion" smallint,
	"resena" text,
	"fecha_calificacion" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "citas_codigo_confirmacion_key" UNIQUE("codigo_confirmacion"),
	CONSTRAINT "citas_calificacion_check" CHECK ((calificacion IS NULL) OR ((calificacion >= 1) AND (calificacion <= 5))),
	CONSTRAINT "citas_cancelada_por_check" CHECK ((cancelada_por IS NULL) OR ((cancelada_por)::text = ANY ((ARRAY['cliente'::character varying, 'negocio'::character varying, 'sistema'::character varying])::text[]))),
	CONSTRAINT "citas_estado_check" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmada'::character varying, 'en_proceso'::character varying, 'completada'::character varying, 'cancelada'::character varying, 'no_asistio'::character varying])::text[])),
	CONSTRAINT "citas_hora_fin_check" CHECK ((hora_fin IS NOT NULL) OR ((creada_por)::text = 'negocio'::text)),
	CONSTRAINT "citas_origen_check" CHECK ((origen_reserva)::text = ANY ((ARRAY['web'::character varying, 'app'::character varying, 'telefono'::character varying, 'presencial'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "empleado_horarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"empleado_id" uuid NOT NULL,
	"negocio_id" uuid NOT NULL,
	"dia_semana" smallint NOT NULL,
	"hora_entrada" time NOT NULL,
	"hora_salida" time NOT NULL,
	CONSTRAINT "empleado_horarios_unique" UNIQUE("empleado_id","negocio_id","dia_semana","hora_entrada"),
	CONSTRAINT "empleado_horarios_dia_check" CHECK ((dia_semana >= 0) AND (dia_semana <= 6))
);
--> statement-breakpoint
CREATE TABLE "direcciones_usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"etiqueta" varchar(50) NOT NULL,
	"es_predeterminada" boolean DEFAULT false,
	"calle" varchar(200) NOT NULL,
	"numero_exterior" varchar(20) NOT NULL,
	"numero_interior" varchar(20),
	"colonia" varchar(100) NOT NULL,
	"ciudad" varchar(100) NOT NULL,
	"estado" varchar(50) NOT NULL,
	"codigo_postal" varchar(10) NOT NULL,
	"referencias" text,
	"nombre_receptor" varchar(100),
	"telefono_receptor" varchar(20),
	"latitud" numeric(10, 8),
	"longitud" numeric(11, 8),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pedido_articulos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pedido_id" uuid NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"imagen_url" text,
	"sku" varchar(50),
	"precio_unitario" numeric(10, 2) NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"modificadores" jsonb DEFAULT '[]'::jsonb,
	"notas" text
);
--> statement-breakpoint
CREATE TABLE "carrito" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"tipo_seccion" varchar(20) DEFAULT 'marketplace' NOT NULL,
	"tipo_vendedor" varchar(10) DEFAULT 'comercial' NOT NULL,
	"vendedor_id" uuid DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL,
	CONSTRAINT "carrito_usuario_vendedor_unique" UNIQUE("usuario_id","tipo_vendedor","vendedor_id"),
	CONSTRAINT "carrito_tipo_seccion_check" CHECK ((tipo_seccion)::text = ANY ((ARRAY['marketplace'::character varying, 'negocios_locales'::character varying, 'promociones'::character varying, 'rifas'::character varying, 'subastas'::character varying, 'turismo'::character varying])::text[])),
	CONSTRAINT "carrito_tipo_vendedor_check" CHECK ((tipo_vendedor)::text = ANY ((ARRAY['comercial'::character varying, 'personal'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_pedido" varchar(20) NOT NULL,
	"tipo_seccion" varchar(20) NOT NULL,
	"comprador_id" uuid NOT NULL,
	"tipo_vendedor" varchar(10) NOT NULL,
	"vendedor_id" uuid NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente',
	"motivo_cancelacion" text,
	"cancelado_por" varchar(20),
	"tipo_entrega" varchar(20) NOT NULL,
	"direccion_entrega" jsonb,
	"metodo_pago" varchar(30) NOT NULL,
	"estado_pago" varchar(20) DEFAULT 'pendiente',
	"subtotal" numeric(10, 2) NOT NULL,
	"descuento" numeric(10, 2) DEFAULT '0',
	"costo_envio" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2) NOT NULL,
	"cupon_id" uuid,
	"codigo_cupon_usado" varchar(50),
	"notas_comprador" text,
	"notas_vendedor" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"confirmado_at" timestamp with time zone,
	"entregado_at" timestamp with time zone,
	"referencia_pago" varchar(100),
	CONSTRAINT "pedidos_numero_pedido_key" UNIQUE("numero_pedido"),
	CONSTRAINT "pedidos_estado_check" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'en_preparacion'::character varying, 'en_camino'::character varying, 'entregado'::character varying, 'cancelado'::character varying])::text[])),
	CONSTRAINT "pedidos_metodo_pago_check" CHECK ((metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'tarjeta'::character varying, 'transferencia'::character varying])::text[])),
	CONSTRAINT "pedidos_tipo_entrega_check" CHECK ((tipo_entrega)::text = ANY ((ARRAY['recoger_tienda'::character varying, 'envio_domicilio'::character varying])::text[])),
	CONSTRAINT "pedidos_tipo_seccion_check" CHECK ((tipo_seccion)::text = ANY ((ARRAY['negocios_locales'::character varying, 'marketplace'::character varying, 'turismo'::character varying, 'promociones'::character varying, 'rifas'::character varying, 'subastas'::character varying])::text[])),
	CONSTRAINT "pedidos_tipo_vendedor_check" CHECK ((tipo_vendedor)::text = ANY ((ARRAY['negocio'::character varying, 'usuario'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "ofertas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"articulo_id" uuid,
	"titulo" varchar(150) NOT NULL,
	"descripcion" text,
	"tipo" varchar(20) NOT NULL,
	"valor" numeric(10, 2),
	"compra_minima" numeric(10, 2) DEFAULT '0',
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_fin" timestamp with time zone NOT NULL,
	"limite_usos" integer,
	"usos_actuales" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "ofertas_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['porcentaje'::character varying, 'monto_fijo'::character varying, '2x1'::character varying, '3x2'::character varying, 'envio_gratis'::character varying, 'otro'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "cupon_galeria" (
	"id" serial PRIMARY KEY NOT NULL,
	"cupon_id" uuid NOT NULL,
	"url" text NOT NULL,
	"public_id" varchar(100),
	"thumb_url" text,
	"orden" smallint DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"es_logo" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "cupon_usos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cupon_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"estado" varchar(20) DEFAULT 'asignado',
	"codigo_generado" varchar(50),
	"metodo_canje" varchar(20),
	"monto_compra" numeric(10, 2),
	"descuento_aplicado" numeric(10, 2),
	"pedido_id" uuid,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"usado_at" timestamp with time zone,
	CONSTRAINT "cupon_usos_codigo_generado_key" UNIQUE("codigo_generado"),
	CONSTRAINT "cupon_usos_estado_check" CHECK ((estado)::text = ANY ((ARRAY['asignado'::character varying, 'usado'::character varying, 'expirado'::character varying])::text[])),
	CONSTRAINT "cupon_usos_metodo_check" CHECK ((metodo_canje IS NULL) OR ((metodo_canje)::text = ANY ((ARRAY['qr_presencial'::character varying, 'codigo_online'::character varying, 'carrito'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "cupon_usuarios" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"cupon_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"motivo" varchar(200),
	"asignado_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "cupon_usuarios_unique" UNIQUE("cupon_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "cupones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"titulo" varchar(150) NOT NULL,
	"descripcion" varchar(200),
	"tipo" varchar(20) NOT NULL,
	"valor" numeric(10, 2),
	"compra_minima" numeric(10, 2) DEFAULT '0',
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_expiracion" timestamp with time zone NOT NULL,
	"limite_usos_total" integer,
	"limite_usos_por_usuario" integer DEFAULT 1,
	"usos_actuales" integer DEFAULT 0,
	"estado" varchar(20) DEFAULT 'borrador',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"visibilidad" varchar(15) DEFAULT 'publico',
	CONSTRAINT "cupones_codigo_key" UNIQUE("codigo"),
	CONSTRAINT "cupones_estado_check" CHECK ((estado)::text = ANY ((ARRAY['borrador'::character varying, 'publicado'::character varying, 'pausado'::character varying, 'archivado'::character varying])::text[])),
	CONSTRAINT "cupones_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['porcentaje'::character varying, 'monto_fijo'::character varying, '2x1'::character varying, '3x2'::character varying, 'envio_gratis'::character varying, 'otro'::character varying])::text[])),
	CONSTRAINT "cupones_visibilidad_check" CHECK ((visibilidad)::text = ANY ((ARRAY['publico'::character varying, 'privado'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "marketplace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autor_id" uuid NOT NULL,
	"negocio_id" uuid,
	"categoria_id" uuid NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text,
	"precio" numeric(10, 2) NOT NULL,
	"condicion" varchar(20),
	"imagenes" jsonb,
	"ciudad" varchar(100),
	"estado" varchar(20) DEFAULT 'activo',
	"fecha_expiracion" timestamp with time zone,
	"calificacion_promedio" numeric(2, 1) DEFAULT '0',
	"total_calificaciones" integer DEFAULT 0,
	"total_likes" integer DEFAULT 0,
	"total_visitas" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "marketplace_condicion_check" CHECK ((condicion IS NULL) OR ((condicion)::text = ANY ((ARRAY['nuevo'::character varying, 'usado'::character varying, 'reacondicionado'::character varying])::text[]))),
	CONSTRAINT "marketplace_estado_check" CHECK ((estado)::text = ANY ((ARRAY['activo'::character varying, 'vendido'::character varying, 'pausado'::character varying, 'expirado'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "categorias_marketplace" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"icono" varchar(50),
	"orden" smallint DEFAULT 0,
	"activa" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "categorias_marketplace_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "planes" (
	"id" serial PRIMARY KEY NOT NULL,
	"perfil" varchar(20) NOT NULL,
	"membresia" smallint NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"precio_mensual" numeric(10, 2) DEFAULT '0',
	"precio_anual" numeric(10, 2),
	"moneda" varchar(3) DEFAULT 'MXN',
	"activo" boolean DEFAULT true,
	"orden_display" smallint DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "planes_unique" UNIQUE("perfil","membresia"),
	CONSTRAINT "planes_membresia_check" CHECK (membresia = ANY (ARRAY[1, 2, 3])),
	CONSTRAINT "planes_perfil_check" CHECK ((perfil)::text = ANY ((ARRAY['personal'::character varying, 'comercial'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "plan_reglas" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"clave" varchar(50) NOT NULL,
	"descripcion" varchar(200),
	"tipo" varchar(20) NOT NULL,
	"seccion" varchar(50) NOT NULL,
	"valor" integer NOT NULL,
	"activo" boolean DEFAULT true,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "plan_reglas_unique" UNIQUE("plan_id","clave"),
	CONSTRAINT "plan_reglas_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['configuracion'::character varying, 'limite'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "bitacora_uso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"negocio_id" uuid,
	"clave" varchar(50) NOT NULL,
	"seccion" varchar(50) NOT NULL,
	"accion" varchar(20) NOT NULL,
	"cantidad" integer DEFAULT 1,
	"entidad_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"entidad_tipo" varchar(50),
	"notas" text,
	CONSTRAINT "bitacora_uso_accion_check" CHECK ((accion)::text = ANY ((ARRAY['incremento'::character varying, 'decremento'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "votos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "votos_unique" UNIQUE("user_id","entity_type","entity_id"),
	CONSTRAINT "votos_entity_type_check" CHECK ((entity_type)::text = ANY ((ARRAY['negocio'::character varying, 'usuario'::character varying, 'articulo'::character varying, 'publicacion'::character varying, 'rifa'::character varying, 'subasta'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "resenas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"autor_id" uuid NOT NULL,
	"autor_tipo" varchar(10) NOT NULL,
	"destino_tipo" varchar(10) NOT NULL,
	"destino_id" uuid NOT NULL,
	"rating" smallint,
	"texto" text,
	"interaccion_tipo" varchar(10) NOT NULL,
	"interaccion_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "resenas_unique" UNIQUE("autor_id","destino_tipo","destino_id","interaccion_id"),
	CONSTRAINT "resenas_autor_tipo_check" CHECK ((autor_tipo)::text = ANY ((ARRAY['cliente'::character varying, 'negocio'::character varying])::text[])),
	CONSTRAINT "resenas_contenido_check" CHECK ((rating IS NOT NULL) OR (texto IS NOT NULL)),
	CONSTRAINT "resenas_destino_tipo_check" CHECK ((destino_tipo)::text = ANY ((ARRAY['negocio'::character varying, 'usuario'::character varying])::text[])),
	CONSTRAINT "resenas_direccion_check" CHECK ((((autor_tipo)::text = 'cliente'::text) AND ((destino_tipo)::text = 'negocio'::text)) OR (((autor_tipo)::text = 'negocio'::text) AND ((destino_tipo)::text = 'usuario'::text))),
	CONSTRAINT "resenas_interaccion_tipo_check" CHECK ((interaccion_tipo)::text = ANY ((ARRAY['pedido'::character varying, 'cita'::character varying, 'mensaje'::character varying])::text[])),
	CONSTRAINT "resenas_rating_check" CHECK ((rating IS NULL) OR ((rating >= 1) AND (rating <= 5)))
);
--> statement-breakpoint
CREATE TABLE "metricas_entidad" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"total_likes" integer DEFAULT 0,
	"total_ratings" integer DEFAULT 0,
	"promedio_rating" numeric(2, 1) DEFAULT '0',
	"total_resenas" integer DEFAULT 0,
	"total_views" integer DEFAULT 0,
	"total_clicks" integer DEFAULT 0,
	"total_shares" integer DEFAULT 0,
	"total_messages" integer DEFAULT 0,
	"total_saves" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "metricas_entidad_unique" UNIQUE("entity_type","entity_id"),
	CONSTRAINT "metricas_entidad_type_check" CHECK ((entity_type)::text = ANY ((ARRAY['negocio'::character varying, 'articulo'::character varying, 'publicacion'::character varying, 'rifa'::character varying, 'subasta'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "metricas_usuario" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"total_likes" integer DEFAULT 0,
	"total_ratings" integer DEFAULT 0,
	"promedio_rating" numeric(2, 1) DEFAULT '0',
	"total_resenas" integer DEFAULT 0,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "metricas_usuario_user_id_key" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "carrito_articulos" (
	"id" serial PRIMARY KEY NOT NULL,
	"carrito_id" uuid NOT NULL,
	"articulo_id" uuid NOT NULL,
	"cantidad" integer DEFAULT 1 NOT NULL,
	"modificadores" jsonb DEFAULT '[]'::jsonb,
	"notas" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "carrito_articulos_carrito_id_articulo_id_modificadores_key" UNIQUE("carrito_id","articulo_id","modificadores")
);
--> statement-breakpoint
CREATE TABLE "categorias_negocio" (
	"nombre" varchar(50) NOT NULL,
	"icono" varchar(50),
	"orden" smallint DEFAULT 0,
	"activa" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"id" serial PRIMARY KEY NOT NULL,
	CONSTRAINT "categorias_negocio_nombre_key" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "subcategorias_negocio" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria_id" integer NOT NULL,
	"nombre" varchar(50) NOT NULL,
	"orden" smallint DEFAULT 0,
	"activa" boolean DEFAULT true,
	"icono" varchar(50),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "subcategorias_negocio_unique" UNIQUE("categoria_id","nombre")
);
--> statement-breakpoint
CREATE TABLE "configuracion_sistema" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" varchar(100) NOT NULL,
	"valor" text NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"descripcion" text NOT NULL,
	"categoria" varchar(50) NOT NULL,
	"unidad" varchar(20),
	"valor_minimo" numeric(10, 2),
	"valor_maximo" numeric(10, 2),
	"actualizado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "configuracion_sistema_clave_key" UNIQUE("clave"),
	CONSTRAINT "configuracion_categoria_check" CHECK ((categoria)::text = ANY (ARRAY[('transacciones'::character varying)::text, ('notificaciones'::character varying)::text, ('seguridad'::character varying)::text, ('pagos'::character varying)::text, ('promociones'::character varying)::text, ('trials'::character varying)::text, ('general'::character varying)::text])),
	CONSTRAINT "configuracion_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['numero'::character varying, 'texto'::character varying, 'booleano'::character varying, 'json'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "planes_anuncios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"duracion_dias" integer NOT NULL,
	"precio" numeric(10, 2) NOT NULL,
	"max_secciones" integer NOT NULL,
	"prioridad_base" integer DEFAULT 5 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"descripcion" text,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "planes_anuncios_duracion_dias_check" CHECK (duracion_dias > 0),
	CONSTRAINT "planes_anuncios_max_secciones_check" CHECK ((max_secciones >= 1) AND (max_secciones <= 5)),
	CONSTRAINT "planes_anuncios_precio_check" CHECK (precio >= (0)::numeric),
	CONSTRAINT "planes_anuncios_prioridad_check" CHECK ((prioridad_base >= 1) AND (prioridad_base <= 10))
);
--> statement-breakpoint
CREATE TABLE "promociones_pagadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_anuncio_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo_entidad" varchar(20) NOT NULL,
	"entidad_id" uuid NOT NULL,
	"secciones_activas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"modo_visualizacion" varchar(20) DEFAULT 'carousel' NOT NULL,
	"prioridad" integer NOT NULL,
	"clicks_totales" integer DEFAULT 0 NOT NULL,
	"impresiones_totales" integer DEFAULT 0 NOT NULL,
	"stripe_payment_intent_id" varchar(255) NOT NULL,
	"precio_pagado" numeric(10, 2) NOT NULL,
	"duracion_dias" integer NOT NULL,
	"inicia_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_at" timestamp with time zone NOT NULL,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "promociones_pagadas_estado_check" CHECK ((estado)::text = ANY ((ARRAY['activo'::character varying, 'pausado'::character varying, 'expirado'::character varying, 'cancelado'::character varying])::text[])),
	CONSTRAINT "promociones_pagadas_fechas_check" CHECK (expira_at > inicia_at),
	CONSTRAINT "promociones_pagadas_modo_check" CHECK ((modo_visualizacion)::text = ANY ((ARRAY['carousel'::character varying, 'estatico'::character varying])::text[])),
	CONSTRAINT "promociones_pagadas_precio_check" CHECK (precio_pagado >= (0)::numeric),
	CONSTRAINT "promociones_pagadas_tipo_entidad_check" CHECK ((tipo_entidad)::text = ANY ((ARRAY['marketplace'::character varying, 'oferta'::character varying, 'dinamica'::character varying, 'bolsa'::character varying, 'negocio'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "promociones_temporales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(50) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"tipo_descuento" varchar(20) NOT NULL,
	"valor_descuento" numeric(10, 2),
	"aplica_a" varchar(20) NOT NULL,
	"planes_incluidos" jsonb,
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_fin" timestamp with time zone NOT NULL,
	"max_usos_totales" integer,
	"max_usos_por_usuario" integer DEFAULT 1 NOT NULL,
	"usos_actuales" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"visible_publico" boolean DEFAULT false NOT NULL,
	"creado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "promociones_temporales_codigo_key" UNIQUE("codigo"),
	CONSTRAINT "promociones_temporales_aplica_check" CHECK ((aplica_a)::text = ANY ((ARRAY['planes'::character varying, 'anuncios'::character varying, 'ambos'::character varying])::text[])),
	CONSTRAINT "promociones_temporales_codigo_check" CHECK (((codigo)::text = upper((codigo)::text)) AND ((codigo)::text !~ '\s'::text)),
	CONSTRAINT "promociones_temporales_fechas_check" CHECK (fecha_fin > fecha_inicio),
	CONSTRAINT "promociones_temporales_fijo_check" CHECK (((tipo_descuento)::text <> 'fijo'::text) OR (valor_descuento > (0)::numeric)),
	CONSTRAINT "promociones_temporales_max_usos_check" CHECK ((max_usos_totales IS NULL) OR (max_usos_totales > 0)),
	CONSTRAINT "promociones_temporales_porcentaje_check" CHECK (((tipo_descuento)::text <> 'porcentaje'::text) OR ((valor_descuento >= (1)::numeric) AND (valor_descuento <= (100)::numeric))),
	CONSTRAINT "promociones_temporales_tipo_check" CHECK ((tipo_descuento)::text = ANY ((ARRAY['porcentaje'::character varying, 'fijo'::character varying, '3x2'::character varying, 'meses_gratis'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "promociones_usadas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promocion_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo_entidad" varchar(20) NOT NULL,
	"entidad_id" uuid NOT NULL,
	"precio_original" numeric(10, 2) NOT NULL,
	"precio_final" numeric(10, 2) NOT NULL,
	"descuento_aplicado" numeric(10, 2) NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "promociones_usadas_precios_check" CHECK ((precio_final <= precio_original) AND (descuento_aplicado >= (0)::numeric)),
	CONSTRAINT "promociones_usadas_tipo_check" CHECK ((tipo_entidad)::text = ANY ((ARRAY['plan'::character varying, 'anuncio'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "embajador_comisiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"embajador_id" uuid NOT NULL,
	"negocio_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"monto_base" numeric(10, 2) NOT NULL,
	"porcentaje" numeric(5, 2) NOT NULL,
	"monto_comision" numeric(10, 2) NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"pagada_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "embajador_comisiones_estado_check" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'pagada'::character varying, 'cancelada'::character varying])::text[])),
	CONSTRAINT "embajador_comisiones_monto_base_check" CHECK (monto_base >= (0)::numeric),
	CONSTRAINT "embajador_comisiones_monto_comision_check" CHECK (monto_comision >= (0)::numeric),
	CONSTRAINT "embajador_comisiones_porcentaje_check" CHECK ((porcentaje >= (0)::numeric) AND (porcentaje <= (100)::numeric)),
	CONSTRAINT "embajador_comisiones_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['primer_pago'::character varying, 'recurrente'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "dinamica_premios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dinamica_id" uuid NOT NULL,
	"proveedor_negocio_id" uuid,
	"nombre_premio" varchar(200) NOT NULL,
	"descripcion" text,
	"imagen_url" text,
	"valor_estimado" numeric(10, 2) NOT NULL,
	"cantidad_disponible" integer DEFAULT 1 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "dinamica_premios_cantidad_check" CHECK (cantidad_disponible >= 0),
	CONSTRAINT "dinamica_premios_valor_check" CHECK (valor_estimado >= (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "embajadores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"region_id" uuid NOT NULL,
	"codigo_referido" varchar(50) NOT NULL,
	"porcentaje_primer_pago" numeric(5, 2) DEFAULT '30.00' NOT NULL,
	"porcentaje_recurrente" numeric(5, 2) DEFAULT '15.00' NOT NULL,
	"negocios_registrados" integer DEFAULT 0 NOT NULL,
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "embajadores_codigo_referido_key" UNIQUE("codigo_referido"),
	CONSTRAINT "embajadores_estado_check" CHECK ((estado)::text = ANY ((ARRAY['activo'::character varying, 'inactivo'::character varying, 'suspendido'::character varying])::text[])),
	CONSTRAINT "embajadores_negocios_check" CHECK (negocios_registrados >= 0),
	CONSTRAINT "embajadores_porcentaje_primer_check" CHECK ((porcentaje_primer_pago >= (0)::numeric) AND (porcentaje_primer_pago <= (100)::numeric)),
	CONSTRAINT "embajadores_porcentaje_recurrente_check" CHECK ((porcentaje_recurrente >= (0)::numeric) AND (porcentaje_recurrente <= (100)::numeric))
);
--> statement-breakpoint
CREATE TABLE "regiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"estado" varchar(100) NOT NULL,
	"pais" varchar(100) DEFAULT 'México' NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "regiones_nombre_estado_unique" UNIQUE("nombre","estado")
);
--> statement-breakpoint
CREATE TABLE "empleados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"especialidad" varchar(100),
	"telefono" varchar(20),
	"correo" varchar(150),
	"foto_url" text,
	"total_citas_atendidas" integer DEFAULT 0,
	"calificacion_promedio" numeric(2, 1) DEFAULT '0',
	"total_resenas" integer DEFAULT 0,
	"activo" boolean DEFAULT true,
	"orden" integer DEFAULT 0,
	"notas_internas" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"puede_registrar_ventas" boolean DEFAULT true NOT NULL,
	"puede_procesar_canjes" boolean DEFAULT true NOT NULL,
	"puede_ver_historial" boolean DEFAULT true NOT NULL,
	"pin_acceso" varchar(4),
	CONSTRAINT "empleados_pin_acceso_check" CHECK ((pin_acceso IS NULL) OR ((pin_acceso)::text ~ '^[0-9]{4}$'::text))
);
--> statement-breakpoint
CREATE TABLE "dinamicas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid,
	"creado_por" uuid NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"imagen_url" varchar(500),
	"fecha_inicio" timestamp with time zone NOT NULL,
	"fecha_fin" timestamp with time zone NOT NULL,
	"fecha_sorteo" timestamp with time zone,
	"requisitos" jsonb,
	"estado" varchar(20) DEFAULT 'borrador' NOT NULL,
	"es_publica" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "dinamicas_estado_check" CHECK ((estado)::text = ANY ((ARRAY['borrador'::character varying, 'activa'::character varying, 'finalizada'::character varying, 'cancelada'::character varying])::text[])),
	CONSTRAINT "dinamicas_fecha_sorteo_check" CHECK ((fecha_sorteo IS NULL) OR (fecha_sorteo >= fecha_inicio)),
	CONSTRAINT "dinamicas_fechas_check" CHECK (fecha_fin > fecha_inicio),
	CONSTRAINT "dinamicas_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['rifa'::character varying, 'sorteo'::character varying, 'promocion'::character varying, 'giveaway'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "dinamica_participaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dinamica_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"entradas" integer DEFAULT 1 NOT NULL,
	"datos_extra" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "dinamica_participaciones_unique" UNIQUE("dinamica_id","usuario_id"),
	CONSTRAINT "dinamica_participaciones_entradas_check" CHECK (entradas > 0)
);
--> statement-breakpoint
CREATE TABLE "bolsa_trabajo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"negocio_id" uuid,
	"usuario_id" uuid,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text NOT NULL,
	"salario_minimo" numeric(10, 2),
	"salario_maximo" numeric(10, 2),
	"modalidad" varchar(20) NOT NULL,
	"ubicacion" varchar(200) NOT NULL,
	"categoria_servicio" varchar(100),
	"experiencia_anios" integer,
	"portafolio_url" varchar(500),
	"estado" varchar(20) DEFAULT 'activo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"requisitos" text,
	"tipo_contrato" varchar(20),
	"contacto_email" varchar(100),
	"contacto_telefono" varchar(20),
	"fecha_expiracion" date,
	CONSTRAINT "bolsa_trabajo_estado_check" CHECK ((estado)::text = ANY ((ARRAY['activo'::character varying, 'pausado'::character varying, 'cerrado'::character varying, 'expirado'::character varying])::text[])),
	CONSTRAINT "bolsa_trabajo_exclusividad" CHECK ((((tipo)::text = 'vacante'::text) AND (negocio_id IS NOT NULL) AND (usuario_id IS NULL)) OR (((tipo)::text = 'servicio'::text) AND (usuario_id IS NOT NULL) AND (negocio_id IS NULL))),
	CONSTRAINT "bolsa_trabajo_modalidad_check" CHECK ((modalidad)::text = ANY ((ARRAY['presencial'::character varying, 'remoto'::character varying, 'hibrido'::character varying])::text[])),
	CONSTRAINT "bolsa_trabajo_salario_check" CHECK ((salario_minimo IS NULL) OR (salario_maximo IS NULL) OR (salario_maximo >= salario_minimo)),
	CONSTRAINT "bolsa_trabajo_servicio_requiere_usuario" CHECK (((tipo)::text <> 'servicio'::text) OR (usuario_id IS NOT NULL)),
	CONSTRAINT "bolsa_trabajo_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['vacante'::character varying, 'servicio'::character varying])::text[])),
	CONSTRAINT "bolsa_trabajo_tipo_contrato_check" CHECK ((tipo_contrato IS NULL) OR ((tipo_contrato)::text = ANY ((ARRAY['tiempo_completo'::character varying, 'medio_tiempo'::character varying, 'temporal'::character varying, 'freelance'::character varying])::text[]))),
	CONSTRAINT "bolsa_trabajo_vacante_requiere_negocio" CHECK (((tipo)::text <> 'vacante'::text) OR (negocio_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "puntos_configuracion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"puntos_por_peso" numeric(10, 4) DEFAULT '1.0' NOT NULL,
	"minimo_compra" numeric(10, 2) DEFAULT '0' NOT NULL,
	"dias_expiracion_puntos" integer DEFAULT 90 NOT NULL,
	"dias_expiracion_voucher" integer DEFAULT 30 NOT NULL,
	"requiere_foto_evidencia" boolean DEFAULT true NOT NULL,
	"requiere_numero_orden" boolean DEFAULT false NOT NULL,
	"validar_horario" boolean DEFAULT true NOT NULL,
	"horario_inicio" time DEFAULT '09:00:00' NOT NULL,
	"horario_fin" time DEFAULT '22:00:00' NOT NULL,
	"monto_alerta_alto" numeric(10, 2) DEFAULT '2000' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "puntos_configuracion_negocio_unique" UNIQUE("negocio_id"),
	CONSTRAINT "puntos_configuracion_dias_expiracion_check" CHECK ((dias_expiracion_puntos > 0) AND (dias_expiracion_voucher > 0)),
	CONSTRAINT "puntos_configuracion_horario_check" CHECK (horario_fin > horario_inicio),
	CONSTRAINT "puntos_configuracion_minimo_compra_check" CHECK (minimo_compra >= (0)::numeric),
	CONSTRAINT "puntos_configuracion_monto_alerta_check" CHECK (monto_alerta_alto >= (0)::numeric),
	CONSTRAINT "puntos_configuracion_puntos_por_peso_check" CHECK (puntos_por_peso > (0)::numeric)
);
--> statement-breakpoint
CREATE TABLE "puntos_billetera" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"negocio_id" uuid NOT NULL,
	"puntos_disponibles" integer DEFAULT 0 NOT NULL,
	"puntos_acumulados_total" integer DEFAULT 0 NOT NULL,
	"puntos_canjeados_total" integer DEFAULT 0 NOT NULL,
	"puntos_expirados_total" integer DEFAULT 0 NOT NULL,
	"ultima_actividad" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "puntos_billetera_unique" UNIQUE("usuario_id","negocio_id"),
	CONSTRAINT "puntos_billetera_puntos_disponibles_check" CHECK (puntos_disponibles >= 0),
	CONSTRAINT "puntos_billetera_totales_check" CHECK ((puntos_acumulados_total >= 0) AND (puntos_canjeados_total >= 0) AND (puntos_expirados_total >= 0))
);
--> statement-breakpoint
CREATE TABLE "recompensas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"nombre" varchar(200) NOT NULL,
	"descripcion" text,
	"puntos_requeridos" integer NOT NULL,
	"imagen_url" varchar(500),
	"stock" integer DEFAULT '-1' NOT NULL,
	"requiere_aprobacion" boolean DEFAULT false NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "recompensas_puntos_requeridos_check" CHECK (puntos_requeridos > 0),
	CONSTRAINT "recompensas_stock_check" CHECK (stock >= '-1'::integer)
);
--> statement-breakpoint
CREATE TABLE "puntos_transacciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billetera_id" uuid NOT NULL,
	"negocio_id" uuid NOT NULL,
	"empleado_id" uuid,
	"cliente_id" uuid NOT NULL,
	"monto_compra" numeric(10, 2) NOT NULL,
	"puntos_otorgados" integer NOT NULL,
	"numero_orden" varchar(50),
	"tipo" varchar(20) DEFAULT 'presencial' NOT NULL,
	"estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
	"confirmado_por_cliente" boolean DEFAULT false NOT NULL,
	"expira_confirmacion" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "puntos_transacciones_estado_check" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'confirmado'::character varying, 'rechazado'::character varying, 'cancelado'::character varying])::text[])),
	CONSTRAINT "puntos_transacciones_monto_check" CHECK (monto_compra > (0)::numeric),
	CONSTRAINT "puntos_transacciones_puntos_check" CHECK (puntos_otorgados >= 0),
	CONSTRAINT "puntos_transacciones_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['presencial'::character varying, 'domicilio'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "transacciones_evidencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaccion_id" uuid NOT NULL,
	"url_imagen" varchar(500) NOT NULL,
	"tipo" varchar(20) DEFAULT 'ticket' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "transacciones_evidencia_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['ticket'::character varying, 'producto'::character varying, 'otro'::character varying])::text[]))
);
--> statement-breakpoint
CREATE TABLE "vouchers_canje" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billetera_id" uuid NOT NULL,
	"recompensa_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"negocio_id" uuid NOT NULL,
	"codigo" varchar(6) NOT NULL,
	"qr_data" varchar(500),
	"puntos_usados" integer NOT NULL,
	"estado" varchar(30) DEFAULT 'pendiente' NOT NULL,
	"expira_at" timestamp with time zone NOT NULL,
	"usado_at" timestamp with time zone,
	"usado_por_empleado_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "vouchers_canje_codigo_key" UNIQUE("codigo"),
	CONSTRAINT "vouchers_canje_codigo_check" CHECK ((codigo)::text ~ '^[A-Z0-9]{6}$'::text),
	CONSTRAINT "vouchers_canje_estado_check" CHECK ((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'aprobacion_pendiente'::character varying, 'usado'::character varying, 'expirado'::character varying, 'cancelado'::character varying])::text[])),
	CONSTRAINT "vouchers_canje_puntos_check" CHECK (puntos_usados > 0)
);
--> statement-breakpoint
CREATE TABLE "alertas_seguridad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"transaccion_id" uuid,
	"empleado_id" uuid,
	"tipo" varchar(30) NOT NULL,
	"severidad" varchar(10) DEFAULT 'media' NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"descripcion" text NOT NULL,
	"datos" jsonb,
	"leida" boolean DEFAULT false NOT NULL,
	"leida_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "alertas_seguridad_severidad_check" CHECK ((severidad)::text = ANY ((ARRAY['baja'::character varying, 'media'::character varying, 'alta'::character varying])::text[])),
	CONSTRAINT "alertas_seguridad_tipo_check" CHECK ((tipo)::text = ANY ((ARRAY['monto_inusual'::character varying, 'cliente_frecuente'::character varying, 'fuera_horario'::character varying, 'montos_redondos'::character varying, 'empleado_destacado'::character varying, 'cliente_reporte'::character varying])::text[]))
);
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "fk_usuarios_referido_por" FOREIGN KEY ("referido_por") REFERENCES "public"."embajadores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_codigos_respaldo" ADD CONSTRAINT "usuario_codigos_respaldo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocios" ADD CONSTRAINT "fk_negocios_embajador" FOREIGN KEY ("embajador_id") REFERENCES "public"."embajadores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocios" ADD CONSTRAINT "fk_negocios_region" FOREIGN KEY ("region_id") REFERENCES "public"."regiones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_negocio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_subcategoria_id_fkey" FOREIGN KEY ("subcategoria_id") REFERENCES "public"."subcategorias_negocio"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocio_horarios" ADD CONSTRAINT "negocio_horarios_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocio_modulos" ADD CONSTRAINT "negocio_modulos_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocio_metodos_pago" ADD CONSTRAINT "negocio_metodos_pago_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocio_citas_config" ADD CONSTRAINT "negocio_citas_config_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocio_citas_fechas_especificas" ADD CONSTRAINT "negocio_citas_fechas_especificas_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocio_galeria" ADD CONSTRAINT "negocio_galeria_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocio_preferencias" ADD CONSTRAINT "negocio_preferencias_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articulos" ADD CONSTRAINT "articulos_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articulo_inventario" ADD CONSTRAINT "articulo_inventario_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articulo_variantes" ADD CONSTRAINT "articulo_variantes_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articulo_variante_opciones" ADD CONSTRAINT "articulo_variante_opciones_variante_id_fkey" FOREIGN KEY ("variante_id") REFERENCES "public"."articulo_variantes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citas" ADD CONSTRAINT "citas_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "public"."articulos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleado_horarios" ADD CONSTRAINT "empleado_horarios_empleado_id_fkey" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleado_horarios" ADD CONSTRAINT "empleado_horarios_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direcciones_usuario" ADD CONSTRAINT "direcciones_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_articulos" ADD CONSTRAINT "pedido_articulos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrito" ADD CONSTRAINT "carrito_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "fk_pedidos_cupon" FOREIGN KEY ("cupon_id") REFERENCES "public"."cupones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_comprador_id_fkey" FOREIGN KEY ("comprador_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ofertas" ADD CONSTRAINT "ofertas_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupon_galeria" ADD CONSTRAINT "cupon_galeria_cupon_id_fkey" FOREIGN KEY ("cupon_id") REFERENCES "public"."cupones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupon_usos" ADD CONSTRAINT "cupon_usos_cupon_id_fkey" FOREIGN KEY ("cupon_id") REFERENCES "public"."cupones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupon_usos" ADD CONSTRAINT "cupon_usos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupon_usuarios" ADD CONSTRAINT "cupon_usuarios_cupon_id_fkey" FOREIGN KEY ("cupon_id") REFERENCES "public"."cupones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupon_usuarios" ADD CONSTRAINT "cupon_usuarios_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cupones" ADD CONSTRAINT "cupones_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace" ADD CONSTRAINT "marketplace_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace" ADD CONSTRAINT "marketplace_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_marketplace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace" ADD CONSTRAINT "marketplace_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_reglas" ADD CONSTRAINT "plan_reglas_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."planes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_reglas" ADD CONSTRAINT "plan_reglas_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacora_uso" ADD CONSTRAINT "bitacora_uso_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bitacora_uso" ADD CONSTRAINT "bitacora_uso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votos" ADD CONSTRAINT "votos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metricas_usuario" ADD CONSTRAINT "metricas_usuario_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrito_articulos" ADD CONSTRAINT "carrito_articulos_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "public"."articulos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrito_articulos" ADD CONSTRAINT "carrito_articulos_carrito_id_fkey" FOREIGN KEY ("carrito_id") REFERENCES "public"."carrito"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracion_sistema" ADD CONSTRAINT "fk_configuracion_usuario" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones_pagadas" ADD CONSTRAINT "fk_promociones_plan" FOREIGN KEY ("plan_anuncio_id") REFERENCES "public"."planes_anuncios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones_pagadas" ADD CONSTRAINT "fk_promociones_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones_temporales" ADD CONSTRAINT "fk_promociones_temporales_creador" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones_usadas" ADD CONSTRAINT "fk_promociones_usadas_promocion" FOREIGN KEY ("promocion_id") REFERENCES "public"."promociones_temporales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones_usadas" ADD CONSTRAINT "fk_promociones_usadas_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embajador_comisiones" ADD CONSTRAINT "fk_embajador_comisiones_embajador" FOREIGN KEY ("embajador_id") REFERENCES "public"."embajadores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embajador_comisiones" ADD CONSTRAINT "fk_embajador_comisiones_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinamica_premios" ADD CONSTRAINT "fk_dinamica_premios_dinamica" FOREIGN KEY ("dinamica_id") REFERENCES "public"."dinamicas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinamica_premios" ADD CONSTRAINT "fk_dinamica_premios_negocio" FOREIGN KEY ("proveedor_negocio_id") REFERENCES "public"."negocios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embajadores" ADD CONSTRAINT "fk_embajadores_region" FOREIGN KEY ("region_id") REFERENCES "public"."regiones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "embajadores" ADD CONSTRAINT "fk_embajadores_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinamicas" ADD CONSTRAINT "fk_dinamicas_creado_por" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinamicas" ADD CONSTRAINT "fk_dinamicas_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinamica_participaciones" ADD CONSTRAINT "fk_dinamica_participaciones_dinamica" FOREIGN KEY ("dinamica_id") REFERENCES "public"."dinamicas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinamica_participaciones" ADD CONSTRAINT "fk_dinamica_participaciones_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bolsa_trabajo" ADD CONSTRAINT "fk_bolsa_trabajo_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bolsa_trabajo" ADD CONSTRAINT "fk_bolsa_trabajo_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_configuracion" ADD CONSTRAINT "fk_puntos_configuracion_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_billetera" ADD CONSTRAINT "fk_puntos_billetera_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_billetera" ADD CONSTRAINT "fk_puntos_billetera_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recompensas" ADD CONSTRAINT "fk_recompensas_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_transacciones" ADD CONSTRAINT "fk_puntos_transacciones_billetera" FOREIGN KEY ("billetera_id") REFERENCES "public"."puntos_billetera"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_transacciones" ADD CONSTRAINT "fk_puntos_transacciones_cliente" FOREIGN KEY ("cliente_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_transacciones" ADD CONSTRAINT "fk_puntos_transacciones_empleado" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puntos_transacciones" ADD CONSTRAINT "fk_puntos_transacciones_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transacciones_evidencia" ADD CONSTRAINT "fk_transacciones_evidencia_transaccion" FOREIGN KEY ("transaccion_id") REFERENCES "public"."puntos_transacciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers_canje" ADD CONSTRAINT "fk_vouchers_canje_billetera" FOREIGN KEY ("billetera_id") REFERENCES "public"."puntos_billetera"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers_canje" ADD CONSTRAINT "fk_vouchers_canje_empleado" FOREIGN KEY ("usado_por_empleado_id") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers_canje" ADD CONSTRAINT "fk_vouchers_canje_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers_canje" ADD CONSTRAINT "fk_vouchers_canje_recompensa" FOREIGN KEY ("recompensa_id") REFERENCES "public"."recompensas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vouchers_canje" ADD CONSTRAINT "fk_vouchers_canje_usuario" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas_seguridad" ADD CONSTRAINT "fk_alertas_seguridad_empleado" FOREIGN KEY ("empleado_id") REFERENCES "public"."empleados"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas_seguridad" ADD CONSTRAINT "fk_alertas_seguridad_negocio" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas_seguridad" ADD CONSTRAINT "fk_alertas_seguridad_transaccion" FOREIGN KEY ("transaccion_id") REFERENCES "public"."puntos_transacciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_usuarios_correo_verificado" ON "usuarios" USING btree ("correo_verificado" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_usuarios_created_at" ON "usuarios" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_usuarios_es_embajador" ON "usuarios" USING btree ("es_embajador" bool_ops) WHERE (es_embajador = true);--> statement-breakpoint
CREATE INDEX "idx_usuarios_estado" ON "usuarios" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "idx_usuarios_perfil_membresia" ON "usuarios" USING btree ("perfil" text_ops,"membresia" text_ops);--> statement-breakpoint
CREATE INDEX "idx_usuarios_referido_por" ON "usuarios" USING btree ("referido_por" uuid_ops) WHERE (referido_por IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_usuarios_stripe_customer_id" ON "usuarios" USING btree ("stripe_customer_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_usuarios_stripe_subscription_id" ON "usuarios" USING btree ("stripe_subscription_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_usuarios_telefono" ON "usuarios" USING btree ("telefono" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_alias_unique" ON "usuarios" USING btree ("alias" text_ops) WHERE (alias IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_usuario_codigos_respaldo_usuario_id" ON "usuario_codigos_respaldo" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_negocios_activo" ON "negocios" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_negocios_categoria_id" ON "negocios" USING btree ("categoria_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_negocios_ciudad" ON "negocios" USING btree ("ciudad" text_ops);--> statement-breakpoint
CREATE INDEX "idx_negocios_embajador" ON "negocios" USING btree ("embajador_id" uuid_ops) WHERE (embajador_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_negocios_es_borrador" ON "negocios" USING btree ("es_borrador" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_negocios_fecha_primer_pago" ON "negocios" USING btree ("fecha_primer_pago" date_ops) WHERE (fecha_primer_pago IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_negocios_meses_gratis" ON "negocios" USING btree ("meses_gratis_restantes" int4_ops) WHERE (meses_gratis_restantes > 0);--> statement-breakpoint
CREATE INDEX "idx_negocios_onboarding" ON "negocios" USING btree ("onboarding_completado" bool_ops) WHERE (onboarding_completado = false);--> statement-breakpoint
CREATE INDEX "idx_negocios_region" ON "negocios" USING btree ("region_id" uuid_ops) WHERE (region_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_negocios_tiene_envio" ON "negocios" USING btree ("tiene_envio_domicilio" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_negocios_ubicacion" ON "negocios" USING gist ("ubicacion" gist_geography_ops);--> statement-breakpoint
CREATE INDEX "idx_negocios_usuario_id" ON "negocios" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_negocio_modulos_citas" ON "negocio_modulos" USING btree ("citas_activo" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_negocio_modulos_pedidos" ON "negocio_modulos" USING btree ("pedidos_online_activo" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_negocio_citas_fechas_fecha" ON "negocio_citas_fechas_especificas" USING btree ("fecha" date_ops);--> statement-breakpoint
CREATE INDEX "idx_negocio_galeria_negocio_id" ON "negocio_galeria" USING btree ("negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_articulos_categoria" ON "articulos" USING btree ("categoria" text_ops);--> statement-breakpoint
CREATE INDEX "idx_articulos_disponible" ON "articulos" USING btree ("disponible" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_articulos_negocio_id" ON "articulos" USING btree ("negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_articulo_variantes_articulo_id" ON "articulo_variantes" USING btree ("articulo_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_articulo_variante_opciones_variante_id" ON "articulo_variante_opciones" USING btree ("variante_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_citas_cliente_id" ON "citas" USING btree ("cliente_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_citas_empleado_id" ON "citas" USING btree ("empleado_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_citas_estado" ON "citas" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "idx_citas_fecha" ON "citas" USING btree ("fecha" date_ops);--> statement-breakpoint
CREATE INDEX "idx_citas_negocio_id" ON "citas" USING btree ("negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_empleado_horarios_empleado_id" ON "empleado_horarios" USING btree ("empleado_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_empleado_horarios_negocio_id" ON "empleado_horarios" USING btree ("negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_direcciones_usuario_usuario_id" ON "direcciones_usuario" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_pedido_articulos_pedido_id" ON "pedido_articulos" USING btree ("pedido_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_carrito_usuario_id" ON "carrito" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_pedidos_comprador_estado" ON "pedidos" USING btree ("comprador_id" text_ops,"estado" text_ops);--> statement-breakpoint
CREATE INDEX "idx_pedidos_seccion_fecha" ON "pedidos" USING btree ("tipo_seccion" text_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_pedidos_vendedor" ON "pedidos" USING btree ("tipo_vendedor" uuid_ops,"vendedor_id" text_ops,"estado" text_ops);--> statement-breakpoint
CREATE INDEX "idx_ofertas_activo" ON "ofertas" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_ofertas_fecha_fin" ON "ofertas" USING btree ("fecha_fin" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_ofertas_fecha_inicio" ON "ofertas" USING btree ("fecha_inicio" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_ofertas_negocio_id" ON "ofertas" USING btree ("negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cupon_galeria_cupon_id" ON "cupon_galeria" USING btree ("cupon_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cupon_usos_created_at" ON "cupon_usos" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_cupon_usos_cupon_usuario" ON "cupon_usos" USING btree ("cupon_id" uuid_ops,"usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cupon_usos_usado_at" ON "cupon_usos" USING btree ("usado_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_cupon_usos_usuario_estado" ON "cupon_usos" USING btree ("usuario_id" uuid_ops,"estado" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cupon_usuarios_cupon_id" ON "cupon_usuarios" USING btree ("cupon_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cupon_usuarios_usuario_id" ON "cupon_usuarios" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_cupones_activo" ON "cupones" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_cupones_negocio_id" ON "cupones" USING btree ("negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_marketplace_autor_id" ON "marketplace" USING btree ("autor_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_marketplace_categoria_id" ON "marketplace" USING btree ("categoria_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_marketplace_ciudad" ON "marketplace" USING btree ("ciudad" text_ops);--> statement-breakpoint
CREATE INDEX "idx_marketplace_estado" ON "marketplace" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "idx_planes_activo" ON "planes" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_plan_reglas_activo" ON "plan_reglas" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_plan_reglas_plan_id" ON "plan_reglas" USING btree ("plan_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_plan_reglas_seccion" ON "plan_reglas" USING btree ("seccion" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bitacora_uso_clave" ON "bitacora_uso" USING btree ("clave" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bitacora_uso_seccion" ON "bitacora_uso" USING btree ("seccion" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bitacora_uso_usuario_clave" ON "bitacora_uso" USING btree ("usuario_id" uuid_ops,"clave" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_bitacora_uso_usuario_created" ON "bitacora_uso" USING btree ("usuario_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_bitacora_uso_usuario_id" ON "bitacora_uso" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_votos_entity" ON "votos" USING btree ("entity_type" text_ops,"entity_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_votos_user_id" ON "votos" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_resenas_destino" ON "resenas" USING btree ("destino_tipo" uuid_ops,"destino_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_resenas_interaccion" ON "resenas" USING btree ("interaccion_tipo" text_ops,"interaccion_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_metricas_entidad_entity" ON "metricas_entidad" USING btree ("entity_type" text_ops,"entity_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_metricas_usuario_user_id" ON "metricas_usuario" USING btree ("user_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_carrito_articulos_carrito_id" ON "carrito_articulos" USING btree ("carrito_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_configuracion_categoria" ON "configuracion_sistema" USING btree ("categoria" text_ops);--> statement-breakpoint
CREATE INDEX "idx_configuracion_clave" ON "configuracion_sistema" USING btree ("clave" text_ops);--> statement-breakpoint
CREATE INDEX "idx_planes_anuncios_activo_orden" ON "planes_anuncios" USING btree ("activo" int4_ops,"orden" int4_ops) WHERE (activo = true);--> statement-breakpoint
CREATE INDEX "idx_promociones_estado_expira" ON "promociones_pagadas" USING btree ("estado" text_ops,"expira_at" text_ops) WHERE ((estado)::text = 'activo'::text);--> statement-breakpoint
CREATE INDEX "idx_promociones_secciones" ON "promociones_pagadas" USING gin ("secciones_activas" jsonb_ops);--> statement-breakpoint
CREATE INDEX "idx_promociones_tipo_entidad" ON "promociones_pagadas" USING btree ("tipo_entidad" uuid_ops,"entidad_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_promociones_usuario" ON "promociones_pagadas" USING btree ("usuario_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_promociones_temp_activo_fechas" ON "promociones_temporales" USING btree ("activo" timestamptz_ops,"fecha_inicio" bool_ops,"fecha_fin" bool_ops) WHERE (activo = true);--> statement-breakpoint
CREATE INDEX "idx_promociones_temp_aplica" ON "promociones_temporales" USING btree ("aplica_a" text_ops);--> statement-breakpoint
CREATE INDEX "idx_promociones_temp_codigo" ON "promociones_temporales" USING btree (upper((codigo)::text) text_ops);--> statement-breakpoint
CREATE INDEX "idx_promociones_temp_visible" ON "promociones_temporales" USING btree ("visible_publico" bool_ops) WHERE (visible_publico = true);--> statement-breakpoint
CREATE INDEX "idx_promociones_usadas_promocion_fecha" ON "promociones_usadas" USING btree ("promocion_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_promociones_usadas_promocion_usuario" ON "promociones_usadas" USING btree ("promocion_id" uuid_ops,"usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_promociones_usadas_usuario_fecha" ON "promociones_usadas" USING btree ("usuario_id" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_embajador_comisiones_embajador" ON "embajador_comisiones" USING btree ("embajador_id" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_embajador_comisiones_estado" ON "embajador_comisiones" USING btree ("estado" text_ops) WHERE ((estado)::text = 'pendiente'::text);--> statement-breakpoint
CREATE INDEX "idx_embajador_comisiones_negocio" ON "embajador_comisiones" USING btree ("negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_embajador_comisiones_tipo" ON "embajador_comisiones" USING btree ("tipo" text_ops);--> statement-breakpoint
CREATE INDEX "idx_dinamica_premios_dinamica" ON "dinamica_premios" USING btree ("dinamica_id" int4_ops,"orden" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_dinamica_premios_proveedor" ON "dinamica_premios" USING btree ("proveedor_negocio_id" uuid_ops) WHERE (proveedor_negocio_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_embajadores_codigo" ON "embajadores" USING btree ("codigo_referido" text_ops);--> statement-breakpoint
CREATE INDEX "idx_embajadores_estado" ON "embajadores" USING btree ("estado" text_ops) WHERE ((estado)::text = 'activo'::text);--> statement-breakpoint
CREATE INDEX "idx_embajadores_region" ON "embajadores" USING btree ("region_id" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_embajadores_usuario" ON "embajadores" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_regiones_activa" ON "regiones" USING btree ("activa" bool_ops) WHERE (activa = true);--> statement-breakpoint
CREATE INDEX "idx_regiones_estado" ON "regiones" USING btree ("estado" text_ops);--> statement-breakpoint
CREATE INDEX "idx_empleados_activo" ON "empleados" USING btree ("activo" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_empleados_pin_acceso" ON "empleados" USING btree ("pin_acceso" text_ops) WHERE (pin_acceso IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_empleados_usuario_id" ON "empleados" USING btree ("usuario_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_dinamicas_creado_por" ON "dinamicas" USING btree ("creado_por" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_dinamicas_es_publica" ON "dinamicas" USING btree ("es_publica" bool_ops) WHERE (es_publica = true);--> statement-breakpoint
CREATE INDEX "idx_dinamicas_estado" ON "dinamicas" USING btree ("estado" text_ops) WHERE ((estado)::text = 'activa'::text);--> statement-breakpoint
CREATE INDEX "idx_dinamicas_fecha_sorteo" ON "dinamicas" USING btree ("fecha_sorteo" timestamptz_ops) WHERE (fecha_sorteo IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_dinamicas_fechas" ON "dinamicas" USING btree ("fecha_inicio" timestamptz_ops,"fecha_fin" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_dinamicas_negocio" ON "dinamicas" USING btree ("negocio_id" uuid_ops) WHERE (negocio_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_dinamicas_tipo" ON "dinamicas" USING btree ("tipo" text_ops);--> statement-breakpoint
CREATE INDEX "idx_dinamica_participaciones_dinamica" ON "dinamica_participaciones" USING btree ("dinamica_id" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_dinamica_participaciones_entradas" ON "dinamica_participaciones" USING btree ("entradas" int4_ops) WHERE (entradas > 1);--> statement-breakpoint
CREATE INDEX "idx_dinamica_participaciones_usuario" ON "dinamica_participaciones" USING btree ("usuario_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_bolsa_trabajo_categoria" ON "bolsa_trabajo" USING btree ("categoria_servicio" text_ops) WHERE (categoria_servicio IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_bolsa_trabajo_fecha_expiracion" ON "bolsa_trabajo" USING btree ("fecha_expiracion" date_ops) WHERE (fecha_expiracion IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_bolsa_trabajo_modalidad" ON "bolsa_trabajo" USING btree ("modalidad" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bolsa_trabajo_negocio" ON "bolsa_trabajo" USING btree ("negocio_id" uuid_ops) WHERE (negocio_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_bolsa_trabajo_tipo_contrato" ON "bolsa_trabajo" USING btree ("tipo_contrato" text_ops) WHERE (tipo_contrato IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_bolsa_trabajo_tipo_estado" ON "bolsa_trabajo" USING btree ("tipo" text_ops,"estado" text_ops) WHERE ((estado)::text = 'activo'::text);--> statement-breakpoint
CREATE INDEX "idx_bolsa_trabajo_ubicacion" ON "bolsa_trabajo" USING btree ("ubicacion" text_ops);--> statement-breakpoint
CREATE INDEX "idx_bolsa_trabajo_usuario" ON "bolsa_trabajo" USING btree ("usuario_id" uuid_ops) WHERE (usuario_id IS NOT NULL);--> statement-breakpoint
CREATE INDEX "idx_puntos_configuracion_activo" ON "puntos_configuracion" USING btree ("activo" bool_ops) WHERE (activo = true);--> statement-breakpoint
CREATE INDEX "idx_puntos_billetera_negocio" ON "puntos_billetera" USING btree ("negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_puntos_billetera_usuario_negocio" ON "puntos_billetera" USING btree ("usuario_id" uuid_ops,"negocio_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_recompensas_negocio_activa" ON "recompensas" USING btree ("negocio_id" bool_ops,"activa" bool_ops) WHERE (activa = true);--> statement-breakpoint
CREATE INDEX "idx_recompensas_orden" ON "recompensas" USING btree ("negocio_id" uuid_ops,"orden" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_puntos_transacciones_billetera" ON "puntos_transacciones" USING btree ("billetera_id" timestamptz_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_puntos_transacciones_cliente" ON "puntos_transacciones" USING btree ("cliente_id" uuid_ops,"created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_puntos_transacciones_estado" ON "puntos_transacciones" USING btree ("estado" timestamptz_ops,"expira_confirmacion" text_ops);--> statement-breakpoint
CREATE INDEX "idx_puntos_transacciones_negocio" ON "puntos_transacciones" USING btree ("negocio_id" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_transacciones_evidencia_transaccion" ON "transacciones_evidencia" USING btree ("transaccion_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_vouchers_canje_codigo" ON "vouchers_canje" USING btree ("codigo" text_ops);--> statement-breakpoint
CREATE INDEX "idx_vouchers_canje_estado" ON "vouchers_canje" USING btree ("estado" text_ops,"expira_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_vouchers_canje_negocio" ON "vouchers_canje" USING btree ("negocio_id" text_ops,"estado" text_ops);--> statement-breakpoint
CREATE INDEX "idx_vouchers_canje_usuario" ON "vouchers_canje" USING btree ("usuario_id" uuid_ops,"created_at" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_alertas_seguridad_negocio_leida" ON "alertas_seguridad" USING btree ("negocio_id" timestamptz_ops,"leida" uuid_ops,"created_at" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_alertas_seguridad_severidad" ON "alertas_seguridad" USING btree ("severidad" text_ops) WHERE ((severidad)::text = 'alta'::text);--> statement-breakpoint
CREATE INDEX "idx_alertas_seguridad_tipo" ON "alertas_seguridad" USING btree ("tipo" text_ops);--> statement-breakpoint
CREATE VIEW "public"."geography_columns" AS (SELECT current_database() AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geography_column, postgis_typmod_dims(a.atttypmod) AS coord_dimension, postgis_typmod_srid(a.atttypmod) AS srid, postgis_typmod_type(a.atttypmod) AS type FROM pg_class c, pg_attribute a, pg_type t, pg_namespace n WHERE t.typname = 'geography'::name AND a.attisdropped = false AND a.atttypid = t.oid AND a.attrelid = c.oid AND c.relnamespace = n.oid AND (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text));--> statement-breakpoint
CREATE VIEW "public"."geometry_columns" AS (SELECT current_database()::character varying(256) AS f_table_catalog, n.nspname AS f_table_schema, c.relname AS f_table_name, a.attname AS f_geometry_column, COALESCE(postgis_typmod_dims(a.atttypmod), sn.ndims, 2) AS coord_dimension, COALESCE(NULLIF(postgis_typmod_srid(a.atttypmod), 0), sr.srid, 0) AS srid, replace(replace(COALESCE(NULLIF(upper(postgis_typmod_type(a.atttypmod)), 'GEOMETRY'::text), st.type, 'GEOMETRY'::text), 'ZM'::text, ''::text), 'Z'::text, ''::text)::character varying(30) AS type FROM pg_class c JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped JOIN pg_namespace n ON c.relnamespace = n.oid JOIN pg_type t ON a.atttypid = t.oid LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ''''::text, 2), ')'::text, ''::text) AS type FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%geometrytype(% = %'::text) st ON st.connamespace = n.oid AND st.conrelid = c.oid AND (a.attnum = ANY (st.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text)::integer AS ndims FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%ndims(% = %'::text) sn ON sn.connamespace = n.oid AND sn.conrelid = c.oid AND (a.attnum = ANY (sn.conkey)) LEFT JOIN ( SELECT s.connamespace, s.conrelid, s.conkey, replace(replace(split_part(s.consrc, ' = '::text, 2), ')'::text, ''::text), '('::text, ''::text)::integer AS srid FROM ( SELECT pg_constraint.connamespace, pg_constraint.conrelid, pg_constraint.conkey, pg_get_constraintdef(pg_constraint.oid) AS consrc FROM pg_constraint) s WHERE s.consrc ~~* '%srid(% = %'::text) sr ON sr.connamespace = n.oid AND sr.conrelid = c.oid AND (a.attnum = ANY (sr.conkey)) WHERE (c.relkind = ANY (ARRAY['r'::"char", 'v'::"char", 'm'::"char", 'f'::"char", 'p'::"char"])) AND NOT c.relname = 'raster_columns'::name AND t.typname = 'geometry'::name AND NOT pg_is_other_temp_schema(c.relnamespace) AND has_table_privilege(c.oid, 'SELECT'::text));
*/