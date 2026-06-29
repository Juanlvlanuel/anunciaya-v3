/**
 * useMiMembresia.ts
 * ==================
 * Hook de React Query para la sección "Membresía / Pagos" de Mi Perfil (Modo Personal).
 * Lee el estado de la membresía del negocio del usuario logueado + su historial de recibos.
 *
 * Estado de servidor → React Query (este hook). Estado de UI → componente/Zustand.
 *
 * Ubicación: apps/web/src/hooks/queries/useMiMembresia.ts
 */

import { useQuery } from '@tanstack/react-query';
import * as membresiaService from '../../services/membresiaService';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';

/** Vista de membresía del dueño. Habilitado solo con sesión activa. */
export function useMiMembresia() {
    // El usuarioId va en la query key: al cambiar de cuenta la key cambia y React Query
    // refetchea en vez de servir el caché del usuario anterior (de eso depende que el tab
    // "Membresía y Pagos" aparezca/desaparezca según el usuario, sin tener que refrescar).
    const usuarioId = useAuthStore((s) => s.usuario?.id);

    return useQuery({
        queryKey: queryKeys.membresia.mi(usuarioId),
        queryFn: () => membresiaService.obtenerMiMembresia().then((r) => r.data ?? null),
        enabled: !!usuarioId,
    });
}
