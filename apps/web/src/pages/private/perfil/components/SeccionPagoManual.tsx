/**
 * SeccionPagoManual.tsx
 * ======================
 * Bloque "Pagar por transferencia" de Mi Perfil – Pagos (Pieza 3). El dueño paga MESES COMPLETOS
 * (no un monto libre): elige cuántos meses y el total se calcula solo (meses × precio mensual).
 * Muestra los datos de depósito de AnunciaYA, sube el comprobante y envía una SOLICITUD que un
 * admin verifica en el Panel.
 *
 * - Si ya hay una solicitud pendiente → "Pago en revisión" (no deja crear otra).
 * - Si no → datos de cobro + meses + total (auto) + referencia + comprobante (useR2Upload).
 *
 * Ubicación: apps/web/src/pages/private/perfil/components/SeccionPagoManual.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Check, Clock, ExternalLink, Info, Loader2, Upload, X, XCircle } from 'lucide-react';
import { queryKeys } from '@/config/queryKeys';
import {
    crearSolicitudPagoManual,
    generarUrlComprobante,
    obtenerDatosCobro,
} from '@/services/membresiaService';
import type { SolicitudPendiente, UltimoRechazo } from '@/services/membresiaService';
import { useR2Upload } from '@/hooks/useR2Upload';
import { eliminarImagenHuerfana } from '@/services/r2Service';
import notificar from '@/utils/notificaciones';

const MESES_OPCIONES = [1, 3, 6, 12];

/** localStorage: id del último rechazo que el dueño ya cerró (para no volver a mostrarlo). */
const CLAVE_RECHAZO_VISTO = 'ay_rechazo_visto';

/** Dark Gradient de Marca (TC-7) — estados activos y botones de acción primaria. */
const GRADIENTE_MARCA = 'linear-gradient(135deg, #1e293b, #334155)';

const INPUT_CLASES =
    'w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 focus:outline-none focus:border-blue-500';

