/**
 * router/index.tsx
 * =================
 * Rutas del Panel Admin: acceso (login) y el shell protegido.
 *
 * Ubicación: apps/admin/src/router/index.tsx
 */

import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import PaginaLogin from '../pages/PaginaLogin';
import PaginaPanel from '../pages/PaginaPanel';
import { RutaPanel } from './RutaPanel';

const router = createBrowserRouter([
  {
    path: '/',
    element: <PaginaLogin />,
  },
  {
    path: '/inicio',
    element: (
      <RutaPanel>
        <PaginaPanel />
      </RutaPanel>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
