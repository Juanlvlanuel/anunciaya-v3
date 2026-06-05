/**
 * EncabezadoMovil.tsx
 * ====================
 * Header negro del shell móvil: logo, pendientes (ícono inline) y avatar. La
 * navegación vive en la barra inferior (tab bar), no en el header.
 *
 * Ubicación: apps/admin/src/components/shell/EncabezadoMovil.tsx
 */

import { BandejaPendientes } from './BandejaPendientes';
import { AvatarUsuario } from './AvatarUsuario';
import type { RolPanel } from '../../data/menuPanel';

const LOGO_OSCURO = '/logo-anunciaya-azul.webp';

interface EncabezadoMovilProps {
  rol: RolPanel;
  nombre: string;
  avatarUrl?: string | null;
}

export function EncabezadoMovil({ rol, nombre, avatarUrl }: EncabezadoMovilProps) {
  return (
    <div className="flex items-center gap-3 bg-[#0e0f13] px-5 py-4">
      <img src={LOGO_OSCURO} alt="AnunciaYA" className="h-[48px] w-auto" />
      <div className="flex-1" />
      <div className="flex items-center gap-5">
        <BandejaPendientes rol={rol} variante="movil" />
        <AvatarUsuario nombre={nombre} avatarUrl={avatarUrl} tam={44} />
      </div>
    </div>
  );
}

export default EncabezadoMovil;
