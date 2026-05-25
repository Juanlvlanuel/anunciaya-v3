# Patrón Buscador FTS Híbrido — AnunciaYA

> Estándar técnico para construir un endpoint de búsqueda completa en el backend.
> **Molde de referencia:** el buscador de MarketPlace
> (`GET /api/marketplace/buscar`), el más sofisticado del proyecto.
>
> Usar este documento como receta replicable al darle búsqueda completa a otras
> secciones (Servicios, Ofertas, etc.) que hoy solo tienen "sugerencias top 5".

---

## Resumen ejecutivo

El buscador combina:

- **Full-Text Search español** (`to_tsvector('spanish', ...) @@ plainto_tsquery(...)`)
  con stemming ("bicicletas" → "bicicleta").
- **ILIKE substring** para prefix matching mientras el usuario escribe ("bici"
  ya debe encontrar "Bicicleta").
- **`unaccent`** en ambos lados para ignorar acentos ("panaderia" matchea
  "Panadería").
- **PostGIS** (`ST_DWithin`, `<->`, `ST_Distance`) para filtrar y ordenar por
  cercanía.
- **Índices GIN + GIST** para que escale.
- **Paginación offset-based** y **ordenamiento multicriterio** (relevancia,
  fecha, distancia, precio).
- **Log fire-and-forget** de búsquedas para alimentar "populares".

---

## 1) Capa Ruta

**Archivo:** `apps/api/src/routes/marketplace.routes.ts:134`

```typescript
router.get('/buscar', getBuscarArticulos);   // GET /api/marketplace/buscar
```

**Middlewares:** **ninguno** — endpoint público (sin `verificarToken`).

**Query params** (validados con Zod en `apps/api/src/validations/marketplace.schema.ts:320`):

| Param | Tipo | Obligatorio | Default |
|---|---|---|---|
| `q` | string ≤100 | No | — |
| **`ciudad`** | string 2-100 | **Sí** | — |
| `lat` / `lng` | number | No | — |
| `precioMin` / `precioMax` | int 0-999999 | No | — |
| `condicion` | CSV `nuevo,seminuevo,usado,para_reparar` | No | — |
| `distanciaMaxKm` | 0-500 (requiere lat+lng) | No | — |
| `ordenar` | `recientes` \| `cercanos` \| `precio_asc` \| `precio_desc` | No | `recientes` |
| `limit` | 1-100 | No | 20 |
| `offset` | ≥0 | No | 0 |

---

## 2) Capa Controller

**Archivo:** `apps/api/src/controllers/marketplace.controller.ts:605-631`

```typescript
export async function getBuscarArticulos(req: Request, res: Response) {
  try {
    const validacion = buscarQuerySchema.safeParse(req.query);
    if (!validacion.success) {
      return res.status(400).json({
        success: false,
        message: 'Query inválida',
        errores: formatearErroresZod(validacion.error),
      });
    }
    const resultado = await buscarArticulos(validacion.data);
    return res.json(resultado);
  } catch (error) {
    console.error('Error en getBuscarArticulos:', error);
    return res.status(500).json({ success: false, message: 'Error al ejecutar la búsqueda' });
  }
}
```

El controller **no transforma**, solo valida con Zod y pasa al service. Devuelve
tal cual:

```json
{
  "success": true,
  "data": [...],
  "paginacion": { "total": 247, "limit": 20, "offset": 0 },
  "query": "bicicleta"
}
```

---

## 3) Capa Service — el corazón

**Archivo:** `apps/api/src/services/marketplace/buscador.ts:287-463`
(función `buscarArticulos`).

### Paso 1 — Normalización

```typescript
const limit = Math.min(Math.max(filtros.limit ?? 20, 1), 100);
const offset = Math.max(filtros.offset ?? 0, 0);
const queryNorm = (filtros.q ?? '').trim();
const ordenar = filtros.ordenar ?? 'recientes';
```

### Paso 2 — WHERE dinámico (acumulador de `sql\`...\``)

```typescript
const conds: ReturnType<typeof sql>[] = [
  sql`a.estado = 'activa'`,
  sql`a.deleted_at IS NULL`,
  sql`a.ciudad = ${filtros.ciudad}`,
];
```

### Paso 3 — Búsqueda híbrida (el corazón del corazón)

