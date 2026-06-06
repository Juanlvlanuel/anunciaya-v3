/* Feed Servicios — mobile + desktop variants */

function FeedFiltersRow() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-sb">
      <Chip active>
        <I.filter size={12} /> Todos
      </Chip>
      <Chip>Presencial</Chip>
      <Chip>Remoto</Chip>
      <Chip>Híbrido</Chip>
      <Chip>Servicio</Chip>
      <Chip>Empleo</Chip>
      <Chip>1 km</Chip>
      <Chip>5 km</Chip>
      <Chip>Toda la ciudad</Chip>
      <Chip>$ — $$$</Chip>
    </div>
  );
}

function SectionTitle({ children, count, action }) {
  return (
    <div className="flex items-end justify-between mb-2">
      <div>
        <div className="text-[17px] font-extrabold tracking-tight text-slate-900">{children}</div>
      </div>
      <div className="flex items-center gap-3">
        {count != null && <span className="text-[12px] font-semibold text-slate-500">{count}</span>}
        {action && (
          <button className="text-[12px] font-semibold text-sky-700 flex items-center gap-1">
            {action} <I.chevR size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================ FEED MOBILE =============================== */
function FeedMobile() {
  return (
    <div className="bg-slate-100 w-[375px] relative" style={{ minHeight: 812 }}>
      <MobileNavbar width={375} />
      {/* Sticky header */}
      <ServiciosHeaderMobile subtitle="Encuentra personas que ayudan" />
      {/* Sticky toggle */}
      <div className="px-4 -mt-3 relative z-10">
        <div className="bg-white rounded-2xl p-1.5 shadow-md border border-slate-200">
          <OfreceToggle value="ofrezco" />
        </div>
      </div>

      <div className="px-4 mt-4">
        <FeedFiltersRow />
      </div>

      {/* Recién publicado */}
      <div className="mt-5">
        <div className="px-4">
          <SectionTitle action="Ver todo">Recién publicado</SectionTitle>
        </div>
        <div className="flex gap-3 overflow-x-auto no-sb px-4 pb-2">
          <CardHorizontal photo="paint" title="Pintura interior y exterior" price="$2,800/cuarto" meta="Presencial · hace 1h" />
          <CardHorizontal photo="code" title="Diseño de páginas web locales" price="$4,500" meta="Remoto · hace 2h" />
          <CardHorizontal photo="cake" title="Pastelería para eventos" price="A convenir" meta="Presencial · hace 3h" />
        </div>
      </div>

      {/* Cerca de ti */}
      <div className="mt-5 px-4">
        <SectionTitle count="32 resultados">Cerca de ti</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <CardServicio photo="wrench" avatar="JR" name="Javier R." title="Plomería 24h" price="$350/h" dist="0.8 km · hace 1h" />
          <CardVacante logo="RA" empresa="Rest. Aurora" title="Mesero turno noche" salario="$8,500/mes" zona="Centro" />
          <CardSolicito icon="image" title="Busco: fotógrafo boda" presupuesto="$4,000" zona="Las Conchas" who="Ana T." />
          <CardServicio photo="cam" avatar="MR" name="María R." title="Fotografía de eventos" price="$1,800" dist="2.4 km · hace 5h" />
          <CardServicio photo="code" avatar="LP" name="Luis P." title="Soporte técnico PC" price="$200/h" dist="1.1 km · hace 6h" />
          <CardVacante logo="MX" empresa="Marisco Express" title="Repartidor moto propia" salario="$9,200/mes" zona="Cholla" />
        </div>
      </div>

      <div className="h-28"></div>

      <FAB />
      <div className="sticky bottom-0">
        <BottomNav />
      </div>
    </div>
  );
}
window.FeedMobile = FeedMobile;

/* ============================ FEED MOBILE — VACÍO ======================== */
function FeedMobileEmpty() {
  return (
    <div className="bg-slate-100 w-[375px] relative" style={{ minHeight: 812 }}>
      <MobileNavbar width={375} />
      <ServiciosHeaderMobile subtitle="Encuentra personas que ayudan" />
      <div className="px-4 -mt-3 relative z-10">
        <div className="bg-white rounded-2xl p-1.5 shadow-md border border-slate-200">
          <OfreceToggle value="solicito" />
        </div>
      </div>
      <div className="px-4 mt-4">
        <FeedFiltersRow />
      </div>

      <div className="mt-12 px-8 flex flex-col items-center text-center">
        <div className="w-24 h-24 mb-5">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <circle cx="60" cy="60" r="48" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 4"/>
            <circle cx="60" cy="60" r="32" fill="#f0f9ff" stroke="#0ea5e9" strokeOpacity=".4" strokeWidth="1"/>
            <g stroke="#0369a1" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M50 64v-6a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v6"/>
              <rect x="46" y="64" width="28" height="14" rx="2"/>
              <path d="M56 54v-4a4 4 0 0 1 8 0v4"/>
            </g>
          </svg>
        </div>
        <div className="text-[18px] font-extrabold tracking-tight text-slate-900">
          Aún nadie en tu zona ofrece esto
        </div>
        <div className="mt-1.5 text-[13px] text-slate-600 leading-relaxed">
          Sé el primero en publicar y aparece arriba en el feed mientras llegan los demás.
        </div>
        <button className="mt-5 px-5 py-2.5 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-md shadow-sky-500/40 flex items-center gap-2">
          <I.plus size={14} /> Publicar lo que ofrezco
        </button>
        <button className="mt-2.5 text-[12px] font-semibold text-slate-500 underline underline-offset-2">
          Limpiar filtros
        </button>
      </div>

      <div className="h-28"></div>
      <div className="sticky bottom-0">
        <BottomNav />
      </div>
    </div>
  );
}
window.FeedMobileEmpty = FeedMobileEmpty;

/* ============================ FEED DESKTOP ============================== */
function FeedDesktop() {
  return (
    <div className="bg-slate-100 w-[1440px]" style={{ minHeight: 980 }}>
      <GlobalNavbar width={1440} />
      <ServiciosHeaderDesktop subtitle="Encuentra personas que ayudan">
        <OfreceToggle value="ofrezco" embedded />
      </ServiciosHeaderDesktop>

      {/* Filters strip */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1320px] mx-auto px-8 py-3 flex items-center justify-between gap-4">
          <FeedFiltersRow />
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
            Orden:
            <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border-2 border-slate-300 text-slate-700">
              Más recientes <I.chevD size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Recién publicado carousel */}
      <div className="max-w-[1320px] mx-auto px-8 mt-6">
        <SectionTitle action="Ver todos">Recién publicado en Peñasco</SectionTitle>
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto no-sb pb-2">
            <CardHorizontal photo="paint" title="Pintura residencial y locales" price="$2,800/cuarto" meta="Presencial · hace 1h" />
            <CardHorizontal photo="code" title="Diseño web para negocios locales" price="$4,500" meta="Remoto · hace 2h" />
            <CardHorizontal photo="cake" title="Pastelería para eventos y XV" price="A convenir" meta="Presencial · hace 3h" />
            <CardHorizontal photo="cam" title="Fotografía de bodas y XV" price="$3,200" meta="Presencial · hace 4h" />
            <CardHorizontal photo="car" title="Lavado de autos a domicilio" price="$180" meta="Presencial · hace 5h" />
            <CardHorizontal photo="wrench" title="Plomería emergencias 24/7" price="$350/h" meta="Presencial · hace 6h" />
          </div>
          <button className="absolute -right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md grid place-items-center text-slate-600">
            <I.chevR size={16} />
          </button>
        </div>
      </div>

      {/* Cerca de ti grid */}
      <div className="max-w-[1320px] mx-auto px-8 mt-8">
        <SectionTitle count="32 resultados · Peñasco">Cerca de ti</SectionTitle>
        <div className="grid grid-cols-4 gap-4">
          <CardServicio photo="wrench" avatar="JR" name="Javier R." title="Plomería residencial 24 horas" price="$350/h" dist="0.8 km · hace 1h" />
          <CardVacante logo="RA" empresa="Restaurante Aurora" title="Mesero(a) turno noche" salario="$8,500/mes" zona="Centro · TC" />
          <CardSolicito icon="image" title="Busco: fotógrafo de boda" presupuesto="$3,500–$5,000" zona="Las Conchas" who="Ana T." />
          <CardServicio photo="cam" avatar="MR" name="María R." title="Fotografía de eventos sociales" price="$1,800" dist="2.4 km · hace 5h" />
          <CardServicio photo="code" avatar="LP" name="Luis P." title="Soporte técnico PC y redes" price="$200/h" dist="1.1 km · hace 6h" />
          <CardVacante logo="MX" empresa="Mariscos Express" title="Repartidor con moto propia" salario="$9,200/mes" zona="Cholla · TC" />
          <CardServicio photo="paint" avatar="DC" name="Diego C." title="Pintura interior y exterior" price="$2,800" dist="3.6 km · ayer" />
          <CardSolicito icon="briefcase" title="Busco: cocinero medio turno" presupuesto="$7,000/mes" zona="Centro" who="Café Mar" time="hace 3h" />
        </div>
      </div>

      <div className="h-24"></div>
      <div className="relative">
        <div className="absolute right-12 -top-12 z-30">
          <FAB inline />
        </div>
      </div>
    </div>
  );
}
window.FeedDesktop = FeedDesktop;
