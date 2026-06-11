# Arquitectura — Pagos, Suscripciones y Membresías 💳

> Cómo cobra AnunciaYA la membresía comercial, cómo se modela el estado de cada
> negocio, el ciclo de vida (trial → cobro → gracia → suspensión), las acciones del
> Panel que tocan Stripe y los puntos de extensión pendientes.
>
> **Estado:** lógica completa y validada en DEV (9 Jun 2026). Incluye el rediseño de
> **"Registrar pago"** (Opción A: empuja el cobro N meses con `trial_end` y la tarjeta retoma
> sola; ver §9.1). Falta infraestructura de producción (ver §12). Versión 1.2 (11 Jun 2026: columna
> `folio` en `pagos_membresia` + comprobante automático con recibo PDF, §2 y §10).
>
> Archivos núcleo: `apps/api/src/services/pago.service.ts` (webhook + checkout),
> `services/admin/negocios-acciones.service.ts` + `services/suscripciones/acciones-stripe.ts`
> (acciones del Panel), `services/suscripciones/gracia.ts` + `cron/suscripciones-gracia.cron.ts`
> (suspensión por impago).

---

## 1. Visión general

- **Modelo de negocio:** suscripción comercial **$449 MXN/mes** vía **Stripe** (modo subscription, con **trial**). El usuario usa la app gratis; el negocio paga por Business Studio + ScanYA + presencia premium.
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
| `concepto` | `efectivo` / `transferencia` (ingreso) / `cortesia` (sin monto; un CHECK exige `monto IS NULL`) |
| `monto` | MXN del pago registrado (NULL en cortesía) |
| `meses_cubiertos` | N elegido en "por meses" (NULL en "fecha exacta") |
| `periodo_hasta` | Vencimiento aplicado (= `trial_end` empujado en Stripe) |
| `registrado_por` | Admin que registró (FK `usuarios`, `ON DELETE SET NULL`) |

> Cada "Registrar pago" (§9.1) inserta una fila aquí, en la **misma transacción** que activa el negocio. Antes el dato contable se perdía: solo quedaba la acción en `admin_auditoria`, sin monto ni concepto.

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

### Upgrade personal → comercial
- `crearCheckoutUpgrade` + `manejarUpgradeCompletado`. **NO atribuye vendedor** (solo el registro nuevo atribuye).
- **Revive el negocio archivado** si el usuario ya tuvo uno (re-registro tras cancelación manual): en vez de crear otro, lo saca del archivo → respeta el 1:1 usuario↔negocio (no deja huérfanos).

### Estado tras pagar (antes de terminar onboarding)
`es_borrador=true`, `onboarding_completado=false`, `estado_membresia='al_corriente'`, `activo=true`. **NO aparece en el feed público** hasta `finalizarOnboarding` (que pone `es_borrador=false`, `onboarding_completado=true`). En el Panel (cartera del vendedor) **sí** aparece desde el pago.

---

## 5. El webhook (`procesarWebhook`)

Endpoint: `POST /api/pagos/webhook` (con `express.raw` — el body crudo es necesario para validar la firma; el JSON parser global lo excluye).

- **Firma:** `stripe.webhooks.constructEvent` con `STRIPE_WEBHOOK_SECRET`. Firma inválida → 400.
- **Idempotencia:** Stripe entrega "at least once". Se chequea `event.id` en **Redis** (`stripe:evt:<id>`); si ya se procesó, se ignora. Se **marca al terminar sin lanzar** (para que un fallo que re-lanza permita el reintento). *Fail-open*: si Redis cae, se procesa igual.
- **Manejo de errores:** los handlers **re-lanzan** los errores reales → el controller responde **500 → Stripe reintenta** (no se pierde el evento en silencio). Las operaciones secundarias (notificaciones) van en su propio `try/catch` para no provocar reintentos por algo no crítico.

