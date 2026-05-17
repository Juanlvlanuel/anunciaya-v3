-- =============================================================================
-- 2026-05-15: Servicios — tablas base (Sprint 1)
-- =============================================================================
--
-- Crea las 4 tablas del MVP de la sección pública "Servicios":
--
--   1. servicios_publicaciones   → núcleo (servicios, vacantes, solicitudes)
--   2. servicios_preguntas       → Q&A con privacidad de pendientes
--   3. servicios_resenas         → ratings 1..5 + texto (post-coordinación)
--   4. servicios_busquedas_log   → para "populares en la ciudad" (Sprint 6)
--
-- Patrón calcado de `articulos_marketplace`:
--   - `ubicacion`              → geography(Point,4326) PRIVADA (no se devuelve al FE)
--   - `ubicacion_aproximada`   → geography(Point,4326) PÚBLICA (offset random 500m)
--   - `fotos`                  → JSONB array de URLs en R2
--   - Estados: solo `activa | pausada | eliminada` (sin "vendida": un servicio
--     no se agota, si ya no se ofrece se elimina — decisión arquitectural).
--   - TTL 30 días con cron de auto-pausa (Sprint 7).
--
-- DIFERENCIAS clave vs MarketPlace:
--   - Discriminadores `modo` ('ofrezco' | 'solicito') y `tipo`
--     ('servicio-persona' | 'vacante-empresa' | 'solicito').
--   - `precio` como JSONB con discriminated union (kind: 'fijo' | 'hora' |
--     'rango' | 'mensual' | 'a-convenir'). MP usa numeric porque todo es venta
--     a precio fijo; Servicios necesita más flexibilidad.
--   - Nueva tabla `servicios_resenas` (MP no tiene rating del vendedor).
--   - Sin columna `vendida_at` ni `total_mensajes` exclusivo de venta — sí
--     mantenemos total_vistas / total_mensajes / total_guardados estándar.
--
-- Doc maestro pendiente: docs/arquitectura/Servicios.md (se escribe al cierre
-- del Sprint 7).
-- Visión: docs/VISION_ESTRATEGICA_AnunciaYA.md §3.2.
-- Handoff de diseño: design_handoff_servicios/README.md.
--
-- Reflejar también en `apps/api/src/db/schemas/schema.ts`.
-- =============================================================================

BEGIN;

-- =============================================================================
-- TABLA 1 / 4 — servicios_publicaciones
-- =============================================================================
-- El núcleo del módulo. Cada fila es una publicación pública que aparece en
-- /servicios. La discrimina `tipo`:
--
--   'servicio-persona' → persona física ofreciendo sus habilidades (Ofrezco)
--   'vacante-empresa'  → negocio con vacante de empleo (Solicito) — alimentada
--                        desde BS Vacantes (Sprint 8). En Sprint 1 la tabla la
--                        soporta pero el feed aún no muestra vacantes.
--   'solicito'         → usuario buscando contratar algo puntual (Solicito)
--
-- IMPORTANTE: los campos condicionales (skills, requisitos, horario, dias)
-- viven en columnas separadas en lugar de un JSONB para que los índices y
-- queries de filtrado sean directos.

