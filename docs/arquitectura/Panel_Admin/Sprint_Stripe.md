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
> **Última actualización:** 18 Junio 2026 — **Fase 0 cerrada con Juan.** Alcance consolidado a 3 piezas
> (precio centralizado + Prices en BD + botón · cobro día-1 · comisión recurrente al cobro). Se
> descartó el descuento de precio de lanzamiento (el precio se queda firme en $849).

---

## Estado del sprint

**FASE 0 — DEFINIR ✅ (18 Jun 2026).** Decisiones cerradas (ver §Decisiones). Siguiente: construir la
**Pieza 1** siguiendo el carril (Fase 1 → 2 → 3 de esa pieza). Nada de código tocado aún.

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
| **DS10** | Estructura documental | **Doc maestro del sprint** (este archivo); cada pieza, al cerrar, actualiza **su módulo**. `Suscripciones_Pendientes.md` §Fuera de V1 apunta aquí. | ✅ decidido |

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

### Pieza 2 — Cobro "día 1" (ventas por vendedor)

- **Tarjeta (DS7):** spike del mecanismo (b/c) con **Test Clock**; al confirmar, el checkout con `?ref=`
  paga $849 al inicio y ancla el próximo cobro a +44d.
- **Efectivo / alta manual:** vigencia inicial `hoy+44` en vez de `hoy+14` (chico, casi todo existe).
- **Comisión de alta en tarjeta:** con (b)/(c) hay un `invoice.payment_succeeded amount>0` el día 0 → la
  comisión de alta se devenga **al firmar** sin tocar `devengarComisionAlta`.
- **Sin vendedor:** intacto (14 días trial → cobra el día 15).

**Migración:** previsiblemente **ninguna** (usa Stripe + columnas de fecha existentes). Confirmar en Fase 1.

### Pieza 3 — Comisión recurrente "al cobro" (D16 / D16.1)

- Cambiar el motor de `comisiones-devengo.service.ts` de **foto mensual (cron `devengarPeriodo`)** a
  **devengo por meses pagados, al cobro**: al cobrar N meses (webhook / pago manual / cobro día-1), devengar
  `N × escalón vigente` de golpe.
- **Anti-doble-pago:** marcador **`comision_devengada_hasta`** por negocio; el escalón se **congela al cobro**
  (se guarda en el `detalle` de cada fila). El escalón sigue por **# de activos** (el prepagado cuenta como 1).
- Decidir qué pasa con el **cron mensual** actual (apagar / reconvertir a barrido de seguridad).

**Migración:** columna `comision_devengada_hasta` (en `negocios` o registro aparte) — DDL, dev + prod.

---

## Criterios de aceptación (Definición de Terminado)

**Pieza 1:**
- [ ] ⬜ El monto vive en `configuracion`; web, admin y avisos lo leen (no hay número hardcodeado).
- [ ] ⬜ El checkout lee el Price ID **de config** (no de env); la env solo siembra la 1ª vez.
- [ ] ⬜ El comercio puede elegir **mensual o anual** en el registro con tarjeta (anual = ~2 meses gratis).
- [ ] ⬜ El **botón** crea el/los Price(s), los deja default, archiva los viejos y reapunta config — **sin
  redeploy** — verificado en Stripe TEST con datos reales. Solo superadmin (otros rol → 403). Auditado.
- [ ] ⬜ Cambiar el precio **no** rompe las suscripciones vigentes (siguen en su Price); el modal lo advierte.
- [ ] ⬜ `tsc --noEmit` + builds (web + admin + api) verdes.

**Pieza 2:**
- [ ] ⬜ Un registro **con `?ref=`** (tarjeta) cobra **$849 el día 0** y agenda el próximo cobro a **+44 días**
  — verificado con **Test Clock**.
- [ ] ⬜ Un registro **sin vendedor** sigue con 14 días de trial y cobra el día 15 (sin cambios).
- [ ] ⬜ El **alta manual con vendedor** nace con vigencia `hoy+44`.
- [ ] ⬜ La **comisión de alta** se devenga al día 0 en tarjeta (una por negocio, idempotente).

**Pieza 3:**
- [ ] ⬜ Al cobrar **N meses** (cualquier canal), el vendedor devenga `N × escalón vigente` **de golpe**, y
  `comision_devengada_hasta` salta `mes+N`.
- [ ] ⬜ En meses ya cubiertos **no** se vuelve a devengar (el negocio sigue contando para el escalón).
- [ ] ⬜ El escalón usado queda **congelado** al cobro (no cambia si la escalera sube después).
- [ ] ⬜ Harness con datos reales (prepago de 12 meses, cambio de escalón) TODO VERDE. `tsc`/builds verdes.

---

## Checklist del carril

```
### Sprint: STRIPE   ·   Fase 0 ✅ — siguiente: Pieza 1 (Fase 1)

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
      ⚠️ Migración pendiente (Juan, DEV+PROD): docs/migraciones/2026-06-18-concepto-tarjeta.sql (CHECK + 'tarjeta').
- [ ] Opcional: validar también un checkout ANUAL e2e. Al ir a LIVE: activar el anual con la llave live + STRIPE_PRICE_COMERCIAL en Render.
- [ ] Fase 3 Cerrar Pieza 1 (→ Pagos_Suscripciones.md / Suscripciones.md) + commit. Al cerrar el sprint o cuando Juan diga.

Pieza 2 — Cobro día-1   ⬜
- [ ] Spike Stripe (b/c) + Test Clock · construir tarjeta + manual · comisión de alta día 0 · Cerrar (→ Pagos_Suscripciones.md)

Pieza 3 — Comisión recurrente al cobro   ⬜
- [ ] Motor por cobro + comision_devengada_hasta + escalón congelado · harness · Cerrar (→ Vendedores_y_comisiones.md)
```

---

## Referencias

- [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md) — **el backend de pagos** (webhook, estados, ciclo
  de cobro, `pagos_membresia`/`eventos_pago`, acciones de Stripe, "Registrar pago" Opción A). Lectura base.
- [`Suscripciones_Pendientes.md`](Suscripciones_Pendientes.md) §Fuera de V1 — de donde nació este sprint.
- [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md) — **D16 / D16.1** (comisión
  al cobro) y **D17** (abonos, ya hecho).
- [`Panel_Admin.md`](Panel_Admin.md) — §Comisiones · §Motor de venta (Camino A/B) · matriz maestra.
- [`Configuracion.md`](Configuracion.md) — el módulo que centraliza valores dinámicos (trial/gracia/escalera).
- [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md) — el carril (4 fases).
- `apps/api/scripts/crear-price-membresia.ts` — crea/reusa Price, lo deja default, archiva el viejo
  (idempotente, TEST/LIVE auto) — **lo reusa el botón de la Pieza 1**.
