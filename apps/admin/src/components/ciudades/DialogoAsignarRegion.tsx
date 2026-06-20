/**
 * DialogoAsignarRegion.tsx
 * ========================
 * Asignar / cambiar / quitar la región de UNA ciudad. Reusa ModalAdaptativo.
 * El backend valida el guard "una región" (si la ciudad la cubren vendedores) y
 * puede responder 409 — el toast de error lo muestra el hook; el padre deja el
 * diálogo abierto para reintentar.
 *
 * Ubicación: apps/admin/src/components/ciudades/DialogoAsignarRegion.tsx
 */

import { useEffect, useMemo, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorBuscable } from '../ui/SelectorBuscable';
import type { CiudadCatalogo, RegionConConteo } from '../../services/ciudadesService';

interface DialogoAsignarRegionProps {
  abierto: boolean;
  ciudad: CiudadCatalogo | null;
  regiones: RegionConConteo[];
  cargando: boolean;
  onCerrar: () => void;
  onGuardar: (regionId: string | null) => void;
}

export function DialogoAsignarRegion({ abierto, ciudad, regiones, cargando, onCerrar, onGuardar }: DialogoAsignarRegionProps) {
  const [regionId, setRegionId] = useState('');

  useEffect(() => {
    if (abierto) setRegionId(ciudad?.regionId ?? '');
  }, [abierto, ciudad]);

  const opcionesRegion = useMemo(() => {
    const activas = regiones.filter((r) => r.activa || r.id === ciudad?.regionId);
    return [{ id: '', etiqueta: 'Sin región' }, ...activas.map((r) => ({ id: r.id, etiqueta: r.nombre }))];
  }, [regiones, ciudad?.regionId]);
  const sinCambio = (regionId || null) === (ciudad?.regionId ?? null);

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      centrado
      ancho="sm"
      titulo={`Región de ${ciudad?.nombre ?? 'la ciudad'}`}
      iconoTitulo={<MapIcon size={18} className="text-marca" />}
      discriminador="ciudades-asignar-region"
    >
      <div className="p-5">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Región</label>
        <SelectorBuscable
          testid="asignar-region-select"
          value={regionId}
          onChange={setRegionId}
          opciones={opcionesRegion}
          placeholder="Sin región"
          buscarPlaceholder="Buscar región…"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={cargando} className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            data-testid="asignar-region-guardar"
            onClick={() => onGuardar(regionId || null)}
            disabled={sinCambio || cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoAsignarRegion;
