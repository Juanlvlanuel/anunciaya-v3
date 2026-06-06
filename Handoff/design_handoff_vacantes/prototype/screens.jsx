/* global React, ReactDOM, VacantesLayout */
const { useState } = React;
const { Icon, Shell } = window.VacantesLayout;

/* ============================================================
   Sample data — schema fiel a `servicios_publicaciones`
   ============================================================ */
const VACANCIES = [
  {
    id: 'v1',
    titulo: 'Diseñador gráfico',
    sucursal: 'Matriz',
    tipoEmpleo: 'tiempo-completo',
    modalidad: 'hibrido',
    precio: { kind: 'rango', min: 12000, max: 18000, moneda: 'MXN' },
    descripcion: 'Diseñador con experiencia en branding, diseño editorial y comunicación visual para clientes locales. Trabajarás de la mano con el equipo de impresión para entregar piezas listas para producción.',
    requisitos: [
      'Manejo avanzado de Adobe Illustrator y Photoshop',
      'Portafolio comprobable (piezas impresas y digitales)',
      'Experiencia mínima 2 años en diseño gráfico',
      'Atención al detalle y manejo de tipografía',
    ],
    beneficios: [
      'Prestaciones de ley + aguinaldo',
      'Equipo de cómputo asignado',
      '2 días home office por semana',
      'Bonos por proyectos especiales',
    ],
    horario: '9:00 a 18:00',
    diasSemana: ['lun', 'mar', 'mie', 'jue', 'vie'],
    estado: 'activa',
    expiraDays: 26,
    totalVistas: 142,
    totalMensajes: 14,
    totalGuardados: 8,
  },
  {
    id: 'v2',
    titulo: 'Operador de máquina offset',
    sucursal: 'Sucursal Norte',
    tipoEmpleo: 'tiempo-completo',
    modalidad: 'presencial',
    precio: { kind: 'rango', min: 9000, max: 12000, moneda: 'MXN' },
    descripcion: 'Operador con experiencia en offset, mantenimiento básico y control de calidad.',
    requisitos: ['Experiencia mínima 1 año en imprenta', 'Disponibilidad de horario'],
    beneficios: ['Prestaciones de ley', 'Aguinaldo'],
    horario: '8:00 a 17:00',
    diasSemana: ['lun', 'mar', 'mie', 'jue', 'vie', 'sab'],
    estado: 'activa',
    expiraDays: 22,
    totalVistas: 88,
    totalMensajes: 6,
    totalGuardados: 3,
  },
  {
    id: 'v3',
    titulo: 'Vendedor de mostrador',
    sucursal: 'Matriz',
    tipoEmpleo: 'medio-tiempo',
    modalidad: 'presencial',
    precio: { kind: 'hora', monto: 80 },
    descripcion: 'Atender a clientes en mostrador, levantar pedidos y dar cotizaciones.',
    requisitos: ['Atención al cliente', 'Manejo de caja básico'],
    beneficios: ['Comisiones por venta', 'Aguinaldo'],
    horario: '14:00 a 19:00',
    diasSemana: ['lun', 'mar', 'mie', 'jue', 'vie'],
    estado: 'activa',
    expiraDays: 4,
    totalVistas: 54,
    totalMensajes: 3,
    totalGuardados: 1,
  },
  {
    id: 'v4',
    titulo: 'Repartidor — moto propia',
    sucursal: 'Matriz',
    tipoEmpleo: 'por-proyecto',
    modalidad: 'presencial',
    precio: { kind: 'fijo', monto: 35 },
    descripcion: 'Entrega de paquetería local. Pago por entrega.',
    requisitos: ['Licencia vigente', 'Moto propia'],
    beneficios: [],
    horario: null,
    diasSemana: [],
    estado: 'pausada',
    expiraDays: 21,
    totalVistas: 31,
    totalMensajes: 2,
    totalGuardados: 0,
  },
  {
    id: 'v5',
    titulo: 'Community manager',
    sucursal: 'Matriz',
    tipoEmpleo: 'medio-tiempo',
    modalidad: 'remoto',
    precio: { kind: 'mensual', monto: 7000 },
    descripcion: 'Manejo de redes sociales, calendario de contenido y atención a comentarios.',
    requisitos: ['Manejo de Instagram y Facebook', 'Redacción'],
    beneficios: ['100% remoto', 'Horario flexible'],
    horario: 'Flexible',
    diasSemana: ['lun', 'mar', 'mie', 'jue', 'vie'],
    estado: 'cerrada',
    expiraDays: 0,
    totalVistas: 198,
    totalMensajes: 21,
    totalGuardados: 14,
  },
];

