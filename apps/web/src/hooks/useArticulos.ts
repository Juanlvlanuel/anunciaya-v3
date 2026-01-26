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

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ===========================================================================
  // CARGAR ARTÍCULOS
  // ===========================================================================

  const cargarArticulos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const respuesta = await obtenerArticulos();

      if (respuesta.success && respuesta.data) {
        setArticulos(respuesta.data);
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
  }, []);

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
        // 4. Recargar artículos desde el servidor para obtener datos completos
        await cargarArticulos();

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
  }, [cargarArticulos]);

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
    [articulos]
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
    [articulos, cargarArticulos]
  );

  // ===========================================================================
  // DUPLICAR ARTÍCULO A OTRAS SUCURSALES
  // ===========================================================================

  const duplicar = useCallback(
    async (id: string, datos: DuplicarArticuloInput): Promise<boolean> => {
      const tempId = `temp-${Date.now()}`;

      try {
        // 1. Obtener artículo original para copia optimista
        const articuloOriginal = articulos.find((art) => art.id === id);

        // 2. Actualización optimista (crear copia temporal)
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

        // 3. Llamada al backend
        const respuesta = await duplicarArticulo(id, datos);

        if (respuesta.success && respuesta.data && respuesta.data.length > 0) {
          // 4. Reemplazar ID temporal con ID real (sin recargar)
          const nuevoId = respuesta.data[0].id;
          setArticulos((prev) =>
            prev.map((art) =>
              art.id === tempId
                ? { ...art, id: nuevoId }
                : art
            )
          );
          return true;
        }
        else {
          throw new Error(respuesta.message || 'Error al duplicar artículo');
        }
      } catch (err) {
        // 5. Revertir cambio optimista
        setArticulos((prev) => prev.filter((art) => art.id !== tempId));

        const mensaje = err instanceof Error ? err.message : 'Error al duplicar artículo';
        notificar.error(mensaje);
        return false;
      }
    },
    [articulos]
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