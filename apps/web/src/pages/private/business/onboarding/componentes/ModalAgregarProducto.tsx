/**
 * ModalAgregarProducto.tsx
 * =========================
 * Modal para agregar/editar productos y servicios
 * 
 * FUNCIONALIDAD:
 * - Formulario compacto vertical
 * - Subida de imagen con useOptimisticUpload
 * - Sistema de notificaciones unificado
 * - Validación de campos obligatorios
 * - Modo edición cuando recibe artículo
 * 
 * CREADO: 25/12/2024
 */

import React, { useState, useEffect } from 'react';
import { Package, Plus, X, Scissors, Upload, Trash2 } from 'lucide-react';
import { notificar } from '@/utils/notificaciones';
import { useOptimisticUpload } from '@/hooks/useOptimisticUpload';
import { uploadToCloudinary } from '@/utils/cloudinary';

// =============================================================================
// FUNCIÓN DE OPTIMIZACIÓN DE IMÁGENES
// =============================================================================

/**
 * Convierte y comprime una imagen a formato .webp
 * 
 * @param file - Archivo original
 * @param maxWidth - Ancho máximo (default: 800px para productos)
 * @param quality - Calidad de compresión 0-1 (default: 0.85)
 * @returns File optimizado en .webp
 */
async function optimizarImagen(
    file: File,
    maxWidth: number = 800,
    quality: number = 0.85
): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            // Calcular nuevas dimensiones manteniendo aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            // Crear canvas
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('No se pudo crear el contexto del canvas'));
                return;
            }

            // Dibujar imagen redimensionada
            ctx.drawImage(img, 0, 0, width, height);

            // Convertir a webp
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Error al convertir imagen'));
                        return;
                    }

                    // Crear nuevo File con extensión .webp
                    const fileName = file.name.replace(/\.[^/.]+$/, '.webp');
                    const optimizedFile = new File([blob], fileName, {
                        type: 'image/webp',
                        lastModified: Date.now()
                    });

                    resolve(optimizedFile);
                },
                'image/webp',
                quality
            );
        };

        img.onerror = () => {
            reject(new Error('Error al cargar imagen'));
        };

        reader.readAsDataURL(file);
    });
}

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

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (articulo: Articulo) => void;
    articuloEditar?: Articulo | null; // ← Acepta null
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const ModalAgregarProducto: React.FC<Props> = ({
    isOpen,
    onClose,
    onSave,
    articuloEditar,
}) => {
    // =========================================================================
    // REFERENCIA AL INPUT FILE
    // =========================================================================
    const inputFileRef = React.useRef<HTMLInputElement>(null);

    // =========================================================================
    // ESTADOS
    // =========================================================================
    const [tipo, setTipo] = useState<'producto' | 'servicio'>('producto');
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precioBase, setPrecioBase] = useState('');
    const [imagenCargando, setImagenCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    
    // Estado para archivo optimizado pendiente de subir
    const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
    const [previewLocal, setPreviewLocal] = useState<string | null>(null);

    // =========================================================================
    // HOOK DE UPLOAD OPTIMISTA
    // =========================================================================
    const imagen = useOptimisticUpload({
        carpeta: 'productos',
        onSuccess: (url) => {
        },
        onError: (error) => {
            notificar.error('Error al subir imagen');
            console.error('Error upload:', error);
        },
    });

    // =========================================================================
    // CARGAR DATOS AL EDITAR
    // =========================================================================
    useEffect(() => {
        if (articuloEditar) {
            setTipo(articuloEditar.tipo);
            setNombre(articuloEditar.nombre);
            setDescripcion(articuloEditar.descripcion);
            setPrecioBase(articuloEditar.precioBase.toString());
            
            // Cargar imagen SOLO si NO es placeholder
            if (articuloEditar.imagenPrincipal && 
                !articuloEditar.imagenPrincipal.includes('placeholder')) {
                setImagenCargando(true);
                imagen.setImageUrl(articuloEditar.imagenPrincipal);
                imagen.setCloudinaryUrl(articuloEditar.imagenPrincipal);
                imagen.setIsLocal(false);
            } else {
                // Si es placeholder, resetear imagen
                imagen.reset();
            }
        }
    }, [articuloEditar]);

    // =========================================================================
    // LIMPIAR FORMULARIO
    // =========================================================================
    const limpiarFormulario = () => {
        setTipo('producto');
        setNombre('');
        setDescripcion('');
        setPrecioBase('');
        setImagenCargando(false);
        
        // Limpiar preview local si existe
        if (previewLocal) {
            URL.revokeObjectURL(previewLocal);
            setPreviewLocal(null);
        }
        setArchivoPendiente(null);
        
        // Limpiar input file
        if (inputFileRef.current) {
            inputFileRef.current.value = '';
        }
        
        imagen.reset();
    };

    // =========================================================================
    // MANEJAR CAMBIO DE IMAGEN
    // =========================================================================
    const handleImagenChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            notificar.error('Solo se permiten imágenes');
            // Limpiar input
            if (inputFileRef.current) {
                inputFileRef.current.value = '';
            }
            return;
        }

        // Validar tamaño (máx 5MB antes de optimizar)
        if (file.size > 5 * 1024 * 1024) {
            notificar.error('La imagen es muy grande (máx 5MB)');
            // Limpiar input
            if (inputFileRef.current) {
                inputFileRef.current.value = '';
            }
            return;
        }

        try {
            // 1. Optimizar imagen a .webp (800px, calidad 0.85)
            const optimizedFile = await optimizarImagen(file, 800, 0.85);

            // 2. Crear preview local INSTANTÁNEO
            const preview = URL.createObjectURL(optimizedFile);
            setPreviewLocal(preview);
            
            // 3. Guardar archivo para subir DESPUÉS (al presionar "Agregar Producto")
            setArchivoPendiente(optimizedFile);

        } catch (error: any) {
            console.error('Error al optimizar imagen:', error);
            notificar.error(error.message || 'Error al procesar imagen');
            // Limpiar input en caso de error
            if (inputFileRef.current) {
                inputFileRef.current.value = '';
            }
        }
    };

    // =========================================================================
    // ELIMINAR IMAGEN
    // =========================================================================
    const handleEliminarImagen = async () => {
        // Si es un preview local (archivo pendiente de subir)
        if (previewLocal && archivoPendiente) {
            // Limpiar preview local
            URL.revokeObjectURL(previewLocal);
            setPreviewLocal(null);
            setArchivoPendiente(null);
            
            // Limpiar input file
            if (inputFileRef.current) {
                inputFileRef.current.value = '';
            }
            return;
        }

        // Si es una imagen de Cloudinary (ya subida)
        if (imagen.cloudinaryUrl) {
            await imagen.deleteImage();
            
            // Limpiar input file
            if (inputFileRef.current) {
                inputFileRef.current.value = '';
            }
        }
    };

    // =========================================================================
    // GUARDAR ARTÍCULO
    // =========================================================================
    const handleSave = async () => {
        // Validaciones
        if (!nombre.trim()) {
            notificar.advertencia('Ingresa el nombre del producto/servicio');
            return;
        }

        if (!precioBase || parseFloat(precioBase) <= 0) {
            notificar.advertencia('Ingresa un precio válido');
            return;
        }

        setGuardando(true);

        try {
            let imagenUrl: string;

            // Si hay un archivo pendiente de subir, subirlo AHORA
            if (archivoPendiente) {
                
                // Subir directamente a Cloudinary
                imagenUrl = await uploadToCloudinary(archivoPendiente, 'productos');
                
            } else if (imagen.cloudinaryUrl) {
                // Si ya hay una imagen de Cloudinary (editando)
                imagenUrl = imagen.cloudinaryUrl;
            } else if (articuloEditar?.imagenPrincipal) {
                // Si está editando y no cambió la imagen, mantener la anterior
                imagenUrl = articuloEditar.imagenPrincipal;
            } else {
                // Si es nuevo y no hay imagen, usar placeholder
                imagenUrl = 'https://via.placeholder.com/300?text=Sin+Imagen';
            }

            // Crear objeto artículo
            const articulo: Articulo = {
                tipo,
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || 'Sin descripción',
                precioBase: parseFloat(precioBase),
                imagenPrincipal: imagenUrl,
                disponible: true,
            };

            // Si está editando, incluir el ID
            if (articuloEditar?.id) {
                articulo.id = articuloEditar.id;
            }

            onSave(articulo);
            limpiarFormulario();
            onClose();
        } catch (error: any) {
            console.error('Error al guardar producto:', error);
            notificar.error('Error al guardar el producto');
        } finally {
            setGuardando(false);
        }
    };

    // =========================================================================
    // CERRAR MODAL
    // =========================================================================
    const handleClose = () => {
        limpiarFormulario();
        onClose();
    };

    // =========================================================================
    // NO RENDERIZAR SI ESTÁ CERRADO
    // =========================================================================
    if (!isOpen) return null;

    // =========================================================================
    // RENDER
    // =========================================================================
    return (
        <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={handleClose} // ← Click en el fondo cierra el modal
        >
            <div 
                className="bg-white rounded-xl w-full max-w-md 2xl:max-w-lg max-h-[70vh] overflow-y-auto flex flex-col"
                onClick={(e) => e.stopPropagation()} // ← Evita que se cierre al hacer click dentro
            >
                
                {/* Header */}
                <div className="flex items-center justify-between p-3 lg:p-4 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-2 lg:gap-3">
                        <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-blue-600" />
                        </div>
                        <h2 className="text-base lg:text-lg font-bold text-slate-900">
                            {articuloEditar ? 'Editar Producto/Servicio' : 'Agregar Producto/Servicio'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        type="button"
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-all"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-3 lg:p-4 overflow-y-auto flex-1">
                    <div className="space-y-2.5 lg:space-y-3">
                        
                        {/* TIPO */}
                        <div>
                            <label className="block text-xs lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-2">
                                TIPO
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {/* Producto */}
                                <button
                                    onClick={() => setTipo('producto')}
                                    type="button"
                                    className={`p-2.5 lg:p-3 rounded-lg border-2 transition-all ${
                                        tipo === 'producto'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <Package className={`w-6 h-6 mx-auto mb-1 ${
                                        tipo === 'producto' ? 'text-blue-600' : 'text-slate-400'
                                    }`} />
                                    <p className={`text-xs font-semibold ${
                                        tipo === 'producto' ? 'text-blue-700' : 'text-slate-600'
                                    }`}>
                                        Producto
                                    </p>
                                    <p className="text-[10px] text-slate-500">Físico</p>
                                </button>

                                {/* Servicio */}
                                <button
                                    onClick={() => setTipo('servicio')}
                                    type="button"
                                    className={`p-2.5 lg:p-3 rounded-lg border-2 transition-all ${
                                        tipo === 'servicio'
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <Scissors className={`w-6 h-6 mx-auto mb-1 ${
                                        tipo === 'servicio' ? 'text-purple-600' : 'text-slate-400'
                                    }`} />
                                    <p className={`text-xs font-semibold ${
                                        tipo === 'servicio' ? 'text-purple-700' : 'text-slate-600'
                                    }`}>
                                        Servicio
                                    </p>
                                    <p className="text-[10px] text-slate-500">Trabajo</p>
                                </button>
                            </div>
                        </div>

                        {/* NOMBRE */}
                        <div>
                            <label className="block text-xs lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-2">
                                NOMBRE
                            </label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Ej: Corte de cabello"
                                maxLength={100}
                                className="w-full px-4 py-2.5 lg:py-2 2xl:py-3 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm lg:text-sm transition-all"
                            />
                        </div>

                        {/* DESCRIPCIÓN */}
                        <div>
                            <label className="block text-xs lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-2">
                                DESCRIPCIÓN (Opcional)
                            </label>
                            <div className="relative">
                                <textarea
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    placeholder="Describe qué incluye..."
                                    maxLength={300}
                                    rows={3}
                                    className="w-full px-4 py-2.5 lg:py-2 2xl:py-3 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm lg:text-sm resize-none transition-all"
                                />
                                <span className="absolute bottom-2 right-3 text-xs text-slate-400">
                                    {descripcion.length}/300
                                </span>
                            </div>
                        </div>

                        {/* PRECIO */}
                        <div>
                            <label className="block text-xs lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-2">
                                PRECIO (MXN)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">
                                    $
                                </span>
                                <input
                                    type="number"
                                    value={precioBase}
                                    onChange={(e) => setPrecioBase(e.target.value)}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="w-full pl-8 pr-4 py-2.5 lg:py-2 2xl:py-3 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm lg:text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* IMAGEN DEL PRODUCTO */}
                        <div>
                            <label className="block text-xs lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-2">
                                IMAGEN (Opcional)
                            </label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 lg:p-5 text-center hover:border-blue-400 transition-all cursor-pointer relative">
                                <input
                                    ref={inputFileRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImagenChange}
                                    disabled={imagen.isUploading}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    id="imagen-upload"
                                />
                                
                                {/* Mostrar preview local o imagen de Cloudinary */}
                                {(previewLocal || imagen.imageUrl) ? (
                                    <div className="relative">
                                        {/* Skeleton mientras carga (solo para imágenes de Cloudinary) */}
                                        {imagenCargando && !previewLocal && (
                                            <div className="absolute inset-0 bg-slate-200 animate-pulse rounded-lg" />
                                        )}
                                        
                                        <img
                                            src={previewLocal || imagen.imageUrl!}
                                            alt="Preview"
                                            className="w-full h-32 lg:h-40 object-cover rounded-lg mx-auto mb-2"
                                            onLoad={() => setImagenCargando(false)}
                                        />
                                        
                                        {/* Botón eliminar */}
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleEliminarImagen();
                                            }}
                                            type="button"
                                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-all shadow-lg z-20"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                        <p className="text-xs text-slate-500">Click para cambiar</p>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload className="w-10 h-10 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm lg:text-sm font-semibold text-slate-700 mb-1">
                                            Click para subir
                                        </p>
                                        <p className="text-xs text-slate-500 mb-2">O arrastra aquí</p>
                                        <p className="text-[10px] lg:text-xs text-slate-400">JPG, PNG • Max 5MB</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-2 p-3 lg:p-4 border-t border-slate-200 shrink-0">
                    <button
                        onClick={handleClose}
                        type="button"
                        className="flex-1 px-4 py-2 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        type="button"
                        disabled={guardando}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                    >
                        {guardando ? 'Guardando...' : articuloEditar ? 'Guardar Cambios' : 'Agregar Producto'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalAgregarProducto;