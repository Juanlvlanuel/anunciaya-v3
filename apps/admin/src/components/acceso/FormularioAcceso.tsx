/**
 * FormularioAcceso.tsx
 * =====================
 * Formulario de acceso (correo + contraseña). Calcado del handoff (variante
 * Inset) a los tokens del Panel. Un solo formulario para los 3 roles: el rol lo
 * decide la sesión, no hay selector de rol visible.
 *
 * Ubicación: apps/admin/src/components/acceso/FormularioAcceso.tsx
 */

import { useEffect, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Check, TriangleAlert } from 'lucide-react';
import type { Tema } from '../../utils/tema';

const LOGO_CLARO = '/logo-anunciaya-blanco.webp'; // fondo claro
const LOGO_OSCURO = '/logo-anunciaya-azul.webp'; // fondo oscuro

// Solo se recuerda el CORREO (nunca la contraseña).
const CLAVE_CORREO_RECORDADO = 'ayadmin_correo_recordado';

interface FormularioAccesoProps {
  tema: Tema;
  correo: string;
  setCorreo: (v: string) => void;
  error: boolean;
  mensajeError?: string;
  cargando: boolean;
  onEnviar: (correo: string, contrasena: string) => void;
  onOlvido: () => void;
}

const CLASE_INPUT =
  'w-full rounded-[11px] border border-campo-borde bg-campo py-3 pl-10 pr-3 text-base lg:text-sm 2xl:text-base font-medium text-texto placeholder:text-texto-4 outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_4px_var(--panel-ring)] data-[error=true]:border-peligro';

export function FormularioAcceso({
  tema,
  correo,
  setCorreo,
  error,
  mensajeError,
  cargando,
  onEnviar,
  onOlvido,
}: FormularioAccesoProps) {
  const [contrasena, setContrasena] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [recordar, setRecordar] = useState(() => !!localStorage.getItem(CLAVE_CORREO_RECORDADO));
  const logo = tema === 'oscuro' ? LOGO_OSCURO : LOGO_CLARO;

  // Precargar el correo recordado (solo el correo, nunca la contraseña).
  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_CORREO_RECORDADO);
    if (guardado) setCorreo(guardado);
  }, [setCorreo]);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (recordar) localStorage.setItem(CLAVE_CORREO_RECORDADO, correo);
        else localStorage.removeItem(CLAVE_CORREO_RECORDADO);
        onEnviar(correo, contrasena);
      }}
    >
      <div className="mb-5 flex justify-center">
        <img src={logo} alt="AnunciaYA" className="h-14 w-auto" />
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-bold tracking-[-0.3px] text-texto">Inicia sesión</h1>
        <p className="mt-1 text-sm text-texto-3">Panel de administración de AnunciaYA</p>
      </div>

      {error && (
        <div
          role="alert"
          className="animar-entrada mb-4 flex items-start gap-2 rounded-[11px] border border-[color-mix(in_srgb,var(--panel-danger)_30%,transparent)] bg-peligro-suave p-3 text-sm text-texto-2"
        >
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-peligro" />
          <div>
            <b className="text-texto">No pudimos iniciar sesión.</b>{' '}
            {mensajeError || 'Revisa tu correo y contraseña e inténtalo de nuevo.'}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="correo" className="mb-1.5 block text-sm font-semibold text-texto-2">
          Correo electrónico
        </label>
        <div className="relative">
          <Mail size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
          <input
            id="correo"
            data-testid="acceso-correo"
            data-error={error}
            type="email"
            autoComplete="username"
            placeholder="tucorreo@anunciaya.mx"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className={CLASE_INPUT}
          />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="contrasena" className="mb-1.5 block text-sm font-semibold text-texto-2">
          Contraseña
        </label>
        <div className="relative">
          <Lock size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
          <input
            id="contrasena"
            data-testid="acceso-contrasena"
            data-error={error}
            type={mostrar ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className={`${CLASE_INPUT} pr-11`}
          />
          <button
            type="button"
            data-testid="acceso-mostrar-contrasena"
            onClick={() => setMostrar((v) => !v)}
            aria-label={mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-texto-2">
          <input
            type="checkbox"
            data-testid="acceso-recordar"
            checked={recordar}
            onChange={(e) => setRecordar(e.target.checked)}
            className="peer sr-only"
          />
          <span className="grid h-[18px] w-[18px] place-items-center rounded-[6px] border border-borde-fuerte text-marca-contraste peer-checked:border-marca peer-checked:bg-marca">
            {recordar && <Check size={13} />}
          </span>
          Recordar mi correo
        </label>
        <button
          type="button"
          data-testid="acceso-olvido"
          onClick={onOlvido}
          className="text-sm font-semibold text-marca hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <button
        type="submit"
        data-testid="acceso-entrar"
        disabled={cargando}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-marca py-3 text-sm font-semibold text-marca-contraste shadow-[0_6px_16px_-6px_var(--panel-brand)] transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-85"
      >
        {cargando ? (
          <>
            <span className="spinner-panel" /> Entrando…
          </>
        ) : (
          'Entrar'
        )}
      </button>

      <div className="mt-5 flex items-center justify-center gap-1.5 text-sm text-texto-3">
        <Lock size={14} /> Conexión segura · acceso solo para personal autorizado
      </div>
    </form>
  );
}

export default FormularioAcceso;
