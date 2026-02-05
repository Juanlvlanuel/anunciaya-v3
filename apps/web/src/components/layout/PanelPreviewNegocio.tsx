/**
 * PanelPreviewNegocio.tsx
 * ========================
 * Panel de preview con tabs para ver Card y Perfil del negocio.
 *
 * Ubicacion: apps/web/src/components/layout/PanelPreviewNegocio.tsx
 */

import { useEffect, useState } from 'react';
import { X, Eye, Loader2, Store, CreditCard, User } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useUiStore } from '../../stores/useUiStore';

interface PanelPreviewNegocioProps {
  esMobile?: boolean;
}

type TabActivo = 'card' | 'perfil';

export function PanelPreviewNegocio({ esMobile = false }: PanelPreviewNegocioProps) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [tabActivo, setTabActivo] = useState<TabActivo>('card');

  const usuario = useAuthStore((state) => state.usuario);
  const cerrarPreviewNegocio = useUiStore((state) => state.cerrarPreviewNegocio);

  // Usar la sucursal activa del usuario
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
    setCargando(false);
  }, [usuario?.negocioId, usuario?.sucursalActiva]);

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

  // URLs para los iframes
  const urlCard = '/negocios?preview=card&sucursalId=' + sucursalId;
  const urlPerfil = '/negocios/' + sucursalId + '?preview=true';

  // Render principal
  if (esMobile) {
    return (
      <div className="fixed inset-0 z-30 bg-white">
        {renderHeader()}
        <iframe
          key={tabActivo}
          src={tabActivo === 'card' ? urlCard : urlPerfil}
          className="w-full h-[calc(100vh-100px)] border-0"
          title="Preview del negocio"
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {renderHeader()}
      <iframe
        key={tabActivo}
        src={tabActivo === 'card' ? urlCard : urlPerfil}
        className="flex-1 w-full border-0"
        title="Preview del negocio"
      />
    </div>
  );
}

export default PanelPreviewNegocio;