**Eventos manejados:**
| Evento | Handler | Qué hace |
|---|---|---|
| `checkout.session.completed` | `manejarCheckoutCompletado` / `manejarUpgradeCompletado` | Crea/activa el negocio (§4) |
| `invoice.payment_succeeded` | `manejarRenovacionPagada` | → `al_corriente`, refresca fechas, sella `fecha_primer_pago` si `amount_paid>0` |
| `invoice.payment_failed` | `manejarCobroFallido` | → `en_gracia` (§7) |
| `customer.subscription.updated` | `manejarSuscripcionActualizada` | Refresca `fecha_vencimiento`/`fecha_proximo_cobro` (NO el estado) |
| `customer.subscription.deleted` | `procesarCancelacionSuscripcion` | Cancelación (§7/§8, distingue motivo) |
| `customer.subscription.trial_will_end` | `manejarTrialPorTerminar` | Aviso in-app de fin de trial, con copy **ramificado** según el pago manual (§10) |

---

## 6. Ciclo de cobro normal

1. **Trial** (14 días): la sub nace `trialing`. `subscription.updated` puebla `fecha_vencimiento`/`fecha_proximo_cobro` con el `current_period_end` (fin del trial).
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
| **Registrar pago** (§9.1) | superadmin | `al_corriente` + `activo` + fechas + `metodo_cobro` + fila en `pagos_membresia` | **con sub:** empuja el cobro a la fecha (`trial_end`) → retoma solo. **sin sub:** solo BD |
| **Pausar** | super + gerente | `estado_admin='suspendido'`, `activo=false` | `pause_collection: void` (sin deuda) |
| **Reactivar** | super + gerente | `estado_admin='activo'`, `activo=true` | limpia `pause_collection` |
| **Cancelar** | superadmin | §8 | `subscriptions.cancel` |

**Defensa §4.3 — Stripe falla, no se aborta:** los helpers de Stripe **nunca lanzan** (devuelven `{ ok, aviso }`). Si Stripe falla, la BD **se aplica igual** y el service propaga `advertenciaStripe`, que el controller devuelve y el Panel muestra como **advertencia** (no como éxito silencioso). Validado en vivo con un `subId` inválido (Hallazgo 1 ya corregido: Pausar/Reactivar también reenvían `advertenciaStripe`).

> **⚠️ Deuda conocida de la Parada 2 (verificada 9 Jun 2026, siguen vigentes, severidad baja — detalle y plan en `PENDIENTES_PanelAdmin.md`):**
> - **Hallazgo 2 — RESUELTO (9 Jun 2026)** con el rediseño "Registrar pago" → Opción A (§9.1): al empujar con `trial_end`, el `current_period_end` que trae `customer.subscription.updated` ES la fecha empujada, así que `manejarSuscripcionActualizada` escribe la fecha correcta (verificado en vivo con `probar-empujar-cobro.ts`). Ya no hay pisada.
> - **Hallazgo 3 — cancelar manual vs webhook `deleted`:** `esBorrador`/`estadoAdmin`/`perfil` divergen según el timing de la carrera. La visibilidad (`activo=false`) es consistente en ambos caminos; la divergencia es en campos administrativos secundarios. Pendiente unificar.
> - **Hallazgo 4 — cancelar no transaccional:** corta Stripe primero y luego hace UPDATEs sueltos sin `db.transaction`. Ventana de inconsistencia si el proceso muere a mitad (recuperable reintentando, es idempotente). Pendiente envolver los UPDATEs de BD en transacción.

### 9.1 Registrar pago (Opción A — empuja el cobro y retoma solo)

"Registrar pago" (antes "Marcar pagado"; **SuperAdmin + Gerente de su región** — antes solo SuperAdmin, ampliado el 10 Jun 2026 y acotado por `cargarNegocioConAlcance`; **Cancelar sigue exclusivo de SuperAdmin**) cubre cuando el comerciante pagó por adelantado (**efectivo/transferencia**) o se le da **cortesía**. El plazo se elige por meses (chips 1/3/6/12) o fecha exacta (máx **2 años**, tope de Stripe; validado en modal y controller).

