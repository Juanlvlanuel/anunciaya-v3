/* global React */
const { useState } = React;

/* ============================================================
   Catálogo de categorías + icons
   ============================================================ */
const CATEGORIES = [
  { id: 'hogar',    title: 'Hogar',           desc: 'Plomería, electricidad, A/C, jardín, limpieza, mudanzas, albañilería.' },
  { id: 'cuidados', title: 'Cuidados',         desc: 'Niñeras, tutorías, cuidadores de ancianos, paseadores y cuidadores de mascotas.' },
  { id: 'eventos',  title: 'Eventos',          desc: 'Bodas, XV, fiestas, catering, fotografía, mariachi, decoración.' },
  { id: 'belleza',  title: 'Belleza y bienestar', desc: 'Estilismo, masajes, manicura, depilación, spa a domicilio, entrenamiento personal.' },
  { id: 'empleo',   title: 'Busco trabajo',    desc: 'Quiero que los negocios y vecinos vean que estoy buscando empleo.' },
  { id: 'otros',    title: 'Otros',            desc: 'Tecnología, diseño, transporte, o cualquier cosa que no encaje en las anteriores.' },
];

const Icon = ({ name }) => {
  const props = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'hogar':    return <svg {...props}><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/></svg>;
    case 'cuidados': return <svg {...props}><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10Z"/></svg>;
    case 'eventos':  return <svg {...props}><path d="M3 21 9 9l6 6Z"/><path d="m13 7 4 4"/><path d="M15 5h4M17 3v4M21 9v4"/></svg>;
    case 'belleza':  return <svg {...props}><path d="M12 2 14 8l6 .5-4.5 4 1.5 6L12 15l-5 3.5L8.5 12.5 4 8.5 10 8Z"/></svg>;
    case 'empleo':   return <svg {...props}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
    case 'otros':    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 4 2c-.7.5-1.5 1-1.5 2"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>;
    case 'camera':   return <svg {...props}><path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/></svg>;
    case 'pin':      return <svg {...props}><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case 'check':    return <svg {...props}><path d="m5 12 4 4L19 6"/></svg>;
    case 'plus':     return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'x':        return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'arrow':    return <svg {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-l':  return <svg {...props}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>;
    case 'info':     return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8v.01M12 12v4"/></svg>;
    case 'sparkles': return <svg {...props}><path d="M5 3v4M3 5h4M19 13v4M17 15h4M12 4 13.5 8 17.5 9.5 13.5 11 12 15 10.5 11 6.5 9.5 10.5 8Z"/></svg>;
    default: return null;
  }
};

/* ============================================================
   PASO 1 — Qué necesitas
   ============================================================ */
