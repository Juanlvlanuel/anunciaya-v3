/**
 * ModalOferta.tsx (v5.0 — Refactorizado con Tabs)
 * =================================================
 * Modal para crear y editar ofertas.
 * - Oferta pública: tab único (formulario)
 * - Oferta exclusiva: 3 tabs (Oferta / Exclusiva / Clientes)
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/ModalOferta.tsx
 *
 * COMPONENTES HIJOS:
 * - TabOferta.tsx — imagen, tipo, valor, fechas, título, descripción
 * - TabExclusiva.tsx — motivo, límite por persona, preview notificación
 * - TabClientes.tsx — filtros (nivel, actividad) + selector + chips
 */

import { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import {
    Eye, EyeOff,
    Gift, Truck, Percent, DollarSign, ShoppingBag, Tag,
    FileText, Users, Settings, Ban, Copy,
} from 'lucide-react';
import { useR2Upload } from '../../../../hooks/useR2Upload';
import { generarUrlUploadImagenOferta } from '../../../../services/ofertasService';
import { ModalImagenes } from '../../../../components/ui';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import Tooltip from '../../../../components/ui/Tooltip';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import type { Oferta, TipoOferta, CrearOfertaInput, ActualizarOfertaInput } from '../../../../types/ofertas';

import { TabOferta } from './TabOferta';
import { TabExclusiva } from './TabExclusiva';
import { TabClientes } from './TabClientes';
import type { ClienteItem } from './TabClientes';
import type { FormularioState, Errores } from './TabOferta';
import { useClientesSelector } from '../../../../hooks/queries/useClientes';
import { useClientesAsignados } from '../../../../hooks/queries/useOfertas';
import type { ClienteAsignado } from '../../../../services/ofertasService';
import ModalDetalleCliente from '@/pages/private/business-studio/clientes/ModalDetalleCliente';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalOfertaProps {
    abierto: boolean;
    onCerrar: () => void;
    oferta: Oferta | null;
    onGuardar: (datos: CrearOfertaInput | ActualizarOfertaInput) => Promise<void>;
    onRecargar?: () => void;
    onDuplicar?: (oferta: Oferta) => void;
    visibilidadInicial?: 'publico' | 'privado';
    datosIniciales?: (Partial<FormularioState> & { _imagenOriginal?: string }) | null;
}

type OfertaConImagen = Oferta & {
    imagen?: string;
    imagenUrl?: string;
    imagenPrincipal?: string;
};

type TabActivo = 'oferta' | 'exclusiva' | 'clientes';

// =============================================================================
// CONSTANTES
// =============================================================================

const GRADIENTES_TIPO: Record<TipoOferta, { bg: string; shadow: string; handle: string }> = {
    porcentaje:   { bg: 'linear-gradient(135deg, #b91c1c, #dc2626)', shadow: 'rgba(185,28,28,0.4)', handle: 'rgba(255,255,255,0.4)' },
    monto_fijo:   { bg: 'linear-gradient(135deg, #15803d, #16a34a)', shadow: 'rgba(21,128,61,0.4)',  handle: 'rgba(255,255,255,0.4)' },
    '2x1':        { bg: 'linear-gradient(135deg, #b45309, #d97706)', shadow: 'rgba(180,83,9,0.4)',   handle: 'rgba(255,255,255,0.4)' },
    '3x2':        { bg: 'linear-gradient(135deg, #b45309, #d97706)', shadow: 'rgba(180,83,9,0.4)',   handle: 'rgba(255,255,255,0.4)' },
    envio_gratis: { bg: 'linear-gradient(135deg, #1e40af, #2563eb)', shadow: 'rgba(30,64,175,0.4)',  handle: 'rgba(255,255,255,0.4)' },
    regalo:       { bg: 'linear-gradient(135deg, #6d28d9, #7c3aed)', shadow: 'rgba(109,40,217,0.4)', handle: 'rgba(255,255,255,0.4)' },
    otro:         { bg: 'linear-gradient(135deg, #334155, #475569)', shadow: 'rgba(51,65,85,0.4)',   handle: 'rgba(255,255,255,0.4)' },
};

const ICONOS_TIPO: Record<TipoOferta, React.ComponentType<{ className?: string }>> = {
    porcentaje: Percent, monto_fijo: DollarSign, '2x1': ShoppingBag, '3x2': ShoppingBag,
    envio_gratis: Truck, regalo: Gift, otro: Tag,
};

const FORMULARIO_INICIAL: FormularioState = {
    titulo: '', descripcion: '', tipo: 'porcentaje', valor: '', compraMinima: '0',
    fechaInicio: new Date().toISOString().substring(0, 10), fechaFin: '', limiteUsos: '', activo: true,
    visibilidad: 'publico', limiteUsosPorUsuario: '', motivoAsignacion: '',
};

const extraerFecha = (fechaISO: string): string => fechaISO.substring(0, 10);

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalOferta({ abierto, onCerrar, oferta, onGuardar, onRecargar, onDuplicar, visibilidadInicial = 'publico', datosIniciales }: ModalOfertaProps) {
    const esEdicion = !!oferta;

    // Estados
    const [formulario, setFormulario] = useState<FormularioState>(FORMULARIO_INICIAL);
    const [errores, setErrores] = useState<Errores>({});
    const [guardando, setGuardando] = useState(false);
    const [tabActivo, setTabActivo] = useState<TabActivo>('oferta');
    const [clientesSeleccionados, setClientesSeleccionados] = useState<string[]>([]);
    const [modalImagenes, setModalImagenes] = useState<{ isOpen: boolean; images: string[]; initialIndex: number }>({ isOpen: false, images: [], initialIndex: 0 });
    const [clienteDetalleId, setClienteDetalleId] = useState<string | null>(null);

    // React Query — clientes disponibles (selector) y asignados (edición cupón)
    const clientesSelectorQuery = useClientesSelector(abierto);
    const clientesDisponibles: ClienteItem[] = (clientesSelectorQuery.data ?? []).map(c => ({
        id: c.id, nombre: c.nombre, telefono: c.telefono,
        avatarUrl: c.avatarUrl, nivelActual: c.nivelActual,
        ultimaActividad: c.ultimaActividad, totalVisitas: c.totalVisitas,
    }));
    const cargandoClientes = clientesSelectorQuery.isPending;
    const asignadosQuery = useClientesAsignados(
        abierto && esEdicion && oferta?.visibilidad === 'privado' ? oferta.id : null
    );
    const clientesAsignados = (asignadosQuery.data ?? []) as ClienteAsignado[];
    const cargandoAsignados = asignadosQuery.isPending;

    const esCupon = formulario.visibilidad === 'privado';
    const cuponSoloLectura = esEdicion && esCupon;
    const cuponInactivo = esEdicion && esCupon && !formulario.activo;

    // Upload R2
    const imagen = useR2Upload({
        generarUrl: generarUrlUploadImagenOferta,
        onError: (err) => notificar.error(`Error al subir imagen: ${err.message}`),
    });

    // Inicializar formulario
    useLayoutEffect(() => {
        if (abierto && oferta) {
            setFormulario({
                titulo: oferta.titulo, descripcion: oferta.descripcion || '',
                tipo: oferta.tipo, valor: oferta.valor ? String(oferta.valor) : '',
                compraMinima: String(oferta.compraMinima),
                fechaInicio: extraerFecha(oferta.fechaInicio), fechaFin: extraerFecha(oferta.fechaFin),
                limiteUsos: oferta.limiteUsos ? String(oferta.limiteUsos) : '',
                activo: oferta.activo, visibilidad: oferta.visibilidad || 'publico',
                limiteUsosPorUsuario: oferta.limiteUsosPorUsuario ? String(oferta.limiteUsosPorUsuario) : '',
                motivoAsignacion: '',
            });
            const ofertaConImg = oferta as OfertaConImagen;
            const imgUrl = ofertaConImg.imagen || ofertaConImg.imagenUrl || ofertaConImg.imagenPrincipal;
            if (imgUrl) { imagen.setImageUrl(imgUrl); imagen.setR2Url(imgUrl); }
            else { imagen.setImageUrl(null); imagen.setR2Url(null); }
        } else if (abierto && !oferta) {
            const { _imagenOriginal, ...datosFormulario } = datosIniciales || {} as Record<string, string>;
            setFormulario({ ...FORMULARIO_INICIAL, visibilidad: visibilidadInicial, ...datosFormulario });
            setErrores({});
            setTabActivo('oferta');
            setClientesSeleccionados([]);
            if (_imagenOriginal) {
                imagen.setImageUrl(_imagenOriginal);
                imagen.setR2Url(_imagenOriginal);
            } else {
                imagen.reset();
            }
        } else if (!abierto) {
            // Modal cerrado — resetear tab y limpiar imagen huérfana de R2
            setTabActivo('oferta');
            imagen.reset();
        }
    }, [abierto, oferta]);

    // Sincronizar motivo desde clientes asignados (cupón en edición)
    useEffect(() => {
        if (clientesAsignados.length > 0 && clientesAsignados[0]?.motivo) {
            setFormulario(prev => ({ ...prev, motivoAsignacion: clientesAsignados[0].motivo ?? '' }));
        }
    }, [clientesAsignados]);

    // Limpiar al cerrar
    useEffect(() => {
        if (!abierto) {
            setClienteDetalleId(null);
        }
    }, [abierto]);

    // Handlers clientes
    const toggleCliente = (id: string) => {
        setClientesSeleccionados(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };
    const seleccionarTodos = (ids: string[]) => {
        setClientesSeleccionados(prev => [...new Set([...prev, ...ids])]);
    };
    const limpiarSeleccion = () => setClientesSeleccionados([]);

    // Validación
    const validarFormulario = (): boolean => {
        const nuevosErrores: Errores = {};
        if (!formulario.titulo.trim()) nuevosErrores.titulo = 'El producto o servicio es requerido';
        else if (formulario.titulo.trim().length < 3) nuevosErrores.titulo = 'Debe tener al menos 3 caracteres';
        if (!formulario.fechaInicio) nuevosErrores.fechaInicio = 'La fecha de inicio es requerida';
        if (!formulario.fechaFin) nuevosErrores.fechaFin = 'La fecha de fin es requerida';
        if (formulario.fechaInicio && formulario.fechaFin && new Date(formulario.fechaFin) < new Date(formulario.fechaInicio)) {
            nuevosErrores.fechaFin = 'La fecha de fin debe ser posterior al inicio';
        }
        if ((formulario.tipo === 'porcentaje' || formulario.tipo === 'monto_fijo') && !formulario.valor) nuevosErrores.valor = 'El valor es requerido';
        if (formulario.tipo === 'otro' && !formulario.valor?.trim()) nuevosErrores.valor = 'El concepto es requerido';
        if (formulario.tipo === 'porcentaje' && formulario.valor) {
            const pct = Number(formulario.valor);
            if (pct < 1 || pct > 100) nuevosErrores.valor = 'El porcentaje debe estar entre 1 y 100';
        }
        if (imagen.isUploading) { notificar.error('Espera a que termine de subir la imagen'); return false; }
        setErrores(nuevosErrores);
        if (Object.keys(nuevosErrores).length > 0) { setTabActivo('oferta'); return false; }
        return true;
    };

    // Submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validarFormulario()) return;
        const esExclusiva = formulario.visibilidad === 'privado';
        setGuardando(true);
        try {
            const datos: CrearOfertaInput | ActualizarOfertaInput = {
                titulo: formulario.titulo.trim(),
                descripcion: formulario.descripcion.trim() || null,
                imagen: imagen.r2Url || null,
                tipo: formulario.tipo,
                valor: formulario.tipo === 'otro' ? formulario.valor || null : formulario.valor ? Number(formulario.valor) : null,
                compraMinima: Number(formulario.compraMinima),
                fechaInicio: formulario.fechaInicio + 'T00:00:00Z',
                fechaFin: formulario.fechaFin + 'T23:59:59Z',
                limiteUsos: formulario.limiteUsos ? Number(formulario.limiteUsos) : null,
                activo: formulario.activo,
                visibilidad: formulario.visibilidad,
                limiteUsosPorUsuario: formulario.limiteUsosPorUsuario ? Number(formulario.limiteUsosPorUsuario) : null,
                motivoAsignacion: esExclusiva ? (formulario.motivoAsignacion.trim() || undefined) : undefined,
                usuariosIds: esExclusiva && clientesSeleccionados.length > 0 ? clientesSeleccionados : undefined,
                duplicarImagen: !esEdicion && datosIniciales?._imagenOriginal && imagen.r2Url === datosIniciales._imagenOriginal ? true : undefined,
            };
            await onGuardar(datos);
            // Imagen guardada — limpiar estado sin eliminar de R2
            imagen.setImageUrl(null);
            imagen.setR2Url(null);
        } finally {
            setGuardando(false);
        }
    };

    if (!abierto) return null;

    const esExclusiva = formulario.visibilidad === 'privado';
    const gradiente = GRADIENTES_TIPO[formulario.tipo];
    const IconoTipo = ICONOS_TIPO[formulario.tipo];

    // Validación en tiempo real para habilitar/deshabilitar botón
    const mostrarValor = formulario.tipo === 'porcentaje' || formulario.tipo === 'monto_fijo' || formulario.tipo === 'otro';
    const camposMinimosCompletos =
        formulario.titulo.trim().length >= 3 &&
        formulario.fechaInicio !== '' &&
        formulario.fechaFin !== '' &&
        (!mostrarValor || formulario.valor.trim() !== '') &&
        (formulario.visibilidad !== 'privado' || esEdicion || clientesSeleccionados.length > 0);

    // Tabs config
    const tabs: Array<{ id: TabActivo; label: string; icono: React.ComponentType<{ className?: string }> }> = esExclusiva
        ? [
            { id: 'oferta', label: 'Detalles', icono: FileText },
            { id: 'exclusiva', label: 'Ajustes', icono: Settings },
            { id: 'clientes', label: `Enviar a${clientesSeleccionados.length > 0 ? ` (${clientesSeleccionados.length})` : ''}`, icono: Users },
        ]
        : [{ id: 'oferta', label: 'Detalles', icono: FileText }];

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
                <div className={`flex flex-col ${esExclusiva ? 'h-[90vh] lg:h-[68vh] 2xl:h-[65vh]' : 'max-h-[90vh] lg:max-h-[75vh] 2xl:max-h-[75vh]'}`}>

                    {/* ── Header ── */}
                    <div
                        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
                        style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
                    >
                        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

                        <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                            <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                                <IconoTipo className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                                <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                                    {esEdicion ? (oferta?.titulo || 'Editar') : esExclusiva ? 'Nuevo cupón' : 'Nueva oferta'}
                                </h3>
                                <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">
                                    {esExclusiva ? 'Cupón privado' : 'Oferta pública'}
                                </span>
                            </div>

                            {/* Acciones header */}
                            <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                                {esEdicion && esCupon ? (
                                    <div className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5">
                                        {oferta?.estado !== 'agotada' && oferta?.estado !== 'vencida' && oferta?.estado !== 'inactiva' && (
                                            <Tooltip text="Revocar cupón" position="bottom" autoHide={2500}>
                                                <button
                                                    type="button"
                                                    data-testid="btn-revocar-cupon"
                                                    onClick={async () => {
                                                        if (!oferta) return;
                                                        const confirmado = await notificar.confirmar(`¿Revocar cupón "${oferta.titulo}" para todos los clientes?`);
                                                        if (!confirmado) return;
                                                        try {
                                                            const { revocarCuponMasivo } = await import('../../../../services/ofertasService');
                                                            const res = await revocarCuponMasivo(oferta.id);
                                                            if (res.success) { notificar.exito(res.message || 'Cupón revocado'); onRecargar?.(); onCerrar(); }
                                                            else { notificar.error(res.message || 'Error al revocar'); }
                                                        } catch { notificar.error('Error al revocar cupón'); }
                                                    }}
                                                    className="p-2 lg:p-1.5 2xl:p-2 rounded-xl cursor-pointer bg-black/15 hover:bg-black/25 transition-colors"
                                                >
                                                    <Ban className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                                                </button>
                                            </Tooltip>
                                        )}
                                        <Tooltip text="Duplicar cupón" position="bottom" autoHide={2500}>
                                            <button
                                                type="button"
                                                data-testid="btn-duplicar-cupon"
                                                onClick={() => { if (oferta) { onDuplicar?.(oferta); } }}
                                                className="p-2 lg:p-1.5 2xl:p-2 rounded-xl cursor-pointer bg-black/15 hover:bg-black/25 transition-colors"
                                            >
                                                <Copy className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                ) : esCupon ? null : (
                                    <Tooltip text={formulario.activo ? 'Activa' : 'Inactiva'} position="bottom" autoHide={2500}>
                                        <button type="button" data-testid="btn-toggle-activo"
                                            onClick={() => setFormulario(prev => ({ ...prev, activo: !prev.activo }))}
                                            disabled={guardando}
                                            className={`p-2 lg:p-1.5 2xl:p-2 rounded-xl cursor-pointer disabled:opacity-50 ${formulario.activo ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'}`}
                                        >
                                            {formulario.activo ? <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" /> : <EyeOff className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white/60" />}
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Tabs bar (solo exclusiva) ── */}
                    {esExclusiva && (
                        <div className="shrink-0 px-4 lg:px-3 2xl:px-4 py-2 lg:py-2 2xl:py-2 bg-white border-b border-slate-300">
                            <div className="bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 flex" data-testid="tabs-oferta">
                                {tabs.map(tab => {
                                    const Icono = tab.icono;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            data-testid={`tab-${tab.id}`}
                                            onClick={() => setTabActivo(tab.id)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-1.5 h-10 lg:h-9 2xl:h-10 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold cursor-pointer ${
                                                tabActivo === tab.id
                                                    ? 'text-white shadow-md'
                                                    : 'text-slate-700 hover:bg-slate-300'
                                            }`}
                                            style={tabActivo === tab.id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                                        >
                                            <Icono className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Body + Botones dentro de form ── */}
                    <form onSubmit={handleSubmit} data-testid="form-oferta" className="flex-1 flex flex-col min-h-0">
                        {/* Contenido scrollable */}
                        <div className="flex-1 overflow-y-auto">
                            {tabActivo === 'oferta' && (<div className={cuponInactivo || cuponSoloLectura ? 'opacity-60 pointer-events-none' : ''}>
                                <TabOferta
                                    formulario={formulario}
                                    setFormulario={setFormulario}
                                    errores={errores}
                                    guardando={guardando || cuponInactivo || cuponSoloLectura}
                                    imagen={imagen}
                                    onAbrirImagen={(url) => setModalImagenes({ isOpen: true, images: [url], initialIndex: 0 })}
                                    esCupon={esCupon}
                                    botonesDesktop={!cuponSoloLectura ? (
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={onCerrar}
                                                disabled={guardando}
                                                className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 2xl:px-4 2xl:py-2.5 text-xs 2xl:text-sm cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={guardando || imagen.isUploading || !camposMinimosCompletos}
                                                className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 2xl:px-4 2xl:py-2.5 text-xs 2xl:text-sm cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98]"
                                            >
                                                {guardando && <Spinner tamanio="sm" color="white" />}
                                                {esEdicion ? 'Guardar' : esExclusiva ? 'Enviar cupón' : 'Crear oferta'}
                                            </button>
                                        </div>
                                    ) : undefined}
                                />
                            </div>)}
                            {tabActivo === 'exclusiva' && (<div className={`flex flex-col h-full ${cuponInactivo || cuponSoloLectura ? 'opacity-60 pointer-events-none' : ''}`}>
                                <TabExclusiva
                                    formulario={formulario}
                                    setFormulario={setFormulario}
                                    guardando={guardando}
                                />
                                {!cuponSoloLectura && (
                                    <div className="hidden lg:flex gap-3 px-3 2xl:px-4 pb-3 2xl:pb-4 mt-auto">
                                        <button type="button" onClick={onCerrar} disabled={guardando}
                                            className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 2xl:px-4 2xl:py-2.5 text-xs 2xl:text-sm cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100">
                                            Cancelar
                                        </button>
                                        <button type="submit" disabled={guardando || imagen.isUploading || !camposMinimosCompletos}
                                            className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 2xl:px-4 2xl:py-2.5 text-xs 2xl:text-sm cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98]">
                                            {guardando && <Spinner tamanio="sm" color="white" />}
                                            {esEdicion ? 'Guardar' : 'Enviar cupón'}
                                        </button>
                                    </div>
                                )}
                            </div>)}
                            {tabActivo === 'clientes' && (
                                <>
                                    <TabClientes
                                        clientes={clientesDisponibles}
                                        cargando={cargandoClientes}
                                        clientesSeleccionados={clientesSeleccionados}
                                        onToggleCliente={toggleCliente}
                                        onSeleccionarTodos={seleccionarTodos}
                                        onLimpiarSeleccion={limpiarSeleccion}
                                        modoEdicion={esEdicion && oferta?.visibilidad === 'privado'}
                                        clientesAsignados={clientesAsignados}
                                        cargandoAsignados={cargandoAsignados}
                                        onClickCliente={(id) => setClienteDetalleId(id)}
                                        botonesDesktop={!cuponSoloLectura ? (
                                            <div className="flex gap-3">
                                                <button type="button" onClick={onCerrar} disabled={guardando}
                                                    className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 2xl:px-4 2xl:py-2.5 text-xs 2xl:text-sm cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100">
                                                    Cancelar
                                                </button>
                                                <button type="submit" disabled={guardando || imagen.isUploading || !camposMinimosCompletos}
                                                    className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 2xl:px-4 2xl:py-2.5 text-xs 2xl:text-sm cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98]">
                                                    {guardando && <Spinner tamanio="sm" color="white" />}
                                                    {esEdicion ? 'Guardar' : 'Enviar cupón'}
                                                </button>
                                            </div>
                                        ) : undefined}
                                    />
                                </>
                            )}
                        </div>

                        {/* ── Botones sticky (solo móvil) ── */}
                        <div className="shrink-0 flex gap-3 px-4 py-3 border-t-2 border-slate-300 bg-white lg:hidden">
                            {cuponSoloLectura ? (
                                <>
                                    {oferta?.estado !== 'agotada' && oferta?.estado !== 'vencida' && oferta?.estado !== 'inactiva' && (
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!oferta) return;
                                                const confirmado = await notificar.confirmar(`¿Revocar cupón "${oferta.titulo}"?`);
                                                if (!confirmado) return;
                                                try {
                                                    const { revocarCuponMasivo } = await import('../../../../services/ofertasService');
                                                    const res = await revocarCuponMasivo(oferta.id);
                                                    if (res.success) { notificar.exito(res.message || 'Cupón revocado'); onRecargar?.(); onCerrar(); }
                                                    else { notificar.error(res.message || 'Error al revocar'); }
                                                } catch { notificar.error('Error al revocar cupón'); }
                                            }}
                                            className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl px-4 py-2.5 text-sm cursor-pointer border-2 border-red-300 text-red-500 bg-transparent hover:bg-red-50"
                                        >
                                            Revocar
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { if (oferta) { onDuplicar?.(oferta); } }}
                                        className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl px-4 py-2.5 text-sm cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 active:scale-[0.98]"
                                    >
                                        Duplicar cupón
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        data-testid="btn-cancelar-oferta"
                                        onClick={onCerrar}
                                        disabled={guardando}
                                        className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        data-testid="btn-guardar-oferta"
                                        disabled={guardando || imagen.isUploading || !camposMinimosCompletos}
                                        className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98]"
                                    >
                                        {guardando && <Spinner tamanio="sm" color="white" />}
                                        {esEdicion ? 'Guardar' : esExclusiva ? 'Enviar cupón' : 'Crear oferta'}
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            </ModalAdaptativo>

            <ModalImagenes
                images={modalImagenes.images}
                initialIndex={modalImagenes.initialIndex}
                isOpen={modalImagenes.isOpen}
                onClose={() => setModalImagenes({ isOpen: false, images: [], initialIndex: 0 })}
            />

            <ModalDetalleCliente
                abierto={!!clienteDetalleId}
                onCerrar={() => setClienteDetalleId(null)}
                clienteId={clienteDetalleId}
            />
        </>
    );
}

export default ModalOferta;
