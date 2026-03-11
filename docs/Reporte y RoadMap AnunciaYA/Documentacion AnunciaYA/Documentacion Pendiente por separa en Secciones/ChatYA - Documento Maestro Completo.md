# 💬 ChatYA - Documento Maestro Completo

> **Versión:** v6.4 — Actualizado 2026-03-06

**Fecha:** 06 Marzo 2026  
**Versión:** 6.5  
**Proyecto:** AnunciaYA v3.0  
**Chat de origen:** Chat Cerebro del Proyecto (Opus 4.6)  
**Propósito:** Documento de referencia para implementar ChatYA en múltiples sesiones de chat. Contiene TODAS las decisiones, especificaciones, progreso y referencia técnica completa.

---

## ÍNDICE

1. [Decisiones Arquitectónicas](#1-decisiones-arquitectónicas)
2. [Límites y Configuraciones](#2-límites-y-configuraciones)
3. [Base de Datos — 6 Tablas](#3-base-de-datos)
4. [Funcionalidades — Estado Completo](#4-funcionalidades)
5. [Vistas del Panel Lateral](#5-panel-lateral)
6. [Reglas de Negocio](#6-reglas-de-negocio)
7. [ScanYA + Chat — Empleados](#7-scanya-empleados)
8. [Infraestructura Reutilizada](#8-infraestructura)
9. [Referencia API Backend Completa](#9-api-backend)
10. [Arquitectura Frontend](#10-arquitectura-frontend)
11. [Patrones de Implementación](#11-patrones)
12. [Archivos del Proyecto](#12-archivos)
13. [Progreso por Sprint](#13-sprints)
14. [Pendientes y Deuda Técnica](#14-pendientes)
15. [Funcionalidades Excluidas](#15-excluidas)
16. [Lecciones Aprendidas](#16-lecciones)

---

## 1. Decisiones Arquitectónicas {#1-decisiones-arquitectónicas}

### Implementadas ✅

| Decisión | Detalle | Razón |
|----------|---------|-------|
| **BD para ChatYA** | PostgreSQL con Drizzle ORM | Misma BD del resto del proyecto. Evita complejidad de mantener un segundo motor. Socket.io da el tiempo real, la BD solo persiste |
| **Chat grupal** | NO en ChatYA | ChatYA es solo 1:1. El chat grupal se construye como componente independiente en sprint de Dinámicas/Rifas (tipo YouTube Live/Twitch, no tipo WhatsApp) |
| **BD sin tabla de participantes** | Diseño `participante1_id / participante2_id` | No se necesita tabla intermedia porque no hay grupos. Simplifica queries |
| **Tiempo real** | Socket.io (ya implementado) | Socket.io maneja el delivery instantáneo. La BD escribe en paralelo, no está en el critical path |
| **Archivos del chat** | Cloudflare R2 (prefixes `chat/imagenes/`, `chat/documentos/` y `chat/audio/`) | Egress gratuito, lifecycle rules. Separado de Cloudinary |
| **Catálogo/ofertas** | Siguen en Cloudinary | Necesita transformaciones de imagen que R2 no ofrece |
| **Notificaciones de chat** | Solo badge + sonido en logo ChatYA | NO se integra con el panel de notificaciones (campanita) |
| **Multi-dispositivo** | Sí | Palomitas azules sincronizadas en todos los dispositivos del usuario |
| **TTL de conversaciones** | 6 meses sin interacción | Cron job en backend (no pg_cron). Se basa en `updated_at` de la conversación |
| **Compresión de imágenes** | Frontend con Canvas API | Evita enviar archivos pesados al servidor. Canvas comprime a WebP directamente en el navegador |
| **Upload de archivos** | Presigned URLs + upload directo a R2 | El frontend sube directo a Cloudflare R2 sin pasar por Express. Reduce carga del servidor |
| **Emojis** | Google Noto via `emoji-picker-react` + `EmojiNoto` | Emojis consistentes cross-platform mediante imágenes CDN |
| **Scroll de mensajes** | Scroll nativo + IntersectionObserver | Renderiza todos los mensajes en DOM (60-200 es ligero). Sin virtualización, sin librerías externas |
| **Montaje de componentes** | Persistente con CSS `hidden` | Componentes se montan una vez y se alternan con `display: none` para evitar re-renders y pérdida de estado |

### Aprobadas pendientes 🔲

| Decisión | Detalle | Razón |
|----------|---------|-------|
| **Open Graph** | Preview de enlaces con título + imagen | Cuando se pega URL en el chat |

---

## 2. Límites y Configuraciones {#2-límites-y-configuraciones}

| Parámetro | Valor | Notas |
|-----------|-------|-------|
| Texto por mensaje | 5,000 caracteres | ~800-1,000 palabras. Historial ilimitado |
| Tamaño imágenes | 15 MB original | Con compresión automática Canvas → WebP calidad 0.85, max 1920px antes de subir a R2 |
| Duración audio | 5 minutos | Grabación inline dentro del chat. Auto-stop al llegar al límite |
| Tamaño audio | 5 MB | Formatos: WebM/Opus, OGG/Opus, MP4, MPEG. Bitrate 64kbps (~2.4 MB en 5 min) |
| Tamaño documentos | 25 MB | PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV |
| Rate limiting | 30 mensajes/minuto | Por usuario. Previene spam/bots |
| Indicador "ausente" | 15 minutos | De inactividad. Timer en frontend notifica al backend |
| Chats fijados | Sin límite | El usuario puede fijar todos los que quiera |
| Sonido de notificación | Activado por defecto | Configurable por el usuario |
| TTL conversaciones | 6 meses | Sin ninguna interacción. Cron job diario a las 3 AM |

---

## 3. Base de Datos — 6 Tablas {#3-base-de-datos}

### 3.1 `chat_conversaciones`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | Auto-generado |
| participante1_id | UUID FK → usuarios | ON DELETE CASCADE |
| participante1_modo | VARCHAR(15) | 'personal' \| 'comercial' |
| participante1_sucursal_id | UUID FK → negocio_sucursales | Nullable, ON DELETE SET NULL |
| participante2_id | UUID FK → usuarios | ON DELETE CASCADE |
| participante2_modo | VARCHAR(15) | 'personal' \| 'comercial' |
| participante2_sucursal_id | UUID FK → negocio_sucursales | Nullable, ON DELETE SET NULL |
| contexto_tipo | VARCHAR(20) | 'negocio' \| 'marketplace' \| 'oferta' \| 'dinamica' \| 'empleo' \| 'directo' \| 'notas' |
| contexto_referencia_id | UUID | Nullable. ID del recurso de origen |
| ultimo_mensaje_texto | VARCHAR(100) | Preview truncado del último mensaje |
| ultimo_mensaje_fecha | TIMESTAMPTZ | Para ordenar la lista de chats |
| ultimo_mensaje_tipo | VARCHAR(20) | 'texto' \| 'imagen' \| 'audio' \| 'documento' \| 'ubicacion' \| 'contacto' \| 'sistema' |
| ultimo_mensaje_estado | VARCHAR(20) | Estado del último mensaje ('enviado', 'entregado', 'leido') |
| ultimo_mensaje_emisor_id | UUID (FK → usuarios) | Quién envió el último mensaje. Se usa para preview de reacciones ("Reaccionó con ❤️ a...") y para saber si el preview lo escribí yo o el otro |
| no_leidos_p1 | INT DEFAULT 0 | Mensajes no leídos por participante 1 |
| no_leidos_p2 | INT DEFAULT 0 | Mensajes no leídos por participante 2 |
| fijada_por_p1 | BOOLEAN DEFAULT false | |
| fijada_por_p2 | BOOLEAN DEFAULT false | |
| archivada_por_p1 | BOOLEAN DEFAULT false | |
| archivada_por_p2 | BOOLEAN DEFAULT false | |
| silenciada_por_p1 | BOOLEAN DEFAULT false | |
| silenciada_por_p2 | BOOLEAN DEFAULT false | |
| eliminada_por_p1 | BOOLEAN DEFAULT false | |
| eliminada_por_p2 | BOOLEAN DEFAULT false | |
| mensajes_visibles_desde_p1 | TIMESTAMPTZ | Nullable. Timestamp de última eliminación por P1. Mensajes anteriores son invisibles para P1 |
| mensajes_visibles_desde_p2 | TIMESTAMPTZ | Nullable. Timestamp de última eliminación por P2. Mensajes anteriores son invisibles para P2 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Se actualiza con cada mensaje. TTL se basa en este campo |

**CHECK constraints:** modos válidos, contexto_tipo válido (`'negocio' | 'marketplace' | 'oferta' | 'dinamica' | 'empleo' | 'directo' | 'notas'`), no auto-chat excepto cuando `contexto_tipo = 'notas'` (Mis Notas permite p1 = p2).

### 3.2 `chat_mensajes`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | Auto-generado |
| conversacion_id | UUID FK → chat_conversaciones | ON DELETE CASCADE |
| emisor_id | UUID FK → usuarios | ON DELETE SET NULL |
| emisor_modo | VARCHAR(15) | Nullable. 'personal' \| 'comercial'. NULL para mensajes de sistema |
| emisor_sucursal_id | UUID FK → negocio_sucursales | Nullable |
| **empleado_id** | **UUID FK → empleados** | **Nullable. Cuando un empleado de ScanYA responde como el negocio** |
| tipo | VARCHAR(20) | 'texto' \| 'imagen' \| 'audio' \| 'documento' \| 'ubicacion' \| 'contacto' \| 'sistema' |
| contenido | TEXT NOT NULL | Texto, URL R2, o JSON según tipo (ver detalle abajo) |
| estado | VARCHAR(15) | 'enviado' \| 'entregado' \| 'leido' |
| editado | BOOLEAN DEFAULT false | |
| editado_at | TIMESTAMPTZ | Nullable |
| eliminado | BOOLEAN DEFAULT false | Soft delete |
| eliminado_at | TIMESTAMPTZ | Nullable |
| respuesta_a_id | UUID FK → chat_mensajes | Nullable. Mensaje al que responde (quote/reply) |
| reenviado_de_id | UUID FK → chat_mensajes | Nullable. Mensaje original si fue reenviado |
| created_at | TIMESTAMPTZ | |
| entregado_at | TIMESTAMPTZ | Cuando llegó al dispositivo del receptor |
| leido_at | TIMESTAMPTZ | Cuando el receptor abrió la conversación |

**Contenido según tipo:**
- `texto`: texto plano (máx 5,000 chars)
- `imagen`: JSON `{ url, ancho, alto, peso, miniatura, caption? }` — URL de R2, dimensiones en px, peso en bytes, miniatura LQIP base64 (~400 bytes), caption opcional
- `audio`: JSON `{ url, duracion, tamano, waveform }` — URL de R2, duración en segundos, tamaño en bytes, 50 barras normalizadas 0-1
- `documento`: JSON `{ url, nombre, tamano, tipoArchivo, extension }`
- `ubicacion`: JSON `{ latitud, longitud, nombre? }`
- `contacto`: JSON `{ usuario_id?, negocio_id?, nombre, avatar? }`
- `sistema`: texto del mensaje de sistema

**Índice full-text en español:** `to_tsvector('spanish', contenido)` para búsqueda rápida dentro del chat.

**Nota técnica:** Auto-referencias (`respuestaAId`, `reenviadoDeId`) usan `.references()` con `AnyPgColumn` inline en vez de `foreignKey()` blocks para evitar error de tipo circular en TypeScript.

### 3.3 `chat_reacciones`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | |
| mensaje_id | UUID FK → chat_mensajes | ON DELETE CASCADE |
| usuario_id | UUID FK → usuarios | ON DELETE CASCADE |
| emoji | VARCHAR(10) | El emoji de la reacción |
| created_at | TIMESTAMPTZ | |

**UNIQUE:** (mensaje_id, usuario_id, emoji)

### 3.4 `chat_mensajes_fijados`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | |
| conversacion_id | UUID FK → chat_conversaciones | ON DELETE CASCADE |
| mensaje_id | UUID FK → chat_mensajes | ON DELETE CASCADE |
| fijado_por | UUID FK → usuarios | |
| created_at | TIMESTAMPTZ | |

**UNIQUE:** (conversacion_id, mensaje_id)

### 3.5 `chat_contactos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | |
| usuario_id | UUID FK → usuarios | ON DELETE CASCADE |
| contacto_id | UUID FK → usuarios | ON DELETE CASCADE |
| tipo | VARCHAR(15) | 'personal' \| 'comercial' — refleja modo activo del usuario al guardar |
| negocio_id | UUID FK → negocios | Nullable. Denormalización para evitar JOINs |
| sucursal_id | UUID FK → negocio_sucursales | Nullable. ON DELETE CASCADE. Identifica sucursal específica del contacto |
| alias | VARCHAR(100) | Nullable |
| created_at | TIMESTAMPTZ | |

**UNIQUE:** (usuario_id, contacto_id, tipo, sucursal_id). CHECK: no auto-contacto.
**Nota:** `negocio_id` es derivable de `sucursal_id` vía `negocio_sucursales.negocio_id`. Se mantiene para optimización de queries. Backend auto-deriva `negocio_id` si solo se envía `sucursalId`.

### 3.6 `chat_bloqueados`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | |
| usuario_id | UUID FK → usuarios | ON DELETE CASCADE |
| bloqueado_id | UUID FK → usuarios | ON DELETE CASCADE |
| motivo | VARCHAR(200) | Nullable |
| created_at | TIMESTAMPTZ | |

**UNIQUE:** (usuario_id, bloqueado_id). CHECK: no auto-bloqueo.

### 3.7 Columna en tabla existente

- `usuarios.ultima_conexion` (TIMESTAMPTZ, nullable) — para estado "últ. vez"

---

## 4. Funcionalidades — Estado Completo {#4-funcionalidades}

### 4.1 Tipos de Conversación

- ✅ Chat 1:1 entre usuarios (modo personal)
- ✅ Chat 1:1 entre usuario y negocio (modo comercial)

### 4.2 Tipos de Contenido

- ✅ Mensajes de texto (máx 5,000 caracteres)
- ✅ Imágenes (con pipeline zero-flicker: LQIP + presigned URL + R2)
- ✅ Múltiples imágenes a la vez (hasta 10, drag & drop múltiple, upload paralelo)
- ✅ Documentos/archivos (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, máx 25 MB)
- ✅ Mensajes de audio (grabación inline, máx 5 min, waveform visual, reproductor estilo WhatsApp con seek arrastrable)
- ✅ Enviar ubicación (coordenadas + mini mapa interactivo Leaflet)
- ✅ Emojis en mensajes — Google Noto via `emoji-picker-react` + `EmojiNoto`
- ✅ Reacciones con emojis — Desktop: popup rápido 5 emojis fijos + botón "+" para picker completo. Móvil: solo 5 emojis fijos sin "+"

### 4.3 Acciones sobre Mensajes

**Todos los tipos de contenido (texto, imagen, audio, documento, ubicación, contacto) tienen las mismas acciones donde aplique.**

- ✅ Responder mensaje específico (quote/reply con preview) — Click en quote → scroll al mensaje original con resaltado. ESC cancela respuesta
- ✅ Reenviar mensaje a otro usuario/chat (si no existe conversación, se crea automáticamente)
- ✅ Editar mensajes propios (sin límite de tiempo, solo texto) — Barra ámbar pre-llena input, botón enviar ámbar, ESC cancela edición
- ✅ Eliminar mensajes propios (soft delete, desaparecen completamente del chat — `return null`)
- ✅ Fijar mensajes importantes dentro de una conversación
- ✅ Copiar texto del mensaje (soporta selección parcial en desktop)

### 4.4 Interacción con Mensajes (UI)

- ✅ Botón reenviar (Forward) siempre visible en burbujas de imagen/documento
- ✅ Icono de reaccionar aparece al **hover en PC**
- ✅ Icono de reaccionar aparece al **long press (~500ms) en móvil** (con vibración háptica)
- ✅ Menú contextual (**click derecho en PC** / **long press en móvil**): responder, reenviar, copiar, editar, eliminar, fijar
- ✅ Mensaje seleccionado: `ring-2 ring-blue-400 scale-[1.02]`, `select-none` evita barra del navegador
- ✅ Desktop: menú es popup flotante `MenuContextualMensaje.tsx`
- ✅ Móvil: header reemplaza avatar/nombre por íconos de acciones distribuidos con `justify-around` + burbuja flotante de emojis debajo del mensaje
- ✅ Header padding dinámico: `py-1` cuando acciones móvil activas (long press), `py-2.5` normal
- ✅ Hora inline estilo WhatsApp — hora+editado+palomitas como `<span inline-flex>` dentro del `<p>`, fluyen con el texto
- ✅ Copiar selección parcial: `handleCopiar` en MenuContextualMensaje y AccionesHeaderMobile verifica `window.getSelection()?.toString().trim()`. Si hay selección → copia solo eso; si no → copia el mensaje completo

**Barras de Respuesta/Edición (InputMensaje):**

| Elemento | Detalle |
|----------|---------|
| Card flotante | `mx-3 mt-2 rounded-xl` con borde de color (`border-blue-200` respuesta / `border-amber-200` edición) |
| Fondo | Gradiente sutil (`from-blue-50` / `from-amber-50`) |
| Borde lateral | 3.5px con gradiente vertical (`from-blue-500 to-blue-400` / amber) |
| Ícono | Reply/Pencil dentro de caja 32px con gradiente + sombra |
| Texto | Nombre `text-sm font-semibold`, contenido `text-sm` con emojis Noto 20px |
| Botón X | Circular 28px con fondo semitransparente del color temático |

Lógica nombres: Respuesta → "Tú" (si `emisorId === miId`) o nombre del contacto. Edición → "Editando". Props `nombreContacto` y `miId` pasados desde VentanaChat.

**Fuente del input:** `fontFamily: 'Inter, "Noto Color Emoji", sans-serif'` — renderiza emojis Noto dentro del `<input>` donde no se pueden usar imágenes.

### 4.5 Estados de Mensaje (Palomitas)

- ✅ Enviado → 1 palomita gris
- ✅ Entregado → 2 palomitas grises (receptor conectado)
- ✅ Leído → 2 palomitas azules (receptor abrió la conversación)
- ✅ Multi-dispositivo: palomitas azules se sincronizan en TODOS los dispositivos del usuario
- 🔲 Indicador "Escribiendo..." en tiempo real (vía Socket.io)

### 4.6 Mensajes de Sistema

- ✅ Separadores de fecha ("Hoy", "Ayer", "15 de febrero") — banda azul semitransparente que cruza todo el ancho del área de mensajes

### 4.7 Lista de Conversaciones

- ✅ Ordenadas por más reciente arriba
- ✅ Conversaciones fijadas siempre hasta arriba (sin límite de fijadas)
- ✅ Preview del último mensaje en cada conversación (con emojis Noto)
- ✅ Preview de reacciones: "Reaccionaste con ❤️ a "Hola..."" / "Reaccionó con ❤️ a "Hola...""
- ✅ Badge con número de mensajes no leídos por conversación
- ✅ Buscador de conversaciones (por nombre de contacto/negocio)
- ✅ Foto/avatar del contacto o logo del negocio
- ✅ Tabs filtro "Todos | Personas | Negocios"
- ✅ Buscador inteligente: un solo input → 3 secciones (conversaciones locales + negocios API + personas API) con debounce 300ms
- ✅ GPS integrado para distancia en resultados de negocios

### 4.8 Acciones sobre Conversaciones

**Menú contextual ⋮ (`MenuContextualChat.tsx`)** — se abre desde el header de VentanaChat. 6 opciones:

| Opción | Comportamiento | Detalle |
|--------|---------------|---------|
| Fijar / Desfijar | Toggle optimista directo | La conversación sube/baja del tope de la lista instantáneamente |
| Silenciar / Desilenciar | Toggle optimista directo | Detiene notificaciones de esa conversación |
| Archivar / Desarchivar | Toggle optimista directo | Mueve entre `conversaciones` ↔ `conversacionesArchivadas` |
| Agregar contacto / Quitar contacto | Toggle optimista directo | Se sincroniza con los otros 3 puntos de agregar/quitar contacto |
| Bloquear | Ejecución directa sin confirmación | El bloqueado no puede enviar mensajes |
| Eliminar chat | Ejecución directa sin confirmación | Soft delete → hard delete cuando AMBOS eliminan → limpia archivos R2 |

Funciona tanto en chats normales como archivados. Overlay invisible para cerrar al click fuera.

- ✅ Vista dedicada "Archivados" con badge verde de no leídos. Al abrir un chat archivado, VentanaChat busca en `conversaciones` → `conversacionesArchivadas` → backend (fallback)

### 4.9 Contactos

Contactos se guardan a nivel **sucursal**, no por negocio. Un usuario puede tener "Panadería - Principal" y "Panadería - Benito Juárez" como entradas separadas.

- ✅ Agregar usuarios a lista de contactos personales
- ✅ Guardar negocios en lista de contactos comerciales (separada, por sucursal)
- ✅ Iniciar conversación desde lista de contactos (detecta conversación existente antes de crear nueva)
- ✅ Agregar/quitar desde 4 ubicaciones sincronizadas:
  - Resultados de búsqueda (UserPlus/UserMinus) — `ListaConversaciones.tsx`
  - Header del chat (botón entre lupa y ⋮) — `VentanaChat.tsx`
  - Panel lateral info (botón con texto debajo del avatar) — `PanelInfoContacto.tsx`
  - Menú contextual ⋮ (opción entre Archivar y Bloquear) — `MenuContextualChat.tsx`
- ✅ Optimistic UI bidireccional con `ContactoDisplay` (temp id → real id, rollback en error)
- ✅ El `tipo` del contacto refleja el modo activo del usuario al guardar, no el tipo de entidad
- ✅ Detección negocio por `!!contacto.negocioId` (no por `tipo === 'comercial'`)

### 4.10 Bloqueo

- ✅ Bloquear usuarios (no pueden enviar mensajes) — ejecución directa sin confirmación
- ✅ Bloquear negocios SPAM
- ✅ Lista de bloqueados accesible desde configuración del chat
- ✅ Desbloquear desde la lista de bloqueados

### 4.11 Modo Dual (Personal / Comercial)

- ✅ Al cambiar toggle personal/comercial, la lista de chats cambia completamente (recarga silenciosa)
- ✅ Modo personal: muestra chats con amigos/usuarios y con negocios como cliente
- ✅ Modo comercial: muestra chats con clientes que contactaron al negocio (filtrados por sucursal activa)
- ✅ Los chats NO se mezclan entre modos
- ✅ En modo personal: apareces con tu nombre y avatar personal
- ✅ En modo comercial: apareces con nombre y logo del negocio
- ✅ El receptor ve claramente si habla con persona o negocio

### 4.12 Mis Notas

Conversación consigo mismo (p1 = p2, `contexto_tipo = 'notas'`).

- ✅ Backend: CHECK constraint permite self-chat con contexto 'notas'
- ✅ Backend: `obtenerOCrearMisNotas()` — busca/crea/restaura conversación de notas
- ✅ Backend: `enviarMensaje()` no incrementa noLeidos ni duplica Socket.io para Mis Notas
- ✅ Backend: `listarConversaciones()` excluye `contexto_tipo = 'notas'` (acceso solo por endpoint dedicado `GET /mis-notas`)
- ✅ Frontend: Botón "Mis Notas" en barra de modo (desktop y móvil) con ícono StickyNote
- ✅ Frontend: Header personalizado (avatar dorado, "Notas personales", sin escribiendo/en línea/búsqueda/menú)
- ✅ Frontend: Sin checkmarks ni tags "Negocio" en burbujas

### 4.13 Contexto de Origen

El backend resuelve el nombre del recurso de origen (JOIN/lookup) y lo envía como `contextoNombre`. Cero requests extra del frontend.

| Tipo de contexto | Qué muestra | Ejemplo |
|-----------------|-------------|---------|
| `'negocio'` | "Desde: Tu perfil" | Solo en modo comercial |
| `'oferta'` | "Desde oferta: {nombre}" | "Desde oferta: 2x1 en Pizzas" |
| `'marketplace'` | "Desde publicación: {nombre}" | Preparado para módulo futuro |
| `'empleo'` | "Desde vacante: {nombre}" | Preparado para módulo futuro |
| `'dinamica'` | "Desde dinámica: {nombre}" | Preparado para módulo futuro |
| `'directo'` / `'notas'` | No muestra nada | — |

**Regla de visibilidad:** Solo se muestra al **receptor** del chat (`conversacion.participante1Id !== miId`). Quien inició el chat ya sabe desde dónde lo hizo. El caso `'negocio'` ("Desde: Tu perfil") solo aplica en modo comercial — en modo personal el usuario no tiene perfil de negocio.

**Ubicación UI:** Header de VentanaChat (subtítulo inline: `🟢 En línea · Desde: Tu perfil`).

### 4.14 Búsqueda

- ✅ Buscar conversaciones por nombre de contacto o negocio (filtro en tiempo real)
- ✅ Buscar mensajes por texto dentro de una conversación específica (full-text `to_tsvector('spanish')`)
- ✅ Navegar entre resultados (flechas arriba/abajo)
- ✅ Resaltar el mensaje encontrado con highlight azul en toda la fila y scroll suave

### 4.15 Notificaciones y Badges

- ✅ Badge rojo en logo de ChatYA (Navbar + BottomNav) con total de mensajes no leídos
- ✅ Badge actualizado en tiempo real vía Socket.io
- ✅ Badge reactivo a sucursal activa (modo comercial)
- 🔲 Sonido de notificación cuando llega mensaje nuevo (activado por defecto, silenciable)
- ✅ NO integrado con panel de notificaciones (campanita). Solo badge + sonido en logo ChatYA

### 4.16 Imágenes — Detalle Específico

**Interfaces TypeScript:**

```typescript
// JSON almacenado en chat_mensajes.contenido (tipo = 'imagen')
interface ContenidoImagen {
  url: string;        // URL pública de R2
  ancho: number;      // Después de optimización (px)
  alto: number;       // Después de optimización (px)
  peso: number;       // Bytes del archivo final
  miniatura: string;  // data:image/webp;base64,... (~300-500 bytes, 16px ancho)
  caption?: string;   // Pie de foto opcional
}

// Output del hook useImagenChat
interface MetadatosImagen {
  archivo: File;      // WebP optimizado (Blob)
  blobUrl: string;    // URL local para preview instantáneo
  ancho: number;
  alto: number;
  peso: number;
  miniatura: string;  // LQIP base64
  caption?: string;
}
```

- ✅ Enviar imágenes desde galería del dispositivo — Botón clip (Paperclip) en InputMensaje
- ✅ Captura directa con cámara — Botón cámara (solo móvil) con `capture="environment"`
- ✅ Múltiples imágenes a la vez — Hasta 10, drag & drop múltiple, preview strip horizontal, upload paralelo
- ✅ Preview/thumbnail en el chat — Contenedor con aspect ratio fijo desde dimensiones reales, micro-thumbnail LQIP con blur como placeholder
- ✅ Click para ver imagen en visor fullscreen tipo WhatsApp — `VisorImagenesChat.tsx` con `createPortal`. Galería navegable con flechas ← →, swipe móvil, strip de thumbnails. Header: emisor dinámico + acciones
- ✅ Compresión automática en frontend (canvas → WebP calidad 0.85, max 1920px) antes de subir a R2
- ✅ Drag & drop en toda la VentanaChat — Overlay visual "Suelta la imagen aquí" con contador `dragContadorRef` para evitar parpadeo
- ✅ Límite: 15 MB por imagen original
- ✅ Pipeline Zero-Flicker (3 pilares):
  - **Pilar 1 — Dimensiones fijas:** Se leen con `new Image()` antes de cualquier operación. Contenedor renderiza con aspect ratio exacto desde el primer frame → CLS = 0
  - **Pilar 2 — LQIP:** Micro-thumbnail 16px ancho, WebP base64 (~300-500 bytes), viaja con el JSON del mensaje. Se muestra con `filter: blur(20px)` como placeholder instantáneo
  - **Pilar 3 — Preload:** Dos `<img>` apilados. La imagen real carga en background, cuando `onload` dispara se muestra con opacity transition 150ms → 0 parpadeo
- ✅ Almacenamiento: Cloudflare R2, carpeta `chat/imagenes/{userId}/`
- ✅ Presigned URL: Frontend pide URL pre-firmada (5 min validez) y sube directo a R2
- ✅ Caption (pie de foto) opcional por imagen
- ✅ Preview con thumbnail + input caption en franja arriba del input antes de enviar
- ✅ Hora flotante sobre imagen (sin caption) o inline debajo (con caption)

### 4.17 Documentos

**Interface TypeScript:**

```typescript
// JSON almacenado en chat_mensajes.contenido (tipo = 'documento')
interface ContenidoDocumento {
  url: string;          // URL pública de R2
  nombre: string;       // "Reporte Q4.pdf"
  tamano: number;       // Bytes
  tipoArchivo: string;  // MIME type completo
  extension: string;    // "pdf", "docx", etc.
}
```

**9 tipos MIME permitidos:** `application/pdf`, `application/msword`, `.wordprocessingml.document`, `application/vnd.ms-excel`, `.spreadsheetml.sheet`, `application/vnd.ms-powerpoint`, `.presentationml.presentation`, `text/plain`, `text/csv`

- ✅ 9 tipos MIME: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
- ✅ Pipeline idéntico a imágenes: presigned URL → R2 upload → mensaje tipo 'documento'
- ✅ Preview: nombre + tamaño + icono coloreado por extensión (PDF rojo, DOC azul, XLS verde, PPT naranja) — `DocumentoBurbuja` en BurbujaMensaje.tsx
- ✅ Descarga directa al click — `fetch` → blob → `URL.createObjectURL` (no abre pestaña nueva)
- ✅ Límite: 25 MB. Carpeta R2: `chat/documentos/{userId}/`
- ✅ Mismas acciones que mensajes de texto (responder, reenviar, eliminar, reaccionar, fijar)
- ✅ Botón reenviar (Forward) siempre visible en burbujas de documento e imagen

### 4.18 Visor de Galería Fullscreen

Visor tipo WhatsApp/Telegram. `VisorImagenesChat.tsx` con `createPortal(…, document.body)` para escapar del stacking context `z-[60]`.

**Layout Desktop:**
```
┌──────────────────────────────────────────────────────────────┐
│  [←] Emisor  Fecha   [😊] [↩] [⬇] [↪] [📌] [✕]           │
├──────────────────────────────────────────────────────────────┤
│                    ←   IMAGEN   →                           │
├──────────────────────────────────────────────────────────────┤
│  Caption · Contador · [thumbnails 80×80px]                  │
└──────────────────────────────────────────────────────────────┘
```

**Layout Móvil:**
```
┌──────────────────────────────────────────────────────────────┐
│  [←] Emisor  Fecha                    [⬇] [↪] [📌]        │
├──────────────────────────────────────────────────────────────┤
│                    ←   IMAGEN   →                           │
├──────────────────────────────────────────────────────────────┤
│  [😊]                               [↩ Responder]          │
│  Caption · Contador · [thumbnails 64×64px]                  │
└──────────────────────────────────────────────────────────────┘
```

**Características:**
- Header dinámico: emisor de cada imagen (cambia al navegar). Yo → "Tú" + mi avatar; contacto → su nombre + avatar
- Navegación: flechas ← → desktop, swipe zona imagen (móvil), teclas ← → Escape
- Thumbnails: strip scrollable con `stopPropagation` (swipe en thumbnails NO cambia imagen principal)
- Emoji picker rápido: 5 emojis (👍 ❤️ 😂 😮 😢)
- Acciones: descargar (blob), reenviar (cierra visor → abre ModalReenviar), fijar/desfijar, responder (cierra visor → activa respuesta), reaccionar

**Props:** `imagenesChat`, `indiceInicial`, `miDatos`, `otroDatos`, `miId`, `mensajesFijadosIds`, `esMisNotas`, `onReaccionar`, `onCerrar`

### 4.19 Sistema de Emojis Google Noto

**Librería:** `emoji-picker-react` con `EmojiStyle.GOOGLE` via CDN (`emoji-datasource-google@15.0.1`)

**Componentes:**

| Componente | Propósito |
|-----------|-----------|
| `SelectorEmojis.tsx` | Picker completo reutilizable. Props: `onSeleccionar`, `onCerrar`, `posicion`, `ancho`, `alto`, `cerrarAlSeleccionar` (default true). Click fuera/ESC cierra. Categorías en español. Tema dark estilo WhatsApp |

**Picker CSS custom (`index.css`):**
- Fondo negro sólido (`#000000`)
- Scrollbar delgada translúcida estilo WhatsApp
- Categorías en orden WhatsApp, nombres en español, color gris oscuro
- Buscador full rounded, fondo oscuro, sin highlight de focus
- `showPreview: false`, `skinTones` desactivados
- Esquinas redondeadas 20px, padding interno
- Header reordenado: categorías arriba → búsqueda abajo
| `EmojiNoto.tsx` | Emoji individual como imagen CDN. Convierte emoji nativo a código unified para URL. Fallback a nativo si falla |
| `TextoConEmojis.tsx` | Reemplaza emojis en texto por imágenes Noto via regex `\p{Emoji_Presentation}`. Para previews y burbujas |
| `emojiUtils.ts` | `analizarEmojis(texto)` → `{ soloEmojis, cantidad }`. `tamañoEmojiSolo(n)` → 1=56px, 2=44px, 3+=36px |

**Integración en UI:**

| Ubicación | Trigger | Comportamiento |
|-----------|---------|---------------|
| Emojis rápidos desktop | Hover burbuja → 5 emojis fijos Noto (👍 ❤️ 😂 😮 😢) + botón "+" | Reacción directa al click. "+" abre picker completo via portal |
| Picker completo burbuja (solo desktop) | Botón "+" | Portal en `document.body`, posición anclada via `getBoundingClientRect()`. Alinea derecha (míos) o izquierda (recibidos). Arriba/abajo según espacio |
| Emojis rápidos móvil | Long press → 5 emojis fijos Noto (sin botón "+") | Tamaño más grande (28px). Solo estos 5, sin acceso a picker completo |
| InputMensaje desktop | Botón 😊 (Smile) izquierda del input | No cierra al seleccionar (`cerrarAlSeleccionar={false}`). Cierra: click fuera, ESC, Enter, click Smile |
| InputMensaje móvil | Oculto (`hidden lg:block`) | El usuario usa el picker nativo del teclado del SO |

**Burbujas solo-emoji (estilo WhatsApp):**

| Condición | Burbuja | Tamaño emoji | Hora |
|-----------|---------|-------------|------|
| Solo emojis (sin quote) | Sin fondo, sin padding, sin sombra | Escalonado (56/44/36px) | Mini-burbuja `rounded-full`: azul (`bg-blue-500 text-white/70`) para míos, blanca (`bg-white border-gray-100`) para recibidos |
| Texto normal o emojis con texto | Burbuja estándar | 26px | Inline |
| Solo emojis con quote | Burbuja estándar | 26px | Inline |

**Gradiente burbujas propias:** `#2563eb → #3b82f6` (azul vibrante). Padding: `px-2.5 py-1.5` texto, `p-1` imágenes.

**Tamaños responsive en burbujas:** Contenido `text-[15px] lg:text-[13px]`, hora `text-[10px] lg:text-[9px]`. ConversacionItem avatar `w-12 h-12 lg:w-10 lg:h-10`, nombre `text-[15px] lg:text-[13px]`.

**Palomitas — prop `variante`:** Componente Palomitas acepta `variante: 'burbuja' | 'emoji'`. `burbuja` (default) → colores blancos/transparentes sobre fondo azul. `emoji` → colores grises oscuros sobre fondo claro.

**ChevronDown colores dinámicos (menú contextual):** Solo-emoji → `text-gray-500` (visible sobre fondo transparente). Burbuja azul → `text-white/70`. Burbuja blanca → `text-gray-300`.

**`data-menu-trigger="true"`:** Atributo en la flechita ChevronDown de BurbujaMensaje. MenuContextualMensaje excluye `target.closest('[data-menu-trigger]')` del click-outside listener. Previene el ciclo close→reopen al hacer click en la misma flecha.

**Reacciones visibles en burbujas:** Pills debajo de cada burbuja con EmojiNoto (18px) + cantidad + click para toggle. Círculos de color diferenciados (azul míos, gris recibidos). Overlap `-mt-2 z-10` con `shadow-sm border rounded-full`.

### 4.20 Almacenamiento

- ✅ Imágenes del chat → Cloudflare R2 (prefix `chat/imagenes/{userId}/`) — Presigned URL + upload directo
- ✅ Documentos del chat → Cloudflare R2 (prefix `chat/documentos/{userId}/`) — Presigned URL + upload directo
- ✅ Audio del chat → Cloudflare R2 (prefix `chat/audio/{userId}/`) — Presigned URL + upload directo
- ✅ Catálogo/ofertas → siguen en Cloudinary
- 🔲 Al hard delete de chat (AMBOS eliminaron) → eliminar archivos R2 asociados

### 4.21 UX — Rendimiento

- ✅ Scroll nativo con IntersectionObserver — sentinel invisible en el tope del contenedor detecta cuándo cargar más
- ✅ Actualizaciones optimistas (mensaje aparece inmediato, sin esperar servidor)
- ✅ Transiciones instantáneas ("snappy"), sin delays ni animaciones lentas
- ✅ Caché de mensajes por conversación — cambio entre chats sin re-fetch
- ✅ Pre-carga de primeras 5 conversaciones en segundo plano (fire-and-forget)
- ✅ Montaje persistente de VentanaChat y ListaConversaciones — no se desmontan al navegar
- ✅ `content-visibility: auto` en cada burbuja — browser skipea layout/paint fuera del viewport
- ✅ `LIMITE_INICIAL = 30` mensajes al abrir chat — solo 30 del caché, IntersectionObserver carga más al scroll up
- ✅ DOM recycling en AreaMensajes — sin `key={conversacionActivaId}`, recicla nodos en vez de destruir/recrear (~2x más rápido). Reset manual con `prevConvIdRef`
- ✅ Detección de caché browser en imágenes — `img.complete && img.naturalHeight > 0` evita spinner/blur si la imagen ya está en caché HTTP

### 4.22 UX — Interfaz

- ✅ Widget overlay fullscreen (`left-0 right-0 top-[83px] bottom-0`, `z-50`)
- ✅ Click outside en desktop: minimiza (no cierra)
- ✅ Chat se cierra DESPUÉS de navegar (useEffect con useLocation.pathname) — sin flash del contenido anterior
- ✅ Botón X flotante esquina superior derecha del overlay cuando NO hay conversación activa
- ✅ X del header de VentanaChat cuando hay conversación activa
- ✅ Responsive: móvil (fullscreen, ambas vistas montadas con CSS hidden), laptop, desktop (split lista+chat)
- ✅ ESC para cerrar ChatYA en desktop
- ✅ Swipe down para cerrar en móvil (handle visual barrita gris)
- ✅ Márgenes tipo WhatsApp Web: móvil `px-3`, laptop `lg:px-12`, desktop `2xl:px-16`
- ✅ Botón scroll-to-bottom: `w-11 h-11`, gradiente azul, aparece a >60px del fondo
- ✅ Paneles: lista 320/340px, panel info 320/340px
- ✅ Selección de texto: `select-none` móvil (para long press), `select-text` desktop
- ✅ Borradores persistentes por conversación (localStorage, sobreviven logout/login)
- ✅ Input estilo WhatsApp: iconos (clip, cámara) dentro del pill a la derecha del texto, botón dinámico micrófono/enviar fuera del pill. Placeholder corto "Mensaje"
- ✅ Quote de respuesta estilo WhatsApp: flex horizontal con thumbnail a la derecha a altura completa sin padding, borde izquierdo de color, fondo oscuro. Mismo patrón en InputMensaje (barra respuesta) y BurbujaMensaje (quote inline)
- ✅ Back button nativo cierra visor de imágenes y panel info sin cerrar ChatYA (sistema 4 capas popstate centralizado en ChatOverlay)

### 4.23 Borradores Persistentes

- ✅ Al cambiar de conversación, texto no enviado se guarda como borrador
- ✅ Al regresar, borrador se restaura en el input
- ✅ Al enviar, borrador se limpia
- ✅ Persisten al refrescar y logout/login (localStorage `chatya_borradores`)
- ✅ En lista de conversaciones: `Borrador: [texto]` en color amber

**Implementación:** Store `borradores: Record<string, string>` + `guardarBorrador(id, texto)` / `limpiarBorrador(id)`. InputMensaje detecta cambio de conversación con `useEffect` + `conversacionAnteriorRef`.

### 4.24 Pendientes por implementar

- ✅ Enviar ubicación (coordenadas + mini mapa interactivo Leaflet)
- ✅ Sonido de notificación — 5 tonos (`tono_mensaje_1` a `5`), configurable via localStorage (`ay_tono_chat`, `ay_sonido_chat`), vibración 300ms en móvil
- ✅ Estados de usuario — conectado (green-600) / ausente 15min (amber-400) / desconectado (gray + "últ. vez hoy a la(s) X"). Header + PanelInfoContacto. Color verde unificado a `green-600` en los 3 indicadores del panel: "En línea", "Abierto ahora" y botón "Ubicación"
- ✅ PanelInfoContacto acciones (Silenciar, Bloquear, Eliminar) en fila horizontal `flex-row` ancladas al footer del panel. `style={{ minHeight: 0 }}` en contenedor principal para fix scroll mobile.
- ✅ Indicador "Escribiendo..." — Header de VentanaChat + preview en ConversacionItem. Múltiples conversaciones simultáneas
- 🔲 Preview de enlaces (Open Graph)

### 4.25 Archivos Compartidos (Archivos, Enlaces y Documentos)

Sección en PanelInfoContacto que muestra todos los archivos multimedia, documentos y enlaces compartidos en una conversación. Estilo WhatsApp.

**Backend — 2 endpoints + 2 funciones service:**

| Endpoint | Descripción |
|----------|-------------|
| `GET /conversaciones/:id/archivos-compartidos?categoria=imagenes&limit=30&offset=0` | Lista archivos por categoría con paginación. Categorías: `imagenes`, `documentos`, `enlaces` |
| `GET /conversaciones/:id/archivos-compartidos/conteo` | Conteo agrupado de las 3 categorías en una sola query con `FILTER` |

Lógica backend:
- Consulta tabla `chatMensajes` filtrando por `conversacionId`
- Imágenes: `tipo = 'imagen'`, Documentos: `tipo = 'documento'`, Enlaces: `tipo = 'texto'` + regex URL
- Respeta `mensajesVisiblesDesde` (no muestra archivos anteriores a eliminación del chat)
- Ordenado por `createdAt DESC` (más recientes primero)
- No requiere filtro adicional por sucursal (conversationId ya garantiza la sucursal correcta)

**Frontend — Preview en PanelInfoContacto:**

| Elemento | Detalle |
|----------|---------|
| Barra título | "Archivos, enlaces y documentos" + conteo total + flecha `>` |
| Grid preview | 3×2 (`grid-cols-3`, `aspect-square`), 6 imágenes más recientes |
| LQIP | Miniatura base64 como fondo blur, imagen real como overlay `z-10` |
| Indicador "+N" | Última celda muestra `+{restantes}` si hay más de 6 imágenes |
| Visibilidad | Sección oculta completamente si `total === 0` |

**Frontend — GaleriaArchivosCompartidos.tsx (fullscreen):**

Se abre al hacer click en la barra título o en "+N". Overlay absoluto sobre el panel.

| Elemento | Detalle |
|----------|---------|
| 3 tabs | Multimedia (imágenes), Documentos, Enlaces — con conteo al lado |
| Agrupado por mes | "Este mes", "Mes pasado", "Febrero 2026"... sticky headers |
| Tab Imágenes | Grid sin gap estilo WhatsApp (`grid-cols-3 gap-0.5`). Click abre visor con TODAS las imágenes |
| Tab Documentos | Lista con ícono coloreado por extensión (PDF=rojo, DOC=azul, XLS=verde, PPT=naranja) + nombre + tamaño. Click abre en nueva pestaña |
| Tab Enlaces | Lista con dominio extraído + URL completa. Click abre en nueva pestaña |
| Estado vacío | Ícono + texto descriptivo por categoría |
| Scroll infinito | Carga de 60 en 60 al llegar al fondo |

**Paleta PC (fondo gris del ChatOverlay — clases `lg:` únicamente):**
- Label mes: `text-[13px] text-gray-500 uppercase`; Tab activo: `text-gray-900`; inactivo: `text-gray-500` / hover `text-gray-700`; número inactivo: `text-gray-400`
- Fondos icono doc/enlace: `bg-gray-200`; íconos Download/ExternalLink: `text-gray-500`; subtextos: `text-gray-500`
- Bordes divisores: `border-gray-300`; Spinner: `border-gray-400`; Estado vacío — iconos: `text-gray-400`, texto: `text-gray-500`

**Fix scroll mobile:** `style={{ minHeight: 0 }}` requerido tanto en el contenedor raíz `flex-1 flex flex-col` como en el scroll container interno, para que `overflow-y-auto` funcione correctamente dentro de un flex-child en iOS/Android.

**Sistema de caché (3 niveles con Map a nivel de módulo):**

| Caché | Ubicación | Contenido |
|-------|-----------|-----------|
| `cachéConteoArchivos` | `PanelInfoContacto.tsx` | `Map<conversacionId, ConteoArchivosCompartidos>` — conteo por categoría |
| `cachéArchivosRecientes` | `PanelInfoContacto.tsx` | `Map<conversacionId, ArchivoCompartido[]>` — 6 imágenes del preview |
| `cachéGaleria` | `GaleriaArchivosCompartidos.tsx` | `Map<conversacionId:categoria, { items, total }>` — contenido completo por tab |

Lectura síncrona desde Map al abrir (cero flash de loading). Los 3 niveles se invalidan en cadena al enviar/recibir imagen, documento o enlace.

**Invalidación en tiempo real:**
1. `VentanaChat` detecta `mensajes.length` incrementó con tipo imagen/documento/texto-con-URL
2. Llama `invalidarCachéArchivos(conversacionId)` → borra los 3 Maps
3. Incrementa `archivosKey` (prop numérica) → `PanelInfoContacto` re-ejecuta fetch
4. Preview y conteo se actualizan sin refrescar

**Visor de imágenes desde archivos compartidos:**
- Click en imagen del preview o galería → `handleAbrirVisorArchivos(archivoId)`
- `VentanaChat` hace fetch `getArchivosCompartidos(convId, 'imagenes', 200, 0)` para cargar TODAS las imágenes
- Convierte `ArchivoCompartido[]` → `Mensaje[]` (campos mínimos) para reutilizar `VisorImagenesChat`
- Estado local `visorArchivos` (desacoplado de `visorAbierto` del store para no afectar el historial de navegación)
- Acciones: descargar activa, responder/reenviar/fijar deshabilitadas (no-op)

**Tipos TypeScript (chatya.ts):**

```typescript
type CategoriaArchivo = 'imagenes' | 'documentos' | 'enlaces';

interface ArchivoCompartido {
  id: string;
  contenido: string;    // JSON según tipo (imagen/documento) o texto con URLs
  createdAt: string;
  emisorId: string | null;
}

interface ConteoArchivosCompartidos {
  imagenes: number;
  documentos: number;
  enlaces: number;
  total: number;
}
```

### 4.26 Audio — Detalle Específico

**Formatos soportados (prioridad de detección):**

| # | MIME | Codec | Navegador |
|---|------|-------|-----------|
| 1 | `audio/webm;codecs=opus` | Opus | Chrome, Firefox (más ligero) |
| 2 | `audio/ogg;codecs=opus` | Opus | Firefox fallback |
| 3 | `audio/mp4` | AAC | Safari, iOS |
| 4 | `audio/mpeg` | MP3 | Compatibilidad general |

**Backend — Presigned URL:**

| Config | Valor |
|--------|-------|
| Endpoint | `POST /upload-audio` |
| Validación | MIME type + tamaño (5 MB máx) |
| Carpeta R2 | `chat/audio/${userId}/` |
| Expiración URL | 300 segundos |

**Frontend — Hook `useAudioChat`:**

| Config | Valor |
|--------|-------|
| API | MediaRecorder + AnalyserNode |
| Bitrate | 64 kbps (~2.4 MB en 5 min) |
| Auto-stop | 300 segundos (5 min) |
| Waveform captura | `getByteTimeDomainData()` cada 80ms |
| Waveform almacenado | 50 barras normalizadas 0-1 (via `resumirWaveform()`) |

**Flujo de envío:**
1. Tap micrófono → `getUserMedia()` → MediaRecorder inicia → pill se transforma en barra de grabación
2. Grabando → punto rojo pulsa, waveform anima en vivo, timer cuenta
3. Tap enviar → `detenerGrabacion()` → `onstop` dispara → `audioListo` se puebla con `{ blob, duracion, tamano, contentType, waveform }`
4. Efecto auto-send → `handleEnviar()` → mensaje optimista (url: 'uploading')
5. Background: presigned URL → upload directo a R2 → actualiza mensaje con URL real

**Reproductor AudioBurbuja (estilo WhatsApp):**

**Motor de reproducción: Howler.js** (v2.2+, ~7KB gzipped, MIT). Se usa en modo Web Audio API (default, sin `html5: true`) que descarga el archivo completo vía XHR y decodifica a AudioBuffer. Esto evita problemas de CORS con presigned URLs de R2 (a diferencia de `createMediaElementSource()` que requiere headers CORS). Dependencias: `howler` + `@types/howler`.

| Layout esMio | `Avatar/Velocidad → ▶ Play → Waveform + hora` |
|-------------|--------------------------------------| 
| Layout !esMio | `▶ Play → Waveform + hora → Avatar/Velocidad` |

| Elemento | Detalle |
|----------|---------|
| Play/Pause | Ícono sólido blanco (`fill="white"`), sin contenedor. `hover:bg-white/20` muestra círculo transparente. Responsive: `w-7 h-7` móvil, `lg:w-5 lg:h-5` desktop |
| Waveform | Barras coloreadas según progreso. Blancas activas (esMio) / azules (recibido). `overflow-hidden` en barras, thumb fuera del overflow |
| Seek thumb | Punto arrastrable 14px, mouse + touch drag. Clampeado 0-97% para no salirse |
| Avatar/Velocidad | 56px (`w-14`). Sin reproducir: foto del emisor o iniciales fallback. Reproduciendo: botón de velocidad (cicla 1× → 1.5× → 2× → 1×) vía `Howl.rate()`. Se resetea a 1× al terminar |
| Duración | Abajo-izquierda, muestra tiempo actual al reproducir |
| Hora + palomitas | Abajo-derecha, integrados dentro del componente |
| Fade-in | 150ms en primer play (elimina artefacto AudioContext). 50ms al reanudar tras seek drag |
| AudioContext pre-warm | `Howler.ctx.resume()` antes de crear instancia Howl, previene beep de inicialización |
| Progress tracking | `requestAnimationFrame` loop con validación de `sound.seek()` (puede retornar Howl object durante init) |

**Contenido almacenado en BD (campo `contenido` tipo JSON string):**
```typescript
interface ContenidoAudio {
  url: string;       // URL pública de R2
  duracion: number;  // Segundos
  tamano: number;    // Bytes
  waveform: number[]; // 50 valores normalizados 0-1
}
```

**UI Grabación (reemplaza pill del InputMensaje):**

| Elemento | Detalle |
|----------|---------|
| Botón cancelar | X rojo, cancela y descarta grabación |
| Indicador | Punto rojo pulsante + barras waveform en vivo |
| Timer | `mm:ss` actualizado cada segundo |
| Botón enviar | Rojo, detiene grabación y dispara envío automático |

---

## 5. Vistas del Panel Lateral {#5-panel-lateral}

Se abre al hacer click en el header de la ventana del chat (nombre/avatar del contacto). Panel empuja el chat (`flex-row overflow-hidden`), no lo cubre.

### 5.1 Vista: Usuario → Usuario (modo personal)

| Elemento | Detalle |
|----------|---------|
| Avatar del contacto | Imagen circular (clickeable → ModalImagenes) |
| Nombre del contacto | Texto |
| Estado | conectado / ausente / desconectado / últ. vez [fecha/hora] |
| Archivos compartidos | ✅ Preview grid 3×2 + galería fullscreen con 3 tabs (Multimedia, Documentos, Enlaces) |
| Silenciar notificaciones | Toggle on/off |
| Bloquear usuario | Botón (ejecución directa sin confirmación). **Visible en todos los modos** (personal y comercial). El bloqueo es solo de mensajería — no afecta la relación comercial. |
| Eliminar chat | Botón (ejecución directa sin confirmación) |

### 5.2 Vista: Usuario → Negocio (cliente viendo al negocio)

| Elemento | Detalle |
|----------|---------|
| Logo del negocio | Imagen circular |
| Nombre del negocio | Texto |
| Nombre de la sucursal | Texto (si aplica) |
| Categoría del negocio | Texto (ej: "Restaurante") |
| Calificación | Estrellas (1-5) + reseñas |
| Estado del negocio | Abierto / Cerrado calculado con `calcularAbierto(horarios)` |
| Horario de atención | Resumen del horario hoy + botón clickeable → ModalHorarios |
| Botón "Ver perfil" | **Monta `PaginaPerfilNegocio` como componente directo** (sin iframe, misma instancia React). Props: `sucursalIdOverride` + `modoPreviewOverride`. `BreakpointOverride forzarMobile` + CSS `.perfil-embebido` fuerzan vista mobile dentro del panel estrecho. PC: panel se expande a 500px. Mobile: sub-vista fullscreen con ← back. Botón atrás nativo cierra la vista perfil via `history.pushState`. |
| Botón "Ubicación" | Abre Google Maps en nueva pestaña |
| Archivos compartidos | ✅ Preview grid 3×2 + galería fullscreen con 3 tabs (Multimedia, Documentos, Enlaces) |
| Silenciar notificaciones | Toggle |
| Eliminar chat | Botón (ejecución directa sin confirmación) |

**Datos:** Fetch `obtenerPerfilSucursal(sucursalId)` → `NegocioCompleto`

### 5.3 Vista: Negocio → Usuario (comerciante viendo al cliente)

| Elemento | Detalle |
|----------|---------|
| Avatar del cliente | Imagen circular |
| Nombre del cliente | Texto |
| Estado | conectado / ausente / desconectado / últ. vez |
| ¿Es cliente registrado? | "Tiene billetera en tu negocio: Sí/No" |
| Nivel de lealtad | Bronce / Plata / Oro (solo si es cliente) |
| Total de puntos acumulados | Número (solo si es cliente) |
| Fecha de última compra | Fecha (solo si es cliente) |
| Botón "Ver detalle" | Abre ModalDetalleCliente (CustomEvent) |
| Archivos compartidos | ✅ Preview grid 3×2 + galería fullscreen con 3 tabs (Multimedia, Documentos, Enlaces) |
| Silenciar notificaciones | Toggle |
| Eliminar chat | Botón (ejecución directa sin confirmación) |

**Datos:** Fetch `getDetalleCliente()`. **Valor diferenciador:** el comerciante ve el historial de lealtad del cliente directamente desde el chat.

**NO incluyen las 3 vistas:** bio/info del usuario, mensajes fijados/destacados en panel lateral.

---

## 6. Reglas de Negocio {#6-reglas-de-negocio}

### 6.1 Creación de Conversación

- Al crear: verificar si ya existe entre los 2 participantes en el mismo modo Y misma sucursal
- Si ya existe: retornarla (no crear duplicada)
- Registrar `contexto_tipo` y `contexto_referencia_id` del origen

### 6.2 Envío de Mensajes

- Flujo: optimistic update en frontend → enviar por API → Socket.io notifica al receptor en paralelo
- Validar contenido ≤ 5,000 caracteres (texto)
- Validar bloqueo: no permitir enviar si estás bloqueado por el receptor
- Actualizar `updated_at`, `ultimo_mensaje_texto`, `ultimo_mensaje_fecha`, `ultimo_mensaje_tipo`, `ultimo_mensaje_estado`, `ultimo_mensaje_emisor_id` en la conversación
- Incrementar `no_leidos` del receptor
- Si la conversación estaba eliminada por el receptor (`eliminada_por_pX = true`), restaurarla automáticamente
- Mensaje optimista debe tener `emisorId: miId` (si es null, la burbuja aparece a la izquierda y salta a la derecha)

### 6.3 Reenvío de Mensajes

Dos operaciones en una:
1. Buscar/crear conversación con el destinatario
2. Crear mensaje nuevo con `reenviado_de_id` apuntando al original

El usuario puede seleccionar **múltiples contactos a la vez** (sin límite) → se reenvía a todos. `ModalReenviar.tsx` muestra 15 conversaciones recientes + búsqueda personas/negocios con GPS.

**Fix importante:** Al reenviar a un negocio, se debe pasar `{ destinatarioId, destinatarioModo, destinatarioSucursalId }` completos al backend. Si solo se pasa `destinatarioId`, el controller hace default `modo: 'personal'` y crea una conversación personal con el dueño en vez de reutilizar la comercial existente. `handleReenviarAConversacion` recibe `conv: Conversacion` completa y extrae los datos del otro participante.

### 6.4 Eliminación de Mensajes

- Soft delete: `eliminado = true, eliminado_at = now()`
- El mensaje desaparece completamente del chat (`return null` en BurbujaMensaje)
- Se elimina para AMBOS participantes

### 6.5 Eliminación de Conversaciones

- **Paso 1:** Usuario elimina → `eliminada_por_pX = true` + `mensajes_visibles_desde_pX = now()` (soft delete individual con timestamp de corte)
- **Paso 2:** Si AMBOS eliminaron → hard delete de conversación + todos los mensajes + eliminar archivos R2
- Si solo uno eliminó: el otro aún puede ver el chat normal
- **Limpieza de mensajes huérfanos:** si ambos tienen timestamp de visibilidad, se borran mensajes anteriores al más antiguo de los dos (mensajes que ninguno puede ver). Se ejecuta inline en `eliminarConversacion()`. Ejemplo: A elimina Día 10, B elimina Día 25 → se borran mensajes con `createdAt < Día 10`
- `listarMensajes()` filtra con `WHERE createdAt >= visibleDesde` para no mostrar mensajes pre-eliminación
- `buscarMensajes()` aplica el mismo filtro de visibilidad

### 6.6 Lectura de Mensajes (Palomitas)

- Al abrir una conversación: marcar todos los mensajes como leídos
- **Verificar `document.visibilityState === 'visible'`** antes de marcar — no marcar con pestaña en segundo plano
- Listener `visibilitychange` en `useEffect`: cuando la pestaña vuelve a primer plano y hay conversación activa, marca como leído en ese momento
- Emitir `chatya:leido` por Socket.io → el emisor original ve palomitas azules
- Multi-dispositivo: evento emitido a TODOS los rooms del usuario
- Filtro en listener `chatya:leido`: solo marca mensajes donde `m.emisorId !== leidoPor` (evita palomitas azules falsas en mensajes propios)

### 6.7 Estado de Entrega

- `enviado`: mensaje guardado en BD (1 palomita gris)
- `entregado`: receptor tiene Socket.io conectado (2 palomitas grises)
- `leido`: receptor abrió la conversación (2 palomitas azules)

### 6.8 Rate Limiting

- 30 mensajes por minuto por usuario
- Si se excede: error 429

### 6.9 Respuestas Automáticas

- Si un cliente escribe a un negocio fuera de horario y `respuesta_automatica_activa = true`
- El sistema envía un mensaje tipo `sistema` con texto configurado
- Solo una vez por sesión

### 6.10 Filtrado por Sucursal Activa (Modo Comercial)

En modo comercial, ChatYA filtra por `sucursalActiva` del dueño, consistente con Business Studio.

| Componente | Comportamiento |
|-----------|----------------|
| `listarConversaciones()` | Filtra por `participanteXSucursalId` |
| `contarTotalNoLeidos()` | Filtra badge por sucursal activa |
| `crearObtenerConversacion()` | Compara sucursalId al buscar existente |
| Listener `chatya:mensaje-nuevo` | Verifica si la conversación pertenece a la sucursal activa antes de incrementar badge |
| Guards en store | No ejecuta en modo comercial si `sucursalActiva` no está lista |

---

## 7. ScanYA + Chat — Empleados {#7-scanya-empleados}

### Decisión: Todos responden como el negocio

- El chat del cliente es con "Pizzería Roma", NO con "Carlos el empleado"
- Dueño, gerentes y empleados con acceso al chat ven y responden como el negocio
- El cliente NUNCA sabe quién contestó
- **Tracking interno:** `chat_mensajes.empleado_id` guarda quién respondió
- El dueño puede ver "Respondido por Carlos" en Business Studio

### Implementación de autenticación

ScanYA usa su propio token (`sy_access_token`). Para acceder a ChatYA desde ScanYA se implementó `verificarTokenChatYA` en el middleware de auth, que acepta ambos tokens:

- **Token AnunciaYA:** flujo normal
- **Token ScanYA:** mapea `negocioUsuarioId → usuarioId`, `modoActivo = 'comercial'`, `sucursalAsignada = sucursalId`. El campo `negocioUsuarioId` se agrega al payload ScanYA en login (dueño, gerente y empleado).

El interceptor Axios (`api.ts`) detecta contexto ScanYA (`window.location.pathname.startsWith('/scanya')`) y agrega automáticamente `?sucursalId=` en todas las llamadas a `/chatya`, garantizando que el backend filtre conversaciones de la sucursal correcta.

### Flujo en ScanYA

1. Usuario abre ScanYA → se conecta Socket.io + se inicializa badge de no leídos (`inicializarScanYA`)
2. Presiona botón ChatYA en `IndicadoresRapidos` → `PaginaScanYA` intercepta la ruta y abre `ChatOverlay`
3. `ChatOverlay` carga conversaciones filtradas por la sucursal activa
4. Selecciona conversación → lee mensajes
5. Responde → `emisor_id` = `negocioUsuarioId` (dueño), `empleado_id` = quien respondió
6. El cliente ve que "Pizzería Roma" respondió

### Montaje del ChatOverlay en ScanYA

ScanYA no usa `MainLayout` (que monta `ChatOverlay` automáticamente). Por eso `PaginaScanYA` monta su propio `<ChatOverlay />` al final del render, y gestiona la inicialización con un ref guard para evitar doble ejecución en StrictMode.

---

## 8. Infraestructura Reutilizada {#8-infraestructura}

| Componente | Archivo | Qué se reutiliza |
|------------|---------|-------------------|
| Socket.io backend | `apps/api/src/socket.ts` | `emitirAUsuario()`, `obtenerIO()`, rooms por usuario |
| Socket.io frontend | `apps/web/src/services/socketService.ts` | `escucharEvento()`, `emitirEvento()`, reconexión automática, timer inactividad 15 min (ausente/conectado). Fallback `ay_usuario → sy_usuario` para obtener userId en contexto ScanYA |
| ChatOverlay | `apps/web/src/components/layout/ChatOverlay.tsx` | Integración con useUiStore se mantiene |
| UI Store | `apps/web/src/stores/useUiStore.ts` | `chatYAAbierto`, `chatYAMinimizado`, `abrirChatYA`, `cerrarChatYA` |
| R2 Service | `apps/api/src/services/r2.service.ts` | Subida de archivos con presigned URLs. Validación condicional con param `tiposPermitidos` |
| Optimistic Upload | `apps/web/src/hooks/useOptimisticUpload.ts` | Patrón blob local → R2 → reemplazo silencioso |
| MainLayout | `apps/web/src/components/layout/MainLayout.tsx` | Importa `<ChatOverlay />` |
| Auth Store | `apps/web/src/stores/useAuthStore.ts` | Conecta Socket.io al login, carga `cargarNoLeidos()` de ChatYA en `login()` y `hidratarAuth()` |

---

## 9. Referencia API Backend Completa {#9-api-backend}

**Base URL:** `/api/chatya`  
**Auth:** Todas las rutas requieren `Authorization: Bearer <token>`  
**Modo:** Se extrae automáticamente de `req.usuario.modoActivo`

### 9.1 Endpoints — 34 total

| # | Método | Ruta | Descripción |
|---|--------|------|-------------|
| 1 | GET | `/conversaciones` | Lista chats paginados (`?modo=personal&limit=20&offset=0&sucursalId=UUID&archivadas=true`) |
| 2 | GET | `/conversaciones/:id` | Detalle de una conversación |
| 3 | POST | `/conversaciones` | Crear/obtener conversación |
| 4 | PATCH | `/conversaciones/:id/fijar` | Toggle fijar |
| 5 | PATCH | `/conversaciones/:id/archivar` | Toggle archivar |
| 6 | PATCH | `/conversaciones/:id/silenciar` | Toggle silenciar |
| 7 | PATCH | `/conversaciones/:id/leer` | Marcar mensajes como leídos |
| 8 | DELETE | `/conversaciones/:id` | Eliminar (soft → hard si ambos) |
| 9 | GET | `/conversaciones/:id/mensajes` | Mensajes paginados (`?limit=30&offset=0`) |
| 10 | POST | `/conversaciones/:id/mensajes` | Enviar mensaje |
| 11 | PATCH | `/mensajes/:id` | Editar mensaje propio |
| 12 | DELETE | `/mensajes/:id` | Eliminar mensaje propio |
| 13 | POST | `/mensajes/:id/reenviar` | Reenviar a otro usuario |
| 14 | GET | `/contactos` | Lista contactos (`?tipo=personal`) |
| 15 | POST | `/contactos` | Agregar contacto |
| 16 | DELETE | `/contactos/:id` | Eliminar contacto |
| 17 | GET | `/bloqueados` | Lista bloqueados |
| 18 | POST | `/bloqueados` | Bloquear usuario |
| 19 | DELETE | `/bloqueados/:id` | Desbloquear (id = uuid del bloqueado) |
| 20 | POST | `/mensajes/:id/reaccion` | Toggle reacción (`{ emoji }`) |
| 21 | GET | `/mensajes/:id/reacciones` | Reacciones agrupadas por emoji |
| 22 | GET | `/conversaciones/:id/fijados` | Lista mensajes fijados |
| 23 | POST | `/conversaciones/:id/fijados` | Fijar mensaje (`{ mensajeId }`) |
| 24 | DELETE | `/conversaciones/:convId/fijados/:msgId` | Desfijar mensaje |
| 25 | GET | `/conversaciones/:id/buscar` | Búsqueda full-text (`?texto=hola&limit=20`) |
| 26 | GET | `/no-leidos` | Total no leídos para badge (`?modo=personal&sucursalId=UUID`) |
| 27 | GET | `/buscar-personas` | Buscar usuarios por nombre/alias (`?q=texto`) |
| 28 | GET | `/buscar-negocios` | Buscar negocios con distancia (`?q=texto&ciudad=X&lat=Y&lon=Z`) |
| 29 | GET | `/mis-notas` | Obtener o crear conversación "Mis Notas" |
| 30 | POST | `/upload-imagen` | Presigned URL para subir imagen a R2 |
| 31 | POST | `/upload-documento` | Presigned URL para subir documento a R2 |
| 32 | GET | `/conversaciones/:id/archivos-compartidos` | Lista archivos compartidos por categoría (`?categoria=imagenes&limit=30&offset=0`) |
| 33 | GET | `/conversaciones/:id/archivos-compartidos/conteo` | Conteo agrupado de imágenes, documentos y enlaces |
| 34 | POST | `/upload-audio` | Presigned URL para subir audio a R2 (`{ nombreArchivo, contentType, tamano }`) |

### 9.2 Service — 31 funciones

| # | Función | Descripción |
|---|---------|-------------|
| 1 | `listarConversaciones()` | Filtra por modo + elimina borradas + datos del otro participante + filtra por sucursalId en modo comercial + excluye notas + filtra archivadas + retorna contextoNombre |
| 2 | `obtenerConversacion()` | Detalle con verificación de acceso + contextoNombre |
| 3 | `crearObtenerConversacion()` | Busca existente o crea nueva + verifica bloqueo + compara sucursalId |
| 4 | `toggleFijarConversacion()` | Toggle por participante individual |
| 5 | `toggleArchivarConversacion()` | Toggle por participante individual |
| 6 | `toggleSilenciarConversacion()` | Toggle por participante individual |
| 7 | `eliminarConversacion()` | Soft delete → hard delete si ambos + guarda timestamp visibilidad + limpia mensajes huérfanos inline |
| 8 | `listarMensajes()` | Paginados + filtra eliminados + filtra por mensajesVisiblesDesde + pobla respuestaA + reacciones batch |
| 9 | `enviarMensaje()` | Insert + preview + Socket.io a ambos + restaura si eliminada + pobla respuestaA antes de emitir |
| 10 | `editarMensaje()` | Solo texto propio + pobla respuestaA si existe + Socket.io |
| 11 | `eliminarMensaje()` | Soft delete + reemplaza contenido + recalcula preview conversación (busca último mensaje vivo, genera textoPreview según tipo) + Socket.io con `nuevoPreview` |
| 12 | `reenviarMensaje()` | Crea conv si no existe + envía copia con reenviadoDeId |
| 13 | `marcarMensajesLeidos()` | Estado → leido + reset contador + Socket.io palomitas |
| 14 | `listarContactos()` | Por tipo con datos negocio + sucursal específica (nombre, logo) |
| 15 | `agregarContacto()` | Valida duplicado + auto-contacto + auto-deriva negocioId desde sucursalId |
| 16 | `eliminarContacto()` | Verifica ownership |
| 17 | `listarBloqueados()` | Con datos del usuario bloqueado |
| 18 | `bloquearUsuario()` | Valida duplicado + auto-bloqueo |
| 19 | `desbloquearUsuario()` | Elimina registro |
| 20 | `toggleReaccion()` | Agrega/quita + Socket.io + persiste preview en conversación |
| 21 | `obtenerReacciones()` | Agrupadas por emoji con nombre de usuarios |
| 22 | `fijarMensaje()` | Verifica acceso + pertenencia + duplicado + Socket.io |
| 23 | `desfijarMensaje()` | Verifica acceso + Socket.io |
| 24 | `listarMensajesFijados()` | Con contenido del mensaje original |
| 25 | `buscarMensajes()` | Full-text `to_tsvector('spanish')` + filtra por mensajesVisiblesDesde |
| 26 | `contarTotalNoLeidos()` | Suma no_leidos para badge + filtra por sucursalId en modo comercial |
| 27 | `obtenerOCrearMisNotas()` | Busca/crea/restaura conversación de notas |
| 28 | `generarUrlUploadDocumentoChat()` | Presigned URL para documentos (9 tipos MIME, 25MB) |
| 29 | `listarArchivosCompartidos()` | Lista archivos por categoría (imagenes/documentos/enlaces) con paginación. Filtra por `mensajesVisiblesDesde`. Enlaces extraídos con regex de mensajes tipo texto |
| 30 | `contarArchivosCompartidos()` | Query única con `count(*) FILTER(WHERE ...)` para las 3 categorías. Retorna `{ imagenes, documentos, enlaces, total }` |
| 31 | `generarUrlUploadAudioChat()` | Presigned URL para audio (4 tipos MIME, 5MB). Carpeta `chat/audio/${userId}/`, expiración 300s |

### 9.3 Helpers internos

**Service:**

| Helper | Descripción |
|--------|-------------|
| `determinarPosicion()` | ¿El usuario es p1 o p2? Retorna 'p1', 'p2', o null |
| `existeBloqueo()` | Verifica bloqueo bidireccional entre 2 usuarios |
| `obtenerDatosParticipante()` | Nombre, avatar, negocio, sucursal del otro participante |
| `actualizarPreview()` | Último mensaje texto/tipo + incrementa no leídos del receptor |
| `resolverContextoNombre()` | Resuelve nombre del recurso según `contexto_tipo` (negocio→nombre, oferta→título). Retorna `string | null` |

**Controller:**

| Helper | Descripción |
|--------|-------------|
| `obtenerUsuarioId(req)` | Extrae `usuarioId` del token JWT |
| `obtenerModo(req)` | Extrae `modoActivo` del token, default `'personal'` |
| `obtenerSucursalId(req)` | Gerente: `sucursalAsignada` del token. Dueño: `sucursalId` del query param (interceptor Axios). Default `null` |

### 9.4 Eventos Socket.io — 11 total

| Evento | Dirección | Payload |
|--------|-----------|---------|
| `chatya:mensaje-nuevo` | Server → Client | `{ conversacionId, mensaje }` |
| `chatya:mensaje-editado` | Server → Client | `{ conversacionId, mensaje }` |
| `chatya:mensaje-eliminado` | Server → Client | `{ conversacionId, mensajeId, eraUltimoMensaje, nuevoPreview? }` |
| `chatya:leido` | Server → Client | `{ conversacionId, leidoPor, leidoAt }` |
| `chatya:escribiendo` | Client ↔ Server | `{ conversacionId, destinatarioId }` |
| `chatya:dejar-escribir` | Client ↔ Server | `{ conversacionId, destinatarioId }` |
| `chatya:entregado` | Client → Server → Client | `{ conversacionId, emisorId, mensajeIds }` |
| `chatya:estado-usuario` | Server → Broadcast | `{ usuarioId, estado }` |
| `chatya:consultar-estado` | Client → Server → Client | `usuarioId` → `{ usuarioId, estado, ultimaConexion? }` |
| `chatya:reaccion` | Server → Client | `{ conversacionId, mensajeId, emoji, usuarioId, accion }` |
| `chatya:mensaje-fijado` | Server → Client | `{ conversacionId, mensajeId, fijadoPor }` |
| `chatya:mensaje-desfijado` | Server → Client | `{ conversacionId, mensajeId }` |

### 9.5 Cron Job

| Config | Valor |
|--------|-------|
| Archivo | `apps/api/src/cron/chatya.cron.ts` |
| Frecuencia | Diario a las 3:00 AM |
| Lógica | Busca `updated_at < 6 meses`, hard delete con CASCADE |
| Activación | `inicializarCronChatYA()` en `index.ts` principal |
| TODO | Limpiar archivos R2 antes del delete |

---

## 10. Arquitectura Frontend {#10-arquitectura-frontend}

### 10.1 Store Zustand — `useChatYAStore.ts` (1,940 líneas)

**Estado principal:**

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `vistaActiva` | `VistaChatYA` | Vista actual (lista, chat, buscar-nuevo, contactos, bloqueados, archivados, busqueda) |
| `conversacionActivaId` | `string \| null` | Chat abierto |
| `misNotasId` | `string \| null` | ID conversación Mis Notas |
| `conversaciones` | `Conversacion[]` | Lista activa |
| `conversacionesArchivadas` | `Conversacion[]` | Lista archivados |
| `mensajes` | `Mensaje[]` | Mensajes del chat activo |
| `mensajesFijados` | `MensajeFijado[]` | Fijados del chat activo |
| `contactos` | `Contacto[]` | Lista de contactos |
| `bloqueados` | `UsuarioBloqueado[]` | Lista de bloqueados |
| `borradores` | `Record<string, string>` | Borradores persistentes (localStorage) |
| `totalNoLeidos` | `number` | Badge global |
| `noLeidosArchivados` | `number` | Badge archivados |
| `cacheMensajes` | `Record<string, Mensaje[]>` | Caché por conversación |
| `cacheTotalMensajes` | `Record<string, number>` | Total mensajes por conversación |
| `cacheHayMas` | `Record<string, boolean>` | Si hay más por cargar |
| `cacheFijados` | `Record<string, MensajeFijado[]>` | Caché fijados por conversación |
| `chatTemporal` | `ChatTemporal \| null` | Chat nuevo antes de que exista conversación real |
| `escribiendo` | `EstadoEscribiendo \| null` | Estado "escribiendo..." del otro participante |
| `resultadosBusqueda` | `Mensaje[]` | Resultados de búsqueda dentro del chat |
| `enviandoMensaje` | `boolean` | Loading de envío |

**44 acciones:** `inicializar`, `inicializarScanYA`, `setVistaActiva`, `abrirConversacion`, `abrirChatTemporal`, `transicionarAConversacionReal`, `volverALista`, `cargarConversaciones(silencioso?)`, `cargarArchivados`, `cargarMensajes`, `cargarMensajesAntiguos`, `cargarMensajesFijados`, `cargarContactos`, `cargarBloqueados`, `cargarMisNotas`, `cargarNoLeidos`, `cargarNoLeidosArchivados`, `crearConversacion`, `enviarMensaje`, `editarMensaje`, `eliminarMensaje`, `reenviarMensaje`, `marcarComoLeido`, `toggleFijar`, `toggleArchivar`, `toggleSilenciar`, `toggleReaccion`, `agregarContacto`, `eliminarContacto`, `editarAliasContacto`, `bloquearUsuario`, `desbloquearUsuario`, `fijarMensaje`, `desfijarMensaje`, `buscarMensajes`, `limpiarBusqueda`, `precargarMensajes`, `refrescarMensajesSilencioso`, `setEscribiendo`, `guardarBorrador`, `limpiarBorrador`, `limpiar`, `eliminarConversacion`

**Flag `silencioso` en `cargarConversaciones()`:** Cuando es `true`, no muestra skeleton de carga. Se usa al cambiar sucursal o modo Personal↔Comercial para evitar parpadeo visual. La lista se reemplaza silenciosamente en background.

**Guards anti-flash:** `cargarConversaciones()` y `cargarNoLeidos()` NO ejecutan en modo comercial si `sucursalActiva` no está lista. Elimina flash de datos incorrectos al cambiar de modo/sucursal.

**`inicializar()` solo al abrir:** Effect con ref guard en ChatOverlay para que solo se ejecute al abrir el chat, no al cambiar modo/sucursal. Badge reactivo a sucursal se actualiza sin necesidad de abrir el chat.

**11 listeners Socket.io:** Los 4 principales (`mensaje-nuevo`, `mensaje-editado`, `mensaje-eliminado`, `leido`) actualizan tanto los mensajes activos como el caché de conversaciones no activas.

### 10.2 Service API — `chatyaService.ts` (685 líneas)

36 funciones HTTP agrupadas:

| Grupo | Funciones |
|-------|-----------|
| Conversaciones (1-8) | `getConversaciones`, `getConversacion`, `crearConversacion`, `toggleFijarConversacion`, `toggleArchivarConversacion`, `toggleSilenciarConversacion`, `marcarComoLeido`, `eliminarConversacion` |
| Mensajes (9-13) | `getMensajes`, `enviarMensaje`, `editarMensaje`, `eliminarMensaje`, `reenviarMensaje` |
| Contactos (14-17) | `getContactos`, `agregarContacto`, `eliminarContacto`, `editarAliasContacto` |
| Bloqueo (18-20) | `getBloqueados`, `bloquearUsuario`, `desbloquearUsuario` |
| Reacciones (21-22) | `toggleReaccion`, `getReacciones` |
| Fijados (23-25) | `getMensajesFijados`, `fijarMensaje`, `desfijarMensaje` |
| Búsqueda (26) | `buscarMensajes` (full-text `to_tsvector('spanish')`) |
| Badge (27) | `getNoLeidos` |
| Personas/Negocios (28-29) | `buscarPersonas`, `buscarNegocios` |
| Mis Notas (30) | `getMisNotas` |
| Multimedia (31-34) | `obtenerPresignedUrlImagen`, `subirArchivoAR2`, `obtenerPresignedUrlDocumento`, `obtenerPresignedUrlAudio` |
| Archivos compartidos (35-36) | `getArchivosCompartidos`, `getConteoArchivosCompartidos` |

### 10.3 Types — `chatya.ts` (530 líneas)

39 tipos/interfaces organizados en:

| Grupo | Tipos |
|-------|-------|
| Enums | `ModoChatYA`, `TipoMensaje`, `EstadoMensaje`, `ContextoTipo` |
| Base | `ListaPaginada<T>`, `OtroParticipante`, `Conversacion`, `Mensaje` |
| Multimedia | `ContenidoImagen`, `ContenidoAudio`, `PresignedUrlR2`, `MetadatosImagen` |
| Archivos compartidos | `CategoriaArchivo`, `ArchivoCompartido`, `ConteoArchivosCompartidos` |
| Inputs | `CrearConversacionInput`, `EnviarMensajeInput`, `EditarMensajeInput`, `ReenviarMensajeInput`, `AgregarContactoInput`, `BloquearUsuarioInput`, `ReaccionInput` |
| Entidades | `Contacto`, `ContactoDisplay`, `UsuarioBloqueado`, `ReaccionAgrupada`, `MensajeFijado` |
| Socket.io payloads | `EventoMensajeNuevo`, `EventoMensajeEditado`, `EventoMensajeEliminado`, `EventoLeido`, `EventoEscribiendo`, `EventoEntregado`, `EventoEstadoUsuario`, `EventoReaccion`, `EventoMensajeFijado`, `EventoMensajeDesfijado` |
| Búsqueda | `PersonaBusqueda`, `NegocioBusqueda` |
| UI | `VistaChatYA` (7 vistas: lista, chat, buscar-nuevo, contactos, bloqueados, archivados, busqueda), `EstadoEscribiendo` |

### 10.4 ChatOverlay — `ChatOverlay.tsx` (711 líneas)

Componente principal. 3 estados: cerrado, minimizado (barra avatares 56px), expandido (split).

| Config | Valor |
|--------|-------|
| Panel expandido | 700px lg / 850px 2xl, split lista (~320px) + chat |
| Panel minimizado | Barra lateral derecha 56px solo en desktop |
| Móvil | Fullscreen inset-0, ambas vistas montadas con CSS hidden |
| Layout | Fullscreen `left-0 right-0 top-[83px] bottom-0`, `z-50` |
| Logo estado vacío | `/logo-ChatYA-blanco.webp` |

**Guards:** `seAbrioPreviamente` (monta una vez, toggle hidden), `seAbrioChatRef` (VentanaChat lazy mount, nunca se desmonta), `inicializar` solo al abrir (ref guard).

**Perfil de negocio embebido (sin iframe):** Anteriormente ChatOverlay renderizaba un iframe invisible para precargar el perfil. Esto fue reemplazado por renderizado directo de `PaginaPerfilNegocio` como componente dentro de `PanelInfoContacto`. Se usan dos mecanismos para forzar vista mobile en un panel estrecho: (1) `BreakpointOverride` context que hace que `useBreakpoint()` devuelva `esMobile: true` en todos los sub-componentes (SeccionOfertas, SeccionCatalogo, OfertaCard, etc.), y (2) CSS overrides en `index.css` con `.perfil-embebido` y `.perfil-contenedor` que neutralizan clases Tailwind `lg:`/`2xl:`. `.perfil-contenedor` usa `transform: translateZ(0)` para contener modales `fixed` dentro del panel. `PaginaPerfilNegocio` acepta props opcionales `sucursalIdOverride` y `modoPreviewOverride` para funcionar sin router.

### 10.5 Hooks Personalizados

| Hook | Archivo | Función |
|------|---------|---------|
| `useImagenChat` | `useImagenChat.ts` | `leerDimensiones()`, `optimizarImagen()` (canvas WebP max 1920px, 0.85), `generarLQIP()` (16px base64), `procesarImagen()`, `setCaption()`, `limpiar()`. Soporta arrays hasta 10 |
| `useDocumentoChat` | `useDocumentoChat.ts` | Valida tipos MIME + tamaño (25MB). Exporta `ACCEPT_DOCUMENTOS`, `formatearTamano()`, `esDocumentoPermitido()` |
| `useAudioChat` | `useAudioChat.ts` | MediaRecorder + AnalyserNode. Detección de formato (WebM→OGG→MP4→MPEG). Waveform en vivo (~60 samples/seg). Auto-stop 5 min. Exporta: `grabando`, `duracion`, `waveformEnVivo`, `audioListo`, `error`, `iniciarGrabacion()`, `detenerGrabacion()`, `cancelarGrabacion()`, `limpiar()`. Retorna `AudioListo { blob, duracion, tamano, contentType, waveform: number[] }` |

**Constantes del hook de imágenes:**
```typescript
const MAX_ANCHO = 1920;
const CALIDAD_WEBP = 0.85;
const LQIP_ANCHO = 16;
const MAX_TAMANO = 15_000_000; // 15 MB
```

**Constantes del hook de audio:**
```typescript
const MAX_DURACION_SEG = 300;       // 5 minutos
const MAX_TAMANO_AUDIO = 5_000_000; // 5 MB
const BITRATE = 64_000;             // 64 kbps
const BARRAS_WAVEFORM = 50;         // Barras normalizadas 0-1
const TIPOS_AUDIO_PERMITIDOS = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
```

---

## 11. Patrones de Implementación {#11-patrones}

### 11.1 Pipeline Zero-Flicker para Imágenes

**Flujo del emisor:**
```
1. Usuario selecciona/toma/arrastra imagen
2. useImagenChat → leerDimensiones() con new Image()
3. Franja preview: thumbnail + input caption + botón X
4. Usuario presiona Enviar
5. optimizarImagen() (canvas WebP, max 1920px, calidad 0.85)
6. generarLQIP() (canvas 16px ancho, WebP base64)
7. Burbuja optimista con blob local + dimensiones exactas
8. En paralelo: presigned URL → upload a R2 → enviarMensaje con JSON completo
9. Backend confirma → preload imagen R2 → swap sin parpadeo
10. Revocar blob local
```

**Flujo del receptor:**
```
1. Socket.io entrega mensaje con JSON completo (url + dimensiones + miniatura)
2. Contenedor con aspect ratio fijo → 0 layout shift
3. Capa 1: <img src={miniatura}> con blur(20px) → instantáneo
4. Capa 2: <img src={url}> con opacity: 0
5. onload capa 2 → opacity: 1 (transition 150ms)
```

**Componente ImagenBurbuja (dentro de BurbujaMensaje.tsx):**
```tsx
<div style={{ width, paddingBottom: `${(alto/ancho)*100}%` }}>
  <img src={miniatura} style={{ filter: 'blur(20px)' }} />
  <img src={url} onLoad={() => setCargada(true)}
       style={{ opacity: cargada ? 1 : 0, transition: 'opacity 150ms' }} />
</div>
```

### 11.2 Scroll Nativo con IntersectionObserver

Sentinel invisible en el tope del contenedor:
```tsx
<div ref={sentinelRef} className="h-1 w-full" />
```

Observer con `rootMargin: '200px 0px 0px 0px'` detecta cuando cargar más. Flag `cargandoAntiguosRef` previene múltiples cargas.

**Preservación de scroll:** Guarda `scrollHeight` ANTES de insertar mensajes antiguos. Después: `el.scrollTop = nuevoScrollHeight - prevScrollHeight`.

**Scroll listener con requestAnimationFrame:** Detecta si usuario está al fondo (< 60px), controla botón scroll-to-bottom, actualiza fecha sticky.

### 11.3 Caché de Mensajes por Conversación

**Flujo de `abrirConversacion(id)`:**
```
1. Guardar mensajes del chat anterior en caché
2. ¿Hay caché? → SÍ: mostrar instantáneamente + refrescar silencioso en background
                → NO: loading → API call normal
3. Cargar fijados + marcar leído (en paralelo)
```

**Pre-carga:** Al abrir ChatYA, pre-carga las primeras 5 conversaciones sin caché. Fire-and-forget.

**Actualización en tiempo real:** Los 4 listeners Socket.io actualizan el caché cuando la conversación NO es la activa (prepend, reemplazo, eliminación, palomitas).

**Limpieza:** Al cambiar modo/sucursal/logout/F5. NO se borra al cerrar/reabrir ChatYA ni al navegar entre chats.

### 11.4 Montaje Persistente con CSS Hidden

En vez de `{visible && <Componente />}` (destruye/recrea), se usa `<div className={visible ? '' : 'hidden'}><Componente /></div>`.

| Componente | Técnica | Beneficio |
|---|---|---|
| ChatOverlay | ref `seAbrioPreviamente` → primera apertura monta, después toggle hidden | No recarga imágenes al cerrar/reabrir |
| VentanaChat | ref `seAbrioChatRef` → monta al primer chat, NUNCA se desmonta | Scroll nativo persiste entre chats |
| ListaConversaciones | 4 vistas (Normal/Archivados/Contactos/Búsqueda) siempre montadas | Cambiar vistas sin re-render |
| PanelInfoContacto | ref `panelMontado` → monta en cuanto carga la conversación (eager, no al primer click) → después hidden | No recarga datos al abrir/cerrar. Bloque B monta `PaginaPerfilNegocio` directo (lazy loaded) con `BreakpointOverride forzarMobile`. Maneja `history.pushState` propio para botón atrás nativo |

**Guard `ventanaChatMontada`:** `useRef(false)` → `true` cuando `enChat` es truthy por primera vez. NUNCA se desmonta después. Declarado ANTES de cualquier `return null` (reglas de hooks).

### 11.5 Optimistic UI con Rollback

**Patrón para contactos:**
1. Crear contacto temporal con `id: temp_${Date.now()}` + datos de `ContactoDisplay`
2. Agregar al store instantáneamente → toast "Contacto agregado"
3. Backend responde con `{ id: UUID_real }` → reemplaza temp id en store
4. Si falla → rollback (quita del store) + toast error

**Tipo ContactoDisplay:** Datos de display que el caller pasa al store para Optimistic UI:
```typescript
interface ContactoDisplay {
  nombre: string;
  apellidos: string;
  avatarUrl: string | null;
  negocioNombre?: string;
  negocioLogo?: string;
  sucursalNombre?: string;
}
```
Los 4 callers extraen estos datos del contexto actual (OtroParticipante, NegocioBusqueda, PersonaBusqueda).

**Patrón para mensajes:**
1. Burbuja aparece instantáneamente con datos locales
2. Backend confirma → sin acción visible
3. Si falla → rollback

**Bugs resueltos (comportamiento correcto actual):**
- Listener `chatya:mensaje-nuevo` ignora mensajes propios (`m.emisorId === miId`) para no duplicar con optimistic UI
- `conversacionActivaId` se limpia al cerrar/minimizar ChatYA (sin esto, el badge no incrementaba al recibir mensajes de la conversación "activa" cerrada)
- Al cambiar modo Personal↔Comercial: `useEffect` con `useRef` detecta cambio y limpia `conversacionActivaId`
- Conversación nueva: si `chatya:mensaje-nuevo` llega para una conversación que no existe en la lista, se obtiene del backend con `getConversacion()` y se agrega al inicio

### 11.6 Sistema de Z-Index

```
z-30  → Columnas laterales
z-40  → Header
z-50  → Modales estándar + ChatOverlay
z-60  → VisorImagenesChat (portal en document.body)
z-80  → Chat expandido
z-90  → Modales sobre chat (ModalReenviar)
```

Prop `zIndice` en Modal/ModalBottom/ModalAdaptativo (default `'z-50'`). `ModalReenviar` usa `zIndice="z-90"`.

### 11.7 Portales para Pickers y Modales

Cualquier popup que pueda cortarse por `overflow` usa `createPortal(…, document.body)` con posición calculada via `getBoundingClientRect()`. Aplica a:
- Pickers de emojis (quick y completo)
- VisorImagenesChat
- Modales que necesitan superar stacking contexts

**Animaciones de pickers (`emoji-picker-animaciones.css`):**

| Clase | Uso | Duración | Detalles |
|-------|-----|----------|----------|
| `emoji-popup-in` | Entrada quick picker + picker InputMensaje | 0.2s | `scale(0.2) → scale(1)` |
| `emoji-popup-in-suave` | Entrada picker completo burbuja (desktop) | 0.25s | `scale(0.5) → scale(1)`, más gradual |
| `emoji-popup-out` | Salida todos los pickers | 0.1s | `scale(1) → scale(0.15)`, rápido |
| `emoji-item-entrada` | Stagger individual emojis rápidos | 0.22s | Escalonado derecha→izquierda, delay `(length - i) * 35ms` |

**`transformOrigin` dinámico (picker completo burbuja desktop):** Ajusta origen según dirección y lado: abre abajo → `top left` / `top right`, abre arriba → `bottom left` / `bottom right`.

**Comportamiento de cierre:**

| Picker | Cierra con | Timeout animación |
|--------|-----------|-------------------|
| Quick picker (burbuja) | `onMouseLeave` (400ms), click fuera (`mousedown` listener), click en emoji | 100ms |
| Picker completo burbuja (desktop) | Click fuera (SelectorEmojis interno), Escape | 100ms |
| Picker InputMensaje (desktop) | Click fuera, Escape, Enter (enviar), click botón Smile. **NO cierra al seleccionar emoji** | 200ms |

### 11.8 Sistema de Capas Popstate para Back Button

El botón back nativo del celular debe cerrar overlays anidados en orden inverso sin cerrar ChatYA completo. Se centraliza TODO el manejo de `pushState`/`popstate` en **ChatOverlay** con 4 capas independientes:

```
Capa 1: Overlay (chatyaOverlay) — cierra ChatYA completo
Capa 2: Chat (chatya) — vuelve a lista de conversaciones
Capa 3: Visor (visorImagenes) — cierra visor de imágenes
Capa 4: Panel Info (panelInfo) — cierra panel de contacto
```

**Patrón por capa:**
```typescript
const layerHistoryRef = useRef(false);

useEffect(() => {
  if (!layerAbierto) {
    if (layerHistoryRef.current) {
      layerHistoryRef.current = false;
      history.back(); // Limpiar entrada fantasma
    }
    return;
  }
  if (!layerHistoryRef.current) {
    window.history.pushState({ layerFlag: true }, '');
    layerHistoryRef.current = true;
  }
  const handlePopState = () => {
    if (!layerHistoryRef.current) return;
    if (history.state?.layerFlag) return;
    layerHistoryRef.current = false;
    setLayerAbierto(false);
  };
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, [layerAbierto]);
```

**Regla clave:** Componentes hijos (VisorImagenesChat) **NUNCA** tocan `history` para las capas del chat (overlay/chat/panel/visor). Solo setean flags booleanas en el store (`visorAbierto`, `panelInfoAbierto`). ChatOverlay reacciona a esos flags y maneja las entradas de historial. **Excepción:** `PanelInfoContacto` gestiona `history.pushState` propio para la vista de perfil embebido (`_vistaPerfilChat`) y `ModalImagenes` para su visor (`_modalImagenes`), ya que son capas adicionales fuera del flujo principal del chat. Las whitelists de ChatOverlay reconocen estas keys (`_vistaPerfilChat`, `_modalBottom`, `_modalImagenes`, `_previewNegocio`) para no cerrar en cascada.

**Flujo back button:** `[..., chatyaOverlay, chatya, visorImagenes]` → back → pop visor → handler cierra visor → handler de chat ve `chatya` en state → return early.

**Flujo cerrar con X:** Componente hijo pone flag `false` → ChatOverlay detecta → `history.back()` limpia entrada fantasma → popstate resultante: otras capas detectan su flag en state → return early.

---

## 12. Archivos del Proyecto {#12-archivos}

### 12.1 Backend

| Archivo | Ubicación | Líneas aprox | Función |
|---------|-----------|-------------|---------|
| `chatya.types.ts` | `apps/api/src/types/` | — | Tipos: ModoChatYA, TipoMensaje, EstadoMensaje, ContextoTipo, inputs, responses |
| `chatya.service.ts` | `apps/api/src/services/` | — | 31 funciones + 5 helpers |
| `chatya.controller.ts` | `apps/api/src/controllers/` | — | 34 controllers + 3 helpers |
| `chatya.routes.ts` | `apps/api/src/routes/` | — | 34 endpoints registrados bajo `/api/chatya` |
| `chatya.cron.ts` | `apps/api/src/cron/` | — | Limpieza TTL 6 meses, diario 3 AM |
| `r2.service.ts` | `apps/api/src/services/` | — | Modificado: `generarPresignedUrl()` con param `tiposPermitidos` |
| `socket.ts` | `apps/api/src/` | — | Modificado: 11 eventos ChatYA + disconnect handler + `ultima_conexion` |
| `schema.ts` | `apps/api/src/db/` | — | Modificado: 6 tablas ChatYA + 2 columnas visibilidad + sucursalId contactos |
| `relations.ts` | `apps/api/src/db/` | — | Modificado: relaciones ChatYA con relationName para p1/p2 |
| `index.ts` (principal) | `apps/api/src/` | — | Modificado: ruta `/api/chatya` + `inicializarCronChatYA()` |

### 12.2 Frontend — Componentes ChatYA

| Archivo | Ubicación | Líneas aprox | Función |
|---------|-----------|-------------|---------|
| `ChatOverlay.tsx` | `components/layout/` | 711 | Componente principal. 3 estados, montaje persistente, layout fullscreen |
| `ListaConversaciones.tsx` | `components/chatya/` | 146 | Lista + buscador + tabs + 4 vistas con CSS hidden |
| `ConversacionItem.tsx` | `components/chatya/` | 148 | Avatar, preview con emojis Noto, hora, badges, pin, mute, borradores. Flechita menú contextual usa `<div role="button">` (no `<button>` dentro de `<button>`, causa error de hydration) |
| `VentanaChat.tsx` | `components/chatya/` | ~1,790 | Header + AreaMensajes (scroll nativo + IntersectionObserver) + todo el threading de props (incluye `avatarEmisor`, `inicialesEmisor` para AudioBurbuja) + visor archivos compartidos (estado local desacoplado de `visorAbierto`) + invalidación caché archivos al enviar/recibir contenido multimedia. `agruparPorFecha()` usa loop inverso sin `.reverse()`. Refs: `scrollRef`, `sentinelRef`, `cargandoAntiguosRef`, `prevScrollHeightRef`, `atBottomRef`, `prevMensajesCountRef` |
| `BurbujaMensaje.tsx` | `components/chatya/` | 1,450+ | Gradiente azul, palomitas, editado, solo-emoji, ImagenBurbuja, DocumentoBurbuja, AudioBurbuja (Howler.js Web Audio API, seek arrastrable, layout condicional esMio/!esMio, avatar↔velocidad dinámica 1×/1.5×/2×, fade-in 150ms anti-click, AudioContext pre-warm), UbicacionBurbuja (MapContainer sin controles + Google Maps + timestamp siempre `justify-end`), reacciones |
| `InputMensaje.tsx` | `components/chatya/` | 1,160+ | Input + enviar + emojis + barras respuesta/edición card flotante + imágenes múltiples + documentos + grabación audio (barra roja con waveform en vivo, timer, cancel/send) + menú clip via createPortal (Galería/Cámara/Documento/Ubicación) |
| `IndicadorEscribiendo.tsx` | `components/chatya/` | 20 | Animación 3 puntos |
| `SeparadorFecha.tsx` | `components/chatya/` | 47 | Banda azul semitransparente full-width con texto "Hoy"/"Ayer"/fecha completa |
| `BarraBusquedaChat.tsx` | `components/chatya/` | — | Búsqueda dentro de conversación con navegación |
| `MenuContextualChat.tsx` | `components/chatya/` | — | Menú ⋮ del header: 6 opciones (fijar/desfijar, silenciar/desilenciar, archivar/desarchivar, agregar/quitar contacto, bloquear, eliminar). Overlay invisible para cerrar |
| `MenuContextualMensaje.tsx` | `components/chatya/` | — | Menú contextual de mensaje (desktop: popup, móvil: header acciones) |
| `MenuContextualContacto.tsx` | `components/chatya/` | — | Menú contextual de contacto |
| `PanelInfoContacto.tsx` | `components/chatya/` | ~850 | Panel lateral 3 vistas dinámicas + preview archivos compartidos (grid 3×2 con LQIP) + caché conteo/imágenes en Maps de módulo + invalidación en tiempo real via `archivosKey`. Vista 2 (negocio): "Ver Perfil" monta `PaginaPerfilNegocio` directo (lazy loaded) en Bloque B con `BreakpointOverride forzarMobile` + CSS `.perfil-embebido`/`.perfil-contenedor`, panel se expande 320→500px PC / sub-vista fullscreen mobile. Manejo propio de `history.pushState` para botón atrás nativo. Acciones en footer `flex-row`. Verde `green-600` unificado. |
| `GaleriaArchivosCompartidos.tsx` | `components/chatya/` | ~400 | Galería fullscreen archivos compartidos: 3 tabs (Multimedia/Documentos/Enlaces), agrupado por mes, scroll infinito, caché a nivel de módulo, lectura síncrona al cambiar tab |
| `ModalReenviar.tsx` | `components/chatya/` | 438 | Modal selector destinatarios con selección múltiple (sin límite), búsqueda personas+negocios, GPS, deduplicación |
| `ModalUbicacionChat.tsx` | `components/chatya/` | ~180 | BottomSheet/Modal envío de ubicación. GPS automático, mapa Leaflet con pin arrastrable, reverse geocoding Nominatim, botón enviar circular inline |

**Detalle ModalReenviar:** `ModalAdaptativo` (bottom sheet móvil, centrado desktop) con `zIndice="z-90"`. Preview truncado 80 chars. Sin búsqueda: 15 conversaciones recientes (excluye Mis Notas). Con búsqueda (≥2 chars): filtro local + `Promise.all([buscarPersonas, buscarNegocios])`. Negocios muestran distancia GPS, categoría, calificación. Loading overlay durante envío.

**Store `reenviarMensaje`:** Llama API → obtiene `conversacionId` → fetch `getConversacion(convId)` para datos completos → nueva conversación se prepende, existente se mueve al tope. Degradación elegante: si fetch falla, el reenvío sigue exitoso.
| `SelectorEmojis.tsx` | `components/chatya/` | — | Picker completo reutilizable con emoji-picker-react |
| `EmojiNoto.tsx` | `components/chatya/` | — | Emoji individual como imagen CDN |
| `TextoConEmojis.tsx` | `components/chatya/` | — | Texto con emojis Noto inline |
| `VisorImagenesChat.tsx` | `components/chatya/` | — | Visor fullscreen galería con portal |
| `TexturaDoodle.tsx` | `components/chatya/` | — | Fondo decorativo con doodles del área de mensajes |
| `index.ts` | `components/chatya/` | 16 | Barrel export |

### 12.3 Frontend — Stores, Services, Hooks, Utils

| Archivo | Ubicación | Función |
|---------|-----------|---------|
| `useChatYAStore.ts` | `stores/` | Store completo (1,940 líneas) + caché + 11 listeners |
| `chatyaService.ts` | `services/` | 36 funciones HTTP (incluye archivos compartidos + audio) |
| `chatya.ts` | `types/` | 540+ líneas, 40 tipos alineados con backend (incluye ContenidoAudio, CategoriaArchivo, ArchivoCompartido, ConteoArchivosCompartidos) |
| `useImagenChat.ts` | `hooks/` | Hook imágenes: dimensiones, optimización, LQIP |
| `useDocumentoChat.ts` | `hooks/` | Hook documentos: validación MIME + tamaño |
| `useAudioChat.ts` | `hooks/` | Hook audio: MediaRecorder, AnalyserNode, waveform en vivo, auto-stop 5 min (448 líneas) |
| `emojiUtils.ts` | `components/chatya/` | Detección solo-emoji + cálculo tamaños |

### 12.4 Frontend — Archivos Globales Modificados

| Archivo | Cambio |
|---------|--------|
| `Navbar.tsx` | Badge ChatYA conectado a `useChatYAStore.totalNoLeidos` |
| `BottomNav.tsx` | Badge ChatYA conectado a `useChatYAStore.totalNoLeidos` |
| `MainLayout.tsx` | Importa `<ChatOverlay />` |
| `useAuthStore.ts` | `login()` y `hidratarAuth()` cargan `cargarNoLeidos()` de ChatYA |
| `socketService.ts` | `emitirEvento()` para escribiendo/dejar-escribir + timer inactividad 15min (ausente/conectado) con throttle 30s |
| `negociosService.ts` | `obtenerPerfilSucursal(sucursalId)` |
| `index.css` | `@keyframes typing` + CSS custom picker emojis estilo WhatsApp |
| `emoji-picker-animaciones.css` | `components/chatya/` — 4 keyframes reutilizables para animaciones de pickers (entrada, salida, stagger) + overrides para portales |
| `index.html` | Google Font Noto Color Emoji con preload + display=block |
| `Modal.tsx` | Prop `zIndice?: string` (default `'z-50'`) |
| `ModalBottom.tsx` | Prop `zIndice?: string`. Fondo `bg-slate-100` (no `bg-white` — evita exceso de brillo en mobile dark) |
| `ModalAdaptativo.tsx` | Prop `zIndice?: string`, pasa a hijos |

### 12.5 Paquetes npm

| Paquete | Uso |
|---------|-----|
| `emoji-picker-react` | Picker completo de emojis |
| `emoji-datasource-google@16.0.0` | Spritesheet (CDN usa v15) |
| `howler` + `@types/howler` | Reproducción de audio (Web Audio API con fallback HTML5). Fade-in/out nativo, seek preciso, rate control |

---

## 13. Progreso por Sprint {#13-sprints}

### Sprint 1: Base de Datos ✅ COMPLETADO (2 días)
- 6 tablas + columna `ultima_conexion` en pgAdmin
- Schema Drizzle con `AnyPgColumn` para auto-referencias
- Relaciones con `relationName` para p1/p2

### Sprint 2: Backend Core — Mensajería ✅ COMPLETADO (3 días)
- Types, Service (13 funciones), Controller (13), Routes (13 endpoints)
- Socket.io: 11 eventos con multi-dispositivo
- `socket.data.usuarioId` + `ultima_conexion` al disconnect
- Soporte empleados ScanYA (`empleado_id`)

### Sprint 3: Backend Complementario ✅ COMPLETADO (2 días)
- Contactos, bloqueo, reacciones, mensajes fijados
- Búsqueda full-text en español
- Badge total no leídos para Navbar
- Cron job limpieza TTL 6 meses

### Sprint 4: Frontend Core ✅ COMPLETADO (3 días)
- Store Zustand (1,940 líneas), Service API (615 líneas), Types (500 líneas)
- ChatOverlay v3.0 con 3 estados
- Lista de conversaciones + VentanaChat + burbujas + palomitas
- Enviar/recibir mensajes en tiempo real
- Scroll infinito, optimistic updates
- Responsive: móvil fullscreen, desktop split
- Modo dual personal/comercial
- Badges en Navbar y BottomNav

### Sprint 5: Frontend Complementario ✅ COMPLETADO (2-3 días)
- Buscador inteligente (local + API personas + negocios + GPS)
- Mis Notas (conversación consigo mismo)
- Menú contextual ⋮ con toggles optimistas
- Vista Archivados con badge
- Búsqueda dentro del chat con navegación
- Menú contextual de mensajes (desktop: popup, móvil: long press header)
- Responder, editar, eliminar, reaccionar, copiar, fijar mensajes
- Panel lateral PanelInfoContacto (3 vistas dinámicas)
- Reenviar mensaje con ModalReenviar
- Layout fullscreen integrado
- Navegación sin flash (useLocation)
- Sistema de emojis Google Noto completo
- Burbujas solo-emoji estilo WhatsApp
- Reacciones visibles con pills persistentes
- Sistema de contactos a nivel sucursal con optimistic UI
- Borradores persistentes por conversación
- Montaje persistente con CSS hidden
- Bug fixes: palomitas azules, mensajes reaparecen, sucursales mezcladas, conversación nueva

### Sprint 6: Multimedia ✅ COMPLETADO
- ✅ Imágenes: pipeline zero-flicker, LQIP, presigned URL, R2, múltiples (hasta 10)
- ✅ Drag & drop en toda VentanaChat + InputMensaje
- ✅ Documentos: 9 tipos MIME, 25MB, icono coloreado, descarga blob
- ✅ Visor galería fullscreen con portal y emoji picker
- ✅ Botón reenviar siempre visible en burbujas imagen/documento
- ✅ Scroll nativo con IntersectionObserver
- ✅ Caché de mensajes por conversación + pre-carga
- ✅ Montaje persistente de VentanaChat
- ✅ Optimización apertura de chats: `content-visibility: auto`, `LIMITE_INICIAL=30`, DOM recycling sin key, detección caché imágenes
- ✅ Back button nativo cierra visor/panel info sin cerrar ChatYA (sistema 4 capas popstate en ChatOverlay)
- ✅ Input reestructurado estilo WhatsApp: iconos dentro del pill, botón dinámico micrófono/enviar
- ✅ Quote de respuesta rediseñado estilo WhatsApp: thumbnail derecha a altura completa, borde izquierdo color
- ✅ Banner mensajes fijados con preview de imágenes
- ✅ Iconos tipo mensaje en lista de conversaciones (📷, 🎤, 📄)
- ✅ Archivos compartidos en PanelInfoContacto: preview grid 3×2, galería fullscreen 3 tabs (Multimedia/Documentos/Enlaces), agrupado por mes, scroll infinito, caché 3 niveles con invalidación en tiempo real, visor de imágenes desacoplado del historial de navegación
- ✅ Audio completo: grabación con waveform en vivo, presigned URL + upload R2, reproductor AudioBurbuja con Howler.js (Web Audio API, fade-in 150ms anti-artefacto, AudioContext pre-warm, seek arrastrable, avatar↔velocidad dinámica 1×/1.5×/2×, cleanup al cambiar chat)
- ✅ Eliminación de mensajes: preview de conversación se recalcula con último mensaje vivo (backend genera textoPreview por tipo, socket envía `nuevoPreview`, frontend refetch como fallback)
- ✅ Hold-to-record: fix deslizar para cancelar — `touchAction: 'none'` en botón mic evita que el browser intercepte el swipe como scroll. Dirección: deslizar hacia arriba (deltaY). Bug: browser enviaba `pointercancel` antes de que `cancelZonaRef` se actualizara, causando envío accidental del audio
- ✅ Enviar ubicación — `ModalUbicacionChat.tsx`: GPS automático + mapa Leaflet con pin arrastrable + reverse geocoding Nominatim. Botón clip convertido en menú (Galería / Cámara / Documento / Ubicación) via `createPortal`. `UbicacionBurbuja` en BurbujaMensaje: `MapContainer` sin controles (zoomControl/dragging/scroll/touch desactivados) + botón Google Maps

### Sprint 7: Pulido — EN PROGRESO
- ✅ Indicador "Escribiendo..." — `InputMensaje` emite `chatya:escribiendo` / `chatya:dejar-escribir` con `destinatarioId` + debounce 2s. Store soporta múltiples conversaciones simultáneas (`Record<string, EstadoEscribiendo>`). Visible en header de VentanaChat + preview en ConversacionItem (reemplaza último mensaje en azul). Componente `IndicadorEscribiendo.tsx` removido del área de mensajes
- ✅ Palomitas "Entregado" (2 grises) — Receptor emite `chatya:entregado` al recibir mensaje via Socket.io. Store actualiza estado `enviado` → `entregado`. BurbujaMensaje renderiza 3 estados: Check (enviado), CheckCheck gris (entregado), CheckCheck azul (leído). Palomitas unificadas a `w-4 h-4 scale-y-[1.1]` en burbujas y ConversacionItem
- ✅ Estados de usuario (conectado/ausente/desconectado/últ. vez) — Backend: `socket.ts` broadcast `'conectado'` al unirse, `'desconectado'` al disconnect con `ultimaConexion` en BD. Nuevo evento `chatya:consultar-estado` consulta rooms de Socket.io + BD para estado inicial. Frontend: `socketService.ts` timer inactividad 15 min con throttle 30s (mousemove/keydown/touchstart/scroll) emite `'ausente'`/`'conectado'`. Store: `estadosUsuarios` Record con estado + timestamp. VentanaChat + PanelInfoContacto muestran estado real con colores (green-600/amber-400/gray). Formato: "últ. vez hoy a la(s) 10:08 a.m.". En VentanaChat el texto "últ. vez..." se muestra con animación de scroll horizontal (componente `UltimaVezAnimada`): `useLayoutEffect` mide el ancho del prefijo en un span invisible, lo asigna como CSS custom property `--prefix-w`, y el keyframe hace `translateX(calc(-1 * var(--prefix-w)))` para revelar la hora. El ancho del contenedor es dinámico según el texto real.
- ✅ Sonido de notificación + vibración — `reproducirSonidoNotificacion()` en listener `chatya:mensaje-nuevo`. Suena cuando mensaje NO es propio + conversación NO activa (o pestaña no visible) + NO silenciada. HTMLAudioElement reutilizable, volumen 50%. 5 tonos disponibles (`tono_mensaje_1` a `tono_mensaje_5`). Preferencias en localStorage: `ay_tono_chat` (tono) + `ay_sonido_chat` (on/off). Vibración 300ms en móvil (`navigator.vibrate`)
- 🔲 Preview de enlaces (Open Graph)
- 🔲 Testing end-to-end

---

## 14. Pendientes y Deuda Técnica {#14-pendientes}

### 14.1 Funcionalidad pendiente

| Item | Sprint | Prioridad |
|------|--------|-----------|
| Preview enlaces (Open Graph) | 7 | Media |
| Testing end-to-end | 7 | Media |

### 14.2 Deuda técnica

| Item | Detalle |
|------|---------|
| Rate limiting 30 msg/min | Implementar con middleware o Redis |
| Validaciones Zod (`chatya.schema.ts`) | Validación inline en controller por ahora |
| Timer ausente (15 min) | ✅ Implementado en socketService.ts con throttle 30s |
| Limpieza R2 en hard delete | TODO en cron + eliminarConversacion |
| Tests Postman completos | — |
| Auditoría re-renders BurbujaMensaje | Memoización con React DevTools |
| Optimización selectores Zustand | Profiling pendiente |
| Migración paginación OFFSET → cursor | Para rendimiento en volúmenes grandes |
| Endpoint `alrededor/:mensajeId` | Para salto directo a mensaje en búsqueda |

---

## 15. Funcionalidades Excluidas {#15-excluidas}

| Feature | Razón |
|---------|-------|
| Videollamadas | Fuera de alcance. Requiere WebRTC |
| Llamadas de voz | Fuera de alcance |
| Chats grupales en ChatYA | Se implementan como componente independiente en Dinámicas/Rifas (tipo YouTube Live) |
| Stories/Estados tipo WhatsApp | No aplica al modelo de negocio |
| Mensajes temporales | Complejidad innecesaria |
| Cifrado extremo a extremo | Complejidad extrema, no necesario ahora |
| Stickers | Baja prioridad |
| Bio/info de usuario | No interesa |
| Mensajes fijados en panel lateral | Solo dentro del chat, no en el panel |
| Integración con campanita de notificaciones | Solo badge + sonido en logo ChatYA |

---

## 16. Lecciones Aprendidas {#16-lecciones}

### Rendimiento

1. **Scroll nativo + IntersectionObserver > librerías de virtualización** — Para 60-200 mensajes, el DOM los maneja sin problema. Sin bugs de posicionamiento, sin dependencias externas.
2. **Caché en memoria (`Record<string, Mensaje[]>`) > re-fetch** — Elimina latencia de red al cambiar entre chats ya visitados.
3. **Montaje persistente con CSS hidden > ternarios condicionales** — Desmontar componentes con estado complejo (scroll, refs, listeners) es costoso. `display: none` es casi gratis.
4. **Pre-carga fire-and-forget** — Cargar mensajes de las primeras 5 conversaciones en background prepara el caché sin bloquear UI.
5. **Compresión canvas en frontend > sharp en backend** — Evita tráfico pesado al servidor. Canvas comprime a WebP directamente en el navegador.
6. **Emojis Google Noto en móvil son lentos** — `emoji-picker-react` descarga imágenes del CDN conforme el usuario scrollea (virtualización). Solución: ocultar picker en móvil, usar nativo del teclado.
7. **Precarga de emojis no funciona** — `new Image().src` no resuelve la virtualización del picker. El cache HTTP del browser sí funciona después de la primera apertura.

### UI/UX

8. **LQIP > BlurHash para web** — Base64 estándar sin canvas decode. Técnica de Facebook (2015), recomendada por Mux sobre BlurHash.
9. **Dos `<img>` apilados con opacity > swap de src** — Cambiar `src` causa un frame vacío (flicker) en Firefox y Chrome. Opacity transition elimina el problema.
10. **Presigned URL = upload directo a R2** — Frontend sube sin pasar por Express. Reduce carga y latencia.
11. **Dimensiones ANTES de optimizar** — Aspect ratio correcto desde el primer frame.
12. **Drag & drop con contador `dragContadorRef`** — `dragEnter/dragLeave` disparan en cada hijo. Contador evita parpadeo del overlay.
13. **Descarga cross-origin: `fetch` + blob + `URL.createObjectURL`** — `<a download>` no funciona con URLs cross-origin (R2, Cloudinary).
14. **`vertical-align: -0.15em` centra emojis** — Posiciona relativo al baseline de la fuente, no de la línea.
15. **`truncate` + `flex` rompe con imágenes inline** — Quitar flex del párrafo, usar `inline align-[-3px]` para palomitas.

### React

16. **Todos los `useRef` ANTES de cualquier `return null`** — Reglas de hooks: "Rendered more hooks than during the previous render".
17. **Socket.io debe actualizar caché de conversaciones no activas** — Si no, al abrir esa conversación el mensaje no aparecería hasta el refresh.
18. **Preservar scroll con `scrollHeight` diff** — Guardar antes de insertar mensajes antiguos, calcular diferencia después.
19. **Portales obligatorios para popups dentro de scroll containers** — `createPortal(…, document.body)` con posición via `getBoundingClientRect()`.
20. **`createPortal` obligatorio para modales fullscreen dentro de stacking contexts** — z-index es relativo al stacking context del padre.
21. **`pushState`/`popstate` para botón back es peligroso con React** — Arrow functions inline cambian referencia y causan auto-cierre del useEffect.
22. **`stopPropagation` en thumbnails aísla swipe** — Sin esto, swipe horizontal del carousel propaga al handler de swipe de la imagen principal.
23. **`data-menu-trigger="true"` previene ciclo close→reopen** — Excluir del click outside listener evita que el menú se cierre y reabra al click en la misma flecha.
24. **Optimistic UI necesita datos de display del caller** — Backend solo retorna `{ id }`, el caller debe pasar datos visuales al store.

### Backend

25. **Backend auto-deriva `negocioId` desde `sucursalId`** — Evita que frontend necesite datos no disponibles.
26. **Contactos a nivel sucursal > a nivel negocio** — Negocios multi-sucursal requieren granularidad por sucursal.
27. **`listarMensajes()` puede poblar reacciones con query batch** — Una sola query trae todas las reacciones de la página.
28. **`editarMensaje()` debe poblar `respuestaA` antes de emitir Socket.io** — Si no, el store pierde la referencia del quote.
29. **`resolverContextoNombre()` como helper centralizado** — JOIN/lookup por tipo de contexto. Cero requests extra del frontend.
30. **Reacciones persisten como preview en conversación** — `toggleReaccion()` actualiza `ultimoMensajeTexto` con "Reaccionó con ❤️ a...", `ultimoMensajeEmisorId` con quien reaccionó, y `ultimoMensajeFecha` con timestamp actual. Sobrevive refresh.
31. **Validación condicional en presigned URL** — Param opcional `tiposPermitidos` reutiliza la misma función para imágenes y documentos.

### Almacenamiento

32. **Thumbnails con URL real > LQIP miniatura** — Las miniaturas base64 (16px) se ven borrosas en thumbnails de 64-80px. URL real da nitidez; el browser ya tiene la imagen en cache.
33. **Emisor dinámico por imagen en visor** — Header muestra quién envió esa imagen específica. Se pasan datos de ambos participantes.
34. **Botones del modal dentro de la imagen con `overflow-hidden`** — Posicionar dentro (`top-2.5 right-2.5`) con fondo `bg-black/50`.
35. **Limpieza de mensajes huérfanos inline** — Cuando ambos participantes tienen timestamp de visibilidad, se borran mensajes anteriores al más antiguo. Sin cron adicional.

### Rendimiento avanzado

36. **Eliminar `key` de contenedor recicla DOM** — React con `key={id}` destruye/recrea todos los nodos hijos al cambiar id. Sin key + reset manual con `prevConvIdRef` es ~2x más rápido para cambiar entre chats.
37. **`content-visibility: auto` es prácticamente gratis** — Browser skipea layout/paint de elementos fuera del viewport sin librerías ni código extra. Solo un CSS property.
38. **`LIMITE_INICIAL` controla costo de primer render** — Cargar 30 mensajes en vez de todos los cacheados reduce el trabajo inicial. IntersectionObserver carga más bajo demanda.
39. **Detectar caché HTTP con `img.complete`** — `new Image(); img.src = url; img.complete && img.naturalHeight > 0` detecta si el browser ya tiene la imagen. Evita blur/spinner innecesario.
40. **`startTransition` no funciona con Zustand** — `useSyncExternalStore` (que usa Zustand internamente) es incompatible con concurrent features de React 18. No se puede usar `startTransition` para diferir re-renders de stores.
41. **Caché a nivel de módulo (Map) > useRef para datos que sobreviven desmontaje** — `useRef` se pierde al desmontar el componente. Map a nivel de módulo persiste mientras la app esté abierta. Ideal para cachés de datos que no cambian frecuentemente (conteos, archivos compartidos, datos de negocio/cliente).
42. **useState con initializer function para lectura síncrona de caché** — `useState(() => cache.get(key))` lee del Map en el primer render, evita el ciclo `render vacío → useEffect → setState → re-render con datos` que causa flash de loading.
43. **Visor de archivos compartidos desacoplado del store de navegación** — Usar `setVisorAbierto(true/false)` del store dispara `popstate` en ChatOverlay y cierra el chat completo. Estado local `visorArchivos` con `useState` evita afectar el historial de navegación.

### Navegación móvil

44. **Centralizar `popstate` en un solo componente** — Múltiples componentes escuchando `popstate` causan conflictos de timing impredecibles. Un solo manager (ChatOverlay) con capas numeradas y refs booleanos es predecible y debuggable.
45. **Componentes hijos nunca tocan `history`** — Solo setean flags en el store. El manager central reacciona a los flags y gestiona `pushState`/`history.back()`. Elimina race conditions.

### Audio

46. **MediaRecorder requiere detección de formato** — No todos los navegadores soportan WebM/Opus. Probar `isTypeSupported()` en cascada (WebM → OGG → MP4 → MPEG) antes de iniciar grabación.
47. **AnalyserNode para waveform en vivo** — `getByteTimeDomainData()` cada 80ms captura amplitud real. `Math.abs(value - 128) / 128` normaliza a 0-1. Downsampling a 50 barras para almacenamiento ligero.
48. **`overflow-hidden` en barras + thumb fuera del overflow** — Las barras del waveform necesitan overflow-hidden para no desbordarse, pero el punto de seek (thumb) se corta si está dentro. Solución: div padre `relative`, barras en hijo con overflow-hidden, thumb como hermano posicionado absolute.
49. **`translate-y` > `margin-top` para alinear sin inflar layout** — `mt-3` agranda la burbuja porque afecta el flujo. `translate-y-1.5` mueve visualmente sin cambiar el box model.
50. **`fill="white"` en Lucide icons para íconos sólidos** — Por defecto Lucide renderiza stroke (contorno). `fill="white"` rellena el path completo para apariencia sólida.
51. **Howler.js Web Audio mode > html5 mode para presigned URLs** — `html5: true` usa HTMLAudioElement internamente (mismas limitaciones CORS). Sin esa flag, Howler descarga vía XHR (funciona con presigned URLs) y decodifica a AudioBuffer para seek instantáneo.
52. **AudioContext pre-warm elimina beep de inicialización** — `Howler.ctx.resume()` antes de crear Howl + reproducir en callback `onload` (no inline) previene artefacto audible al inicializar AudioContext por primera vez.
53. **Fade condicional solo cuando `volume() === 0`** — Fade 150ms en primer play y tras seek drag (volumen a 0 antes de play). Skip en pause/resume normal (volumen ya en 1). Elimina clicks/pops sin afectar experiencia normal.
54. **`eliminarMensaje` debe recalcular preview con textoPreview** — El contenido de audio/imagen/documento es JSON que excede `varchar(100)`. Al recalcular preview en backend, generar texto corto por tipo (`🎤 Audio`, `📷 Imagen`, etc.) igual que `enviarMensaje`.
51. **Layout condicional de AudioBurbuja según emisor** — esMio: `Avatar → Play → Waveform`. !esMio: `Play → Waveform → Avatar`. Piezas como variables JSX (`avatarEl`, `playBtnEl`, `waveformEl`) reordenadas en el return.
52. **`touchAction: 'none'` obligatorio para gestos personalizados en móvil** — Sin esta propiedad, el browser intercepta el swipe como scroll/pan y cancela el pointer enviando `pointercancel` antes de que el código detecte el desplazamiento. Aplicar solo al elemento que inicia el gesto (botón mic) y solo cuando el gesto es relevante (`esMobile && !puedeEnviar`). Requerido para cualquier swipe/drag personalizado sobre elementos interactivos.
55. **Menú contextual (clip/adjuntar) debe usar `createPortal`** — Un menú desplegable dentro del pill del input queda recortado por `overflow: hidden` del contenedor. Solución: igual que el emoji picker, calcular posición con `getBoundingClientRect()` al abrir, renderizar en `document.body` vía `createPortal` con `position: fixed`. Backdrop invisible en `z-[9990]` cierra al click fuera.
56. **`MapContainer` con todos los controles off para mapas de solo lectura** — En burbujas de ubicación (no interactivas) desactivar: `zoomControl={false}`, `dragging={false}`, `scrollWheelZoom={false}`, `doubleClickZoom={false}`, `touchZoom={false}`, `keyboard={false}`, `attributionControl={false}`. Evita que el usuario interactúe accidentalmente con el mapa dentro del chat y elimina la atribución OSM que ocupa espacio visual.
57. **Reverse geocoding con Nominatim (sin API key)** — `GET https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json&accept-language=es`. Parsear `address.road + address.house_number`, `address.suburb`, `address.city` en ese orden de prioridad. Llamar al soltar el pin (dragend), no durante el drag (evita flood de requests).

### Sprint 7: Pulido

58. **Socket.io `emitirEvento` necesita `destinatarioId`** — El backend hace `if (data.destinatarioId)` antes de reenviar. Si el frontend solo envía `{ conversacionId }`, el evento se ignora silenciosamente. Siempre incluir `destinatarioId` en eventos punto-a-punto.
59. **`escribiendo` como `Record<string, T>` > valor único** — Un solo `escribiendo: EstadoEscribiendo | null` se sobreescribe cuando múltiples personas escriben. Map por `conversacionId` permite que ConversacionItem muestre "Escribiendo..." en múltiples chats simultáneamente.
60. **`delete nuevo[key]` > destructuración con `_`** — `const { [key]: _, ...resto }` causa warning de ESLint "assigned but never used". `const nuevo = { ...prev }; delete nuevo[key]` logra lo mismo sin warnings.
61. **`chatya:consultar-estado` para estado inicial** — Sin esto, al abrir un chat el estado muestra "..." porque solo se actualiza por eventos en tiempo real. El nuevo evento consulta `io.sockets.adapter.rooms` para saber si el usuario tiene sockets activos, y `ultimaConexion` de la BD si está desconectado.
62. **Timer inactividad con throttle** — `resetearTimerAusente` se dispara en cada `mousemove`. Sin throttle (30s) genera miles de `clearTimeout`/`setTimeout` por minuto. El throttle reduce a ~2 llamadas/minuto sin perder precisión.
63. **`HTMLAudioElement` reutilizable para notificaciones** — Crear un `new Audio()` por cada mensaje es costoso. Un singleton con `.src` actualizado y `.play()` reutiliza el decodificador del browser.
64. **Sonido solo si NO activa + NO silenciada + NO propia** — Triple validación: `!esMensajePropio && !esActiva && !convSilenciada`. Buscar `silenciada` en ambas listas (`conversaciones` + `conversacionesArchivadas`).
65. **Leaflet z-index > z-50 para overlays sobre mapas** — `MapContainer` crea stacking contexts con z-index internos altos (~400). El ChevronDown del menú contextual necesita `z-[1000]` + `bg-black/40` para ser visible sobre el mapa. Mismo tratamiento para imágenes.
66. **Contraste en fondos grises claros (slate-50/100) — valores mínimos recomendados** — Cuando el fondo del panel es `bg-slate-50` o similar, los textos necesitan al menos `text-gray-500`, los íconos `text-gray-400`, y los fondos de íconos `bg-gray-200`. `text-gray-300` e `text-gray-400` desaparecen sobre slate. Ajustar solo clases `lg:` para no afectar mobile (que tiene fondo oscuro).
67. **CSS custom properties + `useLayoutEffect` para animaciones que dependen de dimensiones reales** — Para animar texto con ancho desconocido (como el prefijo de "últ. vez hoy a la(s)"), medir con `getBoundingClientRect()` en `useLayoutEffect`, asignar a `--variable-w` como CSS property, y referenciar en keyframe con `translateX(calc(-1 * var(--variable-w)))`. Sin `useLayoutEffect` la medición llega tarde y la animación arranca desde posición incorrecta. `requestAnimationFrame` garantiza un frame completo antes de iniciar.
68. **Iframes invisibles en mobile browsers son suspendidos** — Un iframe con `opacity-0` fuera del viewport se precarga en PC pero en mobile el browser lo suspende → 18s de carga vs instantáneo. **Solución implementada:** Reemplazar iframe por renderizado directo del componente (`PaginaPerfilNegocio`) con props (`sucursalIdOverride`, `modoPreviewOverride`). Para forzar vista mobile en panel estrecho: (1) `BreakpointOverride` context provider que override `useBreakpoint()` a `esMobile: true`, (2) CSS con `.perfil-embebido` que neutraliza clases `lg:`/`2xl:` de Tailwind, (3) `.perfil-contenedor` con `transform: translateZ(0)` que contiene modales `fixed` dentro del panel. Mismo patrón aplicado en `PanelPreviewNegocio` (Business Studio).
69. **`useMemo` antes de declaraciones que depende viola TS2448** — Si `useMemo` en línea 76 referencia una variable declarada en línea 123, TypeScript lanza "Block-scoped variable used before its declaration". Mover el `useMemo` después de la declaración de la variable que consume.

---

**Estado actual:** Sprints 1-6 COMPLETADOS. Sprint 7 EN PROGRESO (4/6 features completadas).  
**Backend:** 34 endpoints + 11 eventos Socket.io + 1 evento consulta estado + cron job activo.  
**Última actualización:** 06 Marzo 2026
