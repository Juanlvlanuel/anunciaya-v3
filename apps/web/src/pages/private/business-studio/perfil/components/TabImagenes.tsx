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
import { useR2Upload } from '../../../../../hooks/useR2Upload';
import { useAuthStore } from '../../../../../stores/useAuthStore';
import { api } from '../../../../../services/api';
import { notificar } from '../../../../../utils/notificaciones';
import { eliminarImagenHuerfana } from '../../../../../services/r2Service';

// Helper: presigned URL para imágenes de negocios
async function generarUrlUploadNegocio(nombreArchivo: string, contentType: string, carpeta = 'negocios') {
  const response = await api.post('/negocios/upload-imagen', { nombreArchivo, contentType, carpeta });
  return response.data;
}
import { ModalImagenes, ModalBottom } from '../../../../../components/ui';
import Tooltip from '../../../../../components/ui/Tooltip';

// =============================================================================
// IMAGEN CON BLUR — Patrón 3 capas (blur → fade → nítida)
// =============================================================================

function ImagenConBlur({
  src, miniatura, className, onClick,
}: {
  src: string | null;
  miniatura: string | null;
  className?: string;
  onClick?: () => void;
}) {
  const [urlCargada, setUrlCargada] = useState<string | null>(null);
  const cargada = src !== null && src === urlCargada;
  const urlBlur = miniatura || src;

  return (
    <>
      {/* Capa 1: Blur (miniatura o src actual) */}
      {urlBlur && (
        <img src={urlBlur} alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'blur(8px)' }} />
      )}
      {/* Capa 2: Imagen real — fade-in al cargar */}
      {src && (
        <img src={src} alt=""
          className={`absolute inset-0 w-full h-full object-cover duration-500 ${cargada && onClick ? 'group-hover:scale-110 cursor-pointer' : ''} ${className || ''}`}
          style={{ opacity: cargada ? 1 : 0 }}
          onClick={() => cargada && onClick?.()}
          onLoad={() => setUrlCargada(src)} />
      )}
    </>
  );
}

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

  // Miniaturas para blur (blob URLs independientes del hook)
  const [logoMiniatura, setLogoMiniatura] = useState<string | null>(null);
  const [fotoPerfilMiniatura, setFotoPerfilMiniatura] = useState<string | null>(null);
  const [portadaMiniatura, setPortadaMiniatura] = useState<string | null>(null);

  // Galería: previews durante upload y mapa de miniaturas para transición
  const [galeriaSubiendo, setGaleriaSubiendo] = useState<{ tempId: string; blobUrl: string }[]>([]);
  const [miniaturasGaleria, setMiniaturasGaleria] = useState<Record<string, string>>({});

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
      setGaleriaUrls(datosImagenes.galeria.map(img => img.url));
      galeriaInicializada.current = true;
    }
  }, [datosImagenes.galeria]);

  // ==========================================================================
  // HOOKS DE UPLOAD OPTIMISTA
  // ==========================================================================

  // Logo del negocio — R2
  const logo = useR2Upload({
    maxWidth: 500,
    quality: 0.85,
    generarUrl: (nombre, type) => generarUrlUploadNegocio(nombre, type, 'logos'),
    onSuccess: async (url) => {
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
    onError: (error) => notificar.error(error.message),
  });

  // Foto de perfil de la sucursal — R2
  const fotoPerfil = useR2Upload({
    maxWidth: 800,
    quality: 0.85,
    generarUrl: (nombre, type) => generarUrlUploadNegocio(nombre, type, 'perfiles'),
    onSuccess: async (url) => {
      if (!sucursalActiva) return;
      try {
        await api.post(`/negocios/sucursal/${sucursalActiva}/foto-perfil`, { fotoPerfilUrl: url });
        setDatosImagenes({ ...datosImagenes, fotoPerfilUrl: url });
        notificar.exito('Foto de perfil guardada');
      } catch (error) {
        console.error('Error al guardar foto de perfil en BD:', error);
        notificar.error('Error al guardar foto de perfil');
      }
    },
    onError: (error) => notificar.error(error.message),
  });

  // Portada de la sucursal — R2
  const portada = useR2Upload({
    maxWidth: 1600,
    quality: 0.85,
    generarUrl: (nombre, type) => generarUrlUploadNegocio(nombre, type, 'portadas'),
    onSuccess: async (url) => {
      if (!negocioId) return;
      try {
        await api.post(`/negocios/${negocioId}/portada`, { portadaUrl: url });
        setDatosImagenes({ ...datosImagenes, portadaUrl: url });
        notificar.exito('Portada guardada correctamente');
      } catch (error) {
        console.error('Error al guardar portada en BD:', error);
        notificar.error('Error al guardar portada');
      }
    },
    onError: (error) => notificar.error(error.message),
  });

  // ==========================================================================
  // HANDLERS DE UPLOAD CON MINIATURA (blur layer)
  // ==========================================================================

  const handleSubirLogo = (f: File) => {
    if (logoMiniatura) URL.revokeObjectURL(logoMiniatura);
    setLogoMiniatura(URL.createObjectURL(f));
    logo.uploadImage(f);
  };

  const handleSubirFotoPerfil = (f: File) => {
    if (fotoPerfilMiniatura) URL.revokeObjectURL(fotoPerfilMiniatura);
    setFotoPerfilMiniatura(URL.createObjectURL(f));
    fotoPerfil.uploadImage(f);
  };

  const handleSubirPortada = (f: File) => {
    if (portadaMiniatura) URL.revokeObjectURL(portadaMiniatura);
    setPortadaMiniatura(URL.createObjectURL(f));
    portada.uploadImage(f);
  };

  // ==========================================================================
  // GALERÍA - Estado y funciones
  // ==========================================================================

  // Galería — R2 (manejo manual de múltiples imágenes)
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  const [subiendoGaleria, setSubiendoGaleria] = useState(false);
  const galeriaInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar URLs de galería desde datosImagenes
  useEffect(() => {
    if (datosImagenes.galeria && datosImagenes.galeria.length > 0) {
      setGaleriaUrls(datosImagenes.galeria.map(img => img.url));
    }
  }, [datosImagenes.galeria]);

  const subirImagenGaleriaR2 = async (file: File): Promise<string> => {
    const blob = await new Promise<Blob>((resolve, reject) => {
      const img = new window.Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        let { width, height } = img;
        if (width > 1200) { height = Math.round((height * 1200) / width); width = 1200; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Blob error')), 'image/webp', 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Error imagen')); };
      img.src = blobUrl;
    });

    const nombreArchivo = file.name.replace(/\.[^.]+$/, '.webp');
    const resp = await generarUrlUploadNegocio(nombreArchivo, 'image/webp', 'galeria');
    if (!resp.success || !resp.data) throw new Error(resp.message || 'Error presigned URL');

    const putResp = await fetch(resp.data.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/webp' } });
    if (!putResp.ok) throw new Error(`Error R2: ${putResp.status}`);

    return resp.data.publicUrl;
  };

  const handleSubirGaleria = async (files: FileList | File[]) => {
    if (!negocioId) return;

    const archivos = Array.from(files).slice(0, 10 - galeriaUrls.length);
    if (archivos.length === 0) return;

    // Crear previews inmediatos (blob URLs para blur)
    const previews = archivos.map((f, i) => ({
      tempId: `temp-${Date.now()}-${i}`,
      blobUrl: URL.createObjectURL(f),
    }));
    setGaleriaSubiendo(previews);
    setSubiendoGaleria(true);

    try {
      const imagenesNuevas: { id: number; url: string; orden: number }[] = [];

      for (let i = 0; i < archivos.length; i++) {
        // 1. Subir a R2
        const url = await subirImagenGaleriaR2(archivos[i]);

        // 2. Guardar en BD individualmente
        const response = await api.post(`/negocios/${negocioId}/galeria`, {
          imagenes: [{ url, cloudinaryPublicId: '' }]
        });

        // 3. Acumular para actualizar datosImagenes al final
        const nuevaImagen = response.data?.data?.[0];
        if (nuevaImagen) {
          imagenesNuevas.push({ id: nuevaImagen.id, url: nuevaImagen.url, orden: nuevaImagen.orden });
        }

        // 4. Actualizar UI progresivamente
        setMiniaturasGaleria(prev => ({ ...prev, [url]: previews[i].blobUrl }));
        setGaleriaSubiendo(prev => prev.filter(p => p.tempId !== previews[i].tempId));
        setGaleriaUrls(prev => [...prev, url]);
      }

      // 5. Actualizar datosImagenes UNA sola vez con todas las nuevas
      if (imagenesNuevas.length > 0) {
        setDatosImagenes({
          ...datosImagenes,
          galeria: [...(datosImagenes.galeria || []), ...imagenesNuevas],
        });
      }
    } catch (error) {
      console.error('Error al subir galería:', error);
      notificar.error('Error al subir imágenes');
      galeriaSubiendo.forEach(p => URL.revokeObjectURL(p.blobUrl));
      setGaleriaSubiendo([]);
    } finally {
      setSubiendoGaleria(false);
    }
  };

  // Limpiar blob URL de miniatura después de fade-in
  const handleGaleriaCargada = (url: string) => {
    const blobUrl = miniaturasGaleria[url];
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setMiniaturasGaleria(prev => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
    }
  };

  const handleEliminarImagenGaleria = async (url: string, id?: number | string) => {
    if (!negocioId) return;

    // Optimista: quitar de UI
    setGaleriaUrls(prev => prev.filter(u => u !== url));
    setDatosImagenes({
      ...datosImagenes,
      galeria: (datosImagenes.galeria || []).filter(img => img.url !== url),
    });

    // Eliminar de BD
    if (id) {
      try {
        await api.delete(`/negocios/${negocioId}/galeria/${id}`);
        notificar.exito('Imagen eliminada');
      } catch (error) {
        console.error('Error al eliminar de BD:', error);
      }
    }

    // Eliminar de R2
    eliminarImagenHuerfana(url).catch(() => { /* silencioso */ });
  };

  // ==========================================================================
  // HANDLERS DE ELIMINACIÓN
  // ==========================================================================

  const handleEliminarLogo = async () => {
    const urlAnterior = logo.r2Url || datosImagenes.logoUrl;
    if (!urlAnterior) return;

    setDatosImagenes({ ...datosImagenes, logoUrl: null });
    logo.reset();
    if (logoMiniatura) { URL.revokeObjectURL(logoMiniatura); setLogoMiniatura(null); }

    try {
      if (negocioId) await api.delete(`/negocios/${negocioId}/logo`);
      notificar.exito('Logo eliminado');
    } catch (error) {
      setDatosImagenes({ ...datosImagenes, logoUrl: urlAnterior });
      notificar.error('Error al eliminar logo');
    }

    if (urlAnterior.startsWith('http')) {
      eliminarImagenHuerfana(urlAnterior).catch(() => {});
    }
  };

  const handleEliminarFotoPerfil = async () => {
    const urlAnterior = fotoPerfil.r2Url || datosImagenes.fotoPerfilUrl;
    if (!urlAnterior) return;

    setDatosImagenes({ ...datosImagenes, fotoPerfilUrl: null });
    fotoPerfil.reset();
    if (fotoPerfilMiniatura) { URL.revokeObjectURL(fotoPerfilMiniatura); setFotoPerfilMiniatura(null); }

    try {
      if (sucursalActiva) await api.delete(`/negocios/sucursal/${sucursalActiva}/foto-perfil`);
      notificar.exito('Foto de perfil eliminada');
    } catch (error) {
      setDatosImagenes({ ...datosImagenes, fotoPerfilUrl: urlAnterior });
      notificar.error('Error al eliminar foto de perfil');
    }

    if (urlAnterior.startsWith('http')) {
      eliminarImagenHuerfana(urlAnterior).catch(() => {});
    }
  };

  const handleEliminarPortada = async () => {
    const urlAnterior = portada.r2Url || datosImagenes.portadaUrl;
    if (!urlAnterior) return;

    setDatosImagenes({ ...datosImagenes, portadaUrl: null });
    portada.reset();
    if (portadaMiniatura) { URL.revokeObjectURL(portadaMiniatura); setPortadaMiniatura(null); }

    try {
      if (negocioId) await api.delete(`/negocios/${negocioId}/portada`);
      notificar.exito('Portada eliminada');
    } catch (error) {
      setDatosImagenes({ ...datosImagenes, portadaUrl: urlAnterior });
      notificar.error('Error al eliminar portada');
    }

    if (urlAnterior.startsWith('http')) {
      eliminarImagenHuerfana(urlAnterior).catch(() => {});
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
    const urls = galeriaUrls || [];
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
    logo.setR2Url(datosImagenes.logoUrl);
  }

  // Sincronizar foto perfil
  if (datosImagenes.fotoPerfilUrl && !fotoPerfil.imageUrl) {
    fotoPerfil.setImageUrl(datosImagenes.fotoPerfilUrl);
    fotoPerfil.setR2Url(datosImagenes.fotoPerfilUrl);
  }

  // Sincronizar portada
  if (datosImagenes.portadaUrl && !portada.imageUrl) {
    portada.setImageUrl(datosImagenes.portadaUrl);
    portada.setR2Url(datosImagenes.portadaUrl);
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
              <input type="file" accept=".png,.jpg,.jpeg,.webp"
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

      <div className="bg-white border-2 border-slate-300 rounded-xl"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            <Image className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Imágenes Principales</span>
          <div className="ml-auto text-right text-xs lg:text-xs 2xl:text-sm text-white/70 font-medium leading-tight">
            <p className="lg:inline">PNG o JPG</p>
            <span className="hidden lg:inline"> · </span>
            <p className="lg:inline">máx. 2MB</p>
          </div>
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
                    <Store className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" /> Logo
                  </span>
                  <div className="relative w-full aspect-square bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-sm">
                    {logo.imageUrl
                      ? <ImagenConBlur src={logo.imageUrl} miniatura={logoMiniatura} className="cursor-pointer" onClick={() => abrirImagenUnica(logo.imageUrl!)} />
                      : <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-slate-300" /></div>
                    }
                    <div className="absolute bottom-0 inset-x-0 flex items-center justify-end gap-2.5 py-2.5 px-3"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                      <button type="button" onClick={() => !logo.isUploading && abrirMenuCamara((f) => handleSubirLogo(f))}
                        disabled={logo.isUploading}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 cursor-pointer active:scale-95 disabled:opacity-50">
                        {logo.isUploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                      </button>
                      {logo.imageUrl && (
                        <button type="button" onClick={handleEliminarLogo} disabled={logo.isUploading}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-600 cursor-pointer active:scale-95 transition-colors disabled:opacity-50">
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
                  <UserCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" /> Foto Perfil
                </span>
                <div className="relative w-full aspect-square bg-linear-to-br from-orange-400 to-amber-500 rounded-full overflow-hidden shadow-lg">
                  {fotoPerfil.imageUrl
                    ? <ImagenConBlur src={fotoPerfil.imageUrl} miniatura={fotoPerfilMiniatura} className="cursor-pointer" onClick={() => abrirImagenUnica(fotoPerfil.imageUrl!)} />
                    : <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">N</div>
                  }
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-2.5 py-2.5 px-3"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                    <button type="button" onClick={() => !fotoPerfil.isUploading && abrirMenuCamara((f) => handleSubirFotoPerfil(f))}
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
                <Image className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" /> Imagen de Portada
                <span className="font-medium text-slate-500">1600×900px</span>
              </span>
              <div className="relative w-full aspect-video bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-sm">
                {portada.imageUrl
                  ? <ImagenConBlur src={portada.imageUrl} miniatura={portadaMiniatura} className="cursor-pointer" onClick={() => abrirImagenUnica(portada.imageUrl!)} />
                  : <div className="w-full h-full flex items-center justify-center"><Image className="w-8 h-8 text-slate-300" /></div>
                }
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-end gap-2.5 py-2.5 px-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                  <button type="button" onClick={() => !portada.isUploading && abrirMenuCamara((f) => handleSubirPortada(f))}
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
                titulo={<><Store className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" /> Logo del Negocio</>}
                imageUrl={logo.imageUrl} isUploading={logo.isUploading}
                onUpload={handleSubirLogo} onDelete={handleEliminarLogo}
                labelSubir="Subir Logo" labelCambiar="Cambiar Logo"
              >
                <div className="relative w-20 h-20 lg:w-28 lg:h-28 2xl:w-32 2xl:h-32 bg-white rounded-xl border-2 border-slate-300 flex items-center justify-center overflow-hidden shadow-sm cursor-pointer group"
                  onClick={() => logo.imageUrl && abrirImagenUnica(logo.imageUrl)}>
                  {logo.imageUrl
                    ? <ImagenConBlur src={logo.imageUrl} miniatura={logoMiniatura} onClick={() => abrirImagenUnica(logo.imageUrl!)} />
                    : <Image className="w-7 h-7 text-slate-300" />
                  }
                </div>
              </BloquImagen>
            )}

            {/* Foto Perfil */}
            <div className={!mostrarLogo ? 'lg:order-last flex justify-end' : 'flex justify-end'}>
            <BloquImagen
              titulo={<><UserCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" /> Foto de Perfil</>}
              imageUrl={fotoPerfil.imageUrl} isUploading={fotoPerfil.isUploading}
              onUpload={handleSubirFotoPerfil} onDelete={handleEliminarFotoPerfil}
              labelSubir="Subir Foto" labelCambiar="Cambiar Foto"
            >
              <div className="relative w-20 h-20 lg:w-28 lg:h-28 2xl:w-32 2xl:h-32 bg-linear-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden cursor-pointer group"
                onClick={() => fotoPerfil.imageUrl && abrirImagenUnica(fotoPerfil.imageUrl)}>
                {fotoPerfil.imageUrl
                  ? <ImagenConBlur src={fotoPerfil.imageUrl} miniatura={fotoPerfilMiniatura} onClick={() => abrirImagenUnica(fotoPerfil.imageUrl!)} />
                  : 'N'
                }
              </div>
            </BloquImagen>
            </div>

            {/* Portada */}
            <div className={mostrarLogo ? 'lg:col-span-2' : 'lg:order-first'}>
              <BloquImagen
                titulo={<><Image className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" /> Imagen de Portada</>}
                subtitulo="1600×900px"
                imageUrl={portada.imageUrl} isUploading={portada.isUploading}
                onUpload={handleSubirPortada} onDelete={handleEliminarPortada}
                labelSubir="Subir Portada" labelCambiar="Cambiar Portada"
                expandPreview={mostrarLogo}
              >
                <div className={`relative bg-white rounded-xl border-2 border-slate-300 flex items-center justify-center overflow-hidden shadow-sm cursor-pointer group w-36 h-20 ${mostrarLogo ? 'lg:w-full lg:h-28 2xl:h-32' : 'lg:w-28 lg:h-16 2xl:w-36 2xl:h-20'}`}
                  onClick={() => portada.imageUrl && abrirImagenUnica(portada.imageUrl)}>
                  {portada.imageUrl
                    ? <ImagenConBlur src={portada.imageUrl} miniatura={portadaMiniatura} onClick={() => abrirImagenUnica(portada.imageUrl!)} />
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

      <div className="bg-white border-2 border-slate-300 rounded-xl"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            <Images className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Galería de Fotos</span>
          <div className="ml-auto flex items-center gap-2.5">
            <span className={`text-sm lg:text-xs 2xl:text-sm font-bold ${(galeriaUrls?.length || 0) >= 10 ? 'text-red-400' : 'text-white/70'}`}>
              {galeriaUrls?.length || 0}/10
            </span>
            <label className={`w-7 h-7 flex items-center justify-center rounded-lg transition-opacity cursor-pointer ${galeriaUrls.length < 10 ? 'bg-white/15 hover:bg-white/25 opacity-100' : 'opacity-30 cursor-not-allowed pointer-events-none'}`}>
              <Plus className="w-4 h-4 text-white" />
              <input type="file" accept=".png,.jpg,.jpeg,.webp" multiple
                onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length > 0) handleSubirGaleria(files); e.target.value = ''; }}
                disabled={galeriaUrls.length >= 10 || subiendoGaleria} className="hidden" />
            </label>
          </div>
        </div>

        <div className="p-4 lg:p-3 2xl:p-4">
          <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium mb-3">
            1200×1200px recomendado · Haz clic en una imagen para verla completa
          </p>

          {/* ---- GALERÍA MÓVIL: carrusel 2×2 ---- */}
          {(() => {
            const items = [...(galeriaUrls || [])];
            const paginas: string[][] = [];
            for (let i = 0; i < items.length; i += 4) paginas.push(items.slice(i, i + 4));

            return (
              <div className="lg:hidden overflow-x-auto perfil-kpi-scroll" style={{ scrollSnapType: 'x mandatory' }}>
                <div className="flex gap-2">
                  {paginas.map((pagina, pi) => (
                    <div key={pi} className="grid grid-cols-2 gap-2 shrink-0 w-full" style={{ scrollSnapAlign: 'start' }}>
                      {pagina.map((item, ii) => {
                        const index = pi * 4 + ii;
                        return (
                          <div key={index} className="relative aspect-square bg-white rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm">
                            <ImagenConBlur src={item} miniatura={miniaturasGaleria[item] || null}
                              className="cursor-pointer" onClick={() => abrirGaleria(index)} />
                            <div className="absolute bottom-0 inset-x-0 flex items-center justify-end gap-2.5 py-2.5 px-3"
                              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                              <button type="button" onClick={() => !subiendoGaleria && abrirMenuCamara((f) => handleSubirGaleria([f]))}
                                disabled={subiendoGaleria}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-blue-600 cursor-pointer active:scale-95 transition-colors disabled:opacity-50">
                                <Camera className="w-5 h-5 text-white" />
                              </button>
                              <button type="button" onClick={() => handleEliminarImagenGaleria(galeriaUrls[index], datosImagenes.galeria?.find(img => img.url === galeriaUrls[index])?.id)}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-600 cursor-pointer active:scale-95 transition-colors">
                                <Trash2 className="w-5 h-5 text-white" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Página con items subiendo */}
                  {galeriaSubiendo.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 shrink-0 w-full" style={{ scrollSnapAlign: 'start' }}>
                      {galeriaSubiendo.map((item) => (
                        <div key={item.tempId} className="relative aspect-square bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm">
                          <img src={item.blobUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(8px)' }} />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ---- GALERÍA DESKTOP ---- */}
          <div className="hidden lg:grid lg:grid-cols-3 2xl:grid-cols-3 gap-2 2xl:gap-2.5">

            {/* Imágenes subidas */}
            {galeriaUrls?.map((url, index) => (
              <div key={`galeria-${url}`}
                className="relative aspect-4/3 bg-white rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm group">
                <ImagenConBlur src={url} miniatura={miniaturasGaleria[url] || null}
                  className="cursor-pointer" onClick={() => abrirGaleria(index)} />
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-end py-2.5 px-3"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
                  <button type="button" onClick={() => handleEliminarImagenGaleria(galeriaUrls[index], datosImagenes.galeria?.find(img => img.url === galeriaUrls[index])?.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-600 cursor-pointer active:scale-95 transition-colors">
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            ))}

            {/* Imágenes subiendo (blur + spinner) */}
            {galeriaSubiendo.map((item) => (
              <div key={item.tempId} className="relative aspect-4/3 bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-300 shadow-sm">
                <img src={item.blobUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(8px)' }} />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-lg" />
                </div>
              </div>
            ))}

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
            <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={handleArchivoSeleccionado} className="hidden" />
          </label>

          <label className="flex items-center gap-3 p-3.5 rounded-xl active:bg-white/10 cursor-pointer">
            <div className="w-11 h-11 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Tomar foto</p>
              <p className="text-sm text-slate-400 font-medium">Usar la cámara</p>
            </div>
            <input type="file" accept=".png,.jpg,.jpeg,.webp" capture="environment" onChange={handleArchivoSeleccionado} className="hidden" />
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