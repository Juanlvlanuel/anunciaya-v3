# Suscripciones — Pendientes (checklist único de la pantalla)

> **Qué es este documento:** la **única fuente de verdad** de lo que falta por hacer en la
> **pantalla Suscripciones** del Panel Admin. Es el mapa de trabajo del módulo mientras se construye.
>
> **Documento hermano:** 📄 [`Suscripciones.md`](Suscripciones.md) — describe **qué ES y cómo funciona**
> (lo ya construido); es la fuente de "qué es". Este documento queda para los **pendientes** (lo que
> falta) y la definición histórica de Fase 0.
>
> **Regla de oro (para que no se desfasen):** cuando un pendiente de aquí se termina, se
> **borra de este checklist** y, si cambió el comportamiento, se documenta en `Suscripciones.md`.
> Uno se vacía, el otro crece. Nunca describen lo mismo a la vez.
>
> **Proceso:** se construye con el carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
> (Fase 0 Definir → 1 VER → 2 ACTUAR → 3 Cerrar). **Plantilla de oro: Negocios** (se calca su código).
>
> **Backend ya existente (clave):** todo el ciclo de cobro vive y está validado en DEV — ver
> [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md). Este módulo es sobre todo **UI sobre lógica
> que ya existe**, más **un ladrillo nuevo**: persistir los eventos de Stripe y mostrarlos unificados.
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · 🟡 a medias · ✅ hecho
>
> **Última actualización:** 15 Junio 2026 — Pago manual centralizado en el helper único `registrarPagoManual` (usado por Registrar pago Y alta manual; el alta manual antes olvidaba el gemelo). Pendiente el backfill de gemelos históricos. **Módulo CERRADO (bitácora V1)**: Fase 1 + Gate 1 verdes, Fase 2 saltada (solo lectura), Fase 3 cerrada (doc canónico + índices). Quedan solo pendientes menores (§Fuera de V1) — incluido el **sprint dedicado del precio de membresía + promos de lanzamiento**, registrado el 17 jun.

---

## Estado del módulo

**CERRADO — bitácora V1 (Fase 1 + Gate 1 verdes; Fase 2 saltada; Fase 3 cerrada).** Alcance V1: **la Bitácora financiera global** (el "libro mayor"
de la membresía); las demás piezas quedan fuera de V1 (ver §Fuera de V1). Hecho y type-checked
(tsc + build verdes): **(1)** migración `eventos_pago` + schema Drizzle; **(2)** persistencia — helper
defensivo `services/suscripciones/eventos-pago.ts` + INSERT en los 3 handlers del webhook
(cobro_exitoso/cobro_fallido/cancelacion) + gemelo `pago_manual` vía el helper único `registrarPagoManual`
(`services/admin/pagos-manuales.service.ts`), escrito por **AMBOS** flujos manuales — "Registrar pago"
(`marcarPagado`) **y el alta manual** (que antes lo olvidaba y ahora sí lo registra); **(3)** backend de
lectura — `suscripciones.service.ts` (listar + detalle, alcance super/gerente) + controller + routes +
montaje; **(4)** frontend — `suscripcionesService` + `useSuscripcionesAdmin` (RQ) + `SeccionSuscripciones`
(KPIs + tabla/cards + filtros tipo/origen/periodo) + `FichaEvento` (detalle + metadata) + enchufado en
`PaginaPanel`. **GATE 1 verde** (11 jun): migración corrida en dev + harness `probar-bitacora-eventos.ts`
A–J TODO OK (persistencia + idempotencia + defensividad + lectura/KPIs + alcance gerente). Como es solo
lectura, **se salta la Fase 2** → siguiente: **Fase 3 (Cerrar)**. Pendientes menores: el **deep-link** a la
ficha de Negocios (hoy se muestra el negocio); correr la migración en **prod** antes del deploy; y correr el
**backfill** de gemelos `pago_manual` históricos huérfanos en **dev y prod** (ver §Faltantes).

---

# Definición — Fase 0

## Mini-spec

**Qué hace (una carilla):** la pantalla del Panel donde el equipo ve el **libro mayor de la
membresía** — *todos* los eventos de dinero de la plataforma en un solo lugar, ordenados por fecha,
buscables y filtrables. Es el gemelo de Negocios pero, en vez de gestionar *un negocio*, da la **foto
financiera global**: qué se cobró, qué falló, qué se registró a mano, qué canceló quién y cuándo. El
historial financiero **completo** vive aquí; el de la ficha de Negocios es solo un **resumen** de ese
negocio. Dos piezas:

