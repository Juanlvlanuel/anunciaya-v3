/**
 * ============================================================================
 * HOOK: useOfertas
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useOfertas.ts
 * 
 * PROPÓSITO:
 * Hook personalizado para gestionar el estado y operaciones de ofertas
 * Implementa actualizaciones optimistas para UX instantánea
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 */

import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useOfertasStore } from '../stores/useOfertasStore';
import {
  obtenerOfertas,
  crearOferta,
  actualizarOferta,
  eliminarOferta,
  duplicarOferta,
} from '../services/ofertasService';
import { notificar } from '../utils/notificaciones';
import type {
  Oferta,
  CrearOfertaInput,
  ActualizarOfertaInput,
  DuplicarOfertaInput,
} from '../types/ofertas';

// =============================================================================
// TIPOS
// =============================================================================

interface UseOfertasReturn {
  ofertas: Oferta[];
  loading: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  crear: (datos: CrearOfertaInput) => Promise<boolean>;
  actualizar: (id: string, datos: ActualizarOfertaInput) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  duplicar: (id: string, datos: DuplicarOfertaInput) => Promise<boolean>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useOfertas(): UseOfertasReturn {
  const { usuario, hidratado } = useAuthStore();
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [loading, setLoading] = useState(false); // ✅ false para evitar spinner inicial
  const [error, setError] = useState<string | null>(null);

  // Store de caché
  const {
    getOfertas,
    setOfertas: setOfertasCache,
    invalidarCache,
  } = useOfertasStore();

  // Obtener sucursalId para caché
  const sucursalId = usuario?.sucursalActiva || usuario?.sucursalAsignada || '';

  // ✅ Cargar caché ANTES del primer paint (elimina flash)
  useLayoutEffect(() => {
    if (!sucursalId) return;
    
    try {
      const cache = getOfertas(sucursalId);
      if (cache && cache.length > 0) {
        console.log('✅ [useOfertas] Inicializando con caché (pre-paint)');
        setOfertas(cache);
      }
    } catch (err) {
      // Si falla, continuar sin caché
      console.warn('[useOfertas] Error al leer caché:', err);
    }
  }, [sucursalId, getOfertas]);

  // ===========================================================================
  // CARGAR OFERTAS (CON CACHÉ)
  // ===========================================================================

  const cargarOfertas = useCallback(async (forzarRecarga = false) => {
    if (!sucursalId) {
      console.warn('[useOfertas] No hay sucursalId disponible para caché');
      return;
    }

    // ✅ PASO 1: Verificar caché primero (si no se forzó recarga)
    if (!forzarRecarga) {
      const ofertasCache = getOfertas(sucursalId);
      
      if (ofertasCache) {
        console.log('✅ [useOfertas] Usando caché - Datos instantáneos');
        setOfertas(ofertasCache);
        setLoading(false);
        return; // ← SALIR SIN HACER FETCH
      }
    }

    // ✅ PASO 2: No hay caché válida → Fetch desde backend
    console.log('🔄 [useOfertas] Cargando desde backend...');
    try {
      setLoading(true);
      setError(null);

      const respuesta = await obtenerOfertas();

      if (respuesta.success && respuesta.data) {
        // Guardar en caché
        setOfertasCache(sucursalId, respuesta.data);
        
        // Actualizar estado local
        setOfertas(respuesta.data);
        
        console.log('✅ [useOfertas] Datos cargados y guardados en caché');
      } else {
        throw new Error(respuesta.message || 'Error al cargar ofertas');
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      setError(mensaje);
      notificar.error(mensaje);
    } finally {
      setLoading(false);
    }
  }, [sucursalId, getOfertas, setOfertasCache]);

  // Cargar al montar SOLO si está hidratado y tiene sucursalActiva
  useEffect(() => {
    // Esperar a que el store esté hidratado
    if (!hidratado) {
      return;
    }

    // Si está en modo comercial, esperar a que tenga sucursalActiva
    if (usuario?.modoActivo === 'comercial' && !usuario.sucursalActiva && !usuario.sucursalAsignada) {
      return;
    }

    cargarOfertas();
  }, [cargarOfertas, hidratado, usuario?.sucursalActiva, usuario?.sucursalAsignada, usuario?.modoActivo]);

  // ===========================================================================
  // CREAR OFERTA (OPTIMISTA)
  // ===========================================================================

  const crear = useCallback(async (datos: CrearOfertaInput): Promise<boolean> => {
    try {
      // 1. Crear oferta temporal para UI optimista
      const ofertaTemporal: Oferta = {
        id: `temp-${Date.now()}`,
        negocioId: '',
        sucursalId: '',
        articuloId: datos.articuloId || null,
        titulo: datos.titulo,
        descripcion: datos.descripcion || null,
        tipo: datos.tipo,
        valor: datos.valor?.toString() || null,
        compraMinima: (datos.compraMinima || 0).toString(),
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        limiteUsos: datos.limiteUsos || null,
        usosActuales: 0,
        activo: datos.activo ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalVistas: 0,
        totalShares: 0,
        totalClicks: 0,
        imagen: datos.imagen || null,
        estado: 'activa',
      };

      // 2. Actualización optimista
      setOfertas((prev) => [ofertaTemporal, ...prev]);

      // 3. Llamada al backend
      const respuesta = await crearOferta(datos);

      if (respuesta.success && respuesta.data) {
        // 4. Invalidar caché y recargar ofertas desde el servidor
        invalidarCache(sucursalId);
        await cargarOfertas(true);

        notificar.exito('Oferta creada correctamente');
        return true;
      } else {
        throw new Error(respuesta.message || 'Error al crear oferta');
      }
    } catch (err) {
      // 5. Revertir cambio optimista
      setOfertas((prev) => prev.filter((of) => !of.id.startsWith('temp-')));

      const mensaje = err instanceof Error ? err.message : 'Error al crear oferta';
      notificar.error(mensaje);
      return false;
    }
  }, [cargarOfertas, sucursalId, invalidarCache]);

  // ===========================================================================
  // ACTUALIZAR OFERTA (OPTIMISTA)
  // ===========================================================================

  const actualizar = useCallback(
    async (id: string, datos: ActualizarOfertaInput): Promise<boolean> => {
      // Guardar estado anterior para posible reversión
      const ofertaAnterior = ofertas.find((of) => of.id === id);

      if (!ofertaAnterior) {
        notificar.error('Oferta no encontrada');
        return false;
      }

      // Actualización optimista inmediata
      setOfertas((prev) =>
        prev.map((of) =>
          of.id === id
            ? {
              ...of,
              ...datos,
              valor: datos.valor !== undefined
                ? (datos.valor?.toString() || null)
                : of.valor,
              compraMinima: datos.compraMinima !== undefined
                ? datos.compraMinima.toString()
                : of.compraMinima,
              updatedAt: new Date().toISOString(),
            }
            : of
        )
      );

      try {
        // Llamada al backend
        const respuesta = await actualizarOferta(id, datos);

        if (!respuesta.success) {
          throw new Error(respuesta.message || 'Error al actualizar oferta');
        }

        // Invalidar caché para reflejar actualización
        invalidarCache(sucursalId);

        return true;
      } catch (err) {
        // Revertir cambio optimista
        setOfertas((prev) =>
          prev.map((of) =>
            of.id === id ? ofertaAnterior : of
          )
        );

        const mensaje = err instanceof Error ? err.message : 'Error al actualizar oferta';
        notificar.error(mensaje);
        return false;
      }
    },
    [ofertas, sucursalId, invalidarCache]
  );

  // ===========================================================================
  // ELIMINAR OFERTA (OPTIMISTA)
  // ===========================================================================

  const eliminar = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        // 1. Guardar estado anterior
        const ofertaAnterior = ofertas.find((of) => of.id === id);

        if (!ofertaAnterior) {
          throw new Error('Oferta no encontrada');
        }

        // 2. Actualización optimista
        setOfertas((prev) => prev.filter((of) => of.id !== id));

        // 3. Llamada al backend
        const respuesta = await eliminarOferta(id);

        if (respuesta.success) {
          // Invalidar caché para reflejar eliminación
          invalidarCache(sucursalId);
          
          notificar.exito('Oferta eliminada correctamente');
          return true;
        } else {
          throw new Error(respuesta.message || 'Error al eliminar oferta');
        }
      } catch (err) {
        // 4. Revertir cambio optimista
        await cargarOfertas();

        const mensaje = err instanceof Error ? err.message : 'Error al eliminar oferta';
        notificar.error(mensaje);
        return false;
      }
    },
    [ofertas, cargarOfertas, sucursalId, invalidarCache]
  );

  // ===========================================================================
  // DUPLICAR OFERTA A OTRAS SUCURSALES
  // ===========================================================================

  const duplicar = useCallback(
    async (id: string, datos: DuplicarOfertaInput): Promise<boolean> => {
      const tempId = `temp-${Date.now()}`;

      try {
        // 1. Obtener oferta original para copia optimista
        const ofertaOriginal = ofertas.find((of) => of.id === id);

        // 2. Actualización optimista (crear copia temporal)
        if (ofertaOriginal) {
          const copiaTemporal: Oferta = {
            ...ofertaOriginal,
            id: tempId,
            usosActuales: 0,
            totalVistas: 0,
            totalShares: 0,
            totalClicks: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setOfertas((prev) => [copiaTemporal, ...prev]);
        }

        // 3. Llamada al backend
        const respuesta = await duplicarOferta(id, datos);

        if (respuesta.success && respuesta.data && respuesta.data.length > 0) {
          // 4. Reemplazar ID temporal con ID real (sin recargar)
          const nuevoId = respuesta.data[0].id;
          setOfertas((prev) =>
            prev.map((of) =>
              of.id === tempId
                ? { ...of, id: nuevoId }
                : of
            )
          );
          
          // Invalidar caché de sucursal actual
          invalidarCache(sucursalId);
          
          notificar.exito(`Oferta duplicada a ${respuesta.data.length} sucursal(es)`);
          return true;
        } else {
          throw new Error(respuesta.message || 'Error al duplicar oferta');
        }
      } catch (err) {
        // 5. Revertir cambio optimista
        setOfertas((prev) => prev.filter((of) => of.id !== tempId));

        const mensaje = err instanceof Error ? err.message : 'Error al duplicar oferta';
        notificar.error(mensaje);
        return false;
      }
    },
    [ofertas, sucursalId, invalidarCache]
  );

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    ofertas,
    loading,
    error,
    recargar: cargarOfertas,
    crear,
    actualizar,
    eliminar,
    duplicar,
  };
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default useOfertas;