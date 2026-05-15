/**
 * PaginaMockupMenu.tsx
 * =====================
 * Página de prueba/desarrollo para validar visualmente el rediseño del
 * menú/dropdown del usuario. Compara 3 variantes light lado a lado:
 *
 *  D) Linear style       — header gradient suave + pills minimalistas + items
 *                          aireados con divisor sutil. Estilo Linear/Vercel.
 *  E) Notion cards       — wrapper slate-50 + items como mini-tarjetas blancas
 *                          con shadow-sm + ícono dentro de círculo color-100
 *                          (no saturado).
 *  F) Premium glass      — header con gradient sutil que cambia de tono según
 *                          el modo activo + pills glassmorphism + items con
 *                          stripe lateral colorido en hover. Estilo Stripe/Apple.
 *
 * Las 3 variantes mantienen los principios consensuados:
 *  - Header light (no dark — descartado por el usuario en iteración previa).
 *  - Tabs Personal/Comercial como pills `border-2 rounded-full` (no toggle).
 *  - Iconos sin cuadrado pastel saturado.
 *  - Cerrar Sesión sobrio (no rojo gradient sólido).
 *
 * Ruta: `/dev/menu-mockup` (solo en sesión activa, no expuesto en navegación).
 *
 * Ubicación: apps/web/src/pages/private/dev/PaginaMockupMenu.tsx
 */

import { useState } from 'react';
import {
    Package,
    Bookmark,
    User,
    LogOut,
    ChevronRight,
    Briefcase,
    Ticket,
    CreditCard,
    MapPin,
    UserCheck,
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

type ModoActivo = 'personal' | 'comercial';

interface ItemMenu {
    label: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    /** Color de marca de la sección (acento). */
    acento: 'cyan' | 'rose' | 'blue' | 'amber' | 'emerald';
}

const ITEMS_PERSONAL_MOVIL: ItemMenu[] = [
    { label: 'Puerto Peñasco', icon: MapPin, acento: 'blue' },
    { label: 'CardYA', icon: CreditCard, acento: 'amber' },
    { label: 'Mis Cupones', icon: Ticket, acento: 'emerald' },
    { label: 'Mis Publicaciones', icon: Package, acento: 'cyan' },
    { label: 'Mis Guardados', icon: Bookmark, acento: 'rose' },
    { label: 'Mi Perfil', icon: User, acento: 'blue' },
];

const ITEMS_PERSONAL_PC: ItemMenu[] = [
    { label: 'Mis Publicaciones', icon: Package, acento: 'cyan' },
    { label: 'Mis Guardados', icon: Bookmark, acento: 'rose' },
    { label: 'Mi Perfil', icon: User, acento: 'blue' },
];

// Maps de clases Tailwind por acento — Tailwind no compila clases dinámicas
// con interpolación, hay que enumerar los colores que usamos.
const ACENTO_TEXT: Record<ItemMenu['acento'], string> = {
    cyan: 'text-cyan-600',
    rose: 'text-rose-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
};

const ACENTO_BG_SUAVE: Record<ItemMenu['acento'], string> = {
    cyan: 'bg-cyan-100 text-cyan-700',
    rose: 'bg-rose-100 text-rose-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    emerald: 'bg-emerald-100 text-emerald-700',
};

const ACENTO_BORDER_HOVER: Record<ItemMenu['acento'], string> = {
    cyan: 'group-hover:border-l-cyan-500',
    rose: 'group-hover:border-l-rose-500',
    blue: 'group-hover:border-l-blue-500',
    amber: 'group-hover:border-l-amber-500',
    emerald: 'group-hover:border-l-emerald-500',
};

// =============================================================================
// PILLS COMPARTIDAS — tabs Personal/Comercial estilo `border-2 rounded-full`
// =============================================================================

interface PillsTabsProps {
    modo: ModoActivo;
    onChange: (m: ModoActivo) => void;
    /** Estilo de fondo para inactivos (varía según fondo del header). */
    bgInactivo?: string;
}

function PillsTabs({ modo, onChange, bgInactivo = 'bg-white' }: PillsTabsProps) {
    const base =
        'inline-flex h-9 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-bold transition-colors cursor-pointer';
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => onChange('personal')}
                className={`${base} ${
                    modo === 'personal'
                        ? 'border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/20'
                        : `border-slate-300 ${bgInactivo} text-slate-600 hover:bg-slate-50`
                }`}
            >
                <UserCheck className="h-4 w-4" strokeWidth={2.5} />
                Personal
            </button>
            <button
                onClick={() => onChange('comercial')}
                className={`${base} ${
                    modo === 'comercial'
                        ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : `border-slate-300 ${bgInactivo} text-slate-600 hover:bg-slate-50`
                }`}
            >
                <Briefcase className="h-4 w-4" strokeWidth={2.5} />
                Comercial
            </button>
        </div>
    );
}

