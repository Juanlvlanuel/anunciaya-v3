/**
 * ModalConfiguracion.tsx
 * =======================
 * Modal para configurar tipos de alertas y umbrales.
 * Usa ModalAdaptativo + tabs por categoría (patrón ModalOferta).
 *
 * Ubicación: apps/web/src/pages/private/business-studio/alertas/ModalConfiguracion.tsx
 */

import { useState } from 'react';
import {
	Settings,
	Shield,
	Heart,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Wrench = (p: IconoWrapperProps) => <Icon icon={ICONOS.servicios} {...p} />;
const TrendingUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaSubida} {...p} />;
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { useAlertasConfiguracion, useActualizarConfiguracionAlerta } from '../../../../hooks/queries/useAlertas';
import { notificar } from '../../../../utils/notificaciones';
import { CATALOGO_ALERTAS } from '../../../../types/alertas';
import type { CategoriaAlerta, ConfiguracionAlerta } from '../../../../types/alertas';

// =============================================================================
// CONSTANTES
// =============================================================================

const TABS: { id: CategoriaAlerta; label: string; icono: typeof Shield }[] = [
	{ id: 'seguridad', label: 'Seguridad', icono: Shield },
	{ id: 'operativa', label: 'Operativa', icono: Wrench },
	{ id: 'rendimiento', label: 'Rendimiento', icono: TrendingUp },
	{ id: 'engagement', label: 'Engagement', icono: Heart },
];

// =============================================================================
// COMPONENTE
// =============================================================================

interface Props {
	onCerrar: () => void;
}

