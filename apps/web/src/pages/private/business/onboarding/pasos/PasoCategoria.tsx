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

import { useState, useEffect, useRef } from 'react';
import {
    Utensils, HeartPulse, Wrench, ShoppingBag, GraduationCap,
    Sparkles, Car, Theater,
    Pencil, Info, Loader2, Check, ChevronDown,
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
// CACHÉ — persiste entre montar/desmontar el componente
// =============================================================================

const cache1 = {
    cargado: false,
    categorias: [] as Categoria[],
    subcategorias: [] as Subcategoria[],
    nombreNegocio: '',
    categoriaSeleccionada: null as number | null,
    subcategoriasSeleccionadas: new Set<number>(),
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function PasoCategoria() {
    const { negocioId, guardarPaso1, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados locales — inicializar desde caché si existe
    const [nombreNegocio, setNombreNegocio] = useState(cache1.nombreNegocio);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<number | null>(cache1.categoriaSeleccionada);
    const [subcategoriasSeleccionadas, setSubcategoriasSeleccionadas] = useState<Set<number>>(cache1.subcategoriasSeleccionadas);
    const [mostrarMensajeLimite, setMostrarMensajeLimite] = useState(false);

    // Estados de carga — si ya cargamos, no mostrar spinner
    const [cargandoCategorias, setCargandoCategorias] = useState(!cache1.cargado);
    const [cargandoSubcategorias] = useState(false);
    const [cargandoNombre, setCargandoNombre] = useState(!cache1.cargado);

    // Datos de API
    const [categorias, setCategorias] = useState<Categoria[]>(cache1.categorias);
    const [subcategorias, setSubcategorias] = useState<Subcategoria[]>(cache1.subcategorias);

    // Dropdowns
    const [abiertoCat, setAbiertoCat] = useState(false);
    const [abiertoSubcat, setAbiertoSubcat] = useState(false);
    const refCategoria = useRef<HTMLDivElement>(null);
    const refSubcategoria = useRef<HTMLDivElement>(null);

    // Cerrar dropdowns al hacer clic fuera
    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (refCategoria.current && !refCategoria.current.contains(e.target as Node)) {
                setAbiertoCat(false);
            }
            if (refSubcategoria.current && !refSubcategoria.current.contains(e.target as Node)) {
                setAbiertoSubcat(false);
            }
        };
        document.addEventListener('mousedown', handleClickFuera);
        return () => document.removeEventListener('mousedown', handleClickFuera);
    }, []);

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
    // Sincronizar caché al cambiar datos
    // ---------------------------------------------------------------------------
    useEffect(() => {
        cache1.nombreNegocio = nombreNegocio;
        cache1.categoriaSeleccionada = categoriaSeleccionada;
        cache1.subcategoriasSeleccionadas = subcategoriasSeleccionadas;
        cache1.subcategorias = subcategorias;
    }, [nombreNegocio, categoriaSeleccionada, subcategoriasSeleccionadas, subcategorias]);

    // ---------------------------------------------------------------------------
    // Cargar categorías
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (cache1.cargado) { setCargandoCategorias(false); return; }
        const cargarCategorias = async () => {
            try {
                const response = await api.get<{
                    success: boolean;
                    data: Categoria[];
                }>('/categorias');

                if (response.data.success) {
                    setCategorias(response.data.data);
                    cache1.categorias = response.data.data;
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
        if (cache1.cargado) { setCargandoNombre(false); return; }
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
                            const subcatsDeCategoria = responseSubcats.data.data.map((s: Subcategoria) => s.id);

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
                cache1.cargado = true;
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
        setSubcategorias([]);

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
        const guardarFn = async (validar: boolean): Promise<boolean> => {
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
                const datos = {
                    nombre: nombreNegocio.trim() || undefined,
                    subcategoriasIds: subcategoriasSeleccionadas.size > 0 ? Array.from(subcategoriasSeleccionadas) : undefined,
                };

                if (validar) {
                    await guardarPaso1(datos as Parameters<typeof guardarPaso1>[0]);
                } else {
                    const { guardarBorradorPaso1 } = useOnboardingStore.getState();
                    await guardarBorradorPaso1(datos);
                }

                return true;
            } catch (error) {
                console.error('Error al guardar paso 1:', error);
                return false;
            }
        };

        (window as unknown as Record<string, unknown>).guardarPaso1 = guardarFn;

        return () => {
            delete (window as unknown as Record<string, unknown>).guardarPaso1;
        };
    }, [nombreNegocio, categoriaSeleccionada, subcategoriasSeleccionadas]);

    // ---------------------------------------------------------------------------
    // Render de carga
    // ---------------------------------------------------------------------------
    if (cargandoCategorias || cargandoNombre) {
        return (
            <div className="flex items-center justify-center py-8 lg:py-10 2xl:py-12">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 animate-spin text-slate-600 mx-auto mb-2 lg:mb-3" />
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal — Cards estilo Mi Perfil + Dropdowns
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-4 lg:space-y-3.5 2xl:space-y-5">

            {/* ================================================================= */}
            {/* CARD: Nombre del negocio */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                        <Pencil className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">
                        Nombre del negocio
                    </span>
                </div>
                <div className="p-4 lg:p-3 2xl:p-4">
                    <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 border-slate-300"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                        <input
                            type="text"
                            value={nombreNegocio}
                            onChange={(e) => setNombreNegocio(e.target.value)}
                            placeholder="Ej: La Casa del Pan"
                            maxLength={100}
                            className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                        />
                    </div>
                    <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mt-1.5">
                        {nombreNegocio.length}/100 caracteres
                    </p>
                </div>
            </div>

            {/* ================================================================= */}
            {/* CARD: Categoría del negocio */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                        <Store className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">
                        Categoría del negocio
                    </span>
                </div>
                <div className="p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-2.5 2xl:space-y-3">

                    {/* ---- Fila: Categoría + Subcategorías lado a lado ---- */}
                    <div className="grid grid-cols-2 gap-3 lg:gap-2.5 2xl:gap-3">

                        {/* Dropdown Categoría */}
                        <div>
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 block">
                                Categoría <span className="text-red-500">*</span>
                            </label>
                            <div ref={refCategoria} className="relative">
                                <div
                                    onClick={() => setAbiertoCat(!abiertoCat)}
                                    className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 lg:px-2.5 2xl:px-3 border-2 border-slate-300 hover:border-slate-400 cursor-pointer"
                                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {categoriaSeleccionada ? (
                                            <>
                                                {(() => {
                                                    const cat = categorias.find(c => c.id === categoriaSeleccionada);
                                                    if (!cat) return null;
                                                    const Icono = getIconoPorNombre(cat.nombre);
                                                    return <Icono className="w-4 h-4 text-slate-700 shrink-0" />;
                                                })()}
                                                <span className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-800 truncate">
                                                    {categorias.find(c => c.id === categoriaSeleccionada)?.nombre}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-500">
                                                Selecciona...
                                            </span>
                                        )}
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ${abiertoCat ? 'rotate-180' : ''}`} />
                                </div>

                                {abiertoCat && (
                                    <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg overflow-hidden">
                                        <div className="max-h-[250px] lg:max-h-60 2xl:max-h-72 overflow-y-auto py-1">
                                            {categorias.map((categoria) => {
                                                const seleccionada = categoriaSeleccionada === categoria.id;
                                                const Icono = getIconoPorNombre(categoria.nombre);
                                                return (
                                                    <button
                                                        key={categoria.id}
                                                        type="button"
                                                        onClick={() => {
                                                            handleSeleccionarCategoria(categoria.id);
                                                            setAbiertoCat(false);
                                                            setAbiertoSubcat(false);
                                                        }}
                                                        className={`
                                                            w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors
                                                            ${seleccionada
                                                                ? 'bg-indigo-100 text-indigo-700 font-semibold'
                                                                : 'text-slate-600 font-medium hover:bg-slate-200'
                                                            }
                                                        `}
                                                    >
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${seleccionada ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                                            {seleccionada && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <Icono className={`w-4 h-4 shrink-0 ${seleccionada ? 'text-indigo-700' : 'text-slate-500'}`} />
                                                        <span className="flex-1 text-sm lg:text-sm 2xl:text-base">
                                                            {categoria.nombre}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dropdown Subcategorías */}
                        <div>
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 block">
                                Subcategorías <span className="text-red-500">*</span>
                            </label>

                            {!categoriaSeleccionada ? (
                                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 lg:px-2.5 2xl:px-3 border-2 border-slate-300 opacity-50 cursor-not-allowed"
                                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <span className="text-sm lg:text-sm 2xl:text-base text-slate-600 font-medium flex-1">
                                        Elige categoría
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                                </div>
                            ) : (
                                <div ref={refSubcategoria} className="relative">
                                    <div
                                        onClick={() => !cargandoSubcategorias && setAbiertoSubcat(!abiertoSubcat)}
                                        className={`flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 lg:px-2.5 2xl:px-3 border-2 border-slate-300 ${cargandoSubcategorias ? 'cursor-wait' : 'hover:border-slate-400 cursor-pointer'}`}
                                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                                    >
                                        <span className={`text-sm lg:text-sm 2xl:text-base font-medium flex-1 ${
                                            subcategoriasSeleccionadas.size > 0 ? 'text-slate-800' : 'text-slate-500'
                                        }`}>
                                            {cargandoSubcategorias
                                                ? 'Cargando...'
                                                : subcategoriasSeleccionadas.size > 0
                                                    ? `${subcategoriasSeleccionadas.size} Selecc.`
                                                    : 'Selecciona...'
                                            }
                                        </span>
                                        {cargandoSubcategorias
                                            ? <Loader2 className="w-4 h-4 text-slate-500 shrink-0 animate-spin" />
                                            : <ChevronDown className={`w-4 h-4 text-slate-600 shrink-0 transition-transform ${abiertoSubcat ? 'rotate-180' : ''}`} />
                                        }
                                    </div>

                                    {abiertoSubcat && (
                                        <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg overflow-hidden">
                                            <div className="max-h-[250px] lg:max-h-60 2xl:max-h-72 overflow-y-auto py-1">
                                                {subcategorias.map((subcategoria) => {
                                                    const seleccionada = subcategoriasSeleccionadas.has(subcategoria.id);
                                                    return (
                                                        <button
                                                            key={subcategoria.id}
                                                            type="button"
                                                            onClick={() => handleToggleSubcategoria(subcategoria.id)}
                                                            className={`
                                                                w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer transition-colors
                                                                ${seleccionada
                                                                    ? 'bg-indigo-100 text-indigo-700 font-semibold'
                                                                    : 'text-slate-600 font-medium hover:bg-slate-200'
                                                                }
                                                            `}
                                                        >
                                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${seleccionada ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                                            {seleccionada && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                            <span className="flex-1 text-sm lg:text-sm 2xl:text-base">
                                                                {subcategoria.nombre}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contador subcategorías */}
                    {categoriaSeleccionada && (
                        <p className={`text-sm lg:text-[11px] 2xl:text-sm font-bold transition-colors ${
                            subcategoriasSeleccionadas.size >= 3
                                ? 'text-red-600'
                                : 'text-slate-500'
                        }`}>
                            Subcategorías seleccionadas: {subcategoriasSeleccionadas.size}/3
                        </p>
                    )}

                    {/* Alerta límite */}
                    {mostrarMensajeLimite && (
                        <div className="p-2.5 bg-amber-100 border-2 border-amber-300 rounded-lg animate-in fade-in duration-200">
                            <div className="flex items-center gap-2">
                                <div className="shrink-0 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                                    <span className="text-white text-sm font-bold">!</span>
                                </div>
                                <p className="text-sm lg:text-[11px] 2xl:text-sm text-amber-700 font-medium">
                                    Máximo 3 subcategorías. Deselecciona una para cambiar.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="p-3 lg:p-2.5 2xl:p-3 bg-slate-200 border-2 border-slate-300 rounded-lg">
                        <div className="flex gap-2">
                            <Info className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600 shrink-0 mt-0.5" />
                            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 leading-tight">
                                <span className="font-bold text-slate-700">Las categorías ayudan a los clientes a encontrarte.</span> Selecciona las que mejor describan tu negocio.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PasoCategoria;