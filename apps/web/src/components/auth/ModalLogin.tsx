/**
 * ModalLogin.tsx
 * ===============
 * Modal de autenticación con múltiples vistas internas.
 *
 * ¿Qué hace?
 * - Contiene 3 vistas: Login, 2FA, Recuperar
 * - Maneja la navegación entre vistas sin cerrar el modal
 * - Se conecta con useUiStore para abrir/cerrar
 * - Usa ModalAdaptativo: ModalBottom en móvil, modal centrado en desktop
 *
 * Vistas:
 * - login: Formulario de inicio de sesión
 * - 2fa: Verificación de dos factores (si el usuario tiene 2FA activo)
 * - recuperar: Flujo de recuperación de contraseña (2 pasos)
 *
 * Ubicación: apps/web/src/components/auth/ModalLogin.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, X } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { VistaLogin } from './vistas/VistaLogin';
import { Vista2FA } from './vistas/Vista2FA';
import { VistaRecuperar } from './vistas/VistaRecuperar';
import { VistaCambiarContrasena } from './vistas/VistaCambiarContrasena';

// =============================================================================
// TIPOS
// =============================================================================

/** Vistas disponibles en el modal */
export type VistaAuth = 'login' | '2fa' | 'recuperar' | 'cambiarContrasena';

/** Datos que se pasan entre vistas */
export interface DatosAuth {
  /** Email del usuario (para pasar entre vistas) */
  email: string;
  /** Token temporal de 2FA (devuelto por el backend) */
  tokenTemporal2FA: string;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const GRADIENTE = {
  bg: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
  shadow: 'rgba(29, 78, 216, 0.4)',
  handle: 'rgba(255,255,255,0.4)',
};

const VISTAS_CONFIG = {
  login: {
    Icono: Lock,
    titulo: 'Iniciar sesión',
    subtitulo: 'Accede a tu cuenta AnunciaYA',
  },
  '2fa': {
    Icono: ShieldCheck,
    titulo: 'Verificación',
    subtitulo: 'Confirma tu identidad',
  },
  recuperar: {
    Icono: KeyRound,
    titulo: 'Recuperar contraseña',
    subtitulo: 'Restablece tu acceso',
  },
  cambiarContrasena: {
    Icono: KeyRound,
    titulo: 'Cambiar contraseña',
    subtitulo: 'Crea tu contraseña definitiva',
  },
} as const;

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
  // Handlers
  // ---------------------------------------------------------------------------

  const cambiarVista = useCallback((vista: VistaAuth) => {
    setVistaActual(vista);
  }, []);

  const actualizarDatos = useCallback((datos: Partial<DatosAuth>) => {
    setDatosAuth((prev) => ({ ...prev, ...datos }));
  }, []);

  const handleCerrar = useCallback(() => {
    cerrarModalLogin();
    setTimeout(() => {
      setVistaActual('login');
      setDatosAuth({ email: '', tokenTemporal2FA: '' });
    }, 150);
  }, [cerrarModalLogin]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const { Icono, titulo, subtitulo } = VISTAS_CONFIG[vistaActual];

  return (
    <ModalAdaptativo
      abierto={modalLoginAbierto}
      onCerrar={handleCerrar}
      ancho="sm"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      alturaMaxima="lg"
      headerOscuro
      colorHandle={GRADIENTE.handle}
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-none">

        {/* Header gradiente */}
        <div
          className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
          style={{ background: GRADIENTE.bg, boxShadow: `0 4px 16px ${GRADIENTE.shadow}` }}
        >
          {/* Círculos decorativos */}
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
            {/* Ícono de vista */}
            <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
              <Icono className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            </div>
            {/* Título + subtítulo */}
            <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">{titulo}</h3>
              <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-white/70">{subtitulo}</span>
            </div>
            {/* Botón cerrar */}
            <button
              type="button"
              onClick={handleCerrar}
              className="p-2 lg:p-1.5 2xl:p-2 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-white/10 hover:bg-white/20 shrink-0 lg:cursor-pointer"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Contenido dinámico según la vista */}
        <div className="flex-1 overflow-y-auto">
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
          {vistaActual === 'cambiarContrasena' && (
            <VistaCambiarContrasena
              tokenTemporal={datosAuth.tokenTemporal2FA}
              onCambiarVista={cambiarVista}
              onCerrarModal={handleCerrar}
            />
          )}
        </div>

      </div>
    </ModalAdaptativo>
  );
}

export default ModalLogin;
