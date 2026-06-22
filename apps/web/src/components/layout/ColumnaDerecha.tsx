/**
 * ColumnaDerecha.tsx
 * ==================
 * Columna lateral derecha (solo desktop) — los 3 carruseles de PUBLICIDAD: Anuncios,
 * Patrocinadores y Fundadores. Se vende el ESPACIO: cada anunciante sube su propia imagen.
 * Aquí solo se MUESTRAN las imágenes vigentes de la ciudad activa; el clic agranda la imagen
 * (lightbox). Datos reales vía `usePublicidad` (GET /api/publicidad?ciudadId=).
 *
 * El alta self-service ("Anúnciate aquí") y el conteo de clicks/impresiones llegan en la
 * Fase 2 del módulo Publicidad. Mientras no haya anuncios de la ciudad, cada carrusel muestra
 * un placeholder discreto "Espacio disponible".
 *
 * Ubicación: apps/web/src/components/layout/ColumnaDerecha.tsx
 */

import { useState, useEffect } from 'react';
import { Megaphone, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { useNavigate } from 'react-router-dom';
import { usePublicidad } from '../../hooks/queries/usePublicidad';
import { registrarClickPublicidad, type AnuncioPublico } from '../../services/publicidadService';

// Wrappers locales: íconos de marca vía Iconify, manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
const Trophy = (p: IconoWrapperProps) => <Icon icon={ICONOS.trofeo} {...p} />;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ColumnaDerecha() {
  const { data } = usePublicidad();
  const anuncios = data?.anuncios ?? [];
  const patrocinadores = data?.patrocinadores ?? [];
  const fundadores = data?.fundadores ?? [];
  const navigate = useNavigate();
  const [ampliada, setAmpliada] = useState<string | null>(null);

  const abrir = (item: AnuncioPublico) => {
    void registrarClickPublicidad(item.piezaId);
    setAmpliada(item.imagenUrl);
  };

  return (
    <div className="absolute inset-0 bg-white overflow-y-auto flex flex-col">
      <SeccionAnuncios items={anuncios} onAmpliar={abrir} />
      <div className="flex-1" />
      <SeccionPatrocinadores items={patrocinadores} onAmpliar={abrir} />
      <div className="flex-1" />
      <SeccionFundadores items={fundadores} onAmpliar={abrir} />

      {/* CTA: anunciarse (abre el wizard self-service con Stripe) */}
      <div className="shrink-0 border-t border-slate-100 p-3">
        <button
          type="button"
          data-testid="columna-anunciate"
          onClick={() => navigate('/anunciate')}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 py-2.5 text-[12.5px] font-bold text-white transition hover:opacity-95"
        >
          <Megaphone className="h-3.5 w-3.5" /> Anúnciate aquí
        </button>
      </div>

      {ampliada && <Lightbox imagenUrl={ampliada} onCerrar={() => setAmpliada(null)} />}
    </div>
  );
}

// =============================================================================
// SECCIÓN 1: ANUNCIOS (tarjeta chica que rota)
// =============================================================================

function SeccionAnuncios({ items, onAmpliar }: { items: AnuncioPublico[]; onAmpliar: (item: AnuncioPublico) => void }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const intervalo = setInterval(() => setIndice((p) => (p + 1) % items.length), 4000);
    return () => clearInterval(intervalo);
  }, [items.length]);

  const actual = items[indice % Math.max(items.length, 1)];

  return (
    <div>
      <div className="px-4 py-2.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 bg-linear-to-r from-amber-100 to-orange-50">
        <div className="flex items-center gap-2 text-left">
          <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-amber-500 rounded-md flex items-center justify-center">
            <Megaphone className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />
          </div>
          <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-black uppercase tracking-wide">Anuncios</span>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-3 lg:py-3 2xl:px-4 2xl:py-4">
        {actual ? (
          <button type="button" onClick={() => onAmpliar(actual)} className="block w-full cursor-zoom-in">
            <img
              src={actual.imagenUrl}
              alt="Anuncio"
              className="h-24 w-full rounded-xl object-cover shadow-md lg:h-20 2xl:h-28"
            />
          </button>
        ) : (
          <PlaceholderEspacio />
        )}
      </div>

      {items.length > 1 && <Indicadores total={items.length} actual={indice} onSel={setIndice} color="bg-amber-500" />}
    </div>
  );
}

// =============================================================================
// SECCIÓN 2: PATROCINADORES (banner grande + flechas)
// =============================================================================

