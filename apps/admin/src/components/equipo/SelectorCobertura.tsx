/**
 * SelectorCobertura.tsx
 * =====================
 * Selector de la cobertura de un vendedor: (superadmin) elige una REGIÓN y luego marca 1+ CIUDADES
 * de esa región; (gerente) no elige región —usa la suya, que fuerza el backend— y marca ciudades.
 * El trigger de BD garantiza que todas sean de una sola región. Reusado por el alta y por "cambiar
 * ciudades".
 *
 * Estado controlado por el padre: `regionId` (solo super) + `ciudadIds`. Al cambiar la región, el
 * padre debe limpiar `ciudadIds` (las ciudades viejas ya no aplican).
 *
 * Ubicación: apps/admin/src/components/equipo/SelectorCobertura.tsx
 */

import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { useRegionesPanel } from '../../hooks/queries/useRegionesPanel';
import { useCiudadesEquipo } from '../../hooks/queries/useEquipoAdmin';
import { SelectorBuscable } from '../ui/SelectorBuscable';

const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';

interface SelectorCoberturaProps {
  /** Región elegida (solo la usa el superadmin). '' = aún sin elegir. */
  regionId: string;
  onRegionChange: (id: string) => void;
  ciudadIds: string[];
  onToggleCiudad: (id: string) => void;
}

export function SelectorCobertura({ regionId, onRegionChange, ciudadIds, onToggleCiudad }: SelectorCoberturaProps) {
  const rol = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const esSuper = rol === 'superadmin';

  const { data: regiones } = useRegionesPanel(esSuper);
  // El super consulta por la región elegida; el gerente manda undefined y el backend usa la suya.
  const regionConsulta = esSuper ? regionId || undefined : undefined;
  const habilitado = esSuper ? !!regionId : true;
  const { data: ciudades, isLoading } = useCiudadesEquipo(regionConsulta, habilitado);

  const opcionesRegion = useMemo(
    () => (regiones ?? []).map((r) => ({ id: r.id, etiqueta: r.nombre })),
    [regiones],
  );

  const seleccion = new Set(ciudadIds);

  return (
    <div className="flex flex-col gap-3">
      {esSuper && (
        <div>
          <label className={LABEL}>Región</label>
          <SelectorBuscable
            testid="cobertura-region"
            value={regionId}
            onChange={onRegionChange}
            opciones={opcionesRegion}
            placeholder="Selecciona una región"
            buscarPlaceholder="Buscar región…"
          />
        </div>
      )}

      <div>
        <label className={LABEL}>Ciudades que cubre</label>
        {esSuper && !regionId ? (
          <p className="rounded-[10px] border border-dashed border-borde px-3 py-3 text-center text-[12.5px] text-texto-4">
            Elige una región para ver sus ciudades.
          </p>
        ) : isLoading ? (
          <p className="flex items-center justify-center gap-2 py-3 text-[12.5px] text-texto-4">
            <Loader2 size={14} className="animate-spin" /> Cargando ciudades…
          </p>
        ) : (ciudades ?? []).length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-borde px-3 py-3 text-center text-[12.5px] text-texto-4">
            No hay ciudades activas en esta región.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="cobertura-ciudades">
            {(ciudades ?? []).map((c) => {
              const activo = seleccion.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  data-testid={`cobertura-ciudad-${c.id}`}
                  onClick={() => onToggleCiudad(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
                    activo ? 'border-marca bg-marca-suave text-marca' : 'border-borde text-texto-2 hover:bg-marca-suave'
                  }`}
                >
                  {c.nombre}
                </button>
              );
            })}
          </div>
        )}
        {ciudadIds.length > 0 && (
          <p className="mt-1.5 text-[11.5px] text-texto-4">
            {ciudadIds.length} {ciudadIds.length === 1 ? 'ciudad seleccionada' : 'ciudades seleccionadas'}
          </p>
        )}
      </div>
    </div>
  );
}

export default SelectorCobertura;
