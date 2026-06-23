/**
 * FichaNegocio.tsx
 * =================
 * Ficha ADMINISTRATIVA de un negocio — calcada del diseño. Usa el ModalAdaptativo
 * base del Panel (centrado en escritorio, bottom-sheet en móvil, con atrás nativo).
 * Layout: cabecera (avatar + nombre + acciones en íconos) / cuerpo con una card
 * "protagonista" (mismo lenguaje que FichaEvento/FichaUsuario): encabezado con el
 * estado de membresía destacado + chips, y debajo una lista corrida (Membresía ·
 * Dueño · Vendedor · Negocio) separada por líneas tenues; luego una card aparte con
 * el Historial de pagos.
 *
 * Acciones en el encabezado según rol (el backend es la fuente de verdad):
 *   - Registrar pago · Pausar/Reactivar · Reasignar · Editar correo → superadmin + gerente
 *   - Cancelar → solo superadmin
 *   - Vendedor → ficha en solo-lectura (sin acciones)
 * Sin métricas de actividad ni categoría.
 *
 * Ubicación: apps/admin/src/components/negocios/FichaNegocio.tsx
 */

import { useState, type ReactNode } from 'react';
import {
  X,
  User,
  CheckCircle2,
  UserPlus,
  PauseCircle,
  PlayCircle,
  Ban,
  Pencil,
  Send,
  Star,
} from 'lucide-react';
import {
  useNegocioDetalle,
  useSuspenderNegocio,
  useReactivarNegocio,
  useMarcarDesmarcarFundador,
  useReasignarVendedor,
  useMarcarPagado,
  useCancelarNegocio,
  usePagosNegocio,
  useCambiarCorreoDueno,
  useEditarPago,
  useReenviarRecibo,
  useAnularPago,
  PAGOS_INICIAL_FICHA,
} from '../../hooks/queries/useNegociosAdmin';
import type { NegocioFila, NegocioDetalle, PagoMembresia } from '../../services/negociosService';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { VisorImagen } from '../ui/VisorImagen';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Tooltip } from '../ui/Tooltip';
import { AccionesFicha, type AccionFicha } from '../ui/AccionesFicha';
import { DialogoReasignar } from './DialogoReasignar';
import { DialogoMarcarPagado } from './DialogoMarcarPagado';
import { DialogoEditarPago } from './DialogoEditarPago';
import { DialogoEditarCorreo } from './DialogoEditarCorreo';
import { estadoEfectivo, metaEstado } from './estadoPago';
import { AvatarNegocio } from './avatares';
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
    logoUrl: f.logoUrl,
    sitioWeb: null,
    activo: null,
    esBorrador: null,
    verificado: null,
    esFundador: false,
    onboardingCompletado: false,
    creadoEn: f.alta,
    fechaPrimerPago: null,
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

export function Dato({ etiqueta, valor }: { etiqueta: ReactNode; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-texto-3">{etiqueta}</span>
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
      className="txt-badge inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2 py-0.5 text-[11.5px] font-medium text-texto-2"
    >
      <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: activo ? 'var(--panel-ok)' : 'var(--panel-text-4)' }} />
      {texto}
    </span>
  );
}

const FMT_MONTO = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
const CONCEPTO_LABEL: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', cortesia: 'Cortesía', tarjeta: 'Tarjeta' };
/** Pagos visibles antes del botón "Ver todos". Del hook compartido para que el prefetch
 *  cargue la MISMA query y la ficha abra completa de una vez (ver usePrefetchNegocio). */
const PAGOS_INICIAL = PAGOS_INICIAL_FICHA;

/** Sección "Historial de pagos" de la ficha: lista densa de pagos manuales (efectivo/transferencia/
 *  cortesía). Siempre visible en negocios de método manual; en los de tarjeta, solo si hay algún pago
 *  manual registrado (un admin puede "Registrar pago" en un negocio con suscripción Stripe).
 *  Con permiso (super/gerente) cada fila trae un botón para corregir concepto/monto/meses. */
