/**
 * PanelCampanas.tsx
 * ==================
 * Panel que muestra las campañas activas (ofertas y cupones) con métricas
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/PanelCampanas.tsx
 * 
 * CARACTERÍSTICAS:
 * - Muestra 3 campañas visibles
 * - Imagen o placeholder dinámico según tipo de oferta
 * - Métricas: vistas, clicks, shares con tooltips
 * - Botón "Ver más" si hay más de 3
 */

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Tag, Eye, MousePointer, Share2, Clock, Percent, DollarSign, Gift, Truck } from 'lucide-react';
import type { Campana } from '../../../../../services/dashboardService';

// =============================================================================
// CONSTANTES
// =============================================================================

const MAX_CAMPANAS_VISIBLES = 3;

// Configuración de placeholders por tipo de oferta (mismo mapeo que ModalOferta)
const PLACEHOLDER_CONFIG: Record<string, { gradient: string; icono: typeof Tag }> = {
  porcentaje: { gradient: 'from-red-400 to-rose-600', icono: Percent },
  monto_fijo: { gradient: 'from-green-400 to-emerald-600', icono: DollarSign },
  '2x1': { gradient: 'from-orange-400 to-amber-600', icono: Gift },
  '3x2': { gradient: 'from-orange-400 to-amber-600', icono: Gift },
  envio_gratis: { gradient: 'from-blue-400 to-sky-600', icono: Truck },
  regalo: { gradient: 'from-purple-400 to-violet-600', icono: Gift },
  otro: { gradient: 'from-slate-400 to-slate-600', icono: Tag },
  default: { gradient: 'from-slate-400 to-slate-600', icono: Tag },
};

// =============================================================================
// TIPOS
// =============================================================================

interface PanelCampanasProps {
  campanas: Campana[];
  totalActivas?: number;
  onEditar?: (ofertaId: string) => void;
  vistaMobil?: boolean;
}

interface TooltipPortalProps {
  texto: string;
  visible: boolean;
  posicion: { top: number; left: number };
}

// =============================================================================
// SUBCOMPONENTE: Tooltip con Portal
// =============================================================================

