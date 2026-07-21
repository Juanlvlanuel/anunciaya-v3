# Arquitectura — Pagos, Suscripciones y Membresías 💳

> Cómo cobra AnunciaYA la membresía comercial, cómo se modela el estado de cada
> negocio, el ciclo de vida (trial → cobro → gracia → suspensión), las acciones del
> Panel que tocan Stripe y los puntos de extensión pendientes.
>
> **Estado:** lógica completa y validada en DEV (9 Jun 2026). Incluye el rediseño de
> **"Registrar pago"** (Opción A: empuja el cobro N meses con `trial_end` y la tarjeta retoma
> sola; ver §9.1). Falta infraestructura de producción (ver §12).
> **Versión 1.8 (12 Jul 2026):** **promoción de apertura + altas anticipadas.** Un negocio puede afiliarse con un
> **paquete** (3x1/2x1: N meses de membresía por el pago de 1) desde el alta manual, o darse de alta **anticipada**
> (creado con `activo=false` + **`promo_pendiente=true`**, sin cobro): NO aparece en el público aunque complete su
> onboarding. Desde la ficha, **"Activar promoción"** (`activarPromocionNegocio`, mirror de `marcarPagado`) cobra
> `mesesCobrados × precio` vigente, sella la vigencia desde hoy, publica (`activo=true`) y limpia `promo_pendiente`.
> El estado "pendiente de activación" NO toca el CHECK de `estado_membresia` (= `al_corriente` + `activo=false` +
> `promo_pendiente`). Migraciones `2026-07-12-promo-paquetes.sql` + `2026-07-12-negocios-promo-columns.sql`. Detalle
> en [`Panel_Admin/Negocios.md`](Panel_Admin/Negocios.md) §Promoción de apertura.
> **Versión 1.7 (20 Jun 2026):** el **registro del cobro "día 1" se desacopló del reintento del webhook**. Antes
> lo registraba SOLO `invoice.payment_succeeded`; si llegaba antes del negocio se lanzaba para que Stripe
> reintentara, pero en local el Stripe CLI **no reintenta** los 500 → el cobro quedaba cobrado en Stripe pero
> SIN registrar (sin recibo/comisión/movimiento). Ahora una función **idempotente** `registrarCobroReal(invoiceId)`
> (bitácora + comisión + recibo) la llama **el checkout** (tras crear el negocio, leyendo el `latest_invoice`) **y**
> el webhook — gana el primero, el otro no duplica (guard por `invoice.id`). El error de carrera se tipó como
> `WebhookReintentable` (se loguea ⏳, no ❌). La **vigencia del recibo y el periodo de la comisión usan la fecha
> CON cortesía** del vendedor (no el fin facturado por Stripe), calculada de forma determinista. Script operativo
> `apps/api/scripts/reprocesar-cobro-tarjeta.ts` para recuperar un cobro ya hecho pero sin registrar.
> **Versión 1.6 (19 Jun 2026):** **cobro "día 1" para ventas por vendedor** (Sprint Stripe Pieza 2) + **comisión
> recurrente "al cobro"** (Pieza 3). Con `?ref=`, el checkout **OMITE el trial** (cobra hoy) y `manejarCheckoutCompletado`
> empuja el próximo cobro a `fin del periodo real + cortesía` (mensual +44d / anual +1 año + cortesía); el alta manual
> con vendedor suma la cortesía. Blindajes de carrera en `manejarRenovacionPagada`: **reintenta** si el cobro real llega
> antes de crearse el negocio, y **`GREATEST`** para no retroceder la vigencia. La **comisión recurrente del vendedor**
> se devenga ahora en **cada cobro** (`dinero ÷ precio × escalón`, escalón congelado; marcador
> `negocios.comision_devengada_hasta`); la foto mensual (cron) se retiró. Detalle en
> [`Panel_Admin/Vendedores_y_comisiones.md`](Panel_Admin/Vendedores_y_comisiones.md) y [`Panel_Admin/Sprint_Stripe.md`](Panel_Admin/Sprint_Stripe.md).
> Migración de comisiones: `2026-06-19-comision-al-cobro.sql` (pagos no cambia su esquema).
> **Versión 1.5 (18 Jun 2026):** **precio de membresía editable desde el Panel** (vive en `configuracion`; el
> checkout lee el Price ID de config; un botón crea el Price nuevo en Stripe **sin redeploy** — Sprint Stripe
> Pieza 1, [`Panel_Admin/Sprint_Stripe.md`](Panel_Admin/Sprint_Stripe.md)) + **plan anual** + **cobro inmediato
> con trial 0** (se omite `trial_period_days`, que Stripe rechaza en 0) + **comprobante en cobros de TARJETA**: el
> webhook `invoice.payment_succeeded` registra una fila `pagos_membresia` concepto **`'tarjeta'`** y emite el
> recibo PDF + correo, **continuando el folio** de los manuales (§2, §5, §10). De ahí nació el módulo
> [`Panel_Admin/Recibos.md`](Panel_Admin/Recibos.md). Migración `2026-06-18-concepto-tarjeta.sql`.
> **Versión 1.4 (15 Jun 2026):** pago manual **centralizado** en un único helper transaccional
> `registrarPagoManual` (escribe `pagos_membresia` + su gemelo `pago_manual` en `eventos_pago` en la
> misma transacción; §2, §9, §9.1); ahora el alta manual también deja su rastro en la bitácora. Las
> fechas de próximo cobro/vencimiento se **sellan al crear** con tarjeta vía `sellarFechasPeriodoDesdeStripe`
> (la ficha ya no muestra "Próximo cobro: —" durante el trial; §4, §5, §6). Backfill de los gemelos
> históricos huérfanos (§12).
> **Versión 1.3 (12 Jun 2026):** **anular un pago manual en negocios con tarjeta** ahora re-sincroniza
> Stripe (la fecha de cobro "regresa" sola; §9.2), apoyado en la columna `cobro_previo` (§2); "Registrar
> pago" durante el trial **respeta el fin del trial** (§9.1). Validado E2E en vivo (§13.1).
> Versión 1.2 (11 Jun 2026: columna `folio` en `pagos_membresia` + comprobante automático con recibo PDF, §2 y §10).
>
> Archivos núcleo: `apps/api/src/services/pago.service.ts` (webhook + checkout),
> `services/admin/negocios-acciones.service.ts` + `services/suscripciones/acciones-stripe.ts`
> (acciones del Panel), `services/suscripciones/gracia.ts` + `cron/suscripciones-gracia.cron.ts`
> (suspensión por impago).

