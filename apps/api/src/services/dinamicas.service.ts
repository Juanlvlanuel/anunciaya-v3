/**
 * ============================================================================
 * DINÁMICAS SERVICE — ciclo de vida (Fase 1) + moderación/fotos (Fase 2)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/dinamicas.service.ts
 *
 * Fase 1 = solo la capa de datos y ciclo de vida de la Dinámica en sí
 * (crear/editar borrador, publicar, posponer, cancelar, listar, detalle) +
 * funciones internas de bajo nivel para `dinamica_boletos` que las fases 3
 * (pantalla de participación + ChatYA) y 4 (motor de sorteo) van a reusar.
 * NO se expone todavía un endpoint público de "reservar boleto" ni el motor
 * de sorteo (elegir ganador, semilla, hash) — ver docs/kit-dinamicas/Contexto_Dinamicas.md.
 *
 * Fase 2 agrega: moderación de texto reducida (`dinamicas/filtros.ts`, sin
 * "rifa/sorteo/boleto" — vocabulario normal del módulo), el checklist legal
 * al publicar, y subida/borrado de fotos de evidencia del premio en R2.
 *
 * Patrón: igual que `marketplace.service.ts` — funciones devuelven
 * `{ success: true, data }` o `{ success: false, message, code }`; el
 * controller solo mapea a status HTTP, cero lógica de negocio ahí.
 */

import { and, desc, eq, count, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dinamicas, dinamicaBoletos, dinamicaGanadores, usuarios, ciudades } from '../db/schemas/schema.js';
import { crearNotificacion } from './notificaciones.service.js';
import { eliminarArchivo, generarPresignedUrl } from './r2.service.js';
import { crearObtenerConversacion, enviarMensaje } from './chatya.service.js';
import { resolverCiudadId } from '../utils/ciudades.js';
import { MIME_FOTO_O_VIDEO } from '../validations/archivoFoto.schema.js';
import { puedeTransicionar, type EstadoDinamica } from './dinamicas/estados.js';
import { esErrorBoletoDuplicado } from './dinamicas/errores.js';
import { validarTextoDinamica } from './dinamicas/filtros.js';
import type {
    CrearDinamicaInput,
    EditarBorradorDinamicaInput,
    ConfirmacionesDinamicaInput,
    AgregarParticipanteManualInput,
} from '../validations/dinamicas.schema.js';

export type { EstadoDinamica };

interface RespuestaError {
    success: false;
    message: string;
    code: number;
}

interface RespuestaModeracionDinamica {
    success: false;
    code: 422;
    message: string;
    moderacion: {
        categoria: string;
        mensaje: string;
        palabraDetectada?: string;
    };
}

/** Corre el filtro reducido sobre título+descripción. Sin "sugerencia
 *  suave" (ver Contexto_Dinamicas.md) — o pasa, o es rechazo duro 422. */
function aplicarModeracionDinamica(titulo: string, descripcion: string): RespuestaModeracionDinamica | null {
    const validacion = validarTextoDinamica(titulo, descripcion);
    if (validacion.valido) return null;

    return {
        success: false,
        code: 422,
        message: validacion.mensaje,
        moderacion: {
            categoria: validacion.categoria!,
            mensaje: validacion.mensaje,
            palabraDetectada: validacion.palabraDetectada,
        },
    };
}

// =============================================================================
// CREAR / EDITAR BORRADOR
// =============================================================================

export async function crearDinamica(usuarioId: string, datos: CrearDinamicaInput) {
    try {
        const rechazoModeracion = aplicarModeracionDinamica(datos.titulo, datos.descripcion ?? '');
        if (rechazoModeracion) return rechazoModeracion;

        const ciudadId = await resolverCiudadId(datos.ciudad);

        const [fila] = await db
            .insert(dinamicas)
            .values({
                organizadorUsuarioId: usuarioId,
                titulo: datos.titulo,
                descripcion: datos.descripcion,
                fotosPremio: datos.fotosPremio,
                tipoPremio: datos.tipoPremio,
                metodoSorteo: datos.metodoSorteo,
                numeroTotalBoletos: datos.numeroTotalBoletos,
                numeroBoletoInicial: datos.numeroBoletoInicial ?? 1,
                precioBoleto: datos.precioBoleto !== undefined ? String(datos.precioBoleto) : null,
                ciudadId,
                fechaLimiteInscripcion: datos.fechaLimiteInscripcion,
                reglaDesempate: datos.reglaDesempate ?? null,
                numeroLugaresGanadores: datos.numeroLugaresGanadores ?? 1,
                numeroIntentosSorteo: datos.numeroIntentosSorteo,
                estado: 'borrador',
            })
            .returning();

        return { success: true as const, data: fila };
    } catch (error) {
        console.error('Error en crearDinamica:', error);
        return { success: false, message: 'Error al crear la Dinámica', code: 500 } satisfies RespuestaError;
    }
}

/** Campos que solo se pueden tocar mientras la Dinámica sigue en 'borrador'
 *  — una vez publicada, cambiarlos sería injusto para quienes ya se
 *  inscribieron con esas reglas (boletos, precio, sorteo, fecha límite ya
 *  tiene su propio flujo vía `posponerDinamica`).
 *
 *  `numeroLugaresGanadores`/`numeroIntentosSorteo` (K/N del motor de
 *  sorteo, Fase 4.1) NO están aquí a propósito: rifas publicadas ANTES de
 *  que existiera esta fase se quedaron con `numeroIntentosSorteo = NULL` y
 *  no hay forma de "volver a borrador" para completarlo. Su propia guarda
 *  vive en `puedeConfigurarSorteo()` — se puede fijar UNA VEZ aunque ya
 *  esté publicada (mientras siga NULL, nadie ha visto/confiado en ningún
 *  valor todavía), pero ya no se puede CAMBIAR una vez configurado. */
const CAMPOS_SOLO_BORRADOR = [
    'tipoPremio',
    'metodoSorteo',
    'numeroTotalBoletos',
    'numeroBoletoInicial',
    'precioBoleto',
    'fechaLimiteInscripcion',
    'reglaDesempate',
    'ciudad',
] as const satisfies readonly (keyof EditarBorradorDinamicaInput)[];

