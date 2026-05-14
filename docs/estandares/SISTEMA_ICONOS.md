# Sistema de Íconos — AnunciaYA

> Estándar obligatorio para íconos en el frontend.

---

## El Principio Base

Los íconos de la app se dividen en **dos categorías**:

| Tipo | Descripción | Librería |
|---|---|---|
| **Semánticos** (~27 conceptos) | Íconos con "personalidad de marca" que el usuario reconoce: Guardar, Like, Rating, Ubicación, etc. | `@iconify/react` (centralizado en `config/iconos.ts`) |
| **Utilitarios** (~95 conceptos) | Íconos funcionales sin personalidad: X, Check, Chevron, Loader, etc. | `lucide-react` (directo) |

**Regla absoluta:** los íconos semánticos NUNCA se hardcodean. Siempre vienen de `ICONOS` en `config/iconos.ts`.

---

## Por qué centralizar

Antes de este sistema, cada archivo importaba `Heart`, `Bookmark`, `Star`, etc. de `lucide-react` directamente. Cambiar el estilo de "guardar" en toda la app implicaba editar decenas de archivos.

Ahora editar `iconos.ts` propaga el cambio a **toda la app** automáticamente.

Beneficios adicionales:
- Mezcla libre de sets (Phosphor + Material Symbols + Solar + Lucide vía Iconify)
- Cero acoplamiento a una librería específica
- Bundle mínimo: Iconify solo descarga los íconos usados
- Consistencia garantizada (no puede haber "Star" de Phosphor en un lado y "Star" de Material en otro)

---

## Arquitectura

### Archivo central: `apps/web/src/config/iconos.ts`

```ts
export const ICONOS = {
    // Acciones del usuario
    guardar: 'ph:archive-box-fill',
    like: 'material-symbols:thumb-up-rounded',
    compartir: 'ph:share-fat-fill',
    notificaciones: 'lucide:bell',

    // Métricas / Social
    rating: 'material-symbols:star-rounded',
    vistas: 'material-symbols:visibility-rounded',
    tendenciaSubida: 'material-symbols:trending-up-rounded',
    tendenciaBajada: 'material-symbols:trending-down-rounded',
    logro: 'ph:seal-check-fill',
    trofeo: 'material-symbols:trophy-rounded',

    // Lugar / Tiempo
    ubicacion: 'ph:map-pin-fill',
    distancia: 'ph:navigation-arrow-fill',
    horario: 'ph:clock-fill',
    fechas: 'ph:calendar-fill',

    // Comercio
    recompensa: 'ph:gift-fill',
    pagos: 'ph:credit-card-fill',
    cartera: 'ph:wallet-fill',
    envio: 'material-symbols:local-shipping-rounded',
    producto: 'ph:package-fill',
    dinero: 'ph:currency-dollar-bold',
    empleos: 'ph:briefcase-fill',
    servicios: 'lucide:wrench',

    // Comunicación
    chat: 'ph:chat-circle-dots-fill',
    telefono: 'ph:phone-call-fill',
    email: 'material-symbols:mail-rounded',

    // Premium / Destacado
    premium: 'ph:sparkle-fill',
    vip: 'solar:crown-bold',
} as const;
```

El sufijo del valor identifica la librería: `ph:` Phosphor, `material-symbols:` Google, `solar:` Solar, `lucide:` Lucide (vía Iconify, no la librería directa).

### Wrappers locales

En cada archivo que usa íconos semánticos:

```tsx
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
```

Esto permite que el JSX existente (`<Star className="..." />`) siga funcionando sin cambios. El nombre del wrapper coincide con el nombre que tenía cuando venía de `lucide-react`.

---

## Cómo Usarlo

### Caso 1: ya hay un wrapper local en el archivo

Úsalo igual que antes — el JSX queda idéntico:
```tsx
<Star className="w-5 h-5 text-amber-500" />
<MapPin className="w-4 h-4" />
```

### Caso 2: archivo nuevo que necesita un ícono semántico

