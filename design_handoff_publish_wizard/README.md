# Handoff: PublishWizard (3 pasos — Publicar anuncio)

## Overview
Wizard de **3 pasos** para publicar un anuncio en AnunciaYA, con autoguardado del borrador, validación por paso, vista previa en vivo y pantalla de éxito.

1. **Qué necesitas** — categoría + título + descripción + urgente
2. **Detalles** — fotos + modalidad + presupuesto + zonas + ubicación detectada
3. **Revisa y publica** — vista previa en vivo + 3 confirmaciones legales

Diseño responsive: en móvil (< 720 px) el rail lateral colapsa, el footer queda sticky, y la rejilla de fotos pasa de 6 → 3 → 2 columnas.

## About the Design Files
Los archivos `.tsx` y `.css` de este bundle son una **implementación de referencia**, no la versión final. Recréalos en el entorno existente del proyecto (React + TypeScript) usando los patrones, librerías y design tokens que ya estén establecidos (Tailwind, CSS Modules, styled-components, shadcn, etc.). El `wizard/` HTML es un prototipo navegable solo para verificar el comportamiento esperado.

## Fidelity
**High-fidelity.** Todos los valores (colores, tipografía, espaciados, animaciones, breakpoints) son finales y deben respetarse.

## Tarea concreta para Claude Code

> Reemplaza el wizard actual de 4 pasos por uno de 3 pasos con el agrupamiento descrito abajo. Mantén la persistencia de borrador en `localStorage`, la validación por paso y la vista previa en vivo. Usa `PublishWizard.tsx` y `PublishWizard.css` como referencia; adapta al sistema de estilos del proyecto.

### Pasos sugeridos
1. Localiza el wizard actual y su estado.
2. Migra los campos a la nueva estructura de 3 pasos (la "modalidad" pasa al paso 2, la "urgencia" se queda en el paso 1 junto al título/descripción).
3. Implementa `PublishWizard` con la API descrita abajo. La forma del `data` es la guía.
4. Reusa el sistema de estilos del proyecto si ya existen tokens equivalentes; si no, copia los del CSS de referencia.

## Estructura del estado

```ts
type Category = 'hogar' | 'cuidados' | 'eventos' | 'belleza' | 'empleo' | 'otros' | '';
type Modality = 'presencial' | 'remoto' | 'hibrido' | '';

type WizardData = {
  category: Category;
  title: string;            // 10–80 chars
  description: string;      // 30–500 chars
  urgent: boolean;
  photos: string[];         // máx 6, la primera es portada
  modality: Modality;
  budgetMin: string;        // string para permitir vacío; convertir a Number al validar
  budgetMax: string;
  zones: string[];          // 1–10
  confirms: {
    legal: boolean;
    truthful: boolean;
    coord: boolean;
  };
};
```

## Validación por paso (gating del botón Siguiente)

| Paso | Reglas para avanzar |
| ---- | ------------------- |
| 1    | `category !== ''` · `title.length ≥ 10` · `description.length ≥ 30` |
| 2    | `modality !== ''` · `zones.length ≥ 1` · si ambos budget > 0 → `budgetMin ≤ budgetMax` |
| 3    | `confirms.legal && confirms.truthful && confirms.coord` |

El botón "Siguiente" debe mostrar un mensaje contextual de qué falta cuando está deshabilitado (en desktop, encima del botón; en móvil se oculta para ahorrar espacio).

## Persistencia
- Clave de borrador: `anunciaya-wizard-draft-v1` → `JSON.stringify(data)`
- Clave de paso: `anunciaya-wizard-step-v1` → entero 0–2
- Guardar en cada cambio de `data` y de `step`.
- Botón "Borrar borrador" en la topbar limpia ambas claves y resetea al paso 0.

## Design Tokens

### Colores (estricto: slate-200+ solamente)
| Token       | Valor      | Uso |
| ----------- | ---------- | --- |
| `--blue-700`| `#0a66c2`  | Botón primario hover, etiquetas |
| `--blue-600`| `#1577d3`  | Gradiente primario (stop final) |
| `--blue-500`| `#1d8def`  | Color de marca · selección · barra de progreso |
| `--blue-400`| `#4ba5f5`  | Hover de borde en cards |
| `--blue-200`| `#c7e1fc`  | Borde de chip / info-card |
| `--blue-100`| `#e0edfd`  | Fondo info-card · chip · barra vacía |
| `--slate-900` | `#111827`| Texto principal |
| `--slate-700` | `#334155`| Texto secundario fuerte |
| `--slate-600` | `#475569`| Texto secundario |
| `--slate-500` | `#64748b`| Texto terciario / placeholder |
| `--slate-400` | `#94a3b8`| Hover de borde / placeholder |
| `--slate-300` | `#cbd5e1`| Borde de inputs y botones ghost |
| `--slate-200` | `#e2e8f0`| Borde de tarjetas, divisores |
| `--amber-500` | `#f59e0b`| Badge urgente (cover en preview) |
| `--amber-100` | `#fef3c7`| Fondo de pill "Solicito" |
| `--green-500` | `#10b981`| Confirmaciones OK, success icon |

