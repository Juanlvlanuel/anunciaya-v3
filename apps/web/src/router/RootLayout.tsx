/**
 * RootLayout.tsx
 * ===============
 * Layout raíz que envuelve toda la aplicación.
 * Contiene componentes globales como el ModalLogin.
 *
 * Ubicación: apps/web/src/router/RootLayout.tsx
 */

import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { ModalLogin, ModalInactividad } from '../components/auth';
import { useAuthStore, iniciarDeteccionActividad } from '../stores/useAuthStore';
import { useScanYAStore } from '../stores/useScanYAStore';
import { useGpsStore } from '../stores/useGpsStore';
import { buscarCiudadCercana } from '../data/ciudadesPopulares';
import { useTituloDinamico } from '../hooks/useTituloDinamico';

/**
 * Verifica si hay ciudad guardada en localStorage
 * Esto es más confiable que esperar hidratación de Zustand
 */
function hayCiudadGuardada(): boolean {
  try {
    const stored = localStorage.getItem('ay_ubicacion');
    if (!stored) return false;
    
    const parsed = JSON.parse(stored);
    return parsed?.state?.ciudad !== null && parsed?.state?.ciudad !== undefined;
  } catch {
    return false;
  }
}

export function RootLayout() {
  const hidratarAuth = useAuthStore((state) => state.hidratarAuth);
  const hidratarAuthScanYA = useScanYAStore((state) => state.hidratarAuth);
  
  // GPS Store
  const obtenerUbicacion = useGpsStore((state) => state.obtenerUbicacion);
  const setCiudad = useGpsStore((state) => state.setCiudad);

  // Ref para evitar doble ejecución
  const deteccionEjecutada = useRef(false);

  // ✅ Cambiar título dinámicamente según la ruta
  useTituloDinamico();

  // Hidratar autenticación al cargar la app (AnunciaYA y ScanYA)
  useEffect(() => {
    hidratarAuth(); // AnunciaYA
    hidratarAuthScanYA(); // ScanYA
  }, [hidratarAuth, hidratarAuthScanYA]);

  // Iniciar detección de actividad para el timer de inactividad
  useEffect(() => {
    const limpiar = iniciarDeteccionActividad();
    return limpiar;
  }, []);

  // Detectar ubicación automáticamente si no hay ciudad guardada
  useEffect(() => {
    // Evitar doble ejecución (React StrictMode)
    if (deteccionEjecutada.current) return;
    deteccionEjecutada.current = true;

    const detectarUbicacion = async () => {
      // Verificar directamente en localStorage (más confiable)
      if (hayCiudadGuardada()) {
        return;
      }

      try {
        const coordenadas = await obtenerUbicacion();
        
        if (coordenadas) {
          const ciudadCercana = buscarCiudadCercana(
            coordenadas.latitud,
            coordenadas.longitud
          );

          if (ciudadCercana) {
            setCiudad(
              ciudadCercana.nombre,
              ciudadCercana.estado,
              ciudadCercana.coordenadas
            );
          }
        }
      } catch (error) {
        console.warn('No se pudo detectar ubicación automáticamente:', error);
      }
    };

    detectarUbicacion();
  }, [obtenerUbicacion, setCiudad]);

  return (
    <>
      {/* Contenido de la ruta actual */}
      <Outlet />

      {/* Modal de Login (global) */}
      <ModalLogin />

      {/* Modal de Inactividad (global) */}
      <ModalInactividad />
    </>
  );
}

export default RootLayout;