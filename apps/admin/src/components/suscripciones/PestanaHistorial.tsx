/**
 * PestanaHistorial.tsx
 * ====================
 * Pestaña "Historial" del módulo Suscripciones: las solicitudes de pago manual del comerciante
 * que YA se resolvieron (aprobadas / rechazadas). Es la trazabilidad de la VERIFICACIÓN de
 * comprobantes: por cada solicitud muestra negocio, correo, monto/meses declarados, fechas
 * (enviado / revisado + quién), el motivo del rechazo y el botón "Ver comprobante".
 *
 * NO incluye los pagos que el admin registra desde el Panel ("Registrar pago") — esos no pasan por
 * comprobante ni por esta cola; viven en la Bitácora + en la ficha del negocio.
 *
 * Lista densa (filas), neutro + un acento (Tokens_Panel.md). Alcance por rol/región lo aplica el
 * backend. Filtro por estado (Todos / Aprobados / Rechazados) + paginación en servidor.
 *
 * Ubicación: apps/admin/src/components/suscripciones/PestanaHistorial.tsx
 */

import { useState, type ReactNode } from 'react';
import { History, ExternalLink, Hash, StickyNote, Mail, Check, X, Ban, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSolicitudesProcesadas } from '../../hooks/queries/useSuscripcionesAdmin';
import type { SolicitudProcesada } from '../../services/suscripcionesService';
import { AvatarNegocio } from '../negocios/avatares';
import { EstadoSeccion } from '../ui/EstadoSeccion';

const POR_PAGINA = 20;
const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

type FiltroEstado = 'aprobado' | 'rechazado' | undefined;

const FILTROS: { id: FiltroEstado; label: string }[] = [
  { id: undefined, label: 'Todos' },
  { id: 'aprobado', label: 'Aprobados' },
  { id: 'rechazado', label: 'Rechazados' },
];

function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '');
}

function montoTexto(m: string): string {
  const n = Number(m);
  return Number.isFinite(n) ? FMT_MONTO.format(n) : '—';
}

export function PestanaHistorial() {
  const [estado, setEstado] = useState<FiltroEstado>(undefined);
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isError, isFetching } = useSolicitudesProcesadas({ estado, pagina, porPagina: POR_PAGINA });
  const solicitudes = data?.solicitudes ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const cambiarFiltro = (id: FiltroEstado) => {
    setEstado(id);
    setPagina(1);
  };

  let cuerpo: ReactNode;
  if (isLoading) {
    cuerpo = <EstadoSeccion variante="cargando" icono={History} titulo="Cargando historial…" />;
  } else if (isError) {
    cuerpo = (
      <EstadoSeccion
        variante="error"
        icono={History}
        titulo="No se pudo cargar el historial."
        descripcion="Revisa tu conexión e inténtalo de nuevo."
      />
    );
  } else if (solicitudes.length === 0) {
    cuerpo = (
      <EstadoSeccion
        icono={History}
        titulo="Sin solicitudes procesadas"
        descripcion="Aquí aparecerán los comprobantes que apruebes o rechaces."
      />
    );
  } else {
    cuerpo = (
      <div className="flex flex-col divide-y divide-borde overflow-hidden rounded-[12px] border border-borde">
        {solicitudes.map((s) => (
          <FilaProcesada key={s.id} s={s} />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="suscripciones-historial">
      {/* Filtro por estado */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => {
          const activo = estado === f.id;
          return (
            <button
              key={f.label}
              type="button"
              data-testid={`historial-filtro-${f.id ?? 'todos'}`}
              onClick={() => cambiarFiltro(f.id)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                activo
                  ? 'border-marca bg-marca-suave text-marca'
                  : 'border-borde bg-superficie text-texto-2 hover:bg-marca-suave'
              }`}
            >
              {f.label}
            </button>
          );
        })}
        {total > 0 && (
          <span className="ml-auto text-[12.5px] text-texto-3" data-testid="historial-total">
            <b className="font-semibold text-texto">{total}</b> en total
          </span>
        )}
      </div>

      {cuerpo}

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-[12.5px] text-texto-3">
          <button
            type="button"
            data-testid="historial-anterior"
            disabled={pagina <= 1 || isFetching}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 font-semibold text-texto-2 transition hover:bg-marca-suave hover:text-marca disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            Anterior
          </button>
          <span className="tabular-nums">
            {pagina} / {totalPaginas}
          </span>
          <button
            type="button"
            data-testid="historial-siguiente"
            disabled={pagina >= totalPaginas || isFetching}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            className="inline-flex items-center gap-1 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 font-semibold text-texto-2 transition hover:bg-marca-suave hover:text-marca disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FILA
// =============================================================================

function FilaProcesada({ s }: { s: SolicitudProcesada }) {
  const esAprobado = s.estado === 'aprobado';
  return (
    <div className="flex flex-col gap-3 bg-superficie p-3.5 lg:flex-row lg:items-start lg:gap-4" data-testid={`historial-fila-${s.id}`}>
      {/* Identidad + estado + motivo */}
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <AvatarNegocio nombre={s.negocioNombre} logoUrl={s.logoUrl} tam={40} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-texto">{s.negocioNombre}</span>
            <BadgeEstado estado={s.estado} />
          </div>
          <span className={`inline-flex items-center gap-1 text-[12.5px] ${s.correoDueno ? 'text-texto-3' : 'text-texto-4'}`}>
            <Mail size={12} className="shrink-0" />
            <span className="truncate">{s.correoDueno ?? 'Sin correo'}</span>
          </span>
          {!esAprobado && s.motivoRechazo && (
            <span className="mt-0.5 inline-flex items-start gap-1 text-[12px] text-peligro">
              <Ban size={11} className="mt-0.5 shrink-0" />
              <span className="min-w-0">Motivo: {s.motivoRechazo}</span>
            </span>
          )}
          {(s.referencia || s.nota) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-texto-4">
              {s.referencia && (
                <span className="inline-flex items-center gap-1">
                  <Hash size={11} className="shrink-0" />
                  <span className="truncate">{s.referencia}</span>
                </span>
              )}
              {s.nota && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <StickyNote size={11} className="shrink-0" />
                  <span className="truncate">{s.nota}</span>
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Monto + meses + fechas + revisor */}
      <div className="flex shrink-0 flex-col leading-tight lg:items-end lg:text-right">
        <span className="text-[14px] font-bold text-texto">{montoTexto(s.monto)}</span>
        <span className="text-[11.5px] text-texto-4">
          {s.mesesDeclarados} {s.mesesDeclarados === 1 ? 'mes' : 'meses'} · Enviado {fechaCorta(s.creadoAt)}
        </span>
        <span className="text-[11.5px] text-texto-4">
          {esAprobado ? 'Aprobado' : 'Rechazado'} {fechaCorta(s.revisadoAt)}
          {s.revisadoPorNombre ? ` · ${s.revisadoPorNombre}` : ''}
        </span>
      </div>

      {/* Comprobante */}
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={s.comprobanteUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`historial-comprobante-${s.id}`}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave hover:text-marca"
        >
          <ExternalLink size={14} />
          <span className="lg:hidden">Comprobante</span>
          <span className="hidden lg:inline">Ver comprobante</span>
        </a>
      </div>
    </div>
  );
}

function BadgeEstado({ estado }: { estado: 'aprobado' | 'rechazado' }) {
  const esAprobado = estado === 'aprobado';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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

export default PestanaHistorial;
