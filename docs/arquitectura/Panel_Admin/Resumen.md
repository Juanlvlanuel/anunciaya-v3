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
- **Cola de pendientes:** dos tipos de tarea —**Efectivo por entregar** (vendedores que cobraron en
  efectivo y no han entregado, `saldo > 0`) y **Negocios en gracia** (cobro fallido, por suspenderse).
- **Deep-link:** el clic en un KPI o un pendiente abre la **sección que resuelve la tarea**, ya
  **filtrada** cuando aplica (ej. Negocios → solo "en gracia").

> **¿Por qué 2 tipos de pendiente y no 3?** El diseño viejo listaba *efectivo por confirmar*,
> *negocios en gracia* y *vendedores con faltante*. Pero el módulo de Vendedores se construyó con
> **neteo, no confirmación**: no existe un estado "entrega por confirmar". En el modelo real,
> *"efectivo por confirmar"* y *"vendedores con faltante"* son **lo mismo** (vendedores con `saldo > 0`).

## 4. ¿Qué veo en la pantalla?

- **Encabezado:** saludo según la hora + tu nombre, y la fecha de hoy ("Buenas tardes, Juan / Sábado,
  20 de junio de 2026").
- **KPIs:** tarjetas con ícono, valor grande, etiqueta y una línea de contexto. **Escritorio:** ícono
  a la izquierda. **Móvil:** apiladas (ícono arriba, texto a lo ancho) para que nada se trunque.
- **Cola "Pendientes por resolver":** dos bloques (Efectivo por entregar · Negocios en gracia). Cada
  uno muestra hasta **5 filas**; si hay más, aparece **"Ver todos →"**. Si no hay nada, un **estado
  vacío positivo** (check verde: "Ningún vendedor debe efectivo").
- **La campana** (arriba en la barra) usa la **misma data**: su badge es el total de pendientes del rol.

## 5. ¿Qué puedo hacer? (navegación)

Todo el módulo es lectura; lo "accionable" es **navegar para resolver**:

- Clic en **Negocios activos** o **Mi cartera** → sección **Negocios**.
- Clic en **Usuarios** → sección **Usuarios**.
- Clic en **Ingresos del mes** → sección **Suscripciones**. Clic en **Cobros fallidos** → Suscripciones
  **filtrado** por tipo `cobro_fallido`.
- Clic en **Efectivo por entregar** / **Comisiones pendientes** → **Vendedores y comisiones**.
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
| Comisiones pendientes (vendedor) | `services/admin/comisiones-liquidacion.service.ts` (`comisionesPendientesDe`) |
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
| Deep-link | `stores/useNavegacionPanel.ts` (destino + filtro inicial, one-shot) |
| Consumo del filtro | `components/negocios/SeccionNegocios.tsx` (`estadoPago`) · `components/suscripciones/SeccionSuscripciones.tsx` (`tipo`) |
| Cableado · keys | `pages/PaginaPanel.tsx` · `config/queryKeys.ts` (`resumen`) |

## Endpoint (los 3 roles, alcance por rol en el service)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/api/admin/resumen` | Devuelve `{ rol, kpis: [{clave, valor}], pendientes: { efectivo, gracia, contador } }`. Una sola llamada agregada. Respeta `?regionId=` (lente del super) vía `panelConFiltroRegion`. |

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

## Notas

- **Sin migración SQL.** Lee `negocios`, `usuarios`, `eventos_pago`, `efectivo_movimientos`,
  `embajador_comisiones` — todas ya existentes.
- **Ingresos del mes** = `SUM(monto)` de `cobro_exitoso` + `pago_manual` desde el inicio del mes en
  curso. **Cobros fallidos** = `COUNT` de `cobro_fallido` del mes.
- **Cola:** hasta **5 filas** por bloque (`limite = 5` en las consultas); "Ver todos" solo aparece si
  `total > filas mostradas`. Los items se ordenan por urgencia (efectivo: saldo desc · gracia:
  `fecha_limite_gracia` asc).
- **Campana ↔ tablero:** `BandejaPendientes` consume `useResumen` (misma caché). Al cambiar la lente de
  región se invalida `queryKeys.resumen.all()` (en `useFiltroRegion`) para refrescar ambos.

## Pendientes / futuro

- **Métricas (#2):** el análisis profundo (actividad, gráficas, tendencias) es un módulo aparte.
- **Deep-link de efectivo/comisiones:** hoy abre Vendedores sin filtro; podría pre-seleccionar al
  vendedor o la pestaña de efectivo.
- **Más KPIs** (ej. negocios nuevos del mes, usuarios nuevos) cuando se quiera enriquecer el tablero.
