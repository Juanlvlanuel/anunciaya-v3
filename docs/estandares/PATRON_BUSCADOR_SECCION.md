# Patrón de Buscador por Sección

> **Última actualización:** 14 Mayo 2026
> **Aplica a:** Negocios, Ofertas, MarketPlace (en producción) — referencia obligatoria para cualquier sección pública futura (Servicios, etc.)

Estándar consolidado tras la sesión del 14-may-2026. Antes de implementar un buscador en una sección nueva o modificar uno existente, leer este documento.

---

## Filosofía

Un buscador por sección, sin página dedicada de resultados. La UX es:

1. Usuario hace foco en el input físico (Navbar global desktop, header inmersivo móvil) y empieza a teclear.
2. **Overlay** aparece sobre la página con sugerencias en vivo (cards con preview, top 5).
3. Click en una sugerencia → navega directo al detalle/perfil de esa entidad y cierra el overlay.
4. Click fuera o `Escape` → cierra el overlay; el feed in-page ya está filtrado por el query si aplica (ver §"Filtrado in-page" más abajo).

**No hay** página dedicada de resultados con filtros adicionales (precio, distancia, ordenar). Esa página existió en MarketPlace y se eliminó el 14-may-2026 por sobre-ingeniería para el dataset piloto. Si en el futuro el volumen lo justifica, se puede reabrir reusando el endpoint `GET /api/marketplace/buscar` (`buscarArticulos`) que se conservó.

---

## Arquitectura

### Input físico (1 solo input por viewport)

Vive en uno de dos lugares según viewport:

| Viewport | Dónde | Comportamiento |
|---|---|---|
| Desktop (`lg+`) | Input del Navbar global con `id="input-busqueda-navbar"` | Siempre visible. `onFocus` emite `useSearchStore.abrirBuscador()` solo cuando `pathname.startsWith('/<seccion>')`. `onBlur` con delay cierra solo si query vacío (permite click dentro del overlay). |
| Móvil | Inline dentro del header de la sección (patrón inmersivo, sin Navbar global) | La lupa expande el input. Al hacer click la lupa llama `abrirBuscador()` y enfoca el input. La X grande llama `cerrarBuscador()` (que limpia el query). |

Ambos escriben al mismo `useSearchStore.query`. El overlay es **único** por sección y reutiliza toda su lógica.

### Store global (`apps/web/src/stores/useSearchStore.ts`)

```ts
{
  query: string,
  buscadorAbierto: boolean,
  setQuery, abrirBuscador, cerrarBuscador,  // cerrarBuscador limpia query
}
```

Más helpers:
- `detectarSeccion(pathname)` — detecta sección activa según ruta.
- `placeholderSeccion(seccion)` — placeholder dinámico del input.

### Overlay (1 por sección)

Vive en `apps/web/src/components/<seccion>/OverlayBuscador<Seccion>.tsx` y se monta en `MainLayout.tsx` solo cuando `detectarSeccion(pathname) === '<seccion>'`. **No** se monta dentro de la página — porque el overlay debe seguir funcionando en sub-rutas (ej. `/marketplace/articulo/:id` o `/negocios/:sucursalId`).

Visibilidad: `buscadorAbierto || query.length >= 1` AND `pathname.startsWith('/<seccion>')`.

### Búsquedas recientes (localStorage)

Helper compartido en `apps/web/src/utils/busquedasRecientes.ts`:

```ts
agregarBusquedaReciente(termino, 'marketplace' | 'ofertas' | 'negocios')
obtenerBusquedasRecientes(seccion)
quitarBusquedaReciente(termino, seccion)
borrarBusquedasRecientes(seccion)
```

Cada sección usa su propia clave de localStorage (`<seccion>_busquedas_recientes`) para que las recientes de una no contaminen a otras. Default `'marketplace'` por retro-compatibilidad.

**Click en chip reciente o popular**: rellena el query (dispara las sugerencias) **sin cerrar el overlay** — el usuario decide cuál sugerencia abrir.

---

## Backend

### Endpoint de sugerencias

```
GET /api/<seccion>/buscar/sugerencias?q=&ciudad=
```

