/**
 * MenuDrawer.tsx - VERSIÓN MEJORADA v2.5
 * =======================================
 * Menú lateral que se abre desde el header en móvil.
 *
 * ✨ MEJORAS v2.5:
 * - Reorganización para comercial: MI NEGOCIO primero, luego opciones generales
 * - Orden comercial: ScanYA → Business Studio → Mi Perfil → Configuración → Guardados
 *
 * ✨ MEJORAS v2.4:
 * - Mis Publicaciones solo para personal (comercial gestiona desde Business Studio)
 * - Guardados disponible para todos
 *
 * ✨ MEJORAS v2.1:
 * - Ancho responsive: 65% de la pantalla
 * - Diseño de 3 niveles en sección "MI CUENTA":
 *   • Avatar grande a la izquierda
 *   • Nombre + Correo a la derecha del avatar
 *   • Badge debajo del avatar
 * - Botones más compactos (menos padding, iconos más pequeños)
 *
 * Contenido:
 * - Info del usuario (avatar, badge cuenta, nombre, correo)
 * - CardYA (solo personal)
 * - Mis Cupones (solo personal, con badge)
 * - Guardados (todos)
 * - Mis Publicaciones (solo personal)
 * - Mi Perfil (todos)
 * - Configuración (todos)
 * - ScanYA + Business Studio (solo comercial)
 * - Cerrar sesión
 *
 * Ubicación: apps/web/src/components/layout/MenuDrawer.tsx
 */

