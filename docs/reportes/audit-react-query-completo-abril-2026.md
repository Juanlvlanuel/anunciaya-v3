# Audit React Query — Reporte Completo

> **Periodo:** 9-11 de Abril 2026
> **Autor:** Claude Code (Opus 4.6)
> **Solicitado por:** Juan (solo developer)
> **Alcance:** 11 modulos BS + secciones publicas + limpieza ScanYA legacy + drizzle-kit
> **Estado:** Completado

---

## Configuracion Global

| Parametro | Valor | Archivo |
|---|---|---|
| staleTime | 2 min | `config/queryClient.ts` |
| gcTime | 10 min | `config/queryClient.ts` |
| refetchOnWindowFocus | false | `config/queryClient.ts` |
| refetchOnReconnect | true | `config/queryClient.ts` |
| retry | 1 | `config/queryClient.ts` |

Query keys centralizadas en `config/queryKeys.ts` — 13 modulos, convencion `all()/lista()/detalle()/kpis()`.

---

## Inventario de Hooks

| Archivo | useQuery | useInfiniteQuery | useMutation | Otros |
|---|---|---|---|---|
| `useDashboard.ts` | 5 | 0 | 2 | refresh manual |
| `useTransacciones.ts` | 4 | 3 | 1 | refresh manual |
| `useClientes.ts` | 4 | 1 | 0 | — |
| `useResenas.ts` | 2 | 0 | 1 | — |
| `useAlertas.ts` | 2 | 1 | 6 | — |
| `useArticulos.ts` | 1 | 0 | 4 | — |
| `usePuntos.ts` | 3 | 0 | 4 | — |
| `useOfertas.ts` | 2 | 0 | 4 | helper invalidacion |
| `useEmpleados.ts` | 2 | 1 | 6 | — |
| `usePerfil.ts` | 4 | 0 | 0 | — |
| `useNegocios.ts` | 5 | 0 | 0 | prefetch helper |
| `useCardYA.ts` | 5 | 0 | 2 | socket listener |
| `useMisCupones.ts` | 1 | 0 | 0 | socket listener |
| `useMisGuardados.ts` | 2 | 0 | 0 | — |
| **Total** | **42** | **6** | **30** | — |

---

## Ronda 1 — Escrituras fuera de React Query (9 de Abril)

Primera pasada: verificar que cada escritura al backend (`api.post/put/delete`) tenga invalidacion correcta del cache, tanto dentro de `useMutation` como en llamadas directas desde componentes.

### Fixes aplicados

| # | Problema | Archivo | Severidad |
|---|---|---|---|
| 1 | 8 operaciones de imagen sin invalidar cache | `TabImagenes.tsx` | Alta |
| 2 | Guardar/quitar guardados sin invalidar lista | `useGuardados.ts` | Alta |
| 3 | Revocar transaccion no actualizaba Dashboard | `useTransacciones.ts` | Media |
| 4 | Resolver/eliminar alerta no actualizaba Dashboard | `useAlertas.ts` | Baja |
| 5 | Editar perfil no actualizaba vista publica | `usePerfil.ts` | Baja |
| 6 | Escribir resena no actualizaba rating promedio | `PaginaPerfilNegocio.tsx` | Media-alta |
| 7 | Dejar de seguir desde Guardados no actualizaba perfil | `PaginaGuardados.tsx` | Baja |

### Escrituras que estaban correctas

| Archivo | Endpoint | Invalidacion |
|---|---|---|
| `hooks/useVotos.ts` | `POST/DELETE /votos` (like/follow) | `negocios.detalle(entityId)` + `['negocios', 'lista']` + `['guardados', 'negocios/ofertas']` |
| `pages/private/guardados/PaginaGuardados.tsx` | `DELETE guardados/oferta/:id` | `['guardados']` |
| `stores/useAuthStore.ts` | `PATCH /auth/modo` | N/A — cambia token, queries usan `sucursalActiva` en key |