- Requiere `verificarToken` (consistente con el feed de la sección).
- Devuelve top 5 con preview enriquecido.
- Debe ser declarado **antes** de las rutas paramétricas (`/:id`) para que Express no lo confunda.
- Sin tabla de log ni populares cacheados (sobra para dataset chico — ver §"Cuándo escalar").

### Cobertura mínima de campos

El filtro `busqueda` en backend debe cubrir todos los campos relevantes. Frontend puede agregar más (in-memory) pero **el backend debe ser el filtro de verdad** — cualquier filtrado adicional in-memory solo afina, no agrega resultados nuevos (porque opera sobre lo que el backend ya devolvió).

| Sección | Campos cubiertos |
|---|---|
| Negocios | nombre del negocio, nombre de sucursal, dirección, ciudad, todas las subcategorías, todas las categorías padre |
| Ofertas | título, descripción, nombre del negocio, todas las subcategorías, todas las categorías padre |
| MarketPlace | título + descripción del artículo (vía FTS español + ILIKE) |

### Accent-insensitive (CRÍTICO)

**Backend:** envolver columna y patrón con `unaccent()`. Requiere `CREATE EXTENSION IF NOT EXISTS unaccent;` (migración `2026-05-14-extension-unaccent.sql`).

```sql
unaccent(col) ILIKE unaccent(${'%' + q + '%'})
```

**FTS español:** envolver tanto `to_tsvector` como `plainto_tsquery` con `unaccent`:

```sql
to_tsvector('spanish', unaccent(titulo || ' ' || descripcion))
  @@ plainto_tsquery('spanish', unaccent(${q}))
```

> El GIN index original sobre la versión sin `unaccent` deja de servir y el planner cae a sequential scan. Aceptable para datasets pequeños. Si crece, recrear index sobre `unaccent(...)`.

### Prefix matching (FTS)

`plainto_tsquery` en español **NO hace prefix matching** — el tokenizer trabaja por palabra completa con stemming. "bici" no matchea "bicicleta". Para cubrir incremental typing combinar con OR `ILIKE`:

```sql
WHERE (
    to_tsvector('spanish', unaccent(...)) @@ plainto_tsquery('spanish', unaccent(${q}))
    OR unaccent(titulo) ILIKE unaccent(${'%' + q + '%'})
    OR unaccent(descripcion) ILIKE unaccent(${'%' + q + '%'})
)
```

El FTS sigue dando ranking por relevancia con `ts_rank` (las filas con match FTS rankean más alto); el ILIKE solo amplía cobertura.

### Filtros heredados de visibilidad

Los `WHERE` del endpoint de sugerencias deben heredar los mismos filtros del feed principal de la sección (oferta activa + visible + dentro de fechas + negocio activo + onboarding completado + sucursal activa + ciudad coincide). De lo contrario el overlay sugiere cosas que no aparecen en el feed.

### Dedup por sucursal (Ofertas)

La misma oferta puede vivir en N sucursales del mismo negocio. En sugerencias, dedup con `ROW_NUMBER() OVER (PARTITION BY (negocio_id, titulo, descripcion, tipo, valor, fecha_fin) ORDER BY s.es_principal DESC, o.updated_at DESC)` y filtrar `WHERE rn = 1`. El usuario ve la oferta una sola vez (preferentemente en la sucursal principal).

Negocios NO deduplica — cada sucursal es relevante por sí misma.

---

## Frontend

### Hook React Query

```ts
// apps/web/src/hooks/queries/use<Seccion>...ts
export function useBuscador<Seccion>Sugerencias(queryRaw: string, ciudad: string | null) {
    const [debounced, setDebounced] = useState(queryRaw);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(queryRaw), 300);
        return () => clearTimeout(t);
    }, [queryRaw]);

    return useQuery({
        queryKey: queryKeys.<seccion>.sugerencias(debounced, ciudad ?? ''),
        queryFn: async () => { ... },
        enabled: !!ciudad && debounced.trim().length >= 2,
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
}
```

**Debounce 300ms del query raw**, mínimo 2 caracteres para disparar fetch.

### Filtro in-memory (cuando aplica — ej. Negocios)

