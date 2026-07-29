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
 *   - Con alterno → muestra un `ModalAdaptativo` chiquito para elegir cuál
 *     abrir. Antes era un popover anclado con posición manual (fixed +
 *     coordenadas de getBoundingClientRect), pero no se renderizaba dentro
 *     del preview embebido de Business Studio / ChatYA por una causa que no
 *     se pudo aislar pese a confirmar con logs que el estado y las
 *     coordenadas eran correctos. ModalAdaptativo ya resuelve el portal
 *     (`usePortalTarget`) igual que el resto de los modales de la página,
 *     que sí funcionan en ese contexto — se usa esa base probada en vez de
 *     reinventar el posicionamiento.
 *
 * USO:
 *   const { abrir, menu } = useAbrirWhatsApp();
 *   <button onClick={(e) => abrir(e, negocio.whatsapp, negocio.whatsappAlterno)}>
 *   ...
 *   {menu}
 *
 * Ubicación: apps/web/src/hooks/useAbrirWhatsApp.tsx
 */
import { useCallback, useState } from 'react';
import { Icon } from '@iconify/react';
import { ICONOS_REMOTOS } from '../config/iconos';
import { ModalAdaptativo } from '../components/ui/ModalAdaptativo';

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
}

export function useAbrirWhatsApp() {
  const [pendiente, setPendiente] = useState<OpcionesPendientes | null>(null);

  const abrir = useCallback((_e: unknown, principal: string | null | undefined, alterno?: string | null, mensaje?: string) => {
    if (!principal) return;
    if (!alterno) {
      window.open(construirLinkWhatsApp(principal, mensaje), '_blank', 'noopener,noreferrer');
      return;
    }
    setPendiente({ principal, alterno, mensaje });
  }, []);

  const elegir = useCallback((numero: string) => {
    if (!pendiente) return;
    window.open(construirLinkWhatsApp(numero, pendiente.mensaje), '_blank', 'noopener,noreferrer');
    setPendiente(null);
  }, [pendiente]);

  const menu = (
    <ModalAdaptativo
      abierto={!!pendiente}
      onCerrar={() => setPendiente(null)}
      titulo="Elegir número de WhatsApp"
      ancho="sm"
      paddingContenido="sm"
      discriminador="_modalWhatsappAlterno"
    >
      {pendiente && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => elegir(pendiente.principal)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            <Icon icon={ICONOS_REMOTOS.whatsapp} className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-base font-semibold text-slate-800">{formatearNumero(pendiente.principal)}</span>
          </button>
          <button
            type="button"
            onClick={() => elegir(pendiente.alterno)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer"
          >
            <Icon icon={ICONOS_REMOTOS.whatsapp} className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-base font-semibold text-slate-800">{formatearNumero(pendiente.alterno)}</span>
          </button>
        </div>
      )}
    </ModalAdaptativo>
  );

  return { abrir, menu };
}

export default useAbrirWhatsApp;
