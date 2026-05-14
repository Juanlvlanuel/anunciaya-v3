/**
 * ModalRegistrarVenta.tsx
 * ========================
 * Modal para registrar venta y otorgar puntos.
 *
 * Comportamiento por vista:
 * - PC (lg:): Drawer lateral derecho (~450px), empuja contenido
 * - Móvil: ModalBottom (75% altura), slide-up
 *
 * Cierre solo con flecha/cruz (no click fuera)
 *
 * Ubicación: apps/web/src/components/scanya/ModalRegistrarVenta.tsx
 */

import { useState, useEffect, useRef } from 'react';
import {
    X,
    ArrowLeft,
    User,
    Camera,
    Ticket,
    ChevronDown,
    ChevronRight,
    Check,
    Loader2,
    Coins,
    Banknote,
    Smartphone,
    Shuffle,
    Edit3,
    CheckCircle,
    UserPlus,
    AlertCircle,
    ShoppingBag,
    Repeat,
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const DollarSign = (p: IconoWrapperProps) => <Icon icon={ICONOS.dinero} {...p} />;
const CreditCard = (p: IconoWrapperProps) => <Icon icon={ICONOS.pagos} {...p} />;
const Trophy = (p: IconoWrapperProps) => <Icon icon={ICONOS.trofeo} {...p} />;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
const Gift = (p: IconoWrapperProps) => <Icon icon={ICONOS.recompensa} {...p} />;
import { notificar } from '@/utils/notificaciones';
import scanyaService from '@/services/scanyaService';
import type { TarjetaSellos } from '@/services/scanyaService';
import { eliminarImagenHuerfana } from '@/services/r2Service';
import useScanYAStore from '@/stores/useScanYAStore';
import type { ConfiguracionScanYA } from '@/types/scanya';

// =============================================================================
// TIPOS
// =============================================================================

type Seccion = 'cliente' | 'monto' | 'metodoPago' | 'foto' | 'cupon' | 'tarjetaSellos' | 'nota' | 'concepto';
type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';

interface ModalRegistrarVentaProps {
    abierto: boolean;
    onClose: () => void;
    onVentaRegistrada?: () => void;
    // MODO OFFLINE:
    modoOffline?: boolean;
    datosPreLlenado?: {
        telefonoOAlias?: string;
        monto?: number;
        metodoPago?: MetodoPago;
        montoEfectivo?: number;
        montoTarjeta?: number;
        montoTransferencia?: number;
        nota?: string;
        recordatorioId?: string;
    };
}

interface ClienteIdentificado {
    id: string;
    nombre: string;
    telefono: string;
    nivel: string;
    multiplicador: number;
    puntosDisponibles: number;
    esNuevo: boolean;
}

interface DesglosePago {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
}

interface CuponAplicado {
    id: string;
    ofertaUsuarioId: string;
    codigo: string;
    tipo: string;
    descuento: number;
    compraMinima: number;
    titulo: string;
    descuentoInfo: string;
    descripcion: string | null;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const METODOS_PAGO = [
    { id: 'efectivo' as MetodoPago, nombre: 'Efectivo', icono: Banknote },
    { id: 'tarjeta' as MetodoPago, nombre: 'Tarjeta', icono: CreditCard },
    { id: 'transferencia' as MetodoPago, nombre: 'Transf.', icono: Smartphone },
    { id: 'mixto' as MetodoPago, nombre: 'Mixto', icono: Shuffle },
] as const;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalRegistrarVenta({
    abierto,
    onClose,
    onVentaRegistrada,
    modoOffline = false,
    datosPreLlenado
}: ModalRegistrarVentaProps) {
    // ---------------------------------------------------------------------------
    // Estado de secciones (acordeón móvil)
    // ---------------------------------------------------------------------------
    const [seccionActiva, setSeccionActiva] = useState<Seccion>('cliente');
    // ---------------------------------------------------------------------------
    // Store de ScanYA
    // ---------------------------------------------------------------------------
    const agregarRecordatorioOffline = useScanYAStore(s => s.agregarRecordatorioOffline);
    const setNivelesActivos = useScanYAStore(s => s.setNivelesActivos);


    // ---------------------------------------------------------------------------
    // Detectar si es móvil (para mostrar/ocultar teclado visual)
    // ---------------------------------------------------------------------------
    const [esMobile, setEsMobile] = useState(false);

    useEffect(() => {
        const verificarMobile = () => setEsMobile(window.innerWidth < 1024);
        verificarMobile();
        window.addEventListener('resize', verificarMobile);
        return () => window.removeEventListener('resize', verificarMobile);
    }, []);

    // ---------------------------------------------------------------------------
    // Estado del formulario
    // ---------------------------------------------------------------------------
    const [telefono, setTelefono] = useState('');
    const [lada, setLada] = useState('+52');
    const [cliente, setCliente] = useState<ClienteIdentificado | null>(null);
    const [buscandoCliente, setBuscandoCliente] = useState(false);
    const [errorCliente, setErrorCliente] = useState<string | null>(null);

    const [monto, setMonto] = useState('');

    const [metodoPago, setMetodoPago] = useState<MetodoPago | null>(null);
    const [desglose, setDesglose] = useState<DesglosePago>({ efectivo: 0, tarjeta: 0, transferencia: 0 });

    const [fotoUrl, setFotoUrl] = useState<string | null>(null);
    const [subiendoFoto, setSubiendoFoto] = useState(false);

    const [codigoCupon, setCodigoCupon] = useState('');
    const [cupon, setCupon] = useState<CuponAplicado | null>(null);
    const [validandoCupon, setValidandoCupon] = useState(false);

    // Tarjeta de sellos
    const [tarjetasSellos, setTarjetasSellos] = useState<TarjetaSellos[]>([]);
    const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState<TarjetaSellos | null>(null);
    const [cargandoTarjetas, setCargandoTarjetas] = useState(false);
    const [nota, setNota] = useState('');
    const [concepto, setConcepto] = useState('');
    const [recordatorioId, setRecordatorioId] = useState<string | null>(null);

    // ---------------------------------------------------------------------------
    // Configuración
    // ---------------------------------------------------------------------------
    const [config, setConfig] = useState<ConfiguracionScanYA | null>(null);

    // ---------------------------------------------------------------------------
    // Estado de procesamiento
    // ---------------------------------------------------------------------------
    const [procesando, setProcesando] = useState(false);
    const [exito, setExito] = useState(false);
    const [resultadoPuntos, setResultadoPuntos] = useState<number>(0);
    const [resultadoSellos, setResultadoSellos] = useState<{ comprasAcumuladas: number; comprasRequeridas: number; desbloqueada: boolean; nombre: string } | null>(null);

    // ---------------------------------------------------------------------------
    // Cargar configuración al abrir
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (abierto) {
            cargarConfiguracion();
            resetearFormulario();
        }
    }, [abierto]);

    // ---------------------------------------------------------------------------
    // Bloquear scroll del body cuando el modal está abierto
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (abierto) {
            // Guardar posición actual del scroll
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.overflow = 'hidden';
        } else {
            // Restaurar posición del scroll
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.overflow = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        return () => {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY) * -1);
            }
        };
    }, [abierto]);

    // ---------------------------------------------------------------------------
    // Pre-llenar datos cuando hay datosPreLlenado
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (abierto && datosPreLlenado) {
            // Separar lada del número de teléfono
            if (datosPreLlenado.telefonoOAlias) {
                const tel = datosPreLlenado.telefonoOAlias;
                if (tel.startsWith('+52')) {
                    setLada('+52');
                    setTelefono(tel.slice(3)); // Quitar +52
                } else if (tel.startsWith('+1')) {
                    setLada('+1');
                    setTelefono(tel.slice(2)); // Quitar +1
                } else {
                    // Si no tiene lada reconocida, asumir que es solo el número
                    setTelefono(tel);
                }
            }
            if (datosPreLlenado.monto) setMonto(datosPreLlenado.monto.toString());
            if (datosPreLlenado.metodoPago) setMetodoPago(datosPreLlenado.metodoPago);
            if (datosPreLlenado.nota) setNota(datosPreLlenado.nota);
            if (datosPreLlenado.recordatorioId) setRecordatorioId(datosPreLlenado.recordatorioId);

            if (datosPreLlenado.metodoPago === 'mixto') {
                setDesglose({
                    efectivo: datosPreLlenado.montoEfectivo || 0,
                    tarjeta: datosPreLlenado.montoTarjeta || 0,
                    transferencia: datosPreLlenado.montoTransferencia || 0,
                });
            }

            // Ejecutar búsqueda de cliente si no está en modo offline
            // Usar setTimeout para asegurar que el estado de telefono se actualizó
            if (!modoOffline && datosPreLlenado.telefonoOAlias) {
                setTimeout(() => {
                    const numeroLimpio = datosPreLlenado.telefonoOAlias!
                        .replace(/^\+52/, '')
                        .replace(/^\+1/, '');
                    if (numeroLimpio.length === 10) {
                        buscarCliente();
                    }
                }, 0);
            }
            if (datosPreLlenado.recordatorioId) {
                setRecordatorioId(datosPreLlenado.recordatorioId);
            }
        }
    }, [abierto, datosPreLlenado, modoOffline]);

    const cargarConfiguracion = async () => {
        try {
            // Solo necesitamos la config de ScanYA (fotoTicket, etc.)
            // La config de puntos la maneja el backend al confirmar
            const respConfig = await scanyaService.obtenerConfigScanYA();

            if (respConfig.success && respConfig.data) {
                setConfig(respConfig.data);
                setNivelesActivos(respConfig.data.nivelesActivos);
            }
        } catch {
            console.error('Error cargando configuración');
            // Si falla, config queda null y usamos defaults en la lógica
        }
    };

    /** Elimina la foto actual de R2 (fire-and-forget) y limpia el estado */
    const eliminarFoto = () => {
        if (fotoUrl) {
            eliminarImagenHuerfana(fotoUrl).catch(() => { /* silencioso */ });
        }
        setFotoUrl(null);
    };

    const resetearFormulario = () => {
        setSeccionActiva('cliente');
        setTelefono('');
        setLada('+52');
        setCliente(null);
        setErrorCliente(null);
        setMonto('');
        setMetodoPago(null);
        setDesglose({ efectivo: 0, tarjeta: 0, transferencia: 0 });
        // Solo eliminar de R2 si la venta NO fue exitosa (foto huérfana)
        if (!exito && fotoUrl) {
            eliminarImagenHuerfana(fotoUrl).catch(() => { /* silencioso */ });
        }
        setFotoUrl(null);
        setCodigoCupon('');
        setCupon(null);
        setTarjetasSellos([]);
        setTarjetaSeleccionada(null);
        setNota('');
        setConcepto('');
        setRecordatorioId(null);
        setExito(false);
        setResultadoPuntos(0);
        setResultadoSellos(null);
        setRecordatorioId(null);
    };

    /** Cierra el modal limpiando foto huérfana de R2 si no hubo éxito */
    const handleCerrar = () => {
        if (!exito && fotoUrl) {
            eliminarImagenHuerfana(fotoUrl).catch(() => { /* silencioso */ });
        }
        onClose();
    };

    // ---------------------------------------------------------------------------
    // Buscar cliente
    // ---------------------------------------------------------------------------
    useEffect(() => {
        // Solo buscar si NO está en modo offline
        if (!modoOffline && telefono.length === 10) {
            buscarCliente();
        } else {
            setCliente(null);
            setErrorCliente(null);
        }
    }, [telefono, modoOffline]);

    const obtenerMultiplicador = (nivel: string): number => {
        if (!config?.multiplicadores) return 1;
        const nivelLower = nivel.toLowerCase();
        if (nivelLower === 'oro') return config.multiplicadores.oro;
        if (nivelLower === 'plata') return config.multiplicadores.plata;
        return config.multiplicadores.bronce;
    };

    const buscarCliente = async () => {
        // No buscar si está en modo offline
        if (modoOffline) {
            return;
        }

        setBuscandoCliente(true);
        try {
            const respuesta = await scanyaService.identificarCliente({ telefono });

            if (respuesta.success && respuesta.data) {
                const { cliente: c, billetera, esNuevoEnNegocio } = respuesta.data;
                setCliente({
                    id: c.id,
                    nombre: `${c.nombre} ${c.apellidos || ''}`.trim(),
                    telefono: c.telefono,
                    nivel: billetera?.nivelActual || 'bronce',
                    multiplicador: obtenerMultiplicador(billetera?.nivelActual || 'bronce'),
                    puntosDisponibles: billetera?.puntosDisponibles || 0,
                    esNuevo: esNuevoEnNegocio,
                });
                setErrorCliente(null);
                // Cargar tarjetas de sellos del cliente
                setCargandoTarjetas(true);
                scanyaService.obtenerTarjetasSellos(c.id)
                    .then((resp) => {
                        if (resp.success && resp.data) {
                            setTarjetasSellos(resp.data.filter((t) => !t.desbloqueada || t.canjeada));
                        }
                    })
                    .catch(() => {})
                    .finally(() => setCargandoTarjetas(false));
                // Avanzar a concepto
                setSeccionActiva('concepto');
            } else {
                setCliente(null);
                setErrorCliente(respuesta.message || 'Cliente no registrado');
            }
        } catch (error: unknown) {
            console.error('Error buscando cliente:', error);
            setCliente(null);

            let mensaje = 'Cliente no registrado en AnunciaYA';
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                mensaje = axiosError.response?.data?.message || mensaje;
            }

            setErrorCliente(mensaje);
        } finally {
            setBuscandoCliente(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Manejar monto
    // ---------------------------------------------------------------------------
    const handleMontoChange = (valor: string) => {
        const regex = /^\d*\.?\d{0,2}$/;
        if (regex.test(valor) || valor === '') {
            setMonto(valor);
        }
    };

    // ---------------------------------------------------------------------------
    // Manejar método de pago
    // ---------------------------------------------------------------------------
    const handleMetodoPagoSelect = (metodo: MetodoPago) => {
        setMetodoPago(metodo);
        const montoNum = parseFloat(monto) || 0;

        if (metodo !== 'mixto') {
            setDesglose({
                efectivo: metodo === 'efectivo' ? montoNum : 0,
                tarjeta: metodo === 'tarjeta' ? montoNum : 0,
                transferencia: metodo === 'transferencia' ? montoNum : 0,
            });
        } else {
            setDesglose({ efectivo: 0, tarjeta: 0, transferencia: 0 });
        }
    };

    // ---------------------------------------------------------------------------
    // Validar código de descuento
    // ---------------------------------------------------------------------------
    const handleValidarCupon = async () => {
        if (!codigoCupon.trim() || !cliente) return;

        setValidandoCupon(true);
        try {
            const respuesta = await scanyaService.validarCodigo({
                codigo: codigoCupon.trim().toUpperCase(),
                clienteId: cliente.id,
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data = respuesta.data as any;
            if (respuesta.success && data?.oferta) {
                const o = data.oferta;
                setCupon({
                    id: o.id,
                    ofertaUsuarioId: String(o.ofertaUsuarioId),
                    codigo: o.codigo,
                    tipo: o.tipo,
                    descuento: o.valor,
                    compraMinima: o.compraMinima || 0,
                    titulo: o.titulo,
                    descuentoInfo: data.descuentoInfo,
                    descripcion: o.descripcion || null,
                });
                notificar.exito(data.descuentoInfo || 'Código aplicado');
            } else {
                notificar.error(respuesta.message || 'Código no válido');
            }
        } catch {
            notificar.error('Error al validar código');
        } finally {
            setValidandoCupon(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Subir foto
    // ---------------------------------------------------------------------------
    const handleFotoCaptura = async (file: File) => {
        setSubiendoFoto(true);
        try {
            const blob = await comprimirImagen(file);
            const nombreArchivo = `ticket_${Date.now()}.webp`;
            const respuesta = await scanyaService.obtenerUrlSubidaTicket(nombreArchivo, 'image/webp');

            if (!respuesta.success || !respuesta.data) {
                throw new Error('Error al obtener URL de subida');
            }

            await fetch(respuesta.data.uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': 'image/webp' },
            });

            setFotoUrl(respuesta.data.publicUrl);
            notificar.exito('Foto subida');
        } catch {
            console.error('Error subiendo foto');
            notificar.error('Error al subir foto');
        } finally {
            setSubiendoFoto(false);
        }
    };

    const comprimirImagen = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                let ancho = img.width;
                let alto = img.height;
                const maxDim = 1920;

                if (ancho > maxDim) {
                    alto = (alto * maxDim) / ancho;
                    ancho = maxDim;
                }
                if (alto > maxDim) {
                    ancho = (ancho * maxDim) / alto;
                    alto = maxDim;
                }

                canvas.width = ancho;
                canvas.height = alto;
                ctx?.drawImage(img, 0, 0, ancho, alto);

                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('Error comprimiendo'))),
                    'image/webp',
                    0.75
                );
            };

            img.onerror = () => reject(new Error('Error cargando imagen'));
            img.src = URL.createObjectURL(file);
        });
    };

    // ---------------------------------------------------------------------------
    // Calcular puntos (preview aproximado - el backend calcula el valor real)
    // ---------------------------------------------------------------------------
    const calcularPuntos = (): number => {
        if (!cliente || !config) return 0;

        const montoNum = parseFloat(monto) || 0;

        // Verificar mínimo de compra
        if (montoNum < config.minimoCompra) return 0;

        let montoFinal = montoNum;

        // Aplicar descuento de código si existe
        if (cupon) {
            switch (cupon.tipo) {
                case 'porcentaje':
                    montoFinal = montoNum * (1 - cupon.descuento / 100);
                    break;
                case 'monto_fijo':
                    montoFinal = Math.max(0, montoNum - cupon.descuento);
                    break;
                // 2x1, 3x2, envio_gratis, otro: descuento a criterio del comerciante
                default:
                    break;
            }
        }

        // Aplicar multiplicador según nivel del cliente
        let multiplicador = 1.0;
        if (config.nivelesActivos && config.multiplicadores) {
            const nivel = cliente.nivel?.toLowerCase() || 'bronce';
            if (nivel === 'oro') {
                multiplicador = config.multiplicadores.oro;
            } else if (nivel === 'plata') {
                multiplicador = config.multiplicadores.plata;
            } else {
                multiplicador = config.multiplicadores.bronce;
            }
        }

        // Un solo floor al final para evitar pérdida por redondeo intermedio
        return Math.floor(montoFinal * config.puntosPorPeso * multiplicador);
    };

    // ---------------------------------------------------------------------------
    // Confirmar venta
    // ---------------------------------------------------------------------------
    const puedeConfirmar = (): boolean => {
        const montoNum = parseFloat(monto) || 0;
        const tieneCupon = !!cupon;
        const montoValido = montoNum > 0 || tieneCupon; // Monto 0 permitido si hay cupón gratis

        // Validar compra mínima si el cupón lo requiere
        if (tieneCupon && cupon.compraMinima > 0 && montoNum < cupon.compraMinima) {
            return false;
        }

        // Modo offline: solo necesita teléfono (10 dígitos), monto y método
        if (modoOffline) {
            return (
                telefono.length === 10 &&
                montoValido &&
                (montoNum === 0 || metodoPago !== null) &&
                (metodoPago !== 'mixto' || validarDesglose())
            );
        }

        // Modo online: necesita cliente identificado
        return (
            cliente !== null &&
            montoValido &&
            (montoNum === 0 || metodoPago !== null) &&
            (metodoPago !== 'mixto' || validarDesglose())
        );
    };

    const validarDesglose = (): boolean => {
        const suma = desglose.efectivo + desglose.tarjeta + desglose.transferencia;
        const montoNum = parseFloat(monto) || 0;
        // Válido si suma es igual o mayor al monto (hay cambio)
        return suma >= montoNum - 0.01;
    };

    // ---------------------------------------------------------------------------
    // Guardar recordatorio (modo offline)
    // ---------------------------------------------------------------------------
    const handleGuardarRecordatorio = async () => {
        setProcesando(true);

        try {
            const datos = {
                telefonoOAlias: `${lada}${telefono}`,
                monto: parseFloat(monto),
                montoEfectivo: metodoPago === 'efectivo' ? parseFloat(monto) :
                    metodoPago === 'mixto' ? desglose.efectivo : 0,
                montoTarjeta: metodoPago === 'tarjeta' ? parseFloat(monto) :
                    metodoPago === 'mixto' ? desglose.tarjeta : 0,
                montoTransferencia: metodoPago === 'transferencia' ? parseFloat(monto) :
                    metodoPago === 'mixto' ? desglose.transferencia : 0,
                nota: nota.trim() || undefined,
                concepto: concepto.trim() || undefined,
            };

            // Guardar en localStorage (no en servidor)
            agregarRecordatorioOffline(datos);

            notificar.exito('Recordatorio Guardado');
            onClose();
            resetearFormulario();
            onVentaRegistrada?.();
        } catch {
            console.error('Error guardando recordatorio offline');
            notificar.error('Error al guardar. Intenta de nuevo.');
        } finally {
            setProcesando(false);
        }
    };

    const handleConfirmar = async () => {

        // SI MODO OFFLINE: Guardar recordatorio en lugar de otorgar puntos
        if (modoOffline) {
            await handleGuardarRecordatorio();
            return;
        }
        if (!puedeConfirmar() || !cliente) return;

        setProcesando(true);
        try {
            // Calcular monto real post-descuento para métodos de pago
            const montoOriginal = parseFloat(monto) || 0;
            const descuentoCupon = cupon ? (
                cupon.tipo === 'porcentaje' ? montoOriginal * (cupon.descuento / 100) :
                cupon.tipo === 'monto_fijo' ? cupon.descuento : 0
            ) : 0;
            const montoReal = Math.max(0, montoOriginal - descuentoCupon);

            // Ajustar desglose de pago al monto real (post-descuento)
            let efReal = desglose.efectivo || 0;
            let tjReal = desglose.tarjeta || 0;
            let trReal = desglose.transferencia || 0;

            if (descuentoCupon > 0 && montoOriginal > 0) {
                const ratio = montoReal / montoOriginal;
                if (metodoPago === 'mixto') {
                    efReal = Math.round(efReal * ratio * 100) / 100;
                    tjReal = Math.round(tjReal * ratio * 100) / 100;
                    trReal = Math.round((montoReal - efReal - tjReal) * 100) / 100;
                } else {
                    efReal = metodoPago === 'efectivo' ? montoReal : 0;
                    tjReal = metodoPago === 'tarjeta' ? montoReal : 0;
                    trReal = metodoPago === 'transferencia' ? montoReal : 0;
                }
            }

            const respuesta = await scanyaService.otorgarPuntos({
                clienteId: cliente.id,
                montoTotal: montoOriginal,
                montoEfectivo: efReal || undefined,
                montoTarjeta: tjReal || undefined,
                montoTransferencia: trReal || undefined,
                cuponId: cupon?.id || undefined,
                cuponOfertaUsuarioId: cupon?.ofertaUsuarioId || undefined,
                fotoTicketUrl: fotoUrl || undefined,
                nota: nota.trim() || undefined,
                concepto: concepto.trim() || undefined,
                recordatorioId: recordatorioId || undefined,
                recompensaSellosId: tarjetaSeleccionada?.id || undefined,
            });

            if (respuesta.success && respuesta.data) {
                setResultadoPuntos(respuesta.data.transaccion.puntosOtorgados);
                setResultadoSellos(respuesta.data.tarjetaSellos);
                setExito(true);
                notificar.exito(`¡${respuesta.message}!`);
                onVentaRegistrada?.(); 
            } else {
                notificar.error(respuesta.message || 'Error al procesar venta');
            }
        } catch {
            console.error('Error procesando venta');
            notificar.error('Error al procesar la venta');
        } finally {
            setProcesando(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Helpers de UI
    // ---------------------------------------------------------------------------
    const formatearMoneda = (valor: number): string => {
        if (valor === undefined || valor === null || isNaN(valor)) return '0.00';
        return valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getColorNivel = (nivel: string): string => {
        switch (nivel.toLowerCase()) {
            case 'oro':
                return '#F59E0B';
            case 'plata':
                return '#94A3B8';
            default:
                return '#CD7F32';
        }
    };

    const seccionCompletada = (seccion: Seccion): boolean => {
        switch (seccion) {
            case 'cliente':
                return modoOffline ? telefono.length === 10 : !!cliente;
            case 'monto':
                return parseFloat(monto) > 0;
            case 'metodoPago':
                return !!metodoPago;
            case 'foto':
                return !!fotoUrl;
            case 'cupon':
                return !!cupon;
            case 'nota':
                return nota.trim().length > 0;
            case 'concepto':
                return concepto.trim().length > 0;
            default:
                return false;
        }
    };

    // ---------------------------------------------------------------------------
    // Si no está abierto, no renderizar
    // ---------------------------------------------------------------------------
    // History back para cerrar con botón nativo del móvil
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!abierto) return;
        let cerradoPorBack = false;
        const mid = `registrar-venta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        history.pushState({ scanyaModal: true, mid }, '');
        const handlePopState = () => {
            cerradoPorBack = true;
            onCloseRef.current();
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
            if (!cerradoPorBack) {
                // Diferir el back: si otro modal abre y hace pushState en este
                // mismo tick, history.state.mid cambia y NO hacemos back (evita
                // el race con el popstate que cerraría el modal nuevo).
                setTimeout(() => {
                    const midActual = (history.state as { mid?: string } | null)?.mid;
                    if (midActual === mid) history.back();
                }, 0);
            }
        };
    }, [abierto]);

    if (!abierto) return null;

    // ---------------------------------------------------------------------------
    // Pantalla de éxito
    // ---------------------------------------------------------------------------
    if (exito) {
        return (
            <>
                {/* Overlay solo móvil */}
                <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" />

                {/* Contenedor éxito */}
                <div
                    className="
            fixed z-50
            inset-x-0 bottom-0 h-full
            lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[350px] 2xl:w-[450px]
            flex items-center justify-center
            rounded-none
          "
                    style={{
                        background: 'linear-gradient(180deg, #0A0A0A 0%, #001020 100%)',
                        boxShadow: '-4px 0 30px rgba(0, 0, 0, 0.5)',
                    }}
                >
                    <div className="w-full max-w-sm mx-4 p-8 lg:p-5 2xl:p-8 text-center">
                        {/* Check animado */}
                        <div
                            className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                            style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)',
                            }}
                        >
                            <CheckCircle className="w-16 h-16 text-[#10B981]" />
                        </div>

                        {(() => {
                            const montoNum = parseFloat(monto) || 0;
                            const esCuponGratis = !!cupon && montoNum === 0;
                            const esVentaConCupon = !!cupon && montoNum > 0;

                            return (
                                <>
                                    <h2 className="text-white text-2xl lg:text-xl 2xl:text-2xl font-bold mb-2 lg:mb-1.5 2xl:mb-2">
                                        {esCuponGratis ? '¡Cupón canjeado!' : esVentaConCupon ? '¡Venta con cupón registrada!' : '¡Puntos otorgados!'}
                                    </h2>

                                    {esCuponGratis ? (
                                        <div className="mb-8">
                                            <p className="text-[#60A5FA] text-lg lg:text-base 2xl:text-lg font-bold mb-1">{cupon?.titulo}</p>
                                            <p className="text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm font-medium">Entrega el producto al cliente</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 mb-4">
                                            <Coins className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#F59E0B]" />
                                            <span className="text-[#F59E0B] text-4xl lg:text-3xl 2xl:text-4xl font-bold">+{resultadoPuntos}</span>
                                        </div>
                                    )}

                                    {resultadoSellos && (
                                        <div data-testid="resultado-sellos" className="mb-6 px-4 py-3 lg:px-3 lg:py-2 2xl:px-4 2xl:py-3 rounded-xl border border-[#334155] bg-[#1E293B]/60">
                                            {resultadoSellos.desbloqueada ? (
                                                <p data-testid="sellos-completada" className="text-center text-base lg:text-sm 2xl:text-base font-bold text-emerald-400">
                                                    🎉 ¡Tarjeta completada! — {resultadoSellos.nombre}
                                                </p>
                                            ) : (
                                                <p data-testid="sellos-progreso" className="text-center text-base lg:text-sm 2xl:text-base font-medium text-[#94A3B8]">
                                                    🎯 {resultadoSellos.nombre} <span className="font-bold text-white">{resultadoSellos.comprasAcumuladas}/{resultadoSellos.comprasRequeridas}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <button
                                            onClick={resetearFormulario}
                                            className="w-full py-4 rounded-xl lg:rounded-md 2xl:rounded-xl font-bold text-lg lg:text-base 2xl:text-lg text-white cursor-pointer"
                                            style={{
                                                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                                                boxShadow: '0 0 20px rgba(249, 115, 22, 0.4)',
                                            }}
                                        >
                                            {esCuponGratis ? 'Nuevo Registro' : 'Nueva Venta'}
                                        </button>

                                        <button
                                            onClick={onClose}
                                            className="w-full py-3 rounded-xl lg:rounded-md 2xl:rounded-xl text-[#94A3B8] border border-[#333] hover:border-[#3B82F6] cursor-pointer"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </>
        );
    }

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
            {/* - Móvil: ModalBottom 75% altura, desde abajo */}
            {/* - PC: Drawer lateral derecho 450px */}
            {/* ================================================================== */}
            <div
                className="
          fixed z-50
          inset-x-0 bottom-0 h-full
          lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[350px] 2xl:w-[450px]
          flex flex-col
          rounded-none
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
            px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-4
            border-b border-white/10
          "
                    style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                >
                    <button onClick={() => history.back()} className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 -ml-2 cursor-pointer">
                        <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </button>
                    <h1 className="text-white font-bold flex-1 text-lg lg:text-sm 2xl:text-base">
                        {modoOffline ? '📋 Guardar Recordatorio' : 'Registrar Venta'}
                    </h1>
                    <button onClick={handleCerrar} className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 -mr-2 cursor-pointer">
                        <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </button>
                </header>

                {/* ============================================================== */}
                {/* CONTENIDO CON SCROLL */}
                {/* ============================================================== */}
                <div className="flex-1 overflow-y-auto pb-32">
                    <div className="px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4 space-y-4 lg:space-y-2 2xl:space-y-3">
                        {/* ========================================= */}
                        {/* SECCIÓN: CLIENTE */}
                        {/* ========================================= */}
                        <div
                            className="rounded-xl lg:rounded-md 2xl:rounded-xl overflow-hidden"
                            style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: `1px solid ${seccionCompletada('cliente') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            }}
                        >
                            {/* Header de sección */}
                            <button
                                onClick={() => setSeccionActiva('cliente')}
                                className="w-full px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 flex items-center gap-3 lg:gap-2 2xl:gap-3 cursor-pointer"
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center"
                                    style={{
                                        background: seccionCompletada('cliente')
                                            ? 'rgba(16, 185, 129, 0.2)'
                                            : 'rgba(59, 130, 246, 0.2)',
                                    }}
                                >
                                    {seccionCompletada('cliente') ? (
                                        <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
                                    ) : (
                                        <User className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">Teléfono del Cliente</p>
                                    {cliente && (
                                        <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm truncate">
                                            {cliente.nombre} {!cliente.esNuevo && config?.nivelesActivos && `• ${cliente.nivel}`}
                                        </p>
                                    )}
                                    {telefono.length === 10 && !cliente && (
                                        <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm truncate">
                                            {lada} {telefono.slice(0, 3)} {telefono.slice(3, 6)} {telefono.slice(6)}
                                        </p>
                                    )}
                                </div>
                                {seccionCompletada('cliente') && seccionActiva !== 'cliente' && (
                                    <Edit3 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#94A3B8]" />
                                )}
                                {seccionActiva === 'cliente' ? (
                                    <ChevronDown className="w-5 h-5 text-[#94A3B8]" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
                                )}
                            </button>

                            {/* Contenido expandido */}
                            {seccionActiva === 'cliente' && (
                                <div className="px-4 pb-4">
                                    {modoOffline ? (
                                        /* ===== MODO OFFLINE: Input con lada + teléfono ===== */
                                        <div>
                                            <div className="flex gap-2 lg:gap-1.5 2xl:gap-2 items-center">
                                                {/* Input de lada */}
                                                <input
                                                    id="venta-lada-offline"
                                                    name="ladaOffline"
                                                    type="text"
                                                    value={lada}
                                                    onChange={(e) => {
                                                        let valor = e.target.value;
                                                        // Asegurar que empiece con +
                                                        if (!valor.startsWith('+')) valor = '+' + valor.replace(/[^0-9]/g, '');
                                                        else valor = '+' + valor.slice(1).replace(/[^0-9]/g, '');
                                                        // Máximo 4 caracteres (+XXX)
                                                        if (valor.length <= 4) setLada(valor);
                                                    }}
                                                    className={`
                                                        text-center transition-colors
                                                        ${esMobile
                                                            ? 'w-16 lg:w-14 2xl:w-16 py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white text-base focus:border-[#3B82F6]'
                                                            : 'w-16 lg:w-14 2xl:w-16 py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white text-lg lg:text-base 2xl:text-lg focus:border-[#3B82F6]'
                                                        }
                                                    `}
                                                    placeholder="+52"
                                                />
                                                {/* Input de teléfono */}
                                                <input
                                                    id="venta-telefono-offline"
                                                    name="telefonoOffline"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    value={telefono}
                                                    onChange={(e) => {
                                                        const valor = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setTelefono(valor);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && telefono.length === 10) {
                                                            setSeccionActiva('concepto');
                                                        }
                                                    }}
                                                    placeholder="6441234567"
                                                    maxLength={10}
                                                    className={`
                                                        flex-1 transition-colors focus:border-[#3B82F6]
                                                        ${esMobile
                                                            ? 'py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white text-base'
                                                            : 'py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white text-lg lg:text-base 2xl:text-lg'
                                                        }
                                                    `}
                                                    autoFocus
                                                />
                                            </div>
                                            {!esMobile && (
                                                <p className="text-[#94A3B8] text-xs mt-2 flex justify-between">
                                                    <span>💡 Sin conexión: se guardará para procesar después</span>
                                                    <span>{telefono.length}/10</span>
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        /* ===== MODO ONLINE: Input directo ===== */
                                        <>
                                            {/* Input lada + teléfono */}
                                            <div className="flex gap-2 lg:gap-1.5 2xl:gap-2 items-center">
                                                {/* Input de lada */}
                                                <input
                                                    id="venta-lada-online"
                                                    name="ladaOnline"
                                                    type="text"
                                                    value={lada}
                                                    onChange={(e) => {
                                                        let valor = e.target.value;
                                                        if (!valor.startsWith('+')) valor = '+' + valor.replace(/[^0-9]/g, '');
                                                        else valor = '+' + valor.slice(1).replace(/[^0-9]/g, '');
                                                        if (valor.length <= 4) setLada(valor);
                                                    }}
                                                    className={`
                                                        text-center transition-colors
                                                        ${esMobile
                                                            ? 'w-16 lg:w-14 2xl:w-16 py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white text-base focus:border-[#3B82F6]'
                                                            : 'w-16 lg:w-14 2xl:w-16 py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white text-lg lg:text-base 2xl:text-lg focus:border-[#3B82F6]'
                                                        }
                                                    `}
                                                    placeholder="+52"
                                                />

                                                {/* Input de teléfono */}
                                                <input
                                                    id="venta-telefono-online"
                                                    name="telefonoOnline"
                                                    type="tel"
                                                    inputMode="numeric"
                                                    maxLength={10}
                                                    value={telefono}
                                                    onChange={(e) => {
                                                        const valor = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setTelefono(valor);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && telefono.length === 10) {
                                                            setSeccionActiva('concepto');
                                                        }
                                                    }}
                                                    placeholder="6441234567"
                                                    className={`
                                                        flex-1 transition-colors focus:border-[#3B82F6]
                                                        ${esMobile
                                                            ? 'py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white text-base'
                                                            : 'py-2 lg:py-1.5 2xl:py-2 px-2 lg:px-1.5 2xl:px-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white text-lg lg:text-base 2xl:text-lg'
                                                        }
                                                    `}
                                                    autoFocus
                                                />
                                            </div>

                                            {/* Estado de búsqueda */}
                                            {buscandoCliente && (
                                                <div className="flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 mt-3">
                                                    <Loader2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6] animate-spin" />
                                                    <span className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">Buscando...</span>
                                                </div>
                                            )}

                                            {/* Cliente encontrado */}
                                            {cliente && !buscandoCliente && (
                                                <div
                                                    className="mt-3 p-3 lg:p-2 2xl:p-3 rounded-lg lg:rounded-md 2xl:rounded-lg flex items-center gap-3"
                                                    style={{
                                                        background: cliente.esNuevo
                                                            ? 'rgba(59, 130, 246, 0.1)'
                                                            : 'rgba(16, 185, 129, 0.1)',
                                                        border: `1px solid ${cliente.esNuevo ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                                    }}
                                                >
                                                    <div
                                                        className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full flex items-center justify-center"
                                                        style={{
                                                            background: cliente.esNuevo
                                                                ? 'rgba(59, 130, 246, 0.2)'
                                                                : 'rgba(16, 185, 129, 0.2)',
                                                        }}
                                                    >
                                                        {cliente.esNuevo ? (
                                                            <UserPlus className="w-5 h-5 text-[#3B82F6]" />
                                                        ) : (
                                                            <User className="w-5 h-5 text-[#10B981]" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-white font-medium">{cliente.nombre}</p>
                                                        {!cliente.esNuevo && (
                                                            <div className="flex items-center gap-3 text-sm lg:text-xs 2xl:text-sm">
                                                                {config?.nivelesActivos && (
                                                                    <span
                                                                        style={{ color: getColorNivel(cliente.nivel) }}
                                                                        className="capitalize flex items-center gap-1"
                                                                    >
                                                                        <Trophy className="w-3 h-3" /> {cliente.nivel} x{cliente.multiplicador}
                                                                    </span>
                                                                )}
                                                                <span className="text-[#F59E0B] flex items-center gap-1">
                                                                    <Coins className="w-3 h-3" /> {cliente.puntosDisponibles}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {cliente.esNuevo && (
                                                            <p className="text-[#3B82F6] text-xs">{config?.nivelesActivos ? 'Iniciará en Bronce x1.0' : 'Cliente nuevo'}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Mensaje de error persistente */}
                                            {!buscandoCliente && errorCliente && !cliente && telefono.length === 10 && (
                                                <div className="mt-3 p-3 lg:p-2 2xl:p-3 rounded-lg lg:rounded-md 2xl:rounded-lg flex items-start gap-2 lg:gap-1.5 2xl:gap-2 bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.3)]">
                                                    <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                                                    <p className="text-[#DC2626] text-sm lg:text-xs 2xl:text-sm">{errorCliente}</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ========================================= */}
                        {/* SECCIÓN: CUPÓN (Solo online, después de cliente) */}
                        {/* ========================================= */}
                        {!modoOffline && (
                            <div
                                className="rounded-xl lg:rounded-md 2xl:rounded-xl overflow-hidden"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: `1px solid ${cupon ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                }}
                            >
                                <button
                                    onClick={() => seccionCompletada('cliente') && setSeccionActiva('cupon')}
                                    disabled={!seccionCompletada('cliente')}
                                    className="w-full px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 flex items-center gap-3 lg:gap-2 2xl:gap-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <div
                                        className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center"
                                        style={{
                                            background: cupon ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        }}
                                    >
                                        {cupon ? (
                                            <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
                                        ) : (
                                            <Ticket className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">
                                            Código de Cupón <span className="text-[#606060] text-xs">(opcional)</span>
                                        </p>
                                        {cupon && seccionActiva !== 'cupon' && (
                                            <p className="text-[#10B981] text-sm lg:text-xs 2xl:text-sm">
                                                {cupon.titulo} • {cupon.descuentoInfo}
                                            </p>
                                        )}
                                    </div>
                                    {seccionActiva === 'cupon' ? (
                                        <ChevronDown className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#94A3B8]" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#94A3B8]" />
                                    )}
                                </button>

                                {seccionActiva === 'cupon' && seccionCompletada('cliente') && (
                                    <div className="px-4 pb-4">
                                        {cupon ? (
                                            <div className="rounded-lg lg:rounded-md 2xl:rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] overflow-hidden">
                                                {/* Encabezado: icono + título + tipo + quitar */}
                                                <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 lg:px-2.5 2xl:px-3 py-2.5 lg:py-2 2xl:py-2.5 bg-[rgba(16,185,129,0.12)] border-b border-[rgba(16,185,129,0.2)]">
                                                    <div className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg bg-[rgba(16,185,129,0.2)] flex items-center justify-center shrink-0">
                                                        <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#10B981]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-lg lg:text-base 2xl:text-lg font-bold truncate">{cupon.titulo}</p>
                                                        <p className="text-[#10B981] text-sm lg:text-xs 2xl:text-sm font-semibold">{cupon.descuentoInfo}</p>
                                                    </div>
                                                    <button onClick={() => setCupon(null)} className="text-[#DC2626] cursor-pointer shrink-0">
                                                        <X className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                                    </button>
                                                </div>

                                                {/* Contenido plano: instrucción + condiciones + compra mínima */}
                                                <div className="px-3 lg:px-2.5 2xl:px-3 py-2.5 lg:py-2 2xl:py-2.5 divide-y divide-white/10 [&>div]:pt-2.5 [&>div]:pb-2.5 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
                                                    {/* Instrucción de acción */}
                                                    <div>
                                                        <p className="text-[#93C5FD] text-xs lg:text-[10px] 2xl:text-xs font-bold uppercase tracking-wide mb-0.5">Qué hacer</p>
                                                        <p className="text-white text-base lg:text-sm 2xl:text-base font-bold">
                                                            {cupon.tipo === 'porcentaje' && `Aplica ${cupon.descuento}% de descuento:`}
                                                            {cupon.tipo === 'monto_fijo' && `Descuenta $${cupon.descuento}:`}
                                                            {cupon.tipo === '2x1' && 'Entrega el segundo artículo sin costo:'}
                                                            {cupon.tipo === '3x2' && 'Entrega el tercer artículo sin costo:'}
                                                            {cupon.tipo === 'envio_gratis' && 'No cobrar envío:'}
                                                            {cupon.tipo === 'otro' && `${cupon.descuentoInfo}:`}
                                                        </p>
                                                        <p className="text-white text-base lg:text-sm 2xl:text-base font-medium">
                                                            {cupon.titulo}
                                                        </p>
                                                    </div>

                                                    {/* Condiciones */}
                                                    {cupon.descripcion && (
                                                        <div>
                                                            <p className="text-[#93C5FD] text-xs lg:text-[10px] 2xl:text-xs font-bold uppercase tracking-wide mb-0.5">Condiciones</p>
                                                            <p className="text-slate-300 text-base lg:text-sm 2xl:text-base font-medium">{cupon.descripcion}</p>
                                                        </div>
                                                    )}

                                                    {/* Compra mínima */}
                                                    {cupon.compraMinima > 0 && (
                                                        <div>
                                                            <p className="text-[#93C5FD] text-xs lg:text-[10px] 2xl:text-xs font-bold uppercase tracking-wide mb-0.5">Compra mínima</p>
                                                            <p className="text-white text-base lg:text-sm 2xl:text-base font-medium">${cupon.compraMinima.toLocaleString('es-MX')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
                                                <input
                                                    id="venta-codigo-cupon"
                                                    name="codigoCupon"
                                                    type="text"
                                                    value={codigoCupon}
                                                    onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                                                    placeholder="Código de cupón"
                                                    className="flex-1 py-2 lg:py-1.5 2xl:py-2 px-3 lg:px-2 2xl:px-3 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white uppercase"
                                                />
                                                <button
                                                    onClick={handleValidarCupon}
                                                    disabled={!codigoCupon.trim() || validandoCupon}
                                                    className="px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#2563EB] text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                                >
                                                    {validandoCupon ? (
                                                        <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />
                                                    ) : (
                                                        <Check className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================= */}
                        {/* SECCIÓN: TARJETA DE SELLOS */}
                        {/* ========================================= */}
                        {tarjetasSellos.length > 0 && (
                            <div
                                className="rounded-xl lg:rounded-md 2xl:rounded-xl overflow-hidden"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: `1px solid ${tarjetaSeleccionada ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                }}
                            >
                                <button
                                    onClick={() => seccionCompletada('cliente') && setSeccionActiva('tarjetaSellos')}
                                    disabled={!seccionCompletada('cliente')}
                                    className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 cursor-pointer disabled:opacity-40"
                                >
                                    <div
                                        className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center"
                                        style={{
                                            background: tarjetaSeleccionada ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        }}
                                    >
                                        {tarjetaSeleccionada ? (
                                            <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#F59E0B]" />
                                        ) : (
                                            <Repeat className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">
                                            Tarjeta de Sellos <span className="text-[#606060] text-xs">(opcional)</span>
                                        </p>
                                        {tarjetaSeleccionada && seccionActiva !== 'tarjetaSellos' && (
                                            <p className="text-[#F59E0B] text-sm lg:text-xs 2xl:text-sm">
                                                {tarjetaSeleccionada.nombre} • {tarjetaSeleccionada.comprasAcumuladas + 1}/{tarjetaSeleccionada.numeroComprasRequeridas}
                                            </p>
                                        )}
                                    </div>
                                    {seccionActiva === 'tarjetaSellos' ? (
                                        <ChevronDown className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#94A3B8]" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#94A3B8]" />
                                    )}
                                </button>

                                {seccionActiva === 'tarjetaSellos' && seccionCompletada('cliente') && (
                                    <div className="px-4 lg:px-3 2xl:px-4 pb-4 lg:pb-3 2xl:pb-4 space-y-2">
                                        {cargandoTarjetas ? (
                                            <div className="flex justify-center py-4">
                                                <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                                            </div>
                                        ) : (
                                            <>
                                                {tarjetasSellos.map((tarjeta) => {
                                                    const seleccionada = tarjetaSeleccionada?.id === tarjeta.id;
                                                    const progreso = tarjeta.comprasAcumuladas;
                                                    const total = tarjeta.numeroComprasRequeridas;
                                                    return (
                                                        <button
                                                            key={tarjeta.id}
                                                            onClick={() => setTarjetaSeleccionada(seleccionada ? null : tarjeta)}
                                                            className={`w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 p-3 lg:p-2 2xl:p-3 rounded-lg cursor-pointer transition-colors ${seleccionada
                                                                ? 'bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.4)]'
                                                                : 'bg-white/5 border border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {/* Imagen o ícono */}
                                                            <div className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white/10">
                                                                {tarjeta.imagenUrl ? (
                                                                    <img src={tarjeta.imagenUrl} alt={tarjeta.nombre} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-400" />
                                                                )}
                                                            </div>
                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0 text-left">
                                                                <p className="text-white text-sm lg:text-xs 2xl:text-sm font-bold truncate">{tarjeta.nombre}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                        <div className="h-full rounded-full" style={{
                                                                            width: `${Math.min((progreso / total) * 100, 100)}%`,
                                                                            background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                                                                        }} />
                                                                    </div>
                                                                    <span className="text-xs lg:text-[10px] 2xl:text-xs font-bold text-amber-400 shrink-0">{progreso}/{total}</span>
                                                                </div>
                                                            </div>
                                                            {/* Radio */}
                                                            <div className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${seleccionada ? 'border-amber-500' : 'border-white/30'}`}>
                                                                {seleccionada && <div className="w-2.5 h-2.5 lg:w-2 lg:h-2 2xl:w-2.5 2xl:h-2.5 rounded-full bg-amber-500" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                                {tarjetaSeleccionada && (
                                                    <button
                                                        onClick={() => setTarjetaSeleccionada(null)}
                                                        className="w-full text-center text-sm lg:text-xs 2xl:text-sm text-red-400 font-semibold py-1 cursor-pointer hover:text-red-300"
                                                    >
                                                        Quitar selección
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ========================================= */}
                        {/* SECCIÓN: CONCEPTO */}
                        {/* ========================================= */}
                        <div
                            className="rounded-xl lg:rounded-md 2xl:rounded-xl overflow-hidden"
                            style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: `1px solid ${concepto.trim() ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            }}
                        >
                            <button
                                onClick={() => seccionCompletada('cliente') && setSeccionActiva('concepto')}
                                disabled={!seccionCompletada('cliente')}
                                className="w-full px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 flex items-center gap-3 lg:gap-2 2xl:gap-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center"
                                    style={{
                                        background: concepto.trim() ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                    }}
                                >
                                    {concepto.trim() ? (
                                        <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
                                    ) : (
                                        <ShoppingBag className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">
                                        Concepto <span className="text-[#606060] text-xs">(opcional)</span>
                                    </p>
                                    {concepto.trim() && (
                                        <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm truncate">
                                            {concepto}
                                        </p>
                                    )}
                                </div>
                                {seccionActiva === 'concepto' ? (
                                    <ChevronDown className="w-5 h-5 text-[#94A3B8]" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
                                )}
                            </button>

                            {seccionActiva === 'concepto' && seccionCompletada('cliente') && (
                                <div className="px-4 pb-4">
                                    <input
                                        id="venta-concepto"
                                        name="concepto"
                                        type="text"
                                        value={concepto}
                                        onChange={(e) => setConcepto(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                setSeccionActiva('monto');
                                            }
                                        }}
                                        placeholder="Ej: 3 tacos al pastor, Corte de cabello..."
                                        maxLength={200}
                                        autoFocus={!esMobile}
                                        className="w-full py-2 px-3 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white"
                                    />
                                    <p className="text-[#94A3B8] text-xs mt-1">
                                        {concepto.length}/200 caracteres
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ========================================= */}
                        {/* SECCIÓN: MONTO */}
                        {/* ========================================= */}
                        <div
                            className="rounded-xl lg:rounded-md 2xl:rounded-xl overflow-hidden"
                            style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: `1px solid ${seccionCompletada('monto') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            }}
                        >
                            <button
                                onClick={() => seccionCompletada('cliente') && setSeccionActiva('monto')}
                                disabled={!seccionCompletada('cliente')}
                                className="w-full px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 flex items-center gap-3 lg:gap-2 2xl:gap-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center"
                                    style={{
                                        background: seccionCompletada('monto')
                                            ? 'rgba(16, 185, 129, 0.2)'
                                            : 'rgba(59, 130, 246, 0.2)',
                                    }}
                                >
                                    {seccionCompletada('monto') ? (
                                        <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
                                    ) : (
                                        <DollarSign className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">Monto</p>
                                    {parseFloat(monto) > 0 && (
                                        <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">${formatearMoneda(parseFloat(monto))}</p>
                                    )}
                                </div>
                                {seccionActiva === 'monto' ? (
                                    <ChevronDown className="w-5 h-5 text-[#94A3B8]" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
                                )}
                            </button>

                            {seccionActiva === 'monto' && seccionCompletada('cliente') && (
                                <div className="px-4 pb-4">
                                    <div
                                        className="p-4 lg:p-3 2xl:p-4 rounded-lg lg:rounded-md 2xl:rounded-lg mb-3 lg:mb-2 2xl:mb-3"
                                        style={{
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                        }}
                                    >
                                        <div className="flex items-center justify-center">
                                            <span className="text-[#94A3B8] text-2xl lg:text-xl 2xl:text-2xl mr-1">$</span>
                                            <input
                                                id="venta-monto"
                                                name="monto"
                                                type="text"
                                                inputMode="decimal"
                                                value={monto}
                                                onChange={(e) => handleMontoChange(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && parseFloat(monto) > 0) {
                                                        setSeccionActiva('metodoPago');
                                                    }
                                                }}
                                                placeholder="0.00"
                                                className="bg-transparent text-white text-3xl lg:text-2xl 2xl:text-3xl font-bold text-center w-full outline-none placeholder:text-[#606060]"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {parseFloat(monto) > 0 && (
                                        <button
                                            onClick={() => setSeccionActiva('metodoPago')}
                                            className="w-full py-2 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#2563EB] text-white font-medium cursor-pointer"
                                        >
                                            Continuar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ========================================= */}
                        {/* SECCIÓN: MÉTODO DE PAGO */}
                        {/* ========================================= */}
                        <div
                            className="rounded-xl lg:rounded-md 2xl:rounded-xl overflow-hidden"
                            style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: `1px solid ${seccionCompletada('metodoPago') ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            }}
                        >
                            <button
                                onClick={() => seccionCompletada('cliente') && seccionCompletada('monto') && setSeccionActiva('metodoPago')}
                                disabled={!seccionCompletada('cliente') || !seccionCompletada('monto')}
                                className="w-full px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 flex items-center gap-3 lg:gap-2 2xl:gap-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center"
                                    style={{
                                        background: seccionCompletada('metodoPago')
                                            ? 'rgba(16, 185, 129, 0.2)'
                                            : 'rgba(59, 130, 246, 0.2)',
                                    }}
                                >
                                    {seccionCompletada('metodoPago') ? (
                                        <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
                                    ) : (
                                        <CreditCard className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">Método de Pago</p>
                                    {metodoPago && <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm capitalize">{metodoPago}</p>}
                                </div>
                                {seccionActiva === 'metodoPago' ? (
                                    <ChevronDown className="w-5 h-5 text-[#94A3B8]" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
                                )}
                            </button>

                            {seccionActiva === 'metodoPago' && seccionCompletada('cliente') && seccionCompletada('monto') && (
                                <div className="px-4 pb-4">
                                    <div className="grid grid-cols-4 gap-2 lg:gap-1.5 2xl:gap-2">
                                        {METODOS_PAGO.map((m) => {
                                            const Icono = m.icono;
                                            const seleccionado = metodoPago === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => handleMetodoPagoSelect(m.id)}
                                                    className={`
                            p-3 lg:p-2 2xl:p-3 rounded-lg lg:rounded-md 2xl:rounded-lg flex flex-col items-center gap-1 border cursor-pointer
                            ${seleccionado
                                                            ? 'bg-[#2563EB]/20 border-[#2563EB]'
                                                            : 'bg-[rgba(0,0,0,0.3)] border-[#333] hover:border-[#3B82F6]'
                                                        }
                          `}
                                                >
                                                    <Icono
                                                        className={`w-5 h-5 ${seleccionado ? 'text-[#3B82F6]' : 'text-[#94A3B8]'}`}
                                                    />
                                                    <span className={`text-xs ${seleccionado ? 'text-white' : 'text-[#94A3B8]'}`}>
                                                        {m.nombre}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Desglose mixto */}
                                    {metodoPago === 'mixto' && (
                                        <div className="mt-3 space-y-2">
                                            {['efectivo', 'tarjeta', 'transferencia'].map((tipo) => (
                                                <div key={tipo} className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                                                    <span className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm w-24 capitalize">{tipo}</span>
                                                    <div className="flex-1 relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                                                            $
                                                        </span>
                                                        <input
                                                            id={`venta-desglose-${tipo}`}
                                                            name={`desglose-${tipo}`}
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={desglose[tipo as keyof DesglosePago] || ''}
                                                            onChange={(e) =>
                                                                setDesglose({
                                                                    ...desglose,
                                                                    [tipo]: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            className="w-full py-2 pl-6 pr-2 rounded bg-[#1A1A1A] border border-[#333] text-white text-right"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-sm lg:text-xs 2xl:text-sm pt-2 border-t border-[#333]">
                                                <span className="text-[#94A3B8]">Suma:</span>
                                                {(() => {
                                                    const suma = desglose.efectivo + desglose.tarjeta + desglose.transferencia;
                                                    const montoNum = parseFloat(monto) || 0;
                                                    const diferencia = montoNum - suma;

                                                    if (Math.abs(diferencia) < 0.01) {
                                                        // Correcto
                                                        return (
                                                            <span className="text-[#10B981]">
                                                                ${formatearMoneda(suma)} ✓
                                                            </span>
                                                        );
                                                    } else if (diferencia > 0) {
                                                        // Falta dinero
                                                        return (
                                                            <span className="text-[#F59E0B]">
                                                                ${formatearMoneda(suma)} <span className="text-xs">(faltan ${formatearMoneda(diferencia)})</span>
                                                            </span>
                                                        );
                                                    } else {
                                                        // Excede el monto - hay que dar cambio
                                                        return (
                                                            <span className="text-[#3B82F6]">
                                                                ${formatearMoneda(suma)} <span className="text-xs">(cambio: ${formatearMoneda(Math.abs(diferencia))})</span>
                                                            </span>
                                                        );
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ========================================= */}
                        {/* SECCIÓN: NOTA */}
                        {/* ========================================= */}
                        <div
                            className="rounded-xl lg:rounded-md 2xl:rounded-xl overflow-hidden"
                            style={{
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: `1px solid ${nota.trim() ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            }}
                        >
                            <button
                                onClick={() => seccionCompletada('cliente') && seccionCompletada('metodoPago') && setSeccionActiva('nota')}
                                disabled={!seccionCompletada('cliente') || !seccionCompletada('metodoPago')}
                                className="w-full px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 flex items-center gap-3 lg:gap-2 2xl:gap-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            >
                                <div
                                    className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center"
                                    style={{
                                        background: nota.trim() ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                    }}
                                >
                                    {nota.trim() ? (
                                        <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
                                    ) : (
                                        <Edit3 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">
                                        Nota <span className="text-[#606060] text-xs">(opcional)</span>
                                    </p>
                                    {nota.trim() && (
                                        <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm truncate">
                                            {nota}
                                        </p>
                                    )}
                                </div>
                                {seccionActiva === 'nota' ? (
                                    <ChevronDown className="w-5 h-5 text-[#94A3B8]" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
                                )}
                            </button>

                            {seccionActiva === 'nota' && seccionCompletada('cliente') && seccionCompletada('metodoPago') && (
                                <div className="px-4 pb-4">
                                    <textarea
                                        id="venta-nota"
                                        name="nota"
                                        value={nota}
                                        onChange={(e) => setNota(e.target.value)}
                                        placeholder="Ej: Cliente frecuente, le faltó $20..."
                                        rows={3}
                                        maxLength={500}
                                        className="w-full py-2 px-3 rounded-lg lg:rounded-md 2xl:rounded-lg bg-[#1A1A1A] border border-[#333] text-white resize-none"
                                    />
                                    <p className="text-[#94A3B8] text-xs mt-1">
                                        {nota.length}/500 caracteres
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ========================================= */}
                        {/* SECCIÓN: FOTO (Solo online) */}
                        {/* ========================================= */}
                        {!modoOffline && config?.fotoTicket !== 'nunca' && (
                            <div
                                className="rounded-xl lg:rounded-md 2xl:rounded-xl overflow-hidden"
                                style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    border: `1px solid ${fotoUrl ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                }}
                            >
                                <button
                                    onClick={() => seccionCompletada('cliente') && seccionCompletada('metodoPago') && setSeccionActiva('foto')}
                                    disabled={!seccionCompletada('cliente') || !seccionCompletada('metodoPago')}
                                    className="w-full px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 flex items-center gap-3 lg:gap-2 2xl:gap-3 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <div
                                        className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center"
                                        style={{
                                            background: fotoUrl ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                        }}
                                    >
                                        {fotoUrl ? (
                                            <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
                                        ) : (
                                            <Camera className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                                        )}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">
                                            Foto del Ticket
                                            {(!config || config.fotoTicket === 'opcional') && (
                                                <span className="text-[#606060] text-xs ml-1">(opcional)</span>
                                            )}
                                        </p>
                                        {fotoUrl && <p className="text-[#10B981] text-sm lg:text-xs 2xl:text-sm">✓ Foto adjunta</p>}
                                    </div>
                                    {seccionActiva === 'foto' ? (
                                        <ChevronDown className="w-5 h-5 text-[#94A3B8]" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
                                    )}
                                </button>

                                {seccionActiva === 'foto' && seccionCompletada('cliente') && seccionCompletada('metodoPago') && (
                                    <div className="px-4 pb-4">
                                        {fotoUrl ? (
                                            <div className="relative">
                                                <img
                                                    src={fotoUrl}
                                                    alt="Ticket"
                                                    className="w-full h-40 object-contain rounded-lg lg:rounded-md 2xl:rounded-lg bg-black"
                                                />
                                                <button
                                                    onClick={eliminarFoto}
                                                    className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white cursor-pointer"
                                                >
                                                    <X className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="block">
                                                <div className="p-8 lg:p-5 2xl:p-8 rounded-lg lg:rounded-md 2xl:rounded-lg border-2 border-dashed border-[#333] hover:border-[#3B82F6] cursor-pointer text-center">
                                                    {subiendoFoto ? (
                                                        <Loader2 className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 mx-auto text-[#3B82F6] animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Camera className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 mx-auto text-[#3B82F6] mb-2 lg:mb-1.5 2xl:mb-2" />
                                                            <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">Toca para tomar foto</p>
                                                        </>
                                                    )}
                                                </div>
                                                <input
                                                    id="venta-foto"
                                                    name="fotoVenta"
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    onChange={(e) => e.target.files?.[0] && handleFotoCaptura(e.target.files[0])}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>

                {/* ============================================================== */}
                {/* FOOTER: Resumen + Botón confirmar */}
                {/* ============================================================== */}
                <div
                    className="
            shrink-0
            px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4
            border-t border-white/10
          "
                    style={{ background: 'rgba(0, 0, 0, 0.9)' }}
                >
                    {/* Resumen cupón + puntos */}
                    {cliente && parseFloat(monto) > 0 && (
                        <div className="mb-3 lg:mb-2 2xl:mb-3 px-2">
                            {/* Desglose cupón */}
                            {cupon && (
                                <div className="mb-2 lg:mb-1.5 2xl:mb-2 pb-2 lg:pb-1.5 2xl:pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    {/* Tipo de cupón aplicado */}
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[#60A5FA] text-sm lg:text-xs 2xl:text-sm font-bold">🎟️ {cupon.titulo}</span>
                                        <span className="text-[#60A5FA] text-sm lg:text-xs 2xl:text-sm font-bold">{cupon.descuentoInfo}</span>
                                    </div>

                                    {/* Desglose numérico (solo porcentaje y monto fijo) */}
                                    {(cupon.tipo === 'porcentaje' || cupon.tipo === 'monto_fijo') && (
                                        <>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm font-medium">Subtotal:</span>
                                                <span className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm font-bold">${parseFloat(monto).toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[#60A5FA] text-sm lg:text-xs 2xl:text-sm font-medium">Descuento:</span>
                                                <span className="text-[#60A5FA] text-sm lg:text-xs 2xl:text-sm font-bold">
                                                    -${cupon.tipo === 'porcentaje'
                                                        ? (parseFloat(monto) * cupon.descuento / 100).toFixed(2)
                                                        : Math.min(cupon.descuento, parseFloat(monto)).toFixed(2)
                                                    }
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white text-base lg:text-sm 2xl:text-base font-bold">Total a cobrar:</span>
                                                <span className="text-white text-xl lg:text-lg 2xl:text-xl font-bold">
                                                    ${cupon.tipo === 'porcentaje'
                                                        ? (parseFloat(monto) * (1 - cupon.descuento / 100)).toFixed(2)
                                                        : Math.max(0, parseFloat(monto) - cupon.descuento).toFixed(2)
                                                    }
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    {/* Para otros tipos: nota informativa */}
                                    {cupon.tipo !== 'porcentaje' && cupon.tipo !== 'monto_fijo' && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm font-medium">Monto a cobrar:</span>
                                            <span className="text-white text-xl lg:text-lg 2xl:text-xl font-bold">${parseFloat(monto).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* Puntos */}
                            <div className="flex items-center justify-between">
                                <span className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">Puntos a otorgar:</span>
                                <div className="flex items-center gap-1">
                                    <Coins className="w-5 h-5 text-[#F59E0B]" />
                                    <span className="text-[#F59E0B] text-xl font-bold">+{calcularPuntos()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Aviso compra mínima no alcanzada */}
                    {cupon && cupon.compraMinima > 0 && parseFloat(monto) > 0 && parseFloat(monto) < cupon.compraMinima && (
                        <div className="mb-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                            <span className="text-red-400 text-sm lg:text-xs 2xl:text-sm font-medium">
                                Compra mínima de ${cupon.compraMinima.toLocaleString('es-MX')} requerida para este cupón
                            </span>
                        </div>
                    )}

                    {/* Botón confirmar */}
                    <button
                        onClick={handleConfirmar}
                        disabled={!puedeConfirmar() || procesando}
                        className="w-full py-2.5 lg:py-3 2xl:py-4 rounded-xl lg:rounded-md 2xl:rounded-xl font-bold text-lg lg:text-base 2xl:text-lg flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                        style={{
                            background:
                                puedeConfirmar() && !procesando
                                    ? 'linear-gradient(135deg, #F97316, #EA580C)'
                                    : 'rgba(249, 115, 22, 0.3)',
                            boxShadow: puedeConfirmar() && !procesando ? '0 0 20px rgba(249, 115, 22, 0.4)' : 'none',
                        }}
                    >
                        {procesando ? (
                            <>
                                <Loader2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 animate-spin text-white/70" />
                                <span className="text-white/70 text-lg lg:text-base 2xl:text-lg">Procesando...</span>
                            </>
                        ) : (
                            <>
                                {modoOffline ? (
                                    <>
                                        <Edit3 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
                                        <span className="text-white text-lg lg:text-base 2xl:text-lg">Guardar Recordatorio</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
                                        <span className="text-white text-lg lg:text-base 2xl:text-lg">Confirmar Venta</span>
                                    </>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

export default ModalRegistrarVenta;