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
    <div className="flex justify-center py-2" data-fecha={texto}>
      <span className="text-[11px] font-semibold tracking-wide px-3.5 py-1 rounded-lg bg-[#0a1628]/80 text-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.2)] lg:bg-white/90 lg:text-gray-500 lg:shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:border lg:border-gray-200">
        {texto}
      </span>
    </div>
  );
}

export default SeparadorFecha;