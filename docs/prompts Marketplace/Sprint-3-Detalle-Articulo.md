# Sprint 3 — MarketPlace: Detalle del Artículo

## Contexto

El feed (Sprint 2) ya muestra cards y permite navegar al detalle. Ahora construimos la **pantalla de detalle** que ve el comprador cuando hace click en un artículo: galería de fotos, descripción, card del vendedor, ubicación aproximada, y botones para contactar.

## Antes de empezar

1. Lee la **Pantalla 2 (P2)** completa del documento:
   - `docs/arquitectura/MarketPlace.md` — sección §8 P2 — Detalle del Artículo
2. Revisa también:
   - §5 Política de Visibilidad por Modo
   - §11 Integraciones (ChatYA, sistema de compartir, ubicación con privacidad)
3. Revisa estos archivos como referencia de patrones existentes:
   - `apps/web/src/pages/public/PaginaArticuloPublico.tsx` — layout 2 columnas con galería
   - `apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx` — header transparente sobre imagen
   - `apps/web/src/components/ui/ModalImagenes.tsx` — lightbox a reusar para galería fullscreen
   - `apps/web/src/stores/useChatYAStore.ts` — método `abrirChatTemporal()` para iniciar conversación
   - `apps/web/src/components/compartir/DropdownCompartir.tsx` — sistema universal de compartir

## Alcance del Sprint

Implementar la página de detalle del artículo:

1. **Endpoint backend adicional** (si no quedó en Sprint 1):
   - `POST /api/marketplace/articulos/:id/vista` — incrementa `total_vistas` (sin auth requerida)

2. **Hook React Query** `useArticuloMarketplace(articuloId)` en `useMarketplace.ts`
   - Consume `GET /api/marketplace/articulos/:id`
   - Devuelve artículo completo: galería, descripción, datos del vendedor, ubicación aproximada, métricas
   - Al montar: dispara `POST /:id/vista` (fire and forget)

3. **Página** `PaginaArticuloMarketplace.tsx` en `apps/web/src/pages/private/marketplace/PaginaArticuloMarketplace.tsx`

   **Móvil:**
   - Header transparente flotante sobre la imagen (botones ← atrás, ↑ compartir, ❤️ guardar, ⋯ menú)
   - Galería con swipe horizontal + indicador "1/8"
   - Bloque principal: precio bold gigante, título, chips (condición, distancia), tiempo y vistas
   - Descripción
   - Card del vendedor (avatar, nombre, ubicación, botón "Ver perfil →")
   - Mini mapa Leaflet con **círculo de 500m** (sin pin central) — ubicación aproximada
   - Texto: "Mostraremos un círculo de 500m, no la dirección exacta. Acuerda el punto de encuentro por chat."
   - Barra fija inferior: WhatsApp (verde) + "Enviar mensaje" (negro)

   **Desktop (2 columnas 60/40):**
   - Izquierda: galería con thumbnails verticales + descripción + mapa
   - Derecha sticky: precio, título, chips, card vendedor, botones de contacto, tiempo/vistas

4. **Componente Galería:**
   - Móvil: swipe horizontal con indicador
   - Desktop: thumbnails verticales al lado izquierdo, foto principal grande
   - Tap/click → abre `ModalImagenes` (lightbox fullscreen con swipe)

5. **Botones de contacto:**
   - "Enviar mensaje" → `useChatYAStore.abrirChatTemporal(...)` con `contextoTipo='marketplace'` y `articuloMarketplaceId={id}`
   - "WhatsApp" → abre WhatsApp Web/App con número del vendedor + mensaje precargado:
     `"Hola, vi tu publicación de [título] en AnunciaYA"`
   - "❤️ Guardar" → `useGuardados` con `entity_type='articulo_marketplace'`

6. **Menú ⋯:**
   - Solo opción: "Bloquear vendedor"
   - SIN opción de "Reportar publicación" (decisión consciente, ver §7 del documento)

7. **Sistema de compartir:**
   - Botón ↑ genera link público `/p/articulo-marketplace/:id`
   - La página pública NO se construye en este sprint (queda para Sprint 7)
   - Por ahora solo copiar link al portapapeles con `notificar.exito('Link copiado')`

8. **Routing:**
   - Agregar `/marketplace/articulo/:articuloId` en el router con guard de modo Personal

9. **Manejo de privacidad de ubicación:**
   - El backend ya devuelve `ubicacion_aproximada` (aleatorizada al guardar). Frontend solo renderiza el círculo Leaflet, sin preguntar más.

## Lo que NO entra en este sprint

- Página pública para link compartido (`/p/articulo-marketplace/:id`) — Sprint 7
- Wizard de publicar (Sprint 4)
- Perfil del vendedor (Sprint 5) — el botón "Ver perfil →" puede mostrar `notificar.info('Próximamente')` por ahora

## Reglas obligatorias

- Paso a paso, plan primero.
- TypeScript estricto, NUNCA `any`.
- Tailwind v4: `lg:` y `2xl:` solo. SIEMPRE incluir `2xl:`.
- Idioma: español.
- `data-testid` obligatorio en interactivos.
- Reusa `ModalImagenes` para el lightbox, NO inventes uno nuevo.
- Header transparente sobre imagen — NO usar el header dark sticky del feed (este es modo "consumo", no "navegación").
- Cumple Regla 13 de TOKENS_GLOBALES.

## Resultado esperado

Al final del sprint:

1. Click en una card del feed lleva al detalle.
2. La galería funciona: swipe en móvil, thumbnails en desktop, lightbox al hacer tap.
3. El botón "Enviar mensaje" abre ChatOverlay con la conversación correcta (contexto 'marketplace').
4. WhatsApp abre con el mensaje precargado.
5. ❤️ guarda/quita de Mis Guardados.
6. El mapa muestra el círculo de 500m (sin pin).
7. La vista incrementa el contador de `total_vistas` en backend.
8. Layout responsive correcto en las 3 resoluciones.

## Plan de trabajo

Espera confirmación entre bloques:

1. Plan detallado
2. Endpoint de registrar vista + hook React Query
3. Layout móvil completo
4. Galería con swipe y lightbox
5. Card vendedor + botones de contacto + integración ChatYA
6. Mapa con círculo de 500m
7. Layout desktop (2 columnas sticky)
8. QA responsive

**Empieza con el plan.**
