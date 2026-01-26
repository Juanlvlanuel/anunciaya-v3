/**
 * ModalRecordatorios.tsx
 * =======================
 * Modal para ver la lista de recordatorios pendientes.
 * Se adapta según el tipo de usuario (dueño, gerente, empleado).
 *
 * Comportamiento por vista:
 * - PC (lg:): Drawer lateral derecho (~450px)
 * - Móvil: ModalBottom (85% altura), slide-up
 *
 * Ubicación: apps/web/src/components/scanya/ModalRecordatorios.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    X,
    ArrowLeft,
    ClipboardList,
    Loader2,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import { useScanYAStore } from '@/stores/useScanYAStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import scanyaService from '@/services/scanyaService';
import type { RecordatorioScanYA } from '@/types/scanya';
import { TarjetaRecordatorio } from './TarjetaRecordatorio';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalRecordatoriosProps {
    abierto: boolean;
    onClose: () => void;
    onProcesar: (recordatorio: RecordatorioScanYA) => void;
    onEditar: (recordatorio: RecordatorioScanYA) => void;
    onDescartar: (recordatorio: RecordatorioScanYA) => void;
    onRecordatoriosCargados?: (cantidad: number) => void;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalRecordatorios({
    abierto,
    onClose,
    onProcesar,
    onEditar,
    onDescartar,
    onRecordatoriosCargados,
}: ModalRecordatoriosProps) {
    // ---------------------------------------------------------------------------
    // Store
    // ---------------------------------------------------------------------------
    const { usuario } = useScanYAStore();
    const online = useOnlineStatus();
    const cantidadRecordatoriosOffline = useScanYAStore(s => s.recordatoriosOffline.length);
    const tipoUsuario = usuario?.tipo || 'empleado';

    // ---------------------------------------------------------------------------
    // Estado
    // ---------------------------------------------------------------------------
    const [recordatorios, setRecordatorios] = useState<RecordatorioScanYA[]>([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [yaCargo, setYaCargo] = useState(false);
    const prevOnline = useRef(online);
    // ---------------------------------------------------------------------------
    // Títulos según rol
    // ---------------------------------------------------------------------------
    const getTitulo = (): string => {
        switch (tipoUsuario) {
            case 'dueno':
                return 'Recordatorios';
            case 'gerente':
                return 'Recordatorios';
            case 'empleado':
                return 'Mis Recordatorios';
            default:
                return 'Recordatorios';
        }
    };

    const getSubtitulo = (): string => {
        switch (tipoUsuario) {
            case 'dueno':
                return 'Todas las sucursales';
            case 'gerente':
                return usuario?.nombreSucursal || 'Tu sucursal';
            case 'empleado':
                return 'Ventas pendientes de procesar';
            default:
                return '';
        }
    };

    // ---------------------------------------------------------------------------
    // Cargar recordatorios
    // ---------------------------------------------------------------------------
    const cargarRecordatorios = useCallback(async () => {
        setCargando(true);
        setError(null);

        try {
            if (!online) {
                // MODO OFFLINE: Cargar de localStorage
                const recordatoriosOffline = useScanYAStore.getState().recordatoriosOffline;

                // Convertir formato RecordatorioOffline a RecordatorioScanYA
                const convertidos: RecordatorioScanYA[] = recordatoriosOffline.map(r => ({
                    id: r.id,
                    negocioId: usuario?.negocioId || '',
                    sucursalId: usuario?.sucursalId || '',
                    empleadoId: usuario?.usuarioId || null,
                    telefonoOAlias: r.telefonoOAlias,
                    monto: r.monto,
                    montoEfectivo: r.montoEfectivo,
                    montoTarjeta: r.montoTarjeta,
                    montoTransferencia: r.montoTransferencia,
                    nota: r.nota || null,
                    estado: 'pendiente',
                    procesadoAt: null,
                    procesadoPor: null,
                    transaccionId: null,
                    createdAt: r.createdAt,
                }));

                setRecordatorios(convertidos);
                onRecordatoriosCargados?.(convertidos.length);

            } else {
                // MODO ONLINE: Cargar del servidor + localStorage
                const respuesta = await scanyaService.obtenerRecordatorios();

                if (respuesta.success && respuesta.data) {
                    // Mapear recordatorios del servidor al tipo RecordatorioScanYA
                    const pendientesServidor: RecordatorioScanYA[] = respuesta.data.recordatorios.map(r => ({
                        id: r.id,
                        negocioId: usuario?.negocioId || '',
                        sucursalId: usuario?.sucursalId || '',
                        empleadoId: null, // El servidor no devuelve empleadoId, solo empleadoNombre
                        telefonoOAlias: r.telefonoOAlias,
                        monto: r.monto,
                        montoEfectivo: r.montoEfectivo,
                        montoTarjeta: r.montoTarjeta,
                        montoTransferencia: r.montoTransferencia,
                        nota: r.nota,
                        estado: 'pendiente',
                        procesadoAt: null,
                        procesadoPor: null,
                        transaccionId: null,
                        createdAt: r.createdAt,
                        // Campos extra para mostrar en UI
                        empleadoNombre: r.empleadoNombre,
                        sucursalNombre: r.sucursalNombre,
                    }));

                    // También agregar los de localStorage (pueden estar pendientes de sincronizar)
                    const recordatoriosOffline = useScanYAStore.getState().recordatoriosOffline;
                    const convertidos: RecordatorioScanYA[] = recordatoriosOffline.map(r => ({
                        id: r.id,
                        negocioId: usuario?.negocioId || '',
                        sucursalId: usuario?.sucursalId || '',
                        empleadoId: usuario?.usuarioId || null,
                        telefonoOAlias: r.telefonoOAlias,
                        monto: r.monto,
                        montoEfectivo: r.montoEfectivo,
                        montoTarjeta: r.montoTarjeta,
                        montoTransferencia: r.montoTransferencia,
                        nota: r.nota || null,
                        estado: 'pendiente',
                        procesadoAt: null,
                        procesadoPor: null,
                        transaccionId: null,
                        createdAt: r.createdAt,
                    }));

                    // Combinar: servidor + localStorage (sin duplicados)
                    const todos = [...pendientesServidor, ...convertidos];
                    setRecordatorios(todos);
                    onRecordatoriosCargados?.(todos.length);
                } else {
                    // Si el servidor falla, al menos mostrar los de localStorage
                    const recordatoriosOffline = useScanYAStore.getState().recordatoriosOffline;
                    if (recordatoriosOffline.length > 0) {
                        const convertidos: RecordatorioScanYA[] = recordatoriosOffline.map(r => ({
                            id: r.id,
                            negocioId: usuario?.negocioId || '',
                            sucursalId: usuario?.sucursalId || '',
                            empleadoId: usuario?.usuarioId || null,
                            telefonoOAlias: r.telefonoOAlias,
                            monto: r.monto,
                            montoEfectivo: r.montoEfectivo,
                            montoTarjeta: r.montoTarjeta,
                            montoTransferencia: r.montoTransferencia,
                            nota: r.nota || null,
                            estado: 'pendiente',
                            procesadoAt: null,
                            procesadoPor: null,
                            transaccionId: null,
                            createdAt: r.createdAt,
                        }));
                        setRecordatorios(convertidos);
                        onRecordatoriosCargados?.(convertidos.length);
                    }
                    // No mostrar error si hay datos de localStorage
                    if (recordatoriosOffline.length === 0) {
                        setError(respuesta.message || 'Error al cargar recordatorios');
                    }
                }
            }
        } catch (err) {
            console.error('Error cargando recordatorios:', err);

            // Si falla la carga online, intentar mostrar al menos los de localStorage
            if (online) {
                const recordatoriosOffline = useScanYAStore.getState().recordatoriosOffline;
                if (recordatoriosOffline.length > 0) {
                    const convertidos: RecordatorioScanYA[] = recordatoriosOffline.map(r => ({
                        id: r.id,
                        negocioId: usuario?.negocioId || '',
                        sucursalId: usuario?.sucursalId || '',
                        empleadoId: usuario?.usuarioId || null,
                        telefonoOAlias: r.telefonoOAlias,
                        monto: r.monto,
                        montoEfectivo: r.montoEfectivo,
                        montoTarjeta: r.montoTarjeta,
                        montoTransferencia: r.montoTransferencia,
                        nota: r.nota || null,
                        estado: 'pendiente',
                        procesadoAt: null,
                        procesadoPor: null,
                        transaccionId: null,
                        createdAt: r.createdAt,
                    }));

                    setRecordatorios(convertidos);
                    onRecordatoriosCargados?.(convertidos.length);  // ⬅️ AGREGAR

                    // No mostrar error si tenemos datos de localStorage
                } else {
                    setError('Error de conexión. Intenta de nuevo.');
                }
            } else {
                setError('Error de conexión. Intenta de nuevo.');
            }
        } finally {
            setCargando(false);
        }
    }, [online, usuario]);

    // ---------------------------------------------------------------------------
    // Efectos
    // ---------------------------------------------------------------------------

    // 2. Cargar solo la primera vez que se abre
    useEffect(() => {
        if (abierto && !yaCargo) {
            cargarRecordatorios();
            setYaCargo(true);
        }
    }, [abierto, yaCargo]);

    useEffect(() => {
        // Detectar cambio de offline → online
        if (abierto && online && !prevOnline.current) {
            cargarRecordatorios();
        }
        prevOnline.current = online;
    }, [online, abierto]);

    // 4. Actualizar contador cuando cambian recordatorios offline (sin recargar UI)
    useEffect(() => {
        if (abierto && !online) {
            // Solo actualizar el contador, NO recargar toda la lista
            onRecordatoriosCargados?.(cantidadRecordatoriosOffline);
        }
    }, [cantidadRecordatoriosOffline, abierto, online]);

    // 5. NUEVO: Recargar automáticamente cuando se guarda un nuevo recordatorio
    useEffect(() => {
        if (abierto && cantidadRecordatoriosOffline > 0) {
            // Recargar cuando cambia la cantidad de recordatorios offline
            cargarRecordatorios();
        }
    }, [cantidadRecordatoriosOffline, abierto, cargarRecordatorios]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleProcesar = (recordatorio: RecordatorioScanYA) => {
        // NO eliminar optimistamente - esperar confirmación del padre
        onProcesar(recordatorio);
    };

    const handleEditar = (recordatorio: RecordatorioScanYA) => {
        // NO eliminar optimistamente - esperar confirmación del padre
        onEditar(recordatorio);
    };

    const handleDescartar = async (recordatorio: RecordatorioScanYA) => {
        // 1. OPTIMISTA - eliminar inmediatamente de la lista
        setRecordatorios(prev => prev.filter(r => r.id !== recordatorio.id));

        try {
            // 2. DELETE en background
            await onDescartar(recordatorio);
        } catch (error) {
            // 3. Si falla, REVERTIR
            console.error('Error al descartar, revirtiendo:', error);
            setRecordatorios(prev => [...prev, recordatorio]);
        }
    };

    const handleRefresh = () => {
        setYaCargo(false); // Permitir recarga manual
        cargarRecordatorios();
    };

    // ---------------------------------------------------------------------------
    // Si no está abierto, no renderizar
    // ---------------------------------------------------------------------------
    if (!abierto) return null;

    // ---------------------------------------------------------------------------
    // RENDER PRINCIPAL
    // ---------------------------------------------------------------------------
    return (
        <>
            {/* ================================================================== */}
            {/* OVERLAY - Solo móvil (oscurece el fondo) */}
            {/* ================================================================== */}
            <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" />

            {/* ================================================================== */}
            {/* CONTENEDOR PRINCIPAL */}
            {/* - Móvil: ModalBottom 85% altura, desde abajo */}
            {/* - PC: Drawer lateral derecho 450px */}
            {/* ================================================================== */}
            <div
                className="
          fixed z-50
          inset-x-0 bottom-0 h-[85vh]
          lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[350px] 2xl:w-[450px]
          flex flex-col
          rounded-t-3xl lg:rounded-none
          overflow-hidden
        "
                style={{
                    background: 'linear-gradient(180deg, #0A0A0A 0%, #001020 100%)',
                    boxShadow: '-4px 0 30px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* ============================================================== */}
                {/* HEADER */}
                {/* ============================================================== */}
                <header
                    className="
            relative
            flex items-center gap-3 lg:gap-2 2xl:gap-3
            px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3
            border-b border-white/10
          "
                    style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                >
                    {/* Handle visual solo móvil */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full lg:hidden" />

                    <button onClick={onClose} className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 -ml-2 cursor-pointer">
                        <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </button>

                    <div className="flex-1">
                        <h1 className="text-white font-semibold">{getTitulo()}</h1>
                        <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">{getSubtitulo()}</p>
                    </div>

                    {/* Botón Refresh */}
                    <button
                        onClick={handleRefresh}
                        disabled={cargando}
                        className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed"
                    >
                        <RefreshCw
                            className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#3B82F6] ${cargando ? 'animate-spin' : ''}`}
                        />
                    </button>

                    <button onClick={onClose} className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 -mr-2 cursor-pointer">
                        <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </button>
                </header>

                {/* ============================================================== */}
                {/* CONTENIDO CON SCROLL */}
                {/* ============================================================== */}
                <div className="flex-1 overflow-y-auto">
                    {/* ------------------------------------------------------------ */}
                    {/* Estado: Cargando */}
                    {/* ------------------------------------------------------------ */}
                    {cargando && (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 lg:gap-2 2xl:gap-3">
                            <Loader2 className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#3B82F6] animate-spin" />
                            <p className="text-[#94A3B8]">Cargando recordatorios...</p>
                        </div>
                    )}

                    {/* ------------------------------------------------------------ */}
                    {/* Estado: Error */}
                    {/* ------------------------------------------------------------ */}
                    {!cargando && error && (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-4">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(239, 68, 68, 0.2)' }}
                            >
                                <AlertCircle className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#EF4444]" />
                            </div>
                            <p className="text-[#94A3B8] text-center">{error}</p>
                            <button
                                onClick={handleRefresh}
                                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg cursor-pointer"
                                style={{
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    color: '#3B82F6',
                                }}
                            >
                                <RefreshCw className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                                Reintentar
                            </button>
                        </div>
                    )}

                    {/* ------------------------------------------------------------ */}
                    {/* Estado: Sin recordatorios */}
                    {/* ------------------------------------------------------------ */}
                    {!cargando && !error && recordatorios.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 gap-4 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-4">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(16, 185, 129, 0.2)' }}
                            >
                                <ClipboardList className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#10B981]" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium mb-1 lg:mb-0.5 2xl:mb-1">Sin recordatorios</p>
                                <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">
                                    No hay ventas pendientes de procesar
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ------------------------------------------------------------ */}
                    {/* Lista de recordatorios */}
                    {/* ------------------------------------------------------------ */}
                    {!cargando && !error && recordatorios.length > 0 && (
                        <div className="px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4 space-y-3 lg:space-y-2 2xl:space-y-2">
                            {/* Contador y descripción */}
                            <div className="mb-3 lg:mb-2 2xl:mb-1.5">
                                <p className="text-white font-medium flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                                    <ClipboardList className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#10B981]" />
                                    Ventas pendientes de procesar
                                </p>
                                <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm mt-1">
                                    {recordatorios.length} {recordatorios.length === 1 ? 'recordatorio' : 'recordatorios'}
                                </p>
                            </div>

                            {/* Tarjetas */}
                            {recordatorios.map((recordatorio) => (
                                <TarjetaRecordatorio
                                    key={recordatorio.id}
                                    recordatorio={recordatorio}
                                    tipoUsuario={tipoUsuario}
                                    nombreEmpleado={usuario?.nombreUsuario || 'Desconocido'}
                                    nombreSucursal={usuario?.nombreSucursal}
                                    onProcesar={handleProcesar}
                                    onEditar={handleEditar}
                                    onDescartar={handleDescartar}
                                />
                            ))}

                            {/* Espacio inferior para scroll */}
                            <div className="h-8" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default ModalRecordatorios;