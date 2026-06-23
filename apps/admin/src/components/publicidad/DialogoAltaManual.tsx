/**
 * DialogoAltaManual.tsx
 * =====================
 * Alta MANUAL de un anuncio desde el Panel (Fase 2). El super/gerente captura: correo del anunciante,
 * carrusel(es), imagen de cada uno (sube a R2), ciudades, método de cobro y monto. El precio se calcula
 * en vivo (puede sobrescribirse). Cortesía solo la ve el super. El backend revalida todo.
 *
 * Ubicación: apps/admin/src/components/publicidad/DialogoAltaManual.tsx
 */

import { useState, useRef, useEffect } from 'react';
import { Megaphone, X, Check, MapPin, Search, Loader2, Trash2 } from 'lucide-react';
import type { RolPanel } from '../../data/menuPanel';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Tooltip } from '../ui/Tooltip';
import {
  useOpcionesPublicidad,
  useCiudadesPublicidad,
  usePrecioPublicidad,
  useCrearAnuncioManual,
} from '../../hooks/queries/usePublicidadAdmin';
import { subirImagenPublicidad, descartarImagenesPublicidad, type Carrusel } from '../../services/publicidadService';
import { existeCorreo } from '../../services/negociosService';
import { toast } from '../../stores/useToastPanel';
import { CARRUSEL_LABEL } from './presentacionPublicidad';

