# Reporte: Auditoría de Tokens de Diseño — Dashboard Business Studio

> **Fecha:** 13 Marzo 2026
> **Scope:** Todos los componentes del Dashboard de Business Studio
> **Referencia:** `docs/estandares/SISTEMA_TOKENS_DISENO.md`

---

## Resumen Ejecutivo

Se realizó una auditoría completa del Dashboard contra las 7 reglas del Sistema de Tokens de Diseño. Se corrigieron violaciones en **12 archivos** distribuidas en 2 sesiones de trabajo. Adicionalmente se resolvió un bug de contorno negro en la gráfica Recharts y se actualizó el documento de tokens con 2 reglas nuevas descubiertas durante el proceso.

---

## Sesión 1 — Correcciones Iniciales

### Bug: Contorno negro al hacer click en Recharts

**Síntoma:** Al hacer click sobre la gráfica de ventas aparecía un rectángulo negro alrededor de toda el área en móvil y PC (efecto `-webkit-tap-highlight-color` de WebKit/Safari).

**Archivos modificados:**

**`apps/web/src/index.css`**
- Agregado CSS global para eliminar outline en componentes Recharts:
```css
.recharts-responsive-container,
.recharts-wrapper,
.recharts-surface {
  outline: none !important;
  -webkit-tap-highlight-color: transparent !important;
}
```

**`apps/web/src/pages/private/business-studio/dashboard/componentes/GraficaVentas.tsx`**
- Agregado `tabIndex={-1}` en ambas instancias de `AreaChart`

---

### Auditoría y correcciones — Sesión 1

#### `GraficaVentas.tsx`
| Regla | Cambio |
|-------|--------|
| Regla 6 | `shadow-lg hover:shadow-2xl transition-all` → `shadow-md` (card principal) |

#### `GraficaColapsable.tsx`
| Regla | Cambio |
|-------|--------|
| Regla 2 | `text-slate-500` en chevrons → `text-slate-600` |
| Regla 6 | `shadow-lg` → `shadow-md` |
| — | Agregado `focus:outline-none` al botón colapsable |

#### `KPIPrincipal.tsx`
| Regla | Cambio |
|-------|--------|
| Regla 5 | Modo `filaMovil`: icono `w-7 h-7` → `w-8 h-8 rounded-lg` |
| Regla 5 | Modo desktop: `w-8 h-8 2xl:w-9 2xl:h-9 rounded-md 2xl:rounded-lg` → `w-8 h-8 rounded-lg` (fijo en 3 resoluciones) |
| Regla 6 | Eliminados `hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all` de cards KPI |
| Regla 6 | `shadow-lg` → `shadow-md` |

#### `FooterAcciones.tsx`
| Regla | Cambio |
|-------|--------|
| Regla 4 | `sm:grid-cols-3` → `grid-cols-3` (breakpoint prohibido) |
| Regla 6 | `shadow-lg` → `shadow-md` |

#### `HeaderDashboard.tsx`
| Regla | Cambio |
|-------|--------|
| Regla 7 | 3 botones acción: `p-2.5 rounded-xl w-5 h-5` → `p-2 2xl:p-2.5 rounded-lg 2xl:rounded-xl w-4 h-4 2xl:w-5 2xl:h-5` |
| Regla 7 | Botón refresh: mismo patrón responsive que botones acción |

#### `PanelCampanas.tsx` (Sesión 1)
| Regla | Cambio |
|-------|--------|
| Regla 6 | `shadow-lg hover:shadow-2xl` → `shadow-md` |
| Regla 2 | `hover:bg-blue-100 hover:border-blue-300` en CardCampana → `hover:bg-slate-200` |

#### `PanelInteracciones.tsx` (Sesión 1)
| Regla | Cambio |
|-------|--------|
| Regla 6 | `shadow-lg hover:shadow-2xl` → `shadow-md` |
| Regla 5 | Header icon: `w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8` → `w-8 h-8` (fijo) |
| Regla 2 | Items list hover: `hover:bg-slate-100` → `hover:bg-slate-200` |
| Regla 2 | Icon backgrounds: `bg-emerald/amber/rose/blue/purple/slate-50` → `-100` |
| Regla 2 | Icon colors: `text-emerald/amber/rose/blue/purple-500` → `-600` |

#### `PanelOpiniones.tsx` (Sesión 1)
| Regla | Cambio |
|-------|--------|
| Regla 6 | `shadow-lg hover:shadow-2xl` → `shadow-md` |

