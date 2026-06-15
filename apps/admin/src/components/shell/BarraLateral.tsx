/**
 * BarraLateral.tsx
 * =================
 * Sidebar del shell escritorio (Inset): grupos + ítems con estado activo "barra",
 * contadores, y al pie el "Mi cuenta" (avatar que abre un menú con Seguridad —
 * solo SuperAdmin — y Cerrar sesión).
 *
 * Ubicación: apps/admin/src/components/shell/BarraLateral.tsx
 */

import { useState } from 'react';
import { LogOut, ShieldCheck, ChevronUp } from 'lucide-react';
import { iconoDeSeccion } from '../../config/iconosPanel';
import { gruposParaRol, etiquetaDe, type RolPanel } from '../../data/menuPanel';
import { AvatarUsuario } from './AvatarUsuario';
import { useClickFuera } from '../../hooks/useClickFuera';

interface BarraLateralProps {
  rol: RolPanel;
  seccionActivaId: string;
  onSeleccionar: (id: string) => void;
  nombre: string;
  avatarUrl?: string | null;
  onCerrarSesion: () => void;
  /** Contadores reales por id de sección (ej. { negocios: 248 }). Cae al estático si falta. */
  contadores?: Partial<Record<string, number>>;
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
  contadores,
}: BarraLateralProps) {
  const grupos = gruposParaRol(rol);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const refMenu = useClickFuera<HTMLDivElement>(() => setMenuAbierto(false), menuAbierto);

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {grupos.map((g) => (
          <div key={g.id} className="mb-3">
            <div className="px-2.5 pb-1.5 pt-1 text-[13px] font-semibold text-etiqueta-grupo">{g.etiqueta}</div>
            {g.items.map((it) => {
              const activo = it.id === seccionActivaId;
              const contador = contadores?.[it.id] ?? it.contadorPorRol?.[rol];
              const Icono = iconoDeSeccion(it.icono);
              return (
                <button
                  key={it.id}
                  type="button"
                  data-testid={`nav-${it.id}`}
                  onClick={() => onSeleccionar(it.id)}
                  className={`relative mb-0.5 flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13.5px] transition ${
                    activo ? 'bg-marca-suave font-semibold text-marca' : 'text-texto-2 hover:bg-marca-suave'
                  }`}
                >
                  {activo && <span className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r bg-marca" />}
                  <Icono size={18} className={activo ? 'text-marca' : 'text-texto-3'} />
                  <span className="flex-1">{etiquetaDe(it, rol)}</span>
                  {contador ? (
                    <span className="txt-badge rounded-full bg-marca-suave px-2 py-0.5 text-[11px] font-semibold text-texto-2">
                      {contador}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Mi cuenta — avatar con menú (Seguridad + Cerrar sesión) */}
      <div className="relative border-t border-borde p-2.5" ref={refMenu}>
        {menuAbierto && (
          <div className="animar-entrada absolute inset-x-2.5 bottom-[calc(100%-4px)] z-30 rounded-[12px] border border-borde bg-superficie p-1.5 shadow-pop-panel">
            <button
              type="button"
              data-testid="menu-seguridad"
              onClick={() => {
                onSeleccionar('seguridad');
                setMenuAbierto(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-sm font-medium text-texto-2 transition hover:bg-marca-suave"
            >
              <ShieldCheck size={17} className="text-texto-3" /> Seguridad
            </button>
            <button
              type="button"
              data-testid="cerrar-sesion-escritorio"
              onClick={onCerrarSesion}
              className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-sm font-medium text-peligro transition hover:bg-peligro-suave"
            >
              <LogOut size={17} /> Cerrar sesión
            </button>
          </div>
        )}

        <button
          type="button"
          data-testid="menu-cuenta"
          onClick={() => setMenuAbierto((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition hover:bg-marca-suave"
        >
          <AvatarUsuario nombre={nombre} avatarUrl={avatarUrl} tam={40} />
          <span className="flex flex-1 flex-col overflow-hidden text-left">
            <span className="truncate text-[13px] font-semibold text-texto">{nombre}</span>
            <span className="truncate text-[12px] text-texto-2">{ETIQUETA_ROL[rol]}</span>
          </span>
          <ChevronUp
            size={16}
            className={`shrink-0 text-texto-3 transition-transform ${menuAbierto ? '' : 'rotate-180'}`}
          />
        </button>
      </div>
    </div>
  );
}

export default BarraLateral;
