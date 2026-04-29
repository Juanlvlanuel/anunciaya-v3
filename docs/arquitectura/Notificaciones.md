# Notificaciones — AnunciaYA v3.0

> Sistema de notificaciones en tiempo real vía Socket.io + persistencia en BD.
>
> **UBICACIÓN:** `apps/api/src/services/notificaciones.service.ts` (función `crearNotificacion`)

---

## Estructura de una Notificación

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tipo` | string | Identifica la categoría de la notificación |
| `modo` | `personal` \| `comercial` | Personal = cliente, Comercial = dueño/empleado |
| `titulo` | string | Línea principal visible (acción o descripción) |
| `mensaje` | string | Detalle. Personales usan `\n` para separar contenido del nombre del negocio |
| `icono` | string (emoji) | Emoji decorativo (legacy, no se usa en UI) |
| `actorImagenUrl` | string \| null | Personal: logo del negocio. Comercial: avatar del cliente |
| `actorNombre` | string \| null | Personal: nombre del negocio. Comercial: nombre del cliente |
| `referenciaId` | string \| null | ID de la entidad relacionada |
| `referenciaTipo` | string \| null | Tipo de entidad: `transaccion`, `voucher`, `oferta`, `cupon`, `recompensa`, `resena`, `alerta` |
| `negocioId` | string | Negocio dueño de la notificación |
| `sucursalId` | string \| null | Sucursal del evento. `null` = evento a nivel negocio (ver "Filtrado por sucursal") |

---

## Filtrado por sucursal (modo comercial)

Las notificaciones comerciales se filtran por la sucursal del **contexto de navegación actual**, no por la última sucursal seleccionada en el selector.

### Regla de `sucursal_id` al crear la notificación

| Tipo de evento | `sucursal_id` | Razón |
|---------------|---------------|-------|
| Venta / canje de cupón (ScanYA) | Sucursal donde ocurrió | Cada venta es específica de una sucursal |
| Reseña nueva | Sucursal donde se dejó | Reseñas son por sucursal |
| Voucher cobrado / entregado (ScanYA) | Sucursal donde se entregó | Cierre de evento específico |
| Voucher pendiente (cliente canjeó puntos) | `null` | Cualquier sucursal puede entregarlo |
| Stock bajo / recompensa agotada | `null` | Recompensas son a nivel negocio, no por sucursal |
| Alerta de seguridad | `alerta.sucursalId` o `null` | Puede ser específica o general |

**Eventos de negocio** (`sucursal_id = null`) aparecen en cualquier contexto — son tareas o avisos que cualquier operador debe ver sin importar qué sucursal tenga activa.

### Regla de filtrado al leer (`obtenerNotificaciones`)

Cuando hay `sucursalId` en la query:

```sql
WHERE usuario_id = X AND modo = 'comercial'
  AND (sucursal_id = ${sucursalId} OR sucursal_id IS NULL)
