/**
 * DropdownNegocio.tsx
 * ====================
 * Dropdown custom moderno para filtrar por negocio.
 * Reutilizable en TablaHistorialVouchers y TablaHistorialCompras.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/DropdownNegocio.tsx
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Store, Check } from 'lucide-react';

interface DropdownNegocioProps {
  negocios: string[];
  valor: string;
  onChange: (negocio: string) => void;
  compacto?: boolean;
}

export default function DropdownNegocio({ negocios, valor, onChange, compacto = false }: DropdownNegocioProps) {
  const [abierto, setAbierto] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const posRef = useRef<{ top: number; left: number; width: number }>({ top: -9999, left: -9999, width: 220 });
  const [, forceRender] = useState(0);

  // Calcular posición del dropdown respecto al botón (sincrónico)
  const calcularPosicion = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    posRef.current = {
      top: rect.bottom + 6,
      left: rect.right - Math.max(220, rect.width),
      width: Math.max(220, rect.width),
    };
  }, []);

  // Abrir dropdown calculando posición ANTES del render
  const toggleDropdown = useCallback(() => {
    if (!abierto) {
      calcularPosicion();
    }
    setAbierto((prev) => !prev);
  }, [abierto, calcularPosicion]);

  // Recalcular posición en scroll/resize mientras está abierto
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

  // Cerrar al hacer click fuera
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

  const seleccionado = valor !== 'todos';
  const labelActual = seleccionado ? valor : 'Todos los Negocios';

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Botón trigger — más grande en lg */}
      <button
        ref={btnRef}
        onClick={toggleDropdown}
        className={`flex items-center ${compacto ? 'justify-center w-10 h-10' : 'gap-1.5 lg:gap-2.5 px-2 lg:px-4 py-2 lg:py-2'} rounded-lg ${compacto ? '' : 'text-xs lg:text-[13px]'} font-bold transition-all duration-200 cursor-pointer relative`}
        style={{
          background: compacto
            ? (seleccionado ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)')
            : (seleccionado ? '#fffbeb' : '#ffffff'),
          color: seleccionado ? '#92400e' : '#475569',
          border: compacto ? 'none' : `1.5px solid ${seleccionado ? '#f59e0b' : '#cbd5e1'}`,
          boxShadow: compacto
            ? 'none'
            : abierto
              ? '0 0 0 3px rgba(245,158,11,0.15)'
              : '0 1px 3px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={(e) => {
          if (compacto) {
            e.currentTarget.style.background = seleccionado ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.15)';
          } else if (!seleccionado) {
            e.currentTarget.style.borderColor = '#94a3b8';
            e.currentTarget.style.background = '#f8fafc';
          } else {
            e.currentTarget.style.borderColor = '#d97706';
            e.currentTarget.style.background = '#fef3c7';
          }
        }}
        onMouseLeave={(e) => {
          if (compacto) {
            e.currentTarget.style.background = seleccionado ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.08)';
          } else {
            e.currentTarget.style.borderColor = seleccionado ? '#f59e0b' : '#cbd5e1';
            e.currentTarget.style.background = seleccionado ? '#fffbeb' : '#ffffff';
          }
        }}
      >
        <Store
          className={compacto ? 'w-6 h-6' : 'w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0'}
          strokeWidth={2.5}
          style={{ color: compacto ? (seleccionado ? '#f59e0b' : 'rgba(255,255,255,0.5)') : (seleccionado ? '#d97706' : '#94a3b8') }}
        />
        {!compacto && (
          <>
            <span className="truncate max-w-[100px] lg:max-w-[180px]">{labelActual}</span>
            <ChevronDown
              className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0 transition-transform duration-200"
              strokeWidth={2.5}
              style={{
                color: seleccionado ? '#d97706' : '#94a3b8',
                transform: abierto ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
          </>
        )}
        {compacto && seleccionado && (
          <div
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
            style={{ background: '#f59e0b', border: '2px solid #000' }}
          />
        )}
      </button>

      {/* Lista desplegable — renderizada en portal para evitar overflow:hidden */}
      {abierto && createPortal(
        <div
          id="dropdown-negocio-portal"
          className="fixed z-9999 rounded-xl overflow-y-auto py-1.5"
          style={{
            top: `${posRef.current.top}px`,
            left: `${posRef.current.left}px`,
            minWidth: `${posRef.current.width}px`,
            maxHeight: '300px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          {/* Opción: Todos */}
          <button
            onClick={() => { onChange('todos'); setAbierto(false); }}
            onMouseEnter={() => setHoverIdx(-1)}
            onMouseLeave={() => setHoverIdx(null)}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 lg:py-3 text-left transition-colors duration-150 cursor-pointer"
            style={{
              background: hoverIdx === -1 ? '#f8fafc' : 'transparent',
            }}
          >
            <div
              className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: valor === 'todos'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : hoverIdx === -1 ? '#e2e8f0' : '#f1f5f9',
              }}
            >
              <Store
                className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                strokeWidth={2.5}
                style={{ color: valor === 'todos' ? '#ffffff' : hoverIdx === -1 ? '#64748b' : '#94a3b8' }}
              />
            </div>
            <span
              className="text-xs lg:text-[13px] font-bold flex-1"
              style={{ color: valor === 'todos' ? '#1e293b' : hoverIdx === -1 ? '#334155' : '#64748b' }}
            >
              Todos los Negocios
            </span>
            {valor === 'todos' && (
              <Check className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={2.5} />
            )}
          </button>

          {/* Separador */}
          <div className="mx-3 my-1" style={{ height: '1px', background: '#e2e8f0' }} />

          {/* Negocios */}
          {negocios.map((nombre, idx) => {
            const activo = valor === nombre;
            const hover = hoverIdx === idx;
            return (
              <button
                key={nombre}
                onClick={() => { onChange(nombre); setAbierto(false); }}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(null)}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 lg:py-3 text-left transition-colors duration-150 cursor-pointer"
                style={{
                  background: hover ? '#f8fafc' : 'transparent',
                }}
              >
                <div
                  className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: activo
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : hover ? '#e2e8f0' : '#f1f5f9',
                  }}
                >
                  <Store
                    className="w-3.5 h-3.5 lg:w-4 lg:h-4"
                    strokeWidth={2.5}
                    style={{ color: activo ? '#ffffff' : hover ? '#64748b' : '#94a3b8' }}
                  />
                </div>
                <span
                  className="text-xs lg:text-[13px] font-bold flex-1 truncate"
                  style={{ color: activo ? '#1e293b' : hover ? '#334155' : '#64748b' }}
                >
                  {nombre}
                </span>
                {activo && (
                  <Check className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={2.5} />
                )}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}