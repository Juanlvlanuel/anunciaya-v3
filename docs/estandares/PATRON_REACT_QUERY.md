# Patrón React Query + Zustand — AnunciaYA

> Estándar obligatorio para manejo de datos en el frontend.
> Establecido en Abril 2026 durante sprint de performance de Business Studio.

---

## El Principio Base

El "estado" en una app tiene dos tipos completamente distintos:

| Tipo | Descripción | Herramienta |
|---|---|---|
| **Estado de servidor** | Datos que viven en la BD: KPIs, historial, clientes | React Query |
| **Estado de UI** | Lo que solo existe en el navegador: tab activo, filtros, dropdowns abiertos | Zustand |

**Regla absoluta:** NUNCA mezclar los dos tipos en el mismo store.

---

## Por qué React Query para datos del servidor

Con Zustand puro, el desarrollador tiene que implementar manualmente:
- Caché (¿ya tengo estos datos?)
- staleTime (¿cuándo están desactualizados?)
- Deduplicación (¿no lanzar dos veces la misma petición)
- Refetch al cambiar filtros
- Refetch al cambiar sucursal
- Spinner solo en carga inicial (no en refetches)
- Mantener datos anteriores al filtrar (sin "temblor")
- Rollback en mutaciones fallidas

React Query resuelve todo eso de forma nativa y probada.

---

## Configuración Global

### `apps/web/src/config/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 min: datos "frescos"
      gcTime: 10 * 60 * 1000,     // 10 min: borrar del caché si nadie lo usa
      refetchOnWindowFocus: false, // no refetch al cambiar de pestaña
      refetchOnReconnect: true,    // sí refetch al recuperar internet
      retry: 1,                   // 1 reintento en caso de error
    },
  },
});
```

### `apps/web/src/config/queryKeys.ts`

Catálogo centralizado de todas las query keys. Cada módulo define sus keys aquí.

**Convención:**
```typescript
modulo: {
  all: () => ['modulo'] as const,                          // invalida TODO el módulo
  lista: (sucursalId, filtros?) => [...] as const,         // invalida listas paginadas
  kpis: (sucursalId, periodo) => [...] as const,           // invalida métricas
  detalle: (id) => [...] as const,                         // invalida un registro
}
```

---

## Estructura Estándar de un Hook de Módulo

Ubicación: `apps/web/src/hooks/queries/useNombreModulo.ts`

```typescript
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as moduloService from '../../services/moduloService';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';

// ─── Guard estándar ────────────────────────────────────────────────────────
// Siempre verificar que haya sucursal y modo comercial antes de fetchear.
const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
const habilitado = !!sucursalId && modoActivo === 'comercial';

// ─── useQuery (datos simples) ──────────────────────────────────────────────
export function useModuloKPIs(periodo: string) {
  return useQuery({
    queryKey: queryKeys.modulo.kpis(sucursalId, periodo),
    queryFn: () => moduloService.getKPIs(periodo).then((r) => r.data ?? null),
    enabled: habilitado,
    placeholderData: keepPreviousData,  // ← OBLIGATORIO en queries con filtros
  });
}

// ─── useInfiniteQuery (listas paginadas) ───────────────────────────────────
const LIMIT = 20;

export function useModuloLista(filtros: FiltrosModulo) {
  return useInfiniteQuery({
    queryKey: queryKeys.modulo.lista(sucursalId, filtros as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      moduloService.getLista(filtros, LIMIT, pageParam as number)
        .then((r) => r.data ?? { items: [], total: 0 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < LIMIT) return undefined;
      return allPages.reduce((acc, p) => acc + p.items.length, 0);
    },
    enabled: habilitado,
    placeholderData: keepPreviousData,  // ← OBLIGATORIO
  });
}

// ─── useMutation (escritura con invalidación) ──────────────────────────────
export function useCrearItem() {
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: (datos: DatosNuevoItem) => moduloService.crear(datos),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({
        queryKey: queryKeys.modulo.all(),
      });
    },
  });
}

// ─── useMutation con update optimista ─────────────────────────────────────
export function useEliminarItem() {
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => moduloService.eliminar(id),
    onMutate: async (id) => {
      await queryClientInstance.cancelQueries({ queryKey: queryKeys.modulo.all() });
      const snapshot = queryClientInstance.getQueryData(queryKeys.modulo.lista(sucursalId));
      // ... update optimista en caché
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      if (context?.snapshot) {
        queryClientInstance.setQueryData(queryKeys.modulo.lista(sucursalId), context.snapshot);
      }
    },
    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.modulo.all() });
    },
  });
}

// ─── Refresh manual ────────────────────────────────────────────────────────
export function useModuloRefresh() {
  const queryClientInstance = useQueryClient();
  return {
    refetchTodo: () =>
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.modulo.all() }),
  };
}
```

---

## Estructura Estándar del Store Simplificado

Después de migrar, el store de Zustand solo contiene estado de UI:

```typescript
// useModuloStore.ts — SOLO estado UI
interface ModuloUIState {
  // Navegación
  tabActivo: 'tab1' | 'tab2';
  // Filtros
  periodo: Periodo;
  busqueda: string;
  filtroEstado: string;
  // Setters
  setTabActivo: (tab: ...) => void;
  setPeriodo: (periodo: Periodo) => void;
  setBusqueda: (busqueda: string) => void;
  setFiltroEstado: (estado: string) => void;
  // Reset al salir de la página
  limpiar: () => void;
}
```

**Lo que YA NO va en el store:**
- ❌ Los datos (historial, kpis, items)
- ❌ Estados de carga (cargando, cargandoMas)
- ❌ Paginación (offset, hayMas)
- ❌ Funciones de fetch (cargarHistorial, cargarKPIs)
- ❌ Flags de primera carga (cargaInicialCompleta)

---

## Uso en la Página

```typescript
// ─── Store — solo UI ──────────────────────────────────────────────────────
const { periodo, setPeriodo, busqueda, setBusqueda, limpiar } = useModuloStore();