function formatearFecha(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function formatearMonto(monto: string | number): string {
    const n = Number(monto);
    if (Number.isNaN(n)) return '—';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

interface Props {
    solicitudPendiente: SolicitudPendiente | null;
    ultimoRechazo: UltimoRechazo | null;
}

export default function SeccionPagoManual({ solicitudPendiente, ultimoRechazo }: Props) {
    const queryClient = useQueryClient();
    const [abierto, setAbierto] = useState(false);
    const [meses, setMeses] = useState<number | null>(null);
    const [referencia, setReferencia] = useState('');
    const [enviando, setEnviando] = useState(false);

    // Aviso de rechazo: se cierra de forma persistente (localStorage) por id de rechazo. Si después
    // hay un rechazo NUEVO (otro id), vuelve a mostrarse.
    const [rechazoVistoId, setRechazoVistoId] = useState<string | null>(() => {
        try { return localStorage.getItem(CLAVE_RECHAZO_VISTO); } catch { return null; }
    });
    const mostrarAvisoRechazo = !!ultimoRechazo && rechazoVistoId !== ultimoRechazo.id;
    const cerrarAvisoRechazo = () => {
        if (!ultimoRechazo) return;
        try { localStorage.setItem(CLAVE_RECHAZO_VISTO, ultimoRechazo.id); } catch { /* sin persistencia, no crítico */ }
        setRechazoVistoId(ultimoRechazo.id);
    };

    const { imageUrl, r2Url, isUploading, uploadImage, reset } = useR2Upload({
        generarUrl: generarUrlComprobante,
    });

    // Anti-huérfanas: si el usuario abandona la página con un comprobante subido y sin enviar
    // (navega a otra ruta), se borra de R2 al desmontar. Cancelar/Quitar ya lo borran vía reset().
    const r2UrlRef = useRef<string | null>(null);
    const enviadoRef = useRef(false);
    useEffect(() => {
        r2UrlRef.current = r2Url;
    }, [r2Url]);
    useEffect(() => {
        return () => {
            if (r2UrlRef.current && !enviadoRef.current) {
                eliminarImagenHuerfana(r2UrlRef.current).catch(() => { /* silencioso */ });
            }
        };
    }, []);

    const datosCobroQuery = useQuery({
        queryKey: queryKeys.membresia.datosCobro(),
        queryFn: () => obtenerDatosCobro().then((r) => r.data ?? null),
        enabled: abierto && !solicitudPendiente,
    });
    const datos = datosCobroQuery.data;
    const hayDatos = !!datos && (datos.banco || datos.clabe || datos.cuenta || datos.tarjeta || datos.titular);

    const precioMensual = datos?.precioMensual ?? 0;
    const precioAnual = datos?.precioAnual ?? 0;
    // 12 meses = plan anual con descuento (2 meses gratis) si está activo; 1/3/6 meses = lineal.
    const usaPrecioAnual = meses === 12 && precioAnual > 0;
    const total = meses ? (usaPrecioAnual ? precioAnual : meses * precioMensual) : 0;
    const puedeEnviar = !!meses && total > 0 && !!r2Url && !isUploading && !enviando;

    async function enviar() {
        if (!puedeEnviar || !meses || !r2Url) return;
        setEnviando(true);
        try {
            const res = await crearSolicitudPagoManual({
                monto: total,
                mesesDeclarados: meses,
                referencia: referencia.trim() || null,
                comprobanteUrl: r2Url,
            });
            if (res.success) {
                enviadoRef.current = true; // ya quedó ligado a la solicitud → el cleanup no debe borrarlo
                notificar.exito('Comprobante enviado. Un administrador lo revisará pronto.');
                queryClient.invalidateQueries({ queryKey: queryKeys.membresia.mi() });
            } else {
                notificar.error(res.message || 'No se pudo enviar la solicitud');
            }
        } catch {
            notificar.error('No se pudo enviar la solicitud');
        } finally {
            setEnviando(false);
        }
    }

    // ── Pago en revisión ──
    if (solicitudPendiente) {
        return (
            <div
                data-testid="pago-manual-en-revision"
                className="rounded-xl bg-amber-100 border border-amber-300 p-4 lg:p-5"
            >
                {/* Estado */}
                <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-200 shrink-0">
                        <Clock className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-700" strokeWidth={2.5} />
                    </span>
                    <div>
                        <p className="text-sm font-bold text-amber-900 leading-tight">Pago en revisión</p>
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-amber-700">
                            Un administrador lo revisará pronto
                        </p>
                    </div>
                </div>

                {/* Monto destacado */}
                <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-amber-900 tabular-nums">
                        {formatearMonto(solicitudPendiente.monto)}
                    </span>
                    <span className="text-sm font-semibold text-amber-700">
                        · {solicitudPendiente.mesesDeclarados}{' '}
                        {solicitudPendiente.mesesDeclarados === 1 ? 'mes' : 'meses'}
                    </span>
                </div>

                {/* Footer */}
                <div className="mt-3 pt-3 border-t border-amber-300 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-amber-700">
                        Enviado el {formatearFecha(solicitudPendiente.creadoAt)}
                    </span>
                    <a
                        href={solicitudPendiente.comprobanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-sm font-semibold text-amber-800 lg:hover:bg-amber-200"
                    >
                        Ver comprobante <ExternalLink className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                    </a>
                </div>
            </div>
        );
    }

    // ── Colapsado (con aviso sutil si el último comprobante fue rechazado) ──
    if (!abierto) {
        return (
            <div className="space-y-2">
                {mostrarAvisoRechazo && (
                    <div
                        data-testid="pago-manual-rechazado-aviso"
                        className="rounded-xl bg-red-100 border border-red-300 p-4 lg:p-5 flex items-start gap-2.5"
                    >
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-200 shrink-0">
                            <XCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-red-700" strokeWidth={2.5} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-red-900 leading-tight">Tu último comprobante fue rechazado</p>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-700 mt-0.5">
                                Revisa el motivo en el historial y vuelve a enviarlo.
                            </p>
                        </div>
                        <button
                            data-testid="cerrar-aviso-rechazo"
                            onClick={cerrarAvisoRechazo}
                            aria-label="Cerrar aviso"
                            className="shrink-0 text-red-600 lg:hover:text-red-800 cursor-pointer"
                        >
                            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                        </button>
                    </div>
                )}
                <button
                    data-testid="btn-abrir-pago-manual"
                    onClick={() => setAbierto(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-white text-slate-700 border border-slate-300 shadow-sm lg:hover:bg-slate-200"
                >
                    <Banknote className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                    Pagar por transferencia o depósito
                </button>
            </div>
        );
    }

    // ── Formulario ──
    return (
        <div data-testid="pago-manual-form" className="rounded-xl bg-white border border-slate-300 shadow-sm p-4 lg:p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Banknote className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-600" strokeWidth={2} />
                <p className="text-sm font-bold text-slate-800">Pagar por transferencia o depósito</p>
            </div>

            {/* Datos de cobro */}
            {datosCobroQuery.isPending ? (
                <div className="flex justify-center py-4 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            ) : hayDatos ? (
                <div className="space-y-2">
                    <div className="rounded-lg bg-slate-100 border border-slate-300 p-3 text-sm space-y-1">
                        {datos!.banco && (
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-600 font-medium">Banco</span>
                                <span className="font-semibold text-slate-800 text-right">{datos!.banco}</span>
                            </div>
                        )}
                        {datos!.titular && (
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-600 font-medium">Titular</span>
                                <span className="font-semibold text-slate-800 text-right">{datos!.titular}</span>
                            </div>
                        )}
                        {datos!.clabe && (
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-600 font-medium">CLABE</span>
                                <span className="font-semibold text-slate-800 text-right tabular-nums">{datos!.clabe}</span>
                            </div>
                        )}
                        {datos!.cuenta && (
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-600 font-medium">Cuenta</span>
                                <span className="font-semibold text-slate-800 text-right tabular-nums">{datos!.cuenta}</span>
                            </div>
                        )}
                        {datos!.tarjeta && (
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-600 font-medium">Tarjeta (OXXO)</span>
                                <span className="font-semibold text-slate-800 text-right tabular-nums">
                                    {datos!.tarjeta.replace(/(.{4})/g, '$1 ').trim()}
                                </span>
                            </div>
                        )}
                    </div>
                    {datos!.instrucciones && (
                        <div className="flex gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={2} />
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{datos!.instrucciones}</p>
                        </div>
                    )}
                </div>
            ) : (
                <p className="text-sm font-medium text-slate-600 rounded-lg bg-slate-100 border border-slate-300 p-3">
                    Aún no hay datos de depósito disponibles. Contacta a soporte.
                </p>
            )}

            {/* 1) Meses que cubre */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">¿Cuántos meses pagas?</label>
                <div className="flex gap-2">
                    {MESES_OPCIONES.map((m) => (
                        <button
                            key={m}
                            data-testid={`chip-meses-${m}`}
                            onClick={() => setMeses(m)}
                            style={meses === m ? { background: GRADIENTE_MARCA } : undefined}
                            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer border-2 ${
                                meses === m
                                    ? 'text-white border-transparent shadow-md'
                                    : 'bg-white text-slate-700 border-slate-300 lg:hover:bg-slate-200'
                            }`}
                        >
                            {m} {m === 1 ? 'mes' : 'meses'}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2) Total a depositar (auto) */}
            <div className="flex items-center justify-between rounded-lg bg-slate-100 border border-slate-300 px-3 py-3">
                <span className="text-sm font-medium text-slate-600">
                    {meses
                        ? usaPrecioAnual
                            ? '12 meses (plan anual · 2 meses gratis)'
                            : `${meses} ${meses === 1 ? 'mes' : 'meses'} × ${formatearMonto(precioMensual)}`
                        : 'Total a depositar'}
                </span>
                <span data-testid="pago-manual-total" className="text-lg font-bold text-slate-900">
                    {meses ? formatearMonto(total) : '—'}
                </span>
            </div>

            {/* 3) Referencia (opcional) */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Referencia (opcional)</label>
                <input
                    data-testid="input-referencia-manual"
                    type="text"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    placeholder="Folio o referencia de la transferencia"
                    className={INPUT_CLASES}
                />
            </div>

            {/* 4) Comprobante */}
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Comprobante</label>
                {imageUrl ? (
                    <div className="flex items-center gap-3">
                        <img src={imageUrl} alt="Comprobante" className="w-16 h-16 rounded-lg object-cover border border-slate-300" />
                        {isUploading ? (
                            <span className="text-sm font-medium text-slate-600 flex items-center gap-1.5">
                                <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" /> Subiendo…
                            </span>
                        ) : (
                            <button
                                data-testid="btn-quitar-comprobante"
                                onClick={reset}
                                className="text-sm font-semibold text-red-600 lg:hover:text-red-700 cursor-pointer"
                            >
                                Quitar
                            </button>
                        )}
                    </div>
                ) : (
                    <label
                        data-testid="input-comprobante"
                        className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 cursor-pointer lg:hover:bg-slate-200"
                    >
                        <Upload className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                        Subir foto del comprobante
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadImage(f);
                            }}
                        />
                    </label>
                )}
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
                <button
                    data-testid="btn-cancelar-pago-manual"
                    onClick={() => {
                        reset();
                        setAbierto(false);
                    }}
                    className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-white text-slate-700 border border-slate-300 lg:hover:bg-slate-200"
                >
                    Cancelar
                </button>
                <button
                    data-testid="btn-enviar-pago-manual"
                    onClick={enviar}
                    disabled={!puedeEnviar}
                    style={puedeEnviar ? { background: GRADIENTE_MARCA } : undefined}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${
                        puedeEnviar ? 'text-white shadow-md cursor-pointer' : 'bg-slate-400 text-white cursor-not-allowed'
                    }`}
                >
                    {enviando ? <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" /> : <Check className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2.5} />}
                    Enviar
                </button>
            </div>
        </div>
    );
}
