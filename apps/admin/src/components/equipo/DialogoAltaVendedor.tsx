/**
 * DialogoAltaVendedor.tsx
 * =======================
 * Wizard "Dar de alta vendedor" (2 pasos: Persona → Cobertura y código). Consume
 * POST /admin/equipo/vendedores + GET /admin/equipo/ciudades + /sugerir-codigo.
 *
 * - Crea una cuenta NUEVA (modelo C: sin contraseña; se le envía el código para crearla) o PROMUEVE
 *   una cuenta existente sin rol de equipo (aviso en vivo al detectar el correo). El backend rechaza
 *   con 409 si el correo ya es de otro miembro del equipo.
 * - Código de referido: autogenerado al entrar al paso 2, editable, con botón "Regenerar".
 *
 * Ubicación: apps/admin/src/components/equipo/DialogoAltaVendedor.tsx
 */

import { Fragment, useState } from 'react';
import { X, User, MapPin, Check, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorCobertura } from './SelectorCobertura';
import { CampoCorreoCuenta } from './CampoCorreoCuenta';
import { useAltaVendedor } from '../../hooks/queries/useEquipoAdmin';
import { sugerirCodigo, type CuentaSugerida } from '../../services/equipoService';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODIGO_REGEX = /^[A-Za-z0-9]{3,20}$/;

const PASOS = [
  { n: 1, etiqueta: 'Persona', icono: User, desc: 'Datos de la cuenta del vendedor' },
  { n: 2, etiqueta: 'Cobertura', icono: MapPin, desc: 'Región, ciudades y código de referido' },
];

function PasoHeader({ icono: Icono, titulo, desc }: { icono: typeof User; titulo: string; desc: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
        <Icono size={17} />
      </span>
      <div>
        <div className="text-[14px] font-bold text-texto">{titulo}</div>
        <div className="text-[12px] text-texto-3">{desc}</div>
      </div>
    </div>
  );
}

interface DialogoAltaVendedorProps {
  abierto: boolean;
  onCerrar: () => void;
}

