/**
 * DialogosCategorias.tsx
 * ======================
 * Diálogos del módulo Categorías (Panel · solo superadmin), reusando ModalAdaptativo:
 *   - DialogoCategoria      → crear/editar una categoría (solo nombre).
 *   - DialogoSubcategoria   → crear/editar una subcategoría (solo nombre).
 *   - DialogoDisponibilidad → gestionar en qué ciudades aparece una categoría o
 *                             subcategoría (multi-select + toggle "todas/global").
 *
 * El `cargando` lo controla el padre (la mutación); el padre cierra en el onSuccess.
 *
 * Ubicación: apps/admin/src/components/categorias/DialogosCategorias.tsx
 */

import { useEffect, useMemo, useState } from 'react';
import { Tags, FolderTree, MapPin, Check, Search, Globe2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useCiudadesLista } from '../../hooks/queries/useCiudadesAdmin';
import type { CategoriaAdmin, SubcategoriaAdmin, CiudadRef } from '../../services/categoriasService';

const INPUT_CLASS =
  'w-full rounded-[10px] border border-campo-borde bg-campo px-3 py-2 text-[13px] text-texto outline-none transition placeholder:text-texto-4 focus:border-marca focus:bg-superficie focus:[box-shadow:0_0_0_3px_var(--panel-ring)]';
const BTN_CANCELAR =
  'rounded-[10px] border border-borde-fuerte bg-superficie px-3.5 py-2 text-[13px] font-semibold text-texto transition hover:bg-marca-suave disabled:opacity-50';
const BTN_GUARDAR =
  'inline-flex items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste transition disabled:cursor-not-allowed disabled:opacity-50';

// =============================================================================
// Campo Nombre (compartido por categoría y subcategoría)
// =============================================================================

function CampoNombre({
  nombre,
  setNombre,
  placeholder,
  testidPrefix,
}: {
  nombre: string;
  setNombre: (v: string) => void;
  placeholder: string;
  testidPrefix: string;
}) {
  return (
    <>
      <label className="mb-1.5 block text-[12.5px] font-semibold text-texto-2">Nombre</label>
      <input
        data-testid={`${testidPrefix}-nombre`}
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder={placeholder}
        className={INPUT_CLASS}
        maxLength={50}
        autoFocus
      />
    </>
  );
}

// =============================================================================
// DialogoCategoria
// =============================================================================

interface DialogoCategoriaProps {
  abierto: boolean;
  modo: 'crear' | 'editar';
  categoria?: CategoriaAdmin | null;
  cargando: boolean;
  onCerrar: () => void;
  onGuardar: (datos: { nombre: string }) => void;
}

