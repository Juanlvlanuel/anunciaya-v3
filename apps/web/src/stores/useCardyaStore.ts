/**
 * useCardyaStore.ts
 * =================
 * Store de Zustand para el módulo CardYA (Sistema de Lealtad para Clientes).
 *
 * UBICACIÓN: apps/web/src/stores/useCardyaStore.ts
 *
 * RESPONSABILIDADES:
 *   - Gestionar billeteras de puntos del usuario
 *   - Cargar y filtrar recompensas disponibles
 *   - Gestionar vouchers activos
 *   - Consultar historial de compras y canjes
 *
 * MODO DE USUARIO:
 *   - CardYA solo funciona en MODO PERSONAL
 *   - Si el usuario está en modo comercial, debe redirigirse
 *
 * OPTIMISTIC UI:
 *   - canjearRecompensa: actualiza puntos inmediatamente, rollback si falla
 *   - cancelarVoucher: elimina del array inmediatamente, rollback si falla
 */

import { create } from 'zustand';
import * as cardyaService from '../services/cardyaService';
import { notificar } from '../utils/notificaciones';
import type {
  BilleteraNegocio,
  DetalleNegocioBilletera,
  RecompensaDisponible,
  FiltrosRecompensas,
  CanjearRecompensaInput,
  Voucher,
  FiltrosVouchers,
  HistorialCompra,
  FiltrosHistorialCompras,
  HistorialCanje,
  FiltrosHistorialCanjes,
  TabCardYA,
} from '../types/cardya';

// =============================================================================
// TIPOS
// =============================================================================

interface CardyaState {
  // Tab activo
  tabActivo: TabCardYA;

  // Datos
  billeteras: BilleteraNegocio[];
  detalleNegocio: DetalleNegocioBilletera | null;
  recompensas: RecompensaDisponible[];
  vouchers: Voucher[];
  historialCompras: HistorialCompra[];
  historialCanjes: HistorialCanje[];

  // Filtros actuales
  filtrosRecompensas: FiltrosRecompensas;
  filtrosVouchers: FiltrosVouchers;
  filtrosHistorialCompras: FiltrosHistorialCompras;
  filtrosHistorialCanjes: FiltrosHistorialCanjes;

  // Estados de carga
  cargandoBilleteras: boolean;
  cargandoDetalleNegocio: boolean;
  cargandoRecompensas: boolean;
  cargandoVouchers: boolean;
  cargandoHistorialCompras: boolean;
  cargandoHistorialCanjes: boolean;
  canjeandoRecompensa: boolean;

  // Error global
  error: string | null;

  // Acciones - Navegación
  setTabActivo: (tab: TabCardYA) => void;

  // Acciones - Billeteras
  cargarBilleteras: () => Promise<void>;
  cargarDetalleNegocio: (negocioId: string) => Promise<void>;

  // Acciones - Recompensas
  cargarRecompensas: (filtros?: FiltrosRecompensas) => Promise<void>;
  canjearRecompensa: (datos: CanjearRecompensaInput) => Promise<Voucher | null>;

  // Acciones - Vouchers
  cargarVouchers: (filtros?: FiltrosVouchers) => Promise<void>;
  cancelarVoucher: (id: string) => Promise<boolean>;

  // Acciones - Historial
  cargarHistorialCompras: (filtros?: FiltrosHistorialCompras) => Promise<void>;
  cargarHistorialCanjes: (filtros?: FiltrosHistorialCanjes) => Promise<void>;

  // Carga inicial
  cargarTodo: () => Promise<void>;

