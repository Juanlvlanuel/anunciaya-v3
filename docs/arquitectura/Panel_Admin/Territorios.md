# Territorios — Módulo del Panel Admin

> **Qué es:** el documento canónico del módulo **Territorios** (sección "Red de ventas") — el mapa
> con el que la red de ventas se reparte la ciudad en **zonas** y cada vendedor marca su prospección.
> Capa 1 = en lenguaje de persona; Capa 2 = apéndice técnico. Lo que FALTA vive en
> [`Territorios_Pendientes.md`](Territorios_Pendientes.md).
>
> **Estado:** ✅ **CERRADO** (GATE 2 visual de G.1 validado por Juan, 27 jun) + **ronda de pulido UX (26 jun)**
> en ambas vistas (rediseño responsive móvil/horizontal/escritorio, mapa fijo al viewport, pines, FABs, cards
> inline, tarjeta de detalle). `tsc` de `apps/api` y `apps/admin` en verde. Backlog (no bloqueante): cobertura
> multi-región (Pieza F) y curvas en el dibujo.
> **Última actualización:** 28 Julio 2026 (página completa "Mis notas" — todas las notas que escribí sobre
> mis negocios asignados, buscable por nombre — + badge ámbar en el pin del negocio que ya tiene nota).
> Anterior: 27 Julio 2026 (permiso de edición del super ampliado a cualquier zona + nota
> del vendedor sobre sus negocios asignados, con paridad para el gerente-vendedor + el gerente puede poner
> "sus puntos" sin necesitar una zona propia, eligiendo ciudad en su lugar).

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
- **SuperAdmin / Gerente** → dibujan/asignan zonas y **ven** las marcas de sus vendedores (lectura). El
  **gerente además** tiene su propia figura de vendedor (embajador propio, ver §"Mis puntos" más abajo) y
  puede prospectar por su cuenta **sin tener una zona propia**.
- **Vendedor** → ve **solo su zona asignada** y gestiona **sus** marcas.

### Qué ve y hace

**Vista del Gerente / Super** (gestión):
- Elige una **ciudad** (selector); el mapa pinta sus **zonas** (color + nombre + vendedor asignado).
  **Con una sola ciudad en el alcance (29 jul 2026 — hoy: solo Puerto Peñasco), el selector se
  autoselecciona y NO se muestra** (un dropdown de una sola opción no aporta nada). Con 2+ ciudades,
  el selector reaparece normal.
- **El mapa arranca YA centrado en Puerto Peñasco** (29 jul 2026): se probó un "vuelo de cine"
  (México → la ciudad) al entrar, pero resultó poco confiable — `centro` no estaba memoizado en
  `SeccionTerritorios`, así que cualquier re-render ajeno del panel rearmaba el reencuadre pendiente
  y cortaba el vuelo a medias con un salto instantáneo. Se simplificó: el centro/zoom inicial del
  mapa (`CENTRO_PUERTO_PENASCO`/`ZOOM_INICIAL` en `MapaTerritorios.tsx`) es la ciudad directamente,
  sin animación de entrada. Cuando haya más de una ciudad, esto debe resolverse dinámicamente.
- **Botón "Mi ubicación"** (icono de mira, junto al zoom, 29 jul): detecta el GPS real del navegador y
  vuela ahí (puntito azul). Antes ("Centrar zonas") encuadraba las zonas de la ciudad — se cambió para
  que gerente/super también puedan ubicarse en campo si están de visita, no solo desde escritorio.
- **"Nueva zona"** abre el editor de dibujo con **4 herramientas**: ✏️ Agregar punto · ✋ Mover punto ·
  🗑️ Quitar punto · 🖐️ Mapa (mover/zoom). Los puntos se **pegan a las calles** (snapping) y el pan solo
  está activo en la herramienta "Mapa" (así dibujar no mueve el mapa).
- Al guardar: nombre + color + vendedor. El sistema **rechaza** la zona si se **encima** con otra de la
  misma ciudad (las zonas son particiones, no se solapan).
