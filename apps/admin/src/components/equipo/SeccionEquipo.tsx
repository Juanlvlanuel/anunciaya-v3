/**
 * SeccionEquipo.tsx
 * ==================
 * Sección "Equipo y accesos" del Panel (VER, solo lectura) — las cuentas internas del equipo.
 * Calcada de SeccionUsuarios.
 *   - Escritorio (lg:+): buscador + chips por rol con conteos (solo super) · "Ordenar" + tabla + paginación.
 *   - Móvil: buscador, chips por rol (carrusel, solo super) y tarjetas.
 *
 * La acota el backend: superadmin ve a todo el equipo; el gerente solo a SUS vendedores (de su
 * región). El vendedor recibe 403 y no la ve en el menú. El alta de vendedor y las acciones son Fase 2.
 *
 * Ubicación: apps/admin/src/components/equipo/SeccionEquipo.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronLeft, ChevronRight, ShieldCheck, ArrowUpDown, UserPlus, ChevronDown } from 'lucide-react';
import { useEsEscritorio } from '../../hooks/useEsEscritorio';
import { useScrollPanel } from '../../stores/useScrollPanel';
import { useContadorPanel } from '../../stores/useContadorPanel';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { useEquipoLista, usePrefetchMiembro } from '../../hooks/queries/useEquipoAdmin';
import type { OrdenEquipo, MiembroEquipoFila, ConteosRol } from '../../services/equipoService';
import { BadgeAcceso, rolLabel } from './estadoAcceso';
import { AvatarUsuario } from '../usuarios/avataresUsuario';
import { MenuFiltro } from '../negocios/MenuFiltro';
import { FichaMiembro } from './FichaMiembro';
import { DialogoAltaVendedor } from './DialogoAltaVendedor';
import { DialogoAltaGerente } from './DialogoAltaGerente';
import { EstadoSeccion } from '../ui/EstadoSeccion';

const POR_PAGINA = 20;

const TABS_ROL = [
  { id: '', label: 'Todos' },
  { id: 'superadmin', label: 'SuperAdmin' },
  { id: 'gerente', label: 'Gerentes' },
  { id: 'vendedor', label: 'Vendedores' },
] as const;

const OPCIONES_ORDEN: { valor: OrdenEquipo; etiqueta: string }[] = [
  { valor: 'nombre_az', etiqueta: 'Nombre (A–Z)' },
  { valor: 'nombre_za', etiqueta: 'Nombre (Z–A)' },
  { valor: 'rol', etiqueta: 'Rol' },
  { valor: 'ultimo_acceso', etiqueta: 'Último acceso' },
  { valor: 'registro_recientes', etiqueta: 'Registro (recientes)' },
];

const CONTEOS_CERO: ConteosRol = { total: 0, porRol: [] };
const FMT_FECHA = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FMT_FECHA.format(d).replace('.', '').replace(/ ([a-z])/i, (_m, l: string) => ` ${l.toUpperCase()}`);
}

/** Alcance legible de un miembro (qué territorio cubre). */
function alcanceDe(f: MiembroEquipoFila): { principal: string; secundario: string | null } {
  if (f.rolEquipo === 'superadmin') return { principal: 'Toda la plataforma', secundario: null };
  if (f.rolEquipo === 'gerente') return { principal: f.regionNombre ?? '—', secundario: 'Región' };
  // vendedor: región deducida + ciudades que cubre
  return { principal: f.regionNombre ?? '—', secundario: f.ciudades };
}

