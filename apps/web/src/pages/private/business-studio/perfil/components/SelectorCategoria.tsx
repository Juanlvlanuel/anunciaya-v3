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
      <div
        className="flex items-center h-12 lg:h-10 2xl:h-12 bg-slate-50 rounded-lg px-4 lg:px-3 2xl:px-4 cursor-pointer"
        style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
        onClick={() => setAbierto(!abierto)}
      >
        <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 flex-1">
          {categoriaActual ? (
            <>
              <span className="text-2xl lg:text-xl 2xl:text-2xl">{categoriaActual.icono}</span>
              <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-800">{categoriaActual.nombre}</span>
            </>
          ) : (
            <span className="text-lg lg:text-base 2xl:text-lg font-medium text-slate-400">Selecciona una categoría</span>
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
      </div>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-2xl overflow-hidden" style={{ border: '2.5px solid #dde4ef' }}>
          
          {/* Lista de Categorías */}
          <div className="max-h-[280px] lg:max-h-60 2xl:max-h-[280px] overflow-y-auto">
            {categorias.map((categoria) => {
              const esSeleccionada = categoria.id === categoriaSeleccionada;
              
              return (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => handleSeleccionar(categoria.id)}
                  className={`
                    w-full flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 text-left transition-all
                    ${esSeleccionada
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }
                  `}
                >
                  <span className="text-2xl lg:text-xl 2xl:text-2xl">{categoria.icono}</span>
                  <span className="flex-1 text-base lg:text-sm 2xl:text-base">{categoria.nombre}</span>
                  
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