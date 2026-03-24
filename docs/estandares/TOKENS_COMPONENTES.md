# Tokens de Componentes — AnunciaYA v3.0

> **Propósito:** Patrones de referencia para componentes específicos. Consultar cuando se construye o modifica el tipo de componente correspondiente.
> **Requisito previo:** Siempre cumplir primero las reglas de TOKENS_GLOBALES.md

## Índice

1. [Botones](#1-botones)
2. [Altura de Elementos Interactivos](#2-altura-de-elementos-interactivos)
3. [Padding de Contenedores de Filtros](#3-padding-de-contenedores-de-filtros)
4. [Anatomía de Dropdowns](#4-anatomía-de-dropdowns)
5. [Input de Búsqueda](#5-input-de-búsqueda)
6. [Modales con Header Gradiente](#6-modales-con-header-gradiente)
7. [Dark Gradient de Marca](#7-dark-gradient-de-marca)
8. [Patrón Tabla Desktop](#8-patrón-tabla-desktop)
9. [Cards Horizontales en Móvil (FilaMovil)](#9-cards-horizontales-en-móvil-filamovil)
10. [Chips de Orden en Móvil](#10-chips-de-orden-en-móvil)
11. [Inputs de Formulario](#11-inputs-de-formulario)
12. [ModalBottom — Fondo Personalizable y Drag Handle](#12-modalbottom--fondo-personalizable-y-drag-handle)
13. [whitespace-nowrap en Títulos Comprimidos](#13-whitespace-nowrap-en-títulos-comprimidos)
14. [Drawers / Menús Laterales en Móvil](#14-drawers--menús-laterales-en-móvil)
15. [Patrón de Lista Móvil](#15-patrón-de-lista-móvil)
16. [Jerarquía de Rounded](#16-jerarquía-de-rounded)
17. [CarouselKPI — Fade Dinámico](#17-carouselkpi--fade-dinámico)
18. [Swipe entre Páginas (Business Studio)](#18-swipe-entre-páginas-business-studio)
19. [Tooltip](#19-tooltip)

---

## 1. Botones

Centraliza **todas** las reglas de botones de la app. En otros TCs donde se mencione un botón, se referencia esta sección.

### Reglas comunes a todos los botones

- **Borde:** siempre `border-2 border-slate-300`. El color puede variar según estado activo o tipo de botón específico.
- **Cursor:** `lg:cursor-pointer` en elementos interactivos dentro del flujo de la app.
- **Elemento HTML:** siempre `<button>` nativo, nunca el componente `<Boton>` en código nuevo.

---

### 1A. Botones de Acción Pequeños (Icon-only)

Botones que contienen únicamente un icono, usados en headers y barras de control.

| Resolución | Padding | Icono |
|------------|---------|-------|
| Móvil (base) | `p-2` | `w-5 h-5` |
| Laptop (`lg:`) | `p-2` | `w-4 h-4` |
| Desktop (`2xl:`) | `p-2.5` | `w-5 h-5` |

**Patrón Tailwind:** `p-2 2xl:p-2.5` con icono `w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5`

**Border radius según contexto:**

| Contexto | Rounded |
|----------|---------|
| Dentro de un card o contenedor (convive con inputs, dropdowns) | `rounded-lg` fijo — igual que inputs y dropdowns |
| Standalone sobre gradiente (botón X en header de modal, botón + en header de sección) | `rounded-xl lg:rounded-lg 2xl:rounded-xl` |

**Color de fondo según contexto:**

| Contexto | Fondo | Hover |
|----------|-------|-------|
| Sobre fondo claro (cards, secciones blancas) | `bg-slate-100` | `hover:bg-slate-200` |
| Sobre fondo oscuro (headers con gradiente, modales) | `bg-white/10` | `hover:bg-white/20` |
| Acción destructiva flotante sobre imagen | `bg-red-500 text-white` | — |

---

### 1B. Controles Interactivos (Filtros y Dropdowns) — Tipografía y Padding

Aplica a: botones de filtro (chips), botones de dropdown (Período, Estado, Operador) y cualquier botón de control de vista en toda la app.

**Tipografía:**

| Propiedad | Valor |
|-----------|-------|
| Peso | `font-semibold` — igual en las 3 resoluciones |
| Tamaño | `text-base lg:text-sm 2xl:text-base` |

**Patrón Tailwind:** `font-semibold text-base lg:text-sm 2xl:text-base`

**Color de fondo:** `bg-white` sin selección / `bg-blue-100` con selección activa.

**Regla:** `font-medium` queda prohibido en botones de filtro y dropdown — solo `font-semibold` o superior.

**Padding horizontal:**

| Tipo | Móvil | Laptop | Desktop |
|------|-------|--------|---------|
| Chips de filtro | `px-4` | `px-3` | `px-4` |
| Dropdown con texto | `pl-3 pr-2.5` | `pl-2.5 pr-2` | `pl-3 pr-2.5` |

- Chips: `px-4 lg:px-3 2xl:px-4`
- Dropdowns (texto + chevron): `pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5`

> La asimetría izquierda/derecha en dropdowns es intencional: el padding derecho es menor porque el chevron ya aporta espacio visual.

---

### 1C. Botones de Acción CTA (Módulos BS)

Botones como "+Nueva Oferta", "+Nuevo Artículo" que aparecen en cards de filtros junto a dropdowns e inputs. Usan el Dark Gradient de Marca (ver TC-7).

**Variante móvil** — dentro del card de filtros, al mismo nivel visual que los inputs (`h-11`):

```tsx
<button
  className="shrink-0 flex items-center gap-1.5 h-11 px-2.5 rounded-lg text-base font-semibold text-white cursor-pointer"
  style={{
    background: 'linear-gradient(135deg, #1e293b, #334155)',
    boxShadow: '0 3px 10px rgba(30, 41, 59, 0.35)',
  }}
>
  <Plus className="w-4 h-4" />
  Nueva X
</button>
```

**Variante desktop** — en header de filtros:

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

**Diferencia con toggles:** los CTAs usan `h-11 text-base` (nivel input), los toggles usan `h-10 text-sm` (nivel control secundario).

---

### 1D. Botones de Acción Inline en Filas de Tabla

Viven dentro de filas de datos. Deben ser sutiles para no competir con el contenido.

| Propiedad | Valor |
|-----------|-------|
| Padding | `p-1.5` |
| Border radius | `rounded-lg` |
| Fondo default | Ninguno (transparente) |
| Fondo hover | `hover:bg-{color}-100` |
| Icono tamaño | `w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4` |
| Color icono | Directo al color semántico (no slate) |

**Colores por acción:**

| Acción | Color icono | Hover fondo |
|--------|-------------|-------------|
| Editar | `text-blue-600` | `hover:bg-blue-100` |
| Eliminar | `text-red-600` | `hover:bg-red-100` |
| Duplicar | `text-emerald-600` | `hover:bg-emerald-100` |
| Toggle destacado activo | `text-amber-500 fill-amber-500` | `hover:bg-amber-100` |
| Toggle destacado inactivo | `text-slate-400` | `hover:text-amber-500` |
| Toggle visible activo | `text-green-600` | `hover:bg-green-100` |
| Toggle visible inactivo | `text-slate-400` | `hover:text-green-600` |

```tsx
<button className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 cursor-pointer">
  <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
</button>
```

**Excepción a la regla global:** estos botones no llevan borde ni sombra — deben integrarse visualmente con la fila sin crear separación visual.

---

### 1E. Botones de Formulario (Submit / Cancelar)

Usados en modales de creación/edición (Business Studio) y en formularios de auth. Siempre `<button>` nativo, nunca `<Boton>`.

**En modales BS (layout con Cancelar + Submit en fila):**

```tsx
{/* Cancelar */}
<button type="button" onClick={onCerrar} disabled={guardando}
  className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl
             transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
             px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer
             border-2 border-slate-400 text-slate-600 bg-transparent
             hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100"
>Cancelar</button>

{/* Guardar / Crear */}
<button type="submit" disabled={guardando || isUploading}
  className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl
             transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
             px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer
             bg-linear-to-r from-slate-700 to-slate-800 text-white
             shadow-lg shadow-slate-700/30
             hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40
             active:scale-[0.98]"
>
  {guardando && <Spinner tamanio="sm" color="white" />}
  {esEdicion ? 'Guardar cambios' : 'Crear ...'}
</button>
```

**En formularios simples (auth, un solo botón de ancho completo):**

```tsx
<button
  type="submit"
  disabled={!formularioValido || cargando}
  className={`w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-white text-base lg:text-sm 2xl:text-base ${
    formularioValido && !cargando
      ? 'bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 hover:shadow-slate-700/40 active:scale-[0.98] lg:cursor-pointer'
      : 'bg-slate-400 cursor-not-allowed'
  }`}
>
  {cargando ? 'Cargando...' : 'Confirmar'}
</button>
```

**Reglas:**
- El botón submit siempre usa el Dark Gradient slate (ver TC-7). Nunca color plano.
- Estado deshabilitado: `bg-slate-400 cursor-not-allowed` — nunca opacidad sobre el gradiente.
- `rounded-xl` en modales BS / `rounded-lg` en formularios simples — el botón usa el mismo rounded que los inputs del formulario donde vive.

---

### 1F. Responsivos: Icon-Only en Laptop

Cuando el espacio horizontal es limitado en laptop (`lg:`), los botones con texto + icono colapsan a solo icono. El texto vuelve en desktop (`2xl:`).

**Patrón de texto oculto:**

```tsx
<button className="flex items-center gap-1.5 lg:w-8 lg:px-0 2xl:w-auto 2xl:px-3">
  <Camera className="w-3.5 h-3.5 shrink-0" />
  <span className="lg:hidden 2xl:inline">Cambiar</span>
</button>
```

- `lg:w-8 lg:px-0` — fija el ancho para que solo quepa el icono en laptop
- `2xl:w-auto 2xl:px-3` — restaura el ancho natural en desktop
- `span lg:hidden 2xl:inline` — oculta el texto solo en laptop

**Tooltip de apoyo en laptop:**

```tsx
import Tooltip from '../../../../../components/ui/Tooltip';

<Tooltip text="Cambiar foto" position="bottom" className="2xl:hidden">
  <button className="flex items-center gap-1.5 lg:w-8 lg:px-0 2xl:w-auto 2xl:px-3">
    <Camera className="w-3.5 h-3.5 shrink-0" />
    <span className="lg:hidden 2xl:inline">Cambiar</span>
  </button>
</Tooltip>
```

- `className="2xl:hidden"` en `Tooltip` — el portal queda invisible en `2xl:` porque el texto ya es visible.

**Labels simplificados en desktop:**

| Móvil (base) | Desktop (2xl:) |
|---|---|
| "Cambiar Foto de Perfil" | "Cambiar" |
| "Subir Imagen de Portada" | "Subir" |
| "Eliminar artículo" | "Eliminar" |

**Regla:** el label en desktop debe ser funcional y breve (1 palabra).

---

## 2. Altura de Elementos Interactivos

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

## 3. Padding de Contenedores de Filtros

Padding validado para cards que contienen controles de filtro (búsqueda, dropdowns, chips).

| Dispositivo | Breakpoint | Padding |
|-------------|------------|---------|
| Móvil | base | `p-2.5` (10px) |
| Laptop | `lg:` | `p-3` (12px) |
| Desktop | `2xl:` | `p-4` (16px) |

**Patrón Tailwind:** `p-2.5 lg:p-3 2xl:p-4`

---

## 4. Anatomía de Dropdowns

Estructura validada para todos los dropdowns de la app (Período, Estado, Operador, y similares).

### Panel contenedor

```
rounded-xl border-2 border-slate-300 shadow-lg py-1 overflow-hidden
mt-1.5  ← separación fija del botón que lo abre
```

### Ítems dentro del panel

```
w-full flex items-center gap-2.5 px-3 py-2
text-base lg:text-sm 2xl:text-base font-semibold text-left cursor-pointer
```

- Activo: `bg-blue-100 text-blue-700`
- Inactivo: `text-slate-600 hover:bg-blue-50`
- `font-semibold` siempre — nunca `font-medium`.

### Indicador de selección (círculo + check)

```
w-5 h-5 rounded-full flex items-center justify-center shrink-0  ← fijo, sin variación responsive
- Activo: bg-blue-500
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

Todos los dropdowns usan la variante **blue**:

| Estado ítem | Clases |
|-------------|--------|
| Activo | `bg-blue-100 text-blue-700 font-semibold` |
| Inactivo | `text-slate-600 hover:bg-blue-50` |
| Círculo activo | `bg-blue-500` |
| Círculo inactivo | `bg-slate-200` |

**Regla del botón:**
- Sin selección → `bg-white border-slate-300 text-slate-600 hover:border-slate-400`
- Con selección → `bg-blue-100 border-blue-300 text-blue-700`

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

---

## 5. Input de Búsqueda

Patrón estándar para inputs de búsqueda en toda la app. Usa el patrón de altura de TC-2.

| Propiedad | Valor |
|-----------|-------|
| Altura | `h-11 lg:h-10 2xl:h-11` (ver TC-2) |
| Texto | `text-base lg:text-sm 2xl:text-base font-medium text-slate-800` (ver R1 — texto de input) |
| Ícono | `w-4 h-4 text-slate-600` fijo — sin variación responsive |
| Padding derecho | `pr-8` — reservado para botón limpiar (X) |

Botón limpiar (X): `absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-600 hover:bg-slate-200` — fijo, sin variación responsive

---

## 6. Modales con Header Gradiente

Patrón para modales que usan `ModalAdaptativo` con header gradiente oscuro. Hay dos variantes:

| Variante | Uso | `alturaMaxima` | Ancho |
|----------|-----|----------------|-------|
| **Detalle** | Ver información de una entidad (cliente, transacción…) | `lg` (80vh) | `md` |
| **Formulario BS** | Crear o editar una entidad (artículo, oferta…) | `xl` (93vh) | `xl` |

---

### 6A. Modal de Detalle

#### Estructura

```
ModalAdaptativo (sinScrollInterno, mostrarHeader=false, paddingContenido="none")
├── div.flex.flex-col.max-h-[80vh].lg:max-h-[75vh]
│   ├── Header gradiente (shrink-0, lg:rounded-t-2xl)
│   └── div.flex-1.overflow-y-auto (contenido con scroll)
```

#### Props de ModalAdaptativo

```tsx
<ModalAdaptativo
  abierto={abierto}
  onCerrar={handleCerrar}
  ancho="md"
  mostrarHeader={false}
  paddingContenido="none"
  sinScrollInterno
  alturaMaxima="lg"
  headerOscuro
>
```

- `sinScrollInterno` — solo afecta `ModalBottom` (móvil), no `Modal` (desktop)
- `headerOscuro` — la pill del drag handle cambia a `bg-white/40` para ser visible sobre fondo oscuro. Ver TC-12.

---

### 6B. Modal de Formulario BS (Crear/Editar)

Patrón de ModalArticulo y ModalOferta — layout 2 columnas, gradiente dinámico según tipo de entidad.

#### Estructura

```
ModalAdaptativo (sinScrollInterno, mostrarHeader=false, alturaMaxima="xl")
└── div.flex.flex-col.max-h-[93vh].lg:max-h-[90vh]
    ├── Header gradiente dinámico (shrink-0, pt-8 pb-4 lg:py-3, lg:rounded-t-2xl)
    └── div.flex-1.overflow-y-auto
        └── form.flex.flex-col.lg:flex-row
            ├── Columna izquierda lg:w-2/5 (imagen + controles)
            └── Columna derecha  lg:w-3/5 (campos + botones)
```

#### Props de ModalAdaptativo

```tsx
// GRADIENTES_TIPO — objeto constante en el componente:
const GRADIENTES_TIPO = {
  tipoA: { bg: 'linear-gradient(135deg, #hex1, #hex2)', shadow: 'rgba(r,g,b,0.4)', handle: '#hex1' },
  tipoB: { bg: 'linear-gradient(135deg, #hex3, #hex4)', shadow: 'rgba(r,g,b,0.4)', handle: '#hex3' },
};

const gradiente = GRADIENTES_TIPO[tipoActual];

<ModalAdaptativo
  abierto={abierto}
  onCerrar={onCerrar}
  ancho="xl"
  mostrarHeader={false}
  paddingContenido="none"
  sinScrollInterno
  alturaMaxima="xl"
  colorHandle={gradiente.handle}   // ← color dinámico de la pill según tipo
  headerOscuro                     // ← pill blanca visible sobre gradiente oscuro
  className="max-w-xs lg:max-w-2xl 2xl:max-w-3xl"
>
```

- `colorHandle` — recibe el hex del color base del gradiente activo. Permite que la pill cambie de color junto con el header al seleccionar un tipo diferente.
- `headerOscuro` — se combina con `colorHandle`; adapta la pill a `bg-white/40` como base antes de aplicar el color.
- `className` — **solo llega al `Modal` de escritorio**, nunca a `ModalBottom`. No usar `max-lg:` en className para controlar estilos mobile.

#### Header gradiente dinámico

```tsx
<div
  className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
  style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
>
  {/* Círculos decorativos */}
  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
  <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

  <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
    {/* Icono tipo — círculo con borde */}
    <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
      <IconoTipo className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
    </div>
    {/* Título + subtítulo */}
    <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
      <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">{titulo}</h3>
      <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">{subtitulo}</span>
    </div>
    {/* Acción derecha (toggle tipo, toggle activo, etc.) */}
    <Tooltip text="..." position="bottom" autoHide={2500}>
      <button type="button" className="p-2 lg:p-1.5 2xl:p-2 rounded-xl ...">
        <Icono className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
      </button>
    </Tooltip>
  </div>
</div>
```

- `pt-8` en móvil — compensa el drag handle (position absolute) para que el contenido del header no quede tapado.
- `text-white/70` está **permitido únicamente para el subtítulo** del header de formulario. El resto del texto usa `text-white` al 100%.

#### Botones del formulario

Ver TC-1 §1E — Botones de Formulario.

> ⚠️ `max-lg:[background:...]` en `className` de `ModalAdaptativo` **no tiene efecto en móvil** — `className` no se forwarded a `ModalBottom`. Para colorear el drag handle usar `colorHandle` + `headerOscuro`. Ver TC-12.

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
- **Badges y estados** van en el contenido, no en el header.

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

## 7. Dark Gradient de Marca

Gradiente oscuro unificado para estados activos y botones de acción primaria.

```css
background: linear-gradient(135deg, #1e293b, #334155)
```

### Cuándo usarlo

| Contexto | Ejemplo |
|----------|---------|
| Estado activo en grupos de toggle/switch (período, vista) | Botón de período activo en Dashboard, selector de tipo en Catálogo |
| Chips de orden activos en móvil | Chip "Precio" seleccionado en lista móvil |
| Botones de acción CTA ("+Nueva Oferta", "+Nuevo Artículo") | Ver TC-1 §1C para el patrón completo |
| Header de tabla desktop | `linear-gradient(135deg, #1e293b, #334155)` como fondo del thead |

### Cuándo NO usarlo

- Botones secundarios o de apoyo — usar `bg-white border-slate-300`
- Badges de estado — usar colores semánticos (`emerald`, `red`, `amber`)
- Fondos de sección — reservado solo para elementos interactivos activos

### Patrón en grupos de toggle/switch (móvil)

Aplica a: selectores de período, toggles de tipo (Ventas/Canjes, Todos/Productos/Servicios), tabs de sección.

**Contenedor:**

```
bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5
```

**Botones internos:**

```tsx
<button
  className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer ${
    activo === op.valor
      ? 'text-white shadow-md'
      : 'text-slate-700 hover:bg-slate-300'
  }`}
  style={activo === op.valor ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
>
  <Icono className="w-4 h-4" /> {/* Opcional — solo si el toggle tiene iconos */}
  {op.label}
</button>
```

**Jerarquía de rounded:** contenedor `rounded-xl` → botones `rounded-lg` (siempre un nivel menos que su padre).

**Tamaños responsive (cuando el toggle existe en desktop):**

| Propiedad | Móvil | Laptop (`lg:`) | Desktop (`2xl:`) |
|-----------|-------|----------------|------------------|
| Altura | `h-10` | `lg:h-9` | `2xl:h-10` |
| Texto | `text-sm` | `lg:text-xs` | `2xl:text-sm` |
| Padding | `px-3` | `lg:px-3` | `2xl:px-4` |
| Rounded botón | `rounded-lg` | `lg:rounded-lg` | — |

Si el toggle es `lg:hidden` (solo móvil), no necesita clases `lg:` ni `2xl:`.

### KPIs — rounded

Los cards de KPIs usan `rounded-xl` fijo en todas las resoluciones — mismo nivel que el contenedor de toggles.

### Headers de sección en cards (Mi Perfil, Puntos)

Headers con gradiente oscuro dentro de cards de formulario.

**Card contenedor obligatorio:**

```
bg-white border-2 border-slate-300 rounded-xl
style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
```

- **Sin `overflow-hidden`** en el card — permite que dropdowns sobresalgan.
- El header lleva `rounded-t-[10px]` propio para recortar las esquinas del gradiente.
- Excepción: cards de imágenes SÍ usan `overflow-hidden` para recortar fotos.

**Header:**

| Propiedad | Móvil | Laptop (`lg:`) | PC (`2xl:`) |
|-----------|-------|----------------|-------------|
| Padding | `px-3 py-2` | `lg:px-4 lg:py-2` | `2xl:py-2` |
| Gap | `gap-2` | `lg:gap-2.5` | — |
| Rounded | `rounded-t-[10px]` | — | — |
| Icono wrapper | `w-7 h-7` | `lg:w-9 lg:h-9` | — |
| Icono interior | `w-4 h-4` | fijo | — |
| Texto | `text-sm font-bold text-white` | `lg:text-sm` | `2xl:text-base` |

**Regla:** `py-2` es uniforme en las 3 vistas. El gradiente siempre se aplica con `style` inline (no Tailwind) para garantizar exactitud de los valores hexadecimales.

---

## 8. Patrón Tabla Desktop para Módulos de Datos

Estructura estándar para listar entidades en resolución ≥lg en cualquier sección de la app que requiera mostrar una lista de registros con múltiples columnas. Reemplaza al grid de cards. Usada en: Clientes, Transacciones, Catálogo, Ofertas.

### Container externo

```
rounded-xl overflow-hidden border-2 border-slate-300
boxShadow: 0 2px 8px rgba(0,0,0,0.06)
```

### Header (thead)

```tsx
<div
  className="grid grid-cols-[...] px-4 lg:px-3 2xl:px-5 py-2 h-12 items-center"
  style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
>
```

- Altura fija: `h-12` (48px) — igual que los headers de sección en cards
- Texto de columna: `text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider`
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

Cualquier badge dentro de una celda de tabla debe incluir `whitespace-nowrap` para evitar que su texto se parta en dos líneas cuando la columna se estrecha. Ver TC-13.

### Botón "Cargar más" al pie de tabla

Ver TC-1 §1B — aplica tipografía de controles interactivos con `text-blue-600`.

```
w-full py-3 text-sm font-semibold text-blue-600 hover:bg-blue-100 cursor-pointer
border-t border-slate-300
```

---

## 9. Cards Horizontales en Móvil (FilaMovil)

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

Los iconos de acción (eliminar, duplicar) van en la esquina inferior derecha del bloque info. Son más grandes que los de tabla desktop, sin fondo. Ver TC-1 §1D para colores por acción.

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

## 10. Chips de Orden en Móvil

Cuando un módulo tiene una tabla desktop con columnas ordenables, la vista móvil equivalente usa chips horizontales para seleccionar el criterio de orden. Reemplaza la funcionalidad del header ordenable de la tabla.

### Variante A — Contenedor oscuro (Clientes, Catálogo, Ofertas, Transacciones ventas)

Chips dentro de un contenedor `bg-slate-800` que actúa como barra de ordenamiento:

```tsx
<div className="flex items-center bg-slate-800 rounded-xl border-2 border-slate-700 p-0.5 shadow-md">
  {CRITERIOS_ORDEN.map(({ col, etiqueta }) => {
    const activa = orden?.columna === col;
    return (
      <button
        key={col}
        onClick={() => alternarOrden(col)}
        className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer ${activa
          ? 'bg-slate-400 text-slate-900 shadow-md'
          : 'text-white hover:bg-white/10'
        }`}
      >
        {etiqueta}
        {activa && orden?.direccion === 'desc' && <ChevronDown className="w-4 h-4 text-slate-900" strokeWidth={2.5} />}
        {activa && orden?.direccion === 'asc' && <ChevronUp className="w-4 h-4 text-slate-900" strokeWidth={2.5} />}
        {!activa && <ArrowUpDown className="w-4 h-4 text-white" strokeWidth={2.5} />}
      </button>
    );
  })}
</div>
```

### Variante B — Chips sueltos con gradiente (Transacciones canjes)

Chips individuales con borde, usados cuando hay pocos criterios (2-3) y no amerita un contenedor oscuro:

```tsx
<button
  className={`flex items-center gap-1.5 px-4 h-10 rounded-lg text-sm font-semibold border-2 shrink-0 cursor-pointer ${activa
    ? 'text-white border-slate-700'
    : 'bg-white text-slate-600 border-slate-300'
  }`}
  style={activa ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
>
  {etiqueta}
  {activa && <ChevronDown className="w-4 h-4 text-amber-400" strokeWidth={2.5} />}
  {!activa && <ArrowUpDown className="w-4 h-4 text-slate-600" strokeWidth={2.5} />}
</button>
```

### Especificaciones comunes

| Propiedad | Valor |
|-----------|-------|
| Altura | `h-10` (40px) |
| Texto | `text-sm font-semibold` |
| Rounded contenedor | `rounded-xl` |
| Rounded botones | `rounded-lg` |
| Flechas (strokeWidth) | `2.5` |
| Flechas (tamaño) | `w-4 h-4` |
| Inactivo (variante A) | `text-white` al 100% — nunca opacidad |
| Activo (variante A) | `bg-slate-400 text-slate-900 shadow-md` |

Los criterios de orden son específicos de cada módulo y deben coincidir exactamente con las columnas ordenables de la tabla desktop.

**Regla:** las flechas siempre llevan `strokeWidth={2.5}` para mayor visibilidad. El texto inactivo es `text-white` al 100% (nunca `text-white/65` ni opacidad reducida).

---

## 11. Inputs de Formulario

Patrón estándar para campos donde el usuario escribe o consulta datos (nombre, descripción, teléfono, dirección, etc.).

Se diferencia del input de búsqueda (TC-5) en el tamaño de texto y ausencia de ícono de lupa — la altura es la misma (`h-11 lg:h-10 2xl:h-11`) para todos los elementos interactivos.

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

## 12. ModalBottom — Fondo Personalizable y Drag Handle

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
| `colorHandle` | `string` (CSS color) | Color directo para la pill del drag handle. Se combina con `headerOscuro` para colores dinámicos |
| `alturaMaxima` | `'sm' \| 'md' \| 'lg' \| 'xl'` | Altura máxima del modal en móvil |

### Valores de alturaMaxima

| Valor | CSS | Uso recomendado |
|-------|-----|-----------------|
| `sm` | `max-h-[65vh]` | Confirmaciones, alertas simples |
| `md` | `max-h-[75vh]` | Formularios cortos |
| `lg` | `max-h-[80vh]` | Modales de detalle (default) |
| `xl` | `max-h-[93vh]` | Modales de formulario BS con 2 columnas (ModalArticulo, ModalOferta) |

### Cuándo usar cada prop

- **Fondo completo oscuro** (ej: menú de cámara): `fondo="linear-gradient(135deg, #000000, #0f172a)" headerOscuro`
- **Header coloreado en modal normal** (ej: detalle de cliente): solo `headerOscuro` — el header del children se extiende automáticamente por detrás del handle
- **Gradiente dinámico por tipo** (ej: ModalArticulo, ModalOferta): `colorHandle={gradiente.handle} headerOscuro` — la pill cambia de color junto con el header al cambiar el tipo seleccionado

### colorHandle dinámico

Cuando el color del header cambia según el estado del formulario (tipo seleccionado), pasar el hex base del gradiente activo:

```tsx
const GRADIENTES_TIPO = {
  porcentaje: { bg: 'linear-gradient(135deg, #b91c1c, #dc2626)', handle: '#b91c1c', ... },
  monto_fijo: { bg: 'linear-gradient(135deg, #15803d, #16a34a)', handle: '#15803d', ... },
};

const gradiente = GRADIENTES_TIPO[formulario.tipo];

<ModalAdaptativo
  colorHandle={gradiente.handle}
  headerOscuro
  ...
>
```

La pill del drag handle seguirá el color del header en tiempo real al cambiar `formulario.tipo`.

### className no llega a ModalBottom

> ⚠️ `ModalAdaptativo` **no forwarded `className` a `ModalBottom`** (móvil). Solo llega al `Modal` de escritorio. Consecuencia: cualquier clase con `max-lg:` en `className` no tiene efecto útil. Para controlar estilos del modal en móvil usar `fondo`, `headerOscuro`, `colorHandle` y `alturaMaxima`.

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

## 13. whitespace-nowrap en Títulos Comprimidos

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
- Badges dentro de celdas de tabla (para que el texto no se parta al estrecharse la columna)

**Cuándo no aplicar:**
- Nombres de usuario o contenido variable (puede ser largo, debe recortarse con `truncate`)
- Descripciones o párrafos

---

## 14. Drawers / Menús Laterales en Móvil

Paneles de navegación que se deslizan desde un borde de la pantalla. Hay dos variantes según la dirección de entrada.

### Variantes

| Variante | Componente | Dirección | Ancho | Clase animación |
|----------|-----------|-----------|-------|-----------------|
| Menú principal | `MenuDrawer` | Derecha → izquierda | `w-[65%]` | `animate-slide-in` |
| Menú BS | `DrawerBusinessStudio` | Izquierda → derecha | `w-[60%]` | `animate-slide-in-left` |

### Regla de renderizado: Portal obligatorio

Los drawers deben renderizarse con `createPortal(jsx, document.body)` para escapar del stacking context de cualquier padre con `z-index` + `position`. Sin portal, un drawer dentro de un header `sticky z-40` queda atrapado en el contexto z=40 y es tapado por el BottomNav (`z-51`).

```tsx
import { createPortal } from 'react-dom';

// ✅ Correcto — escapa de cualquier stacking context
return createPortal(
  <>
    <div className="fixed inset-0 bg-black/50" style={{ zIndex: 1001 }} onClick={onCerrar} />
    <div className="fixed top-0 left-0 bottom-0 w-[60%] bg-white shadow-2xl animate-slide-in-left"
      style={{ zIndex: 1002 }}>
      {children}
    </div>
  </>,
  document.body
);

// ❌ Incorrecto — z-index atrapado por el padre
return (
  <>
    <div className="fixed inset-0 bg-black/50 z-1001" />
    <div className="fixed ... z-1002">{children}</div>
  </>
);
```

### Z-index (siempre via `style` inline)

| Capa | `zIndex` | Motivo |
|------|----------|--------|
| Overlay (fondo oscuro) | `1001` | Cubre todo: headers, BottomNav, contenido |
| Panel (drawer) | `1002` | Encima del overlay |

**Regla:** usar `style={{ zIndex: 1001 }}` para mayor claridad y explicitness. Aunque `z-1001` funciona en Tailwind v4, el valor inline deja claro que es un z-index crítico del sistema de capas y no un token visual cualquiera.

### Overlay

```
fixed inset-0 bg-black/50
onClick={onCerrar}
style={{ zIndex: 1001 }}
```

- El overlay siempre cierra el drawer al hacer click
- Cubre la pantalla completa incluyendo headers y BottomNav

### Panel

```
fixed top-0 [left-0|right-0] bottom-0 w-[60-65%] bg-white shadow-2xl overflow-y-auto
style={{ zIndex: 1002 }}
```

- Menú desde la izquierda: `left-0` + `animate-slide-in-left`
- Menú desde la derecha: `right-0` + `animate-slide-in`

### Animaciones de entrada (definidas en `index.css`)

```css
/* Entrada desde la derecha (MenuDrawer) */
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
.animate-slide-in {
  animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Entrada desde la izquierda (DrawerBusinessStudio) */
@keyframes slideInLeft {
  from { transform: translateX(-100%); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
.animate-slide-in-left {
  animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**Parámetros de timing:**
- Duración: `0.3s` — rápido pero perceptible
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` — desaceleración natural (ease-out de Material Design)
- Ambas variantes comparten los mismos valores para consistencia

### Bloqueo de scroll del body

Cuando el drawer está abierto, el body debe bloquearse para evitar scroll de fondo:

```tsx
useEffect(() => {
  const scrollY = window.scrollY;
  const body = document.body;
  const original = {
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    overflow: body.style.overflow,
  };

  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';
  body.style.overflow = 'hidden';

  return () => {
    Object.assign(body.style, original);
    window.scrollTo(0, scrollY);
  };
}, []);
```

**Nota:** `MenuDrawer` ya implementa esto. `DrawerBusinessStudio` puede omitirlo si el overlay + panel cubren toda la pantalla y el `overflow-y-auto` del panel captura el touch.

### Header del drawer

| Variante | Estilo header |
|----------|---------------|
| MenuDrawer | Gradiente metálico claro: `bg-linear-to-r from-slate-100 via-slate-200 to-slate-100` |
| DrawerBusinessStudio | Gradiente oscuro: `bg-linear-to-r from-gray-900 to-blue-600 text-white` |

### Ítem de navegación

| Propiedad | MenuDrawer | DrawerBusinessStudio |
|-----------|-----------|---------------------|
| Layout | `flex items-center gap-3 px-4 py-2.5` | `flex items-center gap-3 px-4 py-2.5` |
| Icono wrapper | `w-8 h-8 rounded-lg` con gradiente + icono `w-4 h-4 text-white` | Sin wrapper — icono `w-5 h-5` directo |
| Texto | `font-semibold text-gray-900` | `font-medium text-gray-700` |
| Activo | — | `bg-blue-50 text-blue-600 border-r-4 border-blue-500` |
| Hover | `hover:bg-linear-to-r hover:from-{color}-50 hover:translate-x-1` | `hover:bg-gray-50` |

### Cuándo crear un drawer nuevo

Antes de crear un drawer nuevo, verificar si `MenuDrawer` o `DrawerBusinessStudio` ya cubre el caso de uso. Solo crear uno nuevo si:
1. La navegación es de un contexto completamente diferente (no app general, no BS)
2. Necesita un layout radicalmente distinto (no solo diferentes ítems)

**Regla:** todo drawer nuevo debe seguir este patrón: portal + overlay z-1001 + panel z-1002 + animación slide-in 0.3s.

---

## 15. Patrón de Lista Móvil

Patrón estándar para mostrar listas de entidades en móvil dentro de Business Studio. Aplica a: Catálogo, Ofertas, Opiniones, Clientes, Transacciones.

### Principios

1. **Cards sueltos** — sin contenedor blanco con scroll interno. Cada item es un card independiente que fluye en el scroll natural de la página.
2. **Infinite scroll** — los items se cargan progresivamente al hacer scroll, no hay botón "cargar más".
3. **Desktop separado** — en `lg:` se usa tabla con scroll interno o grid contenido. El patrón móvil es `lg:hidden`.

### Dos estrategias de carga

| Estrategia | Cuándo usarla | Módulos |
|-----------|---------------|---------|
| **Backend offset/limit** | Items que crecen indefinidamente (miles) | Clientes, Transacciones |
| **Slice local** | Items acotados (<200) que ya están en memoria | Catálogo, Ofertas, Opiniones |

### Patrón: Slice local + IntersectionObserver

Para módulos donde todos los items ya están en memoria (cargados al abrir la página):

```tsx
const ITEMS_POR_PAGINA = 12;
const [itemsCargados, setItemsCargados] = useState(ITEMS_POR_PAGINA);
const observerRef = useRef<HTMLDivElement | null>(null);
const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

// Slice: mostrar solo los primeros N en móvil
const itemsMostrados = useMemo(() => {
  if (isMobile) return itemsFiltrados.slice(0, itemsCargados);
  return itemsFiltrados;
}, [itemsFiltrados, itemsCargados, isMobile]);

const hayMas = isMobile && itemsCargados < itemsFiltrados.length;

const cargarMas = useCallback(() => {
  if (hayMas) {
    setItemsCargados(prev => Math.min(prev + ITEMS_POR_PAGINA, itemsFiltrados.length));
  }
}, [hayMas, itemsFiltrados.length]);

// Reset al cambiar filtros
useEffect(() => {
  setItemsCargados(ITEMS_POR_PAGINA);
}, [/* dependencias de filtros */]);

// Observer
useEffect(() => {
  if (!isMobile || !hayMas) return;
  const observer = new IntersectionObserver(
    (entries) => { if (entries[0].isIntersecting) cargarMas(); },
    { root: null, rootMargin: '100px', threshold: 0.1 }
  );
  const el = observerRef.current;
  if (el) observer.observe(el);
  return () => { if (el) observer.unobserve(el); };
}, [isMobile, hayMas, cargarMas]);
```

### Patrón: Backend offset/limit + IntersectionObserver

Para módulos con items que crecen sin límite:

```tsx
// En el Zustand store:
const LIMIT_PAGINA = 20;
// cargarMas() → api.get('/endpoint', { limit: 20, offset })
// hayMas = respuesta.length === LIMIT_PAGINA

// En la página:
<div ref={sentinelaRef} className="h-1" />
// Observer con rootMargin: '100px'
```

### JSX del sentinel

```tsx
{/* Slice local — spinner visible */}
{hayMas && (
  <div ref={observerRef} className="w-full h-20 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
  </div>
)}

{/* Backend offset — sentinel invisible */}
<div ref={sentinelaRef} className="h-1" />
{cargandoMas && <Spinner />}
```

### Estructura móvil

```tsx
{/* Móvil: cards sueltos */}
<div className="lg:hidden space-y-2">
  {itemsMostrados.map((item) => (
    <div key={item.id} className="rounded-xl p-3 border-2 ...">
      {/* contenido del card */}
    </div>
  ))}
  {hayMas && (
    <div ref={observerRef} className="w-full h-20 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )}
</div>

{/* Desktop: tabla o grid con scroll interno */}
<div className="hidden lg:block ...">
  ...
</div>
```

### Constantes

| Módulo | Items por tanda | Estrategia |
|--------|----------------|------------|
| Catálogo | 12 | Slice local |
| Ofertas | 12 | Slice local |
| Opiniones | 12 | Slice local |
| Clientes | 20 | Backend offset |
| Transacciones | 20 | Backend offset |

**Regla:** los cards móviles nunca van dentro de un contenedor con `overflow-y-auto` y `max-h-*`. El scroll lo maneja el `<main>` de la página.

---

## 16. Jerarquía de Rounded

Regla de cascada para `border-radius` — cada nivel anidado usa un nivel menos de rounded que su padre.

### Escala

```
rounded-2xl → rounded-xl → rounded-lg → rounded-md → rounded-sm
```

### Aplicación por nivel

| Nivel | Rounded | Ejemplo |
|-------|---------|---------|
| **Contenedor exterior** (card de filtros, toggle group) | `rounded-xl` | Card blanca con búsqueda + filtros |
| **Elementos internos** (inputs, dropdowns, chips) | `rounded-lg` | Input de búsqueda, botones de toggle, chips de filtro |
| **Sub-elementos** (botones dentro de toggles que están dentro de cards) | `rounded-lg` | Botón activo dentro de un toggle group |

### Input dentro de cards

El componente `Input` tiene `rounded-xl` hardcodeado. Cuando se usa dentro de un card `rounded-xl`, forzar `rounded-lg` con el modificador important de Tailwind v4:

```tsx
<Input
  className="h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base"
/>
```

`rounded-lg!` sobreescribe el `rounded-xl` del componente sin modificar el componente global.

### KPIs

Los cards de KPIs usan `rounded-xl` fijo en todas las resoluciones — son elementos standalone, no hijos de un contenedor.

### Reglas

1. **Contenedor siempre un nivel arriba** de sus hijos directos en la escala de rounded.
2. **Nunca** un hijo con el mismo o mayor rounded que su padre — se ve visualmente roto.
3. **El modificador `!`** (important) se usa exclusivamente para sobreescribir componentes globales como `Input` dentro de contextos específicos.

---

## 17. CarouselKPI — Fade Dinámico

Componente wrapper para carousels horizontales de KPIs con indicadores visuales de que hay más contenido.

**Ubicación:** `apps/web/src/components/ui/CarouselKPI.tsx`

### Comportamiento

- **Fade derecho oscuro**: visible cuando hay más items a la derecha
- **Fade izquierdo oscuro**: visible cuando ya se scrolleó y hay items atrás
- **Desaparece al llegar al extremo**: detecta con `scrollLeft` + `clientWidth` vs `scrollWidth`
- **Solo en móvil**: los fades usan `lg:hidden`
- **No bloquea interacción**: `pointer-events-none` en los fades

### Especificaciones

| Propiedad | Valor |
|-----------|-------|
| Color del fade | `rgba(15, 23, 42, 0.45)` (slate-900 al 45%) |
| Ancho del fade | `w-7` (28px) |
| Z-index del fade | `z-10` |
| Detección de bordes | `scrollLeft <= 3` (inicio), `scrollLeft + clientWidth >= scrollWidth - 3` (fin) |
| Scrollbar | Oculto vía `scrollbarWidth: 'none'` inline |
| Recalculación | `scroll` event + `ResizeObserver` |

### Uso

```tsx
import { CarouselKPI } from '../../../../components/ui/CarouselKPI';

<CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
  <div className="flex lg:justify-end gap-2 pb-1 lg:pb-0">
    {/* KPI cards */}
  </div>
</CarouselKPI>
```

El componente maneja internamente: `overflow-x-auto`, ocultamiento de scrollbar, `lg:overflow-visible` para desktop, y los fades con posición absoluta.

### Cuándo usarlo

- Carousels de KPIs en headers de páginas BS (Clientes, Transacciones, Catálogo, Ofertas, Puntos)
- Cualquier fila horizontal de cards compactos que pueda desbordar en móvil

### Cuándo NO usarlo

- Tab bars de navegación — no necesitan indicador de "hay más"
- Chips de orden — están dentro de un contenedor oscuro que ya delimita visualmente

---

## 18. Swipe entre Páginas (Business Studio)

Navegación horizontal entre módulos de BS mediante gesto de swipe en móvil.

**Ubicación:** `apps/web/src/hooks/useSwipeNavegacionBS.ts`

### Comportamiento

- **Swipe izquierda** → navega al módulo siguiente
- **Swipe derecha** → navega al módulo anterior
- **Bounce al límite**: al llegar al primer/último módulo, el contenido se desplaza 30px y regresa con easing suave (300ms)
- **Solo en Business Studio**: el hook se desactiva fuera de `/business-studio/*`

### Configuración

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `SWIPE_THRESHOLD` | 30px | Mínimo recorrido horizontal para activar |
| `SWIPE_MAX_TIME` | 600ms | Tiempo máximo del gesto |
| `BOUNCE_DISTANCE` | 30px | Desplazamiento visual al llegar al límite |
| `BOUNCE_DURATION` | 300ms | Duración de la animación bounce |

### Exclusión de carousels horizontales

El hook ignora swipes que inician dentro de un contenedor con scroll horizontal. Recorre el DOM hacia arriba desde el punto de toque buscando elementos con `overflow-x: auto/scroll` que tengan `scrollWidth > clientWidth`:

```tsx
let target = e.target as HTMLElement | null;
while (target && target !== el) {
  const { overflowX } = window.getComputedStyle(target);
  if (
    (overflowX === 'auto' || overflowX === 'scroll') &&
    target.scrollWidth > target.clientWidth
  ) {
    swiping.current = false;
    return;
  }
  target = target.parentElement;
}
```

Esto protege automáticamente los carousels de KPIs, chips de orden con scroll, y cualquier futuro elemento con scroll horizontal.

### Conexión

El hook se conecta al `<main>` móvil en `MainLayout.tsx`:

```tsx
import { useSwipeNavegacionBS } from '../../hooks/useSwipeNavegacionBS';

// Dentro del componente:
useSwipeNavegacionBS(mobileMainRef);
```

### Módulos filtrados

El hook respeta la misma lógica de filtrado de módulos que `MobileHeader` — gerentes y dueños en sucursal secundaria no ven "Sucursales" ni "Puntos" en la navegación por swipe.

**Regla:** la lista de módulos en el hook debe mantenerse sincronizada con `MODULOS_BS` en `MobileHeader.tsx`. Si se agrega o reordena un módulo, actualizar ambos.

---

## 19. Tooltip

Componente de tooltip con portal — nunca recortado por `overflow:hidden`. Soporta mouse y touch.

**Ubicación:** `apps/web/src/components/ui/Tooltip.tsx`

### Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `text` | `string` | — | Texto del tooltip (requerido) |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'bottom'` | Posición relativa al trigger |
| `autoHide` | `number` | — | Ms para auto-cerrar. Usar en botones icono donde `onMouseLeave` es poco confiable |
| `className` | `string` | — | Clases aplicadas al wrapper del trigger. Útil para ocultar con breakpoints: `"2xl:hidden"` |
| `triggerOnClick` | `boolean` | `false` | Si `true`, abre/cierra al hacer click en lugar de hover |

### Reglas de uso

**Texto siempre `text-sm`** — nunca usar `text-xs`. El componente lo aplica internamente; no sobreescribir.

**`autoHide` en botones icono** — cuando el tooltip se activa con `onTouchStart` en móvil, no hay evento `onMouseLeave` para cerrarlo. Usar `autoHide={1500}` para que se cierre automáticamente.

**Touch en móvil** — el componente escucha `onTouchStart` además de `onMouseEnter`, por lo que funciona sin configuración extra en dispositivos táctiles.

**Portal a `document.body`** — usa `createPortal` con `z-index: 99999`. Nunca quedará recortado por un padre con `overflow:hidden` o `transform`.

### Ejemplo de uso

```tsx
import Tooltip from '../../../../components/ui/Tooltip';

// Botón icono con tooltip arriba y auto-cierre
<Tooltip text="Activar oferta" position="top" autoHide={1500}>
  <button onClick={toggleActivo} className="p-2 rounded-lg text-white/80 hover:text-white">
    {activo ? <Eye size={20} /> : <EyeOff size={20} />}
  </button>
</Tooltip>

// Tooltip solo en pantallas pequeñas (oculto en 2xl+)
<Tooltip text="Duplicar en sucursales" className="2xl:hidden">
  <button>...</button>
</Tooltip>
```

### Visual

```
bg-slate-900  text-white  text-sm font-medium
px-3 py-1.5  rounded-lg  whitespace-nowrap
boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
Flecha: borde CSS, color #0f172a
```
