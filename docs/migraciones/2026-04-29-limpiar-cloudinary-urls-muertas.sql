-- ============================================================================
-- Limpieza de 8 URLs Cloudinary muertas (HTTP 404) detectadas en la migración
-- Cloudinary→R2 del 2026-04-29.
--
-- Las imágenes ya no existían en Cloudinary, por lo que estas filas tenían
-- imágenes rotas en producción. Las limpiamos para poder retirar el código
-- Cloudinary completamente.
--
-- Ejecutar UNA VEZ en producción (Supabase) y opcionalmente en dev.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) negocio_galeria — 5 filas a borrar (url es NOT NULL)
--    La galería existe *porque* hay imagen; sin URL pierde sentido.
-- ----------------------------------------------------------------------------
DELETE FROM negocio_galeria
WHERE id IN (815, 816, 821, 822, 823)
  AND url LIKE '%cloudinary.com%';

-- ----------------------------------------------------------------------------
-- 2) articulos — 3 filas con imagen_principal = NULL (columna admite NULL)
--    El artículo sigue existiendo, solo pierde la imagen rota.
-- ----------------------------------------------------------------------------
UPDATE articulos
SET imagen_principal = NULL
WHERE id IN (
    'ab6cf705-789c-482b-924a-bd9710642613',
    '0fb54abc-4330-4807-8999-b59037544934',
    '3acc4519-b298-4d96-aee0-3ea6e1aa3a10'
)
  AND imagen_principal LIKE '%cloudinary.com%';

-- ----------------------------------------------------------------------------
-- 3) negocio_galeria.cloudinary_public_id → DROP COLUMN
--    Vestigio de Cloudinary; el cleanup R2 solo necesita la URL.
-- ----------------------------------------------------------------------------
ALTER TABLE negocio_galeria DROP COLUMN IF EXISTS cloudinary_public_id;

-- ----------------------------------------------------------------------------
-- Verificación: deben quedar 0 URLs Cloudinary en las 7 columnas migradas.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_total int;
BEGIN
    SELECT
        (SELECT COUNT(*) FROM negocios WHERE logo_url LIKE '%cloudinary.com%') +
        (SELECT COUNT(*) FROM negocio_sucursales WHERE foto_perfil LIKE '%cloudinary.com%') +
        (SELECT COUNT(*) FROM negocio_sucursales WHERE portada_url LIKE '%cloudinary.com%') +
        (SELECT COUNT(*) FROM negocio_galeria WHERE url LIKE '%cloudinary.com%') +
        (SELECT COUNT(*) FROM articulos WHERE imagen_principal LIKE '%cloudinary.com%') +
        (SELECT COUNT(*) FROM ofertas WHERE imagen LIKE '%cloudinary.com%') +
        (SELECT COUNT(*) FROM recompensas WHERE imagen_url LIKE '%cloudinary.com%')
    INTO v_total;

    IF v_total > 0 THEN
        RAISE EXCEPTION 'Aún quedan % URLs Cloudinary — abortando', v_total;
    ELSE
        RAISE NOTICE '✅ 0 URLs Cloudinary en las 7 columnas migradas';
    END IF;
END $$;

COMMIT;
