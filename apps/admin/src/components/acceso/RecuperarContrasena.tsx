/**
 * RecuperarContrasena.tsx
 * ========================
 * Recuperación de contraseña del Panel con el flujo REAL del backend (código de
 * 6 dígitos por correo): paso 1 pedir correo → paso 2 teclear código + nueva
 * contraseña → éxito. Reusa /auth/olvide-contrasena y /auth/restablecer-contrasena.
 *
 * Ubicación: apps/admin/src/components/acceso/RecuperarContrasena.tsx
 */

import { useState } from 'react';
import { AxiosError } from 'axios';
import { ArrowLeft, Mail, Lock, KeyRound, Eye, EyeOff, Check, RefreshCw } from 'lucide-react';
import { solicitarCodigo, restablecerConCodigo } from '../../services/recuperacionService';

interface RecuperarContrasenaProps {
  onVolver: () => void;
  /** Correo precargado (activación del equipo desde el enlace del correo). */
  correoInicial?: string;
  /** Paso en el que arranca. 'codigo' cuando la persona YA tiene el código (vino del enlace). */
  pasoInicial?: Paso;
  /**
   * true cuando la cuenta CREA su contraseña por primera vez (activación del equipo):
   * el copy habla de "crear", no de "recuperar/restablecer".
   */
  modoCrear?: boolean;
}

type Paso = 'correo' | 'codigo' | 'exito';

type EstadoCampo = 'neutro' | 'ok' | 'error';

/** Input del Panel con el borde según validación (neutro / ok / error), conservando el focus-ring. */
const claseInput = (estado: EstadoCampo = 'neutro') =>
  `w-full rounded-[11px] border bg-campo py-3 pl-10 pr-3 text-base lg:text-sm 2xl:text-base font-medium text-texto placeholder:text-texto-4 outline-none transition focus:bg-superficie focus:[box-shadow:0_0_0_4px_var(--panel-ring)] ${
    estado === 'ok'
      ? 'border-ok focus:border-ok'
      : estado === 'error'
        ? 'border-peligro focus:border-peligro'
        : 'border-campo-borde focus:border-marca'
  }`;

/** neutro si el campo está vacío; ok/error según su validez (para el color del borde). */
const estadoDe = (valor: string, valido: boolean): EstadoCampo =>
  valor.length === 0 ? 'neutro' : valido ? 'ok' : 'error';

