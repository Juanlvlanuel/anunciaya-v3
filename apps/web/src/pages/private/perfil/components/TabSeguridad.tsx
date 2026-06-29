/**
 * TabSeguridad.tsx
 * =================
 * Tab "Seguridad" de Mi Perfil (Modo Personal). Dos bloques:
 *
 *  1. Contraseña — cambiar contraseña (PATCH /auth/cambiar-contrasena). Las cuentas
 *     que entraron con Google no tienen contraseña → se muestra un aviso en su lugar.
 *  2. Verificación en dos pasos (2FA) — activar (QR que el backend manda en base64 +
 *     código TOTP → códigos de respaldo) o desactivar (confirmando con código).
 *
 * El estado real de 2FA viene de `usuario.dobleFactorHabilitado` (el backend ya lo
 * proyecta como "confirmado", no como "secreto generado").
 *
 * Ubicación: apps/web/src/pages/private/perfil/components/TabSeguridad.tsx
 */

import { useState } from 'react';
import { AlertTriangle, Check, Copy, Eye, EyeOff, KeyRound, Loader2, Shield, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { ModalAdaptativo } from '@/components/ui/ModalAdaptativo';
import { activar2FA, cambiarContrasena, desactivar2FA, generar2FA } from '@/services/authService';
import notificar from '@/utils/notificaciones';

/** Dark Gradient de Marca (TC-7) — botones de acción primaria. */
const GRADIENTE_MARCA = 'linear-gradient(135deg, #1e293b, #334155)';

const INPUT =
    'w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 focus:outline-none focus:border-blue-500';

const INPUT_BASE =
    'w-full rounded-lg border-2 px-3 py-2 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 focus:outline-none';

/** Clase del input de contraseña según su estado de validación en vivo. */
function inputClase(estado: 'neutro' | 'error' | 'ok'): string {
    const color =
        estado === 'error'
            ? 'border-red-400 focus:border-red-500'
            : estado === 'ok'
              ? 'border-emerald-400 focus:border-emerald-500'
              : 'border-slate-300 focus:border-blue-500';
    return `${INPUT_BASE} ${color}`;
}

/** Requisito de contraseña: check verde si se cumple, punto gris si falta. */
function ReqItem({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            {ok ? (
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
            ) : (
                <span className="w-3.5 h-3.5 inline-flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </span>
            )}
            {label}
        </span>
    );
}

export default function TabSeguridad() {
    const usuario = useAuthStore((s) => s.usuario);
    const recargarDatosUsuario = useAuthStore((s) => s.recargarDatosUsuario);

    // ── Contraseña ──
    const [actual, setActual] = useState('');
    const [nueva, setNueva] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [verPass, setVerPass] = useState(false);
    const [cambiandoPass, setCambiandoPass] = useState(false);
    // Error de la contraseña ACTUAL: no se valida en vivo contra el servidor (sería un
    // oráculo de fuerza bruta); se marca inline tras intentar, cuando el backend la rechaza.
    const [errorActual, setErrorActual] = useState<string | null>(null);

    // ── 2FA ──
    const [fase2fa, setFase2fa] = useState<'idle' | 'mostrarQR' | 'confirmarDesactivar'>('idle');
    const [qrData, setQrData] = useState<{ qrCode: string; secreto: string } | null>(null);
    const [codigo2fa, setCodigo2fa] = useState('');
    const [procesando2fa, setProcesando2fa] = useState(false);
    const [codigosRespaldo, setCodigosRespaldo] = useState<string[] | null>(null);
    const [copiado, setCopiado] = useState(false);

    if (!usuario) return null;

    const esGoogle = usuario.autenticadoPorGoogle === true;
    const dosFactoresActivo = usuario.dobleFactorHabilitado === true;

    // ── Validación en vivo de la contraseña (lado cliente, sin tocar el servidor) ──
    const reqLongitud = nueva.length >= 8;
    const reqMayus = /[A-Z]/.test(nueva);
    const reqMinus = /[a-z]/.test(nueva);
    const reqNumero = /[0-9]/.test(nueva);
    const nuevaValida = reqLongitud && reqMayus && reqMinus && reqNumero;
    const confirmaCoincide = confirmar.length > 0 && nueva === confirmar;
    const nuevaIgualActual = nueva.length > 0 && nueva === actual;
    const puedeCambiar = !!actual && nuevaValida && confirmaCoincide && !nuevaIgualActual && !cambiandoPass;

    // ── Handlers: contraseña ──
    async function cambiarPass() {
        if (!puedeCambiar) return;
        setErrorActual(null);
        setCambiandoPass(true);
        try {
            const res = await cambiarContrasena({ contrasenaActual: actual, nuevaContrasena: nueva });
            if (res.success) {
                notificar.exito('Contraseña actualizada.');
                setActual(''); setNueva(''); setConfirmar('');
            } else {
                // La nueva/confirmar ya se validaron en vivo, así que el único error que
                // puede venir del backend es la contraseña actual incorrecta → inline.
                setErrorActual(res.message || 'La contraseña actual es incorrecta.');
            }
        } catch {
            notificar.error('No se pudo cambiar la contraseña. Intenta de nuevo.');
        } finally {
            setCambiandoPass(false);
        }
    }

    // ── Handlers: 2FA ──
    async function iniciarActivacion() {
        if (procesando2fa) return;
        setProcesando2fa(true);
        try {
            const res = await generar2FA();
            if (res.success && res.data) {
                setQrData(res.data);
                setCodigo2fa('');
                setFase2fa('mostrarQR');
            } else {
                notificar.error(res.message || 'No se pudo iniciar la activación.');
            }
        } catch {
            notificar.error('No se pudo iniciar la activación.');
        } finally {
            setProcesando2fa(false);
        }
    }

    async function confirmarActivacion() {
        if (procesando2fa) return;
        if (codigo2fa.length !== 6) { notificar.error('Ingresa el código de 6 dígitos.'); return; }
        setProcesando2fa(true);
        try {
            const res = await activar2FA(codigo2fa);
            if (res.success && res.data) {
                setCodigosRespaldo(res.data.codigosRespaldo);
                setFase2fa('idle');
                setQrData(null);
                setCodigo2fa('');
                await recargarDatosUsuario();
            } else {
                notificar.error(res.message || 'Código incorrecto.');
            }
        } catch {
            notificar.error('No se pudo activar la verificación.');
        } finally {
            setProcesando2fa(false);
        }
    }

    async function confirmarDesactivacion() {
        if (procesando2fa) return;
        if (codigo2fa.length !== 6) { notificar.error('Ingresa el código de 6 dígitos.'); return; }
        setProcesando2fa(true);
        try {
            const res = await desactivar2FA(codigo2fa);
            if (res.success) {
                notificar.exito('Verificación en dos pasos desactivada.');
                setFase2fa('idle');
                setCodigo2fa('');
                await recargarDatosUsuario();
            } else {
                notificar.error(res.message || 'Código incorrecto.');
            }
        } catch {
            notificar.error('No se pudo desactivar la verificación.');
        } finally {
            setProcesando2fa(false);
        }
    }

    function copiarCodigos() {
        if (!codigosRespaldo) return;
        navigator.clipboard.writeText(codigosRespaldo.join('\n')).then(
            () => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); },
            () => notificar.error('No se pudieron copiar.'),
        );
    }

    return (
        <div data-testid="tab-seguridad" className="space-y-4">
            {/* ════════════ CONTRASEÑA ════════════ */}
            <section className="rounded-xl bg-white border border-slate-300 shadow-sm p-5 lg:p-6">
                <div className="flex items-center gap-2 mb-4">
                    <KeyRound className="w-4 h-4 text-slate-600" strokeWidth={2} />
                    <h2 className="text-sm font-bold text-slate-800">Contraseña</h2>
                </div>

                {esGoogle ? (
                    <div className="flex items-start gap-2.5 rounded-lg bg-slate-100 border border-slate-300 px-3 py-3">
                        <Smartphone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" strokeWidth={2} />
                        <p className="text-sm font-medium text-slate-600">
                            Tu cuenta inicia sesión con Google, así que no tiene una contraseña que cambiar.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Contraseña actual — se valida al intentar (no en cada tecla) */}
                        <div>
                            <label htmlFor="seg-actual" className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña actual</label>
                            <div className="relative">
                                <input
                                    id="seg-actual"
                                    data-testid="input-pass-actual"
                                    type={verPass ? 'text' : 'password'}
                                    value={actual}
                                    onChange={(e) => { setActual(e.target.value); if (errorActual) setErrorActual(null); }}
                                    autoComplete="current-password"
                                    aria-invalid={!!errorActual}
                                    className={`${inputClase(errorActual ? 'error' : 'neutro')} pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setVerPass((v) => !v)}
                                    aria-label={verPass ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 lg:hover:text-slate-700 cursor-pointer"
                                >
                                    {verPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errorActual && (
                                <p data-testid="error-pass-actual" className="text-xs text-red-600 font-medium mt-1">{errorActual}</p>
                            )}
                        </div>

                        {/* Nueva / Confirmar — validación en vivo */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="seg-nueva" className="block text-sm font-semibold text-slate-700 mb-1.5">Nueva contraseña</label>
                                <input
                                    id="seg-nueva"
                                    data-testid="input-pass-nueva"
                                    type={verPass ? 'text' : 'password'}
                                    value={nueva}
                                    onChange={(e) => setNueva(e.target.value)}
                                    autoComplete="new-password"
                                    className={inputClase(nueva ? (nuevaValida ? 'ok' : 'error') : 'neutro')}
                                />
                            </div>
                            <div>
                                <label htmlFor="seg-confirmar" className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar nueva</label>
                                <input
                                    id="seg-confirmar"
                                    data-testid="input-pass-confirmar"
                                    type={verPass ? 'text' : 'password'}
                                    value={confirmar}
                                    onChange={(e) => setConfirmar(e.target.value)}
                                    autoComplete="new-password"
                                    className={inputClase(confirmar ? (confirmaCoincide ? 'ok' : 'error') : 'neutro')}
                                />
                                {confirmar.length > 0 && !confirmaCoincide && (
                                    <p className="text-xs text-red-600 font-medium mt-1">Las contraseñas no coinciden.</p>
                                )}
                            </div>
                        </div>

                        {/* Requisitos en vivo (o guía si aún no escribe) */}
                        {nueva ? (
                            <div data-testid="requisitos-pass" className="flex flex-wrap gap-x-3 gap-y-1">
                                <ReqItem ok={reqLongitud} label="8+ caracteres" />
                                <ReqItem ok={reqMayus} label="1 mayúscula" />
                                <ReqItem ok={reqMinus} label="1 minúscula" />
                                <ReqItem ok={reqNumero} label="1 número" />
                            </div>
                        ) : (
                            <p className="text-xs text-slate-500">Mínimo 8 caracteres, con una mayúscula, una minúscula y un número.</p>
                        )}

                        {nuevaIgualActual && (
                            <p className="text-xs text-amber-600 font-medium">La nueva contraseña debe ser diferente a la actual.</p>
                        )}

                        <div className="flex justify-end pt-1">
                            <button
                                data-testid="btn-cambiar-pass"
                                onClick={cambiarPass}
                                disabled={!puedeCambiar}
                                style={puedeCambiar ? { background: GRADIENTE_MARCA } : undefined}
                                className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold ${
                                    puedeCambiar ? 'text-white shadow-md cursor-pointer' : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                }`}
                            >
                                {cambiandoPass && <Loader2 className="w-4 h-4 animate-spin" />}
                                Cambiar contraseña
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* ════════════ 2FA ════════════ */}
            <section className="rounded-xl bg-white border border-slate-300 shadow-sm p-5 lg:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        {dosFactoresActivo ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" strokeWidth={2} />
                        ) : (
                            <Shield className="w-4 h-4 text-slate-600 shrink-0" strokeWidth={2} />
                        )}
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-800">Verificación en dos pasos</h2>
                            <p className="text-xs text-slate-600 mt-0.5">
                                Pide un código de tu app de autenticación al iniciar sesión.
                            </p>
                        </div>
                    </div>
                    <span
                        data-testid="estado-2fa"
                        className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-semibold ${
                            dosFactoresActivo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                        {dosFactoresActivo ? 'Activada' : 'Desactivada'}
                    </span>
                </div>

                <div className="mt-4">
                    {/* Estado activo → botón desactivar / confirmación */}
                    {dosFactoresActivo && fase2fa !== 'confirmarDesactivar' && (
                        <button
                            data-testid="btn-desactivar-2fa"
                            onClick={() => { setCodigo2fa(''); setFase2fa('confirmarDesactivar'); }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-white text-red-600 border border-slate-300 lg:hover:bg-red-50"
                        >
                            Desactivar
                        </button>
                    )}

                    {/* Confirmar desactivación */}
                    {dosFactoresActivo && fase2fa === 'confirmarDesactivar' && (
                        <div data-testid="form-desactivar-2fa" className="rounded-lg bg-slate-100 border border-slate-300 p-4 space-y-3">
                            <p className="text-sm font-medium text-slate-700">
                                Ingresa un código de tu app de autenticación para confirmar.
                            </p>
                            <input
                                data-testid="input-codigo-2fa"
                                type="text"
                                inputMode="numeric"
                                value={codigo2fa}
                                onChange={(e) => setCodigo2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className={`${INPUT} max-w-[160px] tracking-[0.3em] text-center font-bold`}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setFase2fa('idle'); setCodigo2fa(''); }}
                                    disabled={procesando2fa}
                                    className="flex-1 lg:flex-none rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-white text-slate-700 border border-slate-300 lg:hover:bg-slate-200 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>
                                <button
                                    data-testid="btn-confirmar-desactivar-2fa"
                                    onClick={confirmarDesactivacion}
                                    disabled={procesando2fa || codigo2fa.length !== 6}
                                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-red-600 text-white lg:hover:bg-red-700 disabled:opacity-60 disabled:cursor-default"
                                >
                                    {procesando2fa && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Desactivar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Estado inactivo → botón activar */}
                    {!dosFactoresActivo && fase2fa !== 'mostrarQR' && (
                        <button
                            data-testid="btn-activar-2fa"
                            onClick={iniciarActivacion}
                            disabled={procesando2fa}
                            style={!procesando2fa ? { background: GRADIENTE_MARCA } : undefined}
                            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-default"
                        >
                            {procesando2fa ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" strokeWidth={2} />}
                            Activar
                        </button>
                    )}

                    {/* Activación: QR + código */}
                    {!dosFactoresActivo && fase2fa === 'mostrarQR' && qrData && (
                        <div data-testid="form-activar-2fa" className="rounded-lg bg-slate-100 border border-slate-300 p-4 space-y-4">
                            <ol className="text-sm font-medium text-slate-700 space-y-1 list-decimal list-inside">
                                <li>Escanea el código QR con Google Authenticator, Authy o similar.</li>
                                <li>Ingresa el código de 6 dígitos que te muestra la app.</li>
                            </ol>
                            <div className="flex flex-col lg:flex-row items-center gap-4">
                                <img
                                    src={qrData.qrCode}
                                    alt="Código QR para 2FA"
                                    className="w-40 h-40 rounded-lg border border-slate-300 bg-white shrink-0"
                                />
                                <div className="flex-1 min-w-0 w-full">
                                    <p className="text-xs text-slate-600 mb-1">¿No puedes escanear? Captura este código en tu app:</p>
                                    <code className="block break-all rounded bg-white border border-slate-300 px-2 py-1.5 text-xs font-mono text-slate-800 mb-3">
                                        {qrData.secreto}
                                    </code>
                                    <input
                                        data-testid="input-codigo-2fa"
                                        type="text"
                                        inputMode="numeric"
                                        value={codigo2fa}
                                        onChange={(e) => setCodigo2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        className={`${INPUT} max-w-[180px] tracking-[0.3em] text-center font-bold`}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => { setFase2fa('idle'); setQrData(null); setCodigo2fa(''); }}
                                    disabled={procesando2fa}
                                    className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-white text-slate-700 border border-slate-300 lg:hover:bg-slate-200 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>
                                <button
                                    data-testid="btn-confirmar-activar-2fa"
                                    onClick={confirmarActivacion}
                                    disabled={procesando2fa || codigo2fa.length !== 6}
                                    style={!procesando2fa && codigo2fa.length === 6 ? { background: GRADIENTE_MARCA } : undefined}
                                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                                        !procesando2fa && codigo2fa.length === 6
                                            ? 'text-white shadow-md cursor-pointer'
                                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    {procesando2fa && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Activar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Modal: códigos de respaldo tras activar 2FA */}
            <ModalAdaptativo
                abierto={codigosRespaldo !== null}
                onCerrar={() => setCodigosRespaldo(null)}
                titulo="Guarda tus códigos de respaldo"
                iconoTitulo={<ShieldCheck className="w-5 h-5 text-emerald-600" strokeWidth={2} />}
                ancho="md"
            >
                <div data-testid="modal-codigos-respaldo" className="space-y-4">
                    <div className="flex items-start gap-2.5 rounded-lg bg-amber-100 border border-amber-300 px-3 py-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" strokeWidth={2} />
                        <p className="text-sm font-medium text-amber-900">
                            Si pierdes tu teléfono, estos códigos son la única forma de entrar. Guárdalos en un
                            lugar seguro; cada uno sirve una sola vez.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {(codigosRespaldo ?? []).map((c) => (
                            <code key={c} className="rounded bg-slate-100 border border-slate-300 px-2 py-1.5 text-sm font-mono font-semibold text-slate-800 text-center tracking-wider">
                                {c}
                            </code>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            data-testid="btn-copiar-codigos"
                            onClick={copiarCodigos}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-white text-slate-700 border border-slate-300 lg:hover:bg-slate-200"
                        >
                            {copiado ? <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} /> : <Copy className="w-4 h-4" strokeWidth={2} />}
                            {copiado ? 'Copiados' : 'Copiar'}
                        </button>
                        <button
                            data-testid="btn-cerrar-codigos"
                            onClick={() => setCodigosRespaldo(null)}
                            style={{ background: GRADIENTE_MARCA }}
                            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer text-white shadow-md"
                        >
                            Ya los guardé
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>
        </div>
    );
}
