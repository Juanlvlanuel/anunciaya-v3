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
 * CREADO: Fase 5.4.2 - Ofertas CRUD Frontend - Sistema de Duplicación
 * ACTUALIZADO: Corrección de tipos TypeScript
 */

import { useState, useEffect } from 'react';
import {
    X,
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

    const IconoTipo = getIconoTipo(oferta.tipo);
    const valorFormateado = formatearValor(oferta.tipo, oferta.valor);

    // ===========================================================================
    // CARGAR SUCURSALES
    // ===========================================================================

    useEffect(() => {
        cargarSucursales();
    }, [usuario]);

    // Bloquear scroll del body de forma robusta
    useEffect(() => {
        // Guardar posición actual del scroll
        const scrollY = window.scrollY;

        // Bloquear scroll del body y html
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            // Restaurar scroll
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            window.scrollTo(0, scrollY);
        };
    }, []);

    const cargarSucursales = async () => {
        if (!usuario?.negocioId) {
            notificar.error('No se pudo obtener el negocio del usuario');
            setCargando(false);
            return;
        }

        try {
            setCargando(true);
            const respuesta = await obtenerSucursalesNegocio(usuario.negocioId);

            if (respuesta.success && respuesta.data) {
                // Mostrar TODAS las sucursales (incluyendo la actual para testing)
                setSucursales(respuesta.data);
            }
            else {
                notificar.error('Error al cargar sucursales');
            }
        } catch (error) {
            console.error('Error cargando sucursales:', error);
            notificar.error('Error al cargar sucursales');
        } finally {
            setCargando(false);
        }
    };

    // ===========================================================================
    // HANDLERS
    // ===========================================================================

    const toggleSucursal = (id: string) => {
        setSucursalesSeleccionadas((prev) => {
            const nuevo = new Set(prev);
            if (nuevo.has(id)) {
                nuevo.delete(id);
            } else {
                nuevo.add(id);
            }
            return nuevo;
        });
    };

    const seleccionarTodas = () => {
        setSucursalesSeleccionadas(new Set(sucursales.map((s) => s.id)));
    };

    const deseleccionarTodas = () => {
        setSucursalesSeleccionadas(new Set());
    };

    const handleDuplicar = async () => {
        if (sucursalesSeleccionadas.size === 0) {
            notificar.error('Selecciona al menos una sucursal');
            return;
        }

        try {
            setDuplicando(true);

            const datos: DuplicarOfertaInput = {
                sucursalesIds: Array.from(sucursalesSeleccionadas),
            };

            await onDuplicar(datos);
        } catch (error) {
            console.error('Error al duplicar:', error);
        } finally {
            setDuplicando(false);
        }
    };

    // ===========================================================================
    // RENDER: LOADING
    // ===========================================================================

    if (cargando) {
        return (
            <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={onCerrar}
            >
                <div
                    className="bg-white rounded-xl w-full max-w-sm lg:max-w-sm 2xl:max-w-sm p-6 lg:p-3 2xl:p-6 text-center shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Spinner tamanio="md" />
                    <p className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm mt-3 lg:mt-1.5 2xl:mt-3">Cargando sucursales...</p>
                </div>
            </div>
        );
    }

    // ===========================================================================
    // RENDER: SIN SUCURSALES
    // ===========================================================================

    if (sucursales.length === 0) {
        return (
            <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={onCerrar}
            >
                <div
                    className="bg-white rounded-xl w-full max-w-sm lg:max-w-sm 2xl:max-w-sm p-6 lg:p-3 2xl:p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 lg:w-6 lg:h-6 2xl:w-12 2xl:h-12 text-amber-500 mx-auto mb-3" />
                        <h3 className="text-lg lg:text-sm 2xl:text-lg font-bold text-slate-800 mb-2 lg:mb-1.5 2xl:mb-2">
                            Sin sucursales
                        </h3>
                        <p className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm mb-4 lg:mb-2 lg:mb-1.5 2xl:mb-2.5 2xl:mb-4">
                            No se encontraron sucursales para duplicar
                        </p>
                        <Boton variante="primario" onClick={onCerrar} tamanio="sm">
                            Entendido
                        </Boton>
                    </div>
                </div>
            </div>
        );
    }

    // ===========================================================================
    // RENDER: PRINCIPAL
    // ===========================================================================

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onCerrar}
        >
            <div
                className="bg-white rounded-xl w-full max-w-lg lg:max-w-sm 2xl:max-w-lg max-h-[80vh] lg:max-h-[80vh] 2xl:max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 lg:p-2.5 2xl:p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <Copy className="w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 text-blue-600" />
                        <h2 className="text-lg lg:text-sm 2xl:text-lg font-bold text-slate-800">Duplicar Oferta</h2>
                    </div>
                    <button
                        onClick={onCerrar}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-2.5 2xl:p-4 space-y-4 lg:space-y-2 2xl:space-y-4">
                    {/* Preview de la oferta */}
                    <div className="bg-slate-50 rounded-lg p-3 lg:p-1.5 2xl:p-3 border border-slate-200">
                        <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 mb-2 lg:mb-1.5 2xl:mb-2">Oferta a duplicar:</p>
                        <div className="flex items-center gap-3 lg:gap-1.5 2xl:gap-3">
                            {oferta.imagen ? (
                                <img
                                    src={oferta.imagen}
                                    alt={oferta.titulo}
                                    className="w-14 h-14 lg:w-8 lg:h-8 2xl:w-14 2xl:h-14 rounded-lg object-cover"
                                />
                            ) : (
                                <div className="w-14 h-14 lg:w-8 lg:h-8 2xl:w-14 2xl:h-14 bg-slate-200 rounded-lg flex items-center justify-center">
                                    <IconoTipo className="w-6 h-6 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6 text-slate-400" />
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-800 text-sm lg:text-[11px] 2xl:text-sm truncate">{oferta.titulo}</h3>
                                <p className="text-slate-500 text-xs lg:text-[11px] 2xl:text-xs">
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
                        <p className="text-xs lg:text-[11px] 2xl:text-xs font-medium text-slate-600">
                            Sucursales destino ({sucursalesSeleccionadas.size} de {sucursales.length})
                        </p>

                        <div className="flex gap-2 lg:gap-0.5 2xl:gap-2 text-xs lg:text-[11px] 2xl:text-xs">
                            <button
                                onClick={seleccionarTodas}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Todas
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                                onClick={deseleccionarTodas}
                                className="text-slate-500 hover:text-slate-700 font-medium"
                            >
                                Ninguna
                            </button>
                        </div>
                    </div>

                    {/* Lista de sucursales */}
                    <div className="space-y-1.5">
                        {sucursales.map((sucursal) => {
                            const estaSeleccionada = sucursalesSeleccionadas.has(sucursal.id);

                            return (
                                <button
                                    key={sucursal.id}
                                    onClick={() => toggleSucursal(sucursal.id)}
                                    className={`
                    w-full p-3 lg:p-1.5 2xl:p-3 rounded-lg border transition-all text-left
                    ${estaSeleccionada
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }
                  `}
                                >
                                    <div className="flex items-center gap-2">
                                        {/* Checkbox */}
                                        <div
                                            className={`
                        w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                        ${estaSeleccionada
                                                    ? 'border-blue-500 bg-blue-500'
                                                    : 'border-slate-300'
                                                }
                      `}
                                        >
                                            {estaSeleccionada && <CheckCircle className="w-4 h-4 lg:w-2.5 lg:h-2.5 2xl:w-4 2xl:h-4 text-white" />}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-3.5 h-3.5 lg:w-2 lg:h-2 2xl:w-3.5 2xl:h-3.5 text-slate-400 shrink-0" />
                                                <h4 className="font-medium text-slate-800 text-sm lg:text-[11px] 2xl:text-sm truncate">
                                                    {sucursal.nombre}
                                                </h4>
                                                {sucursal.esPrincipal && (
                                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs lg:text-[10px] 2xl:text-xs font-medium rounded">
                                                        Principal
                                                    </span>
                                                )}
                                            </div>

                                            {(sucursal.direccion || sucursal.ciudad) && (
                                                <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                                                    <MapPin className="w-3 h-3 lg:w-1.5 lg:h-1.5 2xl:w-3 2xl:h-3 shrink-0" />
                                                    <span className="truncate">
                                                        {[sucursal.direccion, sucursal.ciudad]
                                                            .filter(Boolean)
                                                            .join(', ')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Info adicional */}
                    <div className="bg-amber-50 rounded-lg p-3 lg:p-1.5 2xl:p-3 border border-amber-200">
                        <p className="text-xs text-amber-800">
                            <strong>Nota:</strong> Se creará una copia independiente en cada sucursal seleccionada.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 lg:gap-2 2xl:gap-2 p-4 lg:p-2.5 2xl:p-4 border-t border-slate-200 bg-slate-50">
                    <Boton
                        variante="outline"
                        onClick={onCerrar}
                        className="flex-1"
                        disabled={duplicando}
                        tamanio="sm"
                    >
                        Cancelar
                    </Boton>
                    <Boton
                        variante="primario"
                        iconoIzquierda={<Copy className="w-4 h-4" />}
                        onClick={handleDuplicar}
                        className="flex-1"
                        disabled={duplicando || sucursalesSeleccionadas.size === 0}
                        cargando={duplicando}
                        tamanio="sm"
                    >
                        Duplicar a {sucursalesSeleccionadas.size}
                    </Boton>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default ModalDuplicarOferta;