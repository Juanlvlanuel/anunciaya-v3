/**
 * VerificacionDosPasos.tsx
 * =========================
 * Pantalla de 2FA (solo SuperAdmin). UI calcada del handoff: emblema escudo + 6
 * casillas con auto-avance y pegado. La LÓGICA de verificación se cablea después
 * (acordado) — por ahora la pantalla es solo visual.
 *
 * Ubicación: apps/admin/src/components/acceso/VerificacionDosPasos.tsx
 */

import { useRef, useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

interface VerificacionDosPasosProps {
  correo: string;
  onVolver: () => void;
}

export function VerificacionDosPasos({ correo, onVolver }: VerificacionDosPasosProps) {
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
        /* Lógica de verificación pendiente de cablear. */
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
          Ingresa el código de 6 dígitos enviado a
          <br />
          <b className="text-texto-2">{correo || 'tu correo'}</b>
        </p>
      </div>

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
        className="w-full rounded-[12px] bg-marca py-3 text-sm font-semibold text-marca-contraste shadow-[0_6px_16px_-6px_var(--panel-brand)] transition hover:brightness-105 active:translate-y-px"
      >
        Verificar e ingresar
      </button>

      <p className="mt-3 text-center text-sm text-texto-3">
        ¿No llegó? <button type="button" className="font-semibold text-marca hover:underline">Reenviar código</button> · disponible en 0:30
      </p>
    </form>
  );
}

export default VerificacionDosPasos;
