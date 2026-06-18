/**
 * SeccionConfiguracion.tsx
 * ========================
 * Sección "Configuración" del Panel (módulo 9, VER · Fase 1) — los valores dinámicos del negocio que
 * el SuperAdmin ajusta sin tocar código. Solo lectura por ahora; la edición (diálogos + editor de la
 * escalera) llega en Fase 2.
 *
 * Diseño tipo "ajustes" (Linear/Stripe/Notion): encabezado del módulo + grupos por categoría +
 * mosaico vertical de tarjetas (2 columnas en escritorio, 1 en móvil). Cada tarjeta apila ícono ·
 * etiqueta/descripción arriba y, tras un divisor, el valor destacado + Editar abajo. La escalera (json)
 * ocupa la fila completa. Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/configuracion/SeccionConfiguracion.tsx
 */

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { SlidersHorizontal, Layers, Clock, Gift, Coins, Pencil, type LucideProps } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useConfiguracion } from '../../hooks/queries/useConfiguracionAdmin';
import { parsearEscalera, type ConfigFila, type TramoEscalera } from '../../services/configuracionService';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { DialogoEditarNumero, DialogoEditarEscalera } from './DialogosConfig';
import { TarjetaPrecioMembresia } from './TarjetaPrecioMembresia';
import { PanelAcordeon } from './PanelAcordeon';

/** Etiqueta legible de cada categoría de `configuracion_sistema`. */
const ETIQUETA_CATEGORIA: Record<string, string> = {
  pagos: 'Pagos y comisiones',
  trials: 'Prueba (trial)',
  promociones: 'Promociones',
  transacciones: 'Transacciones',
  notificaciones: 'Notificaciones',
  seguridad: 'Seguridad',
  general: 'General',
};

/** Ícono semántico por clave (sobrio, sin círculo pastel — Regla 13). */
const ICONO_CLAVE: Record<string, ComponentType<LucideProps>> = {
  comision_escalera: Layers,
  periodo_gracia_cobro_dias: Clock,
  trial_duracion_dias: Gift,
};

/** Ícono por categoría — encabeza la barra de cada acordeón. */
const ICONO_CATEGORIA: Record<string, ComponentType<LucideProps>> = {
  pagos: Coins,
  trials: Gift,
};

/** Cuadro neutro con ícono (estilo profesional, no caricaturesco). */
function CajaIcono({ Icono, tam = 36 }: { Icono: ComponentType<LucideProps>; tam?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[10px] border border-borde bg-superficie-2 text-texto-3"
      style={{ width: tam, height: tam }}
    >
      <Icono size={Math.round(tam * 0.5)} />
    </span>
  );
}

function rangoTramo(t: TramoEscalera): string {
  return t.max === null ? `${t.min}+` : `${t.min} – ${t.max}`;
}

