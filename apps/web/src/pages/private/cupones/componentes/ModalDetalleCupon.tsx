/**
 * ModalDetalleCupon.tsx
 * =====================
 * Modal de detalle de cupón con revelación de código.
 * El código se revela con confirmación de contraseña.
 *
 * UBICACIÓN: apps/web/src/pages/private/cupones/componentes/ModalDetalleCupon.tsx
 */

import { useState } from 'react';
import {
    Ticket, Store, Calendar, Lock, Eye, EyeOff, Copy, CheckCircle, XCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { revelarCodigo } from '../../../../services/misCuponesService';
import type { CuponCliente } from '../../../../services/misCuponesService';

// =============================================================================
// HELPERS
// =============================================================================

function getGradienteTipo(tipo: string): { bg: string; shadow: string; handle: string } {
    switch (tipo) {
        case 'porcentaje': return { bg: 'linear-gradient(135deg, #b91c1c, #dc2626)', shadow: 'rgba(185,28,28,0.4)', handle: '#b91c1c' };
        case 'monto_fijo': return { bg: 'linear-gradient(135deg, #15803d, #16a34a)', shadow: 'rgba(21,128,61,0.4)', handle: '#15803d' };
        case '2x1': case '3x2': return { bg: 'linear-gradient(135deg, #b45309, #d97706)', shadow: 'rgba(180,83,9,0.4)', handle: '#b45309' };
        case 'envio_gratis': return { bg: 'linear-gradient(135deg, #1e40af, #2563eb)', shadow: 'rgba(30,64,175,0.4)', handle: '#1e40af' };
        default: return { bg: 'linear-gradient(135deg, #334155, #475569)', shadow: 'rgba(51,65,85,0.4)', handle: '#334155' };
    }
}

function formatearTipoValor(tipo: string, valor: string | null): string {
    switch (tipo) {
        case 'porcentaje': return `${valor}% de descuento`;
        case 'monto_fijo': return `$${valor} de descuento`;
        case '2x1': return '2×1 (segundo gratis)';
        case '3x2': return '3×2 (tercero gratis)';
        case 'envio_gratis': return 'Envío gratis';
        default: return valor || 'Promoción especial';
    }
}

function getBadgeEstado(estado: string): { label: string; clases: string; icono: React.ComponentType<{ className?: string }> } {
    switch (estado) {
        case 'activo': return { label: 'Activo', clases: 'bg-emerald-100 border-emerald-300 text-emerald-700', icono: CheckCircle };
        case 'usado': return { label: 'Usado', clases: 'bg-slate-100 border-slate-300 text-slate-600', icono: CheckCircle };
        case 'expirado': return { label: 'Expirado', clases: 'bg-amber-100 border-amber-300 text-amber-700', icono: Clock };
        case 'revocado': return { label: 'Revocado', clases: 'bg-red-100 border-red-300 text-red-700', icono: XCircle };
        default: return { label: estado, clases: 'bg-slate-100 border-slate-300 text-slate-600', icono: AlertTriangle };
    }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function ModalDetalleCupon({
    abierto,
    onCerrar,
    cupon,
}: {
    abierto: boolean;
    onCerrar: () => void;
    cupon: CuponCliente | null;
}) {
    const [codigoVisible, setCodigoVisible] = useState(false);
    const [codigoRevelado, setCodigoRevelado] = useState<string | null>(null);
    const [cargandoCodigo, setCargandoCodigo] = useState(false);

    if (!abierto || !cupon) return null;

    const gradiente = getGradienteTipo(cupon.tipo);
    const badge = getBadgeEstado(cupon.estado);
    const BadgeIcono = badge.icono;
    const esActivo = cupon.estado === 'activo';

    const handleRevelarCodigo = async () => {
        setCargandoCodigo(true);
        try {
            const res = await revelarCodigo(cupon.cuponId);
            if (res.success && res.data) {
                setCodigoRevelado(res.data.codigo);
                setCodigoVisible(true);
            } else {
                notificar.error(res.message || 'Error al revelar código');
            }
        } catch {
            notificar.error('Error al revelar código');
        } finally {
            setCargandoCodigo(false);
        }
    };

    const handleCopiarCodigo = () => {
        if (codigoRevelado) {
            navigator.clipboard.writeText(codigoRevelado);
            notificar.exito('Código copiado');
        }
    };

    const handleCerrar = () => {
        setCodigoVisible(false);
        setCodigoRevelado(null);
        onCerrar();
    };

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={handleCerrar}
            ancho="md"
            paddingContenido="none"
            mostrarHeader={false}
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle={gradiente.handle}
            headerOscuro
            className="max-w-xs lg:max-w-md 2xl:max-w-lg"
        >
            <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh] 2xl:max-h-[75vh]">

                {/* Header */}
                <div
                    className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
                    style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
                >
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

                    <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">{cupon.titulo}</h3>
                            <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">{formatearTipoValor(cupon.tipo, cupon.valor)}</span>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg border ${badge.clases} flex items-center gap-1`}>
                            <BadgeIcono className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{badge.label}</span>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">

                    {/* Negocio */}
                    <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
                        {cupon.negocioLogo ? (
                            <img src={cupon.negocioLogo} alt={cupon.negocioNombre} className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-lg object-cover border-2 border-slate-300" />
                        ) : (
                            <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <Store className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-emerald-600" />
                            </div>
                        )}
                        <div>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800">{cupon.negocioNombre}</p>
                            {cupon.sucursalNombre && <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">{cupon.sucursalNombre}</p>}
                        </div>
                    </div>

                    {/* Descripción */}
                    {cupon.descripcion && (
                        <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">{cupon.descripcion}</p>
                    )}

                    {/* Detalles */}
                    <div className="grid grid-cols-2 gap-2 lg:gap-1.5 2xl:gap-2">
                        {cupon.fechaFin && (
                            <div className="flex items-center gap-2 p-2.5 lg:p-2 2xl:p-2.5 bg-slate-100 rounded-lg border-2 border-slate-300">
                                <Calendar className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600 shrink-0" />
                                <div>
                                    <p className="text-[10px] lg:text-[9px] 2xl:text-[10px] text-slate-600 font-semibold">Vence</p>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800">
                                        {new Date(cupon.fechaFin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        )}
                        {cupon.compraMinima && parseFloat(cupon.compraMinima) > 0 && (
                            <div className="flex items-center gap-2 p-2.5 lg:p-2 2xl:p-2.5 bg-slate-100 rounded-lg border-2 border-slate-300">
                                <Ticket className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600 shrink-0" />
                                <div>
                                    <p className="text-[10px] lg:text-[9px] 2xl:text-[10px] text-slate-600 font-semibold">Compra mín.</p>
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-800">${cupon.compraMinima}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Motivo asignación */}
                    {cupon.motivo && (
                        <div className="p-2.5 lg:p-2 2xl:p-2.5 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                            <p className="text-sm lg:text-[11px] 2xl:text-sm text-emerald-700 font-medium">{cupon.motivo}</p>
                        </div>
                    )}

                    {/* Revocación */}
                    {cupon.estado === 'revocado' && (
                        <div className="p-2.5 lg:p-2 2xl:p-2.5 bg-red-50 rounded-lg border-2 border-red-200">
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-red-700">Cupón revocado</p>
                            {cupon.motivoRevocacion && <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-medium mt-0.5">{cupon.motivoRevocacion}</p>}
                            {cupon.revocadoAt && <p className="text-[10px] lg:text-[9px] 2xl:text-[10px] text-red-500 font-medium mt-1">{new Date(cupon.revocadoAt).toLocaleDateString('es-MX')}</p>}
                        </div>
                    )}

                    {/* Código */}
                    {esActivo && (
                        <div className="p-3 lg:p-2.5 2xl:p-3 bg-slate-100 rounded-lg border-2 border-slate-300">
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-2 lg:mb-1.5 2xl:mb-2">Tu código de descuento</p>

                            {codigoVisible && codigoRevelado ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between p-3 lg:p-2.5 2xl:p-3 bg-white rounded-lg border-2 border-emerald-300">
                                        <span className="text-2xl lg:text-xl 2xl:text-2xl font-mono font-black text-slate-800 tracking-widest">
                                            {codigoRevelado}
                                        </span>
                                        <button
                                            data-testid="btn-copiar-codigo"
                                            onClick={handleCopiarCodigo}
                                            className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 cursor-pointer"
                                        >
                                            <Copy className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => setCodigoVisible(false)}
                                        className="flex items-center gap-1.5 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600 cursor-pointer"
                                    >
                                        <EyeOff className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                        Ocultar código
                                    </button>
                                </div>
                            ) : (
                                <button
                                    data-testid="btn-revelar-codigo"
                                    onClick={handleRevelarCodigo}
                                    disabled={cargandoCodigo}
                                    className="w-full flex items-center justify-center gap-2 py-3 lg:py-2.5 2xl:py-3 rounded-xl font-bold text-sm lg:text-xs 2xl:text-sm cursor-pointer disabled:opacity-50"
                                    style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', color: '#a7f3d0' }}
                                >
                                    {cargandoCodigo ? (
                                        <Spinner tamanio="sm" color="white" />
                                    ) : (
                                        <>
                                            <Lock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                            Revelar código
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 px-4 py-3 lg:px-3 lg:py-3 2xl:px-4 2xl:py-3 border-t-2 border-slate-300 bg-white">
                    <button
                        data-testid="btn-cerrar-cupon"
                        onClick={handleCerrar}
                        className="w-full inline-flex items-center justify-center font-bold rounded-xl px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </ModalAdaptativo>
    );
}
