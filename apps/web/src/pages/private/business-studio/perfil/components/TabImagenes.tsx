/**
 * ============================================================================
 * TAB: Imágenes (REFACTORIZADO CON ModalImagenes + Mejoras UX v2)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/TabImagenes.tsx
 * 
 * PROPÓSITO:
 * Tab para gestionar imágenes del negocio usando useOptimisticUpload
 * 
 * CARACTERÍSTICAS:
 * - Upload optimista con preview instantáneo
 * - Eliminación optimista con rollback
 * - Logo, Foto Perfil y Portada en una sola fila
 * - Galería con múltiples imágenes (navegación con flechas)
 * - Integración con Cloudinary + Backend
 * - ✅ Refactorizado para usar ModalImagenes universal
 * - ✅ Botones de eliminar al lado del botón de upload
 * - ✅ Tooltips informativos en botones de eliminar
 * - ✅ Textos de botones dinámicos (Subir/Cambiar según contexto)
 */

import { useEffect, useRef, useState } from 'react';
import { Image, Trash2, Plus, Loader2, Store, UserCircle, Images } from 'lucide-react';
import type { DatosImagenes, DatosInformacion } from '../hooks/usePerfil';
import { useOptimisticUpload } from '../../../../../hooks/useOptimisticUpload';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { api } from '../../../../../services/api';
import { notificar } from '../../../../../utils/notificaciones';
import { ModalImagenes } from '../../../../../components/ui';

interface TabImagenesProps {
  datosImagenes: DatosImagenes;
  setDatosImagenes: (datos: DatosImagenes) => void;
  esGerente: boolean;
  datosInformacion: DatosInformacion;
}

