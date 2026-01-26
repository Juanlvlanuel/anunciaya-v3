/**
 * notificaciones.tsx
 * =================
 * Sistema de notificaciones Ultra Clean para AnunciaYA
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
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
// CONFIGURACIÓN DE ESTILOS
// =============================================================================

const estilosNotificacion = {
  exito: {
    icon: '✅',
    accent: 'bg-green-500',
    border: 'border-green-500/50',
    bg: 'bg-slate-900/95',
    text: 'text-white',
    subtitle: 'text-slate-400',
  },
  error: {
    icon: '❌',
    accent: 'bg-red-500',
    border: 'border-red-500/50',
    bg: 'bg-slate-900/95',
    text: 'text-white',
    subtitle: 'text-slate-400',
  },
  advertencia: {
    icon: '⚠️',
    accent: 'bg-amber-500',
    border: 'border-amber-500/50',
    bg: 'bg-slate-900/95',
    text: 'text-white',
    subtitle: 'text-slate-400',
  },
  info: {
    icon: 'ℹ️',
    accent: 'bg-blue-500',
    border: 'border-blue-500/50',
    bg: 'bg-slate-900/95',
    text: 'text-white',
    subtitle: 'text-slate-400',
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
  const [saliendo, setSaliendo] = useState(false);
  const estilo = estilosNotificacion[notificacion.tipo];

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 3500);

    return () => clearTimeout(timer);
  }, [notificacion.id]);

  const handleClose = () => {
    setSaliendo(true);
    setTimeout(() => {
      onClose(notificacion.id);
    }, 300);
  };

  return (
    <div
      className={`
        mb-3 backdrop-blur-md ${estilo.bg} border ${estilo.border} rounded-2xl shadow-lg
        overflow-hidden flex items-center transition-all duration-300
        ${saliendo ? 'animate-slide-out-minimal opacity-0 translate-y-[-100px]' : 'animate-slide-in-minimal'}
      `}
      style={{
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className={`${estilo.accent} w-1.5 h-full shrink-0`}></div>
      <div className="flex items-center gap-0 p-4 pr-10 flex-1">
        <span className="text-2xl shrink-0">{estilo.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`${estilo.text} font-medium text-base line-clamp-2 text-center`}>{notificacion.mensaje}</p>
        </div>
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-white hover:text-white/80 transition-colors shrink-0"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
    <div
      className="fixed top-5 left-1/2 -translate-x-1/2 z-9999 w-full max-w-xs px-4 pointer-events-none"
      style={{ perspective: '1000px' }}
    >
      <div className="pointer-events-auto">
        {notificaciones.map((notificacion) => (
          <NotificacionToast key={notificacion.id} notificacion={notificacion} onClose={onClose} />
        ))}
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
        @keyframes slide-in-minimal {
          from {
            transform: translateY(-100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slide-out-minimal {
          to {
            transform: translateY(-100px);
            opacity: 0;
          }
        }

        .animate-slide-in-minimal {
          animation: slide-in-minimal 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-slide-out-minimal {
          animation: slide-out-minimal 0.2s ease-in;
        }
      `}</style>
    </NotificacionesContext.Provider>
  );
};

// =============================================================================
// COMPONENTE: MODAL DE CONFIRMACIÓN ESTILO TOAST (RESPONSIVE)
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
    setTimeout(() => {
      callback();
    }, 300);
  };

  return (
    <div
      className="fixed top-3 lg:top-4 2xl:top-5 left-1/2 -translate-x-1/2 z-10000 w-full max-w-[340px] lg:max-w-[380px] 2xl:max-w-md px-3 lg:px-4 pointer-events-none"
      style={{ perspective: '1000px' }}
    >
      <div
        className={`
          pointer-events-auto backdrop-blur-md bg-slate-900/95 border border-amber-500/50 
          rounded-xl lg:rounded-xl 2xl:rounded-2xl shadow-2xl overflow-hidden transition-all duration-300
          ${saliendo ? 'animate-slide-out-minimal opacity-0 translate-y-[-100px]' : 'animate-slide-in-minimal'}
        `}
        style={{
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        {/* Línea de color superior */}
        <div className="bg-amber-500 h-1 lg:h-1 2xl:h-1.5 w-full"></div>

        {/* Contenido */}
        <div className="p-3 lg:p-3.5 2xl:p-4">
          {/* Header con ícono */}
          <div className="flex items-start gap-2 lg:gap-2.5 2xl:gap-3 mb-2.5 lg:mb-3 2xl:mb-3.5">
            <div className="shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 2xl:w-5 2xl:h-5 text-amber-500" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-sm lg:text-sm 2xl:text-base leading-tight">
                {options.titulo}
              </h3>
              {options.descripcion && (
                <p className="text-slate-400 text-xs lg:text-xs 2xl:text-sm leading-relaxed mt-0.5">
                  {options.descripcion}
                </p>
              )}
            </div>
            <button
              onClick={() => handleClose(onCancel)}
              className="shrink-0 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Botones */}
          <div className="flex gap-2 lg:gap-2 2xl:gap-2.5">
            <button
              onClick={() => handleClose(onCancel)}
              className="flex-1 bg-slate-700/80 hover:bg-slate-600 text-white font-medium py-1.5 lg:py-2 2xl:py-2.5 px-3 lg:px-3.5 2xl:px-4 rounded-lg lg:rounded-xl 2xl:rounded-xl transition-colors text-xs lg:text-sm 2xl:text-sm"
            >
              {i18n.t('common:confirmacion.cancelar')}
            </button>
            <button
              onClick={() => handleClose(onConfirm)}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-1.5 lg:py-2 2xl:py-2.5 px-3 lg:px-3.5 2xl:px-4 rounded-lg lg:rounded-xl 2xl:rounded-xl transition-colors text-xs lg:text-sm 2xl:text-sm"
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
  const esMobil = window.innerWidth < 640;

  return (
    <div className="fixed inset-0 z-10000 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden animate-scale-in ${
          esMobil ? 'w-full max-w-sm' : 'w-full max-w-md'
        }`}
      >
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className="bg-amber-500/20 rounded-xl p-3 shrink-0">
              <span className="text-3xl">🔒</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg mb-2">Sesión expirada</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tu sesión ha expirado por inactividad.
                <br />
                Por favor, inicia sesión nuevamente.
              </p>
            </div>
          </div>
        </div>
        <div className="p-6 pt-2 bg-slate-900/50">
          <button
            onClick={onConfirm}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Ir al login
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
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

      const cleanup = () => {
        document.body.removeChild(container);
      };

      const handleConfirm = () => {
        cleanup();
        resolve();
      };

      const root = (window as any).ReactDOM?.createRoot
        ? (window as any).ReactDOM.createRoot(container)
        : null;

      if (root) {
        root.render(React.createElement(ModalSesionExpirada, { onConfirm: handleConfirm }));
      } else {
        window.alert('Sesión expirada. Por favor, inicia sesión nuevamente.');
        cleanup();
        resolve();
      }
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