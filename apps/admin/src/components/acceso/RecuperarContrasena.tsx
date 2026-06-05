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
import { ArrowLeft, Mail, Lock, KeyRound, Eye, EyeOff } from 'lucide-react';
import { solicitarCodigo, restablecerConCodigo } from '../../services/recuperacionService';

interface RecuperarContrasenaProps {
  onVolver: () => void;
}

type Paso = 'correo' | 'codigo' | 'exito';

const CLASE_INPUT =
  'w-full rounded-[11px] border border-campo-borde bg-campo py-3 pl-10 pr-3 text-base lg:text-sm 2xl:text-base font-medium text-texto placeholder:text-texto-4 outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_4px_var(--panel-ring)]';

export function RecuperarContrasena({ onVolver }: RecuperarContrasenaProps) {
  const [paso, setPaso] = useState<Paso>('correo');
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);

  async function enviarCorreo() {
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

  // ---- Paso ÉXITO ----
  if (paso === 'exito') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--panel-ok)_14%,transparent)] text-ok">
          <Lock size={26} />
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.3px] text-texto">Contraseña actualizada</h1>
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
          {paso === 'correo' ? 'Recuperar contraseña' : 'Revisa tu correo'}
        </h1>
        <p className="mt-1 text-sm text-texto-3">
          {paso === 'correo'
            ? 'Escribe tu correo y te enviaremos un código para crear una nueva contraseña.'
            : `Escribe el código de 6 dígitos que enviamos a ${correo} y tu nueva contraseña.`}
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
              className={CLASE_INPUT}
            />
          </div>
        </div>
      )}

      {paso === 'codigo' && (
        <>
          <div className="mb-4">
            <label htmlFor="codigo-recuperar" className="mb-1.5 block text-sm font-semibold text-texto-2">
              Código de 6 dígitos
            </label>
            <div className="relative">
              <KeyRound size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
              <input
                id="codigo-recuperar"
                data-testid="recuperar-codigo"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                className={`${CLASE_INPUT} tracking-[0.3em]`}
              />
            </div>
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
                className={`${CLASE_INPUT} pr-11`}
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
          </div>
        </>
      )}

      <button
        type="submit"
        data-testid="recuperar-enviar"
        disabled={cargando}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-marca py-3 text-sm font-semibold text-marca-contraste shadow-[0_6px_16px_-6px_var(--panel-brand)] transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-85"
      >
        {cargando ? (
          <>
            <span className="spinner-panel" /> {paso === 'correo' ? 'Enviando…' : 'Guardando…'}
          </>
        ) : paso === 'correo' ? (
          'Enviar código'
        ) : (
          'Restablecer contraseña'
        )}
      </button>
    </form>
  );
}

export default RecuperarContrasena;
