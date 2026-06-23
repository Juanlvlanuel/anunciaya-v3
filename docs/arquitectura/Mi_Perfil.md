# Mi Perfil — Cuenta del usuario (Modo Personal)

> **Estado:** 🟡 **PLANEADO (feature futuro, no construido).** Este documento existe para no perder el
> alcance acordado. La sección de **Membresía / Pagos** del perfil personal nace aquí y reúne tres piezas
> que venían sueltas de la ronda de Stripe ([`Panel_Admin/Ronda_Pruebas_Pagos.md`](Panel_Admin/Ronda_Pruebas_Pagos.md)).
>
> **Última actualización:** 23 Junio 2026.

---

## Qué es

La página de **cuenta/perfil del usuario** en su **Modo Personal** (`apps/web`, FUERA de Business Studio).
Entre sus secciones tendrá una de **Membresía / Pagos** donde el usuario ve el estado de su membresía
comercial y **puede pagar / regularizar / reactivar** su suscripción.

## Por qué va en Modo Personal (y NO en Business Studio)

Cuando un negocio se **suspende o cancela**, el dueño **baja a Modo Personal** y pierde acceso a Business
Studio. Si la página para pagar/regularizar viviera dentro de BS, un suspendido nunca podría llegar a ella
(pez que se muerde la cola). Ponerla en la cuenta **Personal** es justo lo que permite que alguien
suspendido se reactive. Reusa las 5 columnas de estado de membresía que ya existen en `negocios`.

---

## Alcance de la sección Membresía / Pagos

Tres piezas en un mismo lugar:

| # | Pieza | Qué hace | Origen | Estado |
|---|---|---|---|:--:|
| 1 | **Vista de membresía** | Estado (al corriente / gracia / suspendido), próximo cobro, historial de pagos y recibos descargables. El negocio como auditor de su propia cuenta. | PENDIENTES_PanelAdmin §Suscripciones | 🟡 |
| 2 | **Recuperar tarjeta** (Z3 → cierra **B2**) | Botón *"Actualizar tarjeta y reintentar pago"* → **Customer Portal de Stripe** (`stripe.billingPortal.sessions.create`). Resuelve el hueco del **moroso de tarjeta que hoy no se recupera solo**. | Ronda Stripe B2 / Z3 | 🟡 |
| 3 | **Pago manual** (Z4) | Datos para **transferencia / depósito** a una cuenta-tarjeta de AnunciaYA + **subir comprobante** → un admin lo verifica y registra (reusa `registrarPagoManual`). Los datos de cobro son **configurables desde el Panel**. | Ronda Stripe Z4 | 🟡 |

### Distinción importante entre las piezas 2 y 3

Ambas viven en la misma sección pero son flujos distintos:

- **Pieza 2 (tarjeta, Z3):** el usuario YA paga con tarjeta recurrente de Stripe; su tarjeta falló y quiere
  **actualizarla + reintentar** el cobro él mismo. Autoservicio vía Stripe, sin intervención del admin.
- **Pieza 3 (manual, Z4):** el usuario NO quiere tarjeta recurrente; **deposita/transfiere** y sube
  comprobante. Requiere **verificación del admin** antes de marcar el pago. NO usa el Portal.

> **Por qué NO se integran OXXO/SPEI de Stripe:** OXXO no admite suscripción recurrente. En su lugar va el
> pago manual con comprobante de la pieza 3.

---

## Cómo se recupera HOY un moroso (mientras esto no exista)

- **Pago por otro medio (efectivo/transferencia):** un admin/vendedor entra al Panel → ficha del negocio →
  **Registrar pago** → vuelve a `al_corriente`. ✅ Ya funciona (validado en la ronda, G3).
- **Tarjeta, autoservicio del dueño:** ❌ no hay forma dentro de la app. Depende de que el admin lo recupere
  manual o de los emails de reintento de Stripe (fuera de AnunciaYA). **Este es el hueco que cierra la pieza 2.**

Para la **beta (50 negocios)** el acompañamiento manual basta; el autoservicio es comodidad y escala.

---

## Referencias

- [`Panel_Admin/Ronda_Pruebas_Pagos.md`](Panel_Admin/Ronda_Pruebas_Pagos.md) — de donde vienen B2, Z3, Z4
  (ronda de Stripe, cerrada el 23 jun; estos pendientes se trasladaron aquí).
- [`Pagos_Suscripciones.md`](Pagos_Suscripciones.md) — backend de membresía: webhook, estados, gracia.
- [`reportes/PENDIENTES_PanelAdmin.md`](../reportes/PENDIENTES_PanelAdmin.md) — §Suscripciones (visibilidad del
  estado de membresía en la página de cuenta) y §efectivo (verificación del admin).
- [`MenuDrawer.md`](MenuDrawer.md) — drawer de perfil del usuario (punto de entrada a esta página).
