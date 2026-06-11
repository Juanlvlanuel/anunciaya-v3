/**
 * FichaUsuario.tsx
 * =================
 * Expediente 360 (RESUMEN) de una persona — calcado de FichaNegocio. Usa el
 * ModalAdaptativo base (centrado en escritorio, bottom-sheet en móvil). Abre al
 * instante con un placeholder de la fila + prefetch en hover; React Query rellena.
 *
 * Layout: cabecera (avatar + nombre/correo + badge de estado) / cuerpo 2 columnas:
 *   - Izquierda: Acceso (diagnóstico) · Identidad · Actividad
 *   - Derecha:   Roles y actividad · Tipo de cuenta · Moderación
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
  BadgeCheck,
  CheckCircle2,
  AlertTriangle,
  Unlock,
  Mail,
  Ban,
  PlayCircle,
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

const GENERO_LABEL: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
  no_especificado: 'No especificado',
};

const ROL_EQUIPO_LABEL: Record<string, string> = {
  superadmin: 'SuperAdmin',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
};

const FMT_NUM = new Intl.NumberFormat('es-MX');

function capitalizar(s: string | null): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
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
          {u.avatarUrl ? (
            <button
              type="button"
              data-testid="ficha-usuario-avatar"
              onClick={() => setVerAvatar(true)}
              aria-label="Ver foto de perfil"
              className="shrink-0 rounded-full transition hover:opacity-90 focus:outline-none focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
            >
              <AvatarUsuario nombre={u.nombreCompleto || u.correo} avatarUrl={u.avatarUrl} tam={46} />
            </button>
          ) : (
            <AvatarUsuario nombre={u.nombreCompleto || u.correo} avatarUrl={u.avatarUrl} tam={46} />
          )}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <span className="truncate text-[17px] font-bold tracking-[-0.2px] text-texto" data-testid="ficha-usuario-nombre">
              {u.nombreCompleto || '(Sin nombre)'}
            </span>
            <span className="flex items-center gap-2">
              <BadgeEstadoUsuario estado={u.estado} small />
              <span className="truncate text-[12.5px] text-texto-3">{u.correo}</span>
            </span>
          </div>
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
                </div>
                {d.intentosFallidos > 0 && (
                  <p className="mt-2 text-[11.5px] text-texto-4">Intentos fallidos: {d.intentosFallidos}</p>
                )}
              </Seccion>

              <Seccion titulo="Identidad" icono={User}>
                <Dato etiqueta="Nombre" valor={u.nombreCompleto || '—'} />
                <Dato etiqueta="Correo" valor={u.correo} />
                <Dato etiqueta="Alias" valor={u.alias ?? '—'} />
                <Dato etiqueta="Teléfono" valor={u.telefono ?? '—'} />
                <Dato etiqueta="Ciudad" valor={u.ciudad ?? '—'} />
                <Dato etiqueta="Género" valor={u.genero ? (GENERO_LABEL[u.genero] ?? u.genero) : '—'} />
                <Dato etiqueta="Nacimiento" valor={fecha(u.fechaNacimiento)} />
              </Seccion>
            </div>

            {/* Columna derecha */}
            <div className="flex flex-col gap-3">
              <Seccion titulo="Roles y actividad" icono={Layers}>
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
                <Dato
                  etiqueta="Puntos (CardYA)"
                  valor={
                    s.totalBilleterasPuntos > 0
                      ? `${FMT_NUM.format(s.saldoPuntos)} pts · ${s.totalBilleterasPuntos} ${s.totalBilleterasPuntos === 1 ? 'billetera' : 'billeteras'}`
                      : 'Sin puntos'
                  }
                />
                <Dato etiqueta="Reseñas escritas" valor={FMT_NUM.format(s.totalResenas)} />
              </Seccion>

              <Seccion titulo="Tipo de cuenta" icono={BadgeCheck}>
                <Dato etiqueta="Perfil" valor={capitalizar(u.perfil)} />
                <Dato etiqueta="Modo activo" valor={capitalizar(u.modoActivo)} />
                <Dato etiqueta="Modo comercial" valor={<ChipBinario texto={u.tieneModoComercial ? 'Disponible' : 'No'} activo={u.tieneModoComercial} testid="chip-modo-comercial" />} />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <ChipBinario texto="Correo" activo={u.correoVerificado} />
                  <ChipBinario texto="Teléfono" activo={u.telefonoVerificado} />
                  {u.autenticadoPorGoogle && <ChipBinario texto="Google" activo />}
                  {u.autenticadoPorFacebook && <ChipBinario texto="Facebook" activo />}
                  <ChipBinario texto="2FA app" activo={u.dobleFactorHabilitado} />
                  {u.panel2faHabilitado && <ChipBinario texto="2FA Panel" activo />}
                </div>
              </Seccion>

              <Seccion titulo="Actividad" icono={Clock}>
                <Dato etiqueta="Última conexión" valor={fecha(u.ultimaConexion)} />
                <Dato etiqueta="Registro" valor={fecha(u.createdAt)} />
                <Dato
                  etiqueta="Reputación"
                  valor={u.totalCalificaciones > 0 ? `${u.calificacionPromedio} ★ (${u.totalCalificaciones})` : 'Sin calificaciones'}
                />
              </Seccion>
            </div>
          </div>
        </div>

        {/* Footer: soporte (super + gerente) y moderación (solo super). El vendedor no llega aquí. */}
        {puedeActuar && (
          <div className="flex shrink-0 items-center gap-2 border-t border-borde bg-superficie-2 px-5 py-3.5">
            <button
              type="button"
              data-testid="ficha-usuario-codigo-acceso"
              onClick={() => setDialogo('codigo-acceso')}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3 py-2.5 text-[13px] font-semibold text-marca-contraste transition hover:brightness-105"
            >
              <KeyRound size={16} /> Código de acceso
            </button>
            <div className="ml-auto flex items-center gap-2">
              {bloqueado && (
                <Tooltip text="Desbloquear intentos" className="shrink-0">
                  <button
                    type="button"
                    data-testid="ficha-usuario-desbloquear"
                    onClick={() => desbloquear.mutate(u.id)}
                    disabled={desbloquear.isPending}
                    aria-label="Desbloquear intentos"
                    className="grid h-10 w-10 place-items-center rounded-[10px] border border-borde-fuerte bg-superficie text-texto transition hover:bg-marca-suave disabled:opacity-50"
                  >
                    <Unlock size={16} />
                  </button>
                </Tooltip>
              )}
              <Tooltip text="Corregir correo" className="shrink-0">
                <button
                  type="button"
                  data-testid="ficha-usuario-editar-correo"
                  onClick={() => setDialogo('editar-correo')}
                  aria-label="Corregir correo"
                  className="grid h-10 w-10 place-items-center rounded-[10px] border border-borde-fuerte bg-superficie text-texto transition hover:bg-marca-suave"
                >
                  <Mail size={16} />
                </button>
              </Tooltip>
              {esSuperadmin && !esEquipo && (
                suspendido ? (
                  <Tooltip text="Reactivar cuenta" className="shrink-0">
                    <button
                      type="button"
                      data-testid="ficha-usuario-reactivar"
                      onClick={() => setDialogo('reactivar')}
                      aria-label="Reactivar cuenta"
                      className="grid h-10 w-10 place-items-center rounded-[10px] border border-borde-fuerte bg-superficie text-texto transition hover:bg-marca-suave"
                    >
                      <PlayCircle size={16} />
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip text="Suspender cuenta" className="shrink-0">
                    <button
                      type="button"
                      data-testid="ficha-usuario-suspender"
                      onClick={() => setDialogo('suspender')}
                      aria-label="Suspender cuenta"
                      className="grid h-10 w-10 place-items-center rounded-[10px] border border-peligro/40 bg-superficie text-peligro transition hover:bg-peligro-suave"
                    >
                      <Ban size={16} />
                    </button>
                  </Tooltip>
                )
              )}
            </div>
          </div>
        )}
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
    />
    </>
  );
}

export default FichaUsuario;
