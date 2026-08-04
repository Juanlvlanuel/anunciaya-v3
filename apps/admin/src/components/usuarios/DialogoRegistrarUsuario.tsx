/**
 * DialogoRegistrarUsuario.tsx
 * ============================
 * Formulario "Registrar usuario" — alta MANUAL de una cuenta en Modo Personal (sin negocio) desde
 * el Panel. Consume POST /admin/usuarios/alta-manual + GET /admin/negocios/catalogo-ciudades
 * (reusado: mismo catálogo que el alta de negocio) + GET /admin/negocios/existe-correo (aviso
 * temprano de duplicado).
 *
 * Un solo formulario (sin wizard: son 6 campos) — calcado del paso "Dueño" de
 * DialogoRegistrarNegocio.tsx, más el selector de ciudad. Contraseña opcional: si se define, la
 * cuenta nace con acceso; si se deja vacía, se le envía el código para crear la suya.
 *
 * Ubicación: apps/admin/src/components/usuarios/DialogoRegistrarUsuario.tsx
 */

import { useMemo, useRef, useState } from 'react';
import { X, UserPlus, Eye, EyeOff } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { SelectorBuscable } from '../ui/SelectorBuscable';
import { useCatalogoCiudades } from '../../hooks/queries/useNegociosAdmin';
import { existeCorreo } from '../../services/negociosService';
import { useAltaManualUsuario } from '../../hooks/queries/useUsuariosAdmin';

const CLASE_CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-hover)]';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface DialogoRegistrarUsuarioProps {
  abierto: boolean;
  onCerrar: () => void;
}

