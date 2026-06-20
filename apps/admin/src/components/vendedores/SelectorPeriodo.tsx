/**
 * SelectorPeriodo.tsx
 * ===================
 * Chip + mini-calendario de MESES para filtrar por periodo (un mes con datos) o "Todo el tiempo".
 * Compartido por las pestañas del detalle del vendedor (Comisiones, Pagos, Por entregar).
 *
 * En vez de un dropdown que crece mes a mes, muestra una cuadrícula de 12 meses con navegación de año
 * (◄ año ►) — siempre compacto sin importar cuántos años acumule el historial. Los meses sin datos
 * quedan deshabilitados. Recibe los periodos en formato 'YYYY-MM' y reporta el seleccionado (null = todo).
 *
 * Ubicación: apps/admin/src/components/vendedores/SelectorPeriodo.tsx
 */

import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useClickFuera } from '../../hooks/useClickFuera';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** 'YYYY-MM' → "Jun 2026". */
export function periodoLegibleMes(p: string): string {
  const [y, m] = p.split('-');
  return MESES[Number(m) - 1] ? `${MESES[Number(m) - 1]} ${y}` : p;
}

/** Meses ('YYYY-MM') presentes en una lista de fechas ('YYYY-MM-DD' o ISO), recientes primero. */
export function periodosDe(fechas: (string | null | undefined)[]): string[] {
  return [...new Set(fechas.filter((f): f is string => !!f).map((f) => f.slice(0, 7)))].sort().reverse();
}

export function SelectorPeriodo({
  periodos,
  valor,
  onCambiar,
  testid,
}: {
  periodos: string[];
  valor: string | null;
  onCambiar: (p: string | null) => void;
  testid?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useClickFuera<HTMLDivElement>(() => setAbierto(false), abierto);

  const conDatos = useMemo(() => new Set(periodos), [periodos]);
  // Años con datos (desc) y sus límites para la navegación ◄ ►.
  const anios = useMemo(() => [...new Set(periodos.map((p) => Number(p.split('-')[0])))].sort((a, b) => a - b), [periodos]);
  const anioMin = anios[0];
  const anioMax = anios[anios.length - 1];

  const [anioVista, setAnioVista] = useState(() =>
    valor ? Number(valor.split('-')[0]) : (anioMax ?? new Date().getFullYear()),
  );

  // Al abrir, centrar el calendario en el año del valor o el más reciente con datos.
  useEffect(() => {
    if (abierto) setAnioVista(valor ? Number(valor.split('-')[0]) : (anioMax ?? anioVista));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const elegir = (p: string | null) => {
    onCambiar(p);
    setAbierto(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid={testid}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-borde-fuerte bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:border-marca hover:text-marca"
      >
        <Calendar size={14} className="text-texto-3" />
        <span>{valor ? periodoLegibleMes(valor) : 'Todo el tiempo'}</span>
        <ChevronDown size={14} className={`text-texto-3 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="animar-entrada absolute right-0 z-30 mt-2 w-[244px] rounded-[12px] border border-borde bg-superficie p-2.5 shadow-pop-panel">
          {/* Todo el tiempo */}
          <button
            type="button"
            onClick={() => elegir(null)}
            className={`mb-2 flex w-full items-center justify-center rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-semibold transition ${valor === null ? 'bg-marca text-marca-contraste' : 'text-texto-2 hover:bg-marca-suave hover:text-marca'}`}
          >
            Todo el tiempo
          </button>

          {/* Navegación de año */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Año anterior"
              onClick={() => setAnioVista((a) => a - 1)}
              disabled={anioMin === undefined || anioVista <= anioMin}
              className="grid h-7 w-7 place-items-center rounded-[8px] text-texto-3 transition hover:bg-marca-suave hover:text-marca disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13px] font-bold text-texto">{anioVista}</span>
            <button
              type="button"
              aria-label="Año siguiente"
              onClick={() => setAnioVista((a) => a + 1)}
              disabled={anioMax === undefined || anioVista >= anioMax}
              className="grid h-7 w-7 place-items-center rounded-[8px] text-texto-3 transition hover:bg-marca-suave hover:text-marca disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Cuadrícula de 12 meses */}
          <div className="grid grid-cols-3 gap-1">
            {MESES.map((mes, i) => {
              const periodo = `${anioVista}-${String(i + 1).padStart(2, '0')}`;
              const tieneDatos = conDatos.has(periodo);
              const sel = valor === periodo;
              return (
                <button
                  key={mes}
                  type="button"
                  disabled={!tieneDatos}
                  onClick={() => elegir(periodo)}
                  data-testid={testid ? `${testid}-${periodo}` : undefined}
                  className={`rounded-[8px] py-2 text-[12.5px] font-medium transition ${
                    sel
                      ? 'bg-marca font-semibold text-marca-contraste'
                      : tieneDatos
                        ? 'text-texto hover:bg-marca-suave hover:text-marca'
                        : 'cursor-not-allowed text-texto-4 opacity-40'
                  }`}
                >
                  {mes}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectorPeriodo;
