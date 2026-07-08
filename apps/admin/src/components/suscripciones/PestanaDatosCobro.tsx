/**
 * PestanaDatosCobro.tsx
 * =====================
 * Pestaña "Datos de depósito" del módulo Suscripciones: ver/editar la cuenta bancaria que el
 * dueño consulta en Mi Perfil para depositar su membresía (banco, titular, CLABE, cuenta,
 * instrucciones). Solo el SUPERADMIN puede guardar (PUT); el gerente lo ve en modo lectura
 * (el botón Guardar no aparece y los campos van deshabilitados). El backend también lo blinda.
 *
 * Diseño: card centrada con header propio y campos con icono. Neutro + un acento (Tokens_Panel.md).
 * Edición local (useState), datos del servidor vía React Query. Guarda solo si hay cambios.
 *
 * Ubicación: apps/admin/src/components/suscripciones/PestanaDatosCobro.tsx
 */

import { useEffect, useState } from 'react';
import { Landmark, Save, Lock, User, Hash, CreditCard, Wallet, type LucideIcon } from 'lucide-react';
import { useDatosCobro, useGuardarDatosCobro } from '../../hooks/queries/useSuscripcionesAdmin';
import type { DatosCobro } from '../../services/suscripcionesService';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { EstadoSeccion } from '../ui/EstadoSeccion';

const VACIO: DatosCobro = { banco: '', titular: '', clabe: '', cuenta: '', tarjeta: '', instrucciones: '' };

