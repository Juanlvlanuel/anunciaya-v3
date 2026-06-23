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
 * Ubicación: apps/web/src/pages/private/publicidad/PaginaAnunciate.tsx
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Check, MapPin, Search, Loader2, CreditCard, ShieldCheck, Megaphone, Star, Award, X, Ratio } from 'lucide-react';
import { useCiudades } from '../../../hooks/queries/useCiudades';
import { notificar } from '../../../utils/notificaciones';
import {
  obtenerOpcionesPublicidad,
  obtenerPrecioPublicidad,
  subirImagenPublicidad,
  descartarImagenesPublicidad,
  crearCheckoutPublicidad,
  type Carrusel,
  type OpcionesPublicidad,
  type DesglosePrecio,
} from '../../../services/publicidadService';

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
const ACENTO: Record<Carrusel, string> = { patrocinadores: 'text-blue-600', anuncios: 'text-amber-500', fundadores: 'text-violet-600' };
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

export default function PaginaAnunciate() {
  const navigate = useNavigate();

  const [carruseles, setCarruseles] = useState<Carrusel[]>([]);
  const [imagenes, setImagenes] = useState<Partial<Record<Carrusel, string>>>({});
  const [subiendo, setSubiendo] = useState<Carrusel | null>(null);
  const [ciudadIds, setCiudadIds] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [opciones, setOpciones] = useState<OpcionesPublicidad | null>(null);
  const [precio, setPrecio] = useState<DesglosePrecio | null>(null);
  const [meses, setMeses] = useState(1);
  const [pagando, setPagando] = useState(false);
  // Creatividades subidas en esta visita: al salir sin pagar, el backend borra de R2 las que no quedaron
  // ligadas a un anuncio (reference count). Las pagadas quedan protegidas.
  const subidasSesion = useRef<Set<string>>(new Set());

  useEffect(() => {
    obtenerOpcionesPublicidad().then(setOpciones).catch(() => {});
  }, []);

  // Al salir de la página (sin haber pagado): descarta las creatividades subidas que no quedaron ligadas.
  useEffect(() => {
    return () => {
      const urls = Array.from(subidasSesion.current);
      if (urls.length) void descartarImagenesPublicidad(urls);
    };
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
      subidasSesion.current.add(url);
      setImagenes((prev) => ({ ...prev, [c]: url }));
    } catch {
      notificar.error('No se pudo subir la imagen.');
    } finally {
      setSubiendo(null);
    }
  };

  const toggleCiudad = (id: string) =>
    setCiudadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= limite ? prev : [...prev, id]));

  const todasImagenes = carruseles.length > 0 && carruseles.every((c) => imagenes[c]);
  const puedePagar = todasImagenes && ciudadIds.length > 0 && ciudadIds.length <= limite && !subiendo && !pagando && !!precio;

  const pagar = async () => {
    if (!puedePagar) return;
    setPagando(true);
    try {
      const url = await crearCheckoutPublicidad({ carruseles, imagenes, ciudadIds, meses });
      window.location.href = url;
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : 'No se pudo iniciar el pago.');
      setPagando(false);
    }
  };

  const conFactor = precio ? precio.base * precio.factor : 0;
  const descuentoMonto = precio && precio.esCombo ? conFactor - precio.mensual : 0;
  const ahorroPeriodo = precio ? precio.mensual * precio.meses * (precio.descuentoPeriodo / 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 lg:px-6 lg:py-7">
      {/* Encabezado de la sección (el header de la app lo pone el MainLayout) */}
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Volver"
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold tracking-tight text-slate-800">Anúnciate en AnunciaYA</h1>
          <p className="text-[12.5px] text-slate-500">Aparece en los carruseles de tu comunidad — pago único, sin renovación automática.</p>
        </div>
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-slate-600 lg:flex">
          <ShieldCheck size={15} className="text-emerald-500" /> Pago seguro con Stripe
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pasos (2/3) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* 1 · Tamaños + imágenes — en fila */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-[13px] font-bold text-white">1</span>
              <h2 className="text-[15.5px] font-bold text-slate-800">Elige dónde aparecer</h2>
            </div>
            <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
              {CARRUSELES.map((c) => {
                const activo = carruseles.includes(c);
                const url = imagenes[c];
                const Icono = ICONO[c];
                return (
                  <div
                    key={c}
                    className={`flex flex-col overflow-hidden rounded-xl border-2 transition ${activo ? 'border-blue-500 shadow-sm' : 'border-slate-200 hover:border-blue-200'}`}
                  >
                    {/* Cabecera clickeable (selecciona) */}
                    <button type="button" data-testid={`anunciate-carrusel-${c}`} onClick={() => toggleCarrusel(c)} className="flex cursor-pointer items-start gap-2.5 p-3.5 text-left">
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition ${activo ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                        {activo && <Check size={13} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <Icono size={15} className={ACENTO[c]} />
                          <span className="text-[14px] font-bold text-slate-800">{LABEL[c]}</span>
                        </span>
                        <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-500">{DESC[c]}</span>
                        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                          <Ratio size={12} className="shrink-0 text-slate-400" /> {MEDIDA[c]}
                        </span>
                        <span className="mt-1.5 block text-[15px] font-extrabold text-slate-900">{FMT.format(precioBase(c))}</span>
                      </span>
                    </button>

                    {/* Uploader (cuando activo) — con la forma real del espacio para diseñar a la medida */}
                    {activo && (
                      <div className="px-3 pb-3">
                        <label className={`group relative block cursor-pointer overflow-hidden rounded-lg border border-dashed border-slate-300 transition hover:border-blue-400 ${PREVIEW_BOX[c]}`}>
                          {url ? (
                            <>
                              <img src={url} alt={LABEL[c]} className="h-full w-full object-cover" />
                              <span className="absolute inset-0 grid place-items-center bg-black/0 text-[11px] font-semibold text-transparent transition group-hover:bg-black/40 group-hover:text-white">Cambiar</span>
                            </>
                          ) : (
                            <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
                              {subiendo === c ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                              <span className="text-[11.5px] font-medium">Sube tu imagen</span>
                            </span>
                          )}
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" data-testid={`anunciate-imagen-${c}`} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onArchivo(c, f); }} />
                        </label>
                        <p className="mt-1.5 text-center text-[10.5px] leading-snug text-slate-400">Se recorta para llenar el espacio · centra lo importante</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2 · Ciudades — solo si hay más de una habilitada; con una sola se auto-selecciona y se oculta */}
          {multiCiudad ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-[13px] font-bold text-white">2</span>
              <h2 className="text-[15.5px] font-bold text-slate-800">¿En qué ciudades?</h2>
              <span className="ml-auto text-[12.5px] font-medium text-slate-400">{ciudadIds.length}/{limite}</span>
            </div>
            <p className="mb-3 text-[12.5px] text-slate-500">Mientras en más ciudades aparezcas, mayor el alcance (y el precio).</p>

            {ciudadIds.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {ciudadIds.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-100 py-1 pl-2.5 pr-1.5 text-[12px] font-medium text-blue-700">
                    {nombreCiudad(id)}
                    <button type="button" onClick={() => toggleCiudad(id)} aria-label="Quitar" className="grid h-4 w-4 cursor-pointer place-items-center rounded-full hover:bg-blue-200"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar ciudad…"
                data-testid="anunciate-buscar-ciudad"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-[13.5px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white [color-scheme:light]"
              />
            </div>

            {/* Lista de ciudades en grid de 2 columnas (usa el ancho, menos scroll) */}
            <div className="mt-3 grid max-h-72 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {ciudadesFiltradas.map((c) => {
                const sel = ciudadIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    data-testid={`anunciate-ciudad-${c.id}`}
                    onClick={() => toggleCiudad(c.id)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition ${sel ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50'}`}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <MapPin size={13} className="shrink-0" />
                      <span className="truncate">{c.nombre}</span>
                      <span className="truncate text-[11px] text-slate-400">· {c.estado}</span>
                    </span>
                    {sel && <Check size={14} className="shrink-0" />}
                  </button>
                );
              })}
              {ciudadesFiltradas.length === 0 && <div className="col-span-full px-3 py-4 text-center text-[12.5px] text-slate-400">Sin resultados.</div>}
            </div>
          </section>
          ) : ciudadUnica ? (
            <div data-testid="anunciate-ciudad-unica" className="flex items-start gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <MapPin size={17} className="mt-0.5 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <p className="text-[13.5px] text-slate-700">Tu anuncio se mostrará en <b className="font-semibold text-slate-900">{ciudadUnica.nombre}, {ciudadUnica.estado}</b>.</p>
                <p className="mt-0.5 text-[12px] text-slate-400">Pronto habilitaremos más ciudades — entonces podrás elegir en cuáles aparecer.</p>
              </div>
            </div>
          ) : null}

          {/* 3 · Tiempo (meses por adelantado) — pasa a ser el paso 2 cuando hay una sola ciudad */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-[13px] font-bold text-white">{numPasoTiempo}</span>
              <h2 className="text-[15.5px] font-bold text-slate-800">¿Por cuánto tiempo?</h2>
            </div>
            <p className="mb-3 text-[12.5px] text-slate-500">Paga varios meses por adelantado y ahorra.</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(opciones?.periodos ?? [{ meses: 1, descuento: 0 }]).map((p) => {
                const activo = meses === p.meses;
                const totalPeriodo = precio ? precio.mensual * p.meses * (1 - p.descuento / 100) : null;
                return (
                  <button
                    type="button"
                    key={p.meses}
                    data-testid={`anunciate-periodo-${p.meses}`}
                    onClick={() => setMeses(p.meses)}
                    className={`relative flex cursor-pointer flex-col items-start gap-0.5 rounded-xl border-2 p-3 text-left transition ${activo ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-slate-200 hover:border-blue-300'}`}
                  >
                    {p.descuento > 0 && (
                      <span className="absolute right-2 top-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-700">−{p.descuento}%</span>
                    )}
                    <span className="text-[18px] font-extrabold leading-none text-slate-800">{p.meses}</span>
                    <span className="text-[11.5px] font-medium text-slate-500">{p.meses === 1 ? 'mes' : 'meses'}</span>
                    {totalPeriodo !== null ? (
                      <span className="mt-1 text-[12.5px] font-bold text-slate-700">{FMT.format(totalPeriodo)}</span>
                    ) : (
                      <span className="mt-1 text-[11.5px] text-slate-400">{p.descuento > 0 ? `Ahorra ${p.descuento}%` : 'Precio base'}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Resumen (1/3) — sticky */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-[15.5px] font-bold text-slate-800">Resumen</h2>

            {carruseles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                <Megaphone size={26} className="mx-auto text-slate-300" />
                <p className="mt-2 text-[13px] text-slate-500">Elige al menos un tamaño para ver el precio.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-[13.5px]">
                {carruseles.map((c) => (
                  <Linea key={c} label={LABEL[c]} valor={FMT.format(precioBase(c))} />
                ))}
                <div className="my-1 border-t border-slate-100" />
                <Linea label="Subtotal" valor={precio ? FMT.format(precio.base) : '—'} />
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
                  <span className="text-[14px] font-bold text-slate-800">Total</span>
                  <span className="text-[24px] font-extrabold leading-none text-slate-900">{precio ? FMT.format(precio.total) : '—'}</span>
                </div>
                <p className="mt-1 text-[11.5px] text-slate-400">{precio ? precio.meses * duracion : duracion} días de vigencia · pago único</p>
              </div>
            )}

            <button
              type="button"
              onClick={pagar}
              disabled={!puedePagar}
              data-testid="anunciate-pagar"
              className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[14.5px] font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pagando ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
              {pagando ? 'Redirigiendo…' : 'Pagar con tarjeta'}
            </button>
            {!todasImagenes && carruseles.length > 0 && (
              <p className="mt-2 text-center text-[11.5px] text-amber-600">Sube la imagen de cada tamaño para continuar.</p>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck size={13} /> Pago seguro con Stripe
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Linea({ label, valor, fuerte, sub, verde }: { label: string; valor: string; fuerte?: boolean; sub?: boolean; verde?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={sub ? 'text-[12.5px] text-slate-500' : fuerte ? 'font-semibold text-slate-700' : 'text-slate-600'}>{label}</span>
      <span className={`tabular-nums ${verde ? 'font-semibold text-emerald-600' : fuerte ? 'font-semibold text-slate-700' : 'text-slate-600'}`}>{valor}</span>
    </div>
  );
}
