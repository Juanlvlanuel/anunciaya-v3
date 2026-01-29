/**
 * PaginaScanYA.tsx
 * ================
 * Dashboard principal de ScanYA - LAYOUT 2 COLUMNAS PC.
 *
 * Layout:
 * - Móvil: Vertical (como antes)
 * - PC (lg:): 2 columnas
 *   - Izquierda (60%): MI TURNO (diseño híbrido premium)
 *   - Derecha (40%): Botón Otorgar Puntos + Indicadores + Help Text
 *
 * Ubicación: apps/web/src/pages/private/scanya/PaginaScanYA.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useScanYAStore, selectContadorRecordatorios } from '@/stores/useScanYAStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useTituloPagina } from '@/hooks/useTituloPagina';
import { notificar } from '@/utils/notificaciones';
import scanyaService from '@/services/scanyaService';
import {
  HeaderScanYA,
  ResumenTurno,
  IndicadoresRapidos,
  ModalCerrarTurno,
  InfoNegocioBar,
  ModalRegistrarVenta,
  ModalHistorial,
  ModalVouchers,
  ModalCanjearVoucher,
  ModalRecordatorios,
} from '@/components/scanya';
import type { RecordatorioScanYA } from '@/types/scanya';
import type { TurnoScanYA, RespuestaTurnoActual } from '@/types/scanya';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaScanYA() {
  // ---------------------------------------------------------------------------
  // HOOKS Y ESTADO
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();
  const { usuario, turnoActivo, setTurnoActivo, eliminarRecordatorioOffline, sincronizarRecordatorios } = useScanYAStore();
  const online = useOnlineStatus();
  const contadorRecordatorios = useScanYAStore(selectContadorRecordatorios);
  const prevOnlineRef = useRef(online);

  // Cambiar título de la página
  useTituloPagina('ScanYA - Puntos de Lealtad');

  const [turno, setTurno] = useState<TurnoScanYA | null>(turnoActivo);
  const [contadores, setContadores] = useState({
    recordatoriosPendientes: 0,
    mensajesSinLeer: 0,
    resenasPendientes: 0,
  });

  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [cargandoTurno, setCargandoTurno] = useState(false);

  // Estado unificado para controlar qué modal está abierto (evita conflictos y temblores)
  type ModalActivo = 'ninguno' | 'cerrar' | 'venta' | 'historial' | 'vouchers' | 'canjear' | 'recordatorios';
  const [modalActivo, setModalActivo] = useState<ModalActivo>('ninguno');
  const [voucherACanjear, setVoucherACanjear] = useState<{ voucherId: string; clienteId: string; clienteNombre: string; recompensaNombre: string; } | null>(null);

  // Contadores de cambios para forzar recarga de modales
  const [cambiosHistorial, setCambiosHistorial] = useState(0);
  const [cambiosVouchers, setCambiosVouchers] = useState(0);

  // Estados para Recordatorios Offline (Fase 13)
  const [modoOffline, setModoOffline] = useState(false);
  const [datosPreLlenado, setDatosPreLlenado] = useState<{
    telefonoOAlias?: string;
    monto?: number;
    metodoPago?: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
    montoEfectivo?: number;
    montoTarjeta?: number;
    montoTransferencia?: number;
    nota?: string;
    recordatorioId?: string;
  } | undefined>(undefined);


  // ---------------------------------------------------------------------------
  // CARGAR DATOS AL MONTAR Y CUANDO CAMBIA EL ESTADO ONLINE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Detectar cambio de offline → online
    const cambioAOnline = !prevOnlineRef.current && online;

    if (online) {
      // Si acabamos de volver online, sincronizar primero
      if (cambioAOnline) {
        sincronizarRecordatorios().then(() => {
          cargarDatos();
        });
      } else {
        // Si ya estaba online, solo cargar datos
        cargarDatos();
      }
    } else {

      setCargandoDatos(false);

      // Resetear contador a solo los de localStorage (no puedes procesar los del servidor sin internet)
      setContadores(prev => ({
        ...prev,
        recordatoriosPendientes: contadorRecordatorios,
      }));

    }

    // Actualizar ref
    prevOnlineRef.current = online;
  }, [online]);

  // Sincronizar contador de recordatorios del store con estado local
  // OFFLINE: Solo mostrar los de localStorage (los que puede procesar sin internet)
  // ONLINE: cargarDatos() muestra solo los del servidor (ya incluyen los sincronizados)
  useEffect(() => {
    if (!online) {
      // Offline: Solo mostrar los que guardó offline (puede procesarlos cuando vuelva internet)
      setContadores(prev => ({
        ...prev,
        recordatoriosPendientes: contadorRecordatorios,
      }));
    }
    // Si está online, cargarDatos() se encarga de mostrar solo los del servidor
  }, [contadorRecordatorios, online]);

  useEffect(() => {
    // Solo bloquear scroll en pantallas grandes (lg: 1024px+)
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    
    const aplicarOverflow = () => {
      if (mediaQuery.matches) {
        document.documentElement.style.overflow = 'hidden';
      } else {
        document.documentElement.style.overflow = '';
      }
    };

    // Aplicar inicialmente
    aplicarOverflow();

    // Escuchar cambios de tamaño
    mediaQuery.addEventListener('change', aplicarOverflow);

    return () => {
      document.documentElement.style.overflow = '';
      mediaQuery.removeEventListener('change', aplicarOverflow);
    };
  }, []);

  /**
   * Carga el turno actual y los contadores
   */
  const cargarDatos = async () => {
    setCargandoDatos(true);

    try {
      // Cargar turno y contadores en paralelo
      const [respuestaTurno, respuestaContadores] = await Promise.all([
        scanyaService.obtenerTurnoActual(),
        scanyaService.obtenerContadores(),
      ]);

      // Turno
      if (respuestaTurno.success && respuestaTurno.data) {
        const data = respuestaTurno.data as unknown as RespuestaTurnoActual;
        if (data.turno) {
          setTurno(data.turno);
          setTurnoActivo(data.turno);
        }
      } else {
        setTurno(null);
        setTurnoActivo(null);
      }

      // Contadores
      if (respuestaContadores.success && respuestaContadores.data) {
        setContadores({
          ...respuestaContadores.data,
          // ONLINE: Solo mostrar los del servidor (ya incluyen los sincronizados)
          // NO sumar localStorage porque duplicaría el conteo
          recordatoriosPendientes: respuestaContadores.data.recordatoriosPendientes,
        });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      // Si falla la conexión, al menos mostrar los recordatorios de localStorage
      setContadores(prev => ({
        ...prev,
        recordatoriosPendientes: contadorRecordatorios,
      }));
      // Solo mostrar error si no está offline (evitar spam de errores)
      if (online) {
        notificar.error('Error al cargar datos del dashboard');
      }
    } finally {
      setCargandoDatos(false);
    }
  };


  // ---------------------------------------------------------------------------
  // HANDLERS: TURNOS
  // ---------------------------------------------------------------------------

  /**
   * Abre un nuevo turno
   */
  const handleAbrirTurno = async () => {
    setCargandoTurno(true);

    try {
      const respuesta = await scanyaService.abrirTurno();

      if (respuesta.success && respuesta.data) {
        // Recargar datos completos para obtener el turno con todos los campos
        await cargarDatos();
        notificar.exito('Turno abierto correctamente');
      } else {
        notificar.error(respuesta.message || 'Error al abrir turno');
      }
    } catch (error) {
      console.error('Error abriendo turno:', error);
      notificar.error('Error al abrir turno');
    } finally {
      setCargandoTurno(false);
    }
  };

  /**
   * Cierra el turno actual
   */
  const handleCerrarTurno = async (notasCierre?: string) => {
    if (!turno) return;

    setCargandoTurno(true);
    setModalActivo('ninguno');

    try {
      const respuesta = await scanyaService.cerrarTurno(turno.id, notasCierre);

      if (respuesta.success) {
        setTurno(null);
        setTurnoActivo(null);
        notificar.exito('Turno cerrado correctamente');
      } else {
        notificar.error(respuesta.message || 'Error al cerrar turno');
      }
    } catch (error) {
      console.error('Error cerrando turno:', error);
      notificar.error('Error al cerrar turno');
    } finally {
      setCargandoTurno(false);
    }
  };

  // ---------------------------------------------------------------------------
  // HANDLERS: NAVEGACIÓN
  // ---------------------------------------------------------------------------

  /**
   * Abre el modal para registrar venta (requiere turno abierto)
   */
  const handleOtorgarPuntos = () => {
    // Si no hay conexión, abrir modal en modo offline
    if (!online) {
      setModoOffline(true);
      setDatosPreLlenado(undefined);
      setModalActivo('venta');
      return;
    }

    // Si hay conexión, requiere turno abierto
    if (!turno) {
      notificar.advertencia('Debes abrir un turno primero');
      return;
    }

    setModoOffline(false);
    setDatosPreLlenado(undefined);
    setModalActivo('venta');
  };

  /**
     * Navega a una ruta específica o abre modal
     */
  const handleNavigate = (ruta: string) => {
    // Interceptar historial para abrir modal
    if (ruta === '/scanya/historial') {
      setModalActivo('historial');
      return;
    }
    // Interceptar vouchers para abrir modal
    if (ruta === '/scanya/vouchers') {
      setModalActivo('vouchers');
      return;
    }
    // Interceptar recordatorios para abrir modal
    if (ruta === '/scanya/recordatorios') {
      setModalActivo('recordatorios');
      return;
    }
    navigate(ruta);
  };

  /**
   * Maneja el canje de un voucher
   */
  const handleCanjearVoucher = (voucherId: string, clienteId: string, clienteNombre: string, recompensaNombre: string) => {
    setVoucherACanjear({
      voucherId,
      clienteId,
      clienteNombre,
      recompensaNombre,
    });
    setModalActivo('canjear');
  };

  /**
   * Callback cuando se canjea exitosamente un voucher
   */
  const handleVoucherCanjeado = () => {
    setVoucherACanjear(null);
    setModalActivo('ninguno');

    // Incrementar contador para forzar recarga de vouchers
    setCambiosVouchers(prev => prev + 1);

    cargarDatos(); // Recargar para actualizar contadores
  };

  // ---------------------------------------------------------------------------
  // HANDLERS PARA RECORDATORIOS OFFLINE (Fase 13)
  // ---------------------------------------------------------------------------

  /**
   * Procesar recordatorio: Abre directamente el formulario de venta con datos pre-llenados
   */
  const handleProcesarRecordatorio = (recordatorio: RecordatorioScanYA) => {
    setDatosPreLlenado({
      telefonoOAlias: recordatorio.telefonoOAlias,
      monto: recordatorio.monto,
      metodoPago: recordatorio.montoEfectivo > 0 && recordatorio.montoTarjeta === 0 && recordatorio.montoTransferencia === 0 ? 'efectivo' :
        recordatorio.montoTarjeta > 0 && recordatorio.montoEfectivo === 0 && recordatorio.montoTransferencia === 0 ? 'tarjeta' :
          recordatorio.montoTransferencia > 0 && recordatorio.montoEfectivo === 0 && recordatorio.montoTarjeta === 0 ? 'transferencia' :
            'mixto',
      montoEfectivo: recordatorio.montoEfectivo,
      montoTarjeta: recordatorio.montoTarjeta,
      montoTransferencia: recordatorio.montoTransferencia,
      nota: recordatorio.nota ?? undefined,
      recordatorioId: recordatorio.id,
    });
    setModoOffline(false);
    setModalActivo('venta');
  };

  /**
   * Editar un recordatorio (cuando está offline)
   * Abre directamente el modal de venta con datos pre-llenados
   */
  const handleEditarRecordatorio = (recordatorio: RecordatorioScanYA) => {
    setDatosPreLlenado({
      telefonoOAlias: recordatorio.telefonoOAlias,
      monto: recordatorio.monto,
      metodoPago: recordatorio.montoEfectivo > 0 && recordatorio.montoTarjeta === 0 && recordatorio.montoTransferencia === 0 ? 'efectivo' :
        recordatorio.montoTarjeta > 0 && recordatorio.montoEfectivo === 0 && recordatorio.montoTransferencia === 0 ? 'tarjeta' :
          recordatorio.montoTransferencia > 0 && recordatorio.montoEfectivo === 0 && recordatorio.montoTarjeta === 0 ? 'transferencia' :
            'mixto',
      montoEfectivo: recordatorio.montoEfectivo,
      montoTarjeta: recordatorio.montoTarjeta,
      montoTransferencia: recordatorio.montoTransferencia,
      nota: recordatorio.nota ?? undefined,
      recordatorioId: recordatorio.id,
    });
    // Eliminar el recordatorio anterior del localStorage (se reemplazará al guardar)
    eliminarRecordatorioOffline(recordatorio.id);
    setModoOffline(true); // Mantener modo offline para que guarde en localStorage
    setModalActivo('venta');
  };


  /**
   * Descartar un recordatorio
   */
  const handleDescartarRecordatorio = async (recordatorio: RecordatorioScanYA) => {
    const esDeLocalStorage = recordatorio.id.startsWith('temp_');

    // ACTUALIZACIÓN OPTIMISTA - decrementar contador inmediatamente
    setContadores(prev => ({
      ...prev,
      recordatoriosPendientes: Math.max(0, prev.recordatoriosPendientes - 1),
    }));

    try {
      if (esDeLocalStorage) {
        // Recordatorio de localStorage - eliminar localmente
        eliminarRecordatorioOffline(recordatorio.id);
        notificar.exito('Recordatorio descartado');
      } else {
        // Recordatorio del servidor - llamar API
        const respuesta = await scanyaService.descartarRecordatorio(recordatorio.id);
        if (respuesta.success) {
          notificar.exito('Recordatorio descartado');
        } else {
          // Si falla, REVERTIR contador
          setContadores(prev => ({
            ...prev,
            recordatoriosPendientes: prev.recordatoriosPendientes + 1,
          }));
          notificar.error(respuesta.message || 'Error al descartar');
        }
      }
    } catch (error) {
      console.error('Error descartando recordatorio:', error);
      // Si falla, REVERTIR contador
      setContadores(prev => ({
        ...prev,
        recordatoriosPendientes: prev.recordatoriosPendientes + 1,
      }));
      notificar.error('Error de conexión');
    }
  };

  const handleVentaRegistrada = () => {
    // Si venía de un recordatorio de localStorage, eliminarlo
    if (datosPreLlenado?.recordatorioId?.startsWith('temp_')) {
      eliminarRecordatorioOffline(datosPreLlenado.recordatorioId);
    }

    // ⚡ ACTUALIZACIÓN OPTIMISTA DEL BADGE (AGREGAR ESTAS 7 LÍNEAS)
    if (datosPreLlenado?.recordatorioId) {
      setContadores(prev => ({
        ...prev,
        recordatoriosPendientes: Math.max(0, prev.recordatoriosPendientes - 1)
      }));
    }

    // Incrementar contador para forzar recarga del historial
    setCambiosHistorial(prev => prev + 1);

    // Incrementar contador para forzar recarga de vouchers (pueden generarse nuevos)
    setCambiosVouchers(prev => prev + 1);

    // Solo cargar datos del servidor si está online
    if (online) {
      cargarDatos();
    }

    setDatosPreLlenado(undefined);
    setModoOffline(false);
  };

  // ---------------------------------------------------------------------------
  // SI NO HAY USUARIO, NO RENDERIZAR
  // ---------------------------------------------------------------------------
  if (!usuario) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="h-screen overflow-hidden relative scanya-no-refresh">
      {/* Fondo Gradient Flow */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #000000 0%, #001d3d 50%, #000000 100%)'
        }}
      >        {/* Esferas de gradiente flotantes */}
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4), transparent)',
            filter: 'blur(80px)',
            top: '-100px',
            left: '-100px',
            animation: 'float-orb-1 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(30, 58, 138, 0.4), transparent)',
            filter: 'blur(80px)',
            bottom: '-50px',
            right: '-50px',
            animation: 'float-orb-2 20s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[250px] h-[250px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(96, 165, 250, 0.3), transparent)',
            filter: 'blur(80px)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'float-orb-3 20s ease-in-out infinite',
          }}
        />

        {/* Partículas flotantes */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-[7px] h-[7px] bg-[#3B82F6] rounded-full opacity-60"
              style={{
                left: `${10 + i * 12}%`,
                animation: `particle-rise 15s linear infinite`,
                animationDelay: `${i * 2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Todo el contenido con z-index para estar encima del fondo */}
      <div className={`relative z-10 h-full flex flex-col transition-all duration-300 ${(['venta', 'historial', 'vouchers', 'canjear', 'recordatorios'].includes(modalActivo)) ? 'lg:mr-[350px] 2xl:mr-[450px]' : ''}`}>        {/* Header */}
        <HeaderScanYA />

        {/* Barra Info Negocio (solo móvil, sin contenedor) */}
        <InfoNegocioBar />

        {/* Contenido Principal */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 2xl:px-8 py-3 lg:py-5 2xl:py-6 2xl:mt-30 lg:flex lg:items-center lg:justify-center 2xl:block">
          {/* Loading inicial */}
          {cargandoDatos ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[#A0A0A0] text-sm">Cargando dashboard...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 
                LAYOUT RESPONSIVE:
                - Móvil: Vertical (flex-col)
                - PC (lg:): 2 Columnas (grid-cols-[1.5fr_1fr])
              */}
              <div className="
                w-full lg:w-auto 2xl:w-full
                lg:max-w-[1000px]
                2xl:max-w-[1000px]
                2xl:mx-auto
                
                flex flex-col
                lg:grid lg:grid-cols-[1.5fr_1fr]
                gap-5 lg:gap-0 2xl:gap-8
                lg:mt-12 2xl:mt-0
              ">
                {/* ========================================== */}
                {/* COLUMNA IZQUIERDA: MI TURNO (60%) */}
                {/* ========================================== */}
                <div>
                  <ResumenTurno
                    turno={turno}
                    onAbrirTurno={handleAbrirTurno}
                    onCerrarTurno={() => setModalActivo('cerrar')}
                    cargando={cargandoTurno}
                    nombreUsuario={usuario.nombreUsuario}
                  />
                </div>

                {/* ========================================== */}
                {/* COLUMNA DERECHA: ACCIONES (40%) */}
                {/* ========================================== */}
                <div className="flex flex-col -mt-1 lg:gap-4 2xl:gap-5">

                  {/* Botón Principal: Otorgar Puntos */}
                  <button
                    onClick={handleOtorgarPuntos}
                    disabled={!turno && online}
                    className="
                      w-full
                      bg-linear-to-br from-[#F97316] to-[#DC2626]
                      hover:from-[#EA580C] hover:to-[#B91C1C]
                      disabled:from-[#F97316]/40 disabled:to-[#DC2626]/40
                      cursor-pointer
                      disabled:cursor-not-allowed
                      text-white font-bold
                      disabled:text-white/50
                      py-3 lg:py-3 lg:mt-1 2xl:py-5 2xl:mt-0
                      rounded-xl
                      flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2
                      shadow-lg
                      disabled:shadow-none
                      transition-all duration-200
                      text-base lg:text-base 2xl:text-xl
                    "
                  >
                    <Zap
                      className="w-5 h-5 lg:w-6 lg:h-6 2xl:w-9 2xl:h-9"
                      fill="currentColor"
                    />
                    {!online
                      ? 'Guardar Recordatorio'
                      : turno
                        ? 'Registrar Venta'
                        : 'Abre un turno para comenzar'
                    }
                  </button>

                  {/* Indicadores Rápidos */}
                  <IndicadoresRapidos
                    contadores={contadores}
                    onNavigate={handleNavigate}
                  />

                  {/* Información de ayuda - SOLO DESKTOP */}
                  <div
                    className="
                      hidden lg:block
                      rounded-xl
                      p-3 mt-0 lg:p-2 2xl:p-3.5 2xl:mt-6.5
                    "
                    style={{
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <p className="text-[#94A3B8] text-sm lg:text-sm 2xl:text-base text-center">
                      {turno
                        ? 'Toca "Otorgar Puntos" para registrar una venta'
                        : 'Abre un turno para comenzar a otorgar puntos'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Modal Cerrar Turno */}
        {turno && (
          <ModalCerrarTurno
            turno={turno}
            abierto={modalActivo === 'cerrar'}
            onClose={() => setModalActivo('ninguno')}
            onConfirmar={handleCerrarTurno}
            cargando={cargandoTurno}
          />
        )}

        {/* Modal Registrar Venta (Drawer en PC, ModalBottom en móvil) */}
        <ModalRegistrarVenta
          abierto={modalActivo === 'venta'}
          onClose={() => {
            // Si venía de un recordatorio, volver a abrir el modal de recordatorios
            if (datosPreLlenado?.recordatorioId) {
              setModalActivo('recordatorios');
            } else {
              setModalActivo('ninguno');
            }
            setModoOffline(false);
            setDatosPreLlenado(undefined);
          }}
          onVentaRegistrada={handleVentaRegistrada}
          modoOffline={modoOffline}
          datosPreLlenado={datosPreLlenado}
        />

        {/* Modal Historial de Transacciones */}
        <ModalHistorial
          abierto={modalActivo === 'historial'}
          onClose={() => setModalActivo('ninguno')}
          cambiosHistorial={cambiosHistorial}
        />

        <ModalVouchers
          abierto={modalActivo === 'vouchers'}
          onClose={() => setModalActivo('ninguno')}
          onCanjearVoucher={handleCanjearVoucher}
          cambiosVouchers={cambiosVouchers}
        />

        {/* Modal Validar Voucher (centrado) */}
        <ModalCanjearVoucher
          abierto={modalActivo === 'canjear'}
          onClose={() => {
            setModalActivo('ninguno');
            setVoucherACanjear(null);
          }}
          voucherId={voucherACanjear?.voucherId || null}
          clienteId={voucherACanjear?.clienteId || null}
          clienteNombre={voucherACanjear?.clienteNombre || ''}
          recompensaNombre={voucherACanjear?.recompensaNombre || ''}
          onVoucherCanjeado={handleVoucherCanjeado}
        />

        {/* Modal Recordatorios (Fase 13) */}
        <ModalRecordatorios
          abierto={modalActivo === 'recordatorios'}
          onClose={() => setModalActivo('ninguno')}
          onProcesar={handleProcesarRecordatorio}
          onEditar={handleEditarRecordatorio}
          onDescartar={handleDescartarRecordatorio}
          onRecordatoriosCargados={(cantidad) => {
            setContadores(prev => ({
              ...prev,
              recordatoriosPendientes: cantidad,
            }));
          }}
        />


        {/* Estilos para animaciones del fondo */}
        <style>{`
        /* Animaciones de esferas flotantes */
        @keyframes float-orb-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(50px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-50px, 50px) scale(0.9);
          }
        }

        @keyframes float-orb-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(-40px, 40px) scale(1.05);
          }
          66% {
            transform: translate(40px, -40px) scale(0.95);
          }
        }

        @keyframes float-orb-3 {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.15);
          }
        }

        /* Animación de partículas ascendentes */
        @keyframes particle-rise {
          0% {
            transform: translateY(600px);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100px);
            opacity: 0;
          }
         }
        `}</style>
      </div>
    </div>
  );
}