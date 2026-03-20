/**
 * ModalPausar.tsx — Modal para pausar el onboarding
 * ==================================================
 * - Usa ModalAdaptativo (bottom sheet en móvil, centrado en desktop)
 * - Header oscuro con gradiente slate
 * - Guarda borrador del paso actual antes de salir
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Loader2, LogOut, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { ModalAdaptativo } from '@/components/ui/ModalAdaptativo';
import { Boton } from '@/components/ui';
import { notificar } from '@/utils/notificaciones';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalPausarProps {
  abierto: boolean;
  onCerrar: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalPausar({ abierto, onCerrar }: ModalPausarProps) {
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  const { pasoActual } = useOnboardingStore();

  // ---------------------------------------------------------------------------
  // Guardar paso actual — lógica unificada sin repetición
  // ---------------------------------------------------------------------------
  const guardarPasoActual = async () => {
    const win = window as unknown as Record<string, unknown>;
    const fnName = `guardarPaso${pasoActual}`;
    const fn = win[fnName];

    if (typeof fn === 'function') {
      await (fn as (validar: boolean) => Promise<boolean>)(false);
    }
  };

  const handleConfirmarSalida = async () => {
    setGuardando(true);

    try {
      await guardarPasoActual();
      notificar.exito('Progreso guardado correctamente');
      await new Promise(resolve => setTimeout(resolve, 500));
      onCerrar();
      navigate('/inicio');
    } catch {
      notificar.error('Error al guardar. Tu progreso podría no haberse guardado.');
      onCerrar();
      navigate('/inicio');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={guardando ? () => {} : onCerrar}
      cerrarAlClickFuera={!guardando}
      cerrarConEscape={!guardando}
      mostrarHeader={false}
      ancho="sm"
      paddingContenido="none"
      sinScrollInterno
      className="lg:max-w-sm 2xl:max-w-md max-lg:[background:linear-gradient(180deg,#d97706_2.5rem,rgb(248,250,252)_2.5rem)]"
    >
      <div className="flex flex-col">
        {/* Header oscuro con gradiente — estilo ModalDuplicar */}
        <div className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
          style={{
            background: 'linear-gradient(135deg, #d97706, #f59e0b)',
            boxShadow: '0 4px 16px rgba(217,119,6,0.4)',
          }}>
          {/* Círculos decorativos */}
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
            <div className="w-12 h-12 lg:w-11 lg:h-11 2xl:w-12 2xl:h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              {guardando ? (
                <Loader2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white animate-spin" />
              ) : (
                <Pause className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">
                {guardando ? 'Guardando...' : '¿Continuar después?'}
              </h3>
              <p className="text-base lg:text-sm 2xl:text-base text-white/80 font-semibold">
                Paso {pasoActual} de 8
              </p>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4">
          {guardando ? (
            <p className="text-base lg:text-sm 2xl:text-base font-medium text-slate-600 text-center">
              Guardando tu progreso...
            </p>
          ) : (
            <div className="space-y-4 lg:space-y-3 2xl:space-y-4">
              {/* Beneficios — 2 líneas con iconos */}
              <div className="space-y-2.5 lg:space-y-2 2xl:space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-emerald-500 shrink-0" />
                  <p className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-700">
                    Tu progreso se guarda automáticamente
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-indigo-500 shrink-0" />
                  <p className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-700">
                    Continúa cuando quieras
                  </p>
                </div>
              </div>

              {/* Alerta */}
              <div className="flex items-start gap-2.5 p-3 lg:p-2.5 2xl:p-3 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm lg:text-xs 2xl:text-sm font-medium text-amber-700">
                  Tu negocio no será visible hasta completar todos los pasos.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Botones — separados con border-t como en ModalDuplicar */}
        <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 border-t border-slate-200 flex gap-2 lg:gap-1.5 2xl:gap-2">
          <Boton
            onClick={onCerrar}
            variante="outlineGray"
            tamanio="md"
            fullWidth
            disabled={guardando}
            className="cursor-pointer"
          >
            Cancelar
          </Boton>
          <Boton
            onClick={handleConfirmarSalida}
            variante="primario"
            tamanio="md"
            fullWidth
            cargando={guardando}
            disabled={guardando}
            iconoIzquierda={!guardando ? <LogOut className="w-4 h-4" /> : undefined}
            className="cursor-pointer"
          >
            {guardando ? 'Guardando...' : 'Guardar y salir'}
          </Boton>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default ModalPausar;
