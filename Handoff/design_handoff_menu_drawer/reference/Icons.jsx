// Iconos stroke simples reutilizables. Color via currentColor.
const Icon = ({ name, size = 18, stroke = 1.6, style }) => {
  const s = { width: size, height: size, display: "inline-block", flexShrink: 0, ...style };
  const p = { fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "box":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
          <path d="M3 7.5 12 12l9-4.5" />
          <path d="M12 12v9" />
        </svg>
      );
    case "bookmark":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M6 4h12v17l-6-4-6 4V4Z" />
        </svg>
      );
    case "user":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
      );
    case "chevron":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "logout":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
          <path d="M10 16l-4-4 4-4" />
          <path d="M6 12h14" />
        </svg>
      );
    case "person":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5 20c1.2-3.5 4-5 7-5s5.8 1.5 7 5" />
        </svg>
      );
    case "store":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M4 9 5.5 5h13L20 9" />
          <path d="M4 9v10h16V9" />
          <path d="M4 9c0 1.7 1.3 3 3 3s3-1.3 3-3 1.3 3 3 3 3-1.3 3-3 1.3 3 3 3 3-1.3 3-3" />
        </svg>
      );
    case "check":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="m5 12 5 5 9-11" />
        </svg>
      );
    case "pin":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "card":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path d="M3 11h18" />
          <path d="M7 15.5h3.5" />
        </svg>
      );
    case "scan":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
          <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
          <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20H8" />
          <path d="M16 20h2.5A1.5 1.5 0 0 0 20 18.5V16" />
          <path d="M4 12h16" />
        </svg>
      );
    case "chart":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M4 20h16" />
          <path d="M7 17v-5" />
          <path d="M12 17V8" />
          <path d="M17 17v-3" />
        </svg>
      );
    case "ticket":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
          <path d="M10 6v12" strokeDasharray="2 2" />
        </svg>
      );
    case "close":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    default:
      return null;
  }
};

window.Icon = Icon;
