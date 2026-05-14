/**
 * PÁGINA TEMPORAL — TestIconos
 * =============================
 * Galería visual para comparar variantes de íconos.
 * Mantener mientras iteras sobre las elecciones. BORRAR cuando todo esté final.
 */

import { Icon } from '@iconify/react';
import {
    // Lucide actuales (referencia "antes")
    ThumbsUp,
    Star,
    Eye,
    Users,
    UserPlus,
    MapPin,
    Navigation,
    Clock,
    Calendar,
    Store,
    ShoppingCart,
    Tag,
    Ticket,
    Gift,
    CreditCard,
    Wallet,
    Truck,
    Package,
    DollarSign,
    Briefcase,
    Wrench,
    MessageCircle,
    Phone,
    Mail,
    Sparkles,
    Crown,
    Flame,
    Bell,
    Share2,
    TrendingUp,
    TrendingDown,
    Award,
    Trophy,
    Bookmark,
    type LucideIcon,
} from 'lucide-react';

interface ConceptoIcono {
    concepto: string;
    descripcion: string;
    color: string;
    lucideActual: LucideIcon;
    alternativas: { id: string; nombre: string }[];
    confirmado?: string; // id de la alternativa ya elegida
}

const CONCEPTOS: ConceptoIcono[] = [
    // ── ACCIONES DEL USUARIO ──────────────────────────────────────────
    {
        concepto: 'Guardar (favorito)',
        descripcion: 'Botón de guardar en negocios, ofertas, MP',
        color: '#f59e0b',
        lucideActual: Bookmark,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:archive-box-fill' },
            { id: 'B', nombre: 'ph:archive-box-duotone' },
            { id: 'C', nombre: 'solar:archive-bold' },
            { id: 'D', nombre: 'material-symbols:archive-rounded' },
        ],
    },
    {
        concepto: 'Like (Me gusta)',
        descripcion: 'Botón "me gusta" en negocios',
        color: '#3b82f6',
        lucideActual: ThumbsUp,
        confirmado: 'D',
        alternativas: [
            { id: 'A', nombre: 'ph:thumbs-up-fill' },
            { id: 'B', nombre: 'ph:thumbs-up-duotone' },
            { id: 'C', nombre: 'solar:like-bold' },
            { id: 'D', nombre: 'material-symbols:thumb-up-rounded' },
        ],
    },
    {
        concepto: 'Compartir',
        descripcion: 'Botón de compartir',
        color: '#475569',
        lucideActual: Share2,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:share-fat-fill' },
            { id: 'B', nombre: 'ph:share-network-fill' },
            { id: 'C', nombre: 'solar:share-bold' },
            { id: 'D', nombre: 'material-symbols:share' },
        ],
    },
    {
        concepto: 'Notificaciones',
        descripcion: 'Campana de notificaciones (volvió a lucide)',
        color: '#f97316',
        lucideActual: Bell,
        confirmado: 'lucide',
        alternativas: [
            { id: 'A', nombre: 'ph:bell-fill' },
            { id: 'B', nombre: 'ph:bell-ringing-fill' },
            { id: 'C', nombre: 'solar:bell-bold' },
            { id: 'D', nombre: 'material-symbols:notifications-rounded' },
        ],
    },

    // ── MÉTRICAS / SOCIAL ─────────────────────────────────────────────
    {
        concepto: 'Rating (estrella)',
        descripcion: 'Calificación de negocios y reseñas',
        color: '#f59e0b',
        lucideActual: Star,
        confirmado: 'D',
        alternativas: [
            { id: 'A', nombre: 'ph:star-fill' },
            { id: 'B', nombre: 'ph:star-duotone' },
            { id: 'C', nombre: 'solar:star-bold' },
            { id: 'D', nombre: 'material-symbols:star-rounded' },
        ],
    },
    {
        concepto: 'Vistas (Eye)',
        descripcion: 'Contador de vistas en ofertas/MP',
        color: '#64748b',
        lucideActual: Eye,
        confirmado: 'D',
        alternativas: [
            { id: 'A', nombre: 'ph:eye-fill' },
            { id: 'B', nombre: 'ph:eye-duotone' },
            { id: 'C', nombre: 'solar:eye-bold' },
            { id: 'D', nombre: 'material-symbols:visibility-rounded' },
        ],
    },
    {
        concepto: 'Usuarios / Seguidores',
        descripcion: 'Grupo de usuarios, clientes (SE QUEDA con lucide)',
        color: '#3b82f6',
        lucideActual: Users,
        alternativas: [
            { id: 'A', nombre: 'ph:users-fill' },
            { id: 'B', nombre: 'ph:users-three-fill' },
            { id: 'C', nombre: 'solar:users-group-rounded-bold' },
            { id: 'D', nombre: 'material-symbols:groups-rounded' },
        ],
    },
    {
        concepto: 'Nuevo seguidor',
        descripcion: 'Usuario + (SE QUEDA con lucide)',
        color: '#3b82f6',
        lucideActual: UserPlus,
        alternativas: [
            { id: 'A', nombre: 'ph:user-plus-fill' },
            { id: 'B', nombre: 'ph:user-circle-plus-fill' },
            { id: 'C', nombre: 'solar:user-plus-bold' },
            { id: 'D', nombre: 'material-symbols:person-add-rounded' },
        ],
    },
    {
        concepto: 'Tendencia ↑ (subida)',
        descripcion: 'KPIs en BS Dashboard',
        color: '#16a34a',
        lucideActual: TrendingUp,
        confirmado: 'D',
        alternativas: [
            { id: 'A', nombre: 'ph:trend-up-fill' },
            { id: 'B', nombre: 'ph:trend-up-duotone' },
            { id: 'C', nombre: 'solar:graph-up-bold' },
            { id: 'D', nombre: 'material-symbols:trending-up-rounded' },
        ],
    },
    {
        concepto: 'Tendencia ↓ (bajada)',
        descripcion: 'KPIs en BS Dashboard',
        color: '#dc2626',
        lucideActual: TrendingDown,
        confirmado: 'D',
        alternativas: [
            { id: 'A', nombre: 'ph:trend-down-fill' },
            { id: 'B', nombre: 'ph:trend-down-duotone' },
            { id: 'C', nombre: 'solar:graph-down-bold' },
            { id: 'D', nombre: 'material-symbols:trending-down-rounded' },
        ],
    },
    {
        concepto: 'Logro / Medalla',
        descripcion: 'Premios, badges',
        color: '#f59e0b',
        lucideActual: Award,
        confirmado: 'B',
        alternativas: [
            { id: 'A', nombre: 'ph:medal-fill' },
            { id: 'B', nombre: 'ph:seal-check-fill' },
            { id: 'C', nombre: 'solar:medal-star-bold' },
            { id: 'D', nombre: 'material-symbols:workspace-premium-rounded' },
        ],
    },
    {
        concepto: 'Trofeo',
        descripcion: 'Logros mayores',
        color: '#eab308',
        lucideActual: Trophy,
        confirmado: 'D',
        alternativas: [
            { id: 'A', nombre: 'ph:trophy-fill' },
            { id: 'B', nombre: 'ph:trophy-duotone' },
            { id: 'C', nombre: 'solar:cup-star-bold' },
            { id: 'D', nombre: 'material-symbols:trophy-rounded' },
        ],
    },

    // ── LUGAR / TIEMPO ────────────────────────────────────────────────
    {
        concepto: 'Ubicación (MapPin)',
        descripcion: 'Dirección, marker de mapa',
        color: '#dc2626',
        lucideActual: MapPin,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:map-pin-fill' },
            { id: 'B', nombre: 'ph:map-pin-area-fill' },
            { id: 'C', nombre: 'solar:map-point-bold' },
            { id: 'D', nombre: 'material-symbols:location-on-rounded' },
        ],
    },
    {
        concepto: 'Distancia (Navigation)',
        descripcion: 'Flecha de distancia/dirección',
        color: '#3b82f6',
        lucideActual: Navigation,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:navigation-arrow-fill' },
            { id: 'B', nombre: 'ph:compass-fill' },
            { id: 'C', nombre: 'solar:plain-bold' },
            { id: 'D', nombre: 'material-symbols:near-me-rounded' },
        ],
    },
    {
        concepto: 'Horario (Clock)',
        descripcion: 'Hora de apertura, duración',
        color: '#475569',
        lucideActual: Clock,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:clock-fill' },
            { id: 'B', nombre: 'ph:clock-duotone' },
            { id: 'C', nombre: 'solar:clock-circle-bold' },
            { id: 'D', nombre: 'material-symbols:schedule-rounded' },
        ],
    },
    {
        concepto: 'Fechas (Calendar)',
        descripcion: 'Fechas, calendario',
        color: '#475569',
        lucideActual: Calendar,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:calendar-fill' },
            { id: 'B', nombre: 'ph:calendar-blank-fill' },
            { id: 'C', nombre: 'solar:calendar-bold' },
            { id: 'D', nombre: 'material-symbols:calendar-month-rounded' },
        ],
    },

    // ── COMERCIO ──────────────────────────────────────────────────────
    {
        concepto: 'Negocio (Store)',
        descripcion: 'Tienda, comercio (SE QUEDA con lucide)',
        color: '#0f172a',
        lucideActual: Store,
        alternativas: [
            { id: 'A', nombre: 'ph:storefront-fill' },
            { id: 'B', nombre: 'ph:storefront-duotone' },
            { id: 'C', nombre: 'solar:shop-bold' },
            { id: 'D', nombre: 'material-symbols:storefront-rounded' },
        ],
    },
    {
        concepto: 'Marketplace (Carrito)',
        descripcion: 'Carrito de compras, MP (SE QUEDA con lucide)',
        color: '#0f172a',
        lucideActual: ShoppingCart,
        alternativas: [
            { id: 'A', nombre: 'ph:shopping-cart-simple-fill' },
            { id: 'B', nombre: 'ph:shopping-bag-fill' },
            { id: 'C', nombre: 'solar:cart-large-bold' },
            { id: 'D', nombre: 'material-symbols:shopping-cart-rounded' },
        ],
    },
    {
        concepto: 'Ofertas (Tag)',
        descripcion: 'Etiqueta de precio/oferta (SE QUEDA con lucide)',
        color: '#dc2626',
        lucideActual: Tag,
        alternativas: [
            { id: 'A', nombre: 'ph:tag-fill' },
            { id: 'B', nombre: 'ph:tag-chevron-fill' },
            { id: 'C', nombre: 'solar:tag-bold' },
            { id: 'D', nombre: 'material-symbols:sell-rounded' },
        ],
    },
    {
        concepto: 'Cupones (Ticket)',
        descripcion: 'Cupón / boleto (SE QUEDA con lucide)',
        color: '#16a34a',
        lucideActual: Ticket,
        alternativas: [
            { id: 'A', nombre: 'ph:ticket-fill' },
            { id: 'B', nombre: 'ph:ticket-duotone' },
            { id: 'C', nombre: 'solar:ticket-bold' },
            { id: 'D', nombre: 'material-symbols:confirmation-number-rounded' },
        ],
    },
    {
        concepto: 'Recompensa (Gift)',
        descripcion: 'Regalo, premio',
        color: '#ec4899',
        lucideActual: Gift,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:gift-fill' },
            { id: 'B', nombre: 'ph:gift-duotone' },
            { id: 'C', nombre: 'solar:gift-bold' },
            { id: 'D', nombre: 'material-symbols:redeem-rounded' },
        ],
    },
    {
        concepto: 'Pagos (CreditCard)',
        descripcion: 'Tarjeta de crédito',
        color: '#3b82f6',
        lucideActual: CreditCard,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:credit-card-fill' },
            { id: 'B', nombre: 'ph:credit-card-duotone' },
            { id: 'C', nombre: 'solar:card-bold' },
            { id: 'D', nombre: 'material-symbols:credit-card-rounded' },
        ],
    },
    {
        concepto: 'Cartera (Wallet/CardYA)',
        descripcion: 'Billetera, monedero',
        color: '#f59e0b',
        lucideActual: Wallet,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:wallet-fill' },
            { id: 'B', nombre: 'ph:wallet-duotone' },
            { id: 'C', nombre: 'solar:wallet-bold' },
            { id: 'D', nombre: 'material-symbols:wallet-rounded' },
        ],
    },
    {
        concepto: 'Envío (Truck)',
        descripcion: 'Delivery, envío a domicilio',
        color: '#0ea5e9',
        lucideActual: Truck,
        confirmado: 'D',
        alternativas: [
            { id: 'A', nombre: 'ph:truck-fill' },
            { id: 'B', nombre: 'ph:truck-duotone' },
            { id: 'C', nombre: 'solar:delivery-bold' },
            { id: 'D', nombre: 'material-symbols:local-shipping-rounded' },
        ],
    },
    {
        concepto: 'Producto (Package)',
        descripcion: 'Paquete, mercancía',
        color: '#92400e',
        lucideActual: Package,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:package-fill' },
            { id: 'B', nombre: 'ph:package-duotone' },
            { id: 'C', nombre: 'solar:box-bold' },
            { id: 'D', nombre: 'material-symbols:inventory-2-rounded' },
        ],
    },
    {
        concepto: 'Dinero (Dollar)',
        descripcion: 'Pesos, monto, ingresos',
        color: '#16a34a',
        lucideActual: DollarSign,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:currency-dollar-bold' },
            { id: 'B', nombre: 'ph:currency-circle-dollar-fill' },
            { id: 'C', nombre: 'solar:dollar-bold' },
            { id: 'D', nombre: 'material-symbols:attach-money-rounded' },
        ],
    },
    {
        concepto: 'Empleos (Briefcase)',
        descripcion: 'Trabajo, sección Empleos en Servicios',
        color: '#0f172a',
        lucideActual: Briefcase,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:briefcase-fill' },
            { id: 'B', nombre: 'ph:suitcase-fill' },
            { id: 'C', nombre: 'solar:case-bold' },
            { id: 'D', nombre: 'material-symbols:work-rounded' },
        ],
    },
    {
        concepto: 'Servicios (Wrench)',
        descripcion: 'Sección Servicios (con hFlip en Navbar)',
        color: '#475569',
        lucideActual: Wrench,
        confirmado: 'lucide',
        alternativas: [
            { id: 'A', nombre: 'ph:wrench-fill' },
            { id: 'B', nombre: 'ph:wrench-duotone' },
            { id: 'C', nombre: 'solar:tuning-bold' },
            { id: 'D', nombre: 'material-symbols:build-rounded' },
        ],
    },

    // ── COMUNICACIÓN ──────────────────────────────────────────────────
    {
        concepto: 'Chat (MessageCircle)',
        descripcion: 'Burbuja de chat, mensajes',
        color: '#3b82f6',
        lucideActual: MessageCircle,
        confirmado: 'B',
        alternativas: [
            { id: 'A', nombre: 'ph:chat-circle-fill' },
            { id: 'B', nombre: 'ph:chat-circle-dots-fill' },
            { id: 'C', nombre: 'solar:chat-round-bold' },
            { id: 'D', nombre: 'material-symbols:chat-bubble-rounded' },
        ],
    },
    {
        concepto: 'Teléfono (Phone)',
        descripcion: 'Llamada, contacto',
        color: '#16a34a',
        lucideActual: Phone,
        confirmado: 'B',
        alternativas: [
            { id: 'A', nombre: 'ph:phone-fill' },
            { id: 'B', nombre: 'ph:phone-call-fill' },
            { id: 'C', nombre: 'solar:phone-bold' },
            { id: 'D', nombre: 'material-symbols:call-rounded' },
        ],
    },
    {
        concepto: 'Email (Mail)',
        descripcion: 'Correo electrónico',
        color: '#3b82f6',
        lucideActual: Mail,
        confirmado: 'D',
        alternativas: [
            { id: 'A', nombre: 'ph:envelope-fill' },
            { id: 'B', nombre: 'ph:envelope-simple-fill' },
            { id: 'C', nombre: 'solar:letter-bold' },
            { id: 'D', nombre: 'material-symbols:mail-rounded' },
        ],
    },

    // ── PREMIUM / DESTACADO ───────────────────────────────────────────
    {
        concepto: 'Premium (Sparkles)',
        descripcion: 'Destacado, nuevo, especial',
        color: '#a855f7',
        lucideActual: Sparkles,
        confirmado: 'A',
        alternativas: [
            { id: 'A', nombre: 'ph:sparkle-fill' },
            { id: 'B', nombre: 'ph:star-four-fill' },
            { id: 'C', nombre: 'solar:stars-bold' },
            { id: 'D', nombre: 'material-symbols:auto-awesome-rounded' },
        ],
    },
    {
        concepto: 'VIP (Crown)',
        descripcion: 'Corona, premium, top',
        color: '#eab308',
        lucideActual: Crown,
        confirmado: 'C',
        alternativas: [
            { id: 'A', nombre: 'ph:crown-fill' },
            { id: 'B', nombre: 'ph:crown-simple-fill' },
            { id: 'C', nombre: 'solar:crown-bold' },
            { id: 'D', nombre: 'mdi:crown' },
        ],
    },
    {
        concepto: 'Hot / Trending (Flame)',
        descripcion: 'Ofertas en llamas, promo activa (SE QUEDA con lucide)',
        color: '#f97316',
        lucideActual: Flame,
        alternativas: [
            { id: 'A', nombre: 'ph:fire-fill' },
            { id: 'B', nombre: 'ph:flame-fill' },
            { id: 'C', nombre: 'solar:fire-bold' },
            { id: 'D', nombre: 'material-symbols:local-fire-department-rounded' },
        ],
    },
];

