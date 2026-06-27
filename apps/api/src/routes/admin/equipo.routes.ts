/**
 * routes/admin/equipo.routes.ts
 * =============================
 * Rutas de la sección "Equipo y accesos" del Panel Admin: lectura (lista + ficha) y acciones
 * (alta de vendedor, editar datos/región, cambiar ciudades, revocar y reactivar acceso). Cambiar
 * las ciudades de un vendedor dentro de su región vive aquí; la multi-región (mover a otra región,
 * Pieza F) sigue en "Vendedores y comisiones" (módulo 6).
 *
 * PERMISO (ver Equipo_y_accesos_Pendientes.md):
 *   - Lectura → superadmin (todo el equipo) + gerente (solo sus vendedores, alcance en el service).
 *   - El vendedor NO entra a este módulo (no se monta para él).
 *
 * Como la sección la usa también el gerente, este router se monta ANTES del gate global de
 * superadmin en `routes/admin/index.ts` (igual que /negocios, /usuarios, /yo y /2fa).
 *
 *   GET /        → superadmin + gerente (lista paginada + conteos)
 *   GET /conteo  → superadmin + gerente (total para el badge del menú)
 *   GET /:id     → superadmin + gerente (ficha del miembro)
 *
 * Ubicación: apps/api/src/routes/admin/equipo.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarEquipoController,
    contarEquipoController,
    obtenerMiembroController,
    listarCiudadesController,
    buscarCuentaController,
    sugerirCodigoController,
    altaVendedorController,
    altaGerenteController,
    revocarAccesoController,
    reactivarAccesoController,
    editarDatosController,
    reasignarRegionController,
    editarCiudadesController,
} from '../../controllers/admin/equipo.controller.js';

const router: Router = Router();

// ─── Lectura — superadmin + gerente ──────────────────────────────────────────
router.get('/', requierePanel(['superadmin', 'gerente']), listarEquipoController);
// Rutas estáticas ANTES de /:id para que no caigan en el comodín del id.
router.get('/conteo', requierePanel(['superadmin', 'gerente']), contarEquipoController);
router.get('/ciudades', requierePanel(['superadmin', 'gerente']), listarCiudadesController);
router.get('/buscar-cuenta', requierePanel(['superadmin', 'gerente']), buscarCuentaController);
router.get('/sugerir-codigo', requierePanel(['superadmin', 'gerente']), sugerirCodigoController);

// ─── Acciones (Fase 2) — superadmin + gerente (alcance por rol en el service) ─────
router.post('/vendedores', requierePanel(['superadmin', 'gerente']), altaVendedorController);
router.post('/gerentes', requierePanel(['superadmin']), altaGerenteController); // crear gerente: solo super
router.post('/:id/revocar', requierePanel(['superadmin', 'gerente']), revocarAccesoController);
router.post('/:id/reactivar', requierePanel(['superadmin', 'gerente']), reactivarAccesoController);
router.patch('/:id/datos', requierePanel(['superadmin', 'gerente']), editarDatosController); // editar datos (alcance en service)
router.patch('/:id/region', requierePanel(['superadmin']), reasignarRegionController); // reasignar región: solo super
router.patch('/:id/ciudades', requierePanel(['superadmin', 'gerente']), editarCiudadesController); // cambiar cobertura del vendedor (su región)

router.get('/:id', requierePanel(['superadmin', 'gerente']), obtenerMiembroController);

export default router;
