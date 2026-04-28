/**
 * PanelPreviewNegocio.tsx
 * ========================
 * Panel de preview con tabs para ver Card y Perfil del negocio.
 *
 * Tab Card: Renderiza CardNegocio directamente (fetch directo por sucursalId)
 * Tab Perfil: Renderiza PaginaPerfilNegocio directamente (comparte caché React Query con el resto)
 *
 * Los wrappers de ambos tabs aplican `@container`: los componentes internos usan container
 * queries (@5xl:, @[96rem]:) que responden al ancho del panel (~540px) y NO al viewport del
 * navegador. Esto fuerza layout mobile dentro del preview sin necesidad de iframe.
 * Ver: docs/estandares/LECCIONES_TECNICAS.md → "Container queries vs viewport queries".
 *
 * Ubicacion: apps/web/src/components/layout/PanelPreviewNegocio.tsx
 */

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { X, Loader2, Store, CreditCard, User } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUiStore } from '../../stores/useUiStore';
import { PortalTargetProvider } from '../../hooks/usePortalTarget';
import { BreakpointOverride } from '../../hooks/useBreakpoint';
import { usePerfilSucursal } from '../../hooks/queries/usePerfil';
import { CardNegocio } from '../negocios/CardNegocio';
import type { NegocioResumen } from '../../types/negocios';

// Lazy load — PaginaPerfilNegocio en su propio chunk
const PaginaPerfilNegocio = lazy(() => import('../../pages/private/negocios/PaginaPerfilNegocio'));

interface PanelPreviewNegocioProps {
  esMobile?: boolean;
}

type TabActivo = 'card' | 'perfil';

// =============================================================================
// MAPPER: Perfil completo → NegocioResumen (lo que CardNegocio necesita)
// =============================================================================

