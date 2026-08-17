/**
 * ============================================================================
 * COMPONENTE: ModalGestionApartados
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/marketplace/ModalGestionApartados.tsx
 *
 * PROPÓSITO:
 * Panel de gestión de Mi Catálogo (MarketPlace, 2026-08-12): el vendedor ve
 * las solicitudes de apartado de TODOS sus artículos (quien las manda llega
 * sin cuenta, solo nombre + WhatsApp, desde el link público compartido).
 *
 * Modelo de 2 estados (2026-08-16, sin paso intermedio de "confirmar"): al
 * solicitar, la solicitud nace directo en `apartado` y bloquea el artículo
 * de inmediato — nadie más puede apartarlo, y el artículo sigue público con
 * overlay "Apartado" (no se oculta). El vendedor solo tiene 2 acciones:
 * "Rechazar" (libera el bloqueo) o "Vendido" (despublica el artículo, pasa
 * a la pestaña Vendidos). Si nunca actúa, el cron libera el bloqueo solo al
 * vencer el tiempo configurado abajo (un solo número por vendedor, no por
 * artículo).
 *
 * Entrada: botón dentro de Mis Publicaciones > tab MarketPlace.
 * Detalle completo: docs/arquitectura/Catalogo_MarketPlace_Apartado.md
 */

import { useState, useEffect } from 'react';
import { Lock, Check, X, Clock, ImageIcon } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Spinner } from '../ui/Spinner';
import {
    useMisApartados,
    useMarcarApartadoVendido,
    useRechazarApartado,
    useMiConfiguracionApartado,
    useActualizarConfiguracionApartado,
    type ApartadoDeVendedor,
} from '../../hooks/queries/useMarketplace';
import { obtenerFotoPortada } from '../../utils/marketplace';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalGestionApartadosProps {
    abierto: boolean;
    onCerrar: () => void;
}

