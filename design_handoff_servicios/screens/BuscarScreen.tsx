/**
 * Buscar — overlay de sugerencias + página de resultados.
 *
 * NOTA: el input del buscador NO vive en esta pantalla. Vive en el Navbar global
 * y cambia su placeholder a "Buscar servicios…" cuando la ruta es `/servicios*`.
 * Lo que diseñamos aquí es:
 *   1. <BuscadorOverlay>  → dropdown / fullscreen con sugerencias en vivo
 *   2. <ResultadosScreen> → página `/servicios/buscar?q=…` con grid + filtros
 */
import { useEffect, useMemo, useState } from 'react';
import { Icon, Chip, CardServicio, CardVacante } from '../components';
import type { FiltrosBusqueda, Publicacion, Persona } from '../types';

/* ============================ OVERLAY ============================ */

interface BuscadorOverlayProps {
  query: string;
  onQueryChange: (q: string) => void;
  recientes: string[];
  populares: string[];
  onClose: () => void;
  onSearch: (q: string) => void;
  onSuggestionClick: (kind: 'servicio' | 'empleo' | 'persona', id: string) => void;
  sugerencias?: {
    servicios: Array<{ id: string; label: string; sub: string }>;
    empleos: Array<{ id: string; label: string; sub: string }>;
    personas: Array<{ id: string; label: string; sub: string; iniciales: string }>;
  };
  variant?: 'mobile' | 'desktop';
}

export function BuscadorOverlay({
  query,
  onQueryChange,
  recientes,
  populares,
  onClose,
  onSearch,
  onSuggestionClick,
  sugerencias,
  variant = 'mobile',
}: BuscadorOverlayProps) {
  const isEmpty = query.trim().length === 0;

  if (variant === 'desktop') {
    return (
      <>
        {/* Backdrop */}
        <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/55 backdrop-blur-sm" />
        {/* Dropdown */}
        <div className="fixed z-50 top-[72px] left-1/2 -translate-x-1/2 w-[600px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[70vh] overflow-y-auto">
          {isEmpty ? <EmptySuggestions recientes={recientes} populares={populares} onPick={onSearch} /> : <SuggestionLists query={query} data={sugerencias} onClick={onSuggestionClick} />}
          <Footer onSearch={() => onSearch(query)} />
        </div>
      </>
    );
  }

  // Mobile fullscreen
  return (
    <div className="fixed inset-0 z-50 bg-white">
      <div className="bg-blue-600 px-3 pt-2.5 pb-3 flex items-center gap-2">
        <button onClick={onClose} className="text-white w-8 h-8 grid place-items-center">
          <Icon.ChevL size={18} />
        </button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-white">
          <Icon.Search size={14} className="text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar servicios…"
            className="flex-1 text-[13px] text-slate-900 font-medium outline-none placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => onQueryChange('')} className="text-slate-400">
              <Icon.X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-y-auto h-[calc(100vh-56px)]">
        {isEmpty ? <EmptySuggestions recientes={recientes} populares={populares} onPick={onSearch} /> : <SuggestionLists query={query} data={sugerencias} onClick={onSuggestionClick} />}
      </div>
    </div>
  );
}

