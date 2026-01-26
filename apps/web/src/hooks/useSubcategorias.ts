/**
 * ============================================================================
 * HOOK: useSubcategorias
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useSubcategorias.ts
 * 
 * PROPÓSITO:
 * Cargar subcategorías de una categoría específica desde el backend
 * 
 * CARACTERÍSTICAS:
 * - Fetch automático cuando cambia categoriaId
 * - Se limpia cuando categoriaId es null
 * - Maneja loading y error
 * 
 * USO:
 * ```tsx
 * const { subcategorias, loading } = useSubcategorias(categoriaId);
 * ```
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';

// =============================================================================
// TIPOS
// =============================================================================

export interface Subcategoria {
  id: number;
  nombre: string;
  icono: string;
  orden: number;
}

interface UseSubcategorias {
  subcategorias: Subcategoria[];
  loading: boolean;
  error: string | null;
}

// =============================================================================
// HOOK
// =============================================================================

export function useSubcategorias(categoriaId: number | null): UseSubcategorias {
  const [subcategorias, setSubcategorias] = useState<Subcategoria[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay categoría seleccionada, limpiar subcategorías
    if (categoriaId === null) {
      setSubcategorias([]);
      setError(null);
      return;
    }

    const fetchSubcategorias = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get<{ success: boolean; data: Subcategoria[] }>(
          `/categorias/${categoriaId}/subcategorias`
        );

        if (response.data.success) {
          setSubcategorias(response.data.data);
        } else {
          throw new Error('Error al obtener subcategorías');
        }
      } catch (err: any) {
        console.error('Error al cargar subcategorías:', err);
        
        // Si es 404, simplemente no hay subcategorías (no es error)
        if (err.response?.status === 404) {
          setSubcategorias([]);
          setError(null);
        } else {
          setError(err.message || 'Error al cargar subcategorías');
          setSubcategorias([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSubcategorias();
  }, [categoriaId]);

  return {
    subcategorias,
    loading,
    error,
  };
}

export default useSubcategorias;