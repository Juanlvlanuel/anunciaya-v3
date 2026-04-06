/**
 * empleados.types.ts
 * ===================
 * Tipos TypeScript para el módulo de Empleados del Business Studio.
 *
 * Ubicación: apps/api/src/types/empleados.types.ts
 */

// --- Permisos ---

export interface PermisosEmpleado {
	puedeRegistrarVentas: boolean;
	puedeProcesarCanjes: boolean;
	puedeVerHistorial: boolean;
	puedeResponderChat: boolean;
	puedeResponderResenas: boolean;
}

// --- Horarios ---

export interface HorarioEmpleado {
	diaSemana: number; // 0-6 (lunes a domingo)
	horaEntrada: string; // HH:MM
	horaSalida: string; // HH:MM
}

// --- Interfaces principales ---

export interface EmpleadoResumen {
	id: string;
	nombre: string;
	nick: string | null;
	especialidad: string | null;
	fotoUrl: string | null;
	activo: boolean;
	sucursalId: string | null;
	sucursalNombre: string | null;
	permisos: PermisosEmpleado;
	createdAt: string;
}

export interface EmpleadoDetalle extends EmpleadoResumen {
	telefono: string | null;
	correo: string | null;
	notasInternas: string | null;
	pinAcceso: string | null;
	totalCitasAtendidas: number;
	calificacionPromedio: number;
	totalResenas: number;
	orden: number;
	horarios: HorarioEmpleado[];
	estadisticas: EstadisticasTurnos;
	updatedAt: string;
}

export interface EstadisticasTurnos {
	totalTurnos: number;
	transaccionesRegistradas: number;
	puntosOtorgados: number;
	ultimoTurno: string | null;
}

export interface KPIsEmpleados {
	total: number;
	activos: number;
	inactivos: number;
	promedioCalificacion: number;
}

// --- Inputs ---

export interface CrearEmpleadoInput {
	nombre: string;
	nick: string;
	pinAcceso: string;
	sucursalId: string;
	especialidad?: string;
	telefono?: string;
	correo?: string;
	fotoUrl?: string;
	notasInternas?: string;
	puedeRegistrarVentas?: boolean;
	puedeProcesarCanjes?: boolean;
	puedeVerHistorial?: boolean;
	puedeResponderChat?: boolean;
	puedeResponderResenas?: boolean;
}

export interface ActualizarEmpleadoInput {
	nombre?: string;
	nick?: string;
	pinAcceso?: string;
	sucursalId?: string;
	especialidad?: string;
	telefono?: string;
	correo?: string;
	fotoUrl?: string;
	notasInternas?: string;
	puedeRegistrarVentas?: boolean;
	puedeProcesarCanjes?: boolean;
	puedeVerHistorial?: boolean;
	puedeResponderChat?: boolean;
	puedeResponderResenas?: boolean;
}

// --- Filtros ---

export interface FiltrosEmpleados {
	busqueda?: string;
	activo?: boolean;
	limit: number;
	offset: number;
}
