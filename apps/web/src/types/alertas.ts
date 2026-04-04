/**
 * alertas.ts
 * ==========
 * Tipos TypeScript para el módulo de Alertas (frontend).
 *
 * Ubicación: apps/web/src/types/alertas.ts
 */

export type TipoAlerta =
	// Seguridad (6)
	| 'monto_inusual'
	| 'cliente_frecuente'
	| 'fuera_horario'
	| 'montos_redondos'
	| 'empleado_destacado'
	// Operativas (4)
	| 'voucher_estancado'
	| 'acumulacion_vouchers'
	| 'oferta_por_expirar'
	| 'cupones_por_expirar'
	// Rendimiento (4)
	| 'caida_ventas'
	| 'cliente_vip_inactivo'
	| 'racha_resenas_negativas'
	| 'pico_actividad'
	// Engagement (3)
	| 'cupones_sin_canjear'
	| 'puntos_por_expirar'
	| 'recompensa_popular';

export type CategoriaAlerta = 'seguridad' | 'operativa' | 'rendimiento' | 'engagement';

export type SeveridadAlerta = 'baja' | 'media' | 'alta';

export interface AlertaCompleta {
	id: string;
	negocioId: string;
	sucursalId: string | null;
	transaccionId: string | null;
	empleadoId: string | null;
	tipo: TipoAlerta;
	categoria: CategoriaAlerta;
	severidad: SeveridadAlerta;
	titulo: string;
	descripcion: string;
	data: Record<string, unknown> | null;
	accionesSugeridas: string[] | null;
	leida: boolean;
	leidaAt: string | null;
	resuelta: boolean;
	resueltaAt: string | null;
	createdAt: string;
}

export interface AlertaKPIs {
	total: number;
	noLeidas: number;
	porSeveridad: { alta: number; media: number; baja: number };
	porCategoria: { seguridad: number; operativa: number; rendimiento: number; engagement: number };
	resueltasEsteMes: number;
}

export interface ConfiguracionAlerta {
	tipoAlerta: TipoAlerta;
	activo: boolean;
	umbrales: Record<string, unknown>;
}

export interface FiltrosAlertas {
	tipo?: TipoAlerta;
	categoria?: CategoriaAlerta;
	severidad?: SeveridadAlerta;
	leida?: boolean;
	resuelta?: boolean;
	busqueda?: string;
	pagina: number;
	porPagina: number;
}

export interface RespuestaAlertasPaginada {
	alertas: AlertaCompleta[];
	total: number;
	pagina: number;
	porPagina: number;
	totalPaginas: number;
}

// Metadatos UI para cada tipo de alerta
export interface MetadatosTipoAlerta {
	tipo: TipoAlerta;
	nombre: string;
	descripcion: string;
	categoria: CategoriaAlerta;
	severidadDefault: SeveridadAlerta;
}

export const CATALOGO_ALERTAS: MetadatosTipoAlerta[] = [
	// Seguridad (alta → media)
	{ tipo: 'monto_inusual', nombre: 'Monto inusual', descripcion: 'Se activa cuando el monto de una venta supera\nvarias veces el promedio de tus ventas (últimos 30 días)', categoria: 'seguridad', severidadDefault: 'alta' },
	{ tipo: 'cliente_frecuente', nombre: 'Cliente frecuente', descripcion: 'Se activa cuando un cliente hace\ndemasiadas compras en 1 hora', categoria: 'seguridad', severidadDefault: 'alta' },
	{ tipo: 'empleado_destacado', nombre: 'Empleado con incidencias', descripcion: 'Se activa cuando un empleado acumula\nvarios incidentes de seguridad en el mes', categoria: 'seguridad', severidadDefault: 'alta' },
	{ tipo: 'fuera_horario', nombre: 'Fuera de horario', descripcion: 'Se activa cuando se registra una venta fuera\ndel horario configurado de tu negocio', categoria: 'seguridad', severidadDefault: 'media' },
	{ tipo: 'montos_redondos', nombre: 'Montos redondos', descripcion: 'Se activa cuando se detectan varias ventas\nconsecutivas con montos exactos (ej: $100, $200)', categoria: 'seguridad', severidadDefault: 'media' },
	// Operativas (media → baja)
	{ tipo: 'voucher_estancado', nombre: 'Voucher estancado', descripcion: 'Se activa cuando un voucher lleva muchos días pendiente de entrega al cliente', categoria: 'operativa', severidadDefault: 'media' },
	{ tipo: 'acumulacion_vouchers', nombre: 'Acumulación de vouchers', descripcion: 'Se activa cuando se acumulan demasiados vouchers sin entregar en tu negocio', categoria: 'operativa', severidadDefault: 'media' },
	{ tipo: 'oferta_por_expirar', nombre: 'Oferta por expirar', descripcion: 'Se activa cuando una oferta activa está por vencer en los próximos días', categoria: 'operativa', severidadDefault: 'baja' },
	{ tipo: 'cupones_por_expirar', nombre: 'Cupones por expirar', descripcion: 'Se activa cuando hay cupones asignados a clientes que están por vencer sin usarse', categoria: 'operativa', severidadDefault: 'baja' },
	// Rendimiento (alta → media → baja)
	{ tipo: 'caida_ventas', nombre: 'Caída de ventas', descripcion: 'Se activa cuando las ventas de la semana caen significativamente vs el promedio', categoria: 'rendimiento', severidadDefault: 'alta' },
	{ tipo: 'racha_resenas_negativas', nombre: 'Racha de reseñas negativas', descripcion: 'Se activa cuando recibes varias reseñas con calificación baja en pocos días', categoria: 'rendimiento', severidadDefault: 'alta' },
	{ tipo: 'cliente_vip_inactivo', nombre: 'Cliente VIP inactivo', descripcion: 'Se activa cuando un cliente nivel Oro o Plata deja de comprar por muchos días', categoria: 'rendimiento', severidadDefault: 'media' },
	{ tipo: 'pico_actividad', nombre: 'Pico de actividad', descripcion: 'Se activa cuando las ventas del día superan el promedio diario por mucho', categoria: 'rendimiento', severidadDefault: 'baja' },
	// Engagement (media → baja)
	{ tipo: 'puntos_por_expirar', nombre: 'Puntos por expirar', descripcion: 'Se activa cuando hay clientes con puntos que están por expirar pronto', categoria: 'engagement', severidadDefault: 'media' },
	{ tipo: 'cupones_sin_canjear', nombre: 'Cupones sin canjear', descripcion: 'Se activa cuando una oferta tiene muy pocos cupones usados vs los asignados', categoria: 'engagement', severidadDefault: 'baja' },
	{ tipo: 'recompensa_popular', nombre: 'Recompensa popular', descripcion: 'Se activa cuando una recompensa se está canjeando mucho y le queda poco stock', categoria: 'engagement', severidadDefault: 'baja' },
];
