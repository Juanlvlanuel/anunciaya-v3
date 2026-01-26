/**
 * pago.service.ts
 * ===============
 * Lógica de negocio para procesar pagos con Stripe.
 * 
 * ¿Qué hace este archivo?
 * - Crea sesiones de pago en Stripe (Checkout Sessions)
 * - Procesa webhooks de Stripe cuando un pago es exitoso
 * - Crea usuarios comerciales en PostgreSQL después del pago
 * - Valida sesiones de pago completadas
 * 
 * Flujo completo:
 * 1. Frontend llama a crearCheckoutSession()
 * 2. Backend crea sesión en Stripe y devuelve URL
 * 3. Usuario paga en Stripe
 * 4. Stripe envía webhook a procesarWebhook()
 * 5. Backend crea usuario + negocio en PostgreSQL
 * 6. Usuario es redirigido a página de éxito
 * 7. verificarSession() confirma el pago y devuelve tokens
 * 
 * Ubicación: apps/api/src/services/pago.service.ts
 */

import Stripe from 'stripe';
import { stripe } from '../config/stripe.js';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { usuarios, negocios, negocioSucursales } from '../db/schemas/schema.js';
import { redis } from '../db/redis.js'; // ← CORREGIDO
import { generarTokens, type PayloadToken } from '../utils/jwt.js';
import { guardarSesion } from '../utils/tokenStore.js'; // ← CORREGIDO
import { eq } from 'drizzle-orm';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Datos necesarios para crear una sesión de checkout
 */
