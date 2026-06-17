/**
 * FichaMiembro.tsx
 * =================
 * Ficha de una cuenta de equipo (VER, solo lectura) — calcada de FichaUsuario. Usa el
 * ModalAdaptativo base (centrado en escritorio, bottom-sheet en móvil). Abre al instante con
 * un placeholder de la fila + prefetch en hover; React Query rellena.
 *
 * Layout: cabecera (avatar + nombre/correo + badge de acceso + cerrar) / cuerpo de UNA card
 * "protagonista": encabezado con el acceso al Panel + chips, y debajo una lista corrida
 * (Identidad · Rol y alcance · Actividad).
 *
 * La ficha YA tiene su menú de acciones (editar datos, reasignar región, revocar/reactivar acceso),
 * que se muestran según el rol de quien mira y el del miembro.
 *
 * Ubicación: apps/admin/src/components/equipo/FichaMiembro.tsx
 */

import { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Copy, Check, Ban, RotateCcw, Pencil, Globe } from 'lucide-react';
import { useMiembroEquipo, useRevocarAcceso, useReactivarAcceso } from '../../hooks/queries/useEquipoAdmin';
import type { MiembroEquipoFila, MiembroEquipo } from '../../services/equipoService';
import { useAuthPanelStore } from '../../stores/useAuthPanelStore';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { AccionesFicha, type AccionFicha } from '../ui/AccionesFicha';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';
import { Dato, fecha } from '../negocios/FichaNegocio';
import { AvatarUsuario } from '../usuarios/avataresUsuario';
import { metaAcceso, rolLabel } from './estadoAcceso';
import { DialogoEditarDatos } from './DialogoEditarDatos';
import { DialogoReasignarRegion } from './DialogoReasignarRegion';

interface FichaMiembroProps {
  /** Fila que se abrió: sirve de placeholder para mostrar la ficha al instante. */
  previo: MiembroEquipoFila;
  onCerrar: () => void;
}

/** Arma una ficha parcial con lo que ya trae la fila (el resto se rellena al llegar la respuesta). */
function placeholderDesdeFila(f: MiembroEquipoFila): MiembroEquipo {
  return {
    ...f,
    nombreSolo: null,
    apellidos: null,
    telefono: null,
    correoVerificado: false,
    panel2faHabilitado: false,
    regionId: null,
    negociosAtribuidos: 0,
  };
}

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
      className="txt-badge inline-flex items-center gap-1.5 rounded-full border border-borde bg-superficie px-2 py-0.5 text-[11.5px] font-medium text-texto-2"
    >
      <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: activo ? 'var(--panel-ok)' : 'var(--panel-text-4)' }} />
      {texto}
    </span>
  );
}

