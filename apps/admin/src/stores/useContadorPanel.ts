/**
 * useContadorPanel.ts
 * ===================
 * Contadores del menú lateral que dependen de la sección activa. Hoy: Usuarios publica aquí su
 * total YA FILTRADO (refleja búsqueda/estado/tipo); `PaginaPanel` lo lee y lo pasa como badge del
 * ítem "Usuarios". A diferencia del conteo de Negocios (general, vía endpoint), este sigue los
 * filtros porque sale del mismo `total` que ve la sección.
 *
 * Ubicación: apps/admin/src/stores/useContadorPanel.ts
 */

import { create } from 'zustand';

interface ContadorPanelState {
  /** Total de usuarios visible en la sección (con los filtros aplicados). Null = aún sin publicar. */
  usuarios: number | null;
  setUsuarios: (n: number | null) => void;
  /** Total de equipo visible en la sección (con los filtros aplicados). Null = aún sin publicar. */
  equipo: number | null;
  setEquipo: (n: number | null) => void;
}

export const useContadorPanel = create<ContadorPanelState>((set) => ({
  usuarios: null,
  setUsuarios: (n) => set({ usuarios: n }),
  equipo: null,
  setEquipo: (n) => set({ equipo: n }),
}));
