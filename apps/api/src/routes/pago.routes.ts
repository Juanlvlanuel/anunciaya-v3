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
 * GET /api/pagos/validar-referido?codigo=XXX
 * Valida EN VIVO un código de vendedor para el formulario de upgrade (devuelve el nombre si es válido).
 * REQUIERE AUTENTICACIÓN (el usuario ya está logueado al hacer upgrade).
 */
router.get('/validar-referido', verificarToken, pagoController.validarReferido);

/**
 * GET /api/pagos/mi-negocio-archivado
 * Indica si el usuario logueado ya tuvo un negocio (cancelado/archivado) para ofrecer "Recuperar tu
 * negocio" en el upgrade. REQUIERE AUTENTICACIÓN.
 */
router.get('/mi-negocio-archivado', verificarToken, pagoController.miNegocioArchivado);

/**
 * GET /api/pagos/mi-membresia
 * Estado de la membresía del negocio del usuario logueado + historial de recibos
 * (Mi Perfil · Modo Personal · sección Membresía/Pagos). REQUIERE AUTENTICACIÓN.
 */
router.get('/mi-membresia', verificarToken, pagoController.miMembresia);

/**
 * GET /api/pagos/mi-recibo/:reciboId/descargar
 * Devuelve la URL del PDF de un recibo propio (validado contra el negocio del usuario).
 * REQUIERE AUTENTICACIÓN.
 */
router.get('/mi-recibo/:reciboId/descargar', verificarToken, pagoController.descargarMiRecibo);

/**
 * POST /api/pagos/portal
 * Crea una sesión del Customer Portal de Stripe (actualizar tarjeta + pagar factura pendiente)
 * y devuelve su URL. REQUIERE AUTENTICACIÓN.
 */
router.post('/portal', verificarToken, pagoController.crearPortal);

// ─── Pago manual (transferencia/depósito + comprobante → cola de verificación) ───

/** GET /api/pagos/datos-cobro — datos de la cuenta de AnunciaYA para depositar. */
router.get('/datos-cobro', verificarToken, pagoController.datosCobro);

/** POST /api/pagos/comprobante/url-subida — presigned URL para subir el comprobante a R2. */
router.post('/comprobante/url-subida', verificarToken, pagoController.urlSubidaComprobante);

/** POST /api/pagos/solicitud-pago-manual — crea la solicitud (cola de verificación). */
router.post('/solicitud-pago-manual', verificarToken, pagoController.crearSolicitudPagoManual);

// ─── Cambio de método de cobro (tarjeta ↔ manual) ───

/** POST /api/pagos/cambiar-a-manual — cancela el cobro automático y pasa a pago manual. */
router.post('/cambiar-a-manual', verificarToken, pagoController.cambiarAManual);

/** POST /api/pagos/cambiar-a-tarjeta — Checkout para activar el cobro con tarjeta (respeta vigencia). */
router.post('/cambiar-a-tarjeta', verificarToken, pagoController.cambiarATarjeta);

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