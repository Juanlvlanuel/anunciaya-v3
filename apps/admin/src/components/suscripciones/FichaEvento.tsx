/**
 * FichaEvento.tsx
 * ===============
 * Detalle de un evento de la bitácora financiera. Usa el ModalAdaptativo base del Panel
 * (centrado en escritorio, bottom-sheet en móvil, atrás nativo). Los eventos automáticos de
 * Stripe son de solo lectura; en los movimientos tipo "Pago manual" el super/gerente puede
 * además Reenviar el comprobante, Editar o Anular el pago (reusa los hooks/endpoints de Negocios).
 *
 * Ubicación: apps/admin/src/components/suscripciones/FichaEvento.tsx
 */

import { useState, type ReactNode } from 'react';
import { Send, Pencil, Ban, Trash2 } from 'lucide-react';
import { useEventoDetalle, useEliminarEvento } from '../../hooks/queries/useSuscripcionesAdmin';
import { useReenviarRecibo, useEditarPago, useAnularPago } from '../../hooks/queries/useNegociosAdmin';
import type { EventoFila, EventoDetalle } from '../../services/suscripcionesService';
import type { PagoMembresia } from '../../services/negociosService';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { DialogoEditarPago } from '../negocios/DialogoEditarPago';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { AccionesFicha, type AccionFicha } from '../ui/AccionesFicha';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { metaTipoEvento, BadgeTipoEvento } from './estadoEvento';

interface FichaEventoProps {
  /** Fila que se abrió: placeholder para mostrar la ficha al instante. */
  previo: EventoFila;
  onCerrar: () => void;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const FORMA_PAGO: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', cortesia: 'Cortesía' };

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
  anulado: 'Anulado',
  anuladoAt: 'Anulado el',
};

