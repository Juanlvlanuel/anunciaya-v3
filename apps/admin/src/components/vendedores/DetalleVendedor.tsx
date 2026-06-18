/**
 * DetalleVendedor.tsx
 * ===================
 * Vista de DETALLE del vendedor (master-detail) — pieza A: la CARTERA. A diferencia del resto del
 * Panel (que usa modal/drawer para las fichas), "Vendedores y comisiones" estrena una VISTA de
 * detalle a pantalla completa que **aprovecha el ancho**: un panel de identidad a la izquierda
 * (sticky) + el contenido a la derecha (cartera ancha, y en Fase 2 comisiones/pagos/cortes). Los
 * modales se reservan para ACCIONES puntuales. Ver `Tokens_Panel.md` §5.
 *
 * El cuerpo (`CuerpoCartera`) se exporta para reusarlo en la vista del propio vendedor ("Mis
 * comisiones"). Para el VENDEDOR (`vistaVendedor`) NO se muestra la lista de su cartera —esa vive en
 * "Mi cartera" (sección Negocios)— sino sus secciones de dinero (Comisiones/Pagos/Efectivo, Fase 2).
 *
 * Tipografía/colores/radios: `Tokens_Panel.md` §1-3 (cuerpo 14px · tablas/fichas 13.5/13px · badges
 * 11px mono · jerarquía por peso · radios 9/10/12/full · borde 1.5px global).
 *
 * Ubicación: apps/admin/src/components/vendedores/DetalleVendedor.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Store, Phone, Copy, Check, CircleDollarSign, RefreshCw } from 'lucide-react';
import { useCartera, useComisionesVendedor, useRecalcularComisiones } from '../../hooks/queries/useVendedoresAdmin';
import type { VendedorFila, VendedorDetalle, NegocioCartera, CarteraVendedor, ComisionFila } from '../../services/vendedoresService';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { useBackNativo } from '../../hooks/useBackNativo';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { fecha } from '../negocios/FichaNegocio';
import { BadgeEstadoPago, estadoEfectivo } from '../negocios/estadoPago';
import { AvatarUsuario } from '../usuarios/avataresUsuario';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { SeccionPagos } from './SeccionPagos';
import { SeccionEfectivo } from './SeccionEfectivo';

/** Negocios por página en la cartera. */
export const POR_PAGINA_CARTERA = 12;

const EMB_META: Record<string, { etiqueta: string; color: string }> = {
  activo: { etiqueta: 'Activo', color: 'var(--panel-ok)' },
  inactivo: { etiqueta: 'Inactivo', color: 'var(--panel-text-4)' },
  suspendido: { etiqueta: 'Suspendido', color: 'var(--panel-danger)' },
};

function BadgeEmbajador({ estado }: { estado: string }) {
  const meta = EMB_META[estado] ?? { etiqueta: estado, color: 'var(--panel-text-4)' };
  return (
    <span
      className="txt-badge inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color }}
    >
      <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: meta.color }} />
      {meta.etiqueta}
    </span>
  );
}

/** Una línea etiqueta/valor del panel de identidad (densa, jerarquía por peso/color). */
function DatoLinea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="shrink-0 text-[13px] text-texto-3">{etiqueta}</span>
      <span className="min-w-0 truncate text-right text-[14px] font-medium text-texto-2">{valor}</span>
    </div>
  );
}

/** Línea "Link de referido" con botón de copiar (la herramienta de captación del vendedor). */
function LinkCopiable({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(link).then(
      () => { setCopiado(true); setTimeout(() => setCopiado(false), 1500); },
      () => {},
    );
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="shrink-0 text-[13px] text-texto-3">Link de referido</span>
      <button
        type="button"
        data-testid="vendedor-copiar-link"
        onClick={copiar}
        className="inline-flex min-w-0 items-center gap-1.5 rounded-[9px] border border-borde bg-superficie px-2.5 py-1 text-[13px] text-texto-2 transition hover:bg-marca-suave"
      >
        <span className="truncate">{copiado ? 'Copiado' : 'Copiar link'}</span>
        {copiado ? <Check size={14} className="shrink-0 text-ok" /> : <Copy size={14} className="shrink-0 text-texto-4" />}
      </button>
    </div>
  );
}