export async function editarBorrador(
    usuarioId: string,
    dinamicaId: string,
    datos: EditarBorradorDinamicaInput,
) {
    try {
        const actual = await obtenerParaEdicion(usuarioId, dinamicaId);
        if ('success' in actual) return actual;

        const esBorrador = actual.estado === 'borrador';
        // Publicada pero todavía gestionable (no en_sorteo/cerrada/cancelada):
        // edición limitada a título, descripción y fotos del premio.
        const esPublicadaEditable = actual.estado === 'activa' || actual.estado === 'pospuesta';

        if (!esBorrador && !esPublicadaEditable) {
            return {
                success: false,
                message: 'No puedes editar una Dinámica en sorteo, cerrada o cancelada',
                code: 409,
            } satisfies RespuestaError;
        }

        if (esPublicadaEditable) {
            const intentaCampoSoloBorrador = CAMPOS_SOLO_BORRADOR.some((campo) => datos[campo] !== undefined);
            if (intentaCampoSoloBorrador) {
                return {
                    success: false,
                    message: 'Una vez publicada solo puedes editar título, descripción y fotos del premio',
                    code: 409,
                } satisfies RespuestaError;
            }

            const intentaTocarSorteo = datos.numeroLugaresGanadores !== undefined || datos.numeroIntentosSorteo !== undefined;
            if (intentaTocarSorteo) {
                if (actual.numeroIntentosSorteo !== null) {
                    return {
                        success: false,
                        message: 'El sorteo ya está configurado — no se puede modificar una vez fijado',
                        code: 409,
                    } satisfies RespuestaError;
                }
                // Zod (`validarConfigSorteo`) no puede cruzar N/K contra el
                // total de boletos aquí: en este flujo (publicada, solo K/N)
                // `numeroTotalBoletos` nunca viaja en el body — se valida
                // contra el de la fila ya guardada.
                // `tabla_completa` no usa N — su motor (`ejecutarSorteoTablaCompleta`)
                // solo consume K, gana quien complete tabla llena primero.
                const K = datos.numeroLugaresGanadores ?? actual.numeroLugaresGanadores;
                const N = datos.numeroIntentosSorteo;
                if (actual.metodoSorteo !== 'tabla_completa') {
                    if (N === undefined) {
                        return { success: false, message: 'Indica a qué intento sale el ganador', code: 400 } satisfies RespuestaError;
                    }
                    if (actual.numeroTotalBoletos !== null) {
                        if (K > actual.numeroTotalBoletos) {
                            return { success: false, message: 'No puede haber más lugares premiados que boletos totales', code: 400 } satisfies RespuestaError;
                        }
                        if (K * N > actual.numeroTotalBoletos) {
                            return {
                                success: false,
                                message: 'Lugares premiados × intentos por lugar no puede exceder el total de boletos',
                                code: 400,
                            } satisfies RespuestaError;
                        }
                    }
                } else if (actual.numeroTotalBoletos !== null && K > actual.numeroTotalBoletos) {
                    return { success: false, message: 'No puede haber más lugares premiados que boletos totales', code: 400 } satisfies RespuestaError;
                }
            }
        }

        if (datos.titulo !== undefined || datos.descripcion !== undefined) {
            const rechazoModeracion = aplicarModeracionDinamica(
                datos.titulo ?? actual.titulo,
                datos.descripcion ?? actual.descripcion ?? '',
            );
            if (rechazoModeracion) return rechazoModeracion;
        }

        const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
        if (datos.titulo !== undefined) patch.titulo = datos.titulo;
        if (datos.descripcion !== undefined) patch.descripcion = datos.descripcion;
        if (datos.fotosPremio !== undefined) patch.fotosPremio = datos.fotosPremio;
        if (esBorrador) {
            if (datos.tipoPremio !== undefined) patch.tipoPremio = datos.tipoPremio;
            if (datos.metodoSorteo !== undefined) patch.metodoSorteo = datos.metodoSorteo;
            if (datos.numeroTotalBoletos !== undefined) patch.numeroTotalBoletos = datos.numeroTotalBoletos;
            if (datos.numeroBoletoInicial !== undefined) patch.numeroBoletoInicial = datos.numeroBoletoInicial;
            if (datos.precioBoleto !== undefined) patch.precioBoleto = String(datos.precioBoleto);
            if (datos.fechaLimiteInscripcion !== undefined) patch.fechaLimiteInscripcion = datos.fechaLimiteInscripcion;
            if (datos.reglaDesempate !== undefined) patch.reglaDesempate = datos.reglaDesempate;
            if (datos.ciudad !== undefined) patch.ciudadId = await resolverCiudadId(datos.ciudad);
        }
        // K/N del sorteo: en borrador siempre, o publicada como
        // configuración única (ya validado arriba que sigue en NULL).
        if (datos.numeroLugaresGanadores !== undefined) patch.numeroLugaresGanadores = datos.numeroLugaresGanadores;
        if (datos.numeroIntentosSorteo !== undefined) patch.numeroIntentosSorteo = datos.numeroIntentosSorteo;

        const [fila] = await db
            .update(dinamicas)
            .set(patch)
            .where(eq(dinamicas.id, dinamicaId))
            .returning();

        return { success: true as const, data: fila };
    } catch (error) {
        console.error('Error en editarBorrador:', error);
        return { success: false, message: 'Error al editar la Dinámica', code: 500 } satisfies RespuestaError;
    }
}

// =============================================================================
// TRANSICIONES DE ESTADO
// =============================================================================

async function cambiarEstadoDinamica(
    usuarioId: string,
    dinamicaId: string,
    nuevoEstado: EstadoDinamica,
    extra?: Record<string, unknown>,
) {
    const actual = await obtenerParaEdicion(usuarioId, dinamicaId);
    if ('success' in actual) return actual;

    if (!puedeTransicionar(actual.estado as EstadoDinamica, nuevoEstado)) {
        return {
            success: false,
            message: `No puedes pasar una Dinámica de "${actual.estado}" a "${nuevoEstado}"`,
            code: 409,
        } satisfies RespuestaError;
    }

    const [fila] = await db
        .update(dinamicas)
        .set({ estado: nuevoEstado, updatedAt: new Date().toISOString(), ...extra })
        .where(eq(dinamicas.id, dinamicaId))
        .returning();

    return { success: true as const, data: fila };
}

/**
 * Campos que un borrador puede dejar en blanco pero que SÍ son obligatorios
 * para publicar. Red de seguridad server-side: el composer ya bloquea el
 * botón "Publicar" hasta que todo esté completo, pero esto evita que se
 * pueda publicar una Dinámica a medias pegándole directo a la API.
 */
function camposFaltantesParaPublicar(fila: typeof dinamicas.$inferSelect): string[] {
    const faltan: string[] = [];
    if (!fila.descripcion || fila.descripcion.trim().length < 20) faltan.push('descripción');
    if (!Array.isArray(fila.fotosPremio) || fila.fotosPremio.length === 0) faltan.push('fotos del premio');
    if (!fila.tipoPremio) faltan.push('tipo de premio');
    if (!fila.metodoSorteo) faltan.push('método de sorteo');
    if (!fila.numeroTotalBoletos || fila.numeroTotalBoletos <= 0) faltan.push('número de boletos');
    if (!fila.precioBoleto || Number(fila.precioBoleto) <= 0) faltan.push('precio del boleto');
    if (!fila.fechaLimiteInscripcion) faltan.push('fecha límite de inscripción');
    if (!fila.ciudadId) faltan.push('ciudad');
    return faltan;
}

export async function publicarDinamica(
    usuarioId: string,
    dinamicaId: string,
    confirmaciones: ConfirmacionesDinamicaInput,
) {
    try {
        const actual = await obtenerParaEdicion(usuarioId, dinamicaId);
        if ('success' in actual) return actual;

        const faltan = camposFaltantesParaPublicar(actual);
        if (faltan.length > 0) {
            return {
                success: false,
                message: `Completa estos campos antes de publicar: ${faltan.join(', ')}.`,
                code: 409,
            } satisfies RespuestaError;
        }

        // `aceptadasAt` lo agrega el backend (no el cliente) para tener un
        // timestamp confiable — mismo criterio que el checklist de MarketPlace.
        const confirmacionesJson = { ...confirmaciones, aceptadasAt: new Date().toISOString() };
        return await cambiarEstadoDinamica(usuarioId, dinamicaId, 'activa', {
            confirmaciones: confirmacionesJson,
        });
    } catch (error) {
        console.error('Error en publicarDinamica:', error);
        return { success: false, message: 'Error al publicar la Dinámica', code: 500 } satisfies RespuestaError;
    }
}

