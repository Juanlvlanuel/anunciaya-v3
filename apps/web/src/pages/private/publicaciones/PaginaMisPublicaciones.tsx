/**
 * PaginaMisPublicaciones.tsx
 * ============================
 * Página que muestra las publicaciones del usuario en el MarketPlace.
 *
 * ¿Qué hace este archivo?
 * - Muestra mensaje "Próximamente" (placeholder)
 * - Tabs para filtrar: Activas, Borradores, Expiradas
 * - Botón CTA para crear nueva publicación
 * - Diseño consistente con el resto de la app
 *
 * Ubicación: apps/web/src/pages/private/publicaciones/PaginaMisPublicaciones.tsx
 */

import { useState } from 'react';
import { FileText, Plus } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

type TabPublicacion = 'activas' | 'borradores' | 'expiradas';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaMisPublicaciones() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [tabActivo, setTabActivo] = useState<TabPublicacion>('activas');

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCambiarTab = (tab: TabPublicacion) => {
    setTabActivo(tab);
  };

  const handleNuevaPublicacion = () => {
    // TODO: Navegar a formulario de nueva publicación
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-7 h-7 lg:w-8 lg:h-8 text-purple-500" />
            Mis Publicaciones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestiona tus publicaciones en el MarketPlace
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white">
            <TabButton
              activo={tabActivo === 'activas'}
              onClick={() => handleCambiarTab('activas')}
            >
              Activas
            </TabButton>
            <TabButton
              activo={tabActivo === 'borradores'}
              onClick={() => handleCambiarTab('borradores')}
            >
              Borradores
            </TabButton>
            <TabButton
              activo={tabActivo === 'expiradas'}
              onClick={() => handleCambiarTab('expiradas')}
            >
              Expiradas
            </TabButton>
          </div>

          {/* Contenido Placeholder */}
          <div className="p-8 lg:p-16">
            <div className="text-center max-w-md mx-auto">
              {/* Icono grande */}
              <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-6 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full flex items-center justify-center ring-8 ring-purple-50">
                <FileText className="w-12 h-12 lg:w-16 lg:h-16 text-purple-500" />
              </div>

              {/* Título */}
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">
                Mis Publicaciones
              </h2>
              <p className="text-base lg:text-lg font-medium text-purple-600 mb-4">
                Próximamente...
              </p>

              {/* Descripción */}
              <p className="text-sm lg:text-base text-gray-600 leading-relaxed mb-6">
                Administra tus publicaciones en el MarketPlace. Publica artículos, edita detalles, y controla la visibilidad de tus anuncios.
              </p>

              {/* Badge del filtro activo */}
              <div className="mb-8 inline-block">
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-4 py-2 rounded-full">
                  {tabActivo === 'activas' && '✅ Mostrando publicaciones activas'}
                  {tabActivo === 'borradores' && '📝 Mostrando borradores'}
                  {tabActivo === 'expiradas' && '⏱️ Mostrando publicaciones expiradas'}
                </span>
              </div>

              {/* CTA: Nueva Publicación */}
              <button
                onClick={handleNuevaPublicacion}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-150 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                <span>Nueva Publicación</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTE: TabButton
// =============================================================================

interface TabButtonProps {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ activo, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 lg:py-4 px-4 text-sm lg:text-base font-semibold transition-all duration-150 ${
        activo
          ? 'text-purple-600 border-b-2 border-purple-500 bg-white'
          : 'text-gray-500 hover:text-gray-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

export default PaginaMisPublicaciones;