Cuando el feed de la sección ya está cargado en cache (Negocios usa `useNegociosLista` que devuelve el array completo), el overlay puede filtrar in-memory contra ese array sin endpoint nuevo:

```ts
const sugerencias = useMemo(() => {
    const q = normalizarTexto(query.trim());
    if (q.length < 2) return [];
    return entidades.filter(e => {
        // Comparar TODOS los campos relevantes con normalizarTexto.
        return normalizarTexto(e.nombre).includes(q) ||
               normalizarTexto(e.taxonomia).includes(q) ||
               // ...
    }).slice(0, 5);
}, [query, entidades]);
```

`normalizarTexto` (de `apps/web/src/utils/normalizarTexto.ts`) hace `toLowerCase + NFD + quitar diacríticos`. La ñ se preserva (es letra propia, no diacrítico).

### Performance al teclear/borrar

Dos patrones según el caso:

1. **Filtros in-memory pesados** (ej. PaginaNegocios filtra negocios + re-renderiza mapa/popups/cards):
   ```ts
   const queryDiferido = useDeferredValue(searchQuery);
   const filtrados = useMemo(() => /* filtro pesado */, [queryDiferido, raw]);
   ```
   `useDeferredValue` (React 18 native) mantiene el input prioritario y deja el filtro pesado para cuando React tiene tiempo libre. Sin él, al borrar la lista crece y cada keystroke recalcula filtro + re-render — se siente "en cámara lenta".

2. **Query del feed que va al backend**: debounce manual 250ms antes de armar el queryKey. Sin él, cada keystroke cambia el queryKey y React Query refetcha al backend cada tecla.
   ```ts
   const [busqueda, setBusqueda] = useState(queryRaw);
   useEffect(() => {
       const t = setTimeout(() => setBusqueda(queryRaw), 250);
       return () => clearTimeout(t);
   }, [queryRaw]);
   const filtros = { ..., busqueda };
   ```

   El input visual se mantiene instantáneo (escribe directo al store). Solo se debouncea el fetch.

### Click en sugerencia

Navega directo al detalle/perfil:

| Sección | Ruta destino |
|---|---|
| Negocios | `/negocios/:sucursalId` (perfil completo) |
| Ofertas | `/ofertas?oferta=:ofertaId` (PaginaOfertas lee param y abre `ModalOfertaDetalle`) |
| MarketPlace | `/marketplace/articulo/:articuloId` |

Antes de navegar:
1. `agregarBusquedaReciente(query.trim(), '<seccion>')`
2. `cerrarBuscador()` (limpia el query del store)
3. `navigate(...)`

### Filtrado in-page

El feed de la página suele leer del mismo `useSearchStore.query` y filtrar automáticamente. Por eso al cerrar el overlay sin haber clickeado una sugerencia, el usuario ve la lista filtrada. Esto reemplaza la antigua "página de resultados".

| Sección | Cómo se filtra el feed in-page |
|---|---|
| Negocios | `PaginaNegocios.tsx` propaga `searchQuery → useFiltrosNegociosStore.busqueda` con debounce 400ms; backend filtra |
| Ofertas | `useOfertasFeedCerca` lee `useSearchStore.query` directo (con debounce 250ms) y lo pasa al backend |
| MarketPlace | El feed infinito NO depende del query (decisión: el feed es exploración general; el overlay cubre búsqueda específica) |

---

## Convenciones visuales

| Sección | Color del botón "Ver todos" / chips activos / acentos | Source |
|---|---|---|
| Marketplace | `teal-700` / `teal-500` | identidad MP |
| Ofertas | `amber-700` / `amber-500` | identidad Ofertas |
| Negocios | `blue-700` / `blue-500` | identidad Negocios |

Ancho del overlay: `max-w-3xl` con `mt-20 lg:mt-24` para no pegarse al borde superior. `max-h-[75vh]` con scroll interno. Esquinas `rounded-2xl`, `border border-slate-200`, `shadow-2xl`. `bg-black/30` en el backdrop con `onClick={cerrarBuscador}`.

Cards de sugerencia: `flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100`. Avatar/foto `h-14 w-14 rounded-lg bg-slate-100`. Texto `truncate text-sm` para los 3 renglones (título / dato + categoría / ciudad). Icono `ArrowUpRight` a la derecha.

