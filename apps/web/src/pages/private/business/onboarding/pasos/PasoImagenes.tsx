/**
 * PasoImagenes.tsx - PASO 5 DEL ONBOARDING
 * ===========================================
 * Subida de imágenes del negocio (logo, portada, galería)
 * 
 * VERSIÓN SIMPLIFICADA CON OPTIMIZACIÓN AUTOMÁTICA:
 * - ✅ Logo, Portada y Galería usan useOptimisticUpload
 * - ✅ Hook maneja modo single (logo/portada) y multiple (galería)
 * - ✅ Optimización automática integrada en el hook (redimensionar + comprimir + WebP)
 * - ✅ Guardado automático en BD mediante callbacks onSuccess
 * - ✅ Manejo de errores y restauración automática
 * - ✅ Código limpio sin duplicación
 * 
 * CARACTERÍSTICAS:
 * - Upload optimista (preview instantáneo)
 * - Drag & Drop en todas las zonas de upload
 * - Optimización automática: redimensiona, comprime y convierte a .webp
 * - Carga de datos existentes al montar
 * - Logo: opcional, 1 imagen cuadrada, max 500px, mismo alto que portada
 * - Portada: OBLIGATORIA, 1 imagen horizontal 16:9, max 1600px
 * - Galería: mínimo 1, máximo 10 imágenes, carpeta `galeria/`, max 1200px
 * - Grid responsive (2/3/4 columnas)
 * - Layout 2 columnas para logo+portada en laptop/desktop
 * - Validación en tiempo real
 */

import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Monitor, Grid3x3, X, Plus, Loader2, Check } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useOptimisticUpload } from '@/hooks/useOptimisticUpload';
import { notificar } from '@/utils/notificaciones';
import { api } from '@/services/api';

// =============================================================================
// TIPOS
// =============================================================================

