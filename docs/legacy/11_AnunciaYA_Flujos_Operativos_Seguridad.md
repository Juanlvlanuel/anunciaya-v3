# ⚙️ AnunciaYA v3.0 - Flujos Operativos, Seguridad y Configuraciones

**Fecha de Actualización:** 18 Diciembre 2024

---

## 1. Flujos de Operación

### 1.1 Registrar una Compra (Acumular Puntos)

| Paso | Actor | Acción |
|------|-------|--------|
| 1 | **Cliente** | Muestra su QR dinámico (expira en 2 min) |
| 2 | **Empleado** | Escanea con ScanYA → obtiene datos del cliente |
| 3 | **Empleado** | Ingresa: monto + # orden (si aplica) + foto evidencia (si aplica) |
| 4 | **Sistema** | Valida: horario permitido + # orden único |
| 5 | **Cliente** | Recibe notificación para confirmar (auto en 5 min) |
| 6 | **Sistema** | Acredita puntos + guarda evidencia |

---

### 1.2 Canjear Puntos (Físico - En el Negocio)

| Paso | Actor | Acción |
|------|-------|--------|
| 1 | **Cliente** | Abre app → selecciona recompensa |
| 2 | **App** | Genera código QR + 6 dígitos (expira en 10 min) |
| 3 | **Cliente** | Muestra código al empleado |
| 4 | **Empleado** | Valida en ScanYA |
| 5 | **Sistema** | Verifica si requiere aprobación del dueño |
| 6 | **Sistema** | Puntos se descuentan + notificación al cliente |

---

### 1.3 Canjear desde App (Recoger Después)

| Paso | Actor | Acción |
|------|-------|--------|
| 1 | **Cliente** | Ve catálogo → selecciona recompensa |
| 2 | **App** | Muestra condiciones (compra mínima, fecha límite) |
| 3 | **Cliente** | Confirma → puntos se descuentan |
| 4 | **Sistema** | Genera VOUCHER con código único |
| 5 | **Cliente** | Va al negocio → muestra voucher |
| 6 | **Empleado** | Valida → entrega producto → estado: Entregado |

---

### 1.4 Cancelaciones

| Situación | ¿Quién cancela? | ¿Puntos devueltos? |
|-----------|-----------------|-------------------|
| Cliente cambia de opinión | Cliente (siempre permitido si pendiente) | ✅ Sí, inmediatamente |
| Producto sin stock | Negocio desde ScanYA | ✅ Sí, inmediatamente |
| Voucher expiró | Automático | ✅ Sí, auto-reembolso |

---

## 2. Seguridad y Alertas

### 2.1 Medidas de Seguridad

| Medida | Descripción |
|--------|-------------|
| ✅ **QR dinámico del cliente** | Expira en 2 minutos |
| ✅ **Foto de evidencia** | Configurable por negocio |
| ✅ **# Orden único** | Evita reusar tickets (configurable) |
| ✅ **Validación de horario** | Solo en horario de operación |
| ✅ **Cliente confirma** | Puede reportar si monto es incorrecto |
| ✅ **Código de canje expira** | QR + 6 dígitos, 10 minutos |
| ✅ **Aprobación del dueño** | Configurable por recompensa |

---

### 2.2 Alertas Automáticas al Dueño

| Alerta | Qué Detecta |
|--------|-------------|
| ⚠️ **Monto Inusual** | Transacción muy por encima del promedio del cliente |
| 🔄 **Cliente Frecuente** | Mismo cliente muchas veces en un día |
| 🌙 **Fuera de Horario** | Transacción fuera del horario configurado |
| 💰 **Montos Redondos** | Muchas transacciones con montos exactos |
| 👤 **Empleado Destacado** | Un empleado con muchas más transacciones que otros |
| 🚨 **Cliente Reportó** | Cliente marcó error en la confirmación |

---

### 2.3 Reporte Semanal Automático

**Cada lunes el dueño recibe email con:**

| Sección | Contenido |
|---------|-----------|
| 📊 **Métricas** | Transacciones, ventas, puntos otorgados, canjes |
| 👥 **Clientes** | Activos, nuevos, más frecuente, ticket promedio |
| 👤 **Empleados** | Transacciones por empleado |
| ⚠️ **Alertas** | Resumen de alertas de la semana |
| 🎁 **Recompensas** | Canjes realizados y puntos usados |
| 📷 **Evidencias** | Link para revisar fotos de la semana |

---

## 3. Configuraciones del Comerciante (Business Studio)

### 3.1 Opciones Disponibles