1. **Lista (bitácora)** de todos los eventos financieros — buscar (por negocio), filtrar (tipo de
   evento, origen, rango de fechas), ordenar por fecha, paginar 20, chips/KPIs de cabecera (p. ej.
   ingresos del periodo, cobros fallidos). `keepPreviousData` para no temblar al filtrar.
2. **Detalle de evento** (solo lectura) — fecha, negocio (con **deep-link** a su ficha en Negocios),
   tipo, origen, monto, actor (si fue manual o acción del admin), motivo/nota, e ids de Stripe para
   trazabilidad.

**Qué NO hace (V1):**
- **No edita** precio / días de trial / días de gracia → eso es **Configuración (módulo 9)** o V2.
- **No da** promos / meses gratis / cupones de membresía → **V2** (feature nuevo, no existe en backend).
- **No muestra** la membresía al dueño ni reactiva su pago → eso vive en **apps/web** (página de
  cuenta del usuario, `Pagos_Suscripciones.md §12`), no en el Panel.
- **No registra** pagos ni pausa/cancela → esas **acciones** ya viven en **Negocios** (Parada 2).
  Esta pantalla solo **lee y refleja** lo que aquellas producen.
- **No gestiona** comisiones de vendedores → **Vendedores y comisiones (módulo 6)**.

> **Apretón de altura — la bitácora es un LIBRO MAYOR, no un explorador del negocio.** Muestra
> *eventos* (filas planas con fecha/negocio/tipo/monto), no el expediente de cada negocio. Para
> bucear en un negocio, el deep-link lleva a su ficha en Negocios. Esto evita que el módulo se
> infle. **Es esencialmente de solo lectura** → la Fase 2 (ACTUAR) se **salta** (la única escritura
> es la persistencia del webhook, que es backend del ciclo de cobro, no una acción de la pantalla).

### Las 3 fuentes que alimentan la bitácora

| Fuente | Qué aporta | Estado |
|---|---|---|
| **Eventos de Stripe** (cobros automáticos) | renovación pagada, primer cobro, cobro fallido, cancelación | ❌ **No se persisten hoy** → tabla nueva `eventos_pago` + INSERT en el webhook |
| **`pagos_membresia`** | pagos **manuales** (efectivo/transferencia/cortesía): monto, concepto, meses, vigencia, quién. Su gemelo en `eventos_pago` lo escribe `registrarPagoManual`, alimentado por **Registrar pago** Y **Alta manual** | ✅ Ya existe |
| **`admin_auditoria`** | **acciones del admin** con peso financiero (registrar pago, pausar, cancelar): actor, motivo | ✅ Ya existe |

## Matriz de permisos

| Acción | SuperAdmin | Gerente | Vendedor |
|---|:---:|:---:|:---:|
| Ver bitácora financiera + detalle de evento | **Toda** | **Solo su región** | — |

> **Por qué:** es información financiera global sensible. El **superadmin** ve todo; el **gerente**
> ve solo los eventos de los negocios **de su región** (alcance regional vía `negocio → ciudad →
> región`, **calcado de Negocios** con `condicionAlcance`/`panelConFiltroRegion`). El **vendedor**
> queda **fuera en V1** (sus comisiones dependen de pagos, pero eso es el módulo 6, no esta vista).

## Decisiones de diseño (Fase 0)

1. **Tabla nueva `eventos_pago` = el libro mayor.** Una fila por evento financiero. El **webhook**
   la alimenta con los eventos de Stripe (INSERT). La bitácora **lee de una sola tabla** → paginar,
   ordenar y filtrar es trivial (vs. unir 3 fuentes con shapes distintos en read-time). Columnas
   propuestas (a afinar al inicio de Fase 1): `id`, `negocio_id` (FK), `tipo` (`renovacion_pagada` /
   `primer_cobro` / `cobro_fallido` / `cancelacion` / `pago_manual` / `pausa` / `reactivacion`),
   `origen` (`stripe` / `manual` / `admin`), `monto` (numeric, NULL si no aplica), `moneda`
   (`MXN`), `fecha_evento`, `actor_id` (NULL si automático de Stripe), `stripe_event_id` (único,
   para idempotencia/trazabilidad), `referencia_id` (FK suave a `pagos_membresia` / `admin_auditoria`),
   `metadata` (jsonb), `created_at`. Índices por `fecha_evento`, `negocio_id`, `tipo`.
