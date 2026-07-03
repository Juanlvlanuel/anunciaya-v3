/**
 * admin/categorias-marketplace.routes.ts
 * =======================================
 * CRUD de categorías de MarketPlace en el Panel Admin. Se monta bajo el gate
 * global de superadmin (routes/admin/index.ts), así que no necesita middleware
 * de auth adicional aquí.
 *
 * Ubicación: apps/api/src/routes/admin/categorias-marketplace.routes.ts
 */

import { Router } from 'express';
import {
    listarCategoriasMPController,
    crearCategoriaMPController,
    editarCategoriaMPController,
    cambiarActivaCategoriaMPController,
    reordenarCategoriasMPController,
} from '../../controllers/admin/categorias-marketplace.controller.js';

const router: Router = Router();

// Lectura
router.get('/', listarCategoriasMPController);

// Rutas específicas ANTES de las paramétricas (para que '/reordenar' no lo
// capture '/:id').
router.post('/reordenar', reordenarCategoriasMPController);
router.post('/', crearCategoriaMPController);

// Paramétricas
router.patch('/:id/activa', cambiarActivaCategoriaMPController);
router.patch('/:id', editarCategoriaMPController);

export default router;
