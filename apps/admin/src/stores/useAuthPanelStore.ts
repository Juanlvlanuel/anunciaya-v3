/**
 * useAuthPanelStore.ts
 * =====================
 * Sesión del Panel Admin, AISLADA de la app pública: usa su propio prefijo de
 * localStorage (`ayadmin_`) y su propio store. Que la app web tenga (o no)
 * sesión no afecta al Panel y viceversa.
 *
 * Para el andamiaje del login solo se necesita: guardar/limpiar la sesión e
 * hidratar al cargar. El rol de equipo y la región llegan después vía
 * /api/admin/yo (se sumarán al construir el shell).
 *
 * Ubicación: apps/admin/src/stores/useAuthPanelStore.ts
 */

import { create } from 'zustand';
import { queryClient } from '../config/queryClient';

const PREFIJO = 'ayadmin_';
const CLAVES = {
  accessToken: `${PREFIJO}access_token`,
  refreshToken: `${PREFIJO}refresh_token`,
  usuario: `${PREFIJO}usuario`,
  ultimaActividad: `${PREFIJO}ultima_actividad`,
} as const;

// Tiempos de inactividad (en milisegundos) — mismos valores que apps/web
// (docs/arquitectura/Autenticacion.md): 55 min de uso → aviso con cuenta
// regresiva de 5 min → cierre. Independiente de la duración del access token
// (1h, renovado solo mientras el usuario sigue activo).
const TIEMPO_INACTIVIDAD_TOTAL = 60 * 60 * 1000; // 60 minutos
const TIEMPO_AVISO_ANTES = 5 * 60 * 1000;         // 5 minutos antes
const TIEMPO_HASTA_AVISO = TIEMPO_INACTIVIDAD_TOTAL - TIEMPO_AVISO_ANTES; // 55 minutos

export type RolEquipo = 'superadmin' | 'gerente' | 'vendedor';

/** Datos mínimos del miembro de equipo en sesión. */
export interface UsuarioPanel {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  avatarUrl?: string | null;
  rolEquipo?: RolEquipo | null;
  regionId?: string | null;
  regionNombre?: string | null;
}

interface EstadoAuthPanel {
  usuario: UsuarioPanel | null;
  accessToken: string | null;
  refreshToken: string | null;
  hidratado: boolean;
  mostrarModalInactividad: boolean;
  tiempoRestante: number; // Segundos restantes para el cierre por inactividad

  estaAutenticado: boolean;

  iniciarSesion: (
    usuario: UsuarioPanel,
    accessToken: string,
    refreshToken: string,
  ) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  cerrarSesion: () => void;
  hidratar: () => void;

  // Inactividad
  resetearTimerInactividad: () => void;
  continuarSesion: () => void;
  cerrarPorInactividad: () => void;
  _iniciarTimerInactividad: () => void;
  _limpiarTimers: () => void;
  _actualizarTiempoRestante: () => void;
  _verificarInactividadAlRegresar: () => void;
}

// Variables de timer fuera del store para evitar que Zustand las serialice.
let timerAviso: ReturnType<typeof setTimeout> | null = null;
let intervalContador: ReturnType<typeof setInterval> | null = null;

