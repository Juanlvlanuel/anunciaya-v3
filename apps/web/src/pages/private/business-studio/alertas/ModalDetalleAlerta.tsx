/**
 * ModalDetalleAlerta.tsx
 * =======================
 * Modal para ver el detalle completo de una alerta.
 * Usa ModalAdaptativo con header gradiente dinámico (patrón BS).
 *
 * Ubicación: apps/web/src/pages/private/business-studio/alertas/ModalDetalleAlerta.tsx
 */

import { useNavigate } from 'react-router-dom';
import {
	Shield,
	Heart,
	Lightbulb,
	BarChart3,
	FileText,
	ExternalLink,
	type LucideIcon,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import type { ComponentType } from 'react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Wrench = (p: IconoWrapperProps) => <Icon icon={ICONOS.servicios} {...p} />;
const TrendingUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaSubida} {...p} />;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;

/** Tipo que admite tanto LucideIcon como wrappers locales Iconify. */
type IconLike =
	| LucideIcon
	| ComponentType<{ className?: string; strokeWidth?: number; fill?: string; width?: number | string; height?: number | string }>;
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { AlertaCompleta, CategoriaAlerta, SeveridadAlerta, TipoAlerta } from '../../../../types/alertas';

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Formato "Miércoles, 09 de Abril de 2026, 15:30" */
const formatearFechaCompleta = (fechaISO: string) => {
	const fecha = new Date(fechaISO);
	const dia = DIAS_SEMANA[fecha.getDay()];
	const diaN = String(fecha.getDate()).padStart(2, '0');
	const mes = MESES_LARGOS[fecha.getMonth()];
	const anio = fecha.getFullYear();
	const hora = String(fecha.getHours()).padStart(2, '0');
	const min = String(fecha.getMinutes()).padStart(2, '0');
	return `${dia}, ${diaN} de ${mes} de ${anio}, ${hora}:${min}`;
};

const ICONO_CATEGORIA: Record<CategoriaAlerta, IconLike> = {
	seguridad: Shield,
	operativa: Wrench,
	rendimiento: TrendingUp,
	engagement: Heart,
};

const LABEL_CATEGORIA: Record<CategoriaAlerta, string> = {
	seguridad: 'Seguridad',
	operativa: 'Operativa',
	rendimiento: 'Rendimiento',
	engagement: 'Engagement',
};

const GRADIENTES_SEVERIDAD: Record<SeveridadAlerta, { gradiente: string; sombra: string; bgMovil: string }> = {
	alta: {
		gradiente: 'linear-gradient(135deg, #dc2626, #ef4444)',
		sombra: '0 4px 16px rgba(220,38,38,0.3)',
		bgMovil: 'max-lg:[background:linear-gradient(180deg,#dc2626_2.5rem,rgb(248,250,252)_2.5rem)]',
	},
	media: {
		gradiente: 'linear-gradient(135deg, #d97706, #f59e0b)',
		sombra: '0 4px 16px rgba(217,119,6,0.3)',
		bgMovil: 'max-lg:[background:linear-gradient(180deg,#d97706_2.5rem,rgb(248,250,252)_2.5rem)]',
	},
	baja: {
		gradiente: 'linear-gradient(135deg, #2563eb, #3b82f6)',
		sombra: '0 4px 16px rgba(37,99,235,0.3)',
		bgMovil: 'max-lg:[background:linear-gradient(180deg,#2563eb_2.5rem,rgb(248,250,252)_2.5rem)]',
	},
};

