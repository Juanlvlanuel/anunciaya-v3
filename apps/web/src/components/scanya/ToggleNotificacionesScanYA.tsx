/**
 * ToggleNotificacionesScanYA.tsx
 * ==============================
 * Interruptor persistente para activar/desactivar las notificaciones push en
 * ScanYA — equivalente al toggle de AnunciaYA (Mi Perfil → Seguridad).
 *
 * Muestra SIEMPRE el estado real (suscrito o no) para poder diagnosticar
 * visualmente: si el interruptor está prendido pero el banner "Activa las
 * notificaciones" sigue apareciendo, hay una inconsistencia. Ambos leen el
 * mismo `usePushNotificaciones`, así que deberían coincidir.
 *
 * Estilo glass oscuro, acorde al tema de ScanYA.
 *
 * UBICACIÓN: apps/web/src/components/scanya/ToggleNotificacionesScanYA.tsx
 */

import { Bell, Loader2 } from 'lucide-react';
import { usePushNotificaciones } from '@/hooks/usePushNotificaciones';

export function ToggleNotificacionesScanYA() {
  const { soportado, activo, permisoBloqueado, cargando, listo, alternar } = usePushNotificaciones();

  if (!soportado) return null;

  const subtitulo = permisoBloqueado
    ? 'Bloqueadas en el navegador'
    : !listo
      ? 'Comprobando…'
      : activo
        ? 'Activadas en este dispositivo'
        : 'Desactivadas';

  const puedeAlternar = listo && !cargando && !permisoBloqueado;

  return (
    <div
      data-testid="toggle-notif-scanya"
      className="rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm px-3.5 py-2.5 flex items-center gap-3"
    >
      <Bell className="w-5 h-5 text-blue-300 shrink-0" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Notificaciones</p>
        <p className="text-xs text-white/60 truncate">{subtitulo}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={activo}
        data-testid="switch-notif-scanya"
        onClick={alternar}
        disabled={!puedeAlternar}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${activo ? 'bg-emerald-500' : 'bg-white/25'}`}
      >
        {cargando ? (
          <Loader2 className="w-4 h-4 mx-auto animate-spin text-white" />
        ) : (
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
        )}
      </button>
    </div>
  );
}

export default ToggleNotificacionesScanYA;
