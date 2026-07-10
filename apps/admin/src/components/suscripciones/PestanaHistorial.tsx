/**
 * PestanaHistorial.tsx
 * ====================
 * Pestaña "Historial" del módulo Suscripciones: las solicitudes de pago manual del comerciante
 * que YA se resolvieron (aprobadas / rechazadas). Es la trazabilidad de la VERIFICACIÓN de
 * comprobantes. NO incluye los "Registrar pago" del Panel (esos viven en la Bitácora + ficha).
 *
 * Estilo tabla (calcado de la Bitácora): alto FIJO (llena el espacio) con header de columnas +
 * filas scrolleables en escritorio, cards en móvil, y paginación fija abajo. El detalle completo
 * vive en un modal (FichaSolicitud). Filtro por estado con chips (punto de color + conteo).
 *
 * Ubicación: apps/admin/src/components/suscripciones/PestanaHistorial.tsx
 */

import { useState, type ReactNode } from 'react';
import { History, Check, X, Mail, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSolicitudesProcesadas } from '../../hooks/queries/useSuscripcionesAdmin';
import type { SolicitudProcesada } from '../../services/suscripcionesService';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { AvatarNegocio } from '../negocios/avatares';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { FichaSolicitud } from './FichaSolicitud';

const POR_PAGINA = 20;
const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

// 4 columnas alineadas header↔filas: negocio · monto · estado · revisado (+ chevron).
const COLS = 'minmax(200px,2.4fr) 1fr 1.1fr 1.2fr 28px';

type FiltroId = 'todos' | 'aprobado' | 'rechazado';

// Chips de filtro con punto de color + conteo (mismo patrón que Negocios/Usuarios).
const FILTROS: { id: FiltroId; label: string; color: string }[] = [
  { id: 'todos', label: 'Todos', color: 'var(--panel-brand)' },
  { id: 'aprobado', label: 'Aprobados', color: 'var(--panel-ok)' },
  { id: 'rechazado', label: 'Rechazados', color: 'var(--panel-danger)' },
];

export function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '');
}

export function montoTexto(m: string): string {
  const n = Number(m);
  return Number.isFinite(n) ? FMT_MONTO.format(n) : '—';
}

