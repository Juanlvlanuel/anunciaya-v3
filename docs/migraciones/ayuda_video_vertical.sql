-- ============================================================================
-- ayuda_video_vertical.sql
-- ============================================================================
-- Agrega la orientación real del video a los tutoriales del Centro de Ayuda.
-- true = vertical (retrato) · false = horizontal · NULL = desconocido (videos
-- subidos antes de este cambio; el frontend cae al comportamiento anterior).
--
-- El Panel la detecta y la guarda automáticamente al subir el video.
--
-- ⚠️ Ejecutar en AMBAS Supabase (DEV y PROD) ANTES de desplegar el código,
--    o el backend fallará al seleccionar una columna inexistente (tumba Render).
-- ============================================================================

ALTER TABLE ayuda_articulos
  ADD COLUMN IF NOT EXISTS video_vertical boolean;
