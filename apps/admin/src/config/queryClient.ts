/**
 * queryClient.ts
 * ===============
 * Configuración global de React Query para el Panel Admin.
 * Mismos tiempos que apps/web (staleTime 2min, gcTime 10min).
 *
 * Ubicación: apps/admin/src/config/queryClient.ts
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutos
      gcTime: 1000 * 60 * 10, // 10 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
