/**
 * EncabezadoMovil.tsx
 * ====================
 * Header negro del shell móvil: logo, pendientes (ícono inline) y, donde antes
 * iba el avatar, el selector de región en variante compacta (solo icono). Para
 * superadmin abre el menú de ámbito; para gerente/vendedor es el pin de su región
 * fija. La navegación vive en la barra inferior (tab bar), no en el header.
 *
 * Ubicación: apps/admin/src/components/shell/EncabezadoMovil.tsx
 */

import { BandejaPendientes } from './BandejaPendientes';
import { SelectorRegion } from './SelectorRegion';
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
        <BandejaPendientes rol={rol} variante="movil" />
        <SelectorRegion rol={rol} regionActivaId={regionActivaId} onCambiar={onCambiarRegion} compacto />
      </div>
    </div>
  );
}

export default EncabezadoMovil;
