# Negocios — Pendientes (checklist único de la pantalla)

> **Qué es este documento:** la **única fuente de verdad** de lo que falta por hacer en la
> **pantalla Negocios** del Panel Admin. Es el mapa de trabajo del módulo.
>
> **Documento hermano:** [`Negocios.md`](Negocios.md) describe **qué ES y cómo funciona**
> (lo ya construido). Este describe **qué FALTA**.
>
> **Regla de oro (para que no se desfasen):** cuando un pendiente de aquí se termina, se
> **borra de este checklist** y, si cambió el comportamiento del módulo, se documenta en
> `Negocios.md`. El historial de lo ya cerrado vive en `CHANGELOG.md` y `PENDIENTES_PanelAdmin.md`.
>
> **Alcance:** SOLO la pantalla Negocios (lista, ficha, las 6 acciones, alta manual). El
> **motor de venta en efectivo** (corte de caja, comisiones, robo invisible) NO entra aquí —
> ver §Fuera de alcance.
>
> **Leyenda:** 🟡 importante · 🟢 mejora · ⬜ por hacer
>
> **Última actualización:** 10 Junio 2026 — módulo **verificado de punta a punta** (incluida la
> consistencia Cancelar↔webhook, descartada con datos reales); checklist adelgazado al backlog menor.

---

## Estado del módulo

**Completo, en producción y verificado de punta a punta (10 jun 2026).** Lista, ficha, sucursales,
historial de pagos (paginado), alcance por rol, filtro global de región, las **6 acciones** (registrar
pago · pausar · reactivar · reasignar · cancelar · editar correo) y el **alta manual** funcionan,
cuadran con `Negocios.md` y se **verificaron con datos reales** (acciones de tarjeta contra Stripe
real). Lo de abajo son **3 pendientes menores de backlog** — bajo impacto; uno (monto read-only) está
**bloqueado** hasta que exista la variable de precio configurable en el Panel.

---

## Backlog menor (bajo impacto, sin prisa)

- [ ] 🟡 **Regularizar pago de tarjeta morosa desde "Marcar pagado".** Hoy, si un negocio de
  tarjeta está en gracia/suspendido, "Marcar pagado" devuelve **409** (bien manejado: la ficha
  deshabilita el botón con tooltip). Stripe ya reintenta los cobros solo (dunning), así que rara vez
  hace falta. **Acción:** decidir si/cuándo se construye el flujo de regularización del moroso.
  Archivos: `negocios-acciones.service.ts` (guard) · `FichaNegocio.tsx` (`cobroPendiente`).

- [ ] 🟢 **Lock de servidor anti doble-click.** Las acciones validan estado con guard (409) pero
  sin lock; dos requests simultáneos pasan el guard antes del primer write → no hay doble
  cobro/devolución (todo idempotente), pero sí posible doble auditoría/notificación. El botón ya
  se deshabilita con `isPending` (mitiga el caso normal). **Acción:** endurecer en backend solo si
  se quiere blindar del todo.

- [ ] 🟢 **Monto del pago = solo lectura (autocalculado) — BLOQUEADO por `precio_membresia` configurable.**
  Hoy los diálogos de pago (**Editar pago** / **Registrar pago**) autocalculan el monto del precio de
  membresía (`precioPorMeses` en `membresia.ts`, con `PRECIO_MEMBRESIA = 449` **hardcodeado**) pero el
  campo **sigue editable a mano** — correcto MIENTRAS el precio sea una constante (permite ajustar si
  el precio real difiere). **Cuando exista la variable de precio de membresía configurable en el Panel**
  (sección **Suscripciones/Configuración**) y `membresia.ts` la lea de ahí, el monto debe pasar a
  **solo lectura** (derivado de `meses × precio`, sin edición manual): teclear otro monto deja de tener
  sentido e invita a errores. Archivos: `DialogoEditarPago.tsx` · `DialogoMarcarPagado.tsx` · `membresia.ts`.

---

## Fuera de alcance (van a otros checklists)

No son de la pantalla Negocios; se anotan aquí solo para no perderlos hasta que tengan su propio
documento:

- **Motor de venta en efectivo (Camino B) — control del efectivo del vendedor:** el vendedor ya
  **registra cobros en efectivo de sus negocios manuales** (altas Y renovaciones, vía "Registrar
  pago", acotado a su cartera + solo manuales + sin cortesía — 10 jun 2026). Lo que **falta** es el
  candado del efectivo: marcar cada cobro como **"efectivo por entregar"** a nombre del vendedor,
  **corte de caja** (reportado vs. entregado) y la **comisión condicionada a la entrega** → checklist
  de **Vendedores y comisiones**.
- **Defensas anti "robo invisible"** (comprobante automático + visibilidad de membresía en el
  perfil del dueño) → checklist de **Suscripciones**.
- **Historial financiero completo (tarjeta + efectivo + eventos de Stripe):** vive en la futura
  **Bitácora de eventos de pago** de **Suscripciones**. El historial de la ficha de Negocios es solo
  un **resumen de pagos manuales** del negocio — no incluye los cobros de Stripe.
- **Comisiones** (escalera, monto fijo, rediseño de `embajadores`) → checklist de **Vendedores**.
- **Bandeja de pendientes y despliegue del Panel (Vercel + subdominio)** → pendientes del **shell**
  / globales del Panel.

---

## Referencias

- [`Negocios.md`](Negocios.md) — qué ES y cómo funciona el módulo (documento hermano).
- [`Panel_Admin.md`](Panel_Admin.md) — el Panel completo (caparazón, roles, regiones).
- `docs/reportes/PENDIENTES_PanelAdmin.md` — pendientes globales del Panel + historial de lo cerrado.
