-- =============================================================================
-- Seed de ARTÍCULOS del Centro de Ayuda ("Ayuda y Tutoriales")
-- -----------------------------------------------------------------------------
-- Crea los 58 artículos del checklist maestro (docs/arquitectura/Centro_Ayuda.md §8),
-- uno por video, en estado BORRADOR y SIN video: solo queda subir el archivo a
-- cada uno desde el Panel (video_url / poster_url / duracion_seg / video_vertical
-- quedan vacíos; respuesta = los pasos, se escriben después).
--
-- CORRER DESPUÉS del seed de categorías (2026-07-07-ayuda-categorias-seed.sql):
-- cada artículo engancha a su categoría por (nombre + app + audiencia) con un JOIN,
-- así que la categoría debe existir y con el MISMO nombre. Si renombraste alguna,
-- ajusta el nombre aquí o ese artículo no se insertará.
--
-- IDEMPOTENTE: inserta solo los slugs que aún no existen (slug es UNIQUE).
-- publicado = false (borrador) · compartible_publico = true.
--
-- Correr en DEV y en PROD (las 2 Supabase).
-- =============================================================================

INSERT INTO ayuda_articulos (categoria_id, slug, pregunta, orden, publicado, compartible_publico)
SELECT c.id, v.slug, v.pregunta, v.orden, false, true
FROM (VALUES
  -- ── 👤 AnunciaYA (cliente) ─────────────────────────────────────────────────
  -- Primeros pasos
  ('que-es-anunciaya',            'Qué es AnunciaYA y cómo preguntarle a Peñasco',                          'Primeros pasos',        'anunciaya', 'cliente', 1),
  ('crea-tu-cuenta',              'Crea tu cuenta y verifica tu correo',                                    'Primeros pasos',        'anunciaya', 'cliente', 2),
  ('elige-tu-ciudad',             'Elige tu ciudad (y por qué cambia lo que ves)',                          'Primeros pasos',        'anunciaya', 'cliente', 3),
  ('instala-anunciaya',           'Instala AnunciaYA en tu teléfono',                                       'Primeros pasos',        'anunciaya', 'cliente', 4),
  ('recupera-tu-contrasena',      'Recupera tu contraseña',                                                 'Primeros pasos',        'anunciaya', 'cliente', 5),
  -- Encontrar negocios
  ('encuentra-negocios-cerca',    'Encuentra negocios cerca y ve si están abiertos',                        'Encontrar negocios',    'anunciaya', 'cliente', 1),
  ('mapa-y-filtros',              'Usa el mapa y los filtros (categoría, distancia, CardYA, domicilio)',     'Encontrar negocios',    'anunciaya', 'cliente', 2),
  ('perfil-de-negocio',           'Explora el perfil de un negocio: horarios, catálogo y ofertas',           'Encontrar negocios',    'anunciaya', 'cliente', 3),
  ('escribe-una-resena',          'Escribe una reseña de un negocio',                                       'Encontrar negocios',    'anunciaya', 'cliente', 4),
  -- MarketPlace
  ('compra-y-vende-marketplace',  'Compra y vende en MarketPlace (Vendo / Busco)',                          'MarketPlace',           'anunciaya', 'cliente', 1),
  ('publica-tu-articulo',         'Publica tu artículo con fotos, paso a paso',                             'MarketPlace',           'anunciaya', 'cliente', 2),
  ('administra-tus-publicaciones','Administra tus publicaciones (pausar, marcar vendido, editar)',          'MarketPlace',           'anunciaya', 'cliente', 3),
  ('preguntas-en-publicacion',    'Haz preguntas en una publicación',                                       'MarketPlace',           'anunciaya', 'cliente', 4),
  -- Ofertas y cupones
  ('encuentra-ofertas',           'Encuentra ofertas y aprovecha las de últimas horas',                     'Ofertas y cupones',     'anunciaya', 'cliente', 1),
  ('usa-mis-cupones',             'Usa Mis Cupones: revela y muestra el código en la tienda',               'Ofertas y cupones',     'anunciaya', 'cliente', 2),
  ('guarda-ofertas',              'Guarda ofertas para después',                                            'Ofertas y cupones',     'anunciaya', 'cliente', 3),
  -- Servicios
  ('encuentra-un-servicio',       'Encuentra un servicio, un empleo o solicita algo',                       'Servicios',             'anunciaya', 'cliente', 1),
  ('ofrece-un-servicio',          'Ofrece un servicio o publica una solicitud',                             'Servicios',             'anunciaya', 'cliente', 2),
  -- CardYA
  ('junta-puntos-cardya',         'Junta puntos con CardYA y canjea recompensas',                           'CardYA',                'anunciaya', 'cliente', 1),
  ('historial-y-vouchers',        'Revisa tu historial de compras y tus vouchers',                          'CardYA',                'anunciaya', 'cliente', 2),
  -- ChatYA
  ('contacta-desde-publicacion',  'Contacta a un vendedor o negocio desde una publicación y reclama cupones','ChatYA',               'anunciaya', 'cliente', 1),
  ('conoce-chatya',               'Conoce ChatYA: envía fotos, audios, responde y busca mensajes',          'ChatYA',                'anunciaya', 'cliente', 2),
  ('reenvia-fija-reacciona',      'Reenvía, fija y reacciona a mensajes',                                   'ChatYA',                'anunciaya', 'cliente', 3),
  -- Mi cuenta y seguridad
  ('edita-tu-perfil',             'Edita tu perfil: foto, datos y ciudad',                                  'Mi cuenta y seguridad', 'anunciaya', 'cliente', 1),
  ('cambia-contrasena-2fa',       'Cambia tu contraseña y activa la verificación en dos pasos (2FA)',        'Mi cuenta y seguridad', 'anunciaya', 'cliente', 2),
  ('revisa-tus-guardados',        'Revisa tus Guardados (negocios, ofertas, artículos, servicios)',         'Mi cuenta y seguridad', 'anunciaya', 'cliente', 3),
  ('entiende-notificaciones',     'Entiende tus notificaciones',                                            'Mi cuenta y seguridad', 'anunciaya', 'cliente', 4),

  -- ── 🏪 Business Studio (comerciante) ───────────────────────────────────────
  -- Empezar en Business Studio
  ('da-de-alta-tu-negocio',       'Da de alta tu negocio (onboarding completo)',                            'Empezar en Business Studio', 'anunciaya', 'comerciante', 1),
  ('tour-business-studio',        'Tour de Business Studio: entiende tu Dashboard',                         'Empezar en Business Studio', 'anunciaya', 'comerciante', 2),
  ('completa-perfil-negocio',     'Completa el perfil de tu negocio (fotos, horarios, contacto, pagos)',     'Empezar en Business Studio', 'anunciaya', 'comerciante', 3),
  -- Mi catálogo
  ('sube-tu-primer-producto',     'Sube tu primer producto o servicio al catálogo',                         'Mi catálogo',           'anunciaya', 'comerciante', 1),
  ('destaca-oculta-duplica',      'Destaca, oculta o duplica productos entre sucursales',                    'Mi catálogo',           'anunciaya', 'comerciante', 2),
  -- Atraer clientes
  ('crea-tu-primera-oferta',      'Crea tu primera oferta (descuento, 2x1, envío gratis)',                   'Atraer clientes',       'anunciaya', 'comerciante', 1),
  ('crea-y-envia-cupon',          'Crea y envía un cupón privado a un cliente',                             'Atraer clientes',       'anunciaya', 'comerciante', 2),
  ('mide-desempeno-promociones',  'Mide el desempeño de tus promociones (vistas, clics, canjes)',            'Atraer clientes',       'anunciaya', 'comerciante', 3),
  -- Puntos y recompensas
  ('configura-puntos',            'Configura tu sistema de puntos y crea recompensas',                      'Puntos y recompensas',  'anunciaya', 'comerciante', 1),
  ('activa-niveles-sellos',       'Activa niveles (Bronce/Plata/Oro) y tarjetas de sellos',                  'Puntos y recompensas',  'anunciaya', 'comerciante', 2),
  -- Clientes, opiniones y alertas
  ('responde-opiniones',          'Responde las opiniones de tus clientes',                                 'Clientes, opiniones y alertas', 'anunciaya', 'comerciante', 1),
  ('conoce-tus-clientes',         'Conoce a tus clientes: niveles, puntos e historial',                      'Clientes, opiniones y alertas', 'anunciaya', 'comerciante', 2),
  ('revisa-tus-alertas',          'Revisa y resuelve tus alertas',                                          'Clientes, opiniones y alertas', 'anunciaya', 'comerciante', 3),
  -- ChatYA para tu negocio
  ('responde-clientes-chatya',    'Responde a tus clientes por ChatYA (desde BS y ScanYA) y ve su billetera','ChatYA para tu negocio', 'anunciaya', 'comerciante', 1),
  ('directorio-comercial',        'Usa el Directorio comercial de tu ciudad',                               'ChatYA para tu negocio', 'anunciaya', 'comerciante', 2),
  ('envia-cupones-por-chat',      'Envía cupones y ofertas por chat',                                       'ChatYA para tu negocio', 'anunciaya', 'comerciante', 3),
  -- Mi equipo
  ('agrega-empleados',            'Agrega empleados y asígnales permisos',                                  'Mi equipo',             'anunciaya', 'comerciante', 1),
  ('administra-sucursales',       'Administra tus sucursales y cambia entre ellas',                         'Mi equipo',             'anunciaya', 'comerciante', 2),
  -- Empleo (vacantes)
  ('publica-una-vacante',         'Publica una vacante y recibe candidatos',                                'Empleo (vacantes)',     'anunciaya', 'comerciante', 1),
  -- Análisis
  ('lee-y-exporta-reportes',      'Lee y exporta tus reportes (ventas, clientes, promociones)',              'Análisis',              'anunciaya', 'comerciante', 1),
  -- Membresía y pagos
  ('gestiona-tu-membresia',       'Gestiona tu membresía y tu método de cobro',                             'Membresía y pagos',     'anunciaya', 'comerciante', 1),
  ('paga-manualmente',            'Paga manualmente con comprobante o recupera tu tarjeta',                  'Membresía y pagos',     'anunciaya', 'comerciante', 2),

  -- ── 📟 ScanYA (comerciante) ────────────────────────────────────────────────
  -- Empezar en ScanYA
  ('entra-y-abre-turno',          'Entra a ScanYA y abre tu turno (dueño/gerente y empleado con PIN)',       'Empezar en ScanYA',     'scanya', 'comerciante', 1),
  -- Operar la caja
  ('registra-una-venta',          'Registra una venta y otorga puntos al cliente',                          'Operar la caja',        'scanya', 'comerciante', 1),
  ('canjea-voucher-cierra-turno', 'Canjea un voucher (QR o código) y cierra tu turno',                       'Operar la caja',        'scanya', 'comerciante', 2),
  ('ventas-sin-internet',         'Registra ventas sin internet (modo offline)',                            'Operar la caja',        'scanya', 'comerciante', 3),
  -- Recompensas
  ('gestiona-vouchers-clientes',  'Consulta y gestiona los vouchers de tus clientes',                       'Recompensas',           'scanya', 'comerciante', 1),
  -- Avanzado
  ('historial-del-turno',         'Consulta el historial del turno y filtra (período / empleado)',           'Avanzado',              'scanya', 'comerciante', 1),
  ('cambia-de-sucursal-scanya',   'Cambia de sucursal en ScanYA',                                           'Avanzado',              'scanya', 'comerciante', 2),
  ('responde-resenas-scanya',     'Responde reseñas desde ScanYA',                                          'Avanzado',              'scanya', 'comerciante', 3),
  ('instala-scanya',              'Instala ScanYA en tu tablet o teléfono',                                 'Avanzado',              'scanya', 'comerciante', 4)
) AS v(slug, pregunta, cat_nombre, cat_app, cat_audiencia, orden)
JOIN ayuda_categorias c
  ON c.nombre = v.cat_nombre AND c.app = v.cat_app AND c.audiencia = v.cat_audiencia
WHERE NOT EXISTS (SELECT 1 FROM ayuda_articulos a WHERE a.slug = v.slug);

-- Verificación (opcional): cuántos artículos quedaron por categoría.
-- SELECT c.nombre, c.app, c.audiencia, count(a.id) AS articulos
-- FROM ayuda_categorias c
-- LEFT JOIN ayuda_articulos a ON a.categoria_id = c.id
-- GROUP BY c.id, c.nombre, c.app, c.audiencia
-- ORDER BY c.app, c.audiencia, c.orden;
