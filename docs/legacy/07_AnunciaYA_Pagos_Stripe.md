# 💳 AnunciaYA v3.0 - Sistema de Pagos (Stripe)

**Estado:** ✅ Implementado  
**Fecha de Actualización:** 18 Diciembre 2024

---

## 1. Objetivo

Implementar pagos con Stripe para:
- **Registro comercial:** Plan Comercial AnunciaYA ($449 MXN/mes)
- Códigos promocionales (descuentos en el registro)

---

## 2. Configuración de Stripe

### 2.1 Variables de Entorno

**Backend (apps/api/.env):**
```env
STRIPE_SECRET_KEY=sk_test_51S9HijDbqVqWBiz7kGhzWtbUwZfCKvJHvlxMdnLmS8AZTR6M0hyQmv6LpO0NKYKLleDqCXcl59LtMaRLt7CQcCl3003vPPWgPD
STRIPE_WEBHOOK_SECRET=whsec_cb0be8a2dd9556a2b60e2e2668e0d64d7ec08f56b29ca6a600ddddc1cfb5b5a4
STRIPE_PRICE_COMERCIAL=price_1Sf12uDbqVqWBiz7MiS6oppo
```

**Frontend (apps/web/.env):**
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51S9HijDbqVqWBiz7vBTZ33dTgHcUm2gKm0WxKTuZnHGvO3ZHoIwoDhfwUGB4UfZ62hAiv2G2lgxL9BV1XOesIjie00YLAkxnkc
```

### 2.2 Producto en Stripe Dashboard

| Producto | Product ID | Price ID | Precio | Recurrencia |
|----------|------------|----------|--------|-------------|
| Plan Comercial AnunciaYA | prod_TcFY6kI9RIuCf1 | price_1Sf12uDbqVqWBiz7MiS6oppo | $449 MXN | Mensual |

---

## 3. Arquitectura de Pagos (Registro Comercial)

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUJO DE REGISTRO COMERCIAL                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (/registro?tipo=comercial)                        │
│  ───────────────────────────────────                        │
│  1. Usuario completa formulario comercial                   │
│  2. POST /api/pagos/crear-sesion-registro                   │
│     ↓                                                       │
│  Backend                                                    │
│  ───────                                                    │
│  3. Guardar datos temporales en Redis                       │
│  4. Crear Checkout Session en Stripe ($449 MXN)             │
│  5. Retornar sessionId                                      │
│     ↓                                                       │
│  Frontend                                                   │
│  ─────────                                                  │
│  6. Redirigir a Stripe Checkout                             │
│  7. Usuario completa pago                                   │
│     ↓                                                       │
│  Stripe                                                     │
│  ──────                                                     │
│  8. Envía webhook a /api/pagos/webhook                      │
│     ↓                                                       │
│  Backend                                                    │
│  ───────                                                    │
│  9. Procesar evento (checkout.session.completed)            │
│  10. Recuperar datos de Redis                               │
│  11. Crear usuario + negocio en BD                          │
│  12. Limpiar datos temporales                               │
│     ↓                                                       │
│  Frontend (/registro-exito)                                 │
│  ──────────────────────────                                 │
│  13. Mostrar página de éxito con login automático           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Endpoints de Pagos

### 4.1 Rutas

```typescript
// routes/pago.routes.ts
import { Router } from 'express';
import express from 'express';
import {
  crearSesionCheckout,
  webhookStripe,
  obtenerSuscripcion,
  cancelarSuscripcion,
} from '../controllers/pago.controller.js';

const router = Router();

// Webhook (sin auth, validación por firma de Stripe)
router.post('/webhook', express.raw({ type: 'application/json' }), webhookStripe);

// Crear sesión para registro comercial (sin auth, es pre-registro)
router.post('/crear-sesion-registro', crearSesionCheckout);

// Protegidos (requieren usuario autenticado)
// router.use(verificarToken);
// router.get('/suscripcion', obtenerSuscripcion);
// router.post('/cancelar', cancelarSuscripcion);

