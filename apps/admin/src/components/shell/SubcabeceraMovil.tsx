/**
 * SubcabeceraMovil.tsx
 * =====================
 * Bajo el header negro: saludo grande "Hola, {Nombre}" + píldora de región.
 * El chevron de la píldora solo aparece para superadmin (región configurable).
 *
 * Ubicación: apps/admin/src/components/shell/SubcabeceraMovil.tsx
 */

import { MapPin, ChevronDown } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { useRegionesPanel } from '../../hooks/queries/useRegionesPanel';

interface SubcabeceraMovilProps {
  rol: RolPanel;
  nombre: string;
  regionActivaId: string;
}

export function SubcabeceraMovil({ rol, nombre, regionActivaId }: SubcabeceraMovilProps) {
  const primerNombre = nombre.trim().split(/\s+/)[0] || nombre;
  const regionNombre = useAuthPanelStore((s) => s.usuario?.regionNombre);
  const { data: regiones } = useRegionesPanel(rol === 'superadmin');
  const region =
    rol === 'superadmin'
      ? (regionActivaId
          ? (regiones?.find((r) => r.id === regionActivaId)?.nombre ?? 'Región')
          : 'Toda la plataforma')
      : (regionNombre ?? 'Sin región');

  return (
    <div className="flex items-center justify-between gap-3 bg-superficie px-5 pb-3 pt-4">
      <div className="text-[21px] text-texto">
        Hola, <b className="font-bold">{primerNombre}</b>
      </div>
      <button
        type="button"
        data-testid="region-movil"
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-marca-suave px-3 py-1.5 text-sm font-semibold text-marca"
      >
        <MapPin size={15} />
        <span>{region}</span>
        {rol === 'superadmin' && <ChevronDown size={14} />}
      </button>
    </div>
  );
}

export default SubcabeceraMovil;
