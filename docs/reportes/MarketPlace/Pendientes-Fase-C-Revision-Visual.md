# Pendientes de MarketPlace v1.1

**Última actualización:** 2026-05-05

---

## 1. Rediseño completo de la P2 Detalle del Artículo

Revisar P2 en las 3 resoluciones (móvil 375px, laptop 1366×768, desktop 1920×1080) y proponer un rediseño profesional alineado con Regla 13 de TOKENS_GLOBALES.md (B2B, sin caricatura).

---

## 2. Sección "Mis Publicaciones"

Al loguearse como vendedor, no hay una pantalla dedicada para ver/gestionar sus propios artículos. Hoy el vendedor llega a sus artículos solo si entra al detalle individualmente.

Definir si va dentro de Perfil Personal, dentro de la P3 Perfil del Vendedor cuando es el propio usuario, o como pantalla separada.

---

## 3. Click en notificación no redirige al artículo

Al recibir la notificación `marketplace_nueva_pregunta`, click en ella no abre la P2 Detalle. El vendedor tiene que navegar manualmente.

Revisar el handler de click en notificaciones para que lea `referencia_id` + `referencia_tipo='marketplace'` y haga `navigate(\`/marketplace/articulos/\${referenciaId}\`)`.

---

## 4. Botón "Por chat" sin contexto visual claro

El texto del botón es poco descriptivo. Cambiar a "Mensaje privado" o agregar tooltip: *"Abre un chat privado con el comprador. La pregunta sigue visible públicamente."*

---

## 5. Comprador no ve su pregunta pendiente

Después de enviar una pregunta, el comprador ve "Sé el primero en preguntar" porque la sección solo muestra preguntas respondidas. Confunde, parece que la pregunta se perdió.

Mostrarle al comprador específico un bloque tipo *"Tu pregunta está pendiente de respuesta"* con la pregunta que envió + opción de retirarla. Reusa el endpoint `DELETE /preguntas/:id/mia`.

---

## 6. WhatsApp en P3 Perfil del Vendedor

P3 solo muestra "ChatYA" + "Seguir vendedor". Por consistencia con la P2 Detalle (que sí tiene WhatsApp), agregar también aquí cuando el vendedor tenga teléfono.

Extender backend (`getVendedorMarketplace` debe devolver `telefono`) + tipo `PerfilVendedorMarketplace` + agregar el botón. Decidir layout: 3 botones en fila o 2+1.

---

## 7. OverlayBuscadorOfertas

El botón Search en el header de Ofertas dispara `useSearchStore.abrirBuscador()` pero no hay un overlay propio que escuche ese estado.

Crear `apps/web/src/components/ofertas/OverlayBuscadorOfertas.tsx` siguiendo el patrón de `OverlayBuscadorMarketplace`:
- Sugerencias por título de oferta
- Términos populares (analytics existentes)
- Filtros por categoría/CardYA/cerca/etc.
- Montar el overlay en `PaginaOfertas.tsx`

Sprint propio (estimado similar al Sprint 6 del MarketPlace).

---

## 8. Fase C — Revisión visual restante

Pantallas y resoluciones por revisar:

- P2 Detalle del Artículo — laptop 1366 + desktop 1920
- P3 Perfil del Vendedor — móvil 375 + laptop 1366 + desktop 1920
- P4 Wizard Publicar — móvil 375 + laptop 1366 + desktop 1920
- P5 Buscador y resultados — móvil 375 + laptop 1366 + desktop 1920
- P6 Página Pública compartible — móvil 375 + laptop 1366 + desktop 1920

**Flujos transversales:** comprador end-to-end, vendedor end-to-end, modo Comercial bloqueado, moderación, compartir, Q&A end-to-end.
