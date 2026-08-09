/**
 * PaginaSalaDinamicaPublica.tsx
 * ===============================
 * Versión PÚBLICA de la sala en vivo (Fase 4.1), accesible sin sesión —
 * mismo criterio que `PaginaDinamicaPublica.tsx`: `HeaderPublico`/
 * `FooterPublico`, sin auth. Los visitantes anónimos se unen en modo
 * lectura (`useSalaDinamica` decide `conectarSocket` vs
 * `conectarSocketInvitado` según haya sesión) — `ChatSala` ya deshabilita
 * el input y explica "inicia sesión" cuando no hay usuario.
 *
 * La sala NO es pública hasta que el organizador la programa
 * (`dinamica.salaProgramadaPara`) — el link se puede compartir de
 * antemano, pero cualquier visitante que no sea el organizador ve un
 * placeholder ("todavía no disponible") en vez del chat/contenido
 * (`sePuedeVerSala`, calculado con el dato de `useDinamica`, sin depender
 * del socket).
 *
 * Ruta: `/p/dinamica/:dinamicaId/sala`
 *
 * Ubicación: apps/web/src/pages/public/PaginaSalaDinamicaPublica.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CalendarClock, Dices, Hand, Pause, Play, Radio, SkipForward, Zap } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { hoyISO, combinarFechaHora, opcionesHoraDisponibles } from '../../utils/fechaHoraLocal';
import { useSalaDinamica } from '../../hooks/useSalaDinamica';
import { useDinamica, useBoletosDinamica, useEstadoSalaDinamica, useActivarSalaDinamica, useEditarBorradorDinamica } from '../../hooks/queries/useDinamicas';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import { CronometroSala } from '../../components/dinamicas/sala/CronometroSala';
import { TombolaSorteo } from '../../components/dinamicas/sala/TombolaSorteo';
import { ChatSala } from '../../components/dinamicas/sala/ChatSala';
import { PanelModeracionSala } from '../../components/dinamicas/sala/PanelModeracionSala';
import { GanadoresSala } from '../../components/dinamicas/sala/GanadoresSala';
import { HeaderPublico } from '../../components/public/HeaderPublico';
import { FooterPublico } from '../../components/public/FooterPublico';
import { Spinner } from '../../components/ui/Spinner';
import type { AccionModeracionSala } from '../../types/dinamicas';

// El DatePicker resalta en azul por default al abrirse (border+ring) — acá
// lo forzamos a slate (mismo mecanismo que ESTILO_TRIGGER_AMBER del
// composer: overrides con `!` sobre el botón interno).
const ESTILO_TRIGGER_SLATE = '[&>button]:!border-slate-500 [&>button]:!ring-slate-300';

export function PaginaSalaDinamicaPublica() {
    const { dinamicaId } = useParams<{ dinamicaId: string }>();
    const navigate = useNavigate();
    const usuarioActual = useAuthStore((s) => s.usuario);

    const { data: dinamica, isLoading, isError } = useDinamica(dinamicaId ?? null);
    const { data: boletos = [] } = useBoletosDinamica(dinamicaId ?? null);
    // El organizador se resuelve con el dato YA cargado por HTTP — la sala
    // NO es pública hasta que él la programa, así que ni siquiera vale la
    // pena unirse (ni pedir el chat) para cualquier otro visitante hasta
    // entonces.
    const esOrganizadorSync = !!usuarioActual && !!dinamica && usuarioActual.id === dinamica.organizadorUsuarioId;
    const sePuedeVerSala = esOrganizadorSync || !!dinamica?.salaProgramadaPara;
    const sala = useSalaDinamica(sePuedeVerSala ? dinamicaId : undefined);
    const { data: estadoHttp } = useEstadoSalaDinamica(sePuedeVerSala ? dinamicaId : undefined);
    const activarSala = useActivarSalaDinamica();
    const editarBorrador = useEditarBorradorDinamica();

    const [fechaProgramar, setFechaProgramar] = useState('');
    const [horaProgramar, setHoraProgramar] = useState('18:00');
    const [silenciados, setSilenciados] = useState<Set<string>>(new Set());
    const [expulsados, setExpulsados] = useState<Set<string>>(new Set());
    const [horaLlego, setHoraLlego] = useState(false);
    // Rifas publicadas ANTES de que existiera esta fase se quedaron con
    // `numeroIntentosSorteo` en NULL — sin la sección "Boletos" del
    // composer disponible (ya está publicada), el único lugar donde se
    // puede completar ese dato una sola vez es aquí mismo.
    const [kSorteo, setKSorteo] = useState('1');
    const [nSorteo, setNSorteo] = useState('');

    // Si la fecha elegida es HOY y la hora seleccionada ya quedó en el
    // pasado (o cambió de un día futuro a hoy), la reemplaza por la
    // primera hora disponible — evita mandar una combinación que el
    // backend va a rechazar por no ser estrictamente futura.
    useEffect(() => {
        const disponibles = opcionesHoraDisponibles(fechaProgramar);
        if (disponibles.length > 0 && !disponibles.some((h) => h.valor === horaProgramar)) {
            setHoraProgramar(disponibles[0].valor);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fechaProgramar]);

    const participantesConCuenta = (() => {
        const vistos = new Set<string>();
        const lista: { usuarioId: string; nombre: string; apellidos: string }[] = [];
        for (const b of boletos) {
            if ((b.estado === 'pagado' || b.estado === 'reservado') && b.usuario && !vistos.has(b.usuario.id)) {
                vistos.add(b.usuario.id);
                lista.push({ usuarioId: b.usuario.id, nombre: b.usuario.nombre, apellidos: b.usuario.apellidos });
            }
        }
        return lista;
    })();

    async function programarSala() {
        if (!fechaProgramar || !dinamicaId) return;
        const iso = combinarFechaHora(fechaProgramar, horaProgramar);
        const r = await activarSala.mutateAsync({ dinamicaId, salaProgramadaPara: iso });
        if (r.success) notificar.exito('Sala programada.');
        else notificar.error(r.message);
    }

    async function guardarConfigSorteo() {
        if (!dinamicaId || !nSorteo) return;
        const r = await editarBorrador.mutateAsync({
            dinamicaId,
            payload: { numeroLugaresGanadores: Number(kSorteo) || 1, numeroIntentosSorteo: Number(nSorteo) },
        });
        if (r.success) notificar.exito('Sorteo configurado.');
        else notificar.error(r.message);
    }

    function moderar(usuarioId: string, accion: AccionModeracionSala) {
        sala.moderar(usuarioId, accion);
        if (accion === 'silenciar') setSilenciados((s) => new Set(s).add(usuarioId));
        if (accion === 'quitar-silencio') setSilenciados((s) => { const n = new Set(s); n.delete(usuarioId); return n; });
        if (accion === 'expulsar') setExpulsados((s) => new Set(s).add(usuarioId));
        if (accion === 'quitar-expulsion') setExpulsados((s) => { const n = new Set(s); n.delete(usuarioId); return n; });
        if (accion === 'bloquear') notificar.exito('Usuario bloqueado permanentemente.');
    }

    if (isLoading) {
        return (
            <div className="bg-app-degradado flex min-h-screen items-center justify-center">
                <Spinner tamanio="lg" />
            </div>
        );
    }

    if (isError || !dinamica) {
        return (
            <div className="bg-app-degradado flex min-h-screen items-center justify-center px-6">
                <div className="flex max-w-md flex-col items-center text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                        <AlertCircle className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                    </div>
                    <h2 className="mb-2 text-lg font-semibold text-slate-900">Sala no encontrada</h2>
                    <p className="mb-5 text-sm text-slate-600">Esta Dinámica no existe o ya fue eliminada.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-2 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md lg:cursor-pointer"
                    >
                        Conocer AnunciaYA
                    </button>
                </div>
            </div>
        );
    }

    // `sala.esOrganizador` viene del socket (llega tras el viaje redondo de
    // "unirse") — mientras tanto, usamos el dato ya disponible por HTTP
    // (`useDinamica`) para el caso raro de que el propio organizador abra
    // su link público.
    const esOrganizador = sala.esOrganizador || esOrganizadorSync;
    // Mismo criterio: mientras no llega el snapshot del socket, se usa el
    // valor ya cargado por HTTP (`dinamica`) para `estado`/`salaProgramadaPara`.
    const estado = sala.estado ?? dinamica.estado;
    const salaProgramadaPara = sala.salaProgramadaPara ?? dinamica.salaProgramadaPara;
    // `sala.intentosRevelados` solo tiene datos si viviste el sorteo en vivo
    // (evento por evento, vía socket). Si recargas la página después de que
    // ya cerró, esa lista llega vacía — se usa el historial recomputado por
    // el backend desde la semilla pública como evidencia del sorteo completo.
    const intentosParaTombola = sala.intentosRevelados.length > 0 ? sala.intentosRevelados : (estadoHttp?.historialCompleto ?? []);

    // El chat cierra junto con la sala — el backend ya lo rechaza
    // (`enviarMensajeSala`) si `estado === 'cerrada'`; esto solo refleja esa
    // misma regla en el input para no dejarlo habilitado de mentiras.
    const puedeEscribir =
        !!usuarioActual && !sala.miModeracion.silenciado && !sala.miModeracion.expulsado && !sala.expulsadoAhora && estado !== 'cerrada';
    const motivoBloqueo = sala.expulsadoAhora || sala.miModeracion.expulsado
        ? 'Fuiste expulsado de esta sala'
        : sala.miModeracion.silenciado
            ? 'El organizador te silenció en esta sala'
            : estado === 'cerrada'
                ? 'Esta sala ya cerró'
                : undefined;

    const yaLlegoLaHora = salaProgramadaPara ? new Date(salaProgramadaPara).getTime() <= Date.now() : false;

    // Premio para la sala de espera del cronómetro — mismo criterio que
    // CardDinamica.tsx (portada = 1ra imagen, o poster si es video).
    const portadaSala = dinamica.fotosPremio.find((f) => f.tipo === 'imagen') ?? dinamica.fotosPremio[0];
    const portadaSalaUrl = portadaSala?.tipo === 'video' ? portadaSala.posterUrl : portadaSala?.url;

    return (
        <div data-testid="pagina-sala-dinamica-publica" className="bg-app-degradado flex h-screen flex-col">
            <HeaderPublico />

            <main className="flex-1 overflow-y-auto">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="px-3 pt-3 pb-5 lg:px-0 lg:pb-8 lg:pt-4">
                        <div className="mb-3 flex items-center gap-1.5 lg:mb-4">
                            <Radio className="h-4 w-4 text-amber-600" strokeWidth={2.5} />
                            <h1 className="min-w-0 truncate text-base font-extrabold text-slate-900 lg:text-lg">
                                Sala en vivo — {dinamica.titulo}
                            </h1>
                        </div>

                        {!sePuedeVerSala ? (
                            // La sala no es pública hasta que el organizador
                            // la programa — el link se puede compartir de
                            // antemano, pero nadie más ve su contenido
                            // (ni el chat) todavía.
                            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                                <Radio className="h-10 w-10 text-slate-300" strokeWidth={2} />
                                <h2 className="text-base font-bold text-slate-700">La sala todavía no está disponible</h2>
                                <p className="max-w-sm text-sm font-medium text-slate-500">
                                    El organizador tiene que programarla antes de que sea visible — vuelve más tarde o espera su aviso.
                                </p>
                            </div>
                        ) : (
                        <>
                        {sala.error && (
                            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{sala.error}</div>
                        )}
                        {(sala.expulsadoAhora || sala.miModeracion.expulsado) && (
                            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                Fuiste expulsado de esta sala por el organizador.
                            </div>
                        )}

                        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-6">
                            {/* ─── Columna izquierda (60%) — escenario del evento ─── */}
                            <div className="space-y-3">
                                {esOrganizador && dinamica.numeroIntentosSorteo === null && (estado === 'activa' || estado === 'pospuesta') && (
                                    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                                        <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-800">
                                            <Dices className="h-3.5 w-3.5" strokeWidth={2.5} />
                                            Configura el sorteo antes de programar la sala
                                        </label>
                                        <p className="mb-2 text-xs font-medium text-amber-700">
                                            Esta rifa se creó antes de que existiera la sala en vivo — falta decir cuántos lugares hay y a qué intento sale el ganador.
                                        </p>
                                        <div className="flex flex-wrap items-end gap-2">
                                            <div className="w-36 shrink-0">
                                                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Lugares premiados</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={kSorteo}
                                                    onChange={(e) => setKSorteo(e.target.value.replace(/[^\d]/g, ''))}
                                                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-500"
                                                />
                                            </div>
                                            <div className="w-40 shrink-0">
                                                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Sale en el intento #</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    placeholder={dinamica.numeroTotalBoletos ? `máx. ${dinamica.numeroTotalBoletos}` : undefined}
                                                    value={nSorteo}
                                                    onChange={(e) => setNSorteo(e.target.value.replace(/[^\d]/g, ''))}
                                                    className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-slate-500"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={guardarConfigSorteo}
                                                disabled={!nSorteo || editarBorrador.isPending}
                                                className="flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 lg:cursor-pointer lg:hover:bg-amber-700"
                                            >
                                                Guardar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {esOrganizador && dinamica.numeroIntentosSorteo !== null && !salaProgramadaPara && (estado === 'activa' || estado === 'pospuesta') && (
                                    <div className="rounded-xl border-2 border-slate-300 bg-white p-4">
                                        <label className="mb-1.5 block text-xs font-bold text-slate-600">Programar sala</label>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="w-36 shrink-0 lg:w-56">
                                                <DatePicker
                                                    value={fechaProgramar}
                                                    onChange={setFechaProgramar}
                                                    placeholder="Fecha"
                                                    minDate={hoyISO()}
                                                    className={ESTILO_TRIGGER_SLATE}
                                                />
                                            </div>
                                            <div className="w-36 shrink-0 lg:w-48">
                                                <CustomSelect
                                                    testId="sala-hora-programar-publico"
                                                    value={horaProgramar}
                                                    onChange={setHoraProgramar}
                                                    options={opcionesHoraDisponibles(fechaProgramar).map((h) => ({ value: h.valor, label: h.etiqueta }))}
                                                    claseControl="px-3 py-2"
                                                    portal
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={programarSala}
                                                disabled={!fechaProgramar || activarSala.isPending}
                                                className="flex items-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 lg:cursor-pointer lg:hover:bg-amber-700"
                                            >
                                                <CalendarClock className="h-4 w-4" strokeWidth={2.5} />
                                                Programar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {salaProgramadaPara && (estado === 'activa' || estado === 'pospuesta') && (
                                    <CronometroSala
                                        objetivo={salaProgramadaPara}
                                        onLlegoLaHora={() => setHoraLlego(true)}
                                        tituloRifa={dinamica.titulo}
                                        portadaUrl={portadaSalaUrl}
                                        boletosPagados={dinamica.boletosPagados}
                                        numeroTotalBoletos={dinamica.numeroTotalBoletos}
                                        conectados={sala.conectados.size}
                                    >
                                        {esOrganizador && (yaLlegoLaHora || horaLlego) && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => sala.iniciarSorteo('automatico')}
                                                    className="flex items-center gap-1.5 rounded-full bg-amber-600 px-5 py-2.5 text-sm font-bold text-white lg:cursor-pointer lg:hover:bg-amber-700"
                                                >
                                                    <Zap className="h-4 w-4" strokeWidth={2.5} />
                                                    Automático
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => sala.iniciarSorteo('manual')}
                                                    className="flex items-center gap-1.5 rounded-full border-2 border-amber-400 bg-white px-5 py-2.5 text-sm font-bold text-amber-700 lg:cursor-pointer lg:hover:bg-amber-50"
                                                >
                                                    <Hand className="h-4 w-4" strokeWidth={2.5} />
                                                    Manual
                                                </button>
                                            </div>
                                        )}
                                    </CronometroSala>
                                )}

                                {(estado === 'en_sorteo' || intentosParaTombola.length > 0) && (
                                    <TombolaSorteo
                                        intentosRevelados={intentosParaTombola}
                                        numeroIntentosSorteo={sala.numeroIntentosSorteo}
                                        numeroLugaresGanadores={sala.numeroLugaresGanadores}
                                        salaCerrada={estado === 'cerrada'}
                                    />
                                )}

                                {/* Modo manual — el organizador revela cada bola con este
                                    botón en vez de la cascada automática temporizada. */}
                                {esOrganizador && estado === 'en_sorteo' && sala.modoSorteo === 'manual' && (
                                    <button
                                        type="button"
                                        onClick={() => sala.revelarSiguienteBola()}
                                        className="mx-auto flex items-center gap-2 rounded-full bg-amber-600 px-6 py-2.5 text-sm font-bold text-white lg:cursor-pointer lg:hover:bg-amber-700"
                                    >
                                        <SkipForward className="h-4 w-4" strokeWidth={2.5} />
                                        Siguiente bola
                                    </button>
                                )}

                                {/* Modo automático — el organizador puede pausar/reanudar la
                                    cascada temporizada a mitad del sorteo. */}
                                {esOrganizador && estado === 'en_sorteo' && sala.modoSorteo === 'automatico' && (
                                    <button
                                        type="button"
                                        onClick={() => (sala.pausadoSorteo ? sala.reanudarSorteo() : sala.pausarSorteo())}
                                        className="mx-auto flex items-center gap-2 rounded-full border-2 border-amber-400 bg-white px-6 py-2.5 text-sm font-bold text-amber-700 lg:cursor-pointer lg:hover:bg-amber-50"
                                    >
                                        {sala.pausadoSorteo ? (
                                            <>
                                                <Play className="h-4 w-4" strokeWidth={2.5} />
                                                Reanudar
                                            </>
                                        ) : (
                                            <>
                                                <Pause className="h-4 w-4" strokeWidth={2.5} />
                                                Pausar
                                            </>
                                        )}
                                    </button>
                                )}

                                {estado === 'cerrada' && estadoHttp?.ganadores && (
                                    <GanadoresSala ganadores={estadoHttp.ganadores.lista} />
                                )}
                            </div>

                            {/* ─── Columna derecha (40%) — moderación + chat ─── */}
                            <div className="flex min-h-0 flex-col gap-3 lg:h-[calc(100vh-220px)]">
                                {esOrganizador && (
                                    <PanelModeracionSala
                                        participantes={participantesConCuenta}
                                        silenciados={silenciados}
                                        expulsados={expulsados}
                                        conectados={sala.conectados}
                                        miUsuarioId={usuarioActual?.id}
                                        onModerar={moderar}
                                    />
                                )}
                                <ChatSala
                                    mensajes={sala.mensajes}
                                    miUsuarioId={usuarioActual?.id}
                                    puedeEscribir={puedeEscribir}
                                    motivoBloqueo={motivoBloqueo}
                                    onEnviar={(contenido) => sala.enviarMensaje(contenido)}
                                />
                            </div>
                        </div>
                        </>
                        )}
                    </div>
                </div>

                <FooterPublico />
            </main>
        </div>
    );
}

export default PaginaSalaDinamicaPublica;
