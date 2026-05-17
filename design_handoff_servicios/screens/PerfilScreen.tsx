/**
 * Perfil del Prestador — `/servicios/usuario/:id`
 *
 * Sin portada decorativa. Identidad densa, métricas inline (no cards infladas).
 * Tabs: Servicios activos · Reseñas · Q&A (desktop)
 */
import { useState } from 'react';
import { Icon, Stars, CardServicio } from '../components';
import type { Persona, Publicacion } from '../types';

interface PerfilScreenProps {
  persona: Persona;
  servicios: Publicacion[];
  reseñas: Array<{
    id: string;
    autor: string;
    cuando: string; // ISO
    rating: number;
    texto: string;
  }>;
  esMiPerfil?: boolean;
  onContact?: () => void;
  onWhatsApp?: () => void;
  onShare?: () => void;
  onFollow?: () => void;
}

export function PerfilScreen({
  persona,
  servicios,
  reseñas,
  esMiPerfil,
  onContact,
  onWhatsApp,
  onShare,
  onFollow,
}: PerfilScreenProps) {
  const [tab, setTab] = useState<'servicios' | 'reseñas'>('servicios');

  return (
    <div className="bg-slate-100 min-h-screen relative">
      <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-10">
        <button className="text-slate-600">
          <Icon.ChevL size={20} />
        </button>
        <div className="text-[14px] font-bold text-slate-900">Perfil</div>
        <div className="flex items-center gap-1">
          <button onClick={onShare} className="w-8 h-8 grid place-items-center text-slate-600">
            <Icon.Share size={16} />
          </button>
          {!esMiPerfil && (
            <button onClick={onFollow} className="px-3 py-1.5 rounded-full border-2 border-slate-300 text-[12px] font-bold text-slate-700">
              Seguir
            </button>
          )}
        </div>
      </header>

      <section className="bg-white px-4 lg:px-8 py-6 lg:py-8 max-w-[1280px] mx-auto">
        <div className="flex items-start gap-4 lg:gap-6">
          <Avatar persona={persona} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[20px] lg:text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">
                {persona.nombre}
              </h1>
              <DisponibleChip disponible={persona.disponible} />
            </div>
            <div className="text-[12px] lg:text-[13px] font-semibold text-slate-500 mt-0.5">
              {persona.skills?.[0] ?? 'Prestador'} · Puerto Peñasco · Miembro desde{' '}
              {new Date(persona.miembroDesde).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
            </div>

            <div className="mt-2 lg:mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <Stars rating={persona.ratingPromedio} size={13} />
                <span className="font-bold text-slate-900">{persona.ratingPromedio.toFixed(1)}</span>
                <span className="text-slate-500">· {persona.totalReseñas} reseñas</span>
              </div>
              <span className="hidden lg:inline text-slate-300">·</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Icon.Clock size={12} />{' '}
                <b className="font-bold">Responde en ~{persona.tiempoRespuestaHoras}h</b>
              </span>
              {persona.identidadVerificada && (
                <>
                  <span className="hidden lg:inline text-slate-300">·</span>
                  <span className="flex items-center gap-1 text-slate-700">
                    <Icon.ShieldCheck size={12} className="text-sky-600" />{' '}
                    <b className="font-bold">Identidad verificada</b>
                  </span>
                </>
              )}
            </div>

            {persona.bio && (
              <p className="mt-4 lg:mt-5 text-[14px] lg:text-[15px] text-slate-700 leading-relaxed max-w-3xl">
                {persona.bio}
              </p>
            )}

            {persona.skills && persona.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {persona.skills.map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Desktop action stack */}
          <div className="hidden lg:flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={onContact}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30"
            >
              <Icon.Chat size={16} /> Contactar
            </button>
            <button
              onClick={onWhatsApp}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-700 font-bold text-[13px]"
            >
              <Icon.WhatsApp size={14} /> WhatsApp
            </button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="bg-white border-t border-b border-slate-200 sticky top-[52px] z-10">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-8 flex items-center gap-6 lg:gap-8">
          <TabButton active={tab === 'servicios'} onClick={() => setTab('servicios')}>
            Servicios activos <span className="ml-1 text-slate-400 font-semibold">{servicios.length}</span>
          </TabButton>
          <TabButton active={tab === 'reseñas'} onClick={() => setTab('reseñas')}>
            Reseñas <span className="ml-1 text-slate-400 font-semibold">{reseñas.length}</span>
          </TabButton>
        </div>
      </nav>

      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-5">
        {tab === 'servicios' && (
          <>
            {servicios.length === 0 ? (
              <EmptyServicios />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                {servicios.map((s) => (
                  <CardServicio
                    key={s.id}
                    avatarInitials={persona.iniciales}
                    oferenteNombre={persona.nombre}
                    titulo={s.titulo}
                    precio={formatPrecio(s.precio)}
                    modalidad={capitalize(s.modalidad) as 'Presencial'}
                    distancia="—"
                  />
                ))}
              </div>
            )}
          </>
        )}
        {tab === 'reseñas' && (reseñas.length === 0 ? <EmptyReseñas nombre={persona.nombre} /> : <ReseñasList items={reseñas} />)}
      </div>

      {/* Mobile floating contact */}
      <div className="lg:hidden absolute right-4 bottom-6 z-30">
        <button
          onClick={onContact}
          className="flex items-center gap-2 pl-3 pr-5 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/40 font-semibold"
        >
          <Icon.Chat size={16} /> Contactar
        </button>
      </div>
    </div>
  );
}

/* ─────── parts ─────── */

function Avatar({ persona, size }: { persona: Persona; size: 'lg' }) {
  const cls = size === 'lg' ? 'w-20 h-20 lg:w-24 lg:h-24 text-2xl lg:text-3xl' : 'w-12 h-12 text-base';
  return (
    <div
      className={`${cls} rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white font-extrabold shadow-md shadow-sky-500/20 shrink-0 overflow-hidden`}
    >
      {persona.avatarUrl ? (
        <img src={persona.avatarUrl} alt={persona.nombre} className="w-full h-full object-cover" />
      ) : (
        persona.iniciales
      )}
    </div>
  );
}

function DisponibleChip({ disponible }: { disponible: boolean }) {
  if (disponible) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Disponible hoy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> No disponible
    </span>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        'py-3 text-[13px] lg:text-[14px] font-bold transition ' +
        (active ? 'text-slate-900 border-b-2 border-sky-600 -mb-px' : 'text-slate-500 font-semibold hover:text-slate-700')
      }
    >
      {children}
    </button>
  );
}

