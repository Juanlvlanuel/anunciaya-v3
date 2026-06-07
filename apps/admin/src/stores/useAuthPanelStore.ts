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
} as const;

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

  estaAutenticado: boolean;

  iniciarSesion: (
    usuario: UsuarioPanel,
    accessToken: string,
    refreshToken: string,
  ) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  cerrarSesion: () => void;
  hidratar: () => void;
}

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
    localStorage.removeItem(CLAVES.accessToken);
    localStorage.removeItem(CLAVES.refreshToken);
    localStorage.removeItem(CLAVES.usuario);
    set({ usuario: null, accessToken: null, refreshToken: null });
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
  },
}));
