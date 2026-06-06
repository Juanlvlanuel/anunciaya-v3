/* icons.jsx — simple line-icon set rendered as React SVG. Exposes window.Icon */
(function () {
  const P = {
    // menu
    resumen: <><rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="5" rx="1.6"/><rect x="14" y="11.5" width="7" height="9.5" rx="1.6"/><rect x="3" y="13.5" width="7" height="7.5" rx="1.6"/></>,
    metricas: <><line x1="3.5" y1="20.5" x2="20.5" y2="20.5"/><line x1="7" y1="20.5" x2="7" y2="13"/><line x1="12" y1="20.5" x2="12" y2="6.5"/><line x1="17" y1="20.5" x2="17" y2="10"/></>,
    negocios: <><path d="M3.2 9.2 4.5 4.6A1 1 0 0 1 5.46 4h13.08a1 1 0 0 1 .96.6l1.3 4.6"/><path d="M5 9.2V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.2"/><path d="M3.2 9.2h17.6"/><path d="M9.5 20v-4.5h5V20"/></>,
    usuarios: <><circle cx="9" cy="8" r="3.3"/><path d="M3.4 19.4a5.6 5.6 0 0 1 11.2 0"/><path d="M15.6 5.4a3.1 3.1 0 0 1 0 5.4"/><path d="M16.9 13.5a5.3 5.3 0 0 1 3.7 5.4"/></>,
    suscripciones: <><rect x="2.5" y="5" width="19" height="14" rx="2.4"/><line x1="2.5" y1="9.4" x2="21.5" y2="9.4"/><line x1="6" y1="14.6" x2="10.5" y2="14.6"/></>,
    comisiones: <><circle cx="12" cy="12" r="8.6"/><path d="M14.6 9.1c-.6-.8-1.6-1.2-2.7-1.2-1.6 0-2.8.85-2.8 2.05 0 1.25 1.2 1.75 2.8 2.05 1.6.3 2.8.8 2.8 2.05 0 1.2-1.2 2.05-2.8 2.05-1.1 0-2.1-.4-2.7-1.2"/><line x1="12" y1="6" x2="12" y2="7.7"/><line x1="12" y1="16.3" x2="12" y2="18"/></>,
    publicidad: <><path d="M4 10v4a1 1 0 0 0 1 1h2.2l5.3 4V5L7.2 9H5a1 1 0 0 0-1 1z"/><path d="M16.5 8.5a4.2 4.2 0 0 1 0 7"/></>,
    ciudades: <><path d="M12 21.2s-6.6-5.3-6.6-10.6A6.6 6.6 0 0 1 18.6 10.6C18.6 15.9 12 21.2 12 21.2z"/><circle cx="12" cy="10.3" r="2.5"/></>,
    configuracion: <><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.1" fill="var(--surface)"/><circle cx="15" cy="12" r="2.1" fill="var(--surface)"/><circle cx="8" cy="17" r="2.1" fill="var(--surface)"/></>,
    equipo: <><path d="M12 3 19 5.4v5.3c0 4.5-3 7.5-7 8.9-4-1.4-7-4.4-7-8.9V5.4L12 3z"/><path d="M9 12l2.1 2.1L15.2 10"/></>,
    sistema: <><rect x="3.4" y="4.6" width="17.2" height="6" rx="1.7"/><rect x="3.4" y="13.4" width="17.2" height="6" rx="1.7"/><circle cx="7" cy="7.6" r=".7" fill="currentColor" stroke="none"/><circle cx="7" cy="16.4" r=".7" fill="currentColor" stroke="none"/><line x1="10" y1="7.6" x2="12" y2="7.6"/><line x1="10" y1="16.4" x2="12" y2="16.4"/></>,
    // ui
    bell: <><path d="M6 9.5a6 6 0 0 1 12 0c0 4.5 1.4 5.7 2 6.5H4c.6-.8 2-2 2-6.5z"/><path d="M10.2 19.5a2 2 0 0 0 3.6 0"/></>,
    tasks: <><rect x="3.4" y="3.8" width="4.6" height="4.6" rx="1.2"/><path d="M4.5 6.1l.85.85 1.6-1.8"/><line x1="11" y1="6.1" x2="20.6" y2="6.1"/><rect x="3.4" y="13" width="4.6" height="4.6" rx="1.2"/><line x1="11" y1="15.3" x2="20.6" y2="15.3"/></>,
    chevronDown: <path d="M6 9.5 12 15l6-5.5"/>,
    chevronRight: <path d="M9.5 6 15 12l-5.5 6"/>,
    menu: <><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></>,
    x: <><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="20.5" y2="20.5"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.4" y1="5.4" x2="7.2" y2="7.2"/><line x1="16.8" y1="16.8" x2="18.6" y2="18.6"/><line x1="5.4" y1="18.6" x2="7.2" y2="16.8"/><line x1="16.8" y1="7.2" x2="18.6" y2="5.4"/></>,
    moon: <path d="M20.5 14.8A8.2 8.2 0 1 1 9.2 3.6 6.6 6.6 0 0 0 20.5 14.8z"/>,
    check: <path d="M5 12.5 9.5 17 19 6.5"/>,
    monitor: <><rect x="3" y="4" width="18" height="12.5" rx="2"/><line x1="8" y1="20.5" x2="16" y2="20.5"/><line x1="12" y1="16.5" x2="12" y2="20.5"/></>,
    smartphone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/></>,
    pin: <><path d="M12 21.2s-6.6-5.3-6.6-10.6A6.6 6.6 0 0 1 18.6 10.6C18.6 15.9 12 21.2 12 21.2z"/><circle cx="12" cy="10.3" r="2.5"/></>,
    globe: <><circle cx="12" cy="12" r="8.6"/><line x1="3.4" y1="12" x2="20.6" y2="12"/><path d="M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2z"/></>,
    help: <><circle cx="12" cy="12" r="8.6"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.7 1.1c0 1.7-2.3 2-2.3 3.5"/><circle cx="12" cy="17" r=".7" fill="currentColor" stroke="none"/></>,
    layers: <><path d="M12 3 21 8l-9 5-9-5 9-5z"/><path d="M3.5 12.5 12 17l8.5-4.5"/></>,
    inbox: <><path d="M3.5 13.5 6 6.2A1 1 0 0 1 7 5.5h10a1 1 0 0 1 1 .7l2.5 7.3"/><path d="M3.5 13.5V18a1 1 0 0 0 1 1h15a1 1 0 0 0 1-1v-4.5h-5a3 3 0 0 1-6 0H3.5z"/></>,
    dot: <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/>,
    logout: <><path d="M14 7.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1.5"/><path d="M10 12h10"/><path d="M17 9l3 3-3 3"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="M3.8 6.5 12 12.5l8.2-6"/></>,
    lock: <><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none"/></>,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M9.6 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.6"/><path d="M6.3 7.4A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.5-.66"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><line x1="3.5" y1="3.5" x2="20.5" y2="20.5"/></>,
    alert: <><path d="M12 4.5 21 19.5H3L12 4.5z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="16.8" r=".7" fill="currentColor" stroke="none"/></>,
    arrowLeft: <><line x1="20" y1="12" x2="5" y2="12"/><path d="M11 6 5 12l6 6"/></>,
    shieldCheck: <><path d="M12 3 19 5.4v5.3c0 4.5-3 7.5-7 8.9-4-1.4-7-4.4-7-8.9V5.4L12 3z"/><path d="M9 12l2.1 2.1L15.2 10"/></>,
    phone: <path d="M6.6 3.5 9 3.9l1 3.4-1.7 1.4a12 12 0 0 0 5.6 5.6l1.4-1.7 3.4 1 .4 2.4a1.4 1.4 0 0 1-1.4 1.6A14.5 14.5 0 0 1 4.4 5.0 1.4 1.4 0 0 1 6.6 3.5z"/>,
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/></>,
    externalLink: <><path d="M14 4h6v6"/><line x1="20" y1="4" x2="11" y2="13"/><path d="M18 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H11"/></>,
    tag: <><path d="M3.5 11.3V5.2a1.6 1.6 0 0 1 1.6-1.6h6.1a2 2 0 0 1 1.4.6l7 7a1.7 1.7 0 0 1 0 2.4l-5.9 5.9a1.7 1.7 0 0 1-2.4 0l-7-7a2 2 0 0 1-.8-1.2z"/><circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none"/></>,
    userSingle: <><circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></>,
    userPlus: <><circle cx="9" cy="8" r="3.4"/><path d="M3.5 20a5.8 5.8 0 0 1 11 0"/><line x1="18.5" y1="7" x2="18.5" y2="13"/><line x1="15.5" y1="10" x2="21.5" y2="10"/></>,
    moreH: <><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none"/></>,
    filter: <><path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z"/></>,
    clock: <><circle cx="12" cy="12" r="8.6"/><path d="M12 7.5V12l3 2"/></>,
    creditCard: <><rect x="2.5" y="5" width="19" height="14" rx="2.4"/><line x1="2.5" y1="9.4" x2="21.5" y2="9.4"/><line x1="6" y1="14.6" x2="10.5" y2="14.6"/></>,
    mapPin: <><path d="M12 21.2s-6.6-5.3-6.6-10.6A6.6 6.6 0 0 1 18.6 10.6C18.6 15.9 12 21.2 12 21.2z"/><circle cx="12" cy="10.3" r="2.5"/></>,
    store: <><path d="M3.2 9.2 4.5 4.6A1 1 0 0 1 5.46 4h13.08a1 1 0 0 1 .96.6l1.3 4.6"/><path d="M5 9.2V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.2"/><path d="M3.2 9.2h17.6"/><path d="M9.5 20v-4.5h5V20"/></>,
    ban: <><circle cx="12" cy="12" r="8.6"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    pauseCircle: <><circle cx="12" cy="12" r="8.6"/><line x1="10" y1="9" x2="10" y2="15"/><line x1="14" y1="9" x2="14" y2="15"/></>,
    checkCircle: <><circle cx="12" cy="12" r="8.6"/><path d="M8.5 12.2 11 14.7 15.7 9.5"/></>,
    sort: <><line x1="5" y1="7" x2="19" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/></>,
  };

  function Icon({ name, className = "ic", strokeWidth = 1.6, ...rest }) {
    const body = P[name];
    if (!body) return null;
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
        {body}
      </svg>
    );
  }
  window.Icon = Icon;
})();
