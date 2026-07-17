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
import { AlertTriangle, Bell, Check, Copy, Eye, EyeOff, KeyRound, Loader2, LogOut, Mail, Shield, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
// Logo de marca: lucide no incluye el Google multicolor, así que viene de Iconify.
import { Icon } from '@iconify/react';
import { ICONOS_REMOTOS } from '@/config/iconos';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePushNotificaciones } from '@/hooks/usePushNotificaciones';
import { ModalAdaptativo } from '@/components/ui/ModalAdaptativo';
import { InputCorreoValidado, type ResultadoValidacionCorreo } from '@/components/ui/InputCorreoValidado';
import { activar2FA, cambiarContrasena, confirmarCambioCorreo, desactivar2FA, eliminarCuenta, establecerContrasena, generar2FA, logoutTodos, solicitarCambioCorreo, vincularGoogle } from '@/services/authService';
import notificar from '@/utils/notificaciones';

/** Dark Gradient de Marca (TC-7) — botones de acción primaria. */
const GRADIENTE_MARCA = 'linear-gradient(135deg, #1e293b, #334155)';

const INPUT =
    'w-full rounded-lg border-2 border-slate-300 px-3 h-11 lg:h-10 2xl:h-11 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 transition-colors focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-300';

const INPUT_BASE =
    'w-full rounded-lg border-2 px-3 h-11 lg:h-10 2xl:h-11 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 transition-colors focus:outline-none';

/** Clase del input de contraseña según su estado de validación en vivo. */
function inputClase(estado: 'neutro' | 'error' | 'ok'): string {
    const color =
        estado === 'error'
            ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200'
            : estado === 'ok'
              ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
              : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-300';
    return `${INPUT_BASE} ${color}`;
}

