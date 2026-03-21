/**
 * ============================================================================
 * COMPONENTE: ModalHorarios (v3.0 - Header gradiente + tokens corregidos)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/components/negocios/ModalHorarios.tsx
 *
 * PROPÓSITO:
 * Modal reutilizable para mostrar los horarios de un negocio.
 * Usa ModalAdaptativo (TC-6A — Modal de Detalle).
 *
 * ESTILO: Timeline vertical con indicadores visuales + footer de estado
 */

import { Calendar, X, UtensilsCrossed, Clock } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';

// =============================================================================
// TIPOS
// =============================================================================

export interface Horario {
  diaSemana: number;
  abierto: boolean;
  horaApertura: string;
  horaCierre: string;
  tieneHorarioComida?: boolean;
  comidaInicio?: string | null;
  comidaFin?: string | null;
}

export type EstadoNegocio = 'abierto' | 'cerrado' | 'comida' | 'cerrado_hoy';

export interface InfoHorario {
  estado: EstadoNegocio;
  proximaApertura?: string;
  proximoCierre?: string;
}

interface ModalHorariosProps {
  horarios: Horario[];
  onClose: () => void;
  /** Fuerza modal centrado (desktop) aunque esté dentro de BreakpointOverride móvil */
  centrado?: boolean;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const GRADIENTE = {
  bg: 'linear-gradient(135deg, #1e40af, #2563eb)',
  shadow: 'rgba(37,99,235,0.4)',
  handle: '#1e40af',
};

// =============================================================================
// UTILIDADES
// =============================================================================

export function formatearHora(hora: string): string {
  if (!hora) return '';
  const [h, m] = hora.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function encontrarProximaApertura(horarios: Horario[], diaActual: number): Horario | undefined {
  for (let i = 1; i <= 7; i++) {
    const diaBuscar = (diaActual + i) % 7;
    const horario = horarios.find(h => h.diaSemana === diaBuscar && h.abierto);
    if (horario) return horario;
  }
  return undefined;
}

export function calcularEstadoNegocio(horarios: Horario[], zonaHoraria?: string): InfoHorario {
  if (!horarios || horarios.length === 0) {
    return { estado: 'cerrado_hoy' };
  }

  let ahora: Date;
  let horaActual: string;
  let diaActual: number;

  if (zonaHoraria) {
    const fechaEnZona = new Date().toLocaleString('en-US', { timeZone: zonaHoraria });
    ahora = new Date(fechaEnZona);
    diaActual = ahora.getDay();
    horaActual = ahora.getHours().toString().padStart(2, '0') + ':' +
      ahora.getMinutes().toString().padStart(2, '0');
  } else {
    ahora = new Date();
    diaActual = ahora.getDay();
    horaActual = ahora.getHours().toString().padStart(2, '0') + ':' +
      ahora.getMinutes().toString().padStart(2, '0');
  }

  const horarioHoy = horarios.find(h => h.diaSemana === diaActual);

  if (!horarioHoy || !horarioHoy.abierto) {
    const proximoHorario = encontrarProximaApertura(horarios, diaActual);
    return {
      estado: 'cerrado_hoy',
      proximaApertura: proximoHorario?.horaApertura
    };
  }

  const { horaApertura, horaCierre, tieneHorarioComida, comidaInicio, comidaFin } = horarioHoy;

  if (!horaApertura || !horaCierre) {
    const proximoHorario = encontrarProximaApertura(horarios, diaActual);
    return {
      estado: 'cerrado_hoy',
      proximaApertura: proximoHorario?.horaApertura
    };
  }

  const horaAperturaCorta = horaApertura.substring(0, 5);
  const horaCierreCorta = horaCierre.substring(0, 5);

  if (horaActual < horaAperturaCorta) {
    return {
      estado: 'cerrado',
      proximaApertura: horaApertura
    };
  }

  if (horaActual >= horaCierreCorta) {
    const proximoHorario = encontrarProximaApertura(horarios, diaActual);
    return {
      estado: 'cerrado',
      proximaApertura: proximoHorario?.horaApertura
    };
  }

  if (tieneHorarioComida && comidaInicio && comidaFin) {
    const comidaInicioCorta = comidaInicio.substring(0, 5);
    const comidaFinCorta = comidaFin.substring(0, 5);

    if (horaActual >= comidaInicioCorta && horaActual < comidaFinCorta) {
      return {
        estado: 'comida',
        proximaApertura: comidaFin
      };
    }
  }

  return {
    estado: 'abierto',
    proximoCierre: horaCierre
  };
}

// =============================================================================
// COMPONENTE: Timeline de Horarios
// =============================================================================

function TimelineHorarios({ horarios }: { horarios: Horario[] }) {
  const horariosOrdenados = [...horarios].sort((a, b) => {
    const diaA = a.diaSemana === 0 ? 7 : a.diaSemana;
    const diaB = b.diaSemana === 0 ? 7 : b.diaSemana;
    return diaA - diaB;
  });

  const hoy = new Date().getDay();

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-[11px] lg:left-[9px] 2xl:left-[11px] top-3 bottom-3 lg:top-2 lg:bottom-2 2xl:top-3 2xl:bottom-3 w-0.5 bg-slate-300" />

      <div className="space-y-1 lg:space-y-0.5 2xl:space-y-1">
        {horariosOrdenados.map((horario, index) => {
          const esHoy = horario.diaSemana === hoy;
          const esCerrado = !horario.tieneHorarioComida && !horario.abierto;
          const tieneComida = horario.tieneHorarioComida && horario.comidaInicio && horario.comidaFin;
          const esUltimo = index === horariosOrdenados.length - 1;

          return (
            <div
              key={horario.diaSemana}
              className="flex items-start gap-4 relative"
            >
              {/* Indicador */}
              {esHoy ? (
                <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-blue-500 rounded-full flex items-center justify-center z-10 ring-4 lg:ring-2 2xl:ring-4 ring-blue-100 shrink-0">
                  <div className="w-2 h-2 lg:w-1.5 lg:h-1.5 2xl:w-2 2xl:h-2 bg-white rounded-full" />
                </div>
              ) : esCerrado ? (
                <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-red-100 rounded-full flex items-center justify-center z-10 shrink-0">
                  <X className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-red-600" />
                </div>
              ) : (
                <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-slate-200 rounded-full flex items-center justify-center z-10 shrink-0">
                  <div className="w-2 h-2 lg:w-1.5 lg:h-1.5 2xl:w-2 2xl:h-2 bg-slate-600 rounded-full" />
                </div>
              )}

              {/* Contenido */}
              <div className={`flex-1 ${!esUltimo ? 'pb-3 lg:pb-1.5 2xl:pb-3' : ''}`}>
                <div className="flex items-center justify-between">
                  {esHoy ? (
                    <div className="flex items-center gap-2">
                      <span className="text-blue-700 font-semibold text-base lg:text-sm 2xl:text-base">
                        {DIAS_SEMANA[horario.diaSemana]}
                      </span>
                      <span className="text-sm lg:text-[11px] 2xl:text-sm text-blue-500 font-medium">(Hoy)</span>
                    </div>
                  ) : (
                    <span className={`text-base lg:text-sm 2xl:text-base font-medium ${esCerrado ? 'text-slate-600' : 'text-slate-700'}`}>
                      {DIAS_SEMANA[horario.diaSemana]}
                    </span>
                  )}

                  {horario.abierto ? (
                    <span className={`text-sm lg:text-[11px] 2xl:text-sm font-medium ${esHoy ? 'text-blue-700 font-semibold' : 'text-slate-700'}`}>
                      {formatearHora(horario.horaApertura)} - {formatearHora(horario.horaCierre)}
                    </span>
                  ) : (
                    <span className="text-sm lg:text-[11px] 2xl:text-sm text-red-600 font-medium">Cerrado</span>
                  )}
                </div>

                {/* Horario de comida */}
                {tieneComida && esHoy && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <UtensilsCrossed className="w-3 h-3 text-amber-500" />
                    <span className="text-sm lg:text-[11px] 2xl:text-sm text-amber-600 font-medium">
                      Comida: {formatearHora(horario.comidaInicio!)} - {formatearHora(horario.comidaFin!)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Footer con Estado Actual
// =============================================================================

function FooterEstado({ info }: { info: InfoHorario }) {
  switch (info.estado) {
    case 'abierto':
      return (
        <div className="flex items-center gap-2 p-3 lg:p-2 2xl:p-3 bg-emerald-100 border-2 border-emerald-300 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-700 text-sm lg:text-[11px] 2xl:text-sm font-semibold">Abierto</span>
          {info.proximoCierre && (
            <span className="text-emerald-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">
              - Cierra a las {formatearHora(info.proximoCierre)}
            </span>
          )}
        </div>
      );
    case 'cerrado':
      return (
        <div className="flex items-center gap-2 p-3 lg:p-2 2xl:p-3 bg-slate-200 border-2 border-slate-300 rounded-xl">
          <div className="w-3 h-3 lg:w-2 lg:h-2 2xl:w-3 2xl:h-3 rounded-full bg-slate-600" />
          <span className="text-slate-700 text-sm lg:text-[11px] 2xl:text-sm font-semibold">Cerrado</span>
          {info.proximaApertura && (
            <span className="text-slate-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">
              - Abre a las {formatearHora(info.proximaApertura)}
            </span>
          )}
        </div>
      );
    case 'cerrado_hoy':
      return (
        <div className="flex items-center gap-2 p-3 lg:p-2 2xl:p-3 bg-red-100 border-2 border-red-300 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-red-700 text-sm lg:text-[11px] 2xl:text-sm font-semibold">Cerrado hoy</span>
          {info.proximaApertura && (
            <span className="text-red-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">
              - Abre mañana {formatearHora(info.proximaApertura)}
            </span>
          )}
        </div>
      );
    case 'comida':
      return (
        <div className="flex items-center gap-2 p-3 lg:p-2 2xl:p-3 bg-amber-100 border-2 border-amber-300 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-700 text-sm lg:text-[11px] 2xl:text-sm font-semibold">Horario de comida</span>
          {info.proximaApertura && (
            <span className="text-amber-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">
              - Regresa a las {formatearHora(info.proximaApertura)}
            </span>
          )}
        </div>
      );
    default:
      return null;
  }
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalHorarios({ horarios, onClose, centrado }: ModalHorariosProps) {
  const info = calcularEstadoNegocio(horarios);

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onClose}
      ancho="sm"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      alturaMaxima="lg"
      colorHandle={GRADIENTE.handle}
      headerOscuro
      centrado={centrado}
    >
      <div className="flex flex-col max-h-[80vh] lg:max-h-[75vh]">

        {/* ── Header dark gradiente ── */}
        <div
          className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
          style={{ background: GRADIENTE.bg, boxShadow: `0 4px 16px ${GRADIENTE.shadow}` }}
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
            <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">Horarios</h3>
              <span className="text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Días y horarios de atención</span>
            </div>
          </div>
        </div>

        {/* ── Timeline con scroll ── */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4">
          <TimelineHorarios horarios={horarios} />
        </div>

        {/* ── Footer con estado actual ── */}
        <div className="px-4 lg:px-3 2xl:px-4 pb-4 lg:pb-3 2xl:pb-4 pt-2 shrink-0">
          <FooterEstado info={info} />
        </div>

      </div>
    </ModalAdaptativo>
  );
}

export default ModalHorarios;