**Flujo (`marcarPagado` en `negocios-acciones.service.ts`):**
1. **Guard v1:** con suscripción, solo opera sobre negocios `al_corriente`. Si está en gracia/suspendido (cobro pendiente en Stripe) → **409**; la regularización del moroso llega en una versión posterior. Sin suscripción no hay guard (sigue como antes).
2. **Transacción** (`db.transaction`): activa el negocio (`estado_admin='activo'`, `activo=true`, `estado_membresia='al_corriente'`, `fechas=hasta`, limpia gracia) **+** inserta la fila en `pagos_membresia`. `metodo_cobro` queda **`'tarjeta'`** con sub (el cobro retoma solo) / **`'manual'`** sin ella.
3. **Stripe (fuera de la transacción, §4.3):** `empujarCobroSuscripcion(subId, hasta)` → `subscriptions.update({ trial_end: <unix de hasta>, proration_behavior: 'none', pause_collection: '' })`. Difiere el cobro a esa fecha y limpia cualquier pausa residual → al vencer, la tarjeta retoma sola. Defensiva: si Stripe falla, la BD ya quedó aplicada y se propaga `advertenciaStripe`.
4. **Aviso de fin de trial** (§10): al acercarse la fecha, el copy se ramifica según el concepto (cortesía suprime; efectivo/transferencia avisa del cobro).

**Concepto** (efectivo/transferencia = ingreso; cortesía = sin monto) y **monto** se guardan en `pagos_membresia`. A efectos de Stripe los tres son idénticos (empujar N meses); la diferencia es solo de **registro contable**.

> El frontend del Panel: modal `DialogoMarcarPagado.tsx` (concepto + monto + plazo) y la ficha `FichaNegocio.tsx` (botón "Registrar pago", deshabilitado con tooltip si el negocio no está al corriente — espejo del guard 409).

---

## 10. Notificaciones

- **Comprobante de pago** (correo + recibo PDF): al registrar un pago manual (§9.1 / alta manual), el
  dueño recibe **al instante** un correo de comprobante con un **recibo PDF descargable** (folio
  correlativo, datos fiscales del emisor, monto, forma de pago, vigencia), guardado en R2 (`recibos/`).
  Es la **Defensa 1 del Camino B** contra el "robo invisible": registrar un cobro queda inseparable de
  que el negocio reciba constancia. Best-effort (si el correo/PDF fallan, el cobro ya quedó). Generador:
  `utils/reciboPdf.ts` (pdf-lib sobre molde de marca); detalle en `Panel_Admin/Negocios.md` §6 y Ap. D.
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

Pendiente replicar **todo en modo live** + verificar la empresa en Stripe (§12).

---

## 12. Pendientes / extensiones

- **Página de cuenta/perfil del usuario** (fuera del BS, **accesible desde modo Personal**): cambiar contraseña, 2FA, datos personales, avatar **y su suscripción** (estado + **botón reactivar pago** vía Customer Portal de Stripe). Crítico para que un negocio impago se recupere solo.
- **Bitácora de eventos de pago en el Panel**: el primer ladrillo ya existe — la tabla `pagos_membresia` (§2) registra cada "Registrar pago" manual. Falta: registrar también los eventos de Stripe (webhook) + sección UI con filtros, unificada con `admin_auditoria`. Sinergia: migrar el dedup de idempotencia de Redis a esa tabla.
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
- `probar-aviso-trial.ts` — copy ramificado de `trial_will_end` (efectivo/transferencia/cortesía/alta). **NO requiere Stripe** (mock de la sub).
- `diagnostico-stripe-suscripcion.ts` — estado real de una suscripción (solo lectura).

> Para recorrer el calendario completo de reintentos/trial sin esperar días: **Stripe Test Clock** (pendiente de montar).
