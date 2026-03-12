# Reporte Técnico: Revisión ChatYA — Frontend

**Fecha:** 2026-03-10
**Revisado por:** Claude (Senior Technical Review)
**Alcance:** Análisis exclusivo del frontend — React 18 + Zustand + Socket.io

---

## Mapa de Archivos Analizados

### Archivos propios de ChatYA (27 archivos)

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `apps/web/src/stores/useChatYAStore.ts` | 2,157 | Store Zustand: estado, socket listeners, cache, optimistic UI |
| `apps/web/src/services/chatyaService.ts` | 686 | 31 endpoints HTTP |
| `apps/web/src/services/socketService.ts` | 211 | Cliente Socket.io singleton con detección de inactividad |
| `apps/web/src/types/chatya.ts` | 546 | Tipos TypeScript del módulo |
| `apps/web/src/hooks/useAudioChat.ts` | 448 | Grabación de voz con waveform |
| `apps/web/src/hooks/useImagenChat.ts` | ~300 | Pipeline de optimización de imágenes + LQIP |
| `apps/web/src/hooks/useDocumentoChat.ts` | 151 | Validación de documentos |
| `apps/web/src/components/layout/ChatOverlay.tsx` | 856 | Overlay persistente (cerrado/minimizado/expandido) |
| `apps/web/src/components/chatya/VentanaChat.tsx` | ~900 | Ventana de chat con header, mensajes, input |
| `apps/web/src/components/chatya/ListaConversaciones.tsx` | ~500 | Lista scrolleable con búsqueda inteligente |
| `apps/web/src/components/chatya/BurbujaMensaje.tsx` | ~700 | Burbuja de mensaje (texto, imagen, audio, doc, ubicación) |
| `apps/web/src/components/chatya/InputMensaje.tsx` | ~1,100 | Input con emojis, adjuntos, voz, drag & drop |
| `apps/web/src/components/chatya/ConversacionItem.tsx` | ~200 | Item individual de la lista |
| `apps/web/src/components/chatya/SeparadorFecha.tsx` | ~30 | Separador "Hoy", "Ayer", fecha |
| `apps/web/src/components/chatya/MenuContextualChat.tsx` | ~150 | Menú contextual de conversación |
| `apps/web/src/components/chatya/MenuContextualMensaje.tsx` | ~200 | Menú contextual de mensaje |
| `apps/web/src/components/chatya/MenuContextualContacto.tsx` | ~100 | Menú contextual de contacto |
| `apps/web/src/components/chatya/BarraBusquedaChat.tsx` | ~150 | Barra de búsqueda dentro del chat |
| `apps/web/src/components/chatya/ModalReenviar.tsx` | ~200 | Modal para reenviar mensaje |
| `apps/web/src/components/chatya/ModalUbicacionChat.tsx` | ~200 | Selector de ubicación |
| `apps/web/src/components/chatya/PanelInfoContacto.tsx` | ~500 | Panel lateral de info + archivos compartidos |
| `apps/web/src/components/chatya/GaleriaArchivosCompartidos.tsx` | ~200 | Galería por categoría |
| `apps/web/src/components/chatya/SelectorEmojis.tsx` | ~200 | Selector de emojis |
| `apps/web/src/components/chatya/EmojiNoto.tsx` | ~50 | Renderizado con fuente Noto |
| `apps/web/src/components/chatya/TextoConEmojis.tsx` | ~100 | Texto con emojis inline |
| `apps/web/src/components/chatya/VisorImagenesChat.tsx` | ~300 | Visor fullscreen con swipe |
| `apps/web/src/components/chatya/TexturaDoodle.tsx` | ~30 | Textura decorativa de fondo |

### Puntos de integración externa (16 archivos)

