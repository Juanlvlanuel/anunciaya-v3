/**
 * ============================================================================
 * PÁGINA: Empleados (Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/empleados/PaginaEmpleados.tsx
 *
 * PATRÓN: Replica PaginaClientes/PaginaAlertas
 * - Header con icono animado (hidden móvil)
 * - KPIs en CarouselKPI
 * - Filtros: búsqueda + chips estado + botón crear
 * - Vista dual: cards móvil / tabla desktop
 * - Scroll infinito móvil + "Cargar más" desktop
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
	UserCog,
	Search,
	Plus,
	Users,
	UserCheck,
	UserX,
	Star,
	Clock,
	ShoppingCart,
	MessageSquare,
	Eye,
	Trash2,
	X,
	MapPin,
	Shield,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import {
	useEmpleadosKPIs,
	useEmpleadosLista,
	useEmpleadoDetalle,
	useToggleEmpleadoActivo,
	useEliminarEmpleado,
} from '../../../../hooks/queries/useEmpleados';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { CarouselKPI } from '../../../../components/ui/CarouselKPI';
import { notificar } from '../../../../utils/notificaciones';
import Tooltip from '../../../../components/ui/Tooltip';
import { obtenerIniciales } from '../../../../utils/obtenerIniciales';
import { ModalEmpleado } from './ModalEmpleado';
import { ModalDetalleEmpleado } from './ModalDetalleEmpleado';
import type { EmpleadoResumen } from '../../../../types/empleados';
// =============================================================================
// CSS — Animación del icono del header
// =============================================================================
const ESTILO_ICONO_HEADER = `
  @keyframes empleados-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .empleados-icon-bounce {
    animation: empleados-icon-bounce 2s ease-in-out infinite;
  }
`;
// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================
export default function PaginaEmpleados() {
	const { usuario } = useAuthStore();
	// Estado UI local
	const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
	const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
	const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);
	const [busquedaLocal, setBusquedaLocal] = useState('');
	const [busqueda, setBusqueda] = useState('');
	const [filtroActivo, setFiltroActivo] = useState<boolean | undefined>(undefined);

	// Reset filtros al cambiar de sucursal (jerarquía sucursal > toggle > filtros).
	// Se resetean AMBOS estados: el input local (busquedaLocal) y el debounceado (busqueda).
	useEffect(() => {
		setBusquedaLocal('');
		setBusqueda('');
		setFiltroActivo(undefined);
	}, [usuario?.sucursalActiva]);
	const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState<string | null>(null);
	const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
	const sentinelaRef = useRef<HTMLDivElement | null>(null);
	const esGerente = !!usuario?.sucursalAsignada;
	// React Query — datos del servidor
	const kpisQuery = useEmpleadosKPIs();
	const kpis = kpisQuery.data ?? null;
	const listaQuery = useEmpleadosLista({ busqueda, activo: filtroActivo });
	const empleados = listaQuery.data?.pages.flatMap((p) => p.empleados) ?? [];
	const total = listaQuery.data?.pages[0]?.total ?? 0;
	const cargandoEmpleados = listaQuery.isPending;
	const cargandoMas = listaQuery.isFetchingNextPage;
	const hayMas = listaQuery.hasNextPage;
	const detalleQuery = useEmpleadoDetalle(empleadoSeleccionadoId);
	const empleadoDetalle = detalleQuery.data ?? null;
	const toggleActivoMutation = useToggleEmpleadoActivo();
	const eliminarMutation = useEliminarEmpleado();
	// Detectar móvil
	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 1024);
		window.addEventListener('resize', check);
		return () => window.removeEventListener('resize', check);
	}, []);
	// Scroll infinito móvil
	const { fetchNextPage } = listaQuery;
	useEffect(() => {
		if (!isMobile || !sentinelaRef.current) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hayMas && !cargandoMas) {
					fetchNextPage();
				}
			},
			{ rootMargin: '100px' }
		);
		observer.observe(sentinelaRef.current);
		return () => observer.disconnect();
	}, [isMobile, hayMas, cargandoMas, fetchNextPage]);
	// Debounce búsqueda
	useEffect(() => {
		const timer = setTimeout(() => {
			if (busquedaLocal !== busqueda) {
				setBusqueda(busquedaLocal);
			}
		}, 400);
		return () => clearTimeout(timer);
	}, [busquedaLocal, busqueda]);
	// ─── Aplicar búsqueda desde query param (navegación desde Reportes) ───
	const [searchParams, setSearchParams] = useSearchParams();
	const busquedaQueryParam = searchParams.get('busqueda');
	useEffect(() => {
		if (busquedaQueryParam) {
			setBusquedaLocal(busquedaQueryParam);
			setBusqueda(busquedaQueryParam);
		}
	}, [busquedaQueryParam]);
	useEffect(() => {
		if (!busquedaQueryParam) return;
		const timer = setTimeout(() => {
			setSearchParams({}, { replace: true });
		}, 100);
		return () => clearTimeout(timer);
	}, [busquedaQueryParam, setSearchParams]);
	const handleClickEmpleado = useCallback((emp: EmpleadoResumen) => {
		setEmpleadoSeleccionadoId(emp.id);
		setModalDetalleAbierto(true);
	}, []);
	const handleEditar = useCallback((emp: EmpleadoResumen) => {
		setEmpleadoSeleccionadoId(emp.id);
		setModalEditarAbierto(true);
	}, []);
	return (
		<div className="p-3 lg:p-1.5 2xl:p-3" data-testid="pagina-empleados">
			<style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />
			<div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">
			{/* ══════════════════════════════════════════════════════════════
			    HEADER + KPIs
			    ══════════════════════════════════════════════════════════════ */}
			<div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4" data-testid="header-empleados">
				{/* Icono + Título (hidden móvil) */}
				<div className="hidden lg:flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
					<div
						className="flex items-center justify-center shrink-0"
						style={{
							width: 52, height: 52, borderRadius: 14,
							background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)',
							boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
						}}
					>
						<UserCog className="w-6 h-6 text-white empleados-icon-bounce" />
					</div>
					<div>
						<h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
							Empleados
						</h1>
						<p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
							Gestión de equipo
						</p>
					</div>
				</div>
				{/* KPIs */}
				<CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
					<div className="flex justify-between lg:justify-end gap-2" data-testid="kpis-empleados">
						{/* Total */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
							style={{ background: 'linear-gradient(135deg, #f1f5f9, #fff)', borderColor: '#94a3b8' }}
							data-testid="kpi-total-empleados"
						>
							<div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #cbd5e1, #94a3b8)', boxShadow: '0 3px 8px rgba(100,116,139,0.25)' }}
							>
								<Users className="w-4 h-4 text-slate-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-slate-700">{kpis?.total ?? 0}</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">Total</p>
							</div>
						</div>
						{/* Activos */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
							style={{ background: 'linear-gradient(135deg, #ecfdf5, #fff)', borderColor: '#6ee7b7' }}
							data-testid="kpi-activos"
						>
							<div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #a7f3d0, #6ee7b7)', boxShadow: '0 3px 8px rgba(16,185,129,0.25)' }}
							>
								<UserCheck className="w-4 h-4 text-emerald-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-emerald-700">{kpis?.activos ?? 0}</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">Activos</p>
							</div>
						</div>
						{/* Inactivos */}
						<div
							className="flex items-center gap-2 2xl:gap-2.5 px-3 2xl:px-4 h-13 2xl:h-16 rounded-xl border-2 flex-1 lg:flex-none lg:shrink-0"
							style={{ background: 'linear-gradient(135deg, #fef2f2, #fff)', borderColor: '#fca5a5' }}
							data-testid="kpi-inactivos"
						>
							<div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0"
								style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
							>
								<UserX className="w-4 h-4 text-red-700" />
							</div>
							<div>
								<p className="text-[16px] lg:text-sm 2xl:text-base font-extrabold text-red-700">{kpis?.inactivos ?? 0}</p>
								<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold -mt-0.5">Inactivos</p>
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
				data-testid="filtros-empleados"
			>
				<div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
					{/* Chips estado (solo PC) */}
					<div className="hidden lg:flex items-center gap-1.5">
						{([
							{ label: 'Todos', valor: undefined },
							{ label: 'Activos', valor: true },
							{ label: 'Inactivos', valor: false },
						] as const).map(chip => (
							<button
								key={chip.label}
								onClick={() => setFiltroActivo(chip.valor)}
								className={`px-3 lg:px-3 2xl:px-4 h-10 lg:h-10 2xl:h-11 rounded-lg text-sm lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${
									filtroActivo === chip.valor ? 'text-white border-slate-700 shadow-sm' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
								}`}
								style={filtroActivo === chip.valor ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
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
							placeholder="Buscar empleados..."
							className="h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base"
							icono={<Search className="w-4 h-4 text-slate-600" />}
							elementoDerecha={busquedaLocal ? (
								<button onClick={() => setBusquedaLocal('')} className="p-1 rounded-full text-red-600 hover:bg-red-100 cursor-pointer">
									<X className="w-[18px] h-[18px]" />
								</button>
							) : undefined}
							data-testid="input-busqueda-empleados"
						/>
					</div>
					{/* Botón crear — disponible para dueños y gerentes (gerente solo puede crear en su sucursal) */}
					<button
						onClick={() => setModalCrearAbierto(true)}
						className="flex items-center justify-center gap-1.5 px-4 2xl:px-5 h-11 lg:h-10 2xl:h-11 rounded-lg text-base lg:text-sm 2xl:text-base font-bold text-white cursor-pointer shrink-0"
						style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
						data-testid="btn-crear-empleado"
					>
						<Plus className="w-4 h-4" />
						Nuevo empleado
					</button>
				</div>
			</div>

			{/* ══════════════════════════════════════════════════════════════
			    SEGMENTED CONTROL — ESTADO (Todos / Activos / Inactivos)
			    ══════════════════════════════════════════════════════════════ */}
			<div className="lg:hidden flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 mt-3">
				{([
					{ label: 'Todos', valor: undefined },
					{ label: 'Activos', valor: true },
					{ label: 'Inactivos', valor: false },
				] as const).map(chip => {
					const activa = filtroActivo === chip.valor;
					return (
						<button
							key={chip.label}
							onClick={() => setFiltroActivo(chip.valor)}
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
			{cargandoEmpleados ? (
				<div className="flex justify-center py-20">
					<Spinner />
				</div>
			) : empleados.length === 0 ? (
				<div className="text-center py-16" data-testid="estado-vacio-empleados">
					<UserCog className="w-14 h-14 text-slate-300 mx-auto mb-3" />
					<p className="text-slate-600 text-base font-semibold">
						{busqueda
							? 'Sin resultados'
							: filtroActivo === true
								? 'Sin empleados activos'
								: filtroActivo === false
									? 'Sin empleados inactivos'
									: 'Sin empleados registrados'}
					</p>
					<p className="text-slate-600 text-sm font-medium mt-1">
						{busqueda
							? 'Prueba con otro término de búsqueda'
							: filtroActivo === true
								? 'Todos tus empleados están inactivos'
								: filtroActivo === false
									? 'Todos tus empleados están activos'
									: 'Agrega tu primer empleado'}
					</p>
				</div>
			) : (
				<>
					{/* ── Móvil: Lista + scroll infinito ── */}
					<div className="lg:hidden mt-3">
						<div className="bg-white rounded-xl shadow-sm border-2 border-slate-300 overflow-hidden">
							<div className="divide-y-[1.5px] divide-slate-300">
								{empleados.map(emp => (
									<CardEmpleadoMovil
										key={emp.id}
										empleado={emp}
										onClick={() => handleClickEmpleado(emp)}
									/>
								))}
							</div>
						</div>
						<div ref={sentinelaRef} className="h-1" />
						{cargandoMas && (
							<div className="flex justify-center py-3">
								<Spinner />
							</div>
						)}
					</div>

					{/* ── Desktop: Tabla ── */}
					<div className="hidden lg:block mt-3" data-testid="tabla-empleados-desktop">
						<div
							className="rounded-xl overflow-hidden border-2 border-slate-300"
							style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
						>
							{/* Header */}
							<div
								className="grid grid-cols-[2fr_1fr_1fr_100px_50px] 2xl:grid-cols-[2fr_1fr_1fr_120px_60px] px-4 lg:px-3 2xl:px-5 py-2 h-12 items-center"
								style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
							>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider">Empleado</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">Sucursal</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">Permisos</span>
								<span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-center">Estado</span>
								<span></span>
							</div>

							{/* Body */}
							<div className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-420px)] overflow-y-auto bg-white">
								{empleados.map((emp, i) => (
									<FilaEmpleadoDesktop
										key={emp.id}
										empleado={emp}
										indice={i}
										onClick={() => handleClickEmpleado(emp)}
										onEditar={() => handleEditar(emp)}
										onEliminar={async (e) => { e.stopPropagation(); const ok = await notificar.confirmar(`¿Eliminar a "${emp.nombre}"? Se perderá el historial de sus transacciones.`); if (ok) { eliminarMutation.mutate(emp.id); } }}
									/>
								))}
							</div>

							{/* Cargar más */}
							{hayMas && (
								<button
									onClick={() => fetchNextPage()}
									disabled={cargandoMas}
									className="w-full py-2.5 text-[11px] 2xl:text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer border-t border-slate-200"
									data-testid="btn-cargar-mas-empleados"
								>
									{cargandoMas ? 'Cargando...' : 'Cargar más empleados'}
								</button>
							)}
						</div>
					</div>
				</>
			)}

			</div>

			{/* ══════════════════════════════════════════════════════════════
			    MODALES
			    ══════════════════════════════════════════════════════════════ */}
			{modalCrearAbierto && (
				<ModalEmpleado
					onCerrar={() => setModalCrearAbierto(false)}
				/>
			)}

			{modalEditarAbierto && empleadoDetalle && (
				<ModalEmpleado
					empleado={empleadoDetalle}
					onCerrar={() => setModalEditarAbierto(false)}
				/>
			)}

			{modalDetalleAbierto && empleadoDetalle && (
				<ModalDetalleEmpleado
					empleado={empleadoDetalle}
					onCerrar={() => setModalDetalleAbierto(false)}
					onEditar={() => { setModalDetalleAbierto(false); setModalEditarAbierto(true); }}
				/>
			)}
		</div>
	);
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function CardEmpleadoMovil({ empleado, onClick }: {
	empleado: EmpleadoResumen;
	onClick: () => void;
}) {
	const permisosActivos = Object.values(empleado.permisos).filter(Boolean).length;

	return (
		<div
			className={`w-full flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${!empleado.activo ? 'opacity-50' : ''}`}
			onClick={onClick}
			data-testid={`card-empleado-${empleado.id}`}
		>
			{/* Avatar */}
			<div className="w-14 h-14 rounded-full bg-linear-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
				{empleado.fotoUrl ? (
					<img src={empleado.fotoUrl} alt={empleado.nombre} className="w-full h-full object-cover" />
				) : (
					<span className="text-lg font-bold text-white">
						{obtenerIniciales(empleado.nombre)}
					</span>
				)}
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0 flex flex-col gap-2">
				<div>
					<div className="flex items-center gap-1.5">
						<p className="text-base font-bold text-slate-800 truncate">{empleado.nombre}</p>
						{!empleado.activo && (
							<span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-sm font-bold bg-red-100 text-red-700 shrink-0">Inactivo</span>
						)}
					</div>
					{(empleado.nick || empleado.especialidad) && (
						<p className="text-sm font-medium text-slate-600 truncate mt-0.5">
							{empleado.nick && `@${empleado.nick}`}
							{empleado.nick && empleado.especialidad && ' · '}
							{empleado.especialidad}
						</p>
					)}
				</div>
				<div className="flex items-center gap-1.5 flex-wrap">
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold bg-slate-200 text-slate-700">
						<MapPin className="w-3 h-3" />
						{empleado.sucursalNombre ?? 'Sin sucursal'}
					</span>
					{empleado.activo && (
						<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold bg-linear-to-br from-blue-500 via-blue-600 to-blue-700 text-white">
							<Shield className="w-3 h-3" />
							{permisosActivos}/5
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function FilaEmpleadoDesktop({ empleado, indice, onClick, onEditar, onEliminar }: {
	empleado: EmpleadoResumen;
	indice: number;
	onClick: () => void;
	onEditar: () => void;
	onEliminar: (e: React.MouseEvent) => void;
}) {
	const permisosActivos = Object.values(empleado.permisos).filter(Boolean).length;

	return (
		<div
			className={`grid grid-cols-[2fr_1fr_1fr_100px_50px] 2xl:grid-cols-[2fr_1fr_1fr_120px_60px]
				px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2.5
				text-sm lg:text-xs 2xl:text-sm items-center cursor-pointer
				border-b border-slate-300
				${indice % 2 === 0 ? 'bg-white' : 'bg-slate-100'}
				${!empleado.activo ? 'opacity-50' : ''}
				hover:bg-slate-200`}
			onClick={onClick}
			data-testid={`fila-empleado-${empleado.id}`}
		>
			{/* Empleado */}
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
					{empleado.fotoUrl ? (
						<img src={empleado.fotoUrl} alt="" className="w-full h-full object-cover" />
					) : (
						<span className="text-xs font-bold text-slate-600">{obtenerIniciales(empleado.nombre)}</span>
					)}
				</div>
				<div className="min-w-0">
					<p className="font-semibold text-slate-800 truncate">{empleado.nombre}</p>
					<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-500 font-medium truncate">
						{empleado.nick ? `@${empleado.nick}` : 'Sin nick'}
						{empleado.especialidad ? ` · ${empleado.especialidad}` : ''}
					</p>
				</div>
			</div>

			{/* Sucursal */}
			<div className="text-center text-slate-600 font-medium truncate">
				{empleado.sucursalNombre ?? '—'}
			</div>

			{/* Permisos */}
			<div className="flex items-center justify-center gap-1">
				<span className="inline-flex items-center px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-slate-200 text-slate-600">
					{permisosActivos}/5
				</span>
			</div>

			{/* Estado */}
			<div className="flex items-center justify-center">
				{empleado.activo ? (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-emerald-100 text-emerald-700">
						Activo
					</span>
				) : (
					<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-red-100 text-red-600">
						Inactivo
					</span>
				)}
			</div>

			{/* Eliminar */}
			<div className="flex items-center justify-center">
				<Tooltip text="Eliminar">
					<button
						onClick={onEliminar}
						className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 cursor-pointer"
						data-testid={`btn-eliminar-${empleado.id}`}
					>
						<Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
					</button>
				</Tooltip>
			</div>
		</div>
	);
}