// ─── Queries — datos del servidor ─────────────────────────────────────────
const kpisQuery = useModuloKPIs(periodo);
const listaQuery = useModuloLista({ periodo, busqueda });

// ─── Aliases — mismos nombres para no cambiar el JSX ──────────────────────
const kpis = kpisQuery.data ?? null;
const cargandoKpis = kpisQuery.isPending;
const items = listaQuery.data?.pages.flatMap((p) => p.items) ?? [];
const cargandoLista = listaQuery.isPending;
const cargandoMas = listaQuery.isFetchingNextPage;
const hayMas = listaQuery.hasNextPage;

// ─── Cleanup al salir (resetear filtros UI) ───────────────────────────────
useEffect(() => {
  return () => limpiar();
}, [limpiar]);
```

**Notas clave:**
- El `useEffect` de carga inicial (el que llamaba `cargarTodo()`) **desaparece** — React Query fetcha automáticamente.
- El `useEffect` de recarga por sucursal **desaparece** — `sucursalId` está en el query key.
- Los `cargarMas()` en botones o IntersectionObserver se reemplazan por `listaQuery.fetchNextPage()`.

---

## Reglas Obligatorias

### 1. `placeholderData: keepPreviousData` — SIEMPRE en queries con filtros

Sin esto, al cambiar un filtro la tabla se vacía brevemente (temblor). Con esto, los datos anteriores permanecen visibles hasta que lleguen los nuevos.

```typescript
// ✅ Correcto
useQuery({ ..., placeholderData: keepPreviousData });
useInfiniteQuery({ ..., placeholderData: keepPreviousData });

// ❌ Incorrecto — causa temblor al filtrar
useQuery({ ... });
```

**Excepción:** Queries que no tienen filtros que cambian en runtime (ej: datos de configuración que se cargan una sola vez) no necesitan `keepPreviousData`.

### 2. `enabled` siempre verifica sucursal y modo

```typescript
const habilitado = !!sucursalId && modoActivo === 'comercial';
// enabled: habilitado
```

### 3. Nunca `sucursalId` manual en las llamadas

El interceptor Axios ya lo agrega. `sucursalId` solo aparece en el **query key** para que el caché sea por sucursal.

### 4. `staleTime` especial solo cuando es necesario

- Default global: 2 minutos (suficiente para la mayoría)
- Alertas / datos de alta prioridad: 30 segundos
- Operadores / datos que cambian poco: 5 minutos
- NO cambiar el default sin justificación

### 5. `limpiar()` en unmount siempre

```typescript
useEffect(() => {
  return () => limpiar();
}, [limpiar]);
```

Sin esto, los filtros del usuario persisten al navegar de regreso a la página.

### 6. Toda escritura al backend DEBE invalidar caché

No importa si la escritura está en un `useMutation` o en un `api.post/put/delete` directo — **siempre** debe invalidar los query keys afectados. Una escritura sin invalidación = datos stale en la UI.

```typescript
// ❌ Incorrecto — escritura suelta sin invalidar
const handleSubirLogo = async (url: string) => {
  await api.post(`/negocios/${negocioId}/logo`, { logoUrl: url });
  setDatosImagenes(prev => ({ ...prev, logoUrl: url })); // solo estado local
};

// ✅ Correcto — invalidar caché después de la escritura
const handleSubirLogo = async (url: string) => {
  await api.post(`/negocios/${negocioId}/logo`, { logoUrl: url });
  setDatosImagenes(prev => ({ ...prev, logoUrl: url }));
  qc.invalidateQueries({ queryKey: queryKeys.perfil.sucursal(sucursalActiva) });
};
```

**Excepción:** Llamadas fire-and-forget de métricas analíticas (`POST /metricas/view`, `/metricas/click`, `/metricas/share`, `/articulos/:id/vista`) que solo incrementan contadores. Estos no afectan datos visibles en la UI.

### 7. Invalidación cruzada — invalidar TODOS los módulos que muestran el mismo dato

Cuando una mutación cambia datos que se consumen en más de un módulo, **todos** los query keys afectados deben invalidarse.

**Regla:** Antes de escribir `onSuccess`, pregúntate: _¿qué otros módulos muestran estos mismos datos?_

```typescript
// ❌ Incorrecto — solo invalida su módulo
onSuccess: () => {
  qc.invalidateQueries({ queryKey: queryKeys.transacciones.kpis(sucursalId, periodo) });
},

// ✅ Correcto — invalida su módulo + módulos relacionados
onSuccess: () => {
  qc.invalidateQueries({ queryKey: queryKeys.transacciones.kpis(sucursalId, periodo) });
  qc.invalidateQueries({ queryKey: ['dashboard', 'kpis', sucursalId] }); // ← cross-módulo
},
```

**Para ver el mapa completo** de qué invalidar en cada mutación, ver la sección [Mapa de Invalidaciones Cross-Módulo](#mapa-de-invalidaciones-cross-módulo) al final de este documento.

### 8. Granularidad — prefix match sobre keys totales

Preferir keys parciales (con `sucursalId` pero sin el último segmento) sobre keys totales (`['modulo']`) para no invalidar caches no afectadas.

```typescript
// ❌ Exagerado — invalida campanas, interacciones, alertas (que no cambian con una revocación)
qc.invalidateQueries({ queryKey: queryKeys.dashboard.all() });

