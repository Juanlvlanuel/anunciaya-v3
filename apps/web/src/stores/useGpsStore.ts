/**
 * useGpsStore.ts
 * ===============
 * Store de Zustand para manejo de ubicación geográfica.
 *
 * ¿Qué hace este archivo?
 * - Solicita permisos de geolocalización al navegador
 * - Guarda las coordenadas del usuario
 * - Guarda la ciudad seleccionada (manual o por GPS)
 * - Persiste la ciudad en localStorage
 * - Maneja estados de carga y errores
 *
 * ¿Para qué se usa?
 * - Selector de ubicación en el Header
 * - Mostrar negocios cercanos (Fase 5)
 * - Búsquedas por ubicación
 * - Mapa con PostGIS
 *
 * MEJORA: Detección en paralelo (GPS + IP) para mayor velocidad
 *
 * Ubicación: apps/web/src/stores/useGpsStore.ts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Estado del permiso de geolocalización
 */
export type EstadoPermiso = 'pendiente' | 'concedido' | 'denegado';

/**
 * Coordenadas geográficas
 */
export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/**
 * Ciudad seleccionada
 */
export interface CiudadSeleccionada {
  nombre: string;        // "Puerto Peñasco"
  estado: string;        // "Sonora"
  nombreCompleto: string; // "Puerto Peñasco, Sonora"
  coordenadas?: {
    lat: number;
    lng: number;
  };
}

/**
 * Estado del store
 */
interface GpsState {
  // Estado - GPS
  latitud: number | null;
  longitud: number | null;
  permiso: EstadoPermiso;
  cargando: boolean;
  error: string | null;

  // Estado - Ciudad seleccionada
  ciudad: CiudadSeleccionada | null;

  // Computed
  tieneCoordenadas: boolean;
  tieneCiudad: boolean;

  // Acciones - GPS
  obtenerUbicacion: () => Promise<Coordenadas | null>;
  setCoordenadas: (latitud: number, longitud: number) => void;
  limpiar: () => void;

  // Acciones - Ciudad
  setCiudad: (
    nombre: string,
    estado: string,
    coordenadas?: { lat: number; lng: number }
  ) => void;
  limpiarCiudad: () => void;
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

/**
 * Key para localStorage
 */
const STORAGE_KEY = 'ay_ubicacion';

// =============================================================================
// FUNCIÓN HELPER: Intentar obtener ubicación (con timeout manual)
// =============================================================================

/**
 * Intenta obtener ubicación con parámetros específicos
 * Incluye timeout manual para mayor control
 * 
 * @param altaPrecision - true para GPS real, false para IP/WiFi
 * @param timeout - Tiempo máximo de espera en milisegundos
 */
function intentarObtenerUbicacion(
  altaPrecision: boolean,
  timeout: number
): Promise<Coordenadas | null> {
  return new Promise((resolve) => {
    // Timeout manual como respaldo
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, timeout + 1000); // +1 segundo de margen

    const opciones: PositionOptions = {
      enableHighAccuracy: altaPrecision,
      timeout: timeout,
      maximumAge: altaPrecision ? 0 : 300000, // Sin cache para alta precisión
    };

    navigator.geolocation.getCurrentPosition(
      // Éxito
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        resolve({ latitud: latitude, longitud: longitude });
      },

      // Error
      () => {
        clearTimeout(timeoutId);
        resolve(null);
      },

      // Opciones
      opciones
    );
  });
}

// =============================================================================
// FUNCIÓN HELPER: Obtener ubicación en PARALELO (rápido)
// =============================================================================

/**
 * Lanza GPS de alta y baja precisión en paralelo
 * Retorna el primero que responda con éxito
 * 
 * Beneficios:
 * - En PC: Usa IP rápidamente (~2-3 seg)
 * - En móvil: Usa GPS si está disponible
 * - No espera 15 segundos innecesariamente
 */
