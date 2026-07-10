/**
 * HistorialPagosMembresia.tsx
 * ===========================
 * Card "Historial de pagos" del tab Membresía y Pagos (Mi Perfil, Modo Personal).
 *
 * Llena la altura de su columna (igualada con la columna izquierda vía grid `items-stretch`)
 * y hace scroll interno para mostrar TODOS los pagos sin desfasar el layout ni crecer de más.
 * Mezcla recibos (pagados/anulados) y solicitudes de pago manual rechazadas, ordenados por
 * fecha desc. En móvil se acota con `max-h` (no hay columna que lo limite).
 *
 * Ubicación: apps/web/src/pages/private/perfil/components/HistorialPagosMembresia.tsx
 */

import { useMemo, useState } from 'react';
import { ChevronDown, Download, ExternalLink, FileText, Loader2 } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import type { ConceptoRecibo, ReciboMembresia, SolicitudRechazada } from '../../../../services/membresiaService';

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatearFecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')} ${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatearMonto(monto: string | null): string {
    if (monto === null) return '—';
    const n = Number(monto);
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function formatearFolio(folio: number | null): string {
    if (folio === null) return 'S/F';
    return `#${String(folio).padStart(5, '0')}`;
}

const CONCEPTO_TEXTO: Record<ConceptoRecibo, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    cortesia: 'Cortesía',
    tarjeta: 'Tarjeta',
};

type ItemHist =
    | { kind: 'recibo'; id: string; fecha: string | null; recibo: ReciboMembresia }
    | { kind: 'rechazo'; id: string; fecha: string | null; rechazo: SolicitudRechazada };

interface Props {
    recibos: ReciboMembresia[];
    solicitudesRechazadas: SolicitudRechazada[];
    /** Id del movimiento resaltado al llegar desde una notificación de pago (?movId=). */
    movResaltado: string | null;
    descargandoId: string | null;
    onDescargar: (recibo: ReciboMembresia) => void;
}

export default function HistorialPagosMembresia({
    recibos,
    solicitudesRechazadas,
    movResaltado,
    descargandoId,
    onDescargar,
}: Props) {
    // Acordeón del detalle (motivo de anulación / rechazo): uno a la vez.
    const [detalleId, setDetalleId] = useState<string | null>(null);

    const items = useMemo<ItemHist[]>(
        () =>
            [
                ...recibos.map((r) => ({ kind: 'recibo' as const, id: r.id, fecha: r.fechaPago, recibo: r })),
                ...solicitudesRechazadas.map((s) => ({ kind: 'rechazo' as const, id: s.id, fecha: s.fecha, rechazo: s })),
            ].sort((a, b) => new Date(b.fecha ?? 0).getTime() - new Date(a.fecha ?? 0).getTime()),
        [recibos, solicitudesRechazadas],
    );

    function renderFila(it: ItemHist) {
        if (it.kind === 'recibo') {
            const mostrarDetalle = it.recibo.anulado && !!it.recibo.motivoAnulacion;
            const expandido = detalleId === it.recibo.id;
            return (
                <li
                    key={`r-${it.recibo.id}`}
                    data-testid={`recibo-${it.recibo.id}`}
                    className={`px-4 py-2.5 ${movResaltado === it.recibo.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-1.5 text-sm font-semibold">
                                <span className="text-slate-800">{formatearFolio(it.recibo.folio)}</span>
                                <span className="text-slate-300">·</span>
                                <span className={it.recibo.anulado ? 'text-red-600' : 'text-emerald-600'}>
                                    {it.recibo.anulado ? 'Anulado' : 'Pagado'}
                                </span>
                            </p>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mt-0.5">
                                {CONCEPTO_TEXTO[it.recibo.concepto] ?? it.recibo.concepto} · {formatearFecha(it.recibo.fechaPago)}
                            </p>
                            {mostrarDetalle && (
                                <button
                                    data-testid={`recibo-detalles-${it.recibo.id}`}
                                    onClick={() => setDetalleId(expandido ? null : it.recibo.id)}
                                    aria-expanded={expandido}
                                    className="inline-flex items-center gap-1 mt-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-600 lg:hover:text-red-700 cursor-pointer"
                                >
                                    {expandido ? 'Ocultar detalles' : 'Ver detalles'}
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandido ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                        <span className="text-sm font-semibold text-slate-700 shrink-0">{formatearMonto(it.recibo.monto)}</span>
                        <Tooltip text="Descargar recibo" position="top">
                            <button
                                data-testid={`recibo-descargar-${it.recibo.id}`}
                                onClick={() => onDescargar(it.recibo)}
                                disabled={descargandoId === it.recibo.id}
                                aria-label="Descargar recibo"
                                className="shrink-0 text-slate-400 lg:hover:text-slate-600 cursor-pointer disabled:opacity-50 disabled:cursor-default"
                            >
                                {descargandoId === it.recibo.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" strokeWidth={2} />
                                )}
                            </button>
                        </Tooltip>
                    </div>
                    {mostrarDetalle && expandido && (
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-700 mt-2 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5">
                            Motivo: {it.recibo.motivoAnulacion}
                        </p>
                    )}
                </li>
            );
        }
        const mostrarDetalle = !!it.rechazo.motivo;
        const expandido = detalleId === it.rechazo.id;
        return (
            <li
                key={`x-${it.rechazo.id}`}
                data-testid={`rechazo-${it.rechazo.id}`}
                className={`px-4 py-2.5 ${movResaltado === it.rechazo.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-300' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-red-600">Rechazado</p>
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mt-0.5">
                            Transferencia · {formatearFecha(it.rechazo.fecha)}
                        </p>
                        {mostrarDetalle && (
                            <button
                                data-testid={`rechazo-detalles-${it.rechazo.id}`}
                                onClick={() => setDetalleId(expandido ? null : it.rechazo.id)}
                                aria-expanded={expandido}
                                className="inline-flex items-center gap-1 mt-1 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-600 lg:hover:text-red-700 cursor-pointer"
                            >
                                {expandido ? 'Ocultar detalles' : 'Ver detalles'}
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandido ? 'rotate-180' : ''}`} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                    <span className="text-sm font-semibold text-slate-600 line-through shrink-0">{formatearMonto(it.rechazo.monto)}</span>
                    <Tooltip text="Ver comprobante" position="top">
                        <a
                            href={it.rechazo.comprobanteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Ver comprobante"
                            className="shrink-0 text-slate-400 lg:hover:text-slate-600 cursor-pointer"
                        >
                            <ExternalLink className="w-4 h-4" strokeWidth={2} />
                        </a>
                    </Tooltip>
                </div>
                {mostrarDetalle && expandido && (
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-700 mt-2 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5">
                        Motivo: {it.rechazo.motivo}
                    </p>
                )}
            </li>
        );
    }

    return (
        <div className="rounded-xl bg-white border border-slate-300 shadow-sm overflow-hidden flex flex-col lg:h-full">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 shrink-0">
                <FileText className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-500" strokeWidth={2} />
                <p className="text-sm font-bold text-slate-800">Historial de pagos</p>
                {items.length > 0 && (
                    <span className="ml-auto text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">
                        {items.length} {items.length === 1 ? 'pago' : 'pagos'}
                    </span>
                )}
            </div>

            {items.length === 0 ? (
                <div className="p-6 text-center text-sm font-medium text-slate-600">Aún no tienes pagos.</div>
            ) : (
                <ul className="flex-1 min-h-0 overflow-y-auto max-h-[26rem] lg:max-h-none divide-y divide-slate-200">
                    {items.map(renderFila)}
                </ul>
            )}
        </div>
    );
}