### Fire-and-forget (metricas analiticas, no afectan cache)

| Archivo | Endpoint |
|---|---|
| `ModalDetalleItem.tsx` | `POST /articulos/:id/vista` |
| `ModalOfertaDetalle.tsx` | `POST /metricas/share` |
| `SeccionOfertas.tsx` | `POST /metricas/view`, `POST /metricas/click` |
| `PaginaPerfilNegocio.tsx` | `POST /metricas/view` (sucursal) |

### No aplican

| Archivo | Detalle |
|---|---|
| `useOnboardingStore.ts` | 17 llamadas a `/onboarding/*`. Flujo de setup inicial sin cache RQ activo |
| `PasoImagenes.tsx` | 4 llamadas upload/delete galeria durante onboarding. Mismo caso |
| `utils/cloudinary.ts` | Limpieza de archivos huerfanos. No modifica datos de negocio |

---

## Ronda 2 — Audit cross-modulo (11 de Abril)

Segunda pasada: verificar que las mutaciones invaliden no solo las queries de su propio modulo, sino tambien las de otros modulos que consumen los mismos datos.

Protocolo: auditar modulo por modulo, reproducir bug con el usuario, aplicar fix, validar visualmente.

### Dashboard

**Archivos:** `useDashboard.ts`, `PaginaDashboard.tsx`, `PanelCampanas.tsx`

| Fix | Detalle |
|---|---|
| `handleGuardarOferta` / `handleGuardarArticulo` | Antes llamaban al service directo. Ahora usan `useCrearOferta`, `useActualizarOferta`, `useCrearArticulo` |
| Imports limpiados | Eliminado `import articulosService` y `import useAuthStore` (sin uso) |
| `marcarAlertaLeida` / `marcarTodasLeidas` | Invalidacion cross-modulo a `['alertas', 'lista', sucursalId]` y `alertas.kpis(sucursalId)` |
| `dashboard.all()` a granular | Reemplazado por `['dashboard', 'kpis', sucursalId]` + `['dashboard', 'ventas', sucursalId]` |

### Transacciones

**Archivos:** `useTransacciones.ts`, `ModalDetalleTransaccionBS.tsx`

| Fix | Detalle |
|---|---|
| Optimistic incompleto | `onMutate` ahora incluye `motivoRevocacion: motivo` |
| No invalidaba historial | `onSuccess` invalida `['transacciones', 'historial', sucursalId]` |
| Cross-modulo Clientes | Extrae `clienteIdAfectado` del snapshot. Invalida `clientes.detalle/historial/kpis/lista/selector` |
| Cross-modulo Puntos | Invalida `['puntos', 'estadisticas', sucursalId]` |
| Cross-modulo Reportes | Invalida `['reportes', 'ventas/clientes/empleados']` |
| Texto incorrecto | "Los puntos fueron devueltos" cambiado a "Se descontaron {N} pts del saldo del cliente" |

**Validado end-to-end** con cliente "Ana Narvaez".

### Clientes

**Archivos:** `ModalDetalleCliente.tsx`

| Fix | Detalle |
|---|---|
| Display TX revocada | `FilaTransaccion` renderiza TX cancelada con tachado + badge "Revocada" |

Sin mutaciones propias — sincronizacion via `useRevocarTransaccion`.

### Mi Perfil

**Archivos:** `TabImagenes.tsx`, `perfil/hooks/usePerfil.ts`

| Fix | Detalle |
|---|---|
| Helper `invalidarCachesNegocio(actualizaAuth?)` | Invalida 5 caches + sincroniza `useAuthStore` opcionalmente |
| 8 operaciones de imagen | Todas usan el helper (antes solo invalidaban `perfil.sucursal`) |
| Logo/foto -> authStore | Sincroniza `logoNegocio`, `fotoPerfilNegocio`, `fotoPerfilSucursalAsignada` |
| `refetch()` + `guardarTodo()` | Invalida 5 caches + sincroniza `nombreNegocio`, `nombreSucursalAsignada`, `correoNegocio`, `correoSucursalAsignada` |

