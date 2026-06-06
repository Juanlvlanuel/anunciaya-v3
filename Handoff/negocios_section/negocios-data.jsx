/* negocios-data.jsx — sample businesses + status meta. Exposes window.NegociosData */
(function () {
  // Payment statuses with their visual identity
  const STATUS = {
    corriente:  { id: "corriente",  label: "Al corriente", color: "#0e8a52", bg: "#0e8a52" },
    gracia:     { id: "gracia",     label: "En gracia",    color: "#b06a00", bg: "#d9920a" },
    suspendido: { id: "suspendido", label: "Suspendido",   color: "#c4332f", bg: "#e0322f" },
    cancelado:  { id: "cancelado",  label: "Cancelado",    color: "#6b7280", bg: "#9aa1ac" },
  };

  // category → accent color for the avatar tile
  const CAT = {
    "Alimentos":   "#b3541e",
    "Panadería":   "#b07a16",
    "Comercio":    "#1f6feb",
    "Servicios":   "#0e7c66",
    "Salud":       "#2a8a5b",
    "Automotriz":  "#5b5bd6",
    "Turismo":     "#0e7490",
    "Belleza":     "#b03a86",
  };

  function initials(name) {
    const w = name.replace(/^(el|la|los|las)\s+/i, "").trim().split(/\s+/);
    return ((w[0]?.[0] || "") + (w[1]?.[0] || "")).toUpperCase();
  }

  // 21 businesses
  const RAW = [
    { name: "Car Wash el Güero", cat: "Automotriz", city: "Puerto Peñasco", region: "Por configurar",
      status: "corriente", vendedor: null, owner: { nombre: "Rogelio Vega Luna", correo: "rogelio.vega@test.com", tel: "—" },
      dir: "Blvd. Benito Juárez 412", tel: "+52 6381120044", web: "carwashguero.mx", alta: "12 ene 2026", onboarding: "Completado",
      vence: "—", proximo: "—", primer: "—", tags: ["Lavado", "Detallado"] },
    { name: "Panadería Tijuana", cat: "Panadería", city: "Puerto Peñasco", region: "Por configurar",
      status: "corriente", vendedor: "Diego Salas", owner: { nombre: "Gabriela Núñez Portillo", correo: "gabriela.nunez@test.com", tel: "—" },
      dir: "Av. Luis Encinas Johnson", tel: "+52 6381128286", web: "panaderiatijuana.mx", alta: "10 feb 2026", onboarding: "Completado",
      vence: "28 jun 2026", proximo: "28 jun 2026", primer: "10 feb 2026", tags: ["Pan Dulce", "Birotes", "Pan de Muertos"] },
    { name: "Negocio Test E2E", cat: "Comercio", city: "—", region: "—",
      status: "gracia", vendedor: null, owner: { nombre: "Cuenta de pruebas", correo: "qa@test.com", tel: "—" },
      dir: "—", tel: "—", web: "—", alta: "01 mar 2026", onboarding: "Pendiente",
      vence: "05 jun 2026", proximo: "—", primer: "—", tags: [] },
    { name: "Zapatería Peñasco", cat: "Comercio", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: "Diego Salas", owner: { nombre: "Marisol Carrillo", correo: "marisol.c@test.com", tel: "+52 6381140912" },
      dir: "Calle 13 #88, Col. Centro", tel: "+52 6381140912", web: "—", alta: "22 ene 2026", onboarding: "Completado",
      vence: "22 jul 2026", proximo: "22 jul 2026", primer: "22 ene 2026", tags: ["Calzado", "Ropa"] },
    { name: "Tacos el Güero", cat: "Alimentos", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: "Mariana Ojeda", owner: { nombre: "Héctor Domínguez", correo: "hector.d@test.com", tel: "+52 6383321177" },
      dir: "Malecón Fundadores s/n", tel: "+52 6383321177", web: "tacoselguero.mx", alta: "05 dic 2025", onboarding: "Completado",
      vence: "05 jul 2026", proximo: "05 jul 2026", primer: "05 dic 2025", tags: ["Tacos", "Mariscos"] },
    { name: "Refaccionaria El Motor", cat: "Automotriz", city: "Sonoyta", region: "Norte",
      status: "gracia", vendedor: "Mariana Ojeda", owner: { nombre: "Raúl Espinoza", correo: "raul.espinoza@test.com", tel: "+52 6512208841" },
      dir: "Carr. Internacional km 2", tel: "+52 6512208841", web: "—", alta: "18 nov 2025", onboarding: "Completado",
      vence: "03 jun 2026", proximo: "03 jun 2026", primer: "18 nov 2025", tags: ["Refacciones", "Aceites"] },
    { name: "Plomería Express", cat: "Servicios", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: null, owner: { nombre: "Jorge Medina", correo: "jorge.medina@test.com", tel: "—" },
      dir: "Col. Las Conchas, Lt 14", tel: "+52 6381159003", web: "—", alta: "30 ene 2026", onboarding: "Completado",
      vence: "30 jul 2026", proximo: "30 jul 2026", primer: "30 ene 2026", tags: ["Plomería", "Urgencias 24h"] },
    { name: "Mariscos El Capitán", cat: "Alimentos", city: "Puerto Peñasco", region: "Centro",
      status: "suspendido", vendedor: "Diego Salas", owner: { nombre: "Lupita Sandoval", correo: "lupita.s@test.com", tel: "+52 6383310099" },
      dir: "Av. del Mar 220", tel: "+52 6383310099", web: "mariscoscapitan.mx", alta: "14 oct 2025", onboarding: "Completado",
      vence: "12 may 2026", proximo: "—", primer: "14 oct 2025", tags: ["Mariscos", "Restaurante"] },
    { name: "Taxi Seguro Peñasco", cat: "Servicios", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: null, owner: { nombre: "Sitio 8 de Octubre", correo: "sitio8@test.com", tel: "+52 6381102233" },
      dir: "Base Terminal de Autobuses", tel: "+52 6381102233", web: "—", alta: "08 feb 2026", onboarding: "Completado",
      vence: "08 ago 2026", proximo: "08 ago 2026", primer: "08 feb 2026", tags: ["Transporte"] },
    { name: "Farmacia San Ángel", cat: "Salud", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: "Mariana Ojeda", owner: { nombre: "Dra. Ana Beltrán", correo: "ana.beltran@test.com", tel: "+52 6381173456" },
      dir: "Blvd. Fremont 305", tel: "+52 6381173456", web: "farmaciasanangel.mx", alta: "27 ene 2026", onboarding: "Completado",
      vence: "27 jul 2026", proximo: "27 jul 2026", primer: "27 ene 2026", tags: ["Medicamentos", "24 horas"] },
    { name: "Contadora Fernanda", cat: "Servicios", city: "Puerto Peñasco", region: "Centro",
      status: "gracia", vendedor: null, owner: { nombre: "Fernanda Ríos", correo: "fernanda.rios@test.com", tel: "+52 6381188211" },
      dir: "Despacho 4, Plaza del Sol", tel: "+52 6381188211", web: "—", alta: "03 mar 2026", onboarding: "Pendiente",
      vence: "07 jun 2026", proximo: "—", primer: "03 mar 2026", tags: ["Contabilidad", "Fiscal"] },
    { name: "Estética Glamour", cat: "Belleza", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: "Diego Salas", owner: { nombre: "Karla Figueroa", correo: "karla.fig@test.com", tel: "+52 6383349900" },
      dir: "Calle 26 #51", tel: "+52 6383349900", web: "—", alta: "19 feb 2026", onboarding: "Completado",
      vence: "19 ago 2026", proximo: "19 ago 2026", primer: "19 feb 2026", tags: ["Corte", "Uñas", "Spa"] },
    { name: "Bar La Palapa", cat: "Alimentos", city: "Puerto Peñasco", region: "Centro",
      status: "cancelado", vendedor: null, owner: { nombre: "Marco Téllez", correo: "marco.tellez@test.com", tel: "—" },
      dir: "Playa Hermosa, acceso 3", tel: "+52 6383300011", web: "—", alta: "02 sep 2025", onboarding: "Completado",
      vence: "02 abr 2026", proximo: "—", primer: "02 sep 2025", tags: ["Bar", "Botanas"] },
    { name: "Tours Peñasco Adventures", cat: "Turismo", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: "Mariana Ojeda", owner: { nombre: "Brian Cooper", correo: "brian.cooper@test.com", tel: "+52 6381166789" },
      dir: "Marina Fonatur, Local 9", tel: "+52 6381166789", web: "penascoadventures.com", alta: "11 ene 2026", onboarding: "Completado",
      vence: "11 jul 2026", proximo: "11 jul 2026", primer: "11 ene 2026", tags: ["Tours", "Pesca", "ATV"] },
    { name: "Ferretería del Puerto", cat: "Comercio", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: null, owner: { nombre: "Saúl Padilla", correo: "saul.padilla@test.com", tel: "+52 6381144556" },
      dir: "Blvd. Juárez 980", tel: "+52 6381144556", web: "—", alta: "24 ene 2026", onboarding: "Completado",
      vence: "24 jul 2026", proximo: "24 jul 2026", primer: "24 ene 2026", tags: ["Herramienta", "Material"] },
    { name: "Cafetería Malecón", cat: "Alimentos", city: "Puerto Peñasco", region: "Centro",
      status: "gracia", vendedor: "Diego Salas", owner: { nombre: "Paola Iñiguez", correo: "paola.in@test.com", tel: "+52 6383327788" },
      dir: "Malecón Fundadores 14", tel: "+52 6383327788", web: "—", alta: "06 mar 2026", onboarding: "Completado",
      vence: "06 jun 2026", proximo: "06 jun 2026", primer: "06 mar 2026", tags: ["Café", "Postres"] },
    { name: "Hotel Playa Bonita", cat: "Turismo", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: "Mariana Ojeda", owner: { nombre: "Grupo Hotelero PB", correo: "reservas@playabonita.mx", tel: "+52 6383320150" },
      dir: "Paseo Balboa 100", tel: "+52 6383320150", web: "playabonita.mx", alta: "15 dic 2025", onboarding: "Completado",
      vence: "15 jun 2026", proximo: "15 jun 2026", primer: "15 dic 2025", tags: ["Hotel", "Playa"] },
    { name: "Lavandería Express", cat: "Servicios", city: "Sonoyta", region: "Norte",
      status: "corriente", vendedor: null, owner: { nombre: "Norma Galván", correo: "norma.g@test.com", tel: "—" },
      dir: "Av. 5 de Mayo 33", tel: "+52 6512214477", web: "—", alta: "21 feb 2026", onboarding: "Completado",
      vence: "21 ago 2026", proximo: "21 ago 2026", primer: "21 feb 2026", tags: ["Lavado", "Planchado"] },
    { name: "Gimnasio FitZone", cat: "Salud", city: "Puerto Peñasco", region: "Centro",
      status: "suspendido", vendedor: "Diego Salas", owner: { nombre: "Iván Robles", correo: "ivan.robles@test.com", tel: "+52 6381199876" },
      dir: "Plaza Las Glorias L3", tel: "+52 6381199876", web: "fitzone.mx", alta: "09 nov 2025", onboarding: "Completado",
      vence: "01 may 2026", proximo: "—", primer: "09 nov 2025", tags: ["Gimnasio", "Clases"] },
    { name: "Veterinaria Huellas", cat: "Salud", city: "Puerto Peñasco", region: "Centro",
      status: "corriente", vendedor: "Mariana Ojeda", owner: { nombre: "MVZ Diana Sosa", correo: "diana.sosa@test.com", tel: "+52 6383342211" },
      dir: "Calle 12 #240", tel: "+52 6383342211", web: "—", alta: "17 feb 2026", onboarding: "Completado",
      vence: "17 ago 2026", proximo: "17 ago 2026", primer: "17 feb 2026", tags: ["Mascotas", "Consultas"] },
    { name: "Carnicería La Sonorense", cat: "Alimentos", city: "Sonoyta", region: "Norte",
      status: "corriente", vendedor: null, owner: { nombre: "Don Beto Quintero", correo: "beto.q@test.com", tel: "—" },
      dir: "Mercado Municipal L8", tel: "+52 6512200033", web: "—", alta: "29 ene 2026", onboarding: "Completado",
      vence: "29 jul 2026", proximo: "29 jul 2026", primer: "29 ene 2026", tags: ["Carnes", "Asadero"] },
  ];

  const BUSINESSES = RAW.map((b, i) => ({
    id: "b" + (i + 1),
    initials: initials(b.name),
    accent: CAT[b.cat] || "#1f6feb",
    ...b,
  }));

  // distinct vendedores for the filter
  const VENDEDORES = Array.from(new Set(BUSINESSES.map((b) => b.vendedor).filter(Boolean))).sort();

  function counts(list) {
    const c = { all: list.length, corriente: 0, gracia: 0, suspendido: 0, cancelado: 0 };
    list.forEach((b) => { c[b.status]++; });
    return c;
  }

  window.NegociosData = { STATUS, BUSINESSES, VENDEDORES, counts };
})();