function mapearPerfilAResumen(data: Record<string, unknown>): NegocioResumen {
  return {
    negocioId: data.negocioId as string,
    usuarioId: (data.usuarioId as string) ?? '',
    negocioNombre: data.negocioNombre as string,
    galeria: (data.galeria as NegocioResumen['galeria']) || [],
    logoUrl: (data.logoUrl as string | null) ?? null,
    aceptaCardya: (data.aceptaCardya as boolean) ?? false,
    verificado: (data.verificado as boolean) ?? false,
    sucursalId: data.sucursalId as string,
    sucursalNombre: data.sucursalNombre as string,
    esPrincipal: (data.esPrincipal as boolean) ?? false,
    direccion: (data.direccion as string) ?? '',
    ciudad: (data.ciudad as string) ?? '',
    telefono: (data.telefono as string) ?? '',
    whatsapp: (data.whatsapp as string | null) ?? null,
    tieneEnvioDomicilio: (data.tieneEnvioDomicilio as boolean) ?? false,
    tieneServicioDomicilio: (data.tieneServicioDomicilio as boolean) ?? false,
    calificacionPromedio: String(data.calificacionPromedio ?? '0'),
    totalCalificaciones: (data.totalCalificaciones as number) ?? 0,
    totalLikes: (data.totalLikes as number) ?? 0,
    totalVisitas: (data.totalVisitas as number) ?? 0,
    activa: (data.activa as boolean) ?? true,
    latitud: (data.latitud as number | null) ?? null,
    longitud: (data.longitud as number | null) ?? null,
    distanciaKm: null,
    categorias: (data.categorias as NegocioResumen['categorias']) || [],
    metodosPago: (data.metodosPago as string[]) || [],
    liked: (data.liked as boolean) ?? false,
    followed: (data.followed as boolean) ?? false,
    estaAbierto: (data.estaAbierto as boolean | null) ?? null,
    totalSucursales: (data.totalSucursales as number) ?? 1,
  };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PanelPreviewNegocio({ esMobile = false }: PanelPreviewNegocioProps) {
  const usuario = useAuthStore((state) => state.usuario);
  const cerrarPreviewNegocio = useUiStore((state) => state.cerrarPreviewNegocio);

  // React Query — datos del perfil (comparte caché con Mi Perfil)
  const perfilQuery = usePerfilSucursal();
  const negocioPreview = perfilQuery.data
    ? mapearPerfilAResumen(perfilQuery.data as Record<string, unknown>)
    : null;
  const cargando = perfilQuery.isPending;
  const error = perfilQuery.error ? 'Error al cargar el negocio' : null;

  const sucursalId = usuario?.sucursalActiva || null;
  const [tabActivo, setTabActivo] = useState<TabActivo>('card');

  // Portal targets para que los modales descendientes se contengan al panel
  // en lugar de escapar al viewport del PC (rompería la metáfora "preview=celular").
  // Usamos callback ref para que Tailwind/React actualicen cuando el DOM se monta.
  const [targetTabCard, setTargetTabCard] = useState<HTMLElement | null>(null);
  const [targetTabPerfil, setTargetTabPerfil] = useState<HTMLElement | null>(null);

  // Botón atrás nativo: cerrar preview
  const previewHistoryRef = useRef(false);
  const previewPopStateRef = useRef<(() => void) | null>(null);
  const previewIdRef = useRef(`_preview_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

  const cerrarPreviewConHistory = useCallback(() => {
    if (previewHistoryRef.current) {
      previewHistoryRef.current = false;
      if (previewPopStateRef.current) {
        window.removeEventListener('popstate', previewPopStateRef.current);
        previewPopStateRef.current = null;
      }
      history.back();
    }
    cerrarPreviewNegocio();
  }, [cerrarPreviewNegocio]);

  useEffect(() => {
    const id = previewIdRef.current;

    if (!previewHistoryRef.current) {
      const prevState = history.state ?? {};
      history.pushState({ ...prevState, _previewNegocio: id }, '', window.location.href);
      previewHistoryRef.current = true;
    }

    const onPopState = () => {
      if (!previewHistoryRef.current) return;
      if (history.state?._previewNegocio === id) return;
      previewHistoryRef.current = false;
      previewPopStateRef.current = null;
      cerrarPreviewNegocio();
    };

    previewPopStateRef.current = onPopState;
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      previewPopStateRef.current = null;
    };
  }, [cerrarPreviewNegocio]);

  // Datos vienen de React Query (usePerfilSucursal) — caché automático

  // Render Header con Tabs
  const renderHeader = () => {
    // Tabs modernos compactos — pills flotantes con solo iconos y labels chicos.
    // Tab activo: fondo blanco con texto slate-900 (dark gradient TC-7 como background del header).
    const tabs = (
      <div className="flex bg-white/10 rounded-full p-0.5 backdrop-blur-sm border border-white/10">
        <button
          onClick={() => setTabActivo('card')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            tabActivo === 'card'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-white/85 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Card
        </button>
        <button
          onClick={() => setTabActivo('perfil')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            tabActivo === 'perfil'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-white/85 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Perfil
        </button>
      </div>
    );

    // Indicador "En vivo" — texto más grande (text-sm) y punto verde sobre dark background.
    const indicadorVivo = (
      <div className="flex items-center gap-1.5 text-sm font-medium text-white/90">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]" />
        En vivo
      </div>
    );

    // Header oscuro — negro → slate-900 para máximo contraste con los tabs blancos.
    // Alineado con el border-l-4 border-black del panel en MainLayout.
    const bgDark = { background: 'linear-gradient(135deg, #000000, #1e293b)' };

    if (esMobile) {
      // Móvil: mantenemos botón cerrar grande porque es fullscreen modal
      return (
        <div className="sticky top-0 z-10 text-white px-4 py-2 shadow-md" style={bgDark}>
          <div className="flex items-center justify-between gap-3">
            {tabs}
            <button
              onClick={cerrarPreviewConHistory}
              className="p-1.5 hover:bg-white/15 rounded-full transition-colors cursor-pointer"
              aria-label="Cerrar preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      );
    }

    // Desktop: barra compacta de una sola fila (~44px). Tabs + indicador "En vivo".
    // Sin texto "Vista Previa" ni icono Eye — el contexto (panel lateral) ya lo hace evidente.
    return (
      <div className="shrink-0 text-white px-3 py-2 flex items-center justify-between gap-3" style={bgDark}>
        {tabs}
        {indicadorVivo}
      </div>
    );
  };

  // Render Loading
  if (cargando) {
    const contenido = (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm">Cargando preview...</span>
      </div>
    );

    if (esMobile) {
      return (
        <div className="fixed inset-0 z-60 bg-white">
          {renderHeader()}
          <div className="h-[calc(100vh-100px)]">{contenido}</div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {renderHeader()}
        <div className="flex-1">{contenido}</div>
      </div>
    );
  }

  // Render Error
  if (error || !sucursalId) {
    const contenido = (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 p-4">
        <Store className="w-12 h-12 text-gray-300" />
        <span className="text-sm text-center">{error || 'No hay datos disponibles'}</span>
      </div>
    );

    if (esMobile) {
      return (
        <div className="fixed inset-0 z-60 bg-white">
          {renderHeader()}
          <div className="h-[calc(100vh-100px)]">{contenido}</div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {renderHeader()}
        <div className="flex-1">{contenido}</div>
      </div>
    );
  }

  // Render del contenido según tab activo
  const renderContenido = () => {
    const cardVisible = tabActivo === 'card';

    return (
      <>
        {/* Tab Card - render directo
            @container: container query root estrecho (~540px) → @5xl: (1024) y @[96rem]: (1536)
            no se activan → CardNegocio se renderiza con layout mobile dentro del panel.
            relative + ref: portal target para que los modales descendientes se contengan al panel. */}
        <div ref={setTargetTabCard} className={`@container flex-1 bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4 overflow-auto relative ${cardVisible ? '' : 'hidden'}`}>
          <PortalTargetProvider target={targetTabCard}>
          {negocioPreview ? (
            <div className="max-w-[400px] w-full">
              <CardNegocio
                negocio={negocioPreview}
                seleccionado={false}
                onSelect={() => { }}
                modoPreview={true}
                onVerPerfil={() => setTabActivo('perfil')}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500 p-4">
              <Store className="w-12 h-12 text-gray-300" />
              <span className="text-sm">No se pudo cargar la card</span>
            </div>
          )}
          </PortalTargetProvider>
        </div>

        {/* Tab Perfil - render directo de PaginaPerfilNegocio.
            @container: container query root estrecho (~540px) → PaginaPerfilNegocio y sus
            secciones (Catálogo, Ofertas, Galería) se renderizan con layout mobile.
            relative + ref: portal target para que los modales descendientes se contengan al panel. */}
        <div ref={setTargetTabPerfil} className={`@container perfil-contenedor flex-1 flex flex-col relative ${cardVisible ? 'hidden' : ''}`} style={{ minHeight: 0 }}>
          <PortalTargetProvider target={targetTabPerfil}>
          <div className="perfil-embebido flex-1 overflow-y-auto bg-white" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <BreakpointOverride forzarMobile>
                <PaginaPerfilNegocio sucursalIdOverride={sucursalId!} modoPreviewOverride />
              </BreakpointOverride>
            </Suspense>
          </div>
          </PortalTargetProvider>
        </div>
      </>
    );
  };

  // Render principal
  if (esMobile) {
    return (
      <div className="fixed inset-0 z-60 bg-white flex flex-col">
        {renderHeader()}
        {renderContenido()}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {renderHeader()}
      {renderContenido()}
    </div>
  );
}

export default PanelPreviewNegocio;