// ✅ Granular — solo invalida kpis y ventas del dashboard (prefix match todas las variantes de periodo)
qc.invalidateQueries({ queryKey: ['dashboard', 'kpis', sucursalId] });
qc.invalidateQueries({ queryKey: ['dashboard', 'ventas', sucursalId] });
```

El prefix match de React Query es posicional: `['dashboard', 'kpis', sucursalId]` matchea `['dashboard', 'kpis', sucursalId, 'hoy']`, `['dashboard', 'kpis', sucursalId, 'mes']`, etc.

### 9. Sincronizar `useAuthStore` además de React Query

Algunos componentes leen datos del negocio/sucursal directamente del `useAuthStore` (Zustand persistido al login), NO desde React Query. Invalidar queries no basta — hay que hacer `setUsuario({ ...actual, campo: valor })` también.

**Componentes que leen del authStore:** `Navbar`, `ColumnaIzquierda`, `MenuDrawer`, `SelectorSucursalesInline`.

**Campos que pueden quedar stale:**
- `logoNegocio` — sidebar, header
- `fotoPerfilNegocio` / `fotoPerfilSucursalAsignada` — header
- `nombreNegocio` — sidebar, header, menú, selector sucursales
- `nombreSucursalAsignada` — header, menú
- `correoNegocio` / `correoSucursalAsignada` — fallback en header, menú

```typescript
// ❌ Incorrecto — solo invalida React Query
await api.post(`/negocios/${negocioId}/logo`, { logoUrl: url });
qc.invalidateQueries({ queryKey: queryKeys.perfil.sucursal(sucursalActiva) });
// Navbar y sidebar siguen mostrando el logo viejo del authStore

// ✅ Correcto — invalida RQ + sincroniza authStore
await api.post(`/negocios/${negocioId}/logo`, { logoUrl: url });
qc.invalidateQueries({ queryKey: queryKeys.perfil.sucursal(sucursalActiva) });
const u = useAuthStore.getState().usuario;
if (u) useAuthStore.getState().setUsuario({ ...u, logoNegocio: url });
```

---

## Patrones Avanzados

Seis patrones que aparecen repetidos en el código pero que no son obvios al leer la estructura estándar. Conocerlos ahorra reinventarlos cada vez.

### 1. Extraer IDs del snapshot en `onMutate` para usarlos en `onSuccess`

Cuando una mutación necesita invalidar queries de otro módulo pero no tiene el ID directamente, puedes extraerlo del snapshot durante `onMutate` y pasarlo vía el `context` que React Query propaga a los siguientes callbacks.

Caso real: `useRevocarTransaccion` recibe `{ id, motivo }` (id de la TX) pero necesita invalidar `clientes.detalle(clienteId)` del cliente afectado. En vez de hacer otra llamada al backend, extrae el `clienteId` del historial cacheado:

```typescript
onMutate: async ({ id, motivo }) => {
  const snapshot = qc.getQueriesData<{ pages: { historial: TransaccionPuntos[] }[] }>({
    queryKey: ['transacciones', 'historial', sucursalId],
  });

  // Buscar el clienteId en el snapshot antes de aplicar optimistic update
  let clienteIdAfectado: string | undefined;
  for (const [, value] of snapshot) {
    if (!value) continue;
    for (const page of value.pages) {
      const tx = page.historial.find((t) => t.id === id);
      if (tx) {
        clienteIdAfectado = tx.clienteId;
        break;
      }
    }
    if (clienteIdAfectado) break;
  }

  // ... optimistic update ...

  return { snapshot, clienteIdAfectado }; // ← pasa via context
},

onSuccess: (_data, _vars, context) => {
  const clienteId = context?.clienteIdAfectado;
  if (clienteId) {
    qc.invalidateQueries({ queryKey: queryKeys.clientes.detalle(clienteId) });
    qc.invalidateQueries({ queryKey: queryKeys.clientes.historial(clienteId) });
  }
},
```

### 2. Helpers privados para invalidación compartida

Cuando varias mutaciones del mismo módulo invalidan las mismas caches, extraer un helper evita duplicar 4-5 líneas en cada `onSuccess`. Dos formas válidas:

**Como función sin hook** (dentro del archivo del hook), para llamarla desde `onSuccess`:

```typescript
// useOfertas.ts
function invalidarOfertasRelacionadas(
  qc: ReturnType<typeof useQueryClient>,
  sucursalId: string
) {
  qc.invalidateQueries({ queryKey: queryKeys.ofertas.porSucursal(sucursalId) });
  qc.invalidateQueries({ queryKey: queryKeys.dashboard.campanas(sucursalId) });
  qc.invalidateQueries({ queryKey: ['dashboard', 'kpis', sucursalId] });
  qc.invalidateQueries({ queryKey: ['negocios', 'ofertas', sucursalId] });
  qc.invalidateQueries({ queryKey: ['reportes', 'promociones'] });
}

// ... después en cada mutación
onSuccess: () => {
  invalidarOfertasRelacionadas(qc, sucursalId);
  notificar.exito('Oferta creada');
},
```

**Como hook exportado** (`useOfertasInvalidar`), para que las acciones inline en componentes (no mutaciones formales) puedan llamarlo:

```typescript
// En PaginaOfertas.tsx
const { invalidar: invalidarOfertas } = useOfertasInvalidar();

const handleRevocarCupon = async (oferta) => {
  await revocarCuponMasivo(oferta.id); // llamada directa al service
  invalidarOfertas(); // mismo efecto que un onSuccess de mutation
};
```

Ambos helpers deben invalidar exactamente las mismas keys para que las acciones directas e inline tengan el mismo comportamiento.

### 3. Acciones puras — cuándo NO invalidar nada

Algunas "mutaciones" no cambian datos visibles en ninguna UI — son efectos laterales. Estas **no necesitan invalidar nada**. Ejemplos reales:

| Acción | Por qué no invalida |
|---|---|
| `reenviarCupon` | Push de notificación al cliente, el cupón no cambia |
| `useRevocarSesion` (empleados) | Invalida sesión remota del empleado; no hay campo `sessionActiva` en `EmpleadoDetalle` |

```typescript
// ✅ Correcto — acción pura, sin invalidaciones
export function useRevocarSesion() {
  return useMutation({
    mutationFn: (id: string) => empleadosService.revocarSesion(id),
    onError: (_err) => { /* notificar error */ },
    onSuccess: () => { notificar.exito('Sesión revocada'); },
  });
}
```

**Criterio:** si no puedes nombrar una query cacheada cuyo contenido cambia tras esta acción, no invalides. Invalidar "por si acaso" genera refetches innecesarios.

### 4. `setQueryData` vs `invalidateQueries` en `onSuccess`

Cuando el backend devuelve el recurso actualizado en la respuesta (`respuesta.data`), usar `setQueryData` es **mejor** que `invalidateQueries`:

- **`setQueryData`:** reemplaza el dato en cache con el de la respuesta → 0 refetches
- **`invalidateQueries`:** marca como stale → dispara refetch → segunda petición redundante

```typescript
// ✅ Óptimo — reemplaza el temporal con el real del backend
onSuccess: (respuesta, { id }) => {
  if (respuesta.data) {
    qc.setQueryData<Recompensa[]>(
      queryKeys.puntos.recompensas(),
      (old) => old?.map((r) => r.id === id ? respuesta.data! : r) ?? []
    );
  }
},

