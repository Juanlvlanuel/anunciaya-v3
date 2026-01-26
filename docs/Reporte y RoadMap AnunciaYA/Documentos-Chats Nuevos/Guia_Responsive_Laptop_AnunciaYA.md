# Guía de Diseño Responsivo para Vista Laptop - AnunciaYA
## VERSIÓN COMPLETA ACTUALIZADA

Este documento detalla el patrón de diseño responsivo implementado en AnunciaYA para optimizar la experiencia en pantallas de laptop (1366x768) sin afectar las vistas de móvil ni PC FullHD (1920x1080).

**ACTUALIZACIÓN:** Enero 13, 2026 - Incluye patrones específicos para modales

---

## 1. Patrón Principal de Breakpoints

### Estructura Base
```
base-value lg:laptop-value 2xl:desktop-value
```

### Breakpoints de Tailwind Utilizados
| Breakpoint | Resolución | Dispositivo |
|------------|------------|-------------|
| (base) | < 1024px | Móvil / Tablet |
| `lg:` | ≥ 1024px | Laptop (1366x768) |
| `2xl:` | ≥ 1536px | PC FullHD (1920x1080) |

### ⚠️ REGLA DE ORO (CRÍTICA)
- **Base**: Diseño móvil (sin prefijo)
- **lg:**: Ajustes específicos para laptop
- **2xl:**: ⚡ **OBLIGATORIO** - Restaura valores originales de PC

### Ejemplo Práctico
```jsx
// ❌ Antes (solo móvil y desktop)
className="text-lg p-4 w-32"

// ✅ Después (con soporte laptop)
className="text-lg lg:text-sm 2xl:text-lg p-4 lg:p-2 2xl:p-4 w-32 lg:w-24 2xl:w-32"
```

**IMPORTANTE:** Sin `2xl:`, el valor de laptop también se aplica a PC (1920x1080). Esto rompe el diseño de escritorio.

---

## 2. Categorías de Ajustes

### 2.1 Tamaños de Texto

#### Tabla General
| Elemento | Base (móvil) | lg: (laptop) | 2xl: (desktop) |
|----------|--------------|--------------|----------------|
| Título grande | text-2xl | lg:text-xl | 2xl:text-2xl |
| Título medio | text-xl | lg:text-base | 2xl:text-xl |
| Título pequeño | text-lg | lg:text-sm | 2xl:text-lg |
| Texto normal | text-base | lg:text-sm | 2xl:text-base |
| Texto pequeño | text-sm | lg:text-xs | 2xl:text-sm |
| Texto mínimo | text-xs | lg:text-xs | 2xl:text-xs |

#### 🆕 Texto Ultra Pequeño (Para Modales)
| Elemento | Base | lg: (laptop) | 2xl: (desktop) | Cuándo usar |
|----------|------|--------------|----------------|-------------|
| Badge/Pill | text-xs | lg:text-[10px] | 2xl:text-xs | Etiquetas pequeñas |
| Texto compacto | text-xs | lg:text-[11px] | 2xl:text-xs | Items de lista en modales |
| Subtítulos | text-sm | lg:text-[11px] | 2xl:text-sm | Descripciones cortas |

**Nota:** `text-[11px]` es el **mínimo legible**. Solo usar `[10px]` para badges.

---

### 2.2 Espaciado (Padding/Margin)

#### Componentes Normales
| Tamaño Original | lg: (laptop) | 2xl: (desktop) | Reducción |
|-----------------|--------------|----------------|-----------|
| p-6 / m-6 | lg:p-4 / lg:m-4 | 2xl:p-6 / 2xl:m-6 | 33% |
| p-5 / m-5 | lg:p-3 / lg:m-3 | 2xl:p-5 / 2xl:m-5 | 40% |
| p-4 / m-4 | lg:p-2.5 / lg:m-2.5 | 2xl:p-4 / 2xl:m-4 | 37% |
| p-3 / m-3 | lg:p-2 / lg:m-2 | 2xl:p-3 / 2xl:m-3 | 33% |
| p-2 / m-2 | lg:p-1.5 / lg:m-1.5 | 2xl:p-2 / 2xl:m-2 | 25% |

