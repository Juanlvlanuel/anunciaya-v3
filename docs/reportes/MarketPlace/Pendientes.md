# Pendientes en MarketPlace

**Última actualización:** 2026-05-14 — segunda sesión (auditoría cross-sección de los 3 buscadores: cobertura completa de campos, accent-insensitive con `unaccent` BE + `normalize('NFD')` FE, prefix matching en MP, performance al borrar con `useDeferredValue` + debounce, etiqueta "Matriz" en sucursales, click → perfil del negocio. Limpieza: eliminado el botón "Ver todos los resultados" en los 3 overlays + página dedicada de resultados de MP. Patrón consolidado en `docs/estandares/PATRON_BUSCADOR_SECCION.md`. Cierra C.4 (P5) y E.1.)

Documento maestro de pendientes del módulo MarketPlace. Lista lo que falta implementar, ordenado por prioridad de impacto. Items cerrados se conservan al final como historial.

---

## A. Pruebas E2E pendientes

Cerrar estos flujos antes de pasar a auditoría visual restante.

- ⏳ **Comprador end-to-end** — descubrimiento → detalle → Q&A → contacto (chat/WhatsApp) → guardado → chat se abre con preview de oferta encima del input (nuevo flujo del 09-may-2026).
- ⏳ **Vendedor end-to-end** — wizard publicar → moderación → recibir pregunta → responder → editar/pausar/marcar vendido → ver KPIs en perfil.
  - **Desbloqueado** (C.2 cerrado): el panel `/mis-publicaciones` ya expone Editar / Pausar / Reactivar / Marcar vendido / Eliminar con KPIs por publicación.
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

### C.2 — Sección "Mis Publicaciones"

✅ **Cerrado** (sesión 13-may-2026). Panel del vendedor implementado con identidad cyan en `apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx`.

**Lo que entregó la sesión:**

| Capa | Entregable | Ubicación |
|------|------------|-----------|
| **Backend** | Endpoint ya existía: `GET /api/marketplace/mis-articulos?estado=&limit=&offset=` (no `/articulos/mios` como decía la nota original) | `apps/api/src/routes/marketplace.routes.ts:168` |
| **Hooks React Query** | `useMisArticulosMarketplace(estado, paginacion)` con `keepPreviousData` | `useMarketplace.ts` |
| | `useCambiarEstadoArticuloMarketplace()` (PATCH a `/articulos/:id/estado`) | `useMarketplace.ts` |
| | `useEliminarArticuloMarketplace()` (DELETE a `/articulos/:id`) | `useMarketplace.ts` |
| | `useReactivarArticulo()` reutilizado | `useMarketplace.ts:358` |
| **Query key** | `marketplace.misArticulos(estado, paginacion)` | `apps/web/src/config/queryKeys.ts` |
| **Componente** | `CardArticuloMio` — card densa B2B con foto + título + precio + pill estado + KPIs inline (vistas/mensajes/guardados/días) + menú "⋯" contextual | `apps/web/src/components/marketplace/CardArticuloMio.tsx` |
| **Página** | Header dark cyan (icono `Package`, glow `rgba(6,182,212,0.07)`), 3 tabs (Activas/Pausadas/Vendidas), banner condicional de borrador (lee `wizard_marketplace_${usuarioId}_nuevo` en localStorage), grid responsivo, FAB móvil, CTA desktop, modales de confirmación para Marcar vendido y Eliminar | `apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx` |

**Comportamientos validados al implementar:**
- `vendida` → desaparece del feed público, desaparece de Mis Guardados de otros usuarios (filtro en `guardados.service.ts`), permanece en BD para historial del vendedor.
- `pausada` → mismo comportamiento que vendida pero reversible vía "Re-Activar" (+30 días).
- `eliminada` → soft delete (`deleted_at=NOW()`) + cleanup R2 con reference counting; ya filtrado en feed y Guardados.
- Re-Activar usa el endpoint específico `POST /articulos/:id/reactivar` (no el PATCH de estado) porque también extiende `expira_at +30d` y resetea `vendida_at=NULL`; cubre los casos `pausada → activa` Y `vendida → activa` (vendedor que marcó vendido por error o cuya venta se cayó).

