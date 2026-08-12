# Catálogo Público (full-screen) + Armar Pedido

> **Estado:** Fase 1 completa (frontend + backend). Pendiente QA E2E manual.
> **Rutas:** `/p/negocio/:sucursalId/catalogo` (pública) · `/negocios/:sucursalId/catalogo` (privada)
> Racional de producto: sesión de planeación 2026-08-11.

---

## 1. Qué es

Reemplaza al modal `ModalCatalogo.tsx` como punto de entrada al catálogo completo de un negocio: en vez de un modal, es una **página de pantalla completa** (mismo patrón dual público/privado que `PaginaPerfilNegocio.tsx`) donde el usuario puede además **armar un pedido** — elegir varios artículos con cantidad — y enviarlo por **ChatYA** o **WhatsApp** directo al negocio.

No es un carrito de e-commerce: no hay checkout, no hay pago, no hay tabla de pedidos en BD, y el negocio no tiene un módulo de "gestión de pedidos" en Business Studio. El pedido es solo un **mensaje bien formateado** — el negocio lo recibe en su chat/WhatsApp de siempre y contacta al cliente para confirmar, cobrar o coordinar entrega como ya lo hacía antes. Este es el modelo de "contacto directo" de AnunciaYA (ver §5 — Nota histórica).

Cards individuales del catálogo (imagen, nombre, descripción, precio) siguen el mismo diseño visual que `ModalCatalogo.tsx`/`ModalDetalleItem.tsx` — buscador, tabs Productos/Servicios, filtro por Categoría, destacados primero.

---

## 2. El pedido (estado local, sin persistencia)

`ItemPedido[]` vive en `useState` dentro de `PaginaCatalogoNegocio.tsx` — no hay store global ni tabla en BD. Se arma agregando artículos del catálogo (botón "Agregar" → stepper +/-), se puede anotar una nota libre, y **se descarta al enviarse o al salir de la página** (no persiste entre sesiones ni se recupera si el usuario recarga).

Desktop: panel fijo a la derecha del grid. Móvil: barra sticky inferior ("N artículos · $Total · Ver pedido →") que abre un `ModalBottom` con el mismo contenido (`PanelPedidoContenido`, componente compartido entre ambas variantes).

---

## 3. Envío por ChatYA (tipo de mensaje nuevo: `pedido`)

### 3.1 Backend

`chat_mensajes.tipo` es un CHECK constraint (`chat_msg_tipo_check`) — se agregó `'pedido'` a la lista de valores permitidos (migración `docs/migraciones/2026-08-11-chat-mensajes-tipo-pedido.sql`, aplicada por Juan). Reflejado en `apps/api/src/db/schemas/schema.ts`.

El flujo de envío (`enviarMensajeController` → `enviarMensaje` en `chatya.service.ts`) es **genérico** — no valida nada específico por tipo más allá del CHECK constraint de BD, así que agregar `'pedido'` no requirió endpoint ni lógica de servicio nueva. Único cambio puntual: el límite de 5000 caracteres (antes solo para `tipo==='texto'`) ahora también aplica a `'pedido'`, porque su `contenido` es un JSON que puede crecer con la lista de artículos.

`contenido` es un JSON plano compuesto en el cliente (no se re-deriva de ninguna tabla — a diferencia de `contexto`/`contextoPendiente`, que asumen un recurso real en BD):

```json
{
  "negocioNombre": "string",
  "sucursalId": "uuid | null",
  "items": [
    { "articuloId": "uuid", "nombre": "string", "precio": 0, "cantidad": 1, "subtotal": 0 }
  ],
  "total": 0,
  "nota": "string | null"
}
```

### 3.2 Frontend — envío

`PaginaCatalogoNegocio.tsx` → `handleEnviarChatYA()`:
1. Requiere sesión (`useAuthStore`) — sin login abre `ModalAuthRequerido` (`accion="chat"`, `urlRetorno` a la página actual).
2. `useIniciarChatNegocio()` **sin `contexto`** (chat genérico con el negocio — no hay recurso real al que anclar, a diferencia de una oferta o artículo individual).
3. `useChatYAStore.getState().enviarMensaje({ tipo: 'pedido', contenido: JSON.stringify(...) })` directo, fuera del patrón `contextoPendiente` (que existe para previsualizar recursos reales antes de enviarlos — no aplica a un pedido compuesto por el cliente).

