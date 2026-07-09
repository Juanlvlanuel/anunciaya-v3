/**
 * BannerActivarNotifScanYA.tsx
 * ============================
 * Aviso para activar las notificaciones DENTRO de ScanYA. Necesario porque
 * ScanYA vive en su propio dominio (s.anunciaya.mx) y el permiso de
 * notificaciones es POR DOMINIO: el opt-in de AnunciaYA no aplica aquí.
 *
 * Con el permiso concedido, cuando ScanYA queda minimizada y llega un mensaje
 * de ChatYA, `mostrarNotificacionLocal` (useChatYAStore) muestra la notificación
 * del sistema vía el Service Worker de ScanYA.
 *
 * Solo pide el PERMISO (no suscribe a push). El push con ScanYA cerrada del
 * todo es un pendiente aparte (requiere suscripción propia + backend).
 *
 * Aparece 1 vez por sesión si el navegador soporta notificaciones y el permiso
 * sigue sin decidirse. Estilo glass oscuro, acorde al tema de ScanYA.
 *
 * UBICACIÓN: apps/web/src/components/scanya/BannerActivarNotifScanYA.tsx
 */

import { useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { pushSoportado, permisoActual } from '@/services/pushService';
import { notificar } from '@/utils/notificaciones';

const FLAG_SESION = 'sy_notif_aviso_sesion';

export function BannerActivarNotifScanYA() {
  const [oculto, setOculto] = useState(true);
  const [permiso, setPermiso] = useState<NotificationPermission>('default');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!pushSoportado()) return;
    setPermiso(permisoActual());
    if (sessionStorage.getItem(FLAG_SESION) === '1') return;
    const t = setTimeout(() => setOculto(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const mostrar = !oculto && pushSoportado() && permiso === 'default';

  useEffect(() => {
    if (mostrar) sessionStorage.setItem(FLAG_SESION, '1');
  }, [mostrar]);

  if (!mostrar) return null;

  const activar = async () => {
    if (procesando) return;
    setProcesando(true);
    try {
      const resultado = await Notification.requestPermission();
      setPermiso(resultado);
      setOculto(true);
      if (resultado === 'granted') {
        notificar.exito('Notificaciones activadas en esta computadora');
      } else {
        notificar.advertencia('No se activaron las notificaciones');
      }
    } finally {
      setProcesando(false);
    }
  };

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
        onClick={activar}
        disabled={procesando}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] px-3.5 py-1.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {procesando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
