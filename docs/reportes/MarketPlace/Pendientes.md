# Pendientes en MarketPlace

**Última actualización:** 2026-05-06

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
| **2. Layout móvil full-width** | En móvil, una sola columna de cards a ancho completo. Desktop mantiene grid o ancho controlado. | ⏳ |
| **3. Sección "actividad de contactos"** | Tipo stories arriba — actividad reciente de vendedores que sigues. **Requiere backend**. | ⏳ |
| **4. Sistema de contactos ChatYA** | Botón "agregar a contactos" en perfil vendedor → contacto fijo en ChatYA. **Requiere migración + API**. | ⏳ |

---

## C. Pendientes UI/diseño conocidos

### C.1 — Rediseño completo P2 Detalle del Artículo

Revisar P2 en las 3 resoluciones (móvil 375px, laptop 1366×768, desktop 1920×1080) y proponer rediseño profesional alineado con Regla 13 de `TOKENS_GLOBALES.md` (B2B, sin caricatura).

### C.2 — Sección "Mis Publicaciones"

Al loguearse como vendedor, no hay una pantalla dedicada para ver/gestionar sus propios artículos. Hoy el vendedor llega a sus artículos solo si entra al detalle individualmente.

Definir si va dentro de Perfil Personal, dentro de la P3 Perfil del Vendedor cuando es el propio usuario, o como pantalla separada.

### C.3 — Fase C visual restante

Pantallas y resoluciones por revisar:

- P2 Detalle del Artículo — laptop 1366 + desktop 1920
- P3 Perfil del Vendedor — móvil 375 + laptop 1366 + desktop 1920
- P4 Wizard Publicar — móvil 375 + laptop 1366 + desktop 1920
- P5 Buscador y resultados — móvil 375 + laptop 1366 + desktop 1920
- P6 Página Pública compartible — móvil 375 + laptop 1366 + desktop 1920

---

## D. Bugs funcionales abiertos

### D.1 — Botón "Por chat" sin contexto visual claro

El texto del botón es poco descriptivo. Cambiar a "Mensaje privado" o agregar tooltip: *"Abre un chat privado con el comprador. La pregunta sigue visible públicamente."*


### D.2 — WhatsApp en P3 Perfil del Vendedor

P3 solo muestra "ChatYA" + "Seguir vendedor". Por consistencia con la P2 Detalle (que sí tiene WhatsApp), agregar también aquí cuando el vendedor tenga teléfono.

Extender backend (`getVendedorMarketplace` debe devolver `telefono`) + tipo `PerfilVendedorMarketplace` + agregar el botón. Decidir layout: 3 botones en fila o 2+1.

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
2. **Bucket B Fase 2** — layout móvil full-width (rápido, visual, sin backend).
3. **Bucket D** — bugs funcionales (cada uno aislado, fácil de cerrar).
4. **Bucket C.1 / C.2** — rediseños mayores (P2 Detalle, Mis Publicaciones).
5. **Bucket B Fase 3 / Fase 4** — stories + contactos ChatYA (requieren backend).
6. **Bucket C.3** — Fase C visual restante (auditoría amplia).