```typescript
if (queryNorm.length >= 2) {
  const patronLike = `%${queryNorm}%`;
  conds.push(sql`(
    to_tsvector('spanish', unaccent(a.titulo || ' ' || a.descripcion))
      @@ plainto_tsquery('spanish', unaccent(${queryNorm}))
    OR unaccent(a.titulo) ILIKE unaccent(${patronLike})
    OR unaccent(a.descripcion) ILIKE unaccent(${patronLike})
  )`);
}
```

**Por qué los dos**:

- **FTS español** (`to_tsvector` + `plainto_tsquery`) → encuentra palabras
  completas con stemming ("bicicletas" → "bicicleta").
- **ILIKE con unaccent** → mientras el usuario escribe ("bici" debe ya encontrar
  "Bicicleta"), porque FTS solo matchea palabras completas.
- **`unaccent` en ambos lados** → "panaderia" matchea "Panadería".

### Paso 4 — Filtros extras (todos opcionales, mismo patrón)

```typescript
if (filtros.precioMin !== undefined) conds.push(sql`a.precio >= ${filtros.precioMin}`);
if (filtros.precioMax !== undefined) conds.push(sql`a.precio <= ${filtros.precioMax}`);

if (filtros.condicion && filtros.condicion.length > 0) {
  const condArray = sql.join(filtros.condicion.map(c => sql`${c}`), sql`, `);
  conds.push(sql`a.condicion IN (${condArray})`);
}

if (filtros.distanciaMaxKm !== undefined && filtros.lat !== undefined && filtros.lng !== undefined) {
  const radioMetros = filtros.distanciaMaxKm * 1000;
  conds.push(sql`
    ST_DWithin(
      a.ubicacion_aproximada,
      ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography,
      ${radioMetros}
    )
  `);
}

const where = sql.join(conds, sql` AND `);
```

### Paso 5 — ORDER BY (switch sobre `ordenar`)

```typescript
let orderBy: ReturnType<typeof sql>;
if (ordenar === 'cercanos' && filtros.lat && filtros.lng) {
  orderBy = sql`ORDER BY a.ubicacion_aproximada <-> ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography`;
} else if (ordenar === 'precio_asc')  orderBy = sql`ORDER BY a.precio ASC`;
else if (ordenar === 'precio_desc')   orderBy = sql`ORDER BY a.precio DESC`;
else                                  orderBy = sql`ORDER BY a.created_at DESC`;  // recientes (default)
```

`<->` es el operador PostGIS de **distancia ascendente** (más cercanos primero).

### Paso 6 — SELECT + paginación

```typescript
const distanciaSelect = (filtros.lat && filtros.lng)
  ? sql`ST_Distance(a.ubicacion_aproximada, ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography) AS distancia_metros`
  : sql`NULL::float AS distancia_metros`;

const datosResultado = await db.execute(sql`
  SELECT a.id, a.usuario_id, a.titulo, a.descripcion, a.precio, a.condicion, a.acepta_ofertas,
         a.fotos, a.foto_portada_index,
         ST_Y(a.ubicacion_aproximada::geometry) AS lat,
         ST_X(a.ubicacion_aproximada::geometry) AS lng,
         a.ciudad, a.zona_aproximada, a.estado,
         a.total_vistas, a.total_mensajes, a.total_guardados,
         a.expira_at, a.created_at, a.updated_at, a.vendida_at,
         ${distanciaSelect}
  FROM articulos_marketplace a
  WHERE ${where}
  ${orderBy}
  LIMIT ${limit} OFFSET ${offset}
`);
```

### Paso 7 — COUNT separado (para `total`)

```typescript
const totalResultado = await db.execute(sql`
  SELECT COUNT(*)::int AS total FROM articulos_marketplace a WHERE ${where}
`);
const total = (totalResultado.rows[0] as { total: number }).total;
```

### Paso 8 — Mapeo snake→camel + redondeo de distancia

```typescript
const data = (datosResultado.rows as unknown as RawFila[]).map(row => ({
  id: row.id,
  usuarioId: row.usuario_id,
  titulo: row.titulo,
  // ... resto
  distanciaMetros: row.distancia_metros !== null ? Math.round(row.distancia_metros) : null,
}));
```

### Paso 9 — Log fire-and-forget (no bloquea respuesta)

