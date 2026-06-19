/**
 * DialogoEditarCiudad.tsx
 * =======================
 * Editar los datos de una ciudad del catálogo: nombre, estado e importancia (orden en
 * el buscador). Reusa ModalAdaptativo. El backend re-genera el slug y rechaza duplicados;
 * las coordenadas se ajustan desde el mapa (alta), no aquí. El `cargando` lo controla el
 * padre (la mutación), que cierra el diálogo en el onSuccess.
 *
 * Ubicación: apps/admin/src/components/ciudades/DialogoEditarCiudad.tsx
 */

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import type { CiudadCatalogo } from '../../services/ciudadesService';

interface DialogoEditarCiudadProps {
  abierto: boolean;
  ciudad: CiudadCatalogo | null;
  cargando: boolean;
  onCerrar: () => void;
  onGuardar: (datos: { nombre: string; estado: string; importancia: number }) => void;
}

export function DialogoEditarCiudad({ abierto, ciudad, cargando, onCerrar, onGuardar }: DialogoEditarCiudadProps) {
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState('');
  const [importancia, setImportancia] = useState('0');

  useEffect(() => {
    if (abierto && ciudad) {
      setNombre(ciudad.nombre);
      setEstado(ciudad.estado);
      setImportancia(String(ciudad.importancia ?? 0));
    }
  }, [abierto, ciudad]);

  const imp = Number(importancia);
  const invalido = nombre.trim().length < 2 || estado.trim().length < 2 || !Number.isInteger(imp) || imp < 0 || imp > 100;

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      centrado
      ancho="sm"
      titulo="Editar ciudad"
      iconoTitulo={<MapPin size={18} className="text-marca" />}
      discriminador="ciudades-editar"
    >
      <div className="p-5">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Nombre</label>
        <input
          data-testid="editar-ciudad-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Hermosillo"
          className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
        />

        <label className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-texto-2">Estado</label>
        <input
          data-testid="editar-ciudad-estado"
          type="text"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          placeholder="Ej. Sonora"
          className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
        />

        <label className="mb-1.5 mt-4 block text-[12.5px] font-semibold text-texto-2">
          Importancia <span className="font-normal text-texto-4">(0–100, orden en el buscador)</span>
        </label>
        <input
          data-testid="editar-ciudad-importancia"
          type="number"
          min={0}
          max={100}
          value={importancia}
          onChange={(e) => setImportancia(e.target.value)}
          className="w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]"
        />

        <p className="mt-3 text-[12px] text-texto-4">Las coordenadas se ajustan desde el mapa (al dar de alta).</p>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={cargando} className="rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50">
            Cancelar
          </button>
          <button
            type="button"
            data-testid="editar-ciudad-guardar"
            onClick={() => onGuardar({ nombre: nombre.trim(), estado: estado.trim(), importancia: imp })}
            disabled={invalido || cargando}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

export default DialogoEditarCiudad;
