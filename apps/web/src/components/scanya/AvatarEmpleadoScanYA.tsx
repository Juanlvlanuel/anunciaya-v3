/**
 * AvatarEmpleadoScanYA.tsx
 * ========================
 * Avatar del empleado en ScanYA con funcionalidad de upload.
 * Click en el avatar abre selector de imagen.
 * Solo visible para usuarios tipo 'empleado'.
 *
 * Flujo: Seleccionar imagen -> Preview local -> Comprimir (500x500) -> Upload R2 -> Guardar en BD
 *
 * Ubicacion: apps/web/src/components/scanya/AvatarEmpleadoScanYA.tsx
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useR2Upload } from '@/hooks/useR2Upload';
import { obtenerUrlSubidaAvatarEmpleado, actualizarAvatarEmpleado } from '@/services/scanyaService';
import { useScanYAStore } from '@/stores/useScanYAStore';
import { notificar } from '@/utils/notificaciones';
import Tooltip from '@/components/ui/Tooltip';

// =============================================================================
// COMPONENTE
// =============================================================================

export default function AvatarEmpleadoScanYA() {
  const { usuario, actualizarFotoUrl } = useScanYAStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [guardando, setGuardando] = useState(false);

  const { imageUrl, isUploading, uploadImage } = useR2Upload({
    maxWidth: 500,
    quality: 0.8,
    generarUrl: obtenerUrlSubidaAvatarEmpleado,
    onSuccess: async (url) => {
      setGuardando(true);
      try {
        const resp = await actualizarAvatarEmpleado(url);
        if (resp.success) {
          actualizarFotoUrl(url);
          notificar.exito('Avatar actualizado');
        } else {
          notificar.error(resp.message || 'Error al guardar avatar');
        }
      } catch {
        notificar.error('Error al guardar avatar');
      } finally {
        setGuardando(false);
      }
    },
    onError: () => {
      notificar.error('Error al subir imagen');
    },
  });

  // Detectar si es desktop (lg: 1024px+)
  const [esDesktop, setEsDesktop] = useState(false);

  const verificarDesktop = useCallback(() => {
    setEsDesktop(window.matchMedia('(min-width: 1024px)').matches);
  }, []);

  useEffect(() => {
    verificarDesktop();
    window.addEventListener('resize', verificarDesktop);
    return () => window.removeEventListener('resize', verificarDesktop);
  }, [verificarDesktop]);

  if (!usuario || usuario.tipo !== 'empleado') return null;

  const enProceso = isUploading || guardando;
  const fotoActual = imageUrl || usuario.fotoUrl;
  const inicial = usuario.nombreUsuario?.charAt(0)?.toUpperCase() || '?';

  const handleClick = () => {
    if (!enProceso) {
      inputRef.current?.click();
    }
  };

  const handleSeleccion = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (archivo) {
      uploadImage(archivo);
    }
    // Reset input para permitir re-seleccionar el mismo archivo
    e.target.value = '';
  };

  const botonAvatar = (
    <button
      data-testid="avatar-empleado"
      onClick={handleClick}
      disabled={enProceso}
      className="
        relative
        w-10 h-10
        rounded-full
        shrink-0
        cursor-pointer
        transition-all duration-200
        hover:ring-2 hover:ring-[#3B82F6]/60
        focus:outline-none focus:ring-2 focus:ring-[#3B82F6]
        disabled:cursor-wait
        group
      "
      style={{
        background: fotoActual ? 'transparent' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
        boxShadow: '0 0 10px rgba(59, 130, 246, 0.3)',
      }}
      aria-label="Cambiar foto de perfil"
    >
      {/* Foto o inicial */}
      <div className="w-full h-full rounded-full overflow-hidden">
        {fotoActual ? (
          <img
            src={fotoActual}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-white font-bold text-lg flex items-center justify-center w-full h-full">
            {inicial}
          </span>
        )}
      </div>

      {/* Overlay de carga */}
      {enProceso && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        </div>
      )}

      {/* Badge de cámara — siempre visible */}
      {!enProceso && (
        <div
          className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center z-10"
          style={{
            background: '#3B82F6',
            border: '2px solid #000',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
        >
          <Camera className="w-3.5 h-3.5 text-white" />
        </div>
      )}
    </button>
  );

  return (
    <>
      {esDesktop ? (
        <Tooltip text="Cambiar avatar" position="bottom" autoHide={1500}>
          {botonAvatar}
        </Tooltip>
      ) : (
        botonAvatar
      )}

      {/* Input oculto para seleccionar imagen */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleSeleccion}
        className="hidden"
        data-testid="input-avatar-empleado"
      />
    </>
  );
}
