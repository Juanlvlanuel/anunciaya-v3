/**
 * DialogoRegistrarNegocio.tsx
 * ===========================
 * Formulario "Registrar negocio" — alta MANUAL de un negocio en efectivo/transferencia
 * (sin Stripe). Consume POST /admin/negocios/alta-manual y GET /admin/negocios/catalogo-ciudades.
 *
 * Diseño en WIZARD de 3 pasos (Negocio → Dueño → Cobro), una sección a la vez con stepper, para
 * no amontonar la información. Captura: datos del negocio (nombre, ciudad del catálogo por región),
 * datos del dueño (nombre, apellidos, correo ×2, teléfono) y el cobro (concepto efectivo/
 * transferencia/cortesía, monto, periodo por meses o fecha exacta). El selector de vendedor se
 * muestra a superadmin/gerente; la **cortesía solo al superadmin** (el chip se oculta a los demás;
 * el candado real vive en el service). El vendedor se auto-atribuye en el backend.
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoRegistrarNegocio.tsx
 */

import { Fragment, useMemo, useState, useRef } from 'react';
import { X, Store, User, CreditCard, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorFecha } from '../ui/SelectorFecha';
import { SelectorBuscable } from '../ui/SelectorBuscable';
import { precioPorMeses } from './membresia';
import { usePrecioMembresia } from '../../hooks/queries/usePrecioMembresia';
import { useCatalogoCiudades, useVendedoresFiltro, useAltaManualNegocio } from '../../hooks/queries/useNegociosAdmin';
import { existeCorreo } from '../../services/negociosService';
import type { ConceptoAlta, DatosAltaManual } from '../../services/negociosService';
import type { RolPanel } from '../../data/menuPanel';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESES_CHIP = [1, 3, 6, 12];
const CONCEPTOS: { valor: ConceptoAlta; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'cortesia', etiqueta: 'Cortesía' },
];

const PASOS = [
  { n: 1, etiqueta: 'Negocio', icono: Store, desc: 'Nombre y ciudad del comercio' },
  { n: 2, etiqueta: 'Dueño', icono: User, desc: 'Datos de la cuenta del dueño' },
  { n: 3, etiqueta: 'Cobro', icono: CreditCard, desc: 'Periodo, monto y forma de pago' },
];

const chip = (activo: boolean) =>
  `rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
    activo ? 'border-marca bg-marca-suave text-marca' : 'border-borde text-texto-2 hover:bg-marca-suave'
  }`;

const segmento = (activo: boolean) =>
  `flex-1 rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition ${
    activo ? 'bg-marca text-marca-contraste' : 'text-texto-3 hover:text-texto'
  }`;

const MAX_MS_2_ANIOS = 730 * 24 * 60 * 60 * 1000;

/** Fecha local (yyyy-mm-dd) para los límites del calendario. */
function aISOLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Mínimo del calendario: mañana (un negocio nuevo no tiene vigencia previa). */
function minFechaAlta(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return aISOLocal(d);
}
/** Máximo del calendario: hoy + 2 años (tope de Stripe). */
function maxFechaAlta(): string {
  return aISOLocal(new Date(Date.now() + MAX_MS_2_ANIOS));
}
/** Días desde hoy (fin del día) hasta la fecha elegida (yyyy-mm-dd). */
function diasDesdeHoy(fechaYMD: string): number {
  if (!fechaYMD) return 0;
  const fin = new Date(`${fechaYMD}T23:59:59`).getTime();
  const hoyFin = new Date();
  hoyFin.setHours(23, 59, 59, 0);
  const d = Math.round((fin - hoyFin.getTime()) / (24 * 60 * 60 * 1000));
  return d > 0 ? d : 0;
}
/** Monto sugerido proporcional a los días (precio mensual base / 30 × días), al peso. */
function montoProporcional(fechaYMD: string, precioBase: number): number {
  const dias = diasDesdeHoy(fechaYMD);
  return dias > 0 ? Math.round((precioPorMeses(1, precioBase) / 30) * dias) : 0;
}