export function PestanaDatosCobro() {
  const rol = useAuthPanelStore((s) => s.usuario?.rolEquipo);
  const esSuper = rol === 'superadmin';

  const { data, isLoading, isError } = useDatosCobro();
  const guardar = useGuardarDatosCobro();

  const [form, setForm] = useState<DatosCobro>(VACIO);

  useEffect(() => {
    if (data) setForm({ ...VACIO, ...data });
  }, [data]);

  const setCampo = (campo: keyof DatosCobro, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const hayCambios =
    !!data &&
    (form.banco !== (data.banco ?? '') ||
      form.titular !== (data.titular ?? '') ||
      form.clabe !== (data.clabe ?? '') ||
      form.cuenta !== (data.cuenta ?? '') ||
      form.tarjeta !== (data.tarjeta ?? '') ||
      form.instrucciones !== (data.instrucciones ?? ''));

  if (isLoading) {
    return <EstadoSeccion variante="cargando" icono={Landmark} titulo="Cargando datos de depósito…" />;
  }
  if (isError) {
    return (
      <EstadoSeccion
        variante="error"
        icono={Landmark}
        titulo="No se pudieron cargar los datos."
        descripcion="Revisa tu conexión e inténtalo de nuevo."
      />
    );
  }

  const soloLectura = !esSuper;

  return (
    <div className="flex min-h-[60vh] items-center justify-center" data-testid="suscripciones-datos-cobro">
      <div className="w-full max-w-[640px] overflow-hidden rounded-[14px] border border-borde bg-superficie shadow-sm">
        {/* Header de la card */}
        <div className="flex items-start gap-3 border-b border-borde px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-marca-suave text-marca">
            <Landmark size={18} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-[15px] font-semibold text-texto">Cuenta para depósitos</h3>
            <p className="text-[12.5px] leading-relaxed text-texto-3">
              <span className="lg:hidden">Los ve el comerciante para pagar por transferencia.</span>
              <span className="hidden lg:inline">Estos datos los ve el comerciante en su perfil para pagar la membresía por transferencia.</span>
              {soloLectura && (
                <span className="ml-1 inline-flex items-center gap-1 font-medium text-texto-4">
                  <Lock size={12} /> Solo el superadmin puede editarlos.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Campo etiqueta="Banco" Icono={Landmark} testid="datos-cobro-banco" valor={form.banco} onCambiar={(v) => setCampo('banco', v)} placeholder="Ej. BBVA" soloLectura={soloLectura} />
            <Campo etiqueta="Titular de la cuenta" Icono={User} testid="datos-cobro-titular" valor={form.titular} onCambiar={(v) => setCampo('titular', v)} placeholder="Nombre del titular" soloLectura={soloLectura} />
            <Campo etiqueta="CLABE interbancaria" Icono={Hash} testid="datos-cobro-clabe" valor={form.clabe} onCambiar={(v) => setCampo('clabe', v)} placeholder="18 dígitos" soloLectura={soloLectura} mono soloDigitos maxLength={18} />
            <Campo etiqueta="Número de cuenta" Icono={Wallet} testid="datos-cobro-cuenta" valor={form.cuenta} onCambiar={(v) => setCampo('cuenta', v)} placeholder="Número de cuenta" soloLectura={soloLectura} mono soloDigitos maxLength={20} />
            <Campo etiqueta="Número de tarjeta (OXXO)" Icono={CreditCard} testid="datos-cobro-tarjeta" valor={form.tarjeta} onCambiar={(v) => setCampo('tarjeta', v)} placeholder="1234 5678 9012 3456" soloLectura={soloLectura} mono maxLength={16} agruparCada={4} />
          </div>

          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Instrucciones</label>
            <textarea
              data-testid="datos-cobro-instrucciones"
              value={form.instrucciones}
              onChange={(e) => setCampo('instrucciones', e.target.value)}
              disabled={soloLectura}
              rows={3}
              placeholder="Ej. Envía tu comprobante e indica el concepto…"
              className="w-full min-h-[150px] rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-70 lg:min-h-0"
            />
          </div>
        </div>

        {/* Footer con la acción */}
        {esSuper && (
          <div className="flex justify-end border-t border-borde px-5 py-3">
            <button
              type="button"
              data-testid="datos-cobro-guardar"
              onClick={() => guardar.mutate(form)}
              disabled={!hayCambios || guardar.isPending}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={15} />
              {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CAMPO (input con icono)
// =============================================================================

function Campo({
  etiqueta,
  Icono,
  valor,
  onCambiar,
  placeholder,
  soloLectura,
  testid,
  mono,
  soloDigitos,
  maxLength,
  agruparCada,
}: {
  etiqueta: string;
  Icono: LucideIcon;
  valor: string;
  onCambiar: (v: string) => void;
  placeholder?: string;
  soloLectura: boolean;
  testid: string;
  mono?: boolean;
  /** Solo permite dígitos (filtra letras/símbolos al teclear). */
  soloDigitos?: boolean;
  /** Tope de dígitos. */
  maxLength?: number;
  /** Muestra el valor agrupado cada N dígitos (ej. 4 → "1234 5678…"). Guarda solo dígitos. */
  agruparCada?: number;
}) {
  const manejarCambio = (entrada: string) => {
    let v = entrada;
    if (soloDigitos || agruparCada) v = v.replace(/\D/g, '');
    if (maxLength) v = v.slice(0, maxLength);
    onCambiar(v);
  };
  const valorMostrado = agruparCada
    ? valor.replace(new RegExp(`(.{${agruparCada}})`, 'g'), '$1 ').trim()
    : valor;
  return (
    <div>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">{etiqueta}</label>
      <div className="relative">
        <Icono size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-4" />
        <input
          data-testid={testid}
          type="text"
          inputMode={soloDigitos || agruparCada ? 'numeric' : undefined}
          maxLength={agruparCada ? undefined : maxLength}
          value={valorMostrado}
          onChange={(e) => manejarCambio(e.target.value)}
          disabled={soloLectura}
          placeholder={placeholder}
          className={`w-full rounded-[10px] border border-campo-borde bg-campo py-2 pl-9 pr-3 text-[13.5px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-70 ${
            mono ? 'font-mono tracking-tight' : ''
          }`}
        />
      </div>
    </div>
  );
}

export default PestanaDatosCobro;
