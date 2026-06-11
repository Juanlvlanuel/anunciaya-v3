/**
 * CajonNavegacion.tsx
 * ====================
 * Drawer lateral del shell móvil (para roles con muchas secciones). Lista
 * compacta de grupos + ítems, y al pie toggle de tema + cerrar sesión.
 *
 * Ubicación: apps/admin/src/components/shell/CajonNavegacion.tsx
 */

import { X, Sun, Moon, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { iconoDeSeccion } from '../../config/iconosPanel';
import { gruposParaRol, etiquetaDe, type RolPanel } from '../../data/menuPanel';
import type { Tema } from '../../utils/tema';

interface CajonNavegacionProps {
  rol: RolPanel;
  seccionActivaId: string;
  abierto: boolean;
  onSeleccionar: (id: string) => void;
  onCerrar: () => void;
  tema: Tema;
  onAlternarTema: () => void;
  onCerrarSesion: () => void;
  /** Contadores reales por id de sección (ej. { negocios: 248 }). Cae al estático si falta. */
  contadores?: Partial<Record<string, number>>;
}

export function CajonNavegacion({
  rol,
  seccionActivaId,
  abierto,
  onSeleccionar,
  onCerrar,
  tema,
  onAlternarTema,
  onCerrarSesion,
  contadores,
}: CajonNavegacionProps) {
  const grupos = gruposParaRol(rol);

  return (
    <>
      <div
        onClick={onCerrar}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-4/5 max-w-[300px] flex-col bg-superficie transition-transform ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-borde px-4 py-3">
          <span className="flex items-center gap-2 text-[16px] font-bold text-texto">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-marca-suave text-marca">
              <LayoutDashboard size={17} />
            </span>
            Panel de Admins
          </span>
          <button
            type="button"
            data-testid="cerrar-menu-movil"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {grupos.map((g) => (
            <div key={g.id} className="mb-2">
              <div className="px-2.5 pb-1 pt-1 text-[14px] font-semibold text-etiqueta-grupo">{g.etiqueta}</div>
              {g.items.map((it) => {
                const activo = it.id === seccionActivaId;
                const contador = contadores?.[it.id] ?? it.contadorPorRol?.[rol];
                const Icono = iconoDeSeccion(it.icono);
                return (
                  <button
                    key={it.id}
                    type="button"
                    data-testid={`drawer-${it.id}`}
                    onClick={() => {
                      onSeleccionar(it.id);
                      onCerrar();
                    }}
                    className={`relative mb-0.5 flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-1.5 text-left text-[13.5px] transition ${
                      activo ? 'bg-marca-suave font-semibold text-marca' : 'text-texto-2 hover:bg-marca-suave'
                    }`}
                  >
                    <Icono size={19} className={activo ? 'text-marca' : 'text-texto-3'} />
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

        <div className="border-t border-borde p-3">
          <button
            type="button"
            data-testid="menu-seguridad-movil"
            onClick={() => {
              onSeleccionar('seguridad');
              onCerrar();
            }}
            className="mb-2 flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left text-sm font-medium text-texto-2 transition hover:bg-marca-suave"
          >
            <ShieldCheck size={18} className="text-texto-3" /> Seguridad
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAlternarTema}
              aria-label="Cambiar tema"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-borde-fuerte text-texto-3 transition hover:text-texto"
            >
              {tema === 'oscuro' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              data-testid="cerrar-sesion-movil"
              onClick={onCerrarSesion}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[10px] border-2 border-peligro/40 text-sm font-semibold text-peligro transition hover:bg-peligro-suave"
            >
              <LogOut size={17} /> Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default CajonNavegacion;
