/**
 * useDashboardStore.ts
 * =====================
 * Store de Zustand para estado UI del Dashboard.
 * Los datos del servidor (KPIs, ventas, etc.) ahora viven
 * en React Query — ver hooks/queries/useDashboard.ts
 *
 * Ubicación: apps/web/src/stores/useDashboardStore.ts
 */

import { create } from 'zustand';
import type { Periodo } from '../services/dashboardService';

interface DashboardUIState {
  periodo: Periodo;
  setPeriodo: (periodo: Periodo) => void;
}

export const useDashboardStore = create<DashboardUIState>((set) => ({
  periodo: 'mes',
  setPeriodo: (periodo) => set({ periodo }),
}));
