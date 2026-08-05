/**
 * PaginaDinamica.tsx
 * ====================
 * Ficha de detalle de una Dinámica — ruta propia `/marketplace/dinamica/:id`,
 * calcada de la estructura de `PaginaArticuloMarketplace.tsx` (header
 * transparente flotante + galería + info + acciones) pero en una sola
 * columna y con identidad ámbar.
 *
 * Incluye: galería de fotos del premio, descripción, organizador+insignia
 * (con botón "Contactar" vía `useIniciarChatDirectoPersona`, disponible para
 * cualquiera que la vea, no solo el organizador), grid de boletos numerado
 * clickeable, lista pública de participantes (con "Contactar" por fila),
 * modal para reservar boleto, y —solo para el organizador— agregar
 * participante manual y posponer/cancelar la Dinámica.
 *
 * Ubicación: apps/web/src/pages/private/marketplace/PaginaDinamica.tsx
 */

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, Clock, ImageOff, Loader2, Ticket, Users } from 'lucide-react';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useIniciarChatDirectoPersona } from '../../../hooks/useIniciarChatDirectoPersona';
import {
    useDinamica,
    useBoletosDinamica,
    useReservarBoleto,
    useAgregarParticipanteManual,
    useConfirmarPagoBoleto,
    usePosponerDinamica,
    useCancelarDinamica,
} from '../../../hooks/queries/useDinamicas';
import { ModalAdaptativo } from '../../../components/ui/ModalAdaptativo';
import { notificar } from '../../../utils/notificaciones';
import type { BoletoDinamica } from '../../../types/dinamicas';

const GRADIENTE_DINAMICAS = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';

const ETIQUETA_TIPO_PREMIO: Record<string, string> = { fisico: 'Premio físico', efectivo: 'Premio en efectivo' };
const ETIQUETA_METODO: Record<string, string> = {
    tombola: 'Tómbola clásica',
    carta_unica: 'Lotería — carta única',
    tabla_completa: 'Lotería — tabla completa',
};
const ETIQUETA_INSIGNIA: Record<string, string> = { nuevo: 'Organizador nuevo', activo: 'Organizador activo', confiable: 'Organizador confiable' };

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

function formatearCuentaRegresiva(fechaLimite: string | null): string | null {
    if (!fechaLimite) return null;
    const restante = new Date(fechaLimite).getTime() - Date.now();
    if (restante <= 0) return 'Inscripción cerrada';
    const dias = Math.floor(restante / (24 * 60 * 60 * 1000));
    if (dias >= 1) return `Cierra en ${dias} día${dias === 1 ? '' : 's'}`;
    const horas = Math.floor(restante / (60 * 60 * 1000));
    if (horas >= 1) return `Cierra en ${horas}h`;
    const min = Math.floor(restante / (60 * 1000));
    return `Cierra en ${min}min`;
}

