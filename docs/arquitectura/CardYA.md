# 💳 CardYA - Sistema de Lealtad para Clientes

**Última actualización:** 17 Abril 2026
**Versión:** 2.1
**Estado:** ✅ 100% Operacional

> **DATOS DEL SERVIDOR (React Query):**
> - Hooks en `hooks/queries/useCardYA.ts`: useCardYABilleteras, useCardYARecompensas, useCardYAVouchers, useCardYAHistorialCompras, useCardYAHistorialCanjes, useCanjearRecompensa (optimista), useCancelarVoucher (optimista)
> - Socket `recompensa:stock-actualizado` vía `useCardYASocket()`
> - Caché evita llamadas duplicadas; revisitas usan caché.

---

## ⚠️ ALCANCE DE ESTE DOCUMENTO

Este documento describe la **arquitectura del sistema CardYA**:
- ✅ Sistema de billeteras (puntos por negocio)
- ✅ Sistema de niveles (Bronce/Plata/Oro)
- ✅ Catálogo de recompensas canjeables
- ✅ Sistema de vouchers generados
- ✅ Historial de compras y canjes
- ✅ 8 endpoints backend verificados
- ✅ 10 componentes frontend
- ✅ Store Zustand con optimistic updates
- ✅ Integración con ScanYA

**NO incluye:**
- ❌ Código fuente completo (consultar archivos en repositorio)
- ❌ Configuración de puntos desde Business Studio (ver `ARQUITECTURA_Business_Studio.md`)
- ❌ Proceso de escaneo en ScanYA (ver `ARQUITECTURA_ScanYA.md`)

**Para implementación exacta:**
- Ver: `/apps/api/src/services/cardya.service.ts`
- Ver: `/apps/api/src/routes/cardya.routes.ts`
- Ver: `/apps/api/src/controllers/cardya.controller.ts`
- Ver: `/apps/api/src/types/cardya.types.ts`
- Ver: `/apps/api/src/validations/cardya.schema.ts`  
- Ver: `/apps/web/src/pages/private/cardya/` (frontend completo)
- Ver: `/apps/web/src/hooks/queries/useCardYA.ts` (React Query hooks)
- Ver: `/apps/web/src/services/cardyaService.ts`

---

## 📋 Índice

