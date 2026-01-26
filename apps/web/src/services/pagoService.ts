/**
 * pagoService.ts
 * ==============
 * Funciones para llamar a los endpoints de pagos del backend.
 * 
 * ¿Qué hace este archivo?
 * - Proporciona funciones para interactuar con el backend de Stripe
 * - Maneja las llamadas HTTP a los endpoints de pagos
 * - Devuelve respuestas tipadas
 * 
 * Ubicación: apps/web/src/services/pagoService.ts
 */

import { api, RespuestaAPI } from './api';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Datos necesarios para crear una sesión de checkout
 */
export interface DatosCheckout {
  correo: string;
  nombreNegocio: string;
  datosRegistro: {
    nombre: string;
    apellidos: string;
    telefono: string;
  };
  // Campos opcionales para registro con Google
  esRegistroGoogle?: boolean;
  googleIdToken?: string;
}

/**
 * Respuesta al crear una sesión de checkout
 */
export interface RespuestaCheckout {
  sessionId: string;
  checkoutUrl: string;
}

/**
 * Datos del usuario después de verificar la sesión
 */
export interface DatosUsuarioVerificado {
  usuario: {
    id: string;
    nombre: string;
    apellidos: string;
    correo: string;
    perfil: 'comercial';
    membresia: number;
    correoVerificado: boolean;
    tieneModoComercial: boolean;        // ✅ camelCase
    modoActivo: 'personal' | 'comercial'; // ✅ camelCase
    negocioId: string | null;            // ✅ camelCase
    onboardingCompletado: boolean;       // ✅ AGREGAR
  };
  accessToken: string;
  refreshToken: string;
}

// =============================================================================
// FUNCIÓN 1: CREAR CHECKOUT SESSION
// =============================================================================

/**
 * Crea una sesión de pago en Stripe.
 * 
 * ¿Qué hace?
 * - Llama al backend para crear una sesión en Stripe
 * - Devuelve la URL de checkout para redirigir al usuario
 * 
 * ¿Cuándo se usa?
 * - Después de que el usuario verifica su email
 * - Antes de redirigir a Stripe para pagar
 * 
 * @param datos - Correo, nombre del negocio y datos de registro
 * @returns URL de checkout de Stripe
 * 
 * @example
 * const { checkoutUrl } = await crearCheckout({
 *   correo: 'usuario@ejemplo.com',
 *   nombreNegocio: 'Mi Negocio',
 *   datosRegistro: { nombre: 'Juan', apellidos: 'Pérez', telefono: '+525512345678' }
 * });
 * window.location.href = checkoutUrl; // Redirigir a Stripe
 */
export async function crearCheckout(
  datos: DatosCheckout
): Promise<RespuestaAPI<RespuestaCheckout>> {
  const response = await api.post<RespuestaAPI<RespuestaCheckout>>(
    '/pagos/crear-checkout',
    datos
  );
  return response.data;
}

// =============================================================================
// FUNCIÓN 2: VERIFICAR SESSION
// =============================================================================

/**
 * Verifica una sesión de Stripe después del pago.
 * 
 * ¿Qué hace?
 * - Valida que el pago fue exitoso
 * - Recupera los tokens JWT del usuario
 * - Devuelve los datos del usuario para hacer login
 * 
 * ¿Cuándo se usa?
 * - En la página /registro-exito
 * - Después de que Stripe redirige al usuario
 * 
 * @param sessionId - ID de la sesión de Stripe (viene en la URL)
 * @returns Datos del usuario y tokens para login
 * 
 * @example
 * const { usuario, accessToken, refreshToken } = await verificarSession('cs_test_xxx');
 * // Hacer login automático con los tokens
 */
export async function verificarSession(
  sessionId: string
): Promise<RespuestaAPI<DatosUsuarioVerificado>> {
  const response = await api.get<RespuestaAPI<DatosUsuarioVerificado>>(
    `/pagos/verificar-session?session_id=${sessionId}`
  );
  return response.data;
}

// =============================================================================
// EXPORT POR DEFECTO
// =============================================================================

const pagoService = {
  crearCheckout,
  verificarSession,
};

export default pagoService;