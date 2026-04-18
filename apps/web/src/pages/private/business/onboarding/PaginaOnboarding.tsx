/**
 * PaginaOnboarding.tsx
 * =====================
 * Página principal del wizard de onboarding.
 * 
 * ¿Qué hace?
 * - Inicializa el onboarding al montar
 * - Renderiza el paso actual (1-8)
 * - Muestra modal de pausar
 * - Usa LayoutOnboarding como wrapper
 * 
 * Uso:
 *   <Route path="/business/onboarding" element={<PaginaOnboarding />} />
 * 
 * Ubicación: apps/web/src/pages/private/business/onboarding/PaginaOnboarding.tsx
 */

import { useEffect, useState, useRef } from 'react';
import {
  Home, MapPin, Phone, Clock,
  Image, CreditCard, Star, ShoppingCart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { notificar } from '@/utils/notificaciones';
import { Spinner } from '@/components/ui';
import { LayoutOnboarding, ModalPausar } from './componentes';
import { PasoCategoria, PasoUbicacion, PasoContacto, PasoHorarios, PasoImagenes, PasoMetodosPago, PasoPuntos, PasoProductos } from './pasos';

// =============================================================================
// CONFIGURACIÓN DE PASOS
// =============================================================================

const pasoInfo = [
  {
    titulo: 'Categorías',
    descripcion: 'Elige hasta 3 subcategorías que mejor representen tu negocio',
    icono: <Home className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" />,
  },
  {
    titulo: 'Ubicación de tu Negocio',
    descripcion: 'Ayúdanos a que tus clientes te encuentren fácilmente',
    icono: <MapPin className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" />,
  },
  {
    titulo: 'Información de Contacto',
    descripcion: 'Comparte cómo pueden contactarte',
    icono: <Phone className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" />,
  },
  {
    titulo: 'Horarios de Atención',
    descripcion: 'Define cuándo estás abierto al público',
    icono: <Clock className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" />,
  },
  {
    titulo: 'Imágenes de tu Negocio',
    descripcion: 'Muestra tu negocio con fotos atractivas',
    icono: <Image className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" />,
  },
  {
    titulo: 'Métodos de Pago',
    descripcion: 'Indica qué formas de pago aceptas',
    icono: <CreditCard className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" />,
  },
  {
    titulo: 'Sistema de Puntos',
    descripcion: 'Configura tu programa de lealtad',
    icono: <Star className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" />,
  },
  {
    titulo: 'Productos o Servicios',
    descripcion: 'Agrega al menos 3 productos/servicios (puedes agregar mas después)',
    icono: <ShoppingCart className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7" />,
  },
];

// =============================================================================
// COMPONENTE
// =============================================================================

export function PaginaOnboarding() {
  const navigate = useNavigate();
  const usuario = useAuthStore((s) => s.usuario);
  const esGerente = !!usuario?.sucursalAsignada;
  const bloqueoMostradoRef = useRef(false);

  // Blindaje: gerentes no pueden acceder al onboarding
  // Se usa ref para evitar toast duplicado por StrictMode o re-renders
  useEffect(() => {
    if (esGerente && !bloqueoMostradoRef.current) {
      bloqueoMostradoRef.current = true;
      notificar.error('Los gerentes no pueden crear negocios');
      navigate('/inicio', { replace: true });
    }
  }, [esGerente, navigate]);

  const pasoActual = useOnboardingStore(state => state.pasoActual);
  const inicializarOnboarding = useOnboardingStore(state => state.inicializarOnboarding);
  const [mostrarModalPausar, setMostrarModalPausar] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  // Inicializar onboarding al montar (solo si NO es gerente — evita ruido del store)
  useEffect(() => {
    if (esGerente) {
      // Gerente: no se inicializa el store porque ya se está redirigiendo fuera
      setInicializando(false);
      return;
    }

    let isMounted = true;

    const inicializar = async () => {
      try {
        await inicializarOnboarding();

        if (isMounted) {
          const { completado } = useOnboardingStore.getState();

          if (completado) {
            notificar.info('Tu negocio ya está registrado');
            setTimeout(() => navigate('/business-studio'), 1500);
            return;
          }
        }

      } catch (error) {
        console.error('Error al inicializar onboarding:', error);

        if (isMounted) {
          notificar.error('Error al cargar el onboarding');
          setTimeout(() => navigate('/business'), 2000);
        }
      } finally {
        if (isMounted) {
          setInicializando(false);
        }
      }
    };

    inicializar();

    return () => {
      isMounted = false;
    };
  }, [esGerente]);

  // Gerentes: no renderizar nada mientras se ejecuta la redirección
  // Evita el flash de "Cargando onboarding..." antes del navigate
  if (esGerente) {
    return null;
  }

  // Mostrar spinner mientras inicializa
  if (inicializando) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner tamanio="lg" />
          <p className="mt-4 text-sm text-slate-600">Cargando onboarding...</p>
        </div>
      </div>
    );
  }

  // Obtener info del paso actual
  const { titulo, descripcion, icono } = pasoInfo[pasoActual - 1];

  // Renderizar paso actual
  const renderPasoActual = () => {
    switch (pasoActual) {
      case 1: return <PasoCategoria />;
      case 2: return <PasoUbicacion />;
      case 3: return <PasoContacto />;
      case 4: return <PasoHorarios />;
      case 5: return <PasoImagenes />;
      case 6: return <PasoMetodosPago />;
      case 7: return <PasoPuntos />;
      case 8: return <PasoProductos />;
      default: return null;
    }
  };

  return (
    <>
      <LayoutOnboarding
        tituloPaso={titulo}
        descripcionPaso={descripcion}
        iconoPaso={icono}
        onPausar={() => setMostrarModalPausar(true)}
      >
        {renderPasoActual()}
      </LayoutOnboarding>

      <ModalPausar
        abierto={mostrarModalPausar}
        onCerrar={() => setMostrarModalPausar(false)}
      />
    </>
  );
}

export default PaginaOnboarding;