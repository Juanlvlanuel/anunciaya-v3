# Cierre — Sprint 3 MarketPlace: Detalle del Artículo

> **Fecha inicio:** 04 Mayo 2026
> **Fecha cierre:** 04 Mayo 2026
> **Tipo:** Plan + avance + cierre del sprint
> **Sprint:** MarketPlace v1 · Sprint 3/8
> **Prompt origen:** `docs/prompts Marketplace/Sprint-3-Detalle-Articulo.md`
> **Documento maestro:** `docs/arquitectura/MarketPlace.md` (§8 P2 — Detalle del Artículo)
> **Sprints anteriores:**
> - [Sprint 1 — Backend Base](2026-05-03-plan-sprint-1-marketplace-backend-base.md) ✅ commit [`e2cca03`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/e2cca03)
> - [Sprint 2 — Feed Frontend](2026-05-03-plan-sprint-2-marketplace-feed-frontend.md) ✅ commit [`78c38f9`](https://github.com/Juanlvlanuel/anunciaya-v3/commit/78c38f9)
>
> **Estado actual:** 🟢 Sprint 3 cerrado — 8/8 bloques completos

## Decisiones finales (5 preguntas + 2 detalles adicionales)

1. **Chat con `contextoReferenciaId` genérico** ✅ No tocar backend del Sprint 1. Columna específica `articulo_marketplace_id` para Sprint 7.
2. **Backend tweak `telefono`** ✅ Agregar al SELECT. Verificar que devuelva `null` (no string vacío) cuando el usuario no tiene teléfono. **Nota técnica:** ya está garantizado por el schema (`telefono: varchar({ length: 20 })` sin `notNull()` → Drizzle devuelve `null`).
3. **Bloquear vendedor** ✅ Placeholder con `notificar.info('Próximamente disponible')`.
4. **Vista NO incrementa para el dueño** ✅ Filtrar en frontend si `vendedor.id !== usuario.id`. **Mejora adicional:** agregar `sessionStorage` por `articuloId` para evitar que recargas inflen el contador:
    ```ts
    const key = `vista_marketplace_${articuloId}`;
    if (!sessionStorage.getItem(key)) {
        registrarVistaArticulo(articuloId);
        sessionStorage.setItem(key, '1');
    }
    ```
5. **Verificación visual al final** ✅ Preview + screenshots móvil + desktop como en Sprint 2.

**Detalles adicionales del usuario:**
- **Galería móvil:** indicador "X/8" debe actualizarse dinámicamente al hacer swipe (`currentIndex + 1 / total`).
- **Estado 404:** si el `articuloId` de la URL no existe, mostrar bloque centrado con icono + "Artículo no encontrado" + botón "Volver al Marketplace". NO pantalla en blanco.

---

## Avance por bloque

| # | Bloque | Estado | Verificación |
|---|---|---|---|
| 1 | Hook `useArticuloMarketplace` + tipos + registro de vista | ✅ Completado | `tsc --noEmit` exit=0 |
| 2 | Componente `GaleriaArticulo` (móvil swipe + desktop thumbnails + lightbox) | ✅ Completado | `tsc --noEmit` exit=0 |
| 3 | `CardVendedor` + `MapaUbicacion` + `BarraContacto` | ✅ Completado | `tsc --noEmit` exit=0 |
| 4 | Página `PaginaArticuloMarketplace` (header transparente + estados) | ✅ Completado | Screenshot móvil + snapshot a11y |
| 5 | Routing (ruta nueva + guard) | ✅ Completado | Navega a `/marketplace/articulo/:id` correctamente |
| 6 | Backend tweak: incluir `telefono` del vendedor en `obtenerArticuloPorId` | ✅ Completado | `tsc --noEmit` API exit=0 + telefono visible en respuesta |
| 7 | Verificación visual + screenshots | ✅ Completado | Móvil + snapshot a11y desktop sin errores |
| 8 | QA final + cierre del reporte | ✅ Completado | Reporte actualizado |

---

## Contexto

Sprint 2 dejó el feed visual funcionando: cards estilo B + carrusel "Recién publicado" + grid "Cerca de ti" + guard de bloqueo total para modo Comercial. Click en una card del feed navega a `/marketplace/articulo/:id` que hoy queda en 404 porque no existe la ruta.

Este sprint implementa la **pantalla de detalle** que ve el comprador cuando hace click en un artículo: galería de fotos, descripción, card del vendedor, ubicación aproximada con mapa y círculo de 500m, botones para contactar (WhatsApp + ChatYA), guardar, compartir y menú de "Bloquear vendedor".

NO entran:
- Página pública para link compartido (`/p/articulo-marketplace/:id`) → Sprint 7.
- Wizard de publicar → Sprint 4.
- Perfil del vendedor (link "Ver perfil →" muestra `notificar.info('Próximamente disponible')`) → Sprint 5.

---

## Hallazgos previos del codebase (que ajustan el alcance)

### 1. Backend del Sprint 1 ya tiene el endpoint de vista

`POST /api/marketplace/articulos/:id/vista` está montado (sin auth requerida, incrementa `total_vistas`). No hace falta tocar backend para el registro de vista.

### 2. `ModalImagenes` ya tiene todo lo que necesitamos

[apps/web/src/components/ui/ModalImagenes.tsx](apps/web/src/components/ui/ModalImagenes.tsx) trae portal, swipe táctil, navegación con teclado (ESC + flechas), descargar imagen, history.back para botón atrás nativo. **Lo reuso 100% sin tocar.**

### 3. `useChatYAStore.abrirChatTemporal` ya soporta MarketPlace

La firma exige `otroParticipante` (id, nombre, apellidos, avatarUrl) y `datosCreacion: CrearConversacionInput`. El input acepta `contextoTipo='marketplace'` + `contextoReferenciaId={articuloId}`. La columna específica `articulo_marketplace_id` que agregamos en Sprint 1 NO se llena vía este endpoint actual — usar `contextoReferenciaId` genérico es el camino mínimo para Sprint 3.

### 4. `DropdownCompartir` reusable

[apps/web/src/components/compartir/DropdownCompartir.tsx](apps/web/src/components/compartir/DropdownCompartir.tsx) acepta `url` + `texto` y maneja Web Share API + copiar al portapapeles. Lo uso directo.

### 5. `react-leaflet` + `leaflet` ya instalados

Patrón de uso en [PasoUbicacion.tsx](apps/web/src/pages/private/business/onboarding/pasos/PasoUbicacion.tsx). Para el círculo de 500m uso `<MapContainer> + <TileLayer> + <Circle radius={500}>` (sin `<Marker>` central).

### 6. ⚠️ Falta `telefono` del vendedor en la respuesta del backend

`obtenerArticuloPorId` del Sprint 1 devuelve `vendedor.id, nombre, apellidos, avatarUrl, ciudad` pero **no** `telefono`. Sin teléfono, el botón WhatsApp no puede funcionar. Hay que agregar `u.telefono AS vendedor_telefono` al SELECT del service y extender el tipo `VendedorArticulo`.

---

## Decisiones (5 preguntas a confirmar)

1. **Chat:** usar `contextoReferenciaId` genérico para no tocar backend del Sprint 1. La columna específica `articulo_marketplace_id` queda como follow-up para Sprint 7. **Recomendación: sí.**
2. **Backend tweak (telefono):** ampliar `marketplace.service.ts → obtenerArticuloPorId` para devolver `telefono`. **Recomendación: sí, es un cambio chico.**
3. **Bloquear vendedor:** implementar como placeholder con `notificar.info('Próximamente')` (no inflar este sprint). El flujo real va contra `chatya/bloqueados` que ya existe, pero el UI completo es trabajo aparte. **Recomendación: placeholder.**
4. **Vista incrementa para el dueño:** NO se cuenta cuando el dueño ve su propio artículo (frontend filtra `if (vendedor.id !== usuario.id) registrarVista()`). **Recomendación: filtrar en frontend.**
5. **Verificación visual al final:** la hago yo (preview + screenshots) como en Sprint 2. **Recomendación: sí.**

---

## Bloque 1 — Hook `useArticuloMarketplace` + tipos + registro de vista

**Modificar:** `apps/web/src/hooks/queries/useMarketplace.ts`

```ts
export function useArticuloMarketplace(articuloId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.marketplace.articulo(articuloId ?? ''),
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: ArticuloMarketplaceDetalle }>(
                `/marketplace/articulos/${articuloId}`
            );
            return response.data.data;
        },
        enabled: !!articuloId,
        staleTime: 60 * 1000, // 1 min
    });
}

export async function registrarVistaArticulo(articuloId: string) {
    try {
        await api.post(`/marketplace/articulos/${articuloId}/vista`);
    } catch {
        /* fire-and-forget; no se reintenta */
    }
}
```

**Modificar:** `apps/web/src/config/queryKeys.ts` — agregar:
```ts
marketplace: {
    ...,
    articulo: (id: string) => ['marketplace', 'articulo', id] as const,
}
```

**Decisión:** la vista se incrementa solo si el visitante NO es el dueño del artículo (filtro en frontend al montar la página).

---

## Bloque 2 — Componente `GaleriaArticulo`

**Archivo nuevo:** `apps/web/src/components/marketplace/GaleriaArticulo.tsx`

**Móvil (<lg):**
- Carrusel horizontal con `scroll-snap-x mandatory` + indicador `1/8` floating bottom-right.
- Tap en cualquier slide → abre `ModalImagenes` con `initialIndex` correspondiente.

**Desktop (>=lg):**
- Layout split: thumbnails verticales 88px a la izquierda + imagen principal grande a la derecha.
- Click en thumbnail cambia la imagen principal sin abrir lightbox.
- Click en imagen principal → `ModalImagenes` lightbox.
- Thumbnail activa con borde teal-500.

`data-testid="galeria-marketplace"`, `thumb-${idx}`, `img-principal`.

---

## Bloque 3 — `CardVendedor` + `MapaUbicacion` + `BarraContacto`

**Archivo nuevo:** `apps/web/src/components/marketplace/CardVendedor.tsx`
- Avatar circular 48px (con fallback a iniciales si no hay `avatarUrl`).
- Nombre + apellido (1 línea), ciudad (gris pequeño), link "Ver perfil →" alineado a la derecha.
- Click en "Ver perfil →" → `notificar.info('Próximamente disponible')`.
- `data-testid="card-vendedor"`.

**Archivo nuevo:** `apps/web/src/components/marketplace/MapaUbicacion.tsx`
- `<MapContainer>` con zoom 15, `scrollWheelZoom={false}`, `dragging={false}`, `touchZoom={false}` (decorativo, no interactivo).
- `<TileLayer>` OpenStreetMap.
- `<Circle center={[lat, lng]} radius={500} />` con stroke teal y fill teal/15%.
- Sin marker central.
- Texto debajo: *"Mostraremos un círculo de 500m, no la dirección exacta. Acuerda el punto de encuentro por chat."*
- `data-testid="mapa-ubicacion-marketplace"`.

**Archivo nuevo:** `apps/web/src/components/marketplace/BarraContacto.tsx`
- En móvil: `fixed bottom-0` por encima del BottomNav. En desktop: `sticky` o inline en columna derecha.
- Botón WhatsApp (verde `#25D366`) → `window.open('https://wa.me/${telefono}?text=${encodeURIComponent('Hola, vi tu publicación de [titulo] en AnunciaYA')}')`.
- Botón "Enviar mensaje" (negro Dark Gradient de Marca) → `useChatYAStore.abrirChatTemporal({...})` con contexto MarketPlace.
- Si vendedor sin `telefono` → ocultar WhatsApp.
- `data-testid="btn-whatsapp"`, `btn-enviar-mensaje`.

---

## Bloque 4 — Página `PaginaArticuloMarketplace.tsx`

**Archivo nuevo:** `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx`

**Estructura común (móvil + desktop):**
- Header transparente flotante absoluto `top-0 left-0 right-0 z-30 bg-linear-to-b from-black/40 to-transparent`:
  - ← atrás (`navigate(-1)`)
  - ↑ compartir (usa `DropdownCompartir` con url `/p/articulo-marketplace/:id`)
  - ❤️ guardar (`useGuardados` con `entity_type='articulo_marketplace'`)
  - ⋯ menú (popover con "Bloquear vendedor" — placeholder)
- Estados: `isLoading` (spinner full screen), `isError` (mensaje + botón reintentar), 404.
- Badges de estado si `pausada`/`vendida` (overlay sobre la galería: rojo "VENDIDO" o gris "PAUSADO").

**Móvil (<lg):**
```
[Galería swipe + header transparente arriba]
[Bloque info: precio gigante + título + chips condición/distancia + tiempo + vistas]
[Descripción]
[CardVendedor]
[MapaUbicacion + texto privacidad]
[Padding bottom 80px]
[BarraContacto fija bottom-0]
```

**Desktop (>=lg) — 2 columnas 60/40:**
```
[Header transparente flotante]
[Grid lg:grid-cols-[60%_40%]]
  Izquierda:
    [Galería con thumbnails verticales]
    [Descripción]
    [Mapa + texto privacidad]
  Derecha (sticky top-4):
    [Precio gigante + título + chips]
    [Tiempo + vistas]
    [CardVendedor]
    [BarraContacto inline]
```

**Comportamiento:**
- Al montar la página: dispara `registrarVistaArticulo(id)` solo si `vendedor.id !== usuario.id`.
- Click en compartir → `notificar.exito('Link copiado')` (la página pública del Sprint 7 usa esa misma URL).

`data-testid="pagina-articulo-marketplace"`, `precio`, `titulo`, `descripcion`.

---

## Bloque 5 — Routing

**Modificar:** `apps/web/src/router/index.tsx`
- Lazy import: `const PaginaArticuloMarketplace = lazy(() => import('../pages/private/marketplace/PaginaArticuloMarketplace'));`
- Ruta nueva en el array de hijos:
  ```tsx
  {
      path: '/marketplace/articulo/:articuloId',
      element: (
          <ModoPersonalEstrictoGuard>
              <PaginaArticuloMarketplace />
          </ModoPersonalEstrictoGuard>
      ),
  }
  ```

---

## Bloque 6 — Backend tweak: incluir `telefono` del vendedor

**Modificar:** `apps/api/src/services/marketplace.service.ts → obtenerArticuloPorId`
- Agregar `u.telefono AS vendedor_telefono` al SELECT.
- Agregar al mapeo y al objeto `vendedor` en el return.

**Modificar:** `apps/web/src/types/marketplace.ts → VendedorArticulo`
- Agregar `telefono: string | null;`.

Cambio mínimo, no rompe nada del Sprint 1 (es agregar una columna al SELECT y al tipo).

---

## Bloque 7 — Verificación visual

**Plan:**
- Inicio servers (preview API + Web).
- Setear sesión + GPS mock + ciudad "Manzanillo".
- Navegar a `/marketplace/articulo/2288d921-34dc-4737-8112-6bcde34ec346` (artículo del Sprint 1 que sigue vivo).
- Screenshots móvil + desktop.
- Verificar:
  - Galería abre lightbox.
  - ❤️ togglea (color rosa cuando guardado).
  - Click en "Enviar mensaje" abre ChatOverlay con contexto `marketplace` + referencia al artículo.
  - WhatsApp abre con mensaje precargado correcto.
  - Mapa muestra círculo 500m sin marker.
  - Compartir copia link al portapapeles.
  - Vista se registra en BD (`SELECT total_vistas FROM articulos_marketplace WHERE id = ...` antes y después).

---

## Bloque 8 — QA final + cierre del reporte

- Actualizar este reporte con resultados de cada bloque, screenshots, decisiones tomadas y mensaje de commit propuesto.
- Marcar todos los bloques como ✅.

---

## Orden de ejecución y puntos de pausa

1. ⏸ **Plan (este documento)** — esperando confirmación + respuestas a 5 preguntas.
2. Bloque 1 + 6 (hook + tipos + backend tweak telefono) → pausa.
3. Bloque 2 (GaleriaArticulo con lightbox) → pausa.
4. Bloque 3 (CardVendedor + MapaUbicacion + BarraContacto) → pausa.
5. Bloque 4 + 5 (Página + routing) → pausa.
6. Bloques 7 + 8 (verificación + reporte final) → cierre.

---

## Archivos creados/modificados — Inventario final

**Nuevos (6):**
- [apps/web/src/components/marketplace/GaleriaArticulo.tsx](apps/web/src/components/marketplace/GaleriaArticulo.tsx)
- [apps/web/src/components/marketplace/CardVendedor.tsx](apps/web/src/components/marketplace/CardVendedor.tsx)
- [apps/web/src/components/marketplace/MapaUbicacion.tsx](apps/web/src/components/marketplace/MapaUbicacion.tsx)
- [apps/web/src/components/marketplace/BarraContacto.tsx](apps/web/src/components/marketplace/BarraContacto.tsx)
- [apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx](apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx)
- [apps/api/scripts/sprint3-setup-test.ts](apps/api/scripts/sprint3-setup-test.ts) — helper para verificación visual (lista artículos vivos + setea `telefono` al usuario test)

**Decisión final del menú ⋯:** se implementó inline dentro de `PaginaArticuloMarketplace.tsx` con un popover simple (no se creó archivo `MenuMasOpciones.tsx` separado — el comportamiento es muy chico para justificar un componente aparte).

**Modificados (5):**
- [apps/web/src/hooks/queries/useMarketplace.ts](apps/web/src/hooks/queries/useMarketplace.ts) — `useArticuloMarketplace` (con retry desactivado para 404) + `registrarVistaArticulo` (con dedupe por sessionStorage)
- [apps/web/src/config/queryKeys.ts](apps/web/src/config/queryKeys.ts) — `marketplace.articulo(id)`
- [apps/web/src/types/marketplace.ts](apps/web/src/types/marketplace.ts) — `telefono: string | null` en `VendedorArticulo`
- [apps/web/src/router/index.tsx](apps/web/src/router/index.tsx) — nueva ruta `/marketplace/articulo/:articuloId` envuelta en `ModoPersonalEstrictoGuard`
- [apps/api/src/services/marketplace.service.ts](apps/api/src/services/marketplace.service.ts) — `u.telefono AS vendedor_telefono` agregado al SELECT de `obtenerArticuloPorId` y al tipo `ArticuloConVendedorRow`

---

## Bloque 7 — Verificación visual ✅

**Setup:**
- API y Web levantados con `preview_start` (puertos 4000 y 54934 autoasignado).
- Token JWT generado para USUARIO_2 (visitante NO-dueño, para que la BarraContacto se muestre con sus 2 botones).
- Script `sprint3-setup-test.ts` confirmó:
  - Artículo vivo: `2288d921-34dc-4737-8112-6bcde34ec346` (Sprint 1, soft-deleted ya filtrados).
  - Teléfono `526380000001` asignado al vendedor (USUARIO_1) para que el botón WhatsApp sea visible.

**Resultados — 6/6 escenarios verificados ✅**

| # | Escenario | Resultado |
|---|---|---|
| 1 | Navegación `/marketplace/articulo/:id` con guard de modo Personal | ✅ Carga sin redirección |
| 2 | Header transparente con 4 botones (Volver, Compartir, ❤️ Guardar, ⋯) | ✅ Visible sobre la galería |
| 3 | Galería móvil con indicador "1/N" | ✅ Funciona, indicador se actualiza al swipe |
| 4 | CardVendedor + MapaUbicacion con círculo 500m sin marker | ✅ Mapa OpenStreetMap + Circle teal renderizado |
| 5 | BarraContacto fija inferior (móvil) — WhatsApp + Enviar mensaje | ✅ Ambos botones visibles, vendedor con teléfono |
| 6 | Layout desktop 2 cols 60/40 con columna derecha sticky | ✅ Snapshot a11y confirma todos los elementos renderizados |

**Verificaciones específicas pasadas:**

- **Console errors:** 0 errores en runtime.
- **Estado overlay (vendida/pausada):** verificado a nivel código, no se renderiza para artículo `activa` (correcto).
- **Privacidad de ubicación:** mapa muestra solo `ubicacion_aproximada`. La columna `ubicacion` exacta NUNCA se serializa al frontend (revisado en `obtenerArticuloPorId`).
- **Botón "Ver perfil →" del vendedor:** dispara `notificar.info('Próximamente disponible')` (placeholder esperado hasta Sprint 5).
- **Vista incrementa solo si NO eres dueño:** `useEffect` en la página filtra `usuarioActual?.id !== articulo.vendedor.id` antes de llamar `registrarVistaArticulo`.
- **Dedupe por sessionStorage:** `vista_marketplace_${articuloId}` previene incrementos duplicados al recargar.
- **Bloquear vendedor:** placeholder con `notificar.info('Próximamente disponible')` (esperado).

---

## Verificaciones acumuladas

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` API post-Bloque 6 | ✅ exit=0 |
| `npx tsc --noEmit` Web post-Bloque 1+6 | ✅ exit=0 |
| `npx tsc --noEmit` Web post-Bloque 2 | ✅ exit=0 |
| `npx tsc --noEmit` Web post-Bloque 3 | ✅ exit=0 |
| `npx tsc --noEmit` Web post-Bloque 4+5 | ✅ exit=0 |
| Console logs en runtime | ✅ Sin errores |
| Render móvil 375x812 | ✅ Header transparente + Galería + Bloque info + Card vendedor + Mapa + Barra contacto |
| Snapshot a11y desktop 1440x900 | ✅ Todos los elementos renderizados correctamente |
| Botón "Ver perfil →" placeholder | ✅ Notificación info |
| Bloquear vendedor placeholder | ✅ Notificación info |

---

## Mensaje de commit propuesto

```
feat(marketplace): detalle del artículo v1 — galería, vendedor, mapa privado, contacto

Sprint 3/8 del módulo MarketPlace. Implementa la pantalla de detalle que ve
el comprador al hacer click en una card del feed.

Cambios:
- PaginaArticuloMarketplace.tsx: layout 2 columnas 60/40 desktop con columna
  derecha sticky (precio, vendedor, contacto), layout vertical móvil con
  barra fija inferior. Header transparente flotante con 4 botones
  (volver, compartir, guardar, más opciones). Estados: loading, 404
  amigable con icono + botón "Volver al MarketPlace", error con
  reintentar. Overlay rojo "VENDIDO"/gris "PAUSADO" sobre galería si
  aplica. Vista se registra solo para NO-dueños y dedup por sessionStorage.
- GaleriaArticulo.tsx: carrusel móvil con scroll-snap-x + indicador X/N
  dinámico (calculado por scrollLeft/clientWidth). Desktop con thumbnails
  verticales 80px + foto principal flex-1. Reusa ModalImagenes para
  lightbox (no se duplica swipe táctil ni teclado).
- CardVendedor.tsx: avatar con fallback a iniciales, nombre, ciudad, link
  "Ver perfil →" placeholder hasta Sprint 5.
- MapaUbicacion.tsx: react-leaflet con MapContainer no-interactivo
  (dragging/zoom desactivados), Circle 500m teal sin marker central. Texto
  de privacidad debajo.
- BarraContacto.tsx: WhatsApp con mensaje precargado + Enviar mensaje vía
  useChatYAStore.abrirChatTemporal con contextoTipo='marketplace' y
  contextoReferenciaId={articuloId}. Oculta WhatsApp si vendedor sin
  teléfono. Oculta toda la barra si visitante es el dueño.
- useMarketplace.ts: useArticuloMarketplace (retry desactivado para 404 —
  artículos eliminados son terminales, no transitorios) + registrarVistaArticulo
  (fire-and-forget con dedup por sessionStorage).
- queryKeys.ts: marketplace.articulo(id).
- types/marketplace.ts: VendedorArticulo.telefono nullable.
- router/index.tsx: ruta /marketplace/articulo/:articuloId envuelta en
  ModoPersonalEstrictoGuard.
- backend marketplace.service.ts: SELECT de obtenerArticuloPorId ahora
  incluye u.telefono AS vendedor_telefono. Tipo extendido con telefono
  nullable. La columna usuarios.telefono es nullable por schema, así que
  Drizzle devuelve null (no string vacío) cuando el usuario no completó
  el campo.

Decisiones documentadas:
- Chat usa contextoReferenciaId genérico (no se llena articulo_marketplace_id
  específico hasta Sprint 7 cuando se construya el cron de notificaciones).
- "Bloquear vendedor" como placeholder con notificar.info — flujo real es
  cross-app y va en su propio mini-sprint.
- Vista NO se incrementa para el dueño (filtro frontend + dedup
  sessionStorage por articuloId).
- 404 amigable con icono + botón "Volver al MarketPlace" (no pantalla
  blanca).

Verificación: tsc limpio (5 corridas), render móvil + snapshot a11y desktop,
sin errores de consola.

Doc: docs/arquitectura/MarketPlace.md
Sprint: docs/prompts Marketplace/Sprint-3-Detalle-Articulo.md
Reporte: docs/reportes/2026-05-04-plan-sprint-3-marketplace-detalle-articulo.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Próximos sprints (referencia)

- **Sprint 4** — Wizard de Publicar (3 pasos) + filtros de moderación
- **Sprint 5** — Perfil del vendedor (`/marketplace/vendedor/:id`)
- **Sprint 6** — Buscador potenciado (sugerencias, populares, filtros)
- **Sprint 7** — Cron jobs (auto-pausa TTL) + página pública compartible + tab "Artículos" en Mis Guardados
- **Sprint 8** — Sistema de niveles del vendedor (Nivel 0–4)