function leerStorage(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

export const useAuthPanelStore = create<EstadoAuthPanel>((set, get) => ({
  usuario: null,
  accessToken: null,
  refreshToken: null,
  hidratado: false,
  mostrarModalInactividad: false,
  tiempoRestante: 300,

  get estaAutenticado() {
    const s = get();
    return !!s.usuario && !!s.accessToken;
  },

  iniciarSesion: (usuario, accessToken, refreshToken) => {
    // Cinturón: por si se entra sin pasar por un logout previo (p. ej. token caducado
    // y se vuelve a loguear) — no heredar caché de datos de otra sesión.
    queryClient.clear();
    localStorage.setItem(CLAVES.accessToken, accessToken);
    localStorage.setItem(CLAVES.refreshToken, refreshToken);
    localStorage.setItem(CLAVES.usuario, JSON.stringify(usuario));
    set({ usuario, accessToken, refreshToken, hidratado: true });
    get()._iniciarTimerInactividad();
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem(CLAVES.accessToken, accessToken);
    localStorage.setItem(CLAVES.refreshToken, refreshToken);
    set({ accessToken, refreshToken });
  },

  cerrarSesion: () => {
    // Raíz del fix: borrar TODA la caché de React Query para no arrastrar datos del
    // usuario anterior (lista/ciudades/vendedores/detalle) a la siguiente sesión.
    // Cubre todos los caminos de salida (logout, /yo falla, refresh falla en api.ts).
    queryClient.clear();
    get()._limpiarTimers();
    localStorage.removeItem(CLAVES.accessToken);
    localStorage.removeItem(CLAVES.refreshToken);
    localStorage.removeItem(CLAVES.usuario);
    set({ usuario: null, accessToken: null, refreshToken: null, mostrarModalInactividad: false, tiempoRestante: 300 });
  },

  hidratar: () => {
    const accessToken = leerStorage(CLAVES.accessToken);
    const refreshToken = leerStorage(CLAVES.refreshToken);
    const usuarioStr = leerStorage(CLAVES.usuario);

    let usuario: UsuarioPanel | null = null;
    if (usuarioStr) {
      try {
        usuario = JSON.parse(usuarioStr) as UsuarioPanel;
      } catch {
        usuario = null;
      }
    }

    set({ usuario, accessToken, refreshToken, hidratado: true });
    if (usuario && accessToken) {
      get()._iniciarTimerInactividad();
    }
  },

  // ---------------------------------------------------------------------------
  // Inactividad
  // ---------------------------------------------------------------------------
  resetearTimerInactividad: () => {
    const state = get();
    if (!state.usuario || !state.accessToken) return;
    // Si el modal ya está visible, no resetear: el usuario debe hacer clic en "Continuar".
    if (state.mostrarModalInactividad) return;

    localStorage.setItem(CLAVES.ultimaActividad, String(Date.now()));
    state._iniciarTimerInactividad();
  },

  continuarSesion: () => {
    set({ mostrarModalInactividad: false, tiempoRestante: 300 });
    get()._iniciarTimerInactividad();
  },

  cerrarPorInactividad: () => {
    get().cerrarSesion();
  },

  _iniciarTimerInactividad: () => {
    const state = get();
    state._limpiarTimers();
    if (!state.usuario || !state.accessToken) return;

    localStorage.setItem(CLAVES.ultimaActividad, String(Date.now()));

    timerAviso = setTimeout(() => {
      set({ mostrarModalInactividad: true, tiempoRestante: 300 });
      state._actualizarTiempoRestante();
    }, TIEMPO_HASTA_AVISO);
  },

  _limpiarTimers: () => {
    if (timerAviso) {
      clearTimeout(timerAviso);
      timerAviso = null;
    }
    if (intervalContador) {
      clearInterval(intervalContador);
      intervalContador = null;
    }
  },

  _actualizarTiempoRestante: () => {
    if (intervalContador) clearInterval(intervalContador);

    intervalContador = setInterval(() => {
      const state = get();
      if (!state.mostrarModalInactividad) {
        if (intervalContador) {
          clearInterval(intervalContador);
          intervalContador = null;
        }
        return;
      }

      const nuevoTiempo = state.tiempoRestante - 1;
      if (nuevoTiempo <= 0) {
        set({ tiempoRestante: 0 });
        if (intervalContador) {
          clearInterval(intervalContador);
          intervalContador = null;
        }
        get().cerrarPorInactividad();
      } else {
        set({ tiempoRestante: nuevoTiempo });
      }
    }, 1000);
  },

  _verificarInactividadAlRegresar: () => {
    const state = get();
    if (!state.usuario || !state.accessToken) return;

    const ultimaActividadStr = leerStorage(CLAVES.ultimaActividad);
    if (!ultimaActividadStr) return;

    const ultimaActividad = parseInt(ultimaActividadStr, 10);
    const transcurrido = Date.now() - ultimaActividad;

    if (transcurrido >= TIEMPO_INACTIVIDAD_TOTAL) {
      // Pasó 1 hora o más → cierre directo, sin modal (nadie lo va a ver de todos modos).
      state._limpiarTimers();
      get().cerrarPorInactividad();
    } else if (transcurrido >= TIEMPO_HASTA_AVISO) {
      // Pasó más de 55 min → mostrar modal con el tiempo real restante.
      state._limpiarTimers();
      const tiempoRestanteReal = Math.floor((TIEMPO_INACTIVIDAD_TOTAL - transcurrido) / 1000);
      set({ mostrarModalInactividad: true, tiempoRestante: tiempoRestanteReal });
      get()._actualizarTiempoRestante();
    } else {
      // Menos de 55 min → reiniciar el timer con el tiempo residual correcto.
      state._limpiarTimers();
      const tiempoResidualHastaAviso = TIEMPO_HASTA_AVISO - transcurrido;
      timerAviso = setTimeout(() => {
        set({ mostrarModalInactividad: true, tiempoRestante: 300 });
        get()._actualizarTiempoRestante();
      }, tiempoResidualHastaAviso);
    }
  },
}));

// =============================================================================
// DETECCIÓN DE ACTIVIDAD DEL USUARIO
// =============================================================================

const EVENTOS_ACTIVIDAD = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const;

/** Registra los listeners de actividad. Llamar una sola vez al montar la app. */
export function iniciarDeteccionActividad(): () => void {
  const handleActividad = () => {
    useAuthPanelStore.getState().resetearTimerInactividad();
  };

  EVENTOS_ACTIVIDAD.forEach((evento) => {
    window.addEventListener(evento, handleActividad, { passive: true });
  });

  return () => {
    EVENTOS_ACTIVIDAD.forEach((evento) => {
      window.removeEventListener(evento, handleActividad);
    });
  };
}