---

## 1. Visión general

- **Modelo de negocio:** suscripción comercial **$864 MXN/mes** vía **Stripe** (modo subscription, con **trial**). El usuario usa la app gratis; el negocio paga por Business Studio + ScanYA + presencia premium. **El precio es editable desde el Panel** (no hardcodeado): el monto vive en `configuracion` y el checkout lee el **Price ID de config** (la env solo siembra la 1ª vez); un botón del Panel crea el Price nuevo en Stripe **sin redeploy** (Sprint Stripe Pieza 1). Hay plan **mensual y anual** (anual ≈ 10× el mensual).
- **Trial:** configurable (`configuracion` clave `trial_duracion_dias`, default **14**).
- **Periodo de gracia tras impago:** configurable (`periodo_gracia_cobro_dias`, default **14**).
- **Fuente de verdad:** **NUESTRA BD**. Stripe es el motor de cobro; ante un fallo de Stripe en una acción del Panel, la BD manda y se avisa (ver §9, regla §4.3).

---

## 2. Modelo de datos

**`usuarios`** (el dueño):
| Campo | Para qué |
|---|---|
| `stripe_customer_id` | Cliente en Stripe |
| `stripe_subscription_id` | Suscripción activa del dueño (NULL tras cancelación manual) |
| `tiene_modo_comercial` / `modo_activo` / `perfil` | Capa comercial (un CHECK exige coherencia) |
| `referido_por` | Vendedor (embajador) que lo trajo — atribución |
| `negocio_id` | Negocio del dueño (1:1) |

**`negocios`** (ejes de estado + fechas):
| Campo | Para qué |
|---|---|
| `estado_membresia` | **Eje de pago:** `al_corriente` / `en_gracia` / `suspendido` / `cancelado` |
| `estado_admin` | **Eje administrativo:** `activo` / `suspendido` / `archivado` (la RAZÓN) |
| `activo` | **Visibilidad efectiva** en el feed público |
| `es_borrador` / `onboarding_completado` | Publicación (ver §4) |
| `metodo_cobro` | `tarjeta` / `manual` |
| `embajador_id` | Vendedor atribuido |
| `fecha_vencimiento` · `fecha_proximo_cobro` · `fecha_inicio_gracia` · `fecha_limite_gracia` · `fecha_primer_pago` | Fechas del ciclo (ver §6, §7) |

**`pagos_membresia`** (bitácora de pagos manuales — primer ladrillo de la bitácora pendiente §12):
| Campo | Para qué |
|---|---|
| `folio` | **Folio correlativo del recibo** (`#00001…`); default `nextval` de la secuencia global `pagos_membresia_folio_seq` (atómica entre todos los vendedores). Migración `2026-06-11-folio-recibo.sql` |
| `negocio_id` | Negocio (FK, `ON DELETE CASCADE`) |
| `concepto` | `efectivo` / `transferencia` (ingreso) / `cortesia` (sin monto; un CHECK exige `monto IS NULL`) / **`tarjeta`** (cobro automático de Stripe; lo inserta el webhook §5/§10 — comparte la **serie de folios** con los manuales; no editable/anulable. Migración `2026-06-18-concepto-tarjeta.sql`) |
| `monto` | MXN del pago registrado (NULL en cortesía) |
| `meses_cubiertos` | N elegido en "por meses" (NULL en "fecha exacta") |
| `periodo_hasta` | Vencimiento aplicado (= `trial_end` empujado en Stripe) |
| `registrado_por` | Admin que registró (FK `usuarios`, `ON DELETE SET NULL`) |
| `anulado` · `anulado_at` · `anulado_por` · `motivo_anulacion` | **Anulación** (borrado lógico): el pago no se borra, se marca anulado; recalcula la vigencia desde el pago más reciente NO anulado y saca el ingreso de la bitácora. **En negocios con tarjeta (Stripe)** es simétrico a "Registrar pago": re-empuja el `trial_end` a la vigencia recalculada, o a la **fecha de cobro original** (`cobro_previo` del primer pago manual) si se anuló el último → la fecha "regresa" sola. Si no hay fecha a la cual volver (pagos sin `cobro_previo`, o ya pasó) o Stripe la rechaza, se devuelve `advertenciaStripe`. Migraciones `2026-06-11-anular-pago.sql`, `2026-06-12-cobro-previo.sql` |
| `cobro_previo` | Fecha de cobro de Stripe **justo antes** de este pago (solo con tarjeta). Permite devolver el `trial_end` a la fecha original al anular el último pago. Migración `2026-06-12-cobro-previo.sql` |

