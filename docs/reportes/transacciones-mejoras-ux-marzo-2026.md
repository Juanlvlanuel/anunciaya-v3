# Reporte: Auditoría de Tokens + Mejoras UX — Módulo Transacciones (Business Studio)

> **Fecha:** 13 Marzo 2026
> **Scope:** Módulo completo de Transacciones (página principal + 2 modales de detalle) + componente `Input.tsx` + `SISTEMA_TOKENS_DISENO.md`
> **Referencia:** `docs/estandares/SISTEMA_TOKENS_DISENO.md`

---

## Resumen Ejecutivo

Sesión de trabajo en dos fases sobre el módulo Transacciones de Business Studio. La **Fase 1** fue una auditoría completa de tokens de diseño (R1–R7) en los 3 archivos del módulo y el componente Input compartido, con corrección de todas las violaciones encontradas. La **Fase 2** fue de mejoras UX sobre la interfaz de filtros, header y KPIs, que derivó en 5 nuevas reglas documentadas en el sistema de tokens.

**Archivos modificados:** 5 archivos

---

## Fase 1 — Auditoría de Tokens de Diseño

### 1.1 `PaginaTransacciones.tsx`

#### R1 — Tamaños de texto
| Antes | Después | Contexto |
|-------|---------|----------|
| `text-[12px] lg:text-[10px] 2xl:text-[14px]` | `text-sm lg:text-[11px] 2xl:text-sm` | Badge de estado en lista móvil |
| `text-xs lg:text-[11px] 2xl:text-xs` | `text-sm lg:text-[11px] 2xl:text-sm` | Metadatos (fecha, operador) en cards móvil |
| `text-[10px] lg:text-[9px] 2xl:text-xs font-bold` | `text-sm lg:text-[11px] 2xl:text-sm font-bold` | Contador de resultados |
| `text-[11px] lg:text-[10px] 2xl:text-xs` | `text-sm lg:text-[11px] 2xl:text-sm` | Metadatos en tabla desktop |
| `<span className="text-xs font-bold ...">` | `text-sm font-bold` | Monto en vista tabla |
| `text-xs text-slate-500` (fila metadatos) | `text-sm text-slate-600` | Fila de metadatos en card |
| `text-[11px] ... 2xl:text-[13px] uppercase` | Corregido a `2xl:text-sm` | Headers de tabla |

#### R2 — Sin colores pálidos / sin opacidad en iconos
| Antes | Después | Contexto |
|-------|---------|----------|
| `text-slate-500` (x6 instancias) | `text-slate-600` | Varios textos secundarios |
| `text-slate-400` (x4 instancias) | `text-slate-600` | Iconos y texto terciario |
| `text-slate-300` (dash "—") | `text-slate-600` | Símbolo de vacío en tabla |
| `hover:bg-slate-50` | `hover:bg-slate-100` | Hover en items de lista (corregido luego a `slate-200` con regla refinada) |
| `hover:bg-blue-50` | `hover:bg-blue-100` (luego `blue-200`) | Hover en filas de tabla |
| `bg-indigo-50` (tab activo) | `bg-indigo-100` | Chip de tab seleccionado |
| `bg-blue-50 text-blue-500` (badge operador) | `bg-blue-100 text-blue-600` | Badge tipo empleado |
| `border border-slate-100 hover:border-slate-200` (cards) | `border border-slate-300 hover:border-slate-400` | Cards de lista móvil |
| `border border-slate-200 shadow-lg` | `border border-slate-300 shadow-lg` | Panel dropdown |
| `border border-slate-50 hover:bg-slate-50/80` (filas tabla) | `border-slate-200 hover:bg-slate-200` | Separador y hover de filas |
| `bg-slate-200/80 rounded-lg` (toggle container) | `bg-slate-200 rounded-lg` (sin opacidad) | Contenedor del toggle tabs |
| `bg-slate-50/30` (zebra) | `bg-slate-100` | Rayado zebra en tabla |
| `bg-slate-100` (estado inactivo toggle) | `bg-slate-200` | Color del botón inactivo en toggle |
| `background: linear-gradient(#f1f5f9, #e2e8f0)` | `linear-gradient(#e2e8f0, #cbd5e1)` | Botón Reporte |
| `text-slate-400` (expiración sin fecha) | `text-slate-600` | Color de fecha vacía |
| `Eye w-4 h-4 text-slate-300` | `text-slate-600` | Icono de ojo en tabla |
| `text-slate-400 line-through` (revocada) | `text-slate-600 line-through` | Texto tachado en canje revocado |
| `text-slate-400 group-hover:text-amber-300` | `text-slate-600 group-hover:...` | Icono ArrowUpDown en tabla |
| `text-slate-400` (icono sort) | `text-slate-600` | Icono de orden |
| `rounded-full text-slate-400 hover:text-slate-600` (X clear) | `text-slate-600 hover:text-slate-800` | Botón limpiar búsqueda |

