# Sprint de Stripe — doc maestro (orquestador)

> **Qué es este documento:** la **fuente de verdad del sprint de Stripe** — un sprint que **cruza
> varios módulos** (Suscripciones/Configuración, Pagos, Vendedores), por eso vive aparte y no dentro
> de un solo `_Pendientes.md`. Orquesta las **3 piezas** del sprint, su orden, sus decisiones (Fase 0)
> y sus criterios de aceptación.
>
> **Regla de oro:** cuando una pieza se termina, se **marca hecha aquí** y, si cambió el
> comportamiento, se documenta en **su módulo** (`../Pagos_Suscripciones.md`, `Suscripciones.md`,
> `Vendedores_y_comisiones.md`). Este doc **no** duplica la descripción del módulo: orquesta el sprint.
>
> **Proceso:** carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
> (Fase 0 Definir → 1 VER → 2 ACTUAR → 3 Cerrar), aplicado **por pieza**. Plantilla de oro: Negocios.
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · 🟡 a medias · ✅ hecho · 🚫 fuera de alcance
>
> **Última actualización:** 23 Junio 2026 — **Piezas 1, 2 y 3 CONSTRUIDAS y VALIDADAS E2E** en la **Ronda de
> Pruebas de Pagos** (22-23 jun, ver [`Ronda_Pruebas_Pagos.md`](Ronda_Pruebas_Pagos.md) — Stripe A–Z al 100%). Pieza 2 =
> cobro "día 1" para ventas por vendedor (sub sin trial + empuje a +44d). Pieza 3 = comisión recurrente "al cobro"
> (anti-doble-pago del prepago, foto mensual retirada). De la Pieza 1 nació el **módulo Recibos** ([`Recibos.md`](Recibos.md)).

---

## Estado del sprint

**PIEZAS 1·2·3 CONSTRUIDAS Y VALIDADAS E2E ✅ (cerrado 23 Jun 2026).** Fase 0 cerrada (ver §Decisiones). **Pieza 1**
validada E2E en TEST (18 jun). **Pieza 2** (cobro día-1) y **Pieza 3** (comisión al cobro) **validadas E2E por Juan**
en la **Ronda de Pruebas de Pagos** (22-23 jun: registro con `?ref=` + prepago anual con vendedor → alta $400 +
recurrente 9×$250) → [`Ronda_Pruebas_Pagos.md`](Ronda_Pruebas_Pagos.md) (bloques A–H + decisiones Z + las 22 OBS,
todo cerrado). La migración de la Pieza 3 (`2026-06-19-comision-al-cobro.sql`) está corrida en **dev y prod**
(validado 20 jun). Documentación de las 3 piezas: este doc + `../Pagos_Suscripciones.md` + `Vendedores_y_comisiones.md`.

> **Contexto de arranque:** el **valor** del precio ya se subió de $449 a $849 MXN en TODO el código
> (web: 3 constantes `PRECIO_COMERCIAL` + displays + i18n; admin: `PRECIO_MEMBRESIA` + placeholders;
> api: avisos) y en los docs vigentes. En Stripe **TEST** ya está el Price de $849
> (`price_1TjjgMDbqVqWBiz7Mg5RWqvI`) como default del producto `prod_TcFY6kI9RIuCf1`, con el Price
> viejo archivado. Existe `apps/api/scripts/crear-price-membresia.ts` (crea/reusa un Price sobre el
> mismo producto, lo hace default, archiva el viejo; idempotente; detecta TEST/LIVE por la llave).
> **Pendiente operativo:** poner `STRIPE_PRICE_COMERCIAL` en Render; y al lanzar en LIVE correr el
> script con la llave live. *(La Pieza 1 muda esta env a config en BD — ver DS1/DS2.)*

---

# Definición — Fase 0

## Mini-spec

**Qué hace el sprint (una carilla):** deja el **dinero de la membresía** gobernable sin tocar código y
prepara el cobro para la red de vendedores. Tres frentes:

1. **Precio centralizado + editable desde el Panel.** Un solo lugar para el monto ($849), consumido por
   la web, el admin y los avisos; y un **botón** (superadmin) que, al cambiar el precio, **crea el Price
   nuevo en Stripe** (mensual **y** anual), lo deja default y reapunta la config — todo de un clic, sin
   redeploy. Incluye el **plan anual en tarjeta** (self-service).
