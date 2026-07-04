-- =============================================================================
-- 2026-07-03: SEED DE PRUEBA (SOLO DEV) — Centro de Ayuda
-- =============================================================================
--
-- Datos de ejemplo para VER el Centro de Ayuda poblado en local/DEV y validar
-- el diseño. Audiencia 'cliente' de AnunciaYA. Sin videos reales (video_url NULL
-- → el reproductor muestra "Video próximamente"); los pasos van en Markdown.
--
-- ⚠️ NO correr en PRODUCCIÓN. Idempotente (ON CONFLICT DO NOTHING).
-- Para limpiar: DELETE FROM ayuda_categorias WHERE id IN (los 4 ids de abajo);
-- (los artículos caen por ON DELETE CASCADE).
-- =============================================================================

BEGIN;

INSERT INTO ayuda_categorias (id, nombre, icono, app, audiencia, orden, activo) VALUES
  ('aaaa1111-1111-4111-8111-111111111111', 'Primeros pasos',     'ph:sparkle-fill', 'anunciaya', 'cliente', 1, true),
  ('aaaa2222-2222-4222-8222-222222222222', 'Encontrar negocios', 'ph:map-pin-fill', 'anunciaya', 'cliente', 2, true),
  ('aaaa3333-3333-4333-8333-333333333333', 'MarketPlace',        'ph:package-fill', 'anunciaya', 'cliente', 3, true),
  ('aaaa4444-4444-4444-8444-444444444444', 'CardYA',             'ph:wallet-fill',  'anunciaya', 'cliente', 4, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ayuda_articulos (categoria_id, slug, pregunta, respuesta, orden, publicado) VALUES
  ('aaaa1111-1111-4111-8111-111111111111', 'que-es-anunciaya',
   'Qué es AnunciaYA y cómo preguntarle a Peñasco',
   E'1. Abre la app y escribe tu pregunta en **Pregúntale a Peñasco**.\n2. Coyo te responde con negocios, ofertas y servicios cerca de ti.\n3. Cambia entre **Comunidad** y **Mis preguntas** para ver más.', 1, true),

  ('aaaa2222-2222-4222-8222-222222222222', 'encuentra-negocios-cerca',
   'Encuentra negocios cerca y contáctalos',
   E'1. Entra a **Negocios** y usa el buscador o el mapa.\n2. Filtra por **cerca de mí**, categoría o los que están abiertos.\n3. Abre el negocio y contáctalo por **ChatYA** o WhatsApp.', 1, true),

  ('aaaa2222-2222-4222-8222-222222222222', 've-horarios-negocio',
   'Mira si un negocio está abierto y sus horarios',
   E'1. Abre el perfil del negocio.\n2. Revisa el estado **Abierto / Cerrado** y la tabla de horarios.', 2, true),

  ('aaaa3333-3333-4333-8333-333333333333', 'marketplace-compra-vende',
   'Compra y vende en MarketPlace',
   E'1. En **MarketPlace** cambia entre **Vendo** y **Busco**.\n2. Abre un artículo para ver fotos y precio.\n3. Haz una pregunta o contacta al vendedor por **ChatYA**.', 1, true),

  ('aaaa3333-3333-4333-8333-333333333333', 'marketplace-publica',
   'Publica tu artículo con fotos',
   E'1. Toca **+ Publicar**.\n2. Sube fotos, pon precio y descripción.\n3. Publica: tu artículo aparece en el feed de tu ciudad.', 2, true),

  ('aaaa4444-4444-4444-8444-444444444444', 'cardya-puntos-recompensas',
   'Junta puntos con CardYA y canjea recompensas',
   E'1. Abre **CardYA** desde el menú de tu perfil.\n2. Elige el negocio donde tienes puntos acumulados.\n3. Toca **Canjear** en la recompensa que quieras y muestra el código en la tienda.', 1, true),

  ('aaaa4444-4444-4444-8444-444444444444', 'cardya-historial',
   'Revisa tu historial y tus vouchers',
   E'1. En **CardYA** abre la pestaña de historial.\n2. Filtra por negocio o por tipo (compra / canje).\n3. Consulta tus vouchers activos y usados.', 2, true)
ON CONFLICT (slug) DO NOTHING;

-- ── ScanYA (audiencia 'comerciante') — para probar el drawer de ayuda de ScanYA ──
INSERT INTO ayuda_categorias (id, nombre, icono, app, audiencia, orden, activo) VALUES
  ('bbbb1111-1111-4111-8111-111111111111', 'Empezar en ScanYA', 'ph:sign-in-fill',       'scanya', 'comerciante', 1, true),
  ('bbbb2222-2222-4222-8222-222222222222', 'Operar la caja',    'ph:cash-register-fill', 'scanya', 'comerciante', 2, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO ayuda_articulos (categoria_id, slug, pregunta, respuesta, orden, publicado) VALUES
  ('bbbb1111-1111-4111-8111-111111111111', 'scanya-entra-abre-turno',
   'Entra a ScanYA y abre tu turno',
   E'1. Inicia sesión (dueño/gerente con correo, o empleado con **PIN**).\n2. Toca **Abrir turno** para empezar a operar la caja.', 1, true),

  ('bbbb2222-2222-4222-8222-222222222222', 'scanya-registra-venta',
   'Registra una venta y otorga puntos',
   E'1. Toca **Registrar venta**.\n2. Identifica al cliente por teléfono o alias.\n3. Ingresa el monto y el método de pago.\n4. Confirma: el cliente recibe sus puntos.', 1, true),

  ('bbbb2222-2222-4222-8222-222222222222', 'scanya-canjea-voucher',
   'Canjea un voucher (QR o código)',
   E'1. Abre **Vouchers**.\n2. Escanea el QR del cliente o ingresa el código de 6 dígitos.\n3. Confirma el canje de la recompensa.', 2, true)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

-- Verificar:
--   SELECT c.nombre, count(a.id) AS articulos
--   FROM ayuda_categorias c LEFT JOIN ayuda_articulos a ON a.categoria_id = c.id
--   WHERE c.app = 'anunciaya' AND c.audiencia = 'cliente'
--   GROUP BY c.nombre, c.orden ORDER BY c.orden;
