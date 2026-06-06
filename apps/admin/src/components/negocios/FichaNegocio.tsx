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
  MapPin,
  User,
  CreditCard,
  Store,
  CheckCircle2,
  UserPlus,
  PauseCircle,
  PlayCircle,
  Ban,
} from 'lucide-react';
import {
  useNegocioDetalle,
  useSuspenderNegocio,
  useReactivarNegocio,
  useReasignarVendedor,
} from '../../hooks/queries/useNegociosAdmin';
import type { NegocioFila, NegocioDetalle } from '../../services/negociosService';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { DialogoReasignar } from './DialogoReasignar';
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

const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function fecha(valor: string | null): string {
  if (!valor) return '—';
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '');
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[13px] text-texto-3">{etiqueta}</span>
      <span className="text-right text-[13.5px] font-medium text-texto">{valor ?? '—'}</span>
    </div>
  );
}

function Seccion({ titulo, icono: Icono, children }: { titulo: string; icono: typeof User; children: ReactNode }) {
  return (
    <div className="border-b border-borde px-5 py-4 last:border-b-0">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-texto-4">
        <Icono size={14} /> {titulo}
      </div>
      {children}
    </div>
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
}: {
  icono: typeof User;
  etiqueta: string;
  variante: 'primary' | 'ghost' | 'danger';
  testid: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 py-2.5 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const estilos: Record<'primary' | 'ghost' | 'danger', string> = {
    primary: 'bg-marca text-marca-contraste lg:flex-1',
    ghost: 'border border-borde-fuerte bg-superficie text-texto',
    danger: 'border border-peligro/40 bg-superficie text-peligro',
  };
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Disponible en la siguiente entrega' : undefined}
      className={`${base} ${estilos[variante]}`}
    >
      <Icono size={16} /> {etiqueta}
    </button>
  );
}

export function FichaNegocio({ previo, onCerrar }: FichaNegocioProps) {
  const { data, isError } = useNegocioDetalle(previo.id, placeholderDesdeFila(previo));
  // `data` siempre existe (placeholder de la fila o datos reales) → ficha al instante.
  const n = data ?? placeholderDesdeFila(previo);

  const [dialogo, setDialogo] = useState<null | 'suspender' | 'reactivar' | 'reasignar'>(null);
  const suspender = useSuspenderNegocio();
  const reactivar = useReactivarNegocio();
  const reasignar = useReasignarVendedor();
  const cerrarDialogo = () => setDialogo(null);

  const suspendido = n.estadoAdmin === 'suspendido';
  const archivado = n.estadoAdmin === 'archivado';

  // Solo SuperAdmin y Gerente pueden actuar; el vendedor ve la ficha solo lectura.
  const rol = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const puedeActuar = rol === 'superadmin' || rol === 'gerente';

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

        {/* Cuerpo */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isError && (
            <div className="border-b border-borde px-5 py-2 text-center text-[12px] text-peligro">
              No se pudo cargar el detalle completo.
            </div>
          )}
          {(
            <>
              <Seccion titulo="Membresía" icono={CreditCard}>
                <Dato etiqueta="Estado de pago" valor={<BadgeEstadoPago estado={n.estadoPago} small />} />
                <Dato etiqueta="Vence" valor={fecha(n.fechaVencimiento)} />
                <Dato etiqueta="Próximo cobro" valor={fecha(n.fechaProximoCobro)} />
                {n.estadoPago === 'en_gracia' && <Dato etiqueta="Gracia hasta" valor={fecha(n.fechaLimiteGracia)} />}
                <Dato etiqueta="Primer pago" valor={fecha(n.fechaPrimerPago)} />
                {n.mesesGratisRestantes > 0 && <Dato etiqueta="Meses gratis restantes" valor={n.mesesGratisRestantes} />}
              </Seccion>

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

              <Seccion titulo="Dueño de la cuenta" icono={User}>
                <Dato etiqueta="Nombre" valor={n.duenoNombre ?? '—'} />
                <Dato etiqueta="Correo" valor={n.duenoCorreo ?? '—'} />
                <Dato etiqueta="Teléfono" valor={n.duenoTelefono ?? '—'} />
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
                <Dato etiqueta="Alta" valor={fecha(n.creadoEn)} />
                <Dato etiqueta="Onboarding" valor={n.onboardingCompletado ? 'Completado' : 'Pendiente'} />
              </Seccion>
            </>
          )}
        </div>

        {/* Footer: acciones (solo SuperAdmin/Gerente). Marcar pagado y Cancelar
            siguen deshabilitados (Parada 2). */}
        {puedeActuar && (
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5 lg:flex lg:items-center">
            <BotonAccion icono={CheckCircle2} etiqueta="Marcar pagado" variante="primary" testid="ficha-accion-marcar-pagado" disabled />
            <BotonAccion icono={UserPlus} etiqueta="Reasignar" variante="ghost" testid="ficha-accion-reasignar" onClick={() => setDialogo('reasignar')} disabled={archivado} />
            {suspendido ? (
              <BotonAccion icono={PlayCircle} etiqueta="Reactivar" variante="ghost" testid="ficha-accion-reactivar" onClick={() => setDialogo('reactivar')} />
            ) : (
              <BotonAccion icono={PauseCircle} etiqueta="Suspender" variante="ghost" testid="ficha-accion-suspender" onClick={() => setDialogo('suspender')} disabled={archivado} />
            )}
            <BotonAccion icono={Ban} etiqueta="Cancelar" variante="danger" testid="ficha-accion-cancelar" disabled />
          </div>
        )}
      </div>
    </ModalAdaptativo>

    {dialogo === 'suspender' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Suspender negocio"
        mensaje="El negocio dejará de mostrarse en la app mientras esté suspendido. Es reversible y no afecta su estado de pago. El motivo queda registrado."
        textoConfirmar="Suspender"
        requiereMotivo
        cargando={suspender.isPending}
        onConfirmar={(motivo) => suspender.mutate({ id: previo.id, motivo }, { onSuccess: cerrarDialogo })}
      />
    )}
    {dialogo === 'reactivar' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Reactivar negocio"
        mensaje="El negocio volverá a mostrarse en la app."
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
    </>
  );
}

export default FichaNegocio;
