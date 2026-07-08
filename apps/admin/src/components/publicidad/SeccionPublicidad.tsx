/**
 * SeccionPublicidad.tsx
 * =====================
 * Sección Publicidad del Panel (módulo 7) — lectura (Fase 1). Lista de anuncios vendidos
 * (compras): anunciante, carrusel(es), ciudades, estado y vigencia. Calcada de
 * SeccionAuditoria (solo lectura; sin acciones aún — llegan en Fase 2).
 *   - Escritorio (lg:+): total + filtros (estado, carrusel, origen, orden) + tabla + paginación.
 *   - Móvil: filtros (icono) + cards + paginación.
 *
 * Alcance por rol lo aplica el backend (super = todo · gerente = anuncios con ≥1 ciudad en su
 * región · vendedor 403). Orden y paginado corren en servidor.
 *
 * Ubicación: apps/admin/src/components/publicidad/SeccionPublicidad.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Megaphone, LayoutGrid, CircleDot, Tag, MapPin, Plus, MousePointerClick } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { usePublicidad, usePrefetchPublicidad, useKpisPublicidad } from '../../hooks/queries/usePublicidadAdmin';
import type { OrdenPublicidad, PublicidadFila, EstadoPublicidad, FiltroTamano, OrigenPublicidad } from '../../services/publicidadService';
import { MenuFiltro, type OpcionMenu } from '../negocios/MenuFiltro';
import { AvatarUsuario } from '../usuarios/avataresUsuario';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { FichaPublicidad } from './FichaPublicidad';
import { DialogoAltaManual } from './DialogoAltaManual';
import { ESTADO_LABEL, ESTADO_DOT, textoCarruseles, fechaCorta } from './presentacionPublicidad';

const POR_PAGINA = 20;

const FMT_MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const FMT_NUM = new Intl.NumberFormat('es-MX');

// 'pendiente' (checkout sin pagar) se oculta del Panel (backend lo excluye del listado), así que no
// es una opción de filtro. Las opciones del dropdown de estado llevan punto de color + badge de
// conteo (estilo chip dentro del menú); el `conteo` se inyecta en runtime desde data.conteos.
const OPCIONES_ESTADO: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todos los estados', color: 'var(--panel-brand)' },
  { valor: 'activa', etiqueta: 'Activa', color: 'var(--panel-ok)' },
  { valor: 'pausada', etiqueta: 'Pausada', color: 'var(--panel-warn)' },
  { valor: 'expirada', etiqueta: 'Expirada', color: 'var(--panel-text-4)' },
  { valor: 'cancelada', etiqueta: 'Cancelada', color: 'var(--panel-danger)' },
];

// Tamaños EXCLUYENTES: Grande (solo) · Chico (solo) · Combo (paquete). Sin punto de color — no hay
// color semántico para "tamaño" (Regla 13); llevan solo el badge de conteo dentro del menú.
const OPCIONES_CARRUSEL: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todos los tamaños' },
  { valor: 'patrocinadores', etiqueta: 'Grande' },
  { valor: 'anuncios', etiqueta: 'Chico' },
  { valor: 'combo', etiqueta: 'Combo' },
];

const OPCIONES_ORIGEN: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todos los orígenes' },
  { valor: 'self', etiqueta: 'En línea' },
  { valor: 'manual', etiqueta: 'Manual' },
  { valor: 'cortesia', etiqueta: 'Cortesía' },
];

const OPCIONES_ORDEN: { valor: OrdenPublicidad; etiqueta: string }[] = [
  { valor: 'recientes', etiqueta: 'Recientes' },
  { valor: 'antiguos', etiqueta: 'Antiguos' },
  { valor: 'vencimiento', etiqueta: 'Por vencer' },
  { valor: 'estado', etiqueta: 'Estado' },
];

export function SeccionPublicidad({ rol }: { rol: RolPanel }) {
  const esEscritorio = useEsEscritorio();

  const [estado, setEstado] = useState('');
  const [carrusel, setCarrusel] = useState('');
  const [origen, setOrigen] = useState('');
  const [orden, setOrden] = useState<OrdenPublicidad>('recientes');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<PublicidadFila | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const prefetch = usePrefetchPublicidad();

  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  useEffect(() => {
    setPagina(1);
  }, [estado, carrusel, origen, orden]);

  const filtros = useMemo(
    () => ({
      estado: (estado || undefined) as EstadoPublicidad | undefined,
      carrusel: (carrusel || undefined) as FiltroTamano | undefined,
      origen: (origen || undefined) as OrigenPublicidad | undefined,
      orden,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [estado, carrusel, origen, orden, pagina],
  );

  const { data, isLoading, isError } = usePublicidad(filtros);
  const { data: kpis } = useKpisPublicidad();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const hayFiltro = !!(estado || carrusel || origen);
  const hayFiltrosActivos = hayFiltro || orden !== 'recientes';

  const limpiarFiltros = () => {
    setEstado('');
    setCarrusel('');
    setOrigen('');
    setOrden('recientes');
  };

  const etiquetaEstado = OPCIONES_ESTADO.find((o) => o.valor === estado)?.etiqueta ?? 'Todos los estados';
  const etiquetaCarrusel = OPCIONES_CARRUSEL.find((o) => o.valor === carrusel)?.etiqueta ?? 'Todos los tamaños';
  const etiquetaOrigen = OPCIONES_ORIGEN.find((o) => o.valor === origen)?.etiqueta ?? 'Todos los orígenes';
  const etiquetaOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.etiqueta ?? 'Recientes';

  // Opciones del dropdown de estado con el conteo por estado inyectado (badge dentro del menú).
  // conteos.porEstado se calcula en el backend sobre el mismo WHERE base que la tabla (sin el filtro de estado).
  const opcionesEstado = useMemo<OpcionMenu[]>(
    () =>
      OPCIONES_ESTADO.map((o) => ({
        ...o,
        conteo: o.valor === '' ? (data?.conteos.total ?? 0) : (data?.conteos.porEstado?.find((e) => e.estado === o.valor)?.total ?? 0),
      })),
    [data],
  );

  // Opciones del dropdown de tamaño con el conteo por tamaño inyectado (badge dentro del menú).
  // "Todos los tamaños" = suma de Grande+Chico+Combo (son excluyentes).
  const opcionesCarrusel = useMemo<OpcionMenu[]>(
    () =>
      OPCIONES_CARRUSEL.map((o) => ({
        ...o,
        conteo:
          o.valor === ''
            ? (data?.conteos.porTamano?.reduce((s, t) => s + t.total, 0) ?? 0)
            : (data?.conteos.porTamano?.find((t) => t.tamano === o.valor)?.total ?? 0),
      })),
    [data],
  );

  // Opciones del dropdown de origen con el conteo por origen inyectado. "Todos los orígenes" = total.
  const opcionesOrigen = useMemo<OpcionMenu[]>(
    () =>
      OPCIONES_ORIGEN.map((o) => ({
        ...o,
        conteo:
          o.valor === ''
            ? (data?.conteos.porOrigen?.reduce((s, r) => s + r.total, 0) ?? 0)
            : (data?.conteos.porOrigen?.find((r) => r.origen === o.valor)?.total ?? 0),
      })),
    [data],
  );

  const ficha = seleccionado ? <FichaPublicidad previo={seleccionado} rol={rol} onCerrar={() => setSeleccionado(null)} /> : null;
  const dialogoAlta = altaAbierta ? <DialogoAltaManual rol={rol} onCerrar={() => setAltaAbierta(false)} /> : null;

  // Móvil: KPIs en "tira" (etiqueta arriba + valor abajo, centrado) en carrusel horizontal — mismo
  // estilo que Suscripciones. Escritorio: KPIs compactos inline en la misma fila que los filtros.
  const bandaKpis = (
    <div className="mb-3 -mx-5 flex shrink-0 snap-x items-stretch overflow-x-auto px-5 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <KpiTira testid="kpi-pub-activos" etiqueta="Activos" valor={FMT_NUM.format(kpis?.activos ?? 0)} />
      <span className="w-px shrink-0 self-stretch bg-borde" />
      <KpiTira testid="kpi-pub-ingresos" etiqueta="Ingresos" valor={FMT_MONEDA.format(kpis?.ingresos ?? 0)} acento="ok" />
      <span className="w-px shrink-0 self-stretch bg-borde" />
      <KpiTira testid="kpi-pub-clics" etiqueta="Clics" valor={FMT_NUM.format(kpis?.clics ?? 0)} />
      <span className="w-px shrink-0 self-stretch bg-borde" />
      <KpiTira testid="kpi-pub-porvencer" etiqueta="Por vencer" valor={FMT_NUM.format(kpis?.porVencer ?? 0)} acento={(kpis?.porVencer ?? 0) > 0 ? 'warn' : undefined} />
    </div>
  );

  const kpisInline = (
    <div className="flex items-stretch divide-x divide-borde">
      <KpiInline testid="kpi-pub-activos" etiqueta="Activos" valor={FMT_NUM.format(kpis?.activos ?? 0)} />
      <KpiInline testid="kpi-pub-ingresos" etiqueta="Ingresos" valor={FMT_MONEDA.format(kpis?.ingresos ?? 0)} acento="ok" />
      <KpiInline testid="kpi-pub-clics" etiqueta="Clics" valor={FMT_NUM.format(kpis?.clics ?? 0)} />
      <KpiInline testid="kpi-pub-porvencer" etiqueta="Por vencer" valor={FMT_NUM.format(kpis?.porVencer ?? 0)} acento={(kpis?.porVencer ?? 0) > 0 ? 'warn' : undefined} />
    </div>
  );

  const vacioOError = isLoading ? (
    <EstadoSeccion variante="cargando" icono={Megaphone} titulo="Cargando publicidad…" />
  ) : isError ? (
    <EstadoSeccion
      variante="error"
      icono={Megaphone}
      titulo="No se pudo cargar la publicidad."
      descripcion="Revisa tu conexión e inténtalo de nuevo."
    />
  ) : items.length === 0 ? (
    hayFiltrosActivos ? (
      <EstadoSeccion
        icono={Megaphone}
        titulo="Sin anuncios"
        descripcion="Ningún anuncio coincide con los filtros."
        accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }}
      />
    ) : (
      <EstadoSeccion icono={Megaphone} titulo="Aún no hay anuncios vendidos" />
    )
  ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col px-5 pt-4 pb-1.5">
        {bandaKpis}
        <div className="mb-2.5 flex shrink-0 items-center gap-2">
          <div className="flex-1">
            <MenuFiltro
              testid="publicidad-filtro-estado"
              icono={<CircleDot size={18} />}
              etiquetaBoton={etiquetaEstado}
              opciones={opcionesEstado}
              valor={estado}
              onCambiar={setEstado}
              alineacion="izquierda"
              anchoMenu={220}
            />
          </div>
          <MenuFiltro
            testid="publicidad-filtro-carrusel"
            icono={<LayoutGrid size={18} />}
            etiquetaBoton={etiquetaCarrusel}
            opciones={opcionesCarrusel}
            valor={carrusel}
            onCambiar={setCarrusel}
            alineacion="derecha"
            soloIcono
          />
          <MenuFiltro
            testid="publicidad-filtro-origen"
            icono={<Tag size={18} />}
            etiquetaBoton={etiquetaOrigen}
            opciones={opcionesOrigen}
            valor={origen}
            onCambiar={setOrigen}
            alineacion="derecha"
            soloIcono
          />
          <button
            type="button"
            data-testid="publicidad-registrar"
            onClick={() => setAltaAbierta(true)}
            aria-label="Registrar anuncio"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marca text-marca-contraste"
          >
            <Plus size={20} />
          </button>
        </div>

        <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
          {vacioOError ?? (
            <div className="flex flex-col gap-2.5">
              {items.map((r) => (
                <CardAnuncio key={r.id} r={r} onAbrir={() => setSeleccionado(r)} onPrefetch={() => prefetch(r.id)} />
              ))}
            </div>
          )}
        </div>

        {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
        {ficha}
        {dialogoAlta}
      </div>
    );
  }

  // ── Vista ESCRITORIO ────────────────────────────────────────────────────────
  const cols = 'minmax(190px,2fr) minmax(150px,1.5fr) 0.9fr 0.7fr 1fr 1.1fr 40px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {kpisInline}
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <MenuFiltro
            testid="publicidad-filtro-estado"
            icono={<CircleDot size={16} />}
            etiquetaBoton={etiquetaEstado}
            opciones={opcionesEstado}
            valor={estado}
            onCambiar={setEstado}
            anchoMenu={210}
            tam="chip"
          />
          <MenuFiltro
            testid="publicidad-filtro-carrusel"
            icono={<LayoutGrid size={16} />}
            etiquetaBoton={etiquetaCarrusel}
            opciones={opcionesCarrusel}
            valor={carrusel}
            onCambiar={setCarrusel}
            anchoMenu={230}
            tam="chip"
          />
          <MenuFiltro
            testid="publicidad-filtro-origen"
            icono={<Tag size={16} />}
            etiquetaBoton={etiquetaOrigen}
            opciones={opcionesOrigen}
            valor={origen}
            onCambiar={setOrigen}
            anchoMenu={210}
            tam="chip"
          />
          <MenuFiltro
            testid="publicidad-orden"
            icono={<ArrowUpDown size={15} />}
            etiquetaBoton={<>Ordenar: {etiquetaOrden}</>}
            opciones={OPCIONES_ORDEN.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
            valor={orden}
            onCambiar={(v) => setOrden(v as OrdenPublicidad)}
            anchoMenu={200}
            tam="chip"
          />
          <button
            type="button"
            data-testid="publicidad-registrar"
            onClick={() => setAltaAbierta(true)}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:shadow-marca/30 hover:brightness-[1.07] active:scale-95"
          >
            <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" /> Registrar
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde shadow-tarjeta-panel">
        <div
          className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
          style={{ gridTemplateColumns: cols }}
        >
          <span>Anunciante</span>
          <span>Carrusel</span>
          <span>Ciudades</span>
          <span>Clics</span>
          <span>Estado</span>
          <span>Vence</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {vacioOError ??
            items.map((r) => (
              <FilaAnuncio key={r.id} r={r} cols={cols} onAbrir={() => setSeleccionado(r)} onPrefetch={() => prefetch(r.id)} />
            ))}
        </div>
      </div>

      {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
      {ficha}
      {dialogoAlta}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

/** KPI en "tira" (móvil, carrusel): etiqueta uppercase arriba + valor abajo, centrado (estilo Suscripciones). */
function KpiTira({ etiqueta, valor, acento, testid }: { etiqueta: string; valor: string; acento?: 'ok' | 'warn'; testid: string }) {
  const color = acento === 'warn' ? 'var(--panel-warn)' : acento === 'ok' ? 'var(--panel-ok)' : 'var(--panel-text)';
  return (
    <div data-testid={testid} className="flex min-w-[90px] shrink-0 snap-start flex-col items-center px-3 text-center leading-tight">
      <span className="txt-badge whitespace-nowrap font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</span>
      <span className="mt-1 whitespace-nowrap text-[17px] font-bold" style={{ color }}>{valor}</span>
    </div>
  );
}