function EmptySuggestions({ recientes, populares, onPick }: { recientes: string[]; populares: string[]; onPick: (q: string) => void }) {
  return (
    <>
      {recientes.length > 0 && (
        <Group title="Búsquedas recientes" icon={<Icon.History size={11} />}>
          <div className="px-4 flex flex-wrap gap-1.5">
            {recientes.map((t) => (
              <Chip key={t} removable onClick={() => onPick(t)}>
                {t}
              </Chip>
            ))}
          </div>
        </Group>
      )}
      <div className="border-t border-slate-100" />
      <Group title="Populares en Peñasco" icon={<Icon.Trending size={11} />}>
        <div className="px-4 flex flex-wrap gap-1.5">
          {populares.map((t) => (
            <Chip key={t} onClick={() => onPick(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </Group>
    </>
  );
}

function SuggestionLists({
  query,
  data,
  onClick,
}: {
  query: string;
  data: BuscadorOverlayProps['sugerencias'];
  onClick: BuscadorOverlayProps['onSuggestionClick'];
}) {
  if (!data) return null;
  return (
    <>
      {data.servicios.length > 0 && (
        <Group title={`Servicios — ${data.servicios.length} sugerencias`} icon={<Icon.Tool size={11} />}>
          {data.servicios.map((s) => (
            <Row key={s.id} icon={<Icon.Tool size={16} />} label={s.label} sub={s.sub} hl={query} kind="Servicio" onClick={() => onClick('servicio', s.id)} />
          ))}
        </Group>
      )}
      <div className="border-t border-slate-100" />
      {data.empleos.length > 0 && (
        <Group title={`Empleos — ${data.empleos.length} vacantes`} icon={<Icon.Briefcase size={11} />}>
          {data.empleos.map((s) => (
            <Row key={s.id} icon={<Icon.Briefcase size={16} />} label={s.label} sub={s.sub} hl={query} kind="Empleo" onClick={() => onClick('empleo', s.id)} />
          ))}
        </Group>
      )}
      <div className="border-t border-slate-100" />
      {data.personas.length > 0 && (
        <Group title={`Personas — ${data.personas.length} perfiles`} icon={<Icon.User size={11} />}>
          {data.personas.map((p) => (
            <Row
              key={p.id}
              icon={
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white text-[11px] font-extrabold">
                  {p.iniciales}
                </div>
              }
              label={p.label}
              sub={p.sub}
              hl={query}
              kind="Persona"
              onClick={() => onClick('persona', p.id)}
            />
          ))}
        </Group>
      )}
    </>
  );
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <div className="px-4 py-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  sub,
  hl,
  kind,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  hl?: string;
  kind?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 group"
    >
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0 group-hover:bg-sky-50 group-hover:text-sky-700 transition overflow-hidden">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-slate-900 truncate">
          <Highlight text={label} hl={hl} />
        </div>
        {sub && <div className="text-[11px] text-slate-500 truncate">{sub}</div>}
      </div>
      {kind && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kind}</span>}
    </button>
  );
}

function Highlight({ text, hl }: { text: string; hl?: string }) {
  if (!hl) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(hl.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-sky-100 text-sky-900 font-bold px-0.5 rounded">{text.slice(idx, idx + hl.length)}</mark>
      {text.slice(idx + hl.length)}
    </>
  );
}

function Footer({ onSearch }: { onSearch: () => void }) {
  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
      <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-3">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700">↵</kbd> abrir
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700">↑↓</kbd> navegar
        </span>
      </div>
      <button onClick={onSearch} className="text-[12px] font-bold text-sky-700 flex items-center gap-1">
        Ver todos los resultados <Icon.ArrowR size={12} />
      </button>
    </div>
  );
}

/* ============================ RESULTADOS ============================ */

interface ResultadosScreenProps {
  query: string;
  filtros: FiltrosBusqueda;
  onFiltrosChange: (f: FiltrosBusqueda) => void;
  resultados: Publicacion[];
  totalServicios: number;
  totalEmpleos: number;
  totalPersonas: number;
}

export function ResultadosScreen({
  query,
  filtros,
  onFiltrosChange,
  resultados,
  totalServicios,
  totalEmpleos,
  totalPersonas,
}: ResultadosScreenProps) {
  const total = totalServicios + totalEmpleos + totalPersonas;

  // Sync filtros → URL query params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    Object.entries(filtros).forEach(([k, v]) => {
      if (v == null || (Array.isArray(v) && v.length === 0)) url.searchParams.delete(k);
      else url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
    });
    window.history.replaceState(null, '', url);
  }, [query, filtros]);

  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="max-w-[1320px] mx-auto px-4 lg:px-8 py-5">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 mb-3">
          <span>Servicios</span>
          <Icon.ChevR size={10} />
          <span>Buscar</span>
          <Icon.ChevR size={10} />
          <span className="text-slate-900">"{query}"</span>
        </div>
        <div className="flex items-baseline justify-between">
          <h1 className="text-[22px] lg:text-[26px] font-extrabold tracking-tight text-slate-900">
            Resultados para "<span className="text-sky-700">{query}</span>"
          </h1>
          <div className="hidden lg:block text-[12px] font-semibold text-slate-500">
            {totalServicios} servicios · {totalEmpleos} empleos · {totalPersonas} personas
          </div>
        </div>

        <div className="grid lg:grid-cols-[260px_1fr] gap-6 mt-5">
          <aside className="hidden lg:block rounded-2xl bg-white border border-slate-200 p-4 self-start sticky top-4">
            <FiltersSidebar filtros={filtros} onChange={onFiltrosChange} />
          </aside>

          <main>
            {resultados.length === 0 ? (
              <ResultadosVacio query={query} />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {resultados.map((p) =>
                  p.tipo === 'vacante-empresa' ? (
                    <CardVacante
                      key={p.id}
                      logoInitials={(p.oferente as any)?.iniciales ?? '··'}
                      empresa={(p.oferente as any)?.nombre ?? ''}
                      titulo={p.titulo}
                      salario={formatPrecio(p.precio)}
                      zona={p.ubicacion.zonas.join(' · ')}
                    />
                  ) : (
                    <CardServicio
                      key={p.id}
                      avatarInitials={(p.oferente as Persona)?.iniciales ?? '··'}
                      oferenteNombre={(p.oferente as Persona)?.nombre ?? ''}
                      titulo={p.titulo}
                      precio={formatPrecio(p.precio)}
                      modalidad={capitalize(p.modalidad) as 'Presencial'}
                      distancia="—"
                    />
                  )
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function FiltersSidebar({ filtros, onChange }: { filtros: FiltrosBusqueda; onChange: (f: FiltrosBusqueda) => void }) {
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-extrabold tracking-tight text-slate-900">Filtros</div>
        <button onClick={() => onChange({ q: filtros.q })} className="text-[11px] font-bold text-sky-700">
          Limpiar
        </button>
      </div>
      <Block title="Modalidad">
        {(['presencial', 'remoto', 'hibrido'] as const).map((m) => {
          const checked = filtros.modalidad?.includes(m) ?? false;
          return (
            <CheckRow
              key={m}
              label={capitalize(m)}
              checked={checked}
              onToggle={() =>
                onChange({
                  ...filtros,
                  modalidad: checked
                    ? filtros.modalidad?.filter((x) => x !== m)
                    : [...(filtros.modalidad ?? []), m],
                })
              }
            />
          );
        })}
      </Block>
      <Block title="Distancia">
        <input
          type="range"
          min={1}
          max={50}
          value={filtros.distanciaKm ?? 50}
          onChange={(e) => onChange({ ...filtros, distanciaKm: Number(e.target.value) })}
          className="w-full accent-sky-600"
        />
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mt-1">
          <span>1 km</span>
          <span className="text-slate-900 font-bold">{filtros.distanciaKm ?? 50} km</span>
          <span>Toda la ciudad</span>
        </div>
      </Block>
      <Block title="Rango de precio">
        <div className="flex items-center gap-2">
          <input
            value={filtros.precioMin ?? ''}
            onChange={(e) => onChange({ ...filtros, precioMin: Number(e.target.value) || undefined })}
            placeholder="Min"
            className="flex-1 min-w-0 px-2 py-1.5 rounded border-2 border-slate-300 text-[12px] font-bold"
          />
          <span className="text-[10px] text-slate-400">a</span>
          <input
            value={filtros.precioMax ?? ''}
            onChange={(e) => onChange({ ...filtros, precioMax: Number(e.target.value) || undefined })}
            placeholder="Max"
            className="flex-1 min-w-0 px-2 py-1.5 rounded border-2 border-slate-300 text-[12px] font-bold"
          />
        </div>
      </Block>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-3 border-t border-slate-100 first:border-t-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer">
      <span
        className={
          'w-4 h-4 rounded border-2 grid place-items-center ' +
          (checked ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300')
        }
      >
        {checked && <Icon.Check size={10} strokeWidth={3} />}
      </span>
      <span className="text-[13px] font-semibold text-slate-700 flex-1">{label}</span>
      <input type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
    </label>
  );
}

function ResultadosVacio({ query }: { query: string }) {
  return (
    <div className="px-8 py-12 flex flex-col items-center text-center bg-white rounded-2xl border border-slate-200">
      <div className="w-20 h-20 rounded-full bg-sky-50 grid place-items-center mb-4">
        <Icon.Search size={28} className="text-sky-600" />
      </div>
      <div className="text-[18px] font-extrabold tracking-tight text-slate-900">
        Sin resultados para "{query}"
      </div>
      <p className="mt-2 text-[13px] text-slate-600 leading-relaxed max-w-[420px]">
        Prueba con menos filtros o palabras más generales. Si nadie lo ofrece, sé tú quien lo publique.
      </p>
      <button className="mt-5 py-3 px-6 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/40 flex items-center gap-2">
        <Icon.Plus size={14} /> Publicar mi solicitud
      </button>
    </div>
  );
}

/* ─────── helpers ─────── */

function formatPrecio(p: Publicacion['precio']): string {
  switch (p.kind) {
    case 'fijo':       return `$${p.monto.toLocaleString('es-MX')}`;
    case 'hora':       return `$${p.monto.toLocaleString('es-MX')}/h`;
    case 'mensual':    return `$${p.monto.toLocaleString('es-MX')}/mes`;
    case 'rango':      return `$${p.min.toLocaleString('es-MX')}–$${p.max.toLocaleString('es-MX')}`;
    case 'a-convenir': return 'A convenir';
  }
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* Re-export for convenience */
export { type FiltrosBusqueda };
