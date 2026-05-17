// Datos compartidos de los drawers
window.DRAWER_DATA = {
  personal: {
    initial: "J",
    name: "Juan Manuel Valenzuela",
    email: "vj.juan.24@gmail.com",
    items: [
      { id: "pub", label: "Mis Publicaciones", icon: "box" },
      { id: "sav", label: "Mis Guardados",     icon: "bookmark" },
      { id: "prf", label: "Mi Perfil",         icon: "user" },
    ],
  },
  comercial: {
    initial: "F",
    name: "Imprenta FindUS",
    email: "findusmx@gmail.com",
    items: [
      { id: "sav", label: "Mis Guardados", icon: "bookmark" },
      { id: "prf", label: "Mi Perfil",     icon: "user" },
    ],
  },
};

// Mobile carries más items (sub-apps + utilidades del ecosistema)
// Cada item lleva un tile con su color de marca.
window.DRAWER_DATA_MOBILE = {
  personal: {
    initial: "J",
    name: "Juan Manuel Valenzuela",
    email: "vj.juan.24@gmail.com",
    items: [
      { id: "loc",  label: "Puerto Peñasco",   icon: "pin",      tile: "#2244C8" },
      { id: "card", label: "CardYA",           icon: "card",     tile: "#F58220" },
      { id: "cup",  label: "Mis Cupones",      icon: "ticket",   tile: "#2D9C5F" },
      { id: "pub",  label: "Mis Publicaciones",icon: "box",      tile: "#2244C8" },
      { id: "sav",  label: "Mis Guardados",    icon: "bookmark", tile: "#DC3545" },
      { id: "prf",  label: "Mi Perfil",        icon: "user",     tile: "#475569" },
    ],
  },
  comercial: {
    initial: "F",
    name: "Imprenta FindUS",
    email: "findusmx@gmail.com",
    items: [
      { id: "loc", label: "Puerto Peñasco",  icon: "pin",      tile: "#2244C8" },
      { id: "scn", label: "ScanYA",          icon: "scan",     tile: "#1F2937" },
      { id: "biz", label: "Business Studio", icon: "chart",    tile: "#0EA5E9" },
      { id: "sav", label: "Mis Guardados",   icon: "bookmark", tile: "#DC3545" },
      { id: "prf", label: "Mi Perfil",       icon: "user",     tile: "#475569" },
    ],
  },
};
