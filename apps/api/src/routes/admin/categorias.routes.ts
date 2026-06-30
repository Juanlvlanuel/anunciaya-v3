/**
 * routes/admin/categorias.routes.ts
 * =================================
 * Módulo Categorías del Panel Admin (catálogo de negocios + disponibilidad por
 * ciudad). Solo superadmin: se monta DESPUÉS del gate global de superadmin en
 * routes/admin/index.ts.
 *
 *   Lectura:
 *     GET    /api/admin/categorias                              — catálogo completo.
 *   Categoría:
 *     POST   /api/admin/categorias                              — crear.
 *     POST   /api/admin/categorias/reordenar                    — reordenar.
 *     PATCH  /api/admin/categorias/:id                          — editar.
 *     PATCH  /api/admin/categorias/:id/activa                   — activar/desactivar.
 *     PATCH  /api/admin/categorias/:id/ciudades                 — disponibilidad por ciudad.
 *   Subcategoría:
 *     POST   /api/admin/categorias/subcategorias                — crear.
 *     POST   /api/admin/categorias/subcategorias/reordenar      — reordenar (de una categoría).
 *     PATCH  /api/admin/categorias/subcategorias/:id            — editar.
 *     PATCH  /api/admin/categorias/subcategorias/:id/activa     — activar/desactivar.
 *     PATCH  /api/admin/categorias/subcategorias/:id/ciudades   — disponibilidad por ciudad.
 *
 * Las rutas específicas (subcategorias, reordenar) van ANTES que las paramétricas
 * (/:id) para que no se interpreten como un id.
 *
 * Ubicación: apps/api/src/routes/admin/categorias.routes.ts
 */

import { Router } from 'express';
import {
    listarCatalogoController,
    crearCategoriaController,
    editarCategoriaController,
    cambiarActivaCategoriaController,
    asignarCiudadesCategoriaController,
    reordenarCategoriasController,
    crearSubcategoriaController,
    editarSubcategoriaController,
    cambiarActivaSubcategoriaController,
    asignarCiudadesSubcategoriaController,
    reordenarSubcategoriasController,
} from '../../controllers/admin/categorias.controller.js';

const router: Router = Router();

// ── Lectura ──────────────────────────────────────────────────────────────────
router.get('/', listarCatalogoController);

// ── Subcategorías · rutas específicas (antes de las paramétricas de categoría) ─
router.post('/subcategorias/reordenar', reordenarSubcategoriasController);
router.post('/subcategorias', crearSubcategoriaController);
router.patch('/subcategorias/:id/activa', cambiarActivaSubcategoriaController);
router.patch('/subcategorias/:id/ciudades', asignarCiudadesSubcategoriaController);
router.patch('/subcategorias/:id', editarSubcategoriaController);

// ── Categorías · rutas específicas ────────────────────────────────────────────
router.post('/reordenar', reordenarCategoriasController);
router.post('/', crearCategoriaController);

// ── Categorías · paramétricas ─────────────────────────────────────────────────
router.patch('/:id/activa', cambiarActivaCategoriaController);
router.patch('/:id/ciudades', asignarCiudadesCategoriaController);
router.patch('/:id', editarCategoriaController);

export default router;
