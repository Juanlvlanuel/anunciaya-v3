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

import { and, desc, eq, count, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { dinamicas, dinamicaBoletos, usuarios } from '../db/schemas/schema.js';
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
export async function obtenerDinamicaPublica(dinamicaId: string) {
    try {
        const [fila] = await db
            .select({
                dinamica: dinamicas,
                organizadorId: usuarios.id,
                organizadorNombre: usuarios.nombre,
                organizadorApellidos: usuarios.apellidos,
                organizadorAvatarUrl: usuarios.avatarUrl,
            })
            .from(dinamicas)
            .innerJoin(usuarios, eq(usuarios.id, dinamicas.organizadorUsuarioId))
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
                organizador: {
                    id: fila.organizadorId,
                    nombre: fila.organizadorNombre,
                    apellidos: fila.organizadorApellidos,
                    avatarUrl: fila.organizadorAvatarUrl,
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
 *  un segundo COUNT). */
export async function listarDinamicasPublicas(opciones: OpcionesFeedDinamicas) {
    try {
        const pagina = Math.max(1, opciones.pagina ?? 1);
        const limite = Math.min(20, Math.max(1, opciones.limite ?? 10));
        const offset = (pagina - 1) * limite;

        const filas = await db
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
                    eq(dinamicas.ciudadId, opciones.ciudadId),
                    sql`${dinamicas.estado} IN ('activa', 'pospuesta')`,
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

        await enviarMensaje({
            conversacionId: convRes.data.id,
            emisorId: compradorId,
            emisorModo: 'personal',
            tipo: 'texto',
            contenido: `Reservé un boleto para "${dinamica.titulo}" — coordinamos el pago por aquí.`,
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
        if (dinamica.estado !== 'activa' && dinamica.estado !== 'pospuesta') {
            return { success: false, message: 'Esta Dinámica no está aceptando participantes', code: 409 } satisfies RespuestaError;
        }
        if (!dinamica.numeroTotalBoletos || numeroBoleto < 1 || numeroBoleto > dinamica.numeroTotalBoletos) {
            return { success: false, message: 'Número de boleto fuera de rango', code: 400 } satisfies RespuestaError;
        }
        if (dinamica.fechaLimiteInscripcion && new Date(dinamica.fechaLimiteInscripcion).getTime() < Date.now()) {
            return { success: false, message: 'La fecha límite de inscripción ya pasó', code: 409 } satisfies RespuestaError;
        }

        const resultado = await reservarBoleto({ dinamicaId, numeroBoleto, usuarioId });
        if (!resultado.success) return resultado;

        notificarReservaBoletoPorChat(usuarioId, dinamica).catch(() => undefined);

        return resultado;
    } catch (error) {
        console.error('Error en reservarBoletoPublico:', error);
        return { success: false, message: 'Error al reservar el boleto', code: 500 } satisfies RespuestaError;
    }
}

/** El organizador registra a alguien sin cuenta AY — entra directo en
 *  `pagado` (ya cobró por fuera antes de registrarlo, ver Contexto_Dinamicas.md). */
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
        if (!actual.numeroTotalBoletos || datos.numeroBoleto < 1 || datos.numeroBoleto > actual.numeroTotalBoletos) {
            return { success: false, message: 'Número de boleto fuera de rango', code: 400 } satisfies RespuestaError;
        }

        const ahora = new Date().toISOString();
        const [fila] = await db
            .insert(dinamicaBoletos)
            .values({
                dinamicaId,
                numeroBoleto: datos.numeroBoleto,
                nombreManual: datos.nombreManual,
                telefonoManual: datos.telefonoManual,
                estado: 'pagado',
                reservadoEn: ahora,
                reservadoExpiraEn: ahora,
                pagadoEn: ahora,
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
 *  `confirmarPagoBoleto`. */
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

        return await confirmarPagoBoleto(boletoId);
    } catch (error) {
        console.error('Error en confirmarPagoBoletoOrganizador:', error);
        return { success: false, message: 'Error al confirmar el pago del boleto', code: 500 } satisfies RespuestaError;
    }
}

/** Lista pública de participantes (transparencia, ver Contexto_Dinamicas.md)
 *  — sin teléfono. Incluye `id/nombre/apellidos/avatarUrl` de los que tienen
 *  cuenta AY: son justo los campos que pide `useIniciarChatDirectoPersona`
 *  en el frontend para el botón "Contactar" (visible a cualquiera que vea
 *  la lista, no solo al organizador). */
export async function listarBoletosPublico(dinamicaId: string) {
    try {
        const filas = await db
            .select({
                id: dinamicaBoletos.id,
                numeroBoleto: dinamicaBoletos.numeroBoleto,
                estado: dinamicaBoletos.estado,
                nombreManual: dinamicaBoletos.nombreManual,
                usuarioId: usuarios.id,
                usuarioNombre: usuarios.nombre,
                usuarioApellidos: usuarios.apellidos,
                usuarioAvatarUrl: usuarios.avatarUrl,
            })
            .from(dinamicaBoletos)
            .leftJoin(usuarios, eq(usuarios.id, dinamicaBoletos.usuarioId))
            .where(eq(dinamicaBoletos.dinamicaId, dinamicaId))
            .orderBy(dinamicaBoletos.numeroBoleto);

        const boletos = filas.map((f) => ({
            id: f.id,
            numeroBoleto: f.numeroBoleto,
            estado: f.estado,
            usuario: f.usuarioId
                ? { id: f.usuarioId, nombre: f.usuarioNombre, apellidos: f.usuarioApellidos, avatarUrl: f.usuarioAvatarUrl }
                : null,
            nombreManual: f.usuarioId ? null : f.nombreManual,
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
