/**
 * LayoutEscritorio.tsx
 * =====================
 * Armazón de escritorio (Inset): grid 314px + contenido, barra negra arriba,
 * sidebar transparente y panel de contenido flotante (tarjeta blanca con borde
 * y sombra, "inset" dentro del lienzo).
 *
 * Ubicación: apps/admin/src/components/shell/LayoutEscritorio.tsx
 */

import type { ReactNode } from 'react';
import { EncabezadoEscritorio } from './EncabezadoEscritorio';
import { BarraLateral } from './BarraLateral';
import type { RolPanel } from '../../data/menuPanel';
import type { Tema } from '../../utils/tema';

interface LayoutEscritorioProps {
  rol: RolPanel;
  nombre: string;
  avatarUrl?: string | null;
  seccionActivaId: string;
  tituloSeccion: string;
  iconoSeccionClave: string;
  onSeleccionar: (id: string) => void;
  regionActivaId: string;
  onCambiarRegion: (id: string) => void;
  tema: Tema;
  onAlternarTema: () => void;
  onCerrarSesion: () => void;
  children: ReactNode;
}

export function LayoutEscritorio(props: LayoutEscritorioProps) {
  return (
    <div className="grid h-screen grid-cols-[314px_1fr] grid-rows-[76px_1fr] overflow-hidden bg-lienzo">
      <EncabezadoEscritorio
        rol={props.rol}
        tituloSeccion={props.tituloSeccion}
        iconoSeccionClave={props.iconoSeccionClave}
        regionActivaId={props.regionActivaId}
        onCambiarRegion={props.onCambiarRegion}
        tema={props.tema}
        onAlternarTema={props.onAlternarTema}
      />

      <aside className="col-start-1 row-start-2 overflow-hidden">
        <BarraLateral
          rol={props.rol}
          seccionActivaId={props.seccionActivaId}
          onSeleccionar={props.onSeleccionar}
          nombre={props.nombre}
          avatarUrl={props.avatarUrl}
          onCerrarSesion={props.onCerrarSesion}
        />
      </aside>

      <main className="col-start-2 row-start-2 overflow-hidden p-4 pl-2">
        <div className="h-full overflow-y-auto rounded-[16px] border border-borde bg-superficie shadow-tarjeta-panel">
          {props.children}
        </div>
      </main>
    </div>
  );
}

export default LayoutEscritorio;
