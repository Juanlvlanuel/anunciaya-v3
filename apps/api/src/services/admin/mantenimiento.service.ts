/**
 * admin/mantenimiento.service.ts
 * ================================
 * Servicios de la sección "Mantenimiento" del Panel Admin.
 *
 * Contiene herramientas de mantenimiento del sistema. Hoy: reconcile de imágenes
 * huérfanas en R2. A futuro pueden vivir aquí otras herramientas admin como
 * migraciones de datos one-off, reindex de cachés, limpieza de tablas huérfanas, etc.
 *
 * SEGURIDAD del reconcile R2 (0% falsos positivos):
 *  1. Fuente única de verdad: `IMAGE_REGISTRY` (en `utils/imageRegistry.ts`)
 *  2. Dry-run por defecto: reporta sin borrar
 *  3. Re-verificación antes de borrar cada URL
 *  4. Timestamp de gracia: no borra archivos subidos en los últimos N minutos
 *  5. Rate limit de borrados por ejecución
 *
 * Ubicación: apps/api/src/services/admin/mantenimiento.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { obtenerConexionesReconcile } from '../../db/reconcileConnections.js';
import { eliminarArchivo, esUrlR2, listarObjetosR2 } from '../r2.service.js';
import { IMAGE_REGISTRY, CARPETAS_PROTEGIDAS } from '../../utils/imageRegistry.js';
import { env } from '../../config/env.js';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Minutos de gracia — no borrar archivos recientes aunque parezcan huérfanos */
const MINUTOS_GRACIA_POR_DEFECTO = 5;

/** Máximo de archivos a borrar en una sola ejecución (protección de seguridad) */
const MAX_BORRADOS_POR_EJECUCION = 500;

// =============================================================================
// TIPOS
// =============================================================================

export interface ReporteReconcile {
    resumen: {
        urlsEnBD: number;
        objetosEnR2: number;
        huerfanas: number;
        rotas: number;
        ignoradasPorGracia: number;
    };
    porCarpeta: Record<string, {
        enR2: number;
        enBD: number;
        huerfanas: number;
    }>;
    /** Archivos en R2 que ningún registro en BD referencia */
    huerfanas: Array<{
        url: string;
        key: string;
        carpeta: string;
        size: number;
        lastModified: string;
    }>;
    /** URLs en BD que apuntan a archivos que ya no existen en R2 */
    rotas: Array<{
        url: string;
        ubicacion: string; // ej: "articulos.imagen_principal"
    }>;
    /** Archivos que serían huérfanos pero están protegidos por el periodo de gracia */
    ignoradasPorGracia: Array<{
        url: string;
        key: string;
        edadMinutos: number;
    }>;
}

export interface OpcionesReconcile {
    /** Si true, solo reporta sin borrar. Default true (seguro) */
    dryRun?: boolean;
    /** Solo incluye archivos de las carpetas especificadas. Si no, todas */
    soloCarpetas?: string[];
    /** Minutos de gracia para archivos recientes. Default 5 */
    minutosGracia?: number;
    /** Máximo de borrados. Default 500 */
    maxBorrados?: number;
    /** Identificador de quien ejecuta (para auditoría). Default 'admin-secret' */
    ejecutadoPor?: string;
}

export interface ResultadoEjecucion {
    dryRun: boolean;
    huerfanasDetectadas: number;
    eliminadas: number;
    fallidas: number;
    ignoradasPorGracia: number;
    detalleEliminaciones?: Array<{ url: string; ok: boolean; error?: string }>;
}

// =============================================================================
// HELPER: Registrar ejecución en tabla de auditoría
// =============================================================================

/**
 * Inserta una fila en `r2_reconcile_log` con el detalle de una ejecución del
 * reconcile. La tabla debe existir (ver migración en `docs/migraciones/`).
 *
 * Si la tabla no existe, el INSERT falla silenciosamente — no queremos que
 * un problema de auditoría bloquee el reconcile en sí.
 */
