/**
 * useSalaDinamica.ts
 * ===================
 * Orquesta unirse/salir de la sala en vivo de una Dinámica (Fase 4.1) y
 * refresca la carga HTTP (`useEstadoSalaDinamica`) cuando el sorteo cierra
 * — el evento de socket `dinamica:sala:sorteo-cerrado` no trae los nombres
 * de los ganadores, esos vienen de `GET /:id/sala`.
 *
 * Ubicación: apps/web/src/hooks/useSalaDinamica.ts
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSalaDinamicaStore } from '../stores/useSalaDinamicaStore';
import { useAuthStore } from '../stores/useAuthStore';
import { queryKeys } from '../config/queryKeys';

export function useSalaDinamica(dinamicaId: string | undefined) {
    const queryClient = useQueryClient();
    const usuario = useAuthStore((s) => s.usuario);
    const estado = useSalaDinamicaStore((s) => s.estado);
    const estadoAnteriorRef = useRef<string | null>(null);

    useEffect(() => {
        if (!dinamicaId) return;
        useSalaDinamicaStore.getState().unirse(dinamicaId, !!usuario);
        return () => {
            useSalaDinamicaStore.getState().salir();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dinamicaId, !!usuario]);

    useEffect(() => {
        if (dinamicaId && estado === 'cerrada' && estadoAnteriorRef.current !== 'cerrada') {
            queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.sala(dinamicaId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.dinamica(dinamicaId) });
        }
        estadoAnteriorRef.current = estado;
    }, [estado, dinamicaId, queryClient]);

    return useSalaDinamicaStore();
}
