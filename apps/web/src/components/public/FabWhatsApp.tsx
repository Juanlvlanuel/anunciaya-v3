/**
 * FabWhatsApp.tsx — Botón flotante de WhatsApp de la landing pública
 * ==================================================================
 * FAB fijo abajo-derecha (móvil y PC) que abre una conversación con el WhatsApp
 * Business de AnunciaYA. Se monta en la landing pública (`PaginaLanding`), la
 * pantalla que ve el visitante antes de iniciar sesión.
 *
 * El número es dinámico: lo sirve el Panel Admin vía `configuracion_sistema` →
 * endpoint público → `useConfigPublica()`, así el SuperAdmin lo cambia sin tocar
 * código.
 *
 * Queda fijo abajo-derecha en móvil y PC. El banner de instalación PWA se muestra
 * centrado arriba (colgando del header), así que no compiten por la esquina.
 *
 * El link es `https://wa.me/<solo-dígitos>` SIN texto pre-cargado: el mensaje de
 * bienvenida "de la empresa" se configura como saludo automático en la app de
 * WhatsApp Business, no desde el enlace.
 *
 * Ubicación: apps/web/src/components/public/FabWhatsApp.tsx
 */

import { createPortal } from 'react-dom';
// Logo de marca: lucide no incluye WhatsApp, así que este viene de Iconify.
import { Icon } from '@iconify/react';
import { ICONOS_REMOTOS } from '../../config/iconos';
import { useConfigPublica } from '../../hooks/queries/useConfigPublica';

export function FabWhatsApp() {
  const { whatsappNumero } = useConfigPublica();

  // wa.me exige solo dígitos con lada (sin +, espacios ni guiones): "+52 638 125 9076" → "526381259076".
  const digitos = whatsappNumero.replace(/\D/g, '');
  if (!digitos) return null;

  const abrir = () => {
    window.open(`https://wa.me/${digitos}`, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <button
      type="button"
      onClick={abrir}
      aria-label="Contactar por WhatsApp"
      data-testid="landing-fab-whatsapp"
      className="fixed bottom-4 right-4 lg:bottom-6 lg:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25A924] text-white shadow-lg transition-transform active:scale-95 lg:cursor-pointer lg:hover:scale-105"
    >
      <Icon icon={ICONOS_REMOTOS.whatsapp} className="h-8 w-8" aria-hidden="true" />
    </button>,
    document.body,
  );
}

export default FabWhatsApp;
