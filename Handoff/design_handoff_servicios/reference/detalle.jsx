/* Detalle Servicio / Vacante — mobile + desktop */

function Stars({ n = 4.8, size = 12 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <I.star key={i} size={size} className={i <= Math.round(n) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} />
      ))}
    </div>
  );
}

function QAItem({ q, a, who, when, pending }) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-2 top-2 w-3 h-6 border-l-2 border-b-2 border-slate-200 rounded-bl-md"></div>
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-200 grid place-items-center text-[10px] font-bold text-slate-600 -ml-8">{who?.[0]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-bold text-slate-900">{who}</span>
            <span className="text-[11px] text-slate-500">· {when}</span>
            {pending && <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">Pendiente</span>}
          </div>
          <div className="text-[13px] text-slate-800 font-medium leading-snug">{q}</div>
          {a && (
            <div className="mt-1.5 pl-3 border-l-2 border-sky-200 text-[13px] text-slate-700 leading-snug">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 block mb-0.5">Respuesta</span>
              {a}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MapPlaceholder({ small }) {
  return (
    <div className={'relative rounded-xl overflow-hidden border border-slate-200 ' + (small ? 'h-32' : 'h-44')}>
      <div className="absolute inset-0" style={{
        backgroundImage: `
          radial-gradient(800px 200px at 50% 50%, rgba(2,132,199,0.08), transparent 60%),
          linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)`,
        backgroundSize: '100% 100%, 28px 28px, 28px 28px',
        backgroundColor: '#f1f5f9'
      }}></div>
      {/* roads */}
      <svg viewBox="0 0 400 160" className="absolute inset-0 w-full h-full">
        <path d="M0 80 C 80 60, 140 100, 220 70 S 360 100, 400 80" stroke="#cbd5e1" strokeWidth="6" fill="none"/>
        <path d="M120 0 L 140 160" stroke="#e2e8f0" strokeWidth="3" fill="none"/>
        <path d="M260 0 L 280 160" stroke="#e2e8f0" strokeWidth="3" fill="none"/>
      </svg>
      {/* radius */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-sky-500/15 border-2 border-sky-500/40"></div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-sky-600 border-2 border-white shadow"></div>
      <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider font-mono text-slate-500 bg-white/80 rounded px-1.5 py-0.5">
        radio aprox. 500 m
      </div>
    </div>
  );
}

/* ============================ DETALLE MOBILE ============================ */
function DetalleMobile({ tipo = 'servicio' }) {
  const isServ = tipo === 'servicio';
  return (
    <div className="bg-white w-[375px] relative" style={{ minHeight: 812 }}>
      {/* Transparent sticky header over gallery */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3">
        <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center"><I.chevL size={18} /></button>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center"><I.heart size={16} /></button>
          <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center"><I.share size={15} /></button>
        </div>
      </div>

      {/* Gallery */}
      {isServ ? (
        <div className="aspect-[4/3] relative stripe-bg">
          <PhotoPlaceholder kind="wrench" label="foto del trabajo 1/6" />
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 text-white text-[11px] font-bold">
            1 / 6
          </div>
        </div>
      ) : (
        <div className="aspect-[16/9] relative bg-gradient-to-br from-sky-100 to-sky-200 grid place-items-center">
          <div className="text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white grid place-items-center text-sky-700 text-2xl font-extrabold shadow-md">RA</div>
            <div className="mt-3 text-sm font-bold text-slate-900">Restaurante Aurora</div>
            <div className="text-[11px] text-slate-600">Cocina del mar — Puerto Peñasco</div>
          </div>
        </div>
      )}

      <div className="px-4 py-4">
        <span className={'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ' + (isServ ? 'bg-sky-100 text-sky-700' : 'bg-sky-100 text-sky-700')}>
          {isServ ? <><I.tool size={10}/> Servicio personal</> : <><I.briefcase size={10}/> Vacante — Empresa verificada</>}
        </span>
        <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-slate-900 leading-tight">
          {isServ ? 'Plomería residencial 24 horas' : 'Mesero(a) turno noche'}
        </h1>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[20px] font-extrabold text-sky-700">{isServ ? '$350/hora' : '$8,500 / mes'}</span>
          <span className="text-[12px] font-semibold text-slate-500">· {isServ ? 'Presencial · Peñasco' : 'Tiempo completo · Centro'}</span>
        </div>

        {/* Oferente */}
        <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          {isServ ? (
            <>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white font-extrabold">JR</div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-slate-900">Javier Rodríguez</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Stars n={4.9} size={11} />
                  <span className="text-[11px] font-semibold text-slate-600">4.9 · 27 reseñas</span>
                </div>
              </div>
              <button className="text-[12px] font-semibold text-sky-700 flex items-center gap-1">Ver perfil <I.chevR size={12}/></button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-white grid place-items-center text-sky-700 font-extrabold border border-sky-100">RA</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-slate-900">Restaurante Aurora</span>
                  <I.shield size={13} className="text-sky-600" />
                </div>
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">Verificado · Miembro desde 2024</div>
              </div>
              <button className="text-[12px] font-semibold text-sky-700 flex items-center gap-1">Ver negocio <I.chevR size={12}/></button>
            </>
          )}
        </div>

        {/* Description */}
        <div className="mt-5">
          <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Descripción</div>
          <p className="text-[14px] text-slate-700 leading-relaxed">
            {isServ
              ? 'Plomero con 8 años de experiencia atendiendo Puerto Peñasco. Reparación de fugas, instalación de calentadores, destapado de drenajes y mantenimiento general. Atención el mismo día en zona centro y Las Conchas.'
              : 'Buscamos mesero(a) con experiencia para el turno noche (5pm–11pm). Servicio en mesa, manejo de comandas y orden de barra. Ambiente bueno, propinas compartidas. Inicio inmediato.'}
          </p>
        </div>

        {/* Skills */}
        <div className="mt-5">
          <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            {isServ ? 'Especialidades' : 'Lo que ofrecemos'}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(isServ
              ? ['Fugas y reparaciones', 'Calentadores', 'Drenaje', 'Instalaciones nuevas', 'Emergencias 24h']
              : ['Propinas compartidas', 'IMSS desde día 1', 'Comida incluida', 'Crecimiento interno']
            ).map((t) => (
              <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">{t}</span>
            ))}
          </div>
        </div>

        {/* Requisitos (only vacante) */}
        {!isServ && (
          <div className="mt-5">
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Requisitos</div>
            <ul className="space-y-1.5">
              {['Mayor de 18 años', '6 meses experiencia en piso o barra', 'Disponibilidad turno noche', 'Buena presentación'].map((r) => (
                <li key={r} className="flex items-start gap-2 text-[13px] text-slate-700 font-medium">
                  <I.check size={14} className="text-sky-600 mt-0.5 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Modalidad y ubicación */}
        <div className="mt-5">
          <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Modalidad y ubicación</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold"><I.pin size={11}/> Presencial</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold"><I.clock size={11}/> {isServ ? '24/7' : 'Lun–Sáb 5pm–11pm'}</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">{isServ ? 'Zona centro' : 'Av. Constitución'}</span>
          </div>
          <MapPlaceholder small />
        </div>

        {/* Q&A */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[15px] font-extrabold tracking-tight text-slate-900">Preguntas y respuestas</div>
            <button className="text-[12px] font-bold text-sky-700">Preguntar</button>
          </div>
          <div className="space-y-4">
            <QAItem who="Carla M." when="hace 1d" q="¿Atienden Las Conchas el mismo día?" a={isServ ? 'Sí, llego en ~45 min. Hay un cargo de traslado de $80.' : 'Sí, también recibimos meseros de esa zona — el restaurante está bien comunicado.'} />
            <QAItem who="Carla M." when="hace 1d" q="¿Aceptan transferencia bancaria al terminar?" pending />
          </div>
        </div>

        <div className="h-32"></div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 flex items-center gap-2">
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30">
          <I.chat size={16} /> Contactar por ChatYA
        </button>
        <button className="w-12 h-12 rounded-xl bg-emerald-500 text-white grid place-items-center">
          <I.whatsapp size={20} />
        </button>
      </div>
    </div>
  );
}
window.DetalleMobile = DetalleMobile;

/* ============================ DETALLE PAUSADO STATE ============================ */
function DetallePausado() {
  return (
    <div className="bg-white w-[375px] relative" style={{ minHeight: 812 }}>
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3">
        <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center"><I.chevL size={18} /></button>
        <button className="w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white grid place-items-center"><I.share size={15} /></button>
      </div>
      <div className="aspect-[4/3] relative stripe-bg opacity-60">
        <PhotoPlaceholder kind="wrench" />
        <div className="absolute inset-0 bg-slate-900/30"></div>
      </div>
      <div className="mt-3 mx-4 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
        <I.alert size={16} className="text-amber-700 mt-0.5 shrink-0"/>
        <div>
          <div className="text-[13px] font-bold text-amber-900">Publicación pausada</div>
          <div className="text-[12px] text-amber-800 leading-snug">No puedes contactar a este prestador mientras esté pausada. Te avisaremos si vuelve a estar activa.</div>
        </div>
      </div>
      <div className="px-4 mt-4">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
          <I.pause size={10}/> Pausada
        </span>
        <h1 className="mt-2 text-[20px] font-extrabold tracking-tight text-slate-900 leading-tight">
          Plomería residencial 24 horas
        </h1>
        <div className="mt-1 text-[15px] font-extrabold text-slate-400 line-through decoration-2">$350/hora</div>

        <div className="mt-5 text-[13px] text-slate-500 leading-relaxed">
          Plomero con 8 años de experiencia atendiendo Puerto Peñasco. Reparación de fugas, instalación de calentadores y emergencias.
        </div>

        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <div className="text-[13px] font-semibold text-slate-700">¿Buscas algo similar?</div>
          <button className="mt-2 text-[12px] font-bold text-sky-700">Ver plomeros disponibles →</button>
        </div>
      </div>
      <div className="h-32"></div>
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 flex items-center gap-2">
        <button disabled className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-400 font-bold text-[14px] cursor-not-allowed">
          Contacto deshabilitado
        </button>
      </div>
    </div>
  );
}
window.DetallePausado = DetallePausado;

/* ============================ DETALLE DESKTOP =========================== */
function DetalleDesktop({ tipo = 'servicio' }) {
  const isServ = tipo === 'servicio';
  return (
    <div className="bg-slate-100 w-[1440px]" style={{ minHeight: 1100 }}>
      <GlobalNavbar width={1440} />
      <div className="max-w-[1280px] mx-auto px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 mb-4">
          <span>Servicios</span>
          <I.chevR size={12}/>
          <span>Ofrecidos</span>
          <I.chevR size={12}/>
          <span>Hogar y reparaciones</span>
          <I.chevR size={12}/>
          <span className="text-slate-900">Plomería 24h</span>
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-8">
          {/* Left col */}
          <div>
            {/* Gallery */}
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-4 aspect-[16/9] rounded-2xl overflow-hidden stripe-bg relative border border-slate-200">
                <PhotoPlaceholder kind="wrench" label="foto principal del trabajo" />
              </div>
              {['paint', 'cake', 'sun', 'cam'].map((k, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden stripe-bg relative border border-slate-200">
                  <PhotoPlaceholder kind={k} compact />
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-700 text-[11px] font-bold">
                {isServ ? <><I.tool size={10}/> Servicio personal</> : <><I.briefcase size={10}/> Vacante — Empresa verificada</>}
              </span>
              <span className="text-[12px] text-slate-500">Publicado hace 4 horas · Peñasco</span>
            </div>
            <h1 className="mt-2 text-[32px] font-extrabold tracking-tight text-slate-900 leading-tight">
              Plomería residencial 24 horas — fugas, calentadores y drenaje
            </h1>

            {/* Description */}
            <div className="mt-6">
              <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Descripción</div>
              <p className="text-[15px] text-slate-700 leading-relaxed max-w-[60ch]">
                Plomero con 8 años de experiencia atendiendo Puerto Peñasco. Reparación de fugas, instalación de calentadores, destapado de drenajes y mantenimiento general. Atención el mismo día en zona centro y Las Conchas, presupuesto sin compromiso.
              </p>
              <p className="mt-3 text-[15px] text-slate-700 leading-relaxed max-w-[60ch]">
                Trabajo limpio, con garantía de 30 días en mano de obra y materiales de primera. Acepto transferencia, efectivo y tarjeta al terminar.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Especialidades</div>
                <div className="flex flex-wrap gap-1.5">
                  {['Fugas y reparaciones', 'Calentadores', 'Drenaje', 'Instalaciones nuevas', 'Emergencias 24h', 'Sanitarios'].map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Modalidad</div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold"><I.pin size={11}/> Presencial</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold"><I.clock size={11}/> 24/7</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[12px] font-semibold">Centro · Las Conchas · Cholla</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Zona aproximada de atención</div>
              <MapPlaceholder />
            </div>

            {/* Q&A */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[18px] font-extrabold tracking-tight text-slate-900">Preguntas y respuestas <span className="text-slate-400 font-medium">(8)</span></div>
                <button className="text-[12px] font-bold text-sky-700 px-3 py-1.5 rounded-full border-2 border-sky-200 hover:bg-sky-50">+ Preguntar</button>
              </div>
              <div className="space-y-5">
                <QAItem who="Carla M." when="hace 1d" q="¿Atienden Las Conchas el mismo día?" a="Sí, llego en ~45 min. Hay un cargo de traslado de $80." />
                <QAItem who="Carla M." when="hace 1d" q="¿Aceptan transferencia bancaria al terminar?" pending />
                <QAItem who="Roberto H." when="hace 3d" q="¿Tienen factura?" a="Sí, emito factura electrónica con datos fiscales." />
              </div>
            </div>
          </div>

          {/* Right col — sticky CTA card */}
          <div className="relative">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-md p-5">
                <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Precio</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[32px] font-extrabold tracking-tight text-slate-900">$350</span>
                  <span className="text-[14px] font-semibold text-slate-500">/hora</span>
                </div>
                <div className="text-[12px] text-slate-500 mt-1">Presupuesto sin compromiso · Pago al terminar</div>

                <div className="mt-5 pt-5 border-t border-slate-200 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-sky-700 grid place-items-center text-white font-extrabold">JR</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-slate-900">Javier Rodríguez</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Stars n={4.9} size={11}/>
                      <span className="text-[11px] font-semibold text-slate-600">4.9 · 27 reseñas</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">~2h</div>
                    <div className="text-slate-500">Tiempo respuesta</div>
                  </div>
                  <div className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="font-bold text-slate-900">8 años</div>
                    <div className="text-slate-500">Experiencia</div>
                  </div>
                </div>

                <button className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30 hover:shadow-lg hover:shadow-sky-500/40 transition">
                  <I.chat size={16} /> Contactar por ChatYA
                </button>
                <button className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-emerald-500 text-emerald-700 font-bold text-[14px] hover:bg-emerald-50 transition">
                  <I.whatsapp size={16} /> WhatsApp
                </button>
                <div className="mt-3 text-[11px] text-slate-500 text-center leading-snug">
                  La coordinación es entre ustedes. AnunciaYA no procesa pagos.
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 p-4">
                <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Guardar / compartir</div>
                <div className="flex items-center gap-2">
                  <button className="flex-1 py-2 rounded-lg border-2 border-slate-300 text-[12px] font-semibold text-slate-700 flex items-center justify-center gap-1.5"><I.heart size={13}/> Guardar</button>
                  <button className="flex-1 py-2 rounded-lg border-2 border-slate-300 text-[12px] font-semibold text-slate-700 flex items-center justify-center gap-1.5"><I.share size={13}/> Compartir</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.DetalleDesktop = DetalleDesktop;
