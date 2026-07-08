/**
 * SeccionResumen.tsx
 * ===================
 * Módulo "Resumen / inicio" del Panel = el tablero de bienvenida. Solo lectura.
 *   - Encabezado contextual (alcance + periodo).
 *   - KPIs gruesos (clicables → deep-link a su sección): super/gerente ven plataforma/región;
 *     el vendedor ve lo suyo (cartera activa, comisiones, efectivo).
 *   - Cola de pendientes accionable (centro de trabajo, NO feed): efectivo por entregar + negocios
 *     en gracia. Cada item lleva a la sección que resuelve la tarea.
 *
 * El alcance por rol lo aplica el backend; aquí el `rol` solo cambia qué KPIs/copys se muestran.
 * Diseño según Tokens_Panel.md (B2B denso, neutro + un acento, sin círculos pastel). Responsive
 * base/lg:/2xl: con un solo layout (el fondo del contenedor padre no cambia por breakpoint).
 *
 * Ubicación: apps/admin/src/components/resumen/SeccionResumen.tsx
 */

import { useRef, useEffect, type ReactNode } from 'react';
import { Store, Users, CircleDollarSign, CreditCard, Wallet, Clock, ChevronRight, CheckCircle2, Sun, CloudSun, Moon, type LucideIcon } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { useResumen } from '../../hooks/queries/useResumen';
import { useNavegacionPanel } from '../../stores/useNavegacionPanel';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { EstadoSeccion } from '../ui/EstadoSeccion';

const FMT_MONEDA = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const FMT_NUM = new Intl.NumberFormat('es-MX');

type Acento = 'ok' | 'danger';
interface MetaKpi {
  etiqueta: string;
  /** Etiqueta abreviada para móvil (si no se define, usa `etiqueta`). */
  etiquetaCorta?: string;
  formato: 'numero' | 'moneda';
  icono: LucideIcon;
  destino: string;
  filtro?: { negocios?: { estadoPago?: string }; suscripciones?: { tipo?: string } };
  acento?: Acento;
}

/** La clave del KPI (la pone el backend) decide etiqueta, formato, ícono, acento y deep-link. */
const META_KPI: Record<string, MetaKpi> = {
  negociosActivos: { etiqueta: 'Negocios activos', etiquetaCorta: 'Neg. Activos', formato: 'numero', icono: Store, destino: 'negocios' },
  usuarios: { etiqueta: 'Usuarios', formato: 'numero', icono: Users, destino: 'usuarios' },
  ingresosMes: { etiqueta: 'Ingresos del mes', etiquetaCorta: 'Ing. del Mes', formato: 'moneda', icono: CircleDollarSign, destino: 'suscripciones', acento: 'ok' },
  cobrosFallidos: { etiqueta: 'Cobros fallidos', etiquetaCorta: 'Cob. Fallidos', formato: 'numero', icono: CreditCard, destino: 'suscripciones', filtro: { suscripciones: { tipo: 'cobro_fallido' } } },
  carteraActiva: { etiqueta: 'Mi cartera activa', etiquetaCorta: 'Cartera Act.', formato: 'numero', icono: Store, destino: 'negocios' },
  comisionesPendientes: { etiqueta: 'Comisiones pendientes', etiquetaCorta: 'Comis. Pend.', formato: 'moneda', icono: CircleDollarSign, destino: 'comisiones', acento: 'ok' },
  efectivoPorEntregar: { etiqueta: 'Efectivo por entregar', etiquetaCorta: 'Efec. Entregar', formato: 'moneda', icono: Wallet, destino: 'comisiones' },
};

