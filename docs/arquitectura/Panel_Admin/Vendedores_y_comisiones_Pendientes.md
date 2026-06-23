# Vendedores y comisiones — Pendientes (checklist del módulo)

> **Qué es este documento:** lo que **falta** por hacer en el módulo "Vendedores y comisiones" (módulo 6)
> del Panel Admin, y la **Fase 0 (Definir)** del carril mientras se construye. Lo ya terminado (qué ES y
> cómo funciona) vivirá en el documento hermano **`Vendedores_y_comisiones.md`** (se escribe al cerrar, Fase 3).
>
> **Regla de oro:** cuando un pendiente se termina, se **borra de aquí** y, si cambió el comportamiento,
> se documenta en `Vendedores_y_comisiones.md`. Uno se vacía, el otro crece.
>
> **Proceso:** carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
> (0 Definir → 1 VER → 2 ACTUAR → 3 Cerrar). **Plantilla de oro: Negocios.**
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · ✅ hecho · 🔵 propuesta (a confirmar con Juan)
>
> **Última actualización:** 23 Junio 2026 — **enlistados 2 features de territorio pedidos por Juan:** Pieza **F**
> precisada (agregar/quitar ciudades a un vendedor, incl. de otra región) + nueva Pieza **G · Mapa de territorios +
> CRM de campo** (el gerente zonifica la ciudad y asigna; el vendedor deja marcas de "ya pasé"). Ambas diferidas/post-beta
> (ver §Backlog y §Desglose de piezas). · 19 Junio 2026 — **D16/D16.1 HECHO** (Sprint Stripe · Pieza 3): el devengo recurrente (B) pasó a **"al cobro"** (anti-doble-pago del prepago; foto mensual retirada). · 17 Jun — **v1 + 2ª pasada COMPLETOS (piezas A · B · C · E · D).** Cartera (VER)
> + devengo recurrente (escalera) + **comisión de alta (C)** + liquidación con foto-comprobante + **cortes de
> efectivo con neteo (D)**. Migraciones corridas en **dev y prod**. Builds verdes; harness de devengo y de
> **neteo** TODO VERDE. Lo construido vive en **[`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md)**.
> **Queda diferido:** cobro automático de efectivo, datos de cobro por el propio vendedor, F (cobertura avanzada).

---

## Estado del módulo

**COMPLETO — piezas A · B · C · E · D (17 Jun 2026).** El módulo más grande del Panel opera de punta a punta
(detalle en [`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md)):
- **A · Cartera** — la red de ventas + la cartera de cada vendedor (vista master-detail full-width).
- **B · Devengo** — comisión recurrente = # activos × monto del escalón de la **escalera** (editable en
  Configuración); cron diario + botón "Recalcular mes" + estado de cuenta; redisparo al cambiar negocios.
- **C · Comisión de alta** — pago único ($400 configurable) al **primer pago real** del negocio; idempotente
  (una por negocio); se devenga sola en webhook / alta manual / "marcar pagado".
- **E · Liquidación** — registrar pago (marca comisiones pagadas + foto-comprobante a R2) + datos de cobro
  (CLABE) + bitácora de egresos.
- **D · Cortes de efectivo + neteo** — libro `efectivo_movimientos` (cobro/entrega/compensación); corte de caja
  por vendedor; al pagarle comisión se **descuenta** lo que debe (neteo). Harness `probar-neteo-efectivo.ts` ✅.

**Falta del módulo (diferido):** cobro automático de efectivo, datos de cobro por el propio vendedor, y la
cobertura avanzada (F). Ver §Backlog y el checklist.

**Frontera con "Equipo y accesos" (ya decidida):** **Equipo = identidad/acceso** (crear/promover/revocar
cuentas internas, asignar la cobertura **inicial** del vendedor). **Vendedores y comisiones = operación/nómina**
(cartera, devengo de comisiones, liquidación/pagos, cortes de efectivo, desempeño). Aquí **no se crea ni se da
de baja** a nadie: se opera al vendedor ya creado.

---

## La foto del módulo: dos mitades contables