/** Panel de identidad del vendedor: UNA sola card con identidad + KPIs y, dentro, sus datos
 *  (escritorio: siempre; móvil: tras un botón "Ver datos", para dejar ver antes el contenido). */
function PanelIdentidad({ v }: { v: VendedorFila | VendedorDetalle }) {
  const d = v as VendedorDetalle; // los campos extra existen cuando ya llegó el detalle (placeholder → '—')
  const esEscritorio = useEsEscritorio();
  const [datosAbiertos, setDatosAbiertos] = useState(false);
  const [verAvatar, setVerAvatar] = useState(false);

  const datos = (
    <div className="divide-y divide-borde/60 border-t-[6px] border-borde/70 px-4">
      <DatoLinea etiqueta="Correo" valor={v.correo} />
      {v.linkReferido && <LinkCopiable link={v.linkReferido} />}
      <DatoLinea etiqueta="Teléfono" valor={d.telefono || '—'} />
      <DatoLinea etiqueta="Región" valor={v.regionNombre ?? '—'} />
      <DatoLinea etiqueta="Ciudades" valor={v.ciudades ?? '—'} />
      <DatoLinea etiqueta="Gerente a cargo" valor={d.gerenteNombre || '—'} />
      <DatoLinea etiqueta="Vendedor desde" valor={fecha(d.altaEmbajador ?? null)} />
      <DatoLinea etiqueta="Último acceso" valor={fecha(d.ultimoAccesoPanel ?? null)} />
    </div>
  );

  return (
    <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2 lg:flex lg:h-full lg:flex-col">
      {/* Header: avatar grande centrado (clickeable) + nombre + estado */}
      <div className="flex flex-col items-center px-4 pt-6 pb-4 text-center">
        <button
          type="button"
          data-testid="vendedor-avatar"
          onClick={() => setVerAvatar((x) => !x)}
          aria-label="Ver foto del vendedor"
          className="rounded-full transition hover:opacity-90 focus:outline-none focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
        >
          <AvatarUsuario nombre={v.nombre || v.correo} avatarUrl={null} tam={64} />
        </button>
        <span className="mt-3 text-[17px] font-bold tracking-[-0.2px] text-texto">{v.nombre || '(Sin nombre)'}</span>
        <span className="mt-2"><BadgeEmbajador estado={v.estadoEmbajador} /></span>
        {verAvatar && (
          <p className="mt-2 text-[11px] text-texto-4">Este vendedor aún no tiene foto de perfil.</p>
        )}
      </div>
      {/* KPIs protagonistas */}
      <div className="grid grid-cols-2 border-t border-borde">
        <div className="px-3 py-4 text-center">
          <p className="text-[24px] font-bold leading-none text-texto" data-testid="vendedor-metrica-cartera">{v.negociosEnCartera}</p>
          <p className="mt-1.5 text-[13px] text-texto-3">en cartera</p>
        </div>
        <div className="border-l border-borde px-3 py-4 text-center">
          <p className="text-[24px] font-bold leading-none" style={{ color: 'var(--panel-ok)' }} data-testid="vendedor-metrica-activos">{v.negociosActivos}</p>
          <p className="mt-1.5 text-[13px] text-texto-3">activos · comisión</p>
        </div>
      </div>

      {/* Datos: escritorio siempre; móvil tras un botón, todo DENTRO de la card */}
      {esEscritorio ? (
        datos
      ) : (
        <>
          <button
            type="button"
            data-testid="vendedor-toggle-datos"
            onClick={() => setDatosAbiertos((x) => !x)}
            className="flex w-full items-center justify-between gap-2 border-t border-borde px-4 py-2.5 text-[13px] font-medium text-texto-2 transition hover:bg-marca-suave"
          >
            <span>{datosAbiertos ? 'Ocultar datos del vendedor' : 'Ver datos del vendedor'}</span>
            <ChevronDown size={16} className={`shrink-0 transition-transform ${datosAbiertos ? 'rotate-180' : ''}`} />
          </button>
          {datosAbiertos && datos}
        </>
      )}
    </div>
  );
}