export function DialogoCategoria({ abierto, modo, categoria, cargando, onCerrar, onGuardar }: DialogoCategoriaProps) {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (abierto) setNombre(modo === 'editar' ? categoria?.nombre ?? '' : '');
  }, [abierto, modo, categoria]);

  const esEditar = modo === 'editar';
  const invalido = nombre.trim().length < 2;

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="sm"
      titulo={esEditar ? 'Editar categoría' : 'Nueva categoría'}
      iconoTitulo={<Tags size={18} className="text-marca" />}
      discriminador="categoria-editar"
    >
      <div className="p-5">
        <CampoNombre nombre={nombre} setNombre={setNombre} placeholder="Ej. Bienes Raíces" testidPrefix="categoria" />
        {!esEditar && (
          <p className="mt-4 rounded-[10px] bg-marca-suave px-3 py-2 text-[12px] text-texto-3">
            La categoría nace disponible en <strong>todas las ciudades</strong>. Después puedes acotarla con “Disponibilidad”.
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={cargando} className={BTN_CANCELAR}>Cancelar</button>
          <button
            type="button"
            data-testid="categoria-guardar"
            onClick={() => onGuardar({ nombre: nombre.trim() })}
            disabled={invalido || cargando}
            className={BTN_GUARDAR}
          >
            {cargando ? 'Guardando…' : esEditar ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// DialogoSubcategoria
// =============================================================================

interface DialogoSubcategoriaProps {
  abierto: boolean;
  modo: 'crear' | 'editar';
  categoriaNombre: string;
  subcategoria?: SubcategoriaAdmin | null;
  cargando: boolean;
  onCerrar: () => void;
  onGuardar: (datos: { nombre: string }) => void;
}

export function DialogoSubcategoria({ abierto, modo, categoriaNombre, subcategoria, cargando, onCerrar, onGuardar }: DialogoSubcategoriaProps) {
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (abierto) setNombre(modo === 'editar' ? subcategoria?.nombre ?? '' : '');
  }, [abierto, modo, subcategoria]);

  const esEditar = modo === 'editar';
  const invalido = nombre.trim().length < 2;

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="sm"
      titulo={esEditar ? 'Editar subcategoría' : 'Nueva subcategoría'}
      iconoTitulo={<FolderTree size={18} className="text-marca" />}
      discriminador="subcategoria-editar"
    >
      <div className="p-5">
        <p className="mb-3 text-[12px] text-texto-3">
          En la categoría <strong className="text-texto-2">{categoriaNombre}</strong>
        </p>
        <CampoNombre nombre={nombre} setNombre={setNombre} placeholder="Ej. Inmobiliarias" testidPrefix="subcategoria" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={cargando} className={BTN_CANCELAR}>Cancelar</button>
          <button
            type="button"
            data-testid="subcategoria-guardar"
            onClick={() => onGuardar({ nombre: nombre.trim() })}
            disabled={invalido || cargando}
            className={BTN_GUARDAR}
          >
            {cargando ? 'Guardando…' : esEditar ? 'Guardar' : 'Crear'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// DialogoDisponibilidad (ciudades por categoría/subcategoría)
// =============================================================================

interface DialogoDisponibilidadProps {
  abierto: boolean;
  titulo: string;
  /** Ciudades actualmente asignadas (vacío = global). */
  ciudadesActuales: CiudadRef[];
  /** Si se gestiona una subcategoría de una categoría ACOTADA, solo se pueden elegir
   *  estas ciudades (las de su categoría). undefined = sin restricción. */
  ciudadesPermitidas?: CiudadRef[];
  cargando: boolean;
  onCerrar: () => void;
  onGuardar: (ciudadIds: string[]) => void;
}

export function DialogoDisponibilidad({
  abierto,
  titulo,
  ciudadesActuales,
  ciudadesPermitidas,
  cargando,
  onCerrar,
  onGuardar,
}: DialogoDisponibilidadProps) {
  // Catálogo de ciudades activas (para elegir). Si hay restricción, se usa esa lista.
  const { data: catalogo = [] } = useCiudadesLista({ activa: 'activas' });
  const [global, setGlobal] = useState(true);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (abierto) {
      setGlobal(ciudadesActuales.length === 0);
      setSeleccion(new Set(ciudadesActuales.map((c) => c.id)));
      setBusqueda('');
    }
  }, [abierto, ciudadesActuales]);

  const opciones = useMemo(() => {
    const base = ciudadesPermitidas && ciudadesPermitidas.length
      ? ciudadesPermitidas.map((c) => ({ id: c.id, nombre: c.nombre, estado: '' }))
      : catalogo.map((c) => ({ id: c.id, nombre: c.nombre, estado: c.estado }));
    const q = busqueda.trim().toLowerCase();
    const filtradas = q ? base.filter((c) => `${c.nombre} ${c.estado}`.toLowerCase().includes(q)) : base;
    return filtradas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [catalogo, ciudadesPermitidas, busqueda]);

  const restringido = !!(ciudadesPermitidas && ciudadesPermitidas.length);

  const toggle = (id: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const guardar = () => {
    onGuardar(global ? [] : Array.from(seleccion));
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="md"
      titulo={titulo}
      iconoTitulo={<MapPin size={18} className="text-marca" />}
      discriminador="categoria-ciudades"
      alturaMaxima="lg"
    >
      <div className="flex max-h-[70vh] flex-col p-5">
        {/* Toggle global */}
        <button
          type="button"
          data-testid="disponibilidad-global"
          onClick={() => setGlobal((v) => !v)}
          className={`flex items-center justify-between gap-3 rounded-[12px] border px-3.5 py-3 text-left transition ${
            global ? 'border-marca bg-marca-suave' : 'border-borde hover:bg-marca-suave'
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Globe2 size={18} className={global ? 'text-marca' : 'text-texto-3'} />
            <span className="text-[13px] font-semibold text-texto">Disponible en todas las ciudades</span>
          </span>
          <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${global ? 'bg-marca' : 'bg-borde-fuerte'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${global ? 'left-[22px]' : 'left-0.5'}`} />
          </span>
        </button>

        {!global && (
          <>
            <p className="mt-3 text-[12px] text-texto-3">
              {restringido
                ? 'Limitado a las ciudades donde su categoría está disponible.'
                : 'Elige las ciudades donde aparecerá.'}
            </p>
            {/* Buscador */}
            <div className="relative mt-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-4" />
              <input
                data-testid="disponibilidad-buscar"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar ciudad…"
                className={`${INPUT_CLASS} pl-9`}
              />
            </div>
            {/* Lista de ciudades */}
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-[10px] border border-borde">
              {opciones.length === 0 ? (
                <p className="px-3 py-6 text-center text-[12.5px] text-texto-4">Sin ciudades.</p>
              ) : (
                opciones.map((c) => {
                  const sel = seleccion.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-testid={`disponibilidad-ciudad-${c.id}`}
                      onClick={() => toggle(c.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-marca-suave"
                    >
                      <span className="min-w-0 truncate text-[13px] text-texto">
                        {c.nombre}
                        {c.estado && <span className="ml-1.5 text-[11px] text-texto-4">{c.estado}</span>}
                      </span>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition ${sel ? 'border-marca bg-marca' : 'border-borde-fuerte'}`}>
                        {sel && <Check size={13} className="text-marca-contraste" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <p className="mt-2 text-[12px] text-texto-4">{seleccion.size} ciudad(es) seleccionada(s)</p>
          </>
        )}

        <div className="mt-5 flex shrink-0 justify-end gap-2">
          <button type="button" onClick={onCerrar} disabled={cargando} className={BTN_CANCELAR}>Cancelar</button>
          <button
            type="button"
            data-testid="disponibilidad-guardar"
            onClick={guardar}
            disabled={cargando || (!global && seleccion.size === 0)}
            className={BTN_GUARDAR}
          >
            {cargando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}
