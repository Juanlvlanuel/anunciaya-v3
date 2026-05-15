/**
 * notificaciones.tsx (v4.0 - Tokens corregidos + estilo congruente)
 * ==================================================================
 * Sistema de notificaciones para AnunciaYA v3.0
 * Toasts con progress bar · Modal confirmación · Modal sesión expirada
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { X } from 'lucide-react';
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

const TOAST_DURATION = 2500;

// Ícono dentro de círculo sólido del color semántico, glifo blanco —
// estilo alineado al handoff design_handoff_menu_drawer (toast pill glass).
// El color sigue usándose para la barra de progreso inferior.
const configTipo: Record<TipoNotificacion, {
  color: string;
  icon: React.ReactNode;
}> = {
  exito: {
    color: '#2D9C5F',
    icon: (
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
        <path d="m5 12 5 5 9-11" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    color: '#dc2626',
    icon: (
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
        <path d="M6 6l12 12M18 6 6 18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  advertencia: {
    color: '#d97706',
    icon: (
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
        <path d="M12 8v5M12 16v.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  info: {
    color: '#2563eb',
    icon: (
      <svg width="13" height="13" fill="none" viewBox="0 0 24 24">
        <path d="M12 11v6M12 7.5v.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
    setTimeout(() => onClose(notificacion.id), 200);
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
        transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        className="relative overflow-hidden rounded-full bg-white/70 backdrop-blur-xl"
        style={{
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow:
            '0 10px 30px rgba(15, 23, 42, 0.15), 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
          width: 'min(440px, calc(100vw - 32px))',
        }}
      >
        {/* Contenido — padding lateral generoso para respetar el rounded-full */}
        <div className="flex items-center gap-3 px-5 py-3">
          {/* Ícono blanco dentro de círculo sólido del color semántico
              (estilo handoff design_handoff_menu_drawer). */}
          <div
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: config.color }}
            aria-hidden="true"
          >
            {config.icon}
          </div>

          {/* Texto — flex-1 para empujar la X al borde derecho */}
          <div className="min-w-0 flex-1">
            {notificacion.titulo && (
              <p className="text-[15px] font-bold text-slate-800 leading-tight">
                {notificacion.titulo}
              </p>
            )}
            <p
              className={`text-[15px] leading-snug line-clamp-2 ${
                notificacion.titulo ? 'text-slate-600 font-medium mt-0.5' : 'text-slate-700 font-semibold'
              }`}
            >
              {notificacion.mensaje}
            </p>
          </div>

          {/* Cerrar — círculo gris discreto */}
          <button
            onClick={cerrar}
            aria-label="Cerrar notificación"
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/70 text-slate-600 backdrop-blur-sm transition-colors lg:cursor-pointer lg:hover:bg-slate-300/80"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Barra de progreso — fina, en la base. Recortada por el rounded-full
            en los extremos pero visible en el centro: sutil y elegante. */}
        <div
          className="absolute bottom-0 left-0 h-[3px] w-full"
          style={{ background: `${config.color}10` }}
          aria-hidden="true"
        >
          <div
            className="h-full"
            style={{
              width: `${progreso}%`,
              background: config.color,
              opacity: 0.5,
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
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-9999 bg-black/40 transition-opacity duration-300 ${saliendo ? 'opacity-0' : 'opacity-100'}`}
        onClick={() => handleClose(onCancel)}
      />

      {/* Modal centrado */}
      <div className="fixed inset-0 z-10000 flex items-center justify-center px-4 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white transition-all duration-300
            ${saliendo ? 'opacity-0 scale-95' : 'animate-[confirmIn_0.3s_cubic-bezier(0.22,1,0.36,1)]'}
          `}
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        >
          {/* Header */}
          <div className="px-5 pt-5 pb-3 flex items-start gap-3">
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.2)' }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path d="M10 6V11M10 13.5V14" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                {options.titulo}
              </h3>
              {options.descripcion && (
                <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                  {options.descripcion}
                </p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="px-5 pb-5 pt-2 flex gap-2.5">
            <button
              onClick={() => handleClose(onCancel)}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-600 border-2 border-slate-300 hover:bg-slate-100 cursor-pointer active:scale-[0.98]"
            >
              {i18n.t('common:confirmacion.cancelar')}
            </button>
            <button
              onClick={() => handleClose(onConfirm)}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold text-white cursor-pointer active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 12px rgba(30,41,59,0.3)' }}
            >
              {i18n.t('common:confirmacion.confirmar')}
            </button>
          </div>
        </div>
      </div>
    </>
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
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
    >
      <div className="w-full max-w-sm lg:max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl flex animate-[scaleIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        <div
          className="shrink-0 w-24 lg:w-28 bg-slate-50 border-r border-slate-200 flex items-center justify-center"
          style={{ perspective: '200px' }}
        >
          <svg
            className="w-12 h-12 lg:w-14 lg:h-14 text-slate-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ overflow: 'visible' }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <g style={{
              animation: 'candadoBisagra 3000ms ease-in-out 250ms infinite',
              transformOrigin: '0 100%',
              transformBox: 'fill-box',
              transformStyle: 'preserve-3d',
            }}>
              <path d="M7 11 V7 a5 5 0 0 1 10 0 V11" />
            </g>
          </svg>
        </div>

        <div className="flex-1 min-w-0 p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-slate-900 font-bold text-base lg:text-lg leading-tight mb-1">
              Sesión expirada
            </h3>
            <p className="text-slate-600 text-sm font-medium leading-relaxed">
              Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente.
            </p>
          </div>
          <button
            onClick={onConfirm}
            className="w-full py-2.5 px-4 rounded-xl text-sm lg:text-base font-bold text-white active:scale-[0.98] lg:cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #1e293b, #334155)',
              boxShadow: '0 3px 10px rgba(30, 41, 59, 0.35)',
            }}
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
        @keyframes candadoBisagra {
          0%, 18% { transform: rotateY(0deg); }
          50% { transform: rotateY(180deg); }
          82%, 100% { transform: rotateY(0deg); }
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
