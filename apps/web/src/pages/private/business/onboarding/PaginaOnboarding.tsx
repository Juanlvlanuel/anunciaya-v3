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

import { useEffect, useState } from 'react';
import {
  Home, MapPin, Phone, Clock,
  Image, CreditCard, Star, ShoppingCart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
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
  const pasoActual = useOnboardingStore(state => state.pasoActual);
  const inicializarOnboarding = useOnboardingStore(state => state.inicializarOnboarding);
  const [mostrarModalPausar, setMostrarModalPausar] = useState(false);
  const [inicializando, setInicializando] = useState(true);

  // Inicializar onboarding al montar
  useEffect(() => {
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
  }, []);

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

  // Renderizar contenido del paso
  const renderPasoActual = () => {
    switch (pasoActual) {
      case 1:
        return <PasoCategoria />;
      case 2:
        return <PasoUbicacion />;
      case 3:
        return <PasoContacto />;
      case 4:
        return <PasoHorarios />;
      case 5:
        return <PasoImagenes />;
      case 6:
        return <PasoMetodosPago />;
      case 7:
        return <PasoPuntos />;
      case 8:
        return <PasoProductos />;
      default:
        return (
          <div className="border-2 border-dashed border-slate-200 rounded-xl lg:rounded-2xl p-8 lg:p-10 2xl:p-12 text-center bg-slate-50/50">
            <div className="w-16 h-16 lg:w-18 lg:h-18 2xl:w-20 2xl:h-20 mx-auto mb-3 lg:mb-4 rounded-xl lg:rounded-2xl bg-white shadow-sm flex items-center justify-center">
              <svg
                className="w-8 h-8 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 text-slate-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="text-sm lg:text-base 2xl:text-lg text-slate-600 font-medium mb-2">
              Paso {pasoActual} - Contenido pendiente
            </p>
            <p className="text-xs lg:text-sm text-slate-500">
              Aquí irá el formulario de "{titulo}"
            </p>
          </div>
        );
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