/**
 * Wizard Publicar Servicio — `/servicios/publicar`
 *
 * 4 pasos con auto-guardado a sessionStorage.
 * En desktop: panel lateral derecho con vista previa en vivo.
 *
 * Este archivo deja el ESQUELETO del wizard. La UI de cada paso está
 * implementada con detalle en `reference/wizard.jsx` — replica el layout.
 */
import { useEffect, useState } from 'react';
import { Icon, Chip, MapPlaceholder, CardServicio } from '../components';
import type { WizardDraft, Precio } from '../types';

const DRAFT_KEY = 'aya:servicios:wizard:draft';
const DEFAULT_DRAFT: WizardDraft = {
  paso: 1,
  checks: { legal: false, verdadera: false, coordinacion: false },
};

export function PublicarScreen({ onCancel, onSubmit }: { onCancel?: () => void; onSubmit?: (d: WizardDraft) => void }) {
  const [draft, setDraft] = useState<WizardDraft>(() => loadDraft());

  // Auto-save sessionStorage en cada cambio
  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
  }, [draft]);

  const update = (patch: Partial<WizardDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const goto = (paso: WizardDraft['paso']) => update({ paso });

  return (
    <div className="bg-slate-100 min-h-screen">
      <Header onCancel={onCancel} step={draft.paso} />
      <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-6">
        <div className="grid lg:grid-cols-[1fr_440px] gap-10">
          <div>
            <StepIndicator step={draft.paso} />
            {draft.paso === 1 && <Step1 draft={draft} update={update} />}
            {draft.paso === 2 && <Step2 draft={draft} update={update} />}
            {draft.paso === 3 && <Step3 draft={draft} update={update} />}
            {draft.paso === 4 && <Step4 draft={draft} update={update} onSubmit={() => onSubmit?.(draft)} />}
            <WizardNav step={draft.paso} onGoto={goto} canContinue={isStepValid(draft)} onSubmit={() => onSubmit?.(draft)} />
          </div>
          {/* Desktop: live preview */}
          <aside className="hidden lg:block">
            <LivePreview draft={draft} />
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── steps (simplified) ──────────────── */

function Step1({ draft, update }: StepProps) {
  return (
    <div className="space-y-3">
      <TypeCard
        active={draft.modo === 'ofrezco'}
        icon={<Icon.Hand size={20} />}
        title="Ofrezco un servicio o busco empleo"
        hint="Soy una persona o empresa que ofrece sus habilidades."
        onClick={() => update({ modo: 'ofrezco' })}
      />
      <TypeCard
        active={draft.modo === 'solicito'}
        icon={<Icon.Search size={20} />}
        title="Solicito un servicio o busco contratar"
        hint="Necesito a alguien para algo puntual o tengo una vacante."
        onClick={() => update({ modo: 'solicito' })}
      />
      {/* Sub-elección condicional — ver reference/wizard.jsx para el detalle */}
    </div>
  );
}

function Step2({ draft, update }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="Título" hint={`${draft.titulo?.length ?? 0}/60`}>
        <input
          maxLength={60}
          value={draft.titulo ?? ''}
          onChange={(e) => update({ titulo: e.target.value })}
          placeholder="Ej. Plomería residencial 24 horas"
          className="w-full px-3.5 py-3 rounded-lg border-2 border-slate-300 bg-white text-[14px] font-medium text-slate-900 outline-none focus:border-sky-500"
        />
      </Field>
      <Field label="Descripción" hint={`${draft.descripcion?.length ?? 0}/500`}>
        <textarea
          maxLength={500}
          rows={4}
          value={draft.descripcion ?? ''}
          onChange={(e) => update({ descripcion: e.target.value })}
          placeholder="Cuenta qué haces, tu experiencia y por qué eres la mejor opción."
          className="w-full px-3.5 py-3 rounded-lg border-2 border-slate-300 bg-white text-[14px] font-medium text-slate-900 outline-none focus:border-sky-500"
        />
      </Field>
      <Field label="Modalidad">
        <div className="grid grid-cols-3 gap-2">
          {(['presencial', 'remoto', 'hibrido'] as const).map((m) => (
            <button
              key={m}
              onClick={() => update({ modalidad: m })}
              className={
                'px-3 py-2.5 rounded-lg border-2 text-[13px] font-semibold capitalize ' +
                (draft.modalidad === m
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400')
              }
            >
              {m}
            </button>
          ))}
        </div>
      </Field>
      {/* Fotos drag&drop + skills autocomplete — ver reference/wizard.jsx */}
    </div>
  );
}

function Step3({ draft, update }: StepProps) {
  const kind = draft.precio?.kind ?? 'hora';
  return (
    <div className="space-y-5">
      <Field label="Tipo de precio">
        <div className="grid grid-cols-5 gap-2">
          {(['fijo', 'hora', 'rango', 'mensual', 'a-convenir'] as const).map((k) => (
            <button
              key={k}
              onClick={() => update({ precio: defaultPrecio(k) })}
              className={
                'px-3 py-2.5 rounded-lg border-2 text-[13px] font-semibold capitalize ' +
                (kind === k
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400')
              }
            >
              {k === 'a-convenir' ? 'A convenir' : k}
            </button>
          ))}
        </div>
      </Field>
      {/* Inputs numéricos según kind */}
      <Field label="Zonas que atiendes">
        <div className="flex flex-wrap gap-2">
          {['Centro', 'Las Conchas', 'Cholla', 'Mirador', 'Sandy Beach', 'Toda la ciudad'].map((z) => {
            const active = draft.zonas?.includes(z) ?? false;
            return (
              <Chip
                key={z}
                active={active}
                onClick={() =>
                  update({
                    zonas: active
                      ? draft.zonas?.filter((x) => x !== z)
                      : [...(draft.zonas ?? []), z],
                  })
                }
              >
                {z}
              </Chip>
            );
          })}
        </div>
      </Field>
      <Field label="Mostrar zona en mapa">
        <MapPlaceholder small />
        <p className="mt-2 text-[11px] text-slate-500 leading-snug">
          Por privacidad, mostramos un radio de ~500m alrededor de tu zona, no tu dirección exacta.
        </p>
      </Field>
    </div>
  );
}

function Step4({ draft, update, onSubmit }: StepProps & { onSubmit: () => void }) {
  const checks = draft.checks;
  return (
    <div>
      <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Vista previa</div>
      <div className="max-w-[260px]">
        <CardServicio
          avatarInitials="TÚ"
          oferenteNombre="Tu nombre"
          titulo={draft.titulo ?? 'Tu título'}
          precio={draft.precio ? formatPrecio(draft.precio) : 'A convenir'}
          modalidad={capitalize(draft.modalidad ?? 'presencial') as 'Presencial'}
          distancia="Peñasco · ahora"
        />
      </div>

      <div className="mt-6">
        <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Confirma antes de publicar
        </div>
        <div className="space-y-2">
          {[
            { k: 'legal', l: 'No estoy ofreciendo nada ilegal' },
            { k: 'verdadera', l: 'La información es verdadera' },
            { k: 'coordinacion', l: 'Sé que la coordinación es por mi cuenta (ChatYA, WhatsApp, en persona)' },
          ].map((c) => {
            const checked = checks[c.k as keyof typeof checks];
            return (
              <label key={c.k} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <span
                  className={
                    'mt-0.5 w-5 h-5 rounded border-2 grid place-items-center ' +
                    (checked ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300')
                  }
                >
                  {checked && <Icon.Check size={12} strokeWidth={3} />}
                </span>
                <span className="text-[13px] font-medium text-slate-700 leading-snug">{c.l}</span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => update({ checks: { ...checks, [c.k]: e.target.checked } })}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-slate-500 leading-snug">
        Tu publicación expira automáticamente en 30 días. Podrás renovarla con un toque.
      </p>
    </div>
  );
}

/* ──────────────── shell components ──────────────── */

interface StepProps {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
}

function Header({ onCancel, step }: { onCancel?: () => void; step: number }) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 lg:px-8 py-3 flex items-center gap-3 sticky top-0 z-20">
      <button onClick={onCancel} className="text-slate-600">
        {step === 1 ? <Icon.X size={20} /> : <Icon.ChevL size={20} />}
      </button>
      <div className="flex-1 text-center lg:text-left text-[14px] font-bold text-slate-900">Publicar</div>
      <button className="text-[12px] font-bold text-slate-500">Guardar borrador</button>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  const titles = [
    { t: '¿Qué quieres hacer?', h: 'Elige cómo aparecerá tu publicación.' },
    { t: 'Información principal', h: 'Lo que la gente verá en tu publicación.' },
    { t: 'Precio y ubicación', h: 'Define cuánto cobras y dónde atiendes.' },
    { t: 'Revisa y publica', h: 'Así se verá tu publicación en el feed.' },
  ];
  const cur = titles[step - 1];
  return (
    <div className="mb-7">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-sky-600' : 'bg-slate-200'}`} />
        ))}
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-sky-700">
        Paso {step} de 4
      </div>
      <div className="mt-1 text-[22px] lg:text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
        {cur.t}
      </div>
      <p className="mt-1 text-[13px] text-slate-600 leading-relaxed">{cur.h}</p>
    </div>
  );
}

function WizardNav({
  step,
  onGoto,
  canContinue,
  onSubmit,
}: {
  step: WizardDraft['paso'];
  onGoto: (p: WizardDraft['paso']) => void;
  canContinue: boolean;
  onSubmit: () => void;
}) {
  const isLast = step === 4;
  return (
    <div className="mt-10 flex items-center gap-3 max-w-2xl">
      {step > 1 && (
        <button onClick={() => onGoto((step - 1) as WizardDraft['paso'])} className="px-5 py-3 rounded-full border-2 border-slate-300 text-[14px] font-bold text-slate-700">
          Atrás
        </button>
      )}
      <button
        onClick={() => (isLast ? onSubmit() : onGoto((step + 1) as WizardDraft['paso']))}
        disabled={!canContinue}
        className="ml-auto flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLast ? (
          <>
            <Icon.Send size={14} /> Publicar
          </>
        ) : (
          <>
            Continuar <Icon.ArrowR size={14} />
          </>
        )}
      </button>
    </div>
  );
}

function TypeCard({
  active,
  icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        'w-full text-left p-4 rounded-2xl border-2 transition ' +
        (active
          ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10'
          : 'border-slate-300 bg-white hover:border-slate-400')
      }
    >
      <div className="flex items-start justify-between">
        <div
          className={
            'w-11 h-11 rounded-xl grid place-items-center ' +
            (active ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600')
          }
        >
          {icon}
        </div>
        {active && (
          <div className="w-5 h-5 rounded-full bg-sky-600 grid place-items-center text-white">
            <Icon.Check size={12} strokeWidth={3} />
          </div>
        )}
      </div>
      <div className="mt-3 text-[15px] font-extrabold text-slate-900 leading-snug">{title}</div>
      <div className="mt-1 text-[12px] text-slate-600 leading-snug">{hint}</div>
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[12px] font-bold uppercase tracking-wider text-slate-600">{label}</div>
        {hint && <div className="text-[11px] font-medium text-slate-500">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function LivePreview({ draft }: { draft: WizardDraft }) {
  return (
    <div className="sticky top-24">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Vista previa en vivo</div>
      <div className="rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300/40 p-6 border border-slate-200">
        <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-3 text-center">
          Así se verá en el feed
        </div>
        <div className="max-w-[260px] mx-auto">
          <CardServicio
            avatarInitials="TÚ"
            oferenteNombre="Tu nombre"
            titulo={draft.titulo ?? 'Tu título irá aquí'}
            precio={draft.precio ? formatPrecio(draft.precio) : 'A convenir'}
            modalidad={capitalize(draft.modalidad ?? 'presencial') as 'Presencial'}
            distancia="Peñasco · ahora"
          />
        </div>
        <div className="mt-5 pt-4 border-t border-slate-300/70 grid grid-cols-2 gap-3 text-[11px]">
          <div>
            <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-0.5">Auto-guardado</div>
            <div className="font-semibold text-slate-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Guardado
            </div>
          </div>
          <div>
            <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-0.5">Expira</div>
            <div className="font-semibold text-slate-700">En 30 días</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── helpers ──────────────── */

function loadDraft(): WizardDraft {
  if (typeof window === 'undefined') return DEFAULT_DRAFT;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? { ...DEFAULT_DRAFT, ...JSON.parse(raw) } : DEFAULT_DRAFT;
  } catch {
    return DEFAULT_DRAFT;
  }
}

function isStepValid(draft: WizardDraft): boolean {
  switch (draft.paso) {
    case 1: return !!draft.modo;
    case 2: return !!draft.titulo && (draft.descripcion?.length ?? 0) >= 30 && !!draft.modalidad;
    case 3: return !!draft.precio && (draft.zonas?.length ?? 0) > 0;
    case 4: return draft.checks.legal && draft.checks.verdadera && draft.checks.coordinacion;
  }
}

function defaultPrecio(kind: Precio['kind']): Precio {
  switch (kind) {
    case 'fijo':       return { kind, monto: 0, moneda: 'MXN' };
    case 'hora':       return { kind, monto: 0, moneda: 'MXN' };
    case 'mensual':    return { kind, monto: 0, moneda: 'MXN' };
    case 'rango':      return { kind, min: 0, max: 0, moneda: 'MXN' };
    case 'a-convenir': return { kind };
  }
}

function formatPrecio(p: Precio): string {
  switch (p.kind) {
    case 'fijo':       return `$${p.monto.toLocaleString('es-MX')}`;
    case 'hora':       return `$${p.monto.toLocaleString('es-MX')}/h`;
    case 'mensual':    return `$${p.monto.toLocaleString('es-MX')}/mes`;
    case 'rango':      return `$${p.min.toLocaleString('es-MX')}–$${p.max.toLocaleString('es-MX')}`;
    case 'a-convenir': return 'A convenir';
  }
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