/** Logo del negocio (imagen de marca o inicial), círculo completo. */
function LogoNegocio({ n, tam = 40 }: { n: NegocioCartera; tam?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-full border border-borde bg-superficie text-texto-4"
      style={{ width: tam, height: tam }}
    >
      {n.logoUrl ? <img src={n.logoUrl} alt="" className="h-full w-full object-cover" /> : <Store size={Math.round(tam * 0.42)} />}
    </span>
  );
}

function textoCobro(n: NegocioCartera): string {
  if (n.proximoCobro) return `Cobro: ${fecha(n.proximoCobro)}`;
  if (n.vencimiento) return `Vence: ${fecha(n.vencimiento)}`;
  return '—';
}

/** Fila ancha (escritorio) — grid de columnas que aprovecha el ancho de la tabla. */
function FilaNegocioEscritorio({ n, cols }: { n: NegocioCartera; cols: string }) {
  return (
    <div
      data-testid={`cartera-negocio-${n.id}`}
      className="grid items-center gap-4 border-b border-borde px-4 py-4 last:border-b-0"
      style={{ gridTemplateColumns: cols }}
    >
      <span className="flex min-w-0 items-center gap-3">
        <LogoNegocio n={n} tam={44} />
        <span className="truncate text-[14px] font-semibold text-texto">{n.nombre}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13.5px] text-texto-2">{n.ciudad ?? 'Sin ciudad'}</span>
        <span className="text-[13px] text-texto-4">{n.metodoCobro === 'manual' ? 'Efectivo' : 'Tarjeta'}</span>
      </span>
      <span className="truncate text-[13px] text-texto-3">
        {n.duenoTelefono ? (
          <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {n.duenoTelefono}</span>
        ) : '—'}
      </span>
      <span><BadgeEstadoPago estado={estadoEfectivo(n.estadoAdmin, n.estadoPago)} small /></span>
      <span className="text-right text-[13px] text-texto-3">{textoCobro(n)}</span>
    </div>
  );
}

/** Card (móvil) — apilada (el piso de 14px de §9.1 aplica al texto). */
function CardNegocio({ n }: { n: NegocioCartera }) {
  return (
    <div data-testid={`cartera-negocio-${n.id}`} className="flex items-center gap-3 border-b border-borde px-3 py-3 last:border-b-0">
      <LogoNegocio n={n} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] font-semibold text-texto">{n.nombre}</span>
        <span className="truncate text-[13px] text-texto-3">{n.ciudad ?? 'Sin ciudad'}{n.metodoCobro === 'manual' ? ' · efectivo' : ''}</span>
        {n.duenoTelefono && <span className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-texto-4"><Phone size={13} /> {n.duenoTelefono}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <BadgeEstadoPago estado={estadoEfectivo(n.estadoAdmin, n.estadoPago)} small />
        <span className="text-[13px] text-texto-4">{textoCobro(n)}</span>
      </span>
    </div>
  );
}

function PaginacionCartera({ pagina, totalPaginas, setPagina }: { pagina: number; totalPaginas: number; setPagina: (p: number) => void }) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-end gap-1.5 text-[13px] text-texto-3">
      <button
        type="button"
        data-testid="cartera-anterior"
        onClick={() => setPagina(Math.max(1, pagina - 1))}
        disabled={pagina <= 1}
        className="inline-flex items-center gap-1 rounded-[9px] bg-marca-suave px-2.5 py-1.5 font-semibold text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ChevronLeft size={14} /> Anterior
      </button>
      <span className="px-1.5">{pagina} / {totalPaginas}</span>
      <button
        type="button"
        data-testid="cartera-siguiente"
        onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
        disabled={pagina >= totalPaginas}
        className="inline-flex items-center gap-1 rounded-[9px] bg-marca-suave px-2.5 py-1.5 font-semibold text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
      >
        Siguiente <ChevronRight size={14} />
      </button>
    </div>
  );
}

