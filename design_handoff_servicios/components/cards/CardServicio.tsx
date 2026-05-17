import { Icon } from '../icons';

interface CardServicioProps {
  photoUrl?: string;
  /** Si no hay photoUrl, se muestra un placeholder striped. */
  photoLabel?: string;
  avatarInitials: string;
  oferenteNombre: string;
  titulo: string;
  /** Precio formateado por el padre — ej. "$350/h", "$2,800", "A convenir" */
  precio: string;
  modalidad: 'Presencial' | 'Remoto' | 'Híbrido';
  distancia: string; // "0.8 km · hace 1h"
  onClick?: () => void;
}

/**
 * Card SERVICIO-PERSONA — borde slate-200, foto del trabajo arriba, avatar visible.
 * Una persona física ofreciendo sus habilidades.
 */
export function CardServicio({
  photoUrl,
  photoLabel = 'foto del trabajo',
  avatarInitials,
  oferenteNombre,
  titulo,
  precio,
  modalidad,
  distancia,
  onClick,
}: CardServicioProps) {
  return (
    <article
      onClick={onClick}
      className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-md cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
    >
      <div className="aspect-[4/3] relative bg-stripe">
        {photoUrl ? (
          <img src={photoUrl} alt={titulo} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="text-slate-500/70 text-[10px] tracking-widest uppercase font-mono">{photoLabel}</span>
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 text-[10px] font-bold uppercase tracking-wider text-slate-700">
          Servicio
        </span>
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 grid place-items-center text-[9px] font-bold text-white">
            {avatarInitials}
          </div>
          <span className="text-[11px] font-semibold text-slate-600">{oferenteNombre}</span>
        </div>
        <div className="text-[14px] font-bold text-slate-900 leading-snug truncate">{titulo}</div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[15px] font-extrabold text-slate-900">{precio}</span>
          <span className="text-[11px] font-semibold text-slate-500">· {modalidad}</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <Icon.Pin size={11} /> {distancia}
        </div>
      </div>
    </article>
  );
}
