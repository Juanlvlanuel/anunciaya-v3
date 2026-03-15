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
import { Image, Trash2, Plus, Loader2, Store, UserCircle, Images, Camera } from 'lucide-react';
import type { DatosImagenes, DatosInformacion } from '../hooks/usePerfil';
import { useOptimisticUpload } from '../../../../../hooks/useOptimisticUpload';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { api } from '../../../../../services/api';
import { notificar } from '../../../../../utils/notificaciones';
import { ModalImagenes, ModalBottom } from '../../../../../components/ui';
import Tooltip from '../../../../../components/ui/Tooltip';

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

  // Menú de cámara móvil (galería vs tomar foto)
  const [menuCamara, setMenuCamara] = useState<{ onFile: (f: File) => void } | null>(null);

  const abrirMenuCamara = (onFile: (f: File) => void) => setMenuCamara({ onFile });

  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && menuCamara) menuCamara.onFile(f);
    setMenuCamara(null);
    e.target.value = '';
  };

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

  // Helper: bloque de imagen individual (logo / perfil / portada)
  const BloquImagen = ({
    titulo, subtitulo, children, onUpload, onDelete, isUploading, imageUrl, disabled,
    labelSubir, labelCambiar, expandPreview,
  }: {
    titulo: React.ReactNode; subtitulo?: string;
    children: React.ReactNode;
    onUpload: (file: File) => void; onDelete: () => void;
    isUploading: boolean; imageUrl: string | null | undefined;
    disabled?: boolean; labelSubir: string; labelCambiar: string;
    expandPreview?: boolean;
  }) => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 whitespace-nowrap">
        {titulo}
        {subtitulo && <span className="font-medium text-slate-500">{subtitulo}</span>}
      </div>
      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className={expandPreview ? 'flex-1 min-w-0' : 'shrink-0'}>{children}</div>
        {/* Botones */}
        <div className="flex flex-col gap-1.5 pt-1 shrink-0">
          <Tooltip text={imageUrl ? labelCambiar : labelSubir} position="bottom" className="2xl:hidden">
            <label className={`h-9 lg:h-8 2xl:h-9 lg:w-8 2xl:w-auto px-3 lg:px-0 2xl:px-3 flex items-center justify-center gap-1.5 text-sm lg:text-xs 2xl:text-sm font-bold text-blue-600 bg-blue-100 border-2 border-blue-300 rounded-lg hover:bg-blue-200 cursor-pointer whitespace-nowrap ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span className="lg:hidden 2xl:inline">{imageUrl ? 'Cambiar' : 'Subir'}</span>
              <input type="file" accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
                disabled={isUploading || disabled} className="hidden" />
            </label>
          </Tooltip>
          {imageUrl && (
            <Tooltip text="Eliminar" position="bottom" className="2xl:hidden">
              <button type="button" onClick={onDelete} disabled={isUploading}
                className="h-9 lg:h-8 2xl:h-9 lg:w-8 2xl:w-auto px-3 lg:px-0 2xl:px-3 flex items-center justify-center gap-1.5 text-sm lg:text-xs 2xl:text-sm font-bold text-red-600 bg-red-50 border-2 border-red-200 rounded-lg hover:bg-red-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <Trash2 className="w-3.5 h-3.5" />
                <span className="lg:hidden 2xl:inline">Eliminar</span>
              </button>
            </Tooltip>
          )}
          {isUploading && (
            <span className="flex items-center gap-1.5 text-sm lg:text-xs 2xl:text-sm text-blue-600 font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const mostrarLogo = !esGerente && (datosInformacion.totalSucursales === 1 || datosInformacion.esPrincipal);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3 2xl:gap-4 lg:items-start">

      {/* ================================================================ */}
      {/* CARD: IMÁGENES PRINCIPALES */}
      {/* ================================================================ */}

      <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-0.5 lg:gap-2.5"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <div className="flex items-center gap-2.5">
            <Image className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-300 shrink-0" />
            <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Imágenes Principales</span>
          </div>
          <span className="text-xs lg:text-xs 2xl:text-sm text-white/70 font-medium lg:ml-auto">PNG o JPG · máx. 2MB</span>
        </div>

        <div className="p-4 lg:p-3 2xl:p-4">

          {/* ---- MÓVIL ---- */}
          <div className="lg:hidden space-y-4">

            {/* Fila 1: Logo + Foto Perfil */}
            <div className={`grid gap-4 ${mostrarLogo ? 'grid-cols-2' : 'grid-cols-1 max-w-[180px]'}`}>

              {/* Logo */}
              {mostrarLogo && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-blue-600 shrink-0" /> Logo
                  </span>
                  <div className="relative w-full aspect-square bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-sm">
                    {logo.imageUrl
                      ? <img src={logo.imageUrl} alt="Logo" className="w-full h-full object-cover cursor-pointer" onClick={() => abrirImagenUnica(logo.imageUrl!)} />
                      : <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-slate-300" /></div>
                    }
                    <div className="absolute bottom-0 inset-x-0 flex items-center justify-end gap-2.5 py-2.5 px-3"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                      <button type="button" onClick={() => !logo.isUploading && abrirMenuCamara((f) => logo.uploadImage(f))}
                        disabled={logo.isUploading}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95 disabled:opacity-50">
                        {logo.isUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                      </button>
                      {logo.imageUrl && (
                        <button type="button" onClick={handleEliminarLogo} disabled={logo.isUploading}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95 disabled:opacity-50">
                          <Trash2 className="w-5 h-5 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Foto Perfil */}
              <div className="flex flex-col gap-1.5 items-center">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <UserCircle className="w-4 h-4 text-blue-600 shrink-0" /> Foto Perfil
                </span>
                <div className="relative w-full aspect-square bg-linear-to-br from-orange-400 to-amber-500 rounded-full overflow-hidden shadow-lg">
                  {fotoPerfil.imageUrl
                    ? <img src={fotoPerfil.imageUrl} alt="Perfil" className="w-full h-full object-cover cursor-pointer" onClick={() => abrirImagenUnica(fotoPerfil.imageUrl!)} />
                    : <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">N</div>
                  }
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2.5 py-2.5 px-3"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                    <button type="button" onClick={() => !fotoPerfil.isUploading && abrirMenuCamara((f) => fotoPerfil.uploadImage(f))}
                      disabled={fotoPerfil.isUploading}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95 disabled:opacity-50">
                      {fotoPerfil.isUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                    </button>
                    {fotoPerfil.imageUrl && (
                      <button type="button" onClick={handleEliminarFotoPerfil} disabled={fotoPerfil.isUploading}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95 disabled:opacity-50">
                        <Trash2 className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Fila 2: Portada */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <Image className="w-4 h-4 text-blue-600 shrink-0" /> Imagen de Portada
                <span className="font-medium text-slate-500">1600×900px</span>
              </span>
              <div className="relative w-full aspect-video bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-sm">
                {portada.imageUrl
                  ? <img src={portada.imageUrl} alt="Portada" className="w-full h-full object-cover cursor-pointer" onClick={() => abrirImagenUnica(portada.imageUrl!)} />
                  : <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-slate-300" /></div>
                }
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-end gap-2.5 py-2.5 px-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                  <button type="button" onClick={() => !portada.isUploading && abrirMenuCamara((f) => portada.uploadImage(f))}
                    disabled={portada.isUploading}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95 disabled:opacity-50">
                    {portada.isUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                  </button>
                  {portada.imageUrl && (
                    <button type="button" onClick={handleEliminarPortada} disabled={portada.isUploading}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95 disabled:opacity-50">
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ---- DESKTOP ---- */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-6 lg:gap-4 2xl:gap-6">

            {/* Logo */}
            {mostrarLogo && (
              <BloquImagen
                titulo={<><Store className="w-4 h-4 text-blue-600 shrink-0" /> Logo del Negocio</>}
                imageUrl={logo.imageUrl} isUploading={logo.isUploading}
                onUpload={(f) => logo.uploadImage(f)} onDelete={handleEliminarLogo}
                labelSubir="Subir Logo" labelCambiar="Cambiar Logo"
              >
                <div className="w-20 h-20 lg:w-28 lg:h-28 2xl:w-32 2xl:h-32 bg-white rounded-xl border-2 border-slate-300 flex items-center justify-center overflow-hidden shadow-sm cursor-pointer group"
                  onClick={() => logo.imageUrl && abrirImagenUnica(logo.imageUrl)}>
                  {logo.imageUrl
                    ? <img src={logo.imageUrl} alt="Logo" className="w-full h-full object-cover lg:transition-transform lg:duration-300 lg:group-hover:scale-110" />
                    : <Image className="w-7 h-7 text-slate-300" />
                  }
                </div>
              </BloquImagen>
            )}

            {/* Foto Perfil */}
            <BloquImagen
              titulo={<><UserCircle className="w-4 h-4 text-blue-600 shrink-0" /> Foto de Perfil</>}
              imageUrl={fotoPerfil.imageUrl} isUploading={fotoPerfil.isUploading}
              onUpload={(f) => fotoPerfil.uploadImage(f)} onDelete={handleEliminarFotoPerfil}
              labelSubir="Subir Foto" labelCambiar="Cambiar Foto"
            >
              <div className="w-20 h-20 lg:w-28 lg:h-28 2xl:w-32 2xl:h-32 bg-linear-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden cursor-pointer group"
                onClick={() => fotoPerfil.imageUrl && abrirImagenUnica(fotoPerfil.imageUrl)}>
                {fotoPerfil.imageUrl
                  ? <img src={fotoPerfil.imageUrl} alt="Perfil" className="w-full h-full object-cover lg:transition-transform lg:duration-300 lg:group-hover:scale-110" />
                  : 'N'
                }
              </div>
            </BloquImagen>

            {/* Portada */}
            <div className={mostrarLogo ? 'lg:col-span-2' : ''}>
              <BloquImagen
                titulo={<><Image className="w-4 h-4 text-blue-600 shrink-0" /> Imagen de Portada</>}
                subtitulo="1600×900px"
                imageUrl={portada.imageUrl} isUploading={portada.isUploading}
                onUpload={(f) => portada.uploadImage(f)} onDelete={handleEliminarPortada}
                labelSubir="Subir Portada" labelCambiar="Cambiar Portada"
                expandPreview={mostrarLogo}
              >
                <div className={`bg-white rounded-xl border-2 border-slate-300 flex items-center justify-center overflow-hidden shadow-sm cursor-pointer group w-36 h-20 ${mostrarLogo ? 'lg:w-full lg:h-28 2xl:h-32' : 'lg:w-28 lg:h-16 2xl:w-36 2xl:h-20'}`}
                  onClick={() => portada.imageUrl && abrirImagenUnica(portada.imageUrl)}>
                  {portada.imageUrl
                    ? <img src={portada.imageUrl} alt="Portada" className="w-full h-full object-cover lg:transition-transform lg:duration-300 lg:group-hover:scale-110" />
                    : <Image className="w-7 h-7 text-slate-300" />
                  }
                </div>
              </BloquImagen>
            </div>

          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* CARD: GALERÍA */}
      {/* ================================================================ */}

      <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2.5"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <Images className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-300 shrink-0" />
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Galería de Fotos</span>
          <div className="ml-auto flex items-center gap-2.5">
            <span className={`text-sm lg:text-xs 2xl:text-sm font-bold ${(galeria.images?.length || 0) >= 10 ? 'text-red-400' : 'text-white/70'}`}>
              {galeria.images?.length || 0}/10
            </span>
            <label className={`w-7 h-7 flex items-center justify-center rounded-lg transition-opacity cursor-pointer ${galeria.canAddMore ? 'bg-white/15 hover:bg-white/25 opacity-100' : 'opacity-30 cursor-not-allowed pointer-events-none'}`}>
              <Plus className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" multiple
                onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) galeria.uploadImages?.(files); e.target.value = ''; }}
                disabled={!galeria.canAddMore || galeria.isUploading} className="hidden" />
            </label>
          </div>
        </div>

        <div className="p-4 lg:p-3 2xl:p-4">
          <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium mb-3">
            1200×1200px recomendado · Haz clic en una imagen para verla completa
          </p>

          {/* ---- GALERÍA MÓVIL: carrusel 2×2 ---- */}
          {(() => {
            const items = [...(galeria.images || [])];
            const paginas: string[][] = [];
            for (let i = 0; i < items.length; i += 4) paginas.push(items.slice(i, i + 4));

            return (
              <div className="lg:hidden overflow-x-auto perfil-kpi-scroll" style={{ scrollSnapType: 'x mandatory' }}>
                <div className="flex gap-2">
                  {paginas.map((pagina, pi) => (
                    <div key={pi} className="grid grid-cols-2 gap-2 shrink-0 w-full" style={{ scrollSnapAlign: 'start' }}>
                      {pagina.map((item, ii) => {
                        const index = pi * 4 + ii;
                        const estaSubiendo = item.startsWith('blob:');
                        return (
                          <div key={index} className="relative aspect-square bg-white rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm">
                            <img src={item} alt={`Galería ${index + 1}`}
                              className={`w-full h-full object-cover ${estaSubiendo ? 'blur-sm scale-105' : 'cursor-pointer'}`}
                              onClick={() => !estaSubiendo && abrirGaleria(index)} />
                            {estaSubiendo ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                                <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                              </div>
                            ) : (
                              <div className="absolute bottom-0 inset-x-0 flex items-center justify-end gap-2.5 py-2.5 px-3"
                                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                                <button type="button" onClick={() => !galeria.isUploading && abrirMenuCamara((f) => galeria.uploadImages?.([f]))}
                                  disabled={galeria.isUploading}
                                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95 disabled:opacity-50">
                                  <Camera className="w-5 h-5 text-white" />
                                </button>
                                <button type="button" onClick={() => galeria.deleteImageAt?.(index)}
                                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95">
                                  <Trash2 className="w-5 h-5 text-white" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ---- GALERÍA DESKTOP ---- */}
          <div className="hidden lg:grid lg:grid-cols-3 2xl:grid-cols-3 gap-2 2xl:gap-2.5">

            {galeria.images?.map((url, index) => {
              const estaSubiendo = url.startsWith('blob:');
              return (
                <div key={`galeria-${index}`}
                  className="relative aspect-4/3 bg-white rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm group">
                  <img src={url} alt={`Galería ${index + 1}`}
                    className={`w-full h-full object-cover lg:transition-transform lg:duration-300 lg:group-hover:scale-110 ${estaSubiendo ? 'blur-sm scale-105' : 'cursor-pointer'}`}
                    onClick={() => !estaSubiendo && abrirGaleria(index)} />
                  {estaSubiendo ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                    </div>
                  ) : (
                    <button type="button" onClick={() => galeria.deleteImageAt?.(index)}
                      className="absolute top-1.5 right-1.5 p-1.5 lg:p-1.5 2xl:p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                    </button>
                  )}
                </div>
              );
            })}


          </div>

        </div>
      </div>

      {/* ---- MENÚ CÁMARA MÓVIL ---- */}
      <ModalBottom
        abierto={menuCamara !== null}
        onCerrar={() => setMenuCamara(null)}
        mostrarHeader={false}
        sinScrollInterno
        alturaMaxima="sm"
        fondo="linear-gradient(135deg, #000000, #0f172a)"
        headerOscuro
      >
        <div className="px-4 pt-11 pb-4">
          <p className="text-center text-sm font-bold text-slate-400 mb-3">Seleccionar imagen</p>

          <label className="flex items-center gap-3 p-3.5 rounded-xl active:bg-white/10 cursor-pointer">
            <div className="w-11 h-11 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
              <Images className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Galería de fotos</p>
              <p className="text-sm text-slate-400 font-medium">Elegir desde tu dispositivo</p>
            </div>
            <input type="file" accept="image/*" onChange={handleArchivoSeleccionado} className="hidden" />
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl active:bg-white/10 cursor-pointer">
            <div className="w-11 h-11 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Tomar foto</p>
              <p className="text-sm text-slate-400 font-medium">Usar la cámara</p>
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={handleArchivoSeleccionado} className="hidden" />
          </label>

          <button type="button" onClick={() => setMenuCamara(null)}
            className="w-full mt-2 p-3.5 text-base font-bold text-slate-500 rounded-xl border-2 border-slate-800 active:bg-white/10 cursor-pointer">
            Cancelar
          </button>
        </div>
      </ModalBottom>

      <ModalImagenes
        images={modalImagenes.images}
        initialIndex={modalImagenes.initialIndex}
        isOpen={modalImagenes.isOpen}
        onClose={cerrarModalImagenes}
      />

    </div>
  );
}