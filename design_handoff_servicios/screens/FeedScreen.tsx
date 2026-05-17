/**
 * Feed Servicios — `/servicios`
 *
 * Layout vertical:
 *   1. ServiciosHeader (sticky, dark)
 *   2. OfreceToggle (sticky en móvil, embedded en desktop)
 *   3. Fila de Chips de filtro (scroll horizontal)
 *   4. Carrusel "Recién publicado"
 *   5. Grid "Cerca de ti" (2/3/4 cols)
 *   6. FAB Publicar
 *
 * Conecta `useFeed()` (o tu hook real) a las cards. Aquí solo va el shell.
 */
import { useState } from 'react';
import {
  ServiciosHeader,
  OfreceToggle,
  type OfreceMode,
  Chip,
  Icon,
  CardServicio,
  CardVacante,
  CardSolicito,
  CardHorizontal,
  FAB,
} from '../components';

type Filtro = 'todos' | 'presencial' | 'remoto' | 'hibrido' | 'servicio' | 'empleo';

export function FeedScreen() {
  const [modo, setModo] = useState<OfreceMode>('ofrezco');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  // const { recientes, cerca, loading } = useFeed({ modo, filtro });

  return (
    <div className="bg-slate-100 min-h-screen">
      {/* Mobile */}
      <div className="lg:hidden">
        <ServiciosHeader variant="mobile" subtitle="Encuentra personas que ayudan" />
        <div className="px-4 -mt-3 relative z-10">
          <div className="bg-white rounded-2xl p-1.5 shadow-md border border-slate-200">
            <OfreceToggle value={modo} onChange={setModo} />
          </div>
        </div>
        <FiltersRow filtro={filtro} onChange={setFiltro} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <ServiciosHeader variant="desktop" subtitle="Encuentra personas que ayudan">
          <OfreceToggle value={modo} onChange={setModo} embedded />
        </ServiciosHeader>
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-[1320px] mx-auto px-8 py-3 flex items-center justify-between gap-4">
            <FiltersRow filtro={filtro} onChange={setFiltro} />
            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-slate-300 text-slate-700 text-[12px] font-semibold">
              Más recientes <Icon.ChevD size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Carrusel Recién publicado */}
      <section className="max-w-[1320px] mx-auto px-4 lg:px-8 mt-5 lg:mt-6">
        <SectionTitle action="Ver todos">Recién publicado en Peñasco</SectionTitle>
        <div className="flex gap-3 lg:gap-4 overflow-x-auto no-scrollbar pb-2 snap-x">
          <CardHorizontal titulo="Pintura residencial y locales" precio="$2,800/cuarto" meta="Presencial · hace 1h" />
          <CardHorizontal titulo="Diseño web para negocios locales" precio="$4,500" meta="Remoto · hace 2h" />
          <CardHorizontal titulo="Pastelería para eventos y XV" precio="A convenir" meta="Presencial · hace 3h" />
          {/* …mapea recientes */}
        </div>
      </section>

      {/* Grid Cerca de ti */}
      <section className="max-w-[1320px] mx-auto px-4 lg:px-8 mt-6 lg:mt-8 pb-32">
        <SectionTitle count="32 resultados">Cerca de ti</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4">
          <CardServicio
            avatarInitials="JR"
            oferenteNombre="Javier R."
            titulo="Plomería residencial 24h"
            precio="$350/h"
            modalidad="Presencial"
            distancia="0.8 km · hace 1h"
          />
          <CardVacante
            logoInitials="RA"
            empresa="Rest. Aurora"
            titulo="Mesero(a) turno noche"
            salario="$8,500/mes"
            zona="Centro · TC"
          />
          <CardSolicito
            categoryIcon="image"
            titulo="Busco: fotógrafo boda"
            presupuesto="$3,500–$5,000"
            zona="Las Conchas"
            solicitanteNombre="Ana T."
            tiempo="hace 1h"
          />
          {/* …mapea cerca */}
        </div>
      </section>

      <FAB onClick={() => {/* navigate('/servicios/publicar') */}} />
    </div>
  );
}

function FiltersRow({ filtro, onChange }: { filtro: Filtro; onChange: (f: Filtro) => void }) {
  const items: Array<{ k: Filtro; l: string }> = [
    { k: 'todos', l: 'Todos' },
    { k: 'presencial', l: 'Presencial' },
    { k: 'remoto', l: 'Remoto' },
    { k: 'hibrido', l: 'Híbrido' },
    { k: 'servicio', l: 'Servicio' },
    { k: 'empleo', l: 'Empleo' },
  ];
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 lg:px-0 py-3 lg:py-0">
      {items.map((it) => (
        <Chip key={it.k} active={filtro === it.k} onClick={() => onChange(it.k)}>
          {it.k === 'todos' && <Icon.Filter size={12} />}
          {it.l}
        </Chip>
      ))}
      <Chip>1 km</Chip>
      <Chip>5 km</Chip>
      <Chip>Toda la ciudad</Chip>
      <Chip>$ — $$$</Chip>
    </div>
  );
}

function SectionTitle({
  children,
  count,
  action,
}: {
  children: React.ReactNode;
  count?: string;
  action?: string;
}) {
  return (
    <div className="flex items-end justify-between mb-2 lg:mb-3">
      <h2 className="text-[17px] lg:text-[18px] font-extrabold tracking-tight text-slate-900">{children}</h2>
      <div className="flex items-center gap-3">
        {count && <span className="text-[12px] font-semibold text-slate-500">{count}</span>}
        {action && (
          <button className="text-[12px] font-semibold text-sky-700 flex items-center gap-1">
            {action} <Icon.ChevR size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Estado vacío — úsalo cuando `recientes.length === 0 && cerca.length === 0` */
export function FeedEmptyState({ onPublicar }: { onPublicar?: () => void }) {
  return (
    <div className="mt-12 px-8 flex flex-col items-center text-center">
      <div className="w-24 h-24 mb-5">
        <svg viewBox="0 0 120 120" className="w-full h-full">
          <circle cx="60" cy="60" r="48" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 4" />
          <circle cx="60" cy="60" r="32" fill="#f0f9ff" stroke="#0ea5e9" strokeOpacity=".4" strokeWidth="1" />
          <g stroke="#0369a1" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M50 64v-6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6" />
            <rect x="46" y="64" width="28" height="14" rx="2" />
            <path d="M56 54v-4a4 4 0 0 1 8 0v4" />
          </g>
        </svg>
      </div>
      <p className="text-[18px] font-extrabold tracking-tight text-slate-900">
        Aún nadie en tu zona ofrece esto
      </p>
      <p className="mt-1.5 text-[13px] text-slate-600 leading-relaxed max-w-[280px]">
        Sé el primero en publicar y aparece arriba en el feed mientras llegan los demás.
      </p>
      <button
        onClick={onPublicar}
        className="mt-5 px-5 py-2.5 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-md shadow-sky-500/40 flex items-center gap-2"
      >
        <Icon.Plus size={14} /> Publicar lo que ofrezco
      </button>
    </div>
  );
}
