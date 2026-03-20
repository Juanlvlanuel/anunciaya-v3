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
import { Image as ImageIcon, Grid3x3, Trash2, Plus, Loader2 } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useR2Upload } from '@/hooks/useR2Upload';
import { notificar } from '@/utils/notificaciones';
import { api } from '@/services/api';
import { eliminarImagenHuerfana } from '@/services/r2Service';
import { ModalImagenes } from '@/components/ui';

// =============================================================================
// TIPOS
// =============================================================================

declare global {
    interface Window {
        guardarPaso5?: (validar: boolean) => Promise<boolean>;
    }
}

// =============================================================================
// HELPER: Generar presigned URL para onboarding
// =============================================================================

async function generarUrlUploadOnboarding(nombreArchivo: string, contentType: string, carpeta = 'onboarding') {
    const response = await api.post('/onboarding/upload-imagen', { nombreArchivo, contentType, carpeta });
    return response.data;
}

// =============================================================================
// ZONA DE UPLOAD — Componente con patrón 3 capas (igual a ChatYA ImagenBurbuja)
// =============================================================================

interface ZonaUploadProps {
    imageUrl: string | null;
    miniatura: string | null;
    isUploading: boolean;
    r2Url: string | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
    isDragging: boolean;
    aspect: string;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    placeholder: string;
    uploadingText: string;
    onImageClick?: () => void;
}