2. **El INSERT del webhook es DEFENSIVO.** Va en su **propio `try/catch`** dentro de cada handler
   (`manejarRenovacionPagada`, `manejarCobroFallido`, `procesarCancelacionSuscripcion`): si el INSERT
   falla, **no rompe el cobro ni provoca un reintento de Stripe** (regla del webhook, `Pagos §5`).
   La BD del ciclo de cobro sigue mandando; el registro en bitácora es secundario.
3. **El gemelo `pago_manual` lo escribe UN helper único: `registrarPagoManual`** (`services/admin/pagos-manuales.service.ts`).
   En la **misma transacción** inserta la fila contable en `pagos_membresia` y su gemelo en `eventos_pago`
   (`tipo='pago_manual'`, `origen='manual'`, con su `referencia_id` → `pagos_membresia.id`). Lo usan **DOS
   flujos**: "Registrar pago" (`marcarPagado`) **Y el alta manual** (`altaManualNegocio.service.ts`). Al
   centralizar el doble INSERT en un solo lugar, garantiza la invariante **cortesía ⇒ monto NULL** y deja el
   libro mayor completo sin uniones en read-time.
4. **Idempotencia:** `stripe_event_id` es **UNIQUE** → un evento reentregado por Stripe no duplica
   fila (INSERT … ON CONFLICT DO NOTHING). Migrar el **dedup de Redis** a esta tabla es **sinergia
   V2** (`Pagos §12`), **no** requisito de V1 — V1 solo agrega el INSERT.
5. **Solo lectura → se salta Fase 2.** La pantalla no tiene acciones de escritura propias. (Mejora
   opcional futura: "Exportar CSV" del periodo filtrado — anotada en §Fuera de V1, no en V1.)
6. **Alcance regional del gerente** vía `negocio_id → negocio → ciudad → región`, **mismo predicado**
   que Negocios. Superadmin sin filtro (respeta el filtro global de región si lo activa).

**¿Migración SQL?** **SÍ.** Una: `CREATE TABLE eventos_pago …` (+ índices + UNIQUE en
`stripe_event_id`). One-shot en `docs/migraciones/`, corrida en **dev y prod**. Sin tocar columnas
de tablas existentes.

## Criterios de aceptación (Definición de Terminado)

**Persistencia (backend del webhook — habilita la bitácora):**
- [ ] ⬜ El webhook **persiste una fila** en `eventos_pago` por cada `invoice.payment_succeeded`
  (renovación/primer cobro), `invoice.payment_failed` (cobro fallido) y `subscription.deleted`
  (cancelación) — verificado con datos reales (`probar-ciclo-morosidad.ts` / `probar-acciones-parada2.ts`
  detonan los eventos contra Stripe real).
- [ ] ⬜ El INSERT es **defensivo**: si falla, el cobro y el estado del negocio **no se rompen** ni se
  re-lanza al webhook (no genera reintento) — verificado forzando un fallo del INSERT.
- [ ] ⬜ **Idempotencia:** reentregar el mismo `stripe_event_id` **no** duplica fila.
- [ ] ⬜ **AMBOS flujos manuales** ("Registrar pago" en Negocios **y el alta manual**) insertan su fila
  `tipo='pago_manual'` en la misma transacción, vía el helper único `registrarPagoManual` (antes el alta
  manual lo olvidaba) — verificado con `probar-marcar-pagado.ts`.

**VER (Gate 1):**
- [ ] ⬜ El **SuperAdmin** ve la bitácora global paginada con eventos de **las 3 fuentes** (Stripe +
  manuales + acciones), ordenados por fecha, con datos reales.
- [ ] ⬜ El **Gerente** ve **solo** los eventos de los negocios de **su región** (verificado: un evento
  de otra región no aparece).
- [ ] ⬜ **Vendedor recibe 403** en todos los endpoints `/suscripciones`.
- [ ] ⬜ Filtrar (tipo, origen, rango de fechas) y buscar (por negocio) funciona con `keepPreviousData`
  (sin temblor).
- [ ] ⬜ Cada fila muestra fecha · negocio (**deep-link** a su ficha) · tipo · origen · monto · actor
  (si manual/acción) y abre un detalle de solo lectura con los ids de Stripe.
- [ ] ⬜ `tsc --noEmit` + build verdes.

