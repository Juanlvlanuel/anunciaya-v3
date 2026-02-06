/**
 * ============================================================================
 * MODAL: Duplicar Oferta a Sucursales
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/ModalDuplicarOferta.tsx
 * 
 * PROPÓSITO:
 * Modal para duplicar una oferta existente a otras sucursales
 * Solo disponible para dueños (sin sucursalAsignada)
 * 
 * FEATURES:
 * - Selección múltiple de sucursales
 * - Preview de la oferta a duplicar
 * - Validación de sucursales
 * 
 * ACTUALIZADO: Enero 2026 - Migrado a Modal.tsx genérico
 */

import { useState, useEffect } from 'react';
import {
    Copy,
    Building2,
    MapPin,
    Tag,
    CheckCircle,
    AlertCircle,
    Percent,
    DollarSign,
    Gift,
    Truck,
    Sparkles,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { Boton } from '../../../../components/ui/Boton';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { obtenerSucursalesNegocio, type Sucursal } from '../../../../services/negociosService';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { Oferta, DuplicarOfertaInput, TipoOferta } from '../../../../types/ofertas';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalDuplicarOfertaProps {
    oferta: Oferta;
    onDuplicar: (datos: DuplicarOfertaInput) => Promise<void>;
    onCerrar: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Retorna el ícono correspondiente según el tipo de oferta
 */
function getIconoTipo(tipo: TipoOferta) {
    switch (tipo) {
        case 'porcentaje':
            return Percent;
        case 'monto_fijo':
            return DollarSign;
        case '2x1':
        case '3x2':
            return Gift;
        case 'envio_gratis':
            return Truck;
        case 'otro':
            return Sparkles;
        default:
            return Tag;
    }
}

/**
 * Formatea el valor de la oferta para mostrar
 */
function formatearValor(tipo: TipoOferta, valor: string | null): string {
    if (!valor) return tipo.toUpperCase();

    switch (tipo) {
        case 'porcentaje':
            return `${valor}% OFF`;
        case 'monto_fijo':
            return `$${Number(valor).toFixed(2)} OFF`;
        case '2x1':
            return '2×1';
        case '3x2':
            return '3×2';
        case 'envio_gratis':
            return 'ENVÍO GRATIS';
        case 'otro':
            return valor;
        default:
            return String(tipo).toUpperCase();
    }
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalDuplicarOferta({ oferta, onDuplicar, onCerrar }: ModalDuplicarOfertaProps) {
    const { usuario } = useAuthStore();
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [sucursalesSeleccionadas, setSucursalesSeleccionadas] = useState<Set<string>>(new Set());
    const [cargando, setCargando] = useState(true);
    const [duplicando, setDuplicando] = useState(false);

    // Icono y valor formateado
    const IconoTipo = getIconoTipo(oferta.tipo);
    const valorFormateado = formatearValor(oferta.tipo, oferta.valor);

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

    const seleccionarTodas = () => {
        const todasIds = sucursales.map((s) => s.id);
        setSucursalesSeleccionadas(new Set(todasIds));
    };

    const deseleccionarTodas = () => {
        setSucursalesSeleccionadas(new Set());
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
                    <p className="text-slate-600 text-sm mt-3">Cargando sucursales...</p>
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
                    <p className="text-slate-600 text-sm mb-4">
                        Necesitas al menos 2 sucursales para duplicar ofertas
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
            titulo="Duplicar Oferta"
            iconoTitulo={<Copy className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />}
            ancho="lg"
            paddingContenido="none"
            sinScrollInterno={true}
        >
            <div className="flex flex-col h-full">
                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">
                {/* Preview de la oferta */}
                <div className="bg-slate-50 rounded-lg p-3 lg:p-2 2xl:p-3 border border-slate-200">
                    <p className="text-sm lg:text-sm 2xl:text-sm text-slate-500 mb-2 lg:mb-1.5 2xl:mb-2 font-medium">Oferta a duplicar:</p>
                    <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
                        {oferta.imagen ? (
                            <img
                                src={oferta.imagen}
                                alt={oferta.titulo}
                                className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-14 2xl:h-14 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-14 2xl:h-14 bg-slate-200 rounded-lg flex items-center justify-center">
                                <IconoTipo className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-400" />
                            </div>
                        )}

                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-800 text-base lg:text-sm 2xl:text-base truncate">
                                {oferta.titulo}
                            </h3>
                            <p className="text-slate-500 text-sm lg:text-xs 2xl:text-sm">
                                {valorFormateado}
                                {oferta.compraMinima && Number(oferta.compraMinima) > 0 && (
                                    <span> • Compra mín: ${Number(oferta.compraMinima).toFixed(2)}</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Controles */}
                <div className="flex items-center justify-between">
                    <p className="text-sm lg:text-sm 2xl:text-sm font-medium text-slate-600">
                        Sucursales destino ({sucursalesSeleccionadas.size} de {sucursales.length})
                    </p>

                    <div className="flex gap-2 text-sm lg:text-xs 2xl:text-sm">
                        <button
                            onClick={seleccionarTodas}
                            className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                            Todas
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                            onClick={deseleccionarTodas}
                            className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                        >
                            Ninguna
                        </button>
                    </div>
                </div>

                    {/* Lista de sucursales */}
                    <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2 max-h-[40vh] lg:max-h-[50vh] overflow-y-auto">
                        {sucursales.map((sucursal) => {
                            const estaSeleccionada = sucursalesSeleccionadas.has(sucursal.id);

                            return (
                                <button
                                    key={sucursal.id}
                                    onClick={() => toggleSucursal(sucursal.id)}
                                    className={`w-full p-3 lg:p-2 2xl:p-3 rounded-lg border-2 transition-all text-left cursor-pointer ${estaSeleccionada
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
                                        {/* Checkbox */}
                                        <div
                                            className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded border-2 flex items-center justify-center shrink-0 ${estaSeleccionada ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                                                }`}
                                        >
                                            {estaSeleccionada && <CheckCircle className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />}
                                        </div>

                                        {/* Icono */}
                                        <Building2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-400 shrink-0" />

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 text-base lg:text-sm 2xl:text-base truncate">
                                                {sucursal.nombre}
                                            </p>
                                            <div className="flex items-center gap-1 text-slate-500 text-sm lg:text-xs 2xl:text-sm">
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

                {/* Footer con botones - FUERA del scroll */}
                <div className="border-t border-slate-200 p-4 lg:p-3 2xl:p-4 bg-white">
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

export default ModalDuplicarOferta;