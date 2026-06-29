/**
 * useNavegacionPanel.ts
 * ======================
 * Navegación entre secciones del Panel CON filtro inicial (deep-link). El Resumen y la campana de
 * pendientes son "centro de trabajo": al hacer clic en un KPI o un pendiente, llevan a la sección
 * que resuelve la tarea, ya filtrada (ej. Negocios → solo "en gracia").
 *
 * Cómo funciona:
 *   - `navegar(seccion, filtros?)` deja un `destino` pendiente + el filtro inicial de esa sección.
 *   - `PaginaPanel` observa `destino`, cambia de sección y lo limpia (one-shot).
 *   - La sección destino (Negocios / Suscripciones) consume su filtro inicial AL MONTAR (también
 *     one-shot, para no re-aplicarlo en cada render).
 *
 * Ubicación: apps/admin/src/stores/useNavegacionPanel.ts
 */

import { create } from 'zustand';

export interface FiltroNegociosInicial {
  estadoPago?: string;
  /** Deep-link a una fila concreta: la sección Negocios hace scroll y la resalta (si está visible). */
  resaltarId?: string;
}
export interface FiltroSuscripcionesInicial {
  tipo?: string;
  /** Pestaña inicial del módulo Suscripciones (ej. 'por-verificar' para la cola de pagos manuales). */
  pestana?: string;
}
export interface FiltroVendedoresInicial {
  /** usuarios.id del vendedor a abrir directo (= VendedorFila.id). Si falta, abre la lista. */
  usuarioId?: string;
  embajadorId?: string;
  nombre?: string;
  /** Pestaña inicial del detalle del vendedor: 'efectivo' (Por entregar) | 'pagos' | 'comisiones' | 'cartera'. */
  tab?: string;
}

interface NavegacionPanelState {
  /** Sección a la que se pidió saltar (one-shot). null = sin navegación pendiente. */
  destino: string | null;
  filtroNegocios: FiltroNegociosInicial | null;
  filtroSuscripciones: FiltroSuscripcionesInicial | null;
  filtroVendedores: FiltroVendedoresInicial | null;
  navegar: (
    destino: string,
    filtros?: {
      negocios?: FiltroNegociosInicial;
      suscripciones?: FiltroSuscripcionesInicial;
      vendedores?: FiltroVendedoresInicial;
    },
  ) => void;
  limpiarDestino: () => void;
  /** Lee y limpia el filtro inicial de Negocios (one-shot). */
  consumirFiltroNegocios: () => FiltroNegociosInicial | null;
  /** Lee y limpia el filtro inicial de Suscripciones (one-shot). */
  consumirFiltroSuscripciones: () => FiltroSuscripcionesInicial | null;
  /** Lee y limpia el filtro inicial de Vendedores (one-shot). */
  consumirFiltroVendedores: () => FiltroVendedoresInicial | null;
}

export const useNavegacionPanel = create<NavegacionPanelState>((set, get) => ({
  destino: null,
  filtroNegocios: null,
  filtroSuscripciones: null,
  filtroVendedores: null,
  navegar: (destino, filtros) =>
    set({
      destino,
      filtroNegocios: filtros?.negocios ?? null,
      filtroSuscripciones: filtros?.suscripciones ?? null,
      filtroVendedores: filtros?.vendedores ?? null,
    }),
  limpiarDestino: () => set({ destino: null }),
  consumirFiltroNegocios: () => {
    const f = get().filtroNegocios;
    if (f) set({ filtroNegocios: null });
    return f;
  },
  consumirFiltroSuscripciones: () => {
    const f = get().filtroSuscripciones;
    if (f) set({ filtroSuscripciones: null });
    return f;
  },
  consumirFiltroVendedores: () => {
    const f = get().filtroVendedores;
    if (f) set({ filtroVendedores: null });
    return f;
  },
}));