---

## Checklist del carril (las 4 fases)

```
### Módulo: SUSCRIPCIONES (Bitácora financiera V1)   ·   Fase actual: Fase 1 ✓ — lista para Fase 3 (Cerrar)

Fase 0 — Definir
- [x] Mini-spec (qué hace / qué no / matriz de permisos por rol)
- [x] Decisiones de diseño + ¿migración SQL? → SÍ (tabla eventos_pago)
- [x] Criterios de aceptación escritos (la Definición de Terminado)

Fase 1 — VER
- [x] Migración: tabla eventos_pago (+ 4 índices, 1 UNIQUE, 3 CHECK) → docs/migraciones/2026-06-11-eventos-pago.sql
      ⚠️ FALTA correrla en dev y prod (one-shot manual)
- [x] Backend persistencia — DOS helpers separados:
      (a) registrarEventoPago (services/suscripciones/eventos-pago.ts) — DEFENSIVO + idempotente onConflict;
          lo usa SOLO el webhook, con INSERT en sus 3 handlers (cobro_exitoso/cobro_fallido/cancelacion).
      (b) registrarPagoManual (services/admin/pagos-manuales.service.ts) — TRANSACCIONAL; escribe en la misma
          tx la fila pagos_membresia + su gemelo pago_manual en eventos_pago. Lo usan marcarPagado Y el alta
          manual. El pago_manual NO pasa por el helper defensivo del webhook.
- [x] Backend lectura: suscripciones.service (listarEventos + obtenerDetalleEvento, alcance super/gerente) +
      controller + routes + montaje en index.ts (antes del gate global). tsc verde.
- [x] Frontend lectura: queryKeys + suscripcionesService + useSuscripcionesAdmin (RQ keepPreviousData) +
      estadoEvento (badges) + SeccionSuscripciones (KPIs + tabla/cards + filtros tipo/origen/periodo) +
      FichaEvento (detalle + metadata) + enchufado en PaginaPanel (ítem de menú ya existía). tsc + build verdes.
      🟡 Deep-link a la ficha de Negocios: PENDIENTE (se muestra el negocio; el salto cross-módulo va aparte).
- [x] GATE 1: persistencia + lectura verificadas con datos reales ✅ — migración corrida en dev + harness
      apps/api/scripts/probar-bitacora-eventos.ts (A–J TODO OK: pago_manual misma-tx + eventos Stripe +
      idempotencia + defensividad + lectura/KPIs + alcance gerente). tsc + build verdes.

Fase 2 — ACTUAR  → SE SALTA (módulo de solo lectura)

Fase 3 — Cerrar
- [x] Doc canónico Suscripciones.md (2 capas) ✅
- [x] Checklist cerrado (este doc) — quedan solo pendientes menores (§Fuera de V1)
- [x] Índices: tablero ✅ · Panel_Admin.md ✅ · ROADMAP ✅ · memoria ✅ · kit claude.ai (regenerar al avanzar)
- [~] Commit a main → lo incluye el commit del chat de Usuarios (árbol compartido)
```

**Notas técnicas para Fase 1:**
- Rutas de `/suscripciones` se montan con `requierePanel(['superadmin','gerente'])` (la usa también
  el gerente, con alcance regional); el filtro por región se aplica en el **service** (mismo predicado
  que Negocios), **antes** del gate global de superadmin en `routes/admin/index.ts`.
- Persistencia (DOS helpers, no mezclar):
  - **Webhook → `registrarEventoPago`** (`services/suscripciones/eventos-pago.ts`): DEFENSIVO (nunca lanza,
    idempotente por `stripe_event_id`). Los handlers viven en `apps/api/src/services/pago.service.ts`
    (`Pagos §5`); el INSERT va en cada uno, en `try/catch` propio.
  - **Pago manual → `registrarPagoManual`** (`services/admin/pagos-manuales.service.ts`): TRANSACCIONAL.
    En una sola tx inserta `pagos_membresia` + su gemelo `pago_manual` en `eventos_pago` y garantiza
    cortesía ⇒ monto NULL. Lo invocan `marcarPagado` (`services/admin/negocios-acciones.service.ts`) **y**
    el alta manual (`altaManualNegocio.service.ts`). El `pago_manual` **no** pasa por el helper defensivo.
  > **Nota histórica:** antes el doble INSERT estaba **copiado** en ambos flujos y el **alta manual olvidaba
  > el gemelo** → sus pagos no aparecían en Suscripciones. Centralizado en `registrarPagoManual`, ya aparecen.
