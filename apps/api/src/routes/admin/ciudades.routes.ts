/**
 * routes/admin/ciudades.routes.ts
 * ===============================
 * Módulo Ciudades del Panel Admin (catálogo de ciudades + regiones).
 * Solo superadmin: se monta DESPUÉS del gate global de superadmin en
 * routes/admin/index.ts (gerente/vendedor no acceden a este módulo).
 *
 *   Lectura:
 *     GET   /api/admin/ciudades              — catálogo de ciudades (con filtros).
 *     GET   /api/admin/ciudades/regiones     — regiones con su # de ciudades.
 *   Acciones (Fase 2):
 *     POST  /api/admin/ciudades              — alta de una ciudad.
 *     POST  /api/admin/ciudades/multiple     — alta de varias ciudades (mapa).
 *     POST  /api/admin/ciudades/asignar-region — agrupar varias ciudades en una región.
 *     POST  /api/admin/ciudades/regiones     — crear región.
 *     PATCH /api/admin/ciudades/regiones/:id — editar región (renombrar/activar/desactivar).
 *     PATCH /api/admin/ciudades/:id          — editar ciudad.
 *     PATCH /api/admin/ciudades/:id/activa   — activar/desactivar ciudad.
 *     PATCH /api/admin/ciudades/:id/region   — asignar/quitar región de una ciudad.
 *
 * Las rutas específicas (regiones, multiple, asignar-region) se declaran ANTES que las
 * paramétricas (/:id) para que no se interpreten como un id.
 *
 * Ubicación: apps/api/src/routes/admin/ciudades.routes.ts
 */

import { Router } from 'express';
import {
    listarCiudadesCatalogoController,
    listarRegionesCatalogoController,
    crearCiudadController,
    crearCiudadesMultipleController,
    editarCiudadController,
    cambiarActivaCiudadController,
    asignarRegionCiudadController,
    asignarRegionMultipleController,
    crearRegionController,
    editarRegionController,
} from '../../controllers/admin/ciudades.controller.js';

const router: Router = Router();

// ── Lectura ──────────────────────────────────────────────────────────────────
router.get('/', listarCiudadesCatalogoController);
router.get('/regiones', listarRegionesCatalogoController);

// ── Acciones · rutas específicas (antes de las paramétricas) ─────────────────
router.post('/multiple', crearCiudadesMultipleController);
router.post('/asignar-region', asignarRegionMultipleController);
router.post('/regiones', crearRegionController);
router.patch('/regiones/:id', editarRegionController);
router.post('/', crearCiudadController);

// ── Acciones · sobre una ciudad ──────────────────────────────────────────────
router.patch('/:id/activa', cambiarActivaCiudadController);
router.patch('/:id/region', asignarRegionCiudadController);
router.patch('/:id', editarCiudadController);

export default router;
