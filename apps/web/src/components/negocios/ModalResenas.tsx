/**
 * ============================================================================
 * COMPONENTE: ModalResenas (v5 - Patrón Adaptativo)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/ModalResenas.tsx
 *
 * CAMBIOS EN ESTA VERSIÓN:
 * - ✅ Móvil: ModalBottom con altura controlada
 * - ✅ Desktop: Modal centrado con 2 columnas
 * - ✅ useBreakpoint para detección de dispositivo
 * - ✅ Componentes reutilizables extraídos
 */

import { useState, useEffect } from 'react';
import { Star, X, Plus, Pencil } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalBottom } from '../ui/ModalBottom';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useAuthStore } from '../../stores/useAuthStore';

// =============================================================================
// TIPOS
// =============================================================================

interface Resena {
    id: string;
    rating: number | null;
    texto: string | null;
    createdAt: string | null;
    autor: {
        id: string;
        nombre: string;
        avatarUrl: string | null;
    };
    respuestaNegocio?: {
        texto: string;
        fecha: string;
        negocioNombre: string;
        negocioLogo: string | null;
    } | null;
}

interface ModalResenasProps {
    abierto: boolean;
    onCerrar: () => void;
    resenas: Resena[];
    promedioRating?: number;
    onEscribirResena?: () => void;
    onEditarResena?: (resena: Resena) => void;
    resenaDestacadaId?: string | null;
}

