/**
 * useAuthStore.ts
 * ================
 * Store de Zustand para manejo de autenticación.
 *
 * ¿Qué hace este archivo?
 * - Guarda el estado del usuario y tokens
 * - Persiste tokens en localStorage
 * - Maneja el sistema de inactividad (1 hora con aviso a 55 min)
 * - Hidrata el estado al cargar la app
 * - Guarda datos de Google OAuth pendientes para registro
 *
 * Ubicación: apps/web/src/stores/useAuthStore.ts
 */

import { create } from 'zustand';
import { esTokenExpirado } from '../utils/tokenUtils'; // ← AGREGAR ESTA LÍNEA
import api from '../services/api';
import { conectarSocket, desconectarSocket } from '../services/socketService';

// =============================================================================
// CONSTANTES
// =============================================================================

// Prefijo para las claves de localStorage (evita colisiones)
const STORAGE_PREFIX = 'ay_';
const STORAGE_KEYS = {
  accessToken: `${STORAGE_PREFIX}access_token`,
  refreshToken: `${STORAGE_PREFIX}refresh_token`,
  usuario: `${STORAGE_PREFIX}usuario`,
} as const;

// Tiempos de inactividad (en milisegundos) - ✅ VALORES DE PRODUCCIÓN
const TIEMPO_INACTIVIDAD_TOTAL = 60 * 60 * 1000; // 60 minutos
const TIEMPO_AVISO_ANTES = 5 * 60 * 1000; // 5 minutos antes
const TIEMPO_HASTA_AVISO = TIEMPO_INACTIVIDAD_TOTAL - TIEMPO_AVISO_ANTES; // 55 minutos

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Datos del usuario (sin información sensible)
 */
export interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  correo: string;
  perfil: 'personal' | 'comercial';
  membresia: number;
  correoVerificado: boolean;
  telefono?: string | null;
  avatarUrl?: string | null;
  alias?: string | null;
  dobleFactorHabilitado?: boolean;
  autenticadoPorGoogle?: boolean;
  fechaNacimiento?: string | null;
  genero?: string | null;
  ciudad?: string | null;
  calificacionPromedio?: string;
  totalCalificaciones?: number;
  tieneModoComercial: boolean;
  modoActivo: 'personal' | 'comercial';
  negocioId: string | null;
  sucursalActiva: string | null;
  sucursalAsignada: string | null;
  onboardingCompletado?: boolean;
  // Datos del negocio (modo comercial)
  nombreNegocio: string | null;
  correoNegocio: string | null;
  logoNegocio: string | null;
  fotoPerfilNegocio: string | null;
}

/**
 * Razón por la que se cerró la sesión
 */
export type RazonLogout = 'manual' | 'inactividad' | 'sesion_expirada' | 'error';

/**
 * Datos de Google OAuth pendientes para completar registro
 * Se usa cuando el usuario hace OAuth desde Landing y es usuario nuevo
 */
export interface DatosGooglePendiente {
  googleIdToken: string;  // Token JWT de Google (necesario para registro)
  correo: string;
  nombre: string;
  apellidos: string;
  avatar: string | null;
}

/**
 * Estado del store
 */
interface AuthState {
  // Estado
  usuario: Usuario | null;
  accessToken: string | null;
  refreshToken: string | null;
  cargando: boolean;
  hidratado: boolean;
  mostrarModalInactividad: boolean;
  tiempoRestante: number; // Segundos restantes para logout
  datosGooglePendiente: DatosGooglePendiente | null; // ← NUEVO

  // Computed
  isAuthenticated: boolean;

  // Acciones de autenticación
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUsuario: (usuario: Usuario) => void;
  loginExitoso: (usuario: Usuario, accessToken: string, refreshToken: string) => Promise<void>;
  logout: (razon?: RazonLogout) => void;
  hidratarAuth: () => Promise<void>;
  cambiarModo: (nuevoModo: 'personal' | 'comercial') => Promise<void>;
  recargarDatosUsuario: () => Promise<void>;

  // Acciones para sucursal activa
  setSucursalActiva: (sucursalId: string) => void;

  // Acciones de Google OAuth pendiente ← NUEVO
  setDatosGooglePendiente: (datos: DatosGooglePendiente) => void;
  limpiarDatosGooglePendiente: () => void;

