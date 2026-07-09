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
import { resolverCiudadId } from '../utils/ciudades.js';
import { guardarSesion } from '../utils/tokenStore.js'; // ← CORREGIDO
import { obtenerConfigNumero, obtenerConfigTexto } from './configuracion.service.js';
import { crearNegocioConDueno } from './negocioManagement.service.js';
import { registrarEventoPago } from './suscripciones/eventos-pago.js';
import { notificarMembresiaEnGracia } from './notificaciones.service.js';
import { empujarCobroSuscripcion } from './suscripciones/acciones-stripe.js';
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
        ciudad?: string;   // Nombre de la ciudad donde opera el negocio (se resuelve a ciudad_id)
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
    // Código del vendedor (opcional) para atribuir el upgrade y devengarle comisión. Case-sensitive.
    codigoReferido?: string;
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
            // Ciudad donde opera el negocio (resuelta a ciudad_id para el webhook).
            ciudadId: await resolverCiudadId(datosRegistro.ciudad ?? null),
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
    // Cobro "día 1" (ventas por vendedor, Pieza 2): si el registro trae código de vendedor, se OMITE el
    // trial → la suscripción cobra de inmediato (el webhook empujará luego el próximo cobro 1 mes + cortesía).
    // El auto-registro SIN vendedor conserva su trial normal de config.
    const trialEfectivo = codigoReferido ? 0 : trialDias;
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
            // Trial configurable; si es 0 (o hay vendedor → cobro día-1) se OMITE (Stripe exige ≥1) → cobra ya.
            ...(trialEfectivo > 0 ? { trial_period_days: trialEfectivo } : {}),

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
        // El cancel_url CONSERVA el plan y el ref (atribución del vendedor): si el usuario cancela en Stripe
        // y reintenta, no se pierde al vendedor (antes volvía a `?cancelado=true` sin ref → negocio sin
        // vendedor → comisión perdida). El front re-lee ?ref= y ?plan= de la URL al montar.
        cancel_url: `${env.FRONTEND_URL}/registro?cancelado=true&plan=comercial${codigoReferido ? `&ref=${encodeURIComponent(codigoReferido)}` : ''}`,

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
    const { usuarioId, correo, nombreNegocio, intervalo = 'month', codigoReferido } = datos;

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
                ...(codigoReferido ? { codigoReferido } : {}),
            },
        },

        metadata: {
            usuarioId,
            correo,
            nombre,
            apellidos,
            nombreNegocio,
            tipo: 'upgrade_comercial',
            // Código del vendedor: viaja en la metadata para atribuir el upgrade en el webhook.
            ...(codigoReferido ? { codigoReferido } : {}),
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
// FUNCIÓN 1.6: ACTIVAR COBRO CON TARJETA EN UN NEGOCIO EXISTENTE (manual → tarjeta)
// =============================================================================

/**
 * Crea un Checkout (subscription) para que un negocio que hoy paga MANUAL active el cobro con
 * tarjeta. RESPETA la vigencia restante: si `fecha_vencimiento` es futura, la suscripción nace con
 * `trial_end` en esa fecha (no cobra ahora; el primer cargo cae al vencer lo pagado). Si el negocio
 * está vencido/en gracia/suspendido, cobra de inmediato (recupera al moroso). No crea negocio.
 */
export async function crearCheckoutActivarTarjeta(usuarioId: string): Promise<RespuestaCheckout> {
    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, usuarioId)).limit(1);
    if (!usuario) throw new Error('Usuario no encontrado');
    if (!usuario.tieneModoComercial || !usuario.negocioId) throw new Error('No tienes un negocio comercial');

    const [neg] = await db.select().from(negocios).where(eq(negocios.id, usuario.negocioId)).limit(1);
    if (!neg) throw new Error('Negocio no encontrado');
    if (neg.estadoAdmin === 'archivado') throw new Error('Tu negocio está cancelado');
    if (neg.metodoCobro === 'tarjeta' || usuario.stripeSubscriptionId) throw new Error('Ya tienes cobro con tarjeta');

    const priceComercial = await obtenerPriceComercial('month');

    // Respeta la vigencia: trial_end = fecha_vencimiento si es futura (no cobra ya). Si venció, cobro
    // inmediato (sin trial). Margen de 1 min para no mandar a Stripe un trial_end prácticamente "ahora".
    const ahoraMs = Date.now();
    const vencMs = neg.fechaVencimiento ? new Date(neg.fechaVencimiento).getTime() : 0;
    const usarTrial = vencMs > ahoraMs + 60_000;

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: priceComercial, quantity: 1 }],
        subscription_data: {
            ...(usarTrial ? { trial_end: Math.floor(vencMs / 1000) } : {}),
            metadata: { usuarioId, negocioId: neg.id, tipo: 'activar_tarjeta' },
        },
        metadata: { usuarioId, negocioId: neg.id, tipo: 'activar_tarjeta' },
        ...(usuario.stripeCustomerId
            ? { customer: usuario.stripeCustomerId }
            : { customer_email: usuario.correo }),
        success_url: `${env.FRONTEND_URL}/perfil?tarjeta=activada`,
        cancel_url: `${env.FRONTEND_URL}/perfil`,
        allow_promotion_codes: true,
        locale: 'es',
    });

    return { sessionId: session.id, checkoutUrl: session.url! };
}

