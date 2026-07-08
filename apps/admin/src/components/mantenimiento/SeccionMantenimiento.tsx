/**
 * SeccionMantenimiento.tsx
 * ========================
 * Módulo "Mantenimiento" del Panel = el centro de operación técnica del SuperAdmin.
 * Solo lectura (V1). Cuatro bloques:
 *   1. Salud del sistema   — semáforos BD/Redis/R2/Stripe + latencia (autorefresh ~45s).
 *   2. Tareas programadas  — los 7 crons activos: cadencia + última corrida (telemetría en memoria).
 *   3. Logs recientes      — ventana de los últimos console.* (en memoria) con filtro + pausa.
 *   4. Recolector R2       — histórico de ejecuciones + escaneo bajo demanda (reporte dry-run).
 *
 * La limpieza real de R2 NO se ejecuta desde aquí: el bucket es compartido dev/prod y borrar
 * desde prod es inseguro, así que se sigue corriendo por cURL desde local (ver Mantenimiento_R2.md).
 *
 * Diseño según Tokens_Panel.md (B2B denso, neutro + un acento; semáforos con var(--panel-ok/warn/danger)).
 *
 * Ubicación: apps/admin/src/components/mantenimiento/SeccionMantenimiento.tsx
 */

import { useState, useMemo, type ReactNode } from 'react';
import { TabsSegmento } from '../ui/TabsSegmento';
import {
  Activity,
  Database,
  Server,
  Cloud,
  CreditCard,
  Clock,
  Terminal,
  Trash2,
  RefreshCw,
  Pause,
  Play,
  Download,
  Eraser,
  DatabaseZap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  CircleDashed,
  type LucideIcon,
} from 'lucide-react';
import { EstadoSeccion } from '../ui/EstadoSeccion';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Tooltip } from '../ui/Tooltip';
import {
  useSalud,
  useCrons,
  useLogs,
  useReconcile,
  useReconcileLog,
  useEjecutarLimpiezaR2,
  useEjecutarCron,
  usePreviewCron,
  usePurgarCache,
  useVaciarLogs,
} from '../../hooks/queries/useMantenimiento';
import type {
  EstadoServicioSalud,
  IdServicioSalud,
  SaludServicio,
  EstadoCron,
  EntradaLog,
  NivelLog,
} from '../../services/mantenimientoService';

// =============================================================================
// HELPERS
// =============================================================================

/** Color de acento de un estado (semáforo). */
function colorEstado(estado: EstadoServicioSalud): string {
  if (estado === 'operativo') return 'var(--panel-ok)';
  if (estado === 'lento') return 'var(--panel-warn)';
  return 'var(--panel-danger)';
}
function fondoEstado(estado: EstadoServicioSalud): string {
  if (estado === 'operativo') return 'var(--panel-ok-weak)';
  if (estado === 'lento') return 'var(--panel-warn-weak)';
  return 'var(--panel-danger-weak)';
}
const ETIQUETA_ESTADO: Record<EstadoServicioSalud, string> = {
  operativo: 'Operativo',
  lento: 'Lento',
  caido: 'Caído',
};
const ICONO_SERVICIO: Record<IdServicioSalud, LucideIcon> = {
  bd: Database,
  redis: Server,
  r2: Cloud,
  stripe: CreditCard,
};

/** "hace 3 min", "hace 2 h", "hace 4 d". null → "—". */
function tiempoRelativo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'en el futuro';
  const seg = Math.floor(ms / 1000);
  if (seg < 60) return 'hace un momento';
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const dias = Math.floor(hrs / 24);
  return `hace ${dias} d`;
}

/** Hora local HH:MM:SS para los logs. */
function horaLocal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-MX', { hour12: false });
}

function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

type TabMantenimiento = 'salud' | 'crons' | 'logs' | 'r2';

const TABS_MANTENIMIENTO: { id: TabMantenimiento; etiqueta: string }[] = [
  { id: 'salud', etiqueta: 'Salud' },
  { id: 'crons', etiqueta: 'Tareas programadas' },
  { id: 'logs', etiqueta: 'Logs' },
  { id: 'r2', etiqueta: 'Recolector R2' },
];

