/**
 * GaleriaArchivosCompartidos.tsx
 * ================================
 * Galería fullscreen de archivos compartidos en una conversación.
 * Estilo WhatsApp: 3 tabs (Archivos multimedia, Documentos, Enlaces)
 * con contenido agrupado por mes.
 *
 * Se abre desde PanelInfoContacto al dar click en "Archivos, enlaces y documentos".
 *
 * UBICACIÓN: apps/web/src/components/chatya/GaleriaArchivosCompartidos.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, FileText, Link2, Image as ImageIcon, Download, ExternalLink } from 'lucide-react';
import { getArchivosCompartidos } from '../../services/chatyaService';
import type { ArchivoCompartido, CategoriaArchivo, ContenidoImagen, ConteoArchivosCompartidos } from '../../types/chatya';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// =============================================================================
// TIPOS
// =============================================================================

interface GaleriaArchivosCompartidosProps {
  conversacionId: string;
  conteo: ConteoArchivosCompartidos;
  onCerrar: () => void;
  onAbrirVisorArchivos: (archivoId: string) => void;
}

interface ContenidoDocumento {
  url: string;
  nombre?: string;
  tamano?: number;
  tipoArchivo?: string;
  extension?: string;
}

interface GrupoMes {
  label: string;
  items: ArchivoCompartido[];
}

// =============================================================================
// HELPERS
// =============================================================================

/** Agrupar archivos por mes/año */
function agruparPorMes(items: ArchivoCompartido[]): GrupoMes[] {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  const grupos = new Map<string, ArchivoCompartido[]>();

  for (const item of items) {
    const fecha = new Date(item.createdAt);
    const mes = fecha.getMonth();
    const anio = fecha.getFullYear();

    let label: string;
    if (mes === mesActual && anio === anioActual) {
      label = 'Este mes';
    } else if (
      (mes === mesActual - 1 && anio === anioActual) ||
      (mesActual === 0 && mes === 11 && anio === anioActual - 1)
    ) {
      label = 'Mes pasado';
    } else {
      label = fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }

    if (!grupos.has(label)) {
      grupos.set(label, []);
    }
    grupos.get(label)!.push(item);
  }

  return Array.from(grupos.entries()).map(([label, items]) => ({ label, items }));
}

/** Extraer URLs de un texto */
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

function extraerEnlaces(texto: string): string[] {
  return texto.match(URL_REGEX) || [];
}

/** Formatear tamaño de archivo */
function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Color del ícono según extensión */
function colorExtension(ext?: string): string {
  if (!ext) return 'text-white/50 lg:text-slate-600';
  const e = ext.toLowerCase();
  if (e === 'pdf') return 'text-red-400';
  if (['doc', 'docx'].includes(e)) return 'text-blue-400';
  if (['xls', 'xlsx'].includes(e)) return 'text-green-400';
  if (['ppt', 'pptx'].includes(e)) return 'text-orange-400';
  if (['zip', 'rar', '7z'].includes(e)) return 'text-yellow-400';
  return 'text-white/50 lg:text-slate-600';
}

// =============================================================================
// TABS
// =============================================================================

const TABS: { id: CategoriaArchivo; label: string }[] = [
  { id: 'imagenes', label: 'Multimedia' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'enlaces', label: 'Enlaces' },
];

// =============================================================================
// CACHÉ A NIVEL DE MÓDULO (persiste entre aperturas de la galería)
// =============================================================================

const cachéGaleria = new Map<string, { items: ArchivoCompartido[]; total: number }>();

/** Genera key única: conversacionId + categoria */
function cacheKey(convId: string, cat: CategoriaArchivo): string {
  return `${convId}:${cat}`;
}

