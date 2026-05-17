/* Wizard Publicar — Pasos 1-4 (móvil + desktop con preview en vivo) */

function StepHeader({ step, total = 4, title, hint }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {[...Array(total)].map((_, i) => (
          <div
            key={i}
            className={
              'h-1.5 flex-1 rounded-full ' +
              (i < step ? 'bg-sky-600' : i === step - 1 ? 'bg-sky-600' : 'bg-slate-200')
            }
          ></div>
        ))}
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-sky-700">
        Paso {step} de {total}
      </div>
      <div className="mt-1 text-[22px] font-extrabold tracking-tight text-slate-900 leading-tight">{title}</div>
      {hint && <div className="mt-1 text-[13px] text-slate-600 leading-relaxed">{hint}</div>}
    </div>
  );
}

function FieldLabel({ children, hint, count }) {
  return (
    <div className="flex items-baseline justify-between mb-1.5">
      <div className="text-[12px] font-bold uppercase tracking-wider text-slate-600">{children}</div>
      {(hint || count) && <div className="text-[11px] font-medium text-slate-500">{count || hint}</div>}
    </div>
  );
}

function TextInput({ value, placeholder }) {
  return (
    <div className="px-3.5 py-3 rounded-lg border-2 border-slate-300 bg-white text-[14px] font-medium text-slate-900">
      {value || <span className="text-slate-400">{placeholder}</span>}
    </div>
  );
}

function Textarea({ value, placeholder, rows = 3 }) {
  return (
    <div className="px-3.5 py-3 rounded-lg border-2 border-slate-300 bg-white text-[14px] font-medium text-slate-900 leading-relaxed" style={{ minHeight: rows * 22 + 24 }}>
      {value || <span className="text-slate-400">{placeholder}</span>}
    </div>
  );
}

function TypeCard({ icon, title, hint, active }) {
  return (
    <div
      className={
        'p-4 rounded-2xl border-2 cursor-pointer transition ' +
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
        {active && <div className="w-5 h-5 rounded-full bg-sky-600 grid place-items-center text-white"><I.check size={12} stroke={3} /></div>}
      </div>
      <div className="mt-3 text-[15px] font-extrabold text-slate-900 leading-snug">{title}</div>
      <div className="mt-1 text-[12px] text-slate-600 leading-snug">{hint}</div>
    </div>
  );
}

function PriceTypePill({ children, active }) {
  return (
    <div
      className={
        'px-3 py-2.5 rounded-lg border-2 text-[13px] font-semibold text-center cursor-pointer transition ' +
        (active ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-300 text-slate-700 hover:border-slate-400')
      }
    >
      {children}
    </div>
  );
}

function WizardPreviewCard() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md">
      <div className="aspect-[4/3] relative stripe-bg">
        <PhotoPlaceholder kind="wrench" label="foto del trabajo" />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          Servicio
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 grid place-items-center text-[9px] font-bold text-white">TÚ</div>
          <span className="text-[11px] font-semibold text-slate-600">Tu nombre</span>
        </div>
        <div className="text-[14px] font-bold text-slate-900 leading-snug truncate">Plomería residencial 24 horas</div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[15px] font-extrabold text-slate-900">$350/hora</span>
          <span className="text-[11px] font-semibold text-slate-500">· Presencial</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <I.pin size={11}/> Peñasco · ahora
        </div>
      </div>
    </div>
  );
}

/* ====================== WIZARD MOBILE — PASO 1 ====================== */
function WizardMobileStep1() {
  return (
    <div className="bg-slate-100 w-[375px] relative" style={{ minHeight: 812 }}>
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button className="text-slate-600"><I.x size={20}/></button>
        <div className="flex-1 text-center text-[14px] font-bold text-slate-900">Publicar</div>
        <div className="w-5"></div>
      </div>
      <div className="p-4 bg-white">
        <StepHeader step={1} title="¿Qué quieres hacer?" hint="Elige cómo aparecerá tu publicación. Podrás afinar los detalles en el siguiente paso." />
      </div>

      <div className="p-4 space-y-3">
        <TypeCard
          icon={<I.hand size={20} />}
          title="Ofrezco un servicio o busco empleo"
          hint="Soy una persona o empresa que ofrece sus habilidades."
          active
        />
        <TypeCard
          icon={<I.search size={20} />}
          title="Solicito un servicio o busco contratar"
          hint="Necesito a alguien para algo puntual o tengo una vacante."
        />

        <div className="mt-2 pt-4 border-t border-slate-200">
          <div className="text-[12px] font-bold uppercase tracking-wider text-slate-600 mb-2">¿De qué tipo?</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border-2 border-sky-500 bg-sky-50">
              <div className="w-9 h-9 rounded-lg bg-sky-600 text-white grid place-items-center"><I.tool size={16}/></div>
              <div className="mt-2 text-[13px] font-bold text-slate-900">Servicio personal</div>
              <div className="text-[11px] text-slate-600">Ej. plomería, fotografía</div>
            </div>
            <div className="p-3 rounded-xl border-2 border-slate-300 bg-white">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 grid place-items-center"><I.briefcase size={16}/></div>
              <div className="mt-2 text-[13px] font-bold text-slate-900">Busco empleo</div>
              <div className="text-[11px] text-slate-600">Soy candidato a una vacante</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-2">
        <button className="text-[13px] font-semibold text-slate-500 px-3">Cancelar</button>
        <button className="ml-auto flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30">
          Continuar <I.arrowR size={14}/>
        </button>
      </div>
    </div>
  );
}
window.WizardMobileStep1 = WizardMobileStep1;