**Refinamientos UI agregados en la 2da sesión del 13-may-2026:**

| Aspecto | Cambio |
|---------|--------|
| Grid móvil | `grid-cols-1` → `grid-cols-2 gap-2.5` (dos cards por fila estilo Facebook Marketplace) |
| Card móvil | Padding y typography compactados (`p-2.5`, título `text-sm`, precio `text-base`); precio + unidad + condición con `flex-wrap` para que la condición baje a otra línea si el precio es largo |
| Card KPIs | `flex-nowrap` → `flex-wrap` para que los chips bajen a 2 líneas en cards de ~180px |
| Overlay de estado | `vendida` y `pausada` ahora muestran overlay `bg-slate-900/55 backdrop-blur-[1px]` sobre la foto con icono + texto centrado ("VENDIDO" / "PAUSADO"); el pill de estado en la esquina fue retirado (el overlay lo reemplaza) |
| Menú "⋯" dropdown | Compactado en móvil (`w-44`, items `px-3 py-2 gap-2.5 h-4`); `lg:` conserva `w-56` `px-3.5 py-2.5 gap-3 h-5`. Retirado `overflow-hidden` del `<article>` para que el dropdown no se recorte (la foto preserva el rounded con `rounded-t-xl`) |
| Etiqueta del menú | "Reabrir publicación" → "Re-Activar" (más corto y consistente con la acción de `pausada`) |
| Toggle MarketPlace/Servicios | Top-level en el header con gradient teal (MP) / sky (Servicios). Móvil: icon-only `h-9 w-9 border-2 rounded-full` fijo a la izquierda + divider `h-7 w-px bg-white/20` + tabs scrollables a la derecha. Desktop: bloque izquierda en flex-col con título arriba + toggles abajo; bloque centro en flex-col con subtítulo arriba + tabs `self-end` abajo; flex padre con `items-end` para alinear toggles y tabs al mismo nivel vertical |
| UI de Servicios | Pre-cableada — `TABS_POR_TIPO` con 2 tabs (`activa` + `pausada`) para Servicios; el body sigue mostrando empty "Próximamente" con paleta sky. `useEffect` autocorrige `tabActivo` si no aplica al tipo (ej. cambiar de `vendida` MP a Servicios → resetea a `activa`) |
| Wizard | Pasos reorganizados (Fotos → Título → Descripción primero; Condición → Precio → Unidad → Acepta ofertas después). Campos opcionales con UX tristate (clickear chip activo lo deselecciona). 4 confirmaciones legales firmadas (`licito`, `enPoder`, `honesto`, `seguro`) persistidas como JSONB con `version` (`CHECKLIST_VERSION`) y `aceptadasAt` (inyectado por backend) |

**Migraciones SQL aplicadas:**
- `docs/migraciones/2026-05-13-marketplace-condicion-opcional-unidad-venta.sql` — permite NULL en `condicion` y `acepta_ofertas`, agrega `unidad_venta VARCHAR(30)`.
- `docs/migraciones/2026-05-13-marketplace-confirmaciones.sql` — agrega `confirmaciones JSONB` para evidencia legal.

**Decisión arquitectural deferida al sprint de Servicios:**
- Servicios tendrá solo 2 estados (`activa` + `pausada`), no replica el `vendida` del MarketPlace. Razón: un servicio no se "vende y desaparece" — es recurrente. Cuando el vendedor ya no lo ofrece, lo elimina directamente. Guardado en memoria como `project_servicios_estados.md` para el sprint futuro.

