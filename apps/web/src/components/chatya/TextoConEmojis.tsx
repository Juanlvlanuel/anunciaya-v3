/**
 * TextoConEmojis.tsx
 * ====================
 * Renderiza texto reemplazando emojis nativos por imágenes Google Noto.
 * Útil para previews en lista de conversaciones y burbujas.
 *
 * UBICACIÓN: apps/web/src/components/chatya/TextoConEmojis.tsx
 */

import { EmojiNoto } from './EmojiNoto';

/** Regex que detecta emojis Unicode (simplificada, cubre los más comunes) */
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

interface TextoConEmojisProps {
  texto: string;
  tamañoEmoji?: number;
  className?: string;
}

export function TextoConEmojis({ texto, tamañoEmoji = 14, className = '' }: TextoConEmojisProps) {
  const partes = texto.split(EMOJI_REGEX);

  return (
    <span className={className}>
      {partes.map((parte, i) =>
        EMOJI_REGEX.test(parte) ? (
          <EmojiNoto key={i} emoji={parte} tamaño={tamañoEmoji} className="align-[-0.45em] mx-px" />
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </span>
  );
}

export default TextoConEmojis;