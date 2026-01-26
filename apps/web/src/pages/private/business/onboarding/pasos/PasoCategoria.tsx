/**
 * PasoCategoria.tsx - REDISEÑADO CON ICONOS ÚNICOS
 * ===================================================
 * Paso 1 del Onboarding - Categorías del Negocio
 * 
 * Mejoras en esta versión:
 * - Iconos únicos por categoría (no todos con casita)
 * - Diseño ultra-compacto (ocupa menos espacio)
 * - Grid más denso y eficiente
 * - Mapeo inteligente de categorías a iconos
 */

import { useState, useEffect } from 'react';
import {
    Utensils, HeartPulse, Wrench, ShoppingBag, GraduationCap,
    Sparkles, Car, Theater,
    Pencil, Info, Loader2, Check,
    Store, Briefcase,
    PawPrint, Plane
} from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface Categoria {
    id: number;
    nombre: string;
    icono: string;
    orden: number;
}

interface Subcategoria {
    id: number;
    nombre: string;
    icono: string | null;
    orden: number;
}

// =============================================================================
// MAPEO DE ICONOS POR NOMBRE DE CATEGORÍA (IGNORAR BACKEND)
// =============================================================================

const ICONOS_POR_CATEGORIA: Record<string, React.ComponentType<{ className?: string }>> = {
    'Comida': Utensils,
    'Salud': HeartPulse,
    'Belleza': Sparkles,
    'Servicios': Wrench,
    'Comercios': ShoppingBag,
    'Diversión': Theater,
    'Movilidad': Car,
    'Finanzas': Briefcase,
    'Educación': GraduationCap,
    'Mascotas': PawPrint,
    'Turismo': Plane,
};

