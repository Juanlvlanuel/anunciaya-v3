/**
 * queryClient.ts
 * ===============
 * Instancia global de React Query (TanStack Query v5).
 * Se importa en App.tsx para el QueryClientProvider
 * y en los stores que necesiten invalidar caché tras mutaciones.
 *
 * Ubicación: apps/web/src/config/queryClient.ts
 */

import { QueryCache, QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { notificar } from '../utils/notificaciones';

/**
 * Mensaje amigable según el tipo de error de axios. Los timeouts (ECONNABORTED,
 * "timeout of Xms exceeded") no traen `response` — son el síntoma típico de
 * saturación del pool de conexiones del backend (ver apps/api/src/db/index.ts),
 * no un problema de sesión: por eso el mensaje no habla de "sesión" ni sugiere
 * volver a loguearse.
 */
function mensajeAmigable(error: unknown): string {
  if (error instanceof AxiosError) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'El servidor está tardando más de lo normal. Intenta de nuevo.';
    }
    if (!error.response) {
      return 'No se pudo conectar. Revisa tu conexión a internet.';
    }
    const mensajeBackend = (error.response.data as { message?: string } | undefined)?.message;
    if (mensajeBackend) return mensajeBackend;
  }
  return 'No se pudo cargar la información.';
}

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
  // Aviso global cuando una query falla (tras su reintento): antes no había NINGÚN
  // manejo por defecto — cada página decidía por su cuenta si mostraba algo, y la
  // mayoría no lo hacía, dejando skeletons pegados para siempre sin que el usuario
  // se enterara de que algo falló. El toast trae botón "Reintentar" (llama a
  // `query.fetch()` de esa misma query) porque un aviso sin acción no sirve de mucho.
  //
  // Se omite si:
  // - Nadie está viendo esa query ahora mismo (`getObserversCount() === 0` — el
  //   usuario ya navegó a otro lado, avisar sería ruido sobre algo que no ve).
  // - La query trae `meta: { silenciarErrorGlobal: true }` — escape hatch para
  //   páginas que ya manejan su propio estado de error y no quieren el toast duplicado.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.silenciarErrorGlobal) return;
      if (query.getObserversCount() === 0) return;

      notificar.error(mensajeAmigable(error), 'No se pudo cargar', {
        etiqueta: 'Reintentar',
        onClick: () => { void query.fetch(); },
      });
    },
  }),
});
