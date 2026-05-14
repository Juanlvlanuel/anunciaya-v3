/**
 * FormularioRegistro.tsx
 * =======================
 * Formulario de registro con toggle Personal/Comercial.
 * Incluye validaciones en tiempo real y soporte para Google OAuth.
 *
 * Ubicación: apps/web/src/components/auth/registro/FormularioRegistro.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Lock,
  Building2,
  Eye,
  EyeOff,
  Check,
  ChevronLeft,
  ChevronDown,
  X,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Mail = (p: IconoWrapperProps) => <Icon icon={ICONOS.email} {...p} />;
import type { RegistroInput, DatosGoogleNuevo } from '@/services/authService';

// =============================================================================
// TIPOS
// =============================================================================

type TipoCuenta = 'personal' | 'comercial';

interface FormularioRegistroProps {
  onSubmit: (datos: RegistroInput) => Promise<void>;
  onGoogleClick: () => void;
  onDesconectarGoogle?: () => void;
  datosGoogle: DatosGoogleNuevo | null;
  googleIdToken?: string;
  cargando: boolean;
  onAbrirLogin: () => void;
  onTipoCuentaCambio?: (tipo: TipoCuenta) => void;
  /** Correo prellenado cuando el usuario viene desde login con un correo no registrado. */
  correoInicial?: string;
}

interface EstadoFormulario {
  nombreNegocio: string;
  nombre: string;
  apellidos: string;
  correo: string;
  telefono: string;
  lada: string;
  contrasena: string;
  confirmarContrasena: string;
  aceptaTerminos: boolean;
}

interface EstadoValidacion {
  nombreNegocio: boolean | null;
  nombre: boolean | null;
  apellidos: boolean | null;
  correo: boolean | null;
  telefono: boolean | null;
  contrasena: {
    longitud: boolean;
    mayuscula: boolean;
    minuscula: boolean;
    numero: boolean;
  };
  confirmarContrasena: boolean | null;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const LADAS = [
  { codigo: '+52', pais: '🇲🇽', nombre: 'México' },
  { codigo: '+1', pais: '🇺🇸', nombre: 'Estados Unidos' },
  { codigo: '+34', pais: '🇪🇸', nombre: 'España' },
  { codigo: '+57', pais: '🇨🇴', nombre: 'Colombia' },
  { codigo: '+54', pais: '🇦🇷', nombre: 'Argentina' },
  { codigo: '+56', pais: '🇨🇱', nombre: 'Chile' },
];

const PRECIO_COMERCIAL = 449;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function FormularioRegistro({
  onSubmit,
  onGoogleClick,
  onDesconectarGoogle,
  datosGoogle,
  googleIdToken,
  cargando,
  onAbrirLogin,
  onTipoCuentaCambio,
  correoInicial,
}: FormularioRegistroProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>(
    searchParams.get('plan') === 'comercial' ? 'comercial' : 'personal'
  );
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const [formulario, setFormulario] = useState<EstadoFormulario>({
    nombreNegocio: '',
    nombre: datosGoogle?.nombre || '',
    apellidos: datosGoogle?.apellidos || '',
    correo: datosGoogle?.email || correoInicial || '',
    telefono: '',
    lada: '+52',
    contrasena: '',
    confirmarContrasena: '',
    aceptaTerminos: false,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVO: Prellenar formulario cuando llegan datos de Google
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (datosGoogle) {
      setFormulario((prev) => ({
        ...prev,
        nombre: datosGoogle.nombre || '',
        apellidos: datosGoogle.apellidos || '',
        correo: datosGoogle.email || '',
      }));
      // También actualizar validaciones
      setValidacion((prev) => ({
        ...prev,
        nombre: datosGoogle.nombre ? datosGoogle.nombre.length >= 2 : null,
        apellidos: datosGoogle.apellidos ? datosGoogle.apellidos.length >= 2 : null,
        correo: datosGoogle.email ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosGoogle.email) : null,
      }));
    }
  }, [datosGoogle]);