/**
 * Webhook de `checkout.session.completed` para `tipo='activar_tarjeta'`: asocia la suscripción y el
 * cliente al usuario, pasa el negocio a `metodo_cobro='tarjeta'` y sella las fechas. NO crea negocio.
 * Si cobró de inmediato (negocio vencido), registra el cobro (recibo + comisión, idempotente por invoice).
 */
async function manejarActivacionTarjeta(session: Stripe.Checkout.Session): Promise<void> {
    const md = session.metadata;
    const usuarioId = md?.usuarioId;
    const negocioId = md?.negocioId;
    if (!usuarioId || !negocioId) {
        console.error('⚠️ activar_tarjeta sin metadata (usuarioId/negocioId)');
        return;
    }
    const subId = session.subscription as string;

    await db
        .update(usuarios)
        .set({
            stripeSubscriptionId: subId,
            stripeCustomerId: (session.customer as string) || undefined,
            updatedAt: new Date().toISOString(),
        })
        .where(eq(usuarios.id, usuarioId));
    await db
        .update(negocios)
        .set({ metodoCobro: 'tarjeta', updatedAt: new Date().toISOString() })
        .where(eq(negocios.id, negocioId));

    // Sella `fecha_proximo_cobro`/`fecha_vencimiento` desde Stripe (current_period_end = trial_end o el cobro).
    await sellarFechasPeriodoDesdeStripe(negocioId, subId);

    // Cobro inmediato (negocio vencido sin trial): registra recibo + comisión (idempotente por invoice).
    try {
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ['latest_invoice'] });
        const latest = sub.latest_invoice;
        const inv = (typeof latest === 'string' ? await stripe.invoices.retrieve(latest) : latest) as unknown as {
            id?: string; amount_paid?: number; lines?: { data?: Array<{ period?: { end?: number } }> };
        } | null;
        if (inv?.id && (inv.amount_paid ?? 0) > 0) {
            await registrarCobroReal({
                negocioId,
                invoiceId: inv.id,
                montoCentavos: inv.amount_paid ?? 0,
                finPeriodo: unixAISO(inv.lines?.data?.[0]?.period?.end),
                clienteId: session.customer as string,
            });
        }
    } catch (e) {
        console.error('❌ activar_tarjeta: error registrando el cobro inicial:', e);
    }

    console.log(`💳 Tarjeta activada en negocio existente: ${negocioId} (sub ${subId})`);
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
    ciudadId?: string | null;       // Ciudad (ya resuelta) elegida en el registro comercial
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

/**
 * Valida un código de referido para mostrarlo EN VIVO en el formulario de upgrade. Case-sensitive exacto
 * (igual que `resolverEmbajadorPorCodigo`): un código mal escrito = inválido, no se normaliza. Devuelve el
 * nombre del vendedor para confirmar visualmente antes de pagar (vacío = sin vendedor, no es error).
 */