type FiltroEstado = 'apartado' | 'vendido';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalGestionApartados({ abierto, onCerrar }: ModalGestionApartadosProps) {
    const [filtro, setFiltro] = useState<FiltroEstado>('apartado');
    const { data: apartados = [], isLoading } = useMisApartados(filtro);

    const { mutate: marcarVendido, isPending: marcandoVendido } = useMarcarApartadoVendido();
    const { mutate: rechazar, isPending: rechazando } = useRechazarApartado();
    const [procesandoId, setProcesandoId] = useState<string | null>(null);

    const handleMarcarVendido = (apartadoId: string) => {
        setProcesandoId(apartadoId);
        marcarVendido(
            { apartadoId },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        notificar.exito('Marcado como vendido');
                    } else {
                        notificar.error(data.message || 'No se pudo marcar como vendido');
                    }
                    setProcesandoId(null);
                },
                onError: () => {
                    notificar.error('No se pudo marcar como vendido, intenta de nuevo');
                    setProcesandoId(null);
                },
            }
        );
    };

    const handleRechazar = (apartadoId: string) => {
        setProcesandoId(apartadoId);
        rechazar(
            { apartadoId },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        notificar.exito('Solicitud rechazada');
                    } else {
                        notificar.error(data.message || 'No se pudo rechazar');
                    }
                    setProcesandoId(null);
                },
                onError: () => {
                    notificar.error('No se pudo rechazar, intenta de nuevo');
                    setProcesandoId(null);
                },
            }
        );
    };

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="lg"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            headerOscuro
            discriminador="_modalGestionApartados"
        >
            {/* Alto FIJO (no max-h) — el modal no debe cambiar de tamaño al
                cambiar de chip (Apartados/Vendidos) según cuántos items
                tenga cada lista; el contenido scrollea adentro. */}
            <div className="flex flex-col h-[85vh] lg:h-[75vh]">
                {/* ── Header con gradiente (FIJO) — teal, mismo acento de marca
                    que MarketPlace usa en toda la app (ficha pública, tabs,
                    dropdown de Mis Publicaciones). ── */}
                <div
                    className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
                    style={{
                        background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                        boxShadow: '0 4px 16px rgba(13,148,136,0.3)',
                    }}
                >
                    {/* Círculos decorativos */}
                    <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

                    <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <Lock className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                            <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                                Solicitudes de apartado
                            </h3>
                            <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">
                                Mi Catálogo · MarketPlace
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Contenido con scroll ── */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 lg:p-3 2xl:p-4">
                        <ConfiguracionHoras />

                        <div className="flex items-center gap-2 mt-4 mb-3">
                            <ChipFiltro activo={filtro === 'apartado'} label="Apartados" onClick={() => setFiltro('apartado')} />
                            <ChipFiltro activo={filtro === 'vendido'} label="Vendidos" onClick={() => setFiltro('vendido')} />
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Spinner tamanio="md" />
                            </div>
                        ) : apartados.length === 0 ? (
                            <div className="py-10 text-center">
                                <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-3">
                                    <Lock className="w-7 h-7 text-teal-300" />
                                </div>
                                <p className="text-sm font-semibold text-slate-600">
                                    {filtro === 'apartado' ? 'No tienes artículos apartados' : 'Aún no has vendido por apartado'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {apartados.map((apartado) => (
                                    <FilaApartado
                                        key={apartado.id}
                                        apartado={apartado}
                                        procesando={(marcandoVendido || rechazando) && procesandoId === apartado.id}
                                        onMarcarVendido={() => handleMarcarVendido(apartado.id)}
                                        onRechazar={() => handleRechazar(apartado.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ModalAdaptativo>
    );
}

// =============================================================================
// CONFIGURACIÓN DE HORAS
// =============================================================================

function ConfiguracionHoras() {
    const { data: horasGuardadas, isLoading } = useMiConfiguracionApartado();
    const { mutate: actualizar, isPending } = useActualizarConfiguracionApartado();
    const [horas, setHoras] = useState(24);

    useEffect(() => {
        if (horasGuardadas !== undefined) setHoras(horasGuardadas);
    }, [horasGuardadas]);

    const handleGuardar = () => {
        if (horas < 1 || horas > 168) {
            notificar.error('El tiempo debe estar entre 1 y 168 horas (7 días)');
            return;
        }
        actualizar(
            { apartadoHoras: horas },
            {
                onSuccess: (data) => {
                    if (data.success) notificar.exito('Tiempo de apartado actualizado');
                    else notificar.error(data.message || 'No se pudo guardar');
                },
                onError: () => notificar.error('No se pudo guardar, intenta de nuevo'),
            }
        );
    };

    return (
        <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">Tiempo de apartado</p>
                <p className="text-xs text-slate-500 font-medium">Horas antes de liberarse solo si no se concreta</p>
            </div>
            {isLoading ? (
                <Spinner tamanio="sm" />
            ) : (
                <>
                    <input
                        type="number"
                        min={1}
                        max={168}
                        value={horas}
                        onChange={(e) => setHoras(parseInt(e.target.value, 10) || 0)}
                        data-testid="input-horas-apartado"
                        className="w-16 h-9 rounded-lg border-2 border-slate-300 text-center text-sm font-bold text-slate-800 focus:border-teal-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                    <button
                        type="button"
                        onClick={handleGuardar}
                        disabled={isPending || horas === horasGuardadas}
                        data-testid="btn-guardar-horas-apartado"
                        className="h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Guardar
                    </button>
                </>
            )}
        </div>
    );
}

// =============================================================================
// CHIP DE FILTRO
// =============================================================================

function ChipFiltro({ activo, label, onClick }: { activo: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-9 px-3.5 rounded-full text-sm font-semibold border-2 cursor-pointer transition-colors ${
                activo ? 'bg-teal-500 border-teal-400 text-white shadow-sm shadow-teal-500/20' : 'bg-white border-slate-300 text-slate-600 hover:border-teal-400/60'
            }`}
        >
            {label}
        </button>
    );
}

// =============================================================================
// FILA DE SOLICITUD
// =============================================================================

const ESTADO_LABEL: Record<ApartadoDeVendedor['estado'], { texto: string; clase: string }> = {
    apartado: { texto: 'Apartado', clase: 'bg-amber-100 text-amber-700' },
    vendido: { texto: 'Vendido', clase: 'bg-emerald-100 text-emerald-700' },
    rechazado: { texto: 'Rechazado', clase: 'bg-red-100 text-red-700' },
    expirado: { texto: 'Expirado', clase: 'bg-slate-200 text-slate-600' },
};

function FilaApartado({
    apartado,
    procesando,
    onMarcarVendido,
    onRechazar,
}: {
    apartado: ApartadoDeVendedor;
    procesando: boolean;
    onMarcarVendido: () => void;
    onRechazar: () => void;
}) {
    const fotoPortada = obtenerFotoPortada(apartado.articuloFotos ?? [], apartado.articuloFotoPortadaIndex);
    const estadoInfo = ESTADO_LABEL[apartado.estado];
    const whatsappLink = `https://wa.me/${apartado.whatsappComprador.replace(/\D/g, '')}`;

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 transition-colors">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                {fotoPortada ? (
                    <img src={fotoPortada.url} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-slate-300" />
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{apartado.articuloTitulo}</p>
                <p className="text-xs text-slate-600 font-medium truncate">
                    {apartado.nombreComprador} ·{' '}
                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline"
                    >
                        {apartado.whatsappComprador}
                    </a>
                </p>
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${estadoInfo.clase}`}>
                {estadoInfo.texto}
            </span>
            {apartado.estado === 'apartado' && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={onRechazar}
                        disabled={procesando}
                        data-testid={`btn-rechazar-apartado-${apartado.id}`}
                        className="h-9 px-3 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center gap-1.5 text-sm font-bold cursor-pointer disabled:opacity-60"
                    >
                        <X className="w-4 h-4" />
                        Rechazar
                    </button>
                    <button
                        type="button"
                        onClick={onMarcarVendido}
                        disabled={procesando}
                        data-testid={`btn-vendido-apartado-${apartado.id}`}
                        className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 text-sm font-bold cursor-pointer disabled:opacity-60"
                    >
                        <Check className="w-4 h-4" />
                        Vendido
                    </button>
                </div>
            )}
        </div>
    );
}

export default ModalGestionApartados;