// Función helper para obtener el ícono correcto
const getIconoPorNombre = (nombreCategoria: string) => {
    return ICONOS_POR_CATEGORIA[nombreCategoria] || Store;
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function PasoCategoria() {
    const { negocioId, guardarPaso1, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados locales
    const [nombreNegocio, setNombreNegocio] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(null);
    const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<Set<number>>(new Set());
    const [mostrarMensajeLimite, setMostrarMensajeLimite] = useState(false);

    // Estados de carga
    const [cargandoCategorias, setCargandoCategorias] = useState(true);
    const [cargandoSubcategorias, setCargandoSubcategorias] = useState(false);
    const [cargandoNombre, setCargandoNombre] = useState(true);

    // Datos de API
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);

    // ---------------------------------------------------------------------------
    // Validación en tiempo real
    // ---------------------------------------------------------------------------
    const esFormularioValido = () => {
        return (
            nombreNegocio.trim().length >= 3 &&
            categoriaSeleccionada !== null &&
            subcategoriasSeleccionadas.size > 0
        );
    };

    useEffect(() => {
        const esValido = esFormularioValido();
        setSiguienteDeshabilitado(!esValido);

        // ✅ Actualizar estado de paso completado en tiempo real
        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(0, esValido); // índice 0 = Paso 1
    }, [nombreNegocio, categoriaSeleccionada, subcategoriasSeleccionadas]);

    // ---------------------------------------------------------------------------
    // Cargar categorías
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const cargarCategorias = async () => {
            try {
                const response = await api.get<{
                    success: boolean;
                    data: Categoria[];
                }>('/categorias');

                if (response.data.success) {
                    setCategorias(response.data.data);
                }
            } catch (error) {
                console.error('Error al cargar categorías:', error);
                notificar.error('Error al cargar categorías');
            } finally {
                setCargandoCategorias(false);
            }
        };

        cargarCategorias();
    }, []);

    // ---------------------------------------------------------------------------
    // Cargar datos guardados
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const cargarDatosPaso1 = async () => {
            if (!negocioId) return;

            try {
                const response = await api.get<{
                    success: boolean;
                    data: {
                        negocio: {
                            nombre: string;
                        };
                        subcategoriasSeleccionadas: number[];
                    };
                }>(`/onboarding/${negocioId}/progreso`);

                if (response.data.success && response.data.data) {
                    const { negocio, subcategoriasSeleccionadas: subs } = response.data.data;

                    setNombreNegocio(negocio.nombre);

                    if (subs && subs.length > 0) {
                        const primeraSubcategoria = subs[0];
                        const responseCategorias = await api.get('/categorias');

                        for (const categoria of responseCategorias.data.data) {
                            const responseSubcats = await api.get(`/categorias/${categoria.id}/subcategorias`);
                            const subcatsDeCategoria = responseSubcats.data.data.map((s: any) => s.id);

                            if (subcatsDeCategoria.includes(primeraSubcategoria)) {
                                setCategoriaSeleccionada(categoria.id);
                                setSubcategorias(responseSubcats.data.data);
                                setSubcategoriasSeleccionadas(new Set(subs));
                                break;
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error al cargar datos del paso 1:', error);
            } finally {
                setCargandoNombre(false);
            }
        };

        cargarDatosPaso1();
    }, [negocioId]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleSeleccionarCategoria = async (categoriaId: number) => {
        setCategoriaSeleccionada(categoriaId);
        setSubcategoriasSeleccionadas(new Set());
        setCargandoSubcategorias(true);

        try {
            const response = await api.get<{
                success: boolean;
                data: Subcategoria[];
            }>(`/categorias/${categoriaId}/subcategorias`);

            if (response.data.success) {
                setSubcategorias(response.data.data);
            }
        } catch (error) {
            console.error('Error al cargar subcategorías:', error);
            notificar.error('Error al cargar subcategorías');
        } finally {
            setCargandoSubcategorias(false);
        }
    };

    const handleToggleSubcategoria = (subcategoriaId: number) => {
        setSubcategoriasSeleccionadas((prev) => {
            const nuevas = new Set(prev);

            if (nuevas.has(subcategoriaId)) {
                nuevas.delete(subcategoriaId);
                setMostrarMensajeLimite(false);
                return nuevas;
            }

            if (nuevas.size >= 3) {
                setMostrarMensajeLimite(true);
                setTimeout(() => setMostrarMensajeLimite(false), 3000);
                return prev;
            }

            nuevas.add(subcategoriaId);
            return nuevas;
        });
    };

    // ---------------------------------------------------------------------------
    // GUARDADO UNIFICADO
    // ---------------------------------------------------------------------------
    useEffect(() => {
        (window as any).guardarPaso1 = async (validar: boolean): Promise<boolean> => {
            // Si se requiere validar, revisar que esté completo
            if (validar) {
                if (
                    nombreNegocio.trim().length < 3 ||
                    categoriaSeleccionada === null ||
                    subcategoriasSeleccionadas.size === 0
                ) {
                    notificar.error('Completa todos los campos requeridos');
                    return false;
                }
            }

            try {
                const datos: any = {
                    nombre: nombreNegocio.trim() || null,
                    subcategoriasIds: subcategoriasSeleccionadas.size > 0 ? Array.from(subcategoriasSeleccionadas) : null,
                };

                if (validar) {
                    // Guardar CON validación (avanzar)
                    await guardarPaso1(datos as any);
                } else {
                    // Guardar SIN validación (retroceder/borrador)
                    const { guardarBorradorPaso1 } = useOnboardingStore.getState();
                    await guardarBorradorPaso1(datos as any);
                }

                return true;
            } catch (error) {
                console.error('Error al guardar paso 1:', error);
                return false;
            }
        };

        return () => {
            delete (window as any).guardarPaso1;
        };
    }, [nombreNegocio, categoriaSeleccionada, subcategoriasSeleccionadas]);

    // ---------------------------------------------------------------------------
    // Render de carga
    // ---------------------------------------------------------------------------
    if (cargandoCategorias || cargandoNombre) {
        return (
            <div className="flex items-center justify-center py-8 lg:py-10 2xl:py-12">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 animate-spin text-blue-600 mx-auto mb-2 lg:mb-3" />
                    <p className="text-xs lg:text-sm text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-4 lg:space-y-3.5 2xl:space-y-5">

            {/* Nombre del negocio */}
            <div>
                <label className="block text-sm lg:text-sm 2xl:text-base font-semibold text-slate-900 mb-1.5 lg:mb-1.5 flex items-center gap-2 lg:gap-1.5">
                    <Pencil className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    Nombre del negocio <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={nombreNegocio}
                    onChange={(e) => setNombreNegocio(e.target.value)}
                    placeholder="Ej: La Casa del Pan"
                    maxLength={100}
                    className="w-full px-4 lg:px-3.5 2xl:px-4 py-2.5 lg:py-2 2xl:py-2.5 border-2 border-slate-200 rounded-lg 2xl:rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm lg:text-sm 2xl:text-base transition-all"
                />
                <p className="text-[11px] lg:text-[10px] text-slate-500 mt-0.5">
                    {nombreNegocio.length}/100 caracteres
                </p>
            </div>

            {/* Categorías - ULTRA COMPACTO CON ICONOS ÚNICOS */}
            <div>
                <div className="flex items-center gap-2 lg:gap-1.5 mb-1.5 lg:mb-2">
                    <Store className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-slate-700" />
                    <h3 className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-900">
                        Categoría <span className="text-red-500">*</span>
                    </h3>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8 gap-2 lg:gap-1.5">
                    {categorias.map((categoria) => {
                        const seleccionada = categoriaSeleccionada === categoria.id;
                        const IconoCategoria = getIconoPorNombre(categoria.nombre);

                        return (
                            <button
                                key={categoria.id}
                                onClick={() => handleSeleccionarCategoria(categoria.id)}
                                className={`
                                    relative p-2.5 lg:p-1.5 border-2 rounded-lg transition-all text-center group
                                    ${seleccionada
                                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm'
                                        : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                                    }
                                `}
                            >
                                {seleccionada && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 lg:w-4 lg:h-4 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                        <Check className="w-3.5 h-3.5 lg:w-2.5 lg:h-2.5 text-white" />
                                    </div>
                                )}
                                <div className="flex justify-center mb-0.5">
                                    <IconoCategoria className={`w-6 h-6 lg:w-5 lg:h-5 ${seleccionada ? 'text-blue-600' : 'text-slate-600'}`} />
                                </div>
                                <div className="text-[10px] lg:text-[9px] 2xl:text-[10px] font-semibold text-slate-700 leading-tight px-0.5">
                                    {categoria.nombre}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Subcategorías - ULTRA COMPACTO Y MODERNO */}
            {categoriaSeleccionada && (
                <div>
                    <div className="flex items-center justify-between mb-2 lg:mb-2">
                        <h3 className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-900">
                            Subcategorías (máx. 3) <span className="text-red-500">*</span>
                        </h3>
                        <span
                            className={`text-xs lg:text-xs font-bold px-3 py-1 rounded-full transition-colors ${subcategoriasSeleccionadas.size === 0
                                ? 'bg-slate-100 text-slate-500'
                                : subcategoriasSeleccionadas.size < 3
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-green-100 text-green-600'
                                }`}
                        >
                            {subcategoriasSeleccionadas.size}/3
                        </span>
                    </div>

                    {cargandoSubcategorias ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2 lg:gap-1.5">
                                {subcategorias.map((subcategoria) => {
                                    const seleccionada = subcategoriasSeleccionadas.has(subcategoria.id);
                                    return (
                                        <label
                                            key={subcategoria.id}
                                            className={`
                                                relative flex items-center gap-2.5 p-2.5 lg:p-2 border-2 rounded-lg cursor-pointer transition-all group
                                                ${seleccionada
                                                    ? 'border-blue-600 bg-linear-to-br from-blue-50 to-blue-100 shadow-sm'
                                                    : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50 hover:shadow-sm'
                                                }
                                            `}
                                        >
                                            {/* Checkbox Custom */}
                                            <div className="shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={seleccionada}
                                                    onChange={() => handleToggleSubcategoria(subcategoria.id)}
                                                    className="sr-only"
                                                />
                                                <div className={`
                                                    w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                                    ${seleccionada
                                                        ? 'border-blue-600 bg-blue-600'
                                                        : 'border-slate-300 bg-white group-hover:border-blue-400'
                                                    }
                                                `}>
                                                    {seleccionada && (
                                                        <Check className="w-4 h-4 text-white stroke-[3]" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Texto */}
                                            <span className="text-xs lg:text-xs font-medium text-slate-700 leading-tight flex-1">
                                                {subcategoria.nombre}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>

                            {mostrarMensajeLimite && (
                                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                            <span className="text-white text-sm font-bold">!</span>
                                        </div>
                                        <p className="text-xs lg:text-xs text-amber-800 font-medium">
                                            Máximo 3 subcategorías. Deselecciona una para cambiar.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="hidden lg:block p-2 lg:p-2.5 2xl:p-3 bg-blue-50 border border-blue-100 rounded-lg 2xl:rounded-xl">
                <div className="flex gap-1.5 lg:gap-2">
                    <Info className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[9px] lg:text-[10px] 2xl:text-xs text-blue-700 leading-tight">
                        <span className="font-semibold">Las categorías ayudan a los clientes a encontrarte.</span> Selecciona las que mejor describan tu negocio.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PasoCategoria;