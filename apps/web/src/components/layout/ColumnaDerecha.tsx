/**
 * ColumnaDerecha.tsx
 * ==================
 * Columna lateral derecha (solo desktop). Un bloque "PUBLICIDAD" con los 2 tamaños de anuncio inline
 * (GRANDE arriba, CHICO abajo, sin cards) + los logos de FUNDADORES (regalo a los primeros negocios de
 * la ciudad) en un marquee. Cada anunciante sube su imagen; aquí solo se MUESTRAN las vigentes de la
 * ciudad activa y el clic las agranda (lightbox). Datos vía `usePublicidad`.
 *
 * Mapa de datos → tamaños: `patrocinadores` = tamaño GRANDE (banner), `anuncios` = tamaño CHICO (tarjeta).
 * Proporciones FIJAS e idénticas al wizard (Grande 4:5 vertical · Chico 3:2 horizontal) para que el
 * anunciante diseñe a la medida exacta que se ocupa; el CTA "Anúnciate aquí" queda fijo abajo.
 * Los carruseles rotan solos (crossfade) y se pausan al hover.
 *
 * Ubicación: apps/web/src/components/layout/ColumnaDerecha.tsx
 */

import { useState, useEffect, type ReactElement, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, X } from 'lucide-react';
import { useNavegarASeccion } from '../../hooks/useNavegarASeccion';
import { useBackNativo } from '../../hooks/useBackNativo';
import { usePublicidad } from '../../hooks/queries/usePublicidad';
import { usePortalTarget } from '../../hooks/usePortalTarget';
import { registrarClickPublicidad, type AnuncioPublico } from '../../services/publicidadService';

// =============================================================================
// HOOK: rotación automática con pausa al hover
// =============================================================================

function useCarruselAuto(total: number, ms: number) {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    setIndice((p) => (total > 0 ? p % total : 0));
  }, [total]);

  useEffect(() => {
    if (total <= 1 || pausado) return;
    const id = setInterval(() => setIndice((p) => (p + 1) % total), ms);
    return () => clearInterval(id);
  }, [total, ms, pausado]);

  return {
    indice: total > 0 ? indice % total : 0,
    ir: (i: number) => setIndice(i),
    hoverProps: { onMouseEnter: () => setPausado(true), onMouseLeave: () => setPausado(false) },
  };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ColumnaDerecha() {
  const { data } = usePublicidad();
  const grandes = data?.patrocinadores ?? []; // tamaño GRANDE (banner)
  const chicos = data?.anuncios ?? [];         // tamaño CHICO (tarjeta)
  const fundadores = data?.fundadores ?? [];
  const navegar = useNavegarASeccion();
  const [ampliada, setAmpliada] = useState<string | null>(null);

  const abrir = (item: AnuncioPublico) => {
    void registrarClickPublicidad(item.piezaId);
    setAmpliada(item.imagenUrl);
  };

  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Publicidad (toma el alto sobrante) + Fundadores. overflow-hidden = sin scroll. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
        <SeccionPublicidad grandes={grandes} chicos={chicos} onAmpliar={abrir} />
        <SeccionFundadores items={fundadores} onAmpliar={abrir} />
      </div>

      {/* CTA fijo abajo (fuera del área que reparte el alto → nunca empuja ni scrollea). */}
      <div className="shrink-0 px-3 py-2.5">
        <button
          type="button"
          data-testid="columna-anunciate"
          onClick={() => navegar('/anunciate')}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-[12.5px] font-bold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Megaphone className="h-3.5 w-3.5" /> Anúnciate aquí
        </button>
      </div>

      {ampliada && <Lightbox imagenUrl={ampliada} onCerrar={() => setAmpliada(null)} />}
    </div>
  );
}

// =============================================================================
// PUBLICIDAD — un bloque inline (sin card): tamaño GRANDE arriba + tamaño CHICO abajo
// =============================================================================