export default function TestIconos() {
    return (
        <div className="min-h-screen bg-slate-100 p-4 lg:p-8">
            <div className="mx-auto max-w-7xl">
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                    Galería de íconos por concepto
                </h1>
                <p className="text-slate-600 mb-6">
                    Para cada concepto: <strong>"Actual"</strong> = lucide outline (referencia), <strong>A/B/C/D</strong> =
                    alternativas. Si quieres cambiar uno, dime el concepto + letra (ej:{' '}
                    <code className="bg-slate-200 px-1 rounded">Rating=A</code>) y actualizo
                    el archivo central.
                </p>

                <div className="mb-6 p-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-700">
                    <p className="font-semibold mb-1">Leyenda:</p>
                    <ul className="space-y-0.5 ml-4 list-disc">
                        <li><strong className="text-green-700">✓ A/B/C/D</strong>: alternativa aplicada actualmente</li>
                        <li><strong className="text-slate-600">"Actual"</strong>: lucide outline (no se usa, solo referencia)</li>
                        <li><em className="text-slate-500">"SE QUEDA con lucide"</em>: este concepto mantiene lucide</li>
                    </ul>
                </div>

                <div className="space-y-4">
                    {CONCEPTOS.map((c) => {
                        const LucideIco = c.lucideActual;
                        return (
                            <section
                                key={c.concepto}
                                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
                            >
                                <div className="mb-3 pb-2 border-b border-slate-200">
                                    <h2 className="text-lg font-bold text-slate-900">{c.concepto}</h2>
                                    <p className="text-sm text-slate-600">{c.descripcion}</p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                    {/* Lucide actual (referencia) */}
                                    <div className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 ${
                                        c.confirmado === 'lucide'
                                            ? 'bg-green-50 border-green-400'
                                            : 'bg-slate-50 border-slate-200'
                                    }`}>
                                        <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                                            <LucideIco className="w-6 h-6" style={{ color: c.color, fill: c.color }} />
                                        </div>
                                        <span className={`text-xs font-semibold ${c.confirmado === 'lucide' ? 'text-green-700' : 'text-slate-500'}`}>
                                            {c.confirmado === 'lucide' ? '✓ Actual (lucide)' : 'Actual'}
                                        </span>
                                        <code className="text-[10px] text-slate-500 text-center break-all leading-tight">
                                            lucide
                                        </code>
                                    </div>

                                    {/* 4 alternativas */}
                                    {c.alternativas.map((alt) => {
                                        const esConfirmado = c.confirmado === alt.id;
                                        return (
                                            <div
                                                key={alt.id}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 ${
                                                    esConfirmado
                                                        ? 'bg-green-50 border-green-400'
                                                        : 'bg-white border-slate-200'
                                                }`}
                                            >
                                                <div
                                                    className="w-12 h-12 rounded-full bg-white border-2 flex items-center justify-center"
                                                    style={{ borderColor: esConfirmado ? '#16a34a' : c.color }}
                                                >
                                                    <Icon icon={alt.nombre} className="w-6 h-6" style={{ color: c.color }} />
                                                </div>
                                                <span className={`text-sm font-bold ${esConfirmado ? 'text-green-700' : 'text-slate-700'}`}>
                                                    {esConfirmado ? `✓ ${alt.id}` : alt.id}
                                                </span>
                                                <code className="text-[10px] text-slate-600 text-center break-all leading-tight">
                                                    {alt.nombre}
                                                </code>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>

                <div className="mt-8 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                    <p className="text-sm text-slate-800">
                        <strong>Para cambiar un ícono:</strong> dime{' '}
                        <code className="bg-white px-1 rounded">Concepto=Letra</code> (ej:{' '}
                        <code className="bg-white px-1 rounded">Trofeo=A</code>) y actualizo
                        el archivo central — el cambio se aplica a TODA la app automáticamente.
                    </p>
                </div>
            </div>
        </div>
    );
}
