/**
 * PublicacionesEmpty.tsx
 * ========================
 * Estado vacío del módulo Publicaciones. Calca `VacantesEmpty.tsx`.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/publicaciones/componentes/PublicacionesEmpty.tsx
 */

import { Newspaper, Plus } from 'lucide-react';

interface PublicacionesEmptyProps {
    onPublicar: () => void;
}

export function PublicacionesEmpty({ onPublicar }: PublicacionesEmptyProps) {
    return (
        <div
            className="bg-white border-2 border-dashed border-slate-300 rounded-2xl px-6 py-12 lg:px-10 lg:py-16 text-center lg:mt-7 2xl:mt-14"
            data-testid="publicaciones-empty"
        >
            <div className="w-24 h-24 lg:w-28 lg:h-28 mx-auto mb-5 lg:mb-6 rounded-full bg-linear-to-br from-sky-50 to-sky-100 grid place-items-center text-sky-700">
                <Newspaper className="w-10 h-10 lg:w-11 lg:h-11" strokeWidth={1.75} />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 mb-2">
                Comparte novedades de tu negocio
            </h2>
            <p className="text-sm lg:text-base text-slate-600 leading-snug max-w-md mx-auto mb-6 font-medium">
                Tus publicaciones aparecen en el feed de la sección
                <br />
                <b>Negocios</b> de AnunciaYA.
            </p>
            <button
                type="button"
                onClick={onPublicar}
                className="inline-flex items-center justify-center gap-1.5 px-4 2xl:px-5 h-11 lg:h-10 2xl:h-11 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white lg:cursor-pointer shrink-0"
                style={{
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                }}
                data-testid="btn-publicar-primera-publicacion"
            >
                <Plus className="w-4 h-4" />
                Nueva publicación
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 max-w-3xl mx-auto mt-8">
                <Tip num={1} titulo="Alcance local">
                    Tus publicaciones solo se muestran a usuarios de tu ciudad.
                </Tip>
                <Tip num={2} titulo="Todo tipo de contenido">
                    Avisos, fotos del local, productos nuevos o eventos.
                </Tip>
                <Tip num={3} titulo="Sin comisiones">
                    Publicar está incluido en tu membresía AnunciaYA.
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
