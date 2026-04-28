/**
 * PanelAlertas.tsx
 * =================
 * Panel que muestra las alertas de seguridad en el Dashboard.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/PanelAlertas.tsx
 */

import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import type { AlertasData, Alerta } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface PanelAlertasProps {
	alertas: AlertasData | null;
	vistaMobil?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatearFecha(fecha: string): string {
	const fechaAlerta = new Date(fecha);
	const ahora = new Date();
	const diffMin = Math.floor((ahora.getTime() - fechaAlerta.getTime()) / 60000);
	const diffHoras = Math.floor(diffMin / 60);
	const diffDias = Math.floor(diffHoras / 24);

	if (diffMin < 60) return `${diffMin}m`;
	if (diffHoras < 24) return `${diffHoras}h`;
	if (diffDias < 7) return `${diffDias}d`;
	return fechaAlerta.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function getConfigSeveridad(severidad: string) {
	switch (severidad) {
		case 'alta':
			return {
				icon: XCircle,
				iconBg: 'linear-gradient(135deg, #fecaca, #fca5a5)',
				iconShadow: '0 2px 6px rgba(220,38,38,0.2)',
				color: 'text-red-600',
				badge: 'bg-red-100 text-red-700',
			};
		case 'media':
			return {
				icon: AlertTriangle,
				iconBg: 'linear-gradient(135deg, #fde68a, #fcd34d)',
				iconShadow: '0 2px 6px rgba(202,138,4,0.2)',
				color: 'text-amber-600',
				badge: 'bg-amber-100 text-amber-700',
			};
		default:
			return {
				icon: Info,
				iconBg: 'linear-gradient(135deg, #bfdbfe, #93c5fd)',
				iconShadow: '0 2px 6px rgba(37,99,235,0.2)',
				color: 'text-blue-600',
				badge: 'bg-blue-100 text-blue-700',
			};
	}
}

// =============================================================================
// COMPONENTE ITEM ALERTA
// =============================================================================

function ItemAlerta({ alerta, onClick }: { alerta: Alerta; onClick: () => void }) {
	const config = getConfigSeveridad(alerta.severidad);
	const Icono = config.icon;

	return (
		<div
			onClick={onClick}
			className={`flex items-center gap-3 lg:gap-2.5 2xl:gap-3 px-3 lg:px-3 2xl:px-3.5 py-3 lg:py-2.5 2xl:py-3 cursor-pointer hover:bg-slate-50 transition-colors ${alerta.leida ? 'opacity-50' : ''}`}
		>
			{/* Icono con gradiente */}
			<div
				className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-lg flex items-center justify-center shrink-0"
				style={{ background: config.iconBg, boxShadow: config.iconShadow }}
			>
				<Icono className={`w-7 h-7 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 ${config.color}`} />
			</div>

			{/* Contenido */}
			<div className="flex-1 min-w-0">
				<p className={`text-sm lg:text-[11px] 2xl:text-sm font-bold truncate ${alerta.leida ? 'text-slate-600' : 'text-slate-800'}`}>
					{alerta.titulo}
				</p>
				<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 truncate">
					{alerta.descripcion}
				</p>
			</div>

			{/* Fecha + badge */}
			<div className="flex flex-col items-end gap-0.5 shrink-0">
				<span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-900">
					{formatearFecha(alerta.createdAt)}
				</span>
				{!alerta.leida && (
					<div className="w-2 h-2 rounded-full bg-blue-500" />
				)}
			</div>
		</div>
	);
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PanelAlertas({ alertas, vistaMobil = false }: PanelAlertasProps) {
	const navigate = useNavigate();
	const listaAlertas = alertas?.alertas ?? [];
	const noLeidas = alertas?.noLeidas ?? 0;

	return (
		<div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 lg:h-54 2xl:h-66 flex flex-col shadow-md overflow-hidden">
			{/* Header — gradiente oscuro */}
			<div
				className="flex items-center justify-between px-3 lg:px-3 2xl:px-4 py-2 shrink-0"
				style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
			>
				<div className="flex items-center gap-2">
					<div
						className="w-7 h-7 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0 relative"
						style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
					>
						<Bell className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-white" />
						{noLeidas > 0 && (
							<span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
								{noLeidas > 9 ? '9+' : noLeidas}
							</span>
						)}
					</div>
					<h3 className="font-bold text-base lg:text-sm 2xl:text-base text-white">Alertas</h3>
				</div>

				{noLeidas === 0 ? (
					<div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400">
						<CheckCircle className="w-4 h-4" />
						<span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold">Todo bien</span>
					</div>
				) : (
					<button
						onClick={() => navigate('/business-studio/alertas')}
						className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-white/60 hover:text-white cursor-pointer"
					>
						Ver todas →
					</button>
				)}
			</div>

			{/* Lista */}
			<div className={`flex-1 ${!vistaMobil && 'overflow-y-auto'} flex flex-col divide-y-[1.5px] divide-slate-300`}>
				{listaAlertas.length > 0 ? (
					listaAlertas.map((alerta) => (
						<ItemAlerta
							key={alerta.id}
							alerta={alerta}
							onClick={() => navigate('/business-studio/alertas')}
						/>
					))
				) : (
					<div className="flex-1 flex flex-col items-center justify-center text-slate-600">
						<CheckCircle className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 mb-1 text-emerald-400" />
						<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-emerald-600">Sin alertas pendientes</p>
					</div>
				)}
			</div>
		</div>
	);
}
