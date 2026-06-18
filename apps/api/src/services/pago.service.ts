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
import { usuarios, negocios, negocioSucursales, embajadores, pagosMembresia } from '../db/schemas/schema.js';
import { redis } from '../db/redis.js'; // ← CORREGIDO
import { generarTokens, type PayloadToken } from '../utils/jwt.js';
import { guardarSesion } from '../utils/tokenStore.js'; // ← CORREGIDO
import { obtenerConfigNumero, obtenerConfigTexto } from './configuracion.service.js';
import { crearNegocioConDueno } from './negocioManagement.service.js';
import { registrarEventoPago } from './suscripciones/eventos-pago.js';
import { eq, and, sql } from 'drizzle-orm';

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
    // Código de referido del vendedor (link `?ref=`). Opcional.
    codigoReferido?: string;
    // Intervalo de cobro del plan comercial: 'month' (mensual) o 'year' (anual). Default 'month'.
    intervalo?: 'month' | 'year';
}

/**
 * Datos necesarios para upgrade de cuenta personal a comercial
 * (nombre y apellidos se obtienen de la BD)
 */
interface DatosCheckoutUpgrade {
    usuarioId: string;
    correo: string;
    nombreNegocio: string;
    // Intervalo de cobro del plan comercial: 'month' (mensual) o 'year' (anual). Default 'month'.
    intervalo?: 'month' | 'year';
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
        tieneModoComercial: boolean;
        modoActivo: 'personal' | 'comercial';
        negocioId: string | null;
        sucursalActiva?: string | null;
        nombreNegocio?: string | null;
        onboardingCompletado: boolean;
    };
    accessToken: string;
    refreshToken: string;
}

// =============================================================================
// HELPER: Price del plan comercial según intervalo (de config, con env como semilla)
// =============================================================================

/**
 * Price ID del plan comercial según el intervalo de cobro, leído de la configuración del sistema
 * (lo gestiona el botón "Cambiar precio" del Panel). El MENSUAL cae a la env `STRIPE_PRICE_COMERCIAL`
 * como semilla si aún no se sembró en config. El ANUAL solo existe si el Panel ya lo creó (no hay env
 * de respaldo): si falta, se rechaza el checkout anual con un error claro.
 */
