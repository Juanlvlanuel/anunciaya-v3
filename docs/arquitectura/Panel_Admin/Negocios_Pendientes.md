# Negocios — Pendientes (checklist único de la pantalla)

> **Qué es este documento:** la **única fuente de verdad** de lo que falta por hacer en la
> **pantalla Negocios** del Panel Admin. Es el mapa de trabajo del módulo.
>
> **Documento hermano:** [`Negocios.md`](Negocios.md) describe **qué ES y cómo funciona**
> (lo ya construido). Este describe **qué FALTA**.
>
> **Regla de oro (para que no se desfasen):** cuando un pendiente de aquí se termina, se
> **borra de este checklist** y, si cambió el comportamiento del módulo, se documenta en
> `Negocios.md`. Uno se vacía, el otro crece. Nunca describen lo mismo a la vez.
>
> **Alcance:** SOLO la pantalla Negocios (lista, ficha, las 6 acciones, alta manual). El
> **motor de venta en efectivo** (corte de caja, comisiones, robo invisible) NO entra aquí —
> ver §Fuera de alcance.
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · 🟡 a medias · ✅ hecho
>
> **Última actualización:** 10 Junio 2026 (nace de la auditoría código↔documentación).

---

## Estado del módulo

**Completo y en producción.** La auditoría del 10 jun 2026 (código real vs. documentación)
confirmó que lista, ficha, sucursales, historial de pagos, alcance por rol, filtro global de
región, las **6 acciones** (registrar pago · pausar · reactivar · reasignar · cancelar · editar
correo) y el **alta manual** funcionan y cuadran con `Negocios.md`. Lo de abajo es **pulido,
verificación y corrección de desfases** — no reconstrucción.

---

## 1. Riesgos conocidos de las acciones con Stripe

> Detectados en el diagnóstico de Parada 2 (7 jun) y confirmados en código en la auditoría.

- [ ] 🟡 **Fecha de "Marcar pagado" vs. webhook (tarjeta).** En un negocio CON suscripción,
  `marcarPagado` escribe `fecha_vencimiento`/`fecha_proximo_cobro = hasta` y empuja `trial_end`
  en Stripe (`empujarCobroSuscripcion`), pero el webhook `customer.subscription.updated`
  (`pago.service.ts → manejarSuscripcionActualizada`) las **sobrescribe** con el
  `current_period_end` real de Stripe. La fecha elegida a mano solo es durable en negocios
  **sin** suscripción. **Acción:** verificar en DEV (marcar a una fecha lejana en un negocio de
  tarjeta y ver si sobrevive) y decidir si el handler debe respetar las fechas fijadas a mano.
  Archivos: `services/admin/negocios-acciones.service.ts` · `services/pago.service.ts`.

- [ ] 🟡 **Consistencia Cancelar manual ↔ webhook.** La cancelación del Panel pone
  `estado_admin='archivado'` (no toca `es_borrador`); el webhook `customer.subscription.deleted`
  pone `es_borrador=true` (no toca `estado_admin`). Según quién gane la carrera de timing, el
  estado final difiere; además puede haber **doble notificación** "fuera de circulación".
  **Acción:** unificar campos/criterio entre los dos caminos.

- [ ] 🟢 **Transaccionalidad de Cancelar.** `cancelarNegocio` corta Stripe **primero**
  (irreversible) y luego hace varios UPDATE sueltos (degradar dueño, archivar negocio, revertir
  vouchers) **sin** transacción. Si un UPDATE falla tras el corte, queda estado parcial (Stripe
  cancelado / BD a medias). Es recuperable reintentando (idempotente), no automático.
  **Acción:** evaluar envolver los pasos de BD en una transacción.

- [ ] 🟢 **Lock de servidor anti doble-click.** Las 4 acciones validan estado con guard (409)
  pero sin lock; dos requests simultáneos pasan el guard antes del primer write → no hay doble
  cobro/devolución (todo idempotente), pero sí posible doble auditoría/notificación. El botón ya
  se deshabilita con `isPending` (mitiga el caso normal). **Acción:** endurecer en backend solo
  si se quiere blindar del todo.

---

## 2. Reglas y funcionalidad por completar (acciones, alta manual y pagos)

