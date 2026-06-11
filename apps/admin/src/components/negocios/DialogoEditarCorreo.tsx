/**
 * DialogoEditarCorreo.tsx
 * =======================
 * Corrige el correo del DUEÑO de un negocio (rescate de alta manual: el vendedor lo tecleó mal y
 * el dueño nunca recibió el código). Al guardar, el backend cambia el correo y REENVÍA el código
 * al correo nuevo; el hook muestra un toast distinto según si el código se envió o no.
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoEditarCorreo.tsx
 */

import { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-superficie px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';

interface DialogoEditarCorreoProps {
  abierto: boolean;
  onCerrar: () => void;
  correoActual: string | null;
  cargando: boolean;
  onConfirmar: (correoNuevo: string) => void;
  /** Título del diálogo. Default: el del dueño de un negocio. */
  titulo?: string;
  /** Texto explicativo. Default: el del rescate de alta manual. */
  descripcion?: string;
}

export function DialogoEditarCorreo({
  abierto,
  onCerrar,
  correoActual,
  cargando,
  onConfirmar,
  titulo = 'Editar correo del dueño',
  descripcion = 'Corrige el correo del dueño. Le reenviaremos el código para crear su contraseña al correo nuevo.',
}: DialogoEditarCorreoProps) {
  const [correo, setCorreo] = useState('');
  const correoNorm = correo.trim().toLowerCase();
  const valido = EMAIL_REGEX.test(correoNorm) && correoNorm !== (correoActual ?? '').toLowerCase();

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="sm"
      discriminador="dialogo-editar-correo"
    >
      <div className="flex flex-col" data-testid="dialogo-editar-correo">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-borde px-5 py-4">
          <span className="text-[16px] font-bold text-texto">{titulo}</span>
          <button
            type="button"
            data-testid="editar-correo-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-col gap-3 p-5">
          <p className="text-[12.5px] leading-snug text-texto-3">{descripcion}</p>
          {correoActual && (
            <div className="rounded-[10px] border border-borde bg-superficie-2 px-3 py-2 text-[12.5px] text-texto-3">
              Correo actual: <span className="font-medium text-texto-2">{correoActual}</span>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Correo nuevo</label>
            <input
              type="email"
              data-testid="editar-correo-input"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com"
              className={CLASE_CAMPO}
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button
            type="button"
            data-testid="editar-correo-cancelar"
            onClick={onCerrar}
            disabled={cargando}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="editar-correo-guardar"
            onClick={() => valido && onConfirmar(correoNorm)}
            disabled={!valido || cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Mail size={15} />
            {cargando ? 'Guardando…' : 'Guardar y reenviar código'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarCorreo;
