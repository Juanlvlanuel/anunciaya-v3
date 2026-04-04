/**
 * useAlertasStore.ts
 * ====================
 * Store Zustand para el módulo de Alertas — Business Studio.
 *
 * Ubicación: apps/web/src/stores/useAlertasStore.ts
 */

import { create } from 'zustand';
import * as alertasService from '../services/alertasService';
import type {
	AlertaCompleta,
	AlertaKPIs,
	ConfiguracionAlerta,
	FiltrosAlertas,
	CategoriaAlerta,
	SeveridadAlerta,
} from '../types/alertas';

interface AlertasState {
	// Datos
	alertas: AlertaCompleta[];
	kpis: AlertaKPIs | null;
	configuracion: ConfiguracionAlerta[];
	alertaSeleccionada: AlertaCompleta | null;

	// Paginación
	totalAlertas: number;
	totalPaginas: number;
	filtros: FiltrosAlertas;

	// Loading
	cargandoAlertas: boolean;
	cargandoKPIs: boolean;
	cargandoConfiguracion: boolean;
	cargandoMas: boolean;
	hayMas: boolean;

	// Acciones
	cargarAlertas: () => Promise<void>;
	cargarMas: () => Promise<void>;
	cargarKPIs: () => Promise<void>;
	cargarConfiguracion: () => Promise<void>;
	setFiltro: <K extends keyof FiltrosAlertas>(campo: K, valor: FiltrosAlertas[K]) => void;
	limpiarFiltros: () => void;
	setPagina: (pagina: number) => void;
	marcarLeida: (id: string) => Promise<void>;
	marcarResuelta: (id: string) => Promise<void>;
	marcarTodasLeidas: () => Promise<void>;
	actualizarConfiguracion: (tipo: string, activo: boolean, umbrales: Record<string, number>) => Promise<void>;
	eliminarAlerta: (id: string) => Promise<void>;
	eliminarResueltas: () => Promise<number>;
	seleccionarAlerta: (alerta: AlertaCompleta | null) => void;
	limpiar: () => void;
}

const FILTROS_INICIALES: FiltrosAlertas = {
	pagina: 1,
	porPagina: 20,
};