/** Tramos de la escalera en horizontal (cada tramo una celda) — aprovecha el ancho de la card full-width. */
function TablaEscalera({ valor }: { valor: string }) {
  const tramos = parsearEscalera(valor);
  if (tramos.length === 0) return <p className="text-[13px] text-texto-4">Escalera sin definir.</p>;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
      {tramos.map((t, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5">
          <span className="text-[13px] text-texto-2">{rangoTramo(t)} activos</span>
          <span className="text-[15px] font-semibold leading-none" style={{ color: t.montoPorActivo > 0 ? 'var(--panel-ok)' : 'var(--panel-text-4)' }}>
            {t.montoPorActivo > 0 ? `$${t.montoPorActivo}` : '—'}
            {t.montoPorActivo > 0 && <span className="ml-1 text-[11px] font-normal text-texto-3">/ mes</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Botón "Editar" compartido (secundario sobrio del Panel). */
function BotonEditar({ clave, onEditar }: { clave: string; onEditar: () => void }) {
  return (
    <button
      type="button"
      data-testid={`config-editar-${clave}`}
      onClick={onEditar}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12px] font-semibold text-texto-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
    >
      <Pencil size={13} /> Editar
    </button>
  );
}

/** Badge sutil "valor por defecto" (cuando la clave aún no se ha sembrado/editado). */
function BadgePorDefecto() {
  return (
    <span className="shrink-0 rounded-full border border-borde px-2 py-0.5 text-[11px] font-medium text-texto-4">valor por defecto</span>
  );
}

/**
 * Tarjeta de un valor configurable (mosaico vertical). Dos formas según el tipo:
 *  - Escalera (json) → fila completa: identidad + Editar arriba, tabla de tramos debajo.
 *  - Valor simple    → tarjeta apilada: ícono + identidad arriba; tras un divisor, valor + Editar abajo.
 */
function TarjetaConfig({ c, onEditar }: { c: ConfigFila; onEditar: () => void }) {
  const Icono = ICONO_CLAVE[c.clave] ?? SlidersHorizontal;
  const esEscalera = c.tipo === 'json';
  const tieneRango = c.min !== null || c.max !== null;

  if (esEscalera) {
    return (
      <div className="rounded-[12px] border border-borde bg-superficie p-4 lg:col-span-2 2xl:col-span-2" data-testid={`config-${c.clave}`}>
        <div className="flex items-start gap-4">
          <CajaIcono Icono={Icono} tam={32} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[14.5px] font-semibold text-texto">{c.etiqueta}</h4>
              {!c.sembrado && <BadgePorDefecto />}
            </div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-texto-3">{c.descripcion}</p>
          </div>
          <div className="self-center">
            <BotonEditar clave={c.clave} onEditar={onEditar} />
          </div>
        </div>
        <div className="mt-3">
          <TablaEscalera valor={c.valor} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-[12px] border border-borde bg-superficie p-4" data-testid={`config-${c.clave}`}>
      {/* Cabecera: ícono · badge "valor por defecto" */}
      <div className="flex items-start justify-between gap-2">
        <CajaIcono Icono={Icono} tam={32} />
        {!c.sembrado && <BadgePorDefecto />}
      </div>

      {/* Identidad (la descripción crece para empujar el pie hacia abajo y alinear el divisor entre tarjetas) */}
      <h4 className="mt-3 text-[14.5px] font-semibold text-texto">{c.etiqueta}</h4>
      <p className="mt-0.5 flex-1 text-[13px] leading-relaxed text-texto-3">{c.descripcion}</p>

      {/* Pie: valor destacado · Editar */}
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-borde pt-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px] font-bold leading-none text-texto">{c.valor}</span>
            {c.unidad && <span className="text-[12px] text-texto-3">{c.unidad}</span>}
          </div>
          {tieneRango && (
            <span className="rounded-full border border-borde px-2 py-0.5 text-[11px] text-texto-4">rango {c.min ?? 0}–{c.max ?? '∞'}</span>
          )}
        </div>
        <BotonEditar clave={c.clave} onEditar={onEditar} />
      </div>
    </div>
  );
}

export function SeccionConfiguracion() {
  const esEscritorio = useEsEscritorio();
  const { data, isLoading, isError } = useConfiguracion();
  const [filaEditando, setFilaEditando] = useState<ConfigFila | null>(null);

  // Acordeón: varias secciones pueden estar abiertas a la vez. Al entrar, solo "Precio" (la primera).
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(['precio']));
  const alternar = (id: string) =>
    setAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const scrollRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : scrollRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  const items = data ?? [];
  const categorias: string[] = [];
  const porCategoria = new Map<string, ConfigFila[]>();
  for (const c of items) {
    if (!porCategoria.has(c.categoria)) {
      porCategoria.set(c.categoria, []);
      categorias.push(c.categoria);
    }
    porCategoria.get(c.categoria)!.push(c);
  }

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto max-w-[1180px]">
        {/* Encabezado del módulo */}
        <div className="mb-6 flex items-center gap-3">
          <CajaIcono Icono={SlidersHorizontal} tam={44} />
          <div className="min-w-0">
            <h2 className="text-[18px] font-bold tracking-[-0.2px] text-texto">Configuración</h2>
            <p className="text-[13px] text-texto-3">Valores del negocio que ajustas sin tocar código.</p>
          </div>
        </div>

        {/* Secciones como acordeón (varias abiertas a la vez). Precio va primero — toca Stripe → tarjeta dedicada. */}
        <div className="flex flex-col gap-2.5">
          <TarjetaPrecioMembresia abierto={abiertas.has('precio')} onToggle={() => alternar('precio')} />

          {isLoading ? (
            <EstadoSeccion variante="cargando" icono={SlidersHorizontal} titulo="Cargando configuración…" />
          ) : isError ? (
            <EstadoSeccion
              variante="error"
              icono={SlidersHorizontal}
              titulo="No se pudo cargar la configuración."
              descripcion="Revisa tu conexión e inténtalo de nuevo."
            />
          ) : items.length === 0 ? (
            <EstadoSeccion icono={SlidersHorizontal} titulo="Sin valores configurables" />
          ) : (
            categorias.map((cat) => {
              const filas = porCategoria.get(cat)!;
              return (
                <PanelAcordeon
                  key={cat}
                  id={cat}
                  titulo={ETIQUETA_CATEGORIA[cat] ?? cat}
                  Icono={ICONO_CATEGORIA[cat] ?? SlidersHorizontal}
                  resumen={`${filas.length} ${filas.length === 1 ? 'ajuste' : 'ajustes'}`}
                  abierto={abiertas.has(cat)}
                  onToggle={() => alternar(cat)}
                >
                  <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2 2xl:grid-cols-2">
                    {filas.map((c) => (
                      <TarjetaConfig key={c.clave} c={c} onEditar={() => setFilaEditando(c)} />
                    ))}
                  </div>
                </PanelAcordeon>
              );
            })
          )}
        </div>
      </div>

      {filaEditando &&
        (filaEditando.tipo === 'json' ? (
          <DialogoEditarEscalera fila={filaEditando} onCerrar={() => setFilaEditando(null)} />
        ) : (
          <DialogoEditarNumero fila={filaEditando} onCerrar={() => setFilaEditando(null)} />
        ))}
    </div>
  );
}

export default SeccionConfiguracion;
