/* Cards comparativas + componentes base reutilizables */

function CardsComparativa() {
  return (
    <div className="w-[1280px] bg-slate-100 p-10">
      <div className="text-[12px] font-bold uppercase tracking-wider text-sky-700 mb-1">Sistema</div>
      <h2 className="text-[28px] font-extrabold tracking-tight text-slate-900 mb-1">Variantes de Card</h2>
      <p className="text-[14px] text-slate-600 mb-8 max-w-[60ch]">
        Tres variantes visuales diferenciadas para que el usuario reconozca de un vistazo si está mirando un servicio personal,
        una vacante de empresa o una solicitud de alguien que busca contratar.
      </p>

      <div className="grid grid-cols-3 gap-8">
        {/* Servicio persona */}
        <div>
          <div className="mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Variante 01</div>
            <div className="text-[16px] font-extrabold tracking-tight text-slate-900">Servicio — persona</div>
            <div className="text-[12px] text-slate-600">Oferente individual. Foto del trabajo arriba.</div>
          </div>
          <div className="max-w-[260px]">
            <CardServicio
              photo="wrench" avatar="JR" name="Javier R."
              title="Plomería residencial 24h" price="$350/h"
              dist="0.8 km · hace 1h" modalidad="Presencial"
            />
          </div>
          <ul className="mt-4 text-[12px] text-slate-600 space-y-1.5">
            <Bullet><b>Borde:</b> slate-200, neutro</Bullet>
            <Bullet><b>Foto:</b> aspect 4:3 del trabajo</Bullet>
            <Bullet><b>Avatar + nombre</b> visible antes del título</Bullet>
            <Bullet>Sin badge "Verificado"</Bullet>
          </ul>
        </div>

        {/* Vacante empresa */}
        <div>
          <div className="mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Variante 02</div>
            <div className="text-[16px] font-extrabold tracking-tight text-slate-900">Vacante — empresa</div>
            <div className="text-[12px] text-slate-600">Negocio verificado. Banda sky con logo.</div>
          </div>
          <div className="max-w-[260px]">
            <CardVacante
              logo="RA" empresa="Rest. Aurora"
              title="Mesero(a) turno noche" salario="$8,500/mes" zona="Centro · TC"
            />
          </div>
          <ul className="mt-4 text-[12px] text-slate-600 space-y-1.5">
            <Bullet><b>Borde:</b> sky-200, sutil acento</Bullet>
            <Bullet><b>Banda superior</b> sky-50 con logo</Bullet>
            <Bullet>Badge "Verificado" pequeño esquina sup. der.</Bullet>
            <Bullet>Chip "Vacante" en sky-100/700</Bullet>
          </ul>
        </div>

        {/* Solicito */}
        <div>
          <div className="mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Variante 03</div>
            <div className="text-[16px] font-extrabold tracking-tight text-slate-900">Solicito — buscan contratar</div>
            <div className="text-[12px] text-slate-600">Fondo crema amber. Sin foto grande.</div>
          </div>
          <div className="max-w-[260px]">
            <CardSolicito icon="image" title="Busco: fotógrafo boda" presupuesto="$3,500–$5,000" zona="Las Conchas" who="Ana T." />
          </div>
          <ul className="mt-4 text-[12px] text-slate-600 space-y-1.5">
            <Bullet><b>Fondo:</b> amber-50, diferenciador suave</Bullet>
            <Bullet><b>Icono</b> de categoría, no foto</Bullet>
            <Bullet><b>Presupuesto</b> en lugar de precio fijo</Bullet>
            <Bullet>Chip "Solicito" en amber-100/800</Bullet>
          </ul>
        </div>
      </div>
    </div>
  );
}
window.CardsComparativa = CardsComparativa;

function Bullet({ children }) {
  return (
    <li className="flex items-start gap-2 leading-relaxed">
      <span className="w-1 h-1 mt-2 rounded-full bg-slate-400 shrink-0"></span>
      <span>{children}</span>
    </li>
  );
}

