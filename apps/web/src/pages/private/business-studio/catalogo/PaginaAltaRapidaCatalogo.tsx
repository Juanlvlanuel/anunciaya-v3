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
import { ArrowLeft, Camera, Check, ClipboardPaste, Eye, EyeOff, Package, Plus, Trash2, Wrench, Zap } from 'lucide-react';

import { Boton } from '../../../../components/ui/Boton';
import Tooltip from '../../../../components/ui/Tooltip';
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

// =============================================================================
// CSS — Animación del icono del header (mismo patrón que PaginaCatalogo)
// =============================================================================

const ESTILOS_CSS = `
  @keyframes alta-rapida-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .alta-rapida-icon-bounce {
    animation: alta-rapida-icon-bounce 2s ease-in-out infinite;
  }
`;

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
  descripcionMax: 1000,
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
  descripcion: string;
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
    descripcion: '',
    categoria: '',
    precioBase: '',
    imagenPrincipal: null,
    disponible: true,
    incluida: true,
    origen,
  };
}

/**
 * Convierte un artículo sugerido por Coyo IA (foto o texto) en una fila de
 * borrador. `imagenPrincipal` solo se adjunta cuando la IA detectó un único
 * artículo en la foto (caso "un solo platillo/producto") — ahí la foto
 * subida ES ese artículo. Con un menú de varios artículos no se adjunta
 * ninguna imagen (no tendría sentido repetir la foto del menú en cada fila).
 */
