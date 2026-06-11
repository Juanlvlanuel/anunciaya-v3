/**
 * estadoUsuario.tsx
 * ==================
 * Metadatos y badge del estado de una cuenta (activo / suspendido / inactivo).
 * Sobrio por Regla 13: un punto de color + etiqueta neutra. Mismo lenguaje visual
 * que `estadoPago.tsx` de Negocios. Compartido por la tabla y la ficha de Usuarios.
 *
 * Ubicación: apps/admin/src/components/usuarios/estadoUsuario.tsx
 */

export interface MetaEstadoUsuario {
  etiqueta: string;
  color: string;
}

export const ESTADO_USUARIO_META: Record<string, MetaEstadoUsuario> = {
  activo: { etiqueta: 'Activo', color: 'var(--panel-ok)' },
  suspendido: { etiqueta: 'Suspendido', color: 'var(--panel-danger)' },
  inactivo: { etiqueta: 'Inactivo', color: 'var(--panel-text-4)' },
};

export function metaEstadoUsuario(valor: string): MetaEstadoUsuario {
  return ESTADO_USUARIO_META[valor] ?? { etiqueta: valor, color: 'var(--panel-text-4)' };
}

/** Badge tipo pill: fondo tenue del color del estado + punto + etiqueta. */
export function BadgeEstadoUsuario({ estado, small }: { estado: string; small?: boolean }) {
  const meta = metaEstadoUsuario(estado);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ${
        small ? 'px-2 py-0.5 text-[11.5px]' : 'px-2.5 py-1 text-[12.5px]'
      }`}
      style={{ background: `color-mix(in srgb, ${meta.color} 13%, transparent)`, color: meta.color }}
    >
      <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: meta.color }} />
      {meta.etiqueta}
    </span>
  );
}
