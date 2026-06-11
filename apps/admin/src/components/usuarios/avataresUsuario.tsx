/**
 * avataresUsuario.tsx
 * ====================
 * Avatar de persona para la sección Usuarios: muestra la foto (avatarUrl) si existe,
 * o un círculo con iniciales y color estable por nombre. Reusa colorDeNombre/iniciales
 * de Negocios (mismo lenguaje visual del Panel).
 *
 * Ubicación: apps/admin/src/components/usuarios/avataresUsuario.tsx
 */

import { useState } from 'react';
import { colorDeNombre, iniciales } from '../negocios/avatares';

/** Avatar circular de un usuario: foto si hay (con fallback a iniciales si la imagen
 *  falla al cargar), si no iniciales sobre color sólido. */
export function AvatarUsuario({
  nombre,
  avatarUrl,
  tam = 38,
}: {
  nombre: string;
  avatarUrl?: string | null;
  tam?: number;
}) {
  const [error, setError] = useState(false);
  if (avatarUrl && !error) {
    return (
      <img
        src={avatarUrl}
        alt={nombre}
        onError={() => setError(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: tam, height: tam }}
      />
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.36), background: colorDeNombre(nombre) }}
    >
      {iniciales(nombre)}
    </span>
  );
}
