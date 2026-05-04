/**
 * CardArticulo.tsx
 * =================
 * Card del feed de MarketPlace — estilo B (imagen arriba + bloque blanco
 * abajo). Distinto del glassmorphism de CardNegocio porque:
 *  - El precio se lee mejor sobre fondo blanco.
 *  - Las fotos de usuarios son inconsistentes (mala iluminación, fondos
 *    variados); el glass se ve mal sobre ellas.
 *  - Diferenciación visual clara con la sección Negocios.
 *
 * Cumple Regla 13 de TOKENS_GLOBALES (estética profesional B2B):
 *  - Sin emojis como datos, sin tonos pastel saturados.
 *  - Iconos 14-16px sin círculo de fondo.
 *  - Color neutro slate + acento teal único.
 *  - Hover: shadow estática, sin scale ni elevación.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P1 Card del artículo)
 * Sprint:      docs/prompts Marketplace/Sprint-2-Feed-Frontend.md
 *
 * Ubicación: apps/web/src/components/marketplace/CardArticulo.tsx
 */

import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, ImageOff, Users, Eye } from 'lucide-react';
import { useGuardados } from '../../hooks/useGuardados';
import {
    formatearDistancia,
    formatearTiempoRelativo,
    esArticuloNuevo,
    obtenerFotoPortada,
    formatearPrecio,
} from '../../utils/marketplace';
import type { ArticuloFeed } from '../../types/marketplace';

interface CardArticuloProps {
    articulo: ArticuloFeed;
}

export function CardArticulo({ articulo }: CardArticuloProps) {
    const navigate = useNavigate();
    const { guardado, loading, toggleGuardado } = useGuardados({
        entityType: 'articulo_marketplace',
        entityId: articulo.id,
    });

    const fotoPortada = obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex);
    const esNuevo = esArticuloNuevo(articulo.createdAt);
    const distancia = formatearDistancia(articulo.distanciaMetros);
    const tiempo = formatearTiempoRelativo(articulo.createdAt);

    // Señal de actividad — una sola línea, en orden de prioridad.
    const senalActividad: { icono: React.ReactNode; texto: string } | null = (() => {
        if ((articulo.viendo ?? 0) >= 3) {
            return {
                icono: <Users className="h-3 w-3 shrink-0" strokeWidth={2} />,
                texto: `${articulo.viendo} personas viendo ahora`,
            };
        }
        if (articulo.totalGuardados >= 5) {
            return {
                icono: <Heart className="h-3 w-3 shrink-0" strokeWidth={2} />,
                texto: `${articulo.totalGuardados} personas lo guardaron`,
            };
        }
        if ((articulo.vistas24h ?? 0) >= 20) {
            return {
                icono: <Eye className="h-3 w-3 shrink-0" strokeWidth={2} />,
                texto: `Visto ${articulo.vistas24h} veces hoy`,
            };
        }
        return null;
    })();

    const handleClickCard = () => {
        navigate(`/marketplace/articulo/${articulo.id}`);
    };

    const handleClickGuardar = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleGuardado();
    };

    return (
        <article
            data-testid={`card-articulo-${articulo.id}`}
            onClick={handleClickCard}
            className="group cursor-pointer overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-md transition-shadow hover:shadow-lg"
        >
            {/* ── Imagen portada (aspect 1:1) ────────────────────────────── */}
            <div className="relative aspect-square w-full bg-slate-100">
                {fotoPortada ? (
                    <img
                        src={fotoPortada}
                        alt={articulo.titulo}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                    </div>
                )}

                {/* Badge "NUEVO" si <24h ─ esquina sup-izq */}
                {esNuevo && (
                    <span
                        data-testid={`badge-nuevo-${articulo.id}`}
                        className="absolute left-2 top-2 inline-flex items-center rounded-md bg-teal-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
                    >
                        Nuevo
                    </span>
                )}

                {/* Botón ❤️ guardar ─ esquina sup-der */}
                <button
                    data-testid={`btn-guardar-${articulo.id}`}
                    onClick={handleClickGuardar}
                    disabled={loading}
                    aria-label={guardado ? 'Quitar de guardados' : 'Guardar artículo'}
                    aria-pressed={guardado}
                    className="absolute right-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition-colors hover:bg-white hover:text-rose-500 disabled:opacity-50"
                >
                    <Heart
                        className="h-4 w-4"
                        strokeWidth={2.5}
                        fill={guardado ? 'currentColor' : 'none'}
                        color={guardado ? '#f43f5e' : 'currentColor'}
                    />
                </button>
            </div>

            {/* ── Bloque blanco abajo ────────────────────────────────────── */}
            <div className="space-y-1 px-3 py-2.5">
                {/* Precio */}
                <div className="text-xl font-bold leading-tight text-slate-900">
                    {formatearPrecio(articulo.precio)}
                </div>

                {/* Título 1 línea truncada */}
                <div className="truncate text-sm font-medium text-slate-700">
                    {articulo.titulo}
                </div>

                {/* Distancia + tiempo (gris) */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    {distancia && (
                        <>
                            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                            <span>{distancia}</span>
                            <span aria-hidden>·</span>
                        </>
                    )}
                    <span>{tiempo}</span>
                </div>

                {/* Señal de actividad — condicional, máximo una línea */}
                {senalActividad && (
                    <div
                        data-testid={`actividad-${articulo.id}`}
                        className="flex items-center gap-1 text-xs text-slate-500"
                    >
                        {senalActividad.icono}
                        <span>{senalActividad.texto}</span>
                    </div>
                )}
            </div>
        </article>
    );
}

export default CardArticulo;