export function SeccionEquipo() {
  const esEscritorio = useEsEscritorio();

  const [busqueda, setBusqueda] = useState('');
  const [busquedaDeb, setBusquedaDeb] = useState('');
  const [rol, setRol] = useState('');
  const [orden, setOrden] = useState<OrdenEquipo>('rol');
  const [pagina, setPagina] = useState(1);
  const [seleccionado, setSeleccionado] = useState<MiembroEquipoFila | null>(null);
  const [menuAlta, setMenuAlta] = useState(false);
  const [altaTipo, setAltaTipo] = useState<null | 'vendedor' | 'gerente'>(null);
  const prefetchMiembro = usePrefetchMiembro();

  // Solo el superadmin filtra por rol (el gerente solo ve vendedores → los chips no aportan).
  const rolPanel = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const esSuper = rolPanel === 'superadmin';
  const mostrarChipsRol = esSuper;
  // Super y gerente pueden dar de alta (el vendedor no entra al módulo); solo el super crea gerentes.
  const puedeAlta = esSuper || rolPanel === 'gerente';

  // Registra el contenedor scrolleable (vista móvil) para el auto-ocultado de la barra inferior.
  const listaRef = useRef<HTMLDivElement>(null);
  const setScrollEl = useScrollPanel((s) => s.setScrollEl);
  useEffect(() => {
    setScrollEl(esEscritorio ? null : listaRef.current);
    return () => setScrollEl(null);
  }, [esEscritorio, setScrollEl]);

  useEffect(() => {
    const t = setTimeout(() => setBusquedaDeb(busqueda.trim()), 350);
    return () => clearTimeout(t);
  }, [busqueda]);

  useEffect(() => {
    setPagina(1);
  }, [busquedaDeb, rol, orden]);

  const filtros = useMemo(
    () => ({
      busqueda: busquedaDeb || undefined,
      rol: rol || undefined,
      orden,
      pagina,
      porPagina: POR_PAGINA,
    }),
    [busquedaDeb, rol, orden, pagina],
  );

  const { data, isLoading, isError, isFetching } = useEquipoLista(filtros);

  // Publica el total YA FILTRADO para el badge del menú; al salir, se limpia.
  const setContadorEquipo = useContadorPanel((s) => s.setEquipo);
  useEffect(() => {
    if (data) setContadorEquipo(data.total);
  }, [data, setContadorEquipo]);
  useEffect(() => () => setContadorEquipo(null), [setContadorEquipo]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const conteos = data?.conteos ?? CONTEOS_CERO;
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1;
  const hasta = Math.min(pagina * POR_PAGINA, total);
  const hayFiltro = !!(busquedaDeb || rol);

  const hayFiltrosActivos = !!(busqueda.trim() || rol) || orden !== 'rol';
  const limpiarFiltros = () => {
    setBusqueda('');
    setRol('');
    setOrden('rol');
  };

  const conteoDe = (id: string): number =>
    id === '' ? conteos.total : (conteos.porRol.find((c) => c.rol === id)?.total ?? 0);

  const etiquetaOrden = OPCIONES_ORDEN.find((o) => o.valor === orden)?.etiqueta ?? 'Rol';

  const buscador = (
    <div className="relative w-full">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3" />
      <input
        data-testid="equipo-busqueda"
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre o correo…"
        className="w-full rounded-full border border-borde bg-superficie-2 py-2.5 pl-10 pr-9 text-[13.5px] font-medium text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
      />
      {busqueda && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => setBusqueda('')}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave hover:text-marca"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );

  const chipsRol = mostrarChipsRol ? (
    <div className="flex flex-wrap items-center gap-2">
      {TABS_ROL.map((t) => {
        const activo = rol === t.id;
        return (
          <button
            key={t.id || 'todos'}
            type="button"
            data-testid={`equipo-filtro-rol-${t.id || 'todos'}`}
            onClick={() => setRol(t.id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition hover:bg-marca-suave ${
              activo ? 'border-marca bg-marca-suave text-marca' : 'border-borde bg-superficie text-texto-2'
            }`}
          >
            {t.label}
            <span
              className="txt-badge min-w-[18px] rounded-full px-1.5 text-center text-[11px] font-semibold"
              style={
                activo
                  ? { background: 'color-mix(in srgb, var(--panel-brand) 22%, transparent)', color: 'var(--panel-brand)' }
                  : { background: 'color-mix(in srgb, var(--panel-text) 8%, transparent)', color: 'var(--panel-text-3)' }
              }
            >
              {conteoDe(t.id)}
            </span>
          </button>
        );
      })}
    </div>
  ) : null;

  const ordenar = (
    <MenuFiltro
      testid="equipo-orden"
      icono={<ArrowUpDown size={15} />}
      etiquetaBoton={<>Ordenar: {etiquetaOrden}</>}
      opciones={OPCIONES_ORDEN.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
      valor={orden}
      onCambiar={(v) => setOrden(v as OrdenEquipo)}
      anchoMenu={210}
      tam="chip"
    />
  );

  const botonAlta = !puedeAlta ? null : esSuper ? (
    <div className="relative shrink-0">
      <button
        type="button"
        data-testid="equipo-alta"
        onClick={() => setMenuAlta((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full bg-marca px-4 py-2.5 text-[13px] font-semibold text-marca-contraste transition hover:opacity-90"
      >
        <UserPlus size={16} />
        <span className="hidden lg:inline">Dar de alta</span>
        <ChevronDown size={14} className={`transition-transform ${menuAlta ? 'rotate-180' : ''}`} />
      </button>
      {menuAlta && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuAlta(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-[12px] border border-borde bg-superficie p-1 shadow-pop-panel">
            <button
              type="button"
              data-testid="equipo-alta-vendedor"
              onClick={() => { setMenuAlta(false); setAltaTipo('vendedor'); }}
              className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-texto transition hover:bg-marca-suave"
            >
              Vendedor
            </button>
            <button
              type="button"
              data-testid="equipo-alta-gerente"
              onClick={() => { setMenuAlta(false); setAltaTipo('gerente'); }}
              className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-texto transition hover:bg-marca-suave"
            >
              Gerente
            </button>
          </div>
        </>
      )}
    </div>
  ) : (
    <button
      type="button"
      data-testid="equipo-alta"
      onClick={() => setAltaTipo('vendedor')}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-marca px-4 py-2.5 text-[13px] font-semibold text-marca-contraste transition hover:opacity-90"
    >
      <UserPlus size={16} />
      <span className="hidden lg:inline">Dar de alta vendedor</span>
    </button>
  );

  const ficha = seleccionado ? (
    <FichaMiembro previo={seleccionado} onCerrar={() => setSeleccionado(null)} />
  ) : null;

  const dialogoAlta =
    altaTipo === 'vendedor' ? (
      <DialogoAltaVendedor abierto onCerrar={() => setAltaTipo(null)} />
    ) : altaTipo === 'gerente' ? (
      <DialogoAltaGerente abierto onCerrar={() => setAltaTipo(null)} />
    ) : null;

  // ── Vista MÓVIL ─────────────────────────────────────────────────────────────
  if (!esEscritorio) {
    return (
      <div className="flex h-full min-h-0 flex-col px-5 pt-4 pb-1.5">
        <div className="mb-2.5 flex shrink-0 items-center gap-2">
          <div className="flex-1">{buscador}</div>
          {botonAlta}
        </div>

        {mostrarChipsRol && (
          <div className="mb-2 flex shrink-0 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
            {TABS_ROL.map((t) => {
              const activo = rol === t.id;
              return (
                <button
                  key={t.id || 'todos'}
                  type="button"
                  data-testid={`equipo-filtro-rol-${t.id || 'todos'}`}
                  onClick={() => setRol(t.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
                    activo ? 'border-marca bg-marca-suave text-marca' : 'border-borde bg-superficie text-texto-2'
                  }`}
                >
                  {t.label} <span className="text-[11px] opacity-70">{conteoDe(t.id)}</span>
                </button>
              );
            })}
          </div>
        )}

        <div ref={listaRef} className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoSeccion variante="cargando" icono={ShieldCheck} titulo="Cargando equipo…" />
          ) : isError ? (
            <EstadoSeccion
              variante="error"
              icono={ShieldCheck}
              titulo="No se pudo cargar el equipo."
              descripcion="Revisa tu conexión e inténtalo de nuevo."
            />
          ) : items.length === 0 ? (
            hayFiltrosActivos ? (
              <EstadoSeccion
                icono={ShieldCheck}
                titulo="Sin resultados"
                descripcion="Ningún miembro coincide con tu búsqueda o filtros."
                accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }}
              />
            ) : (
              <EstadoSeccion icono={ShieldCheck} titulo="Aún no hay miembros del equipo" />
            )
          ) : (
            <div className="flex flex-col gap-2.5">
              {items.map((m) => (
                <CardMiembro key={m.id} m={m} onAbrir={() => setSeleccionado(m)} onPrefetch={() => prefetchMiembro(m.id)} />
              ))}
            </div>
          )}
        </div>

        {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
        {ficha}
        {dialogoAlta}
      </div>
    );
  }

  // ── Vista ESCRITORIO ────────────────────────────────────────────────────────
  const cols = 'minmax(220px,2.2fr) 1.1fr minmax(160px,1.6fr) 1fr 1fr 28px';

  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-5">
      {/* Buscador + alta */}
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <div className="w-full max-w-[380px]">{buscador}</div>
        {botonAlta}
      </div>

      {/* Subhead: chips por rol (izq) + total y ordenar (der) */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        {chipsRol ?? <span />}
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[13px] text-texto-3" data-testid="equipo-total">
            <b className="font-semibold text-texto">{total}</b> {total === 1 ? 'miembro' : 'miembros'}
            {hayFiltro ? ' · filtrado' : ''}
            {isFetching && !isLoading ? ' · actualizando…' : ''}
          </span>
          {ordenar}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-borde">
        <div
          className="grid shrink-0 items-center gap-3.5 border-b border-borde bg-superficie px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-texto-4"
          style={{ gridTemplateColumns: cols }}
        >
          <span>Miembro</span>
          <span>Rol</span>
          <span>Alcance</span>
          <span>Acceso</span>
          <span>Último acceso</span>
          <span />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <EstadoSeccion variante="cargando" icono={ShieldCheck} titulo="Cargando equipo…" />
          ) : isError ? (
            <EstadoSeccion
              variante="error"
              icono={ShieldCheck}
              titulo="No se pudo cargar el equipo."
              descripcion="Revisa tu conexión e inténtalo de nuevo."
            />
          ) : items.length === 0 ? (
            hayFiltrosActivos ? (
              <EstadoSeccion
                icono={ShieldCheck}
                titulo="Sin resultados"
                descripcion="Ningún miembro coincide con tu búsqueda o filtros."
                accion={{ etiqueta: 'Limpiar filtros', onClick: limpiarFiltros }}
              />
            ) : (
              <EstadoSeccion icono={ShieldCheck} titulo="Aún no hay miembros del equipo" />
            )
          ) : (
            items.map((m) => (
              <FilaMiembro key={m.id} m={m} cols={cols} onAbrir={() => setSeleccionado(m)} onPrefetch={() => prefetchMiembro(m.id)} />
            ))
          )}
        </div>
      </div>

      {total > 0 && <Paginacion desde={desde} hasta={hasta} total={total} pagina={pagina} totalPaginas={totalPaginas} setPagina={setPagina} />}
      {ficha}
      {dialogoAlta}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

