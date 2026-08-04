/**
 * ============================================================================
 * DINÁMICAS CONTROLLER — Manejo de peticiones HTTP (Fase 1)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/controllers/dinamicas.controller.ts
 *
 * Patrón idéntico a `marketplace.controller.ts`: solo orquesta validación
 * Zod, extracción de params/body, llamada al service y mapeo a status HTTP.
 * Cero lógica de negocio aquí.
 */

import type { Request, Response } from 'express';
import {
    crearDinamica,
    editarBorrador,
    publicarDinamica,
    posponerDinamica,
    cancelarDinamica,
    obtenerDinamica,
    listarMisDinamicas,
    notificarDinamicaPospuesta,
    generarUrlUploadImagenDinamica,
    eliminarFotoDinamicaSiHuerfana,
} from '../services/dinamicas.service.js';
import {
    crearDinamicaSchema,
    editarBorradorDinamicaSchema,
    publicarDinamicaSchema,
    posponerDinamicaSchema,
    uploadImagenDinamicaSchema,
    formatearErroresZod,
} from '../validations/dinamicas.schema.js';

function exigirUsuarioId(req: Request, res: Response): string | null {
    const id = req.usuario?.usuarioId ?? null;
    if (!id) {
        res.status(401).json({ success: false, message: 'No autenticado' });
        return null;
    }
    return id;
}

// =============================================================================
// PRIVADOS (verificarToken + requiereModoPersonal)
// =============================================================================

/** POST /api/dinamicas */
export async function postCrearDinamica(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = crearDinamicaSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await crearDinamica(usuarioId, validacion.data);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.status(201).json(resultado);
}

/** PUT /api/dinamicas/:id (solo mientras está en 'borrador') */
export async function putEditarBorrador(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = editarBorradorDinamicaSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await editarBorrador(usuarioId, req.params.id as string, validacion.data);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** POST /api/dinamicas/:id/publicar — body: { confirmaciones } */
export async function postPublicarDinamica(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = publicarDinamicaSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await publicarDinamica(usuarioId, req.params.id as string, validacion.data.confirmaciones);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** POST /api/dinamicas/:id/posponer */
export async function postPosponerDinamica(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = posponerDinamicaSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await posponerDinamica(
        usuarioId,
        req.params.id as string,
        validacion.data.nuevaFechaLimiteInscripcion,
    );
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }

    // Best-effort: no bloquea la respuesta si falla el envío de la notificación.
    notificarDinamicaPospuesta(
        usuarioId,
        resultado.data.id,
        resultado.data.titulo,
        validacion.data.nuevaFechaLimiteInscripcion,
    );

    return res.json(resultado);
}

/** POST /api/dinamicas/:id/cancelar */
export async function postCancelarDinamica(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const resultado = await cancelarDinamica(usuarioId, req.params.id as string);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** GET /api/dinamicas/mias */
export async function getMisDinamicas(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const resultado = await listarMisDinamicas(usuarioId);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** POST /api/dinamicas/upload-imagen — body: { nombreArchivo, contentType } */
export async function postUploadImagen(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = uploadImagenDinamicaSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const { nombreArchivo, contentType } = validacion.data;
    const resultado = await generarUrlUploadImagenDinamica(nombreArchivo, contentType);
    return res.status(resultado.code).json(resultado);
}

/** DELETE /api/dinamicas/foto-huerfana — body: { url } */
export async function deleteFotoDinamicaHuerfana(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const { url } = req.body ?? {};
    if (typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ success: false, message: 'Falta la URL de la foto a eliminar.' });
    }

    await eliminarFotoDinamicaSiHuerfana(url);
    return res.status(200).json({ success: true });
}

// =============================================================================
// PÚBLICO (verificarTokenOpcional)
// =============================================================================

/** GET /api/dinamicas/:id */
export async function getDinamica(req: Request, res: Response) {
    const resultado = await obtenerDinamica(req.params.id as string);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}