> Cada "Registrar pago" (§9.1) inserta una fila aquí, en la **misma transacción** que activa el negocio. Antes el dato contable se perdía: solo quedaba la acción en `admin_auditoria`, sin monto ni concepto.

**`eventos_pago`** (el **libro mayor** / bitácora financiera global del módulo Suscripciones):
| Campo | Para qué |
|---|---|
| `negocio_id` | Negocio del evento |
| `tipo` | `cobro_exitoso` / `cobro_fallido` / `cancelacion` / `pago_manual` |
| `origen` | `stripe` (automático del webhook) / `manual` (Registrar pago / alta manual) |
| `monto` · `moneda` | Importe del movimiento (NULL en cortesía / al anular, así deja de sumar en KPIs) |
| `fecha_evento` | Cuándo ocurrió |
| `actor_id` | Quién lo originó (admin en manual; NULL en automáticos de Stripe) |
| `stripe_event_id` | **UNIQUE** — idempotencia de los eventos del webhook |
| `referencia_id` | FK → `pagos_membresia.id` (enlaza el gemelo `pago_manual` con su fila contable) |
| `metadata` | Contexto adicional del evento |

> **Un pago manual vive en AMBAS tablas, en la misma transacción**, vía `registrarPagoManual` (§9.1): la
> fila contable en `pagos_membresia` **y** su gemelo `tipo='pago_manual'`, `origen='manual'`,
> `referencia_id → pagos_membresia.id` en `eventos_pago`. Antes el doble INSERT estaba copiado en los dos
> flujos y el **alta manual olvidaba el gemelo** → sus pagos no aparecían en el módulo Suscripciones; ahora
> sí. Los eventos automáticos de Stripe (`cobro_exitoso`/`cobro_fallido`/`cancelacion`) los puebla el
> webhook vía `registrarEventoPago` (§5), no `registrarPagoManual`.

---

## 3. Los dos ejes de estado (clave del diseño)

- **Eje de pago** (`estado_membresia`): lo gobiernan los eventos de Stripe (`invoice.*`) y el cron de gracia.
- **Eje administrativo** (`estado_admin`): lo gobierna el admin desde el Panel (Parada 2).
- **Visibilidad** (`activo`): es lo que el feed público filtra. La apagan el cron de gracia y la cancelación.

**Regla de oro — un pago NO revive una decisión manual:** en `manejarRenovacionPagada`, el negocio solo reaparece (`activo=true`) si `estado_admin === 'activo'`. Si un admin lo suspendió/archivó a mano, un pago actualiza el eje de pago pero **no** lo republica (cinturón anti-republicación).

---

## 4. Alta de un negocio

El negocio **nace dentro del webhook**, después del pago (no en el checkout).

### Camino A — registro con tarjeta + atribución a vendedor
1. El vendedor comparte `…/registro?plan=comercial&ref=<codigo>`.
2. El front (`PaginaRegistro.tsx`) captura el `?ref=` (case-sensitive, solo `.trim()`) y lo manda al checkout **solo si existe**.
3. `crearCheckoutSession` lo mete en la **metadata** de Stripe (`tipo='registro_comercial'`).
4. Al pagar → `checkout.session.completed` → `manejarCheckoutCompletado`: crea usuario + negocio (`es_borrador=true`) + sucursal `'Por configurar'`, y **atribuye** vía `resolverEmbajadorPorCodigo` → escribe **2 campos**: `negocios.embajador_id` + `usuarios.referido_por`. (La región se deduce de la ciudad; `region_id` se eliminó en el Paso 10.)
5. Regla crítica: un `?ref=` ausente/mal escrito/inactivo **nunca bloquea** la venta (entra con atribución `null`).
6. **Cobro "día 1" (Pieza 2):** si vino `?ref=`, el checkout se crea **sin trial** → cobra al instante; tras crear el
   negocio, `manejarCheckoutCompletado` **empuja el próximo cobro** a `fin del periodo real + dias_cortesia` (config,
   default 14): mensual → +44d, anual → +1 año + cortesía (lee el periodo de Stripe, no asume "1 mes"). Ese cobro del
   día 0 dispara la **comisión de alta** y la **recurrente al cobro** (Vendedores · Pieza 3). Sin vendedor, el trial
   de config sigue igual. Blindaje: si `invoice.payment_succeeded` llega antes de existir el negocio, el webhook
   **reintenta** (no se pierde comisión/recibo); y `GREATEST` evita que el `period.end` (+1 mes) pise el +44d.

### Upgrade personal → comercial
- `crearCheckoutUpgrade` + `manejarUpgradeCompletado`. **NO atribuye vendedor** (solo el registro nuevo atribuye).
- **Revive el negocio archivado** si el usuario ya tuvo uno (re-registro tras cancelación manual): en vez de crear otro, lo saca del archivo → respeta el 1:1 usuario↔negocio (no deja huérfanos).

### Estado tras pagar (antes de terminar onboarding)
`es_borrador=true`, `onboarding_completado=false`, `estado_membresia='al_corriente'`, `activo=true`. **NO aparece en el feed público** hasta `finalizarOnboarding` (que pone `es_borrador=false`, `onboarding_completado=true`). En el Panel (cartera del vendedor) **sí** aparece desde el pago.

