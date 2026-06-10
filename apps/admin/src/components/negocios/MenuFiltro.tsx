/**
 * MenuFiltro.tsx
 * ===============
 * Dropdown calcado del diseño (botón + menú con check en el seleccionado). Lo
 * usan los filtros de vendedor, ciudad y el "Ordenar". Cierra al hacer clic fuera
 * (useClickFuera del Panel). Tokens del Panel.
 *
 * Ubicación: apps/admin/src/components/negocios/MenuFiltro.tsx
 */

import { useState, type ReactNode } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useClickFuera } from '../../hooks/useClickFuera';

export interface OpcionMenu {
  valor: string;
  etiqueta: string;
  /** Ícono/avatar opcional a la izquierda de la etiqueta (ej. avatar de vendedor). */
  adorno?: ReactNode;
}

interface MenuFiltroProps {
  /** Ícono líder del botón (ej. <MapPin/>). */
  icono?: ReactNode;
  /** Texto del botón (lo calcula el padre según el valor activo). */
  etiquetaBoton: ReactNode;
  opciones: OpcionMenu[];
  valor: string;
  onCambiar: (valor: string) => void;
  /** Lado por el que se abre el menú. Default 'derecha'. */
  alineacion?: 'izquierda' | 'derecha';
  /** Variante compacta (móvil). */
  compacto?: boolean;
  /** Botón de texto plano (para el "Ordenar"), sin recuadro. */
  plano?: boolean;
  testid?: string;
  /** Ancho mínimo del menú (px). Default 220. */
  anchoMenu?: number;
}

export function MenuFiltro({
  icono,
  etiquetaBoton,
  opciones,
  valor,
  onCambiar,
  alineacion = 'derecha',
  compacto = false,
  plano = false,
  testid,
  anchoMenu = 220,
}: MenuFiltroProps) {
  const [abierto, setAbierto] = useState(false);
  const ref = useClickFuera<HTMLDivElement>(() => setAbierto(false), abierto);

  const claseBoton = plano
    ? 'inline-flex items-center gap-1.5 text-[12.5px] text-texto-3 transition hover:text-texto'
    : `inline-flex items-center gap-2 rounded-full border border-borde bg-superficie-2 font-medium text-texto transition hover:bg-marca-suave ${
        compacto ? 'px-3 py-2 text-[12.5px]' : 'px-3.5 py-2.5 text-[13px]'
      }`;

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        data-testid={testid}
        data-open={abierto}
        onClick={() => setAbierto((v) => !v)}
        className={claseBoton}
      >
        {icono && <span className="text-texto-3">{icono}</span>}
        <span className={compacto ? 'max-w-[150px] truncate' : undefined}>{etiquetaBoton}</span>
        <ChevronDown
          size={plano ? 14 : 15}
          className={`text-texto-3 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && (
        <div
          className={`animar-entrada absolute top-[calc(100%+6px)] z-30 rounded-[12px] border border-borde-fuerte bg-superficie p-1.5 shadow-pop-panel ${
            alineacion === 'derecha' ? 'right-0' : 'left-0'
          }`}
          style={{ minWidth: anchoMenu }}
        >
          {opciones.map((o, i) => {
            // Separador visual antes de la primera opción "real" si la anterior
            // es una opción base (all/none): se controla con el campo separadorAntes.
            const separador = o.valor !== '' && o.valor !== '__none' && opciones[i - 1] &&
              (opciones[i - 1].valor === '' || opciones[i - 1].valor === '__none');
            return (
              <div key={o.valor || `base-${i}`}>
                {separador && <div className="mx-1 my-1 h-px bg-borde" />}
                <button
                  type="button"
                  data-sel={valor === o.valor}
                  onClick={() => {
                    onCambiar(o.valor);
                    setAbierto(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-texto transition hover:bg-marca-suave"
                >
                  {o.adorno}
                  <span className="flex-1 truncate">{o.etiqueta}</span>
                  <Check size={15} className={`shrink-0 text-marca ${valor === o.valor ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MenuFiltro;
