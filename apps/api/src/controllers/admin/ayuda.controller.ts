/**
 * ayuda.controller.ts (admin)
 * ===========================
 * Controladores del módulo "Ayuda y Tutoriales" del Panel (solo superadmin).
 * El gate `requierePanel(['superadmin'])` se aplica globalmente en routes/admin/index.ts.
 *
 * Ubicación: apps/api/src/controllers/admin/ayuda.controller.ts
 */

import type { Request, Response } from 'express';
import {
    listarAyudaAdmin,
    crearCategoria,
    editarCategoria,
    borrarCategoria,
    crearArticulo,
    editarArticulo,
    borrarArticulo,
    type CategoriaAdminInput,
    type ArticuloAdminInput,
} from '../../services/admin/ayuda.service.js';
import { generarPresignedUrl } from '../../services/r2.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const APPS = ['anunciaya', 'scanya'];
const AUDIENCIAS = ['cliente', 'comerciante'];

function fallo(res: Response, code: number, message: string): void {
    res.status(code).json({ success: false, message });
}

// =============================================================================
// LECTURA
// =============================================================================

export async function listarAyudaController(_req: Request, res: Response): Promise<void> {
    try {
        const data = await listarAyudaAdmin();
        res.status(200).json({ success: true, message: 'Centro de ayuda obtenido', data });
    } catch (error) {
        console.error('Error en listarAyudaController:', error);
        fallo(res, 500, 'Error al obtener el centro de ayuda');
    }
}

// =============================================================================
// CATEGORÍAS
// =============================================================================

export async function crearCategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const b = req.body as Partial<CategoriaAdminInput>;
        if (!b.nombre || !b.nombre.trim()) return fallo(res, 400, 'El nombre es obligatorio');
        if (!b.app || !APPS.includes(b.app)) return fallo(res, 400, "El campo 'app' es inválido");
        if (!b.audiencia || !AUDIENCIAS.includes(b.audiencia)) return fallo(res, 400, "El campo 'audiencia' es inválido");

        const fila = await crearCategoria({
            nombre: b.nombre.trim(),
            icono: b.icono ?? null,
            app: b.app,
            audiencia: b.audiencia,
            orden: b.orden,
            activo: b.activo,
        });
        res.status(201).json({ success: true, message: 'Categoría creada', data: fila });
    } catch (error) {
        console.error('Error en crearCategoriaController:', error);
        fallo(res, 500, 'Error al crear la categoría');
    }
}

export async function editarCategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) return fallo(res, 400, 'ID inválido');
        const b = req.body as Partial<CategoriaAdminInput>;
        if (b.app !== undefined && !APPS.includes(b.app)) return fallo(res, 400, "El campo 'app' es inválido");
        if (b.audiencia !== undefined && !AUDIENCIAS.includes(b.audiencia)) return fallo(res, 400, "El campo 'audiencia' es inválido");

        await editarCategoria(id, b);
        res.status(200).json({ success: true, message: 'Categoría actualizada' });
    } catch (error) {
        console.error('Error en editarCategoriaController:', error);
        fallo(res, 500, 'Error al actualizar la categoría');
    }
}

export async function borrarCategoriaController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) return fallo(res, 400, 'ID inválido');
        await borrarCategoria(id);
        res.status(200).json({ success: true, message: 'Categoría eliminada' });
    } catch (error) {
        console.error('Error en borrarCategoriaController:', error);
        fallo(res, 500, 'Error al eliminar la categoría');
    }
}

// =============================================================================
// ARTÍCULOS
// =============================================================================

export async function crearArticuloController(req: Request, res: Response): Promise<void> {
    try {
        const b = req.body as Partial<ArticuloAdminInput>;
        if (!b.categoriaId || !UUID_REGEX.test(b.categoriaId)) return fallo(res, 400, 'Categoría inválida');
        if (!b.slug || !b.slug.trim()) return fallo(res, 400, 'El slug es obligatorio');
        if (!b.pregunta || !b.pregunta.trim()) return fallo(res, 400, 'La pregunta es obligatoria');

        const fila = await crearArticulo({
            categoriaId: b.categoriaId,
            slug: b.slug.trim(),
            pregunta: b.pregunta.trim(),
            respuesta: b.respuesta ?? null,
            videoUrl: b.videoUrl ?? null,
            posterUrl: b.posterUrl ?? null,
            duracionSeg: b.duracionSeg ?? null,
            videoVertical: b.videoVertical ?? null,
            orden: b.orden,
            publicado: b.publicado,
            compartiblePublico: b.compartiblePublico,
        });
        res.status(201).json({ success: true, message: 'Tutorial creado', data: fila });
    } catch (error) {
        if (error instanceof Error && error.message === 'SLUG_EXISTE') {
            return fallo(res, 409, 'Ya existe un tutorial con ese slug');
        }
        console.error('Error en crearArticuloController:', error);
        fallo(res, 500, 'Error al crear el tutorial');
    }
}

export async function editarArticuloController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) return fallo(res, 400, 'ID inválido');
        const b = req.body as Partial<ArticuloAdminInput>;
        if (b.categoriaId !== undefined && !UUID_REGEX.test(b.categoriaId)) return fallo(res, 400, 'Categoría inválida');

        await editarArticulo(id, b);
        res.status(200).json({ success: true, message: 'Tutorial actualizado' });
    } catch (error) {
        if (error instanceof Error && error.message === 'SLUG_EXISTE') {
            return fallo(res, 409, 'Ya existe un tutorial con ese slug');
        }
        console.error('Error en editarArticuloController:', error);
        fallo(res, 500, 'Error al actualizar el tutorial');
    }
}

export async function borrarArticuloController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        if (!UUID_REGEX.test(id)) return fallo(res, 400, 'ID inválido');
        await borrarArticulo(id);
        res.status(200).json({ success: true, message: 'Tutorial eliminado' });
    } catch (error) {
        console.error('Error en borrarArticuloController:', error);
        fallo(res, 500, 'Error al eliminar el tutorial');
    }
}

// =============================================================================
// SUBIDA A R2 (presigned URL) — video o poster
// =============================================================================

const TIPOS_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const TIPOS_POSTER = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadArchivoAyudaController(req: Request, res: Response): Promise<void> {
    try {
        const { nombreArchivo, contentType, tipo } = req.body as {
            nombreArchivo?: string;
            contentType?: string;
            tipo?: 'video' | 'poster';
        };
        if (!nombreArchivo || !contentType || (tipo !== 'video' && tipo !== 'poster')) {
            return fallo(res, 400, "Se requiere nombreArchivo, contentType y tipo ('video' | 'poster')");
        }

        const tiposPermitidos = tipo === 'video' ? TIPOS_VIDEO : TIPOS_POSTER;
        // Videos pueden pesar; damos 15 min de validez a la URL de subida.
        const expiraEn = tipo === 'video' ? 900 : 300;

        const resultado = await generarPresignedUrl('ayuda_articulos', nombreArchivo, contentType, expiraEn, tiposPermitidos);
        res.status(resultado.success ? 200 : (resultado.code ?? 500)).json(resultado);
    } catch (error) {
        console.error('Error en uploadArchivoAyudaController:', error);
        fallo(res, 500, 'Error al preparar la subida');
    }
}
