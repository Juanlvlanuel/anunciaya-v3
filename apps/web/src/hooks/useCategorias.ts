/**
 * ============================================================================
 * HOOK: useCategorias
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useCategorias.ts
 * 
 * PROPÓSITO:
 * Cargar las categorías de negocios desde el backend
 * 
 * CARACTERÍSTICAS:
 * - Fetch automático al montar
 * - Cache simple (no recarga si ya tiene datos)
 * - Maneja loading y error
 * 
 * USO:
 * ```tsx
 * const { categorias, loading, error } = useCategorias();
 * ```
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';

// =============================================================================
// TIPOS
// =============================================================================

export interface Categoria {
  id: number;
  nombre: string;
  icono: string;
  orden: number;
}

interface UseCategorias {
  categorias: Categoria[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useCategorias(): UseCategorias {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategorias = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get<{ success: boolean; data: Categoria[] }>(
        '/categorias'
      );

      if (response.data.success) {
        setCategorias(response.data.data);
      } else {
        throw new Error('Error al obtener categorías');
      }
    } catch (err: any) {
      console.error('Error al cargar categorías:', err);
      setError(err.message || 'Error al cargar categorías');
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  return {
    categorias,
    loading,
    error,
    refetch: fetchCategorias,
  };
}

export default useCategorias;