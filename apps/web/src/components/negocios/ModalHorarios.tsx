/**
 * ============================================================================
 * COMPONENTE: ModalHorarios - VERSIÓN 2.0 (Patrón Adaptativo)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/negocios/ModalHorarios.tsx
 * 
 * PROPÓSITO:
 * Modal reutilizable para mostrar los horarios de un negocio
 * 
 * COMPORTAMIENTO:
 * - MÓVIL (< 1024px): ModalBottom (slide up con drag)
 * - PC/LAPTOP (≥ 1024px): Modal centrado tradicional
 * 
 * ESTILO: Timeline vertical con indicadores visuales
 */

import { Calendar, X, UtensilsCrossed } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ModalBottom } from '../ui/ModalBottom';
import { useBreakpoint } from '../../hooks/useBreakpoint';

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
}

// =============================================================================
// CONSTANTES
// =============================================================================

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

  // Protección defensiva: Si no hay horarios, tratar como cerrado
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
// COMPONENTE: Timeline de Horarios (reutilizable)
// =============================================================================

interface TimelineHorariosProps {
  horarios: Horario[];
}

function TimelineHorarios({ horarios }: TimelineHorariosProps) {
  // Ordenar horarios (Lunes a Domingo)
  const horariosOrdenados = [...horarios].sort((a, b) => {
    const diaA = a.diaSemana === 0 ? 7 : a.diaSemana;
    const diaB = b.diaSemana === 0 ? 7 : b.diaSemana;
    return diaA - diaB;
  });

  const hoy = new Date().getDay();

  return (
    <div className="relative">
      {/* Línea vertical */}
      <div className="absolute left-[11px] lg:left-[9px] 2xl:left-[11px] top-3 bottom-3 lg:top-2 lg:bottom-2 2xl:top-3 2xl:bottom-3 w-0.5 bg-slate-200" />

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
                  <X className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-red-400" />
                </div>
              ) : (
                <div className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 bg-slate-200 rounded-full flex items-center justify-center z-10 shrink-0">
                  <div className="w-2 h-2 lg:w-1.5 lg:h-1.5 2xl:w-2 2xl:h-2 bg-slate-400 rounded-full" />
                </div>
              )}

              {/* Contenido */}
              <div className={`flex-1 ${!esUltimo ? 'pb-3 lg:pb-1.5 2xl:pb-3' : ''}`}>
                <div className="flex items-center justify-between">
                  {esHoy ? (
                    <div className="flex items-center gap-2">
                      <span className="text-blue-700 font-semibold lg:text-sm 2xl:text-base">
                        {DIAS_SEMANA[horario.diaSemana]}
                      </span>
                      <span className="text-xs lg:text-[10px] 2xl:text-xs text-blue-500">(Hoy)</span>
                    </div>
                  ) : (
                    <span className={`lg:text-sm 2xl:text-base ${esCerrado ? 'text-slate-400' : 'text-slate-600'}`}>
                      {DIAS_SEMANA[horario.diaSemana]}
                    </span>
                  )}

                  {horario.abierto ? (
                    <span className={`text-sm lg:text-xs 2xl:text-sm font-medium ${esHoy ? 'text-blue-700 font-semibold' : 'text-slate-700'}`}>
                      {formatearHora(horario.horaApertura)} - {formatearHora(horario.horaCierre)}
                    </span>
                  ) : (
                    <span className="text-sm lg:text-xs 2xl:text-sm text-red-500 font-medium">Cerrado</span>
                  )}
                </div>

                {/* Horario de comida */}
                {tieneComida && esHoy && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <UtensilsCrossed className="w-3 h-3 text-amber-500" />
                    <span className="text-xs lg:text-[10px] 2xl:text-xs text-amber-600">
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

interface FooterEstadoProps {
  info: InfoHorario;
}

function FooterEstado({ info }: FooterEstadoProps) {
  switch (info.estado) {
    case 'abierto':
      return (
        <div className="flex items-center gap-2 p-3 lg:p-2 2xl:p-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-700 text-sm font-medium">Abierto</span>
          {info.proximoCierre && (
            <span className="text-green-600 text-sm">
              - Cierra a las {formatearHora(info.proximoCierre)}
            </span>
          )}
        </div>
      );
    case 'cerrado':
      return (
        <div className="flex items-center gap-2 p-3 lg:p-2 2xl:p-3 bg-slate-100 border border-slate-200 rounded-xl">
          <div className="w-3 h-3 lg:w-2 lg:h-2 2xl:w-3 2xl:h-3 rounded-full bg-slate-400" />
          <span className="text-slate-700 text-sm lg:text-xs 2xl:text-sm font-medium">Cerrado</span>
          {info.proximaApertura && (
            <span className="text-slate-500 text-sm lg:text-xs 2xl:text-sm">
              - Abre a las {formatearHora(info.proximaApertura)}
            </span>
          )}
        </div>
      );
    case 'cerrado_hoy':
      return (
        <div className="flex items-center gap-2 p-3 lg:p-2 2xl:p-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-red-700 text-sm font-medium">Cerrado hoy</span>
          {info.proximaApertura && (
            <span className="text-red-600 text-sm">
              - Abre mañana {formatearHora(info.proximaApertura)}
            </span>
          )}
        </div>
      );
    case 'comida':
      return (
        <div className="flex items-center gap-2 p-3 lg:p-2 2xl:p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-700 text-sm font-medium">Horario de comida</span>
          {info.proximaApertura && (
            <span className="text-amber-600 text-sm">
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
// COMPONENTE: Modal Desktop (centrado)
// =============================================================================

interface ModalDesktopProps {
  horarios: Horario[];
  info: InfoHorario;
  onClose: () => void;
}

function ModalDesktop({ horarios, info, onClose }: ModalDesktopProps) {
  return (
    <Modal
      abierto={true}
      onCerrar={onClose}
      titulo="Horarios"
      iconoTitulo={<Calendar className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />}
      ancho="sm"
      className="max-w-sm lg:max-w-xs 2xl:max-w-sm"
      paddingContenido="md"
    >
      {/* Timeline */}
      <TimelineHorarios horarios={horarios} />

      {/* Footer con estado actual */}
      <div className="pt-4">
        <FooterEstado info={info} />
      </div>
    </Modal>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalHorarios({ horarios, onClose }: ModalHorariosProps) {
  const { esMobile } = useBreakpoint();
  const info = calcularEstadoNegocio(horarios);

  // -------------------------------------------------------------------------
  // MÓVIL: ModalBottom
  // -------------------------------------------------------------------------
  if (esMobile) {
    return (
      <ModalBottom
        abierto={true}
        onCerrar={onClose}
        titulo="Horarios"
        iconoTitulo={<Calendar className="w-5 h-5 text-slate-400" />}
        mostrarHeader={false}
        sinScrollInterno={true}
        alturaMaxima="sm"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <h3 className="text-slate-800 font-bold text-lg">Horarios</h3>
          </div>
        </div>

        {/* Timeline con scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          <TimelineHorarios horarios={horarios} />
        </div>

        {/* Footer con estado - FIJO */}
        <div className="px-4 pb-4 pt-2 shrink-0 border-t border-slate-100 bg-white">
          <FooterEstado info={info} />
        </div>
      </ModalBottom>
    );
  }

  // -------------------------------------------------------------------------
  // DESKTOP: Modal centrado
  // -------------------------------------------------------------------------
  return <ModalDesktop horarios={horarios} info={info} onClose={onClose} />;
}

export default ModalHorarios;