function SeccionPublicidad({
  grandes,
  chicos,
  onAmpliar,
}: {
  grandes: AnuncioPublico[];
  chicos: AnuncioPublico[];
  onAmpliar: (item: AnuncioPublico) => void;
}) {
  const carG = useCarruselAuto(grandes.length, 6000);
  const carC = useCarruselAuto(chicos.length, 4500);
  const vacio = grandes.length === 0 && chicos.length === 0;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Título inline (sin card) */}
      <div className="flex shrink-0 items-center gap-2 px-0.5">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-blue-600 text-white shadow-sm">
          <Megaphone className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11.5px] font-bold uppercase tracking-wide text-slate-700">Publicidad</span>
      </div>

      {vacio ? (
        <PlaceholderEspacio className="aspect-[4/5] w-full" />
      ) : (
        <>
          {/* Tamaño GRANDE — proporción FIJA 4:5 (vertical), idéntica al wizard */}
          <div className="relative aspect-[4/5] w-full" {...carG.hoverProps}>
            {grandes.length > 0 ? (
              <Crossfade items={grandes} indice={carG.indice} onAmpliar={onAmpliar} className="h-full overflow-hidden rounded-xl shadow-sm" imgClass="object-cover" />
            ) : (
              <PlaceholderEspacio className="h-full" />
            )}
            {grandes.length > 1 && <PuntosFlotantes total={grandes.length} actual={carG.indice} onSel={carG.ir} />}
          </div>

          {/* Tamaño CHICO — proporción FIJA 3:2 (horizontal), idéntica al wizard */}
          {chicos.length > 0 && (
            <div className="relative aspect-[3/2] w-full" {...carC.hoverProps}>
              <Crossfade items={chicos} indice={carC.indice} onAmpliar={onAmpliar} className="h-full overflow-hidden rounded-xl shadow-sm" imgClass="object-cover" />
              {chicos.length > 1 && <PuntosFlotantes total={chicos.length} actual={carC.indice} onSel={carC.ir} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// FUNDADORES (zona de REGALO: logos en marquee continuo, pausa al hover)
// =============================================================================

function SeccionFundadores({ items, onAmpliar }: { items: AnuncioPublico[]; onAmpliar: (item: AnuncioPublico) => void }) {
  // Es un regalo, no un espacio en venta: si aún no hay fundadores en la ciudad, no se muestra nada.
  if (items.length === 0) return null;

  // Marquee continuo: 2 copias de la lista (la animación corre a -50% = una copia → loop sin salto).
  // La velocidad es constante (la duración crece con el número de logos). Pausa al hover (CSS).
  const fila = [...items, ...items];
  const dur = `${Math.max(12, items.length * 6)}s`;

  return (
    <div className="shrink-0 overflow-hidden py-1.5">
      <div className="marquee-logos flex w-max items-center gap-3 2xl:gap-3.5" style={{ '--marquee-dur': dur } as CSSProperties}>
        {fila.map((it, idx) => (
          <button
            type="button"
            key={`${it.piezaId}-${idx}`}
            onClick={() => onAmpliar(it)}
            aria-label="Ver fundador"
            className="group shrink-0 cursor-zoom-in"
          >
            <img
              src={it.imagenUrl}
              alt="Fundador"
              className="h-20 w-20 rounded-full border-2 border-white object-cover shadow-md ring-1 ring-slate-200 transition-transform duration-300 group-hover:scale-110 2xl:h-24 2xl:w-24"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

/** Pila de imágenes superpuestas con crossfade por opacidad; la activa recibe el clic (ampliar). */
function Crossfade({
  items,
  indice,
  onAmpliar,
  className = '',
  imgClass = '',
}: {
  items: AnuncioPublico[];
  indice: number;
  onAmpliar: (item: AnuncioPublico) => void;
  className?: string;
  imgClass?: string;
}): ReactElement {
  return (
    <div className={`relative ${className}`}>
      {items.map((it, i) => (
        <button
          type="button"
          key={it.piezaId}
          onClick={() => onAmpliar(it)}
          aria-label="Ver anuncio"
          tabIndex={i === indice ? 0 : -1}
          className={`absolute inset-0 cursor-zoom-in transition-opacity duration-700 ease-in-out ${
            i === indice ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <img src={it.imagenUrl} alt="Anuncio" className={`h-full w-full ${imgClass}`} />
        </button>
      ))}
    </div>
  );
}

/** Hueco discreto cuando no hay anuncios vigentes de la ciudad (gancho del wizard). */
function PlaceholderEspacio({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center ${className}`}>
      <span className="text-[12px] font-semibold text-slate-400">Espacio disponible</span>
      <span className="text-[10.5px] text-slate-300">Anúnciate aquí</span>
    </div>
  );
}

/** Puntos indicadores flotando sobre la imagen (abajo, centrados); el activo se ensancha. */
function PuntosFlotantes({ total, actual, onSel }: { total: number; actual: number; onSel: (i: number) => void }) {
  return (
    <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, idx) => (
        <button
          key={idx}
          type="button"
          aria-label={`Ir al anuncio ${idx + 1}`}
          onClick={() => onSel(idx)}
          className={`h-1.5 cursor-pointer rounded-full shadow transition-all duration-300 ${
            idx === actual ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Capa que muestra la imagen del anuncio en grande (el clic la "agranda").
 * Se portea a `document.body` (patrón estándar de la app) para escapar del stacking context de la
 * columna derecha (z-30) y quedar POR ENCIMA del header (z-50) y el toggle Mapa/Lista — si no, el
 * `fixed` quedaría atrapado bajo el header. z-[100] gana a todo lo de la app.
 */
function Lightbox({ imagenUrl, onCerrar }: { imagenUrl: string; onCerrar: () => void }) {
  const target = usePortalTarget();
  const esContenido = target !== document.body;

  // Back nativo (Android / swipe iOS / flecha del navegador) cierra el
  // lightbox, igual que ESC/X/backdrop. El padre lo monta condicionalmente
  // (`{ampliada && <Lightbox/>}`), por eso `abierto: true` fijo: al
  // desmontar, el cleanup del hook limpia su propia entrada del history.
  useBackNativo({ abierto: true, onCerrar, discriminador: '_lightboxPublicidad' });

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onCerrar]);

  return createPortal(
    <div
      className={`${esContenido ? 'absolute' : 'fixed'} inset-0 z-[100] flex items-center justify-center bg-black/80 p-6`}
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <X size={20} />
      </button>
      <img
        src={imagenUrl}
        alt="Anuncio ampliado"
        className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    target,
  );
}

export default ColumnaDerecha;
