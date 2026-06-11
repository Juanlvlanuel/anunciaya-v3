/**
 * FichaEvento.tsx
 * ===============
 * Detalle (solo lectura) de un evento de la bitácora financiera. Usa el ModalAdaptativo
 * base del Panel (centrado en escritorio, bottom-sheet en móvil, atrás nativo). Sin
 * acciones: la bitácora solo refleja lo que producen el webhook y "Registrar pago".
 *
 * Ubicación: apps/admin/src/components/suscripciones/FichaEvento.tsx
 */

import { type ReactNode } from 'react';
import { Building2, Receipt, Info, CreditCard } from 'lucide-react';
import { useEventoDetalle } from '../../hooks/queries/useSuscripcionesAdmin';
import type { EventoFila, EventoDetalle } from '../../services/suscripcionesService';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { metaTipoEvento, BadgeTipoEvento, ChipOrigen } from './estadoEvento';

interface FichaEventoProps {
  /** Fila que se abrió: placeholder para mostrar la ficha al instante. */
  previo: EventoFila;
  onCerrar: () => void;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

/** Fecha+hora legible es-MX. Para timestamps de evento (con hora). */
function fechaHora(valor: string | null): string {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

function montoTexto(m: string | null): string {
  if (m == null) return '—';
  const n = Number(m);
  return Number.isFinite(n) ? FMT_MONTO.format(n) : '—';
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="shrink-0 text-[13px] text-texto-3">{etiqueta}</span>
      <span className="min-w-0 truncate text-right text-[13.5px] font-medium text-texto">{valor ?? '—'}</span>
    </div>
  );
}

function Seccion({ titulo, icono: Icono, children }: { titulo: string; icono: typeof Building2; children: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-borde bg-superficie-2 px-4 py-3.5">
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-texto-4">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[8px] bg-marca-suave text-marca">
          <Icono size={14} />
        </span>
        {titulo}
      </div>
      {children}
    </div>
  );
}

/** Etiquetas legibles para las claves técnicas de `metadata`. */
const META_LABEL: Record<string, string> = {
  customerId: 'Cliente Stripe',
  subscriptionId: 'Suscripción Stripe',
  finPeriodo: 'Fin de periodo',
  proximoReintento: 'Próximo reintento',
  estadoPrevio: 'Estado previo',
  concepto: 'Concepto',
  meses: 'Meses cubiertos',
  hasta: 'Vigencia hasta',
  metodoCobro: 'Método de cobro',
  motivo: 'Motivo',
};

function valorMeta(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') {
    // ISO con fecha → legible.
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return fechaHora(v);
    return v;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Arma un detalle parcial con lo que ya trae la fila (el resto se rellena al llegar). */
function placeholderDesdeFila(f: EventoFila): EventoDetalle {
  return {
    id: f.id,
    fecha: f.fecha,
    negocioId: f.negocioId,
    negocioNombre: f.negocioNombre,
    tipo: f.tipo,
    origen: f.origen,
    monto: f.monto,
    moneda: f.moneda,
    actorId: null,
    actorNombre: f.actorNombre,
    actorCorreo: null,
    stripeEventId: f.stripeEventId,
    referenciaId: null,
    metadata: null,
    creadoEn: null,
  };
}

export function FichaEvento({ previo, onCerrar }: FichaEventoProps) {
  const { data, isError } = useEventoDetalle(previo.id, placeholderDesdeFila(previo));
  const e = data ?? placeholderDesdeFila(previo);
  const meta = metaTipoEvento(e.tipo);
  const IconoTipo = meta.icono;
  const esManual = e.origen === 'manual';
  const entradasMeta = e.metadata ? Object.entries(e.metadata) : [];

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo="Detalle del movimiento"
      iconoTitulo={
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-marca-suave text-marca">
          <IconoTipo size={16} />
        </span>
      }
      ancho="lg"
      discriminador="ficha-evento"
    >
      <div className="flex flex-col gap-3 p-4" data-testid="ficha-evento">
        {isError && (
          <div className="rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
            No se pudo cargar el detalle completo.
          </div>
        )}

        <Seccion titulo="Movimiento" icono={IconoTipo}>
          <Dato etiqueta="Tipo" valor={<BadgeTipoEvento tipo={e.tipo} small />} />
          <Dato etiqueta="Origen" valor={<ChipOrigen origen={e.origen} />} />
          <Dato etiqueta="Monto" valor={<span className={e.monto != null ? 'text-texto' : 'text-texto-4'}>{montoTexto(e.monto)}</span>} />
          <Dato etiqueta="Fecha del evento" valor={fechaHora(e.fecha)} />
        </Seccion>

        <Seccion titulo="Negocio" icono={Building2}>
          <Dato etiqueta="Nombre" valor={e.negocioNombre ?? '—'} />
        </Seccion>

        <Seccion titulo="Registro" icono={esManual ? Receipt : CreditCard}>
          {esManual && <Dato etiqueta="Registrado por" valor={e.actorNombre ?? '—'} />}
          {esManual && e.actorCorreo && <Dato etiqueta="Correo" valor={e.actorCorreo} />}
          {e.creadoEn && <Dato etiqueta="Registrado el" valor={fechaHora(e.creadoEn)} />}
          {e.stripeEventId && <Dato etiqueta="ID de evento Stripe" valor={<span className="font-mono text-[12px]">{e.stripeEventId}</span>} />}
          {e.referenciaId && <Dato etiqueta="Referencia" valor={<span className="font-mono text-[12px]">{e.referenciaId}</span>} />}
          {!esManual && !e.stripeEventId && !e.creadoEn && (
            <p className="text-[12.5px] text-texto-4">Evento automático de Stripe.</p>
          )}
        </Seccion>

        {entradasMeta.length > 0 && (
          <Seccion titulo="Detalles técnicos" icono={Info}>
            {entradasMeta.map(([k, v]) => (
              <Dato key={k} etiqueta={META_LABEL[k] ?? k} valor={valorMeta(v)} />
            ))}
          </Seccion>
        )}
      </div>
    </ModalAdaptativo>
  );
}

export default FichaEvento;
