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
import { usuarios, negocios, negocioSucursales, embajadores } from '../db/schemas/schema.js';
import { redis } from '../db/redis.js'; // ← CORREGIDO
import { generarTokens, type PayloadToken } from '../utils/jwt.js';
import { guardarSesion } from '../utils/tokenStore.js'; // ← CORREGIDO
import { obtenerConfigNumero } from './configuracion.service.js';
import { eq, and } from 'drizzle-orm';

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
}

/**
 * Datos necesarios para upgrade de cuenta personal a comercial
 * (nombre y apellidos se obtienen de la BD)
 */
interface DatosCheckoutUpgrade {
    usuarioId: string;
    correo: string;
    nombreNegocio: string;
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
    const { correo, nombreNegocio, datosRegistro, esRegistroGoogle, googleIdToken, codigoReferido } = datos;

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
            // Duración del trial: se lee de configuracionSistema (default 14 días)
            trial_period_days: await obtenerConfigNumero('trial_duracion_dias', 14),

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
    const { usuarioId, correo, nombreNegocio } = datos;

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
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',

        line_items: [
            {
                price: env.STRIPE_PRICE_COMERCIAL,
                quantity: 1,
            },
        ],

        subscription_data: {
            // Duración del trial: se lee de configuracionSistema (default 14 días)
            trial_period_days: await obtenerConfigNumero('trial_duracion_dias', 14),
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
            await manejarRenovacionPagada(invoice);
            break;
        }

        case 'invoice.payment_failed': {
            // Falló el cobro de la renovación → entra en gracia
            const invoice = event.data.object as Stripe.Invoice;
            await manejarCobroFallido(invoice);
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
 * @returns { embajadorId, regionId } o null si no se pudo atribuir
 */
async function resolverEmbajadorPorCodigo(
    codigo: string | undefined | null
): Promise<{ embajadorId: string; regionId: string } | null> {
    if (!codigo) return null;

    try {
        const [embajador] = await db
            .select({ id: embajadores.id, regionId: embajadores.regionId })
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

        return { embajadorId: embajador.id, regionId: embajador.regionId };
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
    // vendedor (referidoPor / embajadorId / regionId en null).
    const atribucion = await resolverEmbajadorPorCodigo(metadata.codigoReferido);
    if (atribucion) {
        console.log('🤝 Atribución al embajador:', atribucion.embajadorId);
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
            referidoPor: atribucion?.embajadorId ?? null, // Vendedor que lo trajo
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
            embajadorId: atribucion?.embajadorId ?? null, // Vendedor que trajo el negocio
            regionId: atribucion?.regionId ?? null,        // Región del vendedor
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
    // PASO 3: Crear negocio
    // -------------------------------------------------------------------------
    const [nuevoNegocio] = await db
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

    // -------------------------------------------------------------------------
    // PASO 4: Crear sucursal principal
    // -------------------------------------------------------------------------
    const [sucursalPrincipal] = await db
        .insert(negocioSucursales)
        .values({
            negocioId: nuevoNegocio.id,
            nombre: nombreNegocio || 'Mi Negocio',
            esPrincipal: true,
            ciudad: 'Por configurar',
            activa: true,
        })
        .returning();

    console.log('✅ Sucursal principal creada:', sucursalPrincipal.id);

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
async function manejarRenovacionPagada(invoice: Stripe.Invoice): Promise<void> {
    try {
        // Acceso defensivo (API 2025-11 clover: algunos campos se movieron de lugar).
        const inv = invoice as unknown as {
            customer?: string | { id: string } | null;
            lines?: { data?: Array<{ period?: { end?: number } }> };
        };
        const clienteId = idCliente(inv.customer);
        const finPeriodo = unixAISO(inv.lines?.data?.[0]?.period?.end);

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
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, res.negocio.id));

        console.log(`✅ Renovación pagada → al_corriente: ${res.negocio.nombre} (vence ${finPeriodo})`);

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
    }
}

/**
 * invoice.payment_failed — falló el cobro de la renovación.
 * Si el negocio estaba al_corriente, pasa a en_gracia y fija las fechas de gracia
 * (solo la primera vez; los reintentos de Stripe NO reinician el plazo). El negocio
 * SIGUE visible/funcionando.
 */
async function manejarCobroFallido(invoice: Stripe.Invoice): Promise<void> {
    try {
        const inv = invoice as unknown as { customer?: string | { id: string } | null };
        const clienteId = idCliente(inv.customer);

        const res = await obtenerNegocioDesdeStripe({ clienteId });
        if (!res) {
            console.log('ℹ️ Cobro fallido sin negocio asociado (cliente):', clienteId);
            return;
        }

        // Solo se entra en gracia desde "al_corriente". Si ya está en_gracia,
        // suspendido o cancelado, no se reinicia el plazo ni se revive.
        if (res.negocio.estadoMembresia !== 'al_corriente') {
            console.log(`ℹ️ Cobro fallido ignorado (estado actual: ${res.negocio.estadoMembresia}): ${res.negocio.nombre}`);
            return;
        }

        const ahora = new Date();
        // Periodo de gracia: se lee de configuracionSistema (default 14 días)
        const diasGracia = await obtenerConfigNumero('periodo_gracia_cobro_dias', 14);
        const limite = new Date(ahora.getTime() + diasGracia * 24 * 60 * 60 * 1000);

        await db
            .update(negocios)
            .set({
                estadoMembresia: 'en_gracia',
                fechaInicioGracia: ahora.toISOString(),
                fechaLimiteGracia: limite.toISOString(),
                updatedAt: ahora.toISOString(),
            })
            .where(eq(negocios.id, res.negocio.id));

        console.log(`⚠️ Cobro fallido → en_gracia hasta ${limite.toISOString()}: ${res.negocio.nombre}`);
    } catch (error) {
        console.error('❌ Error en manejarCobroFallido:', error);
    }
}

/**
 * customer.subscription.updated — solo refresca las fechas del periodo.
 * NO cambia el estado de membresía (eso lo gobiernan los eventos invoice.*).
 */
async function manejarSuscripcionActualizada(subscription: Stripe.Subscription): Promise<void> {
    try {
        // Acceso defensivo: en clover current_period_end vive a nivel de item.
        const sub = subscription as unknown as {
            current_period_end?: number;
            items?: { data?: Array<{ current_period_end?: number }> };
        };
        const finPeriodo = unixAISO(sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end);
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