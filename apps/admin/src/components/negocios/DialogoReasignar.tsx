/**
 * DialogoReasignar.tsx
 * =====================
 * Diálogo para reasignar (o quitar) el vendedor atribuido de un negocio. Lista los
 * vendedores asignables según el alcance del rol (reusa useVendedoresFiltro: el
 * gerente solo ve los de su región) + opción "Sin asignar" (quitar). Motivo opcional.
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoReasignar.tsx
 */

import { useMemo, useState } from 'react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorBuscable } from '../ui/SelectorBuscable';
import { useVendedoresFiltro } from '../../hooks/queries/useNegociosAdmin';

const QUITAR = '__quitar';

interface DialogoReasignarProps {
  abierto: boolean;
  onCerrar: () => void;
  vendedorActualId: string | null;
  cargando?: boolean;
  onConfirmar: (embajadorId: string | null, motivo: string) => void;
}

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]';

export function DialogoReasignar({
  abierto,
  onCerrar,
  vendedorActualId,
  cargando = false,
  onConfirmar,
}: DialogoReasignarProps) {
  const { data: vendedores } = useVendedoresFiltro(true);
  const [seleccion, setSeleccion] = useState<string>(vendedorActualId ?? QUITAR);
  const [motivo, setMotivo] = useState('');

  const opcionesVendedor = useMemo(
    () => [{ id: QUITAR, etiqueta: 'Sin asignar (quitar vendedor)' }, ...(vendedores ?? []).map((v) => ({ id: v.id, etiqueta: v.nombre }))],
    [vendedores],
  );

  const confirmar = () => {
    onConfirmar(seleccion === QUITAR ? null : seleccion, motivo.trim());
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      centrado
      ancho="sm"
      titulo="Reasignar vendedor"
      discriminador="dialogo-reasignar"
    >
      <div className="p-5">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Vendedor</label>
        <SelectorBuscable
          testid="reasignar-vendedor"
          value={seleccion}
          onChange={setSeleccion}
          opciones={opcionesVendedor}
          placeholder="Selecciona un vendedor"
          buscarPlaceholder="Buscar vendedor…"
        />

        <div className="mt-3">
          <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Motivo (opcional)</label>
          <textarea
            data-testid="reasignar-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Escribe el motivo…"
            className={CLASE_CAMPO}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={cargando}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="reasignar-confirmar"
            onClick={confirmar}
            disabled={cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Guardando…' : 'Reasignar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoReasignar;