CREATE TABLE servicios_publicaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Discriminadores
    modo varchar(20) NOT NULL,           -- 'ofrezco' | 'solicito'
    tipo varchar(30) NOT NULL,           -- 'servicio-persona' | 'vacante-empresa' | 'solicito'
    subtipo varchar(30),                  -- 'servicio-personal' | 'busco-empleo' | 'servicio-puntual' | 'vacante-empresa' | NULL

    -- Contenido
    titulo varchar(80) NOT NULL,
    descripcion text NOT NULL,
    fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
    foto_portada_index smallint NOT NULL DEFAULT 0,

    -- Precio (discriminated union JSONB):
    --   { kind: 'fijo',       monto: number, moneda?: 'MXN' }
    --   { kind: 'hora',       monto: number, moneda?: 'MXN' }
    --   { kind: 'mensual',    monto: number, moneda?: 'MXN' }
    --   { kind: 'rango',      min: number, max: number, moneda?: 'MXN' }
    --   { kind: 'a-convenir' }
    -- La validación profunda (min<=max, montos positivos, etc.) vive en Zod.
    -- El CHECK SQL solo asegura que el discriminador sea válido.
    precio jsonb NOT NULL,

    modalidad varchar(20) NOT NULL,      -- 'presencial' | 'remoto' | 'hibrido'

    -- Ubicación con privacidad (idéntico a articulos_marketplace).
    -- La columna `ubicacion` (geography) NUNCA se devuelve al FE.
    -- `ubicacion_aproximada` se calcula al crear con offset random en disco
    --   de 500m y queda fija (decisión: aleatorizar al guardar, no al
    --   consultar — mismo punto siempre para no revelar varianza).
    ubicacion geography(Point, 4326) NOT NULL,
    ubicacion_aproximada geography(Point, 4326) NOT NULL,
    ciudad varchar(100) NOT NULL,
    -- `zonas_aproximadas` = barrios / colonias del oferente (Centro, Las
    -- Conchas, Cholla, etc). En vacantes-empresa puede ser la zona del local.
    zonas_aproximadas varchar(150)[] NOT NULL DEFAULT '{}',

    -- Skills/especialidades — solo aplica a `tipo='servicio-persona'`, max 8
    -- chips (validado en Zod). En vacantes y solicitudes queda como array
    -- vacío. Lo declaramos en todas las filas para queries homogéneas.
    skills text[] NOT NULL DEFAULT '{}',

    -- Campos exclusivos de vacante (NULL para servicio-persona y solicito):
    requisitos text[] NOT NULL DEFAULT '{}',
    horario varchar(150),
    -- dias_semana es un array de códigos cortos: 'lun','mar','mie','jue',
    -- 'vie','sab','dom'. Modelado como text[] para facilidad de query.
    dias_semana varchar(3)[] NOT NULL DEFAULT '{}',

    -- Campo exclusivo de `tipo='solicito'`: presupuesto que ofrece el
    -- solicitante. NULL para servicio-persona y vacante. Estructura JSONB:
    --   { min: number, max: number }
    presupuesto jsonb,

    -- Confirmaciones del checklist legal del wizard de publicar (Paso 4):
    --   1. No estoy ofreciendo nada ilegal
    --   2. La información es verdadera
    --   3. Sé que la coordinación es por mi cuenta (ChatYA, WhatsApp, presencial)
    -- Snapshot inmutable para evidencia ante denuncias. Estructura JSONB:
    --   { legal: bool, verdadera: bool, coordinacion: bool, version: string,
    --     aceptadasAt: ISO }
    confirmaciones jsonb,

    -- Estado del ciclo de vida.
    -- NO existe 'vendida' (un servicio no se agota — decisión arquitectural).
    -- 'eliminada' es soft-delete con deleted_at.
    estado varchar(20) NOT NULL DEFAULT 'activa',

    -- Métricas
    total_vistas integer NOT NULL DEFAULT 0,
    total_mensajes integer NOT NULL DEFAULT 0,
    total_guardados integer NOT NULL DEFAULT 0,

    -- TTL — solo se setea al crear; cron del Sprint 7 lo usa para auto-pausar
    expira_at timestamptz NOT NULL,

    -- Timestamps
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,

    -- Check constraints (defensa en profundidad — la validación rica vive en Zod)
    CONSTRAINT servicios_pub_modo_check
        CHECK (modo IN ('ofrezco', 'solicito')),
    CONSTRAINT servicios_pub_tipo_check
        CHECK (tipo IN ('servicio-persona', 'vacante-empresa', 'solicito')),
    CONSTRAINT servicios_pub_subtipo_check
        CHECK (subtipo IS NULL OR subtipo IN ('servicio-personal', 'busco-empleo', 'servicio-puntual', 'vacante-empresa')),
    CONSTRAINT servicios_pub_modalidad_check
        CHECK (modalidad IN ('presencial', 'remoto', 'hibrido')),
    CONSTRAINT servicios_pub_estado_check
        CHECK (estado IN ('activa', 'pausada', 'eliminada')),
    CONSTRAINT servicios_pub_precio_kind_check
        CHECK (precio->>'kind' IN ('fijo', 'hora', 'rango', 'mensual', 'a-convenir')),
    CONSTRAINT servicios_pub_fotos_array_check
        CHECK (jsonb_typeof(fotos) = 'array'),
    CONSTRAINT servicios_pub_skills_max_check
        CHECK (array_length(skills, 1) IS NULL OR array_length(skills, 1) <= 8),
    -- Coherencia: solo las vacantes deberían tener requisitos/horario/dias
    -- (pero no fallamos el insert si vienen vacíos en otros tipos — la FE las
    -- omite y el backend defaults a array vacío).
    CONSTRAINT servicios_pub_presupuesto_solo_solicito_check
        CHECK (presupuesto IS NULL OR tipo = 'solicito')
);