1. [¿Qué es CardYA?](#qué-es-cardya)
2. [¿Para qué sirve?](#para-qué-sirve)
3. [Sistema de Billeteras](#sistema-de-billeteras)
4. [Sistema de Niveles](#sistema-de-niveles)
5. [Catálogo de Recompensas](#catálogo-de-recompensas)
6. [Sistema de Vouchers](#sistema-de-vouchers)
7. [Historial](#historial)
8. [API Endpoints](#api-endpoints)
9. [Base de Datos](#base-de-datos)
10. [Frontend - Componentes](#frontend---componentes)
11. [Store Zustand](#store-zustand)
12. [Integración con ScanYA](#integración-con-scanya)
13. [Flujos de Usuario](#flujos-de-usuario)
14. [Recompensas N+1 (Compras Frecuentes)](#recompensas-n1-compras-frecuentes)
15. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)

---

## 🎯 ¿Qué es CardYA?

**CardYA** es el sistema de lealtad digital para clientes de AnunciaYA. Funciona como una "tarjeta de puntos universal" donde los usuarios acumulan puntos comprando en negocios locales participantes.

### Analogía

> "CardYA es como OXXO Premia, pero para TODOS los negocios locales de tu ciudad"

### Características Principales

- **Billeteras separadas:** Puntos por cada negocio (no mezclados)
- **Niveles progresivos:** Bronce → Plata → Oro con multiplicadores
- **Recompensas canjeables:** Cada negocio define sus propias recompensas
- **Vouchers con QR:** Al canjear se genera voucher único
- **Historial completo:** Compras y canjes documentados

**Ruta:** `/cardya`  
**Acceso:** Solo modo Personal (requiere login)  
**Completado:** 12 Febrero 2026

---

## 💡 ¿Para qué sirve?

### Para el Cliente (Usuario)

| Funcionalidad | Descripción |
|---------------|-------------|
| Ver puntos | Saldo de puntos en cada negocio donde ha comprado |
| Ver nivel | Bronce/Plata/Oro con beneficios (multiplicadores) |
| Canjear recompensas | Usar puntos para obtener productos/descuentos gratis |
| Ver vouchers | Vouchers pendientes de canjear en tienda |
| Ver historial | Todas las compras y canjes realizados |

### Para el Negocio (vía Business Studio > Puntos,Transacciones, Clientes)

| Funcionalidad | Descripción |
|---------------|-------------|
| Configurar puntos | Cuántos puntos por cada $X pesos |
| Configurar niveles | Rangos y multiplicadores Bronce/Plata/Oro |
| Crear recompensas | Catálogo de premios canjeables |
| Ver vouchers pendientes | Vouchers que clientes van a reclamar |
| Estadísticas | Puntos otorgados, canjeados, clientes por nivel |

---

## 💰 Sistema de Billeteras

### Concepto

Cada usuario tiene una **billetera separada por negocio**. Los puntos NO se mezclan entre negocios.

```
Usuario Juan:
├── Billetera Taquería Peñasco: 19,120 pts (Plata)
├── Billetera Farmacia López: 500 pts (Bronce)
└── Billetera Café Central: 3,200 pts (Oro)
```

### Estructura de Billetera

```typescript
interface Billetera {
  id: string;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  puntosDisponibles: number;
  puntosAcumuladosTotal: number;  // Lifetime
  nivelActual: 'bronce' | 'plata' | 'oro';
  multiplicador: number;  // 1.0, 1.2, 1.5
  ultimaActividad: string;  // ISO date
}
```

### Tabla: `puntos_billetera`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | Identificador único |
| `usuario_id` | UUID FK | Referencia a usuarios |
| `negocio_id` | UUID FK | Referencia a negocios |
| `puntos_disponibles` | INTEGER | Saldo actual |
| `puntos_acumulados_total` | INTEGER | Total histórico |
| `puntos_canjeados_total` | INTEGER | Puntos Usados |
| `puntos_expirados_total` | INTEGER | Total histórico |
| `nivel_actual` | VARCHAR(20) | 'bronce', 'plata', 'oro' |
| `ultima_actividad` | TIMESTAMP | Última transacción |
| `created_at` | TIMESTAMP | Fecha creación |

**Índices:**
- `idx_billeteras_usuario_negocio` UNIQUE (usuario_id, negocio_id)
- `idx_billeteras_negocio` (negocio_id)

---

## ⭐ Sistema de Niveles

### Niveles Disponibles

| Nivel | Color | Rango Default | Multiplicador Default |
|-------|-------|---------------|----------------------|
| **Bronce** | 🟤 Café | 0 - 999 pts | 1.0x |
| **Plata** | ⚪ Gris | 1,000 - 2,999 pts | 1.2x |
| **Oro** | 🟡 Amarillo | 3,000+ pts | 1.5x |

### Configuración por Negocio

Cada negocio puede personalizar:
- Rangos de puntos para cada nivel
- Multiplicadores de acumulación
- Activar/desactivar sistema de niveles

### Cálculo de Puntos con Multiplicador

```typescript
// Fórmula de acumulación
const puntosBase = Math.floor(montoCompra * puntosPerPeso);
const puntosFinales = Math.floor(puntosBase * multiplicadorNivel);

// Ejemplo: Compra $100, config: 1 punto por $10, nivel Oro (1.5x)
// puntosBase = floor(100 * 0.1) = 10 pts
// puntosFinales = floor(10 * 1.5) = 15 pts
```

### Recálculo de Nivel

El nivel se recalcula automáticamente:
- Al recibir puntos (puede subir)
- Al canjear voucher (puede bajar)
- Al expirar puntos (puede bajar)

```typescript
function calcularNivel(puntosAcumuladosTotal: number, config: ConfigNiveles): Nivel {
  if (puntosAcumuladosTotal >= config.oro.minimo) return 'oro';
  if (puntosAcumuladosTotal >= config.plata.minimo) return 'plata';
  return 'bronce';
}
```

---

## 🎁 Catálogo de Recompensas

### Concepto

Cada negocio crea su propio catálogo de recompensas canjeables con puntos.

### Estructura de Recompensa

```typescript
interface Recompensa {
  id: string;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  nombre: string;
  descripcion: string | null;
  imagen: string | null;
  puntosRequeridos: number;
  stockDisponible: number;  // -1 = ilimitado
  requiereAprobacion: boolean;
  activa: boolean;
  tienesPuntosSuficientes: boolean;  // Calculado para el usuario
}
```

### Tabla: `recompensas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | Identificador único |
| `negocio_id` | UUID FK | Negocio dueño |
| `nombre` | VARCHAR(100) | Nombre de la recompensa |
| `descripcion` | TEXT | Descripción opcional |
| `puntos_requeridos` | INTEGER | Puntos para canjear |
| `imagen_url` | VARCHAR(500) | URL R2 |
| `stock` | INTEGER | -1 = ilimitado |
| `requiere_aprobacion` | BOOLEAN | Canje manual del negocio |
| `activa` | BOOLEAN | Visible en catálogo |
| `orden` | INTEGER | Para Ordenar Manualmente |
| `created_at` | TIMESTAMP | Fecha creación |
| `updated_at` | TIMESTAMP | Fecha de actualziación |

---

## 🎫 Sistema de Vouchers

### Concepto

Al canjear una recompensa, se genera un **voucher único** con código QR que el cliente presenta en el negocio.

### Ciclo de Vida del Voucher

```
CANJE
  ↓
Voucher creado (estado: 'pendiente')
  ↓
Usuario presenta QR en negocio
  ↓
Empleado escanea en ScanYA
  ↓
Voucher actualizado (estado: 'canjeado')
  ↓
FIN

Alternativas:
- Voucher expira → estado: 'expirado' + puntos devueltos
- Usuario cancela → estado: 'cancelado' + puntos devueltos
```

### Estados del Voucher

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Generado, esperando que cliente lo use |
| `canjeado` | Cliente lo presentó, negocio lo validó |
| `expirado` | Pasó fecha límite sin usar |
| `cancelado` | Usuario lo canceló antes de usar |

### Estructura de Voucher

```typescript
interface Voucher {
  id: string;
  codigo: string;  // Único, para QR
  recompensaId: string;
  recompensaNombre: string;
  recompensaImagen: string | null;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  sucursalId: string | null;  // NULL hasta que se canjee
  sucursalNombre: string | null;
  puntosUsados: number;
  estado: 'pendiente' | 'canjeado' | 'expirado' | 'cancelado';
  fechaExpiracion: string;
  fechaCanje: string | null;
  createdAt: string;
}
```

### Tabla: `vouchers_canje`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID PK | Identificador único |
| `billetera_id` | UUID FK | Billetera del Cliente |
| `recompensa_id` | UUID FK | Recompensa canjeada |
| `usuario_id` | UUID FK | Dueño del voucher |
| `negocio_id` | UUID FK | Negocio emisor |
| `codigo` | VARCHAR(6) UNIQUE | Código de 6 digitos |
| `qr_data` | VARCHAR(500) UNIQUE | Código para QR |
| `puntos_usados` | INTEGER | Puntos descontados |
| `estado` | VARCHAR(30) | Estado actual |
| `expira_at` | TIMESTAMP | Cuándo expira |
| `usado_at` | TIMESTAMP NULL | Cuándo se usó |
| `usado_por_empleado_id` | UUID FK | Empleado que Canjeo Voucher |
| `created_at` | TIMESTAMP | Fecha creación |
| `sucursal_id` | UUID FK NULL | Sucursal donde se canjeó |
| `usado_por_usuario_id` | UUID FK | Dueño/Gerente que Canjeo Voucher |

**Nota importante:** `sucursal_id` es NULL cuando se genera el voucher. Se llena cuando el cliente lo canjea en una sucursal específica.

---

## 📜 Historial

### Historial de Compras

Todas las transacciones donde el usuario ganó puntos.

```typescript
interface HistorialCompra {
  id: string;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  sucursalId: string;
  sucursalNombre: string;
  monto: number;
  puntosGanados: number;
  multiplicadorAplicado: number;
  nivelAlMomento: string;
  empleadoNombre: string | null;
  createdAt: string;
}
```

### Historial de Canjes

Todos los vouchers generados por canjes.

```typescript
interface HistorialCanje {
  id: string;
  voucherId: string;
  voucherCodigo: string;
  recompensaNombre: string;
  negocioNombre: string;
  puntosUsados: number;
  estado: string;
  createdAt: string;
}
```

---

## 🔌 API Endpoints

### Módulo CardYA (8 endpoints)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/cardya/mis-puntos` | ✅ | Lista de billeteras del usuario |
| GET | `/api/cardya/negocio/:id` | ✅ | Detalle billetera por negocio |
| GET | `/api/cardya/recompensas` | ✅ | Catálogo de recompensas (filtrable) |
| POST | `/api/cardya/canjear` | ✅ | Canjear recompensa → genera voucher |
| GET | `/api/cardya/vouchers` | ✅ | Vouchers del usuario (filtrable por estado) |
| DELETE | `/api/cardya/vouchers/:id` | ✅ | Cancelar voucher pendiente |
| GET | `/api/cardya/historial/compras` | ✅ | Historial de compras |
| GET | `/api/cardya/historial/canjes` | ✅ | Historial de canjes |

### Parámetros de Filtro

**GET /api/cardya/recompensas:**
```
?negocioId=uuid    # Filtrar por negocio específico
?soloCanjeables=true  # Solo las que puede pagar
```

**GET /api/cardya/vouchers:**
```
?estado=pendiente  # pendiente | canjeado | expirado | cancelado
?negocioId=uuid    # Filtrar por negocio
```

**GET /api/cardya/historial/compras:**
```
?negocioId=uuid    # Filtrar por negocio
?limite=20         # Paginación
?offset=0
```

### Respuestas Típicas

**GET /api/cardya/mis-puntos:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "negocioId": "uuid",
      "negocioNombre": "Taquería Peñasco",
      "negocioLogo": "https://pub-xxxxx.r2.dev/...",
      "puntosDisponibles": 19120,
      "puntosAcumuladosTotal": 25000,
      "nivelActual": "plata",
      "multiplicador": 1.2,
      "ultimaActividad": "2026-02-10T15:30:00Z"
    }
  ]
}
```

**POST /api/cardya/canjear:**
```json
// Request
{
  "recompensaId": "uuid"
}

// Response
{
  "success": true,
  "data": {
    "id": "uuid",
    "codigo": "VCH-ABC123XYZ",
    "recompensaNombre": "Taco Gratis",
    "puntosUsados": 500,
    "estado": "pendiente",
    "fechaExpiracion": "2026-02-19T23:59:59Z"
  },
  "message": "Voucher generado exitosamente"
}
```

---

## 🗄️ Base de Datos

### Diagrama de Tablas

```
usuarios
    │
    ├─────────────────┐
    ↓                 ↓
puntos_billeteras  puntos_vouchers
    │                 │
    └────────┬────────┘
             ↓
          negocios
             │
             ↓
    puntos_recompensas
```

### Relaciones

| Tabla | Relación | Con |
|-------|----------|-----|
| `puntos_billetera` | N:1 | `usuarios` |
| `puntos_billetera` | N:1 | `negocios` |
| `recompensas` | N:1 | `negocios` |
| `vouchers_canje` | N:1 | `usuarios` |
| `vouchers_canje` | N:1 | `negocios` |
| `vouchers_canje` | N:1 | `recompensas` |
| `vouchers_canje` | N:1 | `negocio_sucursales` (nullable) |
| `puntos_transacciones` | N:1 | `usuarios` |
| `puntos_transacciones` | N:1 | `negocios` |

---

## 🖼️ Frontend - Componentes

### Estructura de Carpetas

```
apps/web/src/pages/private/cardya/
├── PaginaCardYA.tsx              # Página principal con tabs
├── componentes/
│   ├── CardBilletera.tsx         # Tarjeta de billetera
│   ├── CardRecompensaCliente.tsx # Tarjeta de recompensa (con glow)
│   ├── DropdownNegocio.tsx       # Filtro por negocio
│   ├── TablaHistorialCompras.tsx # Historial compras
│   ├── TablaHistorialVouchers.tsx # Historial vouchers
│   ├── ModalDetalleBilletera.tsx # Detalle billetera + nivel
│   ├── ModalDetalleTransaccion.tsx # Detalle compra
│   ├── ModalDetalleVoucher.tsx   # Detalle voucher
│   ├── ModalConfirmarCanje.tsx   # Confirmación antes de canjear
│   └── ModalVoucherGenerado.tsx  # Voucher recién generado con QR
```

### PaginaCardYA.tsx

**Layout:**
```
┌────────────────────────────────────────────┐
│ Header: Logo CardYA + KPIs                 │
│ [Total Puntos: 22,820] [Negocios: 3]       │
├────────────────────────────────────────────┤
│ Tabs: [Billeteras] [Recompensas] [Vouchers] [Historial]
├────────────────────────────────────────────┤
│                                            │
│ Contenido según tab activo                 │
│ (Grid responsive: 1/3/4 columnas)          │
│                                            │
└────────────────────────────────────────────┘
```

**Tabs:**
1. **Billeteras:** Grid de CardBilletera
2. **Recompensas:** Grid de CardRecompensaCliente + filtro negocio
3. **Vouchers:** Grid de TarjetaVoucher + filtro estado
4. **Historial:** TablaHistorialCompras + TablaHistorialVouchers

### Widget CardYA (Sidebar)

**Ubicación:** `apps/web/src/components/layout/WidgetCardYA.tsx`

**Diseño:** Card premium negro/dorado mostrando:
- Nombre del usuario
- "Miembro desde: [fecha registro]"
- Negocios activos: X
- Link a `/cardya`

---

## 📦 Estado — React Query (hooks/queries/useCardYA.ts)

```typescript
// Hooks disponibles
useCardYABilleteras()          // GET billeteras de puntos
useCardYARecompensas(negocioId?) // GET recompensas (ciudad del GPS en query key)
useCardYAVouchers(filtros?)    // GET vouchers
useCardYAHistorialCompras(filtros?) // GET historial compras
useCardYAHistorialCanjes(filtros?)  // GET historial canjes
useCanjearRecompensa()         // POST canjear (optimistic UI + rollback)
useCancelarVoucher()           // DELETE cancelar (optimistic UI + rollback)
useCardYASocket()              // Socket: recompensa:stock-actualizado → invalida recompensas
```

### Optimistic Updates

**Canjear Recompensa:**
1. UI muestra modal confirmación
2. Usuario confirma
3. Inmediatamente: UI muestra voucher generado (optimista)
4. Backend procesa
5. Si error: Rollback + toast error

**Cancelar Voucher:**
1. UI marca voucher como cancelado inmediatamente
2. Backend procesa
3. Si error: Voucher vuelve a estado anterior

---

## 🔗 Integración con ScanYA

### Flujo: Otorgar Puntos

```
Cliente compra en negocio
         ↓
Cliente muestra su QR personal o dice su teléfono
         ↓
Empleado busca cliente en ScanYA
         ↓
Registra venta con monto
         ↓
Sistema calcula puntos:
  - Obtiene config de puntos del negocio
  - Obtiene nivel actual del cliente
  - Aplica multiplicador
  - Crea transacción en puntos_transacciones
  - Actualiza billetera (suma puntos)
  - Recalcula nivel si aplica
         ↓
Notificación push al cliente: "¡Ganaste X puntos!"
```

### Flujo: Canjear Voucher

```
Cliente muestra voucher (QR) en negocio
         ↓
Empleado escanea QR en ScanYA
         ↓
ScanYA valida:
  - Voucher existe
  - Estado = 'pendiente'
  - No expirado
  - Negocio correcto
         ↓
Empleado entrega recompensa física
         ↓
Empleado confirma en ScanYA
         ↓
Sistema actualiza:
  - voucher.estado = 'canjeado'
  - voucher.sucursal_id = sucursal actual
  - voucher.fecha_canje = now()
         ↓
Notificación al cliente: "¡Voucher canjeado!"
```

---

## 🔄 Flujos de Usuario

### Flujo 1: Ver Mis Puntos

```
Usuario en modo Personal
         ↓
Click en "CardYA" (sidebar)
         ↓
GET /api/cardya/mis-puntos
         ↓
Muestra grid de billeteras:
  - Puntos disponibles por negocio
  - Nivel actual (Bronce/Plata/Oro)
  - Última actividad
         ↓
Click en billetera → Modal con detalle:
  - Barra de progreso hacia siguiente nivel
  - Multiplicador actual
  - Últimas 5 transacciones
```

### Flujo 2: Canjear Recompensa

```
Usuario en tab "Recompensas"
         ↓
Filtra por negocio (opcional)
         ↓
Ve catálogo de recompensas disponibles
         ↓
Click en "Canjear" (solo si tiene puntos suficientes)
         ↓
Modal de confirmación:
  "¿Canjear [Taco Gratis] por 500 puntos?"
  [Cancelar] [Confirmar]
         ↓
POST /api/cardya/canjear
         ↓
Modal de éxito con voucher generado:
  - QR code
  - Código texto
  - Fecha expiración
  - Botón "Ver mis vouchers"
         ↓
Puntos descontados de billetera
Stock de recompensa -1
```

### Flujo 3: Cancelar Voucher

```
Usuario en tab "Vouchers"
         ↓
Click en voucher pendiente
         ↓
Modal detalle voucher
         ↓
Click "Cancelar Voucher"
         ↓
Confirmación: "¿Seguro? Recuperarás X puntos"
         ↓
DELETE /api/cardya/vouchers/:id
         ↓
Voucher desaparece de lista
Puntos devueltos a billetera
Stock de recompensa +1
```

---

## 🎯 Recompensas N+1 (Compras Frecuentes / Tarjeta de Sellos)

**Concepto:** Recompensas que se desbloquean después de N compras acumuladas. Ejemplo: "Después de 5 compras, la 6ª es gratis".

### Campos en tabla `recompensas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tipo` | VARCHAR(30) | `basica` (default) o `compras_frecuentes` |
| `numero_compras_requeridas` | INTEGER nullable | N compras para desbloquear |
| `requiere_puntos` | BOOLEAN | `false` = gratis al completar, `true` = necesita puntos + compras |

### Tabla `recompensa_progreso`

Tracking de compras acumuladas por usuario por recompensa:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID PK | Identificador |
| usuario_id | UUID FK | Cliente |
| recompensa_id | UUID FK | Recompensa tipo N+1 |
| negocio_id | UUID FK | Negocio |
| compras_acumuladas | INTEGER | Contador actual |
| desbloqueada | BOOLEAN | Si alcanzó N |
| desbloqueada_at | TIMESTAMPTZ | Cuándo se desbloqueó |
| canjeada | BOOLEAN | Si ya canjeó (ciclo completado) |
| canjeada_at | TIMESTAMPTZ | Cuándo se canjeó |

### Flujo completo

1. Comerciante crea recompensa tipo "Por compras frecuentes" (N=5) en BS Puntos
2. Cliente compra → cajero selecciona tarjeta de sellos en ScanYA → `otorgarPuntos()`
3. `otorgarPuntos()` incrementa `comprasAcumuladas` en `recompensa_progreso` (+1 por venta)
4. Si alcanza N → marca `desbloqueada=true`, notifica al usuario "¡Recompensa desbloqueada!"
5. Cliente entra a CardYA → ve tarjeta "¡Completada!" → canjea manualmente
6. Si `requiere_puntos=false` → canje gratis (constraint BD: `puntos_usados >= 0`)
7. Al canjear: genera voucher + resetea progreso (`canjeada=true`, `comprasAcumuladas=0`, `desbloqueada=false`)
8. Cliente presenta voucher en negocio → negocio valida en ScanYA
9. Siguiente compra con sello → detecta `canjeada=true` → resetea a 0 y empieza nuevo ciclo

### Revocación de ventas con sello

La tabla `puntos_transacciones` tiene columna `recompensa_sellos_id` (UUID nullable) que registra qué tarjeta de sellos se usó. Al revocar una transacción:
- Se decrementa `comprasAcumuladas` en `recompensa_progreso` (mínimo 0)
- Se marca `desbloqueada=false` para evitar desbloqueos falsos

### Cancelación de voucher de sellos

Al cancelar un voucher generado por tarjeta de sellos:
- Se restaura `desbloqueada=true`, `canjeada=false`
- Se restaura `comprasAcumuladas` al número requerido
- El cliente puede volver a canjear sin perder su progreso

### UI

**Business Studio (BS Puntos):** Modal crear/editar recompensa con tipo "Por compras frecuentes", campo N compras, toggle gratis
**CardYA:** Card con progreso (X/Y), checks verdes, 🎁 animado (bounce), botón "¡Canjear gratis!"
**ScanYA:** Sección "Tarjeta de Sellos" en ModalRegistrarVenta, pantalla de éxito muestra progreso o "¡Tarjeta completada!"
**Vouchers gratis:** Se distinguen con texto "Gratis" en verde en vez de "0 pts" en cards, tabla y modales

### Mecanismo de desbloqueo (unificado)

El desbloqueo ocurre **únicamente** en `otorgarPuntos()` de `scanya.service.ts` cuando el operador selecciona explícitamente la tarjeta de sellos (`recompensaSellosId`). La función `verificarRecompensasDesbloqueadas()` en `puntos.service.ts` está **deprecated** — usaba un conteo absoluto de transacciones que podía divergir del conteo incremental por sellos.

### Archivos relevantes

- Backend: `apps/api/src/services/scanya.service.ts` → `otorgarPuntos()` (incremento sellos + transacción atómica)
- Backend: `apps/api/src/services/cardya.service.ts` → `generarVoucher()` (canje + reset), `cancelarVoucher()` (restauración progreso)
- Backend: `apps/api/src/services/puntos.service.ts` → `revocarTransaccion()` (decremento sellos), `obtenerProgresoRecompensas()`
- Frontend: `apps/web/src/pages/private/cardya/componentes/CardRecompensaCliente.tsx` → UI tarjeta sellos
- Frontend: `apps/web/src/components/scanya/ModalRegistrarVenta.tsx` → selección tarjeta + pantalla éxito
- Schema: `apps/api/src/db/schemas/schema.ts` → tablas `recompensa_progreso`, `puntos_transacciones.recompensa_sellos_id`

---

## 🔔 Notificaciones emitidas por CardYA

> Todas las notificaciones de CardYA son eventos a nivel negocio (`sucursalId: null`) y se reparten a dueño + gerentes por fan-out.

| Evento | Tipo | `sucursalId` | Destinatarios |
|--------|------|--------------|---------------|
| Voucher generado (pendiente de entrega) | `voucher_pendiente` | `null` | Dueño + todos los gerentes del negocio |
| Stock de recompensa bajo | `stock_bajo` | `null` | Dueño + todos los gerentes del negocio |
| Stock de recompensa agotado | `stock_agotado` | `null` | Dueño + todos los gerentes del negocio |

**¿Por qué `sucursalId: null`?**
- Las recompensas se definen a nivel negocio, no por sucursal. El stock es global.
- Los vouchers se canjean en cualquier sucursal del mismo negocio (ver `docs/arquitectura/Promociones.md` §10).
- Mantener estas notificaciones "pegadas" a una sucursal sería una decisión arbitraria.

**Fan-out a gerentes:** `generarVoucher` consulta `usuarios WHERE negocio_id = X AND sucursal_asignada IS NOT NULL` y crea una copia de la notificación por cada gerente. Así el gerente de cualquier sucursal ve el voucher pendiente y puede canjearlo.

**Limpieza al canjear:** Al validar el voucher en ScanYA (`validarVoucher`), se eliminan las notificaciones `voucher_pendiente` con `referencia_id = voucherId` (ver `docs/arquitectura/ScanYA.md`). Evita que el panel quede con recordatorios obsoletos.

### Fix defensivo: `cancelarVoucher`

Al cancelar un voucher (cliente arrepentido antes del canje), se restaura el progreso de la recompensa y se resta `puntos_usados` al contador `puntos_canjeados_total` de la billetera:

```typescript
puntosCanjeadosTotal: sql`GREATEST(${puntosBilletera.puntosCanjeadosTotal} - ${v.puntosUsados}, 0)`,
```

**Por qué `GREATEST(..., 0)`:** el check constraint de la columna exige `>= 0`. En billeteras legacy, el `puntos_canjeados_total` almacenado puede ser menor que la suma real de vouchers canjeados (inconsistencias históricas). Sin `GREATEST`, la resta rompe el constraint. El clamp a 0 es seguro: un total negativo no tiene sentido semántico.

Ver `docs/estandares/LECCIONES_TECNICAS.md` → sección "SQL y Base de Datos".

---

## 🏗️ Decisiones Arquitectónicas

### 1. ¿Por qué billeteras separadas por negocio?

**Alternativa descartada:** Puntos universales (saldo único)
```
Usuario tiene 10,000 puntos → puede gastar en cualquier negocio
❌ Problema: ¿Quién paga el costo de la recompensa?
```

**Decisión elegida:** Billeteras separadas
```
Usuario tiene:
- 5,000 pts en Taquería → solo canjea en Taquería
- 3,000 pts en Farmacia → solo canjea en Farmacia
✅ Cada negocio "paga" solo sus propias recompensas
```

**Razón:** Modelo de negocio sostenible. Cada negocio financia su programa de lealtad.

---

### 2. ¿Por qué vouchers y no canje directo?

**Alternativa descartada:** Canje instantáneo
```
Cliente canjea → automáticamente "recibe" recompensa
❌ Problema: ¿Cómo verifica el negocio?
```

**Decisión elegida:** Sistema de vouchers
```
Cliente canjea → genera voucher con QR → presenta en tienda → empleado valida
✅ Control físico de entrega
✅ Auditoría de quién entregó qué
✅ Flexibilidad (canjear en cualquier sucursal)
```

---

### 3. ¿Por qué sucursalId NULL en voucher?

**Decisión:** El voucher se genera SIN sucursal asignada.

**Razón:** 
- Cliente puede canjear en CUALQUIER sucursal del negocio
- La sucursal se asigna al momento del canje físico
- Permite flexibilidad total para el cliente

---

### 4. ¿Por qué nivel basado en puntosAcumuladosTotal?

**Alternativa descartada:** Nivel basado en puntos disponibles
```
Si cliente canjea todos sus puntos → baja de nivel
❌ Problema: Desincentiva canjear, frustra al usuario
```

**Decisión elegida:** Nivel basado en acumulados históricos
```
Cliente ha ganado 5,000 pts lifetime → es Oro
Aunque tenga 0 puntos disponibles → sigue siendo Oro
✅ Premia la fidelidad total, no el saldo actual
```

---

## 📚 Referencias

### Documentos Relacionados

- `ARQUITECTURA_Business_Studio.md` → Configuración de puntos desde BS
- `ARQUITECTURA_ScanYA.md` → Otorgar puntos y validar vouchers
- `Socket_io_Sistema_Notificaciones.md` → Notificaciones de puntos/vouchers

### Archivos de Código

**Backend:**
- `/apps/api/src/services/cardya.service.ts`
- `/apps/api/src/routes/cardya.routes.ts`
- `/apps/api/src/controllers/cardya.controller.ts`
- `/apps/api/src/types/cardya.types.ts`
- `/apps/api/src/validations/cardya.schema.ts` 

**Frontend:**
- `apps/web/src/pages/private/cardya/PaginaCardYA.tsx`
- `apps/web/src/hooks/queries/useCardYA.ts` (React Query hooks)
- `apps/web/src/services/cardyaService.ts`
- `apps/web/src/types/cardya.ts`


---

## ✅ Verificación

**Última verificación:** 12 Febrero 2026

**Backend verificado:**
- ✅ 8 endpoints funcionando
- ✅ Validaciones Zod en schemas
- ✅ Service con ~600 líneas
- ✅ Integración con notificaciones

**Frontend verificado:**
- ✅ 10 componentes implementados
- ✅ Store Zustand con optimistic updates
- ✅ Deep linking desde notificaciones
- ✅ Efecto glow en recompensas destacadas

**Integraciones verificadas:**
- ✅ ScanYA → otorga puntos correctamente
- ✅ ScanYA → valida vouchers correctamente
- ✅ Notificaciones → llegan al cliente
- ✅ Widget sidebar → muestra datos reales

---

**Última actualización:** 7 Abril 2026 
**Autor:** Equipo AnunciaYA  
**Versión:** 1.0 (100% Implementado)