function valorMeta(v: unknown): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'string') {
    // ISO con fecha → legible.
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return fechaHora(v);
    return v;
  }
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return String(v);
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
  // `concepto`/`meses`/`hasta` se muestran arriba (Movimiento); `metodoCobro` se oculta (confunde:
  // es cómo cobra el negocio, no la forma de ESTE pago). El resto va a "Detalles técnicos".
  const entradasTecnicas = entradasMeta.filter(([k]) => !['concepto', 'meses', 'hasta', 'metodoCobro'].includes(k));

  // ── Acciones sobre el pago: solo en los movimientos tipo "Pago manual" (los de Stripe no se tocan) ──
  const rol = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const puedeActuar = rol === 'superadmin' || rol === 'gerente';
  const metaObj = (e.metadata ?? {}) as Record<string, unknown>;
  const anulado = metaObj.anulado === true;
  const esCortesia = metaObj.concepto === 'cortesia';
  const montoGrande = e.monto != null ? montoTexto(e.monto) : (esCortesia ? 'Cortesía' : '—');
  const accionable = e.tipo === 'pago_manual' && !!e.referenciaId && !!e.negocioId && puedeActuar;
  const reenviar = useReenviarRecibo();
  const editar = useEditarPago();
  const anular = useAnularPago();
  const eliminar = useEliminarEvento();
  const [editando, setEditando] = useState(false);
  const [anulandoOpen, setAnulandoOpen] = useState(false);
  const [eliminandoOpen, setEliminandoOpen] = useState(false);
  // Borrar (físico): solo superadmin y solo pagos manuales YA ANULADOS (no afectan la vigencia).
  const puedeEliminar = rol === 'superadmin' && e.tipo === 'pago_manual' && anulado;
  // Pago reconstruido desde el evento (monto + metadata) para pre-llenar el diálogo de editar.
  const pagoEditable: PagoMembresia = {
    id: e.referenciaId ?? '',
    folio: null,
    monto: e.monto,
    concepto: String(metaObj.concepto ?? 'efectivo'),
    fechaPago: null,
    periodoHasta: String(metaObj.hasta ?? ''),
    mesesCubiertos: Number(metaObj.meses) || null,
    nota: null,
    registradoPorNombre: e.actorNombre,
    anulado,
  };

  // Acciones del encabezado. Desktop → íconos con tooltip; móvil → menú "⋯" con texto.
  // Pagos manuales NO anulados: Reenviar/Editar/Anular. Anulados (solo superadmin): Borrar.
  const acciones: AccionFicha[] = [];
  if (accionable && !anulado) {
    acciones.push(
      {
        icono: Send,
        etiqueta: 'Reenviar comprobante',
        color: 'marca',
        testid: 'evento-reenviar',
        onClick: () => reenviar.mutate({ negocioId: e.negocioId!, pagoId: e.referenciaId! }),
        disabled: reenviar.isPending,
      },
      {
        icono: Pencil,
        etiqueta: 'Editar pago',
        color: 'ambar',
        testid: 'evento-editar',
        onClick: () => setEditando(true),
      },
      {
        icono: Ban,
        etiqueta: 'Anular pago',
        color: 'peligro',
        testid: 'evento-anular',
        onClick: () => setAnulandoOpen(true),
      },
    );
  }
  if (puedeEliminar) {
    acciones.push({
      icono: Trash2,
      etiqueta: 'Borrar movimiento',
      color: 'peligro',
      testid: 'evento-eliminar',
      onClick: () => setEliminandoOpen(true),
    });
  }

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      titulo="Movimiento"
      iconoTitulo={
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-marca-suave text-marca">
          <IconoTipo size={16} />
        </span>
      }
      accionesHeader={<AccionesFicha acciones={acciones} testidMenu="evento-acciones-menu" />}
      ancho="lg"
      discriminador="ficha-evento"
    >
      <div className="flex flex-col gap-3 p-4" data-testid="ficha-evento">
        {isError && (
          <div className="rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
            No se pudo cargar el detalle completo.
          </div>
        )}

        {/* Diseño "monto protagonista": encabezado con el monto grande + chip del tipo; lista debajo. */}
        <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
          <div className="border-b border-borde px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[13px] text-texto-3">{e.negocioNombre ?? '—'}</span>
              <BadgeTipoEvento tipo={e.tipo} small />
            </div>
            <div className={`text-[28px] font-semibold leading-none tracking-tight ${e.monto != null ? 'text-ok' : 'text-texto-3'}`}>
              {montoGrande}
            </div>
            {metaObj.concepto != null && (
              <div className="mt-2 text-[12.5px] text-texto-3">
                {esCortesia ? 'Membresía de cortesía' : `Pago de membresía · ${FORMA_PAGO[String(metaObj.concepto)] ?? String(metaObj.concepto)}`}
              </div>
            )}
          </div>

          <div className="px-4 py-1.5">
            {metaObj.meses != null && <Dato etiqueta="Periodo" valor={`${metaObj.meses} ${Number(metaObj.meses) === 1 ? 'mes' : 'meses'}`} />}
            {metaObj.hasta != null && <Dato etiqueta="Vigencia hasta" valor={fechaHora(String(metaObj.hasta))} />}
            {esManual && <Dato etiqueta="Registrado por" valor={e.actorNombre ?? '—'} />}
            <Dato etiqueta="Fecha y hora" valor={fechaHora(e.fecha)} />
            {esManual && e.actorCorreo && <Dato etiqueta="Correo" valor={e.actorCorreo} />}
            {e.stripeEventId && <Dato etiqueta="ID de evento Stripe" valor={<span className="font-mono text-[12px]">{e.stripeEventId}</span>} />}
            {entradasTecnicas.map(([k, v]) => (
              <Dato key={k} etiqueta={META_LABEL[k] ?? k} valor={valorMeta(v)} />
            ))}
          </div>
        </div>

        {editando && (
          <DialogoEditarPago
            abierto
            pago={pagoEditable}
            cargando={editar.isPending}
            onCerrar={() => setEditando(false)}
            onConfirmar={(datos) =>
              editar.mutate(
                { negocioId: e.negocioId!, pagoId: e.referenciaId!, datos },
                { onSuccess: () => { setEditando(false); onCerrar(); } },
              )
            }
          />
        )}
        {anulandoOpen && (
          <DialogoConfirmar
            abierto
            onCerrar={() => setAnulandoOpen(false)}
            titulo="Anular pago"
            mensaje={`Se anulará ${e.monto != null ? `este pago de ${montoTexto(e.monto)}` : 'esta cortesía'}. Deja de contar y la vigencia del negocio vuelve a la del pago anterior. Se le avisará al dueño por correo.`}
            textoConfirmar="Anular pago"
            requiereMotivo
            cargando={anular.isPending}
            onConfirmar={(motivo) =>
              anular.mutate(
                { negocioId: e.negocioId!, pagoId: e.referenciaId!, motivo },
                { onSuccess: () => { setAnulandoOpen(false); onCerrar(); } },
              )
            }
          />
        )}

        {eliminandoOpen && (
          <DialogoConfirmar
            abierto
            onCerrar={() => setEliminandoOpen(false)}
            titulo="Borrar movimiento"
            variante="danger"
            mensaje="Se eliminará permanentemente este movimiento anulado y su pago de la base de datos. Esta acción no se puede deshacer."
            textoConfirmar="Borrar definitivamente"
            discriminador="dialogo-eliminar-evento"
            cargando={eliminar.isPending}
            onConfirmar={() =>
              eliminar.mutate(e.id, { onSuccess: () => { setEliminandoOpen(false); onCerrar(); } })
            }
          />
        )}
      </div>
    </ModalAdaptativo>
  );
}

export default FichaEvento;
