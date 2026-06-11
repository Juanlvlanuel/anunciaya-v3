/**
 * DialogoCodigoAcceso.tsx
 * ========================
 * Rescate de acceso ROBUSTO para cuando al usuario NO le llega el correo. Genera un código de un
 * solo uso (el mismo del self-service de crear/restablecer contraseña) y lo MUESTRA en el Panel para
 * que el agente se lo DICTE por teléfono/WhatsApp — saltándose el correo. También se envía por correo.
 *
 * Dos estados: (1) confirmar/generar · (2) mostrar el código + copiar + estado del correo.
 *
 * Ubicación: apps/admin/src/components/usuarios/DialogoCodigoAcceso.tsx
 */

import { useState } from 'react';
import { KeyRound, Copy, Check, Mail, X } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import type { ResultadoCodigoAcceso } from '../../services/usuariosService';

interface DialogoCodigoAccesoProps {
  abierto: boolean;
  onCerrar: () => void;
  nombre: string;
  correo: string;
  cargando: boolean;
  /** Resultado de la mutación; null mientras no se ha generado. */
  resultado: ResultadoCodigoAcceso | null;
  onGenerar: () => void;
}

export function DialogoCodigoAcceso({
  abierto,
  onCerrar,
  nombre,
  correo,
  cargando,
  resultado,
  onGenerar,
}: DialogoCodigoAccesoProps) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* sin clipboard: el código sigue visible para teclearlo a mano */
    }
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="sm"
      centrado
      discriminador="dialogo-codigo-acceso"
    >
      <div className="flex flex-col" data-testid="dialogo-codigo-acceso">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-borde px-5 py-4">
          <span className="inline-flex items-center gap-2 text-[16px] font-bold text-texto">
            <KeyRound size={18} className="text-marca" /> Código de acceso
          </span>
          <button
            type="button"
            data-testid="codigo-acceso-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex flex-col gap-3 p-5">
          {!resultado ? (
            <>
              <p className="text-[13px] leading-relaxed text-texto-2">
                Genera un código para que <b className="font-semibold text-texto">{nombre || correo}</b> pueda crear o
                restablecer su contraseña. Podrás <b className="font-semibold text-texto">dictárselo</b> por teléfono o
                WhatsApp si no le llega el correo; también se le envía por correo.
              </p>
              <button
                type="button"
                data-testid="codigo-acceso-generar"
                onClick={onGenerar}
                disabled={cargando}
                className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2.5 text-[13px] font-semibold text-marca-contraste transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <KeyRound size={16} /> {cargando ? 'Generando…' : 'Generar código'}
              </button>
            </>
          ) : (
            <>
              <p className="text-[12.5px] leading-snug text-texto-3">
                Dícta este código a <b className="font-medium text-texto-2">{nombre || correo}</b>. Lo usará en «
                {resultado.tipo === 'crear' ? 'Crear contraseña' : 'Restablecer contraseña'}». Es de un solo uso y expira pronto.
              </p>
              {/* Código grande + copiar */}
              <div className="flex items-center justify-between gap-3 rounded-[12px] border border-borde bg-superficie-2 px-4 py-3">
                <span data-testid="codigo-acceso-valor" className="font-mono text-[26px] font-bold tracking-[0.25em] text-texto">
                  {resultado.codigo}
                </span>
                <button
                  type="button"
                  data-testid="codigo-acceso-copiar"
                  onClick={copiar}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-[9px] border border-borde-fuerte bg-superficie px-2.5 py-1.5 text-[12.5px] font-semibold text-texto transition hover:bg-marca-suave"
                >
                  {copiado ? (
                    <>
                      <Check size={14} className="text-ok" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copiar
                    </>
                  )}
                </button>
              </div>
              {/* Estado del correo */}
              <div className="inline-flex items-start gap-1.5 text-[12px] text-texto-3">
                <Mail size={13} className="mt-0.5 shrink-0" />
                {resultado.correoEnviado ? (
                  <span>También se envió a <span className="text-texto-2">{correo}</span>.</span>
                ) : (
                  <span>No se pudo enviar a su correo — dícta el código directamente.</span>
                )}
              </div>
              <button
                type="button"
                data-testid="codigo-acceso-listo"
                onClick={onCerrar}
                className="mt-1 inline-flex items-center justify-center rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave"
              >
                Listo
              </button>
            </>
          )}
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoCodigoAcceso;
