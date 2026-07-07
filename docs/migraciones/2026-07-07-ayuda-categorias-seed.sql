-- =============================================================================
-- Seed de CATEGORÍAS del Centro de Ayuda ("Ayuda y Tutoriales")
-- -----------------------------------------------------------------------------
-- Crea las 22 categorías que agrupan los ~58 videos del checklist maestro
-- (docs/arquitectura/Centro_Ayuda.md §8), repartidas en las 3 secciones:
--   • AnunciaYA        → app='anunciaya', audiencia='cliente'      (8)
--   • Business Studio  → app='anunciaya', audiencia='comerciante'  (10)
--   • ScanYA           → app='scanya',    audiencia='comerciante'  (4)
--
-- IDEMPOTENTE: solo inserta las que aún NO existen (mismo nombre + app +
-- audiencia). No borra, no actualiza ni toca las categorías/videos que ya
-- tengas. Se puede correr varias veces sin duplicar.
--
-- Correr en DEV y en PROD (las 2 Supabase).
-- `icono` = nombre Iconify (mismo formato que el campo del Panel, p. ej. ph:gift-fill).
-- =============================================================================

INSERT INTO ayuda_categorias (nombre, icono, app, audiencia, orden, activo)
SELECT v.nombre, v.icono, v.app, v.audiencia, v.orden, true
FROM (VALUES
  -- 👤 AnunciaYA (usuario / cliente) — visible para Personal y Comercial
  ('Primeros pasos',                'ph:rocket-launch-fill',    'anunciaya', 'cliente',     1),
  ('Encontrar negocios',            'ph:storefront-fill',       'anunciaya', 'cliente',     2),
  ('MarketPlace',                   'ph:shopping-bag-fill',     'anunciaya', 'cliente',     3),
  ('Ofertas y cupones',             'ph:ticket-fill',           'anunciaya', 'cliente',     4),
  ('Servicios',                     'ph:wrench-fill',           'anunciaya', 'cliente',     5),
  ('CardYA',                        'ph:gift-fill',             'anunciaya', 'cliente',     6),
  ('ChatYA',                        'ph:chat-circle-fill',      'anunciaya', 'cliente',     7),
  ('Mi cuenta y seguridad',         'ph:shield-check-fill',     'anunciaya', 'cliente',     8),
  -- 🏪 Business Studio (comerciante) — solo Comercial
  ('Empezar en Business Studio',    'ph:rocket-launch-fill',    'anunciaya', 'comerciante', 1),
  ('Mi catálogo',                   'ph:package-fill',          'anunciaya', 'comerciante', 2),
  ('Atraer clientes',               'ph:megaphone-fill',        'anunciaya', 'comerciante', 3),
  ('Puntos y recompensas',          'ph:star-fill',             'anunciaya', 'comerciante', 4),
  ('Clientes, opiniones y alertas', 'ph:users-three-fill',      'anunciaya', 'comerciante', 5),
  ('ChatYA para tu negocio',        'ph:chat-circle-dots-fill', 'anunciaya', 'comerciante', 6),
  ('Mi equipo',                     'ph:users-fill',            'anunciaya', 'comerciante', 7),
  ('Empleo (vacantes)',             'ph:briefcase-fill',        'anunciaya', 'comerciante', 8),
  ('Análisis',                      'ph:chart-line-fill',       'anunciaya', 'comerciante', 9),
  ('Membresía y pagos',             'ph:credit-card-fill',      'anunciaya', 'comerciante', 10),
  -- 📟 ScanYA (comerciante) — solo Comercial
  ('Empezar en ScanYA',             'ph:sign-in-fill',          'scanya',    'comerciante', 1),
  ('Operar la caja',                'ph:cash-register-fill',    'scanya',    'comerciante', 2),
  ('Recompensas',                   'ph:gift-fill',             'scanya',    'comerciante', 3),
  ('Avanzado',                      'ph:gear-fill',             'scanya',    'comerciante', 4)
) AS v(nombre, icono, app, audiencia, orden)
WHERE NOT EXISTS (
  SELECT 1 FROM ayuda_categorias c
  WHERE c.nombre = v.nombre AND c.app = v.app AND c.audiencia = v.audiencia
);

-- Verificación (opcional): cuántas categorías hay por sección tras el seed.
-- SELECT app, audiencia, count(*) AS categorias
-- FROM ayuda_categorias
-- GROUP BY app, audiencia
-- ORDER BY app, audiencia;
