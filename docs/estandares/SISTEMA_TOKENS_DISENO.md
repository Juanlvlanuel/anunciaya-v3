# Sistema de Tokens de Diseño — AnunciaYA v3.0

> **Fecha:** 13 Marzo 2026
> **Propósito:** Reglas de diseño validadas en producción. Solo se agregan reglas probadas y confirmadas.

---

## 1. Tamaños Mínimos de Texto

| Dispositivo | Breakpoint | Tamaño mínimo | Notas |
|-------------|------------|---------------|-------|
| Móvil | base | `text-sm` (14px) | |
| Laptop | lg: | `text-[11px]` (11px) | Nunca `text-[10px]` ni `text-[9px]` |
| Desktop | 2xl: | `text-sm` (14px) | Nunca `text-xs` (12px) |

### Excepciones — Texto por debajo del mínimo permitido

Se permite usar texto menor al mínimo **únicamente** en estos casos:

| Excepción | Tamaño permitido | Ejemplo | Razón |
|-----------|-----------------|---------|-------|
| Contadores dentro de badges circulares | `text-[9px]` - `text-[10px]` | "9+" en badge de notificaciones | El círculo es pequeño, el número debe caber |
| Contadores sobre iconos | `text-[9px]` - `text-[10px]` | Badge rojo sobre campana | Mismo caso, espacio limitado |

**Fuera de estas excepciones, el mínimo es obligatorio.**

---

## 2. Regla de Tonos — Nada Pálido

El brillo de pantalla hace que los tonos claros desaparezcan. Todo debe tener presencia visual.

**Bordes:** mínimo `border-slate-300`. Nunca `border-slate-200` ni `border-slate-100`.

**Fondos slate:** mínimo `bg-slate-200`. Nunca `bg-slate-100` ni `bg-slate-50` — son casi blancos y desaparecen visualmente.
- `bg-slate-200` ✅ — `bg-slate-100` ❌ — `bg-slate-50` ❌
- `hover:bg-slate-200` ✅ — `hover:bg-slate-100` ❌ — `hover:bg-slate-50` ❌
- Sin opacidad: `bg-slate-200/80` ❌
- Excepciones que permiten `bg-slate-100` ✅: rayado zebra de filas, fondo de inputs/formularios

**Fondos de color (indigo, emerald, red, etc.):** mínimo variante `-100`. Nunca `-50`.
- `bg-indigo-100` ✅ — `bg-indigo-50` ❌
- `hover:bg-indigo-100` ✅ — `hover:bg-indigo-50` ❌

**Contenedores de icono:** el icono interior debe usar mínimo variante `-600` del mismo color para contrastar.

**Avatares fallback (sin foto):** color fijo `bg-indigo-100 text-indigo-700`. Aplica a cualquier círculo con iniciales de usuario/cliente en toda la app.

**Texto:** mínimo `text-slate-600`. Nunca `text-slate-500` ni más claro.

---

## 3. Pesos Tipográficos

Mínimo permitido: `font-medium` (500). Aplica a las 3 resoluciones.

**Prohibidos:** `font-normal` (400), `font-light` (300), `font-thin` (100). Todo texto sin peso explícito debe llevar mínimo `font-medium`.

---

## 4. Breakpoints

Se usan 3 niveles, consistentes con la guía responsive existente:

| Breakpoint | Resolución | Dispositivo |
|------------|------------|-------------|
| base | < 1024px | Móvil |
| `lg:` | ≥ 1024px | Laptop (1366x768) |
| `2xl:` | ≥ 1536px | Desktop / Full HD |

**No usar:** `sm:`, `md:`, `xl:` — solo `lg:` y `2xl:`.

Todo texto que tenga tamaños chicos debe tener los 3 breakpoints definidos. Si falta alguno, agregarlo.

---

## 5. Tamaños Mínimos de Iconos

El mínimo aplica a las 3 resoluciones. Laptop puede reducir siguiendo el patrón responsive existente, pero nunca por debajo del mínimo.

**Items de lista — tamaños por resolución:**

| | Móvil (base) | Laptop (`lg:`) | Desktop (`2xl:`) |
|---|---|---|---|
| Cuadro exterior | `w-7 h-7` | `w-6 h-6` | `w-7 h-7` |
| Icono interior | `w-4 h-4` | `w-4 h-4` | `w-4 h-4` |

Ejemplo: `w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7` con icono `w-4 h-4` fijo

