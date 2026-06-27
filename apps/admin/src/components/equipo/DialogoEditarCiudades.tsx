/**
 * DialogoEditarCiudades.tsx
 * =========================
 * Cambia la cobertura de ciudades de un vendedor DENTRO de su región (agregar / quitar). Consume
 * PATCH /admin/equipo/:id/ciudades (super + gerente de su región). Reusa SelectorCobertura con la
 * región FIJA: mover al vendedor a otra región es otra operación (Pieza F, diferida).
 *
 * Precarga la selección con las ciudades que ya cubre (ciudadIdsActuales).
 *
 * Ubicación: apps/admin/src/components/equipo/DialogoEditarCiudades.tsx
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorCobertura } from './SelectorCobertura';
import { useEditarCiudades } from '../../hooks/queries/useEquipoAdmin';

interface DialogoEditarCiudadesProps {
  abierto: boolean;
  onCerrar: () => void;
  miembroId: string;
  nombre: string;
  regionNombre: string | null;
  regionVendedorId: string | null;
  ciudadIdsActuales: string[];
}

export function DialogoEditarCiudades({
  abierto,
  onCerrar,
  miembroId,
  nombre,
  regionNombre,
  regionVendedorId,
  ciudadIdsActuales,
}: DialogoEditarCiudadesProps) {
  const editar = useEditarCiudades();
  // La región queda fija (la del vendedor); solo se togglean ciudades de esa región.
  const [regionId] = useState(regionVendedorId ?? '');
  const [ciudadIds, setCiudadIds] = useState<string[]>(ciudadIdsActuales);

  const toggleCiudad = (id: string) =>
    setCiudadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const sinCambios =
    ciudadIds.length === ciudadIdsActuales.length && ciudadIds.every((c) => ciudadIdsActuales.includes(c));
  const puedeGuardar = ciudadIds.length > 0 && !sinCambios && !editar.isPending;

  const guardar = () => {
    if (!puedeGuardar) return;
    editar.mutate({ id: miembroId, ciudadIds }, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="md"
      alturaMaxima="lg"
      discriminador="dialogo-editar-ciudades"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-editar-ciudades">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-borde px-5 pt-4 pb-3">
          <div>
            <div className="text-[16px] font-bold text-texto">Cambiar ciudades</div>
            <div className="text-[12px] text-texto-3">Cobertura de {nombre}</div>
          </div>
          <button
            type="button"
            data-testid="ciudades-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <SelectorCobertura
            regionId={regionId}
            onRegionChange={() => {}}
            ciudadIds={ciudadIds}
            onToggleCiudad={toggleCiudad}
            regionFijaNombre={regionNombre}
          />
          <p className="mt-3 text-[11.5px] leading-relaxed text-texto-4">
            Solo puedes elegir ciudades de su región. Cambiar al vendedor a otra región es otra operación.
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button
            type="button"
            data-testid="ciudades-cancelar"
            onClick={onCerrar}
            disabled={editar.isPending}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="ciudades-guardar"
            onClick={guardar}
            disabled={!puedeGuardar}
            className="rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editar.isPending ? 'Guardando…' : 'Guardar ciudades'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarCiudades;
