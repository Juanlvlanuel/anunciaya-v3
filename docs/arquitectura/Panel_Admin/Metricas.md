# Panel Admin · Módulo Métricas 📊

> **En una frase:** la vista de **análisis** del Panel — tendencias, desgloses y series temporales de la
> actividad medible hoy, scoped por rol. Donde **Resumen** da el *número de hoy*, Métricas da la
> *evolución en el tiempo* y el *para qué decidir*.
>
> **Cómo leer este documento:** dos capas. La primera (§1–§7) explica el módulo **en lenguaje de
> persona**. La segunda (**Apéndice técnico**) es la referencia para quien toca el código.
>
> **Estado:** construido y en uso. Es un módulo **solo lectura**, así que el carril **salta la Fase 2
> (Actuar)** — pasa por 0 (Definir) → 1 (VER) → 3 (Cerrar). Backend verificado con 3 harness contra
> datos reales; `tsc` api+admin y `vite build` verdes. **Sin migración SQL** (lee tablas existentes).
>
> Documentos hermanos: [`Panel_Admin.md`](Panel_Admin.md) · [`Resumen.md`](Resumen.md) (el pariente:
> números de hoy) · [`Negocios.md`](Negocios.md) (deep-link de "en riesgo") ·
> [`Tokens_Panel.md`](Tokens_Panel.md) §5 (patrón de gráficas). Checklist:
> [`Metricas_Pendientes.md`](Metricas_Pendientes.md).

---

# Capa 1 — Entiende el módulo

## 1. ¿Qué es y para qué existe?

Es la pantalla de **análisis** del Panel. Responde preguntas de negocio con **tendencias**, no con un
solo número: *¿cómo crece AnunciaYA?*, *¿les sirve la app a los negocios (renovarán)?*, *¿los clientes
finales la usan?*, *¿crece la base de usuarios?*. **No edita ni muta nada** (solo lectura).

Se organiza en **3 pestañas** + un **selector de periodo**:
- **Crecimiento** — la foto de cómo crece la plataforma (negocios, dinero, vendedores).
- **Uso de la app** — ¿usan la app los negocios y sus clientes? (predictor de renovación).
- **Usuarios** — la base de usuarios finales (registros, perfil, ciudades).

> **No es vanity metrics.** Se omiten a propósito puntos/ofertas/reseñas al detalle (eso es del Business
> Studio del comerciante). Aquí solo lo que ayuda a **decidir** a nivel plataforma.

## 2. ¿Quién lo usa? (alcance por rol)

El backend resuelve el alcance; no se confía en la UI. Respeta el **filtro global de región** del super.

| Rol | Qué ve |
|---|---|
| **Superadmin** | Toda la plataforma (o la región del filtro global). Las 3 pestañas. |
| **Gerente** | Solo su región. Las 3 pestañas. |
| **Vendedor** | Solo su cartera. **2 pestañas** (Crecimiento y Uso de la app) — **no** ve Usuarios, igual que en el módulo Usuarios. |

## 3. El selector de periodo

Arriba a la derecha. Define la ventana analizada:
- **Presets:** Último mes · Últimos 3 / 6 / 12 / 24 meses.
- **Fechas específicas:** un rango con dos calendarios (Desde / Hasta).
- **Granularidad automática:** rangos cortos (≤ 62 días, p. ej. "Último mes") se grafican **por día**;
  los largos, **por mes**. Los KPIs comparan el periodo contra el **periodo anterior** de igual duración
  (la variación %).

## 4. Pestaña "Crecimiento"

Cómo crece AnunciaYA como negocio.
- **KPIs:** Negocios activos (o *Mi cartera* para el vendedor) · Altas · Bajas (cancelaciones) ·
  Ingresos. Cada uno con su **variación** vs. el periodo anterior (se **oculta** cuando no hay base de
  comparación real — de 0 a N no es "100%").
- **Altas vs. bajas:** barras **divergentes** por mes (altas hacia arriba, bajas hacia abajo) = el
  crecimiento neto de un vistazo.
- **Ingresos:** barras **apiladas** por mes, desglosadas por forma de pago (tarjeta / efectivo /
  transferencia / otro). Mismo total que Resumen y Suscripciones.
