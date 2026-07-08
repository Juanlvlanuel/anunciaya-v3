/**
 * usePushNotificaciones.ts
 * ========================
 * Hook para el toggle "Activar notificaciones en este dispositivo" (Mi Perfil →
 * Seguridad). Expone el estado (soportado, activo, cargando) y una acción
 * `alternar()` que activa o desactiva el push según el estado actual.
 *
 * Envuelve pushService y traduce los resultados a toasts `notificar.*`.
 *
 * UBICACIÓN: apps/web/src/hooks/usePushNotificaciones.ts
 */

import { useCallback, useEffect, useState } from 'react';
import { activarPush, desactivarPush, estaSuscrito, permisoActual, pushSoportado } from '../services/pushService';
import { notificar } from '../utils/notificaciones';

export interface EstadoPush {
    /** El navegador soporta push (Service Worker + PushManager). */
    soportado: boolean;
    /** Hay una suscripción activa en este dispositivo. */
    activo: boolean;
    /** El usuario bloqueó las notificaciones en el navegador (irreversible desde la app). */
    permisoBloqueado: boolean;
    /** Operación en curso (activar/desactivar). */
    cargando: boolean;
    /** Activa o desactiva según el estado actual. */
    alternar: () => Promise<void>;
}

export function usePushNotificaciones(): EstadoPush {
    const soportado = pushSoportado();
    const [activo, setActivo] = useState(false);
    const [permisoBloqueado, setPermisoBloqueado] = useState(false);
    const [cargando, setCargando] = useState(false);

    // Estado inicial: ¿ya está suscrito este dispositivo? ¿el permiso está bloqueado?
    useEffect(() => {
        if (!soportado) return;
        setPermisoBloqueado(permisoActual() === 'denied');
        let vivo = true;
        estaSuscrito().then((s) => { if (vivo) setActivo(s); });
        return () => { vivo = false; };
    }, [soportado]);

    const alternar = useCallback(async () => {
        if (cargando || !soportado) return;
        setCargando(true);
        try {
            if (activo) {
                const r = await desactivarPush();
                if (r.ok) {
                    setActivo(false);
                    notificar.info('Notificaciones desactivadas en este dispositivo');
                } else {
                    notificar.error('No se pudieron desactivar las notificaciones');
                }
                return;
            }

            const r = await activarPush();
            if (r.ok) {
                setActivo(true);
                notificar.exito('Notificaciones activadas en este dispositivo');
                return;
            }

            // Traducir el motivo del fallo a un aviso claro.
            switch (r.motivo) {
                case 'permiso-denegado':
                    setPermisoBloqueado(permisoActual() === 'denied');
                    notificar.advertencia('Debes permitir las notificaciones en el navegador');
                    break;
                case 'sin-clave':
                    notificar.error('Notificaciones no configuradas (falta la clave del servidor)');
                    break;
                case 'no-soportado':
                case 'sin-sw':
                    notificar.advertencia('Este dispositivo o navegador no admite notificaciones push');
                    break;
                default:
                    notificar.error('No se pudieron activar las notificaciones');
            }
        } finally {
            setCargando(false);
        }
    }, [activo, cargando, soportado]);

    return { soportado, activo, permisoBloqueado, cargando, alternar };
}

export default usePushNotificaciones;
