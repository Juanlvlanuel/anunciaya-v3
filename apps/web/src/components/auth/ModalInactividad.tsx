/**
 * ModalInactividad.tsx
 * ====================
 * Modal de inactividad que ejecuta logout al hacer click en "Entendido".
 * 
 * Ubicación: apps/web/src/components/auth/ModalInactividad.tsx
 */

import { useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useAuthStore } from '../../stores/useAuthStore';

const esMobil = () => window.innerWidth < 640;
const esDesktopHD = () => window.innerWidth >= 1920;

export function ModalInactividad() {
  const mostrarModal = useAuthStore((state) => state.mostrarModalInactividad);
  const tiempoRestante = useAuthStore((state) => state.tiempoRestante);
  const continuarSesion = useAuthStore((state) => state.continuarSesion);
  const cerrarPorInactividad = useAuthStore((state) => state.cerrarPorInactividad);

  const modalAbiertoRef = useRef<boolean>(false);
  const sesionExpiradaRef = useRef<boolean>(false);

  // Efecto para detectar cuando tiempoRestante llega a 0
  useEffect(() => {
    if (tiempoRestante === 0 && mostrarModal && !sesionExpiradaRef.current) {
      sesionExpiradaRef.current = true;

      // Actualizar contenido del modal
      const htmlContainer = Swal.getHtmlContainer();
      const confirmButton = Swal.getConfirmButton();

      if (htmlContainer) {
        htmlContainer.innerHTML = `
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(to right, #fbbf24, #f97316, #dc2626); border-radius: 1.5rem 1.5rem 0 0;"></div>
          
          <div class="text-center" style="padding-top: 0.5rem;">
            <!-- Ícono de sesión cerrada -->
            <div style="margin-bottom: 0.75rem; position: relative; display: inline-block;">
              <div style="position: relative; background: linear-gradient(to bottom right, #dc2626, #b91c1c); border-radius: 9999px; padding: 0.625rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                <svg style="height: 2rem; width: 2rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
            </div>
            
            <!-- Título -->
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.375rem; margin-bottom: 0.5rem;">
              <svg style="height: 1.5rem; width: 1.5rem; color: #dc2626;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <h3 style="font-size: 1.25rem; font-weight: bold; color: #1f2937; margin: 0;">
                Sesión Cerrada
              </h3>
            </div>
            
            <!-- Mensaje informativo -->
            <p style="color: #4b5563; margin-bottom: 0.875rem; font-size: 0.875rem; padding: 0; line-height: 1.4;">
              Tu sesión ha sido cerrada por inactividad. Por tu seguridad, debes iniciar sesión nuevamente.
            </p>
          </div>
        `;
      }

      // Actualizar botón (SIN clonar para mantener eventos)
      if (confirmButton) {
        confirmButton.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.375rem;">
            <svg style="height: 1.125rem; width: 1.125rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
            </svg>
            <span>Entendido</span>
          </div>
        `;

        // Actualizar estilos (sin remover eventos)
        confirmButton.style.background = 'linear-gradient(to right, #dc2626, #b91c1c)';

        // Remover eventos anteriores de hover
        const oldOnMouseEnter = (confirmButton as any)._mouseEnterHandler;
        const oldOnMouseLeave = (confirmButton as any)._mouseLeaveHandler;

        if (oldOnMouseEnter) {
          confirmButton.removeEventListener('mouseenter', oldOnMouseEnter);
        }
        if (oldOnMouseLeave) {
          confirmButton.removeEventListener('mouseleave', oldOnMouseLeave);
        }

        // Agregar nuevos eventos de hover
        const newMouseEnter = () => {
          confirmButton.style.background = 'linear-gradient(to right, #b91c1c, #991b1b)';
        };
        const newMouseLeave = () => {
          confirmButton.style.background = 'linear-gradient(to right, #dc2626, #b91c1c)';
        };

        confirmButton.addEventListener('mouseenter', newMouseEnter);
        confirmButton.addEventListener('mouseleave', newMouseLeave);

        // Guardar referencias para limpieza posterior
        (confirmButton as any)._mouseEnterHandler = newMouseEnter;
        (confirmButton as any)._mouseLeaveHandler = newMouseLeave;
      }
    }
  }, [tiempoRestante, mostrarModal]);

  useEffect(() => {
    if (mostrarModal && !modalAbiertoRef.current) {
      modalAbiertoRef.current = true;
      sesionExpiradaRef.current = false;

      const mobile = esMobil();
      const desktopHD = esDesktopHD();

      let width = '85%';
      if (!mobile) {
        width = desktopHD ? '380px' : '370px';
      }

      Swal.fire({
        html: `
          <style>
            /* Forzar esquinas redondeadas */
            .swal2-popup {
              border-radius: 1.5rem !important;
              overflow: hidden !important;
            }

            @keyframes pulse-ring {
              0%, 100% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(1.1);
                opacity: 0.5;
              }
            }
            
            .pulse-ring {
              animation: pulse-ring 2s ease-in-out infinite;
            }

            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            
            .rotate-slow {
              animation: rotate 3s linear infinite;
            }

            /* Responsive styles - MÓVIL con letras más grandes */
            @media (max-width: 640px) {
              .modal-icon-container {
                margin-bottom: 0.375rem !important;
              }
              .modal-icon-wrapper {
                padding: 0.375rem !important;
              }
              .modal-icon-svg {
                height: 1.5rem !important;
                width: 1.5rem !important;
              }
              .modal-title-container {
                margin-bottom: 0.25rem !important;
              }
              .modal-title {
                font-size: 1.3rem !important;
              }
              .modal-message {
                margin-bottom: 0.5rem !important;
                padding: 0 !important;
                font-size: 0.9rem !important;
              }
              .countdown-container {
                margin-bottom: 0.5rem !important;
              }
              .countdown-svg {
                width: 5rem !important;
                height: 5rem !important;
              }
              .countdown-number {
                font-size: 2.125rem !important;
              }
            }

            /* LAPTOP y DESKTOP - sin cambios */
            @media (min-width: 641px) {
              .modal-icon-container {
                margin-bottom: 0.625rem !important;
              }
              .modal-icon-wrapper {
                padding: 0.5rem !important;
              }
              .modal-icon-svg {
                height: 1.875rem !important;
                width: 1.875rem !important;
              }
              .modal-title-container {
                margin-bottom: 0.5rem !important;
              }
              .modal-message {
                margin-bottom: 0.75rem !important;
                padding: 0 !important;
              }
              .countdown-container {
                margin-bottom: 0.75rem !important;
              }
            }
          </style>

          <!-- Borde superior con gradiente -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(to right, #fbbf24, #f97316, #dc2626); border-radius: 1.5rem 1.5rem 0 0;"></div>
          
          <div class="text-center" style="padding-top: 0.5rem;">
            <!-- Ícono con gradiente naranja contrastante -->
            <div class="modal-icon-container" style="margin-bottom: 0.75rem; position: relative; display: inline-block;">
              <div class="pulse-ring" style="position: absolute; inset: 0; background: #fed7aa; border-radius: 9999px;"></div>
              <div class="modal-icon-wrapper" style="position: relative; background: linear-gradient(to bottom right, #fbbf24, #f97316, #dc2626); border-radius: 9999px; padding: 0.625rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                <svg class="modal-icon-svg rotate-slow" style="height: 2rem; width: 2rem; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            </div>
            
            <!-- Título con ícono de alerta -->
            <div class="modal-title-container" style="display: flex; align-items: center; justify-content: center; gap: 0.375rem; margin-bottom: 0.5rem;">
              <svg class="modal-alert-icon" style="height: 1.5rem; width: 1.5rem; color: #f97316;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <h3 class="modal-title" style="font-size: 1.25rem; font-weight: bold; color: #1f2937; margin: 0;">
                Sesión por Expirar
              </h3>
            </div>
            
            <!-- Mensaje en 2 líneas -->
            <p class="modal-message" style="color: #4b5563; margin-bottom: 0.875rem; font-size: 0.875rem; padding: 0; line-height: 1.4;">
              Detectamos inactividad en tu cuenta. Por tu seguridad, cerraremos tu sesión en:
            </p>
            
            <!-- Countdown circular con gradiente contrastante -->
            <div class="countdown-container" style="margin-bottom: 0.875rem; position: relative; display: inline-flex; align-items: center; justify-content: center; padding: 0.25rem;">
              <svg class="countdown-svg" style="transform: rotate(-90deg); width: 5.5rem; height: 5.5rem; overflow: visible;">
                <defs>
                  <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#f97316;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
                  </linearGradient>
                </defs>
                <circle cx="44" cy="44" r="38" stroke="#e5e7eb" stroke-width="6" fill="none" />
                <circle id="progress-circle" cx="44" cy="44" r="38" 
                        stroke="url(#orangeGradient)" 
                        stroke-width="6" 
                        fill="none"
                        stroke-dasharray="239" 
                        stroke-dashoffset="0"
                        stroke-linecap="round" />
              </svg>
              <div style="position: absolute; text-align: center;">
                <div id="countdown-timer" class="countdown-number" style="font-size: 2rem; font-weight: bold; background: linear-gradient(to bottom right, #eab308, #f97316, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                  ${tiempoRestante}
                </div>
                <div style="font-size: 0.6875rem; color: #6b7280;">segundos</div>
              </div>
            </div>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: `
          <div style="display: flex; align-items: center; justify-content: center; gap: 0.375rem;">
            <svg style="height: 1.125rem; width: 1.125rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Permanecer Conectado</span>
          </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: true,
        background: '#ffffff',
        backdrop: 'rgba(0, 0, 0, 0.5)',
        width: width,
        padding: mobile ? '0.625rem 0.875rem 0.75rem 0.875rem' : '0.875rem 1.125rem 1rem 1.125rem',
        customClass: {
          popup: 'swal2-popup-rounded',
          confirmButton: 'w-full font-bold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-sm',
          htmlContainer: 'm-0',
          actions: mobile ? 'mt-1 w-full' : 'mt-1.5 w-full',
        },
        buttonsStyling: false,
        didOpen: () => {
          // Forzar esquinas redondeadas en el popup
          const popup = Swal.getPopup();
          if (popup) {
            popup.style.borderRadius = '1.5rem';
            popup.style.overflow = 'hidden';
          }

          const confirmButton = Swal.getConfirmButton();
          if (confirmButton) {
            confirmButton.style.background = 'linear-gradient(to right, #fbbf24, #f97316, #dc2626)';
            confirmButton.style.color = 'white';
            confirmButton.style.width = '100%';
            confirmButton.style.borderRadius = '0.75rem';

            const mouseEnter = () => {
              confirmButton.style.background = 'linear-gradient(to right, #f59e0b, #ea580c, #b91c1c)';
            };
            const mouseLeave = () => {
              confirmButton.style.background = 'linear-gradient(to right, #fbbf24, #f97316, #dc2626)';
            };

            confirmButton.addEventListener('mouseenter', mouseEnter);
            confirmButton.addEventListener('mouseleave', mouseLeave);

            // Guardar referencias para limpieza posterior
            (confirmButton as any)._mouseEnterHandler = mouseEnter;
            (confirmButton as any)._mouseLeaveHandler = mouseLeave;
          }

          const timerElement = document.getElementById('countdown-timer');
          const progressCircle = document.getElementById('progress-circle');
          const circumference = 2 * Math.PI * 38; // 2πr donde r=38

          const interval = setInterval(() => {
            const estadoActual = useAuthStore.getState();

            if (timerElement && progressCircle) {
              timerElement.textContent = String(estadoActual.tiempoRestante);

              // Calcular progreso (asumiendo tiempo inicial de 10 segundos para pruebas)
              const tiempoInicial = 300;
              const progreso = estadoActual.tiempoRestante / tiempoInicial;
              const offset = circumference * (1 - progreso);

              progressCircle.setAttribute('stroke-dashoffset', String(offset));

              // Cambiar a rojo cuando quedan menos de 5 segundos
              if (estadoActual.tiempoRestante <= 5) {
                timerElement.style.background = 'linear-gradient(to bottom right, #dc2626, #b91c1c)';
                timerElement.style.webkitBackgroundClip = 'text';
                timerElement.style.webkitTextFillColor = 'transparent';
                timerElement.style.backgroundClip = 'text';
              }
            }

            // Detener intervalo si ya expiró
            if (estadoActual.tiempoRestante === 0) {
              clearInterval(interval);
            }
          }, 1000);
        },
      }).then((result) => {
        modalAbiertoRef.current = false;

        if (result.isConfirmed) {
          if (sesionExpiradaRef.current) {
            // Si ya expiró, ejecutar logout
            cerrarPorInactividad();
          } else {
            // Si aún no expira, continuar sesión
            continuarSesion();
          }
        }

        sesionExpiradaRef.current = false;
      });
    }

    if (!mostrarModal && modalAbiertoRef.current) {
      modalAbiertoRef.current = false;
      sesionExpiradaRef.current = false;
      Swal.close();
    }
  }, [mostrarModal, continuarSesion, cerrarPorInactividad]);

  return null;
}

export default ModalInactividad;