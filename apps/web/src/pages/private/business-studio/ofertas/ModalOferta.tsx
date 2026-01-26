/**
 * ============================================================================
 * COMPONENTE: ModalOferta
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/ModalOferta.tsx
 * 
 * PROPÓSITO:
 * Modal para crear y editar ofertas
 * Layout 2 columnas siguiendo patrón de ModalArticulo
 * 
 * FEATURES:
 * - Layout flex: vertical móvil, horizontal laptop+
 * - Subida de imagen optimista
 * - Formulario completo con validación
 * - Patrón idéntico a ModalArticulo
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ImagePlus, Gift, Truck, Percent, DollarSign, ShoppingBag, Tag } from 'lucide-react';
import { useOptimisticUpload } from '../../../../hooks/useOptimisticUpload';
import { Boton, DatePicker, ModalImagenes } from '../../../../components/ui';
import { notificar } from '../../../../utils/notificaciones';
import type { Oferta, TipoOferta, CrearOfertaInput, ActualizarOfertaInput } from '../../../../types/ofertas';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalOfertaProps {
    abierto: boolean;
    onCerrar: () => void;
    oferta: Oferta | null;
    onGuardar: (datos: CrearOfertaInput | ActualizarOfertaInput) => Promise<void>;
}

interface FormularioState {
    titulo: string;
    descripcion: string;
    tipo: TipoOferta;
    valor: string;
    compraMinima: string;
    fechaInicio: string;
    fechaFin: string;
    limiteUsos: string;
    activo: boolean;
}

interface Errores {
    titulo?: string;
    fechaInicio?: string;
    fechaFin?: string;
    valor?: string;
    limiteUsos?: string;
}

// Tipo extendido para manejar posibles nombres de campo de imagen
type OfertaConImagen = Oferta & {
    imagen?: string;
    imagenUrl?: string;
    imagenPrincipal?: string;
};

// =============================================================================
// VALORES INICIALES
// =============================================================================

const FORMULARIO_INICIAL: FormularioState = {
    titulo: '',
    descripcion: '',
    tipo: 'porcentaje',
    valor: '',
    compraMinima: '0',
    fechaInicio: '',
    fechaFin: '',
    limiteUsos: '',
    activo: true,
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Retorna configuración de placeholder según tipo de oferta
 */
function getPlaceholderTipo(tipo: string): { 
    gradiente: string; 
    iconoColor: string;
    Icono: React.ComponentType<{ className?: string }>;
} {
    switch (tipo) {
        case 'porcentaje':
            return { 
                gradiente: 'from-red-400 to-rose-600', 
                iconoColor: 'text-red-200/30',
                Icono: Percent 
            };
        case 'monto_fijo':
            return { 
                gradiente: 'from-green-400 to-emerald-600', 
                iconoColor: 'text-green-200/30',
                Icono: DollarSign 
            };
        case '2x1':
        case '3x2':
            return { 
                gradiente: 'from-orange-400 to-amber-600', 
                iconoColor: 'text-orange-200/30',
                Icono: ShoppingBag 
            };
        case 'envio_gratis':
            return { 
                gradiente: 'from-blue-400 to-sky-600', 
                iconoColor: 'text-blue-200/30',
                Icono: Truck 
            };
        case 'regalo':
            return { 
                gradiente: 'from-purple-400 to-violet-600', 
                iconoColor: 'text-purple-200/30',
                Icono: Gift 
            };
        default:
            return { 
                gradiente: 'from-slate-400 to-slate-600', 
                iconoColor: 'text-slate-200/30',
                Icono: Tag 
            };
    }
}

/**
 * Extrae solo la fecha en formato YYYY-MM-DD de una fecha ISO o timestamp
 * Funciona con: "2026-01-09T00:00:00Z", "2026-01-09 00:00:00+00", etc.
 */