| Archivo | Tipo de integración |
|---------|---------------------|
| `BottomNav.tsx` | Badge `totalNoLeidos` + botón central ChatYA |
| `Navbar.tsx` | Badge `totalNoLeidos` en icono |
| `useUiStore.ts` | Estado `chatYAAbierto` / `chatYAMinimizado` |
| `useAuthStore.ts` | Dynamic import para `cargarNoLeidos` en login + modo switch |
| `CardNegocio.tsx` | Botón "ChatYA" → `abrirChatTemporal` |
| `CardNegocioDetallado.tsx` | Botón "ChatYA" → `abrirChatTemporal` |
| `ModalDetalleItem.tsx` | Botón contactar negocio → `abrirChatTemporal` + `abrirChatYA` |
| `ModalOfertaDetalle.tsx` | Botón contactar negocio → `abrirChatTemporal` + `abrirChatYA` |
| `PaginaPerfilNegocio.tsx` | Botón contactar → `abrirChatTemporal` |
| `ModalDetalleCliente.tsx` | Botón ChatYA en header cliente |
| `ModalDetalleTransaccionBS.tsx` | Botón contactar cliente |
| `ModalDetalleCanjeBS.tsx` | Botón contactar cliente |
| `TarjetaTransaccion.tsx` | Botón contactar en transacción ScanYA |
| `TarjetaVoucher.tsx` | Botón contactar en voucher ScanYA |
| `PaginaScanYA.tsx` | Badge + `inicializarScanYA()` |
| `ModalDetalleBilletera.tsx` | Botón contactar negocio desde billetera |

---

## Hallazgos por Severidad

---

### CRÍTICO (4 issues)

---

#### C1 — Filtración de borradores entre sesiones de usuario

**Archivo:** `useChatYAStore.ts` — líneas 268-281, 1538
**Impacto:** Al cerrar sesión, los borradores del usuario anterior persisten y se cargan para el siguiente usuario.

```typescript
// ESTADO_INICIAL — IIFE ejecutada UNA sola vez al cargar el módulo
borradores: (() => {
  try {
    const saved = localStorage.getItem('chatya_borradores');
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
})() as Record<string, string>,
```

```typescript
// limpiar() llamado en logout
limpiar: () => {
  set({ ...ESTADO_INICIAL }); // ← restaura los borradores del momento de carga, NO los limpia
},
```

**Problema:** `ESTADO_INICIAL` captura los borradores de localStorage al cargar el módulo JS (una sola vez). Cuando `limpiar()` se ejecuta en logout:
1. Los borradores en el state se resetean al valor capturado en la carga inicial (que puede incluir datos de un usuario anterior)
2. Los borradores en `localStorage` **nunca se borran** — `localStorage.removeItem('chatya_borradores')` nunca se llama
3. Si otro usuario inicia sesión en el mismo navegador, verá los borradores del usuario anterior

**Fix:** En `limpiar()`, agregar `localStorage.removeItem('chatya_borradores')` y forzar `borradores: {}`.

---

#### C2 — Mutación directa del estado en el listener de reacciones

**Archivo:** `useChatYAStore.ts` — líneas 2028-2054
**Impacto:** Mutación del estado de Zustand que puede causar que React no detecte cambios y no re-renderice.

```typescript
escucharEvento<EventoReaccion>('chatya:reaccion', ({ ... }) => {
  useChatYAStore.setState((prev) => ({
    mensajes: prev.mensajes.map((m) => {
      if (m.id !== mensajeId) return m;

      const reacciones = [...(m.reacciones || [])]; // ← array nuevo, PERO los objetos dentro son refs al state

      if (accion === 'agregada') {
        const existente = reacciones.find((r) => r.emoji === emoji);
        if (existente) {
          existente.cantidad += 1;              // ← MUTACIÓN DIRECTA del objeto del state anterior
          (existente.usuarios as string[]).push(usuarioId); // ← MUTACIÓN DIRECTA
        }
      }
      // ...
      return { ...m, reacciones };
    }),
  }));
});
```

**Problema:** `reacciones` es un nuevo array (spread), pero los objetos dentro son **referencias al estado anterior**. `existente.cantidad += 1` y `.push(usuarioId)` mutan directamente el estado previo de Zustand. Esto:
- Puede impedir que React detecte el cambio (shallow comparison ve el mismo objeto)
- Causa inconsistencias si otro setState concurrente lee el valor "viejo" ya mutado
- En modo estricto de React, causa bugs difíciles de reproducir

**Fix:** Clonar cada objeto reacción antes de mutarlo:
```typescript
const existente = reacciones.find((r) => r.emoji === emoji);
if (existente) {
  const idx = reacciones.indexOf(existente);
  reacciones[idx] = {
    ...existente,
    cantidad: existente.cantidad + 1,
    usuarios: [...(existente.usuarios as string[]), usuarioId],
  };
}
```

---

#### C3 — Deduplicación de mensajes propios basada en contenido

