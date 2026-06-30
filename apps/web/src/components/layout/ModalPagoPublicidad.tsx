/**
 * ModalPagoPublicidad.tsx
 * =======================
 * Modal global del RESULTADO del pago de publicidad. Se monta en MainLayout y detecta el query param
 * `?publicidad=` con que Stripe Checkout devuelve a la app tras pagar/renovar:
 *   - `exito`     → compra nueva confirmada
 *   - `renovada`  → renovación confirmada (vigencia extendida)
 *   - `cancelado` → el usuario canceló en Stripe (sin cargo)
 *
 * Al confirmarse el pago refresca "Tu publicidad" (membresía) y los carruseles (el webhook ya está
 * activando el anuncio en segundo plano) y limpia el param de la URL.
 *
 * Nota: el RECHAZO de tarjeta lo gestiona Stripe dentro de su propia pantalla (ahí el usuario reintenta);
 * a la app solo se vuelve por éxito o por cancelación.
 *
 * Ubicación: apps/web/src/components/layout/ModalPagoPublicidad.tsx
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { queryKeys } from '../../config/queryKeys';

type Resultado = 'exito' | 'renovada' | 'cancelado';
const VALIDOS: readonly string[] = ['exito', 'renovada', 'cancelado'];

export function ModalPagoPublicidad() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    const param = searchParams.get('publicidad');
    if (!param || !VALIDOS.includes(param)) return;

    setResultado(param as Resultado);

    // Pago completado: refresca "Tu publicidad" + carruseles (el webhook activa el anuncio en paralelo).
    if (param === 'exito' || param === 'renovada') {
      queryClient.invalidateQueries({ queryKey: queryKeys.membresia.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.publicidad.all() });
    }

    // Limpia el param para que no reaparezca al navegar/refrescar (el modal lo controla el estado local).
    const next = new URLSearchParams(searchParams);
    next.delete('publicidad');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!resultado) return null;

  const exito = resultado === 'exito' || resultado === 'renovada';
  const cerrar = () => setResultado(null);

  const titulo = resultado === 'renovada' ? '¡Renovación confirmada!' : exito ? '¡Pago confirmado!' : 'Pago no completado';
  const mensaje =
    resultado === 'renovada'
      ? 'Tu anuncio se renovó y su vigencia se extendió. Puede tardar unos segundos en reflejarse.'
      : exito
        ? 'Tu anuncio se activó. Puede tardar unos segundos en aparecer en los carruseles.'
        : 'Cancelaste el pago, no se hizo ningún cargo. Puedes intentarlo de nuevo cuando quieras.';

  return (
    <ModalAdaptativo abierto onCerrar={cerrar} mostrarHeader={false} ancho="sm" centrado zIndice="z-[70]">
      <div className="flex flex-col items-center px-2 py-4 text-center" data-testid="modal-pago-publicidad">
        <div className="mb-4 inline-flex items-center justify-center">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ${exito ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md ${exito ? 'bg-emerald-600' : 'bg-amber-500'}`}>
              {exito ? <Check className="h-6 w-6 text-white" strokeWidth={3} /> : <X className="h-6 w-6 text-white" strokeWidth={3} />}
            </div>
          </div>
        </div>
        <h2 className="text-lg lg:text-base 2xl:text-lg font-extrabold text-slate-900">{titulo}</h2>
        <p className="mt-2 text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">{mensaje}</p>
        <button
          type="button"
          onClick={cerrar}
          data-testid="modal-pago-publicidad-cerrar"
          className="mt-5 w-full cursor-pointer rounded-xl bg-linear-to-r from-slate-700 to-slate-800 py-3 text-base lg:text-sm 2xl:text-base font-bold text-white shadow-md transition-all duration-150 hover:from-slate-800 hover:to-slate-900 active:scale-[0.98]"
        >
          Entendido
        </button>
      </div>
    </ModalAdaptativo>
  );
}

export default ModalPagoPublicidad;
