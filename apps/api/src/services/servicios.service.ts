/**
 * ============================================================================
 * SERVICIOS SERVICE — Sección pública Servicios (Sprint 1)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/servicios.service.ts
 *
 * PROPÓSITO:
 * Lógica de negocio del módulo Servicios v1. CRUD principal + feed + detalle +
 * mis-publicaciones + cambio de estado + soft delete + registrar vista +
 * presigned R2.
 *
 * Q&A vive en `services/servicios/preguntas.ts` (mismo patrón que MarketPlace).
 * Filtros de moderación llegarán en Sprint 4. Buscador en Sprint 6. Cron en
 * Sprint 7. Reseñas en Sprint 5.
 *
 * Doc maestro pendiente: docs/arquitectura/Servicios.md (Sprint 7 al cierre).
 * Migraciones: docs/migraciones/2026-05-15-servicios-base.sql.
 * Patrón calcado de: apps/api/src/services/marketplace.service.ts.
 *
 * Reglas críticas (NO romper):
 * - `ubicacion` (real) NUNCA se devuelve al frontend.
 * - `ubicacion_aproximada` se calcula al crear (offset uniforme en 500m) y
 *   queda fija. NO se recalcula en cada consulta.
 * - `expira_at` se setea SOLO al crear (NOW() + 30 días). UPDATE general NO la
 *   modifica; solo `/reactivar` (Sprint 7) lo puede modificar.
 * - `estado` sin 'vendida' — un servicio no se agota. Solo activa | pausada |
 *   eliminada (soft).
 * - Las fotos huérfanas se borran de R2 con `eliminarFotoServicioSiHuerfana`.
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { serviciosPublicaciones } from '../db/schemas/schema.js';
import { eliminarArchivo, generarPresignedUrl } from './r2.service.js';
import { aleatorizarCoordenada } from '../utils/aleatorizarUbicacion.js';
import { getZonaHorariaPorCiudad } from '../utils/zonaHoraria.js';
import { sqlExpiracionFinDeDia, TTL_DIAS_DEFAULT } from '../utils/expiracion.js';
import type {
    CrearPublicacionInput,
    ActualizarPublicacionInput,
    PrecioInput,
} from '../validations/servicios.schema.js';
import { CATEGORIAS_CLASIFICADO } from '../validations/servicios.schema.js';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

type Modo = 'ofrezco' | 'solicito';
type Tipo = 'servicio-persona' | 'vacante-empresa' | 'solicito';
type Modalidad = 'presencial' | 'remoto' | 'hibrido';
type Estado = 'activa' | 'pausada' | 'cerrada' | 'eliminada';
type TipoEmpleo = 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual';
type CategoriaClasificado = (typeof CATEGORIAS_CLASIFICADO)[number];

interface PresupuestoJSON {
    min: number;
    max: number;
}

export interface PublicacionRow {
    id: string;
    usuarioId: string;
    /** Sprint 8 — Sucursal del negocio (solo vacantes). NULL para servicios personales. */
    sucursalId: string | null;
    modo: Modo;
    tipo: Tipo;
    subtipo: string | null;
    titulo: string;
    descripcion: string;
    fotos: string[];
    fotoPortadaIndex: number;
    precio: PrecioInput;
    modalidad: Modalidad;
    ubicacionAproximada: { lat: number; lng: number };
    ciudad: string;
    zonasAproximadas: string[];
    skills: string[];
    requisitos: string[];
    horario: string | null;
    diasSemana: string[];
    /** Sprint 8 — Tipo de empleo (solo vacantes). NULL para servicios personales. */
    tipoEmpleo: TipoEmpleo | null;
    /** Sprint 8 — Beneficios de la vacante (max 8). Vacío para servicios personales. */
    beneficios: string[];
    presupuesto: PresupuestoJSON | null;
    /** Categoría del clasificado (solo modo='solicito'). NULL en `ofrezco`. */
    categoria: CategoriaClasificado | null;
    /** Pin al top + eyebrow rojo en el widget Clasificados. */
    urgente: boolean;
    estado: Estado;
    totalVistas: number;
    totalMensajes: number;
    totalGuardados: number;
    expiraAt: string;
    createdAt: string;
    updatedAt: string;
    // ───────────────────────────────────────────────────────────────────
    // Datos del negocio asociado (Sprint 9.3) — solo poblados cuando la
    // publicación es una vacante (`sucursal_id` no nulo) Y el SELECT hizo
    // el LEFT JOIN. `obtenerFeed` y `obtenerFeedInfinito` los devuelven;
    // las queries del detalle usan el JOIN propio de `obtenerPublicacion`.
    // ───────────────────────────────────────────────────────────────────
    /** ID del negocio que publicó la vacante. NULL para servicios-persona. */
    negocioId: string | null;
    /** Nombre del negocio (ej. "Imprenta FindUS"). NULL para servicios. */
    negocioNombre: string | null;
    /** URL del logo del negocio. NULL para servicios. */
    negocioLogo: string | null;
    /** Nombre de la sucursal (ej. "Matriz", "Sucursal Norte"). */
    sucursalNombre: string | null;
    /** Portada del local — foto grande del exterior/interior. Usada como
     *  hero de la vacante en cards del feed y en el detalle. */
    sucursalPortada: string | null;
    /** Foto de perfil de la sucursal (avatar del chat). */
    sucursalFotoPerfil: string | null;
}

export interface PublicacionConOferenteRow extends PublicacionRow {
    /**
     * Ubicación EXACTA del local (sin offset). Sprint 9.3: solo se
     * incluye cuando `tipo === 'vacante-empresa'` — los negocios son
     * entidades verificadas y su dirección ya es pública en la sección
     * Negocios. Para servicios-persona y solicitudes-de-persona NO se
     * incluye (privacidad del oferente / cliente — se mantiene la
     * `ubicacionAproximada` con offset random de 500m).
     */
    ubicacionExacta?: { lat: number; lng: number };
    /**
     * Sprint 9.3: true cuando el usuario actual tiene esta publicación
     * en su lista de guardados. false para visitantes anónimos o
     * usuarios sin guardado. Lo usa el bookmark del detalle para
     * arrancar con el estado real desde el primer render.
     */
    guardado: boolean;
    oferente: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
        ciudad: string | null;
        /** Nullable: el FE oculta el botón WhatsApp si es null. */
        telefono: string | null;
        ultimaConexion: string | null;
        tiempoRespuestaMinutos: number | null;
        // Datos del negocio asociado al oferente (solo aplica cuando es
        // vacante-empresa; null para servicios publicados por personas).
        negocioId: string | null;
        negocioNombre: string | null;
        negocioLogo: string | null;
        sucursalNombre: string | null;
        sucursalFotoPerfil: string | null;
        /** WhatsApp de la sucursal — distinto al telefono del usuario dueño
         *  (que es del dueño personal, no del negocio). Se usa para el
         *  botón WhatsApp en el detalle de vacante-empresa (público y
         *  privado). El FE oculta el botón si es null. */
        sucursalWhatsapp: string | null;
        /** Portada del local (foto grande de la sucursal) — usada como hero
         *  en el detalle de vacante-empresa. */
        sucursalPortada: string | null;
        sucursalEsPrincipal: boolean | null;
        /** Total de sucursales activas del negocio (0 si no hay negocio asociado). */
        totalSucursales: number;
    };
}

