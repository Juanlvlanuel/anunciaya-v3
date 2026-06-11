/**
 * LayoutMovil.tsx
 * ================
 * Armazón móvil: header negro + saludo/región + cuerpo + tab bar inferior
 * (siempre). Si el rol ve más de 5 secciones, la tab bar muestra 4 + un tab
 * "Más" que abre el cajón (drawer) con todas las secciones. Igual al handoff.
 *
 * Ubicación: apps/admin/src/components/shell/LayoutMovil.tsx
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EncabezadoMovil } from './EncabezadoMovil';
import { SubcabeceraMovil } from './SubcabeceraMovil';
import { BarraInferior } from './BarraInferior';
import { CajonNavegacion } from './CajonNavegacion';
import { itemsParaRol, type RolPanel } from '../../data/menuPanel';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { useScrollPanel } from '../../stores/useScrollPanel';
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
  contadores?: Partial<Record<string, number>>;
  children: ReactNode;
}

export function LayoutMovil(props: LayoutMovilProps) {
  const [drawerAbierto, setDrawerAbierto] = useState(false);
  const items = itemsParaRol(props.rol);
  const overflow = items.length > 5;
  const tabItems = overflow ? items.slice(0, 4) : items;

  // Auto-ocultar la barra inferior al scrollear (la sección registra su contenedor scrolleable).
  useHideOnScroll();
  const navVisible = useScrollPanel((s) => s.navVisible);
  const navRef = useRef<HTMLDivElement>(null);
  const [altoNav, setAltoNav] = useState(0);
  useEffect(() => {
    if (navRef.current) setAltoNav(navRef.current.offsetHeight);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-superficie">
      <EncabezadoMovil rol={props.rol} nombre={props.nombre} avatarUrl={props.avatarUrl} />
      <SubcabeceraMovil rol={props.rol} nombre={props.nombre} regionActivaId={props.regionActivaId} />

      <main className="flex-1 overflow-y-auto pb-1.5">{props.children}</main>

      {/* La barra colapsa su ALTURA al ocultarse: el contenido (y la paginación al fondo de la
          sección) gana ese espacio solo, por reflow del flex. */}
      <div
        className="shrink-0 overflow-hidden transition-[height] duration-300 ease-out"
        style={altoNav ? { height: navVisible ? altoNav : 0 } : undefined}
      >
        <div
          ref={navRef}
          className="transition-transform duration-300 ease-out"
          style={{ transform: navVisible ? 'translateY(0)' : 'translateY(100%)' }}
        >
          <BarraInferior
            rol={props.rol}
            items={tabItems}
            seccionActivaId={props.seccionActivaId}
            onSeleccionar={props.onSeleccionar}
            overflow={overflow}
            onMas={() => setDrawerAbierto(true)}
          />
        </div>
      </div>

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
          contadores={props.contadores}
        />
      )}
    </div>
  );
}

export default LayoutMovil;
