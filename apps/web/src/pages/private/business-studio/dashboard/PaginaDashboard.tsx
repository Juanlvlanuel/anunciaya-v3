/**
 * PaginaDashboard.tsx
 * ====================
 * Página principal del Dashboard de Business Studio
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/PaginaDashboard.tsx
 * 
 * LAYOUT MÓVIL OPTIMIZADO:
 * - Banner alertas urgentes (solo si hay no leídas)
 * - 1 KPI principal grande (Ventas)
 * - 2 KPIs horizontales compactos (Clientes, Transacciones)
 * - 4 KPIs secundarios prioritarios (2x2)
 * - Panel Campañas más grande (solo 2)
 * - Gráfica colapsable
 * - Interacciones simplificadas
 * 
 * LAYOUT DESKTOP:
 * - 3 KPIs principales + 4 mini stats verticales en 1 fila
 * - Sin porcentajes ni tendencias
 */

import { useEffect, useState, useMemo } from 'react';
import { useDashboardStore } from '../../../../stores/useDashboardStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import ofertasService from '../../../../services/ofertasService';
import articulosService from '../../../../services/articulosService';
import { notificar } from '../../../../utils/notificaciones';
import type { Oferta, CrearOfertaInput, ActualizarOfertaInput } from '../../../../types/ofertas';
import type { CrearArticuloInput, ActualizarArticuloInput } from '../../../../types/articulos';
import type { Periodo } from '../../../../services/dashboardService';
import Tooltip from '../../../../components/ui/Tooltip';
import { CarouselKPI } from '../../../../components/ui/CarouselKPI';

// Componentes
import GraficaVentas from './componentes/GraficaVentas';
import PanelCampanas from './componentes/PanelCampanas';
import PanelInteracciones from './componentes/PanelInteracciones';
import PanelAlertas from './componentes/PanelAlertas';
import BannerAlertasUrgentes from './componentes/BannerAlertasUrgentes';
import GraficaColapsable from './componentes/GraficaColapsable';
import { ModalOferta } from '../ofertas/ModalOferta';
import { ModalArticulo } from '../catalogo/ModalArticulo';

// Iconos
import {
  DollarSign,
  Users,
  CreditCard,
  Heart,
  Star,
  Eye,
  UserPlus,
  RefreshCw,
  Loader2,
  LayoutDashboard,
} from 'lucide-react';

// =============================================================================
// COMPONENTE
// =============================================================================

// =============================================================================
// CSS — Animación del icono del header (patrón estandarizado BS)
// =============================================================================

const ESTILOS_CSS = `
  @keyframes dashboard-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .dashboard-icon-bounce {
    animation: dashboard-icon-bounce 2s ease-in-out infinite;
  }
  .dash-carousel::-webkit-scrollbar { display: none; }
  .dash-carousel { -ms-overflow-style: none; scrollbar-width: none; }

  /* — Click — */
  @keyframes kpi-bounce {
    0%, 100% { transform: translateY(0); }
    35% { transform: translateY(-9px); }
    65% { transform: translateY(-4px); }
  }
  @keyframes kpi-heartbeat {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(1.55); }
    55% { transform: scale(1.2); }
  }
  @keyframes kpi-spin {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(1.3); }
    100% { transform: rotate(360deg) scale(1); }
  }
  @keyframes kpi-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    40% { transform: scale(1.45); opacity: 0.75; }
  }
  /* — Idle — */
  @keyframes kpi-idle-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes kpi-idle-heart {
    0%, 80%, 100% { transform: scale(1); }
    40% { transform: scale(1.18); }
    60% { transform: scale(1.08); }
  }
  @keyframes kpi-idle-spin {
    0%, 100% { transform: rotate(-12deg); }
    50% { transform: rotate(12deg); }
  }
  @keyframes kpi-idle-eye {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.15); }
  }

  .anim-bounce      { animation: kpi-bounce      0.5s ease; }
  .anim-heart       { animation: kpi-heartbeat   0.5s ease; }
  .anim-spin        { animation: kpi-spin         0.5s ease; }
  .anim-pulse       { animation: kpi-pulse        0.5s ease; }

  .anim-idle-float  { animation: kpi-idle-float   2.2s ease-in-out infinite; }
  .anim-idle-heart  { animation: kpi-idle-heart   1.6s ease-in-out infinite; }
  .anim-idle-spin   { animation: kpi-idle-spin    2.8s ease-in-out infinite; }
  .anim-idle-eye    { animation: kpi-idle-eye     3.5s ease-in-out infinite; }
`;

