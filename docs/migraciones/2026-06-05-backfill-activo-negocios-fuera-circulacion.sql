-- =============================================================================
-- 2026-06-05: backfill — alinear `activo` de negocios "fuera de circulación" viejos
-- =============================================================================
--
-- CONTEXTO (Tanda 1 · visibilidad por pago):
-- A partir de ahora, toda salida de circulación por pago apaga `negocios.activo`:
--   - cron de gracia (gracia vencida → 'suspendido')  → activo=false
--   - webhook de cancelación ('cancelado' + es_borrador) → activo=false
-- y el pago exitoso vuelve a encender `activo` SOLO si su única razón de estar
-- oculto era el pago (respetando estado_admin).
--
-- PERO el cambio de código solo afecta a los negocios que caigan DE AQUÍ EN
-- ADELANTE. Si ya hay en la BD negocios con el estado inconsistente VIEJO
-- (estado de pago suspendido/cancelado, pero `activo=true`), siguen visibles
-- hasta que algo los toque. Este script los detecta y los alinea.
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  CÓMO USAR — NO corras el archivo entero de un jalón.                  │
-- │  1) Corre SOLO el PASO 1 (lectura). Anota el conteo y revisa la lista.    │
-- │  2) Si el conteo es 0 → no hay nada que hacer. NO corras el PASO 2.       │
-- │  3) Si el conteo es > 0 → corre el PASO 2 (UPDATE) para alinearlos.       │
-- │  Va en DEV y en PROD por igual (misma BD de Supabase).                    │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- POR QUÉ la condición es `estado_membresia IN ('suspendido','cancelado')` y
-- NO `es_borrador = true` a secas:
--   Un negocio EN ONBOARDING también tiene `es_borrador=true` + `activo=true`
--   (alta legítima a medio terminar). Apagarlo sería un error. Un negocio
--   CANCELADO siempre tiene `estado_membresia='cancelado'`, así que la condición
--   por estado de pago lo cubre sin tocar a los que están en onboarding.
--   (La suspensión MANUAL ya deja `activo=false`, así que NO aparece aquí.)
-- =============================================================================


-- =============================================================================
-- PASO 1 — DIAGNÓSTICO (SOLO LECTURA). Corre esto primero.
-- =============================================================================

-- 1a) ¿CUÁNTOS negocios están en el estado inconsistente viejo?
SELECT count(*) AS a_alinear
FROM negocios
WHERE activo = true
  AND estado_membresia IN ('suspendido', 'cancelado');

-- 1b) ¿CUÁLES son? (revísalos antes de tocar nada)
SELECT
    id,
    nombre,
    activo,
    es_borrador,
    estado_membresia,
    estado_admin,
    onboarding_completado,
    updated_at
FROM negocios
WHERE activo = true
  AND estado_membresia IN ('suspendido', 'cancelado')
ORDER BY updated_at DESC;

-- 1c) CENTINELA informativo (no se toca en el PASO 2): borradores que YA
--     completaron onboarding pero NO están marcados como cancelados por pago.
--     Lo normal es que dé 0. Si aparece alguno, avísame antes de decidir —
--     es un caso raro que conviene mirar a mano.
SELECT
    id, nombre, activo, es_borrador, estado_membresia, estado_admin
FROM negocios
WHERE activo = true
  AND es_borrador = true
  AND onboarding_completado = true
  AND estado_membresia NOT IN ('suspendido', 'cancelado');


-- =============================================================================
-- PASO 2 — ALINEACIÓN (ESCRITURA). Corre esto SOLO si el PASO 1a dio > 0.
-- =============================================================================
-- Pone activo=false a los negocios cuyo estado de pago ya es suspendido/cancelado
-- pero que quedaron visibles por el bug viejo. NO toca estado_membresia ni
-- estado_admin (el MOTIVO se conserva); solo corrige la VISIBILIDAD.

-- BEGIN;
--
-- UPDATE negocios
-- SET activo = false,
--     updated_at = now()
-- WHERE activo = true
--   AND estado_membresia IN ('suspendido', 'cancelado');
--
-- -- Verifica el número de filas afectadas antes de confirmar.
-- -- Si coincide con el conteo del PASO 1a:
-- COMMIT;
-- -- Si algo no cuadra:
-- -- ROLLBACK;
-- =============================================================================
