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
 * sin cuenta, solo nombre + WhatsApp, desde el link público compartido) y
 * las confirma o rechaza. Incluye el ajuste de cuántas horas dura un
 * apartado confirmado antes de liberarse solo (un solo número por vendedor,
 * no por artículo).
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
    useConfirmarApartado,
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

type FiltroEstado = 'pendiente' | 'confirmado' | 'historial';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalGestionApartados({ abierto, onCerrar }: ModalGestionApartadosProps) {
    const [filtro, setFiltro] = useState<FiltroEstado>('pendiente');
    const estadoQuery = filtro === 'historial' ? undefined : filtro;
    const { data: apartados = [], isLoading } = useMisApartados(estadoQuery);
    const listaFiltrada = filtro === 'historial'
        ? apartados.filter((a) => a.estado === 'rechazado' || a.estado === 'expirado')
        : apartados;

    const { mutate: confirmar, isPending: confirmando } = useConfirmarApartado();
    const { mutate: rechazar, isPending: rechazando } = useRechazarApartado();
    const [procesandoId, setProcesandoId] = useState<string | null>(null);

    const handleConfirmar = (apartadoId: string) => {
        setProcesandoId(apartadoId);
        confirmar(
            { apartadoId },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        notificar.exito('Apartado confirmado');
                    } else {
                        notificar.error(data.message || 'No se pudo confirmar');
                    }
                    setProcesandoId(null);
                },
                onError: () => {
                    notificar.error('No se pudo confirmar, intenta de nuevo');
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
            titulo="Solicitudes de apartado"
            iconoTitulo={<Lock className="w-5 h-5 text-white" />}
            headerOscuro
            ancho="lg"
            alturaMaxima="xl"
            discriminador="_modalGestionApartados"
        >
            <ConfiguracionHoras />

            <div className="flex items-center gap-2 mt-4 mb-3">
                <ChipFiltro activo={filtro === 'pendiente'} label="Pendientes" onClick={() => setFiltro('pendiente')} />
                <ChipFiltro activo={filtro === 'confirmado'} label="Confirmados" onClick={() => setFiltro('confirmado')} />
                <ChipFiltro activo={filtro === 'historial'} label="Historial" onClick={() => setFiltro('historial')} />
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-10">
                    <Spinner tamanio="md" />
                </div>
            ) : listaFiltrada.length === 0 ? (
                <div className="py-10 text-center">
                    <Lock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">
                        {filtro === 'pendiente' ? 'No tienes solicitudes pendientes' : 'Nada por aquí todavía'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {listaFiltrada.map((apartado) => (
                        <FilaApartado
                            key={apartado.id}
                            apartado={apartado}
                            procesando={(confirmando || rechazando) && procesandoId === apartado.id}
                            onConfirmar={() => handleConfirmar(apartado.id)}
                            onRechazar={() => handleRechazar(apartado.id)}
                        />
                    ))}
                </div>
            )}
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
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
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
                        className="w-16 h-9 rounded-lg border-2 border-slate-300 text-center text-sm font-bold text-slate-800 focus:border-slate-500 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleGuardar}
                        disabled={isPending || horas === horasGuardadas}
                        data-testid="btn-guardar-horas-apartado"
                        className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
            className={`h-9 px-3.5 rounded-full text-sm font-semibold border-2 cursor-pointer ${
                activo ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
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
    pendiente: { texto: 'Pendiente', clase: 'bg-amber-100 text-amber-700' },
    confirmado: { texto: 'Confirmado', clase: 'bg-emerald-100 text-emerald-700' },
    rechazado: { texto: 'Rechazado', clase: 'bg-red-100 text-red-700' },
    expirado: { texto: 'Expirado', clase: 'bg-slate-200 text-slate-600' },
};

function FilaApartado({
    apartado,
    procesando,
    onConfirmar,
    onRechazar,
}: {
    apartado: ApartadoDeVendedor;
    procesando: boolean;
    onConfirmar: () => void;
    onRechazar: () => void;
}) {
    const fotoPortada = obtenerFotoPortada(apartado.articulo_fotos, apartado.articulo_foto_portada_index);
    const estadoInfo = ESTADO_LABEL[apartado.estado];
    const whatsappLink = `https://wa.me/${apartado.whatsapp_comprador.replace(/\D/g, '')}`;

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 bg-white">
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
                <p className="text-sm font-semibold text-slate-800 truncate">{apartado.articulo_titulo}</p>
                <p className="text-xs text-slate-600 font-medium truncate">
                    {apartado.nombre_comprador} ·{' '}
                    <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline"
                    >
                        {apartado.whatsapp_comprador}
                    </a>
                </p>
            </div>
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${estadoInfo.clase}`}>
                {estadoInfo.texto}
            </span>
            {apartado.estado === 'pendiente' && (
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={procesando}
                        data-testid={`btn-confirmar-apartado-${apartado.id}`}
                        className="w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center cursor-pointer disabled:opacity-60"
                        aria-label="Confirmar apartado"
                    >
                        <Check className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onRechazar}
                        disabled={procesando}
                        data-testid={`btn-rechazar-apartado-${apartado.id}`}
                        className="w-9 h-9 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center cursor-pointer disabled:opacity-60"
                        aria-label="Rechazar apartado"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default ModalGestionApartados;
