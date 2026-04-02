/**
 * ModalDetalleBilletera.tsx
 * ==========================
 * Modal que muestra detalles completos de la billetera en un negocio específico.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalDetalleBilletera.tsx
 */

import { Store, TrendingUp, TrendingDown, Award, Clock, ChevronRight, Zap } from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import Tooltip from '../../../../components/ui/Tooltip';
import type { DetalleNegocioBilletera } from '../../../../types/cardya';
import { useChatYAStore } from '../../../../stores/useChatYAStore';
import { useUiStore } from '../../../../stores/useUiStore';

// Configuración de niveles
const NIVELES_CONFIG = {
  bronce: {
    color: '#92400e',
    colorLight: '#d97706',
    bg: 'linear-gradient(135deg, #fbbf24, #d97706)',
    badgeBg: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    barBg: 'linear-gradient(90deg, #fbbf24, #d97706)',
    label: 'Bronce',
    icono: '🥉',
  },
  plata: {
    color: '#475569',
    colorLight: '#64748b',
    bg: 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
    badgeBg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
    barBg: 'linear-gradient(90deg, #94a3b8, #64748b)',
    label: 'Plata',
    icono: '🥈',
  },
  oro: {
    color: '#a16207',
    colorLight: '#ca8a04',
    bg: 'linear-gradient(135deg, #fde047, #eab308)',
    badgeBg: 'linear-gradient(135deg, #fef9c3, #fde68a)',
    barBg: 'linear-gradient(90deg, #fde047, #eab308)',
    label: 'Oro',
    icono: '🥇',
  },
} as const;

