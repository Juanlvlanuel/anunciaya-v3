-- =====================================================================
-- MIGRACIÓN: Deduplicar vistas de ofertas — 1 vista por usuario por día
-- =====================================================================
-- Fecha: 1 Mayo 2026
-- Módulo: Ofertas (sección pública /ofertas)
--
-- CONTEXTO:
-- La tabla `oferta_vistas` antes permitía múltiples filas por (oferta,
-- usuario) sin restricción — un usuario que abría el modal 10 veces
-- contaba 10 vistas. Esto inflaba `metricas_entidad.total_views` y
-- distorsionaba el ranking de "Lo más visto" / `orden=populares`.
--
-- DESPUÉS DE ESTA MIGRACIÓN:
-- Solo se cuenta UNA vista por usuario por día calendario en la zona
-- horaria de Sonora (`America/Hermosillo`). Vistas adicionales del
-- mismo usuario en el mismo día son rechazadas por el índice único
-- y el service maneja `ON CONFLICT DO NOTHING` (no incrementa metricas).
--
-- PASOS:
-- 1) Limpiar duplicados históricos (deja la fila más antigua por día).
-- 2) Crear índice único compuesto.
-- 3) Recalcular `metricas_entidad.total_views` para 'oferta' a partir
--    de las vistas únicas resultantes (mantiene los acumulados
--    consistentes con la nueva semántica).
-- =====================================================================

-- 1. Limpiar duplicados existentes
-- Conservamos la fila con el `id` más bajo (la primera del día) por cada
-- combinación (oferta, usuario, día local Sonora).
DELETE FROM oferta_vistas a
USING oferta_vistas b
WHERE a.id > b.id
  AND a.oferta_id = b.oferta_id
  AND a.usuario_id = b.usuario_id
  AND ((a.created_at AT TIME ZONE 'America/Hermosillo')::date)
    = ((b.created_at AT TIME ZONE 'America/Hermosillo')::date);

-- 2. Crear índice único por (oferta, usuario, día calendario Sonora)
-- `AT TIME ZONE 'literal'` con un string literal es IMMUTABLE, así que
-- es válido en un índice de expresión.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_oferta_vistas_por_dia
ON oferta_vistas (
  oferta_id,
  usuario_id,
  ((created_at AT TIME ZONE 'America/Hermosillo')::date)
);

-- 3. Recalcular metricas_entidad.total_views para entity_type='oferta'
-- a partir del COUNT real de oferta_vistas (después del cleanup).
-- Esto asegura que el contador acumulado refleje la nueva semántica
-- "1 vista por usuario por día" — sin esto, los totales seguirían
-- mostrando el conteo inflado anterior.
UPDATE metricas_entidad me
SET total_views = COALESCE(sub.c, 0),
    updated_at  = NOW()
FROM (
  SELECT oferta_id, COUNT(*)::int AS c
  FROM oferta_vistas
  GROUP BY oferta_id
) sub
WHERE me.entity_type = 'oferta'
  AND me.entity_id = sub.oferta_id;

-- Resetear a 0 las ofertas que tenían vistas registradas pero ahora no.
UPDATE metricas_entidad
SET total_views = 0, updated_at = NOW()
WHERE entity_type = 'oferta'
  AND entity_id NOT IN (SELECT DISTINCT oferta_id FROM oferta_vistas);
