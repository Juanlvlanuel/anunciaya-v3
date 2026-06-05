/**
 * RecuperarContrasena.tsx
 * ========================
 * Pantalla de recuperación de contraseña. UI calcada del handoff (formulario +
 * estado "enviado"). La LÓGICA de envío se cablea después (acordado) — por ahora
 * el botón solo cambia al estado visual "enviado".
 *
 * Ubicación: apps/admin/src/components/acceso/RecuperarContrasena.tsx
 */

import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';

interface RecuperarContrasenaProps {
  onVolver: () => void;
}

export function RecuperarContrasena({ onVolver }: RecuperarContrasenaProps) {
  const [correo, setCorreo] = useState('');
  const [enviado, setEnviado] = useState(false);

  if (enviado) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--panel-ok)_14%,transparent)] text-ok">
          <Mail size={26} />
        </div>
        <h1 className="text-[22px] font-bold tracking-[-0.3px] text-texto">Revisa tu correo</h1>
        <p className="mt-1 text-sm text-texto-3">
          Si la cuenta existe, te enviamos un enlace para restablecer tu contraseña.
        </p>
        <div className="mx-auto mt-4 w-fit rounded-full bg-marca-suave px-3 py-1.5 text-sm text-marca">
          Enviado a <b>{correo}</b>
        </div>
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
        /* Lógica de envío pendiente de cablear: por ahora solo cambia de estado. */
        setEnviado(true);
      }}
    >
      <button
        type="button"
        onClick={onVolver}
        data-testid="recuperar-volver"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-texto-3 transition hover:text-texto"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-[-0.3px] text-texto">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-texto-3">
          Escribe tu correo y te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

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
            className="w-full rounded-[11px] border border-campo-borde bg-campo py-3 pl-10 pr-3 text-base lg:text-sm 2xl:text-base font-medium text-texto placeholder:text-texto-4 outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_4px_var(--panel-ring)]"
          />
        </div>
      </div>

      <button
        type="submit"
        data-testid="recuperar-enviar"
        className="w-full rounded-[12px] bg-marca py-3 text-sm font-semibold text-marca-contraste shadow-[0_6px_16px_-6px_var(--panel-brand)] transition hover:brightness-105 active:translate-y-px"
      >
        Enviar enlace de recuperación
      </button>
    </form>
  );
}

export default RecuperarContrasena;
