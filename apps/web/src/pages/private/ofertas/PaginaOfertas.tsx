/**
 * PaginaOfertas.tsx
 * ==================
 * Sección pública de Ofertas — feed editorial con identidad Marketplace.
 *
 * Estética: alto contraste blanco/negro sobre el gradient azul nativo del
 * MainLayout. El descuento, los acentos y los badges son negros (no rose).
 * Cards con `border 1px solid #e8e6e0`. Header negro sticky con compresión
 * al scroll (componente `HeaderOfertas`).
 *
 * Estructura vertical:
 *  1. STICKY: HeaderOfertas (negro, comprime al scroll) + Buscador
 *     + Chips (siempre visibles).
 *  2. Hero "Oferta del día" — solo si chip='todas'.
 *  3. Carrusel auto "Vencen pronto" (icono Flame).
 *  4. Ticker (mezcla vencen + recientes).
 *  5. Lista densa "Cerca de ti" (icono MapPin) en card contenedora con
 *     divisores internos. Banner intercalado en medio.
 *  6. Carrusel auto "Recién publicadas" (icono Sparkles).
 *  7. Carrusel auto "Populares" (icono TrendingUp).
 *
 * El container raíz NO aplica fondo — hereda el gradient azul del
 * MainLayout (`linear-gradient(to left, #b1c6dd 0%, #eff6ff 25%, ...)`).
 *
 * Ubicación: apps/web/src/pages/private/ofertas/PaginaOfertas.tsx
 */

import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Tag,
  Loader2,
  MapPin,
  RefreshCw,
  Star,
  Flame,
  Sparkles,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import ModalOfertaDetalle from '@/components/negocios/ModalOfertaDetalle';
import HeaderOfertas from '@/components/ofertas/HeaderOfertas';
import CardOfertaHero from '@/components/ofertas/CardOfertaHero';
import CardOfertaLista from '@/components/ofertas/CardOfertaLista';
import TituloDeBloque from '@/components/ofertas/TituloDeBloque';
import BloqueCarruselAuto from '@/components/ofertas/BloqueCarruselAuto';
import TickerOfertas from '@/components/ofertas/TickerOfertas';

import { useGpsStore } from '@/stores/useGpsStore';
import { useSearchStore } from '@/stores/useSearchStore';
import { useFiltrosOfertasStore } from '@/stores/useFiltrosOfertasStore';
import { useCarruselRotativo } from '@/hooks/useCarruselRotativo';

import {
  useOfertasFeedCerca,
  useOfertaDestacadaDelDia,
  useOfertasFeedVencenPronto,
  useOfertasFeedRecientes,
  useOfertasFeedPopulares,
} from '@/hooks/queries/useOfertasFeed';

import type { OfertaFeed } from '@/types/ofertas';

// =============================================================================
// HELPERS
// =============================================================================

const HORAS_NUEVA = 48;
const MS_NUEVA = HORAS_NUEVA * 60 * 60 * 1000;

const HORAS_VENCE_PRONTO = 48;
const MS_VENCE_PRONTO = HORAS_VENCE_PRONTO * 60 * 60 * 1000;

function esCreadaHaceMenosDeXh(createdAt: string, msUmbral: number): boolean {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < msUmbral;
}

