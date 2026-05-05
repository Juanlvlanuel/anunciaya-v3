# Pendientes detectados durante verificación funcional Sprint 9.2

**Fecha:** 2026-05-05
**Contexto:** Detectados durante Fase A.2 (Q&A backend + frontend 10a–10g) del cierre de MarketPlace v1.1.
**Estado:** No bloqueantes para cerrar Sprint 9.2. Resolverse en Fase C (revisión visual exhaustiva) o como Sprint 9.3 separado.

---

## 1. Rediseño completo de la P2 Detalle del Artículo

**Reportado por Juan durante 10a:** *"la UI es muy básica, no parece encajar el espacio. Le ocupas darle un re-diseño completo a toda esta página."*

**Acción:** En Fase C revisar la P2 en las 3 resoluciones (móvil 375px, laptop 1366×768, desktop 1920×1080) y proponer un rediseño profesional alineado con Regla 13 de TOKENS_GLOBALES.md (B2B, sin caricatura).

---

## 2. Sección "Mis Publicaciones" no implementada

**Reportado durante 10c:** al loguearse como vendedor, no hay una pantalla dedicada para que el dueño vea/gestione sus propios artículos.

**Acción:** definir si va dentro de Perfil Personal, dentro de la P3 Perfil del Vendedor cuando es el propio usuario, o como pantalla separada. Hoy el vendedor llega a sus artículos solo si entra al detalle del artículo individualmente.

---

## 3. Click en notificación no redirige al artículo

**Reportado durante 10c:** al recibir la notificación `marketplace_nueva_pregunta`, hacer click en ella no abre la P2 Detalle del artículo. El vendedor tiene que navegar manualmente.

**Acción:** revisar el handler de click en notificaciones para que lea `referencia_id` + `referencia_tipo='marketplace'` y haga `navigate(\`/marketplace/articulos/\${referenciaId}\`)`.

---

## 4. Botón "Por chat" sin contexto visual claro

**Reportado durante 10f:** el vendedor hizo click en "Por chat" sin saber qué pasaba; antes del fix, eliminaba la pregunta del Q&A público sin avisar.

**Estado actual:** ya quitamos el soft delete (la pregunta se mantiene pública aunque se abra chat). Pero el botón sigue siendo poco descriptivo.

**Acción:** cambiar texto a "Mensaje privado" o agregar tooltip explicativo: *"Abre un chat privado con el comprador. La pregunta sigue visible públicamente."*

---

## 5. Comprador no ve su pregunta pendiente

**Reportado durante 10d:** después de enviar una pregunta, el comprador ve "Sé el primero en preguntar" porque la sección solo muestra preguntas respondidas. Confunde, parece que la pregunta se perdió.

**Acción:** mostrarle al comprador específico (no a otros visitantes) un bloque tipo *"Tu pregunta está pendiente de respuesta"* con la pregunta que envió + opción de retirarla. Reusa el endpoint `DELETE /preguntas/:id/mia` que ya existe.

---

## 6. WhatsApp en P3 Perfil del Vendedor

**Reportado durante 10c (variación):** al ver el perfil del vendedor solo aparece "ChatYA" + "Seguir vendedor". Por consistencia con la P2 Detalle (que sí tiene WhatsApp), debería estar también aquí cuando el vendedor tenga teléfono.

**Acción:** requiere extender backend (`getVendedorMarketplace` debe devolver `telefono`) + tipo `PerfilVendedorMarketplace` + agregar el botón. Decidir layout: 3 botones en fila o 2+1.

---

## 7. (Mejora ya aplicada — FYI) Botones ChatYA con logo y `abrirChatYA()`

**Aplicado el 2026-05-05** durante la verificación. Antes el botón decía "Enviar mensaje" con ícono Lucide y solo llamaba `abrirChatTemporal` sin abrir el panel. Quedó:

- Logo `/ChatYA.webp` reemplazando texto + ícono
- Llamada a `abrirChatYA()` después de `abrirChatTemporal`
- Aplicado en `BarraContacto.tsx` y `PaginaPerfilVendedor.tsx`
- En BarraContacto: botones lado a lado en mobile + desktop, gradiente verde `from-[#22C55E] to-[#15803D]` para WhatsApp

**No se requiere acción adicional.** Solo registrarlo como referencia.

---

## Orden sugerido de resolución

1. **Click en notif redirige al artículo** (3) — fix técnico simple, alta utilidad.
2. **Botón "Por chat" con texto/tooltip claro** (4) — fix cosmético rápido.
3. **Comprador ve su pregunta pendiente** (5) — UX importante para que el comprador no se confunda.
4. **WhatsApp en perfil del vendedor** (6) — backend + frontend, 15 min.
5. **Sección Mis Publicaciones** (2) — sprint propio.
6. **Rediseño completo P2 Detalle** (1) — sprint propio (Sprint 9.3 candidato).
