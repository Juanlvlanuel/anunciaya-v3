/**
 * router/index.tsx
 * =================
 * Definición de todas las rutas de la aplicación.
 *
 * Estructura:
 * - Rutas públicas sin guard: Landing (/), Registro Éxito
 * - Rutas públicas con guard: Registro (redirige si ya logueado)
 * - Rutas privadas: Envueltas en MainLayout con RutaPrivada
 *
 * NOTA: Login, 2FA y recuperación de contraseña se manejan con modales,
 * no tienen rutas dedicadas.
 *
 * Ubicación: apps/web/src/router/index.tsx
 */

import { createBrowserRouter, Navigate, RouterProvider, useParams } from 'react-router-dom';
import { RutaPrivada } from './RutaPrivada';
import { ModoGuard, MatrizGuard } from './guards';
import { ModoPersonalEstrictoGuard } from './guards/ModoPersonalEstrictoGuard';
import { RutaPublica } from './RutaPublica';
import { RootLayout } from './RootLayout';

// Layout principal para rutas privadas
import { MainLayout } from '../components/layout';

// Páginas públicas
import PaginaLanding from '../pages/public/PaginaLanding';
import PaginaRegistro from '../pages/public/PaginaRegistro';
import PaginaRegistroExito from '../pages/public/PaginaRegistroExito';
import PaginaArticuloPublico from '../pages/public/PaginaArticuloPublico';
import PaginaOfertaPublico from '../pages/public/PaginaOfertaPublico';
import PaginaArticuloMarketplacePublico from '../pages/public/PaginaArticuloMarketplacePublico';

// Páginas privadas
import PaginaInicio from '../pages/private/PaginaInicio';
// TEMPORAL — galería de íconos. Mantener mientras se itera. BORRAR cuando todo esté final.
import TestIconos from '../pages/private/TestIconos';
// TEMPORAL — comparación de diseños para ModalInactividad. BORRAR cuando se elija.
import TestModalSesion from '../pages/private/TestModalSesion';

// Páginas de usuario (nuevas - Fase 4)
import PaginaGuardados from '../pages/private/guardados/PaginaGuardados';
import PaginaMisPublicaciones from '../pages/private/publicaciones/PaginaMisPublicaciones';
import { PaginaNegocios, PaginaPerfilNegocio } from '../pages/private/negocios';
// ⭐ NUEVO: CardYA (Fase X)
import PaginaCardYA from '../pages/private/cardya/PaginaCardYA';
import PaginaMisCupones from '../pages/private/cupones/PaginaMisCupones';

// ⭐ NUEVO: Onboarding de negocio (Fase 5)
import PaginaOnboarding from '../pages/private/business/onboarding/PaginaOnboarding';

// ⭐ NUEVO: Upgrade a comercial (crear negocio)
import PaginaCrearNegocio from '../pages/private/PaginaCrearNegocio';
import PaginaCrearNegocioExito from '../pages/private/PaginaCrearNegocioExito';

// Páginas de Business Studio (Fase 5.4)
import PaginaDashboard from '../pages/private/business-studio/dashboard/PaginaDashboard';
import PaginaPerfil from '../pages/private/business-studio/perfil/PaginaPerfil';
import PaginaCatalogo from '../pages/private/business-studio/catalogo/PaginaCatalogo';
import BSPaginaOfertas from '../pages/private/business-studio/ofertas/PaginaOfertas';
import PaginaOfertas from '../pages/private/ofertas/PaginaOfertas';
import PaginaPuntos from '../pages/private/business-studio/puntos/PaginaPuntos';
import PaginaTransacciones from '../pages/private/business-studio/transacciones/PaginaTransacciones';
import PaginaClientes from '../pages/private/business-studio/clientes/PaginaClientes';
import PaginaOpiniones from '../pages/private/business-studio/opiniones/PaginaOpiniones';


// ⭐ NUEVO: ScanYA Login (Fase 8)
import PaginaLoginScanYA from '../pages/private/scanya/PaginaLoginScanYA';
import PaginaScanYA from '../pages/private/scanya/PaginaScanYA';

// =============================================================================
// PÁGINAS PLACEHOLDER (se crearán después)
// =============================================================================

const PlaceholderPage = ({ nombre }: { nombre: string }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{nombre}</h1>
      <p className="text-gray-500">Página en construcción</p>
    </div>
  </div>
);

// Páginas de secciones principales
import PaginaMarketplace from '../pages/private/marketplace/PaginaMarketplace';
import PaginaArticuloMarketplace from '../pages/private/marketplace/PaginaArticuloMarketplace';
import PaginaPublicarArticulo from '../pages/private/marketplace/PaginaPublicarArticulo';
import PaginaPerfilVendedor from '../pages/private/marketplace/PaginaPerfilVendedor';
const PaginaServicios = () => <PlaceholderPage nombre="🛠️ Servicios" />;

// Páginas de usuario

// Páginas de cuenta comercial
const PaginaConfigurarNegocio = () => <PlaceholderPage nombre="🏪 Configurar Negocio" />;

