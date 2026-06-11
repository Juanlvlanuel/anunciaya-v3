/**
 * EncabezadoEscritorio.tsx
 * =========================
 * Barra negra superior del shell escritorio (Inset): marca sobre la columna del
 * sidebar, título de la sección al centro, y a la derecha selector de región,
 * buscar, tema y pendientes. Cruza todo el ancho (col-span-2 del grid).
 *
 * Ubicación: apps/admin/src/components/shell/EncabezadoEscritorio.tsx
 */

import { Search, Sun, Moon } from 'lucide-react';
import { iconoDeSeccion } from '../../config/iconosPanel';
import { SelectorRegion } from './SelectorRegion';
import { BandejaPendientes } from './BandejaPendientes';
import type { RolPanel } from '../../data/menuPanel';
import type { Tema } from '../../utils/tema';

const LOGO_OSCURO = '/logo-anunciaya-azul.webp';

interface EncabezadoEscritorioProps {
  rol: RolPanel;
  tituloSeccion: string;
  iconoSeccionClave: string;
  regionActivaId: string;
  onCambiarRegion: (id: string) => void;
  tema: Tema;
  onAlternarTema: () => void;
}

export function EncabezadoEscritorio({
  rol,
  tituloSeccion,
  iconoSeccionClave,
  regionActivaId,
  onCambiarRegion,
  tema,
  onAlternarTema,
}: EncabezadoEscritorioProps) {
  const IconoSeccion = iconoDeSeccion(iconoSeccionClave);

  return (
    <header className="col-span-2 row-start-1 flex items-center bg-barra pr-8">
      {/* Marca (sobre la columna del sidebar) */}
      <div className="flex w-[314px] shrink-0 items-center gap-3 pl-7">
        <img src={LOGO_OSCURO} alt="AnunciaYA" className="h-[42px] w-auto shrink-0" />
        <span className="h-[46px] w-0.5 shrink-0 rounded bg-linear-to-b from-transparent via-white/55 to-transparent" />
        <span className="max-w-[130px] text-[15px] font-semibold leading-tight text-white">
          Panel de Administradores
        </span>
      </div>

      {/* Título de la sección activa (centrado) */}
      <div className="flex flex-1 items-center justify-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-marca text-white">
          <IconoSeccion size={20} />
        </span>
        <span className="text-[19px] font-semibold tracking-[-0.2px] text-white">{tituloSeccion}</span>
      </div>

      {/* Herramientas */}
      <div className="flex items-center gap-3">
        <SelectorRegion rol={rol} regionActivaId={regionActivaId} onCambiar={onCambiarRegion} />
        <span className="mx-1 h-[46px] w-0.5 shrink-0 rounded bg-linear-to-b from-transparent via-white/55 to-transparent" />
        <button
          type="button"
          aria-label="Buscar"
          className="grid h-10 w-10 place-items-center rounded-[10px] text-white/72 transition hover:bg-white/12 hover:text-white"
        >
          <Search size={20} />
        </button>
        <button
          type="button"
          data-testid="tema-escritorio"
          aria-label="Cambiar tema"
          onClick={onAlternarTema}
          className="grid h-10 w-10 place-items-center rounded-[10px] text-white/72 transition hover:bg-white/12 hover:text-white"
        >
          {tema === 'oscuro' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <BandejaPendientes rol={rol} variante="escritorio" />
      </div>
    </header>
  );
}

export default EncabezadoEscritorio;