#### Refinamiento de R2 durante la sesión — regla de hovers

Mientras se aplicaban correcciones, se descubrió que `hover:bg-slate-100` (en items dentro de cards) sigue siendo demasiado pálido. Se estableció la regla:

> **Hovers mínimo `slate-200`** para cualquier elemento con hover de fondo. Actualizado en el documento de tokens.

Consecuencia: todos los `hover:bg-slate-100` en items de lista y filas de tabla fueron cambiados a `hover:bg-slate-200`.

#### R2 — Avatares fallback (nueva regla descubierta)

Los avatares de cliente (iniciales) usaban `bg-slate-100 text-slate-600`. Se cambió a **color fijo indigo**:

```
bg-indigo-100 → text-indigo-700
```

Aplicado en las 4 instancias: lista móvil ventas, tabla desktop ventas, lista móvil canjes, tabla desktop canjes.

#### R3 — Mínimo `font-medium`

- `font-medium` → `font-semibold` en botones de filtro (dropdown triggers y chips)

#### Badges de estado de chips (chips circulares en lista y tabla)

Removido el `border-2` de los badges circulares pequeños (confirmado/cancelado/pendiente). La nueva configuración:

```
rounded-full text-sm font-bold bg-amber-100 text-amber-700   (pendiente)
rounded-full text-sm font-bold bg-red-100 text-red-700       (cancelado)
rounded-full text-sm font-bold bg-green-100 text-green-700   (confirmado)
```

#### Regla de contornos (R6 — nueva)

Descubierta al auditar: todos los `border` (1px) en elementos interactivos deben ser `border-2` (2px). Cambios:

| Elemento | Antes | Después |
|----------|-------|---------|
| Cards de transacción (lista móvil) | `border` | `border-2` |
| Chip de estado (todos los colores) | `border ${config.border}` | `border-2 ${config.border}` |
| Chips de filtro (Todas/Válidas/Revocadas, etc.) | `border` | `border-2` |
| Filter card container | `border border-slate-300` | `border-2 border-slate-300` |

#### Estado select → Dropdown (Fase 1)

El filtro de Estado en móvil era un `<select>` nativo con `appearance-none`. Se convirtió a dropdown custom con el mismo patrón que Operador, para mantener consistencia de R12.

- Agregado `estadoDropdownRef` + `estadoDropdownAbierto` state
- Agregado `useEffect` de cierre por `mousedown` fuera del ref
- Operador text span: `hidden lg:inline-block max-w-[100px]` → `inline-block max-w-[140px] lg:max-w-[120px]` → finalmente `min-w-0 truncate`

#### Chevrones en dropdowns

- Antes: `w-3.5 h-3.5 shrink-0 opacity-50` / `w-3.5 h-3.5 shrink-0 opacity-60`
- Después: `w-5 h-5 shrink-0` (sin opacidad)

#### Layout de la sección de filtros

Antes: `flex flex-col lg:flex-row` — todos los controles en una fila en laptop.
Después: dos filas separadas (`flex flex-col gap-2`):
- **Fila 1:** Período + Estado (chips laptop / dropdown móvil) + Operador + Reporte (laptop)
- **Fila 2:** Buscador + Reporte (móvil)

#### Panel del dropdown Período

- Ancho: `w-40` fijo → `w-36 lg:w-40` (más estrecho en móvil, igual en laptop)

#### Padding del filter card

- `p-4 lg:p-3 2xl:p-4` → `p-2.5 lg:p-3 2xl:p-4`

---

### 1.2 `ModalDetalleTransaccionBS.tsx`

