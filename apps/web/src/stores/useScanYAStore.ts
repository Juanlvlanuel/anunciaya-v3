/**
 * useScanYAStore.ts
 * ==================
 * Store de Zustand para manejo de autenticación en ScanYA.
 *
 * ¿Qué hace este archivo?
 * - Guarda el estado del usuario ScanYA y tokens
 * - Persiste tokens en localStorage (prefijo: sy_)
 * - Maneja turno activo
 * - Hidrata el estado al cargar la app
 * - Sistema de autenticación independiente de AnunciaYA
 * - Maneja recordatorios offline con sincronización automática
 *
 * Ubicación: apps/web/src/stores/useScanYAStore.ts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  UsuarioScanYA,
  TurnoScanYA,
  RazonLogoutScanYA,
} from '../types/scanya';
import { crearRecordatorio } from '../services/scanyaService';
import { notificar } from '../utils/notificaciones';

// =============================================================================
// CONSTANTES
// =============================================================================

// Prefijo para las claves de localStorage (evita colisiones con AnunciaYA)
const STORAGE_PREFIX = 'sy_';
const STORAGE_KEYS = {
  accessToken: `${STORAGE_PREFIX}access_token`,
  refreshToken: `${STORAGE_PREFIX}refresh_token`,
  usuario: `${STORAGE_PREFIX}usuario`,
  turnoActivo: `${STORAGE_PREFIX}turno_activo`,
} as const;

const MAX_INTENTOS_SINCRONIZACION = 3;

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Recordatorio guardado offline
 */
export interface RecordatorioOffline {
  id: string; // temp_timestamp_random
  telefonoOAlias: string;
  monto: number;
  montoEfectivo: number;
  montoTarjeta: number;
  montoTransferencia: number;
  nota?: string;
  estado: 'pendiente';
  createdAt: string; // ISO string
  intentosSincronizacion: number;
  ultimoError?: string;
}

/**
 * Datos para crear recordatorio en el backend
 */
interface DatosCrearRecordatorio {
  telefonoOAlias: string;
  monto: number;
  montoEfectivo?: number;
  montoTarjeta?: number;
  montoTransferencia?: number;
  nota?: string;
}

/**
 * Estado del store
 */
interface ScanYAState {
  // Estado - Autenticación
  usuario: UsuarioScanYA | null;
  accessToken: string | null;
  refreshToken: string | null;
  turnoActivo: TurnoScanYA | null;
  cargando: boolean;
  hidratado: boolean;
  emailRecordado: string | null;

  // Estado - Recordatorios Offline
  recordatoriosOffline: RecordatorioOffline[];
  sincronizando: boolean;

  // Acciones de autenticación
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUsuario: (usuario: UsuarioScanYA) => void;
  setEmailRecordado: (email: string | null) => void;
  loginExitoso: (usuario: UsuarioScanYA, accessToken: string, refreshToken: string) => Promise<void>;
  logout: (razon?: RazonLogoutScanYA) => void;
  hidratarAuth: () => Promise<void>;

  // Acciones de turno
  setTurnoActivo: (turno: TurnoScanYA | null) => void;

  // Acciones de recordatorios offline
  agregarRecordatorioOffline: (datos: Omit<RecordatorioOffline, 'id' | 'estado' | 'createdAt' | 'intentosSincronizacion'>) => RecordatorioOffline;
  eliminarRecordatorioOffline: (id: string) => void;
  limpiarRecordatoriosOffline: () => void;
  sincronizarRecordatorios: () => Promise<void>;
  marcarIntentoFallido: (id: string, error: string) => void;
}

// =============================================================================
// HELPERS DE LOCALSTORAGE
// =============================================================================

/**
 * Guarda un valor en localStorage de forma segura
 */
function guardarEnStorage(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch (error) {
    console.warn('Error guardando en localStorage:', error);
  }
}

/**
 * Obtiene un valor de localStorage de forma segura
 */
function obtenerDeStorage(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch (error) {
    console.warn('Error leyendo localStorage:', error);
    return null;
  }
}

/**
 * Elimina un valor de localStorage de forma segura
 */
