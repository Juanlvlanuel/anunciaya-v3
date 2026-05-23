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

import { ChevronRight, BadgeCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { VendedorArticulo } from '../../types/marketplace';
import { formatearUltimaConexion } from '../../utils/marketplace';

interface CardVendedorProps {
    vendedor: VendedorArticulo;
    /** Clases adicionales — útil para sobrescribir padding desde la página
     *  pública del MarketPlace que usa cards con `p-5` para más aire. */
    className?: string;
}

export function CardVendedor({ vendedor, className = '' }: CardVendedorProps) {
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
        // Card NO clickeable. Solo el link "Ver perfil →" navega al perfil.
        // Sprint 9.3: reordenado al mismo patrón que `SidebarSobreNegocio`
        // de Servicios — primero identidad, luego trust badges (responde
        // rápido + última conexión), y al final el link "Ver perfil"
        // discreto inline (sin pill). Jerarquía: info clave arriba, acción
        // opcional abajo.
        <div
            data-testid="card-vendedor"
            className={`flex w-full flex-col gap-2 rounded-xl border-2 border-slate-300 bg-white p-2.5 shadow-md ${className}`}
        >
            {/* Línea 1: avatar + nombre + verification */}
            <div className="flex items-center gap-2">
                {/* Avatar con ring sutil */}
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white shadow-md ring-2 ring-slate-200">
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

                {/* Identidad — nombre dividido en 2 líneas: nombres
                    arriba, apellidos + BadgeCheck invertido (fondo azul
                    + palomita blanca, estilo Twitter/X) en la 2ª línea.
                    Mismo patrón que el perfil del vendedor en MP. */}
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight lg:text-base">
                        <span className="block">{vendedor.nombre}</span>
                        <span className="flex items-center gap-1">
                            {vendedor.apellidos}
                            <BadgeCheck
                                className="h-6 w-6 shrink-0 fill-blue-500 text-white"
                                strokeWidth={2.5}
                                aria-label="Vendedor verificado"
                            />
                        </span>
                    </h3>
                </div>
            </div>

            {/* Trust badge — "Suele responder rápido" se mantiene como
                pill emerald destacado (es indicador de valor real para
                el comprador). */}
            {respondeRapido && (
                <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-sm font-semibold text-emerald-700 lg:text-xs 2xl:text-sm">
                        <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Suele responder rápido
                    </span>
                </div>
            )}

            {/* Fila: actividad (izquierda) + Ver perfil (derecha).
                Sprint 9.3: ambos elementos en el mismo renglón con
                `flex justify-between`. Si no hay conexionLabel, el
                botón se mantiene a la derecha por `ml-auto`. */}
            <div className="flex items-center gap-2">
                {conexionLabel && (
                    <div className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                        <span
                            aria-hidden
                            className="h-2 w-2 shrink-0 rounded-full bg-slate-400"
                        />
                        {conexionLabel}
                    </div>
                )}
                <button
                    type="button"
                    data-testid="btn-ver-perfil"
                    onClick={handleVerPerfil}
                    aria-label={`Ver perfil de ${vendedor.nombre} ${vendedor.apellidos}`}
                    className="ml-auto inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-teal-700 lg:cursor-pointer lg:hover:text-teal-900 lg:hover:underline"
                >
                    Ver perfil
                    <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const inicial1 = nombre.trim().charAt(0).toUpperCase();
    const inicial2 = apellidos.trim().charAt(0).toUpperCase();
    return `${inicial1}${inicial2}`;
}

export default CardVendedor;