**Archivo:** `useChatYAStore.ts` — líneas 1606-1613
**Impacto:** Mensajes duplicados pueden ser silenciosamente descartados si el usuario envía dos mensajes idénticos rápidamente.

```typescript
escucharEvento<EventoMensajeNuevo>('chatya:mensaje-nuevo', ({ conversacionId, mensaje }) => {
  // ...
  if (mensaje.emisorId === miId) {
    const yaExiste = state.mensajes.some((m) =>
      m.id === mensaje.id ||
      // ← PROBLEMA: compara por contenido, no por ID temporal
      (m.id.startsWith('temp_') && m.conversacionId === conversacionId && m.contenido === mensaje.contenido)
    );
    if (yaExiste) return; // ← segundo mensaje idéntico se descarta
  }
});
```

**Escenario de fallo:**
1. Usuario envía "Hola" → se crea `temp_1` con contenido "Hola"
2. Usuario envía "Hola" de nuevo → se crea `temp_2` con contenido "Hola"
3. Socket event del primer "Hola" llega → encuentra `temp_1` con mismo contenido → correcto, return
4. Socket event del segundo "Hola" llega → encuentra `temp_1` (ya reemplazado pero con mismo contenido) → **incorrectamente lo descarta**

**Fix:** Usar un mapa de IDs temporales → IDs reales para rastrear la correspondencia, en lugar de comparar por contenido.

---

#### C4 — emitirEvento pierde eventos silenciosamente al desconectarse

**Archivo:** `socketService.ts` — líneas 186-193
**Impacto:** Confirmaciones de entrega, indicadores de lectura y estados de escritura se pierden si el socket se desconecta momentáneamente.

```typescript
export function emitirEvento<T = unknown>(evento: string, datos: T): void {
  if (socket?.connected) {
    socket.emit(evento, datos);
  }
  // ← Si no está conectado, el evento se pierde sin registro ni reintento
}
```

**Eventos afectados:**
- `chatya:entregado` — el emisor no recibe palomitas dobles grises
- `chatya:escribiendo` / `chatya:dejar-escribir` — indicadores de typing se pierden
- `chatya:estado` — el estado conectado/ausente no se sincroniza al reconectar

**Fix mínimo:** Para eventos críticos como `chatya:entregado`, implementar un buffer de reintento que se vacía al reconectar. Para typing indicators, la pérdida es aceptable.

---

### IMPORTANTE (8 issues)

---

#### I1 — cacheMensajes crece sin límite → memory leak

**Archivo:** `useChatYAStore.ts` — líneas 146-150, 277-280
**Impacto:** Cada conversación abierta agrega sus mensajes al cache, y nunca se eviccionan.

```typescript
cacheMensajes: {} as Record<string, Mensaje[]>,
cacheTotalMensajes: {} as Record<string, number>,
cacheHayMas: {} as Record<string, boolean>,
cacheFijados: {} as Record<string, MensajeFijado[]>,
```

**Problema:** Un usuario comercial que atiende decenas de clientes al día acumulará mensajes cacheados de todas las conversaciones. Con ~30 mensajes por conversación × 50+ conversaciones = 1,500+ objetos Mensaje en memoria que nunca se liberan hasta logout/refresh.

**Fix:** Implementar evicción LRU — mantener como máximo las últimas N conversaciones en caché (ej: 20) y evictar las más antiguas al agregar nuevas.

---

#### I2 — JSON.parse(localStorage) repetido en cada evento socket

**Archivo:** `useChatYAStore.ts` — líneas 1604, 1622, 1656, 1866
**Impacto:** Cada evento `chatya:mensaje-nuevo` y `chatya:leido` ejecuta `JSON.parse(localStorage.getItem('ay_usuario'))` — operación síncrona que bloquea el hilo principal.

```typescript
// Línea 1604 — dentro del listener de chatya:mensaje-nuevo
const usuario = JSON.parse(localStorage.getItem('ay_usuario') || '{}');
const miId = usuario?.id;

// Línea 1622
const modoActivo = usuario?.modoActivo || 'personal';

// Línea 1656 — dentro de un setTimeout anidado
const modo = (JSON.parse(localStorage.getItem('ay_usuario') || '{}')?.modoActivo || 'personal');

// Línea 1866 — dentro del listener de chatya:leido
const usuario = JSON.parse(localStorage.getItem('ay_usuario') || '{}');
```

