/**
 * ============================================================================
 * ICONOS — Mapeo centralizado de íconos semánticos
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/config/iconos.ts
 *
 * PROPÓSITO:
 * Centralizar los nombres de íconos de @iconify/react para cada concepto
 * semántico de la app. Permite cambiar el ícono en UN solo lugar si después
 * queremos refinar la estética.
 *
 * USO:
 *   import { Icon } from '@iconify/react';
 *   import { ICONOS } from '@/config/iconos';
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
 * ÍCONOS QUE SE MANTIENEN CON LUCIDE (no están aquí):
 *   Users, UserPlus, Store, ShoppingCart, Tag, Ticket, Flame
 *   X, Check, Chevron*, Arrow*, Loader2, AlertCircle, Plus, Minus,
 *   Menu, Search, Info, Edit2, Trash2, Copy, Send, Lock, LogOut, etc.
 */

export const ICONOS = {
    // ── Acciones del usuario ──────────────────────────────────────────
    guardar: 'ph:archive-box-fill',
    like: 'material-symbols:thumb-up-rounded',
    compartir: 'ph:share-fat-fill',
    notificaciones: 'lucide:bell',

    // ── Métricas / Social ─────────────────────────────────────────────
    rating: 'material-symbols:star-rounded',
    vistas: 'material-symbols:visibility-rounded',
    tendenciaSubida: 'material-symbols:trending-up-rounded',
    tendenciaBajada: 'material-symbols:trending-down-rounded',
    logro: 'ph:seal-check-fill',
    trofeo: 'material-symbols:trophy-rounded',

    // ── Lugar / Tiempo ────────────────────────────────────────────────
    ubicacion: 'ph:map-pin-fill',
    distancia: 'ph:navigation-arrow-fill',
    horario: 'ph:clock-fill',
    fechas: 'ph:calendar-fill',

    // ── Comercio ──────────────────────────────────────────────────────
    recompensa: 'ph:gift-fill',
    pagos: 'ph:credit-card-fill',
    cartera: 'ph:wallet-fill',
    envio: 'material-symbols:local-shipping-rounded',
    producto: 'ph:package-fill',
    dinero: 'ph:currency-dollar-bold',
    empleos: 'ph:briefcase-fill',
    servicios: 'lucide:wrench',

    // ── Comunicación ──────────────────────────────────────────────────
    chat: 'ph:chat-circle-dots-fill',
    telefono: 'ph:phone-call-fill',
    email: 'material-symbols:mail-rounded',

    // ── Premium / Destacado ───────────────────────────────────────────
    premium: 'ph:sparkle-fill',
    vip: 'solar:crown-bold',
} as const;

export type IconoSemantico = keyof typeof ICONOS;
