/**
 * SeccionConfiguracion.tsx
 * ========================
 * Sección "Configuración" del Panel (módulo 9, VER · Fase 1) — los valores dinámicos del negocio que
 * el SuperAdmin ajusta sin tocar código. Solo lectura por ahora; la edición (diálogos + editor de la
 * escalera) llega en Fase 2.
 *
 * Diseño tipo "ajustes" (Linear/Stripe/Notion): acordeón por categoría (horizontal en escritorio —
 * franjas que se ensanchan; vertical en móvil) con tarjetas-fila horizontales apiladas dentro de cada
 * sección abierta. La escalera (json) lleva su tabla de tramos debajo. Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/configuracion/SeccionConfiguracion.tsx
 */

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { SlidersHorizontal, Layers, Clock, Gift, Coins, Pencil, Megaphone, CalendarClock, type LucideProps } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useConfiguracion } from '../../hooks/queries/useConfiguracionAdmin';
import { parsearEscalera, parsearTramosCiudades, parsearPeriodos, type ConfigFila, type TramoEscalera, type TramoCiudades } from '../../services/configuracionService';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { DialogoEditarNumero, DialogoEditarEscalera } from './DialogosConfig';
import { DialogoEditarTramosCiudades } from './DialogoTramosCiudades';
import { DialogoEditarPeriodos } from './DialogoPeriodos';
import { TarjetaPrecioMembresia } from './TarjetaPrecioMembresia';
import { PanelAcordeon } from './PanelAcordeon';

/** Etiqueta legible de cada categoría de `configuracion_sistema`. */
const ETIQUETA_CATEGORIA: Record<string, string> = {
  pagos: 'Pagos y comisiones',
  trials: 'Prueba y gracia',
  promociones: 'Promociones',
  transacciones: 'Transacciones',
  notificaciones: 'Notificaciones',
  seguridad: 'Seguridad',
  general: 'General',
  publicidad: 'Publicidad',
};

/**
 * Reagrupación de UI: muestra una clave en un grupo distinto a su `categoria` real en BD (sin tocar la
 * BD). `periodo_gracia_cobro_dias` vive en `pagos` pero se presenta junto al trial ("Prueba y gracia").
 */
const GRUPO_UI: Record<string, string> = {
  periodo_gracia_cobro_dias: 'trials',
};

/** Ícono semántico por clave (sobrio, sin círculo pastel — Regla 13). */
const ICONO_CLAVE: Record<string, ComponentType<LucideProps>> = {
  comision_escalera: Layers,
  periodo_gracia_cobro_dias: Clock,
  trial_duracion_dias: Gift,
  publicidad_periodos: CalendarClock,
};

