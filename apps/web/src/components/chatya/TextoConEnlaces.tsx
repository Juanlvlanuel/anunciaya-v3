/**
 * TextoConEnlaces.tsx
 * ====================
 * Renderiza texto con emojis Noto + URLs como links clicables.
 * Extiende TextoConEmojis para detectar URLs y renderizarlas como <a>.
 *
 * UBICACIÓN: apps/web/src/components/chatya/TextoConEnlaces.tsx
 */

import { TextoConEmojis } from './TextoConEmojis';
import { URL_REGEX } from './enlacesUtils';

interface TextoConEnlacesProps {
  texto: string;
  tamañoEmoji?: number;
  esMio: boolean;
}

export function TextoConEnlaces({ texto, tamañoEmoji = 26, esMio }: TextoConEnlacesProps) {
  // Dividir texto por URLs, manteniendo las URLs como separadores
  const partes = texto.split(URL_REGEX);
  const urls = texto.match(URL_REGEX) || [];

  // Intercalar texto con links
  const elementos: (string | { tipo: 'url'; valor: string })[] = [];

  partes.forEach((parte, i) => {
    if (parte) elementos.push(parte);
    if (i < urls.length) elementos.push({ tipo: 'url', valor: urls[i] });
  });

  return (
    <span>
      {elementos.map((elem, i) => {
        if (typeof elem === 'string') {
          return <TextoConEmojis key={i} texto={elem} tamañoEmoji={tamañoEmoji} />;
        }

        return (
          <a
            key={i}
            href={elem.valor}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`underline break-all ${esMio ? 'text-blue-200 hover:text-blue-100' : 'text-blue-300 hover:text-blue-200'}`}
          >
            {elem.valor}
          </a>
        );
      })}
    </span>
  );
}

export default TextoConEnlaces;
