/**
 * App.tsx
 * ========
 * Componente raíz de la aplicación.
 * 
 * Ubicación: apps/web/src/App.tsx
 */

import { AppRouter } from './router';
import { PanelPerformance } from './components/ui/PanelPerformance';

function App() {
  return (
    <>
      <AppRouter />
      <PanelPerformance />
    </>
  );
}

export default App;