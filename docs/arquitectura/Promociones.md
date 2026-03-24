# 🏷️ Promociones — Ofertas y Cupones

**Última actualización:** 23 Marzo 2026
**Versión:** 2.0
**Estado:** ✅ Operacional (Ofertas públicas + Cupones privados + ChatYA + Tiempo real)

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe la **arquitectura del módulo de Promociones**:
- ✅ Ofertas públicas (informativas, visibles para todos)
- ✅ Cupones privados (código único por usuario, validación ScanYA)
- ✅ CRUD desde Business Studio
- ✅ Selector de clientes con filtros (nivel, actividad)
- ✅ Validación en ScanYA con código personal
- ✅ Vista cliente "Mis Cupones" con revelación de código
- ✅ Revocación masiva de cupones desde BS
- ✅ Reactivación de cupones revocados
- ✅ Reenvío de cupones (notificación + ChatYA)
- ✅ Notificaciones (panel + deep link + tiempo real via Socket.io)
- ✅ Burbuja especial de cupón en ChatYA
- ✅ Carousel de cupones activos en ColumnaIzquierda
- ✅ Actualización en tiempo real (Socket.io)
- ✅ Limpieza cascada al revocar/eliminar (chat + notificaciones + R2)
- ✅ Recompensas N+1 (compras frecuentes) en CardYA

**NO incluye:**
- ❌ Barra progreso N+1 en CardYA usuario (pendiente)

**Para implementación exacta:**
- Backend: `apps/api/src/services/ofertas.service.ts`
- Backend: `apps/api/src/controllers/ofertas.controller.ts`
- Backend: `apps/api/src/routes/ofertas.routes.ts`
- Backend: `apps/api/src/validations/ofertas.schema.ts`
- Backend: `apps/api/src/types/ofertas.types.ts`
- Frontend BS: `apps/web/src/pages/private/business-studio/ofertas/`
- Frontend Cliente: `apps/web/src/pages/private/cupones/`
- Frontend Service: `apps/web/src/services/ofertasService.ts`
- Frontend Service: `apps/web/src/services/misCuponesService.ts`
- Frontend Store: `apps/web/src/stores/useMisCuponesStore.ts`
- Frontend Carousel: `apps/web/src/components/layout/CarouselCupones.tsx`

---

## 📋 Índice