> **Sellado de fechas al crear (tarjeta).** Tanto en el registro nuevo como en el upgrade, al crear con
> tarjeta se **sellan** `fecha_proximo_cobro` y `fecha_vencimiento` leyendo `current_period_end` de Stripe
> (= fin del trial) vía `sellarFechasPeriodoDesdeStripe` (§5, §6). Antes quedaban NULL durante el trial y la
> ficha mostraba **"Próximo cobro: —"** hasta que llegara el webhook asíncrono `subscription.updated`; ahora
> la fecha está desde el alta.

---

## 5. El webhook (`procesarWebhook`)

Endpoint: `POST /api/pagos/webhook` (con `express.raw` — el body crudo es necesario para validar la firma; el JSON parser global lo excluye).

- **Firma:** `stripe.webhooks.constructEvent` con `STRIPE_WEBHOOK_SECRET`. Firma inválida → 400.
- **Idempotencia:** Stripe entrega "at least once". Se chequea `event.id` en **Redis** (`stripe:evt:<id>`); si ya se procesó, se ignora. Se **marca al terminar sin lanzar** (para que un fallo que re-lanza permita el reintento). *Fail-open*: si Redis cae, se procesa igual.
- **Manejo de errores:** los handlers **re-lanzan** los errores reales → el controller responde **500 → Stripe reintenta** (no se pierde el evento en silencio). Las operaciones secundarias (notificaciones) van en su propio `try/catch` para no provocar reintentos por algo no crítico.

**Eventos manejados:**
| Evento | Handler | Qué hace |
|---|---|---|
| `checkout.session.completed` | `manejarCheckoutCompletado` / `manejarUpgradeCompletado` | Crea/activa el negocio (§4) y **sella `fecha_vencimiento`/`fecha_proximo_cobro` desde Stripe** (`current_period_end`) al crear, vía `sellarFechasPeriodoDesdeStripe` (§6) |
| `invoice.payment_succeeded` | `manejarRenovacionPagada` | → `al_corriente`, refresca fechas, sella `fecha_primer_pago` si `amount_paid>0`; registra el `cobro_exitoso` en la bitácora (§5) y, en cobros **reales** (monto>0), inserta una fila `pagos_membresia` concepto **`'tarjeta'`** + emite el **comprobante** (recibo PDF + correo, §10) |
| `invoice.payment_failed` | `manejarCobroFallido` | → `en_gracia` (§7) |
| `customer.subscription.updated` | `manejarSuscripcionActualizada` | Refresca `fecha_vencimiento`/`fecha_proximo_cobro` (NO el estado) |
| `customer.subscription.deleted` | `procesarCancelacionSuscripcion` | Cancelación (§7/§8, distingue motivo) |
| `customer.subscription.trial_will_end` | `manejarTrialPorTerminar` | Aviso in-app de fin de trial, con copy **ramificado** según el pago manual (§10) |

> **Bitácora desde el webhook (`registrarEventoPago` en `services/suscripciones/eventos-pago.ts`).** Los
> eventos automáticos de Stripe (`cobro_exitoso`/`cobro_fallido`/`cancelacion`, `origen='stripe'`) los
> registra en `eventos_pago` (§2) este helper, que es **defensivo**: nunca lanza (no rompe el webhook si
> falla la bitácora) e **idempotente por `stripe_event_id`** (UNIQUE). Es distinto de `registrarPagoManual`
> (§9.1), que es **transaccional** y escribe el gemelo `pago_manual`; el `pago_manual` **no** pasa por aquí.

---

## 6. Ciclo de cobro normal

1. **Trial** (14 días): la sub nace `trialing`. Las fechas se **sellan JUSTO al crear**: `manejarCheckoutCompletado`/`manejarUpgradeCompletado` llaman `sellarFechasPeriodoDesdeStripe`, que hace `stripe.subscriptions.retrieve` y escribe `fecha_vencimiento`/`fecha_proximo_cobro` con el `current_period_end` (= fin del trial). Después, `subscription.updated` (vía `manejarSuscripcionActualizada`) solo **REFRESCA** esas fechas. Ambos caminos comparten la misma fuente de la fecha, `finPeriodoDeSuscripcion` (en `pago.service.ts`), para no divergir. Antes las fechas quedaban NULL durante el trial y solo las escribía el `subscription.updated` asíncrono.
2. **Primer cobro** (al terminar el trial): `invoice.payment_succeeded` → `al_corriente`. Se **sella `fecha_primer_pago`** solo si `amount_paid > 0` (con `COALESCE`, una sola vez) — el invoice de $0 del trial no la sella.
3. **Renovaciones mensuales:** cada `invoice.payment_succeeded` refresca las fechas al siguiente periodo.

> Detalle: `fecha_vencimiento` y `fecha_proximo_cobro` son **la misma fecha** mientras el negocio está al corriente (el próximo cobro ES al vencer). Solo difieren en gracia (§7). La ficha del Panel muestra **un solo renglón** ("Próximo cobro") al corriente.
>
> **Cobro adelantado por "Registrar pago" (§9.1):** al registrar un pago manual a N meses, el cobro se difiere con `trial_end` y la sub queda `trialing` hasta esa fecha; al vencer, Stripe factura y cobra la tarjeta sola (vuelve a `al_corriente` vía `invoice.payment_succeeded`). Durante ese periodo `current_period_end = trial_end`, así que las fechas de la BD reflejan la fecha empujada (esto **disuelve el Hallazgo 2**).

---