/** KPI compacto en línea (etiqueta arriba, valor abajo, centrado) — mismo patrón que Suscripciones. */
function KpiInline({ etiqueta, valor, acento, testid }: { etiqueta: string; valor: string; acento?: 'ok' | 'warn'; testid: string }) {
  const claseValor = acento === 'warn' ? 'text-amber-600' : acento === 'ok' ? '' : 'text-texto';
  const styleValor = acento === 'ok' ? { color: 'var(--panel-ok)' } : undefined;
  return (
    <div data-testid={testid} className="flex min-w-0 flex-col items-center justify-center px-5 text-center leading-tight">
      <span className="max-w-full truncate text-[11px] font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</span>
      <span className={`max-w-full truncate text-[22px] font-bold leading-tight ${claseValor}`} style={styleValor}>{valor}</span>
    </div>
  );
}

function EstadoChip({ estado }: { estado: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-texto-2">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ESTADO_DOT[estado] ?? 'bg-slate-400'}`} />
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  );
}

function Vence({ r }: { r: PublicidadFila }) {
  const venceTexto = fechaCorta(r.expiraAt);
  const dias = r.diasRestantes;
  const proximo = r.estado === 'activa' && dias != null && dias >= 0 && dias <= 5;
  return (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-[13px] text-texto-2">{venceTexto}</span>
      {proximo && <span className="text-[11.5px] font-medium text-amber-600">{dias === 0 ? 'Vence hoy' : `En ${dias} d`}</span>}
    </span>
  );
}