- Por cada zona: **editar** (nombre, color y **re-dibujar el contorno** con las 4 herramientas — reabre el
  editor con el polígono precargado, sin tocar la asignación), **reasignar** vendedor o **borrar**. Clic en el
  **nombre** de una zona → el mapa **vuela** (zoom cine) hacia ella.
- **Permiso de edición:** el **super** edita/borra/reasigna **cualquier zona** (propia o de un gerente); el
  **gerente**, cualquiera de **su región**. El front recibe un flag `puedoEditar` por zona; el backend es la
  autoridad.
- **Marcas del equipo:** los pines de los vendedores aparecen sobre el mapa; al pasar el cursor se ve un
  globo con **estado + nota + quién la puso**, y unos chips permiten **filtrar por estado**.
- **Negocios reales:** con el toggle "Negocios en el mapa" se pintan los **comercios de la app** (**pin gota
  con ícono de tienda** blanco, distinto de las marcas que llevan un **punto**) en su ubicación real.
  Diferenciados por atribución: **sin vendedor = oportunidad** (violeta, para asignar) · **con vendedor =
  captado** (teal). Al hacer clic se abre una **tarjeta de detalle** (solo lectura: nombre, estado de
  membresía, asignación, vendedor y **nota del vendedor** si tiene); en PC también hay popup al pasar el
  cursor. Los **auto-registrados sin vendedor solo los ve el gerente/super** (al vendedor no).
- **"Mis puntos" (solo gerente):** un gerente también es vendedor (embajador propio) y puede querer
  prospectar sin dibujar/auto-asignarse una zona antes. FAB **"Agregar punto"** (ícono de pin, estilo
  contorno para distinguirlo de "Nueva zona") — exige **elegir una ciudad** del selector primero (misma UX
  que "Nueva zona"; el punto queda atribuido a esa ciudad), luego un toque en el mapa pone el punto y abre
  su editor al instante (estado + nota), igual que el editor del vendedor. Los pines de "mis puntos" son
  **arrastrables** (sin restricción de zona: se pueden mover a cualquier parte) y aparecen en una lista
  aparte ("Mis puntos") debajo de la lista de zonas, con botón editar. No compiten con "Marcas del equipo":
  esas son de los vendedores reales; las del propio gerente quedan excluidas de ahí para no verse dos veces.
- **Cuando un negocio de una marca manual ya se registró en la app:** su pin real (negocio) va a aparecer
  junto al pin manual (marca) del mismo lugar — **no hay borrado ni ocultado automático** (decisión de
  Juan, 27 jul): no hay forma confiable de saber que son "el mismo lugar" sin coordenadas idénticas (la liga
  marca↔negocio se descartó antes, ver Capa 2). El vendedor/gerente borra la marca manual a mano cuando ve
  que ya quedó duplicada.

**Vista del Vendedor** ("Mi territorio"):
- Su zona queda **resaltada** y el resto del mapa se **oscurece** (overlay), pero **puede alejar y moverse
  libremente** por el mapa (la restricción de paneo `maxBounds` se quitó — solo se mantiene el overlay). El
  mapa arranca ya en Puerto Peñasco (29 jul) y, en cuanto cargan las zonas, hace un **vuelo con zoom** hasta
  la suya.
- **"Agregar marca"** (FAB +): toca el mapa y pone un pin (dentro de su zona; fuera está bloqueado); el
  editor abre **al instante** (optimista). Cada marca guarda un **estado** (color) y una **nota**. Puede
  **editar**, **borrar** (optimista) y **arrastrar** el pin para reubicarlo; al seleccionar un pin **crece +
  resalta** y el mapa lo centra bajo el editor. En PC se ve la nota al pasar el cursor.
- Una **lista** de sus marcas (cards inline) con **filtro por estado** (excluyente) y, por card, botón
  **"ver en el mapa"** (centra + acerca + resalta) y **"editar"** (abre el editor).
- Toggle **"Mis negocios"**: pinta **solo sus negocios** (los que tiene asignados); no ve los de otros ni los sin asignar.
- **Botón "Mi ubicación"** (icono de mira, junto al zoom, 29 jul): detecta el GPS real del navegador
  (`navigator.geolocation`) y vuela ahí, dejando un puntito azul (estilo Google Maps). Antes centraba
  la zona asignada — poco útil porque la zona ya está resaltada; ahora sirve para ubicarse en campo.