function TooltipPortal({ texto, visible, posicion }: TooltipPortalProps) {
  if (!visible) return null;

  return createPortal(
    <div
      className="fixed z-9999 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded shadow-lg pointer-events-none"
      style={{
        top: posicion.top - 32,
        left: posicion.left,
        transform: 'translateX(-50%)',
      }}
    >
      {texto}
      {/* Flechita */}
      <div
        className="absolute w-2 h-2 bg-slate-800 rotate-45"
        style={{
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
    </div>,
    document.body
  );
}

// =============================================================================
// SUBCOMPONENTE: Métrica con Tooltip
// =============================================================================

interface MetricaConTooltipProps {
  icono: typeof Eye;
  valor: string;
  tooltip: string;
  urgente?: boolean;
}

function MetricaConTooltip({ icono: Icono, valor, tooltip, urgente = false }: MetricaConTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const mostrar = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPosicion({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    }
    setVisible(true);
  };

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={mostrar}
        onMouseLeave={() => setVisible(false)}
        className={`flex items-center gap-0.5 cursor-default ${urgente ? 'text-rose-500' : 'text-slate-500'}`}
      >
        <Icono className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
        <span className="text-xs lg:text-[10px] 2xl:text-xs font-medium">{valor}</span>
      </span>
      <TooltipPortal texto={tooltip} visible={visible} posicion={posicion} />
    </>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Calcula días restantes hasta que venza la oferta
 * LÓGICA CORRECTA: Si vence el 17/enero y hoy es 16/enero:
 * - Queda TODO el día 16 (hoy) + TODO el día 17 (mañana) = 2 días
 * - Si hoy es 17/enero y vence el 17 = "Hoy" (último día)
 * - Si hoy es 18/enero y vence el 17 = Ya venció (null)
 */
function calcularDiasRestantes(fechaFin: string): number | null {
  try {
    // Fecha actual (solo año, mes, día - sin hora)
    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    // Fecha fin (solo año, mes, día - sin hora)
    const fechaFinDate = new Date(fechaFin);
    const fechaFinInicio = new Date(fechaFinDate.getFullYear(), fechaFinDate.getMonth(), fechaFinDate.getDate());

    // Calcular diferencia en días
    const diffTime = fechaFinInicio.getTime() - hoyInicio.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Si ya venció (negativo), retorna null
    if (diffDays < 0) return null;

    // Si vence hoy (diffDays = 0), retorna 0
    if (diffDays === 0) return 0;

    // Si vence en el futuro, suma 1 (día actual + días restantes)
    // Ejemplo: Si hoy es 16 y vence el 17, diffDays=1, pero quedan 2 días (hoy+mañana)
    return diffDays + 1;
  } catch {
    return null;
  }
}

function formatearNumero(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

// =============================================================================
// SUBCOMPONENTE: Placeholder dinámico
// =============================================================================

function PlaceholderOferta({ tipo }: { tipo: string }) {
  const config = PLACEHOLDER_CONFIG[tipo] || PLACEHOLDER_CONFIG.default;
  const Icono = config.icono;

  return (
    <div className={`w-full h-full bg-linear-to-br ${config.gradient} flex items-center justify-center`}>
      <Icono className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white/30" />
    </div>
  );
}

// =============================================================================
// SUBCOMPONENTE: Card de Campaña
// =============================================================================

interface CardCampanaProps {
  campana: Campana;
  onClick: () => void;
  vistaMobil?: boolean;
}

function CardCampana({ campana, onClick, vistaMobil = false }: CardCampanaProps) {
  const diasRestantes = calcularDiasRestantes(campana.fechaFin);

  // No renderizar si ya venció
  if (diasRestantes === null) return null;

  const urgente = diasRestantes <= 3;

  return (
    <div
      onClick={onClick}
      className="group flex gap-2 lg:gap-1.5 2xl:gap-2 p-1.5 lg:p-1 2xl:p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
    >
      {/* Imagen o Placeholder */}
      <div className={`${vistaMobil ? 'w-14 h-14' : 'w-12 h-12'} lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-md overflow-hidden shrink-0`}>
        {campana.imagen ? (
          <img
            src={campana.imagen}
            alt={campana.titulo}
            className="w-full h-full object-cover"
          />
        ) : (
          <PlaceholderOferta tipo={campana.tipo} />
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        {/* Título */}
        <p className="text-xs lg:text-[10px] 2xl:text-xs font-bold text-slate-800 truncate leading-tight">
          {campana.titulo}
        </p>

        {/* Métricas con Tooltips */}
        <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
          <MetricaConTooltip
            icono={Eye}
            valor={formatearNumero(campana.totalVistas)}
            tooltip="Vistas"
          />
          <MetricaConTooltip
            icono={MousePointer}
            valor={formatearNumero(campana.totalClicks)}
            tooltip="Clicks"
          />
          <MetricaConTooltip
            icono={Share2}
            valor={formatearNumero(campana.totalShares)}
            tooltip="Compartidos"
          />
          <span className="text-slate-300">|</span>
          <MetricaConTooltip
            icono={Clock}
            valor={diasRestantes === 0 ? 'Hoy' : `${diasRestantes}d`}
            tooltip={diasRestantes === 0 ? 'Último día' : `${diasRestantes} días restantes`}
            urgente={urgente}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PanelCampanas({ campanas, onEditar, vistaMobil = false }: PanelCampanasProps) {

  // PRIMERO: Filtrar campañas que NO estén vencidas
  const campanasNoVencidas = campanas.filter(campana => {
    const diasRestantes = calcularDiasRestantes(campana.fechaFin);
    return diasRestantes !== null; // Solo las que NO retornan null (no vencidas)
  });

  // SEGUNDO: Tomar las primeras 3 de las NO vencidas
  const campanasVisibles = campanasNoVencidas.slice(0, MAX_CAMPANAS_VISIBLES);

  // Total de campañas NO vencidas
  const total = campanasNoVencidas.length;

  // Click en campaña - solo pasa el ID para cargar datos completos
  const handleClickCampana = (campana: Campana) => {
    if (campana.tipoCampana === 'oferta' && onEditar) {
      onEditar(campana.id);
    }
    // TODO: Manejar cupones cuando se implementen
  };

  return (
    <div className="bg-white rounded-xl lg:rounded-md 2xl:rounded-lg border-2 border-slate-300 p-2.5 lg:p-2 2xl:p-2.5 h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-200">
      {/* Header - Título y contador en línea */}
      <div className="flex items-center justify-between mb-2 lg:mb-1.5 2xl:mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Tag className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-4.5 2xl:h-4.5 text-rose-600" />
          </div>
          <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800">Cupones y Ofertas</h3>
        </div>
        <span className="text-xs lg:text-[10px] 2xl:text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">{total} activas</span>
      </div>

      {/* Lista de campañas */}
      <div className="flex-1 space-y-1.5 lg:space-y-1 2xl:space-y-1.5 overflow-y-auto">
        {campanasVisibles.length > 0 ? (
          campanasVisibles.map((campana) => (
            <CardCampana
              key={`${campana.tipoCampana}-${campana.id}`}
              campana={campana}
              onClick={() => handleClickCampana(campana)}
              vistaMobil={vistaMobil}
            />
          ))
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400">
            <Tag className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 mb-2 opacity-50" />
            <p className="text-xs lg:text-[10px] 2xl:text-xs font-medium">No hay campañas activas</p>
          </div>
        )}
      </div>
    </div>
  );
}