COMMENT ON TABLE servicios_publicaciones IS
    'Sección pública Servicios — Sprint 1. Servicios personales, vacantes y solicitudes coexisten en una sola tabla discriminada por modo+tipo. Solo modo Personal puede ver/publicar (ModoPersonalEstrictoGuard).';

COMMENT ON COLUMN servicios_publicaciones.ubicacion IS
    'Coordenada exacta del oferente. PRIVADA: NUNCA se devuelve al FE.';
COMMENT ON COLUMN servicios_publicaciones.ubicacion_aproximada IS
    'Coordenada con offset uniforme dentro de un círculo de 500m (helper aleatorizarCoordenada). PÚBLICA. Fija al crear, no se recalcula.';
COMMENT ON COLUMN servicios_publicaciones.precio IS
    'Discriminated union JSONB: { kind: fijo|hora|rango|mensual|a-convenir, ... }. Validación profunda en Zod.';
COMMENT ON COLUMN servicios_publicaciones.confirmaciones IS
    'Snapshot del checklist legal del wizard (Paso 4). Evidencia inmutable ante denuncias.';

-- Índices BTREE estándar
CREATE INDEX idx_servicios_pub_estado ON servicios_publicaciones(estado);
CREATE INDEX idx_servicios_pub_ciudad ON servicios_publicaciones(ciudad);
CREATE INDEX idx_servicios_pub_usuario ON servicios_publicaciones(usuario_id);
CREATE INDEX idx_servicios_pub_created ON servicios_publicaciones(created_at DESC);
CREATE INDEX idx_servicios_pub_expira ON servicios_publicaciones(expira_at);
CREATE INDEX idx_servicios_pub_modo_tipo ON servicios_publicaciones(modo, tipo);
-- Filtro común del feed: activas + por ciudad ordenadas por fecha.
CREATE INDEX idx_servicios_pub_feed
    ON servicios_publicaciones(ciudad, created_at DESC)
    WHERE estado = 'activa' AND deleted_at IS NULL;

-- Índice GIST para búsqueda geoespacial (ST_DWithin, ST_Distance).
-- IMPORTANTE: GIST solo se puede crear con `USING GIST` y necesita ANALYZE
-- después del primer batch de filas para que el planner lo use bien.
CREATE INDEX idx_servicios_pub_ubicacion_aprox_gist
    ON servicios_publicaciones USING GIST (ubicacion_aproximada);

-- Índice GIN para Full-Text Search en español sobre título + descripción.
--
-- IMPORTANTE — por qué NO usamos `unaccent` aquí:
--   `unaccent(text)` es STABLE, no IMMUTABLE, así que Postgres rechaza
--   incluirla en una expresión de índice (`ERROR 42P17: functions in index
--   expression must be marked IMMUTABLE`).
--
--   Mismo patrón que MarketPlace: el índice se crea sobre la versión
--   "con acentos"; las queries del Sprint 6 aplicarán `unaccent()` en el
--   SELECT, lo cual hace que el índice NO se use al 100% (seq scan o uso
--   parcial). Para datasets piloto (pocos miles de filas) es aceptable.
--
--   Si el volumen crece y se nota lentitud, hay 2 caminos:
--     a) Crear una función wrapper IMMUTABLE alrededor de `unaccent` y
--        recrear el índice usando esa función.
--     b) Agregar una columna generada `texto_busqueda` STORED con
--        `unaccent(titulo || ' ' || descripcion)` e indexarla.
--   Ver: docs/estandares/LECCIONES_TECNICAS.md cuando llegue ese momento.
CREATE INDEX idx_servicios_pub_fts
    ON servicios_publicaciones
    USING GIN (to_tsvector('spanish',
        coalesce(titulo, '') || ' ' || coalesce(descripcion, '')
    ));


-- =============================================================================
-- TABLA 2 / 4 — servicios_preguntas
-- =============================================================================
-- Q&A público en la pantalla de detalle. Mismo patrón que `marketplace_preguntas`:
-- el comprador puede preguntar varias veces, el dueño responde inline. Las
-- pendientes solo las ve el autor y el dueño (privacidad).
--
-- Diferencia vs MP: aquí el FK se llama `publicacion_id` (no `articulo_id`) y
-- el autor de la pregunta se llama `autor_id` (no `comprador_id`) porque en
-- vacantes y solicitudes los roles cambian.

