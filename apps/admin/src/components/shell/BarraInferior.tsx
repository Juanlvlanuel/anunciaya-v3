/**
 * BarraInferior.tsx
 * ==================
 * Navegación inferior (tab bar) del shell móvil — SIEMPRE visible. Fondo
 * gradiente azul corporativo; tab activo con píldora. Si el rol ve muchas
 * secciones, se muestran 4 + un tab "Más" que abre el cajón con el resto.
 *
 * Ubicación: apps/admin/src/components/shell/BarraInferior.tsx
 */

import { Menu } from 'lucide-react';
import { iconoDeSeccion } from '../../config/iconosPanel';
import { ETIQUETAS_CORTAS, etiquetaDe, type ItemMenu, type RolPanel } from '../../data/menuPanel';
import { usePrefetchSeccion } from '../../hooks/queries/usePrefetchSeccion';

interface BarraInferiorProps {
  rol: RolPanel;
  items: ItemMenu[];
  seccionActivaId: string;
  onSeleccionar: (id: string) => void;
  overflow: boolean;
  onMas: () => void;
}

export function BarraInferior({
  rol,
  items,
  seccionActivaId,
  onSeleccionar,
  overflow,
  onMas,
}: BarraInferiorProps) {
  const precargar = usePrefetchSeccion();
  return (
    <nav
      className="flex items-stretch rounded-t-[20px] px-2 pb-2 pt-2.5 shadow-[0_-6px_18px_rgba(26,54,173,0.22)]"
      style={{ background: 'linear-gradient(125deg, #2f6bf0 0%, #1a36ad 100%)' }}
    >
      {items.map((it) => {
        const activo = it.id === seccionActivaId;
        const Icono = iconoDeSeccion(it.icono);
        return (
          <button
            key={it.id}
            type="button"
            data-testid={`tab-${it.id}`}
            onClick={() => onSeleccionar(it.id)}
            onPointerEnter={() => precargar(it.id)}
            onFocus={() => precargar(it.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-1 ${activo ? 'text-white' : 'text-white/72'}`}
          >
            <span className={`grid h-8 w-12 place-items-center rounded-full ${activo ? 'bg-white/20' : ''}`}>
              <Icono size={20} />
            </span>
            <span className="text-[11px] font-medium">{ETIQUETAS_CORTAS[it.id] ?? etiquetaDe(it, rol)}</span>
          </button>
        );
      })}

      {overflow && (
        <button
          type="button"
          data-testid="tab-mas"
          onClick={onMas}
          className="flex flex-1 flex-col items-center gap-1 py-1 text-white/72"
        >
          <span className="grid h-8 w-12 place-items-center rounded-full">
            <Menu size={20} />
          </span>
          <span className="text-[11px] font-medium">Más</span>
        </button>
      )}
    </nav>
  );
}

export default BarraInferior;
