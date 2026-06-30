# Ciudades — Módulo del Panel Admin

> **Qué es:** el documento canónico del módulo **Ciudades** (catálogo de ciudades y regiones).
> Capa 1 = en lenguaje de persona; Capa 2 = apéndice técnico. Lo que FALTA vive en
> [`Ciudades_Pendientes.md`](Ciudades_Pendientes.md).
>
> **Estado:** ✅ construido (código + verificado con harness). La migración ciudad→catálogo quedó
> **cerrada** (todas las secciones consumen el catálogo; columnas texto DROPeadas en dev+prod, salvo el
> DROP de `usuarios.ciudad` en prod — ver Pendientes). Falta verificación visual E2E.
> **Última actualización:** 19 Junio 2026.

---

## Capa 1 — Qué es y cómo funciona

### Para qué sirve
Le permite al **SuperAdmin** administrar el **catálogo de ciudades** de la app y **armar regiones**,
todo **sin tocar código ni hacer deploy**. Lo central: **dar de alta una ciudad nueva** (ej. Hermosillo)
y que quede **habilitada en la app** — aparece en el selector de ubicación del header, el onboarding, al
crear sucursales, etc.

### Quién lo usa
**Solo SuperAdmin.** Gerente y vendedor no ven este módulo (es estructura de plataforma).

### Qué ve y hace
El módulo tiene **tres pestañas**:

1. **Mapa** (lo principal) — un mapa interactivo de México con **4,563 ciudades** (dataset de INEGI):
   - **Azul** = ya está en el catálogo · **Gris** = aún no está (por agregar) · **Ámbar** = seleccionada.
   - Al hacer **zoom** aparecen los nombres. Se hace **clic** para seleccionar varias:
     - Grises seleccionadas → **"Agregar N nuevas"** (las da de alta; opcionalmente ya en una región).
     - Azules seleccionadas → **"Agrupar M en región"** (las asigna a una región existente).
2. **Ciudades** — lista con buscador, filtro por región (incl. "Sin región") y chips Activas/Inactivas.
   Por fila: activar/desactivar, asignar/cambiar región.
3. **Regiones** — lista con su # de ciudades; botón **"Crear región"** y, por fila, editar (renombrar,
   activar/desactivar).

### Cómo se conecta con la app
Cuando agregas/activas una ciudad en el Panel → queda en la tabla `ciudades` → el endpoint público
`GET /api/ciudades` la sirve → la app la muestra en el selector de ubicación **sin redeploy**. Si el
endpoint falla, la app cae a una lista semilla (nunca se queda sin selector).

### Tabla de permisos
| Acción | SuperAdmin | Gerente | Vendedor |
|---|---|---|---|
| Todo el módulo (ver, crear/editar ciudad y región, agrupar) | ✅ | — | — |

### Reglas y FAQ
- **¿Por qué pide coordenadas?** AnunciaYA ordena por cercanía real; las coords (que salen del clic en el
  mapa) alimentan el "ciudad más cercana" por GPS.
- **¿Duplicados?** Cada ciudad tiene un **slug único** (nombre normalizado: "Peñasco" = "Penasco"); el alta
  rechaza duplicados.
- **¿Por qué no se puede mover una ciudad de región a veces?** Si un **vendedor** cubre esa ciudad y otras
  de su región, moverla lo dejaría cubriendo dos regiones (no permitido). El sistema lo bloquea con un aviso.
- **Eliminar regiones:** no se eliminan, solo se **desactivan** (borrar dejaría ciudades y gerentes sin región).

---

## Capa 2 — Apéndice técnico

### Modelo de datos (sin migración nueva; ya existía)
- `ciudades` (id, nombre, estado, pais, **slug** único, lat, lng, alias jsonb, importancia, **activa**,
  **region_id**→regiones SET NULL). Agregada al ORM Drizzle en este módulo.
- `regiones` (id, nombre único, activa, created_at).
- `embajador_ciudades` (PK embajador+ciudad) + trigger "una región" (cobertura del vendedor).

### Backend (`apps/api`)
| Archivo | Rol |
|---|---|
| `services/admin/ciudades.service.ts` | Lecturas: `listarCiudadesCatalogo(filtros)` (región resuelta) · `listarRegionesConConteo()` |
| `services/admin/ciudades-acciones.service.ts` | Acciones: crear/editar/activar ciudad · `crearCiudadesMultiple` · asignar región (con **guard "una región"** de vendedores) · `asignarRegionMultiple` · crear/editar región. Auditoría en cada una |
| `controllers/admin/ciudades.controller.ts` · `routes/admin/ciudades.routes.ts` | Endpoints (montados tras el gate global de superadmin) |
| `validations/admin/ciudades.schema.ts` | Zod de los bodies |
| `services/ciudadesPublica.service.ts` · `controllers/…` · `routes/ciudadesPublica.routes.ts` | **Endpoint público** `GET /api/ciudades` (ciudades activas para el selector) |
| `utils/ciudades.ts` | `resolverCiudadId(texto)` / `slugCiudad` (resuelve texto → ciudad_id por slug) |

