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
import type { IntencionPregunta } from './coyoIA.service.js';

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
    /** Logo/marca a superponer sobre la portada en la card (hoy solo vacantes de
     *  empresa; `null` en los demás tipos). La `imagen` es la portada, el `logo` va aparte. */
    logo: string | null;

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
    /** Modo de la publicación de MarketPlace: 'vendo' (venta) | 'busco' (demanda).
     *  `null` para tipos que no son marketplace. El frontend decide con esto el
     *  badge de la card ("Venta" vs "Se busca"). */
    mpModo: 'vendo' | 'busco' | null;

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
    /**
     * Dirección de la búsqueda (de `interpretarPregunta`). Default 'busca_oferta'.
     *  - `busca_oferta`: Negocios + Ofertas + MP en venta ('vendo') + Servicios
     *    ofrecidos ('ofrezco'). El vecino busca/compra/contrata.
     *  - `busca_demanda`: SOLO MP en modo 'busco' + Servicios 'solicito'. El vecino
     *    ofrece/vende y busca quién lo necesita — Negocios y Ofertas no aplican.
     */
    intencion?: IntencionPregunta;
    /**
     * Carril EMPLEO: cuando `true`, IGNORA `intencion` y trae SOLO las vacantes
     * (`tipo='vacante-empresa'`) — el vecino busca trabajo. Negocios/Ofertas/MP
     * quedan vacíos. Default false. Ver {@link import('./coyoIA.service.js').PreguntaInterpretada}.
     */
    esEmpleo?: boolean;
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
    /** `true` si esta sucursal es la Matriz del negocio. */
    esPrincipal: boolean | null;
    /** Total de sucursales activas del negocio (global, todas las
     *  ciudades). */
    totalSucursales: number | null;
    /** Total de sucursales activas del negocio EN LA MISMA CIUDAD que
     *  esta fila. Este es el que se usa para decidir si el subtítulo
     *  debe distinguir matriz vs sucursal — si solo hay 1 sucursal en
     *  la ciudad del vecino, no tiene sentido etiquetarla como matriz.
     *  Lo provee `listarSucursalesCercanas`. */
    totalSucursalesEnCiudad: number | null;
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
    /** 'vendo' (venta) | 'busco' (demanda). */
    modo: string;
    /** NULL en modo='busco' (una búsqueda no lleva precio). */
    precio: string | null;
    /** Rango de presupuesto — solo modo='busco', opcional. */
    presupuesto: { min: number; max: number } | null;
    condicion: string | null;
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
    // Datos del negocio (para vacantes ligadas a una sucursal, que no traen fotos
    // propias): el buscador de servicios los resuelve vía `sucursal_id`.
    negocioNombre: string | null;
    imagenNegocio: string | null;
    negocioLogo: string | null;
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
    const { q, ciudad, lat, lng, usuarioId = null, intencion = 'busca_oferta', esEmpleo = false } = input;

    const grupoVacio = (): GrupoBusqueda => ({ items: [], total: 0 });

    // Carril EMPLEO: el vecino busca trabajo → SOLO vacantes (`tipo='vacante-empresa'`,
    // SIN filtro de modo, porque las vacantes se guardan con `modo='solicito'`).
    // Negocios, Ofertas y MarketPlace no aplican (un empleo no vive ahí). Si `q`
    // viene vacío (pregunta genérica "hay empleo?"), buscarServicios lista todas
    // las vacantes recientes; si trae un puesto ("diseñador"), filtra por él.
    if (esEmpleo) {
        const [resVacantes] = await Promise.allSettled([
            buscarServicios({
                q,
                ciudad,
                lat,
                lng,
                limit: LIMIT_POR_AREA,
                offset: 0,
                modoFlexible: true,
                tipo: 'vacante-empresa',
            }),
        ]);
        return {
            success: true,
            query: q,
            ciudad,
            resultados: {
                negocios: grupoVacio(),
                ofertas: grupoVacio(),
                marketplace: grupoVacio(),
                servicios: procesarServicios(resVacantes),
            },
        };
    }

    // Dirección de la búsqueda. En `busca_demanda` el vecino OFRECE/VENDE y busca
    // quién lo necesita: solo aplican MP en modo 'busco' + Servicios 'solicito'.
    // Negocios y Ofertas son oferta comercial (no le sirven a un vendedor) → se
    // devuelven como grupos vacíos SIN gastar la query.
    const demanda = intencion === 'busca_demanda';
    const vacioNegocios = Promise.resolve({ success: true, data: [] as unknown[] });
    const vacioOfertas = Promise.resolve({
        success: true,
        data: [] as unknown[],
        paginacion: { total: 0 },
    });

    // `modoFlexible: true` en todas las llamadas — los buscadores tratan la query
    // multi-palabra como OR (cualquier palabra matchea) en vez del AND implícito.
    // Sin esto, "plomería fontanero fuga" exigiría todas las palabras juntas.
    // Solo Coyo activa este modo; los usuarios normales siguen con AND.
    const [resNegocios, resOfertas, resMarketplace, resServicios] =
        await Promise.allSettled([
            demanda
                ? vacioNegocios
                : listarSucursalesCercanas(usuarioId, {
                      latitud: lat,
                      longitud: lng,
                      busqueda: q,
                      limite: LIMIT_POR_AREA,
                      offset: 0,
                      modoFlexible: true,
                      // Filtro ESTRICTO por ciudad — nivela Negocios con las otras
                      // 3 áreas (que ya filtran estricto). Solo Coyo lo activa.
                      ciudad,
                  }),
            demanda
                ? vacioOfertas
                : buscarOfertas({
                      q,
                      ciudad,
                      limit: LIMIT_POR_AREA,
                      offset: 0,
                      modoFlexible: true,
                  }),
            buscarArticulos({
                q,
                ciudad,
                lat,
                lng,
                limit: LIMIT_POR_AREA,
                offset: 0,
                modoFlexible: true,
                // Comprador → artículos EN VENTA ('vendo'); oferente → DEMANDA ('busco').
                modo: demanda ? 'busco' : 'vendo',
            }),
            buscarServicios({
                q,
                ciudad,
                lat,
                lng,
                limit: LIMIT_POR_AREA,
                offset: 0,
                modoFlexible: true,
                // Comprador → servicios OFRECIDOS; oferente → SOLICITUDES (clasificados).
                modo: demanda ? 'solicito' : 'ofrezco',
            }),
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

/**
 * Subtítulo de una publicación 'busco' (demanda): su presupuesto formateado
 * "$min – $max" (MXN), o `null` si el vecino no lo puso (la card queda sin
 * subtítulo; el badge "Se busca" + el título ya comunican que es demanda).
 * Nunca "$0 · null" — una demanda no lleva precio ni condición.
 */
function formatearPresupuesto(p: { min: number; max: number } | null): string | null {
    if (!p) return null;
    const min = Number(p.min);
    const max = Number(p.max);
    const fmt = (n: number) => `$${n.toLocaleString('es-MX')}`;
    if (Number.isFinite(min) && Number.isFinite(max)) return `${fmt(min)} – ${fmt(max)}`;
    if (Number.isFinite(min)) return `Desde ${fmt(min)}`;
    if (Number.isFinite(max)) return `Hasta ${fmt(max)}`;
    return null;
}

/**
 * Construye el subtítulo de una tarjeta de Negocio según cuántas sucursales
 * tenga el negocio EN LA MISMA CIUDAD del vecino:
 *
 *  - 1 sucursal en la ciudad:    "Puerto Peñasco"                  (solo ciudad)
 *  - >1 sucursales y es matriz:  "Matriz · Puerto Peñasco"
 *  - >1 sucursales y NO es matriz: "Sucursal Centro · Puerto Peñasco"
 *    (donde "Sucursal Centro" es el nombre real de la sucursal)
 *
 * IMPORTANTE: usa `totalSucursalesEnCiudad`, NO `totalSucursales` (global).
 * Si un negocio tiene 2 sucursales pero en ciudades distintas (ej. Farmacia
 * X con Matriz en Peñasco + sucursal en Caborca), el vecino de Peñasco solo
 * ve 1 sucursal en su ciudad, así que NO tiene sentido decir "Matriz" —
 * solo "Puerto Peñasco". Caso reproducido el 2026-05-31 con Farmacia San
 * Ángel (2 globales, 1 en Peñasco) → antes salía "Matriz · Peñasco"
 * cuando debería ser solo "Peñasco".
 *
 * Sin esta diferenciación, dos sucursales del mismo negocio en la misma
 * ciudad se veían idénticas en las tarjetas — el vecino no podía
 * distinguirlas. Caso reproducido el 2026-05-31 con "Panaderia"
 * (sucursales "Principal" y "Benito Juarez" en Peñasco) y "Panadería
 * Tijuana" (sucursales "Panaderia Tijuana" y "Sucursal Centro" en Peñasco).
 */
function construirSubtituloNegocio(n: RawNegocio): string | null {
    const ciudad = n.ciudad ?? null;
    const totalEnCiudad = n.totalSucursalesEnCiudad ?? 1;

    if (totalEnCiudad <= 1) {
        return ciudad;
    }

    const etiqueta = n.esPrincipal
        ? 'Matriz'
        : n.sucursalNombre?.trim() || 'Sucursal';

    return ciudad ? `${etiqueta} · ${ciudad}` : etiqueta;
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
        // Cuando el negocio tiene MÁS DE UNA sucursal, distinguimos en
        // el subtítulo qué sucursal es esta (matriz vs nombre puntual).
        // Sin esto, dos sucursales del mismo negocio se veían idénticas
        // en las tarjetas (mismo nombre, misma ciudad), causando que el
        // vecino no supiera cuál era cuál. Si solo hay 1 sucursal,
        // mantenemos el comportamiento previo (solo ciudad).
        subtitulo: construirSubtituloNegocio(n),
        imagen: n.logoUrl ?? n.fotoPerfil ?? null,
        logo: null,
        // Ricos propios
        rating: aNumeroOpcional(n.calificacionPromedio),
        totalResenas: n.totalCalificaciones ?? null,
        verificado: n.verificado ?? null,
        estaAbierto: n.estaAbierto ?? null,
        // No aplican
        mpModo: null,
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
        logo: null,
        // Ricos propios
        negocioRating: aNumeroOpcional(o.calificacionPromedio),
        diasParaVencer: calcularDiasParaVencer(o.fechaFin),
        // No aplican
        mpModo: null,
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
        const esBusco = a.modo === 'busco';
        // 'busco' (demanda): NO lleva precio ni condición → muestra el presupuesto
        // si el vecino lo puso. 'vendo': precio + condición como siempre.
        let subtitulo: string | null;
        if (esBusco) {
            subtitulo = formatearPresupuesto(a.presupuesto);
        } else {
            const precioNum = Number(a.precio);
            subtitulo =
                a.precio !== null && Number.isFinite(precioNum)
                    ? `$${precioNum.toLocaleString('es-MX')}${a.condicion ? ` · ${a.condicion}` : ''}`
                    : a.condicion ?? null;
        }
        return {
            id: a.id,
            tipo: 'marketplace' as const,
            titulo: a.titulo,
            subtitulo,
            imagen,
            logo: null,
            mpModo: esBusco ? ('busco' as const) : ('vendo' as const),
            // Ricos propios (condición / negociable solo aplican a 'vendo').
            condicion: esBusco ? null : a.condicion ?? null,
            aceptaOfertas: esBusco ? null : a.aceptaOfertas ?? null,
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
        const fotoPropia = fotos.length > 0 ? (fotos[idx] ?? fotos[0] ?? null) : null;
        // Las vacantes rara vez traen foto propia → heredan la imagen del negocio
        // que las publica (perfil/portada/logo), igual que en el feed de Servicios.
        const imagen = fotoPropia ?? s.imagenNegocio ?? null;
        // Subtítulo: la vacante muestra el NEGOCIO que la publica (dato clave para
        // quien busca empleo); el resto combina modo (Ofrezco/Solicito) + modalidad.
        const subtitulo =
            s.tipo === 'vacante-empresa'
                ? s.negocioNombre
                    ? `Vacante · ${s.negocioNombre}`
                    : `Vacante · ${s.modalidad}`
                : `${s.modo === 'ofrezco' ? 'Ofrezco' : 'Solicito'} · ${s.modalidad}`;
        return {
            id: s.id,
            tipo: 'servicio' as const,
            titulo: s.titulo,
            subtitulo,
            imagen,
            // Logo del negocio (solo vacantes de empresa) para superponer en la card.
            logo: s.tipo === 'vacante-empresa' ? s.negocioLogo : null,
            // Servicios no expone ricos en este pase — el rating del prestador
            // requiere AVG/COUNT al vuelo sobre `servicios_resenas` y el
            // horario es un string libre frágil de parsear. Pendiente para
            // cuando haya precompute o helper estable.
            mpModo: null,
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
