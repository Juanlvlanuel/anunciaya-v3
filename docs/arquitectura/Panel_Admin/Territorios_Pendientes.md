# Territorios — Pendientes (checklist del módulo)

> **Qué es:** el módulo **Territorios** del Panel Admin — una **sección nueva** en el grupo "Red de
> ventas" con un **mapa interactivo** para gestionar el territorio de la red de ventas. Lo que YA
> funciona se documentará en `Territorios.md` (doc canónico, se escribe en Fase 3).
>
> **Proceso:** carril [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md)
> (0 Definir → 1 VER → 2 ACTUAR → 3 Cerrar). **Plantillas de oro:** **Ciudades** (el mapa MapLibre) +
> **Vendedores y comisiones** (alcance por rol).
>
> **Leyenda:** 🔴 bloqueante · 🟡 importante · 🟢 mejora · ⬜ por hacer · ✅ hecho · 🔵 propuesta
>
> **Última actualización:** 23 Junio 2026 · **Fase actual:** G.1 en Fase 2 (ACTUAR; falta GATE 2 visual) · **G.2 (Marcas) construido E2E** (backend + frontend, validado visual con Juan); pendiente solo el doc canónico `Territorios.md`.

---

## La sección Territorios — 3 piezas, en este orden

El territorio de la red de ventas es una jerarquía: **Región → Ciudad → Zona dentro de la ciudad → Marcas**.
El módulo la cubre en tres piezas, **en este orden** (decidido con Juan, 23 jun 2026):

1. **G.1 · Zonas** — el **gerente/super** dibuja particiones (polígonos) sobre el mapa de una ciudad y se las
   **asigna** a vendedores (o se las quita / reasigna). **← PRIMERA (define "el pedazo").**
2. **G.2 · Marcas** — el **vendedor** ve **solo su pedazo asignado** y deja **pines** de los lugares por donde ya
   pasó (visitas/prospección). **← SEGUNDA (vive dentro de la zona).**
