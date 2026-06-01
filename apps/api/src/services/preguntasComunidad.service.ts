/**
 * preguntasComunidad.service.ts
 * ==============================
 * Service para el feed "Pregúntale a [ciudad]" del Home.
 *
 * Operaciones:
 *   - crearPregunta            → inserta una pregunta del vecino
 *   - listarPreguntasPorCiudad → feed paginado, solo 'activa', más reciente primero
 *
 * UBICACIÓN: apps/api/src/services/preguntasComunidad.service.ts
 */

import { db } from '../db/index.js';
import { preguntasComunidad, usuarios } from '../db/schemas/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import type {
    CrearPreguntaInput,
    ListarPreguntasPorCiudadInput,
    PreguntaComunidadResponse,
    EstadoPregunta,
    EstadoCoyo,
    RespuestaServicio,
} from '../types/preguntasComunidad.types.js';
import { procesarPreguntaConCoyo } from './coyo/orquestador.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const TEXTO_MAX = 500;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 50;

// =============================================================================
// CREAR PREGUNTA
// =============================================================================

/**
 * Inserta una pregunta y devuelve el row resultante con datos básicos del autor.
 * Valida texto (no vacío, ≤ 500) y presencia de ciudad/estado.
 */
export async function crearPregunta(
    input: CrearPreguntaInput
): Promise<RespuestaServicio<PreguntaComunidadResponse>> {
    try {
        const texto = (input.texto ?? '').trim();
        const ciudad = (input.ciudad ?? '').trim();
        const estado = (input.estado ?? '').trim();

        // Validaciones (mismas reglas que el CHECK / NOT NULL del schema)
        if (texto.length === 0) {
            return { success: false, message: 'El texto de la pregunta no puede estar vacío', code: 400 };
        }
        if (texto.length > TEXTO_MAX) {
            return { success: false, message: `El texto excede el máximo de ${TEXTO_MAX} caracteres`, code: 400 };
        }
        if (ciudad.length === 0 || estado.length === 0) {
            return { success: false, message: 'Ciudad y estado son requeridos', code: 400 };
        }

        // Insert — estado_pregunta queda en el default 'activa'
        const [nueva] = await db
            .insert(preguntasComunidad)
            .values({
                usuarioId: input.usuarioId,
                texto,
                ciudad,
                estado,
            })
            .returning();

        // Traer datos del autor para enriquecer el response (el frontend
        // necesita poder pintar avatar/nombre sin un round-trip extra).
        const [autor] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                avatarUrl: usuarios.avatarUrl,
            })
            .from(usuarios)
            .where(eq(usuarios.id, input.usuarioId))
            .limit(1);

        if (!autor) {
            // Caso degenerado: el FK garantiza que el autor existe al momento
            // del insert, así que esto solo pasaría en un race con un borrado
            // de cuenta concurrente. Reportamos pero devolvemos la pregunta
            // creada con datos vacíos para no perder el trabajo del usuario.
            return {
                success: false,
                message: 'Pregunta creada pero no se pudieron cargar los datos del autor',
                code: 500,
            };
        }

        const preguntaFormateada: PreguntaComunidadResponse = {
            id: nueva.id,
            texto: nueva.texto,
            ciudad: nueva.ciudad,
            estado: nueva.estado,
            estadoPregunta: nueva.estadoPregunta as EstadoPregunta,
            createdAt: nueva.createdAt ?? new Date().toISOString(),
            updatedAt: nueva.updatedAt ?? new Date().toISOString(),
            autorId: autor.id,
            autorNombre: autor.nombre,
            autorApellidos: autor.apellidos,
            autorAvatarUrl: autor.avatarUrl ?? null,
            // Campos de Coyo en su estado inicial — el frontend sondeará
            // con GET /api/preguntas-comunidad/:id/coyo hasta que el
            // orquestador (disparado fire-and-forget abajo) los actualice.
            estadoCoyo: nueva.estadoCoyo as EstadoCoyo,
            respuestaCoyo: nueva.respuestaCoyo ?? null,
            resultadosCoyo: nueva.resultadosCoyo ?? null,
            coyoProcesadoAt: nueva.coyoProcesadoAt ?? null,
            // Campos nuevos del Sprint 1 — recién creada no tiene nada todavía.
            resueltaAt: null,
            totalRespuestas: 0,
            totalInteresados: 0,
            yoTambienInteresado: false,
        };

        // ─── DISPARO COYO EN SEGUNDO PLANO (fire-and-forget) ─────────
        // No await. La pregunta se publica al instante; Coyo procesa
        // detrás. Si falla, se loguea — la publicación NO depende ni
        // espera a Coyo. El frontend sondea para enterarse del progreso.
        procesarPreguntaConCoyo(nueva.id).catch((err) => {
            console.warn(
                'Coyo orquestador falló (fire-and-forget) para',
                nueva.id,
                err,
            );
        });

        return {
            success: true,
            message: 'Pregunta creada',
            data: preguntaFormateada,
        };
    } catch (error) {
        console.error('Error en crearPregunta:', error);
        return { success: false, message: 'Error al crear pregunta', code: 500 };
    }
}

