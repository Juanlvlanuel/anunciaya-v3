# Auditoría de Sincronización de Caché — React Query

**Fecha:** 9 de Abril de 2026
**Estado:** Completada — todos los hallazgos corregidos
**Alcance:** Todos los hooks de React Query + escrituras fuera de RQ en Business Studio, secciones públicas y hooks compartidos
**Archivos auditados:** 14 hooks en `hooks/queries/`, 4 hooks compartidos, ~20 componentes/stores/páginas

---

## Qué se auditó

Se verificó que **cada escritura al backend** (crear, editar, eliminar) desde el frontend tenga correcta **invalidación del caché de React Query**, para que la UI siempre muestre datos frescos — no solo en el módulo donde ocurrió el cambio, sino también en otros módulos que consumen los mismos datos (invalidación cruzada).

La auditoría cubrió 3 áreas:

1. **30 mutaciones** (`useMutation`) dentro de los 14 hooks de `hooks/queries/` — verificando `onMutate` (optimista), `onError` (rollback) y `onSuccess` (invalidación)
2. **~50 llamadas directas `api.post/put/delete`** fuera de React Query — en componentes, stores y hooks compartidos
3. **Relaciones cross-módulo** — por ejemplo: revocar transacción → Dashboard, escribir reseña → rating promedio del negocio, editar perfil → vista pública

Se realizaron **3 pasadas completas** con re-verificación de cada hallazgo antes de corregir.

---

## Configuración Global

| Parámetro | Valor | Archivo |
|---|---|---|
| staleTime | 2 min | `config/queryClient.ts` |
| gcTime | 10 min | `config/queryClient.ts` |
| refetchOnWindowFocus | false | `config/queryClient.ts` |
| refetchOnReconnect | true | `config/queryClient.ts` |
| retry | 1 | `config/queryClient.ts` |

Query keys centralizadas en `config/queryKeys.ts` — 13 módulos, convención `all()/lista()/detalle()/kpis()`.

---

## 1. Inventario de Hooks

### hooks/queries/ — 14 archivos

| Archivo | useQuery | useInfiniteQuery | useMutation | Otros |
|---|---|---|---|---|
| `useDashboard.ts` | 5 | 0 | 2 | refresh manual |
| `useTransacciones.ts` | 4 | 3 | 1 | refresh manual |
| `useClientes.ts` | 4 | 1 | 0 | — |
| `useResenas.ts` | 2 | 0 | 1 | — |
| `useAlertas.ts` | 2 | 1 | 6 | — |
| `useArticulos.ts` | 1 | 0 | 4 | — |
| `usePuntos.ts` | 3 | 0 | 4 | — |
| `useOfertas.ts` | 2 | 0 | 4 | helper invalidación |
| `useEmpleados.ts` | 2 | 1 | 6 | — |
| `usePerfil.ts` | 4 | 0 | 0 | — |
| `useNegocios.ts` | 5 | 0 | 0 | prefetch helper |
| `useCardYA.ts` | 5 | 0 | 2 | socket listener |
| `useMisCupones.ts` | 1 | 0 | 0 | socket listener |
| `useMisGuardados.ts` | 2 | 0 | 0 | — |
| **Total** | **42** | **6** | **30** | — |

---

## 2. Análisis de Mutaciones (30 total)

### useDashboard — 2 mutaciones

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `marcarAlertaLeida` | — | — | `dashboard.alertas` | ✅ |
| `marcarTodasLeidas` | — | — | `dashboard.alertas` | ✅ |

### useTransacciones — 1 mutación

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `useRevocarTransaccion` | Optimista: marca `cancelado` en historial | Rollback con snapshot | `transacciones.kpis` + `dashboard.all()` | ✅ Corregido |

### useResenas — 1 mutación

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `useResponderResena` | Optimista: lista + KPIs | Rollback ambos snapshots | `setQueryData` con dato real | ✅ |

