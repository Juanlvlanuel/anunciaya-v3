/**
 * useFiltroRegion.ts
 * ===================
 * Filtro GLOBAL de región del Panel — solo lo usa el superadmin: "ver el Panel como
 * el gerente de la región X" (lente de visibilidad). `regionId = null` = toda la
 * plataforma (sin filtro). Persiste en localStorage (sesión aislada `ayadmin_`).
 *
 * Al cambiar, invalida las queries que dependen del ámbito para que refetcheen con el
 * nuevo `?regionId=` (lo añade el interceptor de api.ts). Hoy: Negocios, Usuarios y Equipo;
 * las futuras secciones se suman aquí con su prefijo de queryKey.
 *
 * Ubicación: apps/admin/src/stores/useFiltroRegion.ts
 */

import { create } from 'zustand';
import { queryClient } from '../config/queryClient';
import { queryKeys } from '../config/queryKeys';

const CLAVE = 'ayadmin_filtro_region';

function leerInicial(): string | null {
  try {
    return localStorage.getItem(CLAVE) || null;
  } catch {
    return null;
  }
}

interface EstadoFiltroRegion {
  /** id de la región activa, o null = toda la plataforma. */
  regionId: string | null;
  setRegion: (regionId: string | null) => void;
}

export const useFiltroRegion = create<EstadoFiltroRegion>((set, get) => ({
  regionId: leerInicial(),
  setRegion: (regionId) => {
    if (get().regionId === regionId) return;
    try {
      if (regionId) localStorage.setItem(CLAVE, regionId);
      else localStorage.removeItem(CLAVE);
    } catch {
      // localStorage no disponible: el filtro vive solo en memoria esta sesión.
    }
    set({ regionId });
    // Cambió el ámbito → refrescar lo que depende del filtro.
    queryClient.invalidateQueries({ queryKey: queryKeys.resumen.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.negocios.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.usuarios.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.equipo.all() });
  },
}));
