/**
 * LayoutMovil.tsx
 * ================
 * Armazón móvil: header negro + saludo/región + cuerpo + tab bar inferior
 * (siempre). Si el rol ve más de 5 secciones, la tab bar muestra 4 + un tab
 * "Más" que abre el cajón (drawer) con todas las secciones. Igual al handoff.
 *
 * Ubicación: apps/admin/src/components/shell/LayoutMovil.tsx
 */

import { useState, type ReactNode } from 'react';
import { EncabezadoMovil } from './EncabezadoMovil';
import { SubcabeceraMovil } from './SubcabeceraMovil';
import { BarraInferior } from './BarraInferior';
import { CajonNavegacion } from './CajonNavegacion';
import { itemsParaRol, type RolPanel } from '../../data/menuPanel';
import type { Tema } from '../../utils/tema';

interface LayoutMovilProps {
  rol: RolPanel;
  nombre: string;
  avatarUrl?: string | null;
  seccionActivaId: string;
  onSeleccionar: (id: string) => void;
  regionActivaId: string;
  tema: Tema;
  onAlternarTema: () => void;
  onCerrarSesion: () => void;
  children: ReactNode;
}

export function LayoutMovil(props: LayoutMovilProps) {
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const items = itemsParaRol(props.rol);
  const overflow = items.length > 5;
  const tabItems = overflow ? items.slice(0, 4) : items;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-superficie">
      <EncabezadoMovil rol={props.rol} nombre={props.nombre} avatarUrl={props.avatarUrl} />
      <SubcabeceraMovil rol={props.rol} nombre={props.nombre} regionActivaId={props.regionActivaId} />

      <main className="flex-1 overflow-y-auto px-4 pb-4">{props.children}</main>

      <BarraInferior
        rol={props.rol}
        items={tabItems}
        seccionActivaId={props.seccionActivaId}
        onSeleccionar={props.onSeleccionar}
        overflow={overflow}
        onMas={() => setDrawerAbierto(true)}
      />

      {overflow && (
        <CajonNavegacion
          rol={props.rol}
          seccionActivaId={props.seccionActivaId}
          abierto={drawerAbierto}
          onSeleccionar={props.onSeleccionar}
          onCerrar={() => setDrawerAbierto(false)}
          tema={props.tema}
          onAlternarTema={props.onAlternarTema}
          onCerrarSesion={props.onCerrarSesion}
        />
      )}
    </div>
  );
}

export default LayoutMovil;