/* ====================== WIZARD MOBILE — PASO 2 ====================== */
function WizardMobileStep2() {
  return (
    <div className="bg-slate-100 w-[375px] relative" style={{ minHeight: 900 }}>
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button className="text-slate-600"><I.chevL size={20}/></button>
        <div className="flex-1 text-center text-[14px] font-bold text-slate-900">Publicar</div>
        <button className="text-[12px] font-bold text-slate-500">Guardar</button>
      </div>

      <div className="p-4 bg-white">
        <StepHeader step={2} title="Información principal" hint="Lo que la gente verá en tu publicación." />
      </div>

      <div className="px-4 mt-2 pb-32 space-y-5">
        <div>
          <FieldLabel count="32/60">Título</FieldLabel>
          <TextInput value="Plomería residencial 24 horas" />
        </div>
        <div>
          <FieldLabel count="118/500">Descripción</FieldLabel>
          <Textarea
            value="Plomero con 8 años de experiencia. Reparación de fugas, instalación de calentadores y emergencias. Atención el mismo día en zona centro."
            rows={4}
          />
        </div>
        <div>
          <FieldLabel hint="máx 8">Especialidades</FieldLabel>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {['Fugas', 'Calentadores', 'Drenaje', 'Emergencias 24h'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 text-[12px] font-semibold">
                {t} <I.x size={11} className="opacity-70"/>
              </span>
            ))}
          </div>
          <TextInput placeholder="Agregar especialidad…" />
        </div>
        <div>
          <FieldLabel hint="hasta 6 fotos">Fotos (opcional)</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1].map((i) => (
              <div key={i} className="aspect-square rounded-lg stripe-bg relative">
                <button className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white grid place-items-center"><I.x size={11}/></button>
              </div>
            ))}
            <div className="aspect-square rounded-lg border-2 border-dashed border-slate-300 grid place-items-center text-slate-500">
              <div className="flex flex-col items-center gap-1">
                <I.camera size={18}/>
                <span className="text-[11px] font-semibold">Subir</span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <FieldLabel>Modalidad</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            <PriceTypePill active>Presencial</PriceTypePill>
            <PriceTypePill>Remoto</PriceTypePill>
            <PriceTypePill>Híbrido</PriceTypePill>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-2">
        <button className="text-[13px] font-semibold text-slate-500 px-3">Atrás</button>
        <button className="ml-auto flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30">
          Continuar <I.arrowR size={14}/>
        </button>
      </div>
    </div>
  );
}
window.WizardMobileStep2 = WizardMobileStep2;