- **Nota del negocio:** al hacer clic en el pin de uno de **sus** negocios asignados se abre un mini-editor
  (nombre + textarea) para escribir/editar una **nota libre de seguimiento** ("pidió llamar la próxima
  semana…"). Nota **única por negocio** (se sobrescribe, sin historial); solo la escribe el **vendedor dueño
  de la asignación** (`negocios.embajador_id`) — el **gerente también** si el negocio quedó atribuido a él
  (tiene su propio `embajador_id`, ver `reference_gerente_tambien_vendedor`): en su vista "Territorios" (no
  "Mi territorio"), el pin de un negocio **suyo** abre la nota **editable** dentro de la misma tarjeta de
  detalle; los de otros vendedores siguen en **solo lectura**. El super nunca tiene negocios "suyos", así que
  siempre ve solo lectura.
- **Badge de "tiene nota" (28 jul 2026):** el pin que ya tiene una nota escrita muestra un **puntito
  ámbar** en la esquina — aplica tanto al pin de un **negocio** con vendedor asignado como al pin de
  **mi propia marca** de prospección (el vendedor en "Mi territorio" y el gerente en "Mis puntos"). Antes
  no había ninguna señal visual de qué puntos ya tenían seguimiento anotado.
- **"Mis notas" (28 jul 2026):** botón "Notas" (vendedor siempre; gerente si tiene negocios/marcas en su
  cartera) que abre una **página completa** (reemplaza el mapa) con **todas** mis notas — de **dos orígenes
  distintos, unificados en una sola lista**: mis **negocios** asignados con nota (`nota_territorio`) y mis
  **marcas** de prospección con nota (`territorio_marcas.nota`, los pines que yo mismo pongo al recorrer la
  zona). Buscable por nombre (el de la marca es el campo opcional "Nombre del negocio" del editor de marca).
  Cada tarjeta tiene "Ver en el mapa": si es un negocio, centra/cambia de ciudad; si es una marca, centra
  exacto (vendedor) o abre su editor (gerente). Alcance **solo mis propias notas** (dueño real por
  `embajador_id`) — no hay vista agregada de las notas de todo el equipo.

### Cómo se conecta con la app
Es un módulo **interno del Panel** (operación de la red de ventas). No tiene contraparte pública en
`apps/web`: el comerciante y el usuario final no ven zonas ni marcas. Se apoya en el catálogo de
**Ciudades** (sobre qué ciudades se dibuja) y en **Vendedores/Equipo** (a quién se le asigna).

### Tabla de permisos
| Acción | SuperAdmin | Gerente | Vendedor |
|---|:--:|:--:|:--:|
| Ver el mapa de la ciudad con **todas** sus zonas | ✅ cualquier ciudad | ✅ su región | — |
| Crear / editar / borrar **cualquier** zona · asignar vendedor | ✅ | ✅ (su región) | — |
| Ver **las marcas** de los vendedores (lectura) | ✅ | ✅ (su región) | — |
| Ver **solo su zona** asignada | — | — | ✅ |
| Crear / editar / mover / borrar **sus** marcas | — | — | ✅ |
| Escribir la **nota** de un negocio asignado a **su propio `embajador_id`** | — | ✅ (si tiene negocios propios) | ✅ |
| Ver la nota de un negocio (lectura) | ✅ | ✅ (su región) | ✅ (los suyos) |
| Crear / editar / mover / borrar **sus propios puntos**, **sin zona propia** (solo exige ciudad) | — | ✅ | — (ya nace con zona) |

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
- **`negocios.nota_territorio`** (migración `docs/migraciones/2026-07-27-negocios-nota-territorio.sql`):
  columna `text` nullable en la tabla `negocios` ya existente. Nota **única** (se sobrescribe) del vendedor
  asignado sobre ese negocio; NO es una tabla nueva ni un historial — mismo patrón que `contraprestacion`
  (promoción de apertura).

> **Geometría en JS, no PostGIS** (D4): basta para dibujar/mostrar/asignar. El punto-en-polígono (bloqueo
> de marcas) se hace en JS (ray casting) y el **no-traslape** con **`@turf/turf`** (`intersect` + `area`).
> Ambas tablas aplicadas por Juan en **DEV y PROD** (Query Tool de pgAdmin).

### Backend (`apps/api`)
| Archivo | Rol |
|---|---|
| `services/admin/territorios.service.ts` | Lecturas con alcance por rol: `listarZonas` · `listarCiudadesDelAlcance` · `listarVendedoresAsignables` · **`listarMarcasEquipo`** (marcas de los vendedores; liga marca→vendedor→zona→ciudad) · **`listarNegociosMapa`** (negocios reales; ubicación de la sucursal principal `negocio_sucursales.ubicacion` —geography— vía `ST_Y/ST_X`) |
| `services/admin/territorios-acciones.service.ts` | Acciones de zona: `crearZona`/`editarZona`/`asignarZona`/`borrarZona` con alcance + **no-traslape** (`seSolapaConOtraZona`, turf; rechaza 409 si la intersección supera el 1% de la zona más chica) + auditoría |
| `services/admin/territorios-marcas.service.ts` | CRUD de las marcas del **vendedor o gerente** (ambos tienen `embajador_id` propio): `listarMisMarcas`/`crearMarca`/`editarMarca` (admite `lat/lng` para reubicar)/`borrarMarca`, acotado a su embajador. El **gerente** (sin zona propia) debe indicar `ciudadId` al crear — se valida con `ciudadEnAlcance` (exportada de `territorios-acciones.service.ts`) que caiga en su región; el vendedor no lo necesita (ya vive dentro de su zona). También `actualizarNotaNegocio` (nota del vendedor/gerente sobre uno de SUS negocios asignados — verifica `negocios.embajador_id` contra su propio embajador antes de escribir) |
| `controllers/admin/territorios.controller.ts` · `routes/admin/territorios.routes.ts` | Controllers + rutas (montadas **antes** del gate global de superadmin, porque entran los 3 roles) |
| `validations/admin/territorios.schema.ts` | Zod: `crearZonaSchema`/`editarZonaSchema`/`asignarZonaSchema` · `crearMarcaSchema`/`editarMarcaSchema` · `notaNegocioSchema` |

**Endpoints** (prefijo `/api/admin/territorios`):
- `GET /zonas` (3 roles · `?ciudadId`) · `GET /ciudades` · `GET /vendedores` · `GET /marcas-equipo` (super+gerente) · `GET /negocios` (3 roles, alcance en el service · `?ciudadId`)
- `POST /zonas` · `PATCH /zonas/:id` · `PATCH /zonas/:id/vendedor` · `DELETE /zonas/:id` (super+gerente; el super sobre **cualquier** zona)
- `GET /marcas` · `POST /marcas` · `PATCH /marcas/:id` · `DELETE /marcas/:id` (vendedor **o gerente**; el gerente exige `ciudadId` al crear)
- `PATCH /negocios/:id/nota` (vendedor **o gerente**, solo sobre uno de **sus** negocios asignados — verificado por `embajador_id`, no por rol)
- `GET /mis-notas` (vendedor **o gerente**, 28 jul) — negocios de mi propio `embajador_id` con `nota_territorio` no vacía, ordenados por nombre (`listarMisNotasNegocio` en `territorios.service.ts`)

### Frontend del Panel (`apps/admin`)
| Archivo | Rol |
|---|---|
| `services/territoriosService.ts` · `config/queryKeys.ts` · `hooks/queries/useTerritoriosAdmin.ts` | React Query: zonas/ciudades/vendedores/marcas-equipo (lectura) + mutaciones de zona + marcas del vendedor/gerente (`useMisMarcas`/`useCrearMarca` —admite `ciudadId`—/`useEditarMarca`/`useMoverMarca`/`useBorrarMarca`) + `useActualizarNotaNegocio` (nota de un negocio asignado) |
| `components/territorios/SeccionTerritorios.tsx` | **Bifurca por rol**: vendedor → `VistaVendedorTerritorio`; super/gerente → `VistaAdminTerritorio` (selector de ciudad · "Nueva zona" · lista de zonas con reasignar/borrar · filtro de "Marcas del equipo" · **si es gerente**: FAB "Agregar punto" + mini-editor + lista "Mis puntos", mutuamente excluyente con el dibujo de zonas) |
| `components/territorios/MapaTerritorios.tsx` | Mapa admin (MapLibre + OpenFreeMap): pinta zonas + **editor de 4 herramientas** con snapping a calles (arrastre de vértices por mouse **y touch**) + **marcas de vendedores** y **negocios** como **pines** (capa `symbol`) + **tarjeta de detalle** al clic (marca siempre solo-lectura; negocio solo-lectura salvo que `esMio` → editor de nota inline) + **"mis puntos"** del gerente como `maplibregl.Marker` arrastrables (props `misMarcas`/`modoAgregarMarca`/`onAgregarMarca`/`onClicMiMarca`/`onMoverMiMarca`/`miMarcaSeleccionadaId`, mismo patrón que `MapaMarcas.tsx` pero sin restricción de zona), vía **portal** cuando el mapa es fijo. Recibe `mapaFijo` · `onGuardarNotaNegocio` · `guardandoNotaNegocio` |
| `components/territorios/VistaVendedorTerritorio.tsx` | Vista "Mi territorio": shell responsive (vertical con hoja peek · horizontal con panel deslizable · escritorio con sidebar), FABs sobre el mapa, editor de marca, editor de **nota de negocio** (mini-form análogo, sin selector de estado ni borrar), lista (cards inline con ver/editar) |
| `components/territorios/HojaMovil.tsx` | Bottom-sheet con "peek" reutilizado por ambas vistas (gerente y vendedor): resumen siempre asomado + FABs anclados que suben/bajan con la hoja |
| `components/territorios/MapaMarcas.tsx` | Mapa del vendedor: zona enmascarada (capa "mundo con huecos", **sin `maxBounds`** — paneo libre) + intro animado + marcas como **`maplibregl.Marker`** HTML (arrastrables, con resalte al seleccionar) + negocios pin-tienda + popup (con nota si tiene) + bloqueo dentro/fuera de zona. **Arranca ya centrado en Puerto Peñasco** (`CENTRO_PUERTO_PENASCO`, 29 jul) en vez de México — antes, sin zona asignada, el intro (que vuela a los bounds de la zona) no tenía a dónde ir y el mapa se quedaba en México para siempre; con zona asignada, el vuelo a la zona sigue igual, solo que ahora arranca ya en la ciudad correcta. Prop `onClicNegocio` (clic en un negocio propio abre el editor de nota en vez del popup). **Exporta** utilidades reusadas por el mapa admin (`COLOR_TIPO`/`ETIQUETA_TIPO`/`OFFSET_PIN`/`iconoNegocio`/`iconoPinMarca`/`elementoPin`/`aplicarResalte`/`centrarPinBajoEditor`/`ESTADO_BADGE`/`contenidoPopupNegocio`). `iconoNegocio(color, conNota?)` (28 jul) agrega el badge ámbar; el sprite `negocio-con-nota` se registra junto a `negocio-sin`/`negocio-con` y el `icon-image` del layer elige por `nota !== ''` — mismo patrón calcado en `MapaTerritorios.tsx` |
| `components/territorios/PanelNotasNegocios.tsx` | Página completa "Mis notas" (28 jul), puramente presentacional: recibe `items: NotaListItem[]` ya unificados (no pide datos). Cada vista padre arma el arreglo combinando `useMisNotasNegocio()` (negocios) + `useMisMarcas()`/`misMarcas` filtradas por `nota` no vacía (marcas) — datos que YA tenía cargados, sin duplicar requests. Buscador por nombre + "Ver en el mapa" por tarjeta. La monta tanto `VistaVendedorTerritorio` como `VistaAdminTerritorio` (solo gerente) como un `if (vista === 'notas') return <PanelNotasNegocios .../>` antes de los 3 layouts responsive — no duplica el armazón móvil/escritorio |
| `data/menuPanel.ts` | Ítem "Territorios" en "Red de ventas" (`roles: ['superadmin','gerente','vendedor']`, `etiquetaPorRol: { vendedor: 'Mi territorio' }`) |

### Decisiones de diseño
| # | Decisión |
|---|---|
| **D1/D2** | Una zona = un vendedor (`embajador_id` único por zona); un vendedor puede tener varias zonas. |
| **D3** | Zonas **no se traslapan** (particiones). Se valida en la app con turf al crear/editar; sin constraint de BD. |
| **D4** | Geometría **GeoJSON en jsonb** (no PostGIS); validaciones espaciales en JS (ray casting + turf). |
| **D8** | Dibujo por **snapping a calles + edición de vértices** (4 herramientas). Se descartó click-en-colonia (OSM solo tiene puntos en Peñasco) y AGEB de INEGI (costo de datos). |
| Marcas | Estados A: Visitado/Interesado/Cerrado/Sin interés. Pin **libre** (sin ligar a negocio aún, mejora futura). Solo el vendedor las gestiona; gerente/super lectura. |
| Edición de zonas (super) | **27 jul 2026:** se quitó la restricción "el super solo edita las zonas que él creó" — ahora el super edita/borra/reasigna **cualquier** zona (propia o de un gerente). El gerente sigue acotado a su región. |
| Nota de negocio | **27 jul 2026:** nota libre **única** (se sobrescribe, sin historial) que el vendedor escribe sobre uno de **sus** negocios asignados (columna `negocios.nota_territorio`). Solo el dueño de la asignación escribe; gerente/super y el propio vendedor la ven de lectura en popup/tarjeta. Se descartó ligarla a `territorio_marcas` (esa tabla es de prospección propia del vendedor, no de negocios reales — ver decisión "liga marca↔negocio DESCARTADA"). |
| Nota de negocio · gerente-vendedor | **27 jul 2026 (ajuste):** el permiso de escritura NO se decide por `rol_equipo` sino por dueño real (`negocios.embajador_id === mi embajador_id`) — un **gerente** también tiene `embajador_id` propio (memoria `reference_gerente_tambien_vendedor`) y puede tener negocios en su cartera. `listarNegociosMapa` agrega el flag `esMio`; en la vista de gestión (`MapaTerritorios`), la tarjeta de detalle de un negocio **"esMio"** muestra el editor (antes solo existía en "Mi territorio", inalcanzable para un gerente). |
| Marcas del gerente sin zona | **27 jul 2026:** el vendedor SIEMPRE nace con una zona asignada, así que nunca choca con "necesito zona para marcar" — pero un gerente que arranca a vender sí, y Juan no quiere obligarlo a dibujar/auto-asignarse una zona solo para poner un punto. Se relajó `crearMarca`/`listarMisMarcas`/`editarMarca`/`borrarMarca` a `(vendedor\|gerente)`; el gerente, en vez de zona, elige **ciudad** (validada contra su región) — mismo patrón que "Nueva zona". `listarMarcasEquipo` excluye el `embajador_id` del propio gerente para que no se vea a sí mismo dos veces (una vez en "Mis puntos", otra en "Marcas del equipo"). |
| Marca-negocio duplicado sin resolver | **27 jul 2026 (decidido, sin construir):** cuando el negocio de una marca manual se registra en la app, su pin real aparece SOLO junto a la marca vieja — sin dedup automático (Juan: "nada automático"). No hay forma confiable de saber que son el mismo lugar sin coordenadas idénticas, y la liga marca↔negocio ya se descartó antes (`negocio_id` inerte). El vendedor/gerente borra la marca a mano. |
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
- **GATE 2 visual de G.1 validado por Juan (27 jun):** dibujar zona real + insertar/mover/quitar vértice +
  snapping a calles + reasignar + borrar en una pasada. **Módulo cerrado.**
- Backlog (no bloqueante): la Pieza F (cobertura multi-región) y las curvas en el dibujo — ver
  [`Territorios_Pendientes.md`](Territorios_Pendientes.md).