// Páginas de Business Studio (ordenadas según menú)
import BSPaginaAlertas from '../pages/private/business-studio/alertas/PaginaAlertas';
import BSPaginaEmpleados from '../pages/private/business-studio/empleados/PaginaEmpleados';
const BSPaginaVacantes = () => <PlaceholderPage nombre="💼 Vacantes" />;
import BSPaginaReportes from '../pages/private/business-studio/reportes/PaginaReportes';
import BSPaginaSucursales from '../pages/private/business-studio/sucursales/PaginaSucursales';

// Página 404
const NoEncontrada = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-4">Página no encontrada</p>
      <a href="/" className="text-blue-500 hover:underline">
        Volver al inicio
      </a>
    </div>
  </div>
);

// =============================================================================
// REDIRECTS (compatibilidad con URLs antiguas)
// =============================================================================

/**
 * /marketplace/vendedor/:usuarioId  →  /marketplace/usuario/:usuarioId
 *
 * La P3 se renombró a "Perfil de Usuario" (neutral para vendedor y comprador).
 * Mantenemos la URL antigua activa con redirect para no romper enlaces ya
 * compartidos/copiados.
 */
function RedirectVendedorAUsuario() {
  const { usuarioId } = useParams<{ usuarioId: string }>();
  return <Navigate to={`/marketplace/usuario/${usuarioId}`} replace />;
}

// =============================================================================
// DEFINICIÓN DE RUTAS
// =============================================================================

