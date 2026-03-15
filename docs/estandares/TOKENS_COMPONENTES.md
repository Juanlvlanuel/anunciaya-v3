# Tokens de Componentes — AnunciaYA v3.0

> **Propósito:** Patrones de referencia para componentes específicos. Consultar cuando se construye o modifica el tipo de componente correspondiente.
> **Requisito previo:** Siempre cumplir primero las reglas de TOKENS_GLOBALES.md

---

## 1. Botones de Acción Pequeños (Icon-only)

Botones que contienen únicamente un icono, usados en headers y barras de control.

| Resolución | Padding | Border radius | Icono |
|------------|---------|---------------|-------|
| Móvil (base) | `p-2` | `rounded-xl` | `w-5 h-5` |
| Laptop (`lg:`) | `p-2` | `rounded-lg` | `w-4 h-4` |
| Desktop (`2xl:`) | `p-2.5` | `rounded-xl` | `w-5 h-5` |

Ejemplo: `p-2 2xl:p-2.5 rounded-lg 2xl:rounded-xl` con icono `w-4 h-4 2xl:w-5 2xl:h-5`

> Nota: en móvil el `rounded-xl` es igual al desktop. Laptop reduce a `rounded-lg` por densidad.

---

## 2. Altura de Elementos Interactivos (Botones e Inputs)

Altura estándar validada para todos los elementos interactivos de la app: botones, inputs de búsqueda, inputs de formulario, dropdowns y chips.

| Dispositivo | Breakpoint | Altura | px |
|-------------|------------|--------|----|
| Móvil | base | `h-11` | 44px |
| Laptop | `lg:` | `h-10` | 40px |
| Desktop | `2xl:` | `h-11` | 44px |

**Patrón Tailwind:** `h-11 lg:h-10 2xl:h-11`

44px es el estándar Apple HIG para touch targets. Se aplica igual en búsqueda, filtros, dropdowns y formularios — un solo patrón para toda la app.

**Regla:** todo elemento interactivo respeta esta altura. No se permite `h-9` ni menor en ningún breakpoint.

---

## 3. Padding Interno de Contenedores de Filtros / Cards

Padding validado para cards que contienen controles de filtro (búsqueda, dropdowns, chips).

| Dispositivo | Breakpoint | Padding |
|-------------|------------|---------|
| Móvil | base | `p-2.5` (10px) |
| Laptop | `lg:` | `p-3` (12px) |
| Desktop | `2xl:` | `p-4` (16px) |

**Patrón Tailwind:** `p-2.5 lg:p-3 2xl:p-4`

---

## 4. Tipografía de Botones Interactivos (Filtros y Dropdowns)

Aplica a: botones de filtro (chips), botones de dropdown (Período, Estado, Operador) y cualquier botón de control de vista en toda la app.

| Propiedad | Valor | Notas |
|-----------|-------|-------|
| Peso | `font-semibold` (600) | Igual en las 3 resoluciones |
| Tamaño móvil | `text-base` (16px) | Mismo patrón que inputs |
| Tamaño laptop | `lg:text-sm` (14px) | Mismo patrón que inputs |
| Tamaño desktop | `2xl:text-base` (16px) | Mismo patrón que inputs |
| Border | `border-2 rounded-lg` | Ver R6 |

**Patrón Tailwind:** `font-semibold text-base lg:text-sm 2xl:text-base border-2 rounded-lg`

**Regla:** `font-medium` queda prohibido en botones de filtro y dropdown — solo `font-semibold` o superior. El tamaño de texto es el mismo que el de los inputs (TC-2) — un solo estándar para todos los elementos interactivos.

---

## 5. Anatomía de Dropdowns

Estructura validada para todos los dropdowns de la app (Período, Estado, Operador, y similares).

### Panel contenedor

```
rounded-xl border-2 border-slate-300 shadow-lg py-1 overflow-hidden
mt-1.5  ← separación fija del botón que lo abre
```

### Ítems dentro del panel

```
w-full flex items-center gap-2.5 px-3 py-2
text-base lg:text-sm 2xl:text-base font-medium text-left cursor-pointer
```