### useAlertas — 6 mutaciones

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `useMarcarAlertaLeida` | Optimista: lista + KPIs | Rollback ambos | — (optimista suficiente) | ✅ |
| `useMarcarAlertaResuelta` | Optimista: lista | Rollback | `alertas.kpis` + `dashboard.alertas` | ✅ Corregido |
| `useMarcarTodasLeidas` | — | — | `setQueryData` lista + KPIs | ✅ |
| `useActualizarConfiguracionAlerta` | Optimista | Rollback | — (optimista suficiente) | ✅ |
| `useEliminarAlerta` | Optimista: filtrar | Rollback | `alertas.kpis` + `dashboard.alertas` | ✅ Corregido |
| `useEliminarResueltas` | — | — | `alertas.all()` | ✅ |

### useArticulos — 4 mutaciones

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `useCrearArticulo` | Optimista | Rollback | `articulos.porSucursal` | ✅ |
| `useActualizarArticulo` | Optimista | Rollback | `articulos.porSucursal` | ✅ |
| `useEliminarArticulo` | Optimista | Rollback | `articulos.porSucursal` | ✅ |
| `useDuplicarArticulo` | Optimista parcial | Rollback | Invalida TODAS las sucursales destino + actual | ✅ |

### usePuntos — 4 mutaciones

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `useActualizarConfigPuntos` | Optimista | Rollback | `setQueryData` con respuesta real | ✅ |
| `useCrearRecompensa` | Optimista | Rollback | `setQueryData` reemplaza temporal | ✅ |
| `useActualizarRecompensa` | Optimista | Rollback | `setQueryData` con respuesta real | ✅ |
| `useEliminarRecompensa` | Optimista | Rollback | — (optimista ya removió) | ✅ |

### useOfertas — 4 mutaciones

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `useCrearOferta` | Optimista | Rollback | `ofertas.porSucursal` | ✅ |
| `useActualizarOferta` | Optimista | Rollback | `ofertas.porSucursal` | ✅ |
| `useEliminarOferta` | Optimista | Rollback | `ofertas.porSucursal` | ✅ |
| `useDuplicarOferta` | Optimista parcial | Rollback | Invalida TODAS las sucursales destino + actual | ✅ |

### useEmpleados — 6 mutaciones

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `useCrearEmpleado` | — | notificar.error | `empleados.lista` + `empleados.kpis` | ✅ |
| `useActualizarEmpleado` | Optimista lista | Rollback | `empleados.kpis` + `empleados.detalle(id)` | ✅ |
| `useToggleEmpleadoActivo` | Optimista | Rollback | `empleados.kpis` | ✅ |
| `useEliminarEmpleado` | Optimista | Rollback | `empleados.kpis` | ✅ |
| `useActualizarHorarios` | — | notificar.error | `empleados.detalle(id)` | ✅ |
| `useRevocarSesion` | — | notificar.error | — (no cambia datos visibles) | ✅ |

### useCardYA — 2 mutaciones

| Mutación | onMutate | onError | onSuccess | Veredicto |
|---|---|---|---|---|
| `useCanjearRecompensa` | Optimista: billeteras + recompensas | Rollback ambos | `billeteras` + `recompensas` + `vouchers` | ✅ |
| `useCancelarVoucher` | Optimista: vouchers + billeteras | Rollback | `billeteras` + `recompensas` + `vouchers` | ✅ |

---

## 3. Escrituras Fuera de React Query

### Escrituras corregidas

#### TabImagenes.tsx — 8 operaciones (Fix 1)

| Endpoint | Qué hace |
|---|---|
| `POST /negocios/:id/logo` | Subir logo |
| `POST /negocios/sucursal/:id/foto-perfil` | Subir foto perfil |
| `POST /negocios/:id/portada` | Subir portada |
| `POST /negocios/:id/galeria` | Agregar imagen galería |
| `DELETE /negocios/:id/galeria/:id` | Eliminar imagen galería |
| `DELETE /negocios/:id/logo` | Eliminar logo |
| `DELETE /negocios/sucursal/:id/foto-perfil` | Eliminar foto perfil |
| `DELETE /negocios/:id/portada` | Eliminar portada |

