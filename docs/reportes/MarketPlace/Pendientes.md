# Pendientes en MarketPlace

**Última actualización:** 2026-05-11 (audit tras: limpieza vendedor_marketplace + filtros sucursal persona↔negocio + preview contexto chat + fix duplicación sucursalNombre + fix oferta.sucursalId propagado + KPI MarketPlace en Mis Guardados + filtro de estado en Mis Guardados)

Documento maestro de pendientes del módulo MarketPlace. Lista lo que falta implementar, ordenado por prioridad de impacto. Items cerrados se conservan al final como historial.

---

## A. Pruebas E2E pendientes

Cerrar estos flujos antes de pasar a auditoría visual restante.

- ⏳ **Comprador end-to-end** — descubrimiento → detalle → Q&A → contacto (chat/WhatsApp) → guardado → chat se abre con preview de oferta encima del input (nuevo flujo del 09-may-2026).
- ⏳ **Vendedor end-to-end** — wizard publicar → moderación → recibir pregunta → responder → editar/pausar/marcar vendido → ver KPIs en perfil.
  - **Bloqueado por C.2** (Mis Publicaciones sigue siendo placeholder, sin UI para acciones del vendedor sobre sus propios artículos).
- ✅ ~~Compartir artículo P6~~ (cerrado: header público compartido + footer + autoComplete + CTA login).

---

## B. Plan original de rediseño MarketPlace (4 fases)

| Fase | Alcance | Estado |
|------|---------|--------|
| **1. Card nueva** | Card ancha tipo Facebook: avatar+nombre vendedor, multi-imágenes, comentarios (Q&A) inline. Click avatar → ModalImagenes, click nombre → P3 perfil. | ✅ Hecho |
| **2. Layout móvil full-width** | En móvil, una sola columna de cards a ancho completo. Desktop mantiene grid o ancho controlado. | ✅ Hecho |
| **3. Sección "actividad de contactos"** | Tipo stories arriba — actividad reciente de vendedores que sigues. **Requiere backend**. | ⏳ |
| **4. Sistema de contactos ChatYA** | Botón "agregar a contactos" en perfil vendedor → contacto fijo en ChatYA. | ✅ Hecho (commit `d3079ce` del 09-may-2026; persiste en `chat_contactos`, sincroniza en tiempo real con la agenda del chat). |

---

## C. Pendientes UI/diseño conocidos

### C.1 — Rediseño completo P2 Detalle del Artículo

✅ **Cerrado** (sesión 11-may-2026). P2 ya está lista en las 3 resoluciones (móvil 375px + laptop 1366×768 + desktop 1920×1080) con el rediseño alineado a Regla 13 de `TOKENS_GLOBALES.md` (estética B2B, sin caricatura).

Adicionalmente cerrada la **Página pública compartible** del detalle del artículo (`/p/articulo-marketplace/:articuloId`) — la URL que se comparte por link desde la app y se ve sin sesión. Header gradient azul tipo Navbar + footer estilo home + fondo degradado + cards bordeadas + CTA "Únete gratis" personalizado teal con headline contextualizado por ciudad. Ver `docs/arquitectura/Paginas_Publicas.md`.

### C.2 — Sección "Mis Publicaciones" (PRIORIDAD ALTA)

**Estado:** ruta y archivo `apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx` existen pero están como **placeholder "Próximamente"** — solo tabs visuales (activas/borradores/expiradas) y CTA. **Falta toda la implementación funcional.**

**Bloquea:**
- E2E del vendedor (sin esta sección no hay forma de validar todo el ciclo).
- Validación del filtro nuevo de "Mis Guardados" (los items se filtran cuando un artículo cambia a `vendida`/`pausada`/`eliminada`, pero el vendedor no tiene UI para disparar esos cambios).

**Funcionalidad faltante:**

| Capa | Item | Estado |
|------|------|--------|
| **Backend endpoints** | `PATCH /api/marketplace/articulos/:id/estado` para `vendida`/`pausada`/`activa` | ✅ Implementado, sin UI que lo consuma |
| | `POST /api/marketplace/articulos/:id/reactivar` (extiende `expira_at` +30d) | ✅ Implementado |
| | `GET /marketplace/articulos/mios?estado=...` (listar artículos del vendedor) | ⏳ Verificar si existe; si no, crearlo |
| **Hooks React Query** | `useMisArticulosMarketplace(estado)` | ⏳ |
| | `useCambiarEstadoArticulo(id, estado)` mutation | ⏳ |
| | `useReactivarArticulo(id)` | ✅ Existe (`useMarketplace.ts:358`) |
| **UI** | Listado de artículos del usuario filtrado por tab (activas/pausadas/vendidas/expiradas/borradores) | ⏳ |
| | Card variant con acciones inline: editar / pausar / marcar vendido / eliminar / reactivar | ⏳ |
| | KPIs por artículo (vistas, mensajes, guardados, días restantes) | ⏳ |
| | Estado vacío por tab con CTA "Publicar artículo" | ⏳ |
| **Cron auto-pausar** | Pausa artículos cuando `NOW() > expira_at` cada 6h | ✅ Corriendo (`marketplace-expiracion.cron.ts`) |
| **Botón Reactivar** | UI en `PaginaArticuloMarketplace` cuando `estado='pausada'` | ✅ Visible al dueño cuando ve su propio artículo pausado |