- **Vendedores con más negocios activos** (super y gerente): leaderboard con **foto/avatar real**,
  nombre completo, **región** que cubre y **gerente** asignado, y su número de negocios. Top 8.

## 5. Pestaña "Uso de la app"

¿Les sirve la app? — el predictor de renovación. Dos lados:

**Negocios** *(¿usan la app?)*
- **Usan la app:** "X de Y · Z%" — de los negocios que pagan, cuántos usaron **ScanYA** en los últimos
  30 días.
- **Negocios en riesgo:** los que pagan pero **no usan la app** — a quién contactar. Cada fila con su
  **logo/avatar real**, días sin usar y nº de clientes. El **badge** muestra el **total real**; la lista
  trae hasta 50 con **scroll interno** (~10 visibles). **Clic → va a Negocios y hace scroll + highlight**
  sobre ese negocio (si está en la página visible; no filtra).

**Clientes** *(¿los usan los usuarios finales?)*
- **Clientes** (con tarjeta de puntos en algún negocio del alcance) · **Activos** (compra en 30 días) ·
  **Inactivos**.
- **Clientes activos por mes:** la curva de engagement.

## 6. Pestaña "Usuarios"

La base de usuarios finales (super y gerente).
- **KPIs:** Usuarios · Nuevos · Activos (última conexión ≤ 30 días).
- **Usuarios nuevos:** registros por mes (mitad izquierda).
- **Tipo de cuenta** (personal vs. comercial) y **Usuarios por ciudad** (top 8) — apilados a la derecha.

> **Ojo con la región en esta pestaña:** los **clientes/usuarios personales no tienen región** en el
> sistema (solo negocios, dueños y vendedores la tienen). Por eso, en una lente de región, los clientes
> personales se cuentan en **todas** las regiones. Es el modelo del Panel, idéntico al módulo Usuarios.

## 7. Preguntas frecuentes

- **¿Por qué "Toda la plataforma" no es la suma exacta de las regiones?** Porque un negocio **sin ciudad
  en su sucursal matriz** no cae en ninguna región (no se le puede deducir), pero sí cuenta en el total.
  La región se deduce `matriz → ciudad → región`; sin ciudad, no hay región. Mismo comportamiento en
  Negocios y Resumen. Solución: asignarle ciudad a ese negocio (es dato, no código).
- **¿"Negocios activos" incluye los en gracia?** Sí — "activo" = `estado_admin='activo'` y membresía
  `al_corriente` o `en_gracia` (misma definición que Resumen y la comisión recurrente).
- **¿Por qué algunos KPIs no muestran variación %?** Porque el periodo anterior fue 0 (no hay base honesta
  de comparación). Reaparece cuando hay datos comparables.
- **¿Por qué todo está en 0 en "Uso de la app"?** Porque en la beta aún no hay ventas ScanYA registradas;
  se llena solo cuando los negocios empiecen a escanear.

---

# Apéndice técnico

## Mapa de archivos

**Backend** (`apps/api/src/`) — orquesta consultas con alcance por rol; sin lógica de dominio duplicada:

| Pieza | Archivo |
|---|---|
| Service (3 secciones + periodo + alcance) | `services/admin/metricas.service.ts` |
| Controller | `controllers/admin/metricas.controller.ts` |
| Rutas | `routes/admin/metricas.routes.ts` (montadas en `routes/admin/index.ts` **antes** del gate global) |
| Reuso de alcance | `negocios.service.ts` (`contarNegociosActivos`, `panelConFiltroRegion`) · `usuarios.service.ts` (`condicionVisibilidad`, `contarUsuarios`, `usuariosPorCiudad`) |
| Harness | `scripts/probar-metricas-{crecimiento,adopcion,usuarios}.ts` · diagnóstico: `scripts/diag-metricas-region.ts` |

**Frontend** (`apps/admin/src/`):

