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

// Componentes
import HeaderDashboard from './componentes/HeaderDashboard';
import KPIPrincipal from './componentes/KPIPrincipal';
import KPISecundario from './componentes/KPISecundario';
import GraficaVentas from './componentes/GraficaVentas';
import PanelCampanas from './componentes/PanelCampanas';
import PanelInteracciones from './componentes/PanelInteracciones';
import PanelOpiniones from './componentes/PanelOpiniones';
import PanelAlertas from './componentes/PanelAlertas';
import BannerAlertasUrgentes from './componentes/BannerAlertasUrgentes';
import KPICompacto from './componentes/KPICompacto';
import GraficaColapsable from './componentes/GraficaColapsable';
import { ModalOferta } from '../ofertas/ModalOferta';
import { ModalArticulo } from '../catalogo/ModalArticulo';

// Iconos
import {
  DollarSign,
  Users,
  CreditCard,
  Ticket,
  Tag,
  Heart,
  Star,
  Eye,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PaginaDashboard() {
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

  // Cargar datos al montar Y cuando cambie la sucursal
  useEffect(() => {
    // Si es modo comercial, esperar a que haya sucursalActiva
    if (usuario?.modoActivo === 'comercial' && !sucursalActiva) {
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
    <div className="p-3 lg:p-1.5 2xl:p-3">
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-8 lg:space-y-7 2xl:space-y-14">
        {/* Header */}
        <HeaderDashboard
          onNuevaOferta={handleNuevaOferta}
          onNuevoArticulo={handleNuevoArticulo}
        />

        {/* Banner Alertas Urgentes - SOLO MÓVIL - SOLO SI HAY ALERTAS NO LEÍDAS */}
        {alertasUrgentes.length > 0 && (
          <div className="lg:hidden">
            <BannerAlertasUrgentes alertas={alertasUrgentes} />
          </div>
        )}

        {/* =================================================================== */}
        {/* LAYOUT MÓVIL - Optimizado */}
        {/* =================================================================== */}
        <div className="lg:hidden space-y-3">
          {/* Filtros de Período - SOLO MÓVIL - Discretos */}
          <div className="flex items-center justify-center gap-2">
            {/* Filtros */}
            {[
              { valor: 'hoy', label: 'Hoy' },
              { valor: 'semana', label: '7 días' },
              { valor: 'mes', label: '30 días' },
            ].map((p) => (
              <button
                key={p.valor}
                onClick={() => setPeriodo(p.valor as Periodo)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${periodo === p.valor
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-blue-50 border border-slate-200'
                  }`}
              >
                {p.label}
              </button>
            ))}

            {/* Botón refresh */}
            <button
              onClick={handleRefresh}
              disabled={refrescando}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 ${refrescando ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* 1 KPI Principal Grande - VENTAS */}
          <KPIPrincipal
            titulo="Ventas Totales"
            valor={kpis?.ventas.valor ?? 0}
            miniGrafica={kpis?.ventas.miniGrafica ?? []}
            icono={DollarSign}
            colorIcono="from-emerald-500 to-teal-600"
            formato="moneda"
            cargando={cargandoKpis}
          />

          {/* 2 KPIs Compactos Horizontales - CLIENTES + TRANSACCIONES */}
          <div className="grid grid-cols-2 gap-3">
            <KPICompacto
              titulo="Clientes"
              valor={kpis?.clientes.valor ?? 0}
              icono={Users}
              colorIcono="from-blue-500 to-indigo-600"
              subtitulo={`${kpis?.clientes.nuevos ?? 0} nuevos`}
              cargando={cargandoKpis}
            />
            <KPICompacto
              titulo="Transacciones"
              valor={kpis?.transacciones.valor ?? 0}
              icono={CreditCard}
              colorIcono="from-violet-500 to-purple-600"
              subtitulo={`Ticket prom: $${kpis?.transacciones.ticketPromedio?.toLocaleString() ?? 0}`}
              cargando={cargandoKpis}
            />
          </div>

          {/* 4 KPIs Secundarios Prioritarios (2x2) */}
          <div className="grid grid-cols-2 gap-3">
            <KPISecundario
              titulo="Cupones Canjeados"
              valor={kpis?.cuponesCanjeados.valor ?? 0}
              icono={Ticket}
              color="text-amber-600"
              bgColor="bg-amber-50"
            />
            <KPISecundario
              titulo="Ofertas Activas"
              valor={kpis?.ofertasActivas ?? 0}
              icono={Tag}
              color="text-rose-600"
              bgColor="bg-rose-50"
            />
            <KPISecundario
              titulo="Rating Perfil"
              valor={kpis?.rating.valor ?? 0}
              subtitulo={`${kpis?.rating.totalResenas ?? 0} reseñas`}
              icono={Star}
              color="text-yellow-600"
              bgColor="bg-yellow-50"
              formato="decimal"
            />
            <KPISecundario
              titulo="Vistas del Perfil"
              valor={kpis?.vistas.valor ?? 0}
              icono={Eye}
              color="text-slate-600"
              bgColor="bg-slate-100"
            />
          </div>

          {/* Panel Campañas - Solo 2, más grandes */}
          <PanelCampanas
            campanas={campanasOrdenadas.slice(0, 2)}
            totalActivas={kpis?.ofertasActivas ?? 0}
            onEditar={handleEditarOferta}
            vistaMobil={true}
          />

          {/* Gráfica Colapsable */}
          <GraficaColapsable datos={ventas} />

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
        <div className="hidden lg:block space-y-3 2xl:space-y-4">
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
                  colorIcono="from-emerald-500 to-teal-600"
                  formato="moneda"
                  cargando={cargandoKpis}
                />
                <KPIPrincipal
                  titulo="Clientes Totales"
                  valor={kpis?.clientes.valor ?? 0}
                  icono={Users}
                  colorIcono="from-blue-500 to-indigo-600"
                  subtitulo={`Nuevos: ${kpis?.clientes.nuevos ?? 0} · Recurrentes: ${kpis?.clientes.recurrentes ?? 0}`}
                  cargando={cargandoKpis}
                />
                <KPIPrincipal
                  titulo="Transacciones"
                  valor={kpis?.transacciones.valor ?? 0}
                  icono={CreditCard}
                  colorIcono="from-violet-500 to-purple-600"
                  subtitulo={`Ticket Prom: $${kpis?.transacciones.ticketPromedio?.toLocaleString() ?? 0}`}
                  cargando={cargandoKpis}
                />
              </div>

              {/* 4 Mini Stats como Pills Horizontales */}
              <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-full">
                  <UserPlus className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                  <span className="font-bold text-sm lg:text-xs 2xl:text-sm">{kpis?.followers ?? 0}</span>
                  <span className="text-blue-500 text-sm lg:text-xs 2xl:text-base">Followers</span>
                </div>
                <div className="flex items-center gap-1.5 bg-pink-50 text-pink-700 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-full">
                  <Heart className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                  <span className="font-bold text-sm lg:text-xs 2xl:text-sm">{kpis?.likes.valor ?? 0}</span>
                  <span className="text-pink-500 text-sm lg:text-xs 2xl:text-base">Likes</span>
                </div>
                <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-full">
                  <Star className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                  <span className="font-bold text-sm lg:text-xs 2xl:text-sm">{(kpis?.rating.valor ?? 0).toFixed(1)}</span>
                  <span className="text-yellow-600 text-sm lg:text-xs 2xl:text-base">Rating</span>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 lg:px-2.5 lg:py-1 2xl:px-3 2xl:py-1.5 rounded-full">
                  <Eye className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                  <span className="font-bold text-sm lg:text-xs 2xl:text-sm">{kpis?.vistas.valor ?? 0}</span>
                  <span className="text-blue-500 text-sm lg:text-xs 2xl:text-base">Vistas</span>
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
  );
}