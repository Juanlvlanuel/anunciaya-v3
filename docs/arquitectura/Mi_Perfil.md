# Mi Perfil — Cuenta del usuario (Modo Personal)

> **Estado:** ✅ **CONSTRUIDO y validado E2E (27 Junio 2026).** La página de Mi Perfil (Modo Personal)
> existe con su sección **Membresía / Pagos** completa: vista de membresía + recibos, recuperar tarjeta
> (Customer Portal), pago manual con comprobante (cola de verificación en el Panel) y **cambio
> bidireccional de método de cobro** (tarjeta ↔ transferencia). Era el único hueco de cara a la beta.
>
> **Última actualización:** 27 Junio 2026.

---

## Qué es

La página de **cuenta/perfil del usuario** en su **Modo Personal** (`apps/web`, FUERA de Business Studio),
en la ruta `/perfil`. Header con el patrón de las demás secciones (CardYA, Mis Guardados) + tabs tipo chip:

- **Datos Personales** 🟡 placeholder "Próximamente".
- **Seguridad** 🟡 placeholder "Próximamente".
- **Membresía y Pagos** ✅ funcional (abre por defecto en este tab).

> Antes de esto, `/perfil` renderizaba por error el perfil del **negocio** de Business Studio. Se cableó a
> la nueva `PaginaPerfilPersonal`. En móvil, `/perfil` se sumó a `esPaginaConHeaderPropio` en `MainLayout`
> (un solo header + el bottom nav se oculta con el scroll, como las demás secciones).

## Por qué va en Modo Personal (y NO en Business Studio)

Cuando un negocio se **suspende o cancela**, el dueño **baja a Modo Personal** y pierde acceso a Business
Studio. Si la página para pagar/regularizar viviera dentro de BS, un suspendido nunca podría llegar a ella.
Ponerla en la cuenta **Personal** es lo que permite que alguien suspendido se reactive. Reusa las columnas de
estado de membresía que ya existen en `negocios`.

---

## Sección Membresía / Pagos — alcance construido

