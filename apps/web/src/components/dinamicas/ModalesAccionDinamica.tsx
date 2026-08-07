/**
 * ModalesAccionDinamica.tsx
 * ==========================
 * Los 3 modales de acción del organizador sobre una Dinámica — Agregar
 * participante manual, Posponer, Cancelar — UNIFICADOS entre la ficha de
 * detalle (`PaginaDinamica.tsx`) y "Mis Publicaciones"
 * (`PaginaMisPublicaciones.tsx`), que antes tenían cada uno su propia copia
 * con estilos distintos (uno usaba incluso `window.confirm()` nativo).
 *
 * Mismo patrón visual que `ModalConfirmarCanje.tsx` (CardYA): header con
 * gradiente oscuro + icono en círculo + título/subtítulo, contenido con
 * card de resumen de la Dinámica, aviso contextual con icono, y footer de
 * 2 botones (outline + gradiente color-coded por acción).
 *
 * Cada modal maneja su propio estado de formulario internamente — el
 * caller solo controla `abierto`/`onCerrar`/`pendiente` y qué hacer con los
 * datos ya validados en `onConfirmar` (llamar la mutation, notificar,
 * cerrar el modal si tuvo éxito). Así ambas páginas reusan exactamente el
 * mismo componente sin duplicar el JSX de cada modal.
 *
 * Ubicación: apps/web/src/components/dinamicas/ModalesAccionDinamica.tsx
 */

import { useEffect, useRef, useState } from 'react';
import {
    Ban,
    CalendarClock,
    Image as ImageIcon,
    Loader2,
    Pencil,
    Play,
    Ticket,
    Trash2,
    User,
    UserPlus,
} from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Input } from '../ui/Input';
import { InputTelefono, normalizarTelefono } from '../ui/InputTelefono';
import { ModalImagenes } from '../ui/ModalImagenes';
import {
    GRADIENTES_ACCION,
    HeaderAccionGradiente,
    ResumenAccionModal,
    AvisoContextualModal,
    BotonesAccionModal,
} from '../ui/ModalAccionGradiente';
import { useFotosUploaderDinamicas, MAX_FOTOS_COMPOSER_DINAMICA } from '../../hooks/useFotosUploaderDinamicas';
import { TITULO_MIN, TITULO_MAX, DESC_MIN, DESC_MAX } from '../../hooks/useComposerDinamicas';
import { fuenteThumbnail } from '../../utils/marketplace';
import type { ArchivoFoto } from '../../types/archivoFoto';

const GRADIENTE_AZUL = GRADIENTES_ACCION.azul;
const GRADIENTE_AMBER = GRADIENTES_ACCION.amber;
const GRADIENTE_ROJO = GRADIENTES_ACCION.rojo;

/** Shape mínimo que necesitan estos modales — `DinamicaFeedItem` y
 *  `DinamicaDetallePublico` lo satisfacen ambos sin acoplarse a ninguno. */
interface DinamicaParaModal {
    id: string;
    titulo: string;
}

function ResumenDinamica({ dinamica }: { dinamica: DinamicaParaModal }) {
    return <ResumenAccionModal icono={Ticket} texto={dinamica.titulo} />;
}

// =============================================================================
// MODAL 1 — AGREGAR PARTICIPANTE MANUAL (sin cuenta AY)
// =============================================================================

interface ModalAgregarParticipanteDinamicaProps {
    abierto: boolean;
    dinamica: DinamicaParaModal | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: (datos: { numeroBoleto: number; nombreManual: string; telefonoManual: string }) => void;
}

