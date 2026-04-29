-- =============================================================================
-- MIGRACIÓN: Fase D — Cleanup de BD alineado con visión v3 (28 Abril 2026)
-- =============================================================================
--
-- Contexto: la sesión estratégica de abril 2026 redefinió las secciones públicas
-- (4 finales: Negocios · Marketplace · Ofertas · Servicios) y descartó
-- permanentemente para v1: Dinámicas/Rifas P2P (riesgo legal SEGOB), Live Sale,
-- Pulse local, Subastas y Turismo como secciones del carrito.
--
-- Esta migración cierra el cleanup técnico de BD que dejaron pendientes las
-- Fases A (docs), B (UI) y C (backend code).
--
-- Cambios:
--   1. DROP CASCADE de tablas `dinamica_participaciones`, `dinamica_premios`
--      y `dinamicas` (Dinámicas removidas del alcance v1).
--   2. Migrar valores literales en filas existentes:
--        • 'empleo' → 'servicio' en chat_conv, votos, guardados,
--          metricas_entidad, notificaciones (referencia_tipo).
--        • 'nuevo_empleo' → 'nuevo_servicio' en notificaciones (tipo).
--        • 'bolsa' → 'servicio' en promociones_pagadas (tipo_entidad).
--   3. Eliminar filas obsoletas:
--        • dinamicas: 'rifa', 'subasta', 'dinamica' en enums de votos,
--          guardados, metricas, notificaciones, promociones_pagadas, chat_conv.
--        • carrito: 'rifas', 'subastas', 'turismo' en tipo_seccion.
--   4. Reemplazar CHECK constraints con la lista nueva de valores válidos.
--
-- La tabla `bolsa_trabajo` se conserva con su nombre físico — sigue siendo
-- la tabla de publicaciones de la sección pública Servicios (modos
-- Ofrezco/Solicito, incluye empleos como caso particular).
--
-- Idempotente: usa IF EXISTS / DROP+ADD constraint patterns para poder
-- re-aplicarse sin error.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) MIGRAR VALORES LITERALES EN FILAS EXISTENTES (antes de cambiar CHECK)
-- =============================================================================

-- 1.1 chat_conversaciones: 'empleo' → 'servicio', 'dinamica' → 'directo' (no hay
--     reemplazo directo; los chats que quedaron con contexto dinamica pasan a directo).
UPDATE chat_conversaciones
   SET contexto_tipo = 'servicio'
 WHERE contexto_tipo = 'empleo';

UPDATE chat_conversaciones
   SET contexto_tipo = 'directo',
       contexto_referencia_id = NULL
 WHERE contexto_tipo = 'dinamica';

-- 1.2 notificaciones.tipo: renombrar nuevo_empleo, eliminar nueva_dinamica.
UPDATE notificaciones
   SET tipo = 'nuevo_servicio'
 WHERE tipo = 'nuevo_empleo';

DELETE FROM notificaciones WHERE tipo = 'nueva_dinamica';

-- 1.3 notificaciones.referencia_tipo: renombrar empleo → servicio, eliminar dinamica.
UPDATE notificaciones
   SET referencia_tipo = 'servicio'
 WHERE referencia_tipo = 'empleo';

DELETE FROM notificaciones WHERE referencia_tipo = 'dinamica';

-- 1.4 votos: renombrar empleo → servicio, eliminar rifa/subasta.
UPDATE votos
   SET entity_type = 'servicio'
 WHERE entity_type = 'empleo';

DELETE FROM votos WHERE entity_type IN ('rifa', 'subasta');

-- 1.5 guardados: renombrar empleo → servicio, eliminar rifa.
UPDATE guardados
   SET entity_type = 'servicio'
 WHERE entity_type = 'empleo';

DELETE FROM guardados WHERE entity_type = 'rifa';

-- 1.6 metricas_entidad: renombrar empleo → servicio, eliminar rifa/subasta.
UPDATE metricas_entidad
   SET entity_type = 'servicio'
 WHERE entity_type = 'empleo';

DELETE FROM metricas_entidad WHERE entity_type IN ('rifa', 'subasta');

-- 1.7 promociones_pagadas: renombrar bolsa → servicio, eliminar dinamica.
UPDATE promociones_pagadas
   SET tipo_entidad = 'servicio'
 WHERE tipo_entidad = 'bolsa';

DELETE FROM promociones_pagadas WHERE tipo_entidad = 'dinamica';

-- 1.8 carrito: eliminar tipo_seccion obsoletos (rifas, subastas, turismo).
DELETE FROM carrito WHERE tipo_seccion IN ('rifas', 'subastas', 'turismo');

-- =============================================================================
-- 2) REEMPLAZAR CHECK CONSTRAINTS
-- =============================================================================