// =============================================================================
// VARIANTE D — LINEAR STYLE (clean & airy)
// =============================================================================

function VarianteD({ items }: { items: ItemMenu[] }) {
    const [modo, setModo] = useState<ModoActivo>('personal');
    return (
        <div className="w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header gradient suave + border-b sutil */}
            <div className="bg-linear-to-b from-slate-50 to-white border-b border-slate-200 p-5">
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-blue-400 to-blue-600 text-2xl font-bold text-white shadow-md">
                            J
                        </div>
                        <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                    </div>
                    <PillsTabs modo={modo} onChange={setModo} />
                    <p className="mt-3 truncate text-base font-bold text-slate-900">
                        Juan Manuel Valenzuela Ja...
                    </p>
                    <p className="truncate text-sm text-slate-500">vj.juan.24@gmail.com</p>
                </div>
            </div>

            {/* Items aireados con divisor sutil */}
            <div className="py-1">
                {items.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={idx}
                            className="flex w-full items-center gap-3 border-b border-slate-100 px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-slate-50"
                        >
                            <Icon
                                className={`h-5 w-5 shrink-0 ${ACENTO_TEXT[item.acento]}`}
                                strokeWidth={2.25}
                            />
                            <span className="flex-1 truncate text-base font-semibold text-slate-900">
                                {item.label}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.5} />
                        </button>
                    );
                })}
            </div>

            {/* Cerrar Sesión: outline rojo sutil */}
            <div className="border-t border-slate-200 p-3">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 active:scale-[0.98]">
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// VARIANTE E — NOTION CARDS (mini-tarjetas con shadow-sm)
// =============================================================================

function VarianteE({ items }: { items: ItemMenu[] }) {
    const [modo, setModo] = useState<ModoActivo>('personal');
    return (
        <div className="w-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
            {/* Header plano slate-50 con border-b */}
            <div className="border-b border-slate-200 bg-white p-5">
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-linear-to-br from-blue-400 to-blue-600 text-2xl font-bold text-white shadow-lg ring-4 ring-blue-50">
                            J
                        </div>
                        <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                    </div>
                    <PillsTabs modo={modo} onChange={setModo} />
                    <p className="mt-3 truncate text-base font-bold text-slate-900">
                        Juan Manuel Valenzuela Ja...
                    </p>
                    <p className="truncate text-sm text-slate-500">vj.juan.24@gmail.com</p>
                </div>
            </div>

            {/* Items como mini-tarjetas separadas con gap */}
            <div className="flex flex-col gap-1.5 p-2.5">
                {items.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={idx}
                            className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:shadow-md"
                        >
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACENTO_BG_SUAVE[item.acento]}`}
                            >
                                <Icon className="h-4 w-4" strokeWidth={2.5} />
                            </span>
                            <span className="flex-1 truncate text-sm font-semibold text-slate-900">
                                {item.label}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.5} />
                        </button>
                    );
                })}
            </div>

            {/* Cerrar Sesión: tarjeta roja sutil */}
            <div className="border-t border-slate-200 p-2.5">
                <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-bold text-red-700 shadow-sm transition-colors hover:bg-red-100 active:scale-[0.98]">
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// VARIANTE F — PREMIUM GLASS (gradient sutil que cambia con el modo)
// =============================================================================

function VarianteF({ items }: { items: ItemMenu[] }) {
    const [modo, setModo] = useState<ModoActivo>('personal');
    const headerBg =
        modo === 'personal'
            ? 'bg-linear-to-b from-blue-50 via-white to-white'
            : 'bg-linear-to-b from-orange-50 via-white to-white';

    return (
        <div className="w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Header gradient sutil que cambia según modo activo */}
            <div className={`${headerBg} border-b border-slate-200 p-5 transition-colors duration-300`}>
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div
                            className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg ring-4 ${
                                modo === 'personal'
                                    ? 'bg-linear-to-br from-blue-400 to-blue-600 ring-blue-100'
                                    : 'bg-linear-to-br from-orange-400 to-orange-600 ring-orange-100'
                            }`}
                        >
                            J
                        </div>
                        <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
                    </div>
                    <PillsTabs modo={modo} onChange={setModo} bgInactivo="bg-white/80 backdrop-blur" />
                    <p className="mt-3 truncate text-base font-bold text-slate-900">
                        Juan Manuel Valenzuela Ja...
                    </p>
                    <p className="truncate text-sm text-slate-500">vj.juan.24@gmail.com</p>
                </div>
            </div>

            {/* Items con stripe lateral colorido en hover */}
            <div className="py-1">
                {items.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={idx}
                            className={`group flex w-full items-center gap-3 border-b border-l-4 border-l-transparent border-slate-100 px-5 py-3 text-left transition-all last:border-b-0 hover:bg-slate-50 ${ACENTO_BORDER_HOVER[item.acento]}`}
                        >
                            <Icon
                                className={`h-5 w-5 shrink-0 ${ACENTO_TEXT[item.acento]}`}
                                strokeWidth={2.25}
                            />
                            <span className="flex-1 truncate text-base font-semibold text-slate-900">
                                {item.label}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
                        </button>
                    );
                })}
            </div>

            {/* Cerrar Sesión: outline elegante con hover fill */}
            <div className="border-t border-slate-200 p-3">
                <button className="group flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-red-400 bg-white py-2.5 text-sm font-bold text-red-600 transition-all hover:bg-red-500 hover:text-white active:scale-[0.98]">
                    <LogOut className="h-4 w-4 transition-transform group-hover:rotate-12" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// PÁGINA — comparativa lado a lado
