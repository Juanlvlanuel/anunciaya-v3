/**
 * pago.routes.ts
 * ==============
 * Define las rutas HTTP para los endpoints de pagos.
 * 
 * ¿Qué hace este archivo?
 * - Define 3 rutas:
 *   1. POST /crear-checkout - Crea sesión de pago
 *   2. POST /webhook - Recibe eventos de Stripe
 *   3. GET /verificar-session - Verifica pago completado
 * 
 * ¿Por qué el webhook tiene configuración especial?
 * - Stripe envía el body como RAW string (no JSON)
 * - Necesitamos express.raw() en lugar de express.json()
 * - La firma se calcula sobre el body RAW
 * 
 * Ubicación: apps/api/src/routes/pago.routes.ts
 */

import { Router } from 'express';
import express from 'express';
import pagoController from '../controllers/pago.controller.js';
import { verificarToken } from '../middleware/auth.js';

const router: Router = Router();

// =============================================================================
// RUTAS DE PAGOS
// =============================================================================

/**
 * POST /api/pagos/crear-checkout
 * 
 * Crea una sesión de Stripe Checkout.
 * 
 * Body:
 * {
 *   "correo": "usuario@ejemplo.com",
 *   "nombreNegocio": "Mi Negocio",
 *   "datosRegistro": {
 *     "nombre": "Juan",
 *     "apellidos": "Pérez",
 *     "telefono": "+525512345678"
 *   }
 * }
 */
router.post('/crear-checkout', pagoController.crearCheckout);

/**
 * POST /api/pagos/crear-checkout-upgrade
 * 
 * Crea una sesión de Stripe Checkout para upgrade de cuenta personal a comercial.
 * REQUIERE AUTENTICACIÓN.
 * 
 * Body:
 * {
 *   "nombreNegocio": "Mi Negocio"
 * }
 */
router.post('/crear-checkout-upgrade', verificarToken, pagoController.crearCheckoutUpgrade);

/**
 * POST /api/pagos/webhook
 * 
 * Webhook de Stripe para recibir eventos.
 * 
 * CRÍTICO: Este endpoint usa express.raw() para obtener el body sin parsear.
 * 
 * ¿Por qué?
 * - Stripe calcula la firma sobre el body RAW
 * - Si usamos express.json(), el body se modifica y la firma falla
 * - express.raw() guarda el body como Buffer
 * 
 * Headers requeridos:
 * - stripe-signature: Firma del webhook
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  pagoController.webhookStripe
);

/**
 * GET /api/pagos/verificar-session?session_id=cs_test_xxx
 * 
 * Verifica una sesión de pago completada.
 * 
 * Query params:
 * - session_id: ID de la sesión de Stripe
 * 
 * Devuelve:
 * - Datos del usuario
 * - Access token
 * - Refresh token
 */
router.get('/verificar-session', pagoController.verificarSession);

// =============================================================================
// EXPORT
// =============================================================================

export default router;