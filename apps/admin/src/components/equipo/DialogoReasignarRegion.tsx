/**
 * DialogoReasignarRegion.tsx
 * ==========================
 * Reasigna la región a cargo de un gerente. Consume PATCH /admin/equipo/:id/region (solo superadmin).
 *
 * Ubicación: apps/admin/src/components/equipo/DialogoReasignarRegion.tsx
 */

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorBuscable } from '../ui/SelectorBuscable';
import { useRegionesPanel } from '../../hooks/queries/useRegionesPanel';
import { useReasignarRegion } from '../../hooks/queries/useEquipoAdmin';

const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';

interface DialogoReasignarRegionProps {
  abierto: boolean;
  onCerrar: () => void;
  miembroId: string;
  nombre: string;
  regionActualNombre: string | null;
}

export function DialogoReasignarRegion({ abierto, onCerrar, miembroId, nombre, regionActualNombre }: DialogoReasignarRegionProps) {
  const reasignar = useReasignarRegion();
  const { data: regiones } = useRegionesPanel(true);
  const [regionId, setRegionId] = useState('');

  const opcionesRegion = useMemo(() => (regiones ?? []).map((r) => ({ id: r.id, etiqueta: r.nombre })), [regiones]);
  const puedeGuardar = !!regionId && !reasignar.isPending;

  const guardar = () => {
    if (!puedeGuardar) return;
    reasignar.mutate({ id: miembroId, regionId }, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="md"
      alturaMaxima="md"
      discriminador="dialogo-reasignar-region"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-reasignar-region">
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-borde">
          <div>
            <div className="text-[16px] font-bold text-texto">Reasignar región</div>
            <div className="text-[12px] text-texto-3">Región a cargo de {nombre}</div>
          </div>
          <button
            type="button"
            data-testid="region-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <p className="mb-3 rounded-[10px] border border-borde bg-superficie-2 px-3 py-2 text-[12px] text-texto-3">
            Región actual: <span className="font-medium text-texto-2">{regionActualNombre ?? '—'}</span>
          </p>
          <label className={LABEL}>Nueva región</label>
          <SelectorBuscable
            testid="region-selector"
            value={regionId}
            onChange={setRegionId}
            opciones={opcionesRegion}
            placeholder="Selecciona una región"
            buscarPlaceholder="Buscar región…"
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button
            type="button"
            data-testid="region-cancelar"
            onClick={onCerrar}
            disabled={reasignar.isPending}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="region-guardar"
            onClick={guardar}
            disabled={!puedeGuardar}
            className="rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reasignar.isPending ? 'Guardando…' : 'Reasignar región'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoReasignarRegion;