#### R1 — Tamaños de texto
| Antes | Después |
|-------|---------|
| `text-xs lg:text-[11px] 2xl:text-xs font-medium` | `text-sm lg:text-[11px] 2xl:text-sm font-medium` |
| `text-white/60 text-xs font-medium` (label "Monto") | `text-white/60 text-sm font-medium` |
| `text-xs lg:text-[11px] 2xl:text-xs text-slate-400` | `text-sm lg:text-[11px] 2xl:text-sm text-slate-600` |

#### R2 — Sin colores pálidos
| Antes | Después |
|-------|---------|
| `border-b border-slate-100` | `border-b border-slate-300` |
| `User className="... text-slate-500"` | `text-slate-600` |
| `bg-emerald-50` (badge cliente fidelidad) | `bg-emerald-100` |
| `text-blue-500` (User icon) | `text-blue-600` |
| `text-purple-500` (icono operador) | `text-purple-600` |
| `CreditCard className="... text-slate-400"` | `text-slate-600` |
| `Clock className="... text-slate-400"` (x2) | `text-slate-600` |
| `DollarSign className="... text-slate-500"` | `text-slate-600` |
| `bg-red-50/50 rounded-xl` (sección revocar) | `bg-red-100 rounded-xl` |
| `border border-red-200` (input motivo) | `border-2 border-red-300` |
| `border border-slate-200` (botón cancelar) | `border-2 border-slate-300` |
| `bg-red-50 border border-red-100` (error box) | `bg-red-100 border-2 border-red-200` |
| `hover:bg-slate-100` | `hover:bg-slate-200` |
| `hover:bg-red-100` (botón revocar hover) | `hover:bg-red-200` |
| `text-red-500 mt-1.5` (error message) | `text-red-600 font-medium mt-1.5` |

#### R6 — Contornos `border-2`
| Antes | Después |
|-------|---------|
| `border border-emerald-200` (sección estado) | `border-2 border-emerald-300` |
| `border border-blue-200` | `border-2 border-blue-300` |
| `border border-violet-200` | `border-2 border-violet-300` |
| `border border-slate-300` | `border-2 border-slate-300` |
| `border border-red-300` | `border-2 border-red-300` |
| `border border-dashed border-slate-300` | `border-2 border-dashed border-slate-300` |

#### Badge cliente fidelidad
Eliminado el border del badge pequeño circular:
- Antes: `rounded-full bg-emerald-100 text-emerald-600 font-semibold border-2 border-emerald-300`
- Después: `rounded-full bg-emerald-100 text-emerald-700 font-semibold`

#### Secciones de estado: eliminados bordes de contenedores de fondo coloreado
- `rounded-lg bg-emerald-100 border-2 border-emerald-300` → `rounded-lg bg-emerald-100`
- `rounded-lg bg-blue-100 border-2 border-blue-300` → `rounded-lg bg-blue-100`
- `rounded-lg bg-violet-100 border-2 border-violet-300` → `rounded-lg bg-violet-100`

#### Avatar cliente → indigo
- `w-8 h-8 ... rounded-lg bg-slate-100` → `rounded-lg bg-indigo-100` (icono de cliente con letra inicial)

#### `FilaDetalle` — prop `colorFondo` agregada
Refactorización del componente interno para soporte de fondo coloreado en algunas filas, sin cambio visual en las neutras.

---

### 1.3 `ModalDetalleCanjeBS.tsx`

#### R1 — Tamaños de texto
| Antes | Después |
|-------|---------|
| `text-xs lg:text-[11px] 2xl:text-xs font-medium` | `text-sm lg:text-[11px] 2xl:text-sm font-medium` |
| `text-xs lg:text-[11px] 2xl:text-xs text-slate-400` | `text-sm lg:text-[11px] 2xl:text-sm text-slate-600` |
| `text-xs lg:text-[10px] 2xl:text-xs text-slate-400 mt-*` | `text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mt-*` |
| `text-xs mt-0.5 font-medium` (expiración) | `text-sm mt-0.5 font-medium` |
| `text-white/60 text-xs font-medium` (label "Puntos") | `text-white/60 text-sm font-medium` |

