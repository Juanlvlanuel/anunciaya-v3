/**
 * PaginaAnunciate.tsx
 * ===================
 * Página dedicada de compra de publicidad (checkout enfocado). El usuario elige carrusel(es), sube su
 * imagen, elige ciudades y ve el **desglose completo** del precio antes de pagar con Stripe. Se vende el
 * ESPACIO: el usuario sube su propia creatividad. Requiere sesión (ruta privada).
 *
 * Layout: header con identidad + 2/3 para los pasos (carruseles en fila + ciudades) y 1/3 para el
 * resumen sticky con el desglose línea por línea. Usa el ancho, sin scroll lateral.
 *
 * Paleta: neutra (slate) + dark gradient de marca para activos/CTA. Sin acentos azules (tokens AY).
 * Tipografía responsive de 3 breakpoints (móvil ≥14px · laptop 11px · desktop 14px) — Regla 1.
 *
 * Ubicación: apps/web/src/pages/private/publicidad/PaginaAnunciate.tsx
 */

import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, Upload, Check, MapPin, Search, Loader2, CreditCard, ShieldCheck, Megaphone, Star, Award, X, Ratio } from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { useCiudades } from '../../../hooks/queries/useCiudades';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import { LogoStripe } from '../../../components/ui/LogoStripe';
import { ICONOS } from '../../../config/iconos';
import { useNotificacionesStore } from '../../../stores/useNotificacionesStore';
import { useUiStore } from '../../../stores/useUiStore';
import { IconoMenuMorph } from '../../../components/ui/IconoMenuMorph';
import { ModalAdaptativo } from '../../../components/ui/ModalAdaptativo';
import { notificar } from '../../../utils/notificaciones';
import {
  obtenerOpcionesPublicidad,
  obtenerPrecioPublicidad,
  subirImagenPublicidad,
  descartarImagenesPublicidad,
  descartarImagenesPublicidadBeacon,
  crearCheckoutPublicidad,
  obtenerAnuncioRenovable,
  renovarPublicidad,
  type Carrusel,
  type OpcionesPublicidad,
  type DesglosePrecio,
} from '../../../services/publicidadService';

// Ícono de notificaciones migrado a Iconify (mismo patrón que Mis Cupones).
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;

// La pauta se elige por TAMAÑO: Grande (banner) arriba · Chico (tarjeta) abajo.
// 'fundadores' ya no se vende (es regalo a los primeros negocios de cada ciudad).
const CARRUSELES: Carrusel[] = ['patrocinadores', 'anuncios'];
const LABEL: Record<Carrusel, string> = { patrocinadores: 'Grande', anuncios: 'Chico', fundadores: 'Fundadores' };
const DESC: Record<Carrusel, string> = {
  patrocinadores: 'Banner grande, el espacio más visible.',
  anuncios: 'Tarjeta pequeña que rota en la columna.',
  fundadores: 'Logo circular entre los fundadores.',
};
const ICONO: Record<Carrusel, typeof Megaphone> = { patrocinadores: Star, anuncios: Megaphone, fundadores: Award };
// Iconos de identidad en neutro (sin acentos de color — tokens AY).
const ACENTO: Record<Carrusel, string> = { patrocinadores: 'text-slate-700', anuncios: 'text-slate-700', fundadores: 'text-slate-700' };
// Medida recomendada de la creatividad por tamaño (coherente con el espacio real de la columna; px @~3x
// para que se vea nítida). Se muestra para que el anunciante diseñe a la medida exacta que se ocupa.
const MEDIDA: Record<Carrusel, string> = {
  patrocinadores: 'Vertical · 1080 × 1350 px (4:5)',
  anuncios: 'Horizontal · 1080 × 720 px (3:2)',
  fundadores: 'Cuadrado · 600 × 600 px (1:1)',
};
// El preview del uploader toma la FORMA real del espacio (vertical / horizontal / cuadrado) con el MISMO
// ancho para ambos — igual que en la columna, donde Grande y Chico comparten el ancho de la columna —
// para que el anunciante vea fielmente cómo quedará su creatividad recortada con object-cover.
const PREVIEW_BOX: Record<Carrusel, string> = {
  patrocinadores: 'mx-auto w-full max-w-[200px] aspect-[4/5]',
  anuncios: 'mx-auto w-full max-w-[200px] aspect-[3/2]',
  fundadores: 'mx-auto w-full max-w-[140px] aspect-square',
};
const FMT = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// Clave donde se espejan las URLs subidas en esta visita. Sobrevive a un refresh (el useRef no), para
// poder limpiar de R2 las creatividades que quedaron huérfanas si el `pagehide` no alcanzó a completar.
const STORAGE_PENDIENTES = 'anunciate:imagenesPendientes';

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const fmtFecha = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : `${String(d.getDate()).padStart(2, '0')} ${MESES_LARGOS[d.getMonth()]} ${d.getFullYear()}`;
};

