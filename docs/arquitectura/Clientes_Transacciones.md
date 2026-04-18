# 📊 Documentación Completa: Módulos Clientes y Transacciones
## Business Studio - AnunciaYA v3.0

**Versión:** 3.2
**Fase:** 5.8
**Fecha:** 17 Abril 2026 (última actualización — filtro de cancelados en historial + paleta unificada de badges)
**Chats de referencia:** Chat#6.73, Chat#6.62, Chat#6.63, Chat#6.74, Chat#6.75, Chat#6.76

---

## 📑 Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura General](#2-arquitectura-general)
3. [Módulo Transacciones — Tab Ventas](#3-módulo-transacciones)
4. [Módulo Transacciones — Tab Canjes (Vouchers)](#35-tab-canjes-vouchers)
5. [Módulo Clientes](#4-módulo-clientes)
6. [Backend - Estructura Completa](#5-backend---estructura-completa)
7. [Frontend - Estructura Completa](#6-frontend---estructura-completa)
8. [Tipos TypeScript](#7-tipos-typescript)
9. [Endpoints API](#8-endpoints-api)
10. [Decisiones Técnicas](#9-decisiones-técnicas)
11. [Testing y Verificación](#10-testing-y-verificación)

---

## 1. Resumen Ejecutivo

### Propósito
Los módulos **Clientes** y **Transacciones** forman parte del sistema de lealtad (CardYA) dentro de Business Studio. Permiten a los dueños y gerentes de negocios gestionar su base de clientes y monitorear las transacciones de puntos.

### Alcance
- **Transacciones — Tab Ventas:** Historial completo de ventas con puntos, KPIs, filtros por periodo/operador/estado, búsqueda por nombre o teléfono, exportación Excel (ExcelJS) y revocación con motivo
- **Transacciones — Tab Canjes:** Historial de vouchers canjeados por clientes, KPIs (pendientes/usados/vencidos), filtros por periodo/estado/búsqueda, modal de detalle por estado
- **Clientes:** Base de clientes con niveles (Bronce/Plata/Oro), KPIs, filtros, búsqueda y detalle individual

### Permisos
| Rol | Transacciones | Clientes |
|-----|---------------|----------|
| **Dueño** | Todas las sucursales + exportar Excel | Todos los clientes |
| **Gerente** | Solo su sucursal asignada + exportar Excel | Solo clientes de su sucursal |

---

## 2. Arquitectura General

### Estructura de Archivos

```
apps/
├── api/src/
│   ├── controllers/
│   │   ├── clientes.controller.ts      # 5 controllers
│   │   └── transacciones.controller.ts # 7 controllers (5 ventas + 2 canjes)
│   ├── routes/
│   │   ├── clientes.routes.ts          # 5 rutas
│   │   └── transacciones.routes.ts     # 7 rutas (5 ventas + 2 canjes)
│   ├── services/
│   │   ├── clientes.service.ts         # 4 funciones
│   │   ├── puntos.service.ts           # Historial, KPIs, operadores, revocar
│   │   └── transacciones.service.ts    # KPIs canjes, historial canjes
│   └── types/
│       └── puntos.types.ts             # Tipos compartidos
│
└── web/src/
    ├── pages/private/business-studio/
    │   ├── clientes/
    │   │   ├── PaginaClientes.tsx
    │   │   └── ModalDetalleCliente.tsx      # ~500 líneas
    │   └── transacciones/
    │       ├── PaginaTransacciones.tsx       # ~1540 líneas (Ventas + Canjes)
    │       ├── ModalDetalleTransaccionBS.tsx # ~470 líneas (detalle venta)
    │       └── ModalDetalleCanjeBS.tsx       # ~375 líneas (detalle voucher) ← NUEVO
    ├── services/
    │   ├── clientesService.ts          # 5 funciones
    │   └── transaccionesService.ts     # 9 funciones (6 ventas + 3 canjes)
    ├── stores/
    │   ├── useClientesStore.ts         # Estado + acciones
    │   └── useTransaccionesStore.ts    # Estado + acciones (Ventas + Canjes)
    └── types/
        ├── puntos.ts                   # TransaccionPuntos, PeriodoEstadisticas (compartidos)
        ├── transacciones.ts            # KPIsTransacciones, KPIsCanjes, VoucherCanje
        └── clientes.ts                 # KPIsClientes, ClienteCompleto, ClienteDetalle, NivelCardYA
```

> **NOTA:** En el **backend** todos los tipos viven en `puntos.types.ts`. En el **frontend** están separados: `puntos.ts` (TransaccionPuntos, PeriodoEstadisticas, compartidos), `transacciones.ts` (KPIsTransacciones), `clientes.ts` (KPIsClientes, ClienteCompleto, ClienteDetalle, NivelCardYA).

### Patrón de Comunicación

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐     ┌─────────────┐
│   Página    │ ──▶ │   React Query    │ ──▶ │   Service   │ ──▶ │  Backend    │
│  (React)    │     │  (TanStack v5)   │     │   (Axios)   │     │  (Express)  │
└─────────────┘     └──────────────────┘     └─────────────┘     └─────────────┘
       │                     │                      │                   │
       │  useQuery/          │  queryFn()           │  GET /api/...     │
       │  useInfiniteQuery   │  ─────────────▶      │  ────────────▶    │
       │  ────────────▶      │                      │                   │
       │                     │  caché automático    │  respuesta        │
       │  { data, isLoading }│  ◀─────────────      │  ◀────────────    │
       │  ◀────────────      │                      │                   │
```

**Estado UI** (filtros, tab activo, elemento seleccionado) → Zustand (stores)
**Datos del servidor** (KPIs, historial, listas) → React Query (hooks en `hooks/queries/`)

### Interceptor de Sucursal

El interceptor Axios agrega automáticamente `?sucursalId=` en modo comercial:

```typescript
// apps/web/src/services/api.ts
api.interceptors.request.use((config) => {
  const { usuario } = useAuthStore.getState();
  if (usuario?.modoActivo === 'comercial' && usuario?.sucursalActiva) {
    config.params = {
      ...config.params,
      sucursalId: usuario.sucursalActiva,
    };
  }
  return config;
});
```

**Implicación:** Los services del frontend NUNCA pasan `sucursalId` manualmente.

---

## 3. Módulo Transacciones

### 3.1 PaginaTransacciones - Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ⬡ Transacciones                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────┬───────────┬───────────┬───────────┐                           │
│  │  $45,230  │    156    │   $290    │     3     │  ← 4 KPIs                │
│  │  Ventas   │ Transacc. │  Ticket   │ Revocadas │                           │
│  └───────────┴───────────┴───────────┴───────────┘                           │
├──────────────────────────────────────────────────────────────────────────────┤
│  [Hoy][Semana][Mes][3 Meses][Año][Todo]  🔍 Nombre o teléfono... [✕]        │
│  [👤 Operador ▾]  [Todas|Válidas|Revocadas]  [⬇ Excel]                      │
│  20 de 48 resultados                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│  │ Cliente      │ Concepto │ Monto ↕ │ Puntos ↕ │ Estado │ Fecha ↕        │ │
│  ├──────────────┼──────────┼─────────┼──────────┼────────┼────────────────┤ │
│  │ Juan Pérez   │ 2 Camisas│ $150.00 │ +15 pts  │  ✓     │ Hoy 2:30pm    │ │
│  │ Ana López    │ —        │ $280.00 │ +42 pts  │  ✓     │ Ayer 10am     │ │
│  │ ~~Pedro~~    │ ~~Café~~ │ ~~$50~~ │ ~~+5~~   │  ✕     │ ~~3 días~~    │ │ ← Revocada
│  └──────────────┴──────────┴─────────┴──────────┴────────┴────────────────┘ │
│                                                          [Cargar más]        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 KPIs de Transacciones

| KPI | Descripción | Cálculo |
|-----|-------------|---------|
| **Total Ventas** | Suma de montos de transacciones confirmadas | `SUM(monto_compra WHERE estado='confirmado')` |
| **# Transacciones** | Cantidad de transacciones confirmadas | `COUNT(*) WHERE estado='confirmado'` |
| **Ticket Promedio** | Promedio por compra | `AVG(monto_compra WHERE estado='confirmado')` |
| **Revocadas** | Transacciones canceladas (rojo) | `COUNT(*) WHERE estado='cancelado'` |

**Los KPIs reaccionan al cambio de periodo** (Hoy/Semana/Mes/3 Meses/Año/Todo).

### 3.3 Columnas de la Tabla

| Columna | Dato | Ordenable | Notas |
|---------|------|:---------:|-------|
| Cliente | Avatar + Nombre + Teléfono | ❌ | Click abre modal. Tel formateado: `+52 644 1234567` |
| Concepto | Texto libre | ❌ | "—" si vacío |
| Monto | $150.00 | ✅ | Formato moneda MXN |
| Puntos | +15 pts | ✅ | Con signo + |
| Estado | ✓ verde / ✕ rojo | ❌ | Revocadas con strikethrough en toda la fila |
| Fecha | Relativa | ✅ | "Hace 2 hrs", "Ayer 3pm" |

### 3.4 Filtros

| Filtro | Tipo | Ubicación | Comportamiento |
|--------|------|-----------|----------------|
| **Periodo** | Tabs (6 opciones) | Fila superior | Recarga KPIs + historial |
| **Búsqueda** | Input con debounce 400ms | Junto a periodo | Backend filtra por nombre O teléfono. Botón ✕ para limpiar |
| **Operador** | Dropdown custom | Fila inferior | Lista operadores con badges: Empleado (azul), Gerente (morado), Dueño (ámbar) |
| **Estado** | Toggle pills | Fila inferior | Todas (gris) / Válidas (verde) / Revocadas (rojo) |

### 3.5 Funcionalidades

- **Filtro por periodo:** Tabs que actualizan KPIs + historial simultáneamente
- **Búsqueda backend:** Por nombre o teléfono del cliente con debounce 400ms. Botón ✕ para limpiar
- **Filtro por operador:** Dropdown custom con lista de empleados/gerentes/dueños que han registrado ventas
- **Filtro por estado:** Toggle Todas/Válidas/Revocadas
- **Ordenamiento:** Click en header → desc → asc → null (ciclo de 3 estados)
- **Paginación:** Scroll infinito en móvil / Botón "Cargar más" en desktop. Contador real: "20 de 48 resultados"
- **Exportar Excel:** Descarga archivo .xlsx profesional con ExcelJS (headers con color, anchos de columna, formatos)
- **Revocar:** Desde el modal de detalle, con motivo obligatorio

### 3.6 ModalDetalleTransaccionBS

```
┌─────────────────────────────────────────┐
│ ╔═══════════════════════════════════╗    │
│ ║ 📋 Detalle de Transacción   Monto║    │  ← Header con gradiente
│ ║    ✓ Confirmada            $250  ║    │     verde/ámbar/rojo según estado
│ ╚═══════════════════════════════════╝    │
│                                         │
│  👤 Juan Valencia            [ChatYA]   │  ← Nombre + tel formateado + icono ChatYA
│     +52 638 1128286                     │
│                                         │
│  ⭐ Puntos otorgados                    │
│     +49 pts  ×1.2                       │  ← Multiplicador como badge inline
│                                         │
│  💲 Concepto                            │
│     2 Camisas Manga Larga              │
│                                         │
│  👤 Registró venta    📍 Sucursal       │  ← Grid 2 columnas (1 fila)
│  Juan Manuel V...     Imprenta FindUS  │
│                                         │
│  🕐 Fecha y hora                        │
│     lunes, 16 de febrero de 2026...    │
│                                         │
│  📝 Nota                  Nº orden      │  ← Grid 2 columnas (si existen)
│     Debe $50 pesos        #1234        │
│                                         │
│  💳 Métodos de pago                     │
│  ┌──────────┬──────────┬──────────┐     │  ← Chips con color
│  │💵$100.00 │💳$100.00 │⇆ $50.00 │     │     Verde/Azul/Violeta
│  └──────────┴──────────┴──────────┘     │
│                                         │
│  [ 📷 Ver foto del ticket ]             │  ← Botón expandible (lazy load)
│                                         │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│  │  ⚠️ Revocar transacción         │    │  ← Solo estado confirmado
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                         │
│  ┌─────────────────────────────────┐    │  ← Solo estado cancelado
│  │ ✕ Transacción revocada          │    │
│  │   Motivo: Artículo devuelto     │    │
│  │   Puntos devueltos al cliente.  │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Campos del modal:**

| Campo | Siempre visible | Condición |
|-------|:-:|---|
| Cliente + Teléfono | ✅ | Teléfono solo si existe |
| ChatYA (icono) | — | Solo si hay teléfono. Abre ChatYA (TODO: integrar) |
| Puntos + Multiplicador | ✅ | Multiplicador solo si > 1 |
| Concepto | — | Solo si tiene concepto |
| Registró venta + Sucursal | — | Grid 2 columnas. JOIN a través de `scanya_turnos` |
| Fecha y hora | ✅ | Formato largo: "lunes, 16 de febrero..." |
| Nota + Nº orden | — | Solo si existen |
| Métodos de pago | — | Solo si algún monto > 0 |
| Foto del ticket | — | Botón lazy, click expande. Click en imagen abre en nueva pestaña |
| Revocar | — | Solo estado `confirmado` |
| Info revocación | — | Solo estado `cancelado`. Muestra motivo si existe |

---

## 3.5 Tab Canjes (Vouchers)

### 3.5.1 Toggle Ventas/Canjes

El módulo Transacciones tiene 2 tabs accesibles mediante un toggle en el header:
- **Ventas** (gradiente slate oscuro): Puntos otorgados por compras
- **Canjes** (gradiente azules): Vouchers generados al canjear recompensas

El toggle cambia: KPIs, filtros disponibles, tabla/lista, y modal de detalle.

**Desktop:** Toggle al lado del título, centrado verticalmente respecto a título + subtítulo.  
**Móvil:** Toggle debajo del título, reemplaza el subtítulo.

### 3.5.2 KPIs de Canjes

| KPI | Descripción | Color |
|-----|-------------|-------|
| **Pendientes** | Vouchers sin canjear | Ámbar |
| **Usados** | Vouchers canjeados exitosamente | Verde |
| **Vencidos** | Vouchers expirados sin canjear | Rojo |
| **Total Canjes** | Suma de todos los vouchers | Azul |

### 3.5.3 Columnas de la Tabla (6 columnas)

| Columna | Dato | Ordenable | Notas |
|---------|------|:---------:|-------|
| Cliente | Avatar + Nombre + Teléfono | ❌ | Click abre modal |
| Recompensa | Thumbnail + Nombre | ❌ | Imagen del catálogo si existe |
| Puntos | -550 | ✅ | Con signo negativo, color ámbar |
| Estado | Badge | ❌ | Pendiente (ámbar+Hourglass), Usado (sky+CheckCircle), Vencido (amber+AlertCircle). Paleta unificada con Promociones (ver `docs/arquitectura/Promociones.md` §7.2) |
| Expira | Fecha/días | ✅ | Siempre muestra expiración. Urgencia: rojo ≤3 días, amber ≤7 días |
| Canjeado | Fecha de uso | ❌ | ✓ verde con fecha si fue usado, "—" si no |

### 3.5.4 Filtros Tab Canjes

| Filtro | Tipo | Notas |
|--------|------|-------|
| **Periodo** | Tabs (6 opciones) | Mismo que Ventas, periodos activos en `bg-blue-600` |
| **Búsqueda** | Input con debounce 400ms | Por nombre o teléfono del cliente |
| **Estado** | Toggle pills | Todos / Pendientes / Usados / Vencidos |

**No incluye:** Filtro por operador ni exportar Excel (solo aplican a Ventas).

### 3.5.5 Política de visibilidad — vouchers cancelados

> **Agregado:** 17 Abril 2026

Los vouchers con `estado = 'cancelado'` **no aparecen en el historial** de Tab Canjes. El backend (`obtenerCanjesVouchers` en `transacciones.service.ts`) filtra con una condición base `estado != 'cancelado'`.

**Rationale:**
- Los cancelados son "arrepentimientos" del cliente antes del canje — se generan cuando el cliente desde CardYA cancela un voucher que aún no había usado
- No representan acción pendiente, canje real ni vencimiento → no aportan valor operativo
- Mantenerlos desincronizaba el conteo con los KPIs (que solo suman pendientes/usados/vencidos): tabla decía "15 vouchers" pero KPIs sumaban 7

**Qué se conserva:**
- El tipo TypeScript `VoucherCanje['estado']` sigue incluyendo `'cancelado'`
- El componente `BadgeEstadoCanje` lo renderiza (rojo + XCircle) con fallback defensivo
- Esto permite que futuros contextos (modal de detalle del cliente, auditoría, reportes avanzados) puedan mostrar vouchers cancelados sin que la UI reviente

**Dónde se cancela:** `cancelarVoucher` en `cardya.service.ts` (línea 859 aprox) — el cliente desde CardYA, antes de canjear en ScanYA. Ver `docs/arquitectura/CardYA.md` sección "Fix defensivo: cancelarVoucher".

### 3.5.5 ModalDetalleCanjeBS

```
┌─────────────────────────────────────────┐
│ ╔═══════════════════════════════════╗    │  ← Header con gradiente según estado:
│ ║ 🎁 Detalle de Canje      Puntos ║    │     Pendiente: azul (#1e40af → #2563eb)
│ ║    ⏳ Pendiente de canje   -1000 ║    │     Usado: verde (#064e3b → #065f46)
│ ╚═══════════════════════════════════╝    │     Vencido: rojo (#7f1d1d → #991b1b)
│                                         │
│  👤 Ian Manuel Valenzuela    [ChatYA]   │  ← Avatar + nombre + tel + ChatYA
│     +52 644 1234567                     │
│                                         │
│  🎁 Recompensa canjeada                │  ← Imagen + nombre + descripción
│     Pizza Mediana                       │
│     Masa artesanal con queso            │
│                                         │
│  ⭐ Puntos utilizados                  │
│     -1000 pts                           │
│                                         │
│  📅 Fecha de solicitud                 │
│     sábado, 14 de febrero de 2026...   │
│                                         │
│  🕐 Expiración                         │
│     10 de abril de 2026                │
│     Vence en 52 días                   │  ← Indicador urgencia (rojo si ≤7 días)
│                                         │
│  👤 Validó canje     📍 Sucursal       │  ← Solo estado "usado" + tieneSucursales
│  carlos               Imprenta FindUS  │
│                                         │
│  ✓ Canjeado el                         │  ← Solo estado "usado"
│     miércoles, 11 de febrero, 3:42pm  │
│                                         │
│  ┌─────────────────────────────────┐    │  ← Mensaje según estado
│  │ ⏳ Voucher pendiente de canje   │    │     Pendiente: azul
│  │ ✓  Voucher canjeado exitosamente│    │     Usado: verde
│  │ ⚠  Voucher vencido              │    │     Vencido: rojo
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

**Campos del modal:**

| Campo | Condición |
|-------|-----------|
| Cliente + Teléfono + ChatYA | Siempre. Teléfono y ChatYA solo si existe tel |
| Recompensa (imagen + nombre + desc) | Siempre. Imagen solo si existe |
| Puntos utilizados | Siempre |
| Fecha de solicitud | Siempre (createdAt) |
| Expiración + días restantes | Solo si existe expiraAt. Indicador urgencia solo en "pendiente" |
| Validó canje + Sucursal | Solo estado "usado". Sucursal solo si `totalSucursales > 1` |
| Canjeado el (fecha uso) | Solo estado "usado" |
| Mensaje informativo | Siempre. Texto y color según estado |

**Mensajes por estado:**
- **Pendiente:** "El cliente puede presentar este voucher en cualquier sucursal para reclamar su recompensa."
- **Usado:** "La recompensa fue entregada al cliente."
- **Vencido:** "Este voucher expiró sin ser canjeado. Los puntos fueron devueltos al saldo del cliente."

### 3.5.6 Condición de Sucursales en Modales

Ambos modales (Ventas y Canjes) leen `totalSucursales` del `useAuthStore`:
- **`totalSucursales > 1`** → Muestra fila de Sucursal (grid 2 columnas: Operador | Sucursal)
- **`totalSucursales === 1`** → Oculta Sucursal, Operador ocupa toda la fila

Este dato se carga en background al hacer login/hidratar desde `obtenerSucursalesNegocio().length`.

---

## 4. Módulo Clientes

### 4.1 PaginaClientes - Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  👥 Clientes                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────┬───────────────────────┬───────────┬───────────┐          │
│  │    89     │  🟤52  ⚪28  🟡9      │    12     │    15     │  ← KPIs  │
│  │   Total   │   Distribución        │  Nuevos   │ Inactivos │          │
│  └───────────┴───────────────────────┴───────────┴───────────┘          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Todos] [🟤Bronce] [⚪Plata] [🟡Oro]    🔍 Buscar nombre/teléfono...    │
├─────────────────────────────────────────────────────────────────────────┤
│  │ Cliente      │ Nivel  │ Puntos ↕ │ Visitas ↕ │ Últ. Actividad ↕    │ │
│  ├──────────────┼────────┼──────────┼───────────┼─────────────────────┤ │
│  │ Juan Pérez   │ 🟡 Oro │ 5,200    │    24     │ Hoy                 │ │
│  │ Ana López    │ ⚪Plata│ 1,850    │    12     │ Hace 3 días         │ │
│  │ Pedro García │ 🟤Bron │   320    │     5     │ 15 Ene              │ │
│  └──────────────┴────────┴──────────┴───────────┴─────────────────────┘ │
│                                                    [Cargar más]          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 KPIs de Clientes

| KPI | Descripción | Cálculo |
|-----|-------------|---------|
| **Total Clientes** | Clientes con billetera activa | `COUNT(puntos_billetera)` |
| **Distribución** | Por nivel CardYA | Bronce/Plata/Oro counts |
| **Nuevos este mes** | Registrados este mes | `WHERE created_at >= inicio_mes` |
| **Inactivos** | Sin actividad 30+ días | `WHERE ultima_actividad < hace_30_días` |

### 4.3 Columnas de la Tabla

| Columna | Dato | Ordenable | Notas |
|---------|------|:---------:|-------|
| Cliente | Avatar + Nombre + Tel (últimos 4) | ❌ | Click abre modal |
| Nivel | Badge con color | ❌ | 🟤🟤🟡 |
| Puntos | Disponibles | ✅ | Formato 5,200 |
| Visitas | Total de presencias físicas del cliente | ✅ | Ver §4.6 "Cálculo de Visitas" |
| Últ. Actividad | Fecha relativa | ✅ | "Hoy", "Hace 3 días" |

### 4.6 Cálculo de "Visitas" (unificado tabla + modal + export)

> **Agregado:** 17 Abril 2026

El conteo de visitas del cliente debe reflejar cuántas veces el cliente estuvo físicamente en el negocio. Aplica el mismo criterio en los 3 puntos donde se muestra: tabla principal (`listarClientes`), modal detalle (`obtenerDetalleCliente`) y export Excel (`obtenerClientesParaExportar`).

**Fórmula:**

```
totalVisitas =
  COUNT(puntos_transacciones WHERE estado='confirmado' AND sucursal_id = X?)
  +
  COUNT(vouchers_canje WHERE estado='usado' AND sucursal_id = X?)
```

**Qué se cuenta:**

| Interacción | ¿Entra en `puntos_transacciones`? | ¿Cuenta como visita? |
|---|---|---|
| Venta con puntos confirmada | ✅ `estado='confirmado'` | ✅ Sí |
| Venta + cupón aplicado | ✅ `estado='confirmado'` con `oferta_uso_id` | ✅ Sí |
| Cupón gratis (sin compra) | ✅ `estado='confirmado'` con `monto=0` | ✅ Sí |
| **Canje puro de voucher** (cliente solo reclama recompensa) | ❌ NO genera tx | ✅ Sí — contado desde `vouchers_canje` |
| Venta **revocada** por dueño/gerente | ✅ pero `estado='revocado'` | ❌ NO cuenta (operación anulada) |
| Venta **pendiente** de confirmación del cliente | ✅ pero `estado='pendiente'` | ❌ NO cuenta aún (solo al confirmarse) |
| Voucher **cancelado** por cliente antes de canjear | En `vouchers_canje` con `estado='cancelado'` | ❌ NO cuenta (nunca se realizó) |

**Filtro de sucursal:**
- Si la request trae `sucursalId` (interceptor Axios en modo comercial): ambos contadores filtran por esa sucursal
- Si no trae `sucursalId`: agregación global del negocio
- **Tabla, modal y export** aplican el mismo filtro → consistencia visual garantizada

**Rationale del diseño:**
- Un **canje puro de voucher** es una visita genuina: el cliente fue al negocio a reclamar su recompensa. Antes quedaba fuera porque `validarVoucher` solo actualiza `vouchers_canje`, no inserta en `puntos_transacciones`.
- Las **transacciones revocadas** no cuentan porque la operación fue anulada (fraude, error de captura). Si las contáramos, infláríamos la frecuencia del cliente con eventos que no ocurrieron en la realidad.
- Las **pendientes** no cuentan hasta que el cliente confirme — es el estado previo a la visita "completa" desde la perspectiva de negocio.
- El **modal detalle** acepta ahora `sucursalId` como parámetro opcional. Antes era global del negocio y generaba inconsistencia con la tabla (gerente veía 3 visitas en tabla y 7 en modal). Ahora ambos coinciden.

**Archivos afectados:**
- `apps/api/src/services/clientes.service.ts` → 3 queries (`listarClientes`, `obtenerDetalleCliente`, `obtenerClientesParaExportar`)
- `apps/api/src/controllers/clientes.controller.ts` → `obtenerDetalleClienteController` lee `req.query.sucursalId` y lo pasa al service

---

### 4.4 Funcionalidades

- **Filtro por nivel:** Chips Todos/Bronce/Plata/Oro
- **Búsqueda:** Por nombre o teléfono con debounce 400ms
- **Ordenamiento:** Click en header → desc → asc → null
- **Paginación:** Botón "Cargar más" desktop / Infinite scroll mobile
- **Detalle:** Click en fila abre modal con KPIs e historial

### 4.5 ModalDetalleCliente (Implementado ✅)

```
┌─────────────────────────────────────────┐
│ ╔═══════════════════════════════════╗   │
│ ║ 👤 Ian Manuel Valenzuela  [Plata]║   │  ← Header gradiente azul
│ ║    📞 +52 644 123 4567   [ChatYA]║   │     Badge nivel + logo ChatYA
│ ║    📧 correo@test.com • Desde 2026║   │
│ ╚═══════════════════════════════════╝   │
│                                         │
│  ⭐ Puntos                              │
│  ┌─────────┬─────────┬─────────┐        │
│  │ 15,946  │ 19,696  │  3,750  │        │  ← 3 cards colores
│  │Disponib.│Acumulad.│Canjeados│        │     verde/azul/violeta
│  └─────────┴─────────┴─────────┘        │
│                                         │
│  Progreso a Oro ─────────────── 98.48%  │  ← Barra color del nivel
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░        │     actual (bronce/plata)
│  Faltan 304 pts para Oro                │
│                                         │
│  ── O si es nivel Oro ──────────────    │
│  ¡Nivel máximo alcanzado! ────── 100%   │  ← Barra dorada 100%
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓        │
│                                         │
│  📊 Estadísticas                        │
│  ┌────────────┬────────────┐            │
│  │💰$15,940.00│📈 $370.70  │            │  ← Grid 2x2
│  │Total Gast. │ Promedio   │            │
│  ├────────────┼────────────┤            │
│  │🛒   43     │🎟️ 8/31    │            │
│  │  Visitas   │  Vouchers  │            │
│  └────────────┴────────────┘            │
│                                         │
│  🕐 Últimas transacciones    20 recient.│
│  ├── $235.00   +57 pts    Hace 5d       │
│  ├── $550.00   +135 pts   Hace 5d       │
│  ├── $250.00   +61 pts    Hace 5d       │
│  └── $2,500.00 +615 pts   9 feb         │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │    Ver historial completo  →    │    │  ← Navega a Transacciones
│  └─────────────────────────────────┘    │     con ?busqueda=NombreCliente
└─────────────────────────────────────────┘
```

**Estructura del modal:**

| Sección | Contenido | Notas |
|---------|-----------|-------|
| **Header** | Avatar + Nombre + Badge nivel + Tel + ChatYA + Correo + Desde | Gradiente azul, fijo |
| **Puntos** | 3 cards: Disponibles/Acumulados/Canjeados | Verde/Azul/Violeta |
| **Progreso** | Barra al siguiente nivel con % y pts faltantes | Usa `configNiveles` del negocio |
| **Nivel máximo** | Si es Oro: "¡Nivel máximo!" + barra dorada 100% | Sin "faltan X pts" |
| **Estadísticas** | 4 cards: Total gastado, Promedio, Visitas, Vouchers | Grid 2x2 |
| **Transacciones** | Lista de últimas 5 transacciones | Monto, puntos, fecha relativa |
| **Ver historial** | Botón que navega a Transacciones filtrado | `?busqueda=NombreCliente` |

**Barra de progreso por nivel:**

| Nivel actual | Color barra | Siguiente nivel |
|--------------|-------------|-----------------|
| Bronce | Amber (café) | Plata |
| Plata | Slate (gris) | Oro |
| Oro | Amarillo 100% | — (máximo) |

**Cálculo de progreso (usa config real del negocio):**

```typescript
// Se obtiene configNiveles del backend en ClienteDetalle
configNiveles: {
  bronceMax: number;    // ej: 999
  plataMin: number;     // ej: 1000
  plataMax: number;     // ej: 19999
  oroMin: number;       // ej: 20000
}

// Cálculo según nivel actual:
if (nivel === 'bronce') {
  porcentaje = (puntosAcumulados / bronceMax) * 100;
  puntosFaltantes = plataMin - puntosAcumulados;
}
if (nivel === 'plata') {
  porcentaje = ((puntosAcumulados - plataMin) / (plataMax - plataMin)) * 100;
  puntosFaltantes = oroMin - puntosAcumulados;
}
if (nivel === 'oro') {
  porcentaje = 100;
  siguienteNivel = null; // Muestra "¡Nivel máximo!"
}
```

**Navegación a historial filtrado:**

```typescript
// Al presionar "Ver historial completo":
navigate(`/business-studio/transacciones?busqueda=${encodeURIComponent(cliente.nombre)}`);

// PaginaTransacciones lee el parámetro:
const [searchParams] = useSearchParams();
const busquedaInicial = searchParams.get('busqueda') || '';
// Aplica setBusqueda(busquedaInicial) al montar
```

---

## 5. Backend - Estructura Completa

### 5.1 Servicios

**puntos.service.ts** — Contiene las funciones de transacciones del negocio:

```typescript
// Ubicación: apps/api/src/services/puntos.service.ts

// obtenerKPIsTransacciones(negocioId, sucursalId?, periodo?)
//   → KPIsTransacciones { totalVentas, totalTransacciones, ticketPromedio, totalRevocadas }

// obtenerHistorialTransacciones(negocioId, sucursalId?, periodo?, limit?, offset?, busqueda?, operadorId?, estado?)
//   → { historial: TransaccionPuntos[], total: number }

// obtenerOperadoresTransacciones(negocioId, sucursalId?)
//   → { id, nombre, tipo }[]
//   Tipo determinado por: sucursalAsignada IS NULL → 'dueño', IS NOT NULL → 'gerente', tabla empleados → 'empleado'

// revocarTransaccion(transaccionId, negocioId, sucursalId?, motivo, revocadoPor)
//   → Cambia estado a 'cancelado', devuelve puntos a billetera del cliente
```

**clientes.service.ts** — Contiene las funciones de clientes:

```typescript
// Ubicación: apps/api/src/services/clientes.service.ts

// obtenerKPIsClientes(negocioId, sucursalId?)
//   → KPIsClientes { totalClientes, distribucionNivel, nuevosEsteMes, inactivos30Dias }

// obtenerClientes(negocioId, sucursalId?, busqueda?, nivel?, limit?, offset?)
//   → ClienteCompleto[]

// obtenerDetalleCliente(negocioId, clienteId)
//   → ClienteDetalle { ...datos completos + vouchers + promedios }

// obtenerHistorialCliente(negocioId, clienteId, limit?, offset?)
//   → TransaccionPuntos[] (mismos campos que historial de transacciones)
```

### 5.2 Controllers

**transacciones.controller.ts** (5 controllers):
- `obtenerKPIsController` → GET /api/transacciones/kpis
- `obtenerHistorialController` → GET /api/transacciones/historial
- `obtenerOperadoresController` → GET /api/transacciones/operadores
- `exportarController` → GET /api/transacciones/exportar
- `revocarTransaccionController` → POST /api/transacciones/:id/revocar

**clientes.controller.ts** (5 controllers):
- `obtenerKPIsController` → GET /api/clientes/kpis
- `obtenerTopClientesController` → GET /api/clientes/top
- `obtenerClientesController` → GET /api/clientes
- `obtenerDetalleClienteController` → GET /api/clientes/:id
- `obtenerHistorialClienteController` → GET /api/clientes/:id/historial

### 5.3 Routes

```typescript
// transacciones.routes.ts - ORDEN IMPORTANTE: estáticas antes que dinámicas
router.use(verificarToken);
router.use(verificarNegocio);

router.get('/kpis', obtenerKPIsController);
router.get('/historial', obtenerHistorialController);
router.get('/operadores', obtenerOperadoresController);
router.get('/exportar', exportarController);
router.post('/:id/revocar', revocarTransaccionController);

// clientes.routes.ts - ORDEN IMPORTANTE: estáticas antes que dinámicas
router.use(verificarToken);
router.use(verificarNegocio);

router.get('/kpis', obtenerKPIsController);
router.get('/top', obtenerTopClientesController);
router.get('/', obtenerClientesController);
router.get('/:id', obtenerDetalleClienteController);
router.get('/:id/historial', obtenerHistorialClienteController);
```

### 5.4 JOIN de Operador (Patrón Técnico Importante)

El campo "Registró venta" se obtiene a través de los **turnos**, NO directo por `empleado_id`:

```
puntosTransacciones
  └── turnoId → scanya_turnos
                  ├── empleadoId → empleados (si fue empleado)
                  └── usuarioId → usuarios u2 (si fue gerente/dueño)
```

**¿Por qué?** `empleado_id` en `puntos_transacciones` es NULL cuando el dueño/gerente registra la venta (solo se llena para empleados). El turno siempre tiene `usuario_id` del que lo abrió.

```sql
-- Query real simplificada
SELECT
  COALESCE(empleados.nombre, CONCAT(u2.nombre, ' ', u2.apellidos)) AS empleado_nombre,
  CASE
    WHEN empleados.id IS NOT NULL THEN 'empleado'
    WHEN u2.id IS NOT NULL THEN 'usuario'
  END AS empleado_tipo
FROM puntos_transacciones pt
LEFT JOIN empleados ON pt.empleado_id = empleados.id
LEFT JOIN scanya_turnos ON pt.turno_id = scanya_turnos.id
LEFT JOIN usuarios u2 ON scanya_turnos.usuario_id = u2.id
```

---

## 6. Frontend - Estructura Completa

### 6.1 transaccionesService.ts

```typescript
// Ubicación: apps/web/src/services/transaccionesService.ts

export interface Operador {
  id: string;
  nombre: string;
  tipo: string; // 'empleado' | 'gerente' | 'dueño'
}

// Tab Ventas
export async function getKPIsTransacciones(periodo?: PeriodoEstadisticas);
export async function getHistorial(periodo?, limit?, offset?, busqueda?, operadorId?, estado?);
export async function getOperadores(): Promise<Operador[]>;
export async function revocarTransaccion(id: string, motivo: string);
export async function descargarCSV(periodo?, busqueda?, operadorId?, estado?);

// Tab Canjes
export async function getKPIsCanjes(periodo?: PeriodoEstadisticas);
export async function getHistorialCanjes(periodo?, limit?, offset?, estado?, busqueda?);
```

> **NOTA:** `descargarCSV` ahora recibe filtros (búsqueda, operadorId, estado) para que la exportación respete los filtros activos.

### 6.2 clientesService.ts

```typescript
// Ubicación: apps/web/src/services/clientesService.ts

export async function getTopClientes(limit?: number);
export async function getKPIsClientes();
export async function getClientes(busqueda?, nivel?, limit?, offset?);
export async function getDetalleCliente(id: string);
export async function getHistorialCliente(id: string, limit?, offset?);
```

### 6.3 useTransaccionesStore.ts

> **Migrado a React Query.** Los datos del servidor (KPIs, historial, operadores) ahora viven en `hooks/queries/useTransacciones.ts`. El store de Zustand solo conserva estado UI.

```typescript
// Solo estado de UI — Zustand
interface TransaccionesUIState {
  // Tab activo
  tabActivo: 'ventas' | 'canjes';

  // === VENTAS (filtros UI) ===
  periodo: PeriodoEstadisticas;
  busqueda: string;
  operadorId: string;
  estadoFiltro: string; // '' | 'confirmado' | 'cancelado'

  // === CANJES (filtros UI) ===
  estadoFiltroCanjes: string; // '' | 'pendiente' | 'usado' | 'expirado'
  busquedaCanjes: string;
}

// Acciones UI
setTabActivo(tab)
setPeriodo(periodo)
setBusqueda(busqueda)
setOperadorId(operadorId)
setEstadoFiltro(estado)
setEstadoFiltroCanjes(estado)
setBusquedaCanjes(busqueda)
limpiar()
```

**Hooks React Query** (`hooks/queries/useTransacciones.ts`):
- `useTransaccionesKPIs(periodo)` — staleTime 2min, invalidado tras revocar
- `useTransaccionesHistorial(filtros)` — `useInfiniteQuery` (offset-based), `keepPreviousData`
- `useTransaccionesOperadores()` — staleTime 5min
- `useCanjesKPIs(periodo)` — staleTime 2min
- `useCanjesHistorial(filtros)` — `useInfiniteQuery` (offset-based), `keepPreviousData`
- `useRevocarTransaccion()` — mutation con invalidación de KPIs + historial

### 6.4 useClientesStore.ts

> **Migrado a React Query.** Los datos del servidor (KPIs, lista, detalle, historial) ahora viven en `hooks/queries/useClientes.ts`. El store de Zustand solo conserva filtros UI.

```typescript
// Solo estado de UI — Zustand
interface ClientesUIState {
  busqueda: string;
  nivelFiltro: NivelCardYA | null;
}

// Acciones UI
setBusqueda(busqueda)
setNivelFiltro(nivel)
limpiar()
```

**Hooks React Query** (`hooks/queries/useClientes.ts`):
- `useClientesKPIs()` — staleTime 2min
- `useClientesLista(filtros)` — `useInfiniteQuery` (offset-based), `keepPreviousData`
- `useClienteDetalle(clienteId)` — se activa cuando el modal abre; sin keepPreviousData para no mostrar datos del cliente anterior
- `useClienteHistorial(clienteId)` — top 5 transacciones recientes, staleTime 2min

---

## 7. Tipos TypeScript

### 7.1 TransaccionPuntos (puntos.ts / puntos.types.ts)

```typescript
interface TransaccionPuntos {
  id: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  clienteAvatarUrl: string | null;
  montoCompra: number;
  puntosOtorgados: number;
  multiplicadorAplicado: number;
  estado: 'confirmado' | 'pendiente' | 'cancelado';
  concepto: string | null;
  createdAt: string | null;
  sucursalId: string | null;
  sucursalNombre: string | null;
  empleadoId: string | null;
  empleadoNombre: string | null;
  empleadoTipo: 'empleado' | 'usuario' | null;
  // Campos agregados (Chat#6.74)
  montoEfectivo: number;
  montoTarjeta: number;
  montoTransferencia: number;
  fotoTicketUrl: string | null;
  nota: string | null;
  numeroOrden: string | null;
  motivoRevocacion: string | null;
}
```

> **NOTA:** Estos 7 campos nuevos ya existían en la tabla `puntos_transacciones` del schema. Lo que se hizo fue agregarlos al SELECT de las queries, a la transformación de datos y a los tipos TypeScript.

### 7.2 KPIs

```typescript
interface KPIsTransacciones {
  totalVentas: number;
  totalTransacciones: number;
  ticketPromedio: number;
  totalRevocadas: number;
}

interface KPIsCanjes {
  pendientes: number;
  usados: number;
  vencidos: number;
  totalCanjes: number;
}

interface KPIsClientes {
  totalClientes: number;
  distribucionNivel: {
    bronce: number;
    plata: number;
    oro: number;
  };
  nuevosEsteMes: number;
  inactivos30Dias: number;
}
```

### 7.3 VoucherCanje (transacciones.ts)

```typescript
interface VoucherCanje {
  id: string;
  // Cliente
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  clienteAvatarUrl: string | null;
  // Recompensa
  recompensaNombre: string;
  recompensaDescripcion: string | null;
  recompensaImagenUrl: string | null;
  // Puntos y estado
  puntosUsados: number;
  estado: 'pendiente' | 'usado' | 'expirado';
  // Fechas
  expiraAt: string | null;
  createdAt: string | null;
  usadoAt: string | null;
  // Donde se canjeó (null si pendiente)
  sucursalNombre: string | null;
  usadoPorNombre: string | null;
}
```

### 7.3 Clientes

```typescript
interface ClienteConPuntos {
  usuarioId: string;  // ⚠️ NO es "id", es "usuarioId"
  nombre: string;
  avatarUrl: string | null;
  puntosDisponibles: number;
}

interface ClienteCompleto {
  id: string;
  nombre: string;
  telefono: string | null;
  avatarUrl: string | null;
  puntosDisponibles: number;
  puntosAcumuladosTotal: number;
  nivelActual: string;
  ultimaActividad: string | null;
  totalVisitas: number;
}

interface ClienteDetalle {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  avatarUrl: string | null;
  puntosDisponibles: number;
  puntosAcumuladosTotal: number;
  puntosCanjeadosTotal: number;
  nivelActual: string;
  clienteDesde: string | null;
  ultimaActividad: string | null;
  totalVisitas: number;
  totalGastado: number;
  promedioCompra: number;
  totalVouchers: number;
  vouchersUsados: number;
  // Configuración de niveles del negocio (para calcular progreso real)
  configNiveles: {
    bronceMax: number;
    plataMin: number;
    plataMax: number;
    oroMin: number;
  } | null;
}

type NivelCardYA = 'bronce' | 'plata' | 'oro';
```

---

## 8. Endpoints API

### 8.1 Transacciones — Ventas

| Método | Endpoint | Query Params | Descripción |
|--------|----------|--------------|-------------|
| GET | `/api/transacciones/kpis` | `periodo` | 4 KPIs del periodo |
| GET | `/api/transacciones/historial` | `periodo`, `busqueda`, `operadorId`, `estado`, `limit`, `offset` | Historial filtrado con total: `{ historial, total }` |
| GET | `/api/transacciones/operadores` | — | Lista de operadores con tipo (empleado/gerente/dueño) |
| GET | `/api/transacciones/exportar` | `periodo`, `busqueda`, `operadorId`, `estado` | Descarga Excel (.xlsx) con filtros activos |
| POST | `/api/transacciones/:id/revocar` | — | Body: `{ motivo: string }` |

### 8.2 Transacciones — Canjes

| Método | Endpoint | Query Params | Descripción |
|--------|----------|--------------|-------------|
| GET | `/api/transacciones/canjes/kpis` | `periodo` | 4 KPIs: pendientes, usados, vencidos, total |
| GET | `/api/transacciones/canjes` | `periodo`, `estado`, `busqueda`, `limit`, `offset` | Historial de vouchers: `{ canjes, total }` |

### 8.3 Clientes

| Método | Endpoint | Query Params | Descripción |
|--------|----------|--------------|-------------|
| GET | `/api/clientes/kpis` | — | 4 KPIs de la página |
| GET | `/api/clientes/top` | `limit` | Top clientes por puntos |
| GET | `/api/clientes` | `busqueda`, `nivel`, `limit`, `offset` | Lista con filtros |
| GET | `/api/clientes/:id` | — | Detalle completo |
| GET | `/api/clientes/:id/historial` | `limit`, `offset` | Transacciones del cliente |

**Nota:** `sucursalId` se agrega automáticamente por el interceptor Axios. Los endpoints de historial retornan `{ historial: TransaccionPuntos[], total: number }` con count real del backend.

---

## 9. Decisiones Técnicas

### 9.1 Paginación

| Decisión | Valor | Justificación |
|----------|-------|---------------|
| Tamaño de lote | **20 registros** | Render rápido (~100ms), suficiente para contexto |
| Tipo desktop | **Botón "Cargar más"** | Control explícito, sin cargas accidentales |
| Tipo mobile | **Infinite scroll** | Experiencia nativa en móvil |
| Detección `hayMas` | `array.length === LIMIT` | Simple y eficiente |
| **Total count** | **COUNT(*) real del backend** | Muestra "20 de 48 resultados". Query separada con mismas condiciones |

### 9.2 Anti-parpadeo: `placeholderData: keepPreviousData`

```typescript
// Problema anterior (Zustand): Al cambiar filtros, cargandoHistorial=true mostraba spinner
// reemplazando la tabla. Se resolvía con un flag manual `cargaInicialCompleta`.

// Solución actual (React Query): `placeholderData: keepPreviousData` mantiene los datos
// anteriores visibles mientras se carga el nuevo resultado. El spinner solo aparece en
// la primera carga (cuando no hay datos previos en caché).

return useInfiniteQuery({
  queryKey: queryKeys.transacciones.historial(sucursalId, filtros),
  queryFn: ...,
  placeholderData: keepPreviousData, // ← Evita parpadeo al cambiar filtros
});
```

> **Regla obligatoria:** toda query cuya `queryKey` cambia en runtime por filtros variables DEBE incluir `placeholderData: keepPreviousData`.

### 9.3 Ordenamiento

- **Método:** Local en frontend (sin llamada al backend)
- **Ciclo:** Click → desc → asc → null (sin orden)
- **Estilo:** Flechas amber en header oscuro, clickeables con `z-10` y `cursor-pointer`
- **Columnas ordenables:** Monto, Puntos, Fecha (Transacciones) / Puntos, Visitas, Actividad (Clientes)

### 9.4 Búsqueda

| Aspecto | Implementación |
|---------|----------------|
| Debounce | **400ms** |
| Scope | Backend filtra (nombre O teléfono) |
| Reset | Cambiar búsqueda resetea paginación |
| Placeholder | "Nombre o teléfono..." |
| Limpiar | Botón ✕ visible cuando hay texto. Limpia debounce pendiente + estado |

### 9.5 Breakpoints Responsive

| Breakpoint | Tamaño | Uso |
|------------|--------|-----|
| Base (móvil) | < 1024px | Cards, infinite scroll |
| `lg:` (laptop) | ≥ 1024px | Tabla, 40-50% reducción visual |
| `2xl:` (desktop) | ≥ 1536px | Restaura tamaños originales |

**⚠️ NO usar `xl:`** (limitación de altura en laptops 1366x768)

### 9.6 Formato de Teléfono

```typescript
const formatearTelefono = (tel: string): string => {
  const limpio = tel.replace(/\s+/g, '');
  if (limpio.startsWith('+52') && limpio.length === 13) {
    return `+52 ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
  }
  // Fallback para otros formatos
  if (limpio.startsWith('+') && limpio.length > 4) {
    const codigo = limpio.slice(0, 3);
    const resto = limpio.slice(3);
    return `${codigo} ${resto.slice(0, 3)} ${resto.slice(3)}`;
  }
  return tel;
};
// Resultado: "+526381128286" → "+52 638 1128286"
```

Usada en: tabla de transacciones, modal de detalle, tabla de clientes.

### 9.7 Revocación de Transacciones

```typescript
// Optimistic UI via useMutation (React Query)
// En hooks/queries/useTransacciones.ts

export function useRevocarTransaccion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      transaccionesService.revocarTransaccion(id, motivo),

    onMutate: async ({ id }) => {
      // 1. Capturar snapshot del caché
      const snapshot = queryClient.getQueriesData({ queryKey: ['transacciones', 'historial'] });

      // 2. Actualizar optimistamente en todas las páginas
      queryClient.setQueriesData({ queryKey: ['transacciones', 'historial'] }, (old) => ({
        ...old,
        pages: old.pages.map(page => ({
          ...page,
          historial: page.historial.map(t =>
            t.id === id ? { ...t, estado: 'cancelado' } : t
          ),
        })),
      }));

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      // 3. Rollback si falla
      context?.snapshot.forEach(([key, value]) => queryClient.setQueryData(key, value));
    },

    onSuccess: () => {
      // 4. Invalidar KPIs (conteo de revocadas cambia)
      queryClient.invalidateQueries({ queryKey: ['transacciones', 'kpis'] });
    },
  });
}
```

### 9.8 Exportación Excel

Se usa **ExcelJS** (no CSV) para generar archivos `.xlsx` profesionales con:
- Headers con fondo de color y texto blanco bold
- Anchos de columna ajustados al contenido
- Formatos de moneda y fecha
- Nombre del archivo con periodo y fecha de descarga

---

## 10. Testing y Verificación

### 10.1 Escenarios de Prueba - Transacciones (Tab Ventas)

1. **Ver transacciones de todas las sucursales** (Dueño)
   - Verificar que aparecen transacciones de múltiples sucursales

2. **Filtrar por periodo**
   - Cambiar entre Hoy/Semana/Mes/etc.
   - Verificar que KPIs y tabla se actualizan sin parpadeo

3. **Filtrar por operador**
   - Abrir dropdown, seleccionar un operador
   - Verificar badges: Empleado (azul), Gerente (morado), Dueño (ámbar)
   - Verificar que tabla se filtra correctamente

4. **Filtrar por estado**
   - Click en "Válidas" → solo confirmadas
   - Click en "Revocadas" → solo canceladas
   - Click en "Todas" → reset

5. **Buscar por nombre o teléfono**
   - Escribir nombre parcial → resultados filtrados
   - Escribir número de teléfono → resultados filtrados
   - Click en ✕ → limpiar búsqueda

6. **Exportar Excel con filtros**
   - Click en botón "Excel" con filtros activos (estado + operador + búsqueda)
   - Verificar que el archivo .xlsx respeta los filtros aplicados

7. **Modal de detalle**
   - Verificar: cliente, teléfono formateado, puntos, multiplicador, operador
   - Sucursal solo si `totalSucursales > 1` (negocio con múltiples sucursales)
   - Verificar desglose métodos de pago (si aplica)
   - Verificar foto del ticket (botón expandible, click abre en nueva pestaña)
   - Verificar nota y número de orden (si existen)
   - Verificar icono ChatYA junto al cliente

8. **Revocar transacción**
   - Click en transacción → Modal → Ingresar motivo → Revocar
   - Verificar que aparece con strikethrough inmediatamente (optimistic)
   - Verificar que KPI "Revocadas" incrementa
   - Verificar que modal muestra motivo de revocación

### 10.2 Escenarios de Prueba - Transacciones (Tab Canjes)

1. **Cambiar a tab Canjes**
   - Toggle cambia tab, subtítulo cambia a "Vouchers de recompensas"
   - KPIs muestran Pendientes/Usados/Vencidos/Total
   - Tabla muestra 6 columnas: Cliente, Recompensa, Puntos, Estado, Expira, Canjeado

2. **Filtrar por estado**
   - Todos / Pendientes / Usados / Vencidos
   - KPIs y tabla se actualizan

3. **Verificar columnas**
   - EXPIRA siempre muestra fecha de expiración (no cambia según estado)
   - CANJEADO muestra fecha de uso con ✓ verde solo si estado = "usado"
   - CANJEADO muestra "—" si pendiente o vencido

4. **Modal detalle — Pendiente**
   - Header azul, muestra "Pendiente de canje"
   - Expiración con indicador de urgencia ("Vence en X días")
   - Mensaje azul informativo
   - NO muestra operador/sucursal ni fecha de uso

5. **Modal detalle — Usado**
   - Header verde, muestra "Canjeado"
   - Operador que validó + sucursal (solo si `totalSucursales > 1`)
   - Fecha de uso en verde
   - Mensaje verde confirmando entrega

6. **Modal detalle — Vencido**
   - Header rojo, muestra "Vencido"
   - Mensaje rojo: "puntos fueron devueltos al saldo del cliente"
   - NO muestra operador/sucursal

### 10.3 Escenarios de Prueba - Gerente

1. **Solo ver su sucursal**
   - Verificar que no puede ver transacciones de otras sucursales
   - El backend fuerza el filtro por `sucursalAsignada`

2. **Funcionalidades completas dentro de su sucursal**
   - Puede buscar, filtrar, exportar, revocar

### 10.3 Verificación de Compilación

```bash
# Backend
cd apps/api
npm run build
# Debe compilar sin errores TypeScript

# Frontend
cd apps/web
npm run build
# Debe compilar sin errores TypeScript
```

---

## 📋 Checklist de Implementación

### Backend ✅

- [x] `puntos.service.ts` — obtenerKPIs, obtenerHistorial (con total), obtenerOperadores, revocar
- [x] `transacciones.service.ts` — obtenerKPIsCanjes, obtenerHistorialCanjes
- [x] `clientes.service.ts` — 4 funciones (KPIs, lista, detalle con configNiveles, historial)
- [x] `transacciones.controller.ts` — 7 controllers (5 ventas + 2 canjes)
- [x] `clientes.controller.ts` — 5 controllers
- [x] `transacciones.routes.ts` — 7 rutas (5 ventas + 2 canjes)
- [x] `clientes.routes.ts` — 5 rutas
- [x] Tipos en `puntos.types.ts` (incluyendo configNiveles en ClienteDetalle)
- [x] JOIN operador a través de `scanya_turnos` (ambos services)
- [x] Exportar Excel con filtros (búsqueda, operadorId, estado)

### Frontend ✅

- [x] `puntos.ts` (types) — TransaccionPuntos con 7 campos nuevos
- [x] `transacciones.ts` (types) — KPIsTransacciones, KPIsCanjes, VoucherCanje
- [x] `clientes.ts` (types) — ClienteDetalle con configNiveles
- [x] `transaccionesService.ts` — 9 funciones (6 ventas + 3 canjes)
- [x] `clientesService.ts` — 5 funciones
- [x] `useTransaccionesStore.ts` — Solo estado UI (tab activo, filtros)
- [x] `useClientesStore.ts` — Solo estado UI (búsqueda, nivel)
- [x] `hooks/queries/useTransacciones.ts` — React Query: KPIs, historial infinite, operadores, revocar
- [x] `hooks/queries/useClientes.ts` — React Query: KPIs, lista infinite, detalle, historial
- [x] `useAuthStore.ts` — Agregado `totalSucursales` (carga en login/hidratar)
- [x] `PaginaTransacciones.tsx` — ~1540 líneas (Toggle Ventas/Canjes, filtros, tablas, modales)
- [x] `ModalDetalleTransaccionBS.tsx` — ~470 líneas (desglose pagos, foto ticket, nota, ChatYA)
- [x] `ModalDetalleCanjeBS.tsx` — ~375 líneas (detalle voucher por estado, condición sucursales)
- [x] `PaginaClientes.tsx` — Integrado con modal
- [x] `ModalDetalleCliente.tsx` — ~500 líneas (header azul, puntos, progreso real, estadísticas, historial)
- [x] Rutas en `index.tsx`

---

## 📝 Notas Adicionales

### Convenciones de Código

- **Nombres en español** para componentes: `PaginaClientes`, `ModalDetalleTransaccionBS`
- **Nombres en camelCase** para services: `clientesService`, `transaccionesService`
- **Prefijo `use`** para stores: `useClientesStore`, `useTransaccionesStore`
- **TypeScript estricto:** 0 usos de `any`
- **Tailwind v4:** Usar `shrink-0` (no `flex-shrink-0`), `bg-linear-to-*` (no `bg-gradient-to-*`)

### Patrones Reutilizables

1. **Header con ícono animado** — Ver `PaginaOfertas.tsx` o `PaginaCatalogo.tsx`
2. **KPIs compactos** — Carousel móvil, fila desktop
3. **Tabla con header dark** — Flechas amber para ordenamiento, `z-10` clickeable
4. **Cards móvil** — Con infinite scroll vía IntersectionObserver
5. **Empty states** — Cuando no hay datos
6. **Anti-parpadeo** — `placeholderData: keepPreviousData` en React Query para evitar spinner en cambios de filtro
7. **Dropdown custom** — Estado local + ref + click-outside handler (no `<select>` nativo)
8. **Formato teléfono** — `formatearTelefono()` reutilizable (+52 XXX XXXXXXX)
9. **JOIN operador vía turnos** — Patrón replicado en `puntos_service.ts` y `clientes_service.ts`
10. **Barra progreso por nivel** — Color según nivel actual (amber/slate/yellow), usa configNiveles del backend
11. **Navegación con filtro URL** — Modal pasa `?busqueda=`, página destino lee con `useSearchParams`
12. **Nivel máximo** — Muestra "¡Nivel máximo!" + barra 100% en lugar de "Faltan X pts"
13. **Toggle Ventas/Canjes** — Gradientes diferenciados (slate para Ventas, azul para Canjes), centrado vertical
14. **Condición sucursales** — `totalSucursales` del `useAuthStore` controla visibilidad de filas de sucursal en modales
15. **Separación servidor/UI** — Datos del servidor en React Query hooks; estado visual (filtros, tabs) en Zustand stores

---

*Documentación actualizada el 07 de Abril 2026 (v3.0)*  
*Basada en Chats: #6.73, #6.62, #6.63, #6.74, #6.75, #6.76*