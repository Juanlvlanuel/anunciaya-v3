/**
 * DialogoAltaGerente.tsx
 * ======================
 * Formulario "Dar de alta gerente" (un paso) — solo superadmin. Consume POST /admin/equipo/gerentes.
 * Crea una cuenta NUEVA (modelo C: se le envía el código para crear su contraseña) o PROMUEVE una
 * cuenta existente sin rol de equipo (aviso en vivo al detectar el correo). El backend rechaza con
 * 409 si el correo ya es de otro miembro del equipo.
 *
 * Ubicación: apps/admin/src/components/equipo/DialogoAltaGerente.tsx
 */

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorBuscable } from '../ui/SelectorBuscable';
import { CampoCorreoCuenta } from './CampoCorreoCuenta';
import { useRegionesPanel } from '../../hooks/queries/useRegionesPanel';
import { useAltaGerente } from '../../hooks/queries/useEquipoAdmin';
import type { CuentaSugerida } from '../../services/equipoService';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DialogoAltaGerenteProps {
  abierto: boolean;
  onCerrar: () => void;
}

export function DialogoAltaGerente({ abierto, onCerrar }: DialogoAltaGerenteProps) {
  const alta = useAltaGerente();
  const { data: regiones } = useRegionesPanel(true);

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [telDigitos, setTelDigitos] = useState('');
  const [regionId, setRegionId] = useState('');
  const [cuentaPromovida, setCuentaPromovida] = useState<CuentaSugerida | null>(null);

  const opcionesRegion = useMemo(() => (regiones ?? []).map((r) => ({ id: r.id, etiqueta: r.nombre })), [regiones]);

  const nombreValido = nombre.trim().length >= 2;
  const apellidosValido = apellidos.trim().length >= 2;
  const correoValido = EMAIL_REGEX.test(correo.trim());
  const puedeEnviar = nombreValido && apellidosValido && correoValido && !!regionId && !alta.isPending;

  const onCorreoChange = (v: string) => {
    setCorreo(v);
    if (cuentaPromovida && v.trim().toLowerCase() !== cuentaPromovida.correo.toLowerCase()) setCuentaPromovida(null);
  };
  const onSeleccionarCuenta = (c: CuentaSugerida) => {
    setCorreo(c.correo);
    setNombre(c.nombreSolo ?? '');
    setApellidos(c.apellidos ?? '');
    setTelDigitos((c.telefono ?? '').replace(/^\+52/, '').replace(/\D/g, '').slice(0, 10));
    setCuentaPromovida(c);
  };

  const enviar = () => {
    if (!puedeEnviar) return;
    alta.mutate(
      {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        correo: correo.trim(),
        telefono: telDigitos ? `+52${telDigitos}` : undefined,
        regionId,
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
      alturaMaxima="xl"
      discriminador="dialogo-alta-gerente"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-alta-gerente">
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-borde">
          <div>
            <div className="text-[16px] font-bold text-texto">Dar de alta gerente</div>
            <div className="text-[12px] text-texto-3">Crea su cuenta y le asigna una región</div>
          </div>
          <button
            type="button"
            data-testid="alta-ger-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-3">
            <label className={LABEL}>Correo</label>
            <CampoCorreoCuenta correo={correo} onCorreoChange={onCorreoChange} onSeleccionarCuenta={onSeleccionarCuenta} testid="alta-ger-correo" />
            {cuentaPromovida && (
              <p className="mt-1 text-[12px] font-medium text-marca" data-testid="alta-ger-promover">
                Promoverás esta cuenta existente a gerente (conserva su contraseña).
              </p>
            )}
          </div>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Nombre</label>
              <input type="text" data-testid="alta-ger-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} placeholder="Nombre" className={CLASE_CAMPO} />
            </div>
            <div>
              <label className={LABEL}>Apellidos</label>
              <input type="text" data-testid="alta-ger-apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} maxLength={100} placeholder="Apellidos" className={CLASE_CAMPO} />
            </div>
          </div>
          <div className="mb-3">
            <label className={LABEL}>Teléfono <span className="font-normal text-texto-4">(opcional)</span></label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-texto-4">+52</span>
              <input
                type="tel"
                inputMode="numeric"
                data-testid="alta-ger-telefono"
                value={telDigitos}
                onChange={(e) => setTelDigitos(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10 dígitos"
                className={`${CLASE_CAMPO} pl-12`}
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>Región a su cargo</label>
            <SelectorBuscable
              testid="alta-ger-region"
              value={regionId}
              onChange={setRegionId}
              opciones={opcionesRegion}
              placeholder="Selecciona una región"
              buscarPlaceholder="Buscar región…"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button
            type="button"
            data-testid="alta-ger-cancelar"
            onClick={onCerrar}
            disabled={alta.isPending}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="alta-ger-enviar"
            onClick={enviar}
            disabled={!puedeEnviar}
            className="rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {alta.isPending ? 'Dando de alta…' : 'Dar de alta'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoAltaGerente;
