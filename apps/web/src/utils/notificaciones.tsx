/**
 * notificaciones.tsx (v4.0 - Tokens corregidos + estilo congruente)
 * ==================================================================
 * Sistema de notificaciones para AnunciaYA v3.0
 * Toasts con progress bar · Modal confirmación · Modal sesión expirada
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { X, Lock } from 'lucide-react';
import i18n from '../config/i18n';

// =============================================================================
// TIPOS TYPESCRIPT
// =============================================================================

type TipoNotificacion = 'exito' | 'error' | 'advertencia' | 'info';

interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  titulo?: string;
}

interface ConfirmacionState {
  titulo: string;
  descripcion?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface NotificacionesContextType {
  agregar: (tipo: TipoNotificacion, mensaje: string, titulo?: string) => void;
  remover: (id: string) => void;
  mostrarConfirmacion: (state: ConfirmacionState) => void;
  ocultarConfirmacion: () => void;
}

interface ConfirmacionOptions {
  titulo: string;
  descripcion?: string;
}

// =============================================================================
// CONFIGURACIÓN VISUAL POR TIPO
// =============================================================================

const TOAST_DURATION = 4000;

const configTipo: Record<TipoNotificacion, {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
}> = {
  exito: {
    color: '#059669',
    bg: '#d1fae5',
    border: '#6ee7b7',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="10" fill="#059669" />
        <path d="M6 10.5L8.5 13L14 7.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    color: '#dc2626',
    bg: '#fecaca',
    border: '#fca5a5',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="10" fill="#dc2626" />
        <path d="M7 7L13 13M13 7L7 13" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  advertencia: {
    color: '#d97706',
    bg: '#fde68a',
    border: '#fbbf24',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="10" fill="#d97706" />
        <path d="M10 6V11M10 13.5V14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    color: '#2563eb',
    bg: '#bfdbfe',
    border: '#93c5fd',
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="10" fill="#2563eb" />
        <path d="M10 9V14M10 6.5V7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
};

// =============================================================================
// CONTEXT
// =============================================================================

const NotificacionesContext = createContext<NotificacionesContextType | undefined>(undefined);

// =============================================================================
// HOOK PARA USAR NOTIFICACIONES
// =============================================================================

const useNotificaciones = (): NotificacionesContextType => {
  const context = useContext(NotificacionesContext);
  if (!context) {
    throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
  }
  return context;
};

// =============================================================================
// COMPONENTE: TOAST INDIVIDUAL
// =============================================================================

interface NotificacionToastProps {
  notificacion: Notificacion;
  onClose: (id: string) => void;
}

const NotificacionToast: React.FC<NotificacionToastProps> = ({ notificacion, onClose }) => {
  const [estado, setEstado] = useState<'entrando' | 'visible' | 'saliendo'>('entrando');
  const [progreso, setProgreso] = useState(100);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(Date.now());
  const restanteRef = useRef<number>(TOAST_DURATION);

  const config = configTipo[notificacion.tipo];

  const iniciarTimer = useCallback(() => {
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = restanteRef.current - elapsed;
      const pct = Math.max(0, (remaining / TOAST_DURATION) * 100);
      setProgreso(pct);
      if (pct <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        cerrar();
      }
    }, 25);
  }, []);

  const pausarTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startRef.current;
      restanteRef.current = restanteRef.current - elapsed;
    }
  }, []);

  const reanudarTimer = useCallback(() => {
    iniciarTimer();
  }, [iniciarTimer]);

  useEffect(() => {
    const enterTimeout = setTimeout(() => setEstado('visible'), 20);
    iniciarTimer();
    return () => {
      clearTimeout(enterTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const cerrar = useCallback(() => {
    setEstado('saliendo');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => onClose(notificacion.id), 300);
  }, [notificacion.id, onClose]);

  const esVisible = estado === 'visible';

  return (
    <div
      onMouseEnter={pausarTimer}
      onMouseLeave={reanudarTimer}
      className="mb-2"
      style={{
        transform: `translateY(${esVisible ? '0' : '-14px'}) scale(${esVisible ? 1 : 0.97})`,
        opacity: esVisible ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          background: config.bg,
          border: `2px solid ${config.border}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
          maxWidth: 'min(420px, calc(100vw - 32px))',
          minWidth: 'min(300px, calc(100vw - 32px))',
          width: 'fit-content',
        }}
      >
        {/* Contenido */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Icono */}
          <div className="shrink-0">
            {config.icon}
          </div>

          {/* Texto */}
          <div className="min-w-0">
            {notificacion.titulo && (
              <p className="text-base font-bold text-slate-800 leading-tight">
                {notificacion.titulo}
              </p>
            )}
            <p
              className={`text-base leading-snug line-clamp-2 ${
                notificacion.titulo ? 'text-slate-600 font-medium mt-0.5' : 'text-slate-700 font-semibold'
              }`}
            >
              {notificacion.mensaje}
            </p>
          </div>

          {/* Cerrar */}
          <button
            onClick={cerrar}
            className="shrink-0 p-1 rounded-md text-slate-600 hover:text-slate-800"
          >
            <X className="w-4.5 h-4.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="h-1 w-full" style={{ background: `${config.color}20` }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${progreso}%`,
              background: config.color,
              opacity: 0.6,
              transition: 'width 0.05s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE: CONTENEDOR DE NOTIFICACIONES
