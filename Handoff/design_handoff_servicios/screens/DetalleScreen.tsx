/**
 * Detalle Servicio/Vacante — `/servicios/:id`
 *
 * Una sola pantalla con módulos condicionales según `publicacion.tipo`.
 * El layout desktop usa 2 columnas: contenido a la izquierda, card sticky a la derecha.
 */
import {
  Icon,
  Stars,
  QAItem,
  MapPlaceholder,
  ContactBar,
} from '../components';
import type { Publicacion, Persona, Empresa, Pregunta } from '../types';

interface DetalleScreenProps {
  publicacion: Publicacion;
  preguntas: Pregunta[];
  onBack?: () => void;
  onChat?: () => void;
  onWhatsApp?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

export function DetalleScreen({
  publicacion,
  preguntas,
  onBack,
  onChat,
  onWhatsApp,
  onSave,
  onShare,
}: DetalleScreenProps) {
  const isServicio = publicacion.tipo === 'servicio-persona';
  const isPausada = publicacion.estado === 'pausada';
  const oferente = publicacion.oferente;

  return (
    <div className="bg-white lg:bg-slate-100 min-h-screen">
      {/* ===== Mobile ===== */}
      <div className="lg:hidden relative">
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center">
            <Icon.ChevL size={18} />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onSave} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center">
              <Icon.Heart size={16} />
            </button>
            <button onClick={onShare} className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center">
              <Icon.Share size={15} />
            </button>
          </div>
        </div>

        <Gallery publicacion={publicacion} />

        {isPausada && <PausadaBanner />}

        <div className="px-4 py-4">
          <TipoChip tipo={publicacion.tipo} />
          <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-slate-900 leading-tight">
            {publicacion.titulo}
          </h1>
          <PrecioLinea publicacion={publicacion} />

          {oferente && <OferenteCard oferente={oferente} tipo={publicacion.tipo} />}

          <Section title="Descripción">
            <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">
              {publicacion.descripcion}
            </p>
          </Section>

          {isServicio && oferente && 'skills' in oferente && oferente.skills && (
            <Section title="Especialidades">
              <PillList items={oferente.skills} />
            </Section>
          )}

          {publicacion.requisitos && publicacion.requisitos.length > 0 && (
            <Section title="Requisitos">
              <ul className="space-y-1.5">
                {publicacion.requisitos.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[13px] text-slate-700 font-medium">
                    <Icon.Check size={14} className="text-sky-600 mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Modalidad y ubicación">
            <div className="flex flex-wrap gap-1.5 mb-3">
              <ModalidadChip modalidad={publicacion.modalidad} />
              {publicacion.horario && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
                  <Icon.Clock size={11} /> {publicacion.horario}
                </span>
              )}
              {publicacion.ubicacion.zonas.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
                  {publicacion.ubicacion.zonas.join(' · ')}
                </span>
              )}
            </div>
            <MapPlaceholder small />
          </Section>

          <Section title="Preguntas y respuestas">
            <div className="space-y-4">
              {preguntas.map((p) => (
                <QAItem
                  key={p.id}
                  autor={p.autor.nombre}
                  cuando={formatDate(p.createdAt)}
                  pregunta={p.texto}
                  respuesta={p.respuesta?.texto}
                  pendiente={!p.respuesta}
                />
              ))}
            </div>
            <button className="mt-3 text-[12px] font-bold text-sky-700">+ Preguntar</button>
          </Section>

          <div className="h-32" />
        </div>

        <ContactBar onChat={onChat} onWhatsApp={onWhatsApp} disabled={isPausada} />
      </div>

      {/* ===== Desktop ===== */}
      <div className="hidden lg:block">{/* …mirroring layout, see reference/detalle.jsx */}</div>
    </div>
  );
}

/* ─────────── helpers ─────────── */

function Gallery({ publicacion }: { publicacion: Publicacion }) {
  const fotos = publicacion.fotos;
  if (publicacion.tipo === 'vacante-empresa') {
    return (
      <div className="aspect-[16/9] relative bg-gradient-to-br from-sky-100 to-sky-200 grid place-items-center">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-white grid place-items-center text-sky-700 text-2xl font-extrabold shadow-md">
            {publicacion.oferente && 'iniciales' in publicacion.oferente
              ? publicacion.oferente.iniciales
              : '··'}
          </div>
          <div className="mt-3 text-sm font-bold text-slate-900">
            {publicacion.oferente && 'nombre' in publicacion.oferente ? publicacion.oferente.nombre : ''}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="aspect-[4/3] relative bg-stripe">
      {fotos[0] ? (
        <img src={fotos[0]} alt={publicacion.titulo} className="absolute inset-0 w-full h-full object-cover" />
      ) : null}
      {fotos.length > 1 && (
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 text-white text-[11px] font-bold">
          1 / {fotos.length}
        </div>
      )}
    </div>
  );
}

function TipoChip({ tipo }: { tipo: Publicacion['tipo'] }) {
  if (tipo === 'vacante-empresa') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold">
        <Icon.Briefcase size={10} /> Vacante — Empresa verificada
      </span>
    );
  }
  if (tipo === 'solicito') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
        Solicito
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold">
      <Icon.Tool size={10} /> Servicio personal
    </span>
  );
}

