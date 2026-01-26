/**
 * BotonesNavegacion.tsx - ACTUALIZADO CON GUARDADO EN AMBOS BOTONES
 * ========================================================================
 * Botones de navegación del wizard (Atrás / Siguiente).
 * 
 * Características:
 * - Usa componente Boton de UI
 * - Manejo de guardado para TODOS los pasos (1-8)
 * - ✅ NUEVO: Botón "Anterior" también guarda cambios
 * - Evento personalizado para PasoCategoria (Paso 1)
 * - window.guardarBorradorPasoX para Pasos 2-8
 * - Responsive según guía (móvil, lg:, 2xl:)
 * - Texto diferente para último paso
 */

import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Boton } from '@/components/ui';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useState } from 'react';
import { notificar } from '@/utils/notificaciones';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import authService from '@/services/authService';

// =============================================================================
// COMPONENTE
// =============================================================================

export function BotonesNavegacion() {
  const {
    pasoActual,
    cargando,
    siguienteDeshabilitado,
    atras,
    siguiente,
    finalizarOnboarding,
  } = useOnboardingStore();

  const navigate = useNavigate();
  const { usuario, setUsuario } = useAuthStore();
  const [guardando, setGuardando] = useState(false);

  // Detectar si es el último paso
  const esUltimoPaso = pasoActual === 8;

  // Texto e icono del botón "Siguiente"
  const textoSiguiente = esUltimoPaso ? 'Finalizar configuración' : 'Siguiente paso';
  const iconoSiguiente = esUltimoPaso ? (
    <Check className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
  ) : (
    <ChevronRight className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
  );
  const varianteSiguiente = esUltimoPaso ? 'success' : 'primario';

  // ---------------------------------------------------------------------------
  // FUNCIÓN COMPARTIDA: Guardar paso actual
  // ---------------------------------------------------------------------------
  const guardarPasoActual = async (validar: boolean) => {

    if (pasoActual === 1) {
      // PASO 1: Categorías
      if (typeof (window as any).guardarPaso1 === 'function') {
        await (window as any).guardarPaso1(validar);
      }
    }
    else if (pasoActual === 2) {
      // PASO 2: Ubicación
      if (typeof (window as any).guardarPaso2 === 'function') {
        await (window as any).guardarPaso2(validar);
      }
    }
    else if (pasoActual === 3) {
      // PASO 3: Contacto
      if (typeof (window as any).guardarPaso3 === 'function') {
        await (window as any).guardarPaso3(validar);
      }
    }
    else if (pasoActual === 4) {
      // PASO 4: Horarios
      if (typeof (window as any).guardarPaso4 === 'function') {
        await (window as any).guardarPaso4(validar);
      }
    }
    else if (pasoActual === 5) {

      if (typeof (window as any).guardarPaso5 === 'function') {
        await (window as any).guardarPaso5(validar);

      } else {
        console.log('❌ window.guardarPaso5 NO es una función');
      }
    }
    else if (pasoActual === 6) {
      // PASO 6: Métodos de pago
      if (typeof (window as any).guardarPaso6 === 'function') {
        await (window as any).guardarPaso6(validar);
      }
    }
    else if (pasoActual === 7) {
      // PASO 7: Sistema de puntos
      if (typeof (window as any).guardarPaso7 === 'function') {
        await (window as any).guardarPaso7(validar);
      }
    }
    else if (pasoActual === 8) {
      // PASO 8: Productos/Servicios
      if (typeof (window as any).guardarPaso8 === 'function') {
        await (window as any).guardarPaso8(validar);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Manejar click en "Anterior"
  // ---------------------------------------------------------------------------
  const handleAnterior = async () => {
    setGuardando(true);

    try {
      // GUARDAR PASO ACTUAL ANTES DE RETROCEDER (SIN VALIDAR)
      await guardarPasoActual(false);

      // RETROCEDER AL PASO ANTERIOR
      atras();

    } catch (error: any) {
      console.error('Error al guardar paso:', error);
      notificar.error(error.message || 'Error al guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Manejar click en "Siguiente"
  // ---------------------------------------------------------------------------
  const handleSiguiente = async () => {
    setGuardando(true);

    try {
      // GUARDAR PASO ACTUAL (CON VALIDACIÓN)
      await guardarPasoActual(true);

      if (pasoActual === 8) {

        const usuarioId = usuario?.id;
        if (!usuarioId) {
          throw new Error('No se pudo obtener el ID de usuario');
        }

        // 1. Finalizar onboarding
        await finalizarOnboarding(usuarioId);

        // 2. Obtener usuario actualizado del servidor
        const respuesta = await authService.obtenerYo();

        if (respuesta.success && respuesta.data) {
          // 3. ✅ GUARDAR DIRECTAMENTE en localStorage (bypass del store)
          localStorage.setItem('ay_usuario', JSON.stringify(respuesta.data));

          // 4. También actualizar el store (pero no confiamos solo en esto)
          setUsuario(respuesta.data);
        }

        // 5. Poner flag de sesión
        sessionStorage.setItem('ay_onboarding_finalizado', 'true');

        // 6. ✅ FORZAR flush de localStorage con await en Promise
        await new Promise(resolve => {
          // Leer de vuelta para forzar flush
          const verificar = localStorage.getItem('ay_usuario');
          const parsed = verificar ? JSON.parse(verificar) : null;
          setTimeout(resolve, 300); // Esperar 300ms adicionales
        });

        // 7. Ahora SÍ redirigir
        navigate('/inicio', { replace: true });
      }
      else {
        siguiente();
      }

    } catch (error: any) {
      console.error('Error:', error);
      notificar.error(error.message || 'Error al procesar.');
    } finally {
      setGuardando(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex items-center gap-2 lg:gap-3 2xl:gap-4">
      {/* Botón Atrás - solo mostrar si NO es el primer paso */}
      {pasoActual > 1 && (
        <Boton
          onClick={handleAnterior}
          variante="outlineGray"
          tamanio="lg"
          disabled={cargando || guardando}
          iconoIzquierda={<ChevronLeft className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />}
          className="flex-1 lg:flex-initial px-4 lg:px-5 2xl:px-6 py-2 lg:py-2.5 2xl:py-3 text-sm lg:text-sm 2xl:text-base"
        >
          <span className="hidden sm:inline">Anterior</span>
          <span className="sm:hidden">Atrás</span>
        </Boton>
      )}

      {/* Botón Siguiente/Finalizar */}
      <Boton
        onClick={handleSiguiente}
        variante={varianteSiguiente}
        tamanio="lg"
        cargando={cargando || guardando}
        disabled={siguienteDeshabilitado || cargando || guardando}
        iconoDerecha={!cargando && !guardando ? iconoSiguiente : undefined}
        className="flex-1 lg:flex-initial px-6 lg:px-8 2xl:px-10 py-2 lg:py-2.5 2xl:py-3 text-sm lg:text-sm 2xl:text-base"
      >
        {/* Texto completo en pantallas grandes */}
        <span className="hidden sm:inline">{textoSiguiente}</span>
        {/* Texto corto en móvil */}
        <span className="sm:hidden">{esUltimoPaso ? 'Finalizar' : 'Siguiente'}</span>
      </Boton>
    </div>
  );
}

export default BotonesNavegacion;