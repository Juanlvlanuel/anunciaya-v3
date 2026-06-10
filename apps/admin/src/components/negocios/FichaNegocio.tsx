/**
 * FichaNegocio.tsx
 * =================
 * Ficha ADMINISTRATIVA de un negocio (VER, solo lectura) — calcada del diseño.
 * Usa el ModalAdaptativo base del Panel (centrado en escritorio, bottom-sheet en
 * móvil, con atrás nativo). Layout: cabecera (avatar + nombre + badge) / cuerpo
 * con scroll (Membresía, Vendedor atribuido, Dueño, Negocio) / footer fijo con
 * las 4 acciones.
 *
 * Las 4 acciones son UI visual SIN lógica (deshabilitadas con tooltip): su
 * funcionamiento llega en la Entrega 2. Sin métricas de actividad ni categoría.
 *
 * Ubicación: apps/admin/src/components/negocios/FichaNegocio.tsx
 */

import { useState, type ReactNode } from 'react';
import {
  X,
  ExternalLink,
  User,
  CreditCard,
  Store,
  CheckCircle2,
  UserPlus,
  PauseCircle,
  PlayCircle,
  Ban,
  Receipt,
  Mail,
} from 'lucide-react';
import {
  useNegocioDetalle,
  useSuspenderNegocio,
  useReactivarNegocio,
  useReasignarVendedor,
  useMarcarPagado,
  useCancelarNegocio,
  usePagosNegocio,
  useCambiarCorreoDueno,
} from '../../hooks/queries/useNegociosAdmin';
import type { NegocioFila, NegocioDetalle } from '../../services/negociosService';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Tooltip } from '../ui/Tooltip';
import { DialogoReasignar } from './DialogoReasignar';
import { DialogoMarcarPagado } from './DialogoMarcarPagado';
import { DialogoEditarCorreo } from './DialogoEditarCorreo';
import { BadgeEstadoPago, estadoEfectivo } from './estadoPago';
import { AvatarNegocio, AvatarVendedor, AvatarVacio } from './avatares';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';

interface FichaNegocioProps {
  /** Fila que se abrió: sirve de placeholder para mostrar la ficha al instante. */
  previo: NegocioFila;
  onCerrar: () => void;
}

/** Arma un detalle parcial con lo que ya trae la fila (el resto se rellena al
 *  llegar la respuesta). Evita la pantalla de "Cargando…". */
function placeholderDesdeFila(f: NegocioFila): NegocioDetalle {
  return {
    id: f.id,
    nombre: f.nombre,
    descripcion: null,
    logoUrl: null,
    sitioWeb: null,
    activo: null,
    esBorrador: null,
    verificado: null,
    onboardingCompletado: false,
    creadoEn: f.alta,
    fechaPrimerPago: null,
    mesesGratisRestantes: 0,
    estadoPago: f.estadoPago,
    estadoAdmin: f.estadoAdmin,
    metodoCobro: 'tarjeta',
    tieneSuscripcionStripe: false,
    fechaVencimiento: null,
    fechaProximoCobro: f.proximoCobro,
    fechaInicioGracia: null,
    fechaLimiteGracia: null,
    duenoNombre: null,
    duenoCorreo: null,
    duenoTelefono: null,
    vendedorId: f.vendedorId,
    vendedorNombre: f.vendedorNombre,
    vendedorCodigo: null,
    regionId: null,
    regionNombre: null,
    ciudad: f.ciudad,
    estado: null,
    direccion: null,
    telefono: null,
  };
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function fecha(valor: string | null): string {
  if (!valor) return '—';
  // date-only (YYYY-MM-DD) → parsear como local para no retroceder un día por zona horaria.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T00:00:00` : valor;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="shrink-0 text-[13px] text-texto-3">{etiqueta}</span>
      <span className="text-right text-[13.5px] font-medium text-texto">{valor ?? '—'}</span>
    </div>
  );
}

