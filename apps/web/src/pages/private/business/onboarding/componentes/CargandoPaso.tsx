/**
 * CargandoPaso.tsx
 * =================
 * Loader de marca para el estado de carga de cada paso del onboarding.
 * Reemplaza el spinner Loader2 + "Cargando..." que estaba duplicado en los 8 pasos,
 * usando el mismo estilo de marca que "Verificando sesión…" (logo "latiendo" + shimmer),
 * a escala chica para que quepa dentro del área de contenido del paso.
 *
 * Ubicación: apps/web/src/pages/private/business/onboarding/componentes/CargandoPaso.tsx
 */

import { LogoAnimadoSaludo } from '@/components/LogoAnimadoSaludo';

export function CargandoPaso() {
  return (
    <div className="flex items-center justify-center py-8 lg:py-10 2xl:py-12">
      <div className="flex flex-col items-center gap-2">
        <LogoAnimadoSaludo size={72} />
        <span className="texto-shimmer text-sm font-bold tracking-wide">Cargando…</span>
      </div>
    </div>
  );
}

export default CargandoPaso;
