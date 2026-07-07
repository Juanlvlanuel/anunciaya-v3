/**
 * DialogoCategoria.tsx
 * ====================
 * Crear / editar una categoría del Centro de Ayuda.
 *
 * Ubicación: apps/admin/src/components/ayuda/DialogoCategoria.tsx
 */

import { useEffect, useState } from 'react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useCrearCategoria, useEditarCategoria } from '../../hooks/queries/useAyudaAdmin';
import {
  SECCIONES,
  seccionDeCategoria,
  appAudDeSeccion,
  type CategoriaAdmin,
  type SeccionAyuda,
} from '../../services/ayudaService';

const CAMPO =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2.5 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie';
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-texto-2';
const BTN_PRI =
  'rounded-[10px] bg-marca px-4 py-2 text-[13px] font-semibold text-marca-contraste hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SEC =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto hover:bg-marca-suave';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  categoria?: CategoriaAdmin | null;
}

export function DialogoCategoria({ abierto, onCerrar, categoria }: Props) {
  const crear = useCrearCategoria();
  const editar = useEditarCategoria();
  const esEdicion = !!categoria;

  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('');
  const [seccion, setSeccion] = useState<SeccionAyuda>('anunciaya');
  const [orden, setOrden] = useState('0');
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (!abierto) return;
    setNombre(categoria?.nombre ?? '');
    setIcono(categoria?.icono ?? '');
    setSeccion(categoria ? seccionDeCategoria(categoria.app, categoria.audiencia) : 'anunciaya');
    setOrden(String(categoria?.orden ?? 0));
    setActivo(categoria?.activo ?? true);
  }, [abierto, categoria]);

  const cargando = crear.isPending || editar.isPending;
  const valido = nombre.trim().length >= 2;

  const guardar = () => {
    if (!valido) return;
    const { app, audiencia } = appAudDeSeccion(seccion);
    const input = {
      nombre: nombre.trim(),
      icono: icono.trim() || null,
      app,
      audiencia,
      orden: Number(orden) || 0,
      activo,
    };
    if (esEdicion) editar.mutate({ id: categoria!.id, input }, { onSuccess: onCerrar });
    else crear.mutate(input, { onSuccess: onCerrar });
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={esEdicion ? 'Editar categoría' : 'Nueva categoría'}
      ancho="lg"
      discriminador="dialogo-categoria-ayuda"
    >
      <div className="space-y-4 p-5" data-testid="dialogo-categoria-ayuda">
        <div>
          <label className={LABEL}>Nombre</label>
          <input className={CAMPO} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. CardYA" />
        </div>
        <div>
          <label className={LABEL}>Sección</label>
          <select
            className={CAMPO}
            value={seccion}
            onChange={(e) => setSeccion(e.target.value as SeccionAyuda)}
            data-testid="categoria-seccion"
          >
            {SECCIONES.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11.5px] leading-snug text-texto-4">
            <b className="font-semibold text-texto-3">AnunciaYA</b> se muestra a usuarios personales y comerciales.{' '}
            <b className="font-semibold text-texto-3">Business Studio</b> y{' '}
            <b className="font-semibold text-texto-3">ScanYA</b>, solo a comerciales.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Icono (opcional)</label>
            <input className={CAMPO} value={icono} onChange={(e) => setIcono(e.target.value)} placeholder="ph:gift-fill" />
          </div>
          <div>
            <label className={LABEL}>Orden</label>
            <input className={CAMPO} type="number" value={orden} onChange={(e) => setOrden(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] font-medium text-texto">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Activa (visible en el Centro de Ayuda)
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={BTN_SEC} onClick={onCerrar}>
            Cancelar
          </button>
          <button type="button" className={BTN_PRI} onClick={guardar} disabled={!valido || cargando}>
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}