- **Backfill (pendiente, correr en DEV y PROD):** `docs/migraciones/2026-06-15-backfill-eventos-pago-manual.sql`
  (idempotente, one-shot) + `apps/api/scripts/backfill-eventos-pago-manual.ts` reconstruyen los gemelos
  `pago_manual` históricos huérfanos (sobre todo de altas manuales previas a la centralización).
- Se **calca de Negocios:** `routes/controllers/services/admin/negocios*` + `apps/admin/src/components/negocios/`.

---

## Fuera de V1 (V2 consciente — anotado, no escondido)

- 🟡 **SPRINT DEDICADO — Precio de membresía editable + promos de lanzamiento.** (Acordado con Juan, 17 jun 2026.)
  Es un sprint **propio**, fuera de la bitácora y fuera de Configuración v1 (que ya cerró **trial y gracia** —
  módulo 9, [`Configuracion.md`](Configuracion.md)). Alcance:
  - **Cambiar el precio** de la membresía ($449 hoy). Ojo: los **Prices de Stripe son inmutables** → cambiar el
    precio = crear un **Price nuevo** + apuntar la constante (`STRIPE_PRICE_COMERCIAL` / `PRECIO_MEMBRESIA`); las
    suscripciones vigentes siguen ancladas a su precio salvo que se migren.
  - **Precio especial de lanzamiento** → se maneja con **Coupons de Stripe** (descuento sobre el precio real),
    **NO** cambiando el precio. **Decisión pendiente:** ¿*fundador para siempre* (`forever`) o *temporal X meses*
    (`repeating`)?
  - **Promos / meses gratis / cupones de membresía** (feature nuevo, no existe en backend) — candidato a su
    propia mini-spec; entra en este sprint o en uno contiguo.
  - **Cobro "desde el día 1" para ventas POR VENDEDOR** (decidido con Juan, 17 jun 2026): cuando hay vendedor
    (`?ref=` por tarjeta **o** alta manual), el comercio **paga $449 al inicio** + recibe **44 días** de servicio
    (30 + 14 de cortesía) → siguiente cobro a los 44 días. El **auto-registro sin vendedor** mantiene el flujo
    actual ("14 días gratis → cobra el día 15"). En Stripe = pago inicial separado + suscripción con el ancla de
    cobro corrida 44 días (NO trivial). El equivalente en **efectivo** (correr el próximo cobro a 44 días) es chico.
    **Importa para la comisión de alta** (pieza C de Vendedores): con el cobro al día 1, la comisión de alta en
    **tarjeta** se devenga al inicio; sin este cambio, cae al **primer cobro real** (la lógica de C ya queda lista).
  > Por qué aquí y no en Configuración: el precio **no vive en BD** (vive en Stripe), así que no es una clave de
  > `configuracion_sistema` como trial/gracia; necesita lógica de Stripe (Prices/Coupons) propia.
- 🟢 **Página de cuenta del dueño** (apps/web): ver su membresía + reactivar pago vía Customer Portal
  (`Pagos_Suscripciones.md §12`). No es Panel.
- 🟢 **Exportar CSV / reportes financieros** del periodo filtrado (corte de caja, ingresos por mes).
- 🟢 **Migrar el dedup de idempotencia de Redis** a `eventos_pago` (sinergia `Pagos §12`).
- ⚪ **Reembolsos / contracargos** (`charge.refunded` / `charge.dispute.created`) como eventos de la
  bitácora (hoy se manejan a mano en Stripe).

---

## Referencias

- `Suscripciones.md` — qué ES y cómo funciona (documento hermano, nace en Fase 3).
- [`../Pagos_Suscripciones.md`](../Pagos_Suscripciones.md) — **el backend que alimenta este módulo**
  (webhook, estados, ciclo de cobro, `pagos_membresia`, acciones de Stripe). Lectura obligatoria.
- [`Panel_Admin.md`](Panel_Admin.md) — el Panel completo (caparazón, roles, regiones).
- [`Negocios.md`](Negocios.md) + [`Negocios_Pendientes.md`](Negocios_Pendientes.md) — **plantilla de oro** (se calca).
- [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md) — el carril (proceso de 4 fases).
- `docs/reportes/PENDIENTES_PanelAdmin.md` — pendientes globales del Panel.
