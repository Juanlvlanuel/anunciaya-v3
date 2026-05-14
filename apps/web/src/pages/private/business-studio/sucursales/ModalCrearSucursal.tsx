/**
 * ModalCrearSucursal.tsx
 * =======================
 * Modal para crear una nueva sucursal.
 * Usa ModalAdaptativo con formulario de campos esenciales.
 * Al crear, muestra progreso animado mientras el backend clona datos de Matriz.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/sucursales/ModalCrearSucursal.tsx
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
	Building2, Save,
	Image as ImageIcon, CheckCircle2, PackageOpen,
	Maximize2, X, Tag,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const CreditCard = (p: IconoWrapperProps) => <Icon icon={ICONOS.pagos} {...p} />;
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { useCrearSucursal, useSucursalesLista } from '../../../../hooks/queries/useSucursales';
import { notificar } from '../../../../utils/notificaciones';
import { buscarCiudades, type CiudadConNombreCompleto } from '../../../../data/ciudadesPopulares';
import { InputTelefono, normalizarTelefono } from '../../../../components/ui/InputTelefono';
import { InputCorreoValidado } from '../../../../components/ui/InputCorreoValidado';
import 'leaflet/dist/leaflet.css';

// Fix iconos de Leaflet (mismo patrón que TabUbicacion de Mi Perfil)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Componente interno: centra el mapa cuando cambian las coordenadas
function CentrarMapa({ lat, lng, forzar }: { lat: number; lng: number; forzar: number }) {
	const map = useMap();
	useEffect(() => {
		map.setView([lat, lng], map.getZoom() || 14);
	}, [lat, lng, forzar, map]);
	return null;
}

// Componente interno: marcador arrastrable que notifica cambios de posición
function MarcadorArrastrable({ lat, lng, onMover }: { lat: number; lng: number; onMover: (lat: number, lng: number) => void }) {
	const [pos, setPos] = useState<[number, number]>([lat, lng]);

	useEffect(() => {
		setPos([lat, lng]);
	}, [lat, lng]);

	return (
		<Marker
			position={pos}
			draggable
			eventHandlers={{
				dragend(e: L.DragEndEvent) {
					const p = e.target.getLatLng();
					setPos([p.lat, p.lng]);
					onMover(p.lat, p.lng);
				},
			}}
		/>
	);
}

// =============================================================================
// TIPOS
// =============================================================================

interface Props {
	onCerrar: () => void;
}

interface PasoProgreso {
	icono: React.ReactNode;
	label: string;
	delay: number; // ms desde el inicio para marcar como "en progreso"
}

// =============================================================================
// CONFIGURACIÓN DE PASOS
// =============================================================================

const PASOS: PasoProgreso[] = [
	{ icono: <Building2 className="w-4 h-4" />, label: 'Creando sucursal', delay: 0 },
	{ icono: <Clock className="w-4 h-4" />, label: 'Copiando horarios', delay: 700 },
	{ icono: <CreditCard className="w-4 h-4" />, label: 'Copiando métodos de pago', delay: 1400 },
	{ icono: <ImageIcon className="w-4 h-4" />, label: 'Duplicando imágenes', delay: 2100 },
	{ icono: <PackageOpen className="w-4 h-4" />, label: 'Copiando catálogo', delay: 2900 },
	{ icono: <Tag className="w-4 h-4" />, label: 'Copiando ofertas', delay: 3700 },
];

// =============================================================================
// CSS ANIMACIONES
// =============================================================================

const ESTILOS_PROGRESO = `
	@keyframes progreso-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	@keyframes progreso-check-in {
		0% { transform: scale(0) rotate(-45deg); opacity: 0; }
		60% { transform: scale(1.2) rotate(5deg); opacity: 1; }
		100% { transform: scale(1) rotate(0deg); opacity: 1; }
	}
	@keyframes progreso-bar-fill {
		from { width: 0%; }
	}
	@keyframes progreso-confetti {
		0% { transform: translateY(0) rotate(0deg); opacity: 1; }
		100% { transform: translateY(-30px) rotate(180deg); opacity: 0; }
	}
	.progreso-paso-activo {
		animation: progreso-pulse 1.2s ease-in-out infinite;
	}
	.progreso-check-enter {
		animation: progreso-check-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}
`;

// =============================================================================
// COMPONENTE: Vista de Progreso
// =============================================================================

function VistaProgreso({ completado, onFinalizar }: { completado: boolean; onFinalizar: () => void }) {
	const [pasoActual, setPasoActual] = useState(0);
	const [pasosCompletados, setPasosCompletados] = useState<boolean[]>(Array(PASOS.length).fill(false));

	// Avanzar pasos con timers
	useEffect(() => {
		const timers: ReturnType<typeof setTimeout>[] = [];

		PASOS.forEach((paso, index) => {
			if (index === 0) return; // El primer paso empieza inmediatamente

			const timer = setTimeout(() => {
				// Marcar el anterior como completado
				setPasosCompletados(prev => {
					const nuevo = [...prev];
					nuevo[index - 1] = true;
					return nuevo;
				});
				setPasoActual(index);
			}, paso.delay);

			timers.push(timer);
		});

		return () => timers.forEach(clearTimeout);
	}, []);

	// Cuando el request real termina, completar todos los pasos
	useEffect(() => {
		if (!completado) return;

		setPasosCompletados(Array(PASOS.length).fill(true));
		setPasoActual(PASOS.length);

		const timer = setTimeout(onFinalizar, 1200);
		return () => clearTimeout(timer);
	}, [completado, onFinalizar]);

	const porcentaje = completado
		? 100
		: Math.min(95, Math.round((pasosCompletados.filter(Boolean).length / PASOS.length) * 95));

	return (
		<div className="flex flex-col h-full" data-testid="progreso-crear-sucursal">
			<style dangerouslySetInnerHTML={{ __html: ESTILOS_PROGRESO }} />

			{/* Header — mismo estilo que el formulario */}
			<div
				className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-3 lg:py-3 2xl:py-4 lg:rounded-t-2xl transition-all duration-700"
				style={{
					background: completado
						? 'linear-gradient(135deg, #064e3b, #065f46)'
						: 'linear-gradient(135deg, #1e293b, #334155)',
					boxShadow: completado
						? '0 4px 16px rgba(6,78,59,0.35)'
						: '0 4px 16px rgba(30,41,59,0.3)',
				}}
			>
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-white/10 flex items-center justify-center">
						{completado ? (
							<CheckCircle2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white progreso-check-enter" />
						) : (
							<Building2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white progreso-paso-activo" />
						)}
					</div>
					<div>
						<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">
							{completado ? '¡Sucursal creada!' : 'Creando sucursal...'}
						</h2>
						<p className="text-base lg:text-xs 2xl:text-sm text-white/70 font-medium">
							{completado ? 'Todos los datos fueron copiados de tu Matriz' : 'Copiando datos de tu Matriz'}
						</p>
					</div>
				</div>
			</div>

			{/* Contenido */}
			<div className="flex-1 flex flex-col justify-center px-4 lg:px-3 2xl:px-4 py-4 space-y-4">

				{/* Barra de progreso */}
				<div>
					<div className="h-2 bg-slate-200 rounded-full overflow-hidden">
						<div
							className="h-full rounded-full transition-all duration-700 ease-out"
							style={{
								width: `${porcentaje}%`,
								background: completado
									? 'linear-gradient(90deg, #059669, #10b981)'
									: 'linear-gradient(90deg, #334155, #475569)',
							}}
						/>
					</div>
					<div className="flex justify-between mt-1.5">
						<span className="text-xs lg:text-[11px] 2xl:text-xs font-medium text-slate-400">
							{completado ? 'Completado' : 'En progreso'}
						</span>
						<span className="text-xs lg:text-[11px] 2xl:text-xs font-bold text-slate-600">
							{porcentaje}%
						</span>
					</div>
				</div>

				{/* Lista de pasos */}
				<div className="space-y-2">
					{PASOS.map((paso, index) => {
						const estaCompletado = pasosCompletados[index];
						const estaActivo = pasoActual === index && !completado;

						return (
							<div
								key={index}
								className={`flex items-center gap-3 px-3 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl border-2 transition-all duration-300 ${
									estaCompletado
										? 'bg-emerald-50 border-emerald-200'
										: estaActivo
											? 'bg-slate-50 border-slate-300'
											: 'bg-slate-50 border-slate-200'
								}`}
							>
								{/* Indicador */}
								<div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
									estaCompletado
										? 'bg-emerald-500'
										: estaActivo
											? 'bg-slate-700'
											: 'bg-slate-200'
								}`}>
									{estaCompletado ? (
										<CheckCircle2 className="w-4 h-4 text-white progreso-check-enter" />
									) : (
										<span className={estaActivo ? 'text-white progreso-paso-activo' : 'text-slate-400'}>
											{paso.icono}
										</span>
									)}
								</div>

								{/* Label */}
								<span className={`text-sm lg:text-xs 2xl:text-sm font-semibold transition-colors duration-300 flex-1 ${
									estaCompletado
										? 'text-emerald-700'
										: estaActivo
											? 'text-slate-800'
											: 'text-slate-400'
								}`}>
									{paso.label}
								</span>

								{/* Estado derecho */}
								{estaCompletado && (
									<span className="text-xs lg:text-[11px] 2xl:text-xs font-bold text-emerald-600">
										Listo
									</span>
								)}
								{estaActivo && (
									<div className="w-4 h-4 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin shrink-0" />
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalCrearSucursal({ onCerrar }: Props) {
	const crearMutation = useCrearSucursal();

	// Lista de sucursales existentes (para validar nombres duplicados en tiempo real)
	const sucursalesListaQuery = useSucursalesLista({});
	const sucursalesExistentes = sucursalesListaQuery.data ?? [];

	const [nombre, setNombre] = useState('');
	const [ciudad, setCiudad] = useState('');
	const [estado, setEstado] = useState('');
	const [busquedaCiudad, setBusquedaCiudad] = useState('');
	const [sugerencias, setSugerencias] = useState<CiudadConNombreCompleto[]>([]);
	const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
	const [inputCiudadActivo, setInputCiudadActivo] = useState(false);
	const sugerenciasRef = useRef<HTMLDivElement>(null);
	const [direccion, setDireccion] = useState('');
	const [telefono, setTelefono] = useState('');
	const [whatsapp, setWhatsapp] = useState('');
	const [correo, setCorreo] = useState('');

	// Coordenadas — se auto-llenan al seleccionar ciudad; el usuario ajusta el marcador en el mapa
	const [latitud, setLatitud] = useState<number | null>(null);
	const [longitud, setLongitud] = useState<number | null>(null);
	const [mapaKey, setMapaKey] = useState(0); // fuerza re-centrado al cambiar ciudad

	// Estados del flujo
	const [mostrandoProgreso, setMostrandoProgreso] = useState(false);
	const [requestCompletado, setRequestCompletado] = useState(false);
	const [, setHuboError] = useState(false);

	// Popup fullscreen del mapa — permite ajustar el marcador con mucho más espacio
	const [mapaFullscreen, setMapaFullscreen] = useState(false);

	// Validación en vivo: ¿el nombre ya existe en otra sucursal del negocio?
	// Comparación case-insensitive + trim, activa recién cuando el usuario escribe algo.
	const esNombreDuplicado = useMemo(() => {
		const normalizado = nombre.trim().toLowerCase();
		if (!normalizado) return false;
		return sucursalesExistentes.some(
			(s) => (s.nombre ?? '').trim().toLowerCase() === normalizado
		);
	}, [nombre, sucursalesExistentes]);

	const handleSeleccionarCiudad = (sug: CiudadConNombreCompleto) => {
		setCiudad(sug.nombre);
		setEstado(sug.estado);
		setMostrarSugerencias(false);
		setBusquedaCiudad('');
		// Auto-llenar coordenadas con el centro de la ciudad seleccionada
		setLatitud(sug.coordenadas.lat);
		setLongitud(sug.coordenadas.lng);
		setMapaKey(k => k + 1); // fuerza recentrado del mapa
	};

	const handleGuardar = async () => {
		if (!nombre.trim() || !ciudad.trim() || !estado.trim()) {
			notificar.error('Nombre, ciudad y estado son obligatorios');
			return;
		}

		if (esNombreDuplicado) {
			notificar.error('Ya existe una sucursal con ese nombre en este negocio');
			return;
		}

		if (latitud === null || longitud === null) {
			notificar.error('Selecciona una ciudad para fijar la ubicación');
			return;
		}

		// Validación de longitud exacta: normalizamos y revisamos que el número tenga 10 dígitos
		const numeroTelefono = normalizarTelefono(telefono).numero;
		if (telefono && telefono.trim() !== '' && numeroTelefono.length !== 10) {
			notificar.error('El teléfono debe tener 10 dígitos');
			return;
		}
		const numeroWhatsapp = normalizarTelefono(whatsapp).numero;
		if (whatsapp && whatsapp.trim() !== '' && numeroWhatsapp.length !== 10) {
			notificar.error('El WhatsApp debe tener 10 dígitos');
			return;
		}

		// Mostrar progreso y disparar request simultáneamente
		setMostrandoProgreso(true);
		setHuboError(false);

		try {
			await crearMutation.mutateAsync({
				nombre: nombre.trim(),
				ciudad: ciudad.trim(),
				estado: estado.trim(),
				direccion: direccion.trim() || undefined,
				// Solo enviar si hay un número completo (no solo la lada "+52")
				telefono: numeroTelefono.length === 10 ? telefono.trim() : undefined,
				whatsapp: numeroWhatsapp.length === 10 ? whatsapp.trim() : undefined,
				correo: correo.trim() || undefined,
				latitud,
				longitud,
			});
			setRequestCompletado(true);
		} catch (error) {
			setHuboError(true);
			setMostrandoProgreso(false);
			// Mostrar mensaje específico si el backend reporta duplicado
			const axiosError = error as { response?: { data?: { code?: string; error?: string } } };
			if (axiosError?.response?.data?.code === 'NOMBRE_DUPLICADO') {
				notificar.error(axiosError.response.data.error || 'Ya existe una sucursal con ese nombre');
			} else {
				notificar.error('No se pudo crear la sucursal');
			}
		}
	};

	const handleFinProgreso = () => {
		onCerrar();
	};

	return (
		<>
		<ModalAdaptativo
			abierto={true}
			onCerrar={mostrandoProgreso ? () => {} : onCerrar}
			ancho="md"
			mostrarHeader={false}
			paddingContenido="none"
			sinScrollInterno
			alturaMaxima="xl"
			headerOscuro
			className="max-lg:[background:linear-gradient(180deg,#1e293b_2.5rem,rgb(248,250,252)_2.5rem)]"
		>
			<div data-testid="modal-crear-sucursal" className="flex flex-col" style={{ height: window.innerWidth >= 1024 ? '70vh' : '90vh' }}>

				{/* ============================================================ */}
				{/* VISTA: Progreso animado                                      */}
				{/* ============================================================ */}
				{mostrandoProgreso ? (
					<VistaProgreso
						completado={requestCompletado}
						onFinalizar={handleFinProgreso}
					/>
				) : (
					<>
						{/* ============================================================ */}
						{/* VISTA: Formulario                                            */}
						{/* ============================================================ */}

						{/* Header */}
						<div
							className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-3 lg:py-3 2xl:py-4 lg:rounded-t-2xl"
							style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.3)' }}
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-white/10 flex items-center justify-center">
									<Building2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
								</div>
								<div>
									<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">
										Nueva sucursal
									</h2>
									<p className="text-base lg:text-xs 2xl:text-sm text-white/70 font-medium">
										Agrega una nueva ubicación
									</p>
								</div>
							</div>
						</div>

						{/* Contenido scroll */}
						<div className="flex-1 overflow-y-auto px-4 lg:px-3 2xl:px-4 py-3 space-y-3">
							{/* Nombre */}
							<div>
								<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Nombre de la sucursal *</label>
								<input
									value={nombre}
									onChange={e => setNombre(e.target.value)}
									className={`w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 rounded-lg bg-white ${
										esNombreDuplicado ? 'border-red-500' : 'border-slate-300'
									}`}
									placeholder="Sucursal Centro"
									data-testid="input-nombre-sucursal"
								/>
								{esNombreDuplicado && (
									<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-red-600 mt-1" data-testid="error-nombre-duplicado">
										Ya existe una sucursal con ese nombre en este negocio
									</p>
								)}
							</div>

							{/* Ciudad (autocomplete) + Estado (auto-rellenado) */}
							<div className="flex gap-3">
								<div className="flex-1 relative">
									<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Ciudad *</label>
									<input
										value={inputCiudadActivo ? busquedaCiudad : ciudad}
										onChange={e => {
											const valor = e.target.value;
											setBusquedaCiudad(valor);
											if (valor === '') { setCiudad(''); setEstado(''); }
											if (valor.length >= 2) {
												const resultados = buscarCiudades(valor);
												setSugerencias(resultados);
												setMostrarSugerencias(resultados.length > 0);
											} else {
												setSugerencias([]);
												setMostrarSugerencias(false);
											}
										}}
										onFocus={() => {
											setInputCiudadActivo(true);
											setBusquedaCiudad(ciudad);
											if (ciudad.length >= 2) {
												const resultados = buscarCiudades(ciudad);
												setSugerencias(resultados);
												setMostrarSugerencias(resultados.length > 0);
											}
										}}
										onBlur={() => setTimeout(() => { setInputCiudadActivo(false); setMostrarSugerencias(false); }, 200)}
										className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
										placeholder="Buscar ciudad..."
										autoComplete="off"
										data-testid="input-ciudad-sucursal"
									/>
									{mostrarSugerencias && (
										<div ref={sugerenciasRef} className="absolute z-50 mt-1 w-full bg-white rounded-lg border-2 border-slate-300 shadow-lg overflow-hidden">
											<div className="max-h-[200px] overflow-y-auto py-1">
												{sugerencias.map((sug, idx) => (
													<button
														key={idx}
														type="button"
														onClick={() => handleSeleccionarCiudad(sug)}
														className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-slate-200"
													>
														<MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
														<span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">
															{sug.nombre}, <span className="font-medium text-slate-600">{sug.estado}</span>
														</span>
													</button>
												))}
											</div>
										</div>
									)}
								</div>
								<div className="flex-1">
									<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Estado *</label>
									<input
										value={estado}
										readOnly
										className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-slate-100 cursor-not-allowed"
										placeholder="Se llena automáticamente"
										data-testid="input-estado-sucursal"
									/>
								</div>
							</div>

							{/* Dirección */}
							<div>
								<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Dirección</label>
								<input
									value={direccion}
									onChange={e => setDireccion(e.target.value)}
									className="w-full h-10 lg:h-9 2xl:h-10 px-3 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
									placeholder="Calle 5 de Febrero #123"
									data-testid="input-direccion-sucursal"
								/>
							</div>

							{/* Teléfono + WhatsApp — usa InputTelefono con lada (+52 por default) */}
							<div className="flex gap-3">
								<div className="flex-1 min-w-0">
									<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">Teléfono</label>
									<InputTelefono
										value={telefono}
										onChange={setTelefono}
										prefijo="sucursal-tel"
										testIdNumero="input-telefono-sucursal"
									/>
								</div>
								<div className="flex-1 min-w-0">
									<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">WhatsApp</label>
									<InputTelefono
										value={whatsapp}
										onChange={setWhatsapp}
										prefijo="sucursal-wa"
										testIdNumero="input-whatsapp-sucursal"
									/>
								</div>
							</div>

							{/* Correo — usa InputCorreoValidado en modo 'contacto' (formato + typo, sin hit a BD) */}
							<InputCorreoValidado
								value={correo}
								onChange={setCorreo}
								modo="contacto"
								label="Correo"
								placeholder="sucursal@negocio.com"
								testIdPrefix="correo-sucursal"
							/>

							{/* Mapa de ubicación — se muestra cuando hay coordenadas (al seleccionar ciudad) */}
							{latitud !== null && longitud !== null && (
								<div data-testid="mapa-sucursal-container">
									<label className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1 block">
										Ubicación en el mapa *
									</label>
									<p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 mb-2">
										Arrastra el marcador a la ubicación exacta de tu sucursal
									</p>
									<div
										className="relative rounded-lg overflow-hidden border-2 border-slate-300"
										style={{ height: 240 }}
									>
										<MapContainer
											center={[latitud, longitud]}
											zoom={14}
											style={{ height: '100%', width: '100%' }}
											scrollWheelZoom={false}
										>
											<TileLayer
												url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
												attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
											/>
											<CentrarMapa lat={latitud} lng={longitud} forzar={mapaKey} />
											<MarcadorArrastrable
												lat={latitud}
												lng={longitud}
												onMover={(lat, lng) => {
													setLatitud(lat);
													setLongitud(lng);
												}}
											/>
										</MapContainer>
										{/* Botón expandir — flotante sobre el mapa */}
										<button
											type="button"
											onClick={() => setMapaFullscreen(true)}
											className="absolute top-2 right-2 z-[1000] w-9 h-9 rounded-lg bg-white/95 hover:bg-white border-2 border-slate-300 shadow-md flex items-center justify-center cursor-pointer transition-colors"
											title="Ver mapa completo"
											data-testid="btn-expandir-mapa"
										>
											<Maximize2 className="w-4 h-4 text-slate-700" />
										</button>
									</div>
								</div>
							)}

							{/* Checklist de lo que se clonará de Matriz */}
							<div className="mt-2 p-3 rounded-lg bg-slate-200 border-2 border-slate-300">
								<p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-700 mb-2">
									Se copiarán automáticamente de este Negocio:
								</p>
								<ul className="space-y-1.5">
									{[
										'Horarios',
										'Métodos de pago',
										'Imágenes (perfil, portada, galería)',
										'Catálogo',
										'Ofertas',
									].map((item) => (
										<li key={item} className="flex items-center gap-2 text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">
											<CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
											<span>{item}</span>
										</li>
									))}
								</ul>
							</div>
						</div>

						{/* Footer */}
						<div className="shrink-0 px-4 lg:px-3 2xl:px-4 py-3 border-t border-slate-200 flex gap-3">
							<button
								type="button"
								onClick={onCerrar}
								className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl
									px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer
									border-2 border-slate-400 text-slate-600 bg-transparent
									hover:bg-slate-200 hover:border-slate-500 active:bg-slate-200"
								data-testid="btn-cancelar-sucursal"
							>
								Cancelar
							</button>
							<button
								type="button"
								onClick={handleGuardar}
								disabled={!nombre.trim() || !ciudad.trim() || !estado.trim() || latitud === null || longitud === null || esNombreDuplicado}
								className="flex-1 inline-flex items-center justify-center gap-2 font-bold rounded-xl
									px-4 py-2.5 text-sm lg:text-xs lg:py-1.5 2xl:text-sm 2xl:py-2.5 cursor-pointer
									bg-linear-to-r from-slate-700 to-slate-800 text-white
									shadow-lg shadow-slate-700/30
									hover:from-slate-800 hover:to-slate-900 hover:shadow-slate-700/40
									active:scale-[0.98]
									disabled:opacity-50 disabled:cursor-not-allowed"
								data-testid="btn-guardar-sucursal"
							>
								<Save className="w-4 h-4" />
								Crear sucursal
							</button>
						</div>
					</>
				)}
			</div>
		</ModalAdaptativo>

		{/* ============================================================ */}
		{/* POPUP FULLSCREEN DEL MAPA — portal a body para estar por encima del modal */}
		{/* ============================================================ */}
		{mapaFullscreen && latitud !== null && longitud !== null && createPortal(
			<div
				className="fixed inset-0 z-[99999] bg-slate-900/80 flex items-center justify-center p-4 lg:p-8"
				onClick={() => setMapaFullscreen(false)}
				data-testid="mapa-fullscreen-overlay"
			>
				<div
					className="relative w-full h-full max-w-6xl max-h-[95vh] rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col"
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header del popup */}
					<div
						className="shrink-0 px-4 py-3 flex items-center gap-3"
						style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
					>
						<div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
							<MapPin className="w-5 h-5 text-white" />
						</div>
						<div className="flex-1 min-w-0">
							<h3 className="text-base font-bold text-white">Ajustar ubicación</h3>
							<p className="text-xs text-white/70 font-medium truncate">
								Arrastra el marcador a la ubicación exacta de tu sucursal
							</p>
						</div>
						<button
							type="button"
							onClick={() => setMapaFullscreen(false)}
							className="shrink-0 w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
							title="Cerrar"
							data-testid="btn-cerrar-mapa-fullscreen"
						>
							<X className="w-5 h-5 text-white" />
						</button>
					</div>

					{/* Mapa a pantalla completa */}
					<div className="flex-1 min-h-0 relative">
						<MapContainer
							center={[latitud, longitud]}
							zoom={16}
							style={{ height: '100%', width: '100%' }}
							scrollWheelZoom={true}
						>
							<TileLayer
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
							/>
							<CentrarMapa lat={latitud} lng={longitud} forzar={mapaKey} />
							<MarcadorArrastrable
								lat={latitud}
								lng={longitud}
								onMover={(lat, lng) => {
									setLatitud(lat);
									setLongitud(lng);
								}}
							/>
						</MapContainer>
					</div>

					{/* Footer con botón listo */}
					<div className="shrink-0 px-4 py-3 border-t border-slate-200 flex items-center justify-end bg-white">
						<button
							type="button"
							onClick={() => setMapaFullscreen(false)}
							className="inline-flex items-center justify-center gap-2 font-bold rounded-xl px-5 py-2.5 text-sm cursor-pointer bg-linear-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-700/30 hover:from-slate-800 hover:to-slate-900 active:scale-[0.98]"
							data-testid="btn-listo-mapa-fullscreen"
						>
							<CheckCircle2 className="w-4 h-4" />
							Listo
						</button>
					</div>
				</div>
			</div>,
			document.body
		)}
		</>
	);
}