**Validado end-to-end** — logo en sidebar, header, Navbar, vista previa, publico, MisGuardados.

### Catalogo

**Archivos:** `useArticulos.ts`

| Fix | Detalle |
|---|---|
| 4 mutaciones + `negocioId` | Invalidan `['negocios', 'catalogo', negocioId]` |

**Bug validado** con "Orden de 3 Tacos - Cenas" ($250 -> $300).

### Promociones

**Archivos:** `useOfertas.ts`, `PaginaOfertas.tsx`, `PanelCampanas.tsx`

| Fix | Detalle |
|---|---|
| Helper `invalidarOfertasRelacionadas` | Invalida: `ofertas.porSucursal`, `dashboard.campanas`, `dashboard.kpis`, `['negocios','ofertas']`, `['reportes','promociones']` |
| `useOfertasInvalidar` (publico) | Mismo contenido — cubre acciones directas `revocarCuponMasivo`/`reactivarCuponService` |
| Revocar/reactivar cupon | Invalidan `ofertas.clientesAsignados(ofertaId)` |
| **BUG DISPLAY** `PanelCampanas` | Prop `totalActivas` no se destructuraba — mostraba `length` limitado a 5 |

**Validado end-to-end** — badge "7 Activas" correcto.

### Puntos

**Archivos:** `usePuntos.ts`

| Fix | Detalle |
|---|---|
| `useActualizarConfigPuntos` -> Clientes | Invalida `clientes.detalle/lista/kpis/selector` + `['reportes','clientes']` |
| 3 mutaciones recompensas -> CardYA | Invalidan `['cardya', 'recompensas']` |

### Opiniones

**Archivos:** `useResenas.ts`

| Fix | Detalle |
|---|---|
| `useResponderResena` | Invalida `['negocios','resenas',sucursalId]` + `['reportes','resenas']` |

### Alertas

**Archivos:** `useAlertas.ts`

| Fix | Detalle |
|---|---|
| `useMarcarAlertaLeida` | Nuevo `onSuccess` que invalida `dashboard.alertas(sucursalId)` |
| `useMarcarTodasLeidas` | Agregada invalidacion de `dashboard.alertas` |
| `useEliminarResueltas` | Agregada invalidacion de `dashboard.alertas` |

### Empleados

**Archivos:** `useEmpleados.ts`

| Fix | Detalle |
|---|---|
| 4 mutaciones -> operadores | Invalidan `transacciones.operadores(sucursalId)` |

### Reportes (audit retroactivo)

Sin archivos propios modificados — read-only. Invalidaciones desde otros modulos:

| Tab | Invalidado por |
|---|---|
| `ventas` | `useRevocarTransaccion` |
| `clientes` | `useRevocarTransaccion`, `useActualizarConfigPuntos` |
| `empleados` | `useRevocarTransaccion`, `useEmpleados.*` (4 mutaciones) |
| `promociones` | `useOfertas.*` (helper) + revocar/reactivar cupon |
| `resenas` | `useResponderResena` |

---

## Modulos publicos y compartidos (audit extendido)

| Modulo | Estado | Hallazgo |
|---|---|---|
| `useMisCupones.ts` | ✅ OK | Read-only + socket listener `cupon:actualizado` |
| `useMisGuardados.ts` | ✅ OK | Read-only, sin mutaciones |
| `PaginaGuardados.tsx` | ✅ Corregido (ronda 1) | Invalida `['guardados']`, `['negocios','lista']`, `negocios.detalle` |
| `useCardYA.ts` | ✅ OK | Invalida su propio modulo. Cross-sesion (cliente vs comerciante) no aplica intra-pestana |
| `useVotos.ts` | ✅ OK | Helper `invalidarCaches()` cubre sucursal y oferta correctamente |
| `PaginaPerfilNegocio.tsx` | ✅ Corregido (ronda 1) | Resenas invalidan `negocios.detalle` para rating promedio |

