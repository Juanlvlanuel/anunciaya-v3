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
import pagoService, { WebhookReintentable } from '../services/pago.service.js';
import membresiaService from '../services/membresia.service.js';

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
    const { esRegistroGoogle, googleIdToken, codigoReferido, intervalo } = req.body;
    const resultado = await pagoService.crearCheckoutSession({
      correo,
      nombreNegocio,
      datosRegistro,
      esRegistroGoogle,
      googleIdToken,
      codigoReferido,
      intervalo: intervalo === 'year' ? 'year' : 'month',
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
// CONTROLADOR 1.5: CREAR CHECKOUT UPGRADE (PERSONAL → COMERCIAL)
// =============================================================================

/**
 * POST /api/pagos/crear-checkout-upgrade
 * 
 * Crea una sesión de pago para upgrade de cuenta personal a comercial.
 * REQUIERE AUTENTICACIÓN (usuario ya logueado)
 * 
 * Body esperado:
 * {
 *   "nombreNegocio": "Mi Negocio"
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
export async function crearCheckoutUpgrade(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // -------------------------------------------------------------------------
    // PASO 1: Verificar autenticación
    // -------------------------------------------------------------------------
    const usuarioToken = req.usuario;

    if (!usuarioToken) {
      res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
      return;
    }

    // -------------------------------------------------------------------------
    // PASO 2: Validar datos del request
    // -------------------------------------------------------------------------
    const { nombreNegocio, intervalo, codigoReferido } = req.body;

    if (!nombreNegocio || nombreNegocio.trim().length < 3) {
      res.status(400).json({
        success: false,
        message: 'El nombre del negocio es requerido (mínimo 3 caracteres)',
      });
      return;
    }

    // -------------------------------------------------------------------------
    // PASO 3: Llamar al service (el service valida tieneModoComercial)
    // -------------------------------------------------------------------------
    const resultado = await pagoService.crearCheckoutUpgrade({
      usuarioId: usuarioToken.usuarioId,
      correo: usuarioToken.correo,
      nombreNegocio: nombreNegocio.trim(),
      intervalo: intervalo === 'year' ? 'year' : 'month',
      codigoReferido: typeof codigoReferido === 'string' && codigoReferido.trim() ? codigoReferido.trim() : undefined,
    });

    // -------------------------------------------------------------------------
    // PASO 4: Devolver respuesta exitosa
    // -------------------------------------------------------------------------
    res.status(200).json({
      success: true,
      data: resultado,
      message: 'Sesión de pago para upgrade creada correctamente',
    });
  } catch (error) {
    console.error('❌ Error en crearCheckoutUpgrade:', error);

    if (error instanceof Error) {
      if (error.message.includes('Ya tienes')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes('no encontrado')) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear sesión de pago para upgrade',
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
    // Carrera esperada (cobro día-1 antes del alta): no es fallo; 500 para que Stripe reintente.
    if (error instanceof WebhookReintentable) {
      console.log(`⏳ ${error.message}`);
      res.status(500).json({ error: 'Reintento solicitado' });
      return;
    }
    console.error('❌ Error en webhookStripe:', error);

    // Si la firma es inválida, devolver 400 (no 500 → Stripe NO reintenta un evento que nunca validará).
    // toLowerCase: el service lanza "Firma de webhook inválida" (F mayúscula); el include debe ser case-insensitive.
    if (error instanceof Error && error.message.toLowerCase().includes('firma')) {
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

/**
 * GET /api/pagos/validar-referido?codigo=XXX
 * Valida un código de vendedor EN VIVO (formulario de upgrade) y devuelve el nombre del vendedor si
 * existe y está activo. Case-sensitive exacto. Vacío/inválido → { valido:false }. Nunca lanza (200).
 */
export async function validarReferido(req: Request, res: Response): Promise<void> {
  try {
    const codigo = typeof req.query.codigo === 'string' ? req.query.codigo : '';
    const resultado = await pagoService.validarCodigoReferido(codigo);
    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    console.error('❌ Error en validarReferido:', error);
    res.status(200).json({ success: true, data: { valido: false, vendedor: null } });
  }
}

/**
 * GET /api/pagos/mi-negocio-archivado
 * Si el usuario (personal) ya tuvo un negocio (cancelado/archivado), devuelve su nombre para que el
 * formulario de upgrade ofrezca "Recuperar tu negocio" en vez de crear uno nuevo. Nunca lanza (200).
 */
export async function miNegocioArchivado(req: Request, res: Response): Promise<void> {
  try {
    const usuarioToken = req.usuario;
    if (!usuarioToken) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const data = await pagoService.obtenerNegocioArchivadoDelUsuario(usuarioToken.usuarioId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Error en miNegocioArchivado:', error);
    res.status(200).json({ success: true, data: { tiene: false, nombre: null, onboardingCompletado: false } });
  }
}

// =============================================================================
// CONTROLADOR 7: MI MEMBRESÍA (vista del dueño — Mi Perfil · Modo Personal)
// =============================================================================

/**
 * GET /api/pagos/mi-membresia
 * Devuelve el estado de la membresía del negocio del usuario logueado + historial de recibos.
 * Si no tiene negocio, devuelve { tieneNegocio: false }. REQUIERE AUTENTICACIÓN.
 */
export async function miMembresia(req: Request, res: Response): Promise<void> {
  try {
    const usuarioToken = req.usuario;
    if (!usuarioToken) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const data = await membresiaService.obtenerMiMembresia(usuarioToken.usuarioId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Error en miMembresia:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la membresía' });
  }
}

/**
 * GET /api/pagos/mi-recibo/:reciboId/descargar
 * Genera/regenera el PDF de un recibo propio y devuelve su URL en R2. Valida que el recibo
 * pertenezca al negocio del usuario logueado. REQUIERE AUTENTICACIÓN.
 */
export async function descargarMiRecibo(req: Request, res: Response): Promise<void> {
  try {
    const usuarioToken = req.usuario;
    if (!usuarioToken) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const reciboId = req.params.reciboId;
    if (!reciboId) {
      res.status(400).json({ success: false, message: 'reciboId es requerido' });
      return;
    }
    const resultado = await membresiaService.descargarMiRecibo(usuarioToken.usuarioId, reciboId);
    if (!resultado.ok) {
      res.status(resultado.status).json({ success: false, message: resultado.mensaje });
      return;
    }
    res.status(200).json({ success: true, data: { reciboUrl: resultado.reciboUrl } });
  } catch (error) {
    console.error('❌ Error en descargarMiRecibo:', error);
    res.status(500).json({ success: false, message: 'Error al descargar el recibo' });
  }
}

/**
 * POST /api/pagos/portal
 * Crea una sesión del Customer Portal de Stripe y devuelve su URL para redirigir al dueño.
 * Permite actualizar la tarjeta y pagar la factura pendiente. REQUIERE AUTENTICACIÓN.
 */
export async function crearPortal(req: Request, res: Response): Promise<void> {
  try {
    const usuarioToken = req.usuario;
    if (!usuarioToken) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const resultado = await membresiaService.crearSesionPortal(usuarioToken.usuarioId);
    if (!resultado.ok) {
      res.status(resultado.status).json({ success: false, message: resultado.mensaje });
      return;
    }
    res.status(200).json({ success: true, data: { url: resultado.url } });
  } catch (error) {
    console.error('❌ Error en crearPortal:', error);
    res.status(500).json({ success: false, message: 'Error al abrir el portal de pagos' });
  }
}

// =============================================================================
// CONTROLADOR 9: PAGO MANUAL (datos de cobro · comprobante · solicitud)
// =============================================================================

/**
 * GET /api/pagos/datos-cobro
 * Datos de la cuenta de AnunciaYA para depositar/transferir (los configura el Panel).
 * REQUIERE AUTENTICACIÓN.
 */
export async function datosCobro(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const data = await membresiaService.obtenerDatosCobroConPrecio();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('❌ Error en datosCobro:', error);
    res.status(500).json({ success: false, message: 'Error al obtener los datos de cobro' });
  }
}

/**
 * POST /api/pagos/comprobante/url-subida
 * Genera una presigned URL para que el dueño suba el comprobante a R2. REQUIERE AUTENTICACIÓN.
 * Body: { nombreArchivo, contentType }
 */
export async function urlSubidaComprobante(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const { nombreArchivo, contentType } = req.body ?? {};
    if (!nombreArchivo || !contentType) {
      res.status(400).json({ success: false, message: 'nombreArchivo y contentType son requeridos' });
      return;
    }
    const r = await membresiaService.generarUrlComprobante(nombreArchivo, contentType);
    if (!r.success || !r.data) {
      res.status(r.code ?? 502).json({ success: false, message: r.message });
      return;
    }
    res.status(200).json({ success: true, data: r.data });
  } catch (error) {
    console.error('❌ Error en urlSubidaComprobante:', error);
    res.status(500).json({ success: false, message: 'Error al preparar la subida del comprobante' });
  }
}

/**
 * POST /api/pagos/solicitud-pago-manual
 * Crea una solicitud de pago manual (cola de verificación). REQUIERE AUTENTICACIÓN.
 * Body: { monto, mesesDeclarados, referencia?, nota?, comprobanteUrl }
 */
export async function crearSolicitudPagoManual(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const { monto, mesesDeclarados, referencia, nota, comprobanteUrl } = req.body ?? {};
    const resultado = await membresiaService.crearSolicitudPagoManual(req.usuario.usuarioId, {
      monto,
      mesesDeclarados,
      referencia,
      nota,
      comprobanteUrl,
    });
    if (!resultado.ok) {
      res.status(resultado.status).json({ success: false, message: resultado.mensaje });
      return;
    }
    res.status(201).json({ success: true, data: { solicitudId: resultado.solicitudId } });
  } catch (error) {
    console.error('❌ Error en crearSolicitudPagoManual:', error);
    res.status(500).json({ success: false, message: 'Error al enviar la solicitud de pago' });
  }
}

// =============================================================================
// CONTROLADOR 10: CAMBIO DE MÉTODO DE COBRO (tarjeta ↔ manual)
// =============================================================================

/**
 * POST /api/pagos/cambiar-a-manual
 * Pasa el negocio de cobro con tarjeta a pago manual (cancela el cobro automático sin archivar,
 * respeta la vigencia). REQUIERE AUTENTICACIÓN.
 */
export async function cambiarAManual(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const r = await membresiaService.cambiarAPagoManual(req.usuario.usuarioId);
    if (!r.ok) {
      res.status(r.status).json({ success: false, message: r.mensaje });
      return;
    }
    res.status(200).json({
      success: true,
      message: r.advertencia ?? 'Cambiaste a pago por transferencia.',
      data: { advertencia: r.advertencia ?? null },
    });
  } catch (error) {
    console.error('❌ Error en cambiarAManual:', error);
    res.status(500).json({ success: false, message: 'Error al cambiar el método de cobro' });
  }
}

/**
 * POST /api/pagos/cambiar-a-tarjeta
 * Crea un Checkout de Stripe para activar el cobro con tarjeta en un negocio existente que paga
 * manual (respeta la vigencia). Devuelve la URL del checkout. REQUIERE AUTENTICACIÓN.
 */
export async function cambiarATarjeta(req: Request, res: Response): Promise<void> {
  try {
    if (!req.usuario) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }
    const resultado = await pagoService.crearCheckoutActivarTarjeta(req.usuario.usuarioId);
    res.status(200).json({ success: true, data: resultado });
  } catch (error) {
    console.error('❌ Error en cambiarATarjeta:', error);
    if (error instanceof Error && /Ya tienes|No tienes|cancelado|no encontrado/i.test(error.message)) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Error al activar el cobro con tarjeta' });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  crearCheckout,
  crearCheckoutUpgrade,
  validarReferido,
  miNegocioArchivado,
  webhookStripe,
  verificarSession,
  miMembresia,
  descargarMiRecibo,
  crearPortal,
  datosCobro,
  urlSubidaComprobante,
  crearSolicitudPagoManual,
  cambiarAManual,
  cambiarATarjeta,
};