**Headers de panel — tamaños por resolución:**

| | Móvil (base) | Laptop (`lg:`) | Desktop (`2xl:`) |
|---|---|---|---|
| Cuadro exterior | `w-8 h-8 rounded-lg` | `w-8 h-8 rounded-lg` | `w-8 h-8 rounded-lg` |
| Icono interior | `w-4 h-4` | `w-4 h-4` | `w-4 h-4` |

Fijo en las 3 resoluciones — sin variación responsive.

**Regla general:** laptop puede reducir el cuadro exterior (no el icono interior), pero nunca por debajo del mínimo `w-6`/`w-4`.

---

## 6. Grosor de Contornos (Bordes)

**Estándar: `border-2` (2px)** para elementos con contorno visible: botones, inputs, cards con borde, chips de filtro.
- Aplica igual en las 3 resoluciones — sin reducir en `lg:` ni `2xl:`
- `border-2` ✅ — `border` (1px) ❌ en elementos interactivos
- Excepción: líneas divisorias y separadores usan `border` (1px)

**Badges de estado (spans informativos):** sin contorno. Solo `bg-*-100 text-*-700`. Nunca `border-*`.

---

## 7. Sombras

**Token estándar para cards de panel:** `shadow-md`

| Contexto | Sombra | Hover de sombra |
|----------|--------|-----------------|
| Cards de panel | `shadow-md` | ❌ Ninguno |
| Botones pequeños | `shadow-sm` | ✅ Permitido |
| Elementos flotantes (tooltips, modales, dropdowns) | `shadow-lg` | — |

**Reglas:**
- Los cards **no** tienen `hover:shadow-*` — la sombra es estática
- Los cards **no** tienen `hover:scale-*` ni `hover:-translate-y-*` — sin animación de elevación
- `shadow-lg` y superiores quedan reservados para elementos que flotan sobre el contenido

---

## 8. Botones de Acción Pequeños (Icon-only)

Botones que contienen únicamente un icono, usados en headers y barras de control.

| Resolución | Padding | Border radius | Icono |
|------------|---------|---------------|-------|
| Móvil (base) | `p-2` | `rounded-xl` | `w-5 h-5` |
| Laptop (`lg:`) | `p-2` | `rounded-lg` | `w-4 h-4` |
| Desktop (`2xl:`) | `p-2.5` | `rounded-xl` | `w-5 h-5` |

Ejemplo: `p-2 2xl:p-2.5 rounded-lg 2xl:rounded-xl` con icono `w-4 h-4 2xl:w-5 2xl:h-5`

> Nota: en móvil el `rounded-xl` es igual al desktop. Laptop reduce a `rounded-lg` por densidad.

---

## 9. Altura de Elementos Interactivos (Botones e Inputs)

Altura estándar validada para botones, inputs y dropdowns en toda la app.

| Dispositivo | Breakpoint | Altura | px |
|-------------|------------|--------|----|
| Móvil | base | `h-10` | 40px |
| Laptop | `lg:` | `h-9` | 36px |
| Desktop | `2xl:` | `h-10` | 40px |

**Patrón Tailwind:** `h-10 lg:h-9 2xl:h-10`

Aplica a: botones de acción, dropdowns, inputs de búsqueda/formulario, chips de filtro interactivos.

**Regla:** todo elemento interactivo debe respetar esta altura. No se permite `h-8` ni menor en ningún breakpoint.

---

## 10. Padding Interno de Contenedores de Filtros / Cards

Padding validado para cards que contienen controles de filtro (búsqueda, dropdowns, chips).

| Dispositivo | Breakpoint | Padding |
|-------------|------------|---------|
| Móvil | base | `p-2.5` (10px) |
| Laptop | `lg:` | `p-3` (12px) |
| Desktop | `2xl:` | `p-4` (16px) |

**Patrón Tailwind:** `p-2.5 lg:p-3 2xl:p-4`

---

## 11. Tipografía de Botones Interactivos (Filtros y Dropdowns)

Aplica a: botones de filtro (chips), botones de dropdown (Período, Estado, Operador) y cualquier botón de control de vista en toda la app.

| Propiedad | Valor | Notas |
|-----------|-------|-------|
| Peso | `font-semibold` (600) | Igual en las 3 resoluciones |
| Tamaño móvil | `text-sm` (14px) | Mínimo R1 |
| Tamaño laptop | `lg:text-xs` (12px) | Mínimo R1 laptop |
| Tamaño desktop | `2xl:text-sm` (14px) | Restaura móvil |
| Border | `border-2 rounded-lg` | Ver R6 |