-- 2.1 chat_conversaciones.contexto_tipo
--     Nota: el constraint sigue llamándose `chat_conv_contexto_tipo_check`
--     (nombre histórico que no cambia con el rename de la tabla).
ALTER TABLE chat_conversaciones DROP CONSTRAINT IF EXISTS chat_conv_contexto_tipo_check;
ALTER TABLE chat_conversaciones ADD CONSTRAINT chat_conv_contexto_tipo_check
  CHECK (contexto_tipo IN ('negocio', 'marketplace', 'oferta', 'servicio', 'directo', 'notas'));

-- 2.2 notificaciones.tipo
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_tipo_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_tipo_check
  CHECK (tipo IN (
    'puntos_ganados', 'voucher_generado', 'voucher_cobrado',
    'nueva_oferta', 'nueva_recompensa', 'recompensa_desbloqueada',
    'cupon_asignado', 'cupon_revocado',
    'nuevo_cliente', 'voucher_pendiente', 'stock_bajo',
    'nueva_resena', 'sistema', 'nuevo_marketplace', 'nuevo_servicio',
    'alerta_seguridad'
  ));

-- 2.3 notificaciones.referencia_tipo
ALTER TABLE notificaciones DROP CONSTRAINT IF EXISTS notificaciones_referencia_tipo_check;
ALTER TABLE notificaciones ADD CONSTRAINT notificaciones_referencia_tipo_check
  CHECK (referencia_tipo IS NULL OR referencia_tipo IN (
    'transaccion', 'voucher', 'oferta', 'recompensa', 'resena',
    'cupon', 'marketplace', 'servicio', 'alerta'
  ));

-- 2.4 votos.entity_type
ALTER TABLE votos DROP CONSTRAINT IF EXISTS votos_entity_type_check;
ALTER TABLE votos ADD CONSTRAINT votos_entity_type_check
  CHECK (entity_type IN ('sucursal', 'articulo', 'publicacion', 'oferta', 'servicio'));

-- 2.5 guardados.entity_type
ALTER TABLE guardados DROP CONSTRAINT IF EXISTS guardados_entity_type_check;
ALTER TABLE guardados ADD CONSTRAINT guardados_entity_type_check
  CHECK (entity_type IN ('oferta', 'servicio'));

-- 2.6 metricas_entidad.entity_type
ALTER TABLE metricas_entidad DROP CONSTRAINT IF EXISTS metricas_entidad_type_check;
ALTER TABLE metricas_entidad ADD CONSTRAINT metricas_entidad_type_check
  CHECK (entity_type IN ('sucursal', 'articulo', 'publicacion', 'oferta', 'servicio'));

-- 2.7 promociones_pagadas.tipo_entidad
ALTER TABLE promociones_pagadas DROP CONSTRAINT IF EXISTS promociones_pagadas_tipo_entidad_check;
ALTER TABLE promociones_pagadas ADD CONSTRAINT promociones_pagadas_tipo_entidad_check
  CHECK (tipo_entidad IN ('marketplace', 'oferta', 'servicio', 'negocio'));

-- 2.8 carrito.tipo_seccion (sólo quedan secciones públicas v3 + categoría
--     "negocios_locales" y "promociones" que ya existían y sí aplican).
ALTER TABLE carrito DROP CONSTRAINT IF EXISTS carrito_tipo_seccion_check;
ALTER TABLE carrito ADD CONSTRAINT carrito_tipo_seccion_check
  CHECK (tipo_seccion IN ('marketplace', 'negocios_locales', 'promociones'));

-- =============================================================================
-- 3) DROP CASCADE DE TABLAS DINAMICAS
-- =============================================================================
-- Orden importa: child tables primero. CASCADE limpia cualquier FK residual
-- (los enums ya no aceptan 'dinamica'/'rifa', así que no quedan refs lógicas).

DROP TABLE IF EXISTS dinamica_participaciones CASCADE;
DROP TABLE IF EXISTS dinamica_premios       CASCADE;
DROP TABLE IF EXISTS dinamicas              CASCADE;

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN (correr a mano si se quiere validar)
-- =============================================================================
--
-- SELECT contexto_tipo, COUNT(*) FROM chat_conversaciones GROUP BY 1;
-- SELECT tipo, COUNT(*) FROM notificaciones GROUP BY 1;
-- SELECT entity_type, COUNT(*) FROM votos GROUP BY 1;
-- SELECT entity_type, COUNT(*) FROM guardados GROUP BY 1;
-- SELECT entity_type, COUNT(*) FROM metricas_entidad GROUP BY 1;
-- SELECT tipo_entidad, COUNT(*) FROM promociones_pagadas GROUP BY 1;
-- SELECT tipo_seccion, COUNT(*) FROM carrito GROUP BY 1;
-- SELECT to_regclass('dinamicas') AS dinamicas_existe;  -- debe ser NULL
