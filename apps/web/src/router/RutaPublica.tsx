/**
 * RutaPublica.tsx
 * ================
 * Componente guard para rutas de autenticación (registro, verificar-email, etc.)
 *
 * ¿Qué hace?
 * - Si el usuario NO está logueado → muestra el contenido
 * - Si el usuario ESTÁ logueado → redirige a /inicio
 * - Mientras verifica → muestra loading
 *
 * Uso:
 *   <Route path="/registro" element={<RutaPublica><Registro /></RutaPublica>} />
 *
 * Ubicación: apps/web/src/router/RutaPublica.tsx
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';

interface RutaPublicaProps {
  children: React.ReactNode;
}

export function RutaPublica({ children }: RutaPublicaProps) {
  // Estados de autenticación
  const usuario = useAuthStore((state) => state.usuario);
  const accessToken = useAuthStore((state) => state.accessToken);
  const cargando = useAuthStore((state) => state.cargando);
  const hidratado = useAuthStore((state) => state.hidratado);

  // Verificar si está autenticado
  const isAuthenticated = !!usuario && !!accessToken;

  // Mientras carga o hidrata, mostrar loading
  if (!hidratado || cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">Cargando...</span>
        </div>
      </div>
    );
  }

  // Si está autenticado, redirigir a inicio
  if (isAuthenticated) {
    // Verificar si hay una ruta pendiente guardada
    const rutaPendiente = sessionStorage.getItem('ay_ruta_pendiente');
    
    if (rutaPendiente) {
      sessionStorage.removeItem('ay_ruta_pendiente');
      return <Navigate to={rutaPendiente} replace />;
    }

    return <Navigate to="/inicio" replace />;
  }

  // Si no está autenticado, mostrar el contenido
  return <>{children}</>;
}

export default RutaPublica;