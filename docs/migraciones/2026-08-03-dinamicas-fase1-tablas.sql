-- 2026-08-03 · Dinámicas (rifas P2P) — Fase 1: estructura de datos y ciclo de vida
-- ==============================================================================
-- Módulo nuevo "Dinámicas" dentro de MarketPlace: cualquier usuario en modo
-- personal puede organizar una rifa/concurso. El pago de boletos y la entrega
-- del premio ocurren 100% FUERA de la plataforma — AnunciaYA solo organiza el
-- registro de participantes y determina/anuncia al ganador. Ver
-- docs/kit-dinamicas/Contexto_Dinamicas.md para el contexto completo de producto.
--
-- Esta es la Fase 1 de 5 (solo capa de datos y ciclo de vida, sin UI). Crea 3
-- tablas nuevas:
--
--   · dinamicas         → la rifa en sí. Ciclo de vida:
--       borrador → activa ⇄ pospuesta → en_sorteo → cerrada
--       (o cancelada, posible desde borrador/activa/pospuesta)
--   · dinamica_boletos   → boletos reservados/pagados por participante.
--       `UNIQUE (dinamica_id, numero_boleto)` es la pieza clave: evita la
--       condición de carrera que SÍ existe hoy en la tabla `votos` (que solo
--       valida con SELECT antes de INSERT, sin índice único).
--   · dinamica_ganadores → 1 o varios registros por Dinámica (en vez de un
--       `boleto_ganador_id` singular en `dinamicas`), porque la regla de
--       desempate "repartir el premio entre empatados" puede producir más de
--       un ganador.
--
-- Nombres de tabla y columna: reincorporan el nombre "dinamicas" que existió
-- antes y se retiró en la Fase D del cleanup de visión v3 (abril 2026, ver
-- docs/migraciones/2026-04-28-fase-d-vision-v3-cleanup.sql) por riesgo legal
-- SEGOB. Se retoma ahora porque el pago ya no lo procesa AnunciaYA.
--
-- Espejo exacto de `dinamicas`, `dinamicaBoletos`, `dinamicaGanadores` en
-- apps/api/src/db/schemas/schema.ts.
--
-- IDEMPOTENTE: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  Aditivo, sin impacto en tablas existentes. Correr en DEV primero,     │
-- │     luego en PROD. Puede correr antes o después de desplegar el backend  │
-- │     de Fase 1 (las tablas no reciben tráfico hasta que el backend las    │
-- │     use).                                                                 │
-- └─────────────────────────────────────────────────────────────────────────┘
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS dinamicas (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizador_usuario_id      uuid NOT NULL,
  titulo                      varchar(80) NOT NULL,
  descripcion                 text NOT NULL,
  -- Array JSONB de URLs/objetos — mismo shape que articulos_marketplace.fotos.
  fotos_premio                jsonb NOT NULL DEFAULT '[]',
  tipo_premio                 varchar(20) NOT NULL,   -- fisico | efectivo (informativo)
  metodo_sorteo               varchar(20) NOT NULL,   -- tombola | carta_unica | tabla_completa
  numero_total_boletos        integer NOT NULL,
  precio_boleto               numeric(10,2) NOT NULL,
  fecha_limite_inscripcion    timestamptz NOT NULL,
  -- Solo aplica si metodo_sorteo = 'tabla_completa' (único método con empates).
  regla_desempate             varchar(30),
  estado                      varchar(20) NOT NULL DEFAULT 'borrador',
  -- Motor de sorteo auditable — se llenan al sortear (Fase 4).
  semilla_aleatoria           varchar(128),
  timestamp_sorteo            timestamptz,
  hash_verificacion           varchar(128),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_dinamicas_organizador
    FOREIGN KEY (organizador_usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT dinamicas_tipo_premio_check
    CHECK (tipo_premio IN ('fisico', 'efectivo')),
  CONSTRAINT dinamicas_metodo_sorteo_check
    CHECK (metodo_sorteo IN ('tombola', 'carta_unica', 'tabla_completa')),
  CONSTRAINT dinamicas_numero_total_boletos_check
    CHECK (numero_total_boletos > 0),
  CONSTRAINT dinamicas_precio_boleto_check
    CHECK (precio_boleto > 0),
  CONSTRAINT dinamicas_regla_desempate_check
    CHECK (regla_desempate IS NULL OR regla_desempate IN ('sorteo_instantaneo', 'repartir_premio', 'ronda_extra', 'orden_inscripcion')),
  CONSTRAINT dinamicas_regla_desempate_metodo_check
    CHECK (regla_desempate IS NULL OR metodo_sorteo = 'tabla_completa'),
  CONSTRAINT dinamicas_estado_check
    CHECK (estado IN ('borrador', 'activa', 'pospuesta', 'en_sorteo', 'cerrada', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS idx_dinamicas_organizador
  ON dinamicas (organizador_usuario_id);
CREATE INDEX IF NOT EXISTS idx_dinamicas_estado
  ON dinamicas (estado);

CREATE TABLE IF NOT EXISTS dinamica_boletos (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dinamica_id            uuid NOT NULL,
  numero_boleto          integer NOT NULL,
  -- null = participante "Sin cuenta AY" (registrado manualmente por el organizador).
  usuario_id             uuid,
  nombre_manual          varchar(100),
  telefono_manual        varchar(20),
  estado                 varchar(20) NOT NULL DEFAULT 'reservado',   -- reservado | pagado
  reservado_en           timestamptz NOT NULL DEFAULT now(),
  -- reservado_en + 24h — libera el número automáticamente si nunca se confirma el pago.
  reservado_expira_en    timestamptz NOT NULL,
  pagado_en              timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_dinamica_boletos_dinamica
    FOREIGN KEY (dinamica_id) REFERENCES dinamicas(id) ON DELETE CASCADE,
  CONSTRAINT fk_dinamica_boletos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT dinamica_boletos_dinamica_numero_key
    UNIQUE (dinamica_id, numero_boleto),
  CONSTRAINT dinamica_boletos_estado_check
    CHECK (estado IN ('reservado', 'pagado')),
  CONSTRAINT dinamica_boletos_participante_check
    CHECK (usuario_id IS NOT NULL OR (nombre_manual IS NOT NULL AND telefono_manual IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_dinamica_boletos_dinamica_estado
  ON dinamica_boletos (dinamica_id, estado);
CREATE INDEX IF NOT EXISTS idx_dinamica_boletos_usuario
  ON dinamica_boletos (usuario_id);

CREATE TABLE IF NOT EXISTS dinamica_ganadores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dinamica_id   uuid NOT NULL,
  boleto_id     uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_dinamica_ganadores_dinamica
    FOREIGN KEY (dinamica_id) REFERENCES dinamicas(id) ON DELETE CASCADE,
  CONSTRAINT fk_dinamica_ganadores_boleto
    FOREIGN KEY (boleto_id) REFERENCES dinamica_boletos(id) ON DELETE CASCADE,
  CONSTRAINT dinamica_ganadores_dinamica_boleto_key
    UNIQUE (dinamica_id, boleto_id)
);

CREATE INDEX IF NOT EXISTS idx_dinamica_ganadores_dinamica
  ON dinamica_ganadores (dinamica_id);

COMMIT;

-- VERIFICACIÓN:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('dinamicas', 'dinamica_boletos', 'dinamica_ganadores');
--
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'dinamica_boletos'::regclass
--   ORDER BY conname;
--
-- ROLLBACK (si hiciera falta deshacer, en orden por dependencias de FK):
--   DROP TABLE IF EXISTS dinamica_ganadores;
--   DROP TABLE IF EXISTS dinamica_boletos;
--   DROP TABLE IF EXISTS dinamicas;
-- ==============================================================================
