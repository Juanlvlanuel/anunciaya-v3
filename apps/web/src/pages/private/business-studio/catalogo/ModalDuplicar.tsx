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
 * - Preview del artículo a duplicar en header dark
 * - Validación de sucursales
 *
 * ACTUALIZADO: Marzo 2026 - Rediseño UI con header dark gradiente (hermano de ModalDetalleTransaccionBS)
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Package,
  Wrench,
  CheckCircle,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { Boton } from '../../../../components/ui/Boton';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { usePerfilSucursales } from '../../../../hooks/queries/usePerfil';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { Sucursal } from '../../../../services/negociosService';
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
  const totalSucursalesStore = useAuthStore((s) => s.totalSucursales);
  const setTotalSucursales = useAuthStore((s) => s.setTotalSucursales);
  const { data: sucursalesData, isPending: cargando } = usePerfilSucursales();
  const sucursales = (sucursalesData ?? []) as Sucursal[];
  const [sucursalesSeleccionadas, setSucursalesSeleccionadas] = useState<Set<string>>(new Set());
  const [duplicando, setDuplicando] = useState(false);

  // Auto-seleccionar todas las sucursales cuando cargan
  useEffect(() => {
    if (sucursales.length > 0) {
      setSucursalesSeleccionadas(new Set(sucursales.map((s) => s.id)));
      setTotalSucursales(sucursales.length);
    }
  }, [sucursales.length, setTotalSucursales]);

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
      setSucursalesSeleccionadas(new Set());
    } else {
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
      <ModalAdaptativo abierto={true} onCerrar={onCerrar} ancho="sm" paddingContenido="lg">
        <div className="text-center py-6">
          <Spinner tamanio="md" />
          <p className="text-slate-600 text-base lg:text-sm 2xl:text-base mt-3">Cargando sucursales...</p>
        </div>
      </ModalAdaptativo>
    );
  }

  // ===========================================================================
  // RENDER: SIN SUCURSALES
  // ===========================================================================

  if (sucursales.length === 0) {
    return (
      <ModalAdaptativo abierto={true} onCerrar={onCerrar} ancho="sm" paddingContenido="lg">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">
            Sin sucursales disponibles
          </h3>
          <p className="text-base lg:text-sm 2xl:text-base text-slate-600 mb-4">
            Necesitas al menos 2 sucursales para duplicar artículos
          </p>
          <Boton variante="primario" onClick={onCerrar} tamanio="sm">
            Entendido
          </Boton>
        </div>
      </ModalAdaptativo>
    );
  }

  // ===========================================================================
  // RENDER: PRINCIPAL
  // ===========================================================================

  return (
    <ModalAdaptativo
      abierto={true}
      onCerrar={onCerrar}
      ancho="md"
      headerOscuro
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno={true}
      className="lg:max-w-sm 2xl:max-w-md max-lg:[background:linear-gradient(180deg,#1e3a5f_2.5rem,rgb(248,250,252)_2.5rem)]"
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh]">

        {/* ── Header dark con gradiente azul ── */}
        <div
          className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f, #1e40af)',
            boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
          }}
        >
          {/* Círculos decorativos */}
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
            {/* Imagen / icono del artículo */}
            {articulo.imagenPrincipal ? (
              <img
                src={articulo.imagenPrincipal}
                alt={articulo.nombre}
                className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 rounded-xl object-cover shrink-0 ring-2 ring-white/30"
              />
            ) : (
              <div className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                {articulo.tipo === 'producto' ? (
                  <Package className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white/80" />
                ) : (
                  <Wrench className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white/80" />
                )}
              </div>
            )}

            {/* Datos del artículo */}
            <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                {articulo.nombre}
              </h3>
              <p className="text-base lg:text-sm 2xl:text-base text-white/80 font-semibold">
                ${Number(articulo.precioBase).toFixed(2)} · <span className="capitalize">{articulo.tipo}</span>
              </p>
            </div>

            {/* Icono de duplicar */}
            <div className="shrink-0 w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Copy className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />
            </div>
          </div>
        </div>

        {/* ── Cuerpo con scroll ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3">

            {/* Cabecera sucursales */}
            <div className="flex items-center justify-between mb-3 lg:mb-2 2xl:mb-3 pt-1">
              <p className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-700">
                Duplicar a ({sucursalesSeleccionadas.size}/{sucursales.length})
              </p>
              <button
                onClick={toggleTodas}
                className="text-sm lg:text-xs 2xl:text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                {sucursalesSeleccionadas.size === sucursales.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </button>
            </div>

            {/* Lista de sucursales */}
            <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
              {sucursales.map((sucursal) => {
                const seleccionada = sucursalesSeleccionadas.has(sucursal.id);

                return (
                  <button
                    key={sucursal.id}
                    onClick={() => toggleSucursal(sucursal.id)}
                    className={`w-full p-3 lg:p-2.5 2xl:p-3 rounded-xl border-2 transition-all text-left cursor-pointer ${
                      seleccionada
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          seleccionada ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {seleccionada && <CheckCircle className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />}
                      </div>

                      {/* Icono sucursal */}
                      <div className={`w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        seleccionada ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        <Building2 className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 ${
                          seleccionada ? 'text-blue-600' : 'text-slate-400'
                        }`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-base lg:text-sm 2xl:text-base truncate ${
                          seleccionada ? 'text-blue-800' : 'text-slate-800'
                        }`}>
                          {sucursal.nombre}
                        </p>
                        <div className="flex items-center gap-1 text-base lg:text-sm 2xl:text-base text-slate-500">
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
        </div>

        {/* ── Footer con botones — FUERA del scroll ── */}
        <div className="border-t border-slate-200 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 bg-white lg:rounded-b-2xl 2xl:rounded-b-2xl shrink-0">
          <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
            <Boton
              variante="secundario"
              onClick={onCerrar}
              className="flex-1 cursor-pointer"
              disabled={duplicando}
            >
              Cancelar
            </Boton>
            <Boton
              variante="primario"
              onClick={handleSubmit}
              className="flex-1 cursor-pointer"
              cargando={duplicando}
              disabled={sucursalesSeleccionadas.size === 0}
            >
              Duplicar ({sucursalesSeleccionadas.size})
            </Boton>
          </div>
        </div>

      </div>
    </ModalAdaptativo>
  );
}

export default ModalDuplicar;