2. **Cobro "día 1" para ventas por vendedor.** Cuando hay vendedor (`?ref=` por tarjeta **o** alta
   manual), el comercio **paga $849 al inicio** y recibe **44 días** de servicio (30 + 14 de cortesía) →
   próximo cobro a los 44 días. El **auto-registro sin vendedor** mantiene el flujo actual (14 días
   gratis → cobra el día 15).
3. **Comisión recurrente "al cobro".** El vendedor devenga su comisión recurrente **por los meses que el
   negocio paga, al momento del cobro** (prepago de N meses → `N × escalón` de golpe), en vez del goteo
   mensual del cron. El escalón sigue por **# de negocios activos** (un negocio = 1, pague 1 o 12 meses).

**Qué NO hace (fuera de alcance — anotado, no escondido):**
- 🚫 **No baja el precio** de lanzamiento (no hay coupon de descuento de precio). El precio se queda
  **firme en $849**; las promos de apertura dan **tiempo** (cortesías), no rebaja (DS3).
- 🚫 **No construye promo-codes self-service** de meses gratis. Los meses gratis se dan como **cortesía
  desde el Panel**, que ya existe y funciona también con tarjeta (DS5).
- 🚫 **No construye rifas / intercambio comunitario.** Eso lo opera Juan **por fuera de la app**, manual;
  no toca código (DS6). *(La visión v3 ya había descartado Dinámicas/Rifas P2P dentro de la app por
  riesgo legal SEGOB; esto es marketing externo, no la sección descartada.)*
- 🚫 **No toca** trial ni gracia (ya cerrados en Configuración v1).

## Matriz de permisos (lo nuevo de este sprint)

| Acción | SuperAdmin | Gerente | Vendedor |
|---|:---:|:---:|:---:|
| Cambiar el precio de la membresía (botón que crea el Price) | ✅ | — | — |
| Dar cortesía (meses gratis) | ✅ | — | — |
| Registrar pago / cobro día-1 (efectivo) | ✅ | ✅ su región | ✅ alta manual |
| Recibir comisión recurrente al cobro | (devengo automático) | — | ✅ la suya |

> El **dinero lo fija solo el SuperAdmin** (precio, escalera, cortesías), coherente con la matriz
> maestra de `Panel_Admin.md`.

## Decisiones de diseño (Fase 0 — cerradas con Juan el 18 Jun 2026)

| # | Decisión | Resolución | Estado |
|---|---|---|---|
| **DS1** | ¿Cómo se enlaza "cambiar el monto en el Panel" con "crear el Price en Stripe"? | **Botón que automatiza el Price** desde el Panel (no script manual). Reusa la lógica de `crear-price-membresia.ts`. **Consecuencia obligada:** el Price ID se **muda de env var a config en BD** (un runtime no puede reescribir una env de Render); la env queda como **semilla/fallback** la 1ª vez. | ✅ decidido · ⏳ construir |
| **DS2** | ¿Dónde vive el monto para display/manuales? | Clave `precio_membresia_mxn` en `configuracion` (mismo patrón que `trial_duracion_dias`). Consumida por **admin** (reemplaza `PRECIO_MEMBRESIA`), **web** (vía **endpoint público** + i18n con interpolación `{{precio}}`) y **avisos**. Reemplaza las ~7 copias hardcodeadas. | ✅ decidido · ⏳ construir |
| **DS3** | ¿Precio de lanzamiento (rebaja)? | **DESCARTADO.** El precio se queda **firme en $849**. No hay coupon de descuento de precio. Las promos de apertura dan **tiempo**, no rebaja. | ✅ decidido |
| **DS4** | Plan anual (paga ~10, 12 meses): ¿qué canales? | **Manual + tarjeta.** En manual ya existe (`precioPorMeses(12)`). En **tarjeta** se construye: **Price anual nuevo** en Stripe (= 10× el mensual) + opción en el registro/checkout. | ✅ decidido · ⏳ construir (tarjeta) |
| **DS5** | Meses gratis de apertura: ¿cómo? | **Solo cortesía desde el Panel** (ya existe; empuja `trial_end` sin cobro, también con tarjeta). El **promo-code self-service queda descartado**. | ✅ decidido (cero trabajo) |
| **DS6** | Rifa / intercambio comunitario | **Fuera de la app.** Marketing externo que opera Juan manualmente. No se construye. | ✅ decidido |
| **DS7** | Mecanismo Stripe del cobro día-1 | Modelo decidido (paga $849 al inicio + 44 días → próximo cobro a 44d con vendedor; sin vendedor, flujo actual). El **cómo** en Stripe se valida con un **spike + Test Clock**, entre **(b)** sin trial: 1ª factura $849 hoy + ancla del ciclo a +44d / **(c)** `trial_end=+44d` + invoice $849 inmediata. **Descartado (a)** cargo one-time suelto (no dispara `invoice.payment_succeeded` → rompería el devengo de alta). Preferida: **(b)** (historial = invoices normales). | ✅ modelo decidido · ⏳ spike |
| **DS8** | Comisión recurrente al cobro: ¿en este sprint? | **Sí, como última pieza** (comparte el gancho "devengo al cobro" con el cobro día-1). Mecánica D16/D16.1 de `Vendedores_y_comisiones_Pendientes.md`. | ✅ decidido · ⏳ construir |
| **DS9** | Orden de construcción | **Pieza 1 (precio + Prices en BD + botón) → Pieza 2 (cobro día-1) → Pieza 3 (comisión al cobro).** | ✅ decidido |
| **DS10** | Estructura documental | **Doc maestro del sprint** (este archivo); cada pieza, al cerrar, actualiza **su módulo**. `Suscripciones_Pendientes.md` §Cierre de alcance apunta aquí. | ✅ decidido |

