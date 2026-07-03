# MarketPlace — Doble sentido (Vendo ↔ Busco)

> **Estado:** En construcción (Sprint iniciado 2026-07-02).
> **Patrón base:** calcado de Servicios `modo='ofrezco'|'solicito'` (ver `Business_Studio.md`, `servicios_publicaciones`).
> **Racional de producto:** `docs/VISION_ESTRATEGICA_AnunciaYA.md` §3.1.

---

## 1. Qué es

MarketPlace deja de ser solo compra-venta y pasa a cubrir **las dos caras del intercambio de objetos**, igual que Servicios cubre Ofrezco/Solicito:

- **Vendo** (`modo='vendo'`) — quien tiene un objeto para vender. Comportamiento histórico: precio obligatorio, ≥1 foto, condición/ofertas/unidad opcionales.
- **Busco** (`modo='busco'`) — quien necesita comprar/conseguir un objeto. Presupuesto opcional, fotos opcionales, sin condición. Habilita que un vendedor descubra demanda real y que **Coyo** conecte oferta con demanda.

La regla objetos-vs-servicios se mantiene: **objetos → MarketPlace**, **servicios → Servicios**.

---

## 2. Modelo de datos

Una sola tabla `articulos_marketplace` con columna discriminadora `modo` (mismo enfoque que `servicios_publicaciones.modo`).

### Columnas nuevas / modificadas

| Columna | Cambio | Notas |
|---|---|---|
| `modo` | **NUEVA** `varchar(20) NOT NULL DEFAULT 'vendo'` | `'vendo' \| 'busco'` |
| `precio` | **`NOT NULL` → nullable** | requerido solo en `vendo` (CHECK) |
| `presupuesto` | **NUEVA** `jsonb NULL` | solo `busco`: `{ min: number, max: number }` opcional. Calca `servicios_publicaciones.presupuesto` |
| `urgente` | **NUEVA** `boolean NOT NULL DEFAULT false` | pin al top del feed de Busco (calca Solicito) |

Sin cambios: `titulo`, `descripcion` (siguen obligatorios), ubicación con privacidad 500m, TTL 30 días, métricas, estado, `fotos` (la columna sigue; lo que cambia es el mínimo por modo, validado en Zod + CHECK).

`zona_aproximada` pasó a **opcional en ambos modos** (Vendo y Busco) — decisión de producto 2026-07-02. La columna sigue `NOT NULL` en BD; el service persiste `''` cuando no se envía (sin migración). Los 4 "Detalles" del composer (Condición, Ofertas, Unidad, Zona) quedan todos opcionales.

### CHECK constraints (nuevos)

```
modo IN ('vendo','busco')
precio: (modo='busco') OR (modo='vendo' AND precio IS NOT NULL)
fotos:  (modo='busco') OR (modo='vendo' AND jsonb_array_length(fotos) >= 1)
presupuesto: presupuesto IS NULL OR modo='busco'
```

Los CHECK de `condicion`/`estado` existentes se conservan. En `busco`, `condicion`/`acepta_ofertas`/`unidad_venta` se guardan NULL (garantizado en el service, no por CHECK para no endurecer de más).

### Migración (segura con datos existentes)

- `modo` default `'vendo'` → todas las filas actuales quedan como venta.
- `precio DROP NOT NULL` → no afecta filas existentes.
- Nuevos CHECK se cumplen para todo el histórico (todo es vendo con precio y ≥1 foto).

SQL en `docs/migraciones/2026-07-02-marketplace-busco.sql`. **Juan lo aplica en las 2 Supabase (dev + prod).** El `schema.ts` de Drizzle y la migración deben desplegarse sincronizados (si Render arranca con un `schema.ts` que espera columnas que la BD no tiene, truena).

---

## 3. Validación (Zod) — `validations/marketplace.schema.ts`

`crearArticuloSchema` se ramifica por `modo` con `superRefine` (calca `crearPublicacionSchema` de Servicios):

- `modo` — enum `['vendo','busco']`, default `'vendo'`.
- `vendo`: `precio` requerido, `fotos` min 1, `condicion`/`aceptaOfertas`/`unidadVenta` permitidos, `presupuesto`/`urgente` prohibidos.
- `busco`: `precio` prohibido, `fotos` min 0, `presupuesto {min,max}` opcional (refine `max>=min`), `urgente` permitido, `condicion`/`aceptaOfertas`/`unidadVenta` prohibidos.
- `confirmaciones`: en `busco` usa el checklist propio (ver §6). El backend arma el snapshot con `version`.

