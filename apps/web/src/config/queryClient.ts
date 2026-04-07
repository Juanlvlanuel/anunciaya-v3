/**
 * queryClient.ts
 * ===============
 * Instancia global de React Query (TanStack Query v5).
 * Se importa en App.tsx para el QueryClientProvider
 * y en los stores que necesiten invalidar caché tras mutaciones.
 *
 * Ubicación: apps/web/src/config/queryClient.ts
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos frescos por 2 minutos — sin re-fetch en re-visitas dentro de ese tiempo
      staleTime: 2 * 60 * 1000,
      // Cache se mantiene 10 minutos tras desmontar el componente
      gcTime: 10 * 60 * 1000,
      // No re-fetch al volver al tab — evita requests innecesarios
      refetchOnWindowFocus: false,
      // Sí re-fetch al reconectar internet
      refetchOnReconnect: true,
      // 1 reintento en caso de error de red
      retry: 1,
    },
  },
});
