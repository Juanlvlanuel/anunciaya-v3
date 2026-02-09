/**
 * ModalDetalleBilletera.tsx
 * ==========================
 * Modal que muestra detalles completos de la billetera en un negocio específico.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalDetalleBilletera.tsx
 */

import { X, Store, TrendingUp, TrendingDown, Award, Clock, ChevronRight } from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { DetalleNegocioBilletera } from '../../../../types/cardya';

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
}: {
  abierto: boolean;
  onCerrar: () => void;
  billetera: DetalleNegocioBilletera | null;
}) {
  if (!abierto || !billetera) return null;

  const nivel = NIVELES_CONFIG[billetera.nivelActual];

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
      className="lg:max-w-xs 2xl:max-w-md"
    >
      {/* ── Header dark con logo ── */}
      <div
        className="relative overflow-hidden px-5 lg:px-4 2xl:px-5 py-5 lg:py-4 2xl:py-5"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
      >
        {/* Grid sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.03,
            backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                             repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5 lg:gap-2.5 2xl:gap-3.5">
            {billetera.negocioLogo ? (
              <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-xl overflow-hidden ring-2 ring-white/10 shrink-0">
                <img src={billetera.negocioLogo} alt={billetera.negocioNombre} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: nivel.bg }}
              >
                <Store className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" strokeWidth={2.5} />
              </div>
            )}
            <div>
              <h2 className="text-lg lg:text-sm 2xl:text-lg font-bold text-white">{billetera.negocioNombre}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm lg:text-xs 2xl:text-sm">{nivel.icono}</span>
                <span className="text-xs lg:text-[10px] 2xl:text-xs font-semibold text-white/50">Nivel {nivel.label}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="p-5 lg:p-4 2xl:p-5">

        {/* Puntos + Nivel en grid */}
        <div className="grid grid-cols-2 gap-3 lg:gap-2.5 2xl:gap-3 mb-5 lg:mb-3.5 2xl:mb-5">
          {/* Puntos disponibles */}
          <div
            className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-3 2xl:p-4"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex items-center gap-1.5 mb-2 lg:mb-1.5 2xl:mb-2">
              <TrendingUp className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-400" strokeWidth={2.5} />
              <span className="text-[11px] lg:text-[10px] 2xl:text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Disponibles</span>
            </div>
            <div className="text-3xl lg:text-xl 2xl:text-3xl font-black text-slate-800 leading-none">
              {billetera.puntosDisponibles.toLocaleString()}
            </div>
            <p className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-slate-400 mt-1.5 lg:mt-1 2xl:mt-1.5">
              {billetera.puntosAcumuladosTotal.toLocaleString()} pts en total
            </p>
          </div>

          {/* Progreso nivel */}
          <div
            className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-3 2xl:p-4"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <div className="flex items-center gap-1.5 mb-2 lg:mb-1.5 2xl:mb-2">
              <Award className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-400" strokeWidth={2.5} />
              <span className="text-[11px] lg:text-[10px] 2xl:text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Progreso</span>
            </div>
            {billetera.progreso.puntosFaltantes !== null ? (
              <>
                <div className="text-3xl lg:text-xl 2xl:text-3xl font-black text-slate-800 leading-none">
                  {billetera.progreso.porcentaje}%
                </div>
                <div className="w-full h-2 lg:h-1.5 2xl:h-2 bg-slate-200 rounded-full overflow-hidden mt-2.5 lg:mt-2 2xl:mt-2.5">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${billetera.progreso.porcentaje}%`, background: nivel.barBg }}
                  />
                </div>
                <p className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-slate-400 mt-1.5 lg:mt-1 2xl:mt-1.5">
                  Faltan <strong className="text-slate-500">{billetera.progreso.puntosFaltantes.toLocaleString()}</strong> pts
                </p>
              </>
            ) : (
              <div className="text-3xl lg:text-xl 2xl:text-3xl font-black text-slate-800 leading-none">
                MAX
              </div>
            )}
          </div>
        </div>

        {/* Últimas transacciones */}
        <div
          className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
          style={{ border: '1px solid #e2e8f0' }}
        >
          <div
            className="px-4 lg:px-3.5 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '1px solid #e2e8f0' }}
          >
            <Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-400" strokeWidth={2.5} />
            <h3 className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700">Últimas Transacciones</h3>
          </div>

          {billetera.ultimasTransacciones.length === 0 ? (
            <div className="p-8 lg:p-6 2xl:p-8 text-center">
              <p className="text-sm lg:text-xs 2xl:text-sm text-slate-400">Sin transacciones recientes</p>
            </div>
          ) : (
            <div>
              {billetera.ultimasTransacciones.map((tx, i) => {
                const esGanado = tx.tipo === 'compra';
                return (
                  <div
                    key={tx.id}
                    className="px-4 lg:px-3.5 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                    style={{ borderBottom: i < billetera.ultimasTransacciones.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  >
                    <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                      <div
                        className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
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
                        <p className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-700">{tx.descripcion}</p>
                        <p className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-slate-400">{formatearFecha(tx.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`text-sm lg:text-xs 2xl:text-sm font-bold ${esGanado ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {esGanado ? '+' : '-'}{tx.puntos.toLocaleString()}
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
            // TODO: Cambiar a tab historial con filtro del negocio
          }}
          className="w-full mt-4 lg:mt-3 2xl:mt-4 py-3 lg:py-2 2xl:py-3 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-xs 2xl:text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#f8fafc',
            border: '1px solid #334155',
          }}
        >
          Ver historial completo
          <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
        </button>
      </div>
    </ModalAdaptativo>
  );
}