---

## Las 3 piezas

### Pieza 1 — Precio centralizado + Prices en BD + botón  *(arranque)*

> Las dos sub-partes están entrelazadas (el botón debe gestionar **ambos** Prices a la vez para que
> mensual y anual no se desincronicen), por eso van juntas.

- **1a · Monto en config (DS2).** Clave `precio_membresia_mxn` en `configuracion`. Reemplazar en
  **admin** (`PRECIO_MEMBRESIA` → lee config), **web** (endpoint público `GET /api/config/publico` +
  i18n interpolado) y **avisos**. Borrar las copias hardcodeadas.
- **1b · Prices en BD + plan anual (DS1, DS4).** Mudar el Price **mensual** de `env.STRIPE_PRICE_COMERCIAL`
  → config `stripe_price_comercial_id` (env como semilla). **Crear el Price anual** → `stripe_price_comercial_anual_id`.
  El checkout (`crearCheckoutSession`/`crearCheckoutUpgrade`) lee de config y ofrece **mensual / anual**.
- **1c · Botón "Cambiar precio" (DS1).** Endpoint admin (**solo superadmin**) que: (1) crea el/los Price(s)
  nuevo(s) reusando `crear-price-membresia.ts`, (2) los deja default + archiva los viejos, (3) escribe
  `precio_membresia_mxn` + los Price IDs en config. **Salvaguardas:** modal de confirmación fuerte,
  `registrarAuditoria`, idempotente (no crea Price si el monto no cambió), hereda TEST/LIVE por la llave,
  y advierte que **las suscripciones vigentes NO migran** (comportamiento normal de Stripe).

**Migración/seed:** filas nuevas en `configuracion` (no DDL): `precio_membresia_mxn`,
`stripe_price_comercial_id`, `stripe_price_comercial_anual_id`. One-shot, dev + prod.

### Pieza 2 — Cobro "día 1" (ventas por vendedor)  ✅ CONSTRUIDA (19 Jun)

**Mecanismo elegido (más simple que el spike b/c): sub SIN trial + empuje, reusando `empujarCobroSuscripcion`.**
El spike (`probar-cobro-dia1.ts` con Test Clock) confirmó el calendario (cobra hoy → +44d → cobra de nuevo, sin
extras). Construido:
- **Tarjeta:** si el registro trae `?ref=`, `crearCheckoutSession` **omite el trial** → cobra el día 0; luego
  `manejarCheckoutCompletado` **empuja el próximo cobro a `fin del periodo real + dias_cortesia`** (config, default
  14) → mensual = +44d, **anual = +1 año + cortesía** (se lee el periodo de Stripe, no se asume "1 mes").
- **Alta manual con vendedor:** vigencia `hoy + meses + cortesía` (modo "por meses", no cortesía) — el modal lo
  muestra explícito ("+14 días de cortesía por venta de vendedor → cubre hasta …").
- **Comisión de alta:** ya cae el día 0 sola (el `invoice.payment_succeeded amount>0` del cobro día-1) — no se tocó.
- **Sin vendedor:** intacto (trial de config → cobra el día 15).
- **Blindajes de carrera** (cobro día-1 ⇒ webhooks casi simultáneos): si `invoice.payment_succeeded` llega antes de
  crearse el negocio → **reintento** (no se pierde comisión/recibo); y `GREATEST` para que la fecha del invoice
  (+1 mes) **no pise** el +44d del empuje.