Ver detalle de la sección en `docs/arquitectura/MisPublicaciones.md` (doc atemporal de referencia con anatomía móvil/desktop, contrato con el wizard, política de modo Personal, schema de BD relevante, jobs cron de auto-expiración y 8 decisiones arquitectónicas).

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
- ✅ P4 Wizard Publicar — móvil 375 + laptop 1366 + desktop 1920 (cerrado 12-may-2026; rediseño alineado a P1/P2/P3 con header dark + glow teal, grid `3fr_2fr` desktop, cards bordeadas por bloque, vista previa en vivo con `<CardArticuloFeed>` real, tips contextuales por paso, subida múltiple paralela hasta 8 fotos, selección manual de portada con icono `Star`, auto-save en `localStorage` cross-sesión, cleanup R2 con reference-count contra `IMAGE_REGISTRY`)
- ✅ P5 Buscador — cerrado 14-may-2026 con la auditoría cross-sección. Ya no existe "P5 Resultados" como pantalla aparte: la página dedicada `/marketplace/buscar?q=` se eliminó (sobre-ingeniería para el dataset piloto) y todo el flujo vive en el overlay. El patrón está consolidado en `docs/estandares/PATRON_BUSCADOR_SECCION.md` (3 secciones siguen el mismo estándar). Endpoint backend `buscarArticulos` se conservó por si la página completa se reabre cuando el volumen lo justifique.
- ✅ P6 Página Pública compartible — móvil + laptop + desktop (cerrado en sesión cross-cutting del 09-may-2026, ver C.1 y `docs/arquitectura/Paginas_Publicas.md`)

---

## D. Bugs funcionales abiertos

_(Sin bugs abiertos. D.1 – D.11 ya cerrados — ver D.cerrados abajo.)_

### D.cerrados — Bugs ya resueltos

- ✅ **D.1 — Botón "Por chat" sin contexto** — renombrado a "Mensaje privado" con tooltip explicativo en `SeccionPreguntas.tsx`.
- ✅ **D.2 — WhatsApp en P3 Perfil del Vendedor** — botón condicional a `perfil.telefono` implementado en `PaginaPerfilVendedor.tsx`.
- ✅ **D.3 — Botón "Seguir vendedor" sin efecto funcional** — reemplazado por "Agregar a contactos" conectado al sistema real `chat_contactos` de ChatYA (commit `d3079ce`).
- ✅ **D.4 — `oferta.sucursalId` se propagaba como `null` al chat** — `PaginaPerfilNegocio.tsx` ya no descarta el campo en el `.map()` del feed; las convs persona↔negocio se guardan con `participante2_sucursal_id` correcto (commit `363c7e1` del 09-may-2026).
- ✅ **D.5 — "Imprenta FindUS · Imprenta FindUS" duplicado en header de chat / popup de negocio / panel info** — backend `obtenerDatosParticipante` y `listarContactos` normalizan a `'Matriz'`/`null`/nombre; frontend `CardNegocio` / `PaginaNegocios` / `PaginaPerfilNegocio` siembran con verificación de `esPrincipal` + `totalSucursales > 1` (sesión del 11-may-2026).
- ✅ **D.6 — Mis Guardados mostraba artículos MP vendidos/pausados/expirados** — filtro `estado='activa'` agregado a `guardados.service.ts` (11-may-2026).
- ✅ **D.7 — Carrusel embla autoplay rompía con ≤1 slides** — guard en `useCarruselRotativo.ts` solo incluye el plugin cuando `total > 1`.
- ✅ **D.8 — Corazón no marcaba como guardado en perfil del vendedor** — `obtenerArticulosDeVendedor()` no devolvía el flag `guardado` en las publicaciones del perfil público. Ahora acepta `visitanteId` y hace `EXISTS` contra `guardados` con `entity_type='articulo_marketplace'` (13-may-2026).
- ✅ **D.9 — Card del vendedor "resucitaba" como guardada al regresar** — `aplicarCambioGuardadoEnCache` solo actualizaba `totalGuardados` en el cache de publicaciones de vendedor, no el flag `guardado`. Sin esto, al navegar fuera del perfil y volver, el cache stale mostraba el corazón marcado aunque el usuario lo hubiera quitado. Ahora actualiza ambos campos (13-may-2026).
- ✅ **D.10 — `unidadVenta` perdida en Mis Guardados** — el `SELECT` de `guardados.service.ts` no incluía `a.unidad_venta`. Agregado como `articuloUnidadVenta` + mapeo a `unidadVenta` en la respuesta (13-may-2026).
- ✅ **D.11 — Eliminar guardados en batch desde Mis Guardados no sincronizaba el corazón en feed/perfil** — `PaginaGuardados.eliminarSeleccionados` solo invalidaba `['guardados']`. Ahora llama a `aplicarCambioGuardadoEnCache` por cada item marketplace; la función se exportó desde `useGuardados.ts` para ese uso (13-may-2026).

