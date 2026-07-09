# Reporte — Ocultar lo DEMO de las vistas y KPIs del Panel Admin (+ ChatYA)

**Fecha:** 8 Jul 2026
**Autor:** Juan (con Claude Code)
**Ámbito:** `apps/api` — services de lectura del Panel Admin (`services/admin/`) **y del directorio /
buscador de ChatYA** (`services/chatya.service.ts`).
**Estado:** Implementado, `tsc` verde en `api` y `admin`. **Sin commitear** (pendiente aprobación).

---

## 1. Problema

Los negocios y usuarios del feature **Demo de Business Studio** (`docs/arquitectura/Demo_Business_Studio.md`)
aparecían en el Panel Admin e inflaban los contadores: el módulo **Negocios** listaba los dos
"Mariscos El Capitán (DEMO)"; **Resumen** y **Métricas** los contaban en "Negocios activos", altas,
ingresos y "vendedores con más negocios activos"; y el KPI **Usuarios** contaba los usuarios
sintéticos `@demo.anunciaya.local`. Hasta ahora `es_demo` **solo** se excluía del directorio
**público**, nunca del Panel interno.

## 2. Objetivo

Que las vistas y KPIs del Panel reflejen la realidad (negocios, usuarios, ingresos y actividad
**reales**), sin tocar el feature del demo (abrir / reiniciar / BS embebido siguen igual).

---

## 3. Criterio de exclusión

### 3.1 Negocios → `es_demo = false`
Se reusa la **misma marca** `negocios.es_demo` que ya oculta al negocio del directorio público. La
tienen tanto el maestro (`demo_tipo='maestro'`) como las copias por vendedor (`demo_tipo='copia'`),
puestas en el seed (`seedDemoMaestro.ts`) y en el clonado (`crearCopiaDemo`). Ya existe columna +
índice parcial `idx_negocios_es_demo`.

### 3.2 Usuarios → correo `@demo.anunciaya.local`
Los usuarios demo **no tienen bandera propia**, pero **todos** usan el dominio
`@demo.anunciaya.local` por construcción:

| Usuario demo | Correo |
|---|---|
| Dueño-sombra del maestro | `demo-maestro@demo.anunciaya.local` |
| Dueño-sombra de cada copia | `demo-vendedor-<uuid>@demo.anunciaya.local` |
| Clientes sintéticos | `demo-cliente-N@demo.anunciaya.local` |

Condición usada (robusta y case-insensitive):

```sql
COALESCE(correo, '') NOT ILIKE '%@demo.anunciaya.local'
```

`COALESCE` evita excluir por error si algún correo llegara `NULL`. El refuerzo "además, dueños de
negocios `es_demo`" **no aporta**: esos dueños ya tienen correo `@demo`. El criterio por correo los
cubre al 100%.

### 3.3 Actividad simulada → por vía del negocio demo
La actividad del demo (clientes con billetera, ventas/`puntos_transacciones`, canjes, reseñas)
**cuelga siempre de un negocio `es_demo`**. Por eso **no** hace falta un criterio propio para
"actividad": al excluir los negocios demo del predicado correlacionado de Métricas, esa actividad
—y los clientes sintéticos, cuya billetera/ventas solo existen en negocios demo— desaparece de todos
los conteos (clientes totales/activos, "negocios usando la app", "en riesgo", series).

---

## 4. Enfoque técnico — helpers reutilizables (sin repetir el WHERE)

Cada módulo pasa por **un único helper de alcance**. La exclusión se inyectó **ahí**, de modo que
todas las queries del módulo la heredan y cualquier consulta futura también:

| Service | Helper único modificado | Efecto |
|---|---|---|
| `admin/negocios.service.ts` | `condicionAlcance()` + const `EXCLUIR_DEMOS` | lista + conteos (estado/vendedor/ciudad), total, activos, en gracia, ficha, ciudades del filtro, sucursales |
| `admin/metricas.service.ts` | `predicadoNegocio(ctx, col)` | altas, churn, ingresos, negocios-en-app, clientes totales/activos, en-riesgo, top vendedores, series |
| `admin/usuarios.service.ts` | `condicionVisibilidad()` + const `EXCLUIR_USUARIOS_DEMO` | lista + conteos, contador del menú, usuarios-por-ciudad, expediente, y las series de Métricas·Usuarios |
| `admin/suscripciones.service.ts` | `condicionAlcance()` + const `SIN_DEMOS_EVENTO` | bitácora de eventos, detalle, y el KPI "ingresos del mes"/"cobros fallidos" del Resumen |

