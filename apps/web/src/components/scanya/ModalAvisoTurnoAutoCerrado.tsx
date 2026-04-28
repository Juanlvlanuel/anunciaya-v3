/**
 * ModalAvisoTurnoAutoCerrado.tsx
 * ===============================
 * Modal informativo que se muestra al login de ScanYA cuando el último
 * turno del operador fue cerrado automáticamente por el sistema.
 *
 * Lee el aviso de `useScanYAStore.avisoTurnoAutoCerrado` (seteado por el
 * login). El usuario lo cierra manualmente con el botón "Entendido".
 *
 * Diseño:
 *  - Look ScanYA (fondo negro + bordes y glow azul, tipo ModalCerrarTurno).
 *  - Mobile (< 1024px): bottom-sheet con slide-up.
 *  - Desktop (≥ 1024px): centrado con zoom-in.
 *  - Texto conciso (icono + título + 1 línea + botón).
 *  - NO se auto-cierra: solo cierra al click del botón.
 *
 * Ubicación: apps/web/src/components/scanya/ModalAvisoTurnoAutoCerrado.tsx
 */

import { Clock } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useScanYAStore } from '../../stores/useScanYAStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';

function formatearFechaHora(iso: string): string {
	try {
		const fecha = new Date(iso);
		return fecha.toLocaleString('es-MX', {
			day: '2-digit',
			month: 'short',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	} catch {
		return iso;
	}
}

export function ModalAvisoTurnoAutoCerrado() {
	const aviso = useScanYAStore((s) => s.avisoTurnoAutoCerrado);
	const setAviso = useScanYAStore((s) => s.setAvisoTurnoAutoCerrado);
	const { esMobile } = useBreakpoint();

	if (!aviso) return null;

	const cerrar = () => setAviso(null);
	const sucursalEtiqueta = aviso.sucursalEsPrincipal ? 'Matriz' : aviso.sucursalNombre;

	const contenido = (
		<>
			{/* Icono con glow */}
			<div className="flex justify-center mb-4">
				<div
					className="w-16 h-16 rounded-full flex items-center justify-center"
					style={{
						background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))',
						border: '2px solid rgba(245, 158, 11, 0.45)',
						boxShadow: '0 0 24px rgba(245, 158, 11, 0.25)',
					}}
				>
					<Clock className="w-8 h-8 text-amber-400" strokeWidth={2} />
				</div>
			</div>

			{/* Título */}
			<h2 className="text-white font-bold text-lg lg:text-base 2xl:text-lg text-center mb-2">
				Turno cerrado automáticamente
			</h2>

			{/* Mensaje conciso */}
			<p className="text-slate-300 text-sm lg:text-xs 2xl:text-sm text-center leading-relaxed mb-6">
				Tu turno en <span className="text-white font-semibold">{sucursalEtiqueta}</span> se cerró el{' '}
				<span className="text-white font-semibold">{formatearFechaHora(aviso.horaFin)}</span>
				<span className="block text-slate-400 text-xs mt-1">por exceder el horario operativo.</span>
			</p>

			{/* Botón */}
			<button
				type="button"
				onClick={cerrar}
				className="
					w-full py-3 lg:py-2.5 2xl:py-3
					rounded-xl
					font-bold text-white text-sm lg:text-xs 2xl:text-sm
					lg:cursor-pointer
					transition-all hover:brightness-110
				"
				style={{
					background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
					boxShadow: '0 0 16px rgba(59, 130, 246, 0.35), 0 4px 12px rgba(0, 0, 0, 0.4)',
					border: '1px solid rgba(59, 130, 246, 0.5)',
				}}
				data-testid="btn-aviso-turno-entendido"
			>
				Entendido
			</button>
		</>
	);

	const estiloContenedor = {
		background: '#000000',
		border: '2px solid rgba(59, 130, 246, 0.35)',
		boxShadow: '0 0 30px rgba(59, 130, 246, 0.15), 0 25px 50px rgba(0, 0, 0, 0.7)',
	} as const;

	const overlay = (
		<div
			className="fixed inset-0 z-9999 bg-black/60 backdrop-blur-sm fade-in animate-in duration-200"
			onClick={cerrar}
			data-testid="modal-aviso-turno-auto-cerrado"
		>
			{esMobile ? (
				/* Bottom-sheet móvil */
				<div
					className="absolute bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-6 pb-8"
					style={estiloContenedor}
					onClick={(e) => e.stopPropagation()}
				>
					{/* Handle visual */}
					<div className="w-12 h-1 bg-slate-600 rounded-full mx-auto mb-5" />
					{contenido}
				</div>
			) : (
				/* Centrado desktop */
				<div className="absolute inset-0 flex items-center justify-center p-4">
					<div
						className="rounded-2xl w-full max-w-sm 2xl:max-w-md p-6 zoom-in-95 animate-in duration-200"
						style={estiloContenedor}
						onClick={(e) => e.stopPropagation()}
					>
						{contenido}
					</div>
				</div>
			)}
		</div>
	);

	return createPortal(overlay, document.body);
}
