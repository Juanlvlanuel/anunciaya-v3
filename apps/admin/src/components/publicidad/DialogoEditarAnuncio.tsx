/**
 * DialogoEditarAnuncio.tsx
 * ========================
 * Edición de un anuncio existente desde el Panel (super + gerente). Permite cambiar **ciudades,
 * carruseles e imágenes** — precargados con lo que ya tiene el anuncio. NO toca el cobro: el monto,
 * folio y recibo se respetan (es un ajuste operativo, queda en auditoría). El backend revalida alcance
 * y reglas (carrusel 1..3, imagen por carrusel, ciudades activas / en la región del gerente).
 *
 * Calcado de DialogoAltaManual, sin correo ni bloque de cobro.
 *
 * Ubicación: apps/admin/src/components/publicidad/DialogoEditarAnuncio.tsx
 */

import { useState, useRef } from 'react';
import { Megaphone, Upload, X, Check, MapPin, Search, Loader2, Info } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useCiudadesPublicidad, useEditarPublicidad, useOpcionesPublicidad } from '../../hooks/queries/usePublicidadAdmin';
import { subirImagenPublicidad, descartarImagenesPublicidad, type Carrusel, type PublicidadDetalle } from '../../services/publicidadService';
import { toast } from '../../stores/useToastPanel';
import { CARRUSEL_LABEL } from './presentacionPublicidad';

const CARRUSELES: Carrusel[] = ['anuncios', 'patrocinadores', 'fundadores'];

const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13.5px] text-texto outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';

export function DialogoEditarAnuncio({ detalle, onCerrar }: { detalle: PublicidadDetalle; onCerrar: () => void }) {
  const { data: ciudades = [] } = useCiudadesPublicidad();
  const { data: opciones } = useOpcionesPublicidad();
  const editar = useEditarPublicidad();
  const limite = opciones?.limiteCiudades ?? 10;

  const [carruseles, setCarruseles] = useState<Carrusel[]>(() => detalle.piezas.map((p) => p.carrusel as Carrusel));
  const [imagenes, setImagenes] = useState<Partial<Record<Carrusel, string>>>(() => {
    const m: Partial<Record<Carrusel, string>> = {};
    for (const p of detalle.piezas) m[p.carrusel as Carrusel] = p.imagenUrl;
    return m;
  });
  const [subiendo, setSubiendo] = useState<Carrusel | null>(null);
  const [ciudadIds, setCiudadIds] = useState<string[]>(() => detalle.ciudades.map((c) => c.id));
  const [busqueda, setBusqueda] = useState('');

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

  // Solo las creatividades subidas en esta sesión (no las originales del anuncio) se mandan al descarte
  // al cerrar; el backend borra de R2 las que no quedaron ligadas al anuncio (reference count).
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
  const nombreCiudad = (id: string) => ciudades.find((c) => c.id === id)?.nombre ?? detalle.ciudades.find((c) => c.id === id)?.nombre ?? '—';

  const todasImagenes = carruseles.length > 0 && carruseles.every((c) => imagenes[c]);
  const puedeGuardar = carruseles.length > 0 && todasImagenes && ciudadIds.length > 0 && ciudadIds.length <= limite && !editar.isPending && !subiendo;

  const guardar = () => {
    if (!puedeGuardar) return;
    editar.mutate(
      { id: detalle.id, input: { carruseles, imagenes, ciudadIds } },
      { onSuccess: cerrarConLimpieza },
    );
  };

  return (
    <ModalAdaptativo
      abierto
      onCerrar={cerrarConLimpieza}
      titulo="Editar anuncio"
      iconoTitulo={<span className="grid h-9 w-9 place-items-center rounded-[9px] bg-marca-suave text-marca"><Megaphone size={16} /></span>}
      ancho="2xl"
      alturaMaxima="xl"
      discriminador="publicidad-editar"
    >
      <div className="flex flex-col gap-4 p-5" data-testid="dialogo-publicidad-editar">
        {/* Nota: el cobro no cambia */}
        <div className="flex items-start gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3 py-2.5 text-[12.5px] text-texto-3">
          <Info size={15} className="mt-0.5 shrink-0 text-texto-4" />
          <span>Editas dónde y cómo se muestra el anuncio. <b className="font-semibold text-texto-2">El monto cobrado no cambia</b> — es un ajuste operativo y queda en la bitácora.</span>
        </div>

        {/* Dos columnas: carruseles · ciudades */}
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Carruseles + imágenes */}
        <div>
          <label className={LABEL}>Carruseles e imágenes</label>
          <div className="flex flex-col gap-2">
            {CARRUSELES.map((c) => {
              const activo = carruseles.includes(c);
              const url = imagenes[c];
              return (
                <div key={c} className={`rounded-[11px] border p-3 transition ${activo ? 'border-marca bg-marca-suave/40' : 'border-borde bg-superficie'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      data-testid={`editar-carrusel-${c}`}
                      onClick={() => toggleCarrusel(c)}
                      className="flex items-center gap-2.5 text-left"
                    >
                      <span className={`grid h-5 w-5 place-items-center rounded-[6px] border ${activo ? 'border-marca bg-marca text-marca-contraste' : 'border-borde-fuerte'}`}>
                        {activo && <Check size={13} />}
                      </span>
                      <span className="text-[13.5px] font-semibold text-texto">{CARRUSEL_LABEL[c]}</span>
                    </button>
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
                          data-testid={`editar-imagen-${c}`}
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
              data-testid="editar-buscar-ciudad"
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
                  data-testid={`editar-ciudad-${c.id}`}
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
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
        <button type="button" onClick={cerrarConLimpieza} disabled={editar.isPending} className={BTN_CANCELAR} data-testid="editar-cancelar">
          Cancelar
        </button>
        <button type="button" onClick={guardar} disabled={!puedeGuardar} className={BTN_GUARDAR} data-testid="editar-guardar">
          {editar.isPending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarAnuncio;