export function PaginaDinamica() {
    const { dinamicaId } = useParams<{ dinamicaId: string }>();
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/marketplace?dinamicas=1');
    const usuarioActual = useAuthStore((s) => s.usuario);
    const iniciarChat = useIniciarChatDirectoPersona();

    const { data: dinamica, isLoading, isError } = useDinamica(dinamicaId ?? null);
    const { data: boletos = [] } = useBoletosDinamica(dinamicaId ?? null);

    const reservarBoleto = useReservarBoleto();
    const agregarManual = useAgregarParticipanteManual();
    const confirmarPago = useConfirmarPagoBoleto();
    const posponer = usePosponerDinamica();
    const cancelar = useCancelarDinamica();

    const [boletoSeleccionado, setBoletoSeleccionado] = useState<number | null>(null);
    const [modalManualAbierto, setModalManualAbierto] = useState(false);
    const [modalPosponerAbierto, setModalPosponerAbierto] = useState(false);
    const [formManual, setFormManual] = useState({ numeroBoleto: '', nombreManual: '', telefonoManual: '' });
    const [nuevaFecha, setNuevaFecha] = useState('');

    const esOrganizador = !!usuarioActual && !!dinamica && usuarioActual.id === dinamica.organizadorUsuarioId;

    const mapaBoletos = useMemo(() => {
        const mapa = new Map<number, BoletoDinamica>();
        for (const b of boletos) mapa.set(b.numeroBoleto, b);
        return mapa;
    }, [boletos]);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" strokeWidth={2.5} />
            </div>
        );
    }

    if (isError || !dinamica) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
                <AlertCircle className="h-10 w-10 text-rose-400" strokeWidth={2} />
                <p className="text-slate-600">No se pudo cargar esta Dinámica. Puede que ya no exista.</p>
                <button
                    onClick={handleVolver}
                    className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white lg:hover:bg-amber-700"
                >
                    Volver a Dinámicas
                </button>
            </div>
        );
    }

    const cuentaRegresiva = formatearCuentaRegresiva(dinamica.fechaLimiteInscripcion);
    const aceptaParticipantes = dinamica.estado === 'activa' || dinamica.estado === 'pospuesta';

    function abrirChatCon(usuario: { id: string; nombre: string; apellidos: string; avatarUrl: string | null }) {
        if (usuarioActual?.id === usuario.id) return;
        iniciarChat({
            usuarioId: usuario.id,
            nombre: usuario.nombre,
            apellidos: usuario.apellidos,
            avatarUrl: usuario.avatarUrl,
        });
    }

    async function confirmarReserva() {
        if (!dinamicaId || boletoSeleccionado === null) return;
        const r = await reservarBoleto.mutateAsync({ dinamicaId, numeroBoleto: boletoSeleccionado });
        if (r.success) {
            notificar.exito(`Reservaste el boleto #${boletoSeleccionado}. Coordina el pago por ChatYA.`);
            setBoletoSeleccionado(null);
        } else {
            notificar.error(r.message);
        }
    }

    async function enviarParticipanteManual() {
        if (!dinamicaId) return;
        const numero = Number(formManual.numeroBoleto);
        if (!numero || !formManual.nombreManual.trim() || !formManual.telefonoManual.trim()) {
            notificar.error('Completa número de boleto, nombre y teléfono.');
            return;
        }
        const r = await agregarManual.mutateAsync({
            dinamicaId,
            numeroBoleto: numero,
            nombreManual: formManual.nombreManual.trim(),
            telefonoManual: formManual.telefonoManual.trim(),
        });
        if (r.success) {
            notificar.exito('Participante agregado.');
            setModalManualAbierto(false);
            setFormManual({ numeroBoleto: '', nombreManual: '', telefonoManual: '' });
        } else {
            notificar.error(r.message);
        }
    }

    async function confirmarPagoDe(boletoId: string) {
        if (!dinamicaId) return;
        const r = await confirmarPago.mutateAsync({ dinamicaId, boletoId });
        if (r.success) notificar.exito('Pago confirmado.');
        else notificar.error(r.message);
    }

    async function enviarPosponer() {
        if (!dinamicaId || !nuevaFecha) return;
        const r = await posponer.mutateAsync({ dinamicaId, nuevaFechaLimiteInscripcion: new Date(nuevaFecha).toISOString() });
        if (r.success) {
            notificar.exito('Dinámica pospuesta.');
            setModalPosponerAbierto(false);
        } else {
            notificar.error(r.message);
        }
    }

    async function enviarCancelar() {
        if (!dinamicaId) return;
        if (!window.confirm('¿Cancelar esta Dinámica? Esta acción no se puede deshacer.')) return;
        const r = await cancelar.mutateAsync(dinamicaId);
        if (r.success) notificar.exito('Dinámica cancelada.');
        else notificar.error(r.message);
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-20 px-4 py-3.5" style={{ background: GRADIENTE_DINAMICAS }}>
                <div className="mx-auto flex max-w-2xl items-center gap-3">
                    <button
                        onClick={handleVolver}
                        aria-label="Volver"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/90 hover:bg-white/15 cursor-pointer"
                    >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                    </button>
                    <h1 className="min-w-0 flex-1 truncate text-base font-bold text-white">{dinamica.titulo}</h1>
                </div>
            </div>

            <div className="mx-auto max-w-2xl px-4 pt-4 space-y-5">
                {/* Galería */}
                {dinamica.fotosPremio.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 [&::-webkit-scrollbar]:hidden">
                        {dinamica.fotosPremio.map((f, i) => (
                            <img
                                key={i}
                                src={f.tipo === 'video' ? f.posterUrl : f.url}
                                alt={dinamica.titulo}
                                className="h-56 w-56 shrink-0 rounded-xl object-cover"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-xl bg-slate-200 text-slate-400">
                        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
                    </div>
                )}

                {/* Organizador */}
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                    {dinamica.organizador.avatarUrl ? (
                        <img src={dinamica.organizador.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20 text-sm font-semibold text-amber-700">
                            {obtenerIniciales(dinamica.organizador.nombre, dinamica.organizador.apellidos)}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                            {dinamica.organizador.nombre} {dinamica.organizador.apellidos}
                        </p>
                        <p className="text-xs text-amber-700">{ETIQUETA_INSIGNIA[dinamica.insigniaOrganizador.nivel]}</p>
                    </div>
                    {usuarioActual?.id !== dinamica.organizador.id && (
                        <button
                            onClick={() => abrirChatCon(dinamica.organizador)}
                            className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white lg:hover:bg-amber-700 cursor-pointer"
                        >
                            Contactar
                        </button>
                    )}
                </div>

                {/* Datos clave */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {dinamica.tipoPremio && (
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                            <p className="text-xs text-slate-400">Premio</p>
                            <p className="font-semibold text-slate-800">{ETIQUETA_TIPO_PREMIO[dinamica.tipoPremio]}</p>
                        </div>
                    )}
                    {dinamica.metodoSorteo && (
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                            <p className="text-xs text-slate-400">Método</p>
                            <p className="font-semibold text-slate-800">{ETIQUETA_METODO[dinamica.metodoSorteo]}</p>
                        </div>
                    )}
                    {dinamica.precioBoleto && (
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                            <p className="text-xs text-slate-400">Precio del boleto</p>
                            <p className="font-semibold text-slate-800">${Number(dinamica.precioBoleto).toLocaleString('es-MX')}</p>
                        </div>
                    )}
                    {cuentaRegresiva && (
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                            <p className="flex items-center gap-1 text-xs text-slate-400">
                                <Clock className="h-3 w-3" strokeWidth={2} /> Inscripción
                            </p>
                            <p className="font-semibold text-slate-800">{cuentaRegresiva}</p>
                        </div>
                    )}
                </div>

                {/* Descripción */}
                {dinamica.descripcion && (
                    <div>
                        <h2 className="mb-1.5 text-sm font-bold text-slate-900">Descripción</h2>
                        <p className="whitespace-pre-line text-sm text-slate-600">{dinamica.descripcion}</p>
                    </div>
                )}

                {/* Acciones del organizador */}
                {esOrganizador && (
                    <div className="flex flex-wrap gap-2">
                        {dinamica.estado === 'borrador' && (
                            <button
                                onClick={() => navigate(`/marketplace?dinamicas=1&editarDinamica=${dinamica.id}`, { replace: true })}
                                className="rounded-full border border-amber-300 px-3.5 py-1.5 text-xs font-semibold text-amber-700 lg:hover:bg-amber-50 cursor-pointer"
                            >
                                Editar borrador
                            </button>
                        )}
                        {aceptaParticipantes && (
                            <>
                                <button
                                    onClick={() => setModalManualAbierto(true)}
                                    className="rounded-full border border-amber-300 px-3.5 py-1.5 text-xs font-semibold text-amber-700 lg:hover:bg-amber-50 cursor-pointer"
                                >
                                    Agregar participante manual
                                </button>
                                <button
                                    onClick={() => setModalPosponerAbierto(true)}
                                    className="rounded-full border border-amber-300 px-3.5 py-1.5 text-xs font-semibold text-amber-700 lg:hover:bg-amber-50 cursor-pointer"
                                >
                                    Posponer
                                </button>
                                <button
                                    onClick={enviarCancelar}
                                    className="rounded-full border border-rose-300 px-3.5 py-1.5 text-xs font-semibold text-rose-600 lg:hover:bg-rose-50 cursor-pointer"
                                >
                                    Cancelar Dinámica
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* Grid de boletos */}
                {aceptaParticipantes && dinamica.numeroTotalBoletos && (
                    <div>
                        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                            <Ticket className="h-4 w-4 text-amber-600" strokeWidth={2} />
                            Boletos ({dinamica.boletosPagados}/{dinamica.numeroTotalBoletos} vendidos)
                        </h2>
                        <div className="grid grid-cols-8 gap-1.5 lg:grid-cols-10">
                            {Array.from({ length: dinamica.numeroTotalBoletos }, (_, i) => i + 1).map((numero) => {
                                const boleto = mapaBoletos.get(numero);
                                const estado = boleto?.estado ?? 'disponible';
                                return (
                                    <button
                                        key={numero}
                                        disabled={estado !== 'disponible'}
                                        onClick={() => setBoletoSeleccionado(numero)}
                                        className={`aspect-square rounded-lg text-xs font-semibold transition-colors ${
                                            estado === 'pagado'
                                                ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                                                : estado === 'reservado'
                                                  ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                                                  : 'bg-slate-100 text-slate-600 lg:hover:bg-amber-500 lg:hover:text-white cursor-pointer'
                                        }`}
                                    >
                                        {numero}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-slate-100" /> Disponible</span>
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-100" /> Reservado</span>
                            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-100" /> Pagado</span>
                        </div>
                    </div>
                )}

                {/* Lista de participantes */}
                {boletos.length > 0 && (
                    <div>
                        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900">
                            <Users className="h-4 w-4 text-amber-600" strokeWidth={2} />
                            Participantes
                        </h2>
                        <div className="divide-y divide-slate-100 rounded-lg bg-white shadow-sm">
                            {boletos
                                .filter((b) => b.estado === 'pagado' || b.estado === 'reservado')
                                .map((b) => (
                                    <div key={b.id} className="flex items-center gap-2.5 px-3 py-2.5">
                                        <span className="w-8 shrink-0 text-xs font-semibold text-slate-400">#{b.numeroBoleto}</span>
                                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                            {b.usuario ? `${b.usuario.nombre} ${b.usuario.apellidos}` : `${b.nombreManual} · Sin cuenta AY`}
                                        </span>
                                        <span
                                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                b.estado === 'pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}
                                        >
                                            {b.estado === 'pagado' ? 'Pagado' : 'Reservado'}
                                        </span>
                                        {b.usuario && usuarioActual?.id !== b.usuario.id && (
                                            <button
                                                onClick={() => abrirChatCon(b.usuario!)}
                                                className="shrink-0 rounded-full border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-700 lg:hover:bg-amber-50 cursor-pointer"
                                            >
                                                Contactar
                                            </button>
                                        )}
                                        {esOrganizador && b.estado === 'reservado' && (
                                            <button
                                                onClick={() => confirmarPagoDe(b.id)}
                                                className="shrink-0 rounded-full bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white lg:hover:bg-amber-700 cursor-pointer"
                                            >
                                                Confirmar pago
                                            </button>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal: reservar boleto */}
            <ModalAdaptativo
                abierto={boletoSeleccionado !== null}
                onCerrar={() => setBoletoSeleccionado(null)}
                titulo="Reservar boleto"
                ancho="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Vas a reservar el boleto <strong>#{boletoSeleccionado}</strong>
                        {dinamica.precioBoleto && <> por <strong>${Number(dinamica.precioBoleto).toLocaleString('es-MX')}</strong></>}.
                        El pago se coordina directamente con el organizador por ChatYA — la app no cobra ni entrega nada.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setBoletoSeleccionado(null)}
                            className="flex-1 rounded-full border border-slate-300 py-2 text-sm font-semibold text-slate-600 cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmarReserva}
                            disabled={reservarBoleto.isPending}
                            className="flex-1 rounded-full bg-amber-600 py-2 text-sm font-semibold text-white lg:hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
                        >
                            {reservarBoleto.isPending ? 'Reservando...' : 'Confirmar reserva'}
                        </button>
                    </div>
                </div>
            </ModalAdaptativo>

            {/* Modal: agregar participante manual */}
            <ModalAdaptativo
                abierto={modalManualAbierto}
                onCerrar={() => setModalManualAbierto(false)}
                titulo="Agregar participante sin cuenta AY"
                ancho="sm"
            >
                <div className="space-y-3">
                    <input
                        type="number"
                        placeholder="Número de boleto"
                        value={formManual.numeroBoleto}
                        onChange={(e) => setFormManual((f) => ({ ...f, numeroBoleto: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Nombre"
                        value={formManual.nombreManual}
                        onChange={(e) => setFormManual((f) => ({ ...f, nombreManual: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <input
                        type="tel"
                        placeholder="Teléfono"
                        value={formManual.telefonoManual}
                        onChange={(e) => setFormManual((f) => ({ ...f, telefonoManual: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                        onClick={enviarParticipanteManual}
                        disabled={agregarManual.isPending}
                        className="w-full rounded-full bg-amber-600 py-2 text-sm font-semibold text-white lg:hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
                    >
                        {agregarManual.isPending ? 'Agregando...' : 'Agregar participante'}
                    </button>
                </div>
            </ModalAdaptativo>

            {/* Modal: posponer */}
            <ModalAdaptativo
                abierto={modalPosponerAbierto}
                onCerrar={() => setModalPosponerAbierto(false)}
                titulo="Posponer Dinámica"
                ancho="sm"
            >
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">Elige la nueva fecha y hora límite de inscripción.</p>
                    <input
                        type="datetime-local"
                        value={nuevaFecha}
                        onChange={(e) => setNuevaFecha(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                        onClick={enviarPosponer}
                        disabled={posponer.isPending || !nuevaFecha}
                        className="w-full rounded-full bg-amber-600 py-2 text-sm font-semibold text-white lg:hover:bg-amber-700 disabled:opacity-60 cursor-pointer"
                    >
                        {posponer.isPending ? 'Posponiendo...' : 'Confirmar nueva fecha'}
                    </button>
                </div>
            </ModalAdaptativo>
        </div>
    );
}

export default PaginaDinamica;