**Endpoints admin** (solo super): `GET /admin/ciudades` · `GET /admin/ciudades/regiones` · `POST /admin/ciudades` · `POST /admin/ciudades/multiple` · `POST /admin/ciudades/asignar-region` · `POST /admin/ciudades/regiones` · `PATCH /admin/ciudades/regiones/:id` · `PATCH /admin/ciudades/:id` · `PATCH /admin/ciudades/:id/activa` · `PATCH /admin/ciudades/:id/region`.

### Frontend del Panel (`apps/admin`)
| Archivo | Rol |
|---|---|
| `services/ciudadesService.ts` · `hooks/queries/useCiudadesAdmin.ts` | React Query (lista + regiones + mutaciones) |
| `components/ciudades/SeccionCiudades.tsx` | Las 3 pestañas (Mapa/Ciudades/Regiones) + barra de selección |
| `components/ciudades/MapaCiudades.tsx` | Mapa MapLibre (tiles OpenFreeMap, capa de puntos, colores, selección). **Lazy-load** |
| `components/ciudades/DialogoMapaAccion.tsx` · `DialogoRegion.tsx` · `DialogoAsignarRegion.tsx` · `MenuAcciones.tsx` | Diálogos y menú de acciones |
| `public/ciudades-mexico.json` (+ `scripts/generar-ciudades-mx.mjs`) | Dataset de 4,563 ciudades urbanas de INEGI (clave, nombre, estado, municipio, lat, lng) |
| `utils/texto.ts` | `slugCiudad`/`claveCruceCiudad` (cruce dataset↔catálogo) |

### Frontend público (`apps/web`) — "catálogo hidratable"
`data/ciudadesPopulares.ts` mantiene el array como **semilla/fallback** + un **catálogo activo** que se
**hidrata desde la BD** (`hooks/queries/useCiudades.ts` → `GET /api/ciudades`, montado en `RootLayout`).
Las funciones de búsqueda (`buscarCiudades`/`buscarCiudadCercana`/`getCiudadesPopulares`) y `useGpsStore`
leen ese catálogo activo. Así una ciudad nueva del Panel aparece en el selector sin redeploy; si la API
falla, queda la semilla.

### Decisiones de diseño
- **Mapas unificados en MapLibre** (decisión 18 jun): el Panel nace en MapLibre + OpenFreeMap (sin API key);
  `apps/web` quedó migrado de Leaflet a MapLibre (react-map-gl) el **30 jun** — ver `Migracion_MapLibre.md`. ✅
- **Dataset empaquetado** (INEGI, uso libre con atribución) en vez de un servicio de geocoding.
- **Orden del catálogo del Panel:** por estado y, dentro de cada estado, por nombre.

### Fase "contract" (migración ciudad→catálogo CERRADA)
Como parte de habilitar el catálogo se retiró la dependencia de las columnas texto `ciudad` en todas las
secciones (patrón expand-migrate-contract, cerrado el 19 jun): las lecturas resuelven `ciudades.nombre` vía
`LEFT JOIN ciudades c ON c.id = <tabla>.ciudad_id` (alias `ciudad` conservado → frontend intacto), las
escrituras solo persisten `ciudad_id` (vía `resolverCiudadId(texto)` de `utils/ciudades.ts`), y las columnas
texto salieron del ORM. Estado por tabla:

| Tabla | Cubre | Estado columna texto |
|---|---|---|
| `negocio_sucursales.ciudad` | Negocios, Ofertas, CardYA, ChatYA, Business Studio, casi todo el Panel Admin | ✅ migrada + DROP (dev+prod) — `docs/migraciones/2026-06-18-drop-negocio-sucursales-ciudad.sql` |
| `servicios_publicaciones.ciudad` | Servicios + Vacantes de Business Studio | ✅ migrada + DROP (dev+prod) |
| `articulos_marketplace.ciudad` | MarketPlace (feed, detalle, compartible, Mis Guardados, perfil vendedor) | ✅ migrada + DROP (dev+prod) |
| `preguntas_comunidad.ciudad` | Home / "Pregúntale a [ciudad]" / Coyo | ✅ migrada + DROP (dev+prod) |
| `usuarios.ciudad` | Perfil, expediente del Panel Usuarios, ciudad del oferente/vendedor/prestador | ✅ migrada + DROP (dev+prod), validado 20 jun |

Los logs de búsqueda (`marketplace_busquedas_log`, `servicios_busquedas_log`, `ofertas_busquedas_log`) se
quedan como **texto analítico por decisión** (NO se migran a FK). Migraciones SQL one-shot:
`docs/migraciones/2026-06-19-*-ciudad-*.sql` (servicios, marketplace, preguntas-comunidad, usuarios) +
las de 2026-06-06/16/18.

### Verificación
- Harness: `probar-ciudades-lectura.ts`, `probar-ciudades-acciones.ts` (guard "una región" incluido),
  `probar-contract-ciudad.ts` (18 funciones de todos los servicios en runtime) — **todos verdes**.
- `tsc`/`build` de `apps/api` y `apps/admin` en verde.
