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
import PaginaPublicacionNegocioPublica from '../pages/public/PaginaPublicacionNegocioPublica';
import PaginaServicioPublico from '../pages/public/PaginaServicioPublico';
import PaginaTutorialPublico from '../pages/public/PaginaTutorialPublico';
import PaginaDemoEntrada from '../pages/public/PaginaDemoEntrada';
import PaginaTerminos from '../pages/public/PaginaTerminos';
import PaginaAvisoPrivacidad from '../pages/public/PaginaAvisoPrivacidad';

// Páginas privadas
import PaginaInicio from '../pages/private/PaginaInicio';
// TEMPORAL — galería de íconos. Mantener mientras se itera. BORRAR cuando todo esté final.
import TestIconos from '../pages/private/TestIconos';
// TEMPORAL — comparación de diseños para ModalInactividad. BORRAR cuando se elija.
import TestModalSesion from '../pages/private/TestModalSesion';

// Páginas de usuario (nuevas - Fase 4)
import PaginaGuardados from '../pages/private/guardados/PaginaGuardados';
import PaginaMisPublicaciones from '../pages/private/publicaciones/PaginaMisPublicaciones';
import { PaginaNegocios, PaginaPerfilNegocio, PaginaPublicacionNegocio } from '../pages/private/negocios';
// ⭐ NUEVO: CardYA (Fase X)
import PaginaCardYA from '../pages/private/cardya/PaginaCardYA';
import PaginaMisCupones from '../pages/private/cupones/PaginaMisCupones';
import PaginaCentroAyuda from '../pages/private/ayuda/PaginaCentroAyuda';

// ⭐ NUEVO: Onboarding de negocio (Fase 5)
import PaginaOnboarding from '../pages/private/business/onboarding/PaginaOnboarding';

// ⭐ NUEVO: Upgrade a comercial (crear negocio)
import PaginaCrearNegocio from '../pages/private/PaginaCrearNegocio';
import PaginaCrearNegocioExito from '../pages/private/PaginaCrearNegocioExito';

// ⭐ NUEVO: Publicidad — compra de espacio en carruseles (página dedicada, sin MainLayout)
import PaginaAnunciate from '../pages/private/publicidad/PaginaAnunciate';

// Páginas de Business Studio (Fase 5.4)
import PaginaDashboard from '../pages/private/business-studio/dashboard/PaginaDashboard';
import PaginaPerfil from '../pages/private/business-studio/perfil/PaginaPerfil';
import PaginaPerfilPersonal from '../pages/private/perfil/PaginaPerfilPersonal';
import PaginaMockupMenu from '../pages/private/dev/PaginaMockupMenu';
import PaginaCatalogo from '../pages/private/business-studio/catalogo/PaginaCatalogo';
import BSPaginaPublicaciones from '../pages/private/business-studio/publicaciones/PaginaPublicaciones';
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
import PaginaPerfilVendedor from '../pages/private/marketplace/PaginaPerfilVendedor';
import PaginaServicios from '../pages/private/servicios/PaginaServicios';
import PaginaServicio from '../pages/private/servicios/PaginaServicio';
import PaginaPerfilPrestador from '../pages/private/servicios/PaginaPerfilPrestador';

// Páginas de usuario

// Páginas de cuenta comercial
const PaginaConfigurarNegocio = () => <PlaceholderPage nombre="🏪 Configurar Negocio" />;

// Páginas de Business Studio (ordenadas según menú)
import BSPaginaAlertas from '../pages/private/business-studio/alertas/PaginaAlertas';
import BSPaginaEmpleados from '../pages/private/business-studio/empleados/PaginaEmpleados';
import BSPaginaVacantes from '../pages/private/business-studio/vacantes/PaginaVacantes';
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

/**
 * Redirige el viejo URL del wizard de edición
 * `/marketplace/publicar/:articuloId` al composer inline activado con
 * `?editar=<id>`. Sirve para no romper enlaces guardados o cualquier
 * `navigate(...)` viejo que sobreviva en componentes externos.
 */
