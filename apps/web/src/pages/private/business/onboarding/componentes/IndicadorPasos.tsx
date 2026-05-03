/**
 * IndicadorPasos.tsx - CON PASOS CLICKEABLES
 * ====================================================
 * Indicador de pasos sin contenedor, con elementos flotantes
 * ✅ NUEVO: Los pasos son clickeables para navegar directamente
 * 
 * MÓVIL (default):
 * - Horizontal compacto
 * - Solo círculos numerados
 * 
 * LAPTOP (lg:) + DESKTOP (2xl:):
 * - Vertical minimalista
 * - Círculos flotantes con sombras sutiles
 * - Sin fondo blanco
 * - Labels compactos
 * - ALTURA FIJA: El contenedor mantiene el mismo tamaño con 8 pasos
 */

import { Check, Home, MapPin, Phone, Clock, Image as ImageIcon, CreditCard, Star, ShoppingCart } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useState } from 'react';

// =============================================================================
// CONFIGURACIÓN DE PASOS
// =============================================================================

const PASOS_INFO = [
  { numero: 1, label: 'Categorías', icono: Home },
  { numero: 2, label: 'Ubicación', icono: MapPin },
  { numero: 3, label: 'Contacto', icono: Phone },
  { numero: 4, label: 'Horarios', icono: Clock },
  { numero: 5, label: 'Imágenes', icono: ImageIcon },
  { numero: 6, label: 'Pagos', icono: CreditCard },
  { numero: 7, label: 'Puntos', icono: Star },
  { numero: 8, label: 'Productos', icono: ShoppingCart },
];

// =============================================================================
// COMPONENTE
// =============================================================================

