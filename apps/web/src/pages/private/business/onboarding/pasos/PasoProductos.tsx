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

import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit2, Trash2, Loader2, Scissors } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { api } from '@/services/api';
import { ModalAgregarProducto } from '../componentes';
import { notificar } from '@/utils/notificaciones';
import { useNavigate } from 'react-router-dom';

// =============================================================================
// TIPOS
// =============================================================================

interface Articulo {
    id?: string;
    tipo: 'producto' | 'servicio';
    nombre: string;
    descripcion: string;
    precioBase: number;
    imagenPrincipal: string;
    disponible: boolean;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoProductos() {
    const navigate = useNavigate();
    const { negocioId, guardarPaso8, finalizarOnboarding, setSiguienteDeshabilitado } = useOnboardingStore();
    const { usuario, setUsuario } = useAuthStore();

    // Estados
    const [articulos, setArticulos] = useState<Articulo[]>([]);
    const [cargandoDatos, setCargandoDatos] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [articuloEditar, setArticuloEditar] = useState<Articulo | null>(null);
    const [guardando, setGuardando] = useState(false);
    const [finalizando, setFinalizando] = useState(false);

    // ---------------------------------------------------------------------------
    // Cargar artículos existentes
    // ---------------------------------------------------------------------------
    useEffect(() => {
        // No hacer nada si no hay negocioId aún
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
                    const articulosMapeados = datos.articulos.map((art: any) => ({
                        id: art.id,
                        tipo: art.tipo as 'producto' | 'servicio',
                        nombre: art.nombre,
                        descripcion: art.descripcion,
                        precioBase: parseFloat(art.precioBase),
                        imagenPrincipal: art.imagenPrincipal,
                        disponible: art.disponible ?? true,
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
        (window as any).guardarPaso8 = async (validar: boolean): Promise<boolean> => {
            // Si validar, requiere mínimo 3 artículos
            if (validar && articulos.length < 3) {
                notificar.error('Debes agregar al menos 3 productos o servicios');
                return false;
            }

            // Si es borrador, permite guardar con 0+ artículos
            if (!validar && articulos.length === 0) {
                return true; // No hay nada que guardar
            }

            try {
                setGuardando(true);

                const datos: any = {
                    articulos: articulos.length > 0 ? articulos : null
                };

                if (validar) {
                    // Guardar CON validación (avanzar) - mínimo 3 artículos
                    await guardarPaso8(datos.articulos as any);
                } else {
                    // Guardar SIN validación (retroceder/borrador)
                    const { guardarBorradorPaso8 } = useOnboardingStore.getState();
                    await guardarBorradorPaso8(datos.articulos as any);
                }

                setGuardando(false);
                return true;
            } catch (error: any) {
                console.error('Error al guardar paso 8:', error);
                setGuardando(false);
                return false;
            }
        };

        return () => {
            delete (window as any).guardarPaso8;
        };
    }, [articulos]);

    // ---------------------------------------------------------------------------
    // Agregar nuevo artículo
    // ---------------------------------------------------------------------------
    const agregarArticulo = (articulo: Articulo) => {
        // Generar ID temporal
        const nuevoArticulo: Articulo = {
            ...articulo,
            id: `temp-${Date.now()}`,
        };

        setArticulos([...articulos, nuevoArticulo]);

        notificar.exito('Producto agregado');
    };

    // ---------------------------------------------------------------------------
    // Editar artículo existente
    // ---------------------------------------------------------------------------
    const handleEditar = (id: string) => {
        const articulo = articulos.find(a => a.id === id);
        if (!articulo) return;

        setArticuloEditar(articulo);
        setModalAbierto(true);
    };

    const guardarEdicion = (articuloActualizado: Articulo) => {
        if (!articuloEditar?.id) return;

        setArticulos(
            articulos.map(a =>
                a.id === articuloEditar.id
                    ? { ...articuloActualizado, id: articuloEditar.id }
                    : a
            )
        );

        setArticuloEditar(null);

        notificar.exito('Cambios guardados');
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

        // Eliminar imagen de Cloudinary en segundo plano
        if (articulo?.imagenPrincipal && articulo.imagenPrincipal !== 'https://via.placeholder.com/300?text=Sin+Imagen') {
            try {
                const { eliminarDeCloudinary } = await import('@/utils/cloudinary');
                await eliminarDeCloudinary(articulo.imagenPrincipal);
            } catch (error) {
                console.error('❌ Error al eliminar imagen de Cloudinary:', error);
            }
        }
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
        } catch (error: any) {
            console.error('Error al finalizar onboarding:', error);
            notificar.error(error.response?.data?.message || 'Error al finalizar. Intenta nuevamente');
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
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-3 lg:space-y-2.5 2xl:space-y-3">

            {/* Card principal */}
            <div className="bg-white rounded-lg lg:rounded-xl 2xl:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5 2xl:p-6">

                {/* Header con botón */}
                <div className="flex items-center justify-between mb-4 lg:mb-5 2xl:mb-6">
                    <div>
                        <h2 className="text-base lg:text-lg 2xl:text-xl font-bold text-slate-900">
                            Productos y Servicios
                        </h2>
                        <p className="text-xs lg:text-sm text-slate-600">
                            {articulos.length}/3 mínimo agregados
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setArticuloEditar(null);
                            setModalAbierto(true);
                        }}
                        type="button"
                        className="px-3 lg:px-4 py-2 lg:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm lg:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4 lg:w-4 lg:h-4" />
                        Agregar
                    </button>
                </div>

                {/* Lista de productos */}
                {articulos.length > 0 ? (
                    <div className="space-y-2 lg:space-y-2.5 2xl:space-y-3">
                        {articulos.map((articulo) => {
                            const Icono = getIconoTipo(articulo.tipo);
                            return (
                                <div
                                    key={articulo.id}
                                    className="flex items-center gap-3 lg:gap-3.5 2xl:gap-4 p-3 lg:p-3.5 2xl:p-4 rounded-lg border-2 border-slate-100 hover:border-slate-200 transition-all"
                                >
                                    {/* Imagen del producto */}
                                    <div className="w-14 h-14 lg:w-16 lg:h-16 2xl:w-18 2xl:h-18 rounded-lg shrink-0 overflow-hidden bg-slate-100">
                                        {articulo.imagenPrincipal && !articulo.imagenPrincipal.includes('placeholder') ? (
                                            <img
                                                src={articulo.imagenPrincipal}
                                                alt={articulo.nombre}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className={`w-full h-full flex items-center justify-center ${articulo.tipo === 'producto' ? 'bg-blue-100' : 'bg-purple-100'
                                                    }`}
                                            >
                                                <Icono
                                                    className={`w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 ${articulo.tipo === 'producto' ? 'text-blue-600' : 'text-purple-600'
                                                        }`}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm lg:text-base font-bold text-slate-900">
                                            {articulo.nombre}
                                        </h3>
                                        <p className="text-xs lg:text-sm text-slate-600 truncate">
                                            {articulo.descripcion}
                                        </p>
                                    </div>

                                    {/* Precio y badge */}
                                    <div className="flex items-center gap-2 lg:gap-2.5 2xl:gap-3 shrink-0">
                                        <div className="text-right">
                                            <p className="text-base lg:text-lg 2xl:text-xl font-bold text-green-600">
                                                ${articulo.precioBase.toFixed(0)}
                                            </p>
                                            <span
                                                className={`text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full ${articulo.tipo === 'producto'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-purple-100 text-purple-700'
                                                    }`}
                                            >
                                                {articulo.tipo === 'producto' ? 'Producto' : 'Servicio'}
                                            </span>
                                        </div>

                                        {/* Botones */}
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditar(articulo.id!)}
                                                type="button"
                                                className="p-1.5 lg:p-2 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit2 className="w-4 h-4 lg:w-4 lg:h-4 text-blue-600" />
                                            </button>
                                            <button
                                                onClick={() => eliminarArticulo(articulo.id!)}
                                                type="button"
                                                className="p-1.5 lg:p-2 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4 lg:w-4 lg:h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 lg:py-10 2xl:py-12">
                        <Package className="w-12 h-12 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 text-slate-300 mx-auto mb-3 lg:mb-4" />
                        <p className="text-sm lg:text-base text-slate-500">No hay productos agregados</p>
                        <p className="text-xs lg:text-sm text-slate-400 mt-1">
                            Click en "Agregar" para comenzar
                        </p>
                    </div>
                )}
            </div>

            {/* Alert contador */}
            {articulos.length < 3 && (
                <div className="flex items-start gap-2 lg:gap-2.5 p-2.5 lg:p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="mt-0.5">
                        <Package className="w-4 h-4 lg:w-5 lg:h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs lg:text-xs 2xl:text-sm text-amber-800">
                            <span className="font-semibold">
                                Necesitas {3 - articulos.length} producto(s) más
                            </span>{' '}
                            para finalizar el onboarding
                        </p>
                    </div>
                </div>
            )}

            {/* Modal */}
            <ModalAgregarProducto
                isOpen={modalAbierto}
                onClose={() => {
                    setModalAbierto(false);
                    setArticuloEditar(null);
                }}
                onSave={articuloEditar ? guardarEdicion : agregarArticulo}
                articuloEditar={articuloEditar}
            />
        </div>
    );
}

export default PasoProductos;