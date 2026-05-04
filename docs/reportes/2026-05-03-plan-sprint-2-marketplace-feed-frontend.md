# Cierre — Sprint 2 MarketPlace: Feed (Frontend)

> **Fecha inicio:** 03 Mayo 2026
> **Fecha cierre:** 03 Mayo 2026
> **Tipo:** Plan + avance + cierre del sprint
> **Sprint:** MarketPlace v1 · Sprint 2/8
> **Prompt origen:** `docs/prompts Marketplace/Sprint-2-Feed-Frontend.md`
> **Documento maestro:** `docs/arquitectura/MarketPlace.md` (§8 P1 — Feed)
> **Sprint anterior:** [Sprint 1 — Backend Base](2026-05-03-plan-sprint-1-marketplace-backend-base.md) ✅ cerrado
> **Estado actual:** 🟢 Sprint 2 cerrado — 7/7 bloques completos

## Decisiones finales (5 preguntas resueltas)

1. **Guard:** `ModoPersonalEstrictoGuard` nuevo. NO tocar `ModoGuard` existente (mantiene auto-cambio para CardYA/ScanYA/Mis Publicaciones).
2. **`expiraAt` Postgres:** helper `parsearFechaPostgres` en frontend. Backend del Sprint 1 estable, no se toca.
3. **CTA "+ Publicar":** `notificar.info('Próximamente podrás publicar tus artículos')` — mensaje user-facing, sin términos técnicos como "Sprint 4".
4. **GPS sin permiso:** mensaje accionable invitando a activar ubicación con botón "Activar ubicación". Si el usuario no la activa, mostrar solo "Recién publicado" (sin "Cerca de ti").
5. **Verificación visual:** arranco dev server al final y paso screenshots móvil + desktop al usuario.

---

## Avance por bloque

| # | Bloque | Estado | Verificación |
|---|---|---|---|
| 1 | Tipos compartidos + extensión `useGuardados` | ✅ Completado | `tsc --noEmit` exit=0 |
| 2 | Hook React Query `useMarketplaceFeed` | ✅ Completado | `tsc --noEmit` exit=0 |
| 3 | Componente `CardArticulo` | ✅ Completado | `tsc --noEmit` exit=0 |
| 4 | Página `PaginaMarketplace` con header dark teal | ✅ Completado | Screenshot móvil + desktop OK |
| 5 | `OverlayBuscador` placeholder | ✅ Completado | Renderiza, abre/cierra OK |
| 6 | Guard nuevo + routing | ✅ Completado | Redirección a `/inicio` verificada en runtime |
| 7 | Verificación responsive y QA | ✅ Completado | Screenshots móvil + desktop + snapshot accesibilidad |

---

## Contexto

Sprint 1 dejó el backend base funcionando (CRUD de artículos, feed por ciudad, validación de modo Personal en backend, 10/10 casos E2E pasando). Este sprint construye el **feed visual** que ve el comprador al entrar a `/marketplace`.

El sprint cubre **solo el feed**:
- Header dark sticky con identidad teal.
- Carrusel "Recién publicado" + grid "Cerca de ti".
- Cards estilo B (imagen arriba + bloque blanco abajo).
- Botón ❤️ guardar funcional.
- Guard de modo Personal con bloqueo total (no auto-cambio).
- Routing y guards.

NO entran (van en sprints siguientes):
- Detalle del artículo (Sprint 3)
- Wizard de publicar (Sprint 4)
- Buscador funcional (Sprint 6)
- Perfil del vendedor (Sprint 5)
- Sistema de niveles (Sprint 8)

---

## Hallazgos previos del codebase (que ajustan el alcance)

### 1. `ModoGuard` actual hace lo opuesto a lo que pide MarketPlace

