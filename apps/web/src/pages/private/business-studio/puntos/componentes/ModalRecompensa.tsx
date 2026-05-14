/**
 * ModalRecompensa.tsx (v4.0 - Rediseño completo)
 * ================================================
 * Modal de crear / editar recompensa con upload a R2 via presigned URL.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/componentes/ModalRecompensa.tsx
 *
 * LAYOUT:
 *   Header gradiente dinámico (púrpura) + toggle activa
 *   Columna izquierda (40%): Imagen + Puntos + Stock
 *   Columna derecha  (60%): Nombre + Descripción + Botones
 *
 * PATRÓN: Mismo que ModalArticulo / ModalOferta (TC-6B)
 *
 * Exports:
 *   - DatosModalRecompensa (interface) → usada por PaginaPuntos para tipear onGuardar
 *   - ModalRecompensa (default)        → componente
 */

import { useState, useEffect } from 'react';
import { ImagePlus, Trash2, Loader2, Repeat } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Gift = (p: IconoWrapperProps) => <Icon icon={ICONOS.recompensa} {...p} />;
import { useR2Upload } from '../../../../../hooks/useR2Upload';
import { generarUrlUploadImagenRecompensa } from '../../../../../services/puntosService';
import { ModalAdaptativo } from '../../../../../components/ui/ModalAdaptativo';
import { Spinner } from '../../../../../components/ui/Spinner';
import Tooltip from '../../../../../components/ui/Tooltip';
import { notificar } from '../../../../../utils/notificaciones';
import type { Recompensa } from '../../../../../types/puntos';

// =============================================================================
// TIPOS EXPORTADOS
// =============================================================================

/** Datos que sale del modal hacia el padre (crear / editar recompensa) */
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
  tipo?: 'basica' | 'compras_frecuentes';
  numeroComprasRequeridas?: number | null;
  requierePuntos?: boolean;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const GRADIENTE_PUNTOS = {
  bg: 'linear-gradient(135deg, #1e40af, #2563eb)',
  shadow: 'rgba(37,99,235,0.4)',
  handle: 'rgba(255,255,255,0.4)',
};