function HistorialPagos({ negocioId, puedeActuar, puedeReenviar, esManual, permiteCortesia }: { negocioId: string; puedeActuar: boolean; puedeReenviar: boolean; esManual: boolean; permiteCortesia: boolean }) {
  const [verTodos, setVerTodos] = useState(false);
  // Pide N+1 para saber si hay más sin traer todo; "Ver todos" re-consulta sin límite.
  const { data, isLoading } = usePagosNegocio(negocioId, true, verTodos ? undefined : PAGOS_INICIAL + 1);
  const [editando, setEditando] = useState<PagoMembresia | null>(null);
  const [anulando, setAnulando] = useState<PagoMembresia | null>(null);
  const editar = useEditarPago();
  const reenviar = useReenviarRecibo();
  const anular = useAnularPago();
  const pagos = data ?? [];
  // En negocios de tarjeta, ocultar la sección entera si no hay pagos manuales (evita una sección
  // vacía en los que cobran por Stripe). En manual, siempre se muestra.
  if (!esManual && pagos.length === 0) return null;
  const hayMas = !verTodos && pagos.length > PAGOS_INICIAL;
  const visibles = verTodos ? pagos : pagos.slice(0, PAGOS_INICIAL);
  // Solo el ÚLTIMO pago vigente (no anulado) es editable; los anteriores se corrigen anulando +
  // registrando de nuevo. La lista viene del más reciente al más antiguo → es el primer no anulado.
  const ultimoPagoId = pagos.find((p) => !p.anulado)?.id;
  return (
    <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
      <div className="border-b border-borde px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-texto-4">Historial de pagos</p>
      </div>
      <div className="px-4 py-2.5">
      {isLoading && <p className="text-[12.5px] text-texto-3">Cargando pagos…</p>}
      {!isLoading && pagos.length === 0 && <p className="text-[12.5px] text-texto-4">Sin pagos registrados.</p>}
      {!isLoading && pagos.length > 0 && (
        <>
          <div className="flex flex-col divide-y divide-borde">
            {visibles.map((p) => (
              <div key={p.id} data-testid={`pago-${p.id}`} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex min-w-0 flex-col">
                  <span className={`text-[13.5px] font-semibold ${p.anulado ? 'text-texto-4 line-through' : 'text-texto'}`}>
                    {p.monto != null ? FMT_MONTO.format(Number(p.monto)) : 'Cortesía'}
                    <span className="ml-2 text-[12px] font-normal text-texto-3">{CONCEPTO_LABEL[p.concepto] ?? p.concepto}</span>
                    {p.anulado && (
                      <span
                        className="txt-badge ml-2 rounded-[6px] px-1.5 py-0.5 text-[10.5px] font-semibold"
                        style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}
                      >
                        Anulado
                      </span>
                    )}
                  </span>
                  <span className="text-[11.5px] text-texto-4">
                    {fecha(p.fechaPago)}
                    {p.registradoPorNombre ? ` · por ${p.registradoPorNombre}` : ''}
                  </span>
                </div>
                {puedeReenviar && !p.anulado && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Tooltip text="Reenviar comprobante">
                      <button
                        type="button"
                        data-testid={`pago-reenviar-${p.id}`}
                        onClick={() => reenviar.mutate({ negocioId, pagoId: p.id })}
                        disabled={reenviar.isPending}
                        aria-label="Reenviar comprobante al dueño"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-marca transition hover:bg-marca-suave disabled:opacity-50"
                      >
                        <Send size={16} />
                      </button>
                    </Tooltip>
                    {puedeActuar && p.id === ultimoPagoId && p.concepto !== 'tarjeta' && (
                      <Tooltip text="Editar pago">
                        <button
                          type="button"
                          data-testid={`pago-editar-${p.id}`}
                          onClick={() => setEditando(p)}
                          aria-label="Editar pago"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[#d97706] transition hover:bg-[#d977061f]"
                        >
                          <Pencil size={16} />
                        </button>
                      </Tooltip>
                    )}
                    {puedeActuar && p.concepto !== 'tarjeta' && (
                      <Tooltip text="Anular pago">
                        <button
                          type="button"
                          data-testid={`pago-anular-${p.id}`}
                          onClick={() => setAnulando(p)}
                          aria-label="Anular pago"
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-peligro transition hover:bg-peligro-suave"
                        >
                          <Ban size={16} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {hayMas && (
            <button
              type="button"
              data-testid="pagos-ver-todos"
              onClick={() => setVerTodos(true)}
              className="mt-2 text-[12px] font-semibold text-marca transition hover:underline"
            >
              Ver todos los pagos
            </button>
          )}
        </>
      )}
      </div>
      {editando && (
        <DialogoEditarPago
          key={editando.id}
          abierto
          permiteCortesia={permiteCortesia}
          pago={editando}
          cargando={editar.isPending}
          onCerrar={() => setEditando(null)}
          onConfirmar={(datos) =>
            editar.mutate(
              { negocioId, pagoId: editando.id, datos },
              { onSuccess: () => setEditando(null) },
            )
          }
        />
      )}
      {anulando && (
        <DialogoConfirmar
          abierto
          onCerrar={() => setAnulando(null)}
          titulo="Anular pago"
          mensaje={`Se anulará ${anulando.monto != null ? `este pago de ${FMT_MONTO.format(Number(anulando.monto))}` : 'esta cortesía'}. Deja de contar y la vigencia del negocio vuelve a la del pago anterior. Se le avisará al dueño por correo.`}
          textoConfirmar="Anular pago"
          requiereMotivo
          cargando={anular.isPending}
          onConfirmar={(motivo) => anular.mutate({ negocioId, pagoId: anulando.id, motivo }, { onSuccess: () => setAnulando(null) })}
        />
      )}
    </div>
  );
}

export function FichaNegocio({ previo, onCerrar }: FichaNegocioProps) {
  const { data, isError } = useNegocioDetalle(previo.id, placeholderDesdeFila(previo));
  // `data` siempre existe (placeholder de la fila o datos reales) → ficha al instante.
  const n = data ?? placeholderDesdeFila(previo);

  const [dialogo, setDialogo] = useState<null | 'suspender' | 'reactivar' | 'reasignar' | 'marcar-pagado' | 'cancelar' | 'editar-correo' | 'fundador'>(null);
  const [verLogo, setVerLogo] = useState(false);
  const suspender = useSuspenderNegocio();
  const reactivar = useReactivarNegocio();
  const fundador = useMarcarDesmarcarFundador();
  const reasignar = useReasignarVendedor();
  const marcarPagado = useMarcarPagado();
  const cancelar = useCancelarNegocio();
  const cambiarCorreo = useCambiarCorreoDueno();
  const cerrarDialogo = () => setDialogo(null);

  const suspendido = n.estadoAdmin === 'suspendido';
  const archivado = n.estadoAdmin === 'archivado';
  const esManual = n.metodoCobro === 'manual';
  // "Inicio Trial" solo tiene sentido si hubo (o hay) un periodo de prueba real: el negocio sigue en
  // trial (sin primer pago aún) o el primer pago ocurrió varios días después del alta. Si cobró ~el
  // mismo día del alta (trial=0 / cobro inmediato), no hubo trial → se oculta la línea.
  const huboTrial = !n.fechaPrimerPago || !n.creadoEn
    || (new Date(n.fechaPrimerPago).getTime() - new Date(n.creadoEn).getTime()) / 86_400_000 >= 3;
  // Espejo del guard 409 del backend: con suscripción, "Marcar pagado" solo si está al corriente
  // (en gracia/suspendido hay un cobro pendiente en Stripe que regularizar primero).
  const cobroPendiente = n.tieneSuscripcionStripe && n.estadoPago !== 'al_corriente';
  const metaEf = metaEstado(estadoEfectivo(n.estadoAdmin, n.estadoPago));

  // SuperAdmin y Gerente actúan sobre toda la ficha. El vendedor solo puede "Registrar pago" en
  // SUS negocios MANUALES (su cartera); el resto de la ficha es de lectura para él. El backend lo blinda.
  const rol = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const puedeActuar = rol === 'superadmin' || rol === 'gerente';
  const esSuperadmin = rol === 'superadmin';
  const puedeRegistrarPago = puedeActuar || (rol === 'vendedor' && esManual);
  // El vendedor puede REENVIAR el comprobante de cualquier pago de su cartera (no editar ni anular).
  const puedeReenviar = puedeActuar || rol === 'vendedor';

  // Acciones del encabezado según rol. Desktop → íconos con tooltip; móvil → menú "⋯" con texto.
  const motivoArchivado = 'No disponible para un negocio cancelado';
  const acciones: AccionFicha[] = [];
  if (puedeRegistrarPago) {
    acciones.push({
      icono: CheckCircle2,
      etiqueta: 'Registrar pago',
      color: 'marca',
      testid: 'ficha-accion-registrar-pago',
      onClick: () => setDialogo('marcar-pagado'),
      disabled: archivado || cobroPendiente,
      motivoDisabled: archivado
        ? motivoArchivado
        : cobroPendiente
          ? 'Tiene un cobro pendiente en Stripe; primero regulariza su pago.'
          : undefined,
    });
  }
  if (puedeActuar) {
    acciones.push({
      icono: UserPlus,
      etiqueta: 'Reasignar',
      color: 'marca',
      testid: 'ficha-accion-reasignar',
      onClick: () => setDialogo('reasignar'),
      disabled: archivado,
      motivoDisabled: archivado ? motivoArchivado : undefined,
    });
    acciones.push(
      suspendido
        ? {
            icono: PlayCircle,
            etiqueta: 'Reactivar',
            color: 'ok',
            testid: 'ficha-accion-reactivar',
            onClick: () => setDialogo('reactivar'),
          }
        : {
            icono: PauseCircle,
            etiqueta: 'Pausar membresía',
            color: 'ambar',
            testid: 'ficha-accion-suspender',
            onClick: () => setDialogo('suspender'),
            disabled: archivado,
            motivoDisabled: archivado ? motivoArchivado : undefined,
          },
    );
    if (esSuperadmin) {
      acciones.push({
        icono: Ban,
        etiqueta: 'Cancelar',
        color: 'peligro',
        testid: 'ficha-accion-cancelar',
        onClick: () => setDialogo('cancelar'),
        disabled: archivado,
        motivoDisabled: archivado ? motivoArchivado : undefined,
      });
    }
    // Fundador de su ciudad (regalo de Publicidad): su logo va al carrusel Fundadores.
    acciones.push({
      icono: Star,
      etiqueta: n.esFundador ? 'Quitar Fundador' : 'Marcar Fundador',
      color: n.esFundador ? 'ambar' : 'ok',
      testid: 'ficha-accion-fundador',
      onClick: () => setDialogo('fundador'),
      disabled: archivado,
      motivoDisabled: archivado ? motivoArchivado : undefined,
    });
  }

  return (
    <>
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="lg"
      alturaMaxima="xl"
      discriminador="ficha-negocio"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="ficha-negocio">
        {/* Cabecera */}
        <div className="flex shrink-0 items-center gap-3 border-b border-borde px-5 py-4">
          <button
            type="button"
            data-testid="ficha-logo"
            onClick={() => setVerLogo(true)}
            aria-label="Ver logo del negocio"
            className="shrink-0 rounded-full transition hover:opacity-90 focus:outline-none focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
          >
            <AvatarNegocio nombre={n.nombre} logoUrl={n.logoUrl} tam={46} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <span className="truncate text-[17px] font-bold tracking-[-0.2px] text-texto" data-testid="ficha-nombre">
              {n.nombre}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AccionesFicha acciones={acciones} testidMenu="ficha-acciones-menu" />
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
        </div>

        {/* Cuerpo: 2 columnas en desktop (sin scroll), 1 columna en móvil (bottom-sheet scrollea). */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-visible">
          {isError && (
            <div className="mb-3 rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
              No se pudo cargar el detalle completo.
            </div>
          )}
          <div className="flex flex-col gap-3">
            {/* Card protagonista: estado de membresía destacado + lista corrida (Membresía · Dueño · Vendedor · Negocio) */}
            <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
              {/* Encabezado protagonista: estado de membresía + vigencia (todo el "membrete") */}
              <div className="border-b border-borde px-4 py-3.5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-texto-4">Membresía</p>
                <div className="text-[20px] font-semibold leading-none tracking-tight" style={{ color: metaEf.color }}>
                  {metaEf.etiqueta}
                </div>
                {!esManual && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <ChipDato testid="chip-stripe" texto={n.tieneSuscripcionStripe ? 'Suscripción activa' : 'Sin suscripción'} activo={n.tieneSuscripcionStripe} />
                  </div>
                )}
                {/* Fechas de la membresía — dentro del membrete, junto al estado */}
                <div className="mt-2.5">
                  {n.estadoPago === 'al_corriente' && (
                    <Dato etiqueta={esManual ? 'Vigencia hasta' : 'Próximo cobro'} valor={fecha(esManual ? n.fechaVencimiento : n.fechaProximoCobro)} />
                  )}
                  {n.estadoPago === 'en_gracia' && (
                    <>
                      <Dato etiqueta="Venció" valor={fecha(n.fechaInicioGracia)} />
                      {!esManual && <Dato etiqueta="Reintento" valor={fecha(n.fechaProximoCobro)} />}
                      <Dato etiqueta="Gracia hasta" valor={fecha(n.fechaLimiteGracia)} />
                    </>
                  )}
                  {!esManual && huboTrial && <Dato etiqueta="Inicio Trial" valor={fecha(n.creadoEn)} />}
                  {n.fechaPrimerPago && <Dato etiqueta="Primer pago" valor={fecha(n.fechaPrimerPago)} />}
                </div>
              </div>

              {/* Lista corrida: Dueño · Vendedor · Negocio */}
              <div className="px-4 py-1.5">
                {/* Dueño */}
                <Dato etiqueta="Dueño" valor={n.duenoNombre ?? '—'} />
                <Dato
                  etiqueta={
                    <>
                      Correo
                      {puedeActuar && !archivado && (
                        <Tooltip text="Corregir correo">
                          <button
                            type="button"
                            data-testid="ficha-editar-correo"
                            onClick={() => setDialogo('editar-correo')}
                            aria-label="Corregir correo"
                            className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] text-[#d97706] transition hover:bg-[#d977061f]"
                          >
                            <Pencil size={14} />
                          </button>
                        </Tooltip>
                      )}
                    </>
                  }
                  valor={n.duenoCorreo ?? '—'}
                />
                <Dato etiqueta="Teléfono" valor={n.duenoTelefono ?? '—'} />

                {/* Vendedor atribuido */}
                <div className="my-1 border-t border-borde/60" />
                <Dato etiqueta="Vendedor" valor={n.vendedorId && n.vendedorNombre ? n.vendedorNombre : 'Sin atribuir'} />

                {/* Negocio */}
                <div className="my-1 border-t border-borde/60" />
                <Dato etiqueta="Ubicación" valor={[n.ciudad, n.estado].filter((x) => x && x !== 'Por configurar').join(', ') || '—'} />
                <Dato etiqueta="Dirección" valor={n.direccion ?? '—'} />
                <Dato etiqueta="Teléfono sucursal" valor={n.telefono ?? '—'} />
                <Dato etiqueta="Onboarding" valor={<ChipDato testid="chip-onboarding" texto={n.onboardingCompletado ? 'Completado' : 'Pendiente'} activo={n.onboardingCompletado} />} />
              </div>
            </div>

            {/* Historial de pagos manuales. Siempre en manual; en tarjeta, solo si hay pagos. */}
            <HistorialPagos negocioId={previo.id} puedeActuar={puedeActuar} puedeReenviar={puedeReenviar} esManual={esManual} permiteCortesia={esSuperadmin} />
          </div>
        </div>

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
      // Vigencia vigente = la MISMA fecha que muestra la ficha: con tarjeta es `fechaProximoCobro`
      // (en trial puede estar poblada mientras `fechaVencimiento` sigue NULL); manual usa `fechaVencimiento`.
      // Sin esto, "Registrar pago" en trial calcularía desde hoy y NO respetaría el fin del trial.
      <DialogoMarcarPagado
        abierto
        onCerrar={cerrarDialogo}
        nombreNegocio={n.nombre}
        vencimientoActual={(esManual ? n.fechaVencimiento : n.fechaProximoCobro) ?? n.fechaVencimiento}
        tieneSuscripcion={n.tieneSuscripcionStripe}
        permiteCortesia={esSuperadmin}
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
    {dialogo === 'fundador' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo={n.esFundador ? 'Quitar Fundador' : 'Marcar como Fundador'}
        mensaje={n.esFundador
          ? 'El logo del negocio dejará de aparecer en el carrusel de Fundadores de su ciudad.'
          : 'El logo del negocio aparecerá en el carrusel de Fundadores de su ciudad (regalo, sin costo). Cupo de 50 por ciudad; el negocio debe tener logo y sucursal principal.'}
        textoConfirmar={n.esFundador ? 'Quitar' : 'Marcar Fundador'}
        cargando={fundador.isPending}
        onConfirmar={() => fundador.mutate({ id: previo.id, esFundador: !n.esFundador }, { onSuccess: cerrarDialogo })}
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
    <VisorImagen
      src={n.logoUrl}
      alt={n.nombre}
      abierto={verLogo}
      onCerrar={() => setVerLogo(false)}
      fallback={<AvatarNegocio nombre={n.nombre} tam={200} />}
    />
    </>
  );
}

export default FichaNegocio;
