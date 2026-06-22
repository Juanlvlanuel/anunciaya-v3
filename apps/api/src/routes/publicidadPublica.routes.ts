/**
 * publicidadPublica.routes.ts
 * ===========================
 * GET /api/publicidad?ciudadId= (público, sin auth) — anuncios vigentes de una ciudad para
 * los carruseles de la columna derecha (solo desktop). Se monta en routes/index.ts.
 *
 * Ubicación: apps/api/src/routes/publicidadPublica.routes.ts
 */

import { Router } from 'express';
import {
    listarPublicidadPublicaController,
    uploadImagenPublicidadController,
    opcionesPublicidadController,
    precioPublicidadController,
    checkoutPublicidadController,
    clickPiezaController,
    descartarImagenesPublicidadController,
} from '../controllers/publicidadPublica.controller.js';
import { verificarToken } from '../middleware/auth.js';

const router: Router = Router();

router.get('/', listarPublicidadPublicaController);

// Opciones (precios base + reglas) y cálculo de precio — públicos (el wizard los lee). Antes de cualquier
// comodín; aquí no hay '/:id' (ese vive en el router admin).
router.get('/opciones', opcionesPublicidadController);
router.get('/precio', precioPublicidadController);

// Tracking del clic (el "ver grande") — público, best-effort.
router.post('/pieza/:piezaId/click', clickPiezaController);

// Subir creatividad a R2 (alta manual del Panel o wizard self-service): cualquier usuario logueado.
router.post('/upload-imagen', verificarToken, uploadImagenPublicidadController);

// Descartar creatividades subidas pero no guardadas (al cerrar el alta/wizard). Borra solo las huérfanas.
router.post('/imagenes-descartadas', verificarToken, descartarImagenesPublicidadController);

// Wizard self-service: crea el anuncio pendiente y abre Stripe Checkout. Cualquier usuario logueado.
router.post('/checkout', verificarToken, checkoutPublicidadController);

export default router;
