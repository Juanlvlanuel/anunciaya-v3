/**
 * MatrizGuard.tsx
 * ================
 * Guard que protege rutas exclusivas de la sucursal Matriz.
 *
 * Algunos módulos del negocio son globales (no por-sucursal) y solo deben
 * administrarse desde la Matriz: Puntos y Recompensas, Sucursales, etc.
 * El menú ya los oculta cuando la sucursal activa es secundaria, pero la
 * navegación por URL directa (bookmark, link viejo) los abriría igual.
 *
 * Comportamiento:
 *   - Si la sucursal activa es Matriz → renderiza el contenido protegido
 *   - Si NO es Matriz (dueño en sucursal secundaria o gerente) → notifica
 *     y redirige al dashboard de Business Studio.
 *
 * Componer con ModoGuard (orden recomendado):
 *   <ModoGuard requiereModo="comercial">
 *     <MatrizGuard>...</MatrizGuard>
 *   </ModoGuard>
 *
 * Ubicación: apps/web/src/router/guards/MatrizGuard.tsx
 */

import { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';

interface MatrizGuardProps {
  children: React.ReactNode;
}

export function MatrizGuard({ children }: MatrizGuardProps) {
  const esSucursalPrincipal = useAuthStore((s) => s.esSucursalPrincipal);
  const notificado = useRef(false);

  useEffect(() => {
    if (!esSucursalPrincipal && !notificado.current) {
      notificado.current = true;
      notificar.info('Este módulo solo está disponible desde la Matriz');
    }
  }, [esSucursalPrincipal]);

  if (!esSucursalPrincipal) {
    return <Navigate to="/business-studio" replace />;
  }

  return <>{children}</>;
}

export default MatrizGuard;