Agrega el import y el wrapper:
```tsx
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bookmark = (p: IconoWrapperProps) => <Icon icon={ICONOS.guardar} {...p} />;

// Uso normal:
<Bookmark className="w-5 h-5 text-amber-500" />
```

O, si solo necesitas usarlo una vez, llama a `Icon` directo:
```tsx
import { Icon } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

<Icon icon={ICONOS.guardar} className="w-5 h-5 text-amber-500" />
```

### Caso 3: estado activo/inactivo (outline vs filled)

Para botones que cambian entre outline y filled según estado:
```tsx
<Icon
  icon={liked ? ICONOS.like : 'material-symbols:thumb-up-outline-rounded'}
  className="w-5 h-5"
  style={{ color: liked ? '#3b82f6' : 'rgba(255,255,255,0.9)' }}
/>
```

El estado outline puede hardcodearse (es el complemento del filled centralizado). Si el outline también se quiere centralizar, agrégalo a `ICONOS` con un sufijo (ej: `likeOutline`).

### Caso 4: reflejar/rotar un ícono

Iconify soporta `hFlip`, `vFlip`, `rotate`:
```tsx
<Icon icon={ICONOS.servicios} hFlip />          // espejo horizontal
<Icon icon={ICONOS.distancia} rotate="90deg" /> // rotar 90 grados
```

Si solo lo necesitas en UN lugar, aplica el flag al `<Icon>` directo. Si lo necesitas siempre flippeado, ponlo dentro del wrapper:
```tsx
const Wrench = (p: IconoWrapperProps) => <Icon icon={ICONOS.servicios} hFlip {...p} />;
```

---

## Cambiar un Ícono Existente

**1 línea** en `config/iconos.ts`:

```ts
// Antes
rating: 'material-symbols:star-rounded',
// Después
rating: 'ph:star-fill',
```

El cambio se propaga a TODA la app automáticamente. No hay que tocar ningún otro archivo.

---

## Agregar un Concepto Nuevo

**2 pasos:**

### 1. Agregar al archivo central

```ts
// config/iconos.ts
export const ICONOS = {
    // ...existentes
    garantia: 'material-symbols:verified-rounded',  // nuevo
} as const;
```

### 2. Usar en el componente

```tsx
import { Icon } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

<Icon icon={ICONOS.garantia} className="w-5 h-5 text-green-600" />
```

Si el ícono se va a usar en muchos lugares, considera crear un wrapper local para que el JSX quede más limpio.

---

## Convención de Colores

Cada concepto tiene un color "natural" sugerido (cada uso puede sobrescribir con `text-*` o `style.color`):

| Concepto | Color sugerido | Tailwind |
|---|---|---|
| guardar | dorado | `#f59e0b` (amber-500) |
| like | azul | `#3b82f6` (blue-500) |
| rating | dorado | `#f59e0b` (amber-500) |
| notificaciones | naranja | `#f97316` (orange-500) |
| tendenciaSubida | verde | `#16a34a` (green-600) |
| tendenciaBajada | rojo | `#dc2626` (red-600) |
| trofeo / vip | amarillo | `#eab308` (yellow-500) |
| ubicacion | rojo | `#dc2626` (red-600) |
| distancia | azul | `#3b82f6` (blue-500) |
| recompensa | rosa | `#ec4899` (pink-500) |
| premium | violeta | `#a855f7` (violet-500) |

Ver lista completa en el header de `config/iconos.ts`.

---

## Qué Se Queda con Lucide

**No migran** (siguen importándose directo de `lucide-react`):

### Utilitarios funcionales
`X`, `Check`, `CheckCircle`, `Loader2`, `AlertCircle`, `AlertTriangle`, `Plus`, `Minus`, `Menu`, `MoreVertical`, `Search`, `Info`, `Edit2`, `Pencil`, `Trash2`, `Copy`, `Send`, `Reply`, `Forward`, `Save`, `Download`, `RefreshCw`, `RotateCcw`