/* ============================ COMPONENTES BASE ============================ */
function ComponentesBase() {
  return (
    <div className="w-[1280px] bg-slate-100 p-10">
      <div className="text-[12px] font-bold uppercase tracking-wider text-sky-700 mb-1">Sistema</div>
      <h2 className="text-[28px] font-extrabold tracking-tight text-slate-900 mb-1">Componentes base reutilizables</h2>
      <p className="text-[14px] text-slate-600 mb-8 max-w-[60ch]">
        Heredados de MarketPlace, repaletizados a sky. Estos primitivos viven en una sola fuente —
        cualquier ajuste se propaga a todas las pantallas.
      </p>

      <div className="grid grid-cols-2 gap-8">
        {/* Header dark */}
        <div className="col-span-2">
          <SpecLabel n="01" t="Header dark sticky" d="Grid 32px blanco 8% · glow radial sky-600 7% · subtítulo con líneas decorativas" />
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
            <ServiciosHeaderDesktop subtitle="Encuentra personas que ayudan">
              <OfreceToggle value="ofrezco" embedded/>
            </ServiciosHeaderDesktop>
          </div>
        </div>

        {/* Toggle */}
        <div>
          <SpecLabel n="02" t="Segmented control Ofrezco/Solicito" d="Tono cálido en primera persona. Activo: gradient sky-600→700 + shadow teñida" />
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-md space-y-3">
            <OfreceToggle value="ofrezco"/>
            <OfreceToggle value="solicito"/>
          </div>
        </div>

        {/* Chips */}
        <div>
          <SpecLabel n="03" t="Pill chip de filtro" d="border-2 slate-300 · activo: bg-sky-100 border-sky-500 text-sky-700" />
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-md flex flex-wrap gap-2">
            <Chip>Default</Chip>
            <Chip active>Activo</Chip>
            <Chip dot>Con dot</Chip>
            <Chip removable>Removable</Chip>
            <Chip icon={<I.pin size={11}/>}>Con ícono</Chip>
            <Chip icon={<I.clock size={11}/>}>Disponible hoy</Chip>
          </div>
        </div>

        {/* FAB */}
        <div>
          <SpecLabel n="04" t="FAB Publicar" d="Pill con ícono en burbuja interna. Sombra teñida sky-500/40" />
          <div className="rounded-2xl bg-slate-200 p-8 border border-slate-200 shadow-md grid place-items-center">
            <FAB inline/>
          </div>
        </div>

        {/* Bottom bar */}
        <div>
          <SpecLabel n="05" t="Bottom bar de contacto" d="2 botones · ChatYA dominante + WhatsApp icónico verde" />
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-md">
            <div className="flex items-center gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30">
                <I.chat size={16}/> Contactar por ChatYA
              </button>
              <button className="w-12 h-12 rounded-xl bg-emerald-500 text-white grid place-items-center">
                <I.whatsapp size={20}/>
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
              versión móvil → fija al bottom · versión desktop → sticky en card lateral
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div>
          <SpecLabel n="06" t="Botones — escala" d="Default border-2 slate-300, CTA gradient sky con shadow teñida" />
          <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-md flex flex-wrap gap-2 items-center">
            <button className="px-4 py-2 rounded-full bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[13px] shadow-md shadow-sky-500/30">CTA primario</button>
            <button className="px-4 py-2 rounded-full border-2 border-slate-300 text-slate-700 font-bold text-[13px]">Secundario</button>
            <button className="px-4 py-2 rounded-full bg-slate-900 text-white font-bold text-[13px]">Sobre dark</button>
            <button className="px-3 py-1.5 text-sky-700 font-bold text-[13px]">Inline →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
window.ComponentesBase = ComponentesBase;

function SpecLabel({ n, t, d }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-700">{n}</span>
      <div>
        <div className="text-[15px] font-extrabold tracking-tight text-slate-900">{t}</div>
        <div className="text-[12px] text-slate-600">{d}</div>
      </div>
    </div>
  );
}

/* ============================ DECISIONES (cierre) ============================ */
function Decisiones() {
  const items = [
    { t: 'Toggle dentro del header en desktop, fuera en móvil',
      d: 'En desktop hay aire para integrarlo en la fila negra; en móvil "flota" sobre el header con shadow para mantener la jerarquía. Descarté: ponerlo siempre fuera (rompía el ritmo en desktop) y volverlo sticky propio (duplicaba sombras).' },
    { t: 'Toggle Solicito = card amber, no card sky en otro tono',
      d: 'El acento sky se reservó para "Ofrezco". Solicitudes usan amber-50 muy sutil — diferencia clara sin sumar un segundo acento. Descarté: chip "Solicito" en sky-50 (se confundía con vacantes).' },
    { t: 'Card vacante con banda sky-50 + logo, NO foto grande',
      d: 'Una vacante de empresa no tiene "foto del trabajo". Mejor identidad de marca y aire. Descarté: foto stock del local (se sentía falso) y card horizontal (rompía la rejilla).' },
    { t: 'CTA principal = ChatYA, WhatsApp = ícono auxiliar',
      d: 'AnunciaYA quiere convertir tráfico a ChatYA. WhatsApp queda visible pero secundario en peso. Descarté: dos botones de igual peso (50/50 hacía perder el sesgo del producto).' },
    { t: 'Verificado = ícono escudo + texto, NO check oro/azul',
      d: 'El check con escudo lee como "verificado por la app" y no compite con la jerarquía emocional de las estrellas. Descarté: tick azul tipo red social (asociación errónea).' },
    { t: 'Mapa con radio aproximado, sin marker exacto',
      d: 'Cubre la privacidad del prestador sin obligar a leer la zona en texto. Descarté: ocultar el mapa por completo (perdía utilidad).' },
    { t: 'Sin botón Reportar; lo dijo el brief — moderación auto',
      d: 'Lista de palabras prohibidas + TTL 30 días. La UX se sostiene con menos chrome y menos disputas.' },
    { t: 'Filtros laterales en desktop, sheet en móvil (a futuro)',
      d: 'El brief lo pide así. En el feed las pills bastan; los filtros densos viven en /buscar.' },
  ];
  return (
    <div className="w-[1280px] bg-slate-900 text-white p-10">
      <div className="text-[12px] font-bold uppercase tracking-wider text-sky-400 mb-1">Cierre</div>
      <h2 className="text-[28px] font-extrabold tracking-tight mb-2">Decisiones que tomé</h2>
      <p className="text-[14px] text-slate-300 mb-7 max-w-[70ch]">
        Síntesis (~140 palabras) de qué se decidió y qué se descartó. Los principios del brief mandaron;
        solo añadí matices donde la mecánica móvil/desktop o el modelo (servicio vs vacante vs solicitud) lo pedían.
      </p>
      <div className="grid grid-cols-2 gap-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-2xl bg-slate-800 border border-slate-700 p-4">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold text-sky-400">{String(i + 1).padStart(2, '0')}</span>
              <div className="text-[14px] font-extrabold tracking-tight">{it.t}</div>
            </div>
            <div className="text-[12px] text-slate-300 leading-relaxed">{it.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.Decisiones = Decisiones;
