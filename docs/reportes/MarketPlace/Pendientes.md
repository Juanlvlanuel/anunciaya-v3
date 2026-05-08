# Pendientes en MarketPlace

**Última actualización:** 2026-05-07 (P3 → Perfil de Usuario neutral + fondo degradado)

Documento maestro de pendientes del módulo MarketPlace. Consolidado tras el rediseño cross-secciones (headers/tabs/iconos estandarizados en las 6 secciones del 06-may-2026).

---

## A. Pruebas E2E pendientes

Originalmente nos detuvimos aquí antes del paréntesis del rediseño UI. Cerrar estos flujos antes de pasar a Fase C visual.

- ⏳ **Comprador end-to-end** — descubrimiento → detalle → Q&A → contacto (chat/whatsapp) → guardado.
- ⏳ **Vendedor end-to-end** — wizard publicar → moderación → recibir pregunta → responder → editar/pausar → ver KPIs en perfil.
- ✅ ~~Compartir artículo P6~~ (cerrado: header público compartido + footer + autoComplete + CTA login).

---

## B. Plan original de rediseño MarketPlace (4 fases)

Plan iniciado antes del rediseño cross-secciones. Solo cerramos Fase 1.

| Fase | Alcance | Estado |
|------|---------|--------|
| **1. Card nueva** | Card ancha tipo Facebook: avatar+nombre vendedor, multi-imágenes, comentarios (Q&A) inline. Click avatar → ModalImagenes, click nombre → P3 perfil. | ✅ Hecho |
| **2. Layout móvil full-width** | En móvil, una sola columna de cards a ancho completo. Desktop mantiene grid o ancho controlado. | ✅ Hecho |
| **3. Sección "actividad de contactos"** | Tipo stories arriba — actividad reciente de vendedores que sigues. **Requiere backend**. | ⏳ |
| **4. Sistema de contactos ChatYA** | Botón "agregar a contactos" en perfil vendedor → contacto fijo en ChatYA. **Requiere migración + API**. | ⏳ |

---

## C. Pendientes UI/diseño conocidos

### C.1 — Rediseño completo P2 Detalle del Artículo

Revisar P2 en las 3 resoluciones (móvil 375px, laptop 1366×768, desktop 1920×1080) y proponer rediseño profesional alineado con Regla 13 de `TOKENS_GLOBALES.md` (B2B, sin caricatura).

### C.2 — Sección "Mis Publicaciones"

Existe la ruta y el archivo `apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx` pero está como **placeholder "Próximamente"** — solo tiene tabs visuales (activas/borradores/expiradas) y CTA. **Falta toda la implementación funcional**: listar artículos del usuario, editar, pausar, eliminar, ver KPIs por artículo.

Hooks/API necesarios:
- Endpoint backend: `GET /marketplace/articulos/mios?estado=activos|borradores|expiradas`
- Hook React Query: `useMisArticulosMarketplace(estado)`
- Reusar `CardArticulo` o crear `CardArticuloPropio` con acciones inline (editar / pausar / eliminar).

### C.3 — Perfil de Usuario (no necesariamente vendedor)

