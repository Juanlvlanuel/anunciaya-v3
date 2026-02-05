/**
 * ============================================================================
 * MODAL: Duplicar Artículo a Sucursales
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/catalogo/ModalDuplicar.tsx
 * 
 * PROPÓSITO:
 * Modal para duplicar un artículo existente a otras sucursales
 * Solo disponible para dueños (sin sucursalAsignada)
 * 
 * FEATURES:
 * - Selección múltiple de sucursales
 * - Preview del artículo a duplicar
 * - Validación de sucursales
 * 
 * ACTUALIZADO: Enero 2026 - Migrado a Modal.tsx genérico
 */

import { useState, useEffect } from 'react';
import {
  Copy,
  Building2,
  MapPin,
  Package,
  Wrench,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../../../../components/ui/Modal';
import { Boton } from '../../../../components/ui/Boton';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { obtenerSucursalesNegocio, type Sucursal } from '../../../../services/negociosService';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { Articulo, DuplicarArticuloInput } from '../../../../types/articulos';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalDuplicarProps {
  articulo: Articulo;
  onDuplicar: (datos: DuplicarArticuloInput) => Promise<void>;
  onCerrar: () => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalDuplicar({ articulo, onDuplicar, onCerrar }: ModalDuplicarProps) {
  const { usuario } = useAuthStore();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalesSeleccionadas, setSucursalesSeleccionadas] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  const [duplicando, setDuplicando] = useState(false);

  // ===========================================================================
  // CARGAR SUCURSALES
  // ===========================================================================

  useEffect(() => {
    cargarSucursales();
  }, [usuario]);

  const cargarSucursales = async () => {
    if (!usuario?.negocioId) {
      notificar.error('No se pudo obtener el negocio del usuario');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      const respuesta = await obtenerSucursalesNegocio(usuario.negocioId);

      if (!respuesta.success || !respuesta.data) {
        notificar.error('No se pudieron cargar las sucursales');
        setSucursales([]);
        return;
      }

      setSucursales(respuesta.data);

      // Auto-seleccionar todas las sucursales
      const idsDisponibles = respuesta.data.map((s) => s.id);
      setSucursalesSeleccionadas(new Set(idsDisponibles));

    } catch {
      notificar.error('Error al cargar sucursales');
      setSucursales([]);
    } finally {
      setCargando(false);
    }
  };

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const toggleSucursal = (id: string) => {
    const nuevasSeleccionadas = new Set(sucursalesSeleccionadas);
    if (nuevasSeleccionadas.has(id)) {
      nuevasSeleccionadas.delete(id);
    } else {
      nuevasSeleccionadas.add(id);
    }
    setSucursalesSeleccionadas(nuevasSeleccionadas);
  };

  const toggleTodas = () => {
    if (sucursalesSeleccionadas.size === sucursales.length) {
      // Deseleccionar todas
      setSucursalesSeleccionadas(new Set());
    } else {
      // Seleccionar todas
      const todasIds = sucursales.map((s) => s.id);
      setSucursalesSeleccionadas(new Set(todasIds));
    }
  };

  const handleSubmit = async () => {
    if (sucursalesSeleccionadas.size === 0) {
      notificar.advertencia('Selecciona al menos una sucursal');
      return;
    }

    try {
      setDuplicando(true);
      await onDuplicar({
        sucursalesIds: Array.from(sucursalesSeleccionadas),
      });
      onCerrar();
    } catch {
      // El error ya se maneja en el hook
    } finally {
      setDuplicando(false);
    }
  };

  // ===========================================================================
  // RENDER: LOADING
  // ===========================================================================

  if (cargando) {
    return (
      <Modal abierto={true} onCerrar={onCerrar} ancho="sm" paddingContenido="lg">
        <div className="text-center py-6">
          <Spinner tamanio="md" />
          <p className="text-slate-600 text-sm mt-3">Cargando sucursales...</p>
        </div>
      </Modal>
    );
  }

  // ===========================================================================
  // RENDER: SIN SUCURSALES
  // ===========================================================================

  if (sucursales.length === 0) {
    return (
      <Modal abierto={true} onCerrar={onCerrar} ancho="sm" paddingContenido="lg">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            Sin sucursales disponibles
          </h3>
          <p className="text-slate-600 text-sm mb-4">
            Necesitas al menos 2 sucursales para duplicar artículos
          </p>
          <Boton variante="primario" onClick={onCerrar} tamanio="sm">
            Entendido
          </Boton>
        </div>
      </Modal>
    );
  }

  // ===========================================================================
  // RENDER: PRINCIPAL
  // ===========================================================================

  return (
    <Modal
      abierto={true}
      onCerrar={onCerrar}
      titulo="Duplicar Artículo"
      iconoTitulo={<Copy className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />}
      ancho="lg"
      paddingContenido="md"
    >
      <div className="space-y-4 lg:space-y-3 2xl:space-y-4">
        {/* Preview del artículo */}
        <div className="bg-slate-50 rounded-lg p-3 lg:p-2 2xl:p-3 border border-slate-200">
          <p className="text-xs text-slate-500 mb-2 lg:mb-1.5 2xl:mb-2">Artículo a duplicar:</p>
          <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
            {articulo.imagenPrincipal ? (
              <img
                src={articulo.imagenPrincipal}
                alt={articulo.nombre}
                className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-14 2xl:h-14 rounded-lg object-cover"
              />
            ) : (
              <div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-14 2xl:h-14 bg-slate-200 rounded-lg flex items-center justify-center">
                {articulo.tipo === 'producto' ? (
                  <Package className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-400" />
                ) : (
                  <Wrench className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-400" />
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 text-sm lg:text-xs 2xl:text-sm truncate">
                {articulo.nombre}
              </h3>
              <p className="text-slate-500 text-xs">
                ${Number(articulo.precioBase).toFixed(2)} • <span className="capitalize">{articulo.tipo}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Sucursales */}
        <div>
          <div className="flex items-center justify-between mb-3 lg:mb-2 2xl:mb-3">
            <p className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-700">
              Duplicar a ({sucursalesSeleccionadas.size}/{sucursales.length})
            </p>
            <button
              onClick={toggleTodas}
              className="text-xs lg:text-[11px] 2xl:text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {sucursalesSeleccionadas.size === sucursales.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>

          <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2 max-h-[40vh] overflow-y-auto">
            {sucursales.map((sucursal) => {
              const seleccionada = sucursalesSeleccionadas.has(sucursal.id);

              return (
                <button
                  key={sucursal.id}
                  onClick={() => toggleSucursal(sucursal.id)}
                  className={`w-full p-3 lg:p-2 2xl:p-3 rounded-lg border-2 transition-all text-left ${
                    seleccionada
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
                    {/* Checkbox */}
                    <div
                      className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        seleccionada ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                      }`}
                    >
                      {seleccionada && <CheckCircle className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />}
                    </div>

                    {/* Icono */}
                    <Building2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-400 shrink-0" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm lg:text-xs 2xl:text-sm truncate">
                        {sucursal.nombre}
                      </p>
                      <div className="flex items-center gap-1 text-slate-500 text-xs lg:text-[11px] 2xl:text-xs">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{sucursal.direccion}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex gap-2 lg:gap-1.5 2xl:gap-2 pt-2">
          <Boton
            variante="secundario"
            onClick={onCerrar}
            className="flex-1"
            disabled={duplicando}
          >
            Cancelar
          </Boton>
          <Boton
            variante="primario"
            onClick={handleSubmit}
            className="flex-1"
            cargando={duplicando}
            disabled={sucursalesSeleccionadas.size === 0}
          >
            Duplicar ({sucursalesSeleccionadas.size})
          </Boton>
        </div>
      </div>
    </Modal>
  );
}

export default ModalDuplicar;