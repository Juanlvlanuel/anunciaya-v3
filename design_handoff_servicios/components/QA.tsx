interface QAItemProps {
  autor: string; // "Carla M."
  cuando: string; // "hace 1d"
  pregunta: string;
  respuesta?: string;
  /** Solo se muestra a quien preguntó (privacidad). */
  pendiente?: boolean;
}

/**
 * Item de Q&A estilo Mercado Libre — agrupado por preguntón, conector "L".
 * Las pendientes ajenas NO se muestran al visitante; el padre filtra antes.
 */
export function QAItem({ autor, cuando, pregunta, respuesta, pendiente }: QAItemProps) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-2 top-2 w-3 h-6 border-l-2 border-b-2 border-slate-200 rounded-bl-md" />
      <div className="flex items-start gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-200 grid place-items-center text-[10px] font-bold text-slate-600 -ml-8">
          {autor[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-bold text-slate-900">{autor}</span>
            <span className="text-[11px] text-slate-500">· {cuando}</span>
            {pendiente && (
              <span className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                Pendiente
              </span>
            )}
          </div>
          <div className="text-[13px] text-slate-800 font-medium leading-snug">{pregunta}</div>
          {respuesta && (
            <div className="mt-1.5 pl-3 border-l-2 border-sky-200 text-[13px] text-slate-700 leading-snug">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 block mb-0.5">
                Respuesta
              </span>
              {respuesta}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
