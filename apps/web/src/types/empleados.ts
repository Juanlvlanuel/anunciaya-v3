/**
 * empleados.ts
 * =============
 * Tipos TypeScript para el módulo de Empleados (frontend).
 *
 * Ubicación: apps/web/src/types/empleados.ts
 */

export interface PermisosEmpleado {
	puedeRegistrarVentas: boolean;
	puedeProcesarCanjes: boolean;
	puedeVerHistorial: boolean;
	puedeResponderChat: boolean;
	puedeResponderResenas: boolean;
}

export interface HorarioEmpleado {
	diaSemana: number;
	horaEntrada: string;
	horaSalida: string;
}

export interface EstadisticasTurnos {
	totalTurnos: number;
	transaccionesRegistradas: number;
	puntosOtorgados: number;
	ultimoTurno: string | null;
}

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

export interface KPIsEmpleados {
	total: number;
	activos: number;
	inactivos: number;
	promedioCalificacion: number;
}

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
	especialidad?: string | null;
	telefono?: string | null;
	correo?: string | null;
	fotoUrl?: string | null;
	notasInternas?: string | null;
	puedeRegistrarVentas?: boolean;
	puedeProcesarCanjes?: boolean;
	puedeVerHistorial?: boolean;
	puedeResponderChat?: boolean;
	puedeResponderResenas?: boolean;
}

// Labels legibles para permisos
export const LABELS_PERMISOS: Record<keyof PermisosEmpleado, string> = {
	puedeRegistrarVentas: 'Registrar ventas',
	puedeProcesarCanjes: 'Procesar canjes',
	puedeVerHistorial: 'Ver historial',
	puedeResponderChat: 'Responder chat',
	puedeResponderResenas: 'Responder reseñas',
};

// Días de la semana
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
