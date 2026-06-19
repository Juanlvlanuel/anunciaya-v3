/**
 * FichaSucursal.tsx
 * =================
 * Modal de detalle de UNA sucursal (solo lectura) — se abre desde las filas de
 * sucursal expandidas en la tabla de Negocios. Reusa el ModalAdaptativo y los
 * componentes Seccion/Dato de FichaNegocio.
 *
 * Diferencias vs la ficha del negocio:
 *   - SIN sección Membresía (la paga la matriz).
 *   - Vendedor atribuido = el del negocio (informativo, no editable).
 *   - "Gerente Asignado" en vez de "Dueño" (usuarios.sucursalAsignada; "—" si no hay).
 *   - Sección "Sucursal" (datos de esta sucursal).
 *   - SIN los 4 botones de acción (son del negocio matriz).
 *
 * Ubicación: apps/admin/src/components/negocios/FichaSucursal.tsx
 */

import { X, User, UserCog, Store } from 'lucide-react';
import { useSucursalDetalle } from '../../hooks/queries/useNegociosAdmin';
import type { SucursalFila, SucursalDetalle } from '../../services/negociosService';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Seccion, Dato, fecha } from './FichaNegocio';
import { AvatarNegocio, AvatarVendedor, AvatarVacio } from './avatares';

interface FichaSucursalProps {
  negocioId: string;
  /** Fila que se abrió: placeholder para mostrar el modal al instante. */
  sucursal: SucursalFila;
  onCerrar: () => void;
}

/** Detalle parcial con lo que ya trae la fila (el resto llega del backend). */
function placeholderDesdeFila(negocioId: string, s: SucursalFila): SucursalDetalle {
  return {
    id: s.id,
    negocioId,
    nombre: s.nombre,
    esPrincipal: s.esPrincipal,
    activa: s.activa,
    ciudad: s.ciudad,
    estado: null,
    regionId: null,
    regionNombre: s.regionNombre,
    direccion: null,
    telefono: null,
    whatsapp: null,
    correo: null,
    creadoEn: null,
    gerenteNombre: null,
    gerenteCorreo: null,
    gerenteTelefono: null,
    vendedorId: null,
    vendedorNombre: null,
    vendedorCodigo: null,
  };
}

export function FichaSucursal({ negocioId, sucursal, onCerrar }: FichaSucursalProps) {
  const placeholder = placeholderDesdeFila(negocioId, sucursal);
  const { data, isError } = useSucursalDetalle(negocioId, sucursal.id, placeholder);
  const s = data ?? placeholder;

  const ubicacion = [s.ciudad, s.estado].filter((x) => x && x !== 'Por configurar').join(', ') || '—';

  return (
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="lg"
      alturaMaxima="xl"
      discriminador="ficha-sucursal"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="ficha-sucursal">
        {/* Cabecera */}
        <div className="flex shrink-0 items-center gap-3 border-b border-borde px-5 py-4">
          <AvatarNegocio nombre={s.nombre} tam={46} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <span className="truncate text-[17px] font-bold tracking-[-0.2px] text-texto" data-testid="ficha-sucursal-nombre">
              {s.nombre}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`txt-badge rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.activa ? 'bg-marca-suave text-marca' : 'bg-superficie-2 text-texto-3'}`}>
                {s.activa ? 'Activa' : 'Inactiva'}
              </span>
              {s.esPrincipal && (
                <span className="txt-badge rounded-full border border-borde px-2 py-0.5 text-[11px] font-semibold text-texto-3">Matriz</span>
              )}
            </div>
          </div>
          <button
            type="button"
            data-testid="ficha-sucursal-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {isError && (
            <div className="mb-3 rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
              No se pudo cargar el detalle completo.
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Seccion titulo="Vendedor atribuido" icono={User}>
              {s.vendedorId && s.vendedorNombre ? (
                <div className="flex items-center gap-3">
                  <AvatarVendedor nombre={s.vendedorNombre} tam={34} />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[14px] font-semibold text-texto">{s.vendedorNombre}</span>
                    <span className="text-[12px] text-texto-3">
                      {s.vendedorCodigo ? <>Código: <span className="font-mono">{s.vendedorCodigo}</span></> : 'Vendedor del negocio'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AvatarVacio tam={34} />
                  <span className="text-[13.5px] text-texto-3">Sin vendedor atribuido</span>
                </div>
              )}
            </Seccion>

            <Seccion titulo="Gerente asignado" icono={UserCog}>
              <Dato etiqueta="Nombre" valor={s.gerenteNombre ?? '—'} />
              <Dato etiqueta="Correo" valor={s.gerenteCorreo ?? '—'} />
              <Dato etiqueta="Teléfono" valor={s.gerenteTelefono ?? '—'} />
            </Seccion>

            <Seccion titulo="Sucursal" icono={Store}>
              <Dato etiqueta="Ubicación" valor={ubicacion} />
              <Dato etiqueta="Región" valor={s.regionNombre ?? '—'} />
              <Dato etiqueta="Dirección" valor={s.direccion ?? '—'} />
              <Dato etiqueta="Teléfono" valor={s.telefono ?? '—'} />
              <Dato etiqueta="WhatsApp" valor={s.whatsapp ?? '—'} />
              <Dato etiqueta="Correo" valor={s.correo ?? '—'} />
              <Dato etiqueta="Alta" valor={fecha(s.creadoEn)} />
            </Seccion>
          </div>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default FichaSucursal;
