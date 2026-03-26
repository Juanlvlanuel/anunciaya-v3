/**
 * TabOferta.tsx
 * ==============
 * Tab principal del modal: título, tipo, valor, fechas, imagen, descripción.
 *
 * LAYOUT:
 * - Móvil: columna única — Beneficio → Valor → Producto → Vigencia+Imagen → Condiciones
 * - Desktop: 2 columnas — Izq (imagen, beneficio, valor) | Der (producto, vigencia, condiciones)
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/ofertas/TabOferta.tsx
 */

import {
    Trash2, ImagePlus,
    Gift, Truck, Tag,
} from 'lucide-react';
import { DatePicker } from '../../../../components/ui';
import type { TipoOferta } from '../../../../types/ofertas';

// =============================================================================
// TIPOS
// =============================================================================

export interface FormularioState {
    titulo: string;
    descripcion: string;
    tipo: TipoOferta;
    valor: string;
    compraMinima: string;
    fechaInicio: string;
    fechaFin: string;
    limiteUsos: string;
    activo: boolean;
    visibilidad: 'publico' | 'privado';
    limiteUsosPorUsuario: string;
    motivoAsignacion: string;
}

export interface Errores {
    titulo?: string;
    fechaInicio?: string;
    fechaFin?: string;
    valor?: string;
}

