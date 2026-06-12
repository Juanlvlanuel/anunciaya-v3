/**
 * FichaUsuario.tsx
 * =================
 * Expediente 360 (RESUMEN) de una persona — calcado de FichaNegocio. Usa el
 * ModalAdaptativo base (centrado en escritorio, bottom-sheet en móvil). Abre al
 * instante con un placeholder de la fila + prefetch en hover; React Query rellena.
 *
 * Layout: cabecera (avatar + nombre/correo + badge de estado) / cuerpo 2 columnas:
 *   - Izquierda: Acceso (diagnóstico + métodos de login/2FA) · Identidad
 *   - Derecha:   Roles (sombreros + modo comercial + id) · Actividad
 * Las acciones (soporte + moderación) van en el footer.
 *
 * SIN footer de acciones: el soporte (rescates) y la moderación (suspender/reactivar)
 * llegan en la Fase 2. Reusa los helpers de presentación de FichaNegocio.
 *
 * Ubicación: apps/admin/src/components/usuarios/FichaUsuario.tsx
 */

import { useState } from 'react';
import {
  X,
  KeyRound,
  User,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Unlock,
  Mail,
  Ban,
  PlayCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  useUsuarioExpediente,
  useDesbloquearIntentos,
  useGenerarCodigoAcceso,
  useCambiarCorreoUsuario,
  useSuspenderUsuario,
  useReactivarUsuario,
} from '../../hooks/queries/useUsuariosAdmin';
import type { UsuarioFila, UsuarioExpediente } from '../../services/usuariosService';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { VisorImagen } from '../ui/VisorImagen';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Tooltip } from '../ui/Tooltip';
import { DialogoEditarCorreo } from '../negocios/DialogoEditarCorreo';
import { Seccion, Dato, fecha } from '../negocios/FichaNegocio';
import { BadgeEstadoUsuario, metaEstadoUsuario } from './estadoUsuario';
import { AvatarUsuario } from './avataresUsuario';
import { DialogoCodigoAcceso } from './DialogoCodigoAcceso';

interface FichaUsuarioProps {
  /** Fila que se abrió: sirve de placeholder para mostrar la ficha al instante. */
  previo: UsuarioFila;
  onCerrar: () => void;
}

/** Arma un expediente parcial con lo que ya trae la fila (el resto se rellena al
 *  llegar la respuesta). Evita la pantalla de "Cargando…". */
function placeholderDesdeFila(f: UsuarioFila): UsuarioExpediente {
  return {
    id: f.id,
    nombre: null,
    apellidos: null,
    nombreCompleto: f.nombre,
    correo: f.correo,
    alias: null,
    telefono: f.telefono,
    ciudad: null,
    avatarUrl: f.avatarUrl,
    genero: null,
    fechaNacimiento: null,
    createdAt: f.createdAt,
    ultimaConexion: f.ultimaConexion,
    ultimoAccesoPanel: null,
    estado: f.estado,
    perfil: f.perfil,
    membresia: 1,
    tieneModoComercial: false,
    modoActivo: f.perfil,
    correoVerificado: false,
    correoVerificadoAt: null,
    telefonoVerificado: false,
    autenticadoPorGoogle: false,
    autenticadoPorFacebook: false,
    dobleFactorHabilitado: false,
    panel2faHabilitado: false,
    calificacionPromedio: null,
    totalCalificaciones: 0,
    diagnostico: {
      correoVerificado: false,
      tieneContrasena: true,
      bloqueadoPorIntentos: false,
      bloqueadoHasta: null,
      intentosFallidos: 0,
      requiereCambioContrasena: false,
      puedeIniciarSesion: f.estado === 'activo',
    },
    sombreros: {
      esDueno: f.esDueno,
      negocioId: null,
      negocioNombre: null,
      esEmpleado: false,
      totalEmpleos: 0,
      esEmbajador: f.esEmbajador,
      codigoReferido: null,
      rolEquipo: f.rolEquipo,
      totalBilleterasPuntos: 0,
      saldoPuntos: 0,
      totalResenas: 0,
    },
  };
}

const ROL_EQUIPO_LABEL: Record<string, string> = {
  superadmin: 'SuperAdmin',
  gerente: 'Gerente regional',
  vendedor: 'Vendedor',
};

