/**
 * SeccionAyuda.tsx
 * ================
 * Módulo "Ayuda y Tutoriales" del Panel (solo superadmin). Lista de categorías
 * con sus tutoriales + métricas, y gestión (crear/editar/borrar) vía diálogos.
 *
 * Ubicación: apps/admin/src/components/ayuda/SeccionAyuda.tsx
 */

import { useState, type ReactNode } from 'react';
import { Eye, ThumbsUp, ThumbsDown, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useAyudaLista,
  useBorrarCategoria,
  useBorrarArticulo,
} from '../../hooks/queries/useAyudaAdmin';
import type { CategoriaAdmin, ArticuloAdmin } from '../../services/ayudaService';
import { DialogoCategoria } from './DialogoCategoria';
import { DialogoArticulo } from './DialogoArticulo';
import { DialogoConfirmar } from '../ui/DialogoConfirmar';

const APP_LABEL: Record<string, string> = { anunciaya: 'AnunciaYA', scanya: 'ScanYA' };
const AUD_LABEL: Record<string, string> = { cliente: 'Cliente', comerciante: 'Comerciante' };

const BTN_NUEVO =
  'inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-marca px-3.5 py-2 text-[13px] font-semibold text-marca-contraste hover:brightness-105';
const BTN_ICONO = 'grid h-7 w-7 place-items-center rounded-[8px] text-texto-3 hover:bg-superficie-2 hover:text-texto';

export function SeccionAyuda() {
  const { data, isLoading } = useAyudaLista();
  const borrarCat = useBorrarCategoria();
  const borrarArt = useBorrarArticulo();
  const cats = data ?? [];

  const [dlgCat, setDlgCat] = useState<{ categoria: CategoriaAdmin | null } | null>(null);
  const [dlgArt, setDlgArt] = useState<{ articulo: ArticuloAdmin | null; categoriaId?: string } | null>(null);
  const [confirmar, setConfirmar] = useState<{ tipo: 'categoria' | 'articulo'; id: string; nombre: string } | null>(null);

  const onConfirmarBorrado = () => {
    if (!confirmar) return;
    const onSuccess = () => setConfirmar(null);
    if (confirmar.tipo === 'categoria') borrarCat.mutate(confirmar.id, { onSuccess });
    else borrarArt.mutate(confirmar.id, { onSuccess });
  };

  return (
    <div className="flex h-full flex-col gap-4 p-5" data-testid="seccion-ayuda">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-texto">Ayuda y Tutoriales</h1>
          <p className="text-[13px] text-texto-3">Categorías y videos tutoriales del Centro de Ayuda.</p>
        </div>
        <button type="button" className={BTN_NUEVO} onClick={() => setDlgCat({ categoria: null })}>
          <Plus className="h-4 w-4" /> Nueva categoría
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-texto-3">Cargando…</div>
      ) : cats.length === 0 ? (
        <div className="rounded-[12px] border border-borde bg-superficie p-8 text-center text-[13px] text-texto-3">
          Aún no hay categorías. Crea la primera con “Nueva categoría”.
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto">
          {cats.map((cat) => (
            <TarjetaCategoria
              key={cat.id}
              categoria={cat}
              onEditar={() => setDlgCat({ categoria: cat })}
              onBorrar={() => setConfirmar({ tipo: 'categoria', id: cat.id, nombre: cat.nombre })}
              onNuevoArticulo={() => setDlgArt({ articulo: null, categoriaId: cat.id })}
              onEditarArticulo={(art) => setDlgArt({ articulo: art })}
              onBorrarArticulo={(art) => setConfirmar({ tipo: 'articulo', id: art.id, nombre: art.pregunta })}
            />
          ))}
        </div>
      )}

      <DialogoCategoria abierto={!!dlgCat} onCerrar={() => setDlgCat(null)} categoria={dlgCat?.categoria} />
      <DialogoArticulo
        abierto={!!dlgArt}
        onCerrar={() => setDlgArt(null)}
        categorias={cats}
        articulo={dlgArt?.articulo}
        categoriaIdInicial={dlgArt?.categoriaId}
      />
      <DialogoConfirmar
        abierto={!!confirmar}
        onCerrar={() => setConfirmar(null)}
        titulo={confirmar?.tipo === 'categoria' ? 'Eliminar categoría' : 'Eliminar tutorial'}
        mensaje={
          confirmar
            ? `¿Eliminar "${confirmar.nombre}"?${confirmar.tipo === 'categoria' ? ' Se eliminarán también sus tutoriales.' : ''}`
            : ''
        }
        textoConfirmar="Eliminar"
        variante="danger"
        cargando={borrarCat.isPending || borrarArt.isPending}
        onConfirmar={onConfirmarBorrado}
      />
    </div>
  );
}

function TarjetaCategoria({
  categoria,
  onEditar,
  onBorrar,
  onNuevoArticulo,
  onEditarArticulo,
  onBorrarArticulo,
}: {
  categoria: CategoriaAdmin;
  onEditar: () => void;
  onBorrar: () => void;
  onNuevoArticulo: () => void;
  onEditarArticulo: (a: ArticuloAdmin) => void;
  onBorrarArticulo: (a: ArticuloAdmin) => void;
}) {
  const n = categoria.articulos.length;
  return (
    <div className="rounded-[12px] border border-borde bg-superficie">
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-texto">{categoria.nombre}</span>
          {!categoria.activo && <Badge>Inactiva</Badge>}
          <Badge>{APP_LABEL[categoria.app] ?? categoria.app}</Badge>
          <Badge>{AUD_LABEL[categoria.audiencia] ?? categoria.audiencia}</Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 text-[12px] text-texto-3">
            {n} video{n === 1 ? '' : 's'}
          </span>
          <button type="button" className={BTN_ICONO} title="Nuevo tutorial" onClick={onNuevoArticulo}>
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" className={BTN_ICONO} title="Editar categoría" onClick={onEditar}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" className={BTN_ICONO} title="Eliminar categoría" onClick={onBorrar}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {n > 0 && (
        <div className="divide-y divide-borde">
          {categoria.articulos.map((art) => (
            <FilaArticulo
              key={art.id}
              articulo={art}
              onEditar={() => onEditarArticulo(art)}
              onBorrar={() => onBorrarArticulo(art)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilaArticulo({
  articulo,
  onEditar,
  onBorrar,
}: {
  articulo: ArticuloAdmin;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[13.5px] font-medium text-texto">{articulo.pregunta}</span>
        {articulo.publicado ? (
          <span className="shrink-0 rounded-full bg-ok-suave px-2 py-0.5 text-[11px] font-semibold text-ok">Publicado</span>
        ) : (
          <span className="shrink-0 rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-semibold text-texto-3">Borrador</span>
        )}
        {!articulo.videoUrl && <span className="shrink-0 text-[11px] text-texto-4">sin video</span>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-3 text-[12px] text-texto-3">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {articulo.vistas}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" /> {articulo.utilSi}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsDown className="h-3.5 w-3.5" /> {articulo.utilNo}
          </span>
        </div>
        <button type="button" className={BTN_ICONO} title="Editar tutorial" onClick={onEditar}>
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" className={BTN_ICONO} title="Eliminar tutorial" onClick={onBorrar}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-superficie-2 px-2 py-0.5 text-[11px] font-semibold text-texto-2">
      {children}
    </span>
  );
}
