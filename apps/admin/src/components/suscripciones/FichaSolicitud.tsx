/**
 * FichaSolicitud.tsx
 * ==================
 * Modal de detalle de una solicitud de pago manual YA procesada (Historial). Muestra TODO lo que no
 * cabe en la tabla: negocio + estado, monto/meses declarados, fechas (enviado / revisado), quién la
 * revisó, referencia, nota, el motivo del rechazo y el botón "Ver comprobante".
 *
 * Usa el ModalAdaptativo base del Panel (centrado en escritorio, bottom-sheet en móvil, atrás nativo).
 *
 * Ubicación: apps/admin/src/components/suscripciones/FichaSolicitud.tsx
 */

import type { ReactNode } from 'react';
import { FileCheck2, Ban, ExternalLink } from 'lucide-react';
import type { SolicitudProcesada } from '../../services/suscripcionesService';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { AvatarNegocio } from '../negocios/avatares';
import { BadgeEstado, montoTexto } from './PestanaHistorial';

const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

/** Fecha + hora legible. */
function fechaHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${FMT_FECHA.format(d).replace('.', '')} · ${hh}:${mm}`;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="shrink-0 text-[13px] text-texto-3">{etiqueta}</span>
      <span className="min-w-0 truncate text-right text-[13.5px] font-medium text-texto">{valor ?? '—'}</span>
    </div>
  );
}

export function FichaSolicitud({ s, onCerrar }: { s: SolicitudProcesada; onCerrar: () => void }) {
  const esAprobado = s.estado === 'aprobado';
  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo="Solicitud de pago"
      iconoTitulo={
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-marca-suave text-marca">
          <FileCheck2 size={16} />
        </span>
      }
      ancho="md"
      discriminador="ficha-solicitud"
    >
      <div className="flex flex-col gap-3 p-4" data-testid="ficha-solicitud">
        {/* Negocio + estado + monto protagonista */}
        <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
          <div className="border-b border-borde px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <AvatarNegocio nombre={s.negocioNombre} logoUrl={s.logoUrl} tam={34} />
                <span className="min-w-0 truncate text-[13px] font-medium text-texto-2">{s.negocioNombre}</span>
              </div>
              <BadgeEstado estado={s.estado} />
            </div>
            <div className="text-[28px] font-semibold leading-none tracking-tight text-texto">{montoTexto(s.monto)}</div>
            <div className="mt-2 text-[12.5px] text-texto-3">
              {s.mesesDeclarados} {s.mesesDeclarados === 1 ? 'mes' : 'meses'} · Transferencia/depósito
            </div>
          </div>

          <div className="px-4 py-1.5">
            {s.correoDueno && <Dato etiqueta="Correo del dueño" valor={s.correoDueno} />}
            <Dato etiqueta="Enviado" valor={fechaHora(s.creadoAt)} />
            <Dato etiqueta={esAprobado ? 'Aprobado' : 'Rechazado'} valor={fechaHora(s.revisadoAt)} />
            {s.revisadoPorNombre && <Dato etiqueta="Revisado por" valor={s.revisadoPorNombre} />}
            {s.referencia && <Dato etiqueta="Referencia" valor={s.referencia} />}
            {s.nota && <Dato etiqueta="Nota" valor={s.nota} />}
          </div>
        </div>

        {/* Motivo del rechazo */}
        {!esAprobado && s.motivoRechazo && (
          <div className="flex items-start gap-2 rounded-[11px] border border-[color-mix(in_srgb,var(--panel-danger)_30%,transparent)] bg-peligro-suave p-3">
            <Ban size={16} className="mt-0.5 shrink-0 text-peligro" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-peligro">Motivo del rechazo</p>
              <p className="mt-0.5 text-[12.5px] text-texto-2">{s.motivoRechazo}</p>
            </div>
          </div>
        )}

        {/* Ver comprobante */}
        <a
          href={s.comprobanteUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="ficha-solicitud-comprobante"
          className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto-2 transition hover:bg-marca-suave hover:text-marca"
        >
          <ExternalLink size={15} />
          Ver comprobante
        </a>
      </div>
    </ModalAdaptativo>
  );
}

export default FichaSolicitud;