Hoy en [apps/web/src/router/guards/ModoGuard.tsx:116](apps/web/src/router/guards/ModoGuard.tsx:116), si la ruta requiere Personal y el usuario está en Comercial, **cambia automáticamente a Personal**. El doc maestro de MarketPlace (§5) y el prompt del Sprint 2 piden lo contrario: **redirigir a `/inicio` con `notificar.info('MarketPlace solo está disponible en modo Personal')`** (bloqueo total, no auto-cambio).

**Propuesta:** crear un guard nuevo `ModoPersonalEstrictoGuard` específico para MarketPlace. Recomiendo esta opción frente a agregar prop `comportamiento` a `ModoGuard` porque:
- Es más explícita.
- No rompe el comportamiento actual de `/cardya`, `/scanya`, `/mis-publicaciones` que sí usan auto-cambio.
- Más fácil de auditar visualmente en el router.

### 2. `useGuardados` no soporta `'articulo_marketplace'`

El tipo `EntityType` en [apps/web/src/hooks/useGuardados.ts:46](apps/web/src/hooks/useGuardados.ts:46) es `'oferta' | 'servicio'`. Hay que extenderlo a `'oferta' | 'servicio' | 'articulo_marketplace'`. **El backend ya lo soporta** (lo agregamos en Sprint 1 al check de la BD).

### 3. `PaginaMarketplace` ya existe como placeholder

En [apps/web/src/router/index.tsx:81](apps/web/src/router/index.tsx:81): `const PaginaMarketplace = () => <PlaceholderPage nombre="🛒 Marketplace" />;`. Hay que reemplazar este lazy import por el componente real desde `pages/private/marketplace/PaginaMarketplace.tsx`.

### 4. La carpeta `pages/private/marketplace/` no existe aún

Hay que crearla. Tampoco existe `components/marketplace/`.

### 5. `expiraAt` viene en formato Postgres no-ISO

Backend del Sprint 1 devuelve strings como `"2026-06-02 22:27:55.194884+00"` (espacio en lugar de `T`). Esto rompe `new Date(...)` en Safari iOS. **Recomendación:** helper de parseo en el FE (`parsearFechaPostgres(s) → Date`) en lugar de tocar el backend ya estable.

---

## Bloque 1 — Tipos compartidos + extensión de `useGuardados`

**Archivo nuevo:** `apps/web/src/types/marketplace.ts`

```ts
export interface ArticuloMarketplace {
  id: string;
  usuarioId: string;
  titulo: string;
  descripcion: string;
  precio: string;
  condicion: 'nuevo' | 'seminuevo' | 'usado' | 'para_reparar';
  aceptaOfertas: boolean;
  fotos: string[];
  fotoPortadaIndex: number;
  ubicacionAproximada: { lat: number; lng: number };
  ciudad: string;
  zonaAproximada: string;
  estado: 'activa' | 'pausada' | 'vendida' | 'eliminada';
  totalVistas: number;
  totalMensajes: number;
  totalGuardados: number;
  expiraAt: string;
  createdAt: string;
  updatedAt: string;
  vendidaAt: string | null;
}

export interface ArticuloFeed extends ArticuloMarketplace {
  distanciaMetros: number | null;
}

export interface FeedMarketplace {
  recientes: ArticuloFeed[];
  cercanos: ArticuloFeed[];
}
```

**Archivo modificado:** `apps/web/src/hooks/useGuardados.ts` — extender `EntityType` con `'articulo_marketplace'`.

---

## Bloque 2 — Hook React Query

**Archivo nuevo:** `apps/web/src/hooks/queries/useMarketplace.ts`

- `useMarketplaceFeed({ ciudad, lat, lng })` → consume `GET /api/marketplace/feed`, devuelve `FeedMarketplace`.
- `staleTime: 2 * 60 * 1000` (2 min — el prompt pide diferenciar 2 min recientes y 5 min cercanos, pero como vienen del mismo endpoint en una sola request, mejor un solo staleTime; lo justifico en comentario del archivo).
- `placeholderData: keepPreviousData` (regla obligatoria de PATRON_REACT_QUERY).
- `enabled: !!ciudad && !!lat && !!lng` (no dispara hasta tener los 3).

