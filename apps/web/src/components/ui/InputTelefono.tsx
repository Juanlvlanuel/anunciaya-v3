/**
 * InputTelefono.tsx
 * ==================
 * Input compuesto para teléfono/WhatsApp con lada separada.
 *
 * Guarda el valor en formato "+52 6381234567" (lada + espacio + 10 dígitos).
 * - Campo izquierdo: lada editable (default +52, máximo 4 chars)
 * - Campo derecho: 10 dígitos del número, solo acepta dígitos
 *
 * Patrón replicado de TabContacto (Mi Perfil) para garantizar consistencia
 * del formato guardado en BD entre módulos (Business Studio, Sucursales, etc.)
 *
 * Ubicación: apps/web/src/components/ui/InputTelefono.tsx
 */

interface InputTelefonoProps {
	value: string;
	onChange: (v: string) => void;
	prefijo?: string; // prefijo para ids (evita colisiones cuando hay 2 en la misma pantalla)
	placeholder?: string;
	disabled?: boolean;
	testIdNumero?: string;
	testIdLada?: string;
}

const ESTILO_INPUT = { border: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' } as const;

/**
 * Divide un string de teléfono en lada + número.
 * Soporta formatos: "+52 6381234567", "+526381234567", "6381234567", "".
 */
export function normalizarTelefono(tel: string): { lada: string; numero: string } {
	if (!tel) return { lada: '+52', numero: '' };
	if (tel.includes(' ') && tel.startsWith('+')) {
		const partes = tel.split(' ');
		return { lada: partes[0], numero: partes[1] || '' };
	}
	if (tel.startsWith('+')) {
		const soloDigitos = tel.substring(1);
		if (soloDigitos.length >= 10) {
			const numero = soloDigitos.slice(-10);
			const lada = '+' + soloDigitos.slice(0, -10);
			return { lada: lada || '+52', numero };
		}
		return { lada: tel, numero: '' };
	}
	if (/^\d+$/.test(tel)) return { lada: '+52', numero: tel };
	return { lada: '+52', numero: tel.replace(/[^0-9]/g, '') };
}

export function InputTelefono({
	value,
	onChange,
	prefijo = 'tel',
	placeholder = '6381234567',
	disabled = false,
	testIdNumero,
	testIdLada,
}: InputTelefonoProps) {
	const { lada, numero } = normalizarTelefono(value);

	return (
		<div className="flex gap-1.5 min-w-0">
			{/* Lada — angosta para dar más espacio al número */}
			<div
				className="flex items-center justify-center w-12 lg:w-11 2xl:w-12 h-10 lg:h-9 2xl:h-10 bg-white rounded-lg px-1 shrink-0"
				style={ESTILO_INPUT}
			>
				<input
					id={`${prefijo}-lada`}
					name={`${prefijo}-lada`}
					type="text"
					value={lada}
					disabled={disabled}
					onChange={(e) => {
						let l = e.target.value;
						if (!l.startsWith('+')) l = '+' + l.replace(/[^0-9]/g, '');
						l = l.replace(/[^+0-9]/g, '');
						if (l === '+' || l === '') l = '+52';
						onChange(numero ? `${l} ${numero}` : l);
					}}
					placeholder="+52"
					maxLength={4}
					className="w-full bg-transparent outline-none text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 text-center"
					data-testid={testIdLada}
				/>
			</div>

			{/* Número de 10 dígitos — ocupa el espacio restante */}
			<div
				className="flex items-center h-10 lg:h-9 2xl:h-10 bg-white rounded-lg px-3 flex-1 min-w-0"
				style={ESTILO_INPUT}
			>
				<input
					id={`${prefijo}-numero`}
					name={`${prefijo}-numero`}
					type="tel"
					inputMode="numeric"
					value={numero}
					disabled={disabled}
					onChange={(e) => {
						const n = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
						onChange(n ? `${lada} ${n}` : lada);
					}}
					placeholder={placeholder}
					maxLength={10}
					className="w-full min-w-0 bg-transparent outline-none text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800"
					data-testid={testIdNumero}
				/>
			</div>
		</div>
	);
}
