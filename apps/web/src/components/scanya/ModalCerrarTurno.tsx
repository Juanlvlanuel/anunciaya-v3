/**
 * ModalCerrarTurno.tsx
 * ====================
 * Modal para cerrar un turno activo.
 *
 * Diseño glassmorphism que combina con ScanYA:
 * - Header con punto naranja pulsante y "¿Cerrar turno?"
 * - 3 métricas en fila (Duración, Ventas, Puntos)
 * - Notas de cierre colapsables (opcional)
 * - Botones: Cancelar y Cerrar Turno (con palomita)
 * - Sin confirmación doble (clic directo cierra)
 *
 * Ubicación: apps/web/src/components/scanya/ModalCerrarTurno.tsx
 */

import { useState } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const CreditCard = (p: IconoWrapperProps) => <Icon icon={ICONOS.pagos} {...p} />;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
import type { TurnoScanYA } from '@/types/scanya';

// =============================================================================
// INTERFACES
// =============================================================================

interface ModalCerrarTurnoProps {
  turno: TurnoScanYA;
  abierto: boolean;
  onClose: () => void;
  onConfirmar: (notasCierre?: string) => void;
  cargando?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calcula la duración total del turno
 */
function calcularDuracionTotal(horaInicio: string): string {
  const inicio = new Date(horaInicio);
  const ahora = new Date();
  const diff = ahora.getTime() - inicio.getTime();

  const horas = Math.floor(diff / (1000 * 60 * 60));
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (horas > 0) {
    return `${horas}h ${minutos}min`;
  }
  return `${minutos}min`;
}

/**
 * Formatea fecha y hora completa
 */
function formatearFechaHora(timestamp: string): string {
  const fecha = new Date(timestamp);
  const dia = fecha.toLocaleDateString('es-MX', { weekday: 'short' });
  const diaNum = fecha.getDate();
  const mes = fecha.toLocaleDateString('es-MX', { month: 'short' });
  const hora = fecha.toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  // Capitalizar primera letra del día
  const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);
  