/** Requisito de contraseña: check verde si se cumple, punto gris si falta. */
function ReqItem({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm font-medium ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
            {ok ? (
                <Check className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
            ) : (
                <span className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 inline-flex items-center justify-center">
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
    const logout = useAuthStore((s) => s.logout);

    // ── Notificaciones push (este dispositivo) ──
    const push = usePushNotificaciones();

    // ── Contraseña ──
    const [actual, setActual] = useState('');
    const [nueva, setNueva] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [verActual, setVerActual] = useState(false);
    const [verNueva, setVerNueva] = useState(false);
    const [verConfirmar, setVerConfirmar] = useState(false);
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

    // ── Cambiar correo ──
    const [faseCorreo, setFaseCorreo] = useState<'idle' | 'pedir' | 'codigo'>('idle');
    const [nuevoCorreo, setNuevoCorreo] = useState('');
    // Validez del nuevo correo (formato + unicidad en AY), reportada por InputCorreoValidado.
    const [correoNuevoValido, setCorreoNuevoValido] = useState(false);
    const [codigoCorreo, setCodigoCorreo] = useState('');
    const [procesandoCorreo, setProcesandoCorreo] = useState(false);

    // ── Sesiones ──
    const [confirmarCerrarSesiones, setConfirmarCerrarSesiones] = useState(false);
    const [cerrandoSesiones, setCerrandoSesiones] = useState(false);

    // ── Eliminar cuenta ──
    const [confirmarEliminar, setConfirmarEliminar] = useState(false);
    const [contrasenaEliminar, setContrasenaEliminar] = useState('');
    const [correoConfirmEliminar, setCorreoConfirmEliminar] = useState('');
    const [eliminandoCuenta, setEliminandoCuenta] = useState(false);

    // ── Vincular Google ──
    const [vinculandoGoogle, setVinculandoGoogle] = useState(false);

    async function manejarVincularGoogle(code: string) {
        if (vinculandoGoogle) return;
        setVinculandoGoogle(true);
        try {
            const res = await vincularGoogle(code);
            if (res.success) {
                notificar.exito(res.message || 'Cuenta vinculada con Google.');
                await recargarDatosUsuario();
            } else {
                notificar.error(res.message || 'No se pudo vincular con Google.');
            }
        } catch {
            notificar.error('No se pudo vincular con Google.');
        } finally {
            setVinculandoGoogle(false);
        }
    }

    // El hook de Google va ANTES del return condicional (regla de hooks).
    const iniciarVincularGoogle = useGoogleLogin({
        flow: 'auth-code',
        scope: 'openid email profile',
        onSuccess: (resp) => manejarVincularGoogle(resp.code),
        onError: () => notificar.error('No se pudo conectar con Google. Inténtalo de nuevo.'),
    });

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
    // ¿La cuenta ya tiene contraseña? Si no (típicamente Google), el flujo es CREARLA (sin pedir la
    // actual, que no existe). Fallback por si el dato aún no llegó del backend: asumir que tiene salvo Google.
    const tieneContrasena = usuario.tieneContrasena ?? !esGoogle;
    const modoCrear = !tieneContrasena;
    const puedeGuardar =
        nuevaValida && confirmaCoincide && !cambiandoPass && (modoCrear || (!!actual && !nuevaIgualActual));

    // ── Handlers: contraseña (crear si no tiene; cambiar si ya tiene) ──
    async function guardarContrasena() {
        if (!puedeGuardar) return;
        setErrorActual(null);
        setCambiandoPass(true);
        try {
            const res = modoCrear
                ? await establecerContrasena({ nuevaContrasena: nueva })
                : await cambiarContrasena({ contrasenaActual: actual, nuevaContrasena: nueva });
            if (res.success) {
                notificar.exito(modoCrear ? 'Contraseña creada.' : 'Contraseña actualizada.');
                setActual(''); setNueva(''); setConfirmar('');
                // Al crearla, la cuenta pasa a "tener contraseña" → recargar para que el form cambie a "Cambiar".
                if (modoCrear) await recargarDatosUsuario();
            } else if (modoCrear) {
                notificar.error(res.message || 'No se pudo crear la contraseña.');
            } else {
                // En "cambiar", la nueva/confirmar ya se validaron en vivo, así que el error que
                // puede venir del backend es la contraseña actual incorrecta → inline.
                setErrorActual(res.message || 'La contraseña actual es incorrecta.');
            }
        } catch {
            notificar.error('No se pudo guardar la contraseña. Intenta de nuevo.');
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

    // ── Handler: cerrar sesión en TODOS los dispositivos (incluido este) ──
    async function cerrarTodasLasSesiones() {
        if (cerrandoSesiones) return;
        setCerrandoSesiones(true);
        try {
            const res = await logoutTodos();
            if (res.success) {
                notificar.exito('Cerraste sesión en todos tus dispositivos.');
                logout('manual'); // la sesión de ESTE dispositivo también se invalidó → salir y redirigir
            } else {
                notificar.error(res.message || 'No se pudieron cerrar las sesiones.');
                setCerrandoSesiones(false);
            }
        } catch {
            notificar.error('No se pudieron cerrar las sesiones.');
            setCerrandoSesiones(false);
        }
        // En éxito, logout() desmonta y redirige; no reseteamos cerrandoSesiones.
    }

    // ── Handlers: cambiar correo ──
    async function enviarCodigoCorreo() {
        if (procesandoCorreo) return;
        const correo = nuevoCorreo.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { notificar.error('Escribe un correo válido.'); return; }
        if (correo === (usuario?.correo ?? '').toLowerCase()) { notificar.error('Ese ya es tu correo actual.'); return; }
        setProcesandoCorreo(true);
        try {
            const res = await solicitarCambioCorreo(correo);
            if (res.success) {
                notificar.exito(res.message || 'Te enviamos un código a tu nuevo correo.');
                setCodigoCorreo('');
                setFaseCorreo('codigo');
            } else {
                notificar.error(res.message || 'No se pudo enviar el código.');
            }
        } catch {
            notificar.error('No se pudo enviar el código.');
        } finally {
            setProcesandoCorreo(false);
        }
    }

    async function confirmarCorreo() {
        if (procesandoCorreo) return;
        if (codigoCorreo.length !== 6) { notificar.error('Ingresa el código de 6 dígitos.'); return; }
        setProcesandoCorreo(true);
        try {
            const res = await confirmarCambioCorreo(codigoCorreo);
            if (res.success) {
                notificar.exito('Tu correo se actualizó.');
                setFaseCorreo('idle');
                setNuevoCorreo('');
                setCorreoNuevoValido(false);
                setCodigoCorreo('');
                await recargarDatosUsuario();
            } else {
                notificar.error(res.message || 'Código incorrecto.');
            }
        } catch {
            notificar.error('No se pudo cambiar el correo.');
        } finally {
            setProcesandoCorreo(false);
        }
    }

    function cancelarCambioCorreo() {
        setFaseCorreo('idle');
        setNuevoCorreo('');
        setCorreoNuevoValido(false);
        setCodigoCorreo('');
    }

    // ── Handler: eliminar cuenta (soft-delete) ──
    async function eliminarMiCuenta() {
        if (eliminandoCuenta) return;
        // Confirmación: contraseña si la tiene; si no (Google), escribir el correo exacto.
        if (tieneContrasena) {
            if (!contrasenaEliminar) { notificar.error('Ingresa tu contraseña para confirmar.'); return; }
        } else if (correoConfirmEliminar.trim().toLowerCase() !== (usuario?.correo ?? '').toLowerCase()) {
            notificar.error('Escribe tu correo exactamente para confirmar.');
            return;
        }
        setEliminandoCuenta(true);
        try {
            const res = await eliminarCuenta(tieneContrasena ? contrasenaEliminar : undefined);
            if (res.success) {
                notificar.exito('Tu cuenta se eliminó.');
                logout('manual'); // el backend ya cerró las sesiones → salir y redirigir
            } else {
                notificar.error(res.message || 'No se pudo eliminar la cuenta.');
                setEliminandoCuenta(false);
            }
        } catch {
            notificar.error('No se pudo eliminar la cuenta.');
            setEliminandoCuenta(false);
        }
    }

    return (
        <div data-testid="tab-seguridad">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:items-start">

            {/* ── Columna izquierda: Contraseña + Correo ── */}
            <div className="space-y-3">
            {/* ════════════ CONTRASEÑA ════════════ */}
            <section className="rounded-xl bg-white border border-slate-300 shadow-sm p-4 lg:p-5">
                <div className="flex items-center gap-2 mb-3">
                    <KeyRound className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-600" strokeWidth={2} />
                    <h2 className="text-sm font-bold text-slate-800">Contraseña</h2>
                </div>

                <div className="space-y-3">
                    {modoCrear && (
                        <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2.5">
                            <Smartphone className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600 shrink-0 mt-0.5" strokeWidth={2} />
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                                Tu cuenta entra con Google. Crea una contraseña para entrar también con tu correo.
                            </p>
                        </div>
                    )}

                    {/* Contraseña actual — solo si la cuenta ya tiene una. Se valida al intentar (no en cada tecla). */}
                    {!modoCrear && (
                        <div>
                            <label htmlFor="seg-actual" className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña actual</label>
                            <div className="relative">
                                <input
                                    id="seg-actual"
                                    data-testid="input-pass-actual"
                                    type={verActual ? 'text' : 'password'}
                                    value={actual}
                                    onChange={(e) => { setActual(e.target.value); if (errorActual) setErrorActual(null); }}
                                    autoComplete="current-password"
                                    aria-invalid={!!errorActual}
                                    className={`${inputClase(errorActual ? 'error' : 'neutro')} pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setVerActual((v) => !v)}
                                    aria-label={verActual ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 lg:hover:text-slate-700 cursor-pointer"
                                >
                                    {verActual ? <EyeOff className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" /> : <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />}
                                </button>
                            </div>
                            {errorActual && (
                                <p data-testid="error-pass-actual" className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-medium mt-1">{errorActual}</p>
                            )}
                        </div>
                    )}

                    {/* Nueva / Confirmar — validación en vivo */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="seg-nueva" className="block text-sm font-semibold text-slate-700 mb-1.5">{modoCrear ? 'Contraseña' : 'Nueva contraseña'}</label>
                            <div className="relative">
                                <input
                                    id="seg-nueva"
                                    data-testid="input-pass-nueva"
                                    type={verNueva ? 'text' : 'password'}
                                    value={nueva}
                                    onChange={(e) => setNueva(e.target.value)}
                                    autoComplete="new-password"
                                    className={`${inputClase(nueva ? (nuevaValida ? 'ok' : 'error') : 'neutro')} pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setVerNueva((v) => !v)}
                                    aria-label={verNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 lg:hover:text-slate-700 cursor-pointer"
                                >
                                    {verNueva ? <EyeOff className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" /> : <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="seg-confirmar" className="block text-sm font-semibold text-slate-700 mb-1.5">{modoCrear ? 'Confirmar contraseña' : 'Confirmar nueva'}</label>
                            <div className="relative">
                                <input
                                    id="seg-confirmar"
                                    data-testid="input-pass-confirmar"
                                    type={verConfirmar ? 'text' : 'password'}
                                    value={confirmar}
                                    onChange={(e) => setConfirmar(e.target.value)}
                                    autoComplete="new-password"
                                    className={`${inputClase(confirmar ? (confirmaCoincide ? 'ok' : 'error') : 'neutro')} pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setVerConfirmar((v) => !v)}
                                    aria-label={verConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 lg:hover:text-slate-700 cursor-pointer"
                                >
                                    {verConfirmar ? <EyeOff className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" /> : <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />}
                                </button>
                            </div>
                            {confirmar.length > 0 && !confirmaCoincide && (
                                <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-medium mt-1">Las contraseñas no coinciden.</p>
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
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500">Mínimo 8 caracteres, con una mayúscula, una minúscula y un número.</p>
                    )}

                    {!modoCrear && nuevaIgualActual && (
                        <p className="text-sm lg:text-[11px] 2xl:text-sm text-amber-600 font-medium">La nueva contraseña debe ser diferente a la actual.</p>
                    )}

                    <div className="flex justify-end pt-1">
                        <button
                            data-testid="btn-cambiar-pass"
                            onClick={guardarContrasena}
                            disabled={!puedeGuardar}
                            style={{ background: GRADIENTE_MARCA }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {cambiandoPass && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                            {modoCrear ? 'Crear contraseña' : 'Cambiar contraseña'}
                        </button>
                    </div>
                </div>
            </section>

            {/* ════════════ CORREO ════════════ */}
            <section className="rounded-xl bg-white border border-slate-300 shadow-sm p-4 lg:p-5">
                <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-600" strokeWidth={2} />
                    <h2 className="text-sm font-bold text-slate-800">Correo electrónico</h2>
                </div>

                {faseCorreo === 'idle' && (
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500">
                            Tu correo actual es <span className="font-semibold text-slate-700">{usuario.correo}</span>
                        </p>
                        <button
                            data-testid="btn-cambiar-correo"
                            onClick={() => { setNuevoCorreo(''); setCorreoNuevoValido(false); setFaseCorreo('pedir'); }}
                            style={{ background: GRADIENTE_MARCA }}
                            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer text-white shadow-md"
                        >
                            Cambiar correo
                        </button>
                    </div>
                )}

                {faseCorreo === 'pedir' && (
                    <div className="space-y-3">
                        <div>
                            <InputCorreoValidado
                                value={nuevoCorreo}
                                onChange={setNuevoCorreo}
                                onValidezCambio={(r: ResultadoValidacionCorreo) => setCorreoNuevoValido(r.valido)}
                                modo="registro"
                                label="Nuevo correo"
                                placeholder="tucorreo@ejemplo.com"
                                correosExcluidos={usuario?.correo ? [usuario.correo] : []}
                                mensajeExclusion="Ese ya es tu correo actual"
                                mensajeDisponible="Correo disponible"
                                claseAlto="h-11 lg:h-10 2xl:h-11"
                                claseTexto="text-base lg:text-sm 2xl:text-base"
                                testIdPrefix="nuevo-correo"
                                disabled={procesandoCorreo}
                            />
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500 mt-1">Te enviaremos un código de verificación a este correo.</p>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={cancelarCambioCorreo}
                                disabled={procesandoCorreo}
                                className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-slate-200 text-slate-700 border border-slate-300 lg:hover:bg-slate-300 disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                data-testid="btn-enviar-codigo-correo"
                                onClick={enviarCodigoCorreo}
                                disabled={procesandoCorreo || !correoNuevoValido}
                                style={{ background: GRADIENTE_MARCA }}
                                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {procesandoCorreo && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                                Enviar código
                            </button>
                        </div>
                    </div>
                )}

                {faseCorreo === 'codigo' && (
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-slate-600">
                            Ingresa el código de 6 dígitos que enviamos a <span className="font-semibold text-slate-800">{nuevoCorreo.trim().toLowerCase()}</span>.
                        </p>
                        <input
                            data-testid="input-codigo-correo"
                            type="text"
                            inputMode="numeric"
                            value={codigoCorreo}
                            onChange={(e) => setCodigoCorreo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className={`${inputClase('neutro')} max-w-[180px] tracking-[0.3em] text-center font-bold`}
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={cancelarCambioCorreo}
                                disabled={procesandoCorreo}
                                className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-slate-200 text-slate-700 border border-slate-300 lg:hover:bg-slate-300 disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                data-testid="btn-confirmar-correo"
                                onClick={confirmarCorreo}
                                disabled={procesandoCorreo || codigoCorreo.length !== 6}
                                style={{ background: GRADIENTE_MARCA }}
                                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {procesandoCorreo && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                                Cambiar correo
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* ════════════ GOOGLE ════════════ */}
            <section className="rounded-xl bg-white border border-slate-300 shadow-sm p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <Icon icon={ICONOS_REMOTOS.google} className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 shrink-0" />
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-800">Inicio de sesión con Google</h2>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500 mt-0.5">
                                Entra a AnunciaYA con tu cuenta de Google.
                            </p>
                        </div>
                    </div>
                    <span
                        data-testid="estado-google"
                        className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-semibold ${
                            esGoogle ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                        }`}
                    >
                        {esGoogle ? 'Vinculado' : 'No vinculado'}
                    </span>
                </div>

                <div className="mt-3">
                    {esGoogle ? (
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500">
                            Vinculada a <span className="font-semibold text-slate-700">{usuario.correo}</span>
                        </p>
                    ) : (
                        <button
                            data-testid="btn-vincular-google"
                            onClick={() => iniciarVincularGoogle()}
                            disabled={vinculandoGoogle}
                            style={{ background: GRADIENTE_MARCA }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer text-white shadow-md disabled:opacity-60 disabled:cursor-default"
                        >
                            {vinculandoGoogle ? <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" /> : <Icon icon={ICONOS_REMOTOS.google} className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />}
                            Vincular Google
                        </button>
                    )}
                </div>
            </section>
            </div>

            {/* ── Columna derecha: Notificaciones · 2FA · Sesiones · Eliminar cuenta ── */}
            <div className="space-y-3">
            {/* ════════════ NOTIFICACIONES ════════════ */}
            <section className="rounded-xl bg-white border border-slate-300 shadow-sm p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        <Bell className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-600 shrink-0" strokeWidth={2} />
                        <h2 className="text-sm font-bold text-slate-800 min-w-0">Notificaciones en este dispositivo</h2>
                    </div>
                    {/* Toggle switch (deshabilitado si no hay soporte o el permiso está bloqueado) */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={push.activo}
                        data-testid="toggle-push"
                        onClick={push.alternar}
                        disabled={push.cargando || !push.soportado || push.permisoBloqueado}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${push.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                        {push.cargando ? (
                            <Loader2 className="w-4 h-4 mx-auto animate-spin text-white" />
                        ) : (
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${push.activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        )}
                    </button>
                </div>

                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500 mt-2">
                    Recibe un aviso cuando te escriben por ChatYA, aunque tengas la app cerrada.
                </p>

                {/* Avisos de estado según soporte / permiso */}
                {!push.soportado && (
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500 mt-2">
                        Este navegador no admite notificaciones. En iPhone, primero instala la app en tu pantalla de inicio.
                    </p>
                )}
                {push.soportado && push.permisoBloqueado && (
                    <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 mt-2">
                        <AlertTriangle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2} />
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
                            Bloqueaste las notificaciones para AnunciaYA. Actívalas desde los ajustes del navegador para este sitio.
                        </p>
                    </div>
                )}
            </section>

            {/* ════════════ 2FA ════════════ */}
            <section className="rounded-xl bg-white border border-slate-300 shadow-sm p-4 lg:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                        {dosFactoresActivo ? (
                            <ShieldCheck className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-emerald-600 shrink-0" strokeWidth={2} />
                        ) : (
                            <Shield className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-600 shrink-0" strokeWidth={2} />
                        )}
                        <h2 className="text-sm font-bold text-slate-800 min-w-0">Verificación en dos pasos</h2>
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

                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500 mt-2">
                    Pide un código de tu app de autenticación al iniciar sesión.
                </p>

                <div className="mt-3">
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
                                    className="flex-1 lg:flex-none rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-slate-200 text-slate-700 border border-slate-300 lg:hover:bg-slate-300 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>
                                <button
                                    data-testid="btn-confirmar-desactivar-2fa"
                                    onClick={confirmarDesactivacion}
                                    disabled={procesando2fa || codigo2fa.length !== 6}
                                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-red-600 text-white lg:hover:bg-red-700 disabled:opacity-60 disabled:cursor-default"
                                >
                                    {procesando2fa && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
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
                            {procesando2fa ? <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" /> : <Shield className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />}
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
                                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mb-1">¿No puedes escanear? Captura este código en tu app:</p>
                                    <code className="block break-all rounded bg-white border border-slate-300 px-2 py-1.5 text-sm lg:text-[11px] 2xl:text-sm font-mono font-medium text-slate-800 mb-3">
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
                                    className="rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-slate-200 text-slate-700 border border-slate-300 lg:hover:bg-slate-300 disabled:opacity-60"
                                >
                                    Cancelar
                                </button>
                                <button
                                    data-testid="btn-confirmar-activar-2fa"
                                    onClick={confirmarActivacion}
                                    disabled={procesando2fa || codigo2fa.length !== 6}
                                    style={{ background: GRADIENTE_MARCA }}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {procesando2fa && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                                    Activar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ════════════ SESIONES ════════════ */}
            <section className="rounded-xl bg-white border border-slate-300 shadow-sm p-4 lg:p-5">
                <div className="flex items-center gap-2 mb-2">
                    <LogOut className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-600" strokeWidth={2} />
                    <h2 className="text-sm font-bold text-slate-800">Sesiones</h2>
                </div>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500 mb-3">
                    Cierra la sesión en todos tus dispositivos. Tendrás que volver a entrar.
                </p>
                <button
                    data-testid="btn-cerrar-todas-sesiones"
                    onClick={() => setConfirmarCerrarSesiones(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-white text-red-600 border border-red-300 lg:hover:bg-red-50"
                >
                    <LogOut className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                    Cerrar sesión en todos los dispositivos
                </button>
            </section>

            {/* ════════════ ELIMINAR CUENTA ════════════ */}
            <section className="rounded-xl bg-white border border-red-200 shadow-sm p-4 lg:p-5">
                <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-red-600" strokeWidth={2} />
                    <h2 className="text-sm font-bold text-slate-800">Eliminar cuenta</h2>
                </div>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-500 mb-3">
                    Tu cuenta se desactivará y no podrás iniciar sesión. Reversible por soporte un tiempo.
                </p>
                <button
                    data-testid="btn-eliminar-cuenta"
                    onClick={() => { setContrasenaEliminar(''); setCorreoConfirmEliminar(''); setConfirmarEliminar(true); }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer bg-white text-red-600 border border-red-300 lg:hover:bg-red-50"
                >
                    <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
                    Eliminar mi cuenta
                </button>
            </section>
            </div>
            </div>

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
                        <AlertTriangle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-700 shrink-0 mt-0.5" strokeWidth={2} />
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
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-slate-200 text-slate-700 border border-slate-300 lg:hover:bg-slate-300"
                        >
                            {copiado ? <Check className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-emerald-600" strokeWidth={2.5} /> : <Copy className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />}
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

            {/* Modal: confirmar cerrar sesión en todos los dispositivos */}
            <ModalAdaptativo
                abierto={confirmarCerrarSesiones}
                onCerrar={() => !cerrandoSesiones && setConfirmarCerrarSesiones(false)}
                titulo="Cerrar sesión en todos los dispositivos"
                iconoTitulo={<LogOut className="w-5 h-5 text-red-600" strokeWidth={2} />}
                ancho="md"
            >
                <div data-testid="modal-cerrar-sesiones" className="space-y-4">
                    <p className="text-sm font-medium text-slate-600">
                        Se cerrará tu sesión en todos los dispositivos, <span className="font-semibold text-slate-800">incluido este</span>. Tendrás que volver a iniciar sesión.
                    </p>
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => setConfirmarCerrarSesiones(false)}
                            disabled={cerrandoSesiones}
                            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-slate-200 text-slate-700 border border-slate-300 lg:hover:bg-slate-300 disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                        <button
                            data-testid="btn-confirmar-cerrar-sesiones"
                            onClick={cerrarTodasLasSesiones}
                            disabled={cerrandoSesiones}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-red-600 text-white lg:hover:bg-red-700 disabled:opacity-60 disabled:cursor-default"
                        >
                            {cerrandoSesiones && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                            Cerrar todo
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>

            {/* Modal: confirmar eliminar cuenta */}
            <ModalAdaptativo
                abierto={confirmarEliminar}
                onCerrar={() => !eliminandoCuenta && setConfirmarEliminar(false)}
                titulo="Eliminar mi cuenta"
                iconoTitulo={<Trash2 className="w-5 h-5 text-red-600" strokeWidth={2} />}
                ancho="md"
            >
                <div data-testid="modal-eliminar-cuenta" className="space-y-4">
                    <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                        <AlertTriangle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-red-600 shrink-0 mt-0.5" strokeWidth={2} />
                        <p className="text-sm font-medium text-red-900">
                            Se desactivará tu cuenta y se cerrará tu sesión. Tus datos se conservan para una posible recuperación por soporte, pero no podrás iniciar sesión.
                        </p>
                    </div>
                    {tieneContrasena ? (
                        <div>
                            <label htmlFor="seg-pass-eliminar" className="block text-sm font-semibold text-slate-700 mb-1.5">Confirma con tu contraseña</label>
                            <input
                                id="seg-pass-eliminar"
                                data-testid="input-pass-eliminar"
                                type="password"
                                value={contrasenaEliminar}
                                onChange={(e) => setContrasenaEliminar(e.target.value)}
                                autoComplete="current-password"
                                className={inputClase('neutro')}
                            />
                        </div>
                    ) : (
                        <div>
                            <label htmlFor="seg-correo-eliminar" className="block text-sm font-semibold text-slate-700 mb-1.5">Escribe tu correo para confirmar</label>
                            <input
                                id="seg-correo-eliminar"
                                data-testid="input-correo-eliminar"
                                type="email"
                                value={correoConfirmEliminar}
                                onChange={(e) => setCorreoConfirmEliminar(e.target.value)}
                                placeholder={usuario.correo}
                                className={inputClase('neutro')}
                            />
                        </div>
                    )}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={() => setConfirmarEliminar(false)}
                            disabled={eliminandoCuenta}
                            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-slate-200 text-slate-700 border border-slate-300 lg:hover:bg-slate-300 disabled:opacity-60"
                        >
                            Cancelar
                        </button>
                        <button
                            data-testid="btn-confirmar-eliminar-cuenta"
                            onClick={eliminarMiCuenta}
                            disabled={eliminandoCuenta}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer bg-red-600 text-white lg:hover:bg-red-700 disabled:opacity-60 disabled:cursor-default"
                        >
                            {eliminandoCuenta && <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />}
                            Sí, eliminar
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>
        </div>
    );
}
