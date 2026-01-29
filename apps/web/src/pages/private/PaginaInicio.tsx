/**
 * PaginaInicio.tsx
 * =================
 * Página de inicio (Hub) para usuarios autenticados.
 *
 * Por ahora es un placeholder. En la siguiente fase se agregarán
 * los carruseles de ofertas, negocios, marketplace y dinámicas.
 *
 * Ubicación: apps/web/src/pages/private/PaginaInicio.tsx
 */

import { useAuthStore } from '../../stores/useAuthStore';

export function PaginaInicio() {
  const usuario = useAuthStore((state) => state.usuario);
  const esComercial = usuario?.perfil === 'comercial';

  return (
    <>
      <div className="space-y-6">
        {/* Saludo */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            ¡Hola, {usuario?.nombre}! 👋
          </h1>
          <p className="text-gray-500">
            {esComercial
              ? 'Bienvenido a tu centro de operaciones'
              : 'Descubre ofertas y negocios cerca de ti'}
          </p>
        </div>

        {/* Placeholder de secciones */}
        <div className="space-y-6">
          {/* Ofertas */}
          <SeccionPlaceholder
            titulo="🔥 Ofertas que expiran pronto"
            color="red"
          />

          {/* Negocios */}
          <SeccionPlaceholder
            titulo="🏪 Negocios cerca de ti"
            color="blue"
          />

          {/* Marketplace */}
          <SeccionPlaceholder
            titulo="🛒 MarketPlace reciente"
            color="green"
          />

          {/* Dinámicas */}
          <SeccionPlaceholder
            titulo="🎁 Dinámicas activas"
            color="purple"
          />
        </div>
      </div>
    </>
  );
}

// =============================================================================
// SUBCOMPONENTE PLACEHOLDER
// =============================================================================

interface SeccionPlaceholderProps {
  titulo: string;
  color: 'red' | 'blue' | 'green' | 'purple';
}

function SeccionPlaceholder({ titulo, color }: SeccionPlaceholderProps) {
  const colorClasses = {
    red: 'bg-red-50 border-red-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">{titulo}</h2>
        <button className="text-sm text-blue-500 hover:text-blue-600">
          Ver todo →
        </button>
      </div>

      <div
        className={`h-40 rounded-xl border-2 border-dashed ${colorClasses[color]} flex items-center justify-center`}
      >
        <p className="text-gray-400">Carrusel próximamente</p>
      </div>
    </div>
  );
}

export default PaginaInicio;