export default router;
```

### 4.2 Crear Sesión de Checkout (Registro Comercial)

```typescript
// controllers/pago.controller.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function crearSesionCheckout(req: Request, res: Response) {
  const { datosRegistro, codigoPromocion } = req.body;

  // Guardar datos temporales en Redis (expiran en 1 hora)
  const registroId = crypto.randomUUID();
  await redis.setex(
    `registro_comercial:${registroId}`,
    3600,
    JSON.stringify(datosRegistro)
  );

  // Crear sesión de Stripe
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: datosRegistro.correo,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_COMERCIAL!, // price_1Sf12uDbqVqWBiz7MiS6oppo
        quantity: 1,
      },
    ],
    metadata: {
      registroId,
      esRegistroGoogle: datosRegistro.esRegistroGoogle || false,
    },
    success_url: `${process.env.FRONTEND_URL}/registro-exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/registro?tipo=comercial`,
  };

  // Aplicar código promocional si existe
  if (codigoPromocion) {
    const promocion = await buscarPromocion(codigoPromocion);
    if (promocion && promocion.stripe_coupon_id) {
      sessionConfig.discounts = [{ coupon: promocion.stripe_coupon_id }];
    }
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);

  res.json({
    exito: true,
    datos: { sessionId: session.id },
  });
}
```

### 4.3 Webhook Handler

```typescript
export async function webhookStripe(req: Request, res: Response) {
  const sig = req.headers['stripe-signature']!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Procesar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      await procesarCheckoutCompletado(event.data.object);
      break;
      
    case 'invoice.paid':
      await procesarPagoRecurrente(event.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await procesarCancelacion(event.data.object);
      break;
      
    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  res.json({ received: true });
}

async function procesarCheckoutCompletado(session: Stripe.Checkout.Session) {
  const registroId = session.metadata?.registroId;
  const esRegistroGoogle = session.metadata?.esRegistroGoogle === 'true';

  // Recuperar datos de Redis
  const datosJson = await redis.get(`registro_comercial:${registroId}`);
  if (!datosJson) {
    console.error('Datos de registro no encontrados en Redis');
    return;
  }

  const datosRegistro = JSON.parse(datosJson);

  // Crear usuario comercial
  const [nuevoUsuario] = await db.insert(usuarios).values({
    nombre: datosRegistro.nombre,
    apellidos: datosRegistro.apellidos,
    correo: datosRegistro.correo,
    contrasenaHash: esRegistroGoogle ? null : datosRegistro.contrasenaHash,
    telefono: datosRegistro.telefono,
    perfil: 'comercial',
    correoVerificado: true,
    autenticadoPorGoogle: esRegistroGoogle,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: session.subscription as string,
  }).returning();

  // Crear negocio asociado
  await db.insert(negocios).values({
    usuarioId: nuevoUsuario.id,
    nombre: datosRegistro.nombreNegocio,
    estado: 'pendiente_completar', // Falta completar onboarding
  });

  // Limpiar datos temporales
  await redis.del(`registro_comercial:${registroId}`);

  console.log(`✅ Usuario comercial creado: ${nuevoUsuario.id}`);
}
```

---

## 5. Frontend - Integración

### 5.1 Uso en Registro Comercial

El pago de Stripe se integra en el flujo de registro comercial:

```tsx
// En PaginaRegistro.tsx (flujo comercial)
import { loadStripe } from '@stripe/stripe-js';
import { api } from '../../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Después de validar datos del formulario comercial
async function procesarRegistroComercial(datosFormulario: DatosRegistro) {
  try {
    // 1. Guardar datos temporales en Redis
    const response = await api.post('/pagos/crear-sesion-registro', {
      ...datosFormulario,
      priceId: import.meta.env.VITE_STRIPE_PRICE_COMERCIAL || 'price_1Sf12uDbqVqWBiz7MiS6oppo',
    });

    if (response.data.exito) {
      // 2. Redirigir a Stripe Checkout
      const stripe = await stripePromise;
      await stripe?.redirectToCheckout({
        sessionId: response.data.datos.sessionId,
      });
    }
  } catch (error) {
    Swal.fire('Error', 'No se pudo iniciar el proceso de pago', 'error');
  }
}
```

### 5.2 Plan Comercial

| Característica | Valor |
|----------------|-------|
| **Nombre** | Plan Comercial AnunciaYA |
| **Precio** | $449 MXN/mes |
| **Price ID** | price_1Sf12uDbqVqWBiz7MiS6oppo |
| **Incluye** | Perfil de negocio, ScanYA, Business Studio, publicación de ofertas |
```

---

## 6. Stripe CLI (Desarrollo)

### 6.1 Instalación

```bash
# Windows (si no está instalado)
# Descargar desde: https://github.com/stripe/stripe-cli/releases
# Extraer a C:\stripe-cli\

# Agregar al PATH
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\stripe-cli", "Machine")
```

### 6.2 Comandos

```bash
# Login (una vez)
stripe login

# Escuchar webhooks en desarrollo
stripe listen --forward-to localhost:4000/api/pagos/webhook

# Esto muestra:
# > Ready! Your webhook signing secret is whsec_xxxxx
# (Copiar este valor a STRIPE_WEBHOOK_SECRET en .env)
```

### 6.3 Probar Webhooks

```bash
# Simular evento
stripe trigger checkout.session.completed

# Ver logs
stripe logs tail
```

---

## 7. Códigos Promocionales

### 7.1 Estructura en BD

```sql
-- Tabla promociones_temporales
CREATE TABLE promociones_temporales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo_descuento VARCHAR(30), -- porcentaje, fijo, meses_gratis
  valor_descuento DECIMAL(10,2),
  stripe_coupon_id VARCHAR(100), -- ID del cupón en Stripe
  fecha_inicio TIMESTAMP,
  fecha_fin TIMESTAMP,
  max_usos_totales INTEGER,
  usos_actuales INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true
);
```

### 7.2 Crear Cupón en Stripe

```typescript
async function crearCuponStripe(promocion: PromocionTemporal) {
  const coupon = await stripe.coupons.create({
    percent_off: promocion.valor_descuento,
    duration: 'once', // o 'repeating', 'forever'
    name: promocion.codigo,
  });

  // Guardar stripe_coupon_id en BD
  await db
    .update(promociones_temporales)
    .set({ stripe_coupon_id: coupon.id })
    .where(eq(promociones_temporales.id, promocion.id));

  return coupon;
}
```

---

## 8. Tarjetas de Prueba

| Número | Resultado |
|--------|-----------|
| 4242 4242 4242 4242 | Éxito |
| 4000 0000 0000 0002 | Rechazada |
| 4000 0000 0000 3220 | Requiere 3D Secure |

**Datos adicionales:**
- Fecha: Cualquier fecha futura
- CVC: Cualquier 3 dígitos
- ZIP: Cualquier código postal

---

## 9. Checklist de Producción

- [ ] Cambiar a claves de producción (sk_live_, pk_live_)
- [ ] Configurar webhook en Stripe Dashboard
- [ ] Verificar dominio en Stripe
- [ ] Configurar impuestos si aplica
- [ ] Implementar emails de confirmación
- [ ] Agregar página de historial de pagos
- [ ] Implementar cancelación desde la app
- [ ] Manejar actualizaciones de tarjeta

---

## 10. Eventos de Webhook Manejados

| Evento | Acción |
|--------|--------|
| `checkout.session.completed` | Activar suscripción |
| `invoice.paid` | Registrar pago recurrente |
| `invoice.payment_failed` | Notificar al usuario |
| `customer.subscription.deleted` | Revocar acceso |
| `customer.subscription.updated` | Actualizar plan |

---

*Documento actualizado: 18 Diciembre 2024*