### Tipografía
- Familia: **Inter**, pesos 400 / 500 / 600 / 700 / 800.
- Escala usada: 12 / 13 / 13.5 / 14 / 15 / 16 / 17 / 18 / 22 / 28 px.
- Labels mayúsculos: 13 px, weight 700, `letter-spacing: 0.12em`, `text-transform: uppercase`, color `slate-700`.

### Espaciado / radios / bordes
- Border-width único: **1.5 px**.
- Radios: tarjeta principal 16 px · cards seleccionables 14 px · inputs/botones 12 px · chips 999 px.
- Sombra principal de card: `0 24px 40px -24px rgba(15,23,42,0.18), 0 2px 4px rgba(15,23,42,0.04)`.

### Animaciones
| Nombre        | Duración | Easing                          | Loop |
| ------------- | -------- | ------------------------------- | ---- |
| `stepIn`      | 420 ms   | `cubic-bezier(.16,.84,.32,1)`   | no   |
| `chipIn`      | 250 ms   | `ease`                          | no   |
| `pop` (badge éxito) | 550 ms | `cubic-bezier(.16,.84,.32,1)` | no |
| Barra de progreso fill | 550 ms | mismo cubic-bezier        | no  |

## Responsive

| Breakpoint | Cambios |
| ---------- | ------- |
| `< 720 px` | Rail (título lateral) colapsa a una columna · Footer pasa a `position: fixed` con blur · Categorías y modalidad pasan a 1 columna · Photo grid 6 → 3 · Inputs a 16 px (evita zoom iOS) · Topbar oculta breadcrumb · `nextHelp` se oculta |
| `< 480 px` | Photo grid 3 → 2 · success modal a ancho completo |

## Interactions & Behavior

### Navegación
- Botón **Siguiente** avanza al paso siguiente; en el paso 3 cambia a "Publicar" con icono ✨.
- Botón **Atrás** retrocede; oculto en el paso 1.
- Validación bloquea Siguiente con `disabled` + mensaje contextual.

### Paso 1
- Categorías como cards seleccionables (single-select). Click activa borde azul + sombra anular azul + check circular en esquina superior derecha + icono pasa a fondo azul lleno con `color: white`.
- Contador de caracteres en tiempo real con estado "ok" (verde) cuando alcanza el mínimo.
- Urgente: card con checkbox; al seleccionarse, el borde y la sombra cambian a ámbar (no azul). Badge "Hoy o mañana" junto al título.

### Paso 2
- Fotos: 6 tiles, click en uno vacío "agrega" (en producción esto dispara file picker; el prototipo simula con un placeholder), click en uno lleno con botón X lo elimina. La primera tile lleva el badge "Portada".
- Modalidad: 3 cards (Presencial / Remoto / Híbrido), single-select.
- Presupuesto: dos inputs con prefijo `$` (gap real entre `$` y el número — `padding-left: 38px` en el input, `left: 16px` en el span).
- Zonas: input + botón "Agregar"; Enter también agrega. Las zonas aparecen como chips con animación `chipIn`. Máximo 10.
- Info-card "Ubicación detectada" fija con tono azul claro.

### Paso 3
- Vista previa renderiza un mini-card que refleja en vivo: título, presupuesto formateado (`$min–$max` o "A convenir"), tag de categoría, descripción, hasta 4 zonas + "+N". Si está marcado urgente, el cover del preview pasa de azul a gradiente ámbar y el badge dice "⚡ Urgente · Solicito".
- 3 confirmaciones como check-cards (toggle azul).
- Al publicar: overlay con scrim + card centrado con icono verde animado (`pop`), título "¡Tu anuncio está publicado!", y dos botones (Ver mi anuncio · Publicar otro).

## Files (en este bundle)
- `PublishWizard.tsx` — orquestador con estado, persistencia y navegación
- `WizardSteps.tsx` — los tres componentes de paso + constantes (CATEGORIES, MODALITIES, CONFIRMATIONS) + iconos
- `PublishWizard.css` — estilos completos incluyendo responsive
- `wizard/` — prototipo HTML navegable (referencia visual)

## Checklist de aceptación
- [ ] El wizard tiene 3 pasos con la agrupación descrita.
- [ ] El borrador se persiste y se restaura en `localStorage`.
- [ ] El botón Siguiente queda deshabilitado hasta que la validación pasa, con mensaje contextual.
- [ ] En móvil el footer Atrás/Siguiente está sticky abajo.
- [ ] La vista previa del paso 3 refleja todos los cambios en vivo.
- [ ] El badge urgente cambia el cover del preview a ámbar.
- [ ] No se usan colores slate-100 / slate-50.
- [ ] No hay tamaños de fuente bajo 13 px.
- [ ] Bordes de 1.5 px en toda la composición.
- [ ] La pantalla de éxito aparece al publicar y permite resetear todo.
