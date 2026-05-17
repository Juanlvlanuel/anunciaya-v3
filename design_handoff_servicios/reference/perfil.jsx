/* Perfil del Prestador — mobile + desktop */

function MetricInline({ label, value }) {
  return (
    <span>
      <b className="text-slate-900 font-extrabold">{value}</b> <span className="text-slate-500">{label}</span>
    </span>
  );
}

function ReviewItem({ name, when, rating = 5, text }) {
  return (
    <div className="py-4 border-b border-slate-200 last:border-b-0">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="w-8 h-8 rounded-full bg-slate-200 grid place-items-center text-[11px] font-bold text-slate-600">{name?.[0]}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-900">{name}</span>
            <span className="text-[11px] text-slate-500">· {when}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <I.star key={i} size={11} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
            ))}
          </div>
        </div>
      </div>
      <div className="text-[13px] text-slate-700 leading-relaxed">{text}</div>
    </div>
  );
}

/* ============================ PERFIL MOBILE ============================ */
function PerfilMobile() {
  return (
    <div className="bg-slate-100 w-[375px] relative" style={{ minHeight: 1000 }}>
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button className="text-slate-600"><I.chevL size={20}/></button>
        <div className="text-[14px] font-bold text-slate-900">Perfil</div>
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 grid place-items-center text-slate-600"><I.share size={16}/></button>
          <button className="px-3 py-1.5 rounded-full border-2 border-slate-300 text-[12px] font-bold text-slate-700">Seguir</button>
        </div>
      </div>

      <div className="bg-white px-5 py-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white font-extrabold text-2xl shadow-md shadow-sky-500/20">JR</div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="text-[20px] font-extrabold tracking-tight text-slate-900 leading-tight">Javier Rodríguez</div>
            <div className="text-[12px] font-semibold text-slate-500 mt-0.5">Plomero · Peñasco</div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[1,2,3,4,5].map((i) => <I.star key={i} size={12} className={i <= 5 ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}/>)}
              </div>
              <span className="text-[12px] font-bold text-slate-900">4.9</span>
              <span className="text-[12px] font-medium text-slate-500">· 27 reseñas</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Disponible hoy
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
            <I.clock size={11}/> Responde en ~2h
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">
            <I.shield size={11}/> Identidad verificada
          </span>
        </div>

        <p className="mt-5 text-[14px] text-slate-700 leading-relaxed">
          Plomero local con 8 años atendiendo Puerto Peñasco. Honesto, puntual y limpio. Atiendo emergencias el mismo día en zona centro y Las Conchas.
        </p>

        <div className="mt-4">
          <div className="flex flex-wrap gap-1.5">
            {['Plomería', 'Calentadores', 'Drenaje', 'Emergencias 24h', 'Instalaciones'].map((t) => (
              <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">{t}</span>
            ))}
          </div>
        </div>

        <div className="mt-5 text-[12px] font-medium text-slate-600 leading-relaxed">
          <MetricInline value="5" label="servicios activos" />
          <span className="mx-2 text-slate-300">·</span>
          <MetricInline value="27" label="reseñas" />
          <span className="mx-2 text-slate-300">·</span>
          <MetricInline value="Mar 2026" label="miembro desde" />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-t border-slate-200 sticky top-[52px] z-10">
        <div className="px-4 flex items-center gap-6">
          <button className="py-3 text-[13px] font-bold text-slate-900 border-b-2 border-sky-600">Servicios <span className="ml-1 text-slate-400 font-semibold">5</span></button>
          <button className="py-3 text-[13px] font-semibold text-slate-500">Reseñas <span className="ml-1 font-semibold">27</span></button>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        <CardServicio photo="wrench" avatar="JR" name="Javier R." title="Plomería 24h" price="$350/h" dist="hace 4h" modalidad="Presencial" />
        <CardServicio photo="paint" avatar="JR" name="Javier R." title="Instalación calentadores" price="$1,200" dist="ayer" modalidad="Presencial" />
        <CardServicio photo="cake" avatar="JR" name="Javier R." title="Mantenimiento general" price="$280/h" dist="hace 2d" modalidad="Presencial" />
        <CardServicio photo="sun" avatar="JR" name="Javier R." title="Drenaje y destapado" price="$450" dist="hace 3d" modalidad="Presencial" />
      </div>

      <div className="h-28"></div>

      <div className="absolute right-4 bottom-6 z-30">
        <button className="flex items-center gap-2 pl-3 pr-5 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/40 font-semibold">
          <I.chat size={16}/> Contactar
        </button>
      </div>
    </div>
  );
}
window.PerfilMobile = PerfilMobile;

