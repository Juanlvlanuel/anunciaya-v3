import { Icon } from './icons';

interface ContactBarProps {
  onChat?: () => void;
  onWhatsApp?: () => void;
  /** Si la publicación está pausada, todo el botón se deshabilita y se baja el alfa. */
  disabled?: boolean;
  disabledLabel?: string;
}

/**
 * Bottom bar fija de contacto — 2 botones, ChatYA dominante + WhatsApp icónico.
 * En desktop esta misma estructura vive sticky dentro de la card lateral.
 */
export function ContactBar({
  onChat,
  onWhatsApp,
  disabled,
  disabledLabel = 'Contacto deshabilitado',
}: ContactBarProps) {
  if (disabled) {
    return (
      <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 flex items-center gap-2">
        <button
          disabled
          className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-400 font-bold text-[14px] cursor-not-allowed"
        >
          {disabledLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 flex items-center gap-2">
      <button
        onClick={onChat}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 text-white font-bold text-[14px] shadow-md shadow-sky-500/30 hover:shadow-lg hover:shadow-sky-500/40 transition"
      >
        <Icon.Chat size={16} /> Contactar por ChatYA
      </button>
      <button
        onClick={onWhatsApp}
        className="w-12 h-12 rounded-xl bg-emerald-500 text-white grid place-items-center hover:bg-emerald-600 transition"
        aria-label="WhatsApp"
      >
        <Icon.WhatsApp size={20} />
      </button>
    </div>
  );
}
