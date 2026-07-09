/**
 * BannerActivarNotifScanYA.tsx
 * ============================
 * Aviso para activar las notificaciones DENTRO de ScanYA. Necesario porque
 * ScanYA vive en su propio dominio (s.anunciaya.mx) y tanto el permiso como la
 * suscripción push son POR DOMINIO: el opt-in de AnunciaYA no aplica aquí.
 *
 * Usa `usePushNotificaciones` (igual que el banner de AnunciaYA): el botón
 * "Activar" pide permiso Y crea la suscripción push. Con eso:
 *   - Permiso → con ScanYA minimizada en PC, `mostrarNotificacionLocal` avisa.
 *   - Suscripción → el servidor avisa aunque ScanYA esté congelada/cerrada
 *     (móvil). La ruta /push usa verificarTokenChatYA → la suscripción queda
 *     con el negocioUsuarioId (el receptor real de ChatYA en ScanYA).
 *
 * Aparece 1 vez por sesión si el navegador soporta push, NO hay suscripción y
 * el permiso no está bloqueado. Estilo glass oscuro, acorde al tema de ScanYA.
 *
 * UBICACIÓN: apps/web/src/components/scanya/BannerActivarNotifScanYA.tsx
 */

import { useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { usePushNotificaciones } from '@/hooks/usePushNotificaciones';

const FLAG_SESION = 'sy_notif_aviso_sesion';

export function BannerActivarNotifScanYA() {
  const { soportado, activo, permisoBloqueado, cargando, alternar } = usePushNotificaciones();
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem(FLAG_SESION) === '1') return;
    const t = setTimeout(() => setOculto(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const mostrar = !oculto && soportado && !activo && !permisoBloqueado;

  useEffect(() => {
    if (mostrar) sessionStorage.setItem(FLAG_SESION, '1');
  }, [mostrar]);

  if (!mostrar) return null;

  return (
    <div
      data-testid="banner-activar-notif-scanya"
      className="mx-4 lg:mx-6 2xl:mx-8 mt-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur-sm px-3.5 py-2.5 flex items-center gap-3"
    >
      <Bell className="w-5 h-5 text-blue-300 shrink-0" strokeWidth={2} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">Activa las notificaciones</p>
        <p className="text-xs text-white/60 truncate">Entérate cuando te escriban por ChatYA.</p>
      </div>
      <button
        data-testid="btn-activar-notif-scanya"
        onClick={alternar}
        disabled={cargando}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] px-3.5 py-1.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {cargando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Activar
      </button>
      <button
        aria-label="Cerrar"
        onClick={() => setOculto(true)}
        className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer"
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default BannerActivarNotifScanYA;