export function Seccion({ titulo, icono: Icono, children }: { titulo: string; icono: typeof User; children: ReactNode }) {
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

/** Chip sobrio (pill + punto de color) para valores binarios — reusa el lenguaje del badge de estado. */
function ChipDato({ texto, activo, testid }: { texto: string; activo: boolean; testid?: string }) {
  return (
    <span
      data-testid={testid}
      className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2 py-0.5 text-[11.5px] font-medium text-texto-2"
    >
      <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: activo ? 'var(--panel-ok)' : 'var(--panel-text-4)' }} />
      {texto}
    </span>
  );
}

/** Botón de acción del footer. Si `disabled`, muestra el tooltip de Parada 2. */
function BotonAccion({
  icono: Icono,
  etiqueta,
  variante,
  testid,
  onClick,
  disabled = false,
  tooltipDisabled,
  soloIcono = false,
}: {
  icono: typeof User;
  etiqueta: string;
  variante: 'primary' | 'ghost' | 'danger';
  testid: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Tooltip cuando está deshabilitado; si no se pasa, usa el de "negocio cancelado". */
  tooltipDisabled?: string;
  /** Solo icono (cuadrado) + tooltip con la etiqueta. Para compactar el footer en 1 línea. */
  soloIcono?: boolean;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const dims = soloIcono ? 'h-10 w-10 shrink-0' : 'px-3 py-2.5';
  const estilos: Record<'primary' | 'ghost' | 'danger', string> = {
    primary: 'bg-marca text-marca-contraste',
    ghost: 'border border-borde-fuerte bg-superficie text-texto',
    danger: 'border border-peligro/40 bg-superficie text-peligro',
  };
  // Tooltip: la razón del bloqueo si está deshabilitado; el nombre de la acción si es icon-only.
  const textoTooltip = disabled
    ? (tooltipDisabled ?? 'No disponible para un negocio cancelado')
    : (soloIcono ? etiqueta : undefined);
  const boton = (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      aria-label={soloIcono ? etiqueta : undefined}
      className={`${base} ${dims} ${estilos[variante]}`}
    >
      <Icono size={16} /> {!soloIcono && etiqueta}
    </button>
  );
  return textoTooltip
    ? <Tooltip text={textoTooltip} className={soloIcono ? 'shrink-0' : undefined}>{boton}</Tooltip>
    : boton;
}

const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const CONCEPTO_LABEL: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', cortesia: 'Cortesía' };

/** Lista densa del historial de pagos de membresía (ficha del método manual). */
function HistorialPagos({ negocioId }: { negocioId: string }) {
  const { data, isLoading } = usePagosNegocio(negocioId, true);
  if (isLoading) return <p className="text-[12.5px] text-texto-3">Cargando pagos…</p>;
  const pagos = data ?? [];
  if (pagos.length === 0) return <p className="text-[12.5px] text-texto-4">Sin pagos registrados.</p>;
  return (
    <div className="flex flex-col divide-y divide-borde">
      {pagos.map((p) => (
        <div key={p.id} data-testid={`pago-${p.id}`} className="flex items-baseline justify-between gap-3 py-1.5">
          <div className="flex min-w-0 flex-col">
            <span className="text-[13.5px] font-semibold text-texto">
              {p.monto != null ? FMT_MONTO.format(Number(p.monto)) : 'Cortesía'}
              <span className="ml-2 text-[12px] font-normal text-texto-3">{CONCEPTO_LABEL[p.concepto] ?? p.concepto}</span>
            </span>
            <span className="text-[11.5px] text-texto-4">
              {fecha(p.fechaPago)}
              {p.registradoPorNombre ? ` · por ${p.registradoPorNombre}` : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FichaNegocio({ previo, onCerrar }: FichaNegocioProps) {
  const { data, isError } = useNegocioDetalle(previo.id, placeholderDesdeFila(previo));
  // `data` siempre existe (placeholder de la fila o datos reales) → ficha al instante.
  const n = data ?? placeholderDesdeFila(previo);

  const [dialogo, setDialogo] = useState<null | 'suspender' | 'reactivar' | 'reasignar' | 'marcar-pagado' | 'cancelar' | 'editar-correo'>(null);
  const suspender = useSuspenderNegocio();
  const reactivar = useReactivarNegocio();
  const reasignar = useReasignarVendedor();
  const marcarPagado = useMarcarPagado();
  const cancelar = useCancelarNegocio();
  const cambiarCorreo = useCambiarCorreoDueno();
  const cerrarDialogo = () => setDialogo(null);

  const suspendido = n.estadoAdmin === 'suspendido';
  const archivado = n.estadoAdmin === 'archivado';
  const esManual = n.metodoCobro === 'manual';
  // Espejo del guard 409 del backend: con suscripción, "Marcar pagado" solo si está al corriente
  // (en gracia/suspendido hay un cobro pendiente en Stripe que regularizar primero).
  const cobroPendiente = n.tieneSuscripcionStripe && n.estadoPago !== 'al_corriente';

  // Solo SuperAdmin y Gerente pueden actuar; el vendedor ve la ficha solo lectura.
  // Marcar pagado y Cancelar son EXCLUSIVOS de SuperAdmin.
  const rol = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const puedeActuar = rol === 'superadmin' || rol === 'gerente';
  const esSuperadmin = rol === 'superadmin';

  return (
    <>
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="xl"
      alturaMaxima="xl"
      discriminador="ficha-negocio"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="ficha-negocio">
        {/* Cabecera */}
        <div className="flex shrink-0 items-center gap-3 border-b border-borde px-5 py-4">
          <AvatarNegocio nombre={n.nombre} tam={46} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <span className="truncate text-[17px] font-bold tracking-[-0.2px] text-texto" data-testid="ficha-nombre">
              {n.nombre}
            </span>
            <BadgeEstadoPago estado={estadoEfectivo(n.estadoAdmin, n.estadoPago)} small />
          </div>
          <button
            type="button"
            data-testid="ficha-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        {/* Cuerpo: 2 columnas en desktop (sin scroll), 1 columna en móvil (bottom-sheet scrollea). */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-visible">
          {isError && (
            <div className="mb-3 rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
              No se pudo cargar el detalle completo.
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Columna izquierda */}
            <div className="flex flex-col gap-3">
              <Seccion titulo="Membresía" icono={CreditCard}>
                <Dato etiqueta="Estado de pago" valor={<BadgeEstadoPago estado={n.estadoPago} small />} />
                {/* Al corriente: en manual mostramos "Vigencia hasta" (fecha de vencimiento). */}
                {n.estadoPago === 'al_corriente' && (
                  <Dato
                    etiqueta={esManual ? 'Vigencia hasta' : 'Próximo cobro'}
                    valor={fecha(esManual ? n.fechaVencimiento : n.fechaProximoCobro)}
                  />
                )}
                {/* En gracia: venció + (solo tarjeta) reintento de Stripe + límite de gracia. */}
                {n.estadoPago === 'en_gracia' && (
                  <>
                    <Dato etiqueta="Venció" valor={fecha(n.fechaInicioGracia)} />
                    {!esManual && <Dato etiqueta="Reintento" valor={fecha(n.fechaProximoCobro)} />}
                    <Dato etiqueta="Gracia hasta" valor={fecha(n.fechaLimiteGracia)} />
                  </>
                )}
                <Dato etiqueta="Método de cobro" valor={<ChipDato testid="chip-metodo" texto={n.metodoCobro === 'manual' ? 'Manual' : 'Tarjeta'} activo={n.metodoCobro !== 'manual'} />} />
                {/* Conceptos de ciclo Stripe (Suscripción / Inicio Trial): solo aplican a tarjeta. */}
                {!esManual && (
                  <Dato etiqueta="Suscripción Stripe" valor={<ChipDato testid="chip-stripe" texto={n.tieneSuscripcionStripe ? 'Activa' : 'Sin suscripción'} activo={n.tieneSuscripcionStripe} />} />
                )}
                {!esManual && <Dato etiqueta="Inicio Trial" valor={fecha(n.creadoEn)} />}
                {n.fechaPrimerPago && <Dato etiqueta="Primer Pago" valor={fecha(n.fechaPrimerPago)} />}
                {n.mesesGratisRestantes > 0 && <Dato etiqueta="Meses gratis restantes" valor={n.mesesGratisRestantes} />}
              </Seccion>

              {/* Historial de pagos manuales (efectivo/transferencia) — solo método manual. */}
              {esManual && (
                <Seccion titulo="Historial de pagos" icono={Receipt}>
                  <HistorialPagos negocioId={previo.id} />
                </Seccion>
              )}

              <Seccion titulo="Vendedor atribuido" icono={User}>
                {n.vendedorId && n.vendedorNombre ? (
                  <div className="flex items-center gap-3">
                    <AvatarVendedor nombre={n.vendedorNombre} tam={34} />
                    <div className="flex min-w-0 flex-col">
                      <span className="text-[14px] font-semibold text-texto">{n.vendedorNombre}</span>
                      <span className="text-[12px] text-texto-3">
                        {n.vendedorCodigo ? <>Código: <span className="font-mono">{n.vendedorCodigo}</span></> : 'Vendedor de campo'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AvatarVacio tam={34} />
                    <span className="text-[13.5px] text-texto-3">Sin vendedor atribuido</span>
                  </div>
                )}
              </Seccion>
            </div>

            {/* Columna derecha */}
            <div className="flex flex-col gap-3">
              <Seccion titulo="Dueño de la cuenta" icono={User}>
                <Dato etiqueta="Nombre" valor={n.duenoNombre ?? '—'} />
                <Dato etiqueta="Correo" valor={n.duenoCorreo ?? '—'} />
                <Dato etiqueta="Teléfono" valor={n.duenoTelefono ?? '—'} />
                {puedeActuar && !archivado && (
                  <button
                    type="button"
                    data-testid="ficha-editar-correo"
                    onClick={() => setDialogo('editar-correo')}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12.5px] font-semibold text-texto transition hover:bg-marca-suave"
                  >
                    <Mail size={14} /> Editar correo
                  </button>
                )}
              </Seccion>

              <Seccion titulo="Negocio" icono={Store}>
                <Dato etiqueta="Ubicación" valor={[n.ciudad, n.estado].filter((x) => x && x !== 'Por configurar').join(', ') || '—'} />
                <Dato etiqueta="Dirección" valor={n.direccion ?? '—'} />
                <Dato etiqueta="Teléfono sucursal" valor={n.telefono ?? '—'} />
                <Dato
                  etiqueta="Sitio web"
                  valor={
                    n.sitioWeb ? (
                      <a href={n.sitioWeb} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-marca hover:underline">
                        Abrir <ExternalLink size={13} />
                      </a>
                    ) : ('—')
                  }
                />
                <Dato etiqueta="Onboarding" valor={<ChipDato testid="chip-onboarding" texto={n.onboardingCompletado ? 'Completado' : 'Pendiente'} activo={n.onboardingCompletado} />} />
              </Seccion>
            </div>
          </div>
        </div>

        {/* Footer: acciones según permisos. Marcar pagado y Cancelar son exclusivos de
            SuperAdmin; Pausar y Reasignar también las usa el Gerente (su región). */}
        {puedeActuar && (
          <div className="flex shrink-0 items-center gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
            {esSuperadmin && (
              <BotonAccion
                icono={CheckCircle2}
                etiqueta="Registrar pago"
                variante="primary"
                testid="ficha-accion-registrar-pago"
                onClick={() => setDialogo('marcar-pagado')}
                disabled={archivado || cobroPendiente}
                tooltipDisabled={!archivado && cobroPendiente ? 'Tiene un cobro pendiente en Stripe; primero regulariza su pago.' : undefined}
              />
            )}
            {/* Acciones secundarias: icon-only + tooltip, empujadas a la derecha → 1 línea siempre. */}
            <div className="ml-auto flex items-center gap-2">
              <BotonAccion icono={UserPlus} etiqueta="Reasignar" variante="ghost" testid="ficha-accion-reasignar" onClick={() => setDialogo('reasignar')} disabled={archivado} soloIcono />
              {suspendido ? (
                <BotonAccion icono={PlayCircle} etiqueta="Reactivar" variante="ghost" testid="ficha-accion-reactivar" onClick={() => setDialogo('reactivar')} soloIcono />
              ) : (
                <BotonAccion icono={PauseCircle} etiqueta="Pausar membresía" variante="ghost" testid="ficha-accion-suspender" onClick={() => setDialogo('suspender')} disabled={archivado} soloIcono />
              )}
              {esSuperadmin && (
                <BotonAccion icono={Ban} etiqueta="Cancelar" variante="danger" testid="ficha-accion-cancelar" onClick={() => setDialogo('cancelar')} disabled={archivado} soloIcono />
              )}
            </div>
          </div>
        )}
      </div>
    </ModalAdaptativo>

    {dialogo === 'suspender' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Pausar membresía"
        mensaje="El negocio dejará de mostrarse en la app mientras esté pausado, y se pausará el cobro de su tarjeta en Stripe (sin generar deuda). Es reversible. El motivo queda registrado."
        textoConfirmar="Pausar"
        requiereMotivo
        cargando={suspender.isPending}
        onConfirmar={(motivo) => suspender.mutate({ id: previo.id, motivo }, { onSuccess: cerrarDialogo })}
      />
    )}
    {dialogo === 'reactivar' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Reactivar membresía"
        mensaje="El negocio volverá a mostrarse en la app y se reanudará el cobro de su tarjeta en Stripe (el ciclo sigue de aquí en adelante, sin cobrar lo pausado)."
        textoConfirmar="Reactivar"
        mostrarMotivo
        cargando={reactivar.isPending}
        onConfirmar={(motivo) => reactivar.mutate({ id: previo.id, motivo: motivo || undefined }, { onSuccess: cerrarDialogo })}
      />
    )}
    {dialogo === 'reasignar' && (
      <DialogoReasignar
        abierto
        onCerrar={cerrarDialogo}
        vendedorActualId={n.vendedorId}
        cargando={reasignar.isPending}
        onConfirmar={(embajadorId, motivo) =>
          reasignar.mutate({ id: previo.id, embajadorId, motivo: motivo || undefined }, { onSuccess: cerrarDialogo })
        }
      />
    )}
    {dialogo === 'marcar-pagado' && (
      <DialogoMarcarPagado
        abierto
        onCerrar={cerrarDialogo}
        nombreNegocio={n.nombre}
        vencimientoActual={n.fechaVencimiento}
        tieneSuscripcion={n.tieneSuscripcionStripe}
        cargando={marcarPagado.isPending}
        onConfirmar={(hasta, datos) =>
          marcarPagado.mutate({ id: previo.id, hasta, ...datos }, { onSuccess: cerrarDialogo })
        }
      />
    )}
    {dialogo === 'cancelar' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Cancelar negocio"
        variante="danger"
        mensaje="Baja definitiva (recuperable): se archiva el negocio, se corta su suscripción en Stripe, la cuenta del dueño baja a personal y se devuelven los puntos de los vales pendientes. No se borran datos. El motivo queda registrado."
        textoConfirmar="Cancelar negocio"
        requiereMotivo
        cargando={cancelar.isPending}
        onConfirmar={(motivo) => cancelar.mutate({ id: previo.id, motivo }, { onSuccess: cerrarDialogo })}
      />
    )}
    {dialogo === 'editar-correo' && (
      <DialogoEditarCorreo
        abierto
        onCerrar={cerrarDialogo}
        correoActual={n.duenoCorreo}
        cargando={cambiarCorreo.isPending}
        onConfirmar={(correoNuevo) =>
          cambiarCorreo.mutate({ id: previo.id, correoNuevo }, { onSuccess: cerrarDialogo })
        }
      />
    )}
    </>
  );
}

export default FichaNegocio;
