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
import { ChevronLeft, ChevronRight, ArrowUpDown, Megaphone, LayoutGrid, CircleDot, Tag, MapPin, Plus, DollarSign, MousePointerClick, AlarmClock, type LucideIcon } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { usePublicidad, usePrefetchPublicidad, useKpisPublicidad } from '../../hooks/queries/usePublicidadAdmin';
import type { OrdenPublicidad, PublicidadFila, EstadoPublicidad, Carrusel, OrigenPublicidad } from '../../services/publicidadService';
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
// es una opción de filtro. El chip "Pendiente de pago" se conserva en presentacionPublicidad por si
// algún día se decide mostrarlos.
const OPCIONES_ESTADO: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todos los estados' },
  { valor: 'activa', etiqueta: 'Activa' },
  { valor: 'pausada', etiqueta: 'Pausada' },
  { valor: 'expirada', etiqueta: 'Expirada' },
  { valor: 'cancelada', etiqueta: 'Cancelada' },
];

const OPCIONES_CARRUSEL: OpcionMenu[] = [
  { valor: '', etiqueta: 'Todos los tamaños' },
  { valor: 'patrocinadores', etiqueta: 'Grande' },
  { valor: 'anuncios', etiqueta: 'Chico' },
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
      carrusel: (carrusel || undefined) as Carrusel | undefined,
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

  const ficha = seleccionado ? <FichaPublicidad previo={seleccionado} rol={rol} onCerrar={() => setSeleccionado(null)} /> : null;
  const dialogoAlta = altaAbierta ? <DialogoAltaManual rol={rol} onCerrar={() => setAltaAbierta(false)} /> : null;

  // Móvil: banda de tarjetas (2×2). Escritorio: KPIs compactos inline en la misma fila que los filtros.
  const bandaKpis = (
    <div className="mb-3 grid shrink-0 grid-cols-2 gap-2.5">
      <TarjetaKpi testid="kpi-pub-activos" icono={Megaphone} etiqueta="Activos" valor={FMT_NUM.format(kpis?.activos ?? 0)} />
      <TarjetaKpi testid="kpi-pub-ingresos" icono={DollarSign} etiqueta="Ingresos" valor={FMT_MONEDA.format(kpis?.ingresos ?? 0)} acento="ok" />
      <TarjetaKpi testid="kpi-pub-clics" icono={MousePointerClick} etiqueta="Clics" valor={FMT_NUM.format(kpis?.clics ?? 0)} />
      <TarjetaKpi testid="kpi-pub-porvencer" icono={AlarmClock} etiqueta="Por vencer" valor={FMT_NUM.format(kpis?.porVencer ?? 0)} acento={(kpis?.porVencer ?? 0) > 0 ? 'warn' : undefined} />
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
              opciones={OPCIONES_ESTADO}
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
            opciones={OPCIONES_CARRUSEL}
            valor={carrusel}
            onCambiar={setCarrusel}
            alineacion="derecha"
            soloIcono
          />
          <MenuFiltro
            testid="publicidad-filtro-origen"
            icono={<Tag size={18} />}
            etiquetaBoton={etiquetaOrigen}
            opciones={OPCIONES_ORIGEN}
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-marca text-marca-contraste"
          >
            <Plus size={18} />
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
            opciones={OPCIONES_ESTADO}
            valor={estado}
            onCambiar={setEstado}
            anchoMenu={210}
            tam="chip"
          />
          <MenuFiltro
            testid="publicidad-filtro-carrusel"
            icono={<LayoutGrid size={16} />}
            etiquetaBoton={etiquetaCarrusel}
            opciones={OPCIONES_CARRUSEL}
            valor={carrusel}
            onCambiar={setCarrusel}
            anchoMenu={230}
            tam="chip"
          />
          <MenuFiltro
            testid="publicidad-filtro-origen"
            icono={<Tag size={16} />}
            etiquetaBoton={etiquetaOrigen}
            opciones={OPCIONES_ORIGEN}
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
            className="inline-flex items-center gap-1.5 rounded-full bg-marca px-3.5 py-1.5 text-[12.5px] font-semibold text-marca-contraste transition hover:opacity-90"
          >
            <Plus size={15} /> Registrar
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

function TarjetaKpi({
  icono: Icono,
  etiqueta,
  valor,
  acento,
  testid,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor: string;
  acento?: 'ok' | 'warn';
  testid: string;
}) {
  const claseValor = acento === 'warn' ? 'text-amber-600' : acento === 'ok' ? '' : 'text-texto';
  const styleValor = acento === 'ok' ? { color: 'var(--panel-ok)' } : undefined;
  return (
    <div data-testid={testid} className="flex items-center gap-3 rounded-[12px] border border-borde bg-superficie p-3 lg:p-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
        <Icono size={17} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</span>
        <span className={`truncate text-[19px] font-bold leading-tight lg:text-[21px] ${claseValor}`} style={styleValor}>{valor}</span>
      </span>
    </div>
  );
}

/** KPI compacto en línea (etiqueta arriba, valor abajo) — para la fila de filtros en escritorio. */
function KpiInline({ etiqueta, valor, acento, testid }: { etiqueta: string; valor: string; acento?: 'ok' | 'warn'; testid: string }) {
  const claseValor = acento === 'warn' ? 'text-amber-600' : acento === 'ok' ? '' : 'text-texto';
  const styleValor = acento === 'ok' ? { color: 'var(--panel-ok)' } : undefined;
  return (
    <div data-testid={testid} className="flex flex-col justify-center px-4 leading-tight first:pl-0">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</span>
      <span className={`text-[19px] font-bold leading-tight ${claseValor}`} style={styleValor}>{valor}</span>
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
