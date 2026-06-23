# Ciudades — Pendientes (checklist vivo)

> **Qué es esto:** el checklist vivo del módulo **Ciudades** del Panel Admin (lo que FALTA).
> Lo que YA funciona se documenta en `Ciudades.md` (doc canónico, se escribe en Fase 3).
> Proceso: [`../../estandares/FLUJO_MODULO_PANEL.md`](../../estandares/FLUJO_MODULO_PANEL.md). Plantilla de oro: **Negocios**.
>
> **Última actualización:** 23 Junio 2026 · **Fase actual:** 3 — CERRADO (módulo construido y en uso; solo quedan los pendientes menores de abajo).

---

## El objetivo (por qué existe el módulo)

Que el SuperAdmin **dé de alta una ciudad nueva desde el Panel** (ej. Hermosillo) y esa ciudad
quede **habilitada en el alcance de la app** — aparece en el selector del header, el onboarding,
al crear sucursales, etc. — **sin tocar código ni hacer deploy**. Y, de paso, gestionar el catálogo:
agrupar ciudades en regiones, activar/desactivar, editar.

**Dato clave que parte el trabajo en dos frentes:** hoy la app NO lee de la tabla `ciudades`, lee
del array hardcodeado `ciudadesPopulares` (8 consumidores en `apps/web`). Por eso "agregar una fila"
no basta: hay que enchufar la app a la tabla.

---

## Fase 0 — Definir ✅ (cerrada 18 jun 2026)

### Mini-spec

