# Sistema de Tokens de Diseño — AnunciaYA v3.0

> **Fecha:** 11 Marzo 2026
> **Propósito:** Gobernar toda la UI del proyecto con reglas únicas y consistentes.
> **Regla #1:** Laptop (lg:) NUNCA reduce por debajo de móvil. La densidad extra viene del LAYOUT, no del tamaño de texto.

---

## Principio Fundamental

```
MÓVIL (base)  →  LAPTOP (lg:)  →  DESKTOP (2xl:)
   =  o  ≤          =  o  ≤           máximo
```

El escalado es **ascendente o neutro**. Nunca descendente. Si móvil tiene `text-sm`, laptop tiene `text-sm` o `lg:text-base`, NUNCA `lg:text-xs`.

---

## 1. Escala Tipográfica

### 3 Niveles de Peso (todos gruesos, jerarquía por diferenciación)

| Nivel | Peso | Clase Tailwind | Uso |
|-------|------|----------------|-----|
| **Nivel 1 — Impacto** | 800 | `font-extrabold` | Títulos de página, valores KPI |
| **Nivel 2 — Énfasis** | 700 | `font-bold` | Títulos de panel/sección, nombres en listas, pills valores |
| **Nivel 3 — Soporte** | 600 | `font-semibold` | Labels, badges, subtítulos, texto de botones, métricas |

**Prohibido:** `font-black` (900), `font-normal` (400), `font-light` (300) en UI principal.
**Excepción:** `font-medium` (500) solo para texto de cuerpo largo (descripciones de 2+ líneas, textos de reseñas).

---

### Tabla de Tokens por Elemento

#### Títulos

| Token | Elemento | Móvil | Laptop (lg:) | Desktop (2xl:) | Peso | Color |
|-------|----------|-------|--------------|----------------|------|-------|
| `titulo-pagina` | H1 de cada página | `text-2xl` | `text-2xl` | `2xl:text-3xl` | `font-extrabold` | `text-slate-900` |
| `subtitulo-pagina` | Debajo del H1 | `text-sm` | `text-sm` | `2xl:text-base` | `font-semibold` | `text-slate-500` |
| `titulo-panel` | Header de cards/paneles | `text-base` | `text-base` | `2xl:text-lg` | `font-bold` | `text-slate-800` |
| `subtitulo-panel` | Debajo del título de panel | `text-xs` | `text-xs` | `2xl:text-sm` | `font-semibold` | `text-slate-500` |

**Ejemplo aplicado — HeaderDashboard:**
```
ANTES:  text-2xl lg:text-2xl 2xl:text-3xl font-extrabold
DESPUÉS: text-2xl lg:text-2xl 2xl:text-3xl font-extrabold  ← Sin cambio (ya correcto)

ANTES subtítulo:  text-sm lg:text-sm 2xl:text-base font-medium
DESPUÉS:          text-sm lg:text-sm 2xl:text-base font-semibold
```

#### KPIs

| Token | Elemento | Móvil | Laptop (lg:) | Desktop (2xl:) | Peso | Color |
|-------|----------|-------|--------------|----------------|------|-------|
| `kpi-valor` | Número grande ($1,500) | `text-xl` | `text-xl` | `2xl:text-2xl` | `font-extrabold` | `text-slate-800` |
| `kpi-titulo` | Label del KPI (Ventas) | `text-sm` | `text-sm` | `2xl:text-base` | `font-bold` | `text-slate-700` |
| `kpi-subtitulo` | Info adicional bajo KPI | `text-xs` | `text-xs` | `2xl:text-sm` | `font-semibold` | `text-slate-500` |

**Ejemplo aplicado — KPIPrincipal:**
```
ANTES valor:     text-xl 2xl:text-2xl font-black
DESPUÉS:         text-xl lg:text-xl 2xl:text-2xl font-extrabold

ANTES título:    text-sm font-bold (móvil) / hidden lg:block text-sm 2xl:text-base font-bold (desktop)
DESPUÉS:         text-sm lg:text-sm 2xl:text-base font-bold

ANTES subtítulo: hidden lg:block text-[10px] 2xl:text-xs
DESPUÉS:         hidden lg:block text-xs 2xl:text-sm font-semibold
```

#### Texto de Cuerpo

