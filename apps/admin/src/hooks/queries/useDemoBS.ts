/**
 * useDemoBS.ts
 * ============
 * React Query del Demo de Business Studio: estado (¿existe copia? ¿hay maestro?) + mutaciones
 * abrir/reiniciar. Ver docs/arquitectura/Demo_Business_Studio.md.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { obtenerEstadoDemo, abrirDemo, reiniciarDemo } from '../../services/demoBSService';

const CLAVE_ESTADO = ['demo-bs', 'estado'] as const;

export function useEstadoDemo() {
    return useQuery({
        queryKey: CLAVE_ESTADO,
        queryFn: obtenerEstadoDemo,
        staleTime: 1000 * 30,
    });
}

export function useAbrirDemo() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: abrirDemo,
        onSuccess: () => qc.invalidateQueries({ queryKey: CLAVE_ESTADO }),
    });
}

export function useReiniciarDemo() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: reiniciarDemo,
        onSuccess: () => qc.invalidateQueries({ queryKey: CLAVE_ESTADO }),
    });
}