export default function ModalDetalleBilletera({
  abierto,
  onCerrar,
  billetera,
  onVerHistorial,
}: {
  abierto: boolean;
  onCerrar: () => void;
  billetera: DetalleNegocioBilletera | null;
  onVerHistorial?: (negocioNombre: string) => void;
}) {
  if (!abierto || !billetera) return null;

  const nivel = NIVELES_CONFIG[billetera.nivelActual];
  const nivelesActivos = billetera.nivelesActivos ?? true;
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  const handleChatYA = () => {
    if (!billetera.negocioUsuarioId) return;

    // Limpiar entrada huérfana de ModalBottom en el historial
    if (history.state?._modalBottom) {
      const estado = { ...history.state };
      delete estado._modalBottom;
      history.replaceState(estado, '');
    }

    abrirChatTemporal({
      id: `temp_${Date.now()}`,
      otroParticipante: {
        id: billetera.negocioUsuarioId,
        nombre: billetera.negocioNombre,
        apellidos: '',
        avatarUrl: billetera.negocioLogo,
        negocioNombre: billetera.negocioNombre,
        negocioLogo: billetera.negocioLogo ?? undefined,
      },
      datosCreacion: {
        participante2Id: billetera.negocioUsuarioId,
        participante2Modo: 'comercial',
        participante2SucursalId: billetera.negocioSucursalId ?? '',
        contextoTipo: 'negocio',
      },
    });
    abrirChatYA();
    onCerrar();
  };

  const formatearFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="md"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      alturaMaxima="xl"
      colorHandle="rgba(255,255,255,0.45)"
      headerOscuro
      className="max-w-xs lg:max-w-md 2xl:max-w-lg"
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh] 2xl:max-h-[75vh]">

      {/* ── Header dark con logo ── */}
      <div
        className="relative overflow-hidden px-5 lg:px-4 2xl:px-5 pt-8 pb-4 lg:py-3.5 2xl:py-4 shrink-0 lg:rounded-t-2xl"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative z-10">
          {/* ── MÓVIL: Logo + Nombre + Nivel + Iconos ── */}
          <div className="lg:hidden flex items-center gap-3">
            {billetera.negocioLogo ? (
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/10 shrink-0">
                <img src={billetera.negocioLogo} alt={billetera.negocioNombre} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: nivel.bg }}
              >
                <Store className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-white truncate">{billetera.negocioNombre}</h2>
              <div className="flex items-center gap-2 -mt-0.5">
                {nivelesActivos && <span className="text-base">{nivel.icono}</span>}
                {nivelesActivos && <span className="text-sm font-bold text-white/70">Nivel {nivel.label}</span>}
                {billetera.whatsappContacto && (
                  <a
                    href={`https://wa.me/${billetera.whatsappContacto.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 flex items-center justify-center cursor-pointer shrink-0 active:scale-95 transition-transform ml-1"
                  >
                    <img src="/whatsapp.webp" alt="WhatsApp" className="w-8 h-8 object-contain" />
                  </a>
                )}
                <button
                  onClick={handleChatYA}
                  className="w-9 h-9 flex items-center justify-center cursor-pointer shrink-0 active:scale-95 transition-transform"
                >
                  <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="w-8 h-8 object-contain" />
                </button>
              </div>
            </div>
          </div>

          {/* ── PC: Todo en una línea con logo más grande ── */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-3 2xl:gap-3.5 flex-1 min-w-0">
              {billetera.negocioLogo ? (
                <div className="w-12 h-12 2xl:w-12 2xl:h-12 rounded-full overflow-hidden ring-2 ring-white/10 shrink-0">
                  <img src={billetera.negocioLogo} alt={billetera.negocioNombre} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="w-12 h-12 2xl:w-14 2xl:h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: nivel.bg }}
                >
                  <Store className="w-6 h-6 2xl:w-7 2xl:h-7 text-white" strokeWidth={2.5} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-sm 2xl:text-lg font-bold text-white truncate">{billetera.negocioNombre}</h2>
                {nivelesActivos && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs 2xl:text-sm">{nivel.icono}</span>
                    <span className="text-[11px] 2xl:text-sm font-semibold text-white/50">Nivel {nivel.label}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {billetera.whatsappContacto && (
                <Tooltip text="WhatsApp" position="bottom">
                  <a
                    href={`https://wa.me/${billetera.whatsappContacto.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0 hover:scale-110 transition-transform"
                  >
                    <img src="/whatsapp.webp" alt="WhatsApp" className="w-6 h-6 2xl:w-12 2xl:h-12 object-contain" />
                  </a>
                </Tooltip>
              )}
              <Tooltip text="ChatYA" position="bottom">
                <button
                  onClick={handleChatYA}
                  className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0 hover:scale-110 transition-transform"
                >
                  <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="w-6 h-6 2xl:w-9 2xl:h-9 object-contain" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 2xl:p-5">

        {/* Puntos + Progreso en grid dark */}
        <div className={`grid ${nivelesActivos ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-2.5 lg:mb-3 2xl:mb-4`}>
          {/* Puntos disponibles */}
          <div
            className="rounded-xl p-2.5 lg:p-2 2xl:p-3 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '2px solid rgba(255,255,255,0.35)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: nivel.barBg }} />
            {nivelesActivos ? (
              <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                {/* Columna izq: icono + disponibles */}
                <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 shrink-0">
                  <TrendingUp className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-white/40 shrink-0" strokeWidth={1.75} />
                  <div className="flex flex-col items-center">
                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white/40 uppercase tracking-wide">Disponibles</span>
                    <div className="text-2xl lg:text-lg 2xl:text-2xl font-black text-white leading-none">
                      {billetera.puntosDisponibles.toLocaleString()}
                    </div>
                  </div>
                </div>
                {/* Divisor */}
                <div className="w-px self-stretch bg-white/10 shrink-0" />
                {/* Columna der: progreso */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 lg:mb-0.5 2xl:mb-1">
                    <Award className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white/40 shrink-0" strokeWidth={2.5} />
                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white/40 uppercase tracking-wide">Progreso</span>
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${billetera.progreso.porcentaje}%`, background: nivel.barBg }} />
                  </div>
                  {billetera.progreso.puntosFaltantes !== null ? (
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-white/40 mt-0.5 lg:mt-1 leading-snug">
                      Faltan <strong className="text-white/60">{billetera.progreso.puntosFaltantes.toLocaleString()}</strong> pts
                      <br />
                      para{' '}
                      <strong className="text-white/60">
                        {billetera.progreso.siguienteNivel === 'plata' ? '🥈 Plata' : '🥇 Oro'}
                      </strong>
                    </p>
                  ) : (
                    <p className="text-sm lg:text-[11px] 2xl:text-sm mt-0.5 font-black" style={{ color: nivel.colorLight }}>
                      ¡Nivel máximo!
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                <TrendingUp className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-white/40 shrink-0" strokeWidth={1.75} />
                <div className="flex flex-col items-center flex-1">
                  <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white/40 uppercase tracking-wide">Disponibles</span>
                  <div className="text-2xl lg:text-lg 2xl:text-2xl font-black text-white leading-none">
                    {billetera.puntosDisponibles.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Totales (solo cuando !nivelesActivos) */}
          {!nivelesActivos && <div
            className="rounded-xl p-2.5 lg:p-2 2xl:p-3 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '2px solid rgba(255,255,255,0.35)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: nivel.barBg }} />
            <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
              <Award className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-white/40 shrink-0" strokeWidth={1.75} />
              <div className="flex flex-col items-center flex-1">
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white/40 uppercase tracking-wide">Totales</span>
                <div className="text-2xl lg:text-lg 2xl:text-2xl font-black text-white leading-none">
                  {billetera.puntosAcumuladosTotal.toLocaleString()}
                </div>
              </div>
            </div>
          </div>}
        </div>

        {/* Nivel + Multiplicador */}
        {nivelesActivos && (billetera.multiplicador > 1.0 || billetera.beneficios.length > 0) && (
          <div
            className="flex items-center justify-center gap-2 px-3 py-1.5 lg:py-1 2xl:py-1.5 rounded-xl mb-2.5 lg:mb-2 2xl:mb-4 text-center"
            style={{ background: nivel.badgeBg, border: `2px solid ${nivel.color}40` }}
          >
            <Zap className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0" strokeWidth={2.5} style={{ color: nivel.color }} />
            <span className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: nivel.color }}>
              Por ser nivel <span className="text-xl lg:text-lg 2xl:text-xl">{nivel.icono}</span> {nivel.label},{' '}
              <br className="lg:hidden" />
              ganas <strong>x{billetera.multiplicador.toFixed(1)} pts</strong> por compra
            </span>
          </div>
        )}

        {/* Últimas transacciones */}
        <div
          className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
          style={{ border: '2px solid #cbd5e1' }}
        >
          <div
            className="px-3 lg:px-3.5 2xl:px-4 py-2 lg:py-2.5 2xl:py-3 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #e2e8f0, #f1f5f9)', borderBottom: '1px solid #cbd5e1' }}
          >
            <Clock className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600" strokeWidth={2.5} />
            <h3 className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">Últimas Transacciones</h3>
          </div>

          {billetera.ultimasTransacciones.length === 0 ? (
            <div className="p-5 lg:p-6 2xl:p-8 text-center">
              <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600">Sin transacciones recientes</p>
            </div>
          ) : (
            <div>
              {billetera.ultimasTransacciones.slice(0, 4).map((tx, i) => {
                const esGanado = tx.tipo === 'compra';
                return (
                  <div
                    key={tx.id}
                    className="px-3 lg:px-3.5 2xl:px-4 py-2 lg:py-2.5 2xl:py-3 flex items-center justify-between hover:bg-slate-200 transition-colors"
                    style={{ borderBottom: i < billetera.ultimasTransacciones.length - 1 ? '1px solid #cbd5e1' : 'none' }}
                  >
                    <div className="flex items-center gap-2.5 lg:gap-2.5 2xl:gap-3">
                      <div
                        className="w-7 h-7 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          background: esGanado
                            ? 'linear-gradient(135deg, #d1fae5, #bbf7d0)'
                            : 'linear-gradient(135deg, #ffe4e6, #fecdd3)',
                        }}
                      >
                        {esGanado ? (
                          <TrendingUp className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-emerald-700" strokeWidth={2.5} />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-rose-600" strokeWidth={2.5} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800">
                          {esGanado ? `Compra $${tx.monto.toLocaleString()}` : tx.descripcion}
                        </p>
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">{formatearFecha(tx.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`text-sm lg:text-xs 2xl:text-sm font-bold ${esGanado ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {esGanado ? '+' : ''}{tx.puntos.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botón historial completo */}
        <button
          onClick={() => {
            onCerrar();
            onVerHistorial?.(billetera.negocioNombre);
          }}
          className="w-full mt-2.5 lg:mt-3 2xl:mt-4 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#e2e8f0',
            border: '2px solid #334155',
          }}
        >
          Ver historial completo
          <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
        </button>
      </div>
      </div>
    </ModalAdaptativo>
  );
}