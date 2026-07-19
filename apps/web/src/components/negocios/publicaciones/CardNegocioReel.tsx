/**
 * CardNegocioReel.tsx
 * =====================
 * Card compacta de negocio para el reel horizontal del tab Feed en móvil
 * (`ReelNegociosFeed.tsx`). Mismo ancho que `CardArticuloReel.tsx` de
 * MarketPlace (`w-44 lg:w-52`) para que ambos reels se sientan del mismo
 * módulo visual.
 *
 * Contenido deliberadamente mínimo (a diferencia de `CardNegocioCompacto.tsx`,
 * que se usa en Mis Guardados con badges de horario/rating/distancia): solo
 * foto, logo + nombre del negocio + sucursal (cuando aplica), y el logo de
 * ChatYA centrado abajo.
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/CardNegocioReel.tsx
 */

import { Store } from 'lucide-react';
import { useIniciarChatNegocio } from '../../../hooks/useIniciarChatNegocio';

export interface CardNegocioReelProps {
    negocio: {
        sucursalId: string;
        usuarioId?: string;
        nombre: string;
        imagenPerfil?: string;
        fotoPerfil?: string | null;
        sucursalNombre?: string;
        esPrincipal?: boolean;
        totalSucursales?: number;
        galeria?: Array<{ url: string; titulo?: string }>;
    };
    onClick: () => void;
}

function obtenerIniciales(nombre: string): string {
    return nombre
        .split(' ')
        .filter((p) => p.length > 0)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');
}

export function CardNegocioReel({ negocio, onClick }: CardNegocioReelProps) {
    const { nombre, imagenPerfil, galeria, usuarioId } = negocio;
    const fotoGrande = galeria?.[0]?.url ?? imagenPerfil ?? null;

    const labelSucursal = (() => {
        if (negocio.esPrincipal) return 'Matriz';
        if (negocio.sucursalNombre === 'Principal') return 'Matriz';
        if (negocio.sucursalNombre && negocio.sucursalNombre !== nombre) {
            return negocio.sucursalNombre;
        }
        return 'Matriz';
    })();

    const iniciarChatNegocio = useIniciarChatNegocio();
    const handleChatYA = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!usuarioId) return;
        const sucursalParaHeader =
            (negocio.totalSucursales ?? 1) > 1
                ? (negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre)
                : undefined;
        const avatarSucursal = negocio.fotoPerfil ?? imagenPerfil ?? null;
        await iniciarChatNegocio({
            usuarioId,
            sucursalId: negocio.sucursalId,
            negocioNombre: nombre,
            avatarUrl: avatarSucursal,
            sucursalNombre: sucursalParaHeader,
        });
    };

    return (
        <article
            data-testid={`card-negocio-reel-${negocio.sucursalId}`}
            onClick={onClick}
            className="group w-44 shrink-0 cursor-pointer snap-start overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm transition-transform hover:scale-[1.02] lg:w-52 lg:cursor-pointer"
        >
            {/* Foto */}
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-200">
                {fotoGrande ? (
                    <img src={fotoGrande} alt={nombre} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200">
                        <Store className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                    </div>
                )}
            </div>

            {/* Info: logo + nombre + sucursal */}
            <div className="flex items-center gap-2 px-2.5 pt-2.5 text-left">
                {imagenPerfil ? (
                    <img
                        src={imagenPerfil}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full border-2 border-slate-200 object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-linear-to-br from-slate-100 to-slate-200 text-xs font-bold text-slate-600">
                        {obtenerIniciales(nombre) || <Store className="h-4 w-4" strokeWidth={2} />}
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold leading-tight text-slate-900">{nombre}</h3>
                    <div className="truncate text-xs font-medium leading-tight text-slate-600">
                        {labelSucursal}
                    </div>
                </div>
            </div>

            {/* ChatYA — centrado horizontalmente */}
            {usuarioId && (
                <div className="flex justify-center px-2.5 pb-2.5 pt-1.5">
                    <button
                        type="button"
                        data-testid={`btn-chatya-card-negocio-reel-${negocio.sucursalId}`}
                        onClick={handleChatYA}
                        aria-label={`Abrir ChatYA con ${nombre}`}
                        className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1 transition-transform duration-200 active:opacity-70 lg:hover:scale-110"
                    >
                        <img src="/ChatYA.webp" alt="ChatYA" className="h-9 w-auto" />
                    </button>
                </div>
            )}
        </article>
    );
}

export default CardNegocioReel;
