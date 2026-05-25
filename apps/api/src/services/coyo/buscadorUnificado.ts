/**
 * buscadorUnificado.ts (Coyo)
 * ============================
 * Buscador unificado de Coyo: dada una búsqueda, consulta las 4 áreas
 * (Negocios, MarketPlace, Servicios, Ofertas) en paralelo y devuelve los
 * resultados agrupados por tipo, normalizados a un shape común y mínimo.
 *
 * Diseño:
 *   - Reutiliza los 4 buscadores EXISTENTES (no duplica su lógica).
 *   - Llamadas en paralelo con `Promise.allSettled` → si una falla, las
 *     otras 3 siguen y el grupo afectado queda { items: [], total: 0,
 *     error: 'busqueda_fallida' }. Coyo siempre responde algo útil.
 *   - Cada buscador recibe `limit: 3` (Coyo solo necesita una muestra).
 *   - Normalización a `ItemUnificado { id, tipo, titulo, subtitulo, imagen }`.
 *     El frontend arma el enlace al detalle a partir de `tipo + id` —
 *     este service NO devuelve URLs.
 *
 * Limitación conocida:
 *   - `listarSucursalesCercanas` (Negocios) NO acepta `ciudad` como filtro
 *     directo; filtra por proximidad cuando hay `lat/lng`, y por coincidencia
 *     de texto en `s.ciudad` cuando el `busqueda` la contiene. Sin GPS, los
 *     resultados de Negocios pueden incluir otras ciudades si el texto
 *     matchea. MP/Servicios/Ofertas SÍ filtran estricto por ciudad.
 *   - `total` para Negocios es `items.length` (la función no devuelve el
 *     conteo total). Para los otros 3 es el `paginacion.total` real.
 *
 * Este es SOLO el "músculo" de búsqueda. La interpretación de lenguaje
 * natural con Gemini vive en otro layer (Frente 3, fuera de este archivo).
 *
 * Ubicación: apps/api/src/services/coyo/buscadorUnificado.ts
 */

import { listarSucursalesCercanas } from '../negocios.service.js';
import { buscarArticulos } from '../marketplace/buscador.js';
import { buscarServicios } from '../servicios/buscador.js';
import { buscarOfertas } from '../ofertas/buscador.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const LIMIT_POR_AREA = 3;

// =============================================================================
// TIPOS
// =============================================================================

export type TipoItem = 'negocio' | 'oferta' | 'marketplace' | 'servicio';

/**
 * Forma que Coyo necesita para mostrar un resultado en una card, enlazar al
 * detalle, y "presumir" datos ricos cuando estén disponibles. El frontend
 * resuelve la URL con `tipo + id`.
 *
 * Los 8 campos opcionales son ESPECÍFICOS por tipo — los que no aplican al
 * tipo del item van como `null` (no se omiten, para mantener shape uniforme):
 *
 *   - `negocio`     usa: rating, totalResenas, verificado, estaAbierto
 *   - `marketplace` usa: condicion, aceptaOfertas
 *   - `oferta`      usa: negocioRating, diasParaVencer
 *   - `servicio`    no usa ninguno hoy (su rating es caro de calcular —
 *                   pendiente para una futura iteración con precompute).
 *
 * Todos los datos opcionales son BARATOS: ya los traen los buscadores
 * subyacentes (precalculados en BD o calculados en sus SELECT), sin
 * cómputos extra en este service.
 */
export interface ItemUnificado {
    id: string;
    tipo: TipoItem;
    titulo: string;
    subtitulo: string | null;
    imagen: string | null;

    // ─── Ricos NEGOCIO ──────────────────────────────────────────────────
    /** Calificación promedio 0-5 (precalculada en negocio_sucursales). */
    rating: number | null;
    /** Cantidad total de reseñas (precalculada en negocio_sucursales). */
    totalResenas: number | null;
    /** Negocio verificado por el equipo de AnunciaYA. */
    verificado: boolean | null;
    /** ¿Abierto ahorita? Calculado en SQL por el buscador de Negocios
     *  combinando `negocio_horarios` + `zona_horaria` + hora actual. */
    estaAbierto: boolean | null;

    // ─── Ricos MARKETPLACE ──────────────────────────────────────────────
    /** 'nuevo' | 'seminuevo' | 'usado' | 'para_reparar'. */
    condicion: string | null;
    /** ¿El vendedor acepta ofertas (negociable)? */
    aceptaOfertas: boolean | null;

    // ─── Ricos OFERTA ───────────────────────────────────────────────────
    /** Rating del negocio que publica la oferta (heredado, 0-5). */
    negocioRating: number | null;
    /** Días hasta `fecha_fin` (0 = vence hoy/expira ya). */
    diasParaVencer: number | null;
}

