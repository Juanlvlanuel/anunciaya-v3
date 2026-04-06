/**
 * useEmpleadosStore.ts
 * =====================
 * Store Zustand para el módulo de Empleados — Business Studio.
 *
 * Ubicación: apps/web/src/stores/useEmpleadosStore.ts
 */

import { create } from 'zustand';
import * as empleadosService from '../services/empleadosService';
import type {
	EmpleadoResumen,
	EmpleadoDetalle,
	KPIsEmpleados,
	CrearEmpleadoInput,
	ActualizarEmpleadoInput,
	HorarioEmpleado,
} from '../types/empleados';

const LIMIT_PAGINA = 20;

interface EmpleadosState {
	// Datos
	kpis: KPIsEmpleados | null;
	empleados: EmpleadoResumen[];
	empleadoDetalle: EmpleadoDetalle | null;

	// Paginación
	offset: number;
	hayMas: boolean;
	total: number;

	// Filtros
	busqueda: string;
	filtroActivo: boolean | undefined;

	// Loading
	cargandoKpis: boolean;
	cargandoEmpleados: boolean;
	cargandoMas: boolean;
	cargandoDetalle: boolean;

	// Acciones
	cargarKPIs: () => Promise<void>;
	cargarEmpleados: (reset?: boolean) => Promise<void>;
	cargarMas: () => Promise<void>;
	cargarDetalle: (id: string) => Promise<void>;
	crearEmpleado: (datos: CrearEmpleadoInput) => Promise<EmpleadoResumen | null>;
	actualizarEmpleado: (id: string, datos: ActualizarEmpleadoInput) => Promise<boolean>;
	toggleActivo: (id: string, activo: boolean) => Promise<void>;
	eliminarEmpleado: (id: string) => Promise<void>;
	actualizarHorarios: (id: string, horarios: HorarioEmpleado[]) => Promise<void>;
	setBusqueda: (texto: string) => void;
	setFiltroActivo: (valor: boolean | undefined) => void;
	limpiar: () => void;
}