**Cambio de firma clave (riesgo señalado):** los tres helpers pasaron de poder devolver
`null`/`undefined` ("sin filtro") a devolver **siempre un `SQL`**. Antes, para el superadmin,
`null`/`undefined` significaba "ver todo sin condición"; ahora significa "ver todo **menos** los
demos". El caso `'vacio'` (gerente/vendedor sin región/embajador = "no devuelvas nada") se conservó
intacto y es distinto de la exclusión de demos — se componen bien (primero `'vacio'` corta con
early-return; si no, se aplica el `SQL` con la exclusión).

Se revisó **caller por caller** que "super ve todo" siga funcionando y que ningún consumidor
dependiera del antiguo `null`/`undefined` (todos usan `if (alcance) …` o `alcance ?? undefined`, que
siguen válidos). Los controllers/rutas solo consumen las funciones de alto nivel (`contarUsuarios`,
`usuariosPorCiudad`, `resumenIngresos`, `listarEventos`, …), cuyas firmas públicas no cambiaron.

---

## 5. Archivos y queries modificadas

Cuatro archivos, solo lecturas (`git diff --stat`: 4 files, +84 −34):

### `apps/api/src/services/admin/negocios.service.ts`
- **Nuevo** `const EXCLUIR_DEMOS = eq(negocios.esDemo, false)`.
- `condicionAlcance()`: firma `SQL | null | 'vacio'` → **`SQL | 'vacio'`**; combina `EXCLUIR_DEMOS`
  siempre (super = solo esa; gerente/vendedor = `and(EXCLUIR_DEMOS, <predicado rol>)`).
- Lo heredan sin cambios extra: `contarNegocios`, `contarNegociosActivos`, `listarNegociosEnGracia`,
  `listarNegocios` (lista + total + facetas por estado/vendedor/ciudad), `obtenerDetalleNegocio`,
  `negocioVisibleParaPanel` (→ sucursales, pagos, detalle de sucursal), `listarCiudades`.

### `apps/api/src/services/admin/metricas.service.ts`
- `predicadoNegocio()`: firma `SQL | null` → **`SQL`**; caso `todo` (super) → `EXISTS(negocios no demo)`;
  `region`/`vendedor` → añaden `AND n.es_demo = false` al `EXISTS`.
- Lo heredan: `kpiAltas`, `kpiChurn`, `kpiIngresos`, `serieCrecimiento`, `serieIngresos`,
  `topVendedores`, `negociosEnApp`, `clientesTotales`, `clientesActivosKpi`, `serieClientesActivos`,
  `listarEnRiesgo`. Los KPIs de la pestaña **Usuarios** de Métricas heredan la exclusión vía
  `condicionVisibilidad`/`contarUsuarios`/`usuariosPorCiudad` (ver siguiente).

### `apps/api/src/services/admin/usuarios.service.ts`
- **Nuevo** `const EXCLUIR_USUARIOS_DEMO = sql\`COALESCE(correo,'') NOT ILIKE '%@demo.anunciaya.local'\``.
- `condicionVisibilidad()`: firma `SQL | undefined` → **`SQL`**; combina `EXCLUIR_USUARIOS_DEMO`
  siempre (super sin lente = solo esa; gerente / super-con-lente = `and(EXCLUIR_USUARIOS_DEMO, <vis>)`).
- Lo heredan: `listarUsuarios` (lista + conteos por estado/tipo + total), `contarUsuarios`,
  `usuariosPorCiudad`, `obtenerExpediente`, y las tres queries de `metricasUsuarios` que usan `vis`.