/** Cabecera de cada paso: ícono + título + descripción. */
function PasoHeader({ icono: Icono, titulo, desc }: { icono: typeof Store; titulo: string; desc: string }) {
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

interface DialogoRegistrarNegocioProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Rol del operador: el vendedor no elige vendedor (se auto-atribuye) ni puede dar cortesía. */
  rol: RolPanel;
}

export function DialogoRegistrarNegocio({ abierto, onCerrar, rol }: DialogoRegistrarNegocioProps) {
  // El vendedor de calle no elige vendedor (se auto-atribuye). La cortesía (regalar membresía) es
  // exclusiva del superadmin (el backend lo blinda; aquí solo se oculta el chip).
  const esVendedor = rol === 'vendedor';
  const mostrarVendedor = !esVendedor;
  const permiteCortesia = rol === 'superadmin';
  const conceptosDisponibles = permiteCortesia ? CONCEPTOS : CONCEPTOS.filter((c) => c.valor !== 'cortesia');

  const { data: ciudades } = useCatalogoCiudades(abierto);
  const { data: vendedores } = useVendedoresFiltro(mostrarVendedor);
  const alta = useAltaManualNegocio();
  const precioBase = usePrecioMembresia();
  const opcionesCiudad = useMemo(
    () => (ciudades ?? []).map((c) => ({ id: c.id, etiqueta: `${c.nombre}, ${c.estado}` })),
    [ciudades],
  );

  // Paso del wizard (1 Negocio · 2 Dueño · 3 Cobro)
  const [paso, setPaso] = useState(1);
  // Negocio
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  // Dueño
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState('');
  const [telDigitos, setTelDigitos] = useState('');
  // Cobro
  const [concepto, setConcepto] = useState<ConceptoAlta>('efectivo');
  const [monto, setMonto] = useState(String(precioPorMeses(1, precioBase)));
  const [mesChip, setMesChip] = useState(1);
  const [modoOtro, setModoOtro] = useState(false);
  const [mesesOtro, setMesesOtro] = useState('');
  const [modoPlazo, setModoPlazo] = useState<'meses' | 'fecha'>('meses');
  const [fechaManual, setFechaManual] = useState('');
  // Vendedor
  const [vendedorSel, setVendedorSel] = useState('');
  // Chequeo de correo en vivo (aviso temprano de duplicado)
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [correoDuplicado, setCorreoDuplicado] = useState(false);
  const correoRef = useRef('');

  // ── Validación derivada por campo ──
  const nombreNegocioValido = nombreNegocio.trim().length >= 2 && nombreNegocio.trim().length <= 120;
  const ciudadValida = ciudadId !== '';
  const nombreValido = nombre.trim().length >= 2;
  const apellidosValido = apellidos.trim().length >= 2;
  const correoValido = EMAIL_REGEX.test(correo.trim());
  const correosCoinciden =
    correo.trim().toLowerCase() === confirmarCorreo.trim().toLowerCase() && confirmarCorreo.length > 0;
  const telValido = /^\d{10}$/.test(telDigitos);
  const pideMonto = concepto !== 'cortesia';
  const montoNum = Number(monto);
  const montoValido = !pideMonto || (monto.trim() !== '' && !Number.isNaN(montoNum) && montoNum > 0);
  const mesesOtroNum = Number(mesesOtro);
  const mesesValido = modoOtro
    ? mesesOtro.trim() !== '' && Number.isInteger(mesesOtroNum) && mesesOtroNum >= 1 && mesesOtroNum <= 36
    : MESES_CHIP.includes(mesChip);
  const mesesEfectivo = modoOtro ? mesesOtroNum : mesChip;
  // Plazo: por meses (chips/otro) o por fecha exacta (el calendario ya acota min/max).
  const plazoValido = modoPlazo === 'meses' ? mesesValido : fechaManual !== '';
  const diasFecha = modoPlazo === 'fecha' ? diasDesdeHoy(fechaManual) : 0;

  // ── Validación por PASO (controla "Siguiente" y el envío final) ──
  const paso1Valido = nombreNegocioValido && ciudadValida;
  const paso2Valido =
    nombreValido && apellidosValido && correoValido && correosCoinciden && telValido && !correoDuplicado && !verificandoCorreo;
  const paso3Valido = montoValido && plazoValido;
  const pasoValido = (p: number) => (p === 1 ? paso1Valido : p === 2 ? paso2Valido : paso3Valido);

  const siguiente = () => {
    if (paso < 3 && pasoValido(paso)) setPaso((p) => p + 1);
  };
  const atras = () => setPaso((p) => Math.max(1, p - 1));

  // El MONTO sigue al periodo elegido (sugerido, editable): por meses = precio del plan;
  // por fecha = proporcional a los días. La cortesía no lleva monto.
  const aplicarMeses = (m: number) => {
    setModoOtro(false);
    setMesChip(m);
    if (concepto !== 'cortesia') setMonto(String(precioPorMeses(m, precioBase)));
  };
  const aplicarMesesOtro = (valor: string) => {
    setMesesOtro(valor);
    const n = Number(valor);
    if (concepto !== 'cortesia' && Number.isInteger(n) && n >= 1 && n <= 36) setMonto(String(precioPorMeses(n, precioBase)));
  };
  const aplicarModoMeses = () => {
    setModoPlazo('meses');
    const m = modoOtro ? Number(mesesOtro) : mesChip;
    if (concepto !== 'cortesia' && Number.isInteger(m) && m >= 1) setMonto(String(precioPorMeses(m, precioBase)));
  };
  // Elegir la fecha exacta sugiere el monto a proporción de los días (salvo cortesía); editable.
  const aplicarFecha = (valor: string) => {
    setFechaManual(valor);
    if (concepto !== 'cortesia' && valor) {
      const prop = montoProporcional(valor, precioBase);
      setMonto(prop > 0 ? String(prop) : '');
    }
  };

  const puedeEnviar = paso1Valido && paso2Valido && paso3Valido && !alta.isPending;

  // Al salir del campo correo (con formato válido) consulta si ya existe → aviso temprano.
  const handleBlurCorreo = async () => {
    const c = correo.trim().toLowerCase();
    if (!EMAIL_REGEX.test(c)) { setCorreoDuplicado(false); return; }
    setVerificandoCorreo(true);
    try {
      const existe = await existeCorreo(c);
      // anti-race: aplica solo si el correo no cambió mientras se consultaba
      if (correoRef.current.trim().toLowerCase() === c) setCorreoDuplicado(existe);
    } catch {
      setCorreoDuplicado(false); // si la consulta falla, no bloqueamos (el 409 del alta es la red de seguridad)
    } finally {
      setVerificandoCorreo(false);
    }
  };

  const enviar = () => {
    if (!puedeEnviar) return;
    const datos: DatosAltaManual = {
      nombreNegocio: nombreNegocio.trim(),
      ciudadId,
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      correo: correo.trim(),
      confirmarCorreo: confirmarCorreo.trim(),
      telefono: `+52${telDigitos}`,
      concepto,
      monto: pideMonto ? montoNum : undefined,
      ...(modoPlazo === 'fecha'
        ? { hasta: new Date(`${fechaManual}T23:59:59`).toISOString() }
        : { meses: mesesEfectivo }),
      ...(mostrarVendedor ? { embajadorId: vendedorSel || null } : {}),
    };
    alta.mutate(datos, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="lg"
      alturaMaxima="xl"
      discriminador="dialogo-registrar-negocio"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-registrar-negocio">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <div className="text-[16px] font-bold text-texto">Registrar negocio</div>
            <div className="text-[12px] text-texto-3">Alta manual · efectivo, transferencia o cortesía</div>
          </div>
          <button
            type="button"
            data-testid="alta-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex shrink-0 items-center border-b border-borde px-5 pb-3.5" data-testid="alta-stepper">
          {PASOS.map((p, idx) => {
            const hecho = paso > p.n;
            const activo = paso === p.n;
            return (
              <Fragment key={p.n}>
                {idx > 0 && <div className={`mx-2 h-[2px] flex-1 rounded ${paso >= p.n ? 'bg-marca' : 'bg-borde'}`} />}
                <button
                  type="button"
                  disabled={p.n >= paso}
                  onClick={() => p.n < paso && setPaso(p.n)}
                  className="flex items-center gap-2 disabled:cursor-default"
                >
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

        {/* Contenido del paso */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {/* ── Paso 1: Negocio ── */}
          {paso === 1 && (
            <div data-testid="alta-paso-negocio">
              <PasoHeader icono={Store} titulo="Negocio" desc="Nombre y ciudad del comercio" />
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div>
                  <label className={LABEL}>Nombre del negocio</label>
                  <input
                    type="text"
                    data-testid="alta-nombre-negocio"
                    value={nombreNegocio}
                    onChange={(e) => setNombreNegocio(e.target.value)}
                    maxLength={120}
                    placeholder="Ej. Tacos El Güero"
                    className={CLASE_CAMPO}
                  />
                </div>
                <div>
                  <label className={LABEL}>Ciudad</label>
                  <SelectorBuscable
                    testid="alta-ciudad"
                    value={ciudadId}
                    onChange={setCiudadId}
                    opciones={opcionesCiudad}
                    placeholder="Selecciona una ciudad"
                    buscarPlaceholder="Buscar ciudad…"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Paso 2: Dueño ── */}
          {paso === 2 && (
            <div data-testid="alta-paso-dueno">
              <PasoHeader icono={User} titulo="Dueño de la cuenta" desc="El dueño creará su contraseña en su primer ingreso" />
              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Nombre</label>
                  <input
                    type="text"
                    data-testid="alta-nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    maxLength={100}
                    placeholder="Nombre"
                    className={CLASE_CAMPO}
                  />
                </div>
                <div>
                  <label className={LABEL}>Apellidos</label>
                  <input
                    type="text"
                    data-testid="alta-apellidos"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    maxLength={100}
                    placeholder="Apellidos"
                    className={CLASE_CAMPO}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className={LABEL}>Correo</label>
                <input
                  type="email"
                  data-testid="alta-correo"
                  value={correo}
                  onChange={(e) => { setCorreo(e.target.value); correoRef.current = e.target.value; setCorreoDuplicado(false); }}
                  onBlur={handleBlurCorreo}
                  placeholder="correo@ejemplo.com"
                  className={CLASE_CAMPO}
                />
                {verificandoCorreo && (
                  <p className="mt-1 text-[12px] font-medium text-texto-4" data-testid="alta-correo-verificando">
                    Verificando…
                  </p>
                )}
                {correoDuplicado && !verificandoCorreo && (
                  <p className="mt-1 text-[12px] font-medium text-peligro" data-testid="alta-correo-duplicado">
                    Este correo ya está registrado en AnunciaYA.
                  </p>
                )}
              </div>
              <div className="mb-3">
                <label className={LABEL}>Confirmar correo</label>
                <input
                  type="email"
                  data-testid="alta-confirmar-correo"
                  value={confirmarCorreo}
                  onChange={(e) => setConfirmarCorreo(e.target.value)}
                  placeholder="Repite el correo"
                  className={CLASE_CAMPO}
                />
                {confirmarCorreo.length > 0 && !correosCoinciden && (
                  <p className="mt-1 text-[12px] font-medium text-peligro" data-testid="alta-correo-error">
                    Los correos no coinciden
                  </p>
                )}
              </div>
              <div>
                <label className={LABEL}>Teléfono</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-texto-4">+52</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    data-testid="alta-telefono"
                    value={telDigitos}
                    onChange={(e) => setTelDigitos(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10 dígitos"
                    className={`${CLASE_CAMPO} pl-12`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Paso 3: Cobro ── */}
          {paso === 3 && (
            <div data-testid="alta-paso-cobro">
              <PasoHeader icono={CreditCard} titulo="Cobro" desc="Periodo, monto y forma de pago" />

              {/* Periodo cubierto (primero: el monto se sugiere a partir de él) */}
              <div className="mb-4">
                <label className={LABEL}>Periodo cubierto</label>
                {/* Toggle: por meses cerrados o por una fecha exacta de vencimiento */}
                <div className="mb-2 flex rounded-[10px] border border-borde p-0.5" data-testid="alta-modo-plazo">
                  <button type="button" data-testid="alta-modo-meses" onClick={aplicarModoMeses} className={segmento(modoPlazo === 'meses')}>
                    Por meses
                  </button>
                  <button type="button" data-testid="alta-modo-fecha" onClick={() => setModoPlazo('fecha')} className={segmento(modoPlazo === 'fecha')}>
                    Fecha exacta
                  </button>
                </div>

                {modoPlazo === 'meses' ? (
                  <>
                    <div className="flex flex-wrap gap-2" data-testid="alta-meses">
                      {MESES_CHIP.map((m) => (
                        <button
                          key={m}
                          type="button"
                          data-testid={`alta-mes-${m}`}
                          onClick={() => aplicarMeses(m)}
                          className={chip(!modoOtro && mesChip === m)}
                        >
                          {m} {m === 1 ? 'mes' : 'meses'}
                        </button>
                      ))}
                      <button
                        type="button"
                        data-testid="alta-mes-otro"
                        onClick={() => setModoOtro(true)}
                        className={chip(modoOtro)}
                      >
                        Otro
                      </button>
                    </div>
                    {modoOtro && (
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="36"
                        data-testid="alta-mes-otro-input"
                        value={mesesOtro}
                        onChange={(e) => aplicarMesesOtro(e.target.value)}
                        placeholder="Número de meses (1–36)"
                        className={`${CLASE_CAMPO} mt-2`}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <SelectorFecha
                      testid="alta-fecha"
                      value={fechaManual}
                      minDate={minFechaAlta()}
                      maxDate={maxFechaAlta()}
                      onChange={aplicarFecha}
                    />
                    {diasFecha > 0 && (
                      <p className="mt-1 text-[11px] text-texto-4">
                        Cubre {diasFecha} {diasFecha === 1 ? 'día' : 'días'} desde hoy; el monto se sugiere proporcional (editable).
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Monto (se pre-llena según el periodo; editable) */}
              {pideMonto && (
                <div className="mb-4">
                  <label className={LABEL}>Monto</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-texto-4">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      data-testid="alta-monto"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder={`${precioBase}.00`}
                      className={`${CLASE_CAMPO} pl-6`}
                    />
                  </div>
                </div>
              )}

              {/* ¿Cómo pagó? (la cortesía oculta el monto) */}
              <div className={mostrarVendedor ? 'mb-4' : ''}>
                <label className={LABEL}>¿Cómo pagó?</label>
                <div className="flex flex-wrap gap-2" data-testid="alta-concepto">
                  {conceptosDisponibles.map((c) => (
                    <button
                      key={c.valor}
                      type="button"
                      data-testid={`alta-concepto-${c.valor}`}
                      onClick={() => setConcepto(c.valor)}
                      className={chip(concepto === c.valor)}
                    >
                      {c.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendedor (solo superadmin/gerente) */}
              {mostrarVendedor && (
                <div>
                  <label className={LABEL}>Vendedor que lo trae</label>
                  <select
                    data-testid="alta-vendedor"
                    value={vendedorSel}
                    onChange={(e) => setVendedorSel(e.target.value)}
                    className={CLASE_CAMPO}
                  >
                    <option value="">Sin vendedor</option>
                    {(vendedores ?? []).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: navegación del wizard */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          {paso === 1 ? (
            <button
              type="button"
              data-testid="alta-cancelar"
              onClick={onCerrar}
              disabled={alta.isPending}
              className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              data-testid="alta-atras"
              onClick={atras}
              disabled={alta.isPending}
              className="inline-flex items-center gap-1 rounded-[10px] border border-borde-fuerte bg-superficie px-3 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Atrás
            </button>
          )}

          <span className="text-[12px] text-texto-4">Paso {paso} de 3</span>

          {paso < 3 ? (
            <button
              type="button"
              data-testid="alta-siguiente"
              onClick={siguiente}
              disabled={!pasoValido(paso)}
              className="inline-flex items-center gap-1 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              data-testid="alta-enviar"
              onClick={enviar}
              disabled={!puedeEnviar}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {alta.isPending ? 'Registrando…' : 'Registrar negocio'}
            </button>
          )}
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoRegistrarNegocio;