#### 🆕 Modales (Más Agresivo)
| Tamaño Original | lg: (laptop) | 2xl: (desktop) | Reducción |
|-----------------|--------------|----------------|-----------|
| p-6 | lg:p-3 | 2xl:p-6 | **50%** |
| p-4 | lg:p-2.5 | 2xl:p-4 | **37%** |
| p-3 | lg:p-1.5 | 2xl:p-3 | **50%** |
| p-2 | lg:p-1 | 2xl:p-2 | **50%** |

**Razón:** La altura limitada de laptop (768px) requiere máxima compactación vertical en modales.

---

### 2.3 Gaps (Espaciado entre elementos)

#### Componentes Normales
| Gap Original | lg: (laptop) | 2xl: (desktop) | Reducción |
|--------------|--------------|----------------|-----------|
| gap-4 | lg:gap-3 | 2xl:gap-4 | 25% |
| gap-3 | lg:gap-2 | 2xl:gap-3 | 33% |
| gap-2 | lg:gap-1.5 | 2xl:gap-2 | 25% |
| gap-1.5 | lg:gap-1 | 2xl:gap-1.5 | 33% |

#### 🆕 Modales (Ultra Reducidos)
| Gap Original | lg: (laptop) | 2xl: (desktop) | Reducción |
|--------------|--------------|----------------|-----------|
| gap-3 | lg:gap-1.5 | 2xl:gap-3 | **50%** |
| gap-2 | lg:gap-1 | 2xl:gap-2 | **50%** |
| gap-2 | lg:gap-0.5 | 2xl:gap-2 | **75%** ⚡ |
| gap-1 | lg:gap-0.5 | 2xl:gap-1 | **50%** |

**Nota:** `gap-0.5` (2px) es visualmente aceptable en laptop para máxima compactación.

---

### 2.4 Dimensiones (Width/Height)

#### Iconos y Elementos Pequeños
| Tamaño Original | lg: (laptop) | 2xl: (desktop) | Reducción |
|-----------------|--------------|----------------|-----------|
| w-12 h-12 | lg:w-8 lg:h-8 | 2xl:w-12 2xl:h-12 | 33% |
| w-10 h-10 | lg:w-8 lg:h-8 | 2xl:w-10 2xl:h-10 | 20% |
| w-6 h-6 | lg:w-5 lg:h-5 | 2xl:w-6 2xl:h-6 | 16% |
| w-5 h-5 | lg:w-4 lg:h-4 | 2xl:w-5 2xl:h-5 | 20% |
| w-4 h-4 | lg:w-3 lg:h-3 | 2xl:w-4 2xl:h-4 | 25% |

#### 🆕 Elementos en Modales
| Elemento | Base | lg: (laptop) | 2xl: (desktop) | Reducción |
|----------|------|--------------|----------------|-----------|
| Preview imagen | w-14 h-14 | lg:w-8 lg:h-8 | 2xl:w-14 2xl:h-14 | **43%** |
| Avatar/Thumbnail | w-12 h-12 | lg:w-8 lg:h-8 | 2xl:w-12 2xl:h-12 | **33%** |
| Checkbox | w-5 h-5 | lg:w-3 lg:h-3 | 2xl:w-5 2xl:h-5 | **40%** |
| ↳ Ícono interno | w-4 h-4 | lg:w-2.5 lg:h-2.5 | 2xl:w-4 2xl:h-4 | **37%** |
| Ícono decorativo | w-6 h-6 | lg:w-3.5 lg:h-3.5 | 2xl:w-6 2xl:h-6 | **42%** |
| Ícono loading | w-12 h-12 | lg:w-6 lg:h-6 | 2xl:w-12 2xl:h-12 | **50%** |

**Importante:** Los íconos internos (dentro de checkboxes, botones) deben reducirse proporcionalmente.

---

### 2.5 Bordes Redondeados
| Tamaño Original | lg: (laptop) | 2xl: (desktop) |
|-----------------|--------------|----------------|
| rounded-2xl | lg:rounded-xl | 2xl:rounded-2xl |
| rounded-xl | lg:rounded-lg | 2xl:rounded-xl |
| rounded-lg | lg:rounded-md | 2xl:rounded-lg |

