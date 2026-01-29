/**
 * PaginaLoginScanYA.tsx
 * ======================
 * Página de login para ScanYA (PWA de punto de venta).
 *
 * Características:
 * - Splash screen inicial con animación zoom in
 * - Toggle entre Dueño/Gerente y Empleado
 * - Dos formularios diferentes:
 *   - Dueño/Gerente: Email + Password
 *   - Empleado: Nick + PIN (teclado numérico)
 * - Diseño oscuro profesional
 * - Responsive (móvil, tablet, desktop)
 *
 * Ubicación: apps/web/src/pages/private/scanya/PaginaLoginScanYA.tsx
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserCircle, Briefcase, Download } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Boton } from '../../../components/ui/Boton';
import { SplashScreenScanYA } from '../../../components/scanya/SplashScreenScanYA';
import { TecladoNumerico } from '../../../components/scanya/TecladoNumerico';
import { notificar } from '../../../utils/notificaciones';
import { useScanYAStore } from '../../../stores/useScanYAStore';
import { usePWAInstallScanYA } from '../../../hooks/usePWAInstallScanYA';
import scanyaService from '../../../services/scanyaService';
import type { UsuarioScanYA } from '../../../types/scanya';

// =============================================================================
// TIPOS
// =============================================================================

type ModoLogin = 'dueno' | 'empleado';

// =============================================================================
// CONSTANTES
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =============================================================================
// COMPONENTE
// =============================================================================

export function PaginaLoginScanYA() {
  const navigate = useNavigate();
  const loginExitoso = useScanYAStore((state) => state.loginExitoso);
  const emailRecordado = useScanYAStore((state) => state.emailRecordado);
  const setEmailRecordado = useScanYAStore((state) => state.setEmailRecordado);

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [mostrarSplash, setMostrarSplash] = useState(true);
  const [modo, setModo] = useState<ModoLogin>('dueno');
  const [cargando, setCargando] = useState(false);

  // Estado formulario dueño/gerente
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(false);

  // Estado formulario empleado
  const [nick, setNick] = useState('');
  const [tecladoListo, setTecladoListo] = useState(true);

  // PWA - Usando el hook centralizado
  const { puedeInstalar, estadoInstalacion, esStandalone, instalando, instalar } = usePWAInstallScanYA();

  // Referencias
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const tecladoRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Validaciones
  // ---------------------------------------------------------------------------
  const emailValido = EMAIL_REGEX.test(email);
  const passwordValido = password.length > 0;
  const nickValido = nick.trim().length > 0;

  const formularioDuenoValido = emailValido && passwordValido;

  // ---------------------------------------------------------------------------
  // Efecto: Pre-llenar email si está recordado
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (emailRecordado) {
      setEmail(emailRecordado);
      setRecordar(true);
    }
  }, []); // Solo al montar el componente

  // ---------------------------------------------------------------------------
  // Efecto: Ocultar scrollbar del HTML
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Solo bloquear scroll en pantallas grandes (lg: 1024px+)
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const aplicarOverflow = () => {
      if (mediaQuery.matches) {
        document.documentElement.style.overflow = 'hidden';
      } else {
        document.documentElement.style.overflow = '';
      }
    };

    // Aplicar inicialmente
    aplicarOverflow();

    // Escuchar cambios de tamaño
    mediaQuery.addEventListener('change', aplicarOverflow);

    return () => {
      document.documentElement.style.overflow = '';
      mediaQuery.removeEventListener('change', aplicarOverflow);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Handler: Instalar PWA (usando el hook)
  // ---------------------------------------------------------------------------
  const handleInstalarPWA = async () => {
    // Si puede instalar, hacerlo directamente
    if (puedeInstalar) {
      const exito = await instalar();
      if (exito) {
        notificar.exito('ScanYA instalado correctamente');
      }
      return;
    }
    
    // No puede instalar - mostrar mensaje según estado
    if (estadoInstalacion === 'instalada') {
      notificar.info('ScanYA ya está instalada');
    } else if (estadoInstalacion === 'intento') {
      notificar.info('Recarga la página para intentar de nuevo');
    } else {
      notificar.info('Instalación no disponible en este navegador');
    }
  };

  // ---------------------------------------------------------------------------
  // Handler: Completar splash
  // ---------------------------------------------------------------------------
  const handleSplashComplete = useCallback(() => {
    setMostrarSplash(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Handler: Login dueño/gerente
  // ---------------------------------------------------------------------------
  const handleLoginDueno = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formularioDuenoValido || cargando) return;

      setCargando(true);

      try {
        const response = await scanyaService.loginDueno({
          correo: email.trim(),
          contrasena: password,
        });


        if (!response || !response.success) {
          console.error('❌ Respuesta no exitosa:', response);
          notificar.error(response?.message || 'Error al iniciar sesión');
          setCargando(false);
          return;
        }

        if (!response.data) {
          console.error('❌ No hay data en la respuesta:', response);
          notificar.error('Respuesta inválida del servidor');
          setCargando(false);
          return;
        }


        // El backend devuelve todo mezclado en data, no { usuario, tokens }
        const { accessToken, refreshToken, ...usuarioData } = response.data;

        if (!accessToken || !refreshToken) {
          console.error('❌ Faltan tokens:', {
            tieneAccessToken: !!accessToken,
            tieneRefreshToken: !!refreshToken,
          });
          notificar.error('Tokens faltantes del servidor');
          setCargando(false);
          return;
        }

        // Guardar email en el store si "recordar"
        if (recordar) {
          setEmailRecordado(email.trim());
        } else {
          setEmailRecordado(null);
        }

        // Login exitoso en el store
        await loginExitoso(usuarioData as UsuarioScanYA, accessToken, refreshToken);

        notificar.exito('Bienvenido a ScanYA');

        // Redirigir al dashboard
        navigate('/scanya');
      } catch (error: unknown) {
        console.error('❌ Error en login dueño:', error);

        // Extraer mensaje del backend si existe
        let mensaje = 'Error al iniciar sesión';
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { message?: string } } };
          if (axiosError.response?.data?.message) {
            mensaje = axiosError.response.data.message;
          }
        }

        notificar.error(mensaje);
      } finally {
        setCargando(false);
      }
    },
    [email, password, recordar, formularioDuenoValido, cargando, loginExitoso, setEmailRecordado, navigate]
  );

  // ---------------------------------------------------------------------------
  // Handler: Login empleado
  // ---------------------------------------------------------------------------
  const handleLoginEmpleado = useCallback(
    async (pin: string) => {
      // Validar que haya nick antes de intentar login
      if (!nickValido) {
        notificar.error('Ingresa tu nick de usuario');
        return;
      }

      if (cargando) return;

      setCargando(true);

      try {
        const response = await scanyaService.loginEmpleado({
          nick: nick.trim().toLowerCase(),
          pin,
        });

        if (!response || !response.success) {
          notificar.error(response?.message || 'Nick o PIN incorrectos');
          setCargando(false);
          return;
        }

        if (!response.data) {
          notificar.error('Respuesta inválida del servidor');
          setCargando(false);
          return;
        }

        // El backend devuelve todo mezclado en data
        const { accessToken, refreshToken, ...usuarioData } = response.data;

        if (!accessToken || !refreshToken) {
          notificar.error('Tokens faltantes del servidor');
          setCargando(false);
          return;
        }

        // Login exitoso en el store
        await loginExitoso(usuarioData as UsuarioScanYA, accessToken, refreshToken);

        notificar.exito(`Bienvenido ${usuarioData.nombreUsuario}`);

        // Redirigir al dashboard
        navigate('/scanya');
      } catch (error: unknown) {
        console.error('❌ Error en login empleado:', error);

        // Extraer mensaje del backend si existe
        let mensaje = 'Nick o PIN incorrectos';
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { message?: string } } };
          if (axiosError.response?.data?.message) {
            mensaje = axiosError.response.data.message;
          }
        }

        notificar.error(mensaje);
      } finally {
        setCargando(false);
      }
    },
    [nick, nickValido, cargando, loginExitoso, navigate]
  );

  // ---------------------------------------------------------------------------
  // Handler: Cambiar modo
  // ---------------------------------------------------------------------------
  const handleCambiarModo = (nuevoModo: ModoLogin) => {
    if (cargando) return;
    setModo(nuevoModo);
    // Resetear estado del teclado al cambiar de modo (ahora activado por defecto)
    setTecladoListo(true);
  };

  // ---------------------------------------------------------------------------
  // Handler: Enter en input de Email (enfocar contraseña)
  // ---------------------------------------------------------------------------
  const handleEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailValido) {
      e.preventDefault();
      passwordInputRef.current?.focus();
    }
  };

  // ---------------------------------------------------------------------------
  // Handler: Enter en input de Nick (activar teclado)
  // ---------------------------------------------------------------------------
  const handleNickKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && nickValido) {
      e.preventDefault();
      setTecladoListo(true);
      // Hacer focus en el teclado para poder continuar tecleando
      setTimeout(() => {
        tecladoRef.current?.focus();
      }, 100);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: Splash screen
  // ---------------------------------------------------------------------------
  if (mostrarSplash) {
    return <SplashScreenScanYA onComplete={handleSplashComplete} />;
  }

  // ---------------------------------------------------------------------------
  // Render: Login
  // ---------------------------------------------------------------------------
  return (
    <div className="h-screen flex items-start justify-center p-4 lg:p-3 2xl:p-6 pt-6 lg:pt-4 2xl:pt-0 overflow-x-hidden overflow-y-auto lg:overflow-hidden relative">
      {/* Fondo Gradient Flow */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #001d3d 50%, #000000 100%)'
        }}
      >
        {/* Esferas de gradiente flotantes */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4), transparent)',
            filter: 'blur(80px)',
            top: '-100px',
            left: '-100px',
            animation: 'float-orb-1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(30, 58, 138, 0.4), transparent)',
            filter: 'blur(80px)',
            bottom: '-50px',
            right: '-50px',
            animation: 'float-orb-2 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[250px] h-[250px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.3), transparent)',
            filter: 'blur(80px)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'float-orb-3 20s ease-in-out infinite',
          }}
        />

        {/* Partículas flotantes */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[7px] h-[7px] bg-[#3B82F6] rounded-full opacity-60"
              style={{
                left: `${10 + i * 12}%`,
                animation: `particle-rise 15s linear infinite`,
                animationDelay: `${i * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Contenido principal */}
      <div className={`w-full max-w-[350px] lg:max-w-[330px] 2xl:max-w-md relative z-10 my-auto ${modo === 'empleado' ? 'mt-6 lg:-mt-8 2xl:-mt-10' : 'mt-28 lg:mt-4 2xl:mt-12'}`}>
        {/* Header - Solo logo */}
        <div className={`text-center ${modo === 'empleado' ? '-mb-1 lg:-mb-8 2xl:-mb-20' : '-mb-1 lg:-mb-8 2xl:-mb-20'}`}>
          <div className="w-60 h-30 lg:w-48 lg:h-48 2xl:w-70 2xl:h-88 mx-auto">
            <img
              src="/logo-scanya.webp"
              alt="ScanYA"
              className="w-full h-full object-contain select-none transition-transform duration-300 hover:scale-110 cursor-pointer"
              draggable={false}
            />
          </div>
        </div>

        {/* Card principal con efecto Gradient Flow */}
        <div
          className={`rounded-2xl lg:rounded-3xl border transition-all duration-300 ${modo === 'empleado' ? 'p-4 lg:p-5 2xl:p-6' : 'p-5 lg:p-5 2xl:p-8'}`}
          style={{
            background: 'rgba(8, 22, 48, 0.9)',
            borderColor: 'rgba(59, 130, 246, 0.2)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.15), inset 0 0 20px rgba(59, 130, 246, 0.05)',
          }}
        >
          {/* Toggle con mejor integración */}
          <div className={`flex gap-2 lg:gap-1.5 2xl:gap-2 p-1 rounded-xl ${modo === 'empleado' ? 'mb-4 lg:mb-2.5 2xl:mb-5' : 'mb-6 lg:mb-4 2xl:mb-8'}`} style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
            <button
              type="button"
              onClick={() => handleCambiarModo('dueno')}
              disabled={cargando}
              className={`
                flex-1 py-2.5 lg:py-1.5 2xl:py-3 px-4 lg:px-3 2xl:px-4 rounded-lg lg:rounded-xl 2xl:rounded-xl
                font-semibold text-sm lg:text-xs 2xl:text-base
                transition-all duration-200 flex items-center justify-center gap-2
                ${modo === 'dueno'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#A0A0A0] hover:text-white'
                }
                ${cargando ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <UserCircle className="w-[18px] h-[18px] lg:w-3.5 lg:h-3.5 2xl:w-[18px] 2xl:h-[18px]" />
              Dueño/Gerente
            </button>

            <button
              type="button"
              onClick={() => handleCambiarModo('empleado')}
              disabled={cargando}
              className={`
                flex-1 py-2.5 lg:py-1.5 2xl:py-3 px-4 lg:px-3 2xl:px-4 rounded-lg lg:rounded-xl 2xl:rounded-xl
                font-semibold text-sm lg:text-xs 2xl:text-base
                transition-all duration-200 flex items-center justify-center gap-2
                ${modo === 'empleado'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-[#A0A0A0] hover:text-white'
                }
                ${cargando ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Briefcase className="w-[18px] h-[18px] lg:w-3.5 lg:h-3.5 2xl:w-[18px] 2xl:h-[18px]" />
              Empleado
            </button>
          </div>

          {/* Formulario Dueño/Gerente */}
          {modo === 'dueno' && (
            <form onSubmit={handleLoginDueno} noValidate>
              <div className="space-y-4 lg:space-y-2.5 2xl:space-y-5">
                {/* Email */}
                <Input
                  label="Correo Electrónico"
                  type="email"
                  id="input-email-scanya"
                  name="input-email-scanya"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleEmailKeyDown}
                  placeholder="tu@email.com"
                  icono={<Mail className="w-[18px] h-[18px] lg:w-3.5 lg:h-3.5 2xl:w-[18px] 2xl:h-[18px]" />}
                  isValid={email.length === 0 ? null : emailValido}
                  error={!emailValido && email.length > 0 ? 'Ingresa un correo válido' : undefined}
                  disabled={cargando}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  className="[&>input]:text-white! [&>input]:bg-transparent!"
                  autoFocus
                />

                {/* Password */}
                <Input
                  ref={passwordInputRef}
                  label="Contraseña"
                  type="password"
                  id="input-password-scanya"
                  name="input-password-scanya"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tu contraseña"
                  icono={<Lock className="w-[18px] h-[18px] lg:w-3.5 lg:h-3.5 2xl:w-[18px] 2xl:h-[18px]" />}
                  isValid={password.length === 0 ? null : passwordValido}
                  error={!passwordValido && password.length > 0 ? 'La contraseña es requerida' : undefined}
                  disabled={cargando}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  className="[&>input]:text-white! [&>input]:bg-transparent!"
                />

                {/* Recordar */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recordar}
                    onChange={(e) => setRecordar(e.target.checked)}
                    disabled={cargando}
                    className="w-4 h-4 rounded border-[#3B82F6] bg-transparent text-[#2563EB] focus:ring-[#3B82F6] focus:ring-offset-0"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                  />
                  <span className="text-sm text-[#A0A0A0]">
                    Recordar Correo
                  </span>
                </label>

                {/* Botón */}
                <Boton
                  type="submit"
                  fullWidth
                  disabled={!formularioDuenoValido || cargando}
                  cargando={cargando}
                  className={`
                    mt-2 lg:mt-1.5 2xl:mt-3 transition-all duration-200
                    ${formularioDuenoValido && !cargando
                      ? 'bg-[#2563EB] hover:bg-[#1D4ED8] shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:shadow-[0_0_35px_rgba(59,130,246,0.6)]'
                      : 'bg-[#333333] cursor-not-allowed opacity-50'
                    }
                  `}
                >
                  {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Boton>
              </div>
            </form>
          )}

          {/* Formulario Empleado */}
          {modo === 'empleado' && (
            <div>
              <div className="mb-4 lg:mb-2.5 2xl:mb-5">
                {/* Nick */}
                <Input
                  label="Nick de Usuario"
                  type="text"
                  id="input-nick-scanya"
                  name="input-nick-scanya"
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  onKeyDown={handleNickKeyDown}
                  placeholder="carlos"
                  icono={<User className="w-[18px] h-[18px] lg:w-3.5 lg:h-3.5 2xl:w-[18px] 2xl:h-[18px]" />}
                  isValid={nick.length === 0 ? null : nickValido}
                  error={!nickValido && nick.length > 0 ? 'El nick es requerido' : undefined}
                  disabled={cargando}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    color: '#FFFFFF',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  className="[&>input]:text-white! [&>input]:bg-transparent! [&>input]:lowercase"
                  autoFocus
                />

                {/* Indicador: Presiona Enter */}
                {!tecladoListo && nickValido && (
                  <p className="text-xs text-[#A0A0A0] mt-2 text-center animate-pulse">
                    Presiona <span className="text-[#3B82F6] font-semibold">Enter</span> para continuar
                  </p>
                )}
              </div>

              {/* PIN Label */}
              <div className="text-center mb-3 lg:mb-2 2xl:mb-4">
                <span className={`text-sm lg:text-xs 2xl:text-base font-semibold transition-colors duration-300 ${tecladoListo ? 'text-[#3B82F6]' : 'text-[#606060]'
                  }`}>
                  PIN (4 dígitos)
                </span>
              </div>

              {/* Teclado numérico */}
              <div
                ref={tecladoRef}
                tabIndex={-1}
                className={`transition-all duration-300 outline-none ${tecladoListo ? 'opacity-100 scale-100' : 'opacity-50 scale-95 pointer-events-none'
                  }`}
              >
                <TecladoNumerico
                  onComplete={handleLoginEmpleado}
                  disabled={cargando || !tecladoListo}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer - Link para instalar PWA (oculto solo en modo standalone) */}
        {!esStandalone && (
          <div className="text-center mt-6 lg:mt-4 2xl:mt-8">
            <button
              onClick={handleInstalarPWA}
              disabled={instalando}
              className="text-sm lg:text-xs 2xl:text-sm text-[#9ca3af] hover:text-[#3B82F6] transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <Download className="w-4 h-4" />
              {instalando ? 'Instalando...' : 'Instalar como app'}
            </button>
          </div>
        )}
      </div>

      {/* Keyframes de animación Gradient Flow */}
      <style>{`
        /* Animación de las esferas flotantes */
        @keyframes float-orb-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(50px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-50px, 50px) scale(0.9);
          }
        }

        @keyframes float-orb-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-40px, 40px) scale(1.05);
          }
          66% {
            transform: translate(40px, -40px) scale(0.95);
          }
        }

        @keyframes float-orb-3 {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.15);
          }
        }

        /* Animación de partículas ascendentes */
        @keyframes particle-rise {
          0% {
            transform: translateY(600px);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px);
            opacity: 0;
          }
        }

        /* Efecto glow para inputs al hacer focus */
        input:focus {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.4) !important;
          border-color: rgba(59, 130, 246, 0.6) !important;
        }
      `}</style>
    </div>
  );
}

export default PaginaLoginScanYA;