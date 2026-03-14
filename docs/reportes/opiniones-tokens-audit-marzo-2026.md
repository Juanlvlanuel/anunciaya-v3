# Reporte de Auditoría — Módulo Opiniones (Business Studio)
**Fecha:** 13 de marzo de 2026
**Archivos modificados:** `PaginaOpiniones.tsx`, `ModalResponder.tsx`

---

## Resumen

Auditoría completa del módulo Opiniones aplicando las 15 reglas del Sistema de Tokens de Diseño AnunciaYA v3.0. Se realizaron múltiples iteraciones hasta cero violaciones. Adicionalmente se alineó el estilo visual con el módulo Clientes.

---

## Cambios en `PaginaOpiniones.tsx`

### R1 — Tamaños mínimos de texto
- KPI labels: `text-[12px] lg:text-[10px]` → `text-sm lg:text-[11px] 2xl:text-sm`
- Metadata (·, sucursal, fecha): añadido `text-sm lg:text-[11px] 2xl:text-sm`
- Texto de reseña (italic): corregido a `text-sm lg:text-[11px] 2xl:text-sm`
- Texto de respuesta del negocio: corregido a `text-sm lg:text-[11px] 2xl:text-sm`
- Subtítulo del header: `text-sm` → `text-base lg:text-sm 2xl:text-base`

### R2 — Sin tonos pálidos
- `text-slate-500` → `text-slate-600` (subtítulo, empty state)
- `border-slate-200` → `border-slate-300` (todos los bordes)
- `bg-amber-50` → `bg-amber-100`
- `bg-blue-100/70` → `bg-blue-100` (sin opacidad en fondo coloreado)
- `hover:bg-red-50` → `hover:bg-red-100`
- Card reseña respondida: `bg-slate-50` → `bg-slate-200`
- Card reseña pendiente: `bg-orange-50` → `bg-orange-100`

### R3 — Peso mínimo font-medium
- Añadido `font-medium` a: párrafo empty state, spans de metadata, texto reseña italic, texto respuesta, fecha respuesta

### R5 — Iconos mínimos
- Star, MessageSquare, AlertCircle en KPIs: `lg:w-3 lg:h-3` → `w-4 h-4` fijo
- Icono de búsqueda: corregido a `w-4 h-4` fijo

### R6 — border-2 en elementos con contorno visible
- Chips estado/estrellas: `border` → `border-2`
- Chips amber: `border border-amber-200` → `border-2 border-amber-300`
- Los 3 cards principales: `border border-slate-300` → `border-2 border-slate-300`
- Card individual de reseña: `border` → `border-2`

### R7 — Sombras correctas
- 3 cards principales: `shadow-lg` → `shadow-md`
- Chips activos: `shadow-lg` → `shadow-sm`

### R10 — Padding del contenedor de filtros
- `p-3 lg:p-2 2xl:p-3` → `p-2.5 lg:p-3 2xl:p-4`

### R13 — Icono de búsqueda fijo
- `w-5 h-5 lg:w-3 lg:h-3 text-slate-400` → `w-4 h-4 text-slate-600`

---

## Cambios en `ModalResponder.tsx`

### R1
- Fecha: `text-[10px] lg:text-[9px]` → `text-sm lg:text-[11px] 2xl:text-sm`
- Etiqueta "Respuestas rápidas", botones template y contador: corregidos a mínimos

### R2
- Contenedor reseña: `bg-slate-50 border border-slate-200` → `bg-slate-100 border-2 border-slate-300`
- Icono User: `text-slate-500` → `text-slate-600`
- Botones template: `border border-slate-200` → `border-2 border-slate-300`

### R3
- Textarea: añadido `font-medium`
- Contador de caracteres: añadido `font-medium`
- Texto reseña: añadido `font-medium`

### R5
- Icono User: `lg:w-3.5 lg:h-3.5` → `w-4 h-4` fijo

---

## Alineación visual con módulo Clientes

### Estilo de pills de filtro
- `rounded-full py-2` → `rounded-lg h-10 lg:h-9 2xl:h-10` (mismo alto y radio)
- Estado activo: `ring-2 ring-offset-1` eliminado (mismo comportamiento que Clientes)
- Estado inactivo: `bg-white border-slate-300 hover:border-slate-400`

### Botón Pendientes (estado activo)
- `bg-orange-600 border-orange-600` → `bg-slate-800 border-slate-800` (igual que "Todas")

### Spacing header → KPIs (móvil)
- Contenedor KPIs: añadido `mt-5 lg:mt-0` (igual que Clientes)

### Spacing header → card filtros (móvil)
- Eliminado `mt-4` del card de filtros — el `space-y-3` del wrapper padre provee el gap correcto

### Subtítulo del header
- Tamaño: `text-sm` → `text-base lg:text-sm 2xl:text-base`
- Gap con título: `mt-0.5` → `-mt-1 lg:mt-0.5`

---

## Resultado final

- Violaciones de tokens detectadas: **~25**
- Violaciones corregidas: **25/25**
- Paridad visual con módulo Clientes: **completa**
