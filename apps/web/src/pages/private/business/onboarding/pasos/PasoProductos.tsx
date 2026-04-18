/**
 * PasoProductos.tsx - PASO 8 DEL ONBOARDING (ÚLTIMO PASO)
 * =========================================================
 * Gestión de productos/servicios iniciales del negocio
 * 
 * IMPORTANTE:
 * - Este es el ÚLTIMO paso del onboarding
 * - Requiere mínimo 3 artículos para finalizar
 * - Integra con ModalAgregarProducto para el formulario
 * - Guarda artículos y finaliza el onboarding
 * 
 * VALIDACIÓN:
 * - Mínimo 3 productos/servicios requeridos
 * - Botón "Finalizar" deshabilitado hasta cumplir requisito
 * 
 * CREADO: 25/12/2024
 */

import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Edit2, Trash2, Copy, Loader2, Package, Scissors } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/services/api';
import { ModalArticulo } from '@/pages/private/business-studio/catalogo/ModalArticulo';
import type { Articulo as ArticuloCatalogo, CrearArticuloInput, ActualizarArticuloInput } from '@/types/articulos';
import { notificar } from '@/utils/notificaciones';
import { useNavigate } from 'react-router-dom';
import { eliminarImagenHuerfana } from '@/services/r2Service';

// =============================================================================
// TIPOS
// =============================================================================

interface Articulo {
    id?: string;
    tipo: 'producto' | 'servicio';
    nombre: string;
    descripcion: string;
    categoria?: string;
    precioBase: number;
    imagenPrincipal: string;
    disponible: boolean;
}

// =============================================================================
// CACHÉ
// =============================================================================

