/**
 * ModalAjustarAnuncio.tsx
 * ========================
 * Cambiar la imagen y/o el encuadre de un anuncio de Publicidad propio, ACTIVO, sin pasar por
 * Renovar (sin cobro). Mismo patrón de arrastre que la portada de negocio (`ModalAjustarPortada.tsx`
 * + `useArrastrePortada`): el usuario desliza la imagen dentro de un marco con la MISMA proporción
 * que el espacio real de la columna derecha para elegir qué parte se ve, y opcionalmente reemplaza
 * el archivo (reinicia el encuadre a 50/50, igual que al subir una portada nueva).
 *
 * Un anuncio combo (Grande + Chico) muestra las dos secciones apiladas en el mismo modal — mismo
 * layout que el wizard de compra (`PaginaAnunciate.tsx`).
 *
 * Ubicación: apps/web/src/components/publicidad/ModalAjustarAnuncio.tsx
 */

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Move, Loader2, Upload, ImagePlus, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useArrastrePortada, type PosicionPortada } from '../../hooks/useArrastrePortada';
import {
  obtenerAnuncioRenovable,
  subirImagenPublicidad,
  descartarImagenesPublicidad,
  cambiarImagenAnuncio,
  type AnuncioRenovable,
  type Carrusel,
  type CambioImagenPub,
} from '../../services/publicidadService';
import { notificar } from '../../utils/notificaciones';

const ASPECTO: Partial<Record<Carrusel, string>> = { patrocinadores: 'aspect-[4/5]', anuncios: 'aspect-[3/2]' };
const LABEL: Partial<Record<Carrusel, string>> = { patrocinadores: 'Grande', anuncios: 'Chico' };
// Orden de despliegue: Grande arriba, Chico abajo — igual que la columna real y el wizard.
const ORDEN: Carrusel[] = ['patrocinadores', 'anuncios'];

// =============================================================================
// SECCIÓN: un marco de arrastre por tamaño comprado
// =============================================================================

interface EstadoSeccion {
  imagenUrl: string;
  x: number;
  y: number;
}

export interface SeccionAnuncioHandle {
  obtenerEstado: () => EstadoSeccion;
}

interface SeccionAnuncioProps {
  label: string;
  aspecto: string;
  imagenUrl: string;
  posicionInicial: PosicionPortada;
  onImagenReemplazada: (urlNueva: string) => void;
}

const SeccionAnuncio = forwardRef<SeccionAnuncioHandle, SeccionAnuncioProps>(function SeccionAnuncio(
  { label, aspecto, imagenUrl, posicionInicial, onImagenReemplazada },
  ref,
) {
  const arrastre = useArrastrePortada(posicionInicial);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    obtenerEstado: () => ({ imagenUrl, x: arrastre.posicion.x, y: arrastre.posicion.y }),
  }));

  const onArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSubiendo(true);
    try {
      const url = await subirImagenPublicidad(file);
      onImagenReemplazada(url);
    } catch {
      notificar.error('No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      <div className={`relative w-full ${aspecto} max-w-[200px] mx-auto rounded-xl bg-slate-200 overflow-hidden shadow-md`}>
        {imagenUrl && (
          <img
            src={imagenUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover select-none"
            style={{
              objectPosition: `${arrastre.posicion.x}% ${arrastre.posicion.y}%`,
              cursor: arrastre.arrastrando ? 'grabbing' : 'grab',
              touchAction: 'none',
            }}
            onPointerDown={arrastre.onPointerDown}
            onPointerMove={arrastre.onPointerMove}
            onPointerUp={arrastre.onPointerUp}
            onPointerCancel={arrastre.onPointerUp}
          />
        )}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
        <Move className="absolute top-2 left-2 w-4 h-4 text-white/80 pointer-events-none drop-shadow" />
        {subiendo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onArchivo} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="mx-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Upload className="w-3.5 h-3.5" />
        Reemplazar imagen
      </button>
    </div>
  );
});

// =============================================================================
// CONTENIDO: carga el anuncio, arma las secciones y guarda
// =============================================================================