export interface GrupoBusqueda {
    items: ItemUnificado[];
    /**
     * Total de matches en BD. Para Negocios coincide con `items.length`
     * (la función no devuelve conteo); para los otros 3 es el total real
     * de paginación (puede ser > LIMIT_POR_AREA).
     */
    total: number;
    /** Si la búsqueda de este grupo falló, mensaje corto. Ausente si OK. */
    error?: string;
}

export interface BuscarUnificadoInput {
    q: string;
    ciudad: string;
    lat?: number;
    lng?: number;
    /** UUID del usuario logueado (lo usa Negocios para liked/followed). */
    usuarioId?: string | null;
}

export interface ResultadoBusquedaUnificada {
    success: true;
    query: string;
    ciudad: string;
    resultados: {
        negocios: GrupoBusqueda;
        ofertas: GrupoBusqueda;
        marketplace: GrupoBusqueda;
        servicios: GrupoBusqueda;
    };
}

// =============================================================================
// FORMAS CRUDAS DE CADA BUSCADOR
// =============================================================================
//
// Los buscadores existentes devuelven `data: unknown[]` (intencional, porque
// el shape exacto vive en cada service). Aquí declaramos solo los campos que
// necesitamos para normalizar.

interface RawNegocio {
    sucursalId: string;
    negocioId: string;
    negocioNombre: string;
    sucursalNombre: string | null;
    ciudad: string;
    logoUrl: string | null;
    fotoPerfil: string | null;
    // Ricos (ya vienen del mapper de listarSucursalesCercanas)
    calificacionPromedio: string | number | null;
    totalCalificaciones: number | null;
    verificado: boolean | null;
    estaAbierto: boolean | null;
}

interface RawMarketplace {
    id: string;
    titulo: string;
    precio: string;
    condicion: string;
    fotos: string[];
    fotoPortadaIndex: number;
    // Ricos (ya en el mapper de buscarArticulos)
    aceptaOfertas: boolean | null;
}

interface RawServicio {
    id: string;
    titulo: string;
    modo: string;
    tipo: string;
    modalidad: string;
    fotos: string[];
    fotoPortadaIndex: number;
}

