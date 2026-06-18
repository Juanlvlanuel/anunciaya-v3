# Panel Admin · Módulo Vendedores y comisiones 💰

> **En una frase:** es el **CRM + nómina** de la red de ventas — donde se ve la **cartera** de cada
> vendedor, se **devenga** su comisión (cuánto gana) y se **liquida** (cuánto se le paga, con comprobante).
>
> **Cómo leer este documento:** dos capas. La primera (§1–§9) explica el módulo **en lenguaje de persona**.
> La segunda (**Apéndice técnico**) es la referencia para tocar el código.
>
> **Estado:** **v1 + 2ª pasada construidos y en uso** (piezas A · B · C · E · D). Última actualización: 17 Junio 2026.
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
- **B · Devengo (comisión recurrente):** cada mes, comisión = **# de activos × monto del escalón** de la
  **escalera** (que se edita en **Configuración**). Monto fijo, no porcentaje.
- **C · Comisión de alta:** **pago único** al vendedor cuando un negocio que firmó concreta su **primer pago
  real** (monto configurable, **$400** por defecto). Se devenga sola e idempotente (una por negocio).
- **E · Liquidación:** registrar pagos al vendedor (con foto-comprobante), que marcan sus comisiones como
  pagadas; + sus datos de cobro (transferencia/efectivo); + la bitácora de egresos.
- **D · Cortes de efectivo (+ neteo):** el efectivo que el vendedor te **debe entregar** (cobró membresías en
  efectivo). Corte de caja por vendedor (cobrado / entregado / descontado / saldo) + registro de cobros y
  entregas. Al pagarle comisión, se **netea** lo que debe (compensación) y se le entrega el **neto**.

> **Diferido:** **F** (cobertura avanzada de territorio). Y el **cobro automático** de efectivo (que el cobro lo
> dispare el propio vendedor desde "alta manual / marcar pagado"): en v1 el cobro se registra **a mano**
> (super/gerente). Ver el doc de pendientes.

## 5. La escalera (cómo se calcula la comisión)

La comisión recurrente del mes = **# de negocios activos del vendedor × el monto del tramo** donde cae ese
número. La escalera la define el SuperAdmin en **Configuración** (p.ej. `0–9 → $0 · 10–24 → $30 · 25+ → $50`).
Se recalcula **a diario por un cron** (refleja los activos actuales) y se puede **forzar con "Recalcular mes"**.
Además, cualquier acción de Negocios que cambie los activos (reasignar, suspender, reactivar, cancelar, marcar
pagado) **redispara el devengo al instante**, para que la comisión no se quede desfasada.

## 6. Cómo se ve

Al abrir un vendedor, su **detalle ocupa toda la pantalla** (master-detail, no modal): a la izquierda su
identidad + KPIs (en cartera / activos); a la derecha **pestañas**:

- **Cartera** — sus negocios (estado de pago, próximo cobro). *(El vendedor la ve en "Mi cartera", no aquí.)*
- **Comisiones** — estado de cuenta: **Devengado / Pagado / Pendiente** + la lista por mes (con el desglose
  `# activos × $monto · escalón`). El super tiene el botón **Recalcular mes**.
- **Pagos** — los datos de cobro + la **bitácora de egresos**; el super tiene **Registrar pago** (que netea el
  efectivo que el vendedor debe).
- **Efectivo** — el corte de caja (por entregar · cobrado · entregado · descontado) + la bitácora de
  movimientos; super/gerente tienen **Registrar movimiento** (cobro / entrega).

## 7. Registrar un pago (con neteo)

Solo el **SuperAdmin**. Abre "Registrar pago" en un vendedor → **marca las comisiones pendientes** que cubre →
el diálogo muestra el desglose **comisiones − efectivo que debe = neto a pagar** → método/fecha/nota → **adjunta
la foto** del comprobante → guarda. Las comisiones marcadas pasan a **pagadas**, se **descuenta** (compensa) lo
que el vendedor debía de efectivo, y el egreso entra a la bitácora **por el neto** (si el neto es $0 porque la
deuda cubrió toda la comisión, no hay egreso, solo la compensación).

## 8. Datos de cobro

Dónde se le paga al vendedor: **transferencia** (banco + CLABE de 18 dígitos + titular) o **efectivo**. Los ve
el **super** (para pagar) y el **propio vendedor**; el **gerente no** (dato sensible, no paga). En v1 los
captura el super (para tenerlos a la mano aunque el vendedor no entre al Panel).

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
| `services/admin/comisiones-devengo.service.ts` | **Motor B + C**: `devengarPeriodo` (activos → escalón → upsert comisión del mes, idempotente) · `devengarComisionAlta` (pieza C: pago único al primer pago real, idempotente por negocio) · `escaleraActual` · `dispararDevengoMesActual`. |
| `services/admin/comisiones-liquidacion.service.ts` | **Acciones E**: `generarUrlComprobante` (R2 presigned) · `registrarPago` (transacción: **netea el efectivo que el vendedor debe** → egreso por el neto + marca comisiones pagadas + movimiento de compensación) · `obtenerDatosCobro`/`guardarDatosCobro`. |
| `services/admin/comisiones-efectivo.service.ts` | **Pieza D**: `saldoEfectivo` (cobros − entregas − compensaciones) · `registrarMovimientoManual` (cobro/entrega, super+gerente con alcance) · `registrarCobroEfectivo` (automático, best-effort, aún **sin enganchar**). |
| `controllers/admin/vendedores.controller.ts` · `routes/admin/vendedores.routes.ts` | Endpoints (montados con `requierePanel` por ruta, antes del gate global). |
| `cron/comisiones-devengo.cron.ts` | Devengo del mes en curso cada 24h. |