  return `${diaCapitalizado} ${diaNum} ${mes}, ${hora}`;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function ModalCerrarTurno({
  turno,
  abierto,
  onClose,
  onConfirmar,
  cargando = false,
}: ModalCerrarTurnoProps) {
  // ---------------------------------------------------------------------------
  // ESTADO
  // ---------------------------------------------------------------------------
  const [notasCierre, setNotasCierre] = useState('');

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Maneja la confirmación del cierre de turno (sin doble confirmación)
   */
  const handleConfirmar = () => {
    onConfirmar(notasCierre.trim() || undefined);
  };

  /**
   * Maneja el cierre del modal
   */
  const handleClose = () => {
    if (cargando) return; // No cerrar si está procesando
    setNotasCierre(''); // Limpiar notas al cerrar
    onClose();
  };

  // ---------------------------------------------------------------------------
  // SI NO ESTÁ ABIERTO, NO RENDERIZAR
  // ---------------------------------------------------------------------------
  if (!abierto) return null;

  // ---------------------------------------------------------------------------
  // CALCULAR DATOS
  // ---------------------------------------------------------------------------
  const duracion = calcularDuracionTotal(turno.horaInicio);
  const fechaHoraInicio = formatearFechaHora(turno.horaInicio);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div
      className="
        fixed inset-0 z-9999
        bg-black/60 backdrop-blur-sm
        flex items-center justify-center
        p-4
        animate-fade-in
      "
      onClick={handleClose}
    >
      {/* Modal */}
      <div
        className="
          rounded-2xl
          shadow-2xl
          w-full max-w-md lg:max-w-sm 2xl:max-w-md
          animate-scale-in
        "
        style={{
          background: '#000000',
          border: '2px solid rgba(59, 130, 246, 0.35)',
          boxShadow: '0 0 30px rgba(59, 130, 246, 0.15), 0 25px 50px rgba(0, 0, 0, 0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="
            flex items-center justify-between
            px-5 lg:px-5 2xl:px-6
            py-4 lg:py-3.5 2xl:py-4
          "
          style={{
            borderBottom: '2px solid rgba(59, 130, 246, 0.2)',
          }}
        >
          <h2
            className="
              text-white font-bold
              text-xl lg:text-lg 2xl:text-xl
              flex items-center gap-2.5
            "
          >
            <span
              className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse-dot"
              style={{ boxShadow: '0 0 8px rgba(245, 158, 11, 0.6)' }}
            />
            ¿Cerrar turno?
          </h2>

          <button
            onClick={handleClose}
            disabled={cargando}
            className="
              text-slate-400 hover:text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer
              transition-colors
            "
          >
            <X className="w-5 h-5 lg:w-5 lg:h-5 2xl:w-5 2xl:h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 lg:p-5 2xl:p-6 space-y-5 lg:space-y-4 2xl:space-y-5">
          {/* Duración inline + Fecha */}
          <div className="flex items-center justify-center gap-2.5">
            <Clock className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-bold text-2xl lg:text-xl 2xl:text-2xl">
              {duracion}
            </span>
            <span className="text-[#94A3B8] font-medium text-sm">
              — {fechaHoraInicio}
            </span>
          </div>

          {/* 2 KPIs en fila */}
          <div className="flex gap-3 lg:gap-3 2xl:gap-4">
            {/* Ventas */}
            <div
              className="flex-1 rounded-xl px-3 py-3 lg:p-3 2xl:p-3.5 flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(5, 20, 45, 0.8), rgba(10, 35, 70, 0.6))',
                border: '2px solid rgba(59, 130, 246, 0.3)',
                boxShadow: '0 0 10px rgba(59, 130, 246, 0.1)',
              }}
            >
              <div
                className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(59, 130, 246, 0.2)' }}
              >
                <CreditCard className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-bold text-2xl lg:text-xl 2xl:text-2xl leading-none">
                  {turno.transacciones}
                </p>
                <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm font-medium mt-0.5">
                  Ventas
                </p>
              </div>
            </div>

            {/* Puntos */}
            <div
              className="flex-1 rounded-xl px-3 py-3 lg:p-3 2xl:p-3.5 flex items-center gap-3"
              style={{
                background: 'linear-gradient(135deg, rgba(5, 20, 45, 0.8), rgba(10, 35, 70, 0.6))',
                border: '2px solid rgba(245, 158, 11, 0.3)',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.1)',
              }}
            >
              <div
                className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245, 158, 11, 0.2)' }}
              >
                <Star className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-400" fill="currentColor" />
              </div>
              <div>
                <p className="text-white font-bold text-2xl lg:text-xl 2xl:text-2xl leading-none">
                  {turno.puntosOtorgados}
                </p>
                <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm font-medium mt-0.5">
                  Puntos
                </p>
              </div>
            </div>
          </div>

          {/* Notas colapsables */}
          <details className="group">
            <summary
              className="
                text-[#94A3B8] text-sm lg:text-sm 2xl:text-base
                cursor-pointer hover:text-white
                transition-colors
                flex items-center gap-1.5
                list-none
                font-medium
              "
            >
              <ChevronRight className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 group-open:rotate-90 transition-transform" />
              Agregar nota de cierre (opcional)
            </summary>
            <textarea
              id="input-notas-cierre"
              name="input-notas-cierre"
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
              disabled={cargando}
              placeholder="Ej: Todo en orden, sin incidencias"
              rows={2}
              className="
                w-full mt-2
                text-white placeholder-slate-500
                rounded-xl
                px-3 lg:px-3 2xl:px-4
                py-2.5 lg:py-2 2xl:py-2.5
                text-sm lg:text-sm 2xl:text-base
                resize-none
                focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
              style={{
                background: 'rgba(5, 15, 40, 0.6)',
                border: '2px solid rgba(59, 130, 246, 0.25)',
              }}
            />
          </details>

          {/* Botones */}
          <div className="flex gap-3 lg:gap-3 2xl:gap-3 pt-2 lg:pt-1 2xl:pt-2">
            {/* Botón Cancelar */}
            <button
              onClick={handleClose}
              disabled={cargando}
              className="
                flex-1
                py-3 lg:py-2.5 2xl:py-3
                rounded-xl
                text-white font-semibold
                text-sm lg:text-sm 2xl:text-base
                hover:bg-white/10
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer
                transition-colors
              "
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                border: '2px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              Cancelar
            </button>

            {/* Botón Cerrar Turno */}
            <button
              onClick={handleConfirmar}
              disabled={cargando}
              className="
                flex-1
                py-3 lg:py-2.5 2xl:py-3
                rounded-xl
                bg-linear-to-r from-amber-600 to-red-700
                hover:from-amber-700 hover:to-red-800
                text-white font-bold
                text-sm lg:text-sm 2xl:text-base
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer
                transition-all
                flex items-center justify-center gap-2
              "
              style={{
                boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)',
              }}
            >
              <Check className="w-4.5 h-4.5 lg:w-4 lg:h-4 2xl:w-4.5 2xl:h-4.5" strokeWidth={2.5} />
              {cargando ? 'Cerrando...' : 'Cerrar Turno'}
            </button>
          </div>
        </div>
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }

        .animate-pulse-dot {
          animation: pulse-dot 2s ease-in-out infinite;
        }

        details > summary::-webkit-details-marker {
          display: none;
        }
      `}</style>
    </div>
  );
}