**Problema:** El componente actualizaba estado local (`setDatosImagenes`) pero NO invalidaba `perfil.sucursal` de React Query. Si el usuario navegaba fuera del perfil y volvía dentro del staleTime (2 min), veía datos cacheados sin las imágenes actualizadas.

**Corrección:** Se agregó `useQueryClient` + `queryKeys` y se invalida `perfil.sucursal(sucursalActiva)` después de cada operación exitosa.

#### useGuardados.ts — 2 operaciones (Fix 2)

| Endpoint | Qué hace |
|---|---|
| `POST /guardados` | Guardar oferta/rifa |
| `DELETE /guardados/:type/:id` | Quitar de guardados |

**Problema:** El hook usaba actualización optimista local (useState) pero NO invalidaba las queries de `useMisGuardados.ts`. La página "Mis Guardados" mostraba la lista anterior hasta que expirara el staleTime.

**Corrección:** Se agregó `useQueryClient` y se invalida `['guardados']` después de cada operación exitosa.

#### useRevocarTransaccion — cross-módulo (Fix 3)

**Problema:** Al revocar una venta, se invalidaban `transacciones.kpis` pero NO `dashboard.kpis`/`dashboard.ventas`. El Dashboard mostraba KPIs desactualizados hasta que expirara el staleTime.

**Verificación adicional:** La revocación solo aplica a ventas — la UI lo impide para cupones (`puedeRevocar = !esCupon` en `ModalDetalleTransaccionBS.tsx:198`), por lo que `kpisCupones` y `kpisCanjes` NO necesitan invalidación.

**Corrección:** Se agregó `queryKeys.dashboard.all()` al `onSuccess` de `useRevocarTransaccion`.

#### useMarcarAlertaResuelta y useEliminarAlerta — cross-módulo (Fix 4)

**Problema:** Ambas mutaciones invalidaban `alertas.kpis` pero no `dashboard.alertas`. El widget de alertas del Dashboard usa una query key diferente (`queryKeys.dashboard.alertas(sucursalId)`) con staleTime de 30s.

**Corrección:** Se agregó `queryKeys.dashboard.alertas(sucursalId)` al `onSuccess` de ambas mutaciones.

#### usePerfil guardarTodo — cross-módulo (Fix 5)

**Problema:** `refetch()` invalidaba `perfil.sucursal(sucursalActiva)` pero no `negocios.detalle(sucursalActiva)`. Ambas queries consumen el mismo endpoint (`/negocios/sucursal/:id`) pero con keys distintas. Si el dueño editaba en BS y luego veía su negocio en modo personal, veía datos viejos por hasta 5 min.

**Corrección:** Se agregó `queryKeys.negocios.detalle(sucursalActiva)` al callback `refetch`.

#### PaginaPerfilNegocio.tsx — reseñas (Fix 6)

**Problema:** `onEnviarResena` y `onEditarResena` invalidaban `['negocios', 'resenas', sucursalId]` pero NO `negocios.detalle(sucursalId)`. El tipo `NegocioCompleto` incluye `calificacionPromedio` y `totalCalificaciones` que cambian con cada reseña. El usuario escribía una reseña y el rating promedio en el header de la misma página no se actualizaba.

**Severidad:** Media-alta. Visible inmediatamente en la misma página.

**Corrección:** Se agregó `queryKeys.negocios.detalle(sucursalId!)` al `onSuccess` de ambos callbacks.

#### PaginaGuardados.tsx — dejar de seguir (Fix 7)

**Problema:** Al eliminar negocios seguidos desde "Mis Guardados", se llamaba `api.delete('votos/sucursal/:id/follow')` y se invalidaba `['guardados']`, pero NO `negocios.detalle` ni `['negocios', 'lista']`. Si el usuario navegaba después al perfil del negocio, el botón "Siguiendo" aparecía activo.

**Severidad:** Baja. Requiere navegar al perfil del negocio deseguido dentro de los 5 min de staleTime.

**Corrección:** Se agregó invalidación de `['negocios', 'lista']` y `queryKeys.negocios.detalle(n.sucursalId)` por cada negocio afectado, solo cuando `tabActivo === 'negocios'`.