export interface PublicacionFeedRow extends PublicacionRow {
    distanciaMetros: number | null;
}

// Intersección con Record<string, unknown> para satisfacer el constraint de
// `db.execute<T>` (que exige `Record<string, unknown>`). Los campos
// declarados conservan su tipado estricto; el index signature solo deja pasar
// accesos a propiedades dinámicas como `unknown` (útil para campos extra que
// los SELECT enriquecidos agreguen al vuelo).
type RawPublicacionDb = {
    id: string;
    usuario_id: string;
    sucursal_id: string | null;
    modo: string;
    tipo: string;
    subtipo: string | null;
    titulo: string;
    descripcion: string;
    fotos: string[];
    foto_portada_index: number;
    precio: PrecioInput;
    modalidad: string;
    lat: number;
    lng: number;
    ciudad: string;
    zonas_aproximadas: string[];
    skills: string[];
    requisitos: string[];
    horario: string | null;
    dias_semana: string[];
    tipo_empleo: string | null;
    beneficios: string[];
    presupuesto: PresupuestoJSON | null;
    categoria: string | null;
    urgente: boolean;
    estado: string;
    total_vistas: number;
    total_mensajes: number;
    total_guardados: number;
    expira_at: string;
    created_at: string;
    updated_at: string;
    // ───────────────────────────────────────────────────────────────────
    // Datos del negocio asociado — opcionales, solo se llenan cuando la
    // publicación es una vacante (`sucursal_id` no nulo). El frontend los
    // usa en las cards del feed para mostrar logo/portada del negocio como
    // identidad visual. NULL para servicios-persona y solicitos-persona.
    // ───────────────────────────────────────────────────────────────────
    negocio_id?: string | null;
    negocio_nombre?: string | null;
    negocio_logo?: string | null;
    sucursal_nombre?: string | null;
    sucursal_portada?: string | null;
    sucursal_foto_perfil?: string | null;
} & Record<string, unknown>;

// =============================================================================
// HELPER: Eliminar foto de R2 si está huérfana
// =============================================================================

/**
 * Las fotos de Servicios viven solo en `servicios_publicaciones.fotos`. NO se
 * comparten con otras tablas. Mismo patrón que `eliminarFotoMarketplaceSiHuerfana`.
 *
 * Útil al editar (`actualizarPublicacion`) cuando el usuario remueve una foto
 * de su array. NO se llama en `eliminarPublicacion` (soft delete) porque el
 * reconcile global de R2 hará la limpieza eventual.
 *
 * @param url - URL de la foto a evaluar
 * @param excluirPublicacionId - UUID de la publicación que está editando
 */