## 7. Ciclo de morosidad (impago)

1. **Falla un cobro** → `manejarCobroFallido`:
   - Primer fallo (desde `al_corriente`): → `en_gracia`, fija `fecha_inicio_gracia` y `fecha_limite_gracia` (= hoy + 14 días) **una sola vez**, y pone `fecha_proximo_cobro = next_payment_attempt` (el próximo reintento de Stripe). `fecha_vencimiento` **se queda fija** (cuándo se le acabó lo pagado).
   - Reintentos posteriores: solo refrescan `fecha_proximo_cobro`, **sin reiniciar** el plazo de gracia.
   - El negocio **sigue visible** durante la gracia.
2. **Vence la gracia** → el **cron** `suscripciones-gracia` (diario) pasa a `suspendido` + `activo=false` + limpia `fecha_proximo_cobro` + notifica al dueño.
3. **El impago NUNCA cancela** (decisión de producto). Dos protecciones:
   - **Config de Stripe:** dunning en *"marcar la suscripción como impagada"* (no cancelar) → la sub no se elimina por impago.
   - **Guard de código:** en `procesarCancelacionSuscripcion`, si llega un `subscription.deleted` cuyo `cancellation_details.reason != 'cancellation_requested'` (= impago/disputa), **no archiva ni degrada** → deja `suspendido` + dueño comercial.
4. **Recuperación:** al pagar la factura pendiente → `invoice.payment_succeeded` → `al_corriente` y reaparece (`activo=true`, porque `estado_admin` siguió `activo`). El comerciante paga desde la futura página de cuenta / Customer Portal (§12) o el admin usa "Marcar pagado".

### Ficha del Panel por estado
| Estado | Bloque de cobro que muestra |
|---|---|
| Al corriente | **Próximo cobro** (un renglón) |
| En gracia | **Venció** (= `fecha_inicio_gracia`) · **Reintento** (`next_payment_attempt`) · **Gracia hasta** |
| Suspendido / Cancelado | (sin fechas de cobro) |

---

## 8. Cancelación (solo manual desde el Panel)

`cancelarNegocio` (Parada 2 · **solo superadmin**), orden:
1. Corta la suscripción en Stripe (`subscriptions.cancel`).
2. Degrada al dueño a **personal** (conserva cuenta, puntos, `negocio_id`).
3. Archiva el negocio (`estado_admin='archivado'`, `activo=false`, `estado_membresia='cancelado'`).
4. Revierte los puntos de vouchers pendientes (idempotente).
5. Audita.
6. Notifica al dueño.
7. Limpia `stripe_subscription_id` **al final** (para que el webhook `subscription.deleted` aún resuelva al usuario y refuerce).

Idempotente: si ya está archivado → 409. El webhook `deleted` con `reason='cancellation_requested'` refuerza la baja.

---

## 9. Acciones del Panel (Parada 2)

`services/admin/negocios-acciones.service.ts` + helpers `services/suscripciones/acciones-stripe.ts`.

| Acción | Rol | Efecto BD | Efecto Stripe |
|---|---|---|---|
| **Registrar pago** (§9.1) | super + gerente | `al_corriente` + `activo` + fechas + `metodo_cobro` + fila en `pagos_membresia` (con `cobro_previo`) **+ gemelo `pago_manual` en `eventos_pago`** (misma transacción, vía `registrarPagoManual`) | **con sub:** empuja el cobro a la fecha (`trial_end`) → retoma solo. **sin sub:** solo BD |
| **Anular pago** (§9.2) | super + gerente | marca el pago `anulado`, saca el ingreso de la bitácora, **recalcula la vigencia** | **con sub:** re-empuja el `trial_end` a la vigencia recalculada o a la fecha original → la fecha "regresa". **sin sub:** solo BD |
| **Pausar** | super + gerente | `estado_admin='suspendido'`, `activo=false` | `pause_collection: void` (sin deuda) |
| **Reactivar** | super + gerente | `estado_admin='activo'`, `activo=true` | limpia `pause_collection` |
| **Cancelar** | superadmin | §8 | `subscriptions.cancel` |

**Defensa §4.3 — Stripe falla, no se aborta:** los helpers de Stripe **nunca lanzan** (devuelven `{ ok, aviso }`). Si Stripe falla, la BD **se aplica igual** y el service propaga `advertenciaStripe`, que el controller devuelve y el Panel muestra como **advertencia** (no como éxito silencioso). Validado en vivo con un `subId` inválido (Hallazgo 1 ya corregido: Pausar/Reactivar también reenvían `advertenciaStripe`).

> **⚠️ Deuda conocida de la Parada 2 (verificada 9 Jun 2026, siguen vigentes, severidad baja — detalle y plan en `PENDIENTES_PanelAdmin.md`):**
> - **Hallazgo 2 — RESUELTO (9 Jun 2026)** con el rediseño "Registrar pago" → Opción A (§9.1): al empujar con `trial_end`, el `current_period_end` que trae `customer.subscription.updated` ES la fecha empujada, así que `manejarSuscripcionActualizada` escribe la fecha correcta (verificado en vivo con `probar-empujar-cobro.ts`). Ya no hay pisada.
> - **Hallazgo 3 — cancelar manual vs webhook `deleted`:** `esBorrador`/`estadoAdmin`/`perfil` divergen según el timing de la carrera. La visibilidad (`activo=false`) es consistente en ambos caminos; la divergencia es en campos administrativos secundarios. Pendiente unificar.
> - **Hallazgo 4 — cancelar no transaccional:** corta Stripe primero y luego hace UPDATEs sueltos sin `db.transaction`. Ventana de inconsistencia si el proceso muere a mitad (recuperable reintentando, es idempotente). Pendiente envolver los UPDATEs de BD en transacción.