#### R2 — Sin colores pálidos
| Antes | Después |
|-------|---------|
| `border-b border-slate-100` | `border-b border-slate-300` |
| `User className="... text-slate-500"` | `text-slate-600` |
| `Gift className="... text-purple-500"` | `text-purple-600` |
| `Clock className="... text-slate-400"` | `text-slate-600` |
| `MapPin className="... text-purple-500"` | `text-purple-600` |
| `Star className="... text-amber-500"` | `text-amber-600` |
| `CheckCircle className="... text-emerald-500"` | `text-emerald-600` |
| `Calendar className="... text-slate-400"` | `text-slate-600` |
| `bg-blue-50 border border-blue-100` (sección info) | `bg-blue-100 border-2 border-blue-300` |
| `bg-emerald-50 border border-emerald-100` (sección estado) | `bg-emerald-100 border-2 border-emerald-300` |
| `bg-red-50 border border-red-100` (sección error) | `bg-red-100 border-2 border-red-300` |

#### `FilaDetalle` — prop `colorFondo` agregada
Misma refactorización que en el modal de ventas.

#### Avatar cliente → indigo
`bg-slate-100 / bg-purple-100` → `bg-indigo-100` con iniciales en `text-indigo-700`.

---

### 1.4 `Input.tsx` (componente compartido)

> ⚠️ Componente UI usado en toda la app. Cambios afectan a todos los módulos.

| Elemento | Antes | Después |
|----------|-------|---------|
| Tamaño label | `text-xs` | `text-sm` (R1) |
| Fondo del input | `bg-slate-50` | `bg-slate-100` (excepción documentada para fondos de input) |
| Borde neutral | `border-slate-200 focus:border-blue-500` | `border-slate-300 focus:border-blue-500` (R2) |
| Color icono neutral | `text-slate-400` | `text-slate-600` (R2) |
| Color botón password | `text-slate-400 hover:text-slate-800` | `text-slate-600 hover:text-slate-800` (R2) |
| Mensaje de error | `text-xs text-red-500` | `text-sm text-red-600` (R1 + R2) |
| Texto de ayuda | `text-xs text-slate-500` | `text-sm text-slate-600` (R1 + R2) |

---

## Fase 2 — Mejoras UX e Interfaz

### 2.1 Dropdowns de Filtro — Refinamientos R12

#### Dropdowns Período y Estado → Variante Indigo

Antes de esta fase, Período usaba colores slate y Estado usaba un `<select>` nativo convertido a dropdown.

**Unificación de variante de color — solo indigo:**

| Estado del ítem | Clases |
|-----------------|--------|
| Activo | `bg-indigo-100 text-indigo-700 font-semibold` |
| Inactivo | `text-slate-600 hover:bg-slate-200 font-medium` |
| Círculo activo | `bg-indigo-500` con `Check` blanco |
| Círculo inactivo | `bg-slate-200` |
| Botón sin selección | `bg-white border-slate-300 text-slate-600 hover:border-slate-400` |
| Botón con selección | `bg-indigo-100 border-indigo-300 text-indigo-700` |

Aplicado a los 3 dropdowns. Anteriormente se usaba variante `emerald` para el dropdown Período (cambiada a `indigo` con `replace_all`). El `bg-indigo-600` en los círculos fue normalizado a `bg-indigo-500`.

#### Período — "Todo" al principio

`PERIODOS_CONFIG`: ítem `{ id: 'todo', etiqueta: 'Todo' }` movido al índice 0. Cuando "Todo" está seleccionado, el botón adopta estado visual "sin filtro" (`bg-white border-slate-300`), no indigo.

#### Operador — Fixes específicos

- **Wrapper:** `relative` → `flex-1 min-w-0 lg:flex-none lg:shrink-0 relative`
- **Botón:** `w-full` agregado; `opacity-60` eliminado del icono `Users` (R2)
- **Panel:** `w-56` → `w-64` (para que "Todos los operadores" entre en una línea)
- **Span de texto:** `min-w-0 truncate`

### 2.2 Desbordamiento de filtros en fila

**Problema:** Múltiples dropdowns en `flex row` → desbordamiento en móvil.

**Solución — patrón diferenciado:**
```
Dropdown variable (Operador):  flex-1 min-w-0 lg:flex-none lg:shrink-0
Dropdowns fijos (Período, Estado): shrink-0
```

### 2.3 Header — Toggle Ventas/Canjes

#### Botones icon-only

| Resolución | Tamaño | Icono |
|------------|--------|-------|
| Móvil | `h-10 w-10` | `DollarSign`/`Gift` `w-5 h-5` |
| Laptop | `h-9 2xl:h-10 w-9 2xl:w-10` | `w-4 h-4 2xl:w-5 2xl:h-5` |

