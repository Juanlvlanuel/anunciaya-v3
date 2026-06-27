# Territorios — Módulo del Panel Admin

> **Qué es:** el documento canónico del módulo **Territorios** (sección "Red de ventas") — el mapa
> con el que la red de ventas se reparte la ciudad en **zonas** y cada vendedor marca su prospección.
> Capa 1 = en lenguaje de persona; Capa 2 = apéndice técnico. Lo que FALTA vive en
> [`Territorios_Pendientes.md`](Territorios_Pendientes.md).
>
> **Estado:** ✅ construido + **ronda de pulido UX (26 jun)** en ambas vistas (rediseño responsive móvil/
> horizontal/escritorio, mapa fijo al viewport, pines, FABs, cards inline, tarjeta de detalle). `tsc` de
> `apps/api` y `apps/admin` en verde. Backlog: cobertura multi-región (Pieza F) y curvas en el dibujo.
> **Última actualización:** 26 Junio 2026.

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
- Por cada zona: **editar** (nombre, color y **re-dibujar el contorno** con las 4 herramientas — reabre el
  editor con el polígono precargado, sin tocar la asignación), **reasignar** vendedor o **borrar**. Clic en el
  **nombre** de una zona → el mapa **vuela** (zoom cine) hacia ella.
- **Permiso de edición:** el **super** solo edita/borra/reasigna las zonas que **él creó** (las de los gerentes
  las ve en lectura, sin botones); el **gerente**, cualquiera de **su región**. El front recibe un flag
  `puedoEditar` por zona; el backend es la autoridad.
- **Marcas del equipo:** los pines de los vendedores aparecen sobre el mapa; al pasar el cursor se ve un
  globo con **estado + nota + quién la puso**, y unos chips permiten **filtrar por estado**.
- **Negocios reales:** con el toggle "Negocios en el mapa" se pintan los **comercios de la app** (**pin gota
  con ícono de tienda** blanco, distinto de las marcas que llevan un **punto**) en su ubicación real.
  Diferenciados por atribución: **sin vendedor = oportunidad** (violeta, para asignar) · **con vendedor =
  captado** (teal). Al hacer clic se abre una **tarjeta de detalle** (solo lectura: nombre, estado de
  membresía, asignación y vendedor); en PC también hay popup al pasar el cursor. Los **auto-registrados sin
  vendedor solo los ve el gerente/super** (al vendedor no).

**Vista del Vendedor** ("Mi territorio"):
- Su zona queda **resaltada** y el resto del mapa se **oscurece** (overlay), pero **puede alejar y moverse
  libremente** por el mapa (la restricción de paneo `maxBounds` se quitó — solo se mantiene el overlay). De
  arranque hace un **vuelo con zoom** desde México hasta su zona.
- **"Agregar marca"** (FAB +): toca el mapa y pone un pin (dentro de su zona; fuera está bloqueado); el
  editor abre **al instante** (optimista). Cada marca guarda un **estado** (color) y una **nota**. Puede
  **editar**, **borrar** (optimista) y **arrastrar** el pin para reubicarlo; al seleccionar un pin **crece +
  resalta** y el mapa lo centra bajo el editor. En PC se ve la nota al pasar el cursor.
- Una **lista** de sus marcas (cards inline) con **filtro por estado** (excluyente) y, por card, botón
  **"ver en el mapa"** (centra + acerca + resalta) y **"editar"** (abre el editor).
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
  `ciudades` SET NULL · timestamps. (Existe una columna `negocio_id` pero quedó **inerte**: la liga marca↔negocio se revirtió por no tener caso de uso — el onboarding siempre captura ubicación.)

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
| `components/territorios/MapaTerritorios.tsx` | Mapa admin (MapLibre + OpenFreeMap): pinta zonas + **editor de 4 herramientas** con snapping a calles (arrastre de vértices por mouse **y touch**) + **marcas de vendedores** y **negocios** como **pines** (capa `symbol`) + **tarjeta de detalle** solo-lectura (marca/negocio) al clic, vía **portal** cuando el mapa es fijo. Recibe `mapaFijo` |
| `components/territorios/VistaVendedorTerritorio.tsx` | Vista "Mi territorio": shell responsive (vertical con hoja peek · horizontal con panel deslizable · escritorio con sidebar), FABs sobre el mapa, editor de marca, lista (cards inline con ver/editar) |
| `components/territorios/HojaMovil.tsx` | Bottom-sheet con "peek" reutilizado por ambas vistas (gerente y vendedor): resumen siempre asomado + FABs anclados que suben/bajan con la hoja |
| `components/territorios/MapaMarcas.tsx` | Mapa del vendedor: zona enmascarada (capa "mundo con huecos", **sin `maxBounds`** — paneo libre) + intro animado + marcas como **`maplibregl.Marker`** HTML (arrastrables, con resalte al seleccionar) + negocios pin-tienda + popup + bloqueo dentro/fuera de zona. **Exporta** utilidades reusadas por el mapa admin (`COLOR_TIPO`/`ETIQUETA_TIPO`/`OFFSET_PIN`/`iconoNegocio`/`iconoPinMarca`/`elementoPin`/`aplicarResalte`/`centrarPinBajoEditor`/`ESTADO_BADGE`) |
| `data/menuPanel.ts` | Ítem "Territorios" en "Red de ventas" (`roles: ['superadmin','gerente','vendedor']`, `etiquetaPorRol: { vendedor: 'Mi territorio' }`) |

