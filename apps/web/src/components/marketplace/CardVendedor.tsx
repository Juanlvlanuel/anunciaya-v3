/**
 * CardVendedor.tsx
 * =================
 * Card del vendedor en el detalle del artículo. Muestra avatar, nombre,
 * ciudad y link "Ver perfil →" que navega al perfil del vendedor (P3,
 * implementado en Sprint 5).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P2 + §8 P3)
 * Sprint:      docs/prompts Marketplace/Sprint-3-Detalle-Articulo.md
 *
 * Ubicación: apps/web/src/components/marketplace/CardVendedor.tsx
 */

import { ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { VendedorArticulo } from '../../types/marketplace';

interface CardVendedorProps {
    vendedor: VendedorArticulo;
}

export function CardVendedor({ vendedor }: CardVendedorProps) {
    const navigate = useNavigate();
    const handleVerPerfil = () => {
        navigate(`/marketplace/vendedor/${vendedor.id}`);
    };

    const iniciales = obtenerIniciales(vendedor.nombre, vendedor.apellidos);

    return (
        <button
            data-testid="card-vendedor"
            onClick={handleVerPerfil}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
        >
            {/* Avatar */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-200">
                {vendedor.avatarUrl ? (
                    <img
                        src={vendedor.avatarUrl}
                        alt={`Avatar de ${vendedor.nombre}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-300 text-sm font-semibold text-slate-700">
                        {iniciales || <User className="h-6 w-6" strokeWidth={2} />}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">
                    {vendedor.nombre} {vendedor.apellidos}
                </div>
                {vendedor.ciudad && (
                    <div className="truncate text-xs text-slate-500">
                        {vendedor.ciudad}
                    </div>
                )}
            </div>

            {/* Link "Ver perfil →" */}
            <div className="flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-600">
                Ver perfil
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </div>
        </button>
    );
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const inicial1 = nombre.trim().charAt(0).toUpperCase();
    const inicial2 = apellidos.trim().charAt(0).toUpperCase();
    return `${inicial1}${inicial2}`;
}

export default CardVendedor;
