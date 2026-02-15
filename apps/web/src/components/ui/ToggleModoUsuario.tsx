/**
 * ToggleModoUsuario.tsx
 * ======================
 * Toggle para alternar entre modo Personal y Comercial.
 * 
 * Características:
 * - Reutilizable en Navbar (desktop) y MenuDrawer (móvil)
 * - Actualización optimista (cambio instantáneo)
 * - Solo iconos Lucide (sin emojis)
 * - Responsive: default (móvil), lg: (1366x768), 2xl: (1920x1080+)
 * - Prop `grande` para versión más grande en MenuDrawer
 * - Redirección automática: Si cambia de modo estando en ruta exclusiva → /inicio
 *   - Rutas exclusivas Comercial: /business-studio/*, /scanya/*
 *   - Rutas exclusivas Personal: /cardya, /cupones, /mis-publicaciones, /marketplace
 * 
 * Comportamiento:
 * - Si tiene ambos modos → Toggle interactivo
 * - Si solo tiene Personal → Badge estático (no clickeable)
 * - Si está en ruta exclusiva y cambia al otro modo → Redirige a /inicio
 * 
 * Ubicación: apps/web/src/components/ui/ToggleModoUsuario.tsx
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Store } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface ToggleModoUsuarioProps {
    grande?: boolean; // Versión más grande para MenuDrawer
    onModoChanged?: () => void; // Callback después de cambiar modo (cierra modals)
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ToggleModoUsuario({ grande = false, onModoChanged }: ToggleModoUsuarioProps) {
    // ---------------------------------------------------------------------------
    // Hooks
    // ---------------------------------------------------------------------------
    const navigate = useNavigate();
    const location = useLocation();

    // ---------------------------------------------------------------------------
    // Store
    // ---------------------------------------------------------------------------
    const usuario = useAuthStore((state) => state.usuario);
    const cambiarModo = useAuthStore((state) => state.cambiarModo);

    // ---------------------------------------------------------------------------
    // Estado local
    // ---------------------------------------------------------------------------
    const [cambiando, setCambiando] = useState(false);

    // ---------------------------------------------------------------------------
    // Validaciones
    // ---------------------------------------------------------------------------
    if (!usuario) return null;

    const { modoActivo, tieneModoComercial } = usuario;

    // ---------------------------------------------------------------------------
    // Handler: Cambiar modo
    // ---------------------------------------------------------------------------
    const handleCambiarModo = async (nuevoModo: 'personal' | 'comercial') => {
        // No hacer nada si ya está en ese modo o está cambiando
        if (nuevoModo === modoActivo || cambiando) return;

        // Guardar ruta actual para verificar si es exclusiva
        const rutaActual = location.pathname;

        // Rutas exclusivas de cada modo
        const rutasExclusivasComercial = ['/business-studio', '/scanya'];
        const rutasExclusivasPersonal = ['/cardya', '/cupones', '/mis-publicaciones', '/marketplace'];

        // Verificar si está en ruta exclusiva del modo que va a abandonar
        const estaEnRutaExclusivaComercial = rutasExclusivasComercial.some(ruta => rutaActual.startsWith(ruta));
        const estaEnRutaExclusivaPersonal = rutasExclusivasPersonal.some(ruta => rutaActual.startsWith(ruta));

        // ✅ REDIRIGIR si va a abandonar una ruta exclusiva
        const debeRedirigir = 
            (modoActivo === 'comercial' && nuevoModo === 'personal' && estaEnRutaExclusivaComercial) ||
            (modoActivo === 'personal' && nuevoModo === 'comercial' && estaEnRutaExclusivaPersonal);

        if (debeRedirigir) {
            navigate('/inicio');
            // Pequeño delay para que la navegación inicie
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        setCambiando(true);

        try {
            await cambiarModo(nuevoModo);
            
            // ✅ Cerrar modal/dropdown si existe el callback
            onModoChanged?.();

            notificar.exito(
                nuevoModo === 'comercial'
                    ? 'Cambiaste a modo Comercial'
                    : 'Cambiaste a modo Personal'
            );
        } catch (error) {
            notificar.error(
                error instanceof Error ? error.message : 'Error al cambiar modo'
            );
        } finally {
            setCambiando(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Clases dinámicas según tamaño
    // ---------------------------------------------------------------------------
    const clases = {
        // Badge estático (solo personal)
        badgeContainer: grande
            ? 'gap-1.5 px-3 py-2'
            : 'gap-1.5 lg:gap-1 2xl:gap-2 px-3 lg:px-2 2xl:px-4 py-1.5 lg:py-1 2xl:py-2',
        badgeIcono: grande
            ? 'w-[18px] h-[18px]'
            : 'w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4',
        badgeTexto: grande
            ? 'text-sm font-semibold'
            : 'text-xs lg:text-[10px] 2xl:text-sm font-semibold',

        // Toggle container
        toggleContainer: grande
            ? 'p-0.5'
            : 'p-0.5 lg:p-0.5 2xl:p-1',

        // Botones del toggle
        boton: grande
            ? 'gap-1.5 px-2.5 py-2 text-sm'
            : 'gap-1.5 lg:gap-1 2xl:gap-2 px-3 lg:px-2 2xl:px-4 py-1.5 lg:py-1 2xl:py-2 text-xs lg:text-[10px] 2xl:text-sm',
        botonIcono: grande
            ? 'w-[18px] h-[18px]'
            : 'w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4',

        // Indicador activo
        indicador: grande
            ? 'w-8 h-0.5'
            : 'w-6 lg:w-5 2xl:w-8 h-0.5',
    };

    // ---------------------------------------------------------------------------
    // Render: Usuario SOLO con modo Personal (badge estático)
    // ---------------------------------------------------------------------------
    if (!tieneModoComercial) {
        return (
            <div className={`flex items-center justify-center ${clases.badgeContainer} bg-linear-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm`}>
                <User className={`${clases.badgeIcono} text-white`} />
                <span className={`text-white ${clases.badgeTexto}`}>
                    Cuenta Personal
                </span>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render: Usuario con AMBOS modos (toggle interactivo)
    // ---------------------------------------------------------------------------
    return (
        <div className={`flex bg-gray-100 rounded-lg ${clases.toggleContainer} shadow-inner`}>
            {/* Botón Personal */}
            <button
                onClick={() => handleCambiarModo('personal')}
                disabled={cambiando}
                className={`
          relative flex items-center justify-center ${clases.boton}
          rounded-md font-semibold
          transition-colors duration-150
          ${modoActivo === 'personal'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }
          ${cambiando ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
            >
                <User className={clases.botonIcono} />
                <span>Personal</span>

                {/* Indicador activo */}
                {modoActivo === 'personal' && (
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${clases.indicador} bg-blue-500 rounded-full`} />
                )}
            </button>

            {/* Botón Comercial */}
            <button
                onClick={() => handleCambiarModo('comercial')}
                disabled={cambiando}
                className={`
          relative flex items-center justify-center ${clases.boton}
          rounded-md font-semibold
          transition-colors duration-150
          ${modoActivo === 'comercial'
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }
          ${cambiando ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
            >
                <Store className={clases.botonIcono} />
                <span>Comercial</span>

                {/* Indicador activo */}
                {modoActivo === 'comercial' && (
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${clases.indicador} bg-orange-500 rounded-full`} />
                )}
            </button>
        </div>
    );
}

export default ToggleModoUsuario;