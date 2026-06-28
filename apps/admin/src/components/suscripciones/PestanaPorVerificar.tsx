/**
 * PestanaPorVerificar.tsx
 * =======================
 * Pestaña "Por verificar" del módulo Suscripciones: la cola de pagos manuales con comprobante
 * que el dueño subió desde Mi Perfil. Por cada solicitud muestra negocio, correo del dueño,
 * monto (MXN), meses declarados, fecha, referencia/nota y un botón "Ver comprobante". Acciones:
 *   - Aprobar  → DialogoAprobarSolicitud (monto + meses editables) → POST .../aprobar.
 *   - Rechazar → DialogoConfirmar con motivo obligatorio          → POST .../rechazar.
 *
 * Lista densa (filas), neutro + un acento, sin círculos pastel (Tokens_Panel.md §10). Alcance
 * por rol/región lo aplica el backend (super = todo · gerente = su región).
 *
 * Ubicación: apps/admin/src/components/suscripciones/PestanaPorVerificar.tsx
 */

import { useState, type ReactNode } from 'react';
import { ClipboardCheck, ExternalLink, Hash, StickyNote, Mail, Check, X } from 'lucide-react';
import {
  useSolicitudesPendientes,
  useAprobarSolicitud,
  useRechazarSolicitud,
} from '../../hooks/queries/useSuscripcionesAdmin';
import type { SolicitudCola } from '../../services/suscripcionesService';
import { AvatarNegocio } from '../negocios/avatares';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { DialogoAprobarSolicitud } from './DialogoAprobarSolicitud';

const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '');
}

function montoTexto(m: string): string {
  const n = Number(m);
  return Number.isFinite(n) ? FMT_MONTO.format(n) : '—';
}

export function PestanaPorVerificar() {
  const { data: solicitudes = [], isLoading, isError } = useSolicitudesPendientes();
  const aprobar = useAprobarSolicitud();
  const rechazar = useRechazarSolicitud();

  const [aprobando, setAprobando] = useState<SolicitudCola | null>(null);
  const [rechazando, setRechazando] = useState<SolicitudCola | null>(null);

  const confirmarAprobar = (datos: { monto: number; meses: number }) => {
    if (!aprobando) return;
    aprobar.mutate(
      { solicitudId: aprobando.id, monto: datos.monto, meses: datos.meses },
      { onSuccess: () => setAprobando(null) },
    );
  };

  const confirmarRechazar = (motivo: string) => {
    if (!rechazando) return;
    rechazar.mutate(
      { solicitudId: rechazando.id, motivo },
      { onSuccess: () => setRechazando(null) },
    );
  };

  let cuerpo: ReactNode;
  if (isLoading) {
    cuerpo = <EstadoSeccion variante="cargando" icono={ClipboardCheck} titulo="Cargando solicitudes…" />;
  } else if (isError) {
    cuerpo = (
      <EstadoSeccion
        variante="error"
        icono={ClipboardCheck}
        titulo="No se pudieron cargar las solicitudes."
        descripcion="Revisa tu conexión e inténtalo de nuevo."
      />
    );
  } else if (solicitudes.length === 0) {
    cuerpo = (
      <EstadoSeccion
        icono={ClipboardCheck}
        titulo="No hay pagos por verificar"
        descripcion="Cuando un comerciante suba un comprobante de depósito, aparecerá aquí."
      />
    );
  } else {
    cuerpo = (
      <div className="flex flex-col divide-y divide-borde overflow-hidden rounded-[12px] border border-borde">
        {solicitudes.map((s) => (
          <FilaSolicitud
            key={s.id}
            s={s}
            onAprobar={() => setAprobando(s)}
            onRechazar={() => setRechazando(s)}
          />
        ))}
      </div>
    );
  }

  return (
    <div data-testid="suscripciones-por-verificar">
      {solicitudes.length > 0 && (
        <p className="mb-2.5 text-[13px] text-texto-3" data-testid="por-verificar-total">
          <b className="font-semibold text-texto">{solicitudes.length}</b>{' '}
          {solicitudes.length === 1 ? 'pago por verificar' : 'pagos por verificar'}
        </p>
      )}
      {cuerpo}

      {aprobando && (
        <DialogoAprobarSolicitud
          solicitud={aprobando}
          cargando={aprobar.isPending}
          onCerrar={() => setAprobando(null)}
          onConfirmar={confirmarAprobar}
        />
      )}

      <DialogoConfirmar
        abierto={!!rechazando}
        onCerrar={() => setRechazando(null)}
        titulo="Rechazar solicitud"
        iconoTitulo={<X size={18} className="text-peligro" />}
        mensaje={
          rechazando ? (
            <>
              Vas a rechazar el pago de <b className="font-semibold text-texto">{rechazando.negocioNombre}</b>.
              El dueño verá el motivo. Esta acción no activa la membresía.
            </>
          ) : undefined
        }
        textoConfirmar="Rechazar"
        variante="danger"
        requiereMotivo
        etiquetaMotivo="Motivo del rechazo"
        cargando={rechazar.isPending}
        onConfirmar={confirmarRechazar}
        discriminador="rechazar-solicitud"
      />
    </div>
  );
}

// =============================================================================
// FILA
// =============================================================================

function FilaSolicitud({
  s,
  onAprobar,
  onRechazar,
}: {
  s: SolicitudCola;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 bg-superficie p-3.5 lg:flex-row lg:items-center lg:gap-4" data-testid={`solicitud-fila-${s.id}`}>
      {/* Identidad */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <AvatarNegocio nombre={s.negocioNombre} logoUrl={null} tam={40} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{s.negocioNombre}</span>
          <span className={`inline-flex items-center gap-1 text-[12.5px] ${s.correoDueno ? 'text-texto-3' : 'text-texto-4'}`}>
            <Mail size={12} className="shrink-0" />
            <span className="truncate">{s.correoDueno ?? 'Sin correo'}</span>
          </span>
          {(s.referencia || s.nota) && (
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-texto-4">
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

      {/* Monto + meses + fecha */}
      <div className="flex shrink-0 items-center gap-4 lg:gap-6">
        <div className="flex flex-col leading-tight">
          <span className="text-[14px] font-bold text-texto">{montoTexto(s.monto)}</span>
          <span className="text-[11.5px] text-texto-4">
            {s.mesesDeclarados} {s.mesesDeclarados === 1 ? 'mes' : 'meses'} · {fechaCorta(s.creadoAt)}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-2">
        <a
          href={s.comprobanteUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid={`solicitud-comprobante-${s.id}`}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave hover:text-marca"
        >
          <ExternalLink size={14} />
          <span className="lg:hidden">Comprobante</span>
          <span className="hidden lg:inline">Ver comprobante</span>
        </a>
        <button
          type="button"
          data-testid={`solicitud-rechazar-${s.id}`}
          onClick={onRechazar}
          className="inline-flex items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12.5px] font-semibold text-peligro transition hover:bg-peligro-suave"
        >
          <X size={14} />
          Rechazar
        </button>
        <button
          type="button"
          data-testid={`solicitud-aprobar-${s.id}`}
          onClick={onAprobar}
          className="inline-flex items-center gap-1.5 rounded-[9px] bg-marca px-3 py-1.5 text-[12.5px] font-semibold text-marca-contraste transition hover:brightness-105"
        >
          <Check size={14} />
          Aprobar
        </button>
      </div>
    </div>
  );
}

export default PestanaPorVerificar;
