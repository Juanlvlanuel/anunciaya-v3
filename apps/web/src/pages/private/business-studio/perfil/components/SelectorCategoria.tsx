/**
 * ============================================================================
 * COMPONENTE: SelectorCategoria
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/SelectorCategoria.tsx
 * 
 * PROPÓSITO:
 * Selector moderno de categorías con mejor UI/UX
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Categoria {
  id: number;
  nombre: string;
  icono: string;
}

interface SelectorCategoriaProps {
  categorias: Categoria[];
  categoriaSeleccionada: number;
  onSeleccionar: (id: number) => void;
}

export default function SelectorCategoria({
  categorias,
  categoriaSeleccionada,
  onSeleccionar,
}: SelectorCategoriaProps) {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };

    if (abierto) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto || window.innerWidth >= 1024) return;

    const main = document.querySelector('main');
    if (!main) return;

    const paddingOriginal = main.style.paddingBottom;

    const timer = setTimeout(() => {
      const el = contenedorRef.current;
      if (!el) return;

      let offsetTop = 0;
      let current: HTMLElement | null = el;
      while (current && current !== main) {
        offsetTop += current.offsetTop;
        current = current.offsetParent as HTMLElement | null;
      }

      const targetScroll = offsetTop + el.offsetHeight + 400 - main.clientHeight + 16;
      const extraPadding = Math.max(0, targetScroll - (main.scrollHeight - main.clientHeight));
      if (extraPadding > 0) main.style.paddingBottom = `${extraPadding}px`;

      main.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }, 50);

    return () => {
      clearTimeout(timer);
      main.style.paddingBottom = paddingOriginal;
    };
  }, [abierto]);

  const categoriaActual = categorias.find(c => c.id === categoriaSeleccionada);

  const handleSeleccionar = (id: number) => {
    onSeleccionar(id);
    setAbierto(false);
  };

  return (
    <div ref={contenedorRef} className="relative">
      
      {/* Botón Principal */}
      <div
        className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 border-slate-300 hover:border-slate-400 cursor-pointer"
        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
        onClick={() => setAbierto(!abierto)}
      >
        <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 flex-1">
          {categoriaActual ? (
            <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-800">{categoriaActual.nombre}</span>
          ) : (
            <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-600">Selecciona una categoría</span>
          )}
        </div>
        
        <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg overflow-hidden">

          {/* Lista de Categorías */}
          <div className="max-h-[400px] lg:max-h-80 2xl:max-h-[400px] overflow-y-auto py-1">
            {categorias.map((categoria) => {
              const esSeleccionada = categoria.id === categoriaSeleccionada;

              return (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => handleSeleccionar(categoria.id)}
                  className={`
                    w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer
                    ${esSeleccionada
                      ? 'bg-indigo-100 text-indigo-700 font-semibold'
                      : 'hover:bg-slate-200 text-slate-600 font-medium'
                    }
                  `}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    esSeleccionada ? 'bg-indigo-500' : 'bg-slate-200'
                  }`}>
                    {esSeleccionada && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="flex-1 text-base lg:text-sm 2xl:text-base">{categoria.nombre}</span>
                </button>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}