async function registrarEnLog(datos: {
    ejecutadoPor: string;
    dryRun: boolean;
    carpetas: string[] | null;
    huerfanasDetectadas: number;
    eliminadas: number;
    fallidas: number;
    ignoradasPorGracia: number;
    detalle: Array<{ url: string; ok: boolean; error?: string }>;
}): Promise<void> {
    try {
        const carpetasParam = datos.carpetas ? datos.carpetas : null;
        await db.execute(sql`
            INSERT INTO r2_reconcile_log
                (ejecutado_por, dry_run, carpetas, huerfanas_detectadas,
                 eliminadas, fallidas, ignoradas_por_gracia, detalle)
            VALUES
                (${datos.ejecutadoPor}, ${datos.dryRun}, ${carpetasParam},
                 ${datos.huerfanasDetectadas}, ${datos.eliminadas},
                 ${datos.fallidas}, ${datos.ignoradasPorGracia},
                 ${JSON.stringify(datos.detalle)}::jsonb)
        `);
    } catch (error) {
        // No propagar — el log es nice-to-have, no crítico
        console.warn('[reconcile] No se pudo registrar en r2_reconcile_log:', error);
    }
}

// =============================================================================
// HELPER: URLs en uso según el registry
// =============================================================================

/**
 * Verifica si una URL R2 sigue siendo referenciada por ALGUNA fila de
 * ALGUNA tabla del `IMAGE_REGISTRY` en la BD principal. Hace queries
 * indexed-friendly (uno por tabla/columna) con LIMIT 1 — corto-circuita
 * al primer match para ser O(1) en el caso común.
 *
 * Usado por el endpoint `DELETE /api/r2/imagen` como defensa en
 * profundidad antes de borrar. Si por bug del frontend (o futuro código)
 * se llama con una URL en uso, este check evita romper el artículo /
 * negocio / perfil que la sigue referenciando.
 *
 * NOTA: a diferencia de `listarUrlsEnUso`, este helper consulta SOLO la BD
 * principal — no multi-ambiente. Para un check puntual durante un DELETE
 * inmediato eso es suficiente; el reconcile periódico cubre cross-BD.
 *
 * @param url - URL R2 completa a verificar
 * @returns true si la URL aparece en al menos una fila de IMAGE_REGISTRY
 */
export async function urlEstaEnUso(url: string): Promise<boolean> {
    for (const campo of IMAGE_REGISTRY) {
        try {
            let resultado;
            if (campo.tipo === 'url') {
                resultado = await db.execute(sql`
                    SELECT 1
                    FROM ${sql.identifier(campo.tabla)}
                    WHERE ${sql.identifier(campo.columna)} = ${url}
                    LIMIT 1
                `);
            } else if (campo.tipo === 'array') {
                resultado = await db.execute(sql`
                    SELECT 1
                    FROM ${sql.identifier(campo.tabla)}
                    WHERE ${url} = ANY(${sql.identifier(campo.columna)})
                    LIMIT 1
                `);
            } else if (campo.tipo === 'text-scan-urls') {
                // `LIKE` con la URL completa entre wildcards cubre tanto:
                //   - JSONB array de URLs (articulos_marketplace.fotos)
                //   - Texto plano con URLs embebidas (chat_mensajes.contenido)
                //   - JSON con la URL en cualquier campo
                // Patrón seguro: la URL incluye dominio R2 + path único, no
                // hay falsos positivos por substring.
                const patron = `%${url}%`;
                resultado = await db.execute(sql`
                    SELECT 1
                    FROM ${sql.identifier(campo.tabla)}
                    WHERE ${sql.identifier(campo.columna)}::text LIKE ${patron}
                    LIMIT 1
                `);
            } else {
                continue;
            }
            if (resultado.rows.length > 0) {
                return true;
            }
        } catch (err) {
            console.error(
                `[urlEstaEnUso] Error consultando ${campo.tabla}.${campo.columna}:`,
                err
            );
            // Ante error de query, ser conservadores: asumir que SÍ está en
            // uso para no borrar por accidente. El usuario / reconcile
            // global decidirán después.
            return true;
        }
    }
    return false;
}

/**
 * Recorre el IMAGE_REGISTRY consultando cada tabla/columna en TODAS las
 * conexiones de BD disponibles (local + producción cuando aplique) y arma el
 * set UNION de URLs referenciadas por cualquier registro de cualquier ambiente.
 *
 * Esto es crítico para la seguridad del reconcile: si el bucket R2 es compartido
 * entre ambientes, solo marcando como huérfano lo que NINGUNA BD referencia
 * evitamos borrar archivos en uso en el otro ambiente.
 *
 * Ver `db/reconcileConnections.ts` para detalles del multi-BD.
 */