// ⚠️ Subóptimo — fuerza un refetch que ya tienes localmente
onSuccess: () => {
  qc.invalidateQueries({ queryKey: queryKeys.puntos.recompensas() });
},
```

**Cuándo SÍ usar `invalidateQueries`:**
- El backend no devuelve el dato (solo status)
- Quieres sincronizar campos derivados que el backend calcula (ej: `updatedAt`, `totalVentas`, `rating`)
- Estás invalidando caches de **otros módulos** (`dashboard.kpis`, etc.) — ahí casi siempre quieres `invalidateQueries`

**Patrón combinado (muy común en el código):**
```typescript
onSuccess: (respuesta, { id }) => {
  // Dato local: reemplazar con respuesta del backend
  if (respuesta.data) {
    qc.setQueryData(queryKeys.modulo.detalle(id), respuesta.data);
  }
  // Caches derivadas: invalidar
  qc.invalidateQueries({ queryKey: queryKeys.modulo.kpis(sucursalId) });
  qc.invalidateQueries({ queryKey: ['reportes', 'xxx'] });
},
```

### 5. `removeQueries` (no `invalidateQueries`) para detalles tras eliminar

Al eliminar un recurso, si alguien vuelve a abrir su modal de detalle, no queremos que React Query haga un refetch de `/api/recurso/:id` que devolverá 404. Usar `removeQueries` borra la entrada del cache.

```typescript
// ✅ Correcto
onSuccess: (_data, id) => {
  qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
  qc.invalidateQueries({ queryKey: queryKeys.empleados.lista(sucursalId) });
  // El detalle ya no existe — removemos la entrada del cache
  qc.removeQueries({ queryKey: queryKeys.empleados.detalle(id) });
},

