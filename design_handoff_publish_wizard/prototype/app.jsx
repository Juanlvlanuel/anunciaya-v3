/* global React, ReactDOM, WizardSteps */
const { useState, useEffect, useMemo } = React;
const { Step1, Step2, Step3, Icon } = window.WizardSteps;

const STORAGE_KEY = 'anunciaya-wizard-draft-v1';
const STEP_KEY    = 'anunciaya-wizard-step-v1';

const DEFAULT = {
  category: '',
  title: '',
  description: '',
  urgent: false,
  photos: [],
  modality: '',
  budgetMin: '',
  budgetMax: '',
  zones: [],
  confirms: { legal: false, true: false, coord: false },
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch { return DEFAULT; }
}
function loadStep() {
  const n = parseInt(localStorage.getItem(STEP_KEY) || '0', 10);
  return isNaN(n) ? 0 : Math.min(Math.max(n, 0), 2);
}

const STEP_NAMES = ['Qué necesitas', 'Detalles', 'Revisa y publica'];

function Progress({ step }) {
  return (
    <>
      <div className="progress">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={'progress-seg' + (i < step ? ' done' : '') + (i === step ? ' active' : '')}
          >
            <div className="fill" />
          </div>
        ))}
      </div>
      <div className="progress-label">
        Paso {step + 1} de 3 · {STEP_NAMES[step]}
      </div>
    </>
  );
}

function App() {
  const [step, setStep] = useState(loadStep);
  const [data, setData] = useState(loadDraft);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);
  useEffect(() => {
    localStorage.setItem(STEP_KEY, String(step));
  }, [step]);

  const set = (patch) => setData(prev => ({ ...prev, ...patch }));

  // ------- validación por paso -------
  const errors = useMemo(() => {
    const e = {};
    if (step === 0) {
      if (!data.category) e.category = 'Selecciona una categoría.';
      if (data.title.length < 10) e.title = 'Mínimo 10 caracteres.';
      if (data.description.length < 30) e.description = 'Mínimo 30 caracteres.';
    }
    if (step === 1) {
      if (!data.modality) e.modality = 'Selecciona una modalidad.';
      const min = +data.budgetMin || 0;
      const max = +data.budgetMax || 0;
      if (min > 0 && max > 0 && min > max) e.budget = 'El mínimo debe ser ≤ máximo.';
      if (data.zones.length < 1) e.zones = 'Agrega al menos una zona.';
    }
    if (step === 2) {
      const ok = Object.values(data.confirms).every(Boolean);
      if (!ok) e.confirms = 'Confirma los tres puntos.';
    }
    return e;
  }, [step, data]);

  const canNext = Object.keys(errors).length === 0;

  const handleNext = () => {
    if (!canNext) return;
    if (step < 2) setStep(s => s + 1);
    else publish();
  };
  const handleBack = () => { if (step > 0) setStep(s => s - 1); };
  const publish = () => {
    setShowSuccess(true);
  };
  const reset = () => {
    setData(DEFAULT);
    setStep(0);
    setShowSuccess(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STEP_KEY);
  };

  // primera ayuda contextual del Siguiente
  const nextHelp = useMemo(() => {
    if (canNext) return '';
    if (step === 0) {
      if (!data.category) return 'Selecciona una categoría para continuar.';
      if (data.title.length < 10) return `Tu título necesita ${10 - data.title.length} caracteres más.`;
      if (data.description.length < 30) return `La descripción necesita ${30 - data.description.length} caracteres más.`;
    }
    if (step === 1) {
      if (!data.modality) return 'Selecciona una modalidad.';
      if (errors.budget) return errors.budget;
      if (data.zones.length < 1) return 'Agrega al menos una zona.';
    }
    if (step === 2) return 'Confirma los tres puntos para poder publicar.';
    return '';
  }, [step, data, canNext, errors]);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="logo">
          <span className="glyph">A</span>
          AnunciaYA
        </div>
        <span style={{ color: 'var(--slate-300)' }}>›</span>
        <span className="breadcrumb">Publicar anuncio · <b>{STEP_NAMES[step]}</b></span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 14 }} onClick={reset}>
          Borrar borrador
        </button>
      </header>

      <main className="wizard-wrap">
        <Progress step={step} />

        <div className="step-card" key={step}>
          {step === 0 && <Step1 data={data} set={set} errors={errors} />}
          {step === 1 && <Step2 data={data} set={set} errors={errors} />}
          {step === 2 && <Step3 data={data} set={set} errors={errors} />}
        </div>

        <div className="step-footer">
          <div className="left">
            {step > 0 && (
              <button className="btn btn-ghost" onClick={handleBack}>
                <Icon name="arrow-l" /> Atrás
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {nextHelp && (
              <span style={{ fontSize: 13, color: 'var(--slate-500)' }}>{nextHelp}</span>
            )}
            <button className="btn btn-primary" disabled={!canNext} onClick={handleNext}>
              {step < 2 ? 'Siguiente' : 'Publicar'}
              {step < 2 && <Icon name="arrow" />}
              {step === 2 && <Icon name="sparkles" />}
            </button>
          </div>
        </div>
      </main>

      {showSuccess && (
        <div className="success-overlay" onClick={() => setShowSuccess(false)}>
          <div className="success-card" onClick={(e) => e.stopPropagation()}>
            <div className="badge">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>¡Tu anuncio está publicado!</h2>
            <p>Ya es visible en el feed de Clasificados. Los vecinos podrán contactarte directamente.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setShowSuccess(false)}>Ver mi anuncio</button>
              <button className="btn btn-primary" onClick={reset}>Publicar otro</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
