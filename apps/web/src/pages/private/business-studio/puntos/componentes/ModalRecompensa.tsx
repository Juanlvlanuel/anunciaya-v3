/**
 * ModalRecompensa.tsx
 * ====================
 * Modal de crear / editar recompensa con upload optimista a Cloudinary.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/ModalRecompensa.tsx
 *
 * Exports:
 *   - DatosModalRecompensa (interface) → usada por PaginaPuntos para tipear onGuardar
 *   - ModalRecompensa (default)        → componente
 *
 * Props:
 *   abierto     → controla visibilidad
 *   onCerrar    → callback al cerrar (cleanup imagen huérfana si subió y cancela)
 *   recompensa  → null si es crear, objeto Recompensa si es editar
 *   onGuardar   → recibe DatosModalRecompensa, ejecuta CRUD en padre
 *
 * PATRONES:
 *   - modalKey en el padre se incrementa cada apertura → remount limpio del estado
 *   - useOptimisticUpload: preview inmediato al subir, URL real cuando termina
 *   - Cleanup imagen huérfana al cancelar si subió imagen nueva
 *   - Validación: nombre no vacío + puntos > 0
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
  const [imagenEliminada, setImagenEliminada] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const imagenOriginal = recompensa?.imagenUrl ?? null;

  // Sincronizar imagen al montar en modo edición.
  // Solo se ejecuta una vez (remount via modalKey en padre).
  useEffect(() => {
    if (imagenOriginal) {
      imagen.setImageUrl(imagenOriginal);
      imagen.setCloudinaryUrl(imagenOriginal);
    }
  }, []); 

  if (!abierto) return null;

  const esEdicion = !!recompensa;
  const valido = nombre.trim().length > 0 && puntos.length > 0 && Number(puntos) > 0;

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
    await onGuardar({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      puntosRequeridos: Number(puntos),
      stock: stockIlimitado ? null : Number(stock),
      requiereAprobacion: false,
      imagenUrl: imagen.cloudinaryUrl,
      ...(imagenEliminada && { eliminarImagen: true }),
    });
    // guardando se queda true hasta que el padre cierre el modal
  };

  // -----------------------------------------------------------------------
  // Contenido compartido (se usa en ambos modales)
  // -----------------------------------------------------------------------

  const iconoTitulo = (
    <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
      <Gift className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-indigo-600" />
    </div>
  );

  const titulo = esEdicion ? 'Editar Recompensa' : 'Nueva Recompensa';

  const contenido = (
    <div className="flex flex-col gap-4">

      {/* Imagen */}
      <div>
        <p className="block text-sm font-semibold text-slate-600 mb-2">Imagen</p>
        {imagen.imageUrl ? (
          <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 h-36">
            <img src={imagen.imageUrl} alt="" className="w-full h-full object-cover" />
            <button
              onClick={handleEliminarImagen}
              className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow border hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        ) : (
          <label className="border-2 border-dashed border-slate-300 rounded-xl h-36 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
            <input
              type="file" accept="image/*"
              name="imagenRecompensa"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) imagen.uploadImage(f); }}
              className="sr-only"
            />
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
              {imagen.isUploading ? (
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              ) : (
                <Image className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {imagen.isUploading ? 'Subiendo...' : 'Toca para agregar imagen'}
            </span>
          </label>
        )}
      </div>

      {/* Nombre */}
      <div>
        <label htmlFor="mr-nombre" className="block text-sm font-semibold text-slate-600 mb-1.5">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="mr-nombre"
          name="nombre"
          type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Caf\u00e9 gratis"
          className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
        />
      </div>

      {/* Descripcion */}
      <div>
        <label htmlFor="mr-descripcion" className="block text-sm font-semibold text-slate-600 mb-1.5">Descripción</label>
        <textarea
          id="mr-descripcion"
          name="descripcion"
          value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción opcional..." rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors resize-none"
        />
      </div>

      {/* Puntos requeridos */}
      <div>
        <label htmlFor="mr-puntos" className="block text-sm font-semibold text-slate-600 mb-1.5">
          Puntos requeridos <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            id="mr-puntos"
            name="puntosRequeridos"
            type="number" min={1} value={puntos} onChange={(e) => setPuntos(e.target.value)}
            placeholder="150"
            className="w-full px-3.5 py-2.5 pr-16 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            pts
          </span>
        </div>
      </div>

      {/* Stock */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold text-slate-600">Stock disponible</p>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox" checked={stockIlimitado}
              name="stockIlimitado"
              onChange={(e) => setStockIlimitado(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-indigo-600"
            />
            <span className="text-xs text-slate-500">Ilimitado</span>
          </label>
        </div>
        <div className="relative">
          <input
            id="mr-stock"
            name="stock"
            type="number" min={0} value={stockIlimitado ? '' : stock}
            onChange={(e) => setStock(e.target.value)}
            disabled={stockIlimitado} placeholder="50"
            className="w-full px-3.5 py-2.5 pr-20 rounded-xl border-2 border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
            {stockIlimitado ? '\u221e' : 'unid'}
          </span>
        </div>
      </div>

      {/* Footer - Botones */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleCerrar}
          className="flex-1 py-2.5 rounded-xl border-2 border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={!valido || guardando || imagen.isUploading}
          className="flex-1 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {guardando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              {esEdicion ? 'Guardar cambios' : 'Crear recompensa'}
            </>
          )}
        </button>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Render adaptativo (ModalAdaptativo decide segun dispositivo)
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