export function ModalAgregarParticipanteDinamica({
    abierto,
    dinamica,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalAgregarParticipanteDinamicaProps) {
    const [numeroBoleto, setNumeroBoleto] = useState('');
    const [nombreManual, setNombreManual] = useState('');
    // "+52" por defecto — mismo formato de guardado que `InputTelefono` usa
    // en el resto de la app ("+52 6381234658"), no solo los 10 dígitos.
    const [telefonoManual, setTelefonoManual] = useState('+52');

    // Limpiar el form cada vez que el modal se ABRE (no al fallar un envío,
    // así el usuario no pierde lo que ya escribió si el backend rechaza).
    useEffect(() => {
        if (abierto) {
            setNumeroBoleto('');
            setNombreManual('');
            setTelefonoManual('+52');
        }
    }, [abierto]);

    if (!dinamica) return null;

    const digitosTelefono = normalizarTelefono(telefonoManual).numero;
    const telefonoCompleto = digitosTelefono.length === 10;

    const handleConfirmar = () => {
        const numero = Number(numeroBoleto);
        if (!numero || !nombreManual.trim() || !telefonoCompleto) return;
        onConfirmar({ numeroBoleto: numero, nombreManual: nombreManual.trim(), telefonoManual: telefonoManual.trim() });
    };

    const formIncompleto = !Number(numeroBoleto) || !nombreManual.trim() || !telefonoCompleto;

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle="rgba(255,255,255,0.4)"
            headerOscuro
            className="max-w-xs lg:max-w-sm 2xl:max-w-md"
        >
            <div className="flex max-h-[85vh] flex-col lg:max-h-[75vh] 2xl:max-h-[75vh]">
                <HeaderAccionGradiente
                    icono={UserPlus}
                    titulo="Agregar participante"
                    subtitulo="Sin cuenta AnunciaYA"
                    gradiente={GRADIENTE_AZUL}
                />
                <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                    <ResumenDinamica dinamica={dinamica} />

                    <div className="mt-4 space-y-3 lg:mt-3 lg:space-y-2.5 2xl:mt-4 2xl:space-y-3">
                        <Input
                            label="Número de boleto"
                            type="number"
                            icono={<Ticket className="h-4 w-4" />}
                            value={numeroBoleto}
                            onChange={(e) => setNumeroBoleto(e.target.value)}
                            placeholder="Ej. 42"
                            className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <Input
                            label="Nombre completo"
                            type="text"
                            icono={<User className="h-4 w-4" />}
                            value={nombreManual}
                            onChange={(e) => setNombreManual(e.target.value)}
                            placeholder="Nombre del participante"
                        />
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-600 lg:text-xs 2xl:text-sm">
                                Teléfono
                            </label>
                            <InputTelefono
                                prefijo="agregar-participante"
                                value={telefonoManual}
                                onChange={setTelefonoManual}
                                formatoVisual
                                claseAlto="h-11 lg:h-10 2xl:h-11"
                                claseTexto="text-base lg:text-sm 2xl:text-base"
                            />
                        </div>
                    </div>

                    <AvisoContextualModal tono="azul">
                        El boleto queda pagado de inmediato — úsalo solo si ya cobraste por fuera de la app.
                    </AvisoContextualModal>

                    <BotonesAccionModal
                        onCerrar={onCerrar}
                        onConfirmar={handleConfirmar}
                        pendiente={pendiente}
                        deshabilitado={formIncompleto}
                        textoConfirmar="Agregar"
                        textoPendiente="Agregando…"
                        colorBase="#2563eb"
                        colorOscuro="#1d4ed8"
                    />
                </div>
            </div>
        </ModalAdaptativo>
    );
}

// =============================================================================
// MODAL 2 — POSPONER
// =============================================================================

interface ModalPosponerDinamicaProps {
    abierto: boolean;
    dinamica: DinamicaParaModal | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: (nuevaFechaLimiteInscripcionISO: string) => void;
}

export function ModalPosponerDinamica({
    abierto,
    dinamica,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalPosponerDinamicaProps) {
    const [fecha, setFecha] = useState('');

    useEffect(() => {
        if (abierto) setFecha('');
    }, [abierto]);

    if (!dinamica) return null;

    const handleConfirmar = () => {
        if (!fecha) return;
        onConfirmar(new Date(fecha).toISOString());
    };

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle="rgba(255,255,255,0.4)"
            headerOscuro
            className="max-w-xs lg:max-w-sm 2xl:max-w-md"
        >
            <div className="flex max-h-[85vh] flex-col lg:max-h-[75vh] 2xl:max-h-[75vh]">
                <HeaderAccionGradiente
                    icono={CalendarClock}
                    titulo="Posponer Dinámica"
                    subtitulo="Nueva fecha límite de inscripción"
                    gradiente={GRADIENTE_AMBER}
                />
                <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                    <ResumenDinamica dinamica={dinamica} />

                    <div className="mt-4 lg:mt-3 2xl:mt-4">
                        <Input
                            label="Nueva fecha y hora límite"
                            type="datetime-local"
                            icono={<CalendarClock className="h-4 w-4" />}
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                        />
                    </div>

                    <AvisoContextualModal tono="amber">
                        Avisaremos a quienes ya tenían boleto reservado o pagado.
                    </AvisoContextualModal>

                    <BotonesAccionModal
                        onCerrar={onCerrar}
                        onConfirmar={handleConfirmar}
                        pendiente={pendiente}
                        deshabilitado={!fecha}
                        textoConfirmar="Confirmar"
                        textoPendiente="Posponiendo…"
                        colorBase="#f59e0b"
                        colorOscuro="#d97706"
                    />
                </div>
            </div>
        </ModalAdaptativo>
    );
}

