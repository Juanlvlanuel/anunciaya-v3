/**
 * useChatYASession.ts
 * ====================
 * Adaptador de sesión unificado para ChatYA.
 *
 * ChatYA puede ser usado por:
 * 1. Usuarios AnunciaYA (sesión en useAuthStore) — modo personal o comercial
 * 2. Empleados/Gerentes/Dueños de ScanYA (sesión en useScanYAStore) — siempre modo comercial
 *
 * Este hook abstrae el origen de la sesión y expone una interfaz única
 * para que ChatOverlay y componentes internos no necesiten checks dispersos.
 *
 * También exporta `obtenerMiIdChatYA()` como función pura para contextos
 * no-React (stores Zustand, callbacks, socket listeners).
 *
 * UBICACIÓN: apps/web/src/hooks/useChatYASession.ts
 */

import { useAuthStore } from '../stores/useAuthStore';
import { useScanYAStore } from '../stores/useScanYAStore';

export interface SesionChatYA {
  /** true si hay alguna sesión activa (AnunciaYA o ScanYA) */
  autenticado: boolean;
  /** ID del usuario en contexto de ChatYA (dueño del negocio para ScanYA) */
  miId: string;
  /** Modo de ChatYA: personal o comercial */
  modo: 'personal' | 'comercial';
  /** Sucursal activa (solo en modo comercial) */
  sucursalId: string | null;
  /** Origen de la sesión */
  origen: 'anunciaya' | 'scanya';
}

/**
 * Hook reactivo — para componentes React.
 * Prioriza AnunciaYA sobre ScanYA si ambas existen.
 */
export function useChatYASession(): SesionChatYA {
  const authUsuario = useAuthStore((s) => s.usuario);
  const scanYAUsuario = useScanYAStore((s) => s.usuario);

  if (authUsuario) {
    return {
      autenticado: true,
      miId: authUsuario.id,
      modo: (authUsuario.modoActivo as 'personal' | 'comercial') || 'personal',
      sucursalId: authUsuario.sucursalActiva || null,
      origen: 'anunciaya',
    };
  }

  if (scanYAUsuario) {
    return {
      autenticado: true,
      miId: scanYAUsuario.negocioUsuarioId,
      modo: 'comercial',
      sucursalId: scanYAUsuario.sucursalId || null,
      origen: 'scanya',
    };
  }

  return {
    autenticado: false,
    miId: '',
    modo: 'personal',
    sucursalId: null,
    origen: 'anunciaya',
  };
}

// =============================================================================
// HELPER NO-REACT: para stores Zustand, callbacks, socket listeners
// =============================================================================

/**
 * Obtiene el ID del usuario actual en contexto de ChatYA.
 * - AnunciaYA: usuario.id
 * - ScanYA: negocioUsuarioId (ID del dueño, porque el empleado opera como el negocio)
 *
 * Uso: dentro de stores, callbacks, o cualquier lugar fuera de componentes React.
 */
export function obtenerMiIdChatYA(): string {
  const authUsuario = useAuthStore.getState().usuario;
  if (authUsuario) return authUsuario.id;

  const scanYAUsuario = useScanYAStore.getState().usuario;
  if (scanYAUsuario) return scanYAUsuario.negocioUsuarioId;

  return '';
}

/**
 * Obtiene el modo activo de ChatYA desde cualquier contexto.
 */
export function obtenerModoChatYA(): 'personal' | 'comercial' {
  const authUsuario = useAuthStore.getState().usuario;
  if (authUsuario) return (authUsuario.modoActivo as 'personal' | 'comercial') || 'personal';

  const scanYAUsuario = useScanYAStore.getState().usuario;
  if (scanYAUsuario) return 'comercial';

  return 'personal';
}

/**
 * Obtiene la sucursal activa de ChatYA desde cualquier contexto.
 */
export function obtenerSucursalChatYA(): string | null {
  const authUsuario = useAuthStore.getState().usuario;
  if (authUsuario) return authUsuario.sucursalActiva || null;

  const scanYAUsuario = useScanYAStore.getState().usuario;
  if (scanYAUsuario) return scanYAUsuario.sucursalId || null;

  return null;
}

/**
 * ¿Hay alguna sesión activa para ChatYA?
 */
export function estaAutenticadoChatYA(): boolean {
  return !!(useAuthStore.getState().usuario || useScanYAStore.getState().usuario);
}