export async function listarUrlsEnUso(): Promise<Set<string>> {
    const urls = new Set<string>();
    const conexiones = obtenerConexionesReconcile();

    for (const { etiqueta, db: conn } of conexiones) {
        for (const campo of IMAGE_REGISTRY) {
            try {
                if (campo.tipo === 'url') {
                    const query = sql`
                        SELECT ${sql.identifier(campo.columna)} AS valor
                        FROM ${sql.identifier(campo.tabla)}
                        WHERE ${sql.identifier(campo.columna)} IS NOT NULL
                    `;
                    const resultado = await conn.execute(query);
                    for (const row of resultado.rows) {
                        const v = (row as Record<string, unknown>).valor;
                        if (typeof v === 'string' && v.length > 0) urls.add(v);
                    }
                } else if (campo.tipo === 'array') {
                    const query = sql`
                        SELECT DISTINCT unnest(${sql.identifier(campo.columna)}) AS valor
                        FROM ${sql.identifier(campo.tabla)}
                        WHERE ${sql.identifier(campo.columna)} IS NOT NULL
                    `;
                    const resultado = await conn.execute(query);
                    for (const row of resultado.rows) {
                        const v = (row as Record<string, unknown>).valor;
                        if (typeof v === 'string' && v.length > 0) urls.add(v);
                    }
                } else if (campo.tipo === 'text-scan-urls') {
                    // Usa regex SQL sobre el campo con cast `::text` para soportar
                    // tanto columnas texto/varchar como JSONB (ej: marketplace.imagenes).
                    const dominioEscapado = env.R2_PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const patron = `${dominioEscapado}/[^\\s"'}\`<>]+`;
                    const query = sql`
                        SELECT DISTINCT
                            (regexp_matches(${sql.identifier(campo.columna)}::text, ${patron}, 'g'))[1] AS valor
                        FROM ${sql.identifier(campo.tabla)}
                        WHERE ${sql.identifier(campo.columna)}::text ~ ${dominioEscapado}
                    `;
                    const resultado = await conn.execute(query);
                    for (const row of resultado.rows) {
                        const v = (row as Record<string, unknown>).valor;
                        if (typeof v === 'string' && v.length > 0) urls.add(v);
                    }
                }
            } catch (error) {
                console.error(`[reconcile/${etiqueta}] Error leyendo ${campo.tabla}.${campo.columna}:`, error);
            }
        }
    }

    return urls;
}

/**
 * Lista las URLs ROTAS: referencias en BD que apuntan a archivos R2 inexistentes.
 * Recorre TODAS las conexiones (local + producción si aplica) para identificar
 * rotas en ambos ambientes. Útil para detectar inconsistencias después de
 * borrados manuales erróneos.
 */
async function detectarUrlsRotas(
    urlsEnR2: Set<string>
): Promise<Array<{ url: string; ubicacion: string }>> {
    const rotas: Array<{ url: string; ubicacion: string }> = [];
    const conexiones = obtenerConexionesReconcile();

    for (const { etiqueta, db: conn } of conexiones) {
        for (const campo of IMAGE_REGISTRY) {
            try {
                let filas: Array<{ valor: string }> = [];

                if (campo.tipo === 'url') {
                    const res = await conn.execute(sql`
                        SELECT ${sql.identifier(campo.columna)} AS valor
                        FROM ${sql.identifier(campo.tabla)}
                        WHERE ${sql.identifier(campo.columna)} IS NOT NULL
                    `);
                    filas = res.rows as Array<{ valor: string }>;
                } else if (campo.tipo === 'array') {
                    const res = await conn.execute(sql`
                        SELECT DISTINCT unnest(${sql.identifier(campo.columna)}) AS valor
                        FROM ${sql.identifier(campo.tabla)}
                        WHERE ${sql.identifier(campo.columna)} IS NOT NULL
                    `);
                    filas = res.rows as Array<{ valor: string }>;
                } else if (campo.tipo === 'text-scan-urls') {
                    const dominioEscapado = env.R2_PUBLIC_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const patron = `${dominioEscapado}/[^\\s"'}\`<>]+`;
                    const res = await conn.execute(sql`
                        SELECT DISTINCT
                            (regexp_matches(${sql.identifier(campo.columna)}::text, ${patron}, 'g'))[1] AS valor
                        FROM ${sql.identifier(campo.tabla)}
                        WHERE ${sql.identifier(campo.columna)}::text ~ ${dominioEscapado}
                    `);
                    filas = res.rows as Array<{ valor: string }>;
                }

                for (const { valor } of filas) {
                    if (typeof valor !== 'string' || !esUrlR2(valor)) continue;
                    if (!urlsEnR2.has(valor)) {
                        rotas.push({ url: valor, ubicacion: `${etiqueta}:${campo.tabla}.${campo.columna}` });
                    }
                }
            } catch (error) {
                console.error(`[reconcile/${etiqueta}] Error detectando rotas en ${campo.tabla}.${campo.columna}:`, error);
            }
        }
    }

    return rotas;
}

