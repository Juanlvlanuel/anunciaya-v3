# Territorios — Módulo del Panel Admin

> **Qué es:** el documento canónico del módulo **Territorios** (sección "Red de ventas") — el mapa
> con el que la red de ventas se reparte la ciudad en **zonas** y cada vendedor marca su prospección.
> Capa 1 = en lenguaje de persona; Capa 2 = apéndice técnico. Lo que FALTA vive en
> [`Territorios_Pendientes.md`](Territorios_Pendientes.md).
>
> **Estado:** ✅ construido (código + `tsc` de `apps/api` y `apps/admin` en verde; no-traslape y vista del
> vendedor/gerente validados visualmente con Juan, 23 jun). Backlog: cobertura multi-región (Pieza F) y
> curvas en el dibujo.
> **Última actualización:** 23 Junio 2026.

---

## Capa 1 — Qué es y cómo funciona

### Para qué sirve
Organizar **en el mapa** a la red de ventas de una ciudad. Resuelve dos cosas:
1. **Repartir el territorio:** el gerente/super dibuja **zonas** (polígonos) sobre la ciudad y le asigna
   cada una a un vendedor ("este pedazo es tuyo").
2. **Seguir la prospección:** cada vendedor, en **su** pedazo, deja **marcas** (pines) de los negocios por
   donde ya pasó, con un **estado** (Visitado / Interesado / Cerrado / Sin interés) y una **nota** personal.
   El gerente/super ve esas marcas para supervisar el avance.

### Quién lo usa
Los **3 roles** del Panel, con vistas distintas (el menú se llama **"Territorios"** para gerente/super y
**"Mi territorio"** para el vendedor):
- **SuperAdmin / Gerente** → dibujan/asignan zonas y **ven** las marcas de sus vendedores (lectura).
- **Vendedor** → ve **solo su zona asignada** y gestiona **sus** marcas.

### Qué ve y hace

**Vista del Gerente / Super** (gestión):
- Elige una **ciudad** (selector); el mapa pinta sus **zonas** (color + nombre + vendedor asignado).
- **"Nueva zona"** abre el editor de dibujo con **4 herramientas**: ✏️ Agregar punto · ✋ Mover punto ·
  🗑️ Quitar punto · 🖐️ Mapa (mover/zoom). Los puntos se **pegan a las calles** (snapping) y el pan solo
  está activo en la herramienta "Mapa" (así dibujar no mueve el mapa).
- Al guardar: nombre + color + vendedor. El sistema **rechaza** la zona si se **encima** con otra de la
  misma ciudad (las zonas son particiones, no se solapan).
- Por cada zona: **reasignar** vendedor o **borrar**.
- **Marcas del equipo:** los pines de los vendedores aparecen sobre el mapa; al pasar el cursor se ve un
  globo con **estado + nota + quién la puso**, y unos chips permiten **filtrar por estado**.
- **Negocios reales:** con el toggle "Negocios en el mapa" se pintan los **comercios de la app** (pin tipo
  **anillo**, distinto de las marcas) en su ubicación real. Diferenciados por atribución: **sin vendedor =
  oportunidad** (violeta, para asignar) · **con vendedor = captado** (teal). Popup con nombre, estado de
  membresía y vendedor. Los **auto-registrados sin vendedor solo los ve el gerente/super** (al vendedor no).

**Vista del Vendedor** ("Mi territorio"):
- Ve **solo su zona** — el resto del mapa se **oscurece** y el paneo queda **limitado** a su pedazo (no se
  puede ir a otra parte). De arranque hace un **vuelo con zoom** desde México hasta su zona.
- **"Agregar marca":** toca el mapa y pone un pin (dentro de su zona; fuera está bloqueado). Cada marca
  guarda un **estado** (color) y una **nota**. Puede **editar**, **borrar** y **arrastrar** el pin para
  reubicarlo. Al pasar el cursor sobre un pin se ve su nota.
- Una **lista** de sus marcas con **filtro por estado** (excluyente).
- Toggle **"Mis negocios"**: pinta **solo sus negocios** (los que tiene asignados); no ve los de otros ni los sin asignar.

### Cómo se conecta con la app
Es un módulo **interno del Panel** (operación de la red de ventas). No tiene contraparte pública en
`apps/web`: el comerciante y el usuario final no ven zonas ni marcas. Se apoya en el catálogo de
**Ciudades** (sobre qué ciudades se dibuja) y en **Vendedores/Equipo** (a quién se le asigna).

