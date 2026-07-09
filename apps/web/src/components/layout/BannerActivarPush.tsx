/**
 * BannerActivarPush.tsx
 * =====================
 * Aviso discreto que invita a activar las notificaciones push cuando NO hay
 * suscripción activa en este dispositivo. Se monta una vez en MainLayout.
 *
 * Comportamiento (definido con Juan):
 *  - Aparece 1 VEZ POR SESIÓN (flag en sessionStorage → se limpia al cerrar la
 *    PWA/pestaña, así reaparece en la próxima apertura si sigue desactivado).
 *  - Solo si: push soportado + NO suscrito + el permiso NO está bloqueado.
 *  - Trae botón "Activar" que suscribe ahí mismo (no hay que ir a Seguridad) y
 *    una X para descartar.
 *  - Se oculta si ChatYA está abierto (el usuario ya está en sus mensajes).
 *  - Delay inicial para no parpadear en quien SÍ está suscrito (da tiempo a que
 *    `usePushNotificaciones` resuelva el estado real).
 *
 * UBICACIÓN: apps/web/src/components/layout/BannerActivarPush.tsx
 */

import { useEffect, useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { usePushNotificaciones } from '../../hooks/usePushNotificaciones';
import { useUiStore } from '../../stores/useUiStore';

const FLAG_SESION = 'ay_push_aviso_sesion';
const GRADIENTE_MARCA = 'linear-gradient(135deg, #1e293b, #334155)';

export function BannerActivarPush() {
    const { soportado, activo, permisoBloqueado, cargando, alternar } = usePushNotificaciones();
    const chatYAAbierto = useUiStore((s) => s.chatYAAbierto);
    // Arranca oculto; se destapa tras el delay (si no se vio ya en esta sesión).
    const [oculto, setOculto] = useState(true);

    useEffect(() => {
        if (sessionStorage.getItem(FLAG_SESION) === '1') return;
        const t = setTimeout(() => setOculto(false), 2500);
        return () => clearTimeout(t);
    }, []);

    // En cuanto el banner se vuelve elegible para mostrarse, marcar la sesión
    // como vista para que no reaparezca en recargas de esta misma sesión.
    useEffect(() => {
        if (!oculto && soportado && !activo && !permisoBloqueado) {
            sessionStorage.setItem(FLAG_SESION, '1');
        }
    }, [oculto, soportado, activo, permisoBloqueado]);

    if (oculto || !soportado || activo || permisoBloqueado || chatYAAbierto) return null;

    return (
        <div
            data-testid="banner-activar-push"
            className="fixed z-[70] left-3 right-3 bottom-24 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[360px] rounded-xl bg-white border border-slate-300 shadow-lg p-3.5 flex items-start gap-3"
        >
            <div className="shrink-0 mt-0.5">
                <Bell className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">Activa las notificaciones</p>
                <p className="text-sm lg:text-[12px] 2xl:text-sm font-medium text-slate-500 mt-0.5">
                    Entérate al instante cuando te escriban por ChatYA, aunque tengas la app cerrada.
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                    <button
                        data-testid="btn-activar-push"
                        onClick={alternar}
                        disabled={cargando}
                        style={{ background: GRADIENTE_MARCA }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {cargando && <Loader2 className="w-4 h-4 animate-spin" />}
                        Activar
                    </button>
                    <button
                        data-testid="btn-descartar-push"
                        onClick={() => setOculto(true)}
                        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 lg:hover:bg-slate-100 cursor-pointer"
                    >
                        Ahora no
                    </button>
                </div>
            </div>
            <button
                aria-label="Cerrar"
                onClick={() => setOculto(true)}
                className="shrink-0 -mt-0.5 -mr-0.5 p-1 rounded-lg text-slate-400 lg:hover:bg-slate-100 lg:hover:text-slate-600 cursor-pointer"
            >
                <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default BannerActivarPush;
