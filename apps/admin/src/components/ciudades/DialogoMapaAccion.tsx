/**
 * DialogoMapaAccion.tsx
 * =====================
 * Diálogo de confirmación de las acciones del mapa de Ciudades, en dos modos:
 *   - 'alta'    → confirmar el alta de N ciudades nuevas (selector de región OPCIONAL).
 *   - 'agrupar' → agrupar N ciudades del catálogo en una región (selector OBLIGATORIO).
 * Reusa ModalAdaptativo (centrado). El `cargando` lo controla el padre (la mutación).
 *
 * Ubicación: apps/admin/src/components/ciudades/DialogoMapaAccion.tsx
 */

import { useState, useEffect } from 'react';
import { MapPin, Layers } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import type { RegionConConteo } from '../../services/ciudadesService';

interface DialogoMapaAccionProps {
  abierto: boolean;
  modo: 'alta' | 'agrupar';
  cantidad: number;
  regiones: RegionConConteo[];
  cargando: boolean;
  onCerrar: () => void;
  onConfirmar: (regionId: string | null) => void;
}

export function DialogoMapaAccion({ abierto, modo, cantidad, regiones, cargando, onCerrar, onConfirmar }: DialogoMapaAccionProps) {
  const [regionId, setRegionId] = useState('');

  // Reinicia el selector cada vez que se abre.
  useEffect(() => {
    if (abierto) setRegionId('');
  }, [abierto, modo]);

  const esAlta = modo === 'alta';
  const regionesActivas = regiones.filter((r) => r.activa);
  const invalido = !esAlta && !regionId; // agrupar exige región

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      centrado
      ancho="sm"
      titulo={esAlta ? `Agregar ${cantidad} ciudad${cantidad === 1 ? '' : 'es'}` : `Agrupar ${cantidad} ciudad${cantidad === 1 ? '' : 'es'}`}
      iconoTitulo={esAlta ? <MapPin size={18} className="text-marca" /> : <Layers size={18} className="text-marca" />}
      discriminador="ciudades-mapa-accion"
    >
      <div className="p-5">
        <p className="text-[13.5px] leading-relaxed text-texto-2">
          {esAlta
            ? `Se agregarán ${cantidad} ciudad${cantidad === 1 ? '' : 'es'} al catálogo y quedarán disponibles en la app. Puedes asignarlas a una región ahora (opcional).`
            : `Se agruparán ${cantidad} ciudad${cantidad === 1 ? '' : 'es'} del catálogo en la región que elijas.`}
        </p>

        <div className="mt-3">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">
            {esAlta ? 'Región (opcional)' : 'Región'}
          </label>
          <select
            data-testid="ciudades-mapa-region"
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
          >
            <option value="">{esAlta ? 'Sin región' : 'Elige una región…'}</option>
            {regionesActivas.map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
          {!esAlta && regionesActivas.length === 0 && (
            <p className="mt-1.5 text-[12px] text-texto-4">No hay regiones activas. Crea una en la pestaña Regiones.</p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={cargando}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="ciudades-mapa-confirmar"
            onClick={() => onConfirmar(regionId || null)}
            disabled={invalido || cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Procesando…' : esAlta ? 'Agregar' : 'Agrupar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoMapaAccion;
