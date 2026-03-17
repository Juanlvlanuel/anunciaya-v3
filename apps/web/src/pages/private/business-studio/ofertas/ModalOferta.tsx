/**
 * ============================================================================
 * COMPONENTE: ModalOferta
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/ModalOferta.tsx
 *
 * PROPÓSITO:
 * Modal para crear y editar ofertas — hermano visual de ModalArticulo
 *
 * LAYOUT:
 * - Header dark gradient dinámico según tipo de oferta
 * - Móvil: imagen pequeña + fechas lado a lado; luego tipo grid + valor
 * - Desktop: imagen 4/3 a la izquierda; fechas + campos a la derecha
 *
 * FEATURES:
 * - Header con gradiente dinámico por tipo + toggle activo con Tooltip
 * - useR2Upload para imágenes (migración de Cloudinary a R2)
 * - TC-14 en todos los inputs
 * - Botones nativos (sin <Boton>)
 *
 * ACTUALIZADO: Marzo 2026 - Rediseño hermano ModalArticulo + migración R2
 */

import { useState, useEffect, useLayoutEffect } from 'react';
import {
    Trash2, Eye, EyeOff, ImagePlus,
    Gift, Truck, Percent, DollarSign, ShoppingBag, Tag,
} from 'lucide-react';
import { useR2Upload } from '../../../../hooks/useR2Upload';
import { generarUrlUploadImagenOferta } from '../../../../services/ofertasService';
import { Spinner } from '../../../../components/ui/Spinner';
import { DatePicker, ModalImagenes } from '../../../../components/ui';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import Tooltip from '../../../../components/ui/Tooltip';
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
}

type OfertaConImagen = Oferta & {
    imagen?: string;
    imagenUrl?: string;
    imagenPrincipal?: string;
};

// =============================================================================
// CONSTANTES
// =============================================================================

const GRADIENTES_TIPO: Record<TipoOferta, { bg: string; shadow: string; handle: string }> = {
    porcentaje:   { bg: 'linear-gradient(135deg, #b91c1c, #dc2626)', shadow: 'rgba(185,28,28,0.4)', handle: '#b91c1c' },
    monto_fijo:   { bg: 'linear-gradient(135deg, #15803d, #16a34a)', shadow: 'rgba(21,128,61,0.4)',  handle: '#15803d' },
    '2x1':        { bg: 'linear-gradient(135deg, #b45309, #d97706)', shadow: 'rgba(180,83,9,0.4)',   handle: '#b45309' },
    '3x2':        { bg: 'linear-gradient(135deg, #b45309, #d97706)', shadow: 'rgba(180,83,9,0.4)',   handle: '#b45309' },
    envio_gratis: { bg: 'linear-gradient(135deg, #1e40af, #2563eb)', shadow: 'rgba(30,64,175,0.4)',  handle: '#1e40af' },
    regalo:       { bg: 'linear-gradient(135deg, #6d28d9, #7c3aed)', shadow: 'rgba(109,40,217,0.4)', handle: '#6d28d9' },
    otro:         { bg: 'linear-gradient(135deg, #334155, #475569)', shadow: 'rgba(51,65,85,0.4)',   handle: '#334155' },
};

const ICONOS_TIPO: Record<TipoOferta, React.ComponentType<{ className?: string }>> = {
    porcentaje:   Percent,
    monto_fijo:   DollarSign,
    '2x1':        ShoppingBag,
    '3x2':        ShoppingBag,
    envio_gratis: Truck,
    regalo:       Gift,
    otro:         Tag,
};

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

const extraerFecha = (fechaISO: string): string => fechaISO.substring(0, 10);

