/**
 * VacantesEmpty.tsx
 * ==================
 * Estado vacío del módulo Vacantes. Pull-to-action para negocios sin vacantes.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/VacantesEmpty.tsx
 */

import { Briefcase, Plus } from 'lucide-react';

interface VacantesEmptyProps {
    onPublicar: () => void;
}

export function VacantesEmpty({ onPublicar }: VacantesEmptyProps) {
    return (
        <div
            className="bg-white border border-dashed border-slate-300 rounded-2xl px-6 py-12 lg:px-10 lg:py-16 text-center"
            data-testid="vacantes-empty"
        >
            <div className="w-24 h-24 lg:w-28 lg:h-28 mx-auto mb-5 lg:mb-6 rounded-full bg-linear-to-br from-sky-50 to-sky-100 grid place-items-center text-sky-700">
                <Briefcase className="w-10 h-10 lg:w-11 lg:h-11" strokeWidth={1.75} />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 mb-2">
                Aún no tienes vacantes publicadas
            </h2>
            <p className="text-sm lg:text-base text-slate-600 leading-snug max-w-md mx-auto mb-6 font-medium">
                Publica tu primera oferta de empleo y aparecerá en la sección
                {' '}<b>Servicios</b> de AnunciaYA para que los vecinos de Puerto
                Peñasco puedan contactarte directamente.
            </p>
            <button
                type="button"
                onClick={onPublicar}
                className="inline-flex items-center justify-center gap-1.5 px-4 2xl:px-5 h-11 lg:h-10 2xl:h-11 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white lg:cursor-pointer shrink-0"
                style={{
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                }}
                data-testid="btn-publicar-primera-vacante"
            >
                <Plus className="w-4 h-4" />
                Publicar primera vacante
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-3xl mx-auto mt-8">
                <Tip num={1} titulo="Alcance local">
                    Tus vacantes solo se muestran a usuarios en Puerto Peñasco.
                </Tip>
                <Tip num={2} titulo="Contacto directo">
                    Los candidatos te escriben por ChatYA o WhatsApp.
                </Tip>
                <Tip num={3} titulo="Sin comisiones">
                    Publicar vacantes está incluido en tu membresía AnunciaYA.
                </Tip>
            </div>
        </div>
    );
}

function Tip({
    num,
    titulo,
    children,
}: {
    num: number;
    titulo: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3.5 text-left">
            <div className="flex items-center gap-2.5 mb-1 font-bold text-sky-700 text-sm">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white grid place-items-center text-xs font-bold">
                    {num}
                </span>
                {titulo}
            </div>
            <p className="text-sm text-slate-600 leading-snug font-medium">{children}</p>
        </div>
    );
}