### Tabla de permisos
| Acción | SuperAdmin | Gerente | Vendedor |
|---|:--:|:--:|:--:|
| Ver el mapa de la ciudad con **todas** sus zonas | ✅ cualquier ciudad | ✅ su región | — |
| Crear / editar / borrar zona · asignar vendedor | ✅ | ✅ (su región) | — |
| Ver **las marcas** de los vendedores (lectura) | ✅ | ✅ (su región) | — |
| Ver **solo su zona** asignada | — | — | ✅ |
| Crear / editar / mover / borrar **sus** marcas | — | — | ✅ |

> Alcance calcado de Vendedores/Negocios: el gerente opera sobre las ciudades de **su región** y sus
> vendedores; el super sin límite (respeta su lente de región si la activa).

### Reglas y FAQ
- **¿Por qué no me deja guardar una zona?** Si se **encima en área** con otra de la misma ciudad. Compartir
  un **borde** (zonas pegadas/adyacentes) sí está permitido — solo se rechaza el solape real.
- **¿Por qué el vendedor no ve el resto del mapa?** Por diseño: el vendedor solo trabaja **su** pedazo. El
  mapa se enmascara y se acota el paneo a su zona.
- **¿El vendedor puede poner una marca fuera de su zona?** No, está bloqueado (con aviso). Tampoco puede
  arrastrar un pin fuera: regresa a su lugar.
- **¿El gerente puede editar las marcas de un vendedor?** No. Las marcas son **del vendedor**; gerente/super
  solo las **ven**.
- **¿Las zonas usan colonias oficiales?** No. Se dibujan a mano con **pegado a calles** (OSM en Puerto
  Peñasco solo tiene las colonias como puntos, no polígonos — ver decisión D8).

---

## Capa 2 — Apéndice técnico

### Modelo de datos (2 tablas nuevas, sin PostGIS)
- **`territorio_zonas`** (migración `docs/migraciones/2026-06-23-territorio-zonas.sql`): `id` · `ciudad_id`
  → `ciudades` CASCADE · `embajador_id` → `embajadores` SET NULL (**NULL = sin asignar**) · `nombre` ·
  `poligono` **jsonb** (GeoJSON `Polygon`) · `color` · `creada_por` · timestamps. Índices: `ciudad_id`,
  `embajador_id`.
- **`territorio_marcas`** (migración `docs/migraciones/2026-06-23-territorio-marcas.sql`): `id` ·
  `embajador_id` → `embajadores` CASCADE · `lat`/`lng` **numeric(9,6)** · `tipo` varchar(20) default
  `'visitado'` + CHECK (`visitado`/`interesado`/`cerrado`/`sin_interes`) · `nota` text · `ciudad_id` →
  `ciudades` SET NULL · timestamps.

> **Geometría en JS, no PostGIS** (D4): basta para dibujar/mostrar/asignar. El punto-en-polígono (bloqueo
> de marcas) se hace en JS (ray casting) y el **no-traslape** con **`@turf/turf`** (`intersect` + `area`).
> Ambas tablas aplicadas por Juan en **DEV y PROD** (Query Tool de pgAdmin).

### Backend (`apps/api`)
| Archivo | Rol |
|---|---|
| `services/admin/territorios.service.ts` | Lecturas con alcance por rol: `listarZonas` · `listarCiudadesDelAlcance` · `listarVendedoresAsignables` · **`listarMarcasEquipo`** (marcas de los vendedores; liga marca→vendedor→zona→ciudad) · **`listarNegociosMapa`** (negocios reales; ubicación de la sucursal principal `negocio_sucursales.ubicacion` —geography— vía `ST_Y/ST_X`) |
| `services/admin/territorios-acciones.service.ts` | Acciones de zona: `crearZona`/`editarZona`/`asignarZona`/`borrarZona` con alcance + **no-traslape** (`seSolapaConOtraZona`, turf; rechaza 409 si la intersección supera el 1% de la zona más chica) + auditoría |
| `services/admin/territorios-marcas.service.ts` | CRUD de las marcas del **vendedor**: `listarMisMarcas`/`crearMarca`/`editarMarca` (admite `lat/lng` para reubicar)/`borrarMarca`, acotado a su `embajador_id` |
| `controllers/admin/territorios.controller.ts` · `routes/admin/territorios.routes.ts` | Controllers + rutas (montadas **antes** del gate global de superadmin, porque entran los 3 roles) |
| `validations/admin/territorios.schema.ts` | Zod: `crearZonaSchema`/`editarZonaSchema`/`asignarZonaSchema` · `crearMarcaSchema`/`editarMarcaSchema` |

