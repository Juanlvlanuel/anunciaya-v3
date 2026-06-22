/**
 * DialogoAltaManual.tsx
 * =====================
 * Alta MANUAL de un anuncio desde el Panel (Fase 2). El super/gerente captura: correo del anunciante,
 * carrusel(es), imagen de cada uno (sube a R2), ciudades, método de cobro y monto. El precio se calcula
 * en vivo (puede sobrescribirse). Cortesía solo la ve el super. El backend revalida todo.
 *
 * Ubicación: apps/admin/src/components/publicidad/DialogoAltaManual.tsx
 */

import { useState, useRef } from 'react';
import { Megaphone, Upload, X, Check, MapPin, Search, Loader2 } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import {
  useOpcionesPublicidad,
  useCiudadesPublicidad,
  usePrecioPublicidad,
  useCrearAnuncioManual,
} from '../../hooks/queries/usePublicidadAdmin';
import { subirImagenPublicidad, descartarImagenesPublicidad, type Carrusel } from '../../services/publicidadService';
import { toast } from '../../stores/useToastPanel';
import { CARRUSEL_LABEL } from './presentacionPublicidad';

// Se vende por TAMAÑO: Grande (patrocinadores) arriba · Chico (anuncios) abajo.
// 'fundadores' ya no se vende (es regalo manual a los primeros negocios de cada ciudad).
const CARRUSELES: Carrusel[] = ['patrocinadores', 'anuncios'];
type MetodoCobro = 'efectivo' | 'transferencia' | 'cortesia';

const FMT = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13.5px] text-texto outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';