export async function posponerDinamica(
    usuarioId: string,
    dinamicaId: string,
    nuevaFechaLimiteInscripcion: string,
) {
    try {
        return await cambiarEstadoDinamica(usuarioId, dinamicaId, 'pospuesta', {
            fechaLimiteInscripcion: nuevaFechaLimiteInscripcion,
        });
    } catch (error) {
        console.error('Error en posponerDinamica:', error);
        return { success: false, message: 'Error al posponer la Dinámica', code: 500 } satisfies RespuestaError;
    }
}

export async function cancelarDinamica(usuarioId: string, dinamicaId: string) {
    try {
        return await cambiarEstadoDinamica(usuarioId, dinamicaId, 'cancelada');
    } catch (error) {
        console.error('Error en cancelarDinamica:', error);
        return { success: false, message: 'Error al cancelar la Dinámica', code: 500 } satisfies RespuestaError;
    }
}

// =============================================================================
// LECTURA
// =============================================================================

/** Rango real de números de boleto de una Dinámica — el organizador elige
 *  el inicio al crear (`numeroBoletoInicial`, default 1); el final se
 *  calcula siempre a partir del total, nunca se guarda como columna aparte.
 *  `null` si la Dinámica todavía no tiene `numeroTotalBoletos` (borrador
 *  incompleto). */
function rangoBoletos(dinamica: {
    numeroTotalBoletos: number | null;
    numeroBoletoInicial: number;
}): { inicio: number; fin: number } | null {
    if (!dinamica.numeroTotalBoletos) return null;
    const inicio = dinamica.numeroBoletoInicial;
    return { inicio, fin: inicio + dinamica.numeroTotalBoletos - 1 };
}

/** Trae la Dinámica validando que pertenece al usuario — helper interno de
 *  las mutaciones (editar/publicar/posponer/cancelar), no un endpoint. */
async function obtenerParaEdicion(usuarioId: string, dinamicaId: string) {
    const [fila] = await db
        .select()
        .from(dinamicas)
        .where(eq(dinamicas.id, dinamicaId))
        .limit(1);

    if (!fila) {
        return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
    }
    if (fila.organizadorUsuarioId !== usuarioId) {
        return { success: false, message: 'No tienes permiso sobre esta Dinámica', code: 403 } satisfies RespuestaError;
    }
    return fila;
}

/** Nivel de insignia por Dinámicas completadas — mismo criterio en todo el
 *  módulo (lista propia del organizador y ficha pública que ve un tercero). */
function calcularNivelInsignia(completadas: number): 'nuevo' | 'activo' | 'confiable' {
    return completadas >= 10 ? 'confiable' : completadas >= 3 ? 'activo' : 'nuevo';
}

/** Insignia de actividad de un organizador, calculada al vuelo (COUNT, sin
 *  contador cacheado — Fase 1). Usada tanto en la ficha pública de un
 *  tercero (Fase 3) como internamente por `listarMisDinamicas`. */
async function calcularInsigniaOrganizador(usuarioId: string) {
    const filas = await db
        .select({ estado: dinamicas.estado })
        .from(dinamicas)
        .where(eq(dinamicas.organizadorUsuarioId, usuarioId));

    const completadas = filas.filter((f) => f.estado === 'cerrada').length;
    const canceladas = filas.filter((f) => f.estado === 'cancelada').length;
    return { completadas, canceladas, nivel: calcularNivelInsignia(completadas) };
}

/** Lista las Dinámicas del organizador + la insignia de actividad calculada
 *  al vuelo (COUNT, sin contador cacheado — Fase 1). */
export async function listarMisDinamicas(usuarioId: string) {
    try {
        const filas = await db
            .select()
            .from(dinamicas)
            .where(eq(dinamicas.organizadorUsuarioId, usuarioId))
            .orderBy(desc(dinamicas.createdAt));

        const completadas = filas.filter((f) => f.estado === 'cerrada').length;
        const canceladas = filas.filter((f) => f.estado === 'cancelada').length;

        return {
            success: true as const,
            data: {
                dinamicas: filas,
                insignia: { completadas, canceladas, nivel: calcularNivelInsignia(completadas) },
            },
        };
    } catch (error) {
        console.error('Error en listarMisDinamicas:', error);
        return { success: false, message: 'Error al listar tus Dinámicas', code: 500 } satisfies RespuestaError;
    }
}

/** Ficha pública de una Dinámica: la fila + organizador embebido + boletos
 *  vendidos/disponibles + insignia del organizador — igual criterio de
 *  enriquecimiento que `ArticuloMarketplaceDetalle` en MarketPlace. */
/** `usuarioActualId` es opcional (viene de `verificarTokenOpcional`) — solo
 *  sirve para calcular el flag `guardado` del visitante actual, igual patrón
 *  que `marketplace.service.ts` (`obtenerArticuloDetalle`). */
export async function obtenerDinamicaPublica(dinamicaId: string, usuarioActualId?: string) {
    try {
        const guardadoExpr = usuarioActualId
            ? sql<boolean>`EXISTS (
                SELECT 1 FROM guardados g
                WHERE g.usuario_id = ${usuarioActualId}
                  AND g.entity_type = 'dinamica'
                  AND g.entity_id = ${dinamicas.id}
              )`
            : sql<boolean>`FALSE`;

        const [fila] = await db
            .select({
                dinamica: dinamicas,
                organizadorId: usuarios.id,
                organizadorNombre: usuarios.nombre,
                organizadorApellidos: usuarios.apellidos,
                organizadorAvatarUrl: usuarios.avatarUrl,
                organizadorUltimaConexion: usuarios.ultimaConexion,
                ciudadNombre: ciudades.nombre,
                guardado: guardadoExpr,
            })
            .from(dinamicas)
            .innerJoin(usuarios, eq(usuarios.id, dinamicas.organizadorUsuarioId))
            .leftJoin(ciudades, eq(ciudades.id, dinamicas.ciudadId))
            .where(eq(dinamicas.id, dinamicaId))
            .limit(1);

        if (!fila) {
            return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
        }

        const [boletosPagados, insigniaOrganizador] = await Promise.all([
            contarBoletosPagados(dinamicaId),
            calcularInsigniaOrganizador(fila.organizadorId),
        ]);

        const boletosDisponibles =
            fila.dinamica.numeroTotalBoletos !== null
                ? Math.max(0, fila.dinamica.numeroTotalBoletos - boletosPagados)
                : null;

        return {
            success: true as const,
            data: {
                ...fila.dinamica,
                ciudadNombre: fila.ciudadNombre,
                guardado: fila.guardado,
                organizador: {
                    id: fila.organizadorId,
                    nombre: fila.organizadorNombre,
                    apellidos: fila.organizadorApellidos,
                    avatarUrl: fila.organizadorAvatarUrl,
                    ultimaConexion: fila.organizadorUltimaConexion,
                },
                boletosPagados,
                boletosDisponibles,
                insigniaOrganizador,
            },
        };
    } catch (error) {
        console.error('Error en obtenerDinamicaPublica:', error);
        return { success: false, message: 'Error al obtener la Dinámica', code: 500 } satisfies RespuestaError;
    }
}

