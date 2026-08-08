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
    obtenerDinamicaPublica,
    listarDinamicasPublicas,
    listarDinamicasDeOrganizador,
    listarMisDinamicas,
    listarBoletosPublico,
    reservarBoletoPublico,
    agregarParticipanteManual,
    editarParticipanteManual,
    reasignarBoleto,
    liberarBoleto,
    confirmarPagoBoletoOrganizador,
    notificarDinamicaPospuesta,
    notificarParticipantesDinamicaPospuesta,
    generarUrlUploadImagenDinamica,
    eliminarFotoDinamicaSiHuerfana,
} from '../services/dinamicas.service.js';
import { resolverCiudadId } from '../utils/ciudades.js';
import {
    crearDinamicaSchema,
    editarBorradorDinamicaSchema,
    publicarDinamicaSchema,
    posponerDinamicaSchema,
    uploadImagenDinamicaSchema,
    reservarBoletoSchema,
    agregarParticipanteManualSchema,
    editarParticipanteManualSchema,
    reasignarBoletoSchema,
    formatearErroresZod,
} from '../validations/dinamicas.schema.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    notificarParticipantesDinamicaPospuesta(
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

/** POST /api/dinamicas/:id/boletos/manual — solo el organizador (body: numeroBoleto, nombreManual, telefonoManual) */
export async function postAgregarParticipanteManual(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = agregarParticipanteManualSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await agregarParticipanteManual(usuarioId, req.params.id as string, validacion.data);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.status(201).json(resultado);
}

/** POST /api/dinamicas/:id/boletos/:boletoId/confirmar-pago — solo el organizador */
export async function postConfirmarPagoBoleto(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const resultado = await confirmarPagoBoletoOrganizador(
        usuarioId,
        req.params.id as string,
        req.params.boletoId as string,
    );
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** PUT /api/dinamicas/:id/boletos/:boletoId — solo el organizador, solo boletos manuales (body: nombreManual, telefonoManual) */
export async function putEditarParticipanteManual(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = editarParticipanteManualSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await editarParticipanteManual(
        usuarioId,
        req.params.id as string,
        req.params.boletoId as string,
        validacion.data,
    );
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** POST /api/dinamicas/:id/boletos/:boletoId/reasignar — solo el organizador,
 *  boletos CON cuenta AnunciaYA (body: numeroBoleto) */
export async function postReasignarBoleto(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = reasignarBoletoSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await reasignarBoleto(
        usuarioId,
        req.params.id as string,
        req.params.boletoId as string,
        validacion.data.numeroBoleto,
    );
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** POST /api/dinamicas/:id/boletos/:boletoId/liberar — solo el organizador */
export async function postLiberarBoleto(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const resultado = await liberarBoleto(usuarioId, req.params.id as string, req.params.boletoId as string);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** POST /api/dinamicas/:id/boletos/reservar — requiere sesión (body: numeroBoleto) */
export async function postReservarBoleto(req: Request, res: Response) {
    const usuarioId = exigirUsuarioId(req, res);
    if (!usuarioId) return;

    const validacion = reservarBoletoSchema.safeParse(req.body);
    if (!validacion.success) {
        return res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errores: formatearErroresZod(validacion.error),
        });
    }

    const resultado = await reservarBoletoPublico(usuarioId, req.params.id as string, validacion.data.numeroBoleto);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.status(201).json(resultado);
}

// =============================================================================
// PÚBLICO (verificarTokenOpcional)
// =============================================================================

/** GET /api/dinamicas — feed público filtrado por ciudad (query: ciudad, pagina, limite) */
export async function getFeedDinamicas(req: Request, res: Response) {
    const ciudad = typeof req.query.ciudad === 'string' ? req.query.ciudad : '';
    if (!ciudad.trim()) {
        return res.status(400).json({ success: false, message: 'Falta el parámetro ciudad' });
    }

    const ciudadId = await resolverCiudadId(ciudad);
    if (!ciudadId) {
        return res.json({ success: true, data: { dinamicas: [], pagina: 1, limite: 10, hayMas: false } });
    }

    const pagina = req.query.pagina ? Number(req.query.pagina) : undefined;
    const limite = req.query.limite ? Number(req.query.limite) : undefined;

    const resultado = await listarDinamicasPublicas({ ciudadId, pagina, limite }, req.usuario?.usuarioId);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** GET /api/dinamicas/organizador/:usuarioId — Dinámicas organizadas por un
 *  usuario específico + su insignia. Alimenta la sección "Dinámicas
 *  organizadas" del perfil público compartido de MarketPlace
 *  (`PaginaPerfilVendedor.tsx`) — es público, no requiere que sea "tu"
 *  usuario (a diferencia de GET /mias). */
export async function getDinamicasDeOrganizador(req: Request, res: Response) {
    const usuarioId = req.params.usuarioId as string;
    if (!UUID_REGEX.test(usuarioId)) {
        return res.status(400).json({ success: false, message: 'El ID del organizador no es válido' });
    }

    const pagina = req.query.pagina ? Number(req.query.pagina) : undefined;
    const limite = req.query.limite ? Number(req.query.limite) : undefined;
    // `incluirCanceladas` solo aplica cuando quien pide es el propio
    // organizador autenticado ("Mis Publicaciones") — a un tercero viendo
    // el perfil público no le mostramos Dinámicas canceladas de nadie.
    const incluirCanceladas =
        req.query.incluirCanceladas === '1' && req.usuario?.usuarioId === usuarioId;

    const resultado = await listarDinamicasDeOrganizador(usuarioId, { pagina, limite, incluirCanceladas });
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** GET /api/dinamicas/:id — ficha enriquecida (organizador, boletos, insignia) */
export async function getDinamica(req: Request, res: Response) {
    const resultado = await obtenerDinamicaPublica(req.params.id as string, req.usuario?.usuarioId);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}

/** GET /api/dinamicas/:id/boletos — lista pública de participantes (sin teléfono) */
export async function getBoletosDinamica(req: Request, res: Response) {
    const resultado = await listarBoletosPublico(req.params.id as string, req.usuario?.usuarioId);
    if (!resultado.success) {
        return res.status(resultado.code).json(resultado);
    }
    return res.json(resultado);
}