**Problema:** En un chat activo, cada mensaje recibido parsea localStorage. Esto es:
- Redundante: `useAuthStore` ya tiene `usuario` en memoria
- Lento: JSON.parse + localStorage son síncronos
- Propenso a datos stale: si el usuario cambia de modo, el localStorage puede tener el valor anterior

**Fix:** Usar `useAuthStore.getState().usuario` en lugar de parsear localStorage.

---

#### I3 — Swipe-to-close tiene closures stale en el effect

**Archivo:** `ChatOverlay.tsx` — líneas 349-382
**Impacto:** El gesto de swipe-to-close puede funcionar erráticamente en móvil.

```typescript
useEffect(() => {
  // ...
  const onMove = (e: TouchEvent) => {
    if (dragStartY === null) return;  // ← lee del state en el closure
    const diff = e.touches[0].clientY - dragStartY;
    // ...
  };

  const onEnd = () => {
    if (dragStartY === null) return;  // ← siempre null en el closure original
    if (dragCurrentY > 100) cerrarChatYA();
    // ...
  };
  // ...
}, [chatYAAbierto, chatYAMinimizado, esDesktop, dragStartY, dragCurrentY, cerrarChatYA]);
//                                               ↑ re-registra listeners en CADA movimiento
```

**Problema:** El efecto depende de `dragStartY` y `dragCurrentY`, que cambian en cada frame del gesto. Esto causa que los event listeners de `touchmove` y `touchend` se eliminen y re-registren durante el gesto, lo que puede perder frames o causar jank.

**Fix:** Usar refs para `dragStartY` y `dragCurrentY` en lugar de state, y eliminar esos valores de las dependencias del effect.

---

#### I4 — Acciones en lote secuenciales en lugar de paralelas

**Archivo:** `ChatOverlay.tsx` — líneas 164-194
**Impacto:** Seleccionar 5 conversaciones y archivarlas toma 5x el tiempo necesario.

```typescript
const accionEnLote = useCallback(async (accion) => {
  const ids = Array.from(seleccionadas);
  cancelarSeleccion();
  for (const id of ids) {           // ← secuencial
    // ...
    switch (accion) {
      case 'fijar': await toggleFijar(id); break;   // ← espera cada una
      case 'archivar': await toggleArchivar(id); break;
      // ...
    }
  }
}, [...]);
```

**Fix:** Usar `Promise.all(ids.map(...))` para ejecutar en paralelo.

---

#### I5 — noLeidos individual no se incrementa en tiempo real

**Archivo:** `useChatYAStore.ts` — líneas 1700-1707
**Impacto:** El badge de "no leídos" en cada `ConversacionItem` no se actualiza en tiempo real.

```typescript
// Dentro del listener chatya:mensaje-nuevo:
noLeidos: prev.conversacionActivaId === conversacionId
  ? 0          // ← si estoy viendo esta conversación, 0
  : c.noLeidos // ← si NO estoy viéndola, mantiene el valor anterior sin incrementar
```

**Problema:** Cuando llega un mensaje nuevo a una conversación que NO está abierta:
- El `totalNoLeidos` global se actualiza vía `cargarNoLeidos()` con timer de 3s
- Pero el `noLeidos` individual de la conversación **no se incrementa** → el usuario no ve un badge numérico actualizado en esa conversación específica hasta que se recarga la lista completa

**Fix:** Agregar `c.noLeidos + 1` cuando la conversación no está activa y el mensaje no es propio.

---

#### I6 — Patrón frágil: abrirChatTemporal + abrirChatYA deben llamarse juntos

**Archivos:** Todos los puntos de integración externa (CardNegocio, ModalDetalleItem, etc.)
**Impacto:** Si algún punto de integración olvida llamar `abrirChatYA()` después de `abrirChatTemporal()`, el store abre la conversación pero el overlay no se muestra.

```typescript
// ModalDetalleItem.tsx — CORRECTO: llama ambos
abrirChatTemporal({ ... });
abrirChatYA();                 // ← si se olvida esto, el chat queda invisible

// CardNegocio.tsx — puede o no llamar abrirChatYA() dependiendo de la implementación
```

**Problema:** Dos stores separados (`useChatYAStore` y `useUiStore`) deben coordinarse manualmente. Cualquier punto de integración que olvide llamar ambas funciones tendrá un bug silencioso.

