/**
 * PaginaInicio.tsx - VERSIÓN v2.0 REDISEÑO
 * =================
 * Página de inicio (Hub) para usuarios autenticados.
 * 
 * CAMBIOS v2.0:
 * - Mejor espaciado (padding interno)
 * - Diseño más limpio con el nuevo estilo
 * - Cards de placeholder mejoradas
 *
 * Ubicación: apps/web/src/pages/private/PaginaInicio.tsx
 */

import { useAuthStore } from '../../stores/useAuthStore';

export function PaginaInicio() {
  const usuario = useAuthStore((state) => state.usuario);
  const esComercial = usuario?.modoActivo === 'comercial';

  return (
    <div className="p-6 lg:p-5 2xl:p-8">
      <div className="max-w-5xl mx-auto space-y-6 lg:space-y-5 2xl:space-y-8">
        
        {/* Saludo */}
        <div className="bg-white rounded-xl p-5 lg:p-4 2xl:p-6 shadow-sm">
          <h1 className="text-2xl lg:text-xl 2xl:text-2xl font-bold text-slate-800">
            ¡Hola, {usuario?.nombre}! 👋
          </h1>
          <p className="text-slate-500 text-sm lg:text-xs 2xl:text-sm mt-1">
            {esComercial
              ? 'Bienvenido a tu centro de operaciones'
              : 'Descubre ofertas y negocios cerca de ti'}
          </p>
        </div>

        {/* Secciones */}
        <div className="space-y-5 lg:space-y-4 2xl:space-y-6">
          
          {/* Ofertas */}
          <SeccionCarrusel
            icono="🔥"
            titulo="Ofertas que expiran pronto"
            color="red"
          />

          {/* Negocios */}
          <SeccionCarrusel
            icono="🏪"
            titulo="Negocios cerca de ti"
            color="blue"
          />

          {/* Marketplace */}
          <SeccionCarrusel
            icono="🛒"
            titulo="MarketPlace reciente"
            color="emerald"
          />

          {/* Dinámicas */}
          <SeccionCarrusel
            icono="🎁"
            titulo="Dinámicas activas"
            color="violet"
          />

        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTE CARRUSEL
// =============================================================================

interface SeccionCarruselProps {
  icono: string;
  titulo: string;
  color: 'red' | 'blue' | 'emerald' | 'violet';
}

function SeccionCarrusel({ icono, titulo, color }: SeccionCarruselProps) {
  const colorConfig = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      text: 'text-red-600',
    },
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      text: 'text-blue-600',
    },
    emerald: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      text: 'text-emerald-600',
    },
    violet: {
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      iconBg: 'bg-violet-100',
      text: 'text-violet-600',
    },
  };

  const config = colorConfig[color];

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 lg:px-4 lg:py-2.5 2xl:px-5 2xl:py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 ${config.iconBg} rounded-lg flex items-center justify-center text-base lg:text-sm 2xl:text-base`}>
            {icono}
          </span>
          <h2 className="font-semibold text-slate-800 text-sm lg:text-xs 2xl:text-sm">
            {titulo}
          </h2>
        </div>
        <button className={`text-xs lg:text-[10px] 2xl:text-xs font-medium ${config.text} hover:underline`}>
          Ver todo →
        </button>
      </div>

      {/* Placeholder del carrusel */}
      <div
        className={`h-36 lg:h-32 2xl:h-40 ${config.bg} border-t-2 ${config.border} flex items-center justify-center`}
      >
        <div className="text-center">
          <p className="text-slate-400 text-sm lg:text-xs 2xl:text-sm">Carrusel próximamente</p>
          <p className="text-slate-300 text-xs lg:text-[10px] 2xl:text-xs mt-1">Desliza para ver más</p>
        </div>
      </div>
    </div>
  );
}

export default PaginaInicio;