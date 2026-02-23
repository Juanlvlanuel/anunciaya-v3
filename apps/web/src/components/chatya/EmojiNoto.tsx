/**
 * EmojiNoto.tsx
 * ===============
 * Renderiza un emoji como imagen Google Noto en lugar del emoji nativo del SO.
 * Garantiza consistencia visual en todos los dispositivos.
 *
 * UBICACIÓN: apps/web/src/components/chatya/EmojiNoto.tsx
 */

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/emoji-datasource-google@15.0.1/img/google/64';

/**
 * Convierte un emoji nativo a su código unified para la URL del CDN.
 * Ej: "👍" → "1f44d", "❤️" → "2764-fe0f"
 */
function emojiAUnified(emoji: string): string {
  return [...emoji]
    .map((char) => char.codePointAt(0)!.toString(16))
    .join('-');
}

interface EmojiNotoProps {
  emoji: string;
  tamaño?: number;
  className?: string;
}

export function EmojiNoto({ emoji, tamaño = 20, className = '' }: EmojiNotoProps) {
  const unified = emojiAUnified(emoji);

  return (
    <img
      src={`${CDN_BASE}/${unified}.png`}
      alt={emoji}
      width={tamaño}
      height={tamaño}
      loading="lazy"
      className={`inline-block ${className}`}
      style={{ width: tamaño, height: tamaño }}
      onError={(e) => {
        // Fallback: si la imagen no carga, mostrar emoji nativo
        (e.target as HTMLImageElement).style.display = 'none';
        (e.target as HTMLImageElement).insertAdjacentText('afterend', emoji);
      }}
    />
  );
}

export default EmojiNoto;