// =============================================================================

export default function PaginaMockupMenu() {
    const [tipoLista, setTipoLista] = useState<'pc' | 'movil'>('pc');
    const items = tipoLista === 'pc' ? ITEMS_PERSONAL_PC : ITEMS_PERSONAL_MOVIL;

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 px-4 py-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 text-center">
                    <h1 className="text-2xl font-extrabold text-slate-900 lg:text-3xl">
                        Mockup — Rediseño del menú de usuario (iteración 2)
                    </h1>
                    <p className="mt-2 text-base text-slate-600">
                        3 estilos light totalmente distintos. Click en los tabs Personal/Comercial
                        de cada variante para ver cómo cambia.
                    </p>

                    {/* Toggle PC vs Móvil */}
                    <div className="mt-4 inline-flex rounded-full border-2 border-slate-300 bg-white p-1">
                        <button
                            onClick={() => setTipoLista('pc')}
                            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                                tipoLista === 'pc'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            PC (3 items)
                        </button>
                        <button
                            onClick={() => setTipoLista('movil')}
                            className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                                tipoLista === 'movil'
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Móvil (6 items)
                        </button>
                    </div>
                </header>

                {/* Grid 3 cols con las variantes */}
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* Variante D */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-slate-900">D — Linear style</h2>
                            <p className="text-sm text-slate-600">
                                Clean & airy — gradient suave + items aireados con divisor sutil
                            </p>
                        </div>
                        <VarianteD items={items} />
                    </div>

                    {/* Variante E */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-slate-900">E — Notion cards</h2>
                            <p className="text-sm text-slate-600">
                                Mini-tarjetas blancas con shadow + ícono en círculo color-100
                            </p>
                        </div>
                        <VarianteE items={items} />
                    </div>

                    {/* Variante F */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-center">
                            <h2 className="text-lg font-bold text-slate-900">F — Premium glass</h2>
                            <p className="text-sm text-slate-600">
                                Header gradient que cambia con el modo + stripe lateral en hover
                            </p>
                        </div>
                        <VarianteF items={items} />
                    </div>
                </div>

                {/* Notas de comparación */}
                <div className="mx-auto mt-12 max-w-3xl rounded-xl border-2 border-slate-300 bg-white p-6 shadow-sm">
                    <h3 className="mb-3 text-base font-bold text-slate-900">
                        Diferencias clave
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-700">
                        <li>
                            <strong>D — Linear style</strong>: el más sobrio. Header con gradient
                            mínimo (`slate-50 → white`). Items con MUCHO espaciado vertical (py-3.5)
                            y solo divisor `border-b` casi invisible. Ícono color flat. Es el más
                            cercano al lenguaje del resto de la app, perfecto si quieres
                            "no llamar la atención".
                        </li>
                        <li>
                            <strong>E — Notion cards</strong>: el más "rico" visualmente. Wrapper
                            slate-50 con items como mini-tarjetas blancas separadas por gap. Ícono
                            dentro de un círculo `bg-color-100 text-color-700` (no saturado). Más
                            tactile, sensación de "selectable cards".
                        </li>
                        <li>
                            <strong>F — Premium glass</strong>: el más sofisticado. Header con
                            gradient sutil que CAMBIA según el modo activo (azul para Personal,
                            naranja para Comercial). En hover de cada item aparece un stripe
                            colorido a la izquierda + chevron se desliza. Cerrar Sesión con
                            efecto fill al hover. Más "Apple/Stripe".
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
