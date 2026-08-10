/**
 * ============================================================================
 * PÁGINA: Alta Rápida de Catálogo (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/catalogo/PaginaAltaRapidaCatalogo.tsx
 *
 * PROPÓSITO:
 * Pantalla de revisión en lote para cargar varios artículos de una sola vez.
 * Tres entradas convergen aquí (foto, texto pegado, captura manual) — todas
 * terminan llenando la misma tabla editable, que el comerciante revisa antes
 * de dar "Publicar todos". Mismo principio que el prefill de Coyo en
 * ModalArticulo: la IA arma el borrador, el comerciante da el click final.
 *
 * Tres entradas implementadas: captura manual (tabla editable), foto(s) de
 * menú/anaquel (Gemini) y texto pegado (Gemini) — ver
 * docs/arquitectura/Alta_Rapida_Catalogo.md.
 *
 * CREADO: Alta Rápida de Catálogo
 */

import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, ClipboardPaste, Package, Plus, Trash2, Wrench, Zap } from 'lucide-react';

import { Boton } from '../../../../components/ui/Boton';
import {
  useArticulosLista,
  useCrearArticulosLote,
  useSugerirArticulosLoteIA,
  useSugerirArticulosLoteTextoIA,
} from '../../../../hooks/queries/useArticulos';
import { generarUrlUploadImagenArticulo } from '../../../../services/articulosService';
import { optimizarImagen } from '../../../../utils/optimizarImagen';
import type { ArticuloCatalogoSugerido, CrearArticuloInput, TipoArticulo } from '../../../../types/articulos';
import { notificar } from '../../../../utils/notificaciones';

// =============================================================================
// CONSTANTES
// =============================================================================

const MAX_FILAS = 100;
/** Mismo tope que `sugerirArticulosLoteIASchema` en el backend. */
const MAX_IMAGENES_FOTO = 6;
/** Mismo tope que `sugerirArticulosLoteTextoIASchema` en el backend. */
const TEXTO_MAX_CHARS = 5000;

/**
 * Sube una foto a R2 (optimizada a WebP) y devuelve la URL pública, o `null`
 * si falla — mismos pasos que `useR2Upload`, pero standalone porque acá se
 * suben varias fotos en paralelo, no una sola con estado propio.
 */
async function subirFotoMenu(file: File): Promise<string | null> {
  try {
    const blob = await optimizarImagen(file, { maxWidth: 1920, quality: 0.85 });
    const nombreArchivo = file.name.replace(/\.[^.]+$/, '.webp');
    const respuesta = await generarUrlUploadImagenArticulo(nombreArchivo, 'image/webp');
    if (!respuesta.success || !respuesta.data) return null;
    const { uploadUrl, publicUrl } = respuesta.data;
    const putRespuesta = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': 'image/webp' },
    });
    return putRespuesta.ok ? publicUrl : null;
  } catch {
    return null;
  }
}

const LIMITES = {
  nombreMin: 2,
  nombreMax: 150,
  categoriaMax: 100,
  precioMax: 999999.99,
};

// =============================================================================
// TIPOS
// =============================================================================

type OrigenFila = 'manual' | 'ia_foto' | 'ia_texto';

interface FilaBorrador {
  clientId: string;
  tipo: TipoArticulo;
  nombre: string;
  categoria: string;
  precioBase: string;
  imagenPrincipal: string | null;
  disponible: boolean;
  incluida: boolean;
  origen: OrigenFila;
}

function crearFilaVacia(origen: OrigenFila = 'manual'): FilaBorrador {
  return {
    clientId: `fila-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo: 'producto',
    nombre: '',
    categoria: '',
    precioBase: '',
    imagenPrincipal: null,
    disponible: true,
    incluida: true,
    origen,
  };
}

/** Convierte un artículo sugerido por Coyo IA (foto o texto) en una fila de borrador. */
function filaDesdeSugerencia(item: ArticuloCatalogoSugerido, origen: OrigenFila): FilaBorrador {
  return {
    clientId: `fila-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo: item.tipo,
    nombre: item.nombre,
    categoria: item.categoria ?? '',
    precioBase: item.precioBase !== null ? String(item.precioBase) : '',
    imagenPrincipal: null,
    disponible: true,
    incluida: true,
    origen,
  };
}

