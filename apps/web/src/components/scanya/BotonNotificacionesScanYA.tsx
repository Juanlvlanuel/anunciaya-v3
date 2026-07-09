/**
 * BotonNotificacionesScanYA.tsx
 * =============================
 * Campana en el header de ScanYA que muestra el estado de las notificaciones
 * push (color del ícono + LED) y, al tocarla, abre un popover con el interruptor
 * para activar/desactivar. Reemplaza al toggle grande de la pantalla principal
 * (config, no acción → va en el header, no entre las acciones operativas).
 *
 *  - Verde  = activadas (suscrito).
 *  - Azul   = desactivadas.
 *  - Ámbar  = bloqueadas en el navegador (no se pueden activar desde la app).
 *
 * UBICACIÓN: apps/web/src/components/scanya/BotonNotificacionesScanYA.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { usePushNotificaciones } from '@/hooks/usePushNotificaciones';

export function BotonNotificacionesScanYA() {
  const { soportado, activo, permisoBloqueado, cargando, listo, alternar } = usePushNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar el popover al hacer clic fuera.
  useEffect(() => {
    if (!abierto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [abierto]);

  if (!soportado) return null;

  // Color de estado (ícono de la campana + LED).
  const color = permisoBloqueado ? '#F59E0B' : activo ? '#34D399' : '#3B82F6';

  const subtitulo = permisoBloqueado
    ? 'Bloqueadas en el navegador'
    : !listo
      ? 'Comprobando…'
      : activo
        ? 'Activadas · te avisamos al instante'
        : 'Desactivadas';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-full text-white transition-all duration-200 cursor-pointer shrink-0 hover:bg-white/15"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(59, 130, 246, 0.4)' }}
        aria-label="Notificaciones de ChatYA"
        data-testid="scanya-btn-notificaciones"
      >
        <Bell className="w-5 h-5" strokeWidth={2} style={{ color }} />
        {/* LED de estado (esquina) */}
        <span
          className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-black"
          style={{ background: color }}
        />
      </button>

      {abierto && (
        <div
          className="absolute right-0 mt-2 w-64 rounded-xl border border-white/15 shadow-2xl p-3.5 z-[60]"
          style={{ background: 'linear-gradient(180deg, #0A1120 0%, #0B1526 100%)' }}
          data-testid="scanya-popover-notificaciones"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bell className="w-5 h-5 shrink-0" strokeWidth={2} style={{ color }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Notificaciones de ChatYA</p>
                <p className="text-xs text-white/60 truncate">{subtitulo}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={activo}
              data-testid="switch-notif-scanya"
              onClick={alternar}
              disabled={!listo || cargando || permisoBloqueado}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${activo ? 'bg-emerald-500' : 'bg-white/25'}`}
            >
              {cargando ? (
                <Loader2 className="w-4 h-4 mx-auto animate-spin text-white" />
              ) : (
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
              )}
            </button>
          </div>
          {permisoBloqueado && (
            <p className="text-xs text-amber-300/80 mt-2.5">
              Actívalas desde los ajustes del navegador para este sitio.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default BotonNotificacionesScanYA;