---

## Limpieza ScanYA legacy

### Decision: ScanYA no se audita para React Query

ScanYA funciona correctamente en su patron actual (service directo + state local + callback). No usa React Query. Los "bugs" detectados son inconsistencias teoricas entre dos patrones distintos (BS con cache RQ + ScanYA sin cache), no bugs operativos reales. ScanYA y BS estan unidos por el backend (fuente de verdad), no por el frontend.

### Columnas legacy eliminadas

`alertaMontoAlto` y `alertaTransaccionesHora` en tabla `scanya_configuracion` — campos que existian en BD, schema, tipos, validadores y service pero **nunca fueron usados** por el motor de alertas real (`alertas-motor.service.ts` lee de `alertas_configuracion`, no de `scanya_configuracion`). Fueron reemplazados por el sistema centralizado de Alertas BS con umbrales dinamicos.

**6 archivos editados:**

| Archivo | Cambio |
|---|---|
| `apps/api/src/db/schemas/schema.ts` | 2 definiciones de columna Drizzle eliminadas |
| `apps/api/src/validations/scanya.schema.ts` | 2 validadores Zod eliminados |
| `apps/api/src/services/scanya.service.ts` | ~8 ocurrencias eliminadas (GET + PUT) |
| `apps/api/src/controllers/scanya.controller.ts` | 2 lineas de JSDoc eliminadas |
| `apps/web/src/types/scanya.ts` | 2 campos eliminados de 2 interfaces |
| `docs/arquitectura/ScanYA.md` | Actualizado |

**Migracion BD aplicada** en PGAdmin (dev) y Supabase (prod):
```sql
ALTER TABLE scanya_configuracion
    DROP COLUMN IF EXISTS alerta_monto_alto,
    DROP COLUMN IF EXISTS alerta_transacciones_hora;
```

### Limpieza drizzle-kit

El proyecto nunca uso drizzle-kit (herramienta de migraciones automaticas). Las migraciones se manejan manualmente con SQL en PGAdmin/Supabase. Eliminados todos los artefactos:

| Eliminado | Que era |
|---|---|
| `apps/api/drizzle.config.ts` | Config de drizzle-kit |
| `apps/api/src/db/schemas/0000_little_mongu.sql` | Migracion inicial (88KB) |
| `apps/api/src/db/schemas/0001_orange_peter_parker.sql` | Migracion vacia (placeholder) |
| `apps/api/src/db/schemas/meta/` (carpeta) | Journal + 2 snapshots |
| `drizzle-kit` en devDependencies | Dependencia npm |

**Conservados:** `schema.ts` y `relations.ts` (necesarios para Drizzle ORM en runtime).

---

## Lecciones tecnicas

1. **`useAuthStore` es una cache paralela a React Query.** Navbar, ColumnaIzquierda, MenuDrawer y SelectorSucursalesInline leen datos del store de Zustand persistido al login. Invalidar queries no basta — hay que hacer `setUsuario(...)` tambien.

2. **React Query NO sincroniza entre pestanas.** Cada tab tiene su propio `QueryClient`. Opciones futuras: (A) bajar staleTime a 30s; (B) `@tanstack/query-broadcast-client-experimental`; (C) WebSocket push.

3. **Display bugs disfrazados de cache.** `PanelCampanas` ignoraba prop `totalActivas`. `ModalDetalleTransaccionBS` mostraba texto de vouchers al revocar ventas. Verificar fuentes de verdad antes de asumir problema de invalidacion.

4. **Invalidaciones granulares.** Preferir `['modulo', 'subkey', sucursalId]` (prefix match) sobre `['modulo']` (invalida todo).

5. **ScanYA y BS estan unidos por el backend, no por el frontend.** No necesitan compartir cache.

