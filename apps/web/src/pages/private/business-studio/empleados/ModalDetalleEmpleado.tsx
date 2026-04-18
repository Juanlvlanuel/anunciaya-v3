/**
 * ModalDetalleEmpleado.tsx
 * =========================
 * Modal para ver detalle completo de un empleado.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/empleados/ModalDetalleEmpleado.tsx
 */

import {
	UserCog,
	Edit3,
	ShoppingCart,
	Gift,
	Eye,
	MessageSquare,
	Star,
	Clock,
	Zap,
	Award,
	Calendar,
	Power,
	Trash2,
	LogOut,
	CheckCircle2,
	XCircle,
	Phone,
	Mail,
	Briefcase,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import Tooltip from '../../../../components/ui/Tooltip';
import { useToggleEmpleadoActivo, useEliminarEmpleado, useRevocarSesion } from '../../../../hooks/queries/useEmpleados';
import { notificar } from '../../../../utils/notificaciones';
import { obtenerIniciales } from '../../../../utils/obtenerIniciales';
import type { EmpleadoDetalle } from '../../../../types/empleados';
import { LABELS_PERMISOS, DIAS_SEMANA } from '../../../../types/empleados';

const ICONOS_PERMISOS = {
	puedeRegistrarVentas: ShoppingCart,
	puedeProcesarCanjes: Gift,
	puedeVerHistorial: Eye,
	puedeResponderChat: MessageSquare,
	puedeResponderResenas: Star,
};

interface Props {
	empleado: EmpleadoDetalle;
	onCerrar: () => void;
	onEditar: () => void;
}

export function ModalDetalleEmpleado({ empleado, onCerrar, onEditar }: Props) {
	const toggleActivoMutation = useToggleEmpleadoActivo();
	const eliminarMutation = useEliminarEmpleado();
	const revocarMutation = useRevocarSesion();

	const handleToggleActivo = async () => {
		try {
			await toggleActivoMutation.mutateAsync({ id: empleado.id, activo: !empleado.activo });
			notificar.exito(empleado.activo ? 'Empleado desactivado' : 'Empleado activado');
			onCerrar();
		} catch {
			// Error ya notificado por la mutación
		}
	};

	const handleEliminar = async () => {
		const ok = await notificar.confirmar(`¿Eliminar a "${empleado.nombre}"? Se perderá el historial de sus transacciones.`);
		if (!ok) return;
		try {
			await eliminarMutation.mutateAsync(empleado.id);
			onCerrar();
		} catch {
			// Error ya notificado por la mutación
		}
	};

	const handleRevocarSesion = async () => {
		try {
			await revocarMutation.mutateAsync(empleado.id);
		} catch {
			// Error ya notificado por la mutación
		}
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
			className="lg:max-w-md 2xl:max-w-lg max-lg:[background:linear-gradient(180deg,#1e293b_2.5rem,rgb(248,250,252)_2.5rem)]"
		>
			<div data-testid="modal-detalle-empleado">
				{/* Header */}
				<div
					className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 lg:rounded-t-2xl"
					style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.3)' }}
				>
					<div className="flex items-center gap-3">
						{/* Avatar */}
						<div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
							{empleado.fotoUrl ? (
								<img src={empleado.fotoUrl} alt="" className="w-full h-full object-cover" />
							) : (
								<span className="text-base font-bold text-white">{obtenerIniciales(empleado.nombre)}</span>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">{empleado.nombre}</h2>
							<div className="flex items-center gap-2">
								{empleado.nick && <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-white/70">@{empleado.nick}</span>}
								<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
									empleado.activo ? 'bg-white/15 text-emerald-300' : 'bg-white/15 text-red-300'
								}`}>
									{empleado.activo ? 'Activo' : 'Inactivo'}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-y-auto">
					{/* Info básica */}
					{(empleado.especialidad || empleado.telefono || empleado.correo) && (
						<div className="px-4 lg:px-3 2xl:px-4 py-3 space-y-2">
							{empleado.especialidad && (
								<div className="flex items-center gap-2.5">
									<Briefcase className="w-4 h-4 text-slate-400" />
									<span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{empleado.especialidad}</span>
								</div>
							)}
							{empleado.telefono && (
								<div className="flex items-center gap-2.5">
									<Phone className="w-4 h-4 text-slate-400" />
									<span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{empleado.telefono}</span>
								</div>
							)}
							{empleado.correo && (
								<div className="flex items-center gap-2.5">
									<Mail className="w-4 h-4 text-slate-400" />
									<span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{empleado.correo}</span>
								</div>
							)}
						</div>
					)}

					{/* Permisos */}
					<div className="px-4 lg:px-3 2xl:px-4 py-3">
						<div className="flex items-center gap-2 mb-3">
							<Zap className="w-5 h-5 text-slate-600" />
							<p className="text-base lg:text-sm 2xl:text-base font-extrabold text-slate-800">Permisos</p>
						</div>
						<div className="rounded-lg overflow-hidden border-2 border-slate-300">
							{(Object.keys(LABELS_PERMISOS) as (keyof typeof LABELS_PERMISOS)[]).map((key, i) => {
								const Icono = ICONOS_PERMISOS[key];
								const activo = empleado.permisos[key];
								return (
									<div
										key={key}
										className={`flex items-center justify-between px-3 py-2 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-slate-200'}`}
									>
										<div className="flex items-center gap-2.5">
											<Icono className={`w-4 h-4 ${activo ? 'text-slate-600' : 'text-slate-300'}`} />
											<span className={`text-sm lg:text-xs 2xl:text-sm font-semibold ${activo ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
												{LABELS_PERMISOS[key]}
											</span>
										</div>
										{activo ? (
											<CheckCircle2 className="w-5 h-5 text-emerald-500" />
										) : (
											<XCircle className="w-5 h-5 text-slate-300" />
										)}
									</div>
								);
							})}
						</div>
					</div>

					{/* Estadísticas ScanYA */}
					<div className="px-4 lg:px-3 2xl:px-4 py-3">
						<div className="flex items-center gap-2 mb-3">
							<Award className="w-5 h-5 text-slate-600" />
							<p className="text-base lg:text-sm 2xl:text-base font-extrabold text-slate-800">Estadísticas ScanYA</p>
						</div>
						<div className="flex items-center justify-between">
							<div className="flex-1 flex flex-col items-center gap-0.5">
								<Clock className="w-5 h-5 text-slate-400" />
								<p className="text-xs text-slate-500 font-semibold">Turnos</p>
								<p className="text-base font-extrabold text-slate-800">{empleado.estadisticas.totalTurnos}</p>
							</div>
							<div className="h-14 rounded-full" style={{ width: 3, background: 'linear-gradient(to bottom, transparent, #cbd5e1, transparent)' }} />
							<div className="flex-1 flex flex-col items-center gap-0.5">
								<ShoppingCart className="w-5 h-5 text-slate-400" />
								<p className="text-xs text-slate-500 font-semibold">Transacciones</p>
								<p className="text-base font-extrabold text-slate-800">{empleado.estadisticas.transaccionesRegistradas}</p>
							</div>
							<div className="h-14 rounded-full" style={{ width: 3, background: 'linear-gradient(to bottom, transparent, #cbd5e1, transparent)' }} />
							<div className="flex-1 flex flex-col items-center gap-0.5">
								<Zap className="w-5 h-5 text-slate-400" />
								<p className="text-xs text-slate-500 font-semibold">Puntos</p>
								<p className="text-base font-extrabold text-slate-800">{empleado.estadisticas.puntosOtorgados.toLocaleString()}</p>
							</div>
						</div>
					</div>

					{/* Horarios */}
					{empleado.horarios.length > 0 && (
						<div className="px-4 lg:px-3 2xl:px-4 py-3">
							<div className="flex items-center gap-1.5 mb-2">
								<Calendar className="w-5 h-5 text-slate-600" />
								<p className="text-base lg:text-sm 2xl:text-base font-extrabold text-slate-800">Horarios</p>
							</div>
							<div className="space-y-1">
								{empleado.horarios.map((h, i) => (
									<div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
										<span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">{DIAS_SEMANA[h.diaSemana]}</span>
										<span className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-500">
											{h.horaEntrada.slice(0, 5)} — {h.horaSalida.slice(0, 5)}
										</span>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Notas internas */}
					{empleado.notasInternas && (
						<div className="px-4 lg:px-3 2xl:px-4 py-3">
							<div className="bg-amber-50 rounded-xl p-3 border-2 border-amber-200">
								<p className="text-xs font-bold text-amber-800 mb-1">Notas internas</p>
								<p className="text-sm lg:text-xs 2xl:text-sm font-medium text-amber-700">{empleado.notasInternas}</p>
							</div>
						</div>
					)}

					{/* Botones de acción */}
					<div className="px-4 lg:px-3 2xl:px-4 py-3">
						<div className="flex items-center gap-2">
							<button
								onClick={onEditar}
								className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm lg:text-xs 2xl:text-sm text-white shadow-lg active:scale-[0.98] cursor-pointer"
								style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
								data-testid="btn-editar-empleado"
							>
								<Edit3 className="w-4 h-4" />
								Editar
							</button>

							{empleado.nick && (
								<Tooltip text="Cerrar sesión en ScanYA">
									<button
										onClick={handleRevocarSesion}
										className="flex items-center justify-center px-3 py-2.5 rounded-xl text-orange-400 hover:text-orange-600 hover:bg-orange-100 cursor-pointer"
										data-testid="btn-revocar-sesion"
									>
										<LogOut className="w-5 h-5" />
									</button>
								</Tooltip>
							)}

							<div className="flex items-center gap-1">
								<Tooltip text={empleado.activo ? 'Desactivar empleado' : 'Activar empleado'}>
									<button
										onClick={handleToggleActivo}
										className={`flex items-center justify-center px-3 py-2.5 rounded-xl cursor-pointer ${
											empleado.activo
												? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
												: 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100'
										}`}
										data-testid="btn-toggle-activo"
									>
										<Power className="w-5 h-5" />
									</button>
								</Tooltip>

								<Tooltip text="Eliminar empleado">
									<button
										onClick={handleEliminar}
										className="flex items-center justify-center px-3 py-2.5 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-100 cursor-pointer"
										data-testid="btn-eliminar-empleado"
									>
										<Trash2 className="w-5 h-5" />
									</button>
								</Tooltip>
							</div>
						</div>
					</div>
				</div>
			</div>
		</ModalAdaptativo>
	);
}