export default function TabImagenes({
  datosImagenes,
  setDatosImagenes,
  esGerente,
  datosInformacion,
}: TabImagenesProps) {

  const negocioId = useAuthStore((state) => state.usuario?.negocioId);
  const sucursalActiva = useAuthStore((state) => state.usuario?.sucursalActiva);

  // ✅ NUEVO: Estado unificado para ModalImagenes
  const [modalImagenes, setModalImagenes] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
  });

  // Ref para evitar duplicados - solo sincronizar al inicio
  const galeriaInicializada = useRef(false);

  // Cargar galería existente en el hook (SOLO al inicio)
  useEffect(() => {
    // Solo sincronizar si:
    // 1. No se ha inicializado antes
    // 2. Hay imágenes que cargar desde datosImagenes
    if (!galeriaInicializada.current && datosImagenes.galeria && datosImagenes.galeria.length > 0) {
      const urls = datosImagenes.galeria.map(img => img.url);
      galeria.setImages?.(urls);
      galeriaInicializada.current = true;
    }
  }, [datosImagenes.galeria]);

  // ==========================================================================
  // HOOKS DE UPLOAD OPTIMISTA
  // ==========================================================================

  // Logo del negocio
  const logo = useOptimisticUpload({
    carpeta: 'logos',
    onSuccess: async (url) => {
      if (!url || typeof url !== 'string') return;
      if (!negocioId) return;

      try {
        await api.post(`/negocios/${negocioId}/logo`, { logoUrl: url });
        setDatosImagenes({ ...datosImagenes, logoUrl: url });
        notificar.exito('Logo guardado correctamente');
      } catch (error) {
        console.error('Error al guardar logo en BD:', error);
        notificar.error('Error al guardar logo');
      }
    },
    onError: (error) => {
      notificar.error(error.message);
    }
  });

  // Foto de perfil de la sucursal
  const fotoPerfil = useOptimisticUpload({
    carpeta: 'perfiles',
    onSuccess: async (url) => {
      if (!url || typeof url !== 'string') return;
      if (!sucursalActiva) return;

      try {
        await api.post(`/negocios/sucursal/${sucursalActiva}/foto-perfil`, {
          fotoPerfilUrl: url
        });
        setDatosImagenes({ ...datosImagenes, fotoPerfilUrl: url });
        notificar.exito('Foto de perfil guardada');
      } catch (error) {
        console.error('Error al guardar foto de perfil en BD:', error);
        notificar.error('Error al guardar foto de perfil');
      }
    },
    onError: (error) => {
      notificar.error(error.message);
    }
  });

  // Portada de la sucursal
  const portada = useOptimisticUpload({
    carpeta: 'portadas',
    onSuccess: async (url) => {
      if (!url || typeof url !== 'string') return;
      if (!negocioId) return;  // ← negocioId, NO sucursalActiva

      try {
        await api.post(`/negocios/${negocioId}/portada`, { portadaUrl: url });  // ← negocioId
        setDatosImagenes({ ...datosImagenes, portadaUrl: url });
        notificar.exito('Portada guardada correctamente');
      } catch (error) {
        console.error('Error al guardar portada en BD:', error);
        notificar.error('Error al guardar portada');
      }
    },
    onError: (error) => {
      notificar.error(error.message);
    }
  });

  // ==========================================================================
  // GALERÍA - Estado y funciones
  // ==========================================================================

  // Galería de la sucursal (modo múltiple)
  const galeria = useOptimisticUpload({
    carpeta: 'galeria',
    multiple: true,
    maxImages: 10,
    onSuccess: async (imagenes) => {
      if (!negocioId || !Array.isArray(imagenes)) return;

      try {
        const response = await api.post(`/negocios/${negocioId}/galeria`, {
          imagenes: imagenes
        });

        // Actualizar datosImagenes con IDs de BD
        setDatosImagenes({
          ...datosImagenes,
          galeria: [...(datosImagenes.galeria || []), ...response.data.data]
        });

        const cantidad = imagenes.length;
        notificar.exito(`${cantidad} imagen${cantidad > 1 ? 'es' : ''} subida${cantidad > 1 ? 's' : ''}`);
      } catch (error) {
        console.error('Error al guardar galería en BD:', error);
        notificar.error('Error al guardar galería');
      }
    },
    onDelete: async (url) => {
      if (!negocioId) return;

      // Buscar el ID de la imagen por URL
      const imagen = datosImagenes.galeria?.find(img => img.url === url);

      if (imagen?.id) {
        try {
          await api.delete(`/negocios/${negocioId}/galeria/${imagen.id}`);
          notificar.exito('Imagen eliminada');
        } catch (error) {
          console.error('Error al eliminar de BD:', error);
          notificar.error('Error al eliminar imagen');
          // El hook ya hace rollback automático si hay error
        }
      }
    },
    onError: (error) => {
      notificar.error(error.message);
    }
  });

  // ==========================================================================
  // HANDLERS DE ELIMINACIÓN
  // ==========================================================================

  const handleEliminarLogo = async () => {
    if (!logo.cloudinaryUrl && !datosImagenes.logoUrl) return;

    const urlAnterior = datosImagenes.logoUrl;

    // OPTIMISTA
    setDatosImagenes({ ...datosImagenes, logoUrl: null });

    try {
      const exito = await logo.deleteImage();

      if (exito && negocioId) {
        await api.delete(`/negocios/${negocioId}/logo`);
        notificar.exito('Logo eliminado');
      } else {
        setDatosImagenes({ ...datosImagenes, logoUrl: urlAnterior });
      }
    } catch (error) {
      setDatosImagenes({ ...datosImagenes, logoUrl: urlAnterior });
      console.error('Error al eliminar logo:', error);
      notificar.error('Error al eliminar logo');
    }
  };

  const handleEliminarFotoPerfil = async () => {
    if (!fotoPerfil.cloudinaryUrl && !datosImagenes.fotoPerfilUrl) return;

    const urlAnterior = datosImagenes.fotoPerfilUrl;

    // OPTIMISTA
    setDatosImagenes({ ...datosImagenes, fotoPerfilUrl: null });

    try {
      const exito = await fotoPerfil.deleteImage();

      if (exito && sucursalActiva) {
        await api.delete(`/negocios/sucursal/${sucursalActiva}/foto-perfil`);
        notificar.exito('Foto de perfil eliminada');
      } else {
        setDatosImagenes({ ...datosImagenes, fotoPerfilUrl: urlAnterior });
      }
    } catch (error) {
      setDatosImagenes({ ...datosImagenes, fotoPerfilUrl: urlAnterior });
      console.error('Error al eliminar foto de perfil:', error);
      notificar.error('Error al eliminar foto de perfil');
    }
  };

  const handleEliminarPortada = async () => {
    if (!portada.cloudinaryUrl && !datosImagenes.portadaUrl) return;

    // Guardar URL anterior por si hay que revertir
    const urlAnterior = datosImagenes.portadaUrl;

    // 1. ACTUALIZAR UI INMEDIATAMENTE (OPTIMISTA)
    setDatosImagenes({ ...datosImagenes, portadaUrl: null });

    try {
      const exito = await portada.deleteImage();

      if (exito && negocioId) {
        await api.delete(`/negocios/${negocioId}/portada`);
        notificar.exito('Portada eliminada');
      } else {
        // Revertir si falla deleteImage
        setDatosImagenes({ ...datosImagenes, portadaUrl: urlAnterior });
      }
    } catch (error) {
      // Revertir en caso de error
      setDatosImagenes({ ...datosImagenes, portadaUrl: urlAnterior });
      console.error('Error al eliminar portada:', error);
      notificar.error('Error al eliminar portada');
    }
  };

  // ==========================================================================
  // HANDLERS PARA MODAL DE IMÁGENES
  // ==========================================================================

  const abrirImagenUnica = (url: string) => {
    setModalImagenes({
      isOpen: true,
      images: [url],
      initialIndex: 0,
    });
  };

  const abrirGaleria = (indice: number) => {
    const urls = galeria.images || [];
    setModalImagenes({
      isOpen: true,
      images: urls,
      initialIndex: indice,
    });
  };

  const cerrarModalImagenes = () => {
    setModalImagenes({
      isOpen: false,
      images: [],
      initialIndex: 0,
    });
  };

  // ==========================================================================
  // SINCRONIZAR ESTADOS CON datosImagenes
  // ==========================================================================

  // Sincronizar logo
  if (datosImagenes.logoUrl && !logo.imageUrl) {
    logo.setImageUrl(datosImagenes.logoUrl);
    logo.setCloudinaryUrl(datosImagenes.logoUrl);
    logo.setIsLocal(false);
  }

  // Sincronizar foto perfil
  if (datosImagenes.fotoPerfilUrl && !fotoPerfil.imageUrl) {
    fotoPerfil.setImageUrl(datosImagenes.fotoPerfilUrl);
    fotoPerfil.setCloudinaryUrl(datosImagenes.fotoPerfilUrl);
    fotoPerfil.setIsLocal(false);
  }

  // Sincronizar portada
  if (datosImagenes.portadaUrl && !portada.imageUrl) {
    portada.setImageUrl(datosImagenes.portadaUrl);
    portada.setCloudinaryUrl(datosImagenes.portadaUrl);
    portada.setIsLocal(false);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="space-y-6 lg:space-y-4 2xl:space-y-6">

      {/* PRIMERA FILA: Logo + Foto Perfil + Portada */}
      <div className={`grid grid-cols-1 ${(esGerente || (datosInformacion.totalSucursales > 1 && !datosInformacion.esPrincipal)) ? 'lg:grid-cols-[auto_1fr]' : 'lg:grid-cols-[auto_auto_1fr]'} items-start gap-5 lg:gap-4 2xl:gap-[60px]`}>

        {/* Logo - Solo dueños en sucursal principal o con 1 sucursal */}
        {!esGerente && (datosInformacion.totalSucursales === 1 || datosInformacion.esPrincipal) && (
          <div className="shrink-0">
            <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-800 mb-2 lg:mb-1.5 2xl:mb-2">
              <Store className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
              Logo del Negocio
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-20 h-20 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20 bg-white rounded-xl border-2 border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {logo.imageUrl ? (
                  <img
                    src={logo.imageUrl}
                    alt="Logo"
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => abrirImagenUnica(logo.imageUrl!)}
                  />
                ) : (
                  <Image className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="h-10 lg:h-9 2xl:h-10 px-3 lg:px-2.5 2xl:px-3 flex items-center text-xs font-bold text-blue-600 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-all shadow-sm cursor-pointer whitespace-nowrap">
                  {logo.imageUrl ? 'Cambiar Logo' : 'Subir Logo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) logo.uploadImage(file);
                    }}
                    disabled={logo.isUploading}
                    className="hidden"
                  />
                </label>
                {logo.imageUrl && (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={handleEliminarLogo}
                      disabled={logo.isUploading}
                      className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Eliminar Logo
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">PNG o JPG (máx. 2MB)</p>
            {logo.isUploading && (
              <p className="text-xs text-blue-600 font-semibold mt-1">Subiendo...</p>
            )}
          </div>
        )}

        {/* Foto Perfil */}
        <div className="shrink-0">
          <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-800 mb-2 lg:mb-1.5 2xl:mb-2">
            <UserCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
            Foto de Perfil <span className="font-normal text-slate-600 text-sm">(ChatYA/Avatar)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-20 h-20 lg:w-16 lg:h-16 2xl:w-20 2xl:h-20 bg-linear-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg shrink-0 overflow-hidden">
              {fotoPerfil.imageUrl ? (
                <img
                  src={fotoPerfil.imageUrl}
                  alt="Perfil"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => abrirImagenUnica(fotoPerfil.imageUrl!)}
                />
              ) : (
                'N'
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="h-10 lg:h-9 2xl:h-10 px-3 lg:px-2.5 2xl:px-3 flex items-center text-xs font-bold text-blue-600 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-all shadow-sm cursor-pointer whitespace-nowrap">
                {fotoPerfil.imageUrl ? 'Cambiar Foto' : 'Subir Foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) fotoPerfil.uploadImage(file);
                  }}
                  disabled={fotoPerfil.isUploading}
                  className="hidden"
                />
              </label>
              {fotoPerfil.imageUrl && (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleEliminarFotoPerfil}
                    disabled={fotoPerfil.isUploading}
                    className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Eliminar Foto de Perfil
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">PNG o JPG (máx. 2MB)</p>
          {fotoPerfil.isUploading && (
            <p className="text-xs text-blue-600 font-semibold mt-1">Subiendo...</p>
          )}
        </div>

        {/* Portada */}
        <div className="lg:col-span-1 shrink-0">
          <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-800 mb-2 lg:mb-1.5 2xl:mb-2">
            <Image className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
            Imagen de Portada
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full lg:w-48 2xl:w-80 h-24 lg:h-20 2xl:h-24 bg-white rounded-xl border-2 border-slate-300 flex items-center justify-center overflow-hidden shadow-sm">
              {portada.imageUrl ? (
                <img
                  src={portada.imageUrl}
                  alt="Portada"
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => abrirImagenUnica(portada.imageUrl!)}
                />
              ) : (
                <Image className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="h-10 lg:h-9 2xl:h-10 px-3 lg:px-2.5 2xl:px-3 flex items-center text-xs font-bold text-blue-600 bg-blue-50 border-2 border-blue-300 rounded-lg hover:bg-blue-100 transition-all shadow-sm cursor-pointer whitespace-nowrap">
                {portada.imageUrl ? 'Cambiar Portada' : 'Subir Portada'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) portada.uploadImage(file);
                  }}
                  disabled={portada.isUploading}
                  className="hidden"
                />
              </label>
              {portada.imageUrl && (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={handleEliminarPortada}
                    disabled={portada.isUploading}
                    className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-sm disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Eliminar Portada
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">PNG o JPG (máx. 2MB) · 1600×900px</p>
          {portada.isUploading && (
            <p className="text-xs text-blue-600 font-semibold mt-1">Subiendo...</p>
          )}
        </div>
      </div>

      {/* GALERÍA */}
      <div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center lg:justify-between gap-2 lg:gap-0 mb-4">
          <div>
            <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-800">
              <Images className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
              Galería de Fotos
            </div>
            <p className="text-sm text-slate-600 mt-1">Máximo 10 imágenes · 1200x1200px recomendado</p>
          </div>
          <span className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300">
            {galeria.images?.length || 0}/10
          </span>
        </div>

        <div className="grid grid-cols-4 lg:grid-cols-6 gap-3 lg:gap-2 2xl:gap-3">
          {/* Imágenes existentes */}
          {galeria.images?.map((url, index) => (
            <div
              key={`galeria-${index}`}
              className="relative aspect-square bg-white rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm"
            >
              <img
                src={url}
                alt={`Galería ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => abrirGaleria(index)}
              />
              {/* Botón eliminar - Siempre visible en esquina superior derecha */}
              <button
                type="button"
                onClick={() => galeria.deleteImageAt?.(index)}
                className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Botón agregar */}
          {galeria.canAddMore && (
            <label className="aspect-square bg-slate-50 hover:bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm group">
              <Plus className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-2" />
              <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Agregar</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    galeria.uploadImages?.(files);
                  }
                  e.target.value = '';
                }}
                disabled={galeria.isUploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {galeria.isUploading && (
          <p className="text-sm text-blue-600 font-semibold mt-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Subiendo imágenes...
          </p>
        )}
      </div>

      {/* ✅ NUEVO: Modal Universal de Imágenes */}
      <ModalImagenes
        images={modalImagenes.images}
        initialIndex={modalImagenes.initialIndex}
        isOpen={modalImagenes.isOpen}
        onClose={cerrarModalImagenes}
      />

    </div>
  );
}