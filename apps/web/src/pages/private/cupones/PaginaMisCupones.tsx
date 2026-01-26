/**
 * PaginaMisCupones.tsx
 * =====================
 * Página que muestra los cupones del usuario organizados por estado.
 *
 * ¿Qué hace este archivo?
 * - Muestra mensaje "Próximamente" (placeholder)
 * - Tabs para filtrar: Vigentes, Por Vencer, Usados
 * - Lee parámetro ?filter= del URL para activar tab correspondiente
 * - Diseño consistente con el resto de la app
 *
 * Ubicación: apps/web/src/pages/private/cupones/PaginaMisCupones.tsx
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Gift } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

type FiltroTab = 'vigentes' | 'por-vencer' | 'usados';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaMisCupones() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [searchParams] = useSearchParams();
  const [tabActivo, setTabActivo] = useState<FiltroTab>('vigentes');

  // ---------------------------------------------------------------------------
  // Effect: Leer filtro del URL al montar
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const filtro = searchParams.get('filter') as FiltroTab | null;
    if (filtro && ['vigentes', 'por-vencer', 'usados'].includes(filtro)) {
      setTabActivo(filtro);
    }
  }, [searchParams]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCambiarTab = (tab: FiltroTab) => {
    setTabActivo(tab);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Gift className="w-7 h-7 lg:w-8 lg:h-8 text-emerald-500" />
            Mis Cupones
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Administra tus cupones y descuentos
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-linear-to-r from-slate-50 to-white">
            <TabButton
              activo={tabActivo === 'vigentes'}
              onClick={() => handleCambiarTab('vigentes')}
            >
              Vigentes
            </TabButton>
            <TabButton
              activo={tabActivo === 'por-vencer'}
              onClick={() => handleCambiarTab('por-vencer')}
            >
              Por Vencer
            </TabButton>
            <TabButton
              activo={tabActivo === 'usados'}
              onClick={() => handleCambiarTab('usados')}
            >
              Usados
            </TabButton>
          </div>

          {/* Contenido Placeholder */}
          <div className="p-8 lg:p-16">
            <div className="text-center max-w-md mx-auto">
              {/* Icono grande */}
              <div className="w-24 h-24 lg:w-32 lg:h-32 mx-auto mb-6 bg-linear-to-br from-emerald-100 to-emerald-50 rounded-full flex items-center justify-center ring-8 ring-emerald-50">
                <Gift className="w-12 h-12 lg:w-16 lg:h-16 text-emerald-500" />
              </div>

              {/* Título */}
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">
                Cuponera Digital
              </h2>
              <p className="text-base lg:text-lg font-medium text-emerald-600 mb-4">
                Próximamente...
              </p>

              {/* Descripción */}
              <p className="text-sm lg:text-base text-gray-600 leading-relaxed">
                Aquí podrás ver todos tus cupones guardados, fechas de vencimiento y códigos QR para redimir tus descuentos en los negocios locales.
              </p>

              {/* Badge del filtro activo */}
              <div className="mt-6 inline-block">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-4 py-2 rounded-full">
                  {tabActivo === 'vigentes' && '📋 Mostrando cupones vigentes'}
                  {tabActivo === 'por-vencer' && '⏰ Mostrando cupones por vencer'}
                  {tabActivo === 'usados' && '✅ Mostrando cupones usados'}
                </span>
              </div>
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
          ? 'text-emerald-600 border-b-2 border-emerald-500 bg-white'
          : 'text-gray-500 hover:text-gray-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

export default PaginaMisCupones;