#### Toggle inline con el título en móvil

```tsx
<div className="flex items-center gap-2 lg:block">
  <div> {/* título + subtítulo */} </div>
  <div className="lg:hidden flex items-center bg-slate-200 rounded-lg ...">
    {/* toggle móvil */}
  </div>
</div>
```

#### Subtítulos dinámicos

| Vista | Texto |
|-------|-------|
| Móvil | "Ventas y Canjes" — fijo, `text-base -mt-1 font-medium` |
| Laptop+ | Dinámico: "Historial de ventas y canjes" / "Vouchers de recompensas" |

### 2.4 KPI Cards en Laptop

| Propiedad | Antes | Después |
|-----------|-------|---------|
| Alto | `h-13 2xl:h-16` | `h-13 lg:h-auto 2xl:h-16` |
| Padding | `py-1.5` | `py-1.5 lg:py-1 2xl:py-1.5` |
| Ancho mínimo | `min-w-[100px]` | `min-w-[100px] lg:min-w-[90px] 2xl:min-w-[100px]` |

Aplicado a los 8 cards (4 ventas + 4 canjes).

### 2.5 Botón Reporte — Tooltip y Alineación

- Tooltip `"Descargar CSV con los filtros activos"` en ambas versiones (móvil `position="top"`, laptop `position="bottom"`)
- Fix de alineación: se envolvió en `<div className="hidden lg:flex ml-auto shrink-0">` porque el `Tooltip` renderiza `div.relative.inline-block` que tomaba el rol de flex item

### 2.6 Toggle — Tooltip en iconos

- `text="Historial de ventas"` / `text="Vouchers de recompensas"`, `position="bottom"` en ambos
- Import agregado: `import Tooltip from '../../../../components/ui/Tooltip'`

### 2.7 Buscador — Ancho completo en PC (bug)

**Causa raíz:** El `Tooltip` del botón Reporte móvil renderizaba su wrapper `div.relative.inline-block` en todos los breakpoints (el `lg:hidden` estaba en el `<button>`, no en el contenedor del Tooltip).

**Solución:**
```tsx
{/* lg:hidden en el contenedor, no en el botón */}
<div className="lg:hidden shrink-0">
  <Tooltip ...>
    <button ...>Reporte</button>
  </Tooltip>
</div>
```

También: `w-full` + `min-w-0` al contenedor Fila 2 y al wrapper del input. Aplicado en Fila 2 de ventas y de canjes.

---

## Nuevas Reglas Añadidas a `SISTEMA_TOKENS_DISENO.md`

| # | Regla | Descripción |
|---|-------|-------------|
| R2 actualizada | Hovers | Mínimo variante `-200` (no `-100`) para hovers de cualquier elemento dentro de cards |
| R2 + | Avatares fallback | Color fijo: `bg-indigo-100 text-indigo-700` |
| R2 + | Fondos slate | Mínimo `bg-slate-200` en general; excepción: `bg-slate-100` permitido en rayado zebra y fondo de `<input>` |
| R6 nueva | Grosor de contornos | `border-2` estándar para botones, inputs, cards, panels. `border-1` solo en separadores internos (`border-b`, etc.) |
| R9 nueva | Altura elementos interactivos | `h-10 lg:h-9 2xl:h-10` para botones e inputs |
| R11 nueva | Tipografía de botones | `font-semibold` en botones activos/con selección; `font-medium` en botones inactivos |
| R12 ampliada | Anatomía de dropdown | Chevron `w-5 h-5` sin opacidad; texto con `truncate min-w-0`; layout en fila flex (`flex-1 min-w-0 lg:flex-none`); variante única: indigo |
| R14 nueva | Padding horizontal | `pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5` en dropdowns |

---

## Fase 3 — Correcciones Finales de Tokens + Ajustes Responsive

### 3.1 Correcciones R3 pendientes (`font-medium`)

Siete violaciones identificadas en la auditoría final y corregidas:

| Archivo | Elemento | Fix |
|---------|----------|-----|
| `ModalDetalleTransaccionBS.tsx` | `"Los puntos fueron devueltos al saldo del cliente."` | `font-medium` agregado |
| `ModalDetalleCanjeBS.tsx` | `"El cliente puede presentar este voucher..."` (pendiente) | `font-medium` agregado |
| `ModalDetalleCanjeBS.tsx` | `"La recompensa fue entregada al cliente."` (usado) | `font-medium` agregado |
| `ModalDetalleCanjeBS.tsx` | `"Este voucher expiró sin ser canjeado..."` (expirado) | `font-medium` agregado |
| `PaginaTransacciones.tsx` | Teléfono cliente en tabla ventas | `font-medium` agregado |
| `PaginaTransacciones.tsx` | Teléfono cliente en tabla canjes | `font-medium` agregado |

### 3.2 Corrección R9 — Chips de Estado (laptop)

Los chips "Todas/Válidas/Revocadas" (tab ventas) y "Todos/Pendientes/Usados/Vencidos" (tab canjes) en la barra de filtros laptop usaban padding vertical en lugar de altura fija:

| Antes | Después |
|-------|---------|
| `px-3 2xl:px-4 py-1.5 2xl:py-2` | `px-3 2xl:px-4 h-9 2xl:h-10 flex items-center` |

Aplicado a los 2 grupos de chips (ventas y canjes).

### 3.3 Ajustes Responsive — Layout Móvil

#### Toggle Ventas/Canjes — Justificado a la derecha

En móvil, el toggle quedaba pegado al título. Se reestructuró para que ocupe el extremo derecho:

```tsx
{/* Contenedor header: w-full en móvil */}
<div className="flex items-center gap-4 w-full lg:w-auto shrink-0 mb-3 lg:mb-0">
  {/* Bloque título: flex-1 + justify-between empuja el toggle */}
  <div className="flex-1 flex items-center justify-between lg:block">
    <div>{/* título + subtítulo */}</div>
    <div className="lg:hidden flex items-center ...">{/* toggle */}</div>
  </div>
</div>
```

#### KPIs — Posicionados junto al card de filtros en móvil

En móvil los KPIs deben aparecer cerca del card de filtros (no del header). Se añadió margen al carousel:

```tsx
<div className="mt-5 lg:mt-0 overflow-x-auto lg:overflow-visible lg:flex-1 tx-carousel">
```

- `mt-5` en móvil: crea 20px de separación desde el bloque título. Sumado al `mb-3` del bloque título = 32px total (igual que el `space-y-8` del Dashboard entre header y pills).
- `lg:mt-0` en laptop+: cancela el margen — sin impacto en PC.

#### Espaciado del contenedor principal

| Breakpoint | Valor | Razón |
|------------|-------|-------|
| Móvil | `space-y-3` | KPIs pegados al card de filtros |
| Laptop | `lg:space-y-2` | Tabla "pegada" — igual que Clientes |
| Desktop | `2xl:space-y-3` | Tabla "pegada" — igual que Clientes |

#### Card de filtros — margen laptop/desktop restaurado

El card de filtros recuperó su margen en PC para mantener el espaciado original:

```
lg:mt-7 2xl:mt-14
```

Sin `mt-*` en móvil — el gap lo controla el `space-y-3` del contenedor.

### 3.4 Tamaño de texto — Título y Subtítulo

El subtítulo del header de Transacciones se ajustó para coincidir con el patrón del Dashboard:

| | Antes | Después |
|---|-------|---------|
| Subtítulo móvil | `text-sm mt-0.5` (oculto en mobile) | `text-base -mt-1` |
| Subtítulo desktop | `text-sm lg:text-sm 2xl:text-base mt-0.5` | sin cambio |

---

## Archivos Modificados

| Archivo | Fase | Descripción |
|---------|------|-------------|
| `apps/web/src/pages/private/business-studio/transacciones/PaginaTransacciones.tsx` | 1 + 2 + 3 | Auditoría completa + mejoras UX + ajustes responsive |
| `apps/web/src/pages/private/business-studio/transacciones/ModalDetalleTransaccionBS.tsx` | 1 + 3 | Auditoría de tokens + corrección R3 final |
| `apps/web/src/pages/private/business-studio/transacciones/ModalDetalleCanjeBS.tsx` | 1 + 3 | Auditoría de tokens + 3 correcciones R3 finales |
| `apps/web/src/components/ui/Input.tsx` | 1 | Auditoría de tokens (componente compartido) |
| `docs/estandares/SISTEMA_TOKENS_DISENO.md` | 1 + 2 | 8 reglas nuevas o actualizadas |
