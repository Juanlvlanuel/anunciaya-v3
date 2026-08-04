/**
 * BotonRefrescar.tsx (Panel Admin)
 * =================================
 * Botón circular de "Actualizar" para la toolbar de filtros de las secciones
 * de lista (Negocios, Usuarios, Ciudades, etc.) — dispara `refetch()` de la
 * query activa sin recargar la página. Mismo tamaño que los chips "Ordenar"/
 * filtros (h-8, tam="chip" de MenuFiltro) para alinear en la misma fila.
 *
 * No confundir con el `BotonRefrescar` local de SeccionMantenimiento.tsx —
 * ese usa acento verde ("salud" del sistema); este es neutro (Tokens Regla 13).
 *
 * Ubicación: apps/admin/src/components/ui/BotonRefrescar.tsx
 */

import { RefreshCw } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface BotonRefrescarProps {
  onClick: () => void;
  cargando: boolean;
  testid?: string;
}

export function BotonRefrescar({ onClick, cargando, testid }: BotonRefrescarProps) {
  return (
    <Tooltip text="Actualizar" className="shrink-0">
      <button
        type="button"
        data-testid={testid}
        aria-label="Actualizar"
        onClick={onClick}
        disabled={cargando}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-borde bg-superficie-2 text-texto-3 transition hover:bg-marca-suave hover:text-texto disabled:opacity-50"
      >
        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
      </button>
    </Tooltip>
  );
}

export default BotonRefrescar;
