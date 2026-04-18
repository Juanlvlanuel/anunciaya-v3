/**
 * Tipos del módulo BS Sucursales
 * Ubicación: apps/web/src/types/sucursales.ts
 */

export interface GerenteResumen {
	id: string;
	nombre: string;
	apellidos: string;
	correo: string;
	avatarUrl?: string | null;
	requiereCambioContrasena?: boolean;
}

export interface SucursalResumen {
	id: string;
	nombre: string;
	esPrincipal: boolean;
	direccion: string | null;
	ciudad: string;
	estado: string | null;
	telefono: string | null;
	whatsapp: string | null;
	correo: string | null;
	activa: boolean;
	createdAt: string;
	gerente: GerenteResumen | null;
}

export interface KPIsSucursales {
	total: number;
	activas: number;
	inactivas: number;
}

export interface CrearSucursalInput {
	nombre: string;
	ciudad: string;
	estado: string;
	direccion?: string;
	telefono?: string;
	whatsapp?: string;
	correo?: string;
	latitud: number;
	longitud: number;
}

export interface CrearGerenteInput {
	nombre: string;
	apellidos: string;
	correo: string;
}

export interface FiltrosSucursalesUI {
	busqueda?: string;
	activa?: boolean;
}
