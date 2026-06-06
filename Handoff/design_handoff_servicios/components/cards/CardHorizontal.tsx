interface CardHorizontalProps {
  photoUrl?: string;
  photoLabel?: string;
  titulo: string;
  precio: string;
  meta: string; // "Remoto · hace 1h"
  onClick?: () => void;
}

/**
 * Variante horizontal compacta — usada en el carrusel "Recién publicado".
 * Ancho fijo 220px, aspect 4:3.
 */
export function CardHorizontal({
  photoUrl,
  photoLabel = 'foto / publicación',
  titulo,
  precio,
  meta,
  onClick,
}: CardHorizontalProps) {
  return (
    <article
      onClick={onClick}
      className="w-[220px] rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md shrink-0 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
    >
      <div className="aspect-[4/3] relative bg-stripe">
        {photoUrl ? (
          <img src={photoUrl} alt={titulo} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-slate-500/70 text-[10px] tracking-widest uppercase font-mono">{photoLabel}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-[13px] font-bold text-slate-900 leading-snug truncate">{titulo}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[14px] font-extrabold text-slate-900">{precio}</span>
          <span className="text-[10px] font-medium text-slate-500">{meta}</span>
        </div>
      </div>
    </article>
  );
}