// ❌ Incorrecto — dispara GET /api/empleados/:id → 404
onSuccess: (_data, id) => {
  qc.invalidateQueries({ queryKey: queryKeys.empleados.detalle(id) });
},
```

### 6. Cuándo NO usar optimistic update

Optimistic update vale la pena cuando hay **estado previo visible** que se puede modificar sin dejar la UI en un estado raro. Cuándo NO vale la pena:

| Caso | Por qué saltarse optimistic |
|---|---|
| **Crear desde cero** | Necesitas generar un ID temporal (`temp-${Date.now()}`) y reemplazarlo en `onSuccess` — agrega complejidad sin ganancia perceptible. Preferir `invalidateQueries` al éxito |
| **Mutación sin campos visibles** | Ej: marcar un log, trigger de job async. Nada que mostrar optimísticamente |
| **Backend hace cálculos derivados complejos** | Si el backend calcula muchos campos a partir del input (ej: recalcular `nivelActual` de todos los clientes tras cambiar rangos de niveles), es casi imposible replicar la lógica en el cliente. Mejor invalidar y dejar que el backend sea la fuente de verdad |

`useCrearEmpleado` es un ejemplo de creación sin optimistic:

```typescript
export function useCrearEmpleado() {
  return useMutation({
    mutationFn: (datos: CrearEmpleadoInput) => empleadosService.crearEmpleado(datos),
    // Sin onMutate — no intenta agregar un empleado temporal a la lista
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.lista(sucursalId) });
      qc.invalidateQueries({ queryKey: queryKeys.empleados.kpis(sucursalId) });
      // ... más invalidaciones cross-módulo
      notificar.exito('Empleado creado');
    },
  });
}
```

La lista se refresca con un refetch al éxito. El usuario ve un spinner brevísimo, pero el código es más simple y no hay riesgo de rollback.

---

## Mapa de Invalidaciones Cross-Módulo

Este mapa es el resultado del audit completo de los 11 módulos BS con React Query. Lo que hay en el código hoy refleja estas reglas — respetarlas al añadir nuevas mutaciones evita regresiones.

### Cómo usar este mapa

**Al escribir una nueva mutación:**
1. Busca en la sección "Por mutación" para ver el patrón de un módulo similar
2. Busca en la sección "Por query afectada" para descubrir qué caches puede tocar tu cambio
3. Lee las "Lecciones clave" para no caer en las trampas comunes

**Al auditar un módulo existente:**
1. Lista todas las mutaciones (useMutation + llamadas directas a `api.*` en componentes)
2. Para cada una, cruza con las queries de la sección "Por query afectada"
3. Verifica que el `onSuccess` invalide todas las que correspondan

---

### Por mutación

#### Dashboard

| Mutación | Archivo | Invalida |
|---|---|---|
| `marcarAlertaLeida` (banner) | `useDashboard.ts` | `dashboard.alertas(sucursalId)`, `['alertas', 'lista', sucursalId]`, `alertas.kpis(sucursalId)` |
| `marcarTodasLeidas` (banner) | `useDashboard.ts` | mismas que arriba |

**Observación:** `PaginaDashboard.tsx::handleGuardarOferta/Articulo` usa los hooks `useCrearOferta`/`useActualizarOferta`/`useCrearArticulo` (no llama al service directo) — las invalidaciones las maneja automáticamente cada mutación.

#### Transacciones

| Mutación | Archivo | Invalida |
|---|---|---|
| `useRevocarTransaccion` | `useTransacciones.ts` | `['transacciones', 'historial', sucursalId]`, `['transacciones', 'kpis', sucursalId]`, `['dashboard', 'kpis', sucursalId]`, `['dashboard', 'ventas', sucursalId]`, `clientes.detalle(clienteId)`, `clientes.historial(clienteId)`, `clientes.kpis(sucursalId)`, `['clientes', 'lista', sucursalId]`, `clientes.selector(sucursalId)`, `['puntos', 'estadisticas', sucursalId]`, `['reportes', 'ventas']`, `['reportes', 'clientes']`, `['reportes', 'empleados']` |

**Patrón especial:** el `clienteId` afectado se extrae del snapshot del historial en `onMutate` y se pasa al `context` para usarlo en `onSuccess`.

**Patrón especial:** el optimistic update llena `motivoRevocacion` (no solo `estado: 'cancelado'`) para que al reabrir el modal de la misma TX se vea el motivo sin esperar al refetch.

#### Clientes

**Sin mutaciones propias** — todas las invalidaciones vienen desde `useRevocarTransaccion`.

#### Mi Perfil

**Sin `useMutation` formales** — usa `api.put/post/delete` directo en `perfil/hooks/usePerfil.ts::guardarTodo` y en `TabImagenes.tsx`. Ambos usan helpers que invalidan:

| Helper | Ubicación | Invalida |
|---|---|---|
| `invalidarCachesNegocio(actualizaAuth?)` | `TabImagenes.tsx` | `perfil.sucursal(sucursalActiva)`, `negocios.detalle(sucursalActiva)`, `['negocios', 'lista']`, `['guardados', 'negocios']`, `['perfil', 'sucursales']` |
| `refetch()` | `perfil/hooks/usePerfil.ts` | mismas que arriba |

**Sincronización del authStore** — `TabImagenes` pasa al helper los campos a actualizar:

| Operación | Campos del authStore sincronizados |
|---|---|
| POST/DELETE logo | `logoNegocio` |
| POST/DELETE foto-perfil | `fotoPerfilNegocio`, `fotoPerfilSucursalAsignada` |
| POST/DELETE portada / galería | — (no se leen del authStore) |

`guardarTodo()` sincroniza:
- Tab Información → `nombreNegocio`, `nombreSucursalAsignada` (si cambió)
- Tab Contacto → `correoNegocio` / `correoSucursalAsignada` (según vista), `nombreSucursalAsignada` (si se edita en vista gerente)

#### Catálogo

| Mutación | Archivo | Invalida |
|---|---|---|
| `useCrearArticulo` | `useArticulos.ts` | `articulos.porSucursal(sucursalId)`, `['negocios', 'catalogo', negocioId]` |
| `useActualizarArticulo` | `useArticulos.ts` | mismas |
| `useEliminarArticulo` | `useArticulos.ts` | mismas |
| `useDuplicarArticulo` | `useArticulos.ts` | `articulos.porSucursal(sid)` por cada sucursal destino + `['negocios', 'catalogo', negocioId]` (una sola vez — el endpoint devuelve catálogo del negocio completo) |

#### Promociones

Las 4 mutaciones usan el helper privado `invalidarOfertasRelacionadas`. Las acciones directas (`revocarCuponMasivo`, `reactivarCuponService` desde `PaginaOfertas.tsx` y `ModalOferta.tsx`) usan el helper público `useOfertasInvalidar` con el mismo contenido.

| Helper | Invalida |
|---|---|
| `useOfertasInvalidar` / `invalidarOfertasRelacionadas` | `ofertas.porSucursal(sucursalId)`, `dashboard.campanas(sucursalId)`, `['dashboard', 'kpis', sucursalId]`, `['negocios', 'ofertas', sucursalId]`, `['reportes', 'promociones']` |

**Además de esto:**
- `handleRevocarCupon` y `handleReactivarCupon` (en `PaginaOfertas.tsx`) invalidan `ofertas.clientesAsignados(ofertaId)` — el campo `estado` de cada cliente cambia al revocar/reactivar masivamente
- `reenviarCupon` es una acción pura (push de notificación), no invalida nada

**No se invalida** `cupones.lista(usuarioId)` porque es cache del cliente receptor en otra sesión — requeriría WebSocket push.

#### Puntos

| Mutación | Archivo | Invalida |
|---|---|---|
| `useActualizarConfigPuntos` | `usePuntos.ts` | `puntos.configuracion()` (via setQueryData), `['clientes', 'detalle']`, `['clientes', 'lista', sucursalId]`, `clientes.kpis(sucursalId)`, `clientes.selector(sucursalId)`, `['reportes', 'clientes']` |
| `useCrearRecompensa` | `usePuntos.ts` | `puntos.recompensas()` (setQueryData), `['cardya', 'recompensas']` |
| `useActualizarRecompensa` | `usePuntos.ts` | mismas |
| `useEliminarRecompensa` | `usePuntos.ts` | mismas |

**Por qué config de puntos invalida clientes:** cambiar rangos de niveles (bronce/plata/oro) hace que el backend recalcule el `nivelActual` de los clientes existentes. Todas las queries que muestran `nivelActual` (incluidas `ClienteCompleto` de la lista y selector) quedan stale.

#### Opiniones

| Mutación | Archivo | Invalida |
|---|---|---|
| `useResponderResena` | `useResenas.ts` | `resenas.lista(sucursalId)` + `resenas.kpis(sucursalId)` (setQueryData optimista), `['negocios', 'resenas', sucursalId]`, `['reportes', 'resenas']` |

#### Alertas

| Mutación | Archivo | Invalida |
|---|---|---|
| `useMarcarAlertaLeida` | `useAlertas.ts` | optimistic lista + kpis, `dashboard.alertas(sucursalId)` |
| `useMarcarAlertaResuelta` | `useAlertas.ts` | optimistic lista, `alertas.kpis(sucursalId)`, `dashboard.alertas(sucursalId)` |
| `useMarcarTodasLeidas` | `useAlertas.ts` | setQueryData lista + kpis, `dashboard.alertas(sucursalId)` |
| `useActualizarConfiguracionAlerta` | `useAlertas.ts` | `alertas.configuracion(sucursalId)` (optimistic) — la config solo afecta generación futura de alertas |
| `useEliminarAlerta` | `useAlertas.ts` | optimistic lista, `alertas.kpis(sucursalId)`, `dashboard.alertas(sucursalId)` |
| `useEliminarResueltas` | `useAlertas.ts` | `alertas.all()` (prefix match todo lo que empiece con `['alertas']`), `dashboard.alertas(sucursalId)` |

**Importante:** `queryKeys.alertas.all()` es `['alertas']` y **NO** toca `['dashboard', 'alertas']` — son dos rutas de prefix distintas. Siempre invalidar ambas explícitamente.

#### Empleados

| Mutación | Archivo | Invalida |
|---|---|---|
| `useCrearEmpleado` | `useEmpleados.ts` | `empleados.lista(sucursalId)`, `empleados.kpis(sucursalId)`, `['reportes', 'empleados']`, `transacciones.operadores(sucursalId)` |
| `useActualizarEmpleado` | `useEmpleados.ts` | optimistic lista + detalle (con helper `permisosActualizados`), `empleados.kpis`, `empleados.detalle(id)`, `['reportes', 'empleados']`, `transacciones.operadores(sucursalId)` |
| `useToggleEmpleadoActivo` | `useEmpleados.ts` | mismas que `useActualizarEmpleado` |
| `useEliminarEmpleado` | `useEmpleados.ts` | optimistic lista, `empleados.kpis`, `removeQueries(empleados.detalle(id))`, `['reportes', 'empleados']`, `transacciones.operadores(sucursalId)` |
| `useActualizarHorarios` | `useEmpleados.ts` | optimistic `empleados.detalle(id)`, `empleados.detalle(id)` |
| `useRevocarSesion` | `useEmpleados.ts` | — (acción pura: `EmpleadoDetalle` no tiene campo `sessionActiva`) |

#### Reportes

**Read-only:** sin mutaciones propias. Todas las invalidaciones hacia `['reportes', ...]` vienen desde los módulos que producen los datos (ver arriba).

---

### Por query afectada

Lista inversa: para cada query "receptora", qué mutaciones la tocan. Útil al añadir una query nueva para ver qué mutaciones existentes deberían invalidarla.

| Query | Mutaciones que la invalidan |
|---|---|
| `dashboard.kpis(sucursalId, periodo)` | `useRevocarTransaccion`, `useOfertas.*` (helper) |
| `dashboard.ventas(sucursalId, periodo)` | `useRevocarTransaccion` |
| `dashboard.campanas(sucursalId)` | `useOfertas.*` (helper) |
| `dashboard.alertas(sucursalId)` | `useAlertas.*` (todas excepto `useActualizarConfiguracionAlerta`) + las 2 del `useDashboardMutaciones` |
| `transacciones.historial(sucursalId, ...)` | `useRevocarTransaccion` |
| `transacciones.kpis(sucursalId, ...)` | `useRevocarTransaccion` |
| `transacciones.operadores(sucursalId)` | `useCrearEmpleado`, `useActualizarEmpleado`, `useToggleEmpleadoActivo`, `useEliminarEmpleado` |
| `clientes.detalle(clienteId)` | `useRevocarTransaccion`, `useActualizarConfigPuntos` |
| `clientes.historial(clienteId)` | `useRevocarTransaccion` |
| `clientes.lista(sucursalId, ...)` | `useRevocarTransaccion`, `useActualizarConfigPuntos` |
| `clientes.kpis(sucursalId)` | `useRevocarTransaccion`, `useActualizarConfigPuntos` |
| `clientes.selector(sucursalId)` | `useRevocarTransaccion`, `useActualizarConfigPuntos` |
| `puntos.estadisticas(sucursalId, ...)` | `useRevocarTransaccion` |
| `puntos.configuracion()` | `useActualizarConfigPuntos` |
| `puntos.recompensas()` | `useCrearRecompensa`, `useActualizarRecompensa`, `useEliminarRecompensa` |
| `ofertas.porSucursal(sucursalId)` | `useOfertas.*` (helper) + acciones directas |
| `ofertas.clientesAsignados(ofertaId)` | `handleRevocarCupon`, `handleReactivarCupon` (inline en `PaginaOfertas.tsx`) |
| `articulos.porSucursal(sucursalId)` | `useCrearArticulo`, `useActualizarArticulo`, `useEliminarArticulo`, `useDuplicarArticulo` |
| `resenas.lista(sucursalId)` + `resenas.kpis(sucursalId)` | `useResponderResena` (optimistic) |
| `alertas.lista(sucursalId, ...)` + `alertas.kpis(sucursalId)` | las 6 mutaciones de `useAlertas.ts` |
| `alertas.configuracion(sucursalId)` | `useActualizarConfiguracionAlerta` |
| `empleados.lista/detalle/kpis` | `useCrearEmpleado`, `useActualizarEmpleado`, `useToggleEmpleadoActivo`, `useEliminarEmpleado`, `useActualizarHorarios` |
| `perfil.sucursal(sucursalId)` | `guardarTodo` (usePerfil.ts), `TabImagenes` (todas las operaciones) |
| `['perfil', 'sucursales']` (prefix) | `guardarTodo`, `TabImagenes` |
| `negocios.detalle(sucursalId)` | `guardarTodo`, `TabImagenes` |
| `['negocios', 'lista']` (prefix) | `guardarTodo`, `TabImagenes` |
| `['negocios', 'ofertas', sucursalId]` | `useOfertas.*` (helper) |
| `['negocios', 'catalogo', negocioId]` | `useArticulos.*` (4 mutaciones) |
| `['negocios', 'resenas', sucursalId]` | `useResponderResena` |
| `['guardados', 'negocios']` | `guardarTodo`, `TabImagenes` |
| `['cardya', 'recompensas']` | `useCrearRecompensa`, `useActualizarRecompensa`, `useEliminarRecompensa` |
| `reportes.tab(sid, 'ventas', ...)` | `useRevocarTransaccion` |
| `reportes.tab(sid, 'clientes', ...)` | `useRevocarTransaccion`, `useActualizarConfigPuntos` |
| `reportes.tab(sid, 'empleados', ...)` | `useRevocarTransaccion`, `useEmpleados.*` (4 mutaciones) |
| `reportes.tab(sid, 'promociones', ...)` | `useOfertas.*` (helper) + acciones directas |
| `reportes.tab(sid, 'resenas', ...)` | `useResponderResena` |

---

### Lecciones clave del audit

#### 1. El authStore (Zustand) es una cache paralela a React Query

Algunos componentes leen datos del negocio/sucursal directamente del `useAuthStore` persistido al login: `Navbar`, `ColumnaIzquierda`, `MenuDrawer`, `SelectorSucursalesInline`. Esos datos **no están en React Query** — invalidar queries no los actualiza.

Siempre que una mutación cambie alguno de estos campos, hay que llamar `useAuthStore.getState().setUsuario({ ...actual, campo: valor })`:

- `nombreNegocio`, `correoNegocio`
- `nombreSucursalAsignada`, `correoSucursalAsignada`
- `logoNegocio`, `fotoPerfilNegocio`, `fotoPerfilSucursalAsignada`

Ver sección "Regla 9" arriba.

#### 2. React Query NO sincroniza entre pestañas

Cada pestaña del navegador tiene su propio `QueryClient` en memoria. `invalidateQueries` en la pestaña A **no toca** la caché de la pestaña B. Los fixes del audit cubren el caso **intra-pestaña** (un usuario en una sola tab), que es el flujo real del MVP.

Para casos cross-pestaña (ej: cliente con la app abierta mientras el comerciante edita desde BS en otro dispositivo) hay tres opciones posibles:
- **(A)** Bajar `staleTime` de las queries públicas a 30s — simple, más requests
- **(B)** `@tanstack/query-broadcast-client-experimental` — sincroniza caches entre pestañas vía `BroadcastChannel`
- **(C)** WebSocket push desde backend — la opción robusta (ya existe para `recompensa:stock-actualizado` y `cupon:actualizado`)

#### 3. Display bugs disfrazados de cache

No todo problema "los datos no se actualizan" es un bug de cache. A veces el componente:
- Recibe el prop correcto pero **no lo destructura** (ej: `PanelCampanas` ignoraba `totalActivas` y mostraba `campanasNoVencidas.length` limitado a 5)
- **Calcula localmente** sobre una lista limitada del backend (mismo caso)
- Muestra un mensaje **genérico** que no corresponde al contexto (ej: "Los puntos fueron devueltos" aparecía al revocar una venta cuando solo aplica a vouchers)

Al investigar un bug de sincronización, verificar primero que el componente use las fuentes de verdad correctas antes de asumir que es un problema de invalidación.

#### 4. Granularidad importa

Preferir keys parciales (`['modulo', 'subkey', sucursalId]`) sobre keys totales (`['modulo']`). El prefix match invalida todas las variantes sin tocar caches no afectadas.

```typescript
// ❌ Exagerado
qc.invalidateQueries({ queryKey: ['dashboard'] }); // toca campanas, interacciones, alertas

