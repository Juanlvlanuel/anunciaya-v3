-- 2026-07-17 · ScanYA sin CardYA: cupones y sellos sin sistema de puntos
-- ==============================================================================
-- Contexto: `participa_puntos` dejó de ser el portero de ScanYA. Un negocio puede
-- usar ScanYA para registrar ventas, validar cupones y sellar tarjetas SIN dar
-- puntos. El campo ahora gatea únicamente el cálculo de puntos en otorgarPuntos().
--
-- Esta migración hace dos cosas:
--
--   1) Alinea el DEFAULT de `negocios.participa_puntos` con la realidad del código.
--      La columna decía DEFAULT true, pero los dos únicos INSERT de negocio
--      (upgrade vía Stripe y alta manual del Panel) siempre pasan false explícito,
--      y el Paso 7 del onboarding nace apagado. El default true era letra muerta
--      y engañosa: nadie debe dar puntos sin haberlo elegido.
--      NO toca datos existentes — solo el default de filas futuras.
--
--   2) Crea la fila de `puntos_configuracion` faltante a los negocios que dijeron
--      "no participo" en el onboarding (antes solo se creaba si participaban).
--      Sin esta fila, activar CardYA después dejaba a ScanYA rechazando ventas con
--      "el sistema de puntos no está configurado". `activo` sigue a participa_puntos.
--      Los defaults son los mismos que usa asegurarConfiguracionPuntos()
--      en apps/api/src/services/negocioManagement.service.ts — si cambian allá,
--      cambian aquí.
--
-- Aditivo e idempotente (ON CONFLICT DO NOTHING) → seguro de aplicar en vivo.
-- Correr en DEV y PROD.

BEGIN;

-- 1) Default alineado con el código
ALTER TABLE negocios
  ALTER COLUMN participa_puntos SET DEFAULT false;

-- 2) Config faltante para los negocios sin CardYA
INSERT INTO puntos_configuracion (
  negocio_id,
  puntos_por_peso,
  minimo_compra,
  dias_expiracion_puntos,
  dias_expiracion_voucher,
  validar_horario,
  horario_inicio,
  horario_fin,
  activo,
  niveles_activos,
  nivel_bronce_min,
  nivel_bronce_max,
  nivel_bronce_multiplicador,
  nivel_plata_min,
  nivel_plata_max,
  nivel_plata_multiplicador,
  nivel_oro_min,
  nivel_oro_multiplicador
)
SELECT
  n.id,
  1.0,
  0,
  90,
  30,
  true,
  '09:00:00',
  '22:00:00',
  n.participa_puntos,   -- activo sigue a la decisión del comerciante
  false,                -- niveles nacen apagados; el comerciante los activa
  0,
  999,
  1.0,
  1000,
  4999,
  1.2,
  5000,
  1.5
FROM negocios n
WHERE NOT EXISTS (
  SELECT 1 FROM puntos_configuracion pc WHERE pc.negocio_id = n.id
)
ON CONFLICT (negocio_id) DO NOTHING;

COMMIT;

-- Verificación (correr aparte, debe devolver 0 filas):
--   SELECT n.id, n.nombre
--   FROM negocios n
--   LEFT JOIN puntos_configuracion pc ON pc.negocio_id = n.id
--   WHERE pc.id IS NULL;
--
-- Nota: NO se sincroniza `activo` de las filas que ya existían. Un negocio que
-- tuvo CardYA y lo apagó puede quedar con participa_puntos=false y activo=true;
-- es inofensivo (otorgarPuntos solo mira `activo` cuando participa_puntos=true)
-- y tocarlo podría afectar otras lecturas de puntos_configuracion.activo.
-- La próxima vez que use el toggle, asegurarConfiguracionPuntos() lo alinea.
