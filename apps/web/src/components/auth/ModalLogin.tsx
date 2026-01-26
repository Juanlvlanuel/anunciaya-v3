/**
 * ModalLogin.tsx
 * ===============
 * Modal de autenticación con múltiples vistas internas.
 *
 * ¿Qué hace?
 * - Contiene 3 vistas: Login, 2FA, Recuperar
 * - Maneja la navegación entre vistas sin cerrar el modal
 * - Se conecta con useUiStore para abrir/cerrar
 * - Modal centrado con scroll interno si el contenido es largo
 *
 * Vistas:
 * - login: Formulario de inicio de sesión
 * - 2fa: Verificación de dos factores (si el usuario tiene 2FA activo)
 * - recuperar: Flujo de recuperación de contraseña (2 pasos)
 *
 * Ubicación: apps/web/src/components/auth/ModalLogin.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { VistaLogin } from './vistas/VistaLogin';
import { Vista2FA } from './vistas/Vista2FA';
import { VistaRecuperar } from './vistas/VistaRecuperar';

// =============================================================================
// TIPOS
// =============================================================================

/** Vistas disponibles en el modal */
export type VistaAuth = 'login' | '2fa' | 'recuperar';

/** Datos que se pasan entre vistas */
export interface DatosAuth {
  /** Email del usuario (para pasar entre vistas) */
  email: string;
  /** Token temporal de 2FA (devuelto por el backend) */
  tokenTemporal2FA: string;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalLogin() {
  // ---------------------------------------------------------------------------
  // Estado global (Zustand)
  // ---------------------------------------------------------------------------
  const {
    modalLoginAbierto,
    cerrarModalLogin,
    vistaModalLogin,
    datos2FA,
  } = useUiStore();

  // ---------------------------------------------------------------------------
  // Estado local
  // ---------------------------------------------------------------------------
  // Vista inicial viene del store (para soportar abrir directo en 2FA)
  const [vistaActual, setVistaActual] = useState<VistaAuth>(vistaModalLogin);
  const [datosAuth, setDatosAuth] = useState<DatosAuth>({
    email: datos2FA?.email || '',
    tokenTemporal2FA: datos2FA?.tokenTemporal || '',
  });

  // Sincronizar cuando el store cambia (ej: abrirModal2FA desde PaginaLanding)
  useEffect(() => {
    if (modalLoginAbierto) {
      setVistaActual(vistaModalLogin);
      if (datos2FA) {
        setDatosAuth({
          email: datos2FA.email,
          tokenTemporal2FA: datos2FA.tokenTemporal,
        });
      }
    }
  }, [modalLoginAbierto, vistaModalLogin, datos2FA]);

  // ---------------------------------------------------------------------------
  // Bloquear scroll del body cuando el modal está abierto
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (modalLoginAbierto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [modalLoginAbierto]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Cambia a otra vista del modal
   */
  const cambiarVista = useCallback((vista: VistaAuth) => {
    setVistaActual(vista);
  }, []);

  /**
   * Actualiza los datos compartidos entre vistas
   */
  const actualizarDatos = useCallback((datos: Partial<DatosAuth>) => {
    setDatosAuth((prev) => ({ ...prev, ...datos }));
  }, []);

  /**
   * Cierra el modal y resetea el estado
   */
  const handleCerrar = useCallback(() => {
    cerrarModalLogin();
    // Resetear después de la animación
    setTimeout(() => {
      setVistaActual('login');
      setDatosAuth({ email: '', tokenTemporal2FA: '' });
    }, 150);
  }, [cerrarModalLogin]);

  /**
   * Maneja clic en el overlay (cierra el modal)
   */
  const handleClickOverlay = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCerrar();
    }
  };

  /**
   * Maneja tecla Escape
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCerrar();
      }
    },
    [handleCerrar]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // No renderizar si no está abierto
  if (!modalLoginAbierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClickOverlay}
      />

      {/* Contenedor del modal - centrado con scroll interno */}
      <div
        className="
          relative w-full max-w-md 
          bg-white rounded-2xl shadow-xl
          max-h-[90vh] overflow-y-auto
          lg:scale-75 2xl:scale-100 origin-center
        "
      >
        {/* Botón cerrar */}
        <button
          onClick={handleCerrar}
          className="
            absolute top-4 right-4 p-1.5 
            text-gray-400 hover:text-gray-600 
            rounded-lg hover:bg-gray-100 
            transition-colors z-10
          "
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        {/* Contenido dinámico según la vista */}
        {vistaActual === 'login' && (
          <VistaLogin
            onCambiarVista={cambiarVista}
            onActualizarDatos={actualizarDatos}
            onCerrarModal={handleCerrar}
          />
        )}

        {vistaActual === '2fa' && (
          <Vista2FA
            tokenTemporal={datosAuth.tokenTemporal2FA}
            onCambiarVista={cambiarVista}
            onCerrarModal={handleCerrar}
          />
        )}

        {vistaActual === 'recuperar' && (
          <VistaRecuperar
            emailInicial={datosAuth.email}
            onCambiarVista={cambiarVista}
            onActualizarDatos={actualizarDatos}
          />
        )}
      </div>
    </div>
  );
}

export default ModalLogin;