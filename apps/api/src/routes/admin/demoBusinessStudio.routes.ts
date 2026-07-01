/**
 * routes/admin/demoBusinessStudio.routes.ts
 * =========================================
 * Demo de Business Studio para vendedores. Lo usan los 3 roles (cada quien su propia copia):
 * el vendedor para vender, gerente/superadmin para probar/curar. Se monta ANTES del gate global
 * de superadmin en routes/admin/index.ts.
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    estadoDemoController,
    abrirDemoController,
    reiniciarDemoController,
} from '../../controllers/admin/demoBusinessStudio.controller.js';

const router: Router = Router();

router.get('/estado', requierePanel(['superadmin', 'gerente', 'vendedor']), estadoDemoController);
router.post('/abrir', requierePanel(['superadmin', 'gerente', 'vendedor']), abrirDemoController);
router.post('/reiniciar', requierePanel(['superadmin', 'gerente', 'vendedor']), reiniciarDemoController);

export default router;