**Patrón Tailwind:** `font-semibold text-sm lg:text-xs 2xl:text-sm border-2 rounded-lg`

**Regla:** `font-medium` queda prohibido en botones de filtro y dropdown — solo `font-semibold` o superior.

---

## 12. Anatomía de Dropdowns

Estructura validada para todos los dropdowns de la app (Período, Estado, Operador, y similares).

### Panel contenedor

```
rounded-xl border-2 border-slate-300 shadow-lg py-1 overflow-hidden
mt-1.5  ← separación fija del botón que lo abre
```

### Ítems dentro del panel

```
w-full flex items-center gap-2.5 px-3 py-2
text-base lg:text-xs 2xl:text-sm font-medium text-left cursor-pointer transition-colors
```

- Activo: `bg-slate-200 text-slate-800 font-semibold` (neutral) o `bg-indigo-100 text-indigo-700 font-semibold` (indigo)
- Inactivo: `text-slate-600 hover:bg-slate-200`
- `font-medium` es la base para todos los ítems — el activo lo sobreescribe con `font-semibold`

### Indicador de selección (círculo + check)

```
w-5 h-5 rounded-full flex items-center justify-center shrink-0
- Activo: bg-slate-700 (neutral) / bg-indigo-500 (indigo)
- Inactivo: bg-slate-200
Check interior: w-3 h-3 text-white
```

### Chevron en el botón

```
w-5 h-5 shrink-0 transition-transform
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

---

## 13. Input de Búsqueda

Patrón estándar para inputs de búsqueda en toda la app.

| Propiedad | Valor |
|-----------|-------|
| Altura | `h-10 lg:h-9 2xl:h-10` (ver R9) |
| Texto | `text-sm lg:text-xs 2xl:text-sm` (ver R1) |
| Ícono | `w-4 h-4 text-slate-600` fijo — sin variación responsive |
| Padding derecho | `pr-8` — reservado para botón limpiar (X) |

Botón limpiar (X): `absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-600 hover:bg-slate-200`

---

## 14. Padding Horizontal de Botones (Filtros y Dropdowns)

| Tipo | Móvil | Laptop | Desktop |
|------|-------|--------|---------|
| Chips de filtro | `px-4` | `px-3` | `px-4` |
| Dropdown con texto | `pl-3 pr-2.5` | `pl-2.5 pr-2` | `pl-3 pr-2.5` |

- Chips: `px-4 lg:px-3 2xl:px-4`
- Dropdowns (texto + chevron): `pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5`

> La asimetría izquierda/derecha en dropdowns es intencional: el padding derecho es menor porque el chevron ya aporta espacio visual.

---

## 15. Modales de Detalle (Bottom Sheet + Desktop)

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
  className="lg:max-w-md 2xl:max-w-lg max-lg:[background:linear-gradient(180deg,#COLOR_2.5rem,rgb(248,250,252)_2.5rem)]"
>
```

- `sinScrollInterno` — solo afecta `ModalBottom` (móvil), no `Modal` (desktop)
- `max-lg:[background:...]` — colorea el área del drag handle en móvil para que coincida con el header
- El color del gradiente CSS debe coincidir con el color base del header

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
<button className="ml-auto shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
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

## 16. Reglas Pendientes de Validar

- [x] Tamaño mínimo de texto ✅
- [x] Escala de iconos (mínimos) ✅
- [x] Pesos tipográficos — mínimo `font-medium` (500) ✅
- [x] Sombras de cards ✅
- [x] Botones icon-only ✅
- [x] Altura de elementos interactivos ✅
- [x] Padding interno de contenedores de filtros ✅
- [x] Tipografía de botones interactivos ✅
- [x] Anatomía de dropdowns ✅
- [x] Input de búsqueda ✅
- [x] Padding horizontal de botones ✅
- [x] Modales de detalle ✅
- [ ] Escala completa de tipografía (títulos, cuerpo, labels, etc.)
- [ ] Escala de spacing/padding
- [ ] Colores semánticos (éxito, error, warning)
- [ ] Botones (variantes completas, tamaños)
- [ ] Inputs/formularios completos (formularios de datos, no solo búsqueda)
- [ ] Z-index
- [ ] Animaciones/transiciones

---

**Este documento crece conforme se validan reglas en producción. No se agregan reglas teóricas.**
