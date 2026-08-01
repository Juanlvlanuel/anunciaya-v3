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
 *   - Con alterno → muestra un popover anclado al botón (mismo patrón que
 *     `DropdownCompartir`: fixed + getBoundingClientRect + portal a
 *     document.body) para elegir cuál abrir, en vez del modal centrado
 *     que se usaba antes.
 *
 * USO:
 *   const { abrir, menu } = useAbrirWhatsApp();
 *   <button onClick={(e) => abrir(e, negocio.whatsapp, negocio.whatsappAlterno)}>
 *   ...
 *   {menu}
 *
 * Ubicación: apps/web/src/hooks/useAbrirWhatsApp.tsx
 */
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { ICONOS_REMOTOS } from '../config/iconos';
import { useBackNativo } from './useBackNativo';

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

/** Un número solo cuenta como real si trae suficientes dígitos propios (no solo la lada). */
function tieneNumeroValido(numero?: string | null): boolean {
  if (!numero) return false;
  return numero.replace(/\D/g, '').length >= 8;
}

/** Ancho del dropdown (w-56 = 224px) — usado para centrarlo y no dejarlo salir de pantalla. */
const ANCHO_DROPDOWN = 224;
const MARGEN_VIEWPORT = 8;
/** Margen mínimo del triángulo respecto a las esquinas redondeadas del dropdown. */
const MARGEN_FLECHA = 14;

/**
 * Centra el dropdown en `anchorX` (centro X real del ícono clickeado), pero
 * sin dejar que se corte contra los bordes del viewport — típico en móvil,
 * donde centrarlo tal cual podría sacarlo de pantalla. El triángulo se
 * desplaza DENTRO del dropdown para seguir apuntando al ícono real aunque
 * el dropdown se haya tenido que desplazar para caber.
 */
function calcularPosicionCentrada(anchorX: number, anchoDisponible: number = window.innerWidth): { boxLeft: number; flechaLeft: number } {
  const mitad = ANCHO_DROPDOWN / 2;
  const boxLeft = Math.min(Math.max(anchorX, mitad + MARGEN_VIEWPORT), anchoDisponible - mitad - MARGEN_VIEWPORT);
  const flechaLeft = Math.min(Math.max(anchorX - boxLeft + mitad, MARGEN_FLECHA), ANCHO_DROPDOWN - MARGEN_FLECHA);
  return { boxLeft, flechaLeft };
}

export { calcularPosicionCentrada };

interface DropdownPosition {
  top: number;
  /** Centro X real del ícono clickeado (viewport), sin clampear todavía. */
  centro: number;
}

interface OpcionesPendientes {
  principal: string;
  alterno: string;
  mensaje?: string;
  posicion: DropdownPosition;
}

export function useAbrirWhatsApp() {
  const [pendiente, setPendiente] = useState<OpcionesPendientes | null>(null);

  const cerrar = useCallback(() => setPendiente(null), []);

  useBackNativo({
    abierto: !!pendiente,
    onCerrar: cerrar,
    discriminador: '_popoverWhatsappAlterno',
  });

  useEffect(() => {
    if (!pendiente) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [pendiente, cerrar]);

  const abrir = useCallback((e: MouseEvent<HTMLElement>, principal: string | null | undefined, alterno?: string | null, mensaje?: string) => {
    if (!principal) return;
    if (!tieneNumeroValido(alterno)) {
      window.open(construirLinkWhatsApp(principal, mensaje), '_blank', 'noopener,noreferrer');
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setPendiente({
      principal,
      alterno: alterno as string,
      mensaje,
      posicion: { top: rect.bottom + 12, centro: rect.left + rect.width / 2 },
    });
  }, []);

  const elegir = useCallback((numero: string) => {
    if (!pendiente) return;
    window.open(construirLinkWhatsApp(numero, pendiente.mensaje), '_blank', 'noopener,noreferrer');
    setPendiente(null);
  }, [pendiente]);

  const menu = pendiente && (() => {
    const { boxLeft, flechaLeft } = calcularPosicionCentrada(pendiente.posicion.centro);
    return createPortal(
      <>
        <div className="fixed inset-0 z-9998" onClick={cerrar} />
        <div
          className="fixed w-56 bg-slate-900 rounded-xl shadow-lg py-2 z-9999"
          style={{ top: pendiente.posicion.top, left: boxLeft, transform: 'translateX(-50%)' }}
        >
          {/* Triángulo apuntando al ícono — arriba del dropdown, ya que este vive debajo del ícono */}
          <div
            className="absolute bottom-full -translate-x-1/2 w-0 h-0"
            style={{ left: flechaLeft, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid #0f172a' }}
          />
          <button
            type="button"
            onClick={() => elegir(pendiente.principal)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icon icon={ICONOS_REMOTOS.whatsapp} className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white">{formatearNumero(pendiente.principal)}</span>
          </button>
          <button
            type="button"
            onClick={() => elegir(pendiente.alterno)}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icon icon={ICONOS_REMOTOS.whatsapp} className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold text-white">{formatearNumero(pendiente.alterno)}</span>
          </button>
        </div>
      </>,
      document.body
    );
  })();

  return { abrir, menu };
}

export default useAbrirWhatsApp;
