/**
 * ModalPausar.tsx (CORREGIDO - GUARDA PASO ACTUAL)
 * =================================================
 * - Detecta en qué paso está el usuario
 * - Guarda el borrador del paso actual antes de salir
 * - Muestra mensaje de "Guardando..." mientras guarda
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Loader2 } from 'lucide-react';
import { Modal, Boton } from '@/components/ui';
import { notificar } from '@/utils/notificaciones';
import { useOnboardingStore } from '@/stores/useOnboardingStore';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalPausarProps {
  /** ¿Está abierto el modal? */
  abierto: boolean;
  /** Función para cerrar el modal */
  onCerrar: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalPausar({ abierto, onCerrar }: ModalPausarProps) {
  const navigate = useNavigate();
  const [guardando, setGuardando] = useState(false);
  
  // ✅ OBTENER PASO ACTUAL
  const { pasoActual } = useOnboardingStore();

  // ---------------------------------------------------------------------------
  // FUNCIÓN COMPARTIDA: Guardar paso actual (misma lógica que BotonesNavegacion)
  // ---------------------------------------------------------------------------
  const guardarPasoActual = async () => {
    if (pasoActual === 1) {
      if (typeof (window as any).guardarPaso1 === 'function') {
        await (window as any).guardarPaso1(false);
      }
    }
    else if (pasoActual === 2) {
      if (typeof (window as any).guardarPaso2 === 'function') {
        await (window as any).guardarPaso2(false);
      }
    }
    else if (pasoActual === 3) {
      if (typeof (window as any).guardarPaso3 === 'function') {
        await (window as any).guardarPaso3(false);
      }
    }
    else if (pasoActual === 4) {
      if (typeof (window as any).guardarPaso4 === 'function') {
        await (window as any).guardarPaso4(false);
      }
    }
    else if (pasoActual === 5) {
      // ✅ PASO 5: Imágenes
      if (typeof (window as any).guardarPaso5 === 'function') {
        await (window as any).guardarPaso5(false);
      }
    }
    else if (pasoActual === 6) {
      if (typeof (window as any).guardarPaso6 === 'function') {
        await (window as any).guardarPaso6(false);
      }
    }
    else if (pasoActual === 7) {
      if (typeof (window as any).guardarPaso7 === 'function') {
        await (window as any).guardarPaso7(false);
      }
    }
    else if (pasoActual === 8) {
      if (typeof (window as any).guardarPaso8 === 'function') {
        await (window as any).guardarPaso8(false);
      }
    }
  };

  const handleConfirmarSalida = async () => {
    setGuardando(true);
    
    try {
      // ✅ Guardar el borrador del paso actual
      await guardarPasoActual();
      
      notificar.exito('Progreso guardado correctamente');
      
      // Pequeño delay para que se vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onCerrar();
      navigate('/inicio');
    } catch (error) {
      console.error('Error al guardar borrador:', error);
      notificar.error('Error al guardar. Tu progreso podría no haberse guardado.');
      // Aún así permitir salir
      onCerrar();
      navigate('/inicio');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="md"
      cerrarAlClickFuera={!guardando}  // No cerrar mientras guarda
      cerrarConEscape={!guardando}     // No cerrar mientras guarda
      mostrarHeader={false}
      paddingContenido="lg"
      className="lg:scale-75 2xl:scale-100 origin-center"
    >
      {/* Contenido del Modal - Layout Centrado */}
      <div className="text-center">
        
        {/* Ícono en la parte superior */}
        <div className="mb-4 lg:mb-5 2xl:mb-5 flex justify-center">
          <div className="w-12 h-12 lg:w-14 lg:h-14 2xl:w-14 2xl:h-14 rounded-xl lg:rounded-xl 2xl:rounded-xl bg-amber-100 flex items-center justify-center">
            {guardando ? (
              <Loader2 className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 text-amber-600 animate-spin" />
            ) : (
              <Pause className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 text-amber-600" />
            )}
          </div>
        </div>

        {/* Título */}
        <h3 className="text-lg lg:text-2xl 2xl:text-2xl font-bold text-slate-900 mb-4 lg:mb-5 2xl:mb-5">
          {guardando ? 'Guardando...' : '¿Continuar después?'}
        </h3>

        {/* Descripción - 2 líneas juntas */}
        <div className="text-sm lg:text-base 2xl:text-base text-slate-600 mb-5 lg:mb-6 2xl:mb-6">
          {guardando ? (
            <p>Guardando tu progreso...</p>
          ) : (
            <>
              <p>Tu progreso se guardara al salir.</p>
              <p>Continúa cuando quieras.</p>
            </>
          )}
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 2xl:gap-3">
          <Boton
            onClick={onCerrar}
            variante="outlineGray"
            tamanio="md"
            fullWidth
            disabled={guardando}
            className="text-xs lg:text-sm 2xl:text-sm order-2 sm:order-1"
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
            className="text-xs lg:text-sm 2xl:text-sm order-1 sm:order-2"
          >
            {guardando ? 'Guardando...' : 'Sí, salir'}
          </Boton>
        </div>
      </div>
    </Modal>
  );
}

export default ModalPausar;