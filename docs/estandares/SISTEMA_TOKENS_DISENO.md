# Sistema de Tokens de Diseño — AnunciaYA v3.0

> **Fecha:** 12 Marzo 2026
> **Propósito:** Reglas de diseño validadas en producción. Solo se agregan reglas probadas y confirmadas.

---

## 1. Tamaños Mínimos de Texto

| Dispositivo | Breakpoint | Tamaño mínimo | Notas |
|-------------|------------|---------------|-------|
| Móvil | base | `text-sm` (14px) | Validado en Dashboard |
| Laptop | lg: | `text-[11px]` (11px) | Validado en Dashboard. Nunca `text-[10px]` ni `text-[9px]` |
| Desktop | 2xl: | `text-sm` (14px) | Validado en Dashboard. Nunca `text-xs` (12px) |

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

**Hovers de fondo:** mínimo variante `-100`. Nunca variantes `-50`.
- `hover:bg-slate-100` ✅ — `hover:bg-slate-50` ❌
- `hover:bg-blue-100` ✅ — `hover:bg-blue-50` ❌

**Texto:** mínimo `text-slate-600`. Nunca `text-slate-500` ni más claro.

---

## 3. Pesos Tipográficos

Mínimo permitido: `font-medium` (500). Aplica a las 3 resoluciones.

**Prohibidos:** `font-normal` (400), `font-light` (300), `font-thin` (100). Todo texto sin peso explícito debe llevar mínimo `font-medium`.

Validado en Dashboard — "Compra por $1,500" en PanelInteracciones.

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

| Elemento | Icono mínimo | Cuadro exterior mínimo | Notas |
|----------|-------------|----------------------|-------|
| Items de lista | `w-4 h-4` (16px) | `w-7 h-7` (28px) | Validado en Dashboard. Nunca `w-3`/`w-6` |
| Headers de panel | `w-4 h-4` (16px) | `w-7 h-7` (28px) | Se mantienen como están |
| Header de página | Se mantiene como está | Se mantiene como está | Ya está bien |

**Patrón responsive de iconos (por encima del mínimo):**
- Móvil = tamaño base
- Laptop (lg:) = puede reducir (densidad)
- Desktop (2xl:) = igual al móvil o mayor

Ejemplo válido: `w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7` ✅ (laptop reduce pero no baja del mínimo `w-4`)
Ejemplo inválido: `w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5` ❌ (laptop baja a `w-3`, viola el mínimo `w-4`)

---

## 6. Reglas Pendientes de Validar

- [x] Tamaño mínimo de texto en Móvil — `text-sm` ✅
- [x] Escala de iconos (mínimos) ✅
- [ ] Escala completa de tipografía (títulos, cuerpo, labels, etc.)
- [x] Pesos tipográficos — mínimo `font-medium` (500) ✅
- [ ] Escala de spacing/padding
- [ ] Colores semánticos (éxito, error, warning)
- [ ] Botones (variantes, tamaños)
- [ ] Inputs/formularios
- [ ] Modales
- [ ] Z-index
- [ ] Animaciones/transiciones

---

**Este documento crece conforme se validan reglas en producción. No se agregan reglas teóricas.**