**Fix:** Que `abrirChatTemporal()` en `useChatYAStore` llame internamente a `useUiStore.getState().abrirChatYA()` para encapsular la operación completa.

---

#### I7 — MapContainer de Leaflet no se destruye al desmontar BurbujaMensaje

**Archivo:** `BurbujaMensaje.tsx` — líneas 89-129
**Impacto:** Cada burbuja de ubicación crea una instancia de Leaflet map que puede no limpiarse correctamente.

```typescript
function UbicacionBurbuja({ contenidoRaw }: { contenidoRaw: string }) {
  // ...
  return (
    <MapContainer     // ← Leaflet crea una instancia internamente
      center={posicion}
      zoom={16}
      // ... no hay cleanup explícito
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={posicion} icon={iconoPinBurbuja} />
    </MapContainer>
  );
}
```

**Problema:** `MapContainer` de react-leaflet internamente crea listeners de DOM, tiles y un canvas que deben destruirse al desmontar. Si muchos mensajes de ubicación se renderizan y des-renderizan (scroll, cambio de conversación), los mapas pueden acumular memoria.

Además, con `contentVisibility: 'auto'` en el contenedor padre de cada burbuja (VentanaChat.tsx L398), el navegador puede ocultar/mostrar burbujas al hacer scroll, pero el MapContainer no maneja bien la visibilidad parcial.

**Mitigación parcial:** `contentVisibility: 'auto'` no desmonta el componente, solo lo oculta visualmente. Pero cuando se cambia de conversación, sí se desmonta. React-leaflet debería limpiar, pero en la práctica tiene bugs conocidos.

---

#### I8 — chatya:reaccion sobreescribe preview de la lista innecesariamente

**Archivo:** `useChatYAStore.ts` — líneas 2062-2086
**Impacto:** Cada reacción reemplaza el preview de la conversación con texto como "Reaccionó con 👍", perdiendo el preview real del último mensaje.

```typescript
if (accion === 'agregada') {
  useChatYAStore.setState((prev) => ({
    conversaciones: prev.conversaciones.map((c) => {
      if (c.id !== conversacionId) return c;
      return {
        ...c,
        ultimoMensajeTexto: textoPreview,      // ← sobreescribe el preview real
        ultimoMensajeFecha: new Date().toISOString(),
        ultimoMensajeEmisorId: usuarioId,
      };
    }),
  }));
}
```

**Problema:** Si alguien reacciona a un mensaje antiguo, el preview de la conversación en la lista muestra "Reaccionó con 👍" en lugar del último mensaje real. Esto es confuso para el usuario y no refleja el contenido real de la conversación.

---

### MENOR (7 issues)

---

#### M1 — debugSocket() expuesto en producción

**Archivo:** `socketService.ts` — líneas 209-211

```typescript
export function debugSocket() {
  return { connected: socket?.connected, id: socket?.id, active: socket?.active };
}
```

Es una función de debug que expone estado interno del socket. No es un riesgo de seguridad directo, pero debería eliminarse o condicionarse con `import.meta.env.DEV`.

---

#### M2 — Vibración hardcodeada de 300ms

**Archivo:** `useChatYAStore.ts` — línea 1581

```typescript
if (navigator.vibrate) navigator.vibrate(300);
```

Comentario dice 200ms pero el código dice 300ms. Es un detalle menor, pero la vibración debería ser configurable junto con el sonido de notificación.

---

#### M3 — Duplicación de lógica de preview de último mensaje

**Archivos:** `useChatYAStore.ts` — líneas 855-860 y 1694-1698

La lógica para generar el texto de preview se repite en `enviarMensaje` (optimista) y en `chatya:mensaje-nuevo` (socket), con implementación ligeramente diferente:

```typescript
// enviarMensaje (línea 855)
datos.tipo === 'imagen' ? '📷 Imagen' : datos.tipo === 'audio' ? '🎤 Audio' : ...

// chatya:mensaje-nuevo (línea 1695)
mensaje.tipo === 'texto' ? mensaje.contenido.substring(0, 100) : `[${mensaje.tipo}]`
```

Deberían unificarse en un helper `generarPreviewMensaje(tipo, contenido)`.

---

#### M4 — UltimaVezAnimada recrea animación al cambiar hora

