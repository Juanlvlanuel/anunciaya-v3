/**
 * PaginaInicio.tsx — Home (visión v3, abril 2026)
 * ================================================
 * El Home ya NO es un hub con feeds por sección. Toda la pantalla queda
 * reservada para el feed conversacional **Pregúntale a [Ciudad]**:
 * buscador hiperlocal + tarjetas de preguntas/respuestas de la comunidad
 * + mascota/identidad visual (a aterrizar en sprint dedicado).
 *
 * Por ahora se renderiza un placeholder con el nombre correcto, parametrizado
 * por la ciudad activa de `useGpsStore`. El diseño completo (mascota, feed,
 * push notifications por keywords) se aterriza en su propio sprint —
 * ver `docs/VISION_ESTRATEGICA_AnunciaYA.md` §4.
 *
 * Ubicación: apps/web/src/pages/private/PaginaInicio.tsx
 */

import { MessageCircleQuestion } from 'lucide-react';
import { useGpsStore } from '../../stores/useGpsStore';

export function PaginaInicio() {
  const ciudad = useGpsStore((state) => state.ciudad);
  const nombreCiudad = ciudad?.nombre || 'Peñasco';

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-6 lg:p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-blue-50 border-2 border-dashed border-blue-300 flex items-center justify-center">
          <MessageCircleQuestion
            className="w-10 h-10 lg:w-12 lg:h-12 text-blue-500"
            strokeWidth={1.75}
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl 2xl:text-4xl font-extrabold text-slate-800">
            Pregúntale a {nombreCiudad}
          </h1>
          <p className="text-sm lg:text-base text-slate-500">
            🚧 Sección en construcción
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:p-6 shadow-sm text-left space-y-3">
          <p className="text-sm lg:text-base text-slate-600 leading-relaxed">
            Aquí va el corazón del Home: un buscador hiperlocal con feed
            conversacional. Cuando un vecino pregunte algo, el sistema
            notificará a negocios y usuarios cuyo perfil coincida con las
            palabras clave, y cualquiera podrá responder.
          </p>
          <p className="text-xs lg:text-sm text-slate-400 italic">
            Pendiente de diseñar: mascota, layout del feed, flujo de
            preguntas y matching por keywords. Ver
            {' '}<code className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">docs/VISION_ESTRATEGICA_AnunciaYA.md §4</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PaginaInicio;
