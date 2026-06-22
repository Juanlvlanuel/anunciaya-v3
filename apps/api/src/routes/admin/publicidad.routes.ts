/**
 * routes/admin/publicidad.routes.ts
 * =================================
 * Rutas de la sección Publicidad del Panel Admin (módulo 7) — lectura (Fase 1):
 * tabla, ficha y contador del menú.
 *
 * Solo **superadmin + gerente** (el vendedor NO entra a Publicidad). El gerente
 * queda acotado a su región en el service (anuncios con ≥1 ciudad en su región).
 * Por eso este router se monta ANTES del gate global de superadmin en
 * `routes/admin/index.ts`.
 *
 *   GET /         → superadmin + gerente (tabla, con alcance por rol)
 *   GET /conteo   → superadmin + gerente (contador del menú)
 *   GET /:id      → superadmin + gerente (ficha, con alcance por rol)
 *
 * Las acciones (alta manual, cortesía, pausar/editar/cancelar) y el wizard
 * self-service llegan en Fase 2.
 *
 * Ubicación: apps/api/src/routes/admin/publicidad.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarPublicidadController,
    obtenerDetallePublicidadController,
    contarPublicidadController,
    kpisPublicidadController,
    pausarAnuncioController,
    reactivarAnuncioController,
    cancelarAnuncioController,
    editarAnuncioController,
    crearAnuncioManualController,
} from '../../controllers/admin/publicidad.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente']), listarPublicidadController);

// Alta manual (efectivo/transferencia/cortesía): superadmin + gerente (cortesía solo super, en el service).
router.post('/', requierePanel(['superadmin', 'gerente']), crearAnuncioManualController);

// Total del alcance (contador del menú) + KPIs de cabecera. Antes de /:id para no caer en el comodín.
router.get('/conteo', requierePanel(['superadmin', 'gerente']), contarPublicidadController);
router.get('/kpis', requierePanel(['superadmin', 'gerente']), kpisPublicidadController);

router.get('/:id', requierePanel(['superadmin', 'gerente']), obtenerDetallePublicidadController);

// ─── Acciones (Fase 2) ───────────────────────────────────────────────────────────
// Pausar / reactivar / editar: superadmin + gerente (alcance por ciudades del anuncio en el service).
// Cancelar: SOLO superadmin (irreversible).
router.post('/:id/pausar', requierePanel(['superadmin', 'gerente']), pausarAnuncioController);
router.post('/:id/reactivar', requierePanel(['superadmin', 'gerente']), reactivarAnuncioController);
router.patch('/:id', requierePanel(['superadmin', 'gerente']), editarAnuncioController);
router.post('/:id/cancelar', requierePanel(['superadmin']), cancelarAnuncioController);

export default router;