El módulo es el **CRM + nómina** de la red de ventas. Tiene una **simetría con Suscripciones**: aquélla es la
bitácora de **ingresos** (lo que los negocios te pagan, `eventos_pago`/`pagos_membresia`); ésta incluye la
bitácora gemela de **egresos** (lo que tú le pagas a los vendedores).

- **Devengo** — *cuánto gana* el vendedor: **comisión de alta** (pago único al concretar una venta) +
  **comisión recurrente** mensual (escalera por # de activos → **monto fijo**, recalculada cada mes).
- **Liquidación** — *cuánto se le paga*: **datos de cobro** del vendedor (transferencia o efectivo) +
  **registrar pago** + **bitácora contable** de pagos realizados.
- **Cartera** (base de lectura): los negocios que el vendedor firmó, con vencimientos y contacto.
- **Efectivo por entregar** (Camino B): el flujo **inverso** — lo que el vendedor **te debe entregar** del
  efectivo que cobró; cortes de caja, confirmación de entrega, faltantes.

> ⚠️ **Dos efectivos opuestos, no confundir:** (a) el que el vendedor **te ENTREGA** (cobró membresías en
> efectivo → te debe ese dinero, pieza D) y (b) la comisión que tú le **PAGAS** (pieza E). Se **rastrean
> separados** (cada cobro le carga la deuda completa), pero al **liquidar** la comisión se **netean**: se
> descuenta lo que debe y se le entrega el neto (decisión 17 Jun, ver D15). El neteo lo calcula el backend.

---

## Desglose de piezas

| Pieza | Qué es | Mitad | Riesgo |
|---|---|---|---|
| **A · Cartera del vendedor** (VER) | El vendedor ve sus negocios firmados / vencimientos / contacto; gerente ve la de su equipo; super ve todo. Solo lectura, calca Negocios. | base | 🟢 bajo |
| **B · Escalera + comisión recurrente** | Escalera (tramos por # activos → monto fijo) + recálculo mensual. "Activo = al corriente o en gracia". | devengo | 🟠 medio |
| **C · Comisión de alta** | Pago único al concretar una venta (tarjeta pagada o efectivo confirmado). | devengo | 🟠 medio |
| **D · Efectivo / cortes de caja** (Camino B) | "Efectivo por entregar", registrar cobros/entregas, corte por vendedor; al pagar comisión se **netea** lo que debe (no se condiciona, se descuenta). | inverso | 🟠 medio |
| **E · Liquidación: datos de cobro + pagos + bitácora** | Datos de cobro del vendedor (transferencia/efectivo) + registrar pago + libro mayor de egresos. | liquidación | 🟠 medio |
| **F · Cobertura avanzada (territorio por ciudades)** | Multi-región parcial, multi-gerente, "mover de región = soltar cartera". **Incluye (Juan 23 jun): agregar/quitar ciudades sueltas a un vendedor y asignarle ciudades de OTRA región.** | transversal | 🔴 **alto** (reescribe `panel.middleware` + Negocios/Usuarios/Suscripciones/Equipo, 4 módulos cerrados) |
| **G · Mapa de territorios + CRM de campo** 🔵 | (G.1) el **gerente fragmenta el mapa de la ciudad en zonas** y asigna cada una a un vendedor → control de quién cubre qué parte. (G.2) el **vendedor deja marcas/pines** donde ya pasó (visitas/prospección), como mini-CRM de campo. Reusa el mapa MapLibre de Ciudades. | transversal | 🔴 **alto** (geometría/polígonos + modelo de datos nuevo + UI de mapa editable) |

> **Alcance de v1 (confirmado 16 Jun):** **A + B + E** (cartera + comisión recurrente + liquidación).
> **C** (comisión de alta) y **D** (cortes de efectivo) van en una **2ª pasada**. **F** (cobertura avanzada)
> queda **diferida** (D10). **Orden de construcción: A → B → E.**

---

## Fase 0 — Mini-spec

### Qué hace
- **Cartera:** ver los negocios atribuidos a cada vendedor (`negocios.embajadorId`), su estado de membresía
  y vencimiento, con alcance por rol.
- **Devengo de comisiones:** calcular lo que cada vendedor gana — comisión de alta (única) + recurrente
  mensual por **escalera de monto fijo** sobre sus **activos** del mes.
- **Liquidación:** guardar los **datos de cobro** del vendedor, **registrar los pagos** que se le hacen
  (transferencia/efectivo) y llevar la **bitácora contable** de esos egresos.
- **Efectivo (Camino B):** registrar el efectivo **por entregar** a nombre del vendedor, **confirmar la
  entrega**, y liberar la comisión condicionada; corte de caja por vendedor.
- **Estado de cuenta** del vendedor: devengado vs pagado vs pendiente.

### Qué NO hace (fronteras con otros módulos)
- **No crea / promueve / da de baja** cuentas internas → eso es **Equipo y accesos**.
- **No fija el precio de la membresía** ni gestiona los ingresos → eso es **Suscripciones / Configuración**.
- **No registra lo que pagan los negocios** (bitácora de ingresos) → eso ya vive en **Suscripciones**.
- **No crea / agrupa regiones ni ciudades** → eso es **Ciudades**.
- **No construye el demo de Business Studio** del vendedor → módulo demo (diferido).
- **No es el mapa de territorios v2** (zonas dibujadas, prospectos, mini-CRM) → **Pieza G** (diferida; ver §Backlog).
- **(Propuesta) No rehace el modelo de cobertura avanzado** (multi-región/multi-gerente) en v1 → ver D10.

### Matriz de permisos por rol
Leyenda: **Total** = toda la plataforma · **Su equipo / región** = solo lo de su región · **Las suyas** = solo lo propio · **—** = sin acceso

| Acción | SuperAdmin | Gerente Regional | Vendedor |
|---|---|---|---|
| Ver cartera y comisiones | Total | Su equipo | Las suyas |
| Fijar la escalera / montos de comisión | ✅ | — (solo ve) | — |
| Registrar un pago a un vendedor | ✅ (cualquiera) | — (solo da seguimiento) | — |
| Confirmar entrega de efectivo | ✅ (cualquiera) | ✅ (sus vendedores) | — |
| Ver/usar los datos de cobro | ✅ (lectura + captura por el vendedor) | — | ✅ edita **los suyos** |
| Ver la bitácora de pagos | Total | Su equipo | Los suyos |

> Base: matriz maestra de `Panel_Admin.md` ("Vendedores y comisiones": Super **Total (fija montos)** ·
> Gerente **Su equipo, NO fija montos** · Vendedor **Las suyas"**). Regla de fondo: **el dinero (escalera,
> montos) lo fija solo el SuperAdmin**; el Gerente da seguimiento y confirma efectivo de **sus** vendedores.

---

## Fase 0 — Decisiones de diseño (con recomendación)

| # | Decisión | Recomendación | Estado |
|---|---|---|---|
| **D1** | Comisión recurrente: ¿% o monto fijo? | **Monto fijo** por escalón (más claro de comunicar y blinda el costo si sube el precio de la membresía). | ✅ decidido (visión) |
| **D2** | ¿Qué cuenta como "activo" para la escalera? | **Membresía al corriente O en gracia.** `suspendido`/`cancelado` no cuenta. Cálculo automático (pagó = cuenta). | ✅ decidido (visión) |
| **D3** | `embajadores`: porcentajes viejos | **Quitar** `porcentaje_primer_pago` y `porcentaje_recurrente`. Mantener `codigo_referido`, `estado`. `negocios_registrados`: **calcular en vivo** (count de atribuidos) en vez de guardar, para no desincronizar. | ✅ decidido (16 Jun) |
| **D4** | `embajador_comisiones`: modela % | **Ajustar a monto fijo.** Quitar/ignorar `porcentaje`; dejar `monto_comision`, `tipo` (alta/recurrente), `estado` (pendiente/pagada/cancelada), `pagada_at`. Una fila = una comisión devengada. | ✅ decidido (16 Jun) |
| **D5** | ¿Cómo se genera la comisión recurrente del mes? | **Cron mensual** que, por vendedor, cuenta sus activos, ubica el escalón y escribe la fila de comisión del periodo. + **recálculo manual** desde el Panel. | ✅ decidido (16 Jun) |
| **D6** | Liquidación: tabla de egresos | **Tabla nueva `pagos_vendedor`** (vendedor_id, monto, método [transferencia/efectivo], fecha_pago, registrado_por, nota, periodo). Un pago marca como `pagada` las comisiones que cubre (por selección o por rango). | ✅ decidido (16 Jun) |
| **D7** | Datos de cobro del vendedor | Guardar método **transferencia** (banco + CLABE + titular) **o efectivo**. **Enmascarado** en lectura (últimos 4); **editable solo por el dueño** (super/gerente lo consultan). ¿Columnas en `embajadores` o tabla `vendedor_datos_cobro`? → tabla aparte (dato sensible, aislado). | ✅ decidido (16 Jun) |
| **D8** | Dos efectivos (entrega vs pago) | **Modelar separados** (pieza D ≠ pieza E). Netear es operativo, no contable. | ✅ decidido (visión) |
| **D9** | ¿Migración SQL? | **Sí** (rediseñar `embajadores`/`embajador_comisiones`, crear `pagos_vendedor` y `vendedor_datos_cobro`, secuencia/índices). **La corre Juan** en sus 2 Supabase (dev+prod); Claude deja el SQL listo. | ✅ decidido (16 Jun) |
| **D10** | Cobertura avanzada (territorio) | **Diferirla** de v1: construir el motor de comisiones sobre el modelo actual ("vendedor de UNA región", trigger + `LIMIT 1` se quedan). Multi-región/multi-gerente/mover-con-reasignación = sub-proyecto aparte cuando haya varios vendedores. Menor riesgo, no toca módulos cerrados. | ✅ decidido (16 Jun) |
| **D11** | ¿Dónde se edita la escalera? | **En el módulo Configuración** (módulo 9), que centraliza TODOS los valores dinámicos del negocio (precio membresía, escalera, gracia, trial). Vendedores solo la **LEE** con `obtenerConfig()`. *(Revisado 17 Jun: antes se pensó editarla aquí; se movió a Configuración por centralización; por eso la **Fase 2 de este módulo queda en pausa** hasta que la escalera sea configurable.)* | ✅ decidido (17 Jun) |
| **D12** | Auditoría | Toda acción de dinero (fijar escalera, registrar pago, confirmar entrega) → `registrarAuditoria` → `admin_auditoria`. Obligatorio por carril. | ✅ decidido (carril) |
| **D13** | Patrón de la ficha: ¿modal o vista? | **Vista de detalle full-width (master-detail), NO modal** — el módulo es data-heavy (cartera + comisiones + pagos + cortes). Al abrir un vendedor, su detalle **reemplaza la lista** con botón "Volver" + `useBackNativo`; la cartera **pagina** y llena el alto con scroll interno. Modales reservados solo para **acciones**. Estrenado aquí; documentado en `Tokens_Panel.md` §5. | ✅ decidido (17 Jun) |
| **D14** | ¿Dónde vive la cartera del **vendedor** (su autovista)? | **No se duplica.** El vendedor ve la lista de sus negocios en **"Mi cartera"** (sección Negocios, su etiqueta de rol); en **"Mis comisiones"** su vista arranca en **Comisiones/Pagos/Efectivo** — **sin** la pestaña "Cartera". El **super/gerente** sí ven la cartera en el **detalle** de cada vendedor (no la tienen en otro lado). Implementado con `vistaVendedor` en `CuerpoCartera`. | ✅ decidido (17 Jun) |
| **D15** | Pieza D: ¿comisión condicionada a la entrega, separada, o neteada? | **Neteada (opción C).** No se condiciona ni se mezcla antes: cada cobro en efectivo le carga la deuda completa, y **al liquidar la comisión** se descuenta `min(comisión, deuda)` y se le paga el **neto**. Protege la caja sin congelar comisiones por faltantes chicos. Lo hace `registrarPago` (backend, fuente de verdad). | ✅ decidido (17 Jun) |
| **D16** | Comisión recurrente: ¿foto mensual o **devengo al cobro**? | **Devengo AL COBRO por periodo pagado (Opción A, 17 jun).** Cuando un negocio paga N meses, el vendedor devenga `N × (monto del escalón vigente)` **de golpe** (no goteando mensual). **El escalón sigue por # de negocios activos** (un negocio = **1**, pague 1 o 12 meses). Recompensa el prepago al instante + blinda al vendedor si se va (ya ganó lo que el negocio pagó). Cambia el motor: de "snapshot mensual (cron)" a "devengo por cobro". Se construyó en el **Sprint de Stripe · Pieza 3** (junto a cobro día-1). | ✅ **hecho** (19 jun) |
| **D16.1** | Opción A — ¿cómo NO pagar doble un prepago? | **Desacoplar escalón y pago.** (a) **Escalón** = # de negocios activos del mes (el prepagado cuenta como 1 cada mes que siga vigente → aporta al nivel, no es pago). (b) **Pago** = cada negocio lleva un marcador **"comisión devengada hasta [mes]"**; al pagar N meses se devengan de golpe y el marcador salta a "mes+N". En los meses siguientes, si el marcador ya cubre el mes, **no se devenga de nuevo** (el negocio sigue contando para el escalón, pero no genera pago). El **escalón se congela al momento del cobro**. Técnico: columna/registro "devengado hasta" por negocio + motor por meses-no-cubiertos (no foto mensual). | ✅ **hecho** (19 jun, Pieza 3) |
| **D17** | Liquidación: ¿pago completo o **abonos**? | **Abonos (Liquidación v2, 17 jun).** El super abona contra el **saldo** (comisiones pendientes − efectivo que el vendedor debe): puede pagar **parcial**, **dividir** en transferencia+efectivo y dejar saldo **pendiente**. Se aplica **FIFO** (la más antigua primero); `monto_pagado` por comisión (parcial → pagada). Migración `monto_pagado`. | ✅ **hecho** (17 jun) |

---

## Fase 0 — Criterios de aceptación (Definición de Terminado) · *esbozo, se afina al cerrar Puntos a confirmar*

**Lectura — Cartera (Gate 1 ✅ — verificado con harness `probar-vendedores-lectura.ts` + builds, 16 Jun 2026):**
- [x] **A1** — Super ve la cartera de todos los vendedores; gerente solo la de **su equipo** (su región); vendedor solo **la suya**. Llamada fuera de alcance → 404/filtrado. ✓ (14 bloques del harness: super/gerente/vendedor, defensas, lente de región, cartera ajena → null).
- [x] **A2** — Cada vendedor muestra # de negocios **en cartera** y # **activos** (al corriente/gracia), código de referido, región y ciudades. ✓ (JUAN01 = 5 en cartera / 5 activos). *(El estado de cuenta de comisiones —escalón, devengado, pagado, pendiente— llega con el motor en Fase 2.)*
- [x] **A3** — El vendedor ve **su propia cartera** a pantalla completa ("Mis comisiones"); abrir la de otro → 404. ✓ harness. *(Los datos de cobro de la pieza E son Fase 2.)*

**Acción (Gate 2):**
- [ ] **A4** — La comisión recurrente del mes se **calcula sola** (cron) por # de activos según la escalera; al cambiar la escalera, recalcula a futuro sin tocar lo ya pagado.
- [ ] **A5** — Registrar un pago a un vendedor (transferencia/efectivo) **marca las comisiones cubiertas como pagadas** y deja la entrada en la **bitácora de pagos**.
- [ ] **A6** — Confirmar la **entrega de efectivo** del vendedor (Camino B) **libera su comisión** condicionada; un faltante queda a su nombre.
- [ ] **A7** — Solo el **SuperAdmin** edita la escalera/montos; gerente solo ve. El backend valida el alcance (no confía en la UI).
- [ ] **A8** — Toda acción de dinero → `admin_auditoria` (actor, antes/después). · `tsc` + builds en verde.

---

## ✅ Puntos confirmados con Juan (16 Jun 2026)

> Juan: *"estoy de acuerdo con todo lo que propusiste."* Quedan fijados así:

1. **Arranque:** por **A · Cartera (VER)** — bajo riesgo, calca Negocios, VER antes de ACTUAR.
2. **Cobertura avanzada (D10):** **diferida** — el motor de comisiones se construye sobre el modelo actual
   ("vendedor de UNA región"); el trigger y el `LIMIT 1` se quedan. Sub-proyecto aparte cuando haya varios vendedores.
3. **Alcance de v1:** **A + B + E** (cartera + comisión recurrente + liquidación). **C** (comisión de alta) y
   **D** (cortes de efectivo) en **2ª pasada**.
4. **Permisos en pagos** *(resuelto por Claude — confirmar si difieres):* **registrar pagos de comisión = solo
   SuperAdmin** (es tesorería de AnunciaYA; "el dinero lo mueve el super"). El **gerente solo da seguimiento**
   (ve devengado/pendiente de su equipo) y **confirma entregas de efectivo** de sus vendedores (pieza D), pero
   **no ejecuta pagos**. Los **datos de cobro** los ve **solo el super** (dato sensible; el gerente no paga).
5. **Captura de datos de cobro** *(revisado 17 jun):* los captura/edita **SOLO el propio vendedor** (es su dato
   bancario; que el super lo edite abriría un vector de fraude → desviar pagos). El **super** solo los **ve**
   para pagar; el gerente ni los ve. *(Antes el super también editaba "por si el vendedor no entra al Panel"; se
   quitó al darle al vendedor la captura de sus datos desde "Mis comisiones".)*
6. **Escalera (D11):** se **edita aquí** (sección "Escalera") y Configuración la lee. **Los montos/tramos
   iniciales se definen al construir la pieza B** — no bloquean el arranque por Cartera.
7. **`negocios_registrados` (D3):** **calculado en vivo** (count de atribuidos), no guardado.

---

## Checklist del carril

```
### Módulo: VENDEDORES Y COMISIONES   ·   A·B·C·E·D CERRADO

Fase 0 — Definir ✅   ·   Fase 1 — VER (A · Cartera) ✅

Fase 2 — ACTUAR ✅ (B · C · E · D)
- [x] B · Devengo — motor (devengarPeriodo, escalera de Configuración, idempotente) + cron + recálculo +
      estado de cuenta. Harness probar-comisiones-devengo.ts TODO VERDE.
- [x] B · Fix — contar activos por estado_admin='activo' (igual que la cartera), no por la columna legacy `activo`.
- [x] C · Comisión de alta — devengarComisionAlta (pago único al primer pago real, idempotente por negocio);
      enganchada en webhook Stripe + alta manual + "marcar pagado"; monto comision_alta_monto ($400) en Configuración.
- [x] Sincronización — invalidar vendedores al cambiar negocios (cache RQ) + dispararDevengoMesActual (back).
- [x] E · Liquidación — registrarPago + datos de cobro + bitácora; permisos por rol. Frontend: pestaña Pagos + diálogos.
- [x] E2 · Liquidación v2 (ABONOS) — registrarPago a abonos: parcial + dividido (transferencia+efectivo) + neteo,
      aplicado FIFO sobre `monto_pagado` (parcial→pagada). Diálogo "Registrar abono" + badge "Parcial". Datos de
      cobro: solo el vendedor edita (super solo lee). Cobro automático de efectivo enganchado (vendedor cobra → deuda).
      Harness probar-abonos.ts TODO VERDE. Migración 2026-06-17-comision-monto-pagado.sql (aplicada dev + prod, 20 jun).
- [x] D · Cortes de efectivo + neteo — efectivo_movimientos; saldoEfectivo + registrarMovimientoManual (super/gerente);
      registrarPago NETEA (bruto − deuda = neto); pestaña Efectivo + desglose en Registrar pago.
      Harness probar-abonos.ts (cubre el neteo) TODO VERDE. Migración 2026-06-17-efectivo-movimientos.sql (dev + prod).
- [x] tsc API + builds del Panel en verde.

Fase 3 — Cerrar
- [x] Doc canónico Vendedores_y_comisiones.md (2 capas, A·B·C·E·D + abonos v2)
- [x] Índices (tablero, memoria)
- [x] Commits a main (B/C/E/D, Liquidación v2 abonos, cobro automático, datos de cobro seguros, fix comisión de alta).

### Backlog (diferido)
- ✅ **Comisión recurrente "al cobro" (Opción A, D16/D16.1) — HECHA (19 jun, Sprint Stripe · Pieza 3).** El devengo
  recurrente pasó de "foto mensual (cron)" a **al cobro, por negocio**: `meses pagados (dinero ÷ precio) × escalón
  congelado`, con marcador `negocios.comision_devengada_hasta` (anti-doble-pago del prepago: un anual = 10× una vez;
  el negocio sigue contando como activo). Cron retirado. Harness `probar-comision-al-cobro.ts` TODO VERDE. Detalle en
  [`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md) §4/§5 + apéndice y [`Sprint_Stripe.md`](Sprint_Stripe.md).
  Migración `2026-06-19-comision-al-cobro.sql` (aplicada **dev + prod**, 20 jun; validada E2E en la ronda). **Limpieza pendiente:** quitar el endpoint
  `/comisiones/recalcular` + su hook (quedaron huérfanos al retirar la foto mensual).
- **F · Cobertura avanzada del vendedor (territorio por ciudades)** — diferida (D10). Multi-región / multi-gerente /
  "mover de región = soltar cartera". **Detalle pedido por Juan (23 jun):** poder **agregar o quitar ciudades** a un
  vendedor y **asignarle ciudades de otra región** (cobertura multi-región parcial). Hoy el modelo asume "vendedor de
  UNA región" (trigger + `LIMIT 1` en `panel.middleware`); esto lo reescribe + toca Negocios/Usuarios/Suscripciones/Equipo.
- 🔵 **G · Mapa de territorios + CRM de campo** (NUEVO, pedido por Juan 23 jun) — reusa el mapa MapLibre del módulo Ciudades:
  - **G.1 · Zonas del gerente:** el gerente **fragmenta el mapa de la ciudad en sectores** (los que quiera — ej. 4 vendedores
    → 4 zonas) y **asigna cada zona a un vendedor**, para controlar quién cubre qué parte de la ciudad. Granularidad
    **intra-ciudad** (más fina que la actual, que es por ciudad completa). Requiere dibujar/persistir polígonos + asignación zona↔vendedor.
  - **G.2 · Marcas del vendedor:** el vendedor **deja pines/señales** en los lugares **por donde ya pasó** (negocios visitados,
    prospectos, "ya cubierto"), como **mini-CRM de campo geolocalizado**.
  - Riesgo 🔴 alto: geometría (polígonos/GeoJSON, ¿PostGIS?), modelo de datos nuevo (zonas, asignaciones, marcas) y UI de mapa
    editable. Es un **sub-proyecto propio** (Fase 0→3), **post-beta**.
```

---

## Referencias

- [`Panel_Admin.md`](Panel_Admin.md) — §Comisiones · §Motor de venta (Camino A/B) · §Schema relevante · matriz maestra.
- [`Equipo_y_accesos.md`](Equipo_y_accesos.md) + [`Equipo_y_accesos_Pendientes.md`](Equipo_y_accesos_Pendientes.md) — módulo hermano (la frontera identidad↔operación) y el **modelo de cobertura avanzado diferido** (§Diferido).
- [`Suscripciones.md`](Suscripciones.md) — la **bitácora de ingresos** (patrón a calcar para la de egresos: `eventos_pago`/`registrarPagoManual`).
- [`Negocios.md`](Negocios.md) + [`Negocios_Pendientes.md`](Negocios_Pendientes.md) — plantilla de oro (alta manual / Camino B ya construido).
- `apps/api/src/middleware/panel.middleware.ts` — resolución de región por rol (el `LIMIT 1` que D10 tocaría).
- `apps/api/scripts/seed-vendedor-prueba.ts` · `seed-gerentes-dev.ts` — cómo nacen hoy las cuentas internas.
