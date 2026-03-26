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
| `titulo` | string | Línea principal visible |
| `mensaje` | string | Detalle. Usa `\n` para separar contenido del nombre del negocio |
| `icono` | string (emoji) | Emoji decorativo |
| `actorImagenUrl` | string \| null | Logo del negocio (prioridad) o imagen del contenido (fallback) |
| `actorNombre` | string \| null | Nombre del negocio (personal) o del cliente (comercial) |
| `referenciaId` | string \| null | ID de la entidad relacionada |
| `referenciaTipo` | string \| null | Tipo de entidad: `transaccion`, `voucher`, `oferta`, `cupon`, `recompensa`, `resena` |

---

## Patrón de Mensaje

Las notificaciones **personales** (al cliente) siguen el patrón:

```
mensaje: `${contenido}\n${nombreNegocio}`
```

El `\n` permite que el frontend separe el nombre del negocio y lo muestre con jerarquía visual diferente.

Las notificaciones **comerciales** (al dueño) no siguen este patrón — muestran datos del cliente, no del negocio.

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
| `nueva_dinamica` | Megaphone | Índigo | `#6366f1 → #4338ca` |
| `nuevo_empleo` | Briefcase | Azul cielo | `#0ea5e9 → #0369a1` |
| `sistema` | Settings | Gris | `#64748b → #475569` |

**Regla:** Cada tipo tiene icono y color únicos. No repetir combinaciones.

---

## Frontend — Jerarquía Visual

Cuando la notificación tiene `actorNombre` y el mensaje contiene `\n`:

1. **Nombre del negocio** — `text-base font-bold text-blue-800`
2. **Título** — `text-sm font-bold text-slate-900` (no leída) / `text-slate-700` (leída)
3. **Mensaje** — `text-sm font-medium text-slate-600` (primera línea antes del `\n`)
4. **Tiempo** — `text-sm font-medium text-blue-700`

El círculo grande muestra el logo del negocio (o icono del tipo como placeholder). El badge pequeño superpuesto muestra el icono del tipo con su gradiente.

---

## Catálogo de Notificaciones

### Personales (al cliente)

#### Puntos y Ventas

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 1 | `puntos_ganados` | `+{puntos} puntos` | `Compraste en\n{negocio}` | 🎯 | scanya | Venta normal registrada |
| 2 | `puntos_ganados` | `+{puntos} puntos con cupón` | `{tituloOferta}\n{negocio}` | 🎟️ | scanya | Venta con cupón aplicado |
| 3 | `puntos_ganados` | `¡Cupón canjeado!` | `{tituloOferta}\n{negocio}` | 🎟️ | scanya | Cupón gratis (monto $0) |

#### Cupones

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 4 | `cupon_asignado` | `{tipoInfo}` | `{tituloOferta}\n{negocio}` | 🎟️ | ofertas | Cupón privado asignado al crear |
| 5 | `cupon_asignado` | `¡Recordatorio de cupón!` | `{tituloOferta}\n{negocio}` | 🎟️ | ofertas | Reenvío de cupón |
| 6 | `cupon_asignado` | `¡Tu cupón fue reactivado!` | `{tituloOferta}\n{negocio}` | 🎟️ | ofertas | Cupón revocado → reactivado |
| 7 | `cupon_revocado` | `Cupón revocado` | `{tituloOferta}\n{negocio}\nMotivo: {motivo}` | ❌ | ofertas | Revocación individual |
| 8 | `cupon_revocado` | `Cupón revocado` | `{tituloOferta}\n{negocio}\nMotivo: {motivo}` | ❌ | ofertas | Revocación masiva |

#### Ofertas

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 9 | `nueva_oferta` | `¡Nueva oferta!` | `{tituloOferta}\n{negocio}` | 🏷️ | ofertas | Oferta pública creada |
| 10 | `nueva_oferta` | `¡Nueva oferta!` | `{tituloOferta}\n{negocio}` | 🏷️ | ofertas | Oferta inactiva → activada |
| 11 | `nueva_oferta` | `¡Oferta exclusiva para ti!` | `{tituloOferta}\n{negocio}` | 🎟️ | ofertas | Oferta exclusiva asignada |

