/**
 * alertas.types.ts
 * ================
 * Tipos TypeScript para el módulo de Alertas del Business Studio.
 *
 * Ubicación: apps/api/src/types/alertas.types.ts
 */

// --- Enums como union types ---

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

// --- Mapeo tipo → categoría ---

export const TIPO_A_CATEGORIA: Record<TipoAlerta, CategoriaAlerta> = {
	monto_inusual: 'seguridad',
	cliente_frecuente: 'seguridad',
	fuera_horario: 'seguridad',
	montos_redondos: 'seguridad',
	empleado_destacado: 'seguridad',
	voucher_estancado: 'operativa',
	acumulacion_vouchers: 'operativa',
	oferta_por_expirar: 'operativa',
	cupones_por_expirar: 'operativa',
	caida_ventas: 'rendimiento',
	cliente_vip_inactivo: 'rendimiento',
	racha_resenas_negativas: 'rendimiento',
	pico_actividad: 'rendimiento',
	cupones_sin_canjear: 'engagement',
	puntos_por_expirar: 'engagement',
	recompensa_popular: 'engagement',
};

// --- Mapeo tipo → severidad default ---

export const SEVERIDAD_DEFAULT: Record<TipoAlerta, SeveridadAlerta> = {
	monto_inusual: 'alta',
	cliente_frecuente: 'alta',
	fuera_horario: 'media',
	montos_redondos: 'media', // desactivado por defecto
	empleado_destacado: 'alta',
	voucher_estancado: 'media',
	acumulacion_vouchers: 'media',
	oferta_por_expirar: 'baja',
	cupones_por_expirar: 'baja',
	caida_ventas: 'alta',
	cliente_vip_inactivo: 'media',
	racha_resenas_negativas: 'alta',
	pico_actividad: 'baja',
	cupones_sin_canjear: 'baja',
	puntos_por_expirar: 'media',
	recompensa_popular: 'baja',
};

// --- Umbrales por defecto ---

export interface UmbralesMontoInusual { multiplicador: number }
export interface UmbralesClienteFrecuente { maxComprasHora: number }
export interface UmbralesMontosRedondos { minimoConsecutivos: number }
export interface UmbralesEmpleadoDestacado { alertasMaxMes: number }
export interface UmbralesVoucherEstancado { diasMaximo: number }
export interface UmbralesAcumulacionVouchers { maximoPendientes: number }
export interface UmbralesOfertaPorExpirar { diasAnticipacion: number }
export interface UmbralesCuponesPorExpirar { diasAnticipacion: number }
export interface UmbralesCaidaVentas { porcentajeCaida: number }
export interface UmbralesClienteVipInactivo { diasInactividad: number }
export interface UmbralesRachaResenas { minimoResenas: number; maximoEstrellas: number }
export interface UmbralesPicoActividad { multiplicador: number }
export interface UmbralesCuponesSinCanjear { porcentajeMinimo: number }
export interface UmbralesPuntosPorExpirar { diasAnticipacion: number }
export interface UmbralesRecompensaPopular { stockMinimo: number }

export type UmbralesAlerta =
	| UmbralesMontoInusual
	| UmbralesClienteFrecuente
	| UmbralesMontosRedondos
	| UmbralesEmpleadoDestacado
	| UmbralesVoucherEstancado
	| UmbralesAcumulacionVouchers
	| UmbralesOfertaPorExpirar
	| UmbralesCuponesPorExpirar
	| UmbralesCaidaVentas
	| UmbralesClienteVipInactivo
	| UmbralesRachaResenas
	| UmbralesPicoActividad
	| UmbralesCuponesSinCanjear
	| UmbralesPuntosPorExpirar
	| UmbralesRecompensaPopular
	| Record<string, never>; // Para tipos sin umbrales (fuera_horario, cliente_reporte)

export const UMBRALES_DEFAULT: Record<TipoAlerta, UmbralesAlerta> = {
	monto_inusual: { multiplicador: 3 },
	cliente_frecuente: { maxComprasHora: 3 },
	fuera_horario: {},
	montos_redondos: { minimoConsecutivos: 3 },
	empleado_destacado: { alertasMaxMes: 3 },
	voucher_estancado: { diasMaximo: 7 },
	acumulacion_vouchers: { maximoPendientes: 10 },
	oferta_por_expirar: { diasAnticipacion: 2 },
	cupones_por_expirar: { diasAnticipacion: 2 },
	caida_ventas: { porcentajeCaida: 20 },
	cliente_vip_inactivo: { diasInactividad: 30 },
	racha_resenas_negativas: { minimoResenas: 2, maximoEstrellas: 2 },
	pico_actividad: { multiplicador: 2 },
	cupones_sin_canjear: { porcentajeMinimo: 10 },
	puntos_por_expirar: { diasAnticipacion: 7 },
	recompensa_popular: { stockMinimo: 5 },
};

// --- Lista de todos los tipos ---

export const TODOS_LOS_TIPOS: TipoAlerta[] = Object.keys(TIPO_A_CATEGORIA) as TipoAlerta[];

// --- Interfaces principales ---

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
	/** Leída por el usuario actual (estado por usuario). */
	leida: boolean;
	leidaAt: string | null;
	/** Resuelta globalmente (el problema ya fue atendido, todos la ven así). */
	resuelta: boolean;
	resueltaAt: string | null;
	/** Quién la resolvió — para mostrar "Resuelta por X el Y" en el detalle. */
	resueltaPor: { id: string; nombre: string } | null;
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
	umbrales: UmbralesAlerta;
}

export interface FiltrosAlertas {
	tipo?: TipoAlerta;
	categoria?: CategoriaAlerta;
	severidad?: SeveridadAlerta;
	leida?: boolean;
	resuelta?: boolean;
	fechaDesde?: string;
	fechaHasta?: string;
	busqueda?: string;
	pagina: number;
	porPagina: number;
}

export interface CrearAlertaInput {
	negocioId: string;
	sucursalId?: string;
	transaccionId?: string;
	empleadoId?: string;
	tipo: TipoAlerta;
	titulo: string;
	descripcion: string;
	data?: Record<string, unknown>;
	accionesSugeridas?: string[];
	severidad?: SeveridadAlerta;
}

export interface RespuestaAlertasPaginada {
	alertas: AlertaCompleta[];
	total: number;
	pagina: number;
	porPagina: number;
	totalPaginas: number;
}
