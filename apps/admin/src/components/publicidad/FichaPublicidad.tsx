/**
 * FichaPublicidad.tsx
 * ===================
 * Detalle de una compra de publicidad. Usa el ModalAdaptativo base del Panel (centrado en
 * escritorio, bottom-sheet en móvil). Muestra anunciante · estado · piezas (carrusel + imagen +
 * métricas) · ciudades · vigencia · pago, y un FOOTER de acciones por rol (Fase 2):
 *   - Pausar / Reactivar → super + gerente (su región, lo blinda el backend).
 *   - Cancelar (irreversible) → solo super.
 *
 * Ubicación: apps/admin/src/components/publicidad/FichaPublicidad.tsx
 */

import { useState, type ReactNode } from 'react';
import { Megaphone, Pencil, Pause, PlayCircle, Ban, X } from 'lucide-react';
import {
  useDetallePublicidad,
  usePausarPublicidad,
  useReactivarPublicidad,
  useCancelarPublicidad,
} from '../../hooks/queries/usePublicidadAdmin';
import { DialogoEditarAnuncio } from './DialogoEditarAnuncio';
import type { PublicidadFila, PublicidadDetalle } from '../../services/publicidadService';
import type { RolPanel } from '../../data/menuPanel';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { AccionesFicha, type AccionFicha } from '../ui/AccionesFicha';
import { AvatarUsuario } from '../usuarios/avataresUsuario';
import { CARRUSEL_LABEL, ESTADO_LABEL, ESTADO_DOT, ORIGEN_LABEL, fmtMonto, fechaCorta } from './presentacionPublicidad';

interface FichaPublicidadProps {
  /** Fila que se abrió: placeholder para mostrar la ficha al instante. */
  previo: PublicidadFila;
  rol: RolPanel;
  onCerrar: () => void;
}

const METODO_LABEL: Record<string, string> = {
  tarjeta: 'Tarjeta',
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cortesia: 'Cortesía',
};

function Dato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="shrink-0 text-[13px] text-texto-3">{etiqueta}</span>
      <span className="min-w-0 truncate text-right text-[13.5px] font-medium text-texto">{valor ?? '—'}</span>
    </div>
  );
}

/** Arma un detalle parcial con lo que ya trae la fila (el resto se rellena al llegar). */
function placeholderDesdeFila(f: PublicidadFila): PublicidadDetalle {
  return {
    id: f.id,
    anuncianteId: '',
    anuncianteNombre: f.anuncianteNombre,
    anuncianteCorreo: null,
    anuncianteTelefono: null,
    anuncianteAvatar: f.anuncianteAvatar,
    esComercial: !!f.negocioId,
    negocioId: f.negocioId,
    negocioNombre: f.negocioNombre,
    esCombo: f.esCombo,
    estado: f.estado,
    origen: f.origen,
    metodoCobro: null,
    monto: f.monto,
    folio: null,
    reciboUrl: null,
    stripePaymentIntentId: null,
    duracionDias: 0,
    iniciaAt: f.iniciaAt,
    expiraAt: f.expiraAt,
    diasRestantes: f.diasRestantes,
    avisoVencimientoEnviado: false,
    registradoPorNombre: null,
    creadoEn: null,
    piezas: [],
    ciudades: [],
    clicksTotales: 0,
    impresionesTotales: 0,
  };
}