export function DialogoRegistrarUsuario({ abierto, onCerrar }: DialogoRegistrarUsuarioProps) {
  const { data: ciudades } = useCatalogoCiudades(abierto);
  const alta = useAltaManualUsuario();
  const opcionesCiudad = useMemo(
    () => (ciudades ?? []).map((c) => ({ id: c.id, etiqueta: `${c.nombre}, ${c.estado}` })),
    [ciudades],
  );

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState('');
  const [telDigitos, setTelDigitos] = useState('');
  const [ciudadId, setCiudadId] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  // Chequeo de correo en vivo (aviso temprano de duplicado)
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [correoDuplicado, setCorreoDuplicado] = useState(false);
  const correoRef = useRef('');

  const nombreValido = nombre.trim().length >= 2;
  const apellidosValido = apellidos.trim().length >= 2;
  const correoValido = EMAIL_REGEX.test(correo.trim());
  const correosCoinciden =
    correo.trim().toLowerCase() === confirmarCorreo.trim().toLowerCase() && confirmarCorreo.length > 0;
  const telValido = telDigitos === '' || /^\d{10}$/.test(telDigitos);
  const ciudadValida = ciudadId !== '';
  const contrasenaValida = contrasena === '' || (contrasena.length >= 8 && /[A-Z]/.test(contrasena) && /[0-9]/.test(contrasena));

  const puedeEnviar =
    nombreValido &&
    apellidosValido &&
    correoValido &&
    correosCoinciden &&
    telValido &&
    ciudadValida &&
    contrasenaValida &&
    !correoDuplicado &&
    !verificandoCorreo &&
    !alta.isPending;

  const handleBlurCorreo = async () => {
    const c = correo.trim().toLowerCase();
    if (!EMAIL_REGEX.test(c)) { setCorreoDuplicado(false); return; }
    setVerificandoCorreo(true);
    try {
      const existe = await existeCorreo(c);
      if (correoRef.current.trim().toLowerCase() === c) setCorreoDuplicado(existe);
    } catch {
      setCorreoDuplicado(false); // si la consulta falla, no bloqueamos (el 409 del alta es la red de seguridad)
    } finally {
      setVerificandoCorreo(false);
    }
  };

  const limpiar = () => {
    setNombre('');
    setApellidos('');
    setCorreo('');
    setConfirmarCorreo('');
    setTelDigitos('');
    setCiudadId('');
    setContrasena('');
    setCorreoDuplicado(false);
  };

  const enviar = () => {
    if (!puedeEnviar) return;
    alta.mutate(
      {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        correo: correo.trim(),
        confirmarCorreo: confirmarCorreo.trim(),
        ciudadId,
        ...(telDigitos ? { telefono: `+52${telDigitos}` } : {}),
        ...(contrasena ? { contrasena } : {}),
      },
      { onSuccess: () => { limpiar(); onCerrar(); } },
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
      discriminador="dialogo-registrar-usuario"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="dialogo-registrar-usuario">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <div className="text-[16px] font-bold text-texto">Registrar usuario</div>
            <div className="text-[12px] text-texto-3">Cuenta en Modo Personal · alta manual</div>
          </div>
          <button
            type="button"
            data-testid="alta-usuario-cerrar"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
          >
            <X size={19} />
          </button>
        </div>

        {/* Contenido */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-marca-suave text-marca">
              <UserPlus size={17} />
            </span>
            <div>
              <div className="text-[14px] font-bold text-texto">Datos de la cuenta</div>
              <div className="text-[12px] text-texto-3">El usuario creará su contraseña en su primer ingreso</div>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Nombre</label>
              <input
                type="text"
                data-testid="alta-usuario-nombre"
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
                data-testid="alta-usuario-apellidos"
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
              data-testid="alta-usuario-correo"
              value={correo}
              onChange={(e) => { setCorreo(e.target.value); correoRef.current = e.target.value; setCorreoDuplicado(false); }}
              onBlur={handleBlurCorreo}
              placeholder="correo@ejemplo.com"
              className={CLASE_CAMPO}
            />
            {verificandoCorreo && (
              <p className="mt-1 text-[12px] font-medium text-texto-4" data-testid="alta-usuario-correo-verificando">
                Verificando…
              </p>
            )}
            {correoDuplicado && !verificandoCorreo && (
              <p className="mt-1 text-[12px] font-medium text-peligro" data-testid="alta-usuario-correo-duplicado">
                Este correo ya está registrado en AnunciaYA.
              </p>
            )}
          </div>

          <div className="mb-3">
            <label className={LABEL}>Confirmar correo</label>
            <input
              type="email"
              data-testid="alta-usuario-confirmar-correo"
              value={confirmarCorreo}
              onChange={(e) => setConfirmarCorreo(e.target.value)}
              placeholder="Repite el correo"
              className={CLASE_CAMPO}
            />
            {confirmarCorreo.length > 0 && !correosCoinciden && (
              <p className="mt-1 text-[12px] font-medium text-peligro" data-testid="alta-usuario-correo-error">
                Los correos no coinciden
              </p>
            )}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Teléfono <span className="font-normal text-texto-4">(opcional)</span></label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-texto-4">+52</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  data-testid="alta-usuario-telefono"
                  value={telDigitos}
                  onChange={(e) => setTelDigitos(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10 dígitos"
                  className={`${CLASE_CAMPO} pl-12`}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Ciudad</label>
              <SelectorBuscable
                testid="alta-usuario-ciudad"
                value={ciudadId}
                onChange={setCiudadId}
                opciones={opcionesCiudad}
                placeholder="Selecciona una ciudad"
                buscarPlaceholder="Buscar ciudad…"
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Contraseña <span className="font-normal text-texto-4">(opcional)</span></label>
            <div className="relative">
              <input
                type={mostrarContrasena ? 'text' : 'password'}
                data-testid="alta-usuario-contrasena"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="new-password"
                placeholder="Déjala vacía para enviarle el correo de activación"
                className={`${CLASE_CAMPO} pr-11`}
              />
              <button
                type="button"
                onClick={() => setMostrarContrasena((v) => !v)}
                aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-texto-3 transition hover:bg-marca-suave hover:text-marca"
              >
                {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {contrasena !== '' && !contrasenaValida ? (
              <p className="mt-1 text-[12px] font-medium text-peligro" data-testid="alta-usuario-contrasena-error">
                Mínimo 8 caracteres, 1 mayúscula y 1 número.
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-texto-4">
                Si la defines, el usuario entra con ella y no se le manda correo. Si la dejas vacía, se le envía el código para crearla.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
          <button
            type="button"
            data-testid="alta-usuario-cancelar"
            onClick={onCerrar}
            disabled={alta.isPending}
            className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="alta-usuario-enviar"
            onClick={enviar}
            disabled={!puedeEnviar}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {alta.isPending ? 'Registrando…' : 'Registrar usuario'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoRegistrarUsuario;