**Archivo modificado:** `apps/web/src/config/queryKeys.ts` — agregar:
```ts
marketplace: {
  all: ['marketplace'] as const,
  feed: (filtros: { ciudad: string; lat: number; lng: number }) =>
    ['marketplace', 'feed', filtros] as const,
}
```

---

## Bloque 3 — Componente `CardArticulo`

**Archivo nuevo:** `apps/web/src/components/marketplace/CardArticulo.tsx`

**Estructura visual (estilo B):**
- Contenedor: `border-2 border-slate-300 rounded-xl shadow-md overflow-hidden bg-white` (sin glassmorphism, sin gradientes pastel).
- Imagen `aspect-square object-cover` arriba.
- Badge "Nuevo" si `Date.now() - createdAt < 24h` — chip `text-[10px] uppercase tracking-wider bg-teal-500 text-white` esquina superior izquierda.
- Botón ❤️ floating top-right sobre imagen — usa `useGuardados({ entityType: 'articulo_marketplace', entityId })`.
- Bloque blanco abajo:
  - Precio (`text-xl font-bold`).
  - Título 1 línea (`truncate`).
  - Línea gris pequeña: `📍 600m · hace 6d` (con helpers `formatearDistancia` y `formatearTiempoRelativo`).

**Comportamiento:**
- Click en card (excepto en ❤️) → `navigate('/marketplace/articulo/${id}')`.
- `data-testid="card-articulo-${id}"` y `data-testid="btn-guardar-${id}"`.

**Helpers locales** (en mini archivo `apps/web/src/utils/marketplace.ts` o inline):
- `formatearDistancia(m: number | null): string` → `<1km`: `"600m"`, `>=1km`: `"1.2km"`, null: `""`.
- `formatearTiempoRelativo(iso: string): string` → `"hace 5min"`, `"hace 3h"`, `"hace 6d"`.
- `parsearFechaPostgres(s: string): Date` → reemplaza espacio por `T` para compat Safari iOS.

**Cumple Regla 13 de TOKENS_GLOBALES:** estética profesional B2B, sin emojis como datos, iconos 14-16px sin círculo, color neutro slate + acento teal único.

---

## Bloque 4 — Página principal `PaginaMarketplace.tsx`

**Archivo nuevo:** `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx`

Estructura (replica patrón [PaginaCardYA.tsx:469](apps/web/src/pages/private/cardya/PaginaCardYA.tsx:469) pero con teal en vez de amber):

```
┌─ Header dark sticky (top-0 z-20)
│   ├─ Background #000000 + glow teal radial-gradient + grid pattern sutil
│   ├─ Mobile (<lg): logo MarketPlace + buscador chip + menú hamburguesa
│   ├─ Desktop (>=lg): logo + buscador inline + CTA "+ Publicar artículo"
│   └─ Subtítulo "COMPRA-VENTA LOCAL" (uppercase tracking-wider)
│   └─ rounded-none lg:rounded-b-3xl
├─ Sección "Recién publicado"
│   ├─ Título + subtítulo "Lo más fresco"
│   └─ Carrusel horizontal con drag-to-scroll (reusa `useDragScroll`)
├─ Sección "Cerca de ti"
│   ├─ Título + subtítulo "A pasos de aquí"
│   └─ Grid: base→2cols, lg→4cols, 2xl→6cols
└─ FAB "+ Publicar" (mobile, bottom: por encima del BottomNav)
```

**Estados:**
- `isLoading` → spinner centrado.
- Arrays vacíos → mensaje vacío amistoso ("Aún no hay artículos en tu ciudad. ¡Sé el primero en publicar!").
- `isError` → bloque rojo de error.
- Sin GPS o sin ciudad → mensaje invitando a activar ubicación (recomendación pregunta 4).

**CTAs:**
- "+ Publicar artículo" → `notificar.info('Próximamente — wizard de publicar llega en Sprint 4')`.
- Buscador → abre `OverlayBuscador` placeholder (Bloque 5).

