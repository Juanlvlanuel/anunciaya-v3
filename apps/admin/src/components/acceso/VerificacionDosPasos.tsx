/**
 * VerificacionDosPasos.tsx
 * =========================
 * Paso de verificación TOTP (6 casillas con auto-avance y pegado). Lo usa el
 * login del Panel cuando el SuperAdmin tiene el 2FA del Panel prendido.
 *
 * Ubicación: apps/admin/src/components/acceso/VerificacionDosPasos.tsx
 */

import { useRef, useState } from 'react';
import { ArrowLeft, ShieldCheck, TriangleAlert } from 'lucide-react';

interface VerificacionDosPasosProps {
  correo: string;
  onVolver: () => void;
  onVerificar: (codigo: string) => void;
  error?: boolean;
  cargando?: boolean;
}

export function VerificacionDosPasos({
  correo,
  onVolver,
  onVerificar,
  error = false,
  cargando = false,
}: VerificacionDosPasosProps) {
  const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function setDigito(i: number, v: string) {
    const limpio = v.replace(/\D/g, '').slice(-1);
    const siguiente = [...codigo];
    siguiente[i] = limpio;
    setCodigo(siguiente);
    if (limpio && i < 5) refs.current[i + 1]?.focus();
  }

  function onTecla(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !codigo[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function onPegar(e: React.ClipboardEvent<HTMLDivElement>) {
    const datos = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6).split('');
    if (datos.length) {
      e.preventDefault();
      const siguiente = ['', '', '', '', '', ''];
      datos.forEach((d, k) => (siguiente[k] = d));
      setCodigo(siguiente);
      refs.current[Math.min(datos.length, 5)]?.focus();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onVerificar(codigo.join(''));
      }}
    >
      <button
        type="button"
        onClick={onVolver}
        data-testid="dospasos-volver"
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-texto-3 transition hover:text-texto"
      >
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[16px] bg-marca-suave text-marca">
        <ShieldCheck size={26} />
      </div>

      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-bold tracking-[-0.3px] text-texto">Verificación en dos pasos</h1>
        <p className="mt-1 text-sm text-texto-3">
          Ingresa el código de 6 dígitos de tu app de autenticación
          {correo ? (
            <>
              {' '}para <b className="text-texto-2">{correo}</b>
            </>
          ) : null}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="animar-entrada mb-4 flex items-start gap-2 rounded-[11px] border border-[color-mix(in_srgb,var(--panel-danger)_30%,transparent)] bg-peligro-suave p-3 text-sm text-texto-2"
        >
          <TriangleAlert size={18} className="mt-0.5 shrink-0 text-peligro" />
          <div>
            <b className="text-texto">Código incorrecto.</b> Verifica los 6 dígitos e inténtalo otra vez.
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-center gap-2" onPaste={onPegar}>
        {codigo.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-testid={`dospasos-casilla-${i}`}
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => setDigito(i, e.target.value)}
            onKeyDown={(e) => onTecla(i, e)}
            className={`h-14 w-12 rounded-[11px] border bg-campo text-center text-[22px] font-bold text-texto outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_4px_var(--panel-ring)] ${
              d ? 'border-marca' : 'border-campo-borde'
            }`}
          />
        ))}
      </div>

      <button
        type="submit"
        data-testid="dospasos-verificar"
        disabled={cargando}
        className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-marca py-3 text-sm font-semibold text-marca-contraste shadow-[0_6px_16px_-6px_var(--panel-brand)] transition hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-85"
      >
        {cargando ? (
          <>
            <span className="spinner-panel" /> Verificando…
          </>
        ) : (
          'Verificar e ingresar'
        )}
      </button>
    </form>
  );
}

export default VerificacionDosPasos;