### `apps/api/src/services/admin/suscripciones.service.ts`
- **Nuevo** `const SIN_DEMOS_EVENTO = sql\`EXISTS (SELECT 1 FROM negocios n WHERE n.id = eventos_pago.negocio_id AND n.es_demo = false)\``.
- `condicionAlcance()`: firma `SQL | null | 'vacio'` → **`SQL | 'vacio'`**; super = `SIN_DEMOS_EVENTO`;
  gerente = predicado matriz→ciudad→región + `AND n.es_demo = false`.
- Lo heredan: `listarEventos`, `obtenerDetalleEvento`, `resumenIngresos` (KPI del Resumen).

### `apps/api/src/services/chatya.service.ts` (añadido tras hallazgo en QA)
Aparecían como contactos/resultados dos cosas que no son "un vecino de la ciudad": el
**usuario-sombra dueño de la copia demo** ("Demo Business Studio",
`demo-vendedor-<uuid>@demo.anunciaya.local`) y la **cuenta del superadmin** ("Admin AnunciaYA",
equipo interno). Se excluyen ambos con una condición reutilizable:

```sql
AND COALESCE(u.correo, '')      NOT ILIKE '%@demo.anunciaya.local'   -- usuarios demo
AND COALESCE(u.rol_equipo, '')  != 'superadmin'                       -- cuenta del superadmin
```

`COALESCE` es imprescindible en `rol_equipo`: es NULL para los usuarios normales, y `!= 'superadmin'`
sobre NULL daría NULL (los ocultaría a todos). Puntos tocados:
- `listarDirectorioComercial()`: **nueva** `const excluirNoContactables` (las 2 líneas de arriba),
  aplicada a las **dos** queries de la función (lista + `COUNT` del badge). Como el buscador del
  directorio es el `filtroTexto` de esta misma función, queda cubierto directorio **y** búsqueda.
- `buscarPersonas()`: mismas dos condiciones (buscador general de personas del lado personal —
  encontraría al sombra por nombre "Demo…" y al admin por "Admin…").
- `buscarNegocios()`: **ya** excluía `n.es_demo = false` (del trabajo original del feature demo) — no
  se tocó.

> **Alcance del filtro de equipo:** hoy solo se excluye `superadmin` (lo pedido). Gerentes y
> vendedores (que tienen `rol_equipo` no nulo) **siguen apareciendo**. Si se quisiera ocultar a todo
> el equipo interno, bastaría cambiar la 2ª línea por `AND u.rol_equipo IS NULL`.

### `apps/api/src/services/cardya.service.ts` (añadido tras hallazgo en QA)
La pestaña **Recompensas** de CardYA (lado cliente) mostraba las recompensas del negocio demo
("Mariscos El Capitán") porque `obtenerRecompensasDisponibles` lista un **catálogo** (join a
`negocios`) filtrado solo por `recompensas.activa = true` y `negocios.activo = true`. Fix: se añadió
`eq(negocios.esDemo, false)` al array de condiciones.
- **No** se tocaron billeteras / puntos / "N negocios" ni Vouchers / Historial: reflejan la actividad
  **real** del cliente (en el caso de la captura, su billetera Oro en "Imprenta Find US"); el cliente
  no tiene billetera en el demo, así que esas vistas ya salían correctas.

---

## 6. Decisiones de producto

1. **Suscripciones incluido (blindaje $0).** El demo no genera `eventos_pago`, así que hoy el KPI de
   ingresos no cambia; se blindó igual por consistencia y por si el super probara un cobro sobre el
   maestro.
2. **La ficha individual de un negocio demo en el módulo Negocios ahora da 404** (y lo mismo el
   expediente de un usuario demo). **Aceptado:** el demo no se gestiona desde la lista de Negocios,
   sino por el botón "Demo BS" (que sigue funcionando, ver §7). Deja de poderse abrir la ficha del
   demo desde el Panel — comportamiento deseado (es un dato de demostración, no un negocio real).
3. **Módulos NO tocados porque ya excluyen demos por naturaleza:** Vendedores, Comisiones y Recibos
   cuentan por `embajador_id`, y tanto el maestro como las copias tienen `embajador_id = NULL`
   (el dueño es un usuario-sombra sin embajador) → nunca aparecen. Publicidad va por pauta y
   Territorios por zonas dibujadas → no cuentan negocios demo. Los services de **acciones/escritura**
   (alta manual, `negocios-acciones`, `usuarios-acciones`, etc.) no se tocaron: el feature demo sigue
   igual.
