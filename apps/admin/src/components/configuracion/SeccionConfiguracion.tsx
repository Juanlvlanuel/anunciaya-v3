/**
 * SeccionConfiguracion.tsx
 * ========================
 * Sección "Configuración" del Panel (módulo 9, VER · Fase 1) — los valores dinámicos del negocio que
 * el SuperAdmin ajusta sin tocar código. Solo lectura por ahora; la edición (diálogos + editor de la
 * escalera) llega en Fase 2.
 *
 * Diseño tipo "ajustes" (Linear/Stripe/Notion): dos PESTAÑAS (mismo patrón que Métricas — subrayado bajo
 * la activa) que reparten el peso del módulo:
 *   - Membresía → precio (Stripe), pagos y comisiones, prueba y gracia (lo poco de cada uno, junto).
 *   - Publicidad → los 9 ajustes de la pauta (precios de carruseles, multiplicador, combo, límites…).
 * Dentro de cada pestaña, las tarjetas van en rejilla de 2 columnas en escritorio (las "tablas" —escalera,
 * multiplicador por ciudades, periodos— ocupan el ancho completo). Tokens: `Tokens_Panel.md`.
 *
 * Ubicación: apps/admin/src/components/configuracion/SeccionConfiguracion.tsx
 */

import { useEffect, useRef, useState, type ComponentType } from 'react';
import { SlidersHorizontal, Layers, Clock, Gift, Coins, Pencil, Megaphone, CalendarClock, Tag, Star, Award, type LucideProps } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useConfiguracion } from '../../hooks/queries/useConfiguracionAdmin';
import { parsearEscalera, parsearTramosCiudades, parsearPeriodos, type ConfigFila, type TramoEscalera, type TramoCiudades } from '../../services/configuracionService';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { DialogoEditarNumero, DialogoEditarEscalera } from './DialogosConfig';
import { DialogoEditarTramosCiudades } from './DialogoTramosCiudades';
import { DialogoEditarPeriodos } from './DialogoPeriodos';
import { TarjetaPrecioMembresia } from './TarjetaPrecioMembresia';

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

/** Azul de marca SOLO en los títulos de sección (encabezados). Las tarjetas individuales van en gris
 *  neutro. Los carruseles llevan su propio color de identidad (ver META_CARRUSEL). */
const AZUL = 'bg-marca';
const GRIS = 'bg-slate-400';
const ACENTO_GRUPO: Record<string, string> = {
  precio: AZUL,
  pagos: AZUL,
  trials: AZUL,
  carruseles: AZUL,
  reglas: AZUL,
};
const ACENTO_CLAVE: Record<string, string> = {
  comision_escalera: GRIS,
  comision_alta_monto: GRIS,
  trial_duracion_dias: GRIS,
  periodo_gracia_cobro_dias: GRIS,
  publicidad_tramos_ciudades: GRIS,
  publicidad_combo_descuento: GRIS,
  publicidad_limite_ciudades: GRIS,
  publicidad_duracion_dias: GRIS,
  publicidad_aviso_dias: GRIS,
  publicidad_periodos: GRIS,
};

/** Ícono por categoría — encabeza la barra de cada acordeón. */
const ICONO_CATEGORIA: Record<string, ComponentType<LucideProps>> = {
  pagos: Coins,
  trials: Gift,
  publicidad: Megaphone,
};

