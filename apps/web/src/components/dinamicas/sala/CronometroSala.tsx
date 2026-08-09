/**
 * CronometroSala.tsx
 * ====================
 * Sala de espera — cuenta regresiva grande hasta `objetivo` (ISO) +
 * información del premio, mientras no llega la hora de iniciar el sorteo.
 * Tratamiento "escenario en vivo": fondo negro + glow ámbar + patrón de
 * rejilla + líneas de acento (mismo lenguaje visual que el header dark de
 * `PaginaSalaDinamica.tsx`) en vez de un card claro plano — para que se
 * sienta como el evento que es, no como un formulario más.
 *
 * Al llegar la hora, avisa vía `onLlegoLaHora` (el organizador ve
 * habilitarse el botón "Iniciar sorteo", inyectado por el caller vía
 * `children` — este componente no sabe de permisos, solo del tiempo).
 *
 * Ubicación: apps/web/src/components/dinamicas/sala/CronometroSala.tsx
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Clock, Dices, ImageOff, Ticket, Users } from 'lucide-react';

interface CronometroSalaProps {
    objetivo: string;
    onLlegoLaHora?: () => void;
    /** Info del premio — opcional, si no se pasa el card queda solo con la
     *  cuenta regresiva (compatibilidad hacia atrás). */
    tituloRifa?: string;
    portadaUrl?: string | null;
    boletosPagados?: number;
    numeroTotalBoletos?: number | null;
    /** Cuántos hay conectados a la sala AHORA (presencia en vivo). */
    conectados?: number;
    /** Botón "Iniciar sorteo" u otra acción del organizador. */
    children?: ReactNode;
}

function calcularRestante(objetivo: string): { total: number; dias: number; horas: number; minutos: number; segundos: number } {
    const total = Math.max(0, new Date(objetivo).getTime() - Date.now());
    const dias = Math.floor(total / (24 * 60 * 60 * 1000));
    const horas = Math.floor((total / (60 * 60 * 1000)) % 24);
    const minutos = Math.floor((total / (60 * 1000)) % 60);
    const segundos = Math.floor((total / 1000) % 60);
    return { total, dias, horas, minutos, segundos };
}

function DigitoTiempo({ valor, etiqueta, latido }: { valor: number; etiqueta: string; latido?: boolean }) {
    return (
        <div
            className="flex min-w-[68px] flex-col items-center gap-1 rounded-xl border border-amber-500/40 bg-white/5 px-3 py-2.5 lg:min-w-24 lg:px-4 lg:py-3.5"
            style={latido ? { animation: 'cronometroLatido 1s ease-in-out infinite' } : undefined}
        >
            <span
                className="text-3xl font-extrabold tabular-nums text-amber-400 lg:text-5xl"
                style={{ textShadow: '0 0 18px rgba(245,158,11,0.45)' }}
            >
                {String(valor).padStart(2, '0')}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{etiqueta}</span>
        </div>
    );
}

export function CronometroSala({
    objetivo,
    onLlegoLaHora,
    tituloRifa,
    portadaUrl,
    boletosPagados,
    numeroTotalBoletos,
    conectados,
    children,
}: CronometroSalaProps) {
    const [restante, setRestante] = useState(() => calcularRestante(objetivo));

    useEffect(() => {
        const avisado = { current: false };
        const intervalo = setInterval(() => {
            const r = calcularRestante(objetivo);
            setRestante(r);
            if (r.total === 0 && !avisado.current) {
                avisado.current = true;
                onLlegoLaHora?.();
            }
        }, 1000);
        return () => clearInterval(intervalo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objetivo]);

    const yaEsHora = restante.total === 0;

    return (
        <div className="relative overflow-hidden rounded-2xl text-center" style={{ background: '#000000' }}>
            {/* Glow + rejilla — calcado del header dark de PaginaSalaDinamica.tsx,
                para que la sala de espera se sienta parte del mismo "escenario". */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.16) 0%, transparent 60%)' }}
            />
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    opacity: 0.06,
                    backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                      repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                }}
            />
            <div
                className="pointer-events-none absolute top-0 left-0 right-0 h-[3px]"
                style={{ background: 'linear-gradient(90deg, transparent, #f59e0b 40%, #fbbf24 60%, transparent)' }}
            />
            <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px]"
                style={{ background: 'linear-gradient(90deg, transparent, #f59e0b 40%, #fbbf24 60%, transparent)' }}
            />

            <div className="relative z-10 px-5 py-7">
                {/* Premio */}
                {tituloRifa && (
                    <div className="mb-5 flex flex-col items-center gap-2.5">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                            {portadaUrl ? (
                                <img src={portadaUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-slate-800 text-slate-500">
                                    <ImageOff className="h-6 w-6" strokeWidth={1.5} />
                                </div>
                            )}
                        </div>
                        <p className="max-w-xs text-base font-bold leading-snug text-white">{tituloRifa}</p>
                    </div>
                )}

                <div className="mb-3 flex items-center justify-center gap-1.5">
                    <Dices
                        className="h-4 w-4 text-amber-400"
                        strokeWidth={2.5}
                        style={yaEsHora ? undefined : { animation: 'tombolaGiro 4s linear infinite' }}
                    />
                    <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                        {yaEsHora ? 'Ya es hora del sorteo' : 'La sala empieza en'}
                    </span>
                </div>

                {!yaEsHora ? (
                    <div className="mb-5 flex items-center justify-center gap-2 lg:gap-3">
                        {restante.dias > 0 && <DigitoTiempo valor={restante.dias} etiqueta="días" />}
                        {(restante.dias > 0 || restante.horas > 0) && <DigitoTiempo valor={restante.horas} etiqueta="hrs" />}
                        <DigitoTiempo valor={restante.minutos} etiqueta="min" />
                        <DigitoTiempo valor={restante.segundos} etiqueta="seg" latido />
                    </div>
                ) : (
                    <div className="mb-5 flex items-center justify-center gap-1.5 text-amber-400">
                        <Clock className="h-5 w-5" strokeWidth={2.5} />
                        <span className="text-lg font-extrabold">Puede empezar en cualquier momento</span>
                    </div>
                )}

                {(boletosPagados !== undefined || conectados !== undefined) && (
                    <div className="mb-1 flex items-center justify-center gap-4 text-sm font-semibold text-white/70">
                        {boletosPagados !== undefined && (
                            <span className="flex items-center gap-1.5">
                                <Ticket className="h-4 w-4 text-amber-400" strokeWidth={2} />
                                {boletosPagados}
                                {numeroTotalBoletos ? `/${numeroTotalBoletos}` : ''} vendidos
                            </span>
                        )}
                        {conectados !== undefined && conectados > 0 && (
                            <span className="flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-emerald-400" strokeWidth={2} />
                                {conectados} en la sala
                            </span>
                        )}
                    </div>
                )}

                {children && <div className="mt-4 flex justify-center">{children}</div>}
            </div>
        </div>
    );
}

export default CronometroSala;