// =============================================================================
// MODAL 3 — CANCELAR
// =============================================================================

interface ModalCancelarDinamicaProps {
    abierto: boolean;
    dinamica: DinamicaParaModal | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: () => void;
}

export function ModalCancelarDinamica({
    abierto,
    dinamica,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalCancelarDinamicaProps) {
    if (!dinamica) return null;

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle="rgba(255,255,255,0.4)"
            headerOscuro
            className="max-w-xs lg:max-w-sm 2xl:max-w-md"
        >
            <div className="flex max-h-[85vh] flex-col lg:max-h-[75vh] 2xl:max-h-[75vh]">
                <HeaderAccionGradiente
                    icono={Ban}
                    titulo="Cancelar Dinámica"
                    subtitulo="Esta acción no se puede deshacer"
                    gradiente={GRADIENTE_ROJO}
                />
                <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                    <ResumenDinamica dinamica={dinamica} />

                    <AvisoContextualModal tono="rojo">
                        Se avisará a quienes ya tenían boleto reservado o pagado. Una vez cancelada, no podrás
                        reactivarla.
                    </AvisoContextualModal>

                    <BotonesAccionModal
                        onCerrar={onCerrar}
                        onConfirmar={onConfirmar}
                        pendiente={pendiente}
                        textoCerrar="Cerrar"
                        textoConfirmar="Sí, cancelar"
                        textoPendiente="Cancelando…"
                        colorBase="#dc2626"
                        colorOscuro="#b91c1c"
                    />
                </div>
            </div>
        </ModalAdaptativo>
    );
}

// =============================================================================
// MODAL 4 — EDITAR (título, descripción y fotos — solo activa/pospuesta)
// =============================================================================

/** Shape mínimo para editar — a diferencia de `DinamicaParaModal`, necesita
 *  también los campos que se pueden editar para hidratar el formulario. */
export interface DinamicaParaEditar {
    id: string;
    titulo: string;
    descripcion: string | null;
    fotosPremio: ArchivoFoto[];
}

interface ModalEditarDinamicaProps {
    abierto: boolean;
    dinamica: DinamicaParaEditar | null;
    pendiente: boolean;
    onCerrar: () => void;
    onConfirmar: (datos: { titulo: string; descripcion: string; fotosPremio: ArchivoFoto[] }) => void;
}

