/**
 * ModalDetalleSucursal.tsx
 * =========================
 * Modal de solo lectura con detalle de sucursal + sección gerente.
 *
 * Sección Gerente:
 * - Si tiene gerente → avatar + nombre + correo + botones (Revocar, Reenviar credenciales)
 * - Si no tiene → formulario inline para asignar gerente:
 *   - Correo primero (detecta cuenta existente o nueva)
 *   - Nombre / apellidos (auto-llenados y deshabilitados si es promoción)
 *
 * Ubicación: apps/web/src/pages/private/business-studio/sucursales/ModalDetalleSucursal.tsx
 */

import { useState } from 'react';
import {
	Building2,
	MapPin,
	Phone,
	Mail,
	Star,
	User,
	UserPlus,
	UserCheck,
	KeyRound,
	UserMinus,
	Pencil,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import Tooltip from '../../../../components/ui/Tooltip';
import { InputCorreoValidado, type ResultadoValidacionCorreo } from '../../../../components/ui/InputCorreoValidado';
import {
	useSucursalGerente,
	useCrearGerente,
	useRevocarGerente,
	useReenviarCredenciales,
} from '../../../../hooks/queries/useSucursales';
import { Spinner } from '../../../../components/ui/Spinner';
import { notificar } from '../../../../utils/notificaciones';
import { obtenerIniciales } from '../../../../utils/obtenerIniciales';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { SucursalResumen } from '../../../../types/sucursales';

interface Props {
	sucursal: SucursalResumen;
	onCerrar: () => void;
	onEditar: () => void;
}

export function ModalDetalleSucursal({ sucursal, onCerrar, onEditar }: Props) {
	const { usuario } = useAuthStore();
	const gerenteQuery = useSucursalGerente(sucursal.id);
	// Si el query ya completó, confiar en él (incluso si es null después de revocar).
	// Solo usar el prop como fallback mientras carga.
	const gerente = gerenteQuery.isSuccess ? gerenteQuery.data : sucursal.gerente;
	const crearGerenteMutation = useCrearGerente();
	const revocarGerenteMutation = useRevocarGerente();
	const reenviarMutation = useReenviarCredenciales();

	// Estado para formulario de crear gerente
	const [mostrarFormGerente, setMostrarFormGerente] = useState(false);
	const [gerenteNombre, setGerenteNombre] = useState('');
	const [gerenteApellidos, setGerenteApellidos] = useState('');
	const [gerenteCorreo, setGerenteCorreo] = useState('');
	const [validacionCorreo, setValidacionCorreo] = useState<ResultadoValidacionCorreo>({ valido: false });
	const [creandoGerente, setCreandoGerente] = useState(false);

	const correosExcluidos = usuario?.correo ? [usuario.correo] : [];
	const esPromocion = validacionCorreo.tipo === 'promocion';

	const handleCrearGerente = async () => {
		if (!validacionCorreo.valido) {
			notificar.error('El correo no es válido');
			return;
		}

		// En promoción: backend usa los datos del usuario existente (nombre/apellidos son ignorados).
		// En creación: se requiere nombre y apellidos del formulario.
		if (!esPromocion && (!gerenteNombre.trim() || !gerenteApellidos.trim())) {
			notificar.error('Nombre y apellidos son obligatorios');
			return;
		}

		setCreandoGerente(true);
		try {
			await crearGerenteMutation.mutateAsync({
				sucursalId: sucursal.id,
				datos: {
					nombre: (esPromocion && validacionCorreo.existente ? validacionCorreo.existente.nombre : gerenteNombre).trim(),
					apellidos: (esPromocion && validacionCorreo.existente ? validacionCorreo.existente.apellidos : gerenteApellidos).trim(),
					correo: gerenteCorreo.trim(),
				},
			});
			setMostrarFormGerente(false);
			setGerenteNombre('');
			setGerenteApellidos('');
			setGerenteCorreo('');
			setValidacionCorreo({ valido: false });
		} catch {
			// Error ya notificado
		} finally {
			setCreandoGerente(false);
		}
	};

	const handleRevocar = async () => {
		const ok = await notificar.confirmar(
			`¿Revocar a "${gerente?.nombre}" como gerente? Su cuenta quedará como usuario personal.`
		);
		if (ok) revocarGerenteMutation.mutate(sucursal.id);
	};

	const handleReenviar = async () => {
		const ok = await notificar.confirmar('¿Reenviar credenciales provisionales? Se generará una nueva contraseña.');
		if (ok) reenviarMutation.mutate(sucursal.id);
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
			className="max-lg:[background:linear-gradient(180deg,#1e293b_2.5rem,rgb(248,250,252)_2.5rem)]"
		>
			<div data-testid="modal-detalle-sucursal" className="flex flex-col max-h-[80vh] lg:max-h-[75vh]">
				{/* Header — cambia de contexto si el sub-flujo de asignar gerente está abierto */}
				<div
					className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-3 lg:py-3 2xl:py-4 lg:rounded-t-2xl"
					style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.3)' }}
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-white/10 flex items-center justify-center">
							{mostrarFormGerente ? (
								<UserPlus className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
							) : (
								<Building2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
							)}
						</div>
						<div className="flex-1 min-w-0">
							{mostrarFormGerente ? (
								<>
									<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
										Asignar gerente
									</h2>
									<p className="text-base lg:text-xs 2xl:text-sm text-white/70 font-medium truncate">
										{sucursal.nombre}
									</p>
								</>
							) : (
								<>
									<div className="flex items-center gap-2">
										<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
											{sucursal.nombre}
										</h2>
										{sucursal.esPrincipal && (
											<Star className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" />
										)}
									</div>
									<p className="text-base lg:text-xs 2xl:text-sm text-white/70 font-medium">
										{sucursal.activa ? 'Activa' : 'Inactiva'}
									</p>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Contenido scroll */}
				<div className="flex-1 overflow-y-auto px-4 lg:px-3 2xl:px-4 py-4 space-y-4">
					{/* ── Card hero: foto de perfil/icono + nombre + dirección ── */}
					<div className="flex items-start gap-3">
						{sucursal.fotoPerfil ? (
							<div className="w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-md border-2 border-white bg-white">
								<img src={sucursal.fotoPerfil} alt="" className="w-full h-full object-cover" />
							</div>
						) : (
							<div
								className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md"
								style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
							>
								<Building2 className="w-7 h-7 text-white" />
							</div>
						)}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-1.5">
								<p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-900 truncate">
									{sucursal.nombre}
								</p>
								{sucursal.esPrincipal && (
									<Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
								)}
							</div>
							{(sucursal.direccion || sucursal.ciudad) && (
								<div className="flex items-start gap-1.5 mt-1">
									<MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
									<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 leading-snug">
										{sucursal.direccion ? `${sucursal.direccion}, ` : ''}
										{sucursal.ciudad}
										{sucursal.estado ? `, ${sucursal.estado}` : ''}
									</p>
								</div>
							)}
						</div>
					</div>

					{/* ── Chips de contacto ── */}
					{(sucursal.telefono || sucursal.correo) && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
							{sucursal.telefono && (
								<div className="flex items-center gap-2 px-3 h-10 bg-slate-200 rounded-lg border border-slate-300">
									<Phone className="w-4 h-4 text-slate-600 shrink-0" />
									<span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-700 truncate">{sucursal.telefono}</span>
								</div>
							)}
							{sucursal.correo && (
								<div className="flex items-center gap-2 px-3 h-10 bg-slate-200 rounded-lg border border-slate-300">
									<Mail className="w-4 h-4 text-slate-600 shrink-0" />
									<span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-700 truncate">{sucursal.correo}</span>
								</div>
							)}
						</div>
					)}

					{/* ── Divider con etiqueta "Gerente" ── */}
					<div className="flex items-center gap-3 pt-1">
						<div className="flex-1 h-px bg-slate-300" />
						<span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-600">Gerente</span>
						<div className="flex-1 h-px bg-slate-300" />
					</div>

					{gerenteQuery.isPending ? (
						<div className="flex justify-center py-4"><Spinner /></div>
					) : gerente ? (
						/* ── Gerente asignado ── */
						<div>
							<div className="flex items-center gap-3">
								<div
									className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-md"
									style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
								>
									{gerente.avatarUrl ? (
										<img src={gerente.avatarUrl} alt={gerente.nombre} className="w-full h-full object-cover" />
									) : (
										<span className="text-base font-bold text-white">
											{obtenerIniciales(`${gerente.nombre} ${gerente.apellidos}`)}
										</span>
									)}
								</div>
								<div className="flex-1 min-w-0 flex items-center gap-2.5">
									<div className="min-w-0">
										<p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-900 truncate">{gerente.nombre} {gerente.apellidos}</p>
										<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 truncate">{gerente.correo}</p>
										{gerente.requiereCambioContrasena && (
											<span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300 mt-1">
												Pendiente de activación
											</span>
										)}
									</div>
									{/* Revocar — pegado al texto */}
									<Tooltip text="Revocar gerente">
										<button
											onClick={handleRevocar}
											disabled={revocarGerenteMutation.isPending}
											className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
											data-testid="btn-revocar-gerente"
										>
											{revocarGerenteMutation.isPending ? <Spinner tamanio="sm" color="white" /> : <UserMinus className="w-4 h-4" />}
										</button>
									</Tooltip>
								</div>
							</div>

							{/* Reenviar credenciales — solo si pendiente de activación */}
							{gerente.requiereCambioContrasena && (
								<button
									onClick={handleReenviar}
									disabled={reenviarMutation.isPending}
									className="w-full inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-bold text-indigo-700 bg-indigo-50 border-2 border-indigo-200 hover:bg-indigo-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-3"
									data-testid="btn-reenviar-credenciales"
								>
									{reenviarMutation.isPending ? <Spinner tamanio="sm" /> : <KeyRound className="w-4 h-4" />}
									Reenviar credenciales
								</button>
							)}
						</div>
					) : mostrarFormGerente ? (
						/* ── Formulario crear/asignar gerente ── */
						<div className="space-y-3" data-testid="form-crear-gerente">
							{/* Correo primero — al detectar cuenta existente auto-llena nombre/apellidos */}
							<InputCorreoValidado
								label="Correo *"
								value={gerenteCorreo}
								onChange={setGerenteCorreo}
								correosExcluidos={correosExcluidos}
								mensajeExclusion="No puedes asignarte como gerente de tu propia sucursal"
								modo="gerente"
								onValidezCambio={setValidacionCorreo}
								placeholder="gerente@email.com"
								testIdPrefix="input-gerente-correo"
							/>
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
								<div>
									<label className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1 block">Nombre *</label>
									<input
										value={esPromocion && validacionCorreo.existente ? validacionCorreo.existente.nombre : gerenteNombre}
										onChange={e => setGerenteNombre(e.target.value)}
										disabled={esPromocion}
										className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
										placeholder="Nombre del gerente"
										data-testid="input-gerente-nombre"
									/>
								</div>
								<div>
									<label className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1 block">Apellidos *</label>
									<input
										value={esPromocion && validacionCorreo.existente ? validacionCorreo.existente.apellidos : gerenteApellidos}
										onChange={e => setGerenteApellidos(e.target.value)}
										disabled={esPromocion}
										className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
										placeholder="Apellidos del gerente"
										data-testid="input-gerente-apellidos"
									/>
								</div>
							</div>
							{/* Solo mostrar descripción cuando la validación del correo determinó el tipo y hay nombre */}
							{validacionCorreo.valido && (esPromocion ? validacionCorreo.existente : gerenteNombre.trim()) && (
								<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
									{esPromocion && validacionCorreo.existente
										? `${validacionCorreo.existente.nombre} recibirá una invitación por correo.`
										: `${gerenteNombre.trim()} recibirá sus credenciales de acceso por correo.`}
								</p>
							)}
							<div className="flex gap-2 pt-1">
								<button
									onClick={() => setMostrarFormGerente(false)}
									className="flex-1 h-10 px-3 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-600 border-2 border-slate-300 hover:bg-slate-100 cursor-pointer"
									data-testid="btn-cancelar-gerente"
								>
									Cancelar
								</button>
								<button
									onClick={handleCrearGerente}
									disabled={creandoGerente || !validacionCorreo.valido || (!esPromocion && (!gerenteNombre.trim() || !gerenteApellidos.trim()))}
									className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg text-sm lg:text-[11px] 2xl:text-sm font-bold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
									style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
									data-testid="btn-confirmar-gerente"
								>
									{creandoGerente && <Spinner tamanio="sm" color="white" />}
									{esPromocion ? (
										<><UserCheck className="w-4 h-4" /> Asignar gerente</>
									) : (
										<>Crear cuenta</>
									)}
								</button>
							</div>
						</div>
					) : (
						/* ── Sin gerente — botón asignar ── */
						<button
							onClick={() => setMostrarFormGerente(true)}
							className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50 cursor-pointer transition-colors"
							data-testid="btn-asignar-gerente"
						>
							<UserPlus className="w-5 h-5" />
							<span className="text-sm font-bold">Asignar gerente</span>
						</button>
					)}
				</div>

				{/* Footer — se oculta durante el sub-flujo de asignar gerente para evitar clicks accidentales */}
				{!mostrarFormGerente && (
				<div className="shrink-0 px-4 lg:px-3 2xl:px-4 py-3 border-t border-slate-200 flex gap-3">
					<button
						onClick={onCerrar}
						className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl
							px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer
							border-2 border-slate-400 text-slate-600 bg-transparent
							hover:bg-slate-200 hover:border-slate-500"
						data-testid="btn-cerrar-detalle"
					>
						Cerrar
					</button>
					<button
						onClick={onEditar}
						className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl
							px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer
							bg-linear-to-r from-slate-700 to-slate-800 text-white
							shadow-lg shadow-slate-700/30
							hover:from-slate-800 hover:to-slate-900"
						data-testid="btn-editar-perfil"
					>
						<Pencil className="w-4 h-4" />
						Editar
					</button>
				</div>
				)}
			</div>
		</ModalAdaptativo>
	);
}
