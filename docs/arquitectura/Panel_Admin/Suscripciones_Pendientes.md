# Suscripciones — Pendientes (checklist único de la pantalla)

> **Qué es este documento:** la **única fuente de verdad** de lo que falta por hacer en la
> **pantalla Suscripciones** del Panel Admin. Es el mapa de trabajo del módulo mientras se construye.
>
> **Documento hermano (aún no existe):** `Suscripciones.md` describirá **qué ES y cómo funciona**
> (lo ya construido). Nace en la **Fase 3 (Cerrar)**. Hasta entonces, la definición del módulo
> vive aquí abajo (§Definición — Fase 0).
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
> **Última actualización:** 11 Junio 2026 — **Fase 1 (VER) COMPLETA**: Gate 1 verde (harness A–J TODO OK). Como es solo lectura, se salta la Fase 2 → siguiente: **Fase 3 (Cerrar)**.

---

## Estado del módulo

**Fase 1 (VER) — código completo.** Alcance V1: **la Bitácora financiera global** (el "libro mayor"
de la membresía); las demás piezas quedan fuera de V1 (ver §Fuera de V1). Hecho y type-checked
(tsc + build verdes): **(1)** migración `eventos_pago` + schema Drizzle; **(2)** persistencia — helper
defensivo `services/suscripciones/eventos-pago.ts` + INSERT en los 3 handlers del webhook
(cobro_exitoso/cobro_fallido/cancelacion) + gemelo `pago_manual` en `marcarPagado`; **(3)** backend de
lectura — `suscripciones.service.ts` (listar + detalle, alcance super/gerente) + controller + routes +
montaje; **(4)** frontend — `suscripcionesService` + `useSuscripcionesAdmin` (RQ) + `SeccionSuscripciones`
(KPIs + tabla/cards + filtros tipo/origen/periodo) + `FichaEvento` (detalle + metadata) + enchufado en
`PaginaPanel`. **GATE 1 verde** (11 jun): migración corrida en dev + harness `probar-bitacora-eventos.ts`
A–J TODO OK (persistencia + idempotencia + defensividad + lectura/KPIs + alcance gerente). Como es solo
lectura, **se salta la Fase 2** → siguiente: **Fase 3 (Cerrar)**. Pendientes menores: el **deep-link** a la
ficha de Negocios (hoy se muestra el negocio) y correr la migración en **prod** antes del deploy.

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
| **`pagos_membresia`** | pagos **manuales** (efectivo/transferencia/cortesía): monto, concepto, meses, vigencia, quién | ✅ Ya existe |
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
3. **"Registrar pago" (Negocios) también escribe en `eventos_pago`** (`tipo='pago_manual'`,
   `origen='manual'`, con su `referencia_id` → `pagos_membresia`), en la **misma transacción** que ya
   inserta en `pagos_membresia`. Así el libro mayor queda completo sin uniones en read-time.
   *(Alternativa anotada por si se prefiere no tocar `marcarPagado`: leer `pagos_membresia` con un
   UNION en la query de la bitácora. Se decide al inicio de Fase 1; recomendación = escribir la fila.)*
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
- [ ] ⬜ **"Registrar pago"** (Negocios) inserta su fila `tipo='pago_manual'` en la misma transacción
  — verificado con `probar-marcar-pagado.ts`.

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
- [x] Backend persistencia: helper registrarEventoPago (defensivo + idempotente onConflict) + INSERT en
      los 3 handlers del webhook (cobro_exitoso/cobro_fallido/cancelacion) + gemelo pago_manual en marcarPagado (tx)
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
- [ ] Doc canónico Suscripciones.md (2 capas)
- [ ] Vaciar este checklist + sacar del PENDIENTES global (puntero)
- [ ] Índices (tablero, Panel_Admin.md, ROADMAP, memoria, kit claude.ai)
- [ ] Commit a main
```

**Notas técnicas para Fase 1:**
- Rutas de `/suscripciones` se montan con `requierePanel(['superadmin','gerente'])` (la usa también
  el gerente, con alcance regional); el filtro por región se aplica en el **service** (mismo predicado
  que Negocios), **antes** del gate global de superadmin en `routes/admin/index.ts`.
- Persistencia: los handlers viven en `apps/api/src/services/pago.service.ts` (`Pagos §5`). El INSERT
  va en cada uno, en `try/catch` propio. `marcarPagado` está en `services/admin/negocios-acciones.service.ts`.
- Se **calca de Negocios:** `routes/controllers/services/admin/negocios*` + `apps/admin/src/components/negocios/`.

---

## Fuera de V1 (V2 consciente — anotado, no escondido)

- 🟡 **Configuración comercial** (editar precio $449, días de trial, días de gracia). El backend ya
  los **lee** (`obtenerConfig`); falta la **UI de edición**. Vive en **Configuración (módulo 9)** —
  decidir si se hace allá o se reabsorbe aquí en una V2.
- 🟢 **Promos / meses gratis / cupones de membresía.** Feature nuevo (no existe en backend). El más
  grande; candidato natural a su propia mini-spec.
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