const extraerFecha = (fechaISO: string): string => {
    // Tomar solo los primeros 10 caracteres (YYYY-MM-DD)
    return fechaISO.substring(0, 10);
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalOferta({ abierto, onCerrar, oferta, onGuardar }: ModalOfertaProps) {
    const esEdicion = !!oferta;

    // ===========================================================================
    // ESTADOS
    // ===========================================================================

    const [formulario, setFormulario] = useState<FormularioState>(FORMULARIO_INICIAL);
    const [errores, setErrores] = useState<Errores>({});
    const [guardando, setGuardando] = useState(false);
    const [modalImagenes, setModalImagenes] = useState<{
        isOpen: boolean;
        images: string[];
        initialIndex: number;
    }>({ isOpen: false, images: [], initialIndex: 0 });

    // ===========================================================================
    // HOOK DE UPLOAD
    // ===========================================================================

    const imagen = useOptimisticUpload({
        carpeta: 'ofertas',
        onError: (error) => notificar.error(`Error al subir imagen: ${error.message}`),
    });

    // ===========================================================================
    // EFECTOS
    // ===========================================================================

    useEffect(() => {
        if (abierto && oferta) {
            setFormulario({
                titulo: oferta.titulo,
                descripcion: oferta.descripcion || '',
                tipo: oferta.tipo,
                valor: oferta.valor ? String(oferta.valor) : '',
                compraMinima: String(oferta.compraMinima),
                fechaInicio: extraerFecha(oferta.fechaInicio),
                fechaFin: extraerFecha(oferta.fechaFin),
                limiteUsos: oferta.limiteUsos ? String(oferta.limiteUsos) : '',
                activo: oferta.activo,
            });

            // Cargar imagen si existe (probar diferentes nombres posibles)
            const ofertaConImg = oferta as OfertaConImagen;
            const imagenUrl = ofertaConImg.imagen || ofertaConImg.imagenUrl || ofertaConImg.imagenPrincipal;

            if (imagenUrl) {
                imagen.setImageUrl(imagenUrl);
                imagen.setCloudinaryUrl(imagenUrl);
                imagen.setIsLocal(false);
            } else {
                // Resetear imagen si la oferta no tiene
                imagen.setImageUrl(null);
                imagen.setCloudinaryUrl(null);
                imagen.setIsLocal(false);
            }
        } else if (abierto && !oferta) {
            setFormulario(FORMULARIO_INICIAL);
            setErrores({});
            imagen.setImageUrl(null);
            imagen.setCloudinaryUrl(null);
        }
    }, [abierto, oferta]);

    // Bloquear scroll del body cuando modal está abierto (solución robusta)
    useEffect(() => {
        if (abierto) {
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
        }
    }, [abierto]);

    // ===========================================================================
    // HANDLERS
    // ===========================================================================

    const abrirImagenUnica = (url: string) => {
        setModalImagenes({ isOpen: true, images: [url], initialIndex: 0 });
    };

    const cerrarModalImagenes = () => {
        setModalImagenes({ isOpen: false, images: [], initialIndex: 0 });
    };

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) imagen.uploadImage(file);
    };

    const handleEliminarImagen = async () => {
        if (imagen.cloudinaryUrl) await imagen.deleteImage();
    };

    const validarFormulario = (): boolean => {
        const nuevosErrores: Errores = {};

        if (!formulario.titulo.trim()) {
            nuevosErrores.titulo = 'El título es requerido';
        } else if (formulario.titulo.trim().length < 5) {
            nuevosErrores.titulo = 'El título debe tener al menos 5 caracteres';
        }

        if (!formulario.fechaInicio) nuevosErrores.fechaInicio = 'La fecha de inicio es requerida';
        if (!formulario.fechaFin) nuevosErrores.fechaFin = 'La fecha de fin es requerida';

        if (formulario.fechaInicio && formulario.fechaFin) {
            if (new Date(formulario.fechaFin) < new Date(formulario.fechaInicio)) {
                nuevosErrores.fechaFin = 'La fecha de fin debe ser posterior al inicio';
            }
        }

        if ((formulario.tipo === 'porcentaje' || formulario.tipo === 'monto_fijo') && !formulario.valor) {
            nuevosErrores.valor = 'El valor es requerido';
        }

        if (formulario.tipo === 'otro' && !formulario.valor?.trim()) {
            nuevosErrores.valor = 'El concepto es requerido';
        }

        if (formulario.tipo === 'porcentaje' && formulario.valor) {
            const porcentaje = Number(formulario.valor);
            if (porcentaje < 1 || porcentaje > 100) {
                nuevosErrores.valor = 'El porcentaje debe estar entre 1 y 100';
            }
        }

        if (formulario.tipo === 'otro' && formulario.valor && formulario.valor.length > 50) {
            nuevosErrores.valor = 'El texto no puede exceder 50 caracteres';
        }

        if (formulario.limiteUsos && Number(formulario.limiteUsos) <= 0) {
            nuevosErrores.limiteUsos = 'El límite debe ser mayor a 0';
        }

        if (imagen.isUploading) {
            notificar.error('Espera a que termine de subir la imagen');
            return false;
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validarFormulario()) return;

        setGuardando(true);
        try {
            const datos: CrearOfertaInput | ActualizarOfertaInput = {
                titulo: formulario.titulo.trim(),
                descripcion: formulario.descripcion.trim() || null,
                imagen: imagen.cloudinaryUrl || null,
                tipo: formulario.tipo,
                valor: formulario.tipo === 'otro'
                    ? formulario.valor || null  // String para "otro"
                    : formulario.valor ? Number(formulario.valor) : null,  // Número para porcentaje/monto_fijo
                compraMinima: Number(formulario.compraMinima),
                fechaInicio: formulario.fechaInicio + 'T00:00:00Z',  // Formato ISO con UTC
                fechaFin: formulario.fechaFin + 'T23:59:59Z',        // Formato ISO con UTC
                limiteUsos: formulario.limiteUsos ? Number(formulario.limiteUsos) : null,
                activo: formulario.activo,
            };
            await onGuardar(datos);
        } finally {
            setGuardando(false);
        }
    };

    const mostrarValor = formulario.tipo === 'porcentaje' || formulario.tipo === 'monto_fijo' || formulario.tipo === 'otro';

    if (!abierto) return null;

    // ===========================================================================
    // RENDER
    // ===========================================================================

    return (
        <>
            {/* Modal */}
            <div
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 lg:p-4"
                onClick={onCerrar}
            >
                <div
                    className="bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl w-full max-w-xs lg:max-w-xl 2xl:max-w-4xl flex flex-col overflow-hidden max-h-[60vh] lg:max-h-[75vh] 2xl:max-h-[90vh] shadow-2xl border-2 border-slate-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 lg:px-4 lg:py-2.5 2xl:px-5 2xl:py-4 border-b-2 border-slate-300 bg-slate-100 shrink-0">
                        <h2 className="text-base lg:text-base 2xl:text-xl font-bold text-slate-800">
                            {esEdicion ? 'Editar Oferta' : 'Nueva Oferta'}
                        </h2>

                        {/* Toggle Activa en el header */}
                        <div className="flex items-center gap-3 2xl:gap-4">
                            <div className="flex items-center gap-2 2xl:gap-3">
                                {formulario.activo ? (
                                    <Eye className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6 text-green-600" />
                                ) : (
                                    <EyeOff className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6 text-slate-400" />
                                )}
                                <span className="text-sm 2xl:text-lg font-medium text-slate-700">
                                    {formulario.activo ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormulario((prev) => ({ ...prev, activo: !prev.activo }))}
                                disabled={guardando}
                                className={`relative w-11 h-6 rounded-full transition-colors ${formulario.activo ? 'bg-green-500' : 'bg-slate-300'
                                    } disabled:opacity-50`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${formulario.activo ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                            <button
                                onClick={onCerrar}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1 lg:p-1 2xl:p-1.5 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Body - 2 columnas en laptop+ */}
                    <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row flex-1 overflow-y-auto">
                        {/* COLUMNA IZQUIERDA - IMAGEN */}
                        <div className="lg:w-2/5 p-2.5 lg:p-2 2xl:p-5 lg:border-r-2 border-slate-300 bg-slate-50">
                            {/* Zona de imagen */}
                            <div className="relative aspect-3/2 lg:aspect-4/3 2xl:aspect-4/3 bg-slate-100 rounded-lg overflow-hidden border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors mb-2 lg:mb-2">
                                {imagen.imageUrl ? (
                                    <>
                                        <img
                                            src={imagen.imageUrl}
                                            alt="Vista previa"
                                            className="w-full h-full object-cover cursor-pointer"
                                            onClick={() => abrirImagenUnica(imagen.imageUrl!)}
                                        />
                                        {imagen.isUploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <div className="text-white text-sm font-medium">Subiendo...</div>
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleEliminarImagen}
                                            disabled={imagen.isUploading || guardando}
                                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    (() => {
                                        const { gradiente, iconoColor, Icono } = getPlaceholderTipo(formulario.tipo);
                                        return (
                                            <label className={`w-full h-full flex flex-col items-center justify-center cursor-pointer bg-linear-to-br ${gradiente} relative overflow-hidden`}>
                                                {/* Icono grande de fondo desvanecido */}
                                                <Icono className={`absolute -right-6 -bottom-6 w-32 h-32 lg:w-28 lg:h-28 2xl:w-32 2xl:h-32 ${iconoColor}`} />
                                                
                                                {/* Contenido centrado */}
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <ImagePlus className="w-12 h-12 text-white/70 mb-2" />
                                                    <p className="text-sm font-medium text-white/90">Imagen de la oferta</p>
                                                    <p className="text-xs text-white/70 mt-1">Click para subir</p>
                                                </div>
                                                
                                                <input
                                                    id="input-imagen-oferta"
                                                    name="input-imagen-oferta"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImagenChange}
                                                    disabled={guardando}
                                                    className="hidden"
                                                />
                                            </label>
                                        );
                                    })()
                                )}
                            </div>

                            {/* Título de sección */}
                            <div className="mb-2">
                                <span className="block text-xs 2xl:text-base font-bold text-slate-700">
                                    Tipo de oferta <span className="text-red-500">*</span>
                                </span>
                            </div>

                            {/* Grid de 6 botones (2 filas x 3 columnas) */}
                            <div className="grid grid-cols-3 gap-2 lg:gap-1.5 2xl:gap-2">
                                {/* FILA 1: Tipos que NO usan input */}
                                <button
                                    type="button"
                                    onClick={() => setFormulario((prev) => ({ ...prev, tipo: '2x1', valor: '' }))}
                                    disabled={guardando}
                                    className={`flex items-center justify-center gap-2 lg:gap-1 2xl:gap-2 px-3 whitespace-nowrap py-2 lg:px-2 lg:py-2 2xl:px-3 2xl:py-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all ${formulario.tipo === '2x1'
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:bg-orange-50'
                                        }`}
                                >
                                    <Gift className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                    2x1
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormulario((prev) => ({ ...prev, tipo: '3x2', valor: '' }))}
                                    disabled={guardando}
                                    className={`flex items-center justify-center gap-2 lg:gap-1 2xl:gap-2 px-3 whitespace-nowrap py-2 lg:px-2 lg:py-2 2xl:px-3 2xl:py-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all ${formulario.tipo === '3x2'
                                        ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:bg-orange-50'
                                        }`}
                                >
                                    <Gift className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                    3x2
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormulario((prev) => ({ ...prev, tipo: 'envio_gratis', valor: '' }))}
                                    disabled={guardando}
                                    className={`flex items-center justify-center gap-2 lg:gap-1 2xl:gap-2 px-3 whitespace-nowrap py-2 lg:px-2 lg:py-2 2xl:px-3 2xl:py-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all ${formulario.tipo === 'envio_gratis'
                                        ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                                        }`}
                                >
                                    <Truck className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                    Envío
                                </button>

                                {/* FILA 2: Tipos que SÍ usan input */}
                                <button
                                    type="button"
                                    onClick={() => setFormulario((prev) => ({ ...prev, tipo: 'porcentaje', valor: prev.tipo === 'porcentaje' ? prev.valor : '' }))}
                                    disabled={guardando}
                                    className={`flex items-center justify-center gap-1 lg:gap-0.5 2xl:gap-1 px-3 whitespace-nowrap py-2 lg:px-2 lg:py-2 2xl:px-3 2xl:py-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all ${formulario.tipo === 'porcentaje'
                                        ? 'bg-red-500 text-white border-red-500 shadow-md'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-red-400 hover:bg-red-50'
                                        }`}
                                >
                                    Desc. %
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormulario((prev) => ({ ...prev, tipo: 'monto_fijo', valor: prev.tipo === 'monto_fijo' ? prev.valor : '' }))}
                                    disabled={guardando}
                                    className={`flex items-center justify-center gap-1 lg:gap-0.5 2xl:gap-1 px-3 whitespace-nowrap py-2 lg:px-2 lg:py-2 2xl:px-3 2xl:py-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all ${formulario.tipo === 'monto_fijo'
                                        ? 'bg-green-500 text-white border-green-500 shadow-md'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-green-400 hover:bg-green-50'
                                        }`}
                                >
                                    Monto $
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormulario((prev) => ({ ...prev, tipo: 'otro', valor: prev.tipo === 'otro' ? prev.valor : '' }))}
                                    disabled={guardando}
                                    className={`flex items-center justify-center gap-1 lg:gap-0.5 2xl:gap-1 px-3 whitespace-nowrap py-2 lg:px-2 lg:py-2 2xl:px-3 2xl:py-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all ${formulario.tipo === 'otro'
                                        ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                                        : 'bg-white text-slate-700 border-slate-300 hover:border-purple-400 hover:bg-purple-50'
                                        }`}
                                >
                                    Otro
                                </button>
                            </div>

                            {/* Input de Valor/Concepto (SIEMPRE visible) */}
                            <div className="mt-2 lg:mt-2">
                                <label htmlFor="input-valor-oferta" className={`block text-xs 2xl:text-base font-bold mb-1.5 ${mostrarValor ? 'text-slate-700' : 'text-slate-400'
                                    }`}>
                                    {formulario.tipo === 'otro' ? 'Concepto' : 'Valor'} {mostrarValor && <span className="text-red-500">*</span>}
                                </label>
                                <div className="relative">
                                    {formulario.tipo !== 'otro' && mostrarValor && (
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">
                                            {formulario.tipo === 'porcentaje' ? '%' : '$'}
                                        </span>
                                    )}
                                    <input
                                        id="input-valor-oferta"
                                        name="input-valor-oferta"
                                        type={formulario.tipo === 'otro' ? 'text' : 'number'}
                                        value={formulario.valor}
                                        onChange={(e) => setFormulario((prev) => ({ ...prev, valor: e.target.value }))}
                                        placeholder={
                                            !mostrarValor
                                                ? 'No aplica'
                                                : formulario.tipo === 'porcentaje'
                                                    ? '10'
                                                    : formulario.tipo === 'monto_fijo'
                                                        ? '50.00'
                                                        : 'Ej: HAPPY HOUR'
                                        }
                                        min={formulario.tipo !== 'otro' && mostrarValor ? '0' : undefined}
                                        max={formulario.tipo === 'porcentaje' ? '100' : undefined}
                                        step={formulario.tipo === 'porcentaje' ? '1' : formulario.tipo === 'monto_fijo' ? '0.01' : undefined}
                                        maxLength={formulario.tipo === 'otro' ? 50 : undefined}
                                        disabled={!mostrarValor || guardando}
                                        className={`w-full ${formulario.tipo !== 'otro' && mostrarValor ? 'pl-7' : 'pl-3'} pr-3 py-1.5 lg:py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition-colors ${!mostrarValor
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                                            : errores.valor
                                                ? 'border-red-300 hover:border-slate-400'
                                                : 'border-slate-300 hover:border-slate-400'
                                            }`}
                                    />
                                </div>
                                {errores.valor && mostrarValor && <p className="text-xs text-red-500 mt-1">{errores.valor}</p>}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA - FORMULARIO */}
                        <div className="flex-1 p-2.5 lg:p-2 2xl:p-5 space-y-2 lg:space-y-2 2xl:space-y-2.5 flex flex-col justify-center">
                            {/* Título */}
                            <div>
                                <label htmlFor="input-titulo-oferta" className="block text-xs 2xl:text-base font-bold text-slate-700 mb-1">
                                    Título <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="input-titulo-oferta"
                                    name="input-titulo-oferta"
                                    type="text"
                                    value={formulario.titulo}
                                    onChange={(e) => setFormulario((prev) => ({ ...prev, titulo: e.target.value }))}
                                    placeholder="Ej: 50% de descuento en pizzas"
                                    maxLength={150}
                                    disabled={guardando}
                                    className={`w-full px-3 py-1.5 lg:py-2 2xl:py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-xs 2xl:text-sm ${errores.titulo ? 'border-red-300' : 'border-slate-300'
                                        }`}
                                />
                                {errores.titulo && <p className="text-xs text-red-500 mt-1">{errores.titulo}</p>}
                            </div>

                            {/* Descripción */}
                            <div>
                                <label htmlFor="textarea-descripcion-oferta" className="block text-xs 2xl:text-base font-bold text-slate-700 mb-1">
                                    Descripción (opcional)
                                </label>
                                <textarea
                                    id="textarea-descripcion-oferta"
                                    name="textarea-descripcion-oferta"
                                    value={formulario.descripcion}
                                    onChange={(e) => setFormulario((prev) => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Términos y condiciones..."
                                    rows={2}
                                    maxLength={500}
                                    disabled={guardando}
                                    className="w-full px-3 py-1.5 lg:py-2 2xl:py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-xs 2xl:text-sm resize-none"
                                />
                            </div>

                            {/* Grid 2x2: Fechas y Compra mínima */}
                            <div className="grid grid-cols-2 gap-2 lg:gap-2 2xl:gap-3 mt-2 lg:mt-2 2xl:mt-4">
                                {/* Fila 1 - Columna 1: Fecha inicio */}
                                <div>
                                    <span className="block text-xs 2xl:text-base font-bold text-slate-700 mb-1">
                                        Fecha inicio <span className="text-red-500">*</span>
                                    </span>
                                    <DatePicker
                                        value={formulario.fechaInicio}
                                        onChange={(fecha) => setFormulario((prev) => ({ ...prev, fechaInicio: fecha }))}
                                        placeholder="Seleccionar fecha"
                                        disabled={guardando}
                                        error={!!errores.fechaInicio}
                                    />
                                    {errores.fechaInicio && <p className="text-xs text-red-500 mt-1">{errores.fechaInicio}</p>}
                                </div>

                                {/* Fila 1 - Columna 2: Fecha fin */}
                                <div>
                                    <span className="block text-xs 2xl:text-base font-bold text-slate-700 mb-1">
                                        Fecha fin <span className="text-red-500">*</span>
                                    </span>
                                    <DatePicker
                                        value={formulario.fechaFin}
                                        onChange={(fecha) => setFormulario((prev) => ({ ...prev, fechaFin: fecha }))}
                                        placeholder="DD/MM/YYYY"
                                        disabled={guardando}
                                        error={!!errores.fechaFin}
                                    />
                                    {errores.fechaFin && <p className="text-xs text-red-500 mt-1">{errores.fechaFin}</p>}
                                </div>

                                {/* Fila 2 - Columna 1: Compra mínima */}
                                <div className="col-span-2 lg:col-span-1">
                                    <label htmlFor="input-compra-minima" className="block text-xs 2xl:text-base font-bold text-slate-700 mb-1">
                                        Compra mínima (opcional)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                        <input
                                            id="input-compra-minima"
                                            name="input-compra-minima"
                                            type="number"
                                            value={formulario.compraMinima}
                                            onChange={(e) => setFormulario((prev) => ({ ...prev, compraMinima: e.target.value }))}
                                            placeholder="0.00"
                                            min="0"
                                            step="0.01"
                                            disabled={guardando}
                                            className="w-full pl-6 pr-2 py-1.5 lg:py-2 2xl:py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-xs 2xl:text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Fila 2 - Columna 2: Vacío en laptop+ */}
                                <div className="hidden lg:block"></div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                                <Boton variante="outline" onClick={onCerrar} className="flex-1 lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5" disabled={guardando}>
                                    Cancelar
                                </Boton>
                                <Boton
                                    type="submit"
                                    variante="primario"
                                    className="flex-1 lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5"
                                    disabled={guardando || imagen.isUploading}
                                    cargando={guardando}
                                >
                                    {esEdicion ? 'Guardar' : 'Crear'}
                                </Boton>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal Imágenes */}
            <ModalImagenes
                images={modalImagenes.images}
                initialIndex={modalImagenes.initialIndex}
                isOpen={modalImagenes.isOpen}
                onClose={cerrarModalImagenes}
            />
        </>
    );
}

export default ModalOferta;