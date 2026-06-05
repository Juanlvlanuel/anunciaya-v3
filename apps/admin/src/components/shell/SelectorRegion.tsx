/**
 * SelectorRegion.tsx
 * ===================
 * Control de región en el header (escritorio). Por rol:
 *  - superadmin → selector interactivo (cambia el ámbito de datos).
 *  - gerente    → región fija + píldora "tu región".
 *  - vendedor   → región fija (solo texto).
 *
 * Regiones DEMO por ahora. Vive sobre la barra negra → usa blancos translúcidos
 * (no tokens de tema); el menú desplegable sí usa superficie clara.
 *
 * Ubicación: apps/admin/src/components/shell/SelectorRegion.tsx
 */

import { useState } from 'react';
import { Globe, MapPin, ChevronDown, Check } from 'lucide-react';
import { useClickFuera } from '../../hooks/useClickFuera';
import { REGIONES_DEMO, type RolPanel } from '../../data/menuPanel';

interface SelectorRegionProps {
  rol: RolPanel;
  regionActivaId: string;
  onCambiar: (id: string) => void;
}

export function SelectorRegion({ rol, regionActivaId, onCambiar }: SelectorRegionProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useClickFuera<HTMLDivElement>(() => setAbierto(false), abierto);
  const actual = REGIONES_DEMO.find((r) => r.id === regionActivaId) ?? REGIONES_DEMO[0];

  if (rol === 'gerente') {
    return (
      <div className="flex items-center gap-2 px-1 text-sm text-white/90">
        <MapPin size={16} className="text-white/60" />
        <span className="font-semibold">Tu región</span>
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/80">tu región</span>
      </div>
    );
  }

  if (rol === 'vendedor') {
    return (
      <div className="flex items-center gap-2 px-1 text-sm text-white/90">
        <MapPin size={16} className="text-white/60" />
        <span className="font-semibold">Tu región</span>
      </div>
    );
  }

  // superadmin → selector
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        data-testid="selector-region"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-[10px] border border-white/15 bg-white/10 px-3.5 py-2 text-sm text-white transition hover:bg-white/[0.17]"
      >
        {actual.id === 'all' ? <Globe size={16} className="text-white/70" /> : <MapPin size={16} className="text-white/70" />}
        <span className="font-semibold">{actual.nombre}</span>
        <ChevronDown size={16} className="text-white/60" />
      </button>

      {abierto && (
        <div className="animar-entrada absolute right-0 z-30 mt-2 w-[268px] rounded-[12px] border border-borde bg-superficie p-1.5 shadow-pop-panel">
          <div className="px-2.5 py-1.5 text-sm font-semibold text-texto-3">Ámbito de la plataforma</div>
          {REGIONES_DEMO.map((r, i) => (
            <div key={r.id}>
              {i === 1 && <div className="my-1 h-px bg-borde" />}
              <button
                type="button"
                data-testid={`region-${r.id}`}
                onClick={() => {
                  onCambiar(r.id);
                  setAbierto(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition hover:bg-marca-suave ${
                  r.id === regionActivaId ? 'bg-lienzo' : ''
                }`}
              >
                {r.id === 'all' ? <Globe size={16} className="shrink-0 text-texto-3" /> : <MapPin size={16} className="shrink-0 text-texto-3" />}
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium text-texto">{r.nombre}</span>
                  <span className="text-[11px] text-texto-3">{r.sub}</span>
                </span>
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