export function DialogoAltaVendedor({ abierto, onCerrar }: DialogoAltaVendedorProps) {
  const alta = useAltaVendedor();

  const [paso, setPaso] = useState(1);
  // Persona
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [telDigitos, setTelDigitos] = useState('');
  const [cuentaPromovida, setCuentaPromovida] = useState<CuentaSugerida | null>(null);
  // Cobertura
  const [regionId, setRegionId] = useState('');
  const [ciudadIds, setCiudadIds] = useState<string[]>([]);
  const [codigo, setCodigo] = useState('');
  const [generando, setGenerando] = useState(false);

  // ── Validación ──
  const nombreValido = nombre.trim().length >= 2;
  const apellidosValido = apellidos.trim().length >= 2;
  const correoValido = EMAIL_REGEX.test(correo.trim());
  const codigoValido = CODIGO_REGEX.test(codigo.trim());
  const paso1Valido = nombreValido && apellidosValido && correoValido;

  const onCorreoChange = (v: string) => {
    setCorreo(v);
    // Si editan el correo y deja de coincidir con la cuenta elegida, ya no es promoción.
    if (cuentaPromovida && v.trim().toLowerCase() !== cuentaPromovida.correo.toLowerCase()) setCuentaPromovida(null);
  };
  const onSeleccionarCuenta = (c: CuentaSugerida) => {
    setCorreo(c.correo);
    setNombre(c.nombreSolo ?? '');
    setApellidos(c.apellidos ?? '');
    setTelDigitos((c.telefono ?? '').replace(/^\+52/, '').replace(/\D/g, '').slice(0, 10));
    setCuentaPromovida(c);
  };
  const paso2Valido = ciudadIds.length > 0 && codigoValido;
  const pasoValido = (p: number) => (p === 1 ? paso1Valido : paso2Valido);
  const puedeEnviar = paso1Valido && paso2Valido && !alta.isPending;

  const generarCodigo = async () => {
    setGenerando(true);
    try {
      const c = await sugerirCodigo(nombre.trim(), apellidos.trim());
      if (c) setCodigo(c);
    } catch {
      /* el campo queda editable; no bloqueamos */
    } finally {
      setGenerando(false);
    }
  };

  const siguiente = async () => {
    if (paso !== 1 || !paso1Valido) return;
    if (!codigo) await generarCodigo(); // propone el código al entrar al paso 2
    setPaso(2);
  };

  const onCambiarRegion = (id: string) => {
    setRegionId(id);
    setCiudadIds([]); // las ciudades de la región anterior ya no aplican
  };
  const toggleCiudad = (id: string) =>
    setCiudadIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const enviar = () => {
    if (!puedeEnviar) return;
    alta.mutate(
      {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        correo: correo.trim(),
        telefono: telDigitos ? `+52${telDigitos}` : undefined,
        codigoReferido: codigo.trim(),
        ciudadIds,
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
      ancho="lg"
      alturaMaxima="xl"
      discriminador="dialogo-alta-vendedor"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-alta-vendedor">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <div className="text-[16px] font-bold text-texto">Dar de alta vendedor</div>
            <div className="text-[12px] text-texto-3">Crea su cuenta y su cartera de ciudades</div>
          </div>
          <button
            type="button"
            data-testid="alta-vend-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex shrink-0 items-center border-b border-borde px-5 pb-3.5">
          {PASOS.map((p, idx) => {
            const hecho = paso > p.n;
            const activo = paso === p.n;
            return (
              <Fragment key={p.n}>
                {idx > 0 && <div className={`mx-2 h-[2px] flex-1 rounded ${paso >= p.n ? 'bg-marca' : 'bg-borde'}`} />}
                <button type="button" disabled={p.n >= paso} onClick={() => p.n < paso && setPaso(p.n)} className="flex items-center gap-2 disabled:cursor-default">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold transition ${
                      hecho ? 'bg-marca-suave text-marca' : activo ? 'bg-marca text-marca-contraste' : 'border border-borde text-texto-4'
                    }`}
                  >
                    {hecho ? <Check size={15} /> : p.n}
                  </span>
                  <span className={`hidden text-[12.5px] lg:block ${activo ? 'font-semibold text-texto' : 'text-texto-3'}`}>{p.etiqueta}</span>
                </button>
              </Fragment>
            );
          })}
        </div>

        {/* Contenido */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {paso === 1 ? (
            <div data-testid="alta-vend-paso-persona">
              <PasoHeader icono={User} titulo="Persona" desc="El vendedor creará su contraseña en su primer ingreso" />
              <div className="mb-3">
                <label className={LABEL}>Correo</label>
                <CampoCorreoCuenta correo={correo} onCorreoChange={onCorreoChange} onSeleccionarCuenta={onSeleccionarCuenta} testid="alta-vend-correo" />
                {cuentaPromovida && (
                  <p className="mt-1 text-[12px] font-medium text-marca" data-testid="alta-vend-promover">
                    Promoverás esta cuenta existente a vendedor (conserva su contraseña).
                  </p>
                )}
              </div>
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Nombre</label>
                  <input type="text" data-testid="alta-vend-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={100} placeholder="Nombre" className={CLASE_CAMPO} />
                </div>
                <div>
                  <label className={LABEL}>Apellidos</label>
                  <input type="text" data-testid="alta-vend-apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} maxLength={100} placeholder="Apellidos" className={CLASE_CAMPO} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Teléfono <span className="font-normal text-texto-4">(opcional)</span></label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-texto-4">+52</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    data-testid="alta-vend-telefono"
                    value={telDigitos}
                    onChange={(e) => setTelDigitos(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10 dígitos"
                    className={`${CLASE_CAMPO} pl-12`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div data-testid="alta-vend-paso-cobertura">
              <PasoHeader icono={MapPin} titulo="Cobertura y código" desc="Las ciudades que cubre y su código de referido" />
              <SelectorCobertura regionId={regionId} onRegionChange={onCambiarRegion} ciudadIds={ciudadIds} onToggleCiudad={toggleCiudad} />

              <div className="mt-4">
                <label className={LABEL}>Código de referido</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    data-testid="alta-vend-codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20))}
                    placeholder="Ej. JUANP01"
                    className={`${CLASE_CAMPO} font-mono`}
                  />
                  <button
                    type="button"
                    data-testid="alta-vend-regenerar"
                    onClick={generarCodigo}
                    disabled={generando}
                    title="Regenerar"
                    className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[10px] border border-borde-fuerte bg-superficie text-texto-3 transition hover:bg-marca-suave hover:text-marca disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={generando ? 'animate-spin' : ''} />
                  </button>
                </div>
                {codigo && !codigoValido && (
                  <p className="mt-1 text-[12px] font-medium text-peligro">El código admite solo letras y números (3–20).</p>
                )}
                <p className="mt-1 text-[11.5px] text-texto-4">Va en su link de registro; se puede editar.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          {paso === 1 ? (
            <button type="button" data-testid="alta-vend-cancelar" onClick={onCerrar} disabled={alta.isPending} className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50">
              Cancelar
            </button>
          ) : (
            <button type="button" data-testid="alta-vend-atras" onClick={() => setPaso(1)} disabled={alta.isPending} className="inline-flex items-center gap-1 rounded-[10px] border border-borde-fuerte bg-superficie px-3 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50">
              <ChevronLeft size={16} /> Atrás
            </button>
          )}

          <span className="text-[12px] text-texto-4">Paso {paso} de 2</span>

          {paso < 2 ? (
            <button type="button" data-testid="alta-vend-siguiente" onClick={siguiente} disabled={!pasoValido(1)} className="inline-flex items-center gap-1 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50">
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" data-testid="alta-vend-enviar" onClick={enviar} disabled={!puedeEnviar} className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50">
              {alta.isPending ? 'Dando de alta…' : 'Dar de alta'}
            </button>
          )}
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoAltaVendedor;
