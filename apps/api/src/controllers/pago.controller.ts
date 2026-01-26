/**
 * pago.controller.ts
 * ==================
 * Controladores para los endpoints de pagos.
 * 
 * ¿Qué hace este archivo?
 * - Recibe las peticiones HTTP
 * - Valida los datos del request
 * - Llama a las funciones del service
 * - Devuelve respuestas formateadas
 * 
 * ¿Por qué separar controllers de services?
 * - Controller: Maneja HTTP (request/response)
 * - Service: Maneja lógica de negocio
 * - Separación de responsabilidades = código más limpio
 * 
 * Ubicación: apps/api/src/controllers/pago.controller.ts
 */

import type { Request, Response } from 'express';
import pagoService from '../services/pago.service.js';

// =============================================================================
// CONTROLADOR 1: CREAR CHECKOUT SESSION
// =============================================================================

/**
 * POST /api/pagos/crear-checkout
 * 
 * Crea una sesión de pago en Stripe y devuelve la URL.
 * 
 * Body esperado:
 * {
 *   "correo": "usuario@ejemplo.com",
 *   "nombreNegocio": "Mi Negocio",
 *   "datosRegistro": {
 *     "nombre": "Juan",
 *     "apellidos": "Pérez",
 *     "telefono": "+525512345678"
 *   }
 * }
 * 
 * Respuesta exitosa:
 * {
 *   "success": true,
 *   "data": {
 *     "sessionId": "cs_test_xxx",
 *     "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxx"
 *   }
 * }
 */
export async function crearCheckout(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // -------------------------------------------------------------------------
    // PASO 1: Validar datos del request
    // -------------------------------------------------------------------------
    const { correo, nombreNegocio, datosRegistro } = req.body;

    if (!correo || !nombreNegocio || !datosRegistro) {
      res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos',
      });
      return;
    }

    if (!datosRegistro.nombre || !datosRegistro.apellidos || !datosRegistro.telefono) {
      res.status(400).json({
        success: false,
        message: 'Datos de registro incompletos',
      });
      return;
    }

    // -------------------------------------------------------------------------
    // PASO 2: Llamar al service
    // -------------------------------------------------------------------------
    const { esRegistroGoogle, googleIdToken } = req.body;
    const resultado = await pagoService.crearCheckoutSession({
      correo,
      nombreNegocio,
      datosRegistro,
      esRegistroGoogle,
      googleIdToken,
    });

    // -------------------------------------------------------------------------
    // PASO 3: Devolver respuesta exitosa
    // -------------------------------------------------------------------------
    res.status(200).json({
      success: true,
      data: resultado,
      message: 'Sesión de pago creada correctamente',
    });
  } catch (error) {
    console.error('❌ Error en crearCheckout:', error);

    // Manejo de errores específicos
    if (error instanceof Error) {
      if (error.message.includes('expirada')) {
        res.status(410).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    // Error genérico
    res.status(500).json({
      success: false,
      message: 'Error al crear sesión de pago',
    });
  }
}

// =============================================================================
// CONTROLADOR 2: WEBHOOK DE STRIPE
// =============================================================================

/**
 * POST /api/pagos/webhook
 * 
 * Recibe eventos de Stripe cuando ocurre algo importante:
 * - checkout.session.completed: Pago exitoso
 * - customer.subscription.updated: Renovación
 * - customer.subscription.deleted: Cancelación
 * 
 * IMPORTANTE: Este endpoint necesita RAW BODY (no JSON parseado)
 * 
 * Headers requeridos:
 * - stripe-signature: Firma del webhook
 * 
 * Respuesta:
 * {
 *   "received": true
 * }
 */
export async function webhookStripe(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // -------------------------------------------------------------------------
    // PASO 1: Obtener firma del header
    // -------------------------------------------------------------------------
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      res.status(400).json({
        error: 'No se encontró la firma del webhook',
      });
      return;
    }

    // -------------------------------------------------------------------------
    // PASO 2: Obtener raw body
    // -------------------------------------------------------------------------
    // CRÍTICO: El body debe ser el string RAW, no el objeto parseado
    // Esto se configura en las rutas con express.raw()
    const body = req.body;

    // -------------------------------------------------------------------------
    // PASO 3: Procesar webhook
    // -------------------------------------------------------------------------
    await pagoService.procesarWebhook(body, signature);

    // -------------------------------------------------------------------------
    // PASO 4: Responder rápido a Stripe
    // -------------------------------------------------------------------------
    // Stripe espera una respuesta 200 rápida
    // Todo el procesamiento ya se hizo de forma asíncrona
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Error en webhookStripe:', error);

    // Si la firma es inválida, devolver 400
    if (error instanceof Error && error.message.includes('firma')) {
      res.status(400).json({
        error: 'Firma de webhook inválida',
      });
      return;
    }

    // Otros errores devuelven 500 (Stripe reintentará)
    res.status(500).json({
      error: 'Error procesando webhook',
    });
  }
}

// =============================================================================
// CONTROLADOR 3: VERIFICAR SESSION
// =============================================================================

/**
 * GET /api/pagos/verificar-session?session_id=cs_test_xxx
 * 
 * Verifica una sesión de Stripe después del pago exitoso.
 * Devuelve los tokens JWT del usuario para hacer login automático.
 * 
 * Query params:
 * - session_id: ID de la sesión de Stripe
 * 
 * Respuesta exitosa:
 * {
 *   "success": true,
 *   "data": {
 *     "usuario": { ... },
 *     "accessToken": "...",
 *     "refreshToken": "..."
 *   }
 * }
 */
export async function verificarSession(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // -------------------------------------------------------------------------
    // PASO 1: Validar session_id
    // -------------------------------------------------------------------------
    const { session_id } = req.query;

    if (!session_id || typeof session_id !== 'string') {
      res.status(400).json({
        success: false,
        message: 'session_id es requerido',
      });
      return;
    }

    // -------------------------------------------------------------------------
    // PASO 2: Verificar sesión y obtener tokens
    // -------------------------------------------------------------------------
    const datos = await pagoService.verificarSession(session_id);

    // -------------------------------------------------------------------------
    // PASO 3: Devolver tokens y datos del usuario
    // -------------------------------------------------------------------------
    res.status(200).json({
      success: true,
      data: datos,
      message: 'Pago verificado correctamente',
    });
  } catch (error) {
    console.error('❌ Error en verificarSession:', error);

    // Manejo de errores específicos
    if (error instanceof Error) {
      if (error.message.includes('tokens')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes('inválida')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    // Error genérico
    res.status(500).json({
      success: false,
      message: 'Error al verificar sesión de pago',
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  crearCheckout,
  webhookStripe,
  verificarSession,
};