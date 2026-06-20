/**
 * SelectorBuscable.tsx
 * ====================
 * Combobox con BÚSQUEDA del Panel (reemplaza el <select> nativo cuando hay muchas opciones,
 * p. ej. ciudades). Trigger con el valor elegido + dropdown con campo de búsqueda y lista
 * filtrable. Tokens del Panel; el popover va en portal fixed (escapa del overflow del modal).
 * Cierra al hacer clic fuera, scroll o Escape.
 *
 * Ubicación: apps/admin/src/components/ui/SelectorBuscable.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';

export interface OpcionBuscable {
  id: string;
  etiqueta: string;
}

interface SelectorBuscableProps {
  value: string;
  onChange: (id: string) => void;
  opciones: OpcionBuscable[];
  placeholder?: string;
  buscarPlaceholder?: string;
  disabled?: boolean;
  testid?: string;
}

export function SelectorBuscable({
  value,
  onChange,
  opciones,
  placeholder = 'Selecciona…',
  buscarPlaceholder = 'Buscar…',
  disabled = false,
  testid,
}: SelectorBuscableProps) {
  const esEscritorio = useEsEscritorio();
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const refInput = useRef<HTMLDivElement>(null);
  const refDrop = useRef<HTMLDivElement>(null);
  const refBuscar = useRef<HTMLInputElement>(null);

  const etiquetaSel = opciones.find((o) => o.id === value)?.etiqueta ?? '';

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? opciones.filter((o) => o.etiqueta.toLowerCase().includes(q)) : opciones;
  }, [opciones, busqueda]);

  // Al abrir: limpiar la búsqueda y enfocar el campo.
  useEffect(() => {
    if (!abierto) return;
    setBusqueda('');
    const t = setTimeout(() => refBuscar.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [abierto]);

  // Cerrar al hacer clic fuera, Escape, o scroll/resize de la PÁGINA (no el de la lista interna).
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!refInput.current?.contains(t) && !refDrop.current?.contains(t)) setAbierto(false);
    };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    // El scroll DENTRO del dropdown (la lista de opciones) NO debe cerrarlo; solo el de la página/modal.
    const onScroll = (e: Event) => {
      if (refDrop.current?.contains(e.target as Node)) return;
      setAbierto(false);
    };
    const onResize = () => setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [abierto]);

  const elegir = (id: string) => {
    onChange(id);
    setAbierto(false);
  };

  // Posición del popover (portal fixed): bajo el input, o arriba si no cabe.
  const estiloDrop = useMemo(() => {
    if (!abierto || !refInput.current) return { top: 0, left: 0 } as const;
    const r = refInput.current.getBoundingClientRect();
    const ANCHO = Math.max(220, r.width);
    const ALTO = 300;
    // En PC el dropdown SIEMPRE abre hacia abajo; el flip (abrir arriba si no cabe) solo en móvil.
    const abreArriba = !esEscritorio && window.innerHeight - r.bottom < ALTO && r.top > window.innerHeight - r.bottom;
    let left = r.left;
    if (left + ANCHO > window.innerWidth - 8) left = window.innerWidth - ANCHO - 8;
    if (left < 8) left = 8;
    return {
      width: ANCHO,
      left,
      ...(abreArriba ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    } as const;
  }, [abierto, esEscritorio]);

  return (
    <div ref={refInput} className="relative">
      <button
        type="button"
        data-testid={testid}
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-[10px] border bg-campo px-3 py-2.5 text-[13px] outline-none transition ${
          abierto ? 'border-marca bg-superficie [box-shadow:0_0_0_3px_var(--panel-ring)]' : 'border-campo-borde hover:border-borde-fuerte'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className={`truncate ${etiquetaSel ? 'text-texto' : 'text-texto-4'}`}>{etiquetaSel || placeholder}</span>
        <ChevronDown size={16} className={`shrink-0 text-texto-3 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto &&
        createPortal(
          <div
            ref={refDrop}
            className="animar-entrada fixed z-[60] rounded-[12px] border border-borde-fuerte bg-superficie p-1.5 shadow-pop-panel"
            style={estiloDrop}
          >
            <div className="relative mb-1">
              <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-texto-4" />
              <input
                ref={refBuscar}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={buscarPlaceholder}
                data-testid={testid ? `${testid}-buscar` : undefined}
                className="w-full rounded-[8px] border border-campo-borde bg-campo py-2 pl-8 pr-7 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie"
              />
              {busqueda && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => { setBusqueda(''); refBuscar.current?.focus(); }}
                  className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[6px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="max-h-[240px] overflow-y-auto">
              {filtradas.length === 0 ? (
                <div className="px-2.5 py-3 text-center text-[12.5px] text-texto-4">Sin resultados</div>
              ) : (
                filtradas.map((o) => {
                  const sel = o.id === value;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => elegir(o.id)}
                      data-testid={testid ? `${testid}-opcion-${o.id}` : undefined}
                      className={`flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition ${
                        sel ? 'bg-marca-suave font-medium text-marca' : 'text-texto hover:bg-marca-suave'
                      }`}
                    >
                      <span className="flex-1 truncate">{o.etiqueta}</span>
                      <Check size={15} className={`shrink-0 text-marca ${sel ? 'opacity-100' : 'opacity-0'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default SelectorBuscable;