**Comportamientos del estado del artículo (validar al implementar):**
- `vendida` → desaparece del feed público, desaparece de Mis Guardados de otros usuarios (filtro nuevo en `guardados.service.ts`), permanece en BD para historial del vendedor.
- `pausada` → mismo comportamiento que vendida pero reversible vía "Reactivar".
- `eliminada` → soft delete (`deleted_at=NOW()`); ya filtrado en feed y Mis Guardados.

### C.3 — Refactor "Perfil de Usuario" neutral

✅ **Cerrado** (commits `2811791` + `d3079ce` de mayo 2026). La P3 ahora es perfil neutral:
- URL canónica: `/marketplace/usuario/:id` (con redirect desde `/vendedor/:id`).
- KPIs visibles solo cuando es vendedor (`publicacionesActivas > 0 || vendidos > 0`).
- Empty state genérico para usuarios que solo comentaron.
- Botón "Agregar a contactos" reemplazó el follow social fantasma.

### C.4 — Fase C visual restante

Pantallas y resoluciones por revisar:

- ✅ P2 Detalle del Artículo — móvil + laptop + desktop (cerrado 11-may-2026, ver C.1)
- ✅ P3 Perfil del Usuario — móvil + laptop + desktop (cerrado 11-may-2026; refactor a perfil neutral, KPIs visibles solo si es vendedor, botón "Agregar a contactos", tabs Publicaciones/Vendidos)
- ⏳ P4 Wizard Publicar — móvil 375 + laptop 1366 + desktop 1920
- ⏳ P5 Buscador y resultados — móvil 375 + laptop 1366 + desktop 1920
- ✅ P6 Página Pública compartible — móvil + laptop + desktop (cerrado en sesión cross-cutting del 09-may-2026, ver C.1 y `docs/arquitectura/Paginas_Publicas.md`)

---

## D. Bugs funcionales abiertos

_(Sin bugs abiertos. D.1, D.2, D.3 ya cerrados — ver D.cerrados abajo.)_

### D.cerrados — Bugs ya resueltos

- ✅ **D.1 — Botón "Por chat" sin contexto** — renombrado a "Mensaje privado" con tooltip explicativo en `SeccionPreguntas.tsx`.
- ✅ **D.2 — WhatsApp en P3 Perfil del Vendedor** — botón condicional a `perfil.telefono` implementado en `PaginaPerfilVendedor.tsx`.
- ✅ **D.3 — Botón "Seguir vendedor" sin efecto funcional** — reemplazado por "Agregar a contactos" conectado al sistema real `chat_contactos` de ChatYA (commit `d3079ce`).
- ✅ **D.4 — `oferta.sucursalId` se propagaba como `null` al chat** — `PaginaPerfilNegocio.tsx` ya no descarta el campo en el `.map()` del feed; las convs persona↔negocio se guardan con `participante2_sucursal_id` correcto (commit `363c7e1` del 09-may-2026).
- ✅ **D.5 — "Imprenta FindUS · Imprenta FindUS" duplicado en header de chat / popup de negocio / panel info** — backend `obtenerDatosParticipante` y `listarContactos` normalizan a `'Matriz'`/`null`/nombre; frontend `CardNegocio` / `PaginaNegocios` / `PaginaPerfilNegocio` siembran con verificación de `esPrincipal` + `totalSucursales > 1` (sesión del 11-may-2026).
- ✅ **D.6 — Mis Guardados mostraba artículos MP vendidos/pausados/expirados** — filtro `estado='activa'` agregado a `guardados.service.ts` (11-may-2026).
- ✅ **D.7 — Carrusel embla autoplay rompía con ≤1 slides** — guard en `useCarruselRotativo.ts` solo incluye el plugin cuando `total > 1`.

---

## E. Pendientes externos referenciados desde MarketPlace

### E.1 — OverlayBuscadorOfertas (módulo Ofertas)

Estrictamente no es de MarketPlace, pero hereda el patrón de `OverlayBuscadorMarketplace`.

El botón Search en el header de Ofertas dispara `useSearchStore.abrirBuscador()` pero no hay un overlay propio que escuche ese estado. Crear `apps/web/src/components/ofertas/OverlayBuscadorOfertas.tsx` siguiendo el patrón de MP:

- Sugerencias por título de oferta
- Términos populares (analytics existentes)
- Filtros por categoría/cerca/etc.
- Montar el overlay en `PaginaOfertas.tsx`

Sprint propio (estimado similar al Sprint 6 del MarketPlace).

### E.2 — Inconsistencia `participante2_sucursal_id = NULL` en chats legacy

Hay 1 conv en BD local (probablemente más en staging) con `participante2_sucursal_id = NULL` aunque la oferta de origen tenía `sucursal_id` válido. Quedaron de antes del fix D.4. El filtro permisivo del backend (`listarConversaciones` + `contarTotalNoLeidos`) las hace visibles igual. **Limpieza opcional:** UPDATE de esos chats para que tengan el `participante2_sucursal_id` derivado del artículo/oferta de contexto.

---

## Próximo paso natural

Por orden de impacto:

1. **C.2 — Mis Publicaciones (Prioridad ALTA)** — desbloquea E2E del vendedor y permite probar el filtro de Mis Guardados con flujo real.
2. **A — E2E del comprador** — los flujos están listos, solo falta validación manual o tests automatizados.
3. **C.4 — Fase C visual restante** — P3 Perfil, P4 Wizard Publicar, P5 Buscador (P2 y P6 ya cerrados).
4. **B.3 — Stories de actividad** — feature de descubrimiento (requiere diseño + backend).
5. **E.1 — OverlayBuscadorOfertas** — sprint independiente.