/** Lista de negocios de la cartera: tabla ancha en escritorio, cards en móvil. */
function ListaCartera({ items, isLoading, isError, hayDatos }: { items: NegocioCartera[]; isLoading: boolean; isError: boolean; hayDatos: boolean }) {
  const esEscritorio = useEsEscritorio();
  const cols = 'minmax(0,2fr) minmax(0,1.2fr) minmax(0,1.2fr) 120px 130px';

  const estado = isLoading && !hayDatos ? (
    <EstadoSeccion variante="cargando" icono={Store} titulo="Cargando cartera…" />
  ) : isError ? (
    <EstadoSeccion variante="error" icono={Store} titulo="No se pudo cargar la cartera." descripcion="Revisa tu conexión e inténtalo de nuevo." />
  ) : items.length === 0 ? (
    <EstadoSeccion icono={Store} titulo="Sin negocios en la cartera" descripcion="Cuando este vendedor firme un negocio, aparecerá aquí." />
  ) : null;

  if (!esEscritorio) {
    return (
      <div className="overflow-hidden rounded-[12px] border border-borde">
        {estado ?? items.map((n) => <CardNegocio key={n.id} n={n} />)}
      </div>
    );
  }

  // Escritorio: encabezado de columnas FIJO + filas que LLENAN el alto disponible con scroll interno.
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde">
      <div
        className="grid shrink-0 items-center gap-4 border-b border-borde bg-superficie px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
        style={{ gridTemplateColumns: cols }}
      >
        <span>Negocio</span>
        <span>Ubicación</span>
        <span>Contacto</span>
        <span>Estado</span>
        <span className="text-right">Próximo cobro</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {estado ?? items.map((n) => <FilaNegocioEscritorio key={n.id} n={n} cols={cols} />)}
      </div>
    </div>
  );
}

export type TabVendedor = 'cartera' | 'comisiones' | 'pagos' | 'efectivo';

/** Pestañas de las secciones del expediente del vendedor (carrusel en una línea). Todas navegables
 *  (Cartera, Comisiones, Pagos, Efectivo). El vendedor NO ve "Cartera" (vive en "Mi cartera"). */
