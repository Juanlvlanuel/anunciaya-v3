/**
 * ModalRecompensa.tsx (v3.2 - AJUSTES FINALES DE UX)
 * ====================================================
 * Modal de crear / editar recompensa con upload optimista a Cloudinary.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/ModalRecompensa.tsx
 *
 * CAMBIOS v3.2:
 * - ✅ Toggle "Activa" casi pegado a la X en vista PC (ml-auto)
 * - ✅ Eliminados títulos de cards "Información Básica" y "Configuración"
 * - ✅ Títulos de inputs más grandes y destacados
 * - ✅ cursor-pointer agregado en todos los elementos interactivos
 *
 * Exports:
 *   - DatosModalRecompensa (interface) → usada por PaginaPuntos para tipear onGuardar
 *   - ModalRecompensa (default)        → componente
 */

import { useState, useEffect } from 'react';
import { Gift, Image, X, Check, Loader2 } from 'lucide-react';
import useOptimisticUpload from '../../../../../hooks/useOptimisticUpload';
import { eliminarDeCloudinary } from '../../../../../utils/cloudinary';
import { ModalAdaptativo } from '../../../../../components/ui/ModalAdaptativo';
import type { Recompensa } from '../../../../../types/puntos';

// =============================================================================
// TIPOS EXPORTADOS
// =============================================================================