// =============================================================================
// CONSTANTES — Periodos (movido desde HeaderDashboard)
// =============================================================================

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: 'hoy', label: 'Hoy' },
  { valor: 'semana', label: '7 días' },
  { valor: 'mes', label: '30 días' },
  { valor: 'trimestre', label: '90 días' },
  { valor: 'anio', label: '12 meses' },
];

export default function PaginaDashboard() {
  const [animandoStat, setAnimandoStat] = useState<string | null>(null);

  const animarStat = (id: string) => setAnimandoStat(id);

  const {
    kpis,
    ventas,
    campanas,
    interacciones,
    alertas,
    cargandoKpis,
    cargarTodo,
    periodo,
    setPeriodo,
    limpiar,
  } = useDashboardStore();

  // Escuchar cambios en sucursalActiva
  const sucursalActiva = useAuthStore((state) => state.usuario?.sucursalActiva);
  const usuario = useAuthStore((state) => state.usuario);

  // Estado para animación del botón refresh
  const [refrescando, setRefrescando] = useState(false);

  useEffect(() => {
    // Solo cargar en modo comercial
    if (usuario?.modoActivo !== 'comercial') {
      return;
    }

    // Esperar a que haya sucursalActiva
    if (!sucursalActiva) {
      return;
    }

    cargarTodo();

    return () => limpiar();
  }, [cargarTodo, sucursalActiva, usuario?.modoActivo, limpiar]);

  // Estado del modal de ofertas
  const [modalOfertaAbierto, setModalOfertaAbierto] = useState(false);
  const [ofertaSeleccionada, setOfertaSeleccionada] = useState<Oferta | null>(null);

  // Estado del modal de artículos
  const [modalArticuloAbierto, setModalArticuloAbierto] = useState(false);

  // Filtrar alertas urgentes (no leídas)
  const alertasUrgentes = alertas?.alertas.filter(a => !a.leida) ?? [];

  // ===========================================================================
  // ORDENAR CAMPAÑAS POR FECHA DE VENCIMIENTO
  // ===========================================================================

  // Ordenar campañas: las más próximas a vencer primero
  const campanasOrdenadas = useMemo(() => {
    return [...campanas].sort((a, b) => {
      const fechaA = new Date(a.fechaFin).getTime();
      const fechaB = new Date(b.fechaFin).getTime();
      return fechaA - fechaB; // Las más cercanas primero
    });
  }, [campanas]);

  // ===========================================================================
  // HANDLERS PARA PANEL DE CAMPAÑAS
  // ===========================================================================

  // Abrir modal para editar oferta existente (carga datos completos del backend)
  const handleEditarOferta = async (ofertaId: string) => {
    try {
      const respuesta = await ofertasService.obtenerOferta(ofertaId);
      if (respuesta.data) {
        setOfertaSeleccionada(respuesta.data);
        setModalOfertaAbierto(true);
      } else {
        notificar.error('Oferta no encontrada');
      }
    } catch (error) {
      console.error('Error al cargar oferta:', error);
      notificar.error('Error al cargar la oferta');
    }
  };

  // Cerrar modal
  const handleCerrarModal = () => {
    setModalOfertaAbierto(false);
    setOfertaSeleccionada(null);
  };

  // Guardar oferta (crear o actualizar)
  const handleGuardarOferta = async (datos: CrearOfertaInput | ActualizarOfertaInput) => {
    try {
      if (ofertaSeleccionada) {
        // Actualizar
        await ofertasService.actualizarOferta(ofertaSeleccionada.id, datos as ActualizarOfertaInput);
        notificar.exito('Oferta actualizada');
      } else {
        // Crear
        await ofertasService.crearOferta(datos as CrearOfertaInput);
        notificar.exito('Oferta creada');
      }
      handleCerrarModal();
      // Recargar datos del dashboard
      cargarTodo();
    } catch (error) {
      console.error('Error al guardar oferta:', error);
      notificar.error('Error al guardar la oferta');
    }
  };

  // Guardar artículo (crear o actualizar)
  const handleGuardarArticulo = async (datos: CrearArticuloInput | ActualizarArticuloInput) => {
    try {
      // Solo crear (desde el dashboard siempre es nuevo)
      await articulosService.crearArticulo(datos as CrearArticuloInput);
      notificar.exito('Artículo creado');
      setModalArticuloAbierto(false);
      cargarTodo();
    } catch (error) {
      console.error('Error al guardar artículo:', error);
      notificar.error('Error al guardar el artículo');
    }
  };

  // Handler para botón refresh con animación
  const handleRefresh = async () => {
    setRefrescando(true);
    await cargarTodo();
    setRefrescando(false);
  };

  return (
    <div className="p-3 lg:p-1.5 2xl:p-3">
      <style dangerouslySetInnerHTML={{ __html: ESTILOS_CSS }} />

      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

        {/* ================================================================= */}
        {/* HEADER + KPIs                                                     */}
        {/* ================================================================= */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
          {/* Header con icono animado — solo desktop */}
          <div className="hidden lg:flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6, #60a5fa)',
                boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
              }}
            >
              <div className="dashboard-icon-bounce">
                <LayoutDashboard className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                Dashboard
              </h1>
              <p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
                Métricas y actividad
              </p>
            </div>
          </div>

          {/* KPIs COMPACTOS — Carousel en móvil, fila en desktop */}
          <CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
            <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">
              {/* Ventas */}
              <div
                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4, #fff)',
                  border: '2px solid #86efac',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)', boxShadow: '0 3px 8px rgba(22,163,74,0.25)' }}
                >
                  <DollarSign className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-emerald-700" />
                </div>
                <div className="text-left">
                  <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-emerald-700">
                    {cargandoKpis ? '—' : `$${(kpis?.ventas.valor ?? 0).toLocaleString('es-MX')}`}
                  </div>
                  <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Ventas</div>
                </div>
              </div>

              {/* Clientes */}
              <div
                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                style={{
                  background: 'linear-gradient(135deg, #eff6ff, #fff)',
                  border: '2px solid #93c5fd',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #bfdbfe, #93c5fd)', boxShadow: '0 3px 8px rgba(37,99,235,0.25)' }}
                >
                  <Users className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                </div>
                <div className="text-left">
                  <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">
                    {cargandoKpis ? '—' : (kpis?.clientes.valor ?? 0)}
                  </div>
                  <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Clientes</div>
                </div>
              </div>

              {/* Transacciones */}
              <div
                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                style={{
                  background: 'linear-gradient(135deg, #f5f3ff, #fff)',
                  border: '2px solid #c4b5fd',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                }}
              >
                <div
                  className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #ddd6fe, #c4b5fd)', boxShadow: '0 3px 8px rgba(139,92,246,0.25)' }}
                >
                  <CreditCard className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-violet-700" />
                </div>
                <div className="text-left">
                  <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-violet-700">
                    {cargandoKpis ? '—' : (kpis?.transacciones.valor ?? 0)}
                  </div>
                  <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Transacciones</div>
                </div>
              </div>

            </div>
          </CarouselKPI>
        </div>

        {/* ================================================================= */}
        {/* LAYOUT MÓVIL                                                      */}
        {/* ================================================================= */}
        <div className="lg:hidden space-y-3">
          {/* Banner Alertas Urgentes */}
          {alertasUrgentes.length > 0 && (
            <BannerAlertasUrgentes alertas={alertasUrgentes} />
          )}

          {/* 4 Stats Secundarios — icono + valor en línea */}
          <div className="grid grid-cols-4">
            <Tooltip text="Seguidores" position="bottom" triggerOnClick autoHide={2000}>
              <div className="flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => animarStat('followers')}>
                <UserPlus
                  className={`w-6 h-6 text-blue-500 shrink-0 ${animandoStat === 'followers' ? 'anim-bounce' : 'anim-idle-float'}`}
                  onAnimationEnd={animandoStat === 'followers' ? () => setAnimandoStat(null) : undefined}
                />
                <span className="font-bold text-base text-blue-700">{kpis?.followers ?? 0}</span>
              </div>
            </Tooltip>
            <Tooltip text="Likes" position="bottom" triggerOnClick autoHide={2000}>
              <div className="flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => animarStat('likes')}>
                <Heart
                  className={`w-6 h-6 text-pink-500 shrink-0 ${animandoStat === 'likes' ? 'anim-heart' : 'anim-idle-heart'}`}
                  onAnimationEnd={animandoStat === 'likes' ? () => setAnimandoStat(null) : undefined}
                />
                <span className="font-bold text-base text-pink-700">{kpis?.likes.valor ?? 0}</span>
              </div>
            </Tooltip>
            <Tooltip text="Rating" position="bottom" triggerOnClick autoHide={2000}>
              <div className="flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => animarStat('rating')}>
                <Star
                  className={`w-6 h-6 text-yellow-500 shrink-0 ${animandoStat === 'rating' ? 'anim-spin' : 'anim-idle-spin'}`}
                  onAnimationEnd={animandoStat === 'rating' ? () => setAnimandoStat(null) : undefined}
                />
                <span className="font-bold text-base text-yellow-700">{(kpis?.rating.valor ?? 0).toFixed(1)}</span>
              </div>
            </Tooltip>
            <Tooltip text="Vistas" position="bottom" triggerOnClick autoHide={2000}>
              <div className="flex items-center justify-center gap-1.5 cursor-pointer" onClick={() => animarStat('vistas')}>
                <Eye
                  className={`w-6 h-6 text-slate-500 shrink-0 ${animandoStat === 'vistas' ? 'anim-pulse' : 'anim-idle-eye'}`}
                  onAnimationEnd={animandoStat === 'vistas' ? () => setAnimandoStat(null) : undefined}
                />
                <span className="font-bold text-base text-slate-700">{kpis?.vistas.valor ?? 0}</span>
              </div>
            </Tooltip>
          </div>

          {/* Selector de Período */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5">
              {[
                { valor: 'hoy', label: 'Hoy' },
                { valor: 'semana', label: '7d' },
                { valor: 'mes', label: '30d' },
                { valor: 'trimestre', label: '90d' },
              ].map(({ valor, label }) => (
                <button
                  key={valor}
                  onClick={() => setPeriodo(valor as Periodo)}
                  className={`flex-1 h-10 rounded-lg text-sm font-semibold cursor-pointer ${periodo === valor
                    ? 'text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-300'
                  }`}
                  style={periodo === valor ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refrescando}
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-white border-2 border-slate-300 text-slate-600"
              title="Actualizar"
            >
              {refrescando
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <RefreshCw className="w-5 h-5" />
              }
            </button>
          </div>

          {/* Gráfica Colapsable */}
          <GraficaColapsable datos={ventas} />

          {/* Panel Campañas */}
          <PanelCampanas
            campanas={campanasOrdenadas}
            totalActivas={kpis?.ofertasActivas ?? 0}
            onEditar={handleEditarOferta}
            vistaMobil={true}
          />

          {/* Interacciones */}
          <PanelInteracciones interacciones={interacciones.slice(0, 4)} vistaMobil={true} />

          {/* Alertas */}
          {alertas && alertas.alertas.length > 0 && (
            <PanelAlertas alertas={alertas} vistaMobil={true} />
          )}
        </div>

        {/* ================================================================= */}
        {/* LAYOUT DESKTOP                                                    */}
        {/* ================================================================= */}
        <div className="hidden lg:block space-y-3 2xl:space-y-3 lg:mt-7 2xl:mt-14">

          {/* Stats animados (izq) + Periodo + Refresh (der) */}
          <div className="flex items-center justify-between">
            {/* Stats animados — estilo móvil, más grandes en PC */}
            <div className="flex items-center gap-5 lg:gap-5 2xl:gap-7">
              <Tooltip text="Seguidores" position="bottom">
                <div className="flex items-center gap-2 2xl:gap-2.5 cursor-pointer" onClick={() => animarStat('followers')}>
                  <UserPlus
                    className={`w-7 h-7 2xl:w-8 2xl:h-8 text-blue-500 shrink-0 ${animandoStat === 'followers' ? 'anim-bounce' : 'anim-idle-float'}`}
                    onAnimationEnd={animandoStat === 'followers' ? () => setAnimandoStat(null) : undefined}
                  />
                  <span className="font-bold text-sm 2xl:text-base text-blue-700">{kpis?.followers ?? 0}</span>
                </div>
              </Tooltip>
              <Tooltip text="Likes" position="bottom">
                <div className="flex items-center gap-2 2xl:gap-2.5 cursor-pointer" onClick={() => animarStat('likes')}>
                  <Heart
                    className={`w-7 h-7 2xl:w-8 2xl:h-8 text-pink-500 shrink-0 ${animandoStat === 'likes' ? 'anim-heart' : 'anim-idle-heart'}`}
                    onAnimationEnd={animandoStat === 'likes' ? () => setAnimandoStat(null) : undefined}
                  />
                  <span className="font-bold text-sm 2xl:text-base text-pink-700">{kpis?.likes.valor ?? 0}</span>
                </div>
              </Tooltip>
              <Tooltip text="Rating" position="bottom">
                <div className="flex items-center gap-2 2xl:gap-2.5 cursor-pointer" onClick={() => animarStat('rating')}>
                  <Star
                    className={`w-7 h-7 2xl:w-8 2xl:h-8 text-yellow-500 shrink-0 ${animandoStat === 'rating' ? 'anim-spin' : 'anim-idle-spin'}`}
                    onAnimationEnd={animandoStat === 'rating' ? () => setAnimandoStat(null) : undefined}
                  />
                  <span className="font-bold text-sm 2xl:text-base text-yellow-700">{(kpis?.rating.valor ?? 0).toFixed(1)}</span>
                </div>
              </Tooltip>
              <Tooltip text="Vistas" position="bottom">
                <div className="flex items-center gap-2 2xl:gap-2.5 cursor-pointer" onClick={() => animarStat('vistas')}>
                  <Eye
                    className={`w-7 h-7 2xl:w-8 2xl:h-8 text-slate-500 shrink-0 ${animandoStat === 'vistas' ? 'anim-pulse' : 'anim-idle-eye'}`}
                    onAnimationEnd={animandoStat === 'vistas' ? () => setAnimandoStat(null) : undefined}
                  />
                  <span className="font-bold text-sm 2xl:text-base text-slate-700">{kpis?.vistas.valor ?? 0}</span>
                </div>
              </Tooltip>
            </div>

            {/* Selector de periodo + Refresh */}
            <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
              <div className="flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 shadow-md">
                {PERIODOS.map((p) => (
                  <button
                    key={p.valor}
                    onClick={() => setPeriodo(p.valor)}
                    className={`px-3 2xl:px-4 h-9 2xl:h-10 flex items-center rounded-lg text-xs 2xl:text-sm font-semibold whitespace-nowrap cursor-pointer ${periodo === p.valor
                      ? 'text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-300'
                    }`}
                    style={periodo === p.valor ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Tooltip text="Actualizar" position="bottom">
                <button
                  onClick={handleRefresh}
                  disabled={refrescando}
                  className="p-2 2xl:p-2.5 rounded-lg 2xl:rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 2xl:w-5 2xl:h-5 ${refrescando ? 'animate-spin' : ''}`} />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Campañas + Alertas + Ventas | Actividad Reciente */}
          <div className="flex gap-3 2xl:gap-4 lg:h-[520px] 2xl:h-[630px]">
            {/* Columna izquierda */}
            <div className="w-[55%] 2xl:w-[58%] shrink-0 flex flex-col gap-2 lg:gap-1.5 2xl:gap-2">
              <div className="flex-1 min-h-0">
                <GraficaVentas datos={ventas} vertical={true} />
              </div>
              <div className="grid grid-cols-2 gap-2 lg:gap-1.5 2xl:gap-2">
                <PanelCampanas
                  campanas={campanasOrdenadas}
                  totalActivas={kpis?.ofertasActivas ?? 0}
                  onEditar={handleEditarOferta}
                />
                <PanelAlertas alertas={alertas} />
              </div>
            </div>
            {/* Columna derecha — Actividad Reciente (misma altura que izquierda) */}
            <div className="flex-1 min-w-0 flex flex-col">
              <PanelInteracciones interacciones={interacciones} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Oferta */}
      <ModalOferta
        abierto={modalOfertaAbierto}
        onCerrar={handleCerrarModal}
        oferta={ofertaSeleccionada}
        onGuardar={handleGuardarOferta}
      />

      {/* Modal de Artículo */}
      {modalArticuloAbierto && (
        <ModalArticulo
          onCerrar={() => setModalArticuloAbierto(false)}
          onGuardar={handleGuardarArticulo}
        />
      )}
    </div>
  );
}