interface Distribucion {
    estrellas: number;
    cantidad: number;
    porcentaje: number;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaRelativa = (fecha: string | null): string => {
    if (!fecha) return '';
    const ahora = new Date();
    const fechaResena = new Date(fecha);
    const diffMs = ahora.getTime() - fechaResena.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `hace ${diffDias} días`;
    if (diffDias < 30) return `hace ${Math.floor(diffDias / 7)} sem`;
    if (diffDias < 365) return `hace ${Math.floor(diffDias / 30)} meses`;
    return `hace ${Math.floor(diffDias / 365)} años`;
};

const getAvatarColor = (nombre: string): string => {
    const colores = [
        'from-orange-400 to-pink-500',
        'from-violet-400 to-purple-500',
        'from-emerald-400 to-cyan-500',
        'from-cyan-400 to-blue-500',
        'from-rose-400 to-red-500',
        'from-amber-400 to-orange-500',
        'from-teal-400 to-green-500',
        'from-indigo-400 to-violet-500',
    ];
    const index = nombre.charCodeAt(0) % colores.length;
    return colores[index];
};

// =============================================================================
// COMPONENTE: StatsCompacto (Móvil)
// =============================================================================

interface StatsCompactoProps {
    promedioRating?: number;
    totalResenas: number;
    distribucion: Distribucion[];
    filtroEstrellas: number | null;
    onToggleFiltro: (estrellas: number) => void;
}

function StatsCompacto({
    promedioRating,
    totalResenas,
    distribucion,
    filtroEstrellas,
    onToggleFiltro,
}: StatsCompactoProps) {
    return (
        <div className="px-4 py-3 bg-linear-to-br from-amber-50 to-orange-50 border-b border-slate-100 shrink-0">
            <div className="flex gap-4">
                {/* Rating */}
                <div className="text-center shrink-0">
                    <div className="text-3xl font-bold text-slate-800">
                        {promedioRating?.toFixed(1) || '0.0'}
                    </div>
                    <div className="flex justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                    promedioRating && star <= Math.round(promedioRating)
                                        ? 'text-amber-400 fill-current'
                                        : 'text-slate-200'
                                }`}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-slate-500">{totalResenas} reseñas</p>
                </div>

                {/* Distribución compacta */}
                <div className="flex-1 space-y-0.5">
                    {distribucion.map(({ estrellas, cantidad, porcentaje }) => (
                        <div key={estrellas} className="flex items-center gap-1.5 text-xs">
                            <span className="w-3 text-slate-600 font-medium">{estrellas}</span>
                            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full"
                                    style={{ width: `${porcentaje}%` }}
                                />
                            </div>
                            <span className="w-5 text-slate-400 text-right">{cantidad}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-1.5 mt-3 flex-wrap">
                {[5, 4, 3, 2, 1].map((estrellas) => (
                    <button
                        key={estrellas}
                        onClick={() => onToggleFiltro(estrellas)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                            filtroEstrellas === estrellas
                                ? 'bg-amber-500 text-white'
                                : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                    >
                        {estrellas} <Star className="w-2.5 h-2.5 fill-current" />
                    </button>
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// COMPONENTE: CardResena
// =============================================================================

interface CardResenaProps {
    resena: Resena;
    compacto?: boolean;
    esPropia?: boolean;
    onEditar?: () => void;
}

function CardResena({ resena, compacto = false, esPropia = false, onEditar }: CardResenaProps) {
    const [expandido, setExpandido] = useState(false);
    const textoLargo = resena.texto && resena.texto.length > 150;

    return (
        <div className={`bg-white rounded-xl border border-slate-100 shadow-sm ${compacto ? 'p-4' : 'p-2.5 2xl:p-4'}`}>

            {/* ═══════════ RESEÑA DEL CLIENTE ═══════════ */}
            <div className={`flex items-start ${compacto ? 'gap-3' : 'gap-2 2xl:gap-3'}`}>
                {/* Avatar */}
                {resena.autor.avatarUrl ? (
                    <img
                        src={resena.autor.avatarUrl}
                        alt={resena.autor.nombre}
                        className={`rounded-full object-cover shrink-0 ${compacto ? 'w-10 h-10' : 'w-8 h-8 2xl:w-10 2xl:h-10'}`}
                    />
                ) : (
                    <div
                        className={`rounded-full bg-linear-to-br ${getAvatarColor(resena.autor.nombre)} flex items-center justify-center text-white font-bold shrink-0 ${
                            compacto ? 'w-10 h-10 text-sm' : 'w-8 h-8 2xl:w-10 2xl:h-10 text-xs 2xl:text-sm'
                        }`}
                    >
                        {resena.autor.nombre.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Info del cliente */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className={`font-semibold text-slate-800 ${compacto ? 'text-sm' : 'text-xs 2xl:text-sm'}`}>
                            {resena.autor.nombre}
                        </h4>
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Botón editar (inline, solo si es propia) */}
                            {esPropia && onEditar && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditar(); }}
                                    className="flex items-center gap-1 text-amber-500 hover:text-amber-600 cursor-pointer transition-colors"
                                >
                                    <Pencil className={compacto ? 'w-3.5 h-3.5' : 'w-3 h-3 2xl:w-3.5 2xl:h-3.5'} />
                                </button>
                            )}
                            <span className={`${compacto ? 'text-xs' : 'text-[10px] 2xl:text-xs'} text-slate-400`}>
                                {formatearFechaRelativa(resena.createdAt)}
                            </span>
                        </div>
                    </div>

                    {/* Estrellas */}
                    <div className={`flex ${compacto ? 'gap-0.5' : 'gap-0.5'} mt-0.5`}>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`${compacto ? 'w-3.5 h-3.5' : 'w-3 h-3 2xl:w-3.5 2xl:h-3.5'} ${
                                    resena.rating && star <= resena.rating
                                        ? 'text-amber-400 fill-current'
                                        : 'text-slate-200'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Texto de la reseña */}
                    {resena.texto && (
                        <div className="mt-1.5">
                            <p className={`text-slate-600 leading-relaxed ${compacto ? 'text-sm' : 'text-xs 2xl:text-sm'} ${
                                !expandido && textoLargo ? 'line-clamp-3' : ''
                            }`}>
                                {resena.texto}
                            </p>
                            {textoLargo && (
                                <button
                                    onClick={() => setExpandido(!expandido)}
                                    className={`text-amber-600 hover:text-amber-700 mt-0.5 font-medium cursor-pointer ${compacto ? 'text-xs' : 'text-[10px] 2xl:text-xs'}`}
                                >
                                    {expandido ? 'Ver menos' : 'Ver más'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════ RESPUESTA DEL NEGOCIO ═══════════ */}
            {resena.respuestaNegocio && (
                <div className={`${compacto ? 'mt-3 p-3' : 'mt-2 2xl:mt-3 p-2 2xl:p-3'} bg-linear-to-br from-blue-50 to-sky-50 rounded-xl border border-blue-100`}>
                    <div className={`flex items-center ${compacto ? 'gap-2.5 mb-2' : 'gap-2 2xl:gap-2.5 mb-1.5 2xl:mb-2'}`}>
                        {/* Logo del negocio */}
                        {resena.respuestaNegocio.negocioLogo ? (
                            <img
                                src={resena.respuestaNegocio.negocioLogo}
                                alt={resena.respuestaNegocio.negocioNombre}
                                className={`rounded-full object-cover shrink-0 ring-2 ring-blue-200 ${compacto ? 'w-7 h-7' : 'w-6 h-6 2xl:w-7 2xl:h-7'}`}
                            />
                        ) : (
                            <div className={`rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-blue-200 ${
                                compacto ? 'w-7 h-7 text-xs' : 'w-6 h-6 2xl:w-7 2xl:h-7 text-[10px] 2xl:text-xs'
                            }`}>
                                {resena.respuestaNegocio.negocioNombre?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <span className={`text-blue-800 font-semibold block ${compacto ? 'text-sm' : 'text-xs 2xl:text-sm'}`}>
                                {resena.respuestaNegocio.negocioNombre}
                            </span>
                        </div>
                        <span className={`${compacto ? 'text-xs' : 'text-[10px] 2xl:text-xs'} text-blue-400 shrink-0`}>
                            {formatearFechaRelativa(resena.respuestaNegocio.fecha)}
                        </span>
                    </div>
                    <p className={`text-slate-700 leading-relaxed ${compacto ? 'text-sm' : 'text-xs 2xl:text-sm'}`}>
                        {resena.respuestaNegocio.texto}
                    </p>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// COMPONENTE: EmptyState
// =============================================================================

interface EmptyStateProps {
    onLimpiar: () => void;
}

function EmptyState({ onLimpiar }: EmptyStateProps) {
    return (
        <div className="text-center py-4 2xl:py-8">
            <div className="w-8 h-8 2xl:w-12 2xl:h-12 mx-auto mb-1.5 2xl:mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 2xl:w-6 2xl:h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 text-[10px] 2xl:text-sm">No se encontraron reseñas</p>
            <button
                onClick={onLimpiar}
                className="mt-1 2xl:mt-2 text-[10px] 2xl:text-sm text-amber-600 hover:text-amber-700 cursor-pointer"
            >
                Limpiar filtros
            </button>
        </div>
    );
}

// =============================================================================
// COMPONENTE: BotonEscribirResena
// =============================================================================

interface BotonEscribirResenaProps {
    onClick: () => void;
    compacto?: boolean;
}

function BotonEscribirResena({ onClick, compacto = false }: BotonEscribirResenaProps) {
    return (
        <button
            onClick={onClick}
            className={`w-full bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 cursor-pointer transition-colors ${
                compacto ? 'py-2.5 text-sm' : 'py-2 text-xs 2xl:text-sm'
            }`}
        >
            <Plus className={compacto ? 'w-4 h-4' : 'w-3.5 h-3.5 2xl:w-4 2xl:h-4'} />
            <span>Escribir Reseña</span>
        </button>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalResenas({
    abierto,
    onCerrar,
    resenas,
    promedioRating,
    onEscribirResena,
    onEditarResena,
    resenaDestacadaId,
}: ModalResenasProps) {
    const { esMobile } = useBreakpoint();
    const [filtroEstrellas, setFiltroEstrellas] = useState<number | null>(null);
    const [resenaHighlight, setResenaHighlight] = useState<string | null>(null);
    const usuarioId = useAuthStore((state) => state.usuario?.id);

    // Deep link: scroll a la reseña destacada cuando el modal se abre
    useEffect(() => {
        if (abierto && resenaDestacadaId && resenaDestacadaId !== 'abrir') {
            const buscandoId = `resena-${resenaDestacadaId}`;
            let intentos = 0;
            const maxIntentos = 20; // 20 x 100ms = 2 segundos máximo

            const intervalo = setInterval(() => {
                intentos++;
                const el = document.getElementById(buscandoId);
                if (el) {
                    clearInterval(intervalo);
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setResenaHighlight(resenaDestacadaId);
                    setTimeout(() => setResenaHighlight(null), 3000);
                } else if (intentos >= maxIntentos) {
                    clearInterval(intervalo);
                }
            }, 100);

            return () => clearInterval(intervalo);
        }
    }, [abierto, resenaDestacadaId]);

    // Filtrar reseñas por estrellas
    const resenasFiltradas = filtroEstrellas
        ? resenas.filter((r) => r.rating === filtroEstrellas)
        : resenas;

    // Calcular distribución de estrellas
    const distribucion: Distribucion[] = [5, 4, 3, 2, 1].map((estrellas) => ({
        estrellas,
        cantidad: resenas.filter((r) => r.rating === estrellas).length,
        porcentaje: resenas.length > 0
            ? (resenas.filter((r) => r.rating === estrellas).length / resenas.length) * 100
            : 0,
    }));

    const toggleFiltro = (estrellas: number) => {
        setFiltroEstrellas(filtroEstrellas === estrellas ? null : estrellas);
    };

    const handleEscribirResena = () => {
        onCerrar();
        onEscribirResena?.();
    };

    // =========================================================================
    // MÓVIL: ModalBottom
    // =========================================================================
    if (esMobile) {
        return (
            <ModalBottom
                abierto={abierto}
                onCerrar={onCerrar}
                titulo="Reseñas"
                iconoTitulo={<Star className="w-5 h-5 text-white" />}
                mostrarHeader={false}
                sinScrollInterno={true}
                alturaMaxima="lg"
            >
                {/* Header personalizado */}
                <div className="px-4 py-2.5 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        <h3 className="text-slate-800 font-bold text-lg">Reseñas</h3>
                    </div>
                </div>

                {/* Stats + Filtros */}
                <StatsCompacto
                    promedioRating={promedioRating}
                    totalResenas={resenas.length}
                    distribucion={distribucion}
                    filtroEstrellas={filtroEstrellas}
                    onToggleFiltro={toggleFiltro}
                />

                {/* Lista de reseñas */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-3 space-y-2.5">
                        {resenasFiltradas.length > 0 ? (
                            resenasFiltradas.map((resena) => (
                                <div
                                    key={resena.id}
                                    id={`resena-${resena.id}`}
                                    className={resenaHighlight === resena.id ? 'ring-2 ring-amber-400 bg-amber-50 rounded-xl shadow-lg shadow-amber-200/50 transition-all duration-500' : 'transition-all duration-500'}
                                >
                                    <CardResena
                                        resena={resena}
                                        compacto
                                        esPropia={resena.autor.id === usuarioId}
                                        onEditar={() => onEditarResena?.(resena)}
                                    />
                                </div>
                            ))
                        ) : (
                            <EmptyState onLimpiar={() => setFiltroEstrellas(null)} />
                        )}
                    </div>
                </div>

                {/* Footer fijo */}
                {onEscribirResena && (
                    <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                        <BotonEscribirResena onClick={handleEscribirResena} compacto />
                    </div>
                )}
            </ModalBottom>
        );
    }

    // =========================================================================
    // DESKTOP: Modal centrado con 2 columnas
    // =========================================================================
    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            titulo="Reseñas"
            ancho="lg"
            paddingContenido="none"
        >
            <div className="flex h-full max-h-[55vh] 2xl:max-h-[50vh]">
                
                {/* SIDEBAR */}
                <div className="w-52 2xl:w-64 shrink-0 p-3 2xl:p-5 bg-linear-to-br from-slate-50 to-slate-100/50 border-r border-slate-100 flex flex-col">
                    
                    {/* Rating principal */}
                    <div className="text-center mb-3 2xl:mb-4">
                        <div className="inline-flex flex-col items-center p-2 2xl:p-2.5 bg-white rounded-lg 2xl:rounded-xl shadow-sm">
                            <div className="text-3xl 2xl:text-4xl font-bold text-slate-800">
                                {promedioRating?.toFixed(1) || '0.0'}
                            </div>
                            <div className="flex justify-center gap-0.5 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        className={`w-3 h-3 2xl:w-4 2xl:h-4 ${
                                            promedioRating && star <= Math.round(promedioRating)
                                                ? 'text-amber-400 fill-current'
                                                : 'text-slate-200'
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{resenas.length} reseñas</p>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="mb-3 2xl:mb-5">
                        <h3 className="text-[10px] 2xl:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 2xl:mb-2.5">
                            Filtrar por
                        </h3>
                        <div className="flex flex-wrap gap-1 2xl:gap-2">
                            {[5, 4, 3, 2, 1].map((estrellas) => (
                                <button
                                    key={estrellas}
                                    onClick={() => toggleFiltro(estrellas)}
                                    className={`px-1.5 py-0.5 2xl:px-2.5 2xl:py-1 text-[10px] 2xl:text-sm font-medium rounded-md 2xl:rounded-lg flex items-center gap-0.5 2xl:gap-1 transition-colors cursor-pointer ${
                                        filtroEstrellas === estrellas
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    {estrellas} <Star className="w-2 h-2 2xl:w-3 2xl:h-3 fill-current" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Distribución */}
                    <div className="space-y-1 2xl:space-y-2 mb-3 2xl:mb-5">
                        <h3 className="text-[10px] 2xl:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 2xl:mb-2.5">
                            Distribución
                        </h3>
                        {distribucion.map(({ estrellas, cantidad, porcentaje }) => (
                            <div key={estrellas} className="flex items-center gap-1 2xl:gap-2">
                                <span className="w-3 text-slate-600 font-medium text-xs 2xl:text-sm">{estrellas}</span>
                                <Star className="w-2.5 h-2.5 2xl:w-3.5 2xl:h-3.5 text-amber-400 fill-current" />
                                <div className="flex-1 h-1.5 2xl:h-2 bg-white rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-linear-to-r from-amber-400 to-orange-400 rounded-full"
                                        style={{ width: `${porcentaje}%` }}
                                    />
                                </div>
                                <span className="text-xs 2xl:text-sm text-slate-500 w-4 2xl:w-6 text-right">{cantidad}</span>
                            </div>
                        ))}
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Botón escribir */}
                    {onEscribirResena && (
                        <BotonEscribirResena onClick={handleEscribirResena} />
                    )}
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className="flex-1 flex flex-col min-w-0">
                    
                    {/* Filtro activo */}
                    {filtroEstrellas && (
                        <div className="px-1.5 2xl:px-4 py-1 2xl:py-2 border-b border-slate-100 flex items-center gap-1 2xl:gap-2">
                            <span className="text-[8px] 2xl:text-xs text-slate-500">Mostrando:</span>
                            <span className="px-1 2xl:px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] 2xl:text-xs font-medium rounded flex items-center gap-0.5">
                                {filtroEstrellas} <Star className="w-1.5 h-1.5 2xl:w-2.5 2xl:h-2.5 fill-current" />
                                <button
                                    onClick={() => setFiltroEstrellas(null)}
                                    className="ml-0.5 hover:text-amber-900 cursor-pointer"
                                >
                                    <X className="w-1.5 h-1.5 2xl:w-2.5 2xl:h-2.5" />
                                </button>
                            </span>
                            <span className="text-[8px] 2xl:text-xs text-slate-400">
                                {resenasFiltradas.length} reseñas
                            </span>
                        </div>
                    )}

                    {/* Lista de reseñas */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-1.5 2xl:p-4 space-y-1 2xl:space-y-3">
                            {resenasFiltradas.length > 0 ? (
                                resenasFiltradas.map((resena) => (
                                    <div
                                        key={resena.id}
                                        id={`resena-${resena.id}`}
                                        className={resenaHighlight === resena.id ? 'ring-2 ring-amber-400 bg-amber-50 rounded-xl shadow-lg shadow-amber-200/50 transition-all duration-500' : 'transition-all duration-500'}
                                    >
                                        <CardResena
                                            resena={resena}
                                            esPropia={resena.autor.id === usuarioId}
                                            onEditar={() => onEditarResena?.(resena)}
                                        />
                                    </div>
                                ))
                            ) : (
                                <EmptyState onLimpiar={() => setFiltroEstrellas(null)} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default ModalResenas;