4. **Criterio de usuarios por correo (no por bandera).** Es robusto porque el dominio
   `@demo.anunciaya.local` lo fija el propio código del demo (seed + clonado); no depende de que
   alguien marque a mano. `ILIKE` no usa índice, pero al volumen de la beta es irrelevante.

---

## 7. El feature demo sigue funcionando (verificación del punto crítico)

`demoBusinessStudio.service.ts` es **independiente** de los services del Panel modificados:

- **Detección del maestro** (para pintar el botón "Demo BS"): `obtenerMaestroId()` consulta
  `WHERE demo_tipo = 'maestro'` directo — **no** pasa por `condicionAlcance` ni por `listarNegocios`.
- **Abrir / reiniciar**: `crearCopiaDemo` / `borrarCopiaDemo` operan por `demo_tipo` /
  `demo_vendedor_id` / `demo_maestro_id`; clonan leyendo del maestro por `negocio_id = maestroId`.
- **BS embebido**: entra por **impersonación** (JWT del usuario-sombra) y carga datos con las queries
  del lado dueño de `apps/web`, que ya traen la excepción `es_demo = false OR usuario_id = $userId`
  (`obtenerPerfilSucursal`, `obtenerFeedOfertas`). **No** se tocaron.

Conclusión: ninguna query que el flujo del demo comparte quedó filtrada por `es_demo` desde estos
services. Verificado **por código** (services disjuntos). Prueba E2E en vivo (abrir/reiniciar con el
Panel corriendo) queda pendiente de correrse en DEV/PROD por Juan, pero el riesgo es nulo al no haber
acoplamiento.

---

## 8. ¿Hizo falta migración?

**No.** La columna `negocios.es_demo` (+ índice parcial) ya existe desde
`2026-06-30-demo-business-studio.sql`. Todo el cambio es de **queries** (`WHERE`), sin DDL ni datos.

---

## 9. Verificación

- **`tsc` verde:**
  - `pnpm exec tsc --noEmit -p apps/api/tsconfig.json` → exit 0.
  - `pnpm exec tsc -b apps/admin` → exit 0 (el Panel no cambia; confirma que no se rompió nada).
- **Callers revisados uno a uno** para los cuatro helpers (super/gerente/vendedor + `'vacio'` + facetas).
- **Efecto esperado en prod** (hoy: 1 negocio real "Imprenta Find US" + 2 demos):
  - **Negocios activos = 1** (Resumen y Métricas).
  - La **lista de Negocios** ya no muestra los dos "(DEMO)"; el contador del menú baja en 2.
  - **Usuarios** baja: −1 dueño-maestro, −1 dueño-sombra por cada copia, −N clientes sintéticos
    (`@demo.anunciaya.local`).
  - **Ingresos / altas / churn / top vendedores** reflejan solo negocios reales.
  - La actividad de Métricas (clientes activos, negocios usando la app, en riesgo) deja de contar la
    simulada del demo.

---

## 10. Cómo comprobarlo manualmente

1. Panel → **Resumen**: "Negocios activos" = 1; "Usuarios" bajó respecto a antes.
2. Panel → **Negocios**: la lista no trae "(DEMO)"; los chips por estado/ciudad/vendedor cuadran con 1.
3. Panel → **Métricas** (Crecimiento): activos = 1; "Vendedores con más negocios activos" sin cuentas infladas por el demo.
4. Panel → **Usuarios**: no aparecen correos `@demo.anunciaya.local`; los conteos por estado/tipo bajan.
5. Panel → botón **"Demo BS"**: sigue apareciendo, abre la copia y "Reiniciar demo" funciona (feature intacto).
6. App (cuenta comercial) → **ChatYA → Directorio**: ya no aparecen "Demo Business Studio" ni
   "Admin AnunciaYA" (superadmin); el badge baja (en el caso de la captura, de 3 a 1). Ni el buscador
   del directorio ni el de personas los devuelven.