  // Acciones de inactividad
  resetearTimerInactividad: () => void;
  continuarSesion: () => void;
  cerrarPorInactividad: () => void;

  // Acciones internas
  _iniciarTimerInactividad: () => void;
  _limpiarTimers: () => void;
  _actualizarTiempoRestante: () => void;
}

// =============================================================================
// VARIABLES DE TIMER (fuera del store para evitar serialización)
// =============================================================================

let timerAviso: ReturnType<typeof setTimeout> | null = null;
let timerLogout: ReturnType<typeof setTimeout> | null = null;
let intervalContador: ReturnType<typeof setInterval> | null = null;
let ultimaActividad: number = Date.now();

// =============================================================================
// HELPERS DE LOCALSTORAGE
// =============================================================================

/**
 * Guarda un valor en localStorage de forma segura
 */
function guardarEnStorage(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch (error) {
    console.warn('Error guardando en localStorage:', error);
  }
}

/**
 * Obtiene un valor de localStorage de forma segura
 */
function obtenerDeStorage(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch (error) {
    console.warn('Error leyendo localStorage:', error);
    return null;
  }
}

/**
 * Elimina un valor de localStorage de forma segura
 */
function eliminarDeStorage(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch (error) {
    console.warn('Error eliminando de localStorage:', error);
  }
}

/**
 * Limpia todas las claves de auth del localStorage
 */
function limpiarStorageAuth(): void {
  eliminarDeStorage(STORAGE_KEYS.accessToken);
  eliminarDeStorage(STORAGE_KEYS.refreshToken);
  eliminarDeStorage(STORAGE_KEYS.usuario);
}

// =============================================================================
// STORE
// =============================================================================