```

### ¿Qué `sucursalId` se pasa?

El cálculo lo hace el service del frontend (`obtenerSucursalIdParaFiltro` en `notificacionesService.ts`):

| Rol | Contexto (URL actual) | `sucursalId` pasado |
|-----|----------------------|---------------------|
| **Gerente** | cualquiera | Su `sucursalAsignada` (fijo, no puede cambiar) |
| **Dueño** | `/business-studio/*` | `usuario.sucursalActiva` (selector del navbar) |
| **Dueño** | fuera de BS (inicio, ofertas, etc.) | `sucursalPrincipalId` (Matriz) |
| **Usuario personal** | cualquiera | `undefined` (sin filtro) |

El helper `obtenerSucursalIdParaFiltro` se exporta para que el store `useNotificacionesStore` aplique el mismo filtro al recibir notificaciones por socket en tiempo real. Si una notificación llega de una sucursal distinta al contexto actual del dueño, el listener la descarta (no la agrega al panel).

El helper se usa también en los endpoints de escritura que deben respetar el contexto — no solo los de lectura. En particular:
- `GET /notificaciones` (listado) — filtra por sucursal
- `GET /notificaciones/no-leidas` (badge) — filtra por sucursal
- `PATCH /notificaciones/marcar-todas` — marca solo las del contexto actual (no pisa Sucursal Norte desde Matriz)

### Exclusión del interceptor axios

La ruta `/notificaciones` está en `RUTAS_SIN_SUCURSAL` (`api.ts`) para que el interceptor no sobreescriba el `sucursalId` que el service envía explícitamente. Esto es crítico porque el interceptor usa `usuario.sucursalActiva`, pero fuera de BS se necesita `sucursalPrincipalId`.

### Triggers de refresh automático

El panel de notificaciones recarga automáticamente en 2 momentos:

- **`setSucursalActiva`** (`useAuthStore`): cuando el dueño cambia sucursal en el selector de BS
- **`MainLayout` useEffect**: cuando cambia `esBusinessStudio` (entrar/salir de `/business-studio/*`)

Ambos llaman a `cargarNotificaciones('comercial')` que reemplaza el estado del store con los datos filtrados del backend.

---

## Destinatarios por tipo de evento

Quiénes reciben cada notificación comercial al ocurrir el evento:

| Evento | Dueño | Gerente de la sucursal | Empleados ScanYA |
|--------|-------|------------------------|-------------------|
| Venta registrada | ✅ | ✅ (solo el de esa sucursal) | ❌ |
| Voucher cobrado / entregado | ✅ | ✅ (solo el de esa sucursal) | ❌ |
| Nueva reseña | ✅ | ✅ (solo el de esa sucursal) | ❌ |
| Voucher pendiente (cliente canjeó puntos) | ✅ | ✅ (**todos** los gerentes del negocio) | ✅ (todos, vía `notificarNegocioCompleto`) |
| Stock bajo / agotado | ✅ | ❌ | ❌ |
| Alerta de seguridad | ✅ | ❌ (los empleados sí via `notificarNegocioCompleto`) | ✅ |

**Patrón de notificar al gerente en ScanYA (venta/voucher cobrado):**

```typescript
// Ejemplo: registrarVenta en scanya.service.ts
const payloadComercial = { modo: 'comercial', sucursalId: payload.sucursalId, ... };

// Dueño (siempre)
crearNotificacion({ ...payloadComercial, usuarioId: negocioDueno.usuarioId });

// Gerente de la sucursal (si existe y no es el dueño)
const [gerente] = await db.select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.sucursalAsignada, payload.sucursalId));

if (gerente && gerente.id !== negocioDueno.usuarioId) {
    crearNotificacion({ ...payloadComercial, usuarioId: gerente.id });
}
```

---

## Limpieza automática de notificaciones

Algunas notificaciones quedan **desactualizadas** cuando el evento que las originó se cierra. Para mantener el panel limpio, ciertos flujos borran las notificaciones relacionadas al cerrar el ciclo.

### Voucher entregado → borra "voucher_pendiente"

Cuando un empleado/gerente/dueño entrega un voucher en ScanYA (`validarVoucher`), el service ejecuta:

```sql
DELETE FROM notificaciones
WHERE tipo = 'voucher_pendiente'
  AND referencia_tipo = 'voucher'
  AND referencia_id = ${voucherId}
```

Esto elimina las notificaciones "Recompensa por entregar" que vieron dueño + todos los gerentes + empleados. En su lugar se crea la notificación nueva "Recompensa entregada" (`voucher_cobrado`) solo para el dueño y gerente de la sucursal donde ocurrió el canje.

### Voucher expirado automáticamente → borra "voucher_pendiente"

Cuando un voucher nunca se canjea y pasa su `expira_at`, el job pasivo `expirarVouchersVencidos` (en `puntos.service.ts`, se dispara al listar canjes de BS) marca el voucher como `expirado`, devuelve los puntos al cliente y **elimina las notificaciones `voucher_pendiente` asociadas**:

```sql
DELETE FROM notificaciones
WHERE tipo = 'voucher_pendiente'
  AND referencia_tipo = 'voucher'
  AND referencia_id = ${voucherId}
```

Sin esto, quedaban como "zombies" apuntando a vouchers que ya no se pueden entregar (el dueño/gerentes veían "Recompensa por entregar" para algo que ya expiró).

### Cliente cancela voucher → borra todas las notificaciones del voucher

Cuando el cliente cancela su propio voucher desde CardYA (`cancelarVoucher`), el service borra **todas** las notificaciones relacionadas con ese voucher:

```sql
DELETE FROM notificaciones
WHERE referencia_id = ${voucherId}
  AND referencia_tipo = 'voucher'
```

Incluye `voucher_generado` (personal), `voucher_pendiente` (comerciales) y cualquier otra.

### Socket `notificacion:eliminada` — actualización del panel en vivo

Hasta abril 2026 solo emitíamos `notificacion:nueva` al crear. Al borrar, el panel del usuario conservaba la tarjeta hasta que se cerrara/reabriera o se recargara la página. Zombies visuales temporales.

Ahora **todos los flujos que borran notificaciones lo hacen vía el helper `eliminarNotificacionesPorReferencia()`** (en `notificaciones.service.ts`), que además de hacer el DELETE emite `notificacion:eliminada` con el payload `{ ids: string[] }` a cada usuario afectado.

**Frontend** (`useNotificacionesStore.registrarListenerNotificaciones`) tiene un listener del evento que llama a `eliminarVariasPorIds(ids)`:
- Filtra localmente las notificaciones con esos IDs
- Decrementa `totalNoLeidas` por las que eran no leídas
- Sin fetch, sin parpadeo

Flujos que emiten hoy:
- `validarVoucher` en `scanya.service.ts` (voucher entregado)
- `cancelarVoucher` en `cardya.service.ts` (cliente cancela)
- `expirarVouchersVencidos` en `puntos.service.ts` (job de expiración)

### Regla general

Si una notificación pierde sentido semántico al cerrarse el ciclo de la entidad referenciada, debe borrarse. Ej: un cupón revocado no necesita mantener la notificación "Recibiste un cupón" en el panel del cliente.

---

## Patrón de Mensaje

### Personales (al cliente)

```
mensaje: `${contenido}\n${nombreNegocio}`
```

El `\n` permite que el frontend separe el nombre del negocio y lo muestre como `actorNombre` en azul grande. Solo se renderiza la primera línea del mensaje (antes del `\n`). El nombre del negocio después del `\n` es redundante con `actorNombre` — existe para compatibilidad.

**Importante:** Toda la información relevante debe ir ANTES del `\n`. Ejemplo con motivo de revocación:

```typescript
// ✅ Correcto — motivo visible en la primera línea
mensaje: `${titulo} · Motivo: ${motivo}\n${negocio}`

// ❌ Incorrecto — motivo después del \n, se pierde
mensaje: `${titulo}\n${negocio}\nMotivo: ${motivo}`
```

### Comerciales (al dueño/empleado)

No usan patrón `\n`. El mensaje contiene solo la información de la acción. El nombre del cliente NO va en el mensaje — ya está en `actorNombre`.

```typescript
// ✅ Correcto — nombre del cliente solo en actorNombre
actorNombre: nombreCliente,
mensaje: `Ganó ${puntos} puntos`,

// ❌ Incorrecto — nombre duplicado en mensaje y actorNombre
actorNombre: nombreCliente,
mensaje: `${nombreCliente} ganó ${puntos} puntos`,
```

---

## Frontend — Iconos y Colores por Tipo

**Archivo:** `apps/web/src/components/layout/PanelNotificaciones.tsx`

| Tipo | Icono | Color (gradiente) | Hex |
|------|-------|-------------------|-----|
| `puntos_ganados` | Coins | Amarillo/ámbar | `#f59e0b → #d97706` |
| `voucher_generado` | Ticket | Violeta | `#8b5cf6 → #6d28d9` |
| `voucher_cobrado` | Trophy | Verde esmeralda | `#10b981 → #047857` |
| `voucher_pendiente` | Clock | Naranja | `#f97316 → #c2410c` |
| `nueva_oferta` | Tag | Azul | `#3b82f6 → #1d4ed8` |
| `cupon_asignado` | Gift | Teal | `#14b8a6 → #0d9488` |
| `cupon_revocado` | Ban | Rojo | `#ef4444 → #b91c1c` |
| `nueva_recompensa` | Sparkles | Púrpura | `#a855f7 → #7c3aed` |
| `recompensa_desbloqueada` | Zap | Dorado | `#eab308 → #a16207` |
| `nuevo_cliente` | UserPlus | Cyan | `#06b6d4 → #0891b2` |
| `stock_bajo` | AlertTriangle | Rojo oscuro | `#dc2626 → #991b1b` |
| `nueva_resena` | Star | Ámbar | `#f59e0b → #b45309` |
| `nuevo_marketplace` | ShoppingBag | Rosa | `#ec4899 → #be185d` |
| `nuevo_servicio` | Briefcase | Azul cielo | `#0ea5e9 → #0369a1` (alineado con sección pública Servicios; antes `nuevo_empleo`, renombrado en Fase D del cleanup — abril 2026) |
| `sistema` | Settings | Gris | `#64748b → #475569` |

**Regla:** Cada tipo tiene icono y color únicos. No repetir combinaciones.

---

## Frontend — Icono de Notificación (estilo Facebook)

El círculo grande sigue esta prioridad:

1. **`actorImagenUrl`** → Foto circular (logo negocio o avatar cliente) + mini badge del tipo superpuesto
2. **`actorNombre` sin imagen** → Iniciales en mayúsculas con fondo de color derivado del nombre + mini badge del tipo
3. **Sin imagen ni nombre** → Icono Lucide del tipo con gradiente (sin badge, el círculo ya ES el tipo)

Las iniciales se generan con `obtenerIniciales()` (primera letra de las 2 primeras palabras). El color de fondo se deriva del nombre con `obtenerColorIniciales()` usando un hash para consistencia (mismo nombre = mismo color).

---

## Frontend — Jerarquía Visual (5 modos de renderizado)

El componente `ContenidoItem` maneja 5 casos de renderizado:

### 1. Comercial con usuario

Tipos: `puntos_ganados`, `voucher_cobrado`, `voucher_pendiente`, `nueva_resena`, `nuevo_cliente`

Definidos en `TIPOS_USUARIO_COMERCIAL`.

| Línea | Estilo | Contenido |
|-------|--------|-----------|
| 1 | `text-base font-bold text-blue-800` + punto no leída | `actorNombre` (nombre del cliente) |
| 2 | `text-sm font-bold text-slate-700` | `titulo` (acción) |
| 3+ | `text-sm font-medium text-slate-600` | Cada línea del `mensaje` (split por `\n`) |
| Último | `text-sm font-medium text-blue-700` | Tiempo relativo |

Ejemplo:
```
[Avatar AN]  Ana Narvaez  •
             Compra Registrada: $250.00
             Ganó 187 puntos
             1 min
```

**Limpieza legacy:** `limpiarMensajeComercial()` elimina el nombre del cliente si aparece como prefijo en el mensaje (notificaciones anteriores al rediseño).

### 2. Comercial sin usuario

Tipos: `stock_bajo`, `sistema`, `alerta_seguridad`, y cualquier comercial sin `actorNombre` o fuera de `TIPOS_USUARIO_COMERCIAL`.

| Línea | Estilo | Contenido |
|-------|--------|-----------|
| 1 | `text-base font-bold text-slate-900` + punto no leída | `titulo` (prominente) |
| 2 | `text-sm font-medium text-slate-600` | `mensaje` completo |
| 3 | `text-sm font-medium text-blue-700` | Tiempo relativo |

Ejemplo:
```
[⚠️ icon]  ¡Stock bajo! Quedan 3  •
           La recompensa "Camisetas" se está agotando
           22h
```

### 3. Personal con actor (patrón `\n`)

Cuando `actorNombre` existe y el mensaje contiene `\n`.

| Línea | Estilo | Contenido |
|-------|--------|-----------|
| 1 | `text-base font-bold text-blue-800` + punto no leída | `actorNombre` (nombre del negocio) |
| 2 | `text-sm font-bold text-slate-700` | `titulo` |
| 3 | `text-sm font-medium text-slate-600` | Primera línea del `mensaje` (antes del `\n`) |
| 4 | `text-sm font-medium text-blue-700` | Tiempo relativo |

Ejemplo:
```
[Logo]  Tacos El Paisa  •
        Compra Registrada: $250.00
        +187 puntos Ganados
        1 min
```

**Transformaciones legacy:** El frontend transforma títulos y mensajes antiguos para mantener consistencia visual:
- `+N puntos` → `Compra Registrada` + `+N puntos Ganados`
- `+N puntos con cupón` → `Compra con Cupón` + `+N puntos Ganados`
- `Compraste en` → se oculta (redundante con actorNombre)
- `Canjeaste: X` → `X — muestra el código en el negocio`
- `Recibiste: X` → `X`
- `Respondieron tu reseña` → `Respondió tu reseña`
- `¡Oferta exclusiva para ti!` → `¡Recibiste un Cupón Exclusivo!`

### 4. Personal con actor (sin `\n`)

Cuando `actorNombre` existe pero el mensaje NO contiene `\n`. Usado por notificaciones de sistema enviadas de parte del negocio (ej: cambio en sistema de niveles).

| Línea | Estilo | Contenido |
|-------|--------|-----------|
| 1 | `text-base font-bold text-blue-800` + punto no leída | `actorNombre` (nombre del negocio) |
| 2 | `text-sm font-bold text-slate-700` | `titulo` |
| 3 | `text-sm font-medium text-slate-600` | `mensaje` completo (expandible con click) |
| 4 | `text-sm font-medium text-blue-700` | Tiempo relativo |

Ejemplo:
```
[Logo]  Imprenta FindUS Peñasco  •
        Sistema de niveles desactivado
        Tus puntos siguen acumulándose con normalidad...
        1 min
```

**Truncamiento:** El mensaje usa `line-clamp-2` por defecto. Al hacer click se expande para mostrar el texto completo (ver sección "Expansión inline").

### 5. Personal sin actor (default)

Cuando no hay `actorNombre` o el mensaje no contiene `\n`.

| Línea | Estilo | Contenido |
|-------|--------|-----------|
| 1 | `text-sm font-bold` + punto no leída | `titulo` |
| 2 | `text-sm font-medium text-slate-600` | `mensaje` completo (expandible con click) |
| 3 | `text-sm font-medium text-blue-700` | Tiempo relativo |

### Punto de no leída

En los 5 modos, el punto azul de "no leída" se muestra **siempre al lado del título principal** (actorNombre o titulo según el caso) usando `flex` + `gap-1.5`, nunca inline.

---

## Frontend — Expansión Inline (notificaciones sin ruta)

Algunas notificaciones no tienen `referenciaTipo` (ej: cambio de sistema de niveles), por lo que no navegan a ninguna página al hacer click.

**Comportamiento:** Al hacer click en una notificación sin ruta de destino, el texto se expande/colapsa inline (toggle). Se mantiene un estado `expandidaId` en el componente principal que controla qué notificación está expandida. Solo una notificación puede estar expandida a la vez.

- Los modos 4 y 5 usan `line-clamp-2` / `line-clamp-3` por defecto, que se remueve cuando `expandida === true`
- Los modos 1, 2 y 3 no truncan el mensaje (siempre visible completo)

---

## Catálogo de Notificaciones

### Personales (al cliente)

#### Puntos y Ventas

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 1 | `puntos_ganados` | `Compra Registrada: ${monto}` | `+{puntos} puntos Ganados\n{negocio}` | 🎯 | scanya | Venta normal registrada |
| 2 | `puntos_ganados` | `Compra con Cupón: ${monto}` | `+{puntos} puntos Ganados\n{negocio}` | 🎟️ | scanya | Venta con cupón aplicado |
| 3 | `puntos_ganados` | `¡Cupón canjeado!` | `Usaste tu cupón con éxito\n{negocio}` | 🎟️ | scanya | Cupón gratis (monto $0) |

#### Cupones

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 4 | `cupon_asignado` | `{tipoInfo}` | `{tituloOferta}\n{negocio}` | 🎟️ | ofertas | Cupón privado asignado al crear |
| 5 | `cupon_asignado` | `¡Recordatorio de cupón!` | `{tituloOferta}\n{negocio}` | 🎟️ | ofertas | Reenvío de cupón |
| 6 | `cupon_asignado` | `¡Tu cupón fue reactivado!` | `{tituloOferta}\n{negocio}` | 🎟️ | ofertas | Cupón revocado → reactivado |
| 7 | `cupon_revocado` | `Cupón revocado` | `{tituloOferta} · Motivo: {motivo}\n{negocio}` | ❌ | ofertas | Revocación individual |
| 8 | `cupon_revocado` | `Cupón revocado` | `{tituloOferta} · Motivo: {motivo}\n{negocio}` | ❌ | ofertas | Revocación masiva |

#### Ofertas

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 9 | `nueva_oferta` | `¡Nueva oferta!` | `{tituloOferta}\n{negocio}` | 🏷️ | ofertas | Oferta pública creada |
| 10 | `nueva_oferta` | `¡Nueva oferta!` | `{tituloOferta}\n{negocio}` | 🏷️ | ofertas | Oferta inactiva → activada |
| 11 | `nueva_oferta` | `¡Recibiste un Cupón Exclusivo!` | `{tituloOferta}\n{negocio}` | 🎟️ | ofertas | Oferta exclusiva asignada |

#### Recompensas y Vouchers

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 12 | `nueva_recompensa` | `¡Nueva recompensa disponible!` | `{nombre} ({puntos} pts)\n{negocio}` | 🎁 | puntos | Recompensa creada en CardYA |
| 13 | `recompensa_desbloqueada` | `¡Recompensa desbloqueada!` | `{nombre} — completaste {n} compras\n{negocio}` | 🎉 | puntos/scanya | Cliente alcanzó compras frecuentes |
| 14 | `voucher_generado` | `¡Recompensa canjeada!` | `{nombre} — muestra el código en el negocio\n{negocio}` | 🎟️ | cardya | Cliente canjeó puntos por recompensa |
| 15 | `voucher_cobrado` | `¡Recompensa entregada!` | `{nombre}\n{negocio}` | 🎟️ | scanya | Negocio validó/entregó la recompensa |

#### Reseñas

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 16 | `nueva_resena` | `Respondió tu reseña` | `"{texto}"\n{negocio}` | 💬 | resenas | Negocio respondió reseña del cliente |

#### Sistema (cambios de configuración del negocio)

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 16b | `sistema` | `Sistema de niveles desactivado` | `Tus puntos siguen acumulándose con normalidad. Los bonos por nivel (Bronce, Plata, Oro) ya no están activos por el momento.` | ⚙️ | puntos | Negocio desactivó `nivelesActivos` |
| 16c | `sistema` | `Sistema de niveles activado` | `Ahora puedes subir de nivel y ganar puntos más rápido. ¡Acumula puntos para desbloquear mejores beneficios!` | ⚙️ | puntos | Negocio reactivó `nivelesActivos` |

> **Patrón:** Usan tipo `sistema` pero con `actorImagenUrl` (logo del negocio) y `actorNombre` (nombre del negocio). Se envían a **todos los clientes con billetera activa** en ese negocio. Sin `referenciaId` ni `referenciaTipo` — no navegan a ninguna página (se expanden inline al hacer click). Se disparan dentro de `actualizarConfigPuntos()` solo cuando `nivelesActivos` cambia de valor.

---

### Comerciales (al dueño/empleado)

#### Con usuario (nombre del cliente como título principal)

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 17 | `puntos_ganados` | `Compró ${monto}` | `Ganó {puntos} puntos` | 🎯 | scanya | Venta normal registrada |
| 17b | `puntos_ganados` | `Compró ${monto} con cupón` | `{cupón} • {puntos} pts` | 🎟️ | scanya | Venta con cupón en terminal |
| 17c | `puntos_ganados` | `Canjeó cupón` | `{cupón}` | 🎟️ | scanya | Cupón gratis canjeado |
| 18 | `voucher_cobrado` | `Recompensa entregada` | `Se entregó: {recompensa}` | ✅ | scanya | Recompensa validada y entregada |
| 19 | `voucher_pendiente` | `Recompensa por entregar` | `Canjeó sus puntos por: {recompensa}` | 🎟️ | cardya | Cliente canjeó puntos, pendiente entrega |
| 21 | `nueva_resena` | `Nueva reseña {estrellas}` | `"{texto}"` | ⭐ | resenas | Cliente publicó reseña |

> **actorNombre** = nombre completo del cliente. **actorImagenUrl** = avatar del cliente.
> El nombre del cliente NO va en el mensaje — ya se muestra grande en azul desde `actorNombre`.

#### Sin usuario (mensaje principal prominente)

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 20 | `stock_bajo` | `¡Stock bajo! Quedan {n}` | `La recompensa "{nombre}" se está agotando` | ⚠️ | cardya | Stock de recompensa bajo (1-2) |
| 20b | `stock_bajo` | `¡Recompensa agotada!` | `"{nombre}" ya no tiene stock disponible` | 🚫 | cardya | Stock agotado (0) |

> Sin `actorNombre`. El título se muestra prominente (`text-base font-bold`).

#### Alertas de Seguridad (Sprint 9 — 3 Abr 2026)

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 21 | `alerta_seguridad` | `{titulo alerta}` | `{descripcion alerta}` | ⚠️ | alertas | Solo severidad `alta`: monto_inusual, cliente_frecuente, empleado_destacado, caida_ventas, racha_resenas_negativas |

> Modo `comercial`. Sin `actorNombre`. Se envía al dueño + `notificarNegocioCompleto()` para empleados. `referenciaTipo: 'alerta'`. Socket.io emite `alerta:nueva`. `sucursalId` se toma de `alerta.sucursalId` cuando la alerta es específica de una sucursal; `null` si es a nivel negocio.

---

## Reglas de actorImagenUrl

**Notificaciones personales:** Siempre priorizar `negocioInfo.logoUrl` sobre la imagen del contenido.

```typescript
// ✅ Correcto — logo del negocio primero
actorImagenUrl: negocioInfo?.logoUrl ?? oferta.imagen ?? undefined,

// ❌ Incorrecto — imagen del contenido puede ocultar el logo
actorImagenUrl: oferta.imagen ?? negocioInfo?.logoUrl ?? undefined,
```

**Notificaciones comerciales con usuario:** Usar `cliente.avatarUrl`. Si no tiene avatar, el frontend genera iniciales automáticamente desde `actorNombre`.

**Notificaciones comerciales sin usuario:** Usar imagen del contenido (ej: `recompensa.imagenUrl`). Si no hay imagen ni nombre, se muestra el icono Lucide del tipo.

---

## Retrocompatibilidad (transformaciones legacy)

El frontend aplica transformaciones automáticas para notificaciones existentes en BD que tienen el formato anterior al rediseño v5.0.

### Comerciales — `limpiarMensajeComercial()`

| Patrón en mensaje | Transformación |
|-------------------|----------------|
| Línea === `actorNombre` | Se elimina |
| `{actorNombre} verbo...` | Se quita prefijo, se capitaliza (`"ganó" → "Ganó"`) |
| `{actorNombre}: texto` | Se quita prefijo `"Nombre: "` |
| `...texto a {actorNombre}` | Se quita sufijo `" a Nombre"` |
| `Canjeó: X` | → `Canjeó sus puntos por: X` |

### Comerciales — títulos

| Título legacy | Transformación |
|---------------|----------------|
| `Venta: $X` | → `Compró $X` |
| `Venta con cupón: $X` | → `Compró $X con cupón` |
| `Cupón canjeado` | → `Canjeó cupón` |
| `Nuevo voucher por entregar` | → `Recompensa por entregar` |
| `Voucher entregado` | → `Recompensa entregada` |

### Personales — títulos y mensajes

| Legacy | Transformación |
|--------|----------------|
| titulo `+N puntos` | → `Compra Registrada` + msg `+N puntos Ganados` |
| titulo `+N puntos con cupón` | → `Compra con Cupón` + msg `+N puntos Ganados` |
| msg `Compraste en` | → se oculta |
| msg `Canjeaste: X` | → `X — muestra el código en el negocio` |
| msg `Recibiste: X` | → `X` |
| titulo `Respondieron tu reseña` | → `Respondió tu reseña` |
| titulo `¡Oferta exclusiva para ti!` | → `¡Recibiste un Cupón Exclusivo!` |

---

## Archivos Involucrados

| Archivo | Notificaciones | Descripción |
|---------|---------------|-------------|
| `apps/api/src/services/notificaciones.service.ts` | — | `crearNotificacion()`, `notificarSucursal()`, `notificarNegocioCompleto()`, `obtenerNotificaciones()` y `contarNoLeidas()` con filtro por `sucursalId` |
| `apps/api/src/services/scanya.service.ts` | 5 | Ventas (normal, cupón, gratis) a dueño + gerente, voucher cobrado a dueño + gerente (elimina `voucher_pendiente` relacionado), recompensa desbloqueada (sellos) |
| `apps/api/src/services/ofertas.service.ts` | 8 | Cupones (asignar, recordatorio, reactivar, revocar), ofertas (nueva, activada, exclusiva) |
| `apps/api/src/services/puntos.service.ts` | 4 | Nueva recompensa, recompensa desbloqueada (compras frecuentes), sistema de niveles desactivado/activado |
| `apps/api/src/services/cardya.service.ts` | 4 | Voucher generado, voucher pendiente (dueño + todos los gerentes + empleados vía `notificarNegocioCompleto`), stock bajo/agotado (`sucursal_id=null`, evento de negocio) |
| `apps/api/src/services/resenas.service.ts` | 2 | Nueva reseña (dueño + gerente de la sucursal), respuesta reseña (al cliente) |
| `apps/api/src/services/alertas.service.ts` | 1 | Alerta de seguridad (dueño + empleados de la sucursal vía `notificarNegocioCompleto`) |
| `apps/web/src/components/layout/PanelNotificaciones.tsx` | — | Renderizado frontend (IconoNotificacion, ContenidoItem, 5 modos, expansión inline) |
| `apps/web/src/components/layout/MainLayout.tsx` | — | `useEffect` que recarga notificaciones al entrar/salir de `/business-studio/*` |
| `apps/web/src/types/notificaciones.ts` | — | Tipos TypeScript frontend (incluye `sucursalId`) |
| `apps/api/src/types/notificaciones.types.ts` | — | Tipos TypeScript backend |
| `apps/web/src/stores/useNotificacionesStore.ts` | — | Store Zustand + listener Socket.io. `agregarNotificacion` descarta notificaciones que no coinciden con la sucursal del contexto actual |
| `apps/web/src/stores/useAuthStore.ts` | — | `setSucursalActiva` dispara `cargarNotificaciones('comercial')` al cambiar sucursal en BS |
| `apps/web/src/services/notificacionesService.ts` | — | Wrapper Axios. Exporta `obtenerSucursalIdParaFiltro()` — calcula la sucursal del contexto actual (rol + URL) |
| `apps/web/src/services/api.ts` | — | `/notificaciones` incluido en `RUTAS_SIN_SUCURSAL` para que el interceptor no sobreescriba el `sucursalId` que el service envía explícitamente |
| `apps/api/src/controllers/notificaciones.controller.ts` | — | 5 controllers (listar, contar, marcar leída, marcar todas, eliminar). Los que listan leen `sucursalId` del query |
| `apps/api/src/routes/notificaciones.routes.ts` | — | Rutas protegidas con `verificarToken` |

---

## Patrón: Deep Link con Tabs (referencia CardYA)

Cuando una notificación navega a una página con tabs (ej: `/cardya?tab=vouchers&id=xxx`), hay dos problemas a resolver:

### 1. Navegación sin recarga cuando ya estás en la ruta

En `PanelNotificaciones.tsx`, si el usuario ya está en la ruta base, se usa `navigate(ruta, { replace: true })` en vez de navegación normal. Esto actualiza los query params sin recargar la vista.

### 2. No cambiar de tab si ya estás en el correcto

En el useEffect de deep links de la página destino, verificar `tab !== tabActiva` antes de llamar `setTabActivaInterno(tab)`.

### 3. Redireccionamiento inteligente entre tabs

Algunas notificaciones apuntan a un tab pero la entidad ya migró a otro. Ejemplo en CardYA: la notificación "Recompensa desbloqueada" apunta a `tab=recompensas`, pero si la recompensa ya fue canjeada, debe abrir el voucher en `tab=vouchers`.

**Implementación (referencia `PaginaCardYA.tsx`):**
- En el useEffect de searchParams, **antes** de cambiar de tab, verificar si la entidad requiere redireccionamiento
- Si detecta que debe ir a otro tab, cambiar `deepLinkTab` e `id` al destino correcto inmediatamente
- Esto evita el flash visual de pasar por un tab intermedio

**Aplicar este patrón** en cualquier página futura con tabs + deep links desde notificaciones.

---

## Pendientes

- [ ] Agregar campo `negocioLogoUrl` separado de `actorImagenUrl` para distinguir logo del negocio vs imagen del contenido
- [ ] Notificaciones pendientes de crear (cuando las secciones públicas se construyan): `nuevo_marketplace`, `nuevo_servicio`. Los tipos viejos (`nueva_dinamica`, `nuevo_empleo`) ya fueron limpiados del enum en Fase D del cleanup (visión v3, abril 2026).
- [ ] Notificación `nuevo_cliente` — aún no implementada en el backend
- [ ] Evaluar si los gerentes deben recibir `stock_bajo` / `agotado` (actualmente solo el dueño)
- [ ] Empleados ScanYA aún no tienen panel de notificaciones visible — las notificaciones se guardan para su `usuarioId` pero no hay UI