function FilaMiembro({
  m,
  cols,
  onAbrir,
  onPrefetch,
}: {
  m: MiembroEquipoFila;
  cols: string;
  onAbrir: () => void;
  onPrefetch: () => void;
}) {
  const alcance = alcanceDe(m);
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`equipo-fila-${m.id}`}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAbrir();
        }
      }}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      className="grid w-full cursor-pointer items-center gap-3.5 border-b border-borde px-3 py-3 text-left transition last:border-b-0 hover:bg-marca-suave focus:bg-marca-suave focus:outline-none"
      style={{ gridTemplateColumns: cols }}
    >
      <span className="flex min-w-0 items-center gap-3">
        <AvatarUsuario nombre={m.nombre || m.correo} avatarUrl={null} tam={38} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[14px] font-semibold text-texto">{m.nombre || '(Sin nombre)'}</span>
          <span className="truncate text-[12px] text-texto-3">{m.correo}</span>
        </span>
      </span>
      <span className="min-w-0 truncate">
        <span className="text-[13px] font-medium text-marca">{rolLabel(m.rolEquipo)}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] text-texto-2">{alcance.principal}</span>
        {alcance.secundario && <span className="truncate text-[11.5px] text-texto-4">{alcance.secundario}</span>}
      </span>
      <span><BadgeAcceso fila={m} small /></span>
      <span className={`text-[13px] ${m.ultimoAccesoPanel ? 'text-texto-2' : 'text-texto-4'}`}>{fechaCorta(m.ultimoAccesoPanel)}</span>
      <span className="flex justify-end text-texto-4"><ChevronRight size={17} /></span>
    </div>
  );
}