```typescript
if (queryNorm.length >= 2) {
  const sanitizado = sanitizarTerminoParaLog(queryNorm);
  if (sanitizado) {
    db.execute(sql`
      INSERT INTO marketplace_busquedas_log (ciudad, termino, usuario_id)
      VALUES (${filtros.ciudad}, ${sanitizado}, NULL)
    `).catch(err => console.warn('No se pudo loguear búsqueda:', err));
  }
}
return { success: true, data, paginacion: { total, limit, offset }, query: queryNorm };
```

**Importante:** `usuario_id` siempre se inserta `NULL` por privacidad, aunque la
sesión esté logueada.

---

## 4) Capa Tipos

Viven todos en el mismo archivo del service
(`apps/api/src/services/marketplace/buscador.ts:38-69`):

```typescript
export type OrdenarBusqueda = 'recientes' | 'cercanos' | 'precio_asc' | 'precio_desc';

export interface FiltrosBusqueda {
  q?: string;
  ciudad: string;
  lat?: number;
  lng?: number;
  precioMin?: number;
  precioMax?: number;
  condicion?: Array<'nuevo' | 'seminuevo' | 'usado' | 'para_reparar'>;
  distanciaMaxKm?: number;
  ordenar?: OrdenarBusqueda;
  limit?: number;
  offset?: number;
}

export interface ResultadoBusqueda {
  success: true;
  data: unknown[];
  paginacion: { total: number; limit: number; offset: number };
  query: string;
}
```

---

## 5) Capa Índices de BD

**Lo crítico vive en SQL one-shot, no en Drizzle.** Hay 3 índices clave:

```sql
-- FTS principal (el que hace la búsqueda volar)
CREATE INDEX idx_marketplace_titulo_fts
  ON articulos_marketplace
  USING GIN (to_tsvector('spanish', titulo || ' ' || descripcion));

-- Geoespacial (para ST_DWithin y <->)
CREATE INDEX idx_marketplace_ubicacion
  ON articulos_marketplace
  USING GIST (ubicacion_aproximada);

-- Auxiliares
CREATE INDEX idx_marketplace_ciudad   ON articulos_marketplace(ciudad);
CREATE INDEX idx_marketplace_estado   ON articulos_marketplace(estado);
CREATE INDEX idx_marketplace_created  ON articulos_marketplace(created_at DESC);
```

Y la tabla de log:

```sql
CREATE TABLE marketplace_busquedas_log (
  id BIGSERIAL PRIMARY KEY,
  ciudad VARCHAR(100) NOT NULL,
  termino VARCHAR(100) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_busquedas_ciudad_fecha
  ON marketplace_busquedas_log (ciudad, created_at DESC);
```

**Trampa importante a evitar:** Si creas el índice como
`GIN(to_tsvector('spanish', titulo || ...))` (sin `unaccent`) pero la query usa
`to_tsvector('spanish', unaccent(...))`, **el planner cae a sequential scan**
porque la expresión no coincide. Tienes dos opciones:

```sql
-- Opción A (recomendada): índice con wrapper IMMUTABLE de `unaccent`.
--
-- IMPORTANTE — el wrapper es OBLIGATORIO en Supabase (y recomendado en local).
-- Postgres exige funciones IMMUTABLE en expresiones de índice. `unaccent`
-- viene como STABLE. Las opciones intuitivas fallan en Supabase:
--   - `ALTER FUNCTION unaccent IMMUTABLE` → ERROR 42501 (must be owner)
--   - Wrapper con `SELECT unaccent($1)` sin schema → ERROR 42883 durante
--     el INLINING al crear el índice (function unaccent does not exist)
-- Ver trampa #7 abajo para detalle de las dos sub-trampas.
--
-- La receta PORTABLE usa un bloque DO que detecta dinámicamente el schema
-- donde vive `unaccent` (`extensions` en Supabase, `public` en local típico)
-- y crea la wrapper calificando con ese schema.

-- 1) Wrapper IMMUTABLE en `public` con schema dinámico (idempotente).
DO $do$
DECLARE
    unaccent_schema text;
BEGIN
    SELECT n.nspname INTO unaccent_schema
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'unaccent'
    LIMIT 1;

    IF unaccent_schema IS NULL THEN
        RAISE EXCEPTION 'La extensión unaccent no está instalada';
    END IF;

    EXECUTE format($fn$
        CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) RETURNS text AS $body$
            SELECT %I.unaccent($1)
        $body$ LANGUAGE sql IMMUTABLE PARALLEL SAFE
    $fn$, unaccent_schema);
END
$do$;

-- 2) Crear el índice GIN usando la wrapper. (Drop+Create si vienes de una
--    versión vieja con `unaccent(...)` directo).
DROP INDEX IF EXISTS idx_X_titulo_fts_unaccent;
CREATE INDEX idx_X_titulo_fts_unaccent
  ON tabla USING GIN (to_tsvector('spanish', public.immutable_unaccent(titulo || ' ' || descripcion)));

-- 3) Las queries del service también usan la wrapper para que coincidan
--    con la expresión del índice y el planner lo use:
--    WHERE to_tsvector('spanish', immutable_unaccent(titulo || ' ' || descripcion))
--          @@ plainto_tsquery('spanish', immutable_unaccent(${q}))
```

