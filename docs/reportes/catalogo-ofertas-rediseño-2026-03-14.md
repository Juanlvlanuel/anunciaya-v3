# Reporte de Implementación — Catálogo y Ofertas
**Fecha:** 14 de marzo de 2026
**Sesión:** Rediseño completo Catálogo + Ofertas, estandarización tokens, patrones responsive

---

## Resumen Ejecutivo

Se completó el rediseño visual completo de dos módulos de Business Studio — **Catálogo** y **Ofertas** — para que sigan el mismo patrón de diseño que Clientes/Transacciones: tabla con header oscuro en desktop, cards horizontales en móvil. Se corrigieron todas las violaciones de tokens del sistema de diseño y se implementaron mejoras funcionales en Dashboard.

---

## Archivos Modificados

| Archivo | Tipo de Cambio |
|---------|---------------|
| `apps/web/src/pages/private/business-studio/catalogo/PaginaCatalogo.tsx` | Reescritura mayor |
| `apps/web/src/pages/private/business-studio/catalogo/ModalArticulo.tsx` | Corrección tokens |
| `apps/web/src/pages/private/business-studio/catalogo/ModalDuplicar.tsx` | Corrección bordes |
| `apps/web/src/pages/private/business-studio/ofertas/PaginaOfertas.tsx` | Reescritura mayor |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/HeaderDashboard.tsx` | Selector periodo → dark gradient |
| `apps/web/src/pages/private/business-studio/dashboard/PaginaDashboard.tsx` | Selector periodo móvil → dark gradient |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/GraficaColapsable.tsx` | Auto-scroll móvil |

---

## 1. PaginaCatalogo.tsx — Rediseño Completo

### Antes
- Grid de 3 columnas de cards con sombras agresivas (`shadow-lg`, `hover:shadow-2xl`)
- Hover con `scale-[1.02] -translate-y-1`
- Botones de acción con gradientes pesados
- Chips de filtro `bg-blue-500` con `lg:scale-105`
- Labels KPI `text-[10px] text-slate-500` (violación de tokens)
- Sin ordenación, sin contador de resultados

### Después

#### Layout General
```
p-3 lg:p-1.5 2xl:p-3
max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto
space-y-3 lg:space-y-2 2xl:space-y-3
```

#### Header + KPIs
- Icono animado 52×52 con gradiente cyan
- Subtítulo estandarizado: `text-base lg:text-sm 2xl:text-base text-slate-600`
- 4 KPIs informativos (Total, Productos, Servicios, Destacados) en carousel horizontal
- Sin `hover:-translate-y-0.5` en KPIs

#### Card de Filtros
```
bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300
```
- Chips de tipo: Todos / Productos / Servicios
  - Activo: `bg-slate-800 text-white border-slate-800`
  - Inactivo: `bg-white text-slate-600 border-slate-300`
  - Dimensiones: `px-3 2xl:px-4 h-10 lg:h-9 2xl:h-10 text-sm lg:text-xs 2xl:text-sm font-semibold border-2`
- Chips de categoría (scroll horizontal)
- Input búsqueda con botón X para limpiar
- Botón "Nuevo Artículo" con dark gradient

#### Tabla Desktop (≥lg)
**Header oscuro:**
```css
background: linear-gradient(135deg, #1e293b, #334155)
```
**Columnas:**
```
grid-cols-[minmax(0,1fr)_90px_90px_80px_80px_100px_120px]
2xl:grid-cols-[minmax(0,1fr)_110px_110px_90px_90px_120px_160px]
```

| Columna | Contenido |
|---------|-----------|
| Artículo | Thumbnail + Nombre + Categoría |
| Tipo | Badge "Producto"/"Servicio" con `whitespace-nowrap` |
| Precio | `font-bold text-emerald-600` |
| Vistas | Número + icono Eye |
| Ventas | Número + icono ShoppingCart |
| Estado | Badges + Star destacado |
| Acciones | Editar / Eliminar / Duplicar (icon buttons sutiles) |

- Filas alternadas: `bg-white` / `bg-slate-100`
- Hover: `hover:bg-slate-200 transition-colors`
- Headers ordenables por Precio, Vistas, Ventas con flechas amber

#### Cards Móvil (<lg)
**FilaMovil — componente horizontal:**
```
w-full flex items-center gap-3 p-3 rounded-xl bg-white border-2 border-slate-300
```
- Imagen `w-12 h-12 rounded-lg`
- Info: nombre + badge tipo + métricas
- Acciones en la parte inferior derecha: **Duplicar** (izquierda) + **Eliminar** (derecha), `w-6 h-6`, sin recuadro, `gap-3`
- Props: `onEliminar`, `onDuplicar`, `esDueno`