// =============================================================================

interface ContenedorNotificacionesProps {
  notificaciones: Notificacion[];
  onClose: (id: string) => void;
}

const ContenedorNotificaciones: React.FC<ContenedorNotificacionesProps> = ({ notificaciones, onClose }) => {
  if (notificaciones.length === 0) return null;

  return (
    <div className="fixed top-3 lg:top-4 left-1/2 -translate-x-1/2 z-9999 flex flex-col items-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center">
        {notificaciones.map((notificacion) => (
          <NotificacionToast key={notificacion.id} notificacion={notificacion} onClose={onClose} />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE: MODAL DE CONFIRMACIÓN
// =============================================================================

interface ModalConfirmacionToastProps {
  options: ConfirmacionOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

const ModalConfirmacionToast: React.FC<ModalConfirmacionToastProps> = ({ options, onConfirm, onCancel }) => {
  const [saliendo, setSaliendo] = useState(false);

  const handleClose = (callback: () => void) => {
    setSaliendo(true);
    setTimeout(() => callback(), 300);
  };

  return (
    <div
      className="fixed top-3 lg:top-4 left-1/2 -translate-x-1/2 z-10000 w-full max-w-sm lg:max-w-md px-3 lg:px-4 pointer-events-none"
      style={{ perspective: '1000px' }}
    >
      <div
        className={`pointer-events-auto relative overflow-hidden rounded-xl transition-all duration-300
          ${saliendo ? 'opacity-0 -translate-y-3 scale-95' : 'animate-[confirmIn_0.3s_cubic-bezier(0.22,1,0.36,1)]'}
        `}
        style={{
          background: '#fde68a',
          border: '2px solid #fbbf24',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Contenido */}
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3.5">
            <div className="shrink-0 mt-0.5">
              <svg width="24" height="24" fill="none" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="10" fill="#d97706" />
                <path d="M10 6V11M10 13.5V14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                {options.titulo}
              </h3>
              {options.descripcion && (
                <p className="text-sm text-slate-600 font-medium leading-relaxed mt-1">
                  {options.descripcion}
                </p>
              )}
            </div>
            <button
              onClick={() => handleClose(onCancel)}
              className="shrink-0 p-1 rounded-md text-slate-600 hover:text-slate-800"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Botones */}
          <div className="flex gap-2.5">
            <button
              onClick={() => handleClose(onCancel)}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-600 bg-white border-2 border-slate-300 hover:bg-slate-200"
            >
              {i18n.t('common:confirmacion.cancelar')}
            </button>
            <button
              onClick={() => handleClose(onConfirm)}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 active:scale-[0.98]"
            >
              {i18n.t('common:confirmacion.confirmar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE: MODAL SESIÓN EXPIRADA
// =============================================================================

interface ModalSesionExpiradaProps {
  onConfirm: () => void;
}

const ModalSesionExpirada: React.FC<ModalSesionExpiradaProps> = ({ onConfirm }) => {
  return (
    <div
      className="fixed inset-0 z-10000 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm lg:max-w-md overflow-hidden rounded-2xl border-2 border-slate-300 shadow-lg animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]"
        style={{ background: '#fff' }}
      >
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-amber-100">
              <Lock className="w-5 h-5 text-amber-600" strokeWidth={2} />
            </div>
            <div className="flex-1">
              <h3 className="text-slate-800 font-bold text-base lg:text-lg leading-tight mb-1.5">
                Sesión expirada
              </h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Tu sesión ha expirado por inactividad.
                <br />
                Por favor, inicia sesión nuevamente.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 px-4 rounded-xl text-sm lg:text-base font-bold text-white shadow-lg shadow-slate-700/30 active:scale-[0.98] lg:cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #334155, #1e293b)' }}
          >
            Ir al login
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// PROVIDER
// =============================================================================

export const NotificacionesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [confirmacion, setConfirmacion] = useState<ConfirmacionState | null>(null);

  const agregar = useCallback((tipo: TipoNotificacion, mensaje: string, titulo?: string) => {
    // Si hay un rate limit activo (429), suprimir toasts de error
    if (tipo === 'error') {
      const hasta = localStorage.getItem('ay_rate_limit_hasta');
      const rateLimitActivo = hasta && parseInt(hasta) > Date.now();
      if (rateLimitActivo) return;
    }

    const nuevaNotificacion: Notificacion = {
      id: `${Date.now()}-${Math.random()}`,
      tipo,
      mensaje,
      titulo,
    };
    setNotificaciones((prev) => [...prev, nuevaNotificacion]);
  }, []);

  const remover = useCallback((id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const mostrarConfirmacion = useCallback((state: ConfirmacionState) => {
    setConfirmacion(state);
  }, []);

  const ocultarConfirmacion = useCallback(() => {
    setConfirmacion(null);
  }, []);

  return (
    <NotificacionesContext.Provider value={{ agregar, remover, mostrarConfirmacion, ocultarConfirmacion }}>
      {children}
      <ContenedorNotificaciones notificaciones={notificaciones} onClose={remover} />

      {confirmacion && (
        <ModalConfirmacionToast
          options={{ titulo: confirmacion.titulo, descripcion: confirmacion.descripcion }}
          onConfirm={() => {
            confirmacion.onConfirm();
            setConfirmacion(null);
          }}
          onCancel={() => {
            confirmacion.onCancel();
            setConfirmacion(null);
          }}
        />
      )}

      <style>{`
        @keyframes confirmIn {
          from {
            transform: translateY(-14px) scale(0.97);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.92);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </NotificacionesContext.Provider>
  );
};

// =============================================================================
// API PÚBLICA: OBJETO NOTIFICAR
// =============================================================================

let notificacionesContext: NotificacionesContextType | null = null;

export const _inicializarNotificaciones = (context: NotificacionesContextType) => {
  notificacionesContext = context;
};

export const _useInicializarNotificaciones = () => {
  const context = useNotificaciones();
  useEffect(() => {
    _inicializarNotificaciones(context);
  }, [context]);
};

export const notificar = {
  exito: (mensaje: string, titulo?: string): void => {
    if (!notificacionesContext) {
      console.warn('NotificacionesProvider no está inicializado');
      return;
    }
    notificacionesContext.agregar('exito', mensaje, titulo);
  },

  error: (mensaje: string, titulo?: string): void => {
    if (!notificacionesContext) {
      console.warn('NotificacionesProvider no está inicializado');
      return;
    }
    notificacionesContext.agregar('error', mensaje, titulo);
  },

  advertencia: (mensaje: string, titulo?: string): void => {
    if (!notificacionesContext) {
      console.warn('NotificacionesProvider no está inicializado');
      return;
    }
    notificacionesContext.agregar('advertencia', mensaje, titulo);
  },

  info: (mensaje: string, titulo?: string): void => {
    if (!notificacionesContext) {
      console.warn('NotificacionesProvider no está inicializado');
      return;
    }
    notificacionesContext.agregar('info', mensaje, titulo);
  },

  confirmar: async (titulo: string, descripcion?: string): Promise<boolean> => {
    if (!notificacionesContext) {
      console.warn('NotificacionesProvider no está inicializado');
      return window.confirm(`${titulo}\n${descripcion || ''}`);
    }

    return new Promise((resolve) => {
      notificacionesContext!.mostrarConfirmacion({
        titulo,
        descripcion,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  },

  sesionExpirada: async (): Promise<void> => {
    return new Promise((resolve) => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const root = createRoot(container);

      const cleanup = () => {
        root.unmount();
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
      };

      const handleConfirm = () => {
        cleanup();
        resolve();
      };

      root.render(React.createElement(ModalSesionExpirada, { onConfirm: handleConfirm }));
    });
  },
};

export const InicializadorNotificaciones: React.FC = () => {
  _useInicializarNotificaciones();
  return null;
};

export const NotificacionesProviderConInicializador: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <NotificacionesProvider>
      <InicializadorNotificaciones />
      {children}
    </NotificacionesProvider>
  );
};

export default notificar;
