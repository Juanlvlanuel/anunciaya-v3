/**
 * AccionesFicha.tsx (Panel)
 * =========================
 * Acciones del encabezado de una ficha/modal, adaptadas al ancho:
 *
 *   - Escritorio (>= 1024px) → íconos en línea (cuadrados de 36px) con Tooltip,
 *     igual que hasta ahora.
 *   - Móvil (< 1024px)       → un botón "⋯" que despliega un menú con ÍCONO + TEXTO.
 *     En táctil no hay hover (el Tooltip es no-op), así que los íconos pelados no
 *     comunican nada; el menú sí dice de qué se trata cada acción.
 *
 * El botón de CERRAR (X) NO va aquí: lo pone el header de la ficha / del modal y
 * debe quedar siempre visible. Este componente solo agrupa las acciones operativas.
 *
 * Lo comparten las fichas de Negocios, Usuarios y Suscripciones (mismo problema de
 * empalme en móvil cuando hay muchas acciones). Estilo del menú calcado de MenuFiltro.
 *
 * Ubicación: apps/admin/src/components/ui/AccionesFicha.tsx
 */

import { useState } from 'react';
import { MoreVertical, type LucideIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useClickFuera } from '../../hooks/useClickFuera';

export type ColorAccion = 'marca' | 'ambar' | 'ok' | 'peligro';

export interface AccionFicha {
  icono: LucideIcon;
  etiqueta: string;
  onClick: () => void;
  testid: string;
  /** Color temático del ícono. Default 'marca'. */
  color?: ColorAccion;
  disabled?: boolean;
  /** Motivo cuando está deshabilitada. Desktop → texto del Tooltip; móvil → subtexto del ítem. */
  motivoDisabled?: string;
}

// Color del ÍCONO en modo escritorio (botón cuadrado con hover de fondo) — calcado de BotonAccion.
const COLOR_ICONO: Record<ColorAccion, string> = {
  marca: 'text-marca hover:bg-marca-suave',
  ambar: 'text-[#d97706] hover:bg-[#d977061f]',
  ok: 'text-ok hover:bg-[#34c77b1f]',
  peligro: 'text-peligro hover:bg-peligro-suave',
};

// Color del ÍCONO dentro del menú móvil — solo el ícono pinta; el texto queda neutro.
const COLOR_ICONO_MENU: Record<ColorAccion, string> = {
  marca: 'text-marca',
  ambar: 'text-[#d97706]',
  ok: 'text-ok',
  peligro: 'text-peligro',
};

interface AccionesFichaProps {
  acciones: AccionFicha[];
  /** testid del botón "⋯" en móvil. */
  testidMenu?: string;
}

export function AccionesFicha({ acciones, testidMenu = 'acciones-menu' }: AccionesFichaProps) {
  const esEscritorio = useEsEscritorio();
  const [abierto, setAbierto] = useState(false);
  const ref = useClickFuera<HTMLDivElement>(() => setAbierto(false), abierto);

  if (acciones.length === 0) return null;

  // ── Escritorio: íconos en línea con Tooltip (sin cambio visual) ──────────────
  if (esEscritorio) {
    return (
      <>
        {acciones.map((a) => {
          const Icono = a.icono;
          return (
            <Tooltip key={a.testid} text={a.disabled ? (a.motivoDisabled ?? a.etiqueta) : a.etiqueta} className="shrink-0">
              <button
                type="button"
                data-testid={a.testid}
                onClick={a.onClick}
                disabled={a.disabled}
                aria-label={a.etiqueta}
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] transition disabled:cursor-not-allowed disabled:opacity-50 ${COLOR_ICONO[a.color ?? 'marca']}`}
              >
                <Icono size={18} />
              </button>
            </Tooltip>
          );
        })}
      </>
    );
  }

  // ── Móvil: botón "⋯" + menú con ícono + texto ───────────────────────────────
  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        data-testid={testidMenu}
        data-open={abierto}
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Más acciones"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
      >
        <MoreVertical size={19} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="animar-entrada absolute right-0 top-[calc(100%+6px)] z-30 min-w-[224px] rounded-[12px] border border-borde-fuerte bg-superficie p-1.5 shadow-pop-panel"
        >
          {acciones.map((a) => {
            const Icono = a.icono;
            return (
              <button
                key={a.testid}
                type="button"
                role="menuitem"
                data-testid={a.testid}
                disabled={a.disabled}
                onClick={() => {
                  a.onClick();
                  setAbierto(false);
                }}
                className="flex w-full items-start gap-2.5 rounded-[8px] px-2.5 py-2 text-left transition hover:bg-marca-suave disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icono size={17} className={`mt-px shrink-0 ${COLOR_ICONO_MENU[a.color ?? 'marca']}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-texto">{a.etiqueta}</span>
                  {a.disabled && a.motivoDisabled && (
                    <span className="mt-0.5 block text-[11px] leading-snug text-texto-4">{a.motivoDisabled}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AccionesFicha;