function FilaAnuncio({ r, cols, onAbrir, onPrefetch }: { r: PublicidadFila; cols: string; onAbrir: () => void; onPrefetch: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`publicidad-fila-${r.id}`}
      onClick={onAbrir}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onAbrir();
        }
      }}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="group grid w-full cursor-pointer items-center gap-3.5 border-b border-borde px-3 py-3 text-left transition last:border-b-0 hover:bg-marca-suave focus:bg-marca-suave focus:outline-none"
      style={{ gridTemplateColumns: cols }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <AvatarUsuario nombre={r.anuncianteNombre} avatarUrl={r.anuncianteAvatar} tam={38} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{r.anuncianteNombre}</span>
          {r.negocioNombre && <span className="truncate text-[12px] text-texto-4">{r.negocioNombre}</span>}
        </span>
      </span>
      <span className="min-w-0 truncate text-[13px] text-texto-2">{textoCarruseles(r.carruseles, r.esCombo)}</span>
      <span className="text-[13px] text-texto-2">{r.totalCiudades} {r.totalCiudades === 1 ? 'ciudad' : 'ciudades'}</span>
      <span className="inline-flex items-center gap-1 text-[13px] text-texto-2"><MousePointerClick size={14} className="text-texto-4" /> {r.clicksTotales}</span>
      <span className="min-w-0"><EstadoChip estado={r.estado} /></span>
      <span className="min-w-0"><Vence r={r} /></span>
      <span className="flex items-center justify-end text-texto-4">
        <ChevronRight size={17} />
      </span>
    </div>
  );
}

