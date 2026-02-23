/**
 * emojiUtils.ts
 * ===============
 * Utilidades para detectar mensajes compuestos solo de emojis
 * y determinar el tamaño de renderizado.
 *
 * UBICACIÓN: apps/web/src/components/chatya/emojiUtils.ts
 */

/** Regex que detecta emojis Unicode (misma que TextoConEmojis) */
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;

/** Regex para verificar que SOLO hay emojis y espacios */

/**
 * Analiza un mensaje y determina si es solo emojis.
 * Retorna null si tiene texto, o el conteo de emojis si es solo emojis.
 */
export function analizarEmojis(texto: string): { soloEmojis: boolean; cantidad: number } {
  // Quitar espacios y verificar si queda algo que NO sea emoji
  const sinEmojis = texto.replace(EMOJI_REGEX, '').trim();
  
  if (sinEmojis.length > 0) {
    return { soloEmojis: false, cantidad: 0 };
  }

  // Contar emojis
  const matches = texto.match(EMOJI_REGEX);
  const cantidad = matches ? matches.length : 0;

  return { soloEmojis: cantidad > 0, cantidad };
}

/**
 * Retorna el tamaño del emoji según la cantidad en un mensaje solo-emoji.
 * - 1 emoji: 56px (grande)
 * - 2 emojis: 44px (mediano)
 * - 3+: 36px (pequeño-mediano)
 */
export function tamañoEmojiSolo(cantidad: number): number {
  if (cantidad === 1) return 56;
  if (cantidad === 2) return 44;
  return 36;
}