export async function eliminarFotoServicioSiHuerfana(
    url: string,
    excluirPublicacionId?: string
): Promise<void> {
    try {
        const filtroExcluir = excluirPublicacionId
            ? sql`AND id != ${excluirPublicacionId}`
            : sql``;

        const [{ total }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(serviciosPublicaciones)
            .where(
                sql`${url} = ANY(ARRAY(SELECT jsonb_array_elements_text(fotos))) ${filtroExcluir}`
            );

        if (total > 0) {
            console.log(
                `ℹ️ Foto Servicios conservada (usada por ${total} publicación/es): ${url}`
            );
            return;
        }

        await eliminarArchivo(url);
    } catch (error) {
        console.error('Error procesando foto Servicios huérfana:', error);
        // No re-lanzar: la limpieza de R2 es best-effort.
    }
}

// =============================================================================
// HELPER INTERNO: Serializar array JS → literal PostgreSQL
// =============================================================================
//
// Drizzle no serializa correctamente arrays JS VACÍOS como parámetros — genera
// `()` (placeholder vacío) que PostgreSQL rechaza con syntax error. Convertir
// el array a literal en JS y pasarlo como string SÍ funciona — PostgreSQL hace
// el cast a `text[]`/`varchar[]` con `::`.
//
//   pgArrayLiteral([])              → '{}'
//   pgArrayLiteral(['Centro'])      → '{"Centro"}'
//   pgArrayLiteral(['a"b', 'c\\d']) → '{"a\\"b","c\\\\d"}'

export function pgArrayLiteral(arr: readonly string[]): string {
    if (arr.length === 0) return '{}';
    const escapados = arr.map((s) => {
        const esc = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${esc}"`;
    });
    return '{' + escapados.join(',') + '}';
}

// =============================================================================
// HELPER INTERNO: Mapear fila SQL (snake_case + PostGIS) → PublicacionRow
// =============================================================================

function mapearPublicacion(row: RawPublicacionDb): PublicacionRow {
    return {
        id: row.id,
        usuarioId: row.usuario_id,
        sucursalId: row.sucursal_id,
        modo: row.modo as Modo,
        tipo: row.tipo as Tipo,
        subtipo: row.subtipo,
        titulo: row.titulo,
        descripcion: row.descripcion,
        fotos: row.fotos ?? [],
        fotoPortadaIndex: row.foto_portada_index,
        precio: row.precio,
        modalidad: row.modalidad as Modalidad,
        ubicacionAproximada: { lat: row.lat, lng: row.lng },
        ciudad: row.ciudad,
        zonasAproximadas: row.zonas_aproximadas ?? [],
        skills: row.skills ?? [],
        requisitos: row.requisitos ?? [],
        horario: row.horario,
        diasSemana: row.dias_semana ?? [],
        tipoEmpleo: row.tipo_empleo as TipoEmpleo | null,
        beneficios: row.beneficios ?? [],
        presupuesto: row.presupuesto,
        categoria: row.categoria as CategoriaClasificado | null,
        urgente: row.urgente ?? false,
        estado: row.estado as Estado,
        totalVistas: row.total_vistas,
        totalMensajes: row.total_mensajes,
        totalGuardados: row.total_guardados,
        expiraAt: row.expira_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        // Datos del negocio para vacantes — null para servicios-persona y
        // solicitos-persona (cuando el query no hace el LEFT JOIN).
        negocioId: row.negocio_id ?? null,
        negocioNombre: row.negocio_nombre ?? null,
        negocioLogo: row.negocio_logo ?? null,
        sucursalNombre: row.sucursal_nombre ?? null,
        sucursalPortada: row.sucursal_portada ?? null,
        sucursalFotoPerfil: row.sucursal_foto_perfil ?? null,
    };
}

// =============================================================================
// SELECT base — extrae lat/lng de geography(Point) con ST_X/ST_Y
// =============================================================================
//
// Drizzle no puede emitir ST_X/ST_Y, por eso usamos SQL crudo en todas las
// queries. La columna `ubicacion` (privada) NUNCA se incluye en el SELECT.
//
// Prefijo `sp.` obligatorio: el detalle hace `INNER JOIN usuarios u` y sin
// alias las columnas `id`, `usuario_id`, `ciudad`, etc. quedarían ambiguas.
// Todas las queries SELECT abajo usan `FROM servicios_publicaciones sp`.

const COLUMNAS_PUBLICACION = sql`
    sp.id,
    sp.usuario_id,
    sp.sucursal_id,
    sp.modo,
    sp.tipo,
    sp.subtipo,
    sp.titulo,
    sp.descripcion,
    sp.fotos,
    sp.foto_portada_index,
    sp.precio,
    sp.modalidad,
    ST_X(sp.ubicacion_aproximada::geometry) AS lng,
    ST_Y(sp.ubicacion_aproximada::geometry) AS lat,
    sp.ciudad,
    sp.zonas_aproximadas,
    sp.skills,
    sp.requisitos,
    sp.horario,
    sp.dias_semana,
    sp.tipo_empleo,
    sp.beneficios,
    sp.presupuesto,
    sp.categoria,
    sp.urgente,
    sp.estado,
    sp.total_vistas,
    sp.total_mensajes,
    sp.total_guardados,
    sp.expira_at,
    sp.created_at,
    sp.updated_at
`;

// Set de columnas para el FEED — extiende COLUMNAS_PUBLICACION con datos
// del negocio asociado (solo aplican a vacantes). Para servicios-persona
// y solicitos-persona los LEFT JOIN devuelven NULL → el card del feed
// cae a su placeholder por defecto.
//
// IMPORTANTE: requiere que la query haga
//   LEFT JOIN negocio_sucursales s ON s.id = sp.sucursal_id
//   LEFT JOIN negocios n           ON n.id = s.negocio_id
const COLUMNAS_PUBLICACION_FEED = sql`
    sp.id,
    sp.usuario_id,
    sp.sucursal_id,
    sp.modo,
    sp.tipo,
    sp.subtipo,
    sp.titulo,
    sp.descripcion,
    sp.fotos,
    sp.foto_portada_index,
    sp.precio,
    sp.modalidad,
    ST_X(sp.ubicacion_aproximada::geometry) AS lng,
    ST_Y(sp.ubicacion_aproximada::geometry) AS lat,
    sp.ciudad,
    sp.zonas_aproximadas,
    sp.skills,
    sp.requisitos,
    sp.horario,
    sp.dias_semana,
    sp.tipo_empleo,
    sp.beneficios,
    sp.presupuesto,
    sp.categoria,
    sp.urgente,
    sp.estado,
    sp.total_vistas,
    sp.total_mensajes,
    sp.total_guardados,
    sp.expira_at,
    sp.created_at,
    sp.updated_at,
    -- Datos del negocio (solo poblados cuando es vacante con sucursal_id)
    n.id              AS negocio_id,
    n.nombre          AS negocio_nombre,
    n.logo_url        AS negocio_logo,
    s.nombre          AS sucursal_nombre,
    s.portada_url     AS sucursal_portada,
    s.foto_perfil     AS sucursal_foto_perfil
`;

// =============================================================================
// MODERACIÓN PASIVA — detecta señales de sección equivocada
// =============================================================================
//
// Heurística simple basada en palabras clave del título + descripción. Si
// detecta señal fuerte, retorna la sección sugerida. El frontend muestra un
// modal "¿Lo publicarías mejor en X?" — si el usuario insiste, reenvía con
// `confirmadoPorUsuario=true` y se publica tal como está.
//
// Sprint 7.7. Heurística básica que se puede ampliar con un clasificador
// más sofisticado más adelante.

export type SeccionSugerida = 'marketplace';

const REGEX_VENTA_ARTICULO =
    /\b(vendo|vendido|venta|remato|cambio por|cambio x)\b/i;

export function detectarSugerenciaSeccion(
    titulo: string,
    descripcion: string,
): SeccionSugerida | null {
    const texto = `${titulo} ${descripcion}`.toLowerCase();
    // "vendo iPhone", "remato tele", "cambio bici por...". Servicios es para
    // contratar a alguien o pedir un servicio, no para vender objetos.
    if (REGEX_VENTA_ARTICULO.test(texto)) {
        return 'marketplace';
    }
    return null;
}

// =============================================================================
// CREAR PUBLICACIÓN
// =============================================================================

/**
 * Crea una nueva publicación de Servicios.
 *
 * - `expira_at` = NOW() + 30 días (cron del Sprint 7 auto-pausa)
 * - `ubicacion`            = punto exacto recibido (privado — NUNCA se devuelve)
 * - `ubicacion_aproximada` = punto aleatorizado dentro de 500m (público)
 *
 * MODERACIÓN: difiere a Sprint 4 — aquí solo confiamos en la validación de Zod.
 *
 * @param usuarioId - UUID del usuario en modo Personal (validado por middleware)
 * @param datos     - Payload validado por `crearPublicacionSchema`
 */
export async function crearPublicacion(
    usuarioId: string,
    datos: CrearPublicacionInput
) {
    try {
        // 0. Moderación pasiva — detectar señales de "esto no parece servicio"
        //    en titulo + descripcion y devolver 409 con sugerencia si el
        //    usuario no confirmó. Patrón calcado de MarketPlace.
        if (!datos.confirmadoPorUsuario) {
            const sugerencia = detectarSugerenciaSeccion(
                datos.titulo,
                datos.descripcion,
            );
            if (sugerencia) {
                return {
                    success: false as const,
                    code: 409,
                    message:
                        'Lo que describes parece encajar mejor en otra sección de AnunciaYA.',
                    sugerencia,
                };
            }
        }

        // 1. Aleatorizar coordenada para `ubicacion_aproximada`.
        const aprox = aleatorizarCoordenada(datos.latitud, datos.longitud);

        // 2. Calcular `expira_at` como FIN DEL DÍA del día N+TTL en la
        //    zona horaria local del usuario (inferida de su ciudad).
        //    Antes era `NOW() + 30 días en UTC` → expiraba a la hora
        //    EXACTA de creación + 30 días, perdiéndose horas del día.
        //    Ahora respeta el día completo independiente de la hora.
        const zonaUsuario = getZonaHorariaPorCiudad(datos.ciudad);
        const expiraAtSql = sqlExpiracionFinDeDia(TTL_DIAS_DEFAULT, zonaUsuario);

        // 3. Inyectar `aceptadasAt` (timestamp confiable, no lo manda el cliente)
        //    al snapshot de confirmaciones.
        const confirmacionesConTimestamp = {
            ...datos.confirmaciones,
            aceptadasAt: new Date().toISOString(),
        };

        // 4. INSERT con SQL crudo (necesario para geography(POINT, 4326)).
        const resultado = await db.execute<{ id: string }>(sql`
            INSERT INTO servicios_publicaciones (
                usuario_id,
                sucursal_id,
                modo,
                tipo,
                subtipo,
                titulo,
                descripcion,
                fotos,
                foto_portada_index,
                precio,
                modalidad,
                ubicacion,
                ubicacion_aproximada,
                ciudad,
                zonas_aproximadas,
                skills,
                requisitos,
                horario,
                dias_semana,
                tipo_empleo,
                beneficios,
                presupuesto,
                categoria,
                urgente,
                confirmaciones,
                expira_at
            ) VALUES (
                ${usuarioId},
                ${datos.sucursalId ?? null},
                ${datos.modo},
                ${datos.tipo},
                ${datos.subtipo ?? null},
                ${datos.titulo},
                ${datos.descripcion},
                ${JSON.stringify(datos.fotos)}::jsonb,
                ${datos.fotoPortadaIndex},
                ${JSON.stringify(datos.precio)}::jsonb,
                ${datos.modalidad},
                ST_SetSRID(ST_MakePoint(${datos.longitud}, ${datos.latitud}), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${aprox.lng}, ${aprox.lat}), 4326)::geography,
                ${datos.ciudad},
                ${pgArrayLiteral(datos.zonasAproximadas)}::varchar[],
                ${pgArrayLiteral(datos.skills)}::text[],
                ${pgArrayLiteral(datos.requisitos)}::text[],
                ${datos.horario ?? null},
                ${pgArrayLiteral(datos.diasSemana)}::varchar[],
                ${datos.tipoEmpleo ?? null},
                ${pgArrayLiteral(datos.beneficios)}::text[],
                ${datos.presupuesto ? JSON.stringify(datos.presupuesto) : null}::jsonb,
                ${datos.categoria ?? null},
                ${datos.urgente ?? false},
                ${JSON.stringify(confirmacionesConTimestamp)}::jsonb,
                ${expiraAtSql}
            )
            RETURNING id
        `);

        const id = (resultado.rows[0] as { id: string }).id;
        return { success: true as const, code: 201, data: { id } };
    } catch (error) {
        console.error('Error en crearPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos crear la publicación. Intenta de nuevo.',
        };
    }
}

// =============================================================================
// OBTENER PUBLICACIÓN POR ID (detalle)
// =============================================================================

/**
 * Devuelve la publicación con datos del oferente embebidos. La columna privada
 * `ubicacion` NO se incluye — solo `ubicacion_aproximada` mapeada a lat/lng.
 *
 * Visible para todos: activa | pausada. NO visible: eliminada.
 * El controller decide si bloquea el contacto cuando está pausada.
 */
export async function obtenerPublicacionPorId(publicacionId: string, usuarioActualId?: string) {
    try {
        // Para vacantes-empresa, también traemos info del negocio + sucursal
        // (LEFT JOIN — quedará null para servicios publicados por personas).
        // Esto permite al frontend mostrar el chat con la identidad del
        // negocio en lugar del usuario dueño cuando se contacta una vacante BS.
        const resultado = await db.execute<RawPublicacionDb & {
            oferente_id: string;
            oferente_nombre: string;
            oferente_apellidos: string;
            oferente_avatar_url: string | null;
            oferente_ciudad: string | null;
            oferente_telefono: string | null;
            oferente_ultima_conexion: string | null;
            negocio_id: string | null;
            negocio_nombre: string | null;
            negocio_logo: string | null;
            sucursal_nombre: string | null;
            sucursal_foto_perfil: string | null;
            sucursal_whatsapp: string | null;
            sucursal_portada: string | null;
            sucursal_es_principal: boolean | null;
            total_sucursales: number | null;
            // Sprint 9.3: ubicación exacta (sin offset) — la query SIEMPRE
            // la extrae, pero el mapper solo la incluye en el response
            // cuando es vacante-empresa (los servicios personales mantienen
            // privacidad con `ubicacionAproximada` + círculo de 500m).
            ubicacion_exacta_lat: number | null;
            ubicacion_exacta_lng: number | null;
            guardado: boolean;
        }>(sql`
            SELECT
                ${COLUMNAS_PUBLICACION},
                u.id              AS oferente_id,
                u.nombre          AS oferente_nombre,
                u.apellidos       AS oferente_apellidos,
                u.avatar_url      AS oferente_avatar_url,
                u.ciudad          AS oferente_ciudad,
                u.telefono        AS oferente_telefono,
                u.ultima_conexion AS oferente_ultima_conexion,
                n.id              AS negocio_id,
                n.nombre          AS negocio_nombre,
                n.logo_url        AS negocio_logo,
                ns.nombre         AS sucursal_nombre,
                ns.foto_perfil    AS sucursal_foto_perfil,
                -- WhatsApp de la sucursal — usado por el botón WhatsApp en
                -- el detalle de vacante-empresa (público y privado). Es
                -- distinto al telefono del usuario dueño porque el negocio
                -- tiene su propio canal de contacto.
                ns.whatsapp       AS sucursal_whatsapp,
                -- Portada del local (foto grande de la sucursal) — usada
                -- como background hero en el detalle de vacante-empresa.
                ns.portada_url    AS sucursal_portada,
                ns.es_principal   AS sucursal_es_principal,
                -- Total de sucursales activas del negocio — para decidir si
                -- mostrar el sufijo de sucursal en el header del detalle.
                CASE WHEN n.id IS NULL THEN NULL ELSE (
                    SELECT COUNT(*)::integer
                    FROM negocio_sucursales nsc
                    WHERE nsc.negocio_id = n.id
                      AND nsc.activa = true
                ) END             AS total_sucursales,
                -- Ubicación EXACTA del local — extraída de la SUCURSAL
                -- (no de la publicación). Esto es crítico porque el
                -- wizard de Vacantes BS actualmente guarda
                -- sp.ubicacion con un FALLBACK genérico (centro de
                -- Puerto Peñasco), no con la dirección real del local.
                -- Usamos ns.ubicacion (que SÍ está bien al ser parte
                -- del onboarding del negocio). NULL si la sucursal aún
                -- no tiene dirección configurada — el mapper lo filtra.
                CASE WHEN ns.ubicacion IS NULL THEN NULL
                     ELSE ST_Y(ns.ubicacion::geometry) END AS ubicacion_exacta_lat,
                CASE WHEN ns.ubicacion IS NULL THEN NULL
                     ELSE ST_X(ns.ubicacion::geometry) END AS ubicacion_exacta_lng,
                -- Flag de guardado para el usuario actual. NULL → false
                -- cuando no hay sesión. Permite que el bookmark del
                -- detalle refleje el estado real desde el primer render
                -- (sin esto, el botón siempre arranca desactivado).
                CASE WHEN ${usuarioActualId ?? null}::uuid IS NULL THEN false
                     ELSE EXISTS (
                         SELECT 1 FROM guardados g
                         WHERE g.usuario_id = ${usuarioActualId ?? null}::uuid
                           AND g.entity_type = 'servicio'
                           AND g.entity_id = sp.id
                     )
                END AS guardado
            FROM servicios_publicaciones sp
            INNER JOIN usuarios u ON u.id = sp.usuario_id
            LEFT JOIN negocios n ON n.id = u.negocio_id
            LEFT JOIN negocio_sucursales ns ON ns.id = sp.sucursal_id
            WHERE sp.id = ${publicacionId}
              AND sp.estado != 'eliminada'
              AND sp.deleted_at IS NULL
              -- Vacante de empresa de negocio fuera de circulación → 404 (link directo)
              AND (sp.tipo <> 'vacante-empresa' OR n.activo = true)
            LIMIT 1
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación. Pudo haberse eliminado.',
            };
        }

        const row = resultado.rows[0] as RawPublicacionDb & {
            oferente_id: string;
            oferente_nombre: string;
            oferente_apellidos: string;
            oferente_avatar_url: string | null;
            oferente_ciudad: string | null;
            oferente_telefono: string | null;
            oferente_ultima_conexion: string | null;
            negocio_id: string | null;
            negocio_nombre: string | null;
            negocio_logo: string | null;
            sucursal_nombre: string | null;
            sucursal_foto_perfil: string | null;
            sucursal_whatsapp: string | null;
            sucursal_portada: string | null;
            sucursal_es_principal: boolean | null;
            total_sucursales: number | null;
            ubicacion_exacta_lat: number | null;
            ubicacion_exacta_lng: number | null;
            guardado: boolean;
        };

        const base = mapearPublicacion(row);
        // Sprint 9.3: ubicación EXACTA solo se expone en vacantes (negocios
        // verificados, dirección pública por naturaleza). Servicios-persona
        // y solicitudes mantienen privacidad con la `ubicacionAproximada`
        // (offset random fijo en disco de 500m) del mapeo base.
        const esVacante = row.tipo === 'vacante-empresa';
        const ubicacionExacta = esVacante
            && row.ubicacion_exacta_lat !== null
            && row.ubicacion_exacta_lng !== null
            ? {
                lat: row.ubicacion_exacta_lat,
                lng: row.ubicacion_exacta_lng,
            }
            : undefined;

        const data: PublicacionConOferenteRow = {
            ...base,
            guardado: row.guardado,
            ...(ubicacionExacta ? { ubicacionExacta } : {}),
            oferente: {
                id: row.oferente_id,
                nombre: row.oferente_nombre,
                apellidos: row.oferente_apellidos,
                avatarUrl: row.oferente_avatar_url,
                ciudad: row.oferente_ciudad,
                telefono: row.oferente_telefono,
                ultimaConexion: row.oferente_ultima_conexion,
                tiempoRespuestaMinutos: null,
                negocioId: row.negocio_id,
                negocioNombre: row.negocio_nombre,
                negocioLogo: row.negocio_logo,
                sucursalNombre: row.sucursal_nombre,
                sucursalFotoPerfil: row.sucursal_foto_perfil,
                sucursalWhatsapp: row.sucursal_whatsapp,
                sucursalPortada: row.sucursal_portada,
                sucursalEsPrincipal: row.sucursal_es_principal,
                totalSucursales: Number(row.total_sucursales) || 0,
            },
        };

        return { success: true as const, code: 200, data };
    } catch (error) {
        console.error('Error en obtenerPublicacionPorId:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar la publicación.',
        };
    }
}

// =============================================================================
// FEED — Recientes + Cercanos
// =============================================================================

interface OpcionesFeed {
    ciudad: string;
    lat: number;
    lng: number;
    modo?: Modo;
}

/**
 * Devuelve `{ recientes, cercanos }` para el feed inicial. Solo `estado='activa'`.
 *
 * Recientes: últimos 10 por created_at desc en la ciudad (sin filtro de distancia).
 * Cercanos:  primeros 20 por ST_Distance asc desde (lat, lng) del usuario.
 *
 * Si se pasa `modo`, se filtra; sin él devuelve mezcla.
 */
export async function obtenerFeed(opciones: OpcionesFeed) {
    try {
        const { ciudad, lat, lng, modo } = opciones;
        const filtroModo = modo ? sql`AND sp.modo = ${modo}` : sql``;

        // ── Recientes ────────────────────────────────────────────────────
        // LEFT JOIN con negocio + sucursal para enriquecer vacantes con
        // su marca real (logo + portada). Servicios-persona y solicitos-
        // persona no tienen sucursal_id → los JOIN devuelven NULL y el
        // card cae al placeholder por defecto.
        //
        // Sprint 9.3: también calculamos `ST_Distance` aquí para que las
        // cards del carrusel "Recién publicado" puedan mostrar la
        // distancia como badge (igual que las cards de "Cerca de ti").
        const recientesRes = await db.execute<RawPublicacionDb & { dist_m: number }>(sql`
            SELECT
                ${COLUMNAS_PUBLICACION_FEED},
                ST_Distance(
                    sp.ubicacion_aproximada::geography,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS dist_m
            FROM servicios_publicaciones sp
            LEFT JOIN negocio_sucursales s ON s.id = sp.sucursal_id
            LEFT JOIN negocios n           ON n.id = s.negocio_id
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              ${filtroModo}
              -- Ocultar vacantes de empresa cuyo negocio está fuera de circulación
              -- (las publicaciones de persona física no tienen negocio → siempre visibles)
              AND (sp.tipo <> 'vacante-empresa' OR n.activo = true)
            ORDER BY sp.created_at DESC
            LIMIT 10
        `);

        // ── Cercanos ─────────────────────────────────────────────────────
        // ST_DWithin con radio amplio (50 km) para limitar candidatos; orden
        // exacto por ST_Distance ascendente. Mismo LEFT JOIN para enriquecer
        // vacantes.
        const cercanosRes = await db.execute<RawPublicacionDb & { dist_m: number }>(sql`
            SELECT
                ${COLUMNAS_PUBLICACION_FEED},
                ST_Distance(
                    sp.ubicacion_aproximada::geography,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS dist_m
            FROM servicios_publicaciones sp
            LEFT JOIN negocio_sucursales s ON s.id = sp.sucursal_id
            LEFT JOIN negocios n           ON n.id = s.negocio_id
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              ${filtroModo}
              -- Ocultar vacantes de empresa de negocios fuera de circulación
              AND (sp.tipo <> 'vacante-empresa' OR n.activo = true)
              AND ST_DWithin(
                  sp.ubicacion_aproximada::geography,
                  ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                  50000
              )
            ORDER BY dist_m ASC
            LIMIT 20
        `);

        // Recientes ahora también traen distanciaMetros (calculada con
        // ST_Distance) — Sprint 9.3, para que el carrusel pueda mostrar
        // el badge de distancia sobre la foto igual que "Cerca de ti".
        const recientes: PublicacionFeedRow[] = (
            recientesRes.rows as Array<RawPublicacionDb & { dist_m: number }>
        ).map((r) => ({
            ...mapearPublicacion(r),
            distanciaMetros: Math.round(r.dist_m),
        }));
        const cercanos: PublicacionFeedRow[] = (
            cercanosRes.rows as Array<RawPublicacionDb & { dist_m: number }>
        ).map((r) => ({
            ...mapearPublicacion(r),
            distanciaMetros: Math.round(r.dist_m),
        }));

        return {
            success: true as const,
            code: 200,
            data: { recientes, cercanos },
        };
    } catch (error) {
        console.error('Error en obtenerFeed:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar el feed.',
        };
    }
}

// =============================================================================
// FEED INFINITO — Paginado estilo Facebook
// =============================================================================

interface OpcionesFeedInfinito {
    ciudad: string;
    lat: number;
    lng: number;
    modo?: Modo;
    tipo?: Tipo;
    modalidad?: Modalidad;
    /** Categoría de clasificado — solo aplica si `modo='solicito'`. */
    categoria?: string;
    /** Si true, devuelve solo pedidos urgentes. Se combina con `modo='solicito'`. */
    soloUrgente?: boolean;
    orden: 'recientes' | 'cerca';
    pagina: number;
    limite: number;
}

export async function obtenerFeedInfinito(opciones: OpcionesFeedInfinito) {
    try {
        const {
            ciudad,
            lat,
            lng,
            modo,
            tipo,
            modalidad,
            categoria,
            soloUrgente,
            orden,
            pagina,
            limite,
        } = opciones;
        const offset = (pagina - 1) * limite;

        const filtroModo = modo ? sql`AND sp.modo = ${modo}` : sql``;
        const filtroTipo = tipo ? sql`AND sp.tipo = ${tipo}` : sql``;
        const filtroModalidad = modalidad ? sql`AND sp.modalidad = ${modalidad}` : sql``;
        const filtroCategoria = categoria ? sql`AND sp.categoria = ${categoria}` : sql``;
        const filtroUrgente = soloUrgente ? sql`AND sp.urgente = true` : sql``;

        // Para Clasificados (modo='solicito') aprovechamos el índice parcial
        // `idx_servicios_pub_solicito_urgente`: urgentes primero, luego fecha.
        // Para el resto del feed mantenemos el orden simple por created_at.
        const ordenSql =
            orden === 'cerca'
                ? sql`ORDER BY ST_Distance(sp.ubicacion_aproximada::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) ASC`
                : modo === 'solicito'
                  ? sql`ORDER BY sp.urgente DESC, sp.created_at DESC`
                  : sql`ORDER BY sp.created_at DESC`;

        // LEFT JOIN con negocio + sucursal: enriquece vacantes con su
        // marca real (logo + portada). Servicios-persona / solicitos-
        // persona quedan con esos campos NULL.
        const filasRes = await db.execute<RawPublicacionDb & { dist_m: number }>(sql`
            SELECT
                ${COLUMNAS_PUBLICACION_FEED},
                ST_Distance(
                    sp.ubicacion_aproximada::geography,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS dist_m
            FROM servicios_publicaciones sp
            LEFT JOIN negocio_sucursales s ON s.id = sp.sucursal_id
            LEFT JOIN negocios n           ON n.id = s.negocio_id
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              ${filtroModo}
              ${filtroTipo}
              ${filtroModalidad}
              ${filtroCategoria}
              ${filtroUrgente}
              -- Ocultar vacantes de empresa de negocios fuera de circulación
              AND (sp.tipo <> 'vacante-empresa' OR n.activo = true)
            ${ordenSql}
            LIMIT ${limite}
            OFFSET ${offset}
        `);

        const [{ total }] = (await db.execute<{ total: number }>(sql`
            SELECT COUNT(*)::int AS total
            FROM servicios_publicaciones sp
            LEFT JOIN negocio_sucursales s ON s.id = sp.sucursal_id
            LEFT JOIN negocios n           ON n.id = s.negocio_id
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              ${filtroModo}
              ${filtroTipo}
              ${filtroModalidad}
              ${filtroCategoria}
              ${filtroUrgente}
              -- Mismo filtro que la query principal (consistencia del total)
              AND (sp.tipo <> 'vacante-empresa' OR n.activo = true)
        `)).rows as Array<{ total: number }>;

        const items: PublicacionFeedRow[] = (
            filasRes.rows as Array<RawPublicacionDb & { dist_m: number }>
        ).map((r) => ({
            ...mapearPublicacion(r),
            distanciaMetros: Math.round(r.dist_m),
        }));

        return {
            success: true as const,
            code: 200,
            data: {
                items,
                paginacion: {
                    pagina,
                    limite,
                    total,
                    totalPaginas: Math.ceil(total / limite),
                    hayMas: offset + items.length < total,
                },
            },
        };
    } catch (error) {
        console.error('Error en obtenerFeedInfinito:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar el feed.',
        };
    }
}

// =============================================================================
// MIS PUBLICACIONES (panel del oferente)
// =============================================================================

interface OpcionesMisPublicaciones {
    estado?: 'activa' | 'pausada';
    limit: number;
    offset: number;
}

export async function obtenerMisPublicaciones(
    usuarioId: string,
    opciones: OpcionesMisPublicaciones
) {
    try {
        const { estado, limit, offset } = opciones;
        const filtroEstado = estado
            ? sql`AND sp.estado = ${estado}`
            : sql`AND sp.estado IN ('activa', 'pausada')`;

        const filasRes = await db.execute<RawPublicacionDb>(sql`
            SELECT ${COLUMNAS_PUBLICACION}
            FROM servicios_publicaciones sp
            WHERE sp.usuario_id = ${usuarioId}
              AND sp.deleted_at IS NULL
              ${filtroEstado}
            ORDER BY sp.created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
        `);

        const [{ total }] = (await db.execute<{ total: number }>(sql`
            SELECT COUNT(*)::int AS total
            FROM servicios_publicaciones sp
            WHERE sp.usuario_id = ${usuarioId}
              AND sp.deleted_at IS NULL
              ${filtroEstado}
        `)).rows as Array<{ total: number }>;

        const data = (filasRes.rows as RawPublicacionDb[]).map(mapearPublicacion);

        return {
            success: true as const,
            code: 200,
            data,
            paginacion: { limit, offset, total },
        };
    } catch (error) {
        console.error('Error en obtenerMisPublicaciones:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar tus publicaciones.',
        };
    }
}

// =============================================================================
// ACTUALIZAR PUBLICACIÓN
// =============================================================================

/**
 * Actualiza una publicación existente. Solo el dueño.
 *
 * - NUNCA modifica `expira_at` (eso vive en /reactivar, Sprint 7).
 * - Si llegan `latitud` + `longitud`, recalcula `ubicacion_aproximada` con
 *   un nuevo offset random (el oferente cambió de zona).
 * - Limpia fotos huérfanas removidas con `eliminarFotoServicioSiHuerfana`.
 */
export async function actualizarPublicacion(
    usuarioId: string,
    publicacionId: string,
    datos: ActualizarPublicacionInput,
    opciones?: { sucursalId?: string }
) {
    try {
        // Modo de acceso (Sprint 9.3):
        //  - Por defecto, el filtro es por `usuario_id` (publicaciones
        //    personales: solo el creador puede editarlas).
        //  - Si el caller pasa `opciones.sucursalId`, el filtro es por
        //    `sucursal_id` (vacantes: cualquier empleado con acceso a
        //    la sucursal puede gestionarlas — middleware ya validó el
        //    acceso). En ese caso `usuarioId` queda solo como auditoría.
        const usaSucursal = !!opciones?.sucursalId;
        const filtroAcceso = usaSucursal
            ? sql`sucursal_id = ${opciones!.sucursalId}`
            : sql`usuario_id = ${usuarioId}`;

        // 1. Validar que la publicación existe y es accesible.
        const existeRes = await db.execute<{ fotos: string[]; estado: string }>(sql`
            SELECT fotos, estado
            FROM servicios_publicaciones
            WHERE id = ${publicacionId}
              AND ${filtroAcceso}
              AND deleted_at IS NULL
            LIMIT 1
        `);
        if (existeRes.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación o no es tuya.',
            };
        }
        const fotosAnteriores = (existeRes.rows[0] as { fotos: string[] }).fotos ?? [];

        // 2. Construir SET dinámico con SQL crudo.
        //    Drizzle no es flexible con SETs condicionales mezclando JSONB +
        //    geography + arrays — más simple manejar con un único UPDATE crudo.
        const sets: ReturnType<typeof sql>[] = [];

        if (datos.titulo !== undefined) sets.push(sql`titulo = ${datos.titulo}`);
        if (datos.descripcion !== undefined) sets.push(sql`descripcion = ${datos.descripcion}`);
        if (datos.fotos !== undefined) sets.push(sql`fotos = ${JSON.stringify(datos.fotos)}::jsonb`);
        if (datos.fotoPortadaIndex !== undefined) sets.push(sql`foto_portada_index = ${datos.fotoPortadaIndex}`);
        if (datos.precio !== undefined) sets.push(sql`precio = ${JSON.stringify(datos.precio)}::jsonb`);
        if (datos.modalidad !== undefined) sets.push(sql`modalidad = ${datos.modalidad}`);
        if (datos.ciudad !== undefined) sets.push(sql`ciudad = ${datos.ciudad}`);
        if (datos.zonasAproximadas !== undefined) sets.push(sql`zonas_aproximadas = ${pgArrayLiteral(datos.zonasAproximadas)}::varchar[]`);
        if (datos.skills !== undefined) sets.push(sql`skills = ${pgArrayLiteral(datos.skills)}::text[]`);
        if (datos.requisitos !== undefined) sets.push(sql`requisitos = ${pgArrayLiteral(datos.requisitos)}::text[]`);
        if (datos.horario !== undefined) sets.push(sql`horario = ${datos.horario}`);
        if (datos.diasSemana !== undefined) sets.push(sql`dias_semana = ${pgArrayLiteral(datos.diasSemana)}::varchar[]`);
        if (datos.presupuesto !== undefined) {
            sets.push(
                sql`presupuesto = ${datos.presupuesto ? JSON.stringify(datos.presupuesto) : null}::jsonb`
            );
        }
        if (datos.categoria !== undefined) {
            sets.push(sql`categoria = ${datos.categoria ?? null}`);
        }
        if (datos.urgente !== undefined) {
            sets.push(sql`urgente = ${datos.urgente}`);
        }
        // Sprint 8 — Vacantes
        if (datos.sucursalId !== undefined) {
            sets.push(sql`sucursal_id = ${datos.sucursalId}`);
        }
        if (datos.tipoEmpleo !== undefined) {
            sets.push(sql`tipo_empleo = ${datos.tipoEmpleo ?? null}`);
        }
        if (datos.beneficios !== undefined) {
            sets.push(sql`beneficios = ${pgArrayLiteral(datos.beneficios)}::text[]`);
        }

        // Ubicación: si vienen ambos, recalculamos ambas columnas.
        if (datos.latitud !== undefined && datos.longitud !== undefined) {
            const aprox = aleatorizarCoordenada(datos.latitud, datos.longitud);
            sets.push(
                sql`ubicacion = ST_SetSRID(ST_MakePoint(${datos.longitud}, ${datos.latitud}), 4326)::geography`
            );
            sets.push(
                sql`ubicacion_aproximada = ST_SetSRID(ST_MakePoint(${aprox.lng}, ${aprox.lat}), 4326)::geography`
            );
        }

        sets.push(sql`updated_at = NOW()`);

        if (sets.length === 1) {
            // Solo updated_at — nada cambió en realidad.
            return {
                success: false as const,
                code: 400,
                message: 'No proporcionaste cambios.',
            };
        }

        const setClause = sql.join(sets, sql`, `);

        await db.execute(sql`
            UPDATE servicios_publicaciones
            SET ${setClause}
            WHERE id = ${publicacionId}
              AND ${filtroAcceso}
              AND deleted_at IS NULL
        `);

        // 3. Limpieza R2: fotos removidas → eliminar si están huérfanas.
        if (datos.fotos !== undefined) {
            const removidas = fotosAnteriores.filter((u) => !datos.fotos!.includes(u));
            await Promise.all(
                removidas.map((url) => eliminarFotoServicioSiHuerfana(url, publicacionId))
            );
        }

        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en actualizarPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos actualizar la publicación.',
        };
    }
}

// =============================================================================
// CAMBIAR ESTADO (activa ↔ pausada)
// =============================================================================

export async function cambiarEstadoPublicacion(
    usuarioId: string,
    publicacionId: string,
    nuevoEstado: 'activa' | 'pausada'
) {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_publicaciones
            SET estado = ${nuevoEstado}, updated_at = NOW()
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND deleted_at IS NULL
              AND estado IN ('activa', 'pausada')
            RETURNING id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación o no es tuya.',
            };
        }

        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en cambiarEstadoPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cambiar el estado.',
        };
    }
}

// =============================================================================
// ELIMINAR PUBLICACIÓN (soft delete)
// =============================================================================

/**
 * Reactiva una publicación pausada:
 *   - estado → 'activa'
 *   - expira_at → NOW() + 30 días
 *   - updated_at → NOW()
 *
 * Necesario tras una pausa automática del cron (publicación venció por
 * 30 días sin interacción). Hacer solo `PATCH /estado` no basta porque
 * `expira_at` ya estaría en el pasado y el cron volvería a pausarla.
 *
 * Solo el dueño (usuario_id == authUserId) puede reactivar.
 */
export async function reactivarPublicacion(
    usuarioId: string,
    publicacionId: string,
) {
    try {
        // Leer ciudad para inferir la zona horaria correcta. Más simple
        // y mantenible que mapear ciudad→zona en SQL puro (el mapeo vive
        // en `getZonaHorariaPorCiudad` y crece junto con las ciudades
        // que abre AnunciaYA).
        const ciudadRow = await db.execute<{ ciudad: string | null }>(sql`
            SELECT ciudad FROM servicios_publicaciones
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND deleted_at IS NULL
              AND estado = 'pausada'
            LIMIT 1
        `);

        if (ciudadRow.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message:
                    'No encontramos esta publicación o no es tuya o no está pausada.',
            };
        }

        const zonaUsuario = getZonaHorariaPorCiudad(ciudadRow.rows[0].ciudad);
        const expiraAtSql = sqlExpiracionFinDeDia(TTL_DIAS_DEFAULT, zonaUsuario);

        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_publicaciones
            SET estado = 'activa',
                expira_at = ${expiraAtSql},
                updated_at = NOW()
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND deleted_at IS NULL
              AND estado = 'pausada'
            RETURNING id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message:
                    'No encontramos esta publicación o no es tuya o no está pausada.',
            };
        }

        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en reactivarPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos reactivar la publicación.',
        };
    }
}

/**
 * Soft delete: `estado='eliminada'` + `deleted_at=NOW()`. Las fotos NO se
 * borran de R2 aquí — el reconcile global las atrapará si quedan huérfanas.
 */
export async function eliminarPublicacion(
    usuarioId: string,
    publicacionId: string,
    opciones?: { sucursalId?: string }
) {
    try {
        // Mismo patrón que `actualizarPublicacion` — por defecto valida
        // por `usuario_id`, pero las vacantes pasan `sucursalId` para
        // que cualquier empleado con acceso a la sucursal pueda
        // eliminarlas (no solo el creador).
        const filtroAcceso = opciones?.sucursalId
            ? sql`sucursal_id = ${opciones.sucursalId}`
            : sql`usuario_id = ${usuarioId}`;

        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_publicaciones
            SET estado = 'eliminada', deleted_at = NOW(), updated_at = NOW()
            WHERE id = ${publicacionId}
              AND ${filtroAcceso}
              AND deleted_at IS NULL
            RETURNING id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación o no es tuya.',
            };
        }

        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en eliminarPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos eliminar la publicación.',
        };
    }
}

// =============================================================================
// REGISTRAR VISTA (incrementa contador)
// =============================================================================

/**
 * Idempotente best-effort. La dedupe por usuario/día vive en analytics (Sprint
 * futuro) — aquí solo incrementamos.
 */
export async function registrarVista(publicacionId: string) {
    try {
        await db.execute(sql`
            UPDATE servicios_publicaciones
            SET total_vistas = total_vistas + 1
            WHERE id = ${publicacionId}
              AND estado != 'eliminada'
              AND deleted_at IS NULL
        `);
        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en registrarVista:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos registrar la vista.',
        };
    }
}

// =============================================================================
// UPLOAD DE IMAGEN (presigned URL R2 prefijo `servicios/`)
// =============================================================================

/**
 * Genera una URL presigned para que el cliente suba directamente a R2 sin
 * pasar por el backend. Carpeta `servicios/{usuarioId}/`. La key final la
 * genera `generarPresignedUrl` (timestamp + uuid + extensión).
 */
export async function generarUrlUploadImagen(
    usuarioId: string,
    nombreArchivo: string,
    contentType: 'image/jpeg' | 'image/png' | 'image/webp'
) {
    try {
        const carpeta = `servicios/${usuarioId}`;
        const resultado = await generarPresignedUrl(
            carpeta,
            nombreArchivo,
            contentType,
            300,
            ['image/jpeg', 'image/png', 'image/webp']
        );

        if (!resultado.success) {
            return {
                success: false as const,
                code: resultado.code ?? 500,
                message: resultado.message ?? 'No pudimos generar la URL de subida.',
            };
        }

        return {
            success: true as const,
            code: 200,
            data: resultado.data,
        };
    } catch (error) {
        console.error('Error en generarUrlUploadImagen:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos generar la URL de subida.',
        };
    }
}