interface DatosCheckout {
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
interface RespuestaCheckout {
    sessionId: string;
    checkoutUrl: string;
}

/**
 * Datos del usuario que se guardan en Redis después del webhook
 */
interface DatosUsuarioWebhook {
    usuario: {
        id: string;
        nombre: string;
        apellidos: string;
        correo: string;
        perfil: 'comercial';
        membresia: number;
        correoVerificado: boolean;
        tieneModoComercial: boolean;        // ✅ AGREGAR
        modoActivo: 'personal' | 'comercial'; // ✅ AGREGAR
        negocioId: string | null;            // ✅ AGREGAR
        onboardingCompletado: boolean;       // ✅ AGREGAR
    };
    accessToken: string;
    refreshToken: string;
}

// =============================================================================
// FUNCIÓN 1: CREAR CHECKOUT SESSION
// =============================================================================

/**
 * Crea una sesión de pago en Stripe Checkout.
 * 
 * ¿Qué hace?
 * 1. Valida que el correo esté verificado en Redis (código 6 dígitos ya validado)
 * 2. Crea una Checkout Session en Stripe con:
 *    - Precio del plan comercial ($449/mes)
 *    - Trial de 7 días gratis
 *    - Metadata con datos del usuario
 * 3. Devuelve la URL para redirigir al usuario
 * 
 * ¿Por qué metadata?
 * - Stripe devuelve la metadata en el webhook
 * - Así sabemos qué usuario crear cuando nos notifiquen del pago
 * 
 * @param datos - Correo, nombre del negocio y datos de registro
 * @returns sessionId y URL de checkout
 * @throws Error si el correo no está verificado
 */
export async function crearCheckoutSession(
    datos: DatosCheckout
): Promise<RespuestaCheckout> {
    const { correo, nombreNegocio, datosRegistro, esRegistroGoogle, googleIdToken } = datos;

    const datosRedisKey = `temp:registro:${correo}`;

    // -------------------------------------------------------------------------
    // PASO 1: Manejar registro con Google OAuth
    // -------------------------------------------------------------------------
    if (esRegistroGoogle && googleIdToken) {
        // Para Google OAuth, guardamos los datos en Redis directamente
        // (no hay verificación de email porque Google ya lo verificó)
        const datosParaRedis = {
            correo,
            nombre: datosRegistro.nombre,
            apellidos: datosRegistro.apellidos,
            telefono: datosRegistro.telefono,
            nombreNegocio,
            contrasenaHash: null, // Sin contraseña para usuarios Google
            esRegistroGoogle: true,
            googleIdToken,
            verificadoAt: new Date().toISOString(),
        };

        // Guardar en Redis con TTL de 1 hora
        await redis.setex(
            datosRedisKey,
            60 * 60, // 1 hora
            JSON.stringify(datosParaRedis)
        );

        console.log('📦 Datos de Google guardados en Redis para checkout:', correo);
    } else {
        // -------------------------------------------------------------------------
        // PASO 1b: Validar que el email está verificado (flujo normal)
        // -------------------------------------------------------------------------
        const datosTemporales = await redis.get(datosRedisKey);

        if (!datosTemporales) {
            throw new Error(
                'Sesión expirada. Por favor, vuelve a iniciar el registro.'
            );
        }
    }
    // -------------------------------------------------------------------------
    // PASO 2: Crear sesión en Stripe
    // -------------------------------------------------------------------------
    const session = await stripe.checkout.sessions.create({
        // Modo de pago: suscripción recurrente
        mode: 'subscription',

        // Plan comercial ($449/mes) con trial de 7 días
        line_items: [
            {
                price: env.STRIPE_PRICE_COMERCIAL,
                quantity: 1,
            },
        ],

        // Configuración de la suscripción
        subscription_data: {
            // Trial de 7 días gratis
            trial_period_days: 7,

            // Metadata que se guarda en la suscripción
            metadata: {
                correo,
                nombreNegocio,
                tipo: 'comercial',
            },
        },

        // Metadata de la sesión (se devuelve en el webhook)
        metadata: {
            correo,
            nombreNegocio,
            nombre: datosRegistro.nombre,
            apellidos: datosRegistro.apellidos,
            telefono: datosRegistro.telefono,
            tipo: 'registro_comercial',
        },

        // Email prellenado en el formulario de Stripe
        customer_email: correo,

        // URLs de retorno
        success_url: `${env.FRONTEND_URL}/registro-exito?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/registro?cancelado=true`,

        // Permitir códigos promocionales
        allow_promotion_codes: true,

        // Idioma
        locale: 'es',
    });

    // -------------------------------------------------------------------------
    // PASO 3: Guardar session_id en Redis (para verificación posterior)
    // -------------------------------------------------------------------------
    // TTL de 60 minutos (tiempo máximo que Stripe mantiene la sesión)
    await redis.setex(
        `stripe:session:${session.id}`,
        60 * 60, // 1 hora
        JSON.stringify({
            correo,
            nombreNegocio,
            datosRegistro,
            createdAt: new Date().toISOString(),
        })
    );

    // -------------------------------------------------------------------------
    // PASO 4: Devolver URL de checkout
    // -------------------------------------------------------------------------
    return {
        sessionId: session.id,
        checkoutUrl: session.url!,
    };
}

// =============================================================================
// FUNCIÓN 2: PROCESAR WEBHOOK DE STRIPE
// =============================================================================

/**
 * Procesa eventos del webhook de Stripe.
 * 
 * ¿Qué hace?
 * 1. Verifica la firma del webhook (seguridad)
 * 2. Escucha el evento "checkout.session.completed"
 * 3. Cuando un pago es exitoso:
 *    - Crea el usuario en PostgreSQL
 *    - Crea el negocio (con es_borrador: true)
 *    - Genera tokens JWT
 *    - Guarda tokens en Redis para que el usuario los recupere
 * 
 * ¿Por qué es importante verificar la firma?
 * - Cualquiera podría enviar POST al endpoint de webhook
 * - La firma garantiza que el request viene realmente de Stripe
 * 
 * @param body - Raw body del request (string)
 * @param signature - Header 'stripe-signature'
 * @returns void
 * @throws Error si la firma es inválida
 */
export async function procesarWebhook(
    body: string,
    signature: string
): Promise<void> {
    let event: Stripe.Event;

    // -------------------------------------------------------------------------
    // PASO 1: Verificar firma del webhook
    // -------------------------------------------------------------------------
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error('❌ Error verificando firma del webhook:', error);
        throw new Error('Firma de webhook inválida');
    }

    // -------------------------------------------------------------------------
    // PASO 2: Procesar evento según su tipo
    // -------------------------------------------------------------------------
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            await manejarCheckoutCompletado(session);
            break;
        }

        case 'customer.subscription.updated': {
            // Manejar renovaciones, cambios de plan, etc.
            console.log('🔄 Suscripción actualizada:', event.data.object.id);
            // TODO: Implementar lógica de actualización en el futuro
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            await procesarCancelacionSuscripcion(subscription);
            break;
        }

        default:
            console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }
}
// =============================================================================
// NUEVO TIPO (agregar después de DatosUsuarioWebhook, línea ~74)
// =============================================================================

