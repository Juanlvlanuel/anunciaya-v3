/**
 * MenuDrawer.tsx - VERSIÓN v3.0 REDISEÑADA
 * =========================================
 * Menú lateral que se abre desde el header en móvil.
 *
 * ✨ MEJORAS v3.0:
 * - 📍 Ubicación y 💼 Empleos UNIVERSALES (siempre visibles)
 * - Ubicación como 1era opción destacada
 * - Empleos como 2da opción destacada con subtítulo adaptativo
 * - Mejor organización visual con secciones claras
 *
 * ✨ ESTRUCTURA v3.0:
 * 1. Header (Avatar + Toggle Modo)
 * 2. OPCIONES UNIVERSALES:
 *    - 📍 Ubicación (todos)
 *    - 💼 Empleos (todos, texto adaptativo)
 * 3. OPCIONES POR MODO:
 *    - Comercial: ScanYA, Business Studio
 *    - Personal: CardYA, Cupones, Publicaciones
 * 4. OPCIONES COMUNES:
 *    - Perfil, Configuración, Guardados
 * 5. Footer (Cerrar Sesión)
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
  MapPin,
  Briefcase,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useUiStore } from '../../stores/useUiStore';
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
  
  const ciudadData = useGpsStore((state) => state.ciudad);
  
  const abrirModalUbicacion = useUiStore((state) => state.abrirModalUbicacion);

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

  const handleAbrirUbicacion = () => {
    abrirModalUbicacion();
    onClose();
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
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ${
                  esComercial
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
          {/* === SECCIÓN UNIVERSAL (SIEMPRE VISIBLE) === */}
          
          {/* Ubicación - PRIMERA OPCIÓN */}
          <MenuDrawerItemDestacado
            icon={MapPin}
            label="Tu Ubicación"
            sublabel={ciudadData?.nombreCompleto || 'Seleccionar ubicación'}
            bgColor="bg-linear-to-br from-blue-500 to-blue-600"
            iconColor="text-white"
            hoverGradient="hover:from-blue-50"
            borderColor="border-blue-200"
            onClick={handleAbrirUbicacion}
          />

          {/* Empleos - SEGUNDA OPCIÓN */}
          <MenuDrawerItemDestacado
            icon={Briefcase}
            label="Bolsa de Trabajo"
            sublabel={
              esComercial
                ? 'Publica vacantes y contrata'
                : 'Busca empleo u ofrece servicios'
            }
            bgColor="bg-linear-to-br from-purple-500 to-purple-600"
            iconColor="text-white"
            hoverGradient="hover:from-purple-50"
            borderColor="border-purple-200"
            onClick={() => handleNavegar('/empleos')}
          />

          {/* Divisor después de opciones universales */}
          <div className="my-2.5 mx-4 h-[1.5px] bg-linear-to-r from-transparent via-gray-400 to-transparent"></div>

          {/* === SECCIÓN COMERCIAL (SI APLICA) === */}
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

          {/* === SECCIÓN PERSONAL (SI APLICA) === */}
          {!esComercial && (
            <>
              {/* CardYA */}
              <MenuDrawerItem
                icon={CreditCard}
                label="CardYA"
                bgColor="bg-blue-100"
                iconColor="text-blue-600"
                hoverGradient="hover:from-blue-50"
                onClick={() => handleNavegar('/cardya')}
              />

              {/* Mis Cupones */}
              <MenuDrawerItem
                icon={Gift}
                label="Mis Cupones"
                badge={cuponesActivos}
                bgColor="bg-emerald-100"
                iconColor="text-emerald-600"
                hoverGradient="hover:from-emerald-50"
                onClick={() => handleNavegar('/cupones')}
              />

              {/* Mis Publicaciones */}
              <MenuDrawerItem
                icon={FileText}
                label="Mis Publicaciones"
                bgColor="bg-purple-100"
                iconColor="text-purple-600"
                hoverGradient="hover:from-purple-50"
                onClick={() => handleNavegar('/mis-publicaciones')}
              />

              {/* Divisor después de opciones personales */}
              <div className="my-2.5 mx-4 h-[1.5px] bg-linear-to-r from-transparent via-gray-400 to-transparent"></div>
            </>
          )}

          {/* === OPCIONES COMUNES (TODOS) === */}
          
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
// SUBCOMPONENTE: MenuDrawerItemDestacado (VERSIÓN DESTACADA)
// =============================================================================

interface MenuDrawerItemDestacadoProps {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  bgColor: string;
  iconColor: string;
  hoverGradient: string;
  borderColor: string;
  onClick: () => void;
}

function MenuDrawerItemDestacado({
  icon: Icon,
  label,
  sublabel,
  bgColor,
  iconColor,
  hoverGradient,
  borderColor,
  onClick,
}: MenuDrawerItemDestacadoProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full mx-2 mb-2 flex items-center gap-3 p-3 bg-white hover:bg-linear-to-r ${hoverGradient} hover:to-transparent rounded-xl border-2 ${borderColor} group transition-all duration-200 hover:shadow-md active:scale-98`}
    >
      {/* Icono grande con gradiente */}
      <div
        className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 shadow-md`}
      >
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>

      {/* Texto */}
      <div className="flex-1 text-left">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">
          {sublabel}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" />
    </button>
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
      <div
        className={`${iconoImagen ? 'w-auto h-8' : 'w-8 h-8'} ${
          iconoImagen ? '' : bgColor
        } ${iconoImagen ? '' : 'rounded-lg'} flex items-center justify-center group-hover:scale-110 transition-transform duration-150 ${
          iconoImagen ? '' : 'shadow-sm'
        } shrink-0`}
      >
        {iconoImagen ? (
          <img
            src={iconoImagen}
            alt={typeof label === 'string' ? label : 'Icono'}
            className="w-full h-full object-contain"
          />
        ) : Icon ? (
          <Icon className={`w-4 h-4 ${iconColor}`} />
        ) : null}
      </div>

      {/* Label */}
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