---

### 2.6 Alturas Máximas (max-h)
| Tamaño Original | lg: (laptop) | 2xl: (desktop) | Contexto |
|-----------------|--------------|----------------|----------|
| max-h-[85vh] | lg:max-h-[70vh] | 2xl:max-h-[85vh] | Lightbox |
| max-h-[80vh] | lg:max-h-[80vh] | 2xl:max-h-[80vh] | Modales |
| max-h-[300px] | lg:max-h-[220px] | 2xl:max-h-[300px] | Dropdowns |

---

### 2.7 Anchos Máximos (max-w)

#### Componentes Normales
| Tamaño Original | lg: (laptop) | 2xl: (desktop) |
|-----------------|--------------|----------------|
| max-w-sm | lg:max-w-xs | 2xl:max-w-sm |
| max-w-md | lg:max-w-sm | 2xl:max-w-md |
| max-w-[90vw] | lg:max-w-[70vw] | 2xl:max-w-[90vw] |

#### 🆕 Modales (Saltar un nivel)
| Tamaño Original | lg: (laptop) | 2xl: (desktop) | Reducción |
|-----------------|--------------|----------------|-----------|
| max-w-lg | lg:max-w-sm | 2xl:max-w-lg | **~40%** |
| max-w-md | lg:max-w-xs | 2xl:max-w-md | **~40%** |
| max-w-sm | lg:max-w-sm | 2xl:max-w-sm | Sin cambio (ya es pequeño) |

**Patrón:** En modales, "saltar" un nivel de tamaño (lg→sm, md→xs) para máxima compactación.

---

## 3. 🆕 Tabla de Reducciones por Tipo de Componente

| Tipo de Componente | Ancho | Padding | Spacing | Imágenes | Texto |
|-------------------|-------|---------|---------|----------|-------|
| **Componentes Normales** | 30-35% ↓ | 30-40% ↓ | 25-30% ↓ | 30-35% ↓ | 1-2 niveles ↓ |
| **Modales - Formulario** | 30-35% ↓ | 35-40% ↓ | 40% ↓ | 30-35% ↓ | 1-2 niveles ↓ |
| **Modales - Lista/Selector** | **40-50% ↓** | **40-50% ↓** | **50% ↓** | **40-45% ↓** | 1-2 niveles ↓ |
| **Modales - Confirmación** | Sin cambio | **50% ↓** | 40% ↓ | **50% ↓** | 1-2 niveles ↓ |

**Conclusión:** Los modales necesitan reducciones MÁS agresivas que la guía general por la altura limitada (768px).

---

## 4. Patrones por Tipo de Componente

### 4.1 Modales (ACTUALIZADO)

#### A. Modal de Lista/Selector (Más Compacto)
```jsx
// Contenedor principal
<div className="
  bg-white rounded-xl w-full 
  max-w-lg lg:max-w-sm 2xl:max-w-lg 
  max-h-[80vh] lg:max-h-[80vh] 2xl:max-h-[80vh] 
  overflow-hidden flex flex-col shadow-2xl
">
  {/* Header */}
  <div className="flex items-center justify-between p-4 lg:p-2.5 2xl:p-4 border-b">
    <div className="flex items-center gap-2 lg:gap-1 2xl:gap-2">
      <Copy className="w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5" />
      <h2 className="text-lg lg:text-sm 2xl:text-lg font-bold">Título</h2>
    </div>
    <X className="w-5 h-5" />
  </div>

  {/* Body */}
  <div className="flex-1 overflow-y-auto p-4 lg:p-2.5 2xl:p-4 space-y-4 lg:space-y-2 2xl:space-y-4">
    {/* Preview */}
    <div className="bg-slate-50 rounded-lg p-3 lg:p-1.5 2xl:p-3 border">
      <p className="text-xs lg:text-[11px] 2xl:text-xs mb-2 lg:mb-1.5 2xl:mb-2">Preview:</p>
      <div className="flex items-center gap-3 lg:gap-1.5 2xl:gap-3">
        <img className="w-14 h-14 lg:w-8 lg:h-8 2xl:w-14 2xl:h-14 rounded-lg" />
        <div className="flex-1">
          <h3 className="text-sm lg:text-[11px] 2xl:text-sm font-semibold">Nombre</h3>
          <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500">Detalle</p>
        </div>
      </div>
    </div>

    {/* Lista de items */}
    <div className="space-y-1.5">
      <button className="w-full p-3 lg:p-1.5 2xl:p-3 rounded-lg border">
        <div className="flex items-center gap-2 lg:gap-1 2xl:gap-2">
          {/* Checkbox */}
          <div className="w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 rounded border-2">
            <CheckCircle className="w-4 h-4 lg:w-2.5 lg:h-2.5 2xl:w-4 2xl:h-4" />
          </div>
          {/* Info */}
          <div className="flex-1">
            <h4 className="text-sm lg:text-[11px] 2xl:text-sm font-medium">Item</h4>
            <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500">Detalle</p>
          </div>
        </div>
      </button>
    </div>
  </div>

  {/* Footer */}
  <div className="flex gap-2 lg:gap-1 2xl:gap-2 p-4 lg:p-2.5 2xl:p-4 border-t bg-slate-50">
    <button className="flex-1 px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2">Cancelar</button>
    <button className="flex-1 px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2">Confirmar</button>
  </div>
</div>
```