// =============================================================================
// COMPONENTE PRINCIPAL
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
    // HOOK DE UPLOAD (R2)
    // ===========================================================================

    const imagen = useR2Upload({
        generarUrl: generarUrlUploadImagenOferta,
        onError: (err) => notificar.error(`Error al subir imagen: ${err.message}`),
    });

    // ===========================================================================
    // EFECTOS
    // ===========================================================================

    useLayoutEffect(() => {
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

            const ofertaConImg = oferta as OfertaConImagen;
            const imgUrl = ofertaConImg.imagen || ofertaConImg.imagenUrl || ofertaConImg.imagenPrincipal;
            if (imgUrl) {
                imagen.setImageUrl(imgUrl);
                imagen.setR2Url(imgUrl);
            } else {
                imagen.setImageUrl(null);
                imagen.setR2Url(null);
            }
        } else if (abierto && !oferta) {
            setFormulario(FORMULARIO_INICIAL);
            setErrores({});
            imagen.setImageUrl(null);
            imagen.setR2Url(null);
        }
    }, [abierto, oferta]); // useLayoutEffect: corre antes del paint, evita flash de color anterior

    // ===========================================================================
    // HANDLERS
    // ===========================================================================

    const abrirImagenUnica = (url: string) =>
        setModalImagenes({ isOpen: true, images: [url], initialIndex: 0 });

    const cerrarModalImagenes = () =>
        setModalImagenes({ isOpen: false, images: [], initialIndex: 0 });

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) imagen.uploadImage(file);
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
            const pct = Number(formulario.valor);
            if (pct < 1 || pct > 100) nuevosErrores.valor = 'El porcentaje debe estar entre 1 y 100';
        }

        if (formulario.tipo === 'otro' && formulario.valor && formulario.valor.length > 50) {
            nuevosErrores.valor = 'El texto no puede exceder 50 caracteres';
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
                imagen: imagen.r2Url || null,
                tipo: formulario.tipo,
                valor: formulario.tipo === 'otro'
                    ? formulario.valor || null
                    : formulario.valor ? Number(formulario.valor) : null,
                compraMinima: Number(formulario.compraMinima),
                fechaInicio: formulario.fechaInicio + 'T00:00:00Z',
                fechaFin: formulario.fechaFin + 'T23:59:59Z',
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

    const gradiente = GRADIENTES_TIPO[formulario.tipo];
    const IconoTipo = ICONOS_TIPO[formulario.tipo];

    // ===========================================================================
    // RENDER
    // ===========================================================================

    return (
        <>
            <ModalAdaptativo
                abierto={abierto}
                onCerrar={onCerrar}
                ancho="xl"
                paddingContenido="none"
                mostrarHeader={false}
                sinScrollInterno
                alturaMaxima="xl"
                colorHandle={gradiente.handle}
                headerOscuro
                className="max-w-xs lg:max-w-2xl 2xl:max-w-3xl"
            >
                <div className="flex flex-col max-h-[93vh] lg:max-h-[90vh] 2xl:max-h-[90vh]">

                    {/* ── Header dark ── */}
                    <div
                        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
                        style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
                    >
                        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

                        <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                            {/* Ícono tipo */}
                            <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                                <IconoTipo className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                            </div>

                            {/* Título */}
                            <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                                <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                                    {esEdicion ? (oferta?.titulo || 'Editar oferta') : 'Nueva oferta'}
                                </h3>
                                <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">
                                    {esEdicion ? 'Editando oferta' : 'Completa los campos'}
                                </span>
                            </div>

                            {/* Toggle activo — móvil: left | PC: bottom */}
                            <div className="lg:hidden">
                                <Tooltip text={formulario.activo ? 'Oferta activa' : 'Oferta inactiva'} position="left" autoHide={2500}>
                                    <button
                                        type="button"
                                        onClick={() => setFormulario(prev => ({ ...prev, activo: !prev.activo }))}
                                        disabled={guardando}
                                        className={`p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 ${formulario.activo ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
                                    >
                                        {formulario.activo ? <Eye className="w-5 h-5 text-white" /> : <EyeOff className="w-5 h-5 text-white/60" />}
                                    </button>
                                </Tooltip>
                            </div>
                            <div className="hidden lg:block">
                                <Tooltip text={formulario.activo ? 'Oferta activa' : 'Oferta inactiva'} position="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setFormulario(prev => ({ ...prev, activo: !prev.activo }))}
                                        disabled={guardando}
                                        className={`p-1.5 2xl:p-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 ${formulario.activo ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
                                    >
                                        {formulario.activo ? <Eye className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" /> : <EyeOff className="w-4 h-4 2xl:w-5 2xl:h-5 text-white/60" />}
                                    </button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {/* ── Body scrolleable ── */}
                    <div className="flex-1 overflow-y-auto">
                        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:h-full">

                            {/* ── Columna Izquierda ── */}
                            <div className="lg:w-2/5 px-3 pt-3 pb-1 lg:p-2 2xl:p-5 lg:border-r-2 border-slate-300 bg-slate-50 flex flex-col gap-3 lg:gap-2.5 2xl:gap-4">

                                {/* === MÓVIL: imagen pequeña + fechas lado a lado === */}
                                <div className="flex gap-2.5 lg:hidden">

                                    {/* Imagen pequeña */}
                                    <div
                                        className="w-36 shrink-0 rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative"
                                        style={{ aspectRatio: '1/1' }}
                                    >
                                        {imagen.imageUrl ? (
                                            <>
                                                <img
                                                    src={imagen.imageUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => abrirImagenUnica(imagen.imageUrl!)}
                                                />
                                                {imagen.isUploading && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                        <span className="text-white text-[10px] font-medium">Subiendo…</span>
                                                    </div>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => imagen.reset()}
                                                    className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 cursor-pointer"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : (
                                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 gap-1">
                                                <input
                                                    id="input-imagen-oferta"
                                                    name="input-imagen-oferta"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImagenChange}
                                                    className="hidden"
                                                />
                                                <ImagePlus className="w-6 h-6 text-slate-400" />
                                                <p className="text-[10px] text-slate-500 font-medium text-center leading-tight px-1">Agregar imagen</p>
                                            </label>
                                        )}
                                    </div>

                                    {/* Fechas inicio + fin */}
                                    <div className="flex-1 flex flex-col gap-2">
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700 mb-1">
                                                Inicio <span className="text-red-500">*</span>
                                            </span>
                                            <DatePicker
                                                value={formulario.fechaInicio}
                                                onChange={(fecha) => setFormulario(prev => ({ ...prev, fechaInicio: fecha }))}
                                                placeholder="Seleccionar"
                                                disabled={guardando}
                                                error={!!errores.fechaInicio}
                                                centradoEnMovil
                                            />
                                            {errores.fechaInicio && <p className="text-xs text-red-500 mt-0.5">{errores.fechaInicio}</p>}
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-slate-700 mb-1">
                                                Fin <span className="text-red-500">*</span>
                                            </span>
                                            <DatePicker
                                                value={formulario.fechaFin}
                                                onChange={(fecha) => setFormulario(prev => ({ ...prev, fechaFin: fecha }))}
                                                placeholder="DD/MM/YYYY"
                                                disabled={guardando}
                                                error={!!errores.fechaFin}
                                                centradoEnMovil
                                            />
                                            {errores.fechaFin && <p className="text-xs text-red-500 mt-0.5">{errores.fechaFin}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* === DESKTOP: imagen full width === */}
                                <div
                                    className="hidden lg:block rounded-lg 2xl:rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative"
                                    style={{ aspectRatio: '4/3' }}
                                >
                                    {imagen.imageUrl ? (
                                        <>
                                            <img
                                                src={imagen.imageUrl}
                                                alt="Preview"
                                                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => abrirImagenUnica(imagen.imageUrl!)}
                                            />
                                            {imagen.isUploading && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                    <span className="text-white text-xs font-medium">Subiendo…</span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => imagen.reset()}
                                                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 cursor-pointer"
                                            >
                                                <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                            </button>
                                        </>
                                    ) : (
                                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 gap-1.5">
                                            <input
                                                id="input-imagen-oferta-desktop"
                                                name="input-imagen-oferta-desktop"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImagenChange}
                                                className="hidden"
                                            />
                                            <ImagePlus className="w-6 h-6 2xl:w-7 2xl:h-7 text-slate-400" />
                                            <p className="text-xs 2xl:text-sm text-slate-500 font-medium text-center leading-tight px-2">Agregar imagen</p>
                                        </label>
                                    )}
                                </div>

                                {/* Tipo de oferta */}
                                <div>
                                    <span className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-2">
                                        Tipo de oferta <span className="text-red-500">*</span>
                                    </span>
                                    <div className="grid grid-cols-3 gap-2 lg:gap-1.5 2xl:gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormulario(prev => ({ ...prev, tipo: '2x1', valor: '' }))}
                                            disabled={guardando}
                                            className={`flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-1.5 px-2 py-2 lg:px-1.5 2xl:px-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all cursor-pointer whitespace-nowrap ${formulario.tipo === '2x1' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:bg-orange-50'}`}
                                        >
                                            <Gift className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                                            2x1
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormulario(prev => ({ ...prev, tipo: '3x2', valor: '' }))}
                                            disabled={guardando}
                                            className={`flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-1.5 px-2 py-2 lg:px-1.5 2xl:px-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all cursor-pointer whitespace-nowrap ${formulario.tipo === '3x2' ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:bg-orange-50'}`}
                                        >
                                            <Gift className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                                            3x2
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormulario(prev => ({ ...prev, tipo: 'envio_gratis', valor: '' }))}
                                            disabled={guardando}
                                            className={`flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-1.5 px-2 py-2 lg:px-1.5 2xl:px-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all cursor-pointer whitespace-nowrap ${formulario.tipo === 'envio_gratis' ? 'bg-blue-500 text-white border-blue-500 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50'}`}
                                        >
                                            <Truck className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                                            Envío
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormulario(prev => ({ ...prev, tipo: 'porcentaje', valor: prev.tipo === 'porcentaje' ? prev.valor : '' }))}
                                            disabled={guardando}
                                            className={`flex items-center justify-center px-2 py-2 lg:px-1.5 2xl:px-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all cursor-pointer whitespace-nowrap ${formulario.tipo === 'porcentaje' ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:border-red-400 hover:bg-red-50'}`}
                                        >
                                            Desc. %
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormulario(prev => ({ ...prev, tipo: 'monto_fijo', valor: prev.tipo === 'monto_fijo' ? prev.valor : '' }))}
                                            disabled={guardando}
                                            className={`flex items-center justify-center px-2 py-2 lg:px-1.5 2xl:px-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all cursor-pointer whitespace-nowrap ${formulario.tipo === 'monto_fijo' ? 'bg-green-500 text-white border-green-500 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:border-green-400 hover:bg-green-50'}`}
                                        >
                                            Monto $
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormulario(prev => ({ ...prev, tipo: 'otro', valor: prev.tipo === 'otro' ? prev.valor : '' }))}
                                            disabled={guardando}
                                            className={`flex items-center justify-center px-2 py-2 lg:px-1.5 2xl:px-2 rounded-lg border-2 font-semibold text-sm lg:text-xs 2xl:text-sm transition-all cursor-pointer whitespace-nowrap ${formulario.tipo === 'otro' ? 'bg-slate-600 text-white border-slate-600 shadow-md' : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500 hover:bg-slate-50'}`}
                                        >
                                            Otro
                                        </button>
                                    </div>
                                </div>

                                {/* Valor / Concepto + Compra mínima — misma fila, items-end alinea inputs cuando label tiene distinto alto */}
                                <div className="grid grid-cols-2 gap-2 lg:gap-1.5 2xl:gap-2 items-end">

                                    {/* Valor / Concepto */}
                                    <div>
                                        <label
                                            htmlFor="input-valor-oferta"
                                            className={`block text-sm lg:text-xs 2xl:text-sm font-bold mb-1.5 lg:mb-1 2xl:mb-2 ${mostrarValor ? 'text-slate-700' : 'text-slate-400'}`}
                                        >
                                            {formulario.tipo === 'otro' ? 'Concepto' : 'Valor'} {mostrarValor && <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="relative">
                                            {formulario.tipo !== 'otro' && mostrarValor && (
                                                <span className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base lg:text-sm 2xl:text-base font-medium">
                                                    {formulario.tipo === 'porcentaje' ? '%' : '$'}
                                                </span>
                                            )}
                                            <input
                                                id="input-valor-oferta"
                                                name="input-valor-oferta"
                                                type={formulario.tipo === 'otro' ? 'text' : 'number'}
                                                value={formulario.valor}
                                                onChange={(e) => setFormulario(prev => ({ ...prev, valor: e.target.value }))}
                                                placeholder={
                                                    !mostrarValor ? 'No aplica'
                                                        : formulario.tipo === 'porcentaje' ? '10'
                                                            : formulario.tipo === 'monto_fijo' ? '50.00'
                                                                : 'Ej: HAPPY HOUR'
                                                }
                                                min={formulario.tipo !== 'otro' && mostrarValor ? '0' : undefined}
                                                max={formulario.tipo === 'porcentaje' ? '100' : undefined}
                                                step={formulario.tipo === 'porcentaje' ? '1' : formulario.tipo === 'monto_fijo' ? '0.01' : undefined}
                                                maxLength={formulario.tipo === 'otro' ? 50 : undefined}
                                                disabled={!mostrarValor || guardando}
                                                className={`w-full h-11 lg:h-10 2xl:h-11 ${formulario.tipo !== 'otro' && mostrarValor ? 'pl-7 lg:pl-6 2xl:pl-7' : 'pl-4 lg:pl-3 2xl:pl-4'} pr-2 bg-slate-100 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base lg:text-sm 2xl:text-base font-medium transition-colors ${!mostrarValor ? 'text-slate-400 cursor-not-allowed border-slate-200' : errores.valor ? 'border-red-400 text-slate-800' : 'border-slate-300 text-slate-800 hover:border-slate-400'}`}
                                                style={mostrarValor ? { boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' } : undefined}
                                            />
                                        </div>
                                        {errores.valor && mostrarValor && (
                                            <p className="text-xs text-red-500 font-medium mt-1">{errores.valor}</p>
                                        )}
                                    </div>

                                    {/* Compra mínima */}
                                    <div>
                                        <label
                                            htmlFor="input-compra-minima"
                                            className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2"
                                        >
                                            Compra mín. <span className="text-slate-400 font-normal">(opc.)</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base lg:text-sm 2xl:text-base font-medium">$</span>
                                            <input
                                                id="input-compra-minima"
                                                name="input-compra-minima"
                                                type="number"
                                                value={formulario.compraMinima}
                                                onChange={(e) => setFormulario(prev => ({ ...prev, compraMinima: e.target.value }))}
                                                placeholder="0.00"
                                                min="0"
                                                step="0.01"
                                                disabled={guardando}
                                                className="w-full h-11 lg:h-10 2xl:h-11 pl-7 lg:pl-6 2xl:pl-7 pr-2 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                                                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Columna Derecha ── */}
                            <div className="lg:w-3/5 px-3 pt-0 pb-3 lg:px-2 lg:pt-1 lg:pb-2 2xl:px-5 2xl:pt-2 2xl:pb-5 flex flex-col gap-2 lg:gap-1.5 2xl:gap-3">

                                {/* Fechas - solo desktop */}
                                <div className="hidden lg:grid grid-cols-2 gap-2 2xl:gap-3">
                                    <div>
                                        <span className="block text-xs 2xl:text-sm font-bold text-slate-700 mb-1 2xl:mb-2">
                                            Fecha inicio <span className="text-red-500">*</span>
                                        </span>
                                        <DatePicker
                                            value={formulario.fechaInicio}
                                            onChange={(fecha) => setFormulario(prev => ({ ...prev, fechaInicio: fecha }))}
                                            placeholder="Seleccionar fecha"
                                            disabled={guardando}
                                            error={!!errores.fechaInicio}
                                        />
                                        {errores.fechaInicio && <p className="text-xs text-red-500 mt-1">{errores.fechaInicio}</p>}
                                    </div>
                                    <div>
                                        <span className="block text-xs 2xl:text-sm font-bold text-slate-700 mb-1 2xl:mb-2">
                                            Fecha fin <span className="text-red-500">*</span>
                                        </span>
                                        <DatePicker
                                            value={formulario.fechaFin}
                                            onChange={(fecha) => setFormulario(prev => ({ ...prev, fechaFin: fecha }))}
                                            placeholder="DD/MM/YYYY"
                                            disabled={guardando}
                                            error={!!errores.fechaFin}
                                        />
                                        {errores.fechaFin && <p className="text-xs text-red-500 mt-1">{errores.fechaFin}</p>}
                                    </div>
                                </div>

                                {/* Título */}
                                <div>
                                    <label
                                        htmlFor="input-titulo-oferta"
                                        className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2"
                                    >
                                        Título <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="input-titulo-oferta"
                                        name="input-titulo-oferta"
                                        type="text"
                                        value={formulario.titulo}
                                        onChange={(e) => setFormulario(prev => ({ ...prev, titulo: e.target.value }))}
                                        placeholder="Ej: 50% de descuento en pizzas"
                                        maxLength={150}
                                        disabled={guardando}
                                        className={`w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 bg-slate-100 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 ${errores.titulo ? 'border-red-400' : 'border-slate-300'}`}
                                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                                    />
                                    {errores.titulo && <p className="text-xs text-red-500 font-medium mt-1">{errores.titulo}</p>}
                                </div>

                                {/* Descripción */}
                                <div className="flex-1 flex flex-col">
                                    <label
                                        htmlFor="textarea-descripcion-oferta"
                                        className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2"
                                    >
                                        Descripción <span className="text-slate-400 font-normal">(opcional)</span>
                                    </label>
                                    <textarea
                                        id="textarea-descripcion-oferta"
                                        name="textarea-descripcion-oferta"
                                        value={formulario.descripcion}
                                        onChange={(e) => setFormulario(prev => ({ ...prev, descripcion: e.target.value }))}
                                        placeholder="Términos y condiciones..."
                                        rows={3}
                                        maxLength={500}
                                        disabled={guardando}
                                        className="flex-1 w-full px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2.5 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                                    />
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3 mt-4 mb-2 lg:mb-2 2xl:mb-0 lg:mt-auto 2xl:mt-auto">
                                    <button
                                        type="button"
                                        onClick={onCerrar}
                                        disabled={guardando}
                                        className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={guardando || imagen.isUploading}
                                        className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98]"
                                    >
                                        {guardando && <Spinner tamanio="sm" color="white" />}
                                        {esEdicion ? 'Guardar cambios' : 'Crear oferta'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </ModalAdaptativo>

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
