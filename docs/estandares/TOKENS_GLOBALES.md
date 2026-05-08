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
12. [Formato de Fecha en Listas y Tablas](#12-formato-de-fecha-en-listas-y-tablas)
13. [Estética Profesional vs Caricaturesca](#13-estética-profesional-vs-caricaturesca)
14. [Reglas Pendientes de Validar](#14-reglas-pendientes-de-validar)

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

**Avatares fallback (sin foto):** gradient azul fijo + texto blanco + `shadow-md`. Aplica a cualquier círculo con iniciales de usuario/cliente en toda la app.

- **Tailwind:** `bg-linear-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-md`
- **Style inline (cuando el gradient se tapa con imagen condicional):** `style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}` + `text-white shadow-md`
- ❌ `bg-indigo-100 text-indigo-700` — usar gradient azul para mayor presencia visual
- ❌ `bg-slate-200 text-slate-600` (placeholder neutro) — avatar siempre debe tener color

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

### Avatares circulares en listas / cards / paneles de Dashboard

Estándar unificado para todo círculo que represente a un usuario, cliente, empleado, o ícono categórico prominente (Actividad Reciente, Alertas, Ofertas, items de lista móvil de Clientes / Transacciones / Empleados / Opiniones, etc.):

| | Móvil (base) | Laptop (`lg:`) | Desktop (`2xl:`) |
|---|---|---|---|
| Cuadro exterior | `w-14 h-14` | `w-10 h-10` | `w-12 h-12` |
| Icono/texto interior | `w-7 h-7` / `text-lg` | `w-5 h-5` / `text-sm` | `w-6 h-6` / `text-base` |
| Badge esquina (si aplica) | `w-7 h-7` | `w-5 h-5` | `w-6 h-6` |

**Patrón Tailwind:** `w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full shadow-md`

**Referencia de diseño:** tamaño de la imagen de Ofertas en `PanelCampanas`. Toma este patrón como estándar para cualquier elemento visual prominente en listas/cards del BS.

**Avatares miniatura** (badges pequeños junto a nombres inline, sin card dedicado) mantienen el patrón de "Items de lista" (`w-7 h-7`).

---

## 6. Grosor de Contornos (Bordes)

**Estándar: `border-2` (2px)** para elementos con contorno visible: botones, inputs, cards con borde, chips de filtro.
- Aplica igual en las 3 resoluciones — sin reducir en `lg:` ni `2xl:`
- `border-2` ✅ — `border` (1px) ❌ en elementos interactivos
- Excepción: líneas divisorias y separadores usan `1.5px` (`divide-y-[1.5px]` o `border-b-[1.5px]`)

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

### Hover en móvil — usar prefijo `lg:hover:`

En dispositivos táctiles, el estado `:hover` queda pegado después del tap (hasta que el usuario toque otra parte de la pantalla). Esto genera un "velo" visual que no se despega y confunde al usuario.

**Regla:** cuando un hover sirve solo para feedback de mouse en desktop, prefijarlo con `lg:hover:` para que no aplique en móvil.

```tsx
// ❌ Incorrecto — deja velo pegado tras tap en móvil
<button className="text-white hover:bg-white/10">

// ✅ Correcto — hover solo en laptop/desktop
<button className="text-white lg:hover:bg-white/10">
```

Aplica especialmente a:
- Chips de orden/filtro en headers móviles (segmented controls)
- Botones sobre fondos oscuros con `hover:bg-white/*`
- Items de lista compactos donde el tap ya dispara una acción

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
| Columnas laterales | `30` | Tailwind | `ColumnaIzquierda`, `ColumnaDerecha`, FAB móvil de toggle Mapa/Lista |
| FABs y toggles flotantes (interior) | `40` | Tailwind | `BottomNav` (móvil), Toggle Mapa/Lista flotante desktop, FABs de página que deben quedar DEBAJO del ChatOverlay |
| **ChatOverlay desktop** | **`41`** | Tailwind | Panel del chat al lado derecho/abajo. Tapa cualquier toggle/FAB de la página subyacente |
| ChatOverlay móvil | `50` | Tailwind | Full-screen sobre toda la app |
| Header sticky / Navbar global | `40` – `50` | Tailwind | `MobileHeader` (`z-40`), wrapper Navbar en `MainLayout` (`z-50`) |
| BottomNav (móvil) | `51` | Tailwind | `BottomNav` fijo en la parte inferior — 1 nivel sobre header sticky |
| Overlays de contenido | `60` – `100` | Tailwind | Tooltips, dropdowns, popovers dentro del flujo normal |
| Drawers / Menús laterales | `1001` – `1002` | `style` inline | Overlay (`1001`) + Panel (`1002`). Ver TC-18 |
| Leaflet overlays | `1000+` | Leaflet interno | Requiere `z-[1000]` para overlays sobre mapas |

### Reglas

1. **Drawers y modales full-screen** usan `style={{ zIndex: N }}` inline, no clases Tailwind — para señalar que son niveles críticos del sistema de capas.
2. **Portal obligatorio** para cualquier elemento con z-index > 1000 que se renderice dentro de un padre con stacking context (ver TC-18).
3. **Nunca reusar** el mismo z-index para elementos que pueden coexistir visualmente.
4. **BottomNav `z-51`** está intencionalmente 1 nivel arriba del header sticky (`z-50`) para que la barra inferior siempre sea visible durante scroll.
5. **Toggles/FABs de página NO deben superar `z-40`** — el `ChatOverlay` desktop vive en `z-41`. Si un toggle queda por encima, se ve por delante del chat al abrirlo. Caso de referencia: el toggle Mapa/Lista flotante de `PaginaNegocios` se bajó de `z-50` a `z-40` (mayo 2026) tras detectarse este conflicto.
6. **El navbar global (`z-50`) sí supera al ChatOverlay desktop (`z-41`)** — intencional. El navbar siempre debe ser accesible para que el usuario pueda cerrar el chat (campanita, ícono de chat, perfil).

---

## 12. Formato de Fecha en Listas y Tablas

### Fecha larga — formato estándar

Para mostrar fechas en listas, tablas, detalles, y cualquier contexto donde no se requiera tiempo relativo ("hace X horas"), el formato estándar es:

**Patrón:** `DD Mes AAAA` — día con 2 dígitos + mes con inicial mayúscula (palabra completa) + año completo.

**Ejemplos:** `09 Abril 2026`, `23 Diciembre 2026`, `01 Enero 2027`.

**Helper reutilizable:**

```tsx
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const formatearFechaLarga = (fechaISO: string | null) => {
  if (!fechaISO) return '—';
  const f = new Date(fechaISO);
  const dia = String(f.getDate()).padStart(2, '0');
  const mes = MESES_LARGOS[f.getMonth()];
  const anio = f.getFullYear();
  return `${dia} ${mes} ${anio}`;
};
```

**Variantes permitidas:**
- `Hoy` / `Ayer` para fechas recientes (primeras 24-48h) si el contexto lo requiere
- `Hace N días` solo para tiempos menores a 7 días en feeds/notificaciones

**❌ Prohibidos:**
- `toLocaleDateString('es-MX', { month: 'short' })` — genera "09 abr" con mes en minúscula, inconsistente con el resto
- `toLocaleDateString('es-MX', { month: 'long' })` — genera "9 de abril de 2026" con minúscula
- Formatos mixtos con comas internas o guiones entre día-mes

### Fecha completa — con día de semana y hora

Para modales de detalle donde se necesita contexto completo (fecha + hora de transacción):

**Patrón:** `Día, DD de Mes de AAAA, HH:MM` — con mayúsculas en día y mes.

**Ejemplo:** `Miércoles, 09 de Abril de 2026, 15:30`.

**Helper reutilizable:**

```tsx
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const formatearFechaCompleta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  const dia = DIAS_SEMANA[fecha.getDay()];
  const diaN = String(fecha.getDate()).padStart(2, '0');
  const mes = MESES_LARGOS[fecha.getMonth()];
  const anio = fecha.getFullYear();
  const hora = String(fecha.getHours()).padStart(2, '0');
  const min = String(fecha.getMinutes()).padStart(2, '0');
  return `${dia}, ${diaN} de ${mes} de ${anio}, ${hora}:${min}`;
};
```

---

## 13. Estética Profesional vs Caricaturesca

AnunciaYA es una herramienta de trabajo para comerciantes — Business Studio, ScanYA, Onboarding, Panel Admin y ChatYA del lado operador deben verse como **software B2B profesional** (Linear, Stripe Dashboard, Notion, Vercel). NO como app casual / videojuego / herramienta infantil.

### Anti-patrones (evitar siempre)

- **Iconos grandes en círculos con fondo pastel** (`w-8 h-8 rounded-full bg-amber-100` con icono dentro). Da efecto "panel de stats de juego".
- **Cards anidados con headers oscuros gruesos** que solo repiten el título de la sección — suman peso visual sin información.
- **Emojis como datos** en pantallas operativas (🥉🥈🥇 al lado de "Bronce/Plata/Oro", 🎉 en confirmaciones, etc.). Usar texto plano.
- **Saltos tipográficos exagerados** (label `text-xs` + valor `text-2xl` en cards densos) — efecto videojuego.
- **Bordes ≥2px y sombras visibles** en componentes anidados — todos compitiendo por atención.
- **Colores pastel y gradientes coloridos saturados** en stats / métricas operativas.
- **Múltiples acentos de color por componente** (un botón azul, otro verde, otro amarillo en la misma sección sin razón semántica).

### Patrones correctos

- **Listas densas inline** con filas tipo definition list: label izquierda, valor derecha, divider 1px entre filas. Sin headers oscuros redundantes.
- **Iconos pequeños** 14–16px (`w-3.5 h-3.5` o `w-4 h-4`) **sin círculo de fondo**, color neutro (`text-slate-500/600`).
- **Tipografía consistente con el contenedor padre** (no más chica, no más grande). Jerarquía por **peso** (`font-medium` → `font-semibold` → `font-bold`), no por tamaño.
- **Borde 1px** `border border-slate-300`, sombra máxima `shadow-sm`.
- **Color neutro (slate) + 1 acento de marca** (azul). Color semántico solo cuando aporta información (verde "abierto", rojo "cerrado", amarillo en estrellas de rating).
- **Texto plano** para niveles, estados, etiquetas.

### Variantes adaptativas (móvil/desktop)

Cuando un componente vive en contenedores con fondos distintos según breakpoint (típico en ChatYA: panel móvil con gradiente azul oscuro, desktop con `bg-slate-100`), las cards y textos necesitan **variantes lg:** explícitas:

| Aspecto | Móvil (sobre fondo oscuro) | Desktop (sobre fondo claro) |
|---|---|---|
| Fondo card | `bg-white/10 backdrop-blur-sm` | `bg-white` |
| Borde | `border-white/15` | `border-slate-300` |
| Divider | `divide-white/10` | `divide-slate-200` |
| Label | `text-white/75 font-semibold` | `text-slate-600 font-medium` |
| Valor | `text-white font-bold` | `text-slate-900 font-bold` |
| Icono | `text-white/60` | `text-slate-500` |
| Tamaño texto | `text-[15px]` (legibilidad táctil) | `text-[11px] 2xl:text-sm` |

**Regla clave:** una card blanca sólida sobre un fondo móvil azul oscuro **rompe la armonía visual** — siempre usar look glass translúcido en móvil cuando el contenedor padre tenga fondo oscuro.

### Excepción

Vistas dirigidas al **consumidor final** (CardYA del cliente, secciones públicas de Negocios, landing) pueden ser más amigables/coloridas — pero aún ahí evitar el efecto "panel de juego". El criterio es: ¿estamos celebrando algo (logro, recompensa) o estamos mostrando datos operativos? Lo primero permite color y forma; lo segundo no.

### Caso de referencia

`apps/web/src/components/chatya/PanelInfoContacto.tsx` (28 abr 2026): rediseño que reemplazó cards con iconos en círculos pastel + emojis de medalla por lista densa label/valor. Variantes móvil/desktop para armonizar con el gradiente azul del panel móvil.

---

## 14. Reglas Pendientes de Validar

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
