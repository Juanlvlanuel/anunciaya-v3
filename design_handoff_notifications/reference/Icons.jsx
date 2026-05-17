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
    case "bell":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2H4.5L6 17Z" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "trash":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M4 7h16" />
          <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      );
    case "star":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2Z" />
        </svg>
      );
    case "coin":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M14.5 9.5C14.5 8.5 13.5 8 12 8s-2.5.5-2.5 1.5S10.5 11 12 11s2.5.5 2.5 1.5S13.5 14 12 14s-2.5-.5-2.5-1.5" />
          <path d="M12 7v10" />
        </svg>
      );
    case "gift":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M4 12h16v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Z" />
          <path d="M3 9h18v3H3z" />
          <path d="M12 9v12" />
          <path d="M12 9c-2-3-6-3-6-1s2 2 3 1l3 0Z" />
          <path d="M12 9c2-3 6-3 6-1s-2 2-3 1l-3 0Z" />
        </svg>
      );
    case "warning":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M12 3 2 20h20L12 3Z" />
          <path d="M12 10v5" />
          <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "chart-up":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M3 17 9 11l4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      );
    case "clock":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "check-circle":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );
    case "sparkle":
      return (
        <svg style={s} viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M12 3.5 13.4 9 19 10.4 13.4 11.8 12 17.3 10.6 11.8 5 10.4 10.6 9 12 3.5Z" />
          <path d="M19 14.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7Z" />
        </svg>
      );
    case "filter":
      return (
        <svg style={s} viewBox="0 0 24 24" {...p}>
          <path d="M4 6h16" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
      );
    default:
      return null;
  }
};

window.Icon = Icon;