export function SeccionMantenimiento() {
  const [tab, setTab] = useState<TabMantenimiento>('salud');

  return (
    <div className="h-full overflow-y-auto p-5 lg:p-6 2xl:p-7" data-testid="seccion-mantenimiento">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 lg:gap-6">
        {/* Pestañas: segmented control (mismo estilo que Ciudades). */}
        <TabsSegmento
          tabs={TABS_MANTENIMIENTO.map((t) => ({ id: t.id, label: t.etiqueta }))}
          valor={tab}
          onCambiar={setTab}
          testidPrefijo="mant-tab"
          className="max-w-full self-start overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        />

        {/* Vista activa (lazy: solo la pestaña abierta monta su hook) */}
        {tab === 'salud' && <BloqueSalud />}
        {tab === 'crons' && <BloqueCrons />}
        {tab === 'logs' && <BloqueLogs />}
        {tab === 'r2' && <BloqueR2 />}
      </div>
    </div>
  );
}

// =============================================================================
// BLOQUE: tarjeta de sección reutilizable
// =============================================================================

function Tarjeta({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  children,
  testid,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  children: ReactNode;
  testid: string;
}) {
  return (
    <section
      data-testid={testid}
      className="flex flex-col overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-tarjeta-panel"
    >
      <header className="flex items-center gap-2.5 border-b border-borde px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
          <Icono size={17} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{titulo}</span>
          {descripcion && <span className="truncate text-[12px] text-texto-3">{descripcion}</span>}
        </span>
        {accion}
      </header>
      {children}
    </section>
  );
}

/** Botón de "refrescar" del header de cada bloque. */
function BotonRefrescar({ onClick, cargando, testid }: { onClick: () => void; cargando: boolean; testid: string }) {
  return (
    <Tooltip text="Actualizar" className="shrink-0">
      <button
        type="button"
        data-testid={testid}
        onClick={onClick}
        disabled={cargando}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-ok bg-ok-suave text-ok transition hover:bg-ok hover:text-marca-contraste disabled:opacity-50"
      >
        <RefreshCw size={15} className={cargando ? 'animate-spin' : ''} />
      </button>
    </Tooltip>
  );
}

// =============================================================================
// 1 · SALUD DEL SISTEMA
// =============================================================================