function ReseñasList({ items }: { items: PerfilScreenProps['reseñas'] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-4 lg:px-6">
      {items.map((r) => (
        <div key={r.id} className="py-4 border-b border-slate-200 last:border-b-0">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 grid place-items-center text-[11px] font-bold text-slate-600">
              {r.autor[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-slate-900">{r.autor}</span>
                <span className="text-[11px] text-slate-500">· {r.cuando}</span>
              </div>
              <Stars rating={r.rating} size={11} className="mt-0.5" />
            </div>
          </div>
          <p className="text-[13px] text-slate-700 leading-relaxed">{r.texto}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyServicios() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-300 grid place-items-center py-16 text-slate-500">
      <div className="text-center">
        <Icon.Plus size={20} className="mx-auto mb-2" />
        <div className="text-[12px] font-semibold">Este prestador aún no tiene servicios activos.</div>
      </div>
    </div>
  );
}

function EmptyReseñas({ nombre }: { nombre: string }) {
  return (
    <div className="px-8 py-10 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-sky-50 grid place-items-center mb-4">
        <Icon.Star size={28} className="text-sky-600" />
      </div>
      <div className="text-[16px] font-extrabold text-slate-900">Aún sin reseñas</div>
      <p className="mt-1 text-[13px] text-slate-600 leading-relaxed max-w-[280px]">
        Sé el primero en contratar a {nombre.split(' ')[0]} y deja tu reseña para ayudar a otros vecinos.
      </p>
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
