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

// Componentes
import HeaderDashboard from './componentes/HeaderDashboard';
import KPIPrincipal from './componentes/KPIPrincipal';
import GraficaVentas from './componentes/GraficaVentas';
import PanelCampanas from './componentes/PanelCampanas';
import PanelInteracciones from './componentes/PanelInteracciones';
import PanelOpiniones from './componentes/PanelOpiniones';
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
} from 'lucide-react';

// =============================================================================
// COMPONENTE
// =============================================================================

const kpiAnimStyles = `
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

export default function PaginaDashboard() {
  const [animandoStat, setAnimandoStat] = useState<string | null>(null);

  const animarStat = (id: string) => setAnimandoStat(id);

  const {
    kpis,
    ventas,
    campanas,
    interacciones,
    resenas,
    alertas,
    cargandoKpis,
    cargarTodo,
    periodo,
    setPeriodo,
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
  }, [cargarTodo, sucursalActiva, usuario?.modoActivo]);

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

  // Abrir modal para crear nueva oferta
  const handleNuevaOferta = () => {
    setOfertaSeleccionada(null);
    setModalOfertaAbierto(true);
  };

  // Abrir modal para crear nuevo artículo
  const handleNuevoArticulo = () => {
    setModalArticuloAbierto(true);
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
    <>
    <style>{kpiAnimStyles}</style>
    <div className="p-3 lg:p-1.5 2xl:p-3">
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">
        {/* Header — solo desktop */}
        <div className="hidden lg:block">
          <HeaderDashboard
            onNuevaOferta={handleNuevaOferta}
            onNuevoArticulo={handleNuevoArticulo}
          />
        </div>

        {/* Banner Alertas Urgentes - SOLO MÓVIL - SOLO SI HAY ALERTAS NO LEÍDAS */}
        {alertasUrgentes.length > 0 && (
          <div className="lg:hidden">
            <BannerAlertasUrgentes alertas={alertasUrgentes} />
          </div>
        )}

        {/* =================================================================== */}
        {/* LAYOUT MÓVIL - Optimizado */}
        {/* =================================================================== */}
        <div className="mt-5 lg:mt-0 lg:hidden space-y-3">
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

          {/* Selector de Período — SOLO MÓVIL */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5">
              {[
                { valor: 'hoy',       label: 'Hoy' },
                { valor: 'semana',    label: '7d'  },
                { valor: 'mes',       label: '30d' },
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

          {/* KPIs + Gráfica agrupados — ambos dependen de los filtros de período */}
          <div className="space-y-2">
            {/* 3 KPIs como filas en card unificada */}
            <div className="bg-white rounded-xl border-2 border-slate-300 shadow-md overflow-hidden divide-y divide-slate-200">
              <KPIPrincipal
                titulo="Ventas"
                valor={kpis?.ventas.valor ?? 0}
                icono={DollarSign}
                bgIcono="bg-emerald-100"
                textoIcono="text-emerald-600"
                formato="moneda"
                cargando={cargandoKpis}
                filaMovil
              />
              <KPIPrincipal
                titulo="Clientes"
                valor={kpis?.clientes.valor ?? 0}
                icono={Users}
                bgIcono="bg-blue-100"
                textoIcono="text-blue-600"
                cargando={cargandoKpis}
                filaMovil
              />
              <KPIPrincipal
                titulo="Transacciones"
                valor={kpis?.transacciones.valor ?? 0}
                icono={CreditCard}
                bgIcono="bg-violet-100"
                textoIcono="text-violet-600"
                cargando={cargandoKpis}
                filaMovil
              />
            </div>

            {/* Gráfica Colapsable — junto a KPIs, mismos filtros */}
            <GraficaColapsable datos={ventas} />
          </div>

          {/* Panel Campañas */}
          <PanelCampanas
            campanas={campanasOrdenadas}
            totalActivas={kpis?.ofertasActivas ?? 0}
            onEditar={handleEditarOferta}
            vistaMobil={true}
          />

          {/* Interacciones - Simplificadas (solo últimas 3) */}
          <PanelInteracciones interacciones={interacciones.slice(0, 3)} vistaMobil={true} />

          {/* Alertas - Solo si hay */}
          {alertas && alertas.alertas.length > 0 && (
            <PanelAlertas alertas={alertas} vistaMobil={true} />
          )}
        </div>

        {/* =================================================================== */}
        {/* LAYOUT DESKTOP - Nuevo diseño compacto */}
        {/* =================================================================== */}
        <div className="hidden lg:block space-y-3 2xl:space-y-4 lg:mt-14 2xl:mt-14">
          {/* Fila superior: KPIs + Pills + Cupones/Alertas | Gráfica derecha */}
          <div className="flex gap-3 2xl:gap-4">
            {/* Columna izquierda - 60% del ancho */}
            <div className="w-[58%] lg:w-[55%] 2xl:w-[58%] shrink-0 flex flex-col gap-2 2xl:gap-3">
              {/* 3 KPIs Principales */}
              <div className="grid grid-cols-3 gap-2 lg:gap-1.5 2xl:gap-2">
                <KPIPrincipal
                  titulo="Ventas Totales"
                  valor={kpis?.ventas.valor ?? 0}
                  miniGrafica={kpis?.ventas.miniGrafica ?? []}
                  icono={DollarSign}
                  bgIcono="bg-emerald-100"
                  textoIcono="text-emerald-600"
                  formato="moneda"
                  cargando={cargandoKpis}
                />
                <KPIPrincipal
                  titulo="Clientes Totales"
                  valor={kpis?.clientes.valor ?? 0}
                  icono={Users}
                  bgIcono="bg-blue-100"
                  textoIcono="text-blue-600"
                  subtitulo={`Nuevos: ${kpis?.clientes.nuevos ?? 0} · Recurrentes: ${kpis?.clientes.recurrentes ?? 0}`}
                  cargando={cargandoKpis}
                />
                <KPIPrincipal
                  titulo="Transacciones"
                  valor={kpis?.transacciones.valor ?? 0}
                  icono={CreditCard}
                  bgIcono="bg-violet-100"
                  textoIcono="text-violet-600"
                  subtitulo={`Ticket Prom: $${kpis?.transacciones.ticketPromedio?.toLocaleString() ?? 0}`}
                  cargando={cargandoKpis}
                />
              </div>

              {/* 4 Mini Stats como Pills Horizontales */}
              <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-full">
                  <UserPlus className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4" />
                  <span className="font-bold text-sm lg:text-[11px] 2xl:text-sm">{kpis?.followers ?? 0}</span>
                  <span className="text-blue-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">Followers</span>
                </div>
                <div className="flex items-center gap-1.5 bg-pink-100 text-pink-700 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-full">
                  <Heart className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4" />
                  <span className="font-bold text-sm lg:text-[11px] 2xl:text-sm">{kpis?.likes.valor ?? 0}</span>
                  <span className="text-pink-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">Likes</span>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-full">
                  <Star className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4" />
                  <span className="font-bold text-sm lg:text-[11px] 2xl:text-sm">{(kpis?.rating.valor ?? 0).toFixed(1)}</span>
                  <span className="text-yellow-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">Rating</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-100 text-blue-700 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-full">
                  <Eye className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4" />
                  <span className="font-bold text-sm lg:text-[11px] 2xl:text-sm">{kpis?.vistas.valor ?? 0}</span>
                  <span className="text-blue-600 text-sm lg:text-[11px] 2xl:text-sm font-medium">Vistas</span>
                </div>
              </div>

              {/* Cupones/Ofertas + Alertas (más compactos) */}
              <div className="grid grid-cols-2 gap-2 lg:gap-1.5 2xl:gap-2 flex-1">
                <PanelCampanas
                  campanas={campanasOrdenadas}
                  totalActivas={kpis?.ofertasActivas ?? 0}
                  onEditar={handleEditarOferta}
                />
                <PanelAlertas alertas={alertas} />
              </div>
            </div>

            {/* Columna derecha: Gráfica Vertical - ocupa el resto */}
            <div className="flex-1 min-w-0">
              <GraficaVentas datos={ventas} vertical={true} />
            </div>
          </div>

          {/* Fila inferior: Opiniones + Interacciones */}
          <div className="grid grid-cols-2 gap-3 2xl:gap-4">
            <PanelOpiniones resenas={resenas} />
            <PanelInteracciones interacciones={interacciones} />
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
    </>
  );
}