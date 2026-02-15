/**
 * ============================================================================
 * HOOK: useArticulos
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useArticulos.ts
 * 
 * PROPÓSITO:
 * Hook personalizado para gestionar el estado y operaciones de artículos
 * Implementa actualizaciones optimistas para UX instantánea
 * 
 * CREADO: Fase 5.4.1 - Catálogo CRUD Frontend
 */

import { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useArticulosStore } from '../stores/useArticulosStore';
import {
  obtenerArticulos,
  crearArticulo,
  actualizarArticulo,
  eliminarArticulo,
  duplicarArticulo,
} from '../services/articulosService';
import { notificar } from '../utils/notificaciones';
import type {
  Articulo,
  CrearArticuloInput,
  ActualizarArticuloInput,
  DuplicarArticuloInput,
} from '../types/articulos';

// =============================================================================
// TIPOS
// =============================================================================

interface UseArticulosReturn {
  articulos: Articulo[];
  loading: boolean;
  error: string | null;
  recargar: () => Promise<void>;
  crear: (datos: CrearArticuloInput) => Promise<boolean>;
  actualizar: (id: string, datos: ActualizarArticuloInput) => Promise<boolean>;
  eliminar: (id: string) => Promise<boolean>;
  duplicar: (id: string, datos: DuplicarArticuloInput) => Promise<boolean>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useArticulos(): UseArticulosReturn {
  const { usuario, hidratado } = useAuthStore();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(false); // ✅ false para evitar spinner inicial
  const [error, setError] = useState<string | null>(null);

  // Store de caché
  const {
    getArticulos,
    setArticulos: setArticulosCache,
    invalidarCache,
  } = useArticulosStore();

  // Obtener sucursalId para caché
  const sucursalId = usuario?.sucursalActiva || usuario?.sucursalAsignada || '';

  // ✅ Cargar caché ANTES del primer paint (elimina flash)
  useLayoutEffect(() => {
    if (!sucursalId) return;
    
    try {
      const cache = getArticulos(sucursalId);
      if (cache && cache.length > 0) {
        console.log('✅ [useArticulos] Inicializando con caché (pre-paint)');
        setArticulos(cache);
      }
    } catch (err) {
      // Si falla, continuar sin caché
      console.warn('[useArticulos] Error al leer caché:', err);
    }
  }, [sucursalId, getArticulos]);

  // ===========================================================================
  // CARGAR ARTÍCULOS (CON CACHÉ)
  // ===========================================================================

  const cargarArticulos = useCallback(async (forzarRecarga = false) => {
    if (!sucursalId) {
      console.warn('[useArticulos] No hay sucursalId disponible para caché');
      return;
    }

    // ✅ PASO 1: Verificar caché primero (si no se forzó recarga)
    if (!forzarRecarga) {
      const articulosCache = getArticulos(sucursalId);
      
      if (articulosCache) {
        console.log('✅ [useArticulos] Usando caché - Datos instantáneos');
        setArticulos(articulosCache);
        setLoading(false);
        return; // ← SALIR SIN HACER FETCH
      }
    }

    // ✅ PASO 2: No hay caché válida → Fetch desde backend
    console.log('🔄 [useArticulos] Cargando desde backend...');
    try {
      setLoading(true);
      setError(null);

      const respuesta = await obtenerArticulos();

      if (respuesta.success && respuesta.data) {
        // Guardar en caché
        setArticulosCache(sucursalId, respuesta.data);
        
        // Actualizar estado local
        setArticulos(respuesta.data);
        
        console.log('✅ [useArticulos] Datos cargados y guardados en caché');
      } else {
        throw new Error(respuesta.message || 'Error al cargar artículos');
      }
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error desconocido';
      setError(mensaje);
      notificar.error(mensaje);
    } finally {
      setLoading(false);
    }
  }, [sucursalId, getArticulos, setArticulosCache]);

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

    cargarArticulos();
  }, [cargarArticulos, hidratado, usuario?.sucursalActiva, usuario?.sucursalAsignada, usuario?.modoActivo]);

  // ===========================================================================
  // CREAR ARTÍCULO (OPTIMISTA)
  // ===========================================================================

  const crear = useCallback(async (datos: CrearArticuloInput): Promise<boolean> => {
    try {
      // 1. Crear artículo temporal para UI optimista
      const articuloTemporal: Articulo = {
        id: `temp-${Date.now()}`,
        negocioId: '',
        tipo: datos.tipo,
        nombre: datos.nombre,
        descripcion: datos.descripcion || null,
        categoria: datos.categoria || 'General',
        precioBase: datos.precioBase.toString(),
        precioDesde: datos.precioDesde ?? false,
        imagenPrincipal: datos.imagenPrincipal || null,
        disponible: datos.disponible ?? true,
        destacado: datos.destacado ?? false,
        orden: 0,
        totalVentas: 0,
        totalVistas: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 2. Actualización optimista
      setArticulos((prev) => [articuloTemporal, ...prev]);

      // 3. Llamada al backend
      const respuesta = await crearArticulo(datos);

      if (respuesta.success && respuesta.data) {
        // 4. Invalidar caché y recargar artículos desde el servidor
        invalidarCache(sucursalId);
        await cargarArticulos(true);

        notificar.exito('Artículo creado correctamente');
        return true;
      } else {
        throw new Error(respuesta.message || 'Error al crear artículo');
      }
    } catch (err) {
      // 5. Revertir cambio optimista
      setArticulos((prev) => prev.filter((art) => !art.id.startsWith('temp-')));

      const mensaje = err instanceof Error ? err.message : 'Error al crear artículo';
      notificar.error(mensaje);
      return false;
    }
  }, [cargarArticulos, sucursalId, invalidarCache]);

  // ===========================================================================
  // ACTUALIZAR ARTÍCULO (OPTIMISTA)
  // ===========================================================================

  const actualizar = useCallback(
    async (id: string, datos: ActualizarArticuloInput): Promise<boolean> => {
      // Guardar estado anterior para posible reversión
      const articuloAnterior = articulos.find((art) => art.id === id);

      if (!articuloAnterior) {
        notificar.error('Artículo no encontrado');
        return false;
      }

      // Actualización optimista inmediata
      setArticulos((prev) =>
        prev.map((art) =>
          art.id === id
            ? {
              ...art,
              ...datos,
              precioBase: datos.precioBase
                ? datos.precioBase.toString()
                : art.precioBase,
              updatedAt: new Date().toISOString(),
            }
            : art
        )
      );

      try {
        // Llamada al backend
        const respuesta = await actualizarArticulo(id, datos);

        if (!respuesta.success) {
          throw new Error(respuesta.message || 'Error al actualizar artículo');
        }

        // Invalidar caché para reflejar actualización
        invalidarCache(sucursalId);

        return true;
      } catch (err) {
        // Revertir cambio optimista
        setArticulos((prev) =>
          prev.map((art) =>
            art.id === id ? articuloAnterior : art
          )
        );

        const mensaje = err instanceof Error ? err.message : 'Error al actualizar artículo';
        notificar.error(mensaje);
        return false;
      }
    },
    [articulos, sucursalId, invalidarCache]
  );

  // ===========================================================================
  // ELIMINAR ARTÍCULO (OPTIMISTA)
  // ===========================================================================

  const eliminar = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        // 1. Guardar estado anterior
        const articuloAnterior = articulos.find((art) => art.id === id);

        if (!articuloAnterior) {
          throw new Error('Artículo no encontrado');
        }

        // 2. Actualización optimista
        setArticulos((prev) => prev.filter((art) => art.id !== id));

        // 3. Llamada al backend
        const respuesta = await eliminarArticulo(id);

        if (respuesta.success) {
          // Invalidar caché para reflejar eliminación
          invalidarCache(sucursalId);
          
          notificar.exito('Artículo eliminado correctamente');
          return true;
        } else {
          throw new Error(respuesta.message || 'Error al eliminar artículo');
        }
      } catch (err) {
        // 4. Revertir cambio optimista
        await cargarArticulos();

        const mensaje = err instanceof Error ? err.message : 'Error al eliminar artículo';
        notificar.error(mensaje);
        return false;
      }
    },
    [articulos, cargarArticulos, sucursalId, invalidarCache]
  );

  // ===========================================================================
  // DUPLICAR ARTÍCULO A OTRAS SUCURSALES
  // ===========================================================================

  const duplicar = useCallback(
    async (id: string, datos: DuplicarArticuloInput): Promise<boolean> => {
      // Verificar si la sucursal actual está en las sucursales destino
      const duplicaEnSucursalActual = datos.sucursalesIds.includes(sucursalId);
      const tempId = `temp-${Date.now()}`;

      try {
        // 1. Actualización optimista SOLO si duplica en la sucursal actual
        if (duplicaEnSucursalActual) {
          const articuloOriginal = articulos.find((art) => art.id === id);
          
          if (articuloOriginal) {
            const copiaTemporal: Articulo = {
              ...articuloOriginal,
              id: tempId,
              totalVentas: 0,
              totalVistas: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setArticulos((prev) => [copiaTemporal, ...prev]);
          }
        }

        // 2. Llamada al backend
        const respuesta = await duplicarArticulo(id, datos);

        if (respuesta.success && respuesta.data && respuesta.data.length > 0) {
          // 3. Si hicimos actualización optimista, reemplazar ID temporal con ID real
          if (duplicaEnSucursalActual) {
            const articuloDuplicadoEnActual = respuesta.data.find(
              (art) => art.sucursalId === sucursalId
            );
            
            if (articuloDuplicadoEnActual) {
              // Solo actualizar el ID - ya tenemos todos los demás campos de la copia original
              setArticulos((prev) =>
                prev.map((art) =>
                  art.id === tempId 
                    ? { ...art, id: articuloDuplicadoEnActual.id }
                    : art
                )
              );
            }
          }
          
          // Invalidar caché de TODAS las sucursales destino
          datos.sucursalesIds.forEach(id => invalidarCache(id));
          
          notificar.exito('Artículo duplicado');
          return true;
        } else {
          throw new Error(respuesta.message || 'Error al duplicar artículo');
        }
      } catch (err) {
        // 4. Revertir cambio optimista si lo hicimos
        if (duplicaEnSucursalActual) {
          setArticulos((prev) => prev.filter((art) => art.id !== tempId));
        }

        const mensaje = err instanceof Error ? err.message : 'Error al duplicar artículo';
        notificar.error(mensaje);
        return false;
      }
    },
    [articulos, sucursalId, invalidarCache]
  );

  // ===========================================================================
  // RETURN
  // ===========================================================================

  return {
    articulos,
    loading,
    error,
    recargar: cargarArticulos,
    crear,
    actualizar,
    eliminar,
    duplicar,
  };
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default useArticulos;