**Datos del servidor:**
- GPS: `useGpsStore()` (mismo patrón que `useNegociosLista`).
- Ciudad: `useAuthStore(s => s.usuario?.ciudad)`.
- Hook: `useMarketplaceFeed({ ciudad, lat, lng })`.

---

## Bloque 5 — Overlay buscador placeholder

**Archivo nuevo:** `apps/web/src/components/marketplace/OverlayBuscador.tsx`

- Modal full-screen con input deshabilitado o placeholder "Próximamente — disponible en Sprint 6" + botón cerrar.
- Solo abre y cierra (estado controlado desde la página).
- El buscador real (sugerencias en vivo, populares, filtros) viene en Sprint 6.
- `data-testid="overlay-buscador-placeholder"`.

---

## Bloque 6 — Guard nuevo + routing

**Archivo nuevo:** `apps/web/src/router/guards/ModoPersonalEstrictoGuard.tsx`

```tsx
export function ModoPersonalEstrictoGuard({ children }) {
  const usuario = useAuthStore(s => s.usuario);
  const navigate = useNavigate();
  useEffect(() => {
    if (usuario?.modoActivo === 'comercial') {
      notificar.info('MarketPlace solo está disponible en modo Personal');
      navigate('/inicio', { replace: true });
    }
  }, [usuario?.modoActivo, navigate]);

  if (usuario?.modoActivo === 'comercial') return null;
  return <>{children}</>;
}
```

**Archivo modificado:** `apps/web/src/router/index.tsx`
- Eliminar el placeholder local `const PaginaMarketplace = () => <PlaceholderPage nombre="🛒 Marketplace" />;` (línea 81).
- Agregar lazy import: `const PaginaMarketplace = lazy(() => import('../pages/private/marketplace/PaginaMarketplace'));`.
- Envolver en `<ModoPersonalEstrictoGuard>` la ruta `/marketplace`.

---

## Bloque 7 — Verificación responsive y QA

**Plan de verificación:**
- Iniciar dev server (con autorización del usuario) y abrir `/marketplace` en preview.
- Verificar header dark sticky con teal en móvil + laptop + 2xl.
- Verificar que cards muestren precio/título/distancia/tiempo correctamente con datos reales (los 2 artículos del Sprint 1 — uno está soft-deleted, así que solo aparecerá `2288d921-...` con precio $3500).
- Click en ❤️ debe togglear (verificar que entra a tab "Artículos" de Mis Guardados — aunque la tab quizá esté como placeholder).
- Click en card → navega a `/marketplace/articulo/2288d921-...` (404 placeholder, normal).
- Cambiar a modo Comercial y entrar a `/marketplace` → debe redirigir a `/inicio` con toast.
- Tomar screenshots móvil + desktop.

---

## Preguntas para confirmar antes de codear

1. **Guard:** ¿creo `ModoPersonalEstrictoGuard` nuevo (recomendado) o agrego prop `comportamiento` a `ModoGuard`?
2. **`expiraAt` en formato Postgres** (sin `T`): ¿OK fix en FE con helper `parsearFechaPostgres`, en lugar de tocar backend del Sprint 1?
3. **CTA "+ Publicar":** confirmas que muestre `notificar.info('Próximamente — disponible en Sprint 4')` por ahora.
4. **GPS sin permiso:** ¿muestro feed sin sección "Cerca de ti" o muestro mensaje "Activa ubicación para ver artículos cerca"? Recomiendo el segundo.
5. **Verificación visual:** ¿quieres que arranque el dev server al final y te pase screenshots, o prefieres revisarlo tú con `pnpm dev`?

---

## Orden de ejecución y puntos de pausa

1. ⏸ **Plan (este documento)** — esperando confirmación + respuestas a las 5 preguntas.
2. Bloque 1 + Bloque 2 (tipos + extensión `useGuardados` + hook React Query) → pausa.
3. Bloque 3 (CardArticulo) → pausa.
4. Bloque 4 + Bloque 5 (página principal + overlay placeholder) → pausa.
5. Bloque 6 (guard + routing) → pausa.
6. Bloque 7 (verificación) → cierre.

