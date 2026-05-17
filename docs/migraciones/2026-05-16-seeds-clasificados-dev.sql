-- =============================================================================
-- 2026-05-16: Seeds DEV de Clasificados — categorías variadas + 1 urgente
-- =============================================================================
--
-- TEMPORAL para validar visualmente el widget `ClasificadosWidget`. Cuando el
-- Wizard de publicar (Sprint 4) esté listo, BORRAR estas filas con:
--
--   DELETE FROM servicios_publicaciones
--   WHERE titulo IN (
--     'Busco plomero urgente — fuga de agua',
--     'Necesito mariachi para fiesta sorpresa',
--     'Cuidador para mi perro este fin de semana',
--     'Mudanza pequeña — 1 cama y closet',
--     'Tutor de inglés para mi hijo'
--   );
--
-- INSTRUCCIONES:
--
-- 1) Obtén tu usuario_id ejecutando en Supabase:
--      SELECT id FROM usuarios WHERE correo = 'tu-correo@ejemplo.com';
--
-- 2) Reemplaza TODAS las apariciones de `<TU_USUARIO_ID>` abajo por ese UUID.
--
-- 3) Ejecuta el archivo completo en Supabase SQL Editor.
--
-- NOTAS:
--  - Coordenadas alrededor del centro de Puerto Peñasco.
--  - Distintas categorías para que el tag strip del widget tenga variedad.
--  - 1 publicación marcada `urgente=true` para validar el eyebrow rojo.
--  - CIUDAD: usa 'Puerto Peñasco' (SIN ", Sonora") porque el GPS store del
--    frontend (`useGpsStore.ciudad.nombre`) devuelve la versión corta. El
--    feed filtra con `WHERE ciudad = $ciudad` y un mismatch hace que las
--    publicaciones no aparezcan. Aprendizaje del 2026-05-16.
-- =============================================================================

-- ─── 0) UPDATE del seed existente "Busco fotógrafo para boda" ────────────────
-- Ya estaba sembrado por `2026-05-15-seeds-servicios-dev.sql`. Le asignamos
-- categoría 'eventos' para que aparezca en el filtro correcto del widget.
UPDATE servicios_publicaciones
SET categoria = 'eventos'
WHERE titulo = 'Busco fotógrafo para boda'
  AND modo = 'solicito';

-- =============================================================================
-- 1) URGENTE — plomero por fuga
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    categoria, urgente,
    confirmaciones, estado, expira_at
) VALUES (
    'b8bed800-703d-48eb-bc4c-f77450a05735',
    'solicito', 'solicito', 'servicio-puntual',
    'Busco plomero urgente — fuga de agua',
    'Tengo una fuga en la cocina que está empapando el piso. Necesito plomero HOY mismo en la tarde-noche. Cierre de paso ya hecho, solo falta reparar. Pago en efectivo al terminar.',
    '[]'::jsonb,
    0,
    '{"kind":"a-convenir"}'::jsonb,
    'presencial',
    ST_SetSRID(ST_MakePoint(-113.5450, 31.3155), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5460, 31.3148), 4326)::geography,
    'Puerto Peñasco',
    ARRAY['Centro']::varchar[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    NULL,
    ARRAY[]::varchar[],
    '{"min":500,"max":1500}'::jsonb,
    'hogar', true,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-16","aceptadasAt":"2026-05-16T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '7 days'
);

-- =============================================================================
-- 2) EVENTOS — mariachi
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    categoria, urgente,
    confirmaciones, estado, expira_at
) VALUES (
    'b8bed800-703d-48eb-bc4c-f77450a05735',
    'solicito', 'solicito', 'servicio-puntual',
    'Necesito mariachi para fiesta sorpresa',
    'Cumpleaños 50 de mi papá el próximo viernes 24. Necesito mariachi para 1 hora — entre 9pm y 10pm. Repertorio clásico (Volver Volver, El Rey, Las Mañanitas). Lugar: salón privado en Las Conchas.',
    '[]'::jsonb,
    0,
    '{"kind":"a-convenir"}'::jsonb,
    'presencial',
    ST_SetSRID(ST_MakePoint(-113.5495, 31.3105), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5505, 31.3110), 4326)::geography,
    'Puerto Peñasco',
    ARRAY['Las Conchas']::varchar[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    NULL,
    ARRAY[]::varchar[],
    '{"min":2500,"max":4500}'::jsonb,
    'eventos', false,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-16","aceptadasAt":"2026-05-16T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '14 days'
);