  // Marcar el correo prellenado (desde login fallido) como válido al montar.
  // Evita el caso donde el campo aparece con valor pero sin estado de validación.
  useEffect(() => {
    if (correoInicial && !datosGoogle) {
      setValidacion((prev) => ({
        ...prev,
        correo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoInicial),
      }));
    }
    // Solo se ejecuta una vez al montar; el correo se edita libremente después.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [validacion, setValidacion] = useState<EstadoValidacion>({
    nombreNegocio: null,
    nombre: null,
    apellidos: null,
    correo: null,
    telefono: null,
    contrasena: {
      longitud: false,
      mayuscula: false,
      minuscula: false,
      numero: false,
    },
    confirmarContrasena: null,
  });

  const [camposTocados, setCamposTocados] = useState<Record<string, boolean>>({});


  // ---------------------------------------------------------------------------
  // Validadores
  // ---------------------------------------------------------------------------
  const validarCampoTexto = useCallback((valor: string, minLength = 2): boolean => {
    return valor.trim().length >= minLength;
  }, []);

  const validarEmail = useCallback((email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }, []);

  const validarTelefono = useCallback((telefono: string): boolean => {
    const soloNumeros = telefono.replace(/\D/g, '');
    return soloNumeros.length === 10;
  }, []);

  const validarContrasena = useCallback((contrasena: string) => {
    return {
      longitud: contrasena.length >= 8,
      mayuscula: /[A-Z]/.test(contrasena),
      minuscula: /[a-z]/.test(contrasena),
      numero: /[0-9]/.test(contrasena),
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleChange = useCallback(
    (campo: keyof EstadoFormulario) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      let valor = e.target.value;

      // Formateo especial para teléfono
      if (campo === 'telefono') {
        valor = valor.replace(/\D/g, '');
        valor = valor.slice(0, 10);
        if (valor.length > 6) {
          valor = `${valor.slice(0, 3)} ${valor.slice(3, 6)} ${valor.slice(6)}`;
        } else if (valor.length > 3) {
          valor = `${valor.slice(0, 3)} ${valor.slice(3)}`;
        }
      }

      setFormulario((prev) => ({ ...prev, [campo]: valor }));

      // Validación en tiempo real
      if (campo === 'nombreNegocio') {
        setValidacion((prev) => ({
          ...prev,
          nombreNegocio: valor.length > 0 ? validarCampoTexto(valor) : null,
        }));
      } else if (campo === 'nombre') {
        setValidacion((prev) => ({
          ...prev,
          nombre: valor.length > 0 ? validarCampoTexto(valor) : null,
        }));
      } else if (campo === 'apellidos') {
        setValidacion((prev) => ({
          ...prev,
          apellidos: valor.length > 0 ? validarCampoTexto(valor) : null,
        }));
      } else if (campo === 'correo') {
        setValidacion((prev) => ({
          ...prev,
          correo: valor.length > 0 ? validarEmail(valor) : null,
        }));
      } else if (campo === 'telefono') {
        const soloNumeros = valor.replace(/\D/g, '');
        setValidacion((prev) => ({
          ...prev,
          telefono: soloNumeros.length > 0 ? validarTelefono(valor) : null,
        }));
      } else if (campo === 'contrasena') {
        const validacionContrasena = validarContrasena(valor);
        setValidacion((prev) => ({
          ...prev,
          contrasena: validacionContrasena,
          confirmarContrasena:
            formulario.confirmarContrasena.length > 0
              ? valor === formulario.confirmarContrasena
              : null,
        }));
      } else if (campo === 'confirmarContrasena') {
        setValidacion((prev) => ({
          ...prev,
          confirmarContrasena: valor.length > 0 ? valor === formulario.contrasena : null,
        }));
      }
    },
    [formulario.contrasena, formulario.confirmarContrasena, validarCampoTexto, validarEmail, validarTelefono, validarContrasena]
  );

  const handleBlur = useCallback(
    (campo: keyof EstadoFormulario) => () => {
      setCamposTocados((prev) => ({ ...prev, [campo]: true }));

      if (campo === 'nombreNegocio') {
        setValidacion((prev) => ({
          ...prev,
          nombreNegocio: validarCampoTexto(formulario.nombreNegocio),
        }));
      } else if (campo === 'nombre') {
        setValidacion((prev) => ({
          ...prev,
          nombre: validarCampoTexto(formulario.nombre),
        }));
      } else if (campo === 'apellidos') {
        setValidacion((prev) => ({
          ...prev,
          apellidos: validarCampoTexto(formulario.apellidos),
        }));
      } else if (campo === 'correo') {
        setValidacion((prev) => ({
          ...prev,
          correo: validarEmail(formulario.correo),
        }));
      } else if (campo === 'telefono') {
        setValidacion((prev) => ({
          ...prev,
          telefono: validarTelefono(formulario.telefono),
        }));
      } else if (campo === 'contrasena') {
        setValidacion((prev) => ({
          ...prev,
          contrasena: validarContrasena(formulario.contrasena),
        }));
      }
      else if (campo === 'confirmarContrasena') {
        setValidacion((prev) => ({
          ...prev,
          confirmarContrasena: formulario.confirmarContrasena === formulario.contrasena,
        }));
      }
    },
    [formulario, validarCampoTexto, validarEmail, validarTelefono]
  );

  const handleToggleTerminos = useCallback(() => {
    setFormulario((prev) => ({ ...prev, aceptaTerminos: !prev.aceptaTerminos }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const datos: RegistroInput = {
        nombre: formulario.nombre.trim(),
        apellidos: formulario.apellidos.trim(),
        correo: formulario.correo.trim().toLowerCase(),
        telefono: `${formulario.lada}${formulario.telefono.replace(/\D/g, '')}`,
        perfil: tipoCuenta,
        aceptaTerminos: formulario.aceptaTerminos,
      };

      if (!datosGoogle) {
        datos.contrasena = formulario.contrasena;
      } else {
        datos.googleIdToken = googleIdToken || '';
        datos.avatar = datosGoogle.avatar;
      }

      if (tipoCuenta === 'comercial') {
        datos.nombreNegocio = formulario.nombreNegocio.trim();
      }

      await onSubmit(datos);
    },
    [formulario, tipoCuenta, datosGoogle, onSubmit]
  );

  // Handler para volver al landing
  const handleVolver = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // ---------------------------------------------------------------------------
  // Validación completa del formulario
  // ---------------------------------------------------------------------------
  const esFormularioValido = useCallback((): boolean => {
    const camposBase =
      validacion.nombre === true &&
      validacion.apellidos === true &&
      validacion.correo === true &&
      validacion.telefono === true &&
      formulario.aceptaTerminos;

    if (tipoCuenta === 'comercial' && validacion.nombreNegocio !== true) {
      return false;
    }

    if (!datosGoogle) {
      const contrasenaValida =
        validacion.contrasena.longitud &&
        validacion.contrasena.mayuscula &&
        validacion.contrasena.minuscula &&
        validacion.contrasena.numero &&
        validacion.confirmarContrasena === true;

      return camposBase && contrasenaValida;
    }

    return camposBase;
  }, [validacion, formulario.aceptaTerminos, tipoCuenta, datosGoogle]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full">
      {/* ===================================================================== */}
      {/* HEADER MÓVIL — Estilo landing (azul oscuro → negro)                  */}
      {/* ===================================================================== */}
      <div className="lg:hidden">
        <div className="px-4 pt-4 pb-14" style={{ background: 'linear-gradient(to bottom, #0B358F 40%, #000000 80%)' }}>
          {/* Barra superior: Botón atrás + Logo */}
          <div className="flex items-center justify-center relative mb-6">
            <button
              onClick={handleVolver}
              className="absolute left-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <img
              src="/logo-anunciaya-blanco.webp"
              alt="AnunciaYA"
              className="h-14 object-contain"
            />
          </div>

          {/* Título */}
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white mb-1">
              Únete y gana{' '}
              <span className="bg-linear-to-r from-amber-300 to-amber-600 bg-clip-text text-transparent">
                recompensas
              </span>
            </h1>
            <p className="text-base font-medium text-white/60">
              comprando en Negocios de tu comunidad.
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CARD DEL FORMULARIO - 600px centrada                                 */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-t-3xl lg:rounded-2xl -mt-10 lg:mt-0 mx-3 lg:mx-auto p-4 lg:p-5 2xl:p-6 shadow-xl lg:shadow-lg lg:max-w-[480px] 2xl:max-w-[600px] lg:w-full relative z-10">

        {/* Header desktop */}
        <div className="hidden lg:flex items-center gap-2 mb-2 2xl:mb-5">
          <div className="flex items-center justify-center w-8 h-8 2xl:w-10 2xl:h-10 rounded-full bg-linear-to-b from-slate-600 to-slate-800">
            <User className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <h2 className="text-base lg:text-lg 2xl:text-xl font-extrabold text-slate-900">Registra tu cuenta</h2>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* TOGGLE PERSONAL/COMERCIAL - Con iconos y color naranja              */}
        {/* ------------------------------------------------------------------- */}
        <div className="bg-slate-200 rounded-lg p-1 flex relative mb-2 2xl:mb-4">
          {/* Indicador deslizante — dark gradient */}
          <div
            className={`absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] rounded-lg transition-all duration-300 ${tipoCuenta === 'comercial'
              ? 'translate-x-[calc(100%+4px)]'
              : 'translate-x-0'
              } bg-linear-to-r from-slate-700 to-slate-800 shadow-lg shadow-slate-700/30`}
          />

          {/* Botón Personal */}
          <button
            type="button"
            onClick={() => { setTipoCuenta('personal'); onTipoCuentaCambio?.('personal'); }}
            className={`flex-1 h-10 lg:h-9 2xl:h-10 px-4 lg:px-3 2xl:px-4 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold z-10 flex items-center justify-center gap-1.5 lg:cursor-pointer ${tipoCuenta === 'personal' ? 'text-white' : 'text-slate-600'
              }`}
          >
            <User className="w-4 h-4" />
            Personal
          </button>

          {/* Botón Comercial */}
          <button
            type="button"
            onClick={() => { setTipoCuenta('comercial'); onTipoCuentaCambio?.('comercial'); }}
            className={`flex-1 h-10 lg:h-9 2xl:h-10 px-4 lg:px-3 2xl:px-4 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold z-10 flex items-center justify-center gap-1.5 lg:cursor-pointer ${tipoCuenta === 'comercial' ? 'text-white' : 'text-slate-600'
              }`}
          >
            <Building2 className="w-5 h-5" />
            Comercial
          </button>
        </div>

        {tipoCuenta === 'comercial' && (
          <div className="bg-amber-100 border-2 border-amber-300 rounded-lg p-1.5 lg:p-2 2xl:p-2.5 mb-2 lg:mb-2 2xl:mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg lg:text-lg 2xl:text-xl font-extrabold text-slate-800">
                  ${PRECIO_COMERCIAL}
                  <span className="text-sm lg:text-sm font-medium text-slate-600">/mes</span>
                </p>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">IVA incluido</p>
              </div>
              <div className="text-right">
                <span className="bg-amber-500 text-white text-sm lg:text-[11px] 2xl:text-sm font-bold px-2.5 lg:px-2.5 2xl:px-3 py-1 lg:py-1 2xl:py-1.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  7 días gratis
                </span>
                <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mt-0.5 lg:mt-1">Se cobra al día 8</p>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* FORMULARIO                                                          */}
        {/* ------------------------------------------------------------------- */}
        <form onSubmit={handleSubmit} className="space-y-2 lg:space-y-1.5 2xl:space-y-3">
          {/* Nombre del negocio (solo comercial) */}
          {tipoCuenta === 'comercial' && (
            <InputField
              label="Nombre del negocio"
              icon={<Building2 className="w-[18px] h-[18px]" />}
              type="text"
              placeholder="Ej: Tacos El Güero"
              value={formulario.nombreNegocio}
              onChange={handleChange('nombreNegocio')}
              isValid={validacion.nombreNegocio}
              disabled={cargando}
              onBlur={handleBlur('nombreNegocio')}
              autoComplete="organization"
            />
          )}

          {/* Grid: Nombre + Apellidos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-2 2xl:gap-3">
            <InputField
              label="Nombre(s)"
              icon={<User className="w-[18px] h-[18px]" />}
              type="text"
              placeholder="Tu nombre"
              value={formulario.nombre}
              onChange={handleChange('nombre')}
              isValid={validacion.nombre}
              disabled={cargando}
              onBlur={handleBlur('nombre')}
              autoComplete="given-name"
            />
            <InputField
              label="Apellidos"
              icon={<User className="w-[18px] h-[18px]" />}
              type="text"
              placeholder="Tus apellidos"
              value={formulario.apellidos}
              onChange={handleChange('apellidos')}
              isValid={validacion.apellidos}
              disabled={cargando}
              onBlur={handleBlur('apellidos')}
              autoComplete="family-name"
            />
          </div>

          {/* Grid: Email + Teléfono */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-2 2xl:gap-3">
            <InputField
              label="Correo personal"
              icon={<Mail className="w-[18px] h-[18px]" />}
              type="email"
              placeholder="tu@email.com"
              value={formulario.correo}
              onChange={handleChange('correo')}
              isValid={validacion.correo}
              errorMessage="Ingresa un correo válido"
              disabled={cargando || !!datosGoogle}
              onBlur={handleBlur('correo')}
              autoComplete="email"
            />

            {/* Teléfono con lada */}
            <div>
              <label className="block text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1 lg:mb-0.5 2xl:mb-1.5">
                Teléfono personal
              </label>
              <div className={`flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg border-2 ${
                validacion.telefono === null
                  ? 'border-slate-300'
                  : validacion.telefono
                    ? 'border-emerald-500 bg-emerald-100'
                    : 'border-red-500 bg-red-100'
              }`} style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                {/* Selector de lada */}
                <div className="relative shrink-0">
                  <select
                    value={formulario.lada}
                    onChange={handleChange('lada')}
                    disabled={cargando}
                    className="w-20 lg:w-18 2xl:w-20 h-full px-2 lg:px-1.5 2xl:px-2 pr-5 bg-transparent text-base lg:text-sm 2xl:text-base font-medium text-slate-800 appearance-none cursor-pointer focus:outline-none disabled:opacity-50 border-r-2 border-slate-300"
                  >
                    {LADAS.map((lada) => (
                      <option key={lada.codigo} value={lada.codigo}>
                        {lada.pais} {lada.codigo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 pointer-events-none" />
                </div>

                {/* Input teléfono */}
                <input
                  type="tel"
                  placeholder="638 123 4567"
                  value={formulario.telefono}
                  onChange={handleChange('telefono')}
                  onBlur={handleBlur('telefono')}
                  disabled={cargando}
                  autoComplete="tel-national"
                  className="flex-1 h-full px-3 lg:px-2.5 2xl:px-3 bg-transparent text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Contraseñas (oculto si viene de Google) */}
          {!datosGoogle && (
            <>
              {/* Grid: Contraseña + Confirmar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-2 2xl:gap-3">
                <InputField
                  label="Contraseña"
                  icon={<Lock className="w-[18px] h-[18px]" />}
                  type={mostrarContrasena ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={formulario.contrasena}
                  onChange={handleChange('contrasena')}
                  onBlur={handleBlur('contrasena')}
                  isValid={
                    !camposTocados.contrasena
                      ? null
                      : validacion.contrasena.longitud &&
                      validacion.contrasena.mayuscula &&
                      validacion.contrasena.minuscula &&
                      validacion.contrasena.numero
                  }
                  disabled={cargando}
                  autoComplete="new-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setMostrarContrasena(!mostrarContrasena)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 lg:cursor-pointer"
                    >
                      {mostrarContrasena ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  }
                />
                <InputField
                  label="Confirmar contraseña"
                  icon={<Lock className="w-[18px] h-[18px]" />}
                  type={mostrarConfirmar ? 'text' : 'password'}
                  placeholder="Repite contraseña"
                  value={formulario.confirmarContrasena}
                  onChange={handleChange('confirmarContrasena')}
                  onBlur={handleBlur('confirmarContrasena')}
                  isValid={
                    !camposTocados.confirmarContrasena
                      ? null
                      : formulario.confirmarContrasena.length > 0 &&
                      formulario.confirmarContrasena === formulario.contrasena
                  }
                  errorMessage="Las contraseñas no coinciden"
                  disabled={cargando}
                  autoComplete="new-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 lg:cursor-pointer"
                    >
                      {mostrarConfirmar ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  }
                />
              </div>

              {/* Requisitos de contraseña - Grid 2x2 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 lg:gap-2 2xl:gap-3">
                <PasswordRequirement met={validacion.contrasena.longitud} text="8+ caracteres" />
                <PasswordRequirement met={validacion.contrasena.mayuscula} text="1 mayúscula" />
                <PasswordRequirement met={validacion.contrasena.minuscula} text="1 minúscula" />
                <PasswordRequirement met={validacion.contrasena.numero} text="1 número" />
              </div>
            </>
          )}

          {/* Badge Google (si viene de Google) */}
          {datosGoogle && (
            <div className="flex items-center gap-3 bg-green-50 border-2 border-green-200 rounded-xl p-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <GoogleIcon />
              </div>
              <div className="flex-1">
                <p className="text-green-800 font-semibold text-sm">Conectado con Google</p>
                <p className="text-green-600 text-xs">No necesitas contraseña</p>
              </div>
              <button
                type="button"
                onClick={onDesconectarGoogle}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-green-100 transition-colors lg:cursor-pointer"
                title="Cambiar cuenta"
              >
                <X className="w-4 h-4 text-green-600" />
              </button>
            </div>
          )}

          {/* Checkbox términos */}
          <div
            onClick={handleToggleTerminos}
            className={`flex items-start gap-2 lg:gap-2.5 2xl:gap-3 p-2.5 lg:p-2.5 2xl:p-3 rounded-xl border-2 cursor-pointer ${formulario.aceptaTerminos
              ? 'bg-slate-200 border-slate-400'
              : 'bg-slate-100 border-transparent hover:bg-slate-200'
              }`}
          >
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${formulario.aceptaTerminos
                ? 'bg-slate-800 border-slate-800'
                : 'border-slate-300 bg-white'
                }`}
            >
              {formulario.aceptaTerminos && <Check className="w-3 h-3 text-white" />}
            </div>
            <label className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium leading-relaxed cursor-pointer">
              Acepto los{' '}
              <a
                href="/terminos"
                className="text-slate-800 font-bold hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Términos
              </a>{' '}
              y{' '}
              <a
                href="/privacidad"
                className="text-slate-800 font-bold hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacidad
              </a>
            </label>
          </div>

          {/* Botón submit */}
          <button
            type="submit"
            disabled={!esFormularioValido() || cargando}
            className={`w-full h-11 lg:h-10 2xl:h-11 rounded-lg font-semibold text-base lg:text-sm 2xl:text-base lg:cursor-pointer ${
              esFormularioValido() && !cargando
                ? 'bg-linear-to-r from-slate-700 to-slate-800 text-white hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 hover:shadow-slate-700/40 active:scale-[0.98]'
                : 'bg-slate-400 text-white cursor-not-allowed'
            }`}
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Procesando...
              </span>
            ) : tipoCuenta === 'comercial' ? (
              'Continuar a pago'
            ) : (
              'Crear cuenta'
            )}
          </button>

          {/* Divider */}
          {!datosGoogle && (
            <>
              <div className="flex items-center gap-2 lg:gap-3 my-1 lg:my-1 2xl:my-1.5">
                <div className="flex-1 h-px bg-slate-300" />
                <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">o continúa con</span>
                <div className="flex-1 h-px bg-slate-300" />
              </div>

              {/* Botón Google */}
              <button
                type="button"
                onClick={onGoogleClick}
                disabled={cargando}
                className="w-full h-11 lg:h-10 2xl:h-11 bg-white border-2 border-slate-300 rounded-lg font-semibold text-base lg:text-sm 2xl:text-base text-slate-700 flex items-center justify-center gap-2.5 hover:bg-slate-200 disabled:opacity-50 lg:cursor-pointer"
              >
                <GoogleIcon />
                Google
              </button>
            </>
          )}

          {/* Link login */}
          <p className="text-center text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mt-1.5 lg:mt-1 2xl:mt-1.5 font-medium">
            ¿Ya tienes cuenta?{' '}
            <button
              type="button"
              onClick={onAbrirLogin}
              className="text-slate-800 font-bold hover:underline lg:cursor-pointer"
            >
              Inicia sesión
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

interface InputFieldProps {
  label: string;
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  isValid?: boolean | null;
  errorMessage?: string;
  disabled?: boolean;
  rightElement?: React.ReactNode;
  autoComplete?: string;
}

function InputField({
  label,
  icon,
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  isValid = null,
  errorMessage,
  disabled = false,
  rightElement,
  autoComplete,
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 mb-1 lg:mb-0.5 2xl:mb-1.5">{label}</label>
      <div className="relative">
        <span
          className={`absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 ${isValid === null
            ? 'text-slate-600'
            : isValid
              ? 'text-emerald-600'
              : 'text-red-600'
            }`}
        >
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete={autoComplete}
          className={`w-full h-11 lg:h-10 2xl:h-11 pl-10 lg:pl-9 2xl:pl-10 pr-10 bg-slate-100 border-2 rounded-lg text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${isValid === null
            ? 'border-slate-300 focus:border-slate-500'
            : isValid
              ? 'border-emerald-500 bg-emerald-100'
              : 'border-red-500 bg-red-100'
            }`}
          style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
        />
        {rightElement}
      </div>
      {isValid === false && errorMessage && (
        <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-medium mt-1">{errorMessage}</p>
      )}
    </div>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${met ? 'bg-emerald-600' : 'border-2 border-slate-300 bg-white'
          }`}
      >
        {met && <Check className="w-2.5 h-2.5 text-white" />}
      </div>
      <span className={`text-sm lg:text-[11px] 2xl:text-sm font-medium ${met ? 'text-emerald-600' : 'text-slate-600'}`}>
        {text}
      </span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default FormularioRegistro;