/**
 * useVerificarCorreo.ts
 * ======================
 * Hook React Query para verificar disponibilidad de correo contra la BD.
 *
 * Solo ejecuta el query si el correo tiene formato válido y no está en la lista
 * de correos excluidos (ej: correo del dueño al crear gerente).
 *
 * El debounce se aplica en el componente que usa este hook (ver InputCorreoValidado).
 *
 * Ubicación: apps/web/src/hooks/queries/useVerificarCorreo.ts
 */

import { useQuery } from '@tanstack/react-query';
import { verificarDisponibilidadCorreo, type RespuestaVerificarCorreo } from '../../services/authService';
import { esFormatoValido } from '../../utils/validarCorreo';

interface Opciones {
	/** Correo a verificar (ya debounced por el caller) */
	correo: string;
	/** Correos que no deben considerarse disponibles aunque no estén en BD (ej: el propio correo del dueño) */
	correosExcluidos?: string[];
}

export function useVerificarCorreo({ correo, correosExcluidos = [] }: Opciones) {
	const correoNormalizado = correo.trim().toLowerCase();
	const excluidos = correosExcluidos.map(c => c.trim().toLowerCase()).filter(Boolean);

	const formatoOk = esFormatoValido(correoNormalizado);
	const esExcluido = excluidos.includes(correoNormalizado);

	const enabled = correoNormalizado.length > 0 && formatoOk && !esExcluido;

	return useQuery<RespuestaVerificarCorreo>({
		queryKey: ['correo-disponible', correoNormalizado],
		queryFn: async () => {
			const respuesta = await verificarDisponibilidadCorreo(correoNormalizado);
			return respuesta.data ?? { disponible: false };
		},
		enabled,
		staleTime: 30_000,   // 30s — evita refetch si el usuario borra y re-escribe
		gcTime: 60_000,      // 1 min
		retry: 0,            // No reintentar si falla
		refetchOnWindowFocus: false,
	});
}
