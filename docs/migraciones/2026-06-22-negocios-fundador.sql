-- 2026-06-22 · Publicidad · "Fundadores" como REGALO (fuera del plan de pago)
-- ============================================================================
-- Fundadores deja de venderse: pasa a ser un regalo a los primeros negocios de cada ciudad. El admin
-- marca un negocio como Fundador desde su ficha (cupo 50 por ciudad); su logo aparece en el carrusel
-- "Fundadores" de la ciudad de su sucursal principal. Marca = una columna booleana en `negocios`.
--
-- Correr en DEV y PROD (idempotente).

ALTER TABLE negocios ADD COLUMN IF NOT EXISTS es_fundador boolean NOT NULL DEFAULT false;

-- Índice parcial: el carrusel y el cupo preguntan "¿qué negocios son fundadores?".
CREATE INDEX IF NOT EXISTS idx_negocios_es_fundador ON negocios (es_fundador) WHERE es_fundador = true;