function eliminarDeStorage(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch (error) {
    console.warn('Error eliminando de localStorage:', error);
  }
}

/**
 * Limpia todas las claves de ScanYA del localStorage
 */
function limpiarStorageAuth(): void {
  eliminarDeStorage(STORAGE_KEYS.accessToken);
  eliminarDeStorage(STORAGE_KEYS.refreshToken);
  eliminarDeStorage(STORAGE_KEYS.usuario);
  eliminarDeStorage(STORAGE_KEYS.turnoActivo);
}

// =============================================================================
// STORE CON PERSIST
// =============================================================================

export const useScanYAStore = create<ScanYAState>()(
  persist(
    (set, get) => ({
      // -----------------------------------------------------------------------
      // Estado inicial - Autenticación
      // -----------------------------------------------------------------------
      usuario: null,
      accessToken: null,
      refreshToken: null,
      turnoActivo: null,
      cargando: true,
      hidratado: false,
      emailRecordado: null,

      // -----------------------------------------------------------------------
      // Estado inicial - Recordatorios
      // -----------------------------------------------------------------------
      recordatoriosOffline: [],
      sincronizando: false,

      // -----------------------------------------------------------------------
      // ACCIÓN: Guardar tokens
      // -----------------------------------------------------------------------
      setTokens: (accessToken: string, refreshToken: string) => {
        // Guardar en localStorage
        guardarEnStorage(STORAGE_KEYS.accessToken, accessToken);
        guardarEnStorage(STORAGE_KEYS.refreshToken, refreshToken);

        // Actualizar estado
        set({ accessToken, refreshToken });
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Guardar usuario
      // -----------------------------------------------------------------------
      setUsuario: (usuario: UsuarioScanYA) => {
        // Guardar en localStorage
        guardarEnStorage(STORAGE_KEYS.usuario, JSON.stringify(usuario));

        // Actualizar estado
        set({ usuario, hidratado: true, cargando: false });
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Login exitoso (actualiza todo de una vez)
      // -----------------------------------------------------------------------
      loginExitoso: async (usuario: UsuarioScanYA, accessToken: string, refreshToken: string) => {
        // Validar que el usuario tenga la estructura correcta
        if (!usuario || typeof usuario !== 'object') {
          console.error('❌ Usuario inválido recibido en loginExitoso:', usuario);
          throw new Error('Usuario inválido');
        }

        if (!usuario.usuarioId || !usuario.negocioId || !usuario.sucursalId) {
          console.error('❌ Usuario sin campos requeridos:', usuario);
          throw new Error('Usuario incompleto');
        }

        // Guardar tokens
        guardarEnStorage(STORAGE_KEYS.accessToken, accessToken);
        guardarEnStorage(STORAGE_KEYS.refreshToken, refreshToken);

        // Guardar usuario
        guardarEnStorage(STORAGE_KEYS.usuario, JSON.stringify(usuario));

        // Actualizar estado
        set({
          usuario,
          accessToken,
          refreshToken,
          hidratado: true,
          cargando: false,
        });
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Logout (limpiar todo)
      // -----------------------------------------------------------------------
      logout: (razon: RazonLogoutScanYA = 'manual') => {
        // Limpiar localStorage de autenticación
        limpiarStorageAuth();

        // Resetear estado (pero mantener recordatorios offline)
        set({
          usuario: null,
          accessToken: null,
          refreshToken: null,
          turnoActivo: null,
          hidratado: true,
          cargando: false,
        });

        // Si es logout por sesión expirada, redirigir al login
        if (razon === 'sesion_expirada') {
          window.location.href = '/scanya/login';
        }
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Hidratar auth desde localStorage
      // -----------------------------------------------------------------------
      hidratarAuth: async () => {
        try {
          // Obtener datos de localStorage
          const accessToken = obtenerDeStorage(STORAGE_KEYS.accessToken);
          const refreshToken = obtenerDeStorage(STORAGE_KEYS.refreshToken);
          const usuarioStr = obtenerDeStorage(STORAGE_KEYS.usuario);
          const turnoStr = obtenerDeStorage(STORAGE_KEYS.turnoActivo);

          // Si hay tokens y usuario, hidratar
          if (accessToken && refreshToken && usuarioStr) {
            try {
              const usuario = JSON.parse(usuarioStr);
              const turno = turnoStr ? JSON.parse(turnoStr) : null;

              set({
                usuario,
                accessToken,
                refreshToken,
                turnoActivo: turno,
                hidratado: true,
                cargando: false,
              });
              return;
            } catch (parseError) {
              console.error('Error parseando datos de localStorage:', parseError);
              limpiarStorageAuth();
            }
          }

          // Si no hay datos, marcar como hidratado sin autenticar
          set({
            usuario: null,
            accessToken: null,
            refreshToken: null,
            turnoActivo: null,
            hidratado: true,
            cargando: false,
          });
        } catch (error) {
          console.error('Error hidratando auth ScanYA:', error);
          set({
            usuario: null,
            accessToken: null,
            refreshToken: null,
            turnoActivo: null,
            hidratado: true,
            cargando: false,
          });
        }
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Guardar turno activo
      // -----------------------------------------------------------------------
      setTurnoActivo: (turno: TurnoScanYA | null) => {
        if (turno) {
          guardarEnStorage(STORAGE_KEYS.turnoActivo, JSON.stringify(turno));
        } else {
          eliminarDeStorage(STORAGE_KEYS.turnoActivo);
        }

        set({ turnoActivo: turno });
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Guardar/eliminar email recordado
      // -----------------------------------------------------------------------
      setEmailRecordado: (email: string | null) => {
        if (email) {
          guardarEnStorage(`${STORAGE_PREFIX}email_recordado`, email);
        } else {
          eliminarDeStorage(`${STORAGE_PREFIX}email_recordado`);
        }

        set({ emailRecordado: email });
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Agregar recordatorio offline
      // -----------------------------------------------------------------------
      agregarRecordatorioOffline: (datos) => {

        const nuevoRecordatorio: RecordatorioOffline = {
          ...datos,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          estado: 'pendiente',
          createdAt: new Date().toISOString(),
          intentosSincronizacion: 0,
        };

        set((state) => {
          const nuevosRecordatorios = [...state.recordatoriosOffline, nuevoRecordatorio];
          return { recordatoriosOffline: nuevosRecordatorios };
        });

        return nuevoRecordatorio;
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Eliminar recordatorio offline
      // -----------------------------------------------------------------------
      eliminarRecordatorioOffline: (id: string) => {
        set((state) => ({
          recordatoriosOffline: state.recordatoriosOffline.filter(r => r.id !== id),
        }));
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Limpiar todos los recordatorios
      // -----------------------------------------------------------------------
      limpiarRecordatoriosOffline: () => {
        set({ recordatoriosOffline: [] });
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Sincronizar recordatorios con el backend
      // -----------------------------------------------------------------------
      sincronizarRecordatorios: async () => {
        const state = get();

        // Si ya está sincronizando, no hacer nada
        if (state.sincronizando) {
          return;
        }

        // Si no hay recordatorios, no hacer nada
        const recordatoriosPendientes = state.recordatoriosOffline.filter(
          r => r.intentosSincronizacion < MAX_INTENTOS_SINCRONIZACION
        );

        if (recordatoriosPendientes.length === 0) {
          return;
        }

        set({ sincronizando: true });

        let exitosos = 0;
        let fallidos = 0;

        for (const recordatorio of recordatoriosPendientes) {
          try {
            // Preparar datos para el backend
            const datos: DatosCrearRecordatorio = {
              telefonoOAlias: recordatorio.telefonoOAlias,
              monto: recordatorio.monto,
            };

            // Solo enviar campos con valor > 0
            if (recordatorio.montoEfectivo > 0) {
              datos.montoEfectivo = recordatorio.montoEfectivo;
            }
            if (recordatorio.montoTarjeta > 0) {
              datos.montoTarjeta = recordatorio.montoTarjeta;
            }
            if (recordatorio.montoTransferencia > 0) {
              datos.montoTransferencia = recordatorio.montoTransferencia;
            }
            if (recordatorio.nota) {
              datos.nota = recordatorio.nota;
            }

            // Enviar al backend
            await crearRecordatorio(datos);

            // Si fue exitoso, eliminar de la lista
            get().eliminarRecordatorioOffline(recordatorio.id);
            exitosos++;

            // Pausa breve entre peticiones (evitar saturar el servidor)
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            console.error('Error sincronizando recordatorio:', recordatorio.id, error);

            // Marcar intento fallido
            get().marcarIntentoFallido(
              recordatorio.id,
              error instanceof Error ? error.message : 'Error desconocido'
            );
            fallidos++;
          }
        }

        set({ sincronizando: false });

        // Notificar resultado
        if (exitosos > 0 && fallidos === 0) {
          notificar.exito(`¡Tienes ${exitosos} ${exitosos === 1 ? 'venta' : 'ventas'} por procesar!`);

        } else if (exitosos > 0 && fallidos > 0) {
          notificar.advertencia(`¡Completa tus ${fallidos} recordatorios!`);

        } else if (fallidos > 0) {
          notificar.error(`${fallidos} recordatorios esperando. ¡Procésalos!`);
        }
      },

      // -----------------------------------------------------------------------
      // ACCIÓN: Marcar intento de sincronización fallido
      // -----------------------------------------------------------------------
      marcarIntentoFallido: (id: string, error: string) => {
        set((state) => ({
          recordatoriosOffline: state.recordatoriosOffline.map(r =>
            r.id === id
              ? {
                ...r,
                intentosSincronizacion: r.intentosSincronizacion + 1,
                ultimoError: error,
              }
              : r
          ),
        }));
      },
    }),
    {
      name: 'scanya-storage',
      partialize: (state) => ({
        recordatoriosOffline: state.recordatoriosOffline,
        emailRecordado: state.emailRecordado,
      }),
      skipHydration: false,
    }
  )
);

// =============================================================================
// SELECTORES (Computed Properties)
// =============================================================================

/**
 * Selector: Usuario está autenticado
 */
export const selectIsAuthenticated = (state: ScanYAState): boolean => {
  return !!state.usuario && !!state.accessToken;
};

/**
 * Selector: Usuario tiene permiso para otorgar puntos
 */
export const selectTienePermisoOtorgarPuntos = (state: ScanYAState): boolean => {
  if (!state.usuario) return false;

  // Dueños y gerentes siempre pueden
  if (state.usuario.tipo === 'dueno' || state.usuario.tipo === 'gerente') {
    return true;
  }

  // Empleados depende de sus permisos
  return state.usuario.permisos?.registrarVentas ?? false;
};

/**
 * Selector: Usuario tiene permiso para validar cupones
 */
export const selectTienePermisoValidarCupones = (state: ScanYAState): boolean => {
  if (!state.usuario) return false;

  // Dueños y gerentes siempre pueden
  if (state.usuario.tipo === 'dueno' || state.usuario.tipo === 'gerente') {
    return true;
  }

  // Empleados depende de sus permisos
  return state.usuario.permisos?.procesarCanjes ?? false;
};

/**
 * Selector: Contador de recordatorios offline (excluyendo los que fallaron 3+ veces)
 */
export const selectContadorRecordatorios = (state: ScanYAState): number => {
  return state.recordatoriosOffline.filter(
    r => r.intentosSincronizacion < MAX_INTENTOS_SINCRONIZACION
  ).length;
};

// =============================================================================
// HELPER PARA OBTENER PERMISOS
// =============================================================================

/**
 * Helper para verificar si el usuario tiene un permiso específico
 */
export function tienePermiso(permiso: keyof NonNullable<UsuarioScanYA['permisos']>): boolean {
  const state = useScanYAStore.getState();

  if (!state.usuario) return false;

  // Dueños y gerentes tienen todos los permisos
  if (state.usuario.tipo === 'dueno' || state.usuario.tipo === 'gerente') {
    return true;
  }

  // Empleados depende de sus permisos
  return state.usuario.permisos?.[permiso] ?? false;
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default useScanYAStore;