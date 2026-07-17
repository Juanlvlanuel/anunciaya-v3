/**
 * ============================================================================
 * ICONOS — Mapeo centralizado de íconos semánticos
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/config/iconos.ts
 *
 * PROPÓSITO:
 * Centralizar el ícono de cada concepto semántico de la app. Permite cambiar
 * el ícono en UN solo lugar si después queremos refinar la estética.
 *
 * LIBRERÍA: `lucide-react`, que va en el bundle. NO se usa la API de Iconify
 * (api.iconify.design): descargaba los íconos en runtime, así que sin conexión
 * las pantallas que no se hubieran abierto antes salían sin íconos — un
 * problema real para ScanYA, que opera offline. Ver ICONOS_REMOTOS abajo para
 * las dos excepciones.
 *
 * USO (la firma no cambió: `icon` ahora recibe el componente, no un string):
 *   import { Icon, ICONOS } from '@/config/iconos';
 *
 *   <Icon icon={ICONOS.guardar} className="w-5 h-5" style={{ color: '#f59e0b' }} />
 *
 * CONVENCIÓN DE COLORES (sugerida — cada uso puede sobrescribir):
 *   guardar → amber-500 (#f59e0b)
 *   like → blue-500 (#3b82f6)
 *   rating → amber-500 (#f59e0b)
 *   notificaciones → orange-500 (#f97316)
 *   tendencia↑ → green-600 (#16a34a)
 *   tendencia↓ → red-600 (#dc2626)
 *   trofeo / vip → yellow-500 (#eab308)
 *   ubicación → red-600 (#dc2626)
 *   distancia → blue-500 (#3b82f6)
 *   recompensa → pink-500 (#ec4899)
 *   premium → violet-500 (#a855f7)
 *   hot/trending → orange-500 (#f97316)
 *
 * ÍCONOS QUE SE IMPORTAN DE LUCIDE DIRECTO (no están aquí):
 *   Users, UserPlus, Store, ShoppingCart, Tag, Ticket, Flame
 *   X, Check, Chevron*, Arrow*, Loader2, AlertCircle, Plus, Minus,
 *   Menu, Search, Info, Edit2, Trash2, Copy, Send, Lock, LogOut, etc.
 */

import { createElement, type SVGProps } from 'react';
import {
    Archive,
    BadgeCheck,
    Bell,
    Briefcase,
    Calendar,
    Clock,
    CreditCard,
    Crown,
    DollarSign,
    Eye,
    Gift,
    Mail,
    MapPin,
    MessageCircle,
    Navigation,
    Package,
    PhoneCall,
    Share2,
    Sparkles,
    Star,
    ThumbsUp,
    TrendingDown,
    TrendingUp,
    Trophy,
    Truck,
    Wallet,
    Wrench,
    type LucideIcon,
} from 'lucide-react';

export const ICONOS = {
    // ── Acciones del usuario ──────────────────────────────────────────
    guardar: Archive,
    like: ThumbsUp,
    compartir: Share2,
    notificaciones: Bell,

    // ── Métricas / Social ─────────────────────────────────────────────
    rating: Star,
    vistas: Eye,
    tendenciaSubida: TrendingUp,
    tendenciaBajada: TrendingDown,
    logro: BadgeCheck,
    trofeo: Trophy,

    // ── Lugar / Tiempo ────────────────────────────────────────────────
    ubicacion: MapPin,
    distancia: Navigation,
    horario: Clock,
    fechas: Calendar,

    // ── Comercio ──────────────────────────────────────────────────────
    recompensa: Gift,
    pagos: CreditCard,
    cartera: Wallet,
    envio: Truck,
    producto: Package,
    dinero: DollarSign,
    empleos: Briefcase,
    servicios: Wrench,

    // ── Comunicación ──────────────────────────────────────────────────
    chat: MessageCircle,
    telefono: PhoneCall,
    email: Mail,

    // ── Premium / Destacado ───────────────────────────────────────────
    premium: Sparkles,
    vip: Crown,
} as const;

export type IconoSemantico = keyof typeof ICONOS;

/**
 * Logos de marca que lucide NO incluye (quitó las marcas de su set). Son los
 * únicos que siguen bajándose de la API de Iconify, y se usan con el `Icon` de
 * `@iconify/react`, no con el de este archivo.
 */
export const ICONOS_REMOTOS = {
    whatsapp: 'mdi:whatsapp',
    google: 'flat-color-icons:google',
} as const;

/**
 * Props del componente `Icon`. Igual que las de cualquier ícono de lucide, más
 * `icon` con el componente a pintar. Los wrappers locales usan
 * `Omit<IconProps, 'icon'>` para reexponer un ícono con nombre propio.
 */
// El `Omit<..., 'icon'>` es necesario: SVGProps trae un atributo SVG legado
// `icon?: string`, y al intersectarlo el tipo se vuelve permisivo — dejaría
// pasar `<Icon icon="ph:algo" />` sin error, justo lo que queremos impedir.
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'icon'> & {
    icon: LucideIcon;
    /** Atajo de lucide: fija ancho y alto a la vez. */
    size?: string | number;
};

/**
 * Pinta un ícono del registro. Existe para conservar la firma
 * `<Icon icon={ICONOS.x} />` que ya usaba toda la app con Iconify; sin esto,
 * migrar habría implicado reescribir cada uso.
 */
export function Icon({ icon: Componente, ...props }: IconProps) {
    return createElement(Componente, props);
}
