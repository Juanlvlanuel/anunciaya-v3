-- ============================================================================
-- Migración one-shot: sembrar 'comision_escalera' en configuracion_sistema
-- ----------------------------------------------------------------------------
-- Módulo Configuración del Panel (Fase 2). Deja la escalera de comisiones con un
-- valor explícito en BD (en vez de mostrarse como "valor por defecto").
--
-- OPCIONAL: si no la corres, la pantalla muestra el default y la PRIMERA edición
-- desde el Panel siembra la fila igual (UPSERT). Correrla solo adelanta eso.
--
-- Idempotente: ON CONFLICT (clave) DO NOTHING — no pisa el valor si ya existe.
-- Correr en DEV y en PROD (las 2 Supabase).
-- ============================================================================

INSERT INTO configuracion_sistema (clave, valor, tipo, descripcion, categoria, unidad, valor_minimo, valor_maximo)
VALUES (
    'comision_escalera',
    '[{"min":0,"max":9,"montoPorActivo":0},{"min":10,"max":24,"montoPorActivo":30},{"min":25,"max":null,"montoPorActivo":50}]',
    'json',
    'Tramos por número de negocios activos → monto fijo por activo al mes. La comisión recurrente del vendedor = # activos × monto del tramo.',
    'pagos',
    NULL,
    NULL,
    NULL
)
ON CONFLICT (clave) DO NOTHING;

-- Verificación:
-- SELECT clave, valor, tipo, categoria FROM configuracion_sistema WHERE clave = 'comision_escalera';
