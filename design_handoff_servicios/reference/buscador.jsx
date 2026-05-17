/* Buscador Servicios — overlay (móvil + desktop) y resultados */

function SearchHighlight({ text, hl }) {
  const idx = text.toLowerCase().indexOf(hl.toLowerCase());
  if (idx < 0) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-sky-100 text-sky-900 font-bold px-0.5 rounded">{text.slice(idx, idx + hl.length)}</mark>
      {text.slice(idx + hl.length)}
    </span>
  );
}

function SuggestionRow({ icon, label, sub, hl, kind }) {
  return (
    <div className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center gap-3 group">
      <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center shrink-0 group-hover:bg-sky-50 group-hover:text-sky-700 transition">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-semibold text-slate-900 truncate">
          {hl ? <SearchHighlight text={label} hl={hl} /> : label}
        </div>
        {sub && <div className="text-[11px] text-slate-500 truncate">{sub}</div>}
      </div>
      {kind && <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{kind}</span>}
    </div>
  );
}

function SuggestionGroup({ title, icon, children }) {
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

/* ============================ BUSCADOR MOBILE (empty) ============================ */
function BuscadorMobileEmpty() {
  return (
    <div className="w-[375px] bg-white" style={{ minHeight: 812 }}>
      {/* Search bar at top (replaces navbar in fullscreen overlay) */}
      <div className="bg-blue-600 px-3 pt-2.5 pb-3 flex items-center gap-2">
        <button className="text-white w-8 h-8 grid place-items-center"><I.chevL size={18}/></button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-white text-slate-900">
          <I.search size={14} className="text-slate-400"/>
          <span className="flex-1 text-[13px] text-slate-400 font-medium">Buscar servicios…</span>
          <button className="text-slate-400"><I.x size={14}/></button>
        </div>
      </div>

      {/* Searches recientes */}
      <div className="py-3">
        <div className="px-4 mb-2 flex items-center justify-between">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <I.history size={11}/> Búsquedas recientes
          </div>
          <button className="text-[11px] font-bold text-sky-700">Borrar todo</button>
        </div>
        <div className="px-4 flex flex-wrap gap-1.5">
          {['plomero', 'mesero', 'mariscos', 'fotógrafo bodas', 'mecánico'].map((t) => (
            <Chip key={t} removable>{t}</Chip>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100"></div>

      {/* Populares en Peñasco */}
      <div className="py-3">
        <div className="px-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <I.trending size={11}/> Populares en Peñasco
        </div>
        <div className="px-4 flex flex-wrap gap-1.5">
          {['plomería 24h', 'electricista', 'limpieza', 'niñera', 'jardinero', 'reparación A/C', 'cocinero', 'chofer', 'tutor inglés', 'estilista'].map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100"></div>

      {/* Categorías rápidas */}
      <div className="py-3">
        <div className="px-4 mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Categorías</div>
        <div className="grid grid-cols-2 gap-px bg-slate-100">
          {[
            { i: <I.tool size={16}/>, l: 'Hogar y reparaciones', n: '128' },
            { i: <I.briefcase size={16}/>, l: 'Empleos', n: '64' },
            { i: <I.image size={16}/>, l: 'Eventos y foto', n: '47' },
            { i: <I.user size={16}/>, l: 'Cuidado personal', n: '38' },
            { i: <I.calendar size={16}/>, l: 'Profesionales', n: '92' },
            { i: <I.globe size={16}/>, l: 'Remoto', n: '54' },
          ].map((c) => (
            <div key={c.l} className="bg-white px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-700 grid place-items-center">{c.i}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-slate-900 truncate">{c.l}</div>
                <div className="text-[11px] text-slate-500">{c.n} publicados</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.BuscadorMobileEmpty = BuscadorMobileEmpty;

/* ============================ BUSCADOR MOBILE (query) ============================ */
function BuscadorMobileQuery() {
  const q = 'plom';
  return (
    <div className="w-[375px] bg-white" style={{ minHeight: 812 }}>
      <div className="bg-blue-600 px-3 pt-2.5 pb-3 flex items-center gap-2">
        <button className="text-white w-8 h-8 grid place-items-center"><I.chevL size={18}/></button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-white text-slate-900">
          <I.search size={14} className="text-slate-400"/>
          <span className="flex-1 text-[13px] text-slate-900 font-medium">{q}<span className="inline-block w-px h-3.5 bg-sky-600 align-middle ml-0.5 animate-pulse"></span></span>
          <button className="text-slate-400"><I.x size={14}/></button>
        </div>
      </div>

      <SuggestionGroup title="Servicios" icon={<I.tool size={11}/>}>
        <SuggestionRow icon={<I.tool size={16}/>} label="Plomería residencial 24 horas" sub="32 prestadores en Peñasco" hl={q} kind="Servicio" />
        <SuggestionRow icon={<I.tool size={16}/>} label="Plomero para emergencias" sub="12 prestadores · cerca de ti" hl={q} kind="Servicio" />
        <SuggestionRow icon={<I.tool size={16}/>} label="Plomería de gas y calentadores" sub="8 prestadores" hl={q} kind="Servicio" />
      </SuggestionGroup>

      <div className="border-t border-slate-100"></div>

      <SuggestionGroup title="Empleos" icon={<I.briefcase size={11}/>}>
        <SuggestionRow icon={<I.briefcase size={16}/>} label="Ayudante de plomería" sub="3 vacantes activas" hl={q} kind="Empleo" />
      </SuggestionGroup>

      <div className="border-t border-slate-100"></div>

      <SuggestionGroup title="Personas" icon={<I.user size={11}/>}>
        <SuggestionRow icon={<div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white text-[11px] font-extrabold">JR</div>} label="Javier R. — Plomero (4.9 ★)" sub="Centro · Responde en ~2h" hl={q} kind="Persona" />
        <SuggestionRow icon={<div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-700 grid place-items-center text-white text-[11px] font-extrabold">EP</div>} label="Esteban P. — Plomero (4.7 ★)" sub="Las Conchas · Disponible" hl={q} kind="Persona" />
      </SuggestionGroup>

      <div className="px-4 py-3 border-t border-slate-100">
        <button className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-[13px] flex items-center justify-center gap-2">
          Ver todos los resultados para "{q}" <I.arrowR size={13}/>
        </button>
      </div>
    </div>
  );
}
window.BuscadorMobileQuery = BuscadorMobileQuery;

/* ============================ BUSCADOR DESKTOP (overlay) ============================ */
function BuscadorDesktop() {
  const q = 'plom';
  return (
    <div className="bg-slate-900 w-[1440px] relative" style={{ minHeight: 820 }}>
      <GlobalNavbar width={1440}/>

      {/* dim overlay */}
      <div className="absolute inset-0 top-[72px] bg-slate-900/55 backdrop-blur-sm"></div>

      {/* search input highlight (showing it's active) */}
      <div className="relative -mt-[60px] z-20">
        <div className="max-w-[1440px] mx-auto flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white shadow-xl ring-4 ring-white/30 w-[500px]">
            <I.search size={16} className="text-sky-600"/>
            <span className="flex-1 text-[14px] text-slate-900 font-semibold">{q}<span className="inline-block w-px h-4 bg-sky-600 align-middle ml-0.5 animate-pulse"></span></span>
            <kbd className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5 py-0.5 border border-slate-200 rounded">esc</kbd>
          </div>
        </div>
      </div>

      {/* dropdown */}
      <div className="relative z-20 mt-3 flex justify-center">
        <div className="w-[600px] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <SuggestionGroup title="Servicios — 3 sugerencias" icon={<I.tool size={11}/>}>
            <SuggestionRow icon={<I.tool size={16}/>} label="Plomería residencial 24 horas" sub="32 prestadores en Peñasco" hl={q} kind="Servicio" />
            <SuggestionRow icon={<I.tool size={16}/>} label="Plomero para emergencias" sub="12 prestadores · cerca de ti" hl={q} kind="Servicio" />
            <SuggestionRow icon={<I.tool size={16}/>} label="Plomería de gas y calentadores" sub="8 prestadores" hl={q} kind="Servicio" />
          </SuggestionGroup>
          <div className="border-t border-slate-100"></div>
          <SuggestionGroup title="Empleos — 1 vacante" icon={<I.briefcase size={11}/>}>
            <SuggestionRow icon={<I.briefcase size={16}/>} label="Ayudante de plomería" sub="Constructora Peñasco · $7,500/mes" hl={q} kind="Empleo" />
          </SuggestionGroup>
          <div className="border-t border-slate-100"></div>
          <SuggestionGroup title="Personas — 2 perfiles" icon={<I.user size={11}/>}>
            <SuggestionRow icon={<div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white text-[11px] font-extrabold">JR</div>} label="Javier R. — Plomero (4.9 ★)" sub="Centro · Responde en ~2h" hl={q} kind="Persona" />
            <SuggestionRow icon={<div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-700 grid place-items-center text-white text-[11px] font-extrabold">EP</div>} label="Esteban P. — Plomero (4.7 ★)" sub="Las Conchas · Disponible" hl={q} kind="Persona" />
          </SuggestionGroup>
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 flex items-center justify-between">
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700">↵</kbd> abrir</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700">↑↓</kbd> navegar</span>
            </div>
            <button className="text-[12px] font-bold text-sky-700 flex items-center gap-1">
              Ver todos los resultados <I.arrowR size={12}/>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
window.BuscadorDesktop = BuscadorDesktop;

/* ============================ RESULTADOS DESKTOP ============================ */
function ResultadosDesktop() {
  return (
    <div className="bg-slate-100 w-[1440px]" style={{ minHeight: 980 }}>
      <GlobalNavbar width={1440}/>
      <div className="max-w-[1320px] mx-auto px-8 py-5">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 mb-3">
          <span>Servicios</span><I.chevR size={10}/>
          <span>Buscar</span><I.chevR size={10}/>
          <span className="text-slate-900">"plomero"</span>
        </div>
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900">
            Resultados para "<span className="text-sky-700">plomero</span>"
          </h1>
          <div className="text-[12px] font-semibold text-slate-500">28 servicios · 1 empleo · 5 personas</div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-sb">
          <Chip active>Todos · 34</Chip>
          <Chip>Servicios · 28</Chip>
          <Chip>Empleos · 1</Chip>
          <Chip>Personas · 5</Chip>
          <span className="mx-2 h-5 w-px bg-slate-300"></span>
          <Chip>Presencial</Chip>
          <Chip dot>5 km</Chip>
          <Chip>$ — $500</Chip>
        </div>

        <div className="mt-5 grid grid-cols-[260px_1fr] gap-6">
          {/* Filters sidebar */}
          <aside className="rounded-2xl bg-white border border-slate-200 p-4 self-start sticky top-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-extrabold tracking-tight text-slate-900">Filtros</div>
              <button className="text-[11px] font-bold text-sky-700">Limpiar</button>
            </div>

            <FilterBlock title="Modalidad">
              {['Presencial', 'Remoto', 'Híbrido'].map((t, i) => (
                <CheckRow key={t} label={t} checked={i === 0} count={i === 0 ? 22 : i === 1 ? 9 : 3}/>
              ))}
            </FilterBlock>
            <FilterBlock title="Tipo">
              <CheckRow label="Servicio" checked count={28}/>
              <CheckRow label="Empleo" checked count={1}/>
              <CheckRow label="Persona" checked count={5}/>
            </FilterBlock>
            <FilterBlock title="Distancia">
              <div className="px-1">
                <input type="range" defaultValue={30} className="w-full accent-sky-600"/>
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mt-1">
                  <span>1 km</span><span className="text-slate-900 font-bold">5 km</span><span>Toda la ciudad</span>
                </div>
              </div>
            </FilterBlock>
            <FilterBlock title="Rango de precio">
              <div className="flex items-center gap-2">
                <input defaultValue="100" className="flex-1 min-w-0 px-2 py-1.5 rounded border-2 border-slate-300 text-[12px] font-bold"/>
                <span className="text-[10px] text-slate-400">a</span>
                <input defaultValue="500" className="flex-1 min-w-0 px-2 py-1.5 rounded border-2 border-slate-300 text-[12px] font-bold"/>
              </div>
            </FilterBlock>
            <FilterBlock title="Disponibilidad">
              <CheckRow label="Disponible hoy" checked count={12}/>
              <CheckRow label="Esta semana" count={26}/>
              <CheckRow label="Cualquier momento" count={34}/>
            </FilterBlock>
          </aside>

          {/* Grid */}
          <div>
            <div className="grid grid-cols-3 gap-4">
              <CardServicio photo="wrench" avatar="JR" name="Javier R." title="Plomería residencial 24h" price="$350/h" dist="0.8 km · hace 1h" />
              <CardServicio photo="paint" avatar="EP" name="Esteban P." title="Plomero — emergencias y fugas" price="$280/h" dist="2.1 km · hace 4h" />
              <CardServicio photo="cake" avatar="RG" name="Raúl G." title="Plomería de gas y calentadores" price="$1,200" dist="1.4 km · ayer" />
              <CardServicio photo="sun" avatar="LM" name="Luis M." title="Destapado y drenaje" price="$450" dist="3.2 km · hace 2h" />
              <CardVacante logo="CP" empresa="Constructora Peñasco" title="Ayudante de plomería" salario="$7,500/mes" zona="Centro · TC" />
              <CardServicio photo="cam" avatar="HD" name="Héctor D." title="Mantenimiento integral" price="$320/h" dist="4.1 km · hace 1d" />
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              <button className="w-9 h-9 rounded-lg border-2 border-slate-300 text-slate-500"><I.chevL size={14}/></button>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} className={'w-9 h-9 rounded-lg text-[13px] font-bold ' + (n === 1 ? 'bg-sky-600 text-white' : 'border-2 border-slate-300 text-slate-700')}>{n}</button>
              ))}
              <span className="text-slate-400">…</span>
              <button className="w-9 h-9 rounded-lg border-2 border-slate-300 text-slate-700 text-[13px] font-bold">7</button>
              <button className="w-9 h-9 rounded-lg border-2 border-slate-300 text-slate-500"><I.chevR size={14}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.ResultadosDesktop = ResultadosDesktop;

function FilterBlock({ title, children }) {
  return (
    <div className="py-3 border-t border-slate-100 first:border-t-0">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CheckRow({ label, checked, count }) {
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer">
      <span className={'w-4 h-4 rounded border-2 grid place-items-center ' + (checked ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300')}>
        {checked && <I.check size={10} stroke={3}/>}
      </span>
      <span className="text-[13px] font-semibold text-slate-700 flex-1">{label}</span>
      <span className="text-[11px] font-semibold text-slate-400">{count}</span>
    </label>
  );
}

/* ============================ RESULTADOS VACÍO MOBILE ============================ */
function ResultadosVacioMobile() {
  return (
    <div className="bg-slate-100 w-[375px] relative" style={{ minHeight: 812 }}>
      <div className="bg-blue-600 px-3 pt-2.5 pb-3 flex items-center gap-2">
        <button className="text-white w-8 h-8 grid place-items-center"><I.chevL size={18}/></button>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-full bg-white text-slate-900">
          <I.search size={14} className="text-slate-400"/>
          <span className="flex-1 text-[13px] text-slate-900 font-medium">cetrería</span>
          <button className="text-slate-400"><I.x size={14}/></button>
        </div>
      </div>

      <div className="bg-white px-4 py-3 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-sb">
        <Chip active>Todos · 0</Chip>
        <Chip>Servicios</Chip>
        <Chip>Empleos</Chip>
        <Chip>Personas</Chip>
      </div>

      <div className="px-8 py-12 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-sky-50 grid place-items-center mb-4">
          <I.search size={28} className="text-sky-600"/>
        </div>
        <div className="text-[18px] font-extrabold tracking-tight text-slate-900">Sin resultados para "cetrería"</div>
        <p className="mt-2 text-[13px] text-slate-600 leading-relaxed">
          Prueba con menos filtros o usa palabras más generales. Si nadie lo ofrece, sé tú quien lo publique.
        </p>
        <div className="mt-5 w-full space-y-2">
          <button className="w-full py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/40 flex items-center justify-center gap-2">
            <I.plus size={14}/> Publicar mi solicitud
          </button>
          <button className="w-full py-3 rounded-full border-2 border-slate-300 text-slate-700 font-bold text-[13px]">
            Limpiar filtros
          </button>
        </div>

        <div className="mt-8 w-full text-left">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Quizás te interese</div>
          <div className="flex flex-wrap gap-1.5">
            {['adiestramiento canino', 'control de plagas', 'jardinería'].map((t) => <Chip key={t}>{t}</Chip>)}
          </div>
        </div>
      </div>
    </div>
  );
}
window.ResultadosVacioMobile = ResultadosVacioMobile;
