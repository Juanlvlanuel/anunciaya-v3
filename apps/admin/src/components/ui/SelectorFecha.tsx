/**
 * SelectorFecha.tsx
 * =================
 * Date picker propio del Panel (reemplaza el <input type="date"> nativo, que no se puede
 * estilizar). Calendario con los tokens del Panel, semana iniciando en LUNES, navegación de
 * mes, respeto de minDate/maxDate (días fuera de rango deshabilitados) y selección. El popover
 * va en un portal fixed (escapa del overflow del modal) y se posiciona bajo el input (o arriba
 * si no cabe). Cierra al hacer clic fuera, scroll o Escape.
 *
 * value / onChange usan formato YYYY-MM-DD (igual que <input type="date">), en fecha LOCAL.
 *
 * Ubicación: apps/admin/src/components/ui/SelectorFecha.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';

interface SelectorFechaProps {
  /** Fecha seleccionada en formato YYYY-MM-DD ('' = sin selección). */
  value: string;
  onChange: (fecha: string) => void;
  /** Mínimo seleccionable (YYYY-MM-DD). Los días anteriores se ven deshabilitados. */
  minDate?: string;
  /** Máximo seleccionable (YYYY-MM-DD). */
  maxDate?: string;
  placeholder?: string;
  disabled?: boolean;
  testid?: string;
}

const DIAS_SEMANA = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function partes(fecha: string): { anio: number; mes: number; dia: number } | null {
  if (!fecha) return null;
  const [a, m, d] = fecha.split('-').map(Number);
  if (!a || !m || !d) return null;
  return { anio: a, mes: m - 1, dia: d };
}

function aISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function paraMostrar(fecha: string): string {
  const p = partes(fecha);
  return p ? `${String(p.dia).padStart(2, '0')}/${String(p.mes + 1).padStart(2, '0')}/${p.anio}` : '';
}

/** Offset de la 1ª celda con la semana iniciando en LUNES (getDay 0=Do → va al final). */
function offsetLunes(anio: number, mes: number): number {
  return (new Date(anio, mes, 1).getDay() + 6) % 7;
}

