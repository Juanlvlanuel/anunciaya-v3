/**
 * DropdownNegocio.tsx
 * ====================
 * Dropdown estilo Promociones (radio buttons + iconos) en tonos amber.
 * Filtra por negocio en CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/DropdownNegocio.tsx
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Store } from 'lucide-react';

interface DropdownNegocioProps {
  negocios: string[];
  valor: string;
  onChange: (negocio: string) => void;
  compacto?: boolean;
}

export default function DropdownNegocio({ negocios, valor, onChange, compacto = false }: DropdownNegocioProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const posRef = useRef<{ top: number; left: number; width: number }>({ top: -9999, left: -9999, width: 220 });
  const [, forceRender] = useState(0);

  const seleccionado = valor !== 'todos';
  const labelActual = seleccionado ? valor : 'Negocio';

  const calcularPosicion = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const panelWidth = compacto ? 220 : Math.max(260, rect.width);
    posRef.current = {
      top: rect.bottom + 6,
      left: rect.right - panelWidth,
      width: panelWidth,
    };
  }, [compacto]);

  const toggleDropdown = useCallback(() => {
    if (!abierto) calcularPosicion();
    setAbierto((prev) => !prev);
  }, [abierto, calcularPosicion]);

  useEffect(() => {
    if (!abierto) return;
    const handler = () => {
      calcularPosicion();
      forceRender((n) => n + 1);
    };
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [abierto, calcularPosicion]);

  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        const portalEl = document.getElementById('dropdown-negocio-portal');
        if (!portalEl || !portalEl.contains(target)) {
          setAbierto(false);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [abierto]);

  // Todas las opciones: "Todos" + negocios
  const opciones = [{ id: 'todos', label: 'Todos' }, ...negocios.map((n) => ({ id: n, label: n }))];

  // ─── Modo compacto (móvil) ───
  if (compacto) {
    return (
      <div ref={ref} className="relative shrink-0">
        <button
          ref={btnRef}
          data-testid="dropdown-negocio"
          onClick={toggleDropdown}
          aria-label="Filtrar por negocio"
          className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
        >
          <Store
            className="w-6 h-6 animate-store-bob"
            strokeWidth={2.5}
            style={seleccionado ? { color: '#f59e0b' } : undefined}
          />
          {seleccionado && (
            <div
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              style={{ background: '#f59e0b', border: '2px solid #000' }}
            />
          )}
        </button>

        {abierto && createPortal(
          <div
            id="dropdown-negocio-portal"
            className="fixed z-9999 bg-white rounded-xl border-2 border-slate-300 shadow-lg py-1 overflow-y-auto"
            style={{
              top: `${posRef.current.top}px`,
              left: `${posRef.current.left}px`,
              width: '220px',
              maxHeight: '300px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {opciones.map(({ id, label }) => {
              const activo = valor === id;
              return (
                <button
                  key={id}
                  data-testid={`filtro-negocio-${id}`}
                  onClick={() => { onChange(id); setAbierto(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${activo ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-amber-50'}`}
                >
                  <div className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${activo ? 'border-amber-500' : 'border-slate-300'}`}>
                    {activo && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                  </div>
                  <Store className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate min-w-0">{label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    );
  }

  // ─── Modo desktop ───
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={btnRef}
        data-testid="dropdown-negocio"
        onClick={toggleDropdown}
        className={`flex items-center gap-1.5 w-36 2xl:w-40 h-8 2xl:h-9 pl-2.5 pr-2 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${seleccionado
          ? 'bg-amber-100 border-amber-300 text-amber-700'
          : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
        }`}
      >
        <Store className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1 text-left min-w-0">
          {seleccionado ? labelActual : 'Negocio'}
        </span>
        <ChevronDown
          className={`ml-auto w-4 h-4 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && createPortal(
        <div
          id="dropdown-negocio-portal"
          className="fixed z-9999 bg-white rounded-xl border-2 border-slate-300 shadow-lg py-1 overflow-y-auto"
          style={{
            top: `${posRef.current.top}px`,
            left: `${posRef.current.left}px`,
            minWidth: `${posRef.current.width}px`,
            maxHeight: '300px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          {opciones.map(({ id, label }) => {
            const activo = valor === id;
            return (
              <button
                key={id}
                data-testid={`filtro-negocio-${id}`}
                onClick={() => { onChange(id); setAbierto(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${activo ? 'bg-amber-100 text-amber-700' : 'text-slate-600 hover:bg-amber-50'}`}
              >
                <div className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${activo ? 'border-amber-500' : 'border-slate-300'}`}>
                  {activo && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                </div>
                <span className="truncate min-w-0">{label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