1. [Concepto](#concepto)
2. [Ofertas vs Cupones](#ofertas-vs-cupones)
3. [Base de Datos](#base-de-datos)
4. [API Endpoints](#api-endpoints)
5. [Business Studio — Crear Promoción](#business-studio--crear-promoción)
6. [Business Studio — Editar Cupón](#business-studio--editar-cupón)
7. [Cupones — Flujo Completo](#cupones--flujo-completo)
8. [Revocación y Reactivación](#revocación-y-reactivación)
9. [Mis Cupones — Vista Cliente](#mis-cupones--vista-cliente)
10. [ScanYA — Validación de Código](#scanya--validación-de-código)
11. [ChatYA — Burbuja de Cupón](#chatya--burbuja-de-cupón)
12. [Notificaciones](#notificaciones)
13. [Actualización en Tiempo Real](#actualización-en-tiempo-real)
14. [Limpieza Cascada](#limpieza-cascada)
15. [Recompensas N+1](#recompensas-n1)
16. [Frontend — Componentes](#frontend--componentes)
17. [Decisiones de Diseño](#decisiones-de-diseño)

---

## 1. Concepto

**Promociones** es un módulo unificado que maneja dos tipos de promociones:

| Tipo | UI | Comportamiento |
|------|-----|---------------|
| **Oferta** | Toggle 📢 Megaphone | Pública, informativa, visible en feed, sin tracking |
| **Cupón** | Toggle 🎟️ Ticket | Privada, código único por usuario, validación en ScanYA |

Un solo módulo, un solo CRUD, una sola tabla (`ofertas`). La diferencia es el campo `visibilidad`:
- `publico` → oferta
- `privado` → cupón

**Decisión clave:** No se creó un módulo separado de "Cupones" porque generaba redundancia con Ofertas. Ambos comparten: tipos de descuento, fechas, imagen, descripción. La única diferencia es la visibilidad y el código.

---

## 2. Ofertas vs Cupones

| Propiedad | Oferta (pública) | Cupón (privado) |
|-----------|------------------|-----------------|
| Visible en feed | ✅ Sí | ❌ No |
| Código único | ❌ No | ✅ Sí (por usuario) |
| Tracking de uso | ❌ No | ✅ Sí (`oferta_usos`) |
| Asignación a clientes | ❌ No | ✅ Sí (`oferta_usuarios`) |
| Límite por persona | ❌ No | ✅ Opcional |
| Validación ScanYA | ❌ No | ✅ Sí (código personal) |
| Notificación al cliente | ❌ No | ✅ Automática |
| Mensaje ChatYA | ❌ No | ✅ Burbuja especial |
| Revocable | ❌ No | ✅ Sí (masivo desde BS) |
| Reactivable | ❌ No | ✅ Sí (después de revocar) |
| Duplicable | ✅ Solo dueños | ❌ No |
| Ocultable | ✅ Eye/EyeOff | ❌ No (se revoca en su lugar) |
| 6 tipos descuento | ✅ Sí | ✅ Sí |
| Fechas vigencia | ✅ Sí | ✅ Sí |
| Imagen | ✅ Opcional | ✅ Opcional |

**6 tipos de descuento** (iguales para ambos):
- `porcentaje` — X% de descuento
- `monto_fijo` — $X de descuento
- `2x1` — Compra 2, paga 1
- `3x2` — Compra 3, paga 2
- `envio_gratis` — Envío sin costo
- `otro` — Personalizado (texto libre)

---

## 3. Base de Datos

### Tabla: `ofertas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | Identificador |
| negocio_id | UUID FK | Negocio dueño |
| sucursal_id | UUID FK nullable | Sucursal específica (null = todas) |
| titulo | VARCHAR(150) | Título de la promoción |
| descripcion | TEXT nullable | Detalles |
| imagen | VARCHAR(500) nullable | URL imagen (R2/Cloudinary) |
| tipo | VARCHAR(20) | porcentaje, monto_fijo, 2x1, 3x2, envio_gratis, otro |
| valor | VARCHAR(100) nullable | Valor del descuento |
| compra_minima | NUMERIC(10,2) | Monto mínimo (default 0) |
| fecha_inicio | TIMESTAMPTZ | Inicio vigencia |
| fecha_fin | TIMESTAMPTZ | Fin vigencia |
| limite_usos | INTEGER nullable | Límite total (null = ilimitado) |
| limite_usos_por_usuario | INTEGER nullable | Límite por persona |
| usos_actuales | INTEGER | Contador |
| activo | BOOLEAN | Flag activo/inactivo |
| visibilidad | VARCHAR(15) | `publico` o `privado` |
| created_at, updated_at | TIMESTAMPTZ | Timestamps |

### Tabla: `oferta_usuarios` (cupones asignados)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGSERIAL PK | Identificador |
| oferta_id | UUID FK CASCADE | Oferta/cupón |
| usuario_id | UUID FK CASCADE | Cliente asignado |
| motivo | VARCHAR(200) | Motivo de asignación (VIP, cumpleaños, etc.) |
| asignado_at | TIMESTAMPTZ | Fecha de asignación |
| vista | BOOLEAN | Si el cliente ya lo vio |
| codigo_personal | VARCHAR(50) UNIQUE | Código único (auto-generado: ANUN-XXXXXX) |
| estado | VARCHAR(20) | activo, usado, expirado, revocado |
| usado_at | TIMESTAMPTZ nullable | Fecha de uso |
| revocado_at | TIMESTAMPTZ nullable | Fecha de revocación |
| revocado_por | UUID FK nullable | Quién revocó |
| motivo_revocacion | VARCHAR(200) nullable | Motivo de revocación |

### Tabla: `oferta_usos` (tracking de uso)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGSERIAL PK | Identificador |
| oferta_id | UUID FK CASCADE | Oferta usada |
| usuario_id | UUID FK CASCADE | Cliente que usó |
| metodo_canje | VARCHAR(20) | qr_presencial, codigo_online |
| monto_compra | NUMERIC(10,2) | Monto de la compra |
| descuento_aplicado | NUMERIC(10,2) | Descuento aplicado |
| empleado_id | UUID FK SET NULL | Empleado que validó |
| sucursal_id | UUID FK SET NULL | Sucursal donde se usó |
| created_at | TIMESTAMPTZ | Timestamp |

### Tipo `cupon` en chat_mensajes

El tipo `cupon` fue agregado al check constraint `chat_msg_tipo_check` de la tabla `chat_mensajes` y al constraint `chat_conv_ultimo_mensaje_tipo_check` de `chat_conversaciones`. Esto permite enviar mensajes de tipo cupón con contenido JSON estructurado.

---

## 4. API Endpoints

### Business Studio (requiere auth + modo comercial)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ofertas` | Crear oferta/cupón |
| GET | `/api/ofertas` | Listar por sucursal |
| GET | `/api/ofertas/:id` | Detalle |
| PUT | `/api/ofertas/:id` | Actualizar |
| DELETE | `/api/ofertas/:id` | Eliminar (cascada: chat + notificaciones + R2) |
| POST | `/api/ofertas/:id/duplicar` | Duplicar a sucursales (solo ofertas públicas) |
| POST | `/api/ofertas/:id/asignar` | Asignar cupón a clientes |
| POST | `/api/ofertas/:id/reenviar` | Reenviar notificación + ChatYA |
| POST | `/api/ofertas/:id/revocar` | Revocar cupón (usuario individual) |
| POST | `/api/ofertas/:id/revocar-todos` | Revocar cupón (todos los usuarios activos) |
| POST | `/api/ofertas/:id/reactivar` | Reactivar cupón (todos los revocados) |
| GET | `/api/ofertas/:id/clientes-asignados` | Clientes asignados a un cupón |
| POST | `/api/ofertas/upload-imagen` | Presigned URL R2 |

### Vista Cliente (requiere auth)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/ofertas/mis-cupones` | Lista cupones del usuario |
| POST | `/api/ofertas/mis-cupones/:id/revelar` | Revelar código personal |
| GET | `/api/ofertas/mis-exclusivas` | Ofertas privadas asignadas |

### Feed Público

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/ofertas/feed` | Feed geolocalizado |
| GET | `/api/ofertas/detalle/:id` | Detalle público |
| GET | `/api/ofertas/publico/:codigo` | Vista por código |

### ScanYA

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/scanya/validar-codigo` | Validar código en caja |

---

## 5. Business Studio — Crear Promoción

### Toggle Ofertas/Cupones en tabla

El toggle Oferta/Cupón ya no está dentro del modal — está en el header de la tabla de Promociones.

| Aspecto | Comportamiento |
|---------|---------------|
| Desktop | Solo iconos (Megaphone/Ticket) con tooltip |
| Móvil | Iconos con texto ("Ofertas" / "Cupones") |
| Columnas | Cupones oculta Vistas/Shares/Clicks |
| Estados | Ofertas: Activas/Inactivas/Próximas/Vencidas/Agotadas — Cupones: Activos/Revocados/Vencidos |
| Badges | Género correcto: masculino para cupones ("Activo", "Revocado") |
| Botón crear | Dinámico: "Nueva Oferta" / "Nuevo Cupón" según toggle activo |

El modal abre con `visibilidadInicial` pre-establecida según el toggle activo en la tabla, eliminando la necesidad de seleccionar tipo dentro del modal.

### Modal con Tabs (solo modo Cupón)

**Oferta pública:** formulario simple sin tabs.

**Cupón privado:** 3 tabs.

| Tab | Contenido |
|-----|-----------|
| **Detalles** | Imagen, tipo, valor, fechas, título, descripción |
| **Ajustes** | Motivo, límite por persona, preview notificación, "¿Cómo funciona?" |
| **Enviar a** | Búsqueda, dropdown nivel (Bronce/Plata/Oro), dropdown actividad (Activos/Inactivos), lista checkboxes |

### Componentes del modal

```
ModalOferta.tsx         — Contenedor: header + tabs + botones
├── TabOferta.tsx       — Formulario principal
├── TabExclusiva.tsx    — Ajustes privados + preview
└── TabClientes.tsx     — Selector de clientes (creación) / Lista asignados (edición)
```

### Acciones en tabla — Ofertas públicas

| Acción | Icono | Disponible |
|--------|-------|-----------|
| Editar | Click en fila | Siempre |
| Ocultar/Mostrar | Eye/EyeOff | Siempre |
| Eliminar | Trash2 rojo | Siempre |
| Duplicar | Copy verde | Solo dueños |

### Acciones en tabla — Cupones privados

| Acción | Icono | Orden | Disponible |
|--------|-------|-------|-----------|
| Revocar | Ban naranja | 1 | Solo cupones activos |
| Reactivar | RefreshCw verde | 1 | Solo cupones inactivos |
| Eliminar | Trash2 rojo | 2 | Siempre |
| Reenviar | Send azul | 3 | Siempre |

> **Nota:** Los cupones NO muestran Duplicar ni Ocultar/Mostrar. El control de activación se hace mediante Revocar/Reactivar.

### Filtros en PaginaOfertas

| Filtro | Disponibilidad |
|--------|---------------|
| Estado (dinámico según toggle activo) | Móvil + Desktop |
| Tipo (Porcentaje/Monto/$2x1/etc.) | Solo Desktop |
| Búsqueda por título | Móvil + Desktop |

> **Nota:** El filtro de Visibilidad (Todas/Ofertas/Cupones) fue reemplazado por el toggle en el header de la tabla.

---

## 6. Business Studio — Editar Cupón

Al abrir un cupón existente en el modal, el comportamiento cambia:

### Toggle de visibilidad
- **Oculto** en modo edición — no se puede convertir oferta↔cupón después de crear.

### Campos del formulario
- **Cupón activo:** Tab Detalles editable, Tab Ajustes readonly (motivo y límite no se pueden cambiar)
- **Cupón inactivo (revocado):** Todos los campos readonly (opacity-60, pointer-events-none), excepto Tab Clientes

### Tab Clientes — Modo edición
En lugar del selector con checkboxes, muestra una **lista readonly** de clientes asignados con:
- Avatar, nombre, fecha de asignación
- Badge de estado (Activo/Usado/Expirado/Revocado)
- Click en un cliente abre `ModalDetalleCliente` con información completa
- Datos se cargan desde `GET /api/ofertas/:id/clientes-asignados`

### Botón Reactivar
- Cuando el cupón está inactivo, el icono Eye/EyeOff del header se reemplaza por **RefreshCw verde** ("Reactivar cupón")
- Muestra confirmación antes de ejecutar
- Llama a `POST /api/ofertas/:id/reactivar`
- Actualiza la tabla de BS instantáneamente

### Limpieza de imágenes huérfanas
- Al cerrar el modal sin guardar, si se subió imagen a R2, se elimina automáticamente
- Al guardar exitosamente, la imagen se marca como no huérfana antes de cerrar
- Aplica también al modal de artículos (`ModalArticulo.tsx`)

---

## 7. Cupones — Flujo Completo

```
1. Comerciante abre BS → Promociones → + Nueva Promoción
2. Toggle: Oferta → Cupón (icono Ticket) — solo en creación
3. Llena: Detalles (título, tipo, valor, fechas)
4. Tab Ajustes: motivo, límite por persona
5. Tab Enviar a: filtra por nivel/actividad → selecciona clientes
6. Click "Enviar cupón"
   ↓
7. Backend:
   - Crea oferta con visibilidad='privado'
   - Genera código único ANUN-XXXXXX por cada cliente
   - Inserta en oferta_usuarios
   - Envía notificación "¡Cupón exclusivo para ti!" a cada cliente
   - Envía mensaje tipo 'cupon' por ChatYA (burbuja especial)
   - Emite socket 'cupon:actualizado' para actualización en tiempo real
   ↓
8. Cliente recibe:
   - Notificación en panel: "¡Cupón exclusivo para ti!"
   - Mensaje en ChatYA: burbuja con imagen + "¡Felicidades!" + botón "Reclamar cupón"
   - Cupón aparece en Mis Cupones y en CarouselCupones (columna izquierda)
   ↓
9. Cliente va a Mis Cupones → ve cupón activo
10. Click "Ver cupón" → modal con detalles
11. Ingresa contraseña → Revelar código → muestra ANUN-XXXXXX (copiable)
12. Cliente va al negocio → muestra código
13. Empleado ingresa código en ScanYA
14. ScanYA valida: código → oferta_usuarios → ofertas
15. Puntos se calculan sobre monto PAGADO (post-descuento)
16. Registro en oferta_usos + actualiza usos_actuales
```

### Puntos + Cupones

Cuando un cliente usa un cupón:
- Puntos se calculan sobre **monto pagado** (después del descuento)
- Ejemplo: compra $500 con cupón 20% → puntos sobre $400

---

## 8. Revocación y Reactivación

### Revocar cupón (masivo)

**Endpoint:** `POST /api/ofertas/:id/revocar-todos`

**Flujo:**
1. Cambia `oferta_usuarios.estado` → `revocado` para todos los usuarios activos
2. Desactiva la oferta (`activo: false`)
3. Elimina mensajes de chat tipo `cupon` asociados
4. Actualiza preview de conversaciones (o elimina si no quedan mensajes)
5. Elimina notificaciones originales de asignación
6. Crea notificación "Cupón revocado" para cada cliente (`await` para garantizar timing)
7. Emite sockets: `cupon:actualizado`, `chatya:cupon-eliminado`, `notificacion:recargar`

> **Importante:** Los sockets se emiten DESPUÉS de que todas las operaciones de BD se completen, para evitar que el frontend recargue antes de que los datos estén actualizados.

### Reactivar cupón

**Endpoint:** `POST /api/ofertas/:id/reactivar`

**Flujo:**
1. Cambia `oferta_usuarios.estado` → `activo` para todos los revocados (limpia revocadoAt, revocadoPor, motivoRevocacion)
2. Activa la oferta (`activo: true`)
3. Elimina notificaciones de revocación previas
4. Crea notificación "¡Tu cupón fue reactivado!" para cada cliente
5. Envía nuevo mensaje tipo `cupon` por ChatYA
6. Emite sockets: `cupon:actualizado`, `notificacion:recargar`

> **Nota:** No emite `chatya:recargar-conversaciones` porque el mensaje nuevo ya llega por el canal estándar `chatya:mensaje-nuevo`.

### Revocar individual

**Endpoint:** `POST /api/ofertas/:id/revocar`

Revoca un solo usuario específico. Mismo flujo pero para un `usuarioId` del body.

---

## 9. Mis Cupones — Vista Cliente

**Ruta:** `/mis-cupones`

**Estructura — Estilo CardYA:**
- Header dark sticky (#000000) con glow emerald, grid pattern, esquinas curvas (`lg:rounded-b-3xl`)
- Branding: "Mis **Cupones**" (blanco + emerald-400)
- Subtítulo decorativo: "Tus **descuentos** exclusivos" + "CUPONERA DIGITAL"
- Móvil: header propio con ChevronLeft → `/inicio` + botón Menu (MobileHeader oculto)
- 3 tabs: Activos | Usados | Historial (expirados + revocados)
- KPIs desktop: cupones activos (emerald-400), cupones usados (blanco)
- Grid de CardCupon (1 col móvil, 3 lg, 4 2xl)
- Deep link desde notificaciones: `/mis-cupones?id=uuid` (cambia al tab correcto según estado)

**Store:** `useMisCuponesStore` (Zustand)
- Persiste datos entre navegaciones (no recarga cada vez)
- Pre-carga logos e imágenes al cargar datos (`new Image()`)
- Listener socket `cupon:actualizado` para actualización en tiempo real
- Recarga en background sin spinner si ya tiene datos

**CardCupon:**
- Móvil: horizontal (imagen izq + info der, 185px alto), logo circular arriba-izq, badge estado abajo-izq
- Desktop: vertical (imagen h-32/h-40, overlay negocio con logo circular + sombra blanca, línea gradiente emerald→negro h-1.5)
- Solo el botón "Ver cupón" abre el modal en cupones activos
- Cupones no activos: toda la card clickeable para ver detalle
- Metadata vertical: tipo descuento + fecha + motivo

**ModalDetalleCupon:**
- Header con gradiente slate unificado (no varía por tipo)
- Toggle ver/ocultar contraseña
- Botón ChatYA con icono `/IconoRojoChatYA.webp` + tooltip en PC
- Info como lista con divisores (Tag, Calendar, DollarSign, Gift)
- Badge "Activo": fondo sólido verde + letra blanca
- Texto "Tu código de cupón" (no "código de descuento")

**CarouselCupones (ColumnaIzquierda):**
- Carousel automático (cada 5s) de cupones activos
- Unificado con botón "Mis Cupones" (badge rojo circular con conteo)
- Cronómetro animado (Timer con animación ring) abajo-derecha
- Se oculta en `/mis-cupones`
- Usa el store `useMisCuponesStore`

**Componentes:**
```
PaginaMisCupones.tsx
├── componentes/CardCupon.tsx
└── componentes/ModalDetalleCupon.tsx

CarouselCupones.tsx (en components/layout/)
```

---

## 10. ScanYA — Validación de Código

**Endpoint:** `POST /api/scanya/validar-codigo`

**Flujo de validación (11 pasos):**
1. Buscar código en `oferta_usuarios.codigo_personal`
2. Verificar estado del cupón — rechazar si `usado`, `revocado` o `expirado`
3. Verificar que el código pertenece al cliente
4. Verificar que la oferta pertenece al negocio
5. Verificar sucursal (null = todas)
6. Verificar activa
7. Verificar fechas (inicio/fin)
8. Verificar límite de usos totales
9. Verificar límite por usuario
10. Retornar datos del descuento
11. Al confirmar: marca `oferta_usuarios.estado = 'usado'`

**UI en ScanYA:** Sección "Código de cupón" es la **segunda sección** del acordeón en ModalRegistrarVenta (después de cliente, antes de concepto/monto).

### Flujos según tipo de cupón

**Cupón gratis (monto $0):**
```
Cliente → Código de cupón → Confirmar (sin monto, sin método de pago)
```

**Cupón con compra:**
```
Cliente → Código de cupón → Monto → Método de pago → Confirmar
```

> **Nota:** El check constraint `puntos_transacciones_monto_check` permite `monto >= 0` para soportar cupones sin compra.

**Al registrar venta con código:**
- Busca oferta por ID
- Calcula descuento según tipo
- Registra uso en `oferta_usos`
- Incrementa `usos_actuales`
- Marca `oferta_usuarios.estado = 'usado'`
- Puntos sobre monto final (post-descuento, 0 si cupón gratis)

---

## 11. ChatYA — Burbuja de Cupón

### Tipo de mensaje

Los mensajes de cupón usan `tipo: 'cupon'` en `chat_mensajes`. El contenido es un JSON con:

```json
{
  "ofertaId": "uuid",
  "ofertaUsuarioId": "ANUN-XXXXXX",
  "titulo": "Pizza Gratis",
  "imagen": "https://...",
  "tipo": "otro",
  "valor": "GRATIS",
  "fechaExpiracion": "2026-03-31...",
  "negocioNombre": "Mi Negocio",
  "mensajeMotivador": "¡Felicidades! Tienes un cupón exclusivo 🎉",
  "accionUrl": "/mis-cupones?id=..."
}
```

### Burbuja visual

- Fondo blanco con borde emerald + sombra verde
- Imagen del cupón arriba (si existe)
- Cinta gradiente emerald→negro (h-1.5)
- Emoji 🎁 animado (bounce) a la izquierda + "¡Felicidades!" + "Tienes un cupón exclusivo" a la derecha
- Datos centrados: título + fecha expiración
- Botón "Reclamar cupón" con icono Ticket + efecto shine
- Hora fuera del card (hereda color de burbuja)

### Preview en lista de chats

- Muestra icono Ticket + 🎁 + título del cupón (parsea el JSON)
- En vez del JSON crudo

### Envío automático

El mensaje ChatYA se envía automáticamente al:
- Crear cupón (asignación inicial)
- Reenviar cupón
- Reactivar cupón

El participante emisor es el `usuario_id` del negocio (NO el `negocio_id`).

---

## 12. Notificaciones

### Tipos

| Tipo | Modo | Cuándo | Icono |
|------|------|--------|-------|
| `cupon_asignado` | personal | Al crear/reenviar/reactivar cupón | 🎟️ |
| `cupon_revocado` | personal | Al revocar cupón | ❌ |
| `nueva_oferta` | personal | Al crear oferta pública | Tag azul |

> **Importante:** La notificación de cupón NUNCA incluye el código personal (dato sensible). Solo título + nombre del negocio.

### Deep Links

| referenciaTipo | Ruta destino |
|---------------|-------------|
| `cupon` | `/mis-cupones?id={referenciaId}` |
| `oferta` | `/negocios/{sucursalId}?ofertaId={referenciaId}` |

El deep link cambia automáticamente al tab correcto según el estado del cupón (Activos, Usados, Historial).

### Reenvío

`POST /api/ofertas/:id/reenviar` ahora envía:
1. Notificación "¡Recordatorio de cupón!" (sin código)
2. Mensaje tipo `cupon` por ChatYA

---

## 13. Actualización en Tiempo Real

### Eventos Socket.io

| Evento | Emisor | Receptor | Descripción |
|--------|--------|----------|-------------|
| `cupon:actualizado` | Backend | Cliente | Refresca store de cupones (`useMisCuponesStore`) |
| `chatya:cupon-eliminado` | Backend | Cliente | Elimina burbujas de cupón del state sin parpadeo |
| `chatya:recargar-conversaciones` | Backend | Cliente | Recarga lista de chats + mensajes activos |
| `notificacion:recargar` | Backend | Cliente | Recarga panel de notificaciones |

### Listeners

- `useMisCuponesStore` — escucha `cupon:actualizado` → recarga cupones
- `useChatYAStore` — escucha `chatya:cupon-eliminado` → filtra mensajes tipo cupón del state local
- `useChatYAStore` — escucha `chatya:recargar-conversaciones` → recarga conversaciones + mensajes activos
- `useNotificacionesStore` — escucha `notificacion:recargar` → recarga lista de notificaciones

### Principio de timing

Los sockets se emiten **después** de que todas las operaciones de BD se completen. Las notificaciones usan `await crearNotificacion()` (no fire-and-forget) para garantizar que el dato existe cuando el frontend recarga.

### Eliminación sin parpadeo

`chatya:cupon-eliminado` recibe `{ ofertaId, conversacionIds }` y filtra los mensajes localmente sin hacer fetch. Esto evita el parpadeo visual de recargar todos los mensajes.

---

## 14. Limpieza Cascada

### Al revocar cupón

1. Mensajes de chat tipo `cupon` → **DELETE** (`contenido::jsonb->>'ofertaId'`)
2. Conversaciones vacías → **DELETE** (si no quedan mensajes)
3. Conversaciones con mensajes → Actualiza preview con último mensaje real
4. Notificaciones originales (`cupon_asignado`) → **DELETE**
5. Notificación nueva de revocación → **INSERT**

### Al eliminar cupón/oferta

1. Guardados → **DELETE** (`entity_type='oferta'`)
2. Notificaciones → **DELETE** (`referenciaId`)
3. Mensajes chat → **DELETE** (`contenido::jsonb->>'ofertaId'`)
4. Conversaciones vacías → **DELETE**
5. Oferta → **DELETE CASCADE** (elimina `oferta_usuarios`, `oferta_usos`)
6. Imagen R2 → **DELETE** (si `esUrlR2`, fire-and-forget)

### Limpieza de imágenes huérfanas R2

Cuando el usuario sube una imagen al modal pero cierra sin guardar:
- `useR2Upload.reset()` detecta `esSubidaNueva` y elimina la imagen de R2
- Al guardar exitosamente: `setImageUrl(null)` + `setR2Url(null)` antes de cerrar → `reset()` no elimina nada
- Aplica a `ModalOferta` y `ModalArticulo`

---

## 15. Recompensas N+1

**Concepto:** "Compra N veces, la N+1 es gratis" — implementado como tipo de recompensa en CardYA.

### Campos en tabla `recompensas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| tipo | VARCHAR(30) | `basica` o `compras_frecuentes` |
| numero_compras_requeridas | INTEGER nullable | N compras para desbloquear |
| requiere_puntos | BOOLEAN | false = gratis al llegar a N |

### Tabla `recompensa_progreso`

Tracking de compras acumuladas por usuario por recompensa.

### Flujo

1. Comerciante crea recompensa tipo "Por compras frecuentes" (N=5)
2. Cliente compra → ScanYA llama `verificarRecompensasDesbloqueadas()`
3. Sistema cuenta transacciones confirmadas del usuario
4. Al llegar a N → marca como desbloqueada + notifica
5. Si `requiere_puntos=false` → auto-genera voucher gratis

---

## 16. Frontend — Componentes

### Business Studio (ofertas/)

| Archivo | Propósito |
|---------|-----------|
| PaginaOfertas.tsx | Página principal con tabla, filtros, KPIs |
| ModalOferta.tsx | Contenedor modal con tabs + reactivar |
| TabOferta.tsx | Formulario: imagen, tipo, valor, fechas |
| TabExclusiva.tsx | Ajustes: motivo, límite, preview (readonly en edición) |
| TabClientes.tsx | Selector clientes (creación) / Lista asignados (edición) |
| ModalDuplicarOferta.tsx | Modal duplicar a sucursales |

### Vista Cliente (cupones/)

| Archivo | Propósito |
|---------|-----------|
| PaginaMisCupones.tsx | Página estilo CardYA con tabs + grid |
| componentes/CardCupon.tsx | Card móvil/desktop con overlay negocio |
| componentes/ModalDetalleCupon.tsx | Detalle + revelar código + ChatYA |

### Servicios

| Archivo | Propósito |
|---------|-----------|
| ofertasService.ts | CRUD BS + feed + asignar + reenviar + revocar masivo + reactivar + clientes asignados |
| misCuponesService.ts | Mis cupones + revelar |

### Stores

| Archivo | Propósito |
|---------|-----------|
| useMisCuponesStore.ts | Persistencia + pre-carga imágenes + listener socket |

### Layout

| Archivo | Propósito |
|---------|-----------|
| CarouselCupones.tsx | Carousel automático en ColumnaIzquierda |

---

## 17. Decisiones de Diseño

### ¿Por qué no un módulo separado de Cupones?
- Ofertas y cupones comparten 90% de la estructura (tipo, valor, fechas, imagen)
- Un módulo separado duplicaba código, tablas y UI
- "Promociones" como paraguas unifica ambos conceptos
- Toggle Ofertas/Cupones en la tabla es más intuitivo que un dropdown de visibilidad

### ¿Por qué código único por usuario?
- Intransferible: si comparte el código, no funciona para otro
- Tracking individual: se sabe exactamente quién usó qué
- Seguridad: no se pueden adivinar códigos (ANUN-XXXXXX aleatorio)

### ¿Por qué revocar vs eliminar?
- **Eliminar** = desaparece todo (cupón, notificaciones, mensajes, imagen R2). Sin historial.
- **Revocar** = desactiva pero mantiene registro. Útil para historial, disputas, métricas. Se puede reactivar.
- Los cupones no se "ocultan" (Eye/EyeOff) como las ofertas — se revocan/reactivan.

### ¿Por qué N+1 en CardYA y no en Cupones?
- El patrón "N compras → recompensa" es acumulativo y progresivo
- Encaja con la mecánica de lealtad (puntos, niveles, recompensas)
- Los cupones son de efecto inmediato, no acumulativos

### ¿Por qué puntos sobre monto pagado?
- Estándar en comercio: puntos solo por lo que realmente pagas
- Justo para el negocio: no regala puntos sobre descuento
- El cliente acumula menos pero el valor es real

### ¿Por qué sockets después de await?
- Si se emiten en paralelo con las operaciones de BD, el frontend recarga antes de que los datos existan
- Patrón: primero `await` todas las escrituras, luego emitir sockets
- Las notificaciones usan `await crearNotificacion()` para garantizar timing