### Decisiones de diseño
| # | Decisión |
|---|---|
| **D1/D2** | Una zona = un vendedor (`embajador_id` único por zona); un vendedor puede tener varias zonas. |
| **D3** | Zonas **no se traslapan** (particiones). Se valida en la app con turf al crear/editar; sin constraint de BD. |
| **D4** | Geometría **GeoJSON en jsonb** (no PostGIS); validaciones espaciales en JS (ray casting + turf). |
| **D8** | Dibujo por **snapping a calles + edición de vértices** (4 herramientas). Se descartó click-en-colonia (OSM solo tiene puntos en Peñasco) y AGEB de INEGI (costo de datos). |
| Marcas | Estados A: Visitado/Interesado/Cerrado/Sin interés. Pin **libre** (sin ligar a negocio aún, mejora futura). Solo el vendedor las gestiona; gerente/super lectura. |
| UX vendedor | Zona enmascarada (no recorte por `clip-path` — salió invertido en el navegador; se usa capa GeoJSON "mundo con huecos") + intro animado. El **`maxBounds`** (paneo acotado) se **quitó** a pedido: el vendedor puede moverse libre; el overlay basta para resaltar su zona. |
| Auditoría | Crear/editar/asignar/borrar zona → `registrarAuditoria` → `admin_auditoria`. |

### Patrones de UI móvil (ronda de pulido — 26 jun)

Ambas vistas comparten un **shell responsive** de 3 layouts (vertical = mapa total + hoja "peek" `HojaMovil`
· horizontal = mapa de fondo + panel deslizable al 45% · escritorio = mapa + sidebar). Piezas comunes:
- **FABs sobre el mapa** (no botones en el panel): "Agregar marca" / "Nueva zona" alternan **+/×**
  (agregar/cancelar) y, en horizontal, se **mueven con el panel** (`right-3` ↔ `right-[calc(45%+…)]`).
- **Filtros responsive:** carrusel de 1 fila en móvil, `flex-wrap` en escritorio.
- **Cards inline** (zonas y marcas): sin caja, separadas por divisor; iconos de acción en **círculo de color
  contextual** (ver = color de la zona/estado · editar = azul · borrar = rojo). El nombre ya **no** es
  clickeable; la acción "ir/ver en el mapa" pasó a un botón propio.
- **Tarjeta de detalle** (gerente, solo lectura) y popups **grandes** con **offset por dirección**
  (`OFFSET_PIN`) para que apunten centrados al pin.

> **⚠️ Patrón "mapa fijo al viewport" (móvil vertical) — NO romper.** En vertical el mapa va en
> `position: fixed inset-0 z-0`, NO `absolute` dentro de la sección. **Por qué:** al subir/bajar la hoja, el
> "modo mapa" colapsa el header/nav del shell y eso cambiaba el alto del contenedor → MapLibre hacía
> `resize()` y el canvas **destellaba** el fondo beige. Con el mapa fijo, su tamaño **no cambia**; el
> header/nav se **superponen** y al ocultarse **revelan** mapa ya renderizado (transición suave). Piezas que
> lo sostienen y **no se deben quitar**:
> 1. `LayoutMovil`: header y nav con **`relative z-30`** (quedan por encima del mapa fijo).
> 2. El overlay de FABs/editor va con **`pointer-events-none` + hijos `pointer-events-auto`** (si no, tapa
>    los controles de zoom del mapa y dejan de responder).
> 3. `LayoutMovil`: el `<main>` **sin `pb-1.5`** cuando la sección es `territorios` (si no, se ve una franja
>    del mapa entre la hoja y el nav).
> 4. La **tarjeta de detalle** se renderiza por **portal a `document.body`** cuando `mapaFijo` (si no, el
>    stacking context del `fixed` la dejaría debajo de la barra de ciudad). Prop `mapaFijo` en ambos mapas.
> 5. Los controles de zoom (arriba-derecha) bajan dinámicamente cuando el header asoma (hoja expandida).
>
> El `ResizeObserver` de ambos mapas además **debouncea** el `resize()` y el canvas se fuerza a `100%`
> (`.maplibregl-canvas` en `index.css`) para que ningún cambio de alto destelle.

### Verificación
- `tsc -b` de `apps/admin` y `tsc --noEmit` de `apps/api` en **verde**.
- Validado visual con Juan (23 jun): rechazo por traslape, vista del vendedor (zona acotada + marcas +
  drag + filtros) y vista del gerente (marcas de sus vendedores con popup + filtro).
- Pendiente: GATE 2 visual completo de G.1 (insertar/mover/quitar vértice + reasignar + borrar en una
  pasada) y la Pieza F (cobertura multi-región) — ver [`Territorios_Pendientes.md`](Territorios_Pendientes.md).