---

## Cuándo escalar

El patrón actual asume **dataset chico por ciudad** (decenas a pocos cientos). Cuando alguno de estos umbrales se cumpla, evaluar si vale la pena escalar:

| Caso | Síntoma | Solución |
|---|---|---|
| 100+ resultados típicos por búsqueda | Usuario quiere acotar (precio, distancia, ordenar) | Reabrir página dedicada de resultados con filtros (endpoint `buscarArticulos` ya existe en MP) |
| Backend tarda > 200ms en sugerencias | Latencia perceptible al teclear | Crear índices funcionales con `unaccent` + `pg_trgm`: `CREATE INDEX ... USING gin (unaccent(col) gin_trgm_ops)` |
| Dataset > 10.000 ítems por ciudad | ILIKE secuencial pesa mucho | Migrar a FTS (como hace MarketPlace), agregar tabla de log + populares con cache Redis |
| Múltiples ciudades activas | "Más buscado en X" sería útil | Tabla `<seccion>_busquedas_log` (ver `marketplace_busquedas_log`) con `usuario_id = NULL` por privacidad |

**No escalar preventivamente.** El patrón actual funciona y es mantenible. Cada pieza adicional (FTS, log, populares, cache) suma complejidad — solo justificar cuando haya evidencia de uso.

---

## Recipe: agregar el patrón a una sección nueva

Ejemplo: Servicios. Pasos en orden:

1. **Backend service**: `apps/api/src/services/servicios/buscador.ts` con función `obtenerSugerenciasServicios(q, ciudad)`. Patrón espejo de `services/ofertas/buscador.ts`. Heredar filtros de visibilidad del feed principal. Aplicar `unaccent()` y EXISTS para categorías.
2. **Backend controller**: handler en `controllers/servicios.controller.ts`.
3. **Backend routes**: `router.get('/buscar/sugerencias', verificarToken, getSugerenciasServicios)` **antes** de las rutas paramétricas.
4. **Frontend service**: función `obtenerSugerenciasServicios(q, ciudad)` en `apps/web/src/services/serviciosService.ts`.
5. **Query key**: `serviciosFeed.sugerencias(q, ciudad)` en `queryKeys.ts`.
6. **Hook**: `useBuscadorServiciosSugerencias` con debounce 300ms.
7. **Helper de recientes**: agregar `'servicios'` al tipo `SeccionBusqueda` de `busquedasRecientes.ts`.
8. **Overlay**: `apps/web/src/components/servicios/OverlayBuscadorServicios.tsx`. Clonar `OverlayBuscadorOfertas.tsx` y adaptar color + tipo de card.
9. **Header de la sección**: lupa móvil escribe a `useSearchStore.query` (no a state local). Mismo patrón de `HeaderOfertas.tsx`.
10. **PaginaServicios**: si necesita reaccionar al click en sugerencia (ej. abrir modal), `useEffect` que lee el search param.
11. **MainLayout**: agregar `{detectarSeccion(location.pathname) === 'servicios' && <OverlayBuscadorServicios />}`.
12. **Performance**: si la página filtra in-memory algo pesado, envolver con `useDeferredValue`. Si dispara fetch al backend en cada keystroke, debounce 250ms del query antes del queryKey.
13. **Doc**: actualizar `docs/arquitectura/Servicios.md` con sección de Buscador (ver `Negocios.md` v3.2 como modelo) + entrada en `CHANGELOG.md`.

---

## Referencias

- `docs/arquitectura/MarketPlace.md` §P5 — patrón canónico (con FTS español)
- `docs/arquitectura/Ofertas.md` §v1.7 — versión sobria con ILIKE
- `docs/arquitectura/Negocios.md` §v3.2 — versión sin endpoint backend (filtro in-memory)
- `docs/migraciones/2026-05-14-extension-unaccent.sql` — migración para extensión Postgres
- `docs/estandares/PATRON_REACT_QUERY.md` — patrón general de React Query
- `apps/web/src/utils/normalizarTexto.ts` — helper accent-insensitive frontend
- `apps/web/src/utils/busquedasRecientes.ts` — helper de recientes en localStorage por sección