function Step1({ data, set, errors }) {
  return (
    <div className="step-grid">
      <div className="rail">
        <h1>Qué necesitas</h1>
        <p className="subtitle">Cuéntanos lo esencial. Elige una categoría y describe brevemente tu pedido.</p>
      </div>
      <div>
        <div className="field">
          <span className="field-label">¿En qué categoría cae tu pedido?</span>
          <div className="cards-grid cols-2">
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                className={'option-card' + (data.category === c.id ? ' selected' : '')}
                onClick={() => set({ category: c.id })}
                type="button"
              >
                <div className="icon-wrap"><Icon name={c.id} /></div>
                <div className="title-row">
                  <strong>{c.title}</strong>
                  <span className="desc">{c.desc}</span>
                </div>
                <div className="check"><Icon name="check" /></div>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Título del anuncio</span>
          <input
            className={'input' + (errors.title ? ' error' : '')}
            placeholder="Ej: Busco fotógrafo para boda"
            maxLength={80}
            value={data.title}
            onChange={(e) => set({ title: e.target.value })}
          />
          <div className="field-meta">
            <span className={data.title.length >= 10 ? 'ok' : ''}>
              Mínimo 10 caracteres ({data.title.length}/10)
            </span>
            <span className="right">{data.title.length}/80</span>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Descripción</span>
          <textarea
            className={'textarea' + (errors.description ? ' error' : '')}
            placeholder="Describe con detalle qué necesitas, cuándo y cualquier dato útil."
            maxLength={500}
            rows={4}
            value={data.description}
            onChange={(e) => set({ description: e.target.value })}
          />
          <div className="field-meta">
            <span className={data.description.length >= 30 ? 'ok' : ''}>
              Mínimo 30 caracteres ({data.description.length}/30)
            </span>
            <span className="right">{data.description.length}/500</span>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Visibilidad</span>
          <div
            className={'check-card urgent' + (data.urgent ? ' selected' : '')}
            onClick={() => set({ urgent: !data.urgent })}
          >
            <div className="box"><Icon name="check" /></div>
            <div className="body">
              <strong>
                Marcar como urgente
                <span className="badge">Hoy o mañana</span>
              </strong>
              <p>Sube tu pedido al top del feed de Clasificados y lo marca con etiqueta naranja. Úsalo solo si lo necesitas hoy o mañana.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PASO 2 — Detalles
   ============================================================ */
const MODALITIES = [
  { id: 'presencial', title: 'Presencial', desc: 'El servicio se hace cara a cara, en un lugar físico.' },
  { id: 'remoto',     title: 'Remoto',     desc: 'Todo se coordina y entrega por internet, sin verse.' },
  { id: 'hibrido',    title: 'Híbrido',    desc: 'Algunas partes presenciales y otras a distancia.' },
];

function Step2({ data, set }) {
  const [zoneInput, setZoneInput] = useState('');
  const addZone = () => {
    const z = zoneInput.trim();
    if (!z || data.zones.includes(z) || data.zones.length >= 10) return;
    set({ zones: [...data.zones, z] });
    setZoneInput('');
  };
  const removeZone = (z) => set({ zones: data.zones.filter(x => x !== z) });

  const togglePhoto = (i) => {
    if (data.photos.length > i) {
      // remove
      set({ photos: data.photos.filter((_, k) => k !== i) });
    } else if (data.photos.length < 6) {
      set({ photos: [...data.photos, `photo-${Date.now()}`] });
    }
  };

  const photoTiles = [];
  for (let i = 0; i < 6; i++) {
    const filled = i < data.photos.length;
    photoTiles.push(
      <div
        key={i}
        className={'photo-tile' + (filled ? ' filled' : '') + (filled && i === 0 ? ' cover' : '')}
        onClick={() => togglePhoto(i)}
      >
        {filled ? (
          <button className="remove" onClick={(e) => { e.stopPropagation(); togglePhoto(i); }}>
            <Icon name="x" />
          </button>
        ) : (
          <div className="add">
            <Icon name="camera" />
            <span>{data.photos.length === 0 && i === 0 ? 'Agregar' : '+'}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="step-grid">
      <div className="rail">
        <h1>Detalles</h1>
        <p className="subtitle">Fotos, modalidad, presupuesto y zonas donde aplica tu pedido.</p>
      </div>
      <div>
        <div className="field">
          <span className="field-label">Fotos <span className="extra">(opcional · máx 6)</span></span>
          <div className="photo-grid">{photoTiles}</div>
          <div className="field-meta" style={{ marginTop: 10 }}>
            <span>JPG, PNG o WebP · máximo 5 MB cada una · la primera será la portada.</span>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Modalidad</span>
          <div className="cards-grid cols-3">
            {MODALITIES.map(m => (
              <button
                key={m.id}
                type="button"
                className={'option-card mod' + (data.modality === m.id ? ' selected' : '')}
                onClick={() => set({ modality: m.id })}
              >
                <strong>{m.title}</strong>
                <span className="desc">{m.desc}</span>
                <div className="check"><Icon name="check" /></div>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Presupuesto (MXN)</span>
          <p className="field-help">Cuánto estás dispuesto a pagar. Los prestadores cotizan dentro de ese rango.</p>
          <div className="budget-row">
            <div>
              <label>Mínimo</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  className="input"
                  type="number" min={0} placeholder="0"
                  value={data.budgetMin}
                  onChange={(e) => set({ budgetMin: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label>Máximo</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  className="input"
                  type="number" min={0} placeholder="0"
                  value={data.budgetMax}
                  onChange={(e) => set({ budgetMax: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Zonas donde aplica</span>
          <p className="field-help">Mínimo 1, máximo 10. Las colonias o zonas donde puedes dar/recibir el servicio.</p>
          <div className="zones-input">
            <input
              className="input"
              placeholder="Ej: Centro, Las Conchas, Cholla"
              value={zoneInput}
              onChange={(e) => setZoneInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addZone(); } }}
            />
            <button type="button" className="btn btn-dark" onClick={addZone} disabled={data.zones.length >= 10}>
              <Icon name="plus" /> Agregar
            </button>
          </div>
          <div className="field-meta" style={{ marginTop: 8 }}>
            <span className={data.zones.length >= 1 ? 'ok' : ''}>{data.zones.length}/10</span>
          </div>
          {data.zones.length > 0 && (
            <div className="chip-row">
              {data.zones.map(z => (
                <span key={z} className="chip">
                  {z}
                  <button onClick={() => removeZone(z)} aria-label={`Quitar ${z}`}><Icon name="x" /></button>
                </span>
              ))}
            </div>
          )}

          <div className="info-card">
            <div className="pin"><Icon name="pin" /></div>
            <div>
              <div className="label">Ubicación detectada</div>
              <h4>Puerto Peñasco</h4>
              <p>Tu coordenada exacta nunca se publica. El feed mostrará a los vecinos una zona aproximada con un offset de unos cientos de metros.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PASO 3 — Revisa y publica
   ============================================================ */
const CONFIRMATIONS = [
  {
    id: 'legal',
    title: 'Es un servicio legal',
    desc: 'Lo que ofrezco/solicito no infringe leyes mexicanas, no es discriminatorio ni explota a menores. Tampoco es contenido sexual, sustancias controladas, ni armas.',
  },
  {
    id: 'true',
    title: 'La información es verdadera',
    desc: 'Todos los datos (precio, descripción, fotos, zona) son reales y reflejan lo que voy a entregar o lo que necesito.',
  },
  {
    id: 'coord',
    title: 'Coordinaré directamente con la otra parte',
    desc: 'AnunciaYA es solo el medio para conectarnos. El pago, los términos y la entrega se acuerdan directamente entre las personas. AnunciaYA no procesa pagos ni media en conflictos.',
  },
];

function Step3({ data, set }) {
  const cat = CATEGORIES.find(c => c.id === data.category);
  const priceText = (() => {
    const a = +data.budgetMin || 0;
    const b = +data.budgetMax || 0;
    if (!a && !b) return 'A convenir';
    if (a && !b) return `Desde $${a}`;
    if (!a && b) return `Hasta $${b}`;
    return `$${a}–$${b}`;
  })();

  return (
    <div className="step-grid">
      <div className="rail">
        <h1>Revisa y publica</h1>
        <p className="subtitle">Así se verá tu publicación. Si algo no está bien, regresa con el botón Atrás.</p>
      </div>
      <div>
        <div className="field">
          <span className="field-label">Vista previa</span>
          <div className={'preview-card' + (data.urgent ? ' urgent' : '')}>
            <div className="cover">
              <span className="badge-solicito">{data.urgent ? '⚡ Urgente · Solicito' : 'Solicito'}</span>
            </div>
            <div className="body">
              <h3>{data.title || 'Tu título aparecerá aquí'}</h3>
              <div className="price-row">
                <span className="label">Presupuesto</span>
                <span className="amount">{priceText}</span>
              </div>
              {cat && <span className="tag">{cat.title}</span>}
              <p className="preview-desc">{data.description || 'Tu descripción aparecerá aquí.'}</p>
              <div className="zones">
                {data.zones.length === 0
                  ? <span className="z">Sin zonas</span>
                  : data.zones.slice(0, 4).map(z => <span key={z} className="z">{z}</span>)
                }
                {data.zones.length > 4 && <span className="z">+{data.zones.length - 4}</span>}
              </div>
            </div>
          </div>
          <div className="preview-note">
            <Icon name="info" /> Así se verá tu publicación en el feed.
          </div>
        </div>

        <div className="field">
          <span className="field-label">Antes de publicar, confirma</span>
          <div style={{ display: 'grid', gap: 10 }}>
            {CONFIRMATIONS.map(c => (
              <div
                key={c.id}
                className={'check-card' + (data.confirms[c.id] ? ' selected' : '')}
                onClick={() => set({ confirms: { ...data.confirms, [c.id]: !data.confirms[c.id] } })}
              >
                <div className="box"><Icon name="check" /></div>
                <div className="body">
                  <strong>{c.title}</strong>
                  <p>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="footer-note">
          Al publicar, tu anuncio queda activo por <b>30 días</b>. Si pasa ese tiempo sin interacción se pausa automáticamente y puedes reactivarlo cuando quieras desde <b>“Mis publicaciones”</b>.
        </div>
      </div>
    </div>
  );
}

window.WizardSteps = { Step1, Step2, Step3, CATEGORIES, MODALITIES, Icon };
