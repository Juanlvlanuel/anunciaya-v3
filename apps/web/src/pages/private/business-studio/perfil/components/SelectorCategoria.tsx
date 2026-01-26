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

  const categoriaActual = categorias.find(c => c.id === categoriaSeleccionada);

  const handleSeleccionar = (id: number) => {
    onSeleccionar(id);
    setAbierto(false);
  };

  return (
    <div ref={contenedorRef} className="relative">
      
      {/* Botón Principal */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center justify-between gap-3 lg:gap-2 2xl:gap-3 px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 text-base lg:text-sm 2xl:text-base bg-white border-2 border-slate-300 rounded-xl lg:rounded-lg 2xl:rounded-xl font-medium hover:border-blue-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
      >
        <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5">
          {categoriaActual ? (
            <>
              <span className="text-xl lg:text-lg 2xl:text-xl">{categoriaActual.icono}</span>
              <span className="text-slate-800 font-medium">{categoriaActual.nombre}</span>
            </>
          ) : (
            <span className="text-slate-500">Selecciona una categoría</span>
          )}
        </div>
        
        <svg 
          className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute z-50 mt-1.5 lg:mt-1 2xl:mt-1.5 w-full bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-2xl border-2 border-slate-200 overflow-hidden">
          
          {/* Lista de Categorías */}
          <div className="max-h-[280px] lg:max-h-[200px] 2xl:max-h-[280px] overflow-y-auto">
            {categorias.map((categoria) => {
              const esSeleccionada = categoria.id === categoriaSeleccionada;
              
              return (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => handleSeleccionar(categoria.id)}
                  className={`
                    w-full flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 py-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2.5 text-left transition-all
                    ${esSeleccionada
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }
                  `}
                >
                  <span className="text-xl lg:text-lg 2xl:text-xl">{categoria.icono}</span>
                  <span className="flex-1 text-sm lg:text-xs 2xl:text-sm">{categoria.nombre}</span>
                  
                  {esSeleccionada && (
                    <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}