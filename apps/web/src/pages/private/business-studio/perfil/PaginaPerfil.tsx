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
 */

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Save, User, Building2, Phone, MapPin, Clock,
  Image as ImageIcon, Settings2,
} from 'lucide-react';
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
// CSS — Animación del icono + KPI carousel sin scrollbar
// =============================================================================

const ESTILOS = `
  @keyframes perfil-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .perfil-icon-bounce {
    animation: perfil-icon-bounce 2s ease-in-out infinite;
  }
  .perfil-kpi-scroll {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .perfil-kpi-scroll::-webkit-scrollbar {
    display: none;
  }
  @keyframes guardar-tornado {
    0%   { transform: scale(1) translate(0, 0) rotate(0deg); }
    45%  { transform: scale(1.6) translate(var(--dx), var(--dy)) rotate(180deg); }
    55%  { transform: scale(1.6) translate(var(--dx), var(--dy)) rotate(220deg); }
    100% { transform: scale(1) translate(0, 0) rotate(360deg); }
  }
  .anim-guardar-tornado {
    animation: guardar-tornado 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    z-index: 9999;
  }
`;

// =============================================================================
// TIPOS
// =============================================================================

type TabConfig = {
  key: string;
  label: string;
  icono: React.ReactNode;
  renderizar: () => React.ReactElement;
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaPerfil() {
  const [tabActivo, setTabActivo] = useState(0);
  const [animandoGuardar, setAnimandoGuardar] = useState(false);
  const btnGuardarDesktopRef = React.useRef<HTMLButtonElement>(null);
  const hookPerfil = usePerfil();

  const { loading, error, esGerente, guardando, hayCambios, datosInformacion, datosUbicacion } = hookPerfil;
  const previewNegocioAbierto = useUiStore((state) => state.previewNegocioAbierto);
  const { setGuardarBsFn, setGuardandoBs, setBsPuedeGuardar } = useUiStore();

  // Validación: campos requeridos para habilitar guardado
  const camposRequeridosCompletos = Boolean(datosUbicacion.estado);

  // Ref para guardarTodo (siempre actualizado)
  const guardarRef = React.useRef(hookPerfil.guardarTodo);
  guardarRef.current = hookPerfil.guardarTodo;

  // Registrar/desregistrar función de guardado según hayCambios
  useEffect(() => {
    if (hayCambios) {
      setGuardarBsFn(() => guardarRef.current());
    } else {
      setGuardarBsFn(null);
    }
    return () => setGuardarBsFn(null);
  }, [hayCambios]);

  // Sincronizar estado de guardado al store
  useEffect(() => {
    setGuardandoBs(guardando);
  }, [guardando]);

  useEffect(() => {
    setBsPuedeGuardar(camposRequeridosCompletos);
  }, [camposRequeridosCompletos]);

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
        label: 'Negocio',
        icono: <Building2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 shrink-0" />,
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
      label: vistaComoGerente ? 'Sucursal' : 'Contacto',
      icono: <Phone className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 shrink-0" />,
      renderizar: () => <TabContacto {...hookPerfil} />,
    });

    // Tab 3: Ubicación
    allTabs.push({
      key: 'ubicacion',
      label: 'Ubicación',
      icono: <MapPin className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 shrink-0" />,
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
      icono: <Clock className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 shrink-0" />,
      renderizar: () => <TabHorarios {...hookPerfil} />,
    });

    // Tab 5: Imágenes
    allTabs.push({
      key: 'imagenes',
      label: 'Imágenes',
      icono: <ImageIcon className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 shrink-0" />,
      renderizar: () => <TabImagenes {...hookPerfil} />,
    });

    // Tab 6: Operación
    allTabs.push({
      key: 'operacion',
      label: 'Operación',
      icono: <Settings2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 shrink-0" />,
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

  const mostrarKpiSucursal = datosInformacion.totalSucursales > 1;
  const esPrincipal = datosInformacion.esPrincipal;

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="p-3 pb-10 lg:p-1.5 2xl:p-3">
      {/* Inyectar estilos */}
      <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />

      {/* CONTENEDOR */}
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

        {/* ===================================================================== */}
        {/* HEADER */}
        {/* ===================================================================== */}

        {/* ================================================================= */}
        {/* HEADER                                                           */}
        {/* Desktop: título + tabs en la misma fila                         */}
        {/* Mobile: solo título (tabs van abajo con espaciado propio)        */}
        {/* ================================================================= */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-4">

          {/* Icono + Título — solo desktop */}
          <div className="hidden lg:flex items-center gap-3 shrink-0 mb-3 lg:mb-0">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6, #60a5fa)',
                boxShadow: '0 6px 20px rgba(59,130,246,0.4)',
              }}
            >
              <div className="perfil-icon-bounce">
                <User className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Mi Perfil
              </h1>
              <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium lg:mt-0.5 -mt-0.5">
                {mostrarKpiSucursal
                  ? `Editando: ${esPrincipal ? 'Matriz' : datosInformacion.nombreSucursal || 'Sucursal'}`
                  : 'Administra tu Información'
                }
              </p>
            </div>
          </div>

          {/* TABS — móvil debajo del título, desktop alineado a la derecha */}
          <div className="mt-5 lg:mt-0 overflow-x-auto perfil-kpi-scroll">
            <div className="flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 shadow-md w-fit">
              {tabs.map((tab, index) => (
                <button
                  key={tab.key}
                  onClick={() => setTabActivo(index)}
                  className={`
                    flex items-center gap-1 lg:gap-1 2xl:gap-1.5
                    px-3 lg:px-3 2xl:px-4 h-10 lg:h-9 2xl:h-10
                    rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold
                    whitespace-nowrap shrink-0 cursor-pointer
                    ${tabActivo === index
                      ? 'text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-300'
                    }
                  `}
                  style={tabActivo === index ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                >
                  {tab.icono}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ================================================================= */}
        {/* CONTENIDO DEL TAB ACTIVO                                          */}
        {/* Desktop: mt-7/mt-14 desde el header                              */}
        {/* Mobile: space-y normal (pegado a los tabs de arriba)              */}
        {/* ================================================================= */}

        <div className="lg:mt-7 2xl:mt-14">
          {tabs[tabActivo]?.renderizar()}
        </div>

      </div>

      {/* ===================================================================== */}
      {/* FAB - FLOATING ACTION BUTTON */}
      {/* ===================================================================== */}

      {/* FAB solo en desktop — en móvil se usa el botón del MobileHeader */}
      {hayCambios && createPortal(
        <div className={`hidden lg:block fixed lg:bottom-6 lg:right-6 2xl:right-1/2 2xl:bottom-8 z-50 transition-transform duration-75 ${previewNegocioAbierto
          ? 'lg:right-[375px] 2xl:translate-x-[510px]'
          : 'lg:right-[45px] 2xl:translate-x-[895px]'
          }`}>
          <button
            ref={btnGuardarDesktopRef}
            onClick={() => {
              if (animandoGuardar || guardando) return;
              const btn = btnGuardarDesktopRef.current;
              if (btn) {
                const rect = btn.getBoundingClientRect();
                const dx = (window.innerWidth / 2) - (rect.left + rect.width / 2);
                const dy = (window.innerHeight / 2) - (rect.top + rect.height / 2);
                btn.style.setProperty('--dx', `${dx}px`);
                btn.style.setProperty('--dy', `${dy}px`);
              }
              setAnimandoGuardar(true);
              setTimeout(() => {
                setAnimandoGuardar(false);
                handleGuardar();
              }, 850);
            }}
            disabled={guardando || !camposRequeridosCompletos}
            className={`w-14 h-14 2xl:w-16 2xl:h-16 disabled:bg-slate-400 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all disabled:cursor-not-allowed flex items-center justify-center group cursor-pointer ${animandoGuardar ? 'anim-guardar-tornado' : ''}`}
            style={{ background: guardando ? undefined : 'linear-gradient(135deg, #1e40af, #3b82f6)', border: '3px solid rgba(255,255,255,0.5)' }}
            title={guardando ? 'Guardando...' : !camposRequeridosCompletos ? 'Completa los campos requeridos' : 'Guardar Cambios'}
          >
            {guardando ? (
              <div className="w-7 h-7 2xl:w-7 2xl:h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-7 h-7 2xl:w-7 2xl:h-7 group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>,
        document.body
      )}

    </div>
  );
}
