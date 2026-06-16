/**
 * CampoCorreoCuenta.tsx
 * =====================
 * Campo de correo del alta (vendedor/gerente) con:
 *   - Validación de formato EN VIVO (marca el borde en rojo si el correo no es válido).
 *   - Typeahead: mientras escribes (≥3 caracteres) busca cuentas existentes por correo y las muestra
 *     en un dropdown. Al hacer clic en una, el padre AUTOCOMPLETA nombre/teléfono (promoción).
 *   - Las cuentas que YA son del equipo se muestran con badge "Ya en el equipo" y NO son seleccionables.
 *
 * Ubicación: apps/admin/src/components/equipo/CampoCorreoCuenta.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, UserCheck } from 'lucide-react';
import { buscarCuentas, type CuentaSugerida } from '../../services/equipoService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROL_LABEL: Record<string, string> = { superadmin: 'SuperAdmin', gerente: 'Gerente', vendedor: 'Vendedor' };

interface CampoCorreoCuentaProps {
  correo: string;
  onCorreoChange: (v: string) => void;
  /** Se llama al elegir una cuenta existente (no del equipo) para autocompletar los demás campos. */
  onSeleccionarCuenta: (cuenta: CuentaSugerida) => void;
  testid?: string;
}

export function CampoCorreoCuenta({ correo, onCorreoChange, onSeleccionarCuenta, testid }: CampoCorreoCuentaProps) {
  const [resultados, setResultados] = useState<CuentaSugerida[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [tocado, setTocado] = useState(false);
  const correoRef = useRef(correo);
  correoRef.current = correo;
  const contenedorRef = useRef<HTMLDivElement>(null);

  const formatoValido = EMAIL_REGEX.test(correo.trim());
  const mostrarError = tocado && correo.trim().length > 0 && !formatoValido;

  // Typeahead con debounce (≥3 caracteres).
  useEffect(() => {
    const q = correo.trim();
    if (q.length < 3) { setResultados([]); setAbierto(false); setBuscando(false); return; }
    setBuscando(true);
    const t = setTimeout(async () => {
      try {
        const res = await buscarCuentas(q);
        if (correoRef.current.trim() === q) {
          setResultados(res);
          setAbierto(res.length > 0);
        }
      } catch {
        /* sin resultados: no bloquea el alta */
      } finally {
        setBuscando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [correo]);

  // Cerrar el dropdown al hacer clic fuera.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const elegir = (c: CuentaSugerida) => {
    if (c.rolEquipo) return; // ya es del equipo: no seleccionable
    onSeleccionarCuenta(c);
    setAbierto(false);
  };

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="email"
        data-testid={testid}
        value={correo}
        onChange={(e) => { onCorreoChange(e.target.value); setTocado(true); }}
        onFocus={() => { if (resultados.length > 0) setAbierto(true); }}
        placeholder="correo@ejemplo.com"
        className={`w-full rounded-[10px] border bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)] ${
          mostrarError ? 'border-peligro focus:border-peligro' : 'border-campo-borde focus:border-marca'
        }`}
      />
      {buscando && <Loader2 size={15} className="absolute right-3 top-3 animate-spin text-texto-4" />}

      {mostrarError && (
        <p className="mt-1 text-[12px] font-medium text-peligro" data-testid={testid ? `${testid}-error` : undefined}>
          Escribe un correo válido (ej. nombre@dominio.com).
        </p>
      )}

      {abierto && resultados.length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-[12px] border border-borde-fuerte bg-superficie p-1 shadow-pop-panel">
          <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4">Cuentas existentes</p>
          {resultados.map((c) => {
            const esEquipo = !!c.rolEquipo;
            return (
              <button
                key={c.id}
                type="button"
                disabled={esEquipo}
                data-testid={testid ? `${testid}-opcion-${c.id}` : undefined}
                onClick={() => elegir(c)}
                className={`flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left transition ${
                  esEquipo ? 'cursor-not-allowed opacity-60' : 'hover:bg-marca-suave'
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium text-texto">{c.nombre || '(Sin nombre)'}</span>
                  <span className="truncate text-[12px] text-texto-3">{c.correo}</span>
                </span>
                {esEquipo ? (
                  <span className="txt-badge shrink-0 rounded-full bg-marca-suave px-2 py-0.5 text-[10.5px] font-semibold text-marca">
                    Ya en el equipo · {ROL_LABEL[c.rolEquipo as string] ?? c.rolEquipo}
                  </span>
                ) : (
                  <UserCheck size={15} className="shrink-0 text-marca" />
                )}
              </button>
            );
          })}
          <p className="px-2.5 py-1.5 text-[11px] text-texto-4">Elige una para promoverla, o sigue escribiendo para crear una cuenta nueva.</p>
        </div>
      )}
    </div>
  );
}

export default CampoCorreoCuenta;