export function ModalEditarDinamica({
    abierto,
    dinamica,
    pendiente,
    onCerrar,
    onConfirmar,
}: ModalEditarDinamicaProps) {
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fotosPremio, setFotosPremio] = useState<ArchivoFoto[]>([]);
    const urlsSubidasEnSesion = useRef<Set<string>>(new Set());
    // Ver foto completa — mismo mecanismo que ComposerMarketplace/ComposerServicios.
    const [indiceImagenAbierta, setIndiceImagenAbierta] = useState<number | null>(null);

    // Hidratar cada vez que el modal se ABRE con los datos actuales de la
    // Dinámica — mismo patrón que los otros 3 modales de esta pantalla.
    useEffect(() => {
        if (abierto && dinamica) {
            setTitulo(dinamica.titulo);
            setDescripcion(dinamica.descripcion ?? '');
            setFotosPremio(dinamica.fotosPremio);
        }
    }, [abierto, dinamica]);

    const fotosUploader = useFotosUploaderDinamicas({
        fotos: fotosPremio,
        onCambioFotos: setFotosPremio,
        urlsSubidasEnSesion,
    });

    if (!dinamica) return null;

    const tituloLen = titulo.trim().length;
    const descLen = descripcion.trim().length;
    const formValido =
        tituloLen >= TITULO_MIN &&
        tituloLen <= TITULO_MAX &&
        descLen >= DESC_MIN &&
        descLen <= DESC_MAX &&
        fotosPremio.length > 0;

    const handleConfirmar = () => {
        if (!formValido) return;
        onConfirmar({ titulo: titulo.trim(), descripcion: descripcion.trim(), fotosPremio });
    };

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            ancho="lg"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="xl"
            colorHandle="rgba(255,255,255,0.4)"
            headerOscuro
            className="max-w-sm lg:max-w-lg 2xl:max-w-xl"
        >
            <div className="flex max-h-[90vh] flex-col lg:max-h-[85vh] 2xl:max-h-[85vh]">
                <HeaderAccionGradiente
                    icono={Pencil}
                    titulo="Editar Dinámica"
                    subtitulo="Título, descripción y fotos"
                    gradiente={GRADIENTE_AMBER}
                />
                <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                    <div>
                        <Input
                            label="Título"
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value.slice(0, TITULO_MAX))}
                            placeholder="Ej: Rifa de una pantalla de 55 pulgadas"
                        />
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                            {tituloLen}/{TITULO_MAX} · mínimo {TITULO_MIN} caracteres
                        </p>
                    </div>

                    <div className="mt-3 lg:mt-2.5 2xl:mt-3">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-600 lg:text-xs 2xl:text-sm">
                            Descripción
                        </label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value.slice(0, DESC_MAX))}
                            placeholder="Describe el premio, cómo se juega y cómo se paga el boleto..."
                            rows={4}
                            className="w-full resize-none rounded-xl border-2 border-slate-300 bg-slate-100 px-4 py-2.5 text-base font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-slate-500 focus:bg-white lg:text-sm 2xl:text-base"
                        />
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                            {descLen}/{DESC_MAX} · mínimo {DESC_MIN} caracteres
                        </p>
                    </div>

                    <div className="mt-3 lg:mt-2.5 2xl:mt-3">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-600 lg:text-xs 2xl:text-sm">
                            Fotos del premio
                        </label>
                        {(fotosPremio.length > 0 || fotosUploader.previews.length > 0) && (
                            <div className="mb-2.5 grid grid-cols-3 gap-2">
                                {fotosPremio.map((foto, i) => (
                                    <div key={foto.url} className="relative aspect-square overflow-hidden rounded-lg group">
                                        <img
                                            src={fuenteThumbnail(foto)}
                                            alt=""
                                            onClick={() => setIndiceImagenAbierta(i)}
                                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110 lg:cursor-pointer"
                                        />
                                        {foto.tipo === 'video' && (
                                            <Play
                                                className="pointer-events-none absolute inset-0 m-auto h-6 w-6 text-white drop-shadow-md"
                                                fill="white"
                                            />
                                        )}
                                        <div
                                            className="absolute bottom-0 inset-x-0 flex items-center justify-end py-1.5 px-1.5"
                                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}
                                        >
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); fotosUploader.eliminar(i); }}
                                                aria-label="Quitar foto"
                                                className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 hover:bg-red-600 lg:cursor-pointer active:scale-95 transition-colors"
                                            >
                                                <Trash2 className="h-4.5 w-4.5 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {fotosUploader.previews.map((p) => (
                                    <div key={p.tempId} className="relative aspect-square overflow-hidden rounded-lg">
                                        {p.tipo === 'video' ? (
                                            <video src={p.url} muted playsInline className="h-full w-full object-cover opacity-60" />
                                        ) : (
                                            <img src={p.url} alt="" className="h-full w-full object-cover opacity-60" />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <input {...fotosUploader.inputGaleriaProps} />
                        <button
                            type="button"
                            onClick={fotosUploader.abrirGaleria}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            <ImageIcon className="h-4 w-4" strokeWidth={2} />
                            Agregar foto
                            {fotosPremio.length > 0 && (
                                <span className="tabular-nums text-slate-500">
                                    ({fotosPremio.length}/{MAX_FOTOS_COMPOSER_DINAMICA})
                                </span>
                            )}
                        </button>
                    </div>

                    <AvisoContextualModal tono="amber">
                        Boletos, precio, fecha límite y reglas del sorteo ya no se pueden cambiar una vez publicada —
                        solo título, descripción y fotos.
                    </AvisoContextualModal>

                    <BotonesAccionModal
                        onCerrar={onCerrar}
                        onConfirmar={handleConfirmar}
                        pendiente={pendiente}
                        deshabilitado={!formValido}
                        textoConfirmar="Guardar cambios"
                        textoPendiente="Guardando…"
                        colorBase="#f59e0b"
                        colorOscuro="#d97706"
                    />
                </div>
            </div>

            <ModalImagenes
                images={fotosPremio}
                initialIndex={indiceImagenAbierta ?? 0}
                isOpen={indiceImagenAbierta !== null}
                onClose={() => setIndiceImagenAbierta(null)}
            />
        </ModalAdaptativo>
    );
}