**Migración:** **ninguna** (usa Stripe + columnas existentes + la config `dias_cortesia_vendedor` con default 14).

### Pieza 3 — Comisión recurrente "al cobro" (D16 / D16.1)  ✅ CONSTRUIDA + GATE VERDE (19 Jun)

- Nuevo motor `devengarComisionRecurrenteAlCobro` (en `comisiones-devengo.service.ts`): en cada cobro real
  (webhook tarjeta / alta manual / "Registrar pago") devenga, por ESE negocio, **`mesesDevengables × escalón`** de
  golpe, donde **`mesesDevengables = dinero pagado ÷ precio mensual`** (un anual de 10× → 10, no 12) y el **escalón
  se congela** al # de activos del momento (guardado en `detalle`).
- **Anti-doble-pago del 1er mes:** en el **primer cobro** del negocio, si recibió **comisión de alta** (pago único
  que ya representa el 1er mes de membresía), se **descuenta 1 mes** del recurrente. Así un **anual con alta devenga
  9× + la alta**, no 10× + la alta — el primer mes no se paga dos veces. La alta se devenga **antes** que el
  recurrente en los 3 enganches para que el descuento la "vea".
- **Anti-doble-pago (cobertura):** marcador **`negocios.comision_devengada_hasta`**; si la cobertura del cobro ya
  está dentro, no re-devenga (idempotencia). El negocio prepagado **sigue contando como activo** para el escalón,
  pero no genera pago repetido.
- **Foto mensual RETIRADA:** el cron `comisiones-devengo.cron` ya no se inicializa y `dispararDevengoMesActual` es
  no-op (cambiar activos afecta el escalón de FUTUROS cobros, no re-devenga lo pagado).
- **Gate:** `probar-comision-al-cobro.ts` (anual **con alta → 9×** · idempotencia · renovación 1× · sin vendedor ·
  anual **sin alta → 10×**) **TODO VERDE**.
