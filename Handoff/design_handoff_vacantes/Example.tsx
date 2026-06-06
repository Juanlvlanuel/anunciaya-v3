/**
 * Example.tsx — Cómo conecta el padre a React Query + Zustand.
 *
 * No es código de producción — es la receta para tu page route.
 * Borra este archivo cuando lo migres al codebase real.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PaginaVacantes } from './PaginaVacantes';
import type { CrearVacanteInput, Sucursal, Vacante } from './types';

/* ============================================================
   Placeholders — el dev reemplaza por su data layer real
   ============================================================ */
declare const apiVacantes: {
  listar: () => Promise<Vacante[]>;
  listarSucursales: () => Promise<Sucursal[]>;
  crear: (input: CrearVacanteInput) => Promise<Vacante>;
  actualizar: (id: string, input: Partial<CrearVacanteInput>) => Promise<Vacante>;
  pausar: (id: string) => Promise<void>;
  reactivar: (id: string) => Promise<void>;
  cerrar: (id: string) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
};

declare const useRouter: () => {
  push: (path: string) => void;
};

/* ============================================================
   Page route
   ============================================================ */
export function VacantesPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data: vacantes = [], isLoading } = useQuery({
    queryKey: ['vacantes'],
    queryFn: apiVacantes.listar,
  });

  const { data: sucursales = [] } = useQuery({
    queryKey: ['sucursales'],
    queryFn: apiVacantes.listarSucursales,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['vacantes'] });

  const crear = useMutation({
    mutationFn: apiVacantes.crear,
    onSuccess: invalidar,
  });
  const actualizar = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CrearVacanteInput> }) =>
      apiVacantes.actualizar(id, input),
    onSuccess: invalidar,
  });
  const pausar = useMutation({
    mutationFn: apiVacantes.pausar,
    onSuccess: invalidar,
  });
  const reactivar = useMutation({
    mutationFn: apiVacantes.reactivar,
    onSuccess: invalidar,
  });
  const cerrar = useMutation({
    mutationFn: apiVacantes.cerrar,
    onSuccess: invalidar,
  });
  const eliminar = useMutation({
    mutationFn: apiVacantes.eliminar,
    onSuccess: invalidar,
  });

  return (
    <PaginaVacantes
      vacantes={vacantes}
      sucursales={sucursales}
      isLoading={isLoading}
      onCrearVacante={async (input) => { await crear.mutateAsync(input); }}
      onActualizarVacante={async (id, input) => { await actualizar.mutateAsync({ id, input }); }}
      onPausarVacante={async (id) => { await pausar.mutateAsync(id); }}
      onReactivarVacante={async (id) => { await reactivar.mutateAsync(id); }}
      onCerrarVacante={async (id) => { await cerrar.mutateAsync(id); }}
      onEliminarVacante={async (id) => { await eliminar.mutateAsync(id); }}
      onVerEnFeedPublico={(id) => router.push(`/servicios/${id}`)}
      onIrAConversaciones={(vacanteId) =>
        router.push(`/business-studio/chatya?contexto=vacante:${vacanteId}`)
      }
    />
  );
}