function RedirigirEditarArticulo() {
  const { articuloId } = useParams<{ articuloId: string }>();
  return (
    <Navigate
      to={articuloId ? `/marketplace?editar=${articuloId}` : '/marketplace'}
      replace
    />
  );
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
      // Páginas legales (públicas, enlazadas desde el registro y el footer)
      {
        path: '/terminos',
        element: <PaginaTerminos />,
      },
      {
        path: '/privacidad',
        element: <PaginaAvisoPrivacidad />,
      },
      // Entrada al Demo de Business Studio (embebida en el Panel). Canjea el ?handoff y entra a BS.
      {
        path: '/business-studio/demo-entrada',
        element: <PaginaDemoEntrada />,
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
      {
        path: '/p/negocio-post/:publicacionId',
        element: <PaginaPublicacionNegocioPublica />,
      },
      {
        path: '/p/servicio/:publicacionId',
        element: <PaginaServicioPublico />,
      },
      {
        path: '/p/tutorial/:slug',
        element: <PaginaTutorialPublico />,
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

          // Anúnciate — compra de publicidad (usa el header/layout del inicio)
          {
            path: '/anunciate',
            element: <PaginaAnunciate />,
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
                path: 'publicacion/:publicacionId',
                element: <PaginaPublicacionNegocio />,
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
            // Rutas `/marketplace/publicar` y `/marketplace/publicar/:articuloId`
            // ELIMINADAS en el rediseño Sprint 9. El composer ahora vive inline
            // en `/marketplace` (orquestador <ComposerSection> activado por
            // `?crear=1` o `?editar=<id>`). Si llegaste aquí desde un link
            // viejo, redirige al feed con el composer expandido.
            path: '/marketplace/publicar',
            element: <Navigate to="/marketplace?crear=1" replace />,
          },
          {
            path: '/marketplace/publicar/:articuloId',
            element: <RedirigirEditarArticulo />,
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
          // Sprint 2: feed visible en AMBOS modos (Personal + Comercial). El
          // comerciante puede explorar y contratar servicios igual que un
          // usuario personal — solo no puede publicar desde aquí (eso vive en
          // BS Vacantes para el modo Comercial).
          // Sprint 9 (20-May-2026): se eliminaron las rutas `/servicios/publicar`
          // y `/servicios/publicar/:id` cuando el wizard fue reemplazado por
          // el composer inline (`<ComposerSection>` dentro de `<PaginaServicios>`).
          // Triggers externos (Mis Publicaciones, FAB) redirigen a /servicios
          // con `?crear=ofrezco|solicito` o `?editar=<id>`.
          {
            path: '/servicios',
            element: <PaginaServicios />,
          },
          // Sprint 5: Perfil del prestador. Ruta específica antes de
          // `/servicios/:id`. Visible en AMBOS modos.
          {
            path: '/servicios/usuario/:usuarioId',
            element: <PaginaPerfilPrestador />,
          },
          // Sprint 3: detalle de una publicación de Servicios.
          // Visible en AMBOS modos.
          {
            path: '/servicios/:id',
            element: <PaginaServicio />,
          },

          // ⭐ UPGRADE: Crear negocio (personal → comercial)
          {
            path: '/crear-negocio',
            element: <PaginaCrearNegocio />,
          },

          // Páginas de usuario
          {
            path: '/perfil',
            element: <PaginaPerfilPersonal />,
          },
          // Página de prueba/mockup (solo para revisar visualmente cambios de UI)
          {
            path: '/dev/menu-mockup',
            element: <PaginaMockupMenu />,
          },
          {
            path: '/guardados',
            element: <PaginaGuardados />,
          },
          {
            path: '/ayuda',
            element: <PaginaCentroAyuda />,
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
            path: '/business-studio/publicaciones',
            element: (
              <ModoGuard requiereModo="comercial">
                <BSPaginaPublicaciones />
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