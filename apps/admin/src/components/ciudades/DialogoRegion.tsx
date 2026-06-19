/**
 * DialogoRegion.tsx
 * =================
 * Crear o editar una región (renombrar + activar/desactivar). Reusa ModalAdaptativo.
 * El `cargando` lo controla el padre (la mutación); el padre cierra en el onSuccess.
 *
 * Ubicación: apps/admin/src/components/ciudades/DialogoRegion.tsx
 */

import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import type { RegionConConteo } from '../../services/ciudadesService';

interface DialogoRegionProps {
  abierto: boolean;
  modo: 'crear' | 'editar';
  region?: RegionConConteo | null;
  cargando: boolean;
  onCerrar: () => void;
  onGuardar: (datos: { nombre: string; activa?: boolean }) => void;
}

export function DialogoRegion({ abierto, modo, region, cargando, onCerrar, onGuardar }: DialogoRegionProps) {
  const [nombre, setNombre] = useState('');
  const [activa, setActiva] = useState(true);

  useEffect(() => {
    if (abierto) {
      setNombre(modo === 'editar' ? region?.nombre ?? '' : '');
      setActiva(modo === 'editar' ? region?.activa ?? true : true);
    }
  }, [abierto, modo, region]);

  const esEditar = modo === 'editar';
  const invalido = nombre.trim().length < 2;

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      centrado
      ancho="sm"
      titulo={esEditar ? 'Editar región' : 'Crear región'}
      iconoTitulo={<Layers size={18} className="text-marca" />}
      discriminador="ciudades-region"
    >
      <div className="p-5">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Nombre de la región</label>
        <input
          data-testid="region-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Sonora-Norte"
          className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
        />

        {esEditar && (
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-texto-2">Región activa</span>
            <button
              type="button"
              role="switch"
              aria-checked={activa}
              data-testid="region-activa"
              onClick={() => setActiva((v) => !v)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${activa ? 'bg-marca' : 'bg-borde-fuerte'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${activa ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={cargando} className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            data-testid="region-guardar"
            onClick={() => onGuardar({ nombre: nombre.trim(), activa: esEditar ? activa : undefined })}
            disabled={invalido || cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Guardando…' : esEditar ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoRegion;
