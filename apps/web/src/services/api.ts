/**
 * api.ts
 * =======
 * Configuración de Axios con interceptores para manejo automático de tokens.
 *
 * ¿Qué hace este archivo?
 * - Configura Axios con la URL base del backend
 * - Agrega automáticamente el token a cada petición
 * - Agrega automáticamente sucursalId en modo comercial (multi-sucursal)
 * - Agrega automáticamente votanteSucursalId para likes/follows en modo comercial
 * - Maneja errores 401 intentando renovar el token
 * - Si la renovación falla, cierra la sesión
 *
 * Ubicación: apps/web/src/services/api.ts
 */

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
import { useScanYAStore } from '../stores/useScanYAStore';
import { notificar } from '../utils/notificaciones';

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

/**
 * URL base del backend
 * En desarrollo: localhost:4000
 * En producción: se configura con variable de entorno
 */
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Timeout para peticiones (10 segundos)
 */
const TIMEOUT = 10000;

/**
 * Rutas que NO deben llevar sucursalId automático
 * (rutas públicas, auth, etc.)
 */
const RUTAS_SIN_SUCURSAL = [
  '/auth/',
  '/p/',           // Rutas públicas
  '/onboarding/',
  '/negocios/publico/',
  '/articulos/publico/',
  '/guardados/',   // Guardados personales del usuario
  '/seguidos/',    // Seguidos personales del usuario
];

/**
 * Rutas de LOGIN donde un 401 significa "credenciales incorrectas"
 * (NO debe intentar refresh ni mostrar "Sesión expirada")
 */
const RUTAS_LOGIN = [
  '/auth/login',
  '/scanya/login-dueno',
  '/scanya/login-empleado',
];

// =============================================================================
// CREAR INSTANCIA DE AXIOS
// =============================================================================

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// =============================================================================
// CONTROL DE REFRESH (evitar múltiples refresh simultáneos)
// =============================================================================

/**
 * ¿Hay un refresh en progreso?
 */
let isRefreshing = false;

/**
 * Cola de peticiones que esperan el refresh
 */
let colaEsperando: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Procesa la cola de peticiones pendientes
 */