/** Ícono por categoría — encabeza la barra de cada acordeón. */
const ICONO_CATEGORIA: Record<string, ComponentType<LucideProps>> = {
  pagos: Coins,
  trials: Gift,
  publicidad: Megaphone,
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

/** Tramos de la escalera apilados (un tramo por fila, uno arriba del otro). */
function TablaEscalera({ valor }: { valor: string }) {
  const tramos = parsearEscalera(valor);
  if (tramos.length === 0) return <p className="text-[13px] text-texto-4">Escalera sin definir.</p>;
  return (
    <div className="flex flex-col gap-2">
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

function rangoCiudades(t: TramoCiudades): string {
  return t.max === null ? `${t.min}+` : t.min === t.max ? `${t.min}` : `${t.min} – ${t.max}`;
}

/** Tramos del multiplicador por ciudades de Publicidad, apilados (modo lectura en la tarjeta). */
function TablaTramosCiudades({ valor }: { valor: string }) {
  const tramos = parsearTramosCiudades(valor);
  if (tramos.length === 0) return <p className="text-[13px] text-texto-4">Sin definir.</p>;
  return (
    <div className="flex flex-col gap-2">
      {tramos.map((t, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5">
          <span className="text-[13px] text-texto-2">{rangoCiudades(t)} {t.min === 1 && t.max === 1 ? 'ciudad' : 'ciudades'}</span>
          <span className="text-[15px] font-semibold leading-none text-texto">×{t.factor}</span>
        </div>
      ))}
    </div>
  );
}

/** Periodos de meses por adelantado de Publicidad, apilados (modo lectura en la tarjeta). */
function TablaPeriodos({ valor }: { valor: string }) {
  const periodos = [...parsearPeriodos(valor)].sort((a, b) => a.meses - b.meses);
  if (periodos.length === 0) return <p className="text-[13px] text-texto-4">Sin definir.</p>;
  return (
    <div className="flex flex-col gap-2">
      {periodos.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5">
          <span className="text-[13px] text-texto-2">{p.meses} {p.meses === 1 ? 'mes' : 'meses'}</span>
          <span className="text-[15px] font-semibold leading-none" style={{ color: p.descuento > 0 ? 'var(--panel-ok)' : 'var(--panel-text-4)' }}>
            {p.descuento > 0 ? `−${p.descuento}%` : 'base'}
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
 * Tarjeta (fila) de un valor configurable, en formato horizontal:
 *  - Escalera (json) → identidad + Editar arriba, tabla de tramos debajo.
 *  - Valor simple    → ícono · identidad a la izquierda · valor + Editar a la derecha.
 */
function TarjetaConfig({ c, onEditar }: { c: ConfigFila; onEditar: () => void }) {
  const Icono = ICONO_CLAVE[c.clave] ?? SlidersHorizontal;
  const esTabla = c.tipo === 'json' || c.tipo === 'tramos_ciudades' || c.tipo === 'periodos_meses';
  const tieneRango = c.min !== null || c.max !== null;

  if (esTabla) {
    return (
      <div className="rounded-[12px] border border-borde bg-superficie px-4 py-4" data-testid={`config-${c.clave}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
          <div className="flex items-start gap-3 lg:min-w-0 lg:flex-1">
            <CajaIcono Icono={Icono} tam={32} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-[14.5px] font-semibold text-texto">{c.etiqueta}</h4>
                {!c.sembrado && <BadgePorDefecto />}
              </div>
              <p className="mt-0.5 text-[13px] leading-relaxed text-texto-3">{c.descripcion}</p>
            </div>
          </div>
          <div className="flex justify-end lg:shrink-0 lg:self-center">
            <BotonEditar clave={c.clave} onEditar={onEditar} />
          </div>
        </div>
        <div className="mt-3">
          {c.tipo === 'json' ? <TablaEscalera valor={c.valor} /> : c.tipo === 'tramos_ciudades' ? <TablaTramosCiudades valor={c.valor} /> : <TablaPeriodos valor={c.valor} />}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-borde bg-superficie px-4 py-4" data-testid={`config-${c.clave}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
        {/* Identidad (texto a todo el ancho en móvil) */}
        <div className="flex items-start gap-3 lg:min-w-0 lg:flex-1">
          <CajaIcono Icono={Icono} tam={32} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[14.5px] font-semibold text-texto">{c.etiqueta}</h4>
              {!c.sembrado && <BadgePorDefecto />}
            </div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-texto-3">{c.descripcion}</p>
          </div>
        </div>
        {/* Valor + Editar (fila propia en móvil) */}
        <div className="flex items-center justify-between gap-3 lg:shrink-0 lg:justify-end lg:self-center">
          <div className="flex flex-col gap-1 lg:items-end">
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
    </div>
  );
}

export function SeccionConfiguracion() {
  const esEscritorio = useEsEscritorio();
  const { data, isLoading, isError } = useConfiguracion();
  const [filaEditando, setFilaEditando] = useState<ConfigFila | null>(null);

  // Acordeón: una sección activa a la vez (en horizontal siempre hay una abierta; en móvil se puede
  // colapsar tocando la activa). Al entrar, "Precio" (la primera).
  const [activa, setActiva] = useState<string>('precio');
  const cambiarSeccion = (id: string) =>
    setActiva((prev) => (!esEscritorio && prev === id ? '' : id));

  const scrollRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : scrollRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  const items = data ?? [];
  const categorias: string[] = [];
  const porCategoria = new Map<string, ConfigFila[]>();
  const agregar = (grupo: string, c: ConfigFila) => {
    if (!porCategoria.has(grupo)) {
      porCategoria.set(grupo, []);
      categorias.push(grupo);
    }
    porCategoria.get(grupo)!.push(c);
  };
  // 1ª pasada: cada clave en su categoría real (las reubicadas se omiten aquí).
  for (const c of items) {
    if (!GRUPO_UI[c.clave]) agregar(c.categoria, c);
  }
  // 2ª pasada: las reubicadas se añaden al final de su grupo destino.
  for (const c of items) {
    const grupo = GRUPO_UI[c.clave];
    if (grupo) agregar(grupo, c);
  }

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto w-full max-w-[1180px]">
        {/* Acordeón horizontal en escritorio (franjas que se ensanchan) / vertical en móvil. Precio va
            primero — toca Stripe → tarjeta dedicada. Una sección activa a la vez. */}
        <div className={esEscritorio ? 'flex items-stretch justify-center gap-2.5' : 'flex flex-col gap-2.5'}>
          <TarjetaPrecioMembresia
            activa={activa === 'precio'}
            onActivar={() => cambiarSeccion('precio')}
            horizontal={esEscritorio}
          />

          {isLoading ? (
            <div className="flex-1">
              <EstadoSeccion variante="cargando" icono={SlidersHorizontal} titulo="Cargando configuración…" />
            </div>
          ) : isError ? (
            <div className="flex-1">
              <EstadoSeccion
                variante="error"
                icono={SlidersHorizontal}
                titulo="No se pudo cargar la configuración."
                descripcion="Revisa tu conexión e inténtalo de nuevo."
              />
            </div>
          ) : items.length === 0 ? (
            <div className="flex-1">
              <EstadoSeccion icono={SlidersHorizontal} titulo="Sin valores configurables" />
            </div>
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
                  activa={activa === cat}
                  onActivar={() => cambiarSeccion(cat)}
                  horizontal={esEscritorio}
                >
                  <div className="flex flex-col gap-2.5">
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
        ) : filaEditando.tipo === 'tramos_ciudades' ? (
          <DialogoEditarTramosCiudades fila={filaEditando} onCerrar={() => setFilaEditando(null)} />
        ) : filaEditando.tipo === 'periodos_meses' ? (
          <DialogoEditarPeriodos fila={filaEditando} onCerrar={() => setFilaEditando(null)} />
        ) : (
          <DialogoEditarNumero
            fila={filaEditando}
            Icono={ICONO_CLAVE[filaEditando.clave] ?? SlidersHorizontal}
            onCerrar={() => setFilaEditando(null)}
          />
        ))}
    </div>
  );
}

export default SeccionConfiguracion;
