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
 * - Header con icono animado (estilo unificado Business Studio)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, User } from 'lucide-react';
import { usePerfil } from './hooks/usePerfil';
import { useUiStore } from '../../../../stores/useUiStore';
import { Spinner } from '../../../../components/ui';
import TabInformacion from './components/TabInformacion';
import TabUbicacion from './components/TabUbicacion';
import TabContacto from './components/TabContacto';
import TabHorarios from './components/TabHorarios';
import TabImagenes from './components/TabImagenes';
import TabOperacion from './components/TabOperacion';

// =============================================================================
// CSS — Animación del icono del header (estilo unificado)
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes perfil-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .perfil-icon-bounce {
    animation: perfil-icon-bounce 2s ease-in-out infinite;
  }
`;

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

  const { loading, error, esGerente, guardando, datosInformacion, datosUbicacion } = hookPerfil;
  const previewNegocioAbierto = useUiStore((state) => state.previewNegocioAbierto);

  // Validación: campos requeridos para habilitar guardado
  const camposRequeridosCompletos = Boolean(datosUbicacion.estado);

  // Dueño viendo sucursal secundaria = misma vista que gerente
  const vistaComoGerente = esGerente || (datosInformacion.totalSucursales > 1 && !datosInformacion.esPrincipal);

  // =============================================================================
  // TABS DISPONIBLES (DINÁMICOS)
  // =============================================================================

  const tabs = useMemo<TabConfig[]>(() => {
    const allTabs: TabConfig[] = [];

    // Tab 1: Datos del Negocio (solo dueños viendo sucursal principal o con 1 sucursal)
    if (!vistaComoGerente) {
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
      label: vistaComoGerente ? 'Datos de Sucursal' : 'Contacto',
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
  }, [esGerente, vistaComoGerente, hookPerfil]);

  // Resetear al primer tab cuando cambia el modo de vista (al cambiar de sucursal)
  useEffect(() => {
    setTabActivo(0);
  }, [vistaComoGerente]);

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
    <div className="p-3 lg:p-1.5 2xl:p-3">
      {/* Inyectar estilos de animación */}
      <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />

      {/* CONTENEDOR CON ANCHO REDUCIDO EN LAPTOP */}
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto">

        {/* ===================================================================== */}
        {/* HEADER CON ICONO ANIMADO Y TABS */}
        {/* ===================================================================== */}

        <div className="flex items-center justify-between gap-6 mb-3 lg:mb-7 2xl:mb-14">
          {/* Contenedor del título e icono */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Contenedor del icono con gradiente */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)',
                boxShadow: '0 6px 20px rgba(59,130,246,0.4)',
              }}
            >
              {/* User animado */}
              <div className="perfil-icon-bounce">
                <User className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                Mi Perfil
              </h1>
              <p className="text-sm lg:text-sm 2xl:text-base text-slate-500 mt-0.5 font-medium">
                Información de tu negocio
              </p>
            </div>
          </div>

          {/* TABS INLINE A LA DERECHA */}
          <div className="hidden lg:flex gap-1.5 2xl:gap-2 overflow-x-auto flex-1 justify-end">
            {tabs.map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => setTabActivo(index)}
                className={`
                  px-2.5 py-2 2xl:px-5 2xl:py-2.5 text-xs 2xl:text-base font-bold whitespace-nowrap rounded-lg transition-all duration-200 cursor-pointer border-2 shrink-0
                  ${tabActivo === index
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABS MÓVIL (debajo del header en móvil) */}
        <div className="lg:hidden flex gap-2 overflow-x-auto mb-3">
          {tabs.map((tab, index) => (
            <button
              key={tab.key}
              onClick={() => setTabActivo(index)}
              className={`
                px-4 py-2 text-sm font-bold whitespace-nowrap rounded-lg transition-all duration-200 cursor-pointer border-2
                ${tabActivo === index
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===================================================================== */}
        {/* CARD PRINCIPAL CON CONTENIDO */}
        {/* ===================================================================== */}

        <div className="bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

          {/* CONTENIDO */}
          <div className="px-3 pt-6 pb-3 lg:p-5 2xl:p-8">
            {tabs[tabActivo]?.renderizar()}
          </div>

        </div>

      </div>

      {/* FAB - FLOATING ACTION BUTTON */}
      {createPortal(
        <div className={`fixed bottom-20 right-4 lg:bottom-6 lg:right-6 2xl:right-1/2 2xl:bottom-8 z-50 transition-transform duration-75 ${previewNegocioAbierto
          ? 'lg:right-[375px] 2xl:translate-x-[510px]'
          : 'lg:right-[45px] 2xl:translate-x-[895px]'
          }`}>
          <button
            onClick={handleGuardar}
            disabled={guardando || !camposRequeridosCompletos}
            className="w-14 h-14 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all disabled:cursor-not-allowed flex items-center justify-center group cursor-pointer"
            title={guardando ? 'Guardando...' : !camposRequeridosCompletos ? 'Completa los campos requeridos' : 'Guardar Cambios'}
          >
            {guardando ? (
              <div className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>,
        document.body
      )}

    </div>
  );
}