/**
 * MenuFiltro.tsx
 * ===============
 * Dropdown calcado del diseño (botón + menú con check en el seleccionado). Lo
 * usan los filtros de vendedor, ciudad y el "Ordenar". El menú se abre en un
 * PORTAL con posición fija (calculada desde el botón), así escapa cualquier
 * overflow del contenedor (p. ej. barras de filtros deslizables/carrusel).
 * Cierra al hacer clic fuera, scroll de la página, resize o Escape; NO al
 * scrollear dentro del propio menú. Tokens del Panel.
 *
 * Ubicación: apps/admin/src/components/negocios/MenuFiltro.tsx
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface OpcionMenu {
  valor: string;
  etiqueta: string;
  /** Ícono/avatar opcional a la izquierda de la etiqueta (ej. avatar de vendedor). */
  adorno?: ReactNode;
  /** Punto de color a la izquierda (estilo chip). CSS color value (ej. 'var(--panel-ok)'). */
  color?: string;
  /** Conteo como badge a la derecha (estilo chip). Se tiñe con `color` en la opción seleccionada. */
  conteo?: number;
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
  /** Botón cuadrado solo con el ícono (sin etiqueta ni chevron). Para barras compactas (móvil). */
  soloIcono?: boolean;
  testid?: string;
  /** Ancho mínimo del menú (px). Default 220. */
  anchoMenu?: number;
  /** Tamaño del botón. 'chip' iguala la altura de los chips de filtro (px-3 py-1.5 text-12.5). Default 'normal'. */
  tam?: 'normal' | 'chip';
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
  soloIcono = false,
  testid,
  anchoMenu = 220,
  tam = 'normal',
}: MenuFiltroProps) {
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const refWrap = useRef<HTMLDivElement>(null);
  const refMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrarFuera = (e: Event) => {
      const t = e.target as Node;
      if (!refWrap.current?.contains(t) && !refMenu.current?.contains(t)) {
        setAbierto(false);
      }
    };
    // Cerrar al scrollear la página (el menú fixed quedaría desalineado), pero
    // NO al scrollear dentro del propio menú.
    const cerrarScroll = (e: Event) => {
      const t = e.target as Node | null;
      if (t && refMenu.current?.contains(t)) return;
      setAbierto(false);
    };
    const cerrarResize = () => setAbierto(false);
    const cerrarEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('pointerdown', cerrarFuera);
    window.addEventListener('scroll', cerrarScroll, true);
    window.addEventListener('resize', cerrarResize);
    document.addEventListener('keydown', cerrarEsc);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      window.removeEventListener('scroll', cerrarScroll, true);
      window.removeEventListener('resize', cerrarResize);
      document.removeEventListener('keydown', cerrarEsc);
    };
  }, [abierto]);

  const alternar = () => {
    const rect = refWrap.current?.getBoundingClientRect();
    if (rect) {
      const left = alineacion === 'derecha' ? rect.right - anchoMenu : rect.left;
      setPos({ top: rect.bottom + 6, left });
    }
    setAbierto((v) => !v);
  };

  const claseBoton = soloIcono
    ? `inline-flex shrink-0 items-center justify-center rounded-full border bg-superficie-2 transition hover:bg-marca-suave ${
        valor ? 'border-marca/40 text-marca' : 'border-borde text-texto-3'
      } ${compacto ? 'h-10 w-10' : 'h-11 w-11'}`
    : plano
    ? 'inline-flex items-center gap-1.5 text-[12.5px] text-texto-3 transition hover:text-texto'
    : `inline-flex items-center gap-2 rounded-full border border-borde bg-superficie-2 font-medium text-texto transition hover:bg-marca-suave ${
        compacto ? 'px-3 py-2 text-[12.5px]' : tam === 'chip' ? 'px-3 py-1.5 text-[12.5px]' : 'px-3.5 py-2.5 text-[13px]'
      }`;

  return (
    <div className="relative inline-flex" ref={refWrap}>
      <button
        type="button"
        data-testid={testid}
        data-open={abierto}
        onClick={alternar}
        className={claseBoton}
      >
        {soloIcono ? (
          icono
        ) : (
          <>
            {icono && <span className="text-texto-3">{icono}</span>}
            <span className={compacto ? 'max-w-[150px] truncate' : undefined}>{etiquetaBoton}</span>
            <ChevronDown
              size={plano ? 14 : 15}
              className={`text-texto-3 transition-transform ${abierto ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {abierto &&
        pos &&
        createPortal(
          <div
            ref={refMenu}
            className="animar-entrada fixed z-[70] max-h-[min(62vh,360px)] max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-[12px] border border-borde-fuerte bg-superficie p-1.5 shadow-pop-panel"
            style={{ top: pos.top, left: Math.max(8, pos.left), minWidth: anchoMenu }}
          >
            {opciones.map((o, i) => {
              // Separador visual antes de la primera opción "real" si la anterior
              // es una opción base (all/none).
              const separador =
                o.valor !== '' &&
                o.valor !== '__none' &&
                opciones[i - 1] &&
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
                    {o.color && <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: o.color }} />}
                    {o.adorno}
                    <span className="flex-1 truncate">{o.etiqueta}</span>
                    {o.conteo != null && (
                      <span
                        className="txt-badge min-w-[18px] shrink-0 rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums"
                        style={valor === o.valor
                          ? { background: `color-mix(in srgb, ${o.color ?? 'var(--panel-brand)'} 22%, transparent)`, color: o.color ?? 'var(--panel-brand)' }
                          : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }}
                      >
                        {o.conteo}
                      </span>
                    )}
                    <Check size={15} className={`shrink-0 text-marca ${valor === o.valor ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

export default MenuFiltro;
