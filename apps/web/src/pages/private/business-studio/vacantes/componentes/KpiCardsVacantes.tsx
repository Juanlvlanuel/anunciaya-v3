/**
 * KpiCardsVacantes.tsx
 * ======================
 * 4 cards de KPIs del módulo Vacantes (Total / Activas / Por expirar /
 * Conversaciones). Diseñadas para colocarse en el header de la página.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/KpiCardsVacantes.tsx
 */

import { Briefcase, CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import { CarouselKPI } from '../../../../../components/ui/CarouselKPI';
import type { KpisVacantes } from '../../../../../types/servicios';

interface KpiCardsVacantesProps {
    kpis: KpisVacantes | null;
}

type ConfigKpi = {
    label: string;
    valor: number;
    icono: React.ReactNode;
    grad: string;
    iconoGrad: string;
    iconoShadow: string;
    borde: string;
    texto: string;
    testId: string;
};

export function KpiCardsVacantes({ kpis }: KpiCardsVacantesProps) {
    const cfg: ConfigKpi[] = [
        {
            label: 'Total',
            valor: kpis?.total ?? 0,
            icono: <Briefcase className="w-4 h-4 text-sky-700" strokeWidth={1.75} />,
            grad: 'linear-gradient(135deg, #f0f9ff, #fff)',
            iconoGrad: 'linear-gradient(135deg, #bae6fd, #7dd3fc)',
            iconoShadow: 'rgba(14,165,233,0.25)',
            borde: '#7dd3fc',
            texto: 'text-sky-700',
            testId: 'kpi-vacantes-total',
        },
        {
            label: 'Activas',
            valor: kpis?.activas ?? 0,
            icono: (
                <CheckCircle2
                    className="w-4 h-4 text-emerald-700"
                    strokeWidth={1.75}
                />
            ),
            grad: 'linear-gradient(135deg, #ecfdf5, #fff)',
            iconoGrad: 'linear-gradient(135deg, #a7f3d0, #6ee7b7)',
            iconoShadow: 'rgba(16,185,129,0.25)',
            borde: '#6ee7b7',
            texto: 'text-emerald-700',
            testId: 'kpi-vacantes-activas',
        },
        {
            label: 'Por expirar',
            valor: kpis?.porExpirar ?? 0,
            icono: <Clock className="w-4 h-4 text-amber-700" strokeWidth={1.75} />,
            grad: 'linear-gradient(135deg, #fef3c7, #fff)',
            iconoGrad: 'linear-gradient(135deg, #fcd34d, #fbbf24)',
            iconoShadow: 'rgba(245,158,11,0.25)',
            borde: '#fbbf24',
            texto: 'text-amber-700',
            testId: 'kpi-vacantes-por-expirar',
        },
        {
            label: 'Chats',
            valor: kpis?.conversaciones ?? 0,
            icono: (
                <MessageCircle
                    className="w-4 h-4 text-violet-700"
                    strokeWidth={1.75}
                />
            ),
            grad: 'linear-gradient(135deg, #f5f3ff, #fff)',
            iconoGrad: 'linear-gradient(135deg, #c4b5fd, #a78bfa)',
            iconoShadow: 'rgba(124,58,237,0.25)',
            borde: '#a78bfa',
            texto: 'text-violet-700',
            testId: 'kpi-vacantes-conversaciones',
        },
    ];

    return (
        <CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
            <div
                className="flex justify-between lg:justify-end gap-2"
                data-testid="kpis-vacantes"
            >
                {cfg.map((c) => (
                    <div
                        key={c.label}
                        className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
                        style={{ background: c.grad, borderColor: c.borde }}
                        data-testid={c.testId}
                    >
                        <div
                            className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                                background: c.iconoGrad,
                                boxShadow: `0 3px 8px ${c.iconoShadow}`,
                            }}
                        >
                            {c.icono}
                        </div>
                        <div>
                            <p
                                className={`text-xl lg:text-lg 2xl:text-xl font-bold tabular-nums ${c.texto}`}
                            >
                                {c.valor}
                            </p>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">
                                {c.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </CarouselKPI>
    );
}
