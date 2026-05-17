-- =============================================================================
-- 2026-05-15: Seeds DEV de Servicios — 5 publicaciones de ejemplo
-- =============================================================================
--
-- Este archivo es **TEMPORAL** y de uso EXCLUSIVO para desarrollo. Sirve para
-- validar visualmente el Sprint 2 (Feed) y Sprint 3 (Detalle) de Servicios
-- antes de que el Wizard de publicar (Sprint 4) esté listo.
--
-- Cuando el Wizard esté operativo, BORRAR estas filas con:
--   DELETE FROM servicios_publicaciones
--   WHERE id IN (
--     SELECT id FROM servicios_publicaciones
--     WHERE titulo IN (
--       'Plomería residencial 24h',
--       'Diseño web para negocios locales',
--       'Pastelería para eventos y XV',
--       'Mesero(a) turno noche',
--       'Busco fotógrafo para boda'
--     )
--   );
--
-- INSTRUCCIONES:
--
-- 1) Obtén tu usuario_id ejecutando en Supabase:
--      SELECT id, correo, nombre FROM usuarios WHERE correo = 'tu-correo@ejemplo.com';
--    Copia el `id` (UUID).
--
-- 2) Reemplaza TODAS las apariciones de `<TU_USUARIO_ID>` abajo por ese UUID
--    (búsqueda y reemplazo).
--
-- 3) Ejecuta el archivo completo en Supabase SQL Editor.
--
-- 4) Abre `/servicios` y deberías ver las 5 publicaciones en el feed. Click
--    en cualquiera te abre el detalle (Sprint 3).
--
-- NOTAS:
--  - Coordenadas: centro de Puerto Peñasco, Sonora (lat ≈ 31.3145, lng ≈ -113.5455)
--    con pequeñas variaciones para que se vean dispersas en el mapa.
--  - `ubicacion_aproximada` está manualmente desplazada — en producción el
--    helper `aleatorizarCoordenada` hace este offset al crear.
--  - Las 5 publicaciones se publican como si las hubiera creado el mismo
--    usuario (tú). En producción cada usuario crea las suyas.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1) SERVICIO-PERSONA — Plomería residencial 24h
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    confirmaciones, estado, expira_at
) VALUES (
    '<TU_USUARIO_ID>',
    'ofrezco', 'servicio-persona', 'servicio-personal',
    'Plomería residencial 24h',
    'Servicios de plomería para casa habitación y locales comerciales. Reparación de fugas, instalación de tuberías, destapado de drenajes. Emergencias 24/7. 10 años de experiencia, atención inmediata y trabajo garantizado.',
    '[]'::jsonb,
    0,
    '{"kind":"hora","monto":350,"moneda":"MXN"}'::jsonb,
    'presencial',
    ST_SetSRID(ST_MakePoint(-113.5440, 31.3150), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5455, 31.3160), 4326)::geography,
    'Puerto Peñasco, Sonora',
    ARRAY['Centro', 'Las Conchas']::varchar[],
    ARRAY['Plomería', 'Reparación de tuberías', 'Instalación', 'Emergencia 24h', 'Destapado de drenajes']::text[],
    ARRAY[]::text[],
    NULL,
    ARRAY[]::varchar[],
    NULL,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-15","aceptadasAt":"2026-05-15T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '30 days'
);

-- =============================================================================
-- 2) SERVICIO-PERSONA — Diseño web para negocios locales
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    confirmaciones, estado, expira_at
) VALUES (
    '<TU_USUARIO_ID>',
    'ofrezco', 'servicio-persona', 'servicio-personal',
    'Diseño web para negocios locales',
    'Diseño y desarrollo de páginas web profesionales para negocios de Peñasco. Sitios responsivos, optimizados para móvil, con integración a redes sociales y WhatsApp. Entrega en 7-10 días. Incluye dominio y hosting del primer año.',
    '[]'::jsonb,
    0,
    '{"kind":"fijo","monto":4500,"moneda":"MXN"}'::jsonb,
    'remoto',
    ST_SetSRID(ST_MakePoint(-113.5400, 31.3120), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5380, 31.3110), 4326)::geography,
    'Puerto Peñasco, Sonora',
    ARRAY['Toda la ciudad']::varchar[],
    ARRAY['React', 'Diseño UX', 'Tailwind', 'Mobile-first', 'SEO local']::text[],
    ARRAY[]::text[],
    NULL,
    ARRAY[]::varchar[],
    NULL,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-15","aceptadasAt":"2026-05-15T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '30 days'
);