| # | Pieza | Qué hace | Estado |
|---|---|---|:--:|
| 1 | **Vista de membresía** | Estado (al corriente / pago pendiente / suspendido / cancelado), método de cobro, próximo cobro o fecha límite de gracia, "Cliente desde", logo del negocio, e **historial de recibos descargables** (PDF). | ✅ |
| 2 | **Recuperar tarjeta** (Customer Portal) | Botón que abre `stripe.billingPortal.sessions.create` para actualizar la tarjeta y pagar la factura pendiente. Copy ramificado: "Actualizar tarjeta y reintentar pago" (urgente, dark gradient) / "Administrar tarjeta" (al corriente). | ✅ |
| 3 | **Pago manual** con comprobante | Datos de depósito (banco/CLABE/cuenta/**tarjeta OXXO**) + el dueño elige **meses completos** (el monto se autocalcula = meses × precio) + sube comprobante (R2) → crea una **solicitud** que un admin verifica en el Panel. | ✅ |
| 4 | **Cambio de método de cobro** | Bidireccional: **Cancelar cobro automático** (tarjeta → manual) y **Activar pago con tarjeta** (manual → tarjeta). Respeta la vigencia. | ✅ |

---

## Arquitectura

### Tabla nueva

`pagos_manuales_solicitudes` (cola de verificación del pago manual): `negocio_id`, `usuario_id`, `monto`,
`meses_declarados`, `referencia`, `nota`, `comprobante_url`, `estado` (pendiente/aprobado/rechazado),
`revisado_por`, `revisado_at`, `motivo_rechazo`, `pago_membresia_id` (FK al recibo generado al aprobar).
Migración `docs/migraciones/2026-06-27-pagos-manuales-solicitudes.sql`. `comprobante_url` está en el
`IMAGE_REGISTRY` (el Recolector R2 no la trata como huérfana).

### Configuración

- `datos_cobro_manual` (JSON en `configuracion_sistema`): `{ banco, titular, clabe, cuenta, tarjeta, instrucciones }`.
  Lo edita el super desde el Panel (Suscripciones → Datos de depósito); el dueño los ve en `/perfil`.
- `precio_membresia_mxn`: precio mensual usado para autocalcular el total del pago manual.

### Backend

| Archivo | Rol |
|---|---|
| `services/membresia.service.ts` | Lado del dueño: `obtenerMiMembresia` (estado + recibos), `descargarMiRecibo`, `crearSesionPortal`, `obtenerDatosCobroConPrecio`, `generarUrlComprobante` (presigned R2), `crearSolicitudPagoManual`, `cambiarAPagoManual`. |
| `services/pago.service.ts` | `crearCheckoutActivarTarjeta` (manual → tarjeta, con `trial_end` = vigencia) + `manejarActivacionTarjeta` (webhook `checkout.session.completed` tipo `activar_tarjeta`). |
| `services/admin/pagos-manuales-cola.service.ts` | Lado admin: `listarSolicitudesPendientes` (alcance por rol/región), `aprobarSolicitud` (reusa `marcarPagado`), `rechazarSolicitud`, `obtenerDatosCobroAdmin`, `guardarDatosCobro`. |
| `controllers/pago.controller.ts` · `routes/pago.routes.ts` | Endpoints del dueño (ver abajo). |
| `controllers/admin/pagos-manuales-cola.controller.ts` · `routes/admin/suscripciones.routes.ts` | Endpoints del Panel (cola + datos de cobro). |

### Frontend

- **Web (dueño):** `pages/private/perfil/PaginaPerfilPersonal.tsx` + `components/SeccionPagoManual.tsx`;
  `services/membresiaService.ts`; `hooks/queries/useMiMembresia.ts`; key `queryKeys.membresia`.
- **Panel:** `components/suscripciones/SeccionSuscripciones.tsx` (3 pestañas: Bitácora · **Por verificar** ·
  **Datos de depósito**), `PestanaPorVerificar.tsx`, `PestanaDatosCobro.tsx`, `DialogoAprobarSolicitud.tsx`;
  `services/suscripcionesService.ts`; `hooks/queries/useSuscripcionesAdmin.ts`.

### Endpoints

**Dueño** (`/api/pagos`, auth):
`GET /mi-membresia` · `GET /mi-recibo/:id/descargar` · `POST /portal` · `GET /datos-cobro` ·
`POST /comprobante/url-subida` · `POST /solicitud-pago-manual` · `POST /cambiar-a-manual` · `POST /cambiar-a-tarjeta`.

**Panel** (`/api/admin/suscripciones`, super+gerente; PUT datos-cobro solo super):
`GET /solicitudes` · `POST /solicitudes/:id/aprobar` · `POST /solicitudes/:id/rechazar` · `GET|PUT /datos-cobro`.

---

## Reglas de negocio clave

- **Aprobar pago manual** reusa `marcarPagado` (`negocios-acciones.service.ts`): activa el negocio, **acumula**
  los meses sobre la vigencia vigente (no la reemplaza), genera el recibo PDF (folio continuo) y, si el negocio
  tiene tarjeta, **empuja el `trial_end`** de Stripe → la tarjeta retoma después. El monto/meses los confirma el admin.
- **Pago manual = meses completos**, no monto libre: el total = `meses × precio_membresia_mxn` (autocalculado en el front).
- **Cancelar cobro automático (tarjeta → manual):** se limpia `usuarios.stripe_subscription_id` **ANTES** de
  cancelar en Stripe, para que el webhook `subscription.deleted` no encuentre el negocio y **NO lo archive**
  (solo cancelar desde el Panel archiva). **No toca `fecha_vencimiento`** → respeta lo pagado. Al vencer, el cron
  `expirarManualesVencidos` aplica la **misma gracia** que tarjeta (`periodo_gracia_cobro_dias`).
- **Activar pago con tarjeta (manual → tarjeta):** Checkout con `trial_end = fecha_vencimiento` si es futura
  (no cobra ya; el primer cargo cae al vencer lo pagado); si está vencido/suspendido, **cobro inmediato**. El
  webhook `activar_tarjeta` asocia la suscripción al negocio existente (no crea negocio).
- **Anti-huérfanas R2:** el comprobante se borra de R2 al Cancelar/Quitar (`useR2Upload.reset`) y al **desmontar**
  el componente sin enviar (cleanup); el endpoint `DELETE /r2/imagen` valida reference-count antes de borrar.

---

## Pendientes / mejoras

- **PROD:** correr la migración `2026-06-27-pagos-manuales-solicitudes.sql`, configurar los datos de depósito
  en el Panel live y el Customer Portal en Stripe live.
- **Datos Personales** y **Seguridad**: tabs aún en placeholder (avatar/datos, contraseña/2FA).
- **Aviso por correo al dueño** cuando se **rechaza** un pago manual (hoy solo cambia el estado).
- **Humanizar** en el módulo Auditoría las acciones nuevas (`pago_manual_aprobar/rechazar`, `datos_cobro_actualizar`).

## Referencias

- [`Pagos_Suscripciones.md`](Pagos_Suscripciones.md) — webhook, estados, gracia, `marcarPagado`.
- [`Panel_Admin/Ronda_Pruebas_Pagos.md`](Panel_Admin/Ronda_Pruebas_Pagos.md) — de donde venían B2/Z3/Z4 (ya implementados aquí).