export const useAlertasStore = create<AlertasState>((set, get) => ({
	// Estado inicial
	alertas: [],
	kpis: null,
	configuracion: [],
	alertaSeleccionada: null,
	totalAlertas: 0,
	totalPaginas: 0,
	filtros: { ...FILTROS_INICIALES },
	cargandoAlertas: false,
	cargandoKPIs: false,
	cargandoConfiguracion: false,
	cargandoMas: false,
	hayMas: true,

	cargarAlertas: async () => {
		const esCargaInicial = get().alertas.length === 0;
		set({ cargandoAlertas: esCargaInicial });
		try {
			const resp = await alertasService.obtenerAlertas(get().filtros);
			if (resp.success && resp.data) {
				set({
					alertas: resp.data.alertas,
					totalAlertas: resp.data.total,
					totalPaginas: resp.data.totalPaginas,
					hayMas: resp.data.pagina < resp.data.totalPaginas,
				});
			}
		} catch {
			// Error silencioso — el interceptor de api.ts ya maneja errores
		} finally {
			set({ cargandoAlertas: false });
		}
	},

	cargarMas: async () => {
		const { filtros, totalPaginas, cargandoMas, hayMas } = get();
		if (cargandoMas || !hayMas || filtros.pagina >= totalPaginas) return;

		set({ cargandoMas: true });
		try {
			const siguientePagina = filtros.pagina + 1;
			const resp = await alertasService.obtenerAlertas({ ...filtros, pagina: siguientePagina });
			if (resp.success && resp.data) {
				set(state => ({
					alertas: [...state.alertas, ...resp.data!.alertas],
					filtros: { ...state.filtros, pagina: siguientePagina },
					hayMas: siguientePagina < resp.data!.totalPaginas,
				}));
			}
		} catch {
			// silencioso
		} finally {
			set({ cargandoMas: false });
		}
	},

	cargarKPIs: async () => {
		const esCargaInicial = get().kpis === null;
		set({ cargandoKPIs: esCargaInicial });
		try {
			const resp = await alertasService.obtenerKPIs();
			if (resp.success && resp.data) {
				set({ kpis: resp.data });
			}
		} catch {
			// silencioso
		} finally {
			set({ cargandoKPIs: false });
		}
	},

	cargarConfiguracion: async () => {
		set({ cargandoConfiguracion: true });
		try {
			const resp = await alertasService.obtenerConfiguracion();
			if (resp.success && resp.data) {
				set({ configuracion: resp.data });
			}
		} catch {
			// silencioso
		} finally {
			set({ cargandoConfiguracion: false });
		}
	},

	setFiltro: (campo, valor) => {
		set(state => ({
			filtros: { ...state.filtros, [campo]: valor, pagina: campo === 'pagina' ? (valor as number) : 1 },
		}));
		get().cargarAlertas();
	},

	limpiarFiltros: () => {
		set({ filtros: { ...FILTROS_INICIALES } });
		get().cargarAlertas();
	},

	setPagina: (pagina: number) => {
		set(state => ({ filtros: { ...state.filtros, pagina } }));
		get().cargarAlertas();
	},

	marcarLeida: async (id: string) => {
		// Actualización optimista
		set(state => ({
			alertas: state.alertas.map(a =>
				a.id === id ? { ...a, leida: true, leidaAt: new Date().toISOString() } : a
			),
			kpis: state.kpis ? { ...state.kpis, noLeidas: Math.max(0, state.kpis.noLeidas - 1) } : null,
		}));

		try {
			await alertasService.marcarLeida(id);
		} catch {
			// Revertir en error — recargar
			get().cargarAlertas();
			get().cargarKPIs();
		}
	},

	marcarResuelta: async (id: string) => {
		set(state => ({
			alertas: state.alertas.map(a =>
				a.id === id ? { ...a, resuelta: true, resueltaAt: new Date().toISOString(), leida: true } : a
			),
		}));

		try {
			await alertasService.marcarResuelta(id);
			get().cargarKPIs();
		} catch {
			get().cargarAlertas();
			get().cargarKPIs();
		}
	},

	marcarTodasLeidas: async () => {
		try {
			await alertasService.marcarTodasLeidas();
			set(state => ({
				alertas: state.alertas.map(a => ({ ...a, leida: true, leidaAt: new Date().toISOString() })),
				kpis: state.kpis ? { ...state.kpis, noLeidas: 0 } : null,
			}));
		} catch {
			get().cargarAlertas();
			get().cargarKPIs();
		}
	},

	actualizarConfiguracion: async (tipo, activo, umbrales) => {
		// Optimista
		set(state => ({
			configuracion: state.configuracion.map(c =>
				c.tipoAlerta === tipo ? { ...c, activo, umbrales } : c
			),
		}));

		try {
			await alertasService.actualizarConfiguracion(tipo, activo, umbrales);
		} catch {
			get().cargarConfiguracion();
		}
	},

	eliminarAlerta: async (id: string) => {
		set(state => ({
			alertas: state.alertas.filter(a => a.id !== id),
			totalAlertas: state.totalAlertas - 1,
		}));
		try {
			await alertasService.eliminarAlerta(id);
			get().cargarKPIs();
		} catch {
			get().cargarAlertas();
			get().cargarKPIs();
		}
	},

	eliminarResueltas: async () => {
		const resueltas = get().alertas.filter(a => a.resuelta).length;
		set(state => ({
			alertas: state.alertas.filter(a => !a.resuelta),
			totalAlertas: state.totalAlertas - resueltas,
		}));
		try {
			const resp = await alertasService.eliminarAlertasResueltas();
			get().cargarKPIs();
			return resp.data?.eliminadas ?? resueltas;
		} catch {
			get().cargarAlertas();
			get().cargarKPIs();
			return 0;
		}
	},

	seleccionarAlerta: (alerta) => set({ alertaSeleccionada: alerta }),

	limpiar: () => set({
		alertas: [],
		kpis: null,
		configuracion: [],
		alertaSeleccionada: null,
		totalAlertas: 0,
		totalPaginas: 0,
		filtros: { ...FILTROS_INICIALES },
		cargandoAlertas: false,
		cargandoKPIs: false,
		cargandoConfiguracion: false,
		cargandoMas: false,
		hayMas: true,
	}),
}));
