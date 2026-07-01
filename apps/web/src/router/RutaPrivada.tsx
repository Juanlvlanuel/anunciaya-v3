import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore, esModoDemo } from '../stores/useAuthStore';
import { useScanYAStore } from '../stores/useScanYAStore';
import { notificar } from '../utils/notificaciones';
import { esTokenExpirado } from '../utils/tokenUtils';
import { LogoAnimadoSaludo } from '../components/LogoAnimadoSaludo';

interface RutaPrivadaProps {
  children: React.ReactNode;
}

export function RutaPrivada({ children }: RutaPrivadaProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Detectar si es ruta de ScanYA
  const esScanYA = location.pathname.startsWith('/scanya');

  // Estados de autenticación según el tipo de ruta
  const usuarioAY = useAuthStore((state) => state.usuario);
  const accessTokenAY = useAuthStore((state) => state.accessToken);
  const cargandoAY = useAuthStore((state) => state.cargando);
  const hidratadoAY = useAuthStore((state) => state.hidratado);

  const usuarioSY = useScanYAStore((state) => state.usuario);
  const accessTokenSY = useScanYAStore((state) => state.accessToken);
  const cargandoSY = useScanYAStore((state) => state.cargando);
  const hidratadoSY = useScanYAStore((state) => state.hidratado);

  // Seleccionar estados según el tipo de ruta
  const usuario = esScanYA ? usuarioSY : usuarioAY;
  const accessToken = esScanYA ? accessTokenSY : accessTokenAY;
  const cargando = esScanYA ? cargandoSY : cargandoAY;
  const hidratado = esScanYA ? hidratadoSY : hidratadoAY;

  // Verificar tokens en el storage ACTIVO. El Demo de Business Studio corre embebido y guarda su
  // sesión en sessionStorage (no localStorage); si leyéramos localStorage aquí, veríamos "sin token",
  // concluiríamos "sesión expirada" y expulsaríamos el demo aunque sus tokens estén vivos.
  const enDemo = esModoDemo();
  const storageAuth = enDemo ? sessionStorage : localStorage;
  const prefijoStorage = esScanYA ? 'sy_' : 'ay_';
  const tokenEnStorage = storageAuth.getItem(`${prefijoStorage}access_token`);
  const refreshTokenEnStorage = storageAuth.getItem(`${prefijoStorage}refresh_token`);
  const isAuthenticated = (!!usuario && !!accessToken) || !!tokenEnStorage;


  // Verificar si los tokens están expirados
  const accessExpirado = esTokenExpirado(tokenEnStorage);
  const refreshExpirado = esTokenExpirado(refreshTokenEnStorage);
  const tokensExpirados = accessExpirado && refreshExpirado;

  // Si no está autenticado y ya terminó de cargar, redirigir
  useEffect(() => {
    const verificarYRedirigir = async () => {
      if (hidratado && !cargando) {
        // Demo embebido: la sesión se autoriza por el usuario en memoria (handoff), no por el storage.
        // Nunca expulsar ni redirigir dentro del iframe del demo (defensa en profundidad).
        if (esModoDemo()) return;
        // Si no está autenticado O ambos tokens expiraron
        if (!isAuthenticated || tokensExpirados) {
          // Si los tokens expiraron, mostrar modal primero y hacer logout
          if (tokensExpirados && isAuthenticated) {
            await notificar.sesionExpirada();
            
            if (esScanYA) {
              useScanYAStore.getState().logout('sesion_expirada');
            } else {
              useAuthStore.getState().logout('sesion_expirada');
            }
          }

          // Redirigir según el tipo de ruta
          if (esScanYA) {
            // Rutas ScanYA → Redirigir al login de ScanYA
            navigate('/scanya/login', { replace: true });
          } else {
            // Rutas AnunciaYA → Redirigir a landing
            // Solo guardar ruta pendiente si NO fue logout reciente.
            // IMPORTANTE: NO eliminar el flag aquí — este useEffect puede correr
            // varias veces por re-renders. El flag se elimina en loginExitoso,
            // cuando el usuario se autentica exitosamente.
            const fueLogoutReciente = sessionStorage.getItem('ay_logout_reciente');
            if (!fueLogoutReciente) {
              sessionStorage.setItem('ay_ruta_pendiente', location.pathname);
            }
            navigate('/', { replace: true });
          }
        }
      }
    };

    verificarYRedirigir();
  }, [hidratado, cargando, isAuthenticated, tokensExpirados, navigate, location.pathname, esScanYA]);

  // Mientras carga o hidrata, mostrar loading
  if (!hidratado || cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <LogoAnimadoSaludo size={150} />
          <span className="texto-shimmer text-base font-bold tracking-wide">Verificando sesión…</span>
        </div>
      </div>
    );
  }

  // Si no está autenticado, no mostrar nada (ya redirigimos)
  if (!isAuthenticated) {
    return null;
  }

  // Si está autenticado, mostrar el contenido
  return <>{children}</>;
}

export default RutaPrivada;