| Token | Elemento | Móvil | Laptop (lg:) | Desktop (2xl:) | Peso | Color |
|-------|----------|-------|--------------|----------------|------|-------|
| `texto-primario` | Nombres, títulos en listas | `text-sm` | `text-sm` | `2xl:text-base` | `font-bold` | `text-slate-800` |
| `texto-secundario` | Descripciones, info de soporte | `text-xs` | `text-xs` | `2xl:text-sm` | `font-medium` | `text-slate-600` |
| `texto-terciario` | Timestamps, contadores mínimos | `text-xs` | `text-xs` | `2xl:text-xs` | `font-semibold` | `text-slate-400` |

**Ejemplo aplicado — PanelInteracciones (ItemInteraccion):**
```
ANTES nombre:       text-sm lg:text-xs 2xl:text-sm font-semibold
DESPUÉS:            text-sm lg:text-sm 2xl:text-base font-bold

ANTES descripción:  text-xs lg:text-[11px] 2xl:text-xs
DESPUÉS:            text-xs lg:text-xs 2xl:text-sm font-medium

ANTES timestamp:    text-xs lg:text-[11px] 2xl:text-xs font-medium
DESPUÉS:            text-xs lg:text-xs 2xl:text-xs font-semibold
```

#### Badges y Pills

| Token | Elemento | Móvil | Laptop (lg:) | Desktop (2xl:) | Peso | Color |
|-------|----------|-------|--------------|----------------|------|-------|
| `badge-texto` | "3 Activas", "Todo bien" | `text-xs` | `text-xs` | `2xl:text-sm` | `font-semibold` | Según contexto |
| `pill-valor` | Número en pill (24, 89) | `text-sm` | `text-sm` | `2xl:text-base` | `font-bold` | Heredado del pill |
| `pill-label` | Texto en pill (Followers) | `text-sm` | `text-sm` | `2xl:text-base` | `font-semibold` | Más claro que valor |

**Ejemplo aplicado — Pills en PaginaDashboard:**
```
ANTES valor:  font-bold text-sm lg:text-xs 2xl:text-sm
DESPUÉS:      font-bold text-sm lg:text-sm 2xl:text-base

ANTES label:  text-sm lg:text-xs 2xl:text-base
DESPUÉS:      text-sm lg:text-sm 2xl:text-base font-semibold
```

#### Botones y Acciones

| Token | Elemento | Móvil | Laptop (lg:) | Desktop (2xl:) | Peso | Color |
|-------|----------|-------|--------------|----------------|------|-------|
| `boton-texto` | Texto de botones | `text-sm` | `text-sm` | `2xl:text-base` | `font-semibold` | Según contexto |
| `accion-titulo` | Título en action card | `text-sm` | `text-sm` | `2xl:text-base` | `font-semibold` | `text-slate-800` |
| `accion-desc` | Descripción en action card | `text-xs` | `text-xs` | `2xl:text-sm` | `font-medium` | `text-slate-500` |
| `enlace` | "Ver todas →", links inline | `text-xs` | `text-xs` | `2xl:text-sm` | `font-semibold` | Color de acento |

---

## 2. Tamaños Prohibidos

| Clase | Razón | Reemplazo |
|-------|-------|-----------|
| `text-[9px]` | Ilegible en cualquier pantalla | `text-xs` (12px) |
| `text-[10px]` | Ilegible en laptop a distancia | `text-xs` (12px) |
| `text-[11px]` | Tamaño arbitrario fuera de escala | `text-xs` (12px) |
| `text-[13px]` | Tamaño arbitrario fuera de escala | `text-sm` (14px) |
| `font-black` | Demasiado pesado, no necesario | `font-extrabold` (800) |
| `font-normal` | Demasiado delgado para UI | `font-medium` (500) mínimo |
| `font-light` | Ilegible en móvil | `font-medium` (500) mínimo |

**Escala permitida (solo estos tamaños):**
`text-xs` (12px) → `text-sm` (14px) → `text-base` (16px) → `text-lg` (18px) → `text-xl` (20px) → `text-2xl` (24px) → `text-3xl` (30px)

---

## 3. Escala de Spacing

### Padding de Contenedores

| Token | Elemento | Móvil | Laptop (lg:) | Desktop (2xl:) |
|-------|----------|-------|--------------|----------------|
| `padding-pagina` | Contenedor principal | `p-3` | `p-3` | `2xl:p-4` |
| `padding-card` | Cards, paneles | `p-3` | `p-3` | `2xl:p-4` |
| `padding-item` | Items dentro de listas | `p-2.5` | `p-2.5` | `2xl:p-3` |