export function IndicadorPasos() {
  const { pasoActual, pasosCompletados, irAPaso } = useOnboardingStore();
  const [guardando, setGuardando] = useState(false);

  // Generar array de pasos a mostrar
  const pasosAMostrar = PASOS_INFO.map((info, index) => ({
    numero: info.numero,
    label: info.label,
    esActual: info.numero === pasoActual,
    esCompletado: pasosCompletados[index],
  }));

  // ---------------------------------------------------------------------------
  // FUNCIÓN: Guardar paso actual antes de cambiar (SIN VALIDAR)
  // ---------------------------------------------------------------------------
  const guardarPasoActual = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guardarFn = (window as any)[`guardarPaso${pasoActual}`];
    if (typeof guardarFn === 'function') {
      await guardarFn(false); // false = NO validar
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLER: Click en un paso
  // ---------------------------------------------------------------------------
  const handleClickPaso = async (paso: typeof pasosAMostrar[0]) => {
    if (paso.esActual || guardando) return;

    const esRetroceso = paso.numero < pasoActual;
    const esSiguienteInmediato = paso.numero === pasoActual + 1;
    const pasoAnteriorCompletado = paso.numero > 1 && pasosCompletados[paso.numero - 2];
    
    const puedeIr =
      esRetroceso ||
      paso.esCompletado ||
      (esSiguienteInmediato && pasoAnteriorCompletado) ||
      paso.numero === 1;

    if (!puedeIr) return;

    setGuardando(true);

    try {
      await guardarPasoActual();
      await irAPaso(paso.numero);
    } catch (error) {
      console.error('Error al cambiar de paso:', error);
    } finally {
      setGuardando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HELPER: Determinar si un paso es clickeable
  // ---------------------------------------------------------------------------
  const esClickeable = (paso: typeof pasosAMostrar[0]) => {
    if (paso.esActual || guardando) return false;

    const esRetroceso = paso.numero < pasoActual;
    const esSiguienteInmediato = paso.numero === pasoActual + 1;
    const pasoAnteriorCompletado = paso.numero > 1 && pasosCompletados[paso.numero - 2];

    return (
      esRetroceso ||
      paso.esCompletado ||
      (esSiguienteInmediato && pasoAnteriorCompletado) ||
      paso.numero === 1
    );
  };

  return (
    <>
      {/* ===================================================================== */}
      {/* DISEÑO HORIZONTAL - MÓVIL */}
      {/* ===================================================================== */}
      <div className="lg:hidden overflow-x-auto pb-2">
        <div className="flex items-center -space-x-2 min-w-max">
          {pasosAMostrar.map((paso, index) => (
            <div key={paso.numero} className="flex items-center">
              {/* Círculo del Paso */}
              <button
                type="button"
                onClick={() => handleClickPaso(paso)}
                disabled={!esClickeable(paso) || guardando}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  font-bold text-[10px] transition-all duration-300
                  ${paso.esCompletado
                    ? 'bg-linear-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    : paso.esActual
                      ? 'bg-linear-to-br from-slate-700 to-slate-800 text-white shadow-xl shadow-slate-700/50 ring-4 ring-slate-300'
                      : 'bg-white text-slate-600 shadow-md border-2 border-slate-300'
                  }
                  ${esClickeable(paso) && !guardando
                    ? 'cursor-pointer hover:scale-110 hover:shadow-xl active:scale-95'
                    : paso.esActual || guardando
                      ? 'cursor-default'
                      : 'cursor-not-allowed opacity-60'
                  }
                `}
              >
                {paso.esCompletado ? (
                  <Check className="w-4 h-4" />
                ) : (
                  paso.numero
                )}
              </button>

              {/* Línea Conectora */}
              {index < pasosAMostrar.length - 1 && (
                <div
                  className={`
                    w-6 h-0.5 transition-all duration-500
                    ${paso.esCompletado ? 'bg-linear-to-r from-emerald-500 to-emerald-600' : 'bg-slate-200'}
                  `}
                />
              )}
            </div>
          ))}
        </div>

        {/* Label del paso actual */}
        <div className="mt-2 text-center">
          <p className="text-xs font-semibold text-slate-800">
            {pasosAMostrar.find(p => p.esActual)?.label}
          </p>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* DISEÑO VERTICAL FLOTANTE - LAPTOP + DESKTOP */}
      {/* ALTURA FIJA CON ESPACIADO DINÁMICO */}
      {/* ===================================================================== */}
      <div className="hidden lg:block">
        <div className="flex flex-col justify-between h-[525px] 2xl:h-[544px]">
          {pasosAMostrar.map((paso, index) => (
            <div key={paso.numero}>
              {/* Paso */}
              <button
                type="button"
                onClick={() => handleClickPaso(paso)}
                disabled={!esClickeable(paso) || guardando}
                className={`
                  flex items-center gap-3 w-full text-left
                  transition-all duration-200
                  ${esClickeable(paso) && !guardando
                    ? 'cursor-pointer hover:translate-x-1 active:translate-x-0'
                    : paso.esActual || guardando
                      ? 'cursor-default'
                      : 'cursor-not-allowed'
                  }
                `}
              >
                {/* Círculo Flotante */}
                <div
                  className={`
                    relative w-9 h-9 2xl:w-10 2xl:h-10 rounded-full 
                    flex items-center justify-center font-bold text-sm 2xl:text-base
                    transition-all duration-300 shrink-0
                    ${paso.esCompletado
                      ? 'bg-linear-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                      : paso.esActual
                        ? 'bg-linear-to-br from-slate-700 to-slate-800 text-white shadow-xl shadow-slate-700/50 scale-110 ring-4 ring-slate-300'
                        : 'bg-white text-slate-600 shadow-md border-2 border-slate-300'
                    }
                    ${esClickeable(paso) && !guardando && !paso.esActual
                      ? 'hover:scale-105 hover:shadow-xl'
                      : ''
                    }
                  `}
                >
                  {paso.esCompletado ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    paso.numero
                  )}
                </div>

                {/* Ícono + Label */}
                <div className="flex items-center gap-2 flex-1">
                  {(() => {
                    const info = PASOS_INFO[paso.numero - 1];
                    const Icono = info.icono;
                    return <Icono className={`w-5 h-5 2xl:w-6 2xl:h-6 shrink-0 ${
                      paso.esActual || paso.esCompletado ? 'text-slate-700' : 'text-slate-400'
                    }`} />;
                  })()}
                  <p
                    className={`
                      text-base 2xl:text-lg font-semibold transition-colors
                      ${paso.esActual
                        ? 'text-slate-800'
                        : paso.esCompletado
                          ? 'text-slate-800'
                          : 'text-slate-600'
                      }
                      ${esClickeable(paso) && !guardando && !paso.esActual
                        ? 'group-hover:text-slate-800'
                        : ''
                      }
                    `}
                  >
                    {paso.label}
                    {paso.esActual && <span className="w-1.5 h-1.5 rounded-full bg-slate-800 inline-block ml-1.5 mb-0.5" />}
                  </p>
                </div>
              </button>

              {/* Línea Conectora Vertical */}
              {index < pasosAMostrar.length - 1 && (
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 2xl:w-10 flex justify-center">
                    <div
                      className={`
                        w-0.5 h-full transition-all duration-500 rounded-full
                        ${paso.esCompletado ? 'bg-linear-to-b from-emerald-500 to-emerald-600' : 'bg-slate-200'}
                      `}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default IndicadorPasos;