/**
 * ============================================================================
 * PÁGINA: Sucursales (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/sucursales/PaginaSucursales.tsx
 *
 * PATRÓN: Replica PaginaEmpleados
 * - Header con icono animado (hidden móvil)
 * - KPIs en CarouselKPI
 * - Filtros: búsqueda + chips estado + botón crear
 * - Vista dual: cards móvil / tabla desktop
 * - useQuery simple (bajo volumen, sin infinite scroll)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Building2,
	Search,
	Plus,
	MapPin,
	Eye,
	Pencil,
	Trash2,
	Star,
	Power,
	X,
	User,
	Phone,
	Lock,
} from 'lucide-react';
import Tooltip from '../../../../components/ui/Tooltip';
import { useAuthStore } from '../../../../stores/useAuthStore';
import {
	useSucursalesKPIs,
	useSucursalesLista,
	useToggleSucursalActiva,
	useEliminarSucursal,
} from '../../../../hooks/queries/useSucursales';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { CarouselKPI } from '../../../../components/ui/CarouselKPI';
import { notificar } from '../../../../utils/notificaciones';
import { ModalCrearSucursal } from './ModalCrearSucursal';
import { ModalDetalleSucursal } from './ModalDetalleSucursal';
import type { SucursalResumen } from '../../../../types/sucursales';

// =============================================================================
// CSS — Animación del icono del header
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes sucursales-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .sucursales-icon-bounce {
    animation: sucursales-icon-bounce 2s ease-in-out infinite;
  }
`;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaSucursales() {
	const { usuario } = useAuthStore();
	const navigate = useNavigate();

	const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
	const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
	const [sucursalSeleccionada, setSucursalSeleccionada] = useState<SucursalResumen | null>(null);
	const [busquedaLocal, setBusquedaLocal] = useState('');
	const [busqueda, setBusqueda] = useState('');
	const [filtroActiva, setFiltroActiva] = useState<boolean | undefined>(undefined);
	const [, setIsMobile] = useState(() => window.innerWidth < 1024);

	const esGerente = !!usuario?.sucursalAsignada;

	// React Query — ANTES del guard para cumplir Rules of Hooks
	const kpisQuery = useSucursalesKPIs();
	const kpis = kpisQuery.data ?? null;
	const listaQuery = useSucursalesLista({ busqueda, activa: filtroActiva });
	const sucursales = listaQuery.data ?? [];
	const cargando = listaQuery.isPending;
	const toggleActivaMutation = useToggleSucursalActiva();
	const eliminarMutation = useEliminarSucursal();

	const kpisCargando = kpisQuery.isPending;
	const totalReal = kpis?.total ?? 0;
	const soloMatriz = totalReal <= 1;

	// Detectar móvil
	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 1024);
		window.addEventListener('resize', check);
		return () => window.removeEventListener('resize', check);
	}, []);

	// Debounce búsqueda
	useEffect(() => {
		const timer = setTimeout(() => {
			if (busquedaLocal !== busqueda) setBusqueda(busquedaLocal);
		}, 400);
		return () => clearTimeout(timer);
	}, [busquedaLocal, busqueda]);

	const handleClickSucursal = useCallback((suc: SucursalResumen) => {
		setSucursalSeleccionada(suc);
		setModalDetalleAbierto(true);
	}, []);

	const handleEditar = useCallback((suc: SucursalResumen) => {
		// Cambiar sucursal activa y navegar a Mi Perfil
		useAuthStore.getState().setSucursalActiva(suc.id);
		navigate('/business-studio/perfil');
	}, [navigate]);

	const handleToggleActiva = useCallback(async (suc: SucursalResumen, e: React.MouseEvent) => {
		e.stopPropagation();
		const confirmar = suc.activa
			? await notificar.confirmar(`¿Desactivar "${suc.nombre}"?${suc.gerente ? ' El gerente asignado será revocado.' : ''}`)
			: true;
		if (confirmar) {
			toggleActivaMutation.mutate({ sucursalId: suc.id, activa: !suc.activa });
		}
	}, [toggleActivaMutation]);

	const handleEliminar = useCallback(async (suc: SucursalResumen, e: React.MouseEvent) => {
		e.stopPropagation();
		const ok = await notificar.confirmar(`¿Eliminar "${suc.nombre}"?${suc.gerente ? ' El gerente asignado será revocado.' : ''}`);
		if (!ok) return;

		try {
			await eliminarMutation.mutateAsync(suc.id);
		} catch (error) {
			// Si la sucursal tiene historial de ventas, no se puede eliminar.
			// Ofrecer desactivarla (la oculta del feed público y revoca empleados,
			// pero preserva todas las transacciones, reseñas y empleados en BD).
			const axiosError = error as { response?: { data?: { code?: string; error?: string } } };
			if (axiosError?.response?.data?.code === 'TIENE_HISTORIAL') {
				const desactivar = await notificar.confirmar(
					`"${suc.nombre}" tiene ventas registradas. Para conservar el historial no se puede eliminar. ¿Quieres desactivarla?${suc.gerente ? ' El gerente asignado será revocado.' : ''}`
				);
				if (desactivar && suc.activa) {
					toggleActivaMutation.mutate({ sucursalId: suc.id, activa: false });
				}
			}
		}
	}, [eliminarMutation, toggleActivaMutation]);

	// ═══════════════════════════════════════════════════════════════════════
	// GUARDS (después de TODOS los hooks para cumplir Rules of Hooks)
	// ═══════════════════════════════════════════════════════════════════════

	// Guard: gerentes no acceden a este módulo
	if (esGerente) {
		return (
			<div className="flex items-center justify-center min-h-[70vh] px-4" data-testid="guard-gerente">
				<div className="max-w-md w-full bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-8 lg:p-10 text-center">
					<div
						className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-5 shadow-md"
						style={{ background: 'linear-gradient(135deg, #334155, #475569)' }}
					>
						<Lock className="w-10 h-10 text-white" />
					</div>
					<p className="text-slate-900 text-xl font-bold">Acceso restringido</p>
					<p className="text-slate-600 text-sm font-medium mt-3 leading-relaxed">
						La gestión de sucursales es <strong className="text-slate-800">exclusiva del dueño</strong> del negocio. Si necesitas hacer cambios, contacta con el propietario.
					</p>
				</div>
			</div>
		);
	}

	// Mientras cargan los KPIs, spinner limpio (evita flash de filtros)
	if (kpisCargando) {
		return (
			<div className="flex justify-center py-20">
				<Spinner />
			</div>
		);
	}

	// Si solo tiene la sucursal del onboarding → header + estado vacío
	if (soloMatriz) {
		return (
			<div className="p-3 lg:p-1.5 2xl:p-3" data-testid="pagina-sucursales-vacia">
				<style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />
				<div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

					{/* Header (igual que el módulo completo) */}
					<div className="hidden lg:flex items-center gap-4 shrink-0">
						<div
							className="flex items-center justify-center shrink-0"
							style={{
								width: 52, height: 52, borderRadius: 14,
								background: 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
								boxShadow: '0 6px 20px rgba(59,130,246,0.4)',
							}}
						>
							<Building2 className="w-6 h-6 text-white sucursales-icon-bounce" />
						</div>
						<div>
							<h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
								Sucursales
							</h1>
							<p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
								Gestiona tus ubicaciones
							</p>
						</div>
					</div>

					{/* Estado vacío */}
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<div
							className="flex items-center justify-center mb-4"
							style={{
								width: 64, height: 64, borderRadius: 16,
								background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
								boxShadow: '0 6px 20px rgba(59,130,246,0.3)',
							}}
						>
							<Building2 className="w-8 h-8 text-white" />
						</div>
						<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-slate-800 mb-2">
							¿Tu negocio tiene más de una ubicación?
						</h2>
						<p className="text-base lg:text-sm 2xl:text-base font-medium text-slate-600 mb-6 max-w-md">
							Agrega tu primera sucursal para gestionar múltiples ubicaciones, asignar gerentes y mantener el control de cada una.
						</p>
						<button
							onClick={() => setModalCrearAbierto(true)}
							className="flex items-center gap-2 px-5 h-11 lg:h-10 2xl:h-11 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white cursor-pointer"
							style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 3px 10px rgba(30,41,59,0.35)' }}
							data-testid="btn-crear-primera-sucursal"
						>
							<Plus className="w-5 h-5" />
							Agregar sucursal
						</button>
					</div>
				</div>

				{modalCrearAbierto && (
					<ModalCrearSucursal onCerrar={() => setModalCrearAbierto(false)} />
				)}
			</div>
		);
	}

	// ═══════════════════════════════════════════════════════════════════════
	// RENDER PRINCIPAL (2+ sucursales)
	// ═══════════════════════════════════════════════════════════════════════

	return (
		<div className="p-3 lg:p-1.5 2xl:p-3" data-testid="pagina-sucursales">
			<style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />
			<div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

			{/* ══════════════════════════════════════════════════════════════
			    HEADER + KPIs
			    ══════════════════════════════════════════════════════════════ */}
			<div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4" data-testid="header-sucursales">
				{/* Icono + Título (hidden móvil) */}
				<div className="hidden lg:flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
					<div
						className="flex items-center justify-center shrink-0"
						style={{
							width: 52, height: 52, borderRadius: 14,
							background: 'linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8)',
							boxShadow: '0 6px 20px rgba(59,130,246,0.4)',
						}}
					>
						<Building2 className="w-6 h-6 text-white sucursales-icon-bounce" />
					</div>
					<div>
						<h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
							Sucursales
						</h1>
						<p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
							Gestiona tus ubicaciones
						</p>
					</div>
				</div>

				{/* KPIs */}
				<CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
					<div className="flex justify-between lg:justify-end gap-2" data-testid="kpis-sucursales">
						{/* Total */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
							style={{ background: 'linear-gradient(135deg, #f1f5f9, #fff)', borderColor: '#94a3b8' }}
							data-testid="kpi-total-sucursales"
						>
							<div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #cbd5e1, #94a3b8)', boxShadow: '0 3px 8px rgba(100,116,139,0.25)' }}
							>
								<Building2 className="w-4 h-4 text-slate-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-slate-700">{kpis?.total ?? 0}</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">Total</p>
							</div>
						</div>

						{/* Activas */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
							style={{ background: 'linear-gradient(135deg, #ecfdf5, #fff)', borderColor: '#6ee7b7' }}
							data-testid="kpi-activas"
						>
							<div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #a7f3d0, #6ee7b7)', boxShadow: '0 3px 8px rgba(16,185,129,0.25)' }}
							>
								<Building2 className="w-4 h-4 text-emerald-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-emerald-700">{kpis?.activas ?? 0}</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">Activas</p>
							</div>
						</div>

						{/* Inactivas */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
							style={{ background: 'linear-gradient(135deg, #fef2f2, #fff)', borderColor: '#fca5a5' }}
							data-testid="kpi-inactivas"
						>
							<div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
							>
								<Building2 className="w-4 h-4 text-red-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-red-700">{kpis?.inactivas ?? 0}</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">Inactivas</p>
							</div>
						</div>
					</div>
				</CarouselKPI>
			</div>

			{/* ══════════════════════════════════════════════════════════════
			    FILTROS
			    ══════════════════════════════════════════════════════════════ */}
			<div
				className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-2.5 lg:p-3 2xl:p-4 lg:mt-7 2xl:mt-14"
				data-testid="filtros-sucursales"
			>
				<div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
					{/* Chips estado (solo PC) */}
					<div className="hidden lg:flex items-center gap-1.5">
						{([
							{ label: 'Todas', valor: undefined },
							{ label: 'Activas', valor: true },
							{ label: 'Inactivas', valor: false },
						] as const).map(chip => (
							<button
								key={chip.label}
								onClick={() => setFiltroActiva(chip.valor)}
								className={`px-3 lg:px-3 2xl:px-4 h-10 lg:h-10 2xl:h-11 rounded-lg text-sm lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${
									filtroActiva === chip.valor ? 'text-white border-slate-700 shadow-sm' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
								}`}
								style={filtroActiva === chip.valor ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
								data-testid={`chip-${chip.label.toLowerCase()}`}
							>
								{chip.label}
							</button>
						))}
					</div>

					{/* Búsqueda */}
					<div className="flex-1">
						<Input
							value={busquedaLocal}
							onChange={e => setBusquedaLocal(e.target.value)}
							placeholder="Buscar sucursales..."
							className="h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base"
							icono={<Search className="w-4 h-4 text-slate-600" />}
							elementoDerecha={busquedaLocal ? (
								<button onClick={() => setBusquedaLocal('')} className="p-1 rounded-full text-red-600 hover:bg-red-100 cursor-pointer">
									<X className="w-[18px] h-[18px]" />
								</button>
							) : undefined}
							data-testid="input-busqueda-sucursales"
						/>
					</div>

					{/* Botón crear */}
					<button
						onClick={() => setModalCrearAbierto(true)}
						className="flex items-center justify-center gap-1.5 px-4 2xl:px-5 h-11 lg:h-10 2xl:h-11 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white cursor-pointer shrink-0"
						style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
						data-testid="btn-crear-sucursal"
					>
						<Plus className="w-4 h-4" />
						Nueva sucursal
					</button>
				</div>
			</div>

			{/* ══════════════════════════════════════════════════════════════
			    SEGMENTED CONTROL — ESTADO (Todas / Activas / Inactivas)
			    ══════════════════════════════════════════════════════════════ */}
			<div className="lg:hidden flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 mt-3">
				{([
					{ label: 'Todas', valor: undefined },
					{ label: 'Activas', valor: true },
					{ label: 'Inactivas', valor: false },
				] as const).map(chip => {
					const activa = filtroActiva === chip.valor;
					return (
						<button
							key={chip.label}
							onClick={() => setFiltroActiva(chip.valor)}
							className={`flex-1 flex items-center justify-center h-10 rounded-lg text-sm font-semibold cursor-pointer ${activa
								? 'text-white shadow-md'
								: 'text-slate-700'
							}`}
							style={activa ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
							data-testid={`chip-${chip.label.toLowerCase()}`}
						>
							{chip.label}
						</button>
					);
				})}
			</div>

			{/* ══════════════════════════════════════════════════════════════
			    CONTENIDO
			    ══════════════════════════════════════════════════════════════ */}
			{cargando ? (
				<div className="flex justify-center py-20">
					<Spinner />
				</div>
			) : sucursales.length === 0 ? (
				<div className="text-center py-16" data-testid="estado-vacio-sucursales">
					<Building2 className="w-14 h-14 text-slate-300 mx-auto mb-3" />
					<p className="text-slate-600 text-base font-semibold">
						{busqueda
							? 'Sin resultados'
							: filtroActiva === true
								? 'Sin sucursales activas'
								: filtroActiva === false
									? 'Sin sucursales inactivas'
									: 'Sin sucursales'}
					</p>
					<p className="text-slate-600 text-sm font-medium mt-1">
						{busqueda
							? 'Prueba con otro término de búsqueda'
							: filtroActiva === true
								? 'Todas tus sucursales están inactivas'
								: filtroActiva === false
									? 'Todas tus sucursales están activas'
									: 'Agrega tu primera sucursal'}
					</p>
				</div>
			) : (
				<>
					{/* ── Móvil: Cards ── */}
					<div className="lg:hidden mt-3 bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden">
						<div className="divide-y-[1.5px] divide-slate-300">
							{sucursales.map(suc => (
								<CardSucursalMovil
									key={suc.id}
									sucursal={suc}
									onClick={() => handleClickSucursal(suc)}
								/>
							))}
						</div>
					</div>

					{/* ── Desktop: Tabla ── */}
					<div className="hidden lg:block mt-3" data-testid="tabla-sucursales-desktop">
						<div
							className="rounded-xl overflow-hidden border-2 border-slate-300"
							style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
						>
							{/* Header */}
							<div
								className="grid grid-cols-[2fr_1fr_1.2fr_80px_100px] 2xl:grid-cols-[2fr_1fr_1.2fr_100px_120px] px-4 lg:px-3 2xl:px-5 py-2 h-12 items-center"
								style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
							>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider">Ubicación</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">Ciudad</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">Gerente</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">Estado</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">Acciones</span>
							</div>

							{/* Body */}
							<div className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-420px)] overflow-y-auto bg-white divide-y-[1.5px] divide-slate-300">
								{sucursales.map((suc) => (
									<FilaSucursalDesktop
										key={suc.id}
										sucursal={suc}
										onClick={() => handleClickSucursal(suc)}
										onEditar={() => handleEditar(suc)}
										onToggleActiva={(e) => handleToggleActiva(suc, e)}
										onEliminar={(e) => handleEliminar(suc, e)}
									/>
								))}
							</div>
						</div>
					</div>
				</>
			)}

			</div>

			{/* ══════════════════════════════════════════════════════════════
			    MODALES
			    ══════════════════════════════════════════════════════════════ */}
			{modalCrearAbierto && (
				<ModalCrearSucursal onCerrar={() => setModalCrearAbierto(false)} />
			)}

			{modalDetalleAbierto && sucursalSeleccionada && (
				<ModalDetalleSucursal
					sucursal={sucursalSeleccionada}
					onCerrar={() => { setModalDetalleAbierto(false); setSucursalSeleccionada(null); }}
					onEditar={() => { setModalDetalleAbierto(false); handleEditar(sucursalSeleccionada); }}
				/>
			)}
		</div>
	);
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function CardSucursalMovil({ sucursal, onClick }: {
	sucursal: SucursalResumen;
	onClick: () => void;
}) {
	return (
		<div
			className={`w-full flex items-center gap-3 px-3 py-3 text-left cursor-pointer hover:bg-slate-50 transition-colors ${!sucursal.activa ? 'opacity-50' : ''}`}
			onClick={onClick}
			data-testid={`card-sucursal-${sucursal.id}`}
		>
			{/* Foto de perfil de la sucursal o ícono fallback */}
			{sucursal.fotoPerfil ? (
				<div className="w-14 h-14 rounded-full overflow-hidden shrink-0 shadow-md border-2 border-white bg-white">
					<img src={sucursal.fotoPerfil} alt="" className="w-full h-full object-cover" />
				</div>
			) : (
				<div
					className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-md"
					style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
				>
					<Building2 className="w-7 h-7 text-white" />
				</div>
			)}

			{/* Info */}
			<div className="flex-1 min-w-0 flex flex-col gap-2">
				<div>
					<div className="flex items-center gap-1.5">
						<p className="text-base font-bold text-slate-900 truncate">
							{sucursal.esPrincipal ? 'Matriz' : sucursal.nombre}
						</p>
						{sucursal.esPrincipal && (
							<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-sm font-bold bg-amber-100 text-amber-700 shrink-0">
								<Star className="w-3 h-3 mr-0.5 fill-amber-500" />
								Matriz
							</span>
						)}
					</div>
					<p className="text-sm font-medium text-slate-600 truncate mt-0.5">
						<MapPin className="w-3 h-3 inline mr-1" />
						{sucursal.ciudad}
						{sucursal.telefono && (
							<>
								{' · '}
								<Phone className="w-3 h-3 inline mr-0.5" />
								{sucursal.telefono}
							</>
						)}
					</p>
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					{sucursal.gerente ? (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700">
							<User className="w-3 h-3" />
							{sucursal.gerente.nombre}
						</span>
					) : (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold bg-slate-200 text-slate-600">
							Sin gerente
						</span>
					)}
					{!sucursal.activa && (
						<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-sm font-bold bg-red-100 text-red-700">
							Inactiva
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function FilaSucursalDesktop({ sucursal, onClick, onEditar, onToggleActiva, onEliminar }: {
	sucursal: SucursalResumen;
	onClick: () => void;
	onEditar: () => void;
	onToggleActiva: (e: React.MouseEvent) => void;
	onEliminar: (e: React.MouseEvent) => void;
}) {
	return (
		<div
			className={`grid grid-cols-[2fr_1fr_1.2fr_80px_100px] 2xl:grid-cols-[2fr_1fr_1.2fr_100px_120px] px-4 lg:px-3 2xl:px-5 py-3 items-center cursor-pointer bg-white hover:bg-slate-50 transition-colors ${!sucursal.activa ? 'opacity-60' : ''}`}
			onClick={onClick}
			data-testid={`fila-sucursal-${sucursal.id}`}
		>
			{/* Nombre */}
			<div className="flex items-center gap-2.5 min-w-0">
				{sucursal.fotoPerfil ? (
					<div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full overflow-hidden shrink-0 shadow-md border-2 border-white bg-white">
						<img src={sucursal.fotoPerfil} alt="" className="w-full h-full object-cover" />
					</div>
				) : (
					<div
						className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full flex items-center justify-center shrink-0 shadow-md"
						style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
					>
						<Building2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
					</div>
				)}
				<div className="min-w-0">
					<div className="flex items-center gap-1.5">
						<p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-900 truncate">
							{sucursal.esPrincipal ? 'Matriz' : sucursal.nombre}
						</p>
						{sucursal.esPrincipal && (
							<Star className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-amber-500 fill-amber-500 shrink-0" />
						)}
					</div>
					{sucursal.telefono && (
						<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 truncate">
							{sucursal.telefono}
						</p>
					)}
				</div>
			</div>

			{/* Ciudad */}
			<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 text-center truncate">{sucursal.ciudad}</p>

			{/* Gerente */}
			<div className="text-center">
				{sucursal.gerente ? (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-indigo-100 text-indigo-700">
						<User className="w-3 h-3" />
						{sucursal.gerente.nombre}
					</span>
				) : (
					<span className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">Sin gerente</span>
				)}
			</div>

			{/* Estado */}
			<div className="text-center">
				<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold ${
					sucursal.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
				}`}>
					{sucursal.activa ? 'Activa' : 'Inactiva'}
				</span>
			</div>

			{/* Acciones */}
			<div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
				<Tooltip text="Ver detalle">
					<button
						onClick={onClick}
						className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 cursor-pointer"
						data-testid={`btn-detalle-${sucursal.id}`}
					>
						<Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
					</button>
				</Tooltip>
				<Tooltip text="Editar en Mi Perfil">
					<button
						onClick={(e) => { e.stopPropagation(); onEditar(); }}
						className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 cursor-pointer"
						data-testid={`btn-editar-${sucursal.id}`}
					>
						<Pencil className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
					</button>
				</Tooltip>
				<Tooltip text={sucursal.esPrincipal ? 'La Matriz no se puede desactivar' : sucursal.activa ? 'Desactivar' : 'Activar'}>
					<button
						onClick={onToggleActiva}
						disabled={sucursal.esPrincipal}
						className={`p-1.5 rounded-lg ${sucursal.esPrincipal ? 'text-slate-300 cursor-not-allowed' : sucursal.activa ? 'text-emerald-600 hover:bg-emerald-100 cursor-pointer' : 'text-slate-400 hover:bg-slate-200 cursor-pointer'}`}
						data-testid={`btn-toggle-${sucursal.id}`}
					>
						<Power className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
					</button>
				</Tooltip>
				<Tooltip text={sucursal.esPrincipal ? 'La Matriz no se puede eliminar' : 'Eliminar'}>
					<button
						onClick={onEliminar}
						disabled={sucursal.esPrincipal}
						className={`p-1.5 rounded-lg ${sucursal.esPrincipal ? 'text-slate-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-100 cursor-pointer'}`}
						data-testid={`btn-eliminar-${sucursal.id}`}
					>
						<Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
					</button>
				</Tooltip>
			</div>
		</div>
	);
}