  // Reset
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useCardyaStore = create<CardyaState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  tabActivo: 'billeteras',
  billeteras: [],
  detalleNegocio: null,
  recompensas: [],
  vouchers: [],
  historialCompras: [],
  historialCanjes: [],
  filtrosRecompensas: {},
  filtrosVouchers: {},
  filtrosHistorialCompras: { limit: 20, offset: 0 },
  filtrosHistorialCanjes: { limit: 20, offset: 0 },
  cargandoBilleteras: false,
  cargandoDetalleNegocio: false,
  cargandoRecompensas: false,
  cargandoVouchers: false,
  cargandoHistorialCompras: false,
  cargandoHistorialCanjes: false,
  canjeandoRecompensa: false,
  error: null,

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar tab activo
  // ---------------------------------------------------------------------------
  setTabActivo: (tab: TabCardYA) => {
    set({ tabActivo: tab });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar billeteras
  // ---------------------------------------------------------------------------
  cargarBilleteras: async () => {
    const { billeteras } = get();
    const esCargaInicial = billeteras.length === 0;

    set({ cargandoBilleteras: esCargaInicial, error: null });

    try {
      const respuesta = await cardyaService.getMisPuntos();
      if (respuesta.success && respuesta.data) {
        set({ billeteras: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando billeteras:', error);
      notificar.error('No se pudieron cargar tus puntos');
      set({ error: 'Error al cargar tus puntos' });
    } finally {
      set({ cargandoBilleteras: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar detalle de un negocio
  // ---------------------------------------------------------------------------
  cargarDetalleNegocio: async (negocioId: string) => {
    set({ cargandoDetalleNegocio: true, error: null });

    try {
      const respuesta = await cardyaService.getDetalleNegocio(negocioId);
      if (respuesta.success && respuesta.data) {
        set({ detalleNegocio: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando detalle del negocio:', error);
      notificar.error('No se pudo cargar la información del negocio');
      set({ error: 'Error al cargar información del negocio' });
    } finally {
      set({ cargandoDetalleNegocio: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar recompensas
  // ---------------------------------------------------------------------------
  cargarRecompensas: async (filtros?: FiltrosRecompensas) => {
    const { recompensas } = get();
    const esCargaInicial = recompensas.length === 0;

    // Guardar filtros actuales
    if (filtros) {
      set({ filtrosRecompensas: filtros });
    }

    set({ cargandoRecompensas: esCargaInicial, error: null });

    try {
      const respuesta = await cardyaService.getRecompensas(filtros || get().filtrosRecompensas);
      if (respuesta.success && respuesta.data) {
        set({ recompensas: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando recompensas:', error);
      notificar.error('No se pudieron cargar las recompensas');
      set({ error: 'Error al cargar recompensas' });
    } finally {
      set({ cargandoRecompensas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Canjear recompensa (optimista)
  // ---------------------------------------------------------------------------
  canjearRecompensa: async (datos: CanjearRecompensaInput) => {
    const { billeteras, recompensas } = get();

    // Encontrar la recompensa
    const recompensa = recompensas.find((r) => r.id === datos.recompensaId);
    if (!recompensa) {
      console.error('Recompensa no encontrada');
      return null;
    }

    // Guardar estado anterior para rollback
    const billeterasAnterior = [...billeteras];
    const recompensasAnterior = [...recompensas];

    // Actualización optimista: descontar puntos de la billetera
    const billeterasOptimistas = billeteras.map((b) => {
      if (b.negocioId === recompensa.negocioId) {
        const nuevosPuntos = b.puntosDisponibles - recompensa.puntosRequeridos;
        return {
          ...b,
          puntosDisponibles: nuevosPuntos,
        };
      }
      return b;
    });

    // Actualización optimista: marcar recompensa como no disponible si ahora faltan puntos
    const recompensasOptimistas = recompensas.map((r) => {
      if (r.id === datos.recompensaId) {
        const billeteraActualizada = billeterasOptimistas.find(
          (b) => b.negocioId === r.negocioId
        );
        const tienesPuntosSuficientes = billeteraActualizada
          ? billeteraActualizada.puntosDisponibles >= r.puntosRequeridos
          : false;

        return {
          ...r,
          tienesPuntosSuficientes,
          puntosFaltantes: tienesPuntosSuficientes
            ? 0
            : r.puntosRequeridos - (billeteraActualizada?.puntosDisponibles || 0),
        };
      }
      return r;
    });

    set({
      billeteras: billeterasOptimistas,
      recompensas: recompensasOptimistas,
      canjeandoRecompensa: true,
    });

    try {
      const respuesta = await cardyaService.canjearRecompensa(datos);
      if (respuesta.success && respuesta.data) {
        // Notificar éxito
        notificar.exito('¡Recompensa canjeada exitosamente!');
        
        // Recargar vouchers para mostrar el nuevo
        get().cargarVouchers();
        return respuesta.data;
      } else {
        // Rollback
        notificar.error(respuesta.message || 'No se pudo canjear la recompensa');
        set({
          billeteras: billeterasAnterior,
          recompensas: recompensasAnterior,
        });
        return null;
      }
    } catch (error) {
      console.error('Error canjeando recompensa:', error);
      notificar.error('Ocurrió un error al canjear la recompensa');
      // Rollback
      set({
        billeteras: billeterasAnterior,
        recompensas: recompensasAnterior,
      });
      return null;
    } finally {
      set({ canjeandoRecompensa: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar vouchers
  // ---------------------------------------------------------------------------
  cargarVouchers: async (filtros?: FiltrosVouchers) => {
    const { vouchers } = get();
    const esCargaInicial = vouchers.length === 0;

    // Guardar filtros actuales
    if (filtros) {
      set({ filtrosVouchers: filtros });
    }

    set({ cargandoVouchers: esCargaInicial, error: null });

    try {
      const respuesta = await cardyaService.getMisVouchers(filtros || get().filtrosVouchers);
      if (respuesta.success && respuesta.data) {
        set({ vouchers: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando vouchers:', error);
      notificar.error('No se pudieron cargar tus vouchers');
      set({ error: 'Error al cargar tus vouchers' });
    } finally {
      set({ cargandoVouchers: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cancelar voucher (optimista)
  // ---------------------------------------------------------------------------
  cancelarVoucher: async (id: string) => {
    const { vouchers, billeteras } = get();

    // Encontrar el voucher
    const voucher = vouchers.find((v) => v.id === id);
    if (!voucher) {
      console.error('Voucher no encontrado');
      return false;
    }

    // Guardar estado anterior para rollback
    const vouchersAnterior = [...vouchers];
    const billeterasAnterior = [...billeteras];

    // Actualización optimista: marcar como cancelado
    const vouchersOptimistas = vouchers.map((v) =>
      v.id === id ? { ...v, estado: 'cancelado' as const } : v
    );

    // Actualización optimista: regresar puntos a la billetera
    const billeterasOptimistas = billeteras.map((b) => {
      if (b.negocioId === voucher.negocioId) {
        return {
          ...b,
          puntosDisponibles: b.puntosDisponibles + voucher.puntosUsados,
        };
      }
      return b;
    });

    set({ 
      vouchers: vouchersOptimistas,
      billeteras: billeterasOptimistas 
    });

    try {
      const respuesta = await cardyaService.cancelarVoucher(id);
      if (respuesta.success) {
        // Notificar éxito
        notificar.exito('Voucher cancelado. Tus puntos han sido devueltos');
        
        // Recargar recompensas para actualizar disponibilidad
        get().cargarRecompensas();
        return true;
      } else {
        // Rollback
        notificar.error(respuesta.message || 'No se pudo cancelar el voucher');
        set({ 
          vouchers: vouchersAnterior,
          billeteras: billeterasAnterior 
        });
        return false;
      }
    } catch (error) {
      console.error('Error cancelando voucher:', error);
      notificar.error('Ocurrió un error al cancelar el voucher');
      // Rollback
      set({ 
        vouchers: vouchersAnterior,
        billeteras: billeterasAnterior 
      });
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar historial de compras
  // ---------------------------------------------------------------------------
  cargarHistorialCompras: async (filtros?: FiltrosHistorialCompras) => {
    const { historialCompras } = get();
    const esCargaInicial = historialCompras.length === 0;

    // Guardar filtros actuales
    if (filtros) {
      set({ filtrosHistorialCompras: filtros });
    }

    set({ cargandoHistorialCompras: esCargaInicial, error: null });

    try {
      const respuesta = await cardyaService.getHistorialCompras(
        filtros || get().filtrosHistorialCompras
      );
      if (respuesta.success && respuesta.data) {
        set({ historialCompras: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando historial de compras:', error);
      notificar.error('No se pudo cargar el historial de compras');
      set({ error: 'Error al cargar historial' });
    } finally {
      set({ cargandoHistorialCompras: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar historial de canjes
  // ---------------------------------------------------------------------------
  cargarHistorialCanjes: async (filtros?: FiltrosHistorialCanjes) => {
    const { historialCanjes } = get();
    const esCargaInicial = historialCanjes.length === 0;

    // Guardar filtros actuales
    if (filtros) {
      set({ filtrosHistorialCanjes: filtros });
    }

    set({ cargandoHistorialCanjes: esCargaInicial, error: null });

    try {
      const respuesta = await cardyaService.getHistorialCanjes(
        filtros || get().filtrosHistorialCanjes
      );
      if (respuesta.success && respuesta.data) {
        set({ historialCanjes: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando historial de canjes:', error);
      notificar.error('No se pudo cargar el historial de canjes');
      set({ error: 'Error al cargar historial de canjes' });
    } finally {
      set({ cargandoHistorialCanjes: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Carga inicial (paralelo)
  // ---------------------------------------------------------------------------
  cargarTodo: async () => {
    await Promise.all([
      get().cargarBilleteras(),
      get().cargarRecompensas(),
      get().cargarVouchers(),
    ]);
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Reset
  // ---------------------------------------------------------------------------
  limpiar: () => {
    set({
      tabActivo: 'billeteras',
      billeteras: [],
      detalleNegocio: null,
      recompensas: [],
      vouchers: [],
      historialCompras: [],
      historialCanjes: [],
      filtrosRecompensas: {},
      filtrosVouchers: {},
      filtrosHistorialCompras: { limit: 20, offset: 0 },
      filtrosHistorialCanjes: { limit: 20, offset: 0 },
      cargandoBilleteras: false,
      cargandoDetalleNegocio: false,
      cargandoRecompensas: false,
      cargandoVouchers: false,
      cargandoHistorialCompras: false,
      cargandoHistorialCanjes: false,
      canjeandoRecompensa: false,
      error: null,
    });
  },
}));

// =============================================================================
// SELECTORES
// =============================================================================

export const selectBilleteras = (state: CardyaState) => state.billeteras;
export const selectRecompensas = (state: CardyaState) => state.recompensas;
export const selectVouchers = (state: CardyaState) => state.vouchers;
export const selectHistorialCompras = (state: CardyaState) => state.historialCompras;
export const selectHistorialCanjes = (state: CardyaState) => state.historialCanjes;
export const selectTabActivo = (state: CardyaState) => state.tabActivo;
export const selectCargandoCardYA = (state: CardyaState) =>
  state.cargandoBilleteras ||
  state.cargandoRecompensas ||
  state.cargandoVouchers ||
  state.cargandoHistorialCompras ||
  state.cargandoHistorialCanjes;