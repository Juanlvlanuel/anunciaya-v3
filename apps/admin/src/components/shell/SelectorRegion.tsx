/**
 * SelectorRegion.tsx
 * ===================
 * Control de región en el header (escritorio). Por rol:
 *  - superadmin → selector interactivo (cambia el ámbito de datos).
 *  - gerente/vendedor → región fija: el nombre real de SU región (del store).
 *
 * El selector del superadmin usa regiones DEMO por ahora (Parte 2 lo conecta al
 * backend). Vive sobre la barra negra → usa blancos translúcidos (no tokens de
 * tema); el menú desplegable sí usa superficie clara.
 *
 * Ubicación: apps/admin/src/components/shell/SelectorRegion.tsx
 */

import { useState } from 'react';
import { Globe, MapPin, ChevronDown, Check } from 'lucide-react';
import { useClickFuera } from '../../hooks/useClickFuera';
import type { RolPanel } from '../../data/menuPanel';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { useRegionesPanel } from '../../hooks/queries/useRegionesPanel';

interface SelectorRegionProps {
  rol: RolPanel;
  regionActivaId: string;
  onCambiar: (id: string) => void;
}

export function SelectorRegion({ rol, regionActivaId, onCambiar }: SelectorRegionProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useClickFuera<HTMLDivElement>(() => setAbierto(false), abierto);
  const regionNombre = useAuthPanelStore((s) => s.usuario?.regionNombre);
  const { data: regiones } = useRegionesPanel(rol === 'superadmin');

  // gerente / vendedor → región fija: el nombre real de SU región.
  if (rol !== 'superadmin') {
    return (
      <div className="flex items-center gap-2 px-1 text-sm text-white/90">
        <MapPin size={16} className="text-white/60" />
        <span className="font-semibold">{regionNombre ?? 'Sin región'}</span>
      </div>
    );
  }

  // superadmin → selector de ámbito con regiones REALES. '' = toda la plataforma.
  const opciones = [{ id: '', nombre: 'Toda la plataforma' }, ...(regiones ?? [])];
  const actual = opciones.find((r) => r.id === regionActivaId) ?? opciones[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="selector-region"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-[10px] border border-white/15 bg-white/10 px-3.5 py-2 text-sm text-white transition hover:bg-white/[0.17]"
      >
        {actual.id === '' ? <Globe size={16} className="text-white/70" /> : <MapPin size={16} className="text-white/70" />}
        <span className="font-semibold">{actual.nombre}</span>
        <ChevronDown size={16} className="text-white/60" />
      </button>

      {abierto && (
        <div className="animar-entrada absolute right-0 z-30 mt-2 w-[268px] rounded-[12px] border border-borde bg-superficie p-1.5 shadow-pop-panel">
          <div className="px-2.5 py-1.5 text-sm font-semibold text-texto-3">Ámbito de la plataforma</div>
          {opciones.map((r, i) => (
            <div key={r.id || 'all'}>
              {i === 1 && <div className="my-1 h-px bg-borde" />}
              <button
                type="button"
                data-testid={`region-${r.id || 'all'}`}
                onClick={() => {
                  onCambiar(r.id);
                  setAbierto(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition hover:bg-marca-suave ${
                  r.id === regionActivaId ? 'bg-lienzo' : ''
                }`}
              >
                {r.id === '' ? <Globe size={16} className="shrink-0 text-texto-3" /> : <MapPin size={16} className="shrink-0 text-texto-3" />}
                <span className="flex-1 text-sm font-medium text-texto">{r.nombre}</span>
                {r.id === regionActivaId && <Check size={16} className="shrink-0 text-marca" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SelectorRegion;
