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

  const capitalizarMes = (d: Date): string =>
    new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      .formatToParts(d)
      .map((p) => (p.type === 'month' ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : p.value))
      .join('');
  const hoyStr = capitalizarMes(hoy);
  const ayerStr = capitalizarMes(ayer);

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
      <span className="text-[11px] font-semibold tracking-wide px-3.5 py-1 rounded-lg bg-[#1a2d4a]/70 text-white/75 shadow-[0_1px_3px_rgba(0,0,0,0.15)] backdrop-blur-sm">
        {texto}
      </span>
    </div>
  );
}

export default SeparadorFecha;