// =============================================================================
// FUNCIÓN PRINCIPAL: REPORTE (DRY-RUN)
// =============================================================================

/**
 * Genera un reporte del estado actual del reconcile sin tocar nada. Seguro para
 * correr cuando se quiera (no tiene efectos).
 */
export async function generarReporteReconcile(
    opciones: OpcionesReconcile = {}
): Promise<ReporteReconcile> {
    const minutosGracia = opciones.minutosGracia ?? MINUTOS_GRACIA_POR_DEFECTO;
    const limiteEdad = new Date(Date.now() - minutosGracia * 60 * 1000);

    // 1. Cargar ambos conjuntos
    const [urlsEnBD, objetosR2Todos] = await Promise.all([
        listarUrlsEnUso(),
        listarObjetosR2(),
    ]);

    // 2. Filtrar R2 por carpetas si se pidió
    const objetosR2 = opciones.soloCarpetas
        ? objetosR2Todos.filter(o => opciones.soloCarpetas!.includes(o.carpeta))
        : objetosR2Todos;

    // 3. Clasificar
    const urlsEnR2 = new Set(objetosR2.map(o => o.url));
    const huerfanas: ReporteReconcile['huerfanas'] = [];
    const ignoradasPorGracia: ReporteReconcile['ignoradasPorGracia'] = [];

    for (const obj of objetosR2) {
        if (urlsEnBD.has(obj.url)) continue; // está en uso → no huérfana

        // Carpetas protegidas: assets del equipo (ej. brand/). No tocar nunca
        // aunque no aparezcan referenciadas en BD.
        if (CARPETAS_PROTEGIDAS.has(obj.carpeta)) continue;

        if (obj.lastModified > limiteEdad) {
            // Archivo reciente — gracia
            const edadMin = Math.floor((Date.now() - obj.lastModified.getTime()) / 60_000);
            ignoradasPorGracia.push({ url: obj.url, key: obj.key, edadMinutos: edadMin });
            continue;
        }

        huerfanas.push({
            url: obj.url,
            key: obj.key,
            carpeta: obj.carpeta,
            size: obj.size,
            lastModified: obj.lastModified.toISOString(),
        });
    }

    // 4. URLs rotas (en BD pero no en R2)
    const rotas = await detectarUrlsRotas(urlsEnR2);

    // 5. Resumen por carpeta
    const porCarpeta: ReporteReconcile['porCarpeta'] = {};
    for (const obj of objetosR2) {
        porCarpeta[obj.carpeta] ??= { enR2: 0, enBD: 0, huerfanas: 0 };
        porCarpeta[obj.carpeta].enR2++;
    }
    // Contar las BD por carpeta — tomar el PRIMER segmento del path después del
    // dominio. Así `chat/audio/userId/archivo.webm` cuenta en 'chat', no en 'userId'.
    for (const url of urlsEnBD) {
        if (!esUrlR2(url)) continue;
        let carpeta = 'root';
        try {
            const urlObj = new URL(url);
            const partes = urlObj.pathname.split('/').filter(Boolean);
            carpeta = partes[0] ?? 'root';
        } catch { /* ignorar URLs malformadas */ }
        porCarpeta[carpeta] ??= { enR2: 0, enBD: 0, huerfanas: 0 };
        porCarpeta[carpeta].enBD++;
    }
    for (const h of huerfanas) {
        porCarpeta[h.carpeta].huerfanas++;
    }

    return {
        resumen: {
            urlsEnBD: urlsEnBD.size,
            objetosEnR2: objetosR2.length,
            huerfanas: huerfanas.length,
            rotas: rotas.length,
            ignoradasPorGracia: ignoradasPorGracia.length,
        },
        porCarpeta,
        huerfanas,
        rotas,
        ignoradasPorGracia,
    };
}