const router = createBrowserRouter([
  {
    // Layout raíz que contiene el ModalLogin
    element: <RootLayout />,
    children: [
      // -----------------------------------------------------------------------
      // RUTAS PÚBLICAS (sin guard, sin MainLayout)
      // -----------------------------------------------------------------------
      {
        path: '/',
        element: <PaginaLanding />,
      },
      {
        path: '/registro',
        element: (
          <RutaPublica>
            <PaginaRegistro />
          </RutaPublica>
        ),
      },
      {
        path: '/registro-exito',
        element: <PaginaRegistroExito />,
      },

      // -----------------------------------------------------------------------
      // RUTAS PÚBLICAS PARA COMPARTIR (sin auth, sin MainLayout)
      // -----------------------------------------------------------------------
      {
        path: '/p/negocio/:sucursalId',
        element: <PaginaPerfilNegocio />,
      },
      {
        path: '/p/articulo/:articuloId',
        element: <PaginaArticuloPublico />,
      },
      {
        path: '/p/oferta/:ofertaId',
        element: <PaginaOfertaPublico />,
      },
      {
        path: '/p/articulo-marketplace/:articuloId',
        element: <PaginaArticuloMarketplacePublico />,
      },

      // -----------------------------------------------------------------------
      // ⭐ NUEVO: ONBOARDING (ruta privada SIN MainLayout)
      // Tiene su propio layout completo, no necesita navbar/sidebar
      // -----------------------------------------------------------------------
      {
        path: '/business/onboarding',
        element: (
          <RutaPrivada>
            <PaginaOnboarding />
          </RutaPrivada>
        ),
      },

      // -----------------------------------------------------------------------
      // ⭐ NUEVO: CREAR NEGOCIO ÉXITO (SIN MainLayout)
      // Página de éxito post-pago con opciones
      // -----------------------------------------------------------------------
      {
        path: '/crear-negocio-exito',
        element: (
          <RutaPrivada>
            <PaginaCrearNegocioExito />
          </RutaPrivada>
        ),
      },

      // -----------------------------------------------------------------------
      // ⭐ NUEVO: SCANYA LOGIN (ruta pública SIN MainLayout)
      // PWA de punto de venta - Login independiente de AnunciaYA
      // -----------------------------------------------------------------------
      {
        path: '/scanya/login',
        element: (
          <RutaPublica>
            <PaginaLoginScanYA />
          </RutaPublica>
        ),
      },

      // -----------------------------------------------------------------------
      // ⭐ NUEVO: SCANYA DASHBOARD (ruta privada SIN MainLayout)
      // PWA de punto de venta - Tiene su propio layout (HeaderScanYA)
      // -----------------------------------------------------------------------
      {
        path: '/scanya',
        element: (
          <RutaPrivada>
            <PaginaScanYA />
          </RutaPrivada>
        ),
      },

      // -----------------------------------------------------------------------
      // RUTAS PRIVADAS (con MainLayout)
      // -----------------------------------------------------------------------
      {
        element: (
          <RutaPrivada>
            <MainLayout />
          </RutaPrivada>
        ),
        children: [
          // Página principal (Hub)
          {
            path: '/inicio',
            element: <PaginaInicio />,
          },

          // Secciones principales (4 pilares)
          {
            path: '/negocios',
            children: [
              {
                index: true,
                element: <PaginaNegocios />,
              },
              {
                path: ':sucursalId',
                element: <PaginaPerfilNegocio />,
              },
            ],
          },
          {
            path: '/marketplace',
            element: (
              <ModoPersonalEstrictoGuard>
                <PaginaMarketplace />
              </ModoPersonalEstrictoGuard>
            ),
          },
          {
            path: '/marketplace/articulo/:articuloId',
            element: (
              <ModoPersonalEstrictoGuard>
                <PaginaArticuloMarketplace />
              </ModoPersonalEstrictoGuard>
            ),
          },
          {
            path: '/marketplace/publicar',
            element: (
              <ModoPersonalEstrictoGuard>
                <PaginaPublicarArticulo />
              </ModoPersonalEstrictoGuard>
            ),
          },
          {
            path: '/marketplace/publicar/:articuloId',
            element: (
              <ModoPersonalEstrictoGuard>
                <PaginaPublicarArticulo />
              </ModoPersonalEstrictoGuard>
            ),
          },
          {
            path: '/marketplace/usuario/:usuarioId',
            element: (
              <ModoPersonalEstrictoGuard>
                <PaginaPerfilVendedor />
              </ModoPersonalEstrictoGuard>
            ),
          },
          {
            // Compatibilidad con enlaces existentes a la URL antigua.
            // Ruta canónica nueva: /marketplace/usuario/:usuarioId.
            path: '/marketplace/vendedor/:usuarioId',
            element: <RedirectVendedorAUsuario />,
          },
          {
            path: '/ofertas',
            element: <PaginaOfertas />,
          },

          // Servicios (sección unificada — visión v3, absorbe Empleos)
          {
            path: '/servicios',
            element: <PaginaServicios />,
          },

          // ⭐ UPGRADE: Crear negocio (personal → comercial)
          {
            path: '/crear-negocio',
            element: <PaginaCrearNegocio />,
          },

          // Páginas de usuario
          {
            path: '/perfil',
            element: <PaginaPerfil />,
          },
          {
            path: '/guardados',
            element: <PaginaGuardados />,
          },
          // TEMPORAL — galería de íconos. BORRAR cuando se complete la iteración.
          {
            path: '/test-iconos',
            element: <TestIconos />,
          },
          // TEMPORAL — comparación de diseños para ModalInactividad. BORRAR cuando se elija.
          {
            path: '/test-modal-sesion',
            element: <TestModalSesion />,
          },
          {
            path: '/mis-publicaciones',
            element: (
              <ModoGuard requiereModo="personal">
                <PaginaMisPublicaciones />
              </ModoGuard>
            ),
          },
          {
            path: '/cardya',
            element: (
              <ModoGuard requiereModo="personal">
                <PaginaCardYA />
              </ModoGuard>
            ),
          },

          // Mis Cupones
          {
            path: '/mis-cupones',
            element: (
              <ModoGuard requiereModo="personal">
                <PaginaMisCupones />
              </ModoGuard>
            ),
          },

          // Cuenta comercial (requieren modo Comercial)
          {
            path: '/business-studio',
            element: (
              <ModoGuard requiereModo="comercial">
                <PaginaDashboard />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/transacciones',
            element: (
              <ModoGuard requiereModo="comercial">
                <PaginaTransacciones />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/clientes',
            element: (
              <ModoGuard requiereModo="comercial">
                <PaginaClientes />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/opiniones',
            element: (
              <ModoGuard requiereModo="comercial">
                <PaginaOpiniones />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/alertas',
            element: (
              <ModoGuard requiereModo="comercial">
                <BSPaginaAlertas />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/catalogo',
            element: (
              <ModoGuard requiereModo="comercial">
                <PaginaCatalogo />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/ofertas',
            element: (
              <ModoGuard requiereModo="comercial">
                <BSPaginaOfertas />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/puntos',
            element: (
              <ModoGuard requiereModo="comercial">
                <MatrizGuard>
                  <PaginaPuntos />
                </MatrizGuard>
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/empleados',
            element: (
              <ModoGuard requiereModo="comercial">
                <BSPaginaEmpleados />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/vacantes',
            element: (
              <ModoGuard requiereModo="comercial">
                <BSPaginaVacantes />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/reportes',
            element: (
              <ModoGuard requiereModo="comercial">
                <BSPaginaReportes />
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/sucursales',
            element: (
              <ModoGuard requiereModo="comercial">
                <MatrizGuard>
                  <BSPaginaSucursales />
                </MatrizGuard>
              </ModoGuard>
            ),
          },
          {
            path: '/business-studio/perfil',
            element: (
              <ModoGuard requiereModo="comercial">
                <PaginaPerfil />
              </ModoGuard>
            ),
          },
          {
            path: '/negocio/configurar',
            element: (
              <ModoGuard requiereModo="comercial">
                <PaginaConfigurarNegocio />
              </ModoGuard>
            ),
          },
        ],
      },

      // -----------------------------------------------------------------------
      // RUTA 404 - Cualquier ruta no definida
      // -----------------------------------------------------------------------
      {
        path: '*',
        element: <NoEncontrada />,
      },
    ],
  },
]);

// =============================================================================
// COMPONENTE ROUTER
// =============================================================================

/**
 * Componente principal del router
 * Se usa en App.tsx: <AppRouter />
 */
export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;