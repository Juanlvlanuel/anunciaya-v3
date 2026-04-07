/**
 * ModalEmpleado.tsx
 * ==================
 * Modal para crear o editar un empleado.
 * Usa ModalAdaptativo con formulario completo.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/empleados/ModalEmpleado.tsx
 */

import { useState } from 'react';
import { UserCog, Save } from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { useCrearEmpleado, useActualizarEmpleado } from '../../../../hooks/queries/useEmpleados';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { notificar } from '../../../../utils/notificaciones';
import type { EmpleadoDetalle } from '../../../../types/empleados';
import { LABELS_PERMISOS } from '../../../../types/empleados';

interface Props {
	empleado?: EmpleadoDetalle;
	onCerrar: () => void;
}

export function ModalEmpleado({ empleado, onCerrar }: Props) {
	const crearMutation = useCrearEmpleado();
	const actualizarMutation = useActualizarEmpleado();
	const { usuario } = useAuthStore();
	const esEditar = !!empleado;

	const [nombre, setNombre] = useState(empleado?.nombre ?? '');
	const [nick, setNick] = useState(empleado?.nick ?? '');
	const [pin, setPin] = useState(empleado?.pinAcceso ?? '');
	const [sucursalId, setSucursalId] = useState(empleado?.sucursalId ?? usuario?.sucursalActiva ?? '');
	const [especialidad, setEspecialidad] = useState(empleado?.especialidad ?? '');
	const [telefono, setTelefono] = useState(empleado?.telefono ?? '');
	const [correo, setCorreo] = useState(empleado?.correo ?? '');
	const [notasInternas, setNotasInternas] = useState(empleado?.notasInternas ?? '');
	const [permisos, setPermisos] = useState({
		puedeRegistrarVentas: empleado?.permisos.puedeRegistrarVentas ?? true,
		puedeProcesarCanjes: empleado?.permisos.puedeProcesarCanjes ?? true,
		puedeVerHistorial: empleado?.permisos.puedeVerHistorial ?? true,
		puedeResponderChat: empleado?.permisos.puedeResponderChat ?? true,
		puedeResponderResenas: empleado?.permisos.puedeResponderResenas ?? true,
	});
	const [guardando, setGuardando] = useState(false);

	const handleGuardar = async () => {
		if (!nombre.trim() || !nick.trim() || (!esEditar && !pin.trim())) {
			notificar.error('Nombre, nick y PIN son obligatorios');
			return;
		}
		if (pin && !/^\d{4}$/.test(pin)) {
			notificar.error('El PIN debe ser exactamente 4 dígitos');
			return;
		}

		setGuardando(true);
		try {
			if (esEditar) {
				await actualizarMutation.mutateAsync({
					id: empleado!.id,
					datos: {
						nombre: nombre.trim(),
						nick: nick.trim().toLowerCase(),
						...(pin ? { pinAcceso: pin } : {}),
						sucursalId,
						especialidad: especialidad.trim() || null,
						telefono: telefono.trim() || null,
						correo: correo.trim() || null,
						notasInternas: notasInternas.trim() || null,
						...permisos,
					},
				});
				onCerrar();
			} else {
				await crearMutation.mutateAsync({
					nombre: nombre.trim(),
					nick: nick.trim().toLowerCase(),
					pinAcceso: pin,
					sucursalId,
					especialidad: especialidad.trim() || undefined,
					telefono: telefono.trim() || undefined,
					correo: correo.trim() || undefined,
					notasInternas: notasInternas.trim() || undefined,
					...permisos,
				});
				onCerrar();
			}
		} catch {
			// Error ya notificado por la mutación
		} finally {
			setGuardando(false);
		}
	};

	const togglePermiso = (key: keyof typeof permisos) => {
		setPermisos(prev => ({ ...prev, [key]: !prev[key] }));
	};

	return (
		<ModalAdaptativo
			abierto={true}
			onCerrar={onCerrar}
			ancho="md"
			mostrarHeader={false}
			paddingContenido="none"
			sinScrollInterno
			alturaMaxima="xl"
			headerOscuro
			className="max-lg:[background:linear-gradient(180deg,#1e293b_2.5rem,rgb(248,250,252)_2.5rem)]"
		>
			<div data-testid="modal-empleado" className="flex flex-col" style={{ height: window.innerWidth >= 1024 ? '78vh' : '90vh' }}>
				{/* Header */}
				<div
					className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-3 lg:py-3 2xl:py-4 lg:rounded-t-2xl"
					style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.3)' }}
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-white/10 flex items-center justify-center">
							<UserCog className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
						</div>
						<div>
							<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">
								{esEditar ? 'Editar empleado' : 'Nuevo empleado'}
							</h2>
							<p className="text-base lg:text-xs 2xl:text-sm text-white/70 font-medium">
								{esEditar ? empleado?.nombre : 'Completa los datos del empleado'}
							</p>
						</div>
					</div>
				</div>

				{/* Contenido scroll */}
				<div className="flex-1 overflow-y-auto px-4 lg:px-3 2xl:px-4 py-3 space-y-3">
					{/* Nombre */}
					<div>
						<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Nombre completo *</label>
						<input
							value={nombre}
							onChange={e => setNombre(e.target.value)}
							className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
							placeholder="Juan Pérez"
							data-testid="input-nombre-empleado"
						/>
					</div>

					{/* Nick + PIN */}
					<div className="flex gap-3">
						<div className="flex-1">
							<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Nick *</label>
							<input
								value={nick}
								onChange={e => setNick(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
								className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
								placeholder="juanperez"
								maxLength={30}
								data-testid="input-nick-empleado"
							/>
						</div>
						<div className="w-28">
							<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">PIN {!esEditar && '*'}</label>
							<input
								value={pin}
								onChange={e => { const v = e.target.value; if (v === '' || /^\d{0,4}$/.test(v)) setPin(v); }}
								className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white text-center tracking-widest"
								placeholder="0000"
								inputMode="numeric"
								maxLength={4}
								data-testid="input-pin-empleado"
							/>
						</div>
					</div>

					{/* Especialidad + Teléfono */}
					<div className="flex gap-3">
						<div className="flex-1">
							<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Especialidad</label>
							<input
								value={especialidad}
								onChange={e => setEspecialidad(e.target.value)}
								className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
								placeholder="Cajero, Mesero..."
							/>
						</div>
						<div className="flex-1">
							<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Teléfono</label>
							<input
								value={telefono}
								onChange={e => setTelefono(e.target.value)}
								className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
								placeholder="6381234567"
							/>
						</div>
					</div>

					{/* Correo */}
					<div>
						<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Correo</label>
						<input
							value={correo}
							onChange={e => setCorreo(e.target.value)}
							className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
							placeholder="empleado@email.com"
							type="email"
						/>
					</div>

					{/* Notas */}
					<div>
						<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Notas internas</label>
						<textarea
							value={notasInternas}
							onChange={e => setNotasInternas(e.target.value)}
							className="w-full h-20 lg:h-16 2xl:h-20 px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white resize-none"
							placeholder="Notas privadas sobre el empleado..."
							maxLength={500}
						/>
					</div>

					{/* Permisos */}
					<div>
						<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-2 block">Permisos</label>
						<div className="space-y-1.5">
							{(Object.keys(permisos) as (keyof typeof permisos)[]).map(key => (
								<div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-200 border-2 border-slate-300">
									<span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">
										{LABELS_PERMISOS[key]}
									</span>
									<label className="shrink-0 cursor-pointer group">
										<input
											type="checkbox"
											checked={permisos[key]}
											onChange={() => togglePermiso(key)}
											className="sr-only"
											data-testid={`toggle-${key}`}
										/>
										<div className="relative w-12 h-6 lg:w-10 lg:h-5">
											<div className="absolute inset-0 bg-slate-300 group-has-checked:bg-slate-500 rounded-full transition-colors" />
											<div className="absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform group-has-checked:translate-x-6 lg:group-has-checked:translate-x-5" />
										</div>
									</label>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="shrink-0 px-4 lg:px-3 2xl:px-4 py-3 border-t border-slate-300">
					<button
						onClick={handleGuardar}
						disabled={guardando}
						className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm lg:text-xs 2xl:text-sm text-white shadow-lg active:scale-[0.98] cursor-pointer disabled:opacity-50"
						style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
						data-testid="btn-guardar-empleado"
					>
						<Save className="w-4 h-4" />
						{guardando ? 'Guardando...' : esEditar ? 'Guardar cambios' : 'Crear empleado'}
					</button>
				</div>
			</div>
		</ModalAdaptativo>
	);
}
