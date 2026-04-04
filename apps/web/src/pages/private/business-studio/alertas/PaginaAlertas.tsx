/**
 * ============================================================================
 * PÁGINA: Alertas (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/alertas/PaginaAlertas.tsx
 *
 * PROPÓSITO:
 * Página principal del módulo de Alertas. Muestra alertas de seguridad,
 * operativas, rendimiento y engagement con filtros, KPIs y configuración.
 *
 * PATRÓN: Replica PaginaClientes/PaginaTransacciones
 * - Header con icono animado (hidden móvil, visible desktop)
 * - KPIs en CarouselKPI con gradientes y borders 2px
 * - Filtros en card blanco con chips + Input búsqueda
 * - Vista dual: cards móvil / tabla dark header desktop
 * - Tokens globales: slate palette, font-semibold+, border-2, text-[11px] laptop
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
	Bell,
	Shield,
	Wrench,
	TrendingUp,
	Heart,
	Search,
	Settings,
	CheckCircle2,
	AlertTriangle,
	EyeOff,
	ChevronDown,
	Check,
	Inbox,
	Clock,
	X,
	Trash2,
	Layers,
	Gauge,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useAlertasStore } from '../../../../stores/useAlertasStore';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { CarouselKPI } from '../../../../components/ui/CarouselKPI';
import { notificar } from '../../../../utils/notificaciones';
import { ModalDetalleAlerta } from './ModalDetalleAlerta';
import { ModalConfiguracion } from './ModalConfiguracion';
import type { AlertaCompleta, CategoriaAlerta, SeveridadAlerta } from '../../../../types/alertas';

// =============================================================================
// CSS — Animación del icono del header (patrón Clientes/Ofertas/Puntos)
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes alertas-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .alertas-icon-bounce {
    animation: alertas-icon-bounce 2s ease-in-out infinite;
  }
`;

// =============================================================================
// CONSTANTES Y HELPERS
// =============================================================================

function formatearFecha(fecha: string | null): string {
	if (!fecha) return '—';
	const ahora = new Date();
	const f = new Date(fecha);
	const diffMs = ahora.getTime() - f.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	const diffHoras = Math.floor(diffMs / 3600000);
	const diffDias = Math.floor(diffMs / 86400000);

	if (diffMin < 60) return `Hace ${diffMin}min`;
	if (diffHoras < 24) return `Hace ${diffHoras}h`;
	if (diffDias === 1) return 'Ayer';
	if (diffDias < 7) return `Hace ${diffDias}d`;
	if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)}sem`;
	return f.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ICONO_CATEGORIA: Record<CategoriaAlerta, typeof Shield> = {
	seguridad: Shield,
	operativa: Wrench,
	rendimiento: TrendingUp,
	engagement: Heart,
};

const COLOR_SEVERIDAD: Record<SeveridadAlerta, { bg: string; text: string; border: string; iconBg: string; iconShadow: string }> = {
	alta: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', iconBg: 'linear-gradient(135deg, #fecaca, #fca5a5)', iconShadow: '0 3px 8px rgba(220,38,38,0.25)' },
	media: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', iconBg: 'linear-gradient(135deg, #fde68a, #fcd34d)', iconShadow: '0 3px 8px rgba(202,138,4,0.25)' },
	baja: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', iconBg: 'linear-gradient(135deg, #bfdbfe, #93c5fd)', iconShadow: '0 3px 8px rgba(37,99,235,0.25)' },
};

const LABEL_CATEGORIA: Record<CategoriaAlerta, string> = {
	seguridad: 'Seguridad',
	operativa: 'Operativa',
	rendimiento: 'Rendimiento',
	engagement: 'Engagement',
};

const CATEGORIAS: CategoriaAlerta[] = ['seguridad', 'operativa', 'rendimiento', 'engagement'];
const SEVERIDADES: SeveridadAlerta[] = ['alta', 'media', 'baja'];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaAlertas() {
	const { usuario } = useAuthStore();
	const {
		alertas, kpis, filtros, totalAlertas, totalPaginas,
		cargandoAlertas, cargandoMas, hayMas,
		cargarAlertas, cargarMas, cargarKPIs, setFiltro, limpiarFiltros,
		marcarLeida, marcarResuelta, marcarTodasLeidas, eliminarAlerta, eliminarResueltas,
		seleccionarAlerta, alertaSeleccionada,
	} = useAlertasStore();

	const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
	const [modalConfigAbierto, setModalConfigAbierto] = useState(false);
	const [busquedaLocal, setBusquedaLocal] = useState('');
	const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
	const sentinelaRef = useRef<HTMLDivElement | null>(null);

	// Dropdowns de filtro
	const [dropdownCatAbierto, setDropdownCatAbierto] = useState(false);
	const [dropdownSevAbierto, setDropdownSevAbierto] = useState(false);
	const dropdownCatRef = useRef<HTMLDivElement>(null);
	const dropdownSevRef = useRef<HTMLDivElement>(null);

	// Cargar datos al montar + limpiar filtros al desmontar
	useEffect(() => {
		cargarAlertas();
		cargarKPIs();
		return () => { limpiarFiltros(); setBusquedaLocal(''); };
	}, [usuario?.sucursalActiva]);

	// Detectar móvil
	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 1024);
		window.addEventListener('resize', check);
		return () => window.removeEventListener('resize', check);
	}, []);

	// Scroll infinito móvil
	useEffect(() => {
		if (!isMobile || !sentinelaRef.current) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hayMas && !cargandoMas) {
					cargarMas();
				}
			},
			{ rootMargin: '100px' }
		);
		observer.observe(sentinelaRef.current);
		return () => observer.disconnect();
	}, [isMobile, hayMas, cargandoMas, cargarMas]);

	// Cerrar dropdowns al click fuera
	useEffect(() => {
		const handleClickFuera = (e: MouseEvent) => {
			if (dropdownCatRef.current && !dropdownCatRef.current.contains(e.target as Node)) setDropdownCatAbierto(false);
			if (dropdownSevRef.current && !dropdownSevRef.current.contains(e.target as Node)) setDropdownSevAbierto(false);
		};
		if (dropdownCatAbierto || dropdownSevAbierto) {
			document.addEventListener('mousedown', handleClickFuera);
			return () => document.removeEventListener('mousedown', handleClickFuera);
		}
	}, [dropdownCatAbierto, dropdownSevAbierto]);

	// Debounce búsqueda
	useEffect(() => {
		const timer = setTimeout(() => {
			if (busquedaLocal !== (filtros.busqueda ?? '')) {
				setFiltro('busqueda', busquedaLocal || undefined);
			}
		}, 400);
		return () => clearTimeout(timer);
	}, [busquedaLocal]);

	const handleClickAlerta = useCallback((alerta: AlertaCompleta) => {
		seleccionarAlerta(alerta);
		setModalDetalleAbierto(true);
		if (!alerta.leida) {
			marcarLeida(alerta.id);
		}
	}, [seleccionarAlerta, marcarLeida]);

	const handleMarcarTodasLeidas = useCallback(async () => {
		await marcarTodasLeidas();
		notificar.exito('Todas las alertas marcadas como leídas');
	}, [marcarTodasLeidas]);

	return (
		<div className="p-3 lg:p-1.5 2xl:p-3" data-testid="pagina-alertas">
			<style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />
			<div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

			{/* ══════════════════════════════════════════════════════════════
			    HEADER + KPIs (patrón Clientes/Transacciones)
			    ══════════════════════════════════════════════════════════════ */}
			<div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4" data-testid="header-alertas">

				{/* Icono + Título (hidden en móvil, el MobileHeader ya muestra el título) */}
				<div className="hidden lg:flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
					<div
						className="flex items-center justify-center shrink-0"
						style={{
							width: 52, height: 52, borderRadius: 14,
							background: 'linear-gradient(135deg, #f59e0b, #f97316, #ea580c)',
							boxShadow: '0 6px 20px rgba(245,158,11,0.4)',
						}}
					>
						<Bell className="w-6 h-6 text-white alertas-icon-bounce" />
					</div>
					<div>
						<h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
							Alertas
						</h1>
						<p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
							Monitoreo y seguridad
						</p>
					</div>
				</div>

				{/* KPIs en CarouselKPI */}
				<CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
					<div className="flex justify-between lg:justify-end gap-2" data-testid="kpis-alertas">
						{/* Total */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
							style={{ background: 'linear-gradient(135deg, #f1f5f9, #fff)', borderColor: '#94a3b8' }}
							data-testid="kpi-total-alertas"
						>
							<div
								className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #cbd5e1, #94a3b8)', boxShadow: '0 3px 8px rgba(100,116,139,0.25)' }}
							>
								<Bell className="w-4 h-4 text-slate-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-slate-700">
									{kpis?.total ?? 0}
								</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">
									Total
								</p>
							</div>
						</div>

						{/* No leídas */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
							style={{ background: 'linear-gradient(135deg, #fef2f2, #fff)', borderColor: '#fca5a5' }}
							data-testid="kpi-no-leidas"
						>
							<div
								className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
							>
								<EyeOff className="w-4 h-4 text-red-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-red-700">
									{kpis?.noLeidas ?? 0}
								</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">
									No leídas
								</p>
							</div>
						</div>

						{/* Alta severidad */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 shrink-0 lg:flex-none"
							style={{ background: 'linear-gradient(135deg, #fffbeb, #fff)', borderColor: '#fcd34d' }}
							data-testid="kpi-alta-severidad"
						>
							<div
								className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #fde68a, #fcd34d)', boxShadow: '0 3px 8px rgba(202,138,4,0.25)' }}
							>
								<AlertTriangle className="w-4 h-4 text-amber-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-amber-700">
									{kpis?.porSeveridad.alta ?? 0}
								</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">
									Alta
								</p>
							</div>
						</div>

						{/* Resueltas (solo desktop) */}
						<div
							className="hidden lg:flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 shrink-0"
							style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', borderColor: '#86efac' }}
							data-testid="kpi-resueltas"
						>
							<div
								className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)', boxShadow: '0 3px 8px rgba(22,163,74,0.25)' }}
							>
								<CheckCircle2 className="w-4 h-4 text-green-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-green-700">
									{kpis?.resueltasEsteMes ?? 0}
								</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">
									Resueltas
								</p>
							</div>
						</div>
					</div>
				</CarouselKPI>
			</div>

			{/* ══════════════════════════════════════════════════════════════
			    FILTROS (card blanco con dropdowns, patrón Ofertas/Transacciones)
			    ══════════════════════════════════════════════════════════════ */}
			<div
				className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-2.5 lg:p-3 2xl:p-4 lg:mt-7 2xl:mt-14"
				data-testid="filtros-alertas"
			>
				<div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">

					{/* Dropdowns en misma fila en móvil */}
					<div className="flex items-center gap-2 lg:contents">

					{/* Dropdown Categoría */}
					<div ref={dropdownCatRef} className="relative flex-1 lg:flex-none">
						<button
							onClick={() => { setDropdownCatAbierto(prev => !prev); setDropdownSevAbierto(false); }}
							className={`flex items-center gap-1.5 w-full lg:w-44 2xl:w-48 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${
								filtros.categoria
									? 'bg-blue-100 border-blue-300 text-blue-700'
									: 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
							}`}
							data-testid="chip-categoria-todas"
						>
							<Layers className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
							<span className="truncate">{filtros.categoria ? LABEL_CATEGORIA[filtros.categoria] : 'Categoría'}</span>
							<ChevronDown className={`ml-auto w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 transition-transform ${dropdownCatAbierto ? 'rotate-180' : ''}`} />
						</button>
						{dropdownCatAbierto && (
							<div className="absolute top-full left-0 mt-1.5 w-full lg:w-44 2xl:w-48 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
								{/* Todas */}
								<button
									onClick={() => { setFiltro('categoria', undefined); setDropdownCatAbierto(false); }}
									className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${!filtros.categoria ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
									data-testid="dropdown-cat-todas"
								>
									<div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!filtros.categoria ? 'bg-blue-500' : 'bg-slate-200'}`}>
										{!filtros.categoria && <Check className="w-3 h-3 text-white" />}
									</div>
									<Layers className="w-3.5 h-3.5 shrink-0" />
									Todas
								</button>
								{CATEGORIAS.map(cat => {
									const IconoCat = ICONO_CATEGORIA[cat];
									const activo = filtros.categoria === cat;
									return (
										<button
											key={cat}
											onClick={() => { setFiltro('categoria', cat); setDropdownCatAbierto(false); }}
											className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${activo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
											data-testid={`chip-categoria-${cat}`}
										>
											<div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${activo ? 'bg-blue-500' : 'bg-slate-200'}`}>
												{activo && <Check className="w-3 h-3 text-white" />}
											</div>
											<IconoCat className="w-3.5 h-3.5 shrink-0" />
											{LABEL_CATEGORIA[cat]}
										</button>
									);
								})}
							</div>
						)}
					</div>

					{/* Dropdown Severidad */}
					<div ref={dropdownSevRef} className="relative flex-1 lg:flex-none">
						<button
							onClick={() => { setDropdownSevAbierto(prev => !prev); setDropdownCatAbierto(false); }}
							className={`flex items-center gap-1.5 w-full lg:w-40 2xl:w-44 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${
								filtros.severidad
									? 'bg-blue-100 border-blue-300 text-blue-700'
									: 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
							}`}
							data-testid="chip-severidad-alta"
						>
							<Gauge className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
							<span className="truncate">{filtros.severidad ? filtros.severidad.charAt(0).toUpperCase() + filtros.severidad.slice(1) : 'Severidad'}</span>
							<ChevronDown className={`ml-auto w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 transition-transform ${dropdownSevAbierto ? 'rotate-180' : ''}`} />
						</button>
						{dropdownSevAbierto && (
							<div className="absolute top-full left-0 mt-1.5 w-full lg:w-40 2xl:w-44 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
								{/* Todas */}
								<button
									onClick={() => { setFiltro('severidad', undefined); setDropdownSevAbierto(false); }}
									className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${!filtros.severidad ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
								>
									<div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!filtros.severidad ? 'bg-blue-500' : 'bg-slate-200'}`}>
										{!filtros.severidad && <Check className="w-3 h-3 text-white" />}
									</div>
									Todas
								</button>
								{SEVERIDADES.map(sev => {
									const activo = filtros.severidad === sev;
									return (
										<button
											key={sev}
											onClick={() => { setFiltro('severidad', sev); setDropdownSevAbierto(false); }}
											className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${activo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
											data-testid={`chip-severidad-${sev}`}
										>
											<div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${activo ? 'bg-blue-500' : 'bg-slate-200'}`}>
												{activo && <Check className="w-3 h-3 text-white" />}
											</div>
											{sev === 'alta' ? <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" /> : sev === 'media' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
											{sev.charAt(0).toUpperCase() + sev.slice(1)}
										</button>
									);
								})}
							</div>
						)}
					</div>

					</div>{/* cierra wrapper dropdowns móvil */}

					{/* Chips estado (solo desktop) */}
					<div className="hidden lg:flex items-center gap-1.5">
						<button
							onClick={() => setFiltro('leida', filtros.leida === false ? undefined : false)}
							className={`px-3 lg:px-3 2xl:px-4 h-10 lg:h-10 2xl:h-11 rounded-lg text-sm lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer flex items-center gap-1.5 ${
								filtros.leida === false ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
							}`}
							data-testid="chip-no-leidas"
						>
							<EyeOff className="w-3.5 h-3.5 shrink-0" />
							No leídas
						</button>
						<button
							onClick={() => setFiltro('resuelta', filtros.resuelta === true ? undefined : true)}
							className={`px-3 lg:px-3 2xl:px-4 h-10 lg:h-10 2xl:h-11 rounded-lg text-sm lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer flex items-center gap-1.5 ${
								filtros.resuelta === true ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
							}`}
							data-testid="chip-resueltas"
						>
							<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
							Resueltas
						</button>
					</div>

					{/* Búsqueda + Config */}
					<div className="flex items-center gap-2 flex-1 min-w-0">
						<div className="flex-1 min-w-0">
							<Input
								placeholder="Buscar alertas..."
								value={busquedaLocal}
								onChange={e => setBusquedaLocal(e.target.value)}
								className="h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base"
								icono={<Search className="w-4 h-4 text-slate-600" />}
								elementoDerecha={busquedaLocal ? (
									<button onClick={() => setBusquedaLocal('')} className="p-0.5 rounded-full text-slate-600 hover:bg-slate-200 cursor-pointer">
										<X className="w-3.5 h-3.5" />
									</button>
								) : undefined}
								data-testid="input-busqueda-alertas"
							/>
						</div>
						<button
							onClick={() => setModalConfigAbierto(true)}
							className="h-11 lg:h-10 2xl:h-11 w-11 lg:w-10 2xl:w-11 shrink-0 rounded-lg flex items-center justify-center border-2 border-slate-300 cursor-pointer hover:border-slate-400"
							style={{ background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)' }}
							data-testid="btn-configuracion-alertas"
						>
							<Settings className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600" />
						</button>
					</div>
				</div>

				{/* Acciones masivas + Info automática */}
				<div className="flex items-center justify-between mt-2">
					<div className="flex items-center gap-3">
						{kpis && kpis.noLeidas > 0 && (
							<button
								onClick={handleMarcarTodasLeidas}
								className="text-sm lg:text-[11px] 2xl:text-sm text-blue-600 font-semibold hover:text-blue-800 cursor-pointer"
								data-testid="btn-marcar-todas-leidas"
							>
								Marcar todas como leídas ({kpis.noLeidas})
							</button>
						)}
						{alertas.some(a => a.resuelta) && (
							<button
								onClick={async () => {
									const n = await eliminarResueltas();
									notificar.exito(`${n} alertas resueltas eliminadas`);
								}}
								className="text-sm lg:text-[11px] 2xl:text-sm text-red-500 font-semibold hover:text-red-700 cursor-pointer"
								data-testid="btn-eliminar-resueltas"
							>
								Eliminar resueltas
							</button>
						)}
					</div>
					<p className="hidden lg:flex items-center gap-1.5 text-xs 2xl:text-sm text-slate-500 font-semibold">
						⚡ Las alertas de seguridad se detectan en cada venta. El resto se revisan diariamente de forma automática.
					</p>
				</div>
			</div>

			{/* ══════════════════════════════════════════════════════════════
			    CONTENIDO
			    ══════════════════════════════════════════════════════════════ */}
			{cargandoAlertas ? (
				<div className="flex justify-center py-12">
					<Spinner />
				</div>
			) : alertas.length === 0 ? (
				<div className="text-center py-16" data-testid="estado-vacio-alertas">
					<Inbox className="w-14 h-14 text-slate-300 mx-auto mb-3" />
					<p className="text-slate-600 text-base font-semibold">Sin alertas pendientes</p>
					<p className="text-slate-600 text-sm font-medium mt-1">Todo en orden</p>
				</div>
			) : (
				<>
					{/* ── Móvil: Cards + scroll infinito ── */}
					<div className="lg:hidden space-y-2">
						{alertas.map(alerta => (
							<CardAlertaMovil
								key={alerta.id}
								alerta={alerta}
								onClick={() => handleClickAlerta(alerta)}
							/>
						))}
						<div ref={sentinelaRef} className="h-1" />
						{cargandoMas && (
							<div className="flex justify-center py-3">
								<Spinner />
							</div>
						)}
					</div>

					{/* ── Desktop: Tabla dark header ── */}
					<div className="hidden lg:block" data-testid="tabla-alertas-desktop">
						<div
							className="rounded-xl overflow-hidden border-2 border-slate-300"
							style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
						>
							{/* Header dark gradient */}
							<div
								className="grid grid-cols-[2fr_1fr_1fr_1fr_100px_40px] 2xl:grid-cols-[2fr_1fr_1fr_1fr_120px_50px] px-4 lg:px-3 2xl:px-5 py-2 h-12 items-center"
								style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
							>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider">Alerta</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center -translate-x-2">Severidad</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center -translate-x-2">Categoría</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center -translate-x-2">Fecha</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center -translate-x-3">Estado</span>
								<span></span>
							</div>

							{/* Body scroll */}
							<div className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-420px)] overflow-y-auto bg-white">
								{alertas.map((alerta, i) => (
									<FilaAlertaDesktop
										key={alerta.id}
										alerta={alerta}
										indice={i}
										onClick={() => handleClickAlerta(alerta)}
										onEliminar={(e, id) => { e.stopPropagation(); eliminarAlerta(id); }}
									/>
								))}
							</div>

							{/* Botón cargar más (desktop) */}
							{hayMas && (
								<button
									onClick={cargarMas}
									disabled={cargandoMas}
									className="w-full py-2.5 text-[11px] 2xl:text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer border-t border-slate-200"
									data-testid="btn-cargar-mas-alertas"
								>
									{cargandoMas ? 'Cargando...' : 'Cargar más alertas'}
								</button>
							)}
						</div>
					</div>

				</>
			)}

			{/* ══════════════════════════════════════════════════════════════
			    MODALES
			    ══════════════════════════════════════════════════════════════ */}
			{modalDetalleAbierto && alertaSeleccionada && (
				<ModalDetalleAlerta
					alerta={alertaSeleccionada}
					onCerrar={() => {
						setModalDetalleAbierto(false);
						seleccionarAlerta(null);
					}}
					onMarcarResuelta={marcarResuelta}
					onEliminar={eliminarAlerta}
				/>
			)}

			{modalConfigAbierto && (
				<ModalConfiguracion
					onCerrar={() => setModalConfigAbierto(false)}
				/>
			)}
			</div>{/* cierra max-w contenedor */}
		</div>
	);
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

