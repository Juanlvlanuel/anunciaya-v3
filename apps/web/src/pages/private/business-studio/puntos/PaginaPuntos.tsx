/**
 * PaginaPuntos.tsx
 * =================
 * Página principal del módulo Puntos en Business Studio.
 * Compone Configuración Base, SistemaNiveles y Recompensas.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/PaginaPuntos.tsx
 *
 * COMPONENTES EXTRAÍDOS:
 *   SistemaNiveles  → card completa del sistema de niveles (cards verticales)
 *   CardRecompensa  → card vertical individual de recompensa
 *   ModalRecompensa → modal crear / editar recompensa con upload Cloudinary
 *
 * LAYOUT:
 *   Mobile (default) → 3 tabs (Configuración | Niveles | Recompensas)
 *   Laptop (lg:)     → Fila superior 2 cols (Config + Niveles) + Recompensas abajo
 *   Desktop (2xl:)   → Igual que laptop pero con más espacio
 *
 * HEADER UNIFICADO:
 *   Icono gradiente con efecto coin-bounce + título + 4 KPIs inline
 *
 * FAB: Guardar configuración (solo dueños)
 *
 * PERMISOS:
 *   Dueños  → todo editable + FAB guardar
 *   Gerentes → solo lectura + banner informativo, sin FAB
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Star, Ticket, Clock, Users, Settings, Lock, Save,
  Gift, Plus, Award,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useUiStore } from '../../../../stores/useUiStore';
import { usePuntosStore } from '../../../../stores/usePuntosStore';
import { Spinner } from '../../../../components/ui';
import { notificar } from '../../../../utils/notificaciones';
import type { ActualizarConfigPuntosInput, Recompensa } from '../../../../types/puntos';

import SistemaNiveles, { type NivelLocal } from './componentes/SistemaNiveles';
import CardRecompensa from './componentes/CardRecompensa';
import ModalRecompensa, { type DatosModalRecompensa } from './componentes/ModalRecompensa';

// =============================================================================
// CSS — efecto coin-bounce del header + ocultar scrollbar del carousel
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes pp-coin-bounce {
    0%, 100% { transform: translateY(0); }
    40%      { transform: translateY(-5px); }
    60%      { transform: translateY(-2px); }
  }
  .pp-coin-bounce {
    animation: pp-coin-bounce 2s ease-in-out infinite;
  }
  .pp-carousel::-webkit-scrollbar { display: none; }
  .pp-carousel { -ms-overflow-style: none; scrollbar-width: none; }
`;

// =============================================================================
// TABS — configuración para mobile
// =============================================================================

type TabPuntos = 'configuracion' | 'niveles' | 'recompensas';

const TABS_CONFIG: { id: TabPuntos; label: string; Icono: typeof Settings }[] = [
  { id: 'configuracion', label: 'Config', Icono: Settings },
  { id: 'niveles', label: 'Niveles', Icono: Award },
  { id: 'recompensas', label: 'Recompensas', Icono: Gift },
];

// =============================================================================
// KPI — componente individual de métrica en el header
// =============================================================================

const KPI_CONFIG = {
  otorgados: {
    Icono: Star,
    color: '#4338ca',
    border: '#a5b4fc',
    bg: 'linear-gradient(135deg, #eef2ff, #fff)',
    iconBg: 'linear-gradient(135deg, #c7d2fe, #a5b4fc)',
    iconShadow: '0 3px 8px rgba(79,70,229,0.25)',
    label: 'Otorgados',
  },
  canjeados: {
    Icono: Ticket,
    color: '#be185d',
    border: '#f9a8d4',
    bg: 'linear-gradient(135deg, #fdf2f8, #fff)',
    iconBg: 'linear-gradient(135deg, #fbcfe8, #f9a8d4)',
    iconShadow: '0 3px 8px rgba(219,39,119,0.25)',
    label: 'Canjeados',
  },
  activos: {
    Icono: Clock,
    color: '#15803d',
    border: '#86efac',
    bg: 'linear-gradient(135deg, #f0fdf4, #fff)',
    iconBg: 'linear-gradient(135deg, #bbf7d0, #86efac)',
    iconShadow: '0 3px 8px rgba(22,163,74,0.25)',
    label: 'Disponibles',
  },
  clientes: {
    Icono: Users,
    color: '#1d4ed8',
    border: '#93c5fd',
    bg: 'linear-gradient(135deg, #eff6ff, #fff)',
    iconBg: 'linear-gradient(135deg, #bfdbfe, #93c5fd)',
    iconShadow: '0 3px 8px rgba(37,99,235,0.25)',
    label: 'Clientes',
  },
} as const;

function KPI({ tipo, valor }: { tipo: keyof typeof KPI_CONFIG; valor: string }) {
  const { Icono, color, border, bg, iconBg, iconShadow, label } = KPI_CONFIG[tipo];

  return (
    <div
      className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2.5 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(33.33%-6px)] lg:min-w-[110px] 2xl:min-w-[140px]"
      style={{
        background: bg,
        border: `2px solid ${border}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg, boxShadow: iconShadow }}
      >
        <Icono className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" style={{ color }} />
      </div>
      <div>
        <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight" style={{ color }}>{valor}</div>
        <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL — PaginaPuntos
// =============================================================================

export default function PaginaPuntos() {
  // ─── Stores ─────────────────────────────────────────────────────────────
  const cargarConfiguracion     = usePuntosStore((s) => s.cargarConfiguracion);
  const cargarRecompensas       = usePuntosStore((s) => s.cargarRecompensas);
  const cargarEstadisticas      = usePuntosStore((s) => s.cargarEstadisticas);
  const configuracion           = usePuntosStore((s) => s.configuracion);
  const estadisticas            = usePuntosStore((s) => s.estadisticas);
  const recompensas             = usePuntosStore((s) => s.recompensas);
  const actualizarConfiguracion = usePuntosStore((s) => s.actualizarConfiguracion);
  const crearRecompensa         = usePuntosStore((s) => s.crearRecompensa);
  const actualizarRecompensa    = usePuntosStore((s) => s.actualizarRecompensa);
  const eliminarRecompensa      = usePuntosStore((s) => s.eliminarRecompensa);
  const limpiar                 = usePuntosStore((s) => s.limpiar);

  const usuario        = useAuthStore((s) => s.usuario);
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
  const esGerente      = !usuario?.negocioId && !!usuario?.sucursalAsignada;
  const previewNegocioAbierto = useUiStore((s) => s.previewNegocioAbierto);

  // ─── Estado: Tab mobile ────────────────────────────────────────────────
  const [tabActiva, setTabActiva] = useState<TabPuntos>('configuracion');

  // ─── Estado: Configuración ────────────────────────────────────────────
  const [pesosPor, setPesosPor]                               = useState<number>(10);
  const [puntosGanados, setPuntosGanados]                     = useState<number>(1);
  const [textoPesosPor, setTextoPesosPor]                     = useState<string>('10');
  const [textoPuntosGanados, setTextoPuntosGanados]           = useState<string>('1');
  const [diasExpiracionPuntos, setDiasExpiracionPuntos]       = useState<number>(30);
  const [noExpiran, setNoExpiran]                             = useState(false);
  const [diasExpiracionVoucher, setDiasExpiracionVoucher]     = useState<number>(7);
  const [nivelesActivos, setNivelesActivos]                   = useState(true);
  const [niveles, setNiveles] = useState<{ bronce: NivelLocal; plata: NivelLocal; oro: NivelLocal }>({
    bronce: { min: 0,    max: 999,  multiplicador: 1.0 },
    plata:  { min: 1000, max: 2999, multiplicador: 1.5 },
    oro:    { min: 3000, max: null,  multiplicador: 2.0 },
  });
  const [guardando, setGuardando] = useState(false);

  // ─── Estado: Modal recompensas ────────────────────────────────────────
  const [modalAbierto, setModalAbierto]             = useState(false);
  const [modalKey, setModalKey]                     = useState(0);
  const [recompensaEditando, setRecompensaEditando] = useState<Recompensa | null>(null);

  // ─── Carga inicial ──────────────────────────────────────────────────────
  useEffect(() => {
    cargarConfiguracion();
    cargarRecompensas();
    return () => { limpiar(); };
  }, [cargarConfiguracion, cargarRecompensas, limpiar]);

  // ─── Estadísticas: se recargan cuando cambia sucursal ──────────────────
  const recargarEstadisticas = useCallback(() => {
    if (usuario?.modoActivo === 'comercial' && !sucursalActiva) return;
    cargarEstadisticas();
  }, [sucursalActiva, usuario?.modoActivo, cargarEstadisticas]);

  useEffect(() => {
    recargarEstadisticas();
  }, [recargarEstadisticas]);

  // ─── Sincronizar estado local ← configuración del store ────────────────
  useEffect(() => {
    if (!configuracion) return;
    // Convertir puntosPorPeso (ratio) a los 2 campos de UI
    // ratio = puntosGanados / pesosPor
    // Buscar la mejor representación entera sin simplificar agresivamente
    const ratio = configuracion.puntosPorPeso;
    if (ratio >= 1) {
      // Caso: 1 peso = N puntos (ej: ratio=35 → $1 gana 35pts)
      if (Number.isInteger(ratio)) {
        setPesosPor(1);
        setPuntosGanados(ratio);
        setTextoPesosPor('1');
        setTextoPuntosGanados(String(ratio));
      } else {
        // Ratio decimal >= 1 (ej: 1.5 → $2 gana 3pts)
        const pesos = 10;
        const puntos = Math.round(ratio * pesos);
        setPesosPor(pesos);
        setPuntosGanados(puntos);
        setTextoPesosPor(String(pesos));
        setTextoPuntosGanados(String(puntos));
      }
    } else {
      // Caso: N pesos = 1 punto o N pesos = M puntos
      // Intentar reconstruir con denominadores comunes
      let mejorPesos = Math.round(1 / ratio);
      let mejorPuntos = 1;
      // Probar escalas para encontrar enteros exactos
      for (const escala of [1, 10, 100, 1000]) {
        const puntos = Math.round(ratio * escala);
        if (puntos > 0 && Math.abs((puntos / escala) - ratio) < 0.0001) {
          mejorPesos = escala;
          mejorPuntos = puntos;
          break;
        }
      }
      setPesosPor(mejorPesos);
      setPuntosGanados(mejorPuntos);
      setTextoPesosPor(String(mejorPesos));
      setTextoPuntosGanados(String(mejorPuntos));
    }
    setNoExpiran(configuracion.diasExpiracionPuntos === null);
    setDiasExpiracionPuntos(configuracion.diasExpiracionPuntos ?? 30);
    setDiasExpiracionVoucher(configuracion.diasExpiracionVoucher);
    setNivelesActivos(configuracion.nivelesActivos);
    setNiveles({
      bronce: { min: configuracion.nivelBronce.min, max: configuracion.nivelBronce.max, multiplicador: configuracion.nivelBronce.multiplicador },
      plata:  { min: configuracion.nivelPlata.min,  max: configuracion.nivelPlata.max,  multiplicador: configuracion.nivelPlata.multiplicador },
      oro:    { min: configuracion.nivelOro.min,    max: null,                          multiplicador: configuracion.nivelOro.multiplicador },
    });
  }, [configuracion]);

  // ─── KPIs ─────────────────────────────────────────────────────────────
  const kpis = {
    otorgados: estadisticas?.puntosOtorgados ?? 0,
    canjeados: estadisticas?.puntosCanjeados ?? 0,
    activos:   estadisticas?.puntosActivos  ?? 0,
    clientes:  estadisticas?.clientesConPuntos ?? 0,
  };
  const fmt = (n: number) => n.toLocaleString('es-MX');

  // ─── Guardar configuración ──────────────────────────────────────────────
  const handleGuardarConfig = async () => {
    setGuardando(true);
    const datos: ActualizarConfigPuntosInput = {
      puntosPorPeso: pesosPor > 0 ? puntosGanados / pesosPor : 1,
      diasExpiracionPuntos: noExpiran ? null : diasExpiracionPuntos,
      diasExpiracionVoucher,
      nivelesActivos,
      nivelBronceMin:            niveles.bronce.min,
      nivelBronceMax:            niveles.bronce.max!,
      nivelBronceMultiplicador:  niveles.bronce.multiplicador,
      nivelPlataMin:             niveles.plata.min,
      nivelPlataMax:             niveles.plata.max!,
      nivelPlataMultiplicador:   niveles.plata.multiplicador,
      nivelOroMin:               niveles.oro.min,
      nivelOroMultiplicador:     niveles.oro.multiplicador,
    };
    try {
      await actualizarConfiguracion(datos);
      notificar.exito('Configuración guardada correctamente');
    } catch (err: unknown) {
      notificar.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  // ─── Actualizar campo de nivel (callback para SistemaNiveles) ───────────
  const actualizarNivel = (
    nivel: 'bronce' | 'plata' | 'oro',
    campo: 'min' | 'max' | 'multiplicador',
    valor: number,
  ) => {
    setNiveles((prev) => ({ ...prev, [nivel]: { ...prev[nivel], [campo]: valor } }));
  };

  // ─── Handlers: recompensas ──────────────────────────────────────────────
  const handleCrear = useCallback(() => {
    setRecompensaEditando(null);
    setModalKey((k) => k + 1);
    setModalAbierto(true);
  }, []);

  const handleEditar = useCallback((r: Recompensa) => {
    setRecompensaEditando(r);
    setModalKey((k) => k + 1);
    setModalAbierto(true);
  }, []);

  const handleGuardarRecompensa = async (datos: DatosModalRecompensa) => {
    if (recompensaEditando) {
      const exito = await actualizarRecompensa(recompensaEditando.id, datos);
      if (exito) { notificar.exito('Recompensa actualizada'); setModalAbierto(false); }
      else        { notificar.error('No se pudo actualizar la recompensa'); }
    } else {
      const nueva = await crearRecompensa(datos);
      if (nueva) { notificar.exito('Recompensa creada'); setModalAbierto(false); }
      else       { notificar.error('No se pudo crear la recompensa'); }
    }
  };

  const handleEliminar = async (id: string) => {
    const confirmado = await notificar.confirmar('¿Eliminar esta recompensa?', 'Esta acción no se puede deshacer.');
    if (!confirmado) return;
    const exito = await eliminarRecompensa(id);
    if (exito) notificar.exito('Recompensa eliminada');
    else       notificar.error('No se pudo eliminar la recompensa');
  };

  const handleToggleActiva = async (r: Recompensa) => {
    const exito = await actualizarRecompensa(r.id, { activa: !r.activa });
    if (!exito) notificar.error('No se pudo actualizar el estado');
  };

  // =============================================================================
  // SECCIONES REUTILIZABLES (mobile tabs + desktop inline)
  // =============================================================================

  /** Sección: Configuración Base */
  const seccionConfiguracion = (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: '2.5px solid #dde4ef', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}
    >
      {/* Header card */}
      <div
        className="flex items-center gap-2.5 lg:gap-3 px-3 lg:px-5 py-2 lg:py-2.5"
        style={{ background: 'linear-gradient(135deg, #f8fafd, #f0f4f8)', borderBottom: '2.5px solid #e4e9f2' }}
      >
        <div
          className="w-9 h-9 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #c7d2fe, #a5b4fc)', boxShadow: '0 3px 8px rgba(0,0,0,0.1)' }}
        >
          <Settings className="w-4.5 h-4.5 lg:w-4.5 lg:h-4.5 text-indigo-700" />
        </div>
        <h2 className="text-base lg:text-sm 2xl:text-base font-extrabold text-slate-900">Configuración Base</h2>
      </div>

      {/* Campos de configuración */}
      <div className="p-3 lg:p-3.5">
        {configuracion ? (
          <div className="flex flex-col gap-2.5 lg:gap-2.5 2xl:gap-3">

            {/* Acumulación de puntos — formato oración */}
            <div>
              <label className="block text-[13.5px] lg:text-[12.5px] 2xl:text-[13.5px] font-extrabold text-slate-700 tracking-wider mb-1 lg:mb-1.5">
                Acumulación de puntos
              </label>
              <div className="flex items-center gap-1.5 lg:gap-2 flex-nowrap">
                <span className="text-[13px] lg:text-xs 2xl:text-[13px] font-semibold text-slate-600 shrink-0">Por cada</span>
                <div
                  className="flex items-center h-10 lg:h-9 2xl:h-10 bg-slate-50 rounded-lg px-1.5 lg:px-2 flex-1 min-w-0"
                  style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                >
                  <span className="text-[13px] lg:text-xs 2xl:text-[13px] font-bold text-slate-400 mr-0.5">$</span>
                  <input
                    id="pp-pesosPor"
                    name="pesosPor"
                    type="number" min={1} value={textoPesosPor}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTextoPesosPor(raw);
                      const v = Number(raw);
                      if (v > 0) setPesosPor(v);
                    }}
                    onBlur={() => {
                      if (!textoPesosPor || Number(textoPesosPor) <= 0) {
                        setPesosPor(10);
                        setTextoPesosPor('10');
                      }
                    }}
                    disabled={esGerente}
                    className="flex-1 bg-transparent outline-none text-[15px] lg:text-sm 2xl:text-[15px] font-bold text-slate-800 w-full disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                  <span
                    className="text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold text-indigo-700 px-1.5 py-0.5 rounded shrink-0 ml-1"
                    style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}
                  >
                    MXN
                  </span>
                </div>
                <span className="text-[12px] lg:text-[11px] 2xl:text-[12px] font-bold text-slate-500 shrink-0">gana</span>
                <div
                  className="flex items-center h-10 lg:h-9 2xl:h-10 bg-slate-50 rounded-lg px-1.5 lg:px-2 flex-1 min-w-0"
                  style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                >
                  <input
                    id="pp-puntosGanados"
                    name="puntosGanados"
                    type="number" min={1} value={textoPuntosGanados}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setTextoPuntosGanados(raw);
                      const v = Number(raw);
                      if (v > 0) setPuntosGanados(v);
                    }}
                    onBlur={() => {
                      if (!textoPuntosGanados || Number(textoPuntosGanados) <= 0) {
                        setPuntosGanados(1);
                        setTextoPuntosGanados('1');
                      }
                    }}
                    disabled={esGerente}
                    className="flex-1 bg-transparent outline-none text-[15px] lg:text-sm 2xl:text-[15px] font-bold text-slate-800 w-full disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                  <span
                    className="text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold text-amber-700 px-1.5 py-0.5 rounded shrink-0 ml-1"
                    style={{ background: 'linear-gradient(135deg, #fef9c3, #fde68a)', border: '1px solid #fde68a' }}
                  >
                    pts
                  </span>
                </div>
              </div>
            </div>

            {/* Expiración de puntos */}
            <div>
              <label htmlFor="pp-diasExpPuntos" className="block text-[13.5px] lg:text-[12.5px] 2xl:text-[13.5px] font-extrabold text-slate-700 tracking-wider mb-1 lg:mb-1.5">
                Expiración de puntos
              </label>
              <div
                className="flex items-center h-10 lg:h-11 bg-slate-50 rounded-lg px-3 lg:px-3.5"
                style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
              >
                <input
                  id="pp-diasExpPuntos"
                  name="diasExpiracionPuntos"
                  type="number" min={1} value={noExpiran ? '' : diasExpiracionPuntos}
                  onChange={(e) => setDiasExpiracionPuntos(Number(e.target.value))}
                  disabled={esGerente || noExpiran}
                  placeholder={noExpiran ? '∞' : undefined}
                  className="flex-1 bg-transparent outline-none text-base font-bold text-slate-800 w-16 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                />
                <span
                  className="text-xs lg:text-[10.5px] font-bold text-indigo-700 px-2 py-0.5 rounded"
                  style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}
                >
                  días
                </span>
              </div>
              {/* Checkbox: no expiran */}
              <label className="flex items-center gap-1.5 mt-1 lg:mt-1.5 cursor-pointer">
                <input
                  id="pp-noExpiran"
                  name="noExpiran"
                  type="checkbox" checked={noExpiran}
                  onChange={(e) => setNoExpiran(e.target.checked)}
                  disabled={esGerente}
                  className="w-3.5 h-3.5 lg:w-3 lg:h-3 accent-indigo-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span className="text-xs text-slate-500">No expiran</span>
              </label>
            </div>

            {/* Expiración de vouchers */}
            <div>
              <label htmlFor="pp-diasExpVoucher" className="block text-[13.5px] lg:text-[12.5px] 2xl:text-[13.5px] font-extrabold text-slate-700 tracking-wider mb-1 lg:mb-1.5">
                Expiración de vouchers
              </label>
              <div
                className="flex items-center h-10 lg:h-11 bg-slate-50 rounded-lg px-3 lg:px-3.5"
                style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
              >
                <input
                  id="pp-diasExpVoucher"
                  name="diasExpiracionVoucher"
                  type="number" min={1} value={diasExpiracionVoucher}
                  onChange={(e) => setDiasExpiracionVoucher(Number(e.target.value))}
                  disabled={esGerente}
                  className="flex-1 bg-transparent outline-none text-base font-bold text-slate-800 w-16 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                />
                <span
                  className="text-xs lg:text-[10.5px] font-bold text-indigo-700 px-2 py-0.5 rounded"
                  style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}
                >
                  días
                </span>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        )}
      </div>
    </div>
  );

  /** Sección: Sistema de Niveles */
  const seccionNiveles = (
    <SistemaNiveles
      niveles={niveles}
      nivelesActivos={nivelesActivos}
      onToggleNiveles={() => { if (!esGerente) setNivelesActivos(!nivelesActivos); }}
      onCambioNivel={actualizarNivel}
      esGerente={esGerente}
    />
  );

  /** Sección: Recompensas */
  const seccionRecompensas = (
    <div
      className="bg-white rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '2.5px solid #dde4ef', boxShadow: '0 4px 16px rgba(0,0,0,0.07)' }}
    >
      {/* Header con botón Nueva */}
      <div
        className="flex items-center gap-3 px-3 lg:px-5 py-2 lg:py-2.5 shrink-0"
        style={{ background: 'linear-gradient(135deg, #f8fafd, #f0f4f8)', borderBottom: '2.5px solid #e4e9f2' }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #c7d2fe, #a5b4fc)', boxShadow: '0 3px 8px rgba(0,0,0,0.1)' }}
        >
          <Gift className="w-4.5 h-4.5 text-indigo-700" />
        </div>
        <h2 className="text-base font-extrabold text-slate-900">Recompensas</h2>

        {/* Botón Nueva — solo dueños */}
        {!esGerente && (
          <button
            onClick={handleCrear}
            className="ml-auto flex items-center gap-1.5 text-white text-[12.5px] font-bold px-4 py-2 rounded-lg cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
        )}
      </div>

      {/* Grid de recompensas */}
      <div className="overflow-y-auto flex-1 p-3 lg:p-4">
        {recompensas.length === 0 ? (
          /* Estado vacío */
          <div className="flex flex-col items-center justify-center py-10 lg:py-12 text-center">
            <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center mb-3 lg:mb-4">
              <Gift className="w-6 h-6 lg:w-7 lg:h-7 text-indigo-500" />
            </div>
            <h3 className="text-sm lg:text-base font-bold text-slate-700 mb-1">Sin recompensas aún</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              {esGerente
                ? 'El dueño puede crear recompensas desde aquí.'
                : 'Crea recompensas para que tus clientes las canjeen con sus puntos.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5 lg:gap-3">
            {recompensas.map((r) => (
              <CardRecompensa
                key={r.id}
                recompensa={r}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                onToggleActiva={handleToggleActiva}
                esGerente={esGerente}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-full p-3 lg:p-1.5 2xl:p-3">
      {/* Estilos del header */}
      <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />

      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto">

        {/* ═══════════════════════════════════════════════════════════════════
            HEADER UNIFICADO: icono gradiente + título + 4 KPIs
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-4 mb-3 lg:mb-5 2xl:mb-6">

          {/* Icono + Título */}
          <div className="flex items-center gap-4 shrink-0 mb-2 lg:mb-0">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #4f46e5, #6366f1, #818cf8)',
                boxShadow: '0 6px 20px rgba(79,70,229,0.4)',
              }}
            >
              {/* Moneda animada */}
              <div
                className="pp-coin-bounce flex items-center justify-center w-7 h-7 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #d97706 100%)',
                  border: '1.5px solid #b45309',
                  boxShadow: 'inset 0 0 0 1.5px rgba(146,64,14,0.25)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: '#92400e', lineHeight: 1 }}>$</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                Sistema de Puntos
              </h1>
              <p className="text-sm lg:text-sm 2xl:text-base text-slate-500 mt-0.5 font-medium">
                Configuración, recompensas y métricas
              </p>
            </div>
          </div>

          {/* 4 KPIs — carousel en mobile, right-aligned en desktop */}
          <div className="pp-carousel flex gap-1.5 lg:gap-1.5 2xl:gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 lg:ml-auto">
            <KPI tipo="clientes"  valor={fmt(kpis.clientes)} />
            <KPI tipo="otorgados" valor={fmt(kpis.otorgados)} />
            <KPI tipo="canjeados" valor={fmt(kpis.canjeados)} />
            <KPI tipo="activos"   valor={fmt(kpis.activos)} />
          </div>
        </div>

        {/* Banner solo lectura — solo gerentes */}
        {esGerente && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 lg:p-3.5 mt-3 lg:mt-14 2xl:mt-14 mb-3 lg:mb-5">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[13px] lg:text-sm font-semibold text-blue-700">Modo solo lectura</p>
              <p className="text-[11px] lg:text-xs text-blue-500">Solo el dueño puede modificar la configuración de puntos.</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MOBILE: 3 Tabs → solo se muestra la sección activa
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden">
          {/* Tab bar */}
          <div
            className="flex rounded-xl overflow-hidden mb-3"
            style={{ border: '2px solid #dde4ef', background: '#f1f5f9' }}
          >
            {TABS_CONFIG.map(({ id, label, Icono }) => (
              <button
                key={id}
                onClick={() => setTabActiva(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold cursor-pointer transition-colors ${
                  tabActiva === id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                <Icono className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Contenido del tab activo */}
          {tabActiva === 'configuracion' && seccionConfiguracion}
          {tabActiva === 'niveles' && seccionNiveles}
          {tabActiva === 'recompensas' && seccionRecompensas}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            LAPTOP/DESKTOP: Fila superior (Config + Niveles) + Recompensas
        ═══════════════════════════════════════════════════════════════════ */}
        <div className={`hidden lg:block ${!esGerente ? 'mt-4 lg:mt-14 2xl:mt-14' : ''}`}>
          {/* Fila superior: 2 columnas */}
          <div className="grid grid-cols-[1fr_2fr] gap-3 lg:gap-3 2xl:gap-4 mb-3 lg:mb-3 2xl:mb-4">
            {seccionConfiguracion}
            {seccionNiveles}
          </div>

          {/* Fila inferior: Recompensas ancho completo */}
          {seccionRecompensas}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FAB GUARDAR — solo dueños, posición fija inferior derecho
      ═══════════════════════════════════════════════════════════════════ */}
      {!esGerente && createPortal(
        <div className={`fixed bottom-20 right-4 lg:bottom-6 lg:right-6 2xl:right-1/2 2xl:bottom-8 z-49 transition-transform duration-75 ${
          previewNegocioAbierto
            ? 'lg:right-[375px] 2xl:translate-x-[510px]'
            : 'lg:right-[45px] 2xl:translate-x-[895px]'
        }`}>
          <button
            onClick={handleGuardarConfig}
            disabled={guardando}
            className="w-14 h-14 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all disabled:cursor-not-allowed flex items-center justify-center group cursor-pointer"
            title={guardando ? 'Guardando...' : 'Guardar Cambios'}
          >
            {guardando ? (
              <div className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL crear / editar recompensa
          modalKey se incrementa cada apertura → remount limpio del estado
      ═══════════════════════════════════════════════════════════════════ */}
      <ModalRecompensa
        key={modalKey}
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        recompensa={recompensaEditando}
        onGuardar={handleGuardarRecompensa}
      />
    </div>
  );
}