-- =============================================================================
-- 3) MASCOTAS — cuidador fin de semana
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    categoria, urgente,
    confirmaciones, estado, expira_at
) VALUES (
    'b8bed800-703d-48eb-bc4c-f77450a05735',
    'solicito', 'solicito', 'servicio-puntual',
    'Cuidador para mi perro este fin de semana',
    'Necesito que alguien cuide a Maxi (labrador, 4 años, súper noble) este viernes a domingo en mi casa o en la suya. 3 noches. Es muy tranquilo, ya está entrenado, solo necesita compañía y 2 paseos al día.',
    '[]'::jsonb,
    0,
    '{"kind":"a-convenir"}'::jsonb,
    'presencial',
    ST_SetSRID(ST_MakePoint(-113.5420, 31.3170), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5435, 31.3175), 4326)::geography,
    'Puerto Peñasco',
    ARRAY['Centro', 'Cholla']::varchar[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    NULL,
    ARRAY[]::varchar[],
    '{"min":800,"max":1200}'::jsonb,
    'cuidados', false,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-16","aceptadasAt":"2026-05-16T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '5 days'
);

-- =============================================================================
-- 4) MUDANZAS — mudanza pequeña
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    categoria, urgente,
    confirmaciones, estado, expira_at
) VALUES (
    'b8bed800-703d-48eb-bc4c-f77450a05735',
    'solicito', 'solicito', 'servicio-puntual',
    'Mudanza pequeña — 1 cama y closet',
    'Me cambio de departamento dentro del mismo edificio (3er a 5to piso). Solo cama matrimonial, un closet desarmable y 6 cajas. Necesito 2 personas + camioneta o cargador. Sábado en la mañana, ~2 horas de trabajo.',
    '[]'::jsonb,
    0,
    '{"kind":"a-convenir"}'::jsonb,
    'presencial',
    ST_SetSRID(ST_MakePoint(-113.5400, 31.3130), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5410, 31.3140), 4326)::geography,
    'Puerto Peñasco',
    ARRAY['Centro']::varchar[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    NULL,
    ARRAY[]::varchar[],
    '{"min":600,"max":1000}'::jsonb,
    'hogar', false,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-16","aceptadasAt":"2026-05-16T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '10 days'
);

-- =============================================================================
-- 5) TUTORÍAS — inglés
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    categoria, urgente,
    confirmaciones, estado, expira_at
) VALUES (
    'b8bed800-703d-48eb-bc4c-f77450a05735',
    'solicito', 'solicito', 'servicio-puntual',
    'Tutor de inglés para mi hijo',
    'Mi hijo tiene 14 años y va atrasado en inglés. Necesito tutor 2 veces por semana, 1 hora cada sesión. Nivel intermedio (ya conoce verbos básicos). Idealmente alguien con experiencia en adolescentes y paciencia.',
    '[]'::jsonb,
    0,
    '{"kind":"a-convenir"}'::jsonb,
    'hibrido',
    ST_SetSRID(ST_MakePoint(-113.5470, 31.3145), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5480, 31.3155), 4326)::geography,
    'Puerto Peñasco',
    ARRAY['Centro', 'Las Conchas']::varchar[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    'Tardes después de 5pm',
    ARRAY['mar','jue']::varchar[],
    '{"min":250,"max":400}'::jsonb,
    'cuidados', false,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-16","aceptadasAt":"2026-05-16T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '30 days'
);

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- SELECT titulo, categoria, urgente, estado
-- FROM servicios_publicaciones
-- WHERE modo = 'solicito'
-- ORDER BY urgente DESC, created_at DESC;
