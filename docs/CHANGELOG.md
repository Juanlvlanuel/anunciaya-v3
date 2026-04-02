# 📜 AnunciaYA v3.0 - Changelog

Todas las novedades notables del proyecto están documentadas en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/),
y este proyecto adhiere a [Versionamiento Semántico](https://semver.org/lang/es/).

---

## [1 Abril 2026] - Sistema de Niveles Condicional + Auditoría Recompensas/Sellos + Notificaciones

### ✨ Agregado

**Notificaciones — Cambio de niveles**
- Notificación personal a todos los clientes con billetera cuando el negocio activa/desactiva niveles
- Tipo `sistema` con logo del negocio como actor (estilo "mensaje del negocio")
- Textos: "Sistema de niveles desactivado/activado" con explicación clara

**Notificaciones — Expansión inline**
- Click en notificaciones sin ruta de destino expande/colapsa el texto completo (toggle)
- Nuevo modo de renderizado "Personal con actor sin \n" (5 modos totales)

**ScanYA — Pantalla de éxito mejorada**
- Muestra progreso de tarjeta de sellos: "🎯 Corte de Pelo 4/5" o "🎉 ¡Tarjeta completada!"
- Puntos ahora se muestran correctamente (antes mostraba "+undefined")

**CardYA — Vouchers gratis**
- Modal confirmar canje muestra "¡Gratis!" en vez de "-1 punto" para tarjetas de sellos
- Vouchers con 0 puntos muestran "Gratis" en verde en cards, tabla y modales (CardYA + ScanYA)
- Mensaje de cancelar voucher contextual según si hubo puntos o no

**Deep link inteligente en notificaciones**
- "Recompensa desbloqueada" abre modal de detalle si no canjeada, o voucher pendiente si ya canjeada
- Navegación sin recarga cuando ya estás en la misma ruta (replace en vez de navigate)
- No cambia de tab si ya estás en el correcto

### 🐛 Corregido

**Bugs críticos del sistema de Recompensas/Sellos**
- `ResultadoOtorgarPuntos` tipo frontend desincronizado con backend (pantalla éxito mostraba "+undefined")
- Canje gratis restaba 1 punto en vez de 0 (constraint BD cambiado de `> 0` a `>= 0`)
- Revocar venta no quitaba sello de tarjeta (nueva columna `recompensa_sellos_id` en transacciones)
- Cancelar voucher de sellos no restauraba progreso (ahora restaura `desbloqueada=true`)
- Optimistic update no manejaba `puntosUsados=0` ni reset de tarjeta de sellos

**Atomicidad**
- `otorgarPuntos()` ahora envuelve todas las escrituras en `db.transaction()` (antes eran separadas)
- `verificarRecompensasDesbloqueadas()` marcada como deprecated (mecanismo dual eliminado)

**Tipos TypeScript**
- `tarjetaSellos` agregado al tipo de retorno de `otorgarPuntos` en API
- `cuponTipo`/`cuponValor` agregados a `TransaccionScanYA`
- `respuesta.data!.id` en `useOfertas.ts`

### 📝 Documentación
- `Notificaciones.md` — 5 modos de renderizado, expansión inline, catálogo niveles, patrón deep link con tabs
- `CardYA.md` — Sección N+1 reescrita con flujo completo actualizado (canje, cancelación, revocación, ciclos)
- `ScanYA.md` — Transacción atómica, tarjeta de sellos en venta, nivelesActivos condicional

### 🗄️ Migraciones de BD requeridas
```sql
-- Permitir vouchers gratis
ALTER TABLE vouchers_canje DROP CONSTRAINT vouchers_canje_puntos_check;
ALTER TABLE vouchers_canje ADD CONSTRAINT vouchers_canje_puntos_check CHECK (puntos_usados >= 0);

-- Vincular tarjeta de sellos a transacción (para revocación)
ALTER TABLE puntos_transacciones ADD COLUMN recompensa_sellos_id UUID NULL;
```

---

## [23 Marzo 2026] - Rediseño Mis Cupones/Guardados + ChatYA Cupones + Flujos Revocar/Reactivar

### ✨ Agregado

**ChatYA — Burbuja de cupón**
- Nuevo tipo de mensaje `cupon` en `chat_mensajes` (check constraint actualizado en BD)
- Burbuja especial: imagen + emoji 🎁 animado + "¡Felicidades!" + botón "Reclamar cupón" con efecto shine
- Preview en lista de chats: icono Ticket + 🎁 + título (en vez de JSON crudo)
- Envío automático al crear, reenviar y reactivar cupón
- Fix: emisor usa `usuario_id` del negocio (no `negocio_id`)

**Reactivación de cupones**
- Nuevo endpoint `POST /api/ofertas/:id/reactivar` — reactiva todos los usuarios revocados
- Reactiva oferta + envía notificación "¡Tu cupón fue reactivado!" + mensaje ChatYA
- Botón RefreshCw verde en tabla BS y en header del modal de edición
- Elimina notificaciones de revocación previas antes de reactivar

**Revocación masiva mejorada**
- Nuevo endpoint `POST /api/ofertas/:id/revocar-todos` — revoca todos los usuarios activos
- Limpieza cascada: elimina mensajes chat + notificaciones originales + conversaciones vacías
- Socket `chatya:cupon-eliminado` para eliminación de burbujas sin parpadeo

**Clientes asignados a cupón**
- Nuevo endpoint `GET /api/ofertas/:id/clientes-asignados`
- TabClientes en modo edición: lista readonly con avatar, fecha, badge estado
- Click en cliente abre ModalDetalleCliente

**ScanYA — Flujo completo de cupones**
- Cupones sin compra (monto $0): cliente → código → confirmar directo
- Validación de estado del cupón (usado/revocado/expirado)
- Marca oferta_usuarios.estado = 'usado' al confirmar
- Sección "Código de cupón" reubicada al #2 (después de cliente)
- Check constraint BD permite monto >= 0

**CarouselCupones en ColumnaIzquierda**
- Carousel automático (5s) de cupones activos con cronómetro animado (Timer + ring)
- Unificado con botón "Mis Cupones" (badge rojo circular con conteo)
- Se oculta en `/mis-cupones`

**Store useMisCuponesStore (Zustand)**
- Persistencia de datos entre navegaciones
- Pre-carga de imágenes (logos + imágenes de cupón)
- Listener socket `cupon:actualizado` para tiempo real

**Actualización en tiempo real (Socket.io)**
- Evento `chatya:cupon-eliminado` — elimina burbujas sin parpadeo
- Evento `chatya:recargar-conversaciones` — recarga chats + mensajes activos
- Evento `notificacion:recargar` — recarga panel de notificaciones
- Evento `cupon:actualizado` — refresca store de cupones
- Principio: sockets se emiten después de `await` en todas las operaciones de BD

**Mis Guardados — Rediseño visual**
- Header dark estilo CardYA con identidad rose
- Icono Bookmark → Heart
- Branding: "Mis **Guardados**" (blanco + rose-400)
- Subtítulo: "Tus favoritos en un solo lugar" + "COLECCIÓN PERSONAL"
- Header propio en móvil (MobileHeader oculto)
- KPIs desktop + tabs estilo CardYA + ordenamiento integrado en tabs
- Estados vacíos unificados a rose
- Tema ColumnaIzquierda dark con acentos rose

### 🔧 Modificado

**ModalDetalleCupon — Rediseño**
- Gradiente unificado slate (no varía por tipo)
- Toggle ver/ocultar contraseña
- Botón ChatYA con icono `/IconoRojoChatYA.webp` + tooltip PC
- Info como lista con divisores (Tag, Calendar, DollarSign, Gift)
- Badge "Activo": sólido verde + letra blanca
- "Código de descuento" → "Código de cupón"

**CardCupon — Rediseño**
- Logo negocio circular dentro de la imagen (overlay con sombra blanca)
- Móvil: logo arriba-izq, badge abajo-izq, metadata vertical
- Desktop: imagen h-32/h-40, línea gradiente emerald→negro h-1.5
- Solo botón "Ver cupón" abre modal (activos); card completa clickeable (no activos)
- Hover en botón: fondo oscurece + texto blanco

**PaginaMisCupones — Rediseño estilo CardYA**
- Header dark sticky con glow emerald, esquinas curvas `lg:rounded-b-3xl`
- Branding dual: "Mis **Cupones**" + "CUPONERA DIGITAL"
- Header propio en móvil (MobileHeader oculto)
- Deep link inteligente: cambia al tab correcto según estado del cupón

**ModalOferta — Edición de cupones**
- Toggle visibilidad oculto en edición
- Campos readonly cuando cupón inactivo (opacity-60, pointer-events-none)
- Tab Ajustes siempre readonly en edición (motivo + límite)
- Carga motivo desde clientes asignados
- Prop `onRecargar` para actualizar tabla después de reactivar/revocar

**Tabla Promociones BS — Toggle Ofertas/Cupones**
- Toggle en header (desktop: iconos, móvil: con texto) reemplaza dropdown visibilidad
- Columnas dinámicas: cupones oculta Vistas/Shares/Clicks
- Estados dinámicos por tipo (Activos/Revocados/Vencidos para cupones)
- Modal sin toggle: visibilidad pre-establecida desde la tabla
- Botones dinámicos: "Nueva Oferta" / "Nuevo Cupón"
- Imagen del modal más compacta (aspect-4/3 en desktop)
- Cupones: ocultar iconos Duplicar y Ocultar/Mostrar
- Orden acciones cupones: Revocar/Reactivar → Eliminar → Reenviar
- Mensaje al crear cupón: "Cupón enviado exitosamente"

**ScanYA**
- "Código de descuento" → "Código de cupón" (label + placeholder)

**Reenviar cupón**
- Ahora envía notificación + mensaje ChatYA (antes solo notificación)
- Código personal removido de notificación (dato sensible)
- Tipo corregido: `nueva_oferta` → `cupon_asignado`

**Eliminar oferta/cupón — Limpieza cascada**
- Elimina mensajes chat tipo `cupon` + notificaciones + conversaciones vacías
- Elimina imagen de R2 (si `esUrlR2`)
- Socket para actualización en tiempo real

**Limpieza imágenes huérfanas R2**
- ModalOferta + ModalArticulo: al cerrar sin guardar, elimina imagen subida de R2
- Al guardar: marca como no huérfana antes de cerrar

**ColumnaIzquierda**
- Nuevos temas: `cupones` (emerald) y `guardados` (rose), mismo fondo azul que CardYA
- CTA "Empezar ahora": gradiente azul del header
- "7 días": color azul fijo en todas las páginas
- Colores TabClientes: indigo → blue

**ChatYA**
- Fix: restaurar conversación eliminada actualiza `mensajes_visibles_desde` (no muestra mensajes viejos)
- Fix: `enviarCuponPorChatYA` usa `negocioUsuarioId` (no `negocioId`) como emisor

**Navegación**
- Flechas atrás en CardYA y Mis Cupones: `navigate(-1)` → `navigate('/inicio')`

**Base de datos**
- Tipo `cupon` agregado a `chat_msg_tipo_check` y `chat_conv_ultimo_mensaje_tipo_check`
- Aplicado en local (Docker) y producción (Supabase)

---

## [22 Marzo 2026] - Promociones (Ofertas + Cupones) + Mis Cupones + N+1 CardYA

### ✨ Agregado

**Promociones — Ofertas potenciadas con cupones privados**
- Toggle Oferta (📢) / Cupón (🎟️) en modal de crear promoción
- Cupones privados: código único por usuario (ANUN-XXXXXX), intransferible
- Selector de clientes con filtros por nivel (Bronce/Plata/Oro) y actividad (Activos/Inactivos)
- Modal refactorizado con 3 tabs: Detalles | Ajustes | Enviar a
- 2 dropdowns TC-4 para filtros de clientes
- Preview de notificación en vivo en tab Ajustes
- Botón "Enviar cupón" dinámico
- Reenviar cupón a clientes asignados
- Revocar cupón desde BS (desactiva oferta)
- Filtro visibilidad en PaginaOfertas: Todas / Ofertas / Cupones (solo desktop)

**Mis Cupones — Vista cliente**
- Página `/mis-cupones` con header dark emerald + 3 tabs (Activos/Usados/Historial)
- CardCupon: layout horizontal móvil + vertical desktop (patrón CardRecompensaCliente)
- ModalDetalleCupon: detalle completo + botón "Revelar código" (copiable)
- Deep link desde notificaciones
- Enlace en ColumnaIzquierda + MenuDrawer

**Recompensas N+1 en CardYA**
- Tipo de recompensa "Por compras frecuentes" (N compras → desbloqueo)
- Toggle "Requiere gastar puntos" (gratis al completar N)
- Verificación automática en ScanYA al registrar venta
- Tabla `recompensa_progreso` para tracking

**ScanYA — Migración cupones → ofertas**
- Validación migrada de tabla `cupones` → `oferta_usuarios.codigo_personal`
- Labels: "Cupón" → "Código de cupón"
- Endpoint: `/validar-cupon` → `/validar-codigo`
- Puntos se calculan sobre monto PAGADO (post-descuento)

**Notificaciones**
- Tipos: `cupon_asignado` (Ticket verde), `cupon_revocado` (Ticket rojo), `recompensa_desbloqueada`
- Deep link: `/mis-cupones?id={id}` desde panel de notificaciones

**UI / Renombrado**
- Menú BS: "Ofertas" → "Promociones"
- Subtítulo: "Ofertas y cupones"
- Iconos: Megaphone (oferta) / Ticket (cupón)
- Tabla header: "PROMOCIÓN"
- Conteo dinámico: "11 promociones" / "8 ofertas" / "3 cupones"

**Testing**
- 21 tests Zod ofertas (visibilidad, asignar, validar código)
- 14 tests Zod recompensas N+1
- 7 tests E2E Playwright (modal tabs, filtro visibilidad, Mis Cupones)
- Login E2E via JWT inyectado en localStorage

### 🗑️ Eliminado

**Limpieza total de Cupones (módulo separado)**
- 4 tablas BD eliminadas: `cupones`, `cupon_usos`, `cupon_usuarios`, `cupon_galeria`
- FKs migradas: `pedidos` y `puntos_transacciones` apuntan a `ofertas`/`oferta_usos`
- Placeholder `BSPaginaCupones` eliminado del router
- `PaginaMisCupones.tsx` placeholder eliminada
- "Cupones" removido del menú BS (sidebar + drawer)
- Botón "Mis Cupones" removido de ColumnaIzquierda y MenuDrawer
- Imports `cupones`/`cuponUsos` removidos de scanya.service.ts
- Tipos `nuevo_cupon` y referencia `cupon` legacy removidos de notificaciones

### 🔧 Modificado

**Base de datos (4 migraciones SQL)**
1. Tablas nuevas: `oferta_usos`, `oferta_usuarios`, `recompensa_progreso`
2. Columnas en `ofertas`: `visibilidad`, `limite_usos_por_usuario`
3. Columnas en `recompensas`: `tipo`, `numero_compras_requeridas`, `requiere_puntos`
4. Columnas en `oferta_usuarios`: `codigo_personal`, `estado`, `usado_at`, `revocado_at`, `revocado_por`, `motivo_revocacion`
5. DROP 4 tablas cupones + migrar FKs

**Tokens de diseño**
- Tabs: dark gradient activo (TC-4)
- Checkboxes/indicadores: indigo
- Chips filtro: `bg-indigo-100 border-indigo-300`
- Responsive 3 niveles en todos los componentes
- Inputs: sin focus ring, con boxShadow inset

---

## [20 Marzo 2026] - ChatYA 100% completado + Testing E2E

### ✨ Agregado

**Testing — Infraestructura completa**
- Vitest configurado en `apps/api/` — primer framework de testing del proyecto
- Playwright configurado en `apps/web/` — tests E2E con navegador real (Chromium)
- Helpers reutilizables: generación de tokens JWT, usuarios de prueba, HTTP requests
- `data-testid` agregados en componentes clave de ChatYA (ChatOverlay, ConversacionItem, InputMensaje, BurbujaMensaje, MenuContextualMensaje, BarraBusquedaChat, VentanaChat)

**ChatYA — 41 API Tests (Vitest)**
- Conversaciones: crear, retomar, listar, obtener, fijar/desfijar, archivar/desarchivar, silenciar, eliminar
- Mensajes: enviar texto, enviar con URL, listar, editar, edición no autorizada, marcar leídos, reenviar, eliminar
- Reacciones: agregar, obtener, quitar (toggle)
- Mensajes fijados: fijar, listar, desfijar
- Búsqueda: full-text en conversación, buscar personas
- Contactos: agregar, listar, eliminar
- Bloqueo: bloquear, listar, desbloquear, verificar post-desbloqueo
- Badge no leídos, Mis Notas
- OG Preview: URL válida, protocolo inválido, URL inválida, sin parámetro

**ChatYA — 10 E2E Tests (Playwright)**
- Abrir ChatYA y ver conversaciones
- Abrir conversación y ver mensajes
- Enviar mensaje de texto
- URL clicable en mensaje
- Editar mensaje propio
- Eliminar mensaje propio
- Buscar en conversación
- Reaccionar a un mensaje
- Fijar/desfijar conversación
- Silenciar/desilenciar conversación

### 📊 Métricas
- **ChatYA Sprint 7: 100% completado** — módulo cerrado
- 51 tests totales (41 API + 10 E2E), todos pasan
- Infraestructura de testing reutilizable para futuros módulos

---

## [20 Marzo 2026] - Rediseño PanelNotificaciones + Open Graph Previews ChatYA

### ✨ Agregado

**Panel de Notificaciones — Rediseño completo**
- Iconos Lucide con gradientes de color en lugar de emojis genéricos
- Estilo Facebook: avatar/iniciales del actor + mini badge de tipo superpuesto
- Campos `actor_imagen_url` y `actor_nombre` en tabla `notificaciones`
- Imagen contextual: foto de recompensa/oferta para notificaciones de items, logo del negocio para modo personal, avatar del cliente para modo comercial
- Paginación con botón "Cargar más" (15 por página)
- Eliminación individual de notificaciones (icono basura con hover)
- Formato de mensajes con salto de línea para separar nombre del negocio

**Notificaciones — Deep Links inteligentes**
- Click en notificación abre el modal/detalle específico del item referenciado
- Transacciones BS: `?transaccionId=UUID` abre modal de detalle
- Canjes BS: `?tab=canjes&canjeId=UUID` abre tab canjes + modal
- Recompensas BS: `?recompensaId=UUID` abre tab recompensas + modal de edición
- Opiniones BS: `?resenaId=UUID` abre modal de responder
- Ofertas/Reseñas públicas: `?ofertaId=UUID`, `?resenaId=UUID` con deep link
- Toast informativo cuando el item ya no existe ("Esta reseña ya no está disponible")
- Patrón robusto con state pendiente para funcionar estando ya en la página

**Notificaciones — Cleanup automático**
- Al eliminar oferta/recompensa: borrado automático de notificaciones asociadas
- Al revocar transacción: borrado automático de notificaciones
- Al cancelar voucher: borrado automático de notificaciones
- Prevención de duplicados: `notificarNegocioCompleto` y `notificarSucursal` excluyen al dueño

**ChatYA — Open Graph Previews (Sprint 7)**
- Endpoint `GET /api/chatya/og-preview?url=...` con fetch HTTP + parseo HTML (node-html-parser)
- Extracción de og:title, og:description, og:image con fallbacks (title tag, meta description, twitter:image)
- Cache Redis 24h para resultados exitosos, 1h para cache negativa
- Validación SSRF: bloqueo de IPs privadas en producción
- Rate limiting: 30 requests/minuto por usuario
- URLs clicables en mensajes (links azules) via `TextoConEnlaces.tsx`
- Preview card visual con imagen, título, descripción y dominio via `PreviewEnlace.tsx`
- Skeleton animado mientras carga
- Cache frontend en Map a nivel de módulo
- Ancho de burbuja limitado para mensajes con preview

### 🔧 Mejorado
- CardYA deep links: reemplazado `setTimeout(1500)` por patrón de state pendiente (más robusto)
- `GaleriaArchivosCompartidos`: regex de URLs extraída a `enlacesUtils.ts` compartido

### 📊 Métricas
- ChatYA: Sprint 7 → **98%** (falta: E2E testing)
- Backend: 2 archivos nuevos, ~15 archivos modificados
- Frontend: 4 archivos nuevos, ~12 archivos modificados

---

## [7 Marzo 2026] - Business Studio: Transacciones + Clientes + Opiniones ✅

### ✨ Agregado

**Módulo Transacciones BS**
- Historial completo de ventas con filtros por fecha, sucursal y nivel CardYA
- Exportar reportes CSV
- `PaginaTransacciones.tsx`, `ModalDetalleTransaccionBS.tsx`

**Módulo Clientes BS**
- Lista de clientes que han comprado con detalle: visitas, puntos acumulados, nivel CardYA
- Filtros por sucursal y nivel
- `PaginaClientes.tsx`, `ModalDetalleCliente.tsx`

**Módulo Opiniones BS**
- Ver reseñas con calificación ⭐ 1-5, filtros por rating y estado (Todas / Pendientes / Respondidas)
- Responder reseñas desde BS con edición posterior
- Métricas en header: promedio, total, pendientes de respuesta
- Badge "Pendientes" en tiempo real
- `PaginaOpiniones.tsx`, `PanelOpiniones.tsx`, `ModalResponder.tsx`
- Responder reseñas también disponible desde ScanYA (móvil) ✅

### 📊 Métricas
- Business Studio: 5/15 → **8/15 módulos completados**
- Frontend: ~6 archivos nuevos

---

## [7 Marzo 2026] - ChatYA UX + Integración ScanYA + Integración Perfil Negocio

### ✨ Agregado

**ChatYA — Integración con ScanYA (Fase 14 ScanYA)**
- Middleware `verificarTokenChatYA` en `auth.ts`: acepta token AnunciaYA (`ay_*`) y token ScanYA (`sy_*`). Mapea `negocioUsuarioId → usuarioId`, `modoActivo = 'comercial'`, `sucursalAsignada = sucursalId` del token ScanYA
- Campo `negocioUsuarioId` agregado al payload de los 3 tipos de login ScanYA (dueño, gerente, empleado) en `jwtScanYA.ts` y `scanya_service.ts`
- `chatya_routes.ts` usa `verificarTokenChatYA` en lugar de `verificarToken`
- `PaginaScanYA.tsx` monta `<ChatOverlay />` directamente (no usa MainLayout) con ref guard anti-StrictMode
- `PaginaScanYA.tsx` intercepta ruta `/scanya/chat` y abre ChatOverlay en lugar de navegar
- `inicializarScanYA()` en `useChatYAStore.ts`: inicialización ligera para ScanYA — solo carga badge de no leídos, sin duplicar carga de conversaciones
- Badge de mensajes no leídos en `IndicadoresRapidos` reactivo en tiempo real vía Socket.io
- `socketService.ts`: fallback `ay_usuario → sy_usuario` para obtener userId en contexto ScanYA
- `api.ts`: interceptor Axios agrega `?sucursalId=` automáticamente en llamadas a `/chatya` desde contexto ScanYA, garantizando filtrado correcto por sucursal

**ChatYA — Integración con Perfil de Negocio**
- Botón "💬 Enviar mensaje" en `PaginaPerfilNegocio.tsx` abre ChatOverlay con `contextoTipo = 'negocio'`
- `ModalAuthRequerido` si el usuario no está logueado
- Backend deduplica: si ya existe conversación con esa sucursal, la retoma

**ChatYA — Perfil de negocio embebido en PanelInfoContacto**
- `PaginaPerfilNegocio` acepta props opcionales `sucursalIdOverride` y `modoPreviewOverride` para funcionar sin router
- `BreakpointOverride forzarMobile` + CSS `.perfil-embebido` / `.perfil-contenedor` fuerzan vista mobile dentro del panel estrecho
- Desktop: panel se expande a 500px al abrir perfil. Mobile: sub-vista fullscreen con botón ← atrás
- `history.pushState` para que el botón atrás nativo cierre la vista perfil

### 🛠 Corregido

**Bug: Conversaciones duplicadas en ScanYA**
- Causa: interceptor Axios no enviaba `?sucursalId=` en rutas `/chatya` desde contexto ScanYA, devolviendo conversaciones de todas las sucursales del dueño
- Solución: `api.ts` detecta `esScanYA` + `config.url.includes('/chatya')` y agrega `sucursalId` del store ScanYA

**Bug: Carga duplicada de conversaciones al abrir ChatOverlay**
- Causa: `ListaConversaciones.tsx` disparaba `cargarConversaciones` al montar, duplicando la carga que ya hizo `ChatOverlay` vía `inicializar()`
- Solución: Guard `yaHayDatos` — si ya hay conversaciones cargadas, `ListaConversaciones` hace refresh silencioso en lugar de carga completa

**UX: Etiqueta "Desde:" aparecía para ambos participantes**
- Causa: Sin condición de receptor — todos veían el contexto de origen
- Solución: Solo se muestra cuando `conversacion.participante1Id !== miId` (solo el receptor). Caso `contextoTipo = 'negocio'` solo en modo comercial

**UX: Botón Bloquear oculto en modo comercial**
- Causa: Condición `!esModoComercial` en `PanelInfoContacto.tsx` — originalmente intencional pero innecesariamente restrictiva
- Solución: Botón visible en todos los modos. El bloqueo es solo de mensajería, no afecta la relación comercial

### 📊 Métricas del Sprint

**Duración:** 1 día (7 marzo)

**Archivos modificados:**
- Backend: `auth.ts`, `jwtScanYA.ts`, `scanya_service.ts`, `chatya_routes.ts` (4 archivos)
- Frontend: `api.ts`, `socketService.ts`, `useChatYAStore.ts`, `PaginaScanYA.tsx`, `PaginaPerfilNegocio.tsx`, `ListaConversaciones.tsx`, `VentanaChat.tsx`, `PanelInfoContacto.tsx` (8 archivos)

---


## [6 Mar 2026] - ChatYA Sprint 7: Pulido (EN PROGRESO)

### ✨ Agregado

**ChatYA Sprint 7 — Pulido y detalles UX**
- Indicador "Escribiendo..." — `InputMensaje` emite `chatya:escribiendo` / `chatya:dejar-escribir` con debounce 2s. Visible en header de VentanaChat y en preview de ConversacionItem (reemplaza el último mensaje en azul)
- Palomitas "Entregado" (2 palomitas grises) — receptor emite `chatya:entregado` al recibir mensaje vía Socket.io. 3 estados: ✓ enviado, ✓✓ gris entregado, ✓✓ azul leído. Unificadas a `w-4 h-4 scale-y-[1.1]` en burbujas y ConversacionItem
- Estados de usuario en tiempo real — conectado (green-600) / ausente 15 min (amber-400) / desconectado + "últ. vez hoy a la(s) 10:08 a.m." Componente `UltimaVezAnimada`: scroll horizontal con CSS `translateX` calculado via `useLayoutEffect`. Timer inactividad 15 min con throttle 30s (mousemove, keydown, touchstart, scroll) emite `ausente`/`conectado`. Visible en VentanaChat, PanelInfoContacto y lista archivos compartidos
- Sonido de notificación + vibración háptica — suena cuando el mensaje NO es propio + conversación NO activa (o pestaña no visible). 5 tonos disponibles (`ay_tono_chat`). Vibración 300ms en móvil (`navigator.vibrate`). Preferencias en localStorage `ay_tono_chat` + `ay_sonido_chat`

### 🔲 Pendiente Sprint 7
- Preview de enlaces (Open Graph)
- Testing end-to-end

---

## [26 Feb – 5 Mar 2026] - ChatYA Sprint 6: Multimedia ✅ COMPLETADO

### ✨ Agregado

**Imágenes**
- Pipeline zero-flicker: LQIP 16px blur(20px) → imagen real con opacity transition 150ms
- Presigned URL → upload paralelo a Cloudflare R2; múltiples imágenes a la vez (hasta 10, drag & drop)
- Drag & drop en toda el área de VentanaChat + InputMensaje
- Visor galería fullscreen con portal (`document.body`) y navegación entre imágenes

**Audio**
- Grabación inline con waveform en vivo (50 barras normalizadas 0-1)
- Hold-to-record: deslizar hacia arriba para cancelar (`touchAction: none` en botón mic)
- Presigned URL + upload a R2; reproductor AudioBurbuja con Howler.js (Web Audio API)
- Fade-in 150ms anti-artefacto, AudioContext pre-warm, seek arrastrable
- Avatar ↔ velocidad dinámica 1×/1.5×/2×; cleanup al cambiar chat
- Duración máx 5 min, 5 MB, detección formato MediaRecorder cross-browser

**Documentos**
- 9 tipos MIME (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV), máx 25 MB
- Ícono coloreado por tipo, descarga vía blob

**Archivos compartidos en PanelInfoContacto**
- Preview grid 3×2; galería fullscreen 3 tabs: Multimedia / Documentos / Enlaces
- Agrupado por mes con sticky headers; scroll infinito
- Caché 3 niveles (módulo) con invalidación en tiempo real al enviar/recibir multimedia

**Ubicación**
- `ModalUbicacionChat.tsx`: GPS automático + mapa Leaflet con pin arrastrable + reverse geocoding Nominatim
- `UbicacionBurbuja`: `MapContainer` sin controles + botón Google Maps
- Botón clip convertido en menú: Galería / Cámara / Documento / Ubicación (portal)

**Rendimiento y UX**
- Scroll nativo con IntersectionObserver — preservación de posición al cargar mensajes antiguos
- Caché de mensajes por conversación + pre-carga de las primeras 5 conversaciones
- Montaje persistente de VentanaChat (nunca se desmonta una vez abierta)
- `content-visibility: auto`, `LIMITE_INICIAL=30`, detección caché imágenes
- Back button nativo: sistema 4 capas popstate en ChatOverlay (cierra visor → panel info → minimiza → cierra)
- Input reestructurado estilo WhatsApp: iconos dentro del pill, botón dinámico micrófono/enviar
- Quote rediseñado: thumbnail a altura completa, borde izquierdo de color
- Banner mensajes fijados con preview de imágenes
- Íconos tipo mensaje en lista conversaciones (📷 🎤 📄)
- Eliminación de mensajes: preview recalcula último mensaje vivo (backend genera `textoPreview`, socket envía `nuevoPreview`)

### 📊 Métricas del Sprint
- **Duración:** ~8 días (26 Feb – 5 Mar)
- Backend: `r2_service.ts`, endpoints presigned URL, ubicación (4 archivos)
- Frontend: `useImagenChat.ts`, `useDocumentoChat.ts`, `VisorImagenesChat.tsx`, `AudioBurbuja`, `UbicacionBurbuja`, `ModalUbicacionChat.tsx`, actualizaciones en `BurbujaMensaje.tsx`, `VentanaChat.tsx`, `InputMensaje.tsx`, `PanelInfoContacto.tsx` (~12 archivos)

---

## [23–25 Feb 2026] - ChatYA Sprint 5: Frontend Complementario ✅ COMPLETADO

### ✨ Agregado
- Buscador inteligente: 3 secciones en un input (conversaciones locales + negocios API + personas API) con debounce 300ms y GPS integrado para distancia
- Mis Notas — conversación del usuario consigo mismo
- Vista Archivados con badge verde de no leídos
- Búsqueda full-text dentro del chat con navegación entre resultados
- Menú contextual mensajes: popup flotante desktop (click derecho) / long press en móvil (500ms + vibración) con acciones distribuidas en header
- Responder (quote/reply) con scroll al original y resaltado; ESC cancela
- Editar mensajes propios sin límite de tiempo — barra ámbar, ESC cancela
- Eliminar mensajes (soft delete, desaparecen del chat)
- Reenviar mensaje — `ModalReenviar.tsx` con `zIndice="z-90"`
- Fijar mensajes; copiar texto completo o selección parcial (`window.getSelection()`)
- Reacciones con emojis — pills persistentes visibles; preview en lista "Reaccionaste con ❤️ a..."
- Sistema de emojis Google Noto completo (`EmojiNoto`, `SelectorEmojis`)
- Burbujas solo-emoji estilo WhatsApp (font más grande)
- Hora inline estilo WhatsApp — hora + editado + palomitas como `<span inline-flex>` dentro del párrafo
- Panel lateral `PanelInfoContacto` con 3 vistas dinámicas
- Sistema de contactos a nivel sucursal con Optimistic UI (`ContactoDisplay`, `id: temp_${Date.now()}`)
- Borradores persistentes por conversación
- Montaje persistente con CSS hidden (4 componentes: ChatOverlay, VentanaChat, ListaConversaciones, PanelInfoContacto)
- Menú contextual ⋮ con toggles optimistas (fijar, archivar, silenciar, eliminar conversación, bloquear)

### 🛠 Corregido
- Palomitas azules sincronizadas multi-dispositivo
- Mensajes reaparecen tras edición
- Sucursales mezcladas en modo comercial
- Conversación nueva vía Socket.io: si no existe en lista → fetch + insert al inicio

### 📊 Métricas del Sprint
- **Duración:** 2-3 días
- Frontend: ~15 archivos nuevos/modificados

---

## [20–22 Feb 2026] - ChatYA Sprint 4: Frontend Core ✅ COMPLETADO

### ✨ Agregado
- Store Zustand `useChatYAStore.ts` (~1,940 líneas) con 43 acciones
- Service API `chatyaService.ts` (~615 líneas) + types `chatya.ts` (~500 líneas)
- `ChatOverlay.tsx` v3.0 — 3 estados: cerrado / minimizado / abierto; persiste entre navegación
- `ListaConversaciones.tsx` — tabs Todos/Personas/Negocios, ordenadas por reciente, fijadas arriba
- `VentanaChat.tsx` — scroll infinito, optimistic updates, palomitas ✓✓, separadores de fecha
- `BurbujaMensaje.tsx` — burbujas por tipo: texto, imagen placeholder, audio placeholder, documento
- Enviar/recibir mensajes en tiempo real vía Socket.io
- Responsive: móvil fullscreen, desktop split (lista 320px + chat expandible)
- Modo dual personal/comercial — listas completamente separadas, filtradas por sucursal
- Badges de no leídos en Navbar y BottomNav (total global)
- `ConversacionItem.tsx` — avatar, preview último mensaje, badge, hora relativa

### 📊 Métricas del Sprint
- **Duración:** 3 días
- Frontend: ~10 archivos nuevos

---

## [18–19 Feb 2026] - ChatYA Sprint 3: Backend Complementario ✅ COMPLETADO

### ✨ Agregado
- Contactos: CRUD completo a nivel sucursal; separados entre personal y comercial
- Bloqueo: bloquear/desbloquear usuarios y negocios SPAM; lista de bloqueados
- Reacciones: endpoint agregar/quitar reacción; actualiza preview conversación en tiempo real
- Mensajes fijados: fijar/desfijar dentro de conversación; endpoint listar fijados
- Búsqueda full-text en español — `to_tsvector('spanish', ...)` en PostgreSQL
- Badge total no leídos para Navbar — endpoint `GET /api/chatya/no-leidos/total`
- Cron job limpieza — elimina conversaciones inactivas > 6 meses (TTL configurable)
- Archivado/silenciado de conversaciones

### 📊 Métricas del Sprint
- **Duración:** 2 días
- Backend: ~6 archivos modificados

---

## [15–17 Feb 2026] - ChatYA Sprint 2: Backend Core ✅ COMPLETADO

### ✨ Agregado
- Types completos `chatya_types.ts`
- Service `chatya_service.ts` — 13 funciones: crear conversación (dedup automático), enviar mensaje, cargar mensajes paginados, marcar leídos, editar, eliminar (soft), fijar, listar conversaciones, archivar, silenciar, listar fijados, listar contactos, reaccionar
- Controller `chatya_controller.ts` — 13 handlers
- Routes `chatya_routes.ts` — 13 endpoints REST
- Socket.io — 11 eventos: `chatya:mensaje-nuevo`, `chatya:mensaje-editado`, `chatya:mensaje-eliminado`, `chatya:reaccion`, `chatya:escribiendo`, `chatya:dejar-escribir`, `chatya:leido`, `chatya:entregado`, `chatya:fijado`, `chatya:estado-usuario`, `chatya:consultar-estado`
- Multi-dispositivo: palomitas azules sincronizadas en todos los dispositivos del usuario
- `socket.data.usuarioId` + actualización `ultima_conexion` al disconnect
- Soporte empleados ScanYA (`empleado_id` en mensajes)
- Identidad por modo activo — en modo comercial, el emisor actúa como el negocio/sucursal

### 📊 Métricas del Sprint
- **Duración:** 3 días
- Backend: ~4 archivos nuevos (~800 líneas)

---

## [13–14 Feb 2026] - ChatYA Sprint 1: Base de Datos ✅ COMPLETADO

### ✨ Agregado
- 6 tablas PostgreSQL: `chatya_conversaciones`, `chatya_mensajes`, `chatya_participantes`, `chatya_contactos`, `chatya_bloqueados`, `chatya_reacciones`
- Columna `ultima_conexion` en tabla `usuarios`
- Schema Drizzle con `AnyPgColumn` para auto-referencias (tabla mensajes referencia a sí misma para `mensajeRespondidoId`)
- Relaciones Drizzle con `relationName` para diferenciar participante1 / participante2
- Índices para búsqueda full-text y ordenamiento por fecha
- ChatYA usa **PostgreSQL** (no MongoDB) — decisión arquitectónica confirmada

### 📊 Métricas del Sprint
- **Duración:** 2 días
- BD: 6 tablas nuevas, 1 columna modificada

---

## [6-12 Febrero 2026] - Sprint CardYA + Socket.io + Notificaciones + Reseñas

### ✨ Agregado

**CardYA - Sistema de Lealtad para Clientes (Fase 5.7)**
- 8 endpoints backend REST completos:
  - `GET /api/cardya/mis-puntos` - Billeteras del usuario
  - `GET /api/cardya/negocio/:id` - Detalle billetera por negocio
  - `GET /api/cardya/recompensas` - Recompensas disponibles
  - `POST /api/cardya/canjear` - Canjear recompensa → genera voucher
  - `GET /api/cardya/vouchers` - Vouchers del usuario
  - `DELETE /api/cardya/vouchers/:id` - Cancelar voucher (devuelve puntos)
  - `GET /api/cardya/historial/compras` - Historial de compras
  - `GET /api/cardya/historial/canjes` - Historial de canjes
- 10 componentes frontend React:
  - `PaginaCardYA.tsx` - Página principal con tabs (Billeteras/Recompensas/Vouchers/Historial)
  - `CardBilletera.tsx` - Card de billetera por negocio
  - `CardRecompensaCliente.tsx` - Card de recompensa canjeable con efecto glow
  - `DropdownNegocio.tsx` - Filtro por negocio
  - `TablaHistorialCompras.tsx` - Historial de compras responsive
  - `TablaHistorialVouchers.tsx` - Historial de vouchers
  - `ModalDetalleBilletera.tsx` - Detalle de billetera + nivel + progreso
  - `ModalDetalleTransaccion.tsx` - Detalle de una compra
  - `ModalConfirmarCanje.tsx` - Confirmación antes de canjear
  - `ModalVoucherGenerado.tsx` - Voucher recién canjeado con QR
- Store Zustand `useCardyaStore.ts` con optimistic updates
- Service API `cardyaService.ts` con tipos TypeScript
- Widget `WidgetCardYA.tsx` en columna izquierda con datos reales
- Sistema de niveles Bronce/Plata/Oro por negocio (no global)

**Socket.io - Infraestructura Tiempo Real**
- Backend `socket.ts` con funciones: `inicializarSocket`, `emitirEvento`, `emitirAUsuario`
- Rooms personales por usuario (`usuario:{id}`)
- Frontend `socketService.ts` con reconexión automática y re-registro de listeners
- Integración con `useAuthStore` (conectar al login, desconectar al logout)

**Sistema de Notificaciones Tiempo Real**
- Tabla `notificaciones` en PostgreSQL con campo `sucursal_id`
- Types: 14 tipos de notificación, 9 tipos de referencia
- Service `notificaciones.service.ts` con CRUD completo
- Controller y routes REST (`/api/notificaciones`)
- 7 tipos de notificación activos:
  - `puntos_ganados` - Cliente recibe puntos por compra
  - `voucher_generado` - Cliente canjea recompensa
  - `voucher_cobrado` - Cliente usa voucher en tienda
  - `voucher_pendiente` - Dueño recibe voucher para entregar
  - `nueva_oferta` - Clientes con billetera reciben ofertas
  - `nueva_recompensa` - Clientes con billetera reciben recompensas
  - `stock_bajo` - Dueño alertado cuando recompensa tiene <5 stock
- Store `useNotificacionesStore.ts` con filtrado por modo (personal/comercial)
- Service `notificacionesService.ts` frontend
- Componente `PanelNotificaciones.tsx` con badge "9+" y deep linking
- Integración en `MobileHeader.tsx` y `Navbar.tsx`

**Navegación desde Notificaciones (Deep Linking)**
- `PanelNotificaciones.tsx` → función `obtenerRutaDestino()` según `referenciaTipo`
- `PaginaCardYA.tsx` → `useSearchParams` para abrir tabs y modales específicos
- `PaginaPerfilNegocio.tsx` → `?ofertaId=xxx` abre modal oferta
- Efecto glow en recompensas destacadas (CSS keyframes)

**Sistema de Reseñas Verificadas**
- Schema Zod `resenas.schema.ts` (sucursalId, rating 1-5, texto max 500)
- Service `resenas.service.ts` con verificación compra últimos 90 días
- Controller y routes REST (`/api/resenas`)
- Endpoints:
  - `GET /api/resenas/sucursal/:sucursalId` - Reseñas públicas
  - `GET /api/resenas/sucursal/:sucursalId/promedio` - Promedio
  - `GET /api/resenas/puede-resenar/:sucursalId` - Verificar permiso
  - `POST /api/resenas` - Crear reseña
- Métricas UPSERT en `metricas_entidad` (conteo real, no incrementos)
- Notificación al dueño cuando recibe reseña
- `ModalEscribirResena.tsx` con estrellas interactivas
- Integración en `PaginaPerfilNegocio.tsx` con datos reales

**Contadores en ScanYA**
- Badge vouchers pendientes en botón "Vouchers"
- Polling cada 30 segundos (empleados no reciben Socket.io)
- Endpoint `obtenerContadores()` incluye `vouchersPendientes`

### 🛠 Corregido

**Bug Crítico #1: cardya_controller.ts obtenerUsuarioId()**
- Síntoma: Todos los endpoints de CardYA retornaban arrays vacíos
- Causa: `req.usuarioId` no existe, el middleware pone datos en `req.usuario`
- Solución: Cambiar a `(req as RequestConAuth).usuario?.id`

**Bug #2: Notificaciones duplicadas por Socket.io**
- Causa: `escucharEvento()` se llamaba múltiples veces acumulando listeners
- Solución: Flag `listenerRegistrado` + `socket.off()` antes de `socket.on()`

**Bug #3: Reseñas generaban 2 notificaciones al dueño**
- Causa: `crearNotificacion()` + `notificarSucursal()` encontraba al mismo usuario
- Solución: Eliminar llamada a `notificarSucursal()` de `crearResena()`

**Bug #4: Parpadeo Modal Vouchers en ScanYA**
- Causa 1: `yaCargo` nunca se reseteaba al reabrir
- Causa 2: `setCargando(true)` vaciaba lista visualmente
- Solución: Recargar siempre + loading condicional si no hay datos previos

### 📊 Métricas del Sprint

**Duración:** 7 días (6-12 febrero)

**Código:**
- Backend: ~2,500 líneas (16 archivos nuevos/modificados)
- Frontend: ~3,000 líneas (14 archivos nuevos/modificados)
- Total: **~5,500 líneas**

**Archivos creados/modificados:**
- Backend: 16 archivos (socket.ts, notificaciones.*, resenas.*, cardya.*, etc.)
- Frontend: 14 archivos (stores, services, componentes CardYA, etc.)

### 📝 Documentación

- `SESION_CardYA_Integracion_Frontend_Backend.md` - 18 archivos documentados
- `Socket_io_Sistema_Notificaciones_Completo.md` - Arquitectura completa

---

## [29 Enero - 5 Febrero 2026] - Sprint Config Puntos + Expiración

### ✨ Agregado

**Business Studio - Configuración de Puntos (Fase 15 ScanYA)**
- Página `PaginaPuntos.tsx` en Business Studio con layout de 3 secciones
- Métricas en header: Clientes, Otorgados, Canjeados, Disponibles
- **Configuración Base:**
  - Acumulación de puntos: "Por cada $X MXN gana Y pts"
  - Expiración de puntos: X días (con checkbox "No expiran")
  - Expiración de vouchers: X días
  - Textos aclaratorios sobre comportamiento de expiración
- **Sistema de Niveles:**
  - Toggle activo/inactivo
  - 3 niveles: Bronce (cafe), Plata (plata), Oro (amarillo)
  - Cada nivel con: Mínimo, Máximo, Multiplicador
  - Máximo de Oro = ∞ (infinito, fijo)
  - Validaciones: rangos ascendentes, multiplicadores ascendentes, sin decimales
  - Recálculo automático de niveles de todos los clientes al cambiar rangos
  - Beneficios explicados: Mayor retención, Multiplicadores de puntos, Compromiso emocional
- **Recompensas (CRUD):**
  - Crear/editar recompensa con: imagen, nombre, descripción, puntos requeridos
  - Stock disponible con checkbox "Ilimitado" (valor -1)
  - Toggle "Requiere aprobación" (canje necesita confirmación manual)
  - Toggle activo/inactivo por recompensa
  - Eliminar recompensa
  - Cards visuales con iconos de editar/eliminar

**Sistema de Expiración en Tiempo Real**
- Validación reactiva (sin cron jobs ni servicios externos)
- Expiración de puntos por inactividad al final del día local del negocio (23:59:59)
- Expiración de vouchers vencidos con auto-reembolso de puntos a billetera
- Función `expirarVouchersVencidos(negocioId)` masiva, reutilizable desde cualquier endpoint
- Función `expirarPuntosPorInactividad(usuarioId, negocioId)` individual por cliente
- Función `verificarExpiraciones()` combinada para endpoints de cliente específico
- Manejo correcto de zona horaria del negocio (`negocio_sucursales.zona_horaria`)

### 🐛 Corregido

**Bug: Paso 0 en obtenerVouchers no devolvía puntos**
- `obtenerVouchers` (ScanYA) marcaba vouchers como expirados pero NO devolvía puntos
- Reemplazado SQL inline por `expirarVouchersVencidos()` que incluye auto-reembolso
- Aplicado también en `obtenerVouchersPendientes`

**Bug: Desfase de zona horaria en expiración de puntos**
- Servidor en UTC causaba que puntos expiraran horas antes de lo esperado
- Implementada función `calcularFinDiaExpiracion()` que convierte a hora local del negocio
- Puntos ahora expiran al final del día local (23:59:59 zona horaria del negocio)

### 📝 Documentación
- Nueva sección #12 "Sistema de Expiración" en `ARQUITECTURA ScanYA.md`
- Fase 15 actualizada a completada en progreso del proyecto
- CHANGELOG y ROADMAP actualizados

---

## [17-29 Enero 2026] - Sprint ScanYA + Migración Cloud

### ✨ Agregado

**Arquitectura ScanYA - Diseño Previo (19 Enero 2026)**
- Día completo de diseño arquitectónico antes de implementar código (4 horas)
- Decisiones de roles: Dueño/Gerente/Empleado con permisos diferenciados
- Sistema de autenticación dual: Email+Password (dueños/gerentes) vs Nick+PIN (empleados)
- Arquitectura de tokens separados: `ay_*` (AnunciaYA) vs `sy_*` (ScanYA)
- Sesiones 100% independientes entre plataformas
- Separación de configuraciones: `puntos_configuracion` vs `scanya_configuracion`
- Documento generado: `PROMPT_SCANYA_COMPLETO.md` (50 páginas)

**16 Fases Internas de ScanYA:**

| Fase | Descripción | Estado | Fecha |
|------|-------------|--------|-------|
| 1-7 | Backend completo (23 endpoints) | ✅ 100% | 20-21 Ene |
| 8 | Login frontend | ✅ 100% | 20 Ene |
| 9 | Cloudflare R2 fotos tickets | ✅ 100% | 20 Ene |
| 10 | Dashboard + Sistema turnos | ✅ 100% | 21 Ene |
| 11 | Modal Registrar Venta (acordeón) | ✅ 100% | 21-22 Ene |
| 12 | Historial + Validar vouchers | ✅ 100% | 22 Ene |
| 13 | Recordatorios offline | ✅ 100% | 22-24 Ene |
| 14 | Chat + Reseñas | ⏸️ Pausada | Requiere ChatYA |
| 15 | BS > Puntos Config + Expiración | ✅ 100% | 29 Ene - 5 Feb |
| 16 | PWA Testing e instalación | ✅ 100% | 27-29 Ene |

**Estado final:** 15/16 fases = 93.75% completado

**Sistema ScanYA PWA (87.5% completado)**
- Autenticación dual: Email+Password (dueños/gerentes) / Nick+PIN (empleados)
- Sistema de turnos: Apertura/cierre con estadísticas (ventas, horas, puntos otorgados)
- Registrar ventas: Identificar cliente, validar cupones, otorgar puntos
- Sistema de puntos CardYA con niveles (Bronce/Plata/Oro)
- Multiplicadores de puntos: 1.0x / 1.2x / 1.5x según nivel
- Validación de cupones: Descuento % y $ aplicados automáticamente
- Vouchers: Listar pendientes entrega y validar canje
- Recordatorios offline: Guardar ventas sin conexión con auto-sincronización
- Sistema completo de permisos por rol (dueño/gerente/empleado)
- PWA instalable: iOS, Android y Desktop con Service Worker
- Sesiones independientes: Tokens `sy_*` separados de `ay_*`
- Upload directo a Cloudflare R2 para fotos de tickets
- Historial de transacciones filtrado por rol y periodo
- Dashboard con indicadores rápidos y resumen de turno
- 23 endpoints API REST backend
- 18 componentes React frontend
- 3 hooks personalizados (useOnlineStatus, useOfflineSync, useRedirectScanYAPWA)

**Sistema de Guardados (Favoritos) - Fase 5.3.3**
- Tabla separada `guardados` independiente de `votos`
- **Decisión arquitectónica:** Separación SRP (Single Responsibility Principle)
  - `votos` = calificaciones públicas (afectan métricas del negocio)
  - `guardados` = colección privada (solo para el usuario)
- Hook `useGuardados` con actualizaciones optimistas
- Tabs separados: Ofertas guardadas / Negocios guardados
- Endpoint `/api/guardados` con filtros por tipo
- Paginación infinita (20 items por carga)
- Eliminación optimista con reversión automática si falla

**Migración Infraestructura Cloud**
- Backend: Railway ($5/mes) → Render Free Tier ($0/mes)
- Base de datos: Railway PostgreSQL ($7/mes) → Supabase Free ($0/mes)
- Emails: Zoho ($3/mes) → AWS SES Sandbox ($0/mes)
- Fotos tickets: Cloudinary → Cloudflare R2 ($0/mes, 10GB gratis)
- Total stack: 9 servicios operando en free tier

### 🔄 Cambiado

- Base de datos: 42 tablas → **65 tablas** (+23 tablas nuevas para ScanYA)
- Agregados 17 campos a tablas existentes
- Creados 8 índices nuevos para optimización
- Service Worker: Estrategia cache-first para offline
- Sistema de roles: Ahora soporta Dueño/Gerente/Empleado
- Middleware de autenticación: 4 niveles de permisos implementados

### 🐛 Corregido

**Bug Crítico #1: Token Hydration Logout Fantasma**
- Síntoma: Logout automático al cargar la app en App.tsx
- Causa: `useEffect` con dependencia vacía ejecutaba logout antes de hidratación
- Solución: Mover `checkAuthStatus()` a Router raíz después de hidratación
- Líneas modificadas: 12 líneas en App.tsx

**Bug Crítico #2: Sync localStorage entre Pestañas**
- Síntoma: Logout en ScanYA cerraba sesión en AnunciaYA principal
- Causa: Event `storage` disparaba en TODAS las pestañas sin discriminar contexto
- Solución: Ignorar eventos `storage` si pathname empieza con `/scanya`
- Líneas modificadas: 4 líneas críticas en useAuthStore.ts

**Bug Crítico #3: Service Worker Redirección Innecesaria**
- Síntoma: PWA abría en `/` en lugar de `/scanya/login`
- Causa: SW interceptaba navegación y redirigía erróneamente
- Solución: Remover lógica redirección, solo cachear recursos
- Líneas modificadas: Completa reescritura sw-scanya.js

**Bug Crítico #4: Instalación PWA desde Ruta Incorrecta**
- Síntoma: Chrome ignoraba `start_url` del manifest si se instalaba desde `/inicio`
- Causa: Navegador toma URL actual como start_url si no es controlable
- Solución: Hook `useRedirectScanYAPWA` con 4 métodos de detección PWA
- Archivos creados: useRedirectScanYAPWA.ts (85 líneas)

**Bug Crítico #5: beforeinstallprompt No Disparaba**
- Síntoma: Banner instalación PWA no aparecía
- Causa: Manifest dinámico via JavaScript no funciona en Chrome
- Solución: Manifest estático permanente en `<head>` del index.html

**Bug #6: Sesiones NO Independientes**
- Síntoma: Tokens AnunciaYA y ScanYA compartidos causaban conflictos
- Solución: Arquitectura completa separación (prefijos `ay_*` vs `sy_*`)

### 📚 Documentación Técnica Generada

Durante este sprint se generaron **8 documentos técnicos** con ~27,420 líneas totales:

| Documento | Líneas | Propósito |
|-----------|--------|-----------|
| Fase 13 Recordatorios Offline | 1,772 | Sistema offline completo con Service Worker |
| Sistema PWA ScanYA | 2,019 | Roadmap PWA + instalación multiplataforma |
| Migración PostgreSQL → Supabase | 1,054 | Proceso completo de migración cloud |
| Inventario Credenciales | 2,905 | 9 servicios cloud configurados ($0/mes) |
| Modal Registrar Venta | 850 | Acordeón otorgar puntos con UX optimizada |
| Historial Transacciones | 720 | Historial completo + validación vouchers |
| Checklist ScanYA (13/16 fases) | 2,100 | Validación exhaustiva pre-producción |
| Bitácora Desarrollo Completa | ~15,000 | Log detallado 17-29 enero |
| **TOTAL** | **~27,420** | **8 documentos técnicos** |

**Nota:** Esta documentación se encuentra en la carpeta del proyecto para referencia técnica detallada.

### 📊 Métricas del Sprint

**Progreso:**
- Progreso global: 60% → 81% (+21 puntos porcentuales)
- Fases completadas: Fase 5.5 ScanYA (87.5%)

**Desarrollo:**
- Duración: 12 días calendario (17-29 enero)
- Horas activas: ~74 horas
- Promedio diario: ~6 horas/día

**Código:**
- Backend: ~4,850 líneas (8 archivos nuevos)
- Frontend: ~4,500 líneas (18 componentes + 3 hooks)
- Types/Utils: ~1,300 líneas (tipos + service)
- Total nuevo código: **~10,650 líneas**

**Testing:**
- Tests ejecutados: 99
- Tests pasados: 99 (100%)
- Endpoints testeados: 23/23 (100%)
- Bugs encontrados: 14
- Bugs resueltos: 14 (100%)
- Bugs críticos: 5 (todos resueltos)

**Infraestructura:**
- Costo mensual anterior: $15-20/mes
- Costo mensual nuevo: $0/mes
- Ahorro anual proyectado: **$180-240/año**

**PWA Testing:**
- Plataformas testeadas: 3 (Chrome Desktop, Safari iOS, Chrome Android)
- Tests de instalación: 13/13 pasados (100%)
- Service Worker: Operativo en todas las plataformas
- Detección PWA con 4 métodos de fallback
- Manifest estático permanente en `<head>`
- Estrategia cache-first para funcionamiento offline

---

## [07-16 Enero 2026] - Sprint Business Studio

### ✨ Agregado

**Dashboard (Fase 5.4)**
- KPIs principales y secundarios
- Gráfica de ventas
- Actividad reciente
- 7 endpoints backend

**CRUD Catálogo (Fase 5.4.1)**
- Lista de productos/servicios del negocio
- Modal crear/editar artículo (6 campos + imágenes)
- Upload múltiple de imágenes a Cloudinary
- Filtros: por tipo (producto/servicio) y categoría
- Toggle activo/inactivo con actualización optimista
- Vista previa pública `/p/articulo/:id`
- Selector de sucursales (asignación N:N)

**CRUD Ofertas (Fase 5.4.2)**
- Dashboard con 5 contadores de estado
- Lista de ofertas con filtros avanzados
- Modal crear/editar oferta con 6 tipos:
  - 2x1, 3x2, Descuento %, Descuento $, Envío gratis, Otro
- Configuración días y horarios de vigencia
- Función duplicar oferta existente
- Sistema de activación/desactivación optimista
- Vista previa pública `/p/oferta/:id`
- Métricas por oferta (vistas, compartidos)

**Mi Perfil - Business Studio (Fase 5.4)**
- Tab "Datos del Negocio" con panel CardYA integrado
- Tab "Contacto" (teléfono, WhatsApp, Facebook, Instagram)
- Tab "Ubicación" con mapa Leaflet interactivo
- Tab "Horarios" con soporte 24/7, cerrado y break/comida
- Tab "Imágenes" (logo, portada, galería hasta 10 fotos)
- Tab "Operación" (métodos pago, envío domicilio, servicio domicilio)

### 🔄 Cambiado

- Servicio `negocioManagement.service.ts`: Agregadas 15 funciones CRUD reutilizables
- Interceptor Axios: Ahora inyecta `sucursalId` automáticamente en modo comercial
- Tabla `articulos`: Agregado campo `subcategoria_id`
- Sistema de imágenes: Ahora soporta múltiples fotos por artículo

### 🐛 Corregido

- Toggle activo/inactivo ahora muestra estado correcto inmediatamente
- Upload de imágenes no duplica archivos en Cloudinary
- Filtros de catálogo preservan estado al cambiar de tab
- Validación horarios: No permite crear horarios superpuestos

### 📊 Métricas del Sprint

**Desarrollo:**
- Duración: 9 días (7-16 enero)
- Módulos BS completados: 4/15 (27%)
  - Dashboard ✅
  - Mi Perfil ✅
  - Catálogo ✅
  - Ofertas ✅

**Código:**
- Componentes nuevos: 12
- Endpoints API: 8
- Total líneas: ~3,500

**Funcionalidad:**
- Dashboard: 100% operativo
- Catálogo: 100% operativo
- Ofertas: 100% operativo
- Mi Perfil: 100% operativo

---

## [06 Enero 2026] - Decisiones Arquitectónicas

### 🔄 Cambiado

**Decisión Arquitectónica - Negocios Solo Físicos**
- Eliminado tipo de negocio "Online" del sistema
- Todos los negocios requieren ubicación física obligatoria
- Agregados campos `tiene_servicio_domicilio` y `tiene_envio_domicilio` en `negocio_sucursales`
- Eliminada columna `requiere_direccion` (redundante)
- Justificación: Usuarios sin local físico pueden usar Empleos/MarketPlace (gratis)
- CardYA requiere escaneo presencial en punto de venta físico
- Documentación generada: `Eliminación_de_Negocios_Online.md`

**Optimización de Imágenes Client-Side**
- Compresión automática antes de subir a Cloudinary
- Logo: 500px max, quality 0.85, formato WebP
- Portada: 1600px max, quality 0.85, formato WebP
- Galería: 1200px max, quality 0.85, formato WebP
- Productos: 800px max, quality 0.85, formato WebP
- Beneficios:
  - Reduce costos de almacenamiento Cloudinary
  - Acelera tiempo de carga en frontend
  - Mejora experiencia en conexiones lentas

**Upload Diferido (Optimista)**
- Preview instantáneo con `URL.createObjectURL()` sin esperar upload
- Upload a Cloudinary solo al confirmar paso/formulario
- Evita imágenes huérfanas en servidor
- UX optimista: interfaz "snappy" sin esperas

**Validación Flexible de Productos**
- Guardar borrador: Mínimo 1 producto
- Publicar negocio: Mínimo 3 productos completos
- Permite trabajo incremental sin forzar completitud prematura

### 📊 Métricas

**Decisiones implementadas:** 4  
**Archivos de documentación generados:** 1  
**Impacto:** Simplificación del sistema y mejora de UX

---

## [02-06 Enero 2026] - Sprint Negocios Directorio + Sistema Compartir

### ✨ Agregado

**Negocios Directorio (Fase 5.3)**
- Lista de negocios con geolocalización PostGIS
- Ordenamiento por distancia (cercanos primero)
- Filtros por categoría y subcategoría dinámica
- Búsqueda por nombre de negocio
- Vista mapa con marcadores Leaflet
- Perfil completo del negocio:
  - Galería de imágenes
  - Horarios de atención
  - Métodos de pago
  - Catálogo de productos/servicios
  - Información de contacto
- Sistema de "Seguir" (campanita) - Items seguidos se guardan en "Mis Guardados"
- Métricas de interacción (likes, visitas, rating)

**Sistema Compartir Base (Fase 5.3.1)**
- Componente `DropdownCompartir.tsx` reutilizable
- Banner registro para usuarios no logueados
- Layout público sin navbar principal
- Hook `useOpenGraph` para metadatos dinámicos
- Rutas públicas implementadas:
  - `/p/negocio/:id` - Perfil negocio
  - `/p/articulo/:id` - Detalle artículo
  - `/p/oferta/:id` - Detalle oferta

**Auth Opcional + ModalAuthRequerido (Fase 5.3.2)**
- Modal "Inicia sesión para continuar" con beneficios claros
- Sistema de redirección post-login a ruta original
- Contenido público visible sin login
- CTAs estratégicos para registro/descarga app

### 🔄 Cambiado

- Backend ahora calcula distancia en kilómetros (PostGIS)
- Filtros de negocios ahora son dinámicos (subcategorías por categoría)

### 🐛 Corregido

- PostGIS retornaba coordenadas en formato WKB binario → Usar `ST_X()/ST_Y()`
- Mapa Leaflet no centraba en ubicación correcta del negocio
- Botón "Seguir" permitía duplicados al hacer click rápido

### 📊 Métricas del Sprint

**Duración:** 5 días (2-6 enero)

**Código:**
- Componentes nuevos: 8
- Endpoints API: 5
- Total líneas: ~2,800

---

## [26 Diciembre 2024] - Fase 5.2 Toggle UI + Protección Rutas

### ✨ Agregado

**Sistema de Modos (Frontend)**
- Componente `ToggleModoUsuario.tsx` reutilizable (cambio directo sin modal)
- Modal `ModalCambiarModo.tsx` (solo cuando usuario accede a /business/* por URL directa estando en modo Personal)
- Guard `ModoGuard.tsx` para protección de rutas

**Componentes Dinámicos por Modo:**
- Navbar: Toggle + items dinámicos + avatar dinámico (personal/negocio)
- MenuDrawer: Toggle + secciones por modo
- ColumnaIzquierda: Contenido adaptado al modo activo
- BottomNav: Market ↔ Business según modo

**Backend:**
- Migración: Campo `foto_perfil` en `negocio_sucursales`
- Función `obtenerDatosNegocio()` en negocios service
- Datos del negocio incluidos en respuestas JWT
- Nuevo token generado al cambiar modo

### 🔄 Cambiado

- Store `useAuthStore`: Agregada función `cambiarModo()` + campos negocio
- Router: Guards aplicados en rutas `/business/*` y `/inicio/*`
- Login: Ahora respeta último modo usado por usuario

### 📊 Métricas

**Decisiones Arquitectónicas:**
- Multi-dispositivo: Sesiones independientes
- Notificaciones: Solo modo activo recibe
- Token JWT: Se renueva al cambiar modo

---

## [20-26 Diciembre 2024] - Fase 5.1 Onboarding Completo

### ✨ Agregado

**Frontend Onboarding (Fase 5.1.1)**
- Layout base con 8 pasos numerados
- Paso 1: Categorías (selección múltiple)
- Paso 2: Ubicación (mapa Leaflet + GPS)
- Paso 3: Contacto (lada editable internacional)
- Paso 4: Horarios (24/7, cerrado, break/comida)
- Paso 5: Imágenes (logo, portada, galería - Cloudinary)
- Paso 6: Métodos de Pago (efectivo, tarjeta, transferencia)
- Paso 7: Puntos CardYA (toggle activación)
- Paso 8: Productos/Servicios (CRUD completo)
- Sistema de finalización funcional
- Botón "Anterior" ahora guarda cambios

**Backend Onboarding (Fase 5.0 + 5.1)**
- 15 endpoints REST para onboarding
- Sistema de sucursales implementado
- Migración BD: Tablas reestructuradas para multi-sucursal
- Middleware `verificarNegocio` y `validarAccesoSucursal`

### 🐛 Corregido

**Bug #1:** PostGIS retornaba WKB binario → Usar `ST_X()/ST_Y()`  
**Bug #2:** Lada mostraba 3 dígitos → Función específica por país  
**Bug #3:** Imágenes huérfanas en Cloudinary → Upload diferido  
**Bug #4:** Error 400 snake_case → Usar camelCase en requests  
**Bug #5:** Duplicación productos → DELETE + INSERT en vez de UPDATE  
**Bug #6:** Finalizar no funcionaba → Lógica completa implementada  
**Bug #7:** `/auth/yo` devolvía false → Consultar tabla negocios  
**Bug #8:** Loop infinito redirección → Flag sessionStorage

### 📊 Métricas

**Duración:** 7 días (20-26 diciembre)

**Código:**
- Frontend: ~4,000 líneas
- Backend: ~1,000 líneas
- Total: **~5,000 líneas**

**Endpoints creados:** 8 nuevos

**Bugs resueltos:** 8 (todos críticos para onboarding)

---

## [21 Diciembre 2024] - Fase 5.1.0 Estandarización Nomenclatura

### 🔄 Cambiado

**Parte 1: Drizzle Snake Case**
- Configurado Drizzle con `casing: 'snake_case'`
- Conversión automática camelCase ↔ snake_case
- Base de datos permanece en snake_case
- TypeScript permanece en camelCase

**Parte 2: API Responses en Inglés**
- 439 cambios de español a inglés
- Estructura estandarizada: `{ success, data, message }`
- Mensajes de error en español (user-facing)
- Nombres de campos en inglés (machine-readable)

### 🐛 Corregido

- Rate Limiter ajustado: 1000 dev, 100 prod
- Redirección según `onboardingCompletado` corregida
- JWT ahora incluye `onboardingCompletado`

---

## [18-19 Diciembre 2024] - Cloudinary + GPS + BD

### ✨ Agregado

**Cloudinary Upload/Delete Optimista**
- Upload directo desde frontend
- Actualización optimista UI
- Reversión automática si falla
- Preset configurado: `anunciaya_uploads`

**GPS con Fallback**
- Prioridad 1: GPS nativo (alta precisión)
- Prioridad 2: WiFi triangulación
- Prioridad 3: IP geolocation
- Timeout 10 segundos

**Actualización Base de Datos**
- 42 tablas en 9 esquemas
- PostGIS para geolocalización
- Índices optimizados para búsquedas

---

## [Diciembre 2024] - Fase 4 Frontend Base + Auth

### ✅ Completado

**Infraestructura Frontend:**
- React 18 + Vite + TypeScript
- Tailwind CSS v4
- Zustand para state management
- React Router v7
- Axios con interceptores

**Sistema de Autenticación:**
- Login/Registro con validación
- JWT con refresh tokens
- Protección de rutas
- Persistencia de sesión
- Multi-dispositivo

**Componentes Base:**
- Navbar responsive
- Sidebar/Drawer navegación
- BottomNav móvil
- Layout principal
- Sistema de notificaciones personalizado

---

## [Noviembre-Diciembre 2024] - Fases 1-3 Fundamentos

### ✅ Completado

**Fase 1: Monorepo**
- Estructura pnpm workspace
- Configuración TypeScript
- ESLint + Prettier
- Scripts de desarrollo

**Fase 2: Base de Datos**
- PostgreSQL con Drizzle ORM
- PostGIS para geolocalización
- MongoDB para ChatYA (preparado)
- Redis para caché/sesiones (preparado)
- 42 tablas iniciales diseñadas

**Fase 3: Backend Core + Auth**
- Express + TypeScript
- Sistema JWT completo
- Middleware de autenticación
- Rate limiting
- CORS configurado
- Endpoints auth base:
  - POST `/api/auth/register`
  - POST `/api/auth/login`
  - POST `/api/auth/refresh`
  - POST `/api/auth/logout`
  - GET `/api/auth/yo`
  - POST `/api/auth/recuperar-password`
  - POST `/api/auth/restablecer-password`
- Google OAuth implementado

---

## 📝 Notas de Versionamiento

### Formato de Fechas
- Se usa formato `[DD-DD Mes YYYY]` para sprints multi-día
- Se usa formato `[DD Mes YYYY]` para cambios de un solo día

### Secciones Utilizadas
- **✨ Agregado** - Para funcionalidades nuevas
- **🔄 Cambiado** - Para cambios en funcionalidad existente
- **🐛 Corregido** - Para corrección de bugs
- **📊 Métricas** - Para datos cuantitativos del sprint
- **📚 Documentación** - Para documentación técnica generada
- **🗑️ Eliminado** - Para features removidas (no usado aún)
- **⚠️ Deprecated** - Para features que se eliminarán (no usado aún)

### Principios de Documentación
- Orden cronológico inverso (más reciente primero)
- Lenguaje claro y ejecutivo
- Sin código técnico en changelog
- Métricas cuantificables cuando sea posible
- Bugs críticos documentados con solución
- Referencias a documentación técnica detallada en carpeta ARQUITECTURA

---

**Última actualización:** 7 Marzo 2026