/** Invalida caché de la galería para una conversación */
export function invalidarCachéGaleria(conversacionId: string) {
  for (const key of cachéGaleria.keys()) {
    if (key.startsWith(conversacionId)) {
      cachéGaleria.delete(key);
    }
  }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function GaleriaArchivosCompartidos({
  conversacionId,
  conteo,
  onCerrar,
  onAbrirVisorArchivos,
}: GaleriaArchivosCompartidosProps) {

  const { esMobile } = useBreakpoint();
  const [tabActiva, setTabActiva] = useState<CategoriaArchivo>('imagenes');
  const [items, setItems] = useState<ArchivoCompartido[]>(() => {
    const cached = cachéGaleria.get(cacheKey(conversacionId, 'imagenes'));
    return cached ? cached.items : [];
  });
  const [cargando, setCargando] = useState(() => {
    return !cachéGaleria.has(cacheKey(conversacionId, 'imagenes'));
  });
  const [offset, setOffset] = useState(() => {
    const cached = cachéGaleria.get(cacheKey(conversacionId, 'imagenes'));
    return cached ? cached.items.length : 0;
  });
  const [total, setTotal] = useState(() => {
    const cached = cachéGaleria.get(cacheKey(conversacionId, 'imagenes'));
    return cached ? cached.total : 0;
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Cargar datos al cambiar tab ───────────────────────────────────────
  useEffect(() => {
    const key = cacheKey(conversacionId, tabActiva);
    const cached = cachéGaleria.get(key);
    if (cached) {
      setItems(cached.items);
      setTotal(cached.total);
      setOffset(cached.items.length);
      setCargando(false);
      return;
    }

    setCargando(true);
    setItems([]);
    setOffset(0);

    getArchivosCompartidos(conversacionId, tabActiva, 60, 0)
      .then((res) => {
        if (res.success && res.data) {
          setItems(res.data.items);
          setTotal(res.data.total);
          setOffset(res.data.items.length);
          cachéGaleria.set(key, { items: res.data.items, total: res.data.total });
        }
      })
      .catch(() => void 0)
      .finally(() => setCargando(false));
  }, [conversacionId, tabActiva]);

  // ─── Cargar más (scroll infinito) ──────────────────────────────────────
  const cargarMas = useCallback(() => {
    if (cargando || items.length >= total) return;
    setCargando(true);

    getArchivosCompartidos(conversacionId, tabActiva, 60, offset)
      .then((res) => {
        if (res.success && res.data) {
          const nuevos = [...items, ...res.data.items];
          setItems(nuevos);
          setOffset(nuevos.length);
          cachéGaleria.set(cacheKey(conversacionId, tabActiva), { items: nuevos, total: res.data.total });
        }
      })
      .catch(() => void 0)
      .finally(() => setCargando(false));
  }, [conversacionId, tabActiva, items, total, offset, cargando]);

  // ─── Scroll infinito ──────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) {
      cargarMas();
    }
  }, [cargarMas]);

  // ─── Scroll al tope al cambiar tab ────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [tabActiva]);

  // ─── Grupos por mes ───────────────────────────────────────────────────
  const grupos = agruparPorMes(items);

  // ─── Conteo por tab ───────────────────────────────────────────────────
  const conteoTab = (tab: CategoriaArchivo): number => {
    if (tab === 'imagenes') return conteo.imagenes;
    if (tab === 'documentos') return conteo.documentos;
    return conteo.enlaces;
  };

  return (
    <div className={`flex-1 flex flex-col min-h-0 ${esMobile ? 'bg-linear-to-b from-[#0B358F] to-[#050d1a]' : 'bg-transparent'}`}>

      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3 px-4 py-3 lg:py-3.5 shrink-0 border-b border-white/10 lg:border-slate-300">
        <button
          onClick={onCerrar}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/10 lg:hover:bg-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 text-white/70 lg:text-slate-600" />
        </button>
        <span className="text-base lg:text-base font-semibold text-white lg:text-slate-800 flex-1">
          Archivos, enlaces y documentos
        </span>
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="flex shrink-0 border-b border-white/10 lg:border-slate-300">
        {TABS.map((tab) => {
          const activa = tabActiva === tab.id;
          const count = conteoTab(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => {
                const key = cacheKey(conversacionId, tab.id);
                const cached = cachéGaleria.get(key);
                if (cached) {
                  setItems(cached.items);
                  setTotal(cached.total);
                  setOffset(cached.items.length);
                  setCargando(false);
                }
                setTabActiva(tab.id);
              }}
              className={`flex-1 py-2.5 text-sm font-semibold cursor-pointer relative ${
                activa
                  ? 'text-white lg:text-slate-900'
                  : 'text-white/40 lg:text-slate-600 hover:text-white/60 lg:hover:text-slate-800'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`ml-1 text-[11px] ${activa ? 'text-white/60 lg:text-slate-600' : 'text-white/25 lg:text-slate-600'}`}>
                  {count}
                </span>
              )}
              {/* Indicador activo */}
              {activa && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-white lg:bg-slate-700 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ Contenido scrollable ═══ */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      >
        {/* Estado vacío */}
        {!cargando && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            {tabActiva === 'imagenes' && <ImageIcon className="w-12 h-12 text-white/15 lg:text-slate-600 mb-3" />}
            {tabActiva === 'documentos' && <FileText className="w-12 h-12 text-white/15 lg:text-slate-600 mb-3" />}
            {tabActiva === 'enlaces' && <Link2 className="w-12 h-12 text-white/15 lg:text-slate-600 mb-3" />}
            <p className="text-sm text-white/30 lg:text-slate-600 font-medium">
              {tabActiva === 'imagenes' && 'No hay imágenes compartidas'}
              {tabActiva === 'documentos' && 'No hay documentos compartidos'}
              {tabActiva === 'enlaces' && 'No hay enlaces compartidos'}
            </p>
          </div>
        )}

        {/* Grupos por mes */}
        {grupos.map((grupo) => (
          <div key={grupo.label}>
            {/* Label del mes */}
            <div className={`px-4 py-2 sticky top-0 z-20 backdrop-blur-sm ${esMobile ? 'bg-[#0B358F]/90' : 'bg-transparent'}`}>
              <span className="text-sm lg:text-[13px] font-bold text-white/50 lg:text-slate-600 uppercase tracking-wider">
                {grupo.label}
              </span>
            </div>

            {/* ═══ TAB: IMÁGENES → Grid 3 cols ═══ */}
            {tabActiva === 'imagenes' && (
              <div className="grid grid-cols-3 gap-0.5 px-0.5">
                {grupo.items.map((archivo) => {
                  let imgUrl: string | null = null;
                  let lqip: string | null = null;
                  try {
                    const parsed: ContenidoImagen = JSON.parse(archivo.contenido);
                    imgUrl = parsed.url;
                    lqip = parsed.miniatura || null;
                  } catch {
                    return null;
                  }
                  if (!imgUrl) return null;
                  return (
                    <div
                      key={archivo.id}
                      className="aspect-square overflow-hidden relative cursor-pointer bg-white/5 lg:bg-slate-200 group"
                      onClick={() => onAbrirVisorArchivos(archivo.id)}
                    >
                      {lqip && (
                        <img src={lqip} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm scale-110" />
                      )}
                      <img src={imgUrl} alt="" className="absolute inset-0 w-full h-full object-cover z-1 group-hover:scale-110 duration-500" loading="lazy" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ═══ TAB: DOCUMENTOS → Lista ═══ */}
            {tabActiva === 'documentos' && (
              <div className="flex flex-col">
                {grupo.items.map((archivo) => {
                  let doc: ContenidoDocumento | null = null;
                  try {
                    doc = JSON.parse(archivo.contenido) as ContenidoDocumento;
                  } catch {
                    return null;
                  }
                  if (!doc) return null;
                  return (
                    <a
                      key={archivo.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 lg:hover:bg-blue-100"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-white/10 lg:bg-slate-200 flex items-center justify-center shrink-0 ${colorExtension(doc.extension)}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-white/80 lg:text-slate-700 truncate">{doc.nombre || 'Documento'}</p>
                        <p className="text-[12px] text-white/30 lg:text-slate-600 font-medium">
                          {doc.extension ? doc.extension.toUpperCase() : 'ARCHIVO'}{doc.tamano ? ` · ${formatearTamano(doc.tamano)}` : ''}
                        </p>
                      </div>
                      <Download className="w-4 h-4 text-white/20 lg:text-slate-600 shrink-0" />
                    </a>
                  );
                })}
              </div>
            )}

            {/* ═══ TAB: ENLACES → Lista ═══ */}
            {tabActiva === 'enlaces' && (
              <div className="flex flex-col">
                {grupo.items.map((archivo) => {
                  const urls = extraerEnlaces(archivo.contenido);
                  if (urls.length === 0) return null;
                  return urls.map((url, i) => {
                    let dominio = '';
                    try { dominio = new URL(url).hostname.replace('www.', ''); } catch { dominio = url; }
                    return (
                      <a
                        key={`${archivo.id}-${i}`}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 lg:hover:bg-blue-100"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/10 lg:bg-slate-200 flex items-center justify-center shrink-0">
                          <Link2 className="w-5 h-5 text-blue-400 lg:text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-white/80 lg:text-slate-700 truncate">{url}</p>
                          <p className="text-[12px] text-white/30 lg:text-gray-500">{dominio}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-white/20 lg:text-slate-600 shrink-0" />
                      </a>
                    );
                  });
                })}
              </div>
            )}
          </div>
        ))}

        {/* Loading más */}
        {cargando && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-white/20 lg:border-slate-300 border-t-white lg:border-t-slate-600 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

export default GaleriaArchivosCompartidos;