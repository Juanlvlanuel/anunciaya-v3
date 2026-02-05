/**
 * SearchPanel.tsx - VERSIÓN REFACTORIZADA v2.0
 * ==============================================
 * Panel de búsqueda que usa ModalBottom como base.
 *
 * ✨ MEJORAS v2.0:
 * - Usa ModalBottom para toda la lógica de modal
 * - Código más limpio y mantenible
 * - Drag to close incluido
 * - Animaciones mejoradas
 * - Menos código duplicado
 *
 * ✨ CARACTERÍSTICAS:
 * - 🔍 Input de búsqueda amplio
 * - 📍 Selector de ubicación integrado
 * - 🏷️ Filtros rápidos (Negocios, Ofertas, Market, Dinámicas)
 * - 📊 Resultados en tiempo real
 * - 🌫️ Overlay con backdrop-blur-sm
 * - 👆 Drag to close
 *
 * Ubicación: apps/web/src/components/layout/SearchPanel.tsx
 */

import { useState } from 'react';
import { Search, MapPin, ChevronDown, Store, Tag, ShoppingCart, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../stores/useUiStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { ModalBottom } from '../ui/ModalBottom';

// =============================================================================
// TIPOS
// =============================================================================

type FiltroType = 'negocios' | 'ofertas' | 'market' | 'dinamicas' | null;

interface FiltroItem {
  id: FiltroType;
  label: string;
  icon: React.ElementType;
  color: string;
}

// =============================================================================
// DATOS
// =============================================================================

const FILTROS: FiltroItem[] = [
  { id: 'negocios', label: 'Negocios', icon: Store, color: 'blue' },
  { id: 'ofertas', label: 'Ofertas', icon: Tag, color: 'orange' },
  { id: 'market', label: 'Market', icon: ShoppingCart, color: 'green' },
  { id: 'dinamicas', label: 'Dinámicas', icon: Gift, color: 'purple' },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function SearchPanel() {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const searchPanelAbierto = useUiStore((state) => state.searchPanelAbierto);
  const cerrarSearchPanel = useUiStore((state) => state.cerrarSearchPanel);
  const abrirModalUbicacion = useUiStore((state) => state.abrirModalUbicacion);
  
  const ciudadData = useGpsStore((state) => state.ciudad);

  // ---------------------------------------------------------------------------
  // Estados locales
  // ---------------------------------------------------------------------------
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<FiltroType>(null);
  
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCerrar = () => {
    cerrarSearchPanel();
    // Limpiar después de cerrar
    setTimeout(() => {
      setBusqueda('');
      setFiltroActivo(null);
    }, 300);
  };

  const handleAbrirUbicacion = () => {
    abrirModalUbicacion();
  };

  const handleBuscar = () => {
    if (busqueda.trim()) {
      // Navegar según el filtro
      if (filtroActivo === 'negocios') {
        navigate(`/negocios?q=${encodeURIComponent(busqueda)}`);
      } else if (filtroActivo === 'ofertas') {
        navigate(`/ofertas?q=${encodeURIComponent(busqueda)}`);
      } else if (filtroActivo === 'market') {
        navigate(`/marketplace?q=${encodeURIComponent(busqueda)}`);
      } else if (filtroActivo === 'dinamicas') {
        navigate(`/dinamicas?q=${encodeURIComponent(busqueda)}`);
      } else {
        navigate(`/buscar?q=${encodeURIComponent(busqueda)}`);
      }
      
      handleCerrar();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBuscar();
    }
  };

  const handleClickFiltro = (filtroId: FiltroType) => {
    setFiltroActivo(filtroId === filtroActivo ? null : filtroId);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <ModalBottom
      abierto={searchPanelAbierto}
      onCerrar={handleCerrar}
      mostrarHeader={false}
      mostrarBotonCerrar={false}
      cerrarAlClickFuera={true}
      cerrarConEscape={true}
      alturaMaxima="lg"
      sinScrollInterno={true}
    >
      {/* Contenedor con scroll propio */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* === BARRA DE BÚSQUEDA === */}
        <div className="px-4 pt-2 pb-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 bg-white border-2 border-blue-500 rounded-xl px-4 py-3 shadow-sm">
            <Search className="w-5 h-5 text-blue-500 shrink-0" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Busca negocios, ofertas, productos..."
              className="flex-1 bg-transparent text-base text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>
        </div>

        {/* === SELECTOR DE UBICACIÓN === */}
        <div className="px-4 py-3 bg-blue-50/50 border-b border-blue-100 shrink-0">
          <button
            onClick={handleAbrirUbicacion}
            className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all active:scale-98"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs text-blue-600 font-medium">UBICACIÓN</p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {ciudadData?.nombreCompleto || 'Seleccionar ubicación'}
              </p>
            </div>
            <ChevronDown className="w-5 h-5 text-blue-400 shrink-0" />
          </button>
        </div>

        {/* === FILTROS RÁPIDOS === */}
        <div className="px-4 py-3 border-b border-gray-200 shrink-0">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Filtrar por
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FILTROS.map((filtro) => {
              const IconoFiltro = filtro.icon;
              const estaActivo = filtroActivo === filtro.id;
              
              return (
                <button
                  key={filtro.id}
                  onClick={() => handleClickFiltro(filtro.id)}
                  className={`
                    flex items-center gap-2 p-3 rounded-lg border-2 transition-all
                    ${estaActivo
                      ? `border-${filtro.color}-500 bg-${filtro.color}-50`
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    ${estaActivo
                      ? `bg-${filtro.color}-500`
                      : `bg-${filtro.color}-100`
                    }
                  `}>
                    <IconoFiltro className={`w-4 h-4 ${estaActivo ? 'text-white' : `text-${filtro.color}-600`}`} />
                  </div>
                  <span className={`text-sm font-medium ${estaActivo ? 'text-gray-900' : 'text-gray-600'}`}>
                    {filtro.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* === RESULTADOS / BÚSQUEDAS RECIENTES === */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {busqueda.trim() ? (
            // Resultados en tiempo real
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Resultados para "{busqueda}"
              </p>
              
              {/* TODO: Implementar búsqueda real */}
              <div className="text-center py-8 text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Presiona Enter para buscar</p>
              </div>
            </div>
          ) : (
            // Búsquedas recientes
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Búsquedas recientes
              </p>
              
              {/* TODO: Implementar búsquedas recientes */}
              <div className="space-y-2">
                <BusquedaRecienteItem texto="Restaurantes japoneses" />
                <BusquedaRecienteItem texto="Tiendas de electrónica" />
                <BusquedaRecienteItem texto="Gimnasios cerca" />
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalBottom>
  );
}

// =============================================================================
// SUBCOMPONENTE: BusquedaRecienteItem
// =============================================================================

interface BusquedaRecienteItemProps {
  texto: string;
}

function BusquedaRecienteItem({ texto }: BusquedaRecienteItemProps) {
  return (
    <button className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
      <Search className="w-4 h-4 text-gray-400 shrink-0" />
      <span className="text-sm text-gray-700 flex-1">{texto}</span>
    </button>
  );
}

export default SearchPanel;