/* ============================================================
   Helpers
   ============================================================ */
const TIPO_LABEL = {
  'tiempo-completo': 'Tiempo completo',
  'medio-tiempo':    'Medio tiempo',
  'por-proyecto':    'Por proyecto',
  'eventual':        'Eventual',
};
const TIPO_KEY = {
  'tiempo-completo': 'tc',
  'medio-tiempo':    'mt',
  'por-proyecto':    'pp',
  'eventual':        'pp',
};
const MOD_LABEL = {
  presencial: 'Presencial',
  remoto:     'Remoto',
  hibrido:    'Híbrido',
};
const MOD_KEY = { presencial: 'pres', remoto: 'rem', hibrido: 'hib' };
const ESTADO_LABEL = {
  activa:       'Activa',
  pausada:      'Pausada',
  cerrada:      'Cerrada',
  'por-expirar': 'Por expirar',
};

const DIAS = [
  { id: 'lun', label: 'L' },
  { id: 'mar', label: 'M' },
  { id: 'mie', label: 'X' },
  { id: 'jue', label: 'J' },
  { id: 'vie', label: 'V' },
  { id: 'sab', label: 'S' },
  { id: 'dom', label: 'D' },
];
const DIAS_FULL = {
  lun: 'Lun', mar: 'Mar', mie: 'Mié', jue: 'Jue', vie: 'Vie', sab: 'Sáb', dom: 'Dom',
};

function fmtMonto(n) {
  return '$' + n.toLocaleString('es-MX');
}
function formatPrecio(p, tipoEmpleo) {
  switch (p.kind) {
    case 'mensual':    return { main: fmtMonto(p.monto), unit: '/mes' };
    case 'rango':      return { main: `${fmtMonto(p.min)}–${fmtMonto(p.max)}`, unit: '/mes' };
    case 'a-convenir': return { main: 'A convenir', unit: '' };
    case 'hora':       return { main: fmtMonto(p.monto), unit: '/hora' };
    case 'fijo': {
      // texto editorial según contexto del tipo de empleo
      const lbl = tipoEmpleo === 'por-proyecto' ? 'por entrega' : 'por proyecto';
      return { main: fmtMonto(p.monto), unit: lbl };
    }
    default:           return { main: '—', unit: '' };
  }
}
/** UI-derived label — "por-expirar" no existe como estado, se calcula */
function uiEstado(v) {
  if (v.estado === 'activa' && v.expiraDays <= 5) return 'por-expirar';
  return v.estado;
}
function formatDias(diasSemana) {
  if (!diasSemana || diasSemana.length === 0) return null;
  if (diasSemana.length === 7) return 'Todos los días';
  // detect L-V
  const lv = ['lun','mar','mie','jue','vie'];
  if (diasSemana.length === 5 && lv.every(d => diasSemana.includes(d))) return 'L–V';
  return diasSemana.map(d => DIAS_FULL[d]).join(' · ');
}

/* ============================================================
   Building blocks
   ============================================================ */