function venceEnMenosDeXh(fechaFin: string, msUmbral: number): boolean {
  const t = new Date(fechaFin).getTime();
  if (Number.isNaN(t)) return false;
  return t - Date.now() < msUmbral;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PaginaOfertas() {
  // Stores
  const { latitud, longitud, ciudad } = useGpsStore();
  const obtenerUbicacion = useGpsStore((s) => s.obtenerUbicacion);
  const chipActivo = useFiltrosOfertasStore((s) => s.chipActivo);
  const setChipActivo = useFiltrosOfertasStore((s) => s.setChipActivo);

  // Cleanup al unmount: resetea filtros locales (chip) y limpia el buscador
  // GLOBAL del Navbar para no contaminar las otras secciones.
  useEffect(() => {
    return () => {
      useFiltrosOfertasStore.getState().resetear();
      useSearchStore.getState().cerrarBuscador();
    };
  }, []);

  // Inyectar la animación de fade-in para las cards rotativas del par
  // superior. HMR-safe: si ya existe el `<style>`, sobrescribe textContent.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const STYLES_ID = 'pagina-ofertas-rotativa-styles';
    const STYLES_CSS = `
@keyframes oferta-rotativa-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.oferta-rotativa-fade {
  animation: oferta-rotativa-fade-in 450ms ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .oferta-rotativa-fade { animation: none; }
}
`;
    let style = document.getElementById(STYLES_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = STYLES_ID;
      document.head.appendChild(style);
    }
    if (style.textContent !== STYLES_CSS) {
      style.textContent = STYLES_CSS;
    }
  }, []);

  // Datos del servidor
  const {
    data: ofertas = [],
    isPending,
    isError,
    refetch,
  } = useOfertasFeedCerca();
  const { data: ofertaDestacada } = useOfertaDestacadaDelDia();
  const vencenPronto = useOfertasFeedVencenPronto();
  const recientes = useOfertasFeedRecientes();
  const populares = useOfertasFeedPopulares();

  // Sin GPS y chip='cerca' → prompt para activar GPS
  const sinGpsYNecesario = chipActivo === 'cerca' && !(latitud && longitud);

  // Modal de detalle
  const [ofertaSeleccionada, setOfertaSeleccionada] =
    useState<OfertaFeed | null>(null);

  // Vista expandida de la lista densa: false = layout collage + lista única
  // (8 filas, foto del collage izq/der). true = grid 2 columnas con TODAS las
  // ofertas, sin collages, para exploración tranquila. Se controla desde el
  // chip "Todas" del header (no desde un botón aparte).
  const vistaExpandida = useFiltrosOfertasStore((s) => s.vistaExpandida);
  const TOPE_VISIBLES = 8;

  // Cuando un chip filtra (≠ 'todas'), mostramos SOLO la lista filtrada y
  // ocultamos el feed editorial completo (Hero + Carruseles + Ticker +
  // Banner intercalado). Decisión UX: el chip prominente debe sentirse
  // como un filtro fuerte, no como un cambio invisible en un bloque.
  // Lo mismo aplica al modo expandido: el usuario quiere ver el catálogo
  // tranquilo, sin el ruido del feed editorial.
  const feedEditorialVisible = chipActivo === 'todas' && !vistaExpandida;

  // Etiqueta para mostrar qué filtro está activo (solo cuando NO 'todas')
  const labelChip: Record<typeof chipActivo, string> = {
    todas: '',
    hoy: 'Hoy',
    esta_semana: 'Esta semana',
    cerca: 'Cerca de ti',
    cardya: 'Aceptan CardYA',
    nuevas: 'Más nuevas',
    mas_vistas: 'Más vistas',
  };

  // ---------------------------------------------------------------------------
  // Cálculos memoizados
  // ---------------------------------------------------------------------------

  // Lista densa — en modo compacto se muestran solo las primeras 8; en modo
  // expandido se muestran TODAS las que devolvió el backend.
  const ofertasLista = useMemo(
    () => (vistaExpandida ? ofertas : ofertas.slice(0, TOPE_VISIBLES)),
    [ofertas, vistaExpandida]
  );

  // Fotos del collage: fijas en las primeras 6 del total (3 pares + 3 impares)
  const collageIzq = useMemo(
    () => ofertas.slice(0, 6).filter((_, i) => i % 2 === 0),
    [ofertas]
  );
  const collageDer = useMemo(
    () => ofertas.slice(0, 6).filter((_, i) => i % 2 === 1),
    [ofertas]
  );

  // ───────────────────────────────────────────────────────────────────────
  // CARRUSELES ROTATIVOS DEL PAR SUPERIOR
  // ───────────────────────────────────────────────────────────────────────
  // "Hoy te recomendamos" y "Destacado" rotan entre varios candidatos
  // cada 7 segundos. Antes mostraban solo 1 oferta fija.
  //
  // Reglas:
  //  - "Hoy te recomendamos": si el admin fijó una destacada del día,
  //    esa va PRIMERO (pinned). Luego se completa con top populares.
  //    Hasta 5 items, sin duplicados.
  //  - "Destacado": top recientes, EXCLUYENDO los ya en el primer slot
  //    para evitar mostrar la misma oferta en ambos lados.

  const ofertasHoyRecomendamos = useMemo<OfertaFeed[]>(() => {
    const lista: OfertaFeed[] = [];
    const vistos = new Set<string>();
    if (ofertaDestacada) {
      lista.push(ofertaDestacada);
      vistos.add(ofertaDestacada.ofertaId);
    }
    for (const o of populares.data ?? []) {
      if (lista.length >= 5) break;
      if (!vistos.has(o.ofertaId)) {
        lista.push(o);
        vistos.add(o.ofertaId);
      }
    }
    return lista;
  }, [ofertaDestacada, populares.data]);

  const ofertasDestacado = useMemo<OfertaFeed[]>(() => {
    if (ofertas.length < 5) return [];
    const idsHoy = new Set(ofertasHoyRecomendamos.map((o) => o.ofertaId));
    const lista: OfertaFeed[] = [];
    for (const o of recientes.data ?? []) {
      if (lista.length >= 5) break;
      if (!idsHoy.has(o.ofertaId)) lista.push(o);
    }
    // Fallback: si recientes no alcanza, completar con populares restantes
    if (lista.length < 3) {
      for (const o of populares.data ?? []) {
        if (lista.length >= 5) break;
        if (!idsHoy.has(o.ofertaId) && !lista.some((x) => x.ofertaId === o.ofertaId)) {
          lista.push(o);
        }
      }
    }
    return lista;
  }, [
    ofertas.length,
    ofertasHoyRecomendamos,
    recientes.data,
    populares.data,
  ]);

  const rotHoy = useCarruselRotativo(ofertasHoyRecomendamos, 7000);
  const rotDestacado = useCarruselRotativo(ofertasDestacado, 7000);

  // Ticker: usa el feed principal (todas las ofertas activas en la ciudad)
  // para que TODOS los negocios con al menos 1 oferta activa aparezcan.
  // La deduplicación por negocio vive en el componente `TickerOfertas`.
  const ofertasTicker = ofertas;
  const tickerCargando = isPending && ofertas.length === 0;

  // Microseñales por carrusel
  const microsenalesVencen = useMemo<
    Record<string, 'vence_pronto'>
  >(() => {
    const r: Record<string, 'vence_pronto'> = {};
    (vencenPronto.data ?? []).forEach((o) => {
      if (venceEnMenosDeXh(o.fechaFin, MS_VENCE_PRONTO)) {
        r[o.ofertaId] = 'vence_pronto';
      }
    });
    return r;
  }, [vencenPronto.data]);

  const microsenalesNuevas = useMemo<Record<string, 'nueva'>>(() => {
    const r: Record<string, 'nueva'> = {};
    (recientes.data ?? []).forEach((o) => {
      if (esCreadaHaceMenosDeXh(o.createdAt, MS_NUEVA)) {
        r[o.ofertaId] = 'nueva';
      }
    });
    return r;
  }, [recientes.data]);

  const microsenalesPopulares = useMemo<Record<string, 'popular'>>(() => {
    const r: Record<string, 'popular'> = {};
    (populares.data ?? []).forEach((o) => {
      if (o.esPopular) r[o.ofertaId] = 'popular';
    });
    return r;
  }, [populares.data]);

  const ciudadNombre = ciudad?.nombre ?? '';

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    // SIN bg propio — hereda el gradient azul del MainLayout.
    <div data-testid="pagina-ofertas" className="min-h-full">
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* STICKY: HeaderOfertas + Buscador + Chips                           */}
      {/* Mismo patrón de ancho que PaginaNegocios / PaginaGuardados:       */}
      {/* `lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8`.                        */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30">
        <div className="lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8">
          {/* Capa intermedia: aplica `lg:rounded-b-3xl overflow-hidden`   */}
          {/* al header (que ya incluye los chips). Igual a PaginaNegocios. */}
          <div className="overflow-hidden lg:rounded-b-3xl">
            <HeaderOfertas
              totalOfertas={ofertas.length}
              ciudad={ciudadNombre}
              onClickMasVistas={() => setChipActivo('mas_vistas')}
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO                                                          */}
      {/* - Chip 'todas': feed editorial completo (Hero + carruseles + lista)*/}
      {/* - Chip ≠ 'todas': SOLO la lista filtrada — Hero/carruseles/ticker  */}
      {/*   se ocultan para que el filtro se sienta fuerte e inmediato.      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Padding lateral DEBE coincidir con el del wrapper sticky        */}
      {/* (`lg:px-6 2xl:px-8`) para que el contenido NO sobrepase el ancho */}
      {/* horizontal del header negro.                                     */}
      <div className="px-4 lg:px-6 2xl:px-8 lg:max-w-7xl lg:mx-auto pt-6 lg:pt-8 pb-16">
        {/* 1. PAR ARRIBA (2 cols desktop): "Hoy te recomendamos" (Hero    */}
        {/*    admin override) + "Destacado" (2do popular / 1er reciente). */}
        {/*    Comparten ancho para que el Hero no domine toda la pantalla.*/}
        {/*    En móvil se apilan stack.                                   */}
        {feedEditorialVisible && (rotHoy.actual || rotDestacado.actual) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 2xl:gap-x-6 gap-y-6 lg:gap-y-0 mb-6 lg:mb-8 2xl:mb-10">
            {rotHoy.actual && (
              <section {...rotHoy.pausarHover}>
                <TituloDeBloque
                  eyebrow="Oferta del día"
                  titulo="Hoy te recomendamos"
                  iconoLucide={Star}
                  variante="destacado"
                />
                <CarruselRotativoSwipe
                  rot={rotHoy}
                  onClick={(o) => setOfertaSeleccionada(o)}
                />
                {rotHoy.total > 1 && (
                  <IndicadoresRotacion total={rotHoy.total} actual={rotHoy.index} />
                )}
              </section>
            )}
            {rotDestacado.actual && (
              <section {...rotDestacado.pausarHover}>
                <TituloDeBloque
                  eyebrow="También interesante"
                  titulo="Destacado"
                  iconoLucide={TrendingUp}
                  variante="destacado"
                />
                <CarruselRotativoSwipe
                  rot={rotDestacado}
                  onClick={(o) => setOfertaSeleccionada(o)}
                />
                {rotDestacado.total > 1 && (
                  <IndicadoresRotacion total={rotDestacado.total} actual={rotDestacado.index} />
                )}
              </section>
            )}
          </div>
        )}

        {/* 2. PAR EN 2 COLUMNAS (desktop): "Últimas horas" + "Recién     */}
        {/*    publicadas". Comparten ancho porque ambos son temporales   */}
        {/*    (urgencia + novedad). En móvil se apilan stack.             */}
        {feedEditorialVisible && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-5 2xl:gap-x-6">
            <BloqueCarruselAuto
              eyebrow="Vencen pronto"
              titulo="Últimas horas"
              iconoLucide={Flame}
              ofertas={vencenPronto.data ?? []}
              cargando={vencenPronto.isPending}
              microsenales={microsenalesVencen}
              onClickOferta={setOfertaSeleccionada}
            />
            <BloqueCarruselAuto
              eyebrow="Lo más nuevo"
              titulo="Recién publicadas"
              iconoLucide={Sparkles}
              ofertas={recientes.data ?? []}
              cargando={recientes.isPending}
              microsenales={microsenalesNuevas}
              onClickOferta={setOfertaSeleccionada}
            />
          </div>
        )}

        {/* 3. TICKER — logos flotantes (sin contenedor), mismo ancho     */}
        {/*    horizontal que el resto del contenido. Hereda el fondo del */}
        {/*    MainLayout (gradient azul claro).                          */}
        {feedEditorialVisible && ofertasTicker.length > 0 && (
          <div className="mb-6 lg:mb-8 2xl:mb-10">
            <TickerOfertas
              ofertas={ofertasTicker}
              cargando={tickerCargando}
            />
          </div>
        )}

        {/* 4. LISTA DENSA "En tu ciudad" — siempre visible (aunque haya */}
        {/*    chip activo). Catálogo principal con divisores internos.   */}
        <section className="mb-6 lg:mb-8 2xl:mb-10">
          <TituloDeBloque
            eyebrow={
              vistaExpandida
                ? 'Catálogo completo'
                : chipActivo === 'todas'
                ? 'En tu ciudad'
                : `Filtro · ${labelChip[chipActivo]}`
            }
            titulo={
              vistaExpandida
                ? `Todas las ofertas (${ofertas.length})`
                : chipActivo === 'todas'
                ? 'Más ofertas activas'
                : `Resultados: ${labelChip[chipActivo]}`
            }
            iconoLucide={MapPin}
          />

          {sinGpsYNecesario ? (
            <EstadoSinGps onActivar={() => obtenerUbicacion()} />
          ) : isPending && ofertas.length === 0 ? (
            <EstadoCargando />
          ) : isError ? (
            <EstadoError onReintentar={() => refetch()} />
          ) : ofertas.length === 0 ? (
            // Distinguimos dos casos:
            //  - Sin filtros y feed vacío → la ciudad no tiene ofertas todavía
            //  - Con filtros y feed vacío → el filtro no devuelve resultados
            chipActivo === 'todas' ? (
              <EstadoCiudadSinOfertas ciudad={ciudadNombre} />
            ) : (
              <EstadoVacioFiltro
                onLimpiar={() => useFiltrosOfertasStore.getState().resetear()}
              />
            )
          ) : !vistaExpandida && chipActivo === 'todas' ? (
            // Layout COMPACTO — 3 columnas: collage | lista única | collage.
            // Solo se usa cuando estás en la vista editorial completa (sin
            // filtro). Si hay un chip activo, la lista es resultado de un
            // filtro y los collages laterales se ven vacíos/raros — en ese
            // caso caemos al grid limpio de abajo.
            <div className="lg:grid lg:grid-cols-[220px_1fr_220px] 2xl:grid-cols-[260px_1fr_260px] lg:gap-5 2xl:gap-6 items-stretch">
              {/* Collage izquierdo — solo desktop, fotos fijas */}
              <div className="hidden lg:flex flex-col gap-1.5 overflow-hidden">
                {collageIzq.map((o, i) => (
                    <CollageItem
                      key={o.ofertaId}
                      oferta={o}
                      deg={i % 2 === 0 ? -1.5 : 1.5}
                      onClick={() => setOfertaSeleccionada(o)}
                    />
                  ))}
              </div>

              {/* Lista central */}
              <div className="bg-white border-2 border-[#e8e6e0] rounded-xl overflow-hidden shadow-md">
                {ofertasLista.map((o, idx) => (
                  <Fragment key={o.ofertaId}>
                    <CardOfertaLista
                      oferta={o}
                      onClick={() => setOfertaSeleccionada(o)}
                    />
                    {idx < ofertasLista.length - 1 && (
                      <div className="border-t-[1.5px] border-[#d6d2c8]" />
                    )}
                  </Fragment>
                ))}
              </div>

              {/* Collage derecho — solo desktop, fotos fijas */}
              <div className="hidden lg:flex flex-col gap-1.5 overflow-hidden">
                {collageDer.map((o, i) => (
                    <CollageItem
                      key={o.ofertaId}
                      oferta={o}
                      deg={i % 2 === 0 ? 1.5 : -1.5}
                      onClick={() => setOfertaSeleccionada(o)}
                    />
                  ))}
              </div>
            </div>
          ) : (
            // Layout EXPANDIDO — grid 1 / 2 (lg) / 3 (2xl) columnas, sin
            // collages laterales. Mismo CardOfertaLista pero cada card en su
            // propio contenedor con borde + sombra para exploración tranquila.
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
              {ofertasLista.map((o) => (
                <div
                  key={o.ofertaId}
                  className="bg-white border-2 border-[#e8e6e0] rounded-xl overflow-hidden shadow-md"
                >
                  <CardOfertaLista
                    oferta={o}
                    onClick={() => setOfertaSeleccionada(o)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* El toggle de vista expandida vive en el chip "Todas" del header. */}
        </section>

        {/* 7. CARRUSEL AUTO — "Populares esta semana" — CIERRE editorial. */}
        {/*    Ancho completo, exploración final. Invita a seguir          */}
        {/*    descubriendo lo más popular.                                */}
        {feedEditorialVisible && (
          <BloqueCarruselAuto
            eyebrow="Populares"
            titulo="Esta semana"
            iconoLucide={TrendingUp}
            ofertas={populares.data ?? []}
            cargando={populares.isPending}
            microsenales={microsenalesPopulares}
            onClickOferta={setOfertaSeleccionada}
            anchoUnderline="corto"
          />
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DE DETALLE                                                   */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {ofertaSeleccionada && (
        <div data-testid="modal-detalle-oferta">
          <ModalOfertaDetalle
            oferta={ofertaSeleccionada}
            whatsapp={ofertaSeleccionada.whatsapp ?? undefined}
            negocioNombre={ofertaSeleccionada.negocioNombre}
            negocioUsuarioId={ofertaSeleccionada.negocioUsuarioId}
            onClose={() => setOfertaSeleccionada(null)}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTES DE ESTADO
// =============================================================================

function EstadoCargando() {
  return (
    <div className="flex items-center justify-center py-16 bg-white border-2 border-[#e8e6e0] rounded-xl shadow-md">
      <Loader2 className="w-7 h-7 text-[#888] animate-spin" />
    </div>
  );
}

/**
 * Estado mostrado cuando la ciudad NO tiene ofertas activas en absoluto
 * (sin filtros aplicados). Mensaje distinto a EstadoVacioFiltro: aquí el
 * usuario no se equivoca con un filtro, simplemente la ciudad aún no tiene
 * negocios publicando ofertas.
 */
function EstadoCiudadSinOfertas({ ciudad }: { ciudad: string }) {
  return (
    <div className="relative flex flex-col items-center px-6 pt-10 pb-12 text-center lg:pt-16 lg:pb-20">
      {/* Sparkles decorativos */}
      <Sparkles
        className="absolute left-8 top-2 h-5 w-5 animate-pulse text-amber-400/70"
        strokeWidth={2}
        style={{ animationDuration: '2.5s' }}
      />
      <Sparkles
        className="absolute right-10 top-10 h-4 w-4 animate-pulse text-amber-300/70"
        strokeWidth={2}
        style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
      />

      {/* Icono central con halos pulsantes */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 -m-5 animate-ping rounded-full bg-amber-300/40"
          style={{ animationDuration: '2.4s' }}
        />
        <div
          className="absolute inset-0 -m-2 animate-ping rounded-full bg-amber-400/40"
          style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
        />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          }}
        >
          <Tag className="h-11 w-11 text-white" strokeWidth={2} />
        </div>
      </div>

      <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
        Aún no hay ofertas en{' '}
        <span className="text-amber-600">{ciudad || 'tu ciudad'}</span>
      </h3>
      <p className="max-w-sm text-base text-slate-600">
        Estamos sumando negocios locales. Pronto verás aquí descuentos y
        promociones de comercios cerca de ti.
      </p>
    </div>
  );
}

function EstadoVacioFiltro({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <div className="relative flex flex-col items-center px-6 pt-10 pb-12 text-center lg:pt-16 lg:pb-20">
      {/* Sparkles decorativos */}
      <Sparkles
        className="absolute left-8 top-2 h-5 w-5 animate-pulse text-amber-400/70"
        strokeWidth={2}
        style={{ animationDuration: '2.5s' }}
      />
      <Sparkles
        className="absolute right-10 top-10 h-4 w-4 animate-pulse text-amber-300/70"
        strokeWidth={2}
        style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
      />

      {/* Icono central con halos pulsantes (color amber de marca) */}
      <div className="relative mb-6">
        <div
          className="absolute inset-0 -m-5 animate-ping rounded-full bg-amber-300/40"
          style={{ animationDuration: '2.4s' }}
        />
        <div
          className="absolute inset-0 -m-2 animate-ping rounded-full bg-amber-400/40"
          style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
        />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          }}
        >
          <Tag className="h-11 w-11 text-white" strokeWidth={2} />
        </div>
      </div>

      <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
        Sin coincidencias
      </h3>
      <p className="mb-6 max-w-sm text-base text-slate-600">
        No encontramos ofertas con estos filtros. Prueba con otro chip o vuelve a
        ver todas las ofertas activas.
      </p>

      {/* CTA con animación sutil de pulso */}
      <button
        data-testid="btn-ver-todas-ofertas"
        onClick={onLimpiar}
        className="inline-flex animate-pulse cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-amber-500 to-amber-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
        style={{ animationDuration: '2.4s' }}
      >
        <Tag className="h-4 w-4" strokeWidth={2.5} />
        Ver todas las ofertas
      </button>
    </div>
  );
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-white border-2 border-[#e8e6e0] rounded-xl shadow-md">
      <div className="w-14 h-14 rounded-full bg-[#f0eee9] flex items-center justify-center mb-3">
        <Tag className="w-6 h-6 text-[#888]" strokeWidth={2} />
      </div>
      <p className="text-base font-bold text-[#1a1a1a]">
        No pudimos cargar las ofertas
      </p>
      <p className="text-sm text-[#6b6b6b] mt-1 mb-4">
        Revisa tu conexión y vuelve a intentar
      </p>
      <button
        data-testid="btn-reintentar-ofertas"
        onClick={onReintentar}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#333] cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" strokeWidth={2.5} />
        Reintentar
      </button>
    </div>
  );
}

function CollageItem({
  oferta,
  deg,
  onClick,
}: {
  oferta: OfertaFeed;
  deg: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={oferta.titulo}
      style={{ transform: `rotate(${deg}deg)` }}
      className="w-full aspect-3/4 rounded-lg overflow-hidden bg-[#e8e6e0] opacity-70 hover:opacity-90 transition-opacity duration-300 shadow-sm cursor-pointer"
    >
      {oferta.imagen ? (
        <img
          src={oferta.imagen}
          alt={oferta.titulo}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Tag className="w-4 h-4 text-[#b8b4a8]" strokeWidth={2} />
        </div>
      )}
    </button>
  );
}

/**
 * Carrusel rotativo con efecto de swipe en vivo. Renderiza 3 cards en
 * paralelo (anterior | actual | siguiente) y las desplaza con
 * `translateX(offsetPx)` mientras el usuario arrastra. Al soltar, la
 * card siguiente o anterior queda en pantalla con un snap animado.
 *
 * Mismo patrón que el visor de imágenes de ChatYA. La animación solo
 * se aplica cuando `enTransicion` es true (snap), no durante el drag
 * en vivo (para evitar lag).
 */
const NOOP = () => { /* placeholder click — swipe lo maneja el wrapper */ };

function CarruselRotativoSwipe({
  rot,
  onClick,
}: {
  rot: ReturnType<typeof useCarruselRotativo<OfertaFeed>>;
  onClick: (oferta: OfertaFeed) => void;
}) {
  const {
    actual, anteriorItem, siguienteItem,
    offsetPx, enTransicion, setWrapperRef, swipeHandlers,
    siguiente, anterior, total,
  } = rot;

  // onClick estable para evitar re-renders de CardOfertaHero durante el drag
  const handleClick = useMemo(() => {
    return actual ? () => onClick(actual) : NOOP;
  }, [actual, onClick]);

  if (!actual) return null;

  const transicion = enTransicion ? 'transform 220ms ease-out' : 'none';
  const styleActual: CSSProperties = {
    transform: `translateX(${offsetPx}px)`,
    transition: transicion,
    willChange: 'transform',
  };
  const stylePrev: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    transform: `translateX(calc(-100% + ${offsetPx}px))`,
    transition: transicion,
    willChange: 'transform',
  };
  const styleNext: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    transform: `translateX(calc(100% + ${offsetPx}px))`,
    transition: transicion,
    willChange: 'transform',
  };

  return (
    <div
      ref={setWrapperRef as (el: HTMLDivElement | null) => void}
      {...swipeHandlers}
      className="group/swipe relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
    >
      {/* Card actual — natural height (define el alto del wrapper) */}
      <div style={styleActual}>
        <CardOfertaHero oferta={actual} onClick={handleClick} variante="destacado" />
      </div>

      {/* Card anterior — fuera de pantalla a la izquierda */}
      {anteriorItem && (
        <div style={stylePrev} aria-hidden="true">
          <CardOfertaHero oferta={anteriorItem} onClick={NOOP} variante="destacado" />
        </div>
      )}

      {/* Card siguiente — fuera de pantalla a la derecha */}
      {siguienteItem && (
        <div style={styleNext} aria-hidden="true">
          <CardOfertaHero oferta={siguienteItem} onClick={NOOP} variante="destacado" />
        </div>
      )}

      {/* Flechas sutiles solo en desktop (lg+). Aparecen al hover del
          wrapper (`group/swipe`). En móvil el usuario hace swipe directo. */}
      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Oferta anterior"
            onClick={(e) => { e.stopPropagation(); anterior(); }}
            className="hidden lg:flex absolute top-[30%] -translate-y-1/2 left-2 z-20 w-9 h-9 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-md text-[#1a1a1a] opacity-0 group-hover/swipe:opacity-100 transition-opacity duration-200 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Oferta siguiente"
            onClick={(e) => { e.stopPropagation(); siguiente(); }}
            className="hidden lg:flex absolute top-[30%] -translate-y-1/2 right-2 z-20 w-9 h-9 items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-md text-[#1a1a1a] opacity-0 group-hover/swipe:opacity-100 transition-opacity duration-200 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );
}

/**
 * Indicadores estilo "dots" para mostrar la posición actual dentro del
 * carrusel rotativo del par superior. Pequeños, ámbar el activo, gris
 * los demás. Se ocultan automáticamente cuando solo hay 1 oferta (el
 * caller debe verificar `total > 1` antes de renderizar).
 */
function IndicadoresRotacion({ total, actual }: { total: number; actual: number }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 mt-2.5"
      aria-label={`Oferta ${actual + 1} de ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={[
            'rounded-full transition-all duration-300',
            i === actual
              ? 'w-5 h-1.5 bg-amber-500'
              : 'w-1.5 h-1.5 bg-[#d6d2c8]',
          ].join(' ')}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function EstadoSinGps({ onActivar }: { onActivar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-white border-2 border-[#e8e6e0] rounded-xl shadow-md">
      <div className="w-14 h-14 rounded-full bg-[#f0eee9] flex items-center justify-center mb-3">
        <MapPin className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2} />
      </div>
      <p className="text-base font-bold text-[#1a1a1a] text-center">
        Activa tu ubicación
      </p>
      <p className="text-sm text-[#6b6b6b] mt-1 mb-4 text-center max-w-sm">
        Para mostrarte ofertas ordenadas por cercanía necesitamos tu ubicación.
      </p>
      <button
        data-testid="btn-activar-gps-ofertas"
        onClick={onActivar}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#333] cursor-pointer"
      >
        <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
        Activar ubicación
      </button>
    </div>
  );
}
