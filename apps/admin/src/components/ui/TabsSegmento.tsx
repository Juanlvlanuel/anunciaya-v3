/**
 * TabsSegmento.tsx
 * ================
 * "Segmented control" para la sub-navegación (tabs de sección) DENTRO de una página del Panel.
 * Estilo de referencia: las pestañas de Ciudades (Mapa · Ciudades · Regiones) — los botones van
 * AGRUPADOS dentro de un solo contenedor tipo píldora, y el activo se resalta con `bg-marca`.
 *
 * Se usa en Métricas, Suscripciones, Categorías, Configuración y Mantenimiento para unificar la
 * personalidad de los tabs de sección.
 *
 * Cada tab acepta un ícono opcional y un badge de conteo opcional (mismo tratamiento que el badge
 * del tab "Ciudades": teñido translúcido claro sobre el activo, gris sobre los inactivos).
 *
 * Ubicación: apps/admin/src/components/ui/TabsSegmento.tsx
 */

import type { ReactNode } from 'react';

export interface TabSegmento<T extends string = string> {
  /** Valor del tab (lo compara contra `valor`). */
  id: T;
  label: string;
  /** Ícono opcional a la izquierda (ej. `<MapPin size={14} />`). */
  icono?: ReactNode;
  /** Conteo opcional a la derecha (badge). Se oculta si es `undefined`. */
  badge?: number;
  /** Si el badge representa una ALERTA (ej. "Por verificar"): se tiñe de marca cuando badge>0
   *  aunque el tab esté inactivo, para que llame la atención. */
  badgeAlerta?: boolean;
}

interface Props<T extends string> {
  tabs: TabSegmento<T>[];
  valor: T;
  onCambiar: (id: T) => void;
  /** Prefijo para el data-testid de cada botón (`${prefijo}-${id}`). */
  testidPrefijo?: string;
  /** Clases extra del contenedor (márgenes, `overflow-x-auto` en móvil, etc.). */
  className?: string;
}

export function TabsSegmento<T extends string>({ tabs, valor, onCambiar, testidPrefijo, className = '' }: Props<T>) {
  return (
    <div className={`inline-flex shrink-0 items-center rounded-full border border-borde bg-superficie-2 p-0.5 ${className}`}>
      {tabs.map((t) => {
        const activo = valor === t.id;
        return (
          <button
            key={t.id}
            type="button"
            data-testid={testidPrefijo ? `${testidPrefijo}-${t.id}` : undefined}
            onClick={() => onCambiar(t.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
              activo ? 'bg-marca text-marca-contraste' : 'text-texto-2 hover:text-texto'
            }`}
          >
            {t.icono}
            {t.label}
            {t.badge != null && (
              <span
                className="txt-badge min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums"
                style={
                  activo
                    ? { background: 'rgba(255,255,255,0.22)', color: '#fff' }
                    : t.badgeAlerta && t.badge
                      ? { background: 'color-mix(in srgb, var(--panel-brand) 16%, transparent)', color: 'var(--panel-brand)' }
                      : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }
                }
              >
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default TabsSegmento;