function BloqueSalud() {
  const { data, isLoading, isError, isFetching, refetch } = useSalud();
  const purgar = usePurgarCache();

  return (
    <Tarjeta
      testid="bloque-salud"
      icono={Activity}
      titulo="Salud del sistema"
      descripcion={data?.generadoEn ? `Actualizado ${tiempoRelativo(data.generadoEn)}` : 'Estado de los servicios'}
      accion={<BotonRefrescar testid="salud-refrescar" onClick={() => refetch()} cargando={isFetching} />}
    >
      {isLoading ? (
        <EstadoSeccion variante="cargando" icono={Activity} titulo="Comprobando servicios…" />
      ) : isError || !data ? (
        <EstadoSeccion variante="error" icono={Activity} titulo="No se pudo comprobar la salud." descripcion="Revisa tu conexión e inténtalo de nuevo." />
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-4">
          {data.servicios.map((s) => (
            <SemaforoServicio key={s.id} servicio={s} />
          ))}
        </div>
      )}

      {/* Acción de sistema: purgar caché de configuración */}
      <div className="flex items-center justify-between gap-3 border-t border-borde px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="text-[13px] font-semibold text-texto">Caché de configuración</span>
          <span className="text-[12px] text-texto-3">Fuerza recargar los valores del sistema desde la base de datos.</span>
        </div>
        <button
          type="button"
          data-testid="cache-purgar"
          onClick={() => purgar.mutate()}
          disabled={purgar.isPending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave disabled:opacity-50"
        >
          <DatabaseZap size={14} className={purgar.isPending ? 'animate-pulse' : ''} />
          {purgar.isPending ? 'Purgando…' : 'Purgar caché'}
        </button>
      </div>
    </Tarjeta>
  );
}

function SemaforoServicio({ servicio }: { servicio: SaludServicio }) {
  const Icono = ICONO_SERVICIO[servicio.id];
  const color = colorEstado(servicio.estado);
  return (
    <div
      data-testid={`salud-servicio-${servicio.id}`}
      className="flex flex-col gap-2.5 rounded-[12px] border border-borde bg-superficie-2 p-3.5"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-borde bg-superficie text-texto-3">
          <Icono size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-semibold text-texto">{servicio.nombre}</span>
          <span className="text-[11.5px] text-texto-4">
            {servicio.latenciaMs != null ? `${servicio.latenciaMs} ms` : 'sin respuesta'}
          </span>
        </span>
        <span className="relative grid h-3 w-3 shrink-0 place-items-center">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: color }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
        </span>
      </div>
      <span
        className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ color, background: fondoEstado(servicio.estado) }}
      >
        {ETIQUETA_ESTADO[servicio.estado]}
      </span>
      {servicio.detalle && servicio.estado === 'caido' && (
        <p className="truncate text-[11px] text-texto-4" title={servicio.detalle}>
          {servicio.detalle}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// 2 · TAREAS PROGRAMADAS (CRONS)
// =============================================================================

function BloqueCrons() {
  const { data, isLoading, isError, isFetching, refetch } = useCrons();
  const ejecutar = useEjecutarCron();
  const [cronAConfirmar, setCronAConfirmar] = useState<EstadoCron | null>(null);
  const preview = usePreviewCron(cronAConfirmar?.id ?? null);

  const confirmar = () => {
    if (!cronAConfirmar) return;
    ejecutar.mutate(cronAConfirmar.id, { onSuccess: () => setCronAConfirmar(null) });
  };

  return (
    <Tarjeta
      testid="bloque-crons"
      icono={Clock}
      titulo="Tareas programadas"
      descripcion="Su última corrida se reinicia en cada despliegue"
      accion={<BotonRefrescar testid="crons-refrescar" onClick={() => refetch()} cargando={isFetching} />}
    >
      {isLoading ? (
        <EstadoSeccion variante="cargando" icono={Clock} titulo="Cargando tareas…" />
      ) : isError || !data ? (
        <EstadoSeccion variante="error" icono={Clock} titulo="No se pudieron cargar las tareas." />
      ) : (
        <ul className="divide-y divide-borde">
          {data.map((c) => (
            <FilaCron
              key={c.id}
              cron={c}
              onEjecutar={() => setCronAConfirmar(c)}
              ejecutando={ejecutar.isPending && cronAConfirmar?.id === c.id}
            />
          ))}
        </ul>
      )}

      <DialogoConfirmar
        abierto={!!cronAConfirmar}
        onCerrar={() => setCronAConfirmar(null)}
        titulo="Ejecutar tarea ahora"
        iconoTitulo={<Play size={18} />}
        mensaje={
          cronAConfirmar ? (
            <div className="flex flex-col gap-2.5">
              <span>
                Vas a ejecutar <strong>{cronAConfirmar.nombre}</strong> de inmediato, sin esperar su horario.
              </span>
              <div className="rounded-[10px] border border-borde bg-superficie-2 px-3 py-2.5">
                {preview.isLoading ? (
                  <span className="text-[12.5px] text-texto-3">Calculando qué procesaría…</span>
                ) : preview.isError ? (
                  <span className="text-[12.5px] text-texto-3">
                    No se pudo calcular el preview; puedes ejecutar de todos modos.
                  </span>
                ) : (
                  <span className="flex items-start gap-2 text-[12.5px] text-texto-2">
                    <span
                      className="mt-0.5 shrink-0"
                      style={{ color: (preview.data?.candidatos ?? 0) > 0 ? 'var(--panel-ok)' : 'var(--panel-text-4)' }}
                    >
                      {(preview.data?.candidatos ?? 0) > 0 ? <CheckCircle2 size={15} /> : <CircleDashed size={15} />}
                    </span>
                    {preview.data?.descripcion}
                  </span>
                )}
              </div>
            </div>
          ) : null
        }
        textoConfirmar="Ejecutar ahora"
        cargando={ejecutar.isPending}
        onConfirmar={confirmar}
        discriminador="confirmar-cron"
      />
    </Tarjeta>
  );
}

function FilaCron({
  cron,
  onEjecutar,
  ejecutando,
}: {
  cron: EstadoCron;
  onEjecutar: () => void;
  ejecutando: boolean;
}) {
  const nuncaCorrio = cron.ok === null;
  const Icono = nuncaCorrio ? CircleDashed : cron.ok ? CheckCircle2 : XCircle;
  const color = nuncaCorrio ? 'var(--panel-text-4)' : cron.ok ? 'var(--panel-ok)' : 'var(--panel-danger)';
  return (
    <li data-testid={`cron-${cron.id}`} className="flex items-center gap-3 px-4 py-2.5">
      <span className="shrink-0" style={{ color }}>
        <Icono size={17} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium text-texto">{cron.nombre}</span>
        <span className="truncate text-[12px] text-texto-3">
          {cron.cadencia}
          {cron.resultado ? ` · ${cron.resultado}` : ''}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-[12.5px] font-medium text-texto-2">
          {nuncaCorrio ? 'Aún no ha corrido' : tiempoRelativo(cron.ultimaEjecucion)}
        </span>
        {cron.duracionMs != null && (
          <span className="font-mono text-[11px] text-texto-4">{cron.duracionMs} ms</span>
        )}
      </span>
      <Tooltip text="Ejecutar ahora" className="shrink-0">
        <button
          type="button"
          data-testid={`cron-ejecutar-${cron.id}`}
          onClick={onEjecutar}
          disabled={ejecutando}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-ok bg-ok-suave text-ok transition hover:bg-ok hover:text-marca-contraste disabled:opacity-50"
        >
          <Play size={14} className={ejecutando ? 'animate-pulse' : ''} />
        </button>
      </Tooltip>
    </li>
  );
}

// =============================================================================
// 3 · LOGS RECIENTES
// =============================================================================

const NIVELES: Array<{ valor: NivelLog | 'todos'; etiqueta: string }> = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'info', etiqueta: 'Info' },
  { valor: 'warn', etiqueta: 'Avisos' },
  { valor: 'error', etiqueta: 'Errores' },
];