export function BadgeEstado({ estado, small }: { estado: 'aprobado' | 'rechazado'; small?: boolean }) {
  const esAprobado = estado === 'aprobado';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
        small ? 'text-[10.5px]' : 'text-[11px]'
      } ${
        esAprobado
          ? 'bg-[color-mix(in_srgb,var(--panel-ok)_14%,transparent)] text-ok'
          : 'bg-peligro-suave text-peligro'
      }`}
    >
      {esAprobado ? <Check size={11} /> : <X size={11} />}
      {esAprobado ? 'Aprobado' : 'Rechazado'}
    </span>
  );
}

export function PestanaHistorial() {
  const esEscritorio = useEsEscritorio();
  const [filtroId, setFiltroId] = useState<FiltroId>('todos');
  const [pagina, setPagina] = useState(1);
  const [seleccionada, setSeleccionada] = useState<SolicitudProcesada | null>(null);

  const estado = filtroId === 'todos' ? undefined : filtroId;
  const { data, isLoading, isError } = useSolicitudesProcesadas({ estado, pagina, porPagina: POR_PAGINA });
  const solicitudes = data?.solicitudes ?? [];
  const conteos = data?.conteos ?? { todos: 0, aprobados: 0, rechazados: 0 };
  const totalFiltro = filtroId === 'todos' ? conteos.todos : filtroId === 'aprobado' ? conteos.aprobados : conteos.rechazados;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltro / POR_PAGINA));
  const desde = totalFiltro === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, totalFiltro);

  const cambiarFiltro = (id: FiltroId) => {
    setFiltroId(id);
    setPagina(1);
  };

  const conteoDe = (id: FiltroId) =>
    id === 'todos' ? conteos.todos : id === 'aprobado' ? conteos.aprobados : conteos.rechazados;

  const chips = (
    <div className="flex flex-wrap items-center gap-2">
      {FILTROS.map((f) => {
        const activo = filtroId === f.id;
        return (
          <button
            key={f.id}
            type="button"
            data-testid={`historial-filtro-${f.id}`}
            onClick={() => cambiarFiltro(f.id)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave"
            style={
              activo
                ? {
                    background: `color-mix(in srgb, ${f.color} 12%, transparent)`,
                    borderColor: `color-mix(in srgb, ${f.color} 34%, transparent)`,
                    color: f.color,
                  }
                : undefined
            }
          >
            <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: f.color }} />
            {f.label}
            <span
              className="txt-badge min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold"
              style={
                activo
                  ? { background: `color-mix(in srgb, ${f.color} 22%, transparent)`, color: f.color }
                  : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }
              }
            >
              {conteoDe(f.id)}
            </span>
          </button>
        );
      })}
    </div>
  );

  const ficha = seleccionada ? <FichaSolicitud s={seleccionada} onCerrar={() => setSeleccionada(null)} /> : null;

  // Estado no-lista (carga / error / vacío) centrado dentro del área de tabla.
  let vacio: ReactNode = null;
  if (isLoading) {
    vacio = <EstadoSeccion variante="cargando" icono={History} titulo="Cargando historial…" />;
  } else if (isError) {
    vacio = (
      <EstadoSeccion
        variante="error"
        icono={History}
        titulo="No se pudo cargar el historial."
        descripcion="Revisa tu conexión e inténtalo de nuevo."
      />
    );
  } else if (solicitudes.length === 0) {
    vacio = (
      <EstadoSeccion
        icono={History}
        titulo="Sin solicitudes procesadas"
        descripcion="Aquí aparecerán los comprobantes que apruebes o rechaces."
      />
    );
  }

  const paginacion =
    totalFiltro > 0 ? (
      <Paginacion
        desde={desde}
        hasta={hasta}
        total={totalFiltro}
        pagina={pagina}
        totalPaginas={totalPaginas}
        setPagina={setPagina}
      />
    ) : null;

  // ── Móvil: cards, scroll heredado del contenedor de la sección (oculta la barra inferior) ──
  if (!esEscritorio) {
    return (
      <div data-testid="suscripciones-historial">
        <div className="mb-3">{chips}</div>
        {vacio ?? (
          <div className="flex flex-col gap-2.5">
            {solicitudes.map((s) => (
              <CardHistorial key={s.id} s={s} onAbrir={() => setSeleccionada(s)} />
            ))}
          </div>
        )}
        {paginacion}
        {ficha}
      </div>
    );
  }

  // ── Escritorio: tabla de alto FIJO (llena el espacio) + scroll interno + paginación fija ──
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="suscripciones-historial">
      <div className="mb-3 shrink-0">{chips}</div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde shadow-tarjeta-panel">
        {vacio ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">{vacio}</div>
        ) : (
          <>
            <div
              className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
              style={{ gridTemplateColumns: COLS }}
            >
              <span>Negocio</span>
              <span>Monto</span>
              <span>Estado</span>
              <span>Revisado</span>
              <span />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {solicitudes.map((s) => (
                <FilaHistorial key={s.id} s={s} onAbrir={() => setSeleccionada(s)} />
              ))}
            </div>
          </>
        )}
      </div>
      {paginacion}
      {ficha}
    </div>
  );
}

// =============================================================================
// FILA (escritorio) / CARD (móvil)
// =============================================================================

function FilaHistorial({ s, onAbrir }: { s: SolicitudProcesada; onAbrir: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`historial-fila-${s.id}`}
      onClick={onAbrir}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onAbrir();
        }
      }}
      className="grid w-full cursor-pointer items-center gap-3.5 border-b border-borde px-3 py-3 text-left transition last:border-b-0 hover:bg-marca-suave focus:bg-marca-suave focus:outline-none"
      style={{ gridTemplateColumns: COLS }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <AvatarNegocio nombre={s.negocioNombre} logoUrl={s.logoUrl} tam={38} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{s.negocioNombre}</span>
          <span className={`inline-flex items-center gap-1 text-[13px] ${s.correoDueno ? 'text-texto-3' : 'text-texto-4'}`}>
            <Mail size={12} className="shrink-0" />
            <span className="truncate">{s.correoDueno ?? 'Sin correo'}</span>
          </span>
        </span>
      </span>
      <span className="text-[13.5px] font-semibold text-texto">{montoTexto(s.monto)}</span>
      <span className="flex flex-col items-start gap-1">
        <BadgeEstado estado={s.estado} />
        {s.estado === 'aprobado' && s.pagoAnulado && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-peligro">
            <Ban size={10} className="shrink-0" /> Pago anulado
          </span>
        )}
      </span>
      <span className="text-[13px] text-texto-2">{fechaCorta(s.revisadoAt)}</span>
      <span className="flex justify-end text-texto-4">
        <ChevronRight size={17} />
      </span>
    </div>
  );
}

function CardHistorial({ s, onAbrir }: { s: SolicitudProcesada; onAbrir: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`historial-card-${s.id}`}
      onClick={onAbrir}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          onAbrir();
        }
      }}
      className="flex items-center gap-3 rounded-[14px] border border-borde bg-superficie p-3 text-left transition active:bg-marca-suave"
    >
      <AvatarNegocio nombre={s.negocioNombre} logoUrl={s.logoUrl} tam={42} />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate text-[14.5px] font-semibold text-texto">{s.negocioNombre}</span>
        <span className="text-[12px] text-texto-3">Revisado {fechaCorta(s.revisadoAt)}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <BadgeEstado estado={s.estado} small />
        {s.estado === 'aprobado' && s.pagoAnulado && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-peligro">
            <Ban size={10} className="shrink-0" /> Pago anulado
          </span>
        )}
        <span className="text-[13.5px] font-bold text-texto">{montoTexto(s.monto)}</span>
      </span>
    </div>
  );
}

// =============================================================================
// PAGINACIÓN (mismo patrón que las demás secciones del Panel)
// =============================================================================

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
      <span data-testid="historial-rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="historial-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">
          {pagina} / {totalPaginas}
        </span>
        <button
          type="button"
          data-testid="historial-siguiente"
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

export default PestanaHistorial;
