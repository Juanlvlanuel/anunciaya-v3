/**
 * InputCorreoValidado.tsx
 * ========================
 * Input de correo con múltiples niveles de validación:
 * 1. Formato (regex) — inmediato
 * 2. Auto-exclusión (ej: correo del dueño) — inmediato
 * 3. Disponibilidad contra BD — con debounce 400ms (solo en modos 'registro' y 'gerente')
 * 4. Detección de typos de dominio (Levenshtein) — inmediato, sugerencia corregible
 *
 * Tres modos:
 * - 'registro' (default): correos existentes → error
 * - 'gerente': correos existentes SIN negocio asignado → OK (promoción). Con negocio → error.
 * - 'contacto': solo valida formato + typo. NO consulta BD (correo es info de contacto, no credencial).
 *               Útil para campo opcional de contacto de empleados, clientes, etc.
 *
 * Estados visuales (indicador derecho):
 * - Idle: sin indicador
 * - Escribiendo / validando: spinner
 * - ✗ Error (formato, exclusión, ya registrado, no elegible): XCircle rojo
 * - 💡 Typo detectado: Lightbulb ámbar + botón "Corregir"
 * - ✓ Disponible (nuevo): CheckCircle2 verde
 * - 👤 Existente elegible (promoción): UserCheck verde
 *
 * Ubicación: apps/web/src/components/ui/InputCorreoValidado.tsx
 */

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb, Loader2, UserCheck } from 'lucide-react';
import { esFormatoValido, detectarTypoDominio } from '../../utils/validarCorreo';
import { useVerificarCorreo } from '../../hooks/queries/useVerificarCorreo';

// =============================================================================
// TIPOS
// =============================================================================

export type ModoValidacionCorreo = 'registro' | 'gerente' | 'contacto';

export interface ResultadoValidacionCorreo {
	valido: boolean;
	tipo?: 'nuevo' | 'promocion'; // solo cuando valido === true
	existente?: {
		nombre: string;
		apellidos: string;
	}; // solo cuando tipo === 'promocion'
}

interface Props {
	value: string;
	onChange: (valor: string) => void;
	correosExcluidos?: string[];
	mensajeExclusion?: string;
	label?: string;
	placeholder?: string;
	/**
	 * 'registro' (default): correos existentes → error
	 * 'gerente': correos existentes SIN negocio → OK (promoción)
	 */
	modo?: ModoValidacionCorreo;
	onValidezCambio?: (resultado: ResultadoValidacionCorreo) => void;
	testIdPrefix?: string;
	disabled?: boolean;
}

type EstadoValidacion =
	| { tipo: 'idle' }
	| { tipo: 'escribiendo' }
	| { tipo: 'validando' }
	| { tipo: 'error'; mensaje: string }
	| { tipo: 'typo'; sugerencia: string }
	| { tipo: 'valido-nuevo' }
	| { tipo: 'valido-promocion'; nombre: string; apellidos: string };

// =============================================================================
// HOOK: useDebounce
// =============================================================================

