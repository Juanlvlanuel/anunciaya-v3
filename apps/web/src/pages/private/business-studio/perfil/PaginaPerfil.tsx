/**
 * ============================================================================
 * PÁGINA: Mi Perfil - Business Studio
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/PaginaPerfil.tsx
 * 
 * PROPÓSITO:
 * Página principal para editar el perfil del negocio/sucursal
 * Incluye sistema de tabs y gestión de estado
 * 
 * FEATURES:
 * - Tabs dinámicos según tipo de negocio (físico/online)
 * - Tab "Ubicación" oculto para negocios online
 * - Ancho reducido en laptop para mejor uso del espacio
 */

import React, { useState, useMemo } from 'react';
import { Save } from 'lucide-react';
import { usePerfil } from './hooks/usePerfil';
import { Spinner } from '../../../../components/ui';
import TabInformacion from './components/TabInformacion';
import TabUbicacion from './components/TabUbicacion';
import TabContacto from './components/TabContacto';
import TabHorarios from './components/TabHorarios';
import TabImagenes from './components/TabImagenes';
import TabOperacion from './components/TabOperacion';

// =============================================================================
// TIPOS
// =============================================================================

type TabConfig = {
  key: string;
  label: string;
  renderizar: () => React.ReactElement;
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaPerfil() {
  const [tabActivo, setTabActivo] = useState(0);
  const hookPerfil = usePerfil();

  const { loading, error, esGerente, guardando } = hookPerfil;

  // =============================================================================
  // TABS DISPONIBLES (DINÁMICOS)
  // =============================================================================

  const tabs = useMemo<TabConfig[]>(() => {
    const allTabs: TabConfig[] = [];

    // Tab 1: Datos del Negocio (solo dueños)
    if (!esGerente) {
      allTabs.push({
        key: 'informacion',
        label: 'Datos del Negocio',
        renderizar: () => (
          <TabInformacion
            datosInformacion={hookPerfil.datosInformacion}
            setDatosInformacion={hookPerfil.setDatosInformacion}
          />
        ),
      });
    }

    // Tab 2: Contacto / Datos de Sucursal
    allTabs.push({
      key: 'contacto',
      label: esGerente ? 'Datos de Sucursal' : 'Contacto',
      renderizar: () => <TabContacto {...hookPerfil} />,
    });

    // Tab 3: Ubicación
    allTabs.push({
      key: 'ubicacion',
      label: 'Ubicación',
      renderizar: () => (
        <TabUbicacion
          datosUbicacion={hookPerfil.datosUbicacion}
          setDatosUbicacion={hookPerfil.setDatosUbicacion}
        />
      ),
    });

    // Tab 4: Horarios
    allTabs.push({
      key: 'horarios',
      label: 'Horarios',
      renderizar: () => <TabHorarios {...hookPerfil} />,
    });

    // Tab 5: Imágenes
    allTabs.push({
      key: 'imagenes',
      label: 'Imágenes',
      renderizar: () => <TabImagenes {...hookPerfil} />,
    });

    // Tab 6: Operación
    allTabs.push({
      key: 'operacion',
      label: 'Operación',
      renderizar: () => <TabOperacion {...hookPerfil} />,
    });

    return allTabs;
  }, [esGerente, hookPerfil]);

  // =============================================================================
  // FUNCIÓN DE GUARDADO
  // =============================================================================

  const handleGuardar = () => {
    // Guardar todos los cambios detectados en todos los tabs
    hookPerfil.guardarTodo();
  };

  // =============================================================================
  // LOADING / ERROR STATES
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Error al cargar perfil</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="bg-linear-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 p-2 lg:p-2 2xl:p-4">
      {/* CONTENEDOR CON ANCHO REDUCIDO EN LAPTOP */}
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto">

        {/* CARD PRINCIPAL */}
        <div className="bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

          {/* TABS */}
          <div className="border-b-3 border-blue-400 bg-blue-100 px-3 lg:px-4 2xl:px-6 shadow-md">
            <div className="flex items-center gap-4 lg:gap-3 2xl:gap-4">
              
              {/* TABS - Scroll completo */}
              <div className="flex gap-2 lg:gap-1.5 2xl:gap-2 overflow-x-auto flex-1">
                {tabs.map((tab, index) => (
                  <button
                    key={tab.key}
                    onClick={() => setTabActivo(index)}
                    className={`
                      px-4 py-3 lg:px-3 lg:py-2 2xl:px-5 2xl:py-3.5 text-base lg:text-sm 2xl:text-base font-bold whitespace-nowrap transition-all duration-200
                      ${tabActivo === index
                        ? 'text-blue-600 bg-white'
                        : 'text-slate-700 hover:text-blue-600 hover:bg-blue-50'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

            </div>
          </div>

          {/* CONTENIDO */}
          <div className="px-3 pt-6 pb-3 lg:p-5 2xl:p-8">
            {tabs[tabActivo]?.renderizar()}
          </div>

        </div>

      </div>

      {/* FAB - FLOATING ACTION BUTTON */}
      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 2xl:bottom-8 2xl:right-8 w-14 h-14 lg:w-16 lg:h-16 2xl:w-16 2xl:h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all disabled:cursor-not-allowed z-50 flex items-center justify-center group"
        title={guardando ? 'Guardando...' : 'Guardar Cambios'}
      >
        {guardando ? (
          <div className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Save className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 group-hover:scale-110 transition-transform" />
        )}
      </button>

    </div>
  );
}