// Extender Window para incluir guardarPaso5
declare global {
    interface Window {
        guardarPaso5?: (validar: boolean) => Promise<boolean>;
    }
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoImagenes() {
    const negocioId = useOnboardingStore(state => state.negocioId);
    const pasoActual = useOnboardingStore(state => state.pasoActual);
    const guardarPaso5 = useOnboardingStore(state => state.guardarPaso5);
    const setSiguienteDeshabilitado = useOnboardingStore(state => state.setSiguienteDeshabilitado);
    // Estado para almacenar las imágenes de galería con sus IDs de BD
    const [galeriaImagenes, setGaleriaImagenes] = useState<any[]>([]);

    // ✅ Hooks de upload optimista
    const logo = useOptimisticUpload({
        carpeta: 'logos',
        maxWidth: 500,
        quality: 0.85,
        onSuccess: async (url) => {
            const { guardarBorradorPaso5 } = useOnboardingStore.getState();
            await guardarBorradorPaso5({ logoUrl: url as string || '' });
        }
    });

    const portada = useOptimisticUpload({
        carpeta: 'portadas',
        maxWidth: 1600,
        quality: 0.85,
        onSuccess: async (url) => {
            const { guardarBorradorPaso5 } = useOnboardingStore.getState();
            await guardarBorradorPaso5({ portadaUrl: url as string || '' });
        }
    });

    const galeria = useOptimisticUpload({
        carpeta: 'galeria',
        multiple: true,
        maxImages: 10,
        maxWidth: 1200,
        quality: 0.85,
        onSuccess: async (imagenes: any) => {
            try {
                // Guardar en BD - ahora imagenes ya tiene {url, publicId}
                const response = await api.post(`/onboarding/${negocioId}/galeria`, {
                    imagenes: imagenes.map((img: any) => ({
                        url: img.url,
                        cloudinaryPublicId: img.publicId
                    }))
                });

                // Actualizar galeriaImagenes con las imágenes guardadas (incluyen ID de BD)
                if (response.data.success && response.data.data) {
                    setGaleriaImagenes(response.data.data.map((img: any) => ({
                        id: img.id,
                        url: img.url
                    })));
                }

            } catch (error) {
                console.error('❌ Error al guardar galería en BD:', error);
            }
        },
        // 🆕 AGREGAR CALLBACK onDelete
        onDelete: async (url) => {
            try {
                // Buscar el ID en BD
                const imagenEnBD = galeriaImagenes.find((img: any) => img.url === url);

                if (imagenEnBD?.id) {
                    await api.delete(`/negocios/${negocioId}/galeria/${imagenEnBD.id}`);

                    // Actualizar estado local
                    setGaleriaImagenes((prev: any[]) =>
                        prev.filter((img: any) => img.id !== imagenEnBD.id)
                    );
                }
            } catch (error) {
                console.error('❌ Error al eliminar de BD:', error);
            }
        }
    });

    const [cargandoDatos, setCargandoDatos] = useState(true);

    // Estados para drag & drop
    const [isDraggingLogo, setIsDraggingLogo] = useState(false);
    const [isDraggingPortada, setIsDraggingPortada] = useState(false);
    const [isDraggingGaleria, setIsDraggingGaleria] = useState(false);

    // Refs para los inputs
    const logoInputRef = useRef<HTMLInputElement>(null);
    const portadaInputRef = useRef<HTMLInputElement>(null);
    const galeriaInputRef = useRef<HTMLInputElement>(null);

    const datosYaCargados = useRef(false);

    // ---------------------------------------------------------------------------
    // Cargar datos existentes al montar
    // ---------------------------------------------------------------------------

    useEffect(() => {
        if (pasoActual !== 5) return;

        if (datosYaCargados.current) return;

        const cargarDatos = async () => {
            if (!negocioId) return;

            try {
                setCargandoDatos(true);

                // ✅ UN SOLO ENDPOINT - Trae todo el progreso
                const response = await api.get(`/onboarding/${negocioId}/progreso`);
                const datos = response.data.data;

                // Cargar logo si existe (viene del negocio)
                if (datos.negocio?.logoUrl) {
                    logo.setCloudinaryUrl(datos.negocio.logoUrl);
                    logo.setImageUrl(datos.negocio.logoUrl);
                }

                // Cargar portada si existe (viene de la sucursal)
                if (datos.sucursal?.portadaUrl) {
                    portada.setCloudinaryUrl(datos.sucursal.portadaUrl);
                    portada.setImageUrl(datos.sucursal.portadaUrl);
                }

                // Cargar galería desde endpoint directo
                const respGaleria = await api.get(`/negocios/${negocioId}/galeria`);
                if (respGaleria.data.success && respGaleria.data.data.length > 0) {
                    setGaleriaImagenes(respGaleria.data.data.map((img: any) => ({
                        id: img.id,
                        url: img.url
                    })));

                    const urls = respGaleria.data.data.map((img: any) => img.url);
                    galeria.setImages!(urls);
                }

                datosYaCargados.current = true;

            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
            }
        };

        cargarDatos();
    }, [negocioId, pasoActual]); // Mantener estas dependencias

    // ---------------------------------------------------------------------------
    // Validación en tiempo real
    // ---------------------------------------------------------------------------

    const esFormularioValido = () => {
        const tienePortadaEnCloudinary = portada.cloudinaryUrl !== null && portada.cloudinaryUrl !== '';
        const tieneGaleria = galeria.images && galeria.images.length >= 1;
        return tienePortadaEnCloudinary && tieneGaleria;
    };

    useEffect(() => {
        const esValido = esFormularioValido();
        setSiguienteDeshabilitado(!esValido);

        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(4, Boolean(esValido));
    }, [portada.cloudinaryUrl, galeria.images]);

    // ---------------------------------------------------------------------------
    // Exponer función de guardado para el botón "Siguiente"
    // ---------------------------------------------------------------------------

    useEffect(() => {
        const guardarPaso5Fn: (validar: boolean) => Promise<boolean> = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Debes subir al menos una portada y una imagen en la galería');
                return false;
            }

            try {
                const datos = {
                    logoUrl: logo.cloudinaryUrl ?? undefined,
                    portadaUrl: portada.cloudinaryUrl ?? undefined,
                    galeriaUrls: galeria.images && galeria.images.length > 0
                        ? galeria.images
                        : undefined
                };

                if (validar) {
                    await guardarPaso5(datos);
                } else {
                    const { guardarBorradorPaso5 } = useOnboardingStore.getState();
                    await guardarBorradorPaso5(datos);
                }

                return true;
            } catch (error) {
                console.error('Error al guardar paso 5:', error);
                return false;
            }
        };

        window.guardarPaso5 = guardarPaso5Fn;

        return () => {
            delete window.guardarPaso5;
        };
    }, [logo.cloudinaryUrl, portada.cloudinaryUrl, galeria.images]);

    // ---------------------------------------------------------------------------
    // Handlers de Logo
    // ---------------------------------------------------------------------------

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await procesarLogoFile(file);

        if (logoInputRef.current) {
            logoInputRef.current.value = '';
        }
    };

    const procesarLogoFile = async (file: File) => {
        try {
            await logo.uploadImage(file);
        } catch (error) {
            console.error('❌ Error al subir logo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al subir logo';
            notificar.error(errorMessage);
        }
    };

    const handleLogoDelete = async () => {
        await logo.deleteImage();
    };

    const handleLogoDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingLogo(true);
    };

    const handleLogoDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleLogoDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingLogo(false);
    };

    const handleLogoDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingLogo(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        await procesarLogoFile(file);
    };

    // ---------------------------------------------------------------------------
    // Handlers de Portada
    // ---------------------------------------------------------------------------

    const handlePortadaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        await procesarPortadaFile(file);

        if (portadaInputRef.current) {
            portadaInputRef.current.value = '';
        }
    };

    const procesarPortadaFile = async (file: File) => {
        try {
            await portada.uploadImage(file);
        } catch (error) {
            console.error('❌ Error al subir portada:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al subir portada';
            notificar.error(errorMessage);
        }
    };

    const handlePortadaDelete = async () => {
        await portada.deleteImage();
    };

    const handlePortadaDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPortada(true);
    };

    const handlePortadaDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handlePortadaDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPortada(false);
    };

    const handlePortadaDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingPortada(false);

        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        await procesarPortadaFile(file);
    };

    // ---------------------------------------------------------------------------
    // Handlers de Galería
    // ---------------------------------------------------------------------------

    const handleGaleriaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        await galeria.uploadImages!(Array.from(files));

        if (galeriaInputRef.current) {
            galeriaInputRef.current.value = '';
        }
    };

    const handleGaleriaDelete = async (index: number) => {
        await galeria.deleteImageAt!(index);
    };

    const handleGaleriaDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingGaleria(true);
    };

    const handleGaleriaDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleGaleriaDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingGaleria(false);
    };

    const handleGaleriaDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingGaleria(false);

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        await galeria.uploadImages!(Array.from(files));
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    if (cargandoDatos) {
        return (
            <div className="flex items-center justify-center py-12 lg:py-16">
                <Loader2 className="w-6 h-6 lg:w-7 lg:h-7 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6 lg:space-y-7 2xl:space-y-8">
            {/* Grid 2 columnas para Logo y Portada en laptop/desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-7 2xl:gap-8">
                {/* LOGO */}
                <div className="space-y-3 lg:space-y-3.5 2xl:space-y-4">
                    <div className="flex items-center gap-2 lg:gap-2.5">
                        <Monitor className="w-4 h-4 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5 text-slate-600" />
                        <h3 className="text-sm lg:text-[15px] 2xl:text-base font-semibold text-slate-800">
                            Logo del Negocio
                        </h3>
                        <span className="text-xs lg:text-[13px] 2xl:text-sm text-slate-500 ml-auto">
                            Opcional
                        </span>
                    </div>

                    <p className="text-xs lg:text-[13px] 2xl:text-sm text-slate-600">
                        Imagen cuadrada recomendada. Tu logo será visible en el directorio.
                    </p>

                    {/* Zona de Upload de Logo */}
                    <div
                        onClick={() => !logo.isUploading && logoInputRef.current?.click()}
                        onDragEnter={handleLogoDragEnter}
                        onDragOver={handleLogoDragOver}
                        onDragLeave={handleLogoDragLeave}
                        onDrop={handleLogoDrop}
                        className={`
                            relative group aspect-square w-[56.25%] mx-auto rounded-xl lg:rounded-2xl overflow-hidden
                            border-2 border-dashed transition-all duration-200
                            ${isDraggingLogo
                                ? 'border-blue-400 bg-blue-50'
                                : logo.imageUrl
                                    ? 'border-transparent'
                                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
                            }
                            ${!logo.isUploading && !logo.imageUrl ? 'cursor-pointer' : ''}
                        `}
                    >
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                            disabled={logo.isUploading}
                        />

                        {/* Estado: Vacío */}
                        {!logo.imageUrl && !logo.isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 lg:p-5 text-center">
                                <ImageIcon className="w-8 h-8 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 text-slate-400 mb-2 lg:mb-2.5 group-hover:text-slate-500 transition-colors" />
                                <p className="text-xs lg:text-[13px] 2xl:text-sm font-medium text-slate-600 mb-0.5 lg:mb-1">
                                    Arrastra tu logo aquí
                                </p>
                                <p className="text-[10px] lg:text-[11px] 2xl:text-xs text-slate-500">
                                    o haz clic para seleccionar
                                </p>
                            </div>
                        )}

                        {/* Estado: Subiendo */}
                        {logo.isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50">
                                <Loader2 className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 animate-spin text-white mb-2 lg:mb-2.5" />
                                <p className="text-xs lg:text-[13px] 2xl:text-sm text-white font-medium">
                                    Subiendo logo...
                                </p>
                            </div>
                        )}

                        {/* Estado: Imagen Cargada */}
                        {logo.imageUrl && !logo.isUploading && (
                            <>
                                <img
                                    src={logo.imageUrl}
                                    alt="Logo"
                                    className="w-full h-full object-cover"
                                />

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleLogoDelete();
                                    }}
                                    className="
                                        absolute top-2 lg:top-2.5 2xl:top-3 right-2 lg:right-2.5 2xl:right-3
                                        w-7 h-7 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9
                                        bg-red-500 hover:bg-red-600 text-white
                                        rounded-lg lg:rounded-xl shadow-lg
                                        flex items-center justify-center
                                        transition-all duration-200
                                        opacity-0 group-hover:opacity-100
                                    "
                                >
                                    <X className="w-4 h-4 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5" />
                                </button>

                                {logo.cloudinaryUrl && (
                                    <div className="absolute bottom-2 lg:bottom-2.5 2xl:bottom-3 left-2 lg:left-2.5 2xl:left-3 bg-green-500 text-white px-2 lg:px-2.5 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-[11px] 2xl:text-xs font-medium flex items-center gap-1 lg:gap-1.5 shadow-lg">
                                        <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                        Guardado
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* PORTADA */}
                <div className="space-y-3 lg:space-y-3.5 2xl:space-y-4">
                    <div className="flex items-center gap-2 lg:gap-2.5">
                        <ImageIcon className="w-4 h-4 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5 text-slate-600" />
                        <h3 className="text-sm lg:text-[15px] 2xl:text-base font-semibold text-slate-800">
                            Portada del Negocio
                        </h3>
                        <span className="text-xs lg:text-[13px] 2xl:text-sm text-red-500 ml-auto">
                            * Obligatorio
                        </span>
                    </div>

                    <p className="text-xs lg:text-[13px] 2xl:text-sm text-slate-600">
                        Imagen horizontal de 1600×900px ideal. Se mostrará en la parte superior de tu perfil.
                    </p>

                    <div
                        onClick={() => !portada.isUploading && portadaInputRef.current?.click()}
                        onDragEnter={handlePortadaDragEnter}
                        onDragOver={handlePortadaDragOver}
                        onDragLeave={handlePortadaDragLeave}
                        onDrop={handlePortadaDrop}
                        className={`
                            relative group aspect-video rounded-xl lg:rounded-2xl overflow-hidden
                            border-2 border-dashed transition-all duration-200
                            ${isDraggingPortada
                                ? 'border-blue-400 bg-blue-50'
                                : portada.imageUrl
                                    ? 'border-transparent'
                                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
                            }
                            ${!portada.isUploading && !portada.imageUrl ? 'cursor-pointer' : ''}
                        `}
                    >
                        <input
                            ref={portadaInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePortadaChange}
                            className="hidden"
                            disabled={portada.isUploading}
                        />

                        {!portada.imageUrl && !portada.isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 lg:p-5 text-center">
                                <ImageIcon className="w-8 h-8 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 text-slate-400 mb-2 lg:mb-2.5 group-hover:text-slate-500 transition-colors" />
                                <p className="text-xs lg:text-[13px] 2xl:text-sm font-medium text-slate-600 mb-0.5 lg:mb-1">
                                    Arrastra tu portada aquí
                                </p>
                                <p className="text-[10px] lg:text-[11px] 2xl:text-xs text-slate-500">
                                    o haz clic para seleccionar
                                </p>
                            </div>
                        )}

                        {portada.isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50">
                                <Loader2 className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 animate-spin text-white mb-2 lg:mb-2.5" />
                                <p className="text-xs lg:text-[13px] 2xl:text-sm text-white font-medium">
                                    Subiendo portada...
                                </p>
                            </div>
                        )}

                        {portada.imageUrl && !portada.isUploading && (
                            <>
                                <img
                                    src={portada.imageUrl}
                                    alt="Portada"
                                    className="w-full h-full object-cover"
                                />

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePortadaDelete();
                                    }}
                                    className="
                                        absolute top-2 lg:top-2.5 2xl:top-3 right-2 lg:right-2.5 2xl:right-3
                                        w-7 h-7 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9
                                        bg-red-500 hover:bg-red-600 text-white
                                        rounded-lg lg:rounded-xl shadow-lg
                                        flex items-center justify-center
                                        transition-all duration-200
                                        opacity-0 group-hover:opacity-100
                                    "
                                >
                                    <X className="w-4 h-4 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5" />
                                </button>

                                {portada.cloudinaryUrl && (
                                    <div className="absolute bottom-2 lg:bottom-2.5 2xl:bottom-3 left-2 lg:left-2.5 2xl:left-3 bg-green-500 text-white px-2 lg:px-2.5 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-[11px] 2xl:text-xs font-medium flex items-center gap-1 lg:gap-1.5 shadow-lg">
                                        <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                        Guardado
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* GALERÍA */}
            <div className="space-y-3 lg:space-y-3.5 2xl:space-y-4">
                <div className="flex items-center gap-2 lg:gap-2.5">
                    <Grid3x3 className="w-4 h-4 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5 text-slate-600" />
                    <h3 className="text-sm lg:text-[15px] 2xl:text-base font-semibold text-slate-800">
                        Galería de Fotos
                    </h3>
                    <span className="text-xs lg:text-[13px] 2xl:text-sm text-red-500 ml-auto">
                        * Al menos 1 imagen
                    </span>
                </div>

                <p className="text-xs lg:text-[13px] 2xl:text-sm text-slate-600">
                    Sube de 1 a 10 imágenes que muestren tu negocio, productos o servicios.
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-3.5 2xl:gap-4">
                    {galeria.images && galeria.images.map((url: string, index: number) => (
                        <div
                            key={index}
                            className="relative group aspect-square rounded-xl lg:rounded-2xl overflow-hidden border-2 border-transparent hover:border-slate-200 transition-all"
                        >
                            <img
                                src={url}
                                alt={`Galería ${index + 1}`}
                                className="w-full h-full object-cover"
                            />

                            <button
                                onClick={() => handleGaleriaDelete(index)}
                                className="
                                    absolute top-2 lg:top-2.5 2xl:top-3 right-2 lg:right-2.5 2xl:right-3
                                    w-7 h-7 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9
                                    bg-red-500 hover:bg-red-600 text-white
                                    rounded-lg lg:rounded-xl shadow-lg
                                    flex items-center justify-center
                                    transition-all duration-200
                                    opacity-0 group-hover:opacity-100
                                "
                            >
                                <X className="w-4 h-4 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5" />
                            </button>

                            <div className="absolute bottom-2 lg:bottom-2.5 2xl:bottom-3 left-2 lg:left-2.5 2xl:left-3 bg-green-500 text-white px-2 lg:px-2.5 py-1 lg:py-1.5 rounded-md lg:rounded-lg text-[10px] lg:text-[11px] 2xl:text-xs font-medium flex items-center gap-1 lg:gap-1.5 shadow-lg">
                                <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                Guardado
                            </div>
                        </div>
                    ))}

                    {galeria.canAddMore && (
                        <div
                            onClick={() => !galeria.isUploading && galeriaInputRef.current?.click()}
                            onDragEnter={handleGaleriaDragEnter}
                            onDragOver={handleGaleriaDragOver}
                            onDragLeave={handleGaleriaDragLeave}
                            onDrop={handleGaleriaDrop}
                            className={`
                                relative aspect-square rounded-xl lg:rounded-2xl overflow-hidden
                                border-2 border-dashed transition-all duration-200
                                flex items-center justify-center
                                ${isDraggingGaleria
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
                                }
                                ${!galeria.isUploading ? 'cursor-pointer' : 'cursor-not-allowed'}
                            `}
                        >
                            <input
                                ref={galeriaInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleGaleriaChange}
                                className="hidden"
                                disabled={galeria.isUploading}
                            />

                            {!galeria.isUploading ? (
                                <div className="flex flex-col items-center justify-center p-4 text-center">
                                    <Plus className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-slate-400 mb-1 lg:mb-1.5" />
                                    <p className="text-xs lg:text-[13px] 2xl:text-sm font-medium text-slate-600">
                                        Agregar
                                    </p>
                                    <p className="text-[10px] lg:text-[11px] 2xl:text-xs text-slate-500 mt-0.5">
                                        {galeria.images?.length || 0}/10
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center">
                                    <Loader2 className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 animate-spin text-blue-500 mb-1 lg:mb-1.5" />
                                    <p className="text-xs lg:text-[13px] 2xl:text-sm text-slate-600 font-medium">
                                        Subiendo...
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-xs lg:text-[13px] 2xl:text-sm text-slate-500 text-center">
                    {!galeria.images || galeria.images.length === 0
                        ? 'No hay imágenes aún'
                        : `${galeria.images.length} de 10 imágenes`}
                </p>
            </div>
        </div>
    );
}

export default PasoImagenes;