`actualizarArticuloSchema`: `modo` **no** es editable (igual que en Servicios no se cambia modo/tipo al editar).

---

## 4. Composer — `components/marketplace/composer/`

- **Toggle "Vendo | Busco"** en el header (patrón `TogglePill` de Servicios). Oculto en edición.
- Renderizado condicional por modo:

| Elemento | Vendo | Busco |
|---|---|---|
| Título header | "Vender un artículo" | "Buscar un artículo" |
| Precio | visible, obligatorio | oculto |
| Presupuesto (rango opcional) | oculto | visible |
| Detalles: Condición / Ofertas / Unidad | visibles | ocultos |
| Detalle: Urgente | oculto | visible (toggle) |
| Zona | opcional | opcional ("dónde buscas") |
| Fotos | obligatorias (min 1) | opcionales |
| Placeholder título | "Ej: Bicicleta rodada 26" | "Ej: Busco cama matrimonial en buen estado" |
| Checklist legal | 4 checks de venta | 3 checks de búsqueda (§6) |

Draft (`useComposerMarketplace`) gana `modo`, `budgetMin`, `budgetMax`, `urgente`. Payload builder condiciona precio/presupuesto/urgente/confirmaciones por modo (calca `composerServiciosPayload.ts`).

---

## 5. Feed y visualización

- Header de MarketPlace gana un **toggle "Vendo | Busco"** (feed por defecto = **Vendo**), análogo a la pestaña "Solicitudes" de Servicios.
- Feed backend filtra por `modo`. El feed público de ventas **excluye** `busco` y viceversa.
- Orden en Busco: `urgente DESC, created_at DESC` (urgentes primero), como Solicito.
- Tarjeta de demanda: rótulo **"Se busca"**, muestra presupuesto (`$min–$max` o "A tratar") en vez de precio; badge urgente cuando aplica.

---

## 6. Moderación (reconciliada)

Hoy la moderación de MP detecta "busco/necesito" y sugiere irse al Home. Con el modo Busco:

- En modo **Busco** → el aviso de "esto parece una búsqueda" se **desactiva** (es justo lo que el usuario quiere).
- En modo **Vendo** → si detecta lenguaje de búsqueda, en vez de mandar al Home sugiere **"¿Querías buscar? Cambia a Busco"**.
- La detección de "esto es un servicio" se conserva en ambos modos (redirige a Servicios).
- Las listas de palabras prohibidas (rifa, subasta, esquema, adultos, ilegal) aplican igual a ambos modos.

Checklist legal de **Busco** (3 checks, snapshot en `confirmaciones`):
1. "Mi búsqueda es lícita (no pido nada ilegal ni robado)."
2. "Es una búsqueda real."
3. "Coordinaré la compra en un lugar seguro."

---

## 7. Coyo (fase siguiente, fuera de este sprint)

Una vez exista la demanda en MP, Coyo (`services/coyo/buscadorUnificado.ts`) podrá:
- Vendedor pregunta "¿quién compra/ocupa/necesita una cama?" → mostrar publicaciones `modo='busco'`.
- Comprador pregunta "¿dónde vendo/consigo una cama?" → mostrar `modo='vendo'` (como hoy).

Requiere: filtrar `buscarArticulos` por `modo` en el buscador unificado + un eje de intención en `interpretarPregunta`. Se aborda cuando este sprint cierre.

---

## 8. Archivos tocados (índice)

- BD: `db/schemas/schema.ts` (tabla `articulos_marketplace`), `docs/migraciones/2026-07-02-marketplace-busco.sql`
- Backend: `validations/marketplace.schema.ts`, `services/marketplace.service.ts`, `services/marketplace/buscador.ts`, `services/marketplace/filtros.ts`, `routes/marketplace.routes.ts`, `controllers/marketplace.controller.ts`
- Frontend: `types/marketplace.ts`, `hooks/useComposerMarketplace.ts`, `hooks/queries/useMarketplace.ts`, `components/marketplace/composer/*`, página y cards de MarketPlace, `utils/composerMarketplacePayload.ts` (o equivalente)
- Registry R2: sin cambios (las fotos siguen en `articulos_marketplace.fotos`).
