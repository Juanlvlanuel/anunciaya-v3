/**
 * api.ts
 * =======
 * Cliente Axios del Panel Admin. Versión REDUCIDA del de apps/web: sin ScanYA,
 * sin sucursales, sin socket. Solo adjunta el token de sesión del Panel (prefijo
 * `ayadmin_`) a cada petición.
 *
 * La renovación de token (refresh) y el manejo fino de 401 se cablearán junto
 * con el shell; por ahora el shell toca datos mínimos.
 *
 * Ubicación: apps/admin/src/services/api.ts
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthPanelStore } from '../stores/useAuthPanelStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TIMEOUT = 10000;

/** Claves de tokens en localStorage (sesión aislada del Panel). */
export const CLAVE_ACCESS_TOKEN = 'ayadmin_access_token';
export const CLAVE_REFRESH_TOKEN = 'ayadmin_refresh_token';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adjunta el token del Panel si existe.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CLAVE_ACCESS_TOKEN);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// =============================================================================
// RESPONSE INTERCEPTOR — refresh automático del token (reducido de apps/web)
// =============================================================================
// Ante un 401, intenta renovar con /auth/refresh y reintenta la petición. Si hay
// varios 401 a la vez, encolan y esperan un solo refresh. Si el refresh falla,
// cierra la sesión del Panel y manda al login (/).

let estaRefrescando = false;
let colaEsperando: Array<{ resolve: (token: string) => void; reject: (error: unknown) => void }> = [];

function procesarCola(token: string | null, error: unknown): void {
  colaEsperando.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  colaEsperando = [];
}

// En estas rutas un 401 NO debe disparar refresh (es credenciales / refresh ya falló).
const RUTAS_SIN_REFRESH = ['/auth/login', '/auth/refresh'];

function cerrarSesionYSalir(): void {
  useAuthPanelStore.getState().cerrarSesion();
  if (typeof window !== 'undefined') window.location.href = '/';
}

api.interceptors.response.use(
  (respuesta) => respuesta,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!original || error.response?.status !== 401) {
      return Promise.reject(error);
    }
    if (original._retry || RUTAS_SIN_REFRESH.some((r) => original.url?.includes(r))) {
      return Promise.reject(error);
    }
    original._retry = true;

    // Si ya hay un refresh en curso, esperar a que termine.
    if (estaRefrescando) {
      return new Promise((resolve, reject) => {
        colaEsperando.push({
          resolve: (token: string) => {
            if (original.headers) original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    estaRefrescando = true;
    const refreshToken = localStorage.getItem(CLAVE_REFRESH_TOKEN);

    if (!refreshToken) {
      estaRefrescando = false;
      cerrarSesionYSalir();
      return Promise.reject(error);
    }

    try {
      // axios "crudo" (sin este interceptor) para evitar bucle.
      const resp = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
      if (resp.data?.success && resp.data?.data) {
        const { accessToken: nuevoAccess, refreshToken: nuevoRefresh } = resp.data.data;
        useAuthPanelStore.getState().setTokens(nuevoAccess, nuevoRefresh);
        estaRefrescando = false;
        procesarCola(nuevoAccess, null);
        if (original.headers) original.headers.Authorization = `Bearer ${nuevoAccess}`;
        return api(original);
      }
      throw new Error('Respuesta de refresh inválida');
    } catch (errorRefresh) {
      estaRefrescando = false;
      procesarCola(null, errorRefresh);
      cerrarSesionYSalir();
      return Promise.reject(error);
    }
  },
);

/** Respuesta estándar del backend (misma forma que apps/web). */
export interface RespuestaAPI<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
  errorCode?: string;
}

export default api;