function useDebounce<T>(valor: T, delay: number): T {
	const [debounced, setDebounced] = useState<T>(valor);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(valor), delay);
		return () => clearTimeout(timer);
	}, [valor, delay]);

	return debounced;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function InputCorreoValidado({
	value,
	onChange,
	correosExcluidos = [],
	mensajeExclusion = 'Este correo no está permitido',
	label = 'Correo',
	placeholder = 'correo@ejemplo.com',
	modo = 'registro',
	onValidezCambio,
	testIdPrefix = 'correo',
	disabled = false,
}: Props) {
	// Debounce del valor para la query de disponibilidad
	const valorDebounced = useDebounce(value, 400);

	const valorTrim = value.trim().toLowerCase();
	const valorDebouncedTrim = valorDebounced.trim().toLowerCase();

	// Validaciones síncronas (formato + exclusión + typo)
	const formatoOk = esFormatoValido(valorTrim);
	const excluidos = correosExcluidos.map(c => c.trim().toLowerCase()).filter(Boolean);
	const esExcluido = excluidos.includes(valorTrim);
	const typo = formatoOk ? detectarTypoDominio(valorTrim) : null;

	// Query de disponibilidad (solo se activa si formato ok, no excluido y debounced == value actual)
	// En modo 'contacto' NO se consulta BD — el correo es info de contacto, no credencial.
	const correosParaExcluir = esExcluido ? excluidos : [];
	const consulta = useVerificarCorreo({
		correo: modo === 'contacto' ? '' : valorDebouncedTrim,
		correosExcluidos: correosParaExcluir,
	});

	// Determinar estado visual
	let estado: EstadoValidacion;

	if (valorTrim.length === 0) {
		estado = { tipo: 'idle' };
	} else if (!formatoOk) {
		estado = { tipo: 'error', mensaje: 'Formato de correo inválido' };
	} else if (esExcluido) {
		estado = { tipo: 'error', mensaje: mensajeExclusion };
	} else if (typo) {
		estado = { tipo: 'typo', sugerencia: typo.sugerencia };
	} else if (modo === 'contacto') {
		// Modo 'contacto' no consulta BD — formato + typo fueron suficientes para marcar como válido
		estado = { tipo: 'valido-nuevo' };
	} else if (valorTrim !== valorDebouncedTrim) {
		// Usuario sigue escribiendo — esperar debounce
		estado = { tipo: 'escribiendo' };
	} else if (consulta.isFetching) {
		estado = { tipo: 'validando' };
	} else if (consulta.isError) {
		estado = { tipo: 'error', mensaje: 'Error al verificar el correo. Intenta de nuevo.' };
	} else if (consulta.data) {
		const { disponible, existente } = consulta.data;

		if (disponible) {
			// Correo no existe → cuenta nueva
			estado = { tipo: 'valido-nuevo' };
		} else if (!existente) {
			// Seguridad: correo no disponible sin info del existente
			estado = { tipo: 'error', mensaje: 'Este correo ya está registrado en AnunciaYA' };
		} else if (modo === 'gerente') {
			// Modo gerente: permitir correos existentes elegibles
			if (existente.tieneNegocio) {
				estado = { tipo: 'error', mensaje: 'Este usuario ya tiene un negocio asignado en AnunciaYA' };
			} else {
				estado = { tipo: 'valido-promocion', nombre: existente.nombre, apellidos: existente.apellidos };
			}
		} else {
			// Modo registro: correos existentes siempre son error
			estado = { tipo: 'error', mensaje: 'Este correo ya está registrado en AnunciaYA' };
		}
	} else {
		estado = { tipo: 'escribiendo' };
	}

	// Informar al padre sobre validez
	const esValido = estado.tipo === 'valido-nuevo' || estado.tipo === 'valido-promocion';
	const tipoValido: 'nuevo' | 'promocion' | undefined =
		estado.tipo === 'valido-nuevo' ? 'nuevo' :
		estado.tipo === 'valido-promocion' ? 'promocion' :
		undefined;

	const nombreExistente = estado.tipo === 'valido-promocion' ? estado.nombre : undefined;
	const apellidosExistente = estado.tipo === 'valido-promocion' ? estado.apellidos : undefined;

	useEffect(() => {
		onValidezCambio?.({
			valido: esValido,
			tipo: tipoValido,
			existente: nombreExistente && apellidosExistente
				? { nombre: nombreExistente, apellidos: apellidosExistente }
				: undefined,
		});
	}, [esValido, tipoValido, nombreExistente, apellidosExistente, onValidezCambio]);

	// ============================================
	// UI
	// ============================================

	// Color del borde según estado
	let borderClass = 'border-slate-300';
	if (estado.tipo === 'error') borderClass = 'border-red-400';
	else if (estado.tipo === 'typo') borderClass = 'border-amber-400';
	else if (estado.tipo === 'valido-nuevo' || estado.tipo === 'valido-promocion') borderClass = 'border-emerald-400';

	// Indicador derecho del input
	// Cuando el estado es 'error' el ícono es clickeable y limpia el input (convención UX de la X).
	// Los demás estados son puramente informativos (pointer-events-none).
	let indicador: React.ReactNode = null;
	let indicadorClickeable = false;
	if (estado.tipo === 'escribiendo' || estado.tipo === 'validando') {
		indicador = (
			<Loader2
				className="w-4 h-4 text-slate-400 animate-spin"
				data-testid={`${testIdPrefix}-indicador-validando`}
			/>
		);
	} else if (estado.tipo === 'error') {
		indicadorClickeable = true;
		indicador = (
			<XCircle
				className="w-5 h-5 text-red-500"
				data-testid={`${testIdPrefix}-indicador-error`}
			/>
		);
	} else if (estado.tipo === 'typo') {
		indicador = (
			<Lightbulb
				className="w-5 h-5 text-amber-500"
				data-testid={`${testIdPrefix}-indicador-typo`}
			/>
		);
	} else if (estado.tipo === 'valido-nuevo') {
		indicador = (
			<CheckCircle2
				className="w-5 h-5 text-emerald-500"
				data-testid={`${testIdPrefix}-indicador-valido`}
			/>
		);
	} else if (estado.tipo === 'valido-promocion') {
		indicador = (
			<UserCheck
				className="w-5 h-5 text-emerald-500"
				data-testid={`${testIdPrefix}-indicador-promocion`}
			/>
		);
	}

	return (
		<div>
			{label && (
				<label className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1 block">
					{label}
				</label>
			)}

			<div className="relative">
				<input
					value={value}
					onChange={e => onChange(e.target.value)}
					type="email"
					autoComplete="email"
					autoCapitalize="off"
					spellCheck={false}
					placeholder={placeholder}
					disabled={disabled}
					className={`w-full h-10 lg:h-9 2xl:h-10 pl-3 pr-10 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 ${borderClass} rounded-lg bg-white transition-colors
						disabled:bg-slate-100 disabled:cursor-not-allowed`}
					data-testid={`${testIdPrefix}-input`}
				/>
				{indicador && (
					indicadorClickeable ? (
						<button
							type="button"
							onClick={() => onChange('')}
							disabled={disabled}
							className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:opacity-70 disabled:cursor-not-allowed"
							title="Limpiar"
							data-testid={`${testIdPrefix}-limpiar`}
						>
							{indicador}
						</button>
					) : (
						<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
							{indicador}
						</div>
					)
				)}
			</div>

			{/* Mensaje inline */}
			{estado.tipo === 'error' && (
				<p
					className="mt-1 text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-600"
					data-testid={`${testIdPrefix}-mensaje`}
				>
					{estado.mensaje}
				</p>
			)}

			{estado.tipo === 'typo' && (
				<div
					className="mt-1 flex items-center gap-2"
					data-testid={`${testIdPrefix}-mensaje`}
				>
					<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-amber-700 flex-1">
						¿Quisiste decir <span className="font-bold">{estado.sugerencia}</span>?
					</p>
					<button
						type="button"
						onClick={() => onChange(estado.sugerencia)}
						className="shrink-0 px-2 py-0.5 rounded-md text-sm lg:text-[11px] 2xl:text-sm font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 cursor-pointer"
						data-testid={`${testIdPrefix}-btn-corregir-typo`}
					>
						Corregir
					</button>
				</div>
			)}

			{estado.tipo === 'valido-nuevo' && (
				<p
					className="mt-1 text-sm lg:text-[11px] 2xl:text-sm font-medium text-emerald-600"
					data-testid={`${testIdPrefix}-mensaje`}
				>
					Correo disponible — se creará una cuenta nueva
				</p>
			)}

			{estado.tipo === 'valido-promocion' && (
				<p
					className="mt-1 text-sm lg:text-[11px] 2xl:text-sm font-medium text-emerald-700"
					data-testid={`${testIdPrefix}-mensaje`}
				>
					Cuenta existente — se promoverá a modo comercial
				</p>
			)}
		</div>
	);
}