**Qué hace**
- Alta de **ciudad nueva** (nombre, estado, coords vía mini-mapa, región, activa). Slug autogenerado y único.
- Editar ciudad (nombre, estado, coords, importancia, región, activa).
- Activar/desactivar ciudad.
- Crear regiones; **editar** regiones (renombrar, activar/desactivar, agregar/quitar/re-ordenar sus ciudades).
- VER: lista de ciudades (con su región) + lista de regiones (con # ciudades).
- **Enchufar la app:** endpoint público + migrar los 8 consumidores de `ciudadesPopulares` a leer de la tabla.

**Qué NO hace**
- No toca negocios/usuarios/vendedores directamente (ellos *deducen* la región vía ciudad).
- No dibuja territorios en mapa (Vendedores v2).
- No gestiona la cobertura de vendedores (`embajador_ciudades`) — solo respeta su regla "una región".
- **No elimina regiones** (solo desactiva) — borrar dispara `SET NULL` en ciudades y en el gerente asignado.

**Matriz de permisos** — **solo SuperAdmin** (gerente y vendedor sin acceso; ya reflejado en `menuPanel.ts`).
Sin alcance por región → no necesita `condicionAlcance`. Ruta montada **después** del gate global de superadmin.

### Modelo de datos (ya existe en BD, poblado — sin migración nueva)
- `ciudades` (id, nombre, estado, pais, **slug** único, lat, lng, alias jsonb, importancia, **activa**, **region_id**→regiones SET NULL, created_at) — 70 filas.
- `regiones` (id, nombre único, activa, created_at) — 2 de ejemplo en dev.
- `embajador_ciudades` (PK embajador+ciudad) + **trigger "una región"**: ciudades de un vendedor todas de la misma región; ciudad sin región no se puede asignar.

### Decisiones de diseño
- **ORM:** `ciudades` y `embajador_ciudades` se **agregan a `schema.ts`** (hoy solo viven en BD; `resolverCiudadId` usa SQL crudo). No destructivo — las tablas ya existen. Calca la plantilla de oro (Drizzle).
- **Sin migración SQL nueva** — el schema está completo.
- **Slug:** autogenerado con la misma normalización que `slugCiudad` (`utils/ciudades.ts`); único (anti "Peñasco"/"Penasco").
- **Mover ciudad de región:** **bloquear** si deja a un vendedor cubriendo 2 regiones (el trigger solo valida al tocar `embajador_ciudades`, no al mover la ciudad) — mismo espíritu que el trigger, con mensaje claro.
- **Mapa interactivo (decisión 18 jun):** el alta y la agrupación se hacen sobre un **mapa de México interactivo** (no campos lat/lng manuales). Hace **"las dos cosas"**: las ciudades del **dataset que aún NO están** en el catálogo se ven en gris y al clic se **dan de alta** (varias de un jalón); las que **ya están** se ven en color y al clic se **seleccionan para agrupar** en una región. Coords salen del dataset (clic), no se teclean.
  - **Fuente de ciudades del mapa:** un **dataset empaquetado** en el repo (ciudades de México: nombre, estado, lat/lng, de fuente pública) como capa de puntos clicables. Sin API key, sin red de terceros, ampliable. Empezar con las ciudades principales (capitales + medianas/grandes) y ampliar.
  - **Tiles de fondo:** **OpenFreeMap** (vector tiles gratis, sin API key) vía `maplibre-gl` (a instalar en `apps/admin`). Cambiable por otro proveedor en 1 línea si se quiere self-host en prod.

### Criterios de aceptación (Definición de Terminado)
- [ ] El SuperAdmin ve la lista completa de ciudades con su región y estado activa/inactiva, y la lista de regiones con su # de ciudades.
- [ ] Puede **crear una ciudad nueva** con coords (mini-mapa) y queda con slug único; un slug duplicado se rechaza con mensaje claro.
- [ ] Puede activar/desactivar una ciudad y asignarle/cambiarle región (bloqueado si rompe la regla "una región" de un vendedor).
- [ ] Puede crear una región y editarla (renombrar, activar/desactivar, agregar/quitar ciudades).
- [ ] Tras dar de alta + activar una ciudad, **aparece en el selector de ciudad de la app pública** (header, onboarding, crear sucursal) sin redeploy.
- [ ] Gerente/vendedor NO acceden al módulo (403).
- [ ] Toda acción sensible queda en `admin_auditoria`.

---

## Fase 1 — VER

### Frente A — Panel (backend de lectura) ✅
- [x] Agregar `ciudades` + `embajadorCiudades` (+ índices/PK reales) a `schema.ts`.
- [x] `services/admin/ciudades.service.ts` — `listarCiudadesCatalogo(filtros)` (con región resuelta) + `listarRegionesConConteo()`.
- [x] `controllers/admin/ciudades.controller.ts` + `routes/admin/ciudades.routes.ts` (montar tras el gate global).
- [x] GATE 1 backend: `tsc --noEmit` verde + harness `probar-ciudades-lectura.ts` **TODO VERDE** (70 ciudades, 2 regiones, filtros OK).

### Frente A — Panel (frontend de lectura) ✅
- [x] `services/ciudadesService.ts` → `hooks/queries/useCiudadesAdmin.ts` (React Query, `keepPreviousData`).
- [x] Sección `components/ciudades/SeccionCiudades.tsx` — pestañas **Ciudades** (buscador + filtro de región + chips activa/inactiva + tabla escritorio / cards móvil) y **Regiones** (lista con # ciudades). `EstadoSeccion`, `data-testid`, tokens del Panel.
- [x] Registro en el shell (`PaginaPanel.tsx`; `ciudades` ya estaba en `menuPanel.ts`).
- [x] `tsc -b` del Panel en verde. **Falta:** verificación visual levantando el Panel (la hace Juan o a pedido).

---

## Fase 2 — ACTUAR

### Frente A — Panel (backend de acciones) ✅
- [x] `services/admin/ciudades-acciones.service.ts` (+ controller + rutas + Zod):
  - Ciudad: `crearCiudad` (slug + 409 duplicado) · `crearCiudadesMultiple` (alta de varias desde el mapa; omite las ya existentes) · `editarCiudad` · `cambiarActivaCiudad` · `asignarRegionCiudad` y `asignarRegionMultiple` (con **guard "una región"** de vendedores).
  - Región: `crearRegion` (409 nombre, case-insensitive) · `editarRegion` (renombrar/activar/desactivar). Sin eliminar.
  - Auditoría en cada acción (`registrarAuditoria` → `admin_auditoria`).
- [x] GATE 2 backend: harness `probar-ciudades-acciones.ts` **TODO VERDE** con datos reales (incluido el guard "una región" con vendedor temporal) + `tsc --noEmit` verde.

### Frente A — Panel (mapa interactivo + frontend de acciones)
- [x] Empaquetar el **dataset de ciudades de México** — `apps/admin/public/ciudades-mexico.json` (4,563 localidades urbanas de INEGI: clave, nombre, estado, municipio, lat, lng; 586 KB). Generador reproducible: `apps/admin/scripts/generar-ciudades-mx.mjs`. Fuente: INEGI (Marco Geoestadístico), uso libre con atribución.
- [x] Instalar `maplibre-gl` en `apps/admin` + componente `MapaCiudades` (tiles OpenFreeMap, capa de los 4,563 puntos, **azul** = en catálogo / **gris** = por agregar / **ámbar** = seleccionada, multi-selección por clic, etiquetas al hacer zoom, leyenda). **Lazy-load** (maplibre fuera del chunk principal del Panel).
- [x] Flujos: **alta múltiple** (grises → `DialogoMapaAccion` → `crearCiudadesMultiple`) y **agrupar** (azules → elegir región → `asignarRegionMultiple`). Hooks de mutación con invalidación (`useCiudadesAdmin`). `tsc -b` + `build` verdes.
- [x] Acciones por fila: **Ciudades** → menú (activar/desactivar · asignar/cambiar región con `DialogoAsignarRegion`); **Regiones** → botón "Crear región" + editar por fila (`DialogoRegion`: renombrar/activar/desactivar). Menú reutilizable `MenuAcciones`. `build` verde. _Pendiente menor: editar ciudad (nombre/estado/coords/importancia) — raro, el dataset INEGI viene bien; backend ya lo soporta._
- [ ] GATE 2 visual (levantar el Panel: ver mapa, alta y agrupar con datos reales) + PULIDO (`Tokens_Panel.md`, responsive `lg:`/`2xl:`, tema claro/oscuro del mapa).

### Frente B — Enchufar la app pública (`apps/web`)
- [x] Endpoint **público** `GET /api/ciudades` (ciudades activas; forma compatible con `ciudadesPopulares` + `id`/`slug`). `ciudadesPublica.service/controller/routes`, montado en `routes/index.ts`. Probado: 70 activas, `tsc` verde.
- [x] Hook `useCiudades` (`apps/web/src/hooks/queries/useCiudades.ts`) + service `ciudadesService.ts` (web). **Con fallback a la semilla** (si la API falla, queda el array hardcodeado).
- [x] **Patrón "catálogo en memoria hidratable"** (en `data/ciudadesPopulares.ts`): `setCatalogoCiudades`/`obtenerCatalogoCiudades` + las funciones (`buscarCiudades`/`getCiudadesPopulares`/`buscarCiudadCercana`) leen el catálogo activo. Así los **6 consumidores que usan funciones** (`Navbar`, `MobileHeader`, `ModalUbicacion`, `PasoUbicacion`, `TabUbicacion`, `ModalCrearSucursal`) **no cambian**; solo cambiaron `useGpsStore` (array→getter) y `RootLayout` (monta `useCiudades()`). `tsc` del web verde.
- [x] `estadosMexico`/`buscarEstados` se **quedan hardcodeados** (son los 32 estados fijos de México; no necesitan BD).
- [ ] Verificar E2E (visual): alta de ciudad en el Panel → aparece en el selector de la app.

---

## Fase 3 — Cerrar ✅ (18 jun 2026)
- [x] Doc canónico [`Ciudades.md`](Ciudades.md) (2 capas).
- [x] Índices: tablero de módulos ✅ · memoria-puntero (`project_panel_ciudades` + estado + migración) ✅. _(Panel_Admin.md §8 y ROADMAP/kit claude.ai: actualización menor pendiente.)_
- [x] Commit a `main` — `82e1474` (módulo) + `fe63660` (fase contract).

---

## Fase CONTRACT — retirar `negocio_sucursales.ciudad` ✅ (código, 18 jun)
- [x] **Lecturas** (13 servicios) leen `ciudades.nombre` vía `LEFT JOIN ciudades ON ciudad_id` (alias `ciudad` conservado → frontend intacto); placeholder `'Por configurar'` retirado (sin ciudad = `ciudad_id IS NULL`).
- [x] **Escrituras** (negocioManagement, pago, onboarding) ya no persisten el texto (solo `ciudad_id`). `usuarios.ciudad` se respetó (otra migración).
- [x] Columna `ciudad` retirada del **ORM** (`schema.ts`).
- [x] Verificado: `tsc` + harness `probar-contract-ciudad.ts` (18 funciones de todos los servicios en runtime, TODO VERDE).
- [x] **DROP corrido** `docs/migraciones/2026-06-18-drop-negocio-sucursales-ciudad.sql` en **dev y prod** (19 jun). Columna texto eliminada.

---

## Pendientes que quedan
- [ ] **Verificación visual E2E** — levantar Panel (ver mapa, alta, agrupar) + web (que una ciudad nueva aparezca en el selector).
- [x] **Correr el DROP** de `negocio_sucursales.ciudad` (dev+prod, 19 jun — ver arriba).
- [ ] **Hardcode "Puerto Peñasco" en Vacantes** — queda **solo** en `SlideoverNuevaVacante.tsx:83` (valor por defecto del formulario de nueva vacante); los de `VacanteDetalleInline`/`VacantesEmpty` ya se quitaron. UX/limpieza, no usa la columna.
- [x] **Editar ciudad por fila** (nombre/estado/importancia) — menú "⋯" → Editar → `DialogoEditarCiudad` + `useEditarCiudad`. (Coords: se ajustan desde el mapa; edición de coords por mapa = futuro.)
- [x] _Migraciones hermanas (mismo patrón, 19 jun):_ `servicios_publicaciones.ciudad`, `articulos_marketplace.ciudad` y `preguntas_comunidad.ciudad` → migradas y **DROPeadas en dev+prod**. Cubren Servicios+Vacantes, MarketPlace y Home/"Pregúntale a [ciudad]"/Coyo. Migraciones SQL en `docs/migraciones/2026-06-19-*-ciudad-*.sql`.
- [x] _Migración hermana — `usuarios.ciudad`:_ migrada a `ciudad_id` y **DROPeada en DEV y PROD** (validado 20 jun). Cubre Perfil, expediente del Panel Usuarios y la ciudad del oferente/vendedor/prestador en Servicios/MarketPlace.
- [x] _Logs de búsqueda_ (`marketplace_busquedas_log`, `servicios_busquedas_log`, `ofertas_busquedas_log`) → se **quedan como TEXTO analítico por decisión** (NO migran a FK).

---

## Notas / riesgos
- **Frente B toca el bundler de `apps/web`** y el flujo de ubicación/GPS — más delicado que el Panel. Se hace **después** de cerrar el Frente A con su gate.
- El array `ciudadesPopulares` mapea 1:1 con la tabla (`nombre/estado/lat/lng/alias/importancia`); la tabla es superset (+ `slug/activa/region_id/pais`).
- Existe `listarCiudades` (en `negocios.service.ts`) pero devuelve **solo nombres de texto** para el filtro de la tabla de Negocios — NO es CRUD del catálogo; el módulo usa su propio service.