---

## Archivos planeados — Inventario

**Nuevos (8):**
- [apps/web/src/types/marketplace.ts](apps/web/src/types/marketplace.ts)
- [apps/web/src/hooks/queries/useMarketplace.ts](apps/web/src/hooks/queries/useMarketplace.ts)
- [apps/web/src/components/marketplace/CardArticulo.tsx](apps/web/src/components/marketplace/CardArticulo.tsx)
- [apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx](apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx)
- [apps/web/src/router/guards/ModoPersonalEstrictoGuard.tsx](apps/web/src/router/guards/ModoPersonalEstrictoGuard.tsx)
- [apps/web/src/utils/marketplace.ts](apps/web/src/utils/marketplace.ts) (5 helpers de formato + parseo Postgres)
- [apps/api/scripts/set-ciudad-test-users.ts](apps/api/scripts/set-ciudad-test-users.ts) (helper para verificación visual)
- [apps/api/scripts/set-modo-test-user.ts](apps/api/scripts/set-modo-test-user.ts) (helper para probar el guard)

**Eliminado durante corrección post-QA (1):**
- ~~`apps/web/src/components/marketplace/OverlayBuscador.tsx`~~ — buscador local redundante. Ver sección "Corrección post-QA" abajo.

**Modificados (3):**
- [apps/web/src/hooks/useGuardados.ts](apps/web/src/hooks/useGuardados.ts) — extender `EntityType` con `'articulo_marketplace'`
- [apps/web/src/config/queryKeys.ts](apps/web/src/config/queryKeys.ts) — agregar `marketplace.feed(...)`
- [apps/web/src/router/index.tsx](apps/web/src/router/index.tsx) — eliminar placeholder, agregar import real + guard

---

## Bloque 7 — Verificación visual ✅

### Setup de verificación
- API y Web levantados con `preview_start` (puertos 4000 y 62141 autoasignado).
- Token JWT generado con `pnpm exec tsx scripts/marketplace-test-tokens.ts`.
- Usuario test seteado a ciudad="Manzanillo" con `set-ciudad-test-users.ts`.
- GPS mockeado vía `navigator.geolocation.getCurrentPosition` (ya que el preview headless no concede permisos reales).

### Resultados — 4/4 escenarios verificados ✅

| # | Escenario | Resultado |
|---|---|---|
| 1 | `/marketplace` sin GPS | ✅ Banner accionable "Activa tu ubicación" con botón teal y mensaje "Mientras tanto te mostramos lo recién publicado en Manzanillo" |
| 2 | `/marketplace` con GPS + datos | ✅ Carrusel "Recién publicado" + grid "Cerca de ti" muestran el artículo $3,500 con badge NUEVO + distancia + tiempo |
| 3 | Modo Comercial entra a `/marketplace` | ✅ Redirige a `/inicio` automáticamente (verificado: `pathname === '/inicio'` después del guard). Notificación `info` se dispara |
| 4 | Layout responsive (móvil 375 + desktop 1440) | ✅ Móvil: header compacto + FAB; Desktop: header con CTA "+ Publicar artículo" inline + buscador desktop |

### Bug encontrado y corregido en este bloque

**🐛 "hace NaN meses"** — La primera versión de `parsearFechaPostgres` solo reemplazaba el espacio por `T`, pero el formato de Postgres devuelve offset corto `+00` (sin colon) que rompe `new Date()` en Safari y devuelve `Invalid Date` → todos los cálculos de tiempo daban `NaN`.

**Fix aplicado en `utils/marketplace.ts`:**
```ts
const isoLike = postgresTimestamp
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00');  // "+00" → "+00:00"
```

Verificado: tras el fix la card muestra "hace 1h" correctamente.

### Otros hallazgos menores (no son bugs)

