/* App entry — design canvas with all artboards */
const { useState } = React;

const sections = [
  {
    id: 'feed',
    title: '01 — Feed Servicios',
    subtitle: 'Punto de entrada · `/servicios`',
    artboards: [
      { id: 'feed-mobile', label: 'Móvil 375 — default', width: 375, height: 980, render: () => <FeedMobile/> },
      { id: 'feed-mobile-empty', label: 'Móvil 375 — vacío', width: 375, height: 900, render: () => <FeedMobileEmpty/> },
      { id: 'feed-desktop', label: 'Desktop 1440', width: 1440, height: 1280, render: () => <FeedDesktop/> },
    ],
  },
  {
    id: 'detalle',
    title: '02 — Detalle Servicio / Vacante',
    subtitle: 'Convencer y contactar · `/servicios/:id`',
    artboards: [
      { id: 'detalle-mobile-serv', label: 'Móvil — Servicio personal', width: 375, height: 1740, render: () => <DetalleMobile tipo="servicio"/> },
      { id: 'detalle-mobile-vac', label: 'Móvil — Vacante empresa', width: 375, height: 1720, render: () => <DetalleMobile tipo="vacante"/> },
      { id: 'detalle-mobile-pausa', label: 'Móvil — Pausado', width: 375, height: 880, render: () => <DetallePausado/> },
      { id: 'detalle-desktop', label: 'Desktop 1440', width: 1440, height: 1480, render: () => <DetalleDesktop/> },
    ],
  },
  {
    id: 'wizard',
    title: '03 — Wizard Publicar',
    subtitle: 'Que publicar tarde < 3 min · `/servicios/publicar`',
    artboards: [
      { id: 'wiz-1', label: 'Móvil — Paso 1 (tipo)', width: 375, height: 812, render: () => <WizardMobileStep1/> },
      { id: 'wiz-2', label: 'Móvil — Paso 2 (info)', width: 375, height: 1060, render: () => <WizardMobileStep2/> },
      { id: 'wiz-4', label: 'Móvil — Paso 4 (confirmar)', width: 375, height: 1100, render: () => <WizardMobileStep4/> },
      { id: 'wiz-desktop', label: 'Desktop — Paso 3 con preview en vivo', width: 1440, height: 1080, render: () => <WizardDesktop/> },
    ],
  },
  {
    id: 'perfil',
    title: '04 — Perfil del Prestador',
    subtitle: 'Dar confianza para contactar · `/servicios/usuario/:id`',
    artboards: [
      { id: 'perfil-mobile', label: 'Móvil 375', width: 375, height: 1280, render: () => <PerfilMobile/> },
      { id: 'perfil-vacio', label: 'Móvil — Reseñas vacío', width: 375, height: 720, render: () => <PerfilVacio/> },
      { id: 'perfil-desktop', label: 'Desktop 1440', width: 1440, height: 1180, render: () => <PerfilDesktop/> },
    ],
  },
  {
    id: 'buscador',
    title: '05 — Buscador (overlay del Navbar global)',
    subtitle: 'Se abre desde el input que ya vive en el Navbar · sin input propio en el feed',
    artboards: [
      { id: 'busc-mobile-empty', label: 'Móvil — Query vacío', width: 375, height: 980, render: () => <BuscadorMobileEmpty/> },
      { id: 'busc-mobile-query', label: 'Móvil — Sugerencias en vivo', width: 375, height: 900, render: () => <BuscadorMobileQuery/> },
      { id: 'busc-desktop', label: 'Desktop — Dropdown 600px', width: 1440, height: 820, render: () => <BuscadorDesktop/> },
      { id: 'busc-result', label: 'Desktop — Resultados', width: 1440, height: 1100, render: () => <ResultadosDesktop/> },
      { id: 'busc-vacio', label: 'Móvil — Sin resultados', width: 375, height: 812, render: () => <ResultadosVacioMobile/> },
    ],
  },
  {
    id: 'sistema',
    title: '06 — Sistema',
    subtitle: 'Variantes de Card · componentes base · decisiones',
    artboards: [
      { id: 'cards-comp', label: 'Variantes de Card', width: 1280, height: 720, render: () => <CardsComparativa/> },
      { id: 'componentes', label: 'Componentes base', width: 1280, height: 1100, render: () => <ComponentesBase/> },
      { id: 'decisiones', label: 'Decisiones tomadas', width: 1280, height: 800, render: () => <Decisiones/> },
    ],
  },
];

function App() {
  return (
    <DesignCanvas
      title="Servicios — AnunciaYA"
      subtitle="5 pantallas responsive (móvil 375 + desktop 1440) · sistema sky-only sobre slate · estética Linear/Stripe"
    >
      {sections.map((s) => (
        <DCSection key={s.id} id={s.id} title={s.title} subtitle={s.subtitle}>
          {s.artboards.map((a) => (
            <DCArtboard key={a.id} id={a.id} label={a.label} width={a.width} height={a.height}>
              {a.render()}
            </DCArtboard>
          ))}
        </DCSection>
      ))}
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