interface OpcionesFeedDinamicas {
    ciudadId: string;
    pagina?: number;
    limite?: number;
}

/** Feed público de Dinámicas — `estado IN ('activa','pospuesta')`, filtrado
 *  por ciudad, paginación offset-based igual que `marketplace.service.ts`
 *  (`pagina/limite/hayMas`, se pide `limite + 1` para saber si hay más sin
 *  un segundo COUNT). `usuarioActualId` opcional (`verificarTokenOpcional`)
 *  — solo para el flag `guardado` de cada card. */
export async function listarDinamicasPublicas(opciones: OpcionesFeedDinamicas, usuarioActualId?: string) {
    try {
        const pagina = Math.max(1, opciones.pagina ?? 1);
        const limite = Math.min(20, Math.max(1, opciones.limite ?? 10));
        const offset = (pagina - 1) * limite;

        const guardadoExpr = usuarioActualId
            ? sql<boolean>`EXISTS (
                SELECT 1 FROM guardados g
                WHERE g.usuario_id = ${usuarioActualId}
                  AND g.entity_type = 'dinamica'
                  AND g.entity_id = ${dinamicas.id}
              )`
            : sql<boolean>`FALSE`;

        const filas = await db
            .select({
                dinamica: dinamicas,
                organizadorId: usuarios.id,
                organizadorNombre: usuarios.nombre,
                organizadorApellidos: usuarios.apellidos,
                organizadorAvatarUrl: usuarios.avatarUrl,
                guardado: guardadoExpr,
            })
            .from(dinamicas)
            .innerJoin(usuarios, eq(usuarios.id, dinamicas.organizadorUsuarioId))
            .where(
                and(
                    eq(dinamicas.ciudadId, opciones.ciudadId),
                    // 'en_sorteo' incluido a propósito — si no, la rifa
                    // desaparece del feed justo cuando el organizador inicia
                    // el sorteo y nadie puede encontrarla para entrar a ver
                    // la sala en vivo. 'cerrada' se queda fuera (esas ya
                    // migran al Cuadro de Honor, ver `listarSalonFamaDinamicas`).
                    sql`${dinamicas.estado} IN ('activa', 'pospuesta', 'en_sorteo')`,
                ),
            )
            .orderBy(desc(dinamicas.createdAt))
            .limit(limite + 1)
            .offset(offset);

        const hayMas = filas.length > limite;
        const filasRecortadas = hayMas ? filas.slice(0, limite) : filas;

        const items = await Promise.all(
            filasRecortadas.map(async (fila) => {
                const boletosPagados = await contarBoletosPagados(fila.dinamica.id);
                const boletosDisponibles =
                    fila.dinamica.numeroTotalBoletos !== null
                        ? Math.max(0, fila.dinamica.numeroTotalBoletos - boletosPagados)
                        : null;
                return {
                    ...fila.dinamica,
                    guardado: fila.guardado,
                    organizador: {
                        id: fila.organizadorId,
                        nombre: fila.organizadorNombre,
                        apellidos: fila.organizadorApellidos,
                        avatarUrl: fila.organizadorAvatarUrl,
                    },
                    boletosPagados,
                    boletosDisponibles,
                };
            }),
        );

        return { success: true as const, data: { dinamicas: items, pagina, limite, hayMas } };
    } catch (error) {
        console.error('Error en listarDinamicasPublicas:', error);
        return { success: false, message: 'Error al listar Dinámicas', code: 500 } satisfies RespuestaError;
    }
}

interface OpcionesSalonFama {
    pagina?: number;
    limite?: number;
}

/** "Cuadro de Honor" — rifas ya cerradas de la ciudad, con sus ganadores, para
 *  que los resultados sean visibles sin tener que entrar a cada sala. Antes
 *  del resultado solo vivía dentro de la sala de cada Dinámica (ver
 *  `sala.service.ts` → `obtenerEstadoSala`); esto es la vista agregada
 *  pública del feed. Mismo patrón de paginación offset-based que
 *  `listarDinamicasPublicas`. */
export async function listarSalonFamaDinamicas(ciudadId: string, opciones: OpcionesSalonFama = {}) {
    try {
        const pagina = Math.max(1, opciones.pagina ?? 1);
        const limite = Math.min(20, Math.max(1, opciones.limite ?? 8));
        const offset = (pagina - 1) * limite;

        const filas = await db
            .select({ id: dinamicas.id, titulo: dinamicas.titulo, fotosPremio: dinamicas.fotosPremio, updatedAt: dinamicas.updatedAt })
            .from(dinamicas)
            .where(and(eq(dinamicas.ciudadId, ciudadId), eq(dinamicas.estado, 'cerrada')))
            .orderBy(desc(dinamicas.updatedAt))
            .limit(limite + 1)
            .offset(offset);

        const hayMas = filas.length > limite;
        const filasRecortadas = hayMas ? filas.slice(0, limite) : filas;

        const items = await Promise.all(
            filasRecortadas.map(async (fila) => {
                const ganadores = await db
                    .select({
                        lugar: dinamicaGanadores.lugar,
                        numeroBoleto: dinamicaBoletos.numeroBoleto,
                        usuarioId: dinamicaBoletos.usuarioId,
                        nombreManual: dinamicaBoletos.nombreManual,
                        usuarioNombre: usuarios.nombre,
                        usuarioApellidos: usuarios.apellidos,
                        usuarioAvatarUrl: usuarios.avatarUrl,
                    })
                    .from(dinamicaGanadores)
                    .innerJoin(dinamicaBoletos, eq(dinamicaBoletos.id, dinamicaGanadores.boletoId))
                    .leftJoin(usuarios, eq(usuarios.id, dinamicaBoletos.usuarioId))
                    .where(eq(dinamicaGanadores.dinamicaId, fila.id))
                    .orderBy(dinamicaGanadores.lugar);
                return { ...fila, ganadores };
            }),
        );

        // Defensivo: una `cerrada` sin ganadores persistidos no debería pasar
        // (el motor de sorteo siempre persiste los K ganadores antes de la
        // transición — ver `sala.service.ts` → `iniciarSorteo`), pero si pasa
        // no tiene nada útil que mostrar en el Cuadro de Honor.
        const itemsConGanadores = items.filter((item) => item.ganadores.length > 0);

        return { success: true as const, data: { dinamicas: itemsConGanadores, pagina, limite, hayMas } };
    } catch (error) {
        console.error('Error en listarSalonFamaDinamicas:', error);
        return { success: false, message: 'Error al listar el Cuadro de Honor', code: 500 } satisfies RespuestaError;
    }
}

interface OpcionesDinamicasDeOrganizador {
    pagina?: number;
    limite?: number;
    /** Solo para el propio organizador viendo "Mis Publicaciones" — incluye
     *  `cancelada` en el listado (no solo en la insignia). En el perfil
     *  público (default) se omite: no hay nada útil que mostrarle a un
     *  tercero sobre una Dinámica cancelada. */
    incluirCanceladas?: boolean;
}

/** Dinámicas organizadas por un usuario específico + su insignia — para el
 *  perfil público compartido de MarketPlace (`PaginaPerfilVendedor.tsx`,
 *  que ya muestra Publicaciones/Vendidos y ahora también "Dinámicas
 *  organizadas") y para "Mis Publicaciones" (`PaginaMisPublicaciones.tsx`,
 *  con `incluirCanceladas: true`). A diferencia de `listarMisDinamicas`
 *  (que exige que `usuarioId` sea el del token, vía el controller), esta
 *  función es pública: cualquiera puede consultar las Dinámicas de un
 *  tercero. Excluye `borrador` (privado, aún no publicado) siempre. */
export async function listarDinamicasDeOrganizador(usuarioId: string, opciones: OpcionesDinamicasDeOrganizador = {}) {
    try {
        const pagina = Math.max(1, opciones.pagina ?? 1);
        const limite = Math.min(20, Math.max(1, opciones.limite ?? 12));
        const offset = (pagina - 1) * limite;
        const estadosPermitidos = opciones.incluirCanceladas
            ? sql`${dinamicas.estado} IN ('activa', 'pospuesta', 'en_sorteo', 'cerrada', 'cancelada')`
            : sql`${dinamicas.estado} IN ('activa', 'pospuesta', 'en_sorteo', 'cerrada')`;

        const [filas, insignia] = await Promise.all([
            db
                .select({
                    dinamica: dinamicas,
                    organizadorId: usuarios.id,
                    organizadorNombre: usuarios.nombre,
                    organizadorApellidos: usuarios.apellidos,
                    organizadorAvatarUrl: usuarios.avatarUrl,
                })
                .from(dinamicas)
                .innerJoin(usuarios, eq(usuarios.id, dinamicas.organizadorUsuarioId))
                .where(
                    and(
                        eq(dinamicas.organizadorUsuarioId, usuarioId),
                        estadosPermitidos,
                    ),
                )
                .orderBy(desc(dinamicas.createdAt))
                .limit(limite + 1)
                .offset(offset),
            calcularInsigniaOrganizador(usuarioId),
        ]);

        const hayMas = filas.length > limite;
        const filasRecortadas = hayMas ? filas.slice(0, limite) : filas;

        const items = await Promise.all(
            filasRecortadas.map(async (fila) => {
                const boletosPagados = await contarBoletosPagados(fila.dinamica.id);
                const boletosDisponibles =
                    fila.dinamica.numeroTotalBoletos !== null
                        ? Math.max(0, fila.dinamica.numeroTotalBoletos - boletosPagados)
                        : null;
                return {
                    ...fila.dinamica,
                    organizador: {
                        id: fila.organizadorId,
                        nombre: fila.organizadorNombre,
                        apellidos: fila.organizadorApellidos,
                        avatarUrl: fila.organizadorAvatarUrl,
                    },
                    boletosPagados,
                    boletosDisponibles,
                };
            }),
        );

        return { success: true as const, data: { dinamicas: items, insignia, pagina, limite, hayMas } };
    } catch (error) {
        console.error('Error en listarDinamicasDeOrganizador:', error);
        return { success: false, message: 'Error al listar las Dinámicas de este organizador', code: 500 } satisfies RespuestaError;
    }
}

// =============================================================================
// SUBIDA DE IMÁGENES (R2) — evidencia del premio (Fase 2)
// =============================================================================

/** Presigned URL para subir la evidencia del premio — mismo mecanismo que
 *  `generarUrlUploadImagenMarketplace`, carpeta propia `dinamicas/`. */
export async function generarUrlUploadImagenDinamica(nombreArchivo: string, contentType: string) {
    const TIPOS_PERMITIDOS = [...MIME_FOTO_O_VIDEO];
    return generarPresignedUrl('dinamicas', nombreArchivo, contentType, 300, TIPOS_PERMITIDOS);
}

/** Antes de borrar de R2, verifica reference count contra `dinamicas.fotos_premio`
 *  (JSONB) para no borrar una foto en uso por otra Dinámica — mismo patrón que
 *  `eliminarFotoMarketplaceSiHuerfana`. Best-effort: nunca re-lanza error. */