export function RecuperarContrasena({
  onVolver,
  correoInicial = '',
  pasoInicial = 'correo',
  modoCrear = false,
}: RecuperarContrasenaProps) {
  const [paso, setPaso] = useState<Paso>(pasoInicial);
  const [correo, setCorreo] = useState(correoInicial);
  const [codigo, setCodigo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [error, setError] = useState<string>();
  const [avisoReenvio, setAvisoReenvio] = useState<string>();
  const [cargando, setCargando] = useState(false);

  // Validaciones en vivo (mismos requisitos que la app pública AnunciaYA).
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  const codigoValido = /^\d{6}$/.test(codigo);
  const passwordValida = contrasena.length >= 8 && /[A-Z]/.test(contrasena) && /[0-9]/.test(contrasena);
  const passwordsCoinciden = contrasena === confirmar && confirmar.length > 0;
  const paso2Valido = codigoValido && passwordValida && passwordsCoinciden;

  async function enviarCorreo() {
    if (!emailValido || cargando) return;
    setError(undefined);
    setCargando(true);
    try {
      // El backend responde genérico (no revela si el correo existe) → siempre avanzamos.
      await solicitarCodigo(correo);
      setPaso('codigo');
    } catch {
      setError('No se pudo enviar el código. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  async function restablecer() {
    if (!paso2Valido || cargando) return;
    setError(undefined);
    setCargando(true);
    try {
      const r = await restablecerConCodigo(correo, codigo, contrasena);
      if (r.success) {
        setPaso('exito');
      } else {
        setError(r.message || 'Código inválido.');
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>;
      setError(err.response?.data?.message || 'No se pudo restablecer. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  // Reenvía un código nuevo al correo (mismo endpoint que el paso 1). Best-effort con aviso inline.
  async function reenviar() {
    if (cargando) return;
    setError(undefined);
    setAvisoReenvio(undefined);
    setCargando(true);
    try {
      await solicitarCodigo(correo);
      setAvisoReenvio('Te enviamos un código nuevo a tu correo.');
    } catch {
      setError('No se pudo reenviar el código. Inténtalo de nuevo.');
    } finally {
      setCargando(false);
    }
  }

  // ---- Paso ÉXITO ----
  if (paso === 'exito') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--panel-ok)_14%,transparent)] text-ok">
          <Lock size={26} />
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.3px] text-texto">
          {modoCrear ? 'Cuenta activada' : 'Contraseña actualizada'}
        </h1>
        <p className="mt-1 text-sm text-texto-3">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <button
          type="button"
          data-testid="recuperar-volver-acceso"
          onClick={onVolver}
          className="mt-5 w-full rounded-[12px] bg-marca py-3 text-sm font-semibold text-marca-contraste transition hover:brightness-105"
        >
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (paso === 'correo') enviarCorreo();
        else restablecer();
      }}
    >
      <button
        type="button"
        onClick={() => (paso === 'codigo' ? setPaso('correo') : onVolver())}
        data-testid="recuperar-volver"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-texto-3 transition hover:text-texto"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-[-0.3px] text-texto">
          {modoCrear ? 'Crea tu contraseña' : paso === 'correo' ? 'Recuperar contraseña' : 'Revisa tu correo'}
        </h1>
        <p className="mt-1 text-sm text-texto-3">
          {paso === 'correo'
            ? 'Escribe tu correo y te enviaremos un código para crear una nueva contraseña.'
            : `Escribe el código de 6 dígitos que ${modoCrear ? 'te enviamos en el correo de bienvenida' : 'enviamos'} a ${correo} y tu nueva contraseña.`}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[11px] border border-[color-mix(in_srgb,var(--panel-danger)_30%,transparent)] bg-peligro-suave p-3 text-sm text-texto-2">
          {error}
        </div>
      )}

      {paso === 'correo' && (
        <div className="mb-4">
          <label htmlFor="correo-recuperar" className="mb-1.5 block text-sm font-semibold text-texto-2">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
            <input
              id="correo-recuperar"
              data-testid="recuperar-correo"
              type="email"
              placeholder="tucorreo@anunciaya.mx"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className={claseInput(estadoDe(correo, emailValido))}
            />
          </div>
        </div>
      )}

      {paso === 'codigo' && (
        <>
          <div className="mb-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="codigo-recuperar" className="block text-sm font-semibold text-texto-2">
                Código de 6 dígitos
              </label>
              <button
                type="button"
                data-testid="recuperar-reenviar"
                onClick={reenviar}
                disabled={cargando}
                className="flex items-center gap-1 text-[13px] font-semibold text-marca transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={13} /> Reenviar código
              </button>
            </div>
            <div className="relative">
              <KeyRound size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
              <input
                id="codigo-recuperar"
                data-testid="recuperar-codigo"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value.replace(/\D/g, ''));
                  setAvisoReenvio(undefined);
                }}
                className={`${claseInput(estadoDe(codigo, codigoValido))} tracking-[0.3em]`}
              />
            </div>
            {avisoReenvio && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ok">
                <Check size={13} /> {avisoReenvio}
              </p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="nueva-contrasena" className="mb-1.5 block text-sm font-semibold text-texto-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
              <input
                id="nueva-contrasena"
                data-testid="recuperar-nueva-contrasena"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className={`${claseInput(estadoDe(contrasena, passwordValida))} pr-11`}
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave hover:text-marca"
              >
                {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* Requisitos de contraseña — validación en vivo (igual que AnunciaYA, con estilo del Panel). */}
            <div
              className={`mt-2.5 flex items-center gap-2 text-[13px] font-medium ${
                passwordValida ? 'text-ok' : 'text-texto-3'
              }`}
            >
              <span
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border transition ${
                  passwordValida ? 'border-ok bg-ok text-white' : 'border-campo-borde text-transparent'
                }`}
              >
                <Check size={11} />
              </span>
              Mínimo 8 caracteres: 1 mayúscula y 1 número
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="confirmar-contrasena" className="mb-1.5 block text-sm font-semibold text-texto-2">
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
              <input
                id="confirmar-contrasena"
                data-testid="recuperar-confirmar-contrasena"
                type={mostrarConfirmar ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className={`${claseInput(estadoDe(confirmar, passwordsCoinciden))} pr-11`}
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmar((v) => !v)}
                aria-label={mostrarConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave hover:text-marca"
              >
                {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmar.length > 0 && !passwordsCoinciden && (
              <p className="mt-1.5 text-[13px] font-medium text-peligro">Las contraseñas no coinciden.</p>
            )}
          </div>
        </>
      )}

      <button
        type="submit"
        data-testid="recuperar-enviar"
        disabled={cargando || (paso === 'correo' ? !emailValido : !paso2Valido)}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-marca py-3 text-sm font-semibold text-marca-contraste shadow-[0_6px_16px_-6px_var(--panel-brand)] transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cargando ? (
          <>
            <span className="spinner-panel" /> {paso === 'correo' ? 'Enviando…' : 'Guardando…'}
          </>
        ) : paso === 'correo' ? (
          'Enviar código'
        ) : modoCrear ? (
          'Crear contraseña'
        ) : (
          'Restablecer contraseña'
        )}
      </button>
    </form>
  );
}

export default RecuperarContrasena;
