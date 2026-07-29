/**
 * useAbrirWhatsApp.tsx
 * =====================
 * Hook compartido para abrir WhatsApp de un negocio, con soporte para un
 * segundo número opcional (WhatsApp alterno — ej. línea de pedidos aparte
 * de la principal).
 *
 * COMPORTAMIENTO:
 *   - Sin alterno → abre el link de WhatsApp directo (idéntico a como
 *     funcionaba antes en los ~16 lugares que ya construían su propio
 *     `wa.me/...`), sin ningún cambio visible.
 *   - Con alterno → muestra un popover discreto (2 renglones con los
 *     números, NO modal de pantalla completa) anclado justo encima del
 *     ícono que se clickeó, y abre el que el usuario elija.
 *
 * USO:
 *   const { abrir, menu } = useAbrirWhatsApp();
 *   <button onClick={(e) => abrir(e, negocio.whatsapp, negocio.whatsappAlterno)}>
 *   ...
 *   {menu}
 *
 * Ubicación: apps/web/src/hooks/useAbrirWhatsApp.tsx
 */
import { useCallback, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { ICONOS_REMOTOS } from '../config/iconos';

/** Limpia el número y arma el link de WhatsApp (mismo criterio que ya usaba cada sitio). */
export function construirLinkWhatsApp(numero: string, mensaje?: string): string {
  const digitos = numero.replace(/\D/g, '');
  return `https://wa.me/${digitos}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
}

/**
 * Formatea un número para mostrar.
 * México (+52 o sin lada, caso default): se omite el "+52" y el número
 * local de 10 dígitos se agrupa como "(638) 128 0610" — el 638 ya es el
 * código de ciudad dentro del propio número, no hace falta repetir el
 * país en cada teléfono.
 * Otro país: si el comerciante puso una lada distinta de +52, sí se
 * conserva visible (ej. "+1 638 128 0610") porque ahí es información real.
 */
export function formatearNumero(numero: string): string {
  const match = numero.match(/^(\+\d{1,3})?\s*(\d+)$/);
  if (!match) return numero;
  const [, lada, digitos] = match;

  if ((!lada || lada === '+52') && digitos.length === 10) {
    return `(${digitos.slice(0, 3)}) ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
  }

  const grupos = digitos.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
  return lada ? `${lada} ${grupos}` : grupos;
}

interface OpcionesPendientes {
  principal: string;
  alterno: string;
  mensaje?: string;
  top: number;
  left: number;
}

/** Ancho del popover (min-w-[190px]) — usado para no dejarlo salir de la pantalla en móvil. */
const ANCHO_POPOVER = 190;
const MARGEN_VIEWPORT = 8;
/** Margen mínimo del triángulo respecto a las esquinas redondeadas del popover. */
const MARGEN_FLECHA = 14;

/**
 * Calcula la posición del popover y de su triángulo indicador a partir del
 * centro X real del ícono clickeado (`anchorX`, sin clampear).
 * - `boxLeft`: dónde centrar el popover (clampeado para no salirse del viewport).
 * - `flechaLeft`: offset del triángulo DENTRO del popover para que siga
 *   apuntando al ícono original aunque el popover se haya desplazado.
 */
export function calcularPosicionPopover(anchorX: number): { boxLeft: number; flechaLeft: number } {
  const mitad = ANCHO_POPOVER / 2;
  const boxLeft = Math.min(Math.max(anchorX, mitad + MARGEN_VIEWPORT), window.innerWidth - mitad - MARGEN_VIEWPORT);
  const flechaLeft = Math.min(Math.max(anchorX - boxLeft + mitad, MARGEN_FLECHA), ANCHO_POPOVER - MARGEN_FLECHA);
  return { boxLeft, flechaLeft };
}

export function useAbrirWhatsApp() {
  const [pendiente, setPendiente] = useState<OpcionesPendientes | null>(null);

  const abrir = useCallback((e: MouseEvent<HTMLElement>, principal: string | null | undefined, alterno?: string | null, mensaje?: string) => {
    if (!principal) return;
    if (!alterno) {
      window.open(construirLinkWhatsApp(principal, mensaje), '_blank', 'noopener,noreferrer');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setPendiente({ principal, alterno, mensaje, top: rect.top - 8, left: rect.left + rect.width / 2 });
  }, []);

  const elegir = useCallback((numero: string) => {
    if (!pendiente) return;
    window.open(construirLinkWhatsApp(numero, pendiente.mensaje), '_blank', 'noopener,noreferrer');
    setPendiente(null);
  }, [pendiente]);

  const menu = pendiente ? (() => {
    const { boxLeft, flechaLeft } = calcularPosicionPopover(pendiente.left);
    return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setPendiente(null)} />
      <div
        className="fixed z-[9999] bg-slate-900 rounded-xl py-1.5 min-w-[190px]"
        style={{ top: pendiente.top, left: boxLeft, transform: 'translate(-50%, -100%)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}
      >
        <button
          type="button"
          onClick={() => elegir(pendiente.principal)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer"
        >
          <Icon icon={ICONOS_REMOTOS.whatsapp} className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-white whitespace-nowrap">{formatearNumero(pendiente.principal)}</span>
        </button>
        <button
          type="button"
          onClick={() => elegir(pendiente.alterno)}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-white/10 cursor-pointer"
        >
          <Icon icon={ICONOS_REMOTOS.whatsapp} className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold text-white whitespace-nowrap">{formatearNumero(pendiente.alterno)}</span>
        </button>
        <div
          className="absolute top-full -translate-x-1/2 w-0 h-0"
          style={{ left: flechaLeft, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #0f172a' }}
        />
      </div>
    </>,
    document.body
    );
  })() : null;

  return { abrir, menu };
}

export default useAbrirWhatsApp;
