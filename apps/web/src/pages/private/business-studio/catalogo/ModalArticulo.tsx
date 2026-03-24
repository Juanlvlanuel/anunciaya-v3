/**
 * ============================================================================
 * MODAL: Crear/Editar Artículo
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/catalogo/ModalArticulo.tsx
 *
 * LAYOUT COLUMNA IZQUIERDA:
 *   [Imagen pequeña] [Categoría dropdown]
 *                    [Precio input      ]
 *   [Eye interactivo + Tooltip] [Star interactivo + Tooltip]
 *
 * LAYOUT COLUMNA DERECHA:
 *   Nombre, Descripción, Precio desde, Botones
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2,
  Package,
  Wrench,
  ImagePlus,
  Eye,
  EyeOff,
  Star,
  Tag,
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react';
import { useR2Upload } from '../../../../hooks/useR2Upload';
import { Spinner } from '../../../../components/ui/Spinner';
import { ModalImagenes } from '../../../../components/ui';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import Tooltip from '../../../../components/ui/Tooltip';
import { notificar } from '../../../../utils/notificaciones';
import type { Articulo, CrearArticuloInput, ActualizarArticuloInput } from '../../../../types/articulos';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalArticuloProps {
  articulo?: Articulo | null;
  categoriasExistentes?: string[];
  tipoInicial?: 'producto' | 'servicio';
  onGuardar: (datos: CrearArticuloInput | ActualizarArticuloInput) => Promise<void>;
  onCerrar: () => void;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const GRADIENTES_TIPO = {
  producto: { bg: 'linear-gradient(135deg, #1e40af, #2563eb)', shadow: 'rgba(37,99,235,0.4)', handle: '#1e40af' },
  servicio: { bg: 'linear-gradient(135deg, #1e293b, #1e3a5f)', shadow: 'rgba(30,58,95,0.4)', handle: '#1e293b' },
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalArticulo({ articulo, categoriasExistentes = [], tipoInicial = 'producto', onGuardar, onCerrar }: ModalArticuloProps) {
  const esEdicion = !!articulo;

  // ===========================================================================
  // ESTADOS
  // ===========================================================================

  const [tipo, setTipo] = useState<'producto' | 'servicio'>(articulo?.tipo || tipoInicial);
  const [nombre, setNombre] = useState(articulo?.nombre || '');
  const [descripcion, setDescripcion] = useState(articulo?.descripcion || '');
  const [categoria, setCategoria] = useState(articulo?.categoria || '');
  const [categoriaNueva, setCategoriaNueva] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [mostrarInputNueva, setMostrarInputNueva] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0, left: 0, width: 0, maxHeight: 0, openUpwards: false,
  });
  const botonRef = useRef<HTMLButtonElement>(null);
  const [precioStr, setPrecioStr] = useState(
    articulo?.precioBase ? String(Number(articulo.precioBase)) : ''
  );
  const precioVacio = precioStr.trim() === '';
  const precioBase = precioVacio ? 0 : Number(precioStr);
  const [precioDesde, setPrecioDesde] = useState(articulo?.precioDesde ?? false);
  const [disponible, setDisponible] = useState(articulo?.disponible ?? true);
  const [destacado, setDestacado] = useState(articulo?.destacado ?? false);
  const [guardando, setGuardando] = useState(false);
  const [modalImagenes, setModalImagenes] = useState<{
    isOpen: boolean; images: string[]; initialIndex: number;
  }>({ isOpen: false, images: [], initialIndex: 0 });

  // ===========================================================================
  // HANDLERS IMÁGENES
  // ===========================================================================

  const abrirImagenUnica = (url: string) => {
    setModalImagenes({ isOpen: true, images: [url], initialIndex: 0 });
  };

  const cerrarModalImagenes = () => {
    setModalImagenes({ isOpen: false, images: [], initialIndex: 0 });
  };

  // ===========================================================================
  // HOOK UPLOAD
  // ===========================================================================

  const imagen = useR2Upload({
    onSuccess: (url) => { console.log('✅ Imagen subida a R2:', url); },
    onError: (error) => { notificar.error(`Error al subir imagen: ${error.message}`); },
  });

  useEffect(() => {
    if (articulo?.imagenPrincipal) {
      imagen.setImageUrl(articulo.imagenPrincipal);
      imagen.setR2Url(articulo.imagenPrincipal);
    } else if (!articulo) {
      imagen.reset();
    }
  }, [articulo]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (mostrarDropdown && !target.closest('.dropdown-categoria')) {
        setMostrarDropdown(false);
        setMostrarInputNueva(false);
        setCategoriaNueva('');
      }
    };

    const updatePosition = () => {
      if (mostrarDropdown && botonRef.current) {
        const rect = botonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldOpenUpwards = spaceBelow < 150 && spaceAbove > spaceBelow;
        const maxHeight = shouldOpenUpwards
          ? Math.min(spaceAbove - 20, 300)
          : Math.min(spaceBelow - 20, 300);

        setDropdownPosition({
          top: shouldOpenUpwards
            ? rect.top + window.scrollY - maxHeight - 4
            : rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
          width: rect.width,
          maxHeight,
          openUpwards: shouldOpenUpwards,
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [mostrarDropdown]);

  // Bloquear scroll del body
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // ===========================================================================
  // VALIDACIÓN Y SUBMIT
  // ===========================================================================

  const validarFormulario = (): boolean => {
    if (!nombre.trim()) { notificar.error('El nombre es obligatorio'); return false; }
    if (precioVacio) { notificar.error('El precio es obligatorio'); return false; }
    if (precioBase <= 0) { notificar.error('El precio debe ser mayor a 0'); return false; }
    if (imagen.imageUrl && imagen.isUploading) {
      notificar.error('Espera a que termine de subir la imagen'); return false;
    }
    return true;
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) imagen.uploadImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const categoriaFinal = categoria || 'Sin categoría';
    const imagenOriginal = articulo?.imagenPrincipal;
    const imagenNueva = imagen.r2Url;
    // true si la imagen original fue reemplazada o borrada
    const imagenCambio = esEdicion && !!imagenOriginal && imagenOriginal !== imagenNueva;

    try {
      setGuardando(true);
      const datos = {
        ...(esEdicion ? {} : { tipo }),
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        categoria: categoriaFinal,
        precioBase,
        precioDesde,
        imagenPrincipal: imagenNueva,
        disponible,
        destacado,
        ...(imagenCambio ? { imagenAEliminar: imagenOriginal } : {}),
      };
      await onGuardar(datos);
      // Imagen guardada — limpiar estado sin eliminar de R2
      imagen.setImageUrl(null);
      imagen.setR2Url(null);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setGuardando(false);
    }
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  const tipoActual = esEdicion ? (articulo?.tipo || 'producto') : tipo;
  const gradiente = GRADIENTES_TIPO[tipoActual];

  return (
    <>
      <ModalAdaptativo
        abierto={true}
        onCerrar={() => { imagen.reset(); onCerrar(); }}
        ancho="xl"
        mostrarHeader={false}
        paddingContenido="none"
        sinScrollInterno
        alturaMaxima="xl"
        colorHandle={GRADIENTES_TIPO[tipo].handle}
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
                {tipoActual === 'servicio'
                  ? <Wrench className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                  : <Package className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                }
              </div>

              {/* Título */}
              <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                  {esEdicion ? (articulo?.nombre || 'Editar') : tipo === 'servicio' ? 'Nuevo servicio' : 'Nuevo producto'}
                </h3>
                <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">
                  {esEdicion ? (tipo === 'servicio' ? 'Editando servicio' : 'Editando producto') : 'Completa los campos'}
                </span>
              </div>

              {/* Badge tipo */}
              <span className="flex items-center gap-1.5 px-2.5 py-1 lg:px-2 lg:py-0.5 2xl:px-2.5 2xl:py-1 rounded-full border border-white/20 bg-white/15 text-white text-sm lg:text-[11px] 2xl:text-sm font-semibold shrink-0">
                {tipo === 'servicio'
                  ? <Wrench className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                  : <Package className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                }
                {tipo === 'servicio' ? 'Servicio' : 'Producto'}
              </span>
            </div>
          </div>

          {/* ── Body scrolleable ── */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:h-full">

              {/* ── Columna Izquierda ── */}
              <div className="lg:w-2/5 px-3 pt-3 pb-1 lg:p-2 2xl:p-5 lg:border-r-2 border-slate-300 bg-slate-50 flex flex-col gap-3 lg:gap-2.5 2xl:gap-4">

                {/* === MÓVIL: fila imagen pequeña + Categoría/Precio === */}
                <div className="flex gap-2.5 lg:hidden">

                  {/* Imagen pequeña */}
                  <div className="w-36 shrink-0 rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative" style={{ aspectRatio: '1/1' }}>
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
                          id="input-imagen-articulo"
                          name="input-imagen-articulo"
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

                  {/* Categoría + Precio */}
                  <div className="flex-1 flex flex-col gap-2">
                    {/* Categoría */}
                    <div className="relative dropdown-categoria flex-1">
                      <span className="block text-sm font-bold text-slate-700 mb-1.5">Categoría</span>
                      <button
                        ref={botonRef}
                        type="button"
                        onClick={() => {
                          if (!mostrarDropdown && botonRef.current) {
                            const rect = botonRef.current.getBoundingClientRect();
                            const viewportHeight = window.innerHeight;
                            const spaceBelow = viewportHeight - rect.bottom;
                            const spaceAbove = rect.top;
                            const shouldOpenUpwards = spaceBelow < 150 && spaceAbove > spaceBelow;
                            const maxHeight = shouldOpenUpwards
                              ? Math.min(spaceAbove - 20, 260)
                              : Math.min(spaceBelow - 20, 260);
                            setDropdownPosition({
                              top: shouldOpenUpwards
                                ? rect.top + window.scrollY - maxHeight - 4
                                : rect.bottom + window.scrollY + 4,
                              left: rect.left + window.scrollX,
                              width: rect.width,
                              maxHeight,
                              openUpwards: shouldOpenUpwards,
                            });
                          }
                          setMostrarDropdown(!mostrarDropdown);
                        }}
                        className="w-full h-11 flex items-center justify-between px-4 bg-slate-100 border-2 border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base cursor-pointer"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className={`truncate font-medium ${categoria ? 'text-slate-800' : 'text-slate-400'}`}>
                            {categoria || 'Seleccionar'}
                          </span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${mostrarDropdown ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Precio */}
                    <div>
                      <label htmlFor="input-precio-articulo" className="block text-sm font-bold text-slate-700 mb-1.5">
                        Precio <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base font-medium">$</span>
                        <input
                          id="input-precio-articulo"
                          name="input-precio-articulo"
                          type="number"
                          value={precioStr}
                          onChange={(e) => setPrecioStr(e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className={`w-full h-11 pl-7 pr-3 bg-slate-100 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium text-slate-800 placeholder:text-slate-500 ${precioVacio ? 'border-red-400' : 'border-slate-300'}`}
                          style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                        />
                      </div>
                      {precioVacio && (
                        <p className="text-xs text-red-500 font-medium mt-1">El precio no puede estar vacío</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* === DESKTOP: imagen full width === */}
                <div className="hidden lg:block rounded-lg 2xl:rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative" style={{ aspectRatio: '4/3' }}>
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
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 gap-1.5">
                      <input
                        id="input-imagen-articulo-desktop"
                        name="input-imagen-articulo-desktop"
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

                {/* === Íconos Eye + Star (solo móvil) === */}
                <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-200">
                  <Tooltip
                    text={disponible ? (tipo === 'servicio' ? 'Servicio visible' : 'Producto visible') : (tipo === 'servicio' ? 'Servicio oculto' : 'Producto oculto')}
                    position="bottom"
                    autoHide={2500}
                  >
                    <button
                      type="button"
                      onClick={() => setDisponible(!disponible)}
                      className={`p-2.5 lg:p-2 2xl:p-2.5 rounded-xl transition-all cursor-pointer ${disponible ? 'bg-green-50 hover:bg-green-100' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                      {disponible
                        ? <Eye className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-green-600" />
                        : <EyeOff className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-slate-400" />
                      }
                    </button>
                  </Tooltip>

                  <div className="w-px h-8 bg-slate-200" />

                  <Tooltip
                    text={destacado ? (tipo === 'servicio' ? 'Servicio destacado' : 'Producto destacado') : 'Sin destacar'}
                    position="bottom"
                    autoHide={2500}
                  >
                    <button
                      type="button"
                      onClick={() => setDestacado(!destacado)}
                      className={`p-2.5 lg:p-2 2xl:p-2.5 rounded-xl transition-all cursor-pointer ${destacado ? 'bg-amber-50 hover:bg-amber-100' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                      <Star className={`w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 ${destacado ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                    </button>
                  </Tooltip>
                </div>

                {/* === DESKTOP: Categoría + Precio debajo de íconos === */}
                <div className="hidden lg:flex flex-col gap-1.5 2xl:gap-2">

                  {/* Categoría */}
                  <div className="relative dropdown-categoria">
                    <span className="block text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">Categoría</span>
                    <button
                      ref={botonRef}
                      type="button"
                      onClick={() => {
                        if (!mostrarDropdown && botonRef.current) {
                          const rect = botonRef.current.getBoundingClientRect();
                          const viewportHeight = window.innerHeight;
                          const spaceBelow = viewportHeight - rect.bottom;
                          const spaceAbove = rect.top;
                          const shouldOpenUpwards = spaceBelow < 150 && spaceAbove > spaceBelow;
                          const maxHeight = shouldOpenUpwards
                            ? Math.min(spaceAbove - 20, 260)
                            : Math.min(spaceBelow - 20, 260);
                          setDropdownPosition({
                            top: shouldOpenUpwards
                              ? rect.top + window.scrollY - maxHeight - 4
                              : rect.bottom + window.scrollY + 4,
                            left: rect.left + window.scrollX,
                            width: rect.width,
                            maxHeight,
                            openUpwards: shouldOpenUpwards,
                          });
                        }
                        setMostrarDropdown(!mostrarDropdown);
                      }}
                      className="w-full h-10 2xl:h-11 flex items-center justify-between px-3 2xl:px-4 bg-slate-100 border-2 border-slate-300 rounded-lg hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm 2xl:text-base cursor-pointer"
                      style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Tag className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-slate-400 shrink-0" />
                        <span className={`truncate font-medium ${categoria ? 'text-slate-800' : 'text-slate-400'}`}>
                          {categoria || 'Seleccionar'}
                        </span>
                      </div>
                      <ChevronDown className={`w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-slate-400 transition-transform shrink-0 ${mostrarDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Precio */}
                  <div>
                    <label htmlFor="input-precio-articulo-desktop" className="block text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                      Precio <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm 2xl:text-base font-medium">$</span>
                      <input
                        id="input-precio-articulo-desktop"
                        name="input-precio-articulo-desktop"
                        type="number"
                        value={precioStr}
                        onChange={(e) => setPrecioStr(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={`w-full h-10 2xl:h-11 pl-6 2xl:pl-7 pr-2.5 2xl:pr-3 bg-slate-100 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 ${precioVacio ? 'border-red-400' : 'border-slate-300'}`}
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                      />
                    </div>
                    {precioVacio && (
                      <p className="text-xs 2xl:text-sm text-red-500 font-medium mt-1">El precio no puede estar vacío</p>
                    )}
                  </div>
                </div>

                {/* Portal dropdown (compartido móvil + desktop) */}
                {mostrarDropdown && createPortal(
                  <div
                    className="fixed z-9999 bg-white border-2 border-slate-300 rounded-lg shadow-xl overflow-hidden dropdown-categoria flex flex-col"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      width: `${dropdownPosition.width}px`,
                      maxHeight: `${dropdownPosition.maxHeight}px`,
                      touchAction: 'pan-y',
                    }}
                  >
                    {mostrarInputNueva ? (
                      <div className="p-2 border-b border-slate-200">
                        <input
                          id="input-categoria-nueva"
                          name="input-categoria-nueva"
                          type="text"
                          value={categoriaNueva}
                          onChange={(e) => setCategoriaNueva(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && categoriaNueva.trim()) {
                              setCategoria(categoriaNueva.trim());
                              setCategoriaNueva('');
                              setMostrarInputNueva(false);
                              setMostrarDropdown(false);
                            } else if (e.key === 'Escape') {
                              setCategoriaNueva('');
                              setMostrarInputNueva(false);
                            }
                          }}
                          placeholder="Escribe la categoría…"
                          autoFocus
                          className="w-full px-3 py-1.5 border border-blue-300 rounded text-sm lg:text-xs 2xl:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-1 mt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (categoriaNueva.trim()) {
                                setCategoria(categoriaNueva.trim());
                                setCategoriaNueva('');
                                setMostrarInputNueva(false);
                                setMostrarDropdown(false);
                              }
                            }}
                            className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded text-sm lg:text-xs 2xl:text-sm font-medium hover:bg-blue-700 cursor-pointer"
                          >
                            Agregar
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCategoriaNueva(''); setMostrarInputNueva(false); }}
                            className="flex-1 px-2 py-1.5 bg-slate-100 text-slate-600 rounded text-sm lg:text-xs 2xl:text-sm font-medium hover:bg-slate-200 cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                          {categoriasExistentes.length > 0 && (
                            <div className="py-1">
                              {categoriasExistentes.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => { setCategoria(cat); setMostrarDropdown(false); }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm lg:text-xs 2xl:text-sm cursor-pointer ${categoria === cat ? 'bg-blue-100' : 'hover:bg-blue-50'}`}
                                >
                                  <span className="text-slate-800 font-medium">{cat}</span>
                                  {categoria === cat && <Check className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-600" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="border-t border-slate-200 bg-white">
                          <button
                            type="button"
                            onClick={() => setMostrarInputNueva(true)}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-left text-sm lg:text-xs 2xl:text-sm text-blue-600 font-semibold cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 shrink-0" />
                            Agregar nueva
                          </button>
                        </div>
                      </>
                    )}
                  </div>,
                  document.body
                )}
              </div>

              {/* ── Columna Derecha: Nombre + Descripción + Precio desde + Botones ── */}
              <div className="lg:w-3/5 px-3 pt-0 pb-3 lg:px-2 lg:pt-1 lg:pb-2 2xl:px-5 2xl:pt-2 2xl:pb-5 flex flex-col gap-2 lg:gap-1.5 2xl:gap-3">

                {/* Íconos Eye + Star (solo PC) */}
                <div className="hidden lg:flex items-center justify-around py-1.5 2xl:py-2 border-b border-slate-200 mb-0.5">
                  <Tooltip
                    text={disponible ? (tipo === 'servicio' ? 'Servicio visible' : 'Producto visible') : (tipo === 'servicio' ? 'Servicio oculto' : 'Producto oculto')}
                    position="bottom"
                    autoHide={2500}
                  >
                    <button
                      type="button"
                      onClick={() => setDisponible(!disponible)}
                      className={`p-2 2xl:p-2.5 rounded-xl transition-all cursor-pointer ${disponible ? 'bg-green-50 hover:bg-green-100' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                      {disponible
                        ? <Eye className="w-6 h-6 2xl:w-7 2xl:h-7 text-green-600" />
                        : <EyeOff className="w-6 h-6 2xl:w-7 2xl:h-7 text-slate-400" />
                      }
                    </button>
                  </Tooltip>

                  <div className="w-px h-8 bg-slate-200" />

                  <Tooltip
                    text={destacado ? (tipo === 'servicio' ? 'Servicio destacado' : 'Producto destacado') : 'Sin destacar'}
                    position="bottom"
                    autoHide={2500}
                  >
                    <button
                      type="button"
                      onClick={() => setDestacado(!destacado)}
                      className={`p-2 2xl:p-2.5 rounded-xl transition-all cursor-pointer ${destacado ? 'bg-amber-50 hover:bg-amber-100' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                      <Star className={`w-6 h-6 2xl:w-7 2xl:h-7 ${destacado ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                    </button>
                  </Tooltip>
                </div>

                {/* Nombre */}
                <div>
                  <label
                    htmlFor="input-nombre-articulo"
                    className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2"
                  >
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-nombre-articulo"
                    name="input-nombre-articulo"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder={`Nombre del ${tipo}`}
                    maxLength={100}
                    className="w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                  />
                </div>

                {/* Descripción */}
                <div className="flex-1 flex flex-col">
                  <label
                    htmlFor="textarea-descripcion-articulo"
                    className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2"
                  >
                    Descripción <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    id="textarea-descripcion-articulo"
                    name="textarea-descripcion-articulo"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder={tipo === 'servicio' ? 'Describe brevemente el servicio: qué incluye, duración, beneficios…' : 'Describe brevemente el producto: materiales, características, beneficios…'}
                    rows={4}
                    maxLength={500}
                    className="flex-1 w-full px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2.5 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                  />
                </div>

                {/* Precio desde */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    id="checkbox-precio-desde"
                    name="checkbox-precio-desde"
                    type="checkbox"
                    checked={precioDesde}
                    onChange={(e) => setPrecioDesde(e.target.checked)}
                    className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm lg:text-xs 2xl:text-sm text-slate-600">
                    Mostrar como "Desde ${precioStr || '0.00'}"
                  </span>
                </label>

                {/* Botones */}
                <div className="flex gap-3 2xl:gap-3 mt-4 mb-2 lg:mb-2 2xl:mb-0 lg:mt-auto 2xl:mt-auto">
                  <button
                    type="button"
                    onClick={() => { imagen.reset(); onCerrar(); }}
                    disabled={guardando}
                    className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-50 hover:border-slate-500 active:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={guardando || imagen.isUploading || precioVacio}
                    className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98]"
                  >
                    {guardando && <Spinner tamanio="sm" color="white" />}
                    {esEdicion ? 'Guardar cambios' : tipo === 'servicio' ? 'Crear servicio' : 'Crear producto'}
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

export default ModalArticulo;
