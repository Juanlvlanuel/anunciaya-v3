/**
 * PanelAsistenteCoyo.tsx
 * =========================
 * Panel de chat del Asistente Coyo (FAB global): navega a una sección,
 * arma el borrador de una publicación de MarketPlace o Servicios, o
 * responde preguntas normales (mismo buscador del Home) y sobre la propia
 * app. Texto o voz; historial persistido en `localStorage`
 * (useAsistenteCoyoStore) con botón de vaciar.
 *
 * Regla de oro: NUNCA publica nada solo. Una acción de "crear publicación"
 * solo dejar armado el borrador — el usuario da el último "Publicar" en el
 * composer, con sus propias casillas legales.
 *
 * Ubicación: apps/web/src/components/asistente/PanelAsistenteCoyo.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, Loader2, Mic, Pause, Play, Send, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useAsistenteCoyoStore, type MensajeAsistenteCoyo } from '../../stores/useAsistenteCoyoStore';
import { useComposerPrefillStore, type PrefillMarketplace } from '../../stores/composerPrefillStore';
import {
    useInterpretarAsistente,
    type InterpretarAsistentePayload,
    type ResultadoAsistente,
    type TurnoChatAsistente,
} from '../../hooks/queries/useAsistente';
import { useAudioChat } from '../../hooks/useAudioChat';
import { useVozCoyo } from '../../hooks/useVozCoyo';
import { useFotosUploaderMarketplace } from '../../hooks/useFotosUploaderMarketplace';
import { useCategoriasMarketplace, useEliminarFotoMarketplaceHuerfana, useSugerirArticuloIA } from '../../hooks/queries/useMarketplace';
import { FILTRO_CONTORNO_COYO } from '../../config/estilosCoyo';
import { AnimacionBasuraAudio } from '../ui/AnimacionBasuraAudio';
import { itemsPlanosCoyo, rutaDetalleItemCoyo } from '../home/navegacionCoyo';
import type { ItemCoyo } from '../../types/preguntasComunidad';
import type { ArchivoFoto } from '../../types/archivoFoto';

/** Formatea segundos como "0:0X" / "X:XX" — mismo formato que ChatYA. */
function formatearDuracion(segundos: number): string {
    const s = Math.floor(segundos);
    const min = Math.floor(s / 60);
    const seg = s % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
}

/** Máximo de turnos previos que se mandan como contexto — el backend también topa en 20. */
const MAX_TURNOS_HISTORIAL = 10;

