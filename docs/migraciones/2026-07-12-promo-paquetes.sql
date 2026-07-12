-- 2026-07-12 · Paquetes promocionales de apertura (config)
-- ========================================================
-- Amplía el CHECK de `configuracion_sistema.tipo` para admitir el tipo nuevo
-- 'paquetes_promocion', usado por la clave `promo_paquetes` (catálogo JSON de
-- paquetes 3x1 / 2x1 que el superadmin edita desde Configuración → Membresía → Promociones).
--
-- La categoría 'promociones' YA está permitida en configuracion_categoria_check (no se toca).
-- La clave `promo_paquetes` NO se siembra aquí: el catálogo del Panel muestra su default
-- (PAQUETES_DEFAULT en apps/api/src/services/admin/configuracion.service.ts) con `sembrado=false`
-- hasta que el super la edite por primera vez (mismo patrón que los periodos de publicidad).
--
-- Correr en DEV y en PROD. Idempotente.

BEGIN;

ALTER TABLE configuracion_sistema DROP CONSTRAINT IF EXISTS configuracion_tipo_check;

ALTER TABLE configuracion_sistema
  ADD CONSTRAINT configuracion_tipo_check
  CHECK ((tipo)::text = ANY ((ARRAY[
    'numero'::character varying,
    'texto'::character varying,
    'booleano'::character varying,
    'json'::character varying,
    'tramos_ciudades'::character varying,
    'periodos_meses'::character varying,
    'paquetes_promocion'::character varying
  ])::text[]));

COMMIT;