---

## E. Pendientes externos referenciados desde MarketPlace

### E.1 — OverlayBuscadorOfertas (módulo Ofertas)

✅ **Cerrado** (sesión 14-may-2026 — primera mitad). Implementación sobria del patrón canónico:

- Overlay con sugerencias en vivo + búsquedas recientes (sin populares ni log).
- Endpoint backend `GET /api/ofertas/buscar/sugerencias` con ILIKE simple sobre título + descripción + nombre del negocio (sin FTS pesado — el dataset por ciudad es chico).
- Click en sugerencia → `navigate('/ofertas?oferta=:id')` y `PaginaOfertas` abre `ModalOfertaDetalle`. Sin página de resultados dedicada — el feed in-page ya filtra por `useSearchStore.query`.
- Helper `busquedasRecientes.ts` generalizado para soportar 3 secciones (`marketplace`/`ofertas`/`negocios`) con clave de localStorage por sección.
- Mismo sprint cerró el equivalente para Negocios (filtro in-memory contra `useNegociosLista()`, sin endpoint nuevo).

### E.2 — Auditoría cross-sección de los 3 buscadores

✅ **Cerrado** (sesión 14-may-2026 — segunda mitad). Auditoría completa que llevó al patrón consolidado en `docs/estandares/PATRON_BUSCADOR_SECCION.md`:

- **Cobertura de campos extendida**: Negocios backend ahora filtra también por categoría/subcategoría/dirección/ciudad (antes solo nombre del negocio + sucursal). Ofertas backend ahora también por categoría/subcategoría del negocio.
- **Accent-insensitive en backend**: `unaccent()` en los 3 services (Negocios, Ofertas, MarketPlace). Migración `docs/migraciones/2026-05-14-extension-unaccent.sql`.
- **Accent-insensitive en frontend**: helper `normalizarTexto.ts` (NFD + `\p{Diacritic}`) para filtros in-memory de Negocios.
- **Prefix matching en MarketPlace**: FTS español combinado con OR `ILIKE` para que "bici" encuentre "bicicleta" sin perder el ranking del FTS.
- **Performance al borrar con Backspace**: `useDeferredValue` en PaginaNegocios, debounce 250ms del query en `useOfertasFeedCerca`.
- **Etiqueta "Matriz" en sucursales** del overlay de Negocios — mismo patrón de `CardNegocio` / `PaginaPerfilNegocio`.
- **Click en sugerencia de Negocios → perfil completo** (`/negocios/:sucursalId`).
- **Limpieza**: eliminado el botón "Ver todos los resultados" en los 3 overlays + página dedicada de resultados de MP (`PaginaResultadosMarketplace`, `FiltrosBuscador`, `useFiltrosBuscadorUrl`, `useBuscadorResultados`, ruta `/marketplace/buscar`, query key `marketplace.resultadosBusqueda`). Endpoint backend `buscarArticulos` conservado.
- **Lecciones técnicas** registradas en `docs/estandares/LECCIONES_TECNICAS.md` sección "Buscadores y FTS" (9 puntos).

---

## Próximo paso natural

Por orden de impacto:

1. **A — E2E del vendedor** (desbloqueado por C.2) — probar wizard publicar → recibir pregunta → responder → pausar/marcar vendido/eliminar desde el nuevo panel `/mis-publicaciones`. Validar que `vendida/pausada/eliminada` desaparecen de Mis Guardados de otros usuarios.
2. **A — E2E del comprador** — los flujos están listos, solo falta validación manual o tests automatizados.
3. **B.3 — Stories de actividad** — feature de descubrimiento (requiere diseño + backend). Único pendiente UI/feature del módulo.
