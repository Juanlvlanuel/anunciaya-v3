/**
 * routes/admin/territorios.routes.ts
 * ==================================
 * Rutas del módulo Territorios del Panel Admin (sección "Red de ventas").
 *
 * Los 3 roles entran, con alcance por rol resuelto en el service:
 *   - superadmin / gerente → ven el mapa de la ciudad con sus zonas (gerente: su región).
 *   - vendedor             → ve solo su(s) zona(s) asignada(s).
 * Se montan ANTES del gate global de superadmin en `routes/admin/index.ts`.
 *
 * Fase 1 (VER): solo lectura. Las acciones (crear/editar/asignar/borrar) llegan en Fase 2.
 *
 * Ubicación: apps/api/src/routes/admin/territorios.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarZonasController,
    listarCiudadesController,
    listarVendedoresController,
    crearZonaController,
    editarZonaController,
    asignarZonaController,
    borrarZonaController,
    listarMarcasController,
    crearMarcaController,
    editarMarcaController,
    borrarMarcaController,
} from '../../controllers/admin/territorios.controller.js';

const router: Router = Router();

// ─── VER (Fase 1) — los 3 roles; el service acota por rol ────────────────────────
router.get('/zonas', requierePanel(['superadmin', 'gerente', 'vendedor']), listarZonasController);

// Ciudades del alcance (super + gerente, para elegir dónde dibujar).
router.get('/ciudades', requierePanel(['superadmin', 'gerente']), listarCiudadesController);

// Vendedores asignables a una zona (super + gerente, para el selector al crear/asignar).
router.get('/vendedores', requierePanel(['superadmin', 'gerente']), listarVendedoresController);

// ─── ACTUAR (Fase 2) — super + gerente (el vendedor no dibuja ni asigna) ─────────
router.post('/zonas', requierePanel(['superadmin', 'gerente']), crearZonaController);
router.patch('/zonas/:id', requierePanel(['superadmin', 'gerente']), editarZonaController);
router.patch('/zonas/:id/vendedor', requierePanel(['superadmin', 'gerente']), asignarZonaController);
router.delete('/zonas/:id', requierePanel(['superadmin', 'gerente']), borrarZonaController);

// ─── MARCAS del vendedor (G.2) — solo el vendedor gestiona las suyas ─────────────
router.get('/marcas', requierePanel(['vendedor']), listarMarcasController);
router.post('/marcas', requierePanel(['vendedor']), crearMarcaController);
router.patch('/marcas/:id', requierePanel(['vendedor']), editarMarcaController);
router.delete('/marcas/:id', requierePanel(['vendedor']), borrarMarcaController);

export default router;