const GRADIENTE_COMPRAS = {
  bg: 'linear-gradient(135deg, #b45309, #d97706)',
  shadow: 'rgba(180,83,9,0.4)',
  handle: 'rgba(255,255,255,0.4)',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export default function ModalRecompensa({
  abierto,
  onCerrar,
  recompensa,
  onGuardar,
  tipoInicial = 'basica',
}: {
  abierto: boolean;
  onCerrar: () => void;
  recompensa: Recompensa | null;
  onGuardar: (datos: DatosModalRecompensa) => Promise<void>;
  tipoInicial?: 'basica' | 'compras_frecuentes';
}) {
  const imagen = useR2Upload({
    generarUrl: generarUrlUploadImagenRecompensa,
    onError: (error) => { notificar.error(`Error al subir imagen: ${error.message}`); },
  });

  const [nombre, setNombre] = useState(recompensa?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(recompensa?.descripcion ?? '');
  const [puntos, setPuntos] = useState<string>(recompensa?.puntosRequeridos?.toString() ?? '');
  const [stockIlimitado, setStockIlimitado] = useState(recompensa?.stock === null);
  const [stock, setStock] = useState<string>(recompensa?.stock?.toString() ?? '');
  const [activa, setActiva] = useState(recompensa?.activa ?? true);
  const [imagenEliminada, setImagenEliminada] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const recompensaExtendida = recompensa as unknown as Record<string, unknown> | null;
  const [tipoRecompensa] = useState<'basica' | 'compras_frecuentes'>(
    recompensaExtendida?.tipo === 'compras_frecuentes' ? 'compras_frecuentes' : tipoInicial
  );
  const [comprasRequeridas, setComprasRequeridas] = useState<string>(
    recompensaExtendida?.numeroComprasRequeridas?.toString() ?? ''
  );

  const imagenOriginal = recompensa?.imagenUrl ?? null;
  const esEdicion = !!recompensa;

  // Sincronizar imagen al montar en modo edición
  useEffect(() => {
    if (imagenOriginal) {
      imagen.setImageUrl(imagenOriginal);
      imagen.setR2Url(imagenOriginal);
    }
  }, []);

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

  if (!abierto) return null;

  const stockValido = stockIlimitado || (stock.length > 0 && Number(stock) > 0);
  const esComprasFrecuentes = tipoRecompensa === 'compras_frecuentes';
  const puntosValidos = esComprasFrecuentes || (puntos.length > 0 && Number(puntos) > 0);
  const comprasValidas = !esComprasFrecuentes || (comprasRequeridas.length > 0 && Number(comprasRequeridas) >= 2);
  const valido = nombre.trim().length > 0 && puntosValidos && comprasValidas && stockValido;
  const gradiente = esComprasFrecuentes ? GRADIENTE_COMPRAS : GRADIENTE_PUNTOS;

  const handleEliminarImagen = () => {
    imagen.reset();
    setImagenEliminada(true);
  };

  const handleCerrar = () => {
    if (imagen.r2Url && imagen.r2Url !== imagenOriginal) {
      imagen.reset();
    }
    onCerrar();
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) imagen.uploadImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || guardando || imagen.isUploading) return;
    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        puntosRequeridos: esComprasFrecuentes ? 1 : Number(puntos),
        stock: stockIlimitado ? null : Number(stock),
        requiereAprobacion: false,
        imagenUrl: imagen.r2Url,
        ...(imagenEliminada && { eliminarImagen: true }),
        activa,
        tipo: tipoRecompensa,
        numeroComprasRequeridas: esComprasFrecuentes ? Number(comprasRequeridas) : null,
        requierePuntos: esComprasFrecuentes ? false : true,
      });
    } catch (error) {
      console.error('Error al guardar recompensa:', error);
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={handleCerrar}
      ancho="xl"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      alturaMaxima="xl"
      colorHandle={gradiente.handle}
      headerOscuro
      className="max-w-xs lg:max-w-2xl 2xl:max-w-3xl"
    >
      <div className="flex flex-col max-h-[93vh] lg:max-h-[90vh] 2xl:max-h-[90vh]">

        {/* ── Header dark gradiente ── */}
        <div
          className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
          style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
            {/* Ícono */}
            <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
              {esComprasFrecuentes
                ? <Repeat className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                : <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
              }
            </div>

            {/* Título + subtítulo */}
            <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                {esEdicion
                  ? (recompensa?.nombre || 'Editar recompensa')
                  : esComprasFrecuentes ? 'Nueva tarjeta de sellos' : 'Nueva recompensa'}
              </h3>
              <span className="text-sm lg:text-xs 2xl:text-sm text-white/70">
                {esEdicion
                  ? 'Editando recompensa'
                  : esComprasFrecuentes ? 'Compra N → siguiente GRATIS' : 'Canje por puntos'}
              </span>
            </div>

            {/* Toggle activa (solo edición) */}
            {esEdicion && (
              <Tooltip text={activa ? 'Desactivar' : 'Activar'} position="bottom" autoHide={2500}>
                <button
                  type="button"
                  onClick={() => setActiva(!activa)}
                  className={`p-2 lg:p-1.5 2xl:p-2 rounded-xl border-2 lg:cursor-pointer ${
                    activa
                      ? 'border-white/40 bg-white/20 hover:bg-white/30'
                      : 'border-white/20 bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Gift className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 ${activa ? 'text-white' : 'text-white/40'}`} />
                </button>
              </Tooltip>
            )}
          </div>

        </div>

        {/* ── Body scrolleable ── */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:h-full">

            {/* ── Columna Izquierda: Imagen + Puntos + Stock ── */}
            <div className="lg:w-2/5 px-3 pt-3 pb-1 lg:p-2 2xl:p-5 lg:border-r-2 border-slate-300 bg-slate-50 flex flex-col gap-3 lg:gap-2.5 2xl:gap-4">

              {/* === MÓVIL: fila imagen + controles === */}
              <div className="flex gap-2.5 lg:hidden">
                {/* Imagen pequeña */}
                <div className="w-36 shrink-0 rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative" style={{ aspectRatio: '1/1' }}>
                  {imagen.imageUrl ? (
                    <>
                      <img src={imagen.imageUrl} alt="Recompensa" className="w-full h-full object-cover" />
                      {imagen.isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white text-[10px] font-medium">Subiendo…</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleEliminarImagen}
                        className="absolute top-1.5 right-1.5 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200/50 gap-1">
                      <input type="file" accept="image/*" name="imagenRecompensa" onChange={handleImagenChange} className="sr-only" />
                      <ImagePlus className="w-7 h-7 text-slate-600" />
                      <span className="text-sm font-semibold text-slate-600">Imagen</span>
                    </label>
                  )}
                </div>

                {/* Puntos o Compras + Stock (móvil) */}
                <div className="flex-1 flex flex-col gap-2">
                  {esComprasFrecuentes ? (
                    /* Compras requeridas (móvil) */
                    <div>
                      <label htmlFor="mr-compras-m" className="block text-sm font-bold text-amber-800 mb-1.5">
                        Compras para desbloquear <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="mr-compras-m"
                          type="number"
                          min={2}
                          max={1000}
                          value={comprasRequeridas}
                          onChange={(e) => setComprasRequeridas(e.target.value)}
                          placeholder="Ej: 5"
                          className="w-full h-11 px-4 pr-14 bg-amber-50 border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-base font-bold text-slate-800 placeholder:text-slate-500 cursor-text [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                          style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-linear-to-r from-amber-600 to-amber-700 text-white text-[11px] font-bold rounded-md shadow-sm pointer-events-none">
                          N+1
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Puntos requeridos (móvil) */
                    <div>
                      <label htmlFor="mr-puntos-m" className="block text-sm font-bold text-slate-700 mb-1.5">
                        Puntos requeridos <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="mr-puntos-m"
                          type="number"
                          min={1}
                          value={puntos}
                          onChange={(e) => setPuntos(e.target.value)}
                          placeholder="150"
                          className="w-full h-11 px-4 pr-14 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-base font-medium text-slate-800 placeholder:text-slate-500 cursor-text [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                          style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-linear-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold rounded-md shadow-sm pointer-events-none">
                          pts
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stock */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="mr-stock-m" className="text-sm font-bold text-slate-700">
                        Stock
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          id="mr-stock-ilimitado-movil"
                          name="stockIlimitadoMovil"
                          checked={stockIlimitado}
                          onChange={(e) => setStockIlimitado(e.target.checked)}
                          className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-blue-600">Ilimitado</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        id="mr-stock-m"
                        type="number"
                        min={0}
                        value={stockIlimitado ? '' : stock}
                        onChange={(e) => setStock(e.target.value)}
                        disabled={stockIlimitado}
                        placeholder="50"
                        className="w-full h-11 px-4 pr-14 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-base font-medium text-slate-800 placeholder:text-slate-500 disabled:bg-slate-200 disabled:text-slate-600 disabled:cursor-not-allowed cursor-text [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-slate-200 text-slate-700 text-[11px] font-bold rounded-md pointer-events-none">
                        {stockIlimitado ? '∞' : 'unid'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* === DESKTOP: Imagen grande === */}
              <div className="hidden lg:block">
                <div className="rounded-lg 2xl:rounded-xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 relative" style={{ aspectRatio: '4/3' }}>
                  {imagen.imageUrl ? (
                    <>
                      <img src={imagen.imageUrl} alt="Recompensa" className="w-full h-full object-cover" />
                      {imagen.isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 2xl:w-7 2xl:h-7 text-white animate-spin" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleEliminarImagen}
                        className="absolute top-1.5 right-1.5 2xl:top-2 2xl:right-2 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 lg:cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 2xl:w-5 2xl:h-5" />
                      </button>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center lg:cursor-pointer hover:bg-slate-200/50 gap-1.5 2xl:gap-2">
                      <input type="file" accept="image/*" name="imagenRecompensa" onChange={handleImagenChange} className="sr-only" />
                      <ImagePlus className="w-6 h-6 2xl:w-7 2xl:h-7 text-slate-600" />
                      <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-600">Subir imagen</span>
                      <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">PNG, JPG o WEBP</span>
                    </label>
                  )}
                </div>
              </div>

              {/* === DESKTOP: Puntos/Compras + Stock === */}
              <div className="hidden lg:flex flex-col gap-2.5 2xl:gap-4">
                {esComprasFrecuentes ? (
                  /* Compras requeridas (desktop) */
                  <div>
                    <label htmlFor="mr-compras" className="block text-sm lg:text-xs 2xl:text-sm font-bold text-amber-800 mb-1.5 lg:mb-1 2xl:mb-2">
                      Compras para desbloquear <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="mr-compras"
                        type="number"
                        min={2}
                        max={1000}
                        value={comprasRequeridas}
                        onChange={(e) => setComprasRequeridas(e.target.value)}
                        placeholder="Ej: 5"
                        className="w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 pr-14 lg:pr-12 2xl:pr-14 bg-amber-50 border-2 border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-base lg:text-sm 2xl:text-base font-bold text-slate-800 placeholder:text-slate-500 cursor-text [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                      />
                      <span className="absolute right-2.5 lg:right-1.5 2xl:right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 lg:px-1.5 2xl:px-2 bg-linear-to-r from-amber-600 to-amber-700 text-white text-[11px] font-bold rounded-md shadow-sm pointer-events-none">
                        N+1
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Puntos requeridos (desktop) */
                  <div>
                    <label htmlFor="mr-puntos" className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2">
                      Puntos requeridos <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="mr-puntos"
                        type="number"
                        min={1}
                        value={puntos}
                        onChange={(e) => setPuntos(e.target.value)}
                        placeholder="150"
                        className="w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 pr-14 lg:pr-12 2xl:pr-14 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 cursor-text [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                      />
                      <span className="absolute right-2.5 lg:right-1.5 2xl:right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 lg:px-1.5 2xl:px-2 bg-linear-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold rounded-md shadow-sm pointer-events-none">
                        pts
                      </span>
                    </div>
                  </div>
                )}

                {/* Stock */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 lg:mb-1 2xl:mb-2">
                    <label htmlFor="mr-stock" className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700">
                      Stock disponible
                    </label>
                    <label className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5 lg:cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={stockIlimitado}
                        name="stockIlimitado"
                        onChange={(e) => setStockIlimitado(e.target.checked)}
                        className="w-3.5 h-3.5 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 rounded accent-blue-600 lg:cursor-pointer"
                      />
                      <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 group-hover:text-blue-600">
                        Ilimitado
                      </span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="mr-stock"
                      type="number"
                      min={0}
                      value={stockIlimitado ? '' : stock}
                      onChange={(e) => setStock(e.target.value)}
                      disabled={stockIlimitado}
                      placeholder="50"
                      className={`w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 pr-14 lg:pr-12 2xl:pr-14 bg-slate-100 border-2 rounded-lg focus:outline-none focus:ring-2 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 disabled:bg-slate-200 disabled:text-slate-600 disabled:cursor-not-allowed cursor-text [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${
                        !stockIlimitado && ((stock.length > 0 && Number(stock) <= 0) || stock.length === 0)
                          ? 'border-red-400 focus:ring-red-500/10'
                          : 'border-slate-300 focus:ring-slate-500'
                      }`}
                      style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                    />
                    <span className="absolute right-2.5 lg:right-1.5 2xl:right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 lg:px-1.5 2xl:px-2 bg-slate-200 text-slate-700 text-[11px] font-bold rounded-md pointer-events-none">
                      {stockIlimitado ? '∞' : 'unid'}
                    </span>
                  </div>
                  {!stockIlimitado && stock.length > 0 && Number(stock) <= 0 && (
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-semibold mt-1">
                      El stock debe ser mayor a 0
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Columna Derecha: Nombre + Descripción + Botones ── */}
            <div className="lg:w-3/5 px-3 pt-0 pb-3 lg:px-2 lg:pt-1 lg:pb-2 2xl:px-5 2xl:pt-2 2xl:pb-5 flex flex-col">

              {/* Nombre */}
              <div className="mt-3 lg:mt-2 2xl:mt-3">
                <label htmlFor="mr-nombre" className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2">
                  Nombre de la recompensa <span className="text-red-500">*</span>
                </label>
                <input
                  id="mr-nombre"
                  name="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder={esComprasFrecuentes ? 'Ej: Café gratis, Pizza mediana...' : 'Ej: Café gratis, Descuento 20%...'}
                  className="w-full h-11 lg:h-10 2xl:h-11 px-4 lg:px-3 2xl:px-4 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 cursor-text"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                />
              </div>

              {/* Descripción */}
              <div className="mt-3 lg:mt-2 2xl:mt-3">
                <label htmlFor="mr-descripcion" className="block text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5 lg:mb-1 2xl:mb-2">
                  Descripción o condiciones <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">(opcional)</span>
                </label>
                <textarea
                  id="mr-descripcion"
                  name="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder={esComprasFrecuentes ? 'Ej: Compra 4 cafés y el 5to va por nuestra cuenta' : 'Describe los detalles de la recompensa...'}
                  rows={esComprasFrecuentes ? 3 : 7}
                  className="w-full px-3 py-2 lg:px-2.5 lg:py-1.5 2xl:px-3 2xl:py-2.5 bg-slate-100 border-2 border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 cursor-text"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                />
              </div>


              {/* Botones */}
              <div className="flex gap-3 2xl:gap-3 mt-4 mb-2 lg:mb-2 2xl:mb-0 lg:mt-auto 2xl:mt-auto">
                <button
                  type="button"
                  onClick={handleCerrar}
                  disabled={guardando}
                  className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 lg:cursor-pointer border-2 border-slate-400 text-slate-600 bg-transparent hover:bg-slate-200 hover:border-slate-500 active:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!valido || guardando || imagen.isUploading}
                  className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 lg:cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {guardando ? (
                    <>
                      <Spinner tamanio="sm" color="white" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{esEdicion ? 'Guardar cambios' : 'Crear recompensa'}</span>
                  )}
                </button>
              </div>
            </div>

          </form>
        </div>

      </div>
    </ModalAdaptativo>
  );
}
