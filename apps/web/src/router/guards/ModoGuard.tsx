/**
 * ModoGuard.tsx
 * ==============
 * Guard que protege rutas según el modo requerido.
 * 
 * Comportamiento:
 * 1. Personal → Ruta Comercial (tiene ambos) → Modal para cambiar
 * 2. Comercial → Ruta Personal-Only → Cambia automáticamente
 * 3. Sin comercial → Ruta Comercial → Toast + Redirige a /inicio
 * 4. Onboarding incompleto → Business Studio → Toast + Redirige a onboarding
 * 
 * Ubicación: apps/web/src/router/guards/ModoGuard.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import { ModalCambiarModo } from '../../components/ui/ModalCambiarModo';

// =============================================================================
// TIPOS
// =============================================================================

interface ModoGuardProps {
    children: React.ReactNode;
    requiereModo: 'personal' | 'comercial';
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModoGuard({ children, requiereModo }: ModoGuardProps) {
    // ---------------------------------------------------------------------------
    // Store
    // ---------------------------------------------------------------------------
    const usuario = useAuthStore((state) => state.usuario);
    const cambiarModo = useAuthStore((state) => state.cambiarModo);

    // ---------------------------------------------------------------------------
    // Estado local
    // ---------------------------------------------------------------------------
    const [showModal, setShowModal] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [accesoConcedido, setAccesoConcedido] = useState(false);
    const [redirigiendo, setRedirigiendo] = useState(false);

    // ---------------------------------------------------------------------------
    // Refs para evitar re-evaluaciones
    // ---------------------------------------------------------------------------
    const evaluado = useRef(false);
    const cancelado = useRef(false);

    // ---------------------------------------------------------------------------
    // Hooks
    // ---------------------------------------------------------------------------
    const navigate = useNavigate();
    const location = useLocation();

    // ---------------------------------------------------------------------------
    // Datos del usuario
    // ---------------------------------------------------------------------------
    const modoActivo = usuario?.modoActivo || 'personal';
    const tieneModoComercial = usuario?.tieneModoComercial || false;
    const onboardingCompletado = usuario?.onboardingCompletado ?? false;

    // ---------------------------------------------------------------------------
    // Effect: Evaluar acceso (solo una vez por ruta)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        // Reset al cambiar de ruta
        evaluado.current = false;
        cancelado.current = false;
        setAccesoConcedido(false);
        setShowModal(false);
        setRedirigiendo(false);
    }, [location.pathname]);

    useEffect(() => {
        // Si ya se evaluó, canceló, o ya tiene acceso, no hacer nada
        if (evaluado.current || cancelado.current || accesoConcedido) return;

        // Marcar como evaluado
        evaluado.current = true;

        // Ya está en el modo correcto
        if (modoActivo === requiereModo) {
            setAccesoConcedido(true);
            return;
        }

        // Caso 1: Requiere Comercial pero NO tiene modo comercial
        if (requiereModo === 'comercial' && !tieneModoComercial) {
            notificar.info('Sección exclusiva para Comerciantes');
            setRedirigiendo(true);
            navigate('/inicio', { replace: true });
            return;
        }

        // Caso 2: Requiere Comercial pero onboarding incompleto
        if (requiereModo === 'comercial' && tieneModoComercial && !onboardingCompletado) {
            setRedirigiendo(true);
            notificar.info('Completa la configuración de tu negocio');
            navigate('/business/onboarding', { replace: true });
            return;
        }

        // Caso 3: Requiere Comercial, tiene comercial, pero está en Personal
        if (requiereModo === 'comercial' && modoActivo === 'personal' && tieneModoComercial) {
            setShowModal(true);
            return;
        }

        // Caso 4: Requiere Personal pero está en Comercial
        if (requiereModo === 'personal' && modoActivo === 'comercial') {
            cambiarModo('personal')
                .then(() => {
                    setAccesoConcedido(true);
                })
                .catch(() => {
                    notificar.error('Error al cambiar de modo');
                    navigate(-1);
                });
            return;
        }

    }, [location.pathname, modoActivo, requiereModo, tieneModoComercial, onboardingCompletado, accesoConcedido]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleConfirm = async () => {
        setCargando(true);
        try {
            await cambiarModo(requiereModo);
            setShowModal(false);
            setAccesoConcedido(true);
        } catch (error) {
            notificar.error(
                error instanceof Error ? error.message : 'Error al cambiar modo'
            );
        } finally {
            setCargando(false);
        }
    };

    const handleCancel = () => {
        cancelado.current = true;
        setShowModal(false);
        navigate(-1);
    };

    // ---------------------------------------------------------------------------
    // Render: Modal de confirmación
    // ---------------------------------------------------------------------------
    if (showModal) {
        return (
            <ModalCambiarModo
                isOpen={true}
                modoDestino={requiereModo}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                cargando={cargando}
            />
        );
    }

    // ---------------------------------------------------------------------------
    // Render: Contenido protegido (solo si tiene acceso)
    // ---------------------------------------------------------------------------
    // Si está redirigiendo, no mostrar nada (evita flash de contenido)
    if (redirigiendo) {
        return null;
    }

    if (accesoConcedido || modoActivo === requiereModo) {
        return <>{children}</>;
    }

    // Mientras evalúa, no mostrar nada
    return null;
}

export default ModoGuard;