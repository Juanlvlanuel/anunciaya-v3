/**
 * ModoPersonalEstrictoGuard.tsx
 * ==============================
 * Guard que protege rutas con política de **bloqueo total** — NO auto-cambia
 * el modo del usuario (a diferencia de `ModoGuard`).
 *
 * Comportamiento:
 *  - Usuario en modo Personal → renderiza children normalmente.
 *  - Usuario en modo Comercial → redirige a `/inicio` con un toast `info`.
 *
 * Usos actuales:
 *  - MarketPlace (toda la sección) — Sprint 2 MP, May 2026
 *  - Servicios   (toda la sección) — Sprint 2 Servicios, May 2026
 *
 * El prop `mensaje` permite personalizar el toast por sección. Si se omite,
 * se usa un mensaje neutro que cubre cualquier ruta protegida.
 *
 * ¿Por qué un guard separado de `ModoGuard`?
 * `ModoGuard` hace auto-cambio Personal↔Comercial cuando la ruta requiere
 * un modo distinto (lo correcto para `/cardya`, `/scanya`,
 * `/mis-publicaciones`). MarketPlace y Servicios son diferentes: los docs
 * maestros definen **bloqueo total** porque un negocio formal usa Catálogo
 * o BS Vacantes, NO la sección P2P. Mezclar ambas políticas con un prop
 * en `ModoGuard` sería invitar a bugs sutiles.
 *
 * Doc maestro MP:        docs/arquitectura/MarketPlace.md (§5 Política de Visibilidad)
 * Doc maestro Servicios: docs/VISION_ESTRATEGICA_AnunciaYA.md §3.2
 *
 * Ubicación: apps/web/src/router/guards/ModoPersonalEstrictoGuard.tsx
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';

interface ModoPersonalEstrictoGuardProps {
    children: React.ReactNode;
    /**
     * Mensaje del toast cuando el usuario está en modo Comercial.
     * Default: "Esta sección solo está disponible en modo Personal".
     */
    mensaje?: string;
}

export function ModoPersonalEstrictoGuard({
    children,
    mensaje = 'Esta sección solo está disponible en modo Personal',
}: ModoPersonalEstrictoGuardProps) {
    const usuario = useAuthStore((s) => s.usuario);
    const navigate = useNavigate();
    const yaNotificado = useRef(false);

    const esComercial = usuario?.modoActivo === 'comercial';

    useEffect(() => {
        if (esComercial && !yaNotificado.current) {
            yaNotificado.current = true;
            notificar.info(mensaje);
            navigate('/inicio', { replace: true });
        }
        if (!esComercial) {
            yaNotificado.current = false;
        }
    }, [esComercial, mensaje, navigate]);

    if (esComercial) return null;

    return <>{children}</>;
}

export default ModoPersonalEstrictoGuard;
