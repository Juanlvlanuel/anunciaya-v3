/**
 * DialogoEditarDatos.tsx
 * ======================
 * Corrige los datos de la cuenta de un miembro (nombre, apellidos, teléfono, correo). Consume
 * PATCH /admin/equipo/:id/datos. Si cambia el correo de una cuenta sin contraseña (modelo C), el
 * backend reenvía el código de crear contraseña al nuevo correo.
 *
 * Ubicación: apps/admin/src/components/equipo/DialogoEditarDatos.tsx
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useEditarDatos } from '../../hooks/queries/useEquipoAdmin';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DialogoEditarDatosProps {
  abierto: boolean;
  onCerrar: () => void;
  miembroId: string;
  inicial: { nombre: string | null; apellidos: string | null; telefono: string | null; correo: string };
  /** El correo solo es editable mientras la cuenta no tiene contraseña (modelo C). Si ya está
   *  verificada, queda solo lectura: lo cambia la persona desde su perfil. */
  correoEditable: boolean;
}

export function DialogoEditarDatos({ abierto, onCerrar, miembroId, inicial, correoEditable }: DialogoEditarDatosProps) {
  const editar = useEditarDatos();
  const [nombre, setNombre] = useState(inicial.nombre ?? '');
  const [apellidos, setApellidos] = useState(inicial.apellidos ?? '');
  const [correo, setCorreo] = useState(inicial.correo);
  const [telDigitos, setTelDigitos] = useState((inicial.telefono ?? '').replace(/^\+52/, '').replace(/\D/g, '').slice(0, 10));

  const nombreValido = nombre.trim().length >= 2;
  const apellidosValido = apellidos.trim().length >= 2;
  const correoValido = !correoEditable || EMAIL_REGEX.test(correo.trim());
  const puedeGuardar = nombreValido && apellidosValido && correoValido && !editar.isPending;

  const guardar = () => {
    if (!puedeGuardar) return;
    editar.mutate(
      {
        id: miembroId,
        datos: {
          nombre: nombre.trim(),
          apellidos: apellidos.trim(),
          telefono: telDigitos ? `+52${telDigitos}` : '',
          // El correo solo se envía si es editable (modelo C); si no, no se toca.
          ...(correoEditable ? { correo: correo.trim() } : {}),
        },
      },
      { onSuccess: onCerrar },
    );
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="md"
      alturaMaxima="lg"
      discriminador="dialogo-editar-datos"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-editar-datos">
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-borde">
          <div>
            <div className="text-[16px] font-bold text-texto">Editar datos</div>
            <div className="text-[12px] text-texto-3">Corrige nombre, teléfono o correo de la cuenta</div>
          </div>
          <button
            type="button"
            data-testid="editar-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Nombre</label>
              <input type="text" data-testid="editar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} className={CLASE_CAMPO} />
            </div>
            <div>
              <label className={LABEL}>Apellidos</label>
              <input type="text" data-testid="editar-apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} maxLength={100} className={CLASE_CAMPO} />
            </div>
          </div>
          <div className="mb-3">
            <label className={LABEL}>Correo</label>
            <input
              type="email"
              data-testid="editar-correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              disabled={!correoEditable}
              className={`${CLASE_CAMPO} ${!correoEditable ? 'cursor-not-allowed opacity-60' : ''}`}
            />
            <p className="mt-1 text-[11.5px] text-texto-4">
              {correoEditable
                ? 'La cuenta aún no tiene contraseña: al corregir el correo se reenvía el código de acceso al nuevo.'
                : 'El correo está verificado y es la llave de acceso: lo cambia la persona desde su perfil.'}
            </p>
          </div>
          <div>
            <label className={LABEL}>Teléfono <span className="font-normal text-texto-4">(opcional)</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-texto-4">+52</span>
              <input
                type="tel"
                inputMode="numeric"
                data-testid="editar-telefono"
                value={telDigitos}
                onChange={(e) => setTelDigitos(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 dígitos"
                className={`${CLASE_CAMPO} pl-12`}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button
            type="button"
            data-testid="editar-cancelar"
            onClick={onCerrar}
            disabled={editar.isPending}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="editar-guardar"
            onClick={guardar}
            disabled={!puedeGuardar}
            className="rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editar.isPending ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarDatos;