function SeccionPatrocinadores({ items, onAmpliar }: { items: AnuncioPublico[]; onAmpliar: (item: AnuncioPublico) => void }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const intervalo = setInterval(() => setIndice((p) => (p + 1) % items.length), 5000);
    return () => clearInterval(intervalo);
  }, [items.length]);

  const actual = items[indice % Math.max(items.length, 1)];
  const anterior = () => setIndice((p) => (p - 1 + items.length) % items.length);
  const siguiente = () => setIndice((p) => (p + 1) % items.length);

  return (
    <div>
      <div className="px-4 py-2 lg:px-3 lg:py-1.5 2xl:px-4 2xl:py-2 bg-linear-to-r from-blue-100 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <Star className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />
            </div>
            <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-black uppercase tracking-wide">Patrocinadores</span>
          </div>

          {items.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={anterior}
                aria-label="Anterior"
                className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-slate-600" />
              </button>
              <button
                type="button"
                onClick={siguiente}
                aria-label="Siguiente"
                className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center transition-colors shadow-sm"
              >
                <ChevronRight className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-[130px] lg:h-[220px] 2xl:h-[450px]">
        {actual ? (
          <button type="button" onClick={() => onAmpliar(actual)} className="block h-full w-full cursor-zoom-in">
            <img src={actual.imagenUrl} alt="Patrocinador" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="h-full p-3">
            <PlaceholderEspacio alto />
          </div>
        )}
      </div>

      {items.length > 1 && <Indicadores total={items.length} actual={indice} onSel={setIndice} color="bg-blue-500" fondo />}
    </div>
  );
}

// =============================================================================
// SECCIÓN 3: FUNDADORES (logos en scroll)
// =============================================================================

function SeccionFundadores({ items, onAmpliar }: { items: AnuncioPublico[]; onAmpliar: (item: AnuncioPublico) => void }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (items.length <= 4) return;
    const intervalo = setInterval(() => setOffset((p) => (p + 1) % items.length), 2000);
    return () => clearInterval(intervalo);
  }, [items.length]);

  const visibles: AnuncioPublico[] = [];
  const n = Math.min(items.length, 4);
  for (let k = 0; k < n; k++) visibles.push(items[(offset + k) % items.length]);

  return (
    <div>
      <div className="px-4 py-2.5 lg:px-3 lg:py-2 2xl:px-4 2xl:py-2.5 bg-linear-to-r from-violet-100 to-purple-50">
        <div className="flex items-center gap-2 text-left">
          <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-violet-600 rounded-md flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" />
          </div>
          <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-black uppercase tracking-wide">Fundadores</span>
        </div>
      </div>

      <div className="px-4 py-3 lg:px-3 lg:py-2.5 2xl:px-4 2xl:py-3">
        {visibles.length ? (
          <div className="flex justify-center gap-3 lg:gap-2 2xl:gap-4">
            {visibles.map((it, idx) => (
              <button
                type="button"
                key={`${it.piezaId}-${idx}`}
                onClick={() => onAmpliar(it)}
                aria-label="Ver anuncio"
                className="cursor-zoom-in"
              >
                <img
                  src={it.imagenUrl}
                  alt="Fundador"
                  className="w-14 h-14 lg:w-12 lg:h-12 2xl:w-16 2xl:h-16 rounded-full object-cover shadow-md hover:scale-110 transition-transform"
                />
              </button>
            ))}
          </div>
        ) : (
          <PlaceholderEspacio />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

/** Hueco discreto cuando no hay anuncios vigentes de la ciudad (gancho del wizard en Fase 2). */
function PlaceholderEspacio({ alto = false }: { alto?: boolean }) {
  return (
    <div
      className={`flex ${alto ? 'h-full' : 'py-5'} flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 text-center`}
    >
      <span className="text-xs font-semibold text-slate-400">Espacio disponible</span>
      <span className="text-[11px] text-slate-300">Anúnciate aquí</span>
    </div>
  );
}

function Indicadores({
  total,
  actual,
  onSel,
  color,
  fondo = false,
}: {
  total: number;
  actual: number;
  onSel: (i: number) => void;
  color: string;
  fondo?: boolean;
}) {
  return (
    <div className={`flex justify-center gap-1.5 ${fondo ? 'py-2 lg:py-1.5 2xl:py-2 bg-white' : 'pb-3 lg:pb-2 2xl:pb-3'}`}>
      {Array.from({ length: total }).map((_, idx) => (
        <button
          key={idx}
          type="button"
          aria-label={`Ir al anuncio ${idx + 1}`}
          onClick={() => onSel(idx)}
          className={`h-2.5 lg:h-2 2xl:h-2.5 rounded-full transition-all ${
            idx === actual % total ? `${color} w-6 lg:w-5 2xl:w-6` : 'bg-slate-300 w-2.5 lg:w-2 2xl:w-2.5'
          }`}
        />
      ))}
    </div>
  );
}

/** Capa que muestra la imagen del anuncio en grande (el clic la "agranda"). */
function Lightbox({ imagenUrl, onCerrar }: { imagenUrl: string; onCerrar: () => void }) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6"
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
    </div>
  );
}

export default ColumnaDerecha;