// =============================================================================
// LISTAR PREGUNTAS POR CIUDAD
// =============================================================================

/**
 * Devuelve el feed de preguntas 'activa' de una ciudad, ordenadas de la más
 * nueva a la más vieja. Incluye datos básicos del autor (join con usuarios).
 */
export async function listarPreguntasPorCiudad(
    input: ListarPreguntasPorCiudadInput
): Promise<RespuestaServicio<PreguntaComunidadResponse[]>> {
    try {
        const ciudad = (input.ciudad ?? '').trim();
        if (ciudad.length === 0) {
            return { success: false, message: 'La ciudad es requerida', code: 400 };
        }

        // Sanear paginación
        const limitRaw = input.limit ?? LIMIT_DEFAULT;
        const offsetRaw = input.offset ?? 0;
        const limit = Math.min(Math.max(1, Math.floor(limitRaw)), LIMIT_MAX);
        const offset = Math.max(0, Math.floor(offsetRaw));

        const filas = await db
            .select({
                id: preguntasComunidad.id,
                texto: preguntasComunidad.texto,
                ciudad: preguntasComunidad.ciudad,
                estado: preguntasComunidad.estado,
                estadoPregunta: preguntasComunidad.estadoPregunta,
                createdAt: preguntasComunidad.createdAt,
                updatedAt: preguntasComunidad.updatedAt,
                autorId: usuarios.id,
                autorNombre: usuarios.nombre,
                autorApellidos: usuarios.apellidos,
                autorAvatarUrl: usuarios.avatarUrl,
                // Campos de Coyo — al recargar el feed, las preguntas viejas
                // ya tienen su respuesta lista (no requiere sondear).
                estadoCoyo: preguntasComunidad.estadoCoyo,
                respuestaCoyo: preguntasComunidad.respuestaCoyo,
                resultadosCoyo: preguntasComunidad.resultadosCoyo,
                coyoProcesadoAt: preguntasComunidad.coyoProcesadoAt,
            })
            .from(preguntasComunidad)
            .leftJoin(usuarios, eq(preguntasComunidad.usuarioId, usuarios.id))
            .where(and(
                eq(preguntasComunidad.ciudad, ciudad),
                eq(preguntasComunidad.estadoPregunta, 'activa')
            ))
            .orderBy(desc(preguntasComunidad.createdAt))
            .limit(limit)
            .offset(offset);

        const preguntas: PreguntaComunidadResponse[] = filas.map((f) => ({
            id: f.id,
            texto: f.texto,
            ciudad: f.ciudad,
            estado: f.estado,
            estadoPregunta: f.estadoPregunta as EstadoPregunta,
            createdAt: f.createdAt ?? new Date().toISOString(),
            updatedAt: f.updatedAt ?? new Date().toISOString(),
            // El left join podría devolver null si la cuenta del autor fue
            // eliminada después de crear la pregunta (FK es ON DELETE CASCADE,
            // así que en la práctica no debería pasar — pero somos defensivos).
            autorId: f.autorId ?? '',
            autorNombre: f.autorNombre ?? '',
            autorApellidos: f.autorApellidos ?? '',
            autorAvatarUrl: f.autorAvatarUrl ?? null,
            estadoCoyo: f.estadoCoyo as EstadoCoyo,
            respuestaCoyo: f.respuestaCoyo,
            resultadosCoyo: f.resultadosCoyo,
            coyoProcesadoAt: f.coyoProcesadoAt,
            // Campos nuevos del Sprint 1 — defaults por ahora.
            // En la Fase 1.B (backend de respuestas + interés) este service
            // se reescribe para agregar joins/subqueries y poblar los conteos
            // reales + el flag `yoTambienInteresado` según el usuarioId actual.
            resueltaAt: null,
            totalRespuestas: 0,
            totalInteresados: 0,
            yoTambienInteresado: false,
        }));

        return {
            success: true,
            message: 'Preguntas obtenidas',
            data: preguntas,
        };
    } catch (error) {
        console.error('Error en listarPreguntasPorCiudad:', error);
        return { success: false, message: 'Error al listar preguntas', code: 500 };
    }
}
