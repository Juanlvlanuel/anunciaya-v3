# 🏷️ Promociones — Ofertas y Cupones

**Última actualización:** 22 Marzo 2026
**Versión:** 1.0
**Estado:** ✅ Operacional (Ofertas públicas + Cupones privados)

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe la **arquitectura del módulo de Promociones**:
- ✅ Ofertas públicas (informativas, visibles para todos)
- ✅ Cupones privados (código único por usuario, validación ScanYA)
- ✅ CRUD desde Business Studio
- ✅ Selector de clientes con filtros (nivel, actividad)
- ✅ Validación en ScanYA con código personal
- ✅ Vista cliente "Mis Cupones" con revelación de código
- ✅ Revocación de cupones desde BS
- ✅ Reenvío de cupones
- ✅ Notificaciones (panel + deep link)
- ✅ Recompensas N+1 (compras frecuentes) en CardYA

**NO incluye:**
- ❌ Burbuja especial en ChatYA (pendiente)
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

---

## 📋 Índice

1. [Concepto](#concepto)
2. [Ofertas vs Cupones](#ofertas-vs-cupones)
3. [Base de Datos](#base-de-datos)
4. [API Endpoints](#api-endpoints)
5. [Business Studio — Crear Promoción](#business-studio--crear-promoción)
6. [Cupones — Flujo Completo](#cupones--flujo-completo)
7. [Mis Cupones — Vista Cliente](#mis-cupones--vista-cliente)
8. [ScanYA — Validación de Código](#scanya--validación-de-código)
9. [Notificaciones](#notificaciones)
10. [Recompensas N+1](#recompensas-n1)
11. [Frontend — Componentes](#frontend--componentes)
12. [Decisiones de Diseño](#decisiones-de-diseño)

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
| Revocable | ❌ No | ✅ Sí (desde BS) |
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
| codigo_personal | VARCHAR(50) UNIQUE | Código único (auto-generado: VIP-XXXXX) |
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

---

## 4. API Endpoints

### Business Studio (requiere auth + modo comercial)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/ofertas` | Crear oferta/cupón |
| GET | `/api/ofertas` | Listar por sucursal |
| GET | `/api/ofertas/:id` | Detalle |
| PUT | `/api/ofertas/:id` | Actualizar |
| DELETE | `/api/ofertas/:id` | Eliminar |
| POST | `/api/ofertas/:id/duplicar` | Duplicar a sucursales |
| POST | `/api/ofertas/:id/asignar` | Asignar cupón a clientes |
| POST | `/api/ofertas/:id/reenviar` | Reenviar notificación |
| POST | `/api/ofertas/:id/revocar` | Revocar cupón |
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

### Modal con Tabs (solo modo Cupón)

**Oferta pública:** formulario simple sin tabs.

**Cupón privado:** 3 tabs.

| Tab | Contenido |
|-----|-----------|
| **Detalles** | Imagen, tipo, valor, fechas, título, descripción |
| **Ajustes** | Motivo, límite por persona, preview notificación, "¿Cómo funciona?" |
| **Enviar a** | Búsqueda, dropdown nivel (Bronce/Plata/Oro), dropdown actividad (Activos/Inactivos), lista checkboxes, pill informativo |

### Componentes del modal

```
ModalOferta.tsx         — Contenedor: header + tabs + botones
├── TabOferta.tsx       — Formulario principal
├── TabExclusiva.tsx    — Ajustes privados + preview
└── TabClientes.tsx     — Selector de clientes con filtros
```

### Acciones en tabla

| Acción | Icono | Disponible |
|--------|-------|-----------|
| Editar | Click en fila | Siempre |
| Ocultar/Mostrar | Eye/EyeOff | Siempre |
| Eliminar | Trash2 rojo | Siempre |
| Duplicar | Copy verde | Solo dueños |
| Reenviar cupón | Send azul | Solo cupones privados |
| Revocar cupón | Ban naranja | Solo cupones activos |

### Filtros en PaginaOfertas

| Filtro | Disponibilidad |
|--------|---------------|
| Estado (Activas/Inactivas/Próximas/Vencidas/Agotadas) | Móvil + Desktop |
| Visibilidad (Todas/Ofertas/Cupones) | Móvil + Desktop |
| Tipo (Porcentaje/Monto/$2x1/etc.) | Solo Desktop |
| Búsqueda por título | Móvil + Desktop |

---

## 6. Cupones — Flujo Completo

```
1. Comerciante abre BS → Promociones → + Nueva Promoción
2. Toggle: Oferta → Cupón (icono Ticket)
3. Llena: Detalles (título, tipo, valor, fechas)
4. Tab Ajustes: motivo, límite por persona
5. Tab Enviar a: filtra por nivel/actividad → selecciona clientes
6. Click "Enviar cupón"
   ↓
7. Backend:
   - Crea oferta con visibilidad='privado'
   - Genera código único VIP-XXXXX por cada cliente
   - Inserta en oferta_usuarios
   - Envía notificación a cada cliente
   ↓
8. Cliente recibe notificación: "¡Cupón exclusivo para ti!"
9. Cliente va a Mis Cupones → ve cupón activo
10. Click "Ver cupón" → modal con detalles
11. Click "Revelar código" → muestra VIP-A3K9X (copiable)
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

## 7. Mis Cupones — Vista Cliente

**Ruta:** `/mis-cupones`

**Estructura:**
- Header dark con gradiente emerald (#10b981 → #059669)
- 3 tabs: Activos | Usados | Historial (expirados + revocados)
- KPIs: cupones activos, cupones usados
- Grid de CardCupon (1 col móvil, 3 lg, 4 2xl)
- Deep link desde notificaciones: `/mis-cupones?id=uuid`

**CardCupon:**
- Móvil: horizontal (imagen izq + info der, 185px alto)
- Desktop: vertical (imagen arriba, info abajo)
- Badge estado: Activo (emerald), Usado (slate), Expirado (amber), Revocado (red)
- Línea separadora gradiente emerald → negro (móvil)

**ModalDetalleCupon:**
- Header con gradiente del tipo de oferta
- Info: negocio, descripción, tipo/valor, fecha expiración, motivo
- Botón "Revelar código" → muestra código grande + copiar
- Si revocado: motivo + fecha

**Componentes:**
```
PaginaMisCupones.tsx
├── componentes/CardCupon.tsx
└── componentes/ModalDetalleCupon.tsx
```

---

## 8. ScanYA — Validación de Código

**Endpoint:** `POST /api/scanya/validar-codigo`

**Flujo de validación (9 pasos):**
1. Buscar código en `oferta_usuarios.codigo_personal`
2. Verificar que el código pertenece al cliente
3. Verificar que la oferta pertenece al negocio
4. Verificar sucursal (null = todas)
5. Verificar activa
6. Verificar fechas (inicio/fin)
7. Verificar límite de usos totales
8. Verificar límite por usuario
9. Retornar datos del descuento

**UI en ScanYA:** Sección "Código de descuento (opcional)" en ModalRegistrarVenta.

**Al registrar venta con código:**
- Busca oferta por ID
- Calcula descuento según tipo
- Registra uso en `oferta_usos`
- Incrementa `usos_actuales`
- Puntos sobre monto final (post-descuento)

---

## 9. Notificaciones

### Tipos

| Tipo | Modo | Cuándo | Icono |
|------|------|--------|-------|
| `cupon_asignado` | personal | Al crear cupón privado | Ticket verde |
| `cupon_revocado` | personal | Al revocar cupón | Ticket rojo |
| `nueva_oferta` | personal | Al crear oferta pública | Tag azul |

### Deep Links

| referenciaTipo | Ruta destino |
|---------------|-------------|
| `cupon` | `/mis-cupones?id={referenciaId}` |
| `oferta` | `/negocios/{sucursalId}?ofertaId={referenciaId}` |

---

## 10. Recompensas N+1

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

## 11. Frontend — Componentes

### Business Studio (ofertas/)

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| PaginaOfertas.tsx | ~1400 | Página principal con tabla, filtros, KPIs |
| ModalOferta.tsx | ~400 | Contenedor modal con tabs |
| TabOferta.tsx | ~290 | Formulario: imagen, tipo, valor, fechas |
| TabExclusiva.tsx | ~90 | Ajustes: motivo, límite, preview |
| TabClientes.tsx | ~230 | Selector clientes con dropdowns |
| ModalDuplicarOferta.tsx | - | Modal duplicar a sucursales |

### Vista Cliente (cupones/)

| Archivo | Propósito |
|---------|-----------|
| PaginaMisCupones.tsx | Página con tabs + grid cards |
| componentes/CardCupon.tsx | Card móvil/desktop |
| componentes/ModalDetalleCupon.tsx | Detalle + revelar código |

### Servicios

| Archivo | Propósito |
|---------|-----------|
| ofertasService.ts | CRUD BS + feed + asignar + reenviar |
| misCuponesService.ts | Mis cupones + revelar + revocar |

---

## 12. Decisiones de Diseño

### ¿Por qué no un módulo separado de Cupones?
- Ofertas y cupones comparten 90% de la estructura (tipo, valor, fechas, imagen)
- Un módulo separado duplicaba código, tablas y UI
- "Promociones" como paraguas unifica ambos conceptos
- Toggle Oferta/Cupón en el modal es más intuitivo que dos secciones separadas

### ¿Por qué código único por usuario?
- Intransferible: si comparte el código, no funciona para otro
- Tracking individual: se sabe exactamente quién usó qué
- Seguridad: no se pueden adivinar códigos (VIP-XXXXX aleatorio)

### ¿Por qué N+1 en CardYA y no en Cupones?
- El patrón "N compras → recompensa" es acumulativo y progresivo
- Encaja con la mecánica de lealtad (puntos, niveles, recompensas)
- Los cupones son de efecto inmediato, no acumulativos

### ¿Por qué puntos sobre monto pagado?
- Estándar en comercio: puntos solo por lo que realmente pagas
- Justo para el negocio: no regala puntos sobre descuento
- El cliente acumula menos pero el valor es real