#### `PanelAlertas.tsx` (Sesión 1)
| Regla | Cambio |
|-------|--------|
| Regla 6 | `shadow-lg hover:shadow-2xl` → `shadow-md` |

#### `PanelMetricasSecundarias.tsx`
| Regla | Cambio |
|-------|--------|
| Regla 6 | `shadow-lg` → `shadow-md` |

#### `BannerAlertasUrgentes.tsx` (Sesión 1)
| Regla | Cambio |
|-------|--------|
| Regla 6 | `shadow-lg` → `shadow-md` |

---

## Sesión 2 — Auditoría Completa de las 7 Reglas

En esta sesión se auditó cada componente contra **todas** las 7 reglas del documento de tokens, no solo sombras.

---

### `PanelOpiniones.tsx`
| Regla | Violación | Corrección |
|-------|-----------|------------|
| Regla 5 | Header icon: `w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8` | → `w-8 h-8` fijo |
| Regla 2 | Review item bg: `bg-amber-50/30` | → eliminado (`-50` prohibido) |
| Regla 2 | Review item hover: `hover:bg-amber-100/60` | → `hover:bg-amber-200` (ítem dentro de card) |
| Regla 2 | Review item border: `border-amber-100` | → `border-amber-200` |
| Regla 3 | Emoji span: sin `font-medium` | → `font-medium` agregado |
| Regla 1 | Emoji span: `lg:text-xs` | → `lg:text-[11px]` |

---

### `PanelCampanas.tsx`
| Regla | Violación | Corrección |
|-------|-----------|------------|
| Regla 5 | Header icon: `w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8` | → `w-8 h-8` fijo |
| Regla 2 | Badge "N Activas": `bg-emerald-50` | → `bg-emerald-100` |

**Ajustes de diseño adicionales:**
- Badge "N Activas" movido junto al título (de `justify-between` a inline con el header)
- Agregado `whitespace-nowrap` al badge
- Padding vertical del badge: `py-0.5` → `py-1 lg:py-0.5 2xl:py-1` (consistencia con badge "Todo bien" de PanelAlertas)

---

### `PanelAlertas.tsx`
| Regla | Violación | Corrección |
|-------|-----------|------------|
| Regla 5 | Header icon: `w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-md` | → `w-8 h-8 rounded-lg` fijo |
| Regla 2 | `getConfigSeveridad` alta: `bg-rose-50`, `text-rose-500`, `border-rose-100` | → `bg-rose-100`, `text-rose-600`, `border-rose-200` |
| Regla 2 | `getConfigSeveridad` media: `bg-amber-50`, `text-amber-500`, `border-amber-100` | → `bg-amber-100`, `text-amber-600`, `border-amber-200` |
| Regla 2 | `getConfigSeveridad` baja: `bg-blue-50`, `text-blue-500`, `border-blue-100` | → `bg-blue-100`, `text-blue-600`, `border-blue-200` |
| Regla 2 | `getConfigSeveridad` default: `bg-slate-50` | → `bg-slate-100` |
| Regla 2 | Alerta leída: `bg-slate-50/50` | → `bg-slate-100/50` |
| Regla 2 | Item hover: `hover:bg-slate-100` | → `hover:bg-slate-200` (ítem dentro de card) |
| Regla 2 | Botón check: `hover:bg-emerald-100`, `hover:text-emerald-500` | → `hover:bg-emerald-200`, `hover:text-emerald-600` |
| Regla 2 | Badge "Todo bien": `bg-emerald-50` | → `bg-emerald-100` |
| Regla 2 | Header icon: `text-rose-500` | → `text-rose-600` |

---

### `PaginaDashboard.tsx`
| Regla | Violación | Corrección |
|-------|-----------|------------|
| Regla 2 | Pills móvil: `bg-blue/pink/yellow/slate-50` | → `-100` |
| Regla 2 | Pills desktop: `bg-blue/pink/yellow-50` | → `-100` |
| Regla 2 | Labels pills: `text-blue/pink-500` | → `-600` |
| Regla 1 | Pills desktop: `lg:text-xs` (x4) | → `lg:text-[11px]` |
| Regla 6 | Card KPIs móvil: `shadow-lg` | → `shadow-md` |

---

### `GraficaVentas.tsx`
| Regla | Violación | Corrección |
|-------|-----------|------------|
| Regla 5 | Vertical mode header icon: `w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8` | → `w-8 h-8` fijo |
| Regla 1 | `lg:text-xs` en "Evolución diaria" | → `lg:text-[11px]` |
| Regla 1 | `lg:text-xs` en badge crecimiento | → `lg:text-[11px]` |
| Regla 1 | `lg:text-xs` en estado vacío | → `lg:text-[11px]` |