| Pieza | Archivo |
|---|---|
| Service axios (3 endpoints + PeriodoSel) | `services/metricasService.ts` |
| Hooks RQ (`keepPreviousData`) | `hooks/queries/useMetricas.ts` · keys en `config/queryKeys.ts` (`metricas`) |
| Sección (pestañas + periodo) | `components/metricas/SeccionMetricas.tsx` |
| Selector de periodo (presets + calendario) | `components/metricas/SelectorPeriodo.tsx` |
| Piezas (KPI, progreso, ranking, gráfica, tooltip, paleta) | `components/metricas/piezas.tsx` |
| Vistas | `components/metricas/Vista{Crecimiento,Adopcion,Usuarios}.tsx` |
| Avatar reusado | `components/negocios/avatares.tsx` (`AvatarNegocio`) |
| Deep-link + highlight | `stores/useNavegacionPanel.ts` (`resaltarId`) · `components/negocios/SeccionNegocios.tsx` (scroll + clase `.resaltado-deeplink` en `index.css`) |
| Cableado · invalidación por región | `pages/PaginaPanel.tsx` · `stores/useFiltroRegion.ts` |

## Endpoints (alcance por rol en el service)

| Método | Ruta | Roles | Qué devuelve |
|---|---|---|---|
| `GET` | `/api/admin/metricas/crecimiento` | super · gerente · vendedor | KPIs (negociosActivos/altas/churn/ingresos) + series (crecimiento, ingresos) + topVendedores |
| `GET` | `/api/admin/metricas/adopcion` | super · gerente · vendedor | negocios (activosEnApp, totalQuePagan) + clientes (total/activos/inactivos) + serieClientesActivos + enRiesgo `{total, items}` |
| `GET` | `/api/admin/metricas/usuarios` | super · gerente | KPIs + serieRegistros + distribucion (personal/comercial) + topCiudades |

Parámetros: `?meses=N` (preset) **o** `?desde&?hasta` (YYYY-MM-DD, rango). `?regionId=` lo añade el
interceptor (lente del super). `normalizarPeriodo(query)` resuelve `{desde, hasta, desdeAnterior,
granularidad, puntos}`.

## Definiciones canónicas

- **Negocio activo** = `estado_admin='activo'` y membresía `al_corriente`/`en_gracia`.
- **Usar la app / activo en la app** = ≥1 venta ScanYA con `estado='confirmado'` (`puntos_transacciones`).
- **Ventana de "activo"** (negocio o cliente) = **30 días** (fija, independiente del selector de periodo).
- **Cliente** = tiene `puntos_billetera` en un negocio del alcance (a nivel plataforma se cuentan usuarios
  únicos).
- **Ingresos** = `SUM(monto)` de `cobro_exitoso` + `pago_manual` de `eventos_pago` (cuadra con Resumen);
  el concepto fino del manual sale del `pago_membresia` referenciado.
- **Top ciudades** excluye el grupo "Sin ciudad".

## Alcance por rol

- **Crecimiento / Uso de la app** → `predicadoNegocio(ctx, colNegocioId)`: EXISTS correlacionado
  `matriz → ciudad → región` (gerente) o `embajador_id` (vendedor). Mismo predicado que Negocios/Suscripciones.
- **Usuarios** → `condicionVisibilidad(rol, region)` reusado del módulo Usuarios (clientes globales +
  dueños/vendedores de la región).
- El **filtro global de región** del super (`panelConFiltroRegion`) lo aplica el controller a las 3
  pestañas; al cambiar, `useFiltroRegion` invalida `queryKeys.metricas.all()`.

## Notas

- **Sin migración SQL.** Lee `negocios`, `negocio_sucursales`, `eventos_pago`, `pagos_membresia`,
  `embajadores`, `usuarios`, `puntos_transacciones`, `puntos_billetera`, `ciudades`, `regiones`,
  `embajador_ciudades` — todas existentes.
- **Detalle técnico:** en las series, `date_trunc(unidad, col)` se inyecta con `unidad`/`fmt` como
  **literales** (no binds) para que SELECT y GROUP BY coincidan (con `$N` Postgres los trata distinto).
- **Gráficas (recharts):** estrenadas en el Panel por este módulo. Patrón documentado en `Tokens_Panel.md` §5.

## Pendientes / futuro

- **Analítica de comportamiento** (tiempo por sección, recorridos, embudos): módulo posterior — hoy no se
  captura, requiere instrumentar eventos.
- **`verificadosPct`** sigue calculándose en el backend pero ya no se muestra (KPI retirado por redundante);
  se puede limpiar del service/tipo/harness en una pasada menor.
- **Deep-link a negocio en otra página:** hoy el scroll+highlight solo alcanza la página visible de
  Negocios (20 por página); saltar a la página exacta queda como mejora.
