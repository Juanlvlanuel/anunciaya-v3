/**
 * useSucursales.ts
 * =================
 * Hooks de React Query para el módulo Sucursales de Business Studio.
 *
 * PATRÓN:
 *   - useQuery     → KPIs, lista (bajo volumen, sin infinite scroll), gerente
 *   - useMutation  → crear, toggleActiva, eliminar, crearGerente, revocarGerente, reenviarCredenciales
 *
 * Nota: usa negocioId (no sucursalId) como scope — la lista es a nivel negocio.
 *
 * Ubicación: apps/web/src/hooks/queries/useSucursales.ts
 */

import {
	useQuery,
	useMutation,
	useQueryClient,
	keepPreviousData,
} from '@tanstack/react-query';
import * as sucursalesService from '../../services/sucursalesService';
import type {
	SucursalResumen,
	KPIsSucursales,
	CrearSucursalInput,
	CrearGerenteInput,
	FiltrosSucursalesUI,
} from '../../types/sucursales';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';
import { notificar } from '../../utils/notificaciones';

// =============================================================================
// GUARDS
// =============================================================================

function useGuardSucursales() {
	const negocioId = useAuthStore((s) => s.usuario?.negocioId ?? '');
	const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
	const habilitado = !!negocioId && modoActivo === 'comercial';
	return { negocioId, habilitado };
}

// =============================================================================
// KPIs
// =============================================================================

export function useSucursalesKPIs() {
	const { negocioId, habilitado } = useGuardSucursales();

	return useQuery({
		queryKey: queryKeys.sucursales.kpis(negocioId),
		queryFn: () => sucursalesService.obtenerKPIs(negocioId).then((r) => r.data ?? null),
		enabled: habilitado,
	});
}

// =============================================================================
// LISTA (useQuery simple — bajo volumen, <50 sucursales)
// =============================================================================

export function useSucursalesLista(filtros: FiltrosSucursalesUI) {
	const { negocioId, habilitado } = useGuardSucursales();

	return useQuery({
		queryKey: queryKeys.sucursales.lista(negocioId, filtros as unknown as Record<string, unknown>),
		queryFn: () =>
			sucursalesService.obtenerLista(negocioId, filtros).then((r) => r.data ?? []),
		enabled: habilitado,
		placeholderData: keepPreviousData,
	});
}

// =============================================================================
// GERENTE DE UNA SUCURSAL
// =============================================================================

export function useSucursalGerente(sucursalId: string) {
	const { habilitado } = useGuardSucursales();

	return useQuery({
		queryKey: queryKeys.sucursales.gerente(sucursalId),
		queryFn: () => sucursalesService.obtenerGerente(sucursalId).then((r) => r.data ?? null),
		enabled: habilitado && !!sucursalId,
	});
}

// =============================================================================
// HELPER: invalidar sucursales + SelectorSucursalesInline + Feed público de Negocios
// =============================================================================

function useInvalidarSucursales() {
	const qc = useQueryClient();
	const negocioId = useAuthStore((s) => s.usuario?.negocioId ?? '');

	return () => {
		// Lista de BS (KPIs + tabla de sucursales)
		qc.invalidateQueries({ queryKey: queryKeys.sucursales.all() });
		// Selector de sucursales + Mi Perfil
		qc.invalidateQueries({ queryKey: queryKeys.perfil.sucursales(negocioId) });
		// Feed público de Negocios (lista + perfil individual)
		// Activar/desactivar una sucursal cambia qué aparece en el feed público
		qc.invalidateQueries({ queryKey: queryKeys.negocios.all() });
	};
}

// =============================================================================
// MUTATIONS — CRUD SUCURSALES
// =============================================================================

export function useCrearSucursal() {
	const { negocioId } = useGuardSucursales();
	const invalidar = useInvalidarSucursales();

	return useMutation({
		mutationFn: (datos: CrearSucursalInput) => sucursalesService.crear(negocioId, datos),
		onSuccess: () => {
			invalidar();
			notificar.exito('Sucursal creada');
		},
		onError: () => {
			notificar.error('Error al crear sucursal');
		},
	});
}