### 3.3 Frontend — render

`BurbujaMensaje.tsx`: nuevo bloque `mensaje.tipo === 'pedido'` (mismo patrón que `'cupon'` — parseo del JSON en un IIFE con try/catch, tarjeta propia dentro de la burbuja compartida con avatar/hora/palomitas). Tarjeta tipo ticket: header oscuro con nombre del negocio, lista `Nx nombre — $subtotal`, total, nota opcional. Agregado también a la lista de exclusión del render de texto plano.

`ConversacionItem.tsx`: preview del último mensaje en la lista de chats muestra ícono `ShoppingBag` + "Pedido" (sin parsear el JSON — más simple y más robusto que el patrón de `'cupon'`, que si parsea el JSON truncado a 100 caracteres guardado en `ultimo_mensaje_texto` y puede fallar en pedidos largos).

---

## 4. Envío por WhatsApp (texto formateado, sin imagen)

`apps/web/src/utils/formatearPedidoWhatsApp.ts` arma el texto con negritas/emoji nativos de WhatsApp (`*texto*`, separadores `━━━`) para que se lea como un ticket aunque viaje como texto plano — **decisión de producto**: WhatsApp (`wa.me/?text=`) solo permite pre-cargar texto, nunca una imagen ni tarjeta rica, así que generar una imagen (canvas/html2canvas) se evaluó y se descartó para v1 por complejidad sin precedente en el código. Reutiliza `useAbrirWhatsApp()` (mismo hook que ya usa `ModalDetalleItem.tsx`, con soporte de WhatsApp alterno si el negocio tiene 2 números).

---

## 5. Nota histórica — por qué esto NO es el carrito que se eliminó

El 2026-06-15 se eliminaron las tablas `carrito`, `carrito_articulos`, `pedidos`, `pedido_articulos` (`docs/migraciones/2026-06-15-drop-pedidos.sql`) con el racional: *"El comercio local de AnunciaYA es de contacto directo, sin e-commerce con pedidos."*

Este feature es compatible con ese principio, no una reintroducción encubierta: no hay checkout, no hay estado de pedido en BD, no hay pago, no hay módulo de gestión en Business Studio. Es un **compositor de mensaje** — el pedido nace y muere en la sesión del navegador; lo único que persiste es el mensaje ya enviado en `chat_mensajes`, igual que cualquier otro mensaje de ChatYA.

---

## 6. Archivos

| Archivo | Rol |
|---|---|
| `apps/web/src/pages/private/negocios/PaginaCatalogoNegocio.tsx` | Página completa: grid de catálogo + estado del pedido + envío |
| `apps/web/src/utils/formatearPedidoWhatsApp.ts` | Formato de texto del pedido para WhatsApp |
| `apps/web/src/components/chatya/BurbujaMensaje.tsx` | Render de la tarjeta de pedido dentro del chat |
| `apps/web/src/components/chatya/ConversacionItem.tsx` | Preview "Pedido" en la lista de conversaciones |
| `apps/web/src/components/negocios/SeccionCatalogo.tsx` | Preview embebido en el perfil de negocio — su header/"Ver todos" ahora navega a la página en vez de abrir `ModalCatalogo` |
| `apps/web/src/router/index.tsx` | Rutas `/p/negocio/:sucursalId/catalogo` y `/negocios/:sucursalId/catalogo` |
| `apps/api/src/controllers/chatya.controller.ts` | Límite de 5000 caracteres extendido a `tipo==='pedido'` |
| `apps/api/src/db/schemas/schema.ts` | CHECK constraint `chat_msg_tipo_check` con `'pedido'` |
| `docs/migraciones/2026-08-11-chat-mensajes-tipo-pedido.sql` | Migración del CHECK constraint (aplicar en ambas Supabase) |

**Pendiente:** `apps/web/src/components/negocios/ModalCatalogo.tsx` quedó sin ningún caller tras este cambio (huérfano) — no se borró en esta sesión por precaución; confirmar con Juan antes de eliminarlo. QA E2E manual de los 2 flujos de envío (ChatYA y WhatsApp) en los 2 modos de ruta (pública/privada) todavía no se corrió.