---

### `GraficaColapsable.tsx`
| Regla | Violación | Corrección |
|-------|-----------|------------|
| Regla 2 | `text-blue-500` en TrendingUp | → `text-blue-600` |
| Regla 2 | `text-rose-500` en TrendingDown | → `text-rose-600` |

---

### `FooterAcciones.tsx`
| Regla | Violación | Corrección |
|-------|-----------|------------|
| Regla 1 | `text-sm lg:text-xs 2xl:text-sm` en título de acción | → `lg:text-[11px]` |

*Nota: `bgLight` en el array ACCIONES usa valores `-50` pero no se referencia en el JSX — sin impacto visual.*

---

### `BannerAlertasUrgentes.tsx`
| Regla | Violación | Corrección |
|-------|-----------|------------|
| Regla 2 | `getConfigSeveridad` alta: `bg-rose-50`, `text-rose-500` | → `bg-rose-100`, `text-rose-600` |
| Regla 2 | `getConfigSeveridad` media: `bg-amber-50`, `text-amber-500` | → `bg-amber-100`, `text-amber-600` |
| Regla 2 | `getConfigSeveridad` baja: `bg-blue-50`, `text-blue-500` | → `bg-blue-100`, `text-blue-600` |
| Regla 2 | `getConfigSeveridad` default: `bg-slate-50` | → `bg-slate-100` |
| Regla 2 | Botón check: `hover:bg-emerald-100`, `hover:text-emerald-500` | → `hover:bg-emerald-200`, `hover:text-emerald-600` |

---

### `PanelMetricasSecundarias.tsx`
✅ Sin violaciones.

### `HeaderDashboard.tsx`
✅ Sin violaciones. Los botones icon-only cumplen Regla 7 exactamente.

---

## Reglas Nuevas Descubiertas y Agregadas al Documento de Tokens

Durante la auditoría se identificaron y validaron 2 patrones nuevos que se agregaron a `SISTEMA_TOKENS_DISENO.md`:

### Nueva regla en Sección 2 — Fondos de contenedores de icono estáticos
> **Fondos estáticos de contenedores de icono:** mínimo variante `-100`. Nunca `-50`.
> El icono interior debe usar mínimo variante `-600` del mismo color para contrastar.

### Sección 6 — Sombras (nueva sección)
| Contexto | Sombra | Hover de sombra |
|----------|--------|-----------------|
| Cards de panel | `shadow-md` | ❌ Ninguno |
| Botones pequeños | `shadow-sm` | ✅ Permitido |
| Elementos flotantes (tooltips, modales, dropdowns) | `shadow-lg` | — |

**Reglas derivadas:**
- Los cards **no** tienen `hover:shadow-*` — la sombra es estática
- Los cards **no** tienen `hover:scale-*` ni `hover:-translate-y-*` — sin animación de elevación

### Sección 7 — Botones de Acción Pequeños Icon-only (nueva sección)
| Resolución | Padding | Border radius | Icono |
|------------|---------|---------------|-------|
| Móvil (base) | `p-2` | `rounded-xl` | `w-5 h-5` |
| Laptop (`lg:`) | `p-2` | `rounded-lg` | `w-4 h-4` |
| Desktop (`2xl:`) | `p-2.5` | `rounded-xl` | `w-5 h-5` |

---

## Archivos Modificados — Listado Completo

| Archivo | Sesión |
|---------|--------|
| `apps/web/src/index.css` | 1 |
| `apps/web/src/pages/private/business-studio/dashboard/PaginaDashboard.tsx` | 1 + 2 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/GraficaVentas.tsx` | 1 + 2 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/GraficaColapsable.tsx` | 1 + 2 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/KPIPrincipal.tsx` | 1 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/HeaderDashboard.tsx` | 1 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/FooterAcciones.tsx` | 1 + 2 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/PanelCampanas.tsx` | 1 + 2 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/PanelInteracciones.tsx` | 1 + 2 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/PanelOpiniones.tsx` | 1 + 2 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/PanelAlertas.tsx` | 1 + 2 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/PanelMetricasSecundarias.tsx` | 1 |
| `apps/web/src/pages/private/business-studio/dashboard/componentes/BannerAlertasUrgentes.tsx` | 1 + 2 |
| `docs/estandares/SISTEMA_TOKENS_DISENO.md` | 1 + 2 |
