/**
 * BannerAlertasUrgentes.tsx
 * ==========================
 * Banner compacto de alertas no leídas para móvil en Dashboard.
 * Click navega a la página de Alertas.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/BannerAlertasUrgentes.tsx
 */

import { Bell, Shield, Wrench, TrendingUp, Heart, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Alerta } from '../../../../../services/dashboardService';

interface BannerAlertasUrgentesProps {
	alertas: Alerta[];
}

const ICONO_CATEGORIA: Record<string, typeof Shield> = {
	seguridad: Shield,
	operativa: Wrench,
	rendimiento: TrendingUp,
	engagement: Heart,
};

const COLOR_SEVERIDAD: Record<string, { iconBg: string; iconShadow: string; color: string }> = {
	alta: { iconBg: 'linear-gradient(135deg, #fecaca, #fca5a5)', iconShadow: '0 2px 6px rgba(220,38,38,0.2)', color: 'text-red-600' },
	media: { iconBg: 'linear-gradient(135deg, #fde68a, #fcd34d)', iconShadow: '0 2px 6px rgba(202,138,4,0.2)', color: 'text-amber-600' },
	baja: { iconBg: 'linear-gradient(135deg, #bfdbfe, #93c5fd)', iconShadow: '0 2px 6px rgba(37,99,235,0.2)', color: 'text-blue-600' },
};

export default function BannerAlertasUrgentes({ alertas }: BannerAlertasUrgentesProps) {
	const navigate = useNavigate();

	if (!alertas.length) return null;

	const alertasVisibles = alertas.slice(0, 2);
	const restantes = alertas.length - alertasVisibles.length;

	return (
		<div
			className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden"
			onClick={() => navigate('/business-studio/alertas')}
		>
			{/* Header */}
			<div
				className="flex items-center justify-between px-3 py-2"
				style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
			>
				<div className="flex items-center gap-2">
					<div className="w-7 h-7 rounded-lg flex items-center justify-center relative"
						style={{ background: 'rgba(255,255,255,0.12)' }}
					>
						<Bell className="w-4 h-4 text-white" />
						<span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
							{alertas.length > 9 ? '9+' : alertas.length}
						</span>
					</div>
					<p className="text-sm font-bold text-white">
						{alertas.length === 1 ? '1 Alerta pendiente' : `${alertas.length} Alertas pendientes`}
					</p>
				</div>
				<ChevronRight className="w-4 h-4 text-white/60" />
			</div>

			{/* Alertas */}
			<div className="p-2 space-y-1">
				{alertasVisibles.map(alerta => {
					const colores = COLOR_SEVERIDAD[alerta.severidad] ?? COLOR_SEVERIDAD.baja;
					const IconoCat = ICONO_CATEGORIA[(alerta as any).categoria] ?? Bell;

					return (
						<div key={alerta.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100">
							<div
								className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: colores.iconBg, boxShadow: colores.iconShadow }}
							>
								<IconoCat className={`w-4 h-4 ${colores.color}`} />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-bold text-slate-800 truncate">{alerta.titulo}</p>
								<p className="text-xs font-medium text-slate-500 truncate">{alerta.descripcion}</p>
							</div>
						</div>
					);
				})}
			</div>

			{/* Footer */}
			{restantes > 0 && (
				<div className="px-3 pb-2">
					<p className="text-xs font-semibold text-slate-500 text-center">
						y {restantes} más...
					</p>
				</div>
			)}
		</div>
	);
}
