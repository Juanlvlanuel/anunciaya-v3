/**
 * PanelPreviewNegocio.tsx
 * ========================
 * Panel de preview con tabs para ver Card y Perfil del negocio.
 * 
 * Tab Card: Renderiza CardNegocio directamente (fetch directo por sucursalId)
 * Tab Perfil: Usa iframe apuntando a PaginaPerfilNegocio
 *
 * Ubicacion: apps/web/src/components/layout/PanelPreviewNegocio.tsx
 */

import { useEffect, useState } from 'react';
import { X, Eye, Loader2, Store, CreditCard, User } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUiStore } from '../../stores/useUiStore';
import { get } from '../../services/api';
import { CardNegocio } from '../negocios/CardNegocio';
import type { NegocioResumen } from '../../types/negocios';

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
    negocioNombre: data.negocioNombre as string,
    galeria: (data.galeria as NegocioResumen['galeria']) || [],
    logoUrl: (data.logoUrl as string | null) ?? null,
    aceptaCardya: (data.aceptaCardya as boolean) ?? false,
    verificado: (data.verificado as boolean) ?? false,
    sucursalId: data.sucursalId as string,
    sucursalNombre: data.sucursalNombre as string,
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
  };
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PanelPreviewNegocio({ esMobile = false }: PanelPreviewNegocioProps) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [tabActivo, setTabActivo] = useState<TabActivo>('card');
  const [negocioPreview, setNegocioPreview] = useState<NegocioResumen | null>(null);

  const usuario = useAuthStore((state) => state.usuario);
  const cerrarPreviewNegocio = useUiStore((state) => state.cerrarPreviewNegocio);

  // Obtener sucursalId del usuario
  useEffect(() => {
    if (!usuario?.negocioId) {
      setError('No se encontró el negocio');
      setCargando(false);
      return;
    }

    if (!usuario?.sucursalActiva) {
      setError('No hay sucursal activa');
      setCargando(false);
      return;
    }

    setSucursalId(usuario.sucursalActiva);
  }, [usuario?.negocioId, usuario?.sucursalActiva]);

  // Fetch directo del negocio por sucursalId
  useEffect(() => {
    if (!sucursalId) return;

    let cancelado = false;

    async function fetchNegocio() {
      try {
        setCargando(true);
        setError(null);

        const resp = await get<Record<string, unknown>>(`/negocios/sucursal/${sucursalId}`);

        if (cancelado) return;

        if (resp.success && resp.data) {
          setNegocioPreview(mapearPerfilAResumen(resp.data));
        } else {
          setError('No se pudo cargar el negocio');
        }
      } catch {
        if (!cancelado) {
          setError('Error al cargar el negocio');
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    fetchNegocio();

    return () => { cancelado = true; };
  }, [sucursalId]);

  // Render Header con Tabs
  const renderHeader = () => {
    const tabs = (
      <div className="flex bg-white/10 rounded-lg p-0.5">
        <button
          onClick={() => setTabActivo('card')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tabActivo === 'card'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Card
        </button>
        <button
          onClick={() => setTabActivo('perfil')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tabActivo === 'perfil'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
        >
          <User className="w-3.5 h-3.5" />
          Perfil
        </button>
      </div>
    );

    if (esMobile) {
      return (
        <div className="sticky top-0 z-10 bg-linear-to-r from-blue-500 to-blue-600 text-white px-4 py-3 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <span className="font-bold">Vista Previa</span>
            </div>
            <button onClick={cerrarPreviewNegocio} className="p-2 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          {tabs}
        </div>
      );
    }

    return (
      <div className="shrink-0 bg-linear-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <span className="font-bold text-sm">Vista Previa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">En vivo</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>
        {tabs}
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
        <div className="fixed inset-0 z-30 bg-white">
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
        <div className="fixed inset-0 z-30 bg-white">
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

  // URL para iframe del perfil
  const urlPerfil = '/negocios/' + sucursalId + '?preview=true';

  // Render del contenido según tab activo
  const renderContenido = () => {
    const cardVisible = tabActivo === 'card';

    return (
      <>
        {/* Tab Card - render directo */}
        <div className={`flex-1 bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4 overflow-auto ${cardVisible ? '' : 'hidden'}`}>
          {negocioPreview ? (
            <div className="max-w-[300px] w-full 2xl:mr-14 mr-14">
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
        </div>

        {/* Tab Perfil - iframe precargado (se oculta con CSS, no se desmonta) */}
        <iframe
          src={urlPerfil}
          className={`flex-1 w-full border-0 ${cardVisible ? 'hidden' : ''}`}
          title="Preview del perfil"
        />
      </>
    );
  };

  // Render principal
  if (esMobile) {
    return (
      <div className="fixed inset-0 z-30 bg-white flex flex-col">
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