```sql
-- Opción B: columna generada + índice sobre ella (más limpio y más rápido).
-- Aplica la misma regla: usa la wrapper en la expresión generada. La wrapper
-- se crea con el mismo bloque DO de la Opción A (omitido aquí por brevedad).
ALTER TABLE tabla ADD COLUMN tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', public.immutable_unaccent(coalesce(titulo, '') || ' ' || coalesce(descripcion, '')))) STORED;
CREATE INDEX idx_X_tsv ON tabla USING GIN (tsv);
-- Luego en la query: WHERE a.tsv @@ plainto_tsquery('spanish', immutable_unaccent(${q}))
```

Recomiendo la **Opción A** para Servicios/Ofertas — más simple, calca el patrón
del marketplace.

**Extensiones requeridas:**

- `unaccent` — instalada vía `docs/migraciones/2026-05-14-extension-unaccent.sql`.
- `postgis` — ya instalada para MarketPlace.

---

## Receta replicable

Para darle búsqueda completa a **Servicios** (o **Ofertas**), los pasos
concretos:

### Paso 1 — Migración SQL

Crear `docs/migraciones/YYYY-MM-DD-<seccion>-buscador.sql`:

```sql
BEGIN;

-- Índice FTS con unaccent integrada (evita la trampa del sequential scan)
CREATE INDEX IF NOT EXISTS idx_<tabla>_fts_unaccent
  ON <tabla>
  USING GIN (to_tsvector('spanish', unaccent(<col1> || ' ' || <col2>)))
  WHERE deleted_at IS NULL;  -- parcial: ignora soft-deletes

-- Tabla de log (estructura idéntica al marketplace)
CREATE TABLE IF NOT EXISTS <seccion>_busquedas_log (
  id BIGSERIAL PRIMARY KEY,
  ciudad VARCHAR(100) NOT NULL,
  termino VARCHAR(100) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_<seccion>_busq_ciudad_fecha
  ON <seccion>_busquedas_log (ciudad, created_at DESC);

COMMIT;
```

Y aplicarla local + Supabase (como se hizo con `preguntas_comunidad`).

**Nota:** Para Servicios, ya existe `servicios_busquedas_log` (ver
`idx_servicios_busq_ciudad_fecha` en el schema). Solo agregar el índice FTS.
Para Ofertas hay que crear ambos.

### Paso 2 — Service

Crear `apps/api/src/services/<seccion>/buscador.ts` calcando los 9 pasos de
arriba. **Cambiar solo:**

- Nombre de tabla y alias.
- Lista de columnas en el `SELECT`.
- Filtros específicos del dominio:
  - **Servicios:** `modo` (`ofrezco`/`solicito`), `tipo`
    (`servicio-persona`/`vacante-empresa`/`solicito`), `modalidad`,
    `tipoEmpleo`, búsqueda en arrays `skills`/`requisitos` con `unnest()`.
  - **Ofertas:** filtrar `fechaFin > NOW()` (activas), `tipo`
    (porcentaje/2x1/etc.), búsqueda incluyendo nombre del negocio (necesita
    `LEFT JOIN negocios n`).
- Estados válidos del CHECK (cada tabla tiene los suyos).

### Paso 3 — Controller

Agregar `getBuscar<Seccion>` en el controller existente. **Calcar literalmente**
el patrón `safeParse → service → res.json`.

### Paso 4 — Ruta

Una línea en `apps/api/src/routes/<seccion>.routes.ts`:

```typescript
router.get('/buscar', getBuscar<Seccion>);
```

**Decisión a tomar:** ¿dejarlo público (sin `verificarToken`) como marketplace,
o requiere login como las sugerencias actuales? Si es para Coyo del Home (ruta
privada), igual va con `verificarToken`. Recomendación: público, igual que
marketplace, para que mañana el feed externo lo use también.

