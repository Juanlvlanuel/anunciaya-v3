# Sprint de Stripe — Checklist de pruebas E2E

> **Qué es:** el guion para validar **end-to-end en Stripe TEST** las 3 piezas del Sprint de Stripe
> (precio + plan anual · cobro "día 1" · comisión recurrente "al cobro"). Reusable antes de pasar a LIVE.
>
> **Estado:** Pieza 1 ✅ validada E2E (18 jun). Piezas 2 y 3 con harness verde; **falta esta validación E2E**.
>
> Docs: [`Sprint_Stripe.md`](Sprint_Stripe.md) (orquestador) · [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md)
> (ciclo de cobro) · [`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md) (devengo al cobro).

---

## 🔧 Setup (una sola vez)

- [ ] Backend corriendo en `:4000`
- [ ] **`stripe listen --forward-to localhost:4000/api/pagos/webhook`** activo (sin esto los cobros no se procesan)
- [ ] Frontend web + Panel admin corriendo
- [ ] Migración `2026-06-19-comision-al-cobro.sql` aplicada en dev
- [ ] A la mano: **código del vendedor de prueba** (ej. `JUAN01`) y su link `…/registro?plan=comercial&ref=<código>`
- [ ] Tarjeta de prueba: **4242 4242 4242 4242**, fecha futura, cualquier CVC
- [ ] Dónde mirar: **Stripe Dashboard (test)** → Payments / Subscriptions · **Panel** → Negocios, Suscripciones, Recibos, Vendedores · **Gmail** (recibos)

---

## Pieza 1 — Precio + plan anual (verificación rápida, ya validada)

- [ ] Panel → Configuración: el precio es **$849**; el toggle **Plan anual** está activable
- [ ] En el registro con tarjeta aparece el **selector Mensual / Anual**
- [ ] *(Opcional)* cambiar el precio crea un **Price nuevo en Stripe** (Products) sin redeploy

---

## Pieza 2 — Cobro "día 1" para ventas por vendedor

**Antes:** Panel → Configuración → **trial = 14 días** (para el contraste).

### Caso A — Tarjeta MENSUAL con vendedor *(el principal)*
- [ ] Registrarse en `…/registro?plan=comercial&ref=<código>` con tarjeta 4242, plan **Mensual**
- [ ] **Stripe → Payments:** hay un **cobro de $849 HOY** (no $0, no trial)
- [ ] **Stripe → Subscriptions:** la sub quedó `trialing` con **trial_end ≈ hoy + 44 días**
- [ ] **Panel → Negocios** (ficha): **al corriente**, **Próximo cobro ≈ hoy + 1 mes + 14 días**
- [ ] **Panel → Suscripciones:** evento **"Cobro exitoso $849"**
- [ ] **Gmail del dueño:** llegó el **recibo PDF** (con folio) · **Panel → Recibos:** aparece
- [ ] **Panel → Vendedores → [vendedor] → Comisiones:** la **comisión de alta ($400)** se devengó

### Caso B — SIN vendedor (contraste)
- [ ] Registrarse en `…/registro?plan=comercial` (**sin `?ref=`**) con tarjeta
- [ ] **Stripe:** sub `trialing` 14 días, **sin cobro hoy** → cobra el día 15
- [ ] **Panel → Negocios:** próximo cobro ≈ hoy + 14 días

### Caso C — Alta manual con vendedor (en el Panel)
- [ ] Panel → Negocios → **"Registrar negocio"** (como super/gerente) → paso Cobro → elegir **un vendedor** + **1 mes** + Efectivo
- [ ] Aparece el aviso **"+14 días de cortesía por venta de vendedor → cubre hasta [fecha]"**
- [ ] Tras registrar: la ficha muestra vigencia ≈ **hoy + 1 mes + 14 días**

### Caso D *(opcional)* — Tarjeta ANUAL con vendedor
- [ ] Registro con `?ref=` + tarjeta, plan **Anual**
- [ ] **Stripe:** cobro de **$8,490 (10×849) HOY**; próximo cobro ≈ **hoy + 1 año + 14 días**

---

## Pieza 3 — Comisión recurrente "al cobro" (anti-doble-pago)

> El monto del escalón depende de la **escalera** y del **# de activos** del vendedor al momento del cobro
> (con la escalera actual, 1 activo ya da **$200**).

### Caso A — 1er mes (del Caso A de la Pieza 2)
- [ ] Panel → Vendedores → [vendedor] → **Comisiones**: hay una **comisión recurrente por ese negocio** con el desglose **"1 mes × $[escalón] · escalón [X]"** (además de la de alta)

### Caso B — Prepago ANUAL *(el corazón de la Pieza 3)* — elige una vía:
- **Vía 1:** el **Caso D** de arriba (registro anual con vendedor), o
- **Vía 2:** Alta manual con vendedor por **12 meses**, o
- **Vía 3:** Panel → Negocios → un negocio con vendedor → **"Registrar pago" 12 meses**
- [ ] Panel → Vendedores → Comisiones: hay **UNA** comisión recurrente del negocio = **10 × $[escalón]**, con desglose **"10 meses × $[escalón]"**
- [ ] ⚠️ **NO** hay 12 filas ni 12× el monto (ese es el anti-doble-pago)

### Caso C — Sigue contando como activo
- [ ] El negocio prepagado **sigue apareciendo activo** en la cartera del vendedor (cuenta para su escalón), aunque ya no genere más devengo

> **Lo que NO hace falta probar a mano:** que las renovaciones futuras no re-devenguen los meses ya
> cubiertos y la idempotencia ante webhooks repetidos — ya cubierto por el harness
> `probar-comision-al-cobro.ts` (TODO VERDE). Para verlo en vivo se necesitaría un **Stripe Test Clock**.

---

## Notas

- **Limpieza:** cada registro de prueba crea usuario+negocio+sub. Para repetir, usa correos distintos (o
  borra los de prueba). En Stripe TEST puedes cancelar las subs desde el Dashboard.
- **Al pasar a LIVE:** repetir el setup con la llave **live** (webhook live + `whsec` live), activar el plan
  anual con la llave live, y correr `2026-06-19-comision-al-cobro.sql` en **prod**.
