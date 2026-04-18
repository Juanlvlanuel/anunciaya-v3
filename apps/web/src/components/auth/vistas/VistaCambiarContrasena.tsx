/**
 * VistaCambiarContrasena.tsx
 * ===========================
 * Vista para que gerentes nuevos cambien su contraseña provisional.
 * Se muestra cuando el login retorna requiereCambioContrasena = true.
 *
 * El tokenTemporal (generado tras validar la provisional en el login)
 * es suficiente como prueba de autenticación — no se vuelve a pedir
 * la contraseña provisional aquí.
 *
 * Flujo: nueva contraseña + confirmar → POST → volver a login
 *
 * Ubicación: apps/web/src/components/auth/vistas/VistaCambiarContrasena.tsx
 */

import { useState, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { notificar } from '../../../utils/notificaciones';
import authService from '../../../services/authService';
import type { VistaAuth } from '../ModalLogin';

interface Props {
	tokenTemporal: string;
	onCambiarVista: (vista: VistaAuth) => void;
	onCerrarModal: () => void;
}

export function VistaCambiarContrasena({ tokenTemporal, onCambiarVista }: Props) {
	const [nuevaContrasena, setNuevaContrasena] = useState('');
	const [confirmarContrasena, setConfirmarContrasena] = useState('');
	const [mostrarNueva, setMostrarNueva] = useState(false);
	const [cargando, setCargando] = useState(false);

	// Validaciones
	const tieneMayuscula = /[A-Z]/.test(nuevaContrasena);
	const tieneMinuscula = /[a-z]/.test(nuevaContrasena);
	const tieneNumero = /[0-9]/.test(nuevaContrasena);
	const tieneMinimo = nuevaContrasena.length >= 8;
	const coincidenContrasenas = nuevaContrasena === confirmarContrasena && confirmarContrasena.length > 0;
	const formularioValido = tieneMinimo && tieneMayuscula && tieneMinuscula && tieneNumero && coincidenContrasenas;

	const handleSubmit = useCallback(async () => {
		if (!formularioValido || cargando) return;

		setCargando(true);
		try {
			const response = await authService.cambiarContrasenaProvisional({
				tokenTemporal,
				nuevaContrasena,
			});

			if (response.success) {
				notificar.exito('Contraseña actualizada. Ya puedes iniciar sesión.');
				onCambiarVista('login');
			} else {
				notificar.error(response.message || 'Error al cambiar contraseña');
			}
		} catch {
			notificar.error('Error al cambiar contraseña');
		} finally {
			setCargando(false);
		}
	}, [formularioValido, cargando, tokenTemporal, nuevaContrasena, onCambiarVista]);

	return (
		<div className="px-4 lg:px-3 2xl:px-4 py-4 space-y-4" data-testid="vista-cambiar-contrasena">
			<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
				Tu cuenta está casi lista. Crea una contraseña definitiva para reemplazar la provisional.
			</p>

			{/* Nueva contraseña */}
			<div>
				<label htmlFor="input-nueva-contrasena" className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">
					Nueva contraseña
				</label>
				<div className="relative">
					<input
						id="input-nueva-contrasena"
						name="input-nueva-contrasena"
						type={mostrarNueva ? 'text' : 'password'}
						value={nuevaContrasena}
						onChange={e => setNuevaContrasena(e.target.value)}
						autoFocus
						className="w-full h-11 lg:h-10 2xl:h-11 px-3 pr-10 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
						placeholder="Crea tu contraseña definitiva"
						data-testid="input-nueva-contrasena"
					/>
					<button
						type="button"
						onClick={() => setMostrarNueva(!mostrarNueva)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 cursor-pointer"
					>
						{mostrarNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
					</button>
				</div>

				{/* Indicadores de seguridad */}
				{nuevaContrasena.length > 0 && (
					<div className="mt-2 space-y-1">
						<p className={`text-sm font-medium ${tieneMinimo ? 'text-emerald-600' : 'text-slate-600'}`}>
							{tieneMinimo ? '✓' : '○'} Mínimo 8 caracteres
						</p>
						<p className={`text-sm font-medium ${tieneMayuscula ? 'text-emerald-600' : 'text-slate-600'}`}>
							{tieneMayuscula ? '✓' : '○'} Una mayúscula
						</p>
						<p className={`text-sm font-medium ${tieneMinuscula ? 'text-emerald-600' : 'text-slate-600'}`}>
							{tieneMinuscula ? '✓' : '○'} Una minúscula
						</p>
						<p className={`text-sm font-medium ${tieneNumero ? 'text-emerald-600' : 'text-slate-600'}`}>
							{tieneNumero ? '✓' : '○'} Un número
						</p>
					</div>
				)}
			</div>

			{/* Confirmar contraseña */}
			<div>
				<label htmlFor="input-confirmar-contrasena" className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">
					Confirmar contraseña
				</label>
				<input
					id="input-confirmar-contrasena"
					name="input-confirmar-contrasena"
					type="password"
					value={confirmarContrasena}
					onChange={e => setConfirmarContrasena(e.target.value)}
					className={`w-full h-11 lg:h-10 2xl:h-11 px-3 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 border-2 rounded-lg bg-white ${
						confirmarContrasena.length > 0
							? coincidenContrasenas ? 'border-emerald-400' : 'border-red-400'
							: 'border-slate-300'
					}`}
					placeholder="Repite tu nueva contraseña"
					data-testid="input-confirmar-contrasena"
				/>
				{confirmarContrasena.length > 0 && !coincidenContrasenas && (
					<p className="text-sm font-medium text-red-600 mt-1">Las contraseñas no coinciden</p>
				)}
			</div>

			{/* Botón submit */}
			<button
				type="button"
				onClick={handleSubmit}
				disabled={!formularioValido || cargando}
				className={`w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-white text-base lg:text-sm 2xl:text-base ${
					formularioValido && !cargando
						? 'bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 hover:shadow-slate-700/40 active:scale-[0.98] lg:cursor-pointer'
						: 'bg-slate-400 cursor-not-allowed'
				}`}
				data-testid="btn-cambiar-contrasena"
			>
				{cargando ? 'Cambiando...' : 'Cambiar contraseña'}
			</button>
		</div>
	);
}