6. **drizzle-kit no es Drizzle ORM.** El ORM solo necesita `schema.ts` y `relations.ts`. Los artefactos de drizzle-kit son para una CLI que el proyecto nunca uso.

---

## Observaciones positivas

- **Patron optimista bien implementado:** 20+ mutaciones con `onMutate` -> snapshot -> rollback. Destaca useAlertas (6 mutaciones) y useEmpleados (helper `permisosActualizados`).
- **Keys centralizadas:** `queryKeys.ts` evita colisiones y facilita invalidaciones granulares.
- **Socket listeners:** CardYA y MisCupones escuchan eventos del servidor para invalidar cache en tiempo real.
- **Prefetch:** useNegocios pre-carga datos en hover para navegacion instantanea.
- **placeholderData:** Todos los hooks con filtros variables usan `keepPreviousData`.

---

## Estadisticas

| Metrica | Valor |
|---|---|
| Modulos BS auditados | 11/11 |
| Archivos de codigo modificados | ~25 |
| Archivos documentacion creados/actualizados | 5 |
| Bugs de cache corregidos | ~30 invalidaciones cross-modulo + 7 escrituras externas |
| Bugs de display encontrados y corregidos | 3 |
| Codigo legacy eliminado | 2 columnas BD + 6 archivos drizzle-kit |
| Typecheck errores introducidos | 0 |
| ESLint warnings nuevos introducidos | 0 |
| Bugs validados end-to-end con el usuario | 5 |

---

## Archivos modificados — lista completa

### Hooks de React Query

- `apps/web/src/hooks/queries/useDashboard.ts`
- `apps/web/src/hooks/queries/useTransacciones.ts`
- `apps/web/src/hooks/queries/useArticulos.ts`
- `apps/web/src/hooks/queries/useOfertas.ts`
- `apps/web/src/hooks/queries/usePuntos.ts`
- `apps/web/src/hooks/queries/useResenas.ts`
- `apps/web/src/hooks/queries/useAlertas.ts`
- `apps/web/src/hooks/queries/useEmpleados.ts`

### Paginas y componentes BS

- `apps/web/src/pages/private/business-studio/dashboard/PaginaDashboard.tsx`
- `apps/web/src/pages/private/business-studio/dashboard/componentes/PanelCampanas.tsx`
- `apps/web/src/pages/private/business-studio/transacciones/ModalDetalleTransaccionBS.tsx`
- `apps/web/src/pages/private/business-studio/clientes/ModalDetalleCliente.tsx`
- `apps/web/src/pages/private/business-studio/ofertas/PaginaOfertas.tsx`
- `apps/web/src/pages/private/business-studio/perfil/hooks/usePerfil.ts`
- `apps/web/src/pages/private/business-studio/perfil/components/TabImagenes.tsx`

### Backend (limpieza ScanYA)

- `apps/api/src/db/schemas/schema.ts`
- `apps/api/src/validations/scanya.schema.ts`
- `apps/api/src/services/scanya.service.ts`
- `apps/api/src/controllers/scanya.controller.ts`
- `apps/api/package.json`

### Frontend (limpieza ScanYA)

- `apps/web/src/types/scanya.ts`

### Documentacion

- `docs/estandares/PATRON_REACT_QUERY.md`
- `docs/estandares/LECCIONES_TECNICAS.md`
- `docs/arquitectura/ScanYA.md`
- `docs/CHANGELOG.md`
- `docs/reportes/audit-react-query-completo-abril-2026.md` (este archivo)
- `docs/reportes/migracion-scanya-drop-legacy-alerts.sql`

### Archivos eliminados

- `apps/api/drizzle.config.ts`
- `apps/api/src/db/schemas/0000_little_mongu.sql`
- `apps/api/src/db/schemas/0001_orange_peter_parker.sql`
- `apps/api/src/db/schemas/meta/_journal.json`
- `apps/api/src/db/schemas/meta/0000_snapshot.json`
- `apps/api/src/db/schemas/meta/0001_snapshot.json`