export async function validarCodigoReferido(
    codigo: string | undefined | null
): Promise<{ valido: boolean; vendedor: string | null }> {
    if (!codigo || !codigo.trim()) return { valido: false, vendedor: null };
    try {
        const [row] = await db
            .select({ nombre: usuarios.nombre, apellidos: usuarios.apellidos })
            .from(embajadores)
            .innerJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
            .where(and(eq(embajadores.codigoReferido, codigo), eq(embajadores.estado, 'activo')))
            .limit(1);
        if (!row) return { valido: false, vendedor: null };
        return { valido: true, vendedor: `${row.nombre} ${row.apellidos ?? ''}`.trim() };
    } catch {
        return { valido: false, vendedor: null };
    }
}

/**
 * Negocio del usuario (si lo tiene): un personal que YA tuvo un negocio (cancelado desde el Panel) lo
 * conserva ARCHIVADO; al volver a /crear-negocio, el upgrade lo REVIVE en vez de crear uno nuevo. Esto deja
 * que el formulario lo detecte y muestre "Recupera tu negocio: X" en vez del genérico "Crea tu negocio".
 */
export async function obtenerNegocioArchivadoDelUsuario(
    usuarioId: string
): Promise<{ tiene: boolean; nombre: string | null; onboardingCompletado: boolean }> {
    const [neg] = await db
        .select({ nombre: negocios.nombre, onboardingCompletado: negocios.onboardingCompletado })
        .from(negocios)
        .where(eq(negocios.usuarioId, usuarioId))
        .limit(1);
    if (!neg) return { tiene: false, nombre: null, onboardingCompletado: false };
    return { tiene: true, nombre: neg.nombre, onboardingCompletado: neg.onboardingCompletado ?? false };
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
    // Activar cobro con tarjeta en un negocio EXISTENTE (manual → tarjeta). No crea negocio.
    if (metadata.tipo === 'activar_tarjeta') {
        await manejarActivacionTarjeta(session);
        return;
    }

    if (metadata.tipo === 'upgrade_comercial') {
        await manejarUpgradeCompletado(session);
        return;
    }

    // Publicidad self-service (pago único): activa el anuncio pendiente. Carga perezosa para no
    // acoplar el módulo de pagos de membresía con el de publicidad.
    if (metadata.tipo === 'compra_publicidad') {
        const { activarPublicidadPagada } = await import('./publicidad-checkout.service.js');
        await activarPublicidadPagada(session);
        return;
    }

    // Renovación de publicidad (pago único): extiende la vigencia de un anuncio existente. Carga perezosa.
    if (metadata.tipo === 'renovacion_publicidad') {
        const { activarRenovacionPublicidad } = await import('./publicidad-renovacion.service.js');
        await activarRenovacionPublicidad(session);
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
        ciudadId: datosRegistro.ciudadId ?? null, // Ciudad donde opera el negocio (elegida en el registro)
    });

    console.log('✅ Usuario + negocio + sucursal creados:', nuevoUsuario.id, nuevoNegocio.id);

    // Lee la suscripción recién creada CON su invoice inicial UNA sola vez. Se hace ANTES del empuje de
    // cortesía porque el empuje (cambia trial_end) puede mover el `latest_invoice` a un ajuste de $0 y
    // entonces el cobro real (p.ej. los $8,490 del anual) ya no se vería desde aquí.
    let subCreada: Stripe.Subscription | null = null;
    try {
        subCreada = await stripe.subscriptions.retrieve(session.subscription as string, { expand: ['latest_invoice'] });
    } catch (errSub) {
        console.error('❌ Error leyendo la suscripción tras el alta:', errSub);
    }

    // Datos del cobro "día 1" (si hubo cobro real). Se EXTRAEN ahora porque el latest_invoice es el del cobro;
    // el REGISTRO se hace más abajo, TRAS sellar las fechas, para que la cobertura/recibo tomen ya la vigencia
    // CON cortesía. En registros con trial el invoice es de $0 → no hay cobro real que registrar aquí.
    let cobroInicial: { invoiceId: string; montoCentavos: number; finPeriodo: string | null } | null = null;
    if (subCreada) {
        const latest = subCreada.latest_invoice;
        const inv = (typeof latest === 'string' ? await stripe.invoices.retrieve(latest) : latest) as unknown as {
            id?: string;
            amount_paid?: number;
            lines?: { data?: Array<{ period?: { end?: number } }> };
        } | null;
        if (inv?.id && (inv.amount_paid ?? 0) > 0) {
            cobroInicial = { invoiceId: inv.id, montoCentavos: inv.amount_paid ?? 0, finPeriodo: unixAISO(inv.lines?.data?.[0]?.period?.end) };
        }
    }

    // Empuje de la cortesía del vendedor (Pieza 2): el próximo cobro = fin del periodo REAL que Stripe cobró
    // (+1 mes mensual / +1 año anual) + cortesía. Reusa el mismo helper de "Registrar pago" (trial_end
    // absoluto + proration 'none'); defensivo: si falla, el negocio ya cobró y el próximo cobro caería sin la
    // cortesía, sin romper nada.
    if (atribucion?.embajadorId && subCreada) {
        const diasCortesia = await obtenerConfigNumero('dias_cortesia_vendedor', 14);
        const finPeriodo = finPeriodoDeSuscripcion(subCreada);
        if (finPeriodo) {
            const proximo = new Date(finPeriodo);
            proximo.setDate(proximo.getDate() + diasCortesia);
            const empuje = await empujarCobroSuscripcion(session.subscription as string, proximo.toISOString());
            if (!empuje.ok) {
                console.error('⚠️ Cobro día-1: no se pudo empujar la cortesía del vendedor:', empuje.aviso);
            }
        }
    }

    // Sella ya las fechas del periodo (próximo cobro = fin del trial, o +cortesía si se empujó arriba)
    // leyéndolas de Stripe, sin esperar al asíncrono customer.subscription.updated → el "Próximo cobro"
    // se ve desde el alta.
    await sellarFechasPeriodoDesdeStripe(nuevoNegocio.id, session.subscription as string);

    // Cobro "día 1": registra el cobro inicial (bitácora + comisión + recibo) AHORA, tras sellar las fechas →
    // así `registrarCobroReal` toma `fecha_proximo_cobro` (con cortesía) como vigencia para el recibo y la
    // comisión. Idempotente por invoice.id: si el webhook también lo procesa, no duplica. No depende del
    // reintento del webhook (frágil en local).
    if (cobroInicial) {
        try {
            await registrarCobroReal({
                negocioId: nuevoNegocio.id,
                invoiceId: cobroInicial.invoiceId,
                montoCentavos: cobroInicial.montoCentavos,
                finPeriodo: cobroInicial.finPeriodo,
                clienteId: session.customer as string,
            });
            console.log(`💳 Cobro "día 1" registrado en el checkout: ${nuevoNegocio.id} (invoice ${cobroInicial.invoiceId})`);
        } catch (errCobro) {
            console.error('❌ Error registrando el cobro día-1 en el checkout:', errCobro);
        }
    } else {
        // Alta CON TRIAL (sin cobro hoy): registra el alta en la bitácora financiera y
        // envía el correo de bienvenida-trial (no se cobró nada + fecha del 1er cobro + cómo
        // cancelar). Ambos son defensivos: nunca deben romper el webhook ni forzar un reintento.
        await registrarEventoPago({
            negocioId: nuevoNegocio.id,
            tipo: 'alta_trial',
            origen: 'stripe',
            monto: null,                                    // el trial es $0
            stripeEventId: `alta_trial:${session.id}`,      // candado idempotente por checkout
        });

        try {
            const price = subCreada?.items?.data?.[0]?.price ?? null;
            const intervalo = price?.recurring?.interval;
            const { enviarEmailBienvenidaTrial } = await import('../utils/email.js');
            await enviarEmailBienvenidaTrial(nuevoUsuario.correo, nuevoUsuario.nombre, nombreNegocio, {
                finTrialIso: subCreada ? finPeriodoDeSuscripcion(subCreada) : null,
                montoCentavos: price?.unit_amount ?? null,
                intervalo: intervalo === 'year' ? 'year' : (intervalo === 'month' ? 'month' : null),
            });
            console.log(`📧 Correo de bienvenida-trial enviado: ${nuevoUsuario.correo}`);
        } catch (errMail) {
            console.error('❌ Error enviando correo de bienvenida-trial (no crítico):', errMail);
        }
    }

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

    // Atribución al vendedor: si el upgrade trajo un código de referido válido y activo, el negocio
    // queda con `embajadorId` → la comisión de alta se devenga sola en el 1er cobro (como el alta nueva).
    const atribucion = await resolverEmbajadorPorCodigo(metadata.codigoReferido);
    if (atribucion) console.log('🤝 Upgrade atribuido al embajador:', atribucion.embajadorId);

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
                // Si el upgrade trae un vendedor, (re)atribuye; si no, conserva el que ya tenía.
                embajadorId: atribucion ? atribucion.embajadorId : negocioPrevio.embajadorId,
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
                .values({ negocioId: nuevoNegocio.id, nombre: nombreNegocio || 'Mi Negocio', esPrincipal: true, activa: true })
                .returning();
        }
    } else {
        [nuevoNegocio] = await db
            .insert(negocios)
            .values({
                usuarioId: usuario.id,
                nombre: nombreNegocio || 'Mi Negocio',
                embajadorId: atribucion?.embajadorId ?? null, // vendedor que gestionó el upgrade
                esBorrador: true,
                verificado: false,
                participaPuntos: false,
            })
            .returning();
        console.log('✅ Negocio creado:', nuevoNegocio.id);

        [sucursalPrincipal] = await db
            .insert(negocioSucursales)
            .values({ negocioId: nuevoNegocio.id, nombre: nombreNegocio || 'Mi Negocio', esPrincipal: true, activa: true })
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

    // Cobro "día 1" del upgrade (trial=0 → cobra ya): lee el invoice inicial ANTES del empuje de cortesía
    // (el empuje puede mover el latest_invoice a un ajuste de $0). Igual que el alta nueva.
    let cobroInicial: { invoiceId: string; montoCentavos: number; finPeriodo: string | null } | null = null;
    let subUpgrade: Stripe.Subscription | null = null;
    try {
        subUpgrade = await stripe.subscriptions.retrieve(session.subscription as string, { expand: ['latest_invoice'] });
        const latest = subUpgrade.latest_invoice;
        const inv = (typeof latest === 'string' ? await stripe.invoices.retrieve(latest) : latest) as unknown as {
            id?: string; amount_paid?: number; lines?: { data?: Array<{ period?: { end?: number } }> };
        } | null;
        if (inv?.id && (inv.amount_paid ?? 0) > 0) {
            cobroInicial = { invoiceId: inv.id, montoCentavos: inv.amount_paid ?? 0, finPeriodo: unixAISO(inv.lines?.data?.[0]?.period?.end) };
        }
    } catch (errSub) {
        console.error('❌ Error leyendo la suscripción del upgrade:', errSub);
    }

    // Cortesía del vendedor (Pieza 2): si el upgrade trae vendedor y cobró día-1, empuja el próximo cobro
    // (+1 periodo real + cortesía), igual que el alta nueva. Defensivo: si falla, el cobro ya ocurrió.
    if (atribucion?.embajadorId && subUpgrade && cobroInicial) {
        const diasCortesia = await obtenerConfigNumero('dias_cortesia_vendedor', 14);
        const finPeriodo = finPeriodoDeSuscripcion(subUpgrade);
        if (finPeriodo) {
            const proximo = new Date(finPeriodo);
            proximo.setDate(proximo.getDate() + diasCortesia);
            const empuje = await empujarCobroSuscripcion(session.subscription as string, proximo.toISOString());
            if (!empuje.ok) console.error('⚠️ Upgrade día-1: no se pudo empujar la cortesía del vendedor:', empuje.aviso);
        }
    }

    // Sella ya las fechas del periodo (próximo cobro = fin del trial, o +cortesía si se empujó arriba)
    // leyéndolas de Stripe, igual que en el alta nueva → el "Próximo cobro" se ve desde el upgrade.
    await sellarFechasPeriodoDesdeStripe(nuevoNegocio.id, session.subscription as string);

    // Cobro "día 1": registra el cobro inicial (bitácora + comisión + recibo) tras sellar las fechas.
    // Idempotente por invoice.id. NO depende del reintento del webhook invoice.payment_succeeded (que en el
    // CLI local da 500 sin reintento) → resuelve el "no llegó recibo/correo/comisión" del upgrade con trial=0.
    if (cobroInicial) {
        try {
            await registrarCobroReal({
                negocioId: nuevoNegocio.id,
                invoiceId: cobroInicial.invoiceId,
                montoCentavos: cobroInicial.montoCentavos,
                finPeriodo: cobroInicial.finPeriodo,
                clienteId: session.customer as string,
            });
            console.log(`💳 Cobro "día 1" del upgrade registrado en el checkout: ${nuevoNegocio.id} (invoice ${cobroInicial.invoiceId})`);
        } catch (errCobro) {
            console.error('❌ Error registrando el cobro día-1 del upgrade:', errCobro);
        }
    }

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

            // El aviso al dueño NO se emite aquí: la cancelación deliberada (cancellation_requested) hoy SOLO
            // la origina `cancelarNegocio` (Panel), que ya notifica. Emitirlo también aquí lo DUPLICABA por
            // carrera (Panel y webhook llegan casi a la vez y el "borrar+crear" idempotente no es atómico).
            // Si a futuro hay cancelación externa con este motivo (Customer Portal), reactivar aquí (idealmente
            // con un lock de idempotencia para no volver a duplicar).

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
 * Error "esperado" que pide a Stripe REINTENTAR el webhook (no es un fallo real). El controller responde
 * 500 igual —para que Stripe reenvíe— pero se loguea como info (⏳) en vez de ❌. Caso típico: el cobro
 * "día 1" (Pieza 2) cuyo `invoice.payment_succeeded` llega antes de que checkout cree el negocio.
 */
export class WebhookReintentable extends Error {
    readonly reintentable = true;
    constructor(message: string) {
        super(message);
        this.name = 'WebhookReintentable';
    }
}

/**
 * Registra un cobro REAL (monto > 0) en el sistema: sella "Cliente desde", apunta la bitácora financiera,
 * devenga la comisión del vendedor (alta + recurrente) y emite el recibo (PDF + correo). IDEMPOTENTE por
 * `invoiceId` (guard + UNIQUE de stripe_event_id): si ese invoice ya se registró —lo procesó el checkout al
 * crear el negocio O un webhook `invoice.payment_succeeded`— no repite nada. Desacopla el registro del cobro
 * del REINTENTO del webhook (frágil: en local el Stripe CLI no reintenta los 500), así el cobro "día 1"
 * (Pieza 2) queda registrado SIEMPRE, lo procese el checkout o el webhook (gana el primero).
 */
export async function registrarCobroReal(opts: {
    negocioId: string;
    invoiceId: string;
    montoCentavos: number;
    finPeriodo: string | null;
    clienteId: string | null;
}): Promise<void> {
    const { negocioId, invoiceId, montoCentavos, finPeriodo, clienteId } = opts;
    const monto = montoCentavos / 100;

    // CANDADO ATÓMICO de idempotencia: insertar la fila de bitácora ES el cerrojo. El INSERT con
    // onConflictDoNothing sobre stripe_event_id (=invoiceId) solo "gana" una vez; si NO gana, este
    // invoice ya lo registró otro proceso (o un reintento) → abortamos ANTES de comisión/recibo. Esto
    // reemplaza el viejo SELECT-luego-INSERT, que tenía una race entre checkout.session.completed e
    // invoice.payment_succeeded (mismo invoice, casi simultáneos) → ambos pasaban el SELECT y emitían
    // DOS recibos. Por eso la bitácora se registra ARRIBA (antes era el penúltimo paso).
    const gane = await registrarEventoPago({
        negocioId,
        tipo: 'cobro_exitoso',
        origen: 'stripe',
        monto,
        fechaEvento: new Date().toISOString(),
        stripeEventId: invoiceId,
        metadata: { customerId: clienteId, finPeriodo, invoiceId },
    });
    if (!gane) return;

    // VIGENCIA real = hasta cuándo está cubierto el negocio (lo que el cliente ve "activa hasta" en el recibo
    // y el periodo que cubre la comisión): el fin facturado por Stripe MÁS la cortesía del vendedor en el
    // PRIMER cobro. Se calcula de forma determinista (NO depende del orden del sellado de fechas, que es
    // asíncrono): la fecha más lejana entre el próximo cobro ya sellado y (fin facturado + cortesía).
    const [neg] = await db
        .select({
            embajadorId: negocios.embajadorId,
            proximoCobro: negocios.fechaProximoCobro,
            devengadaHasta: negocios.comisionDevengadaHasta,
        })
        .from(negocios)
        .where(eq(negocios.id, negocioId))
        .limit(1);
    let coberturaHasta = neg?.proximoCobro ?? finPeriodo;
    // Primer cobro de una venta por vendedor (sin marcador de devengo aún) → regala la cortesía ENCIMA del
    // periodo facturado.
    if (neg?.embajadorId && !neg.devengadaHasta && finPeriodo) {
        const diasCortesia = await obtenerConfigNumero('dias_cortesia_vendedor', 14);
        const conCortesia = new Date(finPeriodo);
        conCortesia.setDate(conCortesia.getDate() + diasCortesia);
        if (!coberturaHasta || conCortesia.getTime() > new Date(coberturaHasta).getTime()) {
            coberturaHasta = conCortesia.toISOString();
        }
    }

    // "Cliente desde": sella la fecha del PRIMER cobro real (COALESCE → solo la 1ª vez). Necesario para que
    // la comisión de alta se devengue (depende de fecha_primer_pago).
    await db
        .update(negocios)
        .set({ fechaPrimerPago: sql`COALESCE(${negocios.fechaPrimerPago}, (now() AT TIME ZONE 'America/Hermosillo')::date)` })
        .where(eq(negocios.id, negocioId));

    // (La bitácora financiera ya se registró ARRIBA, como candado atómico de idempotencia.)

    // Comisión del vendedor: alta (pago único) + recurrente AL COBRO. Best-effort + idempotente.
    try {
        const { devengarComisionAlta, devengarComisionRecurrenteAlCobro } = await import('./admin/comisiones-devengo.service.js');
        await devengarComisionAlta(negocioId);
        if (coberturaHasta) {
            await devengarComisionRecurrenteAlCobro(negocioId, coberturaHasta, monto);
        }
    } catch (errCom) {
        console.error('❌ Error devengando comisiones del cobro:', errCom);
    }

    // Comprobante (recibo PDF con folio correlativo + correo al dueño), mismo flujo que un pago manual.
    // Best-effort: si falla, el cobro ya quedó registrado arriba.
    try {
        // Meses cubiertos por el dinero (= monto ÷ precio mensual): 1 en mensual, 10 en anual. Llena el
        // campo "Periodo" del recibo (antes quedaba vacío en el cobro con tarjeta).
        const precioMensual = await obtenerConfigNumero('precio_membresia_mxn', 849);
        const mesesCubiertos = precioMensual > 0 ? Math.max(1, Math.round(monto / precioMensual)) : null;
        const [pagoTarjeta] = await db
            .insert(pagosMembresia)
            .values({
                negocioId,
                concepto: 'tarjeta',
                monto: String(monto),
                mesesCubiertos,
                periodoHasta: coberturaHasta ?? new Date().toISOString(),
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
        console.error('❌ Error emitiendo el comprobante del cobro con tarjeta:', errRecibo);
    }
}

/**
 * invoice.payment_succeeded — la renovación (o el primer cobro tras el trial) se cobró.
 * Estado → al_corriente. Actualiza vencimiento/próximo cobro y LIMPIA las fechas de gracia.
 */
async function manejarRenovacionPagada(invoice: Stripe.Invoice, eventId?: string): Promise<void> {
    try {
        // Acceso defensivo (API 2025-11 clover: algunos campos se movieron de lugar).
        const inv = invoice as unknown as {
            id?: string;
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
            // Cobro "día 1" (Pieza 2): el invoice.payment_succeeded puede llegar ANTES de que
            // checkout.session.completed haya creado el negocio (Stripe no garantiza el orden). Si es un
            // cobro REAL (monto>0) sin negocio aún, LANZAMOS para que Stripe reintente: en el reintento
            // (segundos después) el negocio ya existirá y se registrarán el cobro + la comisión de alta +
            // el recibo. El throw es ANTES de cualquier escritura → sin inserciones parciales; la
            // idempotencia por stripe_event_id evita duplicar. Un invoice de $0 (trial) sin negocio se ignora.
            if (esCobroReal) {
                throw new WebhookReintentable(`Cobro "día 1" recibido antes de crear el negocio (cliente ${clienteId}); Stripe reintentará en segundos.`);
            }
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
                // Solo AVANZAR la vigencia, nunca retroceder: en el cobro "día 1" (Pieza 2) el
                // invoice.payment_succeeded trae period.end = +1 mes, pero la sub ya quedó empujada a
                // +44d (mes + cortesía). Si este webhook se procesara DESPUÉS del empuje, sin GREATEST
                // pisaría el +44d con +1 mes (perdiendo la cortesía). Un pago nunca acorta la vigencia →
                // GREATEST lo blinda. (En renovaciones normales el period.end es futuro y mayor, así que
                // GREATEST = avanzar; también protege los pagos adelantados de "Registrar pago".)
                fechaVencimiento: sql`GREATEST(${negocios.fechaVencimiento}, ${finPeriodo}::timestamptz)`,
                fechaProximoCobro: sql`GREATEST(${negocios.fechaProximoCobro}, ${finPeriodo}::timestamptz)`,
                fechaInicioGracia: null,
                fechaLimiteGracia: null,
                // "Cliente desde": sella la fecha del PRIMER cobro real (COALESCE → solo la 1ª vez).
                ...(esCobroReal ? { fechaPrimerPago: sql`COALESCE(${negocios.fechaPrimerPago}, (now() AT TIME ZONE 'America/Hermosillo')::date)` } : {}),
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, res.negocio.id));

        console.log(`✅ Renovación pagada → al_corriente: ${res.negocio.nombre} (vence ${finPeriodo})`);

        // Registra el cobro REAL (monto>0): bitácora financiera + comisión + recibo. IDEMPOTENTE por
        // invoice.id (puede haberlo registrado ya el checkout en el cobro "día 1"). El invoice de $0 del
        // trial NO es un movimiento de dinero → no entra.
        if (esCobroReal && inv.id) {
            await registrarCobroReal({
                negocioId: res.negocio.id,
                invoiceId: inv.id,
                montoCentavos: inv.amount_paid ?? 0,
                finPeriodo,
                clienteId,
            });
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
        // Carrera esperada (cobro día-1 antes del alta): no es un fallo, solo pide reintento.
        if (error instanceof WebhookReintentable) {
            console.log(`⏳ ${error.message}`);
        } else {
            console.error('❌ Error en manejarRenovacionPagada:', error);
        }
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
            // Aviso in-app al dueño (personal, best-effort): membresía venció → periodo de gracia.
            await notificarMembresiaEnGracia(res.negocio.id);
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
                // GREATEST: este handler es un ECO de cualquier cambio de la sub; nunca debe RETROCEDER la
                // vigencia ya pagada (OBS-10: un cobro adelantado traía un period.end menor y la pisaba).
                // Mismo blindaje que manejarRenovacionPagada. Los retrocesos LEGÍTIMOS (anular/registrar pago)
                // los escribe directo la acción del Panel ANTES de este eco, así que GREATEST no los bloquea.
                fechaVencimiento: sql`GREATEST(${negocios.fechaVencimiento}, ${finPeriodo}::timestamptz)`,
                fechaProximoCobro: sql`GREATEST(${negocios.fechaProximoCobro}, ${finPeriodo}::timestamptz)`,
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
    crearCheckoutActivarTarjeta,
    procesarWebhook,
    verificarSession,
    validarCodigoReferido,
    obtenerNegocioArchivadoDelUsuario,
};