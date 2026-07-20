/**
 * KpiCardsPublicaciones.tsx
 * ===========================
 * 4 cards de KPIs del módulo Publicaciones (Total / Activas / Archivadas /
 * Vistas). Calca `KpiCardsVacantes.tsx`.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/publicaciones/componentes/KpiCardsPublicaciones.tsx
 */

import { Newspaper, CheckCircle2, Archive, Eye } from 'lucide-react';
import { CarouselKPI } from '../../../../../components/ui/CarouselKPI';
import type { KpisPublicacionesNegocio } from '../../../../../types/negocioPublicaciones';

interface KpiCardsPublicacionesProps {
    kpis: KpisPublicacionesNegocio | null;
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

export function KpiCardsPublicaciones({ kpis }: KpiCardsPublicacionesProps) {
    const cfg: ConfigKpi[] = [
        {
            label: 'Total',
            valor: kpis?.total ?? 0,
            icono: <Newspaper className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-slate-700" />,
            grad: 'linear-gradient(135deg, #f1f5f9, #fff)',
            iconoGrad: 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
            iconoShadow: 'rgba(100,116,139,0.25)',
            borde: '#94a3b8',
            texto: 'text-slate-700',
            testId: 'kpi-publicaciones-total',
        },
        {
            label: 'Activas',
            valor: kpis?.activas ?? 0,
            icono: <CheckCircle2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-emerald-700" />,
            grad: 'linear-gradient(135deg, #ecfdf5, #fff)',
            iconoGrad: 'linear-gradient(135deg, #a7f3d0, #6ee7b7)',
            iconoShadow: 'rgba(16,185,129,0.25)',
            borde: '#6ee7b7',
            texto: 'text-emerald-700',
            testId: 'kpi-publicaciones-activas',
        },
        {
            label: 'Archivadas',
            valor: kpis?.archivadas ?? 0,
            icono: <Archive className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-slate-700" />,
            grad: 'linear-gradient(135deg, #f8fafc, #fff)',
            iconoGrad: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
            iconoShadow: 'rgba(100,116,139,0.2)',
            borde: '#cbd5e1',
            texto: 'text-slate-600',
            testId: 'kpi-publicaciones-archivadas',
        },
        {
            label: 'Vistas',
            valor: kpis?.totalVistas ?? 0,
            icono: <Eye className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-violet-700" />,
            grad: 'linear-gradient(135deg, #f5f3ff, #fff)',
            iconoGrad: 'linear-gradient(135deg, #c4b5fd, #a78bfa)',
            iconoShadow: 'rgba(124,58,237,0.25)',
            borde: '#a78bfa',
            texto: 'text-violet-700',
            testId: 'kpi-publicaciones-vistas',
        },
    ];

    return (
        <CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
            <div
                className="flex justify-between lg:justify-end gap-2"
                data-testid="kpis-publicaciones"
            >
                {cfg.map((c) => (
                    <div
                        key={c.label}
                        className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
                        style={{ background: c.grad, borderColor: c.borde }}
                        data-testid={c.testId}
                    >
                        <div
                            className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                                background: c.iconoGrad,
                                boxShadow: `0 3px 8px ${c.iconoShadow}`,
                            }}
                        >
                            {c.icono}
                        </div>
                        <div className="min-w-0">
                            <p
                                className={`text-[16px] lg:text-sm 2xl:text-base font-extrabold tabular-nums ${c.texto}`}
                            >
                                {c.valor}
                            </p>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5 whitespace-nowrap">
                                {c.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </CarouselKPI>
    );
}
