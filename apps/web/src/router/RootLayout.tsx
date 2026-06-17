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
import { useUiStore } from '../stores/useUiStore';
import { buscarCiudadCercana } from '../data/ciudadesPopulares';
import { useTituloDinamico } from '../hooks/useTituloDinamico';
import { reportarUbicacion } from '../services/authService';

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

  // Puente ciudad (GPS/selector) → backend: para que el Panel Admin mida usuarios
  // por ciudad. Solo si hay sesión. La clave `usuarioId:ciudad` evita reenviar lo
  // mismo y, a la vez, reenvía si cambia la cuenta o la ciudad.
  const usuarioId = useAuthStore((state) => state.usuario?.id ?? null);
  const ciudadNombre = useGpsStore((state) => state.ciudad?.nombre ?? null);
  const ubicacionReportada = useRef<string | null>(null);

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

  // Enlace de activación del correo (`?activarCuenta=<correo>`): abre el modal directo en
  // "crear contraseña" con el correo precargado y limpia el query param (cuentas modelo C
  // del Panel — equipo y alta manual de negocios). La persona solo mete el código + su contraseña.
  const abrirModalCrearContrasena = useUiStore((s) => s.abrirModalCrearContrasena);
  useEffect(() => {
    if (esPreviewIframe) return;
    const params = new URLSearchParams(window.location.search);
    const correo = params.get('activarCuenta');
    if (!correo) return;
    abrirModalCrearContrasena(correo);
    // Quitar el param para que no se reabra al re-render ni al cerrar el modal.
    params.delete('activarCuenta');
    const query = params.toString();
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [abrirModalCrearContrasena, esPreviewIframe]);

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

  // ==========================================================================
  // BUFFER FANTASMA EN /inicio — atrapar el back nativo SIN flash visual
  // ==========================================================================
  //
  // Problema que resolvemos: el usuario en /inicio (típicamente tras login o
  // por URL directa) presiona back nativo del celular y la app lo saca o lo
  // desloguea (si la entrada anterior está fuera del SPA o es la landing).
  //
  // Estrategia:
  //  1. CADA vez que el usuario aterriza en `/inicio`, push 2 entradas
  //     fantasma encima (mismas URL). El usuario queda parado en la última.
  //     Stack: `[..., /inicio_router, fantasma1, fantasma2]` ← user aquí.
  //  2. Cuando hace back, aterriza en `fantasma1` (mismo URL = /inicio, NO
  //     hay flash visual). Popstate dispara → nuestro listener detecta el
  //     state fantasma + URL `/inicio` → push otra fantasma encima.
  //     Stack: `[..., /inicio_router, fantasma1, fantasma3]` ← user aquí.
  //  3. Loop infinito: el usuario nunca llega a la entrada `/inicio_router`
  //     ni a las entradas anteriores del browser. El SPA solo se sale
  //     cerrando la pestaña.
  //  4. Solo aplica en `/inicio` — en otras rutas (`/marketplace`, etc.) el
  //     back funciona normal hacia la ruta anterior. No interferimos con
  //     navegación legítima entre secciones.
  //
  // Por qué push 2 y no 1: con una sola fantasma, después del primer back
  // el usuario aterriza en `/inicio_router` (sin fantasma). Si presiona back
  // de nuevo, el listener no atrapa y sale del SPA. Con 2 fantasmas iniciales
  // y push de otra en cada popstate, el invariante "siempre hay fantasma
  // encima del usuario" se mantiene a perpetuidad.
  // ==========================================================================
  useEffect(() => {
    if (esPreviewIframe) return;
    if (pathname !== '/inicio') return;

    const stateActual = window.history.state as { _anunciayaFantasma?: boolean } | null;
    // Solo push si NO hay fantasma encima. Evita acumular fantasmas en
    // re-renders, HMR de Vite, y vueltas al /inicio desde otras rutas.
    if (!stateActual?._anunciayaFantasma) {
      // Propagar state previo para no borrar marcas de modales abiertos
      // (`_modalUI`, `_modalBottom`, etc.). Sin esto, abrir un modal en
      // /inicio + cualquier re-render que dispare este effect podría
      // borrar la marca del modal y hacer que useBackNativo lo cierre.
      const base = (stateActual ?? {}) as Record<string, unknown>;
      window.history.pushState({ ...base, _anunciayaFantasma: true }, '');
      window.history.pushState({ ...base, _anunciayaFantasma: true }, '');
    }
  }, [pathname, esPreviewIframe]);

  useEffect(() => {
    if (esPreviewIframe) return;

    const handlePopState = () => {
      // SOLO atrapar cuando el usuario está en /inicio. En otras rutas el
      // back debe funcionar normal (ej. /marketplace → /inicio es un back
      // legítimo que el usuario espera).
      if (window.location.pathname !== '/inicio') return;

      const state = window.history.state as { _anunciayaFantasma?: boolean } | null;
      if (state?._anunciayaFantasma) {
        // Aterrizamos en fantasma desde /inicio. Push otra para mantener
        // el invariante "siempre hay fantasma encima". Esto evita que un
        // back más adelante caiga en /inicio_router (sin fantasma) y luego
        // saque al usuario del SPA.
        // Propagar el state previo para no borrar marcas de modales abiertos.
        const base = (state ?? {}) as Record<string, unknown>;
        window.history.pushState({ ...base, _anunciayaFantasma: true }, '');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [esPreviewIframe]);

  // Detectar ubicación automáticamente si no hay ciudad guardada
  // ⚠️ No necesario en preview (iframe solo renderiza vista del negocio)
  useEffect(() => {
    if (esPreviewIframe) return;

    // Evitar doble ejecución (React StrictMode)
    if (deteccionEjecutada.current) return;
    deteccionEjecutada.current = true;

    const detectarUbicacion = async () => {
      // 1. Si hay ciudad en localStorage, garantizamos que el store la tenga
      //    Y que las coordenadas también estén sincronizadas. Disparamos
      //    setCiudad si:
      //      - La ciudad del store difiere (rehidratación falló) O
      //      - El store no tiene coordenadas pero la ciudad guardada sí
      //        (caso reportado: ciudad persiste pero lat/lng no, lo que
      //        provoca que el feed muestre "Activa tu ubicación" aunque el
      //        usuario ya había aceptado GPS).
      const ciudadGuardada = leerCiudadDeStorage();
      if (ciudadGuardada) {
        const stateActual = useGpsStore.getState();
        const ciudadDistinta = stateActual.ciudad?.nombre !== ciudadGuardada.nombre;
        const sinCoordenadas =
          stateActual.latitud === null || stateActual.longitud === null;
        // Forzamos setCiudad cuando hay desincronización; setCiudad ahora
        // auto-rellena coordenadas desde ciudadesPopulares si no se pasan
        // (centro de la ciudad como fallback inmediato).
        if (ciudadDistinta || sinCoordenadas) {
          setCiudad(
            ciudadGuardada.nombre,
            ciudadGuardada.estado,
            ciudadGuardada.coordenadas
          );
        }

        // Aún teniendo ciudad, intentamos conseguir las COORDENADAS REALES
        // del usuario en background. Si el browser tiene permiso `granted`,
        // getCurrentPosition se resuelve sin prompt y las distancias del feed
        // pasan a ser exactas (no desde el centro de la ciudad).
        // Si está `denied` o `prompt`, el browser maneja el error y caemos
        // de vuelta al fallback del catálogo.
        if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
          navigator.permissions
            .query({ name: 'geolocation' as PermissionName })
            .then((p) => {
              if (p.state === 'granted') {
                void obtenerUbicacion().catch(() => undefined);
              }
            })
            .catch(() => undefined);
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

  // Reportar la ciudad al backend cuando hay sesión + ciudad fijada (fire-and-forget).
  // Cubre: login con ciudad ya detectada, y cambio de ciudad desde el selector del header.
  useEffect(() => {
    if (esPreviewIframe) return;
    if (!usuarioId || !ciudadNombre) return;

    const clave = `${usuarioId}:${ciudadNombre}`;
    if (ubicacionReportada.current === clave) return;
    ubicacionReportada.current = clave;

    reportarUbicacion(ciudadNombre).catch(() => undefined);
  }, [usuarioId, ciudadNombre, esPreviewIframe]);

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