function filaDesdeSugerencia(item: ArticuloCatalogoSugerido, origen: OrigenFila, imagenPrincipal: string | null = null): FilaBorrador {
  return {
    clientId: `fila-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo: item.tipo,
    nombre: item.nombre,
    descripcion: item.descripcion ?? '',
    categoria: item.categoria ?? '',
    precioBase: item.precioBase !== null ? String(item.precioBase) : '',
    imagenPrincipal,
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
  if (fila.descripcion.trim().length > LIMITES.descripcionMax) {
    errores.push(`Descripción: máximo ${LIMITES.descripcionMax} caracteres`);
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
      <Tooltip text="Producto" position="bottom">
        <button
          type="button"
          data-testid={`${testIdPrefix}-producto`}
          onClick={() => onChange('producto')}
          className={`h-9 w-9 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
            valor === 'producto' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Package className="w-4.5 h-4.5" />
        </button>
      </Tooltip>
      <Tooltip text="Servicio" position="bottom">
        <button
          type="button"
          data-testid={`${testIdPrefix}-servicio`}
          onClick={() => onChange('servicio')}
          className={`h-9 w-9 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
            valor === 'servicio' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Wrench className="w-4.5 h-4.5" />
        </button>
      </Tooltip>
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
  // IDs de filas cuyo error ya se reveló (solo después de intentar "Publicar").
  // Nunca se marca una fila en rojo al crearla o mientras se escribe — solo
  // al verificar los datos obligatorios en el intento de guardado.
  const [filasConErrorRevelado, setFilasConErrorRevelado] = useState<Set<string>>(new Set());

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

  const incluidas = filas.filter((f) => f.incluida);
  const filasListas = incluidas.filter((f) => (erroresPorFila.get(f.clientId)?.length ?? 0) === 0);
  // Solo cuenta como "con error" lo que ya se reveló en un intento de publicar.
  const totalConError = filas.filter(
    (f) => filasConErrorRevelado.has(f.clientId) && (erroresPorFila.get(f.clientId)?.length ?? 0) > 0
  ).length;

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

      // Si la IA detectó un solo artículo (foto de un platillo/producto, no un
      // menú), la primera foto subida ES ese artículo — se adjunta como imagen.
      agregarFilasDesdeIA(resultado.data, 'ia_foto', urls[0]);
    } catch (error) {
      console.error('Error al analizar foto(s) en Alta Rápida:', error);
      notificar.error('Error al analizar la foto');
    } finally {
      setAnalizandoFoto(false);
    }
  }

  function agregarFilasDesdeIA(
    detectadosCrudos: ArticuloCatalogoSugerido[],
    origen: OrigenFila,
    imagenParaArticuloUnico?: string
  ) {
    const espacioDisponible = MAX_FILAS - filas.length;
    const detectados = detectadosCrudos.slice(0, Math.max(espacioDisponible, 0));
    // Solo se adjunta imagen cuando la IA devolvió UN artículo — con un menú de
    // varios no tendría sentido repetir la misma foto en cada fila.
    const imagenUnica = detectados.length === 1 ? imagenParaArticuloUnico ?? null : null;

    setFilas((prev) => [
      ...prev,
      ...detectados.map((item) => filaDesdeSugerencia(item, origen, imagenUnica)),
    ]);

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
    } catch (error) {
      console.error('Error al analizar texto en Alta Rápida:', error);
      notificar.error('Error al analizar el texto');
    } finally {
      setAnalizandoTexto(false);
    }
  }

  async function handlePublicar() {
    if (incluidas.length === 0) return;

    // Verificación de datos obligatorios: solo aquí, al intentar publicar.
    const conError = incluidas.filter((f) => (erroresPorFila.get(f.clientId)?.length ?? 0) > 0);
    if (conError.length > 0) {
      setFilasConErrorRevelado(new Set(conError.map((f) => f.clientId)));
      notificar.error(
        `${conError.length} artículo${conError.length === 1 ? '' : 's'} con datos incompletos — revisa los campos en rojo`
      );
      return;
    }
    setFilasConErrorRevelado(new Set());

    const payload: CrearArticuloInput[] = filasListas.map((f) => ({
      tipo: f.tipo,
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim() || undefined,
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
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_CSS }} />
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

        {/* ================================================================= */}
        {/* HEADER + ENTRADAS (misma fila, entradas alineadas a la derecha)  */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              data-testid="btn-volver-catalogo"
              onClick={() => navigate('/business-studio/catalogo')}
              className="w-9 h-9 rounded-lg flex items-center justify-center border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-600 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #b45309, #d97706, #f59e0b)',
                boxShadow: '0 6px 20px rgba(217,119,6,0.4)',
              }}
            >
              <div className="alta-rapida-icon-bounce">
                <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight truncate">Alta Rápida de Catálogo</h1>
              <p className="text-base text-slate-600 -mt-1 font-medium">Agrega varios artículos a la vez</p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-slate-300 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-800">Aquí va a aparecer tu catálogo</p>
            <p className="text-base font-medium text-slate-500 mt-1 mb-4">Elige cómo capturar tus artículos</p>

            <div className="flex flex-col gap-3.5 text-left w-full max-w-md">
              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-base text-slate-600">
                  <span className="font-bold text-slate-800">Subir foto(s):</span> sube tu menú, anaquel o hasta la foto de un solo platillo — la IA escribe los artículos (título y descripción incluidos) por ti, tú solo revisas y publicas.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <ClipboardPaste className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-base text-slate-600">
                  <span className="font-bold text-slate-800">Pegar texto:</span> pega tu lista de WhatsApp o Facebook y la IA la estructura por ti.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Plus className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                <p className="text-base text-slate-600">
                  <span className="font-bold text-slate-800">Agregar fila:</span> captura tus artículos uno por uno, directo en la tabla.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-slate-300 overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                {/* Header */}
                <div
                  className="grid grid-cols-[110px_minmax(200px,1fr)_180px_120px_100px] gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-4 2xl:px-5 py-2 lg:py-2.5 2xl:py-2 lg:h-[40px] 2xl:h-12 items-center text-[11px] lg:text-[12px] 2xl:text-sm font-bold text-white uppercase tracking-wider"
                  style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                >
                  <span>Tipo</span>
                  <span>Nombre</span>
                  <span>Categoría</span>
                  <span>Precio</span>
                  <span className="text-center">Acciones</span>
                </div>

                <datalist id="datalist-categorias-alta-rapida">
                  {categoriasSugeridas.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>

                {/* Filas — alto fijo con scroll interno, así la caja no cambia de tamaño según cuántos artículos tenga */}
                <div className="h-[480px] overflow-y-auto bg-white">
                {filas.map((fila) => {
                  const errores = erroresPorFila.get(fila.clientId) ?? [];
                  // Solo se muestra en rojo si ya se reveló en un intento de publicar.
                  const conError = filasConErrorRevelado.has(fila.clientId) && errores.length > 0;
                  return (
                    <div
                      key={fila.clientId}
                      className={`grid grid-cols-[110px_minmax(200px,1fr)_180px_120px_100px] gap-3 px-4 py-2.5 items-center border-t border-slate-200 ${
                        conError ? 'bg-red-50' : 'bg-white'
                      } ${!fila.incluida ? 'opacity-50' : ''}`}
                    >
                      {/* Tipo + incluir al publicar */}
                      <div className="flex items-center gap-2">
                        <Tooltip text={fila.incluida ? 'Excluir de la publicación' : 'Incluir al publicar'} position="bottom">
                          <button
                            type="button"
                            onClick={() => actualizarFila(fila.clientId, { incluida: !fila.incluida })}
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              fila.incluida ? 'bg-slate-700 border-slate-700' : 'bg-white border-slate-300 hover:border-slate-400'
                            }`}
                            data-testid={`checkbox-incluir-${fila.clientId}`}
                          >
                            {fila.incluida && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                          </button>
                        </Tooltip>
                        <ToggleTipoCelda
                          valor={fila.tipo}
                          onChange={(tipo) => actualizarFila(fila.clientId, { tipo })}
                          testIdPrefix={`toggle-tipo-${fila.clientId}`}
                        />
                      </div>

                      {/* Nombre */}
                      <div className="relative flex items-start gap-2">
                        {fila.origen !== 'manual' && (
                          <span
                            className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-purple-500 z-10"
                            title="Sugerido por IA — revisa antes de publicar"
                          />
                        )}
                        {fila.imagenPrincipal && (
                          <img
                            src={fila.imagenPrincipal}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200"
                            title="Imagen del artículo"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={fila.nombre}
                            onChange={(e) => actualizarFila(fila.clientId, { nombre: e.target.value })}
                            placeholder="Nombre del artículo"
                            maxLength={LIMITES.nombreMax}
                            data-testid={`input-nombre-${fila.clientId}`}
                            className="w-full h-9 px-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                          />
                          <input
                            type="text"
                            value={fila.descripcion}
                            onChange={(e) => actualizarFila(fila.clientId, { descripcion: e.target.value })}
                            placeholder="Descripción (opcional)"
                            maxLength={LIMITES.descripcionMax}
                            data-testid={`input-descripcion-${fila.clientId}`}
                            className="w-full h-7 mt-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500"
                          />
                        </div>
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

                      {/* Acciones: Visible + Eliminar */}
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip text={fila.disponible ? 'Ocultar' : 'Mostrar'}>
                          <button
                            type="button"
                            onClick={() => actualizarFila(fila.clientId, { disponible: !fila.disponible })}
                            className="p-1.5 rounded-lg cursor-pointer hover:bg-green-100"
                            data-testid={`btn-visible-${fila.clientId}`}
                          >
                            {fila.disponible
                              ? <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-700" />
                              : <EyeOff className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-700" />
                            }
                          </button>
                        </Tooltip>
                        <Tooltip text="Eliminar">
                          <button
                            type="button"
                            onClick={() => eliminarFila(fila.clientId)}
                            className="p-1.5 rounded-lg cursor-pointer text-red-600 hover:bg-red-100"
                            data-testid={`btn-eliminar-fila-${fila.clientId}`}
                          >
                            <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                          </button>
                        </Tooltip>
                      </div>

                      {/* Errores de la fila */}
                      {conError && (
                        <div className="col-span-5 -mt-1 pl-[122px] text-xs font-semibold text-red-600">
                          {errores.join(' · ')}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>

                {/* Agregar fila al final de la tabla — fuera del scroll, siempre visible */}
                <button
                  type="button"
                  onClick={() => agregarFila('manual')}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-200 cursor-pointer"
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
              tamanio="md"
              disabled={incluidas.length === 0}
              cargando={crearLoteMutation.isPending}
              onClick={handlePublicar}
              data-testid="btn-publicar-lote"
            >
              Publicar {incluidas.length} artículo{incluidas.length === 1 ? '' : 's'}
            </Boton>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaginaAltaRapidaCatalogo;
