-- 2026-08-17 — Chat automático al apartar (Mi Catálogo / MarketPlace)
--
-- Agrega comprador_usuario_id a marketplace_apartados: cuando el comprador
-- apartó estando logueado, apartarArticulo() dispara un chat directo
-- automático con el vendedor (card de contexto + mensaje prellenado
-- auto-enviado) y una notificación in-app. NULL = comprador sin cuenta AY
-- (catálogo público, flujo por WhatsApp sin cambios).
--
-- Ejecutar manualmente en DEV y PROD (Supabase). Ver CLAUDE.md §
-- "El usuario aplica las escrituras a la BD".

ALTER TABLE marketplace_apartados
    ADD COLUMN IF NOT EXISTS comprador_usuario_id uuid;

ALTER TABLE marketplace_apartados
    DROP CONSTRAINT IF EXISTS fk_marketplace_apartados_comprador_usuario;

ALTER TABLE marketplace_apartados
    ADD CONSTRAINT fk_marketplace_apartados_comprador_usuario
    FOREIGN KEY (comprador_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
