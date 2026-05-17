# Handoff — Módulo Vacantes (Business Studio)

Este bundle es **TSX puro listo para producción**, no un prototipo visual. El código respeta el stack del proyecto (React 19 + TS estricto, Tailwind v4, lucide-react / @iconify) y los contratos de BD que ya tienes.

---

## Stack asumido (confirmado)

- **React 19** + TypeScript estricto (cero `any`)
- **Tailwind v4** con `@theme` (sintaxis nueva: `bg-linear-to-b`, `shrink-0`, breakpoints solo `lg:` / `2xl:`)
- **React Query v5** + **Zustand** (el padre conecta — los componentes son tontos)
- **React Router v6** (el padre cablea — los componentes no rutean)
- **@iconify/react** para iconos de marca (vía `ICONOS` central) + **lucide-react** para utilitarios

> Si tu proyecto usa otras versiones, los componentes **siguen funcionando**; ajusta solo los imports y las rutas.

---

## Archivos del bundle

```
design_handoff_vacantes/
├── README.md                       ← este archivo
├── types.ts                        ← Tipos compartidos (Vacante, Precio, CrearVacanteInput, …)
├── helpers.ts                      ← formatPrecio · uiEstado · calcularKpis · validarVacante
├── iconos.ts                       ← Placeholder de `apps/web/src/config/iconos.ts`
├── VacanteAtoms.tsx                ← Pills · StatCard · SalarioTexto · VigenciaCell
├── VacantesEmpty.tsx               ← Estado vacío
├── VacantesLista.tsx               ← Tabla desktop con tabs + buscador
├── VacanteDetalle.tsx              ← Detalle con sidebar Actividad + Acciones rápidas
├── NuevaVacanteSlideover.tsx       ← Slideover crear/editar (validación + state local)
├── VacantesMobile.tsx              ← Vista móvil compacta (< lg)
├── PaginaVacantes.tsx              ← Orquestador (Props públicas)
└── Example.tsx                     ← Receta de conexión a React Query (referencia)
```

**Total:** 12 archivos · ~1 100 líneas TSX · 0 dependencias externas además del stack del proyecto.

---

## Componentes públicos

Solo `PaginaVacantes` y `NuevaVacanteSlideover` se consumen desde fuera del módulo. Los demás son internos.

### `<PaginaVacantes />` — props

```ts
interface PaginaVacantesProps {
  vacantes: Vacante[];
  sucursales: Sucursal[];
  kpis?: KpisVacantes;            // opcional; si no se pasa, se calcula
  isLoading?: boolean;

  // mutaciones
  onCrearVacante:     (input: CrearVacanteInput) => Promise<void>;
  onActualizarVacante:(id: string, input: Partial<CrearVacanteInput>) => Promise<void>;
  onPausarVacante:    (id: string) => Promise<void>;
  onReactivarVacante: (id: string) => Promise<void>;
  onCerrarVacante:    (id: string) => Promise<void>;
  onEliminarVacante:  (id: string) => Promise<void>;

  // navegaciones externas (el padre cablea react-router)
  onVerEnFeedPublico:  (id: string) => void;
  onIrAConversaciones: (vacanteId: string) => void;
}
```

---

## Tipos clave (`types.ts`)

```ts
type TipoEmpleo = 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual';
type Modalidad  = 'presencial' | 'remoto' | 'hibrido';
type EstadoVacante = 'activa' | 'pausada' | 'cerrada';

type Precio =
  | { kind: 'mensual';    monto: number }
  | { kind: 'rango';      min: number; max: number; moneda: 'MXN' }
  | { kind: 'hora';       monto: number }
  | { kind: 'fijo';       monto: number }
  | { kind: 'a-convenir' };
```

> **Nota:** `por-expirar` NO es un estado de BD — se deriva en UI vía `uiEstado()` cuando `estado === 'activa' && diasParaExpirar ≤ 5`.

---

## Reglas de validación implementadas

Implementadas en `helpers.ts → validarVacante()` (espejo del backend). El botón "Publicar vacante" queda `disabled` mientras haya errores.

| Campo            | Regla                                          |
| ---------------- | ---------------------------------------------- |
| `titulo`         | 10–80 chars, requerido                         |
| `descripcion`    | 30–500 chars, requerido                        |
| `requisitos`     | array, mínimo **3**, máximo 20; cada uno 3–200 chars |
| `beneficios`     | array, máx 8; cada uno 1–100 chars; opcional   |
| `horario`        | máx 150 chars; opcional                        |
| `diasSemana`     | máx 7; opcional                                |
| `precio.rango`   | `0 ≤ min < max`                                |
| `precio.*monto`  | `monto ≥ 0`                                    |
| `confirmaciones` | las **3** deben ser `true`                     |
| `sucursalId`     | requerido                                      |

---

## Slideover — patrón

Mismo patrón que `ModalArticulo` / `ModalOferta`:

- Backdrop fijo: `bg-slate-900/45 backdrop-blur-sm`
- Panel: `fixed top-0 right-0 bottom-0` ancho 720 px
- Animación: `animate-in slide-in-from-right duration-300`
- Cierre: click en backdrop · botón X · tecla `Escape`
- Body con `overflow-y-auto` + footer sticky

---

## Notificaciones (TODOs)

El proyecto usa `notificar.exito() / notificar.error() / notificar.advertencia()` (sistema custom). En el código quedan **TODOs explícitos** en cada `onSuccess/onError`:

```tsx
// TODO: notificar.exito('Vacante publicada con éxito');
// TODO: notificar.error('No pudimos publicar la vacante');
```

Hay 7 TODOs en total — buscarlos con grep al portar.

---

## Iconos

Dos fuentes:

1. **Marca / semánticos** → `iconos.ts` placeholder con los keys reales:
   ```ts
   ICONOS.vistas, ICONOS.chat, ICONOS.guardar, ICONOS.horario, ICONOS.candidatos, …
   ```
   Cuando portes, sustituye el import:
   ```diff
   - import { ICONOS } from './iconos';
   + import { ICONOS } from '../../config/iconos';
   ```

2. **Utilitarios** → los componentes usan `@iconify/react` con los nombres `lucide:*`. Si prefieres `lucide-react` directo, cambia:
   ```diff
   - <Icon icon={ICONOS.cerrar_x} className="w-4 h-4" />
   + <X className="w-4 h-4" />
   ```

---

## Estética (cumplido)

- ✅ CTA primario unificado: `bg-slate-900 text-white hover:bg-slate-800`
- ✅ CTA destructivo: `bg-rose-50 border-rose-200 text-rose-700`
- ✅ Borders sutiles `border-slate-200` / `border-slate-300`
- ✅ Cards `rounded-2xl` · Chips `rounded-full` · Inputs/botones `rounded-lg`
- ✅ Tipografía: headings `font-extrabold`, body `font-medium/semibold`
- ✅ Breakpoints: solo `lg:` y `2xl:`
- ✅ `lg:cursor-pointer` (no en móvil)
- ✅ Cero `bg-gradient-to-*` (todos migrados a `bg-linear-to-*`)
- ✅ Cero `flex-shrink-0` (todos a `shrink-0`)
- ✅ Comentarios en español mexicano
- ✅ Identificadores en español

---

## Suposiciones que hice

1. **`@iconify/react` está instalado.** Si solo usan `lucide-react`, sustituye los `<Icon icon={ICONOS.x} />` por imports directos (~30 líneas afectadas).
2. **`tailwindcss-animate` está cargado** (para `animate-in slide-in-from-right`). Si no, las animaciones simplemente no se ejecutan — el componente sigue funcionando.
3. **`focus:ring` está habilitado** en la config de Tailwind (debería estar por defecto).
4. **Las sucursales llegan con `esMatriz: boolean`** — uso ese flag para sufijo " · Matriz" en el select. Si tu shape es distinto, ajusta el `<option>`.
5. **El parent maneja el routing.** `PaginaVacantes` tiene **estado interno** para alternar entre lista y detalle, pero idealmente eso debería ser una ruta hija de react-router (`/business-studio/vacantes/:id`). Si lo quieres así, divide `PaginaVacantes` en dos rutas y pásale `vacanteId` directo a `VacanteDetalle`.

---

## Áreas que requieren decisión técnica

| # | Tema | Decisión pendiente |
| - | ---- | ------------------ |
| 1 | **Detalle: ruta vs estado** | Hoy el detalle es estado interno de `PaginaVacantes`. ¿Lo conviertes a ruta hija (`/vacantes/:id`)? Recomiendo que sí — permite compartir URL y back/forward del navegador. |
| 2 | **Edición** | El componente acepta `onActualizarVacante` pero **no implementé el modo edición del slideover**. Falta: aceptar `vacanteInicial?: Vacante` en `NuevaVacanteSlideover` y pre-poblar el state. Cambio menor (~20 líneas). |
| 3 | **Versión de TyC** | La constante `VERSION_TYC = 'v1-2026-05-17'` está hardcodeada. Mejor ponerla en una env var o config compartida con el backend. |
| 4 | **Auto-pause cron** | El componente solo muestra "auto-pausa al expirar" pero no maneja el evento. Asegúrate de que el cron del backend emite un evento que React Query pueda invalidar (`['vacantes']`). |
| 5 | **Búsqueda server-side** | La búsqueda en `VacantesLista` es client-side (filter en memoria). Si tu volumen escala (>50 vacantes/negocio), conviene mover a server. |
| 6 | **Móvil: ¿dónde abre el detalle?** | `VacantesMobile.onAbrir` dispara `verDetalle()` que cambia el estado interno. En móvil sería más natural una página full-screen con `/vacantes/:id`. Misma decisión que (1). |

---

## Checklist de aceptación (portar al codebase)

- [ ] Copiar los 12 archivos a `apps/web/src/modules/vacantes/`
- [ ] Reemplazar `./iconos` por la ruta real `../../config/iconos`
- [ ] Verificar que los iconKeys (`ICONOS.vistas`, `ICONOS.chat`, etc.) existen en el archivo real; si falta alguno, agregarlo
- [ ] Cablear `PaginaVacantes` a React Query usando `Example.tsx` como receta
- [ ] Resolver los 7 TODOs de `notificar.*`
- [ ] Decidir si el detalle es ruta o estado y refactorizar si aplica
- [ ] Implementar modo edición del slideover (extender `NuevaVacanteSlideover`)
- [ ] QA visual a 1024 px (mobile/desktop boundary) y 1536 px
- [ ] Probar el flow completo: empty → nueva → publicar → ver → pausar → reactivar → cerrar → eliminar

---

## Mensaje resumen

- **12 archivos**, ~1 100 líneas de TSX
- **2 componentes públicos**: `PaginaVacantes`, `NuevaVacanteSlideover`
- **5 internos**: `VacantesEmpty`, `VacantesLista`, `VacanteDetalle`, `VacantesMobile`, `VacanteAtoms`
- **Validación cliente completa** en `helpers.ts → validarVacante()`
- **Sin estilos inline ni CSS modules** — todo Tailwind v4
- **Sin dependencias adicionales** — solo el stack ya instalado
- **6 áreas que requieren decisión técnica del developer** (ver tabla arriba)
- **7 TODOs de notificaciones** marcados con `// TODO: notificar.*`

Listo para portar. Si encuentras algo que no cuadra con tu codebase real, dime exactamente qué y lo corrijo en el handoff.
