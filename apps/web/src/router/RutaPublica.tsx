/**
 * RutaPublica.tsx
 * ================
 * Componente guard para rutas de autenticación (registro, verificar-email, etc.)
 *
 * ¿Qué hace?
 * - Si el usuario NO está logueado → muestra el contenido
 * - Si el usuario ESTÁ logueado → redirige a /inicio (AnunciaYA) o /scanya (ScanYA)
 * - Mientras verifica → muestra loading
 *
 * IMPORTANTE: Detecta automáticamente si es ruta de ScanYA o AnunciaYA
 * y usa el store correspondiente.
 *
 * Uso:
 *   <Route path="/registro" element={<RutaPublica><Registro /></RutaPublica>} />
 *   <Route path="/scanya/login" element={<RutaPublica><LoginScanYA /></RutaPublica>} />
 *
 * Ubicación: apps/web/src/router/RutaPublica.tsx
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { useScanYAStore } from '../stores/useScanYAStore';

interface RutaPublicaProps {
  children: React.ReactNode;
}

export function RutaPublica({ children }: RutaPublicaProps) {
  const location = useLocation();

  // Detectar si es ruta de ScanYA
  const esScanYA = location.pathname.startsWith('/scanya');

  // Estados de autenticación según el tipo de ruta
  const usuarioAY = useAuthStore((state) => state.usuario);
  const accessTokenAY = useAuthStore((state) => state.accessToken);
  const cargandoAY = useAuthStore((state) => state.cargando);
  const hidratadoAY = useAuthStore((state) => state.hidratado);

  const usuarioSY = useScanYAStore((state) => state.usuario);
  const accessTokenSY = useScanYAStore((state) => state.accessToken);
  const cargandoSY = useScanYAStore((state) => state.cargando);
  const hidratadoSY = useScanYAStore((state) => state.hidratado);

  // Seleccionar estados según el tipo de ruta
  const usuario = esScanYA ? usuarioSY : usuarioAY;
  const accessToken = esScanYA ? accessTokenSY : accessTokenAY;
  const cargando = esScanYA ? cargandoSY : cargandoAY;
  const hidratado = esScanYA ? hidratadoSY : hidratadoAY;

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

  // Si está autenticado, redirigir según el tipo de ruta
  if (isAuthenticated) {
    if (esScanYA) {
      // Si ya está logueado en ScanYA → Redirigir al dashboard de ScanYA
      return <Navigate to="/scanya" replace />;
    } else {
      // Si ya está logueado en AnunciaYA → Redirigir a inicio de AnunciaYA
      // Verificar si hay una ruta pendiente guardada
      const rutaPendiente = sessionStorage.getItem('ay_ruta_pendiente');
      
      if (rutaPendiente) {
        sessionStorage.removeItem('ay_ruta_pendiente');
        return <Navigate to={rutaPendiente} replace />;
      }

      return <Navigate to="/inicio" replace />;
    }
  }

  // Si no está autenticado, mostrar el contenido
  return <>{children}</>;
}

export default RutaPublica;