function colorNivel(nivel: NivelLog): string {
  if (nivel === 'error') return 'var(--panel-danger)';
  if (nivel === 'warn') return 'var(--panel-warn)';
  return 'var(--panel-text-4)';
}

function BloqueLogs() {
  const [nivel, setNivel] = useState<NivelLog | 'todos'>('todos');
  const [autorefrescar, setAutorefrescar] = useState(true);
  const { data, isLoading, isError, isFetching, refetch } = useLogs({
    nivel: nivel === 'todos' ? undefined : nivel,
    autorefrescar,
  });
  const vaciar = useVaciarLogs();

  const exportar = () => {
    if (!data || data.length === 0) return;
    const texto = data.map((l) => `${l.ts}\t${l.nivel.toUpperCase()}\t${l.mensaje}`).join('\n');
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-be-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Tarjeta
      testid="bloque-logs"
      icono={Terminal}
      titulo="Logs del BE"
      descripcion="Capturados en memoria · se pierden al reiniciar el servidor"
      accion={
        <div className="flex shrink-0 items-center gap-1.5">
          <Tooltip text={autorefrescar ? 'Pausar auto-actualización' : 'Reanudar auto-actualización'}>
            <button
              type="button"
              data-testid="logs-autorefresh"
              onClick={() => setAutorefrescar((v) => !v)}
              className={`grid h-8 w-8 place-items-center rounded-[9px] border transition ${
                autorefrescar
                  ? 'border-marca bg-marca-suave text-marca'
                  : 'border-borde bg-superficie text-texto-3 hover:bg-marca-suave'
              }`}
            >
              {autorefrescar ? <Pause size={15} /> : <Play size={15} />}
            </button>
          </Tooltip>
          <Tooltip text="Exportar a archivo">
            <button
              type="button"
              data-testid="logs-exportar"
              onClick={exportar}
              disabled={!data || data.length === 0}
              className="grid h-8 w-8 place-items-center rounded-[9px] border border-borde bg-superficie text-texto-3 transition hover:bg-marca-suave hover:text-marca disabled:opacity-50"
            >
              <Download size={15} />
            </button>
          </Tooltip>
          <Tooltip text="Vaciar logs">
            <button
              type="button"
              data-testid="logs-vaciar"
              onClick={() => vaciar.mutate()}
              disabled={vaciar.isPending || !data || data.length === 0}
              className="grid h-8 w-8 place-items-center rounded-[9px] border border-borde bg-superficie text-texto-3 transition hover:bg-peligro-suave hover:text-peligro disabled:opacity-50"
            >
              <Eraser size={15} />
            </button>
          </Tooltip>
          <BotonRefrescar testid="logs-refrescar" onClick={() => refetch()} cargando={isFetching} />
        </div>
      }
    >
      {/* Filtros de nivel */}
      <div className="flex items-center gap-1.5 border-b border-borde px-4 py-2.5">
        {NIVELES.map((n) => (
          <button
            key={n.valor}
            type="button"
            data-testid={`logs-nivel-${n.valor}`}
            onClick={() => setNivel(n.valor)}
            className={`rounded-[8px] px-2.5 py-1 text-[12px] font-semibold transition ${
              nivel === n.valor ? 'bg-marca-suave text-marca' : 'text-texto-3 hover:bg-superficie-2'
            }`}
          >
            {n.etiqueta}
          </button>
        ))}
      </div>

      {/* Altura fija (500px) para que la consola no salte al cambiar de filtro. */}
      <div className="h-[500px]">
        {isLoading ? (
          <EstadoSeccion variante="cargando" icono={Terminal} titulo="Cargando logs…" />
        ) : isError ? (
          <EstadoSeccion variante="error" icono={Terminal} titulo="No se pudieron cargar los logs." />
        ) : !data || data.length === 0 ? (
          <EstadoSeccion variante="vacio" icono={Terminal} titulo="Sin logs todavía" descripcion="Aún no se ha capturado actividad en esta instancia." />
        ) : (
          <div className="h-full overflow-y-auto bg-superficie-2 p-2 font-mono">
            {data.map((l, i) => (
              <LineaLog key={`${l.ts}-${i}`} log={l} />
            ))}
          </div>
        )}
      </div>
    </Tarjeta>
  );
}