-- =============================================================================
-- 3) SERVICIO-PERSONA — Pastelería para eventos
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    confirmaciones, estado, expira_at
) VALUES (
    '<TU_USUARIO_ID>',
    'ofrezco', 'servicio-persona', 'servicio-personal',
    'Pastelería para eventos y XV',
    'Pasteles personalizados para bodas, XV años, bautizos y eventos especiales. Cupcakes, postres y mesas de dulces. Más de 5 años decorando los momentos más importantes de tu familia. Entregas a domicilio sin costo en toda la ciudad.',
    '[]'::jsonb,
    0,
    '{"kind":"rango","min":800,"max":3000,"moneda":"MXN"}'::jsonb,
    'presencial',
    ST_SetSRID(ST_MakePoint(-113.5470, 31.3170), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5460, 31.3180), 4326)::geography,
    'Puerto Peñasco, Sonora',
    ARRAY['Centro', 'Cholla']::varchar[],
    ARRAY['Postres XV', 'Pasteles de boda', 'Catering', 'Mesas de dulces', 'Cupcakes']::text[],
    ARRAY[]::text[],
    NULL,
    ARRAY[]::varchar[],
    NULL,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-15","aceptadasAt":"2026-05-15T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '30 days'
);

-- =============================================================================
-- 4) VACANTE-EMPRESA — Mesero(a) turno noche
-- =============================================================================
-- Nota: en producción esta vendría de BS Vacantes (Sprint 8). Para el seed
-- la creamos como si el mismo usuario fuera un negocio. El frontend la
-- renderizará como CardVacante (banda sky con logo + verificado).
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    confirmaciones, estado, expira_at
) VALUES (
    '<TU_USUARIO_ID>',
    'solicito', 'vacante-empresa', 'vacante-empresa',
    'Mesero(a) turno noche',
    'Restaurante Aurora en el centro de Peñasco busca personal de meseros para el turno nocturno. Sueldo base + propinas (promedio total $8,500-$11,000/mes). Ambiente joven, buena onda y crecimiento real. Aplican ambos sexos.',
    '[]'::jsonb,
    0,
    '{"kind":"mensual","monto":8500,"moneda":"MXN"}'::jsonb,
    'presencial',
    ST_SetSRID(ST_MakePoint(-113.5430, 31.3140), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5440, 31.3130), 4326)::geography,
    'Puerto Peñasco, Sonora',
    ARRAY['Centro']::varchar[],
    ARRAY[]::text[],
    ARRAY['Experiencia mínima 1 año en restaurantes', 'Disponibilidad nocturna (8pm-2am)', 'Buena presentación', 'Trabajo en equipo', 'Mayor de edad']::text[],
    '8:00 PM a 2:00 AM',
    ARRAY['mie','jue','vie','sab','dom']::varchar(3)[],
    NULL,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-15","aceptadasAt":"2026-05-15T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '30 days'
);

-- =============================================================================
-- 5) SOLICITO — Busco fotógrafo para boda
-- =============================================================================
INSERT INTO servicios_publicaciones (
    usuario_id, modo, tipo, subtipo,
    titulo, descripcion, fotos, foto_portada_index,
    precio, modalidad,
    ubicacion, ubicacion_aproximada, ciudad, zonas_aproximadas,
    skills, requisitos, horario, dias_semana, presupuesto,
    confirmaciones, estado, expira_at
) VALUES (
    '<TU_USUARIO_ID>',
    'solicito', 'solicito', 'servicio-puntual',
    'Busco fotógrafo para boda',
    'Necesito fotógrafo profesional para boda el sábado 20 de junio en la playa de Las Conchas. Cobertura completa (ceremonia, recepción, fotos de pareja). Aprox 6 horas de cobertura + álbum digital editado. Si tienes portafolio, mejor.',
    '[]'::jsonb,
    0,
    '{"kind":"a-convenir"}'::jsonb,
    'presencial',
    ST_SetSRID(ST_MakePoint(-113.5500, 31.3100), 4326)::geography,
    ST_SetSRID(ST_MakePoint(-113.5510, 31.3105), 4326)::geography,
    'Puerto Peñasco, Sonora',
    ARRAY['Las Conchas']::varchar[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    NULL,
    ARRAY[]::varchar[],
    '{"min":3500,"max":5000}'::jsonb,
    '{"legal":true,"verdadera":true,"coordinacion":true,"version":"v1-2026-05-15","aceptadasAt":"2026-05-15T12:00:00.000Z"}'::jsonb,
    'activa',
    NOW() + INTERVAL '30 days'
);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN — ejecuta esto después para confirmar que se insertaron:
-- =============================================================================
-- SELECT id, modo, tipo, titulo, estado, ciudad FROM servicios_publicaciones
-- WHERE titulo IN (
--   'Plomería residencial 24h',
--   'Diseño web para negocios locales',
--   'Pastelería para eventos y XV',
--   'Mesero(a) turno noche',
--   'Busco fotógrafo para boda'
-- )
-- ORDER BY created_at DESC;