### Paso 5 — Schema Zod

Agregar `buscarQuerySchema` en `apps/api/src/validations/<seccion>.schema.ts`.
Calcar la estructura, **ajustar filtros específicos del dominio**.

---

## Resumen visual de qué se calca vs qué se adapta

| Pieza | Calcar tal cual | Adaptar |
|---|---|---|
| **Estructura del service** (9 pasos) | Sí, 100% | Nombres de tabla/columnas |
| **WHERE acumulado con `conds: sql[]`** | Sí | Filtros del dominio |
| **Bloque FTS + ILIKE + unaccent** | Sí, exacto | Solo cambia `a.titulo || ' ' || a.descripcion` por las columnas que correspondan |
| **ORDER BY switch** | Sí | Si la sección no tiene precio, quitar `precio_asc/desc` |
| **Geolocalización** (`ST_DWithin`, `<->`, `ST_Distance`) | Sí si la sección tiene `ubicacion` | Si no, omitir |
| **COUNT separado** | Sí, exacto | — |
| **Mapeo snake→camel** | Mismo patrón | Las columnas |
| **Log fire-and-forget con sanitización** | Sí, exacto | Solo cambia el nombre de la tabla de log |
| **Helper `sanitizarTerminoParaLog`** | Reusar el que ya existe en marketplace o duplicarlo | — |
| **Controller** | Sí, exacto | Nombre de función + service llamado |
| **Schema Zod** | Sí, esqueleto | Enum de `ordenar`, filtros del dominio |
| **Ruta** | Sí, una línea | Path |
| **Migración SQL** | Patrón idéntico | Tabla + columnas del índice |

---

## Trampas a evitar (las que aprendió MarketPlace en producción)

1. **Índice GIN sin `unaccent`** → sequential scan invisible. Crear el índice
   ya con `unaccent` en la expresión. **Prerequisito:** ver trampa #7
   (`unaccent` debe ser IMMUTABLE).
2. **Olvidar `usuario_id = NULL`** en el log de búsquedas → bug de privacidad.
3. **`limit` sin cap** → DoS. Siempre `Math.min(limit, 100)`.
4. **Bloquear con el log** → la búsqueda se siente lenta. Siempre fire-and-forget
   con `.catch()`.
5. **Olvidar `deleted_at IS NULL`** en el `WHERE` → muestra resultados borrados.
6. **`coalesce()` en columnas nulables** del FTS — si `descripcion` puede ser
   NULL y haces `titulo || ' ' || descripcion`, el resultado es NULL y la
   pregunta nunca matchea. Marketplace tiene ambas NOT NULL, pero
   Servicios/Ofertas podrían no tenerlas — verificar antes.
