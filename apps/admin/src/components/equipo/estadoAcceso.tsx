/**
 * estadoAcceso.tsx
 * =================
 * Metadatos y badge del ESTADO DE ACCESO de una cuenta de equipo, y la etiqueta de su rol.
 * Sobrio por Regla 13: un punto de color + etiqueta neutra (mismo lenguaje que `estadoUsuario.tsx`).
 *
 * Estado de acceso (derivado de la fila):
 *   - Activo               → cuenta activa y con contraseña creada (entra al Panel). Verde.
 *   - Pendiente de activar → modelo C: aún no crea su contraseña (no puede entrar todavía). Azul.
 *   - Suspendido           → cuenta suspendida (no entra a ningún lado). Rojo.
 *   - Sin acceso           → inactiva u otro. Gris.
 *
 * Ubicación: apps/admin/src/components/equipo/estadoAcceso.tsx
 */

import type { MiembroEquipoFila } from '../../services/equipoService';

export interface MetaAcceso {
  etiqueta: string;
  color: string;
}

/** Etiqueta legible del rol de equipo. */
export const ROL_EQUIPO_LABEL: Record<string, string> = {
  superadmin: 'SuperAdmin',
  gerente: 'Gerente regional',
  vendedor: 'Vendedor',
};

export function rolLabel(rol: string): string {
  return ROL_EQUIPO_LABEL[rol] ?? rol;
}

/** Decide el estado de acceso a partir de los flags de la fila. */
export function metaAcceso(f: Pick<MiembroEquipoFila, 'accesoActivo' | 'pendienteActivar' | 'estadoCuenta' | 'revocado'>): MetaAcceso {
  if (f.revocado) return { etiqueta: 'Sin acceso', color: 'var(--panel-text-4)' };
  if (f.accesoActivo) return { etiqueta: 'Activo', color: 'var(--panel-ok)' };
  if (f.estadoCuenta === 'suspendido') return { etiqueta: 'Suspendido', color: 'var(--panel-danger)' };
  if (f.pendienteActivar && f.estadoCuenta === 'activo') return { etiqueta: 'Pendiente de activar', color: 'var(--panel-brand)' };
  return { etiqueta: 'Sin acceso', color: 'var(--panel-text-4)' };
}

/** Badge tipo pill: fondo tenue del color del estado + punto + etiqueta. */
export function BadgeAcceso({ fila, small }: { fila: Pick<MiembroEquipoFila, 'accesoActivo' | 'pendienteActivar' | 'estadoCuenta' | 'revocado'>; small?: boolean }) {
  const meta = metaAcceso(fila);
  return (
    <span
      className={`txt-badge inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'
      }`}
      style={{ background: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color }}
    >
      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: meta.color }} />
      {meta.etiqueta}
    </span>
  );
}