- Activo: `bg-slate-200 text-slate-800 font-semibold` (neutral) o `bg-indigo-100 text-indigo-700 font-semibold` (indigo)
- Inactivo: `text-slate-600 hover:bg-slate-200`
- `font-medium` es la base para todos los ítems — el activo lo sobreescribe con `font-semibold`

### Indicador de selección (círculo + check)

```
w-5 h-5 rounded-full flex items-center justify-center shrink-0  ← fijo, sin variación responsive
- Activo: bg-slate-700 (neutral) / bg-indigo-500 (indigo)
- Inactivo: bg-slate-200
Check interior: w-3 h-3 text-white  ← fijo
```

### Chevron en el botón

```
w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 transition-transform
rotate-180 cuando el panel está abierto
```

Sin opacidad — color heredado del botón padre.

### Texto del botón

El span que muestra la etiqueta activa siempre lleva `truncate` para evitar que desborde o se parta en 2 líneas:

```tsx
<span className="truncate">{etiquetaActiva}</span>
```

Si el botón puede mostrar texto de longitud variable (nombres de personas, etc.) añadir también `min-w-0` al span:

```tsx
<span className="min-w-0 truncate">{nombre}</span>
```

### Layout en fila de filtros

Cuando varios dropdowns conviven en una fila flex, solo **uno** puede crecer — el de contenido variable. Los demás se quedan fijos:

| Tipo | Wrapper | Botón |
|------|---------|-------|
| Texto fijo corto (Período, Estado) | `shrink-0 relative` | normal |
| Contenido variable (Operador, nombre) | `flex-1 min-w-0 lg:flex-none lg:shrink-0 relative` | añadir `w-full` |

Regla: `flex-1 min-w-0` solo aplica en móvil para absorber el espacio sobrante. En laptop (`lg:flex-none lg:shrink-0`) el botón vuelve a su tamaño natural para no expandirse sobre el contenido adyacente.

### Comportamiento de cierre

El panel se cierra con un clic en cualquier zona fuera del dropdown. Implementación estándar:

```tsx
const dropdownRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  if (!abierto) return;
  const handler = (e: MouseEvent) => {
    if (!dropdownRef.current?.contains(e.target as Node)) setAbierto(false);
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [abierto]);
```

El `ref` va en el `<div>` contenedor que envuelve tanto el botón como el panel.

### Variantes de color

Todos los dropdowns usan la variante **indigo**:

| Estado ítem | Clases |
|-------------|--------|
| Activo | `bg-indigo-100 text-indigo-700 font-semibold` |
| Inactivo | `text-slate-600 hover:bg-slate-200` |
| Círculo activo | `bg-indigo-500` |
| Círculo inactivo | `bg-slate-200` |

**Regla del botón:**
- Sin selección → `bg-white border-slate-300 text-slate-600 hover:border-slate-400`
- Con selección → `bg-indigo-100 border-indigo-300 text-indigo-700`

**Sin opacidad** en el ícono del botón — color heredado del botón padre.

### Auto-scroll en móvil

Cuando un dropdown abre en móvil, el panel (absolutamente posicionado) no agrega altura real al scroll container, por lo que puede quedar cortado fuera del viewport. Patrón obligatorio para cualquier dropdown dentro de un formulario en móvil:

```tsx
useEffect(() => {
  if (!abierto || window.innerWidth >= 1024) return;

  const main = document.querySelector('main');
  if (!main) return;

  const paddingOriginal = main.style.paddingBottom;

  const timer = setTimeout(() => {
    const el = ref.current; // ref al contenedor del dropdown
    if (!el) return;

    // Posición absoluta del elemento dentro del scroll container
    let offsetTop = 0;
    let current: HTMLElement | null = el;
    while (current && current !== main) {
      offsetTop += current.offsetTop;
      current = current.offsetParent as HTMLElement | null;
    }

    // Scroll exacto para que botón + panel quepan en pantalla
    // Ajustar PANEL_MAX_HEIGHT al max-h del panel específico (en px)
    const PANEL_MAX_HEIGHT = 400;
    const targetScroll = offsetTop + el.offsetHeight + PANEL_MAX_HEIGHT - main.clientHeight + 16;

    // Solo agregar el padding mínimo necesario (evita espacio en blanco visible)
    const extraPadding = Math.max(0, targetScroll - (main.scrollHeight - main.clientHeight));
    if (extraPadding > 0) main.style.paddingBottom = `${extraPadding}px`;

    main.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  }, 50);

  return () => {
    clearTimeout(timer);
    main.style.paddingBottom = paddingOriginal; // restaurar al cerrar
  };
}, [abierto]);
```