const ENLACE_ALERTA: Partial<Record<TipoAlerta, { ruta: string; label: string }>> = {
	monto_inusual: { ruta: '/business-studio/transacciones', label: 'Ver transacciones' },
	cliente_frecuente: { ruta: '/business-studio/clientes', label: 'Ver clientes' },
	fuera_horario: { ruta: '/business-studio/transacciones', label: 'Ver transacciones' },
	montos_redondos: { ruta: '/business-studio/transacciones', label: 'Ver transacciones' },
	empleado_destacado: { ruta: '/business-studio/transacciones', label: 'Ver transacciones' },
	voucher_estancado: { ruta: '/business-studio/puntos', label: 'Ver recompensas' },
	acumulacion_vouchers: { ruta: '/business-studio/puntos', label: 'Ver recompensas' },
	oferta_por_expirar: { ruta: '/business-studio/promociones', label: 'Ver promociones' },
	cupones_por_expirar: { ruta: '/business-studio/promociones', label: 'Ver promociones' },
	caida_ventas: { ruta: '/business-studio/transacciones', label: 'Ver transacciones' },
	cliente_vip_inactivo: { ruta: '/business-studio/clientes', label: 'Ver clientes' },
	racha_resenas_negativas: { ruta: '/business-studio/opiniones', label: 'Ver opiniones' },
	pico_actividad: { ruta: '/business-studio/transacciones', label: 'Ver transacciones' },
	cupones_sin_canjear: { ruta: '/business-studio/promociones', label: 'Ver promociones' },
	puntos_por_expirar: { ruta: '/business-studio/clientes', label: 'Ver clientes' },
	recompensa_popular: { ruta: '/business-studio/puntos', label: 'Ver recompensas' },
};

interface Props {
	alerta: AlertaCompleta;
	onCerrar: () => void;
	onMarcarResuelta: (id: string) => Promise<void>;
	onEliminar: (id: string) => Promise<void>;
}