function PestaniasVendedor({ vistaVendedor, activa, onCambiar }: { vistaVendedor: boolean; activa: TabVendedor; onCambiar: (t: TabVendedor) => void }) {
  const tabs: Array<{ id: TabVendedor; label: string; disponible: boolean }> = vistaVendedor
    ? [
        { id: 'comisiones', label: 'Comisiones', disponible: true },
        { id: 'pagos', label: 'Pagos', disponible: true },
        { id: 'efectivo', label: 'Efectivo', disponible: true },
      ]
    : [
        { id: 'cartera', label: 'Cartera', disponible: true },
        { id: 'comisiones', label: 'Comisiones', disponible: true },
        { id: 'pagos', label: 'Pagos', disponible: true },
        { id: 'efectivo', label: 'Efectivo', disponible: true },
      ];
  return (
    <div className="mb-2.5 flex shrink-0 gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
      {tabs.map((t) =>
        !t.disponible ? (
          <span key={t.id} className="shrink-0 whitespace-nowrap rounded-full border border-borde px-3 py-1 text-[13px] font-medium text-texto-4">{t.label} · pronto</span>
        ) : (
          <button
            key={t.id}
            type="button"
            data-testid={`tab-vendedor-${t.id}`}
            onClick={() => onCambiar(t.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[13px] transition ${
              t.id === activa
                ? 'border-marca bg-marca-suave font-semibold text-marca'
                : 'border-borde font-medium text-texto-2 hover:bg-marca-suave hover:text-marca'
            }`}
          >
            {t.label}
          </button>
        ),
      )}
    </div>
  );
}

// =============================================================================
// SECCIÓN COMISIONES (Fase 2 · pieza B — estado de cuenta)
// =============================================================================

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** 'YYYY-MM' → "jun 2026". */
function periodoLegible(p: string | null): string {
  if (!p) return '—';
  const [y, m] = p.split('-');
  return MESES[Number(m) - 1] ? `${MESES[Number(m) - 1]} ${y}` : p;
}
function pesos(n: number): string {
  return `$${n.toLocaleString('es-MX')}`;
}

const COM_META: Record<string, { etiqueta: string; color: string }> = {
  pendiente: { etiqueta: 'Pendiente', color: 'var(--panel-text-3)' },
  pagada: { etiqueta: 'Pagada', color: 'var(--panel-ok)' },
  cancelada: { etiqueta: 'Cancelada', color: 'var(--panel-text-4)' },
};

function BadgeComision({ estado }: { estado: string }) {
  const meta = COM_META[estado] ?? { etiqueta: estado, color: 'var(--panel-text-4)' };
  return (
    <span
      className="txt-badge inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color }}
    >
      {meta.etiqueta}
    </span>
  );
}

function KpiComision({ etiqueta, monto, color }: { etiqueta: string; monto: number; color?: string }) {
  return (
    <div className="rounded-[12px] border border-borde bg-superficie-2 px-3 py-3 text-center">
      <p className="text-[20px] font-bold leading-none text-texto" style={color ? { color } : undefined}>{pesos(monto)}</p>
      <p className="mt-1.5 text-[12px] text-texto-3">{etiqueta}</p>
    </div>
  );
}

function FilaComision({ c }: { c: ComisionFila }) {
  const esAlta = c.tipo === 'alta';
  return (
    <div data-testid={`comision-${c.id}`} className="flex items-center gap-3 border-b border-borde px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold capitalize text-texto">{esAlta ? 'Comisión de alta' : periodoLegible(c.periodo)}</span>
        <span className="truncate text-[13px] text-texto-3">
          {esAlta
            ? 'Pago único por la venta concretada'
            : c.activos !== null
              ? `${c.activos} activos × ${pesos(c.montoUnitario ?? 0)}${c.escalon ? ` · escalón ${c.escalon}` : ''}`
              : c.tipo}
        </span>
      </div>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-texto">{pesos(c.monto)}</span>
      <BadgeComision estado={c.estado} />
    </div>
  );
}

/** Estado de cuenta de comisiones del vendedor: KPIs + lista por mes + (solo super) recalcular. */
function SeccionComisiones({ vendedorId }: { vendedorId: string }) {
  const esSuper = useAuthPanelStore((s) => s.usuario?.rolEquipo) === 'superadmin';
  const { data, isLoading, isError } = useComisionesVendedor(vendedorId);
  const recalcular = useRecalcularComisiones();

  const items = data?.items ?? [];
  const resumen = data?.resumen ?? { devengado: 0, pagado: 0, pendiente: 0 };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="seccion-comisiones">
      {/* KPIs del estado de cuenta */}
      <div className="mb-3 grid shrink-0 grid-cols-3 gap-2">
        <KpiComision etiqueta="Devengado" monto={resumen.devengado} />
        <KpiComision etiqueta="Pagado" monto={resumen.pagado} color="var(--panel-ok)" />
        <KpiComision etiqueta="Pendiente" monto={resumen.pendiente} />
      </div>

      {/* Encabezado de la lista + recalcular (solo super) */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-texto-2">Comisiones por mes</h3>
        {esSuper && (
          <button
            type="button"
            data-testid="comisiones-recalcular"
            onClick={() => recalcular.mutate(undefined)}
            disabled={recalcular.isPending}
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12px] font-semibold text-texto-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca disabled:opacity-50"
          >
            <RefreshCw size={13} className={recalcular.isPending ? 'animate-spin' : ''} />
            {recalcular.isPending ? 'Recalculando…' : 'Recalcular mes'}
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="min-h-0 flex-1 overflow-y-auto rounded-[12px] border border-borde">
        {isLoading && !data ? (
          <EstadoSeccion variante="cargando" icono={CircleDollarSign} titulo="Cargando comisiones…" />
        ) : isError ? (
          <EstadoSeccion variante="error" icono={CircleDollarSign} titulo="No se pudieron cargar las comisiones." descripcion="Revisa tu conexión e inténtalo de nuevo." />
        ) : items.length === 0 ? (
          <EstadoSeccion
            icono={CircleDollarSign}
            titulo="Sin comisiones todavía"
            descripcion="Cuando se devengue la comisión del mes (según los negocios activos y la escalera), aparecerá aquí."
          />
        ) : (
          items.map((c) => <FilaComision key={c.id} c={c} />)
        )}
      </div>
    </div>
  );
}

/**
 * Cuerpo del detalle con layout de dashboard: identidad (izquierda) + contenido (derecha).
 * Super/gerente ven la CARTERA y las COMISIONES del vendedor; el propio vendedor (`vistaVendedor`) NO
 * ve la cartera aquí (vive en "Mi cartera") sino sus comisiones (Pagos/Efectivo llegan en la pieza E).
 */
export function CuerpoCartera({
  cartera,
  placeholder,
  isLoading,
  isError,
  pagina,
  setPagina,
  vistaVendedor = false,
}: {
  cartera: CarteraVendedor | null | undefined;
  placeholder: VendedorFila | VendedorDetalle;
  isLoading: boolean;
  isError: boolean;
  pagina: number;
  setPagina: (p: number) => void;
  vistaVendedor?: boolean;
}) {
  const vendedor = cartera?.vendedor ?? placeholder;
  const items = cartera?.items ?? [];
  const total = cartera?.total ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_CARTERA));

  // Pestaña activa: el vendedor arranca en "Comisiones" (su cartera vive en "Mi cartera"); super/gerente en "Cartera".
  const [tab, setTab] = useState<TabVendedor>(vistaVendedor ? 'comisiones' : 'cartera');

  return (
    <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-stretch" data-testid="cuerpo-cartera">
      {/* Columna izquierda: identidad + datos (ocupa el alto; scroll propio si el contenido es largo) */}
      <aside className="lg:min-h-0 lg:overflow-y-auto">
        <PanelIdentidad v={vendedor} />
      </aside>

      {/* Columna derecha: pestañas + contenido */}
      <section className="flex min-w-0 flex-col lg:min-h-0">
        <PestaniasVendedor vistaVendedor={vistaVendedor} activa={tab} onCambiar={setTab} />

        {tab === 'comisiones' ? (
          <SeccionComisiones vendedorId={vendedor.id} />
        ) : tab === 'pagos' ? (
          <SeccionPagos vendedorId={vendedor.id} />
        ) : tab === 'cartera' ? (
          <>
            <h3 className="mb-2 shrink-0 text-[13px] font-semibold text-texto-2">Negocios de su cartera{cartera ? ` (${total})` : ''}</h3>
            <ListaCartera items={items} isLoading={isLoading} isError={isError} hayDatos={!!cartera} />
            {total > POR_PAGINA_CARTERA && <PaginacionCartera pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
          </>
        ) : (
          <SeccionEfectivo vendedorId={vendedor.id} />
        )}
      </section>
    </div>
  );
}

/**
 * Vista de detalle del vendedor (super/gerente). Reemplaza la lista (full-width), con botón "Volver"
 * que también responde al back nativo. Abre al instante con la fila como placeholder; React Query rellena.
 */
export function DetalleVendedor({ previo, onCerrar, pagina, setPagina }: {
  previo: VendedorFila;
  onCerrar: () => void;
  pagina: number;
  setPagina: (p: number) => void;
}) {
  const esEscritorio = useEsEscritorio();
  const { data, isLoading, isError } = useCartera(previo.id, { pagina, porPagina: POR_PAGINA_CARTERA });

  useBackNativo({ abierto: true, onCerrar, discriminador: 'detalle-vendedor' });

  const scrollRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : scrollRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="detalle-vendedor">
      {/* Cabecera con "Volver" */}
      <div className="flex shrink-0 items-center gap-3 border-b border-borde px-4 py-3 lg:px-6">
        <button
          type="button"
          data-testid="detalle-vendedor-volver"
          onClick={onCerrar}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-texto-2 transition hover:bg-marca-suave hover:text-marca"
        >
          <ChevronLeft size={17} /> Volver
        </button>
        <span className="truncate text-[16px] font-bold tracking-[-0.2px] text-texto" data-testid="detalle-vendedor-nombre">
          {previo.nombre || '(Sin nombre)'}
        </span>
      </div>

      {/* Cuerpo a todo el ancho. En escritorio no scrollea como un todo: la lista llena el alto y scrollea. */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-hidden lg:p-6">
        <CuerpoCartera cartera={data} placeholder={previo} isLoading={isLoading} isError={isError} pagina={pagina} setPagina={setPagina} />
      </div>
    </div>
  );
}

export default DetalleVendedor;
