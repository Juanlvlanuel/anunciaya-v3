/**
 * ============================================================================
 * COMPONENTE: CardYA Widget
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/CardYA.tsx
 *
 * Widget horizontal negro/dorado que muestra el estado del programa de lealtad
 * y permite activarlo / desactivarlo.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Check, ChevronRight, Settings2 } from 'lucide-react';
import { useAuthStore } from '../../../../../stores/useAuthStore';

interface CardYAProps {
  participaCardYA: boolean;
  onToggle: (valor: boolean) => void;
}

// ============================================================================
// POPOVER DE CONFIRMACIÓN (compartido entre mobile y desktop)
// ============================================================================

interface PopoverConfirmacionProps {
  onCancelar: () => void;
  onConfirmar: () => void;
}

function PopoverConfirmacion({ onCancelar, onConfirmar }: PopoverConfirmacionProps) {
  return (
    <div className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-2xl z-50 overflow-hidden bg-white"
      style={{ border: '2px solid #1e293b' }}>
      {/* Flecha */}
      <div className="absolute -top-2 right-4 w-3.5 h-3.5 bg-slate-800 transform rotate-45" />

      {/* Header */}
      <div className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
        <span className="font-bold text-white text-sm lg:text-xs 2xl:text-sm">¿Desactivar CardYA?</span>
      </div>

      {/* Cuerpo */}
      <div className="px-4 py-3">
        <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-800">ScanYA dejará de funcionar</span> para ti y tus empleados.
        </p>
        <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 mt-1">
          Los puntos de tus clientes se mantendrán guardados.
        </p>
      </div>

      {/* Botones */}
      <div className="flex gap-2 px-4 pb-3">
        <button
          onClick={onCancelar}
          className="flex-1 py-2 text-base lg:text-sm 2xl:text-base font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          className="flex-1 py-2 text-base lg:text-sm 2xl:text-base font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
        >
          Desactivar
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function CardYA({ participaCardYA, onToggle }: CardYAProps) {
  const navigate = useNavigate();

  const usuario = useAuthStore((s) => s.usuario);
  const setUsuario = useAuthStore((s) => s.setUsuario);

  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  // 2 refs: uno para mobile, uno para desktop
  const popoverMobileRef = useRef<HTMLDivElement>(null);
  const popoverDesktopRef = useRef<HTMLDivElement>(null);

  // Sincronizar participaPuntos con auth store
  useEffect(() => {
    if (usuario && usuario.participaPuntos !== participaCardYA) {
      setUsuario({ ...usuario, participaPuntos: participaCardYA });
    }
  }, [participaCardYA]);

  // Cerrar popover al hacer click fuera de ambos toggles
  useEffect(() => {
    if (!mostrarConfirmacion) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const dentroDeMobile = popoverMobileRef.current?.contains(target) ?? false;
      const dentroDeDesktop = popoverDesktopRef.current?.contains(target) ?? false;
      if (!dentroDeMobile && !dentroDeDesktop) {
        setMostrarConfirmacion(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mostrarConfirmacion]);

  const handleToggle = () => {
    if (!participaCardYA) {
      onToggle(true);
    } else {
      setMostrarConfirmacion(true);
    }
  };

  const confirmarDesactivar = () => {
    onToggle(false);
    setMostrarConfirmacion(false);
  };

  const BENEFICIOS_DESKTOP = [
    { titulo: 'Clientes recurrentes', desc: 'Los puntos incentivan a regresar' },
    { titulo: 'Mayor ticket promedio', desc: 'Compran más para acumular puntos' },
    { titulo: 'Sin costo adicional', desc: 'Incluido en tu membresía AnunciaYA' },
  ];

  return (
    <div
      className="relative rounded-xl"
      style={{ background: '#080808', border: '2px solid rgba(245,158,11,0.25)' }}
    >
      {/* Glow amber sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 10% 50%, rgba(245,158,11,0.07) 0%, transparent 55%)' }}
      />
      {/* Grid pattern sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.10,
          backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 28px),
                            repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 28px)`,
        }}
      />

      <div className="relative z-10 flex flex-col">

        {/* ══════════════════════════════════════════════════════
            BARRA NEGRA: Logo + controles
            Desktop: header del card | Mobile: encabezado completo
        ══════════════════════════════════════════════════════ */}
        <div className={`flex items-center justify-between gap-3 px-4 py-3 2xl:py-3.5 rounded-t-xl${!participaCardYA ? ' lg:rounded-b-xl' : ''}`}>

          {/* Logo */}
          <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3 shrink-0">
            <div
              className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Wallet className="w-5 h-5 lg:w-4.5 lg:h-4.5 2xl:w-5 2xl:h-5 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xl lg:text-sm 2xl:text-base font-extrabold text-white leading-none">
                Card<span className="text-amber-400">YA</span>
              </div>
              <div className="text-sm lg:text-[11px] 2xl:text-sm text-white/65 font-medium mt-1">
                Sistema de lealtad
              </div>
            </div>
          </div>

          {/* Mobile: solo toggle */}
          <div ref={popoverMobileRef} className="lg:hidden relative">
            <button
              onClick={handleToggle}
              className={`relative inline-flex h-7 w-12 items-center rounded-full cursor-pointer ${
                participaCardYA ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span className={`inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-lg ${
                participaCardYA ? 'translate-x-5.5' : 'translate-x-1'
              }`} />
            </button>
            {mostrarConfirmacion && (
              <PopoverConfirmacion
                onCancelar={() => setMostrarConfirmacion(false)}
                onConfirmar={confirmarDesactivar}
              />
            )}
          </div>

          {/* Desktop: toggle + botón */}
          <div ref={popoverDesktopRef} className="hidden lg:flex items-center gap-3 2xl:gap-4">
            <div className="relative flex items-center gap-2">
              <span className="text-[11px] 2xl:text-sm text-white/65 font-medium">Activo</span>
              <button
                onClick={handleToggle}
                className={`relative inline-flex h-6.5 w-11 items-center rounded-full cursor-pointer ${
                  participaCardYA ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ${
                  participaCardYA ? 'translate-x-5.5' : 'translate-x-1'
                }`} />
              </button>
              {mostrarConfirmacion && (
                <PopoverConfirmacion
                  onCancelar={() => setMostrarConfirmacion(false)}
                  onConfirmar={confirmarDesactivar}
                />
              )}
            </div>
            {participaCardYA ? (
              <button
                onClick={() => navigate('/business-studio/puntos')}
                className="flex items-center gap-1.5 h-11 lg:h-10 2xl:h-11 px-3.5 rounded-lg text-black font-bold text-[11px] 2xl:text-sm cursor-pointer whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                <Settings2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                Configurar
              </button>
            ) : (
              <button
                onClick={() => onToggle(true)}
                className="flex items-center gap-1.5 h-11 lg:h-10 2xl:h-11 px-4 rounded-lg text-black font-bold text-[11px] 2xl:text-sm cursor-pointer whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                Activar CardYA
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            CUERPO: beneficios
            Desktop: bg-white (debajo de la barra negra)
            Mobile: continúa sobre fondo negro
        ══════════════════════════════════════════════════════ */}
        {participaCardYA ? (
          <>
            {/* Desktop: cuerpo blanco con bullets */}
            <div className="hidden lg:flex items-start gap-6 2xl:gap-8 bg-white px-5 py-4 2xl:py-5 border-t border-slate-300 rounded-b-xl">
              {BENEFICIOS_DESKTOP.map(b => (
                <div key={b.titulo} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-full flex items-center justify-center shrink-0 bg-amber-100 border-2 border-amber-300">
                    <Check className="w-4 h-4 text-amber-600" strokeWidth={3} />
                  </div>
                  <div>
                    <div className="text-[11px] 2xl:text-sm font-bold text-slate-700 whitespace-nowrap">{b.titulo}</div>
                    <div className="text-[11px] 2xl:text-sm font-medium text-slate-600 whitespace-nowrap">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: cuerpo blanco con bullets + botón */}
            <div className="lg:hidden bg-white border-t border-slate-300 px-4 py-4 space-y-3 rounded-b-xl">
              {[
                { titulo: 'Clientes recurrentes', desc: 'Los puntos incentivan a regresar' },
                { titulo: 'Mayor ticket promedio', desc: 'Compran más para acumular puntos' },
                { titulo: 'Sin costo adicional', desc: 'Incluido en tu membresía AnunciaYA' },
              ].map(b => (
                <div key={b.titulo} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-amber-100 border-2 border-amber-300">
                    <Check className="w-4 h-4 text-amber-600" strokeWidth={3} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-700">{b.titulo}</div>
                    <div className="text-sm font-medium text-slate-600">{b.desc}</div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => navigate('/business-studio/puntos')}
                className="mt-1 flex items-center justify-center gap-2 w-full h-10 rounded-lg text-black font-bold text-sm cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                <Settings2 className="w-4 h-4" />
                Configurar Puntos
              </button>
            </div>
          </>
        ) : (
          /* Inactivo mobile: cuerpo blanco */
          <div className="lg:hidden bg-white border-t border-slate-300 px-4 py-4 space-y-3 rounded-b-xl">
            <div className="text-sm font-medium text-slate-600">
              Retén clientes y aumenta ventas sin costo adicional
            </div>
            <button
              onClick={() => onToggle(true)}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-lg text-black font-bold text-sm cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              Activar CardYA
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