### 9.1 Registrar pago (Opción A — empuja el cobro y retoma solo)

"Registrar pago" (antes "Marcar pagado"; **SuperAdmin + Gerente de su región** — antes solo SuperAdmin, ampliado el 10 Jun 2026 y acotado por `cargarNegocioConAlcance`; **Cancelar y dar Cortesía siguen exclusivos de SuperAdmin**) cubre cuando el comerciante pagó por adelantado (**efectivo/transferencia**) o se le da **cortesía** (solo super). El plazo se elige por meses (chips 1/3/6/12) o fecha exacta (máx **2 años**, tope de Stripe; validado en modal y controller).

**Flujo (`marcarPagado` en `negocios-acciones.service.ts`):**
1. **Guard v1:** con suscripción, solo opera sobre negocios `al_corriente`. Si está en gracia/suspendido (cobro pendiente en Stripe) → **409**; la regularización del moroso llega en una versión posterior. Sin suscripción no hay guard (sigue como antes).
2. **Transacción** (`db.transaction`): activa el negocio (`estado_admin='activo'`, `activo=true`, `estado_membresia='al_corriente'`, `fechas=hasta`, limpia gracia) **+** escribe **AMBAS tablas** de la bitácora vía el helper único `registrarPagoManual(ejecutor, datos)`: la fila en `pagos_membresia` **y** su gemelo `pago_manual` en `eventos_pago` (§2), garantizando en un solo lugar la invariante **cortesía ⇒ `monto = NULL`**. `metodo_cobro` queda **`'tarjeta'`** con sub (el cobro retoma solo) / **`'manual'`** sin ella.
3. **Stripe (fuera de la transacción, §4.3):** `empujarCobroSuscripcion(subId, hasta)` → `subscriptions.update({ trial_end: <unix de hasta>, proration_behavior: 'none', pause_collection: '' })`. Difiere el cobro a esa fecha y limpia cualquier pausa residual → al vencer, la tarjeta retoma sola. Defensiva: si Stripe falla, la BD ya quedó aplicada y se propaga `advertenciaStripe`.
4. **Aviso de fin de trial** (§10): al acercarse la fecha, el copy se ramifica según el concepto (cortesía suprime; efectivo/transferencia avisa del cobro).

**Concepto** (efectivo/transferencia = ingreso; cortesía = sin monto) y **monto** se guardan en `pagos_membresia`. A efectos de Stripe los tres son idénticos (empujar N meses); la diferencia es solo de **registro contable**.

> El frontend del Panel: modal `DialogoMarcarPagado.tsx` (concepto + monto + plazo) y la ficha `FichaNegocio.tsx` (botón "Registrar pago", deshabilitado con tooltip si el negocio no está al corriente — espejo del guard 409).

> **Base del plazo = vigencia vigente (respeta el trial).** El modal calcula la fecha sumando los meses
> sobre el **mayor entre hoy y la vigencia actual** (`sumarMeses`). Para que esa "vigencia actual" sea la
> correcta, `FichaNegocio.tsx` le pasa al modal **la misma fecha que muestra** (`fechaProximoCobro` con
> tarjeta, `fechaVencimiento` en manual). Con el **sellado de fechas al crear** (§4, §6) esa vigencia ya
> **no queda NULL durante el trial** —llega desde el alta, no hay que esperar al webhook—. Se conserva el
> cálculo sobre el mayor entre hoy y la vigencia vigente **como defensa** (por si la fecha aún no estuviera
> disponible): así un pago durante el trial respeta el fin del trial en vez de calcular desde "hoy" y
> acortarlo (corregido el 12 Jun 2026; reforzado por el sellado el 15 Jun 2026).

> **`registrarPagoManual` — un solo helper para los dos flujos.** Vive en
> `services/admin/pagos-manuales.service.ts` y lo usan **ambos** caminos que registran un cobro manual:
> "Registrar pago" (`marcarPagado` en `negocios-acciones.service.ts`) **y** el alta manual de un negocio
> (`altaManualNegocio.service.ts`). En la misma transacción inserta la fila contable en `pagos_membresia`
> y su gemelo en `eventos_pago`, garantizando en un único lugar la invariante cortesía ⇒ `monto NULL`.
> Antes el doble INSERT estaba **copiado** en los dos servicios y el alta manual olvidaba el gemelo, así que
> sus pagos no aparecían en Suscripciones. Es **transaccional** (no defensivo): se distingue de
> `registrarEventoPago` (§5), que es defensivo/idempotente y solo lo usa el webhook para los eventos
> automáticos de Stripe. El **comprobante automático** (recibo PDF en R2 + correo, §10) está en ambos flujos.
> El **backfill** de los gemelos `pago_manual` históricos huérfanos (sobre todo de altas manuales previas a
> la centralización) está en §12.

### 9.2 Anular pago (borrado lógico, simétrico a "Registrar pago")

`anularPagoMembresia` (super + gerente de su región). Permite "cancelar" un recibo registrado por error
**sin borrarlo** (queda para auditoría). En la **misma transacción**: (1) marca `anulado` (quién/cuándo/por
qué), (2) saca el ingreso de la bitácora (`eventos_pago.monto = NULL` → deja de sumar en KPIs), (3)
**recalcula la vigencia** desde el pago no anulado más reciente.

