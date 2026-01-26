/**
 * stripe.ts
 * =========
 * Inicializa y exporta el cliente de Stripe SDK.
 * 
 * ¿Qué hace este archivo?
 * - Crea una instancia única (singleton) del cliente de Stripe
 * - Usa la SECRET KEY del archivo .env
 * - Configura la versión de la API de Stripe
 * 
 * ¿Por qué es importante?
 * - Solo debe existir UNA instancia del cliente Stripe en toda la app
 * - Reutilizamos esta instancia en services y controllers
 * - Evita múltiples conexiones innecesarias
 * 
 * Ubicación: apps/api/src/config/stripe.ts
 */

import Stripe from 'stripe';
import { env } from './env.js';

// =============================================================================
// CLIENTE DE STRIPE
// =============================================================================

/**
 * Instancia única del cliente de Stripe.
 * 
 * Configuración:
 * - apiVersion: Versión de la API de Stripe (importante para consistencia)
 * - typescript: true (habilita tipos TypeScript en las respuestas)
 */
export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover', // Versión compatible con Stripe SDK instalado
  typescript: true,
});

// =============================================================================
// EXPORT
// =============================================================================

/**
 * Cómo usar este archivo en otros lugares:
 * 
 * import { stripe } from '@/config/stripe';
 * 
 * const session = await stripe.checkout.sessions.create({ ... });
 */