- En el feed visual, las imágenes muestran solo `alt` text porque las URLs de prueba (`https://example.com/foto1.jpg`) no resuelven. En producción real las fotos serán URLs válidas de R2.
- La distancia mostrada cambió de 584m a 65km cuando el viewport cambió de móvil a desktop — porque el GPS mock se reinyectó con coordenadas distintas en cada eval. Comportamiento esperado en testing manual; en producción real el GPS es estable durante la sesión.

### Verificaciones acumuladas

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` post-Bloque 1+2 | ✅ exit=0 |
| `npx tsc --noEmit` post-Bloque 3 | ✅ exit=0 |
| `npx tsc --noEmit` post-Bloque 4+5+6 | ✅ exit=0 |
| `npx tsc --noEmit` post-Bloque 7 (con fix NaN) | ✅ exit=0 |
| `npx tsc --noEmit` post-corrección buscador duplicado | ✅ exit=0 |
| Console logs en runtime | ✅ Sin errores |
| Render móvil 375x812 | ✅ Header dark teal limpio (logo + subtítulo) + FAB visible |
| Render desktop 1440x900 | ✅ Header con CTA inline (sin buscador local) |
| Guard de modo Comercial | ✅ Redirige a `/inicio` |
| Snapshot accesibilidad | ✅ Roles correctos. Confirmado: header dark NO tiene textbox de búsqueda; el textbox global del Navbar (`Buscar en Marketplace...`) es la única caja de búsqueda visible |

---

## Corrección post-QA — Buscador duplicado eliminado

**Hallazgo:** El usuario detectó que el header dark teal del MarketPlace tenía un input de búsqueda local (chip móvil + input inline desktop) que se solapaba con el buscador global del Navbar superior. El sistema ya tenía `useSearchStore` con `placeholderSeccion('marketplace') → "Buscar en Marketplace..."` y `detectarSeccion('/marketplace') → 'marketplace'`, así que el Navbar global ya estaba pensado para servir esta función. El buscador local era redundante y confuso.

**Acciones aplicadas:**
1. Eliminados de `PaginaMarketplace.tsx`:
   - Botón móvil `btn-abrir-buscador-mobile`.
   - Botón desktop `btn-abrir-buscador-desktop`.
   - Estado `overlayAbierto` y handlers asociados.
   - Render del `<OverlayBuscador />`.
   - Imports de `Search` (lucide) y `useState`.
2. Eliminado el archivo `apps/web/src/components/marketplace/OverlayBuscador.tsx`.
3. Header móvil simplificado: logo MarketPlace + subtítulo `COMPRA-VENTA LOCAL`, todo centrado.
4. Header desktop simplificado: logo + subtítulo + CTA "Publicar artículo" alineado a la derecha (con `<div className="flex-1" />` como spacer).

**Verificación post-corrección:**
- `tsc --noEmit` exit=0.
- Snapshot accesibilidad confirma: el header dark del MarketPlace NO tiene textbox; el único textbox de búsqueda en la página es `[27] textbox: "Buscar en Marketplace..."` proveniente del Navbar global.
- Render móvil + desktop OK, header más limpio y profesional.

**Pendiente para Sprint 6 (no bloqueante):**
- Conectar `PaginaMarketplace` al `useSearchStore` para reaccionar al `query` global.
- Decidir si el Navbar dispara navegación a `/marketplace/buscar?q=...` cuando estás en MarketPlace.
- Decidir si el query del Navbar se mantiene visible en la URL para ser compartible.

---

## Corrección post-QA #2 — Fuente de la ciudad desincronizada con el Navbar

**Hallazgo del usuario** (con screenshot real de su sesión en Puerto Peñasco):
El Navbar global mostraba "Puerto Peñasco, Sonora" pero el feed mostraba el banner amarillo "Configura tu ciudad — Edítala desde tu perfil". Visualmente parecía un bug porque la ciudad estaba claramente seleccionada arriba.

**Diagnóstico:**
- `Navbar` global lee de `useGpsStore.ciudad?.nombre` (la **ciudad seleccionada en la UI**, persistida en localStorage).
- `PaginaMarketplace` leía de `useAuthStore.usuario?.ciudad` (la ciudad **guardada en el perfil del usuario**, normalmente `null` si nunca se editó).
- Resultado: dos fuentes distintas, mensajes contradictorios.

**Fix aplicado en [PaginaMarketplace.tsx](apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx):**

```ts
// Antes (bug)
const usuario = useAuthStore((s) => s.usuario);
const ciudad = usuario?.ciudad ?? null;