#### B. Modal de Confirmación/Loading
```jsx
// Modal pequeño centrado
<div className="bg-white rounded-xl w-full max-w-sm lg:max-w-sm 2xl:max-w-sm p-6 lg:p-3 2xl:p-6">
  <div className="text-center">
    <AlertCircle className="w-12 h-12 lg:w-6 lg:h-6 2xl:w-12 2xl:h-12 mx-auto mb-3 lg:mb-1.5 2xl:mb-3" />
    <h3 className="text-lg lg:text-sm 2xl:text-lg font-bold mb-2 lg:mb-1.5 2xl:mb-2">Título</h3>
    <p className="text-sm lg:text-xs 2xl:text-sm mb-4 lg:mb-2 2xl:mb-4">Mensaje</p>
    <button className="px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2">Aceptar</button>
  </div>
</div>
```

---

### 4.2 Cards
```jsx
// Contenedor de card
className="w-full lg:w-[180px] lg:h-[270px] 2xl:w-[270px] 2xl:h-[410px] bg-white rounded-2xl"

// Imagen dentro de card
className="h-48 lg:h-[130px] 2xl:h-[200px]"

// Padding del contenido
className="px-4 py-3 lg:px-2 lg:py-2 2xl:px-4 2xl:py-3"
```

---

### 4.3 Botones
```jsx
// Botón primario
className="px-6 py-2.5 lg:px-4 lg:py-1.5 2xl:px-6 2xl:py-2.5 text-base lg:text-sm 2xl:text-base rounded-xl lg:rounded-lg 2xl:rounded-xl"

// Botón con icono
className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full"

// Icono dentro de botón
className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5"
```

---

### 4.4 Pills/Chips de Filtros
```jsx
className="rounded-full shadow-lg px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 flex items-center gap-2 lg:gap-1 2xl:gap-2 text-sm lg:text-[11px] 2xl:text-sm"

// Icono del chip
className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4"
```

---

### 4.5 Dropdowns
```jsx
// Contenedor del dropdown
className="fixed bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-lg w-[220px] lg:w-[160px] 2xl:w-[220px]"

// Lista con scroll
className="max-h-[300px] lg:max-h-[220px] 2xl:max-h-[300px] overflow-y-auto"

// Items del dropdown
className="w-full px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 text-sm lg:text-[11px] 2xl:text-sm"
```

---

### 4.6 Inputs
```jsx
// Input de búsqueda
className="w-full pl-9 pr-4 py-2.5 lg:py-1.5 2xl:py-2.5 text-sm lg:text-xs 2xl:text-sm rounded-lg"
```

---

### 4.7 Grids
```jsx
// Grid de 2-3 columnas
className="grid lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-3 2xl:gap-4"

// Grid con sidebar
className="lg:grid-cols-[1fr_240px] 2xl:grid-cols-[1fr_320px] lg:gap-4 2xl:gap-8"
```

---