async function obtenerUbicacionRapida(): Promise<Coordenadas | null> {
  // Crear ambas promesas en paralelo
  const promesaAltaPrecision = intentarObtenerUbicacion(true, 8000);  // GPS real - 8 seg
  const promesaBajaPrecision = intentarObtenerUbicacion(false, 5000); // IP/WiFi - 5 seg

  // Esperar ambas en paralelo
  const [resultadoAlta, resultadoBaja] = await Promise.all([
    promesaAltaPrecision,
    promesaBajaPrecision,
  ]);

  // Preferir alta precisión si está disponible, sino usar baja
  return resultadoAlta || resultadoBaja || null;
}

// =============================================================================
// STORE
// =============================================================================

export const useGpsStore = create<GpsState>()(
  persist(
    (set, get) => ({
      // ---------------------------------------------------------------------------
      // Estado inicial
      // ---------------------------------------------------------------------------
      latitud: null,
      longitud: null,
      permiso: 'pendiente',
      cargando: false,
      error: null,

      // Ciudad seleccionada
      ciudad: null,

      // Computed
      get tieneCoordenadas() {
        const state = get();
        return state.latitud !== null && state.longitud !== null;
      },

      get tieneCiudad() {
        const state = get();
        return state.ciudad !== null;
      },

      // ---------------------------------------------------------------------------
      // ACCIÓN: Obtener ubicación del navegador (MEJORADA - PARALELO)
      // ---------------------------------------------------------------------------
      obtenerUbicacion: async (): Promise<Coordenadas | null> => {
        
        // Verificar si el navegador soporta geolocalización
        if (!navigator.geolocation) {
          set({
            error: 'Tu navegador no soporta geolocalización',
            permiso: 'denegado',
          });
          return null;
        }
        
        set({ cargando: true, error: null });

        // Usar detección en paralelo (más rápida)
        const coordenadas = await obtenerUbicacionRapida();
        
        if (coordenadas) {
          set({
            latitud: coordenadas.latitud,
            longitud: coordenadas.longitud,
            permiso: 'concedido',
            cargando: false,
            error: null,
          });
          return coordenadas;
        }

        // Ambos intentos fallaron
        set({
          error: 'No se pudo obtener tu ubicación. Verifica que el GPS esté activado.',
          permiso: 'denegado',
          cargando: false,
        });
        return null;
      },

      // ---------------------------------------------------------------------------
      // ACCIÓN: Establecer coordenadas manualmente
      // ---------------------------------------------------------------------------
      setCoordenadas: (latitud: number, longitud: number) => {
        set({
          latitud,
          longitud,
          permiso: 'concedido',
          error: null,
        });
      },

      // ---------------------------------------------------------------------------
      // ACCIÓN: Establecer ciudad seleccionada
      // ---------------------------------------------------------------------------
      setCiudad: (
        nombre: string,
        estado: string,
        coordenadas?: { lat: number; lng: number }
      ) => {
        set({
          ciudad: {
            nombre,
            estado,
            nombreCompleto: `${nombre}, ${estado}`,
            coordenadas,
          },
          // También actualizar coordenadas si se proporcionan
          ...(coordenadas && {
            latitud: coordenadas.lat,
            longitud: coordenadas.lng,
          }),
        });
      },

      // ---------------------------------------------------------------------------
      // ACCIÓN: Limpiar ciudad
      // ---------------------------------------------------------------------------
      limpiarCiudad: () => {
        set({
          ciudad: null,
        });
      },

      // ---------------------------------------------------------------------------
      // ACCIÓN: Limpiar todo el estado
      // ---------------------------------------------------------------------------
      limpiar: () => {
        set({
          latitud: null,
          longitud: null,
          permiso: 'pendiente',
          cargando: false,
          error: null,
          ciudad: null,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      // Solo persistir la ciudad (no las coordenadas GPS que pueden cambiar)
      partialize: (state) => ({
        ciudad: state.ciudad,
      }),
    }
  )
);

export default useGpsStore;