function PrecioLinea({ publicacion }: { publicacion: Publicacion }) {
  return (
    <div className="mt-1 flex items-baseline gap-2">
      <span className="text-[20px] font-extrabold text-sky-700">{formatPrecio(publicacion.precio)}</span>
      <span className="text-[12px] font-semibold text-slate-500">
        · {capitalize(publicacion.modalidad)} · {publicacion.ubicacion.ciudad.split(',')[0]}
      </span>
    </div>
  );
}

function OferenteCard({ oferente, tipo }: { oferente: Persona | Empresa; tipo: Publicacion['tipo'] }) {
  const isPersona = 'ratingPromedio' in oferente;
  return (
    <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
      {isPersona ? (
        <>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white font-extrabold">
            {oferente.iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-slate-900">{oferente.nombre}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Stars rating={(oferente as Persona).ratingPromedio} size={11} />
              <span className="text-[11px] font-semibold text-slate-600">
                {(oferente as Persona).ratingPromedio.toFixed(1)} · {(oferente as Persona).totalReseñas} reseñas
              </span>
            </div>
          </div>
          <button className="text-[12px] font-semibold text-sky-700 flex items-center gap-1">
            Ver perfil <Icon.ChevR size={12} />
          </button>
        </>
      ) : (
        <>
          <div className="w-12 h-12 rounded-xl bg-white grid place-items-center text-sky-700 font-extrabold border border-sky-100">
            {oferente.iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold text-slate-900">{oferente.nombre}</span>
              <Icon.ShieldCheck size={13} className="text-sky-600" />
            </div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
              Verificado · Miembro desde {formatDate(oferente.miembroDesde)}
            </div>
          </div>
          <button className="text-[12px] font-semibold text-sky-700 flex items-center gap-1">
            Ver negocio <Icon.ChevR size={12} />
          </button>
        </>
      )}
    </div>
  );
}

function ModalidadChip({ modalidad }: { modalidad: Publicacion['modalidad'] }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
      <Icon.Pin size={11} /> {capitalize(modalidad)}
    </span>
  );
}

function PillList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
          {t}
        </span>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function PausadaBanner() {
  return (
    <div className="mt-3 mx-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
      <Icon.Alert size={16} className="text-amber-700 mt-0.5 shrink-0" />
      <div>
        <div className="text-[13px] font-bold text-amber-900">Publicación pausada</div>
        <div className="text-[12px] text-amber-800 leading-snug">
          No puedes contactar mientras esté pausada. Te avisaremos si vuelve a estar activa.
        </div>
      </div>
    </div>
  );
}

/* ─────────── formatters ─────────── */

function formatPrecio(p: Publicacion['precio']): string {
  switch (p.kind) {
    case 'fijo':
      return `$${p.monto.toLocaleString('es-MX')}`;
    case 'hora':
      return `$${p.monto.toLocaleString('es-MX')}/hora`;
    case 'mensual':
      return `$${p.monto.toLocaleString('es-MX')} / mes`;
    case 'rango':
      return `$${p.min.toLocaleString('es-MX')}–$${p.max.toLocaleString('es-MX')}`;
    case 'a-convenir':
      return 'A convenir';
  }
}

function formatDate(d: string) {
  // Tu i18n real → "hace 1d" / "Mar 2026". Placeholder simple aquí.
  return new Date(d).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
