# Sprint 2 — MarketPlace: Feed (Frontend)

## Contexto

Continuamos con la implementación de **MarketPlace**. El Sprint 1 dejó el backend base funcionando (CRUD de artículos, feed por ciudad, validación de modo Personal). Ahora construimos el **feed visual** que ve el comprador al entrar a `/marketplace`.

## Antes de empezar

1. Lee la **Pantalla 1 (P1)** completa del documento:
   - `docs/arquitectura/MarketPlace.md` — sección §8 P1 — Feed de MarketPlace
2. Revisa también:
   - §7 Identidad Visual (header dark teal, botones negros, card estilo B)
   - §2 Filosofía y Tono del Módulo
3. Lee los estándares:
   - `docs/estandares/TOKENS_GLOBALES.md`
   - `docs/estandares/TOKENS_COMPONENTES.md`
   - `docs/estandares/PATRON_REACT_QUERY.md`
4. Revisa estos archivos como referencia de patrones existentes:
   - `apps/web/src/pages/private/cardya/PaginaCardYA.tsx` — patrón de header dark sticky con identidad de color
   - `apps/web/src/pages/private/cupones/PaginaMisCupones.tsx` — patrón similar
   - `apps/web/src/pages/private/guardados/PaginaGuardados.tsx` — otro ejemplo del patrón
   - `apps/web/src/components/negocios/CardNegocio.tsx` — NO replicar el glassmorphism, MarketPlace usa estilo B
   - `apps/web/src/hooks/queries/useNegocios.ts` — patrón React Query a seguir

## Alcance del Sprint

Implementar el feed visual de MarketPlace:

1. **Hook React Query** `useMarketplaceFeed` en `apps/web/src/hooks/queries/useMarketplace.ts`
   - Consume `GET /api/marketplace/feed`
   - Devuelve `{ recientes, cercanos }`
   - Stale time: 2 min para "Recién", 5 min para "Cerca"

2. **Componente** `CardArticulo.tsx` en `apps/web/src/components/marketplace/CardArticulo.tsx`
   - Estilo B: imagen arriba (aspect 1:1) + bloque blanco abajo
   - Muestra: portada, badge "Nuevo" si <24h, botón ❤️ guardar, precio bold grande, título 1 línea truncado, distancia + tiempo en gris
   - Reusa `useGuardados` con `entity_type='articulo_marketplace'`
   - Click en card → navega a `/marketplace/articulo/:id`
   - Cumple Regla 13 de TOKENS_GLOBALES (estética profesional B2B)

3. **Página** `PaginaMarketplace.tsx` en `apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx`
   - Header dark sticky estilo CardYA con acento **teal** (`#14b8a6`) y glow sutil
   - Subtítulo decorativo: "COMPRA-VENTA LOCAL"
   - Buscador en el header (sólo abre overlay placeholder por ahora — el buscador real es Sprint 6)
   - Sección "Recién publicado" — carrusel horizontal con drag-to-scroll
   - Sección "Cerca de ti" — grid 2 cols móvil, 4-6 cols desktop
   - CTA "+ Publicar artículo" — flotante en móvil sobre BottomNav, en header desktop
   - Pull-to-refresh en móvil
   - Estados: loading (spinner), vacío, error

4. **Routing:**
   - Agregar ruta `/marketplace` en `apps/web/src/router/index.tsx`
   - Proteger con guard de modo Personal (si está en Comercial, redirige a `/inicio` con `notificar.info(...)`).
   - Ya está agregada en BottomNav y MenuDrawer (no tocar).

5. **Componente placeholder** del overlay de buscador (solo abre/cierra, sin lógica de búsqueda — eso es Sprint 6).

## Lo que NO entra en este sprint

- Detalle del artículo (Sprint 3)
- Wizard de publicar — el botón "+ Publicar" puede mostrar un toast `notificar.info('Próximamente')` por ahora
- Buscador funcional (Sprint 6)
- Perfil del vendedor (Sprint 5)
- Sistema de niveles del vendedor (Sprint 8)

## Reglas obligatorias

- Paso a paso. Plan detallado primero, espera confirmación antes de codear.
- TypeScript estricto, NUNCA `any`.
- Tailwind v4: solo `lg:` y `2xl:` como breakpoints. SIEMPRE incluir `2xl:`.
- Tailwind v4 syntax: `bg-linear-to-*`, `shrink-0` (NO `bg-gradient-to-*` ni `flex-shrink-0`).
- Idioma: TODO en español.
- Notificaciones: usar `notificar.exito()`, `notificar.error()`, etc. NO SweetAlert directo.
- `data-testid` obligatorio en TODO elemento interactivo.
- Reusa componentes existentes (`Boton`, `Spinner`, etc.) cuando aplique.
- Cumple Regla 13 de TOKENS_GLOBALES — estética profesional B2B (sin caricatura, sin emojis como datos, sin tonos pastel saturados).

## Resultado esperado

Al final del sprint:

1. Entrar a `/marketplace` (en modo Personal) muestra el feed con header dark teal, secciones "Recién publicado" y "Cerca de ti".
2. Las cards muestran correctamente la portada, precio, título, distancia y tiempo.
3. El botón ❤️ funciona (guarda/quita de Mis Guardados).
4. Click en card navega a `/marketplace/articulo/:id` (placeholder por ahora).
5. En modo Comercial, la URL `/marketplace` redirige a `/inicio`.
6. Responsive funciona bien en móvil, laptop (lg) y desktop (2xl).

## Plan de trabajo

Espera mi confirmación entre cada bloque:

1. Plan detallado del sprint (sin codear)
2. Hook React Query + tipos
3. Componente CardArticulo
4. Página principal con header dark
5. Carrusel "Recién" + grid "Cerca de ti"
6. CTA flotante + integración con MenuDrawer/BottomNav
7. Routing + guard de modo Personal
8. Verificación responsive y QA

**Empieza con el plan detallado.**