// =============================================================================
// FUNCIÓN PRINCIPAL: EJECUTAR LIMPIEZA
// =============================================================================

/**
 * Ejecuta la limpieza real de huérfanas.
 *
 * Pasos defensivos antes de borrar cada archivo:
 * 1. Re-consultar BD para confirmar que sigue sin aparecer en uso
 * 2. Respetar periodo de gracia (fuera del reporte inicial)
 * 3. Respetar max-borrados-por-ejecución
 */
export async function ejecutarLimpiezaR2(
    opciones: OpcionesReconcile = {}
): Promise<ResultadoEjecucion> {
    const dryRun = opciones.dryRun ?? true;
    const maxBorrados = opciones.maxBorrados ?? MAX_BORRADOS_POR_EJECUCION;

    // 1. Reporte actual
    const reporte = await generarReporteReconcile(opciones);
    const ejecutadoPor = opciones.ejecutadoPor ?? 'admin-secret';

    if (dryRun) {
        // Registrar el dry-run en auditoría también (útil para saber cuándo alguien
        // revisó el estado del bucket, aunque no haya borrado nada).
        await registrarEnLog({
            ejecutadoPor,
            dryRun: true,
            carpetas: opciones.soloCarpetas ?? null,
            huerfanasDetectadas: reporte.huerfanas.length,
            eliminadas: 0,
            fallidas: 0,
            ignoradasPorGracia: reporte.ignoradasPorGracia.length,
            detalle: [],
        });

        return {
            dryRun: true,
            huerfanasDetectadas: reporte.huerfanas.length,
            eliminadas: 0,
            fallidas: 0,
            ignoradasPorGracia: reporte.ignoradasPorGracia.length,
        };
    }

    // 2. Re-verificar BD (snapshot atómico) — por si apareció una referencia nueva
    // entre el reporte y la ejecución
    const urlsEnUsoReverificadas = await listarUrlsEnUso();

    const aEliminar = reporte.huerfanas
        .filter(h => !urlsEnUsoReverificadas.has(h.url))
        .slice(0, maxBorrados);

    // 3. Borrar en paralelo con Promise.allSettled para recolectar errores
    const resultados = await Promise.allSettled(
        aEliminar.map(async (h) => {
            await eliminarArchivo(h.url);
            return h.url;
        })
    );

    const detalle = resultados.map((r, i) => {
        if (r.status === 'fulfilled') {
            return { url: aEliminar[i].url, ok: true };
        }
        return {
            url: aEliminar[i].url,
            ok: false,
            error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        };
    });

    const eliminadas = detalle.filter(d => d.ok).length;
    const fallidas = detalle.filter(d => !d.ok).length;

    // Auditoría: registrar qué se borró. Tabla `r2_reconcile_log` debe existir
    // (ver `docs/migraciones/2026-04-17-r2-reconcile-log.sql`).
    // Si la tabla no existe la inserción falla silenciosa — no queremos bloquear
    // el reconcile por no tener auditoría.
    await registrarEnLog({
        ejecutadoPor,
        dryRun: false,
        carpetas: opciones.soloCarpetas ?? null,
        huerfanasDetectadas: reporte.huerfanas.length,
        eliminadas,
        fallidas,
        ignoradasPorGracia: reporte.ignoradasPorGracia.length,
        detalle,
    });

    return {
        dryRun: false,
        huerfanasDetectadas: reporte.huerfanas.length,
        eliminadas,
        fallidas,
        ignoradasPorGracia: reporte.ignoradasPorGracia.length,
        detalleEliminaciones: detalle,
    };
}