function colorAcento(acento?: Acento): string {
  return acento === 'ok' ? 'var(--panel-ok)' : acento === 'danger' ? 'var(--panel-danger)' : 'var(--panel-text)';
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Saludo según la hora local. */
function saludoPorHora(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Ícono a juego con el saludo (mañana → sol · tarde → sol entre nubes · noche → luna). */
function iconoPorHora(): LucideIcon {
  const h = new Date().getHours();
  if (h < 12) return Sun;
  if (h < 19) return CloudSun;
  return Moon;
}

/** Texto secundario bajo cada KPI (contexto, no un dato extra). */
function contextoKpi(clave: string, rol: RolPanel, periodoMes: string): string | undefined {
  switch (clave) {
    case 'negociosActivos':
      return rol === 'gerente' ? 'Al corriente en tu región' : 'Al corriente en la plataforma';
    case 'usuarios':
      return rol === 'gerente' ? 'En tu región' : 'Registrados en total';
    case 'ingresosMes':
    case 'cobrosFallidos':
      return periodoMes;
    case 'carteraActiva':
      return 'Negocios al corriente';
    case 'comisionesPendientes':
      return 'Por cobrarte';
    case 'efectivoPorEntregar':
      return 'Que debes entregar';
    default:
      return undefined;
  }
}

function textoGracia(dias: number | null): string {
  if (dias == null) return 'Sin fecha límite';
  if (dias < 0) return 'Plazo vencido';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  return `Faltan ${dias} días`;
}

export function SeccionResumen({ rol }: { rol: RolPanel }) {
  const { data, isLoading, isError } = useResumen();
  const navegar = useNavegacionPanel((s) => s.navegar);
  const nombreUsuario = useAuthPanelStore((s) => s.usuario?.nombre ?? '');

  // Auto-ocultar la barra inferior (móvil) al hacer scroll: registra el contenedor scrolleable
  // (solo en móvil). Incluye isLoading/isError en deps porque el contenedor solo existe tras cargar.
  const esEscritorio = useEsEscritorio();
  const scrollRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : scrollRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl, isLoading, isError]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col p-4 lg:p-5">
        <EstadoSeccion variante="cargando" icono={Store} titulo="Cargando el resumen…" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex h-full flex-col p-4 lg:p-5">
        <EstadoSeccion
          variante="error"
          icono={Store}
          titulo="No se pudo cargar el resumen."
          descripcion="Revisa tu conexión e inténtalo de nuevo."
        />
      </div>
    );
  }

  const { kpis, pendientes } = data;
  const esVendedor = rol === 'vendedor';
  // "Ver todos" solo si hay más pendientes de los que se muestran en el tablero.
  const hayMasEfectivo = !esVendedor && pendientes.efectivo.totalVendedores > pendientes.efectivo.items.length;
  const hayMasGracia = pendientes.gracia.total > pendientes.gracia.items.length;
  const hayMasSolicitudes = pendientes.solicitudes.total > pendientes.solicitudes.items.length;
  const hayMasComisiones = pendientes.comisiones.totalVendedores > pendientes.comisiones.items.length;
  const periodoMes = capitalizar(new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }));
  const primerNombre = nombreUsuario.trim().split(' ')[0];
  const saludo = primerNombre ? `${saludoPorHora()}, ${primerNombre}` : saludoPorHora();
  const IconoSaludo = iconoPorHora();
  const fechaHoy = capitalizar(
    new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  );

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-5 lg:p-6 2xl:p-7">
      <style>{`@keyframes ay-saludo-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}`}</style>
      <div className="flex w-full flex-col gap-6 lg:gap-7">
        {/* ── Barra superior: saludo (izq) + KPIs compactos clicables (der), 1 renglón ── */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-marca-suave text-marca"
              style={{ animation: 'ay-saludo-float 3.4s ease-in-out infinite' }}
              aria-hidden="true"
            >
              <IconoSaludo size={22} />
            </span>
            <div className="flex flex-col gap-0.5">
              <h2 className="text-[19px] font-semibold tracking-[-0.2px] text-texto lg:text-[21px]">{saludo}</h2>
              <p className="text-[13px] text-texto-3">{fechaHoy}</p>
            </div>
          </div>

          {/* KPIs compactos y divididos (estilo Métricas). Siguen clicables (deep-link); el texto
              de contexto pasa a tooltip. Móvil: carrusel horizontal (w-full + scroll). Escritorio: a la derecha. */}
          <div className="flex w-full items-stretch divide-x divide-borde overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:w-auto lg:shrink-0">
            {kpis.map((k) => {
              const meta = META_KPI[k.clave];
              if (!meta) return null;
              const acento: Acento | undefined =
                k.clave === 'cobrosFallidos' ? (k.valor > 0 ? 'danger' : undefined) : meta.acento;
              const valor = meta.formato === 'moneda' ? FMT_MONEDA.format(k.valor) : FMT_NUM.format(k.valor);
              const contexto = contextoKpi(k.clave, rol, periodoMes);
              return (
                <button
                  key={k.clave}
                  type="button"
                  data-testid={`resumen-kpi-${k.clave}`}
                  onClick={() => navegar(meta.destino, meta.filtro)}
                  title={contexto ? `${meta.etiqueta} · ${contexto}` : meta.etiqueta}
                  className="group flex shrink-0 flex-col items-center justify-center px-5 py-1 text-center leading-tight transition hover:bg-marca-suave/50"
                >
                  <span className="txt-badge whitespace-nowrap font-semibold uppercase tracking-wide text-texto-4 transition group-hover:text-marca lg:text-[11px]">
                    <span className="lg:hidden">{meta.etiquetaCorta ?? meta.etiqueta}</span>
                    <span className="hidden lg:inline">{meta.etiqueta}</span>
                  </span>
                  <span className="mt-1 whitespace-nowrap text-[17px] font-bold leading-tight lg:text-[22px]" style={{ color: colorAcento(acento) }}>
                    {valor}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Cola de pendientes ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-texto">Pendientes por resolver</h3>
            {pendientes.contador > 0 ? (
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-marca/30 bg-marca-suave py-1 pl-1 pr-3 text-[12.5px] font-semibold text-marca">
                <span className="grid h-6 min-w-[24px] place-items-center rounded-full bg-marca px-1 text-[12px] font-bold tabular-nums text-marca-contraste">
                  {pendientes.contador}
                </span>
                {pendientes.contador === 1 ? 'tarea pendiente' : 'tareas pendientes'}
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-borde bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-ok">
                <CheckCircle2 size={15} /> Todo al día
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Efectivo por entregar */}
            <BloquePendiente
              testid="resumen-pendiente-efectivo"
              icono={Wallet}
              titulo="Efectivo por entregar"
              contador={esVendedor ? (pendientes.efectivo.monto > 0 ? 1 : 0) : pendientes.efectivo.totalVendedores}
              resumen={pendientes.efectivo.monto > 0 ? `${FMT_MONEDA.format(pendientes.efectivo.monto)} sin entregar` : undefined}
              vacioTexto={esVendedor ? 'No tienes efectivo por entregar.' : 'Ningún vendedor debe efectivo.'}
              hayMas={hayMasEfectivo}
              onAbrirTodo={() => navegar('comisiones')}
            >
              {esVendedor
                ? pendientes.efectivo.monto > 0 && (
                    <FilaPendiente
                      testid="resumen-efectivo-propio"
                      icono={Wallet}
                      titulo="Tu efectivo cobrado"
                      subtitulo="Pendiente de entregar"
                      valor={FMT_MONEDA.format(pendientes.efectivo.monto)}
                      onClick={() => navegar('comisiones')}
                    />
                  )
                : pendientes.efectivo.items.map((v) => (
                    <FilaPendiente
                      key={v.embajadorId}
                      testid={`resumen-efectivo-item-${v.embajadorId}`}
                      icono={Wallet}
                      titulo={v.nombre}
                      subtitulo="Por entregar"
                      valor={FMT_MONEDA.format(v.saldo)}
                      onClick={() =>
                        navegar('comisiones', v.usuarioId
                          ? { vendedores: { usuarioId: v.usuarioId, embajadorId: v.embajadorId, nombre: v.nombre, tab: 'efectivo' } }
                          : undefined)
                      }
                    />
                  ))}
            </BloquePendiente>

            {/* Negocios en gracia */}
            <BloquePendiente
              testid="resumen-pendiente-gracia"
              icono={Clock}
              titulo={esVendedor ? 'Mis negocios en gracia' : 'Negocios en gracia'}
              contador={pendientes.gracia.total}
              resumen={pendientes.gracia.total > 0 ? 'Por suspenderse si no pagan' : undefined}
              vacioTexto="Ningún negocio en gracia."
              hayMas={hayMasGracia}
              onAbrirTodo={() => navegar('negocios', { negocios: { estadoPago: 'en_gracia' } })}
            >
              {pendientes.gracia.items.map((n) => {
                const urgente = n.diasRestantes != null && n.diasRestantes <= 1;
                return (
                  <FilaPendiente
                    key={n.id}
                    testid={`resumen-gracia-item-${n.id}`}
                    icono={Store}
                    titulo={n.nombre}
                    subtitulo={[n.ciudad, n.vendedorNombre].filter(Boolean).join(' · ') || 'Sin ciudad'}
                    valor={textoGracia(n.diasRestantes)}
                    valorAcento={urgente ? 'danger' : undefined}
                    onClick={() => navegar('negocios', { negocios: { estadoPago: 'en_gracia' } })}
                  />
                );
              })}
            </BloquePendiente>

            {/* Pagos manuales por verificar (super + gerente de su región) */}
            {data.rol !== 'vendedor' && (
              <BloquePendiente
                testid="resumen-pendiente-pagos"
                icono={CreditCard}
                titulo="Pagos por verificar"
                contador={pendientes.solicitudes.total}
                resumen={pendientes.solicitudes.total > 0 ? 'Comprobantes por aprobar o rechazar' : undefined}
                vacioTexto="Ningún pago manual por verificar."
                hayMas={hayMasSolicitudes}
                onAbrirTodo={() => navegar('suscripciones', { suscripciones: { pestana: 'por-verificar' } })}
              >
                {pendientes.solicitudes.items.map((s) => (
                  <FilaPendiente
                    key={s.id}
                    testid={`resumen-solicitud-item-${s.id}`}
                    icono={CreditCard}
                    titulo={s.negocioNombre}
                    subtitulo="Pago manual con comprobante"
                    valor={FMT_MONEDA.format(Number(s.monto))}
                    onClick={() => navegar('suscripciones', { suscripciones: { pestana: 'por-verificar' } })}
                  />
                ))}
              </BloquePendiente>
            )}

            {/* Comisiones por liquidar a vendedores (solo superadmin; con lente de región no aplica) */}
            {data.rol === 'superadmin' && (
              <BloquePendiente
                testid="resumen-pendiente-comisiones"
                icono={CircleDollarSign}
                titulo="Comisiones por pagar"
                contador={pendientes.comisiones.totalVendedores}
                resumen={pendientes.comisiones.monto > 0 ? `${FMT_MONEDA.format(pendientes.comisiones.monto)} por liquidar` : undefined}
                vacioTexto="Ninguna comisión por pagar."
                hayMas={hayMasComisiones}
                onAbrirTodo={() => navegar('comisiones')}
              >
                {pendientes.comisiones.items.map((c) => (
                  <FilaPendiente
                    key={c.embajadorId}
                    testid={`resumen-comision-item-${c.embajadorId}`}
                    icono={CircleDollarSign}
                    titulo={c.nombre}
                    subtitulo="Por liquidar"
                    valor={FMT_MONEDA.format(c.monto)}
                    onClick={() =>
                      navegar('comisiones', c.usuarioId
                        ? { vendedores: { usuarioId: c.usuarioId, embajadorId: c.embajadorId, nombre: c.nombre, tab: 'pagos' } }
                        : undefined)
                    }
                  />
                ))}
              </BloquePendiente>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

function BloquePendiente({
  testid,
  icono: Icono,
  titulo,
  contador,
  resumen,
  vacioTexto,
  hayMas,
  onAbrirTodo,
  children,
}: {
  testid: string;
  icono: LucideIcon;
  titulo: string;
  contador: number;
  resumen?: string;
  vacioTexto: string;
  hayMas: boolean;
  onAbrirTodo: () => void;
  children?: ReactNode;
}) {
  const vacio = contador === 0;
  return (
    <section
      data-testid={testid}
      className="flex h-[300px] flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel"
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b border-borde px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
          <Icono size={17} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{titulo}</span>
          {resumen && <span className="truncate text-[12px] text-texto-3">{resumen}</span>}
        </span>
        {!vacio && (
          <span className="txt-badge grid h-6 min-w-[24px] shrink-0 place-items-center rounded-full bg-marca-suave px-1.5 text-[12.5px] font-semibold text-marca">
            {contador}
          </span>
        )}
      </header>

      {vacio ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-7 text-center">
          <CheckCircle2 size={22} style={{ color: 'var(--panel-ok)' }} />
          <p className="text-[13px] text-texto-3">{vacioTexto}</p>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col p-1.5">
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
            {children}
          </div>
          {hayMas && (
            <button
              type="button"
              onClick={onAbrirTodo}
              className="mt-1 flex shrink-0 items-center justify-center gap-1 rounded-[9px] px-2.5 py-2 text-[12.5px] font-semibold text-marca transition hover:bg-marca-suave"
            >
              Ver todos <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function FilaPendiente({
  testid,
  icono: Icono,
  titulo,
  subtitulo,
  valor,
  valorAcento,
  onClick,
}: {
  testid: string;
  icono: LucideIcon;
  titulo: string;
  subtitulo: string;
  valor: string;
  valorAcento?: Acento;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2 text-left transition hover:bg-marca-suave"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-borde bg-superficie-2 text-texto-3 transition group-hover:border-borde-fuerte group-hover:text-marca">
        <Icono size={15} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium text-texto">{titulo}</span>
        <span className="truncate text-[12px] text-texto-3">{subtitulo}</span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold" style={{ color: colorAcento(valorAcento) }}>
        {valor}
      </span>
    </button>
  );
}

export default SeccionResumen;
