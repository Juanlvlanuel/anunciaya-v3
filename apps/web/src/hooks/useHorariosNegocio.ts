/**
 * ============================================================================
 * HOOK: useHorariosNegocio
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useHorariosNegocio.ts
 * 
 * PROPÓSITO:
 * Hook para cargar horarios de una sucursal bajo demanda (lazy load)
 * 
 * USO:
 * ```tsx
 * const { horarios, loading, fetchHorarios, reset } = useHorariosNegocio();
 * 
 * const handleVerHorarios = async () => {
 *   await fetchHorarios(sucursalId);
 *   setModalAbierto(true);
 * };
 * ```
 */

import { useState } from 'react';
import { api } from '../services/api';
import type { Horario } from '../components/negocios/ModalHorarios';

interface UseHorariosNegocioResult {
  horarios: Horario[] | null;
  loading: boolean;
  error: string | null;
  fetchHorarios: (sucursalId: string) => Promise<Horario[] | null>;
  reset: () => void;
}

export function useHorariosNegocio(): UseHorariosNegocioResult {
  const [horarios, setHorarios] = useState<Horario[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHorarios = async (sucursalId: string): Promise<Horario[] | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/negocios/sucursal/${sucursalId}/horarios`);
      const data = response.data.data as Horario[];
      setHorarios(data);
      return data;
    } catch (err) {
      console.error('Error al cargar horarios:', err);
      setError('Error al cargar horarios');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setHorarios(null);
    setError(null);
  };

  return { horarios, loading, error, fetchHorarios, reset };
}

export default useHorariosNegocio;