#### Recompensas y Vouchers

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 12 | `nueva_recompensa` | `¡Nueva recompensa disponible!` | `{nombre} ({puntos} pts)\n{negocio}` | 🎁 | puntos | Recompensa creada en CardYA |
| 13 | `recompensa_desbloqueada` | `¡Recompensa desbloqueada!` | `{nombre} — completaste {n} compras\n{negocio}` | 🎉 | puntos | Cliente alcanzó compras frecuentes |
| 14 | `voucher_generado` | `¡Recompensa canjeada!` | `Canjeaste: {nombre}\n{negocio}` | 🎟️ | cardya | Cliente canjeó puntos por recompensa |
| 15 | `voucher_cobrado` | `¡Recompensa entregada!` | `Recibiste: {nombre}\n{negocio}` | 🎟️ | scanya | Negocio validó/entregó el voucher |

#### Reseñas

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 16 | `nueva_resena` | `{negocio} respondió tu reseña` | `"{texto}"` | 💬 | resenas | Negocio respondió reseña del cliente |

---

### Comerciales (al dueño/empleado)

| # | Tipo | Título | Mensaje | Icono | Servicio | Contexto |
|---|------|--------|---------|-------|----------|----------|
| 17 | `puntos_ganados` | `Venta: ${monto}` | `{cliente} ganó {puntos} puntos` | 🎯 | scanya | Venta registrada en terminal |
| 17b | `puntos_ganados` | `Venta con cupón: ${monto}` | `{cliente}\n{cupón} • {puntos} pts` | 🎟️ | scanya | Venta con cupón en terminal |
| 17c | `puntos_ganados` | `Cupón canjeado` | `{cliente}\n{cupón}` | 🎟️ | scanya | Cupón gratis canjeado |
| 18 | `voucher_cobrado` | `Voucher entregado` | `Se entregó: {recompensa} a {cliente}` | ✅ | scanya | Voucher validado y entregado |
| 19 | `voucher_pendiente` | `Nuevo voucher por entregar` | `{cliente} canjeó: {recompensa}` | 🎟️ | cardya | Cliente canjeó voucher, pendiente entrega |
| 20 | `stock_bajo` | `¡Stock bajo! Quedan {n}` | `La recompensa "{nombre}" se está agotando` | ⚠️ | cardya | Stock de recompensa bajo (1-2) |
| 20b | `stock_bajo` | `¡Recompensa agotada!` | `"{nombre}" ya no tiene stock disponible` | 🚫 | cardya | Stock agotado (0) |
| 21 | `nueva_resena` | `Nueva reseña {estrellas}` | `{cliente}: "{texto}"` | ⭐ | resenas | Cliente publicó reseña |

---

## Reglas de actorImagenUrl

**Notificaciones personales:** Siempre priorizar `negocioInfo.logoUrl` sobre la imagen del contenido.

```typescript
// ✅ Correcto — logo del negocio primero
actorImagenUrl: negocioInfo?.logoUrl ?? oferta.imagen ?? undefined,

// ❌ Incorrecto — imagen del contenido puede ocultar el logo
actorImagenUrl: oferta.imagen ?? negocioInfo?.logoUrl ?? undefined,
```

**Notificaciones comerciales:** Usar `cliente.avatarUrl` ya que el dueño quiere ver quién es el cliente.

---

## Archivos Involucrados

| Archivo | Notificaciones | Descripción |
|---------|---------------|-------------|
| `apps/api/src/services/notificaciones.service.ts` | — | Define `crearNotificacion()` |
| `apps/api/src/services/scanya.service.ts` | 4 | Puntos, cupón canjeado, voucher cobrado |
| `apps/api/src/services/ofertas.service.ts` | 8 | Cupones, ofertas, revocaciones |
| `apps/api/src/services/puntos.service.ts` | 2 | Recompensas |
| `apps/api/src/services/cardya.service.ts` | 4 | Vouchers, stock bajo |
| `apps/api/src/services/resenas.service.ts` | 2 | Reseñas |
| `apps/web/src/components/layout/PanelNotificaciones.tsx` | — | Renderizado frontend |
| `apps/web/src/types/notificaciones.ts` | — | Tipos TypeScript |
| `apps/web/src/stores/useNotificacionesStore.ts` | — | Store Zustand |

---

## Pendientes

- [ ] Agregar campo `negocioLogoUrl` separado de `actorImagenUrl` para distinguir logo del negocio vs imagen del contenido
- [ ] Estandarizar TODAS las notificaciones con el patrón `mensaje: contenido\nnegocio` para personales
- [ ] Notificaciones pendientes de crear: `nuevo_marketplace`, `nueva_dinamica`, `nuevo_empleo` (secciones placeholder)