/* ============================ PERFIL DESKTOP ============================ */
function PerfilDesktop() {
  return (
    <div className="bg-slate-100 w-[1440px]" style={{ minHeight: 1100 }}>
      <GlobalNavbar width={1440}/>
      <div className="max-w-[1280px] mx-auto px-8 py-6">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 mb-4">
          <span>Servicios</span><I.chevR size={10}/>
          <span>Prestadores</span><I.chevR size={10}/>
          <span className="text-slate-900">Javier Rodríguez</span>
        </div>

        {/* Identity row */}
        <div className="bg-white rounded-2xl border border-slate-200 p-7">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white font-extrabold text-3xl shadow-md shadow-sky-500/20 shrink-0">JR</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-tight">Javier Rodríguez</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[12px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Disponible hoy
                </span>
              </div>
              <div className="mt-1 text-[13px] font-semibold text-slate-500">Plomero · Puerto Peñasco · Miembro desde Marzo 2026</div>

              <div className="mt-3 flex items-center gap-4 text-[12px]">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((i) => <I.star key={i} size={13} className="fill-amber-400 text-amber-400"/>)}
                  </div>
                  <span className="font-bold text-slate-900">4.9</span>
                  <span className="text-slate-500">· 27 reseñas</span>
                </div>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1 text-slate-700"><I.clock size={12}/> <b className="font-bold">Responde en ~2h</b></span>
                <span className="text-slate-300">·</span>
                <span className="flex items-center gap-1 text-slate-700"><I.shield size={12} className="text-sky-600"/> <b className="font-bold">Identidad verificada</b></span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700"><b className="font-bold">8 años</b> de experiencia</span>
              </div>

              <p className="mt-4 text-[15px] text-slate-700 leading-relaxed max-w-3xl">
                Plomero local con 8 años atendiendo Puerto Peñasco. Honesto, puntual y limpio. Atiendo emergencias el mismo día en zona centro y Las Conchas. Trabajo con materiales de primera y garantía de 30 días.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {['Plomería', 'Calentadores', 'Drenaje', 'Emergencias 24h', 'Instalaciones nuevas', 'Sanitarios'].map((t) => (
                  <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">{t}</span>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button className="px-3.5 py-2 rounded-full border-2 border-slate-300 text-[12px] font-bold text-slate-700 flex items-center gap-1.5"><I.share size={13}/> Compartir</button>
                <button className="px-3.5 py-2 rounded-full border-2 border-slate-300 text-[12px] font-bold text-slate-700">+ Seguir</button>
              </div>
              <button className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30">
                <I.chat size={16}/> Contactar
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-emerald-500 text-emerald-700 font-bold text-[13px]">
                <I.whatsapp size={14}/> WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-slate-200 flex items-center gap-8">
          <button className="py-3 text-[14px] font-bold text-slate-900 border-b-2 border-sky-600 -mb-px">Servicios activos <span className="ml-1 text-slate-400 font-semibold">5</span></button>
          <button className="py-3 text-[14px] font-semibold text-slate-500">Reseñas <span className="ml-1 font-semibold">27</span></button>
          <button className="py-3 text-[14px] font-semibold text-slate-500">Q&A</button>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_400px] gap-8">
          {/* Active services */}
          <div className="grid grid-cols-3 gap-4">
            <CardServicio photo="wrench" avatar="JR" name="Javier R." title="Plomería residencial 24h" price="$350/h" dist="hace 4h" modalidad="Presencial" />
            <CardServicio photo="paint" avatar="JR" name="Javier R." title="Instalación de calentadores" price="$1,200" dist="ayer" modalidad="Presencial" />
            <CardServicio photo="cake" avatar="JR" name="Javier R." title="Mantenimiento general" price="$280/h" dist="hace 2d" modalidad="Presencial" />
            <CardServicio photo="sun" avatar="JR" name="Javier R." title="Drenaje y destapado" price="$450" dist="hace 3d" modalidad="Presencial" />
            <CardServicio photo="cam" avatar="JR" name="Javier R." title="Cambio de tuberías PVC" price="$2,800" dist="hace 5d" modalidad="Presencial" />
            <div className="rounded-2xl border-2 border-dashed border-slate-300 grid place-items-center text-slate-500 min-h-[260px]">
              <div className="text-center px-6">
                <I.plus size={20} className="mx-auto mb-2"/>
                <div className="text-[12px] font-semibold">Este prestador puede activar más servicios.</div>
              </div>
            </div>
          </div>

          {/* Reviews preview */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-extrabold tracking-tight text-slate-900">Reseñas recientes</div>
              <button className="text-[12px] font-bold text-sky-700">Ver las 27 →</button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-[40px] font-extrabold tracking-tight text-slate-900 leading-none">4.9</div>
              <div className="flex-1">
                <div className="flex items-center gap-0.5 mb-1">
                  {[1,2,3,4,5].map((i) => <I.star key={i} size={14} className="fill-amber-400 text-amber-400"/>)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">Basado en 27 trabajos</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {[
                { l: 5, p: 92 },
                { l: 4, p: 5 },
                { l: 3, p: 3 },
                { l: 2, p: 0 },
                { l: 1, p: 0 },
              ].map((b) => (
                <div key={b.l} className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="w-3 font-bold text-slate-700">{b.l}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: b.p + '%' }}></div>
                  </div>
                  <span className="w-8 text-right font-semibold">{b.p}%</span>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <ReviewItem name="Carla Méndez" when="hace 3d" rating={5} text="Atendió rápido la fuga en la cocina. Limpio, cobró lo que dijo. Súper recomendado." />
              <ReviewItem name="Roberto H." when="hace 1 sem" rating={5} text="Instaló el calentador en menos de 2 horas. Muy profesional." />
            </div>
          </div>
        </div>

        <div className="h-12"></div>
      </div>
    </div>
  );
}
window.PerfilDesktop = PerfilDesktop;

/* ============================ PERFIL VACÍO RESEÑAS ============================ */
function PerfilVacio() {
  return (
    <div className="bg-white w-[375px] relative" style={{ minHeight: 720 }}>
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button className="text-slate-600"><I.chevL size={20}/></button>
        <div className="text-[14px] font-bold text-slate-900">Perfil</div>
        <button className="px-3 py-1.5 rounded-full border-2 border-slate-300 text-[12px] font-bold text-slate-700">Seguir</button>
      </div>
      <div className="px-5 py-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white font-extrabold text-2xl">MC</div>
          <div>
            <div className="text-[20px] font-extrabold tracking-tight text-slate-900">Mariana Cota</div>
            <div className="text-[12px] font-semibold text-slate-500 mt-0.5">Diseñadora gráfica · Nueva en AnunciaYA</div>
            <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[12px] font-bold">Recién llegada</span>
          </div>
        </div>
        <p className="mt-5 text-[13px] text-slate-700 leading-relaxed">Diseño de logos, redes sociales y branding para negocios locales. Trabajo remoto desde Peñasco.</p>
      </div>
      <div className="border-t border-b border-slate-200">
        <div className="px-4 flex items-center gap-6">
          <button className="py-3 text-[13px] font-semibold text-slate-500">Servicios <span className="ml-1 font-semibold">2</span></button>
          <button className="py-3 text-[13px] font-bold text-slate-900 border-b-2 border-sky-600">Reseñas <span className="ml-1 text-slate-400 font-semibold">0</span></button>
        </div>
      </div>
      <div className="px-8 py-10 flex flex-col items-center text-center">
        <div className="w-20 h-20 mb-4 rounded-full bg-sky-50 grid place-items-center">
          <I.star size={28} className="text-sky-600" />
        </div>
        <div className="text-[16px] font-extrabold text-slate-900">Aún sin reseñas</div>
        <div className="mt-1 text-[13px] text-slate-600 leading-relaxed max-w-[260px]">
          Sé el primero en contratar a Mariana y deja tu reseña para ayudar a otros vecinos.
        </div>
        <button className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[13px] shadow-md shadow-sky-500/30">
          <I.chat size={14}/> Contactar
        </button>
      </div>
    </div>
  );
}
window.PerfilVacio = PerfilVacio;