3. **F · Cobertura por ciudades** — agregar/quitar ciudades a un vendedor, incl. de **otra región**
   (multi-región parcial). **← TERCERA** (reescribe el modelo "vendedor de UNA región"; ver
   [`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md) §Backlog).

> **Regla de producto (Juan, 23 jun):** el **vendedor SOLO ve el mapa de su pedazo asignado, nada más.**
> Por eso G.1 (las zonas) va antes que G.2 (las marcas): sin zona asignada, el vendedor no tiene qué ver.

## Dónde vive (arquitectura de la sección)

- **Menú:** entrada nueva **"Territorios"** en el grupo **"Red de ventas"** de `apps/admin/src/data/menuPanel.ts`,
  con `roles: ['superadmin','gerente','vendedor']` y `etiquetaPorRol: { vendedor: 'Mi territorio' }` (mismo
  patrón que Negocios→"Mi cartera" y Comisiones→"Mis comisiones").
- **Mapa:** **reusa** el componente `apps/admin/src/components/ciudades/MapaCiudades.tsx` (MapLibre + tiles
  OpenFreeMap) con **capas nuevas** — polígonos (zonas, G.1) y pines (marcas, G.2). No se duplica el mapa.
- **NO toca el módulo Ciudades** (catálogo de ciudades, solo SuperAdmin). Territorios es **operación de campo**.

---

# G.1 · Zonas (PRIMERA PIEZA) — Fase 0

## Mini-spec

**Qué hace:** el **gerente/super** abre "Territorios" → mapa de una ciudad → **dibuja particiones (zonas)** como
polígonos → **asigna cada zona a un vendedor**. Puede **reasignarla** a otro, **quitar** la asignación o **borrar**
la zona. Cada zona = **polígono + nombre + vendedor asignado + ciudad**.

**Qué NO hace:**
- No es la cobertura por **ciudades** (eso es F).
- No son las **marcas** del vendedor (G.2 — viven *dentro* de la zona, se construyen después).
- No crea/agrupa ciudades ni regiones → eso es **Ciudades**.

## Matriz de permisos

| Acción | SuperAdmin | Gerente | Vendedor |
|---|:--:|:--:|:--:|
| Ver el mapa de la ciudad con **todas** las zonas | Cualquier ciudad | **Su región** | — |
| Crear / editar / borrar zona | ✅ | ✅ (su región) | — |
| Asignar / quitar / reasignar zona a un vendedor | ✅ | ✅ (sus vendedores) | — |
| Ver **solo su zona asignada** (sin ver el resto) | — | — | ✅ (capa de G.2) |

> Alcance **calcado de Vendedores/Negocios**: el gerente opera sobre las ciudades de **su región** y sus
> vendedores; el super sin límite (respeta su lente de región si la activa).

## Modelo de datos (tabla nueva)

**`territorio_zonas`** (migración `docs/migraciones/2026-06-23-territorio-zonas.sql`):

| Columna | Tipo | Para qué |
|---|---|---|
| `id` | uuid PK | — |
| `ciudad_id` | uuid NOT NULL → `ciudades(id)` ON DELETE CASCADE | en qué ciudad está la zona |
| `embajador_id` | uuid NULL → `embajadores(id)` ON DELETE SET NULL | vendedor asignado (**NULL = sin asignar**) |
| `nombre` | varchar(80) NOT NULL | etiqueta ("Centro", "Zona Norte") |
| `poligono` | jsonb NOT NULL | **GeoJSON Polygon** `{type:'Polygon',coordinates:[[[lng,lat],…]]}` |
| `color` | varchar(9) NULL | color del relleno en el mapa (hex) |
| `creada_por` | uuid NULL → `usuarios(id)` ON DELETE SET NULL | quién la creó |
| `created_at` / `updated_at` | timestamptz | — |

Índices: `ciudad_id`, `embajador_id`.

## Decisiones de diseño

| # | Decisión | Resolución |
|---|---|---|
| **D1** | ¿Una zona = un vendedor? | **Sí** — `embajador_id` único por zona (un pedazo, un dueño). ✅ (Juan 23 jun) |
| **D2** | ¿Un vendedor puede tener varias zonas? | **Sí** — varias filas con el mismo `embajador_id`. ✅ (Juan 23 jun) |
| **D3** | ¿Las zonas pueden traslaparse? | **No** — particiones limpias. Se valida en la **app** al crear/editar (turf.js `intersect` contra las zonas de la misma ciudad); sin PostGIS no hay constraint de BD. ✅ (Juan 23 jun) |
| **D4** | ¿Geometría: PostGIS o GeoJSON? | **GeoJSON en `jsonb`** (no PostGIS). Basta para dibujar/mostrar/asignar; la validación punto-en-polígono (G.2) y traslape (D3) se hacen en JS (turf.js). Evita habilitar la extensión. Migrar a PostGIS si hace falta consulta geoespacial pesada. |
| **D5** | ¿Cómo se dibuja la zona sobre MapLibre? | Dibujo a mano (implementado en 2a, clic a clic). **Resultó laborioso (Juan, 23 jun)** → queda como **respaldo**, no como método principal. Ver D8. |
| **D8** | Método de dibujo de la zona (RESUELTO, Juan 23 jun) | **Snapping a calles + edición de vértices con DOS herramientas.** Se **descartó** colonias (OSM solo tiene PUNTOS en Peñasco, no polígonos — verificado 23 jun por Overpass) y **AGEB de INEGI** (requiere conseguir/procesar un shapefile — costo de datos alto). Se va por: **(1) PEGADO A CALLES (snapping)** usando las calles que ya traen las tiles de OpenFreeMap (`queryRenderedFeatures` sobre el source-layer `transportation` → proyección del punto sobre la calle más cercana) — **sin dataset externo**. **(2) Edición de vértices con DOS herramientas:** ✏️ **Agregar punto** (clic) y ✋ **Mover punto** (arrastrar un vértice; `dragPan` se **deshabilita durante el arrastre** para que el mapa NO se mueva). Al colocar o soltar un vértice se **pega a la calle** más cercana (si hay una dentro del umbral; si no, queda donde se soltó). |
| **D6** | ¿Migración SQL? | **Sí**, 1 tabla nueva. La corre Juan en sus 2 Supabase (dev+prod); Claude deja el SQL listo. |
| **D7** | Auditoría | Crear/editar/asignar/quitar/borrar zona → `registrarAuditoria` → `admin_auditoria` (obligatorio por carril). |

## Criterios de aceptación (Definición de Terminado)

**VER (Gate 1):**
- [ ] El **super/gerente** ve la sección "Territorios" en el menú; el mapa carga la ciudad y **pinta las zonas
  existentes** (polígonos con color + nombre + vendedor asignado), con alcance por rol (gerente solo su región).
- [ ] El **vendedor** entra a "Mi territorio" y ve **solo su(s) zona(s) asignada(s)** (no el resto de la ciudad).
- [ ] `tsc --noEmit` + build del Panel verdes.

**ACTUAR (Gate 2):**
- [ ] Crear una zona dibujando un polígono + nombre + color → se persiste; **rechaza** si se traslapa con otra (D3).
- [ ] Asignar / reasignar / quitar el vendedor de una zona; borrar una zona.
- [ ] Solo super/gerente actúan (vendedor 403); el backend valida el alcance (no confía en la UI).
- [ ] Toda acción → `admin_auditoria`.

## Checklist del carril

```
### Módulo: TERRITORIOS · G.1 (Zonas)   ·   Fase actual: 0 ✅ → 1 (VER)

Fase 0 — Definir ✅ (23 jun)
- [x] Mini-spec (qué hace / qué no / matriz de permisos)
- [x] Decisiones D1–D7 (D1/D2/D3 confirmadas con Juan)
- [x] Criterios de aceptación
- [x] Migración lista: docs/migraciones/2026-06-23-territorio-zonas.sql (la corre Juan)

Fase 1 — VER  (en curso)
- [x] Backend: schema Drizzle (territorioZonas) + service listarZonas (alcance super/gerente/vendedor) +
      controller + routes GET /territorios/zonas (montadas antes del gate global). tsc API verde.
- [x] Frontend: ítem "Territorios" en menuPanel (Red de ventas · 3 roles · vendedor="Mi territorio") + icono +
      SeccionTerritorios (mapa + lista de zonas) + MapaTerritorios (mapa **hermano** de MapaCiudades —resultó muy
      acoplado al catálogo INEGI, así que se calcó la técnica: MapLibre+OpenFreeMap con **capa de polígonos**) +
      hook `useZonas` + `territoriosService`. tsc -b del Panel verde.
- [x] GATE 1 ✅ (23 jun): verificado visual en dev — el Panel pinta las zonas reales del seed (azul asignada,
      ámbar sin asignar) encuadradas en la ciudad. **Fase 1 (VER) cerrada.**

Fase 2 — ACTUAR (en curso · sub-paso 2a)
- [x] Backend de acciones: crearZona/editarZona/asignarZona/borrarZona (`territorios-acciones.service`) + Zod
      (`territorios.schema`) + 4 endpoints (POST/PATCH `/zonas` · PATCH `/zonas/:id/vendedor` · DELETE) con
      alcance super/gerente (gerente solo su región) + auditoría. tsc API verde.
- [x] Frontend del dibujo: **dibujo a mano sobre MapLibre** (clic a clic + Deshacer/Terminar/Cancelar; se
      descartó terra-draw para tener control total de cara al snapping) + **selector de ciudad** + endpoints
      ciudades/vendedores del alcance + **diálogo** nombre/color/vendedor + mutaciones RQ + **reasignar/borrar**
      en la lista. tsc API + Panel verdes.
- [x] **Pulido de UI (Juan, 23 jun):** dropdowns migrados a `SelectorBuscable` (estándar del Panel; cero `<select>`
      nativos) en ciudad, vendedor del formulario y reasignar de la lista. **Layout rediseñado:** sin header (el shell
      ya muestra "Territorios"), **mapa a alto completo** a la izquierda y **toda la operación en la columna derecha**
      (selector de ciudad · Nueva zona · formulario de guardado en la columna —no en overlay, para no tapar el popover— · lista).
- [ ] GATE 2: verificar visual — dibujar una zona real en el Panel + reasignar + borrar (Juan).
- [x] **Editor de zonas con 4 herramientas** (sin dataset externo; detección de vértices por proyección propia, no
      por hit-test de capas de MapLibre —que no enganchaba): ✏️ **Agregar** (clic; **inserta** si caes sobre una arista,
      si no al final) · ✋ **Mover** (arrastra un vértice) · 🗑️ **Quitar** (clic en un vértice) · 🖐️ **Mapa** (pan).
      **El pan SOLO está activo en "Mapa"** — en Agregar/Mover/Quitar arrastrar NO mueve el mapa (resuelve el conflicto
      pan↔herramientas; el zoom con scroll sí siempre). **Pegado a calles (snapping)** al colocar/soltar/insertar
      (source-layer `transportation`). tsc Panel verde.
- [ ] GATE 2 (visual, Juan): dibujar + insertar en arista + mover + quitar + guardar + reasignar/borrar zona.
- [ ] **Curvas entre 2 puntos** (arrastrar el medio de un lado → arco): **pospuesto** (Juan, "aún no"). Backlog.
- [ ] No-traslape (turf.js): rechazar zonas que se SOLAPEN en área (compartir un borde = OK, son adyacentes).

Fase 3 — Cerrar
- [ ] Doc canónico Territorios.md + índices (tablero, memoria) + commit
```

---

# G.2 · Marcas del vendedor (SEGUNDA PIEZA) — en construcción

> **Backend HECHO (23 jun):** tabla `territorio_marcas` (migración `docs/migraciones/2026-06-23-territorio-marcas.sql`,
> **aplicada por Juan en DEV y PROD**) + schema Drizzle `territorioMarcas` + Zod (`crearMarcaSchema`/`editarMarcaSchema`;
> editar admite `lat/lng` para reubicar) + service `territorios-marcas.service.ts` (listarMisMarcas/crear/editar/borrar,
> **solo el vendedor** — alcance por su `embajador_id`) + 4 endpoints `GET/POST/PATCH/DELETE /territorios/marcas`
> (`requierePanel(['vendedor'])`). tsc API verde.
>
> **Frontend HECHO (23 jun):** vista del vendedor `VistaVendedorTerritorio.tsx` + mapa `MapaMarcas.tsx`:
> - **Solo su zona:** el exterior se **oscurece** con una capa-máscara semi-oscura ("mundo con huecos") y el **paneo se
>   limita** a su zona (`maxBounds`); la zona queda al 100%.
> - **Intro animado:** arranca en México completo y **vuela con zoom** hasta la zona; ahí enciende la máscara.
> - **Marcas:** "Agregar marca" (clic → pin con estado/color + **nota**), **editar** estado/nota, **borrar**, **arrastrar**
>   el pin para reubicarlo, y **popup al hover** con estado + nota. Pines de color por estado.
> - **Bloqueo:** crear o mover marcas **fuera de la zona** no se permite (point-in-polygon por ray casting + aviso).
> - Hooks RQ (`useMisMarcas`/`useCrearMarca`/`useEditarMarca`/`useMoverMarca`/`useBorrarMarca`); `SeccionTerritorios`
>   bifurca por rol (vendedor → "Mi territorio"). tsc Panel + API verdes; validado visual con Juan (23 jun).
> **Pendiente:** doc canónico `Territorios.md` (Fase 3).

**Qué hace:** el vendedor abre "Mi territorio" → ve **solo su zona asignada** → coloca **pines** de los lugares por
donde ya pasó. Cada marca: ubicación + tipo + nota + fecha. CRUD de **sus** marcas; gerente/super solo las **ven**.

**Decisiones confirmadas (Juan, 23 jun):**
- **Tipos de marca (A):** `Visitado` · `Interesado` · `Cerrado` (ya es cliente) · `Sin interés`. ✅
- **Ligar a negocio (B):** empezar **libre** (pin + nota); *ligar a un negocio existente* = mejora posterior. ✅
- **Quién pone marcas (C):** **solo el vendedor** (las suyas); gerente/super solo lectura. ✅

**Modelo de datos (tabla nueva, se crea al construir G.2):** `territorio_marcas`: `id` · `embajador_id` →
`embajadores(id)` · `lat` · `lng` · `tipo` (enum de los 4) · `nota` (text) · `negocio_id` (FK suave, opcional) ·
`ciudad_id` → `ciudades(id)` · `created_at` · `updated_at`. Sin PostGIS (puntos lat/lng).

---

# F · Cobertura por ciudades (TERCERA PIEZA)

Vive en el backlog de **[`Vendedores_y_comisiones_Pendientes.md`](Vendedores_y_comisiones_Pendientes.md)**
(§Backlog · Pieza F): agregar/quitar ciudades a un vendedor y asignarle ciudades de **otra región**. Reescribe
el modelo "vendedor de UNA región" (`LIMIT 1` en `panel.middleware` + trigger de `embajador_ciudades`); toca
Negocios/Usuarios/Suscripciones/Equipo. 🔴 alto riesgo → al final.

---

## Referencias

- [`Ciudades.md`](Ciudades.md) — el **mapa MapLibre** que se reusa (`MapaCiudades`, dataset INEGI, OpenFreeMap).
- [`Vendedores_y_comisiones.md`](Vendedores_y_comisiones.md) + [`_Pendientes`](Vendedores_y_comisiones_Pendientes.md) — alcance por rol + Pieza F.
- [`Panel_Admin.md`](Panel_Admin.md) — caparazón, roles, regiones, matriz maestra.
- `apps/api/src/middleware/panel.middleware.ts` — resolución de región por rol.
- [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md) — el carril.
