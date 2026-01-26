/**
 * ============================================================================
 * MODAL: ModalAuthRequerido
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/compartir/ModalAuthRequerido.tsx
 * 
 * PROPÓSITO:
 * Modal que se muestra cuando un usuario sin login intenta realizar acciones
 * que requieren autenticación (like, save, chat, etc.)
 * 
 * CREADO: Enero 2026 - Sistema de Auth Opcional
 * ACTUALIZADO: Enero 2026 - Usa Modal.tsx base + diseño compacto
 */

import { useNavigate } from 'react-router-dom';
import { Lock, Heart, Bookmark, MessageCircle, LogIn, UserPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalAuthRequeridoProps {
    /** Controla si el modal está abierto */
    abierto: boolean;
    
    /** Función para cerrar el modal */
    onCerrar: () => void;
    
    /** Tipo de acción que requiere auth */
    accion?: 'like' | 'save' | 'chat' | 'general';
    
    /** URL a la que redirigir después del login (opcional) */
    urlRetorno?: string;
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const CONFIG = {
    like: {
        icon: Heart,
        titulo: '¿Te gusta este negocio?',
        descripcion: 'Inicia sesión para dar like y guardar tus favoritos.',
        colorIcono: 'text-rose-500',
        bgIcono: 'bg-rose-50',
    },
    save: {
        icon: Bookmark,
        titulo: 'Guarda tus favoritos',
        descripcion: 'Inicia sesión para guardar y acceder cuando quieras.',
        colorIcono: 'text-amber-500',
        bgIcono: 'bg-amber-50',
    },
    chat: {
        icon: MessageCircle,
        titulo: '¡Chatea con el negocio!',
        descripcion: 'Inicia sesión para enviar mensajes directos.',
        colorIcono: 'text-blue-500',
        bgIcono: 'bg-blue-50',
    },
    general: {
        icon: Lock,
        titulo: 'Inicia sesión',
        descripcion: 'Esta acción requiere iniciar sesión.',
        colorIcono: 'text-slate-500',
        bgIcono: 'bg-slate-100',
    },
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalAuthRequerido({
    abierto,
    onCerrar,
    accion = 'general',
    urlRetorno,
}: ModalAuthRequeridoProps) {
    const navigate = useNavigate();

    const { icon: Icon, titulo, descripcion, colorIcono, bgIcono } = CONFIG[accion];

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------
    const handleLogin = () => {
        if (urlRetorno) {
            sessionStorage.setItem('ay_ruta_pendiente', urlRetorno);
        }
        navigate('/login');
    };

    const handleRegistro = () => {
        if (urlRetorno) {
            sessionStorage.setItem('ay_ruta_pendiente', urlRetorno);
        }
        navigate('/registro');
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <Modal
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
        >
            <div className="p-6">
                {/* Header con icono */}
                <div className="flex items-center gap-3 mb-5">
                    <div className={`w-12 h-12 ${bgIcono} rounded-xl flex items-center justify-center shrink-0`}>
                        <Icon className={`w-6 h-6 ${colorIcono}`} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {titulo}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {descripcion}
                        </p>
                    </div>
                </div>
                
                {/* Botones */}
                <div className="space-y-3">
                    {/* Iniciar Sesión - Azul sólido */}
                    <button
                        onClick={handleLogin}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <LogIn className="w-5 h-5" />
                        Iniciar Sesión
                    </button>
                    
                    {/* Crear Cuenta - Borde azul */}
                    <button
                        onClick={handleRegistro}
                        className="w-full py-3 px-4 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <UserPlus className="w-5 h-5" />
                        Crear Cuenta Gratis
                    </button>
                </div>
                
                {/* Link continuar */}
                <button
                    onClick={onCerrar}
                    className="w-full py-3 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors mt-4 cursor-pointer"
                >
                    Continuar explorando →
                </button>
            </div>
        </Modal>
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default ModalAuthRequerido;