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
import { Check, ChevronRight, Settings2 } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Wallet = (p: IconoWrapperProps) => <Icon icon={ICONOS.cartera} {...p} />;
import { useAuthStore } from '../../../../../stores/useAuthStore';

interface CardYAProps {
  participaCardYA: boolean;
  onToggle: (valor: boolean) => void;
}

// CSS animations para el preview dark (mismas que WidgetCardYA)
const PREVIEW_STYLES = `
  @keyframes cardya-preview-bubble {
    0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.5; }
    30% { opacity: 0.7; }
    70% { transform: translateY(-80px) translateX(30px) scale(0.8); opacity: 0.5; }
    100% { transform: translateY(-120px) translateX(-20px) scale(0.5); opacity: 0; }
  }
  .cardya-preview-bubble {
    position: absolute; border-radius: 50%;
    background: radial-gradient(circle at 30% 30%, rgba(251,191,36,0.6), rgba(251,191,36,0.15));
    pointer-events: none;
    animation: cardya-preview-bubble ease-in-out infinite;
    box-shadow: 0 0 15px rgba(251,191,36,0.4);
  }
  .cardya-preview-bubble:nth-child(1) { width:18px;height:18px;bottom:10%;left:10%;animation-delay:0s;animation-duration:9s; }
  .cardya-preview-bubble:nth-child(2) { width:15px;height:15px;bottom:5%;left:30%;animation-delay:2s;animation-duration:10s; }
  .cardya-preview-bubble:nth-child(3) { width:20px;height:20px;bottom:8%;right:25%;animation-delay:4s;animation-duration:11s; }
  .cardya-preview-bubble:nth-child(4) { width:16px;height:16px;bottom:15%;right:8%;animation-delay:6s;animation-duration:9.5s; }
  .cardya-preview-bubble:nth-child(5) { width:17px;height:17px;bottom:12%;left:50%;animation-delay:8s;animation-duration:10.5s; }

  @keyframes cardya-preview-chip-shine {
    0%,100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .cardya-preview-chip {
    width:34px; height:26px;
    background: linear-gradient(135deg,#f0f0f0 0%,#d4d4d4 10%,#ffffff 20%,#c0c0c0 30%,#e8e8e8 40%,#b8b8b8 50%,#e8e8e8 60%,#c0c0c0 70%,#ffffff 80%,#d4d4d4 90%,#f0f0f0 100%);
    background-size: 200% 200%;
    animation: cardya-preview-chip-shine 4s ease-in-out infinite;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.3);
    position: relative;
  }
  .cardya-preview-chip::before {
    content:''; position:absolute; inset:4px;
    background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(192,192,192,0.5) 50%, rgba(255,255,255,0.3) 100%);
    border-radius: 3px;
  }
  .cardya-preview-chip::after {
    content:''; position:absolute; top:50%; left:50%;
    transform: translate(-50%,-50%); width:70%; height:70%;
    background: repeating-linear-gradient(0deg,rgba(0,0,0,0.1) 0px,transparent 1px,transparent 3px,rgba(0,0,0,0.1) 4px),
                repeating-linear-gradient(90deg,rgba(0,0,0,0.1) 0px,transparent 1px,transparent 3px,rgba(0,0,0,0.1) 4px);
  }
  @keyframes cardya-preview-ring {
    0%   { transform: rotate(0deg); }
    2%   { transform: rotate(-3deg); }
    4%   { transform: rotate(3deg); }
    6%   { transform: rotate(-3deg); }
    8%   { transform: rotate(3deg); }
    10%  { transform: rotate(-3deg); }
    12%  { transform: rotate(3deg); }
    14%  { transform: rotate(0deg); }
    100% { transform: rotate(0deg); }
  }
  @keyframes cardya-bubble-rise {
    0%   { opacity: 0;   transform: translateX(-50%) translateY(0px)    scale(0.6); }
    18%  { opacity: 1;   transform: translateX(-50%) translateY(-14px)   scale(1.05); }
    35%  { opacity: 1;   transform: translateX(-50%) translateY(-22px)   scale(1); }
    75%  { opacity: 1;   transform: translateX(-50%) translateY(-38px)   scale(1); }
    100% { opacity: 0;   transform: translateX(-50%) translateY(-62px)   scale(0.85); }
  }
  .cardya-bubble {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    white-space: nowrap;
    pointer-events: none;
    animation: cardya-bubble-rise 2.2s cubic-bezier(0.22,1,0.36,1) forwards;
    font-size: 13px;
    font-weight: 700;
    padding: 7px 14px;
    border-radius: 999px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.15);
    z-index: 60;
  }
`;

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
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);

  const mostrarToast = (msg: string) => {
    setToast({ msg, key: Date.now() });
    setTimeout(() => setToast(null), 2100);
  };

  // Inyectar CSS del preview dark
  useEffect(() => {
    const id = 'cardya-tab-preview-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = PREVIEW_STYLES;
      document.head.appendChild(el);
    }
  }, []);

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
      mostrarToast('¡CardYA activado! 😊');
    } else {
      setMostrarConfirmacion(true);
    }
  };

  const confirmarDesactivar = () => {
    onToggle(false);
    setMostrarConfirmacion(false);
    mostrarToast('CardYA desactivado 😔');
  };

  const BENEFICIOS = [
    { titulo: 'Clientes recurrentes', desc: 'Los puntos incentivan a regresar' },
    { titulo: 'Mayor ticket promedio', desc: 'Compran más para acumular puntos' },
    { titulo: 'Sin costo adicional', desc: 'Incluido en tu membresía AnunciaYA' },
    { titulo: 'Estadísticas en tiempo real', desc: 'Conoce el comportamiento de tus clientes' },
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

      <div className="relative z-10">

        {/* ══════════════════════════════════════════════════════
            MÓVIL: layout columna (< lg) — sin cambios
        ══════════════════════════════════════════════════════ */}
        <div className="lg:hidden flex flex-col">

          {/* Barra header móvil */}
          <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-t-xl${!participaCardYA ? ' rounded-b-xl' : ''}`}>
            {/* Logo */}
            <div className="flex items-center gap-3 shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                <Wallet className="w-5 h-5 text-black" strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-xl font-extrabold text-white leading-none">
                  Card<span className="text-amber-400">YA</span>
                </div>
                <div className="text-sm text-white/65 font-medium mt-1">
                  Sistema de lealtad
                </div>
              </div>
            </div>
            {/* Toggle móvil */}
            <div ref={popoverMobileRef} className="relative">
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
          </div>

          {/* Cuerpo móvil */}
          {participaCardYA ? (
            <div className="bg-white border-t border-slate-300 px-4 py-4 space-y-3 rounded-b-xl">
              {BENEFICIOS.map(b => (
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
          ) : (
            <div className="bg-white border-t border-slate-300 px-4 py-4 space-y-3 rounded-b-xl">
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

        {/* ══════════════════════════════════════════════════════
            DESKTOP: layout columna (>= lg)
        ══════════════════════════════════════════════════════ */}
        <div className="hidden lg:flex flex-col rounded-xl">

          {/* ── HEADER: logo + toggle + botón (fondo oscuro) ── */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-3 2xl:py-3.5 rounded-t-xl">
            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className="w-9 h-9 2xl:w-10 2xl:h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                <Wallet className="w-4.5 h-4.5 2xl:w-5 2xl:h-5 text-black" strokeWidth={2.5} />
              </div>
              <div className="text-xl 2xl:text-2xl font-extrabold text-white leading-none">
                Card<span className="text-amber-400">YA</span>
              </div>
            </div>

            {/* Pregunta central */}
            <div className="flex-1 text-center px-4">
              <p className="text-base 2xl:text-lg font-bold text-white">
                {participaCardYA
                  ? '¡Cada compra acerca a tus clientes a su próxima recompensa!'
                  : '¿Quieres que tus clientes acumulen puntos y regresen?'}
              </p>
            </div>

            {/* Toggle + botón */}
            <div ref={popoverDesktopRef} className="flex items-center gap-3 2xl:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] 2xl:text-sm text-white/65 font-medium">{participaCardYA ? 'Activo' : 'Inactivo'}</span>
                <div className="relative">
                  {toast && (
                    <span
                      key={toast.key}
                      className="cardya-bubble"
                      style={{
                        background: toast.msg.includes('😔') ? '#1e293b' : '#f59e0b',
                        color: toast.msg.includes('😔') ? '#94a3b8' : '#000000',
                      }}
                    >
                      {toast.msg.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim()}
                      <span style={{ fontSize: '20px', marginLeft: '6px', lineHeight: 1 }}>
                        {toast.msg.match(/[\u{1F300}-\u{1FFFF}]/gu)?.[0]}
                      </span>
                    </span>
                  )}
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
                </div>
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
                  className="flex items-center gap-1.5 h-10 lg:h-9 2xl:h-10 px-3.5 rounded-lg text-black font-bold text-[11px] 2xl:text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  <Settings2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                  Configurar
                </button>
              ) : (
                <button
                  onClick={() => { onToggle(true); mostrarToast('¡CardYA activado! 😊'); }}
                  className="flex items-center gap-1.5 h-10 lg:h-9 2xl:h-10 px-4 rounded-lg text-black font-bold text-[11px] 2xl:text-sm cursor-pointer whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  Activar CardYA
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── CUERPO: tarjeta dark + beneficios (área blanca) ── */}
          <div className="relative bg-white border-t border-slate-300 rounded-b-xl flex flex-row">
            {/* Overlay cuando está desactivado */}
            {!participaCardYA && (
              <div className="absolute inset-0 rounded-b-xl z-10 pointer-events-none"
                style={{ background: 'rgba(148,163,184,0.45)' }} />
            )}

            {/* Tarjeta preview — mismo padding que WidgetCardYA en ColumnaIzquierda */}
            <div className="p-4 lg:p-3 2xl:p-4 shrink-0 w-[230px] 2xl:w-[270px]">
              <div
                className="relative overflow-hidden 2xl:rounded-2xl lg:rounded-lg p-3"
                style={{
                  background: '#000000',
                  aspectRatio: '1.586/1',
                  animation: 'cardya-preview-ring 10s ease-in-out infinite',
                }}
              >
                {/* Glow amber */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(245,158,11,0.07) 0%, transparent 50%)' }} />
                {/* Grid pattern */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{
                    opacity: 0.08,
                    backgroundImage: `repeating-linear-gradient(0deg,#fff 0px,#fff 1px,transparent 1px,transparent 30px),
                                      repeating-linear-gradient(90deg,#fff 0px,#fff 1px,transparent 1px,transparent 30px)`,
                  }} />
                {/* Burbujas */}
                <div className="cardya-preview-bubble" />
                <div className="cardya-preview-bubble" />
                <div className="cardya-preview-bubble" />
                <div className="cardya-preview-bubble" />
                <div className="cardya-preview-bubble" />

                {/* Contenido */}
                <div className="relative z-10 h-full flex flex-col">
                  {/* Header logo */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      <Wallet className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-lg font-extrabold tracking-tight text-white">Card</span>
                      <span className="text-xl font-extrabold tracking-tight text-amber-400">YA</span>
                    </div>
                  </div>
                  {/* Chip — mismo espaciado que WidgetCardYA */}
                  <div className="2xl:mb-auto lg:mb-3 2xl:mt-2 lg:-mt-1">
                    <div className="cardya-preview-chip" />
                  </div>
                  {/* Footer */}
                  <div className="flex items-end justify-between text-xs">
                    <div>
                      <div className="2xl:text-[10px] lg:text-[9px] uppercase tracking-wide font-semibold text-slate-300">Miembro desde</div>
                      <div className="2xl:text-[14px] lg:text-[13px] font-bold text-amber-400">Enero 2026</div>
                    </div>
                    <div className="text-right">
                      <div className="2xl:text-[10px] lg:text-[9px] uppercase tracking-wide font-semibold text-slate-300">Negocios</div>
                      <div className="2xl:text-[14px] lg:text-[13px] font-bold text-amber-400">0 activos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Beneficios — siempre visibles */}
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3 lg:gap-x-3 lg:gap-y-2.5 2xl:gap-x-4 2xl:gap-y-3 content-center px-5 py-4 2xl:py-5">
              {BENEFICIOS.map(b => (
                <div key={b.titulo} className="flex items-start gap-2">
                  <div className="w-6 h-6 2xl:w-7 2xl:h-7 rounded-full flex items-center justify-center shrink-0 bg-amber-100 border-2 border-amber-300 mt-0.5">
                    <Check className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-amber-600" strokeWidth={3} />
                  </div>
                  <div>
                    <div className="text-base 2xl:text-base font-bold text-slate-700 leading-tight">{b.titulo}</div>
                    <div className="text-sm 2xl:text-sm font-medium text-slate-500 leading-tight mt-0.5">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
