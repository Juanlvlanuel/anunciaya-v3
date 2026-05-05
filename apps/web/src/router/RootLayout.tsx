/**
 * RootLayout.tsx
 * ===============
 * Layout raíz que envuelve toda la aplicación.
 * Contiene componentes globales como el ModalLogin.
 *
 * Ubicación: apps/web/src/router/RootLayout.tsx
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ModalLogin, ModalInactividad } from '../components/auth';
import { ModalRateLimit } from '../components/ui/Banner429';
import { useAuthStore, iniciarDeteccionActividad } from '../stores/useAuthStore';
import { useScanYAStore } from '../stores/useScanYAStore';
import { useGpsStore } from '../stores/useGpsStore';
import { buscarCiudadCercana } from '../data/ciudadesPopulares';
import { useTituloDinamico } from '../hooks/useTituloDinamico';

/**
 * Lee la ciudad guardada en localStorage. Más confiable que esperar
 * hidratación de Zustand (que en algunos escenarios — Vite HMR, DevTools
 * toggleando viewport, primer arranque tras force-stop — puede desincronizarse
 * con el storage).
 *
 * Devuelve `null` si no hay ciudad o si el storage está corrupto.
 */
function leerCiudadDeStorage(): {
  nombre: string;
  estado: string;
  coordenadas?: { lat: number; lng: number };
} | null {
  try {
    const stored = localStorage.getItem('ay_ubicacion');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as {
      state?: {
        ciudad?: {
          nombre: string;
          estado: string;
          coordenadas?: { lat: number; lng: number };
        } | null;
      };
    };
    const c = parsed?.state?.ciudad;
    if (!c?.nombre || !c?.estado) return null;
    return { nombre: c.nombre, estado: c.estado, coordenadas: c.coordenadas };
  } catch {
    return null;
  }
}

export function RootLayout() {
  // ⚠️ Detectar si estamos dentro del iframe de preview (Business Studio)
  // En modo preview, NO se inicializa auth/socket/GPS para evitar ping-pong con localStorage
  const esPreviewIframe = new URLSearchParams(window.location.search).has('preview');

  const hidratarAuth = useAuthStore((state) => state.hidratarAuth);
  const hidratarAuthScanYA = useScanYAStore((state) => state.hidratarAuth);

  // GPS Store
  const obtenerUbicacion = useGpsStore((state) => state.obtenerUbicacion);
  const setCiudad = useGpsStore((state) => state.setCiudad);

  // Ref para evitar doble ejecución
  const deteccionEjecutada = useRef(false);

  // ✅ Cambiar título dinámicamente según la ruta
  useTituloDinamico();

  // Scroll al tope al cambiar de ruta (antes del paint para evitar flash)
  // El scroll vive en <main> con overflow-y-auto (MainLayout), no en window
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('main').forEach((el) => el.scrollTo(0, 0));
  }, [pathname]);

  // Hidratar autenticación al cargar la app (AnunciaYA y ScanYA)
  // ⚠️ En preview: hidratarAuth hace early return sin llamar servidor ni escribir localStorage
  const esRutaScanYA = pathname.startsWith('/scanya');
  useEffect(() => {
    // En rutas ScanYA no hidratar AnunciaYA (el empleado no tiene cuenta AnunciaYA → evita 404 en /api/auth/yo)
    if (!esRutaScanYA) {
      hidratarAuth();
    }
    if (!esPreviewIframe) {
      hidratarAuthScanYA(); // ScanYA — innecesario en preview
    }
  }, [hidratarAuth, hidratarAuthScanYA, esPreviewIframe, esRutaScanYA]);

  // Iniciar detección de actividad para el timer de inactividad
  // ⚠️ No necesario en preview (iframe no maneja sesión)
  useEffect(() => {
    if (esPreviewIframe) return;
    const limpiar = iniciarDeteccionActividad();
    return limpiar;
  }, [esPreviewIframe]);

  // Detectar regreso de suspensión/inactividad prolongada
  useEffect(() => {
    if (esPreviewIframe) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        useAuthStore.getState()._verificarInactividadAlRegresar();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [esPreviewIframe]);

  // Detectar ubicación automáticamente si no hay ciudad guardada
  // ⚠️ No necesario en preview (iframe solo renderiza vista del negocio)
  useEffect(() => {
    if (esPreviewIframe) return;

    // Evitar doble ejecución (React StrictMode)
    if (deteccionEjecutada.current) return;
    deteccionEjecutada.current = true;

    const detectarUbicacion = async () => {
      // 1. Si hay ciudad en localStorage, garantizamos que el store la tenga.
      //    Si zustand persist ya rehidrató bien, este `setCiudad` es idempotente
      //    (mismo valor, no genera re-render). Si la rehidratación falló (bug
      //    raro de HMR o cambio de viewport), aquí re-aplicamos al store.
      const ciudadGuardada = leerCiudadDeStorage();
      if (ciudadGuardada) {
        const stateActual = useGpsStore.getState();
        if (stateActual.ciudad?.nombre !== ciudadGuardada.nombre) {
          setCiudad(
            ciudadGuardada.nombre,
            ciudadGuardada.estado,
            ciudadGuardada.coordenadas
          );
        }
        return;
      }

      // 2. Sin ciudad guardada → intentar auto-detectar por GPS.
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
  }, [obtenerUbicacion, setCiudad, esPreviewIframe]);

  return (
    <>
      {/* Modal global de rate limit (429) — aparece una sola vez */}
      <ModalRateLimit />

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