/* ====================== WIZARD MOBILE — PASO 4 (Confirmación) ====================== */
function WizardMobileStep4() {
  return (
    <div className="bg-slate-100 w-[375px] relative" style={{ minHeight: 980 }}>
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button className="text-slate-600"><I.chevL size={20}/></button>
        <div className="flex-1 text-center text-[14px] font-bold text-slate-900">Publicar</div>
        <div className="w-5"></div>
      </div>
      <div className="p-4 bg-white">
        <StepHeader step={4} title="Revisa y publica" hint="Así se verá tu publicación en el feed." />
      </div>

      <div className="px-4 mt-3 pb-32">
        <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Vista previa</div>
        <div className="max-w-[180px] mx-auto">
          <WizardPreviewCard/>
        </div>

        <div className="mt-5 rounded-xl bg-white border border-slate-200 divide-y divide-slate-200">
          {[
            { l: 'Tipo', v: 'Ofrezco — Servicio personal' },
            { l: 'Modalidad', v: 'Presencial' },
            { l: 'Precio', v: '$350 / hora' },
            { l: 'Zona', v: 'Centro · Las Conchas' },
            { l: 'Especialidades', v: 'Fugas · Calentadores · Drenaje · +1' },
          ].map((r) => (
            <div key={r.l} className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-[12px] font-semibold text-slate-500">{r.l}</span>
              <span className="text-[12px] font-bold text-slate-900 text-right">{r.v}</span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-2">Confirma antes de publicar</div>
          <div className="space-y-2">
            {[
              'No estoy ofreciendo nada ilegal',
              'La información es verdadera',
              'Sé que la coordinación es por mi cuenta (ChatYA, WhatsApp, en persona)',
            ].map((c, i) => (
              <label key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200">
                <span className={'mt-0.5 w-5 h-5 rounded border-2 ' + (i < 2 ? 'bg-sky-600 border-sky-600 text-white grid place-items-center' : 'border-slate-300')}>
                  {i < 2 && <I.check size={12} stroke={3}/>}
                </span>
                <span className="text-[13px] font-medium text-slate-700 leading-snug">{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 text-[11px] text-slate-500 leading-snug">
          Tu publicación expira automáticamente en 30 días. Podrás renovarla con un toque.
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-2">
        <button className="text-[13px] font-semibold text-slate-500 px-3">Atrás</button>
        <button className="ml-auto flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/40">
          <I.send size={14}/> Publicar
        </button>
      </div>
    </div>
  );
}
window.WizardMobileStep4 = WizardMobileStep4;

/* ====================== WIZARD DESKTOP (full) ====================== */
function WizardDesktop() {
  return (
    <div className="bg-slate-100 w-[1440px]" style={{ minHeight: 980 }}>
      <GlobalNavbar width={1440}/>
      <div className="max-w-[1280px] mx-auto px-8 py-6">
        <div className="grid grid-cols-[1fr_440px] gap-10">
          {/* Form column */}
          <div>
            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 mb-4">
              <button className="text-slate-600 hover:text-slate-900"><I.chevL size={14}/></button>
              <span>Servicios</span><I.chevR size={10}/><span className="text-slate-900">Publicar</span>
            </div>
            <StepHeader step={3} title="Precio y ubicación" hint="Define cuánto cobras y dónde atiendes. Puedes elegir un monto fijo, un rango o dejarlo a convenir." />

            <div className="mt-7 space-y-7 max-w-2xl">
              <div>
                <FieldLabel>Tipo de precio</FieldLabel>
                <div className="grid grid-cols-5 gap-2">
                  <PriceTypePill>Monto fijo</PriceTypePill>
                  <PriceTypePill active>Por hora</PriceTypePill>
                  <PriceTypePill>Rango</PriceTypePill>
                  <PriceTypePill>Mensual</PriceTypePill>
                  <PriceTypePill>A convenir</PriceTypePill>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Monto por hora (MXN)</FieldLabel>
                  <div className="flex items-stretch rounded-lg border-2 border-slate-300 overflow-hidden">
                    <span className="px-3 grid place-items-center bg-slate-100 text-slate-600 font-bold text-sm">$</span>
                    <input
                      defaultValue="350"
                      className="flex-1 px-3 py-3 text-[16px] font-bold text-slate-900 outline-none"
                    />
                    <span className="px-3 grid place-items-center bg-slate-50 text-slate-500 text-xs font-semibold border-l border-slate-200">/h</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Rango sugerido en Peñasco: $200 — $450 / hora</div>
                </div>
                <div>
                  <FieldLabel>Tarifa de visita (opcional)</FieldLabel>
                  <div className="flex items-stretch rounded-lg border-2 border-slate-300 overflow-hidden">
                    <span className="px-3 grid place-items-center bg-slate-100 text-slate-600 font-bold text-sm">$</span>
                    <input
                      placeholder="0"
                      className="flex-1 px-3 py-3 text-[16px] font-bold text-slate-900 outline-none"
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">Costo de traslado o presupuesto.</div>
                </div>
              </div>

              <div>
                <FieldLabel>Ciudad</FieldLabel>
                <TextInput value="Puerto Peñasco, Sonora" />
                <div className="mt-1 text-[11px] text-slate-500">Detectado automáticamente</div>
              </div>

              <div>
                <FieldLabel hint="múltiple selección">Zonas que atiendes</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {['Centro', 'Las Conchas', 'Cholla', 'Mirador', 'La Choya', 'Sandy Beach', 'Mariano Matamoros', 'Toda la ciudad'].map((z, i) => (
                    <Chip key={z} active={i < 3}>{z}</Chip>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <FieldLabel>Mostrar zona en mapa</FieldLabel>
                <MapPlaceholder small/>
                <div className="mt-2 text-[11px] text-slate-500 leading-snug">
                  Por privacidad, mostramos un radio de ~500m alrededor de tu zona, no tu dirección exacta.
                </div>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-3 max-w-2xl">
              <button className="px-5 py-3 rounded-full border-2 border-slate-300 text-[14px] font-bold text-slate-700">Atrás</button>
              <button className="text-[13px] font-semibold text-slate-500">Guardar borrador</button>
              <button className="ml-auto flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30">
                Continuar <I.arrowR size={14}/>
              </button>
            </div>
          </div>

          {/* Live preview column */}
          <div>
            <div className="sticky top-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Vista previa en vivo</div>
              <div className="rounded-3xl bg-gradient-to-br from-slate-200 to-slate-300/40 p-6 border border-slate-200">
                <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-3 text-center">Así se verá en el feed</div>
                <div className="max-w-[260px] mx-auto">
                  <WizardPreviewCard/>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-300/70 grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-0.5">Auto-guardado</div>
                    <div className="font-semibold text-slate-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Guardado hace 2s</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wider text-slate-500 text-[10px] mb-0.5">Expira</div>
                    <div className="font-semibold text-slate-700">En 30 días</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-sky-600 text-white grid place-items-center shrink-0"><I.shield size={14}/></div>
                  <div className="text-[12px] text-sky-900 leading-relaxed">
                    <b>Tu privacidad.</b> No mostramos tu dirección exacta ni tu teléfono hasta que tú compartas el contacto en ChatYA.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.WizardDesktop = WizardDesktop;