- [ ] 🟡 **Regularizar pago de tarjeta morosa desde "Marcar pagado".** Hoy, si un negocio de
  tarjeta está en gracia/suspendido, "Marcar pagado" devuelve **409** ("la regularización de
  pagos atrasados llegará en una versión posterior"). Está bien manejado: la ficha deshabilita el
  botón con tooltip ("Tiene un cobro pendiente en Stripe; primero regulariza su pago."). **Acción:**
  decidir si/ cuándo se construye el flujo de regularización del moroso de tarjeta.
  Archivo: `negocios-acciones.service.ts` (guard) · `FichaNegocio.tsx` (`cobroPendiente`).

- [ ] 🟡 **El vendedor NO debe poder crear negocios manuales de cortesía.** Hoy el alta manual
  (`altaManualNegocio`) deja a los 3 roles usar el concepto `cortesia` (alta gratis). Una cortesía
  **regala** membresía → debe ser decisión de Gerente/SuperAdmin, no del vendedor de calle (riesgo
  de abuso/pérdida de ingreso). **Acción:** restringir `concepto='cortesia'` a superadmin/gerente
  en el alta manual — validación en el service **y** ocultar/deshabilitar la opción en el formulario
  cuando el rol es vendedor. Archivos: `services/admin/altaManualNegocio.service.ts` ·
  `validations/admin/altaManualNegocio.schema.ts` · `DialogoRegistrarNegocio.tsx`.

- [ ] 🟡 **Corregir el concepto (y monto) de un pago ya registrado.** Cada fila del historial
  guarda su concepto (efectivo/transferencia/cortesía) y monto, pero **queda inmutable**: si un pago
  se capturó como "efectivo" cuando era "transferencia" (o el monto está mal), no hay forma de
  corregirlo (ya anotado como "mejora futura" en la FAQ de `Negocios.md`). **Acción:** permitir
  **editar una fila de `pagos_membresia`** desde el historial de la ficha — el `concepto` y el
  `monto` que lo acompaña, respetando el CHECK "cortesía ⇒ monto NULL". Endpoint nuevo (p. ej.
  `PATCH /admin/negocios/:id/pagos/:pagoId`) con el mismo alcance por rol que las acciones (super +
  gerente su región) y **registro en `admin_auditoria`**. UI: botón "editar" por fila en
  `HistorialPagos` → diálogo con selector de concepto/monto. **No** cambia el `metodo_cobro` del
  negocio (eso sería otra cosa). Archivos: `pagos_membresia` · `negocios-acciones.service.ts` ·
  ficha (`HistorialPagos`).

- [ ] 🟢 **Acotar el historial de pagos de la ficha a "últimos N + ver todos".** Hoy
  `listarPagosNegocio` trae **todas** las filas sin `LIMIT` (bien para el volumen de la beta). Cuando
  un negocio acumule años de renovaciones, paginar o mostrar "últimos N + ver todos" para no cargar
  de más. Archivos: `listarPagosNegocio` (añadir límite/paginación) · ficha (`HistorialPagos`).

---

## 3. Datos demo que tocan la pantalla Negocios

- [ ] ⬜ **Contador del menú de Negocios (248/64/19) sigue DEMO.** Vive en `data/menuPanel.ts`
  (`contadorPorRol`). Conectarlo al total real toca el shell (pasar el total por props a las
  barras). **Acción:** conectar al conteo real de la sección.

---

## 4. Verificación a fondo (Definición de Terminado)

> Construido y pusheado, pero falta probarlo con **datos reales** (regla 8 de CLAUDE.md). Hasta
> marcar esto, el módulo está "hecho" pero no "verificado de punta a punta".

- [ ] ⬜ **Marcar pagado (tarjeta):** empuja `trial_end`, retoma el cobro al vencer, respeta (o no)
  la fecha — ver §1.
- [ ] ⬜ **Pausar / Reactivar (tarjeta):** `pause_collection 'void'` no genera deuda; reactivar
  reanuda sin cobrar lo saltado; `advertenciaStripe` se muestra si Stripe falla.
- [ ] ⬜ **Cancelar (tarjeta):** corta Stripe + degrada dueño a personal + archiva + devuelve puntos
  de vales; el webhook posterior refuerza sin duplicar.
- [ ] ⬜ **Alcance del gerente por matriz:** ve/actúa solo sobre negocios cuya sucursal principal
  cae en su región; no ve los de sucursal secundaria de otra región.

---

## Fuera de alcance (van a otros checklists)

No son de la pantalla Negocios; se anotan aquí solo para no perderlos hasta que tengan su propio
documento:

- **Motor de venta en efectivo (Camino B):** registrar cobro del vendedor, "efectivo por entregar",
  corte de caja → checklist de **Vendedores y comisiones**.
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
- `docs/reportes/PENDIENTES_PanelAdmin.md` — pendientes globales del Panel (se irá adelgazando a
  medida que cada módulo tenga su propio checklist como este).
