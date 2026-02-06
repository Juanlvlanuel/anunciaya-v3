/**
 * ============================================================================
 * MODAL: Crear/Editar Artículo
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/catalogo/ModalArticulo.tsx
 * 
 * PROPÓSITO:
 * Modal reutilizable para crear o editar artículos del catálogo
 * Usa hook useOptimisticUpload para subida de imagen
 * 
 * FEATURES:
 * - Modo crear / editar automático
 * - Subida de imagen optimista (Cloudinary)
 * - Validación de campos
 * - Categoría personalizada o selección
 * - Layout 2 columnas en PC, vertical en móvil
 * - Patrón responsivo: base lg:laptop 2xl:desktop
 * 
 * CREADO: Fase 5.4.1 - Catálogo CRUD Frontend
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
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
import { useOptimisticUpload } from '../../../../hooks/useOptimisticUpload';
import { Boton } from '../../../../components/ui/Boton';
import { ModalImagenes } from '../../../../components/ui';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { notificar } from '../../../../utils/notificaciones';
import type { Articulo, CrearArticuloInput, ActualizarArticuloInput } from '../../../../types/articulos';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalArticuloProps {
  articulo?: Articulo | null;
  categoriasExistentes?: string[];
  onGuardar: (datos: CrearArticuloInput | ActualizarArticuloInput) => Promise<void>;
  onCerrar: () => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalArticulo({ articulo, categoriasExistentes = [], onGuardar, onCerrar }: ModalArticuloProps) {
  const esEdicion = !!articulo;

  // ===========================================================================
  // ESTADOS DEL FORMULARIO
  // ===========================================================================

  const [tipo, setTipo] = useState<'producto' | 'servicio'>(articulo?.tipo || 'producto');
  const [nombre, setNombre] = useState(articulo?.nombre || '');
  const [descripcion, setDescripcion] = useState(articulo?.descripcion || '');
  const [categoria, setCategoria] = useState(articulo?.categoria || '');
  const [categoriaNueva, setCategoriaNueva] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [mostrarInputNueva, setMostrarInputNueva] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ 
    top: 0, 
    left: 0, 
    width: 0, 
    maxHeight: 0, 
    openUpwards: false 
  });
  const botonRef = useRef<HTMLButtonElement>(null);
  const [precioBase, setPrecioBase] = useState(
    articulo?.precioBase ? Number(articulo.precioBase) : 0
  );
  const [precioDesde, setPrecioDesde] = useState(articulo?.precioDesde ?? false);
  const [disponible, setDisponible] = useState(articulo?.disponible ?? true);
  const [destacado, setDestacado] = useState(articulo?.destacado ?? false);
  const [guardando, setGuardando] = useState(false);
  const [modalImagenes, setModalImagenes] = useState<{ isOpen: boolean; images: string[]; initialIndex: number; }>({ isOpen: false, images: [], initialIndex: 0 });

  // ===========================================================================
  // HANDLERS PARA MODAL DE IMÁGENES
  // ===========================================================================

  const abrirImagenUnica = (url: string) => {
    setModalImagenes({
      isOpen: true,
      images: [url],
      initialIndex: 0,
    });
  };

  const cerrarModalImagenes = () => {
    setModalImagenes({
      isOpen: false,
      images: [],
      initialIndex: 0,
    });
  };

  // ===========================================================================
  // HOOK DE UPLOAD DE IMAGEN
  // ===========================================================================

  const imagen = useOptimisticUpload({
    carpeta: 'articulos',
    onSuccess: (url) => {
      console.log('✅ Imagen subida:', url);
    },
    onError: (error) => {
      notificar.error(`Error al subir imagen: ${error.message}`);
    },
  });

  // Cargar imagen existente al editar
  useEffect(() => {
    if (articulo?.imagenPrincipal) {
      imagen.setImageUrl(articulo.imagenPrincipal);
      imagen.setCloudinaryUrl(articulo.imagenPrincipal);
      imagen.setIsLocal(false);
    }
  }, [articulo]);

  // Cerrar dropdown al hacer clic fuera y recalcular posición
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
        
        // Calcular espacio disponible abajo y arriba
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Altura mínima deseada para el dropdown (150px ~ 3 items)
        const minDesiredHeight = 150;
        
        // Decidir si abrir hacia arriba o abajo
        const shouldOpenUpwards = spaceBelow < minDesiredHeight && spaceAbove > spaceBelow;
        
        // Calcular altura máxima disponible (dejando 20px de margen)
        const maxHeight = shouldOpenUpwards 
          ? Math.min(spaceAbove - 20, 300) // Máximo 300px hacia arriba
          : Math.min(spaceBelow - 20, 300); // Máximo 300px hacia abajo
        
        setDropdownPosition({
          top: shouldOpenUpwards 
            ? rect.top + window.scrollY - maxHeight - 4 // Abrir hacia arriba
            : rect.bottom + window.scrollY + 4, // Abrir hacia abajo (default)
          left: rect.left + window.scrollX,
          width: rect.width,
          maxHeight,
          openUpwards: shouldOpenUpwards
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

  // Bloquear scroll del body de forma robusta
  useEffect(() => {
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
  }, []);

  // ===========================================================================
  // VALIDACIÓN
  // ===========================================================================

  const validarFormulario = (): boolean => {
    if (!nombre.trim()) {
      notificar.error('El nombre es obligatorio');
      return false;
    }

    if (precioBase <= 0) {
      notificar.error('El precio debe ser mayor a 0');
      return false;
    }

    if (imagen.imageUrl && imagen.isUploading) {
      notificar.error('Espera a que termine de subir la imagen');
      return false;
    }

    return true;
  };

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      imagen.uploadImage(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    const categoriaFinal = categoria || 'Sin categoría';

    // Determinar si la imagen cambió (solo en edición)
    const imagenOriginal = articulo?.imagenPrincipal;
    const imagenNueva = imagen.cloudinaryUrl;
    const imagenCambio = esEdicion && imagenOriginal && imagenNueva && imagenOriginal !== imagenNueva;

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
        // Si la imagen cambió, enviar la anterior para eliminarla de Cloudinary
        ...(imagenCambio ? { imagenAEliminar: imagenOriginal } : {}),
      };

      await onGuardar(datos);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setGuardando(false);
    }
  };

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <>
      {/* Modal Principal */}
      <ModalAdaptativo
        abierto={true}
        onCerrar={onCerrar}
        titulo={esEdicion ? 'Editar Artículo' : 'Nuevo Artículo'}
        iconoTitulo={<Package className="w-5 h-5 text-blue-600" />}
        ancho="xl"
        paddingContenido="none"
        className="max-w-xs lg:max-w-2xl 2xl:max-w-4xl"
      >
        {/* Body - 2 columnas en PC */}
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row">
            {/* Columna Izquierda - Imagen */}
            <div className="lg:w-2/5 p-2.5 lg:p-2 2xl:p-5 lg:border-r-2 border-slate-300 bg-slate-50">
              {/* Tipo (solo al crear) */}
              {!esEdicion && (
                <div className="flex gap-2 mb-2 lg:mb-3 2xl:mb-4">
                  <button
                    type="button"
                    onClick={() => setTipo('producto')}
                    className={`flex-1 py-1.5 lg:py-2 2xl:py-2.5 px-2 lg:px-2 2xl:px-3 rounded-lg lg:rounded-md 2xl:rounded-lg border text-xs 2xl:text-base font-medium flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-2 transition-all cursor-pointer ${tipo === 'producto'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <Package className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6" />
                    Producto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo('servicio')}
                    className={`flex-1 py-1.5 lg:py-2 2xl:py-2.5 px-2 lg:px-2 2xl:px-3 rounded-lg lg:rounded-md 2xl:rounded-lg border text-xs 2xl:text-base font-medium flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-2 transition-all cursor-pointer ${tipo === 'servicio'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                  >
                    <Wrench className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6" />
                    Servicio
                  </button>
                </div>
              )}

              {/* Imagen */}
              <div className="h-32 lg:h-[200px] 2xl:aspect-square 2xl:h-auto rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative">
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
                        <div className="text-white text-xs 2xl:text-base font-medium">Subiendo...</div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => imagen.reset()}
                      className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 2xl:top-2 2xl:right-2 bg-red-500 text-white p-1 lg:p-1 2xl:p-1.5 rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                    </button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 transition-colors">
                    <input
                      id="input-imagen-articulo"
                      name="input-imagen-articulo"
                      type="file"
                      accept="image/*"
                      onChange={handleImagenChange}
                      className="hidden"
                    />
                    <ImagePlus className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-10 2xl:h-10 text-slate-400 mb-1 lg:mb-1 2xl:mb-2" />
                    <p className="text-xs lg:text-xs 2xl:text-sm text-slate-500 font-medium">Agregar imagen</p>
                    <p className="text-[10px] lg:text-[10px] 2xl:text-xs text-slate-400 mt-0.5 lg:mt-0.5 2xl:mt-1">Click para subir</p>
                  </label>
                )}
              </div>

              {/* Toggles compactos */}
              <div className="flex gap-2 mt-2 lg:mt-3 2xl:mt-4">
                <button
                  type="button"
                  onClick={() => setDisponible(!disponible)}
                  className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-2 py-1.5 lg:py-2 2xl:py-2.5 px-2 lg:px-2 2xl:px-3 rounded-lg lg:rounded-md 2xl:rounded-lg border-2 text-xs 2xl:text-base font-medium transition-all cursor-pointer ${disponible
                      ? 'border-green-400 bg-green-50 text-green-700'
                      : 'border-slate-300 bg-white text-slate-600'
                    }`}
                >
                  {disponible ? <Eye className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6" /> : <EyeOff className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6" />}
                  {disponible ? 'Visible' : 'Oculto'}
                </button>
                <button
                  type="button"
                  onClick={() => setDestacado(!destacado)}
                  className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-2 py-1.5 lg:py-2 2xl:py-2.5 px-2 lg:px-2 2xl:px-3 rounded-lg lg:rounded-md 2xl:rounded-lg border-2 text-xs 2xl:text-base font-medium transition-all cursor-pointer ${destacado
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-slate-300 bg-white text-slate-600'
                    }`}
                >
                  <Star className={`w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6 ${destacado ? 'fill-current' : ''}`} />
                  Destacado
                </button>
              </div>
            </div>

            {/* Columna Derecha - Formulario */}
            <div className="lg:w-3/5 p-2.5 lg:p-2 2xl:p-5 space-y-2 lg:space-y-2.5 2xl:space-y-4">
              {/* Fila: Categoría + Precio */}
              <div className="grid grid-cols-2 gap-2 lg:gap-2 2xl:gap-3">
                {/* Categoría */}
                <div className="relative dropdown-categoria">
                  <span className="block text-sm lg:text-xs 2xl:text-base font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2">
                    Categoría
                  </span>

                  {/* Botón dropdown */}
                  <button
                    ref={botonRef}
                    type="button"
                    onClick={() => {
                      if (!mostrarDropdown && botonRef.current) {
                        const rect = botonRef.current.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        
                        const spaceBelow = viewportHeight - rect.bottom;
                        const spaceAbove = rect.top;
                        const minDesiredHeight = 150;
                        
                        const shouldOpenUpwards = spaceBelow < minDesiredHeight && spaceAbove > spaceBelow;
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
                          openUpwards: shouldOpenUpwards
                        });
                      }
                      setMostrarDropdown(!mostrarDropdown);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 lg:py-2 2xl:py-2.5 border-2 border-slate-300 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-xs 2xl:text-sm bg-white cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4 text-slate-400" />
                      <span className={categoria ? 'text-slate-700' : 'text-slate-400'}>
                        {categoria || 'Selecciona una categoría'}
                      </span>
                    </div>
                    <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4 text-slate-400 transition-transform ${mostrarDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown menu */}
                  {mostrarDropdown && createPortal(
                    <div
                      className="fixed z-9999 bg-white border-2 border-slate-300 rounded-lg shadow-xl overflow-hidden dropdown-categoria flex flex-col"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        maxHeight: `${dropdownPosition.maxHeight}px`,
                        touchAction: 'pan-y'
                      }}
                    >
                      {/* Input para nueva categoría */}
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
                            placeholder="Escribe la categoría..."
                            autoFocus
                            className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                              className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 cursor-pointer"
                            >
                              Agregar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCategoriaNueva('');
                                setMostrarInputNueva(false);
                              }}
                              className="flex-1 px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium hover:bg-slate-200 cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Área con scroll - Categorías existentes */}
                          <div className="flex-1 overflow-y-auto overscroll-contain">
                            {categoriasExistentes.length > 0 && (
                              <div className="py-1">
                                {categoriasExistentes.map((cat) => (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => {
                                      setCategoria(cat);
                                      setMostrarDropdown(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 text-left text-sm lg:text-xs 2xl:text-sm cursor-pointer"
                                  >
                                    <span className="text-slate-700">{cat}</span>
                                    {categoria === cat && (
                                      <Check className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4 text-blue-600" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Botón Nueva Categoría - SIEMPRE VISIBLE (sticky al final) */}
                          <div className="border-t border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() => setMostrarInputNueva(true)}
                              className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-left text-sm lg:text-xs 2xl:text-sm text-blue-600 font-semibold cursor-pointer transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4 shrink-0" />
                              Agregar nueva
                            </button>
                          </div>
                        </>
                      )}
                    </div>,
                    document.body
                  )}
                </div>

                {/* Precio */}
                <div>
                  <label htmlFor="input-precio-articulo" className="block text-sm lg:text-xs 2xl:text-base font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-1.5">
                    Precio <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 lg:left-2 2xl:left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl lg:text-xs 2xl:text-sm">$</span>
                    <input
                      id="input-precio-articulo"
                      name="input-precio-articulo"
                      type="number"
                      value={precioBase}
                      onChange={(e) => setPrecioBase(Number(e.target.value))}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full pl-6 lg:pl-5 2xl:pl-7 pr-2 lg:pr-2 2xl:pr-3 py-2 lg:py-2 2xl:py-2.5 border-2 border-slate-300 rounded-lg lg:rounded-md 2xl:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-xs 2xl:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label htmlFor="input-nombre-articulo" className="block text-sm lg:text-xs 2xl:text-base font-bold text-slate-700 mb-1 lg:mb-1 2xl:mb-1.5">
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
                  className="w-full px-2.5 lg:px-2.5 2xl:px-3 py-2 lg:py-2 2xl:py-2.5 border-2 border-slate-300 rounded-lg lg:rounded-md 2xl:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm lg:text-xs 2xl:text-sm"
                />
              </div>

              {/* Descripción */}
              <div>
                <label htmlFor="textarea-descripcion-articulo" className="block text-sm lg:text-xs 2xl:text-base font-bold text-slate-700 mb-1 lg:mb-1 2xl:mb-1.5">Descripción (opcional) </label>
                <textarea
                  id="textarea-descripcion-articulo"
                  name="textarea-descripcion-articulo"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción breve..."
                  rows={2}
                  maxLength={500}
                  className="w-full px-2.5 lg:px-2.5 2xl:px-3 py-2 lg:py-2 2xl:py-2.5 border-2 border-slate-300 rounded-lg lg:rounded-md 2xl:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm lg:text-xs 2xl:text-sm"
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
                  className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-6 2xl:h-6 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-xs lg:text-xs 2xl:text-sm text-slate-600">
                  Mostrar como "Desde ${precioBase || '0.00'}"
                </span>
              </label>

              {/* Botones */}
              <div className="flex gap-2 lg:gap-2 2xl:gap-3 pt-3 lg:pt-1 2xl:pt-2">
                <Boton variante="outline" onClick={onCerrar} className="flex-1 lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer" disabled={guardando}>
                  Cancelar
                </Boton>
                <Boton
                  variante="primario"
                  onClick={handleSubmit}
                  className="flex-1 lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer"
                  disabled={guardando || imagen.isUploading}
                  cargando={guardando}
                >
                  {esEdicion ? 'Guardar' : 'Crear'}
                </Boton>
              </div>
            </div>
          </form>
        </ModalAdaptativo>


      {/* ✅ Modal Universal de Imágenes */}
      <ModalImagenes
        images={modalImagenes.images}
        initialIndex={modalImagenes.initialIndex}
        isOpen={modalImagenes.isOpen}
        onClose={cerrarModalImagenes}
      />
    </>
  );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default ModalArticulo;