**Archivo:** `VentanaChat.tsx` — líneas 65-89

`useLayoutEffect` se ejecuta en cada cambio de `prefijo` o `hora`, resetea `listo` a false y luego usa `requestAnimationFrame` para volver a true. Esto causa un flash breve cada vez que la hora cambia (cada minuto), reiniciando la animación de slide.

---

#### M5 — cargarBloqueados/cargarContactos no cargan si ya hay datos

**Archivo:** `useChatYAStore.ts` — líneas 1071-1086, 1184-1200

```typescript
cargarContactos: async (tipo) => {
  const { contactos } = get();
  const esCargaInicial = contactos.length === 0;
  set({ cargandoContactos: esCargaInicial }); // ← si ya hay datos, no muestra loading
  // ... pero sí hace el fetch
```

No es un bug pero es inconsistente: se hace el fetch HTTP aunque no se muestre loading. Si la intención es "solo mostrar loading la primera vez", está bien, pero podría optimizarse con un `skip` si los datos son recientes.

---

#### M6 — ConversacionItem y BurbujaMensaje sin optimización de renders

Los componentes `ConversacionItem` y `BurbujaMensaje` usan `memo`, pero `BurbujaMensaje` recibe callbacks como `onMenuContextual`, `onReaccionar`, `onImagenClick`, etc. Si estos no están wrapeados en `useCallback` con dependencias estables en `VentanaChat`, cada render del padre recrea los callbacks y invalida el memo.

Revisando `VentanaChat`, la mayoría de callbacks SÍ usan `useCallback`, así que este issue es **menor** — solo verificar que no haya alguno sin memoizar.

---

#### M7 — Pre-carga de mensajes dispara 5 fetches HTTP simultáneos

**Archivo:** `useChatYAStore.ts` — líneas 773-794

```typescript
precargarMensajes: () => {
  const sinCache = conversaciones
    .filter((c) => !cacheMensajes[c.id])
    .slice(0, 5);

  for (const conv of sinCache) {
    chatyaService.getMensajes(conv.id, 30, 0).then(...)  // ← fire-and-forget, 5 en paralelo
  }
},
```

Esto dispara 5 requests HTTP concurrentes inmediatamente después de cargar la lista. En conexiones lentas (3G), esto puede saturar la cola de requests del navegador y hacer que otros requests (badge, contactos) se encolen.

**Fix:** Agregar un delay escalonado (ej: 200ms entre cada fetch) o usar un pool de concurrencia (máximo 2 simultáneos).

---

## Resumen Ejecutivo

| Severidad | Cantidad | Descripción general |
|-----------|----------|---------------------|
| **Crítico** | 4 | Filtración de datos entre usuarios, mutación de estado, dedup frágil, pérdida de eventos |
| **Importante** | 8 | Memory leak en caché, parseo redundante, renders innecesarios, desync de badges, integración frágil |
| **Menor** | 7 | Debug en prod, código duplicado, vibración hardcodeada, pre-carga agresiva |

### Prioridades recomendadas

1. **C1 (borradores)** — Fix inmediato. Riesgo de privacidad real entre usuarios.
2. **C2 (mutación reacciones)** — Fix rápido. Puede causar bugs visibles en el chat.
3. **C3 (dedup mensajes)** — Fix medio. Requiere cambiar la estrategia de matching.
4. **I5 (badge individual)** — Fix rápido. Mejora notable en UX.
5. **I6 (abrirChatTemporal)** — Fix de arquitectura. Previene bugs futuros.
6. **I1 (caché sin límite)** — Fix medio. Solo afecta usuarios intensivos.
7. **C4 + I2** — Optimizaciones que pueden hacerse juntas.

### Aspectos positivos

- **Optimistic UI** bien implementado con rollback consistente en la mayoría de acciones
- **Socket.io StrictMode** el singleton en socketService.ts maneja correctamente React StrictMode
- **Sistema de caché** con pre-carga inteligente (buena UX, solo necesita evicción)
- **History API** para back button nativo en móvil — 4 capas (overlay → chat → panel → visor) bien orquestadas
- **Pipeline multimedia** zero-flicker con LQIP para imágenes
- **Separación de responsabilidades** entre hooks (audio, imagen, documento) y componentes
- **Timer cancelable para badge** que previene badges falsos al sincronizar entre dispositivos