**Frontend** (`apps/admin/src`)

| Archivo | Rol |
|---|---|
| `components/vendedores/SeccionVendedores.tsx` | Lista de la red (super/gerente) y "Mi cartera/comisiones" (vendedor). Abre el detalle full-width. |
| `components/vendedores/DetalleVendedor.tsx` | Vista master-detail + pestañas (`SeccionComisiones`, `SeccionPagos`, cartera). Exporta `CuerpoCartera`. |
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
- **`embajador_comisiones`** — **monto fijo** (sin `porcentaje`/`monto_base`): `monto_comision`, `tipo`
  (`alta`/`recurrente`), `estado` (pendiente/pagada/cancelada), **`periodo`** ('YYYY-MM'), **`detalle`** (jsonb:
  `{activos, montoUnitario, escalon}`), **`pago_id`**, `pagada_at`. `negocio_id` **nullable** (recurrente va sin
  negocio). Índice único parcial `(embajador_id, periodo)` para recurrente.
- **`pagos_vendedor`** (nueva) — egresos: `monto`, `metodo`, `fecha_pago`, `periodo`, `nota`,
  `comprobante_url`, `registrado_por`. Registrada en `IMAGE_REGISTRY`.
- **`vendedor_datos_cobro`** (nueva) — 1 por vendedor: `metodo`, `banco`, `clabe`, `titular`, `nota`.
- **`efectivo_movimientos`** (nueva, migración `2026-06-17-efectivo-movimientos.sql`) — libro del efectivo que el
  vendedor te debe: `tipo` (cobro/entrega/compensacion), `monto`, `negocio_id` (en cobro), `pago_id` (en
  compensación), `fecha`, `registrado_por`, `nota`. Saldo = Σ cobros − Σ (entregas + compensaciones).
- **Comisión de alta (C):** vive en `embajador_comisiones` con `tipo='alta'`, `negocio_id` lleno, `periodo` null;
  monto desde `comision_alta_monto` (Configuración, $400). Idempotente: una por negocio.

## D. Reglas clave

- **"Activo" = `estado_admin='activo'` AND membresía `al_corriente`/`en_gracia`** — idéntico en cartera (SUB_ACTIVOS)
  y en el motor de devengo (no usar la columna legacy `negocios.activo`, que puede desincronizarse).
- **Idempotencia del devengo:** índice único parcial + UPSERT; nunca pisa una comisión **pagada**.
- **La escalera vive en Configuración** (`comision_escalera`, leída con `obtenerConfigJson`); aquí solo se lee.
- **Sincronización:** las acciones de Negocios invalidan `queryKeys.vendedores` (front) y llaman
  `dispararDevengoMesActual` (back).
- **Comisión de alta (C):** se devenga al **primer pago real** del negocio (webhook Stripe `esCobroReal`, alta
  manual no-cortesía, "marcar pagado"), donde se sella `fecha_primer_pago`. Idempotente (una por negocio).
- **Neteo (D):** `registrarPago` lee el `saldoEfectivo` del vendedor y compensa `min(bruto, deuda)`; el egreso es
  el **neto**; la compensación baja la deuda. El cálculo lo hace el **backend** (la UI solo lo previsualiza).

## E. Estado de verificación

- `tsc` API + builds del Panel ✅. Harness `probar-comisiones-devengo.ts` (B, cálculo + idempotencia) TODO VERDE.
- Harness `probar-neteo-efectivo.ts` (D, neteo end-to-end: 2 casos + limpieza) **TODO VERDE**. Migraciones
  `2026-06-17-...-fase2.sql` y `2026-06-17-efectivo-movimientos.sql` corridas en **dev y prod**.
- Persistencia de pagos/datos de cobro: probar desde el Panel (registrar pago real).

## F. Referencias

- [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md) — backlog (C, D, F) + decisiones.
- [`Configuracion.md`](Configuracion.md) — la **escalera** que alimenta el devengo.
- [`Suscripciones.md`](Suscripciones.md) — la bitácora gemela (ingresos).
- [`Equipo_y_accesos.md`](Equipo_y_accesos.md) — quién crea/revoca los vendedores (frontera identidad↔operación).
