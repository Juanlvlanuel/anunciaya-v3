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