export function SelectorFecha({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Elige una fecha',
  disabled = false,
  testid,
}: SelectorFechaProps) {
  const hoy = useMemo(() => new Date(), []);
  const esEscritorio = useEsEscritorio();
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => partes(value)?.mes ?? hoy.getMonth());
  const [anio, setAnio] = useState(() => partes(value)?.anio ?? hoy.getFullYear());

  const refInput = useRef<HTMLDivElement>(null);
  const refCal = useRef<HTMLDivElement>(null);

  // Al abrir (o cambiar value), centrar el calendario en el mes de la fecha / minDate / hoy.
  useEffect(() => {
    if (!abierto) return;
    const base = partes(value) ?? partes(minDate ?? '') ?? { anio: hoy.getFullYear(), mes: hoy.getMonth(), dia: 1 };
    setMes(base.mes);
    setAnio(base.anio);
  }, [abierto, value, minDate, hoy]);

  // Cerrar al hacer clic fuera, scroll o Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!refInput.current?.contains(t) && !refCal.current?.contains(t)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    const cerrar = () => setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  const mesAnterior = () => (mes === 0 ? (setMes(11), setAnio(anio - 1)) : setMes(mes - 1));
  const mesSiguiente = () => (mes === 11 ? (setMes(0), setAnio(anio + 1)) : setMes(mes + 1));

  const deshabilitado = (dia: number): boolean => {
    const iso = aISO(anio, mes, dia);
    return (!!minDate && iso < minDate) || (!!maxDate && iso > maxDate);
  };
  const seleccionado = (dia: number): boolean => {
    const p = partes(value);
    return !!p && p.anio === anio && p.mes === mes && p.dia === dia;
  };
  const esHoy = (dia: number): boolean =>
    hoy.getFullYear() === anio && hoy.getMonth() === mes && hoy.getDate() === dia;

  const elegir = (dia: number) => {
    if (deshabilitado(dia)) return;
    onChange(aISO(anio, mes, dia));
    setAbierto(false);
  };

  const irAHoy = () => {
    setMes(hoy.getMonth());
    setAnio(hoy.getFullYear());
  };

  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array(offsetLunes(anio, mes)).fill(null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  // Posición del popover (portal fixed): bajo el input, o arriba si no cabe.
  const estiloCal = useMemo(() => {
    if (!abierto || !refInput.current) return { top: 0, left: 0 } as const;
    const r = refInput.current.getBoundingClientRect();
    const ANCHO = Math.min(320, Math.max(260, r.width)); // acotado: ni gigante en inputs anchos ni angosto
    const ALTO = 320;
    // En PC el calendario SIEMPRE abre hacia abajo; el flip (abrir arriba si no cabe) solo en móvil.
    const abreArriba = !esEscritorio && window.innerHeight - r.bottom < ALTO && r.top > window.innerHeight - r.bottom;
    let left = r.left;
    if (left + ANCHO > window.innerWidth - 8) left = window.innerWidth - ANCHO - 8;
    if (left < 8) left = 8;
    return {
      width: ANCHO,
      left,
      ...(abreArriba ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    } as const;
    // Recalcular en cada apertura/navegación (el scroll cierra el popover).
  }, [abierto, mes, anio, esEscritorio]);

  return (
    <div ref={refInput} className="relative">
      <button
        type="button"
        data-testid={testid}
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center justify-between rounded-[10px] border bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition ${
          abierto ? 'border-marca bg-superficie [box-shadow:0_0_0_3px_var(--panel-ring)]' : 'border-campo-borde hover:border-borde-fuerte'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={value ? 'text-texto' : 'text-texto-4'}>{value ? paraMostrar(value) : placeholder}</span>
        <Calendar size={16} className="shrink-0 text-texto-3" />
      </button>

      {abierto &&
        createPortal(
          <div
            ref={refCal}
            className="animar-entrada fixed z-[60] rounded-[12px] border border-borde-fuerte bg-superficie p-2.5 shadow-pop-panel"
            style={estiloCal}
          >
            {/* Header: mes/año + navegación */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={mesAnterior}
                aria-label="Mes anterior"
                className="grid h-7 w-7 place-items-center rounded-[8px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[13px] font-bold text-texto">{MESES[mes]} {anio}</span>
              <button
                type="button"
                onClick={mesSiguiente}
                aria-label="Mes siguiente"
                className="grid h-7 w-7 place-items-center rounded-[8px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="grid h-6 place-items-center text-[10.5px] font-semibold uppercase text-texto-4">
                  {d}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-0.5">
              {celdas.map((dia, i) => {
                if (dia === null) return <div key={`v-${i}`} />;
                const off = deshabilitado(dia);
                const sel = seleccionado(dia);
                const hoyDia = esHoy(dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    disabled={off}
                    onClick={() => elegir(dia)}
                    data-testid={testid ? `${testid}-dia-${dia}` : undefined}
                    className={`grid aspect-square place-items-center rounded-[8px] text-[12.5px] transition ${
                      off
                        ? 'cursor-not-allowed text-texto-4 opacity-40'
                        : sel
                          ? 'bg-marca font-semibold text-marca-contraste'
                          : hoyDia
                            ? 'bg-marca-suave font-semibold text-marca'
                            : 'font-medium text-texto hover:bg-marca-suave'
                    }`}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between border-t border-borde pt-2">
              <button
                type="button"
                onClick={() => { onChange(''); setAbierto(false); }}
                className="rounded-[8px] px-2 py-1 text-[12px] font-semibold text-texto-3 transition hover:bg-marca-suave hover:text-texto"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={irAHoy}
                className="rounded-[8px] px-2 py-1 text-[12px] font-semibold text-marca transition hover:bg-marca-suave"
              >
                Ir a hoy
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default SelectorFecha;