/** Dato con botón de copiar al portapapeles (correo, id…). `mono` para identificadores técnicos. */
function DatoCopiable({ etiqueta, valor, mono = false, testid }: { etiqueta: string; valor: string; mono?: boolean; testid?: string }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard?.writeText(valor).then(
      () => {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      },
      () => {},
    );
  };
  return (
    <Dato
      etiqueta={etiqueta}
      valor={
        <button
          type="button"
          data-testid={testid}
          onClick={copiar}
          title={valor}
          className={`inline-flex max-w-[200px] items-center gap-1.5 rounded-[7px] border border-borde bg-superficie px-2 py-0.5 text-texto-2 transition hover:bg-marca-suave ${mono ? 'font-mono text-[11px]' : 'text-[12px]'}`}
        >
          <span className="truncate">{valor}</span>
          {copiado ? <Check size={13} className="shrink-0 text-ok" /> : <Copy size={13} className="shrink-0 text-texto-4" />}
        </button>
      }
    />
  );
}

/** Chip sobrio (pill + punto de color) para valores binarios (verificado / no). */
function ChipBinario({ texto, activo, testid }: { texto: string; activo: boolean; testid?: string }) {
  return (
    <span
      data-testid={testid}
      className="inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2 py-0.5 text-[11.5px] font-medium text-texto-2"
    >
      <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: activo ? 'var(--panel-ok)' : 'var(--panel-text-4)' }} />
      {texto}
    </span>
  );
}

