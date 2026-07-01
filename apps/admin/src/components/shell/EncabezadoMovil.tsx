/**
 * EncabezadoMovil.tsx
 * ====================
 * Header negro del shell móvil: logo, pendientes (campana) y, solo para superadmin,
 * el selector de región en variante compacta (donde antes iba el avatar). Gerente y
 * vendedor no cambian de ámbito, así que no llevan control ahí. La navegación vive
 * en la barra inferior (tab bar), no en el header.
 *
 * Ubicación: apps/admin/src/components/shell/EncabezadoMovil.tsx
 */

import { BandejaPendientes } from './BandejaPendientes';
import { SelectorRegion } from './SelectorRegion';
import { BotonDemoBS } from '../demo/BotonDemoBS';
import type { RolPanel } from '../../data/menuPanel';

const LOGO_OSCURO = '/logo-anunciaya-azul.webp';

interface EncabezadoMovilProps {
  rol: RolPanel;
  regionActivaId: string;
  onCambiarRegion: (id: string) => void;
}

export function EncabezadoMovil({ rol, regionActivaId, onCambiarRegion }: EncabezadoMovilProps) {
  return (
    <div className="flex items-center gap-3 bg-barra px-5 py-4">
      <img src={LOGO_OSCURO} alt="AnunciaYA" className="h-[42px] w-auto" />
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <BotonDemoBS />
        <BandejaPendientes rol={rol} variante="movil" />
        {/* Selector de region solo para superadmin; gerente/vendedor no cambian de region. */}
        {rol === 'superadmin' && (
          <SelectorRegion rol={rol} regionActivaId={regionActivaId} onCambiar={onCambiarRegion} compacto />
        )}
      </div>
    </div>
  );
}

export default EncabezadoMovil;
