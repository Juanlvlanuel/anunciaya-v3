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

import { useEffect, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Ban,
    CalendarClock,
    Loader2,
    Ticket,
    User,
    UserPlus,
    type LucideIcon,
} from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { Input } from '../ui/Input';
import { InputTelefono, normalizarTelefono } from '../ui/InputTelefono';

const GRADIENTE_AZUL = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
const GRADIENTE_AMBER = 'linear-gradient(135deg, #f59e0b, #d97706)';
const GRADIENTE_ROJO = 'linear-gradient(135deg, #dc2626, #b91c1c)';

/** Shape mínimo que necesitan estos modales — `DinamicaFeedItem` y
 *  `DinamicaDetallePublico` lo satisfacen ambos sin acoplarse a ninguno. */
interface DinamicaParaModal {
    id: string;
    titulo: string;
}

// =============================================================================
// SUBCOMPONENTES COMPARTIDOS
// =============================================================================

interface HeaderAccionDinamicaProps {
    icono: LucideIcon;
    titulo: string;
    subtitulo: string;
    gradiente: string;
}

function HeaderAccionDinamica({ icono: Icono, titulo, subtitulo, gradiente }: HeaderAccionDinamicaProps) {
    return (
        <div
            className="relative shrink-0 overflow-hidden px-5 pb-4 pt-8 lg:rounded-t-2xl lg:px-4 lg:py-4 2xl:rounded-t-2xl 2xl:px-5 2xl:py-5"
            style={{ background: gradiente }}
        >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 h-14 w-14 rounded-full bg-white/10" />
            <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/30 bg-white/15 lg:h-9 lg:w-9 2xl:h-11 2xl:w-11">
                    <Icono className="h-5 w-5 text-white lg:h-4 lg:w-4 2xl:h-5 2xl:w-5" strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-white lg:text-lg 2xl:text-xl">{titulo}</h2>
                    <p className="truncate text-sm font-bold tracking-wide text-white/70 lg:text-[11px] 2xl:text-sm">
                        {subtitulo}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ResumenDinamica({ dinamica }: { dinamica: DinamicaParaModal }) {
    return (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5">
            <Ticket className="h-4 w-4 shrink-0 text-slate-600" strokeWidth={2.5} />
            <span className="truncate text-sm font-bold text-slate-800">{dinamica.titulo}</span>
        </div>
    );
}

interface AvisoContextualProps {
    icono?: LucideIcon;
    tono: 'azul' | 'amber' | 'rojo';
    children: React.ReactNode;
}

const TONOS_AVISO: Record<AvisoContextualProps['tono'], { bg: string; border: string; texto: string; icono: string }> = {
    azul: { bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#bfdbfe', texto: '#1e40af', icono: '#2563eb' },
    amber: { bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '#fde68a', texto: '#92400e', icono: '#d97706' },
    rojo: { bg: 'linear-gradient(135deg, #fef2f2, #fee2e2)', border: '#fecaca', texto: '#991b1b', icono: '#dc2626' },
};

function AvisoContextual({ icono: Icono = AlertTriangle, tono, children }: AvisoContextualProps) {
    const t = TONOS_AVISO[tono];
    return (
        <div
            className="mt-4 flex items-start gap-2 rounded-lg p-3 lg:mt-3 lg:p-2.5 2xl:mt-4 2xl:p-3"
            style={{ background: t.bg, border: `2px solid ${t.border}` }}
        >
            <Icono className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} style={{ color: t.icono }} />
            <p className="text-sm font-semibold leading-relaxed lg:text-[12px] 2xl:text-sm" style={{ color: t.texto }}>
                {children}
            </p>
        </div>
    );
}

interface BotonesModalProps {
    onCerrar: () => void;
    onConfirmar: () => void;
    pendiente: boolean;
    deshabilitado?: boolean;
    textoCerrar?: string;
    textoConfirmar: string;
    textoPendiente: string;
    colorBase: string;
    colorOscuro: string;
}

function BotonesModal({
    onCerrar,
    onConfirmar,
    pendiente,
    deshabilitado,
    textoCerrar = 'Cancelar',
    textoConfirmar,
    textoPendiente,
    colorBase,
    colorOscuro,
}: BotonesModalProps) {
    return (
        <div className="mt-5 flex gap-3 lg:mt-4 lg:gap-2.5 2xl:mt-5 2xl:gap-3">
            <button
                type="button"
                onClick={onCerrar}
                disabled={pendiente}
                className="flex-1 rounded-xl border-2 border-slate-300 py-2.5 text-sm font-bold text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50 lg:cursor-pointer lg:rounded-lg lg:py-2 lg:hover:bg-slate-200 2xl:rounded-xl 2xl:py-2.5"
            >
                {textoCerrar}
            </button>
            <button
                type="button"
                onClick={onConfirmar}
                disabled={pendiente || deshabilitado}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 lg:rounded-lg lg:py-2 2xl:rounded-xl 2xl:py-2.5"
                style={{
                    background: pendiente
                        ? 'linear-gradient(135deg, #64748b, #475569)'
                        : `linear-gradient(135deg, ${colorBase}, ${colorOscuro})`,
                    boxShadow: pendiente ? 'none' : `0 4px 12px ${colorBase}4D`,
                }}
            >
                {pendiente ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {textoPendiente}
                    </>
                ) : (
                    <>
                        {textoConfirmar}
                        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </>
                )}
            </button>
        </div>
    );
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
                <HeaderAccionDinamica
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

                    <AvisoContextual tono="azul">
                        El boleto queda pagado de inmediato — úsalo solo si ya cobraste por fuera de la app.
                    </AvisoContextual>

                    <BotonesModal
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
                <HeaderAccionDinamica
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

                    <AvisoContextual tono="amber">
                        Avisaremos a quienes ya tenían boleto reservado o pagado.
                    </AvisoContextual>

                    <BotonesModal
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
                <HeaderAccionDinamica
                    icono={Ban}
                    titulo="Cancelar Dinámica"
                    subtitulo="Esta acción no se puede deshacer"
                    gradiente={GRADIENTE_ROJO}
                />
                <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">
                    <ResumenDinamica dinamica={dinamica} />

                    <AvisoContextual tono="rojo">
                        Se avisará a quienes ya tenían boleto reservado o pagado. Una vez cancelada, no podrás
                        reactivarla.
                    </AvisoContextual>

                    <BotonesModal
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
