/**
 * EstadoSeccion.tsx
 * =================
 * Estado de una lista/sección del Panel (cargando · error · vacío) con un diseño unificado.
 * Reemplaza los `EstadoMensaje` locales que estaban duplicados en Negocios, Usuarios y Suscripciones.
 *
 * - **vacío**    → ícono del módulo en un cuadro sutil + título + descripción + acción opcional
 *                  ("Limpiar filtros", que solo se pasa cuando el vacío viene de un filtro activo).
 * - **cargando** → spinner + título.
 * - **error**    → ícono en tono peligro + título + descripción.
 *
 * Estética del Panel (Tokens_Panel.md): neutro + un acento; nada de círculos pastel; jerarquía por
 * peso. El cuadro del ícono usa `superficie-2` + borde tenue (estilo Stripe/Linear).
 *
 * Ubicación: apps/admin/src/components/ui/EstadoSeccion.tsx
 */
import { Loader2, RotateCcw, type LucideIcon } from 'lucide-react';

interface EstadoSeccionProps {
  /** Ícono del módulo (vacío/error). P. ej. Store · Users · Layers. */
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
  variante?: 'vacio' | 'cargando' | 'error';
  /** Acción opcional (p. ej. "Limpiar filtros"). No se muestra en la variante "cargando". */
  accion?: { etiqueta: string; onClick: () => void };
}

export function EstadoSeccion({ icono: Icono, titulo, descripcion, variante = 'vacio', accion }: EstadoSeccionProps) {
  const esError = variante === 'error';
  const esCargando = variante === 'cargando';

  return (
    <div className="grid h-full min-h-[240px] place-items-center px-6 py-10 text-center" data-testid="estado-seccion">
      <div className="flex max-w-[300px] flex-col items-center">
        <div
          className={`mb-3.5 grid h-12 w-12 place-items-center rounded-[12px] ${
            esError ? 'bg-peligro-suave text-peligro' : 'border border-borde bg-superficie-2 text-texto-3'
          }`}
        >
          {esCargando ? <Loader2 size={22} className="animate-spin" /> : <Icono size={22} />}
        </div>
        <p className={`text-[14.5px] font-semibold ${esError ? 'text-peligro' : 'text-texto-2'}`}>{titulo}</p>
        {descripcion && <p className="mt-1 text-[12.5px] leading-relaxed text-texto-4">{descripcion}</p>}
        {accion && !esCargando && (
          <button
            type="button"
            data-testid="estado-accion"
            onClick={accion.onClick}
            className="mt-4 inline-flex items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-3 py-1.5 text-[12.5px] font-semibold text-texto-2 transition hover:bg-marca-suave"
          >
            <RotateCcw size={14} />
            {accion.etiqueta}
          </button>
        )}
      </div>
    </div>
  );
}

export default EstadoSeccion;