Hoy el componente `BotonComentarista` y la mini-popup desktop apuntan a
`/marketplace/vendedor/:id` (P3). La P3 funciona técnicamente con
usuarios que tienen 0 artículos (empty state "Sin publicaciones
activas"), pero el branding está sesgado:

- Header dice **"Perfil del Vendedor"** — alguien que solo comentó/preguntó
  en MP no es vendedor; es comprador o miembro de la comunidad.
- KPIs son `Activas` y `Vendidos` — irrelevantes para alguien que solo
  interactúa.
- El empty state "Sin publicaciones activas" suena como crítica al
  usuario por no haber vendido.

**Refactor propuesto:**
1. Renombrar a "Perfil de Usuario" o "Perfil en MarketPlace" — neutral
   para vendedor y comprador.
2. Métricas relevantes para compradores cuando aplique:
   - Preguntas hechas en artículos.
   - Artículos guardados (públicos vs privados — decidir).
   - Antigüedad / "Miembro desde".
3. Cuando el usuario sí ha publicado, mostrar Activas + Vendidos como
   sección secundaria (no protagonista del perfil).
4. El bloque "Datos del vendedor" sigue siendo útil cuando el usuario es
   vendedor — solo se vuelve sub-sección de un perfil más amplio.
5. URL sugerida: `/marketplace/usuario/:id` (con redirect desde
   `/marketplace/vendedor/:id` para no romper enlaces existentes).

Detonado por: feature de "Conexión usuario↔usuario vía comentarios"
(v1.3) que abrió el flujo de click en cualquier comentarista, incluyendo
los que nunca han publicado nada.

### C.4 — Fase C visual restante

Pantallas y resoluciones por revisar:

- P2 Detalle del Artículo — laptop 1366 + desktop 1920
- P3 Perfil del Vendedor — móvil 375 + laptop 1366 + desktop 1920
- P4 Wizard Publicar — móvil 375 + laptop 1366 + desktop 1920
- P5 Buscador y resultados — móvil 375 + laptop 1366 + desktop 1920
- P6 Página Pública compartible — móvil 375 + laptop 1366 + desktop 1920

---

## D. Bugs funcionales abiertos

_(Sin bugs abiertos. D.1 y D.2 ya cerrados — ver D.cerrados abajo.)_

### D.3 — Botón "Seguir vendedor" sin efecto funcional

**Estado actual:** El botón "Seguir" en P3 (Perfil de Usuario) registra correctamente el voto en BD (`votos` con `entity_type='usuario'`, `tipo_accion='follow'`) pero **no detona ningún efecto visible**:

- ❌ No genera notificación al usuario seguido.
- ❌ No aparece en ningún feed/timeline del seguidor.
- ❌ No se materializa en `PaginaGuardados` — los tabs son `ofertas | negocios | marketplace | servicios`, no hay tab "Vendedores/Usuarios".
- ❌ El endpoint `GET /api/seguidos?entityType=usuario` devuelve data cruda (sin JOIN para resolver datos del usuario).

**Pendiente decidir:** qué efecto debe tener seguir a alguien. Opciones:
1. **Tab "Vendedores" en Mis Guardados** — listar usuarios seguidos con avatar + nombre + chip "X publicaciones activas" + acceso al perfil. Requiere JOIN nuevo en `obtenerSeguidos` para `entityType='usuario'`.
2. **Stories de actividad reciente** (Bucket B Fase 3) — mostrar arriba del feed cuando un seguido publica algo nuevo.
3. **Notificación al seguido** — opcional; depende de si lo queremos sigiloso (sin notificar) o tipo Twitter (sí notifica).
4. **Sistema de contactos ChatYA** (Bucket B Fase 4) — convertir "Seguir" en "Agregar a contactos" y que aparezca en lista fija de ChatYA.

**Bloqueante:** El botón vive en P3 desde Sprint 5 pero no hace nada útil — confunde al usuario que lo presiona y no observa cambio.

### D.cerrados — Bugs ya resueltos

- ✅ **D.1 — Botón "Por chat" sin contexto** — renombrado a "Mensaje privado" con tooltip explicativo en `SeccionPreguntas.tsx`.
- ✅ **D.2 — WhatsApp en P3 Perfil del Vendedor** — botón condicional a `perfil.telefono` ya implementado en `PaginaPerfilVendedor.tsx`.

---

## E. Pendientes externos referenciados desde MarketPlace

### E.1 — OverlayBuscadorOfertas (módulo Ofertas)

Estrictamente no es de MarketPlace, pero quedó listado aquí porque hereda el patrón de `OverlayBuscadorMarketplace`.

El botón Search en el header de Ofertas dispara `useSearchStore.abrirBuscador()` pero no hay un overlay propio que escuche ese estado. Crear `apps/web/src/components/ofertas/OverlayBuscadorOfertas.tsx` siguiendo el patrón de MP:

- Sugerencias por título de oferta
- Términos populares (analytics existentes)
- Filtros por categoría/cerca/etc.
- Montar el overlay en `PaginaOfertas.tsx`

Sprint propio (estimado similar al Sprint 6 del MarketPlace).

---

## Próximo paso natural

Por orden de menor a mayor esfuerzo y dependencias:

1. **Bucket A** — terminar pruebas E2E comprador/vendedor (sin código nuevo, solo verificación).
2. **Bucket C.3** — refactor de P3 a "Perfil de Usuario" (necesario para que la conexión usuario↔usuario via comentarios se sienta natural a compradores).
3. **Bucket C.2** — implementar Mis Publicaciones (placeholder ya existe; falta backend + listado + acciones).
4. **Bucket C.1** — rediseño completo P2 Detalle del Artículo.
5. **Bucket B Fase 3 / Fase 4** — stories + contactos ChatYA (requieren backend).
6. **Bucket C.4** — Fase C visual restante (auditoría amplia).