function LineaLog({ log }: { log: EntradaLog }) {
  return (
    <div
      data-testid="log-linea"
      className="flex items-start gap-2.5 rounded-[7px] px-2 py-1 hover:bg-superficie"
    >
      <span className="shrink-0 text-[11px] leading-5 text-texto-4">{horaLocal(log.ts)}</span>
      <span
        className="shrink-0 text-[10px] font-semibold uppercase leading-5"
        style={{ color: colorNivel(log.nivel) }}
      >
        {log.nivel}
      </span>
      <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[11.5px] leading-5 text-texto-2">
        {log.mensaje}
      </span>
    </div>
  );
}

// =============================================================================
// 4 · RECOLECTOR DE BASURA R2
// =============================================================================

function BloqueR2() {
  const [analizar, setAnalizar] = useState(false);
  const reporte = useReconcile(analizar);
  const log = useReconcileLog();
  const limpieza = useEjecutarLimpiezaR2();
  const [confirmar, setConfirmar] = useState(false);

  const huerfanas = reporte.data?.resumen.huerfanas ?? 0;
  const puedeEjecutar = reporte.data?.puedeEjecutar ?? false;
  // Rotas agrupadas por "tabla.columna" (de mayor a menor) — revela de dónde salen.
  const rotasPorUbicacion = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of reporte.data?.rotas ?? []) m[r.ubicacion] = (m[r.ubicacion] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [reporte.data]);

  return (
    <Tarjeta
      testid="bloque-r2"
      icono={Trash2}
      titulo="Recolector de basura R2"
      descripcion="Detecta archivos huérfanos · la limpieza se ejecuta desde local"
      accion={
        <button
          type="button"
          data-testid="r2-analizar"
          onClick={() => {
            setAnalizar(true);
            reporte.refetch();
          }}
          disabled={reporte.isFetching}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] border border-ok bg-ok-suave text-ok transition hover:bg-ok hover:text-marca-contraste disabled:opacity-50 lg:inline-flex lg:h-auto lg:w-auto lg:items-center lg:gap-1.5 lg:px-3 lg:py-1.5 lg:text-[12.5px] lg:font-semibold"
        >
          <RefreshCw size={15} className={reporte.isFetching ? 'animate-spin' : ''} />
          <span className="hidden lg:inline">{reporte.isFetching ? 'Analizando…' : 'Analizar ahora'}</span>
        </button>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        {/* Resumen del reporte (tras analizar) */}
        {analizar && (
          <div data-testid="r2-reporte">
            {reporte.isLoading ? (
              <p className="py-6 text-center text-[13px] text-texto-3">Escaneando R2 y cruzando contra la base de datos…</p>
            ) : reporte.isError ? (
              <p className="py-6 text-center text-[13px] text-peligro">No se pudo completar el escaneo.</p>
            ) : reporte.data ? (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiR2 etiqueta="URLs en BD" valor={reporte.data.resumen.urlsEnBD} />
                <KpiR2 etiqueta="Objetos en R2" valor={reporte.data.resumen.objetosEnR2} />
                <KpiR2 etiqueta="Huérfanas" valor={reporte.data.resumen.huerfanas} acento={reporte.data.resumen.huerfanas > 0 ? 'warn' : 'ok'} />
                <KpiR2 etiqueta="Rotas" valor={reporte.data.resumen.rotas} acento={reporte.data.resumen.rotas > 0 ? 'danger' : 'ok'} />
              </div>
            ) : null}

            {/* Desglose por carpeta */}
            {reporte.data && Object.keys(reporte.data.porCarpeta).length > 0 && (
              <div className="mt-3 overflow-hidden rounded-[10px] border border-borde">
                {/* Header + filas comparten el MISMO contenedor scrolleable (el scrollbar afecta a ambos
                    por igual) y las MISMAS columnas de ancho fijo (alineación exacta). */}
                <div className="max-h-[200px] overflow-y-auto">
                  <div className="sticky top-0 grid grid-cols-[1fr_3.75rem_3.75rem_3.75rem] gap-x-3 border-b border-borde bg-superficie-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4">
                    <span>Carpeta</span>
                    <span className="text-right">En R2</span>
                    <span className="text-right">En BD</span>
                    <span className="text-right">Huérf.</span>
                  </div>
                  <ul className="divide-y divide-borde">
                    {Object.entries(reporte.data.porCarpeta).map(([carpeta, c]) => (
                      <li key={carpeta} className="grid grid-cols-[1fr_3.75rem_3.75rem_3.75rem] gap-x-3 px-3 py-1.5 text-[12px]">
                        <span className="truncate font-mono text-texto-2" title={carpeta}>{carpeta}</span>
                        <span className="text-right tabular-nums text-texto-3">{c.enR2}</span>
                        <span className="text-right tabular-nums text-texto-3">{c.enBD}</span>
                        <span
                          className="text-right font-semibold tabular-nums"
                          style={{ color: c.huerfanas > 0 ? 'var(--panel-warn)' : 'var(--panel-text-3)' }}
                        >
                          {c.huerfanas}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Lista de huérfanas */}
            {reporte.data && reporte.data.huerfanas.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-[10px] border border-borde">
                <div className="border-b border-borde bg-superficie-2 px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-texto-4">
                  Archivos huérfanos
                </div>
                <ul className="max-h-[200px] divide-y divide-borde overflow-y-auto">
                  {reporte.data.huerfanas.map((h) => (
                    <li key={h.key} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-texto-2" title={h.key}>{h.key}</span>
                      <span className="shrink-0 text-[11px] text-texto-4">{formatearBytes(h.size)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* URLs rotas (informativo — el recolector NO las arregla) */}
            {reporte.data && reporte.data.rotas.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-[10px] border border-borde">
                <div className="border-b border-borde bg-superficie-2 px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-texto-4">
                  URLs rotas · {reporte.data.rotas.length} — apuntan a archivos que ya no existen
                </div>
                {/* Agrupado por tabla.columna: de dónde salen */}
                <div className="flex flex-wrap gap-1.5 border-b border-borde px-3 py-2.5">
                  {rotasPorUbicacion.map(([ubic, n]) => (
                    <span
                      key={ubic}
                      className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2 py-0.5 text-[11.5px]"
                    >
                      <span className="font-mono text-texto-2">{ubic}</span>
                      <span className="font-semibold text-peligro">{n}</span>
                    </span>
                  ))}
                </div>
                {/* Lista detallada */}
                <ul className="max-h-[200px] divide-y divide-borde overflow-y-auto">
                  {reporte.data.rotas.map((r, i) => (
                    <li key={`${r.url}-${i}`} className="flex items-center gap-2 px-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-texto-2" title={r.url}>
                        {r.url}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-texto-4">{r.ubicacion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Acción: ejecutar limpieza (solo si el escaneo halló huérfanos) */}
            {reporte.data &&
              huerfanas > 0 &&
              (puedeEjecutar ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3">
                  <span className="text-[12.5px] text-texto-2">
                    Se eliminarán <strong>{huerfanas}</strong>{' '}
                    {huerfanas === 1 ? 'archivo huérfano' : 'archivos huérfanos'}.
                  </span>
                  <button
                    type="button"
                    data-testid="r2-ejecutar-limpieza"
                    onClick={() => setConfirmar(true)}
                    disabled={limpieza.isPending}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] bg-peligro px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    Ejecutar limpieza
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--panel-warn)' }} />
                  <span className="text-[12px] leading-relaxed text-texto-3">
                    La limpieza no está disponible en este momento.
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Histórico de ejecuciones */}
        <div data-testid="r2-historico">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-[12.5px] font-semibold uppercase tracking-wide text-texto-3">Histórico de ejecuciones</h4>
          </div>
          {log.isLoading ? (
            <p className="py-4 text-center text-[12.5px] text-texto-3">Cargando histórico…</p>
          ) : log.isError ? (
            <p className="py-4 text-center text-[12.5px] text-texto-4">El histórico no está disponible (tabla aún sin crear).</p>
          ) : !log.data || log.data.length === 0 ? (
            <p className="py-4 text-center text-[12.5px] text-texto-4">Sin ejecuciones registradas.</p>
          ) : (
            <ul className="overflow-hidden rounded-[10px] border border-borde divide-y divide-borde">
              {log.data.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                    style={
                      e.dryRun
                        ? { color: 'var(--panel-text-3)', background: 'var(--panel-surface-2)' }
                        : { color: 'var(--panel-danger)', background: 'var(--panel-danger-weak)' }
                    }
                  >
                    {e.dryRun ? 'Reporte' : 'Limpieza'}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12.5px] text-texto-2">
                      {e.huerfanasDetectadas} detectadas · {e.eliminadas} eliminadas
                      {e.fallidas > 0 ? ` · ${e.fallidas} fallidas` : ''}
                    </span>
                    <span className="text-[11px] text-texto-4">{tiempoRelativo(e.ejecutadoAt)} · {e.ejecutadoPor}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DialogoConfirmar
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo="Ejecutar limpieza de R2"
        iconoTitulo={<Trash2 size={18} />}
        variante="danger"
        mensaje={
          <>
            Se eliminarán <strong>{huerfanas}</strong>{' '}
            {huerfanas === 1 ? 'archivo huérfano' : 'archivos huérfanos'} de Cloudflare R2. Esta acción no se puede
            deshacer.
          </>
        }
        textoConfirmar="Eliminar huérfanos"
        cargando={limpieza.isPending}
        onConfirmar={() => limpieza.mutate(undefined, { onSuccess: () => setConfirmar(false) })}
        discriminador="confirmar-limpieza-r2"
      />
    </Tarjeta>
  );
}

function KpiR2({ etiqueta, valor, acento }: { etiqueta: string; valor: number; acento?: 'ok' | 'warn' | 'danger' }) {
  const color =
    acento === 'warn' ? 'var(--panel-warn)' : acento === 'danger' ? 'var(--panel-danger)' : acento === 'ok' ? 'var(--panel-ok)' : 'var(--panel-text)';
  return (
    <div className="flex flex-col gap-1 rounded-[11px] border border-borde bg-superficie-2 p-3">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-texto-4">{etiqueta}</span>
      <span className="text-[22px] font-bold leading-none" style={{ color }}>{valor}</span>
    </div>
  );
}

export default SeccionMantenimiento;