CREATE TABLE servicios_preguntas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacion_id uuid NOT NULL REFERENCES servicios_publicaciones(id) ON DELETE CASCADE,
    autor_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pregunta varchar(200) NOT NULL,
    respuesta varchar(500),
    respondida_at timestamptz,
    editada_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

COMMENT ON TABLE servicios_preguntas IS
    'Q&A público en detalle de servicios. Las pendientes ajenas son privadas (filtro en service). Un autor puede hacer múltiples preguntas en la misma publicación.';

CREATE INDEX idx_servicios_preg_publicacion
    ON servicios_preguntas(publicacion_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_servicios_preg_respondidas
    ON servicios_preguntas(publicacion_id, respondida_at)
    WHERE respondida_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_servicios_preg_autor
    ON servicios_preguntas(autor_id)
    WHERE deleted_at IS NULL;


-- =============================================================================
-- TABLA 3 / 4 — servicios_resenas
-- =============================================================================
-- Reseñas 1..5 + texto corto sobre prestadores. NO existen en MP (MP no tiene
-- rating del vendedor). En Servicios sí porque sin reseñas no hay confianza
-- para contratar a un desconocido.
--
-- Reglas del Sprint 5 (cuando se construya la UI):
--   - 1 reseña por par (autor, destinatario) — UNIQUE constraint abajo.
--   - Se permite dejarla solo tras un chat de contacto cerrado (validado en
--     service del Sprint 5).
--   - El destinatario_id queda redundante con el oferente de la publicación
--     pero acelera queries del perfil del prestador (1 índice directo).
--
-- En Sprint 1 dejamos la tabla creada pero los endpoints viven en Sprint 5.

CREATE TABLE servicios_resenas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    publicacion_id uuid NOT NULL REFERENCES servicios_publicaciones(id) ON DELETE CASCADE,
    autor_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    destinatario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    rating smallint NOT NULL,
    texto varchar(200),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,

    CONSTRAINT servicios_res_rating_check CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT servicios_res_no_self_check CHECK (autor_id <> destinatario_id),
    -- Un autor solo puede dejar una reseña por publicación (puede editar la
    -- existente desde el frontend con UPDATE en lugar de INSERT).
    CONSTRAINT servicios_res_unique_autor_publicacion UNIQUE (publicacion_id, autor_id)
);

COMMENT ON TABLE servicios_resenas IS
    'Ratings 1..5 + texto corto sobre prestadores. UI y endpoints llegan en Sprint 5.';

CREATE INDEX idx_servicios_res_destinatario
    ON servicios_resenas(destinatario_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_servicios_res_publicacion
    ON servicios_resenas(publicacion_id)
    WHERE deleted_at IS NULL;


-- =============================================================================
-- TABLA 4 / 4 — servicios_busquedas_log
-- =============================================================================
-- Log de búsquedas por ciudad. Sirve para calcular "Populares en Peñasco" del
-- buscador (Sprint 6). `usuario_id` siempre NULL en v1 por privacidad — queda
-- nullable como opt-in retroactivo si v2 decide personalizar.
-- Idéntico patrón que `marketplace_busquedas_log`.

CREATE TABLE servicios_busquedas_log (
    id bigserial PRIMARY KEY,
    ciudad varchar(100) NOT NULL,
    termino varchar(100) NOT NULL,
    usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE servicios_busquedas_log IS
    'Log para calcular populares por ciudad en el buscador de Servicios (Sprint 6). usuario_id=NULL en v1.';

CREATE INDEX idx_servicios_busq_ciudad_fecha
    ON servicios_busquedas_log(ciudad, created_at DESC);

COMMIT;

-- =============================================================================
-- POST-COMMIT — Recordatorio operativo
-- =============================================================================
-- 1. ANALYZE servicios_publicaciones después de las primeras 100 filas reales
--    para que el planner use los índices GIST y GIN correctamente.
-- 2. La columna `ubicacion` NUNCA se devuelve al frontend (ver service).
-- 3. El cron de expiración llegará en Sprint 7; mientras tanto las
--    publicaciones no expiran solas pero el campo `expira_at` ya queda escrito
--    al crear.
-- 4. Reflejar las 4 tablas en `apps/api/src/db/schemas/schema.ts` antes de
--    correr el backend.
-- 5. Recordar agregar la entrada a `apps/api/src/utils/imageRegistry.ts`
--    (`servicios_publicaciones.fotos`) para que el reconcile de R2 no marque
--    como huérfanas las fotos de servicios en uso.
