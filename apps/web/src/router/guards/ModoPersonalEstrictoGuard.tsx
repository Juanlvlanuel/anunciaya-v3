/**
 * ModoPersonalEstrictoGuard.tsx
 * ==============================
 * Guard que protege rutas del MarketPlace con política de **bloqueo total** —
 * NO auto-cambia el modo del usuario (a diferencia de `ModoGuard`).
 *
 * Comportamiento:
 *  - Usuario en modo Personal → renderiza children normalmente.
 *  - Usuario en modo Comercial → redirige a `/inicio` con
 *    `notificar.info('MarketPlace solo está disponible en modo Personal')`.
 *
 * ¿Por qué un guard separado?
 * `ModoGuard` (el guard genérico) hace auto-cambio Personal↔Comercial cuando
 * la ruta requiere un modo distinto. Eso es el comportamiento correcto para
 * `/cardya`, `/scanya`, `/mis-publicaciones` (donde tiene sentido cambiar
 * modo automáticamente). MarketPlace es diferente: el doc maestro define
 * **bloqueo total** porque un negocio formal usa Catálogo en Business Studio,
 * no MarketPlace P2P. Mezclar ambas políticas con un prop sería invitar a
 * bugs sutiles. Guards separados = más explícito y más seguro.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§5 Política de Visibilidad)
 * Sprint:      docs/prompts Marketplace/Sprint-2-Feed-Frontend.md
 *
 * Ubicación: apps/web/src/router/guards/ModoPersonalEstrictoGuard.tsx
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';

interface ModoPersonalEstrictoGuardProps {
    children: React.ReactNode;
}

export function ModoPersonalEstrictoGuard({
    children,
}: ModoPersonalEstrictoGuardProps) {
    const usuario = useAuthStore((s) => s.usuario);
    const navigate = useNavigate();
    const yaNotificado = useRef(false);

    const esComercial = usuario?.modoActivo === 'comercial';

    useEffect(() => {
        if (esComercial && !yaNotificado.current) {
            yaNotificado.current = true;
            notificar.info('MarketPlace solo está disponible en modo Personal');
            navigate('/inicio', { replace: true });
        }
        if (!esComercial) {
            yaNotificado.current = false;
        }
    }, [esComercial, navigate]);

    if (esComercial) return null;

    return <>{children}</>;
}

export default ModoPersonalEstrictoGuard;