### 4.8 Lightbox/Imágenes Expandidas
```jsx
// Contenedor de imagen
className="max-w-[90vw] lg:max-w-[70vw] 2xl:max-w-[90vw] max-h-[85vh] lg:max-h-[70vh] 2xl:max-h-[85vh]"

// Imagen
className="max-w-full max-h-[85vh] lg:max-h-[70vh] 2xl:max-h-[85vh] object-contain"
```

---

## 5. Márgenes Laterales para Contenido Principal

### Patrón de Margen Lateral en Laptop
Para que el contenido no quede pegado a los bordes en laptop:

```jsx
// Envoltorio de sección
className="px-5 lg:px-0 lg:mx-4 2xl:mx-0"

// O directamente en el contenedor
className="lg:mx-4 2xl:mx-0"
```

**Importante:** Si el componente ya tiene `px-5` internamente, solo agregar `lg:mx-4 2xl:mx-0`.

---

## 6. 🆕 Casos Especiales - Cuándo NO Reducir Tanto

### Mantener Usabilidad Mínima

#### 1. Botones de Acción Principales
```jsx
// Solo 20% reducción (mantener área táctil)
py-2.5 lg:py-2 2xl:py-2.5
```

#### 2. Inputs de Formulario
```jsx
// Mantener altura mínima usable
py-2.5 lg:py-2 2xl:py-2.5
```

#### 3. Íconos de Navegación
```jsx
// Solo 10% reducción (mantener área táctil)
w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10
```

#### 4. Checkboxes - Mínimo Táctil
```jsx
// w-3 h-3 es el MÍNIMO absoluto
w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5
```

**Razón:** Menor que `w-3` es difícil de clickear incluso con mouse.

---

## 7. Reglas Importantes

### 7.1 ⚡ SIEMPRE mantener el valor base
```jsx
// ✅ Correcto - tiene valor base para móvil
className="text-base lg:text-sm 2xl:text-base"

// ❌ Incorrecto - falta valor base
className="lg:text-sm 2xl:text-base"
```

### 7.2 ⚡ SIEMPRE restaurar con 2xl:
```jsx
// ✅ Correcto - 2xl restaura al valor original
className="p-4 lg:p-2 2xl:p-4"

// ❌ Incorrecto - falta 2xl (laptop afecta a PC)
className="p-4 lg:p-2"
```

**CRÍTICO:** Sin `2xl:`, el valor de laptop también se aplica a PC (1920x1080).

### 7.3 No usar xl: breakpoint
- Evitar `xl:` para mantener consistencia
- Usar solo `lg:` (laptop) y `2xl:` (desktop)

### 7.4 Orden de breakpoints
```jsx
// ✅ Correcto
className="base lg:laptop 2xl:desktop"

// ❌ Incorrecto
className="2xl:desktop lg:laptop base"
```

---

## 8. Valores Especiales

### Tamaños de Texto Personalizados
```jsx
lg:text-[10px]  // Para badges/pills (MÍNIMO absoluto)
lg:text-[11px]  // Para texto compacto en listas (MÍNIMO legible)
```

**Límite:** No usar tamaños menores a `[10px]` - son ilegibles.

### Dimensiones Fijas en Laptop
```jsx
// Cards de negocio
lg:w-[180px] lg:h-[270px] 2xl:w-[270px] 2xl:h-[410px]

// Imagen de card
lg:h-[130px] 2xl:h-[200px]

// Ancho de dropdown
lg:w-[160px] 2xl:w-[220px]

// Input de búsqueda mínimo
lg:min-w-[140px] 2xl:min-w-[200px]
```

---

## 9. 🎓 Lecciones Aprendidas

### 1. La altura limitada de laptop (768px) es el cuello de botella
- Priorizar reducción **vertical** sobre horizontal
- Modales necesitan **máxima compactación**
- `space-y-4 lg:space-y-2` es crítico

### 2. El patrón de 3 niveles es OBLIGATORIO
```jsx
// Sin 2xl: → laptop afecta a PC ❌
className="p-4 lg:p-2"

// Con 2xl: → PC mantiene original ✅
className="p-4 lg:p-2 2xl:p-4"
```

### 3. Texto en `[11px]` es el mínimo legible
- `[10px]` solo para badges/pills
- Menor que eso es ilegible en cualquier pantalla