### Navegación
`ChevronLeft`, `ChevronRight`, `ChevronUp`, `ChevronDown`, `ChevronsDown`, `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `ArrowLeftRight`, `ArrowUpDown`, `ArrowUpRight`

### Multimedia
`Image`, `ImageIcon`, `Camera`, `Mic`, `Paperclip`, `FileText`, `ImageOff`, `ImagePlus`, `Images`, `Pause`, `Play`, `PauseCircle`, `PlayCircle`

### Usuario / Auth
`User`, `Lock`, `LogOut`, `LogIn`, `UserMinus`, `UserCheck`, `UserCog`, `UserX`, `KeyRound`, `ShieldAlert`, `ShieldBan`, `ShieldCheck`, `ShieldOff`
`Eye` / `EyeOff` cuando se usan como toggle de contraseña (NO como métrica de "vistas")

### Decisión de producto (mantener identidad de cada uno)
`Users`, `UserPlus`, `Store`, `ShoppingCart`, `Tag`, `Ticket`, `Flame`

### Otros
`Settings`, `Settings2`, `Globe`, `Grid3x3`, `Crosshair`, `Locate`, `ExternalLink`, `Link2`, `Home`, `Maximize2`, `WifiOff`, `BellOff`, `Banknote`, `Coins`, `Percent`, `Building2`, `Hash`, `Pin`, `PinOff`, `StickyNote`, `Archive`, `Inbox`, `Sparkles` (en algunos casos puede usar `ICONOS.premium`, evaluar contexto)

**Razón:** son íconos funcionales sin "marca visual" — el usuario no nota la diferencia entre una `X` de Lucide y una de Phosphor. Migrarlos solo añade complejidad sin valor.

---

## Verificación

Para confirmar que un archivo no tiene íconos semánticos sin migrar:

```regex
import.*\b(ThumbsUp|Bookmark|Share2|Bell|Star|Eye|TrendingUp|TrendingDown|Award|Trophy|MapPin|Navigation|Clock|Calendar|Gift|CreditCard|Wallet|Truck|Package|DollarSign|Briefcase|Wrench|MessageCircle|Phone|Mail|Sparkles|Crown)\b.*from 'lucide-react'
```

Si ese grep encuentra resultados, esos archivos tienen íconos semánticos que deberían estar pasando por `ICONOS`. Excepción válida: `Eye/EyeOff` para toggle de contraseña.

---

## Galería de Comparación

Durante el desarrollo se mantiene una página temporal `apps/web/src/pages/private/TestIconos.tsx` con la ruta `/test-iconos`.

**Propósito:** comparar variantes de cada concepto (4 alternativas: Phosphor fill, Phosphor duotone/regular, Solar bold, Material rounded) contra el outline de lucide.

**Uso:**
1. Recargar `/test-iconos` en el navegador
2. Identificar el concepto que se quiere cambiar
3. Decidir qué alternativa (A/B/C/D) se prefiere
4. Cambiar `ICONOS.<concepto>` en `config/iconos.ts`

Al finalizar las iteraciones, **borrar** `TestIconos.tsx` + su import + ruta en `router/index.tsx`.

---

## Stack de Librerías

- **`@iconify/react`** — agregador con acceso a 200,000+ íconos de 150+ librerías. Tree-shakeable, descarga on-demand.
- **`lucide-react`** — librería original del proyecto, mantenida para íconos utilitarios.

Sets de Iconify usados actualmente:
- **Phosphor (`ph:`)** — variantes `fill`, `duotone`, `bold`, etc.
- **Material Symbols (`material-symbols:`)** — variantes `rounded`, `sharp`, `outlined`.
- **Solar (`solar:`)** — `bold`, `bold-duotone`, etc.
- **Lucide (`lucide:`)** — los mismos íconos que `lucide-react`, accesibles vía Iconify cuando se necesitan dentro del sistema centralizado.

**Buscador visual:** [icon-sets.iconify.design](https://icon-sets.iconify.design)
