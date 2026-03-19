# Tokens Globales de Diseño — AnunciaYA v3.0

> **Propósito:** Reglas que se auditan SIEMPRE en cualquier archivo de UI. Claude Code debe verificar estas reglas en cada auditoría de tokens.
> **Complemento:** Para patrones de componentes específicos, ver TOKENS_COMPONENTES.md

## Índice

1. [Tamaños Mínimos de Texto](#1-tamaños-mínimos-de-texto)
2. [Regla de Tonos — Nada Pálido](#2-regla-de-tonos--nada-pálido)
3. [Pesos Tipográficos](#3-pesos-tipográficos)
4. [Breakpoints](#4-breakpoints)
5. [Tamaños Mínimos de Iconos](#5-tamaños-mínimos-de-iconos)
6. [Grosor de Contornos (Bordes)](#6-grosor-de-contornos-bordes)
7. [Sombras](#7-sombras)
8. [Colores Semánticos](#8-colores-semánticos)
9. [Tipografía de Encabezado de Página y KPIs](#9-tipografía-de-encabezado-de-página-y-kpis)
10. [Transiciones](#10-transiciones)
11. [Escala de Z-index](#11-escala-de-z-index)
12. [Reglas Pendientes de Validar](#12-reglas-pendientes-de-validar)

---

## 1. Tamaños Mínimos de Texto

### Texto de interfaz (labels, badges, botones, headers)

| Dispositivo | Breakpoint | Tamaño mínimo | Notas |
|-------------|------------|---------------|-------|
| Móvil | base | `text-sm` (14px) | |
| Laptop | lg: | `text-[11px]` (11px) | Nunca `text-[10px]` ni `text-[9px]` |
| Desktop | 2xl: | `text-sm` (14px) | Nunca `text-xs` (12px) |

### Texto dentro de inputs de formulario (contenido que el usuario escribe/lee)

Los inputs de formulario usan tamaños mayores que el texto de interfaz. Razones:
- **16px en mobile** evita el auto-zoom automático de iOS al hacer focus
- El contenido escrito por el usuario requiere mayor legibilidad que las etiquetas de UI
- En laptop no se reduce a `text-xs` — 14px es el mínimo para datos

| Dispositivo | Breakpoint | Tamaño | Notas |
|-------------|------------|--------|-------|
| Móvil | base | `text-base` (16px) | Evita auto-zoom iOS |
| Laptop | lg: | `text-sm` (14px) | No bajar de 14px en campos de datos |
| Desktop | 2xl: | `text-base` (16px) | Restaura móvil |

**Patrón Tailwind para texto de input:** `text-base lg:text-sm 2xl:text-base font-medium text-slate-800`

**Patrón Tailwind para placeholder:** `placeholder:text-slate-500` — más visible que slate-400 pero distinguible del valor real.

### Excepciones — Texto por debajo del mínimo de interfaz permitido

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

## 8. Colores Semánticos

Mapeo de colores según la naturaleza del mensaje o acción. Aplica a badges de estado, iconos de acción, fondos de alerta, y cualquier elemento con carga semántica en toda la app.

| Semántica | Color base | Usos típicos |
|-----------|------------|--------------|
| Éxito / activo / disponible / confirmado | `emerald` | Estado "Activo", "Disponible", "Pagado", "Completado" |
| Error / peligro / eliminar / vencido | `red` | Estado "Vencido", botón eliminar, mensajes de error |
| Advertencia / pendiente / especial | `amber` | Estado "Próximo a vencer", destacado (⭐), advertencias |
| Información / filtro activo | `indigo` | Dropdowns activos, badges informativos |
| Neutral / inactivo / oculto / sin datos | `slate` | Estado "Inactivo", "Oculto", "Sin datos", elementos deshabilitados |
| Acción de navegación / enlace | `blue` | "Ver más", "Cargar más", links de texto dentro del contenido |

> **Botones de submit en formularios** (login, guardar, crear) — no usan paleta de color sino el Dark Gradient de Marca. Ver TC-9.

### Escala dentro de cada color semántico

Para cada color, la escala de uso es:

| Uso | Escala |
|-----|--------|
| Fondo de badge / chip de estado | `-100` |
| Texto sobre fondo claro | `-700` |
| Texto sobre fondo blanco (valor destacado) | `-600` |
| Icono sobre fondo blanco | `-600` |
| Borde de elemento activo | `-300` |
| Fondo de hover | `-100` |

Ejemplo con `emerald`:
```
bg-emerald-100 text-emerald-700   → badge "Activo"
text-emerald-600                  → precio en tabla
border-emerald-300                → input o card activo
hover:bg-emerald-100              → hover de botón de acción
```

**Regla:** nunca mezclar colores de distintas semánticas en un mismo elemento. Un estado "pendiente" es siempre `amber` — nunca `yellow`, `orange` ni `gold`.

---

## 9. Tipografía de Encabezado de Página y KPIs

Tokens validados para las dos estructuras tipográficas más repetidas: el encabezado de una página y los indicadores de métricas (KPIs).

### Encabezado de página

El encabezado de toda página de la app sigue el mismo patrón de H1 + subtítulo:

| Elemento | Clases |
|----------|--------|
| Título H1 | `text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight` |
| Subtítulo | `text-base lg:text-sm 2xl:text-base text-slate-600 font-medium` |

El subtítulo va inmediatamente debajo del título con separación mínima (`-mt-1 lg:mt-0.5`).

**Regla:** el título no cambia de tamaño entre móvil y laptop (`text-2xl` fijo) — solo crece en desktop (`2xl:text-3xl`). El subtítulo sí reduce en laptop (`lg:text-sm`).

### KPIs — Indicadores de métricas

Estructura estándar para tarjetas que muestran un valor numérico con su etiqueta:

| Elemento | Clases |
|----------|--------|
| Label (etiqueta del indicador) | `text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600` |
| Valor principal | `text-xl lg:text-lg 2xl:text-xl font-bold text-slate-800` |
| Valor con color semántico | `text-xl lg:text-lg 2xl:text-xl font-bold text-{color}-600` |
| Variación / tendencia (`+5%`, `-2`) | `text-sm lg:text-[11px] 2xl:text-sm font-semibold text-{color}-600` |

**Regla:** el valor nunca es `font-medium` — siempre `font-bold` o `font-extrabold`. La etiqueta nunca es `font-normal` — siempre `font-semibold`.

---

## 10. Transiciones

### Principio general — los hovers son instantáneos

Cualquier cambio de hover debe ser **instantáneo**, sin importar cuántas propiedades cambien. Esto aplica a color, fondo, borde, texto — solos o combinados.

```tsx
// ✅ Correcto — siempre instantáneo
<button className="hover:bg-slate-200">
<button className="hover:bg-slate-200 hover:border-slate-400">
<div className="hover:bg-gray-50 hover:border-blue-500">
<tr className="hover:bg-slate-200 cursor-pointer">

// ❌ Incorrecto — agrega delay perceptible
<button className="hover:bg-slate-200 transition-colors">
<button className="hover:bg-slate-200 hover:border-slate-400 transition-all duration-150">
```

El cerebro percibe la diferencia entre 0ms y 150ms en un hover. La inmediatez hace que la app se sienta rápida y responsiva.

### Excepción — cuando aparece o desaparece una sombra

Cuando el hover añade `shadow-sm` o `shadow-md` junto a un cambio de borde, se puede mantener `transition-all` porque la sombra es un cambio de profundidad (no solo color) y el salto visual sin transición puede verse brusco.

```tsx
// Acceptable — sombra + borde juntos
<div className="hover:border-slate-400 hover:shadow-sm transition-all">
```

### Hover solo en elementos interactivos

No poner `hover:*` en elementos que no son clickeables. El hover implica que algo va a pasar al hacer click — si el elemento no hace nada, el hover confunde al usuario.

```tsx
// ❌ Incorrecto — elemento no clickeable con hover
<div className="hover:bg-slate-200">Texto informativo</div>

// ✅ Correcto — sin hover
<div>Texto informativo</div>
```

### Switches y toggles — sin transición

Los botones que alternan entre estado activo/inactivo (selectores de periodo, chips de filtro, tabs) también deben ser instantáneos. El cambio de estado es una respuesta directa al click del usuario.

### Animaciones de entrada de elementos

Para elementos que aparecen dinámicamente en el DOM (panels, menús, expanders):

| Caso | Clase |
|------|-------|
| Aparece desde arriba | `animate-in slide-in-from-top duration-300` |
| Aparece desde abajo | `animate-in slide-in-from-bottom duration-200` |
| Aparece con fade + zoom (modales) | `animate-in fade-in zoom-in-95 duration-200` |
| Expander de contenido (sección que crece) | `animate-in slide-in-from-top duration-300` |

### Loading / procesando

```tsx
<RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
```

`animate-pulse` se reserva para indicadores de estado vivo ("En vivo", punto de disponibilidad) y skeletons de carga — nunca en elementos interactivos.

### Drawers / Menús laterales

Los drawers usan animaciones CSS definidas en `index.css`. Ambas variantes comparten la misma duración y easing para consistencia.

| Dirección | Clase | Keyframe |
|-----------|-------|----------|
| Desde la derecha | `animate-slide-in` | `slideInRight` — `translateX(100%) → 0` |
| Desde la izquierda | `animate-slide-in-left` | `slideInLeft` — `translateX(-100%) → 0` |

**Timing compartido:** `0.3s cubic-bezier(0.4, 0, 0.2, 1)` — desaceleración natural (ease-out de Material Design).

Ver TC-18 para la anatomía completa del drawer.

---

## 11. Escala de Z-index

Jerarquía de capas de la app. Cada nivel debe respetar su rango para evitar que elementos se tapen entre sí.

| Capa | Z-index | Método | Elementos |
|------|---------|--------|-----------|
| Contenido base | `0` – `10` | Tailwind | Cards, badges, elementos estáticos |
| Columnas laterales | `30` | Tailwind | `ColumnaIzquierda`, `ColumnaDerecha` |
| Header sticky | `40` – `50` | Tailwind | `MobileHeader` (`z-40`), wrapper en `MainLayout` (`z-50`) |
| BottomNav | `51` | Tailwind | `BottomNav` fijo en la parte inferior |
| Overlays de contenido | `60` – `100` | Tailwind | Tooltips, dropdowns, popovers dentro del flujo normal |
| Drawers / Menús laterales | `1001` – `1002` | `style` inline | Overlay (`1001`) + Panel (`1002`). Ver TC-18 |
| Leaflet overlays | `1000+` | Leaflet interno | Requiere `z-[1000]` para overlays sobre mapas |

### Reglas

1. **Drawers y modales full-screen** usan `style={{ zIndex: N }}` inline, no clases Tailwind — para señalar que son niveles críticos del sistema de capas.
2. **Portal obligatorio** para cualquier elemento con z-index > 1000 que se renderice dentro de un padre con stacking context (ver TC-18).
3. **Nunca reusar** el mismo z-index para elementos que pueden coexistir visualmente.
4. **BottomNav `z-51`** está intencionalmente 1 nivel arriba del header sticky (`z-50`) para que la barra inferior siempre sea visible durante scroll.

---

## 12. Reglas Pendientes de Validar

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
- [x] Modales de detalle ✅ (TC-8 actualizado: `headerOscuro` prop reemplaza hack `max-lg:`)
- [x] ModalBottom fondo personalizable y drag handle automático ✅ (TC-15)
- [x] Botones icon-only en laptop + Tooltip responsivo ✅ (TC-16)
- [x] `whitespace-nowrap` en títulos de celdas comprimidas ✅ (TC-17)
- [x] Dark gradient de marca ✅
- [x] Patrón tabla desktop ✅
- [x] Botones de acción inline en tabla ✅
- [x] Cards horizontales móvil (FilaMovil) ✅
- [x] Chips de orden en móvil ✅
- [x] Colores semánticos ✅
- [x] Tipografía de encabezado de página + KPIs ✅
- [x] Transiciones ✅
- [ ] Escala completa de tipografía (cuerpo, labels de formulario, etc.)
- [ ] Escala de spacing/padding
- [ ] Botones (variantes completas, tamaños)
- [ ] Inputs/formularios completos (formularios de datos, no solo búsqueda)
- [x] Z-index ✅ (TC-18: drawers con portal + z-index inline)
- [x] Patrón de lista móvil ✅ (TC-19: infinite scroll, slice local vs backend offset)
- [x] Jerarquía de rounded ✅ (TC-20: contenedor xl → hijos lg, Input rounded-lg!)
- [x] CarouselKPI con fade dinámico ✅ (TC-21: fades oscuros condicionales)
- [x] Swipe entre páginas BS ✅ (TC-22: hook con exclusión de carousels)

### Specs responsive pendientes de verificar en código real

- [ ] **R12** — Padding de ítems de dropdown para `lg:` y `2xl:` (base actual: `px-3 py-2`, ¿reduce en laptop?)
- [ ] **R15** — `max-h` del modal en `2xl:` (base: `85vh`, laptop: `75vh`, ¿desktop restaura a `85vh`?)
- [ ] **R15** — Texto de badges en contenido: ¿`text-sm` fijo o responde con `lg:text-[11px] 2xl:text-sm`?
- [ ] **R17** — Botón "Cargar más": ¿`py-3 text-sm` fijo o tiene variantes `lg:`/`2xl:`?
- [ ] **R18** — Padding de botones inline en tabla: ¿`p-1.5` fijo o reduce a `lg:p-1` en laptop?

---

**Este documento crece conforme se validan reglas en producción. No se agregan reglas teóricas.**