/** Card de alerta para móvil (patrón TC-9) */
function CardAlertaMovil({ alerta, onClick }: {
	alerta: AlertaCompleta;
	onClick: () => void;
}) {
	const colores = COLOR_SEVERIDAD[alerta.severidad];
	const IconoCat = ICONO_CATEGORIA[alerta.categoria];

	return (
		<div
			className={`w-full flex items-center gap-3 p-3 h-28 rounded-xl bg-white border-2 border-slate-300 cursor-pointer
				${alerta.leida ? 'opacity-60' : ''} ${alerta.resuelta ? 'opacity-40' : ''}
				hover:border-slate-400 hover:shadow-sm`}
			onClick={onClick}
			style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
			data-testid={`card-alerta-${alerta.id}`}
		>
			{/* Icono categoría */}
			<div
				className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
				style={{ background: colores.iconBg, boxShadow: colores.iconShadow }}
			>
				<IconoCat className={`w-7 h-7 ${colores.text}`} />
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
				<div>
					<p className="text-base font-bold text-slate-800 truncate">{alerta.titulo}</p>
					<div className="flex items-center gap-1.5 mt-0.5">
						<span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold capitalize ${colores.bg} ${colores.text}`}>
							{alerta.severidad}
						</span>
						<span className="text-sm font-medium text-slate-500">
							{LABEL_CATEGORIA[alerta.categoria]}
						</span>
					</div>
				</div>
				<div className="flex items-center justify-between">
					<span className="text-sm font-medium text-slate-500 flex items-center gap-1">
						<Clock className="w-3 h-3" />
						{formatearFecha(alerta.createdAt)}
					</span>
					{!alerta.leida && (
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
							<div className="w-1.5 h-1.5 rounded-full bg-red-500" />
							Nueva
						</span>
					)}
					{alerta.resuelta && (
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
							Resuelta
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

/** Fila de alerta para tabla desktop (patrón TC-8) */
function FilaAlertaDesktop({ alerta, indice, onClick, onEliminar }: {
	alerta: AlertaCompleta;
	indice: number;
	onClick: () => void;
	onEliminar: (e: React.MouseEvent, id: string) => void;
}) {
	const colores = COLOR_SEVERIDAD[alerta.severidad];
	const IconoCat = ICONO_CATEGORIA[alerta.categoria];

	return (
		<div
			className={`grid grid-cols-[2fr_1fr_1fr_1fr_100px_40px] 2xl:grid-cols-[2fr_1fr_1fr_1fr_120px_50px]
				px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2.5
				text-sm lg:text-xs 2xl:text-sm items-center cursor-pointer
				border-b border-slate-300
				${indice % 2 === 0 ? 'bg-white' : 'bg-slate-100'}
				${alerta.leida ? 'opacity-60' : ''} ${alerta.resuelta ? 'opacity-40' : ''}
				hover:bg-slate-200`}
			onClick={onClick}
			data-testid={`fila-alerta-${alerta.id}`}
		>
			{/* Alerta (tipo + título) */}
			<div className="flex items-center gap-2.5 min-w-0">
				<div className={`w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg ${colores.bg} flex items-center justify-center shrink-0`}>
					<IconoCat className={`w-4 h-4 ${colores.text}`} />
				</div>
				<div className="min-w-0">
					<p className="font-semibold text-slate-800 truncate">{alerta.titulo}</p>
					<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate">
						{alerta.tipo.replace(/_/g, ' ')}
					</p>
				</div>
			</div>

			{/* Severidad */}
			<div className="flex items-center justify-center">
				<span className={`inline-flex items-center px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold capitalize ${colores.bg} ${colores.text}`}>
					{alerta.severidad}
				</span>
			</div>

			{/* Categoría */}
			<div className="flex items-center justify-center">
				<span className="inline-flex items-center px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-slate-200 text-slate-600">
					{LABEL_CATEGORIA[alerta.categoria]}
				</span>
			</div>

			{/* Fecha */}
			<div className="text-center text-slate-600 font-medium flex items-center justify-center gap-1">
				<Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3" />
				{formatearFecha(alerta.createdAt)}
			</div>

			{/* Estado (fusionado con acción) */}
			<div className="flex items-center justify-center">
				{alerta.resuelta ? (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] 2xl:text-xs font-bold bg-emerald-100 text-emerald-700">
						<CheckCircle2 className="w-3 h-3" />
						Resuelta
					</span>
				) : alerta.leida ? (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] 2xl:text-xs font-bold bg-slate-200 text-slate-500">
						Leída
					</span>
				) : (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] 2xl:text-xs font-bold bg-red-100 text-red-600">
						<div className="w-1.5 h-1.5 rounded-full bg-red-500" />
						Nueva
					</span>
				)}
			</div>

			{/* Eliminar */}
			<div className="flex items-center justify-center">
				<button
					onClick={e => onEliminar(e, alerta.id)}
					className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer"
					data-testid={`btn-eliminar-${alerta.id}`}
				>
					<Trash2 className="w-4 h-4 2xl:w-4.5 2xl:h-4.5" />
				</button>
			</div>
		</div>
	);
}