function PageHead({ stats }) {
  return (
    <div className="page-head">
      <div className="title-row">
        <div className="icon-block"><Icon name="briefcase" size={26} /></div>
        <div>
          <h1>Vacantes</h1>
          <p className="subtitle">Publica y gestiona tus ofertas de empleo</p>
        </div>
      </div>
      <div className="stat-cards">
        {stats.map((s, i) => (
          <div key={i} className={'stat-card ' + s.kind}>
            <div className="ico"><Icon name={s.icon} size={18} /></div>
            <div>
              <div className="num">{s.num}</div>
              <div className="lbl">{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipoPill({ tipoEmpleo }) {
  return <span className={'pill tipo-' + TIPO_KEY[tipoEmpleo]}>{TIPO_LABEL[tipoEmpleo]}</span>;
}
function ModPill({ modalidad }) {
  return <span className={'pill mod-' + MOD_KEY[modalidad]}>{MOD_LABEL[modalidad]}</span>;
}
function StatusPill({ estado }) {
  return (
    <span className={'status-pill ' + estado}>
      <span className="dot" />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
function PrecioCell({ precio, tipoEmpleo }) {
  const f = formatPrecio(precio, tipoEmpleo);
  return (
    <span className="salary">
      {f.main}{f.unit && <span className="per"> {f.unit}</span>}
    </span>
  );
}

/* ============================================================
   1) EMPTY STATE
   ============================================================ */
function ScreenEmpty() {
  return (
    <Shell>
      <PageHead stats={[
        { kind: 'blue',   icon: 'briefcase', num: 0, lbl: 'Total' },
        { kind: 'green',  icon: 'check',     num: 0, lbl: 'Activas' },
        { kind: 'amber',  icon: 'clock',     num: 0, lbl: 'Por expirar' },
        { kind: 'purple', icon: 'chat',      num: 0, lbl: 'Conversaciones' },
      ]} />

      <div className="empty">
        <div className="blob"><Icon name="briefcase" size={42} /></div>
        <h2>Aún no tienes vacantes publicadas</h2>
        <p>Publica tu primera oferta de empleo y aparecerá en la sección <b>Servicios</b> de AnunciaYA para que los vecinos de Puerto Peñasco puedan contactarte directamente.</p>
        <button className="btn btn-primary" style={{ padding: '13px 22px', fontSize: 15 }}>
          <Icon name="plus" size={18} /> Publicar primera vacante
        </button>

        <div className="tips-grid">
          <div className="tip">
            <div className="head"><span className="num">1</span> Alcance local</div>
            <p>Tus vacantes solo se muestran a usuarios en Puerto Peñasco.</p>
          </div>
          <div className="tip">
            <div className="head"><span className="num">2</span> Contacto directo</div>
            <p>Los candidatos te escriben por ChatYA o WhatsApp.</p>
          </div>
          <div className="tip">
            <div className="head"><span className="num">3</span> Sin comisiones</div>
            <p>Publicar vacantes está incluido en tu membresía AnunciaYA.</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   2) LIST VIEW
   ============================================================ */
function ListContent({ tab = 'todas', setTab = () => {} }) {
  const filtered = VACANCIES.filter(v => {
    if (tab === 'todas')    return true;
    if (tab === 'activas')  return v.estado === 'activa';
    if (tab === 'pausadas') return v.estado === 'pausada';
    if (tab === 'cerradas') return v.estado === 'cerrada';
    return true;
  });
  const totalConversaciones = VACANCIES.reduce((s, v) => s + v.totalMensajes, 0);
  const totalActivas        = VACANCIES.filter(v => v.estado === 'activa').length;
  const totalPorExpirar     = VACANCIES.filter(v => uiEstado(v) === 'por-expirar').length;

  return (
    <>
      <PageHead stats={[
        { kind: 'blue',   icon: 'briefcase', num: VACANCIES.length,  lbl: 'Total' },
        { kind: 'green',  icon: 'check',     num: totalActivas,      lbl: 'Activas' },
        { kind: 'amber',  icon: 'clock',     num: totalPorExpirar,   lbl: 'Por expirar' },
        { kind: 'purple', icon: 'chat',      num: totalConversaciones, lbl: 'Conversaciones' },
      ]} />

      <div className="toolbar">
        <button className={'tab-pill' + (tab === 'todas'    ? ' on' : '')} onClick={() => setTab('todas')}>Todas</button>
        <button className={'tab-pill' + (tab === 'activas'  ? ' on' : '')} onClick={() => setTab('activas')}>Activas</button>
        <button className={'tab-pill' + (tab === 'pausadas' ? ' on' : '')} onClick={() => setTab('pausadas')}>Pausadas</button>
        <button className={'tab-pill' + (tab === 'cerradas' ? ' on' : '')} onClick={() => setTab('cerradas')}>Cerradas</button>
        <div className="search">
          <Icon name="search" size={16} />
          <input placeholder="Buscar vacante..." />
        </div>
        <button className="btn btn-dark">
          <Icon name="plus" size={16} /> Nueva vacante
        </button>
      </div>

      <div className="table-card">
        <div className="table-head">
          <span>Vacante</span>
          <span>Tipo</span>
          <span>Modalidad</span>
          <span>Salario</span>
          <span>Conversaciones</span>
          <span>Estado</span>
          <span>Vigencia</span>
          <span style={{ textAlign: 'right' }}>Acciones</span>
        </div>
        {filtered.map(v => {
          const est = uiEstado(v);
          return (
            <div key={v.id} className="table-row">
              <div className="vac-cell">
                <div className="ico"><Icon name="briefcase" size={18} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="name">{v.titulo}</div>
                  <div className="sub"><Icon name="pin" size={12} /> {v.sucursal}</div>
                </div>
              </div>
              <TipoPill tipoEmpleo={v.tipoEmpleo} />
              <ModPill modalidad={v.modalidad} />
              <PrecioCell precio={v.precio} tipoEmpleo={v.tipoEmpleo} />
              <span className="postul-count">{v.totalMensajes}</span>
              <StatusPill estado={est} />
              <span className="vigencia">
                {v.estado === 'cerrada' ? 'Cerrada' : `${v.expiraDays}d restantes`}
                <span className="left">
                  {v.estado === 'cerrada' ? '30 Abr · cerrada' : 'auto-pausa al expirar'}
                </span>
              </span>
              <div className="actions">
                <button className="icon-action" title="Ver"><Icon name="eye" size={15} /></button>
                <button className="icon-action" title="Editar"><Icon name="edit" size={15} /></button>
                <button className="icon-action" title={v.estado === 'pausada' ? 'Reactivar' : 'Pausar'}>
                  <Icon name="power" size={15} />
                </button>
                <button className="icon-action danger" title="Eliminar"><Icon name="trash" size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ScreenList() {
  const [tab, setTab] = useState('todas');
  return <Shell><ListContent tab={tab} setTab={setTab} /></Shell>;
}

/* ============================================================
   3) DETAIL — sin lista de candidatos, con Actividad + Acciones
   ============================================================ */
function ScreenDetail() {
  const v = VACANCIES[0]; // Diseñador gráfico
  const est = uiEstado(v);
  const precio = formatPrecio(v.precio, v.tipoEmpleo);
  const diasStr = formatDias(v.diasSemana);

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-ghost" style={{ padding: '8px 14px' }}>
          <Icon name="chev-l" size={16} /> Volver
        </button>
        <span style={{ color: 'var(--slate-500)', fontSize: 14 }}>
          Vacantes <Icon name="chev-r" size={12} /> {v.titulo}
        </span>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="head">
            <div className="sucursal"><Icon name="pin" size={14} /> {v.sucursal} · Puerto Peñasco</div>
            <h2>{v.titulo}</h2>
            <div className="meta">
              <StatusPill estado={est} />
              <TipoPill tipoEmpleo={v.tipoEmpleo} />
              <ModPill modalidad={v.modalidad} />
              <span className="salary" style={{ fontSize: 15 }}>
                {precio.main}{precio.unit && <span className="per"> {precio.unit}</span>}
              </span>
            </div>
          </div>

          <div className="section">
            <h3>Descripción</h3>
            <p>{v.descripcion}</p>
          </div>

          <div className="section">
            <h3>Requisitos</h3>
            <ul>
              {v.requisitos.map((r, i) => (
                <li key={i}><span className="check"><Icon name="check" size={12} stroke={2.4}/></span>{r}</li>
              ))}
            </ul>
          </div>

          {v.beneficios.length > 0 && (
            <div className="section">
              <h3>Beneficios</h3>
              <ul>
                {v.beneficios.map((b, i) => (
                  <li key={i}><span className="check"><Icon name="check" size={12} stroke={2.4}/></span>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {(v.horario || diasStr) && (
            <div className="section">
              <h3>Horario y días</h3>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 14.5, color: 'var(--slate-700)' }}>
                {v.horario && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="clock" size={16} />
                    <span><b style={{ color: 'var(--slate-900)' }}>{v.horario}</b></span>
                  </div>
                )}
                {diasStr && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="doc" size={16} />
                    <span><b style={{ color: 'var(--slate-900)' }}>{diasStr}</b></span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="section" style={{ display: 'flex', gap: 8, paddingTop: 18, alignItems: 'center' }}>
            <button className="btn btn-ghost"><Icon name="edit" size={15} /> Editar</button>
            <button className="btn btn-ghost">
              <Icon name="power" size={15} />
              {v.estado === 'pausada' ? 'Reactivar' : 'Pausar'}
            </button>
            <button className="btn btn-danger" style={{ marginLeft: 'auto' }}>
              <Icon name="x" size={15} /> Cerrar vacante
            </button>
          </div>
        </div>

        <div>
          {/* Card 1 — Actividad */}
          <div className="side-card">
            <div className="head">
              <h3>Actividad</h3>
            </div>
            <div className="body">
              <div className="activity-item">
                <div className="ic"><Icon name="eye" size={18} /></div>
                <div>
                  <div className="num">{v.totalVistas}</div>
                  <div className="lbl">Vistas totales</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="ic"><Icon name="chat" size={18} /></div>
                <div>
                  <div className="num">{v.totalMensajes}</div>
                  <div className="lbl">
                    Conversaciones iniciadas
                    <small>Candidatos que te escribieron</small>
                  </div>
                </div>
              </div>
              <div className="activity-item">
                <div className="ic"><Icon name="bookmark" size={18} /></div>
                <div>
                  <div className="num">{v.totalGuardados}</div>
                  <div className="lbl">Guardados</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 — Acciones rápidas */}
          <div className="side-card">
            <div className="head">
              <h3>Acciones rápidas</h3>
            </div>
            <button className="quick-action">
              <span className="ic"><Icon name="chat" size={18} /></span>
              <span className="body">
                <strong>Ver mis conversaciones</strong>
                <span className="sub">Abre ChatYA con candidatos de esta vacante</span>
              </span>
              <Icon name="chev-r" size={16} />
            </button>
            <button className="quick-action">
              <span className="ic"><Icon name="eye" size={18} /></span>
              <span className="body">
                <strong>Ver en feed público</strong>
                <span className="sub">Cómo se ve tu vacante en Servicios</span>
              </span>
              <Icon name="chev-r" size={16} />
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ============================================================
   4) NEW VACANCY FORM
   ============================================================ */
function ScreenForm() {
  const [tipoEmpleo, setTipoEmpleo] = useState('tiempo-completo');
  const [modalidad, setModalidad]   = useState('hibrido');
  const [aConvenir, setAConvenir]   = useState(false);
  // unidad: 'mes-rango' | 'mes-fijo' | 'hora' | 'proyecto'
  const [unidad, setUnidad]         = useState('mes-rango');
  const [requisitos, setRequisitos] = useState(['Adobe Illustrator', 'Adobe Photoshop']);
  const [beneficios, setBeneficios] = useState(['Prestaciones de ley', 'Aguinaldo']);
  const [dias, setDias] = useState(['lun', 'mar', 'mie', 'jue', 'vie']);
  const [confirms, setConfirms] = useState({ real: false, legal: false, coord: false });
  const allConfirmed = Object.values(confirms).every(Boolean);

  const toggleDay = (id) => setDias(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id]);

  // Auto-sugiere unidad cuando cambia tipoEmpleo
  const onTipoChange = (t) => {
    setTipoEmpleo(t);
    if (t === 'por-proyecto') setUnidad('proyecto');
    else if (t === 'eventual') setUnidad('hora');
    else setUnidad('mes-rango');
  };
  const showMax = unidad === 'mes-rango';
  const montoLabel = unidad === 'mes-rango' ? 'Mínimo' : 'Monto';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <div className="list-behind">
        <Shell>
          <ListContent />
        </Shell>
      </div>
      <div className="slideover-backdrop" />
      <aside className="slideover" role="dialog" aria-labelledby="new-vacancy-title">
        <div className="head">
          <div className="ic"><Icon name="briefcase" size={22} /></div>
          <div>
            <h2 id="new-vacancy-title">Nueva vacante</h2>
            <p>Publícala y aparecerá en la sección Servicios de AnunciaYA.</p>
          </div>
          <button className="close" aria-label="Cerrar"><Icon name="x" size={16} /></button>
        </div>

        <div className="body">
          <div className="form-grid">
          <div className="row cols-2">
            <div>
              <label className="field-label">Puesto <span className="req">*</span></label>
              <input className="input" placeholder="Ej: Diseñador gráfico" defaultValue="Diseñador gráfico" maxLength={80} />
            </div>
            <div>
              <label className="field-label">Sucursal <span className="req">*</span></label>
              <select className="select">
                <option>Matriz · Puerto Peñasco</option>
                <option>Sucursal Norte · Puerto Peñasco</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Tipo de empleo <span className="req">*</span></label>
            <div className="choice-grid cols-4">
              {[
                { id: 'tiempo-completo', label: 'Tiempo completo', desc: '40 hrs / sem' },
                { id: 'medio-tiempo',    label: 'Medio tiempo',    desc: '20 hrs / sem' },
                { id: 'por-proyecto',    label: 'Por proyecto',    desc: 'Plazo definido' },
                { id: 'eventual',        label: 'Eventual',        desc: 'Por evento o turno' },
              ].map(t => (
                <button key={t.id} type="button"
                  className={'choice' + (tipoEmpleo === t.id ? ' on' : '')}
                  onClick={() => onTipoChange(t.id)}>
                  <strong>{t.label}</strong>
                  <span className="desc">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Modalidad <span className="req">*</span></label>
            <div className="choice-grid cols-3">
              {[
                { id: 'presencial', label: 'Presencial', desc: 'En la sucursal' },
                { id: 'remoto',     label: 'Remoto',     desc: 'Desde casa' },
                { id: 'hibrido',    label: 'Híbrido',    desc: 'Mezcla de ambos' },
              ].map(m => (
                <button key={m.id} type="button"
                  className={'choice' + (modalidad === m.id ? ' on' : '')}
                  onClick={() => setModalidad(m.id)}>
                  <strong>{m.label}</strong>
                  <span className="desc">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Salario (MXN)</label>
            <div className="toggle-row">
              <button type="button"
                className={'toggle-switch' + (aConvenir ? ' on' : '')}
                onClick={() => setAConvenir(v => !v)}
                aria-label="Dejar a convenir" />
              <span className="toggle-label">Dejar a convenir</span>
              <span style={{ fontSize: 13, color: 'var(--slate-500)', marginLeft: 8 }}>
                Sin monto público — los candidatos preguntan por chat.
              </span>
            </div>
            {!aConvenir && (
              <>
                <div className={'salary-row' + (showMax ? '' : ' single')}>
                  <div className="input-prefix">
                    <span>$</span>
                    <input className="input" type="number" placeholder={montoLabel}
                      defaultValue={unidad === 'mes-rango' ? 12000 : unidad === 'mes-fijo' ? 15000 : unidad === 'hora' ? 80 : 5000} />
                  </div>
                  {showMax && (
                    <div className="input-prefix">
                      <span>$</span>
                      <input className="input" type="number" placeholder="Máximo" defaultValue={18000} />
                    </div>
                  )}
                  <select className="select" style={{ width: 170 }}
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value)}>
                    <option value="mes-rango">/mes (rango)</option>
                    <option value="mes-fijo">/mes (fijo)</option>
                    <option value="hora">/hora</option>
                    <option value="proyecto">/proyecto</option>
                  </select>
                </div>
                <p className="field-help" style={{ marginTop: 8 }}>
                  {unidad === 'mes-rango' && 'Define el rango salarial mensual.'}
                  {unidad === 'mes-fijo'  && 'Define el sueldo mensual fijo.'}
                  {unidad === 'hora'      && 'Pago por hora trabajada.'}
                  {unidad === 'proyecto'  && 'Pago único al completar el proyecto.'}
                </p>
              </>
            )}
          </div>

          <div>
            <label className="field-label">Descripción <span className="req">*</span></label>
            <textarea className="textarea" rows={4}
              defaultValue="Diseñador con experiencia en branding, diseño editorial y comunicación visual para clientes locales. Trabajarás de la mano con el equipo de impresión para entregar piezas listas para producción." />
          </div>

          <div>
            <label className="field-label">Requisitos · habilidades clave</label>
            <p className="field-help">Agrega 3–20 elementos. Presiona Enter para añadir.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Ej: Adobe Illustrator, Inglés avanzado..." />
              <button className="btn btn-dark">Agregar</button>
            </div>
            <div className="tag-list">
              {requisitos.map(t => (
                <span key={t} className="tag">
                  {t}
                  <button onClick={() => setRequisitos(requisitos.filter(x => x !== t))}>
                    <Icon name="x" size={10} stroke={2.4} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Beneficios <span className="extra" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'var(--slate-500)' }}>(opcional · máx 8)</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Ej: Aguinaldo, 2 días home office, Bonos..." />
              <button className="btn btn-dark">Agregar</button>
            </div>
            <div className="tag-list">
              {beneficios.map(t => (
                <span key={t} className="tag" style={{ background: '#dcfce7', color: 'var(--green-700)', borderColor: '#bbf7d0' }}>
                  {t}
                  <button onClick={() => setBeneficios(beneficios.filter(x => x !== t))} style={{ background: 'var(--green-600)' }}>
                    <Icon name="x" size={10} stroke={2.4} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Horario y días <span className="extra" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: 'var(--slate-500)' }}>(opcional)</span></label>
            <div className="row cols-2">
              <input className="input" placeholder="Ej: L–V 9:00 a 18:00" defaultValue="9:00 a 18:00" maxLength={150} />
              <div className="days-picker">
                {DIAS.map(d => (
                  <button key={d.id} type="button"
                    className={'day-pill' + (dias.includes(d.id) ? ' on' : '')}
                    onClick={() => toggleDay(d.id)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="field-label">Vigencia</label>
            <div className="info-chip">
              <Icon name="clock" size={16} />
              <span>La vacante queda activa por <b>30 días</b>. Al vencer, se auto-pausa y puedes reactivarla con un click.</span>
            </div>
          </div>

          <div>
            <label className="field-label">Confirmaciones legales <span className="req">*</span></label>
            <div className="confirm-list">
              {[
                { id: 'real',  txt: 'Confirmo que esta vacante es real y vigente.' },
                { id: 'legal', txt: 'Acepto que el contenido cumple con las leyes locales y los términos de AnunciaYA.' },
                { id: 'coord', txt: 'Entiendo que el contacto con candidatos se coordina entre las partes; AnunciaYA solo conecta.' },
              ].map(c => (
                <div key={c.id}
                  className={'confirm-card' + (confirms[c.id] ? ' on' : '')}
                  onClick={() => setConfirms(s => ({ ...s, [c.id]: !s[c.id] }))}>
                  <div className="box"><Icon name="check" size={14} stroke={2.6} /></div>
                  <div className="txt">{c.txt}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>

        <div className="footer">
          <div className="left" />
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost">Cancelar</button>
            <button className="btn btn-primary" disabled={!allConfirmed}>
              <Icon name="sparkles" size={16} /> Publicar vacante
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ============================================================
   5) MOBILE view
   ============================================================ */
function ScreenMobile() {
  return (
    <div className="stage stage-mobile">
      <div className="phone">
        <div className="status-bar"><span>9:41</span><span>● ● ●</span></div>
        <div className="m-topbar">
          <button className="back"><Icon name="chev-l" size={16} /></button>
          <div className="biz">
            <strong>Imprenta FindUS</strong>
            <span>Matriz</span>
          </div>
          <span className="crumb">Vacantes</span>
        </div>
        <div className="m-body">
          <div className="m-head">
            <div className="ic"><Icon name="briefcase" size={18} /></div>
            <div>
              <h1>Vacantes</h1>
              <p className="sub">5 publicadas · 46 conversaciones</p>
            </div>
          </div>

          <div className="m-stats">
            <div className="stat-card green">
              <div className="ico"><Icon name="check" size={16} /></div>
              <div><div className="num">3</div><div className="lbl">Activas</div></div>
            </div>
            <div className="stat-card purple">
              <div className="ico"><Icon name="chat" size={16} /></div>
              <div><div className="num">46</div><div className="lbl">Conversaciones</div></div>
            </div>
          </div>

          <div className="m-tabs">
            <button className="tab-pill on">Todas</button>
            <button className="tab-pill">Activas</button>
            <button className="tab-pill">Cerradas</button>
          </div>

          {VACANCIES.slice(0, 4).map(v => {
            const est = uiEstado(v);
            return (
              <div key={v.id} className="m-card">
                <div className="row1">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="name">{v.titulo}</div>
                    <div className="sub"><Icon name="pin" size={11} /> {v.sucursal}</div>
                  </div>
                  <StatusPill estado={est} />
                </div>
                <div className="pills-row">
                  <TipoPill tipoEmpleo={v.tipoEmpleo} />
                  <ModPill modalidad={v.modalidad} />
                </div>
                <div className="info-row">
                  <PrecioCell precio={v.precio} tipoEmpleo={v.tipoEmpleo} />
                  <span className="postul">
                    <Icon name="chat" size={12} /> {v.totalMensajes}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <button className="fab" style={{ position: 'absolute' }}>
          <Icon name="plus" size={22} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Canvas
   ============================================================ */
const App = () => {
  const { DesignCanvas, DCSection, DCArtboard } = window;
  return (
    <DesignCanvas
      initialZoom={0.55}
      title="Vacantes — BusinessStudio"
      subtitle="4 pantallas alineadas con la BD real · sin postulaciones formales · ChatYA como canal"
    >
      <DCSection id="desktop" title="Desktop" subtitle="Coherente con Promociones, Empleados y Sucursales">
        <DCArtboard id="empty"  label="A · Estado vacío"     width={1440} height={820}><ScreenEmpty /></DCArtboard>
        <DCArtboard id="list"   label="B · Gestión (lista)"  width={1440} height={820}><ScreenList /></DCArtboard>
        <DCArtboard id="detail" label="C · Detalle · Actividad + Acciones rápidas" width={1440} height={1100}><ScreenDetail /></DCArtboard>
        <DCArtboard id="form"   label="D · Nueva vacante (slideover desde la derecha)" width={1440} height={920}><ScreenForm /></DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="Móvil" subtitle="Vista compacta en marco de teléfono · 390 px">
        <DCArtboard id="m-list" label="E · Vacantes móvil" width={460} height={820}><ScreenMobile /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