function CardAnuncio({ r, onAbrir, onPrefetch }: { r: PublicidadFila; onAbrir: () => void; onPrefetch: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`publicidad-card-${r.id}`}
      onClick={onAbrir}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onAbrir();
        }
      }}
      onTouchStart={onPrefetch}
      className="flex items-start gap-3 rounded-[14px] border border-borde bg-superficie p-3 text-left transition active:bg-marca-suave"
    >
      <AvatarUsuario nombre={r.anuncianteNombre} avatarUrl={r.anuncianteAvatar} tam={42} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[14px] font-semibold text-texto">{r.anuncianteNombre}</span>
        <span className="truncate text-[12.5px] text-texto-3">{textoCarruseles(r.carruseles, r.esCombo)}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <EstadoChip estado={r.estado} />
          <span className="inline-flex items-center gap-1 text-[12px] text-texto-4">
            <MapPin size={12} /> {r.totalCiudades}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-texto-4">
            <MousePointerClick size={12} /> {r.clicksTotales}
          </span>
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 self-center text-texto-4" />
    </div>
  );
}

function Paginacion({
  desde,
  hasta,
  total,
  pagina,
  totalPaginas,
  setPagina,
}: {
  desde: number;
  hasta: number;
  total: number;
  pagina: number;
  totalPaginas: number;
  setPagina: (fn: (p: number) => number) => void;
}) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-between text-[12.5px] text-texto-3 lg:pt-1">
      <span data-testid="publicidad-rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="publicidad-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">{pagina} / {totalPaginas}</span>
        <button
          type="button"
          data-testid="publicidad-siguiente"
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          disabled={pagina >= totalPaginas}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default SeccionPublicidad;