export function useToggleSucursalActiva() {
	const qc = useQueryClient();
	const { negocioId } = useGuardSucursales();
	const invalidar = useInvalidarSucursales();
	const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
	const sucursalPrincipalId = useAuthStore((s) => s.sucursalPrincipalId);

	return useMutation({
		mutationFn: ({ sucursalId, activa }: { sucursalId: string; activa: boolean }) =>
			sucursalesService.toggleActiva(sucursalId, activa),
		onMutate: async ({ sucursalId, activa }) => {
			// Optimistic update en la lista
			const listKeys = queryKeys.sucursales.lista(negocioId);
			await qc.cancelQueries({ queryKey: listKeys });

			const snapshot = qc.getQueriesData<SucursalResumen[]>({ queryKey: listKeys });

			// Actualizar todas las variantes de lista en caché
			for (const [key] of snapshot) {
				qc.setQueryData<SucursalResumen[]>(key, (old) =>
					old?.map((s) => (s.id === sucursalId ? { ...s, activa } : s)) ?? []
				);
			}

			return { snapshot };
		},
		onError: (err, _vars, context) => {
			// Rollback
			if (context?.snapshot) {
				for (const [key, data] of context.snapshot) {
					if (data) qc.setQueryData(key, data);
				}
			}
			const mensaje = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
				?? 'Error al cambiar estado de sucursal';
			notificar.error(mensaje);
		},
		onSuccess: (_data, { sucursalId, activa }) => {
			invalidar();
			// Si se desactiva la sucursal activa actual → cambiar a la principal
			if (!activa && sucursalId === sucursalActiva && sucursalPrincipalId) {
				useAuthStore.getState().setSucursalActiva(sucursalPrincipalId);
			}
			notificar.exito(activa ? 'Sucursal activada' : 'Sucursal desactivada');
		},
	});
}

export function useEliminarSucursal() {
	const qc = useQueryClient();
	const invalidar = useInvalidarSucursales();
	const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
	const sucursalPrincipalId = useAuthStore((s) => s.sucursalPrincipalId);

	return useMutation({
		mutationFn: (sucursalId: string) => sucursalesService.eliminar(sucursalId),
		onSuccess: (_data, sucursalId) => {
			invalidar();
			qc.removeQueries({ queryKey: queryKeys.sucursales.gerente(sucursalId) });
			// Si se elimina la sucursal activa actual → cambiar a la principal
			if (sucursalId === sucursalActiva && sucursalPrincipalId) {
				useAuthStore.getState().setSucursalActiva(sucursalPrincipalId);
			}
			notificar.exito('Sucursal eliminada');
		},
		onError: (err) => {
			// TIENE_HISTORIAL lo maneja el componente (ofrece desactivar en su lugar)
			// para no mostrar toast + confirm duplicados.
			const axiosErr = err as { response?: { data?: { code?: string; error?: string } } };
			if (axiosErr?.response?.data?.code === 'TIENE_HISTORIAL') return;
			const mensaje = axiosErr?.response?.data?.error ?? 'Error al eliminar sucursal';
			notificar.error(mensaje);
		},
	});
}

// =============================================================================
// MUTATIONS — GERENTES
// =============================================================================

export function useCrearGerente() {
	const invalidar = useInvalidarSucursales();
	const qc = useQueryClient();

	return useMutation({
		mutationFn: ({ sucursalId, datos }: { sucursalId: string; datos: CrearGerenteInput }) =>
			sucursalesService.crearGerente(sucursalId, datos),
		onSuccess: (respuesta, { sucursalId }) => {
			invalidar();
			qc.invalidateQueries({ queryKey: queryKeys.sucursales.gerente(sucursalId) });
			// El backend envía el mensaje correcto según sea creación o promoción
			const mensaje = respuesta?.message ?? 'Gerente asignado correctamente';
			notificar.exito(mensaje);
		},
		onError: (error) => {
			const mensaje = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
				?? 'Error al asignar gerente';
			notificar.error(mensaje);
		},
	});
}

export function useRevocarGerente() {
	const invalidar = useInvalidarSucursales();
	const qc = useQueryClient();

	return useMutation({
		mutationFn: (sucursalId: string) => sucursalesService.revocarGerente(sucursalId),
		onSuccess: (_data, sucursalId) => {
			invalidar();
			qc.invalidateQueries({ queryKey: queryKeys.sucursales.gerente(sucursalId) });
			notificar.exito('Gerente revocado');
		},
		onError: () => {
			notificar.error('Error al revocar gerente');
		},
	});
}

export function useReenviarCredenciales() {
	return useMutation({
		mutationFn: (sucursalId: string) => sucursalesService.reenviarCredenciales(sucursalId),
		onSuccess: () => {
			notificar.exito('Credenciales reenviadas por correo');
		},
		onError: (err) => {
			const mensaje = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
				?? 'Error al reenviar credenciales';
			notificar.error(mensaje);
		},
	});
}
