/**
 * Paso1QueNecesitas.tsx
 * =======================
 * Paso 1 del wizard (handoff v2): el usuario elige categoría, escribe
 * título y descripción, y opcionalmente marca como urgente.
 *
 * Categorías (id BD lowercase / label UI):
 *   - hogar             · Hogar
 *   - cuidados          · Cuidados
 *   - eventos           · Eventos
 *   - belleza-bienestar · Belleza y bienestar
 *   - empleo            · Empleo (subtipo auto = busco-empleo en solicito)
 *   - otros             · Otros
 *
 * Ubicación: apps/web/src/components/servicios/wizard/Paso1QueNecesitas.tsx
 */

import {
    Briefcase,
    HandHeart,
    Heart,
    Home,
    PartyPopper,
    Sparkles,
    Check,
} from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import type { WizardServiciosDraft } from '../../../hooks/useWizardServicios';
import type { CategoriaClasificado } from '../../../types/servicios';
import { WizardSeccionCard } from './WizardSeccionCard';

type LucideIcon = ComponentType<SVGProps<SVGSVGElement> & { strokeWidth?: number }>;

interface OpcionCat {
    id: CategoriaClasificado;
    titulo: string;
    descripcion: string;
    icon: LucideIcon;
}

const CATEGORIAS: OpcionCat[] = [
    {
        id: 'hogar',
        titulo: 'Hogar',
        descripcion:
            'Plomería, electricidad, A/C, jardín, limpieza, mudanzas, albañilería.',
        icon: Home,
    },
    {
        id: 'cuidados',
        titulo: 'Cuidados',
        descripcion:
            'Niñeras, tutorías, cuidadores de ancianos, paseadores y cuidadores de mascotas.',
        icon: HandHeart,
    },
    {
        id: 'eventos',
        titulo: 'Eventos',
        descripcion:
            'Bodas, XV, fiestas, catering, fotografía, mariachi, decoración.',
        icon: PartyPopper,
    },
    {
        id: 'belleza-bienestar',
        titulo: 'Belleza y bienestar',
        descripcion:
            'Estilismo, masajes, manicura, depilación, spa a domicilio, entrenamiento personal.',
        icon: Sparkles,
    },
    {
        id: 'empleo',
        titulo: 'Empleo',
        descripcion:
            'Busco trabajo: que los negocios y vecinos vean que estoy disponible.',
        icon: Briefcase,
    },
    {
        id: 'otros',
        titulo: 'Otros',
        descripcion:
            'Tecnología, diseño, transporte, o cualquier cosa que no encaje en las anteriores.',
        icon: Heart,
    },
];

interface Paso1Props {
    draft: WizardServiciosDraft;
    actualizar: (
        cambio:
            | Partial<WizardServiciosDraft>
            | ((d: WizardServiciosDraft) => Partial<WizardServiciosDraft>),
    ) => void;
}