function validarFila(fila: FilaBorrador): string[] {
  const errores: string[] = [];
  const nombre = fila.nombre.trim();
  if (nombre.length < LIMITES.nombreMin || nombre.length > LIMITES.nombreMax) {
    errores.push(`Nombre: entre ${LIMITES.nombreMin} y ${LIMITES.nombreMax} caracteres`);
  }
  if (fila.categoria.trim().length > LIMITES.categoriaMax) {
    errores.push(`Categoría: máximo ${LIMITES.categoriaMax} caracteres`);
  }
  const precio = Number(fila.precioBase);
  if (fila.precioBase.trim() === '' || Number.isNaN(precio) || precio <= 0) {
    errores.push('Precio: debe ser mayor a 0');
  } else if (precio > LIMITES.precioMax) {
    errores.push(`Precio: no puede exceder $${LIMITES.precioMax.toLocaleString('es-MX')}`);
  }
  return errores;
}

// =============================================================================
// SUBCOMPONENTE: Toggle de tipo (producto/servicio) — celda compacta
// =============================================================================

function ToggleTipoCelda({
  valor,
  onChange,
  testIdPrefix,
}: {
  valor: TipoArticulo;
  onChange: (v: TipoArticulo) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="flex items-center bg-slate-100 rounded-lg border border-slate-300 p-0.5 w-fit">
      <button
        type="button"
        data-testid={`${testIdPrefix}-producto`}
        onClick={() => onChange('producto')}
        className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
          valor === 'producto' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200'
        }`}
        title="Producto"
      >
        <Package className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        data-testid={`${testIdPrefix}-servicio`}
        onClick={() => onChange('servicio')}
        className={`h-7 w-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
          valor === 'servicio' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200'
        }`}
        title="Servicio"
      >
        <Wrench className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaAltaRapidaCatalogo() {
  const navigate = useNavigate();
  const { data: articulosExistentes = [] } = useArticulosLista();
  const crearLoteMutation = useCrearArticulosLote();
  const sugerirFotoMutation = useSugerirArticulosLoteIA();
  const sugerirTextoMutation = useSugerirArticulosLoteTextoIA();
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const [filas, setFilas] = useState<FilaBorrador[]>([]);
  const [analizandoFoto, setAnalizandoFoto] = useState(false);
  const [panelTextoAbierto, setPanelTextoAbierto] = useState(false);
  const [textoPegado, setTextoPegado] = useState('');
  const [analizandoTexto, setAnalizandoTexto] = useState(false);

  const categoriasSugeridas = useMemo(() => {
    const categorias = new Set<string>();
    articulosExistentes.forEach((art) => {
      if (art.categoria && art.categoria !== 'General') categorias.add(art.categoria);
    });
    return Array.from(categorias).sort();
  }, [articulosExistentes]);

  const erroresPorFila = useMemo(() => {
    const mapa = new Map<string, string[]>();
    filas.forEach((fila) => mapa.set(fila.clientId, validarFila(fila)));
    return mapa;
  }, [filas]);

  const totalConError = filas.filter((f) => f.incluida && (erroresPorFila.get(f.clientId)?.length ?? 0) > 0).length;
  const filasListas = filas.filter((f) => f.incluida && (erroresPorFila.get(f.clientId)?.length ?? 0) === 0);

  // ===========================================================================
  // HANDLERS
  // ===========================================================================

  function agregarFila(origen: OrigenFila = 'manual') {
    if (filas.length >= MAX_FILAS) {
      notificar.advertencia(`No puedes cargar más de ${MAX_FILAS} artículos a la vez`);
      return;
    }
    setFilas((prev) => [...prev, crearFilaVacia(origen)]);
  }

  function actualizarFila(clientId: string, cambios: Partial<FilaBorrador>) {
    setFilas((prev) => prev.map((f) => (f.clientId === clientId ? { ...f, ...cambios } : f)));
  }

  function eliminarFila(clientId: string) {
    setFilas((prev) => prev.filter((f) => f.clientId !== clientId));
  }

  async function handleSeleccionFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite volver a elegir el mismo archivo después

    if (archivos.length === 0) return;

    let archivosAUsar = archivos;
    if (archivos.length > MAX_IMAGENES_FOTO) {
      notificar.advertencia(`Solo se analizan las primeras ${MAX_IMAGENES_FOTO} fotos`);
      archivosAUsar = archivos.slice(0, MAX_IMAGENES_FOTO);
    }

    setAnalizandoFoto(true);
    try {
      const urls = (await Promise.all(archivosAUsar.map(subirFotoMenu))).filter(
        (url): url is string => url !== null
      );

      if (urls.length === 0) {
        notificar.error('No se pudieron subir las fotos, intenta de nuevo');
        return;
      }

      const resultado = await sugerirFotoMutation.mutateAsync(urls);

      if (!resultado.success) {
        notificar.advertencia('No se pudo analizar la foto por ahora. Agrega los artículos manualmente.');
        return;
      }
      if (resultado.data.length === 0) {
        notificar.advertencia('No se detectaron artículos en la foto. Intenta con otra imagen más clara.');
        return;
      }

      agregarFilasDesdeIA(resultado.data, 'ia_foto');
    } catch {
      notificar.error('Error al analizar la foto');
    } finally {
      setAnalizandoFoto(false);
    }
  }

  function agregarFilasDesdeIA(detectadosCrudos: ArticuloCatalogoSugerido[], origen: OrigenFila) {
    const espacioDisponible = MAX_FILAS - filas.length;
    const detectados = detectadosCrudos.slice(0, Math.max(espacioDisponible, 0));

    setFilas((prev) => [...prev, ...detectados.map((item) => filaDesdeSugerencia(item, origen))]);

    notificar.exito(
      `${detectados.length} artículo${detectados.length === 1 ? '' : 's'} detectado${detectados.length === 1 ? '' : 's'} — revísalos antes de publicar`
    );
  }

  async function handleAnalizarTexto() {
    const texto = textoPegado.trim();
    if (texto.length < 5) return;

    setAnalizandoTexto(true);
    try {
      const resultado = await sugerirTextoMutation.mutateAsync(texto);

      if (!resultado.success) {
        notificar.advertencia('No se pudo analizar el texto por ahora. Agrega los artículos manualmente.');
        return;
      }
      if (resultado.data.length === 0) {
        notificar.advertencia('No se detectaron artículos en el texto. Revisa el formato e intenta de nuevo.');
        return;
      }

      agregarFilasDesdeIA(resultado.data, 'ia_texto');
      setTextoPegado('');
      setPanelTextoAbierto(false);
    } catch {
      notificar.error('Error al analizar el texto');
    } finally {
      setAnalizandoTexto(false);
    }
  }

  async function handlePublicar() {
    if (filasListas.length === 0) return;

    const payload: CrearArticuloInput[] = filasListas.map((f) => ({
      tipo: f.tipo,
      nombre: f.nombre.trim(),
      categoria: f.categoria.trim() || undefined,
      precioBase: Number(f.precioBase),
      imagenPrincipal: f.imagenPrincipal,
      disponible: f.disponible,
    }));

    try {
      await crearLoteMutation.mutateAsync(payload);
      navigate('/business-studio/catalogo');
    } catch {
      // Error ya notificado por la mutación
    }
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  return (
    <div className="p-3 lg:p-1.5 2xl:p-3">
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

        {/* ================================================================= */}
        {/* HEADER                                                            */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            data-testid="btn-volver-catalogo"
            onClick={() => navigate('/business-studio/catalogo')}
            className="w-8 h-8 rounded-lg flex items-center justify-center border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-600 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-extrabold text-slate-900 truncate leading-tight">Alta Rápida de Catálogo</h1>
            <p className="text-sm text-slate-500 font-medium leading-tight">Agrega varios artículos a la vez</p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* ENTRADAS                                                          */}
        {/* ================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Boton
            variante="secundario"
            className="shrink-0"
            data-testid="btn-subir-fotos-alta-rapida"
            iconoIzquierda={analizandoFoto ? undefined : <Camera className="w-4 h-4" />}
            cargando={analizandoFoto}
            onClick={() => inputFotoRef.current?.click()}
          >
            {analizandoFoto ? 'Analizando foto(s)…' : 'Subir foto(s)'}
          </Boton>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleSeleccionFotos}
            className="hidden"
            data-testid="input-fotos-alta-rapida"
          />
          <Boton
            variante="secundario"
            className="shrink-0"
            data-testid="btn-pegar-texto-alta-rapida"
            iconoIzquierda={<ClipboardPaste className="w-4 h-4" />}
            onClick={() => setPanelTextoAbierto((prev) => !prev)}
          >
            Pegar texto
          </Boton>
          <Boton
            variante="primario"
            className="shrink-0"
            data-testid="btn-agregar-fila-alta-rapida"
            iconoIzquierda={<Plus className="w-4 h-4" />}
            onClick={() => agregarFila('manual')}
          >
            Agregar fila
          </Boton>
        </div>

        {/* ================================================================= */}
        {/* PANEL: PEGAR TEXTO                                                */}
        {/* ================================================================= */}
        {panelTextoAbierto && (
          <div className="rounded-xl border-2 border-slate-300 bg-white p-3 space-y-2">
            <textarea
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
              placeholder={'Pega aquí tu lista tal cual la tienes en WhatsApp o Facebook, por ejemplo:\nTacos de asada $18\nRefresco $20\nTorta ahogada $65'}
              maxLength={TEXTO_MAX_CHARS}
              rows={6}
              data-testid="textarea-pegar-texto-alta-rapida"
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">{textoPegado.length}/{TEXTO_MAX_CHARS}</span>
              <div className="flex gap-2">
                <Boton
                  variante="outlineGray"
                  tamanio="sm"
                  data-testid="btn-cancelar-texto-alta-rapida"
                  onClick={() => { setPanelTextoAbierto(false); setTextoPegado(''); }}
                >
                  Cancelar
                </Boton>
                <Boton
                  variante="primario"
                  tamanio="sm"
                  data-testid="btn-analizar-texto-alta-rapida"
                  disabled={textoPegado.trim().length < 5}
                  cargando={analizandoTexto}
                  onClick={handleAnalizarTexto}
                >
                  Analizar texto
                </Boton>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CONTADOR                                                          */}
        {/* ================================================================= */}
        {filas.length > 0 && (
          <div className="flex items-center justify-between px-1 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-600">
            <span>
              {filas.length} artículo{filas.length === 1 ? '' : 's'} · {filasListas.length} listo{filasListas.length === 1 ? '' : 's'}
              {totalConError > 0 && <span className="text-red-600"> · {totalConError} con error</span>}
            </span>
          </div>
        )}

        {/* ================================================================= */}
        {/* TABLA EDITABLE                                                    */}
        {/* ================================================================= */}
        {filas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 text-center px-4">
            <Package className="w-10 h-10 mb-2 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Aún no agregas artículos</p>
            <p className="text-xs font-medium text-slate-500 mt-1">Usa "Agregar fila" para empezar a capturar tu catálogo</p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-slate-300 overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                {/* Header */}
                <div
                  className="grid grid-cols-[110px_minmax(200px,1fr)_180px_120px_90px_44px] gap-3 px-4 py-2.5 items-center text-[11px] lg:text-[12px] font-bold text-white uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                >
                  <span>Tipo</span>
                  <span>Nombre</span>
                  <span>Categoría</span>
                  <span>Precio</span>
                  <span className="text-center">Visible</span>
                  <span />
                </div>

                {/* Filas */}
                <datalist id="datalist-categorias-alta-rapida">
                  {categoriasSugeridas.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>

                {filas.map((fila) => {
                  const errores = erroresPorFila.get(fila.clientId) ?? [];
                  const conError = errores.length > 0;
                  return (
                    <div
                      key={fila.clientId}
                      className={`grid grid-cols-[110px_minmax(200px,1fr)_180px_120px_90px_44px] gap-3 px-4 py-2.5 items-center border-t border-slate-200 ${
                        conError ? 'bg-red-50' : 'bg-white'
                      } ${!fila.incluida ? 'opacity-50' : ''}`}
                    >
                      {/* Tipo + checkbox incluir */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={fila.incluida}
                          onChange={(e) => actualizarFila(fila.clientId, { incluida: e.target.checked })}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-slate-500 shrink-0"
                          title="Incluir al publicar"
                          data-testid={`checkbox-incluir-${fila.clientId}`}
                        />
                        <ToggleTipoCelda
                          valor={fila.tipo}
                          onChange={(tipo) => actualizarFila(fila.clientId, { tipo })}
                          testIdPrefix={`toggle-tipo-${fila.clientId}`}
                        />
                      </div>

                      {/* Nombre */}
                      <div className="relative">
                        {fila.origen !== 'manual' && (
                          <span
                            className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-purple-500"
                            title="Sugerido por IA — revisa antes de publicar"
                          />
                        )}
                        <input
                          type="text"
                          value={fila.nombre}
                          onChange={(e) => actualizarFila(fila.clientId, { nombre: e.target.value })}
                          placeholder="Nombre del artículo"
                          maxLength={LIMITES.nombreMax}
                          data-testid={`input-nombre-${fila.clientId}`}
                          className="w-full h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>

                      {/* Categoría */}
                      <div>
                        <input
                          type="text"
                          list="datalist-categorias-alta-rapida"
                          value={fila.categoria}
                          onChange={(e) => actualizarFila(fila.clientId, { categoria: e.target.value })}
                          placeholder="General"
                          maxLength={LIMITES.categoriaMax}
                          data-testid={`input-categoria-${fila.clientId}`}
                          className="w-full h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>

                      {/* Precio */}
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={fila.precioBase}
                          onChange={(e) => actualizarFila(fila.clientId, { precioBase: e.target.value })}
                          placeholder="0.00"
                          data-testid={`input-precio-${fila.clientId}`}
                          className="w-full h-9 pl-6 pr-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        />
                      </div>

                      {/* Disponible */}
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={fila.disponible}
                          onChange={(e) => actualizarFila(fila.clientId, { disponible: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-slate-500"
                          title="Visible en el catálogo público"
                          data-testid={`checkbox-disponible-${fila.clientId}`}
                        />
                      </div>

                      {/* Eliminar */}
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => eliminarFila(fila.clientId)}
                          className="text-red-600 hover:text-red-700 cursor-pointer"
                          data-testid={`btn-eliminar-fila-${fila.clientId}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Errores de la fila */}
                      {conError && (
                        <div className="col-span-6 -mt-1 pl-[122px] text-xs font-semibold text-red-600">
                          {errores.join(' · ')}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Agregar fila al final de la tabla */}
                <button
                  type="button"
                  onClick={() => agregarFila('manual')}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  data-testid="btn-agregar-fila-footer"
                >
                  <Plus className="w-4 h-4" />
                  Agregar fila
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PUBLICAR                                                          */}
        {/* ================================================================= */}
        {filas.length > 0 && (
          <div className="flex justify-end">
            <Boton
              variante="primario"
              tamanio="lg"
              disabled={filasListas.length === 0}
              cargando={crearLoteMutation.isPending}
              onClick={handlePublicar}
              data-testid="btn-publicar-lote"
            >
              Publicar {filasListas.length} artículo{filasListas.length === 1 ? '' : 's'}
            </Boton>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaginaAltaRapidaCatalogo;
