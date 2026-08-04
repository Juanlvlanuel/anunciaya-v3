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

import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dinamicas, dinamicaBoletos } from '../db/schemas/schema.js';
import { crearNotificacion } from './notificaciones.service.js';
import { eliminarArchivo, generarPresignedUrl } from './r2.service.js';
import { resolverCiudadId } from '../utils/ciudades.js';
import { MIME_FOTO_O_VIDEO } from '../validations/archivoFoto.schema.js';
import { puedeTransicionar, type EstadoDinamica } from './dinamicas/estados.js';
import { esErrorBoletoDuplicado } from './dinamicas/errores.js';
import { validarTextoDinamica } from './dinamicas/filtros.js';
import type {
    CrearDinamicaInput,
    EditarBorradorDinamicaInput,
    ConfirmacionesDinamicaInput,
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
                precioBoleto: datos.precioBoleto !== undefined ? String(datos.precioBoleto) : null,
                ciudadId,
                fechaLimiteInscripcion: datos.fechaLimiteInscripcion,
                reglaDesempate: datos.reglaDesempate ?? null,
                estado: 'borrador',
            })
            .returning();

        return { success: true as const, data: fila };
    } catch (error) {
        console.error('Error en crearDinamica:', error);
        return { success: false, message: 'Error al crear la Dinámica', code: 500 } satisfies RespuestaError;
    }
}

export async function editarBorrador(
    usuarioId: string,
    dinamicaId: string,
    datos: EditarBorradorDinamicaInput,
) {
    try {
        const actual = await obtenerParaEdicion(usuarioId, dinamicaId);
        if ('success' in actual) return actual;

        if (actual.estado !== 'borrador') {
            return {
                success: false,
                message: 'Solo puedes editar una Dinámica mientras está en borrador',
                code: 409,
            } satisfies RespuestaError;
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
        if (datos.tipoPremio !== undefined) patch.tipoPremio = datos.tipoPremio;
        if (datos.metodoSorteo !== undefined) patch.metodoSorteo = datos.metodoSorteo;
        if (datos.numeroTotalBoletos !== undefined) patch.numeroTotalBoletos = datos.numeroTotalBoletos;
        if (datos.precioBoleto !== undefined) patch.precioBoleto = String(datos.precioBoleto);
        if (datos.fechaLimiteInscripcion !== undefined) patch.fechaLimiteInscripcion = datos.fechaLimiteInscripcion;
        if (datos.reglaDesempate !== undefined) patch.reglaDesempate = datos.reglaDesempate;
        if (datos.ciudad !== undefined) patch.ciudadId = await resolverCiudadId(datos.ciudad);

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

export async function obtenerDinamica(dinamicaId: string) {
    try {
        const [fila] = await db
            .select()
            .from(dinamicas)
            .where(eq(dinamicas.id, dinamicaId))
            .limit(1);

        if (!fila) {
            return { success: false, message: 'Dinámica no encontrada', code: 404 } satisfies RespuestaError;
        }
        return { success: true as const, data: fila };
    } catch (error) {
        console.error('Error en obtenerDinamica:', error);
        return { success: false, message: 'Error al obtener la Dinámica', code: 500 } satisfies RespuestaError;
    }
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
        const nivel = completadas >= 10 ? 'confiable' : completadas >= 3 ? 'activo' : 'nuevo';

        return {
            success: true as const,
            data: {
                dinamicas: filas,
                insignia: { completadas, canceladas, nivel },
            },
        };
    } catch (error) {
        console.error('Error en listarMisDinamicas:', error);
        return { success: false, message: 'Error al listar tus Dinámicas', code: 500 } satisfies RespuestaError;
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