interface RawOferta {
    id: string;
    titulo: string;
    imagen: string | null;
    negocioNombre: string;
    fechaFin: string;
    // Agregada en buscarOfertas en este mismo cambio (calificacion_promedio
    // del JOIN con negocio_sucursales).
    calificacionPromedio: string | number | null;
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Ejecuta los 4 buscadores en paralelo y devuelve resultados normalizados.
 * Tolerante a fallos parciales: una sección rota no tumba a las demás.
 */
export async function buscarEnTodaLaApp(
    input: BuscarUnificadoInput,
): Promise<ResultadoBusquedaUnificada> {
    const { q, ciudad, lat, lng, usuarioId = null } = input;

    const [resNegocios, resOfertas, resMarketplace, resServicios] =
        await Promise.allSettled([
            listarSucursalesCercanas(usuarioId, {
                latitud: lat,
                longitud: lng,
                busqueda: q,
                limite: LIMIT_POR_AREA,
                offset: 0,
            }),
            buscarOfertas({ q, ciudad, limit: LIMIT_POR_AREA, offset: 0 }),
            buscarArticulos({ q, ciudad, lat, lng, limit: LIMIT_POR_AREA, offset: 0 }),
            buscarServicios({ q, ciudad, lat, lng, limit: LIMIT_POR_AREA, offset: 0 }),
        ]);

    return {
        success: true,
        query: q,
        ciudad,
        resultados: {
            negocios: procesarNegocios(resNegocios),
            ofertas: procesarOfertas(resOfertas),
            marketplace: procesarMarketplace(resMarketplace),
            servicios: procesarServicios(resServicios),
        },
    };
}

// =============================================================================
// PROCESADORES POR ÁREA — narrowing del unknown + normalización
// =============================================================================

/**
 * Convierte numerics que llegan como string (`'4.7'`) a número, o `null`
 * para cualquier valor inválido/ausente. Necesario porque Postgres devuelve
 * los `numeric(P,S)` como string para no perder precisión.
 */
function aNumeroOpcional(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

/**
 * Calcula días enteros entre `ahora` y `fechaFin`. Redondea hacia arriba
 * para que "termina hoy a las 23:59" siga siendo 1 día. Devuelve `null`
 * si la fecha es inválida y `0` si ya venció.
 */
function calcularDiasParaVencer(fechaFin: string | null | undefined): number | null {
    if (!fechaFin) return null;
    const fin = new Date(fechaFin).getTime();
    if (!Number.isFinite(fin)) return null;
    const ms = fin - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function procesarNegocios(
    res: PromiseSettledResult<{ success: boolean; data: unknown[] }>,
): GrupoBusqueda {
    if (res.status === 'rejected') {
        console.error('Coyo: falló búsqueda de Negocios', res.reason);
        return { items: [], total: 0, error: 'busqueda_fallida' };
    }
    const filas = (res.value.data ?? []) as RawNegocio[];
    const items: ItemUnificado[] = filas.slice(0, LIMIT_POR_AREA).map((n) => ({
        id: n.sucursalId,
        tipo: 'negocio' as const,
        titulo: n.negocioNombre,
        subtitulo: n.ciudad ?? null,
        imagen: n.logoUrl ?? n.fotoPerfil ?? null,
        // Ricos propios
        rating: aNumeroOpcional(n.calificacionPromedio),
        totalResenas: n.totalCalificaciones ?? null,
        verificado: n.verificado ?? null,
        estaAbierto: n.estaAbierto ?? null,
        // No aplican
        condicion: null,
        aceptaOfertas: null,
        negocioRating: null,
        diasParaVencer: null,
    }));
    return { items, total: items.length };
}

function procesarOfertas(
    res: PromiseSettledResult<{
        success: boolean;
        data: unknown[];
        paginacion: { total: number };
    }>,
): GrupoBusqueda {
    if (res.status === 'rejected') {
        console.error('Coyo: falló búsqueda de Ofertas', res.reason);
        return { items: [], total: 0, error: 'busqueda_fallida' };
    }
    const filas = (res.value.data ?? []) as RawOferta[];
    const items: ItemUnificado[] = filas.map((o) => ({
        id: o.id,
        tipo: 'oferta' as const,
        titulo: o.titulo,
        subtitulo: o.negocioNombre ?? null,
        imagen: o.imagen ?? null,
        // Ricos propios
        negocioRating: aNumeroOpcional(o.calificacionPromedio),
        diasParaVencer: calcularDiasParaVencer(o.fechaFin),
        // No aplican
        rating: null,
        totalResenas: null,
        verificado: null,
        estaAbierto: null,
        condicion: null,
        aceptaOfertas: null,
    }));
    return { items, total: res.value.paginacion?.total ?? items.length };
}

function procesarMarketplace(
    res: PromiseSettledResult<{
        success: boolean;
        data: unknown[];
        paginacion: { total: number };
    }>,
): GrupoBusqueda {
    if (res.status === 'rejected') {
        console.error('Coyo: falló búsqueda de MarketPlace', res.reason);
        return { items: [], total: 0, error: 'busqueda_fallida' };
    }
    const filas = (res.value.data ?? []) as RawMarketplace[];
    const items: ItemUnificado[] = filas.map((a) => {
        const fotos = Array.isArray(a.fotos) ? a.fotos : [];
        const idx = a.fotoPortadaIndex ?? 0;
        const imagen = fotos.length > 0 ? (fotos[idx] ?? fotos[0] ?? null) : null;
        const precioNum = Number(a.precio);
        const subtitulo = Number.isFinite(precioNum)
            ? `$${precioNum.toLocaleString('es-MX')} · ${a.condicion}`
            : a.condicion ?? null;
        return {
            id: a.id,
            tipo: 'marketplace' as const,
            titulo: a.titulo,
            subtitulo,
            imagen,
            // Ricos propios
            condicion: a.condicion ?? null,
            aceptaOfertas: a.aceptaOfertas ?? null,
            // No aplican
            rating: null,
            totalResenas: null,
            verificado: null,
            estaAbierto: null,
            negocioRating: null,
            diasParaVencer: null,
        };
    });
    return { items, total: res.value.paginacion?.total ?? items.length };
}

function procesarServicios(
    res: PromiseSettledResult<{
        success: boolean;
        data: unknown[];
        paginacion: { total: number };
    }>,
): GrupoBusqueda {
    if (res.status === 'rejected') {
        console.error('Coyo: falló búsqueda de Servicios', res.reason);
        return { items: [], total: 0, error: 'busqueda_fallida' };
    }
    const filas = (res.value.data ?? []) as RawServicio[];
    const items: ItemUnificado[] = filas.map((s) => {
        const fotos = Array.isArray(s.fotos) ? s.fotos : [];
        const idx = s.fotoPortadaIndex ?? 0;
        const imagen = fotos.length > 0 ? (fotos[idx] ?? fotos[0] ?? null) : null;
        // Subtítulo combina modo + modalidad de forma legible.
        const subtitulo = `${s.modo === 'ofrezco' ? 'Ofrezco' : 'Solicito'} · ${s.modalidad}`;
        return {
            id: s.id,
            tipo: 'servicio' as const,
            titulo: s.titulo,
            subtitulo,
            imagen,
            // Servicios no expone ricos en este pase — el rating del prestador
            // requiere AVG/COUNT al vuelo sobre `servicios_resenas` y el
            // horario es un string libre frágil de parsear. Pendiente para
            // cuando haya precompute o helper estable.
            rating: null,
            totalResenas: null,
            verificado: null,
            estaAbierto: null,
            condicion: null,
            aceptaOfertas: null,
            negocioRating: null,
            diasParaVencer: null,
        };
    });
    return { items, total: res.value.paginacion?.total ?? items.length };
}