// Después (fix)
const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);
```

Eliminado el import de `useAuthStore` (ya no se usa en este componente). Comentario explicativo en el código indica por qué `useGpsStore` es la fuente correcta.

**Texto del banner reformulado** para coincidir con la nueva fuente:

| | Antes (bug) | Ahora (fix) |
|---|---|---|
| Título | "Configura tu ciudad" | "Selecciona tu ciudad" |
| Cuerpo | "Necesitamos saber tu ciudad para mostrarte artículos cercanos. Edítala desde tu perfil." | "Usa el selector de ubicación arriba para elegir tu ciudad y ver artículos cerca de ti." |

**Verificación:**
- `tsc --noEmit` exit=0.
- Render verificado: cuando GPS store no tiene ciudad → Navbar muestra "Seleccionar ubicación..." y el feed muestra el banner "Selecciona tu ciudad" (ambos consistentes).
- Cuando GPS store tiene ciudad → ambos muestran la misma ciudad, banner desaparece, feed intenta cargar.

---

## Mensaje de commit propuesto

```
feat(marketplace): feed frontend v1 — header dark teal, cards estilo B, guard estricto

Sprint 2/8 del módulo MarketPlace. Implementa el feed visual del comprador en
modo Personal con bloqueo total para modo Comercial.

Cambios:
- PaginaMarketplace.tsx: header dark sticky con identidad teal (replica
  patrón CardYA pero con #2dd4bf/#0d9488 en vez de amber), secciones
  "Recién publicado" (carrusel drag-to-scroll) y "Cerca de ti" (grid
  2/4/6 cols), FAB móvil, estados loading/error/vacío/sin-GPS. El
  header NO tiene buscador local — la búsqueda la aporta el Navbar
  global (useSearchStore + placeholderSeccion).
- CardArticulo.tsx: card estilo B (imagen aspect 1:1 arriba + bloque
  blanco abajo), badge "NUEVO" si <24h, botón ❤️ con useGuardados,
  precio formateado, distancia + tiempo. Cumple Regla 13 de tokens.
- ModoPersonalEstrictoGuard.tsx: guard separado de ModoGuard porque la
  política de MarketPlace es bloqueo total (sin auto-cambio de modo).
  Si usuario está en Comercial → redirige a /inicio con notificación.
- useMarketplace.ts: hook React Query con keepPreviousData y staleTime
  2min. Solo dispara con GPS+ciudad disponibles.
- utils/marketplace.ts: helpers de formato (precio, distancia, tiempo
  relativo, foto portada) + parsearFechaPostgres con fix de offset corto
  para compat Safari iOS.
- types/marketplace.ts: tipos espejo del backend.
- queryKeys.ts: agregada sección marketplace.
- useGuardados.ts: EntityType extendido con 'articulo_marketplace'.
- router/index.tsx: placeholder reemplazado por componente real envuelto
  en ModoPersonalEstrictoGuard.

Verificación: tsc limpio, render móvil + desktop + escenario sin-GPS,
guard de modo Comercial verificado en runtime, fix del bug "hace NaN
meses" causado por offset Postgres "+00" sin colon.

Doc: docs/arquitectura/MarketPlace.md
Sprint: docs/prompts Marketplace/Sprint-2-Feed-Frontend.md
Reporte: docs/reportes/2026-05-03-plan-sprint-2-marketplace-feed-frontend.md
```