export function ModalConfiguracion({ onCerrar }: Props) {
	const configuracionQuery = useAlertasConfiguracion();
	const actualizarMutation = useActualizarConfiguracionAlerta();
	const configuracion = configuracionQuery.data ?? [];
	const [tabActivo, setTabActivo] = useState<CategoriaAlerta>('seguridad');

	const handleToggle = async (tipo: string, config: ConfiguracionAlerta) => {
		try {
			await actualizarMutation.mutateAsync({ tipo, activo: !config.activo, umbrales: config.umbrales as Record<string, number> });
			notificar.exito(config.activo ? 'Alerta desactivada' : 'Alerta activada');
		} catch {
			// Error ya manejado por la mutación
		}
	};

	const handleUmbral = async (tipo: string, config: ConfiguracionAlerta, campo: string, valor: number) => {
		const nuevosUmbrales = { ...(config.umbrales as Record<string, number>), [campo]: valor };
		try {
			await actualizarMutation.mutateAsync({ tipo, activo: config.activo, umbrales: nuevosUmbrales });
		} catch {
			// Error ya manejado por la mutación
		}
	};

	const configMap = new Map(configuracion.map(c => [c.tipoAlerta, c]));
	const alertasTab = CATALOGO_ALERTAS.filter(a => a.categoria === tabActivo);

	return (
		<ModalAdaptativo
			abierto={true}
			onCerrar={onCerrar}
			ancho="md"
			mostrarHeader={false}
			paddingContenido="none"
			sinScrollInterno
			alturaMaxima="xl"
			headerOscuro
			className="max-lg:[background:linear-gradient(180deg,#1e293b_2.5rem,rgb(248,250,252)_2.5rem)]"
		>
			<div data-testid="modal-configuracion-alertas" className="flex flex-col" style={{ height: window.innerWidth >= 1024 ? '78vh' : '90vh' }}>
				{/* ── Header dark gradient ── */}
				<div
					className="shrink-0 px-4 lg:px-3 2xl:px-4 pt-8 pb-3 lg:py-3 2xl:py-4 lg:rounded-t-2xl"
					style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 4px 16px rgba(30,41,59,0.3)' }}
				>
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-xl lg:rounded-lg 2xl:rounded-xl bg-white/10 flex items-center justify-center">
							<Settings className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
						</div>
						<div className="space-y-0.5">
							<h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">Configuración</h2>
							<p className="text-base lg:text-xs 2xl:text-sm text-white/70 font-medium">
								<span className="lg:hidden">{TABS.find(t => t.id === tabActivo)?.label}</span>
								<span className="hidden lg:inline">Activa tipos y ajusta umbrales</span>
							</p>
						</div>
					</div>
				</div>

				{/* ── Tabs bar (patrón ModalOferta) ── */}
				<div className="shrink-0 px-4 lg:px-3 2xl:px-4 py-2 bg-white border-b border-slate-300">
					<div className="bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 flex" data-testid="tabs-config-alertas">
						{TABS.map(tab => {
							const Icono = tab.icono;
							return (
								<button
									key={tab.id}
									type="button"
									onClick={() => setTabActivo(tab.id)}
									className={`flex-1 flex items-center justify-center gap-1.5 lg:gap-1 2xl:gap-1.5 h-11 lg:h-9 2xl:h-10 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold cursor-pointer ${
										tabActivo === tab.id
											? 'text-white shadow-md'
											: 'text-slate-700 hover:bg-slate-300'
									}`}
									style={tabActivo === tab.id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
									data-testid={`seccion-${tab.id}`}
								>
									<Icono className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
									<span className="hidden lg:inline">{tab.label}</span>
								</button>
							);
						})}
					</div>
				</div>

				{/* ── Contenido del tab activo ── */}
				<div className="flex-1 overflow-y-auto px-4 lg:px-3 2xl:px-4 py-3">
					<div className="space-y-1.5">
						{alertasTab.map(meta => {
							const config = configMap.get(meta.tipo);
							if (!config) return null;

							return (
								<div
									key={meta.tipo}
									className="py-2.5 px-3 rounded-lg bg-slate-200 border-2 border-slate-300"
								>
									{/* Nombre + Toggle en la misma fila */}
									<div className="flex items-center justify-between gap-3">
										<p className="text-base lg:text-xs 2xl:text-sm font-bold text-slate-800">{meta.nombre}</p>
										<label className="shrink-0 cursor-pointer group" onClick={e => e.stopPropagation()}>
											<input
												type="checkbox"
												checked={config.activo}
												onChange={() => handleToggle(meta.tipo, config)}
												className="sr-only"
												data-testid={`toggle-alerta-${meta.tipo}`}
											/>
											<div className="relative w-12 h-6 lg:w-10 lg:h-5">
												<div className="absolute inset-0 bg-slate-300 group-has-checked:bg-slate-500 rounded-full transition-colors" />
												<div className="absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform group-has-checked:translate-x-6 lg:group-has-checked:translate-x-5" />
											</div>
										</label>
									</div>

									{/* Descripción (ancho completo) */}
									<p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium mt-0.5 whitespace-pre-line">{meta.descripcion}</p>

									{/* Umbrales editables */}
									{config.activo && Object.keys(config.umbrales).length > 0 && (
										<div className="flex flex-wrap gap-2 mt-1.5">
											{Object.entries(config.umbrales).map(([campo, valor]) => (
												<InputUmbral
													key={campo}
													campo={campo}
													valor={valor as number}
													tipo={meta.tipo}
													config={config}
													onGuardar={handleUmbral}
												/>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</ModalAdaptativo>
	);
}

// =============================================================================
// LABELS LEGIBLES PARA UMBRALES
// =============================================================================

const LABELS_UMBRALES: Record<string, string> = {
	multiplicador: 'Veces el promedio',
	maxComprasHora: 'Máximo compras por hora',
	alertasMaxMes: 'Máximo alertas al mes',
	minimoConsecutivos: 'Mínimo ventas consecutivas',
	diasMaximo: 'Máximo días sin entregar',
	maximoPendientes: 'Máximo pendientes',
	diasAnticipacion: 'Días de anticipación',
	porcentajeCaida: 'Porcentaje de caída',
	minimoResenas: 'Mínimo reseñas',
	maximoEstrellas: 'Máximo estrellas',
	diasInactividad: 'Días de inactividad',
	porcentajeMinimo: 'Porcentaje mínimo de uso',
	stockMinimo: 'Stock mínimo',
};

// =============================================================================
// SUBCOMPONENTE: Input de umbral con estado local
// =============================================================================

function InputUmbral({ campo, valor, tipo, config, onGuardar }: {
	campo: string;
	valor: number;
	tipo: string;
	config: ConfiguracionAlerta;
	onGuardar: (tipo: string, config: ConfiguracionAlerta, campo: string, valor: number) => Promise<void>;
}) {
	const [valorLocal, setValorLocal] = useState(String(valor));

	const handleBlur = () => {
		const num = valorLocal === '' ? 0 : Number(valorLocal);
		if (num !== valor) {
			onGuardar(tipo, config, campo, Math.max(0, num));
		}
		if (valorLocal === '') setValorLocal('0');
	};

	return (
		<div className="flex items-center gap-1.5">
			<span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
				{LABELS_UMBRALES[campo] ?? campo.replace(/([A-Z])/g, ' $1').trim()}:
			</span>
			<input
				type="text"
				inputMode="numeric"
				value={valorLocal}
				onChange={e => {
					const v = e.target.value;
					if (v === '' || /^\d+$/.test(v)) setValorLocal(v);
				}}
				onBlur={handleBlur}
				className="w-20 h-9 lg:h-8 2xl:h-9 text-base lg:text-sm 2xl:text-base text-center font-semibold text-slate-800 border-2 border-slate-300 rounded-lg bg-white"
				style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
				data-testid={`umbral-${tipo}-${campo}`}
			/>
		</div>
	);
}