export function Paso1QueNecesitas({ draft, actualizar }: Paso1Props) {
    const tituloLen = draft.titulo.trim().length;
    const descLen = draft.descripcion.trim().length;
    const tituloOk = tituloLen >= 10 && tituloLen <= 80;
    const descOk = descLen >= 30 && descLen <= 500;

    return (
        <div className="space-y-3 lg:space-y-4 max-w-3xl mx-auto">
            {/* ── Categoría ────────────────────────────────────────────── */}
            <WizardSeccionCard>
                <span className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-2.5 lg:mb-3">
                    ¿En qué categoría cae tu pedido?
                </span>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                    {CATEGORIAS.map((c) => {
                        const activa = draft.categoria === c.id;
                        const Icon = c.icon;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                data-testid={`wizard-cat-${c.id}`}
                                onClick={() => actualizar({ categoria: c.id })}
                                aria-pressed={activa}
                                className={
                                    'relative flex items-start gap-2.5 lg:gap-3 rounded-[12px] lg:rounded-[14px] p-3 lg:p-4 text-left lg:cursor-pointer transition-shadow ' +
                                    (activa
                                        ? 'border-[1.5px] border-sky-500 bg-sky-50 ring-4 ring-sky-100'
                                        : 'border-[1.5px] border-slate-300 bg-white hover:border-sky-400 hover:shadow-sm')
                                }
                            >
                                <div
                                    className={
                                        'w-9 h-9 lg:w-10 lg:h-10 shrink-0 rounded-lg grid place-items-center ' +
                                        (activa
                                            ? 'bg-sky-500 text-white'
                                            : 'bg-slate-100 text-slate-700')
                                    }
                                >
                                    <Icon
                                        className="w-5 h-5 lg:w-[22px] lg:h-[22px]"
                                        strokeWidth={1.8}
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div
                                        className={
                                            'text-[15px] lg:text-[15px] 2xl:text-base font-bold leading-tight ' +
                                            (activa
                                                ? 'text-sky-900'
                                                : 'text-slate-900')
                                        }
                                    >
                                        {c.titulo}
                                    </div>
                                    <p
                                        className={
                                            'mt-0.5 lg:mt-1 text-[13px] lg:text-[13px] 2xl:text-sm font-medium leading-snug ' +
                                            (activa
                                                ? 'text-sky-800'
                                                : 'text-slate-600')
                                        }
                                    >
                                        {c.descripcion}
                                    </p>
                                </div>
                                {activa && (
                                    <div className="absolute top-2 right-2 lg:top-2.5 lg:right-2.5 w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-sky-500 text-white grid place-items-center shadow-sm">
                                        <Check
                                            className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                                            strokeWidth={2.6}
                                        />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </WizardSeccionCard>

            {/* ── Título ───────────────────────────────────────────────── */}
            <WizardSeccionCard>
                <label className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-1.5 lg:mb-2">
                    Título del anuncio
                </label>
                <input
                    type="text"
                    data-testid="wizard-titulo"
                    value={draft.titulo}
                    onChange={(e) =>
                        actualizar({ titulo: e.target.value.slice(0, 80) })
                    }
                    placeholder="Ej: Busco fotógrafo para boda"
                    className="w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3.5 lg:px-4 py-2.5 lg:py-3 text-base lg:text-[15px] 2xl:text-base text-slate-900 placeholder:text-slate-500 font-medium outline-none focus:border-sky-500"
                />
                <div className="mt-1 lg:mt-1.5 flex items-center justify-between text-[13px] lg:text-[13px] 2xl:text-sm">
                    <span
                        className={
                            tituloOk
                                ? 'text-green-600 font-semibold'
                                : 'text-slate-600 font-medium'
                        }
                    >
                        {tituloLen < 10
                            ? `Mínimo 10 caracteres (${tituloLen}/10)`
                            : 'Bien claro y al grano.'}
                    </span>
                    <span className="text-slate-500 font-medium tabular-nums">
                        {tituloLen}/80
                    </span>
                </div>
            </WizardSeccionCard>

            {/* ── Descripción ──────────────────────────────────────────── */}
            <WizardSeccionCard>
                <label className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-1.5 lg:mb-2">
                    Descripción
                </label>
                <textarea
                    data-testid="wizard-descripcion"
                    value={draft.descripcion}
                    onChange={(e) =>
                        actualizar({
                            descripcion: e.target.value.slice(0, 500),
                        })
                    }
                    rows={3}
                    placeholder="Describe con detalle qué necesitas, cuándo y cualquier dato útil."
                    className="w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3.5 lg:px-4 py-2.5 lg:py-3 text-base lg:text-[15px] 2xl:text-base text-slate-900 placeholder:text-slate-500 font-medium outline-none resize-none focus:border-sky-500 lg:min-h-[112px]"
                />
                <div className="mt-1 lg:mt-1.5 flex items-center justify-between text-[13px] lg:text-[13px] 2xl:text-sm">
                    <span
                        className={
                            descOk
                                ? 'text-green-600 font-semibold'
                                : 'text-slate-600 font-medium'
                        }
                    >
                        {descLen < 30
                            ? `Mínimo 30 caracteres (${descLen}/30)`
                            : 'Buena descripción.'}
                    </span>
                    <span className="text-slate-500 font-medium tabular-nums">
                        {descLen}/500
                    </span>
                </div>
            </WizardSeccionCard>

            {/* ── Urgente ─────────────────────────────────────────────── */}
            <WizardSeccionCard>
                <span className="block text-[13px] lg:text-[13px] 2xl:text-sm font-bold uppercase tracking-[0.12em] text-slate-700 mb-1.5 lg:mb-2">
                    Visibilidad
                </span>
                <label
                    className={
                        'flex items-start gap-2.5 lg:gap-3 rounded-[12px] lg:rounded-[14px] p-3 lg:p-4 lg:cursor-pointer transition-shadow ' +
                        (draft.urgente
                            ? 'border-[1.5px] border-amber-500 bg-amber-50 ring-4 ring-amber-100'
                            : 'border-[1.5px] border-slate-300 bg-white hover:border-slate-400 hover:shadow-sm')
                    }
                >
                    <input
                        type="checkbox"
                        data-testid="wizard-toggle-urgente"
                        checked={draft.urgente}
                        onChange={(e) =>
                            actualizar({ urgente: e.target.checked })
                        }
                        className="mt-0.5 lg:mt-1 w-5 h-5 rounded border-[1.5px] border-slate-400 lg:cursor-pointer accent-amber-500"
                    />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[15px] lg:text-[15px] 2xl:text-base font-bold text-slate-900">
                                Marcar como urgente
                            </span>
                            <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Hoy o mañana
                            </span>
                        </div>
                        <p className="mt-0.5 lg:mt-1 text-[13px] lg:text-[13px] 2xl:text-sm text-slate-600 font-medium leading-snug">
                            Sube tu pedido al top del feed de Clasificados.
                            Úsalo solo si lo necesitas hoy o mañana.
                        </p>
                    </div>
                </label>
            </WizardSeccionCard>
        </div>
    );
}

export default Paso1QueNecesitas;
