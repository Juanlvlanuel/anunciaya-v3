/**
 * App.tsx
 * ========
 * Componente raíz de la aplicación.
 *
 * Ubicación: apps/web/src/App.tsx
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './config/queryClient';
import { AppRouter } from './router';
import { PanelPerformance } from './components/ui/PanelPerformance';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <PanelPerformance />
    </QueryClientProvider>
  );
}

export default App;