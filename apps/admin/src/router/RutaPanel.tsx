/**
 * RutaPanel.tsx
 * ==============
 * Guard del shell: exige sesión del Panel. Si no hay sesión hidratada o no hay
 * usuario/token, manda al acceso. El filtro por ROL (que la cuenta sea de equipo)
 * ya lo hace el backend en /api/admin/yo durante el login.
 *
 * Ubicación: apps/admin/src/router/RutaPanel.tsx
 */

import { Navigate } from 'react-router-dom';
import { useAuthPanelStore } from '../stores/useAuthPanelStore';

interface RutaPanelProps {
  children: React.ReactNode;
}

export function RutaPanel({ children }: RutaPanelProps) {
  const hidratado = useAuthPanelStore((s) => s.hidratado);
  const usuario = useAuthPanelStore((s) => s.usuario);
  const accessToken = useAuthPanelStore((s) => s.accessToken);

  if (!hidratado) {
    return (
      <div className="grid min-h-screen place-items-center bg-lienzo">
        <span className="spinner-panel" />
      </div>
    );
  }

  if (!usuario || !accessToken) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default RutaPanel;