function ContenidoAjusteAnuncio({
  compraId,
  onRegistrarSubida,
  onCerrar,
}: {
  compraId: string;
  onRegistrarSubida: (url: string) => void;
  onCerrar: () => void;
}) {
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState<AnuncioRenovable | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Se incrementa por carrusel al reemplazar su imagen → cambia el `key` de la sección → remonta
  // el hook de arrastre con posiciónInicial 50/50 (mismo comportamiento que la portada).
  const [claves, setClaves] = useState<Partial<Record<Carrusel, number>>>({});
  const [imagenesLocal, setImagenesLocal] = useState<Partial<Record<Carrusel, string>>>({});
  const refsSecciones = useRef<Partial<Record<Carrusel, SeccionAnuncioHandle | null>>>({});

  useEffect(() => {
    let activo = true;
    obtenerAnuncioRenovable(compraId).then((d) => {
      if (!activo) return;
      setDatos(d);
      setImagenesLocal(d?.imagenes ?? {});
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, [compraId]);

  const handleImagenReemplazada = (carrusel: Carrusel, url: string) => {
    onRegistrarSubida(url);
    setImagenesLocal((prev) => ({ ...prev, [carrusel]: url }));
    setClaves((prev) => ({ ...prev, [carrusel]: (prev[carrusel] ?? 0) + 1 }));
  };

  const handleGuardar = async () => {
    if (!datos) return;
    setGuardando(true);
    try {
      const cambios: Partial<Record<Carrusel, CambioImagenPub>> = {};
      for (const c of datos.carruseles) {
        const estado = refsSecciones.current[c]?.obtenerEstado();
        if (!estado || !estado.imagenUrl) continue;
        cambios[c] = { imagenUrl: estado.imagenUrl, posX: Math.round(estado.x), posY: Math.round(estado.y) };
      }
      await cambiarImagenAnuncio(compraId, cambios);
      notificar.exito('Imagen del anuncio actualizada.');
      // onCerrar descarta (best-effort, protegido por conteo de referencias) cualquier creatividad
      // subida en esta sesión que no haya quedado ligada al anuncio — la que sí se guardó está a
      // salvo porque ya quedó referenciada en publicidad_piezas.
      onCerrar();
    } catch (e) {
      notificar.error(e instanceof Error ? e.message : 'No se pudo guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!datos) {
    return <div className="p-6 text-center text-sm font-medium text-slate-600">No se pudo cargar el anuncio.</div>;
  }

  const carruselesOrdenados = ORDEN.filter((c) => datos.carruseles.includes(c));

  return (
    <div className="p-4 lg:p-5 space-y-4">
      <p className="text-sm text-slate-600 font-medium">
        Arrastra la imagen para elegir qué parte se ve en el anuncio, o reemplázala por otra.
      </p>

      <div className="space-y-5">
        {carruselesOrdenados.map((c) => (
          <SeccionAnuncio
            key={`${c}-${claves[c] ?? 0}`}
            ref={(el) => {
              refsSecciones.current[c] = el;
            }}
            label={LABEL[c] ?? c}
            aspecto={ASPECTO[c] ?? 'aspect-square'}
            imagenUrl={imagenesLocal[c] ?? ''}
            posicionInicial={(claves[c] ?? 0) > 0 ? { x: 50, y: 50 } : (datos.posiciones[c] ?? { x: 50, y: 50 })}
            onImagenReemplazada={(url) => handleImagenReemplazada(c, url)}
          />
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCerrar} disabled={guardando}
          className="px-4 py-2 text-sm font-bold text-slate-600 border-2 border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          Cancelar
        </button>
        <button type="button" onClick={handleGuardar} disabled={guardando}
          className="px-4 py-2 flex items-center gap-2 text-sm font-bold text-white rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// MODAL
// =============================================================================

interface ModalAjustarAnuncioProps {
  abierto: boolean;
  onCerrar: () => void;
  compraId: string | null;
}

export default function ModalAjustarAnuncio({ abierto, onCerrar, compraId }: ModalAjustarAnuncioProps) {
  // Creatividades subidas en esta sesión del modal (todos los tamaños). Se descartan al cerrar por
  // CUALQUIER vía (X, overlay, Escape, "Cancelar" o tras "Guardar cambios") — el backend solo borra
  // las que NO quedaron referenciadas en `publicidad_piezas` (reference count), así que la que sí se
  // guardó nunca se toca aunque esté en esta lista.
  const subidasSesion = useRef<Set<string>>(new Set());

  const handleCerrar = () => {
    const pendientes = [...subidasSesion.current];
    subidasSesion.current.clear();
    if (pendientes.length) void descartarImagenesPublicidad(pendientes);
    onCerrar();
  };

  return (
    <Modal abierto={abierto} onCerrar={handleCerrar} ancho="md" mostrarHeader={false} paddingContenido="none">
      {abierto && compraId && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5 px-4 lg:px-5 py-3 lg:py-3.5 rounded-t-2xl shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              <ImagePlus className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="flex-1 text-sm lg:text-base font-bold text-white">Cambiar imagen del anuncio</span>
            <button type="button" onClick={handleCerrar}
              className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          <ContenidoAjusteAnuncio
            compraId={compraId}
            onRegistrarSubida={(url) => subidasSesion.current.add(url)}
            onCerrar={handleCerrar}
          />
        </div>
      )}
    </Modal>
  );
}
