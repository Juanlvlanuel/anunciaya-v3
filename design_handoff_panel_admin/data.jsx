/* data.jsx — menu config, role visibility, regions, users. Exposes window.PanelData */
(function () {
  // Menu, grouped. `roles` lists which roles see the item.
  // `labelFor` overrides the label per role (vendedor sees personal labels).
  const GROUPS = [
    {
      id: "general", label: "General", items: [
        { id: "resumen", label: "Resumen", icon: "resumen", roles: ["super", "gerente", "vendedor"] },
        { id: "metricas", label: "Métricas", icon: "metricas", roles: ["super", "gerente", "vendedor"] },
      ],
    },
    {
      id: "operacion", label: "Operación", items: [
        { id: "negocios", label: "Negocios", icon: "negocios", roles: ["super", "gerente", "vendedor"],
          labelFor: { vendedor: "Mi cartera" }, count: { super: 248, gerente: 64, vendedor: 19 } },
        { id: "usuarios", label: "Usuarios", icon: "usuarios", roles: ["super"] },
        { id: "suscripciones", label: "Suscripciones", icon: "suscripciones", roles: ["super", "gerente"] },
      ],
    },
    {
      id: "ventas", label: "Red de ventas", items: [
        { id: "comisiones", label: "Vendedores y comisiones", icon: "comisiones", roles: ["super", "gerente", "vendedor"],
          labelFor: { vendedor: "Mis comisiones" } },
      ],
    },
    {
      id: "crecimiento", label: "Crecimiento", items: [
        { id: "publicidad", label: "Publicidad", icon: "publicidad", roles: ["super", "gerente"] },
        { id: "ciudades", label: "Ciudades", icon: "ciudades", roles: ["super"] },
      ],
    },
    {
      id: "admin", label: "Administración", items: [
        { id: "configuracion", label: "Configuración", icon: "configuracion", roles: ["super"] },
        { id: "equipo", label: "Equipo y accesos", icon: "equipo", roles: ["super", "gerente"],
          labelFor: { gerente: "Equipo y accesos" } },
        { id: "sistema", label: "Sistema", icon: "sistema", roles: ["super"] },
      ],
    },
  ];

  // Admin work queue — actionable tasks, NOT social notifications.
  // Role-scoped: SuperAdmin = whole platform, Gerente = their region, Vendedor = personal.
  const NOTIF = {
    super: { count: 32, items: [
      { t: "Efectivo por confirmar", s: "12 vendedores · $164,300 MXN", icon: "comisiones" },
      { t: "Negocios en gracia", s: "18 negocios por suspenderse", icon: "negocios" },
      { t: "Vendedores con faltante", s: "2 vendedores · $7,400 MXN", icon: "usuarios" },
    ]},
    gerente: { count: 9, items: [
      { t: "Efectivo por confirmar", s: "3 vendedores · $28,600 MXN", icon: "comisiones" },
      { t: "Negocios en gracia", s: "5 negocios por suspenderse", icon: "negocios" },
      { t: "Vendedores con faltante", s: "1 vendedor · $3,200 MXN", icon: "usuarios" },
    ]},
    vendedor: { count: 2, items: [
      { t: "Efectivo por entregar", s: "$3,200 MXN cobrados hoy", icon: "comisiones" },
      { t: "Negocio en gracia", s: "1 de tu cartera por suspenderse", icon: "negocios" },
    ]},
  };

  const REGIONS = [
    { id: "all", name: "Toda la plataforma", sub: "6 regiones · 38 ciudades" },
    { id: "centro", name: "Región Centro", sub: "CDMX · Toluca · Pachuca" },
    { id: "occidente", name: "Región Occidente", sub: "Guadalajara · Morelia" },
    { id: "norte", name: "Región Norte", sub: "Monterrey · Saltillo" },
    { id: "bajio", name: "Región Bajío", sub: "Querétaro · León" },
    { id: "sureste", name: "Región Sureste", sub: "Mérida · Cancún" },
  ];

  const USERS = {
    super:    { name: "Carlos Mendoza", role: "SuperAdmin", initials: "CM", color: "#1c5bd6", region: "all" },
    gerente:  { name: "Laura Ríos",     role: "Gerente regional", initials: "LR", color: "#0e7c66", region: "occidente" },
    vendedor: { name: "Diego Salas",    role: "Vendedor", initials: "DS", color: "#b3541e", region: "occidente" },
  };

  function labelOf(item, role) {
    return (item.labelFor && item.labelFor[role]) || item.label;
  }
  function groupsForRole(role) {
    return GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => it.roles.includes(role)),
    })).filter((g) => g.items.length > 0);
  }
  function flatItemsForRole(role) {
    return groupsForRole(role).flatMap((g) => g.items);
  }

  window.PanelData = { GROUPS, REGIONS, USERS, NOTIF, labelOf, groupsForRole, flatItemsForRole };
})();
