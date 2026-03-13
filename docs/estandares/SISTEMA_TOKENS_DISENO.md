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

**Hovers de fondo — botones y cards completos:** mínimo variante `-100`. Nunca variantes `-50`.
- `hover:bg-slate-100` ✅ — `hover:bg-slate-50` ❌
- `hover:bg-blue-100` ✅ — `hover:bg-blue-50` ❌

**Hovers de fondo — items clickeables dentro de un card:** mínimo variante `-200`. Nunca `-100` ni `-50` en este contexto.
- El tono puede adaptarse al diseño del panel (gris, azul, etc.), pero nunca por debajo de `-200`
- `hover:bg-slate-200` ✅ — `hover:bg-slate-100` ❌ (dentro de un card)
- `hover:bg-blue-200` ✅ — `hover:bg-blue-100` ❌ (dentro de un card)

**Fondos estáticos de contenedores de icono:** mínimo variante `-100`. Nunca `-50`.
- `bg-emerald-100` ✅ — `bg-emerald-50` ❌
- El icono interior debe usar mínimo variante `-600` del mismo color para contrastar

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

## 6. Sombras

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

## 7. Botones de Acción Pequeños (Icon-only)

Botones que contienen únicamente un icono, usados en headers y barras de control.

| Resolución | Padding | Border radius | Icono |
|------------|---------|---------------|-------|
| Móvil (base) | `p-2` | `rounded-xl` | `w-5 h-5` |
| Laptop (`lg:`) | `p-2` | `rounded-lg` | `w-4 h-4` |
| Desktop (`2xl:`) | `p-2.5` | `rounded-xl` | `w-5 h-5` |

Ejemplo: `p-2 2xl:p-2.5 rounded-lg 2xl:rounded-xl` con icono `w-4 h-4 2xl:w-5 2xl:h-5`

> Nota: en móvil el `rounded-xl` es igual al desktop. Laptop reduce a `rounded-lg` por densidad.

---

## 8. Reglas Pendientes de Validar

- [x] Tamaño mínimo de texto ✅
- [x] Escala de iconos (mínimos) ✅
- [x] Pesos tipográficos — mínimo `font-medium` (500) ✅
- [x] Sombras de cards ✅
- [x] Botones icon-only ✅
- [ ] Escala completa de tipografía (títulos, cuerpo, labels, etc.)
- [ ] Escala de spacing/padding
- [ ] Colores semánticos (éxito, error, warning)
- [ ] Botones (variantes completas, tamaños)
- [ ] Inputs/formularios
- [ ] Modales
- [ ] Z-index
- [ ] Animaciones/transiciones

---

**Este documento crece conforme se validan reglas en producción. No se agregan reglas teóricas.**