**En negocios con tarjeta es SIMÉTRICO a "Registrar pago"** (que empujó el `trial_end`): al anular, se
RE-EMPUJA el cobro (fuera de la transacción, §4.3) → la fecha de cobro **regresa sola**:
- Queda **otro pago** vigente → re-empuja a su `periodo_hasta`.
- Era el **último** pago → re-empuja a la **fecha de cobro original** (`cobro_previo` del primer pago
  manual del negocio; ver §2). `cobro_previo` se captura al registrar leyendo `current_period_end` de
  Stripe (`leerProximoCobroStripe`), no de la BD —que en un negocio nuevo en trial puede estar sin
  sincronizar—.
- No hay fecha a la cual volver (pagos sin `cobro_previo`, o ya pasó) o Stripe la rechaza → **no se toca
  Stripe** y se devuelve `advertenciaStripe` (el Panel lo muestra como advertencia; la BD ya quedó
  consistente).

Luego avisa al dueño (correo de "recibo cancelado", best-effort). Frontend: `DialogoConfirmar`
(motivo obligatorio) desde el historial de la ficha **y** desde el detalle del movimiento en Suscripciones.

---

## 10. Notificaciones

- **Comprobante de pago** (correo + recibo PDF): al registrar un pago manual (§9.1 / alta manual) **y en cada
  cobro real con tarjeta** (webhook `invoice.payment_succeeded`, §5), el dueño recibe **al instante** un correo de
  comprobante con un **recibo PDF descargable** (folio correlativo, datos fiscales del emisor, monto, forma de
  pago, vigencia), guardado en R2 (`recibos/`). Es la **Defensa 1 del Camino B** contra el "robo invisible":
  registrar un cobro queda inseparable de que el negocio reciba constancia. Best-effort (si el correo/PDF fallan,
  el cobro ya quedó). Generador: `utils/reciboPdf.ts` (pdf-lib sobre molde de marca); detalle en
  `Panel_Admin/Negocios.md` §6 y Ap. D.
  > **Cobro con tarjeta:** inserta su fila `pagos_membresia` con concepto `'tarjeta'` (**sin** gemelo
  > `eventos_pago` — el `cobro_exitoso` ya quedó asentado en §5) y reusa el mismo flujo del recibo
  > (`prepararReciboPago` + `enviarComprobantePagoMembresia`), de modo que su folio **continúa la serie** de los
  > manuales. Esos pagos de tarjeta **no se editan ni anulan** desde el Panel (guards). Todos los comprobantes
  > (manuales + tarjeta) se consultan, descargan y reenvían desde el módulo
  > [`Panel_Admin/Recibos.md`](Panel_Admin/Recibos.md).
- **Negocio fuera de circulación** (`negocio_fuera_circulacion`): al dueño cuando se suspende o cancela (idempotente: borra y recrea).
- **Fin de trial** (`trial_will_end`): notificación in-app (tipo `sistema`) al dueño, en **ambos modos**, ~3 días antes del cobro. **Copy ramificado** según el pago manual que cubría el periodo (busca en `pagos_membresia` el pago cuyo `periodo_hasta` coincide con el `trial_end`):
  - **cortesía** → se **suprime** el aviso (el dueño no paga ese periodo).
  - **efectivo/transferencia** → *"Tu membresía se renueva pronto… ese día se cobrará a tu tarjeta"* (sin "prueba gratis").
  - **trial de alta** (sin pago manual cubriendo el periodo) → copy original *"Tu prueba gratis termina pronto"*.

---

## 11. Configuración en Stripe (Dashboard — manual)

| Ajuste | Valor |
|---|---|
| Reintentos (Smart Retries) | 4 intentos / 2 semanas (cuadra con la gracia de 14 días) |
| Si fallan todos los reintentos → **suscripción** | **Marcar como impagada** (NO cancelar) |
| Si fallan todos los reintentos → **factura** | Dejar como vencida |
| Si se abre una **disputa** | Dejar la suscripción como vencida (no cancela) |

✅ **Replicado y validado en modo Live (1 jul 2026).** Detalle en `docs/DESPLIEGUE_PRODUCCION.md`.

### 11.1 Checklist — switch a Stripe Live ✅ COMPLETADO (1 jul 2026)

Test y Live son entornos **separados** en Stripe: nada de lo configurado en Test se copia solo. Se replicó todo en **modo Live** y el backend de Render quedó apuntando a las claves Live:

- [x] **Cuenta de Stripe activada/verificada** (persona física, Santander MXN, statement `ANUNCIAYA`, SaaS, 2FA ON).
- [x] **Claves Live** (`sk_live` + `pk_live`) en Render (+ `pk_live` en Vercel).
- [x] **Webhook Live** `AnunciaYA API - Producción` → `/api/pagos/webhook` (6 eventos) → `whsec` en Render.
- [x] **Price de la membresía en Live**: mensual **$864** (`price_1ToVoz…`) + anual **$8,640** (`price_1ToVpo…`); producto Live `prod_TcFY6kI9RIuCf1`; `STRIPE_PRICE_COMERCIAL` puesta en Render.
- [x] **Customer Portal en Live**: métodos de pago + facturas ON; cancelaciones OFF (se cancela desde el Panel).
- [x] **Reintentos / dunning** (tabla de §11) configurados igual en Live (4 intentos / 2 semanas; impago = "marcar como impagada").
- [x] **Datos de depósito** del pago manual capturados en el Panel de producción.
- [x] **Cron en Render** activo — Render en plan **Starter $7/mes** (NO se duerme); crons in-process corriendo.
- [x] **Migraciones one-shot** aplicadas en la BD de PROD.

