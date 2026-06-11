/**
 * DialogoRegistrarNegocio.tsx
 * ===========================
 * Formulario "Registrar negocio" — alta MANUAL de un negocio en efectivo/transferencia
 * (sin Stripe). Consume POST /admin/negocios/alta-manual y GET /admin/negocios/catalogo-ciudades.
 *
 * Captura: datos del negocio (nombre, ciudad del catálogo por región), datos del dueño
 * (nombre, apellidos, correo ×2, teléfono) y el cobro (concepto efectivo/transferencia/cortesía,
 * monto, meses). El selector de vendedor y la opción de cortesía solo se muestran a
 * superadmin/gerente; el vendedor se auto-atribuye en el backend y no puede regalar membresías
 * (el candado real vive en el service). Reusa el lenguaje visual del modal de detalle
 * (ModalAdaptativo + secciones <Seccion> en tarjeta con ícono), calcado de FichaNegocio.
 *
 * Ubicación: apps/admin/src/components/negocios/DialogoRegistrarNegocio.tsx
 */

import { useState, useRef } from 'react';
import { X, Store, User, CreditCard, UserPlus } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Seccion } from './FichaNegocio';
import { useCatalogoCiudades, useVendedoresFiltro, useAltaManualNegocio } from '../../hooks/queries/useNegociosAdmin';
import { existeCorreo } from '../../services/negociosService';
import type { ConceptoAlta, DatosAltaManual } from '../../services/negociosService';
import type { RolPanel } from '../../data/menuPanel';

// Inputs blancos (bg-superficie) para que contrasten sobre la tarjeta gris de <Seccion>.
const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-superficie px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESES_CHIP = [1, 3, 6, 12];
const CONCEPTOS: { valor: ConceptoAlta; etiqueta: string }[] = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'cortesia', etiqueta: 'Cortesía' },
];

const chip = (activo: boolean) =>
  `rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition ${
    activo ? 'border-marca bg-marca-suave text-marca' : 'border-borde text-texto-2 hover:bg-marca-suave'
  }`;

interface DialogoRegistrarNegocioProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Rol del operador: el vendedor no elige vendedor (se auto-atribuye) ni puede dar cortesía. */
  rol: RolPanel;
}

export function DialogoRegistrarNegocio({ abierto, onCerrar, rol }: DialogoRegistrarNegocioProps) {
  // El vendedor de calle no elige vendedor (se auto-atribuye) ni puede regalar cortesías.
  const esVendedor = rol === 'vendedor';
  const mostrarVendedor = !esVendedor;
  const permiteCortesia = !esVendedor;
  const conceptosDisponibles = permiteCortesia ? CONCEPTOS : CONCEPTOS.filter((c) => c.valor !== 'cortesia');

  const { data: ciudades } = useCatalogoCiudades(abierto);
  const { data: vendedores } = useVendedoresFiltro(mostrarVendedor);
  const alta = useAltaManualNegocio();

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
  const [monto, setMonto] = useState('');
  const [mesChip, setMesChip] = useState(1);
  const [modoOtro, setModoOtro] = useState(false);
  const [mesesOtro, setMesesOtro] = useState('');
  // Vendedor
  const [vendedorSel, setVendedorSel] = useState('');
  // Chequeo de correo en vivo (aviso temprano de duplicado)
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [correoDuplicado, setCorreoDuplicado] = useState(false);
  const correoRef = useRef('');

  // ── Validación derivada (booleans; el botón se deshabilita mientras algo no sea válido) ──
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

  const puedeEnviar =
    nombreNegocioValido &&
    ciudadValida &&
    nombreValido &&
    apellidosValido &&
    correoValido &&
    correosCoinciden &&
    telValido &&
    montoValido &&
    mesesValido &&
    !correoDuplicado &&
    !verificandoCorreo &&
    !alta.isPending;

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
      meses: mesesEfectivo,
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
      ancho="xl"
      alturaMaxima="xl"
      discriminador="dialogo-registrar-negocio"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-registrar-negocio">
        {/* Header fijo */}
        <div className="flex shrink-0 items-center justify-between border-b border-borde px-5 py-4">
          <span className="text-[16px] font-bold text-texto">Registrar negocio</span>
          <button
            type="button"
            data-testid="alta-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        {/* Cuerpo con scroll — secciones en tarjeta, 2 columnas en PC (como la ficha de detalle).
            CSS multi-column balancea por altura y no parte una sección entre columnas. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="columns-1 gap-x-4 lg:columns-2 [&>div]:mb-4 [&>div]:break-inside-avoid">
            {/* ── Negocio ── */}
            <Seccion titulo="Negocio" icono={Store}>
              <div className="mb-3">
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
                <select
                  data-testid="alta-ciudad"
                  value={ciudadId}
                  onChange={(e) => setCiudadId(e.target.value)}
                  className={CLASE_CAMPO}
                >
                  <option value="">Selecciona una ciudad</option>
                  {(ciudades ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}, {c.estado}
                    </option>
                  ))}
                </select>
              </div>
            </Seccion>

            {/* ── Dueño ── */}
            <Seccion titulo="Dueño de la cuenta" icono={User}>
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
            </Seccion>

            {/* ── Cobro ── */}
            <Seccion titulo="Cobro" icono={CreditCard}>
              <div className="mb-3">
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
              {pideMonto && (
                <div className="mb-3">
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
                      placeholder="449.00"
                      className={`${CLASE_CAMPO} pl-6`}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className={LABEL}>Periodo cubierto</label>
                <div className="flex flex-wrap gap-2" data-testid="alta-meses">
                  {MESES_CHIP.map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-testid={`alta-mes-${m}`}
                      onClick={() => {
                        setModoOtro(false);
                        setMesChip(m);
                      }}
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
                    onChange={(e) => setMesesOtro(e.target.value)}
                    placeholder="Número de meses (1–36)"
                    className={`${CLASE_CAMPO} mt-2`}
                  />
                )}
              </div>
            </Seccion>

            {/* ── Vendedor (solo superadmin/gerente) ── */}
            {mostrarVendedor && (
              <Seccion titulo="Vendedor" icono={UserPlus}>
                <label className={LABEL}>Atribuir a</label>
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
              </Seccion>
            )}
          </div>
        </div>

        {/* Footer fijo */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button
            type="button"
            data-testid="alta-cancelar"
            onClick={onCerrar}
            disabled={alta.isPending}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="alta-enviar"
            onClick={enviar}
            disabled={!puedeEnviar}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {alta.isPending ? 'Registrando…' : 'Registrar negocio'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoRegistrarNegocio;
