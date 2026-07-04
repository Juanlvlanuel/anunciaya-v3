/**
 * routes/admin/ayuda.routes.ts
 * ============================
 * Módulo "Ayuda y Tutoriales" del Panel (solo superadmin). El gate
 * `requierePanel(['superadmin'])` se aplica globalmente en routes/admin/index.ts,
 * así que estas rutas no lo repiten.
 */

import { Router } from 'express';
import {
    listarAyudaController,
    crearCategoriaController,
    editarCategoriaController,
    borrarCategoriaController,
    crearArticuloController,
    editarArticuloController,
    borrarArticuloController,
    uploadArchivoAyudaController,
} from '../../controllers/admin/ayuda.controller.js';

const router: Router = Router();

// Lectura: categorías + artículos con métricas.
router.get('/', listarAyudaController);

// Subida a R2 (presigned URL) de video o poster.
router.post('/upload', uploadArchivoAyudaController);

// Categorías.
router.post('/categorias', crearCategoriaController);
router.patch('/categorias/:id', editarCategoriaController);
router.delete('/categorias/:id', borrarCategoriaController);

// Artículos (tutoriales).
router.post('/articulos', crearArticuloController);
router.patch('/articulos/:id', editarArticuloController);
router.delete('/articulos/:id', borrarArticuloController);

export default router;