**Humo real validado:** compra de anuncio $99 → webhook → anuncio activo + recibo (confirmado por UI, BD y logs).

---

## 12. Pendientes / extensiones

- **Página de cuenta/perfil del usuario** (modo Personal, `/perfil`): la sección **Membresía y Pagos** ya está **construida** (vista de membresía + recibos, recuperar tarjeta vía Customer Portal, pago manual con comprobante y cambio de método) — ver [`Mi_Perfil.md`](Mi_Perfil.md). Pendientes solo los tabs **Datos Personales** y **Seguridad** (contraseña/2FA/avatar).
- **Bitácora de eventos de pago en el Panel**: el **libro mayor ya existe** — la tabla `eventos_pago` (§2) registra TODOS los movimientos: los eventos de Stripe (`cobro_exitoso`/`cobro_fallido`/`cancelacion`, vía el webhook con `registrarEventoPago`, §5) **y** los pagos manuales (`pago_manual`, vía `registrarPagoManual`, §9.1). La **lectura backend ya está** (`admin/suscripciones.service.ts`: `listarEventos` + `obtenerDetalleEvento`, con KPIs de ingresos/fallidos, filtros y alcance por rol). Lo pendiente es **parte de la UI** (sección con filtros en el Panel). **Backfill** `docs/migraciones/2026-06-15-backfill-eventos-pago-manual.sql` + `apps/api/scripts/backfill-eventos-pago-manual.ts` (idempotente, one-shot, correr en **DEV y PROD**) reconstruye los gemelos `pago_manual` históricos huérfanos. Sinergia: migrar el dedup de idempotencia de Redis a esa tabla.
- **Copy del trial**: el texto del front debe **leer el valor de config** (no un número fijo) para no desincronizarse.
- **Reembolsos / contracargos** (`charge.refunded` / `charge.dispute.created`): hoy se manejan manualmente en Stripe; handler automático opcional a futuro.
- **SCA/3DS** (`payment_action_required`): cubierto de facto por el ciclo de gracia (si no se autentica, cae como impago); aviso temprano opcional a futuro.
- **Infraestructura de producción:** webhook **live** + `whsec` live, cuenta Stripe **verificada**, **cron en Render** (el free se duerme → pasar a pagado o cron externo), **migraciones one-shot aplicadas en prod**.

---

## 13. Cómo probar en DEV

Requiere `stripe listen --forward-to localhost:4000/api/pagos/webhook` + backend en `:4000`. Scripts de apoyo en `apps/api/scripts/` (todos abortan si `DB_ENVIRONMENT=production`):
- `seed-vendedor-prueba.ts` — habilita el vendedor de prueba (JUAN01).
- `seed-negocios-estados-dev.ts` — siembra negocios por estado (ver la ficha en cada estado).
- `probar-ciclo-morosidad.ts <crear|fallar|reintento|suspender|...>` — recorre el ciclo de morosidad con eventos reales, paso a paso.
- `probar-acciones-parada2.ts` — ejercita las 4 acciones del Panel contra Stripe real + la defensa §4.3.
- `probar-empujar-cobro.ts` — verifica `empujarCobroSuscripcion` (trial_end exacto, pausa limpia, el webhook escribe la fecha, tope 2 años).
- `probar-marcar-pagado.ts` — los 3 escenarios de "Registrar pago" (al corriente con sub, guard 409 en gracia, sin sub).
- `probar-anular-pago.ts` — ciclo completo de anulación en un negocio CON tarjeta: imprime paso a paso cómo el `trial_end` de Stripe se **traslada** al registrar (3m → 6m) y **regresa** al anular (al pago anterior, y al último → a la fecha original vía `cobro_previo`).
- `probar-aviso-trial.ts` — copy ramificado de `trial_will_end` (efectivo/transferencia/cortesía/alta). **NO requiere Stripe** (mock de la sub).
- `diagnostico-stripe-suscripcion.ts` — estado real de una suscripción (solo lectura).

> Para recorrer el calendario completo de reintentos/trial sin esperar días: **Stripe Test Clock** (pendiente de montar).

### 13.1 Validación E2E realizada (12 Jun 2026)

Ciclo **Registrar pago → Anular** verificado **end-to-end en vivo** (Panel Admin + Stripe Dashboard en
modo test, contra una suscripción real), además del harness automatizado `probar-anular-pago.ts`. Casos
cubiertos y confirmados:
- **Registrar pago adelantado acumulado** (3 meses, luego 6 meses): el `trial_end` de Stripe se traslada
  y se acumula sobre la vigencia vigente; las fechas de la BD y de Stripe coinciden (salvo el desfase de
  zona horaria UTC↔local del Dashboard).
- **Anular un pago dejando otro vigente:** la vigencia y el `trial_end` **regresan** al pago anterior;
  el ingreso anulado sale de los KPIs de la bitácora.
- **Anular el último pago:** la fecha **regresa a la original** (fin del trial) en BD y Stripe vía
  `cobro_previo`; toast verde (sin `advertenciaStripe`).
- **Registrar pago durante el trial:** respeta el **fin del trial** como base (no calcula desde "hoy").
- **Correo de "recibo cancelado"** al dueño en cada anulación.
