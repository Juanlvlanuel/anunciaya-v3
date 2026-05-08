/**
 * CardVendedor.tsx
 * =================
 * Card del vendedor en el detalle del artículo (P2).
 *
 * Estilo Mercado Libre / Amazon: avatar con ring, nombre con verification
 * check si el vendedor tiene publicaciones, trust badges (responde rápido,
 * última conexión) como pills coloreados, CTA "Ver perfil →" sutil.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P2 + §8 P3)
 *
 * Ubicación: apps/web/src/components/marketplace/CardVendedor.tsx
 */

import { ChevronRight, BadgeCheck, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { VendedorArticulo } from '../../types/marketplace';
import { formatearUltimaConexion } from '../../utils/marketplace';

interface CardVendedorProps {
    vendedor: VendedorArticulo;
}

export function CardVendedor({ vendedor }: CardVendedorProps) {
    const navigate = useNavigate();
    const handleVerPerfil = () => {
        navigate(`/marketplace/usuario/${vendedor.id}`);
    };

    const iniciales = obtenerIniciales(vendedor.nombre, vendedor.apellidos);
    const conexionLabel = formatearUltimaConexion(vendedor.ultimaConexion);
    const respondeRapido =
        vendedor.tiempoRespuestaMinutos !== null &&
        vendedor.tiempoRespuestaMinutos !== undefined &&
        vendedor.tiempoRespuestaMinutos < 60;

    return (
        // Card NO clickeable. Solo el botón "Ver perfil →" navega al perfil.
        // Permite al usuario seleccionar texto, copiar el nombre, etc., sin
        // gatillar navegación accidental.
        <div
            data-testid="card-vendedor"
            className="flex w-full flex-col gap-1.5 rounded-xl border-2 border-slate-300 bg-white p-2.5 shadow-md lg:gap-2"
        >
            {/* Línea 1: avatar + nombre + verification + CTA */}
            <div className="flex items-center gap-2">
                {/* Avatar con ring sutil */}
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-slate-200">
                    {vendedor.avatarUrl ? (
                        <img
                            src={vendedor.avatarUrl}
                            alt={`Avatar de ${vendedor.nombre}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div
                            className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
                            style={{
                                background:
                                    'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)',
                            }}
                        >
                            {iniciales}
                        </div>
                    )}
                </div>

                {/* Identidad */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                        <span className="truncate text-sm font-bold text-slate-900 lg:text-base">
                            {vendedor.nombre} {vendedor.apellidos}
                        </span>
                        <BadgeCheck
                            className="h-4 w-4 shrink-0 text-blue-600"
                            strokeWidth={2.5}
                            aria-label="Vendedor verificado"
                        />
                    </div>
                    {vendedor.ciudad && (
                        <div className="truncate text-sm font-medium text-slate-600 lg:text-[13px] 2xl:text-sm">
                            {vendedor.ciudad}
                        </div>
                    )}
                </div>

                {/* CTA "Ver perfil →" — único elemento clickeable de la card */}
                <button
                    type="button"
                    data-testid="btn-ver-perfil"
                    onClick={handleVerPerfil}
                    aria-label={`Ver perfil de ${vendedor.nombre} ${vendedor.apellidos}`}
                    className="flex shrink-0 cursor-pointer items-center gap-0.5 rounded-md text-sm font-bold text-teal-700 lg:hover:text-teal-900 lg:hover:underline"
                >
                    Ver perfil
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>

            {/* Trust badges — pills coloreados solo si hay info útil.
                Tamaño: text-sm (mínimo móvil) → text-xs en laptop para
                compactar el panel sticky → text-sm de nuevo en desktop. */}
            {(respondeRapido || conexionLabel) && (
                <div className="flex flex-wrap items-center gap-1.5">
                    {respondeRapido && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700 lg:text-xs 2xl:text-sm">
                            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                            Suele responder rápido
                        </span>
                    )}
                    {conexionLabel && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-2.5 py-1 text-sm font-semibold text-slate-700 lg:text-xs 2xl:text-sm">
                            <Clock className="h-3.5 w-3.5" strokeWidth={2.5} />
                            {conexionLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const inicial1 = nombre.trim().charAt(0).toUpperCase();
    const inicial2 = apellidos.trim().charAt(0).toUpperCase();
    return `${inicial1}${inicial2}`;
}

export default CardVendedor;