### Escrituras que estaban correctas desde el inicio

| Archivo | Endpoint | Invalidación |
|---|---|---|
| `hooks/useVotos.ts` | `POST/DELETE /votos` (like/follow) | `negocios.detalle(entityId)` + `['negocios', 'lista']` + `['guardados', 'negocios/ofertas']` |
| `pages/private/guardados/PaginaGuardados.tsx` | `DELETE guardados/oferta/:id` | `['guardados']` |
| `stores/useAuthStore.ts` | `PATCH /auth/modo` | N/A — cambia token, queries usan `sucursalActiva` en key → keys cambian → fresh fetch |

### Fire-and-forget (métricas analíticas, no afectan caché)

| Archivo | Endpoint |
|---|---|
| `ModalDetalleItem.tsx` | `POST /articulos/:id/vista` |
| `ModalOfertaDetalle.tsx` | `POST /metricas/share` |
| `SeccionOfertas.tsx` | `POST /metricas/view` |
| `SeccionOfertas.tsx` | `POST /metricas/click` |
| `PaginaPerfilNegocio.tsx` | `POST /metricas/view` (sucursal) |

### No aplican (Onboarding — flujo de setup sin caché RQ activo)

| Archivo | Detalle |
|---|---|
| `useOnboardingStore.ts` | 17 llamadas (`POST`/`PATCH` a `/onboarding/*`). Son pasos del setup inicial del negocio. No hay datos en caché de React Query durante el onboarding. |
| `PasoImagenes.tsx` | 4 llamadas (upload/delete galería durante onboarding). Mismo caso. |

### No aplican (utilidades de limpieza)

| Archivo | Detalle |
|---|---|
| `utils/cloudinary.ts` | `POST /cloudinary/delete` y `/delete-multiple`. Limpieza de archivos huérfanos. No modifica datos de negocio. |

---

## 4. Resumen de Hallazgos y Correcciones

| # | Problema | Archivo | Severidad | Estado |
|---|---|---|---|---|
| 1 | 8 operaciones de imagen sin invalidar caché | `TabImagenes.tsx` | Alta | ✅ Corregido |
| 2 | Guardar/quitar guardados sin invalidar lista | `useGuardados.ts` | Alta | ✅ Corregido |
| 3 | Revocar transacción no actualizaba Dashboard | `useTransacciones.ts` | Media | ✅ Corregido |
| 4 | Resolver/eliminar alerta no actualizaba Dashboard | `useAlertas.ts` | Baja | ✅ Corregido |
| 5 | Editar perfil no actualizaba vista pública | `usePerfil.ts` | Baja | ✅ Corregido |
| 6 | Escribir reseña no actualizaba rating promedio | `PaginaPerfilNegocio.tsx` | Media-alta | ✅ Corregido |
| 7 | Dejar de seguir desde Guardados no actualizaba perfil | `PaginaGuardados.tsx` | Baja | ✅ Corregido |

**Antes de la auditoría:** 30 mutaciones en hooks + ~50 escrituras externas. 14 escrituras con problemas de invalidación.
**Después de la auditoría:** 7 fixes aplicados, 0 problemas pendientes, compilación TypeScript limpia.

---

## 5. Observaciones Positivas

- **Patrón optimista bien implementado:** 20+ mutaciones con `onMutate` → snapshot → rollback. Destaca useAlertas (6 mutaciones) y useArticulos/useOfertas (duplicación multi-sucursal).
- **Keys centralizadas:** `queryKeys.ts` evita colisiones y facilita invalidaciones granulares.
- **Socket listeners:** CardYA y MisCupones escuchan eventos del servidor para invalidar caché en tiempo real.
- **Prefetch:** useNegocios pre-carga datos en hover para navegación instantánea.
- **placeholderData:** Todos los hooks con filtros variables usan `keepPreviousData` para evitar parpadeo.
- **ScanYA aislado:** Opera con auth propio y Zustand, sin compartir contexto React Query con BS. Los datos de BS se refrescan por staleTime cuando el dueño navega a esos módulos. Esto es correcto por diseño.