function CardMiembro({ m, onAbrir, onPrefetch }: { m: MiembroEquipoFila; onAbrir: () => void; onPrefetch: () => void }) {
  const alcance = alcanceDe(m);
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`equipo-card-${m.id}`}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAbrir();
        }
      }}
      onTouchStart={onPrefetch}
      onMouseEnter={onPrefetch}
      className="flex items-center gap-3 rounded-[14px] border border-borde bg-superficie p-3 text-left transition active:bg-marca-suave"
    >
      <AvatarUsuario nombre={m.nombre || m.correo} avatarUrl={null} tam={42} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[14.5px] font-semibold text-texto">{m.nombre || '(Sin nombre)'}</span>
        <span className="truncate text-[12.5px] font-medium text-marca">{rolLabel(m.rolEquipo)}</span>
        <span className="truncate text-[12px] text-texto-3">{alcance.principal}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <BadgeAcceso fila={m} small />
        <ChevronRight size={16} className="text-texto-4" />
      </span>
    </div>
  );
}

function Paginacion({
  desde,
  hasta,
  total,
  pagina,
  totalPaginas,
  setPagina,
}: {
  desde: number;
  hasta: number;
  total: number;
  pagina: number;
  totalPaginas: number;
  setPagina: (fn: (p: number) => number) => void;
}) {
  return (
    <div className="mt-3 flex shrink-0 items-center justify-between text-[12.5px] text-texto-3 lg:pt-1">
      <span data-testid="equipo-rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          data-testid="equipo-anterior"
          onClick={() => setPagina((p) => Math.max(1, p - 1))}
          disabled={pagina <= 1}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="px-1.5 text-texto-3">{pagina} / {totalPaginas}</span>
        <button
          type="button"
          data-testid="equipo-siguiente"
          onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
          disabled={pagina >= totalPaginas}
          className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-4 py-2.5 font-semibold lg:px-2.5 lg:py-1.5 text-marca transition hover:bg-marca hover:text-marca-contraste disabled:cursor-not-allowed disabled:opacity-45"
        >
          Siguiente <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default SeccionEquipo;
