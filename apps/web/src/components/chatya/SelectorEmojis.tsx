/**
 * SelectorEmojis.tsx
 * ====================
 * Picker de emojis reutilizable con estilo Google Noto.
 *
 * USOS:
 * 1. Botón "+" en emojis rápidos → reaccionar con cualquier emoji
 * 2. Botón 😊 en InputMensaje → insertar emoji en el texto
 *
 * UBICACIÓN: apps/web/src/components/chatya/SelectorEmojis.tsx
 */

import { useEffect, useRef } from 'react';
import EmojiPicker, { EmojiStyle, Theme, EmojiClickData, Categories } from 'emoji-picker-react';

interface SelectorEmojisProps {
  /** Callback al seleccionar un emoji */
  onSeleccionar: (emoji: string, unified: string) => void;
  /** Cerrar el picker */
  onCerrar: () => void;
  /** Posición del picker respecto al trigger */
  posicion?: 'arriba-izq' | 'arriba-der' | 'abajo-izq' | 'abajo-der';
  /** Ancho del picker */
  ancho?: number;
  /** Alto del picker */
  alto?: number;
  /** Si debe cerrarse al seleccionar un emoji (default: true) */
  cerrarAlSeleccionar?: boolean;
}

const CATEGORIAS = [
  { category: Categories.SUGGESTED, name: 'Recientes' },
  { category: Categories.SMILEYS_PEOPLE, name: 'Emoticonos y personas' },
  { category: Categories.ANIMALS_NATURE, name: 'Animales y naturaleza' },
  { category: Categories.FOOD_DRINK, name: 'Alimentos y bebidas' },
  { category: Categories.ACTIVITIES, name: 'Actividades' },
  { category: Categories.TRAVEL_PLACES, name: 'Viajes y lugares' },
  { category: Categories.OBJECTS, name: 'Objetos' },
  { category: Categories.SYMBOLS, name: 'Símbolos' },
  { category: Categories.FLAGS, name: 'Banderas' },
];
export function SelectorEmojis({
  onSeleccionar,
  onCerrar,
  posicion = 'arriba-izq',
  ancho = 320,
  alto = 380,
  cerrarAlSeleccionar = true,
}: SelectorEmojisProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Click fuera para cerrar
  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCerrar();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickFuera);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickFuera);
    };
  }, [onCerrar]);

  // ESC para cerrar
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCerrar]);

  const handleClick = (emojiData: EmojiClickData) => {
    onSeleccionar(emojiData.emoji, emojiData.unified);
    if (cerrarAlSeleccionar) onCerrar();
  };

  const posClasses: Record<string, string> = {
    'arriba-izq': 'bottom-full left-0 mb-2',
    'arriba-der': 'bottom-full right-0 mb-2',
    'abajo-izq': 'top-full left-0 mt-2',
    'abajo-der': 'top-full right-0 mt-2',
  };

  return (
    <div
      ref={ref}
      className={`absolute z-50 ${posClasses[posicion]} selector-emojis`}
    >
      <EmojiPicker
        emojiStyle={EmojiStyle.GOOGLE}
        theme={Theme.DARK}
        searchPlaceholder="Buscar emoji..."
        width={ancho}
        height={alto}
        categories={CATEGORIAS}
        onEmojiClick={handleClick}
        previewConfig={{ showPreview: false }}
        skinTonesDisabled
        lazyLoadEmojis
      />
    </div>
  );
}

export default SelectorEmojis;