**Cómo ajustar:** cambia `PANEL_MAX_HEIGHT` al valor en px del `max-h` del panel:
- `max-h-[400px]` → `400`
- `max-h-80` → `320`
- `max-h-[300px]` → `300`

**Por qué funciona:** `offsetTop` acumulado da la posición absoluta real del botón dentro de `<main>`, independiente del scroll actual. El padding temporal solo se agrega si el contenido existente no alcanza para llegar al `targetScroll`.

---

## 6. Input de Búsqueda

Patrón estándar para inputs de búsqueda en toda la app. Usa el **Patrón A** de altura (TC-2).

| Propiedad | Valor |
|-----------|-------|
| Altura | `h-11 lg:h-10 2xl:h-11` (ver TC-2) |
| Texto | `text-base lg:text-sm 2xl:text-base font-medium text-slate-800` (ver R1 — texto de input) |
| Ícono | `w-4 h-4 text-slate-600` fijo — sin variación responsive |
| Padding derecho | `pr-8` — reservado para botón limpiar (X) |

Botón limpiar (X): `absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-600 hover:bg-slate-200` — fijo, sin variación responsive

---

## 7. Padding Horizontal de Botones (Filtros y Dropdowns)

| Tipo | Móvil | Laptop | Desktop |
|------|-------|--------|---------|
| Chips de filtro | `px-4` | `px-3` | `px-4` |
| Dropdown con texto | `pl-3 pr-2.5` | `pl-2.5 pr-2` | `pl-3 pr-2.5` |

- Chips: `px-4 lg:px-3 2xl:px-4`
- Dropdowns (texto + chevron): `pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5`

> La asimetría izquierda/derecha en dropdowns es intencional: el padding derecho es menor porque el chevron ya aporta espacio visual.

---

## 8. Modales de Detalle (Bottom Sheet + Desktop)

Patrón para modales de detalle que usan `ModalAdaptativo` con header gradiente.

### Estructura general

```
ModalAdaptativo (sinScrollInterno, mostrarHeader=false, paddingContenido="none")
├── div.flex.flex-col.max-h-[85vh].lg:max-h-[75vh]
│   ├── Header gradiente (shrink-0, lg:rounded-t-2xl)
│   └── div.flex-1.overflow-y-auto (contenido con scroll)
```

### Props de ModalAdaptativo

```tsx
<ModalAdaptativo
  abierto={abierto}
  onCerrar={handleCerrar}
  ancho="md"
  mostrarHeader={false}
  paddingContenido="none"
  sinScrollInterno
  headerOscuro          // ← adapta la pill del drag handle para fondos oscuros
>
```

- `sinScrollInterno` — solo afecta `ModalBottom` (móvil), no `Modal` (desktop)
- `headerOscuro` — cuando el primer hijo tiene fondo de color oscuro, la pill del drag handle cambia a `bg-white/40` para ser visible. **No** se necesita hack CSS adicional.
- Ver TC-15 para la mecánica de cómo el drag handle hereda el color del contenido.

> ⚠️ Patrón obsoleto eliminado: `max-lg:[background:linear-gradient(...)]` no funciona porque `ModalAdaptativo` no pasa `className` a `ModalBottom`. Usar `fondo` o `headerOscuro` props.

### Header gradiente

```
px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl
background: linear-gradient(135deg, #colorBase, #colorClaro)
boxShadow: 0 4px 16px rgba(color, 0.3)
```

**Círculos decorativos:** dos `div` absolute con `rounded-full bg-white/5` — uno arriba-derecha, otro abajo-izquierda.

### Header — 3 líneas alineadas

Todas las líneas usan `flex items-center gap-2`. Patrón obligatorio:

| Línea | Izquierda | Centro | Derecha |
|-------|-----------|--------|---------|
| 1 | Icono `w-5 h-5` | Título `text-xl lg:text-lg 2xl:text-xl font-bold` | Elemento `ml-auto` (logo, acción, etc.) |
| 2 | Icono `w-5 h-5` | Dato secundario `text-sm lg:text-[11px] 2xl:text-sm font-medium` | Opcional `ml-auto` |
| 3 | Icono `w-5 h-5` | Dato terciario `text-sm lg:text-[11px] 2xl:text-sm font-medium` | Opcional `ml-auto` |

**Reglas del header:**
- **2 tamaños de texto:** título grande (`text-xl`) y resto uniforme (`text-sm`). Nunca 3 tamaños distintos.
- **Iconos:** `w-5 h-5 text-white shrink-0` — mismo tamaño en las 3 líneas, sin opacidad.
- **Texto:** `text-white` al 100%. Nunca `text-white/80` ni `text-white/70`.
- **Espaciado entre líneas:** `space-y-0.5` a `space-y-1` según densidad. Se permite negativo (`-space-y-0.5`) cuando un elemento de la línea 1 agrega altura visual extra.
- **Badges y estados** van en el contenido, no en el header. El header se reserva para: título, datos de contacto/identificación, fecha y acciones.

### Logo ChatYA en header

```tsx
<button className="ml-auto shrink-0 cursor-pointer">
  <img src="/ChatYA.webp" alt="ChatYA" className="w-auto h-10 lg:h-8 2xl:h-10" />
</button>
```

Siempre usa `/ChatYA.webp`. Nunca `/IconoRojoChatYA.webp` dentro de modales de detalle.

### Barra de progreso con badges

```
[Badge actual] ──── barra ──── [Badge siguiente]
           texto centrado con % y datos
```

| Propiedad | Valor |
|-----------|-------|
| Barra altura | `h-2.5 lg:h-2 2xl:h-2.5 rounded-full` |
| Gap badges-barra | `gap-2 lg:gap-1.5 2xl:gap-2` |
| Texto inferior | `text-sm lg:text-[11px] 2xl:text-sm font-medium text-center` |
| Nivel máximo | Badge izquierdo + barra llena + texto "100%" a la derecha |

### Badges informativos en contenido

Estilo unificado: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold`

Colores semánticos:

| Tipo | Clases |
|------|--------|
| Éxito/confirmado | `bg-emerald-100 text-emerald-700` |
| Advertencia/pendiente | `bg-amber-100 text-amber-700` |
| Error/cancelado | `bg-red-100 text-red-700` |

### Contenido scrolleable

- Cada sección: `px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 border-b border-slate-300`
- Filas de detalle: `flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300 last:border-0`
- Cuadro icono en filas: `w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg`
- Icono interior: `w-4 h-4` fijo

### Texto en dos líneas alineado a la derecha

Para datos con etiqueta + valor en el header:

```tsx
<span className="ml-auto shrink-0 font-medium text-right leading-tight">
  <span className="block">Etiqueta</span>
  <span className="block">{valor}</span>
