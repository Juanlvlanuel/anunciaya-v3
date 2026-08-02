-- =============================================================================
-- 2026-08-01: fotos → {url, tipo} — habilita video en MarketPlace/Servicios/Negocios
-- =============================================================================
--
-- Contexto: `docs/arquitectura/Video_En_Publicaciones.md`. Video y fotos
-- conviven en el mismo arreglo JSONB `fotos`. Hasta ahora cada elemento era
-- un string plano (la URL); a partir de este cambio cada elemento es un
-- objeto `{ url, tipo: 'imagen' | 'video', posterUrl? }`.
--
-- Esta migración transforma los elementos EXISTENTES (strings planos) al
-- nuevo shape de objeto con `tipo: 'imagen'` (todo lo que había hasta hoy
-- era foto). IDEMPOTENTE: el `CASE WHEN jsonb_typeof(elem) = 'string'` solo
-- toca elementos que todavía son string — un elemento que ya sea objeto
-- (re-ejecución, o fila creada por código ya actualizado) se deja intacto.
--
-- Tablas afectadas: articulos_marketplace, servicios_publicaciones,
-- negocio_publicaciones — mismo patrón en las 3, una transacción.
--
-- ⚠️ El backend YA es tolerante a ambos formatos a la vez (el fix de
-- `eliminarFotoXXXSiHuerfana` usa `COALESCE(elem->>'url', elem#>>'{}')`),
-- así que esta migración se puede correr en cualquier momento respecto al
-- deploy del backend — no hay ventana de riesgo por orden.
-- =============================================================================

BEGIN;

-- 1) MarketPlace
UPDATE articulos_marketplace
SET fotos = (
    SELECT jsonb_agg(
        CASE
            WHEN jsonb_typeof(elem) = 'string'
                THEN jsonb_build_object('url', elem #>> '{}', 'tipo', 'imagen')
            ELSE elem
        END
    )
    FROM jsonb_array_elements(fotos) elem
)
WHERE fotos IS NOT NULL
  AND jsonb_array_length(fotos) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(fotos) elem
      WHERE jsonb_typeof(elem) = 'string'
  );

-- 2) Servicios
UPDATE servicios_publicaciones
SET fotos = (
    SELECT jsonb_agg(
        CASE
            WHEN jsonb_typeof(elem) = 'string'
                THEN jsonb_build_object('url', elem #>> '{}', 'tipo', 'imagen')
            ELSE elem
        END
    )
    FROM jsonb_array_elements(fotos) elem
)
WHERE fotos IS NOT NULL
  AND jsonb_array_length(fotos) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(fotos) elem
      WHERE jsonb_typeof(elem) = 'string'
  );

-- 3) Publicaciones de Negocio
UPDATE negocio_publicaciones
SET fotos = (
    SELECT jsonb_agg(
        CASE
            WHEN jsonb_typeof(elem) = 'string'
                THEN jsonb_build_object('url', elem #>> '{}', 'tipo', 'imagen')
            ELSE elem
        END
    )
    FROM jsonb_array_elements(fotos) elem
)
WHERE fotos IS NOT NULL
  AND jsonb_array_length(fotos) > 0
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(fotos) elem
      WHERE jsonb_typeof(elem) = 'string'
  );

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Debe dar 0 filas en las 3 (ningún elemento string plano sobrante):
--   SELECT id FROM articulos_marketplace,
--     jsonb_array_elements(fotos) elem
--   WHERE jsonb_typeof(elem) = 'string';
--
--   SELECT id FROM servicios_publicaciones,
--     jsonb_array_elements(fotos) elem
--   WHERE jsonb_typeof(elem) = 'string';
--
--   SELECT id FROM negocio_publicaciones,
--     jsonb_array_elements(fotos) elem
--   WHERE jsonb_typeof(elem) = 'string';
--
-- Muestra de cómo quedó una fila migrada:
--   SELECT id, fotos FROM articulos_marketplace WHERE jsonb_array_length(fotos) > 0 LIMIT 3;
-- =============================================================================
