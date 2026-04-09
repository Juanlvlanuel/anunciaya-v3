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
        <div className="px-4 py-3 bg-amber-100 border-b border-slate-300 shrink-0">
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
                    <p className="text-sm text-slate-600 font-medium">{totalResenas} reseñas</p>
                </div>

                {/* Distribución compacta */}
                <div className="flex-1 space-y-0.5">
                    {distribucion.map(({ estrellas, cantidad, porcentaje }) => (
                        <div key={estrellas} className="flex items-center gap-1.5 text-sm">
                            <span className="w-3 text-slate-600 font-semibold">{estrellas}</span>
                            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-amber-400 rounded-full"
                                    style={{ width: `${porcentaje}%` }}
                                />
                            </div>
                            <span className="w-5 text-slate-600 font-medium text-right">{cantidad}</span>
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
                        className={`px-3 py-1.5 text-sm font-semibold rounded-lg flex items-center gap-1 cursor-pointer ${
                            filtroEstrellas === estrellas
                                ? 'bg-amber-500 text-white'
                                : 'bg-white text-slate-600 border-2 border-slate-300'
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
        <div className={`bg-white rounded-xl border-2 border-slate-300 shadow-md ${compacto ? 'p-4' : 'p-2.5 2xl:p-4'}`}>

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
                        className={`rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0 ${
                            compacto ? 'w-10 h-10 text-sm' : 'w-8 h-8 2xl:w-10 2xl:h-10 text-sm'
                        }`}
                    >
                        {resena.autor.nombre.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Info del cliente */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className={`font-semibold text-slate-800 ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}>
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
                            <span className={`${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'} text-slate-600 font-medium`}>
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
                            <p className={`text-slate-600 font-medium leading-relaxed ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'} ${
                                !expandido && textoLargo ? 'line-clamp-3' : ''
                            }`}>
                                {resena.texto}
                            </p>
                            {textoLargo && (
                                <button
                                    onClick={() => setExpandido(!expandido)}
                                    className={`text-amber-600 mt-0.5 font-semibold cursor-pointer ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}
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
                <div className={`${compacto ? 'mt-3 p-3' : 'mt-2 2xl:mt-3 p-2 2xl:p-3'} bg-blue-100 rounded-xl border-2 border-blue-300`}>
                    <div className={`flex items-center ${compacto ? 'gap-2.5 mb-2' : 'gap-2 2xl:gap-2.5 mb-1.5 2xl:mb-2'}`}>
                        {/* Logo del negocio */}
                        {resena.respuestaNegocio.negocioLogo ? (
                            <img
                                src={resena.respuestaNegocio.negocioLogo}
                                alt={resena.respuestaNegocio.negocioNombre}
                                className={`rounded-full object-cover shrink-0 ring-2 ring-blue-200 ${compacto ? 'w-7 h-7' : 'w-6 h-6 2xl:w-7 2xl:h-7'}`}
                            />
                        ) : (
                            <div className={`rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-blue-200 ${
                                compacto ? 'w-7 h-7 text-sm' : 'w-6 h-6 2xl:w-7 2xl:h-7 text-sm'
                            }`}>
                                {resena.respuestaNegocio.negocioNombre?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <span className={`text-blue-800 font-semibold block ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}>
                                {resena.respuestaNegocio.negocioNombre}
                            </span>
                        </div>
                        <span className={`${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'} text-blue-600 font-medium shrink-0`}>
                            {formatearFechaRelativa(resena.respuestaNegocio.fecha)}
                        </span>
                    </div>
                    <p className={`text-slate-700 font-medium leading-relaxed ${compacto ? 'text-sm' : 'text-sm lg:text-[11px] 2xl:text-sm'}`}>
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
            <div className="w-12 h-12 2xl:w-12 2xl:h-12 mx-auto mb-2 2xl:mb-3 bg-slate-200 rounded-full flex items-center justify-center">
                <Star className="w-6 h-6 2xl:w-6 2xl:h-6 text-slate-600" />
            </div>
            <p className="text-slate-600 text-sm 2xl:text-sm font-medium">No se encontraron reseñas</p>
            <button
                onClick={onLimpiar}
                className="mt-2 2xl:mt-2 text-sm 2xl:text-sm text-amber-600 font-semibold cursor-pointer"
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
            className={`w-full text-white font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 ${
                compacto ? 'py-2.5 text-base' : 'py-2.5 text-sm 2xl:text-base'
            }`}
            style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', boxShadow: '0 4px 14px rgba(15,23,42,0.3)' }}
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
                headerOscuro
                sinScrollInterno={true}
                alturaMaxima="lg"
                className="h-[80vh]!"
            >
                {/* Header con gradiente amber */}
                <div
                    className="relative px-4 pt-8 pb-3 shrink-0 overflow-hidden"
                    style={{ background: '#e8910a' }}
                >
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                    <div className="relative flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <Star className="w-4.5 h-4.5 text-white" />
                        </div>
                        <h3 className="text-white font-bold text-lg">Reseñas</h3>
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
            mostrarHeader={false}
            ancho="lg"
            paddingContenido="none"
            className="flex flex-col h-[75vh]! lg:h-[80vh]!"
        >
            {/* Header con gradiente amber */}
            <div
                className="relative px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 shrink-0 overflow-hidden rounded-t-2xl"
                style={{ background: '#e8910a' }}
            >
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2 2xl:gap-3">
                        <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <Star className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-white fill-current" />
                        </div>
                        <h3 className="text-white font-bold text-base 2xl:text-lg">Reseñas ({resenas.length})</h3>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer">
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 min-h-0">

                {/* SIDEBAR */}
                <div className="w-52 2xl:w-64 shrink-0 p-3 2xl:p-5 bg-slate-200/50 border-r border-slate-300 flex flex-col">
                    
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
                            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mt-1">{resenas.length} reseñas</p>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="mb-3 2xl:mb-5">
                        <h3 className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider mb-1.5 2xl:mb-2.5">
                            Filtrar por
                        </h3>
                        <div className="flex flex-wrap gap-1.5 2xl:gap-2">
                            {[5, 4, 3, 2, 1].map((estrellas) => (
                                <button
                                    key={estrellas}
                                    onClick={() => toggleFiltro(estrellas)}
                                    className={`px-2 py-1 2xl:px-2.5 2xl:py-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold rounded-lg flex items-center gap-0.5 2xl:gap-1 cursor-pointer ${
                                        filtroEstrellas === estrellas
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-white text-slate-600 border-2 border-slate-300'
                                    }`}
                                >
                                    {estrellas} <Star className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 fill-current" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Distribución */}
                    <div className="space-y-1 2xl:space-y-2 mb-3 2xl:mb-5">
                        <h3 className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 uppercase tracking-wider mb-1.5 2xl:mb-2.5">
                            Distribución
                        </h3>
                        {distribucion.map(({ estrellas, cantidad, porcentaje }) => (
                            <div key={estrellas} className="flex items-center gap-1.5 2xl:gap-2">
                                <span className="w-3 text-slate-600 font-semibold text-sm lg:text-[11px] 2xl:text-sm">{estrellas}</span>
                                <Star className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400 fill-current" />
                                <div className="flex-1 h-1.5 2xl:h-2 bg-white rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-linear-to-r from-amber-400 to-orange-400 rounded-full"
                                        style={{ width: `${porcentaje}%` }}
                                    />
                                </div>
                                <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium w-4 2xl:w-6 text-right">{cantidad}</span>
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
                        <div className="px-3 2xl:px-4 py-1.5 2xl:py-2 border-b border-slate-300 flex items-center gap-2">
                            <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">Mostrando:</span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-sm lg:text-[11px] 2xl:text-sm font-semibold rounded-lg flex items-center gap-1">
                                {filtroEstrellas} <Star className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 fill-current" />
                                <button
                                    onClick={() => setFiltroEstrellas(null)}
                                    className="ml-0.5 cursor-pointer"
                                >
                                    <X className="w-3 h-3 2xl:w-3.5 2xl:h-3.5" />
                                </button>
                            </span>
                            <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
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