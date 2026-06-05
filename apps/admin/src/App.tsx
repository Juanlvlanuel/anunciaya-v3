/**
 * App.tsx
 * ========
 * Raíz del Panel Admin. Provee React Query, hidrata la sesión del Panel desde
 * localStorage (clave propia `ayadmin_`) y monta el router.
 *
 * Ubicación: apps/admin/src/App.tsx
 */

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/queryClient';
import { AppRouter } from './router';
import { useAuthPanelStore } from './stores/useAuthPanelStore';

function App() {
  useEffect(() => {
    useAuthPanelStore.getState().hidratar();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  );
}

export default App;