**Regla:** Laptop usa el MISMO padding que móvil. Solo desktop puede crecer.

```
ANTES (patrón actual invertido):  p-3 lg:p-2 2xl:p-3
DESPUÉS (correcto):               p-3 lg:p-3 2xl:p-4
```

### Gaps

| Token | Elemento | Móvil | Laptop (lg:) | Desktop (2xl:) |
|-------|----------|-------|--------------|----------------|
| `gap-secciones` | Entre secciones principales | `space-y-4` | `space-y-4` | `2xl:space-y-6` |
| `gap-cards` | Entre cards en grid | `gap-3` | `gap-3` | `2xl:gap-4` |
| `gap-items` | Entre items en lista | `space-y-2` | `space-y-2` | `2xl:space-y-3` |
| `gap-inline` | Entre elementos en fila | `gap-2` | `gap-2` | `2xl:gap-3` |

```
ANTES:   space-y-8 lg:space-y-7 2xl:space-y-14
DESPUÉS: space-y-4 lg:space-y-4 2xl:space-y-6
```

---

## 4. Escala de Iconos

| Token | Elemento | Móvil | Laptop (lg:) | Desktop (2xl:) |
|-------|----------|-------|--------------|----------------|
| `icono-header` | Icono principal de página | `w-10 h-10` | `w-10 h-10` | `2xl:w-12 2xl:h-12` |
| `icono-panel` | Icono en header de panel | `w-7 h-7` | `w-7 h-7` | `2xl:w-8 2xl:h-8` |
| `icono-item` | Icono en items de lista | `w-6 h-6` | `w-6 h-6` | `2xl:w-7 2xl:h-7` |
| `icono-inline` | Icono junto a texto | `w-4 h-4` | `w-4 h-4` | `2xl:w-5 2xl:h-5` |
| `icono-tiny` | Icono en métricas/badges | `w-3.5 h-3.5` | `w-3.5 h-3.5` | `2xl:w-4 2xl:h-4` |

**Regla:** Mismo principio — laptop = móvil, solo desktop crece.

```
ANTES:   w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8
DESPUÉS: w-7 h-7 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8
```

---

## 5. Bordes y Sombras

| Token | Elemento | Clase |
|-------|----------|-------|
| `borde-card` | Borde de cards/paneles | `border-2 border-slate-200` (más sutil que slate-300) |
| `sombra-card` | Sombra base | `shadow-md` |
| `sombra-card-hover` | Sombra al hover | `hover:shadow-lg` (NO `hover:shadow-2xl` — exagerado) |
| `radio-card` | Border radius de cards | `rounded-xl lg:rounded-xl 2xl:rounded-2xl` |

**Cambios vs actual:**
- `border-slate-300` → `border-slate-200` (menos pesado visualmente)
- `hover:shadow-2xl` → `hover:shadow-lg` (más sutil y profesional)
- `hover:scale-[1.02]` → eliminar (el scale causa reflow y se siente "juguetón", no profesional)
- `hover:-translate-y-1` → eliminar (mismo motivo)

---

## 6. Alturas de Paneles

**Eliminar alturas fijas.** El contenido define la altura.

```
ANTES:   lg:h-54 2xl:h-66
DESPUÉS: (sin altura fija) + max-h-[280px] lg:max-h-[280px] 2xl:max-h-[360px] overflow-y-auto
```

Si un panel necesita limitar su altura (Alertas, Campañas), usar `max-h` con `overflow-y-auto`. Nunca `h-` fijo.

---

## 7. Layout Desktop — Proporciones

```
ANTES:   w-[58%] lg:w-[55%] 2xl:w-[58%]
DESPUÉS: w-[60%] lg:w-[60%] 2xl:w-[60%]
```

Proporción fija en todos los breakpoints desktop. La columna izquierda siempre 60%, la derecha 40%.

---

## 8. Colores de Texto (Paleta Reducida)

| Token | Clase | Uso |
|-------|-------|-----|
| `color-titulo` | `text-slate-900` | Solo H1 de página |
| `color-enfasis` | `text-slate-800` | Títulos de panel, nombres, valores KPI |
| `color-cuerpo` | `text-slate-700` | Labels de KPI, texto principal |
| `color-soporte` | `text-slate-600` | Descripciones, texto secundario |
| `color-sutil` | `text-slate-500` | Subtítulos de página, placeholders |
| `color-muted` | `text-slate-400` | Timestamps, separadores, info terciaria |