function ZonaUpload({
    imageUrl, miniatura, isUploading, r2Url, inputRef, isDragging, aspect,
    onFileChange, onDelete, onDragEnter, onDragOver, onDragLeave, onDrop,
    placeholder, uploadingText, onImageClick,
}: ZonaUploadProps) {
    // Trackear QUÉ URL ya cargó (síncrono, sin delay de useEffect)
    const [urlCargada, setUrlCargada] = useState<string | null>(null);
    const cargada = imageUrl !== null && imageUrl === urlCargada;

    // URL para capa blur: miniatura propia (blob separado) o imageUrl actual
    const urlBlur = miniatura || imageUrl;

    return (
        <div
            onClick={() => {
                if (isUploading) return;
                if (imageUrl && cargada && onImageClick) { onImageClick(); return; }
                inputRef.current?.click();
            }}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
                relative group ${aspect} rounded-xl overflow-hidden
                border-2 border-dashed transition-all duration-200
                ${isDragging
                    ? 'border-slate-400 bg-slate-200'
                    : imageUrl
                        ? 'border-transparent'
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'
                }
                ${!isUploading && !imageUrl ? 'cursor-pointer' : ''}
            `}
        >
            <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={onFileChange} className="hidden" disabled={isUploading} />

            {/* Placeholder vacío */}
            {!imageUrl && !isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">{placeholder}</p>
                    <p className="text-sm text-slate-500 mt-0.5">Clic o arrastra</p>
                </div>
            )}

            {/* Capa 1: Blur — miniatura o imageUrl con blur (placeholder visual permanente) */}
            {urlBlur && (
                <img src={urlBlur} alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: 'blur(8px)' }} />
            )}

            {/* Capa 2: Imagen real — opacity 0 hasta que carga, luego fade-in */}
            {imageUrl && (
                <img src={imageUrl} alt=""
                    className={`absolute inset-0 w-full h-full object-cover duration-500 ${cargada && onImageClick ? 'group-hover:scale-110 cursor-pointer' : ''}`}
                    style={{ opacity: cargada ? 1 : 0 }}
                    onLoad={() => setUrlCargada(imageUrl)} />
            )}

            {/* Capa 3: Overlay + spinner durante upload */}
            {isUploading && (
                <div className="absolute inset-0 bg-black/25 flex flex-col items-center justify-center gap-2">
                    <div className="w-8 h-8 border-3 rounded-full animate-spin border-white/30 border-t-white/80" />
                    <p className="text-sm font-medium text-white/80">{uploadingText}</p>
                </div>
            )}

            {/* Controles post-upload (solo cuando imagen cargó) */}
            {imageUrl && !isUploading && cargada && (
                <>
                    <div className="absolute bottom-0 inset-x-0 h-12"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="absolute bottom-2 right-2 w-9 h-9 bg-black/30 hover:bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </>
            )}
        </div>
    );
}

// =============================================================================
// CELDA DE GALERÍA — Mismo patrón 3 capas para cada imagen del grid
// =============================================================================

function CeldaGaleria({
    url, miniatura, subiendo, onDelete, onCargada, onImageClick,
}: {
    url: string;
    miniatura: string | null;
    subiendo: boolean;
    onDelete: () => void;
    onCargada?: (url: string) => void;
    onImageClick?: () => void;
}) {
    const [urlCargada, setUrlCargada] = useState<string | null>(null);
    const [errorCarga, setErrorCarga] = useState(false);
    const cargada = url === urlCargada;
    const urlBlur = miniatura || url;

    // Si la imagen no existe en R2 (huérfana), no renderizar la celda
    if (errorCarga) return null;

    return (
        <div className="relative group aspect-video rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm">
            {/* Capa 1: Blur */}
            {urlBlur && (
                <img src={urlBlur} alt="" className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: 'blur(8px)' }}
                    onError={() => setErrorCarga(true)} />
            )}
            {/* Capa 2: Imagen real — fade-in al cargar */}
            <img src={url} alt=""
                className={`absolute inset-0 w-full h-full object-cover duration-500 ${cargada && onImageClick ? 'group-hover:scale-110 cursor-pointer' : ''}`}
                style={{ opacity: cargada ? 1 : 0 }}
                onClick={() => cargada && onImageClick?.()}
                onLoad={() => { setUrlCargada(url); onCargada?.(url); }}
                onError={() => setErrorCarga(true)} />
            {/* Capa 3: Spinner durante upload */}
            {subiendo && (
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 rounded-full animate-spin border-white/30 border-t-white/80" />
                </div>
            )}
            {/* Controles post-carga */}
            {cargada && !subiendo && (
                <>
                    <div className="absolute inset-x-0 bottom-0 h-12" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
                    <button onClick={onDelete}
                        className="absolute bottom-2 right-2 w-8 h-8 bg-black/30 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoImagenes() {
    const negocioId = useOnboardingStore(state => state.negocioId);
    const guardarPaso5 = useOnboardingStore(state => state.guardarPaso5);
    const setSiguienteDeshabilitado = useOnboardingStore(state => state.setSiguienteDeshabilitado);

    // Estado para galería (múltiples imágenes)
    const [galeriaImagenes, setGaleriaImagenes] = useState<{ id: string; url: string }[]>([]);
    const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
    const [subiendoGaleria, setSubiendoGaleria] = useState(false);
    const [galeriaSubiendo, setGaleriaSubiendo] = useState<{ tempId: string; blobUrl: string }[]>([]);
    const [miniaturasGaleria, setMiniaturasGaleria] = useState<Record<string, string>>({});

    // Estado para ModalImagenes
    const [modalImagenes, setModalImagenes] = useState<{ isOpen: boolean; images: string[]; initialIndex: number }>({
        isOpen: false, images: [], initialIndex: 0,
    });

    // ✅ Hooks de upload R2 (logo y portada)
    const logo = useR2Upload({
        maxWidth: 500,
        quality: 0.85,
        generarUrl: (nombre, type) => generarUrlUploadOnboarding(nombre, type, 'logos'),
        onSuccess: async (url) => {
            const { guardarBorradorPaso5 } = useOnboardingStore.getState();
            await guardarBorradorPaso5({ logoUrl: url });
        },
    });

    const portada = useR2Upload({
        maxWidth: 1600,
        quality: 0.85,
        generarUrl: (nombre, type) => generarUrlUploadOnboarding(nombre, type, 'portadas'),
        onSuccess: async (url) => {
            const { guardarBorradorPaso5 } = useOnboardingStore.getState();
            await guardarBorradorPaso5({ portadaUrl: url });
        },
    });

    const [cargandoDatos, setCargandoDatos] = useState(true);

    // Miniaturas separadas para blur (blob URLs independientes del hook)
    const [logoMiniatura, setLogoMiniatura] = useState<string | null>(null);
    const [portadaMiniatura, setPortadaMiniatura] = useState<string | null>(null);

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
        if (datosYaCargados.current) return;

        const cargarDatos = async () => {
            if (!negocioId) return;

            try {
                setCargandoDatos(true);

                // ✅ UN SOLO ENDPOINT - Trae todo el progreso
                const response = await api.get(`/onboarding/${negocioId}/progreso`);
                const datos = response.data.data;

                // Cargar logo si existe
                if (datos.negocio?.logoUrl) {
                    logo.setR2Url(datos.negocio.logoUrl);
                    logo.setImageUrl(datos.negocio.logoUrl);
                }

                // Cargar portada si existe
                if (datos.sucursal?.portadaUrl) {
                    portada.setR2Url(datos.sucursal.portadaUrl);
                    portada.setImageUrl(datos.sucursal.portadaUrl);
                }

                // Cargar galería (con limpieza de duplicados)
                const respGaleria = await api.get(`/negocios/${negocioId}/galeria`);
                if (respGaleria.data.success && respGaleria.data.data.length > 0) {
                    const todos: { id: string; url: string }[] = respGaleria.data.data.map(
                        (img: { id: string; url: string }) => ({ id: img.id, url: img.url })
                    );

                    // Deduplicar: mantener solo el primer registro de cada URL
                    const urlsVistas = new Set<string>();
                    const unicos: { id: string; url: string }[] = [];
                    const duplicadosIds: string[] = [];

                    for (const img of todos) {
                        if (urlsVistas.has(img.url)) {
                            duplicadosIds.push(img.id);
                        } else {
                            urlsVistas.add(img.url);
                            unicos.push(img);
                        }
                    }

                    // Borrar duplicados de BD en background
                    if (duplicadosIds.length > 0) {
                        for (const id of duplicadosIds) {
                            api.delete(`/negocios/${negocioId}/galeria/${id}`).catch(() => {});
                        }
                    }

                    setGaleriaImagenes(unicos);
                    setGaleriaUrls(unicos.map(img => img.url));
                }

                datosYaCargados.current = true;

            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
            }
        };

        cargarDatos();
    }, [negocioId]);

    // ---------------------------------------------------------------------------
    // Validación en tiempo real
    // ---------------------------------------------------------------------------

    const esFormularioValido = () => {
        const tienePortada = portada.r2Url !== null && portada.r2Url !== '';
        const tieneGaleria = galeriaUrls.length >= 1;
        return tienePortada && tieneGaleria;
    };

    useEffect(() => {
        const esValido = esFormularioValido();
        setSiguienteDeshabilitado(!esValido);

        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(4, Boolean(esValido));
    }, [portada.r2Url, galeriaUrls]);

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
                    logoUrl: logo.r2Url ?? undefined,
                    portadaUrl: portada.r2Url ?? undefined,
                    galeriaUrls: galeriaUrls.length > 0 ? galeriaUrls : undefined,
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
    }, [logo.r2Url, portada.r2Url, galeriaUrls]);

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
        // Crear blob URL propio para capa blur (independiente del hook)
        if (logoMiniatura) URL.revokeObjectURL(logoMiniatura);
        setLogoMiniatura(URL.createObjectURL(file));
        try {
            await logo.uploadImage(file);
        } catch (error) {
            console.error('❌ Error al subir logo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al subir logo';
            notificar.error(errorMessage);
        }
    };

    const handleLogoDelete = () => {
        const urlAnterior = logo.r2Url || logo.imageUrl;
        logo.reset();
        if (logoMiniatura) { URL.revokeObjectURL(logoMiniatura); setLogoMiniatura(null); }
        const { guardarBorradorPaso5 } = useOnboardingStore.getState();
        guardarBorradorPaso5({ logoUrl: '' });
        if (urlAnterior && urlAnterior.startsWith('http')) {
            eliminarImagenHuerfana(urlAnterior).catch(() => { /* silencioso */ });
        }
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
        if (portadaMiniatura) URL.revokeObjectURL(portadaMiniatura);
        setPortadaMiniatura(URL.createObjectURL(file));
        try {
            await portada.uploadImage(file);
        } catch (error) {
            console.error('❌ Error al subir portada:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error al subir portada';
            notificar.error(errorMessage);
        }
    };

    const handlePortadaDelete = () => {
        const urlAnterior = portada.r2Url || portada.imageUrl;
        portada.reset();
        if (portadaMiniatura) { URL.revokeObjectURL(portadaMiniatura); setPortadaMiniatura(null); }
        const { guardarBorradorPaso5 } = useOnboardingStore.getState();
        guardarBorradorPaso5({ portadaUrl: '' });
        if (urlAnterior && urlAnterior.startsWith('http')) {
            eliminarImagenHuerfana(urlAnterior).catch(() => { /* silencioso */ });
        }
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

    const subirImagenGaleriaR2 = async (file: File) => {
        // Optimizar: crear canvas, redimensionar, comprimir a webp
        const blob = await new Promise<Blob>((resolve, reject) => {
            const img = new Image();
            const blobUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(blobUrl);
                let { width, height } = img;
                if (width > 1200) { height = Math.round((height * 1200) / width); width = 1200; }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('No canvas')); return; }
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob error')), 'image/webp', 0.85);
            };
            img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Error imagen')); };
            img.src = blobUrl;
        });

        const nombreArchivo = file.name.replace(/\.[^.]+$/, '.webp');
        const resp = await generarUrlUploadOnboarding(nombreArchivo, 'image/webp', 'galeria');
        if (!resp.success || !resp.data) throw new Error(resp.message || 'Error presigned URL');

        const putResp = await fetch(resp.data.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/webp' } });
        if (!putResp.ok) throw new Error(`Error R2: ${putResp.status}`);

        return resp.data.publicUrl;
    };

    const handleGaleriaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const archivos = Array.from(files).slice(0, 10 - galeriaUrls.length);
        if (archivos.length === 0) return;

        // Crear previews inmediatos (blob URLs para blur de fondo)
        const previews = archivos.map((f, i) => ({
            tempId: `temp-${Date.now()}-${i}`,
            blobUrl: URL.createObjectURL(f),
        }));
        setGaleriaSubiendo(previews);
        setSubiendoGaleria(true);

        try {
            for (let i = 0; i < archivos.length; i++) {
                // 1. Subir a R2
                const url = await subirImagenGaleriaR2(archivos[i]);

                // 2. Guardar en BD inmediatamente (solo esta imagen)
                const response = await api.post(`/onboarding/${negocioId}/galeria`, {
                    imagenes: [{ url, cloudinaryPublicId: '' }]
                });

                // 3. Actualizar UI: quitar preview, agregar imagen real con su ID de BD
                const nuevaImagen = response.data?.data?.[0];
                if (nuevaImagen) {
                    setGaleriaImagenes(prev => [...prev, { id: nuevaImagen.id, url: nuevaImagen.url }]);
                }
                setMiniaturasGaleria(prev => ({ ...prev, [url]: previews[i].blobUrl }));
                setGaleriaSubiendo(prev => prev.filter(p => p.tempId !== previews[i].tempId));
                setGaleriaUrls(prev => [...prev, url]);
            }
        } catch (error) {
            console.error('Error al subir galería:', error);
            notificar.error('Error al subir imágenes');
            galeriaSubiendo.forEach(p => URL.revokeObjectURL(p.blobUrl));
            setGaleriaSubiendo([]);
        } finally {
            setSubiendoGaleria(false);
            if (galeriaInputRef.current) galeriaInputRef.current.value = '';
        }
    };

    const handleGaleriaDelete = async (index: number) => {
        const urlAEliminar = galeriaUrls[index];
        const imagenEnBD = galeriaImagenes.find(img => img.url === urlAEliminar);

        // Quitar de UI inmediatamente
        setGaleriaUrls(prev => prev.filter((_, i) => i !== index));

        // Eliminar de BD
        if (imagenEnBD?.id) {
            try {
                await api.delete(`/negocios/${negocioId}/galeria/${imagenEnBD.id}`);
                setGaleriaImagenes(prev => prev.filter(img => img.id !== imagenEnBD.id));
            } catch (error) {
                console.error('Error al eliminar de BD:', error);
            }
        }

        // Eliminar de R2
        if (urlAEliminar) {
            eliminarImagenHuerfana(urlAEliminar).catch(() => { /* silencioso */ });
        }
    };

    // Limpiar blob URL de miniatura después de que la R2 hizo fade-in
    const handleGaleriaCargada = (url: string) => {
        const blobUrl = miniaturasGaleria[url];
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            setMiniaturasGaleria(prev => {
                const next = { ...prev };
                delete next[url];
                return next;
            });
        }
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

        // Crear un fake event para reutilizar handleGaleriaChange
        const dataTransfer = new DataTransfer();
        Array.from(files).forEach(f => dataTransfer.items.add(f));
        const fakeInput = { target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>;
        await handleGaleriaChange(fakeInput);
    };

    // ---------------------------------------------------------------------------
    // Render
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

    return (
        <div className="space-y-4 lg:space-y-3.5 2xl:space-y-5">

            {/* ================================================================= */}
            {/* CARD: Imágenes Principales */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                        <ImageIcon className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Imágenes Principales</span>
                    <div className="ml-auto text-right text-xs lg:text-xs 2xl:text-sm text-white/70 font-medium leading-tight">
                        <p className="lg:inline">PNG o JPG</p>
                        <span className="hidden lg:inline"> · </span>
                        <p className="lg:inline">máx. 2MB</p>
                    </div>
                </div>
                <div className="p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3 2xl:gap-4">
                        {/* Logo */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700">Logo del Negocio <span className="font-medium text-slate-500">(Opcional)</span></label>
                            </div>
                            <div className="aspect-video flex items-center justify-start">
                                <ZonaUpload
                                    imageUrl={logo.imageUrl} miniatura={logoMiniatura}
                                    isUploading={logo.isUploading} r2Url={logo.r2Url}
                                    inputRef={logoInputRef} isDragging={isDraggingLogo} aspect="h-full aspect-square"
                                    onFileChange={handleLogoChange} onDelete={handleLogoDelete}
                                    onDragEnter={handleLogoDragEnter} onDragOver={handleLogoDragOver}
                                    onDragLeave={handleLogoDragLeave} onDrop={handleLogoDrop}
                                    placeholder="Logo cuadrado" uploadingText="Subiendo logo..."
                                    onImageClick={() => logo.imageUrl && setModalImagenes({ isOpen: true, images: [logo.imageUrl], initialIndex: 0 })}
                                />
                            </div>
                        </div>

                        {/* Portada */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700">Portada <span className="text-red-500">*</span></label>
                                <span className="text-sm lg:text-sm 2xl:text-base text-slate-500 font-medium">1600×900px</span>
                            </div>
                            <ZonaUpload
                                imageUrl={portada.imageUrl} miniatura={portadaMiniatura}
                                isUploading={portada.isUploading} r2Url={portada.r2Url}
                                inputRef={portadaInputRef} isDragging={isDraggingPortada} aspect="aspect-video"
                                onFileChange={handlePortadaChange} onDelete={handlePortadaDelete}
                                onDragEnter={handlePortadaDragEnter} onDragOver={handlePortadaDragOver}
                                onDragLeave={handlePortadaDragLeave} onDrop={handlePortadaDrop}
                                placeholder="Portada horizontal" uploadingText="Subiendo portada..."
                                onImageClick={() => portada.imageUrl && setModalImagenes({ isOpen: true, images: [portada.imageUrl], initialIndex: 0 })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* CARD: Galería de Fotos */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center justify-between rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="flex items-center gap-2 lg:gap-2.5">
                        <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                            <Grid3x3 className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Galería de Fotos <span className="font-medium text-white/60">(Mínimo 1)</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-sm lg:text-sm 2xl:text-base font-bold ${(galeriaUrls.length) >= 10 ? 'text-red-400' : 'text-white/60'}`}>
                            {galeriaUrls.length}/10
                        </span>
                        {galeriaUrls.length < 10 && (
                            <label className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-all">
                                <Plus className="w-4 h-4 text-white" />
                                <input ref={galeriaInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" multiple onChange={handleGaleriaChange} className="hidden" disabled={subiendoGaleria} />
                            </label>
                        )}
                    </div>
                </div>
                <div className="p-4 lg:p-3 2xl:p-4">

                    {/* ---- GALERÍA MÓVIL: carrusel 2×2 (igual a Mi Perfil) ---- */}
                    {(() => {
                        const items = [...galeriaUrls];
                        const paginas: string[][] = [];
                        for (let i = 0; i < items.length; i += 4) paginas.push(items.slice(i, i + 4));

                        return (
                            <div className="lg:hidden overflow-x-auto perfil-kpi-scroll" style={{ scrollSnapType: 'x mandatory' }}>
                                <div className="flex gap-2">
                                    {paginas.map((pagina, pi) => (
                                        <div key={pi} className="grid grid-cols-2 gap-2 shrink-0 w-full" style={{ scrollSnapAlign: 'start' }}>
                                            {pagina.map((url, ii) => {
                                                const index = pi * 4 + ii;
                                                return (
                                                    <div key={index} className="relative group aspect-square bg-white rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm"
                                                        onClick={() => setModalImagenes({ isOpen: true, images: galeriaUrls, initialIndex: index })}>
                                                        {(miniaturasGaleria[url] || url) && (
                                                            <img src={miniaturasGaleria[url] || url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(8px)' }} />
                                                        )}
                                                        <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                                                            style={{ opacity: 1, transition: 'opacity 300ms' }} />
                                                        <div className="absolute bottom-0 inset-x-0 h-12"
                                                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
                                                        <button onClick={() => handleGaleriaDelete(index)}
                                                            className="absolute bottom-2 right-2 w-9 h-9 bg-black/30 hover:bg-red-600 text-white rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-colors">
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}

                                    {/* Página con items subiendo */}
                                    {galeriaSubiendo.length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 shrink-0 w-full" style={{ scrollSnapAlign: 'start' }}>
                                            {galeriaSubiendo.map((item) => (
                                                <div key={item.tempId} className="relative aspect-square bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm">
                                                    <img src={item.blobUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(8px)' }} />
                                                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                                        <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ---- GALERÍA DESKTOP: grid 3 columnas ---- */}
                    <div className="hidden lg:grid lg:grid-cols-3 gap-2 2xl:gap-2.5">
                        {galeriaUrls.map((url: string, index: number) => (
                            <CeldaGaleria
                                key={`galeria-${url}`}
                                url={url}
                                miniatura={miniaturasGaleria[url] || null}
                                subiendo={false}
                                onDelete={() => handleGaleriaDelete(index)}
                                onCargada={handleGaleriaCargada}
                                onImageClick={() => setModalImagenes({ isOpen: true, images: galeriaUrls, initialIndex: index })}
                            />
                        ))}

                        {galeriaSubiendo.map((item) => (
                            <CeldaGaleria
                                key={item.tempId}
                                url={item.blobUrl}
                                miniatura={null}
                                subiendo={true}
                                onDelete={() => {}}
                            />
                        ))}

                        {(galeriaUrls.length + galeriaSubiendo.length) < 10 && (
                            <div
                                onClick={() => !subiendoGaleria && galeriaInputRef.current?.click()}
                                onDragEnter={handleGaleriaDragEnter} onDragOver={handleGaleriaDragOver}
                                onDragLeave={handleGaleriaDragLeave} onDrop={handleGaleriaDrop}
                                className={`aspect-video rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center transition-all ${
                                    isDraggingGaleria ? 'border-slate-400 bg-slate-200' : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100'
                                } ${!subiendoGaleria ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                            >
                                <div className="flex flex-col items-center justify-center p-4 text-center">
                                    <Plus className="w-6 h-6 text-slate-400 mb-1" />
                                    <p className="text-sm font-medium text-slate-600">Agregar</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            <ModalImagenes
                images={modalImagenes.images}
                initialIndex={modalImagenes.initialIndex}
                isOpen={modalImagenes.isOpen}
                onClose={() => setModalImagenes({ isOpen: false, images: [], initialIndex: 0 })}
            />
        </div>
    );
}

export default PasoImagenes;