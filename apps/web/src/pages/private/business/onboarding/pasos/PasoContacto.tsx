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
// CACHÉ — persiste entre montar/desmontar
// =============================================================================

const cache3 = {
    cargado: false,
    telefono: '', whatsapp: '', correo: '', sitioWeb: '',
    ladaTelefono: '+52', ladaWhatsapp: '+52',
    usarMismoNumero: false,
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoContacto() {
    const { negocioId, sucursalId, guardarPaso3, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados de campos — inicializar desde caché
    const [telefono, setTelefono] = useState(cache3.telefono);
    const [whatsapp, setWhatsapp] = useState(cache3.whatsapp);
    const [correo, setCorreo] = useState(cache3.correo);
    const [sitioWeb, setSitioWeb] = useState(cache3.sitioWeb);

    // Estados de ladas (editables)
    const [ladaTelefono, setLadaTelefono] = useState(cache3.ladaTelefono);
    const [ladaWhatsapp, setLadaWhatsapp] = useState(cache3.ladaWhatsapp);

    // Estados de control
    const [usarMismoNumero, setUsarMismoNumero] = useState(cache3.usarMismoNumero);
    const [cargandoDatos, setCargandoDatos] = useState(!cache3.cargado);

    // Sincronizar caché
    useEffect(() => {
        cache3.telefono = telefono; cache3.whatsapp = whatsapp;
        cache3.correo = correo; cache3.sitioWeb = sitioWeb;
        cache3.ladaTelefono = ladaTelefono; cache3.ladaWhatsapp = ladaWhatsapp;
        cache3.usarMismoNumero = usarMismoNumero;
    }, [telefono, whatsapp, correo, sitioWeb, ladaTelefono, ladaWhatsapp, usarMismoNumero]);

    // ---------------------------------------------------------------------------
    // Cargar datos existentes
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (cache3.cargado) { setCargandoDatos(false); return; }
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
                cache3.cargado = true;
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
        const guardarFn = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Completa todos los campos requeridos');
                return false;
            }

            try {
                const datos = {
                    telefono: telefono ? `${ladaTelefono}${telefono}` : undefined,
                    whatsapp: whatsapp ? `${ladaWhatsapp}${whatsapp}` : undefined,
                    correo: correo || undefined,
                    sitioWeb: sitioWeb ? (sitioWeb.startsWith('http') ? sitioWeb : `https://${sitioWeb}`) : undefined,
                };

                if (validar) {
                    await guardarPaso3(datos as Parameters<typeof guardarPaso3>[0]);
                } else {
                    const { guardarBorradorPaso3 } = useOnboardingStore.getState();
                    await guardarBorradorPaso3(datos);
                }

                return true;
            }
            catch (error) {
                console.error('Error al guardar paso 3:', error);
                return false;
            }
        };

        (window as unknown as Record<string, unknown>).guardarPaso3 = guardarFn;

        return () => {
            delete (window as unknown as Record<string, unknown>).guardarPaso3;
        };
    }, [telefono, whatsapp, correo, sitioWeb, ladaTelefono, ladaWhatsapp]);

    // ---------------------------------------------------------------------------
    // Render de carga
    // ---------------------------------------------------------------------------
    if (cargandoDatos) {
        return (
            <div className="flex items-center justify-center py-8 lg:py-10 2xl:py-12">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 animate-spin text-slate-600 mx-auto mb-2 lg:mb-3" />
                    <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal — Card estilo Mi Perfil
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-4 lg:space-y-3.5 2xl:space-y-5">

            {/* ================================================================= */}
            {/* CARD: Información de contacto */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                        <Phone className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Información de contacto</span>
                </div>
                <div className="p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">

                    {/* Info */}
                    <div className="p-3 lg:p-2.5 2xl:p-3 bg-slate-200 border-2 border-slate-300 rounded-lg">
                        <div className="flex gap-2">
                            <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                            <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-600 leading-tight">
                                <span className="font-bold text-slate-700">Completa al menos un método</span> para que tus clientes puedan contactarte.
                            </p>
                        </div>
                    </div>

                    {/* Grid 2 columnas: Teléfono + WhatsApp */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3 2xl:gap-4">

                        {/* Teléfono */}
                        <div>
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-500" />
                                Teléfono
                            </label>
                            <div className="flex gap-2">
                                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-2 border-2 border-slate-300 w-16"
                                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <input type="text" value={ladaTelefono}
                                        onChange={(e) => handleLadaTelefonoChange(e.target.value)}
                                        placeholder="+52"
                                        className="w-full bg-transparent outline-none text-sm lg:text-sm 2xl:text-base font-medium text-slate-800 text-center" />
                                </div>
                                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 border-2 border-slate-300 flex-1"
                                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <input type="tel" value={telefono}
                                        onChange={(e) => handleTelefonoChange(e.target.value)}
                                        placeholder="6381234567" maxLength={10}
                                        className="w-full bg-transparent outline-none text-sm lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500" />
                                </div>
                            </div>
                            {telefono && telefono.length !== 10 && (
                                <p className="text-sm font-medium text-red-500 mt-1">Debe tener 10 dígitos</p>
                            )}
                        </div>

                        {/* WhatsApp */}
                        <div>
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-slate-500" />
                                WhatsApp
                            </label>
                            <div className="flex gap-2">
                                <div className={`flex items-center h-11 lg:h-10 2xl:h-11 rounded-lg px-2 border-2 border-slate-300 w-16 ${usarMismoNumero ? 'bg-slate-50' : 'bg-slate-100'}`}
                                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <input type="text" value={ladaWhatsapp}
                                        onChange={(e) => handleLadaWhatsappChange(e.target.value)}
                                        placeholder="+52" disabled={usarMismoNumero}
                                        className="w-full bg-transparent outline-none text-sm lg:text-sm 2xl:text-base font-medium text-slate-800 text-center disabled:text-slate-500" />
                                </div>
                                <div className={`flex items-center h-11 lg:h-10 2xl:h-11 rounded-lg px-3 border-2 border-slate-300 flex-1 ${usarMismoNumero ? 'bg-slate-50' : 'bg-slate-100'}`}
                                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <input type="tel" value={whatsapp}
                                        onChange={(e) => handleWhatsappChange(e.target.value)}
                                        placeholder="6381234567" maxLength={10} disabled={usarMismoNumero}
                                        className="w-full bg-transparent outline-none text-sm lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 disabled:text-slate-500" />
                                </div>
                            </div>
                            {whatsapp && whatsapp.length !== 10 && (
                                <p className="text-sm font-medium text-red-500 mt-1">Debe tener 10 dígitos</p>
                            )}
                        </div>

                        {/* Correo */}
                        <div>
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-500" />
                                Correo
                            </label>
                            <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 border-2 border-slate-300"
                                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                <input type="email" value={correo}
                                    onChange={(e) => setCorreo(e.target.value)}
                                    placeholder="tu@correo.com" maxLength={100}
                                    className="w-full bg-transparent outline-none text-sm lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500" />
                            </div>
                            {correo && !validarEmail(correo) && (
                                <p className="text-sm font-medium text-red-500 mt-1">Correo inválido</p>
                            )}
                        </div>

                        {/* Sitio Web */}
                        <div>
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-slate-500" />
                                Sitio web
                            </label>
                            <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 border-2 border-slate-300"
                                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                <input type="url" value={sitioWeb}
                                    onChange={(e) => setSitioWeb(e.target.value)}
                                    placeholder="www.tusitio.com" maxLength={200}
                                    className="w-full bg-transparent outline-none text-sm lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500" />
                            </div>
                            {sitioWeb && !validarUrl(sitioWeb) && (
                                <p className="text-sm font-medium text-red-500 mt-1">URL inválida</p>
                            )}
                        </div>
                    </div>

                    {/* Checkbox - Usar mismo número */}
                    <label className={`flex items-center gap-3 p-3 bg-slate-100 border-2 border-slate-300 rounded-lg ${telefono ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                        <div className="shrink-0">
                            <input type="checkbox" checked={usarMismoNumero}
                                onChange={(e) => handleUsarMismoNumeroChange(e.target.checked)}
                                disabled={!telefono} className="sr-only" />
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                usarMismoNumero ? 'border-slate-800 bg-slate-800' : 'border-slate-300 bg-white'
                            }`}>
                                {usarMismoNumero && (
                                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <span className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-700 select-none">
                            Usar el mismo número para WhatsApp
                        </span>
                    </label>
                </div>
            </div>
        </div>
    );
}

export default PasoContacto;