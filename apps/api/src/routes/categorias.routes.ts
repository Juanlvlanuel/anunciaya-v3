import { Router } from 'express';
import { obtenerCategorias, obtenerSubcategorias } from '../controllers/categorias.controller';
import { verificarToken } from '../middleware/auth';

const router: Router = Router();

// ============================================
// RUTAS PÚBLICAS DE CATEGORÍAS
// ============================================

/**
 * GET /api/categorias
 * Obtiene todas las categorías activas
 * Acceso: Público (requiere autenticación)
 */
router.get('/', verificarToken, obtenerCategorias);

/**
 * GET /api/categorias/:id/subcategorias
 * Obtiene subcategorías de una categoría específica
 * Acceso: Público (requiere autenticación)
 */
router.get('/:id/subcategorias', verificarToken, obtenerSubcategorias);

export default router;