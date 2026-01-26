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
 * - Mantiene estructura original (3 KPIs, 6 secundarios, etc)
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
import PanelMetricasSecundarias from './componentes/PanelMetricasSecundarias';
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
    <div className="bg-linear-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 p-4 lg:p-2 2xl:p-4">
      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-8 lg:space-y-6 2xl:space-y-12">
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
              onClick={handleRefresh}  // ← NUEVO
              disabled={refrescando}  // ← NUEVO
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw className={`w-5 h-5 ${refrescando ? 'animate-spin' : ''}`} />  {/* ← NUEVO */}
            </button>
          </div>

          {/* 1 KPI Principal Grande - VENTAS */}
          <KPIPrincipal
            titulo="Ventas Totales"
            valor={kpis?.ventas.valor ?? 0}
            valorAnterior={kpis?.ventas.valorAnterior ?? 0}
            porcentaje={kpis?.ventas.porcentajeCambio ?? 0}
            tendencia={kpis?.ventas.tendencia ?? 'igual'}
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
              porcentaje={kpis?.clientes.porcentajeCambio ?? 0}
              tendencia={kpis?.clientes.tendencia ?? 'igual'}
              icono={Users}
              colorIcono="from-blue-500 to-indigo-600"
              subtitulo={`${kpis?.clientes.nuevos ?? 0} nuevos`}
              cargando={cargandoKpis}
            />
            <KPICompacto
              titulo="Transacciones"
              valor={kpis?.transacciones.valor ?? 0}
              porcentaje={kpis?.transacciones.porcentajeCambio ?? 0}
              tendencia={kpis?.transacciones.tendencia ?? 'igual'}
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
        {/* LAYOUT DESKTOP - Mantiene estructura original */}
        {/* =================================================================== */}
        <div className="hidden lg:block space-y-4 2xl:space-y-5">
          {/* KPIs Principales - 3 cards grandes */}
          <div className="grid grid-cols-3 gap-4 lg:gap-3 2xl:gap-6">
            <KPIPrincipal
              titulo="Ventas Totales"
              valor={kpis?.ventas.valor ?? 0}
              valorAnterior={kpis?.ventas.valorAnterior ?? 0}
              porcentaje={kpis?.ventas.porcentajeCambio ?? 0}
              tendencia={kpis?.ventas.tendencia ?? 'igual'}
              miniGrafica={kpis?.ventas.miniGrafica ?? []}
              icono={DollarSign}
              colorIcono="from-emerald-500 to-teal-600"
              formato="moneda"
              cargando={cargandoKpis}
            />
            <KPIPrincipal
              titulo="Clientes"
              valor={kpis?.clientes.valor ?? 0}
              valorAnterior={kpis?.clientes.valorAnterior ?? 0}
              porcentaje={kpis?.clientes.porcentajeCambio ?? 0}
              tendencia={kpis?.clientes.tendencia ?? 'igual'}
              icono={Users}
              colorIcono="from-blue-500 to-indigo-600"
              subtitulo={`${kpis?.clientes.nuevos ?? 0} nuevos · ${kpis?.clientes.recurrentes ?? 0} recurrentes`}
              cargando={cargandoKpis}
            />
            <KPIPrincipal
              titulo="Transacciones"
              valor={kpis?.transacciones.valor ?? 0}
              valorAnterior={kpis?.transacciones.valorAnterior ?? 0}
              porcentaje={kpis?.transacciones.porcentajeCambio ?? 0}
              tendencia={kpis?.transacciones.tendencia ?? 'igual'}
              icono={CreditCard}
              colorIcono="from-violet-500 to-purple-600"
              subtitulo={`Ticket prom: $${kpis?.transacciones.ticketPromedio?.toLocaleString() ?? 0}`}
              cargando={cargandoKpis}
            />
          </div>

          {/* KPIs Secundarios - Panel agrupado */}
          <PanelMetricasSecundarias
            metricas={[
              {
                titulo: 'Cupones Canjeados',
                valor: kpis?.cuponesCanjeados.valor ?? 0,
                icono: Ticket,
                color: 'text-amber-600',
                bgColor: 'bg-amber-50',
                mostrarEnLaptop: true,
              },
              {
                titulo: 'Ofertas Activas',
                valor: kpis?.ofertasActivas ?? 0,
                icono: Tag,
                color: 'text-rose-600',
                bgColor: 'bg-rose-50',
                mostrarEnLaptop: true,
              },
              {
                titulo: 'Followers',
                valor: kpis?.followers ?? 0,
                icono: UserPlus,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                mostrarEnLaptop: false, // Solo desktop
              },
              {
                titulo: 'Likes',
                valor: kpis?.likes.valor ?? 0,
                icono: Heart,
                color: 'text-pink-600',
                bgColor: 'bg-pink-50',
                mostrarEnLaptop: false, // Solo desktop
              },
              {
                titulo: 'Rating Perfil',
                valor: kpis?.rating.valor ?? 0,
                subtitulo: `${kpis?.rating.totalResenas ?? 0} reseñas`,
                icono: Star,
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-50',
                formato: 'decimal',
                mostrarEnLaptop: true,
              },
              {
                titulo: 'Vistas del Perfil',
                valor: kpis?.vistas.valor ?? 0,
                icono: Eye,
                color: 'text-slate-600',
                bgColor: 'bg-slate-100',
                mostrarEnLaptop: true,
              },
            ]}
          />

          {/* Gráfica de Ventas + Panel Campañas */}
          <div className="grid grid-cols-3 gap-3 2xl:gap-6">
            <div className="col-span-2 h-full min-h-80 2xl:min-h-[400px]">
              <GraficaVentas datos={ventas} />
            </div>
            <div>
              <PanelCampanas
                campanas={campanasOrdenadas}
                totalActivas={kpis?.ofertasActivas ?? 0}
                onEditar={handleEditarOferta}
              />
            </div>
          </div>

          {/* 3 Columnas: Interacciones, Opiniones, Alertas */}
          <div className="grid grid-cols-3 gap-3 2xl:gap-6">
            <PanelInteracciones interacciones={interacciones} />
            <PanelOpiniones resenas={resenas} />
            <PanelAlertas alertas={alertas} />
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