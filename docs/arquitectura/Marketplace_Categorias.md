# MarketPlace — Categorías

> **Estado:** En construcción (Sprint iniciado 2026-07-02).
> **Racional de producto:** cada publicación (venta o búsqueda) pertenece a una
> categoría; el feed se filtra por categoría.

---

## 1. Decisiones cerradas

- **Un solo nivel** (categorías, sin subcategorías). Objetos son más planos que giros de negocio.
- **Globales** (no por ciudad). Una "cama" es *Muebles* en cualquier ciudad.
- **Mismas categorías** para ambos modos (Vendo y Busco).
- **Obligatoria** al publicar. Publicaciones existentes → **"Otros"** (backfill en la migración).
- **Gestionables desde el Panel Admin**, con un **toggle Negocios / MarketPlace** dentro del módulo "Categorías" (UI unificada), pero **tabla propia** por debajo (no se tocan las tablas de Negocios, que están en prod).
- **Filtro en el feed:** un **dropdown "Categoría"** que reemplaza el chip **"Cerca de ti"**. El orden (Recientes / Más vistos) se conserva; la categoría filtra por encima.

## 2. Por qué tabla propia (no reusar las de Negocios)

Los giros de negocio usan un modelo rico (2 niveles, N:M vía `asignacion_subcategorias`, disponibilidad por ciudad). MarketPlace necesita algo simple (1 nivel, 1 categoría por artículo, global). Reusar obligaría a meter un `ambito` en tablas core de Negocios y a que todo su código filtre por ámbito — riesgo de regresión sin reuso real de datos (un giro "Restaurante" y una categoría "Muebles" nunca se comparten). Una tabla nueva es **100% aditiva** y a la medida.

## 3. Modelo de datos

### Tabla nueva `categorias_marketplace`
| Columna | Tipo | Notas |
|---|---|---|
| `id` | serial PK | |
| `nombre` | varchar(50) UNIQUE NOT NULL | "Muebles", "Vehículos"… |
| `orden` | smallint NOT NULL DEFAULT 0 | reordenar en el Panel |
| `activa` | boolean NOT NULL DEFAULT true | desactivación lógica (nunca DELETE) |
| `created_at` | timestamptz DEFAULT now() | |

### Columna en `articulos_marketplace`
- `categoria_id` integer NULL `REFERENCES categorias_marketplace(id) ON DELETE SET NULL`.
- Nullable en BD (la obligatoriedad se enforcea en la app al crear). Índice `idx_marketplace_categoria`.

### Semilla (11 categorías)
`Vehículos · Electrónica · Hogar · Muebles · Ropa y calzado · Bebés y niños · Deportes · Herramientas · Mascotas · Casas y Terrenos · Otros` (Otros al final).

### Migración (segura con datos existentes)
1. `CREATE TABLE categorias_marketplace` + seed.
2. `ALTER TABLE articulos_marketplace ADD COLUMN categoria_id` + FK + índice.
3. Backfill: los artículos existentes → categoría "Otros".

SQL en `docs/migraciones/2026-07-02-marketplace-categorias.sql`. **Juan lo aplica en dev + prod.** Coordinar deploy: schema.ts + migración sincronizados.

## 4. Backend

- **Público:** `GET /api/marketplace/categorias` → categorías activas ordenadas. Service + hook.
- **Crear/editar:** `categoriaId` requerido en `crearArticuloSchema` (ambos modos); el service lo persiste. `actualizarArticuloSchema` lo acepta opcional.
- **Feed:** `obtenerFeedInfinito` (y el legacy del KPI) aceptan `categoriaId` → `AND a.categoria_id = $id`.
- **Admin:** `/api/admin/categorias-marketplace` CRUD (listar, crear, editar, activar/desactivar, reordenar). Calcado simplificado de `admin/categorias`.

## 5. Frontend

- **Composer:** selector de categoría **obligatorio** (ambos modos), como un "Detalle" más pero requerido. Placeholder/validación.
- **Feed:** dropdown **"Categoría"** en el header, en el hueco de "Cerca de ti" (que se elimina de `ChipsFiltrosFeed`). Filtra el feed infinito + el KPI.
- **Card/detalle:** mostrar la categoría como chip (opcional, informativo).

## 6. Panel Admin (`apps/admin`)

- Módulo "Categorías": **toggle Negocios / MarketPlace** (`SeccionCategorias` envuelve `SeccionCategoriasNegocios` y `SeccionCategoriasMarketplace`).
  - **Negocios** → la sección actual (árbol 2 niveles + ciudades), sin cambios.
  - **MarketPlace** → lista simple: nombre, activa; crear/editar/activar-desactivar. Endpoints `/api/admin/categorias-marketplace` (solo superadmin, con auditoría). Reordenar por drag: pendiente (el endpoint existe).

### 6.1 Analítica de oferta vs demanda por ciudad

En la vista MarketPlace del Panel, cada categoría muestra el **conteo de publicaciones activas desglosado por modo**: **"N venta"** (oferta) y **"M busca"** (demanda). Un **filtro por ciudad** (`MenuFiltro`, solo ciudades activas) recalcula los conteos para esa plaza — permite ver dónde hay demanda insatisfecha (mucho "busca", poco "venta").

Backend: `listarCatalogo(ciudadId?)` hace `LEFT JOIN articulos_marketplace` con `SUM(CASE modo)` agrupado por categoría; el filtro de ciudad va en el `ON` del join (no pierde categorías con 0). Solo cuenta `estado='activa'`.

## 7. Coyo (Fase 2, posterior)

Cuando se aborde Coyo Fase 2, su catálogo podrá incluir las categorías de MarketPlace (`categoriasCatalogo.service.ts`) para mapear preguntas a categoría + modo. Fuera de este sprint.

## 8. Archivos (índice)

- BD: `db/schemas/schema.ts`, `docs/migraciones/2026-07-02-marketplace-categorias.sql`
- Backend: `validations/marketplace.schema.ts`, `services/marketplace.service.ts`, `services/marketplace/categorias.service.ts` (nuevo), `routes/marketplace.routes.ts`, `controllers/marketplace.controller.ts`, `controllers/admin/` + `services/admin/` + `routes/admin/` (CRUD MP)
- Frontend web: `types/marketplace.ts`, `hooks/queries/useMarketplace.ts`, `hooks/useComposerMarketplace.ts`, `components/marketplace/composer/*`, `ChipsFiltrosFeed.tsx`, `PaginaMarketplace.tsx`
- Panel: `apps/admin/src/components/categorias/*`, hooks/servicio admin