export const useAuthStore = create<AuthState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  usuario: null,
  accessToken: null,
  refreshToken: null,
  cargando: true,
  hidratado: false,
  mostrarModalInactividad: false,
  tiempoRestante: 300,
  datosGooglePendiente: null, // ← NUEVO

  // Computed (se calcula en cada acceso)
  get isAuthenticated() {
    const state = get();
    return !!state.usuario && !!state.accessToken;
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Guardar tokens
  // ---------------------------------------------------------------------------
  setTokens: (accessToken: string, refreshToken: string) => {
    // Guardar en localStorage
    guardarEnStorage(STORAGE_KEYS.accessToken, accessToken);
    guardarEnStorage(STORAGE_KEYS.refreshToken, refreshToken);

    // Actualizar estado
    set({ accessToken, refreshToken });

    // Iniciar timer de inactividad
    get()._iniciarTimerInactividad();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Guardar usuario
  // ---------------------------------------------------------------------------
  setUsuario: (usuario: Usuario) => {
    // Guardar en localStorage
    guardarEnStorage(STORAGE_KEYS.usuario, JSON.stringify(usuario));

    // Actualizar estado (incluye hidratado y cargando para login directo)
    set({ usuario, hidratado: true, cargando: false });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Login exitoso (actualiza todo de una vez)
  // ---------------------------------------------------------------------------
  loginExitoso: async (usuario: Usuario, accessToken: string, refreshToken: string) => {

    // Guardar tokens
    guardarEnStorage(STORAGE_KEYS.accessToken, accessToken);
    guardarEnStorage(STORAGE_KEYS.refreshToken, refreshToken);

    // ✅ CRÍTICO: Configurar token en axios ANTES de hacer llamadas
    api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    // ========================================================================
    // INICIALIZAR SUCURSAL ACTIVA (modo comercial)
    // ========================================================================
    if (usuario.modoActivo === 'comercial' && usuario.negocioId && !usuario.sucursalActiva) {

      // CASO 1: Gerente con sucursal asignada → setear INMEDIATAMENTE
      if (usuario.sucursalAsignada) {
        usuario.sucursalActiva = usuario.sucursalAsignada;
      }
    }

    // ========================================================================
    // SETEAR USUARIO INMEDIATAMENTE (sin esperar carga de dueño)
    // ========================================================================
    guardarEnStorage(STORAGE_KEYS.usuario, JSON.stringify(usuario));

    set({
      usuario,
      accessToken,
      refreshToken,
      hidratado: true,
      cargando: false,
      datosGooglePendiente: null,
    });

    get()._iniciarTimerInactividad();

    // Conectar Socket.io
    conectarSocket();

    // Cargar notificaciones
    const { cargarNotificaciones } = (await import('./useNotificacionesStore')).default.getState();
    cargarNotificaciones(usuario.modoActivo);

    const { registrarListenerNotificaciones } = await import('./useNotificacionesStore');
    registrarListenerNotificaciones();

    // ========================================================================
    // CARGAR SUCURSAL PRINCIPAL EN BACKGROUND (solo dueños)
    // ========================================================================
    if (usuario.modoActivo === 'comercial' &&
      usuario.negocioId &&
      !usuario.sucursalActiva &&
      !usuario.sucursalAsignada) {

      // Ejecutar en background sin bloquear
      (async () => {
        try {
          const { obtenerSucursalPrincipal } = await import('../services/negociosService');
          const respuesta = await obtenerSucursalPrincipal(usuario.negocioId!);

          if (respuesta.success && respuesta.data) {
            // Usar la acción del store en lugar de actualizar manualmente
            get().setSucursalActiva(respuesta.data.id);
          } else {
            console.warn('⚠️ No se pudo cargar sucursal principal');
          }
        } catch (error) {
          console.error('❌ Error cargando sucursal principal:', error);
        }
      })();
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar modo (personal ↔ comercial)
  // ---------------------------------------------------------------------------
  cambiarModo: async (nuevoModo: 'personal' | 'comercial') => {
    const { usuario, accessToken } = get();

    // Validar que está autenticado
    if (!usuario || !accessToken) {
      throw new Error('No autenticado');
    }

    // Validar que tiene acceso al modo comercial
    if (nuevoModo === 'comercial' && !usuario.tieneModoComercial) {
      throw new Error('No tienes acceso al modo comercial');
    }

    // Guardar modo anterior para rollback
    const modoAnterior = usuario.modoActivo;

    // Actualización OPTIMISTA (instantánea)
    set({
      usuario: { ...usuario, modoActivo: nuevoModo },
    });

    // Recargar notificaciones del nuevo modo
    const { cambiarModo: cambiarModoNotificaciones } = (await import('./useNotificacionesStore')).default.getState();
    cambiarModoNotificaciones(nuevoModo);

    try {
      // Llamar al backend
      const response = await api.patch('/auth/modo', { modo: nuevoModo });

      if (response.data.success) {
        // El backend ahora devuelve sucursalActiva calculada correctamente:
        // - Modo comercial + gerente → sucursalAsignada
        // - Modo comercial + dueño → sucursalPrincipal
        // - Modo personal → null
        const {
          accessToken: nuevoToken,
          refreshToken: nuevoRefresh,
          modoActivo,
          tieneModoComercial,
          negocioId,
          sucursalActiva,  // ← NUEVO: el backend ya lo calcula
        } = response.data.data;

        // Actualizar usuario con datos del servidor
        const usuarioActualizado: Usuario = {
          ...usuario,
          modoActivo,
          tieneModoComercial,
          negocioId,
          sucursalActiva: sucursalActiva ?? null,  // ← NUEVO: usar valor del backend
        };

        // Guardar en localStorage
        guardarEnStorage(STORAGE_KEYS.accessToken, nuevoToken);
        guardarEnStorage(STORAGE_KEYS.refreshToken, nuevoRefresh);
        guardarEnStorage(STORAGE_KEYS.usuario, JSON.stringify(usuarioActualizado));

        // Actualizar estado
        set({
          usuario: usuarioActualizado,
          accessToken: nuevoToken,
          refreshToken: nuevoRefresh,
        });
      } else {
        // Revertir si el backend falla
        set({
          usuario: { ...usuario, modoActivo: modoAnterior },
        });
        throw new Error(response.data.message || 'Error al cambiar modo');
      }
    } catch (error) {
      // Revertir en caso de error
      set({
        usuario: { ...usuario, modoActivo: modoAnterior },
      });
      throw error;
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Recargar datos del usuario desde el servidor
  // ---------------------------------------------------------------------------
  recargarDatosUsuario: async () => {
    try {
      const response = await api.get('/auth/yo');

      if (response.data.success && response.data.data) {
        const usuario = response.data.data;

        // Actualizar en localStorage
        guardarEnStorage(STORAGE_KEYS.usuario, JSON.stringify(usuario));

        // Actualizar en estado
        set({ usuario });
      }
    } catch (error) {
      console.error('❌ Error recargando datos del usuario:', error);
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Establecer sucursal activa
  // ---------------------------------------------------------------------------
  setSucursalActiva: (sucursalId: string) => {
    const { usuario } = get();
    if (!usuario) return;

    // ⚠️ VALIDAR: Solo dueños pueden cambiar de sucursal
    // Gerentes tienen sucursalAsignada fija desde la BD
    const tieneNegocio = usuario.negocioId !== null;
    const tieneSucursalAsignada = usuario.sucursalAsignada !== null;

    // Si es gerente (tiene negocio pero NO puede cambiar sucursal)
    if (tieneNegocio && tieneSucursalAsignada) {
      console.warn('[AUTH] Solo dueños pueden cambiar de sucursal. Gerentes tienen sucursal fija.');
      return;
    }

    // Actualizar el usuario con la nueva sucursal activa
    const usuarioActualizado = {
      ...usuario,
      sucursalActiva: sucursalId,
    };

    // Guardar en localStorage
    guardarEnStorage(STORAGE_KEYS.usuario, JSON.stringify(usuarioActualizado));

    // Actualizar estado
    set({ usuario: usuarioActualizado });

  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cerrar sesión
  // ---------------------------------------------------------------------------
  logout: (razon: RazonLogout = 'manual') => {
    // Limpiar timers
    get()._limpiarTimers();

    // Limpiar localStorage
    limpiarStorageAuth();

    // Resetear estado
    set({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      cargando: false,
      mostrarModalInactividad: false,
      tiempoRestante: 300,
      datosGooglePendiente: null, // ← También limpiar esto
    });

    // Log para debugging

    // TODO: Llamar al endpoint /api/auth/logout para invalidar en el servidor
    // Esto se hará desde el componente que llame a logout()

    // Desconectar Socket.io
    desconectarSocket();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Hidratar autenticación (al cargar la app)
  // ---------------------------------------------------------------------------
  hidratarAuth: async () => {
    // Evitar doble hidratación
    if (get().hidratado) return;

    set({ cargando: true });

    try {
      // Paso 1: Obtener tokens de localStorage
      const accessToken = obtenerDeStorage(STORAGE_KEYS.accessToken);
      const refreshToken = obtenerDeStorage(STORAGE_KEYS.refreshToken);
      const usuarioStr = obtenerDeStorage(STORAGE_KEYS.usuario);

      // Si no hay tokens, no hay sesión
      if (!accessToken || !refreshToken) {
        set({ cargando: false, hidratado: true });
        return;
      }

      // ✅ VERIFICAR SI LOS TOKENS ESTÁN EXPIRADOS
      if (esTokenExpirado(accessToken) || esTokenExpirado(refreshToken)) {
        limpiarStorageAuth();
        set({
          cargando: false,
          hidratado: true,
          accessToken: null,
          refreshToken: null,
          usuario: null
        });
        return;
      }

      // Paso 2: Cargar usuario de localStorage temporalmente
      let usuarioLocal: Usuario | null = null;
      if (usuarioStr) {
        try {
          usuarioLocal = JSON.parse(usuarioStr);
        } catch {
          usuarioLocal = null;
        }
      }

      // Actualizar estado con datos locales (para UI rápida)
      set({
        accessToken,
        refreshToken,
        usuario: usuarioLocal,
      });

      // Paso 3: Obtener datos frescos del servidor
      try {
        const response = await api.get('/auth/yo');

        if (response.data.success && response.data.data) {
          const usuarioActualizado = response.data.data;

          // Actualizar en localStorage
          guardarEnStorage(STORAGE_KEYS.usuario, JSON.stringify(usuarioActualizado));

          // Actualizar en estado
          set({ usuario: usuarioActualizado });

        }
      } catch (error) {
        console.warn('⚠️ No se pudo actualizar usuario desde servidor, usando datos locales:', error);
        // Continuar con datos locales si falla
      }

      // Iniciar timer de inactividad
      get()._iniciarTimerInactividad();

      // Conectar Socket.io
      conectarSocket();

      // Cargar notificaciones
      const usuarioHidratado = get().usuario;
      if (usuarioHidratado) {
        const { cargarNotificaciones } = (await import('./useNotificacionesStore')).default.getState();
        cargarNotificaciones(usuarioHidratado.modoActivo);
        const { registrarListenerNotificaciones } = await import('./useNotificacionesStore');
        registrarListenerNotificaciones();
      }

      set({ cargando: false, hidratado: true });
    } catch (error) {
      console.error('Error hidratando auth:', error);
      // En caso de error, limpiar todo
      limpiarStorageAuth();
      set({
        usuario: null,
        accessToken: null,
        refreshToken: null,
        cargando: false,
        hidratado: true,
      });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Guardar datos de Google OAuth pendiente (NUEVO)
  // ---------------------------------------------------------------------------
  setDatosGooglePendiente: (datos: DatosGooglePendiente) => {
    set({ datosGooglePendiente: datos });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Limpiar datos de Google OAuth pendiente (NUEVO)
  // ---------------------------------------------------------------------------
  limpiarDatosGooglePendiente: () => {
    set({ datosGooglePendiente: null });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Resetear timer de inactividad
  // ---------------------------------------------------------------------------
  resetearTimerInactividad: () => {
    const state = get();

    // Solo si está autenticado
    if (!state.usuario || !state.accessToken) return;

    // Si el modal está visible, no resetear (el usuario debe hacer clic en "Continuar")
    if (state.mostrarModalInactividad) return;

    // Actualizar última actividad
    ultimaActividad = Date.now();

    // Reiniciar timers
    state._iniciarTimerInactividad();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Usuario hace clic en "Continuar" del modal
  // ---------------------------------------------------------------------------
  continuarSesion: () => {
    // Ocultar modal
    set({ mostrarModalInactividad: false, tiempoRestante: 300 });

    // Actualizar última actividad
    ultimaActividad = Date.now();

    // Reiniciar timers
    get()._iniciarTimerInactividad();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cerrar por inactividad
  // ---------------------------------------------------------------------------
  cerrarPorInactividad: () => {
    get().logout('inactividad');
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN INTERNA: Iniciar timer de inactividad
  // ---------------------------------------------------------------------------
  _iniciarTimerInactividad: () => {
    const state = get();

    // Limpiar timers anteriores
    state._limpiarTimers();

    // Solo si está autenticado
    if (!state.usuario || !state.accessToken) return;

    // Timer 1: Mostrar modal a los 55 minutos
    timerAviso = setTimeout(() => {
      set({ mostrarModalInactividad: true, tiempoRestante: 300 });

      // Iniciar contador regresivo
      state._actualizarTiempoRestante();
    }, TIEMPO_HASTA_AVISO);

    // DESHABILITADO:     // Timer 2: Logout a los 60 minutos
    // DESHABILITADO:     timerLogout = setTimeout(() => {
    // DESHABILITADO:       get().cerrarPorInactividad();
    // DESHABILITADO:     }, TIEMPO_INACTIVIDAD_TOTAL);
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN INTERNA: Limpiar todos los timers
  // ---------------------------------------------------------------------------
  _limpiarTimers: () => {
    if (timerAviso) {
      clearTimeout(timerAviso);
      timerAviso = null;
    }
    if (timerLogout) {
      clearTimeout(timerLogout);
      timerLogout = null;
    }
    if (intervalContador) {
      clearInterval(intervalContador);
      intervalContador = null;
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN INTERNA: Actualizar contador regresivo
  // ---------------------------------------------------------------------------
  _actualizarTiempoRestante: () => {
    // Limpiar intervalo anterior si existe
    if (intervalContador) {
      clearInterval(intervalContador);
    }

    // Actualizar cada segundo
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
        // CRÍTICO: Actualizar estado a 0 ANTES de detener intervalo
        set({ tiempoRestante: 0 });
        if (intervalContador) {
          clearInterval(intervalContador);
          intervalContador = null;
        }
        // DESHABILITADO: get().cerrarPorInactividad(); - El modal se mantiene abierto
      } else {
        set({ tiempoRestante: nuevoTiempo });
      }
    }, 1000);
  },
}));

// =============================================================================
// HOOK PARA DETECTAR ACTIVIDAD DEL USUARIO
// =============================================================================

/**
 * Eventos que indican actividad del usuario
 */
const EVENTOS_ACTIVIDAD = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const;

/**
 * Inicializa los listeners de actividad
 * IMPORTANTE: Llamar esto una sola vez cuando la app carga
 */
export function iniciarDeteccionActividad(): () => void {
  const handleActividad = () => {
    useAuthStore.getState().resetearTimerInactividad();
  };

  // Agregar listeners con { passive: true } para mejor performance
  EVENTOS_ACTIVIDAD.forEach((evento) => {
    window.addEventListener(evento, handleActividad, { passive: true });
  });

  // Retornar función de limpieza
  return () => {
    EVENTOS_ACTIVIDAD.forEach((evento) => {
      window.removeEventListener(evento, handleActividad);
    });
  };
}

// =============================================================================
// HELPER PARA FORMATEAR TIEMPO
// =============================================================================

/**
 * Formatea segundos a MM:SS
 * Ejemplo: 299 → "4:59"
 */
export function formatearTiempo(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;
  return `${minutos}:${segs.toString().padStart(2, '0')}`;
}

// Al final del archivo useAuthStore.ts

// 🧪 TEMPORAL: Exponer store para testing en consola
if (typeof window !== 'undefined') {
  (window as any).__AUTH_STORE__ = useAuthStore;
}
// =============================================================================
// SINCRONIZACIÓN DE TOKENS ENTRE PESTAÑAS
// =============================================================================

/**
 * Sincroniza tokens entre múltiples pestañas/tabs
 * 
 * ¿Qué hace?
 * - Detecta cuando OTRA pestaña actualiza los tokens en localStorage
 * - Actualiza automáticamente el estado del store en ESTA pestaña
 * - Evita el error "Sesión expirada" cuando tienes múltiples pestañas abiertas
 * 
 * ¿Cómo funciona?
 * - El navegador dispara un evento 'storage' cuando localStorage cambia
 * - SOLO se dispara en las OTRAS pestañas (no en la que hizo el cambio)
 * - Escuchamos ese evento y actualizamos nuestro estado
 * 
 * ¿Por qué lo necesitamos?
 * - Pestaña A renueva tokens → guarda en localStorage
 * - Pestaña B necesita enterarse de los nuevos tokens
 * - Sin esto, Pestaña B usa tokens viejos → error "Sesión expirada"
 * 
 * IMPORTANTE: Llamar esto una sola vez cuando la app carga
 */
export function iniciarSincronizacionTokens(): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    // CRÍTICO: Ignorar sincronización si estamos en rutas de ScanYA
    // ScanYA usa su propio store (useScanYAStore) con tokens sy_*
    if (window.location.pathname.startsWith('/scanya')) {
      return;
    }

    // Solo procesar cambios en nuestras claves de auth
    if (
      event.key === STORAGE_KEYS.accessToken ||
      event.key === STORAGE_KEYS.refreshToken ||
      event.key === STORAGE_KEYS.usuario
    ) {
      console.log('🔄 Sincronizando tokens desde otra pestaña...');

      const state = useAuthStore.getState();

      // Leer nuevos valores desde localStorage
      const nuevoAccessToken = obtenerDeStorage(STORAGE_KEYS.accessToken);
      const nuevoRefreshToken = obtenerDeStorage(STORAGE_KEYS.refreshToken);
      const nuevoUsuarioStr = obtenerDeStorage(STORAGE_KEYS.usuario);

      // Si se borraron los tokens (logout en otra pestaña)
      if (!nuevoAccessToken || !nuevoRefreshToken) {
        console.log('🚪 Logout detectado en otra pestaña');
        state.logout('sesion_expirada');
        return;
      }

      // Si hay tokens nuevos, actualizarlos
      if (nuevoAccessToken && nuevoRefreshToken) {
        // Parsear usuario si existe
        let nuevoUsuario = state.usuario;
        if (nuevoUsuarioStr) {
          try {
            nuevoUsuario = JSON.parse(nuevoUsuarioStr);
          } catch {
            nuevoUsuario = state.usuario;
          }
        }

        // Actualizar estado (sin escribir a localStorage para evitar loop infinito)
        useAuthStore.setState({
          accessToken: nuevoAccessToken,
          refreshToken: nuevoRefreshToken,
          usuario: nuevoUsuario,
        });

        console.log('✅ Tokens sincronizados exitosamente');
      }
    }
  };

  // Agregar listener
  window.addEventListener('storage', handleStorageChange);

  // Retornar función de limpieza
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}