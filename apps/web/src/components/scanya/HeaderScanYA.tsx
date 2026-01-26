/**
 * HeaderScanYA.tsx
 * ================
 * Header del Dashboard ScanYA - VERSIÓN MÓVIL OPTIMIZADA.
 *
 * Cambios:
 * - Sin botón Online
 * - Móvil: 2 líneas (Negocio arriba, Sucursal + Logout abajo)
 * - Laptop+: 1 línea (Logo + Negocio • Sucursal + Logout)
 *
 * Ubicación: apps/web/src/components/scanya/HeaderScanYA.tsx
 */

import { useNavigate } from 'react-router-dom';
import { LogOut, Store } from 'lucide-react';
import { useScanYAStore } from '@/stores/useScanYAStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import IndicadorOffline from './IndicadorOffline';

// =============================================================================
// INTERFACES
// =============================================================================

interface HeaderScanYAProps {
  className?: string;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function HeaderScanYA({ className = '' }: HeaderScanYAProps) {
  const navigate = useNavigate();
  const { usuario, logout } = useScanYAStore();
  const online = useOnlineStatus();

  if (!usuario) return null;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  const handleLogout = () => {
    logout();
    navigate('/scanya/login');
  };

  const handleLogoClick = () => {
    navigate('/scanya');
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <header
      className={`
        p-4 lg:p-3 2xl:p-4
        sticky top-0 z-50
        ${className}
      `}
      style={{
        background: '#000000',  // Negro sólido 100%
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      }}
    >
      {/* Después del </header> en HeaderScanYA */}
      <div
        className="absolute left-0 right-0 h-1 bottom-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #3B82F6 50%, transparent 100%)',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
          zIndex: 49, // Justo debajo del header (z-50)
        }}
      />
      <div
        className="
          mx-auto
          lg:max-w-[800px] 2xl:max-w-[900px]
        "
      >
        {/* ===================================================================
            MÓVIL: Solo Logo + Logout
        =================================================================== */}
        <div className="lg:hidden flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={handleLogoClick}
            className="shrink-0 group cursor-pointer pl-2"
            aria-label="Ir al dashboard"
          >
            <img
              src="/logo-scanya.webp"
              alt="ScanYA"
              className="
                h-12 w-auto
                object-contain
                transition-transform duration-300
                group-hover:scale-110
                group-active:scale-95
              "
            />
          </button>

          {/* Indicador offline (solo cuando no hay conexión) */}
          {!online && <IndicadorOffline />}

          {/* Botón Logout */}
          <button
            onClick={handleLogout}
            className="
              flex items-center justify-center
              w-10 h-10
              rounded-lg
              text-white
              transition-all duration-200
              cursor-pointer
              shrink-0
              mr-2
            "
            style={{
              background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
              boxShadow: '0 0 15px rgba(220, 38, 38, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #B91C1C, #991B1B)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(220, 38, 38, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #DC2626, #B91C1C)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.3)';
            }}
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* ===================================================================
            LAPTOP/DESKTOP: Layout 1 fila (Grid 3 columnas)
        =================================================================== */}
        <div className="hidden lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-4">
          {/* Columna Izquierda: Logo */}
          <button
            onClick={handleLogoClick}
            className="shrink-0 group cursor-pointer"
            aria-label="Ir al dashboard"
          >
            <img
              src="/logo-scanya.webp"
              alt="ScanYA"
              className="
                h-12 w-auto
                2xl:h-12
                object-contain
                transition-transform duration-300
                group-hover:scale-110
                group-active:scale-95
              "
            />
          </button>

          {/* Columna Centro: Negocio + Sucursal en 1 línea */}
          <div className="flex items-center justify-center gap-2.5 min-w-0">
            <Store
              className="w-6 h-6 2xl:w-6 2xl:h-6 text-[#3B82F6] shrink-0"
              strokeWidth={2}
            />
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Nombre del negocio */}
              <h1
                className="
                  text-white font-semibold truncate
                  text-lg 2xl:text-xl
                "
              >
                {usuario.nombreNegocio}
              </h1>

              {/* Separador + Sucursal (si existe) */}
              {usuario.nombreSucursal && (
                <>
                  <span className="text-[#3B82F6] font-bold text-xl">•</span>
                  <p
                    className="
                      text-[#94A3B8] truncate
                      text-base 2xl:text-lg
                    "
                  >
                    {usuario.nombreSucursal}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Columna Derecha: Indicador Offline + Botón Logout */}
          <div className="flex items-center gap-3">
            {/* Indicador offline (solo cuando no hay conexión) */}
            {!online && <IndicadorOffline />}

            {/* Botón Logout */}
            <button
              onClick={handleLogout}
              className="
                flex items-center justify-center
                w-10 h-10
                rounded-lg
                text-white
                transition-all duration-200
                cursor-pointer
                shrink-0
              "
              style={{
                background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                boxShadow: '0 0 15px rgba(220, 38, 38, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #B91C1C, #991B1B)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(220, 38, 38, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #DC2626, #B91C1C)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(220, 38, 38, 0.3)';
              }}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}