export function FichaUsuario({ previo, onCerrar }: FichaUsuarioProps) {
  const { data, isError } = useUsuarioExpediente(previo.id, placeholderDesdeFila(previo));
  // `data` siempre existe (placeholder de la fila o datos reales) → ficha al instante.
  const u = data ?? placeholderDesdeFila(previo);
  const d = u.diagnostico;
  const s = u.sombreros;
  const [verAvatar, setVerAvatar] = useState(false);
  const [dialogo, setDialogo] = useState<null | 'codigo-acceso' | 'suspender' | 'reactivar' | 'editar-correo'>(null);
  const cerrarDialogo = () => setDialogo(null);

  // El permiso real lo decide el backend; la UI solo refleja. Soporte = super + gerente;
  // moderación (suspender/reactivar) = solo super y nunca sobre cuentas de equipo.
  const rol = useAuthPanelStore((st) => st.usuario?.rolEquipo);
  const puedeActuar = rol === 'superadmin' || rol === 'gerente';
  const esSuperadmin = rol === 'superadmin';

  const desbloquear = useDesbloquearIntentos();
  const generarCodigo = useGenerarCodigoAcceso();
  const cambiarCorreo = useCambiarCorreoUsuario();
  const suspender = useSuspenderUsuario();
  const reactivar = useReactivarUsuario();

  const bloqueado = d.bloqueadoPorIntentos;
  const suspendido = u.estado === 'suspendido';
  const esEquipo = !!s.rolEquipo;

  // Razones por las que NO puede iniciar sesión (derivadas del diagnóstico).
  const razones: string[] = [];
  if (u.estado !== 'activo') razones.push(`Cuenta ${metaEstadoUsuario(u.estado).etiqueta.toLowerCase()}`);
  if (!d.tieneContrasena) razones.push('Aún no ha creado su contraseña');
  if (d.bloqueadoPorIntentos) razones.push(`Bloqueada por intentos fallidos${d.bloqueadoHasta ? ` hasta ${fecha(d.bloqueadoHasta)}` : ''}`);

  const sinSombrerosEspeciales = !s.esDueno && !s.esEmpleado && !s.esEmbajador && !s.rolEquipo;

  return (
    <>
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="xl"
      alturaMaxima="xl"
      discriminador="ficha-usuario"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="ficha-usuario">
        {/* Cabecera */}
        <div className="flex shrink-0 items-center gap-3 border-b border-borde px-5 py-4">
          <button
            type="button"
            data-testid="ficha-usuario-avatar"
            onClick={() => setVerAvatar(true)}
            aria-label="Ver foto de perfil"
            className="shrink-0 rounded-full transition hover:opacity-90 focus:outline-none focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
          >
            <AvatarUsuario nombre={u.nombreCompleto || u.correo} avatarUrl={u.avatarUrl} tam={46} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <span className="truncate text-[17px] font-bold tracking-[-0.2px] text-texto" data-testid="ficha-usuario-nombre">
              {u.nombreCompleto || '(Sin nombre)'}
            </span>
            <span className="flex items-center gap-2">
              <BadgeEstadoUsuario estado={u.estado} small />
              <span className="truncate text-[12.5px] text-texto-3">{u.correo}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {puedeActuar && (
              <>
                <Tooltip text="Generar código de acceso a la app">
                  <button
                    type="button"
                    data-testid="ficha-usuario-codigo-acceso"
                    onClick={() => setDialogo('codigo-acceso')}
                    aria-label="Generar código de acceso a la app"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-marca transition hover:bg-marca-suave"
                  >
                    <KeyRound size={18} />
                  </button>
                </Tooltip>
                {bloqueado && (
                  <Tooltip text="Desbloquear intentos">
                    <button
                      type="button"
                      data-testid="ficha-usuario-desbloquear"
                      onClick={() => desbloquear.mutate(u.id)}
                      disabled={desbloquear.isPending}
                      aria-label="Desbloquear intentos"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-marca transition hover:bg-marca-suave disabled:opacity-50"
                    >
                      <Unlock size={18} />
                    </button>
                  </Tooltip>
                )}
                <Tooltip text="Corregir correo">
                  <button
                    type="button"
                    data-testid="ficha-usuario-editar-correo"
                    onClick={() => setDialogo('editar-correo')}
                    aria-label="Corregir correo"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-[#d97706] transition hover:bg-[#d977061f]"
                  >
                    <Mail size={18} />
                  </button>
                </Tooltip>
                {esSuperadmin && !esEquipo && (
                  suspendido ? (
                    <Tooltip text="Reactivar cuenta">
                      <button
                        type="button"
                        data-testid="ficha-usuario-reactivar"
                        onClick={() => setDialogo('reactivar')}
                        aria-label="Reactivar cuenta"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-ok transition hover:bg-[#34c77b1f]"
                      >
                        <PlayCircle size={18} />
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip text="Suspender cuenta">
                      <button
                        type="button"
                        data-testid="ficha-usuario-suspender"
                        onClick={() => setDialogo('suspender')}
                        aria-label="Suspender cuenta"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-peligro transition hover:bg-peligro-suave"
                      >
                        <Ban size={18} />
                      </button>
                    </Tooltip>
                  )
                )}
              </>
            )}
            <button
              type="button"
              data-testid="ficha-usuario-cerrar"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-visible">
          {isError && (
            <div className="mb-3 rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
              No se pudo cargar el detalle completo.
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Columna izquierda */}
            <div className="flex flex-col gap-3">
              <Seccion titulo="Acceso a la app" icono={KeyRound}>
                {/* Banner: puede / no puede iniciar sesión. */}
                <div
                  data-testid="ficha-usuario-acceso"
                  className="mb-2.5 flex items-start gap-2.5 rounded-[10px] px-3 py-2.5"
                  style={{
                    background: d.puedeIniciarSesion
                      ? 'color-mix(in srgb, var(--panel-ok) 10%, transparent)'
                      : 'color-mix(in srgb, var(--panel-danger) 9%, transparent)',
                  }}
                >
                  {d.puedeIniciarSesion ? (
                    <CheckCircle2 size={17} className="mt-px shrink-0 text-ok" />
                  ) : (
                    <AlertTriangle size={17} className="mt-px shrink-0 text-peligro" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-[13px] font-semibold ${d.puedeIniciarSesion ? 'text-ok' : 'text-peligro'}`}>
                      {d.puedeIniciarSesion ? 'Puede iniciar sesión' : 'No puede iniciar sesión'}
                    </p>
                    {!d.puedeIniciarSesion && razones.length > 0 && (
                      <ul className="mt-1 list-disc pl-4 text-[12px] text-texto-2">
                        {razones.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <ChipBinario texto={d.tieneContrasena ? 'Con contraseña' : 'Sin contraseña'} activo={d.tieneContrasena} testid="chip-contrasena" />
                  <ChipBinario texto={d.correoVerificado ? 'Correo verificado' : 'Correo sin verificar'} activo={d.correoVerificado} testid="chip-correo-verif" />
                  {d.bloqueadoPorIntentos && <ChipBinario texto="Bloqueado por intentos" activo={false} testid="chip-bloqueado" />}
                  {d.requiereCambioContrasena && <ChipBinario texto="Debe cambiar contraseña" activo={false} testid="chip-cambio-contrasena" />}
                  {u.autenticadoPorGoogle && <ChipBinario texto="Google" activo testid="chip-google" />}
                  {u.autenticadoPorFacebook && <ChipBinario texto="Facebook" activo testid="chip-facebook" />}
                  {u.dobleFactorHabilitado && <ChipBinario texto="2FA app" activo testid="chip-2fa-app" />}
                  {u.panel2faHabilitado && <ChipBinario texto="2FA Panel" activo testid="chip-2fa-panel" />}
                </div>
                {d.intentosFallidos > 0 && (
                  <p className="mt-2 text-[11.5px] text-texto-4">Intentos fallidos: {d.intentosFallidos}</p>
                )}
              </Seccion>

              <Seccion titulo="Identidad" icono={User}>
                <Dato etiqueta="Nombre" valor={u.nombreCompleto || '—'} />
                <DatoCopiable etiqueta="Correo" valor={u.correo} testid="ficha-usuario-copiar-correo" />
                <Dato etiqueta="Alias" valor={u.alias ?? '—'} />
                <Dato etiqueta="Teléfono" valor={u.telefono ?? '—'} />
                <Dato etiqueta="Ciudad" valor={u.ciudad ?? '—'} />
                <Dato etiqueta="Nacimiento" valor={fecha(u.fechaNacimiento)} />
              </Seccion>
            </div>

            {/* Columna derecha */}
            <div className="flex flex-col gap-3">
              <Seccion titulo="Roles" icono={Layers}>
                {sinSombrerosEspeciales && <Dato etiqueta="Rol" valor="Cliente" />}
                {s.esDueno && <Dato etiqueta="Dueño de negocio" valor={s.negocioNombre ?? 'Sí'} />}
                {s.esEmpleado && <Dato etiqueta="Empleado" valor={`En ${s.totalEmpleos} ${s.totalEmpleos === 1 ? 'negocio' : 'negocios'}`} />}
                {s.esEmbajador && (
                  <Dato
                    etiqueta="Vendedor"
                    valor={s.codigoReferido ? <span className="font-mono">{s.codigoReferido}</span> : 'Sí'}
                  />
                )}
                {s.rolEquipo && <Dato etiqueta="Rol de equipo" valor={ROL_EQUIPO_LABEL[s.rolEquipo] ?? s.rolEquipo} />}
                <Dato etiqueta="Modo comercial" valor={<ChipBinario texto={u.tieneModoComercial ? 'Disponible' : 'No disponible'} activo={u.tieneModoComercial} testid="chip-modo-comercial" />} />
                <DatoCopiable etiqueta="ID de cuenta" valor={u.id} mono testid="ficha-usuario-copiar-id" />
              </Seccion>

              <Seccion titulo="Actividad" icono={Clock}>
                <Dato etiqueta="Última conexión" valor={fecha(u.ultimaConexion)} />
                {esEquipo && <Dato etiqueta="Último acceso al Panel" valor={fecha(u.ultimoAccesoPanel)} />}
                <Dato etiqueta="Registro" valor={fecha(u.createdAt)} />
              </Seccion>
            </div>
          </div>
        </div>

      </div>
    </ModalAdaptativo>

    {dialogo === 'codigo-acceso' && (
      <DialogoCodigoAcceso
        abierto
        onCerrar={() => {
          cerrarDialogo();
          generarCodigo.reset();
        }}
        nombre={u.nombreCompleto}
        correo={u.correo}
        cargando={generarCodigo.isPending}
        resultado={generarCodigo.data ?? null}
        onGenerar={() => generarCodigo.mutate(u.id)}
      />
    )}
    {dialogo === 'suspender' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Suspender cuenta"
        variante="danger"
        mensaje="La cuenta no podrá iniciar sesión en ninguna parte de la app hasta que se reactive. Sus datos, puntos e historial se conservan. El motivo queda registrado."
        textoConfirmar="Suspender"
        requiereMotivo
        cargando={suspender.isPending}
        onConfirmar={(motivo) => suspender.mutate({ id: u.id, motivo }, { onSuccess: cerrarDialogo })}
      />
    )}
    {dialogo === 'reactivar' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Reactivar cuenta"
        mensaje="La cuenta volverá a poder iniciar sesión en la app."
        textoConfirmar="Reactivar"
        mostrarMotivo
        cargando={reactivar.isPending}
        onConfirmar={(motivo) => reactivar.mutate({ id: u.id, motivo: motivo || undefined }, { onSuccess: cerrarDialogo })}
      />
    )}
    {dialogo === 'editar-correo' && (
      <DialogoEditarCorreo
        abierto
        onCerrar={cerrarDialogo}
        correoActual={u.correo}
        titulo="Editar correo de la cuenta"
        descripcion="Corrige el correo de la cuenta. Le reenviaremos el código de acceso (crear o restablecer su contraseña) al correo nuevo."
        cargando={cambiarCorreo.isPending}
        onConfirmar={(correoNuevo) => cambiarCorreo.mutate({ id: u.id, correoNuevo }, { onSuccess: cerrarDialogo })}
      />
    )}

    <VisorImagen
      src={u.avatarUrl}
      alt={u.nombreCompleto || u.correo}
      abierto={verAvatar}
      onCerrar={() => setVerAvatar(false)}
      fallback={<AvatarUsuario nombre={u.nombreCompleto || u.correo} avatarUrl={null} tam={200} />}
    />
    </>
  );
}

export default FichaUsuario;