export function FichaPublicidad({ previo, rol, onCerrar }: FichaPublicidadProps) {
  const { data, isError } = useDetallePublicidad(previo.id, placeholderDesdeFila(previo));
  const r = data ?? placeholderDesdeFila(previo);

  const [confirmar, setConfirmar] = useState<'pausar' | 'reactivar' | 'cancelar' | null>(null);
  const [editando, setEditando] = useState(false);
  const pausar = usePausarPublicidad();
  const reactivar = useReactivarPublicidad();
  const cancelar = useCancelarPublicidad();

  const editable = r.estado === 'activa' || r.estado === 'pausada';
  // Editar: super + gerente (el backend valida el alcance). Requiere el detalle ya cargado (piezas).
  const puedeEditar = editable && r.piezas.length > 0;

  // Acciones del encabezado: íconos con tooltip en desktop, menú "⋯" en móvil (como FichaUsuario).
  const acciones: AccionFicha[] = [];
  if (puedeEditar) {
    acciones.push({ icono: Pencil, etiqueta: 'Editar anuncio', color: 'marca', testid: 'publicidad-accion-editar', onClick: () => setEditando(true) });
  }
  if (r.estado === 'activa') {
    acciones.push({ icono: Pause, etiqueta: 'Pausar anuncio', color: 'ambar', testid: 'publicidad-accion-pausar', onClick: () => setConfirmar('pausar') });
  }
  if (r.estado === 'pausada') {
    acciones.push({ icono: PlayCircle, etiqueta: 'Reactivar anuncio', color: 'ok', testid: 'publicidad-accion-reactivar', onClick: () => setConfirmar('reactivar') });
  }
  if (rol === 'superadmin' && editable) {
    acciones.push({ icono: Ban, etiqueta: 'Cancelar anuncio', color: 'peligro', testid: 'publicidad-accion-cancelar', onClick: () => setConfirmar('cancelar') });
  }

  const subtitulo = r.esComercial && r.negocioNombre ? r.negocioNombre : r.anuncianteCorreo ?? null;

  return (
    <>
      <ModalAdaptativo
        abierto
        onCerrar={onCerrar}
        mostrarHeader={false}
        sinScrollInterno
        ancho="lg"
        alturaMaxima="xl"
        discriminador="ficha-publicidad"
      >
        <div className="flex h-full min-h-0 flex-col">
        {/* Cabecera con acciones en íconos (mismo patrón que FichaUsuario) */}
        <div className="flex shrink-0 items-center gap-3 border-b border-borde px-5 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-marca-suave text-marca">
            <Megaphone size={16} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-[-0.2px] text-texto">Detalle del anuncio</span>
          <div className="flex shrink-0 items-center gap-1">
            <AccionesFicha acciones={acciones} testidMenu="publicidad-acciones-menu" />
            <button
              type="button"
              data-testid="ficha-publicidad-cerrar"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" data-testid="ficha-publicidad">
          {isError && (
            <div className="rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
              No se pudo cargar el detalle completo.
            </div>
          )}

          {/* Encabezado: anunciante + estado */}
          <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
            <div className="flex items-center gap-3 border-b border-borde px-4 py-3.5">
              <AvatarUsuario nombre={r.anuncianteNombre} avatarUrl={r.anuncianteAvatar} tam={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-semibold leading-tight text-texto">{r.anuncianteNombre}</div>
                {subtitulo && <div className="truncate text-[12.5px] text-texto-3">{subtitulo}</div>}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-texto-2">
                <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[r.estado] ?? 'bg-slate-400'}`} />
                {ESTADO_LABEL[r.estado] ?? r.estado}
              </span>
            </div>

            {/* Espacios comprados (piezas) */}
            <div className="px-4 py-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-texto-4">
                {r.esCombo ? 'Combo de los 2 tamaños' : 'Espacio comprado'}
              </div>
              {r.piezas.length === 0 ? (
                <div className="text-[13px] text-texto-3">Cargando espacios…</div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {r.piezas.map((p) => (
                    <div key={p.carrusel} className="flex items-center gap-3 rounded-[10px] border border-borde bg-superficie p-2">
                      <img
                        src={p.imagenUrl}
                        alt={CARRUSEL_LABEL[p.carrusel] ?? p.carrusel}
                        className="h-12 w-16 shrink-0 rounded-[7px] border border-borde object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium text-texto">{CARRUSEL_LABEL[p.carrusel] ?? p.carrusel}</div>
                        <div className="text-[12px] text-texto-4">
                          {p.clicks} {p.clicks === 1 ? 'clic' : 'clics'} · {p.impresiones} vistas
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Ciudades + vigencia */}
          <div className="rounded-[12px] border border-borde bg-superficie-2 px-4 py-1.5">
            <Dato
              etiqueta="Ciudades"
              valor={r.ciudades.length ? r.ciudades.map((c) => c.nombre).join(', ') : `${previo.totalCiudades} ciudad(es)`}
            />
            <Dato etiqueta="Vigencia" valor={`${fechaCorta(r.iniciaAt)} → ${fechaCorta(r.expiraAt)}`} />
            {r.estado === 'activa' && r.diasRestantes != null && (
              <Dato etiqueta="Restante" valor={r.diasRestantes <= 0 ? 'Vence hoy' : `${r.diasRestantes} días`} />
            )}
          </div>

          {/* Pago */}
          <div className="rounded-[12px] border border-borde bg-superficie-2 px-4 py-1.5">
            <Dato etiqueta="Origen" valor={ORIGEN_LABEL[r.origen] ?? r.origen} />
            {r.metodoCobro && <Dato etiqueta="Método" valor={METODO_LABEL[r.metodoCobro] ?? r.metodoCobro} />}
            <Dato etiqueta="Monto" valor={r.origen === 'cortesia' ? 'Cortesía' : fmtMonto(r.monto)} />
            {r.folio != null && <Dato etiqueta="Folio" valor={`#${String(r.folio).padStart(5, '0')}`} />}
            {r.reciboUrl && (
              <Dato
                etiqueta="Recibo"
                valor={
                  <a href={r.reciboUrl} target="_blank" rel="noopener noreferrer" className="text-marca underline">
                    Ver PDF
                  </a>
                }
              />
            )}
            {r.registradoPorNombre && <Dato etiqueta="Registrado por" valor={r.registradoPorNombre} />}
          </div>

        </div>
        </div>
      </ModalAdaptativo>

      {confirmar === 'pausar' && (
        <DialogoConfirmar
          abierto
          onCerrar={() => setConfirmar(null)}
          titulo="Pausar anuncio"
          mensaje="Dejará de mostrarse en los carruseles. Puedes reactivarlo después mientras siga vigente."
          textoConfirmar="Pausar"
          discriminador="dialogo-pausar-publicidad"
          cargando={pausar.isPending}
          onConfirmar={() => pausar.mutate(r.id, { onSuccess: () => setConfirmar(null) })}
        />
      )}
      {confirmar === 'reactivar' && (
        <DialogoConfirmar
          abierto
          onCerrar={() => setConfirmar(null)}
          titulo="Reactivar anuncio"
          mensaje="Volverá a mostrarse en los carruseles de sus ciudades."
          textoConfirmar="Reactivar"
          discriminador="dialogo-reactivar-publicidad"
          cargando={reactivar.isPending}
          onConfirmar={() => reactivar.mutate(r.id, { onSuccess: () => setConfirmar(null) })}
        />
      )}
      {confirmar === 'cancelar' && (
        <DialogoConfirmar
          abierto
          onCerrar={() => setConfirmar(null)}
          titulo="Cancelar anuncio"
          variante="danger"
          mensaje="El anuncio se cancela de forma permanente y deja de mostrarse. Esta acción no se puede deshacer."
          textoConfirmar="Cancelar anuncio"
          discriminador="dialogo-cancelar-publicidad"
          cargando={cancelar.isPending}
          onConfirmar={() => cancelar.mutate({ id: r.id, motivo: null }, { onSuccess: () => { setConfirmar(null); onCerrar(); } })}
        />
      )}

      {editando && <DialogoEditarAnuncio detalle={r} onCerrar={() => setEditando(false)} />}
    </>
  );
}

export default FichaPublicidad;
