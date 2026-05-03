# Sprint 5 — MarketPlace: Perfil del Vendedor

## Contexto

Ya tenemos feed (Sprint 2), detalle (Sprint 3) y wizard de publicar (Sprint 4). Ahora construimos la **Pantalla 3 (P3) — Perfil del Vendedor**, que se abre cuando el comprador hace click en "Ver perfil →" desde el detalle de un artículo.

## Antes de empezar

1. Lee la **Pantalla 3 (P3)** completa del documento:
   - `docs/arquitectura/MarketPlace.md` — sección §8 P3 — Perfil del Vendedor
2. Revisa estos archivos como referencia:
   - `apps/web/src/pages/private/negocios/PaginaPerfilNegocio.tsx` — estructura similar (portada + avatar + KPIs + tabs + grid)
   - `apps/web/src/components/marketplace/CardArticulo.tsx` (creado en Sprint 2) — para el grid de publicaciones
   - `apps/web/src/hooks/useVotos.ts` — sistema de votos para el botón "Seguir vendedor"

## Alcance del Sprint

### Backend

1. **Endpoint** `GET /api/marketplace/vendedor/:usuarioId`
   - Devuelve datos del vendedor: nombre, avatar, ubicación, fecha de registro
   - KPIs calculados:
     - **Publicaciones activas** — `COUNT(*) WHERE estado='activa'`
     - **Vendidos** — `COUNT(*) WHERE estado='vendida'`
     - **Tiempo de respuesta promedio** — query agregada con `chat_mensajes`: promedio de minutos entre primer mensaje del comprador y primera respuesta del vendedor en últimos 30 días. Devuelve "<1h", "1h", "2h", "1d", "—" según rango. Si no hay datos: "—"
   - Si el vendedor bloqueó al usuario actual → retornar 404 (sin revelar el bloqueo)

2. **Endpoint** `GET /api/marketplace/vendedor/:usuarioId/publicaciones?estado=activa|vendida&page=...`
   - Devuelve lista paginada de publicaciones del vendedor según estado.

### Frontend

3. **Hook React Query** `useVendedorMarketplace(usuarioId)` y `useVendedorPublicaciones(usuarioId, estado, page)` en `useMarketplace.ts`.

4. **Página** `PaginaPerfilVendedor.tsx` en `apps/web/src/pages/private/marketplace/PaginaPerfilVendedor.tsx`

   **Móvil:**
   - Header transparente flotante sobre portada (← atrás, ⋯ menú con "Bloquear usuario")
   - Portada: color teal sólido o imagen genérica (si el usuario no tiene portada)
   - Avatar circular grande con badge ✓ Verificado (si aplica)
   - Nombre + ubicación + "Miembro desde [mes año]"
   - 3 KPIs simples en fila (sin tonos pastel, sin emojis, sin saltos tipográficos):
     - Publicaciones activas
     - Vendidos
     - Tiempo de respuesta
   - Botón principal "💬 Enviar mensaje" (negro)
   - Botón secundario "👁 Seguir vendedor" (blanco con borde) — usa `useVotos` con `tipo_accion='follow'` y `entity_type='usuario'`
   - Tabs: **Publicaciones (X)** | **Vendidos (X)**
   - Tab activa subrayada en teal (mismo patrón que CardYA)
   - Grid de cards estilo B (reusa `CardArticulo` de Sprint 2)
   - En tab "Vendidos" las cards muestran overlay slate translúcido con texto "VENDIDO"

   **Desktop:**
   - Misma estructura, portada más alta
   - KPIs en fila completa
   - Grid de publicaciones en 4 columnas

5. **Botón "Enviar mensaje"** del perfil:
   - Abre `ChatOverlay` con `contextoTipo='vendedor_marketplace'` (sin artículo específico)
   - Si el usuario está bloqueado → notificar.error('No puedes enviar mensajes a este usuario')

6. **Botón "Seguir vendedor"**:
   - Reusa `useVotos` con `entity_type='usuario'`, `tipo_accion='follow'`
   - Por ahora la integración con Mis Guardados (tab "Vendedores") queda fuera de scope; solo asegurar que el botón funcione y persista el estado

7. **Routing:**
   - Agregar `/marketplace/vendedor/:usuarioId` con guard de modo Personal
   - Activar el botón "Ver perfil →" del detalle del artículo (Sprint 3)

## Lo que NO entra en este sprint

- Reseñas del vendedor (descartadas en v1)
- Sistema de niveles automático (Sprint 8)
- Tab "Vendedores" en Mis Guardados (queda como mejora futura)

## Reglas obligatorias

- Paso a paso, plan primero.
- TypeScript estricto, NUNCA `any`.
- Tailwind v4 con `lg:` y `2xl:`.
- Idioma: español.
- `data-testid` en interactivos.
- KPIs con estética profesional (sin círculos pastel con icono dentro, sin emojis como datos, sin saltos tipográficos exagerados — ver Regla 13 de TOKENS_GLOBALES).
- El query del tiempo de respuesta debe ser eficiente — usa índices o cachea si es necesario. Si toma >500ms, considera materializar el cálculo en otro lado.

## Resultado esperado

1. Click en "Ver perfil →" desde el detalle navega al perfil del vendedor.
2. Se muestran KPIs reales (no hardcodeados).
3. Las tabs cargan publicaciones activas y vendidas correctamente.
4. Botón "Enviar mensaje" abre ChatYA con el contexto correcto.
5. Botón "Seguir vendedor" funciona y persiste estado entre sesiones.
6. En tab "Vendidos" las cards muestran overlay "VENDIDO".
7. Responsive correcto en las 3 resoluciones.

## Plan de trabajo

Espera confirmación entre bloques:

1. Plan detallado
2. Endpoints backend + query del tiempo de respuesta
3. Hooks React Query
4. Layout móvil del perfil (header, hero, KPIs, botones)
5. Tabs + grid de publicaciones
6. Layout desktop
7. Integración con ChatYA (botón mensaje) y `useVotos` (seguir)
8. QA completo

**Empieza con el plan.**