/**
 * Datos del registro temporal guardados en Redis
 */
interface DatosRegistroRedis {
    correo: string;
    nombre: string;
    apellidos: string;
    telefono: string;
    nombreNegocio?: string;
    contrasenaHash: string | null;  // ← También actualizar esto
    verificadoAt: string;
    esRegistroGoogle?: boolean;     // ← AGREGAR
    googleIdToken?: string;         // ← AGREGAR
}

// =============================================================================
// FUNCIÓN AUXILIAR: MANEJAR CHECKOUT COMPLETADO
// =============================================================================

/**
 * Maneja el evento checkout.session.completed
 * 
 * Esta función:
 * 1. Extrae datos del metadata de la sesión
 * 2. RECUPERA DATOS COMPLETOS DE REDIS (incluyendo contrasenaHash)
 * 3. Crea el usuario en PostgreSQL CON contraseña
 * 4. Crea el negocio asociado
 * 5. Genera tokens JWT
 * 6. Guarda tokens en Redis (5 minutos) para que el usuario los recupere
 * 
 * @param session - Sesión de Stripe completada
 */
async function manejarCheckoutCompletado(
    session: Stripe.Checkout.Session
): Promise<void> {
    console.log('✅ Checkout completado:', session.id);

    // -------------------------------------------------------------------------
    // PASO 1: Extraer datos del metadata
    // -------------------------------------------------------------------------
    const metadata = session.metadata;
    if (!metadata || metadata.tipo !== 'registro_comercial') {
        console.error('⚠️ Metadata inválido en sesión:', session.id);
        return;
    }

    const { correo } = metadata;

    // -------------------------------------------------------------------------
    // PASO 2: RECUPERAR DATOS COMPLETOS DE REDIS (INCLUYENDO CONTRASEÑA)
    // -------------------------------------------------------------------------
    const datosRedisKey = `temp:registro:${correo}`;
    const datosRedisStr = await redis.get(datosRedisKey);

    if (!datosRedisStr) {
        console.error('❌ No se encontraron datos de registro en Redis para:', correo);
        return;
    }

    // Parsear datos de Redis
    const datosRegistro: DatosRegistroRedis = JSON.parse(datosRedisStr);

    console.log('📦 Datos recuperados de Redis para:', correo);

    // -------------------------------------------------------------------------
    // PASO 3: Verificar que el usuario no exista ya
    // -------------------------------------------------------------------------
    const usuarioExistente = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.correo, correo))
        .limit(1);

    if (usuarioExistente.length > 0) {
        console.log('⚠️ Usuario ya existe:', correo);
        // Limpiar Redis
        await redis.del(datosRedisKey);
        return;
    }

    // -------------------------------------------------------------------------
    // PASO 4: Crear usuario comercial en PostgreSQL (CON CONTRASEÑA)
    // -------------------------------------------------------------------------
    const [nuevoUsuario] = await db
        .insert(usuarios)
        .values({
            nombre: datosRegistro.nombre,
            apellidos: datosRegistro.apellidos,
            correo: datosRegistro.correo,
            contrasenaHash: datosRegistro.contrasenaHash || null, // null para usuarios Google
            telefono: datosRegistro.telefono,
            perfil: 'comercial',
            membresia: 1, // Membresía básica comercial
            correoVerificado: true, // Ya fue verificado antes del pago
            correoVerificadoAt: new Date().toISOString(),
            estado: 'activo',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            autenticadoPorGoogle: datosRegistro.esRegistroGoogle || false,
            tieneModoComercial: true,      // 🆕 Usuario pagó, tiene acceso
            modoActivo: 'comercial',
        })
        .returning();

    console.log('✅ Usuario creado:', nuevoUsuario.id);

    // -------------------------------------------------------------------------
    // PASO 5: Crear negocio asociado
    // -------------------------------------------------------------------------
    const nombreNegocio = datosRegistro.nombreNegocio || metadata.nombreNegocio || 'Mi Negocio';

    const [nuevoNegocio] = await db
        .insert(negocios)
        .values({
            usuarioId: nuevoUsuario.id,
            nombre: nombreNegocio,
            esBorrador: true,
            verificado: false,
            participaPuntos: false,
        })
        .returning();

    console.log('✅ Negocio creado:', nuevoNegocio.id);

    // -------------------------------------------------------------------------
    // PASO 5.1: 🆕 CREAR SUCURSAL PRINCIPAL AUTOMÁTICAMENTE
    // -------------------------------------------------------------------------
    const [sucursalPrincipal] = await db
        .insert(negocioSucursales)
        .values({
            negocioId: nuevoNegocio.id,
            nombre: nombreNegocio,  // Mismo nombre del negocio
            esPrincipal: true,
            ciudad: 'Por configurar',  // Se completa en onboarding paso 2
            activa: true,
        })
        .returning();

    console.log('✅ Sucursal principal creada:', sucursalPrincipal.id);

    // -------------------------------------------------------------------------
    // PASO 5.5: Asignar negocio_id al usuario ← AGREGAR ESTO
    // -------------------------------------------------------------------------
    await db
        .update(usuarios)
        .set({ negocioId: nuevoNegocio.id })
        .where(eq(usuarios.id, nuevoUsuario.id));

    console.log('✅ Usuario actualizado con negocio_id:', nuevoNegocio.id);

    // -------------------------------------------------------------------------
    // PASO 6: Generar tokens JWT
    // -------------------------------------------------------------------------
    const payload: PayloadToken = {
        usuarioId: nuevoUsuario.id,
        correo: nuevoUsuario.correo,
        perfil: nuevoUsuario.perfil,
        membresia: nuevoUsuario.membresia,
        modoActivo: nuevoUsuario.modoActivo || 'personal',
    };

    const { accessToken, refreshToken } = generarTokens(payload);

    // -------------------------------------------------------------------------
    // PASO 7: Guardar tokens en Redis (5 minutos)
    // -------------------------------------------------------------------------
    // El usuario los recuperará desde la página de éxito
    const datosUsuario: DatosUsuarioWebhook = {
        usuario: {
            id: nuevoUsuario.id,
            nombre: nuevoUsuario.nombre,
            apellidos: nuevoUsuario.apellidos,
            correo: nuevoUsuario.correo,
            perfil: nuevoUsuario.perfil as 'comercial',
            membresia: nuevoUsuario.membresia,
            correoVerificado: nuevoUsuario.correoVerificado ?? false,
            tieneModoComercial: nuevoUsuario.tieneModoComercial ?? true,
            modoActivo: 'comercial',
            negocioId: nuevoUsuario.negocioId ?? null,
            onboardingCompletado: false,
        },
        accessToken,
        refreshToken,
    };

    // Guardar en Redis con TTL de 5 minutos
    const keyRedis = `stripe:tokens:${session.id}`;
    await redis.setex(
        keyRedis,
        5 * 60, // 5 minutos
        JSON.stringify(datosUsuario)
    );

    // También guardar el refresh token en el store
    await guardarSesion(nuevoUsuario.id, refreshToken);

    console.log('✅ Tokens guardados en Redis para sesión:', session.id);

    // -------------------------------------------------------------------------
    // PASO 8: Limpiar datos temporales de Redis
    // -------------------------------------------------------------------------
    await redis.del(datosRedisKey); // temp:registro:correo
    await redis.del(`stripe:session:${session.id}`);
}

