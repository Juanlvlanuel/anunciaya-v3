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

import { useState } from 'react';

interface InputTelefonoProps {
	value: string;
	onChange: (v: string) => void;
	prefijo?: string; // prefijo para ids (evita colisiones cuando hay 2 en la misma pantalla)
	placeholder?: string;
	disabled?: boolean;
	testIdNumero?: string;
	testIdLada?: string;
	/** Clase de altura de los campos. Default coincide con el patrón histórico del componente. */
	claseAlto?: string;
	/** Clase de tamaño de texto de los campos. Default coincide con el patrón histórico. */
	claseTexto?: string;
	/**
	 * Si es true, el campo de número se muestra agrupado visualmente como
	 * "(638) 113 2658" mientras se escribe. El valor guardado (`value`/
	 * `onChange`) NO cambia — sigue siendo "lada dígitos" sin formato, el
	 * agrupado es solo de despliegue. Default false (comportamiento
	 * histórico: dígitos corridos, sin paréntesis ni espacios).
	 */
	formatoVisual?: boolean;
	/**
	 * `'azul'` (default) — borde + sombra interior + halo azul al enfocar,
	 * comportamiento histórico usado en Mi Perfil/Business Studio/Sucursales.
	 * `'neutro'` — mismo estilo de foco que `Input.tsx` (borde slate, sin
	 * sombra ni ring) para modales donde el resto de los campos usan ese
	 * tono y el azul desentona. Opt-in por pantalla, no cambia el default.
	 */
	variante?: 'azul' | 'neutro';
}

/** "6381234658" → "(638) 123 4658" — agrupado progresivo mientras se escribe. */
function formatearVisualNumero(digitos: string): string {
	if (!digitos) return '';
	const area = digitos.slice(0, 3);
	const medio = digitos.slice(3, 6);
	const final = digitos.slice(6, 10);
	let salida = area.length === 3 ? `(${area})` : `(${area}`;
	if (medio) salida += ` ${medio}`;
	if (final) salida += ` ${final}`;
	return salida;
}

// Borde + sombra interior + halo azul al enfocar. El inset va en className (no en style inline)
// para que NO tape el ring del foco de Tailwind, así el highlight queda igual al de los demás inputs.
const BORDE_FOCO_AZUL = 'border-2 border-slate-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] transition-colors focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-300';

// Mismo foco que `Input.tsx` (borde slate, sin sombra ni ring) — para
// modales donde el resto de los campos usa ese tono neutro.
const BORDE_FOCO_NEUTRO = 'border-2 border-slate-300 transition-colors focus-within:border-slate-500';

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
	claseAlto = 'h-10 lg:h-9 2xl:h-10',
	claseTexto = 'text-sm lg:text-xs 2xl:text-sm',
	formatoVisual = false,
	variante = 'azul',
}: InputTelefonoProps) {
	const { lada, numero } = normalizarTelefono(value);
	const bordeFoco = variante === 'neutro' ? BORDE_FOCO_NEUTRO : BORDE_FOCO_AZUL;
	// `Input.tsx` usa fondo slate-100 en reposo → blanco al enfocar; el
	// contenedor de estos campos era blanco fijo (parte del look azul).
	// En 'neutro' igualamos ese comportamiento para que no se note el
	// cambio de fondo como otra diferencia más.
	const fondoContenedor = variante === 'neutro' ? 'bg-slate-100 focus-within:bg-white' : 'bg-white';
	// `Input.tsx` usa `rounded-xl` — en 'azul' se mantiene `rounded-lg`
	// (look histórico) para no alterar las pantallas que ya lo usan.
	const radio = variante === 'neutro' ? 'rounded-xl' : 'rounded-lg';

	// Mientras el usuario está borrando/reescribiendo la lada, el campo puede
	// pasar transitoriamente por "" o "+" — estados que `normalizarTelefono`
	// NO puede representar (los trata como "vacío" y cae al default "+52").
	// Sin este estado local, cada tecla de borrado quedaba pisada de
	// inmediato por ese default y la lada nunca se podía vaciar para
	// escribir una nueva. Solo se aplica el default "+52" al perder el foco.
	const [ladaEditando, setLadaEditando] = useState<string | null>(null);
	const ladaMostrada = ladaEditando !== null ? ladaEditando : lada;
	const numeroMostrado = formatoVisual ? formatearVisualNumero(numero) : numero;

	return (
		<div className="flex gap-1.5 min-w-0">
			{/* Lada — angosta para dar más espacio al número */}
			<div
				className={`flex items-center justify-center w-12 lg:w-11 2xl:w-12 ${claseAlto} ${fondoContenedor} ${radio} px-1 shrink-0 overflow-hidden ${bordeFoco}`}
			>
				<input
					id={`${prefijo}-lada`}
					name={`${prefijo}-lada`}
					type="text"
					value={ladaMostrada}
					disabled={disabled}
					onChange={(e) => {
						let l = e.target.value;
						if (!l.startsWith('+')) l = '+' + l.replace(/[^0-9]/g, '');
						l = l.replace(/[^+0-9]/g, '');
						setLadaEditando(l);
						// Solo propagamos hacia el padre cuando hay algo útil
						// que combinar — si quedó "" o "+", esperamos a que
						// el usuario siga escribiendo o suelte el foco.
						if (l !== '' && l !== '+') {
							onChange(numero ? `${l} ${numero}` : l);
						}
					}}
					onBlur={() => {
						if (ladaEditando === null) return;
						let l = ladaEditando;
						if (l === '' || l === '+') l = '+52';
						onChange(numero ? `${l} ${numero}` : l);
						setLadaEditando(null);
					}}
					placeholder="+52"
					maxLength={4}
					className={`w-full bg-transparent outline-none ${claseTexto} font-medium text-slate-800 text-center`}
					data-testid={testIdLada}
				/>
			</div>

			{/* Número de 10 dígitos — ocupa el espacio restante */}
			<div
				className={`flex items-center ${claseAlto} ${fondoContenedor} ${radio} px-3 flex-1 min-w-0 overflow-hidden ${bordeFoco}`}
			>
				<input
					id={`${prefijo}-numero`}
					name={`${prefijo}-numero`}
					type="tel"
					inputMode="numeric"
					value={numeroMostrado}
					disabled={disabled}
					onChange={(e) => {
						let n = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
						// Con `formatoVisual`, el backspace a veces borra un
						// paréntesis/espacio decorativo en vez de un dígito
						// (ej. "(638)" → "(638" al borrar ")") — el conteo de
						// dígitos queda igual y el usuario ve que "no borra".
						// Si el campo se acortó pero los dígitos no cambiaron,
						// recortamos uno más para que el backspace sí borre.
						if (formatoVisual && e.target.value.length < numeroMostrado.length && n.length === numero.length) {
							n = n.slice(0, -1);
						}
						onChange(n ? `${lada} ${n}` : lada);
					}}
					placeholder={formatoVisual ? '(638) 113 2658' : placeholder}
					maxLength={formatoVisual ? 14 : 10}
					className={`w-full min-w-0 bg-transparent outline-none ${claseTexto} font-medium text-slate-800`}
					data-testid={testIdNumero}
				/>
			</div>
		</div>
	);
}