// ✅ Granular
qc.invalidateQueries({ queryKey: ['dashboard', 'kpis', sucursalId] });
qc.invalidateQueries({ queryKey: ['dashboard', 'ventas', sucursalId] });
```

#### 5. Mutaciones fuera de `useMutation` también deben invalidar

Durante el audit aparecieron mutaciones "sueltas" en componentes que llamaban directo a `api.post/put/delete` sin pasar por React Query (`TabImagenes.tsx`, acciones de cupones en `PaginaOfertas.tsx` y `ModalOferta.tsx`, `guardarTodo` en `usePerfil.ts`). Estas **también** tienen que invalidar sus caches — React Query no las "ve" automáticamente.

Siempre que encuentres `api.post`/`api.put`/`api.delete` en un componente, verifica qué keys afecta y agrega las `invalidateQueries` correspondientes. Excepción: llamadas de métricas fire-and-forget (ver Regla 6).

---

## staleTime vs gcTime — Diferencia

```
staleTime  2 min  →  ¿Los datos siguen siendo "frescos"? No → refetch en background al acceder
gcTime    10 min  →  ¿Cuánto tiempo guardar en caché si nadie los usa? Después → borrar
```

- `staleTime`: controla cuándo se considera que los datos necesitan actualizarse
- `gcTime`: controla cuándo se libera la memoria del caché

Flujo típico:
```
10:00  →  Entras a Transacciones, React Query fetcha
10:02  →  Navegas al Dashboard (datos en caché, aún frescos)
10:02  →  Vuelves a Transacciones → datos instantáneos del caché, NO fetcha
10:03  →  Navegas al Dashboard
10:05  →  Vuelves a Transacciones → datos "stale", muestra caché + fetcha en background
10:15  →  Ningún componente usa los datos por 10 min → gcTime expira → caché borrado
```

---

## Módulos Migrados

| Módulo | Hook | Store | Estado |
|---|---|---|---|
| Dashboard (BS) | `hooks/queries/useDashboard.ts` | `useDashboardStore.ts` (solo periodo) | ✅ |
| Transacciones (BS) | `hooks/queries/useTransacciones.ts` | `useTransaccionesStore.ts` (solo filtros UI) | ✅ |
| Clientes (BS) | `hooks/queries/useClientes.ts` | `useClientesStore.ts` (solo filtros UI) | ✅ |
| Opiniones (BS) | `hooks/queries/useResenas.ts` | *(eliminado)* | ✅ |
| Alertas (BS) | `hooks/queries/useAlertas.ts` | `useAlertasStore.ts` (solo filtros UI) | ✅ |
| Catálogo (BS) | `hooks/queries/useArticulos.ts` | *(eliminado)* | ✅ |
| Promociones (BS) | `hooks/queries/useOfertas.ts` | *(eliminado)* | ✅ |
| Puntos (BS) | `hooks/queries/usePuntos.ts` | `usePuntosStore.ts` (solo periodo) | ✅ |
| Empleados (BS) | `hooks/queries/useEmpleados.ts` | *(eliminado)* | ✅ |
| Mi Perfil (BS) | `hooks/queries/usePerfil.ts` | *(no aplica — hook local de formulario)* | ✅ |

**Secciones públicas migradas:**

| Módulo | Hook | Store | Estado |
|---|---|---|---|
| Negocios (lista + perfil) | `hooks/queries/useNegocios.ts` | `useNegociosCacheStore.ts` *(eliminado)* | ✅ |
| CardYA | `hooks/queries/useCardYA.ts` | `useCardyaStore.ts` *(eliminado)* | ✅ |
| Mis Cupones | `hooks/queries/useMisCupones.ts` | `useMisCuponesStore.ts` *(eliminado)* | ✅ |
| Mis Guardados | `hooks/queries/useMisGuardados.ts` | *(no tenía store)* | ✅ |

**Componentes adicionales migrados:**
- `ModalDuplicar.tsx` y `ModalDuplicarOferta.tsx` → `usePerfilSucursales()` (caché sucursales)
- `ModalOferta.tsx` → `useClientesSelector()` + `useClientesAsignados()` (caché clientes)
- `ColumnaIzquierda.tsx` → `useDashboard('hoy')` (caché KPIs sidebar)
- `TabInformacion.tsx` → `usePerfilCategorias()` + `usePerfilSubcategorias()` (caché categorías)
- `PaginaNegocios.tsx` → `usePerfilCategorias()` + `usePerfilSubcategorias()` (caché categorías)
- `CardNegocio.tsx` + `CardNegocioDetallado.tsx` → `useNegocioPrefetch()` (prefetch con queryClient)
- `Navbar.tsx` → `prefetchLista` (pre-carga negocios en hover)
- `SelectorSucursalesInline.tsx` → `usePerfilSucursales()` (caché sucursales)
- `PanelPreviewNegocio.tsx` → `usePerfilSucursal()` (caché compartida con Mi Perfil)
- `WidgetCardYA.tsx` → `useCardYABilleteras()` (caché billeteras)
- `CarouselCupones.tsx` → `useMisCuponesLista()` (caché cupones)

**Sockets restaurados con React Query:**
- `useCardYASocket()` → `recompensa:stock-actualizado` → invalida recompensas
- `useMisCuponesSocket()` → `cupon:actualizado` → invalida lista de cupones

## Módulos Pendientes de Migrar

Evaluar caso por caso: ChatYA (WebSockets), ScanYA (modo quiosco), Onboarding

---

## Checklist de Migración por Módulo

Al migrar un módulo, verificar que se completaron todos estos pasos:

- [ ] Crear `hooks/queries/useNombreModulo.ts` con hooks para cada tipo de dato
- [ ] Agregar `placeholderData: keepPreviousData` a TODAS las queries con filtros variables
- [ ] Agregar query key en `config/queryKeys.ts`
- [ ] Simplificar el store — eliminar todo dato del servidor
- [ ] Eliminar `useEffect` de carga inicial en la página
- [ ] Eliminar `useEffect` de recarga por sucursal (lo maneja el query key)
- [ ] Agregar `useEffect(() => () => limpiar(), [limpiar])` en la página
- [ ] Reemplazar `cargarMas()` con `query.fetchNextPage()` en botones y observers
- [ ] Eliminar referencias obsoletas al store en otros componentes (modales, overlays)
- [ ] Verificar invalidación cruzada: ¿qué otros módulos muestran estos mismos datos?
- [ ] Buscar `api.post/put/delete` en componentes del módulo — todas deben invalidar caché
- [ ] Correr `tsc --noEmit` — zero errores
- [ ] Verificar en el navegador: filtros no causan temblor, datos cargan correctamente

---

## Antipatrones — Lo que NO hacer

```typescript
// ❌ Datos del servidor en Zustand
const useClientesStore = create(() => ({
  clientes: [],           // ← NO
  cargando: false,        // ← NO
  cargarClientes: async () => { ... }, // ← NO
}));

