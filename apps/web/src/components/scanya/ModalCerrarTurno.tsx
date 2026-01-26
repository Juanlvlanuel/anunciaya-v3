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
import { X, Clock, CreditCard, Star, ChevronRight, Check } from 'lucide-react';
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
      {/* Modal con estilo glassmorphism */}
      <div
        className="
          rounded-2xl lg:rounded-xl 2xl:rounded-2xl
          shadow-2xl
          w-full max-w-md lg:max-w-sm 2xl:max-w-md
          animate-scale-in
        "
        style={{
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con punto naranja */}
        <div
          className="
            flex items-center justify-between
            px-5 lg:px-4 2xl:px-5
            py-4 lg:py-3 2xl:py-4
            border-b border-white/10
          "
        >
          <h2
            className="
              text-white font-semibold
              text-lg lg:text-base 2xl:text-lg
              flex items-center gap-2
            "
          >
            <span className="w-2 h-2 lg:w-1.5 lg:h-1.5 2xl:w-2 2xl:h-2 bg-amber-500 rounded-full animate-pulse-dot" />
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
            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 lg:p-4 2xl:p-5 space-y-4 lg:space-y-3 2xl:space-y-4">
          {/* Métricas en 3 columnas */}
          <div className="grid grid-cols-3 gap-3 lg:gap-2 2xl:gap-3">
            {/* Duración */}
            <div
              className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2.5 2xl:p-3 text-center"
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(59, 130, 246, 0.1)',
              }}
            >
              <div
                className="
                  w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8
                  rounded-full bg-emerald-500/20
                  flex items-center justify-center
                  mx-auto mb-2 lg:mb-1.5 2xl:mb-2
                "
              >
                <Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-emerald-400" />
              </div>
              <p className="text-white font-bold text-lg lg:text-base 2xl:text-lg">
                {duracion}
              </p>
              <p className="text-slate-300 text-xs lg:text-[11px] 2xl:text-xs font-medium">
                Duración
              </p>
            </div>

            {/* Transacciones */}
            <div
              className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2.5 2xl:p-3 text-center"
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(59, 130, 246, 0.1)',
              }}
            >
              <div
                className="
                  w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8
                  rounded-full bg-blue-500/20
                  flex items-center justify-center
                  mx-auto mb-2 lg:mb-1.5 2xl:mb-2
                "
              >
                <CreditCard className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-400" />
              </div>
              <p className="text-white font-bold text-lg lg:text-base 2xl:text-lg">
                {turno.transacciones}
              </p>
              <p className="text-slate-300 text-xs lg:text-[11px] 2xl:text-xs font-medium">
                Ventas
              </p>
            </div>

            {/* Puntos */}
            <div
              className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2.5 2xl:p-3 text-center"
              style={{
                background: 'rgba(15, 23, 42, 0.4)',
                border: '1px solid rgba(59, 130, 246, 0.1)',
              }}
            >
              <div
                className="
                  w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8
                  rounded-full bg-amber-500/20
                  flex items-center justify-center
                  mx-auto mb-2 lg:mb-1.5 2xl:mb-2
                "
              >
                <Star className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-amber-400" fill="currentColor" />
              </div>
              <p className="text-white font-bold text-lg lg:text-base 2xl:text-lg">
                {turno.puntosOtorgados}
              </p>
              <p className="text-slate-300 text-xs lg:text-[11px] 2xl:text-xs font-medium">
                Puntos
              </p>
            </div>
          </div>

          {/* Fecha y hora de inicio */}
          <p className="text-slate-300 text-sm lg:text-xs 2xl:text-sm text-center font-medium">
            Turno iniciado: {fechaHoraInicio}
          </p>

          {/* Notas colapsables */}
          <details className="group">
            <summary
              className="
                text-slate-300 text-sm lg:text-xs 2xl:text-sm
                cursor-pointer hover:text-white
                transition-colors
                flex items-center gap-1
                list-none
                font-medium
              "
            >
              <ChevronRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 group-open:rotate-90 transition-transform" />
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
                bg-slate-900/50 border border-slate-700
                text-white placeholder-slate-400
                rounded-lg
                px-3 lg:px-2.5 2xl:px-3
                py-2 lg:py-1.5 2xl:py-2
                text-sm lg:text-xs 2xl:text-sm
                resize-none
                focus:outline-none focus:border-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            />
          </details>

          {/* Botones */}
          <div className="flex gap-3 lg:gap-2 2xl:gap-3 pt-2 lg:pt-1 2xl:pt-2">
            {/* Botón Cancelar */}
            <button
              onClick={handleClose}
              disabled={cargando}
              className="
                flex-1
                py-2.5 lg:py-2 2xl:py-2.5
                rounded-xl lg:rounded-lg 2xl:rounded-xl
                text-white font-medium
                text-sm lg:text-xs 2xl:text-sm
                hover:bg-white/10
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer
                transition-colors
              "
              style={{
                background: 'rgba(30, 41, 59, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
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
                py-2.5 lg:py-2 2xl:py-2.5
                rounded-xl lg:rounded-lg 2xl:rounded-xl
                bg-linear-to-r from-red-600 to-red-700
                hover:from-red-500 hover:to-red-600
                text-white font-semibold
                text-sm lg:text-xs 2xl:text-sm
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer
                transition-all
                shadow-lg shadow-red-900/30
                flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2
              "
            >
              <Check className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
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