#### Chips de Orden Móvil
Precio / Vistas / Ventas — mismo estilo dark gradient cuando activo

#### Contador de Resultados
```
text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium
"X artículos" / "X de Y artículos"
```

---

## 2. ModalArticulo.tsx — Corrección de Tokens

| Elemento | Antes | Después |
|----------|-------|---------|
| Texto "Click para subir" | `text-[10px] text-slate-400` | `text-[11px] text-slate-600` |

---

## 3. ModalDuplicar.tsx — Corrección de Bordes

| Elemento | Antes | Después |
|----------|-------|---------|
| Preview artículo | `border border-slate-200` | `border-2 border-slate-300` |
| Cards sucursal inactivas | `border-slate-200 hover:border-slate-300` | `border-slate-300 hover:border-slate-400` |
| Footer | `border-t border-slate-200` | `border-t-2 border-slate-300` |

---

## 4. PaginaOfertas.tsx — Rediseño Completo

### Antes
- Grid de cards con `CardOferta`
- Switch en header móvil
- Sin tabla desktop
- Filtros con chips de colores variados
- Columna "FECHAS"

### Después

#### Header
- **Desktop:** Icono + título + subtítulo "Crea promociones" + acciones rápidas
- **Móvil:** Se eliminó el switch; se añadió botón **"+Nueva Oferta"** con dark gradient:
```tsx
style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', border: '1.5px solid #1e293b' }}
```

#### KPIs (5 cards informativas, no clickeables)
- Total de Ofertas
- Activas
- Inactivas
- Próximas a vencer
- Vencidas

#### Card de Filtros — 2 Dropdowns

**Dropdown Estado** (6 opciones: Todos / Activas / Inactivas / Próximas / Vencidas / Agotadas):
- Tono indigo cuando activo: `bg-indigo-100 border-indigo-300 text-indigo-700`
- `flex-1 lg:flex-none` en container (evita overflow en móvil)
- `w-full lg:w-40` en botón y menú
- Menú con `left-0 lg:left-auto lg:right-0` (alineado derecha en desktop)

**Dropdown Tipo** (6 opciones: Todos / Porcentaje / Monto fijo / 2x1 / 3x2 / Envío gratis / Otro):
- Mismo tono indigo
- `flex-1 lg:flex-none` / `w-full lg:w-48`
- Icono dinámico según selección

**Ambos dropdowns:**
- Radio buttons con icono indigo cuando activo
- Click-outside para cerrar (`useRef` + `useEffect`)
- `"Todos"` como opción por defecto (no "Todos los tipos" / "Todos los estados")

#### Input Búsqueda
- Botón X para limpiar (`elementoDerecha` prop)
- Cleanup al desmontar: `useEffect(() => { return () => setFiltros((prev) => ({ ...prev, busqueda: '' })); }, []);`

#### Tabla Desktop (≥lg)
**8 columnas:**
```
grid-cols-[minmax(0,1fr)_90px_90px_80px_80px_80px_90px_100px]
2xl:grid-cols-[minmax(0,1fr)_110px_110px_95px_95px_95px_110px_130px]
```

| Columna | Contenido | Ordenable |
|---------|-----------|-----------|
| Oferta | Imagen + Título + Valor destacado | No |
| Tipo | Badge con `whitespace-nowrap` | No |
| Estado | Badge colorido | No |
| Vistas | Número + Eye | Sí |
| Shares | Número + Share2 | Sí |
| Clicks | Número + MousePointer | Sí |
| **Vigencia** | Fechas (antes "FECHAS") | No |
| Acciones | Eliminar + Duplicar (sin Editar) | — |

- Click en fila → abre ModalOferta para editar
- Botón Editar **eliminado** de acciones (la fila misma es clickeable)

#### FilaMovilOferta — Cards Horizontales
```
w-full flex items-stretch gap-3 p-3 rounded-xl bg-white border-2 border-slate-300
```
- Imagen `w-14 h-14 rounded-lg shrink-0`
- Columna info con nombre, título/valor, badges (tipo + estado), métricas (Eye + Share2 + MousePointer)
- Iconos acción al final: **Copy** (Duplicar, izquierda) + **Trash2** (Eliminar, derecha)
  - `w-6 h-6`, sin recuadro, `gap-3`, `items-end` en columna