**Prohibido:** `text-slate-300` o más claro para texto (ilegible).

---

## 9. Cursor

**Regla:** Todo elemento clickeable lleva `cursor-pointer` excepto `<button>` nativo (ya lo tiene por default del browser).

Elementos que NECESITAN `cursor-pointer` explícito:
- `<div>` con `onClick`
- `<span>` con `onClick`
- `<a>` sin `href`
- Cards clickeables
- Iconos con acción

---

## 10. Resumen de Cambios por Componente del Dashboard

### KPIPrincipal.tsx
- Eliminar `font-black` → `font-extrabold`
- Eliminar `text-[10px]` → `text-xs`
- Laptop mantiene tamaños de móvil (eliminar todas las reducciones `lg:text-xs`, `lg:p-2`, etc.)
- Eliminar `hover:scale-[1.02]`, `hover:-translate-y-1`

### PanelAlertas.tsx
- Eliminar `lg:h-54 2xl:h-66` → `max-h-[280px] 2xl:max-h-[360px]`
- Eliminar `lg:text-[10px]`, `lg:text-[9px]` → `text-xs`
- Padding: `p-3 lg:p-3 2xl:p-4` (no reducir en laptop)

### PanelCampanas.tsx
- Eliminar `text-[10px]`, `text-[13px]` → `text-xs`, `text-sm`
- Eliminar `lg:h-54 2xl:h-66`
- Campaña imagen: `w-12 h-12 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14`

### PanelInteracciones.tsx
- Eliminar `lg:text-xs`, `lg:text-[11px]` → mantener `text-sm`, `text-xs`
- Gap e items: no reducir en laptop

### PanelOpiniones.tsx
- Eliminar `text-[10px]`, `text-[9px]`, `text-[12px]`, `text-[11px]`
- Reemplazar por `text-xs`, `text-sm` según corresponda

### FooterAcciones.tsx
- Eliminar `lg:text-[10px]` → `text-xs`
- Eliminar `hover:scale-[1.02]`, `hover:-translate-y-1`

### GraficaVentas.tsx / GraficaColapsable.tsx
- Eliminar `lg:text-[11px]`, `lg:text-[10px]` → `text-xs`
- Estadísticas: `text-base lg:text-base 2xl:text-lg font-bold`

### HeaderDashboard.tsx
- Subtítulo: `font-medium` → `font-semibold`
- Botones periodo: `text-sm lg:text-sm` (no reducir)

### PaginaDashboard.tsx
- Spacing: `space-y-8 lg:space-y-7 2xl:space-y-14` → `space-y-4 lg:space-y-4 2xl:space-y-6`
- Columna izquierda: `w-[60%]` fijo
- Padding raíz: `p-3 lg:p-3 2xl:p-4`

### BannerAlertasUrgentes.tsx
- Ya usa tamaños estándar, solo verificar que no tenga `font-normal`

---

## 11. Cómo Aplicar al Código Existente

### Estrategia: "Cuando lo tocas, lo alineas"

1. **Código nuevo** → nace con estos tokens. Sin excepción.
2. **Código que modificas** → alineas el archivo completo a los tokens.
3. **Código que no tocas** → se queda como está hasta que le toque.

### Excepción: Pase de alineación del Dashboard

El Dashboard es la primera pantalla que ve el usuario comercial. Se recomienda un pase dedicado para alinear TODOS sus componentes a estos tokens como primer ejercicio. Esto sirve como referencia para el resto del proyecto.

---

## 12. Checklist para Cada Componente

Antes de dar por terminado un componente, verificar:

- [ ] Ningún tamaño arbitrario (`text-[Npx]`)
- [ ] Ningún `font-black`, `font-normal`, `font-light`
- [ ] Laptop (lg:) NUNCA reduce por debajo de móvil
- [ ] Padding no se reduce en laptop
- [ ] Iconos no se reducen en laptop
- [ ] Gaps no se reducen en laptop
- [ ] No hay alturas fijas (`h-54`, `h-66`) — solo `max-h` si es necesario
- [ ] Hover no usa `scale` ni `translate-y`
- [ ] Sombras: `shadow-md` base, `hover:shadow-lg` máximo
- [ ] Elementos con `onClick` en `<div>`/`<span>` tienen `cursor-pointer`
- [ ] Colores de texto dentro de la paleta (slate-400 a slate-900)

---

**Fin del documento**
