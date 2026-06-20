# Panel Admin · Módulo Vendedores y comisiones 💰

> **En una frase:** es el **CRM + nómina** de la red de ventas — donde se ve la **cartera** de cada
> vendedor, se **devenga** su comisión (cuánto gana) y se **liquida** (cuánto se le paga, con comprobante).
>
> **Cómo leer este documento:** dos capas. La primera (§1–§9) explica el módulo **en lenguaje de persona**.
> La segunda (**Apéndice técnico**) es la referencia para tocar el código.
>
> **Estado:** **construido y en uso** (piezas A · B · C · E · D). El **devengo recurrente (B) cambió a "al cobro"**
> (Sprint Stripe · Pieza 3, 19 Jun 2026): ya no es una foto mensual por cron. Última actualización: 19 Junio 2026.
>
> Documento hermano: [`Panel_Admin.md`](Panel_Admin.md) · pendientes y decisiones en
> [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

Los **vendedores** (embajadores) firman negocios para AnunciaYA y cobran comisión por ello. Este módulo es
donde el equipo **ve y administra esa operación**: qué negocios firmó cada vendedor, cuánto gana de comisión
y cuánto se le ha pagado. Tiene una **simetría con Suscripciones**: aquélla es la bitácora de **ingresos** (lo
que los negocios te pagan); ésta lleva la de **egresos** (lo que tú le pagas a los vendedores).

## 2. ¿Quién lo usa? (y quién no)

- **SuperAdmin** — ve **toda la red** y mueve el dinero: fija la escalera (en Configuración), recalcula
  comisiones, **registra los pagos** y captura datos de cobro.
- **Gerente Regional** — ve **su equipo** (los vendedores de su región): su cartera, comisiones y pagos. **Da
  seguimiento, no ejecuta pagos** ni fija montos ni ve datos de cobro.
- **Vendedor** — ve **solo lo suyo**: su cartera (en "Mi cartera"), sus comisiones y sus pagos.

## 3. Diccionario rápido

- **Embajador / vendedor:** una cuenta con `rol_equipo='vendedor'` + una fila en `embajadores` (su código de
  referido + su cobertura de ciudades). Lo crea "Equipo y accesos"; aquí se **opera**.
- **Cartera:** los negocios atribuidos a un vendedor (`negocios.embajador_id`).
- **Activo (para comisión):** negocio **operativo** (`estado_admin='activo'`) **y pagando** (membresía
  `al_corriente` o `en_gracia`). Es la base de la comisión recurrente. (Misma definición en toda la sección.)
- **Devengar:** calcular y registrar lo que el vendedor **gana** en un periodo.
- **Liquidar:** **pagarle** y dejar el comprobante; eso marca sus comisiones como pagadas.

## 4. Las piezas (v1 + 2ª pasada)

- **A · Cartera (ver):** la red de ventas; por vendedor, # en cartera y # activos. Detalle master-detail.
- **B · Devengo (comisión recurrente), AL COBRO:** en cada cobro real de un negocio (renovación de tarjeta, alta
  manual o "Registrar pago") el vendedor devenga, por ESE negocio, **`meses pagados × monto del escalón`** —donde
  `meses pagados = dinero ÷ precio mensual` (un anual de 10× → **10**)— con el **escalón congelado** al # de activos
  del momento. Un marcador por negocio evita re-devengar la cobertura ya pagada (anti-doble-pago del prepago).
  Monto fijo, no porcentaje. *(Antes era una "foto mensual" por cron; se cambió en el Sprint Stripe · Pieza 3.)*
  **El 1er mes no se cuenta dos veces:** en el **primer cobro**, si el negocio recibió **comisión de alta** (C), el
  recurrente **descuenta 1 mes** (la alta ya representa el 1er mes de membresía) → un **anual con alta devenga 9× +
  la alta**, no 10× + la alta.
- **C · Comisión de alta:** **pago único** al vendedor cuando un negocio que firmó concreta su **primer pago
  real** (monto configurable, **$400** por defecto). Se devenga sola e idempotente (una por negocio). **Representa
  el 1er mes de membresía**, por lo que el devengo recurrente (B) descuenta ese mes en el primer cobro.
- **E · Liquidación:** registrar pagos al vendedor (con foto-comprobante), que marcan sus comisiones como
  pagadas; + sus datos de cobro (transferencia/efectivo); + la bitácora de egresos.
- **D · Cortes de efectivo (+ neteo):** el efectivo que el vendedor te **debe entregar** (cobró membresías en
  efectivo). Corte de caja por vendedor (cobrado / entregado / descontado / saldo) + registro de cobros y
  entregas. Al pagarle comisión, se **netea** lo que debe (compensación) y se le entrega el **neto**.

> **Diferido:** **F** (cobertura avanzada de territorio). *(El cobro automático de efectivo — que el cobro lo
> dispare el propio vendedor al registrar un pago en efectivo — ya quedó enganchado en "alta manual" y "marcar
> pagado"; el super/gerente además lo registran a mano.)*

## 5. La escalera (cómo se calcula la comisión)

El **monto del escalón** = el del tramo donde cae el **# de negocios activos** del vendedor (p.ej.
`0–9 → $0 · 10–24 → $30 · 25+ → $50`), definido por el SuperAdmin en **Configuración**. En cada **cobro** de un
negocio, el vendedor devenga `meses pagados × ese monto`, **congelando** el escalón al # de activos de ese
instante (si crece después, lo ya devengado no cambia). El negocio prepagado **sigue contando como activo** para
el escalón —aporta al nivel— pero no vuelve a generar pago mientras su cobertura siga vigente (marcador
`comision_devengada_hasta`). *(Ya no hay cron de "foto mensual" ni botón "Recalcular": el devengo es al cobro.)*

> **Comisiones agregadas viejas:** las que quedaron del sistema anterior (foto mensual: `negocio_id` NULL,
> `detalle.activos`) salen en el historial como una sola fila "Cartera" (no guardaron qué negocios las generaron).
> El script `apps/api/scripts/desglosar-comision-cartera.ts` (dry-run + `--aplicar`) las reescribe como una comisión
> **por negocio activo** del vendedor, conservando los totales (Total Comisión / Pagado / Pendiente). Las comisiones
> nuevas ya nacen por negocio y no lo necesitan.

## 6. Cómo se ve

Al abrir un vendedor, su **detalle ocupa toda la pantalla** (master-detail, no modal): a la izquierda su
identidad + KPIs (en cartera / activos); a la derecha **pestañas**:

- **Cartera** — sus negocios (estado de pago, próximo cobro). *(El vendedor la ve en "Mi cartera", no aquí.)*
- **Comisiones** — estado de cuenta: KPIs **Total Comisión / Pagado / Pendiente** (con **selector de periodo**:
  "Todo el tiempo" o un mes, que recalcula los KPIs y filtra el historial) + el **Historial de comisiones** como
  tabla **por negocio**: Negocio (avatar) · Concepto ("Pago de Mensualidad/Anualidad" o "Comisión de alta") ·
  Periodo cubierto ("Jun 2026" o "Jun–Dic 2026") · Monto. *(Sin botón "Recalcular": el devengo es automático al
  cobro. Cada fila es un registro de `embajador_comisiones` con su `negocio_id`; las comisiones nacen por negocio.)*
- **Pagos** — los datos de cobro + la **bitácora de egresos**; el super tiene **Registrar abono** (parcial /
  dividido en transferencia+efectivo / netea el efectivo). El **vendedor** captura aquí **sus** datos de cobro.
- **Efectivo** — el corte de caja (por entregar · cobrado · entregado · descontado) + la bitácora de
  movimientos; super/gerente tienen **Registrar movimiento** (cobro / entrega).

## 7. Registrar un abono (Liquidación v2)

Solo el **SuperAdmin**. Abre "Registrar abono" en un vendedor → el diálogo muestra el **saldo a pagar**
(comisiones pendientes − efectivo que el vendedor debe) → captura cuánto abona en **Transferencia** y/o
**Efectivo** (puede **dividir** y pagar **solo una parte**) → fecha/nota/comprobante → guarda. El abono se aplica
**FIFO** a las comisiones (de la más antigua), subiendo su `monto_pagado`; una comisión queda **parcial** hasta
saldarse y entonces pasa a **pagada**. Lo que el vendedor debe de efectivo se **descuenta** del saldo (neteo /
compensación). Cada método con monto > 0 entra como un egreso en la bitácora; lo no abonado **queda pendiente**.

## 8. Datos de cobro

Dónde se le paga al vendedor: **transferencia** (banco + CLABE de 18 dígitos + titular) o **efectivo**. Los **ve**
el **super** (los necesita para pagar) y el **propio vendedor**; pero **solo el vendedor los captura/edita**
(desde "Mis comisiones" → Pagos → "Mis datos de cobro") — es su dato bancario y a dónde va su dinero, así que el
super **no lo toca** (anti-fraude). El **gerente** ni los ve.

## 9. Seguridad y rastro

El **dinero lo mueve solo el super** (fijar escalera, recalcular, registrar pagos). El **gerente** da
seguimiento de su equipo; el **vendedor** ve lo suyo. Toda acción de dinero queda en `admin_auditoria`. El
alcance por rol se aplica en el **service** (no solo en la ruta).

---

# Apéndice técnico

## A. Arquitectura — archivos

**Backend** (`apps/api/src`)

| Archivo | Rol |
|---|---|
| `services/admin/vendedores.service.ts` | Lecturas: lista de la red · ficha · cartera · **estado de cuenta de comisiones** · **bitácora de pagos**. `condicionAlcance`/`leerVendedor` (alcance por rol). |
| `services/admin/comisiones-devengo.service.ts` | **Motor B + C**: **`devengarComisionRecurrenteAlCobro`** (pieza B · Pieza 3: `meses pagados × escalón congelado`, marcador `comision_devengada_hasta`, idempotente) · `devengarComisionAlta` (pieza C: pago único al primer pago real) · `escaleraActual`/`montoPorActivo`. `devengarPeriodo`/`dispararDevengoMesActual` quedan **legacy** (foto mensual retirada: el cron ya no se inicializa y `dispararDevengoMesActual` es no-op). |
| `services/admin/comisiones-liquidacion.service.ts` | **Acciones E (Liquidación v2 — abonos)**: `generarUrlComprobante` (R2) · `registrarPago` (ABONO parcial + dividido: aplica FIFO a las comisiones subiendo `monto_pagado`, netea el efectivo, registra 1-2 egresos por método) · `obtenerDatosCobro` (super+vendedor) / `guardarDatosCobro` (solo el propio vendedor). |
| `services/admin/comisiones-efectivo.service.ts` | **Pieza D**: `saldoEfectivo` (cobros − entregas − compensaciones) · `registrarMovimientoManual` (cobro/entrega, super+gerente con alcance) · `registrarCobroEfectivo` (automático: lo llaman "marcar pagado" y "alta manual" cuando el **VENDEDOR** cobra en efectivo). |
| `controllers/admin/vendedores.controller.ts` · `routes/admin/vendedores.routes.ts` | Endpoints (montados con `requierePanel` por ruta, antes del gate global). |
| `cron/comisiones-devengo.cron.ts` | Devengo del mes en curso cada 24h. |

**Frontend** (`apps/admin/src`)

| Archivo | Rol |
|---|---|
| `components/vendedores/SeccionVendedores.tsx` | Lista de la red (super/gerente) y "Mi cartera/comisiones" (vendedor). Abre el detalle full-width. |
| `components/vendedores/DetalleVendedor.tsx` | Vista master-detail + pestañas. **`SeccionComisiones`**: KPIs (Total Comisión/Pagado/Pendiente) con ícono + `SelectorPeriodo` (filtra KPIs e historial) + Historial como tabla por negocio (`FilaComision` con `AvatarNegocio`, helpers `conceptoPago`/`periodoCobertura`). Exporta `CuerpoCartera`. |
| `components/vendedores/SeccionPagos.tsx` | Pestaña Pagos: bitácora + datos de cobro + `DialogoRegistrarPago` (selección de comisiones + **desglose del neteo** + uploader a R2) + `DialogoDatosCobro`. |
| `components/vendedores/SeccionEfectivo.tsx` | **Pieza D**: corte de caja + bitácora de movimientos + `DialogoMovimiento` (cobro/entrega, super/gerente). |
| `services/vendedoresService.ts` · `hooks/queries/useVendedoresAdmin.ts` | Llamadas + hooks RQ (cartera, comisiones, pagos, datos de cobro, registrar pago, recalcular, **corte de efectivo + registrar movimiento**). |

## B. Endpoints

```
GET   /admin/vendedores                 lista (super/gerente/vendedor)
GET   /admin/vendedores/conteo          badge del menú
GET   /admin/vendedores/:id             ficha
GET   /admin/vendedores/:id/cartera     negocios atribuidos
GET   /admin/vendedores/:id/comisiones  estado de cuenta (devengado/pagado/pendiente)
POST  /admin/vendedores/comisiones/recalcular   recalcular el periodo (solo super)
POST  /admin/vendedores/comprobante/upload      presigned del comprobante (solo super)
POST  /admin/vendedores/:id/pagos       registrar pago, netea efectivo (solo super)
GET   /admin/vendedores/:id/pagos       bitácora (super/gerente/vendedor)
GET/PUT /admin/vendedores/:id/datos-cobro   datos de cobro (super + el propio vendedor)
GET   /admin/vendedores/:id/efectivo    corte de caja (super/gerente/vendedor)
POST  /admin/vendedores/:id/efectivo    registrar cobro/entrega (super/gerente)
```

## C. Datos (migración `2026-06-17-vendedores-comisiones-fase2.sql` + comprobante)

- **`embajadores`** — se quitaron `porcentaje_*` y `negocios_registrados` (se cuenta en vivo). Quedan
  `codigo_referido`, `estado`.
- **`embajador_comisiones`** — **monto fijo** (sin `porcentaje`/`monto_base`): `monto_comision`, **`monto_pagado`**
  (Liquidación v2: abonos acumulados; 'pagada' cuando = `monto_comision`; entre 0 y el total = "parcial", derivado),
  `tipo` (`alta`/`recurrente`), `estado` (pendiente/pagada/cancelada), **`periodo`** ('YYYY-MM'), **`detalle`** (jsonb:
  `{activos, montoUnitario, escalon}`), `pagada_at`. `negocio_id` **nullable** (recurrente va sin negocio). Índice
  único parcial `(embajador_id, periodo)` para recurrente. *(migración `2026-06-17-comision-monto-pagado.sql`)*
- **`pagos_vendedor`** (nueva) — egresos: `monto`, `metodo`, `fecha_pago`, `periodo`, `nota`,
  `comprobante_url`, `registrado_por`. Registrada en `IMAGE_REGISTRY`.
- **`vendedor_datos_cobro`** (nueva) — 1 por vendedor: `metodo`, `banco`, `clabe`, `titular`, `nota`.
- **`efectivo_movimientos`** (nueva, migración `2026-06-17-efectivo-movimientos.sql`) — libro del efectivo que el
  vendedor te debe: `tipo` (cobro/entrega/compensacion), `monto`, `negocio_id` (en cobro), `pago_id` (en
  compensación), `fecha`, `registrado_por`, `nota`. Saldo = Σ cobros − Σ (entregas + compensaciones).
- **Comisión de alta (C):** vive en `embajador_comisiones` con `tipo='alta'`, `negocio_id` lleno, `periodo` null;
  monto desde `comision_alta_monto` (Configuración, $400). Idempotente: una por negocio.
- **Comisión recurrente (B · Pieza 3):** `tipo='recurrente'` con **`negocio_id` lleno** (antes NULL), `periodo` =
  mes del cobro, `detalle = {meses, montoUnitario, escalon, activos, hasta}`. El marcador
  **`negocios.comision_devengada_hasta`** (migración `2026-06-19-comision-al-cobro.sql`) impide re-devengar. Esa
  migración quitó el único `(embajador_id, periodo)` y relajó el CHECK `forma` a "recurrente ⇒ periodo NOT NULL".

## D. Reglas clave

- **"Activo" = `estado_admin='activo'` AND membresía `al_corriente`/`en_gracia`** — idéntico en cartera (SUB_ACTIVOS)
  y en el motor de devengo (no usar la columna legacy `negocios.activo`, que puede desincronizarse).
- **Devengo recurrente AL COBRO (Pieza 3):** se dispara en `manejarRenovacionPagada` (tarjeta), el alta manual y
  `marcarPagado`. Anti-doble-pago/idempotencia por el marcador `comision_devengada_hasta` (si la cobertura ya está
  dentro, no devenga); el escalón se **congela** al # de activos del cobro. `mesesDevengables = dinero ÷ precio`,
  **menos 1 mes en el primer cobro si el negocio ya tiene comisión de alta** (esa alta es el 1er mes; no se paga
  doble). Por eso la **alta (C) se devenga ANTES** que el recurrente en los 3 enganches: si no, el descuento no la
  vería.
- **La escalera vive en Configuración** (`comision_escalera`, leída con `obtenerConfigJson`); aquí solo se lee.
- **Sincronización:** las acciones de Negocios invalidan `queryKeys.vendedores` (front) y llaman
  `dispararDevengoMesActual` (back).
- **Comisión de alta (C):** se devenga al **primer pago real** del negocio (webhook Stripe `esCobroReal`, alta
  manual no-cortesía, "marcar pagado"), donde se sella `fecha_primer_pago`. Idempotente (una por negocio).
- **Neteo (D):** `registrarPago` lee el `saldoEfectivo` del vendedor y compensa `min(bruto, deuda)`; el egreso es
  el **neto**; la compensación baja la deuda. El cálculo lo hace el **backend** (la UI solo lo previsualiza).

## E. Estado de verificación

- `tsc` API + builds del Panel ✅. Harness `probar-comisiones-devengo.ts` (B, cálculo + idempotencia) TODO VERDE.
- Harness `probar-abonos.ts` (Liquidación v2: abono **parcial** + **dividido** + **neteo**, aislado y autorreparable)
  **TODO VERDE**. Migraciones `2026-06-17-...-fase2.sql` · `...-efectivo-movimientos.sql` (dev+prod) ·
  `...-comision-monto-pagado.sql` (**correr en prod**).

## F. Referencias

- [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md) — backlog (C, D, F) + decisiones.
- [`Configuracion.md`](Configuracion.md) — la **escalera** que alimenta el devengo.
- [`Suscripciones.md`](Suscripciones.md) — la bitácora gemela (ingresos).
- [`Equipo_y_accesos.md`](Equipo_y_accesos.md) — quién crea/revoca los vendedores (frontera identidad↔operación).