- **Frontend:** el estado de cuenta del vendedor pasa de "por mes" a "por cobro" (negocio + "N meses × $unitario ·
  escalón"); se retiró el botón "Recalcular mes".

**Migración:** `2026-06-19-comision-al-cobro.sql` (columna `comision_devengada_hasta` + quitar el único de periodo
+ relajar el CHECK `forma` a "recurrente ⇒ periodo NOT NULL"). Corrida en **dev y prod** (20 jun).

---

## Criterios de aceptación (Definición de Terminado)

**Pieza 1:** ✅ **COMPLETA Y VALIDADA E2E EN TEST (18 Jun 2026)**
- [x] ✅ El monto vive en `configuracion`; web, admin y avisos lo leen (no hay número hardcodeado).
- [x] ✅ El checkout lee el Price ID **de config** (no de env); la env solo siembra la 1ª vez.
- [x] ✅ El comercio puede elegir **mensual o anual** en el registro con tarjeta (anual = ~2 meses gratis).
- [x] ✅ El **botón** crea el/los Price(s), los deja default, archiva los viejos y reapunta config — **sin
  redeploy** — verificado en Stripe TEST con datos reales. Solo superadmin (otros rol → 403). Auditado.
- [x] ✅ Cambiar el precio **no** rompe las suscripciones vigentes (siguen en su Price); el modal lo advierte.
- [x] ✅ `tsc --noEmit` + builds (web + admin + api) verdes.
- [x] ✅ **Extra (fuera del plan original, pedido por Juan):** el **cobro con tarjeta emite comprobante** (recibo
  PDF + correo) **continuando el folio** de los manuales (fila `pagos_membresia` concepto `'tarjeta'`, sin gemelo
  `eventos_pago`; guards que impiden editar/anular ese pago). Nació el **módulo Recibos** para ver/buscar/descargar/
  reenviar los comprobantes ([`Recibos.md`](Recibos.md)). Migración `2026-06-18-concepto-tarjeta.sql` (Juan, dev+prod).

**Pieza 2:** ✅ **CONSTRUIDA + VALIDADA E2E (Ronda de Pagos A-Z, 22-23 jun)**
- [x] ✅ Un registro **con `?ref=`** (tarjeta) cobra **el día 0** y agenda el próximo cobro a **+44 días**
  (mensual) / **+1 año + cortesía** (anual) — calendario verificado con **Test Clock** (`probar-cobro-dia1`).
- [x] ✅ Un registro **sin vendedor** sigue con su trial de config y cobra después (sin cambios).
- [x] ✅ El **alta manual con vendedor** nace con vigencia `hoy + meses + cortesía` (el modal lo muestra explícito).
- [x] ✅ La **comisión de alta** se devenga al día 0 en tarjeta (sin tocar `devengarComisionAlta`). `tsc` verdes.
- [x] ✅ **Validación E2E (Ronda de Pagos, 22-23 jun):** registro real con `?ref=` + tarjeta → cobro hoy + próximo cobro +44d + comisión + recibo.

**Pieza 3:** ✅ **CONSTRUIDA + GATE VERDE + VALIDADA E2E (Ronda de Pagos A-Z, 22-23 jun)**
- [x] ✅ Al cobrar **N meses** (cualquier canal), el vendedor devenga `(dinero ÷ precio) × escalón` **de golpe**, y
  `comision_devengada_hasta` salta a la cobertura.
- [x] ✅ **El 1er mes no se paga dos veces:** en el primer cobro, si hubo **comisión de alta**, el recurrente
  **descuenta 1 mes** (un anual con alta = **9× + alta**, no 10× + alta).
- [x] ✅ En meses ya cubiertos **no** se vuelve a devengar (el negocio sigue contando para el escalón).
- [x] ✅ El escalón usado queda **congelado** al cobro (no cambia si la escalera sube después).
- [x] ✅ Harness `probar-comision-al-cobro.ts` (anual con alta → **9×** · idempotencia · renovación · sin vendedor · anual sin alta → 10×) TODO VERDE. `tsc` verdes.
- [x] ✅ **Validación E2E (Ronda de Pagos, 22-23 jun):** un prepago anual real con vendedor → ver **9× + la alta** (no 10× + alta) en el estado de cuenta del vendedor.

---

## Checklist del carril

```
### Sprint: STRIPE   ·   Piezas 1·2·3 ✅ CONSTRUIDAS + VALIDADAS E2E (Ronda A-Z, 22-23 jun)

Fase 0 — Definir ✅ (18 Jun 2026)
- [x] Mini-spec (qué hace / qué no / matriz de permisos)
- [x] Decisiones DS1–DS10 cerradas con Juan
- [x] Criterios de aceptación por pieza

Pieza 1 — Precio centralizado + Prices en BD + botón   🟢 VALIDADA E2E EN TEST (cobro real OK; falta Fase 3 + commit)
- [x] 1a · Monto centralizado en config (precio_membresia_mxn): api (endpoint público + notificaciones),
      web (3 constantes + 3 displays + i18n → useConfigPublica), admin (usePrecioMembresia + precioPorMeses(precioBase)
      + 3 diálogos + placeholders). tsc verde ×3. NO requiere correr nada en BD (default 849).
- [x] 1b-backend · checkout acepta `intervalo` mensual/anual y lee el Price de config (env como semilla);
      el endpoint público expone `precioMembresiaAnual`. tsc verde.
- [x] 1c-backend · cambiarPrecioMembresia (crea Prices mensual+anual=10×, default + archiva viejos, reapunta
      config, audita) + PUT /admin/configuracion/precio-membresia (solo super) + validación Zod. tsc verde.
- [x] 1c-frontend · tarjeta "Precio de membresía" + modal en Configuración del Panel (preview del anual 10×,
      advertencia "las suscripciones vigentes no migran"). Service + useCambiarPrecioMembresia (RQ). tsc verde.
- [x] 1b-frontend · selector Mensual/Anual en el registro comercial (FormularioRegistro) + intervalo de punta
      a punta (FormularioRegistro → estado de PaginaRegistro → redirigirAStripe → crearCheckout). El toggle solo
      aparece si `anualDisponible` (config pública). El `intervalo` NO se filtra a /auth/registro. tsc verde ×3.
      Nota: el upgrade personal→comercial (PaginaCrearNegocio) queda solo mensual por ahora (no es el registro).
- [x] UX revisada (Juan, 18 jun): el botón único se separó en DOS controles — precio mensual (botón Cambiar) +
      plan anual (toggle ON/OFF). Backend partido en 2 endpoints: PUT /precio-membresia y PUT /plan-anual.
- [x] Operativo TEST: plan anual activado con el toggle → Price anual creado en Stripe (TEST) y el selector
      Mensual/Anual aparece en el registro (verificado por Juan, 18 jun).
- [x] VALIDADO E2E EN TEST (18 jun): precio dinámico $450 + trial 0 → Stripe cobró $450 (sub creada) → webhook
      creó el negocio "Maricos Las Plebres" (al corriente, primer pago hoy, próximo cobro +1 mes) → evento
      "Cobro exitoso $450" en la bitácora de Suscripciones. Cadena completa precio→checkout→cobro→webhook→BD OK.
- [x] UX de trial=0 (18 jun): checkout omite `trial_period_days` cuando es 0 (Stripe exige ≥1) → cobro inmediato;
      copy coherente sin trial en landing/registro/upgrade/éxito/sidebar; card de precio del registro rediseñado;
      fix i18n `cta.personal.siempre`; branding de la columna izquierda con layout flex que no se corta.
- [x] Comprobante en cobros de TARJETA (correo + recibo PDF con folio correlativo): el webhook
      registra una fila pagos_membresia concepto 'tarjeta' → reusa el flujo del recibo manual
      (prepararReciboPago + enviarComprobantePagoMembresia); guards que bloquean editar/anular ese pago;
      la UI del historial oculta esos botones en filas de tarjeta y las etiqueta "Tarjeta". tsc api+admin verdes.
      ✅ Migración aplicada (dev+prod, 20 jun): docs/migraciones/2026-06-18-concepto-tarjeta.sql (CHECK + 'tarjeta').
- [ ] Al ir a LIVE: activar el anual con la llave live + STRIPE_PRICE_COMERCIAL en Render. (validación E2E en TEST ✅ hecha)
- [x] Fase 3 Cerrar Pieza 1 (→ Pagos_Suscripciones.md / Suscripciones.md) + commit ✅ (sprint cerrado, en prod).

Pieza 2 — Cobro día-1   ✅ CONSTRUIDA + VALIDADA E2E (Ronda de Pagos, 22-23 jun)
- [x] Spike `probar-cobro-dia1.ts` (Test Clock): cobra hoy → +44d → cobra, sin extras. TODO VERDE.
- [x] Tarjeta: crearCheckoutSession omite trial con ?ref= + manejarCheckoutCompletado empuja a fin-de-periodo+cortesía
      (mensual +44d / anual +1año+cortesía). Blindajes de carrera (reintento si no hay negocio aún + GREATEST de fecha).
- [x] Alta manual con vendedor: vigencia +cortesía + aviso visible en el modal. Comisión de alta cae sola el día 0.
- [x] tsc api+web+admin verdes. Validación E2E ✅ en la Ronda de Pagos (22-23 jun).

Pieza 3 — Comisión recurrente al cobro   ✅ CONSTRUIDA + GATE VERDE + VALIDADA E2E (ronda 22-23 jun)
- [x] Motor devengarComisionRecurrenteAlCobro (meses=dinero÷precio, MENOS 1 mes en el 1er cobro si hubo alta, escalón congelado) + marcador comision_devengada_hasta.
- [x] Enganches: webhook tarjeta + alta manual + "Registrar pago" (alta ANTES del recurrente). Foto mensual retirada (cron + dispararDevengo no-op).
- [x] Migración 2026-06-19 (columna + drop índice + relajar CHECK forma). Corrida en dev y prod.
- [x] Harness probar-comision-al-cobro.ts TODO VERDE. Frontend: estado de cuenta "por cobro" + botón Recalcular quitado.
- [x] tsc api+admin verdes. Falta: validación E2E (Juan) + cerrar Vendedores_y_comisiones.md.
```

---

## Referencias

- [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md) — **el backend de pagos** (webhook, estados, ciclo
  de cobro, `pagos_membresia`/`eventos_pago`, acciones de Stripe, "Registrar pago" Opción A). Lectura base.
- [`Suscripciones_Pendientes.md`](Suscripciones_Pendientes.md) §Cierre de alcance — de donde nació este sprint.
- [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md) — **D16 / D16.1** (comisión
  al cobro) y **D17** (abonos, ya hecho).
- [`Panel_Admin.md`](Panel_Admin.md) — §Comisiones · §Motor de venta (Camino A/B) · matriz maestra.
- [`Recibos.md`](Recibos.md) — **módulo nuevo** que nació de la Pieza 1: los comprobantes de membresía (manuales
  + tarjeta, foliados) para ver / buscar por folio / descargar / reenviar, con alcance super/gerente/vendedor.
- [`Configuracion.md`](Configuracion.md) — el módulo que centraliza valores dinámicos (trial/gracia/escalera).
- [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md) — el carril (4 fases).
- `apps/api/scripts/crear-price-membresia.ts` — crea/reusa Price, lo deja default, archiva el viejo
  (idempotente, TEST/LIVE auto) — **lo reusa el botón de la Pieza 1**.