function blobABase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const resultado = reader.result as string;
            resolve(resultado.split(',')[1] ?? '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function PanelAsistenteCoyo() {
    const asistenteCoyoAbierto = useUiStore((s) => s.asistenteCoyoAbierto);
    const cerrarAsistenteCoyo = useUiStore((s) => s.cerrarAsistenteCoyo);

    const mensajes = useAsistenteCoyoStore((s) => s.mensajes);
    const silenciado = useAsistenteCoyoStore((s) => s.silenciado);
    const hidratarDesdeStorage = useAsistenteCoyoStore((s) => s.hidratarDesdeStorage);
    const agregarMensaje = useAsistenteCoyoStore((s) => s.agregarMensaje);
    const actualizarMensaje = useAsistenteCoyoStore((s) => s.actualizarMensaje);
    const vaciarChat = useAsistenteCoyoStore((s) => s.vaciarChat);
    const toggleSilenciado = useAsistenteCoyoStore((s) => s.toggleSilenciado);

    const usuario = useAuthStore((s) => s.usuario);
    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? undefined);
    const lat = useGpsStore((s) => s.latitud ?? undefined);
    const lng = useGpsStore((s) => s.longitud ?? undefined);
    const location = useLocation();
    const navigate = useNavigate();

    const interpretarMutation = useInterpretarAsistente();
    const audioChat = useAudioChat();
    const { hablar, detener } = useVozCoyo();

    const [texto, setTexto] = useState('');
    const [animacionBasura, setAnimacionBasura] = useState(false);
    const listaRef = useRef<HTMLDivElement>(null);

    /** Último turno que falló (red o IA) — se guarda solo en memoria (nunca en
     *  el store persistido: si era de voz, tendría el audio en base64, y ese
     *  dato nunca se persiste, ver política de privacidad de audio). Habilita
     *  el botón "Reintentar" en el último mensaje de error del chat. */
    const [turnoFallido, setTurnoFallido] = useState<{
        payload: { texto?: string; audioBase64?: string; audioMimeType?: InterpretarAsistentePayload['audioMimeType'] };
        origenVoz: boolean;
    } | null>(null);

    // ─── Foto adjunta (MarketPlace) ────────────────────────────────────
    // Análogo al uploader del composer: sube a R2, optimiza, trackea
    // huérfanas. Aquí solo se usa para 0-N fotos "pendientes" que se
    // adjuntan al borrador cuando el usuario da "Revisar y publicar" — el
    // `categoriaId`/`condicion` que detecta la IA de la foto es más preciso
    // que lo que Gemini podría adivinar solo por texto, así que se guarda
    // aparte y GANA sobre lo que la conversación devuelva.
    const [menuFotoAbierto, setMenuFotoAbierto] = useState(false);
    const [fotosAdjuntas, setFotosAdjuntas] = useState<ArchivoFoto[]>([]);
    const [categoriaIdFoto, setCategoriaIdFoto] = useState<number | null>(null);
    const [condicionFoto, setCondicionFoto] = useState<PrefillMarketplace['condicion']>(undefined);
    const urlsFotoCoyoRef = useRef<Set<string>>(new Set());
    const menuFotoRef = useRef<HTMLDivElement>(null);
    const sugerirArticuloMutation = useSugerirArticuloIA();
    const eliminarFotoHuerfanaMutation = useEliminarFotoMarketplaceHuerfana();
    const { data: categoriasMP = [] } = useCategoriasMarketplace();

    function handleCambioFotosCoyo(nuevas: ArchivoFoto[]) {
        const anteriores = new Set(fotosAdjuntas.map((f) => f.url));
        const agregadas = nuevas.filter((f) => !anteriores.has(f.url));
        setFotosAdjuntas(nuevas);
        agregadas.forEach((foto) => {
            if (foto.tipo === 'imagen') {
                analizarFotoYEnviar(foto);
            } else {
                // Video: sin análisis IA (sugerirDatosArticulo es solo fotos) — se adjunta igual, sin sugerencias.
                const resumen = '[Video adjunto] Quiero vender este artículo — pregúntame lo que necesites.';
                agregarMensaje({ rol: 'usuario', texto: resumen, imagenUrl: foto.posterUrl ?? foto.url });
                enviarTurno({ texto: resumen }, false);
            }
        });
    }

    const fotosUploader = useFotosUploaderMarketplace({
        fotos: fotosAdjuntas,
        onCambioFotos: handleCambioFotosCoyo,
        urlsSubidasEnSesion: urlsFotoCoyoRef,
    });

    // Cierra el menú "Tomar foto / Elegir de galería" al hacer click fuera.
    useEffect(() => {
        if (!menuFotoAbierto) return;
        const handler = (e: MouseEvent) => {
            if (menuFotoRef.current && !menuFotoRef.current.contains(e.target as Node)) {
                setMenuFotoAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuFotoAbierto]);

    /**
     * Muestra la burbuja de la foto AL INSTANTE (apenas termina de subirse a
     * R2 — no espera al análisis de Gemini, que es lo más lento del proceso).
     * El texto del mensaje arranca genérico y se RELLENA después, cuando el
     * análisis responde, con `actualizarMensaje` — la burbuja no se ve
     * afectada (muestra la imagen, no el texto, ver JSX de abajo) pero el
     * texto real SÍ debe quedar ahí antes del siguiente turno, porque
     * `construirHistorial()` arma el contexto leyendo `mensajes[].texto` — si
     * se quedara con el genérico, Coyo perdería los datos detectados
     * (título/descripción/categoría) en cuanto el usuario respondiera el
     * siguiente turno (ej. el precio) — ver bug detectado en pruebas.
     */
    function analizarFotoYEnviar(foto: ArchivoFoto) {
        const idMensaje = agregarMensaje({ rol: 'usuario', texto: '📷 Foto adjunta', imagenUrl: foto.url });
        sugerirArticuloMutation.mutate(foto.url, {
            onSuccess: (data) => {
                let resumen: string;
                if (data.success) {
                    const { titulo, descripcion, condicion, categoriaId } = data.data;
                    setCategoriaIdFoto(categoriaId);
                    setCondicionFoto(condicion);
                    const categoriaNombre = categoriasMP.find((c) => c.id === categoriaId)?.nombre;
                    resumen = `[Foto adjunta] La IA detectó automáticamente en la imagen: título "${titulo}", descripción "${descripcion}"${condicion ? `, condición ${condicion}` : ''}${categoriaNombre ? `, categoría ${categoriaNombre}` : ''}. Quiero vender este artículo — no preguntes por esos datos, solo lo que falte.`;
                } else {
                    resumen = '[Foto adjunta] Quiero vender este artículo — no se distinguieron detalles claros en la foto, pregúntame lo que necesites.';
                }
                actualizarMensaje(idMensaje, { texto: resumen });
                enviarTurno({ texto: resumen }, false);
            },
            onError: () => {
                const resumen = '[Foto adjunta] Quiero vender este artículo — pregúntame lo que necesites.';
                actualizarMensaje(idMensaje, { texto: resumen });
                enviarTurno({ texto: resumen }, false);
            },
        });
    }

    const { esMobile } = useBreakpoint();
    const chatYAAbierto = useUiStore((s) => s.chatYAAbierto);

    useEffect(() => {
        if (asistenteCoyoAbierto) hidratarDesdeStorage();
    }, [asistenteCoyoAbierto, hidratarDesdeStorage]);

    // Único cierre automático: cuando se abre ChatYA. Ambos son sidebars del
    // mismo lado en escritorio — ChatYA gana. Cualquier otro cierre (navegar,
    // dejar un borrador listo, click afuera) queda desactivado a propósito:
    // el usuario quiere poder seguir viendo/hablando con Coyo mientras
    // navega o revisa lo que le armó. Solo la "X" cierra.
    useEffect(() => {
        if (chatYAAbierto) cerrarAsistenteCoyo();
    }, [chatYAAbierto, cerrarAsistenteCoyo]);

    // Auto-scroll al fondo con cada mensaje nuevo.
    useEffect(() => {
        listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
    }, [mensajes.length]);

    // Cortar cualquier audio en curso al cerrar el panel.
    useEffect(() => {
        if (!asistenteCoyoAbierto) detener();
    }, [asistenteCoyoAbierto, detener]);

    function construirHistorial(): TurnoChatAsistente[] {
        return useAsistenteCoyoStore
            .getState()
            .mensajes.slice(-MAX_TURNOS_HISTORIAL)
            .map((m) => ({ rol: m.rol, texto: m.texto }));
    }

    function procesarResultado(resultado: ResultadoAsistente, origenVoz: boolean) {
        switch (resultado.tipo) {
            case 'pregunta': {
                agregarMensaje({ rol: 'coyo', texto: resultado.texto });
                if (origenVoz) hablar(resultado.texto);
                break;
            }
            case 'respuesta': {
                // Resultados reales (negocio/oferta/marketplace/servicio) se muestran
                // como lista clicable — así el usuario navega directo en vez de
                // depender de que Coyo describa bien el link en texto (o, peor,
                // que diga "ya te dejé ahí" sin haber navegado a ningún lado).
                const resultadosBusqueda = itemsPlanosCoyo(resultado.resultados);
                agregarMensaje({
                    rol: 'coyo',
                    texto: resultado.texto,
                    ...(resultadosBusqueda.length > 0 ? { resultadosBusqueda } : {}),
                });
                if (origenVoz) hablar(resultado.texto);
                break;
            }
            case 'navegar': {
                // `mensaje` viene de Gemini (explica cómo seguir desde ahí, ej.
                // "abre el cupón y toca revelar código"). Si no generó nada,
                // cae al texto genérico.
                const respuesta = resultado.mensaje?.trim() || 'Listo, ahí te dejo 👋';
                agregarMensaje({ rol: 'coyo', texto: respuesta });
                if (origenVoz) hablar(respuesta);
                // No se cierra: el usuario quiere seguir viendo/hablando con
                // Coyo mientras navega. Solo la "X" cierra el panel.
                navigate(resultado.ruta);
                break;
            }
            case 'prefill_marketplace': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y publiques.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarMarketplace: {
                        ruta: resultado.ruta,
                        titulo: resultado.descripcionArticulo,
                        descripcion: resultado.descripcion,
                        categoriaId: resultado.categoriaId,
                        precio: resultado.precio,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_servicio': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y publiques.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarServicio: {
                        ruta: resultado.ruta,
                        titulo: resultado.descripcionServicio,
                        descripcion: resultado.descripcion,
                        categoria: resultado.categoria,
                        presupuesto: resultado.presupuesto,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_catalogo': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y guardes en tu catálogo.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarCatalogo: {
                        ruta: resultado.ruta,
                        tipo: resultado.tipoArticulo,
                        nombre: resultado.nombre,
                        descripcion: resultado.descripcion,
                        categoria: resultado.categoria,
                        precioBase: resultado.precioBase,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_publicacion_negocio': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y publiques en tu feed.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarNegocio: {
                        ruta: resultado.ruta,
                        texto: resultado.texto,
                        precio: resultado.precio,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_vacante': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y publiques.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarVacante: {
                        ruta: resultado.ruta,
                        titulo: resultado.titulo,
                        descripcion: resultado.descripcion,
                        tipoEmpleo: resultado.tipoEmpleo,
                        modalidad: resultado.modalidad,
                        salario: resultado.salario,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_recompensa': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y guardes.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarRecompensa: {
                        ruta: resultado.ruta,
                        nombre: resultado.nombre,
                        descripcion: resultado.descripcion,
                        puntosRequeridos: resultado.puntosRequeridos,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_config_puntos': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y guardes.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionEditarConfigPuntos: {
                        ruta: resultado.ruta,
                        pesosPor: resultado.pesosPor,
                        puntosGanados: resultado.puntosGanados,
                        diasExpiracionPuntos: resultado.diasExpiracionPuntos,
                        diasExpiracionVoucher: resultado.diasExpiracionVoucher,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_sucursal': {
                const respuesta = resultado.mensaje?.trim()
                    || 'Te dejo esto listo para que lo revises — ajusta el marcador del mapa a la ubicación exacta y dale "Crear sucursal".';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarSucursal: {
                        ruta: resultado.ruta,
                        nombre: resultado.nombre,
                        ciudad: resultado.ciudad,
                        estado: resultado.estado,
                        latitud: resultado.latitud,
                        longitud: resultado.longitud,
                        direccion: resultado.direccion,
                        telefono: resultado.telefono,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_empleado': {
                const respuesta = resultado.mensaje?.trim()
                    || 'Te dejo esto listo para que lo revises — captura el PIN a mano y dale "Crear empleado".';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarEmpleado: {
                        ruta: resultado.ruta,
                        nombre: resultado.nombre,
                        nick: resultado.nick,
                        especialidad: resultado.especialidad,
                        telefono: resultado.telefono,
                        puedeRegistrarVentas: resultado.puedeRegistrarVentas,
                        puedeProcesarCanjes: resultado.puedeProcesarCanjes,
                        puedeVerHistorial: resultado.puedeVerHistorial,
                        puedeResponderChat: resultado.puedeResponderChat,
                        puedeResponderResenas: resultado.puedeResponderResenas,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_perfil_comercial': {
                const respuesta = resultado.mensaje?.trim()
                    || 'Te dejo esto listo para que lo revises — dale "Guardar" cuando quieras.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionEditarPerfilComercial: {
                        ruta: resultado.ruta,
                        descripcion: resultado.descripcion,
                        telefono: resultado.telefono,
                        whatsapp: resultado.whatsapp,
                        correo: resultado.correo,
                        sitioWeb: resultado.sitioWeb,
                        direccion: resultado.direccion,
                        ciudad: resultado.ciudad,
                        estado: resultado.estado,
                        latitud: resultado.latitud,
                        longitud: resultado.longitud,
                        metodoPagoEfectivo: resultado.metodoPagoEfectivo,
                        metodoPagoTarjeta: resultado.metodoPagoTarjeta,
                        metodoPagoTransferencia: resultado.metodoPagoTransferencia,
                        tieneEnvio: resultado.tieneEnvio,
                        tieneServicio: resultado.tieneServicio,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
            case 'prefill_oferta': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y publiques.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarOferta: {
                        ruta: resultado.ruta,
                        titulo: resultado.titulo,
                        tipoOferta: resultado.tipoOferta,
                        valor: resultado.valor,
                        fechaInicio: resultado.fechaInicio,
                        fechaFin: resultado.fechaFin,
                        descripcion: resultado.descripcion,
                        compraMinima: resultado.compraMinima,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
        }
    }

    function enviarTurno(
        payloadTurno: { texto?: string; audioBase64?: string; audioMimeType?: InterpretarAsistentePayload['audioMimeType'] },
        origenVoz: boolean,
    ) {
        const historial = construirHistorial();
        interpretarMutation.mutate(
            {
                ...payloadTurno,
                historial,
                rutaActual: location.pathname,
                modoComercial: usuario?.modoActivo === 'comercial',
                nombreNegocio: usuario?.modoActivo === 'comercial' ? (usuario?.nombreNegocio ?? undefined) : undefined,
                ciudad,
                lat,
                lng,
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        setTurnoFallido(null);
                        procesarResultado(data.resultado, origenVoz);
                    } else {
                        setTurnoFallido({ payload: payloadTurno, origenVoz });
                        agregarMensaje({ rol: 'coyo', texto: 'Ahorita no puedo ayudarte, ¿lo intentamos de nuevo?', esError: true });
                    }
                },
                onError: () => {
                    setTurnoFallido({ payload: payloadTurno, origenVoz });
                    agregarMensaje({ rol: 'coyo', texto: 'Se me fue la señal, ¿lo intentas de nuevo en un momento?', esError: true });
                },
            },
        );
    }

    function handleReintentar() {
        if (!turnoFallido) return;
        enviarTurno(turnoFallido.payload, turnoFallido.origenVoz);
    }

    function handleEnviarTexto() {
        const mensaje = texto.trim();
        if (!mensaje || interpretarMutation.isPending) return;
        agregarMensaje({ rol: 'usuario', texto: mensaje });
        setTexto('');
        enviarTurno({ texto: mensaje }, false);
    }

    function handleClickMic() {
        if (audioChat.grabando) {
            audioChat.detenerGrabacion();
        } else {
            audioChat.iniciarGrabacion();
        }
    }

    function handleCancelarGrabacion() {
        audioChat.cancelarGrabacion();
        setAnimacionBasura(true);
    }

    // Cuando useAudioChat termina de procesar la grabación, mandar el audio.
    // El blob se guarda como object URL SOLO en memoria de esta pestaña (para
    // poder reproducirlo en la burbuja) — nunca se sube a ningún lado.
    useEffect(() => {
        if (!audioChat.audioListo) return;
        const { blob, waveform, duracion } = audioChat.audioListo;
        agregarMensaje({
            rol: 'usuario',
            texto: '🎤 Mensaje de voz',
            origenVoz: true,
            audioUrl: URL.createObjectURL(blob),
            audioWaveform: waveform,
            audioDuracion: duracion,
        });
        blobABase64(audioChat.audioListo.blob).then((audioBase64) => {
            enviarTurno(
                {
                    audioBase64,
                    audioMimeType: audioChat.audioListo!.contentType as InterpretarAsistentePayload['audioMimeType'],
                },
                true,
            );
        });
        audioChat.limpiar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioChat.audioListo]);

    /** Revoca los object URLs de audio y limpia fotos huérfanas antes de vaciar. */
    function handleVaciarChat() {
        useAsistenteCoyoStore.getState().mensajes.forEach((m) => {
            if (m.audioUrl) URL.revokeObjectURL(m.audioUrl);
        });
        if (urlsFotoCoyoRef.current.size > 0) {
            Array.from(urlsFotoCoyoRef.current).forEach((url) => eliminarFotoHuerfanaMutation.mutate(url));
            urlsFotoCoyoRef.current.clear();
        }
        setFotosAdjuntas([]);
        setCategoriaIdFoto(null);
        setCondicionFoto(undefined);
        setTurnoFallido(null);
        vaciarChat();
    }

    function handleClickPublicar(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarMarketplace']>) {
        useComposerPrefillStore.getState().setPrefillMarketplace({
            titulo: accion.titulo,
            descripcion: accion.descripcion,
            // El dato de la foto (más preciso que lo que Gemini adivinó por
            // texto) gana si existe.
            categoriaId: categoriaIdFoto ?? accion.categoriaId,
            condicion: condicionFoto,
            precio: accion.precio,
            fotos: fotosAdjuntas.length > 0 ? fotosAdjuntas : undefined,
        });
        // El composer toma posesión de las fotos desde aquí (su propio
        // cleanup de "descartar publicación" ya las cubre) — Coyo deja de
        // rastrearlas para no intentar borrarlas también.
        urlsFotoCoyoRef.current.clear();
        setFotosAdjuntas([]);
        setCategoriaIdFoto(null);
        setCondicionFoto(undefined);
        // No se cierra: mismo criterio que "navegar" — el usuario decide
        // cuándo cerrar, con la "X".
        navigate(accion.ruta);
    }

    function handleClickPublicarServicio(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarServicio']>) {
        useComposerPrefillStore.getState().setPrefillServicios({
            titulo: accion.titulo,
            descripcion: accion.descripcion,
            categoria: accion.categoria,
            presupuesto: accion.presupuesto,
        });
        navigate(accion.ruta);
    }

    function handleClickPublicarCatalogo(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarCatalogo']>) {
        useComposerPrefillStore.getState().setPrefillCatalogo({
            tipo: accion.tipo,
            nombre: accion.nombre,
            descripcion: accion.descripcion,
            categoria: accion.categoria,
            precioBase: accion.precioBase,
        });
        navigate(accion.ruta);
    }

    function handleClickPublicarNegocio(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarNegocio']>) {
        useComposerPrefillStore.getState().setPrefillPublicacionNegocio({
            texto: accion.texto,
            precio: accion.precio,
        });
        navigate(accion.ruta);
    }

    function handleClickPublicarVacante(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarVacante']>) {
        useComposerPrefillStore.getState().setPrefillVacante({
            titulo: accion.titulo,
            descripcion: accion.descripcion,
            tipoEmpleo: accion.tipoEmpleo,
            modalidad: accion.modalidad,
            salario: accion.salario,
        });
        navigate(accion.ruta);
    }

    function handleClickPublicarRecompensa(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarRecompensa']>) {
        useComposerPrefillStore.getState().setPrefillRecompensa({
            nombre: accion.nombre,
            descripcion: accion.descripcion,
            puntosRequeridos: accion.puntosRequeridos,
        });
        navigate(accion.ruta);
    }

    function handleClickEditarConfigPuntos(accion: NonNullable<MensajeAsistenteCoyo['accionEditarConfigPuntos']>) {
        useComposerPrefillStore.getState().setPrefillConfigPuntos({
            pesosPor: accion.pesosPor,
            puntosGanados: accion.puntosGanados,
            diasExpiracionPuntos: accion.diasExpiracionPuntos,
            diasExpiracionVoucher: accion.diasExpiracionVoucher,
        });
        navigate(accion.ruta);
    }

    function handleClickPublicarSucursal(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarSucursal']>) {
        useComposerPrefillStore.getState().setPrefillSucursal({
            nombre: accion.nombre,
            ciudad: accion.ciudad,
            estado: accion.estado,
            latitud: accion.latitud,
            longitud: accion.longitud,
            direccion: accion.direccion,
            telefono: accion.telefono,
        });
        navigate(accion.ruta);
    }

    function handleClickPublicarEmpleado(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarEmpleado']>) {
        useComposerPrefillStore.getState().setPrefillEmpleado({
            nombre: accion.nombre,
            nick: accion.nick,
            especialidad: accion.especialidad,
            telefono: accion.telefono,
            puedeRegistrarVentas: accion.puedeRegistrarVentas,
            puedeProcesarCanjes: accion.puedeProcesarCanjes,
            puedeVerHistorial: accion.puedeVerHistorial,
            puedeResponderChat: accion.puedeResponderChat,
            puedeResponderResenas: accion.puedeResponderResenas,
        });
        navigate(accion.ruta);
    }

    function handleClickEditarPerfilComercial(accion: NonNullable<MensajeAsistenteCoyo['accionEditarPerfilComercial']>) {
        useComposerPrefillStore.getState().setPrefillPerfilComercial({
            descripcion: accion.descripcion,
            telefono: accion.telefono,
            whatsapp: accion.whatsapp,
            correo: accion.correo,
            sitioWeb: accion.sitioWeb,
            direccion: accion.direccion,
            ciudad: accion.ciudad,
            estado: accion.estado,
            latitud: accion.latitud,
            longitud: accion.longitud,
            metodoPagoEfectivo: accion.metodoPagoEfectivo,
            metodoPagoTarjeta: accion.metodoPagoTarjeta,
            metodoPagoTransferencia: accion.metodoPagoTransferencia,
            tieneEnvio: accion.tieneEnvio,
            tieneServicio: accion.tieneServicio,
        });
        navigate(accion.ruta);
    }

    function handleClickPublicarOferta(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarOferta']>) {
        useComposerPrefillStore.getState().setPrefillOferta({
            titulo: accion.titulo,
            tipo: accion.tipoOferta,
            valor: accion.valor,
            fechaInicio: accion.fechaInicio,
            fechaFin: accion.fechaFin,
            descripcion: accion.descripcion,
            compraMinima: accion.compraMinima !== undefined ? String(accion.compraMinima) : undefined,
        });
        navigate(accion.ruta);
    }

    /** Click en un resultado real de búsqueda (negocio/oferta/marketplace/servicio) — misma resolución de ruta que ya usa el carrusel de Coyo en el Home. */
    function handleClickResultado(item: ItemCoyo) {
        navigate(rutaDetalleItemCoyo(item));
    }

    if (!asistenteCoyoAbierto) return null;

    const contenido = (
        <>
            {/* Header */}
            <div className={`flex shrink-0 items-center gap-2.5 bg-linear-to-br from-amber-500 to-amber-700 px-4 py-3 ${esMobile ? 'rounded-t-2xl' : ''}`}>
                <img
                    src="/cabeza-coyo.webp"
                    alt=""
                    className="h-12 w-12 shrink-0 object-contain"
                    style={{ filter: FILTRO_CONTORNO_COYO }}
                />
                <div className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold leading-tight text-white">Coyo</span>
                    <span className="block text-[12px] leading-tight text-white/85">Tu asistente virtual</span>
                </div>
                {/* Los 3 íconos de acción: un poco más grandes en móvil, tamaño normal en escritorio. */}
                <button
                    type="button"
                    data-testid="asistente-toggle-silenciado"
                    aria-label={silenciado ? 'Activar voz' : 'Silenciar voz'}
                    onClick={toggleSilenciado}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 lg:h-8 lg:w-8 lg:cursor-pointer lg:hover:bg-white/15"
                >
                    {silenciado ? <VolumeX className="h-5 w-5 lg:h-4 lg:w-4" /> : <Volume2 className="h-5 w-5 lg:h-4 lg:w-4" />}
                </button>
                <button
                    type="button"
                    data-testid="asistente-vaciar-chat"
                    aria-label="Vaciar chat"
                    onClick={handleVaciarChat}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 lg:h-8 lg:w-8 lg:cursor-pointer lg:hover:bg-white/15"
                >
                    <Trash2 className="h-5 w-5 lg:h-4 lg:w-4" />
                </button>
                <button
                    type="button"
                    data-testid="asistente-cerrar"
                    aria-label="Cerrar"
                    onClick={cerrarAsistenteCoyo}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 lg:h-8 lg:w-8 lg:cursor-pointer lg:hover:bg-white/15"
                >
                    <X className="h-6 w-6 lg:h-5 lg:w-5" />
                </button>
            </div>

            {/* Mensajes */}
                <div ref={listaRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
                    {mensajes.length === 0 && (
                        <p className="px-2 text-center text-sm text-slate-500">
                            Pregúntame algo de tu ciudad, o dime qué quieres hacer — por ejemplo &ldquo;quiero vender mi bicicleta en 800&rdquo;.
                        </p>
                    )}
                    {mensajes.map((m, i) => (
                        <div key={m.id} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                data-testid={`asistente-mensaje-${m.rol}`}
                                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] font-medium leading-snug ${
                                    m.rol === 'usuario'
                                        ? 'bg-slate-800 text-white'
                                        : 'border border-amber-300 bg-amber-50 text-slate-800'
                                }`}
                            >
                                {m.imagenUrl ? (
                                    <img
                                        src={m.imagenUrl}
                                        alt="Foto adjunta"
                                        data-testid="asistente-imagen-adjunta"
                                        className="max-h-48 w-full rounded-lg object-cover"
                                    />
                                ) : m.audioUrl ? (
                                    <BurbujaAudioCoyo url={m.audioUrl} waveform={m.audioWaveform ?? []} duracion={m.audioDuracion ?? 0} />
                                ) : (
                                    m.texto
                                )}
                                {m.resultadosBusqueda && m.resultadosBusqueda.length > 0 && (
                                    <div className="mt-2 space-y-1.5">
                                        {m.resultadosBusqueda.map((item) => (
                                            <button
                                                key={`${item.tipo}-${item.id}`}
                                                type="button"
                                                data-testid={`asistente-resultado-${item.tipo}-${item.id}`}
                                                onClick={() => handleClickResultado(item)}
                                                className="flex w-full items-center gap-2.5 rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-left lg:cursor-pointer lg:hover:bg-amber-50"
                                            >
                                                {item.imagen ? (
                                                    <img src={item.imagen} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                                                ) : (
                                                    <div className="h-10 w-10 shrink-0 rounded-lg bg-amber-100" />
                                                )}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] font-semibold text-slate-800">{item.titulo}</span>
                                                    {item.subtitulo && (
                                                        <span className="block truncate text-[12px] font-normal text-slate-500">{item.subtitulo}</span>
                                                    )}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {m.accionPublicarMarketplace && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar"
                                        onClick={() => handleClickPublicar(m.accionPublicarMarketplace!)}
                                        className="mt-2 block w-full rounded-full bg-teal-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-teal-700"
                                    >
                                        Revisar y publicar
                                    </button>
                                )}
                                {m.accionPublicarServicio && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar-servicio"
                                        onClick={() => handleClickPublicarServicio(m.accionPublicarServicio!)}
                                        className="mt-2 block w-full rounded-full bg-sky-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-sky-700"
                                    >
                                        Revisar y publicar
                                    </button>
                                )}
                                {m.accionPublicarCatalogo && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar-catalogo"
                                        onClick={() => handleClickPublicarCatalogo(m.accionPublicarCatalogo!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y guardar
                                    </button>
                                )}
                                {m.accionPublicarNegocio && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar-negocio"
                                        onClick={() => handleClickPublicarNegocio(m.accionPublicarNegocio!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y publicar
                                    </button>
                                )}
                                {m.accionPublicarVacante && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar-vacante"
                                        onClick={() => handleClickPublicarVacante(m.accionPublicarVacante!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y publicar
                                    </button>
                                )}
                                {m.accionPublicarRecompensa && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar-recompensa"
                                        onClick={() => handleClickPublicarRecompensa(m.accionPublicarRecompensa!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y guardar
                                    </button>
                                )}
                                {m.accionEditarConfigPuntos && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-config-puntos"
                                        onClick={() => handleClickEditarConfigPuntos(m.accionEditarConfigPuntos!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y guardar
                                    </button>
                                )}
                                {m.accionPublicarSucursal && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar-sucursal"
                                        onClick={() => handleClickPublicarSucursal(m.accionPublicarSucursal!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y crear
                                    </button>
                                )}
                                {m.accionPublicarEmpleado && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar-empleado"
                                        onClick={() => handleClickPublicarEmpleado(m.accionPublicarEmpleado!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y crear
                                    </button>
                                )}
                                {m.accionEditarPerfilComercial && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-perfil-comercial"
                                        onClick={() => handleClickEditarPerfilComercial(m.accionEditarPerfilComercial!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y guardar
                                    </button>
                                )}
                                {m.accionPublicarOferta && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar-oferta"
                                        onClick={() => handleClickPublicarOferta(m.accionPublicarOferta!)}
                                        className="mt-2 block w-full rounded-full bg-indigo-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-indigo-700"
                                    >
                                        Revisar y publicar
                                    </button>
                                )}
                                {m.esError && i === mensajes.length - 1 && turnoFallido && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-reintentar"
                                        onClick={handleReintentar}
                                        disabled={interpretarMutation.isPending}
                                        className="mt-2 block w-full rounded-full border border-amber-300 bg-white px-3 py-1.5 text-center text-[13px] font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50 lg:cursor-pointer lg:hover:bg-amber-100"
                                    >
                                        Reintentar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {(interpretarMutation.isPending || fotosUploader.subiendo || sugerirArticuloMutation.isPending) && (
                        <div className="flex justify-start">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input — modo normal o barra de grabación (mismo patrón visual que ChatYA: onda en vivo + timer + cancelar). */}
                <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]">
                    {audioChat.grabando ? (
                        <>
                            <button
                                type="button"
                                data-testid="asistente-audio-cancelar"
                                aria-label="Cancelar grabación"
                                onClick={handleCancelarGrabacion}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 lg:cursor-pointer lg:hover:bg-red-50"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-red-200 bg-red-50 py-2 pl-3 pr-4">
                                <div className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                                <div className="flex h-7 flex-1 items-center gap-0.5 overflow-hidden">
                                    {(audioChat.waveformEnVivo.length > 0
                                        ? audioChat.waveformEnVivo
                                        : Array.from({ length: 20 }, () => 0.15)
                                    ).map((valor, i) => (
                                        <div
                                            key={i}
                                            className="w-[2.5px] shrink-0 rounded-full bg-red-500"
                                            style={{ height: `${Math.max(15, valor * 100)}%`, minHeight: '3px' }}
                                        />
                                    ))}
                                </div>
                                <span className="min-w-10 shrink-0 text-right text-sm font-medium tabular-nums text-red-600">
                                    {formatearDuracion(audioChat.duracion)}
                                </span>
                            </div>

                            <button
                                type="button"
                                data-testid="asistente-audio-detener"
                                aria-label="Detener y enviar"
                                onClick={handleClickMic}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-red-600 text-white shadow-[0_3px_10px_rgba(239,68,68,0.3)] lg:cursor-pointer lg:hover:scale-105"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="relative shrink-0" ref={menuFotoRef}>
                                <button
                                    type="button"
                                    data-testid="asistente-btn-foto"
                                    aria-label="Adjuntar foto"
                                    onClick={() => setMenuFotoAbierto((v) => !v)}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 lg:h-11 lg:w-11 lg:cursor-pointer lg:hover:bg-slate-300"
                                >
                                    <Camera className="h-6 w-6 lg:h-5 lg:w-5" />
                                </button>
                                {menuFotoAbierto && (
                                    <div className="absolute bottom-full left-0 mb-2 w-56 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg lg:w-44">
                                        <button
                                            type="button"
                                            data-testid="asistente-foto-tomar"
                                            onClick={() => {
                                                setMenuFotoAbierto(false);
                                                fotosUploader.abrirCamara();
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-slate-700 lg:gap-2 lg:px-3 lg:py-2.5 lg:text-[13px] lg:cursor-pointer lg:hover:bg-slate-50"
                                        >
                                            <Camera className="h-5 w-5 lg:h-4 lg:w-4" /> Tomar foto
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="asistente-foto-galeria"
                                            onClick={() => {
                                                setMenuFotoAbierto(false);
                                                fotosUploader.abrirGaleria();
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-slate-700 lg:gap-2 lg:px-3 lg:py-2.5 lg:text-[13px] lg:cursor-pointer lg:hover:bg-slate-50"
                                        >
                                            <ImageIcon className="h-5 w-5 lg:h-4 lg:w-4" /> Elegir de galería
                                        </button>
                                    </div>
                                )}
                                <input {...fotosUploader.inputCamaraProps} />
                                <input {...fotosUploader.inputGaleriaProps} />
                            </div>
                            <input
                                type="text"
                                data-testid="asistente-input-texto"
                                value={texto}
                                onChange={(e) => setTexto(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEnviarTexto();
                                }}
                                placeholder="Escribe o graba tu mensaje"
                                className="min-w-0 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 py-3 text-[15px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 lg:px-3.5 lg:py-2 lg:text-[14px]"
                            />
                            {/* Un solo botón mic/enviar (como WhatsApp): mic por default, cambia a enviar en cuanto hay texto. */}
                            <button
                                type="button"
                                data-testid={texto.trim() ? 'asistente-btn-enviar' : 'asistente-btn-mic'}
                                aria-label={texto.trim() ? 'Enviar' : 'Grabar mensaje de voz'}
                                onClick={texto.trim() ? handleEnviarTexto : handleClickMic}
                                disabled={!!texto.trim() && interpretarMutation.isPending}
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-40 lg:h-11 lg:w-11 lg:cursor-pointer ${
                                    texto.trim()
                                        ? 'bg-amber-600 text-white lg:hover:bg-amber-700'
                                        : 'bg-slate-200 text-slate-700 lg:hover:bg-slate-300'
                                }`}
                            >
                                {texto.trim() ? <Send className="h-6 w-6 lg:h-5 lg:w-5" /> : <Mic className="h-6 w-6 lg:h-5 lg:w-5" />}
                            </button>
                        </>
                    )}
                </div>
                {audioChat.error && (
                    <p className="px-3 pb-2 text-xs text-red-600">{audioChat.error}</p>
                )}
                {animacionBasura && (
                    <AnimacionBasuraAudio onCompleta={() => setAnimacionBasura(false)} />
                )}
        </>
    );

    // Móvil: bottom sheet con backdrop. Escritorio: sidebar de alto completo (ver abajo).
    if (esMobile) {
        return (
            <div className="fixed inset-0 z-[60] flex items-end justify-center">
                {/* Sin onClick: el panel solo cierra con la "X" (pedido explícito). */}
                <div className="absolute inset-0 bg-slate-900/40" aria-hidden />
                <div
                    data-testid="panel-asistente-coyo"
                    className="relative flex h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl"
                >
                    {contenido}
                </div>
            </div>
        );
    }

    // Escritorio: sidebar pegado al borde derecho, arrancando justo debajo
    // del header — usa `--ay-navbar-h` (medida en vivo por `MainLayout.tsx`,
    // mismo mecanismo que ya usa ChatYA para no taparlo). Ancho pensado para
    // cubrir la columna de publicidad y un poco más — esa columna mide
    // EXACTO `lg:w-56 2xl:w-80` (224px/320px, ver `ColumnaDerecha` en
    // `MainLayout.tsx`).
    return (
        <div
            data-testid="panel-asistente-coyo"
            className="fixed right-0 bottom-0 z-[60] flex w-[260px] flex-col bg-white shadow-2xl lg:w-[340px] 2xl:w-[360px]"
            style={{ top: 'var(--ay-navbar-h, 72px)' }}
        >
            {contenido}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: burbuja de audio grabado (onda + reproducir)
// =============================================================================

interface BurbujaAudioCoyoProps {
    url: string;
    waveform: number[];
    duracion: number;
}

/** Reproductor simple del audio que el usuario grabó — onda estática (misma data que capturó `useAudioChat`) + play/pausa. Solo vive mientras dure la pestaña (`url` es un blob URL, nunca se sube a ningún lado). */
function BurbujaAudioCoyo({ url, waveform, duracion }: BurbujaAudioCoyoProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [reproduciendo, setReproduciendo] = useState(false);

    function toggle() {
        const audio = audioRef.current;
        if (!audio) return;
        if (reproduciendo) {
            audio.pause();
        } else {
            audio.play().catch(() => undefined);
        }
    }

    return (
        <div className="flex min-w-[160px] items-center gap-2">
            <audio
                ref={audioRef}
                src={url}
                onPlay={() => setReproduciendo(true)}
                onPause={() => setReproduciendo(false)}
                onEnded={() => setReproduciendo(false)}
                className="hidden"
            />
            <button
                type="button"
                data-testid="asistente-audio-play"
                aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
                onClick={toggle}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-800 lg:cursor-pointer"
            >
                {reproduciendo ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-0.5" />}
            </button>
            <div className="flex flex-1 items-center gap-0.5 h-6 overflow-hidden">
                {(waveform.length > 0 ? waveform : Array.from({ length: 24 }, () => 0.3)).map((valor, i) => (
                    <div
                        key={i}
                        className="w-[2.5px] shrink-0 rounded-full bg-slate-400"
                        style={{ height: `${Math.max(15, valor * 100)}%`, minHeight: '3px' }}
                    />
                ))}
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-slate-300">{formatearDuracion(duracion)}</span>
        </div>
    );
}

export default PanelAsistenteCoyo;