import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import {
  X,
  User,
  Settings,
  LogOut,
  CreditCard,
  ChevronRight,
  Gift,
  Heart,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { ToggleModoUsuario } from '../ui/ToggleModoUsuario';

// =============================================================================
// TIPOS
// =============================================================================

interface MenuDrawerProps {
  onClose: () => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function MenuDrawer({ onClose }: MenuDrawerProps) {
  // ---------------------------------------------------------------------------
  // Stores
  // ---------------------------------------------------------------------------
  const usuario = useAuthStore((state) => state.usuario);
  const logout = useAuthStore((state) => state.logout);

  // ---------------------------------------------------------------------------
  // Hooks
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // Effect: Bloquear scroll del body cuando el drawer está abierto
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Guardar la posición actual del scroll
    const scrollY = window.scrollY;
    const body = document.body;

    // Guardar estilos originales
    const originalPosition = body.style.position;
    const originalTop = body.style.top;
    const originalWidth = body.style.width;
    const originalOverflow = body.style.overflow;

    // Fijar el body en la posición actual
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    // Cleanup: Restaurar al desmontar
    return () => {
      body.style.position = originalPosition;
      body.style.top = originalTop;
      body.style.width = originalWidth;
      body.style.overflow = originalOverflow;

      // Restaurar la posición del scroll
      window.scrollTo(0, scrollY);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleNavegar = (ruta: string) => {
    navigate(ruta);
    onClose();
  };

  const handleCerrarSesion = () => {
    onClose();
    navigate('/');
    logout();
  };

  // ---------------------------------------------------------------------------
  // Computed
  // ---------------------------------------------------------------------------
  const esComercial = usuario?.modoActivo === 'comercial';
  const inicialUsuario = usuario?.nombre?.charAt(0).toUpperCase() || 'U';

  // TODO: Estos datos deben venir del store o API
  const cuponesActivos = 3;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-1001">
      {/* Overlay oscuro */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        style={{ touchAction: 'none' }}
      />

      {/* Drawer - 65% del ancho en móvil */}
      <div
        className="absolute top-0 right-0 bottom-0 w-[65%] bg-white shadow-xl flex flex-col animate-slide-in"
        style={{
          overscrollBehavior: 'contain',
          touchAction: 'pan-y'
        }}
      >
        {/* === HEADER CON GRADIENTE METÁLICO === */}
        <div className="bg-linear-to-r from-slate-100 via-slate-200 to-slate-100 border-b border-gray-300 p-4 relative">
          {/* Botón cerrar - Posición absoluta */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full shadow-md transition-all duration-150"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Info del usuario - CENTRADO */}
          <div className="flex flex-col items-center text-center mt-4">
            {/* Avatar */}
            <div className="relative mb-3">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ${esComercial
                  ? 'bg-linear-to-br from-orange-400 to-orange-600 ring-orange-100'
                  : 'bg-linear-to-br from-blue-400 to-blue-600 ring-blue-100'
                  } overflow-hidden`}
              >
                {esComercial ? (
                  usuario?.fotoPerfilNegocio ? (
                    <img
                      src={usuario.fotoPerfilNegocio}
                      alt={usuario?.nombreNegocio || 'Negocio'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    usuario?.nombreNegocio?.charAt(0).toUpperCase() || 'N'
                  )
                ) : (
                  inicialUsuario
                )}
              </div>
              {/* Indicador online */}
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-slate-200 shadow-md"></div>
            </div>

            {/* Toggle de modo */}
            <div className="mb-3">
              <ToggleModoUsuario grande />
            </div>

            {/* Nombre */}
            <p className="font-bold text-gray-900 text-base mb-0.5 px-2 truncate w-full">
              {esComercial && usuario?.nombreNegocio
                ? usuario.nombreNegocio
                : `${usuario?.nombre} ${usuario?.apellidos}`}
            </p>

            {/* Correo */}
            <p className="text-sm text-gray-600 px-2 truncate w-full">
              {esComercial && usuario?.correoNegocio
                ? usuario.correoNegocio
                : usuario?.correo}
            </p>
          </div>
        </div>

        {/* === OPCIONES DE NAVEGACIÓN === */}
        <div className="flex-1 overflow-auto py-2">
          {/* === SECCIÓN COMERCIAL (PRIMERO) === */}
          {esComercial && (
            <>
              {/* ScanYA */}
              <MenuDrawerItem
                iconoImagen="/IconoScanYA.webp"
                label={
                  <span>
                    <span className="text-blue-700">Scan</span>
                    <span className="text-red-600">YA</span>
                  </span>
                }
                bgColor="bg-linear-to-br from-orange-500 to-orange-600"
                iconColor="text-white"
                hoverGradient="hover:from-orange-50"
                arrowColor="text-orange-400 group-hover:text-orange-600"
                comercial
                onClick={() => handleNavegar('/scanya')}
              />

              {/* Business Studio */}
              <MenuDrawerItem
                iconoImagen="/IconoBS.webp"
                label={
                  <span>
                    <span className=" text-blue-700">Business</span>
                    <span className=" text-blue-700"> Studio</span>
                  </span>
                }
                bgColor="bg-linear-to-br from-blue-500 to-blue-600"
                iconColor="text-white"
                hoverGradient="hover:from-orange-50"
                arrowColor="text-orange-400 group-hover:text-orange-600"
                comercial
                onClick={() => handleNavegar('/business-studio')}
              />

              {/* Divisor después de sección comercial */}
              <div className="my-2.5 mx-4 h-[1.5px] bg-linear-to-r from-transparent via-gray-400 to-transparent"></div>
            </>
          )}

          {/* CardYA (solo personal) */}
          {!esComercial && (
            <MenuDrawerItem
              icon={CreditCard}
              label="CardYA"
              bgColor="bg-blue-100"
              iconColor="text-blue-600"
              hoverGradient="hover:from-blue-50"
              onClick={() => handleNavegar('/cardya')}
            />
          )}

          {/* Mis Cupones (solo personal) */}
          {!esComercial && (
            <MenuDrawerItem
              icon={Gift}
              label="Mis Cupones"
              badge={cuponesActivos}
              bgColor="bg-emerald-100"
              iconColor="text-emerald-600"
              hoverGradient="hover:from-emerald-50"
              onClick={() => handleNavegar('/cupones')}
            />
          )}

          {/* Mis Publicaciones (solo personal) */}
          {!esComercial && (
            <MenuDrawerItem
              icon={FileText}
              label="Mis Publicaciones"
              bgColor="bg-purple-100"
              iconColor="text-purple-600"
              hoverGradient="hover:from-purple-50"
              onClick={() => handleNavegar('/mis-publicaciones')}
            />
          )}

          {/* Divisor antes de opciones comunes (solo personal) */}
          {!esComercial && (
            <div className="my-2.5 mx-4 h-[1.5px] bg-linear-to-r from-transparent via-gray-400 to-transparent"></div>
          )}

          {/* Mi Perfil */}
          <MenuDrawerItem
            icon={User}
            label="Mi Perfil"
            bgColor="bg-blue-100"
            iconColor="text-blue-600"
            hoverGradient="hover:from-blue-50"
            onClick={() => handleNavegar('/perfil')}
          />

          {/* Configuración */}
          <MenuDrawerItem
            icon={Settings}
            label="Configuración"
            bgColor="bg-gray-100"
            iconColor="text-gray-600"
            hoverGradient="hover:from-gray-50"
            onClick={() => handleNavegar('/configuracion')}
          />

          {/* Guardados */}
          <MenuDrawerItem
            icon={Heart}
            label="Mis Guardados"
            bgColor="bg-pink-100"
            iconColor="text-pink-600"
            hoverGradient="hover:from-pink-50"
            onClick={() => handleNavegar('/guardados')}
          />
        </div>

        {/* === FOOTER: CERRAR SESIÓN === */}
        <div className="p-3 border-t border-gray-200 bg-linear-to-b from-transparent to-gray-50">
          <button
            onClick={handleCerrarSesion}
            className="w-full flex items-center justify-center gap-2 py-3 bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 rounded-xl shadow-lg transition-all duration-150 font-bold text-sm active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTE: MenuDrawerItem (VERSIÓN COMPACTA)
// =============================================================================

interface MenuDrawerItemProps {
  icon?: React.ElementType;
  iconoImagen?: string;
  label: string | React.ReactNode;
  badge?: number;
  bgColor: string;
  iconColor: string;
  hoverGradient: string;
  arrowColor?: string;
  comercial?: boolean;
  onClick: () => void;
}

function MenuDrawerItem({
  icon: Icon,
  iconoImagen,
  label,
  badge,
  bgColor,
  iconColor,
  hoverGradient,
  arrowColor = 'text-gray-400 group-hover:text-blue-500',
  onClick,
}: MenuDrawerItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-linear-to-r ${hoverGradient} hover:to-transparent group transition-all duration-150 hover:translate-x-1`}
    >
      {/* Icono con o sin background */}
      <div className={`${iconoImagen ? 'w-auto h-8' : 'w-8 h-8'} ${iconoImagen ? '' : bgColor} ${iconoImagen ? '' : 'rounded-lg'} flex items-center justify-center group-hover:scale-110 transition-transform duration-150 ${iconoImagen ? '' : 'shadow-sm'} shrink-0`}>
        {iconoImagen ? (
          <img src={iconoImagen} alt={typeof label === 'string' ? label : 'Icono'} className="w-full h-full object-contain" />
        ) : Icon ? (
          <Icon className={`w-4 h-4 ${iconColor}`} />
        ) : null}
      </div>

      {/* Label - TEXTO MÁS PEQUEÑO */}
      <span className="font-semibold text-gray-900 text-md">{label}</span>

      {/* Badge o Chevron */}
      {badge !== undefined && badge > 0 ? (
        <span className="ml-auto bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : (
        <ChevronRight
          className={`w-4 h-4 ml-auto ${arrowColor} group-hover:translate-x-1 transition-all duration-150`}
        />
      )}
    </button>
  );
}

export default MenuDrawer;