**Endpoints** (prefijo `/api/admin/territorios`):
- `GET /zonas` (3 roles · `?ciudadId`) · `GET /ciudades` · `GET /vendedores` · `GET /marcas-equipo` (super+gerente) · `GET /negocios` (3 roles, alcance en el service · `?ciudadId`)
- `POST /zonas` · `PATCH /zonas/:id` · `PATCH /zonas/:id/vendedor` · `DELETE /zonas/:id` (super+gerente)
- `GET /marcas` · `POST /marcas` · `PATCH /marcas/:id` · `DELETE /marcas/:id` (solo vendedor)

### Frontend del Panel (`apps/admin`)
| Archivo | Rol |
|---|---|
| `services/territoriosService.ts` · `config/queryKeys.ts` · `hooks/queries/useTerritoriosAdmin.ts` | React Query: zonas/ciudades/vendedores/marcas-equipo (lectura) + mutaciones de zona + marcas del vendedor (`useMisMarcas`/`useCrearMarca`/`useEditarMarca`/`useMoverMarca`/`useBorrarMarca`) |
| `components/territorios/SeccionTerritorios.tsx` | **Bifurca por rol**: vendedor → `VistaVendedorTerritorio`; super/gerente → `VistaAdminTerritorio` (selector de ciudad · "Nueva zona" · lista de zonas con reasignar/borrar · filtro de "Marcas del equipo") |
| `components/territorios/MapaTerritorios.tsx` | Mapa admin (MapLibre + OpenFreeMap): pinta zonas + **editor de 4 herramientas** con snapping a calles (source-layer `transportation`) + **capa de marcas de vendedores** (lectura) con popup estado/nota/vendedor |
| `components/territorios/VistaVendedorTerritorio.tsx` | Vista "Mi territorio": columna de herramientas (agregar marca, editor estado/nota, lista con filtro) |
| `components/territorios/MapaMarcas.tsx` | Mapa del vendedor: zona enmascarada (capa "mundo con huecos") + `maxBounds` + intro animado + pines + drag + popup + bloqueo dentro/fuera de zona. Exporta `COLOR_TIPO`/`ETIQUETA_TIPO` (reusados por el mapa admin) |
| `data/menuPanel.ts` | Ítem "Territorios" en "Red de ventas" (`roles: ['superadmin','gerente','vendedor']`, `etiquetaPorRol: { vendedor: 'Mi territorio' }`) |

### Decisiones de diseño
| # | Decisión |
|---|---|
| **D1/D2** | Una zona = un vendedor (`embajador_id` único por zona); un vendedor puede tener varias zonas. |
| **D3** | Zonas **no se traslapan** (particiones). Se valida en la app con turf al crear/editar; sin constraint de BD. |
| **D4** | Geometría **GeoJSON en jsonb** (no PostGIS); validaciones espaciales en JS (ray casting + turf). |
| **D8** | Dibujo por **snapping a calles + edición de vértices** (4 herramientas). Se descartó click-en-colonia (OSM solo tiene puntos en Peñasco) y AGEB de INEGI (costo de datos). |
| Marcas | Estados A: Visitado/Interesado/Cerrado/Sin interés. Pin **libre** (sin ligar a negocio aún, mejora futura). Solo el vendedor las gestiona; gerente/super lectura. |
| UX vendedor | Zona enmascarada (no recorte por `clip-path` — salió invertido en el navegador; se usa capa GeoJSON "mundo con huecos") + `maxBounds` + intro animado. |
| Auditoría | Crear/editar/asignar/borrar zona → `registrarAuditoria` → `admin_auditoria`. |

### Verificación
- `tsc -b` de `apps/admin` y `tsc --noEmit` de `apps/api` en **verde**.
- Validado visual con Juan (23 jun): rechazo por traslape, vista del vendedor (zona acotada + marcas +
  drag + filtros) y vista del gerente (marcas de sus vendedores con popup + filtro).
- Pendiente: GATE 2 visual completo de G.1 (insertar/mover/quitar vértice + reasignar + borrar en una
  pasada) y la Pieza F (cobertura multi-región) — ver [`Territorios_Pendientes.md`](Territorios_Pendientes.md).
