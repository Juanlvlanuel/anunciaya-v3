# Sistema de Íconos — AnunciaYA

> Estándar obligatorio para íconos en el frontend.

---

## El Principio Base

Los íconos de la app se dividen en **dos categorías**, y ambas salen de `lucide-react`:

| Tipo | Descripción | Cómo se usa |
|---|---|---|
| **Semánticos** (~26 conceptos) | Íconos con "personalidad de marca" que el usuario reconoce: Guardar, Like, Rating, Ubicación, etc. | `ICONOS` + `Icon` de `config/iconos.ts` |
| **Utilitarios** (~95 conceptos) | Íconos funcionales sin personalidad: X, Check, Chevron, Loader, etc. | `lucide-react` (import directo) |

**Regla absoluta:** los íconos semánticos NUNCA se hardcodean. Siempre vienen de `ICONOS` en `config/iconos.ts`.

**Regla absoluta:** ningún ícono se descarga de la API de Iconify. Todo va en el bundle. Las dos únicas excepciones son los logos de marca de `ICONOS_REMOTOS` (ver abajo).

---

## Por qué centralizar

Antes de este sistema, cada archivo importaba `Heart`, `Bookmark`, `Star`, etc. de `lucide-react` directamente. Cambiar el estilo de "guardar" en toda la app implicaba editar decenas de archivos.

Ahora editar `iconos.ts` propaga el cambio a **toda la app** automáticamente.

---

## Por qué NO se usa la API de Iconify

Hasta julio 2026 los semánticos venían de `@iconify/react`, que **descarga cada ícono de `api.iconify.design` en runtime**. Eso rompía ScanYA: el operador se quedaba sin señal, abría una pantalla que no había visitado antes (p. ej. el modal de venta) y esos íconos **no se pintaban** — la petición fallaba con `ERR_INTERNET_DISCONNECTED`. La caché del navegador solo ayudaba con lo ya visto.

Como ScanYA debe operar offline por diseño, los 26 conceptos se migraron a `lucide-react`, que viaja en el bundle y no depende de la red.

**Consecuencia estética:** lucide es outline; se perdieron los rellenos de Phosphor (`ph:*-fill`) y el estilo rounded de Material Symbols. Fue un intercambio deliberado: funcionar sin conexión pesa más que el relleno.

---

## Arquitectura

### Archivo central: `apps/web/src/config/iconos.ts`

```ts
import { Archive, ThumbsUp, Star, /* ... */ } from 'lucide-react';

export const ICONOS = {
    // Acciones del usuario
    guardar: Archive,
    like: ThumbsUp,
    compartir: Share2,
    notificaciones: Bell,

    // Métricas / Social
    rating: Star,
    vistas: Eye,
    tendenciaSubida: TrendingUp,
    tendenciaBajada: TrendingDown,
    logro: BadgeCheck,
    trofeo: Trophy,

    // Lugar / Tiempo
    ubicacion: MapPin,
    distancia: Navigation,
    horario: Clock,
    fechas: Calendar,

    // Comercio
    recompensa: Gift,
    pagos: CreditCard,
    cartera: Wallet,
    envio: Truck,
    producto: Package,
    dinero: DollarSign,
    empleos: Briefcase,
    servicios: Wrench,

    // Comunicación
    chat: MessageCircle,
    telefono: PhoneCall,
    email: Mail,

    // Premium / Destacado
    premium: Sparkles,
    vip: Crown,
} as const;
```

El valor es el **componente**, no un string. `Icon` e `IconProps` también salen de este archivo: `Icon` es un envoltorio mínimo que conserva la firma `<Icon icon={ICONOS.x} />` que ya usaba toda la app.

### Logos de marca: `ICONOS_REMOTOS`

lucide quitó las marcas de su set, así que WhatsApp y el Google multicolor **siguen viniendo de la API de Iconify**:

```tsx
import { Icon } from '@iconify/react';          // ← el de Iconify, no el del registro
import { ICONOS_REMOTOS } from '@/config/iconos';

<Icon icon={ICONOS_REMOTOS.whatsapp} className="h-8 w-8" />
```

Son los **únicos** dos usos válidos de `@iconify/react` en la app. Ninguno está en el flujo offline de ScanYA. Si se necesita un tercer logo de marca, agrégalo aquí — no a `ICONOS`.

### Wrappers locales

En cada archivo que usa íconos semánticos:

```tsx
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos del registro manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
```

Esto permite que el JSX existente (`<Star className="..." />`) siga funcionando sin cambios.

---

## Cómo Usarlo

### Caso 1: ya hay un wrapper local en el archivo

Úsalo igual que antes — el JSX queda idéntico:
```tsx
<Star className="w-5 h-5 text-amber-500" />
<MapPin className="w-4 h-4" />
```

### Caso 2: archivo nuevo que necesita un ícono semántico

```tsx
import { Icon, ICONOS } from '@/config/iconos';

<Icon icon={ICONOS.guardar} className="w-5 h-5 text-amber-500" />
```

Si el ícono se usa varias veces en el archivo, crea el wrapper local.

### Caso 3: estado activo/inactivo

lucide dibuja en outline y respeta `fill`, así que el estado "activo" **puede** lograrse rellenando:
```tsx
<Icon
  icon={ICONOS.like}
  className="w-5 h-5"
  fill={liked ? 'currentColor' : 'none'}
  style={{ color: liked ? '#3b82f6' : 'rgba(255,255,255,0.9)' }}
/>
```

Con Iconify esto se hacía cambiando de ícono (`*-fill` vs `*-outline`); ya no hace falta.

**Pero el relleno no le sienta a todos los íconos.** `ICONOS.guardar` (`Archive`) relleno se convierte en un bloque de color macizo donde no se distingue la forma. Para esos casos, el estado activo se marca **solo con el color**, sin `fill`:
```tsx
<Icon
  icon={ICONOS.guardar}
  className="w-5 h-5"
  style={{ color: followed ? '#f59e0b' : '#94a3b8' }}
/>
```

**Regla:** usa `fill` solo si la silueta se sigue leyendo rellena (like, rating). Si el ícono tiene detalle interno (guardar/archivo, cartera, maletín), toggle de color a secas. Referencia: el botón Guardar de `PaginaPerfilNegocio.tsx`.

### Caso 4: reflejar/rotar un ícono

Ya no existen `hFlip` / `vFlip` / `rotate` (eran props de Iconify). Se hace con clases de Tailwind:
```tsx
<Icon icon={ICONOS.servicios} className="-scale-x-100" />  // espejo horizontal
<Icon icon={ICONOS.distancia} className="rotate-90" />     // rotar 90 grados
```

Si el ícono va SIEMPRE volteado, ponlo en el wrapper (ver `Navbar.tsx`, wrapper `Wrench`).

---

## Cambiar un Ícono Existente

**1 línea** en `config/iconos.ts` (más el import del componente nuevo):

```ts
// Antes
rating: Star,
// Después
rating: Sparkle,
```

El cambio se propaga a TODA la app automáticamente.

---

## Agregar un Concepto Nuevo

```ts
// config/iconos.ts
import { BadgeCheck, /* ... */ } from 'lucide-react';

export const ICONOS = {
    // ...existentes
    garantia: BadgeCheck,  // nuevo
} as const;
```

Y en el componente:
```tsx
import { Icon, ICONOS } from '@/config/iconos';

<Icon icon={ICONOS.garantia} className="w-5 h-5 text-green-600" />
```

Buscador visual: [lucide.dev/icons](https://lucide.dev/icons)

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

## Qué Se Importa Directo de Lucide

**No pasan por `ICONOS`** (se importan directo de `lucide-react`):

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
`Settings`, `Settings2`, `Globe`, `Grid3x3`, `Crosshair`, `Locate`, `ExternalLink`, `Link2`, `Home`, `Maximize2`, `WifiOff`, `BellOff`, `Banknote`, `Coins`, `Percent`, `Building2`, `Hash`, `Pin`, `PinOff`, `StickyNote`, `Inbox`

**Razón:** son íconos funcionales sin "marca visual" — el usuario no nota la diferencia. Centralizarlos solo añade complejidad sin valor.

> Ojo: `Archive` y `Sparkles` SÍ son semánticos (`ICONOS.guardar` y `ICONOS.premium`). Si los necesitas con ese significado, ve por `ICONOS`.

---

## Verificación

El typecheck **no** protege contra pasarle un string a `Icon`: `LucideIcon` resuelve a `any` en este monorepo (desajuste entre los tipos de `lucide-react` y `@types/react`), así que `<Icon icon="ph:algo" />` compila sin error y simplemente no pinta nada (React crea una etiqueta HTML inexistente). Hasta que eso se arregle, la verificación es por grep:

```regex
'(ph|lucide|material-symbols|solar|mdi|flat-color-icons):[a-z0-9-]+'
```

Cualquier resultado fuera de `ICONOS_REMOTOS` (y de la galería obsoleta `TestIconos.tsx`) es un ícono que no se va a pintar.

> El patrón con comillas simples importa: los íconos no siempre se pasan como atributo JSX (`icon="..."`). También viajan **dentro de objetos** (`icon: 'lucide:shopping-cart'` en un `switch` de estilos, como el de `PanelInteracciones.tsx`). Un grep de `icon="` los deja pasar.

Y para detectar semánticos importados directo de lucide (deberían pasar por `ICONOS`):

```regex
import.*\b(ThumbsUp|Share2|Bell|Star|TrendingUp|TrendingDown|BadgeCheck|Trophy|MapPin|Navigation|Clock|Calendar|Gift|CreditCard|Wallet|Truck|Package|DollarSign|Briefcase|Wrench|MessageCircle|PhoneCall|Mail|Crown)\b.*from 'lucide-react'
```

Excepción válida: `Eye/EyeOff` para toggle de contraseña.

---

## Stack de Librerías

- **`lucide-react`** — única librería de íconos. Va en el bundle, funciona offline.
- **`@iconify/react`** — SOLO para los logos de marca de `ICONOS_REMOTOS` (WhatsApp, Google). Descarga on-demand desde `api.iconify.design`; no usar para nada más.
