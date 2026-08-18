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
import { Lock, XCircle, CheckCircle, Clock, ImageIcon, Phone } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Spinner } from '../ui/Spinner';
import Tooltip from '../ui/Tooltip';
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
import { formatearNumero } from '../../hooks/useAbrirWhatsApp';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalGestionApartadosProps {
    abierto: boolean;
    onCerrar: () => void;
    /** Deep-link desde la notificación "alguien apartó tu artículo"
     *  (2026-08-18) — id de la solicitud a resaltar + auto-scroll al abrir.
     *  El caller (`PaginaMisPublicaciones.tsx`) ya limpió el `?apartadoId=`
     *  de la URL; esto solo es el valor a consumir una vez. */
    apartadoIdResaltar?: string | null;
    /** Avisa al caller que ya se consumió `apartadoIdResaltar`, para que no
     *  lo vuelva a pasar si el modal se cierra y se reabre. */
    onResaltadoConsumido?: () => void;
}

type FiltroEstado = 'apartado' | 'vendido';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalGestionApartados({ abierto, onCerrar, apartadoIdResaltar, onResaltadoConsumido }: ModalGestionApartadosProps) {
    const [filtro, setFiltro] = useState<FiltroEstado>('apartado');
    const { data: apartados = [], isLoading } = useMisApartados(filtro);

    const { mutate: marcarVendido, isPending: marcandoVendido } = useMarcarApartadoVendido();
    const { mutate: rechazar, isPending: rechazando } = useRechazarApartado();
    const [procesandoId, setProcesandoId] = useState<string | null>(null);

    // ─── Resaltado + auto-scroll (2026-08-18) ──────────────────────────────
    // La solicitud nueva siempre nace en el tab "Apartados" — se fuerza ese
    // filtro al recibir el id. `resaltadoId` es estado LOCAL (no la prop
    // directa) para que el highlight visual dure sus 3.5s propios aunque el
    // caller ya haya limpiado `apartadoIdResaltar` (evita re-disparar si el
    // modal se cierra y se reabre sin recargar la página).
    const [resaltadoId, setResaltadoId] = useState<string | null>(null);

    useEffect(() => {
        if (!apartadoIdResaltar) return;
        setResaltadoId(apartadoIdResaltar);
        setFiltro('apartado');
        onResaltadoConsumido?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apartadoIdResaltar]);

    useEffect(() => {
        if (!resaltadoId || isLoading) return;
        if (!apartados.some((a) => a.id === resaltadoId)) return;
        const t = setTimeout(() => {
            document
                .querySelector(`[data-testid="fila-apartado-${resaltadoId}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
        return () => clearTimeout(t);
    }, [apartados, isLoading, resaltadoId]);

    useEffect(() => {
        if (!resaltadoId) return;
        const t = setTimeout(() => setResaltadoId(null), 3500);
        return () => clearTimeout(t);
    }, [resaltadoId]);

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
                        background: 'linear-gradient(135deg, #115e59, #0d9488)',
                        boxShadow: '0 4px 16px rgba(17,94,89,0.35)',
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
                                        resaltado={apartado.id === resaltadoId}
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

function FilaApartado({
    apartado,
    procesando,
    resaltado,
    onMarcarVendido,
    onRechazar,
}: {
    apartado: ApartadoDeVendedor;
    procesando: boolean;
    resaltado?: boolean;
    onMarcarVendido: () => void;
    onRechazar: () => void;
}) {
    const fotoPortada = obtenerFotoPortada(apartado.articuloFotos ?? [], apartado.articuloFotoPortadaIndex);
    const whatsappLink = `https://wa.me/${apartado.whatsappComprador.replace(/\D/g, '')}`;

    return (
        <div
            data-testid={`fila-apartado-${apartado.id}`}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${
                resaltado
                    ? 'border-amber-300 bg-amber-50 ring-2 ring-inset ring-amber-300'
                    : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
        >
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
                {/* Datos del comprador — son lo más importante de la fila
                    (a quién contactar), así que van primero y con más peso
                    que el título del artículo (2026-08-17). */}
                <p className="text-sm font-bold text-slate-900 truncate">{apartado.nombreComprador}</p>
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:underline"
                >
                    <Phone className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                    {formatearNumero(apartado.whatsappComprador)}
                </a>
                <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{apartado.articuloTitulo}</p>
            </div>
            {apartado.estado === 'apartado' && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <Tooltip text="Rechazar" position="top">
                        <button
                            type="button"
                            onClick={onRechazar}
                            disabled={procesando}
                            aria-label="Rechazar"
                            data-testid={`btn-rechazar-apartado-${apartado.id}`}
                            className="h-9 w-9 rounded-lg hover:bg-red-100 text-red-600 flex items-center justify-center cursor-pointer disabled:opacity-60"
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Marcar como vendido" position="top">
                        <button
                            type="button"
                            onClick={onMarcarVendido}
                            disabled={procesando}
                            aria-label="Marcar como vendido"
                            data-testid={`btn-vendido-apartado-${apartado.id}`}
                            className="h-9 w-9 rounded-lg hover:bg-emerald-100 text-emerald-600 flex items-center justify-center cursor-pointer disabled:opacity-60"
                        >
                            <CheckCircle className="w-6 h-6" />
                        </button>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}

export default ModalGestionApartados;