export function FichaMiembro({ previo, onCerrar }: FichaMiembroProps) {
  const { data, isError } = useMiembroEquipo(previo.id, placeholderDesdeFila(previo));
  const m = data ?? placeholderDesdeFila(previo);
  const [verAvatar, setVerAvatar] = useState(false);

  const acceso = metaAcceso(m);
  const puedeEntrar = m.accesoActivo;
  const esVendedor = m.rolEquipo === 'vendedor';

  // Acciones (Fase 2). La UI solo refleja; el backend valida el alcance. Permisos:
  //  - Editar datos: super (cualquiera) · gerente (solo sus vendedores).
  //  - Reasignar región: solo super, sobre gerentes activos.
  //  - Revocar/Reactivar: vendedor → super o gerente (su región); gerente → solo super.
  const rolPanel = useAuthPanelStore((st) => st.usuario?.rolEquipo);
  const esSuper = rolPanel === 'superadmin';
  const revocado = m.revocado;
  const esGerente = m.rolEquipo === 'gerente';
  const esVendedorActivo = esVendedor && !revocado;
  const esGerenteActivo = esGerente && !revocado;
  const revocar = useRevocarAcceso();
  const reactivar = useReactivarAcceso();
  const [dialogo, setDialogo] = useState<null | 'revocar' | 'reactivar' | 'editar' | 'region'>(null);
  const cerrarDialogo = () => setDialogo(null);

  const puedeEditarDatos = esSuper || (rolPanel === 'gerente' && esVendedor);
  const puedeReasignar = esSuper && esGerenteActivo;
  const puedeRevocar = (esVendedorActivo && (esSuper || rolPanel === 'gerente')) || (esGerenteActivo && esSuper);
  const puedeReactivar = revocado && (esVendedor ? esSuper || rolPanel === 'gerente' : esSuper);

  const acciones: AccionFicha[] = [];
  if (puedeEditarDatos) {
    acciones.push({ icono: Pencil, etiqueta: 'Editar datos', color: 'marca', testid: 'ficha-miembro-editar', onClick: () => setDialogo('editar') });
  }
  if (puedeReasignar) {
    acciones.push({ icono: Globe, etiqueta: 'Reasignar región', color: 'marca', testid: 'ficha-miembro-region', onClick: () => setDialogo('region') });
  }
  if (puedeReactivar) {
    acciones.push({ icono: RotateCcw, etiqueta: 'Reactivar acceso', color: 'ok', testid: 'ficha-miembro-reactivar', onClick: () => setDialogo('reactivar') });
  } else if (puedeRevocar) {
    acciones.push({ icono: Ban, etiqueta: 'Revocar acceso', color: 'peligro', testid: 'ficha-miembro-revocar', onClick: () => setDialogo('revocar') });
  }

  // Razones por las que NO puede entrar al Panel (derivadas de los flags).
  const razones: string[] = [];
  if (m.estadoCuenta === 'suspendido') razones.push('Cuenta suspendida');
  else if (m.estadoCuenta === 'inactivo') razones.push('Cuenta inactiva');
  if (m.pendienteActivar) razones.push('Aún no ha creado su contraseña');

  const alcanceTexto =
    m.rolEquipo === 'superadmin' ? 'Toda la plataforma' : m.regionNombre ?? '—';

  return (
    <>
    <ModalAdaptativo
      abierto
      onCerrar={onCerrar}
      mostrarHeader={false}
      sinScrollInterno
      ancho="lg"
      alturaMaxima="xl"
      discriminador="ficha-miembro"
    >
      <div className="flex h-full min-h-0 flex-col" data-testid="ficha-miembro">
        {/* Cabecera */}
        <div className="flex shrink-0 items-center gap-3 border-b border-borde px-5 py-4">
          <button
            type="button"
            data-testid="ficha-miembro-avatar"
            onClick={() => setVerAvatar((v) => !v)}
            aria-label="Avatar"
            className="shrink-0 rounded-full transition hover:opacity-90 focus:outline-none focus:[box-shadow:0_0_0_3px_var(--panel-hover)]"
          >
            <AvatarUsuario nombre={m.nombre || m.correo} avatarUrl={null} tam={46} />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span className="truncate text-[17px] font-bold tracking-[-0.2px] text-texto" data-testid="ficha-miembro-nombre">
              {m.nombre || '(Sin nombre)'}
            </span>
            <span className="text-[12.5px] font-medium text-marca">{rolLabel(m.rolEquipo)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AccionesFicha acciones={acciones} testidMenu="ficha-miembro-acciones-menu" />
            <button
              type="button"
              data-testid="ficha-miembro-cerrar"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] text-texto-3 transition hover:bg-marca-suave hover:text-marca"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Cuerpo — una sola card "protagonista" */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:overflow-visible">
          {isError && (
            <div className="mb-3 rounded-[10px] border border-borde px-3 py-2 text-center text-[12px] text-peligro">
              No se pudo cargar el detalle completo.
            </div>
          )}

          <div className="overflow-hidden rounded-[12px] border border-borde bg-superficie-2">
            {/* Encabezado protagonista: acceso al Panel + chips */}
            <div className="border-b border-borde px-4 py-3.5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-texto-4">Acceso al Panel</p>
              <div className="flex items-start gap-2.5">
                {puedeEntrar ? (
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-ok" />
                ) : (
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-peligro" />
                )}
                <div className="min-w-0">
                  <p
                    data-testid="ficha-miembro-acceso"
                    className="text-[18px] font-semibold leading-tight tracking-tight"
                    style={{ color: acceso.color }}
                  >
                    {puedeEntrar ? 'Puede entrar al Panel' : acceso.etiqueta}
                  </p>
                  {!puedeEntrar && razones.length > 0 && (
                    <ul className="mt-1 list-disc pl-4 text-[12px] text-texto-2">
                      {razones.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <ChipBinario texto={m.pendienteActivar ? 'Sin contraseña' : 'Con contraseña'} activo={!m.pendienteActivar} testid="chip-contrasena" />
                <ChipBinario texto={m.correoVerificado ? 'Correo verificado' : 'Correo sin verificar'} activo={m.correoVerificado} testid="chip-correo-verif" />
                {m.panel2faHabilitado && <ChipBinario texto="2FA Panel" activo testid="chip-2fa-panel" />}
              </div>
            </div>

            {/* Lista corrida: Identidad · Rol y alcance · Actividad */}
            <div className="px-4 py-1.5">
              <DatoCopiable etiqueta="Correo" valor={m.correo} testid="ficha-miembro-copiar-correo" />
              <Dato etiqueta="Teléfono" valor={m.telefono ?? '—'} />
              <DatoCopiable etiqueta="ID de cuenta" valor={m.id} mono testid="ficha-miembro-copiar-id" />

              <div className="my-1 border-t border-borde/60" />
              <Dato etiqueta="Rol" valor={rolLabel(m.rolEquipo)} />
              <Dato etiqueta="Alcance" valor={alcanceTexto} />
              {esVendedor && <Dato etiqueta="Ciudades" valor={m.ciudades ?? '—'} />}
              {esVendedor && m.linkReferido && (
                <DatoCopiable etiqueta="Link de registro" valor={m.linkReferido} testid="ficha-miembro-copiar-link" />
              )}
              {esVendedor && (
                <Dato etiqueta="Estado como vendedor" valor={m.estadoEmbajador ?? '—'} />
              )}
              {esVendedor && (
                <Dato
                  etiqueta="Negocios atribuidos"
                  valor={`${m.negociosAtribuidos} ${m.negociosAtribuidos === 1 ? 'negocio' : 'negocios'}`}
                />
              )}

              <div className="my-1 border-t border-borde/60" />
              <Dato etiqueta="Último acceso al Panel" valor={fecha(m.ultimoAccesoPanel)} />
              <Dato etiqueta="Registro" valor={fecha(m.createdAt)} />
            </div>
          </div>

          {esVendedor && (
            <p className="mt-2.5 px-1 text-[11.5px] leading-relaxed text-texto-4" data-testid="ficha-miembro-nota-cartera">
              Su cartera, comisiones y cortes de efectivo se gestionan en “Vendedores y comisiones”.
            </p>
          )}

          {verAvatar && (
            <p className="mt-2 px-1 text-[11px] text-texto-4">
              Esta cuenta no tiene foto de perfil personal todavía.
            </p>
          )}
        </div>
      </div>
    </ModalAdaptativo>

    {dialogo === 'editar' && (
      <DialogoEditarDatos
        abierto
        onCerrar={cerrarDialogo}
        miembroId={m.id}
        inicial={{ nombre: m.nombreSolo, apellidos: m.apellidos, telefono: m.telefono, correo: m.correo }}
        correoEditable={m.pendienteActivar}
      />
    )}
    {dialogo === 'region' && (
      <DialogoReasignarRegion
        abierto
        onCerrar={cerrarDialogo}
        miembroId={m.id}
        nombre={m.nombre}
        regionActualNombre={m.regionNombre}
      />
    )}
    {dialogo === 'revocar' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Revocar acceso"
        variante="danger"
        mensaje={
          esGerente
            ? 'El gerente dejará de entrar al Panel de inmediato. Su región quedará sin gerente hasta que asignes otro. Seguirá visible aquí como “Sin acceso” y podrás reactivarlo.'
            : 'El vendedor dejará de entrar al Panel de inmediato y su perfil de vendedor quedará inactivo. Su atribución de negocios se conserva. Seguirá visible aquí como “Sin acceso” y podrás reactivarlo.'
        }
        textoConfirmar="Revocar acceso"
        cargando={revocar.isPending}
        onConfirmar={() => revocar.mutate(m.id, { onSuccess: () => { cerrarDialogo(); onCerrar(); } })}
      />
    )}
    {dialogo === 'reactivar' && (
      <DialogoConfirmar
        abierto
        onCerrar={cerrarDialogo}
        titulo="Reactivar acceso"
        mensaje={
          esGerente
            ? 'El gerente volverá a tener acceso al Panel, con su región a cargo.'
            : 'El vendedor volverá a tener acceso al Panel, con su código de referido y sus ciudades. Podrá iniciar sesión de nuevo.'
        }
        textoConfirmar="Reactivar acceso"
        cargando={reactivar.isPending}
        onConfirmar={() => reactivar.mutate(m.id, { onSuccess: () => { cerrarDialogo(); onCerrar(); } })}
      />
    )}
    </>
  );
}

export default FichaMiembro;