// Tokens de texto responsive reutilizados (móvil / laptop / desktop) — Regla 1.
const TXT_CUERPO = 'text-sm lg:text-[11px] 2xl:text-sm';        // labels, descripciones, valores normales
const TXT_TITULO_SECCION = 'text-base lg:text-sm 2xl:text-base'; // títulos de paso / Resumen
const TXT_BADGE = 'text-xs lg:text-[11px] 2xl:text-xs';          // chips informativos (Lanzamiento, −%)

export default function PaginaAnunciate() {
  const volver = useVolverAtras('/inicio');
  const cuerpoRef = useScrollAppShell();
  const location = useLocation();
  const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
  const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
  const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);
  // Modo renovación: se llega desde "Renovar" en Mi Perfil con el id del anuncio a extender.
  const renovarId = (location.state as { renovarId?: string } | null)?.renovarId ?? null;
  const [vigenciaActual, setVigenciaActual] = useState<string | null>(null);

  const [carruseles, setCarruseles] = useState<Carrusel[]>([]);
  const [imagenes, setImagenes] = useState<Partial<Record<Carrusel, string>>>({});
  const [subiendo, setSubiendo] = useState<Carrusel | null>(null);
  const [ciudadIds, setCiudadIds] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [opciones, setOpciones] = useState<OpcionesPublicidad | null>(null);
  const [precio, setPrecio] = useState<DesglosePrecio | null>(null);
  const [meses, setMeses] = useState(1);
  const [pagando, setPagando] = useState(false);
  const [modalCiudadesAbierto, setModalCiudadesAbierto] = useState(false);
  // Creatividades subidas en esta visita: al salir sin pagar, el backend borra de R2 las que no quedaron
  // ligadas a un anuncio (reference count). Las pagadas quedan protegidas.
  const subidasSesion = useRef<Set<string>>(new Set());

  // Espeja el set en sessionStorage (sobrevive al refresh; el useRef no).
  const persistirPendientes = () => {
    try {
      const urls = Array.from(subidasSesion.current);
      if (urls.length) sessionStorage.setItem(STORAGE_PENDIENTES, JSON.stringify(urls));
      else sessionStorage.removeItem(STORAGE_PENDIENTES);
    } catch { /* sessionStorage no disponible */ }
  };
  const registrarSubida = (url: string) => { subidasSesion.current.add(url); persistirPendientes(); };
  const olvidarSubida = (url: string) => { subidasSesion.current.delete(url); persistirPendientes(); };

  useEffect(() => {
    obtenerOpcionesPublicidad().then(setOpciones).catch(() => {});
  }, []);

  // Modo renovación: precarga tamaños, imágenes y ciudades del anuncio a extender. Las imágenes
  // precargadas ya están ligadas al anuncio (no entran a `subidasSesion`, no se descartan al salir).
  useEffect(() => {
    if (!renovarId) return;
    obtenerAnuncioRenovable(renovarId)
      .then((a) => {
        if (!a) return;
        setCarruseles(a.carruseles);
        setImagenes(a.imagenes);
        if (a.ciudadIds.length) setCiudadIds(a.ciudadIds);
        setVigenciaActual(a.expiraAt);
      })
      .catch(() => {});
  }, [renovarId]);

  // RED DE SEGURIDAD (refresh/cierre): al montar, limpia de R2 las creatividades que una visita anterior
  // dejó pendientes (si el `pagehide` no alcanzó a completar). El reference count lo hace idempotente.
  useEffect(() => {
    try {
      const previas = sessionStorage.getItem(STORAGE_PENDIENTES);
      if (previas) {
        const urls = JSON.parse(previas) as unknown;
        if (Array.isArray(urls)) {
          const limpias = urls.filter((u): u is string => typeof u === 'string');
          if (limpias.length) void descartarImagenesPublicidad(limpias);
        }
        sessionStorage.removeItem(STORAGE_PENDIENTES);
      }
    } catch { /* sessionStorage no disponible o JSON inválido */ }
  }, []);

  // CANCELAR vía navegación SPA (botón back de la página, cambiar de ruta): al desmontar, descarta las
  // creatividades subidas no pagadas y limpia el espejo.
  useEffect(() => {
    return () => {
      const urls = Array.from(subidasSesion.current);
      if (urls.length) void descartarImagenesPublicidad(urls);
      try { sessionStorage.removeItem(STORAGE_PENDIENTES); } catch { /* noop */ }
    };
  }, []);

  // CANCELAR vía navegador (refrescar, cerrar pestaña, ir a una URL externa): el desmontaje de React no
  // corre de forma fiable, así que se usa `pagehide` + `fetch keepalive` (sobrevive a la descarga).
  useEffect(() => {
    const alSalir = () => {
      const urls = Array.from(subidasSesion.current);
      if (urls.length) descartarImagenesPublicidadBeacon(urls);
    };
    window.addEventListener('pagehide', alSalir);
    return () => window.removeEventListener('pagehide', alSalir);
  }, []);

  useEffect(() => {
    if (carruseles.length === 0 || ciudadIds.length === 0) {
      setPrecio(null);
      return;
    }
    let cancelado = false;
    obtenerPrecioPublicidad(carruseles, ciudadIds.length, meses)
      .then((p) => !cancelado && setPrecio(p))
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, [carruseles, ciudadIds.length, meses]);

  const limite = opciones?.limiteCiudades ?? 10;
  const duracion = opciones?.duracionDias ?? 30;
  const precioBase = (c: Carrusel) => opciones?.carruseles.find((o) => o.clave === c)?.precioBase ?? 0;
  // Precio de lanzamiento (oferta) del tamaño: 0 si no hay. Si > 0, se cobra este y el base se tacha.
  const precioLanzamiento = (c: Carrusel) => opciones?.carruseles.find((o) => o.clave === c)?.precioLanzamiento ?? 0;
  const precioEfectivo = (c: Carrusel) => (precioLanzamiento(c) > 0 ? precioLanzamiento(c) : precioBase(c));
  // En modo renovación el tamaño es FIJO (el del anuncio): solo se muestran esos y no se puede cambiar
  // (cambiar de tamaño sería otro anuncio → "Anunciar más"). Sí se puede cambiar la imagen.
  const tamanosVisibles = renovarId ? CARRUSELES.filter((c) => carruseles.includes(c)) : CARRUSELES;

  // Ciudades habilitadas (de la BD, reactivo vía React Query). Mientras solo haya 1, el paso "¿En qué
  // ciudades?" no tiene sentido: se auto-selecciona y se oculta. Al habilitar más en el Panel de Ciudades
  // el selector reaparece solo — sin tocar código (dinámico).
  const { data: ciudadesBD } = useCiudades();
  const ciudades = (ciudadesBD ?? []).filter((c): c is typeof c & { id: string } => !!c.id);
  const multiCiudad = ciudades.length > 1;
  const ciudadUnica = ciudades.length === 1 ? ciudades[0] : null;
  const numPasoTiempo = multiCiudad ? 3 : 2;
  const ciudadesFiltradas = (busqueda
    ? ciudades.filter((c) => `${c.nombre} ${c.estado}`.toLowerCase().includes(busqueda.toLowerCase()))
    : ciudades
  ).slice(0, 60);
  const nombreCiudad = (id: string) => ciudades.find((c) => c.id === id)?.nombre ?? '—';

  // Con una sola ciudad habilitada se selecciona sola (el paso queda oculto). Con 0 o varias, no toca.
  const ciudadUnicaId = ciudadUnica?.id ?? null;
  useEffect(() => {
    if (ciudadUnicaId) setCiudadIds([ciudadUnicaId]);
  }, [ciudadUnicaId]);

  const toggleCarrusel = (c: Carrusel) => {
    setCarruseles((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    if (carruseles.includes(c)) {
      // Al deseleccionar un tamaño con imagen ya subida, descártala (si no, queda huérfana en R2).
      const img = imagenes[c];
      if (img) { olvidarSubida(img); void descartarImagenesPublicidad([img]); }
      setImagenes((prev) => {
        const n = { ...prev };
        delete n[c];
        return n;
      });
    }
  };

  const onArchivo = async (c: Carrusel, file: File | undefined) => {
    if (!file) return;
    setSubiendo(c);
    try {
      const url = await subirImagenPublicidad(file);
      // Si se reemplaza una creatividad anterior del mismo tamaño, descarta la vieja (queda huérfana).
      const anterior = imagenes[c];
      if (anterior && anterior !== url) { olvidarSubida(anterior); void descartarImagenesPublicidad([anterior]); }
      registrarSubida(url);
      setImagenes((prev) => ({ ...prev, [c]: url }));
    } catch {
      notificar.error('No se pudo subir la imagen.');
    } finally {
      setSubiendo(null);
    }
  };

  const toggleCiudad = (id: string) =>
    setCiudadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= limite ? prev : [...prev, id]));

  // Cierra el modal de ciudades y limpia la búsqueda.
  const cerrarModalCiudades = () => { setModalCiudadesAbierto(false); setBusqueda(''); };
  // Al elegir en el modal: con límite 1 reemplaza y cierra (selección única);
  // con límite mayor, agrega/quita y el modal sigue abierto para elegir varias.
  const seleccionarCiudadModal = (id: string) => {
    if (limite === 1) {
      setCiudadIds([id]);
      cerrarModalCiudades();
    } else {
      toggleCiudad(id);
    }
  };

  const todasImagenes = carruseles.length > 0 && carruseles.every((c) => imagenes[c]);
  const puedePagar = todasImagenes && ciudadIds.length > 0 && ciudadIds.length <= limite && !subiendo && !pagando && !!precio;

  const pagar = async () => {
    if (!puedePagar) return;
    setPagando(true);
    try {
      const url = renovarId
        ? await renovarPublicidad(renovarId, { carruseles, imagenes, ciudadIds, meses })
        : await crearCheckoutPublicidad({ carruseles, imagenes, ciudadIds, meses });
      // Ya quedaron ligadas a la compra pendiente → no descartarlas al salir (pagehide/desmontaje).
      // Si el pago se abandona en Stripe, el cron de pendientes las limpia. Reference count = respaldo.
      subidasSesion.current.clear();
      try { sessionStorage.removeItem(STORAGE_PENDIENTES); } catch { /* noop */ }
      window.location.href = url;
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : 'No se pudo iniciar el pago.');
      setPagando(false);
    }
  };

  const conFactor = precio ? precio.base * precio.factor : 0;
  const descuentoMonto = precio && precio.esCombo ? conFactor - precio.mensual : 0;
  const ahorroPeriodo = precio ? precio.mensual * precio.meses * (precio.descuentoPeriodo / 100) : 0;

  // Identidad del header (acento indigo). El modo renovación ajusta título/subtítulo/label.
  const tituloHeader = renovarId ? <>Renovar <span className="text-cyan-400">anuncio</span></> : 'Anúnciate';
  const subtituloHeader = renovarId
    ? <>Extiende <span className="font-bold text-white">tu vigencia</span></>
    : <>Aparece en <span className="font-bold text-white">tu comunidad</span></>;
  const labelHeader = renovarId ? 'Renovación' : 'Espacio publicitario';

  return (
    // Móvil: app-shell propio (como BS) — columna flex que llena el shell fijo, con el header
    // FUERA del scroll (hermano shrink-0) y el cuerpo como contenedor con scroll propio. Así,
    // arrastrar el header oculta la barra del navegador y el scroll interno la mantiene oculta.
    // Desktop: vuelve a bloque normal (scroll en la columna central del layout).
    <div className="flex flex-col h-full bg-transparent lg:block lg:h-auto lg:min-h-full">
      {/* ── Header con identidad — calca Mis Cupones/CardYA (acento cyan). En móvil es un bloque
             fijo (shrink-0) fuera del scroll; en desktop vuelve a relative para no solaparse con
             el resumen sticky (aside) del checkout. ── */}
      <div className="shrink-0 z-20 lg:relative">
        <div className="lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8">
          <div className="relative overflow-hidden rounded-none lg:rounded-b-3xl" style={{ background: '#000000' }}>
            {/* Glow cyan */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(6,182,212,0.10) 0%, transparent 55%)' }} />
            {/* Grid pattern sutil */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                opacity: 0.08,
                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                  repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
              }}
            />
            {/* Línea de acento superior (cyan) */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none z-20"
              style={{ background: 'linear-gradient(90deg, transparent, #06b6d4 40%, #22d3ee 60%, transparent)' }}
            />
            {/* Línea de acento inferior (cyan) */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-20"
              style={{ background: 'linear-gradient(90deg, transparent, #06b6d4 40%, #22d3ee 60%, transparent)' }}
            />

            <div className="relative z-10">
              {/* ══ MOBILE HEADER (< lg) ══ */}
              <div className="lg:hidden">
                <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      data-testid="btn-volver-anunciate"
                      onClick={volver}
                      aria-label="Volver"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                      <Megaphone className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl font-extrabold text-white tracking-tight">{tituloHeader}</span>
                  </div>
                  <div className="flex items-center gap-0 -mr-1 shrink-0">
                    <button
                      type="button"
                      data-testid="btn-notificaciones-anunciate"
                      onClick={(e) => { e.currentTarget.blur(); togglePanelNotificaciones(); }}
                      aria-label="Notificaciones"
                      className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                    >
                      <Bell className="w-6 h-6 animate-bell-ring" strokeWidth={2.5} />
                      {cantidadNoLeidas > 0 && (
                        <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                          {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      data-testid="btn-menu-anunciate"
                      onClick={abrirMenuDrawer}
                      aria-label="Menú"
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                    >
                      <IconoMenuMorph />
                    </button>
                  </div>
                </div>
                {/* Subtítulo móvil */}
                <div className="flex items-center justify-center gap-2.5 pb-3">
                  <div className="h-0.5 w-14 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.7))' }} />
                  <span className="text-base font-light text-white/70 tracking-wide">{subtituloHeader}</span>
                  <div className="h-0.5 w-14 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.7), transparent)' }} />
                </div>
              </div>

              {/* ══ DESKTOP HEADER (>= lg) ══ */}
              <div className="hidden lg:block">
                <div className="flex items-center justify-between gap-6 px-6 2xl:px-8 py-4 2xl:py-5">
                  {/* Izquierda: flecha + logo + título */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      data-testid="btn-volver-anunciate-desktop"
                      onClick={volver}
                      aria-label="Volver"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <div className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                      <Megaphone className="w-6 h-6 2xl:w-6.5 2xl:h-6.5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-2xl 2xl:text-3xl font-extrabold text-white tracking-tight">{tituloHeader}</span>
                  </div>

                  {/* Centro: subtítulo + label */}
                  <div className="flex-1 text-center min-w-0">
                    <p className="text-3xl 2xl:text-[34px] font-light text-white/70 leading-tight truncate">{subtituloHeader}</p>
                    <div className="flex items-center justify-center gap-3 mt-1.5">
                      <div className="h-0.5 w-20 2xl:w-24 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.7))' }} />
                      <span className="text-sm 2xl:text-base font-semibold text-cyan-400/70 uppercase tracking-[3px]">{labelHeader}</span>
                      <div className="h-0.5 w-20 2xl:w-24 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(6,182,212,0.7), transparent)' }} />
                    </div>
                  </div>

                  {/* Derecha: sello de confianza (sin KPIs) */}
                  <div className="shrink-0 flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="flex items-center gap-1 text-sm 2xl:text-[15px] font-semibold text-white/70">Pago seguro con <LogoStripe alto={15} color="#fff" /></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cuerpo del checkout — en móvil es el contenedor con scroll propio (flex-1 + overflow);
          en desktop vuelve a bloque normal (scroll en la columna central del layout). */}
      <div ref={cuerpoRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-5 pb-24 lg:flex-none lg:overflow-visible lg:px-6 lg:pt-7 lg:pb-7 2xl:px-8 lg:max-w-7xl lg:mx-auto">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pasos (2/3) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* 1 · Tamaños + imágenes — en fila */}
          <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-600 text-sm lg:text-xs 2xl:text-sm font-bold text-white">1</span>
              <h2 className={`${TXT_TITULO_SECCION} font-bold text-slate-900`}>{renovarId ? 'Tu espacio' : 'Elige dónde aparecer'}</h2>
            </div>
            {renovarId && <p className={`-mt-2 mb-4 font-medium text-slate-600 ${TXT_CUERPO}`}>El tamaño se mantiene al renovar; puedes cambiar la imagen.</p>}
            <div className="grid gap-3 lg:grid-cols-2 lg:items-stretch">
              {tamanosVisibles.map((c) => {
                const activo = carruseles.includes(c);
                const url = imagenes[c];
                const Icono = ICONO[c];
                return (
                  <div
                    key={c}
                    className={`flex h-full flex-col overflow-hidden rounded-xl border-2 ${activo ? 'border-cyan-500 shadow-sm' : 'border-slate-300 lg:hover:border-slate-400'}`}
                  >
                    {/* Cabecera: interruptor on/off del tamaño (en renovación queda fijo, no togglea) */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={activo}
                      data-testid={`anunciate-carrusel-${c}`}
                      onClick={renovarId ? undefined : () => toggleCarrusel(c)}
                      className={`flex items-start gap-3 p-3.5 text-left ${renovarId ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <Icono size={16} className={ACENTO[c]} />
                          <span className="text-sm lg:text-[13px] 2xl:text-sm font-bold text-slate-900">{LABEL[c]}</span>
                        </span>
                        <span className={`mt-0.5 block leading-snug text-slate-600 ${TXT_CUERPO}`}>{DESC[c]}</span>
                        <span className={`mt-1 flex items-center gap-1 font-medium text-slate-600 ${TXT_CUERPO}`}>
                          <Ratio size={14} className="shrink-0 text-slate-500" /> {MEDIDA[c]}
                        </span>
                        {precioLanzamiento(c) > 0 ? (
                          <span className="mt-1.5 flex flex-wrap items-baseline gap-1.5">
                            <span className={`font-semibold text-slate-500 line-through ${TXT_CUERPO}`}>{FMT.format(precioBase(c))}</span>
                            <span className="text-base lg:text-sm 2xl:text-base font-extrabold text-slate-900">{FMT.format(precioLanzamiento(c))}</span>
                            <span className={`rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700 ${TXT_BADGE}`}>Lanzamiento</span>
                          </span>
                        ) : (
                          <span className="mt-1.5 block text-base lg:text-sm 2xl:text-base font-extrabold text-slate-900">{FMT.format(precioBase(c))}</span>
                        )}
                      </span>
                      {/* Interruptor iOS — cyan (identidad de la sección) al estar activo */}
                      <span className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ${activo ? 'bg-cyan-500' : 'bg-slate-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${activo ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </span>
                    </button>

                    {/* Uploader (cuando activo) — con la forma real del espacio para diseñar a la medida.
                        El bloque es flexible (flex-1): el uploader se centra en el espacio sobrante y el
                        texto queda pegado abajo, para que ambas cards igualen su altura. */}
                    {activo && (
                      <div className="flex flex-1 flex-col px-3 pb-3">
                        <div className="flex flex-1 flex-col justify-center">
                          <label className={`group relative block cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-slate-300 lg:hover:border-slate-400 ${PREVIEW_BOX[c]}`}>
                            {url ? (
                              <>
                                <img src={url} alt={LABEL[c]} className="h-full w-full object-cover" />
                                <span className={`absolute inset-0 grid place-items-center bg-black/0 font-semibold text-transparent transition group-hover:bg-black/40 group-hover:text-white ${TXT_CUERPO}`}>Cambiar</span>
                              </>
                            ) : (
                              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500">
                                {subiendo === c ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                <span className={`font-medium ${TXT_CUERPO}`}>Sube tu imagen</span>
                              </span>
                            )}
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" data-testid={`anunciate-imagen-${c}`} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onArchivo(c, f); }} />
                          </label>
                        </div>
                        <p className={`mt-3 text-center leading-snug text-slate-600 ${TXT_CUERPO}`}>Se recorta para llenar el espacio · centra lo importante</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Pasos 2 y 3 lado a lado en desktop (una fila, 2 columnas); apilados en móvil */}
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {/* 2 · Ciudades — solo si hay más de una habilitada; con una sola se auto-selecciona y se oculta */}
          {multiCiudad ? (
          <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-600 text-sm lg:text-xs 2xl:text-sm font-bold text-white">2</span>
              <h2 className={`${TXT_TITULO_SECCION} font-bold text-slate-900`}>¿En qué ciudades?</h2>
              <span className={`ml-auto font-semibold text-slate-600 ${TXT_CUERPO}`}>{ciudadIds.length}/{limite}</span>
            </div>
            <p className={`mb-3 font-medium text-slate-600 ${TXT_CUERPO}`}>Mientras en más ciudades aparezcas, mayor el alcance (y el precio).</p>

            {/* Disparador: aspecto de input; al hacer clic abre el modal de ciudades */}
            <button
              type="button"
              data-testid="anunciate-abrir-ciudades"
              onClick={() => setModalCiudadesAbierto(true)}
              className="relative flex w-full cursor-pointer items-center rounded-lg border-2 border-slate-300 bg-slate-100 py-2.5 pl-9 pr-3 text-left text-base lg:text-sm 2xl:text-base font-medium text-slate-500 lg:hover:border-slate-400"
            >
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              {ciudadIds.length === 0 ? 'Buscar ciudad…' : 'Agregar o cambiar ciudad…'}
            </button>

            {/* Badge(s) de la(s) ciudad(es) elegida(s) */}
            {ciudadIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ciudadIds.map((id) => (
                  <span key={id} className={`inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 py-1 pl-2 pr-1.5 font-semibold text-cyan-700 ${TXT_CUERPO}`}>
                    <MapPin size={12} className="shrink-0" />
                    {nombreCiudad(id)}
                    <button type="button" onClick={() => toggleCiudad(id)} aria-label="Quitar" className="grid h-4 w-4 cursor-pointer place-items-center rounded-full hover:bg-cyan-100"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </section>
          ) : ciudadUnica ? (
            <div data-testid="anunciate-ciudad-unica" className="flex items-start gap-2.5 rounded-2xl border border-slate-300 bg-slate-100 px-5 py-4">
              <MapPin size={18} className="mt-0.5 shrink-0 text-slate-700" />
              <div className="min-w-0">
                <p className={`font-medium text-slate-700 ${TXT_CUERPO}`}>Tu anuncio se mostrará en <b className="font-bold text-slate-900">{ciudadUnica.nombre}, {ciudadUnica.estado}</b>.</p>
                <p className={`mt-0.5 font-medium text-slate-600 ${TXT_CUERPO}`}>Pronto habilitaremos más ciudades — entonces podrás elegir en cuáles aparecer.</p>
              </div>
            </div>
          ) : null}

          {/* 3 · Tiempo (meses por adelantado) — pasa a ser el paso 2 cuando hay una sola ciudad */}
          <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-600 text-sm lg:text-xs 2xl:text-sm font-bold text-white">{numPasoTiempo}</span>
              <h2 className={`${TXT_TITULO_SECCION} font-bold text-slate-900`}>¿Por cuánto tiempo?</h2>
            </div>
            <p className={`mb-3 font-medium text-slate-600 ${TXT_CUERPO}`}>Paga varios meses por adelantado y ahorra.</p>
            <div className="grid grid-cols-1 gap-2.5">
              {(opciones?.periodos ?? [{ meses: 1, descuento: 0 }]).map((p) => {
                const activo = meses === p.meses;
                const totalPeriodo = precio ? precio.mensual * p.meses * (1 - p.descuento / 100) : null;
                return (
                  <button
                    type="button"
                    key={p.meses}
                    data-testid={`anunciate-periodo-${p.meses}`}
                    onClick={() => setMeses(p.meses)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-3.5 py-2.5 text-left ${activo ? 'border-slate-800 bg-slate-100 shadow-sm' : 'border-slate-300 lg:hover:border-slate-400'}`}
                  >
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-lg lg:text-base 2xl:text-lg font-extrabold leading-none text-slate-900">{p.meses}</span>
                      <span className={`font-medium text-slate-600 ${TXT_CUERPO}`}>{p.meses === 1 ? 'mes' : 'meses'}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {totalPeriodo !== null ? (
                        <span className={`font-bold text-slate-800 ${TXT_CUERPO}`}>{FMT.format(totalPeriodo)}</span>
                      ) : (
                        <span className={`font-medium text-slate-600 ${TXT_CUERPO}`}>{p.descuento > 0 ? `Ahorra ${p.descuento}%` : 'Precio base'}</span>
                      )}
                      {p.descuento > 0 && (
                        <span className={`shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700 ${TXT_BADGE}`}>−{p.descuento}%</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
          </div>
        </div>

        {/* Resumen (1/3) — sticky */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
            <h2 className={`mb-4 ${TXT_TITULO_SECCION} font-bold text-slate-900`}>Resumen</h2>

            {carruseles.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center">
                <Megaphone size={26} className="mx-auto text-slate-400" />
                <p className={`mt-2 font-medium text-slate-600 ${TXT_CUERPO}`}>Elige al menos un tamaño para ver el precio.</p>
              </div>
            ) : (
              <div className={`flex flex-col gap-2 ${TXT_CUERPO}`}>
                {carruseles.map((c) => (
                  <Linea
                    key={c}
                    label={LABEL[c]}
                    valor={FMT.format(precioEfectivo(c))}
                    tachado={precioLanzamiento(c) > 0 ? FMT.format(precioBase(c)) : undefined}
                  />
                ))}
                <div className="my-1 border-t border-slate-200" />
                <Linea
                  label="Subtotal"
                  valor={precio ? FMT.format(precio.base) : '—'}
                  tachado={precio && precio.hayLanzamiento ? FMT.format(precio.baseLista) : undefined}
                />
                {precio && precio.factor !== 1 && (
                  <Linea label={`${ciudadIds.length} ciudades (×${precio.factor})`} valor={`+ ${FMT.format(conFactor - precio.base)}`} sub />
                )}
                {precio && precio.esCombo && descuentoMonto > 0 && (
                  <Linea label={`Combo −${precio.descuento}%`} valor={`− ${FMT.format(descuentoMonto)}`} verde />
                )}
                {precio && precio.meses > 1 && (
                  <>
                    <Linea label="Precio mensual" valor={FMT.format(precio.mensual)} fuerte />
                    <Linea label={`× ${precio.meses} meses`} valor={FMT.format(precio.mensual * precio.meses)} sub />
                    {precio.descuentoPeriodo > 0 && (
                      <Linea label={`Ahorro ${precio.meses} meses (−${precio.descuentoPeriodo}%)`} valor={`− ${FMT.format(ahorroPeriodo)}`} verde />
                    )}
                  </>
                )}
                <div className="my-1.5 border-t border-slate-200" />
                <div className="flex items-end justify-between">
                  <span className={`${TXT_TITULO_SECCION} font-bold text-slate-900`}>Total</span>
                  <span className="text-2xl lg:text-xl 2xl:text-2xl font-extrabold leading-none text-slate-900">{precio ? FMT.format(precio.total) : '—'}</span>
                </div>
                <p className={`mt-1 font-medium text-slate-600 ${TXT_CUERPO}`}>{precio ? precio.meses * duracion : duracion} días de vigencia · pago único</p>
                {renovarId && vigenciaActual && (
                  <p className={`mt-1 font-semibold text-slate-700 ${TXT_CUERPO}`}>
                    Vence el {fmtFecha(vigenciaActual)} · se le suman {precio?.meses ?? meses} {(precio?.meses ?? meses) === 1 ? 'mes' : 'meses'}.
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={pagar}
              disabled={!puedePagar}
              data-testid="anunciate-pagar"
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base lg:text-sm 2xl:text-base font-bold text-white transition-all duration-150 ${
                puedePagar
                  ? 'cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-slate-400'
              }`}
            >
              {pagando ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
              {pagando ? 'Redirigiendo…' : renovarId ? 'Renovar y pagar' : 'Pagar con tarjeta'}
            </button>
            {!todasImagenes && carruseles.length > 0 && (
              <p className={`mt-2 text-center font-medium text-amber-600 ${TXT_CUERPO}`}>Sube la imagen de cada tamaño para continuar.</p>
            )}
            <p className={`mt-3 flex items-center justify-center gap-1.5 font-semibold text-slate-600 ${TXT_CUERPO}`}>
              <ShieldCheck size={17} className="text-emerald-600" />
              <span className="flex items-center gap-1.5">Pago seguro con <LogoStripe alto={16} /></span>
            </p>
          </div>
        </aside>
      </div>
      </div>

      {/* Modal selector de ciudad — mismo estilo que ModalUbicacion (header gradiente),
          con acento cyan de la sección; sin GPS (elige dónde anunciar, no dónde estás). */}
      <ModalAdaptativo
        abierto={modalCiudadesAbierto}
        onCerrar={cerrarModalCiudades}
        ancho="sm"
        mostrarHeader={false}
        paddingContenido="none"
        sinScrollInterno
        alturaMaxima="lg"
        colorHandle="rgba(255,255,255,0.4)"
        headerOscuro
      >
        <div className="flex flex-col max-h-[80vh] lg:max-h-[75vh]">
          {/* ── Header dark gradiente (cyan) ── */}
          <div
            className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
            style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 4px 16px rgba(8,145,178,0.4)' }}
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

            <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
              <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">¿En qué ciudad?</h3>
                <span className="text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Elige dónde aparecerá tu anuncio</span>
              </div>
            </div>
          </div>

          {/* ── Contenido ── */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4">
            {/* Campo de búsqueda */}
            <div className="relative mb-4 lg:mb-3 2xl:mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar ciudad..."
                data-testid="anunciate-buscar-ciudad"
                className="w-full pl-10 lg:pl-9 2xl:pl-10 pr-9 py-3 lg:py-2.5 2xl:py-3 border-2 border-slate-300 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-400 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-300 hover:bg-slate-400 flex items-center justify-center lg:cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>

            {/* Título de la lista */}
            <div className="flex items-center gap-2 mb-3 lg:mb-2 2xl:mb-3 pb-2 lg:pb-1.5 2xl:pb-2 border-b-2 border-slate-300">
              <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
              <span className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800">
                {busqueda ? 'Resultados' : 'Ciudades disponibles'}
              </span>
              <span className="ml-auto text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-500">{ciudadIds.length}/{limite}</span>
            </div>

            {/* Lista de ciudades */}
            <div className="lg:max-h-48 2xl:max-h-64 overflow-y-auto">
              {ciudadesFiltradas.length > 0 ? (
                <ul className="space-y-1">
                  {ciudadesFiltradas.map((c) => {
                    const sel = ciudadIds.includes(c.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          data-testid={`anunciate-ciudad-${c.id}`}
                          onClick={() => seleccionarCiudadModal(c.id)}
                          className={`w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 p-3 lg:p-2 2xl:p-3 rounded-lg text-left lg:cursor-pointer ${sel ? 'bg-cyan-50 ring-1 ring-cyan-200' : 'hover:bg-slate-200'}`}
                        >
                          <div className={`w-2 h-2 lg:w-1.5 lg:h-1.5 2xl:w-2 2xl:h-2 rounded-full shrink-0 ${sel ? 'bg-cyan-500' : 'bg-slate-400'}`} />
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold text-base lg:text-sm 2xl:text-base ${sel ? 'text-cyan-800' : 'text-slate-800'}`}>{c.nombre}</p>
                            <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">{c.estado}</p>
                          </div>
                          {sel && <Check className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-cyan-600 shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-center text-slate-600 font-medium py-4 lg:py-3 2xl:py-4 text-base lg:text-sm 2xl:text-base">
                  No se encontraron ciudades
                </p>
              )}
            </div>

            {/* Botón "Listo" solo en selección múltiple (límite > 1) */}
            {limite > 1 && (
              <button
                type="button"
                onClick={cerrarModalCiudades}
                data-testid="anunciate-ciudades-listo"
                className="mt-4 lg:mt-3 2xl:mt-4 w-full rounded-xl py-3 lg:py-2.5 2xl:py-3 text-base lg:text-sm 2xl:text-base font-bold text-white lg:cursor-pointer active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 4px 16px rgba(8,145,178,0.35)' }}
              >
                Listo · {ciudadIds.length}/{limite}
              </button>
            )}
          </div>
        </div>
      </ModalAdaptativo>
    </div>
  );
}

function Linea({ label, valor, tachado, fuerte, sub, verde }: { label: string; valor: string; tachado?: string; fuerte?: boolean; sub?: boolean; verde?: boolean }) {
  // El tamaño lo hereda del contenedor del resumen (responsive); aquí solo el peso/color.
  return (
    <div className="flex items-center justify-between">
      <span className={fuerte ? 'font-semibold text-slate-700' : sub ? 'pl-2 font-medium text-slate-600' : 'font-medium text-slate-600'}>{label}</span>
      <span className="flex items-baseline gap-1.5">
        {tachado && <span className="tabular-nums text-slate-500 line-through">{tachado}</span>}
        <span className={`tabular-nums ${verde ? 'font-semibold text-emerald-600' : fuerte ? 'font-semibold text-slate-700' : 'font-medium text-slate-700'}`}>{valor}</span>
      </span>
    </div>
  );
}