// ❌ useEffect para cargar datos
useEffect(() => {
  cargarKPIs();
  cargarHistorial();
}, [sucursalActiva]); // ← NO — React Query lo hace automáticamente

// ❌ Query sin keepPreviousData cuando tiene filtros
useQuery({
  queryKey: ['clientes', sucursalId, filtros],
  queryFn: ...,
  // sin placeholderData ← causa temblor al filtrar
});

// ❌ sucursalId pasado manualmente al service
moduloService.getLista(sucursalId, filtros); // ← el interceptor ya lo agrega

// ✅ Correcto
moduloService.getLista(filtros); // sucursalId va automáticamente vía interceptor
```

---

## Auditoría de Caché

Se han realizado dos rondas de auditoría completa de sincronización de caché:

**Ronda 1 (auditoría inicial de migración):** revisó las 30 mutaciones en hooks de RQ y ~50 escrituras externas. Se encontraron y corrigieron 7 problemas de invalidación.
**Reporte:** `docs/reportes/audit-react-query-completo-abril-2026.md`

**Ronda 2 (audit cross-módulo):** revisó los 11 módulos BS de forma sistemática buscando dos clases de bugs:
1. **Bug clásico:** mutación con optimistic en la lista pero no en el detalle → modal stale tras la mutación
2. **Bug cross-módulo:** mutación cambia datos que otro módulo cachea pero no invalida sus queries

Resultado: la mayoría de huecos eran cross-módulo. Se extrajeron lecciones sobre `useAuthStore` como cache paralela, limitaciones cross-pestaña de React Query, y display bugs disfrazados de cache. Todos los fixes están reflejados en la sección [Mapa de Invalidaciones Cross-Módulo](#mapa-de-invalidaciones-cross-módulo) arriba.

**Antes de agregar una nueva mutación:**
1. Consulta el mapa para ver el patrón de un módulo similar
2. Usa la tabla "Por query afectada" para descubrir qué caches pueden quedar stale
3. Si tocas algún campo del `useAuthStore`, sincronízalo con `setUsuario(...)` además de invalidar queries
4. Si encuentras una query nueva que depende de datos de otro módulo, actualiza este mapa