async function obtenerPriceComercial(intervalo: 'month' | 'year'): Promise<string> {
    if (intervalo === 'year') {
        const idAnual = await obtenerConfigTexto('stripe_price_comercial_anual_id', '');
        if (!idAnual) throw new Error('El plan anual no está disponible por ahora.');
        return idAnual;
    }
    return obtenerConfigTexto('stripe_price_comercial_id', env.STRIPE_PRICE_COMERCIAL);
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
 *    - Precio del plan comercial (configurable, lo define el Price de Stripe activo)
 *    - Trial gratis (los días salen de la config 'trial_duracion_dias')
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
    const { correo, nombreNegocio, datosRegistro, esRegistroGoogle, googleIdToken, codigoReferido, intervalo = 'month' } = datos;

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
    const priceComercial = await obtenerPriceComercial(intervalo);
    const trialDias = await obtenerConfigNumero('trial_duracion_dias', 14);
    const session = await stripe.checkout.sessions.create({
        // Modo de pago: suscripción recurrente
        mode: 'subscription',

        // Plan comercial (Price de config según intervalo mensual/anual) con trial (días configurables: 'trial_duracion_dias')
        line_items: [
            {
                price: priceComercial,
                quantity: 1,
            },
        ],

        // Configuración de la suscripción
        subscription_data: {
            // Trial configurable; si es 0 se OMITE (Stripe exige ≥1) → cobra de inmediato al registrarse.
            ...(trialDias > 0 ? { trial_period_days: trialDias } : {}),

            // Metadata que se guarda en la suscripción
            metadata: {
                correo,
                nombreNegocio,
                tipo: 'comercial',
                intervalo,
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
            // Código del vendedor: viaja en la metadata para sobrevivir el paso
            // por Stripe y poder atribuir el negocio en el webhook. Solo se
            // incluye si vino; si no, no se atribuye.
            ...(codigoReferido && { codigoReferido }),
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
// FUNCIÓN 1.5: CREAR CHECKOUT SESSION PARA UPGRADE
// =============================================================================

/**
 * Crea una sesión de pago para upgrade de cuenta personal a comercial.
 * 
 * ¿Qué hace?
 * 1. Usuario YA está autenticado (tiene cuenta personal)
 * 2. Crea una Checkout Session en Stripe
 * 3. Guarda datos en Redis para el webhook
 * 4. Devuelve URL para redirigir al usuario
 * 
 * Diferencias con crearCheckoutSession:
 * - No requiere verificación de email (ya tiene cuenta)
 * - No crea usuario nuevo (actualiza el existente)
 * - Metadata tiene tipo: 'upgrade_comercial'
 * 
 * @param datos - usuarioId, correo, nombre, apellidos, nombreNegocio
 * @returns sessionId y URL de checkout
 */
export async function crearCheckoutUpgrade(
    datos: DatosCheckoutUpgrade
): Promise<RespuestaCheckout> {
    const { usuarioId, correo, nombreNegocio, intervalo = 'month' } = datos;

    // -------------------------------------------------------------------------
    // PASO 1: Verificar que el usuario existe y NO tiene modo comercial
    // -------------------------------------------------------------------------
    const [usuario] = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);

    if (!usuario) {
        throw new Error('Usuario no encontrado');
    }

    if (usuario.tieneModoComercial) {
        throw new Error('Ya tienes acceso al modo comercial');
    }

    // Obtener nombre y apellidos de la BD
    const nombre = usuario.nombre;
    const apellidos = usuario.apellidos;

    // -------------------------------------------------------------------------
    // PASO 2: Crear sesión en Stripe
    // -------------------------------------------------------------------------
    const priceComercial = await obtenerPriceComercial(intervalo);
    const trialDias = await obtenerConfigNumero('trial_duracion_dias', 14);
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',

        line_items: [
            {
                price: priceComercial,
                quantity: 1,
            },
        ],

        subscription_data: {
            // Trial configurable; si es 0 se OMITE (Stripe exige ≥1) → cobra de inmediato.
            ...(trialDias > 0 ? { trial_period_days: trialDias } : {}),
            metadata: {
                usuarioId,
                correo,
                nombreNegocio,
                tipo: 'upgrade_comercial',
            },
        },

        metadata: {
            usuarioId,
            correo,
            nombre,
            apellidos,
            nombreNegocio,
            tipo: 'upgrade_comercial',
        },

        customer_email: correo,

        success_url: `${env.FRONTEND_URL}/crear-negocio-exito?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.FRONTEND_URL}/crear-negocio?cancelado=true`,

        allow_promotion_codes: true,
        locale: 'es',
    });

    // -------------------------------------------------------------------------
    // PASO 3: Guardar datos en Redis para el webhook
    // -------------------------------------------------------------------------
    await redis.setex(
        `stripe:upgrade:${session.id}`,
        60 * 60, // 1 hora
        JSON.stringify({
            usuarioId,
            correo,
            nombre,
            apellidos,
            nombreNegocio,
            createdAt: new Date().toISOString(),
        })
    );

    console.log('📦 Datos de upgrade guardados en Redis:', correo);

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
    // PASO 1.5: Idempotencia — Stripe entrega "at least once". Si ya procesamos
    // este event.id, salir. Se MARCA al final (solo si el handler terminó sin lanzar),
    // para que un fallo que re-lanza deje que Stripe reintente y se reprocese.
    // Fail-open: si Redis está caído, se procesa igual (mejor un posible duplicado
    // que perder el evento).
    // -------------------------------------------------------------------------
    const claveEvento = `stripe:evt:${event.id}`;
    try {
        if (await redis.get(claveEvento)) {
            console.log(`↩️ Evento Stripe ya procesado, ignorado: ${event.id} (${event.type})`);
            return;
        }
    } catch (e) {
        console.error('⚠️ Redis no disponible para dedup de webhook (se procesa igual):', e);
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

        case 'invoice.payment_succeeded': {
            // Renovación cobrada (o primer cobro al terminar el trial) → al_corriente
            const invoice = event.data.object as Stripe.Invoice;
            await manejarRenovacionPagada(invoice, event.id);
            break;
        }

        case 'invoice.payment_failed': {
            // Falló el cobro de la renovación → entra en gracia
            const invoice = event.data.object as Stripe.Invoice;
            await manejarCobroFallido(invoice, event.id);
            break;
        }

        case 'customer.subscription.updated': {
            // Solo refresca las fechas del periodo. El ESTADO lo gobiernan los invoice.*
            const subscription = event.data.object as Stripe.Subscription;
            await manejarSuscripcionActualizada(subscription);
            break;
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            await procesarCancelacionSuscripcion(subscription, event.id);
            break;
        }

        case 'customer.subscription.trial_will_end': {
            // Stripe avisa ~3 días antes de que termine el trial.
            const subscription = event.data.object as Stripe.Subscription;
            await manejarTrialPorTerminar(subscription);
            break;
        }

        default:
            console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }

    // Marcar como procesado SOLO si llegamos aquí sin lanzar (TTL 3 días). Si un handler
    // lanzó, no se marca → Stripe reintenta y se reprocesa.
    try {
        await redis.set(claveEvento, '1', 'EX', 60 * 60 * 72);
    } catch { /* dedup best-effort: no es crítico */ }
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
// FUNCIÓN AUXILIAR: RESOLVER ATRIBUCIÓN AL VENDEDOR
// =============================================================================

/**
 * Resuelve un código de referido al embajador (vendedor) que lo trajo.
 *
 * Busca un embajador ACTIVO cuyo código coincida. Si el código viene vacío,
 * no existe, o el embajador no está activo, devuelve null — el registro
 * continúa SIN atribución. Regla crítica: un código mal escrito NUNCA puede
 * impedir una venta; ante cualquier duda, el negocio entra con embajador null.
 *
 * @param codigo - Código de referido capturado del link `?ref=`
 * @returns { embajadorId } o null si no se pudo atribuir
 */
async function resolverEmbajadorPorCodigo(
    codigo: string | undefined | null
): Promise<{ embajadorId: string } | null> {
    if (!codigo) return null;

    try {
        const [embajador] = await db
            .select({ id: embajadores.id })
            .from(embajadores)
            .where(and(
                eq(embajadores.codigoReferido, codigo),
                eq(embajadores.estado, 'activo')
            ))
            .limit(1);

        if (!embajador) {
            console.log('⚠️ Código de referido sin coincidencia activa:', codigo);
            return null;
        }

        // Solo el embajador (dinero/atribución). La región del negocio se deduce de su ciudad.
        return { embajadorId: embajador.id };
    } catch (error) {
        // Ante cualquier fallo al resolver, NO romper el registro: sin atribución.
        console.error('❌ Error resolviendo embajador por código:', error);
        return null;
    }
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
    if (!metadata || !metadata.tipo) {
        console.error('⚠️ Metadata inválido en sesión:', session.id);
        return;
    }

    // -------------------------------------------------------------------------
    // PASO 1.5: Si es upgrade, delegar a función específica
    // -------------------------------------------------------------------------
    if (metadata.tipo === 'upgrade_comercial') {
        await manejarUpgradeCompletado(session);
        return;
    }

    // Solo continuar si es registro comercial normal
    if (metadata.tipo !== 'registro_comercial') {
        console.error('⚠️ Tipo de checkout no reconocido:', metadata.tipo);
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
    // PASO 3.5: Resolver atribución al vendedor (si vino código de referido)
    // -------------------------------------------------------------------------
    // El código viaja en la metadata de la sesión de Stripe. Si no resuelve,
    // `atribucion` es null y tanto el usuario como el negocio quedan sin
    // vendedor (referidoPor / embajadorId en null; la región se deduce de la ciudad).
    const atribucion = await resolverEmbajadorPorCodigo(metadata.codigoReferido);
    if (atribucion) {
        console.log('🤝 Atribución al embajador:', atribucion.embajadorId);
    }

    // -------------------------------------------------------------------------
    // PASO 4-5: Crear usuario dueño + negocio + sucursal principal
    // -------------------------------------------------------------------------
    // Creación centralizada en crearNegocioConDueno (negocioManagement.service), compartida
    // con el alta manual del Panel. El webhook conserva sus escrituras SUELTAS pasando `db`
    // como ejecutor y omitiendo metodoCobro/ciudad → defaults 'tarjeta'/'Por configurar' (sin
    // cambio de comportamiento). El UPDATE de negocio_id al dueño ocurre dentro del helper.
    const nombreNegocio = datosRegistro.nombreNegocio || metadata.nombreNegocio || 'Mi Negocio';

    const { usuario: nuevoUsuario, negocio: nuevoNegocio } = await crearNegocioConDueno(db, {
        nombre: datosRegistro.nombre,
        apellidos: datosRegistro.apellidos,
        correo: datosRegistro.correo,
        telefono: datosRegistro.telefono,
        contrasenaHash: datosRegistro.contrasenaHash || null, // null para usuarios Google
        autenticadoPorGoogle: datosRegistro.esRegistroGoogle || false,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        embajadorId: atribucion?.embajadorId ?? null, // Vendedor que lo trajo
        nombreNegocio,
    });

    console.log('✅ Usuario + negocio + sucursal creados:', nuevoUsuario.id, nuevoNegocio.id);

    // Sella ya las fechas del periodo (próximo cobro = fin del trial) leyéndolas de Stripe, sin
    // esperar al asíncrono customer.subscription.updated → el "Próximo cobro" se ve desde el alta.
    await sellarFechasPeriodoDesdeStripe(nuevoNegocio.id, session.subscription as string);

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
// FUNCIÓN AUXILIAR: MANEJAR UPGRADE COMPLETADO
// =============================================================================

/**
 * Maneja el evento checkout.session.completed para upgrade de cuenta.
 * 
 * Diferencias con manejarCheckoutCompletado:
 * - NO crea usuario nuevo (actualiza el existente)
 * - Usuario ya tiene cuenta personal
 * - Solo activa tieneModoComercial y crea negocio
 * 
 * @param session - Sesión de Stripe completada
 */
async function manejarUpgradeCompletado(
    session: Stripe.Checkout.Session
): Promise<void> {
    console.log('✅ Upgrade completado:', session.id);

    const metadata = session.metadata;
    if (!metadata) return;

    const { usuarioId, correo, nombreNegocio } = metadata;

    // -------------------------------------------------------------------------
    // PASO 1: Recuperar datos de Redis
    // -------------------------------------------------------------------------
    const datosRedisKey = `stripe:upgrade:${session.id}`;
    const datosRedisStr = await redis.get(datosRedisKey);

    if (!datosRedisStr) {
        console.error('❌ No se encontraron datos de upgrade en Redis para:', session.id);
        return;
    }

    console.log('📦 Datos de upgrade recuperados de Redis:', correo);

    // -------------------------------------------------------------------------
    // PASO 2: Verificar que el usuario existe
    // -------------------------------------------------------------------------
    const [usuario] = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);

    if (!usuario) {
        console.error('❌ Usuario no encontrado para upgrade:', usuarioId);
        return;
    }

    // -------------------------------------------------------------------------
    // PASO 3: Negocio — REVIVIR el archivado si el usuario ya tuvo uno (re-registro tras
    // una cancelación MANUAL del Panel) o CREAR uno nuevo (upgrade de un personal sin
    // negocio previo). Evita negocios huérfanos y respeta el 1:1 usuario→negocio.
    // -------------------------------------------------------------------------
    const [negocioPrevio] = await db
        .select()
        .from(negocios)
        .where(eq(negocios.usuarioId, usuario.id))
        .limit(1);

    let nuevoNegocio: typeof negocios.$inferSelect;
    let sucursalPrincipal: typeof negocioSucursales.$inferSelect;

    if (negocioPrevio) {
        // Revivir: sale del archivo. Si ya había completado onboarding vuelve visible;
        // si no, queda en borrador para retomar el wizard.
        const visible = negocioPrevio.onboardingCompletado === true;
        [nuevoNegocio] = await db
            .update(negocios)
            .set({
                nombre: nombreNegocio || negocioPrevio.nombre,
                estadoAdmin: 'activo',
                estadoMembresia: 'al_corriente',
                activo: visible,
                esBorrador: !visible,
                // Limpia las fechas del periodo ANTERIOR (la suscripción nueva trae las suyas):
                // sellarFechasPeriodoDesdeStripe las repuebla enseguida. Si ese sellado fallara,
                // se ve "—" honesto en vez de una fecha del periodo viejo.
                fechaProximoCobro: null,
                fechaVencimiento: null,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, negocioPrevio.id))
            .returning();
        console.log('♻️ Negocio archivado revivido en upgrade:', nuevoNegocio.id);

        // Reusar su sucursal principal (no crear otra); si por algún motivo no existe, crearla.
        const [sucExistente] = await db
            .select()
            .from(negocioSucursales)
            .where(and(eq(negocioSucursales.negocioId, nuevoNegocio.id), eq(negocioSucursales.esPrincipal, true)))
            .limit(1);
        if (sucExistente) {
            sucursalPrincipal = sucExistente;
        } else {
            [sucursalPrincipal] = await db
                .insert(negocioSucursales)
                .values({ negocioId: nuevoNegocio.id, nombre: nombreNegocio || 'Mi Negocio', esPrincipal: true, ciudad: 'Por configurar', activa: true })
                .returning();
        }
    } else {
        [nuevoNegocio] = await db
            .insert(negocios)
            .values({
                usuarioId: usuario.id,
                nombre: nombreNegocio || 'Mi Negocio',
                esBorrador: true,
                verificado: false,
                participaPuntos: false,
            })
            .returning();
        console.log('✅ Negocio creado:', nuevoNegocio.id);

        [sucursalPrincipal] = await db
            .insert(negocioSucursales)
            .values({ negocioId: nuevoNegocio.id, nombre: nombreNegocio || 'Mi Negocio', esPrincipal: true, ciudad: 'Por configurar', activa: true })
            .returning();
        console.log('✅ Sucursal principal creada:', sucursalPrincipal.id);
    }

    // -------------------------------------------------------------------------
    // PASO 5: Actualizar usuario (activar modo comercial)
    // -------------------------------------------------------------------------
    await db
        .update(usuarios)
        .set({
            perfil: 'comercial',
            tieneModoComercial: true,
            modoActivo: 'comercial',
            negocioId: nuevoNegocio.id,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(usuarios.id, usuario.id));

    console.log('✅ Usuario actualizado con modo comercial:', usuario.id);

    // Sella ya las fechas del periodo (próximo cobro = fin del trial) leyéndolas de Stripe, igual
    // que en el alta nueva → el "Próximo cobro" se ve desde el upgrade (también al revivir).
    await sellarFechasPeriodoDesdeStripe(nuevoNegocio.id, session.subscription as string);

    // -------------------------------------------------------------------------
    // PASO 6: Generar nuevos tokens JWT (con datos actualizados)
    // -------------------------------------------------------------------------
    const payload: PayloadToken = {
        usuarioId: usuario.id,
        correo: usuario.correo,
        perfil: 'comercial',
        membresia: usuario.membresia,
        modoActivo: 'comercial',
    };

    const { accessToken, refreshToken } = generarTokens(payload);

    // -------------------------------------------------------------------------
    // PASO 7: Guardar tokens en Redis
    // -------------------------------------------------------------------------
    const datosUsuario: DatosUsuarioWebhook = {
        usuario: {
            id: usuario.id,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            correo: usuario.correo,
            perfil: 'comercial',
            membresia: usuario.membresia,
            correoVerificado: usuario.correoVerificado ?? false,
            tieneModoComercial: true,
            modoActivo: 'comercial',
            negocioId: nuevoNegocio.id,
            sucursalActiva: sucursalPrincipal.id,
            nombreNegocio: nombreNegocio || 'Mi Negocio',
            onboardingCompletado: false,
        },
        accessToken,
        refreshToken,
    };

    // Usar clave específica para upgrade
    const keyRedis = `stripe:upgrade:tokens:${session.id}`;
    await redis.setex(
        keyRedis,
        10 * 60, // 10 minutos (más tiempo por si hay delays)
        JSON.stringify(datosUsuario)
    );

    await guardarSesion(usuario.id, refreshToken);

    console.log('✅ Tokens de upgrade guardados en Redis:', session.id);

    // -------------------------------------------------------------------------
    // PASO 8: Limpiar datos temporales
    // -------------------------------------------------------------------------
    await redis.del(datosRedisKey);
}

// =============================================================================
// FUNCIÓN AUXILIAR: PROCESAR CANCELACIÓN DE SUSCRIPCIÓN
// =============================================================================

/**
 * Procesa customer.subscription.deleted, distinguiendo el MOTIVO:
 * - 'cancellation_requested' (baja DELIBERADA del Panel/API): baja completa →
 *   degrada al dueño a personal + archiva + cancela membresía + revierte vouchers.
 * - cualquier otro (impago/disputa: Stripe canceló la sub): se trata como SUSPENSIÓN
 *   (recuperable, el dueño sigue comercial). Decisión de producto: el impago NUNCA
 *   cancela; solo el botón manual del Panel cancela.
 *
 * @param subscription - Objeto de suscripción de Stripe (cancelada)
 */
export async function procesarCancelacionSuscripcion(
    subscription: Stripe.Subscription,
    eventId?: string
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

        // ── Guard: el IMPAGO nunca debe terminar en CANCELADO (decisión de producto) ──
        // subscription.deleted llega por (1) cancelación DELIBERADA del Panel/API
        // (cancellation_details.reason = 'cancellation_requested') o (2) Stripe cancelando
        // por impago/disputa. Solo la baja MANUAL debe cancelar+degradar; el impago solo
        // SUSPENDE (recuperable, el dueño sigue comercial).
        // [Refuerzo recomendado: configurar el dunning de Stripe en 'leave unpaid' para que
        //  este evento ni siquiera llegue por impago.]
        const motivoCancelacion = (subscription as unknown as { cancellation_details?: { reason?: string | null } })
            .cancellation_details?.reason;
        if (motivoCancelacion !== 'cancellation_requested') {
            const [negImpago] = await db.select().from(negocios).where(eq(negocios.usuarioId, usuario.id)).limit(1);
            if (negImpago) {
                await db
                    .update(negocios)
                    .set({ estadoMembresia: 'suspendido', activo: false, updatedAt: new Date().toISOString() })
                    .where(eq(negocios.id, negImpago.id));
                try {
                    const { notificarNegocioFueraDeCirculacion } = await import('./notificaciones.service.js');
                    await notificarNegocioFueraDeCirculacion(negImpago.id);
                } catch (errNotif) {
                    console.error('❌ Error notificando suspensión por impago:', errNotif);
                }
            }
            console.log(`⚠️ subscription.deleted por impago (reason='${motivoCancelacion ?? 'desconocido'}') → SUSPENDIDO, NO cancelado (dueño sigue comercial): ${usuario.correo}`);
            return;
        }

        // ── Cancelación DELIBERADA (admin/API): baja completa (degradar + archivar) ──
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
                    activo: false,                     // Sacar de circulación (visibilidad)
                    estadoMembresia: 'cancelado',      // Estado de membresía: cancelado
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(negocios.id, negocio.id));

            console.log(`📦 Negocio despublicado y cancelado: ${negocio.nombre}`);

            // Grupo 1 (Tanda 2): devolver los puntos de los vouchers PENDIENTES de
            // este negocio. El cliente gastó puntos por una recompensa que ya no
            // podrá recibir → se le reintegran. La función es idempotente; va
            // aislada en try/catch para que un fallo aquí NO rompa la cancelación
            // (que es lo crítico del webhook).
            try {
                const { revertirVouchersPendientesPorCancelacion } = await import('./puntos.service.js');
                const reversion = await revertirVouchersPendientesPorCancelacion(negocio.id);
                if (reversion.vouchersRevertidos > 0) {
                    console.log(`↩️ Cancelación: ${reversion.vouchersRevertidos} vouchers revertidos, ${reversion.puntosDevueltos} pts devueltos (${negocio.nombre}).`);
                }
            } catch (errReversion) {
                console.error('❌ Error devolviendo puntos de vouchers tras cancelación:', errReversion);
            }

            // Aviso persistente al dueño (centro de notificaciones, modo personal).
            try {
                const { notificarNegocioFueraDeCirculacion } = await import('./notificaciones.service.js');
                await notificarNegocioFueraDeCirculacion(negocio.id);
            } catch (errNotif) {
                console.error('❌ Error notificando cancelación al dueño:', errNotif);
            }

            // Bitácora financiera: registra la cancelación DELIBERADA (baja completa). El
            // camino de impago (arriba) NO registra cancelación: ahí solo se suspende.
            await registrarEventoPago({
                negocioId: negocio.id,
                tipo: 'cancelacion',
                origen: 'stripe',
                fechaEvento: new Date().toISOString(),
                stripeEventId: eventId ?? null,
                metadata: { subscriptionId: subscription.id, motivo: 'cancellation_requested' },
            });
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
// FUNCIONES AUXILIARES: WEBHOOK DE RENOVACIONES (estado de membresía)
// =============================================================================

/** Convierte un timestamp Unix (segundos) de Stripe a ISO string, o null. */
function unixAISO(segundos: number | null | undefined): string | null {
    return segundos ? new Date(segundos * 1000).toISOString() : null;
}

/**
 * Fin del periodo de facturación (ISO) de una suscripción de Stripe. En clover
 * `current_period_end` vive a nivel de item; con fallback a la raíz y, en última instancia, a
 * `trial_end` (durante el trial coinciden). null si no hay ninguno. Fuente ÚNICA para que el
 * sellado-al-alta (sellarFechasPeriodoDesdeStripe) y el refresco-por-updated
 * (manejarSuscripcionActualizada) nunca diverjan si cambia la forma del objeto de Stripe.
 */
function finPeriodoDeSuscripcion(subscription: Stripe.Subscription): string | null {
    const s = subscription as unknown as {
        current_period_end?: number;
        trial_end?: number | null;
        items?: { data?: Array<{ current_period_end?: number }> };
    };
    return unixAISO(s.items?.data?.[0]?.current_period_end ?? s.current_period_end ?? s.trial_end);
}

/** Extrae el id de cliente de Stripe (string) de un campo `customer`. */
function idCliente(customer: string | { id: string } | null | undefined): string | null {
    if (!customer) return null;
    return typeof customer === 'string' ? customer : customer.id;
}

/**
 * Resuelve el negocio (y su usuario) a partir de identificadores de Stripe.
 * Camino del join (1:1): stripeSubscriptionId | stripeCustomerId → usuario → negocio.
 *
 * @returns { usuario, negocio } o null si no se encuentra
 */
async function obtenerNegocioDesdeStripe(
    opts: { suscripcionId?: string | null; clienteId?: string | null }
): Promise<{ usuario: typeof usuarios.$inferSelect; negocio: typeof negocios.$inferSelect } | null> {
    const filtro = opts.suscripcionId
        ? eq(usuarios.stripeSubscriptionId, opts.suscripcionId)
        : opts.clienteId
            ? eq(usuarios.stripeCustomerId, opts.clienteId)
            : null;

    if (!filtro) return null;

    const [usuario] = await db.select().from(usuarios).where(filtro).limit(1);
    if (!usuario) return null;

    const [negocio] = await db
        .select()
        .from(negocios)
        .where(eq(negocios.usuarioId, usuario.id))
        .limit(1);
    if (!negocio) return null;

    return { usuario, negocio };
}

/**
 * invoice.payment_succeeded — la renovación (o el primer cobro tras el trial) se cobró.
 * Estado → al_corriente. Actualiza vencimiento/próximo cobro y LIMPIA las fechas de gracia.
 */
async function manejarRenovacionPagada(invoice: Stripe.Invoice, eventId?: string): Promise<void> {
    try {
        // Acceso defensivo (API 2025-11 clover: algunos campos se movieron de lugar).
        const inv = invoice as unknown as {
            customer?: string | { id: string } | null;
            lines?: { data?: Array<{ period?: { end?: number } }> };
            amount_paid?: number;
        };
        const clienteId = idCliente(inv.customer);
        const finPeriodo = unixAISO(inv.lines?.data?.[0]?.period?.end);
        // Cobro REAL = monto > 0. El invoice de $0 del trial NO debe sellar "Cliente desde".
        const esCobroReal = (inv.amount_paid ?? 0) > 0;

        const res = await obtenerNegocioDesdeStripe({ clienteId });
        if (!res) {
            console.log('ℹ️ Renovación pagada sin negocio asociado (cliente):', clienteId);
            return;
        }

        // ── Cinturón anti-republicación (Panel · Entrega 2) ──────────────────────
        // El REGRESO por pago solo enciende la visibilidad (`activo=true`) si la ÚNICA
        // razón de estar oculto era el pago. Si el negocio está suspendido/archivado
        // A MANO desde el Panel (estado_admin != 'activo'), el pago actualiza el EJE
        // DE PAGO (estado_membresia + fechas) pero NO lo reaparece: la decisión manual
        // manda. Apagar `activo` lo hacen el cron de gracia y la cancelación; aquí solo
        // se permite ENCENDER en el caso seguro.
        const puedeReaparecer = res.negocio.estadoAdmin === 'activo';
        if (!puedeReaparecer) {
            console.log(
                `🔒 Pago recibido en negocio con estado_admin='${res.negocio.estadoAdmin}': se actualiza el pago pero NO se republica (${res.negocio.nombre}).`,
            );
        }

        await db
            .update(negocios)
            .set({
                estadoMembresia: 'al_corriente',
                // Reaparece SOLO si su única razón de ocultamiento era el pago.
                ...(puedeReaparecer ? { activo: true } : {}),
                fechaVencimiento: finPeriodo,
                fechaProximoCobro: finPeriodo,
                fechaInicioGracia: null,
                fechaLimiteGracia: null,
                // "Cliente desde": sella la fecha del PRIMER cobro real (COALESCE → solo la 1ª vez).
                ...(esCobroReal ? { fechaPrimerPago: sql`COALESCE(${negocios.fechaPrimerPago}, CURRENT_DATE)` } : {}),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, res.negocio.id));

        console.log(`✅ Renovación pagada → al_corriente: ${res.negocio.nombre} (vence ${finPeriodo})`);

        // Bitácora financiera (libro mayor): registra el cobro REAL (monto>0). El invoice de
        // $0 del trial NO es un movimiento de dinero → no se registra. Defensivo: no rompe el
        // webhook ni provoca reintento si el INSERT de bitácora falla.
        if (esCobroReal) {
            await registrarEventoPago({
                negocioId: res.negocio.id,
                tipo: 'cobro_exitoso',
                origen: 'stripe',
                monto: (inv.amount_paid ?? 0) / 100,
                fechaEvento: new Date().toISOString(),
                stripeEventId: eventId ?? null,
                metadata: { customerId: clienteId, finPeriodo },
            });
            // Comisión de alta del vendedor (pieza C): se devenga al PRIMER cobro real. Best-effort + idempotente.
            try {
                const { devengarComisionAlta } = await import('./admin/comisiones-devengo.service.js');
                await devengarComisionAlta(res.negocio.id);
            } catch (errCom) {
                console.error('❌ Error devengando la comisión de alta (webhook):', errCom);
            }

            // Comprobante de pago (correo + recibo PDF con folio correlativo) por el cobro de TARJETA —
            // mismo flujo que un pago manual. Se registra una fila en pagos_membresia (concepto 'tarjeta')
            // para tomar el folio de la MISMA serie y que aparezca en el historial del negocio; NO crea
            // gemelo en eventos_pago (el cobro ya quedó arriba como 'cobro_exitoso'). Best-effort: si falla,
            // el cobro ya está registrado.
            try {
                const [pagoTarjeta] = await db
                    .insert(pagosMembresia)
                    .values({
                        negocioId: res.negocio.id,
                        concepto: 'tarjeta',
                        monto: String((inv.amount_paid ?? 0) / 100),
                        mesesCubiertos: null,
                        periodoHasta: finPeriodo ?? new Date().toISOString(),
                        registradoPor: null,
                    })
                    .returning({ id: pagosMembresia.id });
                if (pagoTarjeta?.id) {
                    const { prepararReciboPago } = await import('./admin/recibo-pago.service.js');
                    const { enviarComprobantePagoMembresia } = await import('../utils/email.js');
                    const rec = await prepararReciboPago(pagoTarjeta.id);
                    if (rec?.correoDueno) {
                        await enviarComprobantePagoMembresia(rec.correoDueno, rec.nombreDueno ?? '', {
                            nombreNegocio: rec.nombreNegocio,
                            concepto: rec.concepto,
                            monto: rec.monto,
                            hasta: rec.hasta,
                            reciboUrl: rec.reciboUrl,
                        });
                    }
                }
            } catch (errRecibo) {
                console.error('❌ Error emitiendo el comprobante del cobro con tarjeta (webhook):', errRecibo);
            }
        }

        // Si el negocio reapareció por el pago, borrar el aviso de "fuera de circulación".
        if (puedeReaparecer) {
            try {
                const { limpiarNotificacionNegocioFueraDeCirculacion } = await import('./notificaciones.service.js');
                await limpiarNotificacionNegocioFueraDeCirculacion(res.negocio.id);
            } catch (errNotif) {
                console.error('❌ Error limpiando notificación tras reactivación por pago:', errNotif);
            }
        }
    } catch (error) {
        console.error('❌ Error en manejarRenovacionPagada:', error);
        throw error; // propaga → el controller responde 500 → Stripe reintenta (no perder el cobro)
    }
}

/**
 * invoice.payment_failed — falló el cobro de la renovación.
 * Primer fallo (desde al_corriente): pasa a en_gracia y fija el plazo de gracia UNA vez.
 * En CADA fallo (incluidos los reintentos) refresca `fechaProximoCobro` con el próximo
 * reintento de Stripe (`next_payment_attempt`), SIN reiniciar el plazo. `fechaVencimiento`
 * se queda fija (cuándo se le acabó lo pagado). El negocio SIGUE visible en gracia.
 */
async function manejarCobroFallido(invoice: Stripe.Invoice, eventId?: string): Promise<void> {
    try {
        const inv = invoice as unknown as {
            customer?: string | { id: string } | null;
            next_payment_attempt?: number | null;
        };
        const clienteId = idCliente(inv.customer);
        // Fecha del PRÓXIMO reintento que programó Stripe (null si ya no reintentará).
        const proximoReintento = unixAISO(inv.next_payment_attempt);

        const res = await obtenerNegocioDesdeStripe({ clienteId });
        if (!res) {
            console.log('ℹ️ Cobro fallido sin negocio asociado (cliente):', clienteId);
            return;
        }

        // Suspendido o cancelado: la morosidad ya se resolvió por otra vía. No tocar.
        if (res.negocio.estadoMembresia === 'suspendido' || res.negocio.estadoMembresia === 'cancelado') {
            console.log(`ℹ️ Cobro fallido ignorado (estado: ${res.negocio.estadoMembresia}): ${res.negocio.nombre}`);
            return;
        }

        // Bitácora financiera: registra el intento de cobro fallido (sin monto: no se cobró).
        // Cada fallo es un event.id distinto → una fila por intento. Defensivo.
        await registrarEventoPago({
            negocioId: res.negocio.id,
            tipo: 'cobro_fallido',
            origen: 'stripe',
            fechaEvento: new Date().toISOString(),
            stripeEventId: eventId ?? null,
            metadata: { customerId: clienteId, proximoReintento, estadoPrevio: res.negocio.estadoMembresia },
        });

        const ahora = new Date();

        if (res.negocio.estadoMembresia === 'al_corriente') {
            // PRIMER fallo: entra en gracia (el plazo se fija UNA vez). `fechaVencimiento`
            // (cuándo se le acabó lo pagado) se queda FIJA; `fechaProximoCobro` pasa a ser
            // el próximo reintento de Stripe.
            const diasGracia = await obtenerConfigNumero('periodo_gracia_cobro_dias', 14);
            const limite = new Date(ahora.getTime() + diasGracia * 24 * 60 * 60 * 1000);
            await db
                .update(negocios)
                .set({
                    estadoMembresia: 'en_gracia',
                    fechaInicioGracia: ahora.toISOString(),
                    fechaLimiteGracia: limite.toISOString(),
                    fechaProximoCobro: proximoReintento,
                    updatedAt: ahora.toISOString(),
                })
                .where(eq(negocios.id, res.negocio.id));
            console.log(`⚠️ Cobro fallido → en_gracia hasta ${limite.toISOString()} (reintento ${proximoReintento ?? 'sin más'}): ${res.negocio.nombre}`);
            return;
        }

        // Reintento posterior (ya en_gracia): NO reinicia el plazo de gracia, solo
        // refresca cuándo será el siguiente intento de cobro.
        await db
            .update(negocios)
            .set({ fechaProximoCobro: proximoReintento, updatedAt: ahora.toISOString() })
            .where(eq(negocios.id, res.negocio.id));
        console.log(`↻ Reintento fallido (sigue en gracia, próximo intento ${proximoReintento ?? 'sin más'}): ${res.negocio.nombre}`);
    } catch (error) {
        console.error('❌ Error en manejarCobroFallido:', error);
        throw error; // propaga → 500 → Stripe reintenta (no perder el evento de morosidad)
    }
}

/**
 * Sella en la BD las fechas del periodo (fechaProximoCobro + fechaVencimiento) leyéndolas de la
 * suscripción de Stripe, JUSTO al crear el negocio. Durante el trial, `current_period_end` = fin
 * del trial = próximo cobro, así que el "Próximo cobro" se ve desde el primer momento.
 *
 * Antes estas fechas dependían SOLO del evento asíncrono `customer.subscription.updated`, que no
 * se garantiza al alta: no se maneja `customer.subscription.created`, y un `updated` puede llegar
 * ANTES de que el negocio exista (carrera con `checkout.session.completed`) → en ese caso el
 * handler hace `return` temprano y la fecha nunca se escribía → el "Próximo cobro" salía vacío
 * durante todo el trial.
 *
 * Defensivo (best-effort): si el retrieve o el UPDATE fallan, NO rompe el alta ya confirmada; las
 * fechas se refrescarán igual en el próximo `customer.subscription.updated`.
 */
async function sellarFechasPeriodoDesdeStripe(negocioId: string, subscriptionId: string | null): Promise<void> {
    if (!subscriptionId) return;
    try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const finPeriodo = finPeriodoDeSuscripcion(sub);
        if (!finPeriodo) return;
        await db
            .update(negocios)
            .set({ fechaVencimiento: finPeriodo, fechaProximoCobro: finPeriodo, updatedAt: new Date().toISOString() })
            .where(eq(negocios.id, negocioId));
        console.log(`📅 Fechas de periodo selladas al crear (próximo cobro ${finPeriodo}): ${negocioId}`);
    } catch (error) {
        console.error('❌ Error sellando fechas de periodo al crear el negocio (no crítico):', error);
    }
}

/**
 * customer.subscription.updated — solo refresca las fechas del periodo.
 * NO cambia el estado de membresía (eso lo gobiernan los eventos invoice.*).
 */
async function manejarSuscripcionActualizada(subscription: Stripe.Subscription): Promise<void> {
    try {
        const finPeriodo = finPeriodoDeSuscripcion(subscription);
        if (!finPeriodo) return;

        const res = await obtenerNegocioDesdeStripe({ suscripcionId: subscription.id });
        if (!res) return;

        await db
            .update(negocios)
            .set({
                fechaVencimiento: finPeriodo,
                fechaProximoCobro: finPeriodo,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, res.negocio.id));

        console.log(`🔄 Suscripción actualizada → fechas refrescadas (vence ${finPeriodo}): ${res.negocio.nombre}`);
    } catch (error) {
        console.error('❌ Error en manejarSuscripcionActualizada:', error);
        throw error; // propaga → 500 → Stripe reintenta (no perder el refresco de fechas)
    }
}

/**
 * customer.subscription.trial_will_end — Stripe lo dispara ~3 días antes de que termine
 * el trial. Avisa al DUEÑO, in-app (notificación de AnunciaYA), en AMBOS modos
 * (personal y comercial), que su prueba está por terminar y se cobrará la membresía.
 */
export async function manejarTrialPorTerminar(subscription: Stripe.Subscription): Promise<void> {
    try {
        const res = await obtenerNegocioDesdeStripe({ suscripcionId: subscription.id });
        if (!res) {
            console.log('ℹ️ trial_will_end sin negocio asociado:', subscription.id);
            return;
        }

        // Fecha legible del fin de trial (es-MX, mes abreviado).
        const trialEnd = (subscription as unknown as { trial_end?: number | null }).trial_end;
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        let fechaTxt = 'pronto';
        if (trialEnd) {
            const d = new Date(trialEnd * 1000);
            fechaTxt = `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
        }

        // ¿Este trial que termina nació de un "Registrar pago" manual (Opción A)? Lo sabemos si hay
        // un pago de membresía cuyo periodo cubierto coincide (mismo instante) con el fin de trial.
        // Distingue el copy y, en cortesía, SUPRIME el aviso (el dueño no paga ese periodo).
        let conceptoManual: string | null = null;
        if (trialEnd) {
            const filas = (await db.execute(sql`
                SELECT concepto FROM pagos_membresia
                WHERE negocio_id = ${res.negocio.id}
                  AND ABS(EXTRACT(EPOCH FROM periodo_hasta) - ${trialEnd}) <= 5
                ORDER BY created_at DESC
                LIMIT 1
            `)).rows as Array<{ concepto: string }>;
            conceptoManual = filas[0]?.concepto ?? null;
        }

        // Cortesía: el dueño NO paga este periodo → avisarle de un cobro sería incorrecto. Suprimir.
        if (conceptoManual === 'cortesia') {
            console.log(`🔕 trial_will_end suprimido (cortesía) → ${res.usuario.correo}`);
            return;
        }

        // Pago manual (efectivo/transferencia): avisa del próximo cobro SIN llamarlo "prueba gratis".
        // Trial de alta (sin pago manual cubriendo este periodo): conserva el copy de prueba gratis.
        const esPagoManual = conceptoManual === 'efectivo' || conceptoManual === 'transferencia';
        const precioMembresia = await obtenerConfigNumero('precio_membresia_mxn', 849);
        const titulo = esPagoManual ? 'Tu membresía se renueva pronto' : 'Tu prueba gratis termina pronto';
        const mensaje = esPagoManual
            ? `El periodo que cubriste vence el ${fechaTxt}. Ese día se cobrará tu membresía ($${precioMembresia}/mes) a la tarjeta registrada. Revisa que esté vigente para no perder el servicio.`
            : `Tu periodo de prueba termina el ${fechaTxt}. Ese día se cobrará tu membresía ($${precioMembresia}/mes). Revisa que tu tarjeta esté vigente para no perder el servicio.`;

        const { crearNotificacion } = await import('./notificaciones.service.js');
        // In-app en AMBOS modos, a nivel negocio (sin sucursalId → visible en cualquier sucursal).
        await crearNotificacion({ usuarioId: res.usuario.id, modo: 'personal', tipo: 'sistema', titulo, mensaje, negocioId: res.negocio.id });
        await crearNotificacion({ usuarioId: res.usuario.id, modo: 'comercial', tipo: 'sistema', titulo, mensaje, negocioId: res.negocio.id });

        console.log(`🔔 Aviso de fin de trial (${esPagoManual ? 'pago manual' : 'prueba'}, ambos modos) → ${res.usuario.correo} (vence ${fechaTxt})`);
    } catch (error) {
        console.error('❌ Error en manejarTrialPorTerminar:', error);
        throw error; // propaga → 500 → Stripe reintenta (no perder el aviso)
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
    // Claves posibles: registro nuevo o upgrade
    const keyRegistro = `stripe:tokens:${sessionId}`;
    const keyUpgrade = `stripe:upgrade:tokens:${sessionId}`;

    // -------------------------------------------------------------------------
    // PASO 1: Intentar recuperar tokens de Redis (con reintentos)
    // -------------------------------------------------------------------------
    // El webhook puede tardar unos segundos, así que reintentamos
    let datosUsuario: string | null = null;
    let intentos = 0;
    const maxIntentos = 6; // 6 intentos x 5 segundos = 30 segundos máximo

    while (intentos < maxIntentos && !datosUsuario) {
        // Buscar en ambas claves (registro normal o upgrade)
        datosUsuario = await redis.get(keyRegistro);
        if (!datosUsuario) {
            datosUsuario = await redis.get(keyUpgrade);
        }

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

    // NO borramos los tokens aquí porque React StrictMode puede hacer 
    // doble llamada en desarrollo. Los tokens expirarán solos (TTL 10 min).
    // En producción esto no es problema porque StrictMode está desactivado.

    return datos;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    crearCheckoutSession,
    crearCheckoutUpgrade,
    procesarWebhook,
    verificarSession,
};