const cache8 = {
    cargado: false,
    articulos: [] as Articulo[],
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoProductos() {
    const navigate = useNavigate();
    const { negocioId, guardarPaso8, finalizarOnboarding, setSiguienteDeshabilitado } = useOnboardingStore();
    const { usuario, setUsuario } = useAuthStore();

    // Estados — inicializar desde caché
    const [articulos, setArticulos] = useState<Articulo[]>(cache8.articulos);
    const [cargandoDatos, setCargandoDatos] = useState(!cache8.cargado);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [articuloEditar, setArticuloEditar] = useState<Articulo | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [finalizando, setFinalizando] = useState(false);

    // ---------------------------------------------------------------------------
    // Cargar artículos existentes
    // ---------------------------------------------------------------------------
    // Sincronizar caché
    useEffect(() => { cache8.articulos = articulos; }, [articulos]);

    useEffect(() => {
        if (cache8.cargado) { setCargandoDatos(false); return; }
        if (!negocioId) {
            setCargandoDatos(false);
            return;
        }

        let isMounted = true;

        const cargarDatos = async () => {
            try {
                const response = await api.get(`/onboarding/${negocioId}/progreso`);
                const datos = response.data.data;

                if (datos.articulos && datos.articulos.length > 0 && isMounted) {
                    const articulosMapeados = datos.articulos.map((art: Record<string, unknown>) => ({
                        id: art.id as string,
                        tipo: art.tipo as 'producto' | 'servicio',
                        nombre: art.nombre as string,
                        descripcion: art.descripcion as string,
                        precioBase: parseFloat(String(art.precioBase)),
                        imagenPrincipal: art.imagenPrincipal as string,
                        disponible: (art.disponible as boolean) ?? true,
                    }));

                    const articulosUnicos = articulosMapeados.filter(
                        (art: Articulo, index: number, self: Articulo[]) => index === self.findIndex((a: Articulo) => a.id === art.id)
                    );

                    setArticulos(articulosUnicos);
                }
            } catch (error) {
                console.error('Error al cargar artículos:', error);
            } finally {
                if (isMounted) {
                    setCargandoDatos(false);
                    cache8.cargado = true;
                }
            }
        };

        cargarDatos();

        return () => {
            isMounted = false;
        };
    }, [negocioId]);

    // ---------------------------------------------------------------------------
    // Validación - Habilitar/Deshabilitar botón siguiente
    // ---------------------------------------------------------------------------
    useEffect(() => {
        // Requiere mínimo 3 artículos para finalizar
        const esValido = articulos.length >= 3;
        setSiguienteDeshabilitado(!esValido);

        // ✅ Actualizar estado de paso completado en tiempo real
        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(7, esValido); // índice 7 = Paso 8
    }, [articulos.length]);

    // ---------------------------------------------------------------------------
    // Exponer función de guardado
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const guardarFn = async (validar: boolean): Promise<boolean> => {
            if (validar && articulos.length < 3) {
                notificar.error('Debes agregar al menos 3 productos o servicios');
                return false;
            }

            if (!validar && articulos.length === 0) return true;

            try {
                setGuardando(true);
                const datos = articulos.length > 0 ? articulos : undefined;

                if (validar) {
                    await guardarPaso8(datos as Parameters<typeof guardarPaso8>[0]);
                } else {
                    const { guardarBorradorPaso8 } = useOnboardingStore.getState();
                    await guardarBorradorPaso8(datos as Parameters<typeof guardarBorradorPaso8>[0]);
                }

                setGuardando(false);
                return true;
            } catch (error) {
                console.error('Error al guardar paso 8:', error);
                setGuardando(false);
                return false;
            }
        };

        (window as unknown as Record<string, unknown>).guardarPaso8 = guardarFn;

        return () => {
            delete (window as unknown as Record<string, unknown>).guardarPaso8;
        };
    }, [articulos]);

    // ---------------------------------------------------------------------------
    // Agregar nuevo artículo
    // ---------------------------------------------------------------------------
    // Handler unificado para guardar desde ModalArticulo
    const handleGuardarArticulo = async (datos: CrearArticuloInput | ActualizarArticuloInput) => {
        if (articuloEditar?.id) {
            // Editar existente
            setArticulos(articulos.map(a =>
                a.id === articuloEditar.id
                    ? {
                        ...a,
                        nombre: (datos as CrearArticuloInput).nombre || a.nombre,
                        descripcion: (datos as CrearArticuloInput).descripcion || a.descripcion,
                        categoria: (datos as CrearArticuloInput).categoria || a.categoria,
                        precioBase: (datos as CrearArticuloInput).precioBase ?? a.precioBase,
                        imagenPrincipal: (datos as CrearArticuloInput).imagenPrincipal ?? a.imagenPrincipal,
                        tipo: (datos as CrearArticuloInput).tipo || a.tipo,
                        disponible: (datos as CrearArticuloInput).disponible ?? a.disponible,
                    }
                    : a
            ));
            setArticuloEditar(null);
            notificar.exito('Cambios guardados');
        } else {
            // Crear nuevo
            const crear = datos as CrearArticuloInput;
            const nuevoArticulo: Articulo = {
                id: `temp-${Date.now()}`,
                tipo: crear.tipo,
                nombre: crear.nombre,
                descripcion: crear.descripcion || '',
                categoria: crear.categoria || '',
                precioBase: crear.precioBase,
                imagenPrincipal: crear.imagenPrincipal || '',
                disponible: crear.disponible ?? true,
            };
            setArticulos([...articulos, nuevoArticulo]);
            notificar.exito('Producto agregado');
        }
        setModalAbierto(false);
    };

    // Editar artículo existente
    const handleEditar = (id: string) => {
        const articulo = articulos.find(a => a.id === id);
        if (!articulo) return;
        setArticuloEditar(articulo);
        setModalAbierto(true);
    };

    // ---------------------------------------------------------------------------
    // Eliminar artículo
    // ---------------------------------------------------------------------------
    const eliminarArticulo = async (id: string) => {
        const articulo = articulos.find(a => a.id === id);
        const nuevosArticulos = articulos.filter(a => a.id !== id);

        setArticulos(nuevosArticulos);
        notificar.exito('Producto eliminado');

        // Guardar cambios en el backend (permite array vacío ahora)
        if (negocioId) {
            try {
                await guardarPaso8(nuevosArticulos);
            } catch (error) {
                console.error('❌ Error al actualizar backend:', error);
                setArticulos(articulos);
                notificar.error('Error al eliminar producto');
                return;
            }
        }

        // Eliminar imagen de R2 en segundo plano
        if (articulo?.imagenPrincipal && articulo.imagenPrincipal.startsWith('http') && !articulo.imagenPrincipal.includes('placeholder')) {
            eliminarImagenHuerfana(articulo.imagenPrincipal).catch(() => {});
        }
    };


    // ---------------------------------------------------------------------------
    // Duplicar artículo (copia local, misma imagen — se duplica en R2 al persistir)
    // ---------------------------------------------------------------------------
    const duplicarArticulo = (id: string) => {
        const original = articulos.find(a => a.id === id);
        if (!original) return;

        const copia: Articulo = {
            id: `temp-${Date.now()}`,
            tipo: original.tipo,
            nombre: `${original.nombre} (copia)`,
            descripcion: original.descripcion,
            precioBase: original.precioBase,
            imagenPrincipal: original.imagenPrincipal,
            disponible: original.disponible,
        };

        setArticulos(prev => [...prev, copia]);
        notificar.exito('Producto duplicado');
    };

    // ---------------------------------------------------------------------------
    // Finalizar onboarding
    // ---------------------------------------------------------------------------
    const handleFinalizar = async () => {
        if (articulos.length < 3) {
            notificar.advertencia('Debes agregar al menos 3 productos/servicios para finalizar');
            return;
        }

        if (!usuario?.id) {
            notificar.error('No se pudo identificar al usuario');
            return;
        }

        const confirmado = await notificar.confirmar(
            '🎉 ¿Finalizar y Publicar?',
            `Tu negocio será publicado con ${articulos.length} productos/servicios. Podrás editarlo después desde tu Business Studio.`
        );

        if (!confirmado) return;

        setFinalizando(true);

        try {
            // 1. Guardar artículos
            await guardarPaso8(articulos);

            // 2. Finalizar onboarding (actualiza esBorrador y onboardingCompletado)
            await finalizarOnboarding(usuario.id);

            // 3. Actualizar estado del usuario localmente
            if (usuario) {
                setUsuario({
                    ...usuario,
                    onboardingCompletado: true,
                });
            }

            // 4. Mostrar mensaje de éxito
            notificar.exito('🎉 ¡Negocio publicado! Redirigiendo a Business Studio...');

            // 5. Redirigir a Business Studio (con delay para que vea la notificación)
            setTimeout(() => {
                navigate('/business/dashboard');
            }, 1500);
        } catch (error) {
            console.error('Error al finalizar onboarding:', error);
            notificar.error('Error al finalizar. Intenta nuevamente');
        } finally {
            setFinalizando(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Obtener ícono según tipo
    // ---------------------------------------------------------------------------
    const getIconoTipo = (tipo: string) => {
        return tipo === 'producto' ? Package : Scissors;
    };

    // ---------------------------------------------------------------------------
    // Render condicional
    // ---------------------------------------------------------------------------
    if (cargandoDatos) {
        return (
            <div className="flex items-center justify-center py-8 lg:py-10 2xl:py-12">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 animate-spin text-slate-600 mx-auto mb-2 lg:mb-3" />
                    <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal — Card estilo Mi Perfil
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-4 lg:space-y-3.5 2xl:space-y-5">

            {/* ================================================================= */}
            {/* CARD: Productos y Servicios */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center justify-between rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="flex items-center gap-2 lg:gap-2.5">
                        <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                            <ShoppingCart className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Productos y Servicios</span>
                        <span className={`text-sm lg:text-xs 2xl:text-sm font-bold px-2 py-0.5 rounded-full ${
                            articulos.length >= 3 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'
                        }`}>
                            {articulos.length}/3
                        </span>
                    </div>
                    <button type="button"
                        onClick={() => { setArticuloEditar(null); setModalAbierto(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 border border-white/30 text-white hover:bg-white/25 transition-all cursor-pointer text-sm font-semibold">
                        <Plus className="w-4 h-4" />
                        <span className="hidden lg:inline">Agregar</span>
                    </button>
                </div>

                {/* Lista desktop */}
                <div className="hidden lg:block p-3 2xl:p-4">
                    {articulos.length > 0 ? (
                        <div className="divide-y divide-slate-200">
                            {articulos.map((articulo) => {
                                const Icono = getIconoTipo(articulo.tipo);
                                return (
                                    <div key={articulo.id} className="flex items-center gap-3 py-2.5 2xl:py-3 first:pt-0 last:pb-0">
                                        <div className="w-14 h-14 rounded-lg shrink-0 overflow-hidden border-2 border-slate-300">
                                            {articulo.imagenPrincipal && !articulo.imagenPrincipal.includes('placeholder') ? (
                                                <img src={articulo.imagenPrincipal} alt={articulo.nombre} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                                    <Icono className="w-5 h-5 text-slate-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm 2xl:text-base font-bold text-slate-800 truncate">{articulo.nombre}</p>
                                                <span className={`text-[10px] 2xl:text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                                    articulo.tipo === 'producto' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {articulo.tipo === 'producto' ? 'Producto' : 'Servicio'}
                                                </span>
                                            </div>
                                            <p className="text-sm 2xl:text-base font-medium text-slate-500 truncate">{articulo.descripcion}</p>
                                        </div>
                                        <p className="text-sm 2xl:text-base font-bold text-emerald-600 shrink-0">${articulo.precioBase.toFixed(0)}</p>
                                        <div className="flex gap-1.5 shrink-0">
                                            <button type="button" onClick={() => handleEditar(articulo.id!)} title="Editar"
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-50 hover:bg-indigo-100 transition-all cursor-pointer">
                                                <Edit2 className="w-[18px] h-[18px] text-indigo-600" />
                                            </button>
                                            <button type="button" onClick={() => duplicarArticulo(articulo.id!)} title="Duplicar"
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-50 hover:bg-emerald-100 transition-all cursor-pointer">
                                                <Copy className="w-[18px] h-[18px] text-emerald-600" />
                                            </button>
                                            <button type="button" onClick={() => eliminarArticulo(articulo.id!)} title="Eliminar"
                                                className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 transition-all cursor-pointer">
                                                <Trash2 className="w-[18px] h-[18px] text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm 2xl:text-base font-medium text-slate-500">No hay productos agregados</p>
                            <p className="text-sm font-medium text-slate-400 mt-1">Toca "Agregar" para comenzar</p>
                        </div>
                    )}
                </div>

                {/* Cards móvil — estilo FilaMovil de PaginaCatalogo */}
                <div className="lg:hidden p-3 space-y-3">
                    {articulos.length > 0 ? (
                        articulos.map((articulo) => {
                            const Icono = getIconoTipo(articulo.tipo);
                            const esTipoProducto = articulo.tipo === 'producto';
                            return (
                                <div key={articulo.id}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border-2 border-slate-300"
                                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                    {/* Imagen */}
                                    <div className="w-20 h-20 rounded-lg shrink-0 overflow-hidden">
                                        {articulo.imagenPrincipal && !articulo.imagenPrincipal.includes('placeholder') ? (
                                            <img src={articulo.imagenPrincipal} alt={articulo.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                                <Icono className="w-5 h-5 text-slate-600" />
                                            </div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-base font-bold text-slate-800 truncate">{articulo.nombre}</span>
                                            <span className="text-base font-extrabold text-emerald-600 shrink-0">${articulo.precioBase.toFixed(0)}</span>
                                        </div>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold w-fit ${
                                            esTipoProducto ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {esTipoProducto ? <Package className="w-3.5 h-3.5" /> : <Scissors className="w-3.5 h-3.5" />}
                                            {esTipoProducto ? 'Producto' : 'Servicio'}
                                        </span>
                                        <div className="flex items-center justify-end gap-3">
                                            <button type="button" onClick={() => handleEditar(articulo.id!)} className="cursor-pointer text-indigo-600">
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button type="button" onClick={() => duplicarArticulo(articulo.id!)} className="cursor-pointer text-emerald-600">
                                                <Copy className="w-5 h-5" />
                                            </button>
                                            <button type="button" onClick={() => eliminarArticulo(articulo.id!)} className="cursor-pointer text-red-600">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-8">
                            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-slate-500">No hay productos agregados</p>
                            <p className="text-sm font-medium text-slate-400 mt-1">Toca "+" para comenzar</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Alerta */}
            {articulos.length < 3 && (
                <div className="p-2.5 bg-amber-100 border-2 border-amber-300 rounded-lg">
                    <p className="text-sm font-medium text-amber-700">
                        Necesitas <span className="font-bold">{3 - articulos.length} producto{3 - articulos.length !== 1 ? 's' : ''} más</span> para finalizar
                    </p>
                </div>
            )}

            {/* Modal — reutiliza ModalArticulo del Catálogo */}
            {modalAbierto && (
                <ModalArticulo
                    articulo={articuloEditar ? {
                        id: articuloEditar.id || '',
                        negocioId: negocioId || '',
                        tipo: articuloEditar.tipo,
                        nombre: articuloEditar.nombre,
                        descripcion: articuloEditar.descripcion,
                        categoria: articuloEditar.categoria || '',
                        precioBase: String(articuloEditar.precioBase),
                        precioDesde: false,
                        imagenPrincipal: articuloEditar.imagenPrincipal,
                        disponible: articuloEditar.disponible,
                        destacado: false,
                        orden: 0,
                        totalVentas: 0,
                        totalVistas: 0,
                        createdAt: '',
                        updatedAt: '',
                    } as ArticuloCatalogo : null}
                    categoriasExistentes={[...new Set(articulos.map(a => a.categoria).filter(Boolean) as string[])]}
                    permitirCambioTipo
                    onGuardar={handleGuardarArticulo}
                    onCerrar={() => { setModalAbierto(false); setArticuloEditar(null); }}
                />
            )}
        </div>
    );
}

export default PasoProductos;