function procesarCola(token: string | null, error: Error | null): void {
  colaEsperando.forEach((peticion) => {
    if (error) {
      peticion.reject(error);
    } else if (token) {
      peticion.resolve(token);
    }
  });
  colaEsperando = [];
}

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Detectar si es una ruta de ScanYA
    const esScanYA = config.url?.startsWith('/scanya') || config.url?.startsWith('scanya');

    // Obtener tokens según el tipo de ruta
    let accessToken: string | null;
    let usuario: any;

    if (esScanYA) {
      // Usar tokens de ScanYA
      const stateScanYA = useScanYAStore.getState();
      accessToken = stateScanYA.accessToken;
      usuario = stateScanYA.usuario;
    } else {
      // Usar tokens de AnunciaYA
      const stateAY = useAuthStore.getState();
      accessToken = stateAY.accessToken;
      usuario = stateAY.usuario;
    }

    // 1. Si hay token, agregarlo al header
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // 2. Agregar sucursalId y votanteSucursalId automáticamente en modo comercial
    // (SOLO para rutas de AnunciaYA, ScanYA no usa este sistema)
    if (!esScanYA && usuario?.modoActivo === 'comercial') {
      const url = config.url || '';

      // Verificar que NO sea una ruta excluida
      // IMPORTANTE: Verificar SEGMENTOS completos para evitar falsos positivos
      // Ej: '/p/' debe excluir '/p/negocio/123' pero NO '/perfil'
      const esRutaExcluida = RUTAS_SIN_SUCURSAL.some(ruta => {
        // Normalizar: quitar / del final
        const rutaBase = ruta.endsWith('/') ? ruta.slice(0, -1) : ruta;
        
        // Verificar coincidencia de segmento completo:
        // 1. URL es exactamente la ruta
        // 2. URL comienza con la ruta seguida de '/'
        // 3. URL comienza con la ruta seguida de '?'
        return url === rutaBase || 
               url.startsWith(rutaBase + '/') || 
               url.startsWith(rutaBase + '?');
      });

      if (!esRutaExcluida) {
        // Inicializar params si no existe
        config.params = config.params || {};

        // Solo agregar si NO viene ya en los params
        // Buscar sucursalId en orden de prioridad:
        // 1. sucursalActiva (dueños con selector)
        // 2. sucursalAsignada (gerentes)
        const sucursalId = usuario.sucursalActiva || usuario.sucursalAsignada;

        if (sucursalId && !config.params.sucursalId) {
          config.params.sucursalId = sucursalId;
        }

        // Agregar votanteSucursalId para likes/follows (distingue modo personal vs comercial)
        if (sucursalId && !config.params.votanteSucursalId) {
          config.params.votanteSucursalId = sucursalId;
        }

        if (!sucursalId) {
          console.warn('⚠️ Usuario en modo comercial sin sucursalId disponible:', usuario);
        }
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// =============================================================================
// RESPONSE INTERCEPTOR
// =============================================================================

api.interceptors.response.use(
  // Respuesta exitosa: pasar directamente
  (response) => response,

  // Error: manejar 401
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Si no hay config, rechazar
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Si es 401 y NO es un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Si es la petición de refresh la que falló, hacer logout
      const esRefreshAnunciaYA = originalRequest.url?.includes('/auth/refresh');
      const esRefreshScanYA = originalRequest.url?.includes('/scanya/refresh');
      
      if (esRefreshAnunciaYA || esRefreshScanYA) {
        if (esRefreshScanYA) {
          useScanYAStore.getState().logout('sesion_expirada');
          window.location.href = '/scanya/login';
        } else {
          await notificar.sesionExpirada();
          useAuthStore.getState().logout('sesion_expirada');
          window.location.href = '/';
        }
        return Promise.reject(error);
      }

      // Si es una ruta de LOGIN, el 401 significa credenciales incorrectas
      // NO intentar refresh, pasar el error directamente al componente
      const esRutaLogin = RUTAS_LOGIN.some(ruta => originalRequest.url?.includes(ruta));
      if (esRutaLogin) {
        return Promise.reject(error);
      }

      // Marcar como retry para evitar loops infinitos
      originalRequest._retry = true;

      // Si ya hay un refresh en progreso, esperar
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          colaEsperando.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api(originalRequest));
            },
            reject: (err: Error) => {
              reject(err);
            },
          });
        });
      }

      // Iniciar refresh
      isRefreshing = true;

      try {
        // Detectar si la petición original era de ScanYA
        const esScanYA = originalRequest.url?.includes('/scanya');

        let refreshToken: string | null;
        let refreshEndpoint: string;

        if (esScanYA) {
          // Usar refresh de ScanYA
          refreshToken = useScanYAStore.getState().refreshToken;
          refreshEndpoint = `${BASE_URL}/scanya/refresh`;
        } else {
          // Usar refresh de AnunciaYA
          refreshToken = useAuthStore.getState().refreshToken;
          refreshEndpoint = `${BASE_URL}/auth/refresh`;
        }

        // Si no hay refresh token, hacer logout
        if (!refreshToken) {
          throw new Error('No hay refresh token');
        }

        // Llamar al endpoint de refresh correspondiente
        const response = await axios.post(refreshEndpoint, {
          refreshToken,
        });

        // Verificar respuesta exitosa
        if (response.data?.success && response.data?.data) {
          const { accessToken: nuevoAccess, refreshToken: nuevoRefresh } = response.data.data;

          // Guardar nuevos tokens en el store correcto
          if (esScanYA) {
            useScanYAStore.getState().setTokens(nuevoAccess, nuevoRefresh);
          } else {
            useAuthStore.getState().setTokens(nuevoAccess, nuevoRefresh);
          }

          // Procesar cola de peticiones pendientes
          procesarCola(nuevoAccess, null);

          // Reintentar la petición original con el nuevo token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${nuevoAccess}`;
          }

          return api(originalRequest);
        } else {
          throw new Error('Respuesta de refresh inválida');
        }
      } catch (refreshError) {
        // Refresh falló: logout del store correcto
        procesarCola(null, refreshError as Error);
        
        const esScanYA = originalRequest.url?.includes('/scanya');
        
        if (esScanYA) {
          useScanYAStore.getState().logout('sesion_expirada');
          window.location.href = '/scanya/login';
        } else {
          await notificar.sesionExpirada();
          useAuthStore.getState().logout('sesion_expirada');
          window.location.href = '/';
        }
        
        return Promise.reject(error);
      }
      finally {
        isRefreshing = false;
      }
    }

    // =========================================================================
    // OTROS ERRORES (400, 404, 500, etc.): PRESERVAR MENSAJE DEL BACKEND
    // =========================================================================
    
    // Si el backend envió una respuesta con formato estándar RespuestaAPI
    if (error.response?.data) {
      const respuestaBackend = error.response.data as RespuestaAPI;
      
      // Verificar que tiene el formato esperado { success, message, ... }
      if (typeof respuestaBackend.success !== 'undefined') {
        // ✅ Convertir el error en respuesta válida
        // Esto permite que el servicio reciba el mensaje del backend
        // sin necesidad de try-catch en cada función
        return Promise.resolve({
          ...error.response,
          data: respuestaBackend
        });
      }
    }

    // Si no tiene formato estándar, rechazar normalmente
    return Promise.reject(error);
  }
);

// =============================================================================
// TIPOS DE RESPUESTA DEL BACKEND
// =============================================================================

/**
 * Respuesta estándar del backend
 */
export interface RespuestaAPI<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
}

// =============================================================================
// HELPERS PARA PETICIONES
// =============================================================================

/**
 * GET request
 */
export async function get<T>(url: string): Promise<RespuestaAPI<T>> {
  const response = await api.get<RespuestaAPI<T>>(url);
  return response.data;
}

/**
 * POST request
 */
export async function post<T>(
  url: string,
  data?: unknown
): Promise<RespuestaAPI<T>> {
  const response = await api.post<RespuestaAPI<T>>(url, data);
  return response.data;
}

/**
 * PUT request
 */
export async function put<T>(
  url: string,
  data?: unknown
): Promise<RespuestaAPI<T>> {
  const response = await api.put<RespuestaAPI<T>>(url, data);
  return response.data;
}

/**
 * PATCH request
 */
export async function patch<T>(
  url: string,
  data?: unknown
): Promise<RespuestaAPI<T>> {
  const response = await api.patch<RespuestaAPI<T>>(url, data);
  return response.data;
}

/**
 * DELETE request
 */
export async function del<T>(url: string): Promise<RespuestaAPI<T>> {
  const response = await api.delete<RespuestaAPI<T>>(url);
  return response.data;
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default api;