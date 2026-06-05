/**
 * AvatarUsuario.tsx
 * ==================
 * Avatar circular: foto si existe, si no las iniciales del nombre sobre el azul
 * de marca. Tamaño configurable.
 *
 * Ubicación: apps/admin/src/components/shell/AvatarUsuario.tsx
 */

interface AvatarUsuarioProps {
  nombre: string;
  avatarUrl?: string | null;
  tam?: number;
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '·';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

export function AvatarUsuario({ nombre, avatarUrl, tam = 32 }: AvatarUsuarioProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={nombre}
        style={{ width: tam, height: tam }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: tam, height: tam, fontSize: Math.round(tam * 0.38) }}
      className="grid shrink-0 place-items-center rounded-full bg-marca font-semibold text-marca-contraste"
    >
      {iniciales(nombre)}
    </span>
  );
}

export default AvatarUsuario;