/** Datos que sale del modal hacia el padre (crear / editar recompensa) */
export interface DatosModalRecompensa {
  nombre: string;
  descripcion: string | null;
  puntosRequeridos: number;
  stock: number | null;
  requiereAprobacion: boolean;
  imagenUrl: string | null;
  eliminarImagen?: boolean;
  activa?: boolean;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function ModalRecompensa({
  abierto,
  onCerrar,
  recompensa,
  onGuardar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  recompensa: Recompensa | null;
  onGuardar: (datos: DatosModalRecompensa) => Promise<void>;
}) {
  const imagen = useOptimisticUpload({ carpeta: 'recompensas' });

  const [nombre, setNombre] = useState(recompensa?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(recompensa?.descripcion ?? '');
  const [puntos, setPuntos] = useState<string>(recompensa?.puntosRequeridos?.toString() ?? '');
  const [stockIlimitado, setStockIlimitado] = useState(recompensa?.stock === null);
  const [stock, setStock] = useState<string>(recompensa?.stock?.toString() ?? '');
  const [activa, setActiva] = useState(recompensa?.activa ?? true);
  const [imagenEliminada, setImagenEliminada] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const imagenOriginal = recompensa?.imagenUrl ?? null;

  // Sincronizar imagen al montar en modo edición
  useEffect(() => {
    if (imagenOriginal) {
      imagen.setImageUrl(imagenOriginal);
      imagen.setCloudinaryUrl(imagenOriginal);
    }
  }, []); 

  if (!abierto) return null;

  const esEdicion = !!recompensa;
  const stockValido = stockIlimitado || (stock.length > 0 && Number(stock) > 0);
  const valido = nombre.trim().length > 0 && puntos.length > 0 && Number(puntos) > 0 && stockValido;

  const handleEliminarImagen = () => {
    imagen.setImageUrl(null);
    imagen.setCloudinaryUrl(null);
    setImagenEliminada(true);
  };

  // Cleanup imagen huérfana si el usuario cancela tras subir
  const handleCerrar = async () => {
    if (imagen.cloudinaryUrl && imagen.cloudinaryUrl !== imagenOriginal) {
      await eliminarDeCloudinary(imagen.cloudinaryUrl);
    }
    onCerrar();
  };

  const handleGuardar = async () => {
    if (!valido || guardando || imagen.isUploading) return;
    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        puntosRequeridos: Number(puntos),
        stock: stockIlimitado ? null : Number(stock),
        requiereAprobacion: false,
        imagenUrl: imagen.cloudinaryUrl,
        ...(imagenEliminada && { eliminarImagen: true }),
        activa,
      });
    } catch (error) {
      console.error('Error al guardar recompensa:', error);
    } finally {
      setGuardando(false);
    }
  };

  // -----------------------------------------------------------------------
  // Header personalizado con toggle PEGADO A LA X en PC
  // -----------------------------------------------------------------------

  const iconoTitulo = (
    <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md shadow-blue-500/30">
      <Gift className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-white" />
    </div>
  );

  const titulo = (
    <div className="flex items-center justify-between flex-1">
      <span className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800">
        {esEdicion ? 'Editar Recompensa' : 'Nueva Recompensa'}
      </span>
      
      {/* Toggle activo/inactivo - PEGADO A LA X en PC con ml-auto */}
      {esEdicion && (
        <div className="flex items-center gap-2 ml-6 lg:ml-12 2xl:ml-36">
          <span className={`text-xs lg:text-[10px] 2xl:text-xs font-bold ${activa ? 'text-green-600' : 'text-slate-400'}`}>
            {activa ? 'Activa' : 'Inactiva'}
          </span>
          <button
            onClick={() => setActiva(!activa)}
            className={`relative w-11 h-6 lg:w-9 lg:h-[18px] 2xl:w-10 2xl:h-5 rounded-full transition-colors cursor-pointer ${
              activa 
                ? 'bg-linear-to-r from-green-500 to-emerald-600 shadow-md shadow-green-500/30' 
                : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 bg-white rounded-full shadow transition-transform ${
                activa ? 'translate-x-5 lg:translate-x-[18px] 2xl:translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}
    </div>
  );

  // -----------------------------------------------------------------------
  // Contenido del modal - SIN TÍTULOS DE CARDS
  // -----------------------------------------------------------------------

  const contenido = (
    <div className="flex flex-col gap-4 lg:gap-2.5 2xl:gap-3">

      {/* ========== HERO: IMAGEN ========== */}
      <div className="relative">
        {imagen.imageUrl ? (
          <div className="relative group rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden border border-slate-200 shadow-sm h-40 lg:h-28 2xl:h-32">
            <img 
              src={imagen.imageUrl} 
              alt="Recompensa" 
              className="w-full h-full object-cover"
            />
            {/* Overlay oscuro al hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300" />
            
            {/* Botón eliminar - aparece al hover */}
            <button
              onClick={handleEliminarImagen}
              className="absolute top-2 right-2 lg:top-1.5 lg:right-1.5 2xl:top-2 2xl:right-2 bg-white/95 backdrop-blur-sm rounded-lg p-1.5 lg:p-1 2xl:p-1.5 shadow-lg border border-red-200 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-400 transition-all duration-300 cursor-pointer"
            >
              <X className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-600" />
            </button>

            {/* Badge de estado de upload */}
            {imagen.isUploading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-7 h-7 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-blue-600 animate-spin" />
                  <span className="text-sm lg:text-[10px] 2xl:text-xs font-semibold text-slate-600">Subiendo...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <label className="relative border border-dashed border-slate-300 rounded-xl lg:rounded-lg 2xl:rounded-xl h-40 lg:h-28 2xl:h-32 flex flex-col items-center justify-center gap-2.5 lg:gap-1.5 2xl:gap-2 cursor-pointer hover:border-blue-400 hover:bg-linear-to-br hover:from-blue-50 hover:to-blue-50/50 transition-all duration-300 group">
            <input
              type="file" 
              accept="image/*"
              name="imagenRecompensa"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) imagen.uploadImage(f); }}
              className="sr-only"
            />
            
            <div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-xl bg-linear-to-br from-slate-100 to-slate-200 group-hover:from-blue-100 group-hover:to-blue-200 flex items-center justify-center transition-all duration-300 shadow-sm">
              {imagen.isUploading ? (
                <Loader2 className="w-7 h-7 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-blue-600 animate-spin" />
              ) : (
                <Image className="w-7 h-7 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
              )}
            </div>
            
            <div className="text-center">
              <p className="text-sm lg:text-[10px] 2xl:text-xs font-semibold text-slate-600 group-hover:text-blue-700 transition-colors">
                {imagen.isUploading ? 'Subiendo imagen...' : 'Toca para agregar imagen'}
              </p>
              <p className="text-xs lg:text-[9px] 2xl:text-[10px] text-slate-400 mt-1">
                PNG, JPG o WEBP
              </p>
            </div>
          </label>
        )}
      </div>

      {/* ========== CARD 1: SIN TÍTULO - Solo campos ========== */}
      <div className="bg-linear-to-br from-slate-50 to-slate-100/50 rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-2.5 2xl:p-3 border border-slate-200">
        <div className="space-y-3 lg:space-y-1.5 2xl:space-y-2">
          {/* Nombre - Título más grande */}
          <div>
            <label htmlFor="mr-nombre" className="flex items-center gap-1.5 text-base lg:text-xs 2xl:text-sm font-bold text-slate-800 mb-2 lg:mb-1 2xl:mb-1.5">
              Nombre de la recompensa
              <span className="text-red-500">*</span>
            </label>
            <input
              id="mr-nombre"
              name="nombre"
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Café gratis, Descuento 20%, etc."
              className="w-full px-3.5 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg border border-slate-200 bg-white text-sm lg:text-[11px] 2xl:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-text"
            />
          </div>

          {/* Descripción - Título más grande */}
          <div>
            <label htmlFor="mr-descripcion" className="flex items-center gap-1.5 text-base lg:text-xs 2xl:text-sm font-bold text-slate-800 mb-2 lg:mb-1 2xl:mb-1.5">
              Descripción
              <span className="text-xs lg:text-[9px] 2xl:text-[10px] text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="mr-descripcion"
              name="descripcion"
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe los detalles..."
              rows={2}
              className="w-full px-3.5 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg border border-slate-200 bg-white text-sm lg:text-[11px] 2xl:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none cursor-text"
            />
          </div>
        </div>
      </div>

      {/* ========== CARD 2: SIN TÍTULO - Grid 2 columnas ========== */}
      <div className="bg-linear-to-br from-blue-50 to-blue-100/50 rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-2.5 2xl:p-3 border border-blue-200">
        {/* Grid 2 columnas: Puntos + Stock */}
        <div className="grid grid-cols-2 gap-3 lg:gap-1.5 2xl:gap-2">
          
          {/* Puntos requeridos - Título más grande */}
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="mr-puntos" className="flex items-center gap-1.5 text-base lg:text-xs 2xl:text-sm font-bold text-slate-800 mb-2 lg:mb-1 2xl:mb-1.5">
              Puntos requeridos
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="mr-puntos"
                name="puntosRequeridos"
                type="number" 
                min={1} 
                value={puntos} 
                onChange={(e) => setPuntos(e.target.value)}
                placeholder="150"
                className="w-full px-3.5 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 pr-14 lg:pr-12 2xl:pr-12 rounded-lg lg:rounded-md 2xl:rounded-lg border border-slate-200 bg-white text-sm lg:text-[11px] 2xl:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-text [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
              />
              <span className="absolute right-2.5 lg:right-1.5 2xl:right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 lg:px-1 lg:py-0.5 2xl:px-1.5 2xl:py-0.5 bg-linear-to-r from-amber-500 to-orange-500 text-white text-xs lg:text-[9px] 2xl:text-[10px] font-bold rounded-md shadow-sm pointer-events-none">
                pts
              </span>
            </div>
          </div>

          {/* Stock disponible - Título más grande */}
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between mb-2 lg:mb-1 2xl:mb-1.5">
              <label htmlFor="mr-stock" className="text-base lg:text-xs 2xl:text-sm font-bold text-slate-800">
                Stock disponible
              </label>
              <label className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1 cursor-pointer group">
                <input
                  type="checkbox" 
                  checked={stockIlimitado}
                  name="stockIlimitado"
                  onChange={(e) => setStockIlimitado(e.target.checked)}
                  className="w-3.5 h-3.5 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 rounded accent-blue-600 cursor-pointer"
                />
                <span className="text-xs lg:text-[9px] 2xl:text-[10px] font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
                  Ilimitado
                </span>
              </label>
            </div>
            <div className="relative">
              <input
                id="mr-stock"
                name="stock"
                type="number" 
                min={0} 
                value={stockIlimitado ? '' : stock}
                onChange={(e) => setStock(e.target.value)}
                disabled={stockIlimitado} 
                placeholder="50"
                className={`w-full px-3.5 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2 pr-14 lg:pr-12 2xl:pr-12 rounded-lg lg:rounded-md 2xl:rounded-lg border bg-white text-sm lg:text-[11px] 2xl:text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-text [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${
                  !stockIlimitado && ((stock.length > 0 && Number(stock) <= 0) || stock.length === 0)
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                }`}
              />
              <span className="absolute right-2.5 lg:right-1.5 2xl:right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 lg:px-1 lg:py-0.5 2xl:px-1.5 2xl:py-0.5 bg-slate-200 text-slate-600 text-xs lg:text-[9px] 2xl:text-[10px] font-bold rounded-md pointer-events-none">
                {stockIlimitado ? '∞' : 'unid'}
              </span>
            </div>
            {!stockIlimitado && stock.length > 0 && Number(stock) <= 0 && (
              <p className="text-[11px] lg:text-[9px] 2xl:text-[11px] text-red-500 font-semibold mt-1">
                El stock debe ser mayor a 0
              </p>
            )}
            {!stockIlimitado && stock.length === 0 && (
              <p className="text-[11px] lg:text-[9px] 2xl:text-[11px] text-red-500 font-semibold mt-1">
                Ingresa el stock o marca "Ilimitado"
              </p>
            )}
          </div>

        </div>
      </div>

      {/* ========== FOOTER: BOTONES ========== */}
      <div className="flex gap-3 lg:gap-1.5 2xl:gap-2 pt-1">
        <button
          onClick={handleCerrar}
          className="flex-1 py-2.5 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg border border-slate-300 bg-white text-sm lg:text-[11px] 2xl:text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={!valido || guardando || imagen.isUploading}
          className="flex-1 py-2.5 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-linear-to-r from-blue-600 to-blue-700 text-sm lg:text-[11px] 2xl:text-xs font-semibold text-white hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-1.5 shadow-md shadow-blue-500/30 disabled:shadow-none cursor-pointer"
        >
          {guardando ? (
            <>
              <Loader2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
              <span>{esEdicion ? 'Guardar cambios' : 'Crear recompensa'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Render adaptativo
  // -----------------------------------------------------------------------

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={handleCerrar}
      titulo={titulo}
      iconoTitulo={iconoTitulo}
      ancho="md"
    >
      {contenido}
    </ModalAdaptativo>
  );
}