/**
 * BannerActivarPush.tsx
 * =====================
 * Aviso discreto (arriba, tipo "pill") que invita a activar las notificaciones
 * push cuando NO hay suscripción activa en este dispositivo. Se monta una vez
 * en MainLayout.
 *
 * Comportamiento (definido con Juan):
 *  - Aparece 1 VEZ POR SESIÓN (flag en sessionStorage → se limpia al cerrar la
 *    PWA/pestaña, así reaparece en la próxima apertura si sigue desactivado).
 *  - Solo si: push soportado + NO suscrito + el permiso NO está bloqueado.
 *  - Botón "Activar" que suscribe ahí mismo; la ✕ lo descarta.
 *  - Se oculta si ChatYA está abierto.
 *  - Delay + animación de entrada para no parpadear en quien SÍ está suscrito.
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
    const { soportado, activo, permisoBloqueado, cargando, listo, alternar } = usePushNotificaciones();
    const chatYAAbierto = useUiStore((s) => s.chatYAAbierto);
    // Arranca oculto; se destapa tras el delay (si no se vio ya en esta sesión).
    const [oculto, setOculto] = useState(true);
    // Controla la animación de entrada (slide + fade desde arriba).
    const [entrada, setEntrada] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem(FLAG_SESION) === '1') return;
        const t = setTimeout(() => setOculto(false), 2500);
        return () => clearTimeout(t);
    }, []);

    // `listo`: no evaluar hasta saber con certeza si hay suscripción (evita que el
    // banner reaparezca durante el chequeo asíncrono tras un re-login).
    const mostrar = listo && !oculto && soportado && !activo && !permisoBloqueado && !chatYAAbierto;

    // En cuanto es elegible: marcar la sesión (no reaparece en recargas) y
    // disparar la animación de entrada en el siguiente frame.
    useEffect(() => {
        if (!mostrar) return;
        sessionStorage.setItem(FLAG_SESION, '1');
        const r = requestAnimationFrame(() => setEntrada(true));
        return () => cancelAnimationFrame(r);
    }, [mostrar]);

    if (!mostrar) return null;

    return (
        <div
            data-testid="banner-activar-push"
            className={`fixed z-[70] top-[72px] lg:top-[84px] left-3 right-3 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 flex justify-center transition-all duration-300 ease-out ${
                entrada ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
        >
            <div className="flex items-center gap-2.5 rounded-full bg-white border border-slate-200 shadow-lg pl-3.5 pr-1.5 py-1.5 max-w-full">
                <Bell className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2.5} />
                <span className="text-sm font-semibold text-slate-800 truncate">Activa las notificaciones</span>
                <button
                    data-testid="btn-activar-push"
                    onClick={alternar}
                    disabled={cargando}
                    style={{ background: GRADIENTE_MARCA }}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {cargando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Activar
                </button>
                <button
                    data-testid="btn-descartar-push"
                    aria-label="Cerrar"
                    onClick={() => setOculto(true)}
                    className="shrink-0 p-1.5 rounded-full text-slate-400 lg:hover:bg-slate-100 lg:hover:text-slate-600 cursor-pointer"
                >
                    <X className="w-4 h-4" strokeWidth={2.5} />
                </button>
            </div>
        </div>
    );
}

export default BannerActivarPush;
