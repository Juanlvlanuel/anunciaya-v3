/**
 * ModalDetallePromocion.tsx
 * ==========================
 * Modal horizontal con tabla de detalle para Ofertas, Cupones o Recompensas.
 * Headers clickeables para ordenar. Patrón BS (ModalAdaptativo + header oscuro).
 */

import { useState, useMemo } from 'react';
import { Megaphone, Tag, Gift, ArrowUp, ArrowDown } from 'lucide-react';
import { ModalAdaptativo } from '../../../../../components/ui/ModalAdaptativo';
import { useDetallePromocion } from '../../../../../hooks/queries/useReportes';
import { Spinner } from '../../../../../components/ui/Spinner';
import type { TipoDetallePromocion, DetalleOferta, DetalleCupon, DetalleRecompensa } from '../../../../../services/reportesService';

const CONFIG = {
  ofertas: {
    titulo: 'Detalle de Ofertas',
    descripcion: 'Métricas de engagement por oferta pública',
    icono: Megaphone,
  },
  cupones: {
    titulo: 'Detalle de Cupones',
    descripcion: 'Estado de asignaciones por cupón privado',
    icono: Tag,
  },
  recompensas: {
    titulo: 'Detalle de Recompensas',
    descripcion: 'Vouchers generados por recompensa',
    icono: Gift,
  },
} as const;

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  tipo: TipoDetallePromocion;
}

type Direccion = 'asc' | 'desc';

export function ModalDetallePromocion({ abierto, onCerrar, tipo }: Props) {
  const { data, isPending } = useDetallePromocion(tipo, abierto);
  const config = CONFIG[tipo];
  const Icono = config.icono;
  const total = Array.isArray(data) ? data.length : 0;

  // Sorting state
  const [campo, setCampo] = useState<string>(tipo === 'ofertas' ? 'clicks' : tipo === 'cupones' ? 'canjeados' : 'canjeados');
  const [dir, setDir] = useState<Direccion>('desc');

  const toggleOrden = (c: string) => {
    if (campo === c) {
      setDir(dir === 'asc' ? 'desc' : 'asc');
    } else {
      setCampo(c);
      setDir('desc');
    }
  };

  const FlechaOrden = ({ c }: { c: string }) => {
    const activo = campo === c;
    const Icn = activo && dir === 'asc' ? ArrowUp : ArrowDown;
    return <Icn className={`w-3 h-3 inline ml-0.5 ${activo ? 'opacity-100' : 'opacity-30'}`} />;
  };

  // Sort data
  const sorted = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    const arr = [...data] as unknown as Record<string, unknown>[];
    arr.sort((a, b) => {
      const va = (a[campo] as number) ?? 0;
      const vb = (b[campo] as number) ?? 0;
      return dir === 'asc' ? va - vb : vb - va;
    });
    return arr;
  }, [data, campo, dir]);

  const thClass = "text-left px-3 py-2 text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-700 whitespace-nowrap";
  const thSortable = `${thClass} lg:cursor-pointer hover:bg-slate-300`;

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="wide"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      alturaMaxima="lg"
      headerOscuro
      className="max-lg:[background:linear-gradient(180deg,#1e293b_2.5rem,rgb(248,250,252)_2.5rem)]"
    >
      <div data-testid={`modal-detalle-${tipo}`}>
        {/* Header */}
        <div
          className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 lg:rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.3)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Icono className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">{config.titulo}</h2>
              <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-white/70">{config.descripcion}</p>
            </div>
            {total > 0 && (
              <div className="shrink-0 flex flex-col items-center px-3 py-1.5 rounded-xl bg-white/15">
                <span className="text-xl font-extrabold text-white leading-none">{total}</span>
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-white/70 mt-0.5">
                  {tipo === 'ofertas' ? 'ofertas' : tipo === 'cupones' ? 'cupones' : 'recompensas'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isPending ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : total === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-200 flex items-center justify-center mb-3">
                <Icono className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-base font-bold text-slate-800">Sin datos</p>
              <p className="text-sm font-medium text-slate-600 mt-1">No hay {tipo} registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* ── Ofertas ──────────────────────────────────── */}
              {tipo === 'ofertas' && (
                <table className="w-full" data-testid="detalle-ofertas">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className={thClass}>Oferta</th>
                      <th className={thSortable} onClick={() => toggleOrden('vistas')}>Vistas<FlechaOrden c="vistas" /></th>
                      <th className={thSortable} onClick={() => toggleOrden('clicks')}>Clicks<FlechaOrden c="clicks" /></th>
                      <th className={thSortable} onClick={() => toggleOrden('shares')}>Shares<FlechaOrden c="shares" /></th>
                      <th className={thClass}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sorted as unknown as DetalleOferta[]).map((o, i) => (
                      <tr key={o.id} className={`border-b border-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {o.imagen ? (
                              <img src={o.imagen} alt="" className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                <Megaphone className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">{o.titulo}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-indigo-600">{o.vistas.toLocaleString('es-MX')}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-blue-600">{o.clicks.toLocaleString('es-MX')}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-violet-600">{o.shares.toLocaleString('es-MX')}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-md text-sm lg:text-[11px] 2xl:text-sm font-bold ${
                            o.expirada ? 'bg-red-100 text-red-700' : o.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {o.expirada ? 'Expirada' : o.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ── Cupones ──────────────────────────────────── */}
              {tipo === 'cupones' && (
                <table className="w-full" data-testid="detalle-cupones">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className={thClass}>Cupón</th>
                      <th className={thSortable} onClick={() => toggleOrden('enviados')}>Enviados<FlechaOrden c="enviados" /></th>
                      <th className={thSortable} onClick={() => toggleOrden('canjeados')}>Canjeados<FlechaOrden c="canjeados" /></th>
                      <th className={thClass}>Revocados</th>
                      <th className={thClass}>Expirados</th>
                      <th className={thClass}>Activos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sorted as unknown as DetalleCupon[]).map((c, i) => (
                      <tr key={c.id} className={`border-b border-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {c.imagen ? (
                              <img src={c.imagen} alt="" className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                <Tag className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">{c.titulo}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800">{c.enviados}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{c.canjeados}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-red-600">{c.revocados}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-amber-600">{c.expirados}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-indigo-600">{c.activos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* ── Recompensas ──────────────────────────────── */}
              {tipo === 'recompensas' && (
                <table className="w-full" data-testid="detalle-recompensas">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className={thClass}>Recompensa</th>
                      <th className={thSortable} onClick={() => toggleOrden('generados')}>Generados<FlechaOrden c="generados" /></th>
                      <th className={thSortable} onClick={() => toggleOrden('canjeados')}>Canjeados<FlechaOrden c="canjeados" /></th>
                      <th className={thClass}>Expirados</th>
                      <th className={thClass}>Pendientes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sorted as unknown as DetalleRecompensa[]).map((r, i) => (
                      <tr key={r.id} className={`border-b border-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {r.imagen ? (
                              <img src={r.imagen} alt="" className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                                <Gift className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">{r.nombre}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800">{r.generados}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-emerald-600">{r.canjeados}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-amber-600">{r.expirados}</td>
                        <td className="px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-indigo-600">{r.pendientes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalAdaptativo>
  );
}
