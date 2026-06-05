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

import axios, { AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TIMEOUT = 10000;

/** Clave del access token en localStorage (sesión aislada del Panel). */
export const CLAVE_ACCESS_TOKEN = 'ayadmin_access_token';

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

/** Respuesta estándar del backend (misma forma que apps/web). */
export interface RespuestaAPI<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
  errorCode?: string;
}

export default api;
