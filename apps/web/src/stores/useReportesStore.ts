/**
 * useReportesStore.ts
 * ====================
 * Store Zustand — SOLO estado UI para el módulo Reportes.
 * Un solo filtro de fechas universal para todos los tabs.
 *
 * Ubicación: apps/web/src/stores/useReportesStore.ts
 */

import { create } from 'zustand';
import type { TabReporte } from '../services/reportesService';

export type RangoRapido = '7d' | '30d' | '3m' | '1a' | 'todo' | 'custom';

function calcularRango(tipo: RangoRapido): { fechaInicio: string; fechaFin: string } {
  const hoy = new Date();
  const fin = hoy.toISOString().slice(0, 10);

  switch (tipo) {
    case '7d': {
      const inicio = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { fechaInicio: inicio.toISOString().slice(0, 10), fechaFin: fin };
    }
    case '30d': {
      const inicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { fechaInicio: inicio.toISOString().slice(0, 10), fechaFin: fin };
    }
    case '3m': {
      const inicio = new Date(hoy);
      inicio.setMonth(inicio.getMonth() - 3);
      return { fechaInicio: inicio.toISOString().slice(0, 10), fechaFin: fin };
    }
    case '1a': {
      const inicio = new Date(hoy);
      inicio.setFullYear(inicio.getFullYear() - 1);
      return { fechaInicio: inicio.toISOString().slice(0, 10), fechaFin: fin };
    }
    case 'todo':
      return { fechaInicio: '2020-01-01', fechaFin: fin };
    default:
      return { fechaInicio: '', fechaFin: fin };
  }
}

interface ReportesUIState {
  tabActivo: TabReporte;
  rangoActivo: RangoRapido;
  fechaInicio: string;
  fechaFin: string;

  setTabActivo: (tab: TabReporte) => void;
  setRangoRapido: (rango: RangoRapido) => void;
  setFechaInicio: (fecha: string) => void;
  setFechaFin: (fecha: string) => void;
  limpiar: () => void;
}

const rangoInicial = calcularRango('30d');

const ESTADO_INICIAL = {
  tabActivo: 'ventas' as TabReporte,
  rangoActivo: '30d' as RangoRapido,
  fechaInicio: rangoInicial.fechaInicio,
  fechaFin: rangoInicial.fechaFin,
};

export const useReportesStore = create<ReportesUIState>((set) => ({
  ...ESTADO_INICIAL,
  setTabActivo: (tabActivo) => set({ tabActivo }),
  setRangoRapido: (rango) => {
    const { fechaInicio, fechaFin } = calcularRango(rango);
    set({ rangoActivo: rango, fechaInicio, fechaFin });
  },
  setFechaInicio: (fechaInicio) => set({ fechaInicio, rangoActivo: 'custom' }),
  setFechaFin: (fechaFin) => set({ fechaFin, rangoActivo: 'custom' }),
  limpiar: () => set(ESTADO_INICIAL),
}));