export async function eliminarFotoDinamicaSiHuerfana(url: string, excluirDinamicaId?: string): Promise<void> {
    try {
        const filtroExcluir = excluirDinamicaId ? sql`AND id != ${excluirDinamicaId}` : sql``;

        const [{ total }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(dinamicas)
            .where(
                sql`EXISTS (
                    SELECT 1 FROM jsonb_array_elements(fotos_premio) elem
                    WHERE COALESCE(elem->>'url', elem#>>'{}') = ${url}
                       OR elem->>'posterUrl' = ${url}
                ) ${filtroExcluir}`
            );

        if (total > 0) return;
        await eliminarArchivo(url);
    } catch (error) {
        console.error('Error eliminando foto huérfana de Dinámica (no crítico):', error);
    }
}

// =============================================================================
// BOLETOS — funciones internas de bajo nivel (sin endpoint público en Fase 1)
// =============================================================================

const HORAS_EXPIRACION_RESERVA = 24;

interface ReservarBoletoInput {
    dinamicaId: string;
    numeroBoleto: number;
    usuarioId?: string;
    nombreManual?: string;
    telefonoManual?: string;
}

/**
 * Reserva un número de boleto. El `UNIQUE (dinamica_id, numero_boleto)` de la
 * tabla es lo que de verdad evita que dos personas se queden con el mismo
 * número — esta función solo traduce esa violación (código Postgres 23505,
 * mismo patrón que `resenas.service.ts`) a un error de dominio legible.
 *
 * Nota de alcance: el disparo automático de ChatYA al reservar y el endpoint
 * público con el "grid de boletos" son Fase 3 — esta función es la pieza de
 * datos que esa fase va a llamar.
 */
export async function reservarBoleto(input: ReservarBoletoInput) {
    try {
        if (!input.usuarioId && !(input.nombreManual && input.telefonoManual)) {
            return {
                success: false,
                message: 'Un participante "Sin cuenta AY" necesita nombre y teléfono',
                code: 400,
            } satisfies RespuestaError;
        }

        const reservadoEn = new Date();
        const reservadoExpiraEn = new Date(reservadoEn.getTime() + HORAS_EXPIRACION_RESERVA * 60 * 60 * 1000);

        const [fila] = await db
            .insert(dinamicaBoletos)
            .values({
                dinamicaId: input.dinamicaId,
                numeroBoleto: input.numeroBoleto,
                usuarioId: input.usuarioId ?? null,
                nombreManual: input.nombreManual ?? null,
                telefonoManual: input.telefonoManual ?? null,
                estado: 'reservado',
                reservadoEn: reservadoEn.toISOString(),
                reservadoExpiraEn: reservadoExpiraEn.toISOString(),
            })
            .returning();

        return { success: true as const, data: fila };
    } catch (error) {
        if (esErrorBoletoDuplicado(error)) {
            return {
                success: false,
                message: 'Ese número de boleto ya fue tomado',
                code: 409,
            } satisfies RespuestaError;
        }
        console.error('Error en reservarBoleto:', error);
        return { success: false, message: 'Error al reservar el boleto', code: 500 } satisfies RespuestaError;
    }
}

export async function confirmarPagoBoleto(boletoId: string) {
    try {
        const [fila] = await db
            .update(dinamicaBoletos)
            .set({ estado: 'pagado', pagadoEn: new Date().toISOString() })
            .where(and(eq(dinamicaBoletos.id, boletoId), eq(dinamicaBoletos.estado, 'reservado')))
            .returning();

        if (!fila) {
            return {
                success: false,
                message: 'El boleto no existe o ya no está en estado "reservado"',
                code: 409,
            } satisfies RespuestaError;
        }
        return { success: true as const, data: fila };
    } catch (error) {
        console.error('Error en confirmarPagoBoleto:', error);
        return { success: false, message: 'Error al confirmar el pago del boleto', code: 500 } satisfies RespuestaError;
    }
}

export async function contarBoletosPagados(dinamicaId: string): Promise<number> {
    const [fila] = await db
        .select({ total: count() })
        .from(dinamicaBoletos)
        .where(and(eq(dinamicaBoletos.dinamicaId, dinamicaId), eq(dinamicaBoletos.estado, 'pagado')));

    return fila?.total ?? 0;
}

// =============================================================================
// BOLETOS — endpoints públicos (Fase 3)
// =============================================================================

/** Mensaje automático al organizador cuando alguien reserva un boleto —
 *  calca `enviarCuponPorChatYA` (`ofertas.service.ts:1613`): best-effort,
 *  nunca rompe la reserva si el chat falla. `contextoTipo: 'directo'` (no
 *  se agrega un tipo nuevo al catálogo — evita ampliar el CHECK de
 *  `conversaciones`, mismo tipo que ya usa `useIniciarChatDirectoPersona`
 *  en el frontend). */
async function notificarReservaBoletoPorChat(
    compradorId: string,
    dinamica: typeof dinamicas.$inferSelect,
    numeroBoleto: number,
): Promise<void> {
    try {
        const convRes = await crearObtenerConversacion(
            {
                participante2Id: dinamica.organizadorUsuarioId,
                participante1Modo: 'personal',
                participante2Modo: 'personal',
                contextoTipo: 'directo',
            },
            compradorId,
        );
        if (!convRes.success || !convRes.data) return;

        // Boleto + precio en el mensaje — el organizador sabe de inmediato
        // cuál boleto es y cuánto cobrar sin tener que ir a buscarlo en la
        // app. `metodoSorteo` (tómbola/carta única/tabla completa) no cambia
        // este texto: el participante siempre reserva un "boleto" numerado
        // 1..N sin importar el método; la carta de lotería que le toque es
        // cosa del motor de sorteo (Fase 4, aún no construido).
        const precioTexto = dinamica.precioBoleto
            ? ` por $${Number(dinamica.precioBoleto).toLocaleString('es-MX')}`
            : '';
        await enviarMensaje({
            conversacionId: convRes.data.id,
            emisorId: compradorId,
            emisorModo: 'personal',
            tipo: 'texto',
            contenido: `Reservé el boleto #${numeroBoleto} de "${dinamica.titulo}"${precioTexto} — coordinamos el pago por aquí.`,
        });
    } catch (error) {
        console.error('Error enviando mensaje de reserva de boleto por ChatYA (no crítico):', error);
    }
}

/** Reserva pública de boleto: valida que la Dinámica acepte participantes,
 *  que el número esté en rango y que la fecha límite no haya vencido, antes
 *  de delegar en `reservarBoleto` (que resuelve la condición de carrera vía
 *  el UNIQUE de la tabla). Dispara el chat automático best-effort. */
export async function reservarBoletoPublico(usuarioId: string, dinamicaId: string, numeroBoleto: number) {
    try {
        const [dinamica] = await db.select().from(dinamicas).where(eq(dinamicas.id, dinamicaId)).limit(1);
        if (!dinamica) {
            return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
        }
        if (dinamica.organizadorUsuarioId === usuarioId) {
            return {
                success: false,
                message: 'No puedes reservar un boleto de tu propia Dinámica',
                code: 403,
            } satisfies RespuestaError;
        }
        if (dinamica.estado !== 'activa' && dinamica.estado !== 'pospuesta') {
            return { success: false, message: 'Esta Dinámica no está aceptando participantes', code: 409 } satisfies RespuestaError;
        }
        const rango = rangoBoletos(dinamica);
        if (!rango || numeroBoleto < rango.inicio || numeroBoleto > rango.fin) {
            return { success: false, message: 'Número de boleto fuera de rango', code: 400 } satisfies RespuestaError;
        }
        if (dinamica.fechaLimiteInscripcion && new Date(dinamica.fechaLimiteInscripcion).getTime() < Date.now()) {
            return { success: false, message: 'La fecha límite de inscripción ya pasó', code: 409 } satisfies RespuestaError;
        }

        const resultado = await reservarBoleto({ dinamicaId, numeroBoleto, usuarioId });
        if (!resultado.success) return resultado;

        notificarReservaBoletoPorChat(usuarioId, dinamica, numeroBoleto).catch(() => undefined);

        return resultado;
    } catch (error) {
        console.error('Error en reservarBoletoPublico:', error);
        return { success: false, message: 'Error al reservar el boleto', code: 500 } satisfies RespuestaError;
    }
}

/** El organizador registra a alguien sin cuenta AY — por default entra
 *  directo en `pagado` (ya cobró por fuera antes de registrarlo, ver
 *  Contexto_Dinamicas.md); si `datos.estado === 'reservado'`, entra igual
 *  que una reserva normal (con su ventana de 24h — la libera el mismo cron
 *  si nadie confirma el pago). */
export async function agregarParticipanteManual(
    organizadorUsuarioId: string,
    dinamicaId: string,
    datos: AgregarParticipanteManualInput,
) {
    try {
        const actual = await obtenerParaEdicion(organizadorUsuarioId, dinamicaId);
        if ('success' in actual) return actual;

        if (actual.estado !== 'activa' && actual.estado !== 'pospuesta') {
            return { success: false, message: 'Esta Dinámica no está aceptando participantes', code: 409 } satisfies RespuestaError;
        }
        const rango = rangoBoletos(actual);
        if (!rango || datos.numeroBoleto < rango.inicio || datos.numeroBoleto > rango.fin) {
            return { success: false, message: 'Número de boleto fuera de rango', code: 400 } satisfies RespuestaError;
        }

        const ahora = new Date();
        const reservadoExpiraEn =
            datos.estado === 'reservado'
                ? new Date(ahora.getTime() + HORAS_EXPIRACION_RESERVA * 60 * 60 * 1000)
                : ahora;
        const [fila] = await db
            .insert(dinamicaBoletos)
            .values({
                dinamicaId,
                numeroBoleto: datos.numeroBoleto,
                nombreManual: datos.nombreManual,
                telefonoManual: datos.telefonoManual,
                estado: datos.estado,
                reservadoEn: ahora.toISOString(),
                reservadoExpiraEn: reservadoExpiraEn.toISOString(),
                pagadoEn: datos.estado === 'pagado' ? ahora.toISOString() : null,
            })
            .returning();

        return { success: true as const, data: fila };
    } catch (error) {
        if (esErrorBoletoDuplicado(error)) {
            return { success: false, message: 'Ese número de boleto ya fue tomado', code: 409 } satisfies RespuestaError;
        }
        console.error('Error en agregarParticipanteManual:', error);
        return { success: false, message: 'Error al agregar el participante', code: 500 } satisfies RespuestaError;
    }
}

/** El organizador confirma que un boleto reservado ya se pagó (fuera de la
 *  app) — valida que quien llama es el organizador antes de delegar en
 *  `confirmarPagoBoleto`. Si el boleto pertenece a un usuario con cuenta AY
 *  (se reservó solo, no fue alta manual), le avisa por notificación
 *  best-effort — los participantes "Sin cuenta AY" no tienen usuario al que
 *  notificar dentro de la app. */
export async function confirmarPagoBoletoOrganizador(
    organizadorUsuarioId: string,
    dinamicaId: string,
    boletoId: string,
) {
    try {
        const actual = await obtenerParaEdicion(organizadorUsuarioId, dinamicaId);
        if ('success' in actual) return actual;

        const [boleto] = await db.select().from(dinamicaBoletos).where(eq(dinamicaBoletos.id, boletoId)).limit(1);
        if (!boleto || boleto.dinamicaId !== dinamicaId) {
            return { success: false, message: 'Boleto no encontrado', code: 404 } satisfies RespuestaError;
        }

        const resultado = await confirmarPagoBoleto(boletoId);
        if (!resultado.success) return resultado;

        if (boleto.usuarioId) {
            notificarPagoBoletoConfirmado(boleto.usuarioId, dinamicaId, actual.titulo, boleto.numeroBoleto).catch(() => undefined);
        }

        return resultado;
    } catch (error) {
        console.error('Error en confirmarPagoBoletoOrganizador:', error);
        return { success: false, message: 'Error al confirmar el pago del boleto', code: 500 } satisfies RespuestaError;
    }
}

/** El organizador libera un boleto (`reservado` o `pagado`) — lo borra y el
 *  número vuelve a estar `disponible` de inmediato, sin esperar el cron de
 *  24h (que solo libera `reservado` vencidos). Cubre: participante se
 *  arrepintió, alta manual por error, boleto duplicado. Si el boleto tenía
 *  `usuarioId`, avisa al participante por notificación — pierde su lugar. */
export async function liberarBoleto(
    organizadorUsuarioId: string,
    dinamicaId: string,
    boletoId: string,
) {
    try {
        const actual = await obtenerParaEdicion(organizadorUsuarioId, dinamicaId);
        if ('success' in actual) return actual;

        const [boleto] = await db.select().from(dinamicaBoletos).where(eq(dinamicaBoletos.id, boletoId)).limit(1);
        if (!boleto || boleto.dinamicaId !== dinamicaId) {
            return { success: false, message: 'Boleto no encontrado', code: 404 } satisfies RespuestaError;
        }

        await db.delete(dinamicaBoletos).where(eq(dinamicaBoletos.id, boletoId));

        if (boleto.usuarioId) {
            notificarBoletoLiberado(boleto.usuarioId, dinamicaId, actual.titulo, boleto.numeroBoleto).catch(() => undefined);
        }

        return { success: true as const, data: { numeroBoleto: boleto.numeroBoleto } };
    } catch (error) {
        console.error('Error en liberarBoleto:', error);
        return { success: false, message: 'Error al liberar el boleto', code: 500 } satisfies RespuestaError;
    }
}

/** El organizador corrige nombre/teléfono — y opcionalmente reasigna el
 *  número de boleto en el mismo paso, sin pasar por "Liberar" + "Agregar" —
 *  de un participante "Sin cuenta AY" dado de alta manualmente. Solo aplica
 *  a boletos manuales (sin `usuarioId`) — el registro de alguien con cuenta
 *  AnunciaYA es suyo, no se edita desde aquí. */
export async function editarParticipanteManual(
    organizadorUsuarioId: string,
    dinamicaId: string,
    boletoId: string,
    datos: { numeroBoleto: number; nombreManual: string; telefonoManual: string },
) {
    try {
        const actual = await obtenerParaEdicion(organizadorUsuarioId, dinamicaId);
        if ('success' in actual) return actual;

        const [boleto] = await db.select().from(dinamicaBoletos).where(eq(dinamicaBoletos.id, boletoId)).limit(1);
        if (!boleto || boleto.dinamicaId !== dinamicaId) {
            return { success: false, message: 'Boleto no encontrado', code: 404 } satisfies RespuestaError;
        }
        if (boleto.usuarioId) {
            return {
                success: false,
                message: 'Este boleto pertenece a un usuario con cuenta AnunciaYA — no se puede editar desde aquí',
                code: 409,
            } satisfies RespuestaError;
        }
        const rango = rangoBoletos(actual);
        if (!rango || datos.numeroBoleto < rango.inicio || datos.numeroBoleto > rango.fin) {
            return { success: false, message: 'Número de boleto fuera de rango', code: 400 } satisfies RespuestaError;
        }

        const [fila] = await db
            .update(dinamicaBoletos)
            .set({ numeroBoleto: datos.numeroBoleto, nombreManual: datos.nombreManual, telefonoManual: datos.telefonoManual })
            .where(eq(dinamicaBoletos.id, boletoId))
            .returning();

        return { success: true as const, data: fila };
    } catch (error) {
        if (esErrorBoletoDuplicado(error)) {
            return { success: false, message: 'Ese número de boleto ya fue tomado', code: 409 } satisfies RespuestaError;
        }
        console.error('Error en editarParticipanteManual:', error);
        return { success: false, message: 'Error al editar el participante', code: 500 } satisfies RespuestaError;
    }
}

/** El organizador reasigna el número de un boleto CON cuenta AnunciaYA — a
 *  diferencia de `editarParticipanteManual`, aquí no se toca nombre/teléfono
 *  (son del usuario, no del organizador) y SÍ aplica cuando `usuarioId`
 *  existe. Best-effort: avisa al participante por notificación. */
export async function reasignarBoleto(
    organizadorUsuarioId: string,
    dinamicaId: string,
    boletoId: string,
    nuevoNumero: number,
) {
    try {
        const actual = await obtenerParaEdicion(organizadorUsuarioId, dinamicaId);
        if ('success' in actual) return actual;

        const [boleto] = await db.select().from(dinamicaBoletos).where(eq(dinamicaBoletos.id, boletoId)).limit(1);
        if (!boleto || boleto.dinamicaId !== dinamicaId) {
            return { success: false, message: 'Boleto no encontrado', code: 404 } satisfies RespuestaError;
        }
        const rango = rangoBoletos(actual);
        if (!rango || nuevoNumero < rango.inicio || nuevoNumero > rango.fin) {
            return { success: false, message: 'Número de boleto fuera de rango', code: 400 } satisfies RespuestaError;
        }

        const numeroAnterior = boleto.numeroBoleto;
        if (nuevoNumero === numeroAnterior) {
            return { success: true as const, data: boleto };
        }

        const [fila] = await db
            .update(dinamicaBoletos)
            .set({ numeroBoleto: nuevoNumero })
            .where(eq(dinamicaBoletos.id, boletoId))
            .returning();

        if (boleto.usuarioId) {
            notificarBoletoReasignado(boleto.usuarioId, dinamicaId, actual.titulo, numeroAnterior, nuevoNumero).catch(() => undefined);
        }

        return { success: true as const, data: fila };
    } catch (error) {
        if (esErrorBoletoDuplicado(error)) {
            return { success: false, message: 'Ese número de boleto ya fue tomado', code: 409 } satisfies RespuestaError;
        }
        console.error('Error en reasignarBoleto:', error);
        return { success: false, message: 'Error al reasignar el boleto', code: 500 } satisfies RespuestaError;
    }
}

/** Lista pública de participantes (transparencia, ver Contexto_Dinamicas.md)
 *  — sin teléfono para cualquier solicitante. Incluye `id/nombre/apellidos/
 *  avatarUrl` de los que tienen cuenta AY: son justo los campos que pide
 *  `useIniciarChatDirectoPersona` en el frontend para el botón "Contactar"
 *  (visible a cualquiera que vea la lista, no solo al organizador).
 *
 *  `usuarioSolicitanteId` (opcional, viene del token si lo hay) — cuando
 *  coincide con el organizador de la Dinámica, cada boleto manual incluye
 *  también `telefonoManual` (necesario para hidratar
 *  `ModalEditarParticipante`); para cualquier otro solicitante se omite. */
export async function listarBoletosPublico(dinamicaId: string, usuarioSolicitanteId?: string) {
    try {
        const filas = await db
            .select({
                id: dinamicaBoletos.id,
                numeroBoleto: dinamicaBoletos.numeroBoleto,
                estado: dinamicaBoletos.estado,
                nombreManual: dinamicaBoletos.nombreManual,
                telefonoManual: dinamicaBoletos.telefonoManual,
                usuarioId: usuarios.id,
                usuarioNombre: usuarios.nombre,
                usuarioApellidos: usuarios.apellidos,
                usuarioAvatarUrl: usuarios.avatarUrl,
                organizadorUsuarioId: dinamicas.organizadorUsuarioId,
            })
            .from(dinamicaBoletos)
            .innerJoin(dinamicas, eq(dinamicas.id, dinamicaBoletos.dinamicaId))
            .leftJoin(usuarios, eq(usuarios.id, dinamicaBoletos.usuarioId))
            .where(eq(dinamicaBoletos.dinamicaId, dinamicaId))
            .orderBy(dinamicaBoletos.numeroBoleto);

        const esOrganizador = !!usuarioSolicitanteId && filas[0]?.organizadorUsuarioId === usuarioSolicitanteId;

        const boletos = filas.map((f) => ({
            id: f.id,
            numeroBoleto: f.numeroBoleto,
            estado: f.estado,
            usuario: f.usuarioId
                ? { id: f.usuarioId, nombre: f.usuarioNombre, apellidos: f.usuarioApellidos, avatarUrl: f.usuarioAvatarUrl }
                : null,
            nombreManual: f.usuarioId ? null : f.nombreManual,
            ...(esOrganizador ? { telefonoManual: f.usuarioId ? null : f.telefonoManual } : {}),
        }));

        return { success: true as const, data: boletos };
    } catch (error) {
        console.error('Error en listarBoletosPublico:', error);
        return { success: false, message: 'Error al listar los participantes', code: 500 } satisfies RespuestaError;
    }
}

/** Libera los boletos `reservado` cuya ventana de 24h ya venció (nadie
 *  confirmó el pago) — llamado por el cron `dinamicas-expiracion.cron.ts`.
 *  DELETE directo: el número simplemente vuelve a estar disponible. */
export async function liberarBoletosExpirados(): Promise<number> {
    const filas = await db
        .delete(dinamicaBoletos)
        .where(and(eq(dinamicaBoletos.estado, 'reservado'), sql`${dinamicaBoletos.reservadoExpiraEn} < NOW()`))
        .returning({ id: dinamicaBoletos.id });

    return filas.length;
}

// =============================================================================
// NOTIFICACIONES (Fase 1 solo dispara las 2 previstas: posponer y resultado)
// =============================================================================

export async function notificarDinamicaPospuesta(
    usuarioId: string,
    dinamicaId: string,
    titulo: string,
    nuevaFecha: string,
) {
    return crearNotificacion({
        usuarioId,
        modo: 'personal',
        tipo: 'dinamica_pospuesta',
        titulo: 'Dinámica pospuesta',
        mensaje: `"${titulo}" se pospuso — nueva fecha límite: ${new Date(nuevaFecha).toLocaleDateString('es-MX')}.`,
        referenciaId: dinamicaId,
        referenciaTipo: 'dinamica',
    }).catch(() => undefined);
}

/** A cada participante con cuenta AY (boletos `reservado`/`pagado` con
 *  `usuarioId`) cuando se pospone la fecha límite — el organizador ya recibe
 *  la suya aparte vía `notificarDinamicaPospuesta`. Los participantes "Sin
 *  cuenta AY" no tienen usuario al que notificar dentro de la app; se
 *  enteran por ChatYA/teléfono directo con el organizador. */
export async function notificarParticipantesDinamicaPospuesta(
    dinamicaId: string,
    titulo: string,
    nuevaFecha: string,
) {
    try {
        const filas = await db
            .select({ usuarioId: dinamicaBoletos.usuarioId })
            .from(dinamicaBoletos)
            .where(and(eq(dinamicaBoletos.dinamicaId, dinamicaId), isNotNull(dinamicaBoletos.usuarioId)));

        const usuarioIds = [...new Set(filas.map((f) => f.usuarioId as string))];

        await Promise.all(
            usuarioIds.map((usuarioId) => notificarDinamicaPospuesta(usuarioId, dinamicaId, titulo, nuevaFecha)),
        );
    } catch (error) {
        console.error('Error en notificarParticipantesDinamicaPospuesta:', error);
    }
}

/** Al participante (con cuenta AY) cuando el organizador confirma que ya
 *  recibió su pago del boleto. */
export async function notificarPagoBoletoConfirmado(
    usuarioId: string,
    dinamicaId: string,
    titulo: string,
    numeroBoleto: number,
) {
    return crearNotificacion({
        usuarioId,
        modo: 'personal',
        tipo: 'dinamica_pago_confirmado',
        titulo: 'Pago confirmado',
        mensaje: `El organizador de "${titulo}" confirmó tu pago del boleto #${numeroBoleto}.`,
        referenciaId: dinamicaId,
        referenciaTipo: 'dinamica',
    }).catch(() => undefined);
}

/** Al participante (con cuenta AY) cuando el organizador reasigna su boleto
 *  a otro número. */
export async function notificarBoletoReasignado(
    usuarioId: string,
    dinamicaId: string,
    titulo: string,
    numeroAnterior: number,
    numeroNuevo: number,
) {
    return crearNotificacion({
        usuarioId,
        modo: 'personal',
        tipo: 'dinamica_boleto_reasignado',
        titulo: 'Tu boleto cambió de número',
        mensaje: `El organizador de "${titulo}" reasignó tu boleto: pasaste del #${numeroAnterior} al #${numeroNuevo}.`,
        referenciaId: dinamicaId,
        referenciaTipo: 'dinamica',
    }).catch(() => undefined);
}

/** Al participante (con cuenta AY) cuando el organizador libera su boleto —
 *  pierde su lugar, el número vuelve a estar disponible de inmediato. */
export async function notificarBoletoLiberado(
    usuarioId: string,
    dinamicaId: string,
    titulo: string,
    numeroBoleto: number,
) {
    return crearNotificacion({
        usuarioId,
        modo: 'personal',
        tipo: 'dinamica_boleto_liberado',
        titulo: 'Tu boleto fue liberado',
        mensaje: `El organizador de "${titulo}" liberó tu boleto #${numeroBoleto} — ya no está a tu nombre.`,
        referenciaId: dinamicaId,
        referenciaTipo: 'dinamica',
    }).catch(() => undefined);
}