interface TabOfertaProps {
    formulario: FormularioState;
    setFormulario: React.Dispatch<React.SetStateAction<FormularioState>>;
    errores: Errores;
    guardando: boolean;
    imagen: {
        imageUrl: string | null;
        r2Url: string | null;
        isUploading: boolean;
        uploadImage: (file: File) => void;
        reset: () => void;
    };
    onAbrirImagen: (url: string) => void;
    botonesDesktop?: React.ReactNode;
    esCupon?: boolean;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function TabOferta({ formulario, setFormulario, errores, guardando, imagen, onAbrirImagen, botonesDesktop, esCupon }: TabOfertaProps) {
    const mostrarValor = formulario.tipo === 'porcentaje' || formulario.tipo === 'monto_fijo' || formulario.tipo === 'otro';

    const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) imagen.uploadImage(file);
    };

    // =========================================================================
    // Componentes internos reutilizados en ambos layouts
    // =========================================================================

    const renderTitulo = (sufijo = '') => (
        <div>
            <label htmlFor={`input-titulo-oferta${sufijo}`} className="block text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2">
                Producto o servicio <span className="text-red-500">*</span>
            </label>
            <input
                id={`input-titulo-oferta${sufijo}`}
                name="titulo"
                data-testid="input-titulo-oferta"
                type="text"
                value={formulario.titulo}
                onChange={(e) => setFormulario(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder={esCupon ? 'Ej: Corte de Pelo, Café Latte' : 'Ej: Pizzas Familiares, Hamburguesas'}
                maxLength={150}
                disabled={guardando}
                className={`w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 bg-slate-100 border-2 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 ${errores.titulo ? 'border-red-400' : 'border-slate-300'}`}
            />
            {errores.titulo && <p className="text-xs text-red-500 font-medium mt-1">{errores.titulo}</p>}
        </div>
    );

    const renderTipoOferta = () => {
        const tiposConfig: Array<{ tipo: TipoOferta; label: string; icono: typeof Gift | null; activo: string; inactivo: string }> = [
            { tipo: '2x1',          label: '2x1',     icono: Gift, activo: 'bg-orange-500 text-white border-orange-500 shadow-md', inactivo: 'bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:bg-orange-50' },
            { tipo: '3x2',          label: '3x2',     icono: Gift, activo: 'bg-orange-500 text-white border-orange-500 shadow-md', inactivo: 'bg-white text-slate-700 border-slate-300 hover:border-orange-400 hover:bg-orange-50' },
            { tipo: 'envio_gratis', label: 'Envío',   icono: Truck, activo: 'bg-blue-500 text-white border-blue-500 shadow-md', inactivo: 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 hover:bg-blue-50' },
            { tipo: 'porcentaje',   label: 'Desc. %', icono: null, activo: 'bg-red-500 text-white border-red-500 shadow-md', inactivo: 'bg-white text-slate-700 border-slate-300 hover:border-red-400 hover:bg-red-50' },
            { tipo: 'monto_fijo',   label: 'Monto $', icono: null, activo: 'bg-green-500 text-white border-green-500 shadow-md', inactivo: 'bg-white text-slate-700 border-slate-300 hover:border-green-400 hover:bg-green-50' },
            { tipo: 'otro',         label: 'Otro',    icono: Tag, activo: 'bg-slate-500 text-white border-slate-500 shadow-md', inactivo: 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50' },
        ];

        return (
            <div>
                <span className="block text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-2">{esCupon ? 'Tipo de cupón' : 'Tipo de promoción'} <span className="text-red-500">*</span></span>
                <div className="grid grid-cols-3 gap-2 lg:gap-1.5 2xl:gap-2">
                    {tiposConfig.map(({ tipo, label, icono: Icono, activo, inactivo }) => (
                        <button
                            key={tipo}
                            type="button"
                            data-testid={`btn-tipo-${tipo}`}
                            onClick={() => setFormulario(prev => ({ ...prev, tipo, valor: tipo === prev.tipo ? prev.valor : '' }))}
                            disabled={guardando}
                            className={`flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-1.5 px-2 py-2 lg:px-1.5 2xl:px-2 rounded-lg border-2 font-semibold text-base lg:text-sm 2xl:text-base transition-all cursor-pointer whitespace-nowrap ${
                                formulario.tipo === tipo ? activo : inactivo
                            }`}
                        >
                            {Icono && <Icono className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />}
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderValorCompraMinima = (sufijo = '') => (
        <div className="grid grid-cols-2 gap-2 lg:gap-1.5 2xl:gap-2 items-end">
            <div>
                <label htmlFor={`input-valor-oferta${sufijo}`} className={`block text-sm lg:text-[11px] 2xl:text-sm font-bold mb-1.5 lg:mb-1 2xl:mb-2 ${mostrarValor ? 'text-slate-700' : 'text-slate-400'}`}>
                    {formulario.tipo === 'otro' ? 'Concepto' : 'Valor'} {mostrarValor && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                    {formulario.tipo !== 'otro' && mostrarValor && (
                        <span className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base lg:text-sm 2xl:text-base font-medium">
                            {formulario.tipo === 'porcentaje' ? '%' : '$'}
                        </span>
                    )}
                    <input
                        id={`input-valor-oferta${sufijo}`}
                        name="valor"
                        data-testid="input-valor-oferta"
                        type={formulario.tipo === 'otro' ? 'text' : 'number'}
                        value={formulario.valor}
                        onChange={(e) => setFormulario(prev => ({ ...prev, valor: e.target.value }))}
                        placeholder={!mostrarValor ? 'No aplica' : formulario.tipo === 'porcentaje' ? '10' : formulario.tipo === 'monto_fijo' ? '50.00' : 'Ej: HAPPY HOUR'}
                        min={formulario.tipo !== 'otro' && mostrarValor ? '0' : undefined}
                        max={formulario.tipo === 'porcentaje' ? '100' : undefined}
                        disabled={!mostrarValor || guardando}
                        className={`w-full h-11 lg:h-10 2xl:h-11 ${formulario.tipo !== 'otro' && mostrarValor ? 'pl-7 lg:pl-6 2xl:pl-7' : 'pl-4 lg:pl-3 2xl:pl-4'} pr-2 bg-slate-100 border-2 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium transition-colors ${!mostrarValor ? 'text-slate-400 cursor-not-allowed border-slate-200' : errores.valor ? 'border-red-400 text-slate-800' : 'border-slate-300 text-slate-800 hover:border-slate-400'}`}
                    />
                </div>
                {errores.valor && mostrarValor && <p className="text-xs text-red-500 font-medium mt-1">{errores.valor}</p>}
            </div>
            <div>
                <label htmlFor={`input-compra-minima${sufijo}`} className="block text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2">
                    Compra mín. <span className="text-slate-400 font-normal">(opc.)</span>
                </label>
                <div className="relative">
                    <span className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base lg:text-sm 2xl:text-base font-medium">$</span>
                    <input
                        id={`input-compra-minima${sufijo}`}
                        name="compraMinima"
                        data-testid="input-compra-minima"
                        type="number"
                        value={formulario.compraMinima}
                        onChange={(e) => setFormulario(prev => ({ ...prev, compraMinima: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={guardando}
                        className="w-full h-11 lg:h-10 2xl:h-11 pl-7 lg:pl-6 2xl:pl-7 pr-2 bg-slate-100 border-2 border-slate-300 hover:border-slate-400 rounded-lg focus:outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                    />
                </div>
            </div>
        </div>
    );

    const renderFechas = (vertical = false) => (
        <div className={vertical ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-2 2xl:gap-3'}>
            <div>
                <span className="block text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1 2xl:mb-2">Inicio <span className="text-red-500">*</span></span>
                <DatePicker value={formulario.fechaInicio} onChange={(fecha) => setFormulario(prev => ({ ...prev, fechaInicio: fecha }))} placeholder="Seleccionar" disabled={guardando} error={!!errores.fechaInicio} centradoEnMovil data-testid="input-fecha-inicio" />
                {errores.fechaInicio && <p className="text-xs text-red-500 mt-0.5">{errores.fechaInicio}</p>}
            </div>
            <div>
                <span className="block text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1 2xl:mb-2">Fin <span className="text-red-500">*</span></span>
                <DatePicker value={formulario.fechaFin} onChange={(fecha) => setFormulario(prev => ({ ...prev, fechaFin: fecha }))} placeholder="DD/MM/YYYY" disabled={guardando} error={!!errores.fechaFin} centradoEnMovil data-testid="input-fecha-fin" />
                {errores.fechaFin && <p className="text-xs text-red-500 mt-0.5">{errores.fechaFin}</p>}
            </div>
        </div>
    );

    const renderImagen = () => (
        <div
            className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative aspect-square lg:aspect-4/3"
        >
            {imagen.imageUrl ? (
                <>
                    <img src={imagen.imageUrl} alt="Preview" className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => onAbrirImagen(imagen.imageUrl!)} />
                    {imagen.isUploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-xs font-medium">Subiendo…</span></div>}
                    <button type="button" onClick={() => imagen.reset()} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 cursor-pointer"><Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" /></button>
                </>
            ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 gap-1.5" data-testid="btn-agregar-imagen">
                    <input type="file" accept="image/*" name="imagenOferta" onChange={handleImagenChange} className="hidden" />
                    <ImagePlus className="w-6 h-6 2xl:w-7 2xl:h-7 text-slate-400" />
                    <p className="text-xs 2xl:text-sm text-slate-500 font-medium text-center leading-tight px-2">Agregar imagen</p>
                </label>
            )}
        </div>
    );

    const renderDescripcion = (sufijo = '') => (
        <div className="flex-1 flex flex-col">
            <label htmlFor={`textarea-descripcion-oferta${sufijo}`} className="block text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2">
                {esCupon ? 'Condiciones' : 'Descripción'} <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
                id={`textarea-descripcion-oferta${sufijo}`}
                name="descripcion"
                data-testid="input-descripcion-oferta"
                value={formulario.descripcion}
                onChange={(e) => setFormulario(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder={esCupon ? 'Ej: Solo válido en desayunos, no acumulable con otras promociones...' : 'Ej: Solo en sucursal centro, válido con compra mínima...'}
                rows={3}
                maxLength={500}
                disabled={guardando}
                className="flex-1 w-full px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2.5 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none resize-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
            />
        </div>
    );

    // =========================================================================
    // RENDER
    // =========================================================================

    return (
        <>
            {/* ── MÓVIL: columna única — Beneficio → Valor → Producto → Vigencia+Imagen → Condiciones ── */}
            <div className="lg:hidden p-4 flex flex-col gap-3">
                {renderTipoOferta()}
                {renderValorCompraMinima('-movil')}
                {renderTitulo('-movil')}
                {/* Imagen chica + Fechas apiladas lado a lado */}
                <div className="flex gap-2.5 items-stretch">
                    <div className="shrink-0 flex" style={{ width: '40%' }}>
                        <div className="w-full rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative">
                            {imagen.imageUrl ? (
                                <>
                                    <img src={imagen.imageUrl} alt="Preview" className="w-full h-full object-cover cursor-pointer hover:opacity-90" onClick={() => onAbrirImagen(imagen.imageUrl!)} />
                                    {imagen.isUploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-sm font-medium">Subiendo…</span></div>}
                                    <button type="button" onClick={() => imagen.reset()} className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 cursor-pointer"><Trash2 className="w-5 h-5" /></button>
                                </>
                            ) : (
                                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 gap-1" data-testid="btn-agregar-imagen-movil">
                                    <input type="file" accept="image/*" name="imagenOfertaMovil" onChange={handleImagenChange} className="hidden" />
                                    <ImagePlus className="w-6 h-6 text-slate-600" />
                                    <p className="text-sm text-slate-600 font-medium text-center leading-tight px-1">Agregar imagen</p>
                                </label>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                        {renderFechas(true)}
                    </div>
                </div>
                {renderDescripcion('-movil')}
            </div>

            {/* ── DESKTOP: 2 columnas — Izq (Tipo + Valor + Imagen) | Der (Producto + Vigencia + Condiciones + Botones) ── */}
            <div className="hidden lg:flex lg:flex-row lg:h-full">
                {/* Columna Izquierda: Tipo + Valor + Imagen */}
                <div className="lg:w-2/5 lg:p-3 2xl:p-4 lg:border-r-2 border-slate-300 bg-slate-50 flex flex-col gap-2.5 2xl:gap-3">
                    {renderTipoOferta()}
                    {renderValorCompraMinima()}
                    {renderImagen()}
                </div>

                {/* Columna Derecha: Producto + Vigencia + Condiciones + Botones */}
                <div className="lg:w-3/5 lg:p-3 2xl:p-4 flex flex-col gap-2.5 2xl:gap-3">
                    {renderTitulo()}
                    {renderFechas()}
                    {renderDescripcion()}
                    {botonesDesktop && <div className="mt-auto">{botonesDesktop}</div>}
                </div>
            </div>
        </>
    );
}
