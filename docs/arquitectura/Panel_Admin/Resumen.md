# Panel Admin · Módulo Resumen / inicio 🏠

> **En una frase:** la **pantalla de inicio** del Panel — un tablero con los **números gruesos** del
> negocio (KPIs) y una **cola de pendientes accionable** (efectivo por entregar + negocios en gracia),
> todo filtrado por el alcance del rol y con **clic que lleva a la sección que resuelve la tarea**.
>
> **Cómo leer este documento:** dos capas. La primera (§1–§6) explica el módulo **en lenguaje de
> persona**. La segunda (**Apéndice técnico**) es la referencia para quien toca el código.
>
> **Estado:** construido y en uso. Fase 1 (VER) completa — es un módulo **solo lectura**, así que el
> carril **salta la Fase 2 (Actuar)**. Backend verificado con harness contra datos reales; `tsc`
> api+admin y `vite build` verdes. **Sin migración SQL** (lee tablas ya existentes).
>
> **Ampliación (29 jun 2026):** la cola de pendientes pasó de 2 a **4 tipos** (se sumaron *Pagos por
> verificar* y *Comisiones por pagar*) y los pendientes de vendedor ahora **abren su detalle en la
> pestaña que resuelve la tarea** (deep-link a tab). Reusa acciones ya existentes (aprobar/rechazar
> pago manual, registrar abono), por eso sigue saltando Fase 2. Verificado E2E por Juan + harness verde.
>
> Documentos hermanos: [`Panel_Admin.md`](Panel_Admin.md) (el Panel completo) ·
> [`Negocios.md`](Negocios.md) (negocios en gracia) · [`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md)
> (efectivo y comisiones) · [`Suscripciones.md`](Suscripciones.md) (ingresos / cobros fallidos) ·
> [`Tokens_Panel.md`](Tokens_Panel.md) §5 (patrón visual de tablero de KPIs + cola).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

Es lo primero que ve el equipo al entrar al Panel. Responde dos preguntas de un vistazo: **¿cómo va el
negocio?** (los KPIs) y **¿qué tengo que hacer hoy?** (la cola de pendientes).

No es un módulo de análisis profundo —eso será **Métricas** (módulo aparte, con detalle de actividad y
gráficas)—. El Resumen son los *números gruesos* + las *tareas que requieren acción*. **No edita ni
muta nada**: es solo lectura.

> **Filosofía de la cola:** es un **centro de trabajo**, no un feed de notificaciones. La regla: *si al
> hacer clic te lleva a HACER algo, entra; si solo informa, no.* Por eso no hay "negocios por aprobar"
> (los negocios se publican solos) ni avisos informativos.

## 2. ¿Quién lo usa? (alcance por rol)

Los **tres roles** tienen Resumen, cada uno ve **lo suyo** (el backend resuelve el alcance, no se
confía en la UI):

- **Superadmin** — KPIs de **toda la plataforma** + cola de toda la red. Respeta el **filtro global de
  región** (lente): si elige una región, el tablero se acota a ella.
- **Gerente regional** — los mismos KPIs y cola, **solo de su región**.
- **Vendedor** — **lo suyo**: su cartera activa, sus comisiones pendientes, su efectivo por entregar y
  sus negocios en gracia.

## 3. Diccionario rápido

- **KPI:** un número grueso clicable. Super/Gerente ven *Negocios activos · Usuarios · Ingresos del mes
  · Cobros fallidos*; el Vendedor ve *Mi cartera activa · Comisiones pendientes · Efectivo por entregar*.
- **Negocio activo:** `estado_admin = 'activo'` y membresía **al corriente o en gracia** (misma
  definición que la comisión recurrente).
- **Cola de pendientes:** cuatro tipos de tarea, cada uno según el rol que lo ve —**Efectivo por
  entregar** (vendedores con `saldo > 0`), **Negocios en gracia** (cobro fallido, por suspenderse),
  **Pagos por verificar** (solicitudes de pago manual con comprobante; super + gerente) y **Comisiones
  por pagar** (comisiones por liquidar a vendedores; solo el super).
- **Deep-link:** el clic en un KPI o un pendiente abre la **sección que resuelve la tarea**, ya
  **filtrada** cuando aplica (ej. Negocios → solo "en gracia").

> **¿Cómo se eligen los tipos de pendiente?** La regla de admisión es dura: *si al hacer clic vas a
> EJECUTAR algo, entra; si solo informa, no.* Arrancó con 2 (efectivo + gracia) y el **29 jun 2026** se
> sumaron **Pagos por verificar** y **Comisiones por pagar** —las otras dos colas accionables vivas del
> Panel— calcando el mismo patrón. Quedaron **fuera** los avisos informativos (cobros fallidos = síntoma
> de "en gracia"; disputas/reembolsos Stripe = externos; publicidad por vencer = se autoexpira): ya
> tienen casa en Auditoría / Métricas / Suscripciones. Sobre el neteo: *"efectivo por confirmar"* y
> *"vendedores con faltante"* son lo mismo (`saldo > 0`), por eso el efectivo es **un** tipo, no dos.

## 4. ¿Qué veo en la pantalla?

- **Encabezado:** saludo según la hora + tu nombre, y la fecha de hoy ("Buenas tardes, Juan / Sábado,
  20 de junio de 2026").
- **KPIs:** tarjetas con ícono, valor grande, etiqueta y una línea de contexto. **Escritorio:** ícono
  a la izquierda. **Móvil:** apiladas (ícono arriba, texto a lo ancho) para que nada se trunque.
- **Cola "Pendientes por resolver":** hasta **cuatro bloques** según el rol —Efectivo por entregar ·
  Negocios en gracia · Pagos por verificar (super + gerente) · Comisiones por pagar (solo super). Cada
  uno muestra hasta **5 filas**; si hay más, aparece **"Ver todos →"**. Si no hay nada, un **estado
  vacío positivo** (check verde). El **clic en una fila abre directo la tarea**: el vendedor en la
  pestaña que la resuelve, o el negocio/cola que toca (ver §5).
- **La campana** (arriba en la barra) usa la **misma data**: su badge es el total de pendientes del rol.

## 5. ¿Qué puedo hacer? (navegación)

Todo el módulo es lectura; lo "accionable" es **navegar para resolver**:

- Clic en **Negocios activos** o **Mi cartera** → sección **Negocios**.
- Clic en **Usuarios** → sección **Usuarios**.
- Clic en **Ingresos del mes** → sección **Suscripciones**. Clic en **Cobros fallidos** → Suscripciones
  **filtrado** por tipo `cobro_fallido`.
- Clic en **Efectivo por entregar** → abre el **detalle del vendedor en la pestaña "Por entregar"** (si
  la cola tiene un solo vendedor; con varios, abre la lista). El KPI **Comisiones pendientes** (vista del
  vendedor) → **Vendedores y comisiones**.
- Clic en **Comisiones por pagar** → abre el **detalle del vendedor en la pestaña "Pagos"** (donde el
  super registra el abono; el diálogo muestra el saldo a pagar con el neteo del efectivo).
- Clic en **Pagos por verificar** → **Suscripciones · pestaña "Por verificar"** (aprobar/rechazar la
  solicitud de pago manual).
- Clic en un **negocio en gracia** (o "Ver todos") → **Negocios filtrado** por "en gracia".

## 6. Preguntas frecuentes

- **¿Por qué la cola está vacía?** Porque no hay nada que resolver: 0 vendedores con efectivo pendiente
  y 0 negocios en gracia. Es el estado correcto (sale el check verde).
- **¿Los KPIs cambian si el superadmin elige una región?** Sí: la lente de región acota el tablero y la
  cola a esa región (solo lectura; el super conserva sus acciones en otras secciones).
- **¿"Negocios activos" incluye los que están en gracia?** Sí: en gracia cuenta como activo (sigue
  funcionando y aún puede pagar), igual que para la comisión recurrente.

---

# Apéndice técnico

## Mapa de archivos

**Backend** (`apps/api/src/`) — el Resumen **orquesta** consultas que viven en cada service de dominio
(no reinventa el alcance por rol):

| Pieza | Archivo |
|---|---|
| Orquestador | `services/admin/resumen.service.ts` (`obtenerResumen` → `resumenAdmin` / `resumenVendedor`) |
| KPIs negocios + gracia | `services/admin/negocios.service.ts` (`contarNegociosActivos`, `listarNegociosEnGracia`) |
| KPI usuarios | `services/admin/usuarios.service.ts` (`contarUsuarios`) |
| KPI ingresos/fallidos | `services/admin/suscripciones.service.ts` (`resumenIngresos`) |
| Efectivo por entregar | `services/admin/comisiones-efectivo.service.ts` (`listarEfectivoPendiente`, `saldoEfectivo`) |
| Comisiones pendientes (KPI vendedor) | `services/admin/comisiones-liquidacion.service.ts` (`comisionesPendientesDe`) |
| Comisiones por pagar (super) | `services/admin/comisiones-liquidacion.service.ts` (`listarComisionesPorPagar`) |
| Pagos manuales por verificar | `services/admin/pagos-manuales-cola.service.ts` (`listarSolicitudesPendientes`) |
| Controller | `controllers/admin/resumen.controller.ts` (aplica `panelConFiltroRegion`) |
| Rutas | `routes/admin/resumen.routes.ts` (montadas en `routes/admin/index.ts` **antes** del gate global) |
| Harness | `scripts/probar-resumen-lectura.ts` · Seed dev: `scripts/seed-efectivo-pendiente-dev.ts` (+ `seed-negocios-estados-dev.ts`) |

**Frontend** (`apps/admin/src/`):

| Pieza | Archivo |
|---|---|
| Service axios | `services/resumenService.ts` |
| Hook RQ | `hooks/queries/useResumen.ts` (`useResumen`, staleTime 1 min) |
| Sección | `components/resumen/SeccionResumen.tsx` (encabezado + KPIs + cola; subcomponentes `BloquePendiente`, `FilaPendiente`) |
| Campana (mismo hook) | `components/shell/BandejaPendientes.tsx` |
| Deep-link | `stores/useNavegacionPanel.ts` (destino + filtro inicial, one-shot: `negocios`/`suscripciones`/`vendedores`) |
| Consumo del filtro | `components/negocios/SeccionNegocios.tsx` (`estadoPago`) · `components/suscripciones/SeccionSuscripciones.tsx` (`tipo` + `pestana`) · `components/vendedores/SeccionVendedores.tsx` + `DetalleVendedor.tsx` (abre el vendedor en `tabInicial`) |
| Cableado · keys | `pages/PaginaPanel.tsx` · `config/queryKeys.ts` (`resumen`) |

## Endpoint (los 3 roles, alcance por rol en el service)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/admin/resumen` | Devuelve `{ rol, kpis: [{clave, valor}], pendientes: { efectivo, gracia, solicitudes, comisiones, contador } }`. Una sola llamada agregada. Respeta `?regionId=` (lente del super) vía `panelConFiltroRegion`. |

El **front mapea cada `clave`** (`negociosActivos`, `usuarios`, `ingresosMes`, `cobrosFallidos`,
`carteraActiva`, `comisionesPendientes`, `efectivoPorEntregar`) → etiqueta, formato, ícono, acento y
deep-link. El backend solo manda datos crudos.

## Alcance por rol

Cada consulta reusa el predicado de su dominio (no se duplica):

- **Negocios activos / en gracia** → `condicionAlcance` de `negocios.service` (super: todo · gerente:
  `EXISTS` matriz→ciudad→región · vendedor: `embajador_id`).
- **Usuarios** → `contarUsuarios(rol, regionId)` (visibilidad por jerarquía + región).
- **Ingresos / fallidos** → `condicionAlcance` de `suscripciones.service` (mismo predicado regional
  sobre `eventos_pago`; el vendedor no entra a este KPI).
- **Efectivo por entregar** → agrupado por embajador con `saldo > 0`; gerente acotado por
  `embajador_ciudades → ciudades.region_id`; el vendedor ve solo su propio saldo.
- **Pagos por verificar** → `listarSolicitudesPendientes`: super = todas; gerente = su región (vía
  `negocio_sucursales → ciudades.region_id` del negocio); vendedor = no aplica (0).
- **Comisiones por pagar** → `listarComisionesPorPagar`: **solo superadmin** (agrupado por embajador con
  Σ pendiente > 0). Con lente de región el middleware degrada al super a gerente, así que ahí tampoco
  aparece — las comisiones se liquidan globales, no por región.

## Notas

- **Sin migración SQL.** Lee `negocios`, `usuarios`, `eventos_pago`, `efectivo_movimientos`,
  `embajador_comisiones`, `pagos_manuales_solicitudes` — todas ya existentes.
- **Contador de la campana** = `efectivo.totalVendedores + gracia.total + solicitudes.total +
  comisiones.totalVendedores`. Para poblar las colas en dev: `seed-pago-manual-pendiente-dev.ts`
  (pagos por verificar) y `seed-negocios-estados-dev.ts` (gracia).
- **Ingresos del mes** = `SUM(monto)` de `cobro_exitoso` + `pago_manual` desde el inicio del mes en
  curso. **Cobros fallidos** = `COUNT` de `cobro_fallido` del mes.
- **Cola:** hasta **5 filas** por bloque (`limite = 5` en las consultas); "Ver todos" solo aparece si
  `total > filas mostradas`. Los items se ordenan por urgencia (efectivo: saldo desc · gracia:
  `fecha_limite_gracia` asc).
- **Campana ↔ tablero:** `BandejaPendientes` consume `useResumen` (misma caché). Al cambiar la lente de
  región se invalida `queryKeys.resumen.all()` (en `useFiltroRegion`) para refrescar ambos.

## Pendientes / futuro

- **Métricas (#2):** el análisis profundo (actividad, gráficas, tendencias) es un módulo aparte.
- **Deep-link a vendedor + pestaña** (efectivo→"Por entregar", comisiones→"Pagos"): ✅ hecho (29 jun).
  Con **varios** vendedores en el pendiente, la **campana** abre la lista (no un tab); cada fila del
  Resumen sí abre su vendedor. Futuro: que la campana con varios también ofrezca elegir.
- El pendiente de efectivo del **propio vendedor** (su vista "Mi cartera") aún no deep-linkea a su tab
  "Por entregar" (abre en "Comisiones" por default); pendiente menor.
- **Más KPIs** (ej. negocios nuevos del mes, usuarios nuevos) cuando se quiera enriquecer el tablero.
