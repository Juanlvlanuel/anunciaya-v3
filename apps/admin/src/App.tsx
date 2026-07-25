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
import { useAuthPanelStore, iniciarDeteccionActividad } from './stores/useAuthPanelStore';
import { Toaster } from './components/ui/Toaster';
import { BannerInstalarPanel } from './components/pwa/BannerInstalarPanel';
import { ModalInactividadPanel } from './components/auth/ModalInactividadPanel';

function App() {
  useEffect(() => {
    useAuthPanelStore.getState().hidratar();
  }, []);

  // Timer de inactividad: arranca/reinicia con cada evento de actividad del usuario.
  useEffect(() => {
    const limpiar = iniciarDeteccionActividad();
    return limpiar;
  }, []);

  // Regreso de suspensión/pestaña en segundo plano prolongado: recalcula contra el
  // timestamp real de la última actividad (el setTimeout del timer no corre mientras
  // la pestaña está congelada/inactiva en background).
  useEffect(() => {
    const alVisible = () => {
      if (document.visibilityState === 'visible') {
        useAuthPanelStore.getState()._verificarInactividadAlRegresar();
      }
    };
    document.addEventListener('visibilitychange', alVisible);
    return () => document.removeEventListener('visibilitychange', alVisible);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter />
      <Toaster />
      <BannerInstalarPanel />
      <ModalInactividadPanel />
    </QueryClientProvider>
  );
}

export default App;