// =============================================================================
// FUNCIÓN AUXILIAR: PROCESAR CANCELACIÓN DE SUSCRIPCIÓN
// =============================================================================

/**
 * Procesa la cancelación de una suscripción comercial.
 * 
 * Este evento se dispara cuando:
 * - El usuario cancela su suscripción manualmente
 * - Stripe cancela automáticamente por falta de pago
 * - La suscripción expira sin renovarse
 * 
 * @param subscription - Objeto de suscripción de Stripe
 */
async function procesarCancelacionSuscripcion(
    subscription: Stripe.Subscription
): Promise<void> {
    try {
        console.log('🚫 Procesando cancelación de suscripción:', subscription.id);

        // Buscar usuario por subscription_id
        const [usuario] = await db
            .select()
            .from(usuarios)
            .where(eq(usuarios.stripeSubscriptionId, subscription.id))
            .limit(1);

        if (!usuario) {
            console.error('❌ Usuario no encontrado para subscription:', subscription.id);
            return;
        }

        console.log(`👤 Usuario encontrado: ${usuario.correo} (${usuario.id})`);

        // Desactivar modo comercial y forzar cambio a personal
        await db
            .update(usuarios)
            .set({
                tieneModoComercial: false,          // Desactivar acceso comercial
                modoActivo: 'personal',              // Forzar modo personal
                stripeSubscriptionId: null,          // Limpiar subscription_id
                updatedAt: new Date().toISOString(),
            })
            .where(eq(usuarios.id, usuario.id));

        console.log(`✅ Modo comercial desactivado para: ${usuario.correo}`);

        // Despublicar negocio (marcar como borrador)
        const [negocio] = await db
            .select()
            .from(negocios)
            .where(eq(negocios.usuarioId, usuario.id))
            .limit(1);

        if (negocio) {
            await db
                .update(negocios)
                .set({
                    esBorrador: true,                  // Despublicar del directorio
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(negocios.id, negocio.id));

            console.log(`📦 Negocio despublicado: ${negocio.nombre}`);
        }

        // Logging para auditoría
        console.log('✅ Cancelación procesada exitosamente:', {
            usuarioId: usuario.id,
            correo: usuario.correo,
            subscriptionId: subscription.id,
            fechaCancelacion: new Date().toISOString(),
        });

    } catch (error) {
        console.error('❌ Error procesando cancelación de suscripción:', error);
        throw error;
    }
}

// =============================================================================
// FUNCIÓN 3: VERIFICAR SESSION
// =============================================================================

/**
 * Verifica una sesión de Stripe y devuelve los tokens del usuario.
 * 
 * ¿Qué hace?
 * 1. Busca los tokens guardados en Redis (del webhook)
 * 2. Valida que la sesión exista en Stripe
 * 3. Devuelve los tokens y datos del usuario
 * 
 * ¿Por qué buscar en Redis primero?
 * - El webhook puede tardar unos segundos en procesarse
 * - Esperamos hasta 30 segundos con reintentos
 * - Si no encuentra tokens, significa que algo falló
 * 
 * @param sessionId - ID de la sesión de Stripe
 * @returns Datos del usuario y tokens JWT
 * @throws Error si la sesión no existe o expiró
 */
export async function verificarSession(
    sessionId: string
): Promise<DatosUsuarioWebhook> {
    const keyRedis = `stripe:tokens:${sessionId}`;

    // -------------------------------------------------------------------------
    // PASO 1: Intentar recuperar tokens de Redis (con reintentos)
    // -------------------------------------------------------------------------
    // El webhook puede tardar unos segundos, así que reintentamos
    let datosUsuario: string | null = null;
    let intentos = 0;
    const maxIntentos = 6; // 6 intentos x 5 segundos = 30 segundos máximo

    while (intentos < maxIntentos && !datosUsuario) {
        datosUsuario = await redis.get(keyRedis);

        if (!datosUsuario) {
            // Esperar 5 segundos antes de reintentar
            await new Promise((resolve) => setTimeout(resolve, 5000));
            intentos++;
            console.log(
                `⏳ Esperando tokens para sesión ${sessionId} (intento ${intentos}/${maxIntentos})...`
            );
        }
    }

    if (!datosUsuario) {
        throw new Error(
            'No se encontraron tokens. El pago puede no haberse procesado correctamente.'
        );
    }

    // -------------------------------------------------------------------------
    // PASO 2: Validar sesión en Stripe (seguridad adicional)
    // -------------------------------------------------------------------------
    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            throw new Error('El pago no ha sido completado');
        }
    } catch (error) {
        console.error('❌ Error validando sesión en Stripe:', error);
        throw new Error('Sesión de pago inválida');
    }

    // -------------------------------------------------------------------------
    // PASO 3: Devolver datos del usuario
    // -------------------------------------------------------------------------
    const datos = JSON.parse(datosUsuario) as DatosUsuarioWebhook;

    // Limpiar Redis después de devolver los tokens
    await redis.del(keyRedis);

    return datos;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    crearCheckoutSession,
    procesarWebhook,
    verificarSession,
};