/** Chip de color con el ícono en blanco. `color` es una clase de fondo (bg-*). */
function CajaIcono({ Icono, tam = 36, color = 'bg-slate-400' }: { Icono: ComponentType<LucideProps>; tam?: number; color?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-[10px] text-white ${color}`}
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
        <div key={i} className="flex items-center justify-between gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2">
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
        <div key={i} className="flex items-center justify-between gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2">
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
        <div key={i} className="flex items-center justify-between gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2">
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
      <div className="rounded-[12px] border border-borde bg-superficie px-4 py-4 shadow-tarjeta-panel" data-testid={`config-${c.clave}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
          <div className="flex items-start gap-3 lg:min-w-0 lg:flex-1">
            <CajaIcono Icono={Icono} tam={32} color={ACENTO_CLAVE[c.clave] ?? 'bg-slate-400'} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-[14.5px] font-semibold text-texto">{c.etiqueta}</h4>
                {!c.sembrado && <BadgePorDefecto />}
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-texto-3">{c.descripcion}</p>
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
    <div className="rounded-[12px] border border-borde bg-superficie px-4 py-4 shadow-tarjeta-panel" data-testid={`config-${c.clave}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
        {/* Identidad (texto a todo el ancho en móvil) */}
        <div className="flex items-start gap-3 lg:min-w-0 lg:flex-1">
          <CajaIcono Icono={Icono} tam={32} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-[14.5px] font-semibold text-texto">{c.etiqueta}</h4>
              {!c.sembrado && <BadgePorDefecto />}
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-texto-3">{c.descripcion}</p>
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

/** Encabezado sobrio de un grupo de ajustes (ícono coloreado · título). */
function EncabezadoGrupo({ Icono, titulo, color }: { Icono: ComponentType<LucideProps>; titulo: string; color?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <CajaIcono Icono={Icono} tam={28} color={color} />
      <h3 className="text-[14px] font-semibold text-texto">{titulo}</h3>
    </div>
  );
}

/** Reordena para que las tarjetas "tabla" (más altas) queden al final del grupo y se emparejen entre sí
 *  en la rejilla, en vez de dejar un hueco junto a una tarjeta simple. `sort` es estable → preserva el
 *  orden de catálogo dentro de cada bloque (simples primero, tablas después). */
function tablasAlFinal(filas: ConfigFila[]): ConfigFila[] {
  const esTabla = (t: ConfigFila['tipo']) => t === 'json' || t === 'tramos_ciudades' || t === 'periodos_meses';
  return [...filas].sort((a, b) => Number(esTabla(a.tipo)) - Number(esTabla(b.tipo)));
}

/** Rejilla de tarjetas: dos columnas en escritorio (incluidas las tablas — escalera/tramos/periodos),
 *  alineadas arriba para que cada tarjeta conserve su alto; una sola columna en móvil. */
function RejillaConfig({ filas, onEditar }: { filas: ConfigFila[]; onEditar: (c: ConfigFila) => void }) {
  return (
    <div className="grid grid-cols-1 items-start gap-2.5 lg:grid-cols-2">
      {filas.map((c) => (
        <TarjetaConfig key={c.clave} c={c} onEditar={() => onEditar(c)} />
      ))}
    </div>
  );
}

/** Pila de tarjetas: una sola columna (tarjetas apiladas). Para grupos que viven dentro de una columna. */
function PilaConfig({ filas, onEditar }: { filas: ConfigFila[]; onEditar: (c: ConfigFila) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      {filas.map((c) => (
        <TarjetaConfig key={c.clave} c={c} onEditar={() => onEditar(c)} />
      ))}
    </div>
  );
}

/** Identidad visual de cada carrusel — mismo ícono y acento que el wizard del anunciante (apps/web,
 *  PaginaAnunciate.tsx) para que el super reconozca el espacio que está poniendo precio. */
// Orden por PARES: cada tamaño seguido de su precio de lanzamiento (el grid de 2 columnas los empareja
// en la misma fila → base a la izquierda, su lanzamiento a la derecha).
const META_CARRUSEL: Record<string, { nombre: string; Icono: typeof Megaphone; acento: string }> = {
  publicidad_precio_anuncios: { nombre: 'Chico', Icono: Megaphone, acento: 'bg-amber-500' },
  publicidad_precio_lanzamiento_anuncios: { nombre: 'Lanzamiento · Chico', Icono: Tag, acento: 'bg-emerald-500' },
  publicidad_precio_patrocinadores: { nombre: 'Grande', Icono: Star, acento: 'bg-blue-600' },
  publicidad_precio_lanzamiento_patrocinadores: { nombre: 'Lanzamiento · Grande', Icono: Tag, acento: 'bg-emerald-500' },
  publicidad_precio_fundadores: { nombre: 'Fundadores', Icono: Award, acento: 'bg-violet-600' },
};

const CLAVES_PRECIO_CARRUSEL = Object.keys(META_CARRUSEL);

/** Tarjeta compacta de un precio de carrusel (ícono+nombre del carrusel · qué es · precio · Editar).
 *  Pensada para ir de a tres en fila — calco del paso "Elige dónde aparecer" del anunciante. */
function TarjetaPrecioCarrusel({ c, onEditar }: { c: ConfigFila; onEditar: () => void }) {
  const meta = META_CARRUSEL[c.clave];
  const Icono = meta?.Icono ?? Megaphone;
  return (
    <div className="flex flex-col rounded-[12px] border border-borde bg-superficie px-4 py-4 shadow-tarjeta-panel" data-testid={`config-${c.clave}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="flex items-center gap-2">
          <CajaIcono Icono={Icono} tam={28} color={meta?.acento ?? 'bg-slate-400'} />
          <h4 className="text-[14px] font-semibold text-texto">{meta?.nombre ?? c.etiqueta}</h4>
        </span>
        {!c.sembrado && <BadgePorDefecto />}
      </div>
      <p className="mt-1 text-[12.5px] leading-snug text-texto-3">{c.descripcion}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[22px] font-bold leading-none text-texto">{c.valor}</span>
          {c.unidad && <span className="text-[12px] text-texto-3">{c.unidad}</span>}
        </div>
        <BotonEditar clave={c.clave} onEditar={onEditar} />
      </div>
    </div>
  );
}

type TabId = 'membresia' | 'publicidad';

const TABS: { id: TabId; etiqueta: string }[] = [
  { id: 'membresia', etiqueta: 'Membresía' },
  { id: 'publicidad', etiqueta: 'Publicidad' },
];

export function SeccionConfiguracion() {
  const esEscritorio = useEsEscritorio();
  const { data, isLoading, isError } = useConfiguracion();
  const [filaEditando, setFilaEditando] = useState<ConfigFila | null>(null);
  const [tab, setTab] = useState<TabId>('membresia');

  // Auto-ocultar la barra inferior (móvil) al hacer scroll: registra el contenedor scrolleable.
  const scrollRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : scrollRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  // Agrupa por categoría de UI (periodo_gracia se reubica a "trials" vía GRUPO_UI).
  const items = data ?? [];
  const porCategoria = new Map<string, ConfigFila[]>();
  const agregar = (grupo: string, c: ConfigFila) => {
    if (!porCategoria.has(grupo)) porCategoria.set(grupo, []);
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
  const pagos = porCategoria.get('pagos') ?? [];
  const trials = porCategoria.get('trials') ?? [];
  const publicidad = porCategoria.get('publicidad') ?? [];
  // Los 3 precios de carrusel van en su propia fila de tarjetas compactas; el resto, en la rejilla normal.
  const preciosCarrusel = publicidad
    .filter((c) => CLAVES_PRECIO_CARRUSEL.includes(c.clave))
    .sort((a, b) => CLAVES_PRECIO_CARRUSEL.indexOf(a.clave) - CLAVES_PRECIO_CARRUSEL.indexOf(b.clave));
  const reglasPublicidad = publicidad.filter((c) => !CLAVES_PRECIO_CARRUSEL.includes(c.clave));

  // Estado de los grupos que dependen de la API. El Precio usa su propio hook (precargado) → se muestra
  // siempre, aunque la lista aún esté cargando.
  const estadoDatos = isLoading ? (
    <EstadoSeccion variante="cargando" icono={SlidersHorizontal} titulo="Cargando configuración…" />
  ) : isError ? (
    <EstadoSeccion
      variante="error"
      icono={SlidersHorizontal}
      titulo="No se pudo cargar la configuración."
      descripcion="Revisa tu conexión e inténtalo de nuevo."
    />
  ) : null;

  return (
    <div ref={scrollRef} className="h-full min-h-0 overflow-y-auto p-4 lg:p-6">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 lg:gap-6">
        {/* Pestañas (mismo patrón que Métricas: subrayado bajo la activa). */}
        <div className="flex gap-5 border-b border-borde">
          {TABS.map((t) => {
            const activo = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`config-tab-${t.id}`}
                data-active={activo}
                onClick={() => setTab(t.id)}
                className={`relative px-0.5 pb-2.5 pt-1 text-[13.5px] font-semibold transition ${activo ? 'text-texto' : 'text-texto-3 hover:text-texto-2'}`}
              >
                {t.etiqueta}
                {activo && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-marca" />}
              </button>
            );
          })}
        </div>

        {/* MEMBRESÍA: precio (Stripe) + pagos y comisiones + prueba y gracia. */}
        {tab === 'membresia' && (
          <div className="flex flex-col gap-7" data-testid="config-vista-membresia">
            <section>
              <EncabezadoGrupo Icono={Tag} titulo="Precio de la membresía" color={ACENTO_GRUPO.precio} />
              <TarjetaPrecioMembresia />
            </section>

            {estadoDatos ?? (
              <div className="grid grid-cols-1 items-start gap-x-6 gap-y-7 lg:grid-cols-2">
                {pagos.length > 0 && (
                  <section>
                    <EncabezadoGrupo Icono={ICONO_CATEGORIA.pagos ?? SlidersHorizontal} titulo={ETIQUETA_CATEGORIA.pagos} color={ACENTO_GRUPO.pagos} />
                    <PilaConfig filas={pagos} onEditar={setFilaEditando} />
                  </section>
                )}
                {trials.length > 0 && (
                  <section>
                    <EncabezadoGrupo Icono={ICONO_CATEGORIA.trials ?? SlidersHorizontal} titulo={ETIQUETA_CATEGORIA.trials} color={ACENTO_GRUPO.trials} />
                    <PilaConfig filas={trials} onEditar={setFilaEditando} />
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* PUBLICIDAD: precios de los carruseles (fila de 3) + reglas y límites (rejilla de 2). */}
        {tab === 'publicidad' && (
          <div data-testid="config-vista-publicidad">
            {estadoDatos ??
              (publicidad.length === 0 ? (
                <EstadoSeccion icono={Megaphone} titulo="Sin ajustes de publicidad" />
              ) : (
                <div className="flex flex-col gap-7">
                  {preciosCarrusel.length > 0 && (
                    <section>
                      <EncabezadoGrupo Icono={Tag} titulo="Precios por tamaño" color={ACENTO_GRUPO.carruseles} />
                      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                        {preciosCarrusel.map((c) => (
                          <TarjetaPrecioCarrusel key={c.clave} c={c} onEditar={() => setFilaEditando(c)} />
                        ))}
                      </div>
                    </section>
                  )}
                  {reglasPublicidad.length > 0 && (
                    <section>
                      <EncabezadoGrupo Icono={SlidersHorizontal} titulo="Reglas y límites" color={ACENTO_GRUPO.reglas} />
                      <RejillaConfig filas={tablasAlFinal(reglasPublicidad)} onEditar={setFilaEditando} />
                    </section>
                  )}
                </div>
              ))}
          </div>
        )}
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