// Se vende por TAMAÑO: Grande (patrocinadores) arriba · Chico (anuncios) abajo.
// 'fundadores' ya no se vende (es regalo manual a los primeros negocios de cada ciudad).
const CARRUSELES: Carrusel[] = ['patrocinadores', 'anuncios'];
type MetodoCobro = 'efectivo' | 'transferencia' | 'cortesia';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [montoEditado, setMontoEditado] = useState(false);
  const [meses, setMeses] = useState(1);
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [correoExiste, setCorreoExiste] = useState<boolean | null>(null);

  // Validación del correo EN VIVO: formato + que exista una cuenta en AY. Debounce 450ms; anti-race con
  // la bandera `cancelado`. El backend revalida al registrar (red de seguridad si la consulta falla).
  const correoNorm = correo.trim().toLowerCase();
  const formatoCorreoValido = EMAIL_REGEX.test(correoNorm);
  useEffect(() => {
    setCorreoExiste(null);
    if (!formatoCorreoValido) {
      setVerificandoCorreo(false);
      return;
    }
    setVerificandoCorreo(true);
    let cancelado = false;
    const t = setTimeout(async () => {
      try {
        const existe = await existeCorreo(correoNorm);
        if (!cancelado) setCorreoExiste(existe);
      } catch {
        if (!cancelado) setCorreoExiste(null); // si falla la consulta, no bloqueamos (el alta revalida)
      } finally {
        if (!cancelado) setVerificandoCorreo(false);
      }
    }, 450);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [correoNorm, formatoCorreoValido]);

  const limite = opciones?.limiteCiudades ?? 10;
  const precioBase = (c: Carrusel) => opciones?.carruseles.find((o) => o.clave === c)?.precioBase ?? 0;
  const { data: precio } = usePrecioPublicidad(carruseles, ciudadIds.length, meses);
  const esCortesia = metodoCobro === 'cortesia';

  // El "Monto a cobrar" se PRE-LLENA con el precio calculado y se mantiene sincronizado mientras el admin
  // no lo edite a mano. En cuanto lo cambia (montoEditado), respetamos su valor (override) y mostramos el
  // precio de lista como referencia. Cortesía no cobra → no aplica.
  useEffect(() => {
    if (!esCortesia && !montoEditado && precio) setMonto(String(precio.total));
  }, [precio, esCortesia, montoEditado]);

  const montoNum = monto.trim() !== '' ? Number(monto) : null;

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

  // Subida OPTIMISTA (mismo patrón que apps/web · useR2Upload): preview local INMEDIATO con un blob URL y,
  // al terminar la subida real a R2, se reemplaza el blob por la URL pública (revocando el blob). Si falla,
  // se quita el preview. El spinner se muestra como overlay sobre la imagen, no en su lugar.
  const onArchivo = async (c: Carrusel, file: File | undefined) => {
    if (!file) return;
    const anterior = imagenes[c]; // si se reemplaza una de R2, queda huérfana → la borramos de R2
    const blobUrl = URL.createObjectURL(file);
    setImagenes((prev) => ({ ...prev, [c]: blobUrl })); // se ve YA, sin esperar la subida
    setSubiendo(c);
    try {
      const url = await subirImagenPublicidad(file);
      subidasSesion.current.add(url);
      setImagenes((prev) => ({ ...prev, [c]: url })); // blob → URL pública de R2
      if (anterior && anterior !== url && !anterior.startsWith('blob:')) {
        subidasSesion.current.delete(anterior);
        void descartarImagenesPublicidad([anterior]);
      }
    } catch {
      setImagenes((prev) => {
        const n = { ...prev };
        if (n[c] === blobUrl) delete n[c]; // falló → quitar el preview
        return n;
      });
      toast.error('No se pudo subir la imagen (revisa el CORS del bucket).');
    } finally {
      URL.revokeObjectURL(blobUrl);
      setSubiendo(null);
    }
  };

  // Quitar la creatividad (botón de basura): la saca del estado y, como no quedó ligada a ningún anuncio,
  // la BORRA de R2 al instante (descartarImagenesPublicidad → reference count). También sale de subidasSesion.
  const quitarImagen = (c: Carrusel) => {
    const url = imagenes[c];
    setImagenes((prev) => {
      const n = { ...prev };
      delete n[c];
      return n;
    });
    if (url) {
      subidasSesion.current.delete(url);
      void descartarImagenesPublicidad([url]);
    }
  };

  const toggleCiudad = (id: string) =>
    setCiudadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= limite ? prev : [...prev, id]));

  const ciudadesFiltradas = (busqueda
    ? ciudades.filter((c) => `${c.nombre} ${c.estado}`.toLowerCase().includes(busqueda.toLowerCase()))
    : ciudades
  ).slice(0, 40);
  const nombreCiudad = (id: string) => ciudades.find((c) => c.id === id)?.nombre ?? '—';
  // Con pocas ciudades activas el layout de 2 columnas deja un hueco grande → el modal pasa a VERTICAL
  // (1 columna, más angosto) y el selector de ciudades muestra la lista directa (sin buscador).
  const pocasCiudades = ciudades.length <= 6;
  // Con UNA sola ciudad activa no hay nada que elegir: se auto-selecciona y se muestra solo su badge.
  const ciudadUnica = ciudades.length === 1 ? ciudades[0] : null;
  const ciudadUnicaId = ciudadUnica?.id ?? null;
  useEffect(() => {
    if (ciudadUnicaId) setCiudadIds([ciudadUnicaId]);
  }, [ciudadUnicaId]);

  const todasImagenes = carruseles.length > 0 && carruseles.every((c) => imagenes[c]);
  const correoListo = correoExiste === true; // cuenta encontrada en AY → habilita el resto del formulario
  const puedeRegistrar =
    correoListo && carruseles.length > 0 && todasImagenes && ciudadIds.length > 0 && ciudadIds.length <= limite && !crear.isPending && !subiendo;

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
      ancho={pocasCiudades ? 'lg' : '2xl'}
      alturaMaxima="xl"
      discriminador="publicidad-alta-manual"
    >
      <div className="flex flex-col gap-4 p-5" data-testid="dialogo-publicidad-alta">
        {/* Anunciante (ancho completo) */}
        <div>
          <label className={LABEL}>Correo del anunciante</label>
          <div className="relative">
            <input
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com"
              data-testid="alta-correo"
              className={`${CAMPO} pr-9`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
              {verificandoCorreo ? (
                <Loader2 size={15} className="animate-spin text-texto-4" />
              ) : correoExiste === true ? (
                <Check size={15} style={{ color: 'var(--panel-ok)' }} />
              ) : correoExiste === false || (correoNorm !== '' && !formatoCorreoValido) ? (
                <X size={15} style={{ color: 'var(--panel-danger)' }} />
              ) : null}
            </span>
          </div>
          {correoNorm === '' ? (
            <p className="mt-1 text-[11.5px] text-texto-4">Debe ser una cuenta existente (negocio o persona).</p>
          ) : !formatoCorreoValido ? (
            <p className="mt-1 text-[11.5px]" style={{ color: 'var(--panel-danger)' }} data-testid="alta-correo-aviso">Escribe un correo válido.</p>
          ) : verificandoCorreo ? (
            <p className="mt-1 text-[11.5px] text-texto-4" data-testid="alta-correo-aviso">Verificando si existe la cuenta…</p>
          ) : correoExiste === true ? (
            <p className="mt-1 text-[11.5px]" style={{ color: 'var(--panel-ok)' }} data-testid="alta-correo-aviso">Cuenta encontrada en AnunciaYA.</p>
          ) : correoExiste === false ? (
            <p className="mt-1 text-[11.5px]" style={{ color: 'var(--panel-danger)' }} data-testid="alta-correo-aviso">No hay una cuenta registrada con ese correo.</p>
          ) : (
            <p className="mt-1 text-[11.5px] text-texto-4">Debe ser una cuenta existente (negocio o persona).</p>
          )}
        </div>

        {/* Resto del formulario: BLOQUEADO hasta confirmar que el correo es una cuenta existente en AY.
            fieldset disabled deshabilita todos los controles (teclado+mouse); opacity-50 lo señala. */}
        <fieldset disabled={!correoListo} className={`m-0 flex min-w-0 flex-col gap-4 border-0 p-0 transition-opacity ${!correoListo ? 'opacity-50' : ''}`}>
        {/* Layout: 2 columnas con muchas ciudades · 1 columna (vertical) con pocas → sin hueco */}
        <div className={`grid gap-4 ${pocasCiudades ? 'grid-cols-1' : 'lg:grid-cols-2 lg:items-start'}`}>
          {/* Columna izquierda: carruseles + periodo + cobro */}
          <div className="flex flex-col gap-4">
          {/* Carruseles + imágenes */}
          <div>
            <label className={LABEL}>Tamaño e imagen</label>
            <div className="grid grid-cols-2 gap-2.5 [align-items:start]">
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
                      <div className="relative mt-2.5">
                        {/* Recuadro grande clickeable = subir/cambiar imagen (tooltip del Panel, no title nativo) */}
                        <Tooltip text={url ? 'Cambiar imagen' : 'Subir imagen'} className="w-full">
                          <label
                            className={`relative block aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-[10px] border transition ${url ? 'border-borde' : 'border-dashed border-borde-fuerte bg-superficie hover:border-marca hover:bg-marca-suave/30'}`}
                          >
                            {url ? (
                              <>
                                <img src={url} alt={CARRUSEL_LABEL[c]} className={`h-full w-full object-cover transition-opacity ${subiendo === c ? 'opacity-60' : ''}`} />
                                {subiendo === c && (
                                  <span className="absolute inset-0 grid place-items-center bg-black/20">
                                    <Loader2 size={20} className="animate-spin text-white" />
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-texto-3">
                                <span className="text-[12.5px] font-medium">Subir imagen</span>
                              </span>
                            )}
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              data-testid={`alta-imagen-${c}`}
                              // Reseteamos el value tras capturar el archivo: si no, volver a elegir EL MISMO
                              // archivo (p. ej. tras borrarlo) no dispara onChange y parece que "no deja subir".
                              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; onArchivo(c, f); }}
                            />
                          </label>
                        </Tooltip>
                        {url && subiendo !== c && (
                          <div className="absolute right-1.5 top-1.5">
                            <Tooltip text="Eliminar imagen" position="left">
                              <button
                                type="button"
                                onClick={() => quitarImagen(c)}
                                aria-label="Eliminar imagen"
                                data-testid={`alta-imagen-quitar-${c}`}
                                className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-[var(--panel-danger)]"
                              >
                                <Trash2 size={14} />
                              </button>
                            </Tooltip>
                          </div>
                        )}
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

          {/* Ciudades — con una sola activa, solo el badge (auto-seleccionada); si hay varias, el selector */}
          <div>
            <label className={LABEL}>{ciudadUnica ? 'Ciudad' : `Ciudades (${ciudadIds.length}/${limite})`}</label>
            {ciudadUnica ? (
              <div className="flex items-center gap-2 rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-2.5" data-testid="alta-ciudad-unica">
                <MapPin size={14} className="shrink-0 text-marca" />
                <span className="text-[13px] font-medium text-texto">{ciudadUnica.nombre}</span>
                <span className="text-[12px] text-texto-4">· {ciudadUnica.estado}</span>
              </div>
            ) : (
              <>
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
                {!pocasCiudades && (
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
                )}
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
              </>
            )}
          </div>
        </div>

        {/* Cobro: cortesía = gratis; si no, UN solo campo "Monto a cobrar" pre-llenado con el calculado */}
        {esCortesia ? (
          <div className="flex items-center justify-between rounded-[10px] border border-borde bg-superficie-2 px-3.5 py-3">
            <span className="text-[13px] text-texto-3">Cortesía</span>
            <span className="text-[16px] font-semibold text-texto">Gratis</span>
          </div>
        ) : (
          <div>
            <label className={LABEL}>Monto a cobrar</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13.5px] text-texto-3">$</span>
              <input
                value={monto}
                onChange={(e) => { setMonto(e.target.value.replace(/[^0-9.]/g, '')); setMontoEditado(true); }}
                inputMode="decimal"
                placeholder={precio ? String(precio.total) : '0.00'}
                data-testid="alta-monto"
                className={`${CAMPO} pl-7`}
              />
            </div>
            {precio && (montoEditado && montoNum !== null && montoNum !== precio.total ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-texto-4">
                Precio de lista: <span className="font-semibold text-texto-2">{FMT.format(precio.total)}</span>{precio.esCombo && ` · combo −${precio.descuento}%`}
                <button
                  type="button"
                  onClick={() => { setMonto(String(precio.total)); setMontoEditado(false); }}
                  className="font-semibold text-marca hover:underline"
                >
                  Usar el calculado
                </button>
              </p>
            ) : (
              <p className="mt-1 text-[11.5px] text-texto-4">
                Calculado automáticamente{precio.esCombo && ` · combo −${precio.descuento}%`} — puedes ajustarlo si acordaste otro precio.
              </p>
            ))}
          </div>
        )}
        </fieldset>
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