export function ModalDetalleAlerta({ alerta, onCerrar, onMarcarResuelta, onEliminar }: Props) {
	const navigate = useNavigate();
	const colores = GRADIENTES_SEVERIDAD[alerta.severidad];
	const IconoCat = ICONO_CATEGORIA[alerta.categoria];
	const enlace = ENLACE_ALERTA[alerta.tipo];

	const handleMarcarResuelta = async () => {
		await onMarcarResuelta(alerta.id);
		onCerrar();
	};

	const handleEliminar = async () => {
		await onEliminar(alerta.id);
		onCerrar();
	};

	const renderizarDatos = () => {
		if (!alerta.data || Object.keys(alerta.data).length === 0) return null;

		const datos = alerta.data;
		const items: { label: string; valor: string }[] = [];

		if (datos.cliente) items.push({ label: 'Cliente', valor: String(datos.cliente) });
		if (datos.empleado) items.push({ label: 'Empleado', valor: String(datos.empleado) });
		if (datos.monto) items.push({ label: 'Monto', valor: `$${Number(datos.monto).toFixed(2)}` });
		if (datos.promedio) items.push({ label: 'Promedio', valor: `$${Number(datos.promedio).toFixed(2)}` });
		if (datos.multiplicador) items.push({ label: 'Multiplicador', valor: `${datos.multiplicador}x` });
		if (datos.comprasEnHora) items.push({ label: 'Compras en 1h', valor: String(datos.comprasEnHora) });
		if (datos.totalPendientes) items.push({ label: 'Pendientes', valor: String(datos.totalPendientes) });
		if (datos.ventasSemana) items.push({ label: 'Ventas semana', valor: `$${Number(datos.ventasSemana).toFixed(2)}` });
		if (datos.promedioSemanal) items.push({ label: 'Promedio semanal', valor: `$${Number(datos.promedioSemanal).toFixed(2)}` });
		if (datos.porcentajeCambio) items.push({ label: 'Cambio', valor: `${Number(datos.porcentajeCambio).toFixed(1)}%` });
		if (datos.clientesAfectados) items.push({ label: 'Clientes afectados', valor: String(datos.clientesAfectados) });
		if (datos.clientesInactivos) items.push({ label: 'Clientes inactivos', valor: String(datos.clientesInactivos) });
		if (datos.resenasNegativas) items.push({ label: 'Reseñas negativas', valor: String(datos.resenasNegativas) });
		if (datos.tasaUso !== undefined) items.push({ label: 'Tasa de uso', valor: `${Number(datos.tasaUso).toFixed(0)}%` });
		if (datos.stock !== undefined) items.push({ label: 'Stock', valor: String(datos.stock) });
		if (datos.canjesSemana) items.push({ label: 'Canjes/semana', valor: String(datos.canjesSemana) });

		// Listas (clientes VIP, puntos por expirar, reseñas)
		const listas: { label: string; items: string[] }[] = [];
		if (Array.isArray(datos.clientes)) listas.push({ label: 'Clientes', items: datos.clientes as string[] });
		if (Array.isArray(datos.resenas)) listas.push({ label: 'Reseñas', items: datos.resenas as string[] });

		if (items.length === 0 && listas.length === 0) return null;

		return (
			<div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3">
				<div className="flex items-center gap-1.5 mb-2.5">
					<BarChart3 className="w-4 h-4 text-slate-500" />
					<p className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700">Datos del evento</p>
				</div>
				{items.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{items.map((item, i) => {
							const enLinea = ['Cliente', 'Empleado', 'Clientes afectados', 'Compras en 1h', 'Multiplicador', 'Clientes inactivos', 'Reseñas negativas', 'Stock', 'Canjes/semana', 'Pendientes', 'Tasa de uso'].includes(item.label);
							return enLinea ? (
								<div key={i} className="flex items-center gap-2 bg-slate-200 rounded-lg px-3 py-1.5 border-2 border-slate-300">
									<span className="text-[13px] lg:text-[11px] 2xl:text-[13px] text-slate-500 font-semibold">{item.label}</span>
									<span className="text-[15px] lg:text-xs 2xl:text-[15px] font-extrabold text-slate-800">{item.valor}</span>
								</div>
							) : (
								<div key={i} className="flex flex-col items-center bg-slate-200 rounded-lg px-3 py-1.5 border-2 border-slate-300">
									<span className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-slate-500 font-semibold">{item.label}</span>
									<span className="text-[15px] lg:text-xs 2xl:text-[15px] font-extrabold text-slate-800 -mt-0.5">{item.valor}</span>
								</div>
							);
						})}
					</div>
				)}

				{listas.map((lista, i) => (
					<div key={i} className="mt-2.5 bg-slate-100 rounded-xl p-3 border-2 border-slate-200">
						<p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-bold mb-1.5">{lista.label}</p>
						<ul className="space-y-1">
							{lista.items.map((item, j) => (
								<li key={j} className="flex items-start gap-2 text-sm lg:text-xs 2xl:text-sm text-slate-700 font-medium">
									<span className="text-slate-400 mt-0.5">•</span>
									{item}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		);
	};

	return (
		<ModalAdaptativo
			abierto={true}
			onCerrar={onCerrar}
			ancho="md"
			mostrarHeader={false}
			paddingContenido="none"
			sinScrollInterno
			alturaMaxima="lg"
			headerOscuro
			className={`lg:max-w-md 2xl:max-w-lg ${colores.bgMovil}`}
		>
			<div data-testid="modal-detalle-alerta">
				{/* Header con gradiente por severidad */}
				<div
					className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 lg:rounded-t-2xl"
					style={{ background: colores.gradiente, boxShadow: colores.sombra }}
				>
					<div className="flex items-center gap-2.5">
						<div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
							<IconoCat className="w-6 h-6 text-white" />
						</div>
						<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white flex-1 min-w-0 whitespace-pre-line">
								{alerta.titulo.includes(':')
									? alerta.titulo.replace(':', ':\n')
									: alerta.titulo.startsWith('"')
										? alerta.titulo.replace(/"\s/, '"\n')
										: alerta.titulo.includes('"')
											? alerta.titulo.replace(/\s*"/, '\n"')
											: alerta.titulo.includes(' hace ')
												? alerta.titulo.replace(' hace ', '\nhace ')
												: alerta.titulo}
							</h2>
						<div className="flex flex-col items-center shrink-0 gap-0.5">
							<span className="text-base lg:text-sm 2xl:text-base font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full capitalize">
								{alerta.severidad}
							</span>
							<span className="text-sm lg:text-xs 2xl:text-sm font-bold text-white/70">
								{LABEL_CATEGORIA[alerta.categoria]}
							</span>
						</div>
					</div>
				</div>

				{/* Body scrolleable */}
				<div className="flex-1 overflow-y-auto">
					{/* Descripción */}
					<div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3">
						<div className="flex items-start gap-2.5 bg-slate-100 rounded-xl p-3 border-2 border-slate-200">
							<FileText className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
							<p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium leading-relaxed">{alerta.descripcion}</p>
						</div>
					</div>

					{/* Datos JSONB */}
					{renderizarDatos()}

					{/* Enlace al contexto */}
					{enlace && (
						<div className="px-4 lg:px-3 2xl:px-4 py-2">
							<button
								onClick={() => { onCerrar(); navigate(enlace.ruta); }}
								className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 border-2 border-slate-300 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 hover:bg-slate-300 cursor-pointer"
								data-testid="btn-ver-contexto-alerta"
							>
								<ExternalLink className="w-4 h-4" />
								{enlace.label}
							</button>
						</div>
					)}

					{/* Acciones sugeridas */}
					{alerta.accionesSugeridas && alerta.accionesSugeridas.length > 0 && (
						<div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3">
							<div className="bg-amber-50 rounded-xl p-3 border-2 border-amber-200">
								<div className="flex items-center gap-1.5 mb-2">
									<Lightbulb className="w-4 h-4 text-amber-600" />
									<p className="text-sm lg:text-xs 2xl:text-sm font-bold text-amber-800">Acciones sugeridas</p>
								</div>
								<ul className="space-y-1.5">
									{alerta.accionesSugeridas.map((accion, i) => (
										<li key={i} className="flex items-start gap-2 text-sm lg:text-xs 2xl:text-sm text-amber-700 font-medium">
											<span className="text-amber-500 mt-0.5 font-bold">•</span>
											{accion}
										</li>
									))}
								</ul>
							</div>
						</div>
					)}

					{/* Fecha */}
					<div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3">
						<div className="flex items-center gap-1.5 text-sm lg:text-xs 2xl:text-sm text-slate-600 font-semibold">
							<Clock className="w-4 h-4" />
							{formatearFechaCompleta(alerta.createdAt)}
						</div>
						{alerta.resuelta && alerta.resueltaPor && alerta.resueltaAt && (
							<div className="flex items-center gap-1.5 text-sm lg:text-xs 2xl:text-sm text-emerald-700 font-semibold mt-1.5">
								<span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300">
									✓ Resuelta por {alerta.resueltaPor.nombre} · {formatearFechaCompleta(alerta.resueltaAt)}
								</span>
							</div>
						)}
					</div>

					{/* Botones de acción */}
					<div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 flex gap-2">
						{!alerta.resuelta ? (
							<button
								onClick={handleMarcarResuelta}
								className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm lg:text-xs 2xl:text-sm text-white shadow-lg active:scale-[0.98] cursor-pointer"
								style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
								data-testid="btn-detalle-marcar-resuelta"
							>
								Marcar como resuelta
							</button>
						) : (
							<button
								onClick={onCerrar}
								className="flex-1 px-4 py-2.5 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-600 rounded-xl border-2 border-slate-400 hover:bg-slate-100 cursor-pointer"
							>
								Cerrar
							</button>
						)}
						<button
							onClick={handleEliminar}
							className="px-4 py-2.5 text-sm lg:text-xs 2xl:text-sm font-bold text-red-500 rounded-xl border-2 border-red-200 hover:bg-red-50 cursor-pointer"
							data-testid="btn-detalle-eliminar"
						>
							Eliminar
						</button>
					</div>
				</div>
			</div>
		</ModalAdaptativo>
	);
}