| Configuración | Tipo | Default |
|---------------|------|---------|
| **Horario de operación** | Hora inicio / fin | 9AM - 10PM |
| **Validar horario en transacciones** | Sí / No | Sí |
| **Requerir foto de evidencia** | Sí / No | Sí |
| **Requerir # Orden/Folio** | Sí / No | No |
| **Alerta por monto alto** | Monto | $2,000 |
| **Puntos por peso gastado** | Número | 1 pt = $10 |
| **Días de expiración puntos** | Días | 90 |
| **Días de expiración vouchers** | Días | 30 |
| **Recompensas que requieren aprobación** | Por recompensa | Ninguna |
| **Recibir reporte semanal** | Sí / No | Sí |
| **Alertas en tiempo real** | Sí / No | Sí |

---

## 4. Marco Legal - Sorteos

### 4.1 ❌ Lo que NO haremos (requiere SEGOB)

- Vender boletos con dinero real
- Cobrar comisión sobre rifas
- Procesar pagos para rifas

### 4.2 ✅ Lo que SÍ haremos (zona segura)

- **Sorteos promocionales GRATIS** - Negocios organizan sorteos para sus clientes
- **Participación con puntos** - Clientes usan puntos para participar
- **Compra mínima para participar** - Ej: "Participa con compras mayores a $100"
- **"Mi Rifa" sin procesar pagos** - Usuarios organizan rifas entre conocidos, AnunciaYA no procesa dinero

> **Importante:** AnunciaYA NO procesa dinero para sorteos ni rifas. Solo facilitamos la organización y selección de ganadores.

---

## 5. Herramientas del Sistema

### 5.1 CardYA (Para Clientes)

**Propósito:** Tarjeta de lealtad digital del usuario

| Función | Descripción |
|---------|-------------|
| QR Dinámico | Código único que expira en 2 minutos |
| Código de respaldo | 6 dígitos por si falla el QR |
| Ver puntos | Saldo en cada negocio |
| Historial | Todas las transacciones |
| Canjear | Seleccionar y canjear recompensas |
| Vouchers | Ver vouchers pendientes de recoger |

### 5.2 ScanYA (Para Empleados/Dueños)

**Propósito:** Punto de venta para registrar compras y canjes

| Función | Descripción |
|---------|-------------|
| Escanear QR | Leer QR del cliente |
| Registrar venta | Ingresar monto, # orden, foto |
| Validar canje | Verificar código de canje |
| Entregar voucher | Marcar voucher como entregado |
| Ver alertas | Notificaciones en tiempo real |

### 5.3 Business Studio (Para Dueños)

**Propósito:** Dashboard completo de administración

| Sección | Funciones |
|---------|-----------|
| **Dashboard** | Métricas en tiempo real |
| **Puntos** | Configurar ratio, expiración |
| **Recompensas** | Crear/editar catálogo de premios |
| **Empleados** | Agregar, permisos, reportes |
| **Ofertas** | Crear promociones y cupones |
| **Dinámicas** | Organizar sorteos |
| **Clientes** | Ver clientes frecuentes |
| **Reportes** | Históricos y exportar |
| **Configuración** | Todas las opciones del negocio |

---

## 6. Flujo Completo de Puntos

```
┌─────────────────────────────────────────────────────────────┐
│                  CICLO DE VIDA DE PUNTOS                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ACUMULACIÓN                                                │
│  ────────────                                               │
│  Cliente compra → Empleado escanea → Cliente confirma       │
│  → Puntos acreditados                                       │
│                                                             │
│  ESTADO: ACTIVO                                             │
│  ───────────────                                            │
│  Puntos disponibles para canjear                            │
│  Contador de expiración corriendo (ej: 90 días)             │
│                                                             │
│  CANJE                                                      │
│  ─────                                                      │
│  Cliente selecciona recompensa → Genera voucher             │
│  → Puntos descontados → Voucher pendiente                   │
│                                                             │
│  ENTREGA                                                    │
│  ───────                                                    │
│  Cliente muestra voucher → Empleado valida                  │
│  → Voucher: Entregado                                       │
│                                                             │
│  EXPIRACIÓN                                                 │
│  ──────────                                                 │
│  Si puntos no usados en X días → Estado: Expirado           │
│  Si voucher no recogido en X días → Auto-reembolso          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Notificaciones

### 7.1 Al Cliente

| Evento | Notificación |
|--------|-------------|
| Compra registrada | "Confirma tu compra de $X en [Negocio]" |
| Puntos acreditados | "¡Ganaste X puntos en [Negocio]!" |
| Puntos por expirar | "Tienes X puntos que expiran en 7 días" |
| Voucher generado | "Tu voucher para [Recompensa] está listo" |
| Voucher por expirar | "Recoge tu [Recompensa] antes del [Fecha]" |

### 7.2 Al Dueño

| Evento | Notificación |
|--------|-------------|
| Alerta de seguridad | "⚠️ [Tipo de alerta] en tu negocio" |
| Canje que requiere aprobación | "🎁 [Cliente] quiere canjear [Recompensa]" |
| Reporte semanal | "📊 Tu reporte de la semana está listo" |
| Nuevo cliente frecuente | "⭐ [Cliente] ya tiene X visitas" |

---

*Documento actualizado: 18 Diciembre 2024*
