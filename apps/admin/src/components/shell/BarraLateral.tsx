/**
 * BarraLateral.tsx
 * =================
 * Sidebar del shell escritorio (variante Inset): grupos + ítems con estado
 * activo "barra", contadores, y al pie el usuario en sesión + cerrar sesión.
 * Fondo transparente sobre el lienzo.
 *
 * Ubicación: apps/admin/src/components/shell/BarraLateral.tsx
 */

import { LogOut } from 'lucide-react';
import { iconoDeSeccion } from '../../config/iconosPanel';
import { gruposParaRol, etiquetaDe, type RolPanel } from '../../data/menuPanel';
import { AvatarUsuario } from './AvatarUsuario';

interface BarraLateralProps {
  rol: RolPanel;
  seccionActivaId: string;
  onSeleccionar: (id: string) => void;
  nombre: string;
  avatarUrl?: string | null;
  onCerrarSesion: () => void;
}

const ETIQUETA_ROL: Record<RolPanel, string> = {
  superadmin: 'SuperAdmin',
  gerente: 'Gerente regional',
  vendedor: 'Vendedor',
};

export function BarraLateral({
  rol,
  seccionActivaId,
  onSeleccionar,
  nombre,
  avatarUrl,
  onCerrarSesion,
}: BarraLateralProps) {
  const grupos = gruposParaRol(rol);

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {grupos.map((g) => (
          <div key={g.id} className="mb-3">
            <div className="px-2.5 pb-1.5 pt-1 text-[13px] font-semibold text-etiqueta-grupo">{g.etiqueta}</div>
            {g.items.map((it) => {
              const activo = it.id === seccionActivaId;
              const contador = it.contadorPorRol?.[rol];
              const Icono = iconoDeSeccion(it.icono);
              return (
                <button
                  key={it.id}
                  type="button"
                  data-testid={`nav-${it.id}`}
                  onClick={() => onSeleccionar(it.id)}
                  className={`relative mb-0.5 flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13.5px] transition ${
                    activo
                      ? 'bg-marca-suave font-semibold text-marca'
                      : 'text-texto-2 hover:bg-marca-suave'
                  }`}
                >
                  {activo && <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r bg-marca" />}
                  <Icono size={18} className={activo ? 'text-marca' : 'text-texto-3'} />
                  <span className="flex-1">{etiquetaDe(it, rol)}</span>
                  {contador ? (
                    <span className="rounded-full bg-marca-suave px-2 py-0.5 text-[11px] font-semibold text-texto-2">
                      {contador}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-borde p-2.5">
        <div className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5">
          <AvatarUsuario nombre={nombre} avatarUrl={avatarUrl} tam={40} />
          <span className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-[13px] font-semibold text-texto">{nombre}</span>
            <span className="truncate text-[12px] text-texto-2">{ETIQUETA_ROL[rol]}</span>
          </span>
          <button
            type="button"
            data-testid="cerrar-sesion-escritorio"
            onClick={onCerrarSesion}
            aria-label="Cerrar sesión"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-texto-3 transition hover:bg-peligro hover:text-white"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BarraLateral;