#### Chips de Orden Móvil
- Vistas / Shares / Clicks
- Activo: dark gradient `#1e293b → #334155`

#### Paginación
- `OFERTAS_POR_PAGINA = 12`
- Tabla desktop: botón "Cargar más"
- Lista móvil: scroll infinito

---

## 5. HeaderDashboard.tsx — Selector de Periodo

**Antes:** Botón activo con `bg-blue-600`

**Después:** Contenedor con borde + botón activo con dark gradient:
```tsx
<div className="flex items-center gap-1 bg-slate-200 rounded-lg p-0.5 border-2 border-slate-300">
  {PERIODOS.map((p) => (
    <button
      className={`... ${periodo === p.valor ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'}`}
      style={periodo === p.valor ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
    >
```

---

## 6. PaginaDashboard.tsx — Selector de Periodo Móvil

Mismo cambio que HeaderDashboard pero para el selector de periodo visible en móvil (antes del contenido principal).

---

## 7. GraficaColapsable.tsx — Auto-scroll en Móvil

Al expandir la gráfica en móvil, la página hace scroll automático para mostrar la gráfica completa dentro del viewport disponible (descontando el bottomNav).

```tsx
useEffect(() => {
  if (!expandida || window.innerWidth >= 1024) return;
  const timer = setTimeout(() => {
    const main = document.querySelector('main');
    const contenedor = contenedorRef.current;
    if (!main || !contenedor) return;

    const bottomNav = document.querySelector('nav.fixed');
    const alturaBottomNav = bottomNav ? bottomNav.getBoundingClientRect().height : 0;

    const rect = contenedor.getBoundingClientRect();
    const viewportDisponible = window.innerHeight - alturaBottomNav;
    const bottomDesborde = rect.bottom - viewportDisponible;

    if (bottomDesborde > 0) {
      main.scrollBy({ top: bottomDesborde + 16, behavior: 'smooth' });
    }
  }, 400);
  return () => clearTimeout(timer);
}, [expandida]);
```

- **Selector `nav.fixed`** — detecta el BottomNav dinámicamente
- **400ms de delay** — espera a que termine la animación CSS de expand
- **`scrollBy` con +16px** — margen visual extra

---

## Decisiones de Diseño Transversales

### Dark Gradient Unificado
`linear-gradient(135deg, #1e293b, #334155)` se usa en:
- Botón activo del selector de periodo (Dashboard desktop y móvil)
- Chip de orden activo en Catálogo y Ofertas (móvil)
- Botón "+Nueva Oferta" en header móvil de Ofertas
- Botón "Nuevo Artículo" en filtros de Catálogo

### Patrón de Iconos de Acción en Móvil
- Sin recuadro/fondo (`hover:bg-*` removido)
- `w-6 h-6` (más grandes que en desktop)
- `gap-3` entre iconos
- Copy (Duplicar) a la izquierda, Trash2 (Eliminar) a la derecha
- Color directo: `text-emerald-600` y `text-red-600`

### Dropdowns Indigo
- Estado activo: `bg-indigo-100 border-indigo-300 text-indigo-700`
- Radio button activo: `border-indigo-500 bg-indigo-500`
- Etiqueta activa: `text-indigo-700 font-semibold`

### Overflow Móvil (Dropdowns)
- Contenedor: `flex-1 lg:flex-none` (comparten ancho disponible en móvil)
- Botón: `w-full lg:w-40` / `w-full lg:w-48`
- Menú: `w-full lg:w-40` / `w-full lg:w-48`

---

## Verificación de Tokens (Estado Final)

| Regla | Estado |
|-------|--------|
| Sin `text-[10px]` | ✅ |
| Sin `text-slate-500` en elementos nuevos | ✅ |
| Sin `hover:scale-*` | ✅ |
| Sin `shadow-2xl` | ✅ |
| Sin gradientes en botones de acción | ✅ |
| Bordes mínimo `border-2 border-slate-300` | ✅ |
| Texto mínimo `text-sm`/`lg:text-[11px]`/`2xl:text-sm` | ✅ |
| Peso mínimo `font-medium` | ✅ |
| Íconos acción `w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4` en desktop | ✅ |

---

## Archivos Obsoletos

| Archivo | Estado |
|---------|--------|
| `apps/web/src/pages/private/business-studio/ofertas/CardOferta.tsx` | Sin importadores — candidato a eliminar |

---

*Generado automáticamente al cierre de sesión — 14 de marzo de 2026*
