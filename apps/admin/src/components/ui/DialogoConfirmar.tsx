/**
 * DialogoConfirmar.tsx
 * =====================
 * Diálogo de confirmación genérico del Panel (reutilizable). Usa el ModalAdaptativo
 * base forzado a `centrado` (para que sobre una ficha bottom-sheet en móvil no
 * salga sheet-sobre-sheet). Soporta un campo de motivo opcional u obligatorio.
 *
 * El `cargando` lo controla el padre (la mutación). El padre cierra el diálogo en
 * el onSuccess de la mutación.
 *
 * Ubicación: apps/admin/src/components/ui/DialogoConfirmar.tsx
 */

import { useState, type ReactNode } from 'react';
import { ModalAdaptativo } from './ModalAdaptativo';

interface DialogoConfirmarProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  iconoTitulo?: ReactNode;
  mensaje?: ReactNode;
  textoConfirmar: string;
  variante?: 'primary' | 'danger';
  /** Mostrar el campo de motivo. Default: igual a `requiereMotivo`. */
  mostrarMotivo?: boolean;
  /** El motivo es obligatorio (botón deshabilitado si está vacío). */
  requiereMotivo?: boolean;
  etiquetaMotivo?: string;
  cargando?: boolean;
  onConfirmar: (motivo: string) => void;
  discriminador?: string;
}

export function DialogoConfirmar({
  abierto,
  onCerrar,
  titulo,
  iconoTitulo,
  mensaje,
  textoConfirmar,
  variante = 'primary',
  mostrarMotivo,
  requiereMotivo = false,
  etiquetaMotivo,
  cargando = false,
  onConfirmar,
  discriminador = 'dialogo-confirmar',
}: DialogoConfirmarProps) {
  const [motivo, setMotivo] = useState('');
  const verMotivo = mostrarMotivo ?? requiereMotivo;
  const motivoInvalido = requiereMotivo && !motivo.trim();

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      centrado
      ancho="sm"
      titulo={titulo}
      iconoTitulo={iconoTitulo}
      discriminador={discriminador}
    >
      <div className="p-5">
        {mensaje && <div className="text-[13.5px] leading-relaxed text-texto-2">{mensaje}</div>}

        {verMotivo && (
          <div className="mt-3">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">
              {etiquetaMotivo ?? (requiereMotivo ? 'Motivo' : 'Motivo (opcional)')}
            </label>
            <textarea
              data-testid="dialogo-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="Escribe el motivo…"
              className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
            />
          </div>
        )}

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
            data-testid="dialogo-confirmar"
            onClick={() => onConfirmar(motivo.trim())}
            disabled={motivoInvalido || cargando}
            className={`inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              variante === 'danger' ? 'bg-peligro text-white' : 'bg-marca text-marca-contraste'
            }`}
          >
            {cargando ? 'Procesando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoConfirmar;