### 4. Gaps de `0.5` (2px) funcionan en laptop
- Visualmente aceptables
- Máximo aprovechamiento de espacio vertical

### 5. Checkboxes de `w-3` son el mínimo táctil
- Menor que eso es difícil de clickear
- Mantener área interactiva mínima

---

## 10. Checklist de Implementación

### Para Componentes Normales:
- [ ] Tamaños de texto reducidos con `lg:text-*`
- [ ] Padding/margin reducidos 30-40% con `lg:p-* lg:m-*`
- [ ] Gaps reducidos 25-30% con `lg:gap-*`
- [ ] Iconos reducidos 20-30% con `lg:w-* lg:h-*`
- [ ] Bordes redondeados ajustados con `lg:rounded-*`
- [ ] **TODOS** los valores restaurados con `2xl:*`
- [ ] Vista móvil no afectada (valores base intactos)
- [ ] Vista PC sin cambios (2xl restaura originales)

### 🆕 Para Modales Específicamente:
- [ ] Ancho reducido 40-50%: `max-w-lg lg:max-w-sm`
- [ ] Padding reducido 40-50%: `p-4 lg:p-2.5`
- [ ] Spacing vertical reducido 50%: `space-y-4 lg:space-y-2`
- [ ] Gaps reducidos 50%+: `gap-2 lg:gap-0.5`
- [ ] Imágenes reducidas 40-45%: `w-14 lg:w-8`
- [ ] Checkboxes reducidos 40%: `w-5 lg:w-3`
- [ ] Texto ultra pequeño: `lg:text-[11px]`, `lg:text-[10px]`
- [ ] Items de lista: padding al 50%
- [ ] Íconos internos proporcionales
- [ ] **CRÍTICO:** Todos restaurados con `2xl:`

---

## 11. Ejemplo Completo de Transformación

### Antes (Solo Móvil + Desktop)
```jsx
<div className="p-4 rounded-xl">
  <h2 className="text-lg font-bold mb-3">
    <Star className="w-5 h-5" />
    Título
  </h2>
  <p className="text-sm text-slate-600">Descripción</p>
  <button className="px-4 py-2 rounded-lg text-sm">
    Acción
  </button>
</div>
```

### Después (Móvil + Laptop + Desktop)
```jsx
<div className="p-4 lg:p-2 2xl:p-4 rounded-xl lg:rounded-lg 2xl:rounded-xl">
  <h2 className="text-lg lg:text-sm 2xl:text-lg font-bold mb-3 lg:mb-2 2xl:mb-3">
    <Star className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
    Título
  </h2>
  <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600">Descripción</p>
  <button className="px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg text-sm lg:text-xs 2xl:text-sm">
    Acción
  </button>
</div>
```

---

## 12. Resumen Rápido

### Fórmula General (Componentes):
```
Base → lg: -30% → 2xl: restaurar
```

### Fórmula para Modales:
```
Base → lg: -40-50% → 2xl: restaurar
```

### Lo Más Importante:
1. ⚡ **SIEMPRE** usar patrón de 3 niveles: `base lg: 2xl:`
2. Modales necesitan reducciones más agresivas que otros componentes
3. Priorizar reducción vertical (altura limitada: 768px)
4. Checkboxes mínimo `w-3`, texto mínimo `[11px]`
5. Sin `2xl:` → laptop afecta a PC ❌

---

## Conclusión

Este patrón permite mantener **tres diseños optimizados**:

1. **Móvil (base):** Diseño táctil y legible
2. **Laptop (lg:):** Compacto, aprovecha espacio limitado
3. **Desktop (2xl:):** Amplio, cómodo para pantallas grandes

**La clave está en:**
- Usar consistentemente `base lg:laptop 2xl:desktop`
- Ser más agresivo con modales (40-50% vs 30-35%)
- NUNCA olvidar `2xl:` para restaurar valores de PC

---

**VERSIÓN:** 2.0 (Actualizada con patrones de modales)
**FECHA:** Enero 13, 2026  
**AUTOR:** Juan Manuel Valenzuela  
**PROYECTO:** AnunciaYA v3.0
