/**
 * SeparadorFecha.tsx
 * ===================
 * Separador visual entre grupos de mensajes por fecha.
 * Muestra "Hoy", "Ayer", o la fecha completa.
 *
 * UBICACIÓN: apps/web/src/components/chatya/SeparadorFecha.tsx
 */

// =============================================================================
// HELPERS
// =============================================================================

function formatearFechaLegible(fechaStr: string): string {
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  const hoyStr = hoy.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const ayerStr = ayer.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  if (fechaStr === hoyStr) return 'Hoy';
  if (fechaStr === ayerStr) return 'Ayer';
  return fechaStr;
}

// =============================================================================
// COMPONENTE
// =============================================================================

interface SeparadorFechaProps {
  fecha: string;
}

export function SeparadorFecha({ fecha }: SeparadorFechaProps) {
  const texto = formatearFechaLegible(fecha);

  return (
    <div className="flex justify-center py-2">
      <span className="text-[10px] font-semibold text-gray-500 bg-white px-3 py-1 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] tracking-wide">
        {texto}
      </span>
    </div>
  );
}

export default SeparadorFecha;
