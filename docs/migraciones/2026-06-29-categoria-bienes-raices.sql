-- ============================================================================
-- 2026-06-29-categoria-bienes-raices.sql
-- ============================================================================
-- Agrega la categoría de negocios "Bienes Raíces" (12.ª categoría) con sus
-- 8 subcategorías. El catálogo no estaba cubriendo inmobiliarias / compra-venta
-- y renta de inmuebles (ver auditoría 29-jun: ninguna de las 11 categorías ni
-- de las 109 subcategorías encajaba; "Rentas Vacacionales" en Turismo es
-- estancia corta a turistas, no venta/renta permanente de inmuebles).
--
-- Patrón replicado del catálogo existente:
--   - categorias_negocio.icono usa EMOJI (🍽️, 💊, 🔧…). Por consistencia con
--     las otras 11 se usa 🏠. (Deuda conocida vs. Regla 13 de TOKENS_GLOBALES:
--     todo el catálogo usa emoji; migrarlo a Iconify es un cambio aparte.)
--   - subcategorias_negocio.icono va NULL (ninguna subcategoría usa icono hoy).
--
-- Idempotente: ON CONFLICT DO NOTHING en ambas tablas (uniques:
--   categorias_negocio_nombre_key(nombre) y
--   subcategorias_negocio_unique(categoria_id, nombre)). Re-ejecutable.
--
-- El id de la categoría lo asigna el serial; las subcategorías resuelven su
-- categoria_id por subquery al nombre, así que no se fuerza ningún id.
--
-- EJECUTAR EN: DEV y PROD (las dos Supabase). Las corre Juan.
-- ============================================================================

-- 1) Categoría principal
INSERT INTO categorias_negocio (nombre, icono, orden, activa)
VALUES ('Bienes Raíces', '🏠', 12, true)
ON CONFLICT (nombre) DO NOTHING;

-- 2) Subcategorías (categoria_id resuelto por nombre)
INSERT INTO subcategorias_negocio (categoria_id, nombre, orden, activa)
SELECT c.id, x.nombre, x.orden, true
FROM categorias_negocio c
CROSS JOIN (VALUES
  ('Inmobiliarias',                    1),
  ('Agentes / Asesores Inmobiliarios', 2),
  ('Venta de Casas y Departamentos',   3),
  ('Terrenos y Lotes',                 4),
  ('Renta de Inmuebles',               5),
  ('Desarrolladoras',                  6),
  ('Administración de Propiedades',    7),
  ('Avalúos',                          8)
) AS x(nombre, orden)
WHERE c.nombre = 'Bienes Raíces'
ON CONFLICT (categoria_id, nombre) DO NOTHING;

-- 3) Verificación (opcional)
-- SELECT c.orden, c.nombre AS categoria, c.icono,
--        array_agg(sc.nombre ORDER BY sc.orden) AS subcategorias
-- FROM categorias_negocio c
-- LEFT JOIN subcategorias_negocio sc ON sc.categoria_id = c.id
-- WHERE c.nombre = 'Bienes Raíces'
-- GROUP BY c.orden, c.nombre, c.icono;