</span>
```

---

## 9. Dark Gradient de Marca

Gradiente oscuro unificado para estados activos y botones de acción primaria.

```css
background: linear-gradient(135deg, #1e293b, #334155)
```

### Cuándo usarlo

| Contexto | Ejemplo |
|----------|---------|
| Estado activo en grupos de toggle/switch (período, vista) | Botón de período activo en Dashboard, selector de tipo en Catálogo |
| Chips de orden activos en móvil | Chip "Precio" seleccionado en lista móvil |
| Botón de acción primaria en header móvil | "+Nueva Oferta", "+Nuevo Artículo" |
| Header de tabla desktop | `linear-gradient(135deg, #1e293b, #334155)` como fondo del thead |

### Cuándo NO usarlo

- Botones secundarios o de apoyo — usar `bg-white border-slate-300`
- Badges de estado — usar colores semánticos (`emerald`, `red`, `amber`)
- Fondos de sección — reservado solo para elementos interactivos activos

### Patrón en grupos de toggle

```tsx
<div className="flex items-center gap-1 bg-slate-200 rounded-lg p-0.5 border-2 border-slate-300">
  {OPCIONES.map((op) => (
    <button
      key={op.valor}
      className={`px-3 2xl:px-4 h-8 2xl:h-9 rounded-md text-sm font-semibold whitespace-nowrap cursor-pointer ${
        activo === op.valor
          ? 'text-white shadow-md'
          : 'text-slate-700 hover:bg-slate-300 hover:text-slate-800'
      }`}
      style={activo === op.valor ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
    >
      {op.label}
    </button>
  ))}
</div>
```

### Patrón en botón primario de header móvil

```tsx
<button
  className="shrink-0 flex items-center gap-1.5 h-11 lg:h-10 2xl:h-11 px-3 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white border-2 border-slate-800 cursor-pointer"
  style={{
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  }}
>
  +Nueva X
</button>
```

**Excepción de texto:** los botones de toggle group usan `text-sm` fijo (sin responsive) porque viven dentro de un contenedor compacto, no son elementos interactivos standalone. El estándar `text-base lg:text-sm 2xl:text-base` aplica a elementos independientes (inputs, dropdowns, chips de filtro).

**Regla:** el gradiente siempre se aplica con `style` inline (no Tailwind) para garantizar exactitud de los valores hexadecimales.

---

## 10. Patrón Tabla Desktop para Módulos de Datos

Estructura estándar para listar entidades en resolución ≥lg en cualquier sección de la app que requiera mostrar una lista de registros con múltiples columnas. Reemplaza al grid de cards. Usada en: Clientes, Transacciones, Catálogo, Ofertas.

### Container externo

```
rounded-xl overflow-hidden border-2 border-slate-300
boxShadow: 0 2px 8px rgba(0,0,0,0.06)
```

### Header (thead)

```tsx
<div
  className="grid grid-cols-[...] px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3"
  style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
>
```

- Texto de columna: `text-[11px] 2xl:text-sm font-semibold text-white/80 uppercase tracking-wider`
- Columna ordenable: `cursor-pointer hover:text-amber-300 transition-colors` — agrega `group`
- Icono orden activo: `ChevronDown / ChevronUp` en `text-amber-400`
- Icono orden inactivo: `ArrowUpDown` en `text-white/60`
- Icono tamaño: `w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ml-1`

### Body scrolleable

```
max-h-[calc(100vh-{offset}px)]
overflow-y-auto
```

El offset se calcula restando al 100vh los elementos fijos de la página (header, KPIs, filtros, padding). Cada módulo ajusta este valor según su propio layout. La constante base es `overflow-y-auto` — siempre presente.

### Filas (tbody rows)

- Alternancia: filas pares `bg-white`, filas impares `bg-slate-100`
- Hover: `hover:bg-slate-200 cursor-pointer`
- Texto: `text-sm lg:text-xs 2xl:text-sm`
- Separador: `border-b border-slate-300 last:border-0`
- Padding: `px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2.5`

### Texto de badges en celdas

Cualquier badge dentro de una celda de tabla debe incluir `whitespace-nowrap` para evitar que su texto se parta en dos líneas cuando la columna se estrecha.

```tsx
<span className="... whitespace-nowrap">Texto del badge</span>
```

### Botón "Cargar más" al pie de tabla

```
w-full py-3 text-sm font-semibold text-blue-600 hover:bg-blue-100 cursor-pointer
border-t border-slate-300
```

---

## 11. Botones de Acción Inline en Filas de Tabla

Distinto a los icon buttons del header (R8). Estos viven dentro de filas de datos y deben ser sutiles para no competir con el contenido.

| Propiedad | Valor |
|-----------|-------|
| Padding | `p-1.5` |
| Border radius | `rounded-lg` |
| Fondo default | Ninguno (transparente) |
| Fondo hover | `hover:bg-{color}-100` |
| Icono tamaño | `w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4` |
| Color icono | Directo al color semántico (no slate) |

### Colores por acción

| Acción | Color icono | Hover fondo |
|--------|-------------|-------------|
| Editar | `text-blue-600` | `hover:bg-blue-100` |
| Eliminar | `text-red-600` | `hover:bg-red-100` |
| Duplicar | `text-emerald-600` | `hover:bg-emerald-100` |
| Toggle destacado activo | `text-amber-500 fill-amber-500` | `hover:bg-amber-100` |
| Toggle destacado inactivo | `text-slate-400` | `hover:text-amber-500` |
| Toggle visible activo | `text-green-600` | `hover:bg-green-100` |
| Toggle visible inactivo | `text-slate-400` | `hover:text-green-600` |

Ejemplo:

```tsx
<button className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 cursor-pointer">
  <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
</button>
```

**Regla:** nunca usar `shadow-*` ni `border-*` en estos botones — deben integrarse visualmente con la fila.

---

## 12. Cards Horizontales en Móvil (FilaMovil)

Componente equivalente de la tabla desktop para resolución <lg. Representa una entidad de datos (artículo, oferta, cliente, transacción) como tarjeta horizontal.

### Estructura del card

```tsx
<div className="w-full flex items-stretch gap-3 p-3 rounded-xl bg-white border-2 border-slate-300 hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer">
  {/* Imagen / icono */}
  <div className="w-12 h-12 rounded-lg shrink-0 overflow-hidden">...</div>

  {/* Bloque info — ocupa todo el espacio restante */}
  <div className="flex-1 min-w-0 flex flex-col justify-between">
    <div>{/* Nombre + badges */}</div>
    <div className="flex items-center justify-between gap-2">
      <div>{/* Métricas (vistas, ventas, precio...) */}</div>
      <div className="flex items-center gap-3 shrink-0">
        {/* Iconos de acción */}
      </div>
    </div>
  </div>
</div>
```

### Imagen / placeholder

```tsx
{/* Con imagen */}
<img src={url} className="w-full h-full object-cover" />

{/* Sin imagen — usar el icono representativo de la entidad */}
<div className="w-full h-full bg-slate-200 flex items-center justify-center">
  <IconoEntidad className="w-5 h-5 text-slate-400" />
</div>
```

### Texto dentro del card

| Elemento | Clases |
|----------|--------|
| Nombre principal | `text-sm font-semibold text-slate-800 truncate` |
| Badges inline (tipo, estado) | `text-xs font-bold px-1.5 py-0.5 rounded-md` |
| Métricas secundarias | `text-sm font-semibold text-slate-600` con icono `w-3.5 h-3.5` |
| Precio / valor destacado | `text-sm font-bold text-emerald-600` |

### Iconos de acción en el card

Los iconos de acción (eliminar, duplicar) van en la esquina inferior derecha del bloque info. Son más grandes que los de tabla desktop, sin fondo.

| Propiedad | Valor |
|-----------|-------|
| Tamaño | `w-6 h-6` |
| Fondo | Ninguno |
| Color | Directo (`text-red-600`, `text-emerald-600`) |
| Separación entre iconos | `gap-3` |
| Orden | Duplicar (izquierda) → Eliminar (derecha) |

```tsx
<div className="flex items-center gap-3 shrink-0">
  <button onClick={(e) => { e.stopPropagation(); onDuplicar(item); }}
    className="cursor-pointer text-emerald-600">
    <Copy className="w-6 h-6" />
  </button>
  <button onClick={(e) => { e.stopPropagation(); onEliminar(item.id); }}
    className="cursor-pointer text-red-600">
    <Trash2 className="w-6 h-6" />
  </button>
</div>
```

**Regla:** `e.stopPropagation()` es obligatorio para que el click en el icono no propague al handler del card entero.

---

## 13. Chips de Orden en Móvil

Cuando un módulo tiene una tabla desktop con columnas ordenables, la vista móvil equivalente usa chips horizontales para seleccionar el criterio de orden. Reemplaza la funcionalidad del header ordenable de la tabla.

### Estructura

```tsx
<div className="flex gap-1.5 overflow-x-auto cl-carousel pb-1">
  {CRITERIOS_ORDEN.map((c) => (
    <button
      key={c.campo}
      onClick={() => toggleOrden(c.campo)}
      className={`shrink-0 flex items-center gap-1.5 px-2.5 h-11 rounded-lg text-base font-semibold border-2 whitespace-nowrap cursor-pointer ${
        orden.campo === c.campo
          ? 'text-white border-transparent shadow-sm'
          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
      }`}
      style={orden.campo === c.campo ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
    >
      {c.label}
      {orden.campo === c.campo && (
        orden.direccion === 'desc'
          ? <ChevronDown className="w-3.5 h-3.5" />
          : <ChevronUp className="w-3.5 h-3.5" />
      )}
    </button>
  ))}
</div>
```

Los criterios de orden son específicos de cada módulo y se definen en el momento de implementación. La regla es que deben coincidir exactamente con las columnas ordenables de la tabla desktop del mismo módulo.

**Regla:** el estado activo siempre usa el dark gradient (R9). El scroll horizontal usa `cl-carousel` para ocultar la barra de scroll nativa.

---

## 14. Inputs de Formulario

Patrón estándar para campos donde el usuario escribe o consulta datos (nombre, descripción, teléfono, dirección, etc.).

Se diferencia del input de búsqueda (TC-6) en el tamaño de texto y ausencia de ícono de lupa — la altura es la misma (`h-11 lg:h-10 2xl:h-11`) para todos los elementos interactivos.

### Especificaciones completas

| Propiedad | Valor | Razón |
|-----------|-------|-------|
| Altura | `h-11 lg:h-10 2xl:h-11` | 44px = estándar Apple HIG para touch |
| Texto | `text-base lg:text-sm 2xl:text-base` | 16px móvil evita auto-zoom iOS |
| Peso | `font-medium` | Mínimo R3 |
| Color texto | `text-slate-800` | Contraste sobre fondo slate-100 |
| Placeholder | `placeholder:text-slate-500` | Visible pero distinguible del valor real |
| Fondo | `bg-slate-100` | Excepción R2 para inputs |
| Borde | `border-2 border-slate-300` | R6 — border-2 en interactivos |
| Border radius | `rounded-lg` | Consistente con dropdowns |
| Sombra interna | `style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}` | Profundidad sutil |
| Padding horizontal | `px-4 lg:px-3 2xl:px-4` | Reduce en laptop, restaura en desktop |

### Patrón Tailwind del wrapper

```tsx
<div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 border-slate-300"
  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
  <input
    className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
  />
</div>
```

### Labels de formulario

Las etiquetas que acompañan a los inputs siguen el patrón de texto de interfaz (R1), no el de inputs:

```
text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5
```

Con ícono opcional: `flex items-center gap-2` + icono `w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-500 shrink-0`

### Input de teléfono con lada

Cuando un campo de teléfono tiene selector de lada (prefijo de país), ambos comparten el mismo wrapper con altura y fondo unificados:

```tsx
<div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg border-2 border-slate-300"
  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
  {/* Lada */}
  <input className="w-16 lg:w-14 2xl:w-16 px-3 lg:px-2.5 2xl:px-3 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 border-r-2 border-slate-300 shrink-0" />
  {/* Número */}
  <input className="flex-1 px-3 lg:px-2.5 2xl:px-3 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500" />
</div>
```

**Regla:** el input de lada usa el mismo `font-medium text-slate-800` que el resto — nunca `font-bold` para no crear jerarquía visual dentro del mismo campo.

---

## 15. ModalBottom — Fondo Personalizable y Drag Handle

`ModalBottom` (y `ModalAdaptativo` en móvil) soporta fondos personalizados con herencia automática del color en la zona del drag handle.

### Cómo funciona la herencia de color

El drag handle es `position: absolute` en la parte superior del modal. Esto permite que el primer hijo del contenido (por ejemplo, un header coloreado) se renderice desde `y=0` y **se vea a través** de la zona del drag handle — sin necesidad de ningún hack de CSS ni prop adicional.

```
┌──────────────────────────────┐  ← top del modal container
│        [ pill ]              │  ← drag handle (absolute, z-10)
│  ┌────────────────────────┐  │
│  │  Header con color      │  │  ← primer hijo, empieza desde y=0
│  │  (se extiende detrás   │  │     gracias a position:absolute del handle
│  │   del drag handle)     │  │
│  └────────────────────────┘  │
│  Contenido scrolleable        │
└──────────────────────────────┘
```

### Props disponibles

| Prop | Tipo | Descripción |
|------|------|-------------|
| `fondo` | `string` (CSS) | Background del modal completo. Reemplaza `bg-slate-50`. Acepta gradientes, colores, etc. |
| `headerOscuro` | `boolean` | Adapta pill (`bg-white/40`), borde del header (`border-white/10`) y botón X para fondos oscuros |
| `colorHandle` | `string` (CSS color) | Color directo para la pill del drag handle. Sobreescribe `headerOscuro` |

### Cuándo usar cada prop

- **Fondo completo oscuro** (ej: menú de cámara): `fondo="linear-gradient(135deg, #000000, #0f172a)" headerOscuro`
- **Header coloreado en modal normal** (ej: detalle de cliente): solo `headerOscuro` — el header del children se extiende automáticamente por detrás del handle
- **Color de pill específico**: `colorHandle="#ffffff40"` — raro, preferir `headerOscuro`

### Compensación de padding para sinScrollInterno

Cuando `sinScrollInterno` es true, el contenido del children maneja su propio scroll. El primer hijo debe agregar `pt-11 lg:pt-8 2xl:pt-11` para no quedar tapado por el drag handle.

```tsx
<ModalBottom sinScrollInterno fondo="...">
  <div className="pt-11 lg:pt-8 2xl:pt-11">  {/* compensación obligatoria */}
    {/* contenido */}
  </div>
</ModalBottom>
```

> Los modales con `mostrarHeader={true}` (header interno de ModalBottom) ya incluyen este padding automáticamente en el header.

---

## 16. Botones Responsivos: Icon-Only en Laptop

Cuando el espacio horizontal es limitado en resolución laptop (`lg:`), los botones con texto + icono pueden colapsar a solo el icono. El texto vuelve en desktop (`2xl:`).

### Patrón de texto oculto

```tsx
<button className="flex items-center gap-1.5 lg:w-8 lg:px-0 2xl:w-auto 2xl:px-3">
  <Camera className="w-3.5 h-3.5 shrink-0" />
  <span className="lg:hidden 2xl:inline">Cambiar</span>
</button>
```

- `lg:w-8 lg:px-0` — fija el ancho del botón para que solo quepa el icono en laptop
- `2xl:w-auto 2xl:px-3` — restaura el ancho natural en desktop
- `span lg:hidden 2xl:inline` — oculta el texto solo en laptop

### Tooltip de apoyo en laptop

Cuando el texto desaparece en laptop, agregar un `Tooltip` visible **únicamente en laptop** (no en desktop donde el texto ya está):

```tsx
import Tooltip from '../../../../../components/ui/Tooltip';

<Tooltip text="Cambiar foto" position="bottom" className="2xl:hidden">
  <button className="flex items-center gap-1.5 lg:w-8 lg:px-0 2xl:w-auto 2xl:px-3">
    <Camera className="w-3.5 h-3.5 shrink-0" />
    <span className="lg:hidden 2xl:inline">Cambiar</span>
  </button>
</Tooltip>
```

- `className="2xl:hidden"` en `Tooltip` — el portal del tooltip se renderiza pero queda invisible en `2xl:` gracias a esta clase en el contenedor
- El `Tooltip` component soporta `className` que se aplica al div del portal, permitiendo breakpoints

### Labels simplificados en desktop

En desktop (`2xl:`), si el texto ya es visible, usar **labels cortos** en lugar de descriptivos largos. El usuario en PC tiene más contexto visual.

| Móvil (base) | Desktop (2xl:) |
|---|---|
| "Cambiar Foto de Perfil" | "Cambiar" |
| "Subir Imagen de Portada" | "Subir" |
| "Eliminar artículo" | "Eliminar" |

**Regla:** el label en desktop debe ser funcional y breve (1 palabra). La descripción completa se reserva para labels flotantes o modales de confirmación.

---

## 17. `whitespace-nowrap` en Títulos de Celdas Comprimidas

Cuando un título de elemento (nombre de imagen, etiqueta de sección) está en una celda o columna con ancho limitado, agregar `whitespace-nowrap` para evitar que el texto se parta en dos líneas.

```tsx
<div className="whitespace-nowrap text-sm font-semibold text-slate-800">
  Foto de Perfil
</div>
```

**Cuándo aplicar:**
- Títulos junto a botones en fila horizontal (`flex items-center`)
- Encabezados de secciones dentro de grids con columnas angostas
- Labels de campos en layout de 2 columnas en laptop

**Cuándo no aplicar:**
- Nombres de usuario o contenido variable (puede ser largo, debe recortarse con `truncate`)
- Descripciones o párrafos
