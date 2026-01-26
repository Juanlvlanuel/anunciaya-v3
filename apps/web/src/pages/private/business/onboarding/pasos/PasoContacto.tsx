/**
 * PasoContacto.tsx - PASO 3 DEL ONBOARDING (ACTUALIZADO)
 * ========================================================
 * Información de contacto de la sucursal
 * 
 * IMPORTANTE:
 * - Este paso SOLO se muestra para negocios presenciales (requiereDireccion: true)
 * - Los negocios online ya capturaron estos datos en el Paso 2
 * 
 * CAMPOS:
 * - Teléfono (con lada editable, por defecto +52)
 * - WhatsApp (con lada editable, por defecto +52)
 * - Correo electrónico
 * - Sitio web
 * 
 * VALIDACIÓN:
 * - Al menos 1 campo debe estar lleno
 * - Checkbox para copiar teléfono a WhatsApp
 * 
 * ACTUALIZACIÓN 24/12/2024:
 * - ✅ Lada editable (input separado)
 * - ✅ Por defecto +52 (México)
 * - ✅ Checkbox funcional en todos los modos
 */

import { useState, useEffect } from 'react';
import { Mail, Globe, MessageCircle, Phone, Loader2, Info } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoContacto() {
    const { negocioId, sucursalId, guardarPaso3, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados de campos
    const [telefono, setTelefono] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [correo, setCorreo] = useState('');
    const [sitioWeb, setSitioWeb] = useState('');

    // Estados de ladas (editables)
    const [ladaTelefono, setLadaTelefono] = useState('+52');
    const [ladaWhatsapp, setLadaWhatsapp] = useState('+52');

    // Estados de control
    const [usarMismoNumero, setUsarMismoNumero] = useState(false);
    const [cargandoDatos, setCargandoDatos] = useState(true);

    // ---------------------------------------------------------------------------
    // Cargar datos existentes
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const cargarDatos = async () => {
            if (!sucursalId) {
                setCargandoDatos(false);
                return;
            }

            try {
                const response = await api.get(`/onboarding/${negocioId}/progreso`);
                const datos = response.data.data;

                // Si hay sucursal creada, cargar sus datos de contacto
                if (datos.sucursal) {
                    // Separar lada y número si vienen juntos
                    if (datos.sucursal.telefono) {
                        const { lada, numero } = separarLadaYNumero(datos.sucursal.telefono);
                        setLadaTelefono(lada);
                        setTelefono(numero);
                    }
                    if (datos.sucursal.whatsapp) {
                        const { lada, numero } = separarLadaYNumero(datos.sucursal.whatsapp);
                        setLadaWhatsapp(lada);
                        setWhatsapp(numero);
                    }
                    setCorreo(datos.sucursal.correo || '');
                    setSitioWeb(datos.sucursal.sitio_web || '');
                }
            }
            catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
            }
        };

        cargarDatos();
    }, [negocioId, sucursalId]);

    // ---------------------------------------------------------------------------
    // Helper: Separar lada y número
    // ---------------------------------------------------------------------------
    const separarLadaYNumero = (numeroCompleto: string): { lada: string; numero: string } => {
        // Eliminar espacios y caracteres especiales, mantener solo + y dígitos
        const limpio = numeroCompleto.replace(/[^\d+]/g, '');

        // Si no empieza con +, asumir que es solo número sin lada
        if (!limpio.startsWith('+')) {
            return { lada: '+52', numero: limpio };
        }

        // Caso especial: México (+52)
        if (limpio.startsWith('+52')) {
            const numero = limpio.substring(3); // Después de "+52"
            return { lada: '+52', numero };
        }

        // Caso especial: USA/Canadá (+1)
        if (limpio.startsWith('+1')) {
            const numero = limpio.substring(2); // Después de "+1"
            return { lada: '+1', numero };
        }

        // Para otros países: Extraer los últimos 10 dígitos como número
        const soloDigitos = limpio.substring(1); // Quitar el +

        if (soloDigitos.length >= 10) {
            const numero = soloDigitos.slice(-10);
            const codigoLada = soloDigitos.slice(0, -10);
            return { lada: '+' + codigoLada, numero };
        }

        // Fallback: Si tiene menos de 10 dígitos, tomar los primeros 3 como lada
        const match = limpio.match(/^(\+\d{1,3})(\d+)$/);
        if (match) {
            return { lada: match[1], numero: match[2] };
        }

        // Si todo falla, devolver con lada por defecto
        return { lada: '+52', numero: limpio.replace('+', '') };
    };

    // ---------------------------------------------------------------------------
    // Formatear número (solo dígitos)
    // ---------------------------------------------------------------------------
    const formatearNumero = (valor: string): string => {
        return valor.replace(/\D/g, '').slice(0, 10);
    };

    // ---------------------------------------------------------------------------
    // Formatear lada (+XX o +XXX)
    // ---------------------------------------------------------------------------
    const formatearLada = (valor: string): string => {
        // Permitir solo: +, dígitos
        let limpio = valor.replace(/[^\d+]/g, '');

        // Asegurar que empiece con +
        if (!limpio.startsWith('+')) {
            limpio = '+' + limpio.replace(/\+/g, '');
        }

        // Limitar a +XXX (máximo 3 dígitos después del +)
        const match = limpio.match(/^\+\d{0,3}/);
        return match ? match[0] : '+';
    };

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleTelefonoChange = (valor: string) => {
        const formateado = formatearNumero(valor);
        setTelefono(formateado);

        // Si está activo "usar mismo número", actualizar WhatsApp también
        if (usarMismoNumero) {
            setWhatsapp(formateado);
            setLadaWhatsapp(ladaTelefono);
        }
    };

    const handleLadaTelefonoChange = (valor: string) => {
        const formateado = formatearLada(valor);
        setLadaTelefono(formateado);

        // Si está activo "usar mismo número", actualizar WhatsApp también
        if (usarMismoNumero) {
            setLadaWhatsapp(formateado);
        }
    };

    const handleWhatsappChange = (valor: string) => {
        const formateado = formatearNumero(valor);
        setWhatsapp(formateado);
    };

    const handleLadaWhatsappChange = (valor: string) => {
        const formateado = formatearLada(valor);
        setLadaWhatsapp(formateado);
    };

    const handleUsarMismoNumeroChange = (checked: boolean) => {
        setUsarMismoNumero(checked);
        if (checked && telefono) {
            setWhatsapp(telefono);
            setLadaWhatsapp(ladaTelefono);
        }
    };

    // ---------------------------------------------------------------------------
    // Validación
    // ---------------------------------------------------------------------------
    const validarEmail = (email: string): boolean => {
        if (!email) return true; // Opcional
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const validarUrl = (url: string): boolean => {
        if (!url) return true; // Opcional
        try {
            const urlCompleta = url.startsWith('http') ? url : `https://${url}`;
            new URL(urlCompleta);
            return true;
        } catch {
            return false;
        }
    };

    const validarLada = (lada: string): boolean => {
        // Debe ser +XX o +XXX
        return /^\+\d{1,3}$/.test(lada);
    };

    const esFormularioValido = (): boolean => {
        // Al menos un campo debe estar lleno
        const alMenosUnCampo = telefono.trim().length > 0 ||
            whatsapp.trim().length > 0 ||
            correo.trim().length > 0 ||
            sitioWeb.trim().length > 0;

        if (!alMenosUnCampo) return false;

        // Validar formatos
        const emailValido = validarEmail(correo);
        const urlValida = validarUrl(sitioWeb);

        // Validar teléfonos (si están llenos, deben tener 10 dígitos y lada válida)
        const telefonoValido = telefono.length === 0 || (telefono.length === 10 && validarLada(ladaTelefono));
        const whatsappValido = whatsapp.length === 0 || (whatsapp.length === 10 && validarLada(ladaWhatsapp));

        return emailValido && urlValida && telefonoValido && whatsappValido;
    };

    useEffect(() => {
        const esValido = esFormularioValido();
        setSiguienteDeshabilitado(!esValido);

        // ✅ NUEVO: Actualizar estado de paso completado en tiempo real
        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(2, esValido); // índice 2 = Paso 3
    }, [telefono, whatsapp, correo, sitioWeb, ladaTelefono, ladaWhatsapp]);


    // ---------------------------------------------------------------------------
    // Guardar desde navegación
    // ---------------------------------------------------------------------------
    useEffect(() => {
        (window as any).guardarPaso3 = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Completa todos los campos requeridos');
                return false;
            }

            try {
                const datos: any = {
                    telefono: telefono ? `${ladaTelefono}${telefono}` : null,
                    whatsapp: whatsapp ? `${ladaWhatsapp}${whatsapp}` : null,
                    correo: correo ? correo : null,
                    sitioWeb: sitioWeb ? (sitioWeb.startsWith('http') ? sitioWeb : `https://${sitioWeb}`) : null
                };

                if (validar) {
                    await guardarPaso3(datos as any);
                } else {
                    const { guardarBorradorPaso3 } = useOnboardingStore.getState();
                    await guardarBorradorPaso3(datos as any);
                }

                return true;
            }
            catch (error) {
                console.error('Error al guardar paso 3:', error);
                return false;
            }
        };

        return () => {
            delete (window as any).guardarPaso3;
        };
    }, [telefono, whatsapp, correo, sitioWeb, ladaTelefono, ladaWhatsapp]);

    // ---------------------------------------------------------------------------
    // Render de carga
    // ---------------------------------------------------------------------------
    if (cargandoDatos) {
        return (
            <div className="flex items-center justify-center py-8 lg:py-10 2xl:py-12">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 animate-spin text-blue-600 mx-auto mb-2 lg:mb-3" />
                    <p className="text-xs lg:text-sm text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-2.5 lg:space-y-3 2xl:space-y-4">

            {/* Banner informativo */}
            <div className="p-3 lg:p-2.5 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg 2xl:rounded-xl">
                <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs lg:text-xs 2xl:text-sm text-blue-800">
                        <span className="font-semibold">Información de contacto:</span> Completa al menos un método para que tus clientes puedan contactarte.
                    </p>
                </div>
            </div>

            {/* Grid de campos - 2 columnas en laptop+ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-2.5 2xl:gap-3">

                {/* Teléfono */}
                <div className="group">
                    <label className="block text-sm lg:text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2 lg:gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Phone className="w-4 h-4 text-blue-600" />
                        </div>
                        Teléfono
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={ladaTelefono}
                            onChange={(e) => handleLadaTelefonoChange(e.target.value)}
                            placeholder="+52"
                            className="w-16 px-2 py-2.5 lg:py-2 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm lg:text-sm transition-all text-center font-medium"
                        />
                        <input
                            type="tel"
                            value={telefono}
                            onChange={(e) => handleTelefonoChange(e.target.value)}
                            placeholder="6381234567"
                            maxLength={10}
                            className="flex-1 px-4 py-2.5 lg:py-2 border-2 border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm lg:text-sm transition-all"
                        />
                    </div>
                    {telefono && telefono.length !== 10 && (
                        <p className="text-[11px] text-red-500 mt-1">Debe tener 10 dígitos</p>
                    )}
                    {ladaTelefono && !validarLada(ladaTelefono) && (
                        <p className="text-[11px] text-red-500 mt-1">Lada inválida (ej: +52)</p>
                    )}
                </div>

                {/* WhatsApp */}
                <div className="group">
                    <label className="block text-sm lg:text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2 lg:gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-green-100 flex items-center justify-center">
                            <MessageCircle className="w-4 h-4 text-green-600" />
                        </div>
                        WhatsApp
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={ladaWhatsapp}
                            onChange={(e) => handleLadaWhatsappChange(e.target.value)}
                            placeholder="+52"
                            disabled={usarMismoNumero}
                            className="w-16 px-2 py-2.5 lg:py-2 border-2 border-slate-200 rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none text-sm lg:text-sm transition-all text-center font-medium disabled:bg-slate-50 disabled:text-slate-500"
                        />
                        <input
                            type="tel"
                            value={whatsapp}
                            onChange={(e) => handleWhatsappChange(e.target.value)}
                            placeholder="6381234567"
                            maxLength={10}
                            disabled={usarMismoNumero}
                            className="flex-1 px-4 py-2.5 lg:py-2 border-2 border-slate-200 rounded-lg focus:border-green-400 focus:ring-2 focus:ring-green-100 focus:outline-none text-sm lg:text-sm transition-all disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>
                    {whatsapp && whatsapp.length !== 10 && (
                        <p className="text-[11px] text-red-500 mt-1">Debe tener 10 dígitos</p>
                    )}
                    {ladaWhatsapp && !validarLada(ladaWhatsapp) && (
                        <p className="text-[11px] text-red-500 mt-1">Lada inválida (ej: +52)</p>
                    )}
                </div>

                {/* Correo */}
                <div className="group">
                    <label className="block text-sm lg:text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2 lg:gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-red-600" />
                        </div>
                        Correo
                    </label>
                    <input
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        placeholder="tu@correo.com"
                        maxLength={100}
                        className="w-full px-4 py-2.5 lg:py-2 border-2 border-slate-200 rounded-lg focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:outline-none text-sm lg:text-sm transition-all"
                    />
                    {correo && !validarEmail(correo) && (
                        <p className="text-[11px] text-red-500 mt-1">Correo inválido</p>
                    )}
                </div>

                {/* Sitio Web */}
                <div className="group">
                    <label className="block text-sm lg:text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2 lg:gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Globe className="w-4 h-4 text-purple-600" />
                        </div>
                        Sitio web
                    </label>
                    <input
                        type="url"
                        value={sitioWeb}
                        onChange={(e) => setSitioWeb(e.target.value)}
                        placeholder="www.tusitio.com"
                        maxLength={200}
                        className="w-full px-4 py-2.5 lg:py-2 border-2 border-slate-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-100 focus:outline-none text-sm lg:text-sm transition-all"
                    />
                    {sitioWeb && !validarUrl(sitioWeb) && (
                        <p className="text-[11px] text-red-500 mt-1">URL inválida</p>
                    )}
                </div>
            </div>

            {/* Checkbox - Usar mismo número */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                    type="checkbox"
                    id="usarMismoNumero"
                    checked={usarMismoNumero}
                    onChange={(e) => handleUsarMismoNumeroChange(e.target.checked)}
                    disabled={!telefono}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <span
                    onPointerUp={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (telefono && !usarMismoNumero) {
                            handleUsarMismoNumeroChange(true);
                        } else if (telefono && usarMismoNumero) {
                            handleUsarMismoNumeroChange(false);
                        }
                    }}
                    className={`text-sm select-none ${!telefono
                        ? 'text-slate-400 cursor-not-allowed'
                        : 'text-slate-700 cursor-pointer'
                        }`}
                >
                    Usar el mismo número para WhatsApp
                </span>
            </div>

            {/* Mensaje de validación */}
            {!esFormularioValido() && (telefono || whatsapp || correo || sitioWeb) && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                        {!telefono && !whatsapp && !correo && !sitioWeb
                            ? 'Completa al menos un método de contacto'
                            : 'Corrige los errores antes de continuar'
                        }
                    </p>
                </div>
            )}
        </div>
    );
}

export default PasoContacto;