export const useEmpleadosStore = create<EmpleadosState>((set, get) => ({
	// Estado inicial
	kpis: null,
	empleados: [],
	empleadoDetalle: null,
	offset: 0,
	hayMas: true,
	total: 0,
	busqueda: '',
	filtroActivo: undefined,
	cargandoKpis: false,
	cargandoEmpleados: false,
	cargandoMas: false,
	cargandoDetalle: false,

	cargarKPIs: async () => {
		const esCargaInicial = get().kpis === null;
		set({ cargandoKpis: esCargaInicial });
		try {
			const resp = await empleadosService.obtenerKPIs();
			if (resp.success && resp.data) {
				set({ kpis: resp.data });
			}
		} catch {
			// silencioso
		} finally {
			set({ cargandoKpis: false });
		}
	},

	cargarEmpleados: async (reset = false) => {
		const { busqueda, filtroActivo, empleados } = get();
		const esCargaInicial = empleados.length === 0 || reset;

		set({ cargandoEmpleados: esCargaInicial });

		try {
			const resp = await empleadosService.obtenerEmpleados({
				busqueda: busqueda || undefined,
				activo: filtroActivo,
				limit: LIMIT_PAGINA,
				offset: 0,
			});

			if (resp.success && resp.data) {
				set({
					empleados: resp.data.empleados,
					total: resp.data.total,
					offset: LIMIT_PAGINA,
					hayMas: resp.data.empleados.length >= LIMIT_PAGINA,
				});
			}
		} catch {
			// silencioso
		} finally {
			set({ cargandoEmpleados: false });
		}
	},

	cargarMas: async () => {
		const { offset, hayMas, cargandoMas, busqueda, filtroActivo } = get();
		if (cargandoMas || !hayMas) return;

		set({ cargandoMas: true });
		try {
			const resp = await empleadosService.obtenerEmpleados({
				busqueda: busqueda || undefined,
				activo: filtroActivo,
				limit: LIMIT_PAGINA,
				offset,
			});

			if (resp.success && resp.data) {
				set(state => ({
					empleados: [...state.empleados, ...resp.data!.empleados],
					offset: state.offset + LIMIT_PAGINA,
					hayMas: resp.data!.empleados.length >= LIMIT_PAGINA,
				}));
			}
		} catch {
			// silencioso
		} finally {
			set({ cargandoMas: false });
		}
	},

	cargarDetalle: async (id: string) => {
		set({ cargandoDetalle: true });
		try {
			const resp = await empleadosService.obtenerDetalle(id);
			if (resp.success && resp.data) {
				set({ empleadoDetalle: resp.data });
			}
		} catch {
			// silencioso
		} finally {
			set({ cargandoDetalle: false });
		}
	},

	crearEmpleado: async (datos: CrearEmpleadoInput) => {
		try {
			const resp = await empleadosService.crearEmpleado(datos);
			if (resp.success && resp.data) {
				// Recargar lista y KPIs
				get().cargarEmpleados(true);
				get().cargarKPIs();
				return resp.data;
			}
			return null;
		} catch {
			return null;
		}
	},

	actualizarEmpleado: async (id: string, datos: ActualizarEmpleadoInput) => {
		try {
			const resp = await empleadosService.actualizarEmpleado(id, datos);
			if (resp.success) {
				// Actualizar optimistamente en la lista
				set(state => ({
					empleados: state.empleados.map(e =>
						e.id === id ? { ...e, ...datos, permisos: {
							...e.permisos,
							...(datos.puedeRegistrarVentas !== undefined ? { puedeRegistrarVentas: datos.puedeRegistrarVentas } : {}),
							...(datos.puedeProcesarCanjes !== undefined ? { puedeProcesarCanjes: datos.puedeProcesarCanjes } : {}),
							...(datos.puedeVerHistorial !== undefined ? { puedeVerHistorial: datos.puedeVerHistorial } : {}),
							...(datos.puedeResponderChat !== undefined ? { puedeResponderChat: datos.puedeResponderChat } : {}),
							...(datos.puedeResponderResenas !== undefined ? { puedeResponderResenas: datos.puedeResponderResenas } : {}),
						} } : e
					),
				}));
				get().cargarKPIs();
				return true;
			}
			return false;
		} catch {
			return false;
		}
	},

	toggleActivo: async (id: string, activo: boolean) => {
		// Optimista
		set(state => ({
			empleados: state.empleados.map(e =>
				e.id === id ? { ...e, activo } : e
			),
		}));

		try {
			await empleadosService.toggleActivo(id, activo);
			get().cargarKPIs();
		} catch {
			get().cargarEmpleados(true);
			get().cargarKPIs();
		}
	},

	eliminarEmpleado: async (id: string) => {
		set(state => ({
			empleados: state.empleados.filter(e => e.id !== id),
			total: state.total - 1,
		}));

		try {
			await empleadosService.eliminarEmpleado(id);
			get().cargarKPIs();
		} catch {
			get().cargarEmpleados(true);
			get().cargarKPIs();
		}
	},

	actualizarHorarios: async (id: string, horarios: HorarioEmpleado[]) => {
		await empleadosService.actualizarHorarios(id, horarios);
	},

	setBusqueda: (texto: string) => {
		set({ busqueda: texto });
		get().cargarEmpleados();
	},

	setFiltroActivo: (valor: boolean | undefined) => {
		set({ filtroActivo: valor });
		get().cargarEmpleados();
	},

	limpiar: () => set({
		kpis: null,
		empleados: [],
		empleadoDetalle: null,
		offset: 0,
		hayMas: true,
		total: 0,
		busqueda: '',
		filtroActivo: undefined,
		cargandoKpis: false,
		cargandoEmpleados: false,
		cargandoMas: false,
		cargandoDetalle: false,
	}),
}));
