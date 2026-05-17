/**
 * TabPromociones.tsx — Pestaña de Promociones del módulo Reportes BS
 */

import { useState } from 'react';
import { Tag, Percent, CalendarClock, Flame, Megaphone } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Gift = (p: IconoWrapperProps) => <Icon icon={ICONOS.recompensa} {...p} />;
const Award = (p: IconoWrapperProps) => <Icon icon={ICONOS.logro} {...p} />;
import type { PromocionResumen, TipoDetallePromocion } from '../../../../../services/reportesService';
import { useReportePromociones } from '../../../../../hooks/queries/useReportes';
import { Spinner } from '../../../../../components/ui/Spinner';
import { CarouselKPI } from '../../../../../components/ui/CarouselKPI';
import { PanelTitulo, TablaHeader, formatearMonto, KpiCard, type IconLike } from './ReporteUI';
import { ModalDetallePromocion } from './ModalDetallePromocion';

interface TabPromocionesProps {
  fechaInicio: string;
  fechaFin: string;
  solo?: 'kpis' | 'body';
}

export function TabPromociones({ fechaInicio, fechaFin, solo = 'body' }: TabPromocionesProps) {
  const { data, isPending } = useReportePromociones(fechaInicio, fechaFin);
  const [modalTipo, setModalTipo] = useState<TipoDetallePromocion | null>(null);

  if (isPending) {
    if (solo === 'kpis') return null;
    return (
      <div className="flex items-center justify-center py-20" data-testid="reporte-promociones-loading">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    if (solo === 'kpis') return null;
    return (
      <div className="text-center py-16 text-slate-600 font-medium" data-testid="reporte-promociones-vacio">
        No hay datos de promociones para este período
      </div>
    );
  }

  // ─── Solo KPIs ────────────────────────────────────────────────────────
  if (solo === 'kpis') {
    return (
      <CarouselKPI>
        <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0" data-testid="reporte-promociones-kpis">
          <KpiCard
            icono={Percent}
            label="Descuento total"
            valor={formatearMonto(data.descuentoTotal)}
            color="red"
            testId="reporte-metrica-descuento"
          />
          <KpiCard
            icono={CalendarClock}
            label="Por vencer (7d)"
            valor={data.porVencer}
            color="amber"
            testId="reporte-metrica-por-vencer"
          />
        </div>
      </CarouselKPI>
    );
  }

  // ─── Solo Body (tablas) ───────────────────────────────────────────────
  return (
    <div className="space-y-3 lg:space-y-2 2xl:space-y-3" data-testid="reporte-promociones">
      {/* Fila 1: Ofertas + Cupones + Recompensas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-2 2xl:gap-3">
        {/* Funnel Ofertas públicas — clickeable */}
        <button type="button" onClick={() => setModalTipo('ofertas')} className="text-left bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden hover:border-slate-400 lg:cursor-pointer transition flex flex-col justify-start" data-testid="reporte-funnel-ofertas">
          <PanelTitulo icono={Megaphone} titulo="Ofertas (públicas)" />
          <TablaHeader columnas={['Métrica', 'Cantidad']} />
          {[
            { metrica: 'Activas', valor: data.funnelOfertas.activas, color: 'text-emerald-600' },
            { metrica: 'Vistas', valor: data.funnelOfertas.vistas, color: 'text-indigo-600' },
            { metrica: 'Clicks', valor: data.funnelOfertas.clicks, color: 'text-blue-600' },
            { metrica: 'Shares', valor: data.funnelOfertas.shares, color: 'text-violet-600' },
            { metrica: 'Expiradas', valor: data.funnelOfertas.expiradas, color: 'text-red-600' },
          ].map((item, i) => (
            <div key={item.metrica} className={`grid gap-px ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">{item.metrica}</div>
              <div className={`flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold ${item.color}`}>{item.valor.toLocaleString('es-MX')}</div>
            </div>
          ))}
        </button>

        {/* Funnel Cupones — clickeable + con Revocados */}
        <button type="button" onClick={() => setModalTipo('cupones')} className="text-left bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden hover:border-slate-400 lg:cursor-pointer transition flex flex-col justify-start" data-testid="reporte-funnel-cupones">
          <PanelTitulo icono={Tag} titulo="Cupones (privados)" />
          <TablaHeader columnas={['Estado', 'Cantidad']} />
          {[
            { estado: 'Emitidos', valor: data.funnelCupones.emitidos, color: 'text-slate-800' },
            { estado: 'Canjeados', valor: data.funnelCupones.canjeados, color: 'text-emerald-600' },
            { estado: 'Revocados', valor: data.funnelCupones.revocados, color: 'text-red-600' },
            { estado: 'Expirados', valor: data.funnelCupones.expirados, color: 'text-amber-600' },
            { estado: 'Activos', valor: data.funnelCupones.activos, color: 'text-indigo-600' },
          ].map((item, i) => (
            <div key={item.estado} className={`grid gap-px ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">{item.estado}</div>
              <div className={`flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold ${item.color}`}>{item.valor}</div>
            </div>
          ))}
        </button>

        {/* Funnel Recompensas — clickeable */}
        <button type="button" onClick={() => setModalTipo('recompensas')} className="text-left bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden hover:border-slate-400 lg:cursor-pointer transition flex flex-col justify-start" data-testid="reporte-funnel-recompensas">
          <PanelTitulo icono={Gift} titulo="Recompensas" />
          <TablaHeader columnas={['Estado', 'Cantidad']} />
          {[
            { estado: 'Generados', valor: data.funnelRecompensas.generados, color: 'text-slate-800' },
            { estado: 'Canjeados', valor: data.funnelRecompensas.canjeados, color: 'text-emerald-600' },
            { estado: 'Expirados', valor: data.funnelRecompensas.expirados, color: 'text-red-600' },
            { estado: 'Pendientes', valor: data.funnelRecompensas.pendientes, color: 'text-amber-600' },
          ].map((item, i) => (
            <div key={item.estado} className={`grid gap-px ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800">{item.estado}</div>
              <div className={`flex items-center px-3 py-2 text-sm lg:text-xs 2xl:text-sm font-semibold ${item.color}`}>{item.valor}</div>
            </div>
          ))}
        </button>
      </div>

      {/* Fila 2: Oferta más popular + Mejor cupón + Mejor recompensa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-2 2xl:gap-3">
        <CardMejorPromocion promo={data.mejorOferta} titulo="Oferta más popular" iconoPlaceholder={Megaphone} emptyText="Sin clicks en ofertas" testId="reporte-mejor-oferta" />
        <CardMejorPromocion promo={data.mejorCupon} titulo="Mejor cupón" iconoPlaceholder={Tag} emptyText="Sin canjes de cupones" testId="reporte-mejor-cupon" />
        <CardMejorPromocion promo={data.mejorRecompensa} titulo="Mejor recompensa" iconoPlaceholder={Gift} emptyText="Sin canjes de recompensas" testId="reporte-mejor-recompensa" />
      </div>

      {/* Modal detalle */}
      {modalTipo && (
        <ModalDetallePromocion
          abierto={modalTipo !== null}
          onCerrar={() => setModalTipo(null)}
          tipo={modalTipo}
        />
      )}
    </div>
  );
}

/** Card reutilizable para "Mejor oferta", "Mejor cupón" y "Mejor recompensa" */
function CardMejorPromocion({ promo, titulo, iconoPlaceholder: IconoPlaceholder, emptyText, testId }: {
  promo: PromocionResumen | null;
  titulo: string;
  iconoPlaceholder: IconLike;
  emptyText: string;
  testId: string;
}) {
  const getBadgeTexto = (p: PromocionResumen): string => {
    if (p.tipo === 'porcentaje') return `${p.valor}% OFF`;
    if (p.tipo === 'monto_fijo') return `$${p.valor}`;
    if (p.tipo === '2x1') return '2x1';
    if (p.tipo === '3x2') return '3x2';
    if (p.tipo === 'envio_gratis') return 'Envío Gratis';
    if (p.tipo === 'basica' || p.tipo === 'compras_frecuentes') return p.valor ?? 'Recompensa';
    return p.valor ?? 'Oferta';
  };

  return (
    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 shadow-md overflow-hidden" data-testid={testId}>
      <PanelTitulo icono={Award} titulo={titulo} />
      <div className="p-3 lg:p-2.5 2xl:p-3">
        {promo ? (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)' }}
          >
            {/* Imagen con overlay gradient + badges */}
            <div className="relative h-28 lg:h-24 2xl:h-28">
              {promo.imagen ? (
                <img src={promo.imagen} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                  <IconoPlaceholder className="w-8 h-8 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
              <span
                className="absolute top-2 right-2 text-sm lg:text-xs 2xl:text-sm font-extrabold text-white px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {getBadgeTexto(promo)}
              </span>
              <span
                className="absolute bottom-2 left-2 text-sm lg:text-xs 2xl:text-sm font-extrabold text-white px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                {promo.metrica} {promo.metricaLabel}
              </span>
            </div>
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }} />
            <div className="p-2.5 lg:p-2 2xl:p-2.5 bg-white flex items-center gap-2.5">
              <Flame className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-orange-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-base lg:text-sm 2xl:text-base font-extrabold text-slate-800 truncate">{promo.titulo}</p>
                {promo.descripcion && (
                  <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 truncate">{promo.descripcion}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-600">
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}