7. **`unaccent` no es IMMUTABLE por defecto** — al intentar crear un índice GIN
   cuya expresión incluye `unaccent(...)`, Postgres falla con:
   ```
   ERROR: functions in index expression must be marked IMMUTABLE
   ```
   **Causa:** la extensión `unaccent` registra la función como `STABLE`
   (depende del archivo de configuración del diccionario). Postgres solo
   permite funciones `IMMUTABLE` en expresiones de índice porque tiene que
   garantizar que el valor indexado nunca cambia para los mismos inputs.

   **Por qué `ALTER FUNCTION unaccent IMMUTABLE` NO es la solución:**

   La opción intuitiva es `ALTER FUNCTION unaccent(text) IMMUTABLE`. **En
   Postgres local funciona** (eres dueño de todo). **En Supabase FALLA** con:
   ```
   ERROR: 42501: must be owner of function unaccent
   ```
   porque la extensión `unaccent` vive en el schema `extensions` y es
   propiedad de `supabase_admin`. El rol `postgres` del SQL Editor de
   Supabase no es owner y no puede modificarla. Y NO hay forma estándar
   desde el dashboard de Supabase de cambiar esto.

   **Sub-trampa 7.b — el wrapper también debe calificar con schema:**

   La versión obvia del wrapper:
   ```sql
   CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) RETURNS text AS $$
       SELECT unaccent($1)
   $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
   ```
   **Funciona en local pero FALLA en Supabase** al crear el índice con:
   ```
   ERROR: 42883: function unaccent(text) does not exist
   CONTEXT: SQL function "immutable_unaccent" during inlining
   ```
   El error pasa durante el INLINING (cuando Postgres "expande" la wrapper
   dentro de la expresión del índice). En ese contexto, el search_path NO
   incluye `extensions` (donde vive `unaccent` en Supabase), aunque sí lo
   incluya en sesiones normales. Resultado: la función llamada `unaccent`
   no se resuelve y el `CREATE INDEX` revienta.

   **La solución PORTABLE (funciona idéntico en local y Supabase):**

   Detectar dinámicamente en qué schema vive `unaccent` y calificar
   explícitamente. La forma más limpia es un bloque `DO`:

   ```sql
   DO $do$
   DECLARE
       unaccent_schema text;
   BEGIN
       SELECT n.nspname INTO unaccent_schema
       FROM pg_proc p
       JOIN pg_namespace n ON p.pronamespace = n.oid
       WHERE p.proname = 'unaccent'
       LIMIT 1;

       IF unaccent_schema IS NULL THEN
           RAISE EXCEPTION 'La extensión unaccent no está instalada';
       END IF;

       EXECUTE format($fn$
           CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) RETURNS text AS $body$
               SELECT %I.unaccent($1)
           $body$ LANGUAGE sql IMMUTABLE PARALLEL SAFE
       $fn$, unaccent_schema);
   END
   $do$;
   ```

   - El `SELECT pg_proc + pg_namespace` encuentra el schema real (`extensions`
     en Supabase, `public` en local típico).
   - `EXECUTE format(..., %I, schema)` construye la wrapper calificando
     explícitamente (`extensions.unaccent($1)` en Supabase).
   - `LANGUAGE sql` permite que Postgres la inline (sin overhead).
   - `IMMUTABLE` es el flag que el índice necesita.
   - `PARALLEL SAFE` permite usarla en queries paralelas.
   - Vive en `public` para que el código del backend no tenga que calificar
     con schema (`immutable_unaccent(...)` resuelve directo).
   - Idempotente: re-ejecutar la migración solo hace `CREATE OR REPLACE` y
     re-detecta el schema (que no cambia entre corridas).

   Después en el índice y en las queries del service:
   ```sql
   -- Índice
   CREATE INDEX idx_X_fts ON tabla USING GIN (
     to_tsvector('spanish', public.immutable_unaccent(titulo || ' ' || descripcion))
   );

   -- Query (la expresión debe coincidir exactamente para que el planner use el índice)
   WHERE to_tsvector('spanish', immutable_unaccent(titulo || ' ' || descripcion))
         @@ plainto_tsquery('spanish', immutable_unaccent(${q}))
   ```

   **Por qué importa:** este es el bug histórico de MarketPlace en producción
   (ver `apps/api/src/services/marketplace/buscador.ts:148-151`). El índice
   `idx_marketplace_titulo_fts` quedó SIN `unaccent` y la query usa
   `unaccent`, así que el planner cae a sequential scan. Para datasets
   pequeños es aceptable, pero al crecer hay que migrar al patrón wrapper.

   **Servicios y Ofertas ya usan este patrón** (migraciones
   `2026-05-24-servicios-buscador-fts.sql` y `2026-05-24-ofertas-buscador-fts.sql`).

   **Dónde ponerlo:** en la primera migración FTS de la BD que use la
   wrapper, justo antes del `CREATE INDEX`. Si una migración posterior
   también la necesita, el `CREATE OR REPLACE FUNCTION` es idempotente —
   no rompe nada.

   **Para mantener consistencia local↔producción:** SIEMPRE usar la wrapper,
   incluso si en local podrías marcar `unaccent` como IMMUTABLE directo.
   Mezclar ambos enfoques causa que el índice y la query no coincidan en
   uno de los dos ambientes y el planner caiga a seq scan ahí.

---

## Referencias internas

- **Service molde:** `apps/api/src/services/marketplace/buscador.ts`
- **Controller molde:** `apps/api/src/controllers/marketplace.controller.ts:605`
- **Schema Zod molde:** `apps/api/src/validations/marketplace.schema.ts:320`
- **Ruta molde:** `apps/api/src/routes/marketplace.routes.ts:134`
- **Doc arquitectónico de MarketPlace:** `docs/arquitectura/MarketPlace.md`
- **Extensión `unaccent`:** `docs/migraciones/2026-05-14-extension-unaccent.sql`
- **Patrón del buscador en el frontend (overlay por sección):**
  `docs/estandares/PATRON_BUSCADOR_SECCION.md`