export function DialogoAltaManual({ rol, onCerrar }: { rol: RolPanel; onCerrar: () => void }) {
  const esSuper = rol === 'superadmin';
  const { data: opciones } = useOpcionesPublicidad();
  const { data: ciudades = [] } = useCiudadesPublicidad();
  const crear = useCrearAnuncioManual();

  const [correo, setCorreo] = useState('');
  const [carruseles, setCarruseles] = useState<Carrusel[]>([]);
  const [imagenes, setImagenes] = useState<Partial<Record<Carrusel, string>>>({});
  const [subiendo, setSubiendo] = useState<Carrusel | null>(null);
  const [ciudadIds, setCiudadIds] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [metodoCobro, setMetodoCobro] = useState<MetodoCobro>('efectivo');
  const [monto, setMonto] = useState('');
  const [meses, setMeses] = useState(1);

  const limite = opciones?.limiteCiudades ?? 10;
  const precioBase = (c: Carrusel) => opciones?.carruseles.find((o) => o.clave === c)?.precioBase ?? 0;
  const { data: precio } = usePrecioPublicidad(carruseles, ciudadIds.length, meses);
  const esCortesia = metodoCobro === 'cortesia';

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

  // URLs subidas en esta sesión: al cerrar se mandan al backend, que borra de R2 las que no quedaron
  // ligadas a un anuncio (canceladas o reemplazadas). Las guardadas quedan protegidas por reference count.
  const subidasSesion = useRef<Set<string>>(new Set());
  const cerrarConLimpieza = () => {
    void descartarImagenesPublicidad(Array.from(subidasSesion.current));
    onCerrar();
  };

  const onArchivo = async (c: Carrusel, file: File | undefined) => {
    if (!file) return;
    setSubiendo(c);
    try {
      const url = await subirImagenPublicidad(file);
      subidasSesion.current.add(url);
      setImagenes((prev) => ({ ...prev, [c]: url }));
    } catch {
      toast.error('No se pudo subir la imagen (revisa el CORS del bucket).');
    } finally {
      setSubiendo(null);
    }
  };

  const toggleCiudad = (id: string) =>
    setCiudadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= limite ? prev : [...prev, id]));

  const ciudadesFiltradas = (busqueda
    ? ciudades.filter((c) => `${c.nombre} ${c.estado}`.toLowerCase().includes(busqueda.toLowerCase()))
    : ciudades
  ).slice(0, 40);
  const nombreCiudad = (id: string) => ciudades.find((c) => c.id === id)?.nombre ?? '—';

  const todasImagenes = carruseles.length > 0 && carruseles.every((c) => imagenes[c]);
  const puedeRegistrar =
    correo.trim() !== '' && carruseles.length > 0 && todasImagenes && ciudadIds.length > 0 && ciudadIds.length <= limite && !crear.isPending && !subiendo;

  const registrar = () => {
    if (!puedeRegistrar) return;
    crear.mutate(
      {
        correoAnunciante: correo.trim(),
        carruseles,
        imagenes,
        ciudadIds,
        meses,
        metodoCobro,
        monto: esCortesia ? undefined : monto.trim() !== '' ? Number(monto) : undefined,
      },
      { onSuccess: cerrarConLimpieza },
    );
  };

  return (
    <ModalAdaptativo
      abierto
      onCerrar={cerrarConLimpieza}
      titulo="Registrar anuncio"
      iconoTitulo={<span className="grid h-9 w-9 place-items-center rounded-[9px] bg-marca-suave text-marca"><Megaphone size={16} /></span>}
      ancho="2xl"
      alturaMaxima="xl"
      discriminador="publicidad-alta-manual"
    >
      <div className="flex flex-col gap-4 p-5" data-testid="dialogo-publicidad-alta">
        {/* Anunciante (ancho completo) */}
        <div>
          <label className={LABEL}>Correo del anunciante</label>
          <input
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            data-testid="alta-correo"
            className={CAMPO}
          />
          <p className="mt-1 text-[11.5px] text-texto-4">Debe ser una cuenta existente (negocio o persona).</p>
        </div>

        {/* Dos columnas: izquierda (carruseles · periodo · cobro) · derecha (ciudades) */}
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          {/* Columna izquierda: carruseles + periodo + cobro */}
          <div className="flex flex-col gap-4">
          {/* Carruseles + imágenes */}
          <div>
            <label className={LABEL}>Tamaño e imagen</label>
            <div className="flex flex-col gap-2">
              {CARRUSELES.map((c) => {
                const activo = carruseles.includes(c);
                const url = imagenes[c];
                return (
                  <div key={c} className={`rounded-[11px] border p-3 transition ${activo ? 'border-marca bg-marca-suave/40' : 'border-borde bg-superficie'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        data-testid={`alta-carrusel-${c}`}
                        onClick={() => toggleCarrusel(c)}
                        className="flex items-center gap-2.5 text-left"
                      >
                        <span className={`grid h-5 w-5 place-items-center rounded-[6px] border ${activo ? 'border-marca bg-marca text-marca-contraste' : 'border-borde-fuerte'}`}>
                          {activo && <Check size={13} />}
                        </span>
                        <span className="text-[13.5px] font-semibold text-texto">{CARRUSEL_LABEL[c]}</span>
                      </button>
                      <span className="text-[12.5px] text-texto-3">{FMT.format(precioBase(c))}</span>
                    </div>

                    {activo && (
                      <div className="mt-2.5 flex items-center gap-3 pl-7">
                        {url ? (
                          <img src={url} alt={CARRUSEL_LABEL[c]} className="h-12 w-16 rounded-[7px] border border-borde object-cover" />
                        ) : (
                          <span className="grid h-12 w-16 place-items-center rounded-[7px] border border-dashed border-borde-fuerte text-texto-4">
                            {subiendo === c ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          </span>
                        )}
                        <label className="cursor-pointer rounded-[9px] border border-borde-fuerte bg-superficie px-3 py-1.5 text-[12px] font-semibold text-texto-2 transition hover:border-marca hover:text-marca">
                          {url ? 'Cambiar imagen' : 'Subir imagen'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            data-testid={`alta-imagen-${c}`}
                            onChange={(e) => onArchivo(c, e.target.files?.[0])}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Periodo (meses por adelantado) */}
          <div>
            <label className={LABEL}>Periodo</label>
            <div className="flex flex-wrap gap-2">
              {(opciones?.periodos ?? [{ meses: 1, descuento: 0 }]).map((p) => {
                const activo = meses === p.meses;
                return (
                  <button
                    type="button"
                    key={p.meses}
                    data-testid={`alta-periodo-${p.meses}`}
                    onClick={() => setMeses(p.meses)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition ${activo ? 'border-marca bg-marca text-marca-contraste' : 'border-borde-fuerte text-texto-2 hover:bg-marca-suave'}`}
                  >
                    {p.meses} {p.meses === 1 ? 'mes' : 'meses'}
                    {p.descuento > 0 && (
                      <span className={activo ? 'opacity-80' : ''} style={activo ? undefined : { color: 'var(--panel-ok)' }}>−{p.descuento}%</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cobro */}
          <div>
            <label className={LABEL}>Cobro</label>
            <div className="flex flex-wrap gap-2">
              {(['efectivo', 'transferencia', ...(esSuper ? ['cortesia'] : [])] as MetodoCobro[]).map((m) => (
                <button
                  type="button"
                  key={m}
                  data-testid={`alta-cobro-${m}`}
                  onClick={() => setMetodoCobro(m)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold capitalize transition ${metodoCobro === m ? 'border-marca bg-marca text-marca-contraste' : 'border-borde-fuerte text-texto-2 hover:bg-marca-suave'}`}
                >
                  {m === 'cortesia' ? 'Cortesía' : m}
                </button>
              ))}
            </div>
          </div>
          </div>

          {/* Ciudades */}
          <div>
            <label className={LABEL}>Ciudades ({ciudadIds.length}/{limite})</label>
            {ciudadIds.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {ciudadIds.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-marca-suave px-2.5 py-1 text-[12px] font-medium text-marca">
                    {nombreCiudad(id)}
                    <button type="button" onClick={() => toggleCiudad(id)} aria-label="Quitar"><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-4" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar ciudad…"
                data-testid="alta-buscar-ciudad"
                className={`${CAMPO} pl-9`}
              />
            </div>
            <div className="mt-2 max-h-72 overflow-y-auto rounded-[10px] border border-borde">
              {ciudadesFiltradas.map((c) => {
                const sel = ciudadIds.includes(c.id);
                return (
                  <button
                    type="button"
                    key={c.id}
                    data-testid={`alta-ciudad-${c.id}`}
                    onClick={() => toggleCiudad(c.id)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-borde px-3 py-2 text-left text-[13px] transition last:border-b-0 hover:bg-marca-suave ${sel ? 'text-marca' : 'text-texto-2'}`}
                  >
                    <span className="flex items-center gap-2"><MapPin size={13} /> {c.nombre} <span className="text-texto-4">· {c.estado}</span></span>
                    {sel && <Check size={14} />}
                  </button>
                );
              })}
              {ciudadesFiltradas.length === 0 && <div className="px-3 py-3 text-center text-[12.5px] text-texto-4">Sin resultados.</div>}
            </div>
          </div>
        </div>

        {/* Precio + monto (ancho completo) */}
        <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
          <div className={`flex items-center justify-between rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3 ${esCortesia ? 'lg:col-span-2' : ''}`}>
            <span className="text-[13px] text-texto-3">{esCortesia ? 'Cortesía' : 'Precio calculado'}</span>
            <span className="text-[16px] font-semibold text-texto">
              {esCortesia ? 'Gratis' : precio ? FMT.format(precio.total) : '—'}
              {!esCortesia && precio?.esCombo && <span className="ml-1 text-[11px] font-normal text-texto-3">combo −{precio.descuento}%</span>}
            </span>
          </div>

          {!esCortesia && (
            <div>
              <label className="mb-1 block text-[11.5px] text-texto-4">Monto a cobrar (vacío = usar el calculado)</label>
              <input
                value={monto}
                onChange={(e) => setMonto(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                placeholder={precio ? String(precio.total) : ''}
                data-testid="alta-monto"
                className={CAMPO}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
        <button type="button" onClick={cerrarConLimpieza} disabled={crear.isPending} className={BTN_CANCELAR} data-testid="alta-cancelar">
          Cancelar
        </button>
        <button type="button" onClick={registrar} disabled={!puedeRegistrar} className={BTN_GUARDAR} data-testid="alta-registrar">
          {crear.isPending ? 'Registrando…' : 'Registrar anuncio'}
        </button>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoAltaManual;
